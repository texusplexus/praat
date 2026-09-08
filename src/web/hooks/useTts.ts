import { useCallback, useEffect, useRef, useState } from "react";
import { PcmPlayer } from "../lib/pcm-player.ts";

const SONIOX_TTS_WS = "wss://tts-rt.soniox.com/tts-websocket";
const TTS_MODEL = "tts-rt-v2";
const TTS_SAMPLE_RATE = 24000;
export const DEFAULT_VOICE = "Emma";

type TtsMessage = {
  audio?: string;
  audio_end?: boolean;
  terminated?: boolean;
  error_code?: number;
  error_message?: string;
};

async function fetchTtsKey(): Promise<string> {
  const res = await fetch("/api/tts/token", { method: "POST" });
  const body = (await res.json()) as { apiKey?: string; error?: string };
  if (!res.ok || !body.apiKey) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.apiKey;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** One utterance: a Soniox TTS stream plus the player draining it. */
export type Utterance = {
  push: (text: string) => void;
  end: () => void;
};

/**
 * Speaks streamed text through Soniox real-time TTS. Text can be pushed as
 * it arrives from the tutor; audio starts before the reply is complete.
 */
export function useTts(voice = DEFAULT_VOICE) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const currentRef = useRef<{ ws: WebSocket; player: PcmPlayer } | null>(null);
  // Wall-clock deadline until which the learner's mic should be muted. Using
  // real time (not AudioContext time) means a suspended or stalled context
  // can never leave the mic muted indefinitely.
  const muteUntilRef = useRef(0);
  const shouldMuteMic = useCallback(() => performance.now() < muteUntilRef.current, []);

  /** Must be called from a user gesture at least once (iOS Safari). */
  const unlock = useCallback(async () => {
    if (!contextRef.current) contextRef.current = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    if (contextRef.current.state === "suspended") await contextRef.current.resume();
  }, []);

  const stop = useCallback(() => {
    muteUntilRef.current = 0;
    const cur = currentRef.current;
    currentRef.current = null;
    if (!cur) return;
    cur.player.stop();
    if (cur.ws.readyState === WebSocket.OPEN || cur.ws.readyState === WebSocket.CONNECTING) cur.ws.close();
    setSpeaking(false);
  }, []);

  /**
   * Start a new utterance. Returns immediately; text pushed before the socket
   * is ready is buffered and flushed on open.
   */
  const begin = useCallback((): Utterance => {
    stop();
    setError(null);
    setSpeaking(true);

    const context = contextRef.current ?? new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    contextRef.current = context;
    if (context.state === "suspended") void context.resume();

    const streamId = `u-${Date.now()}`;
    let queue: string[] = [];
    let ended = false;
    let ready = false;
    let ws: WebSocket | null = null;

    // Waiting for the first audio chunk: mute for a bounded time only.
    muteUntilRef.current = performance.now() + 6_000;

    const finish = () => {
      if (currentRef.current?.player === player) {
        currentRef.current = null;
        muteUntilRef.current = 0;
        setSpeaking(false);
      }
    };
    const player = new PcmPlayer(context, TTS_SAMPLE_RATE, () => {
      clearTimeout(watchdog);
      finish();
    });
    // Utterances are a few sentences; if playback has not finished well
    // within the 2 minute Soniox cap, something is stuck: release the turn.
    const watchdog = setTimeout(() => {
      player.stop();
      finish();
    }, 90_000);

    const flush = () => {
      if (!ready || !ws || ws.readyState !== WebSocket.OPEN) return;
      for (const text of queue) ws.send(JSON.stringify({ stream_id: streamId, text, text_end: false }));
      queue = [];
      if (ended) {
        ws.send(JSON.stringify({ stream_id: streamId, text: "", text_end: true }));
        ended = false; // sent once
      }
    };

    void fetchTtsKey()
      .then((apiKey) => {
        if (currentRef.current?.player !== player) return; // superseded
        const socket = new WebSocket(SONIOX_TTS_WS);
        ws = socket;
        currentRef.current = { ws: socket, player };

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              api_key: apiKey,
              stream_id: streamId,
              model: TTS_MODEL,
              language: "af",
              voice,
              audio_format: "pcm_s16le",
              sample_rate: TTS_SAMPLE_RATE,
            }),
          );
          ready = true;
          flush();
        };
        socket.onmessage = (event: MessageEvent<string>) => {
          const msg = JSON.parse(event.data) as TtsMessage;
          if (msg.error_code !== undefined) {
            setError(`Stem: ${msg.error_message ?? msg.error_code}`);
            player.stop();
            finish();
            socket.close();
            return;
          }
          if (msg.audio) {
            player.enqueue(base64ToBytes(msg.audio));
            muteUntilRef.current = performance.now() + player.scheduledSeconds * 1000 + 400;
          }
          if (msg.audio_end || msg.terminated) {
            player.end();
            socket.close();
          }
        };
        socket.onerror = () => {
          setError("Kon nie die stem laai nie");
          player.stop();
          finish();
        };
        socket.onclose = () => {
          // Server closed without audio_end (expired key, network drop):
          // let whatever is queued play out, then release the turn.
          player.end();
        };
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        finish();
      });

    // Placeholder so `stop()` and `finish()` can identify this utterance
    // before the socket exists.
    currentRef.current = { ws: { readyState: WebSocket.CLOSED, close() {} } as WebSocket, player };

    return {
      push: (text) => {
        if (text) queue.push(text);
        flush();
      },
      end: () => {
        ended = true;
        flush();
      },
    };
  }, [stop, voice]);

  const speakText = useCallback(
    (text: string) => {
      const u = begin();
      u.push(text);
      u.end();
    },
    [begin],
  );

  useEffect(() => stop, [stop]);

  return { speaking, error, unlock, begin, speakText, stop, shouldMuteMic };
}
