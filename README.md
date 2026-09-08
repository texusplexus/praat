# Praat Aan

Voice-first web app that helps English-speaking South Africans gain the confidence to speak
conversational Afrikaans. See `CLAUDE.md` for scope, stack, and build order.

## Develop

```bash
pnpm install
pnpm dev          # Worker + React with hot reload at http://localhost:5173
pnpm typecheck    # regenerates Worker types, then tsc
```

Local secrets live in `.dev.vars` (gitignored).

## Deploy

Pushes to `main` deploy to production through Cloudflare Workers Builds.
Manual fallback: `pnpm run deploy`.
