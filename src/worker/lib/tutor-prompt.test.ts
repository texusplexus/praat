import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSystemPrompt, parseScenario, TUTOR_PRINCIPLES } from "./tutor-prompt.ts";

const sample = `---
id: test-one
mode: social
title: Toets
role: Kelner
opening: Hallo! Sit gerus.
---
## Situasie

Iets gebeur hier.
`;

test("parseScenario reads frontmatter and body", () => {
  const s = parseScenario(sample);
  assert.equal(s.id, "test-one");
  assert.equal(s.mode, "social");
  assert.equal(s.title, "Toets");
  assert.equal(s.role, "Kelner");
  assert.equal(s.opening, "Hallo! Sit gerus.");
  assert.equal(s.body, "## Situasie\n\nIets gebeur hier.");
});

test("parseScenario rejects a missing field and a bad mode", () => {
  assert.throws(() => parseScenario(sample.replace("role: Kelner\n", "")), /missing "role"/);
  assert.throws(() => parseScenario(sample.replace("mode: social", "mode: kids")), /mode must be/);
  assert.throws(() => parseScenario("no frontmatter"), /missing frontmatter/);
});

test("buildSystemPrompt keeps principles first and includes role, body and opening", () => {
  const prompt = buildSystemPrompt(parseScenario(sample));
  assert.ok(prompt.startsWith(TUTOR_PRINCIPLES));
  assert.match(prompt, /Jou rol: Kelner\./);
  assert.match(prompt, /Iets gebeur hier\./);
  assert.match(prompt, /"Hallo! Sit gerus\."/);
});

test("system prompt tells the tutor how to handle 'Ek sit vas'", () => {
  const prompt = buildSystemPrompt(parseScenario(sample));
  assert.match(prompt, /"Ek sit vas"/);
  assert.match(prompt, /begin in Engels/);
  assert.match(prompt, /voorbeeldsin/);
});

test("buildSystemPrompt is deterministic for the same scenario", () => {
  const s = parseScenario(sample);
  assert.equal(buildSystemPrompt(s), buildSystemPrompt(s));
});
