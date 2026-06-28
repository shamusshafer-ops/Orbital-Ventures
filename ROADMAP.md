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
- [ ] **19 · Organizational scaling (departments)** *(P2)* — Grow personnel from named individuals into
      departments with leaders, career progression, training/specialization, succession/workforce planning.
      Builds on M6/#9/#5.
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
- [ ] **19 · Organizational scaling (departments)** *(P2)* — Scale individuals→departments with leaders, career progression, training, succession. Builds on M6/#9/#5.
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
- [ ] **31 · UI microanimations pass** *(review #11/#4)* — Counter tweens, tech-unlock glow, success pulse, objective sparkle, news ticker, rail-drawer slide animation.
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
