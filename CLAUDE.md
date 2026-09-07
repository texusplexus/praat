# Praat Aan — CLAUDE.md

## What this is
A voice-first web app that helps English-speaking South Africans gain the confidence to speak
conversational Afrikaans. The learner talks (or types); an AI tutor replies in spoken Afrikaans,
backed by on-screen text. v1 is a small pilot, not a product launch.

## v1 scope (locked — do not expand without George's explicit say-so)
- Web app only. No native apps.
- No accounts, no auth, no payments. Anonymous session ID in localStorage.
- Two modes: Social Afrikaans and Business Afrikaans.
- Ten scenarios (five per mode), each a markdown file in `scenarios/`.
- Voice in (mic), voice out (TTS), with a text transcript of both sides always visible.
- Text input as a fallback at every point.
- Session transcripts saved to Supabase so pilot conversations can be reviewed.
- Pilot users: a handful of English speakers + Afrikaans-speaking reviewers.

Explicitly NOT in v1: learner memory across sessions, progress tracking, spaced repetition,
adaptive difficulty, kids' version, leaderboards, sharing. These are later.

## Stack (decided — do not substitute)
- Runtime/hosting: Cloudflare Workers. One Worker serves the API and the built frontend as
  static assets (`assets` binding in wrangler.jsonc). No Pages, no separate API host.
- API: Hono, TypeScript strict. Routes under `/api/*`.
- Frontend: React + Vite + TypeScript + Tailwind. Server state via TanStack Query.
- Validation: Zod at every API boundary.
- Database: Supabase (Postgres). Talk to it from the Worker only, never from the browser.
- Tutor brain: Anthropic Messages API, streaming. Model: `claude-sonnet-5`.
- Speech: Soniox for both STT (real-time WebSocket, endpoint detection on) and TTS (streaming).
  Browser connects to Soniox STT directly using a short-lived key minted by the Worker.
- Version control: GitHub. `main` deploys to production via Cloudflare Workers Builds.
- Package manager: pnpm. Node 22.

## Repo layout
```
praat-aan/
  CLAUDE.md
  wrangler.jsonc
  package.json
  .dev.vars              # local secrets — gitignored, never committed
  src/worker/            # Hono app, entry index.ts
    routes/              # one file per route group
    services/            # anthropic.ts, soniox.ts, supabase.ts
  src/web/               # React app
    components/
    hooks/               # useMic, useSonioxStt, useTutor, useTts
    lib/
  scenarios/             # 10 scenario prompt files (markdown + frontmatter)
  supabase/migrations/
```

## Secrets
`ANTHROPIC_API_KEY`, `SONIOX_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
Local: `.dev.vars`. Production: `wrangler secret put`. Never hardcode, never log, never ship
a long-lived key to the browser.

## Tutor behaviour (system prompt principles)
- Speak Afrikaans by default. Keep sentences short. Match the learner's level; if they are
  struggling, simplify rather than switch to English.
- Correct gently and briefly, then keep the conversation moving. Never lecture.
- English is allowed when the learner is stuck or asks — then return to Afrikaans.
- Stay inside the scenario. The tutor plays the role (shopkeeper, colleague, host), not a
  teacher standing outside it.
- Standard South African Afrikaans, natural register. No archaic or textbook phrasing.

## Working conventions for Claude Code
- One objective per session. Every session ends with `main` deployed and working.
- Build the thinnest vertical slice first, then widen. Do not build ahead of the current step.
- Before adding a dependency, say why and confirm. Prefer the platform (Workers, fetch,
  WebSocket) over libraries.
- No tests for UI in v1. Do write a test for any pure function that shapes tutor prompts.
- Ask George when a decision is genuinely open. Do not silently pick between options that
  change cost, vendor lock-in, or the learner experience.
- When something in this file conflicts with what George says in chat, chat wins — and
  propose the CLAUDE.md edit.

## Build order
1. Scaffold + hello-world deployed via GitHub push. Nothing else.
2. Mic → Soniox STT → live transcript on screen.
3. Transcript → Claude → streamed reply text, using one scenario.
4. Reply → Soniox TTS → audio playback. Turn-taking works end to end.
5. Session persistence to Supabase. Mode + scenario picker. All ten scenarios.
6. Pilot polish: mobile Safari, error states, "I'm stuck" button.
