# Claude/Codex collaboration handoff

⚠️ **Read the STATUS block below first.** It is rewritten in full each session — not appended to.
Everything from `## History (pure append below)` onward is the permanent archive: never edit or
reorder existing entries there, only add new ones at the end, same as `ROADMAP.md`.

---

## STATUS (as of 2026-11-18 — gameplay spine steps 1–8 done)

**Repo health:** `node tests/run-gate0-evidence.js` → 168/169 suites pass, one intentional skip
(`test-progress-unify.js`), zero unexpected. Build parity, generated-script syntax clean. The runner
now reads each suite's execution mode from a first-line `// @ov-test-mode standalone` directive
(6 suites) and fails any suite reporting a partial count (`19/22 checks passed`) even on exit 0.
Treat any failing suite as new. `build/` is gitignored: run `node build.js` after a fresh pull.
**REMINDER (hit 5x in one session, 2026-07-25): `node build.js` is a bare string concat with NO
syntax check** — a green build does not mean the output parses. ALWAYS run `node --check
build/game.js` immediately after any edit near a `/* */` comment block, and prefer editing well past
a comment's opening `/*` line (or below its closing `*/`) so a narrow str_replace match can't sever
the marker from its body.

**Latest (2026-11-16):** graphics passes 1 and 2, presentation only. Pass 1 (merged 2026-11-15): Cape sky dome /
lit facades / night lamps / shoreline / soft smoke, base terrain, part-diagram hulls. Pass 2: the 3D vehicle is
detailed from flown US/Soviet hardware (`CAPE3D_ENGINE_HULL`, `cape3dHullTexture`) and the land beyond the site has
a procedural district map (`cape3dRegionTexture`). Full sweep 174/175, 1 intentional skip. See ROADMAP-HISTORY.md.
RULE: the vehicle mesh may add detail but must not change stage heights/radii, `nozzleY`, or the stage sub-group
topology — staging, smoke and the plume read them. Needs a human look at an ascent in a real browser.

**Cinematic launch overhaul (2026-11-17, Claude, on main: c91b6d4, 8032f93, 1189fe2):** presentation-only layer
over the Three.js flight — event-aware ascent pacing, shader plume, altitude sky dome, trail/clouds, fairing
jettison, recovery flyback, camera modes (Cinematic/Tracking/Close/Ground, C key), Graphics tiers, heat shimmer,
night lighting from the flight's own flag. Sim untouched: autoplay bot byte-identical before/after (seeds 1–3 to
1975). Suite: `test-cinematic-launch.js`. RULES: airborne transparent effects draw at `CINE_AIR_ORDER` (the
ocean/shore sheets are transparent at 2/5/6 and paint over anything lower); while 3D owns the frame the 2D
fallback paints into a no-op ctx (`flight3dOwnsFrame`); never append `//` to a one-line statement — use `/* */`.

**Gameplay spine (2026-11-16, branch `gameplay-spine`):** working through EVALUATION-2026-11-GAMEPLAY.md §7 in
order; steps 1 (frontier era), 2 (re-flight saturation, SAVE_VERSION 69) and 3 (launch commit policy,
SAVE_VERSION 70), 4 (opening: checklist research step after the first flight, with a cash reserve), 5a (service contracts,
SAVE_VERSION 71) 5b (era cost growth `eraCostMult()`, crash programs) 6 (rivals on the world clock `rivalYear()`,
SAVE_VERSION 72), 7 (Annual Review, SAVE_VERSION 73) and 8 (2026-11-18: science as research cost, trained
astronauts, team reliability ceiling, SAVE_VERSION 74; `test-spine-step8.js`) done. All 8 steps of §7 are complete;
the eval's next move is extending the bot to build stations and fly profile missions (`BOT_HIRE=1` covers hiring).
RULE: every post-Pioneer node now costs science (`sciGateCost`) — a test that starts research past Pioneer must bank
`state.science`. RULE: crewed hangar/window launches need a flight-ready astronaut (`crewReadiness`); tracked
builds don't. Bot seeds 1 and 4 go bankrupt in 1943 on the unchanged baseline — measure with 2/3/5. RULE: when the bot stalls, look for a stuck
`state.launchTxn` first — two real soft-locks were found that way. RULE: a test of the manual decision panels must set `state.launchPolicy='manual'` —
new games default to Nominal, which answers weather/live/reserve/orbit calls itself. Measure every step with `tools/autoplay-bot.js` before and after.
RULE: `currentEra()` is the WORLD era (calendar or Program-opened frontier) — use `calendarEraIndex()` only
when you specifically mean the calendar.

