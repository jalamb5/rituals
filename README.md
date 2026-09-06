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
| Weekend | Weekly review | cue to run Bingo |

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

## Run it

```bash
python3 -m http.server 8000        # dev (any static server works)
npm test                            # Playwright suite (needs cached chromium; set RITUALS_CHROME)
```

## Device setup (per device)

1. Open the app, complete onboarding (vault name, folder, REST base `https://127.0.0.1:27124`, token).
2. Obsidian: enable the Local REST API plugin, copy its API key into Rituals settings.
3. Install as a PWA (Add to Home Screen / install).

## Repo layout

- `index.html` — single-file app (vanilla, no build)
- `manifest.webmanifest`, `sw.js`, `icon.svg`, `CNAME` — PWA shell
- `test/run.mjs` — Playwright-core suite (pure-function + DOM)
