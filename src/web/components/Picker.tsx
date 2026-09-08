import { useEffect, useState } from "react";
import { fetchScenarios, type ScenarioSummary } from "../lib/api.ts";

const MODES: { id: ScenarioSummary["mode"]; label: string; blurb: string }[] = [
  { id: "social", label: "Sosiaal", blurb: "Braai, buurvrou, mark, koffie" },
  { id: "business", label: "Besigheid", blurb: "Vergaderings, kliënte, oproepe" },
];

export function Picker({ onPick }: { onPick: (scenario: ScenarioSummary) => void }) {
  const [mode, setMode] = useState<ScenarioSummary["mode"]>("social");
  const [scenarios, setScenarios] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScenarios()
      .then((list) => !cancelled && setScenarios(list))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = scenarios?.filter((s) => s.mode === mode) ?? [];

  return (
    <div className="w-full max-w-xl flex flex-col gap-5">
      <div role="tablist" aria-label="Modus" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            type="button"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={[
              "rounded-xl px-3 py-2.5 text-left transition-colors",
              mode === m.id ? "bg-emerald-500 text-slate-900" : "text-slate-300 hover:bg-slate-700",
            ].join(" ")}
          >
            <span className="block font-semibold">{m.label}</span>
            <span className="block text-xs opacity-80">{m.blurb}</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-rose-300 text-sm">
          {error}
        </p>
      )}
      {!scenarios && !error && <p className="text-slate-500 text-sm">Laai scenario's…</p>}

      <ul className="flex flex-col gap-2">
        {visible.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-left hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <span className="block font-medium text-slate-100">{s.title}</span>
              <span className="block text-sm text-slate-400">{s.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
