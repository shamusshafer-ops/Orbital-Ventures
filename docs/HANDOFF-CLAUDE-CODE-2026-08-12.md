# Claude Code handoff — 2026-08-12 checkpoint

## Repository state

- Repository: `shamusshafer-ops/Orbital-Ventures`
- Working branch: `main`
- Local commit: `02c0e03` — `Backlog audit: BACKLOG.md + THE-LIST-TO-DO.md checked against the codebase`
- Pushed. Working tree clean.
- 144 headless test suites green, 6 standalone suites green, `node --check` clean, build parity clean.
- **Read `CLAUDE.md` STATUS first.** It's current as of this commit (not stale — verified
  factually before writing: suite count counted, `BENCH_V2` value grepped, trajectory suite
  actually run). This handoff only summarizes it and adds the concrete next steps; don't treat
  this file as the source of truth once STATUS has moved past it.
- **Claim whatever you start in CLAUDE.md's STATUS block** ("In progress" line) before
  touching it, and clear the claim when you push — that's the collision guard between us.

## What landed this session (Claude/Vega)

Two independent tracks, both fully shipped and tested:

1. **Gate 6 — presentation/aesthetic polish.** All 7 findings from the adversarial review
   addressed: F1/F5 (palette identity + WCAG contrast, solved numerically), F2 (re-scoped after
   the original "662 hardcoded literals" premise turned out to be wrong — see the contract doc
   for why), F3 (bundled Roboto Condensed, subsetted, embedded as a `data:` URI), F6
   (`prefers-reduced-motion` now honoured in JS, not just CSS, across six separate animation
   loops), F7 (2 of 3 dead-token items; the third was correctly *not* done — see below). Full
   detail and the two items still open in `docs/GATE-6-CONTRACTS.md`.
2. **Calendar epic (Time Granularity 4c + true Gregorian calendar).** Real leap years and
   variable month lengths replace the old flat 360-day year; the orbital-mechanics ephemeris is
   genuinely re-derived (not a cosmetic trick), which measurably *improved* mission-window
   accuracy against real synodic periods (1.36% → 0.70% mean error). The forced 1-month build
   floor is now a day-scale floor. Three stages shipped (calendar foundation, window
   verification, duration floors); one stage explicitly not started (see below).

Both tracks turned up real bugs beyond their original scope — worth reading the individual
commit messages (`git log --oneline` from `35a781d` through `02c0e03`) rather than assuming
"Gate 6" and "Calendar" commits are self-contained. Several fixes were only found by grepping
the *whole* repo for a pattern, not just the files originally in scope — that's a recurring
lesson this session and worth repeating before assuming something is fully audited.

## What's shovel-ready — pick this up directly

**Calendar Stage 4 (save migration).** Not started. `SAVE_VERSION` is currently `63`
(`save.js`). There's an exact, closer precedent than I first realized — check
`migrateEphemerisWindows()` in `save.js` (runs at `ver<57`, for the E4.1 ephemeris change)
before designing anything from scratch:

```js
function migrateEphemerisWindows(saved, ver){
  if((ver||0) >= 57) return;
  saved.windows={};
}
```

Its comment explains a deliberate choice worth reading in full: it clears the regenerable
`state.windows` cache but leaves `committedWindow` alone, "to honor the commitment" — a window
the player already locked in stays locked in rather than being silently invalidated.

**Stage 4 cannot fully copy that reasoning, and this is the crux of the migration, more precise
than I had it scoped before writing this handoff:** old `absDay` integers were computed via flat
30-day-per-month math; new ones via real Gregorian math. The *same integer* now resolves to a
*different calendar date* — e.g. old absDay 400 was "13 months of 30 days after epoch" under the
old system, but 1943 now starts at real absDay 365 (1942 has 365 real days), not 360. So:

- `state.windows[...].abs` — safe to clear wholesale, exactly like v57's precedent (regenerable).
- `committedWindow.abs` — the harder case. Clearing it breaks the "honor the commitment"
  principle the last migration established. Reinterpreting it (converting the old flat-30
  meaning to the new real-Gregorian meaning of the same moment) preserves the commitment's
  intent but needs the actual conversion math worked out — this is genuine design work, not a
  one-line fix, and I have not attempted it.
- `state.day` on the live save itself may be out of range for the new real month lengths — e.g.
  an old save with `month=1 (Feb), day=29` was valid under the old flat-30 system but Feb only
  has 28 (or 29 in a leap year) real days. Every save needs this checked and clamped/renormalized
  on load, or `absDayToParts`/`dayToDate` will misbehave on it.
- Order `monthsTotal`/`monthsLeft` in `state.buildQueue` are still valid *durations* post-
  migration (the nominal `DAYS_PER_MONTH` didn't change what a "month" means for that purpose),
  so probably don't need touching — but verify that rather than taking my word for it.

Write the migration test the same way `test-gregorian-calendar.js` and `test-duration-floors.js`
were built: verify it fails against a save fixture from before this session's commits, not just
that it passes now.

## What's genuinely blocked without a real browser — I don't have one here

These are correctness-adjacent, not just polish, and I want to be honest that I could only get
partway on all of them:

- **`docs/ui-baseline/` needs re-capturing.** Every existing screenshot there is smaller than
  its filename claims (`command-1920x1080.png` is actually 1003×1072) — no valid before/after
  comparison exists against them, for Gate 6 or anything else.
- **Nobody has looked at the six Gate 6 palettes.** They're solved numerically (contrast
  verified, distinctness verified) but literally unseen.
- **F8** (`docs/GATE-6-CONTRACTS.md`) — 15 sites use `fill="var(--ignite)"`/`stroke=` as bare
  SVG presentation attributes, which likely don't resolve `var()` the way a `style=` value
  does. I didn't fix this without being able to confirm the actual rendered behavior.
- **Gate 3's final adversarial re-audits never ran** (the reviewing agent hit its usage limit
  per the earlier Gate 3 handoff in this same `docs/` directory) — still true, still open.

## Other open work, lower priority, fully scoped in ROADMAP.md/BACKLOG.md

- `BENCH_V2` still `false` — E3 vehicle bench is complete (207 checks) but switched off pending
  a human playtest against the checklist already in `ROADMAP.md`.
- Solar Map SM6 (3 sub-items), `#118` seeded RNG, E1.6 sound pass (the newspaper-front-page
  half already shipped, confirmed during this session's backlog audit).
- `BACKLOG.md`/`THE-LIST-TO-DO.md` were both just audited against the actual codebase
  (2026-08-12 commit) and should be current — safe to trust their status columns for now, but
  they will drift again the way they did before, so re-verify before trusting a row that
  predates this audit by more than a few weeks.

## One standing rule worth repeating here specifically

Grep before asserting something is missing or unbuilt. This session's own backlog audit found
two items (`prefers-reduced-motion` gating, bench undo/redo) that were fully built and just
never marked as such — the pattern that's burned this project before (decision system, crisis
system, B5 placeholders, C7 facility specialization, and two of my own Gate 6 review premises)
keeps recurring in both directions: things marked done that weren't, and things marked open that
were already shipped. Check the code, not the doc, either way.