**One-more-launch pass (2026-11-18, Claude):** Last Flight → Next move card on the Design Bench
(`state.lastDebrief`, SAVE_VERSION 75), one-click Δv Resize (`autoSizePlan`), ready hull as the bench's primary
action. Presentation/planning only — bot byte-identical. Suite: `test-one-more-launch.js`. See ROADMAP-HISTORY.md.
**Decision-loop roadmap (2026-11-18):** scoped in ROADMAP.md (Phases 0–5). Phase 0 done: multi-leg Resize
(`autoSizeSlots`, chained in-space → launch-vehicle sizing), card verdicts for abort/strand/scrub/crew-lost, anomaly
calls recorded on the debrief (`lastDebrief.anomaly`) with ops remedies, `BOT_DEBRIEF=1` + the bot's
`failureLearning` summary line. Suite: `test-decision-loop-phase0.js`. Next: Phase 1 (go/no-go block).

**In progress:** (none claimed right now).
> When you start a task, replace this line with: `<task> — <Claude|Codex> — started <date>`.
> When done, clear it back to "(none claimed right now)" and add your entry to the history below.

**Codex checkpoint — 2026-09-07:** Read
[the Codex pass-on](docs/HANDOFF-CODEX-2026-09-07.md) for the current review,
implementation status, and prioritized engineering/realism/gameplay recommendations.
It records mass fix `1634a3f` on `codex/mission-mass-accounting` (draft PR #2,
not merged at this checkpoint), with 168 passing headless suites and one intentional
skip. That measured baseline supersedes the older suite counts above for this
branch. Browser validation and the proposed follow-on features remain open.

**Human-blocked — needs a real browser, no agent can close these:**
- `BENCH_V2` flipped to `true` 2026-11-14 at the owner's request (part bench now visible on the
  Design Bench). Since E3.7 (2026-11-14) it drives the FLOWN rocket: part edits write
  `state.stages`/`state.boosters` (`benchCommit`), slider/family/blueprint edits regenerate the graph
  (`benchBuild` signature sync), payload comes from the mission, and aero drag is real flight physics
  (`aeroLossFrac`, applied in `computeVehicle` + `simulateMission`'s launch leg, never in
  `stackPerformance`). Human playtest checklist in ROADMAP.md (Tier 2 A1) still unrun.
- Gate 6 browser items: re-capture `docs/ui-baseline/` (every existing file is smaller than its
  filename claims — `command-1920x1080.png` is actually 1003×1072, so no before/after comparison
  against them is valid); confirm F8. The palettes are now LIVE (2026-11-14 layout/theme pass: Mission Dark,
  Control Room Green, Apollo Beige, and opt-in Era-evolving) and were reviewed in headless-Firefox
  screenshots — a human eye on them is still worthwhile.
- Gate 3's engineering/design/aesthetic final re-audits never ran (agent hit its usage limit), so
  Gate 3 is not fully signed off.

