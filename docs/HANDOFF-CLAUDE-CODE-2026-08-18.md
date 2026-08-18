# Claude Code handoff — 2026-08-18 checkpoint

*Supersedes `docs/HANDOFF-CLAUDE-CODE-2026-08-12.md` for current state, but that file's Calendar
Stage 4 scoping (the exact reasoning about `absDay` reinterpretation) is still accurate and
reproduced in full below rather than just linked, so this file is self-contained.*

## Repository state

- Repository: `shamusshafer-ops/Orbital-Ventures`
- Working branch: `main`
- Local commit: `371c8e4` — `Station cluster audit: #73-76 stale, all confirmed shipped`
- Pushed. Working tree clean.
- 166 test files, 159 headless harness suites green, 7 standalone suites green, `node --check`
  clean, build parity clean. `SAVE_VERSION` is now `68` (was `63` as of the last handoff).
- **Read `CLAUDE.md` STATUS first**, same as last time — verify it's still current before
  trusting it; don't assume it tracks this file in real time.
- **Claim whatever you start in CLAUDE.md's STATUS block** before touching it, clear the claim
  when you push.

## What happened since the 2026-08-12 handoff

**You (Codex) shipped Docking D0 through D5** (`a8a558a` through `ee6e19b`, 2026-08-15): orbit
assets, station visits, persistent operations, presentation pass. This is the system I built
`#116-A` on top of three days later — worth knowing the dependency runs that direction.

**I (Claude) shipped two more things, both docs-and-code audits with one real feature:**

1. **`#116-A` — persistent satellite objects** (`90581bc`). Extended your `state.orbitAssets`
   system with a `satellite` kind rather than building a parallel array — satellites are
   payloads, not hulls, so they're the one kind that owns no `hullId`
   (`orbitAssetIsHullBound()` in `data.js` makes that explicit). Schema v1→v2,
   `SAVE_VERSION` 67→68. Degrades over a ~12yr design life, retires at zero health but stays in
   the registry as a real dead object, gets its own Fleet Registry group. Contract income is
   still governed entirely by the contract term — tying income to satellite health (the
   backlog's "option C") is a deliberately separate, balance-affecting slice, not done.
   `tests/test-persistent-satellites.js`, 40 checks.

2. **Backlog audit, two passes** (`02c0e03`, `bc8b114`, `371c8e4`). Checked every
   `BACKLOG.md`/`THE-LIST-TO-DO.md` item against actual source rather than trusting its status
   column. Found staleness in **both directions** — some items marked done that weren't fully,
   more items marked open that were actually shipped. The second pass (station cluster) found
   **#73/#74/#75/#76 were all fully built** (a 2026-07-11 scoping plan for #73 never got its
   slices checked off) and corrected them. Net: 6 items moved this session, `BACKLOG.md`'s tally
   table is current as of `371c8e4`.

**Read the individual commit messages, not just this summary** — each one documents a real bug
found during implementation, not just the feature. Two examples worth knowing about even if you
don't touch the affected code: `fmtTimeLeft()` briefly rendered fractional days
(`"1 mo 0.563...d"`) after the calendar rework, since fixed; satellite health decay was 12% slow
for one commit because a per-day step was rounded finer than its own decrement, since fixed.

## What's shovel-ready

**#119 — station module builds should occupy the real build queue.** Small, well-bounded, no
balance risk identified during scoping. `addStationModule()`'s repeat-purchase path
(`sim.js`) calls `advance(md.buildMo||4)` — a synchronous clock-jump — instead of routing
through `buildQueueList()`/`tickBuildQueue()`, the same queue real vehicle builds already use.
This is "reuse an existing mechanism," not new design. See `BACKLOG.md` #119.

**Calendar Stage 4 (save migration).** Still not started — nobody has picked this up since the
last handoff. Full scoping reproduced below.

## What's genuinely blocked without a real browser — still true, still nobody has one

- `docs/ui-baseline/` still needs re-capturing (existing screenshots are smaller than their
  filenames claim).
- Nobody has looked at the six Gate 6 palettes — solved numerically, never seen.
- F8 (`docs/GATE-6-CONTRACTS.md`) — 15 sites using `var()` inside bare SVG presentation
  attributes, likely non-functional, unconfirmed.
- Gate 3's final adversarial re-audits never ran.
- New from this session: the docking/satellite presentation (D0-D5, `#116-A`) has not been
  visually verified either — all of it is headless-test-verified only, same caveat as Gate 6.

## Other open work, scoped in ROADMAP.md/BACKLOG.md

- `BENCH_V2` still `false` — confirmed unchanged this session.
- Solar Map SM6, `#118` seeded RNG, E1.6 sound pass.
- `BACKLOG.md`/`THE-LIST-TO-DO.md` are current as of `371c8e4` (2026-08-18) — re-verify a row
  against source before trusting it once real time has passed, the same rule as last time.

## One standing rule worth repeating here specifically

Grep before asserting something is missing or unbuilt, in both directions. This session's two
backlog audits found six items across two passes that were fully built and never marked —
`prefers-reduced-motion`, bench undo/redo, and then the entire #73-76 station cluster at once.
The pattern that's burned this project before (decision system, crisis system, B5 placeholders,
C7 facility specialization) keeps recurring at increasing scale. Check the code, not the doc,
whichever direction you're worried about being wrong in.

## Calendar Stage 4 (save migration) — full scoping

Not started. There's an exact, closer precedent than first apparent — check
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

**Stage 4 cannot fully copy that reasoning, and this is the crux of the migration:** old
`absDay` integers were computed via flat 30-day-per-month math; new ones via real Gregorian
math. The *same integer* now resolves to a *different calendar date* — e.g. old absDay 400 was
"13 months of 30 days after epoch" under the old system, but 1943 now starts at real absDay 365
(1942 has 365 real days), not 360. So:

- `state.windows[...].abs` — safe to clear wholesale, exactly like v57's precedent (regenerable).
- `committedWindow.abs` — the harder case. Clearing it breaks the "honor the commitment"
  principle the last migration established. Reinterpreting it (converting the old flat-30
  meaning to the new real-Gregorian meaning of the same moment) preserves the commitment's
  intent but needs the actual conversion math worked out — this is genuine design work, not a
  one-line fix.
- `state.day` on the live save itself may be out of range for the new real month lengths — e.g.
  an old save with `month=1 (Feb), day=29` was valid under the old flat-30 system but Feb only
  has 28 (or 29 in a leap year) real days. Every save needs this checked and clamped/renormalized
  on load, or `absDayToParts`/`dayToDate` will misbehave on it.
- Order `monthsTotal`/`monthsLeft` in `state.buildQueue` are still valid *durations* post-
  migration (the nominal `DAYS_PER_MONTH` didn't change what a "month" means for that purpose),
  so probably don't need touching — but verify rather than taking this on faith.
- **Also now true, not scoped when Stage 4 was first written up:** `#116-A`'s satellite
  deployment records (`vehicleSnapshot.createdAbs`, `createdAbs`) are subject to the exact same
  reinterpretation problem, since they were written using the same `absDay()`. Whatever Stage 4
  does for `committedWindow.abs` should probably apply the same treatment here.

Write the migration test the same way `test-gregorian-calendar.js` and `test-duration-floors.js`
were built: verify it fails against a save fixture from before the Calendar epic's commits, not
just that it passes now.
