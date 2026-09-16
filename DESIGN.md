# Rituals — Design Decisions & Evidence Base

> Why Rituals is shaped the way it is. Read this before changing the ritual
> flows or visual design, so we keep the evidence-informed and minimal
> decisions that would otherwise be lost. Research gathered 2026-09-06.

## North star

Rituals should be **easy and fun to use**, help Justin **set himself up for
success each morning** (Rise) and **truly turn off the work brain at night**
(Shutdown). It deliberately owns only the *moments and cadence*; Obsidian owns
tasks (Tasks plugin), task closure, and the journal record. Close-the-loop was
**cut 2026-09-16** — it was a button that opened Obsidian, and Shutdown already
owns the end of the work day (see below). No notifications, no accounts, no backend.

## The two rituals & their evidence

### Rise (morning)
Guided 4-step arc: carry-in → brain-dump ("what's already in your head") →
**one thing** → looking forward → spoken phrase ("Fabricati diem.") → log.

**Strongest-supported mechanism is the "one thing" step.** Implementation
intentions (if-then planning) have the best evidence of anything in the app —
Gollwitzer & Sheeran (2006) meta-analysis, 94 studies, d≈.65. Two boundary
conditions matter:
1. It amplifies follow-through only on a task you're *already committed to* —
   so the one-thing must be the user's own chosen top task, not app-selected.
2. It works best phrased with *when/where* — "when X, I'll do Y" — not a vague
   goal. Rituals nudges this with copy ("*when I sit down at 9, I'll…*") rather
   than forcing a second field, to keep friction low (see friction note below).

**Design choice:** we kept the if-then "when" as a *copy nudge*, not an input
field. A dedicated when-field is a documented future option if copy isn't enough.

### Shutdown (evening)
Pure mental-health close: what's still open (as **thoughts, not tasks**) →
what went right → optional mood 1–5 → spoken phrase ("All's well.") → log.

**Evidence-aligned as designed — do not turn it into task planning.**
- **Psychological detachment** (Sonnentag & Fritz 2007; meta-analyses
  Wendsche & Lohmann-Haislah 2017, Sonnentag et al. 2022): detachment from
  work in off-time reduces exhaustion/fatigue and improves sleep/wellbeing
  (small-to-moderate, high confidence). Shutdown is a deliberate
  detachment-induction: it needs to be a *transition* with a discrete ending
  cue, at a consistent time/place. The spoken closing phrase is that boundary.
- **End-of-day plan writing** (Scullin & McDaniel 2015, JEP:General): writing
  unfinished *plans* before bed reduced sleep-onset latency; journaling
  completed tasks *increased* it. Hence: brief, future-oriented, never a
  completed-task list.
- **The "thoughts, not tasks" rule is intentional and evidence-based** —
  re-engaging goal-striving would work against detachment. Open loops are
  handed to tomorrow's Rise, never held as tasks.

### What went right (gratitude) — deliberately lightweight
Emmons & McCullough (2003) and meta-analyses (Cregg & Cheavens 2021) show
real but small effects (d≈.24–.56), strongest for positive affect. **Strict
*daily* gratitude is not clearly superior to weekly** and can backfire via
hedonic adaptation (Sheldon & Lyubomirsky 2006). So "what went right" is
framed as light and skimmable, not a daily obligation.

