# Rituals — Design Decisions & Evidence Base

> Why Rituals is shaped the way it is. Read this before changing the ritual
> flows or visual design, so we keep the evidence-informed and minimal
> decisions that would otherwise be lost. Research gathered 2026-09-06.

## North star

Rituals should be **easy and fun to use**, help Justin **set himself up for
success each morning** (Rise) and **truly turn off the work brain at night**
(Shutdown). It deliberately owns only the *moments and cadence*; Super
Productivity owns tasks and task closure, Obsidian owns the journal record.
No notifications, no accounts, no backend.

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
Sunday-scaries rescue button is **"Don't Panic"** (Hitchhiker's Guide).

## Open questions / future options (not built yet)

- Dedicated if-then "when will you do it" field for the one-thing step.
- A weekly pattern view surfacing mood ↔ ritual-adherence trends (Bingo or a
  future Rituals view).
- Bingo absorption into Rituals once the daily spine has real history.

## Sunday Scaries (rescue element) — evidence base

An on-demand "rescue" moment for the dread-of-the-work-week feeling (peaks
Sunday evening; can surface any time). Reached via a floating button, guidance
-first, warm golden-hour theme, optional log. Research gathered 2026-09-06.

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
work-planning sprawl (hand off to Super Productivity instead).

## Housekeeping status

- **Rise & Shutdown apps retired (2026-09-06):** GitHub repos `jalamb5/rise` and
  `jalamb5/shutdown` archived; local repos moved to `~/repos/_archived/`. Their
  moments live on inside Rituals.
- **Old vault folders `Obsidian/Rise/` and `Obsidian/Shutdown/`** still hold
  historical ritual notes (pre-Rituals). Gradual retirement once the daily-note
  spine is trusted — their historical data can stay archived in the vault.

