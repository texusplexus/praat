export type ScenarioSummary = {
  id: string;
  mode: "social" | "business";
  title: string;
  role: string;
  opening: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function fetchScenario(id: string): Promise<ScenarioSummary> {
  const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Scenario ${id}: HTTP ${res.status}`);
  return (await res.json()) as ScenarioSummary;
}

/**
 * POST the conversation so far and stream the tutor's reply back as text.
 * `onDelta` is called for every chunk as it arrives.
 */
export async function streamReply(
  scenarioId: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/tutor/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) onDelta(value);
  }
}
