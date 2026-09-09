import { useCallback, useEffect, useRef, useState } from "react";
import { useMic } from "../hooks/useMic.ts";
import { useSession } from "../hooks/useSession.ts";
import { useSonioxStt } from "../hooks/useSonioxStt.ts";
import { useTts } from "../hooks/useTts.ts";
import { useTutor } from "../hooks/useTutor.ts";
import { liveText } from "../lib/transcript.ts";
import { Conversation } from "./Conversation.tsx";
import { MicButton } from "./MicButton.tsx";
import { TextInput } from "./TextInput.tsx";

const STUCK_TEXT = "Ek sit vas.";

export function Session({ scenarioId, onLeave }: { scenarioId: string; onLeave: () => void }) {
  const session = useSession(scenarioId);
  const tts = useTts();
  const tutor = useTutor(scenarioId, tts, session.logTurn);
  const stt = useSonioxStt();
  const [notice, setNotice] = useState<string | null>(null);

  // Half-duplex turn-taking: while the tutor speaks, feed Soniox silence so
  // the speaker output is never transcribed as the learner. The mute window
  // is wall-clock bounded, so a playback problem cannot silence the mic.
  const onMicChunk = useCallback(
    (chunk: ArrayBuffer) => {
      stt.send(tts.shouldMuteMic() ? new ArrayBuffer(chunk.byteLength) : chunk);
    },
    [stt, tts],
  );
  const mic = useMic(onMicChunk);

  // Each finished utterance (Soniox <end>) becomes one learner turn.
  const sentCount = useRef(0);
  useEffect(() => {
    const segments = stt.transcript.segments;
    while (sentCount.current < segments.length) {
      const segment = segments[sentCount.current++];
      if (segment) tutor.send(segment, "voice");
    }
  }, [stt.transcript.segments, tutor]);

  const active = mic.state === "recording";
  const busy = mic.state === "starting" || stt.state === "connecting";

  // If the listening socket drops while the mic is open (network blip,
  // Soniox session limit), stop the mic and say so instead of listening
  // to nothing.
  const stoppingRef = useRef(false);
  useEffect(() => {
    if (!active || stoppingRef.current) return;
    if (stt.state === "idle" || stt.state === "error") {
      void mic.stop();
      if (stt.state === "idle") setNotice("Die luister-verbinding is verbreek. Druk Praat om voort te gaan.");
    }
  }, [active, stt.state, mic]);

  // The opening line is spoken on the first tap, since browsers only allow
  // audio to start from a user gesture.
  const openingSpoken = useRef(false);
  const speakOpening = useCallback(() => {
    if (openingSpoken.current || !tutor.scenario) return;
    openingSpoken.current = true;
    tts.speakText(tutor.scenario.opening);
  }, [tts, tutor.scenario]);

  const toggle = useCallback(async () => {
    if (active) {
      stoppingRef.current = true;
      await mic.stop();
      stt.close();
      tts.stop();
      stoppingRef.current = false;
      return;
    }
    setNotice(null);
    sentCount.current = 0;
    // Everything that needs a user gesture happens synchronously, first.
    mic.prepare();
    // Speech output is best effort; it must never stop the mic from starting.
    tts.unlock().catch((err: unknown) => console.warn("tts unlock failed", err));
    speakOpening();
    try {
      await stt.connect();
      await mic.start();
    } catch {
      stt.close();
    }
  }, [active, mic, stt, tts, speakOpening]);

  const sendTyped = useCallback(
    (text: string) => {
      setNotice(null);
      tts.unlock().catch(() => undefined);
      openingSpoken.current = true; // learner has moved past the greeting
      tutor.send(text, "text");
    },
    [tts, tutor],
  );

  const stuck = useCallback(() => sendTyped(STUCK_TEXT), [sendTyped]);

  const leave = useCallback(async () => {
    stoppingRef.current = true;
    if (active) {
      await mic.stop();
      stt.close();
    }
    tts.stop();
    onLeave();
  }, [active, mic, stt, tts, onLeave]);

  const error = mic.error ?? stt.error ?? tutor.error ?? tts.error;

  const status = tts.speaking
    ? "Die tutor praat… jou mikrofoon wag."
    : tutor.state === "replying"
      ? "Die tutor dink…"
      : active
        ? "Ek luister. Praat gerus."
        : busy
          ? "Maak reg…"
          : "Druk Praat om te gesels, of tik hieronder.";

  return (
    <>
      <header className="w-full max-w-xl flex items-center gap-3">
        <button
          type="button"
          onClick={() => void leave()}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Terug na scenario's"
        >
          ← Terug
        </button>
        <div className="min-w-0 text-center flex-1">
          <h1 className="text-lg font-semibold tracking-tight truncate">
            {tutor.scenario?.title ?? "Laai scenario…"}
          </h1>
          <p className="text-slate-400 text-xs truncate">{tutor.scenario?.role}</p>
        </div>
        <span className="w-14" aria-hidden="true" />
      </header>

      <Conversation turns={tutor.turns} live={liveText(stt.transcript)} />

      {(error || notice) && (
        <p role="alert" className="text-rose-300 text-sm text-center max-w-md">
          {error ?? notice}
        </p>
      )}

      <p className="text-xs text-slate-400" aria-live="polite">
        {status}
      </p>

      <TextInput onSend={sendTyped} disabled={tutor.state === "loading"} />

      <div className="flex items-center gap-4">
        <span className="w-24" aria-hidden="true" />
        <MicButton active={active} busy={busy} onClick={() => void toggle()} />
        <button
          type="button"
          onClick={stuck}
          disabled={tutor.state === "loading" || tutor.state === "replying"}
          className="w-24 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          Ek sit vas
        </button>
      </div>
    </>
  );
}
