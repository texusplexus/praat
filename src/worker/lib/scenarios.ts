import { parseScenario, type Scenario } from "./tutor-prompt.ts";

// Vite inlines each markdown file at build time, so the Worker ships with
// its scenarios and needs no filesystem or storage binding.
const files = import.meta.glob("../../../scenarios/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const byId = new Map<string, Scenario>();
for (const raw of Object.values(files)) {
  const scenario = parseScenario(raw);
  byId.set(scenario.id, scenario);
}

export function getScenario(id: string): Scenario | undefined {
  return byId.get(id);
}

export function listScenarios(): Scenario[] {
  return [...byId.values()];
}
