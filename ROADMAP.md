# Orbital Ventures — Roadmap & Workflow

This document tracks where the build is and what's next. It's the living
companion to `orbital-ventures-design.md` (original full design doc) and
`orbital-ventures-systems-spec.md` (rocket-equation + life support deep dive).

> **Session history lives in `ROADMAP-HISTORY.md`.**
> On 2026-07-28 the 120 dated session/shipped entries were moved verbatim into
> `ROADMAP-HISTORY.md` to keep this file readable at session start. Nothing was
> edited or deleted — only relocated. This file now holds workflow, milestone
> status, open threads, and scoped/planned work. `ROADMAP-HISTORY.md` remains
> pure-append: new session entries go at its end, never here.

## How we work

- **Source is `src/` + a trivial build** *(since E0.1, 2026-07-10)*: the game is
  authored as seven plain classic-script modules — `src/data.js`, `sim.js`,
  `save.js`, `shell.js`, `flight.js`, `render.js`, `main.js` — loaded in that
  order into one shared global scope (no ES modules, no `defer`/`type=module`;
  the 241 string `onclick=` handlers need global functions and the current
  scope semantics). `node build.js` concatenates them into three outputs from
  one `src/shell.html` template: the release **`orbital-ventures.html`** (one
  inline `<script>` — still "open the file and play", and still exactly what
  ships), a dev **`index.html`** (`<script src="src/X.js">` tags, so dev and
  release can't drift structurally), and **`build/game.js`** (the bare script
  body the harness consumes). **`orbital-ventures.html` is now a generated
  artifact — edit `src/`, never the HTML.** Vanilla HTML/CSS/JS otherwise; the
  "build" is a zero-dependency string concat, not a bundler/transpiler.
- **Vertical slices**: each milestone is a small, playable increment, validated
  with a headless Node harness (`node build.js` then concat `harness.js` +
  `build/game.js` + a test file, run as one script; syntax-check; exercise the
  physics/state functions) before being marked done.
- **Physics first**: every new mechanic is checked against the rocket equation
  (`Δv = Isp · g₀ · ln(m₀/m_f)`) with real numbers before UI is built around it.
  If the numbers don't work, the *design* changes (new engine, different
  architecture) — not the equation.
- **Historical anchors**: every engine and most tech nodes/contracts reference
  a real historical counterpart (V-2/A-4, Rocketdyne S-3D/H-1/J-2/F-1, Bell
  Agena, AJ10, Apollo LM, Sabatier ISRU, etc).
- **Visual style**: dark engineering-instrument theme (drafting-slate panels,
  monospace telemetry, amber "ignition" accent). The Δv gauge is the signature
  UI element.

## Milestone status

- [x] **M1** — Core loop: design bench (rocket equation), missions, R&D,
      economy, Pioneer era (1940s–50s).
- [x] **M2** — Crew & life support: ECLSS (open/partial/closed-loop tradeoffs),
      test campaigns, launch escape systems. Open-vs-closed crossover proven
      on the Endurance mission.
- [x] **M3a-i** — Multi-leg missions: per-leg vehicle architecture (separate
      Transfer Stage), Lunar Flyby/Orbit, mission flight animations
      (design-driven vehicle rendering, ascent + cislunar trajectory).
- [x] **M3a-ii** — Two-stage (Apollo-style) Lunar Lander: separate descent/
      ascent stages, 7-leg Lunar Landing profile, Rocketdyne F-1 unlock.
- [x] **M3b-i** — Mars Flyby/Orbit, Launch Window Planner (Earth–Mars synodic
      cycle, ~26mo with quality variance), Solar System map tab (clickable
      bodies, per-body Δv profiles, single-step zoom, SVG planet textures,
      mission shortcuts via "Fly this").
- [x] **M3b-ii** — Refueling depots & ISRU: LEO Propellant Depot (Tanker Run
      contract, depot top-off slider that bypasses LV lift cost), Lunar/Mars
      ISRU (free return-leg burns, unlocked after first successful mission to
      that body). Validated: depot draw of 14t on Mars Orbit cuts LEO payload
      from 40.4t to 25.4t while *increasing* Δv margin.
- [x] **M4a** — Era display: `ERAS` array (8 eras, Pioneer→Speculative,
      calendar-driven from `state.year`), `currentEra()`/`eraIndex()` helpers.
      Header badge ("Era N/8 · Name") always visible; R&D tab shows full era
      progress card. Eras remain soft — no hard gating by design.
- [x] **M4b** — Rival "firsts": `RIVALS` array (3 named rivals), calendar-anchored
      timelines, `checkRivalFirsts()` every `advance()` tick. Validated headlessly.
- [x] **M4c** — Reputation/scoop effects on contracts: three rival firsts linked via
      `missionId`; if a rival claims one first, `state.scooped[id]` cuts payout to
      `SCOOP_PAYOUT_MULT` (60%). Validated: scoop fires, payout cut confirmed.
- [x] **R&D rush** — `rushResearch()` shaves 1 month/click at quadratic cost
      (`RUSH_BASE_COST·(rushed+1)²`), floored at 1 month remaining.
- [x] **Build-time complexity** — `buildMonths(m)` scales with design complexity
      (stages, transfer stage, lander, crew systems). Validated: 1-stage=2mo, 2-stage
      Lunar Landing=6mo.
- [x] **Flight animation rewrite** — Multi-layer atmosphere, exhaust plumes/Mach
      diamonds, stage separation, fairing, telemetry panel, orbit Earth detail,
      cislunar engine burns.
- [x] **Save/load** — `localStorage` persistence, forward-compat defaults on all load
      paths, versioned `SAVE_VERSION`.

## Open threads / known scoping notes

- ~~Cryogenic boil-off is not modeled as a *mechanic*~~ **STALE, corrected 2026-08-04 (Tier 2 B5
  audit).** It is modeled: `boiloffMargin()` (`sim.js:1800`) computes an extra-propellant factor from
  `BOILOFF_RATE_BASE`/`BOILOFF_RATE_CONTROLLED` and cruise duration, consumed by `resupplyCostFull()`.
  The `cryo_boiloff_control` research node (refueling track) gates the controlled rate — its
  `effect:{}` is correct, not a placeholder; see `RESEARCH_EMPTY_EFFECT_ALLOWLIST` in `data.js`. This
  note was written before the mechanic landed and nobody came back to close it — left visible above
  (rather than deleted) as a record that a stale doc can survive multiple sessions unnoticed.
- Mars ISRU only unlocks *after* a first successful Mars Orbit — by design
  (you discover the resource, then build the plant), but means the first Mars
  trip can't benefit from it.
- The Solar System map now visualises rival expansion (coloured reach markers
  per body) and ambient economy events; **fleet logistics** is still not modeled
  (the home for Strategic-Vision Phase 5 colony/interplanetary-logistics work —
  see § Strategic Vision).
- ✅ **Early-game Δv spike before orbit — FIXED** *(2026-06-27, from the 2026-06-26 M3a
  review, Point A).* Inserted one intermediate mission **`reentry_test` — "Reentry Test
  Vehicle" at 6,000 m/s** between `high_alt` and `first_sat`. The ladder's steepest
  consecutive ratio drops from 2.24× to **1.57×**. Slotted into Pioneer program + Earth
  body map mission list. Validated headlessly (`/tmp/ov-m3a-pointa.js`, 43/43).

> **Roadmap/code sync note (2026-06-17):** M5, M7, and the passive-income section
> below had been written up here ahead of implementation. **M7 has since been built for
> real** (see the M7 entry below, now `[x]`). **M5** and **Passive-income contracts**
> have since been built too (2026-06-21).

## Design Brief — Forward Arc (15-point review)

- [x] **1 · Stronger long-term dream** — Shipped as Programs & ambition.
- [x] **2 · Depot → living economy** *(2026-06-18)* — `state.fuelPrice` mean-reverts with noise.
      `buyFuel()`/`sellFuel()` at spread. Fuel events (shortage/glut/rival buy order). LEO Propellant Market
      panel. Validated (15).
- [x] **3 · Hardware reuse & vehicle families** *(2026-06-19)* — `state.vehicles[]` with snapshot/heritage.
      `familyRelBonus` (+0.02/exp, cap +0.12), `familyBuildMult` (−0.03/success, floor 0.70). Veteran-loss
      penalty. `SAVE_VERSION`→2. Validated (44).
- [x] **4 · Story failures** *(2026-06-17)* — Partial/abort/strand/loss outcomes with subsystem stories. See #16.
- [x] **5 · Strategic rivals** *(2026-06-18)* — Staff poaching (`checkPoaching()`, morale-scaled), industry
      price wars (`marketImpact` firsts → econEvent ×0.8–0.9 for 24–36 mo). `state.rivalThreat`. Validated (7).
- [~] **6 · Multi-path tech tree** — First slice shipped (swimlane R&D, divergent routes, orbital assembly).
      Structures track expanded to 8 nodes. **Research Partnerships shipped 2026-06-27**: `PARTNERS` catalog
      (5 institutions), track-specific R&D-speed boost, `PARTNER_SPEED_CAP` 0.45, `PARTNERSHIP_CAP` 3,
      `state.partnerships[]` `SAVE_VERSION`→38. Validated (22). *Open: TRL (deferred), prototype/testing.*
      *(Superseded/expanded by the R&D Deep Expansion epic — see `ROADMAP-HISTORY.md`.)*
- [x] **7 · Manufacturing capacity** — *Fully built across 8 slices + sub-assemblies 2026-06-20→2026-06-27.
      See § #7 Sub-assemblies below for the complete record.*
- [~] **8 · Program politics** *(first slice 2026-06-20)* — `state.publicSupport` (0–100, 5 tiers). Rival firsts
      erode it; `govMonthlyFunding()` ∝ support × era. Header Public Support stat. `SAVE_VERSION`→3. Validated
      (34). *Open: budget shocks, shareholders, media, stock market.*
- [x] **9 · Personnel personality** *(2026-06-18)* — Deterministic traits (Perfectionist/Visionary/etc). Trait-
      weighted rd/rel scores, `specialistFactor`. Personal events (breakthroughs/mistakes/demands/accolades).
      Validated (11).
- [x] **10 · Vehicle visualization** *(2026-06-18)* — Static silhouette on Design Bench via `renderVehiclePreview`
      (reuses `buildVehicleShape`/`drawVehicle`, flame=0). Validated (7).
- [x] **11 · Milestone programs** — Shipped as Programs.
- [x] **12 · Mission-architecture choices** *(2026-06-18)* — `MISSION_ARCH` swaps profile/modules/duration/relMod.
      Lunar Landing: LOR vs Direct Ascent. Mars: Conjunction vs Opposition class. Validated (12).
- [x] **13 · Map as planning tool** *(2026-06-21)* — `bodyMissions`/`nextWindowFor`/`bodyRoutes`/`missionPlan`/
      `bodyPlan` pure helpers. Body card shows: propellant routes, soonest window, per-mission payout+timing,
      Commit window action. Validated (33).
- [x] **14 · Scientific discovery** *(2026-06-18)* — `state.science`. Mission yields + facility monthly accrual.
      `applyScience()` spends science to cut active research by 1 month. Header Science stat. Validated (8).
      - [x] **14b · Science demand loop** *(2026-06-29)* — gave science its own pull-loop so collection matters.
        **#1 science-gated research:** `sciCost` field + `sciGateCost()`/`sciGateMet()`; `buyResearch` requires + deducts banked
        science to *start* 6 flagship deep-tech nodes (mars_traj 18⚛, digital_twin 20⚛, rad_shielding 24⚛, nuclear_thermal 30⚛,
        closed_ecology 36⚛, nuclear_electric 45⚛). Surfaced on both buy buttons, detail metrics, tooltip, and tech-tree node sub-line.
        **#3 prestige science missions:** 3 new low-payout/high-knowledge contracts (`sciMission`+`sciYield`) — Orbital Observatory
        (22⚛, Hubble), Lunar Sample Return (42⚛, Luna 16), Astrobiology Survey (78⚛, Viking); windfall added in `finalizeLaunch`
        (first-flight only, scaled by sciYield/doctrine, not farmable on routine reflights). `renderMissions` shows the ⚛ reward +
        "science" tag, and a new profile-aware detail line (fixes pre-existing "Δv NaN" on deep missions). No SAVE_VERSION bump
        (static data + existing state). Validated `/tmp/.../ov-science.js` 47/47 + #31 regression 45/45 + 240-month smoke.
- [x] **15 · One-more-turn loop** — Shipped with Programs: `nextObjective()` + post-success dangle.
- [x] **16 · Subsystem-based reliability** *(2026-06-17)* — Per-subsystem rolls whose product = overall R
      (`rel_i = R^(w_i/ΣW)`). Fragility weights per design features. Outcomes: partial/abort/loss/strand.
      Subsystem breakdown on both bench readouts. Validated (9 + 300-launch smoke).
- [x] **17 · Persistent infrastructure** *(2026-06-18)* — `FACILITY_DEFS` (LEO Station/Lunar Base/Mars Base).
      `foundFacility()`/`expandFacility()`. Monthly production (income/fuel/rep/sci). `facilityBonus()`:
      home-field build-cost discount (≤25%) + reliability bump (≤+3%). Infrastructure tab. Validated (16).
- [~] **18 · Agency Command Center & UX layer** — *3 slices shipped 2026-06-19→06-20.* (1) Default landing
      screen; `commandSummary()` + site map tiles routing into tabs. (2) Animated isometric Cape scene with Phaser
      (crawler, truck, drifting boat, growing site). (3) 3-column dashboard: exec overview + 3-col grid (advisor,
      Cape scene, alerts/news) + program timeline; `state.lastMonth`/`state.history`. `SAVE_VERSION`→5. Mission
      Control deepening slices 4–6 also shipped (Advisor ✓/✗ checklist, Objectives checklist, Growing Site).
      Remaining: click-to-jump notifications, animated scene art tiers.
- [x] **19 · Organizational scaling (departments)** *(P2)* — ✅ DONE (slices A/B/C, 2026-07-03). Org layer
      OVER the hired staff (wraps the named individuals — preserves #9 traits/#5 poaching/M6 morale — rather
      than replacing them). A department = one of the 4 engineering specialties + the Astronaut Corps, membership
      derived from who's hired. See "#19 Organizational scaling" in `ROADMAP-HISTORY.md` for the full record.
- [x] **20 · Interactive Mission Control & operations** *(P4)* — *All 4 slices shipped 2026-06-22.* (1) Launch
      weather go/no-go (`rollWeather`, 5 adverse conditions, Challenger cold+solid synergy; split `launch()`→
      `proceedLaunch`). (2) In-flight anomaly decisions (`MISSION_ANOMALIES`; `rollMissionEvents`; `finalizeLaunch`
      separated). (3) Rescue missions: strand → rescue modal (`mountRescue`/`abandonRescue`; `rescueChance` gated by
      research/facilities/rep; new `rescued` outcome). (4) Pre-flight rehearsal: `state.rehearsal`, anomaly chance
      ×0.4; `flightReadiness()` readout card. SAVE_VERSION→18. Each slice 22–30/30 validated.
- [ ] **21 · Colony population & interplanetary logistics** *(P5)* — Extend #17 into living colonies:
      population growth/management, typed construction, and interplanetary logistics & trade routes (the
      long-open fleet-logistics thread). Depends on #17.
- [ ] **22 · Endgame: deep-space civilization** *(P8 — ultimate horizon)* — Planetary economies, interplanetary
      trade networks, massive orbital shipyards, megaproject construction, terraforming, interstellar missions.
      Depends on most of the above, especially #7 manufacturing + #21 logistics.

**Suggested build order:** all items 1–20 shipped. *Open:* #19, #21, #22, deeper #8, map cost/ROI overlays.

## Strategic Vision — 8-Phase Grand-Strategy Arc

Source: *Orbital Ventures: Strategic Development Roadmap* (.docx/.xlsx), imported 2026-06-19. Reframes project into a deep space-agency grand-strategy sim from 1940s to a spacefaring civilization.

