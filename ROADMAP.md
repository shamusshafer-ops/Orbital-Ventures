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
      colorblind icons) deliberately deferred, not started.**
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

**One finding surfaced during slice 1, still open (item 2 below); item 1 fixed 2026-07-28:**
  1. ~~**Latent `dockModuleNow` crash.**~~ **Fixed 2026-07-28** in the full-code refactor review —
     see the commit tagged `BEHAVIOR CHANGE: fix facility starvation penalty + dockModuleNow guard`.
     `dockModuleNow` now refuses a missing/unbuilt facility instead of throwing, logs the loss, and
     does not refund (the flight flew). Covered by `tests/test-facility-module-integrity.js`.
  2. **Unseeded-RNG test fragility.** `test-station-slice2`'s Mars e2e advances 8 real months through
     random econ/logistics events with no seeded RNG, so its pass/fail depends on the global `Math.random`
     stream — any code change that shifts draw counts can flake it (pre-edit 5/5 pass, post-edit 4/5).
     Filed as **`#118`** (see BACKLOG.md and the scoped block below) rather than fixed inline — reseeding
     `sim.js`'s 46 raw `Math.random()` calls shifts draw order for every gameplay roll, so it's a
     balance-affecting change, not a harness tweak.

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


## Design review — Solar Map utility pass, scoped (2026-07-25)

Owner feedback after the A/B/C epic above: scale doesn't read as "solar system," navigating doesn't
tell you where everything is or what's going on. Reviewed all three render paths (`map3d*`, Phaser
`MapScene`, SVG `renderMapOverview`) plus `bodyCardHTML` before proposing fixes. Not yet implemented —
this entry is the review + proposed slice order (D1–D4), for a future session to pick up.

**The big finding: the default view is the least-informed view.** `MAP3D=true`, so 3D is what's
actually seen day to day. But `mapAssetModel()` (facility pennants/health, ISRU, depot tonnage, belt
claim), `plannedRoute()`/`transferArc()` (planned + committed-window arcs), and rival-reach markers
are wired into the Phaser and SVG paths only (`src/render.js` ~L6420, ~L6473, ~L7366) — never into
`map3dTick()`/`map3dUpdateShipMarkers`. Everything the empire-overlay layer already tracks is
invisible in the renderer the player actually sees. Same shape as the A/B/C epic's Slice C finding
(a port, not new invention) — just the 3D direction this time instead of 2D.

**Why scale doesn't read as "solar system."** Nothing on screen states a distance. `SCENE_AU_BASE=18`
/ `SCENE_AU_EXP=0.74` compresses radially and planet meshes are exaggerated against their orbits by
necessity (a to-scale system is unplayable — Neptune at 30 AU, planets sub-pixel), and the only AU
figure anywhere is a single-body hover tooltip. Real scale can't be fixed by geometry here; it needs
annotation: AU tick labels on the orbit rings, a camera-distance-driven scale bar in the HUD, and a
light-time readout per body (`lightLagHTML()` already computes this for the body card — "Mars — 12.4
light-minutes" on the map itself would do more for scale-feel than any respacing).

**Why navigating loses the player.** Three compounding gaps: (1) no orientation frame — bare az/el/
dist camera, no ecliptic grid, no compass, no off-screen indicator for where Sun/Earth went after
zooming to an outer body; (2) no way to navigate to a body that isn't currently visible on screen —
selection is click-a-visible-mesh only, no roster/list; (3) label mush — `map3dLabelSprite` renders
all ~25 labels (8 planets + 14 moons + Sun) at fixed scale with `depthTest:false`, so moon names
clutter identically to planet names regardless of camera distance, no LOD falloff.

**One underused asset**: the `−1Y/−1M/Now/+1M/+1Y` time-scrubber HUD (`addMap3DTimeHud`) is the best
planning idea already on this screen and it's tucked in an 11px corner widget. `plan.nextWindow` is
already computed per body — a "jump to next window for selected body" control plus a live-updating
transfer arc while scrubbing would connect the map to the body card's own window math, which is
currently two disconnected surfaces telling the same story.

**Proposed slice order:**
- **D1** — Port `mapAssetModel()`/`plannedRoute()`/`transferArc()`/rival-reach markers into the 3D
  view (`map3dTick`/`map3dUpdateShipMarkers` sibling functions). Highest value, lowest risk, mostly
  reuse of existing pure functions — mechanical/wiring work.
- **D2** — Scale legibility: AU ring labels, HUD scale bar, per-body light-time readout on hover/HUD.
- **D3** — Orientation: ecliptic grid plane, off-screen direction chevrons for Sun/Earth, a body
  roster rail (reached/reachable/locked, click-to-focus), label LOD by camera distance.
- **D4** — Promote the time scrubber (jump-to-next-window per body, live transfer arc while previewing
  a date).

Not yet slice-planned in test-file/exact-function detail — that's the next session's job per slice,
same as the A/B/C epic above. D1 is wiring/mechanical (lighter model tier appropriate); D2–D4 are
design/balance work (heavier tier — visual legibility and information-density tradeoffs benefit from
more careful judgment).

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

### 1.2 — Near-miss attribution on successful flights [NOT STARTED]

`resolveFlight()` rolls every subsystem independently (`for(const s of rep.subsystems){ if(Math.random()
>s.rel) failed[s.key]=s; }`) and, on a clean success, sets `subsystem:null` and discards the roll data.
That data is exactly the material for the feedback the review found missing: the player never learns
which subsystem nearly killed them, so reliability investment never produces a felt moment.

- [ ] Capture, among surviving subsystems, the narrowest margin (`s.rel - roll`) and carry it on the
  outcome. Surface it in the post-flight log naming the subsystem and how close it came.
- [ ] **Near-miss-only, not every-success** (confirmed with Shamus 2026-08-04): fire only when the
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

### 1.3 — Third Chronicle scoring bookend at 2060 [NOT STARTED]

Scoring ceremonies currently fire at `SCORING_YEAR=1990` (campaign year 48 of 158) and
`SCORING_YEAR_2=2100` (year 158) — a 110-year stretch with no scored milestone, across what the review
identified as the campaign's weakest pacing zone. 2060 confirmed with Shamus; it aligns with the
Interplanetary era boundary (`ERAS`, `from:2060`).

- [ ] Mirror the existing `SCORING_YEAR_2`/`state.eraScored2` pattern exactly: a third constant, a
  third independent one-shot flag, a third `showChronicle()` mode string and heading.
- [ ] `SAVE_VERSION` bump with a lazy default, so a save already past 2060 does not retroactively fire
  the ceremony on load.

**Protected baseline — do not regress:** both existing bookends fire exactly once each, independently
of the new one; the `retire` mode and legacy-grade scoring are untouched.

**Suggested test:** the 2060 bookend fires once and only once; a save loaded already past 2060 does not
fire it; the 1990 and 2100 bookends still fire independently and once each.

**Explicitly out of scope for all of Tier 1:** anomaly *frequency* tuning; any change to the rocket
equation, reliability model, or outcome-selection math; new flight-overlay decision *types* beyond the
anomaly pool (the six existing hold points are sufficient); Tier 2's calendar/progression coupling.

Model tier: 1.1 is the bulk and is creative/balance judgment (scenario framing, resolve odds, gating
predicates) — heavier tier. 1.2's threshold and message wording want the heavier tier; its wiring is
mechanical. 1.3 is purely mechanical — lighter tier appropriate if taken alone.