**Gate system (Codex's adversarial-review track, separate from Tiers/ROADMAP).** Contracts live in
`docs/GATE-N-CONTRACTS.md`; evidence in `docs/evidence/`. Shipped: Gate 0 (baseline), 1 (authority),
2 (atomic launch), 3 (economic continuity + bankruptcy reorg), 5 (honest trajectory), 6 (presentation
polish). **Gate 4 (onboarding / progressive disclosure)** was skipped by the gate track; a first pass
landed 2026-11-14 outside it (First Flight checklist, Basic view that hides not-yet-useful tabs, new
games start in Basic — see ROADMAP-HISTORY.md "#4 onboarding"). No Gate 4 contract or adversarial
review exists for it. A Gate 7 is referenced in `GATE-1-CONTRACTS.md` but never defined.

**Gate 6 — presentation polish (Claude, 2026-08-11/12), all seven findings addressed:**
- **F1/F5 palettes + contrast** — all six theme/era blocks previously held BYTE-IDENTICAL values
  while the source comments claimed distinct palettes; Apollo Beige and Control Room Green both
  rendered the default blue. Palettes are now solved numerically so contrast holds by construction.
  Default keeps its shipped surfaces; only 3 failing tokens moved (`--dim` 2.72:1 → 4.70:1,
  `--bad`/`--dom-military` 4.33 → 4.67). `test-theme-palettes.js` 274 checks.
  RULE: domain hues are a SEMANTIC language and must stay stable across palettes, not drift toward
  each theme. The inherited wheel had `dom-exploration` and `dom-warn` **3.5° apart** — two of seven
  domains were effectively one colour. Re-spaced to clear 20°.
  RULE: my own hand-set "fix" for that made it WORSE (12.7°). Solve colour numerically and verify;
  do not eyeball hex.
- **F2 token coverage — RE-SCOPED, original premise was wrong** — "662 literals vs a 47-token
  system" implied a mechanical migration. Measurement killed it: only **3** literals in render.js
  exactly matched a token value, and **82% of distinct literals are used exactly once**, so
  promoting even the top 50 repeated colours covers ~32% of occurrences. It is not one system
  half-applied; it is one system plus ~300 one-off decisions never systematised. Scope became
  "named chrome surfaces resolve through tokens": new `--label` token, 28 substitutions in the Solar
  Map DOM overlays. `test-themeable-surfaces.js` 20 checks.
  RULE: the planned `test-token-drift.js` literal-count ratchet was ABANDONED — it would have passed
  while the UI stayed exactly as incoherent. Assert the perceivable property, not a proxy metric.
- **F3 typography** — `--sans` named fonts that were never bundled and had no `@font-face`, so a
  Linux/ChromeOS player fell through to `system-ui` in a non-condensed face. Bundled Roboto
  Condensed (SIL OFL 1.1) — chosen because it was ALREADY second in the fallback chain, so machines
  that had it see zero change. Variable font (wght 100-900, no wdth axis), so `font-stretch:
  condensed` was a no-op and is removed. Subsetted to 459 glyphs / 78KB from a real source scan, and
  embedded as a `data:` URI — same `file://` fix `embeddedTextureScript()` already uses for
  textures. `test-typography.js` 23 checks (decodes the base64 and validates it as a real WOFF2).
- **F6 reduced-motion** — the preference appeared ONCE in the whole codebase, in CSS, and zero times
  in JS: every animation ignored it. New shared `reducedMotion()` accessor in shell.js (loads before
  flight.js/render.js). Six fix points: flight Max-Q shake, `cape3dTick`, `map3dTick`, `earthLoop`,
  the three `drawCape(t)` callers unified onto one `ambientClockT()` helper, and CapeScene's pad-smoke
  emitter. `assembly3dLoop` checked and correctly left alone (camera is fully user-driven).
  Each freeze point was verified NOT to carry information first — launch/reentry state lives in
  `root.userData`, planets are driven by `d` (sim day), ground track is inclination-based.
  `tests/harness.js` gained a `matchMedia` stub (there was no way to test either state headlessly).
  `test-reduced-motion.js` 24 checks.
- **F7 dead tokens, 2 of 3** — removed `--cc-hero-navy-raised` (0 uses) and a `--hud-*`
  redeclaration that was 3/5 byte-identical to `:root`. `test-dead-tokens.js` 4 checks.
  RULE: the third item (merge `--cc-hero-*` into `--hud-*`) was DEFERRED because the premise was
  wrong. `.shell.command-hero` and `body.command-mode` toggle from the same state and form a
  deliberate two-tier system — cc-hero applies directly to header/opsbar with no viewport gate AND
  is bridged into hud-* only at ≥1101px. Flattening would likely break that breakpoint.
- **F4 (out of scope, belongs to Gate 1):** `renderCCLegacyStrip()` is called from NO production
  path — only from `tests/browser/gate0-launch-flow.js`, which synthesises the `commandLegacy`
  surface that Gate 1's ready-hull check then asserts against. That contract validates a route no
  player can reach and will pass forever regardless of the real UI.
- **F8 (deferred, needs a browser):** 15 pre-existing sites use `fill="var(--ignite)"` /
  `stroke="var(--ignite)"` as bare SVG presentation attributes, which do not resolve `var()` the way
  a `style=` value does. Held at a ceiling by `test-themeable-surfaces.js` so it cannot grow.

**Earlier work (newest first) — see History and ROADMAP-HISTORY.md for full detail:**
- Tiers 0–3 playability passes (Claude, 2026-08-04→10) — Tier 1 complete (anomaly pool, near-miss
  attribution, 2060 Chronicle bookend); Tier 2 (rival strip, crisis Horizon card, crisis pool 3→9,
  outer-system bases at Callisto/Titan with a hazard mechanic, all 98 research nodes era-gated);
  Tier 3 (`uiLayerBtn`, persistent annals archive).
- Codex bankruptcy reorganization system pulled and verified (141/143 suites at the time).
- Solar Map D-pass + pop-out (Claude) — root cause of the pop-out bug was the map destroying and
  rebuilding its WebGL context on every tab switch, exhausting the browser's context cap; fixed by
  `remountMap3D()` reparenting the live canvas.
- Money/Budget Option C investor-confidence surcharge; Solar Map A/B/C slices.
- Flight overlay unification, anomaly modal → `openFlightForDecision`, press-and-hold time advance.
- Fleet Registry (#115), inclination physics (#114), tracking-station network (#89).
- Flight 3D work (Codex + Claude), tech tree 110→98 nodes, security audit `TECH-AUDIT-2026-07.md`.

**RULES worth keeping in front of you (each one cost real time):**
- **Grep before asserting.** FIVE separate reviews have now flagged something as missing that
  already existed: the decision system, the crisis system, B5's "placeholders", C7's facility
  specialization, and Gate 6's F2/F7 premises. When a review says "build X", read the code first.
- **Headers lie; verify against the codebase.** The 2026-08-12 roadmap archival found three sections
  whose own titles said "not built" and which were in fact shipped.
- **Don't hardcode a growing collection's size in an assertion** (an A3 test asserted
  `crisisProximity().length===3` and broke correctly).
- **Measure rates, don't estimate them** (the near-miss "~1 in 4" scoping estimate measured ~11%).
- **A checklist can be `[x]` from its ORIGINAL scoping commit despite nothing being built** — hit on
  Tier 3.1 AND 3.2, both confirmed via `git log -S`. Check before trusting a tick.
- **A test that passes but cannot fail is worthless.** Every Gate 6 suite was run against pre-fix
  source to confirm it actually fails there (47, 13, 12, 2 failures respectively).

**Standing conventions (both agents, keep doing):**
- Always re-pull `main` HEAD before starting anything — state moves between sessions.
- One dedicated test file per feature/slice; run it first when debugging anything adjacent before
  assuming a regression is new.
- Grep every external reference to an id/function BEFORE renaming or removing it (how the tech-tree
  merges and dead-capstone fixes stayed safe).
- Tag intentional, test-visible behavior changes in the commit message with a leading
  `BEHAVIOR CHANGE:` line — saves the other agent from reverse-engineering "regression or on
  purpose" from scratch (cost real time twice this week: the post-failure hold screen, the 0.1×
  default speed).
- Claim a task in the STATUS block above before starting it; clear the claim when you push.
- `ROADMAP-HISTORY.md` and the History section below stay pure-append, always: completed session
  writeups go at the end of `ROADMAP-HISTORY.md`, never into `ROADMAP.md`. `ROADMAP.md` is now the
  forward-looking file (workflow, milestone status, open threads, scoped/`Planned` blocks) and may
  be edited in place — tick status, close out a scoped block, add new planned work. Read it first
  at session start; open `ROADMAP-HISTORY.md` only when you need detail on a specific past slice.
  This STATUS block is the one full-overwrite exception — rewrite it each session; never touch
  anything past the divider.
- **Keep `ROADMAP.md` lean; archive on a recurring basis, not once.** The 2026-07-28 split created
  `ROADMAP-HISTORY.md`, but `ROADMAP.md` grew straight back to 210KB within two weeks and was
  archived again on 2026-08-12 (2579 → 1861 lines, 210KB → 146KB). Every session pays that cost up
  front, since this file is read at session start. When a scoped block has no open `[ ]` items left,
  move it to `ROADMAP-HISTORY.md` rather than leaving it in place. Two rules learned from the
  2026-08-12 pass: (1) verify completion against the *codebase*, not a section's own header — several
  blocks titled "not built" were in fact shipped, and one (E3) reads as complete but must stay
  because `BENCH_V2` is still flagged OFF pending a browser playtest; (2) before moving anything,
  grep the retained text for `see § <section>` pointers into it and rewrite them to name
  `ROADMAP-HISTORY.md`, or the move leaves dangling references.
- The Git Data API push itself is a conflict guard: pushing against a stale base SHA fails outright
  rather than silently overwriting the other agent's work. If a push fails, re-pull, don't force.
- **SAVE COMPATIBILITY IS NOT REQUIRED (owner directive, 2026-07-28).** This is a single-player game
  with a single player — Shamus — and there is no released install base to protect. Save-breaking
  changes are explicitly acceptable. Do NOT contort a design to preserve backwards compatibility, and
  do NOT add lazy-default guards, grandfather clauses, or `migrate*()` functions purely for the sake of
  old saves. If the clean implementation requires a save format change, take it.
  - Still bump `SAVE_VERSION` and add an entry to `docs/SAVE-VERSIONS.md` — the history is useful as a
    changelog of what state exists and why, independent of migration.
  - Still keep the forward-version guard on load (a newer save opened by an older build should warn,
    not silently corrupt) — that protects Shamus from his own two-agent workflow, not an install base.
  - Existing lazy-default/grandfather code is NOT to be ripped out wholesale on the strength of this
    note. Much of it now doubles as ordinary defensive coding against malformed state. Remove it only
    where it is demonstrably dead weight in a slice you are already touching.

---

## History (pure append below — do not edit or reorder existing entries)

Entries through 2026-07-26 were archived to `ROADMAP-HISTORY.md` on 2026-08-12 (see
"Archived from CLAUDE.md History" there). This zone stays pure-append: add new session
writeups below, newest last, and never edit or reorder an existing entry.

### 2026-08-15 — Docking D0 compatibility authority + D1 mission rendezvous (Codex)

Shipped the first two slices of `docs/DOCKING-SYSTEM-SCOPE.md`. D0 adds pure JSON-safe docking
interface/actor/operation/capability records, exact compatibility and adapter results, immutable
reservation/release transitions, ownership audits, and build-frozen port/guidance fitment. D1 routes
LOR, EOR and optional orbital assembly through exact mission operations, adds the named Rendezvous &
docking reliability/debrief phase, gates `dock_latch` on a real operation, and emits generalized
read-only actor/target presentation specs. Existing module-delivery settlement and visuals remain
unchanged for D2/D5. Focused docking tests are 83/83 and the anomaly contract is 25/25; see
`ROADMAP-HISTORY.md` for the full validation note and the nine unrelated current-HEAD suite failures.

### 2026-08-15 — Docking D2 station visits and transfer settlement (Codex)

Shipped capsule/pod visits to LEO stations. Core Habitats expose one visiting berth and Docking Nodes
add two, wholly separate from permanent module capacity. Crew rotations, flown resupply and LEO
module delivery now reserve one exact station interface in the mission/build snapshot; hard dock
applies an allowed crew/cargo/permanent-module transfer exactly once, then either releases for the
same-mission return or persists a station-local visitor with exact berth and hull ownership. Surface
base module arrivals are labeled cargo handoffs, not orbital docks. Save v64 records visiting berths,
reservations, transfer receipts, docked visitors and `docked` hull state. The two new suites pass
38/38; all focused docking/station suites pass 228/228 and selected Gate 2/3 ownership checks pass
55/55; the full sweep is 150/160 plus one intentional skip, with the
same nine baseline failures and no new red suite.

### 2026-08-15 — Docking D3 persistent orbit assets and separate-launch rendezvous (Codex)

Shipped canonical `state.orbitAssets[]` ownership for free/reserved/docked capsules, pods, tugs and
targets, plus `in-orbit` hull state and save v65. Deployment launches and station releases preserve an
exact hull between turns. A later launch reserves one target interface, freezes explicit actor/target
fitment, and converts hard dock into reciprocal persistent links; failure, cancellation and target
removal clean up only the owning reservation. Fleet Registry actions, Outliner entries, empire strip,
and SVG/Phaser/Three Solar Map badges share the same collection. The two D3 suites pass 35/35; the
focused D0–D3/station/lifecycle/registry/map set passes 367/367, Gate 2 is 49/49, Gate 3 is 96/96, and
the 162-suite sweep adds no failure beyond the same nine baseline suites (plus one intentional skip).

### 2026-08-15 — Docking D4 persistent operations and services (Codex)

Shipped save-v66 `state.orbitOps[]` command/receipt authority for existing orbital craft. Two exact
ports now enter durable stationkeeping, charge one replay-safe 25 m/s reserve increment per attempt,
and can wave off, retry from wave-off or soft capture, then soft-capture or hard-dock. Linked craft can
undock their shared ports; free craft can relocate or return with exact recovered/expended hull
disposition. Typed hard-dock actions move named crew, numeric cargo and propellant exactly once;
station visitors exchange crew, the LEO depot refuels fuel-capable pods/tugs, and power/data service
receipts provide later satellite/tug hooks. Fleet Registry consoles expose the complete D4 loop.

`test-docking-operations.js` and `test-docking-services.js` add 34/34 checks; the focused D0–D4 docking
set passes 190/190. Gate 2 remains 49/49 and Gate 3 remains 96/96. The 164-suite sweep has 154 real
passes plus one intentional skip and the same nine baseline failures; build parity, generated-script
syntax and `git diff --check` are clean. D5 presentation/automation/balance remains.

### 2026-08-15 — Docking D5 presentation, automation and balance (Codex)

Shipped the final generalized-docking slice. Flight settlement freezes the actual launched vehicle
shape/livery for the actor and any separately launched target, plus the same renderer-neutral station
nodes and saved layout consumed by the Three/SVG assembly bench. The Canvas/WebGL-2D docking card now
shows typed station modules or the second vehicle, range/closing-rate/reserve/capture telemetry, a
persisted first-docking ceremony, 1.8-second proven automated playback, and a quiet settled
reduced-motion frame. Save v67 carries presentation history only; reliability and 25 m/s rendezvous
attempt cost are unchanged. Firefox checks at 1280–1600px covered capsule/capsule, capsule/station and
pod/station, and caught/fixed crewed docking being covered by the 3D reentry phase. The D5 suite passes
17/17, Gate 2 remains 49/49, Gate 3 remains 96/96, and the full sweep is 155/165 plus one intentional
skip and the same nine baseline failures.

### 2026-09-07 — Codex review recommendations passed on

Recorded the engineering, realism, and gameplay recommendations in
`docs/HANDOFF-CODEX-2026-09-07.md`, linked from this STATUS and the README. The
handoff distinguishes the committed mission-mass fix (`1634a3f`, draft PR #2)
from pending work, records its validation limits, and proposes failure learning,
logistics planning, then personnel assignment as the next gameplay slices.
Documentation only; no additional game behavior changes.
