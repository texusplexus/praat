import { useCallback, useEffect, useRef, useState } from "react";
import { PCM_SAMPLE_RATE } from "../lib/pcm-worklet.ts";
import { applyTokens, emptyTranscript, type SonioxToken, type TranscriptState } from "../lib/transcript.ts";

const SONIOX_WS = "wss://stt-rt.soniox.com/transcribe-websocket";
const MODEL = "stt-rt-v5";

export type SttState = "idle" | "connecting" | "listening" | "error";

type SonioxResponse = {
  tokens?: SonioxToken[];
  finished?: boolean;
  error_code?: number;
  error_message?: string;
};

async function fetchTemporaryKey(): Promise<string> {
  const res = await fetch("/api/stt/token", { method: "POST" });
  const body = (await res.json()) as { apiKey?: string; error?: string };
  if (!res.ok || !body.apiKey) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.apiKey;
}

/**
 * Owns the browser-to-Soniox WebSocket. Audio chunks are pushed in via
 * `send`; recognised text comes out as a TranscriptState.
 */
export function useSonioxStt() {
  const [state, setState] = useState<SttState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptState>(emptyTranscript);
  const socket = useRef<WebSocket | null>(null);

  const close = useCallback(() => {
    const ws = socket.current;
    socket.current = null;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      // Empty frame tells Soniox to flush remaining tokens and finish.
      ws.send("");
    } else {
      ws.close();
    }
  }, []);

  const connect = useCallback(async () => {
    if (socket.current) return;
    setError(null);
    setState("connecting");
    setTranscript(emptyTranscript);

    let apiKey: string;
    try {
      apiKey = await fetchTemporaryKey();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
      throw err;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(SONIOX_WS);
      socket.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            api_key: apiKey,
            model: MODEL,
            audio_format: "pcm_s16le",
            sample_rate: PCM_SAMPLE_RATE,
            num_channels: 1,
            language_hints: ["af", "en"],
            enable_language_identification: true,
            enable_endpoint_detection: true,
          }),
        );
        setState("listening");
        resolve();
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        const msg = JSON.parse(event.data) as SonioxResponse;
        if (msg.error_code !== undefined) {
          setError(`Soniox ${msg.error_code}: ${msg.error_message ?? "unknown error"}`);
          setState("error");
          ws.close();
          return;
        }
        if (msg.tokens?.length) {
          setTranscript((prev) => applyTokens(prev, msg.tokens ?? []));
        }
        if (msg.finished) ws.close();
      };

      ws.onerror = () => {
        setError("Could not reach the speech service");
        setState("error");
        reject(new Error("WebSocket error"));
      };

      ws.onclose = () => {
        if (socket.current === ws) socket.current = null;
        setState((s) => (s === "error" ? s : "idle"));
      };
    });
  }, []);

  const send = useCallback((chunk: ArrayBuffer) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(chunk);
  }, []);

  useEffect(() => close, [close]);

  return { state, error, transcript, connect, close, send };
}
