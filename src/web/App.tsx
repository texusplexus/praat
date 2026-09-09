import { useState } from "react";
import { Picker } from "./components/Picker.tsx";
import { Session } from "./components/Session.tsx";
import type { ScenarioSummary } from "./lib/api.ts";

export function App() {
  const [scenario, setScenario] = useState<ScenarioSummary | null>(null);

  return (
    <main className="h-dvh bg-slate-900 text-slate-100 flex flex-col items-center gap-4 p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {scenario ? (
        // Keyed so every hook remounts with a clean slate per scenario.
        <Session key={scenario.id} scenarioId={scenario.id} onLeave={() => setScenario(null)} />
      ) : (
        <>
          <header className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Praat Aan</h1>
            <p className="text-slate-400 text-sm mt-1">Kies 'n situasie en begin gesels.</p>
          </header>
          <Picker onPick={setScenario} />
        </>
      )}
    </main>
  );
}
