import { useEffect, useState } from "react";

type Health = { ok: true; app: string; time: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Health) => setHealth(data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold tracking-tight">Praat Aan</h1>
      <p className="text-slate-300 text-center max-w-sm">
        Hallo! Kom ons praat Afrikaans.
      </p>
      <p className="text-sm text-slate-400 font-mono" data-testid="api-status">
        {error
          ? `API error: ${error}`
          : health
            ? `API ok · ${health.time}`
            : "Checking API…"}
      </p>
    </main>
  );
}
