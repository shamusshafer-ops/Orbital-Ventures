# Orbital Ventures — Roadmap & Workflow

This document tracks where the build is and what's next. It's the living
companion to `orbital-ventures-design.md` (original full design doc) and
`orbital-ventures-systems-spec.md` (rocket-equation + life support deep dive).

## How we work

- **Single file**: `orbital-ventures.html` — vanilla HTML/CSS/JS, no build step.
- **Vertical slices**: each milestone is a small, playable increment, validated
  with a headless Node harness (extract `<script>`, syntax-check, exercise the
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

### Cross-Track Synergies (planned, not yet built)

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
- 🔲 **Cross-Track Synergies** *(from the 2026-06-26 review, Rec #5 — not yet built)* — add the `SYNERGIES` config + `synergyActive()`, fold effects into existing accumulators (caps still bound everything), ship 4 seed synergies. Surface Synergies strip in R&D tab + tooltip. No SAVE_VERSION bump. *Validation to author: each synergy activates only when all cross-track reqs met; effects fold into correct accumulators; caps still clamp with everything researched; no double-count.*

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
- [ ] **29 · Filtered Flight & Ops log timeline** *(review #12)* — Category filters (All/Launches/Research/Economy/Rivals/Crew/Infrastructure) + per-entry icons + collapsible timeline. *Log timeline strip shipped in top bar (see § Always-visible Ops Timeline); filters + collapse still open.*
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
