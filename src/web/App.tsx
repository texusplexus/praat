import { useCallback, useEffect, useRef } from "react";
import { Conversation } from "./components/Conversation.tsx";
import { MicButton } from "./components/MicButton.tsx";
import { TextInput } from "./components/TextInput.tsx";
import { useMic } from "./hooks/useMic.ts";
import { useSonioxStt } from "./hooks/useSonioxStt.ts";
import { useTutor } from "./hooks/useTutor.ts";
import { liveText } from "./lib/transcript.ts";

// Step 3 uses one fixed scenario; the picker arrives in step 5.
const SCENARIO_ID = "social-koffie";

export function App() {
  const tutor = useTutor(SCENARIO_ID);
  const stt = useSonioxStt();
  const mic = useMic(stt.send);

  // Each finished utterance (Soniox <end>) becomes one learner turn.
  const sentCount = useRef(0);
  useEffect(() => {
    const segments = stt.transcript.segments;
    while (sentCount.current < segments.length) {
      const segment = segments[sentCount.current++];
      if (segment) tutor.send(segment);
    }
  }, [stt.transcript.segments, tutor]);

  const active = mic.state === "recording";
  const busy = mic.state === "starting" || stt.state === "connecting";

  const toggle = useCallback(async () => {
    if (active) {
      await mic.stop();
      stt.close();
      return;
    }
    sentCount.current = 0;
    try {
      await stt.connect();
      await mic.start();
    } catch {
      stt.close();
    }
  }, [active, mic, stt]);

  const error = mic.error ?? stt.error ?? tutor.error;

  return (
    <main className="h-dvh bg-slate-900 text-slate-100 flex flex-col items-center gap-4 p-4 sm:p-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Praat Aan</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {tutor.scenario ? `${tutor.scenario.title} · ${tutor.scenario.role}` : "Laai scenario…"}
        </p>
      </header>

      <Conversation turns={tutor.turns} live={liveText(stt.transcript)} />

      {error && (
        <p role="alert" className="text-rose-300 text-sm text-center max-w-md">
          {error}
        </p>
      )}

      <TextInput onSend={tutor.send} disabled={tutor.state === "loading"} />
      <MicButton active={active} busy={busy} onClick={() => void toggle()} />
    </main>
  );
}
