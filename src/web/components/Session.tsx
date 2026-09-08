import { useCallback, useEffect, useRef } from "react";
import { useMic } from "../hooks/useMic.ts";
import { useSession } from "../hooks/useSession.ts";
import { useSonioxStt } from "../hooks/useSonioxStt.ts";
import { useTts } from "../hooks/useTts.ts";
import { useTutor } from "../hooks/useTutor.ts";
import { liveText } from "../lib/transcript.ts";
import { Conversation } from "./Conversation.tsx";
import { MicButton } from "./MicButton.tsx";
import { TextInput } from "./TextInput.tsx";

export function Session({ scenarioId, onLeave }: { scenarioId: string; onLeave: () => void }) {
  const session = useSession(scenarioId);
  const tts = useTts();
  const tutor = useTutor(scenarioId, tts, session.logTurn);
  const stt = useSonioxStt();

  // Half-duplex turn-taking: while the tutor speaks, feed Soniox silence so
  // the speaker output is never transcribed as the learner.
  const speakingRef = useRef(false);
  speakingRef.current = tts.speaking;
  const onMicChunk = useCallback(
    (chunk: ArrayBuffer) => {
      stt.send(speakingRef.current ? new ArrayBuffer(chunk.byteLength) : chunk);
    },
    [stt],
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
      await mic.stop();
      stt.close();
      tts.stop();
      return;
    }
    sentCount.current = 0;
    await tts.unlock();
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
      void tts.unlock();
      openingSpoken.current = true; // learner has moved past the greeting
      tutor.send(text, "text");
    },
    [tts, tutor],
  );

  const leave = useCallback(async () => {
    if (active) {
      await mic.stop();
      stt.close();
    }
    tts.stop();
    onLeave();
  }, [active, mic, stt, tts, onLeave]);

  const error = mic.error ?? stt.error ?? tutor.error ?? tts.error;

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

      {error && (
        <p role="alert" className="text-rose-300 text-sm text-center max-w-md">
          {error}
        </p>
      )}

      <TextInput onSend={sendTyped} disabled={tutor.state === "loading"} />
      <MicButton active={active} busy={busy} onClick={() => void toggle()} />
    </>
  );
}
