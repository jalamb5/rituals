# Rituals

Rise, close the loop, shut down. A single static PWA that conducts the daily
rituals around two tools that own the real state:

- **Super Productivity** owns tasks and end-of-day task closure.
- **Obsidian** owns the journal record — each ritual appends a structured block
  into the existing `Daily Notes/YYYY-MM-DD.md` (the file Bingo already reads).

Rituals owns only the *moments* and the *cadence*. No backend, no accounts,
no notifications — open it and it knows where you are in the day.

## Day map

| When | View | Job |
|---|---|---|
| Morning | Rise | brain-dump → one-thing → looking forward → opening phrase; surfaces yesterday's carryover |
| End of work | Close the loop | gate into Super Productivity's end-of-day review |
| Bedtime | Shutdown | pure mental close — open loops (never tasks), what went right, carryover for tomorrow |
| Weekend | Weekly review | read the week's notes, write the review note (local-first) |

## How it writes (no competing notes)

Daily notes are created by Obsidian (Periodic Notes applies `Templates/DailyNoteTemplate.md`
with Templater). Rituals **never fabricates a daily note**: if the file is missing it
triggers Obsidian's own daily-note command over the Local REST API, then appends.

- **Tier 1 (primary):** Obsidian **Local REST API** plugin — read, create-via-command,
  append. Requires the plugin + API key on each device.
- **Tier 0 (fallback):** copy/download the block when REST is unavailable.

Appended block (idempotent — same-day rerun replaces the section):

```markdown
## Rise

InHead:: …
OneThing:: …
LookingForward:: …
Mood:: 4
Phrase:: "Open the day."
```

## Run it (local-first)

Open it **from a local file** — not the hosted URL — when you want it to touch your
vault. Browsers block a page served from the public internet from reaching
`127.0.0.1` (Chrome's Private Network Access rule), so the hosted copy can only hand
a note to Obsidian via a deep link. The local copy reads and writes directly.

```bash
./scripts/open-rituals.command      # double-clickable: starts the AI endpoint, opens the app
```

Or just open `index.html` in Chrome yourself. Dev: any static server works
(`python3 -m http.server 8000`).

```bash
npm test                            # Playwright suite (needs cached chromium; set RITUALS_CHROME)
node test/e2e-review.mjs 2026-W36   # live review vs the real vault (scratch folder, cleaned up)
```

## Weekly review

A view in the same single file, absorbed from Bingo. It:

1. reads the week's daily notes over the Local REST API — `Daily Notes/`, then `Daily Notes/Archive/`;
2. builds a factual digest locally (`Summary::`, `## Work`, `## Notes`) — **no AI, no key**;
3. optionally suggests a Title/Summary pair — a low-stakes label only;
4. fills `Templates/WeeklyTemplate.md` and saves to `Reviews/Weekly/<YYYY-Www>.md`.

The reflection ("What do I want to remember" / "Next week") is always yours: the tool
is an assistant, not an author. The AI step is optional and points at a local
OpenAI-compatible endpoint — `hermes proxy`, which rides your Nous Portal credential,
so no API key is stored. Set the endpoint and model in Settings.

## Device setup (per device)

1. Open the app, complete onboarding (vault name, folder, REST base `https://127.0.0.1:27124`, token).
2. Obsidian: enable the Local REST API plugin, copy its API key into Rituals settings.
3. Install as a PWA (Add to Home Screen / install).

## Repo layout

- `index.html` — single-file app (vanilla, no build)
- `manifest.webmanifest`, `sw.js`, `icon.svg`, `CNAME` — PWA shell
- `scripts/open-rituals.command` — local-first launcher (starts the AI endpoint, opens the app)
- `test/run.mjs` — Playwright-core suite (pure-function + DOM)
- `test/e2e-review.mjs` — live review run against the real vault
- `DESIGN.md` — the evidence and decision record (read this before changing behaviour)
