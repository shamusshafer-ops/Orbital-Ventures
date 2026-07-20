# Orbital Ventures — Roadmap & Workflow

This document tracks where the build is and what's next. It's the living
companion to `orbital-ventures-design.md` (original full design doc) and
`orbital-ventures-systems-spec.md` (rocket-equation + life support deep dive).

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

- Cryogenic boil-off is not modeled as a *mechanic* (hydrolox transfer stages
  are still "free" on long coasts) — a future realism pass that would strengthen
  the case for hypergolic/ISRU choices. A `cryo_boiloff_control` research node
  now exists (refueling track) but ships with an empty `effect:{}` — a capability
  gate placeholder, so it does **not** yet close this note.
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

## Completed milestones (continued)

- [x] **Custom difficulty (third mode)** — `DIFFICULTY.custom` + `state.customDifficulty`; seven live
      sliders (start capital, monthly overhead, reliability bump/floor/cap, payout ×, build-cost ×) and a
      math-exposure toggle. Validated headlessly (13 checks + Napkin/Engineer suite 16).
- [x] **Rival & economy events (ambient + map)** — `ECONOMY_EVENTS` pool (grants/cuts/boom/downturn);
      `rivalsAtBody()` powers coloured reach markers. New Market stat + map Activity card. Validated (14).
- [x] **Map: fit + full-screen** — auto-sizes viewBox to outermost orbit; ⛶ Expand toggle. Validated (9).
- [x] **Programs & ambition** — `PROGRAMS` (7 campaigns, completion bonuses via `checkPrograms()`),
      `AMBITIONS` (4 goals, `ambitionProgress()` bar), `nextObjective()` nudge. Programs tab.
      Validated (15).
- [x] **M5 — Reusability & rapid cadence** *(2026-06-21)* — `propulsive_landing` research unlocks
      Recovery toggle on Stage 1. `RECOVERY_HARDWARE` $1.2M on every flight; routine reflights at 45%
      build cost + −1 month. `SAVE_VERSION`→6. Validated (31).
- [x] **M6 — Personnel depth** — `ENGINEERS` (12, era/rep-gated, 4 specialties) + `ASTRONAUTS` (8).
      Monthly salary, morale drift, attrition at 3 mo below morale 20. `engRelBonus()`/`engRdSpeedBonus()`.
      Hire/Let go/Raise/Commend actions. Validated (all metrics correct).
- [x] **M7 — Outer system** *(2026-06-17)* — NTR (`ntr_nerva`, Isp 825s, `transferOnly`) + NEP
      (`nep_snap`, Isp 3000s, `lowThrust`). Four research nodes (`nuclear_thermal`/`nuclear_electric`/
      `rad_shielding`/`belt_volatiles`). Four missions: Belt Survey, Belt Mining Claim (pgmRoyalty $4.5M/mo),
      Jupiter Flyby, Jupiter Orbital. Validated (17).
- [x] **Passive income contracts** *(2026-06-21)* — `PASSIVE_CONTRACT_DEFS` (12 contracts, 4 categories:
      Satellite Services/Human Spaceflight/Tech Licensing/Military & Defense). Repeatable with cooldown +
      diminishing returns (`PASSIVE_DIMINISH`^signings, 0.85/renewal, floored 40%). `SAVE_VERSION`→11.
      Validated (37).
- [x] **Settings / difficulty panel** — `DIFFICULTY` (Napkin/Engineer); `state.difficulty`; difficulty cards
      in Settings tab. Validated (16).

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
      *(Superseded/expanded by the R&D Deep Expansion epic — see § R&D Deep Expansion.)*
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
      derived from who's hired. See § "#19 Organizational scaling" below for the full record.
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

## #7 · Sub-assemblies — Engine Yard + Structures/Habitats + Bench-test ✅ DONE (2026-06-27)

The missing middle manufacturing layer between raw-commodity inventory and the whole-vehicle hangar. Chosen
mechanic: **cadence/timing tool** — fitted sub-assemblies shave assembly days and are already paid for (cost-neutral:
charged at stock-time, credited at build-time). Foundry level = parallel build for all yards.

- **Slice 1 — Engine Yard:** `state.engineStock{engId:count}`. `engineBuildDays` 20d L1→8d L5.
  `ENGINE_STOCK_CAP` 24/type. `ENGINE_ASSEMBLY_SAVE_DAYS` 6d shaved per fitted engine. ⚙ Engine Yard panel.
  SAVE_VERSION→35. **Validated /tmp/ov-engyard.js 23/23:** cost/time + parallelism, exact cost-neutrality, launch
  saves days + consumes stock. TG 66/66 + CE5 green.
- **Slice 2 — Structures & Habitats yard:** Pre-fabricate **stage tank sets** (keyed by tank material) and
  **crew-module habitats** (keyed by ECLSS tier). `state.partStock{"kind:sub":count}`. `PART_ASSEMBLY_SAVE_DAYS`
  5d each. `TANK_UNIT_BASE` 0.15, `HAB_UNIT_BASE` 0.3+0.4×sysBase. `PART_STOCK_CAP` 12/type. SAVE_VERSION→36.
  **Validated /tmp/ov-partyard.js 31/31:** cost-neutrality, foundry parallelism, all types.
- **Slice 3 — Bench-tested components:** Proof/static-fire testing of stocked components: +60% cost
  (`BENCH_TEST_COST_MULT`), +50% time (`BENCH_TEST_DAYS_MULT`), adds +1.5% flight reliability per tested
  component (`BENCH_REL_PER`, capped +6% `BENCH_REL_CAP`). `state.engineStockTested`/`state.partStockTested`.
  Proven units fitted+consumed first. `benchRelBonus(m)` wired into `computeVehicle`. SAVE_VERSION→37.
  **Validated /tmp/ov-bench.js 23/23 + full regression green.**

**Production UI:** Production drill auto-opens as first layer on boot (`showInfrastructureModal`), Esc/Enter
minimizes. Modal `.scrim` z-index 20→80. Icons: engineIcon(id) by propulsion type, partCompIcon(key) for
tank materials + ECLSS tiers.

**#7 Manufacturing Capacity (8 slices, 2026-06-20→2026-06-22) summary:**
1. Assembly Bays/Engine Foundry/Launch Pads/QA production lines (L1–L5, capital + upkeep, `SAVE_VERSION`→4). Validated (38).
2. QA flat reliability bonus (`qaRelBonus`, `QA_REL_PER`/`QA_REL_CAP` ≤+4.8%).
3. QA→#16 subsystem bridge: `qaFragMult()` scales manufacturing subsystem weights (QA_MFG_SUBSYS); overall R untouched. Validated (20).
4. Reusable-hardware refurbishment: `reflights` counter; `refurbCostMult` 0.45→0.85, `refurbRelPenalty` 0→4% over 5 reflights. `SAVE_VERSION`→13. Validated (31).
5. Build-cadence pressure: `cadenceLoad()` ring buffer; `cadenceSurcharge()` up to 30% buildCost over capacity. `SAVE_VERSION`→14. Validated (25).
6. Raw-material supply chains: alloy/electronics spot markets (mean-reverting, [0.7,1.4]); 12-month contract lock at +5% premium. `state.materials`. `SAVE_VERSION`→15. Validated (28).
7. Inventory & forecasting: per-commodity stockpile (`stock`/`avgCost`); `consumeMaterialsForBuild()`. `materialMonthsCoverage()`. Cap 24 builds-worth. `SAVE_VERSION`→16. Validated (36).
8. Production queue & manifest: `state.buildQueue[]`/`state.hangar[]`; `buildSlots()`=bays level (parallel); `launchFromHangar` (skip build cost/time; `prebuilt` flag). Bench waterfall breakdown + sparklines + gauges. `SAVE_VERSION`→19. Validated (38).

## R&D Deep Expansion — The Research Pillar (epic)

Source: 2026-06-21 proposal to triple/quadruple the tech tree to ~100–125 nodes across 13 tracks, add Tech
Levels, Research Divisions, and Breakthrough Events. Deliberately departs from "balance exactly preserved" to
re-gate and lengthen progression so research spans decades. Old saves protected by `reconcileResearch()` which
backfills prerequisites on load.

### Target track structure (13 tracks)

**T1 Propulsion [E]** — Chemical/cryogenic/methane/electric/solid branches. Effects: +Isp, +thrust, +rel, bigger engines.
**T2 Structures & Materials [S]** — Riveted Steel → Al-alloys → monocoque → composites → carbon-fiber cryotanks. Effects: lower σ, lower cost, +rel.
**T3 Guidance & Avionics [N]** — Radio guidance → INS → digital computers → redundant computers → star trackers → AI Mission Mgmt. Effects: +launch rel, −mission failure.
**T4 Crew Systems [E]** — Pressure suits → ECLSS → EVA → docking → long-duration habitats → artificial gravity → interplanetary habitats.
**T5 Manufacturing & Production [N]** — Hand fabrication → assembly-line → modular → CAM → automated → rapid prototyping → additive → fully automated factory. Research here raises ceilings the #7 resource layer works within (not hard gates).
**T6 Testing & Reliability [S]** — Static fire → engine stands → qualification → stage test → integrated test → lifetime test → failure analysis → digital twin.
**T7 Ground Infrastructure [N]** — Concrete pads → flame trenches → mobile towers → VAB → crawlers → cryo ground systems → dual pads → heavy-lift infra.
**T8 Orbital Operations [R]** — Rendezvous → manual dock → auto dock → orbital construction → station keeping → large stations → servicing → shipyards.
**T9 Nuclear Technologies [E]** — Keep NTR/NEP; add reactor materials, NTR restart, bimodal NTR, surface fission power.
**T10 Refueling & ISRU [E]** — Keep orbital_depot/lunar_isru/mars_isru/belt_volatiles. Boil-off control node shipped (effect:{} pending mechanic). Add electrolysis, mobile ISRU.
**T11 Reusability [N/E]** — Parachute → powered landing → precision landing (M5) → rapid inspection → reusable 1st stage → reusable upper → full vehicle reuse.
**T12 Automation & AI [N]** — Flight automation → range safety → autonomous ops → fleet autonomy → AI R&D assistant → AI Mission Mgmt (capstone shared w/ T3).
**T13 Science & Exploration [N]** — Earth obs → planetary science → astronomy → astrobiology → geology labs → sample-return → exobiology → research institutes. Effects: +science yield, unlocks prestige missions.

### Meta-systems

- **Heavy mission-gating** — extend `reqMissionDone` chains (already supported).
- **Technology Levels** — multi-level flagship techs (Cryo Engines L I Atlas→L IV modern); `state.techLevel[id]`. SAVE_VERSION→7. Shipped.
- **Research Divisions** — 5 teams covering all 14 tracks; `divisionSpeedBonus` per-track accelerator; `state.divisions`. SAVE_VERSION→8. Shipped.
- **Breakthrough Events** — division-quality-driven, shaves 1–2 months; `state.breakthroughCooldown`. SAVE_VERSION→9. Shipped.

### Cross-Track Synergies — ✅ shipped as P6/P8 slice (2026-07-05, commit `9e290f9`); see the P7-P10 session log below for the actual implementation (mapped onto real research ids, not the T-numbers below, which were stale placeholders)

A `SYNERGIES` config array: each entry has `requires:[nodeId,…]` spanning ≥2 tracks. `synergyActive(s)` = all reqs researched. Effects fold into the same accumulators as per-node effects (so existing caps still bound everything). No new state — derived from the researched set. **4 seed synergies:** Lightweight Cryotanks (T2+T1), Autonomous Landing (T11+T3), Radiation Hardening (T4+T9+T2), Rapid Refurbishment (T5+T11). Surface a Synergies strip in R&D tab + tooltip note. **No SAVE_VERSION bump.**

### Build order status

1. ✅ **Track split** *(2026-06-21)* — `structures` split into Structures/Testing/Guidance; `assembly`→Orbital Operations. Pure data, balance-neutral. 32 nodes. Validated (28).
2. ✅ **Early-era content + first rebalance** *(2026-06-21)* — 9 early nodes (combustion chain, radio→digital guidance, test stands); decades-feel re-gating (`deep_space` now requires `digital_computer`+`sustainer`). `reconcileResearch()` backfills prerequisites for old saves. 41 nodes. Validated (29 + reachability proof).
2b. ✅ **Engine-model extension** *(2026-06-21)* — `effect.isp`/`effect.thrust` accumulators (`ispMult` cap +10%, `thrustMult` +15%) wired into `stackPerformance` for LV stages only. Gate nodes confer measurable effects. Validated (25).
- ✅ **Tech-tree hover tooltips** *(2026-06-21)* — `#techTip` card: name, track, status, benefits, hist note, req chain. Cursor-following. Validated (10).
3. ✅ **Tech Levels** *(2026-06-21)* — `TECH_LEVELS` config; `techLevel()`/`techUpgradeCost()`/`upgradeTech()`; effects feed `researchEffectSum`. Shipped: Cryogenic Engines L1–L4 (+2% Isp/level). SAVE_VERSION→7. Validated (27).
4. ✅ **Research Divisions** *(2026-06-21)* — `DIVISIONS` (5 teams); `divisionQuality`/`divisionSpeedBonus`; `trainDivision()`; morale drifts monthly. SAVE_VERSION→8. Validated (27).
5. ✅ **Breakthrough Events** *(2026-06-21)* — `checkDivisionBreakthroughs()` in `advance()`; quality→shave 1–2mo; `state.breakthroughCooldown`. SAVE_VERSION→9. Validated (20 + 200-month smoke).
6. 🟡 **Mid/late-era content** *(2026-06-21)* — Tree grew 41→78 nodes, 5 new tracks added (T5/T7/T11/T12/T13), heavy mission-gating. Validated (23 + reachability proof).
6b. ✅ **Effect-wiring** *(2026-06-21)* — 3 new accumulators: `mfgBuildMult` (−build cost, cap 30%), `groundLaunchMult` (−launch cost, cap 30%), `sciYieldMult` (+science yield, cap 50%). Wired 15 nodes. Validated (20).
6c. ✅ **Industrial build-time** *(2026-06-21)* — `buildTimeCut` effect key (cap 3 mo, total 3.5→clamps at 3). Wired 6 nodes. Validated (14).
6d. ✅ **Far-future / capstone tier** *(2026-06-21)* — Tree grew 78→98 nodes, 20-node endgame wave. Two more leveled techs (`full_vehicle_reuse`/`automated_factory`). Validated (19 + reachability proof).
- ✅ **Crew LS recycling effect** *(2026-06-21)* — `lsRecovery` effect key; `eclssRecovery()` pushed above base tier. Long-Duration Habitats +2%, Closed Ecology +7%. Open-loop gets no bonus. Validated (17).
- ✅ **Propulsion branch expansion** *(2026-06-21)* — 98→107 nodes; 3 new engines (Methalox Full-Flow, Hall-Effect Isp 1800, Gridded Ion Isp 3600); 9 new propulsion nodes across methane/electric/cryo-deep branches. Isp cap hits 0.10. Validated (23).
- ✅ **Radiation — equipment + personnel + career dose** *(2026-06-21)* — `RAD_ENV` per destination (LEO 1→Jupiter 9); `radEquipMult` × avionics fragility (bought down by `rad_shielding`+`redundant_avionics`); `radCrewMult` × life-support fragility; career dose per astronaut with force-retirement at `RAD_CAREER_LIMIT`. ☢ dose bar + bench flag. Validated (26).
- ✅ **Power — Phase 1 + Phase 2** *(2026-06-21)* — `powerDemand(m)` (comms + ECLSS + electric drive). `state.powerSource` (Solar/RTG/Fission; SAVE_VERSION→10); `powerSystemMass` added to `lvPayload`. Solar blocked below 20% sunlight at outer system. NEP self-powers. Power bench card. Validated (27).
- ✅ **Reactor → radiation link** *(2026-06-21)* — `powerRad(m)` (solar 0, RTG 0.15, reactor/NEP 0.4) feeds `radCrewMult` + career dose (mitigated by shielding). Validated (13).
- ✅ **Cross-Track Synergies** *(from the 2026-06-26 review, Rec #5)* — shipped 2026-07-05 as part of P8; see the P7-P10 session log for the real implementation.

*(Research partnerships shipped as #6 item above; TRL remains deferred — overlaps heritage.)*

## Vehicle Architecture — Side Boosters & Solid Rockets ✅ DONE (2026-06-21)

Adds strap-on side boosters and solid rocket motors. Balance-preserved (sidegrade); solids serve standalone stages too.

**Modeling:** serial-equivalent boost phase — boosters lift the full wet stack, jettison at burnout; boost Δv = Isp·g₀·ln(m0/mf); liftoff TWR = combined core+booster thrust. Solids: `solid:true` flag, Isp ~250–290s, no throttle/restart.

1. ✅ **Solid motor engine class** *(2026-06-21)* — 3 solid engines (Castor, Scout-class, Segmented SRB). `effect.engines` array unlock vocabulary. In-space exclusion (`!solid` for transfer/lander). Validated.
2. ✅ **Side-booster construct (liquid first)** *(2026-06-21)* — `state.boosters={eng,count,prop}`; `boosterMasses()` in `stackPerformance`; combined-thrust TWR; `vehicleUnits` counts strap-ons. Gated by `strapon_integration` research node. Bench Strap-on Boosters card. SAVE_VERSION→12. Validated (33: balance-preservation proof, boost-Δv formula, jettison bookkeeping).
3. ✅ **Research gating + reliability** *(2026-06-21)* — `solid_propellant`→`segmented_srb`→`strapon_integration` chain. `boosterRelPenalty()` (solid penalises less than liquid; cap 12%). New `boosters` subsystem in #16 model. Validated (35: penalty neutrality at 0, solid-vs-liquid, product-still-equals-R).
4. ✅ **Visuals — strap-ons on silhouette, pad & in flight** *(2026-06-21)* — `drawOneBooster`/`drawStrapOns` painters; separation at p≈0.14 with peel+tumble+sparks. Boosters on all 4 specs (preview, flight, Cape, hangar). Validated (41).

*Optional future polish:* recoverable solids (Shuttle SRB-style); solid-specific plume tint.

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

## Evaluation Review — UX, Manufacturing & Mission-Ops Pass

Source: play-and-code evaluation (2026-06-22). Scores: Concept 10 · Gameplay 10 · UI 7 · Graphics 6 · Architecture 6 · Sim depth 9 · Long-term 10. Headline call: **UI clarity, manufacturing, and mission operations** multiply engagement on the simulation foundation.

**Decisions (2026-06-22):** Single-file ethos preserved (#11 code modularization declined). Capture-only pass; sequencing decided separately.

### Reconciliation table (review's 12 points ↔ code reality)

| Review point | Status vs. shipped code | New work & where it's tracked |
| --- | --- | --- |
| **1 · UI complexity layers** | **Shipped — #23 complete** (slices 1–3, 2026-06-22/23) | Done. |
| **2 · Mission Planner wizard** | Not started | **#24** ✅ built 2026-06-23. |
| **3A · Side-by-side vehicle comparison** | Not started | **#25** ✅ built 2026-06-23. |
| **3B · Saved vehicle families** | **Shipped** as **#3** | Remaining nuance → **#3**. |
| **3C · Manufacturing queue** | **Shipped** — **#7** slice 8 | Sub-assemblies → **#7** ✅ done. |
| **4 · Living Command Center** | **Largely shipped** — **#18** animated iso Cape | Rollout/weather → **#18**/**#20**. |
| **5 · R&D: TRL, competing paths** | Competing paths shipped; TRL open **#6** | Experimental research failures → **#26** ✅ built 2026-06-23. |
| **6 · Mission operations** | → **#20** ✅ DONE | Done. |
| **7 · Persistent map assets** | Partial — **#13** + **#17** markers | **NEW:** player assets on map → **#13** (display) + **#21** (logistics). |
| **8 · Personnel careers/injuries/departments** | Poaching **#5**; traits **#9**; morale **M6** | Careers/injuries/promotions → **#19**. |
| **9 · Rivals: espionage/partnerships** | **Shipped** rivals **#5** | Espionage + partnerships → **#5**. |
| **10 · Graphics** | Phaser hybrid + GPU plumes shipped | Engine migration (Electron/Godot) declined — contradicts single-file ethos. |
| **11 · Code modularization** | n/a — single-file by design | **Declined.** |
| **12 · Version ladder** | Parallels existing v1.5–v5.0 ladder | No separate ladder added. |

### New items from the review

- [x] **23 · Progressive UI complexity layers** *(review #1)* — `state.uiLayer` ∈ basic/advanced/expert.
  `applyUiLayer()` toggles body classes; CSS disclosure (`adv-only`/`expert-only`/`basic-only`). SAVE_VERSION→20.
  Slice 1: mechanism + header/Home/Bench readout tags. Slice 2: Personnel/Rivals/Infra/Map/R&D tabs. Slice 3:
  `basic-only` focal card on Home (recommendedAction + success chance); MCA advisor swaps to `adv-only`. Validated
  (23/30/15 across slices).
- [x] **24 · Mission Planner wizard** *(review #2)* — 🧭 Planner tab: `plannerSteps()` 6-step flight plan
  (mission→architecture→design→crew→reliability→launch). Reuses existing pure helpers; Build & Launch gated by
  `canLaunch()`. No new save field. Built 2026-06-23. Validated (18).
- [x] **25 · Side-by-side vehicle comparison** *(review #3A)* — ⚖ Compare designs panel inside Vehicle Family
  card: two dropdowns (current bench + families), six-metric grid (payload/Δv/TWR/rel/cost/time) with better
  flagged green. `compareMetrics(id)` uses `try/finally` to restore live state. `adv-only`. Built 2026-06-23.
  Validated (21).
- [x] **26 · Experimental research failures** *(review #5)* — `checkResearchSetback()` mirrors breakthrough plumbing.
  Fires when `monthsLeft>1`; quality lowers chance. Freezes progress; three resolutions: Fund emergency fix /
  Rework (+2–4mo) / Push through (permanent `state.relDebt` +3%/setback cap 9%, subtracted in `curRel()`).
  `skipResearch` halts at setback. SAVE_VERSION→21. Built 2026-06-23. Validated (24).

> **Incorporation note (2026-06-22):** review's "UI clarity / manufacturing / mission ops" lines up with
> #23/#24 · #7 · #20 — the highest-impact unbuilt work. #11 (modularization) and #10 long-term engine migration
> declined as contrary to the single-file/no-build ethos.

## Engine — hybrid Phaser conversion ✅ DONE (slices 0–3, 2026-06-20)

**Shape:** Phaser 3 via CDN for scenes only; DOM management UI stays framework-free. All Phaser use feature-guarded
(`phaserOK()`). The `vm` harness loads/tests logic with no Phaser global.

- [x] **Slice 0 — Phaser bootstrap + CapeScene** *(2026-06-20)* — `defineCapeScene`/`startCapeGame`; particle
  smoke emitter; breathing camera tween. `drawCape` rendered onto Phaser CanvasTexture. 2D fallback kept. Validated
  (suites green + browser confirmed).
- [x] **Slice 1 — FlightScene** *(2026-06-20)* — `FlightScene` hosts mission playback; native GPU exhaust
  (particle emitters: plume, smoke, staging sparks, explosion debris). Camera shake. Space hotkey. **Booster recovery
  landing** *(2026-06-23)*: M5 reuse visual payoff — recovered stage flies back (grid fins, landing burn, legs, fade
  at touchdown). **NOTE:** Phaser FlightScene disabled 2026-06-25 (CanvasTexture blanked post-ascent phases in user's
  WebGL setup — GPU-texture issue); reverted to proven `createGL2D` renderer. Phaser still powers Cape/bench/map.
- [x] **Slice 2 — VehiclePreviewScene** *(2026-06-20)* — Design Bench rocket preview as Phaser scene; 2× internal
  res; twinkling starfield + engine-base glow + idle bob. Rocket detail pass: cable raceways, panel seams, interstage
  bands, rivets, roundel, specular highlight, bell ribs, capsule windows/RCS.
- [x] **Slice 3 — MapScene** *(2026-06-20)* — Phaser Solar System: drag-to-pan + wheel-zoom, parallax starfield,
  rival-reach + facility markers, click→`selectBody`. Detailed planet textures (procedural 448px per body). Jupiter
  rings with front/back occlusion. **Transfer-trajectory arcs** *(2026-06-23)*: committed window draws dashed amber
  quadratic arc Earth→destination, shared between SVG overview + Phaser MapScene. Validated (16 + suites green).

### Scene realism overhaul (post-conversion, 2026-06-23 — reverted)

> **⚠ Reverted to proven 2D flight renderer (2026-06-25).** Slices 1–3 of the realism overhaul (orbital Earth
> native FX, ascent sky/atmosphere, plume/FX polish) were built on the Phaser-hosted FlightScene but the
> CanvasTexture blanked post-ascent phases. Code kept dormant behind the `startFlightScene` comment. Phaser
> still powers Cape/bench/map; flight uses the solid 2D sky/clouds/plume renderer.

## UI Consolidation — The Mission Control Shell ✅ DONE (8 slices, 2026-06-24)

Source: game-dev layout review (2026-06-24). Promoted the Command Center shell to the whole app: one persistent
frame with a left rail (4 scene selectors + always-on Advisor/Objectives), center viewport (swaps scenes), right
contextual rail, and ⚙ menu. **11 tabs → 4 center scenes + rail panels.** Target click-depth ≤2 for every primary
function.

**Target architecture:** HUD (top, persistent: date·capital·rep·science·▸Advance·⚙ menu) · Left rail (⌂ Space Center · ✎ Design Bench · ⚛ R&D · ☉ Solar System + Advisor + Objectives) · Center viewport (4 scenes) · Right rail (contextual per scene) · Bottom (opsTimeline strip).

- [x] **Slice 1** *(2026-06-24)* — `.shell` CSS grid; `aside.rail-left` + `main.viewport`; all 11 `*View` divs moved
  inside; header/opsbar/log persist outside. Same button ids + `setTab` onclicks; nothing removed. Validated (53 + browser sweep).
- [x] **Slice 2** *(2026-06-24)* — `SCENES` registry (command/bench/rnd/map); `isSceneTab()`/`viewKind()`. Rail regrouped: Mission Control block (4 scenes) above Operations block (7 panels). `render()` tags `#appShell` with viewing-scene/viewing-panel. Phaser pause-not-destroy lifecycle already existed. Validated (29).
- [x] **Slice 3** *(2026-06-24)* — 4 per-view sidebars relocated into `#railRight` as `.rail-panel` wrappers (ids unchanged so render fns untouched). `render()` shows only active scene's panel + toggles `#appShell.has-right`. uiLayer gating preserved. Validated (41).
- [x] **Slice 4** *(2026-06-24)* — `#ccLeft` (advisor + objectives) promoted to always-on left rail. **Planner tab removed** — flight plan folded into rail advisor (reuses `plannerSteps()`). `RETIRED_TABS={planner:'command'}`. Left rail 184→220px. Validated (53).
- [x] **Slice 5** *(2026-06-24)* — **Missions tab removed.** Contracts + passive income moved to `#railContracts` right-rail panel. Hub drill: `hubPanel` ('alerts'|'contracts'); `openHubPanel('contracts')` from Cape Mission Control building. `RETIRED_TABS.missions='command'`. Validated (68).
- [x] **Slice 6** *(2026-06-24)* — **Programs/Rivals/Personnel tabs removed.** Each to a live modal: Programs→left-rail Objectives "Programs→" link, Rivals→right-rail mini-leaderboard + `showRivalsModal()`, Personnel→Cape building + `showPersonnelModal()`. `tabIntent(t)` router + `RETIRED_TABS` migrations. `activeModal` thunk; `closeLiveModal()` on nav. Validated (85).
- [x] **Slice 7** *(2026-06-24)* — **Infrastructure tab removed.** 3 Cape buildings (Manufacturing/Production/Orbital Ops) → `showInfrastructureModal()` live wide modal. Live: founding/expanding/trading refresh in place; nav closes it. Validated (95).
- [x] **Slice 8** *(2026-06-24)* — HUD **⚙ Menu** modal (animation/wide/fullscreen toggles, Save/Load/New, Settings panel). Opsbar drops to 1 ⚙ button + View toggle + Advance + Skip. **Settings tab removed.** Left rail now purely 4 scene selectors. Validated (104 + full browser sweep).

**Epic status:** all 8 slices shipped. 11-tab bar → 4-scene Mission Control shell. Headless suite 104/104.

## Visual & UX Review — Presentation Pass (2026-06-25)

Source: review 2026-06-25 (UI 7.5 · Presentation 7 · Info-architecture 8 · Long-term scalability 9 · Visual immersion 6). Headline picks: living Command Center, visual rocket-assembly bench, lower density, trend graphs, animation.

**Decision (2026-06-25):** folded in with a recommended priority (not a commitment).

### Reconciliation table (review's 12 points ↔ code reality)

| Review point | Status vs. shipped code | New work & where it's tracked |
| --- | --- | --- |
| **1 · Living Command Center** | Largely shipped — **#18** animated iso Cape + **#17** visible facilities | Distinct art tiers → **#18/#17**. Weather/day-night → **#18/#20**. |
| **2 · Reduce density ~30%** | **Shipped** — **#23** Basic/Advanced/Expert + Shell HUD | Done. |
| **3 · Persistent "Next Goal" hero panel** | **Shipped** — **#23** slice 3 focal card + always-on left rail (Shell slice 4) | Minor nuance: surface "unlocks" → **#23/#18**. |
| **4 · Slide-out drawers** | **Shipped in substance** — right rail + hub drill-ins + modals | Literal slide *animation* → **#31**. |
| **5 · Scenes 70% visual** | **Shipped** — 4 Phaser scenes as center viewports | Done. |
| **6 · Design Bench as "rocket factory"** | Phaser preview exists, editor is form-like | **→ #27** ✅ done 2026-06-25. |
| **7 · Systematic color-coding** | Ad-hoc only | **→ #30** ✅ done 2026-06-27 (4 slices). |
| **8 · Sparklines everywhere** | `materialSparklineSVG` + history buffer shipped | **→ #28** ✅ done 2026-06-25. |
| **9 · Icon-first nav + keyboard** | Icon-first shipped — Shell rail SCENES icons | Keyboard shortcuts → **#32** ✅ done 2026-06-25. |
| **10 · Solar System layers** | Tracked — **#13** + **#21** | Layer-toggle + spacecraft traffic → **#13** + **#21**. |
| **11 · More motion / microanimations** | Partly shipped — Phaser scene life | **→ #31** (includes rail-drawer slide). |
| **12 · Flight & Ops log → filtered timeline** | Log exists | **→ #29** (partially: timeline strip shipped; filters open). |

### New items from the review

- [x] **27 · Visual stage-stack Design Bench** *(review #6, 2026-06-25)* — Rocket preview as centerpiece sticky column in `.bench-stage` grid. `renderStages` rebuilt as `.stage-card`s: drag-handle (HTML5 DnD → `moveStage(from,to)`), collapse toggle, thrust bar, engine/propellant chip, role label, Δv badge. Build & Launch CTA moved under the rocket in `#benchLaunch`. No new save field. Validated (bench-nav 28/28 + launch 13/13).
- [x] **28 · Sparkline dashboards** *(review #8, 2026-06-25)* — `sparklineSVG(points,opts)` (auto-scaling, green-up/red-down). `state.metricHist` ({money,rep,support,success,science}, 24-month buffer). `pushMetricHistory()` in `advance()`. `adv-only` `.exec-sparks` strip on exec overview. SAVE_VERSION→22. Validated (40).
- [x] **29 · Filtered Flight & Ops log timeline** *(review #12)* — ✅ DONE (2026-07-05). Category filters (All/Launches/Research/Economy/Rivals/Crew/Infrastructure) + per-entry icons + collapsible timeline — see the #29 session log for the implementation.
- [x] **30 · Domain color-coding language** *(review #7, 2026-06-27 — 4 slices)* — 7 `--dom-*` CSS custom properties (economy/engineering/research/military/exploration/crew/warn). Utilities: `.dom-<domain>` (tints metric label), `.dombar-<domain>` (panel left-accent), `.dom-dot` (chip). `DOMAINS{}`/`domColor(d)`/`domDot(d)`. Applied: Slice 1 top status bar + manufacturing panels; Slice 2 scene accents (R&D/map/bench/personnel/rivals); Slice 3 exec-overview headline metrics; Slice 4 Design Bench readout metrics (cost=economy, reliability=engineering, crew module=crew; pure-perf lines neutral). Validated (/tmp/ov-dom.js 23→29→36→41/41). **#30 DONE.**
- [x] **31 · UI microanimations pass** *(review #11/#4, 2026-06-29)* — `_statBump()` flashes HUD stats green/amber on change; `_lastUnlockedTech` + `.tech-just-unlocked` amber-glows newly researched R&D node; `_missionPulse` pulses rep stat green/red after flight outcome; `.modal-entering` slide-in on every `showModal()`; `_prevLogLength` guards `.tl-chip-new` slide on newest ops-timeline chip; `_applyObjSparkle()` + `data-obj-id` + `.obj-just-done` sparkles objectives that complete while the panel is open. Validated 45/45.
- [x] **32 · Keyboard navigation** *(review #9, 2026-06-25)* — Tech-tree zoom (0.5–2.4×, wheel/toolbar/arrows/0-reset) + scene keyboard nav: ESC = close modal / back from contracts drill / return to Command; TAB/Shift+TAB = cycle scenes; 1–4 = jump to scene. Never hijacks INPUT/TEXTAREA/SELECT; ignores modifiers + flight-playback. Validated (bench-nav 28/28).

**Recommended priority:** #28 ✓ · #27 ✓ · #32 ✓ · **#29 (next up)** · #30 ✓ · #31 (polish).

## Bench Customization (mini-epic) ✅ DONE (BC1–BC5, 2026-06-25)

- [x] **BC1 · Cosmetic livery** — `state.livery` ({body,accent,nose,name}). `drawVehicle` reads `curLivery()`: hull gradient from chosen color, accent stripe per stage, three nose styles (ogive/cone/blunt; crewed=capsule). 🎨 Livery card in bench editor. SAVE_VERSION→23. Validated (20).
- [x] **BC2 · Performance parts** — `state.parts` ({tank,avionics,fairing}). Tank material → `curSigma()` scales σ (+Δv/cost/rel tradeoffs); avionics tier → `partsRelBonus` (+3/+6%); payload fairing → mass/cost/rel (excluded on crewed). Default = zero-impact baseline (existing balance untouched). 🔧 Performance Parts card. SAVE_VERSION→24. Validated (32).
- [x] **BC3 · Per-stage geometry** — `st.dia` (0.7–1.4, default 1.0 = today's exact shape). Wider = more structural mass + +rel; narrower = lighter + −rel. `tankStruct(prop,dia)` scaled. Shape reflects in preview + flight. No SAVE_VERSION bump (nested optional). Validated (22).
- [x] **BC4 · More part variety** — 3 sidegrade engines: LR79 (more thrust, lower Isp, cheaper; on `kerosene`), RL10-class (high-Isp cryo upper; on `cryo_upper`), Methalox Vacuum (vac-optimized; on `methane_propulsion`). Switched nodes to `effect.engines[]`. No SAVE_VERSION bump. Validated (23).
- [x] **BC5 · Saved designs (blueprints)** — `fullBenchSnapshot()` captures stages/boosters/transfer/descent/ascent/ECLSS/power/recovery/livery/parts. `state.blueprints[]`. 💾 Saved Designs card (name + Save; Load/Delete per row). SAVE_VERSION→25. Validated (25 incl. topbar checks).

## Polish & fixes (2026-06-25)

- [x] **Pinned top bar** — `position:sticky` `.topbar`; `--topbar-h` CSS var synced by `syncTopbarH()` on render+resize; offsets sticky right rail and bench rocket.
- [x] **Flight FX robustness (repeat-launch reuse bug)** — Rebuilt scene fresh each launch: `startFlightScene` sets `flightPending` then calls `flightScene.scene.restart()`; all emitters/sprites recreated clean. Generated textures cached via `exists()` guards.

## Tech-Tree Rebalance (2026-06-27)

- [x] **Lunar gate decoupled from lift** — Changed `deep_space.req` from `['heavy_booster','digital_computer','stage_test']` → `['digital_computer','sustainer']`. Pre-lunar chain: **12→7 nodes, 42→24 months (3.5→2.0 yr)**; lunar_lander 56→38mo; mars_traj 49→31mo. Cost trimmed $5.0M/6mo → $4.0M/5mo. Pure static-data change. Validated (tree.js: prereq closure, no dangling reqs, reachability; + ov-reentry-station.js 28/28).

## Gravity-Loss Model — TWR now affects Δv (2026-06-27)

- [x] **Gravity losses from low TWR** — Per stage in `stackPerformance`: `effectiveDv = idealDv·(1−gravLossFrac)` where `gravLossFrac = clamp(K·max(0,(nom−TWR)/nom), 0, cap)`. Stage 1: `GRAV_NOM_TWR0 1.25`; upper stages: `GRAV_NOM_TWR_UP 0.40`. `GRAV_LOSS_K 0.55`, `GRAV_LOSS_CAP 0.40`. Sensibly-thrusted stages (TWR ≥ nominal) are untouched — only anemic stages bleed Δv. Exposed as `stageGravLoss[]` + total `gravLoss` through `computeVehicle`. Per-stage `grav −X m/s` chip + TWR@ign coloured by loss bite; readout Gravity loss metric. No new state, no SAVE bump. Validated (45/45).

## Design Bench UX — sticky rocket + editor tabs (2026-06-27)

- [x] **Build & Launch on top + rocket always in view + editor tabs** — (1) B&L CTA moved above rocket in `#vehicleCard`. (2) `.bench-rocket` `max-height:calc(100vh−topbar−20px)` + `overflow:auto` so whole card stays pinned. (3) Editor cards grouped into 4 tabs — **Vehicle** (stages+boosters), **Modules** (transfer/lander/crew/power), **Customize** (livery/parts/blueprints/family), **Mission** (architecture/window/routes). `renderBenchTabs()` hides empty tabs. Validated (ov-reentry-station 55/55).

## Always-visible Ops Timeline (2026-06-27)

- [x] **Flight & Ops log → pinned top-bar timeline** *(Partially delivers #29)* — Relocated log into `#opsTimeline` in `.topbar`. Layout: leading **DATE** chip, then **UPCOMING** items (active R&D, in-progress builds, committed window), then recent log newest-first. Clicking chips navigates to relevant screen via `logNav()`. No persisted-state change (additive `nav` field on log entries). **Still open under #29:** category filters + collapse toggle. Validated (55/55: `log()` nav, `logNav` inference, `upcomingEvents`).
- *Fix 2026-06-27:* flight overlay `.animwrap` raised to `z-index:70` so launch scene sits above pinned top bar (40).

## Readout clarity — engines, TWR, module stats (2026-06-27)

- [x] **Per-stage TWR + engine data** — Per-stage **TWR@ign** (SL thrust for stage 1, vac for uppers) added as `stageTwr` through `computeVehicle`; each stage card shows full engine-spec line (Isp SL/vac, thrust SL/vac, ×count, mass, R&D bonus). TWR warnings rewritten to be honest (liftoff TWR gates flight; upper-stage advisory only). Display-only, no physics change. Validated (36/36).
- [x] **Station module engineering stats** — Station Bench `stats` block (volume m³, crew capacity, module mass, power gen/draw/net kW, consumables, docking ports) rendered in `#stationStats` grid. Validated (36/36).

## Graphics & Scenes (2026-06-27)

- [x] **Capsule reentry & recovery scene** — `flightHasReentry()` gate (success + `isOrbital` + crewed). Three beats: **plasma** (blunt-body capsule in bow-shock with G-load/skin-temp telemetry), **chutes** (drogue at p0.52, three mains at p0.66 with inflation/risers), **splashdown** (water droplets + rings + chutes collapse + "SPLASHDOWN ✓"). Pure-canvas on live renderer. No SAVE bump. Validated (28/28: gating truth-table, phase dispatch, beat rendering).
- [x] **Station Bench — framework slice** — Fifth scene tab (`⬡ Station Bench`) with Phaser-camera pan/zoom + ⛶ Expand. `StationScene` renders annotated "can"-type module (hull, docking nodes, radial ports, solar wings, radiator, dish + leader-line labels). `STATION_MODULES`/`stationActiveModule()` as data seam for future assembly. Wired through `SCENES` (SCENE_TABS→5, keyboard `5`). No SAVE bump. Validated (28/28). **Explicitly a framework — assembly/economy fleshed out later.**

## Presentation & Theming (2026-06-28)

- [x] **Theme variants — Control Room Green + Apollo Beige** — Two optional nostalgia palettes selectable from the ⚙ Menu alongside the default **Mission Dark**: *Control Room Green* (phosphor-CRT green-on-black, amber alerts) and *Apollo Beige* (warm 1960s console — espresso/tan panels, cream text, Apollo orange + console teal). Implemented purely as `body.theme-*` CSS-var overrides, so the whole DOM UI re-tints with one class (chrome only; cinematic canvas scenes keep their art direction); each also retints the drafting-grid background. `THEMES` registry + `applyTheme()` (boot) / `pickTheme()` (live). Persisted in `localStorage` (`ov_theme`) like the Wide-mode pref — survives reloads/new games, **no SAVE_VERSION bump**. Validated headlessly (`/tmp/ov-theme.js` 15/15: registry, body-class toggling, persistence, invalid-name fallback, render+menu smoke).
- [x] **Tab cross-fade** — Scene switches fade out → swap → fade in over 150ms (`transition:opacity` on `.viewport` + `setTab` opacity sequence; same-tab clicks skip the animation). Display-only, no SAVE bump.
- [x] **Typography system** — 28px uppercase `.scene-title` per scene, explicit `h1`/`h2`/`h3` scale, `--fs-*` scale vars in `:root`, and every sub-11px label bumped up to an 11px floor (tooltips excepted); secondary labels get 0.7 opacity. Display-only.
- [x] **Command Center scene overhaul** — Fixed floating rooftop greebles (now iso-diamond AC stacks); added drifting clouds and detailed road traffic (crawler-transporter, LOX tanker, crew bus, fire truck) with standing ground crew. Vehicles follow the actual road network in grid space and are merged with buildings + growth into one `gx+gy` depth-sorted painter's pass, so they're correctly occluded instead of always drawn on top. Crawlerway detours east of Orbital Ops; the crawler is a one-way delivery that parks at the pad and resets off-screen (no ping-pong). Pad rocket scaled **physically** (fixed px/unit) so a first-launch rocket reads as tiny and bigger vehicles visibly grow toward the gantry. Launch Pad label shifted left to clear the rocket. Validated headlessly (`/tmp/ov-cc-traffic.js` 4067/4067). No SAVE bump.
- [x] **ROADMAP condense** — Compressed 3691→578 lines, all content preserved (completed milestones, CE1–CE5, Time Granularity, #7/#30/#6 from multi-paragraph narratives down to 3–8 lines each); forward-looking sections, reconciliation tables, "How we work", and "Repo" kept intact.

## Design-Critique Epics — Depth & Stakes ✅ ALL DONE CE1–CE5 (2026-06-26/27)

Source: brutal-honesty design pass (2026-06-26). Diagnosis: codebase optimised to *protect the simulation*
(bounded caps, rivals-on-rails, snowballing income, single-roll launches) rather than to *pressure the player*.
These five epics deliberately add scarcity, irreversibility, a real opponent, a rising stakes curve, and live
decisions. **These intentionally break "balance exactly preserved" where it conflicts with player payoff.**

### CE1 · Rival Agent Model ✅ DONE (a/b/c, 2026-06-26)

**Problem:** `RIVALS` hardcoded calendar-firing with no state, no budget, no reaction. Can't out-compete an opponent that isn't simulated.

**The fix:** Goals-not-dates. `tickRivals()` accrues `income·momentum` and fires a goal when capital clears cost. Momentum ∝ (rivalIdx − playerFirsts); rubber-band floor so dominated rival never fully stalls.

- ✅ **Slice (a)** — `RIVAL_PROFILES` + `state.rivalState[id]={capital,momentum,idx,prevYear}` SAVE_VERSION→26. `tickRivals()` accrues + buys goals. `seedRivalState()` migrates legacy saves. Validated (16: nominal pacing, lead pull-in, dominated slip, rubber-band, migration, 300-month no-throw).
- ✅ **Slice (b)** — 3 player levers: (1) contract crowding `rivalCrowdFactor()` starves rival accrual; (2) firsts-denial `denyRivalGoal()` on mission success cuts rival capital + momentum; (3) poaching war: `counterPoach(rivalId)` costs $2.5M, knocks rival momentum −0.25, lifts staff morale. Validated (26).
- ✅ **Slice (c)** — `rivalProjectedYear(r)` live projection. Standings panel: momentum arrow, projected year (shifts as player acts), Counter-poach button. `ccTimeline()` emits dashed projected markers. Validated (16: projection reactivity, historical-floor cap, timeline markers).

### CE2 · Power Curve ✅ DONE (a/b/c, 2026-06-26)

**Problem:** Every research effect folds into a hard cap — a 100-node tree where the marginal node is +2% into a ceiling kills the tech-tree power fantasy.

**The fix:** Keep *flyability* caps (Isp +10%, thrust +15%, reliability) — these guard the rocket equation. Release *economy* caps to a diminishing-but-unbounded curve. Add throughput scaling and a juggernaut capstone.

- ✅ **Slice (a)** — `dimCurve(sum,cap,asymptote)`: identity at/below the old cap (exact balance preservation below), C1-smooth past it, asymptotes toward but never reaches `asymptote`. Wired: `mfgBuildMult`/`groundLaunchMult` (cap 0.30 → asymptote 0.80), `buildTimeCut` (cap 3 → asymptote 6mo). Physics caps left on hard `Math.min`. Validated (25: identity ≤ cap, C1 slope, asymptote-bounded, cost always >0, floor ≥1, sciYield still capped).
- ✅ **Slice (b)** — Launch cadence: `launchPadCap()` == Pads level = launches/month. `canParallelLaunch()` for rapid prebuilt flights. `padMonthAbs`/`padMonthUsed`. SAVE_VERSION→27. L1 = today's exact behavior. Validated (25: cap==level, rollover, full gate, L1 serialized, end-to-end tempo table).
- ✅ **Slice (c)** — Juggernaut capstone: `isJuggernaut()` = all 4 prod lines at max + `automated_factory`. `setStandingProduction()` snapshots bench; `tickStandingProduction()` rolls 1 copy/month into hangar (bounded by `standingStockCap()`=2×pads + $3M floor; pays full cost). JUGGERNAUT badge + gold panel. SAVE_VERSION→28. Validated (30).

### CE3 · Strategic Identity ✅ DONE (a/b/c, 2026-06-26)

**Problem:** Nothing in the tree is mutually exclusive — "specialization" is just sequencing; "what kind of company am I?" is cosmetic.

**The fix:** One-time semi-irreversible Doctrine choice + branch opportunity cost + hard lunar architecture fork.

- ✅ **Slice (a)** — `state.doctrine` (null = undeclared = today's neutral). 5 doctrines, each bonus+penalty: Reusability/Heavy-Lift/Commercial/Statecraft/Science. `doctrineMult(key)`/`doctrineRelMod()`/`rdCostOf(r)` thread through all economy hooks. First declaration free; switch = `doctrineSwitchCost()` (≥$8M) + 20 rep + 6mo. SAVE_VERSION→29. Validated (39).
- ✅ **Slice (b)** — `branchAffinityMult(track)` = `clamp(1−min(0.35, 0.035·aff)+min(0.30, 0.030·gap), 0.55, 1.30)`. Folded into single `rdCostOf(r)` hook. Purely derived from state — no SAVE bump. Specialist $2.64M vs generalist $3.61M at the same node. Validated (24).
- ✅ **Slice (c)** — Committed lunar architecture fork: LOR→`lunar_lander`, Direct→`heavy_lift_infrastructure`, EOR→`orbital_assembly`. `missionTechMet(m)` single gate helper. `commitLunarArch()`: first free, switch ≥$20M + 8mo. SAVE_VERSION→30. Validated (38: each path independently unlocks the mission, mutual exclusivity, backward-compat).

### CE4 · The Stakes Curve ✅ DONE (a/b/c, 2026-06-26/27)

**Problem:** Tension trivial late-game once royalties + passive + facilities + gov stack against flat overhead.

**The fix:** Make ambition expensive to *hold*, not just to buy.

- ✅ **Slice (a)** — `empireOpex()`: monthly carrying cost from what you've built. `EMPIRE_FAC_OPEX_BASE 0.6` + `_MODULE 0.45`/extra module + `_DEPOT 0.02`/t + `_BELT 1.5` while Belt claim runs + `_HANGAR 0.15`/parked vehicle + `_DIV 0.25`/invested division. **Exactly $0 fresh** (derived from existing state, no SAVE bump). Wired into all 3 burn sites (`advance()`, `lastMonth.mExp`, `commandSummary.overhead`). Validated (26: $0 fresh, rises with each dimension, in the burn, shrinks net; idle empire $11.25M/mo → −$5.17M/mo net).
- ✅ **Slice (b)** — Standing resupply-or-decay: per-facility `supply` meter (`FAC_SUPPLY_MONTHS 8`), drains 1/mo. Starved: output ×0.4, bleeds rep+support, after 6 months evacuates a module. `resupplyFacility()` instantaneous contracted launch: cost ∝ modules × bodyResupplyMult (earth 1.0 / moon 2.2 / mars 4.2) × (missing/cap). Legacy saves provisioned. SAVE_VERSION→31. Validated (29: cost scales size+distance, starvation effects, legacy compat).
- ✅ **Slice (c)** — Era-scaled failure stakes + bailout retune. `applyEraStakes()` on severe losses: −22% of current rep + collapse public support 8 + spike rival momentum 0.22, all ×`eraStakesFrac()` = eraIndex/(ERAS−1) → **0 in Pioneer** (early game provably unchanged). Bailout: era-scaled principal + steeper rep cost + **permanent loan interest** (`state.loanInterest` += amount×0.06, folded into all 3 overhead sites). SAVE_VERSION→32. Validated (18).

### CE5 · Live Launch ✅ DONE (a/b/c, 2026-06-27)

**Problem:** `resolveFlight()` resolves in one hidden instant. High reliability = boring; low = feels unfair.

**The fix:** Phase-split flight; near-miss surfaces a live call (abort/press-on or bank/burn). Agency, not power — high-R flights rarely prompt a call; risky flights become decisions.

- ✅ **Slice (a)** — Phase-split `resolveFlight`: `FLIGHT_PHASE_ORDER` (pad→ascent→staging→coast→deep→return); `SUBSYS_PHASE`/`livePhaseOf`. `flightPhaseBreakdown(report)` groups subsystems per phase; ∏ phaseRel = overall R exactly. `resolveFlight` attaches `phases`+`govPhase`; outcome selection unchanged. Validated (15: ∏phaseRel=R within ε, phases canonical/non-empty, 20k rolls ≈ R).
- ✅ **Slice (b)** — Near-miss live abort/press-on: `liveCallFlag(outcome)` flags worst loss-severity early-phase subsystem in amber band (rel ≤ 0.94) when R ≥ 0.40. Deterministic, no RNG. Only when `animEnabled && (crewed || !routine)`, never headless. **Press on** = exact rolled outcome (balance-neutral). **Abort** = new `scrub` outcome: vehicle+crew recovered, mission+payout forfeit, rep −min(rep, crewed?8:5), no crew loss, no stand-down. Validated (31 + ce5-regress 9/9).
- ✅ **Slice (c)** — Deep-leg reserve-margin (bank/burn): `deepReserveMargin(sim)` = tightest spare-dV fraction across in-space legs. `deepCallFlag()` flags drifting deep subsystem (deep_propulsion/life_support, amber band) when reserve ≥ 0.08. **Bank** = exact rolled outcome (balance-neutral). **Burn** = guaranteed salvaged `partial` (PARTIAL_PAYOUT_MULT haircut; crewed → crew home). No new state, no SAVE bump. Validated (26).

**Build sequence:** CE1 → CE2/CE3 → CE4 → CE5. All done.

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
   - [ ] **4c — short-fuse events/contracts in days, finer cadence, and duration re-authoring** *(deferred from 3c)* — day-scale build/research/facility minimums (e.g. short build in days, not a forced 1-month floor). Lower priority — core daily-time payoff delivered. *Validation: event-fuse + cadence checks; CE re-pin if durations are retuned.*

5. [ ] **(Optional, later) True Gregorian calendar.** Variable month lengths + leap years, purely cosmetic over the 30-day-abstracted economy.

**Risks / watch-items.** Save migration; performance (360 iterations/year not 12 — keep per-day path light); `lastMonth` + sparklines aggregate days→months; double-check `absMonth()`-keyed systems (pad cadence CE2(b), synodic windows) after the switch. **Cross-ref:** `advance()` funnel, CE2(b) launch cadence, CE4 carrying cost/resupply, M3b window planner, #28 sparklines, #18 cashflow panel.

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive

## Session — Balance/UX audit, trap-node wiring, Station Bench slice 2 (2026-07-02)

**Context.** User uploaded the live game file for a fresh audit: "improve overall cohesiveness, playability, and features... think like both a game developer and a KSP/Stellaris fan." Full playthrough simulation (headless bot, 50-trial survival tests) surfaced that idle play was earning money (government funding paid at neutral public support), making the treasury a non-issue. Fixed, then worked through the priority list the audit produced.

### Balance & cohesion pass ✅ DONE (commit `f9b2ec8`)

- **Economy tension:** `govMonthlyFunding()` now pays only for public support *above* neutral (50), full grant at 80; goodwill above neutral decays at half the rate bad blood heals (sticky). Windfall/grant events gated on an active program (flight in last 36 months, active research, or support > neutral+3) — an idle agency stops attracting money. Napkin difficulty keeps a small floor grant as its forgiving identity. **Idle-only play now bankrupts in ~4 years** (was: grew from $5M to $88M over 30 years, confirmed via headless sim).
- **Runway tracking:** `runwayMonths()` + one-shot treasury warnings at 12mo/6mo remaining.
- **Government Mandates (new system):** periodic (every ~15mo) offer to fly a specific achievable mission by a deadline for a cash bonus (0.65× payout, era-scaled) + support swing (+8 fulfilled / −10 missed). The designed replacement for the old ambient grants — earned bridge financing that makes the calendar matter. `MANDATE_COOLDOWN_MO`/`MANDATE_BONUS_MULT` are the tuning knobs if pacing needs adjustment.
- **UX:** attention badges (`tabAlerts()`/`renderTabBadges()`) on all 5 scene tabs — treasury danger, mandate deadlines, staff morale crises, expiring passive contracts, a vehicle design that can't fly the active mission, an idle R&D lab with affordable research, an imminent committed launch window. Δv shortfall message now quantifies the exact gap instead of a vague "build more capability." Launch re-entry guard while any decision modal (`_pendingLaunch`/`_pendingLive`/`_pendingSetback`) is open. Type floor lifted ~200 instances (10px→11px, 11px→12px) for readability.
- **Milestone celebrations:** every first-time mission completion gets a fanfare modal framed against the rival space race ("You beat Vostochny Dynamics to it by 3 years" / "Meridian got there first — but flying it yourself is what builds an agency"), historical footnote, and reward readout.

### Trap-node wiring ✅ DONE (commit `f9b2ec8`)

All 7 research nodes that previously had `effect:{}` (purchasable, cost real money/months, did nothing) now have real mechanics:
- `cryo_boiloff_control` — new mechanic: LH₂ (CH₄ at half rate) in-space stages lose propellant over long coasts (1.5%/mo uncontrolled, capped 30%); node cuts rate ~4× to 0.4%/mo. Surfaced in mission readout + leg table. Validated: hypergolics immune, MISSIONS data never mutated, hydrolox Mars prop floor rises 100t→175t uncontrolled, research buys it back to 100t.
- `gravity_assist_planning` — −8% Δv on Jupiter/Saturn/Belt transfer legs, marked on the leg row.
- `orbital_eva` — crewed reliability penalty 0.92→0.95.
- `surface_fission_power` — −25% facility standing resupply cost.
- `onorbit_servicing` — unlocks the Satellite Servicing Fleet passive contract ($2.6M/mo, 150 rep).
- `megawatt_electric` — +10% Isp on all electric drives (Hall/Ion/NEP), via `reconcileEngineMods()` against captured base values — survives save/load/newGame without double-applying.
- `fusion_propulsion_research` — unlocks the new **Daedalus Fusion Torch** engine (Isp 6000s, real thrust 60kN) — the Speculative-era capstone drive.

### Station Bench slice 2 — full module assembly ✅ DONE (commit `5c60c8c`)

Previously a placeholder tab (one annotated sample module, no assembly). Now a real designer wired to actual built facilities:
- **Module library** (`STATION_MODULES`, 6 types): Habitat (`can_std`, power-positive core), Research Lab, Solar Power Truss, Docking Node (adds +3 ports), Propellant Depot Module (needs `orbital_depot`), Greenhouse (needs `eclss_partial`, −15% resupply + self-feeding).
- **Per-facility assembly:** `fs.moduleList[]` (legacy saves migrate lazily — old generic module counts become Habitats). `addStationModule()`: cost = module base × body multiplier × size escalation; build months advance the calendar; assembly flight refreshes supply clock.
- **Typed production:** facility output = base + Σ(docked module `prod` × body multiplier); **power-starved stations (draw > gen) run at 60%** — labs are science engines but power-hungry, forcing a Power Truss.
- **Port caps:** 4 base slots, +3 per Docking Node.
- **New bench UI:** facility selector tabs (when multiple built), assembled-stack side-view SVG with per-module-type silhouettes, aggregate stats panel (mass/crew/power/income/science/resupply) with power-starve and port-cap warnings, 6-card dock palette with live cost/gate/afford state.
- Legacy `expandFacility()` (Command Center quick-expand) now routes through the typed path, adding a Habitat.

**Validated headlessly (all three):** boot, all 5 tab renders, flight resolution, save/load roundtrip, idle-bankruptcy pacing (4yr), boil-off margins, engine-stat reconciliation across save/load/newGame, full assembly flow (found→dock lab→power-starve→dock truss→recovers→port cap blocks→node raises cap→greenhouse gate+resupply cut→legacy expand→migration→render→save/load).

### Post-session corrections (2026-07-02, later same day)

The "recommended next steps" list below was written before several more commits landed later
the same day (`1e9de2df`→`b7ba8fb5`). Verified directly against the live repo file — items 1,
3, 4 were built; item 5 was addressed by design (not a bug); item 2 remains genuinely open:

1. ✅ **DONE** (`1e9de2df`) — `missionNetEconomics()`/`missionNetHTML()` now show true margin
   after mission-duration carrying costs, wired into both the mission list and detail readout.
2. ⬜ **STILL OPEN** — confirmed via code read: `renderMapActivity()` is a side card (market
   events + rival frontier), not an on-map overlay. No planned-trajectory line or live
   depot/base/in-flight-mission markers drawn on the map scene itself yet.
3. ✅ **DONE** (`f226159d`) — Engine differentiation: heritage system (`state.engineHeritage`,
   flight-count-based cost/reliability bonus), solid-motor simplicity discount + insertion
   reliability tax (`SOLID_SIMPLICITY_DISCOUNT`, `SOLID_INSERTION_REL_TAX`).
4. ✅ **DONE** (`5b42187e`) — Cape status glyphs: `buildingGlyph()`/`GLYPH_COLOR`, live
   attention/active/ok/idle state per building on the home screen.
5. ✅ **ADDRESSED BY DESIGN** — the low-payout science missions (`space_telescope`,
   `sample_return`, `astrobiology`) are explicitly commented in the source as "#3: prestige
   science missions — pay little money, but bank a large knowledge windfall (sciYield)". Not
   a balance bug; intentional payout/knowledge tradeoff. Not revisited.

**Also shipped same session, beyond the original list:**
- `0ea922e1` — Station Bench finished: crew requirements (`facilityCrew`), synergies
  (`facilitySynergies`), station-wide R&D speed bonus (`stationRdSpeedBonus`).
- `b7ba8fb5` — Tech tree interaction layer: track/status filters, prereq-chain path
  highlighting on node focus (`techPrereqChain`, `setTechFilter`, `setTechFocus`), per-track
  progress.
- `aef0edd4` — Debloat pass: removed dead code, consolidated duplication (−226 lines).

### Recommended next steps, in priority order (corrected)

1. ✅ **DONE — Solar system map asset overlay ("Empire Layer")**. One shared model
   (`mapAssetModel()`/`plannedRoute()`/`empireStripHTML()`) rendered with parity in both the
   SVG map and the Phaser MapScene: player presence pennants (pulsing) on every body with
   completed missions + firsts tooltip; facility markers with health rings (green nominal /
   amber strained: low supply, power-starved or under-crewed / red starved, blink rate encodes
   urgency) + module-count pips; LEO depot arc-gauge around Earth; ISRU picks on Moon/Mars/Belt;
   Belt mining-claim pulse ring; planned-route arc for the ACTIVE mission (cyan when the design
   closes, red with "Δv short" when it doesn't; committed windows keep the existing amber
   animated arc); empire ledger strip above the canvas (bodies reached, facilities+modules,
   depot tonnage, Belt claim, space income/mo). Note: true "in-flight mission" markers are not
   representable — missions resolve with a calendar jump, no persistent in-flight entity exists;
   planned+committed routes cover that intent. Validated headlessly across empire states
   (fresh/flags/facility health transitions/depot/ISRU/claim/route feasibility/strip/regression).
2. *(No other open items from the original audit — re-audit before adding new ones.)*

**Repo state:** all changes on `main` through commit `c4b88dc9` (this file). Live file is
`orbital-ventures.html`, ~972K chars. Pushed via Git Data API (fine-grained PAT, treated as
compromised/revoked immediately after use per standing practice).


## Flow-architecture pass — the one-more-turn machine (2026-07-02)

Full re-audit as a KSP/Stellaris player. Finding: the game had more simulation
depth than most shipped tycoons but no *pull* — timers existed (research, builds,
station modules, mandates, windows, contracts, rival firsts) but were scattered
across five tabs and invisible from wherever the player stood, so advancing time
felt like admin, not anticipation. Also a genuine bug: auto-run time didn't stop
for anything but game-over. Five features, all pushed:

1. THE OUTLINER (commit 6cbde36) — one ETA-sorted strip of everything in flight,
   on every scene, above the contextual rail. Research/builds/mandates/windows/
   expiring contracts/special contracts/next rival first/treasury runway, each
   row clicking through to its home. Converts existing timers into anticipation.
2. SMART TIME (commit 6cbde36) — timeInterrupt() halts auto-run + flags skips;
   fires from every modal plus research/build completion, treasury critical,
   mandate offers. runToNextEvent() = the Stellaris 'play until something happens'
   button on the outliner.
3. THE AGENCY CHRONICLE (commit 885ab9c) — state.firstDates + crewFlown/crewLost;
   merged player-vs-rival timeline of firsts; legacyScore() -> S/A/B/C/D grade
   (firsts, worlds, facilities, safety minus scooped + crew lost). showChronicle()
   openable anytime (Command Center button), fires as 'an era closes' ONCE at the
   soft scoring date (1990) with continue-or-retire, and is the retirement
   ceremony. Open-ended play never removed.
4. SPECIAL CONTRACTS (commit 555de83) — 5 procedural modifiers x a completed
   mission x historical flavor; one live at a time, cooldown-gated, ~coinflip
   arrival; fly the matching mission for a bonus + support + rep. Outliner entry,
   Missions-tab banner, timeInterrupt on arrival. The commercial cousin of
   mandates.
5. SESSION BOOKENDS (this commit) — showRecap() on load: date/treasury/rep/
   flights, top-3 outliner items, advisor recommendation. Back in the loop in
   30 seconds instead of re-reading five tabs.

Prune/alter notes for later: Materials market is the deepest system with the
weakest pull — recommend collapsing its surface into Manufacturing and adding one
real decision (bulk-buy on a dip). Verify doctrines/partnerships surface in the
advisor+outliner or they stay invisible to the flow. Nothing recommended for
outright deletion — every system earns its keep once visible in the flow.

## Materials-market collapse (2026-07-03)

Picked up the flow-architecture pass's prune note directly. The Materials card
had the mechanical depth (mean-reverting spot price, weighted-avg stock, 12-mo
contract lock) but the weakest pull in the game — a two-commodity dashboard
with 4 buttons each that nothing else in the flow ever pointed at.

**Collapsed to one decision.** Routine per-unit buying (+1/+6) and the
contract-lock offer are retired. In their place: a commodity crosses into a
"dip" band at spot ≤0.88×; while it's there, one bulk-buy (`buyMaterialDip`)
tops the yard up to 8 builds-worth (capped by remaining yard room) at a further
5% below the already-discounted spot. Outside the dip band the row shows
"watching for a dip" and there's nothing to click. `MATERIAL_DIP_THRESHOLD`/
`_BONUS`/`_BATCH` are the tuning knobs if the cadence needs adjusting.

**Render collapsed to match** — the Manufacturing Capacity card's raw-material
section went from a sparkline+contract+stock+2-buttons block per commodity to
one compact row: spot price, coverage, and the single dip action (or the
watching state). Sparkline gained a shaded dip-band so the strip reads "on
sale" at a glance without reading the number.

**Surfaced in the flow, not just the tab** — matching the note's own standard
("verify it surfaces in the advisor/outliner or it stays invisible"): the Cape
`mfg` building glyph and the Outliner (`outlinerItems()`) both now flag a live,
affordable dip, the same way research/builds/mandates/windows already do.

**Untouched by design:** `consumeMaterialsForBuild()`, `materialEffectivePrice()`,
`materialCostMult()`, and the underlying spot-price walk are all exactly as
before — a build still prices identically whether the market surface changed
or not. `materialPriceTick()` still resolves and expires a contract object on
a legacy save (so an in-progress lock finishes out cleanly); nothing can newly
sign one. No new state fields → **no SAVE_VERSION bump.**

Validated headlessly: 46/46 on the collapse itself (dip-threshold gating
exactly at the boundary, dip pricing strictly cheaper than the retired
per-unit formula, afford/yard-cap/not-a-dip gating, buy/no-op paths, legacy
contract resolution, save/load roundtrip with an active dip + stock, render
with and without a dip live, outliner and Cape-glyph visibility, the full
`computeVehicle()` build-cost pipeline, a 300-tick smoke test) + 18/18 broader
regression (all three named difficulties boot, every scene tab renders, a
600-tick/~50yr long smoke test with a forced mid-run dip, and a playthrough
bot that pokes the dip mechanic every 20 ticks for 400 ticks and checks the
materials state shape never corrupts).

**Repo state:** on `main` through this commit. Live file unchanged in size
class (~1.05M chars). Pushed via Git Data API (fine-grained PAT, treated as
compromised/revoked immediately after use per standing practice).

### Recommended next steps

No open items from this pass. Per the 2026-07-02 flow-architecture note, the
other flagged check — *verify doctrines/research partnerships actually surface
in the advisor/outliner or they stay invisible to the flow* — is still
unverified and is the natural next small pass if picking up loose threads
before a bigger milestone (#19/#21/#22, Cross-Track Synergies, or #29 filters).

## #19 Organizational scaling — departments (2026-07-03, slices A/B/C)

Built all three slices in one session, each headless-validated and pushed as its
own commit. **Core design decision: departments WRAP the hired individuals, they
don't replace them.** The named engineers/astronauts carry the #9 trait system,
the #5 poaching mechanic, and the M6 morale loop — ripping them out for abstract
headcount would gut all three. So a department is an org layer *over* the staff
you already hire. Taxonomy needs no new invented structure: a department = one of
the 4 engineering specialties (Propulsion/Structures/Avionics/Production) + the
Astronaut Corps; **membership is derived** from who's hired, so it stays in sync
with hiring/firing/poaching automatically. Distinct from the existing Research
Divisions (which are R&D-track accelerators — a different axis).

### Slice A — structure + leaders (commit 9845a95, SAVE_VERSION 39)
`state.departments = {deptId:{lead,training}}`. Each department can have one promoted
**lead** (`promoteLead`/`stepDownLead`), whose skill×morale×trait amplify that
department's output: an engineering lead is weighted `DEPT_LEAD_WEIGHT` (1.6×) in the
team-score average, so promoting your strongest-trait engineer amplifies that trait
across `engScores`; the Astronaut Corps lead adds a flat crewed-reliability steadiness
(`corpsLeadRelBonus`). `deptLeadRecord` self-heals if a lead leaves the roster.
**Balance-neutral with no leads** — all weights collapse to 1.0, so engScores is
identical to the pre-#19 formula (proven in-test against a reconstructed old formula).
Introduced `effSkill()` here (reads `xp`, which is 0 until slice B, so ==base skill)
and threaded it through engScores/bestSpecialistSkill/astroBonus. Personnel modal
regrouped by department with lead controls + a crown pill. Legacy saves default
`departments` via loadDefaults/defaultDepartments. **Validated 37/37.**

### Slice B — career progression + training (commit 22536f9, SAVE_VERSION 40)
Hired staff accrue `xp` each month (`accrueStaffXp` in the monthly boundary), scaled
by morale × their department's training level, raising **effective skill** above the
fixed hire-day base up to +0.15 (hard cap 0.99, `XP_SKILL_SLOPE`/`XP_SKILL_MAX`).
effSkill feeds the real accumulators (engScores, specialistFactor, astroBonus) so
**retention genuinely pays off** — a veteran you kept outperforms their hire-day
stats. **Training investment:** `trainDepartment()` spends capital to raise a
persistent per-dept training level (cap 4) that accelerates that dept's xp accrual
(+50%/level, `TRAIN_ACCEL`) and grants an immediate xp + morale bump — money-now for
compounding-skill-later. Skill bars show the veteran gain (green overlay + "+N");
dept headers show training level + a Train button. Legacy staff default `xp` 0 via
`staffXp` guard, so effSkill==base at xp 0 → fresh/legacy games unchanged.
**Validated 27/27**; slice A + materials + regression suites still green.

### Slice C — succession & workforce planning (commit 4a7956b, NO save bump)
When a lead leaves the roster (fired/quit/poached/dose-retired), the strongest
remaining member auto-succeeds — `reconcileDeptLeads()` (best effSkill×morale) wired
into all four staff-removal points (monthly attrition, firePersonnel, checkPoaching,
astronaut retirement). **Workforce planning:** an unstaffed CORE engineering specialty
is a standing reliability risk — `deptStaffingRelPenalty()` subtracted in `curRel`,
**era-scaled via `eraStakesFrac` so it's 0 in Pioneer** (early game provably unchanged)
and only bites once you're deep enough to know better; the Astronaut Corps counts as
critical only when the active mission is crewed (`criticalDepts`). Gaps surface in the
flow — outliner (eta-0 item), command tab alerts, personnel Cape glyph — plus a
workforce-planning banner + per-dept health dot in the modal (so *unstaffed* depts,
which have no member cards, are still visible with a call to action). No new persisted
state → no SAVE_VERSION bump (succession mutates existing `dept.lead`; gaps + penalty
are derived). **Validated 30/30.**

**Full gauntlet green at session end:** dept-A 37 + dept-B 27 + dept-C 30 + materials
46 + regression 18 = **158/158.** Pushed via Git Data API (fine-grained PAT, treated
as compromised/revoked immediately after use per standing practice).

### ✅ Pre-existing bug found & FIXED (2026-07-04)
`checkScoringDate()` referenced `pendingCelebration`, which only exists as a LOCAL
variable inside `resolveFlight()` — at the `checkScoringDate` scope it was an undefined
free reference. Guarded by `if(animEnabled)`, so it threw a ReferenceError when the game
reached the 1990 soft-scoring date (Agency Chronicle "an era closes") in normal animated
play. **Fixed** by inlining the chronicle trigger — `checkScoringDate()` runs from the
monthly-boundary tick, not the flight path, so there is no in-flight celebration to defer
to; the buggy defer-behind line became `if(animEnabled){ showChronicle('era'); }`. Verified
in isolation: no ReferenceError, `timeInterrupt()` fires, the chronicle shows once, and the
`eraScored` guard prevents a re-fire.

### Recommended next steps (updated)
1. ✅ **DONE (2026-07-04)** — `pendingCelebration` 1990-scoring-date crash fixed (see § above).
2. Still open from 2026-07-02: *verify doctrines/research partnerships surface in the
   advisor/outliner* (same invisible-to-the-flow class the materials + #19 gap work kept
   addressing).
3. Bigger milestones remain: #21 colony/logistics, #22 endgame, Cross-Track Synergies, #29 log filters.

## Session — Personnel expansion: deeper roster + four new hire categories (2026-07-04)

**Context.** Expand *who* can be hired beyond the 4 engineering specialties + Astronaut Corps —
more named people in every pool, plus four genuinely new hire categories, each on a new effect
axis staffing didn't previously touch. Designed via a plan pass (verdict: generalize the pool
model first, then ship categories as independent, balance-neutral slices; **no SAVE_VERSION bump**
— every effect derives from who's hired, and departments already lazy-default). Also fixed the
`pendingCelebration` 1990 crash first (§ above, now ✅).

**Core design decision — role registry, not a bolt-on.** A binary engineer/astronaut split lived
in ~10 call sites; with 5 roles a per-site if/else is untenable. Introduced `STAFF_POOLS` +
`poolOf`/`roleOf`/`roleLabel`; the named `ENGINEERS`/`ASTRONAUTS` arrays and all hire/fire/
morale/XP/poaching machinery are already role-agnostic, so new roles plug in without touching them.

- **Slice 1 — Roster expansion.** +8 engineers (e13–e20; each of the 4 specialties now has 5,
  filling era gaps) + 4 astronauts (a09–a12). New per-id hash-assigned traits; existing
  personalities unchanged (hash is per-id).
- **Slice 2 — Role-registry refactor.** `STAFF_POOLS`/`roleOf` replace the binary across
  `personById`, `availablePool`, `deptMembers`, `deptOfPerson`, `traitOf`/`traitKeyOf`, UI labels.
  Froze `ENG_TRAITS`/`ASTRO_TRAITS` key order with a warning comment (trait = `hash(id)%keys.length`
  — derived, not saved; reordering would silently reassign every character's personality). **Fixed**
  the pre-existing poach-log bug printing `(undefined)` for non-engineers (now `roleLabel`). Proven
  byte-identical via a parity harness (318/318) over every id, all 5 eras, 4 seeded rosters.
- **Slice 3 — New engineering specialties.** `software` (Flight Software 💻) + `materials`
  (Materials & Processes 🧪), 3 hires + 1 dept each. Feed `engScores` rel/R&D automatically
  (specialty-agnostic). Niche via `SUBSYS_SPECIALISTS`: materials strengthens the structures
  subsystem, software strengthens avionics (`bestSpecialistSkill`) — byte-identical unstaffed. NOT
  added to `criticalDepts`/`deptStaffingRelPenalty` (would penalize existing saves).
- **Slice 4 — Scientists 🔬.** `SCIENTISTS` pool + `SCI_TRAITS` + Science Division. Generic
  `roleTeamScore(role,chan)` helper (lead-weighted, mirrors #19; 0 unstaffed). Hooks: `sciYieldMult`
  ×(1+yield, cap 25%); R&D-speed sum += rd (cap 10%, kept small — sum already stacks 4 uncapped
  sources).
- **Slice 5 — Executives 💼.** `EXECUTIVES` + `EXEC_TRAITS` + Front Office. Hooks: `govMonthlyFunding`
  earned term ×(1+gov, cap 20%); `empireOpex` ×(1−opex, cap 15%); mandate offer ×(1+mandate, cap 15%).
  Does NOT touch contract payouts (CE4 owns reward inflation). Era-scaled by nature.
- **Slice 6 — Mission Controllers 🎧 (launch flow).** `CONTROLLERS` + `CTRL_TRAITS`
  (anom/call/rescue channels) + Mission Control dept. All hooks are CHANCE-only (**CE5 invariant**:
  staffing never changes how a call *resolves*): `rollMissionEvents` chance ×(1−anom, cap 35%);
  anomaly thresholds wrapped in `opsLuck(p)` (=p unstaffed, +call ≤10% staffed); `rescueChance` +=
  rescue (cap 8%, inside clamp); `flightReadiness` mirrors the cut. CE5 flags untouched. Proven
  byte-identical launch flow with no controllers (40 seeds × 4 contexts) + a 20k-trial Monte Carlo
  confirming the anomaly rate drops when staffed.
- **Slice 7 — Polish.** Contextual advisor nudges ("Hire a scientist/flight director/executive" only
  when the role would help and one is hirable); `staffEffectsHTML()` aggregate line on the exec
  overview; balance sweep on the 8 new constants (all bounded, neutral-when-unstaffed, gated by
  salary 0.05–0.18M/mo).

**Validation.** Whole-script syntax + a comprehensive headless staff suite: registry parity, roster
(26 eng / 12 astro / 3 sci / 3 exec / 3 controllers, ids unique), 10 departments, specialist niche,
every effect hook (neutral unstaffed → active-within-cap staffed), the CE5 launch-flow invariant,
and the Monte Carlo. **223/223 green.** No SAVE_VERSION bump.

**Repo state:** all changes in the local working copy `orbital-ventures.html`; **not yet pushed**
(user pushes via Git Data API). New save fields: none.

### Recommended next steps
1. Browser-test the expanded Personnel view (deeper roster; Science Division / Front Office /
   Mission Control departments; per-hire contribution lines; exec-overview staff-bonuses line), then
   push.
2. Optional follow-ups deferred from the plan: role-flavored personnel events (`checkPersonnelEvents`
   currently routes new-role traits to the neutral else-branch); an aggregate R&D-speed clamp (the
   sum stacks eng+station+division+partner+sci uncapped — a latent pre-existing issue, now nudged);
   the CE5 live-call band-widening stretch (deliberately skipped to keep the invariant airtight).

## Session — Contracts accessibility: rail accordion section + Flight/Passive sub-tabs (2026-07-04)

**Context.** Contracts are the main money source outside regular missions but felt buried — passive
contracts in particular sat at the bottom of the drill behind a long scroll. Two UX changes, both
pure presentation (no economy/state changes, no SAVE_VERSION bump):

- **Persistent rail Contracts section.** New `railPersistent` accordion entry (`raccContracts`) —
  click to preview signable contracts inline, double-click to open the full drill. `contractsRailSummary()`
  aggregates open mission contracts + available passive contracts + standing/available $/mo;
  `railContractsHTML()` renders standing-income line, top-3 signable passive rows with inline Sign
  buttons, mission count, and an "Open full Contracts →" footer. Badge (`#badgeContracts`) shows
  `count·+$X/mo`, refreshed every render inside `renderRailPersistent()`. Removed the now-redundant
  `Contracts →` button from the Objectives rail; retitled the drill header `📡 Mission Control` → `📡 Contracts`.
- **Flight / Passive sub-tabs.** Split the full Contracts drill into 🚀 Flight Contracts / 📶 Passive
  Income sub-tabs (`contractsSubTab` state, `setContractsSubTab`, `renderContractsSubtabs`) so passive
  income is one click away instead of a full scroll. Tab labels carry live pills (open-mission count;
  active +$/mo or signable count).

**Validation.** Whole-script syntax OK; `contractsRailSummary` harness 18/18; staff regression 223/223.

**Repo state:** pushed to `shamusshafer-ops/Orbital-Ventures` main. New save fields: none.

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

## Session — Save management & startup screen (2026-07-04)

Player request: "make sure the game always starts by asking to continue the last game, open a save, or start new."
The boot previously called `newGame()` unconditionally (the localStorage save was only restored via a manual Load).
Decisions (user): add real save files (export/import) + autosave.

- **Startup screen (`showStartup`).** Boot now establishes a baseline state to render, then ALWAYS shows a
  Continue last game / Open a save file / New game modal. Continue → `autoLoad` + recap; New → difficulty picker →
  `newGame` + the Production intro; Open → file import. `savedGameMeta()` labels Continue with company/year/save-time.
- **Autosave.** Silent throttled `autosave()` (≥4 s apart) on each turn (end of `advanceDays`) + a forced save on
  `beforeunload`, so Continue always resumes the latest session. Skips mid-flight-resolution snapshots.
- **Export / Import save files.** `exportSave()` downloads a `.json`; `importSave()` file-picks → `loadSaveFromText`
  (shared with localStorage load). Wired into the startup screen + Settings (alongside Save/Load).
- **Data-safety guard.** `_gameStarted` gates autosave so the boot placeholder game can NEVER overwrite the real
  save if the tab is closed at the startup screen; import validates and shows a clean error on a bad file.
- Forced SAVE_VERSION 40→41 (autosave now persists `activeFlights`) — completing 1.2c's persistence half.

**Validation.** Whole-script syntax OK; new headless suites — save/load round-trip + autosave guards (ov-persist
13/13), startup/import/meta + `_gameStarted` guard (ov-save 11/11); regressions crew 12/12, arrival 17/17, flight
42/42, beginResolve 3/3.

### Progress log — P2 (living logistics)
- **2.1 ✅ (2026-07-04)** — Resupply becomes a live logistics flight, Mars only. New `LOGI_TRANSIT_DAYS`
  table (`earth:0, moon:4, mars:210`, a fresh Hohmann-class figure — no existing one-way Earth↔Mars constant to
  reuse; `mars_flyby.days:420` is round-trip) + `logiTransitDays()`. `resupplyFacility()` still pays cost
  immediately; transit `< DEFER_CRUISE_DAYS` (LEO, Moon) resolves exactly as before — byte-identical; Mars
  pushes a `{kind:'logistics', deferred:true, facId, monthsShipped, launchAbs, arriveAbs, name, crew:0}` record
  onto `state.activeFlights` (no ctx/mission) and logs "shipment launched" instead of "resupplied".
  `pumpFlightArrivals()` gets a logistics branch ahead of the no-ctx corrupt-record drop: on arrival, tops up
  `supply = min(FAC_SUPPLY_MONTHS, supply+monthsShipped)`, resets `starvedMonths`, logs arrival, removes the
  record. New `canResupply()`/`resupplyInTransit()` gate blocks a second order ("Resupply en route.") and the
  button reflects it. `rehydrateFlights()` now keeps `kind:'logistics'` records (validates `facId`) instead of
  dropping them as corrupt. `flightsPanelHTML()` renders a 📦 row for logistics flights with no abort/recall verb
  (cancellation is a future slice). No SAVE_VERSION bump (`activeFlights` already persisted since 1.2c/41).
  **Design note:** `monthsShipped` is the shortfall at launch time (not a flat refill), and the base keeps
  draining during the ~7-month Mars transit — a late order now carries real starvation risk. Pioneer era (no
  facilities) and LEO/Moon are provably unchanged. Harness ov-logistics 37/37 (parity, lifecycle, round-trip,
  double-order block, corrupt-facId safety, Pioneer no-op, panel rendering, ctx-mission regressions).
  **Known cosmetic gap:** the Outliner in-flight row still shows 🚀 instead of 📦 for logistics shipments
  (function-correct, cosmetic only — left alone per the 2.1 scope). Next: **2.2** — plug the fuel market and
  cryo boil-off into transit cost/risk.
- **2.2 ✅ (2026-07-04)** — Resupply cost now floats with the live fuel market and cryo boil-off instead of a flat
  number. New `LOGI_FUEL_FRAC=0.45` (propellant share of resupply cost); `resupplyCostFull` becomes
  `base × (1 − LOGI_FUEL_FRAC + LOGI_FUEL_FRAC × marketRatio × boiloffRatio)` where `marketRatio =
  fuelBuyPrice()/FUEL_BUY_BASE` and `boiloffRatio` is a boil-off margin over the facility's transit duration,
  normalized to exactly 1.0 at baseline (no cryo research) for every body. Boil-off rates
  (`BOILOFF_RATE_BASE=0.015`, `BOILOFF_RATE_CONTROLLED=0.004`, `BOILOFF_CAP=0.30`) were extracted from the
  mission simulator into shared constants and reused here — mission-sim output is unchanged (regression-checked
  across 16 stack/day/control combos). Applies to **all bodies** (not just Mars) per user sign-off; effect is
  ~0% on LEO/Moon (near-zero transit) and material on Mars. `cryo_boiloff_control` research now also discounts
  Mars resupply (~3.6% total, since it's `LOGI_FUEL_FRAC`-weighted — the ~8% quoted during planning was the
  propellant-only figure). Fuel-market surcharge ranges ~+34% at normal high prices (~0.70) up to ~+62% at the
  rare event-shock ceiling (0.95) — higher than the "~+30% typical" planning estimate; user reviewed and
  accepted both actual numbers. Small dim-text hint added near the resupply button ("incl. propellant at market
  rate."). No SAVE_VERSION bump (no new persisted state).
  **Validation.** `node --check` OK. Baseline parity 48/48 byte-identical (LEO/Moon/Mars × modules × greenhouse
  × fission) vs. reconstructed old formula. Monotonic vs. fuel price and cryo research confirmed. Mission-sim
  regression clean. Lifecycle (charge==display, money-gate, prorate, Pioneer no-op) 11/11.
- **2.3 ✅ (2026-07-05)** — Route interruptions. New weighted `logi_mishap` entry in the existing `ECONOMY_EVENTS`
  pool (same `EVENT_CHANCE=0.14`/5-mo-cooldown machinery already used for fuel shocks), gated via a new
  `logiFlightsInTransit()` helper so it can only roll while a logistics flight is genuinely mid-cruise (mirrors
  the existing `reqDepot` gating idiom). On fire: picks one random in-transit shipment, computes a 20-45 day
  slip (`LOGI_MISHAP_DELAY_MIN/MAX`), and surfaces a decision modal reusing the existing research-setback
  pattern (`_pendingLogiMishap`, transient/unpersisted like `_pendingSetback` — no SAVE_VERSION bump): **expedite**
  (pay to fully hold the original `arriveAbs`) or **accept** (free, full delay applied). Expedite cost =
  `max(0.4, resupplyCostFull(facId) × 0.6 × delay/30)` — scaled off the shipment's own market-aware cost
  (already includes 2.2's fuel/boil-off terms) by delay fraction, not a flat number; unaffordable → accept-only.
  Delay is applied directly to the existing `activeFlights` record's `arriveAbs`, so the 📦 telemetry panel and
  Outliner row both reflect the new ETA automatically (both already compute ETA live from `arriveAbs`, verified,
  no separate field needed). Per-flight targeting confirmed even (33/33/33 split across 3 simultaneous test
  flights, arrived flights never targeted).
  **Validation.** `node --check` OK. Monte Carlo 200k rolls: fire rate 0.1253 vs expected 0.1250. **Critical
  parity guard: zero mishap fires across 300k+ rolls / 40k simulated months with no logistics flight in
  transit** (including a present-but-already-arrived flight) — airtight. Lifecycle: delayed record still tops
  up supply correctly at its new `arriveAbs`; survives save/load round-trip with the delay intact. Modal
  accept/expedite/unaffordable paths all verified. 21/21 assertions. Modal wording/readability needs a manual
  browser pass. Next: **2.4** — per-facility auto-reorder toggle (new persisted state → SAVE_VERSION bump).
- **2.4 ✅ (2026-07-05)** — Per-facility auto-resupply toggle (`fs.autoResupply`, default off). Monthly-tick hook
  (right after the supply drain, before the starvation check): if the toggle is on, supply ≤
  `AUTO_RESUPPLY_THRESHOLD=6` (of `FAC_SUPPLY_MONTHS=8`), and `canResupply(id).ok`, calls `resupplyFacility(id)`
  automatically — same cost/gate/lifecycle as a manual click, just triggered by the toggle. Threshold reasoned
  from drain rate: gives a ~2-month reaction buffer without log-spam; on Mars a base ordering at 6 still arrives
  ~1 month into starvation given the ~7-month transit, but that's inherent to 2.1's one-shipment-at-a-time model
  and matches a manual player's own experience — flagged as an easy-retune constant. Every auto-order logs
  clearly so a fuel-price-spike auto-charge (per 2.2) is never a silent surprise. **SAVE_VERSION 41→42** +
  `migrateFacilityAutoResupply()` lazily defaults the field to `false` on old saves (both load paths). UI: a
  small on/off toggle in the infra panel mirroring the existing `setAssembleOrbit` button pattern.
  **Validation.** `node --check` OK. 20/20 headless: migration default+idempotency, threshold boundary (no fire
  at 7, fires at 6), money gate respected, toggle-off never fires even while starving, **fires exactly once
  across 6 in-transit months on Mars** (no spam), log line present, Pioneer/no-facility no-op. UI wording/
  placement needs a manual browser pass. **This closes out P2 (living logistics, slices 2.1-2.4) — one of the
  P1/P2/P11 "put the universe in motion" through-line initiatives, alongside P1 (done) and P11 (not yet started).**

### Progress log — P3 (failure investigation loop)
- **3.1 ✅ (2026-07-05)** — After an uncrewed loss/abort/strand, a fund/decline modal (mirrors `_pendingSetback`/
  P2's `_pendingLogiMishap` exactly, slotting into the same precedence chain: setback > mishap > inquiry) offers
  an inquiry costing `max(0.6, 0.3×flightExpense)` (the lost flight's own build+launch+etc. cost). Reward is
  determined by what failed, via existing `SUBSYS_PHASE`: ascent/staging subsystems → a flat +0.02 reliability
  credit (`state.inquiryCredit={subsystem,rel:0.02,flights:3}`, additive to `effectiveReliability` like
  `familyRelBonus`, consumed one flight at a time, only when that subsystem is actually relevant — zero overhead/
  drift when unfunded); deep-phase subsystems → a flat `INQUIRY_SCI_BONUS=10`⚛ science grant (~1.5× a base deep
  mission's yield). No cooldown/stacking — a new inquiry replaces any unused prior credit. Crewed catastrophes
  are completely untouched (they keep their existing implied 6-month grounding narration; this is uncrewed-only
  by design). Decline path is byte-identical to today. New persisted state → **SAVE_VERSION 42→43** + migration
  (old saves → `inquiryCredit:null`).
  **Validation.** `node --check` OK. 43/43 headless: cost math, reward-selection-by-subsystem, credit lifecycle
  (3→2→1→null via real launches, irrelevant credit never consumed, no-stacking replace), decline no-op, trigger
  scope (uncrewed loss only — never success/rescued/crewed), save/load round-trip of a partially-consumed
  credit, v42→v43 migration. **Monte Carlo (N=300, paired RNG):** reliability delta lands at exactly the
  intended +0.02×relevance-fraction, zero drift when never funded. Modal wording/layout needs a manual browser
  pass. Quick wins **P4/P5/P7-P10** remain independent of the entity model and can be tackled in any order.

### Progress log — P4 (rival voice)
- **✅ (2026-07-05)** — Per-profile rival communiqués/taunts, strings only. Distinct rival archetypes already
  existed (`RIVALS`, Vostochny/state agency, Meridian/legacy contractor, Halcyon/scrappy newcomer) — no new
  personality system needed. New `RIVAL_VOICE` (per-id `taunt`/`defiant` line pools) + `rivalVoiceLine(r,kind)`
  helper wired into the two existing user-facing rival events: `fireRivalFirst()` (a rival claims a "first" —
  logs a boastful taunt) and `denyRivalGoal()` (you beat them to a goal — logs a defiant reply). Voice modeled
  on the game's existing dry, em-dash log register. Purely flavor: no state mutation beyond the existing
  append-only log, no persisted state, no SAVE_VERSION bump.
  **Validation.** `node --check` OK. Distribution check (4000 picks/pool) confirms every line in every pool is
  reachable; unknown rival/kind returns a safe no-op. Tone/quality is a human judgment call, not machine-checked.
  **Flagged, not built:** a deeper reactive rival mood/relationship system — today's archetypes are static, this
  slice didn't add dynamic personality state, which would be a larger follow-up if wanted.

### Progress log — P5 (rival disasters + rescue)
- **✅ (2026-07-05)** — Rivals can now fail publicly. New monthly `tickRivals()` disaster roll
  (`RIVAL_DISASTER_BASE_P=0.0055`/mo, Monte Carlo-tuned to a ~15yr mean interval at baseline) times a
  per-archetype multiplier (Vostochny ×1.0, Meridian ×0.6, Halcyon ×1.5 — empirically ~15/25/10yr). Two kinds:
  **uncrewed** (flavor + `RIVAL_DENY_MOM×0.5` momentum knock + a new `distress` `RIVAL_VOICE` line) and
  **crewed** (only once that rival has claimed a crewed first; full momentum knock; surfaces a rescue-offer
  decision modal) — a coin-flip between the two when crewed-eligible (not specified by the sign-off, flagged).
  The rescue offer is a **lightweight simulated decision**, not the real player rescue-mission pipeline (that
  would need a fake mission ctx) — cost/chance mirror the real `rescueCost`/`rescueChance` formula shape with a
  fixed synthetic strand difficulty (cost 15; chance uses the same rep/rendezvous/nuclear-thermal/facilities/
  `ctrlRescueScore` levers, capped ~0.78, floored 0.10). **Mount+succeed:** +6 rep, +5 support (2×
  `SUPPORT_DELTA.rivalFirst`), new `humbled` voice line. **Mount+fail:** cost sunk, no windfall, rival's
  momentum hit stands regardless. **Decline:** −2 rep, −1.5 support (a real but minor cost, ~1/3 the windfall
  size) + the rival's momentum hit stands. Modal is deferred (not shown this tick) if a setback/mishap/inquiry
  is already pending, matching the existing precedence chain. No persisted state (`_pendingRivalDisaster` is
  module-scope, never serialized) — no SAVE_VERSION bump.
  **Validation.** `node --check` OK. 30/30 headless: crewed-first gating per rival, cost/chance formula, both
  disaster-kind deltas, modal deferral under the existing chain, mount-succeed/mount-fail/decline exact deltas,
  no save-state leakage. Flavor tone and modal wording need a manual browser pass. **Closes P5.** Remaining
  quick wins: **P7-P10** (P6/P11 are the two remaining big swings).

### Progress log — P6 (era texture pass)

Scoped as 4 slices: 6.1 era-transition interstitial (most visible/self-contained, first), 6.2 per-era event
pools, 6.3 passive-contract reskins, 6.4 era-sensitive public mood (reweight only, smallest, last).

- **6.1 ✅ (2026-07-05)** — Era-transition interstitial. Trigger is derived (`eraIndex(currentEra()) >
  state.eraSeen`), not a transient flag, so it can never be lost — checked at all four post-advance settle
  points, deferred behind the full existing `_pendingSetback/_pendingLogiMishap/_pendingInquiry/
  _pendingRivalDisaster` chain as lowest priority. On trigger: single click-through full-screen card showing
  the new era's name/years/`blurb` plus a retrospective (flights flown, firsts claimed vs. rivals scooped,
  treasury/rep change) diffed against `state.eraStartSnapshot`, taken at the start of the era just finished;
  snapshot resets on dismiss. Multi-era jumps (e.g. a big time-skip) chain one card per boundary. New persisted
  state (`state.eraSeen`, `state.eraStartSnapshot`) → **SAVE_VERSION 43→44**. **Critical migration behavior:**
  loading an old save backfills `eraSeen` to that save's OWN current era (via `eraIndexForYear`), not to 0 —
  so an old save resumes cleanly with zero stale interstitials for eras already played through.
  **Validation.** `node --check` OK. 25/25 headless: one card per transition, no fire mid-era/after dismiss,
  **old-save backfill confirmed zero stale cards** (year-2015 save → backfills to Commercial era index, not
  Pioneer), modal-priority deferral under all four existing blockers, retrospective diff math (incl. negative
  deltas), multi-era-jump chaining. Visual card layout/copy tone needs a manual browser pass. Next: **6.2** —
  per-era event pools (`minEra`/`maxEra` gating on `ECONOMY_EVENTS`, old events retired as eras advance per
  user decision).
- **6.2 ✅ (2026-07-05)** — Per-era event pools. Added optional `minEra`/`maxEra` (era-index bounds) to the
  central `ECONOMY_EVENTS` eligibility filter — absent on an entry means no era restriction (all 13 pre-existing
  unbounded entries fully backward-compatible). **Retired** two government-funding events by era: `gov_grant`
  (`maxEra:3`, fades as Commercial arrives) and `subsidy` (`maxEra:4`, fades at Expansion) — their bad-half
  counterparts (`austerity`, compliance audits) intentionally stay era-agnostic. **Added 6 new entries** across
  three thematic bands, one good/bad pair each, magnitudes matched to existing entries of similar severity:
  Cold War prestige panic/audit (eras 1-2), commercial investor mania/correction (eras 4-6), expansion-era ISRU
  windfall/off-world dispute (eras 5-7). Voice modeled on existing dry economic-event blurbs with era inflection
  (legislative/prestige politics → market/stock language → resource-rights language). No new persisted state —
  era gating computed live from `state.year`, no SAVE_VERSION bump.
  **Validation.** `node --check` OK. Off-by-one boundary check 8/8 (every era-bounded entry eligible exactly at
  its bounds, not one era outside). Parity: all 13 unbounded entries unaffected in every era. Per-era pool
  weight checked structurally across all 8 eras — no era left thin or overloaded (e.g. mature-player weight
  went 3→3 / 20→24 / 24→28 / 32→32 / 32→33 / 32→35 / 32→33 / 32→31 across eras 0-7). Monte Carlo (1000 sim-yr,
  4 sampled eras): fire rate stable ~10.6-11/decade regardless of era. **Known pre-existing gap, unchanged by
  this slice:** Pioneer era (1942-44) has zero eligible events until `gov_grant` unlocks at 1945 (a `minYear`
  effect predating this work) — an acceptable thin-start gap. Next: **6.3** — passive-contract reskins
  (including 1-2 new contract types per user decision).
- **6.3 ✅ (2026-07-05)** — Passive-contract reskins, scoped to **reskin only, no new contract types** (user
  decision — the prior "1-2 new contract types" note was an open flag, not a locked decision). **Found first:**
  `PASSIVE_CONTRACT_DEFS`'s `sat_weather`/`sat_comms`/`sat_imaging` already had an `eraVariants` field stubbed
  from an earlier, unfinished pass — tagged `// P6 6.3` in comments but never read anywhere, i.e. dead data.
  Also found in passing: `tabAlerts()`'s expiring-contract badge referenced `cn.name`, which is never set on a
  signed contract record (`state.passiveContracts` entries only carry `id`/`monthsLeft`/`income`) — a
  pre-existing `undefined` display bug, fixed alongside this slice since it's the same "contract shows the
  wrong text" class of problem the user flagged earlier this session (see the suborbital-narration fix above).
  Added `passiveContractDisplay(d)` — resolves a contract's live name/blurb against `d.eraVariants` (checked
  in order, first `minEra`/`maxEra` bound match wins, unset fields fall through to the base def) using
  `eraIndex(currentEra())`, same gating idiom as 6.2's `ECONOMY_EVENTS`. Resolution is **live**, not
  snapshotted at signing — a contract signed pre-Commercial-era that's still running when the era turns
  updates its displayed flavor text (deliberate, matches 6.2's "computed live" precedent; no gameplay/number
  effect either way, text only). Wired into all 6 display sites: the sign-up list (`renderPassiveContracts`),
  the persistent-rail top-3 preview (`railContractsHTML`), the Outliner's expiring-soon row, the Command-tab
  alert badge (fixing the `cn.name` bug in the same edit), and both the sign/expire log lines. **Extended the
  reskin to `mil_launch`/`mil_warning`/`mil_recon`** (same `first_sat`/`crew_orbit` reachability window as the
  sat_* contracts, so the variant is actually visitable in a normal playthrough) — Cold War strategic-mandate/
  deterrence-network flavor pre-Commercial era for the first two, a modern commercial-recon-partnership variant
  post-Commercial era for the third (its base text already reads as the classic-state flavor, so the variant
  runs the other direction — deliberate, not a mistake). **Deliberately skipped `lic_*`:** their `reqResearch`
  (propulsive_landing/nuclear_thermal/mars_isru) generally isn't reachable until well past the era-4 boundary
  in a normal game, so an "older-era" variant would rarely or never actually be seen — not worth the dead
  weight. Every base string left **byte-identical** for any def with no `eraVariants` (`svc_orbit`, `tour_*`,
  `lic_*`) — purely additive. Headless: `node --check` OK; standalone resolver harness (45 assertions) — all
  3 unaffected contract types return base text unchanged across all 8 eras; all 5 `maxEra:3` variants resolve
  to the old flavor from era 0 through the 1999/era-3 boundary and flip to base/modern exactly at the
  2000/era-4 boundary; `mil_recon`'s `minEra:4` variant mirrors that boundary in the other direction. **This
  closes out 6.3.** Next: **6.4** — era-sensitive public mood (reweight `SUPPORT_DELTA` only, no new mechanic).

- **6.4 ✅ (2026-07-05)** — Era-sensitive public mood. New `SUPPORT_ERA_MULT=[1,1,1,1,0.85,0.7,0.55,0.45]`
  (indexed Pioneer..Speculative) and `supportDelta(key)` (`SUPPORT_DELTA[key]*supportEraMult()`) — same
  "old era is the untouched reference, later eras change" idiom as 6.3's contract reskins and 6.2's
  gov-funding retirement. **Eras 0-3 (Pioneer through Station & Shuttle) are exactly 1× — every
  `SUPPORT_DELTA` outcome swing is byte-identical to today**, since the space race is still front-page news
  through the Shuttle era; from Commercial era on, a single mission's outcome moves public opinion
  progressively less (spaceflight normalizing), bottoming out at 0.45× in the Speculative era. Replaced
  every `addSupport(SUPPORT_DELTA.x)` call site (7 of them, across mission outcomes + the rival-firsts-denial
  path) with `addSupport(supportDelta('x'))`; sign is always preserved (multiplier is a plain positive
  scalar). **Deliberate scope boundary:** left two things outside the `SUPPORT_DELTA` table untouched — the
  non-routine "big win" success formula (`clampA(2+(m.rep||5)*0.05,2,10)`, a custom expression, not a table
  lookup) and P5's `RIVAL_RESCUE_SUPPORT`/`RIVAL_DECLINE_SUPPORT` constants (a separate rival-rescue system
  that only happens to reference `SUPPORT_DELTA.rivalFirst` once, at parse time, to derive its own value) —
  both are outside the literal "reweight `SUPPORT_DELTA`" mandate for this slice; flag if revisiting. No new
  persisted state, no SAVE_VERSION bump — era gating computed live from `state.year` exactly like 6.2/6.3.
  Headless: `node --check` OK; standalone resolver harness (108 assertions) — every `SUPPORT_DELTA` key is
  byte-identical to its raw value across the full eras-0-3 year range (1942-1999); every key scales to
  exactly 0.85× at the 2000/era-4 boundary; monotonic non-increasing multiplier confirmed across eras 4-7;
  sign preservation confirmed for every key at three sampled eras; no NaN/undefined arbitrarily far into the
  Speculative era (year 9998). **This closes out P6 (era texture pass) — all four slices shipped.** Next:
  quick wins **P7-P10** (P6/P11 were the two remaining big swings; P11 is the last item on the ranked list).

## Session — P7-P10 quick wins (2026-07-05)

User green-lit all four remaining quick wins in one pass; asked for token frugality, so this ran as one
sitting with the coordinator making the content/design calls directly (as with P6's reskins) rather than
a round of upfront questions — each design decision is called out below. All four ship with **no new
persisted state and no SAVE_VERSION bump** (frontPages uses the same lazy-guard pattern as `blueprints()`;
everything else is fully derived or reuses existing fields). `node --check` OK after every slice;
standalone logic harnesses per slice (counts below) — no in-browser pass yet, flagged like other
UI-heavy work this session.

**P7 — Newspaper front page + Chronicle scrapbook.** New `frontPages()`/`pushFrontPage()` (cap 24, same
lazy-default idiom as `blueprints()`) files a headline record at 4 existing trigger points — untouched
otherwise — a player milestone (`showMilestoneModal`), a rival claiming any first incl. a scoop
(`fireRivalFirst`), a rival's crewed disaster (`maybeRivalDisaster`), and a player crewed catastrophe
(the CATASTROPHE branch). Deliberately did **not** touch any existing modal's trigger/timing logic (the
`pendingCelebration` chain is fragile) — purely additive data capture. New `frontPageHTML()` renders a
newspaper-styled artifact (masthead, kind label, headline, dek — serif/letter-spacing via existing CSS
vars, no new assets); the existing "📖 Chronicle" view gained a new "📰 The Agency Wire" scrollable section
(`frontPagesHTML()`) listing headlines, each opening its styled rendering. 4/4 harness assertions (cap +
ordering).

**P8 — Cross-track synergies as verbs.** The `SYNERGIES` config described in the 2026-06-26 review was
**never actually built** (confirmed: zero hits for `SYNERGIES` in the live file before this slice — the
"config ready" note in the plan meant the design was spec'd, not the code). Built it fresh: `SYNERGIES[]`,
`synergyActive(s)` (all `requires` researched), fully derived, no new state. Mapped the 4 seed concepts
onto real current research ids (the plan's old "T-number" placeholders don't correspond to anything in the
live tree): **Lightweight Cryotanks** (`balloon_tanks`+`cryo_upper`, +1% rel), **Radiation Hardening**
(`rad_shielding`+`redundant_avionics`+`radiation_countermeasures`, +1.5% rel) fold into the *same*
reliability accumulator as `familyRelBonus`/`doctrineRelMod` (existing 0.995 cap still bounds it — verified
both stack correctly). **Autonomous Landing** (`propulsive_landing`+`autonomous_navigation`) and **Rapid
Refurbishment** (`rapid_inspection`+`qa_program`) are the ≥2 real unlocks the plan called for: a new
uncrewed `precision_cargo` mission (Precision Cargo Delivery, reqDv 9400, payout 22, gated via new
`reqSynergy` field checked in `missionTechMet`) and a new `lic_refurb` passive contract (Fleet
Refurbishment Licensing, same gate in `passiveReqMet`). New Synergies strip (chips, active=✓/locked=○ with
a "needs: …" tooltip) prepended to the Research Divisions card. **Bug caught by the harness before ship:**
first draft had synergies carry a separate `unlock:` string compared against `reqSynergy` by *value*
inequality — `reqSynergy:'autonomous_landing'` (the synergy's own id) never matched `s.unlock ===
'precision_cargo'`, so both new unlocks would have been permanently unreachable. Fixed by having
`synergyUnlocked(id)` look up the synergy by its own `id` directly; dropped the redundant `unlock` field.
14/14 harness assertions after the fix (partial-requires stay inactive, multi-synergy stacking, the
gate-unlock progression, the caught bug's exact repro).

**P9 — Doctrine content drip.** One exclusive standing contract per doctrine (5 total, reusing
`PASSIVE_CONTRACT_DEFS` with a new `reqDoctrine` field checked in `passiveReqMet` — only signable while
that doctrine is declared; an already-signed one keeps running if you later switch, same as any other
req-gated contract, just not renewable) — scoped to *one* content type across all 5 doctrines rather than
"1-2 contracts/events/hires" mixed, to stay a true quick win. New `doct` category. Advisor surfacing: a
Command-tab alert badge fires once the active doctrine's exclusive contract is actually signable and not
yet signed. 5/5 harness assertions (locked when undeclared/mismatched, unlocks on match, re-locks on
switching away).

**P10 — Reward for flying risky.** All three sub-mechanics reuse existing state — no new persistence.
(1) **Schedule-pressure mandate premium**: `fulfillMandateIfMatch` now scales the bonus by urgency —
`1×` if flown the moment a mandate is accepted, ramping to `1+SCHEDULE_PRESSURE_MAX` (1.5×) flown right at
the deadline (`missionNetEconomics`'s preview updated to match). (2) **First-flight-of-design prestige**:
reuses the existing vehicle-family heritage tracking (`activeFamily().flights`, already `0` pre-increment
at the payout point) — a design's maiden flight pays `+10%` and `+2` rep, on top of (not instead of) the
existing routine/non-routine split; scoped to the clean-success branch only (tanker/partial branches
deliberately left alone). (3) **Insurance-premium contract**: new `SPECIAL_MODS` entry (`insurance`,
mult 1.6× — the highest of any special-contract mod) reusing the existing special-contract system
untouched; risk is flavor framing only, like every other mod in that pool — no mechanical risk
verification, a deliberate scope boundary flagged rather than half-built. 17/17 harness assertions
(schedule-pressure boundary math + monotonicity + zero-lead guard; first-of-design gating).

**No duplicate ids** verified across `MISSIONS`/`PASSIVE_CONTRACT_DEFS`/`SPECIAL_MODS`/`SYNERGIES` after
all four slices. **This closes out the entire P1-P10 ranked list bar P11** (the one remaining big swing —
a late-game crisis arc).

## Session — P11: one late-game crisis (2026-07-05)

The last item on the ranked list, and the only remaining "big swing." Confirmed the core shape with the
user before building (unlike the P7-P10 quick wins) since it's new persisted state + a real stakes
mechanic, not just a reskin/reweight — got a straight "build it as described."

**The crisis: a Kessler debris cascade in LEO.** Leverages exactly what the plan called for — P1's flight
model (missions already resolve through a real pipeline) and CE4's `eraStakesFrac()` (the same era-scaling
idiom as the bridge-loan mechanic). New `state.crisis` (active: `{phase,startAbs,severity,peakSeverity,
fundedUntilAbs}`), `state.crisisDone` (`{outcome,peakSeverity,months}` once resolved — this is a **one-time
arc**, not recurring), `state.leoFlights` (a new cumulative counter — the empire's own launch history is
what creates the hazard). **SAVE_VERSION 44→45**, but no explicit migrate function needed: all three fields
are read through `||`/falsy guards everywhere, so a legacy save is simply inactive/eligible-from-scratch.

**Trigger** (`crisisEligible`/`tickCrisisTrigger`, checked on the monthly tick): era ≥ Commercial (index 4)
AND `leoFlights` ≥ 40 (new `isLeoClassMission`: no profile, reqDv≥9000 — the same threshold the existing
`isOrbital` flag already uses), then a small monthly chance (2%) so it doesn't fire the instant you cross
the threshold. **Stakes**: while active, `isLeoClassMission` flights take a reliability penalty scaling
linearly with severity (0→12% at severity 1), folded into `effectiveReliability` alongside
`radRelPenalty`/`synergyRelBonus` — never a hard lockout, just a rising tax, as agreed. **Mitigation**:
`fundCrisisRemediation()` — a Debris Remediation Program, cost scaling with `eraStakesFrac()` like
`bailoutTerms()`, funds a 6-month term during which severity falls instead of rises. **Resolution**: two
paths, both "survived" per the confirmed design — `mitigated` (severity reaches 0, +8 rep/+6 support,
legacyScore +18) or `endured` (36 months elapse regardless of severity, +2 support, legacyScore +8) — never
a game-over. New `showCrisisModal()` (severity/tax readout + fund button), surfaced via a Command-tab
badge, a standing (eta-0) Outliner row while active, and a Chronicle stat line once resolved.

**Validation.** `node --check` OK. 21/21 headless assertions against the exact production functions (not a
reimplementation — copy-verified line-for-line against the live file): eligibility gating (era boundary,
exact-threshold and one-short cases), reliability penalty (zero when inactive, linear scaling, correctly
zero for both a `profile` mission and a sub-9000-reqDv mission even though the code checks two different
fields), the full escalate→fund→fall arithmetic, both resolution paths (mitigated via full remediation,
endured via the 36-month floor with zero funding), the legacyScore bonus split (18 vs 8), and fund-cost
scaling with era (never free, rises with `eraStakesFrac()`). Not yet browser-tested — this needs a save
artificially advanced to Commercial-era-plus-40-LEO-flights to see live, flagged for a manual pass like the
rest of this session's work. **This closes out the entire P1-P11 ranked improvement initiative.**

## Session — Isometric command-center layout redistribution (2026-07-04)

Player request (not part of the P-list initiative): the isometric Command/Cape view's buildings were unevenly
spaced and overlapping/blocking each other visually. Slice A of two: layout only, no animation yet.

- **Growth ceiling grounded, not guessed.** `PROD_MAX_LEVEL=5` (`:1273`) caps `prodLevel('pads')` at 5 → max
  4 extra pads; ops facilities are 3 boolean flags (`leoOps/lunarOps/marsOps`) → max 3 ops buildings. Designed
  the full 9-base + 4-pads + 3-ops = 16-footprint max-growth state, not just the default view.
- **`ISO_BUILDINGS` (`:10134-10143`)** recoordinated into a logical campus: industrial back row (R&D · mfg ·
  prod), admin/command mid row (personnel · mission · infra), dome + main pad front, rivals isolated far-right.
  Only `gx,gy` changed — footprint/height/type/tint untouched.
- **Extra-pad formula (`:10520`)** was marching left into other buildings' footprints as pad count grew — the
  core overlap bug. Now a coastal launch row alongside the main pad, with an undefined-guard replacing the old
  `gx<2` break.
- **Ops formula (`:10525`)** was self-overlapping at its old `0.1/0.9` spacing; now a clean front-centre diagonal.
- `ISO_SPREAD` (1.7), `ISO_AV` (2.85), and shoreline/water/decor literals left untouched — new layout still fits
  inside the existing gx≤7.5 grass boundary, nothing stranded or underwater.
- Hotspot-derivation math (`isoLayout()`, `:10155`) and the depth-sort z-order (`:10546`) are byte-for-byte
  unchanged — this was a coordinates-only change.

**Validation.** `node --check` OK. Headless geometry check against the actual edited table + formulas at max
growth: **0 footprint overlaps, 0 hotspot overlaps, 0 off-canvas** (baseline was 8 overlaps + 4). No fake
assertions for subjective layout quality — that was a manual visual pass, user-approved. Next: **Slice B** —
launch-pad liftoff animation (rocket leaves the pad on the isometric view) with a camera zoom-chase, then
handoff into the existing full-screen ascent/flight overlay; auto-switches to the Command tab if Launch is
triggered from the mission panel.

### Slice B — launch-pad liftoff, zoom-chase, ascent handoff ✅ (2026-07-04)

New `playLiftoff(spec, next)` (~2.4s, `LIFTOFF_DUR`): on launch (animated + non-deferred flights only), the pad
rocket rises (`drawIsoPad` offsets the sprite + draws a plume via the existing smoke emitter) while the camera
zooms to ~2.15× and pans to track it; auto-switches to the Command tab first if Launch was triggered from the
mission panel; click-to-skip cuts straight through. Manual `capeZoom`/pan state is snapshotted and restored
after, so the player's view isn't left stuck zoomed in. Hands off into the existing `playMission`/`#animOverlay`
ascent renderer completely unchanged. `animEnabled=false` (headless) path is fully bypassed — byte-identical.

**Playtest fixes (same session):** the rise/camera motion was on an ease-in-out curve (reads as fast-then-slow —
wrong for a rocket); switched to `easeInQuad` (near-zero initial velocity, then accelerating; chosen over cubic,
which stalls too long in a 2.4s window). The ascent scene previously always opened at `virtT=0` (rocket on the
pad, tower attached) — added an optional `seedP` threaded `playLiftoff→next(seedP)→playMission→setupFlightState`,
computed from the eased liftoff progress at handoff (~0.12 of ascent duration on a natural completion,
proportionally less on an early skip) via new `LIFTOFF_SEED_P=0.12` — so the cut lands mid-climb (tower
retracted, ground receding) instead of resetting to the pad. Default/no-seed callers (deferred-arrival path,
disabled Phaser flight setup) are unaffected — `seedP` defaults to 0, today's exact behavior.

**Validation.** `node --check` OK on every pass. Seed math verified numerically (default→0, full liftoff→0.12,
proportional on skip). Motion feel and cut-continuity are inherently visual — manual browser pass, user-approved
after one tuning round. Not headlessly fakeable and not faked.

**Pop-out parity fix (same session, 2026-07-04).** The CC pop-out (`openCCPopout`, ~:12370) already showed the
rocket rise/plume — it renders through the same `drawCape()` — but the zoom-chase drove only the normal view's
`capeZoom`/`capePanX`/`capePanY`, and click-to-skip was only wired to the normal view's DOM node. Fixed in
priority order (skip listener first, per user request): (1) a pointerdown/up skip handler on `#ccPopStage` with
a <6px movement threshold so a pan-drag release doesn't falsely skip, attached/detached live each tick as the
pop-out opens/closes (`syncPopSkip()`); (2) the camera drive now branches on `ccPopoutOpen` each tick, targeting
`ccPop.{z,x,y}` with the pop-out's own fit/scale math (mirrors `ccPopLoop`'s blit) instead of the normal view's
camera when the pop-out is active, snapshotting/restoring only whichever surface was actually driven — handles
toggling the pop-out mid-liftoff without corrupting either camera. Headless: `node --check` OK; a stubbed-DOM
run of the real `playLiftoff` confirmed both branches (pop-out open vs. closed) touch only their own camera
object and restore correctly. Pop-out chase feel is visual, unverified by the agent — user directed commit
without a manual pass this round.

**Pop-out as launch default (2026-07-05).** Every animated launch now opens the CC pop-out automatically —
`openCCPopout()` called at the top of `playLiftoff` (after the no-pad early-out), `closeCCPopout()` called in
`finishSeq()` right after the camera-state restore, before handoff to the ascent overlay. The existing
`state.tab='command'` switch is untouched, so closing the pop-out later still lands on the Command tab.
Idempotency (`openCCPopout`/`closeCCPopout` both early-return if already in the target state) and the
`animEnabled=false` headless path are both unaffected. Headless: `node --check` OK; stubbed-DOM run of the real
`playLiftoff` — 10/10 assertions pass (pop-out opens exactly once regardless of launch origin tab, closes
exactly once at handoff, headless path untouched). First slice of a broader ask: also unify the vehicle's
rendered size across the Cape pad, ascent, and orbit/trajectory scenes (next), and add wheel-zoom to the
ascent/trajectory/orbit scenes, which currently have none.

**Vehicle-size unification, slice 1 — ascent scene (2026-07-05).** New shared constant `VEH_BASE_PX_PER_UNIT =
0.40` (module scope, right after `buildVehicleShape`) — literally equal to the pad's existing `PAD_ROCKET_K`.
Ascent scene's vehicle-size formula changed from an independent `25+totalH*0.95` fit-to-frame heuristic to
`clampA(shape.totalH*VEH_BASE_PX_PER_UNIT, 50, 190)`. No conversion factor was needed: pad and ascent both
already read the same `shape.totalH` from `buildVehicleShape()`. The `50/190` safety clamp is unchanged (50 =
readability floor for tiny early rockets, 190 = anti-overflow cap for heavy multi-stage vehicles) per user
decision to keep per-scene clamps rather than rework camera framing. `drawIsoPad`'s own sizing code is
byte-identical/untouched — it remains the reference. Headless: `node --check` OK; numeric check — a mid-size
vehicle renders at the exact same pixel height on both pad and ascent (86.88px, 0 diff, unclamped regime); a
heavy 4-stage vehicle correctly clamps to the ascent's 190px max rather than matching the pad's larger
gantry-clamped size. Next: **slice 2** — orbit/trajectory `craftSprite` (currently a fixed ~26px silhouette),
scale up toward the shared base with its own cap (per user decision), then wheel-zoom for ascent/trajectory/
orbit (new scope, approved).

**Vehicle-size unification, slice 2 — orbit/trajectory `craftSprite` (2026-07-05).** Replaced the flat
`clampA(26/totalH, 0.06, 0.5)` silhouette with `clampA(shape.totalH*VEH_BASE_PX_PER_UNIT, CRAFT_SPRITE_MIN_PX,
CRAFT_SPRITE_MAX_PX)` — same shared-base source as the pad/ascent, capped separately for orbit-view readability.
New tunable constants (flagged like `LIFTOFF_SEED_P`): `CRAFT_SPRITE_MAX_PX=46`, `CRAFT_SPRITE_MIN_PX=18`. Cap
chosen from real on-screen reference sizes: Earth disc 60px, Moon disc 26px, orbit corridor 68px — 46px keeps
heavy vehicles clearly bigger than the old flat 26px without dominating planets/orbits. Size driver is the
vehicle's **full** `totalH` (all stages), not just the small upper-stage/transfer silhouette actually drawn in
this scene — otherwise heavier rockets wouldn't read as bigger at all; the drawn silhouette scales up
proportionally as a result (a deliberate "sprite size = vehicle class" choice). Zero diff to the pad or ascent
formulas. Headless: `node --check` OK; small/mid/heavy test vehicles render 18/35.7/46px vs. the old flat 26px
for all three — floor, ramp, and cap all confirmed. Cap value is a manual in-browser judgment call, easy to
retune. Next: **slice 3** — wheel-zoom on the ascent/trajectory/orbit scenes (new capability, none exists there
today).

**Vehicle-size unification, slice 3 — flight-overlay wheel-zoom (2026-07-05).** Added manual pan/zoom to the
full-screen flight overlay (`#animOverlay`, ascent → trajectory → orbit phases), which had none before. Couldn't
reuse the pop-out's blit-based `initCanvasPopZoom` (the overlay draws straight to an on-screen canvas, no
offscreen source to blit) — instead mirrored the Cape view's CSS-transform pattern: canvases wrapped in a new
`#flightZoom` div, `flightCam` state (`initFlightZoom`/`applyFlightZoom`/`resetFlightZoom`/`flightClampPan`),
drag-pan + wheel-zoom-toward-cursor + dblclick-reset, 1–3× range. Camera state persists across phase
transitions (the canvas is continuously redrawn, never torn down) and resets only when a fresh flight opens
(`playMission`). A capture-phase click-swallow (after a >6px pan) prevents panning from firing the overlay's
existing post-flight "Continue ▸" click handler; the liftoff's own skip-listener lives on a separate element,
no conflict. `animEnabled=false` path fully bypasses `playMission`, unaffected. Headless: `node --check` OK;
zoom-toward-cursor math, pan clamping, range bounds, cross-phase persistence, and fresh-open reset all verified
by simulation. Feel of zooming mid-animation is inherently visual — not machine-checked. **This closes out the
vehicle-size-unification initiative** (shared base scale across pad/ascent/orbit + zoom everywhere).

## Session — CC pop-out functional parity with the normal Command Center view (2026-07-05)

Player request: the CC pop-out (`⤢ Pop out` on Command Center) showed the Cape scene visually but had none of
the normal view's clickable building hotspots (live status glyphs, labels, click-to-drill-in) — its info panel
even claimed "click a building… to drill in," which didn't actually work. Two-slice plan (tech-lead): refactor
the pop-out's zoom architecture first, then add the real hotspot layer, closing the pop-out before any
drill-in action (matching the existing `earthGoToCape()` precedent) since drill-in modals render at a lower
z-index than the pop-out's scrim and would otherwise open invisibly behind it.

### Slice 1 — pop-out transform-wrapper refactor ✅ (2026-07-05)

Replaced the pop-out's manual offscreen-canvas-blit-with-JS-math zoom (`fit`/`dw`/`dh`/`ctx.drawImage`) with the
same CSS-transform-wrapper pattern used by the Cape view and the just-shipped flight-overlay zoom: `drawCape()`
now renders straight onto the visible `#ccPopCanvas` at native `CAPE_W×CAPE_H`; new DOM nesting `#ccPopFit`
(letterbox-fit reference box, resized each frame) → `#ccPopZoom` (the `translate/scale` transform target,
where hotspots will live as % children in slice 2) → `#ccPopCanvas`. New `applyCcPopZoom`/`ccPopClampPan`/
`ccPopFitBox`/`initCcPopZoom` replace the old blit loop and `initCanvasPopZoom` wiring. The launch-liftoff
camera-chase math targeting `ccPop.{z,x,y}` was re-derived for the new semantics and **simplified** to the
byte-for-byte same form as the normal view's equivalent branch, once the letterbox fit is baked into the
reference box. Two small deliberate deviations: zoom-out floor raised 0.5×→1× (avoids a corner-shrink artifact
with `transform-origin:0 0`); liftoff's vertical framing reference shifted by a sub-percent amount in
letterboxed cases only (imperceptible). Headless: `node --check` OK; numeric parity — pop-out and normal-view
liftoff targets place the rocket at the identical screen fraction (0.500, 0.420) at multiple zoom levels;
wheel-zoom cursor-anchoring, range clamp, and pan clamp all verified. Skip-listener unaffected. Zoom *feel*
needs a manual browser pass. Next: **slice 2** — the actual `ccSpotsHTML()` shared hotspot layer + close-then-
act clicks + live glyph refresh.

### Slice 2 — shared hotspot layer + close-then-act clicks ✅ (2026-07-05)

Extracted `ccSpotsHTML()` from `renderCCCenter()`'s inline hotspot-building logic — now the single source for
both views (`renderCCCenter()` calls it for `#ccSpots`; the pop-out calls it for `#ccPopSpots`, a new sibling of
`#ccPopCanvas` inside `#ccPopZoom` from slice 1, so hotspots inherit the transform for free). Pop-out clicks are
handled via **one capture-phase delegated listener** on `#ccPopSpots` — resolves the clicked `.ccspot`, and if
it has a compiled `onclick`, stops propagation, calls `closeCCPopout()`, then invokes the original action —
rather than a second HTML variant; the normal view's inline `onclick`s are completely untouched. Live status
glyphs refresh every 30 frames (~2×/sec) inside the existing `ccPopLoop`, since glyphs only change on
game-turn boundaries, not every animation frame. A capture-phase drag-swallow click listener (mirroring
`initCapeZoom`'s `moved>6` pattern) keeps panning-that-starts-on-a-hotspot from misfiring its click.
**Known pre-existing gap, left alone deliberately:** the pop-out's side status board (`ccPopInfo`) still shows
its open-time snapshot rather than refreshing live like the new hotspot glyphs now do — flagged, not fixed, to
stay surgical to this slice's scope. Headless: `node --check` OK; confirmed exactly one hotspot-HTML-building
function used by both views (no duplicated building list); simulated click trace confirms close-then-act
ordering, drag-swallow, and planned-spot no-op. Visual placement/tracking/tooltip readability needs a manual
browser pass. **This closes out the CC pop-out functional-parity initiative.**

## Session — Suborbital/orbital failure-narration mismatch (2026-07-05)

Prompted by a user report that mission failure text could reference orbit/deep-space framing on flights that
never get there. Two bugs found in `resolveFlight`/`subsystemFragilities`, both from the same root cause: a
few pieces of the #16 failure model applied orbit- or deep-space-flavored outcomes unconditionally, without
checking whether the mission actually reaches orbital velocity.

**Bug 1 — wrong-orbit story on suborbital flights.** The avionics `partial`-severity failure always narrated
"the payload reached space but in the wrong orbit," even for Sounding Rocket / Reach Space / High-Altitude
Science / Reentry Test / First Astronaut — none of which reach orbital velocity (reqDv well under ~9,400 m/s).
**Fixed** with a new `missionReachesOrbit(m)` helper (`!!m.profile || (m.reqDv||0)>=9000`, matching the
existing `isOrbital` convention) — suborbital flights now get "...well off the planned trajectory" instead.

**Bug 2 — deep-space strand on a 15-minute hop.** `life_support`'s fragility weight carried a floor
(`Math.max(0.3,stress)`) regardless of mission duration and was hardcoded to `phase:'deep'`/`severity:'deep'`,
so **First Astronaut** (crew:1, days:0.2, no profile) could roll a life-support failure that resolved as a
`strand` — "a life-support failure on the long coast home," full rescue-mission mechanic — on a suborbital
ballistic arc lasting minutes. **Fixed**: for missions where `missionReachesOrbit(m)` is false, the floor is
dropped (risk now scales purely with actual `m.days`) and the entry is pushed as an ordinary `phase:'ascent'`,
`severity:'loss'` fragility instead, with a new `storyMap.life_support` line ("a cabin environmental-control
fault surfaced during the brief flight."). Checked every `MISSIONS` entry: First Astronaut is the *only*
crewed, non-profile mission with `reqDv<9000`, so this is provably balance-neutral for every other
crewed mission (crew_orbit/multi_day/endurance/luna_*/mars_*/jupiter_*/belt_mining/astrobiology all still
hit the pre-existing floor/deep/strand path unchanged).

**Known residual, left alone deliberately:** the pre-flight phase-breakdown UI (`SUBSYS_PHASE` static
key→phase map used by `flightPhaseBreakdown`/live-call eligibility) still buckets `life_support` under
"Deep space" regardless of mission, since that map is keyed by subsystem only, not by mission — a cosmetic
label mismatch only, not reachable by First Astronaut's actual failure resolution or by the reserve-margin/
10-day-leak mechanics (neither applies to it). Headless: `node --check` OK; traced `missionReachesOrbit`
against every mission definition by hand to confirm the isolation claim above.

## Session — Time hotkeys, featured research/build progress, tracked Launch (2026-07-05)

Three player requests. First two are additive/cosmetic; the third is a genuine behavior change to the
single most central function in the game (`launch()`), confirmed with the user in two rounds before
touching it (which flow, then the exact commit/concurrency semantics) since it isn't balance-neutral like
almost everything else this session.

**F1/F2/F3 time hotkeys.** New keydown listener calls the same `clickTimeArrow('day'|'week'|'month')` the
▸/▸▸/▸▸▸ buttons already use — so double-tapping F2 auto-runs at 1/week/sec exactly like double-clicking
does, and the running-arrow highlight comes along for free. Guarded like the existing scene-nav listener
(no modal open, not typing, not mid-animation). Caveat: some browsers/OSes reserve F1 for their own help
system and never deliver the keydown to the page — F2/F3 should be reliable, F1 is best-effort.

**Featured Active Research + Build/Launch progress.** New always-visible `#ccProgress` card on the Command
Center (`renderCCProgress()`, called from `renderCommandCenter()`), pulled out of `execOverview`'s cramped
one-line "Active R&D: …" mention (left untouched, harmless duplication). Shows the active research
project's own name + progress bar + time left, and — the more interesting half, see below — every
build/launch campaign in progress with its own bar + ETA, plus any hangar-ready vehicle with a one-click
Fly button.

**Direct Launch now builds as a tracked, real-time campaign instead of one instant jump.** Investigation
found the game already had a second build path — "Queue this build" (Assembly Bays) — that already ticks
down over real turns with a progress bar, landing in a hangar for a manual Fly click; it just wasn't what
the *primary* Launch button did. Rather than build a parallel tracking system, `launch(prebuilt)` now
routes a fresh (non-prebuilt) commit on a non-`window` mission straight into `queueBuild(true)` — the exact
same machinery "Queue this build" already used and this project already trusted. Confirmed with the user:
manual Fly click when the build completes (not auto-fly), and concurrent builds allowed (already inherent
to the queue's existing Assembly-Bays FIFO slotting — no extra work needed there).
- **`queueBuild(committed)`** gained a flag purely for clearer log text (`"Launch committed: …"` vs
  `"Manufacturing — queued …"`) — mechanically identical either way.
- **`queueSpecSnapshot()`/`loadOrderSpec()`** extended to carry `testLevel`/`rehearsal` — load-bearing now
  that Launch goes through this snapshot: the test-campaign/rehearsal choice made at commit time must
  survive to the later Fly click even if the player changes the Bench's live toggles for a different
  design while this one is mid-build. A legacy queued order (pre-this-session, missing these fields)
  degrades safely — falsy-guarded, doesn't stomp the live value.
- **Window missions excluded on purpose** (`mars_flyby`/`mars_orbit`/`astrobiology`): their build/test
  time must land exactly on the committed transfer-window date, which the generic queue has no notion of
  — confirmed this was the *original* design intent too (`canQueue`'s own comment already said "minus
  window/test/weather, which are resolved at launch"). They keep today's exact single-jump behavior,
  unchanged.
- **Queue-full guard added**: committing a launch when the manufacturing queue is already at `QUEUE_MAX`
  now logs a clear message instead of silently no-op-ing (a real edge case `canLaunch` can't see, since it
  has no queue-capacity awareness — `canQueue` does).
- **Scope boundaries, left alone deliberately (matches pre-existing behavior of "Queue this build",
  not a new gap this session introduced):** crew assignment isn't reserved for a build in progress — the
  player could reassign the same astronaut elsewhere mid-build, same as today's plain queue path; the
  post-build test-campaign/rehearsal/weather step (usually ≤3 months) still resolves in one instant jump
  the moment "Fly" is clicked, same as today's hangar flow — only the (usually larger) build-months
  portion is now trackable.
- **No SAVE_VERSION bump**: no old-save migration needed — the new `committed`/`testLevel`/`rehearsal`
  order fields are all read through falsy/existence guards, so a pre-existing queued order or a legacy
  save simply behaves as it always has.

**Validation.** `node --check` OK. 10/10 headless assertions against the exact production branch logic
(copy-verified, not reimplemented): non-window direct launch commits via `queueBuild(true)`; a window
mission and a `prebuilt=true` hangar-Fly call both still take the untouched old path; the queue-full guard
logs instead of silently failing; the testLevel/rehearsal snapshot round-trip survives an intervening live
Bench change; a legacy snapshot missing the new fields doesn't corrupt live state. Not yet browser-tested —
this is the biggest-risk change of the day (core launch flow) and needs a real playthrough before trusting
it fully, flagged same as the rest of this session's UI-heavy work.

## Session — #29: Filtered Flight & Ops log timeline (2026-07-05)

The always-visible `#opsTimeline` strip (shipped 2026-06-27) already had the date chip + UPCOMING items +
reverse-chron log; this closes the two things left open under #29: category filters and a collapse toggle.
Per-entry icons were the third ask — added as a side effect of building the filter (an entry needs a
category to filter by; showing that category's icon on the chip itself was free once computed).

- **New `logCategory(e)`** — coarse topic bucket (`launch`/`research`/`economy`/`rivals`/`crew`/`infra`/
  `other`) from `e.kind` + text-sniffing, same precision/spirit as the existing `logNav()` (which already
  infers a *navigation target* from log text) — not exhaustive, good enough for a filter. Checked
  most-specific-first so overlapping substrings land right (e.g. a `SUCCESS` line that also says "Crew of
  2 home safe" is `launch`, not `crew` — personnel-specific terms like *hired/quit/commended/poached* are
  what actually mean `crew`).
- **`TL_CATEGORIES`/`TL_CAT_ICON`** — the exact 6 named in the plan (All/Launches/Research/Economy/Rivals/
  Crew/Infrastructure) plus an `other` icon for whatever a filter can't place.
- **New `#tlControls` row** above the timeline strip: a filter pill per category (click to select, `All` is
  default) + a collapse toggle (`▾ Hide log` / `▸ Show log`) that hides just the scrolling chip strip, not
  the whole top bar (that's the separate, pre-existing `toggleTopbar()`). Both the selected filter and the
  collapsed state persist in `localStorage` (`ov_tlFilter`/`ov_tlCollapsed`), same pattern as the existing
  theme/wide-mode prefs — not part of `state`, so it isn't saved into/loaded from a game save, and a
  corrupted/unknown stored value falls back safely to `All`/expanded.
- `upcomingEvents()`'s three synthetic entries (active R&D, in-progress build, committed window) got a
  `cat` field too, so switching to "Research" also shows the live R&D countdown, not just past log lines.
- The existing "slide in the newest chip" animation now also checks the entry is literally
  `state.log[0]` (not just "first in the filtered list") — otherwise switching to a filter that excludes
  the actual newest entry would incorrectly animate an old one that happens to be first under that filter.

**Validation.** `node --check` OK. 21/21 headless assertions running `logCategory` **extracted directly
from the live file** (not a reimplementation) against 18 real message strings sampled from actual `log()`
call sites across the codebase (placeholders resolved to plausible values), one full pass per category
plus a deliberate `other` fallback case — all landed correctly. localStorage restore logic separately
verified against null/valid/garbage inputs (falls back to `all` safely in every non-valid case). Not yet
browser-tested — filter-pill layout/spacing in the topbar and the categorization's real-world accuracy
against actual gameplay logs both need a look, flagged like the rest of this session's UI-heavy work.
**Closes out #29.**

## Session — Finances pop-out: detailed current/past/future cash flow (2026-07-05)

User request: a "💰 Finances" entry point (added to the "This month" card on the Command Center's right
rail, next to the existing 📖 Chronicle button) opening a detailed pop-out — current breakdown, recent
transactions, a past trend, and a future projection, green for positive/red for negative throughout.

**Current.** `financesBreakdown()` itemizes revenue (facility income, Belt royalty, gov funding, passive
contracts) and expenses (base overhead, market/event surcharge, production upkeep, empire opex, bridge-loan
interest, partnership upkeep, payroll) — reusing the exact same functions `commandSummary()`/
`state.lastMonth` already call, just un-summed, so nothing here can drift out of sync with numbers shown
elsewhere. Near-zero items (<$1k/mo) are filtered so an inactive line (e.g. no royalty yet) doesn't clutter
the list.

**Recent transactions.** No formal transaction ledger exists in this codebase (~47 separate `state.money`
call sites — instrumenting all of them for a proper ledger was judged too invasive for this pass). Instead,
new `tlMoneyAmount()` pulls the dollar amount straight out of a log line's own already-`fM()`-formatted text
(e.g. "+$12.00M") — same heuristic-text-sniffing spirit as #29's `logCategory()`. `recentCashEvents()` scans
`state.log` (already newest-first, capped at 40 total entries across all categories) for the first parseable
$ amount per line. Best-effort, not a formal ledger — flagged as such in the code comment.

**Past.** `defaultMetricHist()`/`pushMetricHistory()` gained three new series (`revenue`/`expenses`/`net`,
alongside the existing money/rep/support/success/science), snapshotting `state.lastMonth` each month at the
same 24-month cap. New `netFlowBarsSVG()` — a genuine diverging bar chart around a zero baseline (green
bars above, red below), distinct from the existing `sparklineSVG` (a single line, one trend color for the
whole series) since monthly net can cross zero month to month. No SAVE_VERSION bump: `pushMetricHistory`'s
existing `push()` helper already guards `if(!Array.isArray(h[key]))`, so a legacy save's `metricHist` missing
these three keys just starts tracking them from the next tick — no migration needed.

**Future.** `financeProjections()` — a linear projection at the current recurring net rate (money now + net
× 6/12 months) when net is non-negative, or the existing `runwayMonths()` figure when it's burning down;
plus a short "known upcoming" list derived from state already present (an accepted mandate's bonus + due
date, any passive contract expiring within 3 months and the income that lapses with it, an open special
contract's bonus + deadline). Not a full future simulator — deliberately scoped to what's already knowable
from existing state, not a probabilistic forecast of research/mission outcomes.

**Validation.** `node --check` OK. 22/22 headless assertions run the actual `financesBreakdown`/
`tlMoneyAmount`/`recentCashEvents`/`financeProjections`/`netFlowBarsSVG` functions **extracted directly from
the live file** (not reimplementations) against stubbed inputs: revenue/expense sums match exactly and
near-zero items are filtered; dollar-amount parsing handles +/−/unicode-minus and correctly returns `null`
on non-financial log lines (including a deliberate false-positive check against "40%" in a scoop message);
recent-events ordering; both projection branches (positive-net horizon math vs. negative-net runway text);
all three upcoming-deltas sources (mandate/expiring contract/special contract) surface with correct
amounts; the bar chart never throws on an empty series and always draws its zero line. Not yet
browser-tested — the two-column layout, chart legibility, and log-mining accuracy against a real
multi-hour save all need a look, flagged like the rest of this session's UI-heavy work.

## Session — I5: research queue, depth 1 (2026-07-05)

First item picked off the second design-pass backlog. Scoped to Fable's "90% win": a single "next" slot,
not a multi-item reorderable queue — avoids the lab idling silently when a project completes mid-skip,
without the UI complexity of managing an ordered list.

New `state.researchNext` (nullable id). **Queueing a currently-*locked* node is allowed on purpose** — the
common case is mid-project, already knowing the next step in a prereq chain that isn't unlocked yet; real
eligibility is checked for real at start time, not at queue time, so this can't soft-lock anything.
`queueResearchNext(id)`/`clearResearchNext()` just set/clear the pick (no cost, no gate check — it's a
bookmark). `tryStartQueuedResearch()` is the one function that actually starts it: no-ops while a project
is still active; if the queued node no longer resolves (id vanished) or is already researched (e.g.
backfilled by `reconcileResearch()`), it's dropped silently; otherwise it stays queued — untouched — until
prereqs + science gate + affordability are *all* met, at which point it deducts cost exactly like a manual
`buyResearch()` (refactored the shared "actually start it" mutation into `startResearchProject(r, viaQueue)`
so the two paths can never drift apart) and clears the queue. Called from two places: right after
`completeResearch()` (the immediate happy path — already affordable the moment the prior project finishes)
and once every monthly tick (the deferred path — becomes affordable/unlocked later, without the player
needing to babysit it).

**UI:** `renderTechAction()` — when a project is already active and the selected tree node isn't done/active,
the disabled "Another project in progress" button is replaced with "📋 Queue next" (or "📋 Queued next",
disabled, if this node is already the pick). A dashed "Next up: X — auto-starts once..." row appears
whenever a pick exists, with its own ✕ Clear, regardless of which node is currently selected in the tree.
The `#ccProgress` Command Center card (shipped earlier today) also gets a small "📋 Next: X" line under the
active-research bar. No SAVE_VERSION bump — `researchNext` is a plain nullable scalar, safe under any
falsy-check, so a legacy save simply starts with no pick queued.

**Validation.** `node --check` OK. 17/17 headless assertions run the actual `queueResearchNext`/
`clearResearchNext`/`tryStartQueuedResearch`/`startResearchProject`/`buyResearch` functions **extracted
directly from the live file**: queueing guards (can't queue the active node or an already-researched one);
the three "stays queued, doesn't clear" cases (insufficient money, prereqs not met, science gate not met);
the three "clears without starting" cases (a stale/vanished id, an already-researched pick); the happy path
(cost + science both deducted correctly, log line distinguishes auto-start from manual buy); and a
regression check that `buyResearch()` itself is byte-identical in behavior after the shared-mutation
refactor. Not yet browser-tested — the new UI row's layout/wording needs a look, same as the rest of this
session's work.

## Session — I1: the content horizon (2026-07-05)

The big one off the second-pass backlog. Confirmed the finding first (missions really do stop at
`jupiter_orbit`; `BODIES` really does define Saturn through the Oort Cloud with nothing flyable) before
building — most of what was needed turned out to already be half-authored: `precision_edl` and
`fusion_propulsion_research` were research nodes whose own descriptions ("the drive every other transfer
stage has been building toward," "the most-studied path to true interstellar precursor missions") were
explicitly foreshadowing missions that were never built. This landed almost entirely as data — no new
architecture, no new subsystem, reusing the generic `profile`/lander/ISRU-free-leg machinery every existing
deep-space mission already runs on.

**Mars Landing** (`mars_landing`) — gated on `precision_edl` (already existed, `reqMissionDone:'mars_flyby'`,
zero mechanical effect until now). Descent reuses `mars_orbit`'s implied 1000 dv surface leg (mostly
aerodynamic); **ascent is 4100 dv — more than double the Moon's 1730** — Mars's thin atmosphere still
cushions the way down but gives no lift on the way back up, unlike the Moon's roughly-symmetric profile.
Added an `ISRU_FREE_LEG` entry pointing `mars_isru` at the *ascent* leg rather than TEI (mars_orbit's
mapping) — Sabatier ISRU's classic real-world application is fueling the ascent vehicle, not the return
cruise. Ares Program extended to include it (reward bumped 60/130→100/190 for the 3rd, much harder
objective); the Red Planet ambition's capstone raised from `mars_orbit` to `mars_landing` — landing, not
just orbiting, is the actual "hardest thing anyone has ever attempted."

**Saturn/Titan pair** (`saturn_orbit`, `titan_landing`) — `BODIES.saturn`/`titan` had full Δv legs and rich
flavor text ("you can aerobrake here, and almost fly") but no `missions` array at all. Gated on
`nuclear_electric` (a sibling of Jupiter's `rad_shielding` off the same `nuclear_thermal` prereq — no
soft-lock, and its own description already says it "makes the deep outer system reachable"). Titan's ascent
(1500 dv) is deliberately far cheaper than Mars's (4100) — thick atmosphere + a seventh of Earth's gravity
make it the gentlest departure of any landing in the game, a direct contrast the flavor text leans into.
New **Cronian Frontier** program (`saturn_orbit`+`titan_landing`) and **The Methane Shore** ambition
(capstone `titan_landing`). Retired stale "capstone"/"furthest humans have ever gone" wording from
`jupiter_orbit`'s and the Jovian Frontier ambition's blurbs now that something sits beyond them.

**Interstellar precursor** (`oort_precursor`) — the true endgame capstone, gated on
`fusion_propulsion_research` (itself gated behind `jupiter_orbit` completion). Uncrewed, one-way, science-
flagged (Voyager precedent: "the point is the burn, not the destination"). `BODIES.oort` went from `legs:[]`
("schematic ring only") to a real illustrative leg. New **Daedalus Program** and **First Light, First Star**
ambition — the last program/ambition on their respective lists.

**Second scoring bookend (I2) not attempted this round** — scoped as its own backlog item, left for later.

**Validation.** `node --check` OK. 137/137 headless assertions against the actual `MISSIONS`/`PROGRAMS`/
`AMBITIONS`/`BODIES`/`RESEARCH`/`ISRU_FREE_LEG` data **extracted directly from the live file**: no duplicate
ids anywhere; every new mission has a valid reqResearch gate resolving to a real node, a non-empty profile
with valid `by`/positive `dv` on every leg; both lander missions correctly declare `dropAfter` on their
descent/ascent legs; the Mars-vs-Titan ascent asymmetry holds (Mars >2× Titan); `oort_precursor` is
uncrewed/one-way/science-flagged; every `PROGRAMS`/`AMBITIONS`/`BODIES.missions` reference resolves to a
real mission id (including the 3 new/updated programs and 2 new ambitions); every ambition's capstone is
reachable by `ambitionProgress()`'s own PROGRAMS-walk; the `mars_landing` ISRU leg-name mapping matches its
own profile exactly; and the three new/reused research gates (`precision_edl`, `nuclear_electric`,
`fusion_propulsion_research`) have fully-resolving, non-circular prereq chains. Balance (payout/rep/minRep/
days scaling, whether the new late-game missions feel appropriately hard vs. rewarding) is inherently a
playtest call, not something a headless check can validate — flagged for Playtest Zero same as everything
else. No SAVE_VERSION bump (pure data — no new state shape, `programsAwarded`/`ambitionFulfilled` already
handle new ids generically).

## Session — I2 + I3: second scoring bookend, generalized crisis roster (2026-07-05)

**I2 — second scoring bookend.** New `SCORING_YEAR_2=2100` (the Speculative era opens), a fully independent
flag (`state.eraScored2`) alongside the original `state.eraScored` — both checked every `checkScoringDate()`
call, both can fire in the same call if a save somehow starts past both thresholds at once (currently
unreachable in normal play, but the harness covers it since it's cheap to). New `showChronicle('era2')`
mode: its own heading ("A new age dawns — 2100") and sub-text, shares the `'era'` mode's Continue/Retire
button branch rather than the plain-Close one. `legacyScore()` gained `fusionFlown` (has `oort_precursor`
been completed?) and a flat +20 bonus for it — the "deep-space dimensions" framing Fable asked for turned
out to already be covered by existing stats (worlds reached, facilities, the P11 crisis) once `fusionFlown`
filled the one actual gap. No new migration needed — `state.eraScored`'s own convention was already "no
explicit default anywhere, just read via a falsy check," so `eraScored2` follows the identical pattern.

**I3 — generalized crisis roster.** P11 shipped exactly one crisis (a debris cascade), explicitly a
one-time arc. This generalizes the same escalate/fund/resolve skeleton across a new `CRISES` config (3
entries, matching Fable's suggestion) instead of hardcoded debris-only logic:
- **Debris Cascade** (unchanged from P11) — LEO-reliability tax, gated on `leoFlights≥40` + Commercial era.
- **Solar Storm Season** (new) — deep-space-reliability tax (any `profile` mission), gated on a new
  `deepFlights≥15` counter (incremented alongside `leoFlights` at mission-success) + Expansion era.
- **Funding Collapse** (new) — a political/economic crisis with *no* mission-reliability effect at all;
  instead cuts `govMonthlyFunding()`'s earned grant by up to 50% (the difficulty-based funding floor is
  untouched — a funding cut hits discretionary support-based income, not the baseline safety net). Gated on
  era alone (Station & Shuttle+, no flight-count threshold) — the earliest-reachable, most political of the
  three.

Only one crisis is ever active at a time (unchanged from P11); after one resolves, the *same* type can't
immediately roll again next time (variety over a full game), but the game is no longer a one-shot — new
`state.crisisHistory[]` records every resolution. **Lazily backfilled from P11's original singular
`state.crisisDone`** the first time `crisisHistory()` is called (an old save's one already-resolved crisis
just becomes history entry #1) — no explicit migration function, no SAVE_VERSION bump. `legacyScore()`'s
crisis bonus now sums across the whole history instead of reading a single object. Effect dispatch is
data-driven: `crisisRelPenalty(m)` checks the active crisis's `effectKey` (`'leoRel'`/`'deepRel'`) against
the mission; `crisisGovFundingMult()` is 1 (no-op) unless the active crisis's `effectKey` is `'govFunding'`.
Fund cost, modal copy (title/description/effect label), and all three log lines (trigger/mitigated/endured)
are now per-crisis-type data rather than hardcoded strings — the 3 UI touchpoints that previously said
"Debris crisis" unconditionally (outliner row, Command-tab badge, `showCrisisModal`) now read the active
crisis's own name/icon.

**Validation.** `node --check` OK. I2: 26/26 headless assertions (fusion bonus math, both scoring-date
flags firing independently/together/in-sequence, `showChronicle`'s per-mode heading/button/stat-row
branching, the interstellar stat row appearing only once flown) — re-run and confirmed unaffected after I3
landed on top of it (since `legacyScore` now calls the new `crisisHistory()`). I3: 44/44 headless assertions
against the actual production functions **extracted directly from the live file**: era/threshold gating per
crisis type (including the flight-count-free `funding_collapse` case); only one crisis eligible at a time;
same-type-can't-immediately-repeat; the singular-to-array lazy backfill (and its idempotency); effect
dispatch correctly isolated per type (a LEO tax never leaks onto a deep mission and vice versa;
`funding_collapse` has zero mission-reliability effect; only `funding_collapse` ever touches the gov-funding
multiplier); per-crisis fund-cost scaling (different base cost per type, rising with era, `Infinity` with no
active crisis); the full escalate→fund→fall→resolve lifecycle generically across two different crisis
types (mitigated via `debris_cascade`, endured via `solar_storm`); and `showCrisisModal`/
`canFundCrisisRemediation` rendering/gating correctly for all 3 types without throwing. No SAVE_VERSION
bump for either slice.

## Session — I6: aerocapture as a real mechanic (2026-07-05)

Last open Improvement on the second-pass backlog. The `aerocapture` research node already existed (req
`precision_edl`) with `effect:{}` — a pure no-op, exactly like Fable found. Its sibling `gravity_assist_planning`
turned out to have the identical shape (`effect:{}`, mechanical effect hardcoded ad-hoc in `simulateMission`
instead of the generic effect-object system) — so this landed as a direct extension of an already-proven
pattern, not a new mechanism.

`simulateMission`'s `legDv(leg)` closure (the single point every leg's effective Δv already flows through,
for both the displayed capability numbers and the actual propellant-burn math) gained a second multiplier
alongside the existing `gaMult`: `aeroMult=state.research.aerocapture?0.3:1`, applied to any leg whose name
matches a new `AEROCAPTURE_LEG_RE` — `Mars Orbit Insertion`/`Jovian Orbit Insertion`/`Saturn System Capture`,
the three existing orbital-*capture* legs at genuinely atmosphere-bearing bodies (Mars, Jupiter, Saturn).
Deliberately excludes Ceres/Lunar insertions (airless — no atmosphere to skim) and the interplanetary
*injection* legs (gravity-assist's own job, a different real technique). **The two can legitimately stack**
— `Saturn System Capture` contains "Saturn" and is `by:'transfer'`, so it already matched
`gravity_assist_planning`'s own pre-existing regex too; a well-planned gravity-assisted approach genuinely
can also set up a cheaper aerocapture in reality, so this wasn't corrected, just confirmed intentional-enough
to leave alone. 70% cut chosen deliberately steeper than gravity-assist's 8% shave — aerocapture skips the
propulsive burn almost entirely, not just a trajectory optimization.

Added a `missionAerocaptureLeg(m)` helper (finds the matching leg in a given mission's own profile, or
`null`) and wired an "Aerocapture is online" mention into the mission-economics `.eq` info text, right
alongside the existing ISRU-online callout — same convention, same spot. Research node's own `desc` text
gained a concrete `<b>−70% Δv on Mars, Jovian and Saturn orbital-capture burns.</b>` callout (previously just
narrative, no number, matching what every OTHER research node with a real effect already states).

**Validation.** `node --check` OK. 18/18 headless assertions against `legDv`'s exact logic (copy-verified
line-for-line against the live file — extracting the whole `simulateMission` function wasn't practical
given how much game state it closes over) plus the real, directly-extracted `missionAerocaptureLeg`: no
discount with neither tech researched; aerocapture alone cuts exactly the 3 targeted legs by 70% and
nothing else (confirmed airless captures, transfer-injection legs, and the launch-vehicle leg all stay
untouched); gravity-assist alone only touches its own regex's legs; both researched stack correctly and
sequentially on `Saturn System Capture` while `Mars Orbit Insertion` (never in gravity-assist's own regex)
only gets aerocapture's cut; the helper correctly finds/misses the leg in realistic mission-shaped profiles
and doesn't throw on `null`/profile-less input. No SAVE_VERSION bump (no new state; `effect:{}` stays empty,
matching `gravity_assist_planning`'s own precedent for this exact class of ad-hoc research effect).

**This closes out every Improvement (I1–I6) on the second-pass backlog.** Remaining: the 7 Pruning
candidates and 6 Flow-polish items, including Fable's own top pick (Playtest Zero + merging the duplicate
Launch/Queue buttons + an auto-fly option).

## User-directed: unified flight pop-out overlay (2026-07-09, Slice A)

New top-level ask (not from the second-pass backlog above): launch → ascent → orbit → reentry should
play as **one continuous pop-out** instead of separate containers/modals. Plan agreed with the user,
sliced A–D; **A shipped this session**, B/C/D not started.

**Why this supersedes (for launches) the 2026-07-04/07-05 `playLiftoff`/pop-out-as-launch-default work
above, deliberately, not by accident:** that work made every animated launch open the CC pop-out, rise
the rocket on the isometric Cape view with a camera zoom-chase, then cut into the full-screen ascent
overlay. It was well-crafted (playtest-tuned easing, seed-continuity math so the cut lands mid-climb,
pop-out camera parity, skip-listener threshold tuning) — but it's still fundamentally **two containers
with a cut between them**, which is exactly what this new ask is against. User was shown both options —
(a) retire the iso liftoff and build a real pad phase inside the overlay itself, or (b) keep the iso
liftoff and make the cut a tuned crossfade — and chose **(a)**, explicitly, after the tradeoff was laid
out. `playLiftoff` and its supporting code (`_liftoff`/`_liftoffArmed`/`LIFTOFF_SEED_P`/the pop-out
camera-parity branch) are **left fully defined and working, just not called during a launch anymore** —
by explicit user instruction, in case it's wanted again later. The Cape pop-out itself is untouched as a
manual feature (the "⤢ Pop out" button still works anytime); only its automatic-open-on-launch behavior
is gone, because there's no longer a launch-time cut for it to smooth over.

**What Slice A actually built.** A real pad phase (`drawPad`, `PAD_PHASE_MS=3200`, `PAD_HOLD_FRAC=0.55`)
now plays first, on the flight overlay's own canvas — silent countdown hold, then an ignition ramp
(`A.ignite` 0→1, read by `drawAscent`'s flame/exhaust calc) with an engine-audio start timed to the
ramp's onset. `drawPad` calls `drawAscent(0, false)` directly — the pad IS ascent's own p=0 frame, not a
separate art asset — so the handoff at padDur is the literal same draw call on both sides, proven in test
(rocket X, altitude fraction, and ignite are frame-continuous across the seam; no crossfade needed there).
`drawScene` now runs the pad phase first, then shifts an `at = t - padDur` clock into the existing
ascent/cruise/reentry math unchanged. `finalizeLaunch`'s dispatch simplified to always `playMission(spec,
finish)` for animated launches (no more `_liftoffArmed` branch). A `spec.mode:'arrive'` flag skips the pad
entirely (`padDur=0`) — groundwork for Slice B's deferred-arrival replays, which never had a "launch" to
show in the first place.

**Free wins from landing after the 2026-07-05 work, not before:** the pad phase inherits the *shared*
`VEH_BASE_PX_PER_UNIT` vehicle scale (pad/ascent/orbit already render vehicles at one consistent pixel
size, per that session's unification work) and the overlay's own wheel-zoom/pan camera
(`initFlightZoom`/`resetFlightZoom`, called once per `playMission()`) — both automatically, since the pad
phase is just another phase on the same canvas with the same camera. No extra work needed to keep it
visually consistent with ascent/orbit.

**Validation.** `node --check` OK. New headless suite (34/34) — first suite in the project to actually
drive `animEnabled=true` rendering rather than staying on the headless fast path; required adding a
permissive fake canvas-2D-context + a fuller Web Audio API stub to the shared test harness (`prelude.js`),
now reusable for Slices B–D. Covers: pad phase is the entry state with `ignite=0`/engines cold; ignite
stays exactly 0 through the countdown hold, ramps 0→1 after it, engine-start SFX fires exactly once at
the ramp's onset; the pad→ascent seam is frame-continuous (rocket X/altFrac/ignite match on both sides);
a full pump-driven flight (real `animLoop`/`endAnim`, controlled virtual clock, not reimplemented phase
math) visits pad→ascent→orbit and ends correctly held on a successful orbital flight; `mode:'arrive'`
skips the pad and starts hot (`ignite=1`, engine already running); an ascent-phase failure still starts on
the pad and still fails correctly; a cislunar/deep flight reaches the cislunar phase without throwing;
`finalizeLaunch` never calls `playLiftoff` anymore and `_liftoffArmed` ends false; the headless
(`animEnabled=false`) dispatch path is confirmed to never create `animState` at all — genuinely
untouched, not just re-tested. Full gauntlet at pause: pad-A 34 + dept-A 42 + dept-B 27 + dept-C 30 +
materials 46 + regression 18 = **197/197.**

**One bug found and fixed during this slice** (not pre-existing, introduced then caught in-session):
without an explicit reset, `A.ignite` would drift to a near-but-not-exactly-1 value at the end of the pad
ramp (an easing-curve tail) and then sit there for the *entire rest of the flight*, permanently shaving a
fraction off the ascent flame size. Fixed with an explicit `A.ignite=1` the instant the pad phase ends —
caught by the handoff-continuity test, not by inspection.

**Aside, logged for hygiene:** an earlier attempt this session at fixing the unrelated
`pendingCelebration`/1990-scoring-date crash (see the "#19 Organizational scaling" session's flagged bug)
built a `pendingChronicle`/`drainPendingChronicle` deferral system, then discovered upstream had already
landed a simpler inline fix (`showChronicle('era')` directly in `checkScoringDate`, from the "I2: second
scoring bookend" work) in the same window. Discarded, never pushed. `test-chronicle.js` (which validated
the discarded version) is retired — renamed `.OBSOLETE` rather than deleted, in case its patterns are
useful reference, but it is **not** part of the active suite set and will fail if run (it references
functions that don't exist in this file, on purpose).

## User-directed: unified flight pop-out overlay (2026-07-09, Slice B)

**B shipped this session** (A shipped earlier the same day; C/D still not started). Slice B is the mirror of
Slice A's launch-time pad phase, at the other end of a deferred flight's launch-day session.

**The problem it fixes.** A deferred (≥`DEFER_CRUISE_DAYS`=60-day) interplanetary launch — `proceedLaunch`'s
`missionDays>=DEFER_CRUISE_DAYS` branch — registered the live flight, logged "departed — arrival in ~N mo",
and **returned with no animation at all**. The launch-day session for the biggest, most expensive flights in
the game just *cut to nothing*. (The mission's real, resolved-at-launch outcome still lands on ARRIVAL turns
later via `pumpFlightArrivals` — that's unchanged and out of scope here.)

**What Slice B actually built.** A "cruise begins / ETA" outro card, played on the flight overlay's own canvas
via a new `spec.mode:'depart'` flag — the deliberate mirror of Slice A's `'arrive'`. Where `'arrive'` *drops
the pad* (an arrival never had a launch), `'depart'` *keeps the pad but drops the orbit/cruise/reentry tail*
(a departure has a launch to show, but its outcome is a spoiler that belongs to the arrival). So a deferred
departure now plays **pad → ascent → cruise-begins card**, then holds for the player to dismiss. Threading:
`setupFlightState` gives depart mode its own `totalDur = padDur + ascentDur + DEPART_CARD_MS` (new const,
4200 ms) with no cruise/reentry; `drawScene`'s post-ascent `else` branch, right after the same one-time
context-reset + `captureHandoff('cruise')` the normal path uses, routes depart flights into the card with the
existing `beginHandoff`/`finishHandoff` crossfade (so the ascent→card seam eases exactly like ascent→orbit)
instead of `drawOrbit`/`drawCislunar`/`drawReentry`. `endAnim` holds a depart flight on the card (not on
`drawPostFlight`'s "ORBIT ACHIEVED" stats, which would be wrong for an unresolved departure). New
`drawDepartCard(ct, held)` renders it in the overlay's own language: deep-space `spaceBg`, a receding Earth
lower-left, the real `drawCraftSprite` coasting toward a destination pip along a dashed transfer line, and a
fade-in panel with DESTINATION / TRANSIT (days + ~months) / ARRIVAL (`dayToDate(arriveAbs)`) / CREW. Dispatch:
`proceedLaunch`'s deferred branch now builds a `buildDepartSpec(m,crewed,missionDays,rec.arriveAbs)` (mirrors
the `finalizeLaunch` flight spec — same vehicle geometry/livery/rng shape so pad+ascent render identically —
but always `success:true`/`failPhase:null`) and, **only when `animEnabled`**, plays it with the settle
(`_flightResolving=false; render(); pumpFlightArrivals()`) moved into the `done` callback; animation-off /
headless takes that settle synchronously — byte-identical to the old return. The held card reuses Slice A's
"Continue ▸" button + dismissal wiring, extracted from `drawPostFlight` into a shared `drawFlightContinueBtn`.

**Balance-neutral.** Purely presentational: no `SAVE_VERSION` touch (no new persisted state — the card exists
only during an active overlay session), no mechanics change. Short/non-deferred missions never reach
`buildDepartSpec` (guarded by `missionDays>=DEFER_CRUISE_DAYS`); animation-off is proven byte-identical.

**Validation.** `node --check` OK. New headless suite **`test-depart-b.js` (39/39)** — reuses Slice A's
`pumpFlight()` (real `animLoop`/`endAnim` on a controlled virtual clock) + the shared `harness.js` canvas/audio
stubs, no new harness needed. Covers: `buildDepartSpec` is always a clean success carrying transitDays/etaAbs/
destName/crew (uncrewed *and* crewed); a depart flight keeps the full pad (unlike `'arrive'`) and gets the
launch+card-only `totalDur`; a pump-driven departure visits pad→ascent→**depart** and provably **never** enters
orbit/cislunar/reentry/suborbital, ending *held* (not an abrupt cut, not auto-closed), `done()` withheld until
dismiss; dismiss settles + tears down; the hold draws the card, never `drawPostFlight`; the real `proceedLaunch`
dispatch on `belt_survey` (uncrewed, 780 d) builds the card + registers the deferred flight with anim ON, and
with anim OFF builds **no** card / creates **no** `animState` while still registering the flight; a short
(`first_sat`, 0 d) mission never builds a depart card. Full gauntlet at pause: regression 18 + materials 46 +
dept-a 42 + dept-b 27 + dept-c 30 + pad-a 34 + **depart-b 39** = **236/236.** No bugs surfaced this slice (the
`'arrive'` groundwork Slice A left in `setupFlightState` made the `'depart'` mirror land cleanly first try).

### Remaining — Slices C, D (not started)
- **Slice C** — bring the live-flight decision modals (abort/press-on, reserve, anomaly, rescue) into
  in-overlay mission-control panels instead of separate `showModal` calls; weather go/no-go becomes an
  overlay panel too (user confirmed) rather than staying a pre-flight modal. Existing `_pending*` guard
  state and `pumpFlightArrivals` gating stay exactly as-is — presentation-only change.
- **Slice D** — unified chrome/transition-timing polish pass across all phases (pad/ascent/cruise/
  reentry/decision panels), once B and C exist to polish.

## Session — E0.1 file split + concat build, slice (a) (2026-07-10)

**Slice (a) shipped: the mechanical split + build script + harness parity, zero behavior change.**
Slice (b) (hygiene the split makes cheap) deliberately untouched. `orbital-ventures.html` is no
longer hand-edited — it is now a **generated build artifact**; source lives in `src/`.

**What shipped.** The single 15,408-line inline `<script>` is now seven plain classic-script modules
in `src/`, loaded in order into one shared global scope: `data.js` (1–1396: ERAS/staff/DEPARTMENTS/
RIVALS/ENGINES/MISSIONS/RESEARCH/BODIES/DIFFICULTY + small helpers), `sim.js` (1397–6322: `state`,
`newGame`, `advance`, contracts/rivals/facilities/build-queue/materials, `simulateMission`,
`resolveFlight`), `save.js` (6323–6563: save/load/export-import/recap/startup), `shell.js` (6564–6939:
anim flags, wide mode, THEMES, fullscreen, keyboard listeners, WebAudio sfx), `flight.js` (6940–9776:
WebGL-2D compat layer + flight overlay + FlightScene + drawScene/reentry), `render.js` (9777–15399:
`render()`, iso Cape/Veh/Map/Station Phaser scenes, STATION_MODULES, popouts, tech tree, timeline),
`main.js` (15400–15408: the `newGame(); render(); applyWide(); applyTheme(); showStartup();`
bootstrap). Line numbers are extracted-script-local (HTML line = +755).

**Build.** `build.js` (repo root, plain Node, zero deps): a single `MODULES` array is the order source
of truth; `src/shell.html` is the page template with the whole `<script>` block replaced by an
`<!-- OV:SCRIPTS -->` placeholder. One `node build.js` emits **(a)** `orbital-ventures.html` — placeholder
→ `<script>`\n + modules joined + \n`</script>`, each tag on its own line so the harness's `awk`
extraction is unaffected; **(b)** `build/game.js` — the bare concatenated body for the harness; **(c)**
`index.html` — the same template with `<script src="src/X.js">` tags, so dev and release can't drift
structurally. **Loading is plain ordered `<script src>` tags, NOT ES modules** — required to preserve
global-scope semantics for the 241 string `onclick=` handlers. No banner/"generated" comments in the
module files, so the first build is **byte-identical** to the pre-split HTML.

**Deviations from the original E0.1 wording (both user-approved up front).** No separate `phaser.js`:
the four non-flight Phaser scenes (Cape/Veh/Map/Station) are interleaved with render code and aren't
cleanly separable, so they stay in `render.js` — a 7th file, `shell.js`, took `phaser.js`'s slot.
`render.js` is **deliberately not** split further into render+scenes despite its size (5.6k lines) —
user's call, same interleaving reason. Two cosmetic seam nudges off the approximate line numbers so a
section/descriptive comment travels with the code it heads: the `/* flight animation (canvas) */`
header opens `shell.js` (6564, not 6565); the bootstrap's explanatory comment opens `main.js`
(15400, not 15403). Every seam falls on a top-level-statement boundary — confirmed by `node --check`
passing on each module standalone.

**Behavior-preservation audit (the real risk: cross-script hoisting).** In one script, a top-level
statement can reference a function/const declared later (hoisting/TDZ); across ordered `<script>`s it
can't. Audited **every** top-level executable statement (not function bodies — those run after all
scripts load): all load-time references resolve within their own module or an earlier one. The
shell.js listener registrations (`applyWide`/`syncTopbarH`/`_firstGestureFs` as args to
`addEventListener`, plus `wideOn`/`THEMES`/`currentTheme`) all resolve inside `shell.js` itself
(functions hoist within the file; the lets/consts physically precede their use). The `main.js`
bootstrap only calls into earlier modules. **One known pre-existing bug left exactly as-is** (noted,
NOT fixed — out of scope): the top-level `try{ …TL_CAT_ICON[f]… }catch(e){}` at extracted line 9775
(now in `flight.js`) references `TL_CAT_ICON`, a `const` declared ~5,600 lines later (line 15345, now
in `render.js`). It was a swallowed TDZ `ReferenceError` when everything was one script; split across
ordered scripts it's a swallowed "not defined" `ReferenceError` — same net effect (`_tlFilter` stays
`'all'`, error caught), behavior preserved. If anyone ever "fixes" this, do it as its own change with
its own validation.

**Validation.** (1) Baseline before touching anything: 236/236. (2) Scripted byte-exact split
(line-offset slicing, not copy-paste), then `node build.js`, then `cmp` of rebuilt vs pristine
`orbital-ventures.html` → **byte-identical** (same md5). (3) Full suite against the rebuilt HTML via the
existing `awk` path → 236/236. (4) Harness recipe repointed to `build/game.js` (`node build.js && cat
harness.js build/game.js test-X.js | node`); added the build-parity cross-check `awk(orbital-ventures.html)
== build/game.js` → identical; full suite → 236/236. Updated the recipe in `tests/harness.js` +
`tests/README.md`. (5) Dev `index.html` verification: no browser/puppeteer/jsdom is available in this
environment, so **no real-browser render smoke test was run** — flagged for the user to do once. Instead,
static audit (above) **plus** a faithful ordered-multi-`<script>` simulation: Node v22 `vm.runInContext`
shares top-level `let`/`const`/`function` across separate script runs while preserving per-script
hoisting + ordering (verified) — i.e. exactly browser classic-`<script>` semantics for the one thing
that could differ. Ran all seven modules as separate ordered scripts under the harness stubs; the game
booted with **zero** thrown load errors and the full suite passed **236/236** in that multi-script
context (identical to the concatenated path).

**Test counts:** the official suite is the seven files `test-regression`(18) + `test-materials`(46) +
`test-dept-a`(42) + `test-dept-b`(27) + `test-dept-c`(30) + `test-pad-a`(34) + `test-depart-b`(39) =
**236/236**, unchanged at every checkpoint (baseline → awk-rebuilt → build/game.js → multi-script
sim). `test-progress-unify.js` is a separate WIP suite that was **already 23/35 at baseline** (12
checks fail on unfinished F4 behavior) — **not** part of the 236, and it stayed **23/35** through the
split (behavior preserved, as required). Real-browser check of `index.html` done after this session by
the user ("everything looks exactly as before") — slice (a) fully validated. Committed + pushed as
`963d86f`.

## Session — E0.1 slice (b): trimmed backwards-dependency cleanup + TL_CAT_ICON fix (2026-07-10)

**Scoped by a tech-lead pass first** (real risk here, unlike slice (a): moving code changes its
position in the concatenated build, reopening the cross-script load-order question slice (a) sidestepped
by never moving anything). Verified against the actual post-split `src/` files, not the pre-split
scoping guesses. Most originally-flagged "misplaced" code turned out fine on inspection (`poolOf`,
`currentEra`, the data.js family/blueprint region, the sim.js UI-builder functions) — moving those would
have been taxonomy churn with no payoff, explicitly declined. Only 3 real issues existed, all the same
shape: `sim.js` calling backwards into `render.js` for economy logic and station data.

**Moved (all three, ordering-safe — each moves a declaration to an *earlier*-loading file, which can
never break a later reference):**
- Special-contracts cluster (`SPECIAL_MODS`, `SPECIAL_COOLDOWN_MO`, `specialCandidateMissions`,
  `tickSpecialContract`, `fulfillSpecialIfMatch`): `render.js` → `sim.js`, placed after
  `tickPassiveContracts`.
- `monthlyPayroll`: `render.js` → `sim.js`, same neighborhood.
- `STATION_MODULES` + `STATION_PORT_BASE` (plus its "side-view module spec" doc comment):
  `render.js` → `data.js`, placed right after `FACILITY_DEFS`. `stationActiveModule`,
  `stationExpanded`, `toggleStationExpand` (UI state) stayed in `render.js`.

**Verification (no longer byte-identical, since content genuinely moved — a new invariant was needed):**
sorted-line diff of `build/game.js` before vs. after is **identical** (same multiset of 15,408 lines —
proves pure relocation, nothing edited/dropped/duplicated, confirmed against a fresh clone of the
pre-slice-(b) commit `963d86f`). `node --check` clean on every touched module. Full suite **236/236**
after the move. `awk`-extraction-vs-`build/game.js` cross-check still identical. Byte size of the built
HTML unchanged (1,246,630 bytes) — expected, since total content didn't change, only position.

**Separate bug-fix commit (not bundled with the moves above — this one is a real, if tiny, behavior
change):** the pre-existing `TL_CAT_ICON` issue noted in slice (a) — a top-level statement in
`flight.js` referenced `TL_CAT_ICON`, a `const` declared ~5,600 lines later in `render.js`, silently
swallowed by a `try/catch`, so the timeline category-filter preference never actually restored on
reload. Fixed by moving just the `TL_CAT_ICON` declaration (one line) to the top of `data.js`, which
loads before everything else. Verified the fix landed: in the rebuilt bundle the declaration is now at
line 6, its use in `flight.js` is at line ~9893 — declared well before used. Full suite still 236/236
after this change too.

## Session — E0.2 slice (a): save serialization fix + load-path unification (2026-07-10)

**Scoped by tech-lead first.** Found export/import (backlog #6) and autosave (backlog #8) already mostly
shipped in `src/save.js` — real remaining E0.2 scope smaller than the roadmap bullet implied. **Key
architecture call (user-approved):** localStorage stays the canonical live-game save; IndexedDB (slices
B/C) will be purely additive for manual slots + an autosave ring — rejected making IDB primary because
`beforeunload`'s synchronous-write guarantee (tab-close protection) matters more than storage-layer
cleanliness, and an IDB-primary design would need a one-time migration copy on first boot (a real
data-loss window for zero benefit). Ring cadence agreed for slice B: game-month-change AND ≥3 real
minutes (both conditions — time-warp can't spam it, idling can't duplicate it). Import/restore will get
an auto-backup safety net in slice B (closes a real footgun: importing a file today silently clobbers
your live save within ~4s via the next autosave). Manual-check target platform: Firefox via `file://`.

**Slice (a) shipped — pure refactor, zero user-visible behavior change:**
- Fixed the double-serialize (`JSON.stringify({...state:JSON.parse(JSON.stringify(state))})`) in
  **both** `writeSave` *and* `exportSave` — the roadmap bullet only named `writeSave`; `exportSave` had
  the identical waste, found during implementation. Confirmed **empirically** (not just reasoned) that
  old double-serialize and new single-pass output are byte-identical, against a played-forward state
  with an in-progress interplanetary flight (exercises nested `activeFlights`/`ctx.m`/research/staff
  structures) — `JSON.stringify` applies the same undefined/NaN/toJSON normalizations whether it sees
  the original object or a round-tripped clone of it, so the inner clone really was pure waste.
- Unified the two duplicated load paths (`loadSaveFromText`, `autoLoad`) into one `applyLoadedSave()`
  (migrate → defaults → `reconcileResearch` → `rehydrateFlights`). The two original blocks were
  confirmed **character-identical** before merging — they diverged only in per-call-site invalid-save
  handling (throw vs. return false) and post-load UI work, which correctly stayed at the call sites.
  This closes a latent corruption risk: a future migration added to one path but not the other would
  previously have silently produced two classes of save behavior.
- New `tests/test-save.js`, **34/34**, deliberately proven non-vacuous by sabotage-testing scratch
  copies: neutering each migration (window scaling, facility autoResupply default, eraSeen backfill) one
  at a time turns the corresponding test red; deliberately diverging the two load paths (recreating the
  exact bug this slice eliminates) turns the both-paths-identical guard test red specifically.
- No `SAVE_VERSION` bump (still 45), no new `state` fields — plumbing only.
- **Suite total: 270/270** (236 + 34), unchanged at every checkpoint. `test-progress-unify.js` (separate
  WIP, 23/35 baseline) untouched.

**Not started:** slice (b) IndexedDB adapter + autosave ring + restore UI + import-safety-net; slice (c)
manual save-slot picker UI.

## Session — E0.2 slice (b): IndexedDB autosave ring + import-safety net (2026-07-10)

**Shipped, user-verified in Firefox via `file://`, committed.** Builds on slice (a)'s
`applyLoadedSave()` unified load path — no changes to slice (a)'s serialization/migration logic.

- **New IndexedDB adapter** in `src/save.js` (`idbPut`/`idbGet`/`idbGetAll`/`idbDelete`, ~4 small
  Promise-returning functions, no external library). **Falls back to an in-memory `Map`** whenever
  `indexedDB` is undefined (the harness' testability seam — this is what makes the ring headlessly
  testable in Node) or on any open/transaction error in a real browser (one-time `console.warn`, then
  silent degrade — never throws, never breaks the game loop).
- **localStorage remains fully canonical and untouched** — the fast synchronous `autosave()` path and
  `beforeunload` force-save are exactly as they were. The ring is a purely additive second write path.
- `pickRingSlot` (pure, overwrite-oldest-of-3) + `ringCadenceDue` (pure, game-month-changed AND
  ≥3-real-minutes-elapsed, both required) + `ringAutosave`, hooked in right after the existing
  `autosave()` call at `sim.js:608`.
- Ring writes deferred via `requestIdleCallback` (with a `setTimeout` shim for browsers without it) —
  but the save payload is built **synchronously at the trigger moment**, so a ring entry always reflects
  state as of when it was triggered regardless of when the deferred write actually lands.
- **Import-safety net**: `snapshotLiveToRing` fires unconditionally (bypasses the cadence gate)
  immediately before `loadSaveFromText` overwrites live state — closes a real footgun where importing a
  file "just to look" could silently destroy the real save via the next fast autosave a few seconds
  later.
- New "↻ Restore autosave…" button next to the existing Settings save/export/import controls
  (`render.js:1834`); restoring an entry routes through slice (a)'s `applyLoadedSave`.
- New `tests/test-save-ring.js`, **42/42** — slot selection (empty/partial/full/tied), cadence gate (all
  combinations), eviction in practice (4 writes → oldest evicted), restore round-trip, and the
  import-safety-net ordering (pre-import snapshot proven to carry the *old* company's data, not the
  imported one) — all via the in-memory adapter fallback. **Suite total: 312/312** (270 + 42), the other
  270 unaffected.
- **User manually verified in Firefox via `file://` (2026-07-10), all four checks passed:** IDB entries
  persist across a real tab close/reopen; no perceptible hitch from ring writes during turn advances; the
  restore modal renders and an actual restore rolls the game back correctly; a private/incognito window
  still plays fine with the ring silently no-op'd.

## Session — E0.2 slice (c): manual save slots, E0.2 complete (2026-07-10)

**Shipped, user-verified in Firefox via `file://`, committed. E0.2 (all 3 slices) is now done.**

5 manual slots (`slot:1`..`slot:5`) behind a "🗂 Manage saves…" button in Settings + startup screen
(user-approved: 5 slots, behind-a-button). Reuses slice B's adapter/record shape (`kind:'slot'` sharing
one IDB store with the ring's `kind:'auto'`) and slice A's `applyLoadedSave`. Overwrite/delete use the
codebase's existing two-button `showModal` confirm pattern; load doesn't confirm since it inherits slice
B's pre-load ring-snapshot safety net. Save/Overwrite hidden on the startup screen (same guard as
`autosave`) so a fresh placeholder game can't get saved into a slot. New `test-save-slots.js`, 69/69.
**Suite total: 381/381.**

## Session — E0.4 slice (a): pause/warp hotkeys + help overlay (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Scoped by tech-lead first — found "tab hotkeys" and
"Esc closes modals" already shipped, so E0.4's real scope is smaller than the roadmap bullet implies.
4-slice plan: A (this one) hotkeys; B focus trap; C reduced-motion + colorblind icons; D UI-scale slider.

Slice A, all in `src/shell.js`: shared `isTyping()` guard (replaced 5 duplicated checks); `Space` pauses
during auto-run, launches otherwise (unchanged when not auto-running); `p` unconditional pause toggle on
any scene; `+`/`-` warp the day→week→month ladder, except on the R&D scene where they keep zooming the
tech tree; `?` opens a hotkey-help modal. New `test-hotkeys.js`, 31/31, pure-function coverage
(`warpStep`, `spaceAction`, `isTyping`, `warpKeysActive`). **Suite total: 412/412.**

## Session — E0.4 slice (b): modal focus trap (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Single shared wrapper fix in `showModal`/`hideModal`
(`src/sim.js`) — no per-call-site changes, all ~114 existing call sites unaffected. On open: captures the
triggering element (+ its id as a stale-reference fallback, since `render()` frequently rebuilds DOM),
focuses the first focusable descendant or `#modalBody`. Tab/Shift+Tab cycle only within the modal
(`trapModalTab` in `src/shell.js`, wired into the existing Esc-close keydown handler); list is recomputed
live each press since deep-view modals (Personnel, Programs) re-render their content every tick while
open. On close: restores focus to the trigger if still connected, else by id, else `document.body`.
New `test-focus-trap.js`, 31/31, on the two extracted pure functions (`nextTrapFocus`,
`resolveReturnFocus`) — real focus/DOM behavior isn't testable in the Node harness, tested live instead.
**Suite total: 443/443.**

## Session — E0.4 slice (d): UI-scale slider (2026-07-10)

**Shipped, user-verified in Firefox (incl. Phaser click-accuracy at 80%/130%), committed. Slice (c)
(reduced-motion + colorblind icons) deliberately deferred, not started.**

CSS `zoom` mechanism (`--ui-scale` var on `:root`, `zoom:var(--ui-scale)` on `body`), 80–130% in 10%
steps, localStorage-only (`ov_uiscale`, same pattern as `ov_theme`/`ov_wide` — no `SAVE_VERSION` bump,
survives new games/slot switches). Slider added to Settings (`renderSettings`, matches the existing
custom-difficulty slider style), applies live, re-runs `syncTopbarH()` on change. Default (100%) is a
provable no-op. New `test-ui-scale.js`, 48/48 (clamp/sanitize/boot-decision logic only — real CSS zoom
isn't testable in the harness). **Suite total: 491/491.**

## Session — E0.5 slice (a): Phaser sleep + hidden-tab fixes (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Scoped by tech-lead first — found the log/metric/
chronicle caps already in place from earlier work, so the roadmap's real value was the RAF/Phaser audit.
Confirmed real bug: 4 popout scenes (Cape/Vehicle/Map/Station) called `pause()` on tab-leave, which stops
`update()` but **not rendering** in Phaser 3 — fixed to `sleep()`/`wake()`. The flight scene was never
paused after a mission ended, rendering its postFX indefinitely behind the hidden overlay — now sleeps on
dismiss/skip, wakes before restart. Canvas-fallback `animLoop`'s wall-clock delta is now clamped (~50ms)
so a hidden-tab return resumes smoothly instead of jump-cutting. New `visibilitychange` handler pauses
`timeAuto` when the tab hides and resumes it (same unit) on return, only if hidden-pause caused it (a
manual pause stays paused). `FRONT_PAGE_CAP` raised 24→100 (folded in, trivial). New
`test-hidden-tab.js`, 34/34. **Suite total: 525/525.** Slice (b) log retention/windowing and metric
archive (deferred per user) not started.

## Session — BACKLOG.md #9: floating money/rep deltas (2026-07-10)

**Shipped, out-of-band from the E0.x sequence** (user-requested, first still-untriaged `Backlog`-status
item). Extended the existing `_statBump` HUD-flash helper (`flight.js`) with an optional `fmtDelta`
formatter: when given, spawns a small `.stat-delta` chip ("+$1.23M"/"−45") that rises and fades over 1s
near the stat, replacing any in-flight chip for that stat rather than stacking (spam control during
time-warp). Wired for money and rep only, matching the backlog title; other stats' bump-glow is
unchanged. `.stat` given `position:relative` as the anchor. One bug caught by the test suite itself: the
harness's DOM stubs don't implement `closest()`, crashing 3 test files — fixed with a defensive
`typeof`-guarded fallback + try/catch, headless-safe by construction now. **Suite total: still 525/525**
(pure addition, no new test file — cosmetic UI feature, real verification is visual).

## Session — visual/UI overhaul kickoff + E1.2 slice A: decision-frequency widening (2026-07-11)

**User-directed visual overhaul, scope agreed (not yet built beyond this piece):** era-evolving visual
identity (Apollo era → 80s NASA → 90s/2000s → SpaceX-modern, as the game's own era system advances;
Battlestar Galactica/retro-sci-fi as a mood reference), Phaser scenes synced to the existing DOM theme
system (currently 69 hardcoded hex colors don't react to theme at all), commit to a custom SVG icon set
(replacing emoji), sound in scope. Sequencing: flight-scene slice first, then icon set. Corrected an
earlier assumption before starting: camera shake/particles/bloom postFX/debris already exist in
`flight.js` (native Phaser particle system) — NOT the actual gap. Real diagnosis: the live abort/press-on
decision only fires in a narrow amber reliability band, so it structurally trends toward *zero* as the
player's engineering matures and as routine reflights (the bulk of a long campaign) dominate. User
confirmed: widen frequency, tied specifically to routine reflights.

**Shipped this session: the frequency-widening piece.** `liveCallFlag`/`deepCallFlag` (sim.js) now take a
`routine` flag and use a wider amber band on a reflight (0.97 vs 0.94) — doesn't touch the underlying
reliability roll, only how forgivingly it's read. `beginResolve`/`postResolve` no longer exclude uncrewed
routine flights outright (previously the only excluded combination). New `test-live-call-freq.js` (10/10).
**Suite total 671/671**, build parity clean, not yet committed/pushed.

**Also shipped this session: the live-call decision now genuinely plays inside the flight overlay**, not
as a page modal before it opens. User chose the architectural option over a cheaper reskin. Real
finding first: the decision resolves BEFORE `playMission` is ever called — the whole flight sequence is
a replay of an already-locked outcome, so "in-scene" requires the overlay to open EARLY and hold.
New `openFlightForDecision(ctx,decision)` (flight.js) opens the overlay with a placeholder (pad-safe)
spec and arms `animState.pendingDecision`; `drawScene`'s pad→ascent boundary now checks it and holds
there (reusing the existing held/dismiss idiom from the post-flight card) instead of continuing into
ascent, drawing a new generic `drawDecisionPanel()` (title/lines/N buttons, canvas hit-tested, same
rounded-rect idiom as `drawFlightContinueBtn`). `resumeFlightForDecision(finalSpec,finish)` patches the
real outcome into the SAME spec object once resolved (keeps stages/boosters/rng continuous), recomputes
`totalDur`/`reentryDur` (they depend on success/failPhase, computed only now), and resumes the SAME
animLoop — `finalizeLaunch` tries this before ever falling back to a fresh `playMission`. Only the live
call is wired this way so far; `showLiveCallModal` rewritten, `resolveLiveCall` untouched (already
routes through the same chain). New `test-decision-panel.js` (15/15) drives the real animLoop/click
handler on a virtual clock, not a reimplementation. **Suite total 686/686**, build parity clean.

**User-verified in browser 2026-07-11 — the live-call in-scene panel works.** Confirmed real, not just
headlessly plausible.

**Same session, following the browser confirmation: the other 3 decision types wired onto the same
primitive.** Reserve call and rescue both hold at a NEW `'cislunar-start'` point (entering the deep
cruise — their own "far from home" moment, distinct from the live call's pad→ascent point; both only
ever apply to cislunar/profile missions, confirmed via `deepReserveMargin`'s leg-filter and `resolveFlight`'s
`strand` kind both being deep-phase-only). Weather go/no-go holds at a NEW `'pad-start'` point (before the
countdown even ramps — it's decided before anything else about the flight is known, architecturally
earlier than the others: `resolveFlight` hasn't even run yet when weather fires).

Generalized `openFlightForDecision`/`resumeFlightForDecision` to support **chaining multiple decisions on
the same flight attempt** (e.g. weather → then a live call once the outcome is known) — reuses the
already-open overlay instead of opening a second one, replacing the earlier ctx-identity check
(`_decisionCtx===ctx`, which broke chaining since each stage builds its own ctx object) with a simpler
`_openedForDecision` boolean, safe because only one flight can ever be resolving at a time (`_flightResolving`
lock). `scrubLaunch()` (weather) explicitly `dismissAnim()`s before its multi-month `advance()` — scrubbing
is a genuinely new future attempt, not a continuation of the held pad frame, unlike the other three where
resuming in place is correct. Caught and fixed a **real ordering bug** during testing: `pendingDecision` was
being set on `animState` *after* `playMission()`'s first synchronous `animLoop()` frame already ran, so
the very first frame always missed the hold check — fixed by threading it through `spec._pendingDecisionSeed`
so `setupFlightState` seeds it into `animState` before that first frame, not after.

New assertions folded into `test-decision-panel.js` (28/28 total). **Suite total 699/699**, build parity
clean. **Not yet committed/pushed — needs a real browser check** for these three specifically (the live
call was already verified; reserve/weather/rescue are new code on the same proven mechanism, but still
unverified visually): trigger weather adverse conditions, a reserve-margin drift on a lunar mission, and
a deep-space strand, confirm each panel appears at its own correct moment and reads/clicks correctly, and
confirm chaining (e.g. weather → live call on the same launch) transitions smoothly with no flash/restart.

**Telemetry strip: already existed, no work needed.** Checked before building anything — `drawAscent`
already runs a full live per-frame HUD (`drawTelemetry`: T+/ALT/SPEED/Vx/Vy/ACC/Q/DRANGE/THROT/STAGE),
same pattern as the earlier camera-shake/particles/debris/plasma/chutes discovery — another eval claim
that was stale against current code.

**Phaser/canvas theme-sync — infrastructure built, first bounded slice done.** New `THEME_COLORS` (JS
table mirroring the 3 `body.theme-*` CSS palettes — Phaser/canvas draw calls can't read CSS custom
properties) + `themeColor(key)`/`themeRgba(key,alpha)` helpers (flight.js, top of file). Deliberately
scoped to HUD **chrome only** (telemetry panel, phase bar, continue button, decision panels, mission-info
box) — NOT the "physical world" (Earth's blue, rocket flame, plasma, stars, splashdown stay their real
colors regardless of console theme, same as a mission-control room's console color not repainting the
sky outside the window). Also found: the elaborate Phaser-native particle/camera-shake/postFX/mach-diamond
code in `flight.js` (`defineFlightScene`/`startFlightScene`, ~230 lines) is **100% dead code** — the
flight scene's `startFlightScene` call is commented out in `playMission` (disabled 2026-06-25), so none
of it renders; correctly excluded from theme-sync scope. New `test-theme-sync.js` (31/31) covers the
color-table infrastructure itself. **Suite total 730/730**, build parity clean.

**flight.js chrome theme-sync: finished** (same session, continued after the checkpoint above). Converted
all remaining chrome/status colors — telemetry panel, phase bar, decision panels, mission-info box, plus
every status-semantic color (phase-progress colors, G-load/skin-temp/chute-state warnings, orbit/trajectory
overlay lines) across `drawPad`/`drawAscent`/`drawOrbit`/`drawSuborbital`/`drawReentry`/`drawCislunar`/
`drawMiniMap`/`drawOrbitalMiniMap`/`drawPostFlight`/`drawDepartCard` — roughly 90 occurrences total,
via `themeColor`/`themeRgba`. Deliberately left alone: ~176 remaining hex literals that are genuinely
"physical world" colors (Earth-blue gradients, vehicle structural greys, flame/plasma/atmosphere) — sampled
broadly to confirm none of them are chrome hiding in plain sight before stopping.

**User-directed layout change, same pass: the telemetry HUD moved from a vertical list pinned top-left to
a horizontal strip along the bottom**, stacked just above the existing phase bar (new shared `PHASE_BAR_Y`
constant keeps the two in sync). Auto-wraps to multiple rows of up to 5 columns for the richer telemetry
sets (ascent/orbit run 10 items) — label-over-value per cell, divider lines between columns. Frees the
entire left side of the canvas (minimap + mission-info box were already top-right, unaffected).

**render.js's Cape/vehicle-preview/map/station Phaser scenes — deliberately deferred, not started.**
These are still genuinely active (unlike the dead flight scene) and mostly use the same canvas-2D
mechanism (`themeColor`/`themeRgba` would work directly), but a few spots are true Phaser GameObjects
(`.setTint()`) needing a different approach — a real, uninventoried scope of its own. Stopped here to
move to the icon set per the agreed sequencing rather than let theme-sync run indefinitely.

**Suite total 730/730**, build parity clean, not yet committed/pushed. **Needs a real browser check**:
the bottom-strip HUD reposition is a real layout change (confirm it doesn't overlap the phase bar or
run off-canvas at different vehicle/mission telemetry-row-counts), and confirm the theme actually
recolors the flight overlay chrome when switching Mission Dark / Control Room Green / Apollo Beige.

**Icon set — first bounded slice done, same session.** New `svgIcon(name,size)` (data.js) — inline
16x16 line icons, `stroke/fill="currentColor"` so they theme-sync for free via plain CSS (unlike the
canvas HUD chrome above, these are DOM/innerHTML — no JS color table needed). Scoped to the 7 TL_CAT
timeline categories (launch/research/rivals/crew/infra/other — `economy` stays the plain `$` glyph,
it was never an emoji-consistency problem), replacing `TL_CAT_ICON`'s emoji and the matching
`TL_CATEGORIES` filter-pill icons. `economy`'s `$`, `upcomingEvents()`'s own icon literals (⚛🔧🪟),
the main tab bar (already plain Unicode dingbats ⌂✎⚛☉⬡, not full-color emoji — lower priority), and
every other emoji sprinkled through card headers/buttons are **not** touched — this was a bounded
slice matching the eval's specific "TL_CAT icons... tab badges" framing, not an exhaustive
emoji-to-SVG sweep of the whole UI. New `test-icon-set.js` (27/27) — including a real render check
(not just unit-testing the generator) that the rendered timeline strip actually contains `<svg>`, not
emoji. **Suite total 757/757**, build parity clean, not yet committed/pushed.

**User feedback after browser-testing the bottom HUD**: reposition it below the rocket, everything
else fine. The telemetry strip and phase bar were stacked telemetry-above-phase-bar; swapped so
**telemetry is now the bottom-most HUD element** (hugs the canvas edge, `HUD_BOTTOM_MARGIN=6`), phase
bar stacks just above it. `drawTelemetry` records its own top edge on `animState._telemetryTopY` each
frame (row count varies 5-10 depending on flight phase) so `drawPhaseBar` always stacks correctly
above whatever height that frame's telemetry strip actually is — no hardcoded shared offset to keep
in sync anymore. Didn't touch the rocket-position math (`baseY` in `drawAscent`) at all — lower risk,
and matches the literal ask (move the HUD, not the rocket). **Suite total still 757/757**, build
parity clean, not yet committed/pushed — **this specific change needs a browser recheck** (the
previous rounds were tested before this swap).

**render.js Phaser-scene theme-sync — bounded first slice done, same session.** New `themeColorNum(key)`
(flight.js, alongside `themeColor`/`themeRgba`) returns the numeric `0xRRGGBB` form true Phaser
GameObjects need (`.setTint()`/`lineStyle()`/`fillStyle()` take numbers, not CSS strings — Phaser
`add.text()` configs take CSS strings though, so those use `themeColor()` directly). Scoped to
**exact matches** — hex values already numerically identical to an existing theme color, found by
grepping for the literal theme hex/rgb values across the file: MapScene's `HEALTH_HEX` status colors
(ok/warn/attention → theme ok/warn/bad, a clean semantic map), selection rings and orbit-guide lines
in VehScene/MapScene (already used ignite-orange/muted-gray, now via the theme table), text labels
across VehScene/MapScene/StationScene (drag label, hint text, body/module name labels — Oort Cloud
label existed in both a Phaser-text and an SVG-string render path, both converted), and 2
canvas-2D/inline-style rgba(ignite,...) occurrences. This is a **narrower, higher-confidence slice**
than a full chrome-vs-world audit of all 4 scenes — deliberately so, since Phaser GameObjects don't
live-retint on a theme switch the way canvas-2D redraws do (a scene only picks up the theme active
when it was created/entered — a real, documented limitation, not a bug). New assertions in
`test-theme-sync.js` (40/40 total). **Suite total 766/766**, build parity clean, not yet
committed/pushed.

**Full chrome-vs-world judgment pass: done, same session.** Corrected a boundary mistake from the
earlier exact-match pass first — `defineVehScene()` actually ends at line 2662, not ~3799 as
originally assumed (grabbed a bunch of unrelated popout/portrait functions into the earlier scan).
Redid the inventory with correct scene boundaries and read each of the 4 scenes in full:

- **CapeScene** (~30 lines) — genuinely almost no inline chrome; the pad's visual richness lives in
  `drawIsoPad()` (a canvas-2D texture-builder, read in full — confirmed its whole palette is
  legitimate physical pad/sky/flame art, nothing chrome-shaped in it).
- **VehScene** — 2 more found by reading closely: the stage-separation dashed guide line (→`dim`)
  and the three-tier Δv-loss annotation color (`loss<=0` good / `>250` bad / else warn → `ok`/`bad`/
  `warn`, a clean status semantic that wasn't an exact hex match to catch by grep).
- **MapScene** — 7 more: planned-route line (ok/bad by `pr.ok`), transfer-path traveling marker,
  player-pennant flagpole (now matches its already-converted flag fill), facility health-badge
  backdrop (→`bg`), ISRU pick indicator (→`ok`), Belt-claim ring (→`ignite`), LEO depot arc gauge
  (→`readout`). Left alone: star field, sun corona/glow/core (all genuinely physical), Oort cloud
  particles, and the `hx()`/`C()` helpers that convert *data-driven* categorical colors (planet
  color, rival faction color, facility-type color) — those are intentional per-entity color coding,
  not theme chrome, same category as the procedural-portrait palette left untouched in flight.js.
- **StationScene** — 1 more (an annotation label's text color, pairing it with its already-converted
  leader-line color). Everything else here is the station module's own hardware rendering (solar
  wings, radiator, hull, docking ports, antennas, handrails) — confirmed genuinely physical, same
  category as the rocket/vehicle rendering left alone in flight.js.

**Suite still 766/766** (pure color-constant swaps, no new test file — the underlying `themeColor`/
`themeColorNum` functions were already covered by `test-theme-sync.js`; the actual Phaser rendering
can't be verified headlessly regardless), build parity clean, not yet committed/pushed. **This is now
believed complete** for the "exact-match + close-reading" scope — a genuinely exhaustive re-audit of
every remaining hex literal in all 4 scenes was not attempted (would mean re-litigating already-
confirmed "world" colors with no new information).

## Session — era-evolving visual identity, slice 1: Apollo (2026-07-11)

User asked to see the 80s era in-browser; clarified nothing existed yet (only the manual Mission
Dark/Green/Beige theme picker) — I can't launch a browser myself either, so redirected to building a
real first slice. User picked: automatic (tied to `state.year`, not a manual picker) and Apollo era
first (the anchor of the whole progression).

New `ERA_VISUAL_MAP` (data.js) groups the 8 `ERAS` entries into 4 visual eras — apollo (Pioneer/Early
Orbital/Crewed Lunar, up to 1975), 80s (Station & Shuttle, 1975-2000), 90s2000s (Commercial,
2000-2030), spacex (Expansion/Interplanetary/Speculative, 2030+) — coarser than gameplay-era
granularity on purpose. `eraVisualKey()` reads it; `applyEraVisual()` (render.js, hooked into the top
of `render()`, cached against the last-applied key so it's a no-op most renders) swaps a
`body.era-*` class.

**Only Apollo has real CSS so far** (shell.html) — per the user's own scope call (palette + chrome
shapes/fonts, not just palette): reuses the existing Apollo Beige theme's exact color values
(warm 1960s console), gated `:not(.theme-green):not(.theme-beige)` so an explicit manual theme pick
still wins over the era default — only the color precedence is conditional; sharp/minimal
border-radius, thicker 2px borders, uppercase+letter-spaced headers apply in Apollo era
unconditionally (shape isn't really a "color scheme" choice the way the theme picker is). A fresh
new game starts in 1942 (Pioneer), so **it shows the Apollo look immediately with zero setup** — no
need to advance time to see it.

80s/90s2000s/spacex classes are correctly detected and applied but have no CSS yet — falls through
to today's default look, not a bug. New `test-era-visual.js` (12/12). **Suite total 778/778**, build
parity clean, not yet committed/pushed. **Needs a real browser look** — this is the first genuinely
new visual identity shipped this session (not just a recolor of what already existed), open
`orbital-ventures.html` fresh (default Mission Dark theme, don't pick Green/Beige) and it should read
noticeably different: warm amber/beige, boxier cards and buttons, uppercase label-plate headers.

**All 4 eras done, same session.** 80s (Station & Shuttle, 1975-2000) reuses Control Room Green's
exact palette — that theme's own comment already called it "phosphor-CRT mission control," a clean
match for the era — plus moderate rounding/medium borders, short of Apollo's hard corners. 90s2000s
(Commercial, 2000-2030) is a fresh Y2K/early-broadband-web palette (brighter cooler blue-gray, no
existing theme fit) with bubbly rounded corners and a glossy gradient highlight on buttons. SpaceX-
modern (Expansion onward, 2030+) is also a fresh palette, pushed meaningfully past today's default —
near-black background, thin/near-borderless cards, fully pill-shaped buttons, condensed headers — the
actual destination the whole progression ages toward, not just a restatement of the current look.
Updated the now-stale "only Apollo has styling" comments in data.js/render.js/shell.html to match.
`test-era-visual.js` extended to 16/16, including a check that the built HTML actually contains real
CSS rules for all 4 era classes (not just detection logic). **Suite total 782/782**, build parity
clean, not yet committed/pushed. **Needs a real browser look at all 4** — advance a save through
each era (or just start fresh games and manually bump `state.year` via the console) and confirm each
one reads as genuinely distinct, and that switching a manual theme (Green/Beige) still correctly
overrides the era palette in every era, not just Apollo.

Rest of the emoji inventory (if wanted) and sound not started. Treat this ROADMAP entry + the memory
note as the record if the session ends before those land.

## Session — E1.1: reactive rival race, slice B — rival intel dossier (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Slice B was
originally scoped as "intel purchases — pay to see rival progress", but reading the code showed the
*free* Standings panel already surfaces momentum, threat, price-war status, and a live momentum-projected
ETA — for the rival's NEXT goal only. The real gap: `rivalProjectedYear(r)` projects one pending goal;
the per-goal firsts list below it shows every *other* remaining goal at its flat static `f.year`, not
momentum-adjusted. So a naive "pay to see the same thing" would be pure duplication — instead slice B
sells the momentum-adjusted projection of the rival's *whole remaining roadmap*.

**Generalized projection** (`rivalFullProjection(r)`, sim.js) — returns an array of `{goal,year,nominal}`
for every remaining goal from `rs.idx` to the end of `r.firsts`. Goal 0 uses the exact formula
`rivalProjectedYear` used before; each subsequent goal treats the previous goal's *projected* year as its
`prevYear` (its saving window opens where the last one lands) and reuses the same `window`/`cost`/`rate`
shape, with momentum/crowd held at today's live snapshot for the whole chain (a projection, not a
re-sim — same simplifying assumption the single-goal version already made). `rivalProjectedYear(r)` is
now a thin wrapper — `return rivalFullProjection(r)[0]||null` — a pure refactor of the first entry.

**Parity-regression guarantee** — a test asserts `rivalProjectedYear(r)` is byte-identical (goal/year/
nominal) to `rivalFullProjection(r)[0]` for ≥2 rivals after 24 rival ticks (so momentum/capital have
drifted off seed), proving the refactor didn't move the free number every player already sees.

**Paid unlock** — `buyRivalIntel(rivalId)` (sim.js, next to `counterPoach`): checks money + not-already-
owned (early-return + `log('note',…)` on either, matching `counterPoach`), deducts `RIVAL_INTEL_COST`
(`RIVAL_INTEL_COST=1.5` $M, data.js — cheaper than the momentum-affecting `RIVAL_COUNTERPOACH_COST=2.5`
because it's pure information), sets `state.rivalIntel[rivalId]=true` (permanent, non-expiring). Lazy-
defaulted via `rivalIntelOwned(id)` — no migration, matches E1.4's accessor pattern. `SAVE_VERSION`
51→52.

**UI** (`renderRivals()`, render.js) — a second button beside counter-poach: `🕵 Buy intel dossier −$1.5M`,
which flips to a disabled `🕵 Dossier owned` once bought. When owned, a visually distinct
`🕵 Full program projection` block renders `rivalFullProjection(r)` — every remaining goal, projected
year, and the same "Ny ahead of history / Ny behind — you're slowing them" framing the free next-goal
line uses (reused verbatim). Sits above the existing static firsts list so the paid momentum-adjusted
timeline and the free nominal one compare side by side; the free list is untouched.

**Tests** — new `tests/test-rival-intel.js`, 29/29: parity regression (×3 rivals + non-vacuous guard),
length/order/monotonic-year of the full projection, `buyRivalIntel` affordability/deduction/idempotence,
and a render smoke check (no throw before/after; dossier block present for exactly the one bought rival,
its button reads "owned", others still offer "Buy"). Full suite green — 974 checks excl. the known
pre-existing `test-progress-unify.js` shortfall (23/35); `test-station-slice2.js` clean this run (its
RNG flakiness is unrelated). `test-rivals-e11.js` unchanged at 24/24.

**Real-browser checklist:** open the Standings/Rivals panel → each rival shows a `🕵 Buy intel dossier
−$1.5M` button → click it for ONE rival → treasury drops $1.5M, that rival's button now reads
`🕵 Dossier owned` (disabled), and a `🕵 Full program projection` block appears listing every remaining
goal with a projected year → confirm the block appears ONLY for that rival, the others still show the
buy button and no projection block → reload the page (save round-trip) and confirm the dossier is still
owned.

## Session — E1.1: reactive rival race, slice A (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Tech-lead scoped
first: **most of the roadmap bullet was already shipped** by CE1(a/b/c) — momentum already reacts to
player firsts (schedule variance), `denyRivalGoal()` already damages a rival's schedule, staff poaching
already exists and is momentum-weighted. The eval's "rivals are scheduled, not adaptive" framing was
stale. Real gap was three pieces: contract snatching, budget hearings after a *fatal* crewed loss (the
existing failure inquiry is explicitly uncrewed-only — the crewed branch's own comment said so), and a
literal failure→poaching link.

**Contract snatching** (`tickRivalSnatch()`, sim.js) — a surging rival (momentum ≥1.1) bids on an open,
uncommitted procedural offer; two-beat warning (2 mo) then taken if you don't commit. Committing
(select/queue/hangar) is the whole counter — reuses E1.3's `contractOfferReferenced()` guard, so a bid
on a build in progress just falls through. Reward is rival **capital**, not momentum (momentum drives
the Monte-Carlo-tuned firsts-pacing; a snatch shouldn't touch that). Never touches authored missions,
the special contract, or mandates — only `state.contractOffers`.

**Budget hearing** (`triggerHearing`/`showHearingModal`/`resolveHearing`, sim.js) — the political sibling
of the engineering-only failure inquiry, fired from the same two branches in `finalizeLaunch` that E1.4's
memorial/flight-log already hook. Three choices: fund a safety program (costs $, +support), defend the
record (free, −rep, +support), blame the vendor (free, +support, staff morale hit + extends poach heat).
Same transient `_pendingX` + priority-chain shape as `_pendingSetback`/`_pendingInquiry`.

**Poach heat** (`state.poachHeat`, `tickPoachHeat()`) — any fatal crewed loss opens a 6-month window
that multiplies `checkPoaching()`'s roll ×2.5; decays monthly. Closes the "poaching after player
failures" ask literally, on top of the momentum-weighting that already existed.

SAVE_VERSION 48→49. New `test-rivals-e11.js` (24/24). **Suite total 661/661**, build parity clean.
Slice B (intel dossier purchase) — tech-lead's own recommendation was to consider cutting it, since the
rival projection is already free in the Standings panel; not started, low priority.

## Session — E1.3: procedural filler contracts (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Tech-lead scoped
first: existing "special contract" system is a bonus ticket on an authored mission, not a new flyable
object, so this is genuinely new. `state.contractOffers` (era + capability-gated via `CONTRACT_ARCHETYPES`
in data.js — comsat block buy, crew rotation; `tickContractOffers()` generates/expires them, cap 2
concurrent, priced ~0.6x a comparable authored mission). New `missionById(id)` resolves authored or
procedural ids at the ~6 call sites that resolve `state.activeMission`. The one real risk: `finalizeLaunch`
gates the whole firsts/milestone block on `!m.proc` so a procedural flight never writes
`state.completed`/`firstDates`/`history` or pops the milestone modal — full payout, no farming (sciGain
also uses the routine-tier rate for proc flights). An offer is consumed on success, survives its own
expiry if referenced by `activeMission`/build queue/hangar, otherwise expires and rotates. New
`renderContractOffers()` section (Flight Contracts tab, same mount pattern as the special-contract
banner). SAVE_VERSION 47→48. New `test-contracts.js` (25/25). **Suite total 629/629**, build parity clean.

**Slice B done same session**: Deep-Space Sample Return archetype (`modules:['lv','transfer']`, the same
profile shape as authored Lunar Sample Return), gated on `deep_space` research + `deepFlights≥1`. Kept
its cruise under `DEFER_CRUISE_DAYS` (60) so it resolves synchronously like its authored counterpart —
sidesteps the deferred/`activeFlights`/rehydration edge case entirely rather than taking it on. Deliberately
**no `sciYield`** on the archetype (that bonus is explicitly first-flight-only and would be an infinite
farm on a regenerating offer); also hardened the underlying `finalizeLaunch` line itself
(`m.sciYield && !routine && !m.proc`) so a future careless archetype can't reopen that hole. Balance pass:
concurrent-offer cap now 2 early-game, 3 from the Commercial era onward (`contractOfferCap()`, era-derived,
replacing the flat `CONTRACT_OFFER_CAP` constant). New assertions folded into `test-contracts.js` (33/33).
**E1.3 complete (both slices). Suite total 637/637**, build parity clean.

## Session — E1.4: astronaut flight log + memorial wall (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Names/traits
were already built; added the two missing pieces. `state.astronautLog` ({id:[{when,mission,outcome}]}),
appended once per crewed flight in `finalizeLaunch`, keyed by id so it outlives the astronaut leaving
`state.staff`; surfaced as a "N flights flown" line on the astronaut's Personnel card. `state.memorial`
([{id,name,when,mission,story}]), appended in `loseAssignedCrew` at the exact death moment (name
snapshotted there); renders as a "🕊 Memorial Wall" section in the Personnel tab, only when non-empty.
SAVE_VERSION 45→47 (one bump per field, both lazy-default `[]`/`{}` via accessor functions, no migrate
needed). New `test-astronaut-log.js` (9/9) + `test-memorial.js` (13/13).

Also added the roster view: a "🚀 Astronaut Roster" section in the Personnel tab, appears once anyone's
flown, lists every astronaut who has (portrait, trait, Active/Lost status, full flight-by-flight list),
sorted most-flown first. Reuses the existing `personPortrait()`/`traitOf()` — no new data. New
`test-roster.js` (12/12). **E1.4 complete. Suite total 604/604**, build parity clean.

## Session — E1.5: ops friction + trust (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Read the code
first: 3 of the 4 backlog sub-items were **already fully built** (verified against the source, deliberately
NOT rebuilt): **#18** "why can't I fly this?" — `canLaunch()` already returns `{ok,why}` and every disabled
launch button (Bench + ~8 others) already renders `chk.why`; locked program-ladder missions already show
`needs N rep`. **#29** pad turnaround — the whole `launchPadCap()`/`padSlotsLeft()`/`curMonthPadUsed()`
launches-per-month mechanic (CE2 slice b) already exists and is surfaced in the Infrastructure card +
attention flags. **#10 econ half** — `missionNetEconomics()`/`missionNetHTML()` already renders the full
per-line payout/cost/carry/net breakdown inline on the Bench.

**The real gap** (the reliability half of #10 + all of #32): `flightPhaseBreakdown()` already decomposes
every flight into per-phase, per-subsystem reliabilities (∏ phaseRel = R) and every resolved `outcome`
already carries `.phases`/`.subsystem` — but a grep proved that data was computed and thrown away (zero
readers in render.js/flight.js). Newly built, all pure display/derived-data plumbing:

- **`phaseBreakdownLines(phases, govKey)`** (sim.js, beside `flightPhaseBreakdown`) — turns the breakdown
  into plain-text lines, one per phase (`"Ascent 91% — Propulsion 94%, Structures 97%, …"`); when `govKey`
  (the failing subsystem) is passed, that phase gets a leading `✕ ` and the subsystem is tagged `✕FAILED`.
  Plain text on purpose — it feeds native `title=` tooltips (no markup) and the log detail field.
- **Bench reliability hover** — both readout sites (`renderReadout` non-profile + `renderProfileReadout`)
  now put `esc(phaseBreakdownLines(flightPhaseBreakdown(subsystemReport(m,v,sim,v.crewed)),null).join('\n'))`
  on the reliability `.metric` as `title=`. Pre-flight/informational, so `govKey` is null. Reuses the exact
  `subsystemReport(m,v,sim,v.crewed)` pattern already in `subsystemBreakdownHTML`.
- **Failure causal chain in the log** — `log(kind,msg,nav,detail)` gains an OPTIONAL trailing `detail`
  param (fully backward-compatible; every existing 3-arg call is unchanged and stores `detail:undefined`,
  which JSON drops). `finalizeLaunch` computes `failDetail = phaseBreakdownLines(outcome.phases,
  outcome.subsystem).join('\n')` once (guarded on `.phases`; dev-forced outcomes carry it too) and threads
  it into the 5 failure/partial/abort/strand/loss log lines. `renderLog()` appends `l.detail` to the
  existing `title=` on the log chip (concatenated with `tlAttr(l.msg)`, both `esc`'d — not replaced).
  The `upcomingEvents()` chip loop was left alone: its objects carry no `.detail` field.
- **Pad-slot line on the Bench** — `renderBenchLaunch` now renders `Pads: {free}/{cap} free this month`
  under the launch button, but ONLY when `launchPadCap()>1` (a one-pad startup has nothing to see, no noise).

No `SAVE_VERSION` bump — `log.detail` is transient UI-only, never read back from a save; no new persisted
state. New `test-ops-friction.js` (36/36): `phaseBreakdownLines` shape + gov-marking, `log()` 3-arg vs
4-arg backward compat, a forced-loss flight driven through `resolveFlight`+`finalizeLaunch` producing a
log entry whose `.detail` names the failed subsystem, `renderLog()` not throwing on mixed detailed/plain
entries (title carries both message + breakdown), Bench reliability title present/non-empty, and the
pad-slot line absent at L1 / present + correct at raised `prodLevel('pads')`. **Suite total 640/640** of
the always-green files (pre-existing `test-progress-unify.js` 23/35 shortfall and the RNG-flaky
`test-station-slice2.js` are expected and untouched), build parity clean.

**Real-browser check:** (1) hover the Bench reliability number and confirm a multi-line phase-by-phase
breakdown tooltip appears; (2) force a launch failure via the dev menu (Ctrl+Shift+D → force loss) and
hover its Flight & Ops log entry to see the causal chain with the failed subsystem tagged; (3) research a
second Launch Pad level and confirm the "Pads: N/M free this month" line appears under the launch button.

## Session — E0.6: esc() all dynamic text in innerHTML templates (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check before push.**
Scoped by tech-lead first: the roadmap line's premise was half-stale (no company-name *input* exists —
`state.company` is hardcoded, family names auto-generate as `OV-n`), so the real user-typed surface is
blueprint/livery names, and the real threat channel is **imported save files** — every persisted string
in a shared save is attacker-controlled once sharecodes exist, which is what this item is actually
guarding against. New `esc()` one-liner in `data.js` (first module in build order, global scope).
Wrapped ~20 call sites: blueprint names, livery name, `state.company` (4 render.js + 5 save.js sites,
including saved-slot/ring metadata), vehicle family names (active/list/parent-pill/register-button in
`renderVehicleFamilies`, plus the build-cost-multiplier log line and reliability note in `sim.js`),
front-page headline/dek (both the modal and list-row renderers). **Real bug fixed**: the pre-existing
`tlStrip()` tag-stripper (used across the flight/ops log timeline) was bypassable via an *unclosed* tag
(`<img src=x onerror=...` with no closing `>` survives its `/<[^>]*>/g` regex untouched) — split into
`tlStripPlain()` (strip-only, kept for `logCategory`/`logNav`'s plaintext regex matching, where escaping
`&` to `&amp;` would silently break patterns like `/R&D /`) and `tlStrip()` (strip-then-escape, for
actual rendering); `tlAttr()` now just aliases `tlStrip()` since full escaping already covers
double-quoted-attribute safety. Caught and fixed a **double-escaping trap**: `recentCashEvents()`
pre-escapes `l.msg` via `tlStrip` before storing it, but the Finances modal was re-running `tlAttr` on
that already-escaped value for the tooltip — fixed to use the pre-escaped string directly. New
`test-esc.js` (36/36) also **caught a real gap the tech-lead audit missed**: `vehicleCompareHTML()`'s
`<option>` labels (the A/B compare-designs dropdowns, embedded in the same family card) interpolated
family names unescaped — found by the test asserting the whole rendered card, not just the primary
family-name spans; fixed alongside. **Suite total now 561/561** (525 + 36), all pre-existing suites
unaffected, build-parity (`orbital-ventures.html` inline script ≡ `build/game.js`) reconfirmed.
**Honest scope note for the eventual commit message**: this secures every user-typed/import-controlled
name field found in this pass, but true sharecode-era safety still needs an import-time sanitize/
whitelist pass over arbitrary save-file strings beyond the named fields (e.g. JS-in-attribute contexts
like `onclick="loadBlueprint('${b.id}')"` — `esc()` can't protect those since entities decode before the
attribute's JS parses; ids are program-generated so safe today, but a hostile save with a crafted id is a
separate, not-yet-addressed vector). That's future scope, not claimed as done here.

## Session — Command Center scene: era-tied variety, slice 1 (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** User asked for another pass on the isometric
Command Center scene to "increase realism and variety"; two directions proposed (era-tied variety vs.
atmosphere/realism), user picked era-tied variety first. Investigation found the existing "Phase B
realism" prop system (roads, crawler, gantry blink light, greebles, etc.) is rich but has zero variation
by era or game state — only VAB height (bay count) and dish count actually scale. New `ERA_BUILDING_TINT`
+ `eraBuildingTint(type)` and `ERA_PAD_STYLE` + `eraPadStyle()` (render.js), both keyed by the same
`eraVisualKey()` the DOM-chrome era system already uses, so the two visual identities age up together.
Apollo gets warm weathered beige/gray buildings + a white-steel umbilical-tower gantry (matching the
Saturn V reference); 80s gets cooler grays; 90s2000s gets brighter blue-tinted corporate grays + a
cleaner light-gray tower. `spacex` deliberately has no entries in either table — today's existing colors
already read as the modern baseline, so that era falls through to the unchanged defaults for free
(zero risk, mirrors how the DOM-chrome era pass treated the newest era). Scoped to palette only this
pass — no geometry/shape changes to buildings, roads, or vehicles. `test-era-visual.js` extended to
24/24 (was 16/16). Full suite: 796/808 (the 12 failures are in `test-progress-unify.js`, a pre-existing
unrelated failure predating this session — confirmed by isolating the file, unrelated to any Command
Center code). Deferred/next: atmosphere-realism pass (sky/lighting/time-of-day) proposed as the second
direction but not yet greenlit; extending era-tied variety to roads/vehicles/gantry-beam geometry if
wanted later.

## Session — Command Center scene: atmosphere/realism, slice 2 (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** Fast-follow to the era-tied variety pass —
the Command Center's sky was a permanently fixed dusk gradient with a sun stuck at a fixed high-right
position regardless of how long the scene had been open. New ambient day/night cycle: `SKY_KEYFRAMES` +
`skyAtmosphere(t)` (render.js), a pure function of the scene's own elapsed-seconds clock `t` (same idiom
as the existing blink-light/idle animations — no new persisted game state). Cycles dawn → day → dusk →
night → dawn over `SKY_CYCLE_SEC` (240s/4min) real time: sky gradient color, sun position/color/opacity,
and star visibility all interpolate smoothly between keyframes. The dusk keyframe (p=0.50) is an EXACT
reproduction of the scene's original fixed values, so a mid-cycle glance looks identical to before this
pass — the cycle just breathes around that anchor, zero regression risk at that point. Scoped to sky/sun/
stars only; ground/water/terrain colors deliberately left fixed (isometric strategy scenes commonly keep
ground readable/consistent regardless of time-of-day — a deliberate boundary, not an oversight). New
`test-cc-atmosphere.js` (14/14): exact-dusk-match anchor, clean cycle wrap (incl. negative-t safety), day
brightness/starlessness vs night darkness/starriness, smooth (non-cut) interpolation, and an end-to-end
`drawCape` smoke test across the full cycle using the harness's `makeCanvasStub`. Suite: 818/830 (same
pre-existing unrelated `test-progress-unify.js` failure, confirmed isolated in the prior slice's entry).
This closes out both proposed Command Center directions (era-tied variety + atmosphere/realism) from the
2026-07-11 "increase realism and variety" ask.

## Session — Vehicle pop-out: full workbench editor + pop-out sizing pass (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check (see below).** Two
asks: (1) bring all the normal Design Bench editing functionality into the vehicle pop-out (previously
just a read-only pan/zoom viewer + a hand-written stats summary), and (2) make every pop-out's default
view fill ~10% more of the screen. Clarified #2 with the user first since every pop-out overlay is
already `position:fixed;inset:0` (literally the full viewport) — answer was "both": bump default content
zoom AND trim chrome padding.

**#1 — full editor, via the existing "move the live node" trick.** The vehicle pop-out already moved the
live Build/Launch button into its bar on open and back on close; generalized this to the whole editor.
New `id="benchEditorPanel"` on the `.bench-editor` div (shell.html) — the tabs bar + all 6 bench-panel
tabs (Vehicle/Modules/Customize/Saved Designs/Families/Mission: stages, boosters, transfer, lander, crew,
power, livery, parts, blueprints, families, architecture, window planner, routes). `openVehPopout()` now
moves `#readoutCard` (the REAL Δv/TWR/mass/economics/test-campaign readout — replaces the old hand-rolled
`vehPopStatsHTML()`, deleted as dead code) and `#benchEditorPanel` into the pop-out's aside, remembering
homes exactly like the launch button; `closeVehPopout()` restores both before the scrim is removed. No
render-function changes needed — `render()`'s bench block already writes into these ids by `$('id')`
regardless of DOM location, so every existing edit interaction (stage add/remove, parts swap, tab
switching, etc.) keeps working untouched. Widened the aside for this: new `.vehpop-stats.wide` CSS
(`flex:0 0 46vw;max-width:760px;min-width:420px`, only applied to the vehicle pop-out — station/map/cc
pop-outs keep the narrow 300px stats rail).

**#2 — pop-out sizing.** New shared `POPOUT_ZOOM_BOOST=1.1` + `centeredZoomOffset(w,h,z)` (render.js).
Every pop-out's default/reset zoom bumped from 1.0 → 1.1, paired with a compensating pan offset so the
content stays visually centered (each pop-out's zoom transform is anchored at its content box's top-left,
so a naive zoom bump alone would drift the view toward the bottom-right corner) — worked out the geometry
per pop-out type: vehicle + earth (canvas-drawn, translate-then-scale) vs. station + map (CSS transform on
a full-stage wrapper, shared `initSvgPopZoom` helper) vs. command center (CSS transform on a letterbox-
fit box, `ccPopFitBox()`). Earth needed no offset — its draw loop already translates to canvas-center
before scaling. Double-click "reset" on every pop-out now resets to this boosted+centered default, not
the old smaller one. Chrome trim: `.vehpop-bar`/`.vehpop-stats` padding trimmed ~10-15%.

**Tests**: `test-popout-sizing.js` (19/19) — pure-logic coverage only (`centeredZoomOffset` exact math,
every pop-out opens at the boosted zoom default without throwing, vehicle pop-out open/close/open/close
repeatability). Extended `harness.js`'s canvas-id allowlist (`vehPopCanvas`/`earthPopCanvas`/
`ccPopCanvas`) so `drawVehPopout()`/earth/CC draw loops don't crash under test — this was a **pre-existing
gap**, not a regression (pop-outs had zero test coverage before this pass; the harness's `getElementById`
returns a fresh stub per call with no real DOM tree, so the actual node-relocation and visual-centering
behavior is fundamentally a real-browser-only concern, same limitation as the pre-existing launch-button
move). Suite: 837/849 (same pre-existing unrelated `test-progress-unify.js` failure).

**Needs a real-browser check**: does the moved-in editor render/behave identically to the normal bench
(tab switching, stage/parts editing, blueprints save/load) inside the pop-out's wider aside; does closing
and reopening the pop-out correctly restore the editor to its normal bench-view spot with no duplication
or loss; does each pop-out's default zoom look centered (not cropped to one side) on typical viewport
sizes; readability of the ~46vw editor column on smaller/laptop screens.

**Fast-follow same session**: user asked for a 3-column layout — editor tabs/sliders on the LEFT of the
rocket, mission-fit readout on the RIGHT, rocket still visible in the middle (manipulate left, read
results right). Split the single wide aside into `#vehPopEditor` (left, `.vehpop-stats.wide.left` — same
46vw sizing, border flipped to the right edge) and `#vehPopStats` (right, back to the original narrow
300px rail, since the readout no longer shares space with the editor). New progressive-degradation step:
the editor rail alone hides under 900px width (before the existing 760px cutoff that hides both asides),
so a squeezed pop-out drops the editor first and still shows rocket + readout. No JS logic changes beyond
the DOM target ids — `closeVehPopout()`'s restore-by-id-and-remembered-home code was already agnostic to
which aside currently holds the nodes. Suite unchanged at 837/849 (same pre-existing unrelated failure).

## Session — Vehicle bench: faint blueprint-paper background (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** User asked for the vehicle bench's background
to look like a very faint blueprint. Scoped to `.bench-rocket` (`#vehicleCard`, the card the rocket sits
in) rather than the whole `#benchView` — every other card in the bench (editor tabs, readout) is opaque
(`.card{background:var(--panel)}`), so a background on the outer view would only be visible in the ~16px
gutters; the rocket card is where the negative space actually reads. New CSS-only `background-image`: a
fine 10px grid + a coarser 50px grid, both using `color-mix(in srgb, var(--readout) N%, transparent)`
rather than hardcoded blueprint-blue — reuses the game's own existing "technical/telemetry" cyan accent,
so it re-tints automatically across every theme (default/green/beige) and all 4 visual eras with zero
extra per-theme CSS. Pure CSS, no JS/build-output-size(script) change. Suite unchanged 837/849 (same
pre-existing unrelated failure). Not extended to the vehicle pop-out's rocket stage — easy follow-up if
wanted, deliberately left out since the ask was specifically "the vehicle bench."

**Fast-follow same session**: user wanted the AUTHENTIC blueprint look — dark navy, not a theme-tinted
accent, with white (not cyan) gridlines. Swapped the `color-mix(var(--readout)...)` approach for a fixed
`background-color:#0b2545` (blueprint navy, deliberately NOT theme/era-reactive — real blueprints are
always this color) + `rgba(255,255,255,...)` white gridlines. Confirmed safe: every theme/era in this game
uses light ink text on dark panels (no light-background themes exist), so white-on-navy stays legible
everywhere without a per-theme contrast check. Suite unchanged 837/849 (same pre-existing failure).

**Root-cause fix same session**: user reported only seeing a border effect, not the background behind the
vehicle itself. Real cause — the bench's rocket preview actually renders via a **Phaser scene**
(`VehScene`, hosted in `#vehHost`) whenever Phaser is available (`startVehPreview`/`phaserOK()`), which
is the case in virtually every real browser; the plain `#vehiclePreview` 2D-canvas path (which already
correctly `clearRect`s to transparent, showing CSS through fine) is only a fallback that real users rarely
see. Phaser's canvas is `transparent:false` with its own `setBackgroundColor('#0a1016')` — fully opaque,
painting over the CSS blueprint background everywhere except the card's own margins outside the canvas
(which is what read as "just a border"). Fixed by drawing the SAME navy + white grid inside the Phaser
scene itself (`this.cameras.main.setBackgroundColor('#0b2545')` + a Graphics-drawn 20px/100px grid at
2× internal resolution, matching the CSS's 10px/50px visual spacing once scaled down for display),
added once in `create()` before the stars/rocket layers so it sits as a static backdrop. Also recolored
the drag-readout label's background chip from near-black to the matching navy for consistency. Not a
regression — pop-out unaffected (it uses the plain 2D-canvas path, not this Phaser scene). Suite unchanged
837/849 (same pre-existing failure).

**Fast-follow same session**: extended to the vehicle pop-out too, on request. `#vehPopStage` (unique id,
so this doesn't leak onto the station/map/earth/cc pop-outs which share the same `.vehpop-stage` class)
gets the identical navy+grid CSS. Simpler than the bench fix — the pop-out's canvas (`drawVehPopout` →
`drawVehiclePreviewTo`) is a plain 2D canvas that already `clearRect`s to transparent every frame (it
never had the Phaser-opaque-background problem), so plain CSS was sufficient, no JS changes needed. Suite
unchanged 837/849 (same pre-existing failure).

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
      colorblind icons) deliberately deferred, not started.**
- [ ] **E0.5 Unbounded-array audit** — cap rendered log entries (windowed + "show
      older"), decimate metric histories monthly→quarterly after N years, cap/archive
      chronicle. Verify `document.hidden` pauses every RAF loop and sleeps Phaser scenes
      (bloom postFX must not run on hidden canvases).
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
- [ ] **E1.2 Flight overlay Slices C + D** — already scoped above (in-overlay decision
      panels; chrome/transition polish). The eval independently ranks these top-tier;
      add an ascent abort/press-on window and a small telemetry strip (alt/vel/Q) as
      part of C's panel work.
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
gate stations behind heavy lift — a real balance shift) · module cost rebalancing (current cost already
implicitly bakes in delivery via the body multiplier — stacking a real launch cost on top double-charges
unless base costs drop) · whether #74/#76/#77's "depends on #73" should re-point at "Slice 1 done."

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

### Workstream E2 — Medium (post-EA-gate)

Station assembly + resupply loop (hangs on the existing STATION_MODULES seam — see #73 scoping above) · 3–4 more
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

## Session — newspaper front pages, research-completion notice, countdown voice, external audio (2026-07-12)

**Newspaper pop-out (backlog #97/E1.6), Slices A–C, all shipped.** `showMilestoneModal` (sim.js) re-skins
into a full "Agency Wire" front page (`frontPageHTML`, render.js) for any authored first with `m.rep>=15`
(the Chronicle's existing significance bar) — rep<15 firsts keep the original compact modal, byte-identical.
Slice A reused the front-page entry `showMilestoneModal` already files via `pushFrontPage`, no duplicate
copy. **Slice B**: the crewed-catastrophe budget-hearing modal now leads with a DISASTER front page (merged
into the existing hearing modal rather than a second pop, since a standalone modal would've collided with
the always-fired hearing without touching `finalizeLaunch`/`finish()` control flow); epoch `victory*` modals
gained a "Read the front page ▸" link (these previously filed no Chronicle entry at all — now they do, so
landmark firsts are browsable in the Chronicle for the first time); the Chronicle's own browser
(`showFrontPage`) now shares the same renderer instead of a fourth parallel path. **Slice C-visual**: the
newspaper modal got its own much larger size class (`max-width:960px;width:95vw`, vs the standard 440px/
680px modals) plus 4 distinct era-reactive looks reusing the existing `body.era-*` visual system — heavy
sepia halftone (Apollo), lighter grain + one green spot-color kicker (80s), glossy full-color magazine
(90s/2000s), clean sans-serif card with a fake browser-chrome bar + mock URL (spacex/modern). Early-era
paper colors are hardcoded light/cream regardless of the era's dark console palette (deliberate — a
newspaper is a physical light object). **Slice C (filler)**: `NEWS_FILLER[]` (data.js, mirrors
`CONTRACT_ARCHETYPES`' shape) — 5 state-derived archetypes (rival claim count, staff callout, facility
note, market sentiment, public mood) render as 1-2 below-the-fold briefs on real editions only (milestone/
disaster/victory, NOT Chronicle replays — replays stay static since re-rolling live state onto a historical
entry would be anachronistic). Filler is never persisted. All wired through `showModal`'s existing ESC
path, zero new interrupts anywhere in the chain. Suite: era-visual 56/56, regression 18/18, esc 36/36,
save 34/34, plus dedicated smoke suites per slice.

**Research-completion notice.** `completeResearch` (sim.js) previously only logged to the ops timeline —
now also queues a compact (non-newspaper) modal via `queueResearchNotice`/`maybeShowResearchNotice`,
draining `_pendingResearchDone` at the end of `stepTime` so a multi-node batch (e.g. a fast-forward) yields
one notice listing all completed nodes, not one popup per node. Gated behind the existing `_pending*`
decision chain and any open modal — never stacks. Reuses the tech tree's own node `desc` copy verbatim, no
new content written. Shows regardless of `animEnabled` (the point was visibility). `test-research-notice.js`
14/14.

**Countdown voice (backlog #35/E1.6), Slices A–B.** User chose tones-only over `speechSynthesis` (the pad
phase is only 1.76s of countdown — real spoken numbers would've required extending `PAD_PHASE_MS`, rippling
into `test-pad-a.js`'s pins). **Slice A**: new global sound toggle (`ov_sound`, Settings menu — first mute
control the game has ever had) + a real top-level `sfxBus` master gain all SFX route through (fixed a bug
where `sfxSep`/`sfxBoom`/`sfxSplash`/`sfxBurn` bypassed the mixer straight to `destination`); countdown
blips (988Hz) on each T-4→T-1 label change plus a liftoff confirm tone (1319Hz), via new `sfxBlip()`.
**Slice B**: the existing weather go/no-go pad-start hold reskinned as "HOLD AT T-31s — WEATHER GO/NO-GO"
(mechanics untouched) with a distinct low hold tone (392Hz), fired once per hold via a guard flag. Zero
pad-phase timing changes either slice — `test-pad-a.js` 34/34 both times. `test-sound.js` 12/12 (Slice A).

**External audio asset pipeline, Slices 1–2 (first binary assets this project has ever shipped).** A
tech-lead scoping pass + a real Firefox `file://` test (this session's first use of the new "launch real
firefox.exe via WSL interop" convention, not headless Playwright) settled the mechanism: `fetch()`/
`decodeAudioData` is blocked on `file://`, and — confirmed by ear, not just by absence of errors —
`createMediaElementSource` is silently muted on `file://` too. Real clips play via a bare `<audio>` element
`.play()` **outside** the Web Audio graph, so `assets/` lives alongside `orbital-ventures.html`/`index.html`
in the repo root with no build-time path rewriting, and mute is a second parallel path (`el.muted =
!soundOn`) rather than routing through `sfxBus`. **Slice 1**: plumbing only — `AUDIO_CLIPS` manifest,
`playClip(key, fallback)` (lazy per-key `<audio>` cache, falls back to the procedural equivalent on missing
file/load/play failure, headless-safe via an `Audio!==undefined` guard), proven with a synthetic
placeholder tone (never a copied system sound — clean licensing) wired to the T-31 hold. **Slice 2**: two
real NASA clips (public domain, official nasa.gov hosting) — Apollo 11 "We have a lift-off" (~25s) for the
Apollo visual era, STS-135 "Countdown to Launch" (~20s) for 80s/90s2000s/spacex. Both clips are 10-25x
longer than the pad phase, so playback is deliberately decoupled from the pad-phase timer — the clip runs
its natural length as an audio bed under ascent/coast, never gated at `padU>=0.96`/liftoff. New `stopClips()`
added to every overlay-close path (`dismissAnim`/`skipAnim`/`scrubLaunch`/`endAnim`'s non-hold close) so a
skip/dismiss doesn't leave a 20+ second clip playing — this wasn't needed for Slice 1's 350ms placeholder.
`assets/CREDITS.md` tracks source/license/date per file. **Known gap, not blocking**: STS-135's 2011 audio
is a weak thematic fit for the `spacex`/modern era (apollo/80s/90s2000s are well-matched) — a 3rd clip for
the modern era is the natural next step. `test-sound.js` 19/19, pad/decision-panel suites unaffected.

**No SAVE_VERSION bump anywhere in this session** — everything above is presentation, transient
notification state, or `localStorage` preferences, no new persisted save-game fields.

**Correction, same day:** the external audio pipeline above (Slices 1-2 + the "every launch" trigger fix)
was **fully reverted** at user request — they didn't want the specific Apollo-11-named real clip in the
game. `AUDIO_CLIPS`/`playClip`/`clipCache`/`stopClips` (shell.js) and the entire `assets/` folder (both
mp3s + CREDITS.md) were deleted; confirmed by grep, zero references remain anywhere including the built
output. The pad-phase-start audio cue is back to purely procedural: `sfxBlip(392,0.55,0.13)` fires once per
launch via a `_padStartCue` guard (renamed from `_countdownClipPlayed`), same trigger point (top of
`drawPad`, every launch) the "every launch" fix had just established — so the *behavior* the user asked for
last (a cue on every launch) is preserved, only the *content* is synthesized again instead of real audio.
Countdown voice (backlog #35) is therefore back to tones-only end-to-end: Slice A (toggle + blips + liftoff
tone) + Slice B (T-31 hold reskin), no external-asset dependency. `test-sound.js`/`test-decision-panel.js`
updated to match (no clip-specific assertions remain). If real audio is revisited later, don't just re-add
the Apollo/Shuttle clips — source something the user is comfortable with first.

## Session — E0.3 Slice 0: dirty-flag rendering snapshot harness (2026-07-12)

**Planning pass (tech-lead) revised the roadmap's original E0.3 framing.** The two named bugs (focus/scroll
loss in re-rendered panels, time-warp GC churn) don't need a full per-region dirty-flag architecture — both
are fixed by one `setHTML()` helper (skip the DOM write when the string is unchanged; capture/restore focus
+ scroll on a real write). Migrating all ~158 `render()` call sites to `invalidate(region)` was rejected as
over-scoped: nearly all of those sites are cold (once-per-click), safe, and correct to leave calling
`render()` forever — only the 1Hz warp tick is actually hot. A thin region layer is still worth building,
but only so the *future* ops-density feature (simultaneous-mission widgets) has somewhere to register named
subregions later; it doesn't need to be exhaustive now. Revised slice plan: **0** snapshot test harness
(this session) · **1** extract `render()`'s body into ~9 named regions + `renderAll()`/`invalidate()`, with
`render()` staying a permanent alias for `renderAll()` so all existing call sites keep working untouched ·
**2** `setHTML()` memoize + focus/scroll fix — the slice that actually fixes the bugs · **3** (optional,
small) migrate just the warp-tick hot path + a few exemplar cold sites · **4** deferred until ops-density
is a real feature. Roadmap's real deliverable is Slices 0–2; 3–4 are discretionary.

**Slice 0 (snapshot harness) DONE, tests passing, not yet committed/pushed.** New
`tests/test-render-regions.js`: defines the region→container-id map Slice 1 will extract `render()`'s body
into (topbar/badges/railLeft/railRight/objective/log/scene×5-tabs/modal, representative ids not exhaustive
— written down once in the file as the authoritative reference for Slice 1), scripts a playthrough (boot,
all 5 tabs, 3 years of time advance, an infra-modal open/close), and asserts `render()` is idempotent —
calling it twice back-to-back with no state change in between produces byte-identical output for every
inspected id. 21/21 checks.

**Found and worked around three real gaps in the existing harness/suite while building this — all fixed
locally in the new test file, nothing shared touched:**
- `document.getElementById` (harness.js) returns a fresh, memory-less stub every call by design (production
  code only ever writes to the DOM, never reads back) — so no prior test could actually inspect rendered
  content. Added a scoped memoizing cache in the new test file for just the ids it inspects; every other id
  keeps the harness's original behavior.
- The stub's `.innerHTML=''` never clears `.children` — an `appendChild`-based renderer (`renderLog` does
  `box.innerHTML=''` then appends real row nodes) accumulated children forever across repeated `render()`
  calls once an element was memoized. Patched the memoized instances' `innerHTML` setter to also clear
  `.children`, matching real DOM semantics.
- **`setTab()` defers the actual `state.tab=t; render()` behind a 150ms `setTimeout`, gated on finding a
  `.viewport` element** (for the tab-fade transition) — the harness's `document.querySelector` always
  returns a truthy stub, so `setTab()` **always** takes that async branch under the harness, and a
  synchronous `render()` called right after is still rendering the OLD tab. This means every existing
  test's `setTab(t); render();` pattern (e.g. `test-regression.js`'s per-scene loop) has never actually
  rendered the target tab — `test-regression.js`'s check there is `check('render scene '+t, true)`, a
  trivial always-pass, so this was never caught. Worked around locally with a `gotoTab()` helper that goes
  straight to `state.tab=t; render()` (the same synchronous path `setTab()` itself takes when `.viewport`
  is absent). Not fixed in `test-regression.js` or `harness.js` — out of this slice's scope — but worth
  knowing before trusting any existing "renders every tab" test as real coverage.
- Also discovered (and correctly treated as intentional, not a bug): render.js's module-level `_texSeq`
  counter mints a fresh numeric suffix on every call for SVG gradient/texture ids (`sun0`, `sun0h`,
  `texmars3`, ...) specifically so a live browser never reuses a stale cached gradient across a re-render —
  expected to differ between any two `render()` calls. Normalized these out (regex strip) before comparing
  rather than treating the diff as a failure.

Full suite re-run after this slice: 21/21 new, all 37 other test files unaffected, same single
pre-existing unrelated `test-progress-unify.js` shortfall as before this session. No SAVE_VERSION bump
(pure test code, zero product-code changes). **Next: Slice 1** (extract `render()`'s body into the named
regions as pure code motion, validated against this suite's snapshots).

## Session — E0.3 Slice 1: render() → named regions, pure code motion (2026-07-12)

**DONE, tests passing, not yet committed/pushed.** `render()`'s ~90-line body (render.js) is now 12 small
functions, each tagged with one of the 8 region names from Slice 0's snapshot map (`chrome`, `badges`,
`topbar`, `railLeft`, `railRight`, `scene`, `objective`, `log`, `modal`) in a `RENDER_REGIONS` array, run in
**exactly the original statement order** — zero reordering. Some region names tag two non-adjacent
functions (`chrome` and `topbar` each appear at two points in the original flow, `scene` splits into a
command/bench/contracts dispatch and a later rnd/map/station dispatch, because `renderNextObjective()`
originally sits between them) rather than force a single contiguous block per name — preserving today's
exact execution order took priority over tidy grouping, since `syncTopbarH()`/`updateTimeArrows()`
(`renderTopbarLayout`, kept last) depend on every other region having already written its content, per the
Slice 0 planning pass's explicit warning about layout-order dependencies.

New `renderAll()` runs every function in `RENDER_REGIONS` in order (identical to the old `render()` body,
plus the same `RETIRED_TABS` migration preamble). New `invalidate(...names)` runs only the functions whose
tag matches, in the same relative order — a strict subset of `renderAll()`'s work, so the two mechanisms
can never disagree or drift apart. **`render()` itself is now a one-line permanent alias for `renderAll()`**
— every one of the ~158 existing call sites across the codebase needed zero changes and keeps working
forever; nothing calls `invalidate()` yet (that starts in a later slice, scoped to the warp-tick hot path
per the Slice 0 plan). No new dead code either: `renderCCLeft`/`renderRailPersistent`/`renderNextObjective`/
`renderLog` are pre-existing standalone functions, just registered directly as region entries rather than
wrapped.

**Validation:** Slice 0's `test-render-regions.js` — 21/21, byte-identical to pre-refactor (the actual
region-by-region diffing the roadmap item asked for). Full suite: same single pre-existing unrelated
`test-progress-unify.js` shortfall (24/34, unchanged pass count from before this slice), all other 36 files
green. No SAVE_VERSION bump (pure render-layer code motion, no persisted-state change). **Needs a real-
browser check**: general smoke pass across all 5 tabs, time-warp, and an open modal — this slice should be
indistinguishable from before by design, so "nothing looks different" *is* the pass condition.

**Next: Slice 2** — `setHTML(el, html)` with memoized last-written-string skip + focus/scroll capture-
restore, the slice that actually fixes E0.3's two named bugs (focus/scroll loss, warp-tick DOM churn).

## Session — E0.3 Slice 2: setHTML() memoize + focus/scroll fix (2026-07-12)

**DONE, tests passing, not yet committed/pushed. No SAVE_VERSION bump** (pure render-layer behavior,
no persisted state). This is the slice that actually fixes E0.3's two named bugs.

**New `setHTML(el, html)` (render.js)**: skips the `.innerHTML` write entirely when `html` is byte-
identical to what that exact element was last written with (cached in a `Map<element,string>` — never
reads `el.innerHTML` back, per the planning pass's warning that re-serialization doesn't round-trip
byte-identically). On a real write, captures `document.activeElement` (+ its selection range, if it's
inside `el` and has an id) and the scrollTop of `el` itself plus any id-bearing scrollable descendant,
restoring both after the rewrite. **Cache-clear-on-load guard**: `newGame()`/`applyLoadedSave()` both
reassign the top-level `state` variable to a fresh object (confirmed by reading both — `state = {...}`
in sim.js, `state=saved` in save.js), so `setHTML` compares `state`'s identity against the state it
last saw and wipes its cache on any mismatch — zero changes needed in sim.js/save.js, no risk of a
stale string from a previous game silently surviving a new game or a load.

**Routed through `setHTML` this slice** (the always-on regions + one bench panel, per the Slice 0
plan's "sweep incrementally" instruction — not all ~97 innerHTML sites):
- `renderNextObjective` (`nextObjStatus`), `renderOutliner` (`outlinerCard`, both its empty- and
  populated-state writes), `renderRailPersistent`'s per-section accordion body write (covers all 4
  rail sections — Mission Control/Design Bench/Programs/Contracts — through the one shared line).
- `readoutCard`, the bench mission-fit card — both its non-profile (`renderReadout`) and profile-
  mission (`renderProfileReadout`) writers.
- `showModal` (sim.js): this is where the actual "modal jitter" bug lived — `render()` re-invokes
  `activeModal()` (→ `showModal` again) on **every single tick** while a deep-view modal is open, so
  the body was being fully rebuilt and the entrance animation (`.modal-entering`) was replaying on
  every re-render, not just the genuine open. Routed the body write through `setHTML`, and moved the
  entrance-class-add + initial-focus-grab to fire only on the closed→open transition (`!wasOpen`) —
  consistent with the trigger-focus capture immediately above it, which already made that exact
  distinction for a different reason. This was speculated as a real bug when Slice 0's snapshot test
  was being written and is now confirmed and fixed.

**`renderLog` (`opsTimeline`) is a scroll-only fix, not routed through `setHTML`.** It builds real DOM
nodes via `document.createElement`+`appendChild` with actual JS-closure `onclick` handlers (not the
rest of the codebase's `onclick="fn('id')"` attribute-string convention), so there's no single html
string to memoize against. Wrapped the whole function body in a capture-before / restore-in-`finally`
of `opsTimeline.scrollTop` instead — covers both early-return paths (collapsed, empty-after-filter)
and the normal fall-through. This directly fixes the "scroll the log during warp" bug without touching
the function's internals or risking the closure-based nav handlers.

**Known, deliberate non-fix: range-slider drag continuity on the bench.** Investigated whether the
bench's `type="range"` sliders (`oninput="setProp(...);render()"`, fires continuously while dragging)
suffer DOM-node replacement mid-drag, which can drop the browser's native mouse-capture on the slider.
Confirmed this is a *different* bug than what `setHTML` fixes — the html content genuinely changes on
every drag tick (the displayed value differs), so the memoize-skip can't help here by construction. Not
in scope for this slice; would need a lower-level fix (e.g. patching just the `value` attribute instead
of replacing the containing card) if it's ever a real complaint.

**Validation:** new `tests/test-sethtml.js` (9/9) — direct unit tests of the memoize-skip decision
(identical writes skipped, different writes go through, two elements don't share a cache slot) and the
newGame cache-clear trap specifically (writes the same string before/after `newGame()` and confirms the
second write is NOT skipped despite being identical, proving the state-identity guard actually fires).
Focus/scroll capture-restore itself isn't asserted here — the harness doesn't model
`document.activeElement` or a real browser's "`innerHTML=''` resets `scrollTop`" behavior, so that half
needs the real-browser checklist below. Slice 0's `test-render-regions.js`: 21/21, byte-identical to
pre-Slice-2 output (confirms none of the above changed *what* gets rendered, only *when*). Full suite:
39 files, same single pre-existing `test-progress-unify.js` shortfall (24/34, unchanged) and one
already-documented RNG-flaky file (`test-station-slice2.js`, 3/4 clean re-runs — unrelated to this
slice, its Mars delivery reliability roll).

**Needs a real-browser check**: (1) open a deep-view modal (Programs/Rivals/Personnel/Infrastructure),
let time run/warp with it open, and confirm the entrance animation no longer replays on every tick;
(2) scroll the ops-timeline log up while advancing time and confirm it stays put instead of snapping to
top; (3) type into the livery/blueprint name field and confirm nothing about typing feels different
(this was already probably fine per the `onchange`-not-`oninput` analysis above, but worth a real look);
(4) general smoke pass across all 5 tabs — this slice should be behaviorally invisible except for the
two fixes above.

**Next: Slice 3** (optional, small) — migrate the warp-tick hot path to `invalidate(...)` plus a
couple of trivially-scoped cold sites as pattern exemplars; explicitly not the remaining ~140 sites.
Roadmap's real E0.3 deliverable (Slices 0-2) is now complete — Slice 3/4 are discretionary polish.

## Session — Technical audit + H1/M1–M5 fixes (2026-07-13)

A focused technical-only second-pass audit (bugs / perf / memory / save integrity / error handling /
security / browser compat — design sections deliberately excluded, already triaged via
`EVALUATION-2026-07.md`). Full findings in **`TECH-AUDIT-2026-07.md`**. Headline: codebase in strong
technical shape (38/39 baseline, no state growth over a 15-year headless campaign, clean
rAF/timer/audio lifecycles, robust save architecture). All High/Medium findings fixed this session:

- **H1 (High) — stored XSS via save import**: `openVehPopout`'s title injected the user-editable
  `livery.name` into innerHTML unescaped (the ONE pop-out title sink that missed the `esc()` pattern —
  station's escapes correctly), and the import path applied `livery.name` with no length clamp, so a
  shared save file could execute script on pop-out open. Fixed: `esc(title)` at the sink +
  `applyLoadedSave` re-clamps `livery.name` (24) and `company` (48) as defense in depth. New suite
  `tests/test-livery-esc.js` (10 checks): esc() fundamentals, hostile-name-renders-inert at the real
  sink (captured via appendChild shim), import re-clamp, live-input clamp.
- **M1 — dead resupply badge**: the Station tab badge called `resupplyShortfall()`, a function that
  never existed (typeof-guarded → silently never fired). Replaced with a real check: any built
  facility starved or ≤2 mo provisions with no shipment en route. Probe-validated (off fresh / fires
  starved / suppressed while a logistics flight is in transit).
- **M2 — silent autosave failure**: `autosave()` swallowed write failures forever. Now counts
  consecutive failures, surfaces ONE in-game 'bad' log line at the 3rd (points at Export save),
  re-arms after any successful write.
- **M3 — forward-version load guard**: `loadSaveFromText` now warns + requires explicit "Load anyway"
  when `payload.v > SAVE_VERSION` (newer-build semantics could be misread, then corrupted on next
  write — the v34 months→days kind of change). `autoLoad` (Continue, same-browser canonical slot)
  applies but logs a visible warning instead — an interactive confirm doesn't fit that flow.
  Refactor: shared `_applySaveFromPayload()` extracted from loadSaveFromText's body.
- **M4 — mobile save gap**: forced flush rode `beforeunload` only, which iOS Safari/Android
  tab-discard frequently never fire; everything since the last time-advance (bench edits, purchases)
  was at risk. Added `pagehide` + `visibilitychange→hidden` flushes (`autosave(true)`, idempotent).
- **M5 — HEAD was red by design**: `test-progress-unify.js` (F4 forward test, documented) now
  self-skips with a visible `SKIP` line + exit 0 unless `RUN_F4=1`, so the full suite gates green and
  real regressions elsewhere stay distinguishable. Delete the skip header when F4 lands.

**Not fixed (Low, deliberate)**: L1 tech-pane window-listener orphaning on pane recreation, L2 setHTML
Map→WeakMap, L3 timeInterrupt() at flight-overlay open, L4 dead locals (`thrSL`, 2× `chk`, `isEng`,
unused `mapScene`/`stationScene` assignments). All small; folded into backlog-tier cleanup.

**No persisted-state change** — SAVE_VERSION stays 52 (the livery/company clamp is a load-time
transform, not a schema change).

**Validation.** `node --check` OK; ESLint no-undef over the full concatenation now clean except the
27 expected guarded-Phaser refs (the `resupplyShortfall` no-undef is gone). **40/40 suites pass**
(39 real + the F4 skip). New livery-esc suite 10/10. M1 probe 3/3. Not yet browser-tested: the M3
newer-version modal's layout and the M2 warning line deserve one real-browser look.

## Session — #38 Night launches, era-scaled (2026-07-13)

Backlog #38 (S/★, ungrouped) implemented: launches now roll a `night` flag (era-scaled chance,
`nightLaunchChance()` in data.js — 8% Pioneer era rising to a 32% cap by Commercial+, reflecting
early-program range/tracking limits vs. later routine night ops). Purely visual — no mechanical
effect on reliability, cost, or outcome.

- **Where it's rolled**: both real pad→ascent spec-build sites (`finalizeLaunch`, `buildDepartSpec`
  in sim.js) roll independently via the existing per-flight `rnd()` (same pattern as `rng.wind` etc).
  `openFlightForDecision` (flight.js) also rolls its own, for the case where a live-call/weather/
  rescue decision opens the overlay *before* the outcome is known — `finalizeLaunch`'s later spec
  then **reuses** that earlier roll (via `animState._openedForDecision`) rather than re-rolling,
  so `resumeFlightForDecision`'s `Object.assign` merge can't flip the sky mid-launch on a flight
  the player is already watching.
- **Visuals** (`drawAscent`, flight.js): night launches start the sky near-black with stars visible
  from t=0 (day launches still fade in stars after climbing past the dusk band) — same 3-stop
  gradient structure, no downstream code touched. Added ground-level xenon floodlight cones on the
  tower/pad apron, fading out on the same altitude envelope the pad structure itself already used,
  keyed off the existing `padGroundY`/`towerTop` geometry — no new layout math.
- **No SAVE_VERSION bump** — `night` lives only on the transient flight spec, never persisted.

**Validation.** `node --check` OK, lint clean (same 27 guarded-Phaser refs as baseline, no new
no-undef). New `tests/test-night-launch.js` (9/9): era-scaling bounds + monotonicity, sampled-rate
sanity check against the stated chance, both spec-build sites produce a strict boolean and can be
forced either way via rng, `drawAscent` renders without throwing at four altitudes with
`night:true` (using the harness's real canvas-stub, not a hand-rolled one), and the resume-reuse
guard. **41/41 suites** (40 real + the F4 skip). **Needs a real-browser check**: the floodlight
cones' angle/brightness read correctly against the dark sky, and a live-call decision mid-launch
genuinely doesn't flip day↔night on resume.

## E1.7 — Space Telescope standing program (2026-07-16, scoped)

Backlog #82. Flying the existing `space_telescope` mission ("Orbital Observatory") currently just
banks a one-time sciYield windfall. This slice turns it into a standing program by reusing the
passive-contracts pattern (`state.passiveContracts`/`tickPassiveContracts` — same shape signPassive-
Contract already uses for economy contracts) instead of inventing a new subsystem.

**Design**
- On a successful `space_telescope` flight, seed `state.scienceProgram` (singular — one telescope
  program active at a time, same one-at-a-time constraint passive contracts don't have but this
  should, since it represents one physical instrument): `{monthsLeft: TELESCOPE_TERM, sciPerMonth:
  TELESCOPE_SCI_BASE, health: 100}`.
- New tick fn `tickScienceProgram()`, called from `tickMonthlyBoundary()` alongside
  `tickPassiveContracts()`: pays `sciPerMonth` into `state.science` monthly, decrements `monthsLeft`,
  decays `health` slowly (instrument aging — mirrors `facilitySupplyDrain`'s shape, not a copy).
  At `monthsLeft<=0` or `health<=0`, program lapses — log line, `state.scienceProgram=null`, flight
  becomes re-signable (same `passiveStatus`-style gate).
- **Events**, reusing the `_pendingInquiry`-style transient-decision shape (not the object itself —
  a new `_pendingDiscovery`): a small monthly roll while the program is active can surface a discovery
  event — flavor log line + either a science windfall (rare, big) or an instrument-fault decision
  (fund a repair to restore `health`, or let it degrade — same fund/decline shape as
  `resolveInquiry`). Keeps the "occasional events" half of #82 distinct from the steady drip, so the
  program isn't just a flat passive-income clone.
- Right-rail surface: one line in the existing Outliner (program has an implicit ETA — `monthsLeft`)
  and one line in `commandSummary()`'s data (`scienceProgram: {monthsLeft, health}` or `null`) so the
  advisor/CC can show it without new UI plumbing.

**Explicitly not doing:** a telescope *facility* (station real estate) — this stays a "sign once,
runs itself" program like other passive contracts, not a buildable module. Multiple simultaneous
telescopes — one program slot, consistent with it being framed as an actual instrument.

**Size:** M, per backlog estimate — mostly wiring three already-proven patterns (passive-contract
tick/expiry, inquiry-style fund/decline decision, Outliner/commandSummary surfacing) rather than new
mechanics. No SAVE_VERSION bump needed if `state.scienceProgram` defaults to `null`/undefined
lazily on load (same convention every other optional-state field uses).

**Not yet scheduled** — sits after E1.2/E1.6 in the current queue; pull forward on request.

## Session — E1.7 shipped: space telescope standing program (2026-07-16)

Backlog #82 implemented per the E1.7 scoping entry above. Reused two existing patterns rather than
new mechanics: the passive-contract tick/expiry shape for the steady drip, the inquiry fund/decline
shape for fault events.

- **Seed**: a successful `space_telescope` (Orbital Observatory) flight sets `state.scienceProgram=
  {monthsLeft:TELESCOPE_TERM(60), sciPerMonth:TELESCOPE_SCI_BASE(2), health:100}` — one slot; a
  re-flight while one's already running just banks the normal one-time sciYield, no stacking.
- **`tickScienceProgram()`** (called from `tickMonthlyBoundary` alongside `tickPassiveContracts`):
  pays `sciPerMonth` into `state.science`, decrements `monthsLeft`, decays `health` by
  `TELESCOPE_HEALTH_DRAIN` (1.2/mo), rolls a 6%/mo discovery chance, clears the program at
  `monthsLeft<=0` (term complete, re-flyable) or `health<=0` (failed, re-flyable).
- **Discovery events**: 65% windfall (instant +8⚛, no decision — the steady-drip case stays a case
  needing a call, kept it a genuine decision), rest fault (`_pendingDiscovery`, fund/decline —
  `resolveDiscovery()` mirrors `resolveInquiry()` exactly). Wired into all four `maybeShowSetback`-
  style decision-priority chains as `maybeShowDiscovery()`, lowest precedence (the others are
  time-critical crises; this is routine upkeep).
- **Surfacing**: `commandSummary().scienceProgram` (data hook, no new UI yet — deliberately deferred,
  per the scoping note); Outliner row appears only when near-expiry (≤4mo) or degraded (health≤40),
  matching the existing passive-contract "only when it's actionable" convention.

**No SAVE_VERSION bump** — `state.scienceProgram` defaults to `null` lazily, same convention every
other optional field uses.

**Validation.** `node --check` OK, lint clean (27 guarded-Phaser refs, unchanged). New
`tests/test-science-program.js` (22/22): seeding shape, drip/decay math, both expiry paths, both
discovery-roll branches (rng forced via call-counted `Math.random` stub), both `resolveDiscovery`
branches, one-slot guard, and commandSummary/Outliner surfacing with and without an active program.
**40/42 suites** — 2 pre-existing failures (`test-era-visual.js`, `test-theme-sync.js`) unrelated to
this slice, inherited from work pushed since the last session (era pad-style/theme-color checks,
nothing E1.7 touches) — flagged, not fixed here.

**Needs a real-browser check**: the fault-decision modal styling, and that the Outliner row's icon/
color read correctly against the other rows.

## Session — Fable-framework evaluation + backlog additions (2026-07-16)

Code-grounded re-evaluation (UI/UX 6.5, Gameplay 8, Fun 7.5 → **7.3 weighted**, up from July's 7.0
on the flow-architecture/economy passes). One material gap surfaced: **no tutorial exists** — #24
("tutorial replay") presumed one that was never built; onboarding is only the advisor card +
drawing-board + detail toggle. Five new backlog items added (#106–#110): guided first launch (H),
header-stat tooltips, ~1280px desktop breakpoint (zero @media rules today), font-scale setting,
progressive CC deck. Path to 8+: #106, overlay C/D, sound pass, keyboard/reduced-motion — consistent
with the existing EA gate plus the tutorial gap.

## E1.8 — Base Bench (2026-07-16, scoped; #111/#112)

A third bench tab for surface bases (Lunar/Mars), sibling to the Station Bench. Key architectural
fact making this cheap: `lunar_base`/`mars_base` are already full `FACILITY_DEFS` running the
complete station machinery — `moduleList`, power, crew, synergies, `facilityProduction` — the
Station Bench is merely hardwired to `leo_station` (render.js `renderStationDraft`). This is a
visualization/UX build, not a new simulation system.

**Slices (Option B — true third tab, confirmed):**
- **A — plumbing**: `baseView` div + rail scene button + `setTab('base')` wiring, mirroring
  stationView exactly; facility selector (Luna/Mars), each locked until its `reqMission` is flown
  (same gate the facility founding already uses); reuse module cards + power/crew/synergy stats
  readouts verbatim (already facility-generic).
- **B — surface rendering**: horizontal ground-line SVG replacing the vertical orbital stack —
  modules side-by-side joined by connective corridors, regolith horizon, body-tinted sky
  (gray/black for Luna, butterscotch for Mars); reuse the pan/zoom/popout/expand chrome
  (`wireStationPan` pattern, own zoom state).
- **C — surface modules (FOLLOW-UP, #112, not first pass)**: new `STATION_MODULES` entries with
  `surface:true` (ISRU plant, greenhouse, reactor pad — ties to `surface_fission_power` research —
  rover garage); filter surface-only modules off the orbital bench and orbital-only (radiators,
  docking nodes) off surface benches. Until C lands, surface bases build from the shared pool,
  exactly as they already do via the facility modal today.
- **D (optional)**: drawing-board blueprint mode parity.

**Not in scope:** colony population (long-horizon ROADMAP #21), new production mechanics.
**No SAVE_VERSION bump** — per-facility moduleLists already persist.

## Session — E1.8 slices A+B shipped: Base Bench (2026-07-16)

#111 implemented per scoping. New `⛰ Base Bench` rail scene + `baseView`/`railBase` panels; surface
facilities (body≠earth) now render on a horizontal ground-line SVG — modules side by side on the
regolith joined by pressurized corridors, body-tinted sky (LUNA: airless black + seeded starfield;
MARS: butterscotch), landing-shadow grounding, reusing `stationModuleSVG` art and the station
gradient defs verbatim. Own pan/zoom/expand state (`basePanX/Y/Zoom`, `wireBasePan`), locked/empty
state lists founding gates per facility. **The split**: `stationCurrentView` now filters to
`body==='earth'` — surface bases no longer appear as station-bench tabs; `baseCurrentView` owns
them. Stats panel reused via new optional `(focusId, focusFn)` params on
`renderStationFacilityStats` (station callers unchanged). Palette/spec-cards/docking reused
verbatim (already facility-generic). Slice C (surface-specific modules, #112) and D (blueprint
board) not started.

**No SAVE_VERSION bump** — only `state.baseFocus` added, lazily defaulted.

**Validation.** New `tests/test-base-bench.js` (22/22): facility split both directions, focus
fallback, locked-state gates, both body palettes render (stars/corridors/gradient reuse asserted),
stats-panel reuse routes to `setBaseFocus` with correct highlight, zoom clamp + state independence,
end-to-end renderBase locked+active. `test-station-popout.js` updated to the split semantics (focus
exercise via a second orbital facility + explicit split assertion; surface side owned by the new
suite). **41/43** — the 2 pre-existing failures (era-visual, theme-sync) remain untouched.
**Flakiness found (not fixed, out of scope)**: `test-station-slice2.js` Mars-e2e fails ~2/6 runs on
unseeded rng (advance-month event rolls occasionally interfere with the arrival pump) — predates
this slice; worth a seeded-rng harness pass someday.

**Needs a real-browser check**: ground-line composition/colors on both bodies, corridor joints at
odd zoom levels, rail button icon rendering.

## Session — E1.8 slice C shipped: surface base modules (2026-07-16)

#112 implemented. Four surface-only modules added to STATION_MODULES with `surface:true`: ISRU Plant
(fuel, `lunar_isru`-gated), Surface Reactor (24 kW day/night, `surface_fission_power`-gated,
resupply-cut 10%), Habitat Dome (4 crew, the surface Habitat), Rover Garage (field science). Wider/
shorter hulls than orbital cans. Existing modules are implicitly orbital (no flag).

**Filtering**: `renderStationPalette` now branches on `cur.def.body` — orbital benches hide
`surface:true` modules; surface benches hide the orbital-only berth-sphere Node (`node_hub`) but keep
the shared five (Habitat, Lab, Power Truss, Depot, Greenhouse). **Gate enforcement**: new shared
`moduleFacilityCompatible(def, md)` predicate called by all three acquire-gates
(`canAddStationModule` / `canContractStationModule` / `canFlyModuleDelivery`) so a save-edit or stale
delivery offer can't mount an incompatible module — the palette filter alone isn't a security
boundary.

**No SAVE_VERSION bump** — modules are content, moduleLists already persist.

**Validation.** New `tests/test-surface-modules.js` (34/34): definitions + surface flag, the compat
predicate matrix (surface↔orbital both directions, shared modules on both), palette filtering both
benches, all three gates rejecting incompatible pairs + accepting valid ones, and the surface SVG
rendering a base full of the new wide modules. **42/44** — same 2 pre-existing failures untouched.
Slice D (blueprint board for surface bases) remains optional/unstarted; E1.8 is otherwise complete.

**Needs a real-browser check**: the wider surface-module hulls' proportions on the ground line, and
that ISRU/Reactor read as distinct silhouettes from the orbital cans.

## Session — E1.8 slice D shipped: Base Bench blueprint drawing board (2026-07-16)

Final slice of #111. Pre-facility drawing board, parity with the Station Bench's ("dreaming is free")
draft mode — one blueprint per surface body (`state.baseDraftByBody.moon`/`.mars`, independent lists,
toggled in-view via Luna/Mars tabs) since a lunar outpost and a Mars settlement are different designs,
unlike the Station Bench's single orbital facility type. `baseCurrentView()` now returns
`{isDraft:true}` before any surface base is founded; `renderBase()` routes to the new
`renderBaseDraft()` in that case.

**Reuse, not duplication**: `draftAdd`/`draftRemove`/`draftClear` now dispatch on `state.tab==='base'`
to `draftAddBase`/etc — `stationModuleCard`'s hardcoded `onclick="draftAdd(...)"` needed zero changes,
so both benches' draft modes share one card-rendering codepath. `renderStationPalette`'s slice-C body
filtering applies automatically. `renderBaseSurfaceSVG` reused verbatim for the draft preview.

**Bug found and fixed while wiring this**: slice C's exclusion of `node_hub` (the orbital berth-sphere,
the only port-expanding module) from surface benches left surface bases hard-capped at
`STATION_PORT_BASE` (4) forever, with no reachable growth module — would have made slice D's draft
mode unusable past 4 modules. Fixed at the source: `facilityPortCap(fs, def)` now takes the facility
def and returns `Infinity` for any `body!=='earth'` facility — ports are an orbital-assembly metaphor
(finite berths on a stack) that doesn't apply to a ground base spreading out. Threaded `def` through
all 7 call sites (3 in sim.js's gate functions, 4 in render.js); caught and fixed two `ReferenceError`s
(`def` not in scope) the mechanical thread-through introduced in `draftAdd`/`stationDraftStatsHTML` —
station draft is always orbital, so both now pass `undefined` explicitly, unchanged behavior.

**No SAVE_VERSION bump** — `state.baseDraftByBody`/`state.baseDraftBody` lazily default.

**Validation.** New `tests/test-base-draft.js` (23/23): the port-cap fix directly, per-body draft
independence, dispatch routing both directions (base tab doesn't touch station draft and vice versa,
regression-guarded), the station-draft 4-cap still enforced without a Node, cost preview, stats
messaging, `renderBaseDraft` end-to-end for both bodies, and the draft→founded lifecycle transition.
`test-base-bench.js` updated for the empty-state change (draft mode replaces the old locked view).
**43/45** — same 2 pre-existing failures (era-visual, theme-sync) untouched. **E1.8 is now complete**
(#111 all four slices, #112 slice C content).

**Needs a real-browser check**: Luna/Mars tab toggle interaction, draft SVG at zoom, and the
unlimited-module claim rendering sensibly at high module counts (ground-line width/scroll behavior
untested past ~6 modules).

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

## Session — E3.0 shipped: part-graph model + physics bridge (2026-07-16)

The make-or-break slice of the E3 epic, and it **passes**. New `src/parts.js` (loaded after data.js,
before sim.js, in the build order) holds: `PART_DEFS` (viable set — tank, decoupler, engine, capsule,
nosecone, probe core — with attach-node classes, footprints, and a real `phys` block), the
`state.build` part-graph model (`{parts, links, root}`), spine/tree traversal, and **the bridge**:
`buildToStageIR(build)` walks the spine top→bottom, splits into stages at decoupler boundaries, and
emits the exact `{eng, count, prop, dia}` stage array + payload that the existing
`stackPerformance`/`stageMasses` physics core already consumes — so `computeVehicle()`'s deep contract
(materials, doctrines, heritage, recovery, families, difficulty) is **reused, not rewritten**.
`sliderDesignToBuild()` is the reverse map (used by the E3.5 save migration and, now, the equivalence
harness). Everything is behind `BENCH_V2=false` and reachable only from tests — zero live-game wiring
this slice, exactly the parallel-flag plan.

**The proof.** `tests/test-parts-bridge.js` (31/31): builds slider designs, converts to graphs,
reduces graphs back to stages, and asserts Δv / liftoff mass / stage-1 TWR / every per-stage Δv match
the direct slider path within tolerance — across single-stage uncrewed, two-stage crewed, and
three-stage clustered designs. Plus graph-integrity (spine length, decoupler count = stages−1, firing
order preserved), malformed-build handling (empty / payload-only / tank-without-engine all error
cleanly), and IR determinism. Sabotage-verified out-of-band: doubling a stage's prop in the graph is
caught, so the harness genuinely discriminates.

**No SAVE_VERSION bump** — nothing persisted yet; `state.build` doesn't exist in live saves until
E3.5. **No behaviour change** — the old bench is untouched and still default.

**Validation.** `node --check` OK, lint clean (same 27 guarded-Phaser refs). **43/46** — the 3 failures
are all pre-existing and unrelated (era-visual, theme-sync, and the known rng-flaky station-slice2,
confirmed flaky this run: FAIL/FAIL/PASS across 3 runs).

**Next:** E3.1 (read-only 2D bench render of `state.build`) is mechanical once the model exists —
lighter model fits. The remaining physics-depth wiring (E3.4) and save migration (E3.5) are the other
substantial pieces.

## Session — E3.1 shipped: read-only part-graph renderer (2026-07-16)

Pure `renderBuildSVG(build, W, H)` added to `src/parts.js`: static SVG rocket drawn from `state.build`
— tapered nosecone, engine bell trapezoid, tank/generic cylinder with the same gradient-hull idiom
E1.8's `renderStationStackSVG`/`renderBaseSurfaceSVG` established, category-colored (structural/
propulsion/avionics/payload), plus a real per-stage Δv/TWR text overlay computed from
`buildToStageIR` → `stackPerformance` — the same numbers the E3.0 harness already proved equivalent
to the slider bench, not decoration.

**Refactor while wiring this**: extracted `spineGroups(build)` (split the spine at decoupler
boundaries) out of `buildToStageIR` so the physics bridge and the renderer share one source of truth
for "what counts as a stage" — `buildToStageIR` reverses it to firing order, the renderer walks it
top-down for label placement. Prevents the two from silently drifting on stage boundaries as parts are
added in later slices.

**Deliberate design choice, not deferred scope**: the renderer's error surface is intentionally
narrower than the bridge's — it draws any structurally valid spine (including a lone decoupler or an
engine with no tank) because a player needs to *see* a non-flying rocket to fix it; only unknown-part/
empty/no-spine are render errors, while "no propulsive stage" is bridge-only and just yields an empty
stage-label overlay. Test suite documents this explicitly rather than assuming parity.

**Still behind `BENCH_V2=false`, still zero live UI wiring** — this slice is a proven, tested pure
function, not a reachable view. Live wiring (a dev-flippable read-only tab) is deferred to E3.2, where
there's something interactive to actually look at; wiring dead markup into `shell.html` for a
permanently-invisible feature isn't worth the surface area yet.

**No SAVE_VERSION bump, no behaviour change.**

**Validation.** New `tests/test-parts-render.js` (24/24): every viable-set part renders standalone,
full 2-stage crewed build renders correct part shapes + stage-label count, overlay Δv/TWR numbers
verified against real `stackPerformance` output (not just "doesn't throw"), single-stage label count,
malformed-build handling (with the narrower-contract distinction explicit), geometry sanity (no NaN/
negative dimensions), and symmetry (`sym>1`) tolerance ahead of E3.3. Re-ran `test-parts-bridge.js`
after the `spineGroups` refactor — still 31/31, no regression. **44/47** — same 3 pre-existing
failures (era-visual, theme-sync, rng-flaky station-slice2), none related.

**Next:** E3.2 (drag-drop editing — palette, snap-to-node, ghost preview) is the first slice where
live UI wiring actually earns its keep. Large (L); design/interaction work — heavier model likely
worth it for the snap/validation logic, though the palette-card rendering itself is mechanical.

## Session — E3.2 shipped: drag-drop part editing (2026-07-16)

The first live-reachable slice of the part bench (still `BENCH_V2`-gated). Built in two layers:

**Model layer (pure, headless-tested — the risk).** Added to `src/parts.js`: `openNodes` (occupancy-
aware), `nodesCompatible` (diameter-class match + opposite-facing rule — hard block on mismatches),
`canAttach` (with reasons), `attachPart`/`detachPart` (detach takes the whole subtree, KSP-style,
never the root), `findSnapTarget` (nearest open compatible node, taking a node-position lookup as a
callback so it stays pure), and `buildWarnings` (soft, non-blocking — e.g. no-avionics). All 29 checks
in `tests/test-parts-attach.js` green before any DOM existed.

**UI layer (DOM controller).** Palette (`renderPartsPalette` — 4 category groups, draggable cards with
real stats pulled from ENGINES for engines), and two placement paths both routed through `attachPart`:
click a part → attaches to the selected open node, or auto-targets when exactly one node is open (the
touch-friendly baseline that always works); or drag → drop snaps to the nearest compatible node via
`findSnapTarget` over the rendered `nodePos` map. `renderBuildSVG` gained an `interactive` mode that
emits open-node markers + a `nodePos` map for the snap layer. The SVG hit-target overlay is defensive
(wrapped so headless/partial-DOM can't throw — it's pure decoration).

**Wiring.** `benchView` gained a hidden `#benchV2` assembly UI (canvas + palette + live stats); the
bench render path shows it and calls `renderPartsBench()` only when `BENCH_V2` is on, else the old
slider bench is untouched and default. First slice where live wiring earned its keep (there's finally
something interactive to see when a dev flips the flag).

**No SAVE_VERSION bump, no shipped-behaviour change** (flag still false).

**Validation.** `test-parts-attach.js` (29/29 model) + `test-parts-ui.js` (23/23 interaction logic —
palette, auto-target, explicit-select, drop-snap commit, interactive-render markers). Re-ran the E3.0
bridge (31/31) and E3.1 renderer (24/24) — no regression. **47/49** — the 2 failures are the
pre-existing era-visual/theme-sync (station-slice2 passed this run, being the known flaky one).

**Deliberately deferred to polish/E3.6, not silently dropped:** pointer-drag ghost that follows the
cursor before drop (current drag uses native HTML5 dragstart/drop, which works but shows no live
snapping preview mid-drag); touch-drag (native dnd is mouse-only — the click-attach path is the touch
story for now). Both are feel-refinements on a working core, not blockers.

**Needs a real-browser check** (the reason this slice most wants human eyes — it's the first
interactive one): drag-drop actually snapping, node markers being tappable at real sizes, palette-card
drag ergonomics.

**Next:** E3.3 (auto-inferred + editable staging stack, symmetry tool). Mechanical-ish given the model
layer exists — symmetry is a `sym` field the bridge already multiplies; the editable fire-order stack
is new UI. Lighter model likely fine.

## Session — E3.3 shipped: booster folding + symmetry tool (2026-07-16)

**Scope narrowed honestly from the epic's original phrasing** — worth stating plainly. "Auto-infer
stage order from decouplers with an editable stack" turns out to have no legitimate free-reorder
interpretation for a single linear spine: `stackPerformance`'s mass-shedding model requires
bottom-fires-first order, so the auto-inferred order IS the only physically valid one. What shipped
instead: a **visible** auto-inferred stage list (engine/Δv/TWR per stage, in the stats panel) rather
than a fake reorder control that would produce nonsense physics. If the physics core ever grows
non-adjacent staging support, revisit — not expected to be worth it.

**What's real and useful: strap-on boosters + symmetry.** New `booster_solid` part (radial-only, uses
`ENGINES.solid_castor` — already documented in data.js as booster-usable), `tank_std` gained a radial
attach node. The bridge folds stage-0 radial boosters into the **existing** `state.boosters` side-
channel (`{eng,count,prop}`) rather than inventing parallel-timed staging the physics core has never
supported — `boosterMasses()` (sim.js) has always read a single global booster bundle that augments
stage-0's whole burn, so that's the honest integration point. `applySymmetry(build, uid, n)` sets a
clamped (1-4) `sym` field, rejected on non-radial parts (a spine part is singular, nothing to mirror).
New `stackPerformanceForBuild(build)` — the one function that touches `state.boosters` as a global,
always restored via try/finally even on error, isolated from the otherwise-pure bridge.

**Honest edge-case handling, not silent wrongness**: a booster attached to a non-first-firing stage
doesn't get silently dropped or misapplied — `buildToStageIR` warns explicitly ("Boosters only take
effect on the first stage to fire..."). Mixed booster types (not yet reachable with only one radial
node per tank, but the logic is in place) warn rather than averaging into physical nonsense.

**Two real bugs found and fixed while building this** (both the same mistake, in two places): a node's
*id* (e.g. `'rad'`) was being compared against the literal string `'radial'` instead of looking up the
node definition's `.at` field. Caught first in `applySymmetry` (never shipped), then discovered via a
failing test that `radialParts()` — defined in E3.0, unexercised until now — had the identical bug,
silently returning empty for every build regardless of radial attachments. Fixed both at the source.
Also fixed the E3.2 click-attach auto-target heuristic: it counted *all* open nodes rather than nodes
*compatible with the specific part being placed*, which broke the moment a part (the now-radial-
capable tank) had more than one open node type at once.

**Rendering**: booster silhouettes draw mirrored left/right of the spine (correct 2D-side-elevation
convention — a real N-way ring can only ever show two sides in profile), with a ×N label for sym>1.
Stats panel gained Liftoff TWR (where boosters actually show up — same convention the classic bench
has always used; per-stage Δv/TWR numbers don't reflect boosters, only liftoff TWR and total Δv do)
and a symmetry stepper UI on any placed radial part.

**No SAVE_VERSION bump, no shipped-behaviour change** (still `BENCH_V2`-gated).

**Validation.** New `tests/test-parts-staging.js` (31/31): booster def shape, folding into `ir.boosters`,
symmetry multiplying count, symmetry rejected on axial parts, off-stage-0 warning, mixed-type warning
logic, full numerical equivalence vs. directly setting `state.boosters` and calling `stackPerformance`
(proves the graph path produces identical Δv/liftoff/TWR/boostDv to the classic path), and global-state
restoration on both success and error paths. Re-ran all 4 prior E3 suites (110/110, zero regression) —
the auto-target fix and both radial-bug fixes are covered there and here. **47/50** overall, same 3
pre-existing failures.

**Epic status: 139 checks green across 6 suites (E3.0-E3.3).** Remaining: E3.4 (deeper physics — drag/
thermal/power from real per-part stats), E3.5 (save migration + cutover — the only slice that touches
shipped behavior), E3.6 (polish, optional).

**Next boundary:** E3.4 mixes real design judgment (how much of "deep physics" is worth modeling vs.
diminishing returns) with mechanical wiring. Worth a design pass on paper before coding — heavier
model for the scoping half, lighter fine for implementation once decided.

## Session — E3.4 shipped: per-part physics depth (2026-07-16)

The phys stats in PART_DEFS finally do something. **Hard constraint respected**: `stackPerformance()`
is the shared core the E3.0 equivalence harness locks against the slider bench — it MUST NOT change or
equivalence breaks. So every E3.4 effect is a pure, PART-BENCH-ONLY adjustment layered on top of
`stackPerformanceForBuild`, never touching `stackPerformance` or the slider path (test-parts-physics
section 3 asserts this isolation directly: raw stackPerformance is byte-identical before/after the
E3.4 path runs, and never gains a dragLoss field).

**Scope decided on paper first** (the design question this slice carried): of the four candidate stats,
two feed real physics, one is a warning, one is deferred with a reason —
- **drag (worth it)**: genuinely NEW physics — the existing model has gravity loss but never modeled
  aero. `buildAeroProfile` computes a bounded stage-1 Δv drag loss (≤6%) from the stack's largest
  cross-section × the top part's drag coeff + radial boosters in the freestream; a nosecone halves it.
  Rewards good aero design, which the drawing already shows.
- **control (worth it)**: E3.2 already WARNED on no-avionics; E3.4 makes it BITE — `buildControlProfile`
  returns a reliability multiplier (0.85 open-loop). The warning now names the penalty.
- **power (warning only)**: `buildPowerBalance` — avionics draw power; the probe core has a real draw,
  the crew capsule carries its own generation (fuel cells), so uncrewed-vs-crewed is a genuine power
  distinction and a deficit surfaces as a "systems run down" caution, never a Δv effect. Batteries as a
  real system is a future part, not this slice.
- **thermal (deferred, with reason)**: reentry survival is scripted per-mission-profile, deeply wired;
  retrofitting heat-shield parts into it is its own epic, not a slice. Explicitly out of E3.4.

**Small data additions**: probe_core gains powerDraw 0.3; capsule_mk1 gains powerGen 0.5 / powerDraw
0.3 (power-neutral). These are warning-inputs only — they do NOT feed the mass model, so the E3.0
equivalence harness is untouched (verified: bridge still 31/31).

Stats panel now shows drag loss (with nosecone hint) and the open-loop reliability note; buildWarnings
surfaces the power deficit and the sharpened no-avionics penalty.

**No SAVE_VERSION bump, no shipped-behaviour change** (still BENCH_V2-gated).

**Validation.** New `tests/test-parts-physics.js` (21/21). Two prior-suite checks correctly updated for
the intended divergence (render overlay + booster equivalence now expect the drag-adjusted numbers, and
separately assert drag is the ONLY difference from raw physics) — these were tests asserting the old
"part numbers == raw stackPerformance" identity that E3.4 deliberately breaks for part-built vehicles.
All 7 E3 suites green: **161 checks** (bridge 31, render 26, attach 29, ui 23, staging 31, physics 21).
**48/51** overall, same 3 pre-existing failures.

**Epic status: E3.0-E3.4 complete.** Remaining: **E3.5 (save migration + cutover)** — the ONLY slice
that touches shipped behavior: migrate every saved state.stages design + vehicle family to a build
graph, point the flight animation at the graph, retire the slider bench, flip BENCH_V2 on, SAVE_VERSION
bump. This is the high-risk slice (touches real player saves) and wants its own careful session. E3.6
(polish) optional after.

**Next boundary:** E3.5 is high-stakes migration work — heavier model strongly recommended, and worth
treating as its own focused session rather than a quick continue.

## Session — E3.5 shipped: save-safe migration (2026-07-16)

The one slice that touches real player saves. **Built deliberately NON-destructively** — the responsible
version of "cutover", chosen because a migration bug here corrupts real games irreversibly.

**Design: state.stages stays the source of truth; state.build is a DERIVED, additive companion.**
`stateDesignToBuild(st)` generates a part graph FROM the live slider design (defensive — returns null on
any problem, never throws); `migrateStateToBuild(saved)` calls it from `applyLoadedSave` AFTER state is
set, purely additively (never mutates state.stages). Consequences: the slider bench keeps working
unchanged; saves stay backward-readable by older builds; the graph is always regenerable so there's no
irreversible commit; flipping BENCH_V2 is a VIEW choice, not a data cutover. A true destructive cutover
(retiring state.stages) is explicitly NOT done — it would make saves one-way and a migration bug
unrecoverable. That waits until the part bench has shipped and proven itself in the wild.

`SAVE_VERSION` → 54 (additive: the derived build graph; safe to drop, regenerated on load). `benchBuild()`
derives from the live slider design on demand when no graph exists yet (fresh game), so the part bench
always reflects the current design.

**A real bug the parity check caught — the reason this slice earned its careful treatment.** The
end-to-end save→load→verify test flagged a Δv gap between a migrated graph and its slider source. Isolated
it to booster propellant: `buildToStageIR`'s booster-folding read `bdef.phys.propMass` (the part-def
default, 5) instead of the per-instance `_propOverride` (6) that migration stamps — so a migrated design
with non-default booster prop would have silently flown with wrong Δv. Fixed booster folding to honour
`_engOverride`/`_propOverride`. A physics-parity assertion (derived graph must fly the same Δv as its
slider source, at matched payload with drag added back) is now permanently in the migration suite across
four cases including the exact bug case.

**Save integrity proven end-to-end**: a real save→serialize→load cycle leaves state.stages byte-identical,
derives a correct 7-part graph, carries boosters, and the derived graph's physics matches the slider's
exactly (7064 = 7064 m/s at matched payload).

**Validation.** New `tests/test-parts-migration.js` (28/28): round-trip fidelity across real-shaped
designs, additive-only proof, never-throws on garbage, crewed/uncrewed roots, booster carry, idempotency,
version-bump backward compat, and the 4-case physics-parity guard. All 6 prior E3 suites green after the
booster-fold fix (161 checks). **50/52** overall, same 2 pre-existing failures. Epic total: **189 checks
across 8 suites.**

**Epic E3.0–E3.5 complete and save-safe.** BENCH_V2 remains OFF by default: the part bench is fully built,
tested, migration-safe, and dev-flippable, but not yet the shipped default — the honest state is "ready to
enable once it's had real-browser playtesting", not "silently switched on". E3.6 (polish — part tooltips,
blueprint view, undo/redo, the deferred cursor-follow drag ghost + touch-drag from E3.2) is optional.

**This is a natural stopping point for the epic** — everything shipped is safe and dormant. Enabling
BENCH_V2 as the default is a deliberate future decision that should follow real playtesting, not ride in
on a code session.

## Session — E3.6 shipped: bench polish (2026-07-16) — EPIC E3 COMPLETE

Optional polish slice. Undo/redo (deep-clone snapshots via `benchPushUndo`, capped at 40, redo stack
cleared on any fresh mutation), part deletion (`benchDeletePart` — removes a part + its whole subtree,
undoable, root-protected; the bench could add but not remove a specific part before), a blueprint/
schematic view toggle (cyan-on-navy CSS filter tint), and palette tooltips that carry each part's blurb
+ historical flavor (engines pull their heritage line from ENGINES, reusing the established voice). A
toolbar (undo/redo/blueprint) sits above the canvas. All routed through the single `benchPushUndo`
choke point so every edit is undoable without per-callsite bookkeeping.

**No SAVE_VERSION bump, no shipped-behaviour change** (still BENCH_V2-gated).

**Validation.** New `tests/test-parts-polish.js` (18/18): undo restores exactly, redo re-applies,
new-mutation-clears-redo, undo cap, delete+subtree+undo+root-protection, blueprint toggle, tooltip
flavor content, and deep-clone integrity (later edits don't corrupt history snapshots). All 8 prior E3
suites green. **51/53** overall, same 2 pre-existing failures (era-visual, theme-sync). 

**EPIC E3 (Part-Based Vehicle Bench) COMPLETE — all 7 slices E3.0–E3.6, 9 test suites, 207 checks.**
The part bench is fully built: parts-as-truth graph model with a physics bridge proven numerically
equivalent to the slider core, drag-drop editing with snap-to-node, boosters + symmetry, per-part
physics depth (drag/power/control), save-safe non-destructive migration, and polish (undo/redo/delete/
blueprint/tooltips). **BENCH_V2 remains OFF by default** — everything is built, tested, and migration-
safe, but enabling it as the shipped default is a deliberate decision that should follow real-browser
playtesting, not a code session. Backlog #113 (the epic) is done as scoped; flipping the flag is the
one remaining step and belongs to a human playtest pass.

**Recommended real-browser playtest checklist before enabling BENCH_V2** (the whole epic never ran in a
browser — headless-tested only): drag-drop snap feel, node marker tap sizes, undo/redo responsiveness,
blueprint view legibility, tooltip readability, and a full build→launch cycle confirming the derived
graph flies identically to the slider design it replaces.

## Session — #81 Sample-return market: bank vs sell decision (2026-07-17)

Backlog #81 ("Sample return market — sell/keep for science"), scoped to all 4 sciMission missions
(`space_telescope`, `sample_return`, `astrobiology`, `oort_precursor`), not just literal sample-return
flights. Prior state: each banked a fixed `sciYield` windfall automatically on its first flight (per the
explicit 2026-07-02 design note — "not a balance bug; intentional payout/knowledge tradeoff. Not
revisited."). This session doesn't touch that tradeoff's numbers; it adds a genuine choice on top of it.

**Design.** Reuses the inquiry fund/decline pending-decision shape (`_pendingInquiry` family) rather than
the in-flight-overlay decision panels (unified flight overlay Slice C — still not started, so nothing new
depends on it). `triggerSampleDecision(m, sciAmount)` fires in `finalizeLaunch` at the exact point the old
automatic `sciGain +=` line used to run — same gating (first flight only, not routine, not procedural),
same `sciYieldMult()`/`doctrineMult('sci')` multipliers, so the *computed* amount is unchanged from before.
The baseline per-flight `sciGain` (present on every successful flight regardless of `sciYield`) is
untouched. `maybeShowSampleDecision()` surfaces the modal from the same `finish()` choke point as
`maybeShowInquiry`/`maybeShowHearing`, gated behind setback/mishap/inquiry/hearing/rivalDisaster (lowest
precedence — good news, not a crisis). A same-tick double-trigger (two prestige flights resolving in one
batch of deferred arrivals) auto-banks the second windfall rather than clobbering the pending one or
losing it silently.

**Sell conversion.** New constant `SCI_SELL_RATE=0.5` ($M per ⚛ if sold). First-pass number, not a final
balance call: for `sample_return` (42⚛/$14M payout) selling roughly triples the flight's take; for
`oort_precursor` (120⚛/$1800M payout) the $60M sell value barely registers — selling is tempting early
when money is tight, banking wins naturally once it isn't. No SAVE_VERSION bump — `_pendingSampleDecision`
is transient, same as `_pendingInquiry`/`_pendingDiscovery`/`_pendingRescue`.

**Files.** `src/sim.js` only (mission data in `data.js` untouched — no new missions, just a decision layer
on the existing four). Rebuilt `orbital-ventures.html`/`build/game.js`/`index.html` via `node build.js`;
`node build.js --check` confirms parity.

**Validation.** New `tests/test-sample-decision.js` (29/29): mission-data dependency check (all 4
sciMission missions still carry `sciYield`; the procedural Deep-Space Sample Return contract still
carries none, by design), `triggerSampleDecision` open + amount math, double-trigger auto-bank,
`resolveSampleDecision` both branches + stale-pending no-op, and `maybeShowSampleDecision`'s full
priority-gate chain. Full existing suite (59 files) + `test-build-parity.js` (run standalone per its own
`require('../build.js')` design, not harness-concatenated) all green — no regressions.

**Not done / next:** BACKLOG.md #81 marked shipped. The `SCI_SELL_RATE=0.5` conversion rate is a first
pass — worth a real balance look once there's playtest signal on whether players actually sell early-game
prestige missions or always bank them out of habit.

## Session — #14 Pinned research goal: persistent path highlight (2026-07-17)

Backlog #14 ("Pin a research node as 'goal' → path highlight"). The tech tree already had transient
click-to-highlight (`techFocus`/`techPrereqChain`/`techHighlightSet`, from the 2026-07-02 tech-tree
interaction layer) — this makes it a standing pin instead of something that resets on every click
elsewhere, and adds real planning value on top (remaining-steps count, next-buyable-step callout).

**Design.** New persisted `state.researchGoal` (a RESEARCH id or null). `pinResearchGoal(id)` deliberately
works on **locked** nodes — pinning something several prereqs away and seeing the whole chain light up is
the entire point — and only refuses an already-researched node (nothing to plan toward) or an unknown id.
`techHighlightSet()` now falls back to the goal's chain when `techFocus` is null, so the tree opens with
the goal's path lit by default; any click still transiently overrides to that node's own chain (existing
behavior, unchanged), reverting to the goal view once focus clears. `researchGoalProgress()` walks
`techPrereqChain` to report `{goal, remaining, nextSteps}` — `nextSteps` is filtered to nodes whose state
is `'available'` right now, so the R&D rail can tell the player exactly what's buyable toward the goal
today, not just how far off it is. Surfacing: a 📌-marked band under the track-filter list in the R&D
right rail (`researchGoalBandHTML`, always visible regardless of what's selected — the "planning aid"
part), a 📌 marker on the goal's node in the tree itself, and a pin/unpin button in the research detail
panel (hidden once a node is done).

**Auto-clear.** `completeResearch()` checks the finishing node against `state.researchGoal` and, on a
match, logs `🎯 Goal reached: <name>!` and clears the pin — no stale pins sitting on already-done nodes
under normal play. `researchGoalProgress()` also self-heals defensively (clears + returns null) if a goal
somehow points at an already-researched node by the time it's read — covers `reconcileResearch()`
backfilling a node transitively (tech-tree reshape migration) without going through `completeResearch()`.

**Save.** SAVE_VERSION → 55. Purely additive: `state.researchGoal` reads through `researchGoalProgress()`/
`techHighlightSet()`, both of which treat `undefined` exactly like `null`. No migrate function — pre-v55
saves just load with nothing pinned.

**Files.** `src/sim.js` (state field, `pinResearchGoal`/`clearResearchGoal`, the `completeResearch` hook),
`src/render.js` (`techHighlightSet` fallback, `researchGoalProgress`/`researchGoalBandHTML`, the tree
marker, the detail-panel button), `src/save.js` (SAVE_VERSION). Rebuilt via `node build.js`;
`node build.js --check` confirms parity.

**Validation.** New `tests/test-research-goal.js` (27/27), built on the real `earth_observation` →
`planetary_science` pair (a clean 2-hop chain with no mission gate) rather than fixture nodes: pin/unpin/
toggle/guard-against-done, `techHighlightSet`'s fallback-vs-override behavior, `researchGoalProgress`'s
remaining-count and next-step math across both prereq states, the stale-pin self-heal, `completeResearch`'s
auto-clear-and-log on the goal vs. leaving it alone on an unrelated completion, and a surfacing no-throw
check across the band/tree/detail-panel render paths. Full 60-suite regression + `test-build-parity.js` +
`build.js --check` all green — no regressions.

## Planned — #89 Tracking-station network requirement for deep space (scoped 2026-07-17)

Backlog #89 ("Tracking-station network requirement for deep space" — Classic sink). User chose the
**hard-requirement** fork over a soft reliability bonus, and the **Map tab** for placement over folding
it into R&D/Partnerships.

**Slice 1 — SHIPPED 2026-07-17 (backend + gate, flag-gated OFF).** `TRACKING_STATIONS` (data.js) — 3 real
DSN-analog sites (Goldstone/Madrid/Canberra), setup+upkeep modeled on Research Partnerships. Lifecycle in
sim.js: `stationDef`/`stationBuilt`/`trackingStationCount`/`canBuildStation`/`buildTrackingStation`/
`trackingUpkeep` (build-only, no dissolve for V1 — decommissioning your only station could re-lock
content that was flyable a moment ago). `trackingUpkeep()` wired into both overhead-calc sites + the
expense-breakdown ledger row. Gate lives in `missionTechMet` (data.js): blocks any unflown `.profile`
mission when `trackingStationCount()<1`, via a shared `needsTrackingNetwork(m)` helper also used by
`missionAdvisor` (the why-can't-I-fly explainer) so the two can't drift apart. Grandfather clause:
`state.completed` missions are exempt forever — no migration function needed. **Real gotcha caught and
regression-tested:** `missionTechMet`'s `luna_landing` branch returns early, and luna_landing is itself
`.profile` — the station check had to go *before* that branch or it would've been silently bypassed.
**`TRACKING_NETWORK_LIVE=false`** (a `let`, not `const`, deliberately mutable so tests can flip it and
exercise the real gate) keeps the whole thing inert in shipped code — same reasoning as `BENCH_V2` — until
slice 2 ships an actual way to build a station. New `tests/test-tracking-stations.js`, 36/36. SAVE_VERSION
→ 56 (purely additive — `state.trackingStations` always `[]` until slice 2). Full 61-suite regression +
`build.js --check` clean.

**Slice 2 — SHIPPED 2026-07-17 (build UI + map markers, gate now LIVE).** The Map tab's Earth body-card
carries the DSN build panel (`trackingPanelHTML`, render.js): three sites with per-site Build buttons
gated on `deep_space` research + capital, built sites read as "online", the header shows built/total and
monthly upkeep, and a pre-research state explains the lock. Map markers: a small dish cluster below Earth
in BOTH render paths — SVG `assetMarkersSVG` and Phaser `drawMarkers` — driven by a new
`mapAssetModel().earth.stations` field (the same shared-model pattern as the depot arc / ISRU pick).
Empire strip gains a 📡 tracking chip. **`TRACKING_NETWORK_LIVE` flipped false→true** — the gate is now
enforced, and this slice ships the only in-game way to satisfy it, so the two went together. The flag is
kept (not deleted) as a kill-switch: flip to false to fully disable the requirement if playtest surfaces a
balance problem, without unwinding the wiring.

**Design refinement caught mid-slice.** Flipping the gate live broke `test-station-slice2` (Moon module
delivery failed to auto-select) — because module-delivery cargo runs are `.profile` missions too, and they
*never* set `state.completed`, so they'd have been permanently gated. That's the wrong call: they're
resupply to a base you already operate, not an exploration first. Added a second exemption to
`needsTrackingNetwork` — `.deliverModule` offers are never gated — alongside the existing grandfather
clause. Explicitly regression-tested now.

**Validation.** `test-tracking-stations.js` updated for the now-live shipped state + the slice-2 surface
(panel HTML string checks across pre-research/buyable/partially-built, map-model station field, both
marker renderers no-throw, the module-delivery exemption): 49/49. Full 61-suite regression +
`build.js --check` clean. Headless smoke check confirms panel + empire chip + overview markers all render
with stations built.

**CAVEAT — real-browser playtest still owed.** Same as the E3 epic: this sandbox has no browser, so the
gate was flipped live and the markers/panel were verified only headlessly (string/no-throw level). Before
considering #89 fully closed, a real-browser pass should confirm: the dish cluster is legible and
correctly placed below Earth at map zoom (both Phaser and SVG paths), the build panel reads well in the
body card, and — most importantly — that an existing save whose *next* objective is an ungated deep-space
first surfaces the "build a station" step cleanly via the missionAdvisor rather than feeling like a dead
end. If any of that is off, the kill-switch (flag → false) is the immediate mitigation.

## Planned — Orbital inclination as a physics dimension (scoped 2026-07-17, not built)

Grew out of a scoping question on #45 (ground-track visualization). A real ground track needs orbital
**inclination**, which this game doesn't model — the physics layer is pure Tsiolkovsky (Δv / mass-ratio /
per-leg budgets), no orbital elements. Rather than fake an inclination just to draw a pretty curve, this
scopes adding inclination as a *real, decision-bearing* Δv cost — which also directly de-risks the
Deferred **#30 (Second launch site — inclination economics)**: build this right and #30 later becomes "add
a launch-site latitude picker," not "invent the physics." User chose the **bigger slice**: ship the
mechanism AND retrofit two real missions (Crewed Orbit + Comsat Block Buy), not mechanism-only.

**The real mechanic (genuine orbital mechanics, not hand-waved).** A launch reaches, for free, an orbit
inclined at ≈ the launch site's latitude; you can steer to any *higher* inclination for free (just change
launch azimuth) but reaching a *lower* one costs a plane-change burn: Δv ≈ 2·v·sin(Δi/2), with v ≈ 7800
m/s at LEO. Cape Canaveral is 28.4°N — already hardcoded in render.js as the Earth-globe marker (the only
place a launch-site latitude currently exists). So equatorial (GEO-class, ~0°) targets from the Cape pay a
real, historically-correct tax; this is *why* GEO comsats stage plane changes and why Europe launches from
equatorial French Guiana.

**Architecture — the key finding from scoping.** Crewed Orbit and Comsat are **`reqDv`-shaped, not
`profile`-shaped** — they're gated by a single scalar (`v.totalDv >= m.reqDv`), never simulated leg-by-leg,
so "inject a Plane Change leg into m.profile" does NOT work for them (no profile array exists). The design
that works for BOTH shapes:
  - New optional field `m.inclination` (degrees). Missions that don't set it are completely untouched —
    same opt-in discipline as the tracking-station and sample-return work; zero rebalancing of the other
    ~37 missions.
  - One shared helper `inclinationDv(m)` = the plane-change Δv for `LAUNCH_SITE_LAT − m.inclination` when
    the target is below site latitude, else 0. `LAUNCH_SITE_LAT` is a const (28.4) now, the exact seam
    #30 later swaps for a per-site value.
  - New accessor `effectiveReqDv(m)` = `(m.reqDv||0) + inclinationDv(m)`. Every **budget gate** and
    **display** that currently reads `m.reqDv` routes through it instead (~8 real gate comparisons like
    `v.totalDv < m.reqDv` in sim.js:1958/1964/4380/4389 + render.js:702/2598/3662-3699/5123, plus the
    3 mission-description strings at render.js:5828-5833). **Leave raw `m.reqDv` alone** in the
    *classification* checks (`reqDv>=9000` → isOrbital / sepEvents / isLeoClassMission / recovery-when):
    those ask "is this an orbital-class mission," not "what's the budget," and must not shift when a
    surcharge is added.
  - For `profile`-shaped missions (if any ever set `.inclination`): synthesize a distinct "Plane Change"
    leg right after "Ascent to LEO", mirroring the existing surgical leg handling in simulateMission
    (the gravity-assist / aerocapture multipliers already special-case named legs there) — but ADDITIVE
    (a new leg the player must budget a stage for), not a multiplier. Not needed for the two launch
    targets (both reqDv-shaped) but keep the helper shape-agnostic so it's ready.

**The two retrofits (real content, prove it's fun).**
  - **Crewed Orbit** → `inclination: 65` (Vostok 1 actually flew ~65°). 65 > 28.4, so this is the FREE
    direction — costs nothing, but it's the teaching case: the mission detail can note "65° — reachable
    directly from the Cape" so the first time a player meets inclination it's a gentle, no-penalty intro.
  - **Comsat Block Buy** (the procedural contract whose name has meant nothing) → `inclination: 0`
    (equatorial GEO belt). 0 < 28.4, so it levies a real ~1800 m/s plane-change surcharge — the contract
    finally *earns its name*, and its payout may want a small bump to stay worth flying (balance call at
    build time, not now).

**Ground track (#45) after this lands.** With a real `m.inclination` in hand, the Earth-globe popout's
`drawEarthOrbits()` — already a tagged `// SEAM — orbital infrastructure will render here` placeholder,
sitting on top of a real orthographic lat/lon projection (`P(lon,lat)`, same one that plots the Cape) —
can draw an actual sinusoidal ground track for the active/last mission's inclination. That becomes a
small follow-on slice, no longer blocked on inventing physics.

**Slice 1 — SHIPPED 2026-07-17 (mechanism only, zero missions changed).** `inclinationDv(m)` +
`effectiveReqDv(m)` + `LAUNCH_SITE_LAT=28.4` in sim.js. Every budget gate/display routed through the
accessor (canQueue, canLaunch + its shortfall message, missionAdvisor, launch checklist, the Δv readout
bar + a new inclination explainer flag, plannedRoute, mission-list detail strings). Classification checks
(`reqDv>=9000`) deliberately left on raw `m.reqDv`. `test-inclination.js` 16/16, including the identity
guarantee (effectiveReqDv===reqDv for every mission + procedural archetype — no number moves) and the
classification-not-reclassified guard. **Corrected magnitude:** the scoping estimate of "~1800 m/s for 0°
from the Cape" was miscalculated — the real figure is `2·7800·sin(28.4°/2) ≈ 3827 m/s`, a ~40% surcharge
on a 9400 baseline. That's physically correct (plane changes are brutal) but it's a strong balance signal
for slice 2: a full-equatorial Comsat from the Cape may be near-unflyable rather than merely taxed — the
retrofit should probably pick a less extreme target inclination (or the payout must rise a lot), a call to
make with real numbers at build time.

**Slice 2 — SHIPPED 2026-07-17.** crew_orbit `inclination:65` (free — teaching case). comsat
`inclination:0` equatorial (full ~3827 m/s tax; payout 8.4→14.9, ~77%, to offset). Both blurbs explain
the tradeoff. `test-inclination-missions.js` 8/8. Ground track (#45) now unblocked — separate slice.

**Two findings surfaced during slice 1 (logged, not fixed — out of scope):**
  1. **Latent `dockModuleNow` crash.** A module-delivery flight that resolves *after* its target facility
     has been decommissioned mid-cruise (the standing-resupply mechanic can remove an un-resupplied base
     over a long Mars cruise) throws `Cannot read properties of undefined (reading 'moduleList')` —
     `dockModuleNow`/`facilityModuleList` don't guard against the facility having vanished. Pre-existing;
     slice 1's RNG-timing shift just made `test-station-slice2`'s unseeded Mars e2e trip it more often.
     Fix candidate: `dockModuleNow` should no-op (and probably log/refund) if the target facility is gone.
  2. **Unseeded-RNG test fragility.** `test-station-slice2`'s Mars e2e advances 8 real months through
     random econ/logistics events with no seeded RNG, so its pass/fail depends on the global `Math.random`
     stream — any code change that shifts draw counts can flake it (pre-edit 5/5 pass, post-edit 4/5).
     The harness has no RNG seeding at all. Worth a small harness addition (seedable RNG) so time-advancing
     e2e tests are deterministic — would also have made finding #1 reproducible instead of intermittent.

## Session — #45 Ground track visualization (2026-07-17)

Backlog #45, unblocked by #114 (inclination physics). `groundTrackPasses(inclDeg, ascNodeLon, passes)`
in sim.js: standard argument-of-latitude parametrization for a circular orbit's ground path — 3 passes,
each drifting west by a flavor `LEO_PERIOD_MIN=90` approximation (altitude/period isn't modeled anywhere
else in this game, so this is illustrative, not orbit prediction). Drawn in `drawEarthGlobe` via the
existing `P(lon,lat)` projection — same one used for continents and the Cape marker — so it's correctly
aligned to the globe's current rotation. Solid track for the current pass (anchored at the Cape), dashed
and fading for the next two. Each point is tested front/back-facing so the arc breaks cleanly at the limb
instead of drawing through the globe.

Trigger: shown only when `missionById(state.activeMission)` has `.inclination` set — currently Crewed
Orbit and the Comsat contract, from #114. Nothing else changes; no mission carries this by default.
`earthPopInfoHTML` gets a matching dynamic caption (mission name + inclination) when applicable, silent
otherwise.

`tests/test-ground-track.js` 12/12 — math (max\|lat\|==inclination, equatorial flat, westward drift,
longitude normalization), caption presence/absence, `drawEarthGlobe` no-throw across all 3 cases via the
harness's fake canvas context. Full 64-suite regression + `build.js --check` clean.

**Not done:** this is a real-browser-owed item like the last few visual slices — verified headlessly
(math + no-throw), not eyeballed for legibility/aesthetics at actual popout size.

## Session — Launch azimuth ceiling / dogleg tax (2026-07-17)

Symmetric extension of #114, prompted by a "what else is missing for realism" survey. `inclinationDv`
generalized from a one-sided floor (≥28.4° free) to a band: `[LAUNCH_SITE_LAT=28.4°,
LAUNCH_SITE_MAX_DIRECT_INCL=57°]` is free; outside either edge costs the same `2·v·sin(Δi/2)`
formula, measured from whichever edge was crossed. Real physics: a coastal site's launch azimuth is
range-safety-limited (can't send an ascent trajectory over populated land), which is exactly why real
polar/sun-synchronous missions fly from Vandenberg AFB, not the Cape.

**Correction to previously-shipped content.** crew_orbit's 65° (Vostok 1's real inclination) exceeds the
new 57° ceiling, so it's no longer free — it now pays a ~1088 m/s dogleg tax. This is actually *more*
accurate: Vostok flew from Baikonur, a higher-latitude site with a far more permissive over-land range
than a Florida-analog coast, so 65° was never realistically "free from the Cape" in the first place —
the earlier slice's teaching-case framing was a simplification this closes. Payout raised 30.0→35.0 to
compensate; blurb updated to state the dogleg honestly. Comsat (0°, well below the floor) is unaffected.

Test suites updated in place rather than left stale: the now-false "65° is free" assertions replaced with
a genuinely-free 45° case, new symmetric ceiling/dogleg tests added (polar 90°, monotonicity, floor/ceiling
formula symmetry), and the MISSIONS identity loop now excludes intentional inclination opt-ins — same
treatment already used for procedural archetypes. Full regression clean; `test-station-slice2`'s known
pre-existing RNG flake (logged in the #114 slice-1 entry above) reconfirmed via 5 extra runs, not a new
regression.

## Session — Physics realism #2: one-way communication light-lag (2026-07-17)

`lightLagMinutes(bodyId, farthest)` in sim.js — static distance-from-Sun (AU) table, Earth-to-body
distance approximated as closest-opposition/farthest-conjunction range (no live ephemeris exists
anywhere in this game). Moons share their parent planet's AU. Verified against real published figures:
Moon ~1.3s, Mars ~4-24min, Jupiter ~35-52min — all match. Surfaced as a "Signal delay (one-way)" metric
on the body card (Map tab, via `lightLagHTML`/`fmtLag`), present for every body except Earth. Display-only
— pure sim texture, same category as #45. `tests/test-light-lag.js` 22/22. Full regression clean.

Sets up #3 (solar conjunction blackout) well — the same BODY_AU table is the natural source for "this
body just passed behind the Sun" logic.

## Session — Physics realism #3: solar conjunction blackout (2026-07-17)

`synodicDays(bodyId)` in sim.js: orbital period via Kepler's third law (reusing the BODY_AU table from
light-lag), synodic period from that. Cross-checked against reality twice: Mars comes out to 783 days,
matching the game's own pre-existing `SYNODIC_MONTHS=26` constant almost exactly; Jupiter ~399 days
matches the real ~13-month figure. `nextConjunction(bodyId)` anchors conjunctions to the synodic-period
midpoint from a fixed epoch (a flavor simplification, not synchronized ephemeris) with a flat ~20-day
blackout window (Mars' real ballpark) applied to every body.

Body card: a warning flag during an active blackout, a "next conjunction" metric otherwise. Display-only.
`tests/test-solar-conjunction.js` 19/19, using a monkey-patched `absDay` for deterministic day-of-cycle
testing rather than real time. Full regression clean.

Physics-realism survey (from the #45 ground-track conversation) is now 3/3 tractable items done:
azimuth ceiling, light-lag, solar conjunction. Remaining: orbital decay/station-keeping (not started),
Lagrange-point missions (recommended to stay flavor-only).

## Session — Orbital decay/station-keeping: correction, not a new feature (2026-07-17)

Item #4 from the physics-realism survey. Investigated before building and found it already existed: a
mature facility condition/maintenance-decay system (`STATION_MAINT_DECAY_BASE`/`PER_MODULE`,
`stationCondition()`, Repair action, resupply contracts). Building a parallel decay mechanic would have
duplicated it — caught before writing any of that code.

The one real gap: the UI never said *why* condition decays, reading as generic wear for all three
facilities alike. Added `FACILITY_DEFS.decayReason` and surfaced it in the Condition metric: `leo_station`
now honestly reads as real orbital decay (atmospheric drag, ISS-reboost-equivalent) since it's the one
facility that actually orbits something; the surface bases get their own non-orbital reasons. Data +
display only. `tests/test-facility-decay-flavor.js` 5/5.

Physics-realism survey closed out: azimuth ceiling, light-lag, solar conjunction all shipped as new
mechanics; orbital decay turned out to be a documentation fix, not new work. Lagrange-point missions
remain recommended flavor-only (not pursued).

## Planned — Fleet Registry: unified all-asset status board (scoped 2026-07-17, not built)

User request: one place showing the current status of every ship, satellite, base and station — location,
Δv, time-to-destination, consumables, as much detail as possible — with each object expandable so the
top level stays scannable and detail is on demand. New backlog item (#115).

### What already exists (this is a consolidation, not a green field)
The game already has THREE partial asset surfaces, none complete, none unified:
- **Outliner** (render.js `outlinerItems`/`renderOutliner`): a top-8 ETA-sorted strip mixing in-flight
  missions, research, builds, deadlines, crises. Flow-oriented (what needs attention soonest), not a
  roster. Truncates at 8. Already surfaces in-flight cruise %, ETA, crew count.
- **Flights modal** (`flightsPanelHTML`/`showFlightsModal`): in-flight missions + logistics only, with
  progress %, ETA, reliability, tightest Δv margin, provisions-aboard (logistics), and a recall/abort
  button. This is the closest existing precedent and the richest per-object detail today.
- **Empire strip** (`empireStripHTML`) + **map asset model** (`mapAssetModel`): chips/markers for depot
  tonnage, belt claim, tracking stations, facilities — a glanceable summary, no detail, no per-object drill.

The registry is essentially: **take the union of these, make every row expandable, and add the asset
classes none of them currently list as first-class objects.**

### The honest data-availability finding (shapes the whole feature)
The request lists "satellites" as a tracked object class. **They are not tracked as discrete objects.**
Satellite work exists only as (a) one-shot missions that complete into `state.completed`, and (b) standing
passive contracts (`svc_orbit`, `sat_weather`, `mil_recon` — `state.passiveContracts`) modeled as monthly
income streams with a term, NOT as orbital objects with a location or consumables. So a satellite row can
honestly show: contract name, monthly income, months remaining, era. It CANNOT honestly show location /
Δv / consumables — there is no such state, and fabricating it would be fake telemetry, the opposite of what
this feature is for. Two options for the build decision, flagged not resolved:
  - **(A) Represent what exists** — satellites appear as "standing operations" with contract/income/term
    detail, explicitly a different card type from vehicles. Honest, smaller, ships now.
  - **(B) Promote satellites to real persistent objects first** — a genuine new mechanic (deployed-sat
    state with orbit params, degradation, maybe servicing tie-in to `onorbit_servicing`). Much larger,
    arguably its own epic; the registry would then get real per-sat telemetry. Recommend (A) for the
    registry itself and filing (B) as a separate future item, so the registry isn't blocked on an epic.

### Asset classes the registry CAN surface truthfully (with real state behind each)
1. **In-flight vehicles** (`state.activeFlights`, deferred): name, phase (cruise), progress %, ETA (days
   → `outlinerEtaText`), crew count, reliability + tightest Δv margin (`marginSnapshot`), and for deep
   flights the reserve margin (`deepReserveMargin`) — that's the closest thing to a live "consumables"
   readout the sim has. Expand → full leg-by-leg profile, abort/recall action (already exists), light-lag
   to its destination body (from the just-shipped `lightLagMinutes`), conjunction-blackout status.
2. **In-flight logistics/resupply** (`state.activeFlights`, `kind:'logistics'`): destination facility,
   progress %, ETA, months-of-provisions aboard. Expand → which facility it's replenishing + that
   facility's current supply state.
3. **Bases & stations** (`state.facilities`): body, module count, condition % + decay reason (both just
   shipped), income/fuel/sci output, crew assigned vs required, supply-months remaining, resupply-contract
   status, power balance. This is the RICHEST existing per-object data — the station detail panel
   (`renderStationFacilityStats`) already computes all of it; the registry row's expand can reuse it.
4. **LEO propellant depot** (`state.depot`): tonnage held, monthly holding cost, boil-off note.
5. **Science program / space telescope** (`state.scienceProgram`): health %, months remaining, monthly
   science drip. Already a tracked object with a health stat.
6. **Standing operations / passive contracts** (`state.passiveContracts`) — the "satellites" per option (A):
   name, income, term remaining.
7. (Consider) **Astronaut roster** (`state.people`) — who is where: aboard which in-flight mission
   (`isCrewDeployed`), assigned to which station, or available. Arguably belongs; could bloat the board.
   Flag as an optional expand-section or a separate tab within the registry.

### Structure recommendation
A full-screen/modal board (like the vehicle bench pop-outs), NOT a cramped sidebar — the ask is explicitly
"too much for one place, so make it expandable." Group by asset class with a section header + count badge
per group (In flight · Facilities · Depot · Programs · Standing ops). Each row: icon, name, one-line
status (the single most decision-relevant stat for that class), and a chevron. Expand-in-place (accordion)
— not a nested modal — so multiple can be open and it stays one scannable surface. Reuse existing detail
renderers wherever they exist (`flightsPanelHTML` per-row body, `renderStationFacilityStats`) rather than
re-deriving. A single `assetRegistry()` collector in sim.js returns a normalized list
`[{class, id, icon, name, statusLine, detail()}]`; render.js just lays it out — keeps it testable headless
(collector correctness) independent of the DOM.

### Rough slice plan
- **Slice 1:** `assetRegistry()` collector + the accordion shell, covering the classes with existing rich
  state (in-flight vehicles, logistics, facilities, depot, telescope). Headless-testable: assert the
  collector returns the right objects with the right status lines across a seeded game state. No new
  mechanics.
- **Slice 2:** standing-ops/satellites (option A) + optional astronaut-roster section; polish (sorting,
  empty states, a launch-point from the Outliner's existing "in flight" header).
- **Later / separate:** option (B) persistent satellite objects, if wanted — not part of this feature.

### Model-tier notes
Slice 1 collector is mostly mechanical aggregation of existing state (lighter model fine), BUT the
information-architecture call — which single stat is the "status line" per class, what's top-level vs
expand — is real design judgment; worth a heavier model or a review pass on that specific decision. Slice 2
is lighter. The (A)-vs-(B) satellite call is a genuine design decision to settle with the user before
slice 2.

## Session — #115 Fleet Registry slice 1 (2026-07-17)

Shipped the collector + board. `assetRegistryGroups()` (sim.js) is a DOM-free normalized list grouped by
class — in-flight vehicles, logistics, bases/stations, LEO depot, standing programs — each item carrying a
one-line status + a detail map. The information-architecture call landed as: each class's status line is
its single most decision-relevant stat, and for facilities that means dynamically surfacing whichever of
supply/condition/crew is *most at risk* rather than a fixed field (a healthy base shows its output
summary instead). In-flight detail reuses the light-lag/conjunction helpers from the physics-realism work.
render.js adds an accordion board (`showFleetRegistry`) reached from a new Outliner-header "registry"
button; rows expand in place, multiple can stay open. `tests/test-fleet-registry.js` 26/26. Full regression
clean.

**Slice 2 — NOT STARTED.** Standing-ops/"satellites" (the (A)-vs-(B) design call still needs settling with
the user — (A) show passive contracts as standing operations, honest and small; (B) build persistent
satellite objects first, an epic) + the optional astronaut-roster section. Polish: sorting, section
collapse, maybe a keyboard shortcut. No real-browser pass yet on the board's feel/legibility — the usual
headless caveat.

## Session — #115 Fleet Registry slice 2 (2026-07-17)

Standing operations + astronaut roster added to the collector. Standing ops surfaces `state.passiveContracts`
per the chosen **option A** — name/income/term/category with a near-expiry marker, satellites getting the
sat icon — and deliberately shows NO location/Δv/consumables, since none exists for a passive contract and
fabricating it would be exactly the fake telemetry the feature exists to avoid. Astronaut corps resolves
each crew member's real position (in flight → names the mission, on station → names the facility, or
available) plus flights flown and career radiation dose. Render layer needed no changes — slice 1's
accordion renders any collector group generically. `test-fleet-registry.js` → 41/41. Full regression clean.

**#115 feature-complete (option A).** Option B — promoting satellites to persistent objects with real orbit
params/degradation/servicing — is filed as backlog #116, its own epic, not blocking anything. No real-browser
pass on the board yet (usual headless caveat).


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


## Session — E4.0 shipped: harness seedable RNG (2026-07-18)

Added `seedRNG(seed)` / `restoreRNG()` to `tests/harness.js`: a small mulberry32 PRNG
that monkeypatches the global `Math.random`. The game calls `Math.random()` directly at
~117 sites across sim.js/flight.js/data.js/render.js/shell.js with no threaded rng
parameter and no captured local reference anywhere in src/ — so a global monkeypatch is
the only way to get determinism without touching game source, and it correctly reaches
every call site. Opt-in per suite: a test that never calls `seedRNG()` sees native,
unseeded `Math.random` exactly as before — zero behavior change for the other 68 suites.

Fixed the flaky `test-station-slice2.js` Mars e2e block flagged in the 2026-07-17 log
(its 8-month `advance()` loop rides random econ/logistics rolls with no RNG control).
Reproduced the flake locally first — 3/8 passing across 8 unseeded runs — then verified
`seedRNG(1)` gives 10/10 passing, deterministic runs. Does NOT fix the underlying
`dockModuleNow`-vs-decommissioned-facility crash the flake occasionally exposed; that
stays logged separately as its own out-of-scope finding. Seeding only makes which random
draws happen reproducible, so a draw-dependent bug now either always reproduces at a
given seed or never does, instead of intermittently.

Documented in `tests/README.md` (new "Determinism" section). Full regression: 69/69 real
suites green (`test-build-parity.js` excluded — a pre-existing `/tmp`-relative
`require('../build.js')` path issue, reproduced identically against an unmodified build
in a properly-rooted checkout; unrelated to this change, not fixed here).

**E4.1 + E4.2 + E4.3 (code-complete, MAP3D flag OFF pending browser playtest) shipped 2026-07-18 (below). E4.4 (persistent ship identity + save migration) is next up — heavy design → Sonnet wiring.**


## Session — E4.1 shipped: real Keplerian ephemeris (2026-07-18)

Replaced the fake launch-window model (fixed ~780-day spacing + random jitter + **random**
window quality, tied to nothing physical) with real on-rails orbital mechanics. Commit
`fb8fe0f`.

**Physics.** New `ORBITAL_ELEMENTS` map (real J2000 mean elements a/e/lop/L0 for the 9
planets + Ceres) drives `planetHelio(bodyId, absD)` → heliocentric {theta, r} via a Newton
`solveKepler`. Windows now open at the true Earth→target Hohmann phase geometry
(`hohmannPhaseLead` derives the ~44° lead from the semi-major axes, not hardcoded), and
window **quality comes from where the eccentric-orbit target actually is at the encounter**
— perihelic opposition favorable (~1.15), aphelic marginal (~0.85). That's the real reason
Mars windows differ across the ~15-year great-opposition cycle, and it maps exactly onto the
existing quality→payout multiplier, which now rides on physics instead of `Math.random`.

**Time base.** Kept in the game's own 360-day-year unit (no dual calendar) with each planet's
period scaled from the real orbital ratio (Kepler's 3rd law, T = 360·a^1.5). Earth = 360
game-days, Mars ≈ 677; the Earth–Mars synodic period **falls out to ~769 game-days**, matching
the old hand-tuned 26-month (780) constant as a derived sanity check rather than an assertion.
Sample generated windows: first ~14 months out, ~26-month spacing, quality swinging
1.14→0.85→1.15 over ~15 years — the real opposition cycle, now a genuine "launch now vs wait
two years for a much better window" decision.

**Shared foundation.** `planetHelio` gives every planet a real heliocentric position(absDay) —
exactly what the E4.3 3D solar-system view will render — so A1 is infrastructure for both the
deeper-orbital-mechanics track and the 3D viewport, not just window math.

**API/consumers.** `windowsFor` now delegates to `computeWindows` but keeps the identical
`{abs, quality}` shape and ~4-upcoming-windows count, so `nextWindowFor` / `missionPlan` /
`bodyPlan` / `commitWindow` are all unchanged. Non-window missions completely untouched (the
identity-style guarantee for the set that shouldn't move).

**Save.** SAVE_VERSION 56→57. `state.windows` is a regenerable cache; `migrateEphemerisWindows`
clears it on pre-v57 load so windows regenerate from the new geometry. `committedWindow` (a
concrete date the player already chose) is preserved. No new persisted fields.

**Two-model coexistence (deliberate).** The July-17 conjunction feature's `BODY_AU` +
`synodicDays` (a real-DAY light-lag/conjunction "flavor" model covering all bodies incl.
moons/Pluto/Oort, epoch = opposition-for-all) is kept **separate** from `ORBITAL_ELEMENTS`
(precise, eccentric, game-day periods, planets only). Unifying now would move the shipped
conjunction blackout dates. **Unification target is E4.3**, when the 3D scene needs real
positions for every body (moons included) and `BODY_AU` can fold into an extended
`ORBITAL_ELEMENTS`. A coexistence note is in the code at `BODY_AU`.

**Tests.** New `test-ephemeris.js` (54 checks): Kepler round-trips, periods from a^1.5, the
~769-day synodic period, position periodicity + peri/aphelion bounds, textbook Hohmann transfer
time (~255 game-days) & phase lead (~44°), phase-geometry windows, quality varying across the
opposition cycle, determinism (Math.random fully removed from window gen), and every consumer +
non-window mission intact. `test-solar-conjunction.js`: dropped the reference to the removed
`SYNODIC_MONTHS` constant, now cross-checks the real ~780-day figure directly.

**test-station-slice2.js flakiness — root-caused and fixed durably.** E4.1's change perturbed
this pre-existing flake (logged 2026-07-17, only partially tamed by E4.0). Diagnosed the real
cause: on some RNG streams a random decision-modal event during the 8-month Mars cruise leaves a
`_pending*` flag set, which gates `pumpFlightArrivals` (a legit production safety — don't resolve
an arrival mid-decision), so the flight never resolved (observed unresolved at absDay 240 >
arriveAbs 210). Also found E4.0 had seeded only the advance loop, leaving `newGame` setup on the
unseeded stream. Durable fix (not a magic seed): seed the whole e2e block, clear the dangling
`_pending*` flags before `pumpFlightArrivals`, and keep the facility provisioned as a second
confound guard. Now **28/28 across 12 seeds and deterministic** across repeated runs.

Full regression: **69/69 real suites green** (`test-build-parity.js` excluded — pre-existing
`/tmp`-path env issue). Documented in `tests/README.md`.

**E4.2 shipped 2026-07-18 (below).** Note: E4.3+ (the actual 3D scene) is not headless-testable in this sandbox (no browser), same constraint as BENCH_V2 — those will need real-browser playtests.


## Session — E4.2 shipped: Three.js CDN plumbing + ESM→global shim + guard (2026-07-18)

Pure plumbing per MIGRATION.md §6 — no behavior change yet. Commit `4745827`.

Added Three.js the same way Phaser is added: a single pinned jsDelivr tag in `src/shell.html`,
placed right after the Phaser tag and before `<!-- OV:SCRIPTS -->`. No single-file bloat, no
build change. Because modern Three.js is ESM-only (the UMD global build was dropped ~r160), it
loads via a tiny module shim that stashes it on `window.THREE` for the game's classic-script /
global scope — current Three.js without making any of the game's onclick handlers modular.

- **Version pin (resolved MIGRATION §9 open-item #1):** `three@0.185.1` (current npm `latest`;
  ESM entry `build/three.module.js` verified against the package's declared `exports["."]` before
  pinning). URL: `https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js`.
- **Dynamic import + catch** (rather than the static `import * as THREE` in the MIGRATION example)
  so a CDN/offline failure is a quiet `console.warn`, not an uncaught module error — `window.THREE`
  simply stays undefined and the guard reports absent. Directly delivers the "treat not-loaded as
  absent, degrade to 2D" requirement.
- **Guard:** `threeOK()` in `render.js`, placed next to `phaserOK()`, mirrors it exactly:
  `typeof THREE!=='undefined' && !!THREE.Scene`. Every future Three.js call site (E4.3+) gates on
  it and falls back to the existing 2D Solar System view. The shim is async (module scripts defer),
  so THREE may be absent at first paint — the guard treats "not loaded yet" identically to "absent",
  and the 3D tab will initialize on first open, not at boot.

The 2D Solar System map is untouched and retained as the permanent fallback.

**Tests:** new `test-three-guard.js` (9 checks) — `threeOK()` false when THREE absent (the headless
harness / CDN-down / pre-deferred-load case), false when THREE exists but lacks `Scene` (partial or
failed load), true when a real-shaped THREE is present, never throws, matches the `phaserOK()`
convention, and the game boots + renders with THREE absent (3D is optional, not required). The shim
itself isn't Node-testable; this covers the guard every call site will gate on. Reverified the build
parity invariant (release inline `<script>` == `build/game.js`) after the shell.html edit — the awk
extraction only captures the exact `<script>`/`</script>` OV block, not the module shim or the
one-line CDN tags.

Full regression: **70/70 real suites green** (build-parity excluded — pre-existing /tmp-path env
issue). Documented in `tests/README.md`.

**E4.3 shipped 2026-07-18 as two slices — E4.3.0 (scene math, fully tested) + E4.3.1 (Three.js shell, flag MAP3D OFF, browser-pending). See below.**
heavy design.** First not-headless-testable step (no browser in the sandbox), same discipline as
BENCH_V2: the scene-graph math (positions, camera transforms) is unit-testable, but visual
correctness and the default-on flip will need a real-browser playtest pass from Shamus.


## Session — E4.3 shipped: 3D solar-system scene + camera (2026-07-18)

Built as two slices, mirroring the E3/BENCH_V2 discipline: the headless-testable math first, then the
Three.js rendering shell behind an OFF flag. Commits `41815db` (E4.3.0) + `46b1d40` (E4.3.1).

**Why it matters beyond eye-candy:** the *current* 2D solar map fakes both the planet angles and the
orbital motion (arbitrary `speed = 0.05/√r` from made-up start angles), and never consumed E4.1's real
`planetHelio`. The 3D view places every planet at its **true heliocentric angle**, so it actually shows
the Earth↔target geometry that drives launch windows.

### E4.3.0 — scene math (`41815db`, fully tested)
Pure geometry turning `planetHelio` into 3D scene coordinates. **Design: "real angles, schematic
radii".** ANGLE is truthful (scene angle == real heliocentric theta; the Earth→Mars scene separation
equals the real separation — window geometry preserved). RADIUS is compressed (real orbits span 0.39–30
AU, unrenderable to scale) via a documented power law `R = SCENE_AU_BASE·AU^SCENE_AU_EXP` (exp 0.6):
inner planets stay separated, Neptune ~74 units not ~300. Orbit rings are schematic circles (same
spirit as the 2D map's rings). New pure fns: `sceneRadiusFor`, `bodyScenePos` (ecliptic x–z plane,
y=0; moons resolve to parent + small offset), `orbitRingPoints`, `cameraTargetFor`, `orbitCameraEye`
(spherical→cartesian for the hand-rolled camera, elevation clamped inside the poles). `test-scene-math.js`,
36 checks.

### E4.3.1 — Three.js rendering shell (`46b1d40`, flag MAP3D OFF, browser-pending)
`startMap3D()` is `threeOK()`-guarded and, when `MAP3D` is on, becomes the top-priority renderer in
`renderMap()` ahead of the existing Phaser 2D → SVG chain; on any absence/failure it disposes and falls
through, so it can never break the game. Builds Sun + point/ambient light, planet spheres, schematic
orbit-ring lines, starfield; a **hand-rolled orbit camera** (drag = rotate az/el, wheel = zoom within
clamps, click = raycast → `selectBody`, chosen over importing OrbitControls to keep the shim to one
import); and a render loop that repositions every planet each frame from `bodyScenePos(id, absDay())`
— truthful, not the 2D map's fake spin. `pauseMap3D()` tears the loop down on tab switch. Pure helpers
`hexToNum` / `planetMeshRadius` factored out and tested. `test-map3d-shell.js`, 17 checks.

**CRITICAL STATUS — MAP3D stays OFF by default.** Like BENCH_V2, the entire Three.js shell was built and
tested *headlessly only* — the sandbox has no browser/WebGL, so the scene has never actually rendered.
The math is fully unit-tested; the rendering, camera feel, and picking are not. **Flipping `MAP3D=true`
as the shipped default should follow a real-browser playtest**, not ride in on a code session. Playtest
checklist is in the E4.3.1 code comment (scene renders + no console errors; camera drag/zoom/click-focus;
positions track the body card as months advance; forced-fallback verified; no leaked canvas or runaway
rAF across tab switches).

Full regression: **72/72 real suites green** (build-parity excluded — pre-existing /tmp-path env issue);
release-inline `<script>` == `build/game.js` parity reverified after the render.js edits.

**E4.4 (persistent ship/hull identity + flight history + reuse count, save-versioned & additive, reusing
the Fleet Registry #115 collector shape) is next up — heavy design → Sonnet wiring. Headless-testable
(no renderer), so it's back to fully-verifiable ground after the browser-pending E4.3 shell.**


## Session — MAP3D flipped default-ON; Cape 3D work landed outside this log; flight trajectory rework (2026-07-18 → 2026-07-19)

*This entry is a catch-up append: several commits shipped to `main` without ROADMAP entries. Nothing
above this line has been altered — some "next up" statements above are now stale; this entry is the
current status.*

### MAP3D default-ON (`dd55e30`, 2026-07-18)
At the repo owner's request (private single-user repo), `MAP3D` was flipped to `true` so the E4.3 3D
solar-system view could be playtested in a real browser. Safe to default-on because the shell degrades
three ways (threeOK() gate, try/catch in startMap3D, try/catch → 2D fallback in the render loop). The
`test-map3d-shell.js` flag assertion was updated; safety/fallback checks retained.

### Cape 3D epic — landed on `main` outside this log (commits `2ec3ef1`, `d9d1f43`, `07c3da2`)
Three commits were authored directly against the repo (per `AGENTS.md`, via a separate GPT-5.6-based
agent toolchain — not the sessions writing this log). For the record, they shipped:
- **`2ec3ef1` — photographic textures + Cape 3D design.** `assets/` added (10 planet-texture JPGs, 2
  Cape albedo PNGs, `CREDITS.md`); `build.js` now base64-inlines assets into both HTMLs (release grew
  ~1.6MB → ~18MB; build gracefully skips missing assets so texture-less forks still build).
  `docs/cape-3d-architecture.md` (full design: replace the Command Center Cape's Canvas/Phaser
  presentation with a Three.js site scene — one scene/renderer, two mounts, projected DOM hotspot
  anchors). New `CAPE3D` flag + foundation (`capeWorldPoint`, `capeFacilityDescriptors`,
  `cape3dCameraEye`), `test-cape3d-foundation.js`.
- **`d9d1f43` — 3D Cape flight sequence.** `docs/cape-3d-launch-orbit-scope.md` (pad → ignition →
  ascent → high-atmosphere handoff → orbit → result; 3D is a renderer over the authoritative sim, never
  a second flight model). `FLIGHT3D` flag + presentation adapter (`flight3dPhaseAt`,
  `flight3dPresentationSnapshot`), launch/orbit/reentry presentations, decision + readout overlays,
  fallback handoff. `test-flight3d-foundation.js`.
- **`07c3da2` — launch presentation refinements.**

Both `CAPE3D` and `FLIGHT3D` shipped enabled. These slices are browser-verified by the owner directly
(the sandbox writing this log has no browser). ROADMAP entries for future Cape-3D work may continue to
land outside this log; treat the commit history as authoritative for that workstream.

### Flight trajectory rework (`e90d7e6`, 2026-07-19) — owner-requested realism pass
Replaced `cape3dLaunchProfile`'s three independent curves (altitude `p^1.62`, downrange, pitch — which
could and did disagree, so the nose visibly didn't match the motion) with **one integrated gravity-turn
trajectory**: a pitch program (vertical until the tower is cleared at ~5.5% of ascent, then a smoothstep
ramp — imperceptible turn onset, very gradual pitch-over; γmax 87° orbital / 16–36° suborbital scaling
with energy) and a speed program (`v = .035 + .965·p^1.7` — a TWR≈1.2 crawl off the pad, ~25× faster by
MECO), integrated as d·alt = v·cosγ, d·downrange = v·sinγ (96 steps, memoized per flight class). The
nose equals the velocity direction **by construction** (zero-angle-of-attack), and the orbital altitude
curve becomes the correct S-shape automatically — the old model was steepest at the END; now the climb
rate dies at insertion while downrange accelerates: horizontal flight into orbit at 87°, MECO exactly at
the 185 km target.

Suborbital coast is now a real unpowered ballistic arc, continuous with burnout in altitude/downrange/
nose: apogee at 42% of the coast (normalized to ~1.12× targetAltitudeKm so readouts stay in the shipped
range; burnout at ~53% of apogee — textbook sounding-rocket proportions), **horizontal at apogee, arcing
over nose-down, reaching the water exactly at coast end** (new `splash` flag). Fixed en route: the old
code kept the engine burning through the entire ballistic coast (plume/smoke now die at burnout); smoke
is now dense-atmosphere-only (fades by ~13 km); vacuum shading is altitude-based (fixes the old bug
where a 70 m first hop got vacuum plume effects at 73% progress); suborbital sky blend (`launchSpace`)
is altitude-driven instead of a fixed .12. The metre-scale first-hop branch is preserved verbatim.
Return shape kept (+ `flightPathRad`/`apogeeKm`/`splash` added).

Tests: new `test-flight3d-trajectory.js` (31 checks — slow-then-fast, vertical rise, gradual monotone
turn ≤3.2°/2%-of-ascent, nose-tracks-velocity <2.5° worst error, orbital S-curve + near-horizontal
insertion, coast continuity, apogee timing/band, arc-over, splash, downrange monotone, energy scaling,
engine-off coast, altitude-based effects, first-hop invariants, determinism). One
`test-flight3d-foundation.js` assertion encoding the old long-vertical shape was updated to the new
contract; all other assertions unchanged. Full regression at push time: **75/75 real suites green**
(build-parity excluded — pre-existing /tmp-path env issue); build byte-faithful including embedded
textures.

**Known follow-ups from the trajectory rework (browser feedback wanted):** camera framing vs. the much
larger realistic downrange travel (the pad now properly recedes; if the finite ground-plane edge shows
late in ascent, blend it out earlier); speed continuity across the burnout handoff (ascent and coast map
their own clocks — the cutoff reads as a pacing change, acceptable but tunable).

**E4.4 (persistent ship/hull identity) remains the next E4 workstream** — unchanged from the entry
above; the Cape-3D thread proceeds in parallel outside this log.


## Session — E4.4 confirmed shipped by Codex; E4.5 ship markers (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered.*

### E4.4 — persistent hull identity — confirmed already shipped (Codex, `075654d`)
Before starting E4.5 ("wires E4.4 registry entries onto the E4.3 scene"), checked whether E4.4
itself existed yet — it did, landed by Codex's "Refine physical launch vehicles and hull registry"
commit without a ROADMAP entry. `state.hulls[]`: serial-numbered (`OVH-####`) physical vehicles
with rollout/launch/loss/recovery/refurbishment lifecycle and a capped history log, wired through
`assignHullToHangar`/`markHullLaunched`/`settleHullFlight`, save-migrated (`migrateHulls`,
backfills a ready hangar hull without inventing prior flights, idempotent), and surfaced in the
Fleet Registry (#115). `test-hull-registry.js` (9 checks) verified passing.

### E4.5 — ships as tracked 3D markers (`71671bc`)
An active (deferred/long-cruise) mission now gets a real 3D marker on the solar-system map, moving
along a genuine two-body transfer arc and tied to its physical hull's identity.

**`flightTargetBody(missionId)`** (`sim.js`) — a general mission→body lookup for markers, distinct
from `missionTargetBody` (which exists for window math and always falls back to Mars — wrong for a
marker: an Apollo mission should head to the Moon, not collapse to Mars). Returns `null` for unknown
missions or schematic non-point bodies (the Oort cloud) rather than defaulting anywhere.

**`flightScenePos(rec, absD)`** (`render.js`) — reuses `bodyScenePos` for BOTH endpoints (never
re-derives Earth/target position independently), so a marker's departure/arrival points are
pixel-identical to wherever the actual planet mesh sits on those exact days — including Codex's
eccentric/inclined orbits (Belt at 10.6°) and per-moon orbit model. Because endpoints can have y≠0,
the transfer is built in the real 3D plane through the Sun and both endpoints (orthonormal basis),
not assumed flat. Within that plane: the same Hohmann-shaped Kepler construction as the E4.1/ascent
work — endpoints ARE periapsis/apoapsis (exact by construction, e always <1 for positive radii),
half-orbit true-anomaly sweep reparametrized to land EXACTLY on both endpoints while following a
genuine Kepler radius/angle profile in between (fast near periapsis, slow near apoapsis), not a
linear interpolation. Verified numerically (endpoints match `bodyScenePos` to float precision) —
caught and fixed one real bug in the process: a double-division in the angle-between-vectors
formula that left radius correct but direction wrong, found by comparing computed vs. actual arrival
position rather than trusting the algebra alone.

**`activeShipMarkers(absD)`** — scans `state.activeFlights` for deferred flights with a renderable
target, joining in hull serial/family/reuse-count from the E4.4 registry; synchronous flights and
malformed records are silently skipped, never thrown on.

**Three.js shell** — a small emissive marker + label per active flight, reconciled every
`map3dTick` (create/update/remove as flights start and end), added to the existing `pickables`
array with a `ship:` `userData` prefix so the existing hover/pick handlers route to hull info
(serial, family, reuse count, cruise progress) instead of falling through to a `BODIES` lookup.
Uses `mapViewAbsDay()` so markers scrub consistently with the existing time-preview HUD.

**Also fixed, found via regression (unrelated to E4.5, pre-existing):** `map3dApplyCamera()` called
`orbitCameraEye`, which had been dropped from source in an earlier refactor (only
`cape3dCameraEye`, the Cape launch-site camera, remained) — the solar map's free-orbit camera was
throwing every frame and silently falling back to 2D (caught by `map3dRenderLoop`'s try/catch, so
it degraded quietly rather than crashing — but the 3D solar map has effectively not been renderable
since that refactor). Restored `orbitCameraEye` with its original symmetric ~±89° elevation clamp
— a "drag to orbit the solar system" camera needs full freedom, unlike `cape3dCameraEye`'s
ground-level `.18–1.25` clamp, which would have wrongly restricted it if reused instead.

Tests: new `test-flight-markers.js` (38 checks — target lookup per program, transfer-element
well-posedness, endpoint-exactness against `bodyScenePos` itself, monotonic radius growth,
before/after clamping, graceful nulls, and the marker query's filtering/hull-joining/safety).

Full regression at push time: 77 suites; only `test-flight3d-trajectory.js` still differs (Codex's
already-reviewed-and-accepted vehicle/hull refinement — noted, not touched, out of scope here).
Build byte-faithful.

**E4.6 (A2 orbital-element gameplay slices) is next up per the original E4 breakdown** — one
opt-in decision-bearing mechanic at a time, each with its own identity-guarantee test. *Heavy per
slice.*


## Session — E4.6 (A2 slice 1): depot rendezvous/phasing as a Δv cost (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered.*

Before scoping, checked MIGRATION.md's §9 open item #2 (A2 slice list) against what's actually
live: **"phase-angle window quality as a real decision" is already fully shipped** — the existing
`renderWindowPlanner()` UI lets the player commit to any of the ~4 offered windows, trading
soonest-vs-best (a real, live decision, not just E4.1's underlying physics). **Ground track (#45)
is also already shipped** (a separate thread — `groundTrackPasses`/`drawEarthGlobe`, tested in
`test-ground-track.js`). That left **rendezvous & phasing for reuse/refuel** as the one genuinely
open A2 candidate.

**The gap:** the LEO propellant depot (#7/M3b-ii) tops off a mission's transfer stage for free,
regardless of orbital plane — no rendezvous physics at all. Closed with `depotPhasingDv(m)`
(`sim.js`), reusing the exact `2·v·sin(Δi/2)` formula `inclinationDv` already established: a depot
can hand over propellant once you're alongside it, but can't pay for the plane-change burn your
own vehicle needs to get there.

`DEPOT_INCLINATION = LAUNCH_SITE_LAT` — no depot vehicle carries its own `.inclination` (Tanker Run
flights are unmodified/free-plane), so by the same "unset ⇒ default plane" convention
`inclinationDv` uses, the depot naturally forms at the launch site's latitude (28.4°).

`depotPhasingDv(m)` is zero unless **both**: the mission is `.profile`-shaped (the only category
the depot benefits at all — a flat-reqDv mission like `crew_orbit`, which already carries
`.inclination:65` for the *unrelated* launch-azimuth tax, is correctly zero here since the depot
mechanic doesn't apply to it at all), **and** `state.depotUse>0` this flight — unlike
`inclinationDv` (a static, always-on per-mission surcharge), this is a *dynamic* cost: it only
exists when the player actively chooses to draw from the depot. Also unlike `inclinationDv`'s
floor/ceiling (free to steer higher via azimuth), there's no free band here — meeting a specific
existing depot plane costs a burn in either direction, so it's a plain symmetric mismatch cost.

Wired into `simulateMission`'s `'Ascent to LEO'` leg: when a mission draws from the depot with a
plane mismatch, the phasing cost is added to that leg's required Δv (the depot's mass top-off,
added to the transfer stage after this leg, is unchanged — only the vehicle's OWN Δv requirement to
reach the rendezvous grows). The leg carries a new `phasingDv` field (`undefined` when zero) for
display; `render.js`'s existing depot-note line grows a phasing explainer when it fires.

**Identity guarantee:** no mission today combines `.profile` with `.inclination`, so
`depotPhasingDv` is provably 0 for every mission in `MISSIONS`, regardless of `state.depotUse` —
mechanism-only, exactly like `inclinationDv`'s slice 1. No existing mission's numbers move, and
every real `.profile` mission's Ascent-to-LEO leg dv/pass output is unaffected by turning
`depotUse` on. A synthetic mission (constructed in the test, following the established
`test-inclination.js` pattern of not touching real content for a mechanism-only slice) proves the
leg-dv gate actually responds once both conditions hold.

Tests: new `test-depot-phasing.js` (17 checks — the `MISSIONS`-wide identity, per-mission
`simulateMission` leg-output identity, the formula's opt-in/symmetric/monotonic properties matching
the same ~3827 m/s magnitude the launch-site slice found for an equivalent angular offset, and the
synthetic integration case).

Full regression at push time: 78 suites; only `test-flight3d-trajectory.js` still differs
(Codex's already-reviewed-and-accepted vehicle/hull refinement — unrelated, not touched). Build
byte-faithful.

**Remaining A2 candidates for a future slice** (per MIGRATION §9): extending the inclination
mechanic into a fuller plane-management layer (the deferred #30 second-launch-site economics is
the natural home for this). No mission currently combines `.profile`+`.inclination` in the *real*
content, so a natural follow-on (mirroring the historical inclination Slice 1→Slice 2 pattern) is
retrofitting one real interplanetary mission with a non-Cape-matching inclination to make this
slice's mechanism *felt* rather than dormant — a deliberate balance call, not done here.


## Session — E4.7: visual multi-stage separation in the Cape 3D flight renderer (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered. Coordinated next task
from CLAUDE.md; built by Claude against main HEAD d273bee.*

The physical trajectory already burns and drops every stage's dry mass in `cape3dTrajectoryPlan`,
but the visual rocket was a single mesh. This slice splits it and detaches spent stages/boosters at
their real staging times, letting them coast and fall under gravity while the next stage ignites —
sim and outcome logic untouched.

**`cape3dTrajectoryPlan` now records `stageEvents[]`** — `{t, kind:'booster'|'stage', index,
altitudeKm, xKm, vx, vy}` captured at each real drop point during the burn integration it already
ran (a booster jettison when `boosterProp` hits zero; a spent-stage drop when `coreProp` hits zero
and it's not the last stage). These were previously computed and discarded; now they're the
authoritative separation schedule. The final stage never generates an event — it burns out rather
than separating.

**`cape3dSeparationStates(plan, time)`** — a pure, headless-testable function mapping the current
flight time to each event's state: `separated` (has time passed its `t`) and `fallTime` (seconds
since it let go, 0 until then). Touches no Three.js and no sim state.

**`cape3dVehicleMesh` restructured into per-stage sub-groups** — each `segs[i]` (a real
`physics.stages[i]`, same order, same source `state.stages`) is built into its own `THREE.Group` at
identity transform, so visual output is byte-identical but each stage can be reparented as a unit.
Boosters get their own sub-group (they separate distinctly, matching the plan's separate
`boosterAttached` tracking); the nose rides the top stage's group; engine bells and the flame stay
on the bottom stage. `userData.stageGroups` / `userData.boosterGroup` expose the pieces.
`cape3dResetStaging(rocket)` reattaches everything at identity before each flight — necessary
because the rocket mesh is built once (`buildCape3DScene`) and reused across launches, so a piece
dropped last flight would otherwise be missing this flight. Wired into both enter and exit.

**`cape3dUpdateLaunchPresentation` detach + fall** — when a piece's separation time passes, it's
reparented to the scene root via `root.attach()` (preserves world transform, so no jump across the
rocket's current pitch) with its captured separation position/velocity, then driven each frame under
honest free fall (`sep.y + sep.vy·t − ½·G0·t²`; the scene is 1:1 real metres, so `G0` applies
directly) plus a cosmetic tumble. Only the tumble is invented — the separation moment and the
piece's initial state are real sim values. Debris is culled 3000 m below the pad. Skipped on a
failure (the failure FX owns the whole vehicle) or when there are no events (single-stage). On a
core-stage separation the flame FX's nozzle offset moves up to the new bottom stage's base, so the
exhaust visibly re-ignites there instead of hanging in the dropped stage's empty space.

**Tests:** new `test-flight3d-staging.js` (29 checks) — single-stage produces no events; two-stage
produces exactly one `stage:0` event at the real burnout time with real position/velocity;
boosters+stages produce a booster event *before* the core-stage event with correct `fallTime`
ordering; three-stage drops exactly two stages in increasing time/index order; and
`cape3dSeparationStates` edge cases (null plan, missing `stageEvents`, pre-liftoff query,
non-numeric time — none throw). Also verifies `cape3dLaunchProfile` now exposes `t` (trajectory
time), which the detach logic keys off.

**NOT browser-verified — the honest gap.** This sandbox has no WebGL and the harness has no THREE
stub, so the mesh/reparent/fall path has never actually rendered; only the pure math is tested. A
real-browser playtest should confirm: pieces detach at the right moments and fall away without
popping, the flame re-anchors to the new bottom stage, boosters drop before the core stage, and a
second launch after a first (mesh reuse) still shows a complete rocket. Playtest checklist is in
CLAUDE.md.

**Regression at push time:** 79 suites. Three failing, all confirmed NOT caused by this work
(checked against a clean pre-edit pull): `test-flight3d-trajectory.js` (Codex's accepted
trajectory/vehicle-physics changes), and — newer — `test-decision-panel.js` + `test-pad-a.js`
(from Codex's "Refine command UI and flight reporting" commit; look like an intentional
post-failure hold/debrief screen, flagged in CLAUDE.md for intent confirmation). Build byte-faithful.


## Session — E4.7: deep (in-space) failures stay in the 3D renderer (2026-07-20)

*Pure append. Model tier: heavy (failure-visualization design + gate-loosening judgment).*

**Scoping finding (why this slice, and what it is NOT):** audited what still drops to the flat 2D
fallback in `updateFlight3DSession`. The gate kept `orbit` in 3D only for `isOrbital && success!==false`
and `reentry` only for `isOrbital && crewed && success!==false`. Investigating the renderers showed
the gates are *conservative, not protective* — `cape3dUpdateOrbitPresentation` /
`cape3dUpdateReentryPresentation` render from `phaseProgress` alone and read no `crewed`/`success`
flag. Two real gaps fell out: (a) a **deep in-space failure** (post-orbit strand/loss) cut to 2D at
the flight's climax; (b) a crewed **cislunar** mission gets **no reentry leg at all**
(`flightHasReentry` requires `isOrbital`), so its Earth return isn't animated. This slice does (a);
(b) is logged as the next candidate (it's new mission-leg content, not a gating fix).

**Shipped — deep-failure 3D stranding.** A `success===false` / `failPhase==='deep'` outcome now stays
in Three.js. Snapshot (`flight3dPresentationSnapshot`) emits `effects.deepFailure` /
`deepFailureFrac` (0.42, matching the 2D renderer's freeze point) / `deepFailureProgress`, armed only
for `orbit`/`transfer` phases once coasted past the freeze fraction, and passes `failPhase` through —
mirroring the existing `ascentFailure` pattern. `cape3dOrbitProfile` and `cape3dTransferProfile`
freeze `progress` at the loss fraction and cut `burn`/`arrival` when dead-stick, exposing `deadStick`
+ `failProgress`; both presentations tumble the craft dead-and-dark with a build driven by
`failProgress`, and the 3D readout shows `SPACECRAFT LOST`. The `updateFlight3DSession` gate was
loosened to keep `orbit` in 3D for a deep fail (`transfer` was already unconditionally in 3D but had
no failure visual). Sim/outcome untouched — presentation only; the outcome was resolved by the sim
before the animation opened.

Test: `tests/test-flight3d-deepfail.js` (26 checks — signal arms only for a deep fail past the freeze
fraction, never on success or an ascent fail; orbit + transfer freeze/dead-stick identically; a
successful flight runs full progress and still reaches arrival). NOT browser-verified (no WebGL in
sandbox) — the tumble should be eyeballed in a real failed-orbital-insertion flight.

Regression: 80 suites; the only failures are the three pre-existing Codex drifts
(`test-flight3d-trajectory.js`, `test-decision-panel.js`, `test-pad-a.js`), verified unchanged from
baseline (identical failing-check counts) — this slice added nothing to the failure set. Build
byte-faithful.
