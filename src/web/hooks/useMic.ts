import { useCallback, useRef, useState } from "react";
import { PCM_WORKLET_NAME, pcmWorkletUrl } from "../lib/pcm-worklet.ts";

export type MicState = "idle" | "starting" | "recording" | "error";

function describeMicError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "Mikrofoon-toegang is geweier. Laat dit toe in jou blaaier en probeer weer.";
    }
    if (err.name === "NotFoundError") return "Geen mikrofoon gevind nie.";
  }
  return err instanceof Error ? err.message : String(err);
}

type MicHandles = {
  stream: MediaStream;
  context: AudioContext;
  node: AudioWorkletNode;
};

/**
 * Captures the microphone and delivers 16 kHz mono 16-bit PCM chunks.
 * The consumer decides what to do with each chunk (here: send to Soniox).
 */
export function useMic(onChunk: (chunk: ArrayBuffer) => void) {
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const handles = useRef<MicHandles | null>(null);
  const prepared = useRef<AudioContext | null>(null);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  /**
   * Create the AudioContext synchronously inside a user gesture. iOS Safari
   * only lets a context start when it is created or resumed during a tap,
   * and `start()` runs after network awaits that may outlive that window.
   */
  const prepare = useCallback(() => {
    if (handles.current || prepared.current) return;
    try {
      const context = new AudioContext();
      void context.resume();
      prepared.current = context;
    } catch (err) {
      console.warn("mic context could not be created early", err);
    }
  }, []);

  const stop = useCallback(async () => {
    const h = handles.current;
    handles.current = null;
    if (!h) return;
    h.node.port.onmessage = null;
    h.node.disconnect();
    h.stream.getTracks().forEach((t) => t.stop());
    await h.context.close().catch(() => undefined);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (handles.current) return;
    setError(null);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const context = prepared.current ?? new AudioContext();
      prepared.current = null;
      // iOS Safari creates contexts suspended until a user gesture resumes them.
      if (context.state === "suspended") await context.resume();
      await context.audioWorklet.addModule(pcmWorkletUrl());
      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, PCM_WORKLET_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => onChunkRef.current(e.data);
      source.connect(node);
      handles.current = { stream, context, node };
      setState("recording");
    } catch (err) {
      setError(describeMicError(err));
      await stop();
      setState("error");
    }
  }, [stop]);

  return { state, error, prepare, start, stop };
}
