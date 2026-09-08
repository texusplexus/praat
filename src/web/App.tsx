import { useCallback } from "react";
import { MicButton } from "./components/MicButton.tsx";
import { Transcript } from "./components/Transcript.tsx";
import { useMic } from "./hooks/useMic.ts";
import { useSonioxStt } from "./hooks/useSonioxStt.ts";

export function App() {
  const stt = useSonioxStt();
  const mic = useMic(stt.send);

  const active = mic.state === "recording";
  const busy = mic.state === "starting" || stt.state === "connecting";

  const toggle = useCallback(async () => {
    if (active) {
      await mic.stop();
      stt.close();
      return;
    }
    try {
      await stt.connect();
      await mic.start();
    } catch {
      stt.close();
    }
  }, [active, mic, stt]);

  const error = mic.error ?? stt.error;

  return (
    <main className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col items-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Praat Aan</h1>
        <p className="text-slate-400 text-sm mt-1">Druk die knoppie en praat Afrikaans.</p>
      </header>

      <Transcript transcript={stt.transcript} />

      {error && (
        <p role="alert" className="text-rose-300 text-sm text-center max-w-md">
          {error}
        </p>
      )}

      <MicButton active={active} busy={busy} onClick={() => void toggle()} />
    </main>
  );
}
