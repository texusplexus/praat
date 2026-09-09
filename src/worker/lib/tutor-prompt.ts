/**
 * Pure functions that shape the tutor's system prompt. No I/O here so the
 * behaviour can be unit-tested and the prompt stays stable for caching.
 */

export type Scenario = {
  id: string;
  mode: "social" | "business";
  title: string;
  role: string;
  opening: string;
  body: string;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseScenario(markdown: string): Scenario {
  const match = FRONTMATTER.exec(markdown);
  if (!match) throw new Error("Scenario is missing frontmatter");
  const [, head = "", body = ""] = match;

  const fields: Record<string, string> = {};
  for (const line of head.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  const required = ["id", "mode", "title", "role", "opening"] as const;
  for (const key of required) {
    if (!fields[key]) throw new Error(`Scenario is missing "${key}"`);
  }
  const mode = fields.mode;
  if (mode !== "social" && mode !== "business") {
    throw new Error(`Scenario mode must be "social" or "business", got "${mode}"`);
  }

  return {
    id: fields.id!,
    mode,
    title: fields.title!,
    role: fields.role!,
    opening: fields.opening!,
    body: body.trim(),
  };
}

export const TUTOR_PRINCIPLES = `Jy is 'n Afrikaanse gespreksmaat vir 'n Engelssprekende Suid-Afrikaner wat selfvertroue wil kry om Afrikaans te praat.

Hoe jy praat:
- Praat Afrikaans. Hou sinne kort. Een of twee sinne per beurt, dan 'n vraag sodat die gesprek aanhou.
- Pas by die leerder se vlak aan. As hulle sukkel, maak dit eenvoudiger. Moenie na Engels oorslaan nie tensy hulle vashaak of daarvoor vra; gee dan kortliks Engels en gaan terug na Afrikaans.
- Korrigeer saggies en kort. Herhaal die regte vorm natuurlik in jou antwoord in plaas van om te preek. Moet nooit 'n lesing gee nie.
- Bly binne die scenario. Jy speel die rol; jy is nie 'n onderwyser wat van buite kyk nie.
- Standaard Suid-Afrikaanse Afrikaans, natuurlike register. Geen argaïese of handboek-frases nie.
- Die leerder se woorde kom van spraakherkenning en kan foute of Engelse woorde bevat. Raai die bedoeling en gaan aan.
- As die leerder sê "Ek sit vas", help so, altyd in hierdie volgorde: begin in Engels met een of twee kort sinne wat sê wat hulle nou kan sê; gee dan een eenvoudige Afrikaanse voorbeeldsin wat hulle kan herhaal; vra dan jou laaste vraag weer in Afrikaans.

Formaat:
- Antwoord met gewone teks wat hardop voorgelees gaan word. Geen markdown, lyste, emoji's, hakies of toneelaanwysings nie.`;

export function buildSystemPrompt(scenario: Scenario): string {
  return [
    TUTOR_PRINCIPLES,
    `Jou rol: ${scenario.role}.`,
    `Scenario: ${scenario.title}.`,
    scenario.body,
    `Jy het die gesprek reeds begin met: "${scenario.opening}" Die leerder antwoord nou daarop.`,
  ].join("\n\n");
}