### Mood 1–5 — a trend signal, not a daily truth
Single-item daily ratings inherit peak-end/recency bias and one-timepoint
limits (Kahneman's Day Reconstruction; Caldeira et al. 2022). Its defensible
value is *longitudinal pattern insight*, not per-day accuracy. So: keep it
optional, don't over-emphasize the daily number, and only surface patterns
later in a weekly view — never raw daily emphasis.

## UX principles (from how good ritual apps work)

Researched Fabulous, Stoic, Daylio, Reflectly, Headspace, Calm, Apple Wind
Down, Cal Newport's shutdown ritual, Keller's ONE Thing. Convergent DNA:
- **One guided step at a time**, unbranching linear path.
- **3–5 prompts per sitting** max.
- **The next action is the only visible control** during a session — this is
  the rationale behind the button audit that cut footer links, nav shortcuts,
  a fake SP deep-link, a no-op hedge button, and the always-on Weekly-review tab.
- **Time-to-first-key matters**: auto-focus the first writing field.
- **Scheduled, not notified** (matches Justin's no-notifications stance).
- **Gentle, warm tone; streaks optional and non-punishing** (guilt-free to miss).
- **A spoken/serif closing phrase** is the strongest ritual signal and a real
  psychological boundary (Cal Newport; the recovery literature).

## Popular claims we deliberately do NOT build on

- "Brain-dump alone fixes rumination/sleep" — evidence favors plan-specification.
- "The Zeigarnik effect makes unfinished tasks haunt you" — the robust finding
  is that *plan-less* goals intrude and *plans* release attention (Masicampo &
  Baumeister 2011), not simple offloading.
- "Strict daily gratitude is best" — weekly is as defensible.
- "Mood-tracking apps improve mood on their own" — support is weak; value is patterns.
- "Happiness habits give large, lasting gains" — meta-analytic effects are ~.2–.3.
- Streaks/gamification as the primary driver.

## Design language (carried over from Rise & Shutdown)

Daylight/night thematic visuals signal the mode: warm dawn glow + rising sun
(Rise), low warm lamp on near-black (Shutdown), dusk between. Phrase rendered
in an italic Fraunces serif. Default phrases: **"Fabricati diem."** (Rise — the
Ankh-Morpork City Watch motto from *Guards! Guards!*, Pratchett's dark-comic
"seize the day") and **"All's well."** (Shutdown — *Guards! Guards!*). The
rescue button (renamed from "Sunday scaries") is **"Don't Panic"** with a small
book glyph (Hitchhiker's Guide), and its closing phrase is Death's **"CATS ARE
NICE."** (*Sourcery*) beside a small cat — the ritual is day-agnostic, not
Sunday-specific. Each spoken phrase carries a small restrained citation line
(e.g. "— City Watch motto, *Guards! Guards!*").

**Phrases are hard-coded (2026-09-14).** They were editable in Settings until
the fields were removed: with the SW's cache-first shell, a stale app copy could
save an old phrase over the real one when the Obsidian API key was entered, and
the stale value then persisted. The app now always reads `PHRASES` constants and
ignores any old saved values.

## Open questions / future options (not built yet)

- Dedicated if-then "when will you do it" field for the one-thing step.
- A weekly pattern view surfacing mood ↔ ritual-adherence trends (Bingo or a
  future Rituals view).
- Bingo absorption into Rituals once the daily spine has real history.

## Evening Menu (Dibbler's Eatery) — evidence base

An on-demand evening *choice surface*, not a ritual flow: a restaurant-style menu
priced in energy ⚡, with daily specials that rotate and learn. Reached via the
Menu segment. Built 2026-09-14 with Justin after the afternoon-slump work: he
wanted personal time run with work-level **intentionality but not scheduling** —
"a menu, not a schedule" (his words), because having the choice is the point.

**Why it's a menu, not a roster (the principal's own design constraint):**
- **Control** is one of the four recovery experiences (Sonnentag & Fritz 2007) —
  deciding for oneself during off-time satisfies autonomy (Deci & Ryan SDT). A
  fixed weekly schedule would convert the intervention back into work; a curated
  palette keeps the choosing his while the curation makes choosing cheap.
- **Menu-not-schedule rules:** nothing on the menu is due, nothing is wrong,
  repeats are fine, and "Nothing, On Purpose" is a printed menu item —
  deliberate rest is a valid order (deliberate rest doesn't produce guilt;
  unplanned drift does — see the productivity-guilt threads this drew on).

**Mechanics (deliberately simple, single-file, no backend):**
- Prices in ⚡ = energy cost. You read your tank and order accordingly — the
  "what energy do I have" decision, made into a restaurant joke.
- **Daily specials rotate deterministically** — FNV hash of the ISO date seeds a
  mulberry32 PRNG; same date + same ratings → same specials (tested). No backend,
  works offline, deterministic for tests.
- **The menu learns:** engagement ratings (1–5, optional) accumulate in
  `localStorage` (`rituals:menuRatings`); specials weight toward high-engagement
  dishes; a dish averaging <2.5 engagement across ≥2 ratings gets **86'd** off the
  rotation (shown on the board as "86'd today — chef's judgment. It'll be back.").
- **The check model (2026-09-14):** ordering is one tap onto the night's check —
  no modal, no mid-meal ratings (retrospective ratings are both lower-friction
  and better data: you judge the arc when it's over, per peak-end findings).
  Items can be removed (✕). Settling the check rates each item — engagement
  feeds the learning loop, energy checks the ⚡ price — and writes the whole
  `## Evening` block to the daily note in a single write. The check is per-day
  and settles once; ordering again after settling reopens it.
- **House classic:** Walk with Henry never leaves the menu.
- The dusk palette (previously defined-but-unused) is the menu's theme.

**Whimsy, kept on a leash (2026-09-14):** three touches, all in the house
register — a **chef's note** that rotates deterministically with the date (same
seed machinery as the specials; six lines, all "genuine" but none insistent);
a **receipt** when the check is settled (itemised with ⚡ prices, a total, and
"Paid in full with time — the only currency we accept. All items genuinely
genuine."); and the eatery's resident cat supervising the check (Frank & Ida
are on the menu, so the cat has a reason to be there). Deliberately nothing
else: no animation, no sound, no gamification.

**Off-menu (2026-09-14):** a free-text "Something else? Order off-menu" captures
what Justin actually did when the menu didn't offer it. Off-menu orders ride the
check and the `## Evening` block like any dish (0⚡ on the receipt — the price
is unknown until it's a menu item). Their ratings deliberately go to a separate
log (`rituals:offmenu`) rather than the rotation store — one-offs shouldn't sway
the board — and `offmenuPatterns()` aggregates by normalised text (count + avg
engagement, sorted). **The learning loop:** repeated high-engagement patterns are
the raw material for future menu items — Dibbler mines this with Justin at the
weekly review and proposes additions to `MENU`; the principal ratifies, keeping
the menu curated and maintainable.

**Trivia gate (2026-09-14):** "Trivia Night" only enters the specials rotation
when a verified pub is actually running a quiz that evening. Schedule data
(`TRIVIA_VENUES`, with sources inline) verified 2026-09-14: all four nearby
venues run weekly quizzes on **Tuesdays, 8pm** — The Prince of Peckham
(DesignMyNight's dated Tuesday list to Sep 2027), The White Horse (Peckham
Rye), The East Dulwich Tavern, Grove House Tavern (Camberwell). A lone Prince
of Peckham IG reel claiming "quiz every Sunday" is unverified and overruled by
the dated list — revisit if the reel's claim ever gets a second source.
**Re-verification cadence:** pub schedules drift; re-check the sources when the
board starts to feel stale (edits are one line per venue). The gate keeps the
menu honest and offline — no network, deterministic tests.

**Scope guard:** the menu owns *choice*, not tasks and not reviews — it does not
read the vault and never plans tomorrow (that stays Shutdown → Rise's carry).
It is on-demand like Don't Panic; it does not set a daily phase.

### Close the loop — CUT (2026-09-16)
The end-of-work window (weekday `spStart`–`shutdownStart`, dusk theme) was a deep
link into today's daily note for Tasks-plugin ticking, plus a REST task list and
a `## Close` bookend block. **Removed** because it was a button that opened
Obsidian and nothing consumed its output: zero `## Close` blocks were ever
written in real use, the REST task list is dead on the hosted origin (PNA), and
Shutdown already owns the end of the work day. The 16:00–20:00 weekday window
is now the front door (`off`), matching weekends. Task ticking stays in Obsidian
where it belongs; `spStart` setting removed. Reverting is a git checkout of the
pre-cut commit — the code was a self-contained view + 70 lines of JS.

## Don't Panic (rescue element) — evidence base

An on-demand "rescue" moment for anticipatory dread — originally conceived for
the "Sunday scaries" (peaks Sunday evening), but deliberately broadened to any
time the feeling hits (a hard morning, a knot in your chest at 3pm). Reached
via a floating "Don't Panic" button, guidance-first, warm golden-hour theme,
optional log. Research gathered 2026-09-06.

**Design shape** (converges from Headspace, Calm, Asana, Lovon, Woebot + the
science): normalize → name the one specific thing → reality-check it → one
first-move for Monday (as an if-then) → park the rest → grounding + self-compassion close.

**What the science supports (with confidence):**
- **Concrete planning > venting (high):** the Sunday/Monday mood dip is one of
  the most consistent patterns in the affect literature (Larsen & Kasimatis
  1990; Stone et al. 1985). Rumination worsens mood (Nolen-Hoeksema); concrete
  planning + implementation intentions counteract it (Gollwitzer 1999, d≈.65).
  → The "one first-move" step is the core active ingredient.
- **Normalize, don't pathologize (medium-high):** it's common and transient;
  validation preempts meta-anxiety. Not a clinical disorder.
- **Coping-capacity reappraisal (high):** likelihood + "what would you do even
  in the bad case" (Beck/Clark decatastrophizing) beats bare "it won't happen."
- **Boundary/detachment (high, if trigger is work spillover):** Sonnentag's work.
- **Self-compassion + brief mindfulness (medium):** supportive frame, not primary.
- **Worry scheduling (medium):** "park it for tomorrow" contains lingering worry.

**Deliberately excluded (weakly supported / counterproductive):** "just think
positive," oversold breathwork-as-cure, forced optimism, venting-alone,
mood meters/streaks/tracking (Mudo cautionary), clinical exposure, and any
work-planning sprawl (hand off to Obsidian Tasks instead).

## Write safety (2026-09-14 incident)

A settle overwrote the entire daily note instead of appending. Root cause: an
empty read (a note mid-creation — Obsidian/Templater fills new notes
asynchronously) passed the `content !== null` check, upsert produced a "merged"
document containing only the new block, and the PUT replaced the whole file.
Fixed with three layers, all still testable in `assertNoteSafe`:

1. **Empty reads are never notes.** `ensureDailyNote` treats blank reads as
   unreadable, re-reads once after 900ms for async template fill, and otherwise
   returns "no content" so the caller falls back to the deep link.
2. **The merge guard.** Before every `vaultWrite`, `assertNoteSafe` refuses a
   write if the original read was empty, the merge shrank the note, or any
   heading that existed in the original (except the replaced section's own)
   vanished from the result. Refusal writes nothing and offers the deep link —
   the note is untouched, and the incident's exact shape ("note became just the
   block") is now impossible.
3. **Every write path uses it** — all ritual logs (`logRitual`).

## Write mechanism & the browser constraint (important)

Rituals logs by appending a block to the Obsidian daily note. Two paths:

1. **REST** (Obsidian Local REST API plugin) — silent, no tap. Writes over
   `https://127.0.0.1:27124` (self-signed) or plain HTTP `http://127.0.0.1:27123`
   (needs "Enable HTTP server" in the plugin). The app auto-tries HTTPS then HTTP.
2. **Deep link** (`obsidian://new?...&append=true`) — Obsidian opens and writes
   the note itself. One tap. **Always works.**

**Hard constraint found 2026-09-11:** when Rituals is served from the **hosted**
site (`https://rituals.justinlamb.org`), path 1 **cannot work in Chrome** —
regardless of settings. Chrome's **Private Network Access** rule blocks a page
from the public internet reaching the loopback address space
(`Permission was denied for this request to access the loopback address space`).
The plugin can't opt in (no `Access-Control-Allow-Private-Network` header; 5.1.0
is current), and cert trust is a second blocker on top.

**Consequence:** REST writes only work when Rituals is itself opened from a
**local origin** (a `file://` copy, or `http://localhost`). Verified:
- local origin → `http://127.0.0.1:27123` = **200 OK**
- public HTTPS origin → `http://127.0.0.1:27123` = **blocked (PNA)**
- public HTTPS origin → `https://127.0.0.1:27124` = **blocked (cert)**

So the app treats the deep link as the *normal* path (calm copy, not an error) and
REST as a silent enhancement for local use. **Do not "fix" this by chasing certs
or enabling HTTP alone — from the hosted origin neither can work.**

Testing note: the Playwright E2E must load the app from a **local** origin (it does,
`http://127.0.0.1:8021`) — a test that ignores cert errors would give a false
pass and hide this. The E2E writes to a scratch `_rituals-e2e/` folder, never the
real `Daily Notes/` (the vault forbids agent prose in daily notes).

## Save integrity — verify-then-celebrate (2026-09-16)

**Problem found in the wild:** Tuesday 15 Sep's Evening check never reached the
daily note. The settle flow marked the check "logged ✓" the moment it *attempted*
the save — before Obsidian had confirmed anything. On the hosted origin the REST
attempt always fails (PNA, below), so every save depended on the deep-link
hand-off, and a silently dropped `obsidian://` URI lost the block while the app
claimed success.

**Rules now (all save paths, all rituals):**

- **A save is only "logged" when verified.** The REST path re-reads the note
  after writing and requires the section heading to actually be there
  (`hasSection`, any heading level). A 200 that didn't land = failure, not win.
- **Every unverified save rides in `rituals:pending`** (`pendingSave/pendingGet/
  pendingClear`) — kind, date, and the full block. Nothing is lost on a dropped
  deep link; it is *unconfirmed*, and the block survives in localStorage.
- **The deep link no longer claims success.** It fires the URI, keeps the block
  pending, and asks the user to confirm ("It's saved ✓"). Marking logged clears
  the pending block; a later verified REST write does too.
- **Boot-time rescue.** If a pending block exists when the app opens (e.g. the
  next morning after a dropped link), the rescue view offers: open in Obsidian
  (appending to the *original* date, not today), copy, "It's saved ✓" (confirm),
  or discard (explicit confirm). Tuesday's loss would have been recovered here.
- **Honest UI state.** The settle button distinguishes "Check settled — logged ✓"
  from "Check settled — save pending (tap to retry)". Local settle ≠ confirmed
  save.

**Heading tolerance.** Monday's note carried a hand-made `# Evening` (H1) while
the app writes `## Evening`. `upsertInContent` now matches the section at any
heading level (normalising to the app's `##` on rewrite), `assertNoteSafe` skips
the replaced section regardless of level, and `parseOpenLoops` treats any
heading (including H1) as the end of the Shutdown block — so a stray `# Evening`
can't be swallowed as carryover or duplicated on the next write.

## Reviews are not a Rituals concern (decided 2026-09-11)

**Supersedes the decision, made earlier the same day, to absorb Bingo into Rituals.**

Rituals owns *moments and cadence*. A review view was built into the app and then
deliberately removed: the review was the only thing forcing Rituals to read the vault,
which dragged in the whole local-origin / PNA constraint, and it had a web app
re-implementing what Obsidian already does properly.

What settled it:

- **Periodic Notes already owns review notes.** `Reviews/Weekly` + `WeeklyTemplate.md`,
  `Reviews/Monthly` + `MonthlyTemplate.md` and `Reviews/Yearly` + `YearlyTemplate.md` are
  configured and enabled in the vault. Note, folder, template and cadence already exist —
  filling those templates by hand from outside duplicates the job.
- **A page from the public internet cannot reach loopback**, so a Rituals review was only
  ever usable when opened from a local file: a degraded, discipline-heavy path.
- **Reviews are vault-native work** — read seven notes, synthesise, write one. Inside
  Obsidian there is no origin rule, no Local REST API, no token, no port and no cert, and
  it works on mobile (which the web app can never do).
- An Obsidian plugin can be **plain JS with no build step**, so this does not reintroduce
  the Tauri-style build cycle that killed Bingo.

**Consequences.** Rituals drops the Review view, its review/AI settings, its ISO-week and
template-fill code, and the weekend `review` mode — weekends now return `off`, which is
identical behaviour (front door, no auto-start) without the dead concept. Any review tool
would be an Obsidian plugin in its own repo. **Bingo (Tauri) is retired**; its logic was
ported once already, and that port is preserved in this repo's git history at `4c14bf0`.

## Housekeeping status

- **Rise & Shutdown apps retired (2026-09-06):** GitHub repos `jalamb5/rise` and
  `jalamb5/shutdown` archived; local repos moved to `~/repos/_archived/`. Their
  moments live on inside Rituals.
- **Old vault folders `Obsidian/Rise/` and `Obsidian/Shutdown/`** still hold
  historical ritual notes (pre-Rituals). Gradual retirement once the daily-note
  spine is trusted — their historical data can stay archived in the vault.

