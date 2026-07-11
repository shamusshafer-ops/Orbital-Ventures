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
- [ ] **E0.3 Dirty-flag rendering** — `render()` currently rebuilds all regions from ~136
      call sites; move to `invalidate(region)` + per-region rebuild with a `renderAll()`
      escape hatch. Fixes focus/scroll loss in re-rendered panels, cuts time-warp GC
      churn, and is the prerequisite for simultaneous-mission ops density. Validate by
      diffing harness snapshots region-by-region.
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

- [~] **E1.1 Reactive rival race** — SHIPPED slice A 2026-07-11 (see session log above), 661/661,
      **not yet committed/pushed, needs a real-browser check**. Schedule variance + poaching were
      already live pre-session (CE1); slice A added contract snatching, budget hearings, and a
      failure→poach-heat link. Slice B (intel purchases) not started, low priority.
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
- [ ] **E1.5 Ops friction + trust** — pad turnaround per pad, "why can't I fly this?"
      explainer on disabled launch, post-flight failure report naming the causal chain
      (the ∏ phaseRel decomposition already computes it — show it), hover math
      breakdowns on derived numbers.
- [ ] **E1.6 Milestone spectacle** — newspaper front pages on firsts; sound pass
      (ambient bed, UI ticks, countdown voice, milestone stingers — WebAudio synthesis
      or small OGG set post-split).

### Workstream E2 — Medium (post-EA-gate)

Station assembly + resupply loop (hangs on the existing STATION_MODULES seam) · 3–4 more
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