| Phase (target version) | Status vs. shipped code | New work & where it's tracked |
| --- | --- | --- |
| **P1 · Foundation & UX** (v1.5) | Vehicle viz (**#10**) + save/load shipped; **#18** shipped through 3rd slice | Remaining: customizable dashboards, launch manifests, advanced filtering → **#18**. |
| **P2 · Personnel & org depth** (v2.0) | Shipped: **M6** + **#9** (traits) + **#5** (poaching) | **NEW:** departments/careers/leadership → **#19**. |
| **P3 · Manufacturing & production** (v2.5) | **Essentially complete** — **#7** fully built (8 slices + sub-assemblies: Engine Yard + Structures/Habitats + Bench-test) | Done. |
| **P4 · Mission Control & operations** (v3.0) | Flight telemetry visually in animation | **NEW:** interactive Mission Control, rescue missions → **#20** ✅ DONE. |
| **P5 · Infrastructure & colonization** (v3.5) | Persistent bases/stations (**#17**); ISRU; depot economy (**#2**) | **NEW:** colony population, interplanetary logistics → **#21**. |
| **P6 · Economic & political** (v4.0) | Launch market + econ events + **#8** first slice shipped | Remaining: budget shocks, political influence, investor/stock-market → **#8**. |
| **P7 · Research ecosystem** (v4.5) | Test campaigns (**M2**), science (**#14**), breakthroughs (**#9**); tech tree interactive | TRL, partnerships → **#6 / R&D epic**. |
| **P8 · Deep-space civilization** (v5.0) | Foreshadowed by **#17** + **#1/#11** | **NEW:** planetary economies, orbital shipyards, megaprojects, terraforming → **#22**. |

### New forward-arc items extracted from the strategic vision

- [~] **18 · Agency Command Center & UX layer** — *See completed milestones above (3 slices + deepening slices 4–6 shipped).* Remaining: click-to-jump notifications, animated scene art tiers.
- [x] **19 · Organizational scaling (departments)** *(P2)* — ✅ DONE (A/B/C, 2026-07-03). Leaders, career progression, training, succession + workforce planning. Builds on M6/#9/#5. See § below.
- [x] **20 · Interactive Mission Control** *(P4)* — *All 4 slices shipped 2026-06-22.* See Design Brief #20 entry above.
- [ ] **21 · Colony population & interplanetary logistics** *(P5)* — Colony population/management, typed construction, interplanetary logistics & trade routes. Extends #17.
- [ ] **22 · Endgame: deep-space civilization** *(P8)* — Planetary economies, orbital shipyards, megaprojects, terraforming, interstellar missions.

> **Incorporation note (2026-06-19):** strategic-vision Phases 3/6/7 merged into #7/#8/#6; Phases 1/2/4/5/8 captured as #18–#22.

## Time Granularity — Monthly → Daily Simulation (epic)

**Goal.** Replace the discrete monthly tick with a daily one. **Status: Slices 1–4b SHIPPED 2026-06-27. Epic wrapped here — core daily-time payoff delivered. Slices 4c + 5 are deferred polish, not queued.**

**Core design decisions.**
- `DAYS_PER_MONTH = 30` (abstracted month). A true Gregorian calendar is a later cosmetic upgrade.
- `state.day` (0..29) alongside `state.month`/`state.year`; `absDay()` sibling of `absMonth()`. SAVE_VERSION→33 (legacy `day:0`).
- `perDay(monthlyRate)` and `daysFor(months)` helpers — one conversion layer.
- Equivalence first: 30 daily ticks must reproduce old single-month totals within ε before any new gameplay.
- Cadence-gated subsystems (rivals, cashflow snapshot, sparklines, pad cadence, morale, market walks) fire only at monthly boundary. Continuous flows (overhead, payroll, opex, royalty, funding, R&D progress) convert to per-day.

**Suggested build order:**

1. [x] ✅ **Equivalence-preserving refactor** *(SHIPPED 2026-06-27)* — `advance(months)` → thin wrapper over `advanceDays(daysFor(months))`; funnel iterates day by day; ≈25-subsystem monthly block extracted to `tickMonthlyBoundary()`, fires only on completed month. Bit-identical equivalence for whole-month advances (same RNG stream). `DAYS_PER_MONTH=30`, `absDay()`, `perDay`/`daysFor`. **Validated /tmp/ov-tg1.js 22/22:** advance(12) ≡ 12×advance(1) ≡ advanceDays(360) on all metrics; sub-month advance moves calendar but charges no overhead; legacy save migrates to day:0. CE5 regression green.

2. [x] ✅ **Calendar + controls + per-day overhead** *(SHIPPED 2026-06-27)* — `dateStr()` → "14 Mar 1962". Advance button → **+1d / +1w / ▸+1 month / +1y** stepper (`stepTime(days)`). Continuous-flow split: overhead/payroll/royalty via `perDay()` in `tickContinuousDay()` every day. R&D/gov-funding/facility-output deferred to slice 3 (they read state the monthly tick itself updates). **Validated /tmp/ov-tg1.js 29/29:** sub-month charges continuous flow but no monthly-gated subsystems; two 15-day steps ≡ one 30-day step.

3. 🟡 **Duration re-authoring + per-day conversion.**
   - [x] ✅ **3a — per-day smooth flows** *(SHIPPED 2026-06-27)* — R&D progress, gov funding, public-support revert moved into `tickContinuousDay()`. Support at `SUPPORT_REVERT_DAY = 1−(1−SUPPORT_REVERT)^(1/30)` (exact geometric day-rate). **Validated /tmp/ov-tg1.js 34/34.**
   - [x] ✅ **3b — facility output per-day** *(SHIPPED 2026-06-27)* — Facility production payout (income/rep/fuel/sci × supply factor) moved into `tickContinuousDay()`. Supply drain + starvation stay monthly-gated. **The whole money economy now flows daily.** Morale drift stays monthly by design. **Validated /tmp/ov-tg1.js 41/41.**
   - [x] ✅ **3c — day-resolution display + build-per-day + CE re-pin** *(SHIPPED 2026-06-27)* — `fmtTimeLeft(months)` → "2 mo 27 d" countdowns. Build queue progresses `perDay(1)` in `tickContinuousDay()`. Targeted fractional display fixes (rep rounded, added to monthly round2 tidy). **No blanket ~357-string sweep** (decided with user: "/mo" rate labels and month-authored durations are still accurate). CE1–CE4 re-pinned: facility supply drains only at monthly boundary; `empireOpex`/`loanInterest` day-invariant; rival accrual whole-month equivalent. **Validated /tmp/ov-tg1.js 53/53** + fmtTimeLeft 8/8 + render smoke 8/8.

4. 🟡 **Day-granular gameplay + duration re-authoring.**
   - [x] ✅ **4a — mission clocks** *(SHIPPED 2026-06-27)* — A flown mission advances the calendar by `m.days`, wired into `proceedLaunch` right after `resolveFlight` via `advanceDays`. Early/suborbital missions: `days:0` → early game provably unchanged. Deep missions: commitments (Mars 520d, Jupiter 2190d ≈ 6yr). Game-over mid-cruise guarded `if(state.over) return`. CE5 live-call/anomaly/finalize paths untouched. **Validated /tmp/ov-tg1.js 58/58:** days:0 no advance; 7/120/520-day missions advance exactly; overhead accrues over cruise.
   - [x] ✅ **4b — day-scheduled launch windows** *(SHIPPED 2026-06-27)* — `SYNODIC_DAYS = SYNODIC_MONTHS·30`. `windowsFor` generates `abs` in `absDay`; `nextWindowFor` returns `daysAway` + day-precise `date` (via `dayToDate(absDay)`). `canLaunch`/`launch` gap compare/advance in days. SAVE_VERSION→34 + `migrateWindowsToDays` (pre-v34 `committedWindow.abs` ×30, windows cache cleared) in both load paths. **Validated /tmp/ov-tg1.js 66/66** + render smoke + CE5 green.
   - [x] ✅ **4c — short-fuse events/contracts in days, finer cadence, and duration re-authoring** *(SHIPPED 2026-08-12)* — `buildMonths()`'s `Math.max(1, mo)` floor replaced with a day-scale floor (`ENGINE_BUILD_FLOOR_DAYS/DAYS_PER_MONTH`, reusing the launch-quote pipeline's existing constant). The build/research pipeline was already day-scale internally (orders decrement `monthsLeft` by `perDay(1)` daily); the floor was the only thing forcing a whole month. `fmtTimeLeft()` fixed alongside it — see the Gregorian-calendar item below. **`tests/test-duration-floors.js` 21/21**, verified against the pre-change baseline (core assertion fails there showing the old `1.000 mo` clamp).

5. [x] ✅ **True Gregorian calendar** *(SHIPPED 2026-08-12, upgraded from "purely cosmetic" — see note)* — Real variable month lengths + standard leap-year rule (`MONTH_LENGTHS`/`isLeapYear`/`monthLength`). Scoped as "purely cosmetic over the 30-day-abstracted economy" when this line was written; built as a genuine re-derivation instead: `GAME_YEAR_DAYS` is now the real 365.2425-day average (was a flat 360), which feeds the Kepler's-3rd-law ephemeris. This measurably *improved* mission-window accuracy against real synodic periods (mean error 1.36%→0.70%) rather than being neutral, since a flat 360-day year understated the real year by 1.45% and biased every body's cadence low. `DAYS_PER_MONTH` is now a nominal duration unit (`GAME_YEAR_DAYS/12`) for builds/research/rates, decoupled from the real calendar used for dates. **`tests/test-gregorian-calendar.js` 46/46, tests/test-calendar-windows.js 24/24, tests/test-duration-floors.js 21/21.**
   Two bugs found and fixed during implementation that predate this change in spirit but were only exposed by it: three separate places (`reorganization.js`'s `setCampaignAbsDay`, a Gate 3 invariant in `data.js`, a test fixture's own copy) independently re-derived calendar math with the old flat-30 formula rather than sharing one implementation; and `fmtTimeLeft()`'s month/day split broke once `DAYS_PER_MONTH` became fractional (fixed under 4c above).
   **Still open: save migration.** Existing saves cache `state.windows`/`committedWindow.abs` as `absDay` values computed under the old flat calendar, and queued-order `monthsTotal`/`monthsLeft` were written under the old 1-month floor. Needs a `SAVE_VERSION` bump + migration before this closes out completely — tracked as Calendar Stage 4, not yet started.

**Risks / watch-items.** Save migration; performance (360 iterations/year not 12 — keep per-day path light); `lastMonth` + sparklines aggregate days→months; double-check `absMonth()`-keyed systems (pad cadence CE2(b), synodic windows) after the switch. **Cross-ref:** `advance()` funnel, CE2(b) launch cadence, CE4 carrying cost/resupply, M3b window planner, #28 sparklines, #18 cashflow panel.

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive

## Planned — Design-evaluation initiative: hardcore-sim depth pass (2026-07-04)

Source: seasoned-dev evaluation (systems depth · immersion · fun/reward lenses; KSP / Stellaris /
Civ 5 / Juno references). Implemented in ranked order (P1→P11), one vertical slice at a time, **each
slice gated on user approval** per "How we work." Every slice is balance-neutral by default (collapses
to today's behavior when inactive/legacy) unless noted; SAVE_VERSION bumps only where new persisted
state is added.

**Through-line:** P1, P2, P11 are one thesis — *put the universe in motion*. **P1 is the keystone
entity model** P2 and P11 build on. The quick wins (P3–P5, P7–P10) are independent of the entity model
and can be interleaved earlier if immersion payoff is wanted sooner. Sequence chosen: strict down-the-list.

**P1 — Persistent in-flight missions** `[Big swing · keystone]`
- 1.1 In-flight entity model: `activeFlights[]` (mission ref, launch/arrival dates, phase, crew, margins
  snapshot). *SAVE_VERSION bump + lazy migration.* Parity: an instant-resolved flight yields byte-identical
  outcome to today.
- 1.2 Outliner surfacing + day-by-day cruise progress; smart-time stops at flight checkpoints. No new outcomes.
- 1.3 Mid-cruise checkpoint events reusing CE5 bank/burn/opsLuck plumbing. Neutral when disabled/unstaffed.
- 1.4 Polish: cruise telemetry panel, per-flight margins, abort/redirect verbs where physically legal.

**P2 — Living logistics (#21)** `[Big swing · depends on P1]`
- 2.1 Route model: scheduled tanker/resupply flights as P1 entities; replace instant `resupplyFacility()`
  (collapses to instant at zero distance/legacy).
- 2.2 Economics plug-in: fuel-market draw, transit boil-off, per-route opex.
- 2.3 Interruptions: routes can be disrupted (scrub/rival/event) → shortfalls to manage.
- 2.4 Logistics overlay on the solar-system scene.

**P3 — Failure investigation loop** `[Quick win · reuses #16 breakdown + setback modal]`
- 3.1 Post-loss "fund inquiry" action (time+money) → science / targeted subsystem reliability credit /
  related R&D discount. Declining = today's behavior exactly.
- 3.2 Investment tiers, partial findings, heritage credit on the failed family.

**P4 — Rival voice** `[Quick win · strings off tickRivals]`
- 4.1 Per-profile communiqué table + triggers (scoop / your firsts / rival panic). Zero balance impact.

**P5 — Rival disasters + rescue-their-crew** `[Quick win · reuses #20 rescue]`
- 5.1 Surface rival public failures (momentum dip / market event).
- 5.2 Stranded rival crew → #20 rescue pipeline → rep/support windfall.

**P6 — Era texture pass** `[Big swing · content-spread]`
- 6.1 Per-era event-pool weighting hook.
- 6.2 Contract/flavor reskins + public-mood modifier per era.
- 6.3 Era-transition interstitial (Civ-style splash + Chronicle snapshot).

**P7 — Newspaper front page** `[Quick win]`
- 7.1 Front-page artifact extending the celebration modal (firsts/disasters/scoops); Chronicle scrapbook.

**P8 — Cross-track synergies as verbs** `[Quick win · SYNERGIES config ready]`
- 8.1 Ship the 4 existing SYNERGIES seeds.
- 8.2 Upgrade ≥2 from % folds to unlocks (e.g. Autonomous Landing ⇒ uncrewed precision-cargo mission type).

**P9 — Doctrine content drip** `[Quick win]`
- 9.1 Advisor/outliner surfacing of active doctrine (flagged-open item).
- 9.2 1–2 doctrine-exclusive contracts/events/hires per doctrine.

**P10 — Reward for flying risky** `[Quick win]`
- 10.1 Schedule-pressure payout multipliers on contracts/mandates.
- 10.2 First-flight-of-design prestige bonus + insurance-premium contract type.

**P11 — One late-game crisis** `[Big swing · leverages P1 + CE4 stakes]`
- 11.1 Crisis framework: era-gated trigger, escalation phases, resolution states.
- 11.2 First concrete crisis (e.g. debris cascade closing LEO) using P1 flights + existing systems.
- 11.3 Legacy integration: surviving a crisis marks `legacyScore`.

**P1–P11 status: ✅ ALL SHIPPED (2026-07-05).** See the per-P progress logs below and the P7-P11/P6-reskin/
Launch-rearchitecture/#29 session entries further down for what actually landed (real research ids instead
of the plan's stale T-number placeholders, several scope decisions made live, a couple of real bugs caught
by the harnesses before ship). Not yet browser-tested as a whole — see "Playtest Zero" in the next section.

## Planned — Second design pass: improvement / pruning / flow polish (2026-07-05)

Source: fresh outside review (tech-lead/Fable agent, no prior session bias), same KSP/Civ5/Stellaris/
dev-health lenses as the first pass, explicitly asked to also hunt for **pruning** candidates now that the
codebase has grown enormous across dozens of sessions and two full review passes. Read ROADMAP.md in full
first, then did targeted code exploration (not a full linear read of the ~15,700-line file). **Not yet
scoped into ranked P-slices or started — this is the raw findings, for the user to pick from.**

### Improvements
- **I1 — The content horizon.** ✅ **DONE (2026-07-05).** `[Big swing, mostly data]` Missions stopped at
  `jupiter_orbit`; no crewed Mars landing existed at all despite the lander architecture being flyable since
  M3a-ii. Shipped `mars_landing`/`saturn_orbit`/`titan_landing`/`oort_precursor` + 2 new/1 extended programs
  + 2 new/1 raised ambitions — see the I1 session log for the implementation. (I2, the second scoring
  bookend, is a separate still-open backlog item.)
- **I2 — Second scoring bookend.** ✅ **DONE (2026-07-05).** `[Medium]` Chronicle only ceremonialized once, at
  the 1990 soft-scoring date. Shipped `SCORING_YEAR_2=2100` + `state.eraScored2`, a `showChronicle('era2')`
  mode, and a `fusionFlown` legacy bonus — see the I2/I3 session log for the implementation.
- **I3 — Generalize P11's crisis into a 2–3 crisis roster.** ✅ **DONE (2026-07-05).** `[Medium, framework
  already existed]` One one-time crisis was a demo, not a system. Shipped a `CRISES` config (3 entries:
  Debris Cascade unchanged, new Solar Storm Season, new Funding Collapse), `state.crisisHistory[]` (lazily
  backfilled from the old singular `crisisDone`) — see the I2/I3 session log for the implementation.
- **I4 — Full-game metric history for the Chronicle.** `[Quick win]` `state.metricHist` is a 24-month ring
  buffer; add a decimated (e.g. quarterly) unbounded series and render treasury/rep/support/firsts-vs-rivals
  replay graphs inside `showChronicle()`. *(Partially addressed 2026-07-05 by the Finances pop-out's 3 new
  metricHist series, but those are still the same 24-month cap — a genuinely full-run series is still open.)*
- **I5 — Research queue.** ✅ **DONE (2026-07-05).** `[Quick win]` One active project; the lab idled
  silently (alert badge only) when a project completed mid-skip. Shipped as a depth-1 queue (`state.researchNext`,
  `queueResearchNext`/`tryStartQueuedResearch`) — see the I5 session log below for the implementation.
- **I6 — Aerocapture as a real mechanic.** ✅ **DONE (2026-07-05).** `[Medium]` The `aerocapture` research
  node already existed with `effect:{}` — a pure no-op. Shipped a 70% Δv cut on the Mars/Jovian/Saturn
  orbital-capture legs via `simulateMission`'s existing `legDv()` hook — see the I6 session log for the
  implementation.

### Pruning candidates
- **P-1 — Merge "Build & Launch" and "Queue this build."** `[Quick win]` Confirmed in code: since the
  2026-07-05 Launch rearchitecture, `launch()` routes every fresh commit into `queueBuild(true)` — the
  `committed` flag changes only the log string. Both paths end in the hangar awaiting a manual Fly click,
  but the Bench still shows both as separate buttons (`benchQueueHTML()`). Kill the redundant Bench "⊕ Queue
  this build" row; keep queueing inside the Manufacturing drill for its real identity (build-ahead-of-stock).
- **P-2 — Delete the dormant Phaser FlightScene.** `[Quick win]` ~254 lines plus reverted realism-overhaul
  code, dead behind a commented-out call since 2026-06-25. The 2D renderer won six weeks ago; excise it
  (lives in git history if ever wanted).
- **P-3 — Retire or repurpose the Basic/Advanced/Expert `uiLayer` system.** `[Medium]` 46 touchpoints built
  for the old 11-tab UI (#23, 2026-06-22); superseded since by the Shell consolidation, hub modals, outliner,
  and attention badges, which rebuilt disclosure around *navigation* rather than CSS-hiding. A second,
  competing disclosure system is a tax on every future feature (which layer does it belong to?).
- **P-4 — Gate the Station Bench tab behind relevance.** `[Quick win]` Visible as a permanent 5th scene tab
  since 1942, decades before a facility can exist. Hide until the first facility/`orbital_assembly`, with a
  one-time "new capability" reveal (a reward beat, not just a hide).
- **P-5 — Collapse the fuel market's 4-button spot-trading UI.** `[Quick win]` `buyFuel(10)/buyFuel(25)/
  sellFuel(10)/sellFuel(all)` is exactly the shape the 2026-07-03 materials-collapse pass already identified
  as weak-pull depth, and fuel price already flows into resupply cost automatically (P2 2.2). Same pattern:
  one dip-buy decision, one sell-on-spike decision, sparkline with shaded band.
- **P-6 — Consolidate the research-acceleration stack.** `[Medium]` Line ~2720 sums 5 additive speed sources
  with no aggregate clamp (already flagged open 2026-07-04) on top of Rush/Apply Science/breakthroughs/
  setbacks/science gates/doctrine/affinity multipliers — ~9 systems modulating one progress bar with no
  attribution. Add the clamp, and a "R&D throughput" breakdown line in the R&D panel (that second half is
  actually an *addition* — it's what makes the existing depth legible/pay rent).
- **P-7 — Code-health housekeeping batch.** `[Quick win]` The `SAVE_VERSION` comment carries a ~6,000-word
  single-line changelog (ROADMAP.md is the changelog; keep one line per live migration). Headless harnesses
  live in `/tmp/ov-*.js` and are re-derived every session — worth a permanent `tests/` directory. Legacy
  materials contract-lock resolution can sunset past a save-version horizon.

### Flow polish
- **F1 — Playtest Zero.** `[Non-negotiable, do first]` The entire P1–P11 initiative, the tracked-launch
  rework, the isometric CC rework, and #29 are headless-validated but essentially un-eyeballed (ROADMAP
  flags "needs a manual browser pass" 10+ times in the last 3 days). One structured 2-hour playthrough
  (fresh start → first satellite → first crewed → one deferred Mars flight, plus a doctored Commercial-era
  save for the crisis) surfaces more than further review would.
- **F2 — "Fly when ready" adds a mandatory extra trip to every mission.** `[Quick win]` The tracked-launch
  loop is now: commit → advance time → notice rollout → find the Fly button (3 possible homes: bench,
  `#ccProgress` card, infra modal) → weather modal → outcome. An "auto-fly on rollout" checkbox at commit
  (default on for routine/uncrewed, off for crewed/first flights) removes the chore on repeat launches while
  keeping manual Fly available. Also close the flagged crew-reservation gap while here: soft-reserve the
  astronaut on a committed crewed build, warn on reassignment.
- **F3 — Decision-inbox: audit the interruption budget.** `[Medium]` 9 distinct `_pending*` modal channels +
  44 `showModal` sites. After a long time-skip the precedence chain can queue 4+ modals back to back. Split
  into **blocking** (crew at risk, a decision with a deadline this tick) vs. **non-blocking** (inquiry
  offers, special contracts, rival disasters you could decline, era retrospectives) — the second tier moves
  to a Stellaris-style situation-log in the outliner, opened at the player's own pace.
- **F4 — One canonical "what's happening now" surface.** `[Quick win]` Active research/builds currently
  render in 4 places (`#opsTimeline` UPCOMING chips, the Outliner, `#ccProgress`, the execOverview stat
  line — the last two shipped 2026-07-05 and already admit "harmless duplication"). Make the Outliner the
  single source of truth (it already has ETA-sort, click-through, and `runToNextEvent`); render `#ccProgress`
  as a view of outliner items rather than a parallel list; delete the execOverview line + UPCOMING chips
  (keep the timeline strip for the *log*, its real #29 job).
- **F5 — Fix the new-game first beat.** `[Quick–medium]` `startupBegin()`→`newGame()` opens the manufacturing
  drill modal first — the least relevant system in 1946, a relic predating the startup screen. Zero tutorial
  exists anywhere. Replace with a 3-beat welcome (framing + first objective → land on the Bench with the
  advisor flight-plan panel highlighted → let the existing milestone celebration pay it off).
- **F6 — Close the doctrine/partnership surfacing loop.** `[Quick win]` Flagged open three sessions running.
  Doctrine only surfaces as a Cape attention-glyph + the P9 contract badge; the undeclared-state/declare
  decision never reaches the advisor or outliner. One advisor nudge once rep/era crosses a threshold, plus a
  partnerships line in P-6's R&D throughput breakdown, closes it.

**If only three:** (1) F1 + P-1 + F2 as one "settle the launch flow" pass — the most-used loop in the game
changed 3 days ago and nobody's flown it. (2) I1 (+ I2) — the content horizon; makes the last two eras and
half the tech tree into a game instead of an inventory. (3) F3 — the decision-inbox split, protects
everything the last month added (living universe, rival voice, crises) from curdling into interruption
fatigue before it ever gets appreciated.

### Progress log — P1 (persistent in-flight missions)
- **1.1 ✅ (2026-07-04)** — In-flight entity model. `state.activeFlights` + `registerFlight`/`completeFlight`;
  the cruise fast-forward in `proceedLaunch` is wrapped by a synchronous flight lifecycle. No SAVE_VERSION
  bump (activeFlights always empty between turns). Proven byte-identical (lifecycle harness 42/42).
- **1.2a ✅ (2026-07-04)** — Deferred arrival for long **uncrewed** cruises (≥`DEFER_CRUISE_DAYS`=60d). Outcome
  still locked at launch; **applied on arrival** via a reentrancy-guarded `pumpFlightArrivals()` (guards: a
  `_flightResolving` launch-lock, the flight-modal globals, and an on-screen-modal check). `beginResolve(ctx)`
  extracted so the synchronous and deferred paths share one chain; `ctx.fam` snapshots the launched family so a
  deferred arrival can't misattribute heritage. Concurrent uncrewed interplanetary flights now supported. Short
  + all crewed flights stay synchronous → byte-identical. Design decisions (user): defer interplanetary-only
  (≥60d); allow concurrent flights. Harnesses: pump 17/17, beginResolve 3/3, 1.1 regression 42/42. No bump yet.
- **1.2b ✅ (2026-07-04)** — Crewed deferral + crew-slot snapshot. Crewed interplanetary flights (≥60d) now defer
  too → concurrent crewed + uncrewed flights. `ctx.crewId`/`ctx.ab` snapshot the crew + astronaut bonus at launch;
  the single `assignedAstronaut` slot is freed at launch so another mission can crew up. `loseAssignedCrew`/
  `applyCrewDose` take an explicit crew id (default = live slot) so arrival acts on the flight's own astronaut and
  never clobbers a concurrent crew. `isCrewDeployed()` blocks double-booking in `assignAstronaut` + a 🚀 in-flight
  roster pill. Synchronous crewed flights byte-identical. Harness: crew 12/12 + regressions (17/17, 42/42, 3/3).
  Known edge: a deployed astronaut who quits/is poached mid-cruise resolves as a graceful no-op (harden in 1.2c).
- **1.2c ✅ (2026-07-04)** — Persistence: SAVE_VERSION 40→41 + `rehydrateFlights()` (shipped with the Save-management
  & startup feature, session below): in-flight missions survive save/reload (ctx stores `famId`/`crewId` not object
  refs; `ctx.m` re-linked to canonical MISSIONS on load; `_flightSeq` restored; corrupt in-flight records dropped).
  Outliner: live flights now render in the ◈ In flight panel with a climbing progress % + counting-down ETA
  (`outlinerItems()` pushes a 🚀 row per deferred flight, warn-colored inside 30 d); because they're outliner items,
  `runToNextEvent()` (⏭ next event) now stops at flight arrivals. Harness ov-outliner 9/9 (row math, crew tag,
  non-deferred skip, ETA sort). **Slice 1.2 complete.**
- **1.4 ✅ (2026-07-04)** — Polish. `rec.marginSnapshot` populated at launch (reliability = `outcome.rel`; tightest
  Δv margin = min `cap−dv` over sim legs). Cruise-telemetry modal (`showFlightsModal`/`flightsPanelHTML`): per-flight
  progress bar, ETA, reliability, Δv margin; opened from the Outliner 🚀 row. Abort verb (`confirmAbortFlight`/
  `abortFlight`) reuses the `scrub` outcome — crew + vehicle recovered, objective forfeit, costs sunk, small rep dent,
  no family/heritage hit; the freed astronaut becomes assignable again. Redirect (destination change mid-cruise)
  deliberately deferred — needs trajectory rework. Harness ov-telemetry 14/14. **P1 (persistent in-flight missions)
  complete.** Next initiative item: **P2 — living logistics** (builds on this flight-entity model).

## Planned — External evaluation intake (2026-07-10)

**Full backlog:** all 105 feature ideas from the evaluation, individually mapped to a
workstream item or `Backlog`, live in `BACKLOG.md`. The sections below are the
priority filter; `BACKLOG.md` is the thorough companion — nothing from the evaluation
was dropped, 55/105 items are simply untriaged pending future slice selection.

A full-project evaluation (code, performance, gameplay, sim fidelity, tech tree, economy,
UI/UX, visuals, feel, AI, comparative analysis, 105 feature ideas, Steam-readiness verdict)
now lives in the repo as **`EVALUATION-2026-07.md`**. Verdict in one line: sim core is real
(7/10 overall), product layer isn't — EA-viable in roughly Phase 0 + Phase 1 of the plan
below. This section maps the evaluation into this roadmap's terms; the evaluation doc is
the *argument*, this section is the *authoritative work list*. Where an eval item overlaps
existing planned work (flight overlay C/D, #7 manufacturing seam, station assembly seam),
the existing entry stays authoritative and the eval item folds into it rather than
duplicating.

### Workstream E0 — Critical fixes (do before new features)

- [x] **E0.1 File split + concat build** — **DONE 2026-07-10** (see session logs above): slice (a)
      shipped, browser-verified, committed (`963d86f`); slice (b) trimmed cleanup + a bonus
      `TL_CAT_ICON` bug fix also shipped. (user-approved 2026-07-10). Break
      `orbital-ventures.html` into dev modules — proposed: `data.js` (MISSIONS/RESEARCH/
      BODIES/ENGINES/RIVALS/…), `sim.js` (pure state transforms — the harness surface),
      `render.js`, `flight.js` (overlay + drawScene), `phaser.js` (guarded scene hosts),
      `save.js`, `main.js` — loaded in order by a dev `index.html`; a small `build.js`
      concatenates back into the single-file release artifact so "open the file and play"
      distribution is preserved. **Consequences to absorb:** the "How we work → Single
      file" bullet at the top of this doc changes; the harness's `<script>`-extraction
      step points at the concat artifact (or module list) instead; Git Data API commits
      become multi-blob trees (already how we commit — no workflow change); the >1MB
      Contents-API limitation stops applying to the source files. Slice it: (a) mechanical
      split + build script + harness parity at 236/236, zero behavior change; (b) only
      then any hygiene that the split makes cheap.
- [x] **E0.2 Save robustness** — **DONE 2026-07-10** (see session logs above): single-pass
      serialization + load-path unification (a); IndexedDB autosave ring + restore UI + import-safety
      net (b); 5 manual save slots behind "Manage saves…" (c). User-verified in Firefox at each
      slice. 381/381.
- [~] **E0.3 Dirty-flag rendering** — **Slices 0-2 DONE 2026-07-12** (see session logs below): a
      tech-lead planning pass revised the roadmap's original framing (below) — migrating all
      ~158 `render()` call sites to `invalidate(region)` was rejected as over-scoped; see the
      session log for the actual slice plan (0: snapshot harness ✅; 1: region extraction +
      `renderAll()`/`invalidate()` shim ✅; 2: `setHTML()` memoize + focus/scroll fix — the slice
      that actually fixes the named bugs ✅, needs a real-browser check; 3: hot-path-only
      migration, optional, next up; 4: deferred).
      Original framing, superseded: `render()` currently rebuilds all regions from ~136 call
      sites; move to `invalidate(region)` + per-region rebuild with a `renderAll()` escape
      hatch. Fixes focus/scroll loss in re-rendered panels, cuts time-warp GC churn, and is the
      prerequisite for simultaneous-mission ops density. Validate by diffing harness snapshots
      region-by-region.
- [~] **E0.4 Keyboard + accessibility baseline** — slices (a) hotkeys, (b) focus trap, (d) UI-scale
      SHIPPED 2026-07-10 (see session logs above), 491/491. **Slice (c) (reduced-motion +
      colorblind icons):** reduced-motion shipped 2026-08-11 via Gate 6 F6, not as part of this
      slice — see `docs/GATE-6-CONTRACTS.md`. Colorblind-safe redundancy is still not started.
- [x] **E0.5 Unbounded-array audit** — cap rendered log entries (windowed + "show
      older"), decimate metric histories monthly→quarterly after N years, cap/archive
      chronicle. Verify `document.hidden` pauses every RAF loop and sleeps Phaser scenes
      (bloom postFX must not run on hidden canvases). **SHIPPED 2026-07-26 in slices
      (a)+(b); see session logs above.**
- [x] **E0.6 `esc()` all dynamic text in innerHTML template strings** — SHIPPED 2026-07-11 (see
      session log above), tests 561/561, **not yet committed/pushed, needs a real-browser check**.
      Real user-typed surface was blueprint/livery names + import-controlled save fields (company/
      family names, front-page headlines), not a company-name input (none exists). Also fixed a
      genuine `tlStrip()` tag-strip bypass (unclosed tags) along the way.

### Workstream E1 — High-value gameplay (the "is this a product" tier)

- [x] **E1.1 Reactive rival race** — SHIPPED (both slices) 2026-07-11 (see session logs above),
      **not yet committed/pushed, needs a real-browser check**. Schedule variance + poaching were
      already live pre-session (CE1); slice A added contract snatching, budget hearings, and a
      failure→poach-heat link; slice B (rival intel dossier) added a paid one-time unlock that
      projects a rival's *full* remaining-firsts timeline (not just the next goal).
- [x] **E1.2 Flight overlay Slice C** — SHIPPED 2026-07-23 (see session log below). All
      six decision modals now live in the flight overlay; `showAnomalyModal` was the last
      holdout. Slice D (chrome/transition polish) remains open.
- [x] **E1.2 Flight overlay Slice D** — SHIPPED 2026-07-23 (see session log below).
      Fixed visual layering: decision panels at cislunar-start and orbit-start now render
      on top of the phase-transition crossfade instead of under it.
- [x] **E1.3 Procedural contract generator** — SHIPPED (both slices) 2026-07-11 (see session log
      above), 637/637, **not yet committed/pushed, needs a real-browser check**. Comsat block buy,
      crew rotation, deep-space sample return; era-scaled concurrent-offer cap.
- [x] **E1.4 Astronaut identity** — SHIPPED 2026-07-11 (see session log above), 604/604,
      **not yet committed/pushed, needs a real-browser check**. Flight log, memorial wall,
      roster view. Crew assignment tradeoffs were already covered by the trait system.
- [x] **E1.5 Ops friction + trust** — SHIPPED 2026-07-11 (see session log below), 640/640,
      **not yet committed/pushed, needs a real-browser check**. 3 of the 4 sub-items were already
      done (verified, not rebuilt): "why can't I fly this?" explainer (`canLaunch().why`), pad
      turnaround mechanic (`launchPadCap`/`padSlotsLeft`), and the mission econ breakdown
      (`missionNetHTML`). Newly built: the ∏ phaseRel causal chain, now surfaced — Bench reliability
      hover + failure-log detail — plus a pad-slot line on the Bench.
- [ ] **E1.6 Milestone spectacle** — newspaper front pages on firsts; sound pass
      (ambient bed, UI ticks, countdown voice, milestone stingers — WebAudio synthesis
      or small OGG set post-split).

### #73 — Station assembly loop, scoped (2026-07-11)

Tech-lead pass (not implemented yet) found BACKLOG.md's "XL / Deferred seam exists" framing stale: the
economy + UI (STATION_MODULES 6 types, `addStationModule()`, per-facility `fs.moduleList[]`, typed
production, power-starve, port caps, full Station Bench UI incl. dock palette) is real and current,
shipped 2026-07-02 (`5c60c8c`+`0ea922e1`). The one genuine gap: `addStationModule()` is a pure instant
purchase (pay money → module appears, `fs.supply` reset is the only "flight" fiction) — no vehicle
design, launch, reliability roll, or dock event. That's the actual remaining "launch modules, dock" work,
and it's **L, not XL** — it can ride the same synthetic-mission pipeline E1.3's procedural contracts
already proved works (`missionById`, one-shot `m.proc` consumption).

**Design decisions locked in (user, 2026-07-11):**
- **Delivery model = player's choice.** Fly a module yourself (uses your designed vehicle + pad, cheaper)
  OR pay a premium for a "contracted" instant delivery (mirrors the existing resupply fiction) — not an
  all-or-nothing switch.
- **Flight frequency = first-of-type only.** The first Habitat, first Lab, etc. on a given facility flies
  for real; repeat copies of an already-proven module type stay abstracted. Keeps the spectacle without
  turning a 7-module late-game build-out into a chore.

**Slice plan:**
- **Slice 0 — Truth pass (S).** render.js's stale "assembly is deferred" header comment (still says
  STATION_MODULES is an unbuilt seam); the station **pop-out** (`stationStatsHTML`/`stationActiveModule`)
  still renders the old single-sample-module framework view instead of the player's real assembled
  facility — fix to show the actual stack. No SAVE bump.
- **Slice 1 — LEO module delivery is a launch (M).** First-of-type + LEO: "Order module" pays cost, then
  (player's choice) either generates a real delivery mission through the existing bench/launch/overlay
  pipeline, or an instant contracted-delivery upcharge. SAVE bump for pending-delivery state.
- **Slice 2 — Moon/Mars delivery (M).** Deferred `kind:'module'` flight docks on arrival, cloning the
  existing Mars-resupply arrival-pump branch; joins the logistics mishap pool. Note: these are landings on
  a surface base, not orbital rendezvous — may want different framing/art than LEO docking.
- **Slice 3 — Docking as spectacle/decision (M–L).** A real rendezvous+dock phase in the flight overlay.
  **Sequence after E1.2 slice C/D lands** — flight.js is under active churn there, don't race it.
- **Slice 4 — Manufacturing tie-in (S–M, optional).** Module builds occupy assembly-bay units.

**Still open (implementation-time, not blocking further scoping):** launch-failure semantics for a module
aboard (destroyed/insured/retry-launch-only) · real vs. rescaled module payload mass (9–20t modules would
gate stations behind heavy lift — a real balance shift).
**Resolved 2026-08-12:** the cost-double-counting concern above did not materialize —
`flyModuleCost` deliberately excludes the body multiplier when flying yourself, so it isn't
stacked on top of a real launch cost. #74/#75/#76/#77 are all shipped; the "depends on #73"
question is moot.

**Risks:** cost double-counting (see above) · pacing if flights feel mandatory rather than optional ·
progression shift from real payload masses · flight.js churn colliding with the visual-overhaul work.

**Slice 0 (truth pass) DONE 2026-07-11, tests passing, not yet committed/pushed.** New
`stationCurrentView()` (render.js) is the single source of truth for "focused real facility, or the
pre-facility blueprint draft" — `renderStation()` and the station pop-out both read from it now, closing
the actual root cause of the staleness (two independent implementations that drifted apart). The pop-out
(`openStationPopout`) now renders the real assembled stack (`renderStationStackSVG`) + real facility
stats (`renderStationFacilityStats`)/draft stats (new `stationDraftStatsHTML`, extracted from
`renderStationDraft` so it isn't duplicated a third time) instead of a hardcoded sample module. New
`setStationFocus(id)` + `refreshStationPopout()` fix a bug the naive rewire would've had: the facility-
switcher tabs (shared markup between main view and pop-out) used to call `renderStation()` only, so
switching facilities while the pop-out was open would've left it showing the stale one — now it refreshes
both. Corrected the stale `render.js` header comment claiming assembly/economy are still deferred (it
shipped 2026-07-02); flagged (not touched) the fully-dead Phaser `StationScene` class underneath it —
`startStationScene()` is never called, `renderStation()` always takes the SVG path — as a candidate for a
future debloat pass, out of scope for a truth-pass slice. Removed `renderStationSVG()`/`stationStatsHTML()`
since the rewire orphaned them directly (not pre-existing dead code — cleaning up after my own edit, not a
broader sweep). New `test-station-popout.js` (19/19): draft-mode and built-facility-mode pop-out open/
close, focus-switching with the pop-out open doesn't throw and correctly refreshes both views, confirms
the two removed functions are actually gone. Suite 856/868 (same pre-existing unrelated
`test-progress-unify.js` failure). No SAVE_VERSION bump (pure render-layer refactor, no new persisted
state). **Needs a real-browser check**: the pop-out's stack SVG/stats render correctly for both an
existing station and the pre-facility blueprint, and that switching facility tabs while popped out keeps
the pop-out in sync.

**Slice 1 (LEO delivery-as-launch) DONE 2026-07-11, tests passing, not yet committed/pushed. SAVE_VERSION
50.** The first module of a given type on a LEO facility is now a real choice, reusing E1.3's proc-
mission machinery end to end (no new mission/flight pipeline needed):
- **Fly it yourself** (`flyModuleDelivery`) generates a real mission (`proc:true, deliverModule:{facId,
  modId}, reqDv:9400, payload:<real module mass>`), pushed into `state.contractOffers` and auto-selected
  (`selectMission`) — takes the player straight to the bench with it active. Pays only the **base**
  module cost (`stationModuleCost`, unchanged formula) on successful delivery — hooked into
  `finalizeLaunch`'s existing success branch right next to the `m.proc` one-shot-consumption line. No
  money changes hands at commit time (so `canFlyModuleDelivery` doesn't gate on current affordability,
  only research/port-cap — the real cost check happens for real at generation, stored as `m.moduleCost`
  so a later balance patch can't retroactively over/undercharge an in-flight delivery). A failed delivery
  loses the module cost's worth of nothing extra — same as any other failed mission, no bespoke
  destroyed/insured logic needed (this was one of the "open questions" from scoping; resolved by just
  reusing the existing failure convention rather than inventing a new one).
- **Contract delivery** (`contractStationModule`) is the old one-click instant-dock behavior, now priced
  at a `MODULE_CONTRACT_PREMIUM` (35%) markup over base — the "pay to skip the flight" option.
- **Repeats of an already-proven module type are completely untouched** — `addStationModule` (unchanged)
  still fires on one click at the plain base price, no fork. The choice only ever appears for `first`
  (facility body === earth, module type not yet in `fs.moduleList`) modules — verified LEO-only scope
  with a test that a Moon/Mars-body facility's card still shows nothing but the single "Dock module"
  button for every module, first-of-type or not.
- Double-clicking "Fly it yourself" while a delivery is already pending re-selects the existing offer
  (`pendingModuleDelivery`) instead of creating a duplicate. `tickContractOffers` now exempts
  `deliverModule` offers from its normal expiry sweep entirely — a module delivery is the player's own
  committed infrastructure project, not a rotating commercial contract that a client walks away from.
- New shared `dockModuleNow(facId,modId,note)` (sim.js) — the module-list-push/supply-reset/log logic,
  now used by all three docking paths (`addStationModule`, `contractStationModule`, and the
  `finalizeLaunch` success hook) so they can't drift apart from each other.
- Cost-double-counting risk flagged during scoping turned out to be a non-issue for LEO specifically:
  `facilityBodyMult(leo_station)` is exactly 1 (no baked-in delivery premium at the cheapest body), so
  there was nothing to avoid double-charging against — this risk is real for Slice 2 (Moon/Mars, where
  the body multiplier IS an implicit delivery cost) and needs a real design decision there.
- New `test-station-slice1.js` (29/29): pricing (contracted = base × 1.35, fly = base), research/port-cap
  gates match on both paths, offer generation (proc:true, real payload mass, real reqDv, no up-front
  charge, auto-select, no duplicate on re-click), `tickContractOffers` never expires a pending delivery
  even decades past the normal window, a full successful-delivery flow via `finalizeLaunch` (module
  docks, exact base cost charged, offer consumed, no double calendar delay), repeat-of-type dockings
  fully unchanged, and a render smoke-check that the new palette branches (first-of-type choice,
  pending-delivery state) don't throw. Suite 885/897 (same pre-existing unrelated
  `test-progress-unify.js` failure). **Needs a real-browser check**: the two-button first-of-type
  palette card, the pending-delivery message, and actually flying a delivery mission end to end
  (select → design/build a capable vehicle → launch → module appears docked).

**Slice 2 (Moon/Mars delivery) DONE 2026-07-11, tests passing, not yet committed/pushed. SAVE_VERSION 51.**
Investigation found every existing Moon/Mars mission in this game is a real multi-leg "profile" mission
(payload comes from designed crew/lander stages, not a flat number) — there was no existing way to carry
a fixed cargo mass through one. Asked the user: cheap simple-mission reskin (like LEO) vs. a genuine new
"cargo mass through a real profile" mechanic. **User chose the real mechanic** — bumped this from M to L
but produces something reusable beyond this one feature.

- **New mechanic: `m.cargo`** — an uncrewed payload mass carried through every leg of a `.profile`
  mission. Two touch points: `lvPayload()`'s profile branch (`p+=(m.cargo||0)`, so the bench readout's
  Δv/TWR reflects it) and `simulateMission()`'s `stackMass()` closure (so EVERY in-space leg, not just
  the LV liftoff, correctly carries the extra mass through the whole cruise's Δv accounting) — verified
  both independently (an in-space transfer leg's `mass` figure grows with cargo, not just the LV leg's).
- **Lunar delivery** (`days:8`, matching `luna_orbit`): Ascent→TLI→Lunar Orbit Insertion, one-way (no
  Trans-Earth leg — nothing needs to come home). Stays under `DEFER_CRUISE_DAYS`(60), resolves
  synchronously the same turn, exactly like Slice 1's LEO delivery.
- **Mars delivery** (`days:210`, reusing `LOGI_TRANSIT_DAYS.mars`'s existing one-way figure for
  consistency with the abstracted resupply system): Ascent→TMI→Mars Orbit Insertion, one-way. Crosses
  `DEFER_CRUISE_DAYS` — `proceedLaunch`'s EXISTING `missionDays>=DEFER_CRUISE_DAYS` branch automatically
  defers it into `state.activeFlights` with full cruise telemetry / abort-in-cruise / mishap-pool
  eligibility, **with zero new deferred-flight code** — it's a normal ctx-bearing record, resolved on
  arrival via the exact same `pumpFlightArrivals()→beginResolve()→finalizeLaunch()` chain any other
  deferred mission already uses. Slice 1's `m.deliverModule` dock-on-success hook fires identically
  whether the flight resolved synchronously or was deferred and resolved turns later.
- **Deliberate scope boundary**: neither delivery models an actual surface *landing* — both end at orbit
  insertion around the body. This game has no landing/descent simulation anywhere yet (even the
  abstracted Mars resupply system stops at "shipment arrives"), so inventing one just for this would be
  its own separate mechanic; "docking" at a surface base's orbit is the same abstraction boundary the
  existing logistics system already draws. Also deliberately NOT window-gated (unlike the authored Mars
  missions) — payout is 0 either way, so synodic timing has no economic stake here. Both documented as
  simplifications, not oversights.
- **Cost double-counting, resolved cleanly**: new `flyModuleCost(def,fs,md)` strips the body/distance
  multiplier entirely (raw materials + size-escalation only) — the multiplier represents "the cost of
  getting it there," and flying it yourself pays for that trip via a real Δv/cruise-time cost instead, so
  charging the dollar multiplier again would double-count. `contractedModuleCost` (unchanged) still
  includes the multiplier, which now correctly reads as "pay extra for someone else to make that same
  trip" — appropriately pricier for Mars contracted delivery than LEO. Confirmed `flyModuleCost ===
  stationModuleCost` at LEO specifically (body multiplier there is exactly 1), so this is a pure
  generalization — Slice 1's LEO pricing behavior is provably unchanged.
- Extended the `first`-of-type choice (Slice 1's fly/contract fork) from LEO-only to all three facility
  bodies — one condition removed, no other change needed.
- **Found and fixed a real, general test-harness gap while building this**: `pumpFlightArrivals()`'s "is
  a modal open?" guard reads `$('modal').classList.contains('hidden')`, but the harness's
  `getElementById` returns a fresh, memory-less stub per call whose classList is always empty — so
  `#modal` looked permanently "open," silently blocking ANY headless test of deferred-flight arrival
  resolution in this codebase until now (confirmed: no existing test exercised it, only flight
  *registration*). Fixed by special-casing `'modal'` to default to hidden, matching what every existing
  test file already implicitly assumed. This unblocks real arrival-resolution testing for future
  deferred-flight work too, not just this feature.
- New `test-station-slice2.js` (28/28): pricing (fly strictly cheaper than contract at Mars, exact
  multiplier-free formula), offer generation for both bodies (profile-shaped, one-way, correct
  cargo/days), the cargo mechanic proven on both `lvPayload` and every leg of `simulateMission`
  (not just the LV leg), `proceedLaunch`'s defer/no-defer split falling out purely from `days` with zero
  special-casing, and a full end-to-end deferred Mars delivery — register → advance the clock → resolve
  via the REAL production `pumpFlightArrivals()` chain → module docks → offer consumed. Updated
  `test-station-slice1.js`'s now-stale LEO-only assertions (2 checks) to reflect Slice 2's extension.
  Suite 915/927 (same pre-existing unrelated `test-progress-unify.js` failure).
- **Needs a real-browser check**: fly a Lunar delivery end to end (same-turn resolution) and a Mars
  delivery end to end (departs, appears in the cruise telemetry panel, resolves on arrival turns later);
  confirm the bench readout's Δv/TWR genuinely reflects the extra cargo mass while one of these missions
  is active.

**Slice 3 (docking as spectacle) DONE 2026-07-11, tests passing, not yet committed/pushed. No SAVE_VERSION
bump — pure presentation, no new persisted state.** A successful "fly it yourself" module delivery now ends
its flight overlay with a rendezvous + soft-dock beat instead of the generic "ORBIT ACHIEVED" post-flight
card. Deliberately built as a spectacle, NOT a new branch: docking gets no separate success/fail roll — a
flight that already resolved SUCCESS simply docks (the module is already in state via `dockModuleNow` at
resolution; this is the visual payoff of that, not a second gamble). This mirrors Slice 2's own precedent
of not modeling a separate landing/failure mechanic, and keeps the whole feature one abstraction across
LEO/Moon/Mars — the ONLY per-body branch in the entire beat is the backdrop planet's tint (Earth blue /
Moon grey / Mars rust); the station, the approaching module, the berthing geometry and the info panel are
identical for all three. Same generalization move Slice 2 made extending Slice 1's LEO-only fork to all
bodies.

- **`drawDockCard(ct, held)` (flight.js)** — modelled on `drawDepartCard`'s structure (deep-space
  backdrop + a moving craft + a fading info panel + a held Continue affordance), but the beat is an
  APPROACH: the module eases in from the left along a dashed approach corridor, brakes with RCS puffs, and
  captures at cp≈0.82 with an expanding soft-dock ring flash + a steady green contact light, then a tiny
  damped settle. Station drawn from a shared local `can()` capsule helper (horizontal cylinder w/ ellipse
  endcaps, ring frames, top-highlight/underside-shade) reused for both the core and the module; solar wings
  + a berthing node with an open port. Info panel: title flips `RENDEZVOUS`→`MODULE DOCKED` (readout→ok
  colour) at capture; rows STATION / MODULE / ASSEMBLY (post-dock module count).
- **Design call — one Continue button, not `drawDecisionPanel`.** Prior art gave two legitimate idioms
  (the dialog-box decision panel vs. an outro card). This is a spectacle, not a dialog, so it takes the
  outro-card idiom — reusing `drawFlightContinueBtn`'s exact rounded-button + `[Enter]` hint + one-shot
  canvas-click dismissal wiring (the same affordance the depart card and post-flight card already share),
  NOT the console-box framing, which would have boxed the station art behind a dimmed panel.
- **Terminal phase, appended — not a replacement.** New `spec.dock` (built in `finalizeLaunch`'s success
  branch, right where `m.deliverModule` docks) carries the display info. `setupFlightState` (and
  `resumeFlightForDecision`, for the reserve/rescue-mid-cruise case where the spec rides in via its
  `Object.assign`) reserve a `DOCK_CARD_MS`(4600) tail in place of the usual 1200 ms post-flight settle;
  `drawScene` runs the full ascent + orbit/cislunar cruise unchanged, then switches to an `A.phase='dock'`
  beat once `ct>=cruiseDur` — gated strictly on `s.dock`, so no other mission type's ending changes.
  `reentryDur` is always 0 here (deliveries are uncrewed), so the dock beat never competes with the reentry
  cut for that same instant. `endAnim`'s hold check gains a `spec.dock` branch BEFORE the generic
  orbital/cislunar post-flight card (which a delivery would otherwise match), holding on the settled
  soft-dock frame. `beginHandoff` gains a `'dock'` kind: a pure cruise→dock crossfade with no camera zoom
  (a zoom would fight the dock scene's own framing).
- **Uniform across the deferred Mars arrival path with zero extra code.** A deferred Mars delivery resolves
  on arrival through the exact same `pumpFlightArrivals()→beginResolve()→finalizeLaunch()→playMission(spec)`
  chain any deferred flight uses; because `spec.dock` is built in `finalizeLaunch` regardless of sync-vs-
  deferred, the on-arrival overlay plays the same launch→cruise→dock and ends on the dock card — no arrival-
  specific branch needed. (Confirmed in test as a direct `finalizeLaunch` call on a 210-day Mars delivery
  ctx, which is precisely what the arrival pump invokes.)
- New `test-station-slice3.js` (27/27): drives the REAL `animLoop`/`drawScene` on a virtual clock (the
  test-decision-panel pattern), so it's a genuine render-path check, not just spec-builder unit tests —
  proves the `dock` phase is actually entered mid-flight (drawDockCard drew without throwing) and the
  overlay holds on the dock card with a Continue affordance, for LEO (orbital), Moon (cislunar) and Mars
  (the deferred-arrival resolution) deliveries; that `spec.dock` carries the real facility/body/module
  fields; that `totalDur` reserves the `DOCK_CARD_MS` tail; that the module actually docked in state and the
  post-dock count matches; and — the untouched-behaviour guardrails — that a regular non-delivery orbital
  flight gets NO `spec.dock`, keeps its 1200 ms tail, never enters a dock phase and ends on the ordinary
  post-flight card, and that a FAILED delivery neither docks nor gets a dock beat (docking rides on success
  only). Full suite 938/950 — every file passes except the same known, still-deferred
  `test-progress-unify.js` shortfall (unrelated, expected). No SAVE bump.
- **Needs a real-browser check** (headless can't verify the actual pixels): (1) fly a first-of-type LEO
  module delivery (design/build a capable vehicle → launch) and watch the flight end with the module
  closing on the station and soft-docking, Continue button, Earth-blue backdrop; (2) fly a first-of-type
  LUNAR module delivery (same-turn resolution) and confirm the identical dock beat plays over a grey Moon
  backdrop after the cislunar cruise; (3) fly a first-of-type MARS module delivery, let it depart (cruise-
  begins card), run the clock ~7 months, and confirm that when it resolves on arrival the overlay reopens
  and plays through to the dock beat over a rust-red Mars backdrop; (4) confirm a regular ordinary orbital
  mission still ends on the unchanged "ORBIT ACHIEVED" post-flight card (no dock beat leaked in).

**Slice 4 (manufacturing tie-in) is optional/last** and remains unstarted.

## Complete — Generalized vehicle and station docking (D0–D5 shipped 2026-08-15)

Extend #73's module-delivery spectacle into one simulation authority for capsule↔capsule/pod,
capsule↔station, cargo-pod↔station, permanent module attachment, and mission-internal LOR/EOR docking.
The player plans compatible interfaces, a target and rendezvous reserve; the game simulates port
reservation, approach risk, hard dock, transfers and exact vehicle ownership. This is mission-scale
control, not a manual six-axis piloting minigame.

The critical architecture boundary is a new persistent `state.orbitAssets[]` owner for craft that
remain in orbit. `activeFlights[]` stays the transit queue, `facilityModuleList()` stays permanent
station/production truth, and cosmetic `assemblyLayouts` never authorize docking. Visiting berths are
separate from the existing permanent module cap. Docking feeds the existing mission outcome as a named
phase rather than adding a second post-success destruction roll.

D0 compatibility/reservations, D1 mission-internal rendezvous, D2 station visits, D3 persistent
spacecraft, and D4 persistent operations are shipped. Fitted interfaces and
rendezvous guidance freeze into build/launch snapshots; reservations have exact owners/rejection
reasons; LOR/EOR create real operations; and docking is a named reliability/debrief phase whose
anomaly/presentation data comes from the frozen operation. Station crew rotation, resupply and LEO
module delivery now reserve separate visiting berths, apply typed hard-dock transfers and either
return or persist a station-local docked visitor. Launches can now leave exact hulls in canonical
`orbitAssets[]`; station visitors can release into it; and later launches reserve a target interface
before establishing reciprocal capsule/pod/target links. Fleet Registry, Outliner, and Solar Map
surfaces share that collection. D4 retry/undock/refuel/servicing operations live in a durable
`orbitOps[]` command/receipt ledger: existing craft can stationkeep,
wave off, retry, soft/hard capture, undock, relocate and return, with named crew, defined cargo,
propellant and power/data services applied exactly once. Fleet Registry consoles drive those same
records. D5 replaces the generic docking illustration with frozen real actor/target vehicles and the
shared facility assembly scene, adds range/closing-rate/reserve/capture telemetry, persists the first
docking ceremony, shortens proven automated playback, and settles reduced-motion immediately. The
Firefox pass covered capsule/capsule, capsule/station and pod/station; balance stayed unchanged. Full
decisions, state shapes, interaction matrix, protected baselines, tests and non-goals:
`docs/DOCKING-SYSTEM-SCOPE.md`.

### Workstream E2 — Medium (post-EA-gate)

Station assembly + resupply loop: **shipped** (Slices 0-3 of the #73 scoping, plus #74/#75/#76 —
confirmed against source 2026-08-12; see BACKLOG.md #73-76). Only the optional manufacturing-bay
tie-in remains, filed as BACKLOG.md #119. · 3–4 more
committed program forks on the lunar-arch pattern (Mars architecture, crew vehicle
philosophy, propulsion doctrine) · era research-capacity limits · political/media layer
extending mandates · SVG icon set replacing emoji · synergy-prospecting UI ("2 of 3") ·
Steam integration (achievements, cloud) if that route is taken.

### Deferred / noted, not committed

Manufacturing lines (#7 seam — eval agrees it's the right shape, XL cost) · second launch
site · training pipeline · scenarios/ironman · chronicle export · encyclopedia ·
localization scaffold (needs E0.1 first) · mod-lite content packs (needs E0.1 + E0.6) ·
mobile (explicitly out for 1.0; desktop-only, test Steam Deck only).

### EA gate checklist (from the evaluation, verbatim intent)

Reactive rival race live · overlay C/D shipped · procedural contracts · save slots +
export · keyboard + reduced-motion · newspaper milestones · sound pass · SVG icons ·
trailer cut entirely from in-game flight footage.

### Dev/cheat menu for manual testing (2026-07-11)

A dev-only cheat panel so I can fast-forward and manipulate state to test deep-timeline content (station
docking, Mars ops, late-era) without grinding a real playthrough. **Never shown to players** — orange
DEV-styled fixed overlay, unmistakable. **Not yet committed/pushed.**

**Access:** `Ctrl+Shift+D` toggles `#devPanel`. New keydown handler in `shell.js`, guarded exactly like the
`p`/F1–F3 handlers (bails on `!state`, `animState`, `modalOpen()`, `isTyping(e)`). Combo audited unused —
nothing binds ctrl/meta/shift today. `Escape` closes it via a check layered as the FIRST branch of the
existing Escape handler (ahead of modal-close / scene-back, so it can't interfere). `#devPanel` is its own
element in `shell.html` (next to `#animOverlay`/`#modal`), **not** `showModal()` — reusing `#modal` would
make `pumpFlightArrivals()`'s `$('modal')…contains('hidden')` gate think a game modal was open and silently
stall normal flow. Open state is a plain module-level bool `devPanelOpen` (like `techExpanded`/`hubPanel`),
never in `state` — so it can't reach the save.

**Capabilities (all in `shell.js`):** time buttons +1 day/week/month/year/5yr drive the REAL
`advanceDays()`/`advance()` (never a raw `state.year` write); "jump to era" one button per `ERAS` entry via
`devAdvanceToYear()` (12-month batches through `advance()`, no-op if already past); money/rep/science
Add + Set-to (rep floored at 0, no ceiling); `devUnlockAllResearch()` sets every `RESEARCH` id true and
maxes every `TECH_LEVELS[id]` to its real `.max`, then `reconcileResearch()`; `devMaxRep()`=100 (clears
`partnerUnlocked()` gates). Force next launch: `_devForceOutcome` success/partial/loss/strand consumed at
the top of `resolveFlight()` (synthesized via `devSynthOutcome()`, reusing the real
`subsystemReport`/`flightPhaseBreakdown` for `.phases` so the live/reserve/anomaly/rescue chain doesn't
choke; strand is crewed-deep-shaped so `finalizeLaunch`'s `_pendingRescue` branch fires). Force decision
events: `_devForceLiveCall`/`_devForceReserve`/`_devForceWeather` short-circuit `liveCallFlag`/
`deepCallFlag`/`rollWeather` respectively (single-shot). Two presets: **⏩ Fast-forward to late game**
(advance to 2030 via real `advance()`, unlock all, money=2000 ($2B in $M units), rep=100) and **🛰 LEO
station, pre-stocked** (real `foundFacility('leo_station')` + `addStationModule()` docking Lab, Power Truss,
Docking Node). Scope boundary: "unlock everything" removes GATES only — it does NOT found facilities,
design vehicles, or complete missions.

**State-hygiene compromises (called out per the brief):**
- The four force flags are plain module-level vars in `sim.js` (`_devForceOutcome` etc.), NOT `state.*`,
  consumed and reset on first read — same-turn synchronous, never persisted. No `state.*` field was needed
  for any force capability.
- The **LEO-station preset sets `state.completed.crew_orbit=true`** — `canFound('leo_station')` gates on
  that mission being flown, and there's no cheap "real function" to mark it complete without flying, so
  removing the gate is unavoidable to use the real `foundFacility()`. Same spirit as "unlock all removes
  gates." It also tops money to ≥$600M so the real founding/docking charges are affordable.
- **Era/late-game time-skips keep the company solvent** (`devAdvanceToYear()` tops the treasury back to a
  $1B floor before each batch). A pure time-skip earns no income, so decades of overhead would bankrupt an
  early company and trip `gameOver()` mid-jump — defeating the whole point. This mutates `state.money`
  during a jump (a visible, documented side effect). The bare +N time buttons are left pure (no top-up).

**Tests:** new `tests/test-dev-menu.js`, 30/30 — unlock-all (research + leveled tech maxed); forced outcome
changes `resolveFlight`'s kind and is consumed (not sticky); success/partial/strand shapes; forced live/
reserve/weather flags fire + consume; a 12-month jump advances the year AND drains a founded facility's
provisions (proves the real monthly tick ran, not a raw year overwrite); late-game + LEO presets produce a
real facility with real docked modules; open/close/toggle never throws and doesn't mutate `state`. Full
suite: **31/33 test files pass.** The two failures are BOTH pre-existing and unrelated to this work:
`test-progress-unify.js` (known shortfall) and `test-station-slice2.js` (RNG-flaky — its Mars delivery
flight sometimes fails its reliability roll; runs 28/28 or 24/28 across repeats; my force code is inert
unless a dev flag is set, which no other test does).

**Real-browser checklist:** open with `Ctrl+Shift+D` → orange DEV panel slides in from the right; click each
time button and watch the header year/date advance; click an era button; Add/Set money·rep·science and see
the readout update; Unlock all research → R&D tree fully unlocked; Force an outcome then launch a mission and
confirm the forced result; run both presets; `Esc` or ✕ closes it; confirm **nothing** about the panel
appears anywhere in the normal game UI (topbar, scenes, modals).

### Backlog #44 (simultaneous missions) — truth-pass 2026-07-11, no code changed

Eval tagged #44 "Simultaneous missions in flight" as `Backlog`/L-effort. Before building anything, ran a
headless truth-pass (same instinct as #73's Slice 0): launched two DIFFERENT deep-space missions back to
back — a 210-day crewed mission (astronaut a01) immediately followed by a 90-day crewed mission (a02) —
through the REAL `proceedLaunch`→`resolveFlight`→`pumpFlightArrivals` chain, no faked outcomes. **It
already works end to end, 23/23 checks:** both coexist in `state.activeFlights` simultaneously and both
show in the flights panel by name; crew deployment is tracked per-flight via `isCrewDeployed()`, not a
global lock — a01 stays deployed the whole time A is flying while a02 frees the instant B resolves;
arrivals resolve independently in the correct order (B at ~120d, A at ~240d) with no stuck
`_flightResolving` lock, no NaN money, no leftover one-shot contract offers. This was almost certainly
already true since the P1 deferred-flight slices (`state.activeFlights` as an array, `pumpFlightArrivals`
queuing, the crew-slot-freeing comment at `sim.js:3642`) — the eval's tag predates that architecture or
was never re-checked after it landed. Script not added to `tests/` (pure investigative scoping, not a
regression guard on new product code) — worth promoting to a real test file if #44 gets picked up for
real UX work rather than re-verified from scratch.

**Follow-up UX scoping same day, then CLOSED — no build planned.** Checked whether "ops density" UX
(surfacing/managing several concurrent missions) was still a gap on top of the verified engine plumbing.
It isn't: the manufacturing build queue + hangar (`queueBuild`/`tickBuildQueue`/`hangarList`/
`launchFromHangar`, parallel build slots = Assembly Bays level) already let you build and fly multiple
vehicles independent of one being mid-cruise; the Outliner (`renderOutliner`) already merges build-queue
progress and every in-flight mission into one strip; the Command Center "◈ In flight" card and the
`🛰 Missions in flight` modal (`flightsPanelHTML`) already list every concurrent flight by name with its
own recall button. **#44 is closed as fully covered by existing systems — not an L-effort item, not
worth new work.** One narrow, deliberately-unscheduled watch-item: the Outliner/CC card cap themselves
(`slice(0,8)`/`slice(0,3)`) so at very high late-game concurrency some items could silently fall off the
visible list with no "+N more" affordance — noted here, not built, revisit only if actually observed in
play (now directly testable via the dev menu's late-game preset).

## E3 — Part-Based Vehicle Bench (2026-07-16, scoped) — EPIC

**Vision.** Replace the slider-driven stage bench with a KSP-VAB-style 2D part builder: drag parts
from a categorized palette onto a rocket, parts have real attach nodes and physical footprints,
stages are *inferred* from decoupler placement, and every part carries real mass/drag/thermal/power
stats that feed the existing Δv/TWR/reliability physics. Parts-as-truth; the old `state.stages`
slider skeleton is retired.

**User-confirmed direction (all maximalist):** drag-and-drop free placement · deep per-part physics ·
all four categories (structural, propulsion, avionics, payload) · parts are the source of truth
(decoupler defines a stage) · physical 2D with real nodes (you can build something that won't fly) ·
full replacement of the old bench · symmetry tool + live per-stage Δv + snap-to-node ghost preview as
must-have UX · auto-inferred staging with an editable stack.

### Sequencing — DISAGREEMENT FLAGGED
The user chose "everything at once, cut over when complete." **I've scoped it as parallel-behind-a-flag
instead**, and recommend that override for one concrete reason: `computeVehicle()` (sim.js:3515) is a
30+-line physics contract that multiplies in tank materials, doctrines, fleet heritage, recovery
refurb, families, foundry/cadence/material-market factors, difficulty, and home-field discounts. The
flight animation renders from `state.stages`. Every saved design + vehicle family serializes
`state.stages`. A big-bang cutover means all four (physics, save, flight anim, UI) are broken
simultaneously with no green state for weeks — the textbook rewrite-that-rots. Parallel-flag reaches
the identical end state, always shippable, and lets us diff new-vs-old physics numerically before
retiring the old path. **If the user reaffirms big-bang after reading this, slices still apply — only
the flag + coexistence window drop.**

### Data model (foundation, slice 0)
- `PART_DEFS`: id, category, name, era/research gate, footprint (w×h in bench units), attach nodes
  (top/bottom/radial with sizes — a node has a diameter class, parts only connect same-class), and a
  `phys` block: dryMass, propMass (tanks), thrust/isp (engines), dragCoeff+crossSection, thermal
  (ablator/heat tolerance), powerGen/powerDraw, crew, controlAuthority (avionics/RCS), science.
- `state.build`: a part graph — `{parts:[{id, partDefId, x, y, rot, symMirror}], links:[{parent,
  child, node}], root}`. Replaces `state.stages`/`boosters`/`transfer`/`descent`/`ascent`.
- Stage inference: walk the graph from root; each decoupler boundary starts a new stage; produce the
  same `{stages:[{prop,engines,dryMass,...}]}` shape `stackPerformance()` already consumes, so the
  **physics core is reused, not rewritten** — the part graph is a new front-end that emits the old
  intermediate representation.

### Slices
- **E3.0 — Part data + graph model + stage inference** (M/L). `PART_DEFS` for a minimal viable set
  (1 tank, 1 engine, 1 decoupler, 1 capsule, 1 nosecone); `state.build` graph; the
  graph→stage-IR→`stackPerformance` bridge. Headless-testable with zero UI: assert a hand-built graph
  produces Δv within tolerance of the equivalent old slider design. **This slice is the whole risk** —
  if the bridge reproduces old physics, everything else is UI.
- **E3.1 — Read-only bench render** (M). Draw `state.build` as a 2D SVG rocket (reuse the flight-anim
  vehicle-drawing vocabulary); no editing yet. Per-stage Δv/TWR readout overlaid on the rocket.
  Behind `BENCH_V2` flag; old bench still default.
- **E3.2 — Drag-drop editing** (L). Palette (4 category tabs, search); drag part → snap-to-nearest
  valid node with ghost preview; attach/detach; delete. Node-class validation (hard block on
  mismatched diameters; soft warn on questionable structures like too-heavy-on-top). Physical
  footprint collision.
- **E3.3 — Staging + symmetry** (M). Auto-infer stage order from decouplers; editable stage stack
  (drag to reorder fire sequence, both auto+manual per user). Symmetry tool (2×/3×/4× radial mirror
  for boosters/RCS).
- **E3.4 — Physics depth wiring** (M). Feed the new per-part stats the old model didn't have —
  aggregate drag from actual cross-section/part drag, thermal from ablator coverage, power balance,
  control authority vs. gimbal/RCS — into reliability/flight. This is where "deep physics" earns out.
- **E3.5 — Save migration + cutover** (M). `SAVE_VERSION` bump: migrate every saved `state.stages`
  design + vehicle family to an equivalent `state.build` graph (auto-generate a linear stack from the
  old stage list). Flight animation reads the new graph. Retire the old bench + slider code. Flip
  `BENCH_V2` on by default. **Only after E3.0–E3.4 are green and physics diffs match.**
- **E3.6 — Polish** (M/S, optional). Part tooltips w/ historical flavor (reuse the engine-heritage
  voice), blueprint/schematic view toggle, part-count/mass budget readouts, undo/redo.

### Non-negotiables carried from the existing design
- Validated physics: E3.0's bridge must pass a numerical-equivalence harness vs. old designs before
  any cutover. Headless Node validation before "done", as always.
- Historical flavor per part (engines already have heritage voice; extend to tanks/avionics).
- Dark engineering-instrument theme; 2D is fine and wanted here.
- Save-forward: the migration is one-way (old→graph) and gated behind the version bump.

### Open questions for build time (not blocking scoping)
- Radial vs. purely stacked attach in v1 of E3.2 (radial is needed for boosters but adds real
  collision complexity — may push full radial to E3.3 with symmetry).
- Whether descent/ascent lander stages become just "more parts" or keep a guided sub-flow (the
  multi-leg lunar/Mars profiles depend on them).

**Size:** epic (6–7 slices, several L). Biggest single item in the backlog. **No work started.** E3.0
is the make-or-break; recommend building that as a standalone proof before committing to the rest.

## E4 — 3D Viewport + Deeper Orbital Mechanics (2026-07-18, scoped) — EPIC

Full scoping doc: **`MIGRATION.md`** (repo root). Grew out of a user question about
porting the game to C++/Python/Godot for better orbital mechanics, individual ship
tracking, and 3D graphics — reconciled against actual ROADMAP status (E0.1 split,
Fleet Registry #115, the 2026-07-17 physics-realism pass) into the plan below rather
than a platform port. No monolith to escape, no performance wall; this is new
features on the existing zero-dependency web build, not a migration.

**Resolved decisions:** 3D renderer is **Three.js**, integrated the way Phaser 3
already is — pinned CDN tag (`three@<pinned>`), an ESM→global shim so classic-script
code can use it, all calls guarded with a 2D-map fallback. Orbital-mechanics depth is
**A1 + A2**: real on-rails Keplerian planet positions first (replacing the M3b-i
synodic approximation), then orbital-element gameplay added as opt-in decision-bearing
slices (phase-angle window quality, rendezvous/phasing, extended plane management),
following the #inclination slice template exactly — no full n-body/Keplerian ship
propagator (explicitly out of scope; the design's physics-only-where-decision-bearing
rule rules it out).

### Sub-workstreams

- **E4.0 — Harness: seedable RNG.** Pre-req, not glamorous. The 2026-07-17 session log
  flagged the harness has no seedable RNG, which already flaked `test-station-slice2`
  and hid a latent `dockModuleNow` crash (module delivery resolving after its target
  facility was decommissioned mid-cruise). Needed before E4.1's time-advancing
  propagation tests can be deterministic. *Sonnet.*
- **E4.1 — Truthful planetary ephemeris (A1).** Kepler's-equation on-rails planet
  positions, replacing the synodic approximation. Headless-tested against real
  2026–2033 Mars transfer-window dates. *Heavy model (math core).*
- **E4.2 — Three.js integration plumbing.** CDN tag + ESM→global shim + guard pattern
  (mirrors Phaser). 3D tab inits on first open, not at boot (module script is async).
  *Sonnet.*
- **E4.3 — 3D scene: camera + solar-system rendering.** Sun/planets on E4.1 positions,
  orbit ellipses, pan/zoom/focus-on-body. Scene-graph math (positions, camera
  transforms) is headless-testable; visual feel is NOT — needs a real-browser playtest
  pass before the 3D tab ships default-on (same discipline as BENCH_V2). *Heavy design
  → Sonnet features.*
- **E4.4 — Persistent ship identity (B).** Narrow gap: Fleet Registry #115 already
  tracks active flights/facilities/depot/programs/astronauts; this adds durable hull
  identity + flight history + reuse count that exists *between* missions, reusing the
  #115 collector shape. Save-versioned, additive. *Heavy design → Sonnet wiring.*
- **E4.5 — Ships as tracked 3D markers.** Wires E4.4 registry entries onto the E4.3
  scene. *Heavy seam → Sonnet.*
- **E4.6 — A2 orbital-element gameplay slices.** One opt-in decision-bearing mechanic
  at a time; each gets its own identity-guarantee test (no existing mission's numbers
  move), per the inclination template. *Heavy per slice.*
- **E4.7 — Flight animations into 3D; retire 2D canvas paths.** Includes folding the
  still-unstarted unified flight overlay Slices B (cruise-begins outro), C (in-overlay
  decision panels), D (polish) directly into 3D — decided 2026-07-18, no 2D versions
  built first since none of B/C/D exist yet. Slice A (pad phase, already shipped in 2D)
  migrates in this step too. *Sonnet + heavy at overlay-integration seams.*

**Status:** E4.0 shipped 2026-07-18 (below). E4.1 (truthful planetary ephemeris) is next up.


## Planned — Solar Map SM6: advanced navigation and spatial context (scoped)

Folded in from the retired `SOLAR-SYSTEM-MAP-ROADMAP.md` (2026-07-28) — SM1–SM5 from that file shipped
2026-07-26 and are recorded in `ROADMAP-HISTORY.md`; SM6 was the only phase still `[ ]`. Continuation
of the Solar Map utility pass above (D1–D4 shipped; this is the next layer: reducing disorientation
once zoomed deep into a planetary system).

**Goal:** Reduce disorientation when zoomed deeply into planetary systems.

- [ ] **SM6.1 — Breadcrumb navigation.** Clickable context such as `Solar System › Earth System ›
  Moon`. Breadcrumb actions use camera presets/fitting rather than hard-coded teleports.
- [ ] **SM6.2 — Optional overview locator.** Evaluate a small system locator only when deeply zoomed.
  Prefer a lightweight overlay over a second Three.js scene or renderer. Show camera target/current
  region, not a misleading linear miniature.
- [ ] **SM6.3 — Scale communication.** Keep numeric AU, distance, and light-time readouts. Add a clear
  note that orbital distance is compressed and body radius enhanced. Do **not** add a universal linear
  scale bar — the scene-to-AU mapping is nonlinear and the D2 review above explicitly rejected it.

**Suggested test:** source guards for breadcrumb/locator state; extend existing map3d test coverage
rather than starting a new suite.

**Protected baseline — do not regress:** D1–D4 empire-overlay/scale/orientation/time-scrubber work,
the reparented single Three.js/WebGL scene (`pauseMap3D()`, `remountMap3D()`, `disposeMap3D()`,
`ovMapDiag()`), 2D fallback on startup/tick/context-loss, and `#mapPopStage{min-width:0}`.

**Explicitly out of scope:** gameplay simulation values, mission definitions/gating, save schema,
economy/R&D/personnel/contracts/facilities/rival logic, the flight renderer or Cape scene.

**Slice discipline (applies to all map work, not just SM6):** claim the slice in `CLAUDE.md` STATUS
before editing; re-pull `main`; edit `src/`, never generated `orbital-ventures.html`; add one focused
test where logic can run headlessly; run that test, then `node build.js`, then `node --check
build/game.js`, then the full suite and `git diff --check`; browser-verify Firefox for layout/
rendering slices via `ovMapDiag()`; record the completed slice in `ROADMAP-HISTORY.md`.

Model tier: SM6.1 and SM6.2 are mechanical/wiring (lighter tier appropriate); SM6.3's wording and any
visual-legibility judgment calls benefit from the heavier tier, same split as D1 vs. D2–D4 above.

## Planned — #118 Seeded deterministic RNG for the simulation layer (scoped 2026-07-28, not built)

Filed out of the 2026-07-28 full-code refactor review. The ROADMAP note under the inclination work
says *"the harness has no RNG seeding at all — worth a small harness addition."* That understates what
exists and overstates how small the change is, in opposite directions.

**What already exists.** `mulberry(seed)` and `hashStr(s)` are in `src/shell.js:440-441` — a complete
seedable PRNG, already used ~15× in `render.js` for deterministic visuals (star layers, crew scatter,
iso props, twinkle). The primitive does not need writing.

**What doesn't.** `src/sim.js` makes **46 raw `Math.random()` calls** against only 8 `rnd()` calls.
Gameplay-critical draws — setback rolls (432/475/477), logistics mishap selection (530/531), telescope
discovery + fault (683/694), fuel-price walk (871) — all run off the global unseeded stream. Because
everything is one concatenated scope with hoisted function declarations, `sim.js` can reach `mulberry`
at call time despite loading first, so no build-order change is needed.

**Why it is NOT harness-only.** Reseeding changes the *order and count* of draws. That is precisely the
mechanism behind the existing `test-station-slice2` flakiness (its unseeded Mars e2e advances 8 months
through random econ/logistics events, so any change to draw counts flips it). Converting the call sites
will move outcomes in existing saves and in every time-advancing test. Treat it as a balance-affecting
change with a full-suite reseat, not a cleanup.

**Why it is worth doing.** Two Deferred backlog items are blocked on it and become cheap once it lands:
**#94 Ironman mode** and **#95 challenge scenarios with fixed seeds + par scores**. It also makes every
time-advancing e2e test reproducible, which would have made the `dockModuleNow` defect (found in the
same review) deterministic to reproduce instead of intermittent.

**Suggested shape.** Slice 1: a seeded `rnd()` funnel + `state.rngSeed` persisted (SAVE_VERSION bump,
lazy-defaulted from `Date.now()` on legacy load so existing saves keep behaving randomly). Slice 2:
convert `sim.js` call sites in batches, re-baselining tests per batch. Slice 3: expose the seed in the
UI and build #95 on top.

Model tier: slice 1 is mechanical; slice 2 needs judgment about which draws are gameplay-meaningful vs.
cosmetic and how to re-baseline balance, so it wants the heavier tier.

## Planned — Tier 0 playability pass: boot weight, desktop breakpoint, first-contact clarity (scoped 2026-08-04)

Filed from the two-critic playability review (2026-08-04). Three small, independent items — sequenced
first because nothing else in that review matters if players bounce before they get past the shell.

### 0.1 — Stop the dev build and git history from carrying the texture embed [SHIPPED 2026-08-04]

`build.js`'s `embeddedTextureScript()` inlines ~16.6MB of base64 planet/cape textures into **both**
`orbital-ventures.html` and `index.html`. The release build needs this — it's opened via `file://` for
personal use, and Firefox can refuse `THREE.TextureLoader`'s separate image fetches under `file://`,
leaving black planets (the comment in `build.js` documents this deliberately). `index.html` (the dev
build) doesn't share that constraint and doesn't need the embed.

Confirmed with Shamus (2026-08-04): boot weight isn't currently a felt problem (personal, local use) —
this is scoped down accordingly. No lazy-load/deferred-inject work; no texture recompression. Just:

- [x] `index.html` drops the texture embed entirely; its `map3dPhotoTexture`/`cape3dTexture` calls
  already fall back to plain `assets/*.jpg`/`.png` relative URLs when `window.__OV_TEXTURE_DATA__` is
  absent (`src/render.js:5953-5962`, `:1896-1903`) — no code change needed there, only `build.js`'s
  `createBuildArtifacts()` no longer passing `textureScript` into `devHtml`.
- [x] `orbital-ventures.html` keeps the embed unchanged (`file://` safety net stays).
- [x] `.gitignore` added for `orbital-ventures.html`, `index.html`, `build/game.js` — all three are
  fully reproducible via `node build.js`; the actual save/progress lives in browser `localStorage`
  (`src/save.js`'s `writeSave()`/`SAVE_KEY`), never in these files, so untracking them risks nothing.
  `git rm --cached` (not `rm`) so the on-disk files survive for local play.

**Explicitly out of scope:** rewriting `.git` history to reclaim the existing ~109MB — confirmed
low-priority (repo size isn't currently a problem); revisit only if that changes. Texture
recompression/resolution reduction — deferred, no felt problem to justify it right now.

**Protected baseline — do not regress:** `orbital-ventures.html` must keep working standalone via
`file://` with all textures present (verify by opening it directly, not just `index.html` over a dev
server). The Map3D/Cape3D texture fallback path (`MAP3D_TEXTURE_ASSET`/`CAPE3D_TEXTURE_ASSET`) must
keep working un-embedded for `index.html`.

**Suggested test:** a small build-output assertion (extend `test-build-parity.js` or add alongside it)
that `index.html` does NOT contain `__OV_TEXTURE_DATA__` and `orbital-ventures.html` DOES.

Model tier: mechanical — lighter tier appropriate.

### 0.2 — Desktop breakpoint for the persistent 3-column shell [SHIPPED 2026-08-04]

Correction to the original playability-review claim of "zero `@media` rules" — `src/shell.html` already
has 6+ breakpoints (880/900/980/560/720/760px). The actual gap: `.scene-shell`'s persistent
`--cc-rail-width:380px` left/right rails have no intermediate step between full width and the 880px
collapse-to-single-column — so a ~1100-1280px browser window (a common laptop viewport) gets the full
380+content+380px layout squeezed into insufficient space instead of gracefully narrowing first.

- [x] Add one `@media` tier around ~1100-1200px that narrows `--cc-rail-width` on **both** left and
  right rails (confirmed with Shamus — not a right-rail-drop approach) before the existing 880px
  single-column collapse.

**Protected baseline — do not regress:** the existing 880px single-column collapse and all
component-level breakpoints (560/720/760/900/980px) stay exactly as they are; this adds one step
above them, it doesn't replace anything.

**Explicitly out of scope:** any new mobile/narrow-viewport support below the existing 880px collapse;
this is a laptop-width fix only.

**Suggested test:** none needed if this stays CSS-only (no headless DOM layout testing in this harness)
— verify visually in Firefox at 1150px, 1280px, and 1366px viewport widths per the existing
browser-verification convention for layout slices.

Model tier: mechanical CSS wiring — lighter tier appropriate.

### 0.3 — Header/readout tooltips for jargon-cold stats [SHIPPED 2026-08-04]

Split from the first-launch-checklist idea (confirmed with Shamus, 2026-08-04) — different risk profile,
shouldn't block on checklist-content design work. This slice is tooltips only.

- [x] Add `title=` attributes to the header stat blocks in `src/shell.html` (`stMoney`/`stRep`/`stSci`/
  `stMarket`/`stRoyalty`/`stPassive`/`stInfra`/`stDepot` and siblings) — currently zero tooltips on
  these despite the adjacent time-control buttons (`tArrowDay` etc.) already using the pattern.
- [x] Add `title=` to the bench Δv/TWR readout in `src/render.js` (`:5337` Δv figure, `:5343` Liftoff
  TWR) — dynamically generated markup, not static, so this is a template-string edit not a shell.html
  edit.

**Explicitly out of scope:** the first-launch checklist (separate future entry, needs Shamus's design
input on the actual steps — not to be invented unilaterally); any other jargon beyond Δv/TWR/rep/⚛
unless it's found to need one while doing this pass.

**Suggested test:** `tests/test-header-tooltips.js` — source-guard test (reads `src/shell.html` and
`src/render.js` directly, same pattern as `test-scene-shell-contract.js`) confirming every listed
stat and the Δv/TWR readout carry a non-empty `title=`. Content is caught by a small live-game find
while writing the copy, not by this test: the "Market" stat originally read as if it were about
propellant pricing — it's actually active economy events (booms/downturns), which was checked
against `renderMarketStat()` before writing the final tooltip text.

Model tier: mechanical — lighter tier appropriate.

## Planned — Tier 1 playability pass: make the existing flight drama land (scoped 2026-08-04)

From the two-critic playability review (2026-08-04). Tier 0 shipped the gating fixes; this tier
targets the review's highest-confidence shared finding — that the moment of maximum drama (a flight
resolving) has less felt weight than the simulation depth behind it deserves.

**Important correction to the review's own framing.** The review claimed the in-flight decision system
needed building. It does not — scoping found it substantially complete: `openFlightForDecision()`
(`src/flight.js:1297`) already backs six live decision points, including a weather go/no-go hold at
T-31s, a **live abort / press-on call on a marginal subsystem before the outcome is revealed**
(`showLiveCallModal`, CE5(b) — this is precisely what the review proposed as new work), orbital
maneuver go/no-go trading real Δv margin, and the anomaly hook. Failure is already subsystem-attributed
with per-cause narrative (`resolveFlight`'s `storyMap`). Tier 1 is therefore **not** "build a decision
system" — it is three narrower gaps in a system that already works.

### 1.1 — Expand the in-flight anomaly pool (3 → 10) [SHIPPED 2026-08-04]

`MISSION_ANOMALIES` (`src/sim.js`) holds exactly three entries: stuck solar array, life-support leak,
terminal guidance radar. `rollMissionEvents()` picks uniformly from those eligible, so across a
158-year campaign the same three recur constantly. The *mechanism* is good (real branching options,
`opsLuck()`-modified odds that mission-controller staffing improves, genuine payout/rep/outcome
consequences, a safe option always present) — there is simply not enough content in it.

- [x] Add ~7 entries following the existing shape exactly: `{id, title, when(ctx), detail,
  options(ctx)}` returning `{payoutMult?, repDelta?, outcomeOverride?, log}` from each option's
  `resolve(rng)`. Historically-grounded candidates (confirmed with Shamus — historical framing is
  wanted): thruster runaway / stuck-on attitude control (Gemini 8), guidance-computer alarm during
  descent (Apollo 11 1202/1203), thermal-control loss requiring an improvised shade (Skylab parasol),
  comms blackout across a critical burn, docking latch failure, transfer-stage propellant leak,
  micrometeoroid strike.
- [x] `when(ctx)` predicates must gate on capability, not just mission shape — a docking-latch anomaly
  must not fire before docking research exists. Gate against `state.research` where the scenario
  presupposes a capability.

**Balance-neutrality (by construction):** `ANOMALY_CHANCE_BASE` and the crewed/deep/rehearsal/
controller modifiers in `rollMissionEvents()` are NOT touched. Anomaly *frequency* is unchanged; only
*variety* increases. Any change to firing rate would be a separate, deliberate balance decision.

**Protected baseline — do not regress:** the existing three anomalies' text, odds, and options;
`opsLuck()`/`ctrlAnomScore()` staffing effects; the `_pendingOps`/`resolveAnomaly` flow and its
`_priorOrbitOps` merge with a preceding orbital-maneuver decision; the always-available safe option
convention (every anomaly must keep offering a choice that doesn't gamble the crew).

**Suggested test:** new `tests/test-anomaly-pool.js` — every entry has a unique id; `when()` and
`options()` never throw for a representative spread of contexts (crewed/uncrewed, profile/orbital,
short/long duration); every entry yields ≥1 option in at least one context; no option's `resolve()`
throws; research-gated entries return false when the gating research is absent.

### 1.2 — Near-miss attribution on successful flights [SHIPPED 2026-08-04]

`resolveFlight()` rolls every subsystem independently (`for(const s of rep.subsystems){ if(Math.random()
>s.rel) failed[s.key]=s; }`) and, on a clean success, sets `subsystem:null` and discards the roll data.
That data is exactly the material for the feedback the review found missing: the player never learns
which subsystem nearly killed them, so reliability investment never produces a felt moment.

- [x] Capture, among surviving subsystems, the narrowest margin (`s.rel - roll`) and carry it on the
  outcome. Surface it in the post-flight log naming the subsystem and how close it came.
- [x] **Near-miss-only, not every-success** (confirmed with Shamus 2026-08-04): fire only when the
  smallest margin falls under a threshold constant, starting at **0.05**. With per-subsystem
  reliabilities typically ~0.95 across 5-7 subsystems this fires on roughly 1 in 4 successful flights
  — an event rather than wallpaper. Single tunable constant; revisit after playtest.

**Honest scope limit — do NOT promise research-node attribution.** The review's original framing
("the QA program you funded is why this held") is not deliverable as stated: reliability is aggregated
from research, engineer team score, QA level, test campaigns, era and weather penalty into a single
`R` (`effectiveReliability`) *before* `subsystemReport()` splits it per-subsystem by weight. There is
no seam that attributes a surviving margin to a specific investment. Deliverable is subsystem + margin
("Structures held — two points from a max-q breakup"), which is honest and still lands. Anything more
would require inventing a causal chain the math does not contain.

**Balance-neutrality:** read-only. The rolls, the governing-failure priority pick, and the outcome
selection are all unchanged — this only stops discarding a number that is already computed.

**Protected baseline — do not regress:** `resolveFlight`'s outcome selection and `∏ phaseRel = R`
invariant; `devSynthOutcome`'s forced-outcome dev path; existing failure `story`/`subsystem`
attribution.

**Suggested test:** extend flight/outcome coverage — a forced high-reliability success with a stubbed
RNG placing one roll just inside its threshold produces attribution naming that subsystem; a roll
comfortably clear of every threshold produces none; attribution never appears on a failure outcome.

### 1.3 — Third Chronicle scoring bookend at 2060 [SHIPPED 2026-08-04]

Scoring ceremonies currently fire at `SCORING_YEAR=1990` (campaign year 48 of 158) and
`SCORING_YEAR_2=2100` (year 158) — a 110-year stretch with no scored milestone, across what the review
identified as the campaign's weakest pacing zone. 2060 confirmed with Shamus; it aligns with the
Interplanetary era boundary (`ERAS`, `from:2060`).

- [x] Mirror the existing `SCORING_YEAR_2`/`state.eraScored2` pattern exactly: a third constant, a
  third independent one-shot flag, a third `showChronicle()` mode string and heading.
- [x] `SAVE_VERSION` bump (58→59) documenting the additive field, per this codebase's convention.

**Correction to this entry's own scoping, made before implementing.** The bullet above originally
required that "a save already past 2060 does not retroactively fire the ceremony on load." That is
NOT how `SCORING_YEAR`/`SCORING_YEAR_2` actually behave, and it cannot be built without contradicting
them: `state.eraScored2` is simply `undefined` on any save from before it existed, so a save already
past 2100 fires that ceremony once on its next check — there is no way to distinguish "just crossed
the year during play" from "loaded already past it," because both produce identical state. Building
a skip-guard for 2060 alone would make it behave differently from its two siblings for no reason.
Shipped matching era/era2's real behavior instead: all three bookends fire once each, in year order,
whenever their year is first reached or already passed. Verified in `test-chronicle-bookends.js` by
jumping a fresh save straight to year 2150 and confirming all three fire in chronological order.

**Protected baseline — do not regress:** both existing bookends fire exactly once each, independently
of the new one; the `retire` mode and legacy-grade scoring are untouched.

**Suggested test:** `tests/test-chronicle-bookends.js` (new — the mechanism had ZERO prior coverage
for any of its three bookends before this slice, so this backfills 1990/2100 as well as 2060): each
bookend fires once and only once, does not re-fire on repeated checks, a save jumping straight past
all three fires all three in year order, `showChronicle()` accepts every mode without throwing, the
era3 heading/footer render correctly, and the continue/retire button branch's source includes 'era3'.

**Explicitly out of scope for all of Tier 1:** anomaly *frequency* tuning; any change to the rocket
equation, reliability model, or outcome-selection math; new flight-overlay decision *types* beyond the
anomaly pool (the six existing hold points are sufficient); Tier 2's calendar/progression coupling.

Model tier: 1.1 is the bulk and is creative/balance judgment (scenario framing, resolve odds, gating
predicates) — heavier tier. 1.2's threshold and message wording want the heavier tier; its wiring is
mechanical. 1.3 is purely mechanical — lighter tier appropriate if taken alone.

## Planned — Tier 2 "close the visibility gap": ship what's built, surface what's hidden (scoped 2026-08-04)

From the second critical review (2026-08-04, Architect / Ranger / Adjudicator). Its central finding
supersedes the first review's framing:

> **Orbital Ventures is not short of systems. Its best systems are dark.**

Evidence for that claim, all found by reading source rather than assuming: the flight decision system
was already substantially complete when the *first* review proposed building it. The rival simulation
is a genuine economic model — capital accrual, momentum, market crowding from the player's own passive
contracts, momentum-and-capital destruction when the player beats a rival to a first, rival disasters,
historical anchor years with pull-in floors — and it surfaces to the player as a single word plus a
"Deep view →" button. The crisis system the first review demanded be built already exists. And the
entire E3 part-builder epic is complete, tested to 207 checks, and **switched off**.

Sequencing follows from that: Phase A ships and surfaces what exists (highest leverage, lowest cost),
Phase B expands the one system that already does what the late game needs, Phase C takes on the
structural coupling problem — which is real, but bites at hour 20, and nobody reaches hour 20 through
a UI that hides its best work.

### A1 — Browser-playtest and enable BENCH_V2 [NOT STARTED — REQUIRES SHAMUS, NOT CLAUDE]

`parts.js:18` still reads `const BENCH_V2 = false`. The drag-drop part builder is the single most
player-visible unshipped thing in the codebase. E3.0's numerical-equivalence harness already proved
`buildToStageIR` matches the slider physics core, and `state.stages` remains source of truth with
`state.build` derived — so this is a **playtest gate, not an engineering one**.

This sandbox has no browser and cannot download one (network is allowlisted to package registries),
so Claude cannot close this item. It needs a real session at a real browser.

- [ ] Playtest against the E3.6 checklist already in ROADMAP.md: palette drag → snap-to-node, ghost
  preview, detach/delete, diameter hard-block vs. soft structural warn, footprint collision, symmetry
  tool, undo/redo, blueprint toggle, per-stage Δv/TWR overlay correctness against a known design.
- [ ] Verify a migrated pre-E3.5 save renders an equivalent graph and flies identically (the
  migration-parity test covers the numbers; this covers what it *looks* like).
- [ ] Flip `BENCH_V2` to true, rebuild, re-run the full suite, confirm `renderPartsBench()` is reached
  and the old bench is cleanly hidden (`render.js:625`).

**Protected baseline:** `state.stages` stays source of truth; `state.build` stays derived/regenerable.
If playtest goes badly the flag flips back — that is the entire point of it being a flag.

Model tier: the playtest is human work. Any fixes it surfaces should be scoped per-bug afterward.

### A2 — Promote the rival simulation out of its modal [SHIPPED 2026-08-04]

The Command deck currently renders the top three rivals as `flag · name · threat-pill` and nothing
else (`render.js:3438-3450`). Everything that makes the rival system interesting is invisible:
`rivalFullProjection()` already computes each rival's projected claim year for every remaining first;
`rivalCrowdFactor()` already quantifies how much the player's passive contracts are slowing them;
`denyRivalGoal()` already logs momentum destruction when the player wins a race.

- [x] Surface, on the Command deck rival strip: the rival's *next* goal, its projected year (from
  `rivalFullProjection()`), and — where the player has a live claim on the same mission — the margin.
- [x] Show the player's own drag on the market: a line reading how much `rivalCrowdFactor()` is
  currently slowing rival accrual, so contract-signing reads as a competitive act, not just income.
- [x] Keep the intel gate honest: `rivalIntelOwned()` currently gates the *full* remaining timeline.
  The next goal + projection should respect that gate — surfacing the immediate race is fine, but
  handing over the full projection for free would devalue a purchase the player can already make.

**Protected baseline — do not regress:** `rivalIntelOwned()` must still gate `rivalFullProjection()`'s
full timeline; the "Deep view →" modal keeps everything it has today; no change to rival math.

**Explicitly out of scope:** any change to `RIVAL_*` tuning constants, `denyRivalGoal`, crowding, or
projection math. This is a window onto the simulation, not a change to it.

**Suggested test:** `tests/test-rival-strip.js` (new, 22/22) — the strip renders next-goal name and
projected year using the real `rivalProjectedYear()` accessor; an exhausted rival falls back to "all
goals claimed" rather than blank output; critically, the strip never leaks any goal beyond the free
pending one (indices 1+ of `rivalFullProjection()`) whether or not intel is owned — confirmed the
scoping note's assumption was backwards: `rivalProjectedYear()`'s own code comment establishes the
PENDING goal is already free for every player, and only the REST of the timeline is intel-gated, so
docking the strip's free line required no gate logic of its own, only reuse; `rivalCrowdFactor()`'s
displayed figure and contract count match the computed values exactly, the line is absent at factor 1,
and the count pluralizes correctly at n=1.

Model tier: mechanical wiring over existing accessors — lighter tier appropriate.

### A3 — Surface crisis proximity [SHIPPED 2026-08-04]

`crisisCandidates()` gates each crisis on `era >= c.eraMin` and `state[c.thresholdStat] >= c.threshold`
— `leoFlights >= 40` for the debris cascade, `deepFlights >= 15` for solar storms. The player is
never shown either counter. A crisis therefore arrives as an ambush, when the ingredients for dramatic
irony ("34 of 40 — every LEO launch is loading the gun") are already tracked in state.

- [x] Show, for each era-eligible crisis not yet triggered, its threshold stat as a progress readout
  (e.g. `LEO flights 34/40`). Era-ineligible crises stay hidden entirely — no spoilers for content the
  player cannot yet reach.
- [x] `funding_collapse` has `thresholdStat:null` (era-gated only) and must render sensibly with no
  counter rather than showing `0/0`.

**Protected baseline — do not regress:** `CRISIS_TRIGGER_CHANCE` and the whole of `tickCrisisTrigger()`
are untouched — this shows a counter, it does not change when anything fires. The
"not an immediate repeat of the last resolved crisis" variety rule stays.

**Explicitly out of scope:** changing thresholds, trigger chance, or severity ramp.

**Suggested test:** `tests/test-crisis-proximity.js` (new, 29/29) — era gating gates one crisis at a
time (not all-or-nothing); progress percentage is accurate at 0%, mid-range, exactly-at-threshold, and
clamps at 100% past it; `funding_collapse` reports `val`/`pct` as `null` (not `0/0`) and the card
renders the no-counter fallback copy; the card omits itself entirely rather than rendering empty
chrome when nothing is era-eligible; nothing renders while `state.crisis` is active; and
`crisisCandidates()`'s own semantics are unchanged — it still excludes a below-threshold crisis that
`crisisProximity()` would still list, confirming the two accessors answer genuinely different
questions (eligible-to-trigger vs. progress-toward-eligibility) rather than one being a filtered view
of the other.

Model tier: mechanical — lighter tier appropriate.

### B4 — Expand the crisis pool (3 → 9) [SHIPPED 2026-08-04]

`CRISES` holds three entries gated to eras 3, 4 and 5. The Interplanetary (2060+) and Speculative
(2100+) eras — the back half of a 158-year campaign, and the review's identified weak zone — have
**no crisis content at all**. The mechanism is good (era gate + player-footprint threshold, fund the
remedy or endure a permanent tax, severity ramp, variety rule); it is under-populated.

- [x] Add 5-7 entries following the existing shape exactly: `{id, name, icon, eraMin, thresholdStat,
  threshold, fundCostBase, maxPenalty, effectKey, remedyName, effectLabel, modalTitle, modalDesc,
  triggerMsg, mitigatedMsg, enduredMsg}`. Weight new entries toward `eraMin` 6-8.
- [x] New entries will likely need new `effectKey` handlers — the current three cover `leoRel`,
  `deepRel`, `govFunding` via `crisisRelPenalty()`/`crisisGovFundingMult()`. Any new effect axis needs
  its own accessor and must be applied somewhere real, not just logged.
- [x] New `thresholdStat` values must be counters that already exist or are cheaply added, and must
  count something the player *did* — the design principle here is the empire creating its own hazard.

**Protected baseline — do not regress:** the three existing crises; `CRISIS_TRIGGER_CHANCE`;
`crisisFundCost()`'s era scaling; the fund-or-endure structure and permanent-tax outcome.

**Explicitly out of scope:** raising trigger frequency (more variety, not more crises per campaign —
same discipline as Tier 1.1's anomaly pool); multi-crisis concurrency (`state.crisis` is singular and
should stay so for now).

**Suggested test:** `tests/test-crisis-pool.js` (new, 43/43). The load-bearing one is a loop over every
distinct `effectKey` in the pool asserting each moves at least one live observable at full severity —
a typo'd or unhandled key becomes an inert label-only crisis, and this catches it by construction
rather than by remembering to test each new axis. Also: pool shape and required-field completeness;
every `thresholdStat` names a counter this codebase actually increments (an unknown one would make its
crisis unreachable forever); each new axis's exact multiplier and its isolation from the other three;
severity scaling; era-6/7 coverage actually exists; and protected-baseline checks that
`crisisCandidates()`'s era/threshold gating and the no-immediate-repeat variety rule both still hold
across a 9-entry pool.

**Shipped shape (b), per Shamus's call:** four genuinely NEW effect axes rather than reskinning the
existing three — `crewRel` (crewed-mission reliability tax, a fourth branch in `crisisRelPenalty`),
`research` (`crisisResearchMult()`, applied at the daily R&D tick), `facilityOut`
(`crisisFacilityMult()`, applied to the daily facility production loop) and `buildTime`
(`crisisBuildMult()`, applied in `buildMonths()` — the only axis that INCREASES rather than decreasing).
Two of the six new entries deliberately reuse an existing axis (`govFunding`, `deepRel`) with a new
fiction and, more importantly, a new TRIGGER — the trigger is what makes a crisis feel distinct, not
only the tax.

**No new counters were introduced.** All six new thresholds use counters that already exist and are
already incremented (`leoFlights`, `deepFlights`, `crewFlown`, `crewLost`, `flights`), keeping the
"threshold counts something the player did" principle without adding bookkeeping that could drift.

**Balance note for playtest:** `safety_backlash` triggers on `crewLost >= 3` — the only crisis in the
pool triggered by failure rather than by scale. Thematically strong (Apollo 1 / Challenger / Columbia
all produced exactly this) but it does compound a bad run, so its `maxPenalty` was set to 0.30 against
`funding_collapse`'s 0.50 on the same axis. Worth watching in play; it is a one-number change.

Model tier: content, balance, and new effect axes — heavier tier.

### B5 — Convert the 14 empty-effect research nodes [AUDITED 2026-08-04 — NO PLACEHOLDERS FOUND]

**Original premise was wrong.** This entry assumed some of the 14 `effect:{}` nodes were unfulfilled
placeholders needing real payloads. A full audit — grepping every id for both quoted (`'id'`) and
dot-notation (`.id`) references, then reading each call site — found **zero placeholders**. Every one
of the 14 is legitimately empty, for one of three reasons:

- **Bespoke-implemented (7):** `strapon_integration`, `orbital_eva`, `cryo_boiloff_control`,
  `megawatt_electric`, `gravity_assist_planning`, `aerocapture`, `surface_fission_power`. Each has a
  real mechanic wired at its own point of use rather than through the generic effect bus
  `researchEffectSum()` pools — e.g. `aerocapture` cuts capture-burn Δv by 70% at its actual burn
  calculation (`sim.js:3782`), not as a pooled stat.
- **Capability gates (2):** `precision_edl`, `onorbit_servicing` — gate the Mars Landing mission and
  the Satellite Servicing passive contract via `reqResearch`, no numeric effect needed.
- **Pure prereqs (5):** `electrolysis_scaleup`, `station_keeping`, `large_space_stations`,
  `autonomous_operations`, `hydrogen_storage` — tree-structure nodes whose only job is unlocking a
  successor via that successor's `req:[...]`.

**Two stale-documentation defects were the actual finding here, both corrected:**
1. This ROADMAP's own "Open threads" note claimed cryo boil-off "is not modeled as a *mechanic*" and
   that `cryo_boiloff_control` was an unfulfilled placeholder. `boiloffMargin()` has existed and been
   consumed by `resupplyCostFull()` since well before this session — the note was never updated after
   the mechanic shipped.
2. This entry itself repeated that stale claim as its justification for existing.

This is the third time in this project's review history that a finding traced to reasoning about the
design instead of reading the code — after "build a decision system" (Tier 1) and "build a crisis
system" (Tier 2 A-series), both already built when proposed.

- [x] Audit all 14 — see `RESEARCH_EMPTY_EFFECT_ALLOWLIST` in `data.js`, which records each node's id
  and the specific reason its `effect:{}` is correct.
- [x] No payloads to give — there were no placeholders.
- [x] Standing test so this can't silently regress: any `RESEARCH` node with `effect:{}` must appear
  on the allowlist, and every allowlisted id must still exist and still be empty (catching both a new
  undocumented placeholder and a stale allowlist entry after a future edit).
- [x] Corrected both stale docs above rather than leaving them to mislead a future session.

**Protected baseline:** unchanged — no prereq chains, costs, or `sciGateCost` were touched, since
nothing needed fixing.

**Suggested test:** `tests/test-research-effect-gates.js` (new) — every `effect:{}` node is on the
allowlist and vice versa; every allowlisted id still exists in `RESEARCH`; every allowlisted id's
`effect` is still literally empty (so if a future session gives one a real payload, the test fails
until the entry is removed, rather than silently going stale itself); every listed reason string is
non-empty (a documented-but-unexplained entry is as useless as an undocumented one).

Model tier: audit was judgment (heavier, now spent); the allowlist + test + doc corrections that
shipped are mechanical — lighter tier.

### C6 — Couple the calendar to progression [SHIPPED 2026-08-04 — option (b) chosen]

The structural finding both reviews agreed on: `state.year` drives eras, reputation drives the mission
ladder, capital+science drives research, and **nothing couples them**. All 28 missions are rep-gated
with zero era-gating; zero research nodes are era-gated. The 158-year calendar is a backdrop, not a
constraint. A fast player exhausts the authored ladder and then has decades of procedural filler; a
slow one flies Pioneer hardware into the Commercial era with no pressure either way.

**This item is blocked on a design decision Shamus has not yet made.** Three options, cheapest first,
from the Architect/Ranger exchange:

- **(a) Obsolescence pressure only.** Era-scaled payout/rep decay on hardware and mission classes that
  the era has moved past. No gating; falling behind costs money and prestige rather than access.
- **(b) Era-gate research only, not missions.** *The compromise neither critic objected to.* Keeps
  every mission reachable (so a behind player never has *fewer* things to do — the Ranger's core
  objection to (c)) while stopping anachronistic tech availability.
- **(c) Hard era-gating on missions.** The Architect's original ask. Strongest coupling, strongest
  realism; the Ranger's objection is that it makes an already decision-sparse late game emptier.

**Shamus chose (b), 2026-08-04.** Shipped: `eraMin` on all 98 `RESEARCH` nodes; `researchNodeState()`
gains a distinct `'era'` state (checked BEFORE `reqsMet`, so an era-gated node reads as era-gated even
with prereqs complete — "not invented yet" and "you haven't earned it" imply different player actions
and must not look alike). Enforced at BOTH purchase paths: `buyResearch()` and
`tryStartQueuedResearch()`, the latter mattering because it calls `startResearchProject()` directly and
would otherwise have been a silent bypass. A queued era-gated pick is retained rather than discarded,
so it fires when the era arrives. MISSIONS remain completely ungated, as (b) requires.

**Method note — the approved heuristic was discarded.** The plan was track-baseline + prereq-depth
offset. Generated, then rejected on inspection: it put `lunar_lander`, `mars_traj`, `precision_edl` and
`rad_shielding` in era 7 (2100+) and `parachute_recovery` in era 4, which would have made Mars landings
impossible until the Speculative era and gated Mercury-era parachutes to 2000. Worst case found:
`orbital_depot` at era 6 while gating `tanker_leo` at **minRep 38** — a near-start mission. All 98 were
hand-assigned instead, anchored to real spaceflight history and validated against two hard constraints:
every mission's `reqResearch` must stay reachable, and no node may be gated later than its own
prereqs. That second check caught two real inversions (`deep_space` before `digital_computer`,
`deep_throttling` before `methane_propulsion`), both resolved in favour of the tree's own structure.

Resulting curve: 9/98 nodes era-open at 1942, 21 by 1957, 43 by 1961, 62 by 1975, 80 by 2000, 98 by
2100. Six nodes are available at game start across multiple tracks, including an engine unlock — a
real opening choice, not a forced line.

**Three pre-existing test fixtures broke, all correctly**, having assumed "prereqs met ⇒ available":
`test-afford-estimate.js` (used `vac_upper`, eraMin 1, at the 1942 start) and `test-research-goal.js`
(the `earth_observation`→`planetary_science` chain, eraMin 1 and 2). Both advanced to an era that opens
their nodes, so they test what they mean to test rather than the era gate.

Model tier: heavier — this is a fork in the game's identity, not a wiring task.

### C7 — Facility specialization [SUPERSEDED 2026-08-04 — premise did not survive audit]

**The specialization system this entry asked for already exists, and is good.** Audited before writing
any code: `STATION_MODULES` holds 10 distinct module types (Habitat, Lab, Power Truss, Docking Node,
Depot, Greenhouse, ISRU Plant, Reactor Pad, Hab Dome, Rover Garage), each with its own production
profile, cost, build time, crew requirement and power draw. Real synergies already reward composition
rather than accumulation: Lab+Habitat gives +20% science, Greenhouse+Habitat +15% income, Depot+Power
Truss +25% fuel, and a net +8 kW surplus gives a station-wide efficiency bonus. Body-appropriateness
is already gated — `node_hub` is orbital-only, four modules are `surface:true`. Power, crew and
maintenance all constrain the choice. Module composition therefore already changes *what a base is*,
not just how big it is, which is exactly what this entry requested.

`facilityPortCap` returning `Infinity` off-Earth — flagged in the original entry as if it were a gap —
is a deliberate, documented decision (ports model finite orbital berths; a surface base spreads out
instead), not an oversight to fix.

**Fourth review finding in this project to not survive contact with the source**, after the decision
system (Tier 1), the crisis system (Tier 2 A-series) and the "placeholder" research nodes (B5).

**The real gap the audit did find:** `state.facilities` is keyed by fixed facility id, and
`FACILITY_DEFS` has exactly three entries — so the total number of bases is hard-capped at 3 for the
entire 158-year campaign, regardless of how far the player gets. Depth *within* a base is rich; the
count never grows. Moon and Mars are also near-identical mechanically, differing only by numeric
scalars and flavour text. Superseded by C8 below.

### C8 — Outer-system bases and per-body environmental hazard [SHIPPED 2026-08-04]

Replaces C7. Scope confirmed with Shamus 2026-08-04: module-count growth is welcome where it earns its
place, and new bodies are explicitly wanted — specifically the kind of body-defining problems the
outer system offers (Jovian radiation, Io's volcanism) rather than more reskins of Mars.

Deliberately shipped as ONE push per Shamus's call, but built in a strict internal order (see below)
so a mistake in one half cannot hide inside the other.

**The seams already exist — this is not built from nothing:**
- `BODIES` already holds 25 entries including `io`, `europa`, `ganymede`, `callisto`, `titan`, each
  with Δv legs already defined and flavour text that already does the design work: Io is "the most
  volcanically active world in the system — sulphur plains under a lethal radiation bath"; Callisto is
  "outside the worst radiation, the safest Jovian base site".
- `jupiter_orbit` and `titan_landing` are already flyable missions — the gate missions exist.
- `rad_shielding` is already a real research node already required for crewed Jupiter missions.
- `BODY_RESUPPLY_MULT` (`{earth:1.0, moon:2.2, mars:4.2}`) and `LOGI_TRANSIT_DAYS`
  (`{earth:0, moon:4, mars:210}`) are already per-body lookups with a `||1` / `||0` fallback — new
  bodies slot in as data, not as new code paths.
- `canFound()` / `foundFacility()` are already fully generic over `FACILITY_DEFS` with no hardcoded ids.

**Known hardcoded-id risk surface** (audited; every one must be handled or consciously left alone):
`render.js:1182` (`leoOps`/`lunarOps`/`marsOps` in the tracking/DSN readout), `render.js:8748-8749`
(Base Bench cost cells naming LEO/Moon/Mars), `render.js:8757` and `:8922` (station-draft default
facility), `render.js:9044` `BASE_DRAFT_FACID={moon,mars}` plus `baseDraftBody()`/`setBaseDraftBody()`
which hard-default to moon/mars only, and `ISRU_FREE_LEG` (`sim.js:3703`) which is keyed by mission.

**Build order (internal, non-negotiable):**
1. [ ] Hazard mechanic first, wired against the EXISTING three bodies at zero effect
   (`BODY_HAZARD` defaulting to 0 for earth/moon/mars), with tests proving LEO/lunar/Mars economics are
   byte-identical to before. This is the step that protects the existing game.
2. [ ] Only then add the two new facility bodies, which turn the hazard on.

**Hazard mechanic:** a per-body factor feeding the two existing live hooks —
`stationMaintenanceFactor`/the condition-decay line in `tickStationOperations()` (`sim.js:1855`) so a
hostile environment degrades a base faster, and `bodyResupplyMult` so it costs more to sustain. It must
be a *cost of presence*, not a random failure: the player should be able to plan against it (more
maintenance, more resupply) rather than be ambushed by it.

**New facilities:** a Jovian base at **Callisto** (gated on `jupiter_orbit`; the game's own flavour
text already nominates it as the safe Jovian site) and a **Titan** base (gated on `titan_landing`).
Both reuse `STATION_MODULES` and the existing surface-module gating wholesale — no new module types
are needed for this slice.

**Explicitly out of scope:** an **Io** base. Volcanism is a structural-risk problem (episodic damage to
a built base), not a resupply-cost problem, and bolting it onto a hazard system designed around
sustained cost would either trivialise it or make it arbitrary. Scope it separately once the hazard
mechanic has been played. Also out of scope: new module types, new bodies beyond Callisto and Titan,
and any change to `facilityPortCap`'s documented off-Earth behaviour.

**Protected baseline — do not regress:** LEO/lunar/Mars founding, expansion, production, resupply,
maintenance and ISRU economics must be numerically unchanged (step 1 above exists to prove this);
`STATION_MODULES` and every existing synergy; `facilityPortCap` off-Earth; the Base Bench module set.

**Suggested test:** existing-body economics identical before and after the hazard mechanic lands
(the load-bearing test — assert exact equality on production, resupply cost and condition decay for
all three existing facilities with hazard installed but zero); `BODY_HAZARD`'s fallback keeps any
unlisted body at zero; hazard scales condition decay and resupply cost in the expected direction and
magnitude for the new bodies; both new facilities found only with their gate mission complete; the
module palette offers the correct surface/orbital set at each new body; and a save round-trip carrying
a Callisto/Titan facility.

Model tier: heavier throughout — new state schema, a genuinely new mechanic with no existing hazard
number to calibrate against, and live economy paths that every existing facility already depends on.

`FACILITY_DEFS` holds three entries (LEO station, lunar base, Mars base) for the entire colonization
arc. Facilities currently grow along one axis — module count — with `facilityPortCap` returning
Infinity off-Earth. Late-game 4X depth normally lives here.

- [x] Give facilities a specialization axis: divergent module trees or a role choice (research /
  industry / logistics) that changes what a base *is*, not just how big it is.
- [x] Sequence after B4. Crises are the cheaper late-game pressure fix and should land first; this is
  the larger structural investment and benefits from knowing what late-game pressure actually feels
  like once crises are populated.

**Protected baseline — do not regress:** existing facility founding/expansion economics, ISRU,
`facilityPortCap`'s off-Earth behaviour, the Base Bench (E1.8) surface-module set.

**Explicitly out of scope:** new bodies; this is depth on the three that exist.

Model tier: heavier — systems design with real balance surface.

**Sequencing note for the whole tier:** A1 is human-blocked and can proceed in parallel with anything.
A2 and A3 are small, mechanical, and independent of each other. B4 before C7. C6 is blocked on a
decision and should not be started before it is made. Explicitly deprioritized by the review and NOT
scoped here: tutorial/onboarding (Shamus is currently the sole player — speculative work for a
hypothetical audience), SM6, mission patches/photo mode, and full backlog triage.

## Planned — Tier 3 "hand the player the tools": UI & information delivery (scoped 2026-08-04)

From the third critical review (2026-08-04, Architect / Ranger / Adjudicator), scoped to UI and player
experience only — items already covered by Tiers 0-2 were excluded from that review by request.

Its finding is the UI-layer echo of Tier 2's: **the game has already built the tools to manage its own
complexity, then failed to hand them to the player.** A three-layer progressive-disclosure system with
no discoverable control. A log with good category filters and no memory. Modals that interrupt
correctly and serve reference badly. In each case the machinery is right and only the delivery is
missing.

Judged throughout against the standard Shamus set for this review: the result must make the player
*want to keep using these systems* because they are functional, utilitarian, and deliver the
information needed to play in concise, easily understood form.

### 3.1 — Build the missing `uiLayerBtn` header control [SHIPPED 2026-08-04]

`applyUiLayer()` (`render.js:3494`) ends with:

    const b=$('uiLayerBtn'); if(b) b.textContent='View: '+UI_LAYER_LABEL[L];

**`uiLayerBtn` does not exist in `src/shell.html`.** Every render reaches for it, finds nothing, and
silently no-ops. A header control was designed, coded against, and never built — this is an unfinished
feature the codebase believes is finished.

The consequence is that the whole `basic` / `advanced` / `expert` system (`UI_LAYERS`, `applyUiLayer`,
`.adv-only` / `.basic-only` / `.expert-only`, 6 real expert-only readouts including mass fractions,
the engineer reliability formula, rival momentum and market-crowding coefficients) is reachable only
from `renderSettings()`. Default is `advanced`. A player who never opens Settings never learns a
choice exists — so in practice the system does not exist.

- [x] Add a `uiLayerBtn` element to the header in `src/shell.html`, next to the existing stat/time
  controls, with `onclick` cycling `basic → advanced → expert → basic`.
- [x] Keep `renderSettings()`'s three explicit buttons as the direct picker — the header control is a
  fast cycle, not a replacement.
- [x] Give it a `title=` naming the current layer and what the next click does (Tier 0.3 convention).

**Protected baseline — do not regress:** `setUiLayer()` validation against `UI_LAYERS`; the Settings
picker; `uiLayer()`'s default of `advanced` for saves with no `state.uiLayer`; every existing
`.adv-only` / `.expert-only` / `.basic-only` class placement.

**Explicitly out of scope:** changing which content sits in which layer (that is 3.4).

**Correction to this entry's own checklist:** when this was first scoped, its three checklist items
were mistakenly written as `[x]` despite `uiLayerBtn` genuinely not existing yet (confirmed by
`git log -S` — wrong from the initial scoping commit, not a later accidental flip). Reverted to `[ ]`
before starting real work, so the doc matched reality while this was being built.

**Suggested test:** `tests/test-ui-layer-button.js` (new, 19/19) — the button resolves on a real
render (the original bug: it did not); text and title update live across every cycle, not just once;
`cycleUiLayer()` goes basic→advanced→expert→basic and wraps; `setUiLayer()`'s validation, the
Settings-picker call path, and the advanced default for a save with no `uiLayer` field are all
confirmed untouched; render doesn't throw under any of the three layers.

Model tier: mechanical, and small — lighter tier appropriate.

### 3.2 — Persistent history archive, separate from the live log [SHIPPED 2026-08-04]

`log()` (`sim.js:98`) caps at 40 entries: `state.log.unshift(...); if(state.log.length>40)
state.log.pop()`. Across ~1,900 monthly ticks that is an amnesia machine — a single Mars transfer
(~26 months) can push its own launch out of history before arrival. "What did my agency do in the
1970s?" is currently unanswerable. The Chronicle records *firsts*; ordinary agency history evaporates.

The review rejected "uncap the log" as stated — the cap is deliberate and `state` serializes to
`localStorage` on every save. The archive form survives instead:

**Correction 1 — checklist mislabel.** As with 3.1, this entry's checklist boxes were `[x]` from the
initial Tier 3 scoping despite nothing being built. Reverted to `[ ]` below before starting.

**Correction 2 — `state.history` is already taken.** This entry proposed `state.history` for the
archive, but `state.history` already exists as a `{missionId: year}` map driving the Home timeline
(`sim.js`, `render.js`). Using it as an array would corrupt that. The archive uses **`state.annals`**
instead.

- [x] Add a separate `state.annals` array holding a COMPACT record — date, kind, one-line summary.
  No `detail`, no `nav` (both are transient UI concerns; `detail` is already documented as never
  persisted). Roughly 60 bytes/entry, so 500-1000 entries is trivial against a save that already
  carries the full part graph and hull registry.
- [x] Append on SIGNIFICANT events only, not all 179 `log()` call sites: flights resolved, firsts,
  crises triggered/resolved, facilities founded, research completed. Decide the predicate explicitly
  rather than mirroring every log line — an archive of everything is as useless as no archive.
- [x] Surface it in the Chronicle (`showChronicle`), which is already the historical view — not as a
  fourth timeline widget.
- [x] `SAVE_VERSION` bump with a lazy default so existing saves start an empty archive rather than
  failing to load.

**Protected baseline — do not regress:** the 40-entry live strip cap and its render path; the
`TL_CATEGORIES` filters, collapse toggle, and scroll-position preservation in `renderLog()`; `log()`'s
existing 4-arg signature and its transient `detail` behaviour.

**Explicitly out of scope:** changing the live log's cap, filters, or appearance; retroactively
reconstructing history for existing saves (start the archive from the version bump forward).

**Suggested test:** `tests/test-annals-archive.js` (new, 28/28) — entry shape (date/year/kind/summary,
no nav/detail); oldest-first ordering (push, unlike the live log's unshift); the ring-buffer cap;
significant events record (research complete, crisis trigger/resolve) while routine `log()` chatter
does not; the live log's 40-cap, newest-first order and 4-arg signature are all untouched; the
Chronicle surfaces the archive grouped by era and omits the section entirely when empty; and a save
round-trip plus an "old save with no annals field" both work without error.

Model tier: mostly mechanical; the "which events are significant" predicate is a judgment call —
heavier tier for that decision, lighter for the wiring.

### 3.3 — Dock the three REFERENCE modals [NOT STARTED]

25 `show*Modal` surfaces exist. The review's finding is that modal count is the wrong axis — the right
one is **interrupt vs. reference**. Anomaly, crisis, weather, live-call, inquiry, sample-decision,
hearing, mandate, mishap, rescue and setback modals are all *correct*: they demand a decision and
should block. Three are not:

- `showFinancesModal` — consulted *while* deciding whether to spend
- `showRivalsModal` — consulted *while* choosing what to race for
- `showInfrastructureModal` — consulted *while* planning expansion

Each is currently a wall between two facts that belong side by side.

Scoping found this cheaper than expected: all three are thin wrappers that render an existing
`render*()` into a bare host div — e.g. `showRivalsModal` is
`showModal('<div id="rivalsCard"></div>'); renderRivals();`. The render functions target an id, not a
modal. Docking is therefore a **host swap**, not a rewrite.

- [x] Give each a docked state in the right rail, reusing the same `render*()` and the same host id,
  so only the container changes.
- [x] Preserve the modal path as well — docking should be a choice, not a forced migration.
- [x] Respect Tier 0.2's rail width: a docked panel must not reintroduce the squeeze the 1200px
  breakpoint fixed.

**Protected baseline — do not regress:** every INTERRUPT modal stays exactly as it is; `activeModal`
re-entrancy and `modalClose()`; `renderRivals`/`renderInfrastructure`/`showFinancesModal`'s existing
content; `_prodModalOpen`'s bookkeeping in `showInfrastructureModal`.

**Explicitly out of scope:** reducing modal count generally; touching any interrupt modal.

**Suggested test:** each of the three renders identical content in docked and modal hosts; interrupt
modals still block; the docked state survives a scene switch; no rail overflow at 1200px.

Model tier: layout work with real judgment about rail budget — heavier tier.

### 3.4 — Give the Basic layer real alternative renderings [NOT STARTED]

The structural finding underneath 3.1. Today the layer system can only SUBTRACT: `.adv-only{display:
none}` hides, and there is no seam for showing something *simpler instead*. Evidence of the asymmetry:
6 `expert-only` sites against exactly **1** `basic-only` site. "Basic" therefore does not simplify the
game, it only removes information from it — which is worse than Advanced for a new player, not better.

- [x] Add a `basicHTML()` / `advancedHTML()` branch on the 3-4 densest readouts — the Δv gauge, the
  subsystem reliability breakdown, the finance summary — so Basic renders a plain-language equivalent
  ("Δv: enough, with margin") where Advanced renders the figures.
- [x] Sequence AFTER 3.1. There is no point investing in a layer nobody can reach; ship the control
  first, then make the layer worth choosing.

**Protected baseline — do not regress:** Advanced and Expert renderings stay byte-identical; no change
to the underlying values, only their presentation.

**Explicitly out of scope:** a full Basic-mode pass over every surface — this is 3-4 targeted readouts,
chosen because they are the densest and the most jargon-cold.

**Suggested test:** each converted readout produces non-empty, different output in Basic vs. Advanced;
Advanced/Expert output is unchanged from before the slice; no numeric value differs between layers
(the same truth, differently said).

Model tier: design and copy judgment — heavier tier.

### 3.5 — Log text search (backlog #16) [NOT STARTED]

Already in BACKLOG.md as #16. Cheap, and deliberately sequenced last: searching a 40-entry live strip
is close to pointless, but searching an 800-entry archive is a real feature. Do this AFTER 3.2.

- [x] A filter input beside the existing `TL_CATEGORIES` chips, matching against the archive when 3.2
  has landed, composing with (not replacing) the active category filter.

**Protected baseline:** existing category filters and collapse behaviour compose with search rather
than being replaced by it.

**Suggested test:** search narrows results; search + category compose; clearing search restores the
unfiltered view.

Model tier: mechanical — lighter tier appropriate.

**Sequencing for the whole tier:** 3.1 first and alone — it is small, it fixes a live dangling
reference, and it makes an entire existing system reachable. Then 3.2, which 3.5 depends on. 3.3 is
independent and can slot anywhere. 3.4 only after 3.1.
