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
      Header badge ("Era N/8 · Name") always visible; R&D tab shows a full era
      progress card (current era blurb, year range, next-era countdown, and a
      strip of all 8 eras with past/current highlighting). Eras remain soft —
      no hard gating on research yet, by design (deferred to a later M4 slice
      if pulling-tech-forward penalties are wanted).
- [x] **M4b** — Rival "firsts": `RIVALS` array with 3 named, flavored rivals
      (Vostochny Dynamics — state agency, early/crewed-era firsts; Meridian
      Aerospace — legacy contractor, lunar/station-era firsts; Halcyon
      Systems — commercial newcomer, reusability/expansion-era firsts), each
      with a calendar-anchored timeline of milestones. `checkRivalFirsts()`
      runs every `advance()` tick and logs each first exactly once (tracked in
      `state.rivalFired`) to the Flight & Operations Log (new `rival` log
      kind, amber) and a new **Rivals** tab showing each rival's profile and
      claimed/pending/upcoming timeline. Informational only — no economy
      effect yet (that's M4c). Validated headlessly: 4 rival firsts correctly
      fire by 1970 with no duplicates.
- [x] **M4c** — Reputation/scoop effects on contracts: three rival firsts
      (First Satellite, First Crewed Orbital Flight, First Crewed Lunar
      Landing) are now linked via `missionId` to `first_sat`/`crew_orbit`/
      `luna_landing`. If a rival claims a linked first before the player
      completes that mission, the mission is marked `state.scooped[id]` and
      its first-time payout is cut to `SCOOP_PAYOUT_MULT` (60%) — rep reward
      is unaffected, since the player still proved capability. If the player
      completes the mission first, no penalty applies ("you got there first").
      Surfaced in Missions tab (scooped pill + adjusted payout preview) and
      Rivals tab (linked-mission pill showing scooped/beaten-rival status).
      Validated headlessly: scoop fires and cuts First Satellite payout from
      $18.0M to $10.8M; pre-emptive completion of Crewed Orbit correctly
      avoids the scoop.
- [x] **R&D rush** — Active research can now be accelerated for capital.
      `rushResearch()` shaves one month off `state.activeResearch.monthsLeft`
      per click, at a quadratically-scaling cost (`RUSH_BASE_COST ·
      (rushed+1)²`, i.e. $0.8M/$3.2M/$7.2M/$12.8M for the 1st–4th month
      rushed off a single project), floored at 1 month remaining. Surfaced as
      a "Rush −1 mo ($X)" button under the active project in the R&D tab.
      Validated headlessly across the cost curve and the floor/insufficient-
      funds edge cases.
- [x] **Build-time complexity** — Vehicle build time now scales with design
      complexity instead of a flat 2 months. `buildMonths(m)` = 2 (base, 1
      stage / no extra modules) + 1 per additional stage beyond the first, +1
      each for transfer stage / lander (descent+ascent) / crew systems when
      the mission profile requires them. This feeds the existing
      build+launch+test timeline (`buildMonths(m)+1+testMonths`) used for
      window-planner lead time, cash-on-hand checks, and `advance()` on
      launch. Build time is now shown as a metric in both the simple and
      profile readouts. Validated headlessly: a 1-stage no-module mission
      stays at 2 mo; a 2-stage Lunar Landing (transfer+lander+crew) is 6 mo.
- [x] **Flight animation rewrite** — Complete overhaul of the canvas-based
      mission playback. Ascent now features: multi-layer atmosphere transition
      (troposphere → stratosphere → space), realistic exhaust plumes with
      vacuum expansion and Mach diamonds, smoke/exhaust trail particles,
      max-Q dynamic pressure with throttle bucket, stage separation with
      tumbling debris and retro-fire sparks, fairing separation at ~100 km,
      camera shake during max-Q, and a full telemetry panel (T+, ALT, VEL,
      ACC, Q, DRANGE, THROTTLE%, STAGE). Orbit phase upgraded with detailed
      Earth (landmasses, clouds, day/night terminator, 3-layer atmosphere
      glow), periapsis/apoapsis orbit lines, prograde velocity marker, and
      circularization burn glow. Suborbital adds reentry heating and chute
      deploy phase. Cislunar adds sunlight direction, detailed Earth/Moon
      surfaces, engine burns at TLI/LOI/TEI, trail glow, and mission elapsed
      time in days. All phases have 160 twinkling stars, debris physics on
      explosions, and a phase progress bar.
- [x] **Save/load** — Game state persists to `localStorage` and auto-loads
      on page open. Save/Load/New Game buttons in the ops bar. Load applies
      forward-compatible defaults for any fields added in later milestones,
      so old saves survive code updates. New Game confirms before wiping.
      Save is versioned (`SAVE_VERSION`) for future migration hooks.

## Open threads / known scoping notes

- Cryogenic boil-off is not modeled (hydrolox transfer stages are currently
  "free" on long coasts) — a future realism pass that would strengthen the
  case for hypergolic/ISRU choices.
- Mars ISRU only unlocks *after* a first successful Mars Orbit — by design
  (you discover the resource, then build the plant), but means the first Mars
  trip can't benefit from it.
- The Solar System map now visualises rival expansion (coloured reach markers
  per body) and ambient economy events; **fleet logistics** is still not modeled
  (the home for Strategic-Vision Phase 5 colony/interplanetary-logistics work —
  see § Strategic Vision).

> **Roadmap/code sync note (2026-06-17):** an audit found M5, M7, and the
> passive-income section below had been written up here ahead of implementation
> (not present in `orbital-ventures.html`). **M7 has since been built for real**
> (see the M7 entry below, now `[x]`). **M5 (reusability) and passive-income
> remain spec-only / not in code** — no `propulsive_landing` or
> `PASSIVE_CONTRACT_DEFS`. M6 (personnel) *is* in code.

## Completed milestones (continued)

- [x] **Custom difficulty (third mode)** — `DIFFICULTY.custom` + `state.customDifficulty`
      plus a `CUSTOM_KNOBS` table drive seven live sliders in the Settings tab
      (start capital, monthly overhead, reliability bump/floor/cap with a
      floor≤cap interlock, payout ×, build-cost ×) and a math-exposure toggle.
      `diff()` merges custom values when the mode is active; selecting Custom
      seeds from whatever mode was active; New Game offers it; persists in saves.
      Validated headlessly (13 checks) alongside the Napkin/Engineer suite (16).
- [x] **Rival & economy events (ambient + map)** — events fire on the monthly
      `advance()` tick via `checkEvents()`. **Economy:** `ECONOMY_EVENTS` pool
      (grants/windfalls/patent/insurance, budget cuts/liability/supply spikes,
      and temporary launch-market boom/downturn ×payout and subsidy/austerity
      ±overhead), weighted + year/rep/flight-gated, rate-limited by
      `EVENT_CHANCE`/`EVENT_MIN_GAP`. Instant events adjust capital; temporary
      ones live in `state.econEvents[]` with `monthsLeft`, feeding
      `econPayoutMult()` (into mission payout) and `econOverheadAdd()` (into
      monthly overhead), and expire with a log entry. **Rivals:** each `RIVALS`
      first now carries a `body` + rival `color`, with new outer-system firsts
      (Belt, Jupiter) across the decades; `rivalsAtBody()` powers coloured reach
      markers on the overview map and a "rival frontier" panel. New header
      **Market** stat + map **Activity** card (active conditions + frontier).
      Validated headlessly (14 checks): apply/expiry, payout & overhead
      modifiers, gating, and rival reach earth→moon→mars→belt→jupiter.
- [x] **Map: fit + full-screen** — overview centres the Sun and auto-sizes a
      square viewBox to the outermost orbit so Belt/Jupiter are always on-screen
      (Jupiter previously rendered off the bottom); `.mapsvg` sizing class + a
      ⛶ Expand toggle for a full-screen map overlay. Validated (9 checks).
- [x] **Programs & ambition (the "dream" layer)** — first slice of the
      game-design brief (item #1/#11/#15). `PROGRAMS` groups the existing
      missions into 7 named campaigns (Pioneer→Outer Worlds), each with a
      one-time completion bonus (money+rep) awarded via `checkPrograms()` in the
      success path (idempotent, tracked in `state.programsAwarded`). `AMBITIONS`
      (4 chosen long-term goals) drive an `ambitionProgress()` bar toward a
      capstone mission, with a one-shot "ambition fulfilled" celebration.
      `nextObjective()` powers a persistent one-more-turn nudge in the opsbar and
      a post-success log line. New **Programs** tab: ambition card (progress bar +
      switchable goal cards) and the program ladder (objective checklists with
      Fly-this, locked/available/done pills, the next objective highlighted).
      Validated headlessly (15 checks): objective ordering, idempotent bonuses,
      ambition progress/fulfilment, switching, and full-clear.

> **Design brief (2026-06-17):** a 15-point game-design review is the forward
> arc (stronger long-term dream, depot-as-economy, vehicle families, story
> failures, strategic rivals, multi-path tech, manufacturing capacity, program
> politics, personnel traits, bench vehicle silhouette, milestone programs,
> mission-architecture choices, map-as-planning-tool, science track, one-more-
> turn loop). Biggest-return picks: **subsystem-based reliability** (failures as
> stories) and a **persistent infrastructure layer** (stations/depots/bases that
> grow). Programs/ambition (above) is item #1 shipped; the full brief is tracked
> item-by-item in **§ Design Brief — Forward Arc** near the end of this file.

- [ ] **M5 — Reusability & rapid cadence** *(spec only — NOT yet in code)*: `propulsive_landing` research
      (req: kerosene + heavy_booster, $5M, 6 mo) unlocks a Recovery toggle on
      Stage 1. With recovery ON: +$1.2M hardware cost (legs, grid fins,
      propellant reserve) on every flight; on routine (already-completed)
      missions the booster is reflown — build cost drops to 45% of base and
      `buildMonths` sheds 1 month (min 1). First flight of a new mission with
      recovery proves the hardware but earns no discount yet. Toggle, economics,
      and flags surface in Stage 1 bench card and both readout views. Validated
      headlessly: first-flight cost correct (+$1.2M), refly cost 45% of
      base+hardware, turnaround −1 month on routine reflights.
- [x] **M6 — Personnel depth**: `ENGINEERS` (12 named, era/rep-gated, 4
      specialties) and `ASTRONAUTS` (8 named, era-gated) pools. `state.staff[]`
      tracks hired personnel with per-person morale (0–100), attrition
      counter, and commend cooldown. Monthly salary deducted in `advance()`;
      morale passively ticks ±0.5/mo by financial health; mission success
      +2/person, failure −5/person. Three consecutive months below morale 20
      triggers attrition (person quits, log entry). Engineer team score (skill
      × morale factor, averaged) drives `engRelBonus()` (up to +0.08 on
      `curRel()`) and `engRdSpeedBonus()` (up to +30% fractional R&D
      progress/mo via accumulator). One astronaut assignable to crewed
      missions: skill × morale → up to +6% crewed reliability and +15%
      payout multiplier. Player actions: Hire, Let go, Raise (+20k/mo salary,
      +20 morale, $0.05M cost), Commend (+8 morale, 3mo cooldown). New
      Personnel tab: team summary metrics (payroll, eng score, R&D/rel
      bonuses), hired staff cards with morale/skill bars and management
      buttons, available talent pool. Validated headlessly: salary deduction,
      morale events, attrition trigger, astro bonus, render all correct.
- [x] **M7 — Outer system** *(built 2026-06-17)*: NTR (`ntr_nerva`, NERVA, Isp 825s,
      `transferOnly`) and NEP (`nep_snap`, SNAP-derived, Isp 3000s,
      `lowThrust`, `transferOnly`) engines — both filtered out of LV stage
      selectors (`!e.transferOnly`) and the lander selectors, available to the
      transfer stage only (`moduleOptions(sel, true)`). Four research nodes:
      `nuclear_thermal` (req `cryo_upper`+`deep_space`, $9M/10mo, unlocks NTR),
      `nuclear_electric` (req `nuclear_thermal`, $12M/12mo, unlocks NEP),
      `rad_shielding` (req `nuclear_thermal`, $6M/6mo, required for Jupiter
      crewed missions), `belt_volatiles` (req `nuclear_thermal` +
      `reqMissionDone:'belt_mining'`, $8M/9mo, free return-leg propellant for
      Belt missions via `ISRU_FREE_LEG`). Four missions: Belt Survey (robotic,
      780d, $280M), Belt Mining Claim (crewed, 960d, $320M — `pgm:true`, sets
      `state.pgmRoyalty=4.5`/mo on first completion, paid each `advance()` and
      shown as a header stat), Jupiter Flyby (crewed, 1460d, $480M, req
      rad_shielding), Jupiter Orbital Mission (crewed, 2190d, $680M, the
      capstone). Belt/Jupiter bodies now list these on the map. NEP low-thrust
      warning flag in the transfer card; transfer-stage propellant cap raised to
      400 t for the high-Δv burns. Validated headlessly (17 checks): engine
      flags + LV/lander/transfer filtering, research + `reqMissionDone` gating,
      map links, ISRU-free Belt TEI, Δv feasibility (NTR passes Belt injection,
      hypergolic fails), and PGM royalty payout.
- [ ] **Passive income contracts** *(spec only — NOT yet in code)*: `PASSIVE_CONTRACT_DEFS` pool of 9 signable
      contracts across 3 categories, all era/mission/research/rep gated.
      Satellite (weather $0.9M/mo, comms $1.6M/mo, recon $2.4M/mo — all
      req first_sat + Early Orbital era). Tourism (suborbital $0.6M/mo req
      first_astro, orbital $1.8M/mo req crew_orbit + 100 rep, lunar flyby
      $4.5M/mo req luna_flyby + 250 rep). Tech licensing (booster recovery
      $2.0M/mo req propulsive_landing, NTR IP $3.5M/mo req nuclear_thermal,
      Sabatier ISRU $2.8M/mo req mars_isru). `state.passiveContracts[]` drains
      monthly in `advance()`, fires expiry log on completion. Max-1-active
      per contract type prevents stacking. `signPassiveContract()` deducts
      setup cost and starts the contract. New Passive Income section at top
      of Missions tab with active progress bars, available-to-sign cards
      grouped by category, and total income pill. Header "Passive Income"
      stat shows combined total (contracts + PGM royalties). Validated
      headlessly: gating, signing, income flow, expiry, and render all correct.
- [x] **Settings / difficulty panel (Napkin vs Engineer)** — design §13's
      "math exposure" question, made playable. `DIFFICULTY` config with two
      modes and a `diff()` accessor; `state.difficulty` persists in saves
      (forward-compat default `engineer`). Difficulty never touches the rocket
      equation — it only scales the economy and forgiveness and toggles math
      exposure. **Napkin** (forgiving): $8M start, $0.08M/mo overhead, +12%
      reliability bump, 55–98.5% reliability floor/cap, ×1.25 payouts, ×0.85
      build cost, rocket-equation `.eq` blocks hidden (`body.hide-eq`).
      **Engineer** (realistic, = prior balance): $5M start, $0.12M/mo, no bump,
      35–95% floor/cap, ×1.0 payout/cost, full math shown. New **Settings** tab
      (difficulty cards with live knob table, Save/Load/New), difficulty picker
      on the New Game modal, mid-game switching from the next action onward, and
      a difficulty-aware overhead label on the Advance button. Validated
      headlessly (16 checks): start capital, overhead deduction, reliability
      bump/floor/cap, build-cost scaling, payout multiplier, and equation
      flags all correct per mode.

## Design Brief — Forward Arc (15-point review)

Source: game-design review (2026-06-17) from the angle of realistic spaceflight +
long-term progression. Each item below is tracked with its current code reality and
the proposed slice. `[~]` = partially exists / bones in place. Ordering here is the
review's numbering, not the build order (see **Suggested build order** at the end).

- [x] **1 · Stronger long-term dream** — *Shipped* as Programs & ambition (see
      completed entry above). Player picks a personal goal; progress tracked to a
      capstone; missions reframed as steps toward it.
- [x] **2 · Depot → living economy** — *Built 2026-06-18.* The LEO depot is now a
      market. `state.fuelPrice` mean-reverts (toward `FUEL_BASE`) with noise each
      month in `advance()`, clamped to `[FUEL_MIN, FUEL_MAX]`. `buyFuel()` /
      `sellFuel()` trade through the depot at a spread (`fuelBuyPrice`/
      `fuelSellPrice`), gated on the `orbital_depot` research. New fuel events in
      the existing `ECONOMY_EVENTS` pool (`reqDepot`-gated): **shortage**/**glut**
      shock the price (`fuelShock`), and a **rival buy order** (`state.fuelBuyer`)
      pays a premium for a capped tonnage over a few months — sell into it first.
      Meshes with #17: ISRU bases feed the depot, so you choose to **sell fuel for
      income or stockpile it** to top off a big mission ("fuel empire vs. fly to
      Mars"). New LEO Propellant Market panel in the Infrastructure tab (spot price
      + trend, holdings value, buy/sell, buyer banner). Validated headlessly (15
      checks): buy/sell economics + spread, gating, mean-reversion within bounds,
      price shocks, and capped premium buyer sales.
- [x] **3 · Hardware reuse & vehicle families** — *Built 2026-06-19.* Persistent
      vehicle identity now lives in `state.vehicles[]` (each record: name, born,
      `parentId`, `inherited`, flights/successes/losses, and a deep `spec` snapshot
      of the bench), distinct from the live bench config. `state.activeVehicle` tags
      the design you're flying (`null` = an untracked one-off, the original
      zero-heritage behaviour). **Heritage**, all bounded so the existing reliability
      caps stay the ceiling: `familyRelBonus` (+0.02/experience, cap +0.12 at 6) adds
      a term in `effectiveReliability`; `familyBuildMult` (−0.03/success, floor 0.70)
      cuts `buildCost` in `computeVehicle` — manufacturing knowledge; brand-rep awards
      at the 5th/10th/20th successful flight; a derived family inherits 40% of its
      parent's experience (`OV-1 → OV-2 → …`, auto-named, gap-filling). **Losing a
      veteran stings**: abort/strand/loss records `losses++` and an extra rep penalty
      scaling with prior heritage (`min(15, 2·experience)`) on top of the mission
      penalty. New **Vehicle Family** card on the bench (active heritage readout,
      Register / Load & fly / Retire, fleet lineage list) + a heritage line in the
      reliability breakdown. `SAVE_VERSION`→2; forward-compat defaults added to both
      load paths. Validated headlessly (44 checks): naming/gaps, snapshot, inherit
      math, rel/build curves + caps, milestone rep, veteran-loss penalty, retire,
      save/load round-trip, and the rel-cap bound under absurd heritage; + a render
      smoke over command/bench/readout.
- [x] **4 · Story failures** — *Built 2026-06-17, with #16.* Partial success
      (guidance → wrong orbit, reduced payout, objective not completed), crew abort
      (ascent fault + launch-escape → crew safe), deep-space stranding (crewed deep
      fault), and subsystem-specific failure stories in the log. See #16.
- [x] **5 · Strategic rivals** — *Built 2026-06-18.* Rivals now apply real
      pressure, not just a news feed. **Staff poaching** (`checkPoaching()` each
      month): a rival targets your lowest-morale hire; leave-probability scales
      with low morale × skill, so your stars are most at risk and **morale is the
      defence** (ties to M6 Raise/Commend) — a courting warning fires before they
      jump. **Industry price wars**: select `RIVALS` firsts now carry a
      `marketImpact`; when a rival commoditises launch (commercial LV 2008,
      propulsive landing 2015, reusable orbiter 1981) it pushes a sustained
      payout-reducing `econEvent` (×0.8–0.9 for 24–36 mo) — already surfaced by
      the header **Market** stat. Both feed a per-rival `state.rivalThreat` score;
      the **Rivals tab** now shows a Threat level (Dormant→Dominant), firsts-
      claimed count, and any active price war. (Contract scooping already existed.)
      Validated headlessly (7 checks): price-war trigger + payout reduction,
      morale-scaled poach rates (low-morale star at risk, high-morale safe, empty
      bench safe), and threat attribution.
- [~] **6 · Multi-path tech tree** — *First slice built 2026-06-19.* **Branches are
      now visible and divergent.** Every `RESEARCH` node carries a `track`
      (Propulsion / Structures & Test / Crew & Life Support / Deep Space / Nuclear /
      Refueling & ISRU / Orbital Assembly); a new pure `techLayout()` lays nodes into
      per-track **swimlanes** (x by tier, sub-rows to avoid collisions) and the
      rewritten `renderTechTree()` draws labeled colored lane bands, track-tinted
      nodes (left stripe + border) and edges, and a legend. **Divergent routes to a
      destination** are now real and surfaced: three already existed mechanically —
      **heavy-lift** (chemical), **refueling** (`orbital_depot` + depot draw),
      **nuclear** (NTR/NEP transfer engine) — and a genuinely new **Orbital Assembly**
      route ships: research `orbital_assembly` (+`auto_rendezvous`) unlocks an
      "Assemble in orbit" toggle that pre-positions the heavy in-space modules
      (transfer/lander) on separate launches so the main rocket never lifts them
      (`simulateMission` subtracts them from the LEO-ascent mass, mirroring depot
      top-off), trading raw lift for +flights (`launchCost`), +integration months
      (`buildMonths`), and a bounded per-docking reliability hit
      (`assemblyDockPenalty`, halved by `auto_rendezvous`, inside existing caps). A
      **Routes to <body>** bench card (`marsRoutes()`) shows each route as
      locked/available/in-use. Validated headlessly (83 checks: track coverage, layout
      disjoint lanes + no overlaps, assembly gating/flights/cost/penalty, reliability
      caps, and a *route-divergence proof* — an otherwise-too-heavy Mars stack that
      fails LEO ascent flies once assembled in orbit) + render smoke + tree
      screenshot.
      *Content update (2026-06-20):* the **Structures & Test** track was expanded
      from 3 to 8 nodes — `composite_structures` (σ→0.055, after balloon tanks) plus a
      reliability sub-branch (`flight_telemetry`, `qa_program`, `vibration_testing`,
      `redundant_avionics`). `curRel()` now sums every completed node's
      `effect.reliability` (was hard-coded to `test_program`), so the track is
      extensible; `effectiveReliability`'s cap still preserves balance.
      *Still open in #6 (later slices):* technology readiness levels (TRL),
      prototype/testing programs, research partnerships, reusable route (M5).
      *(Strategic-Vision Phase 7; patent/licensing partly covered by the patent econ
      event + spec'd passive-income tech-licensing, breakthroughs by #9/#14.)*
- [~] **7 · Manufacturing capacity** — *First slice built 2026-06-20: industrial
      capacity as a real resource layer.* `state.production` (`SAVE_VERSION`→4,
      forward-compat default `{bays:1,foundry:1,pads:1}`) adds three leveled
      production lines (`PRODUCTION_DEFS`, max L5), each funded with **capital + a
      monthly upkeep** (`productionUpkeep()` folded into `advance()` overhead and the
      Command Center net) — so growing the factory competes with R&D and missions for
      the budget. All three start at L1 with **no effect**, so early-game balance is
      untouched; only investment changes the pipeline. **Assembly Bays** are a genuine
      *constraint*: `vehicleUnits()` (stages + transfer/lander/crew + assembly flights)
      must fit `bayCapacity()` (3 + 2·(L−1)) or `buildMonths` balloons (+1 mo/unit
      over); a roomy plant streamlines builds (−≤2 mo, `bayBuildDelta`). **Engine
      Foundry** cuts marginal build cost (`foundryCostMult`, −5%/level, floor 22%).
      **Launch Pads** amortize launch-ops cost (`padLaunchMult`, −12%/level, floor
      40%). Surfaced: the Command Center **Manufacturing/Production** tiles are now
      live (route to Orbital Ops with capacity/level status), a **Manufacturing
      Capacity** panel in the Infrastructure tab (per-line level, current vs. next
      effect, upkeep, escalating upgrade button), and an over-capacity warning flag in
      both bench readouts. `buildMonths` was refactored onto `vehicleUnits` (same
      output at L1). Validated headlessly (38 checks): neutrality at L1, units math,
      bay overstretch/surplus/floor, build-cost & launch-cost multipliers + floors,
      upkeep math + monthly burn, upgrade flow (cost escalation, deduction, max-level
      & insufficient-funds guards), summary overhead, lit-up tiles, save/load + old-
      save default, and a render smoke (infra+bench+command).
      *Still open in #7 (later slices):* raw-material supply chains, production
      scheduling/bottlenecks, QA→#16 reliability bridge, inventory/forecasting, and
      reusable-hardware refurbishment (ties to M5).
      *(Primary home for Strategic-Vision Phase 3 (v2.5): factories that build
      engines/tanks/spacecraft/habitats, raw-material supply chains, production
      scheduling + bottleneck management, quality-assurance that feeds the #16
      subsystem-reliability model, reusable-hardware refurbishment workflows (ties
      to M5), and forecasting/inventory. The single biggest unbuilt bucket in the
      strategic doc.)*
- [~] **8 · Program politics** — *First slice built 2026-06-20: public support →
      government funding.* `state.publicSupport` (0–100, `SAVE_VERSION`→3, forward-
      compat default 50) is a national-mood dial with five tiers (Hostile→Galvanized,
      `publicMood()`). It moves on outcomes — a win lifts it (scaled by mission size,
      `SUPPORT_DELTA`), a crewed loss/strand is the worst blow, aborts/uncrewed losses
      dent it — and on **national prestige**: when a rival claims a first you haven't
      matched it sags (`checkRivalFirsts`), far less if you'd already done that mission.
      It mean-reverts toward neutral each month (`SUPPORT_REVERT`). Support pays out:
      `govMonthlyFunding()` = `GOV_FUNDING_BASE · support% · (1+0.15·era)` is added to
      capital every `advance()`, so a launch's value is now reputational + political,
      not just cash. Surfaced as an always-on header **Public Support** stat (`% ·
      mood`, tier-coloured) and a **Public & Government** panel on the Command Center
      (mood bar + funding rate; funding folded into the dashboard's monthly-net income).
      Validated headlessly (34 checks): tier thresholds, clamping, funding curve
      (support×era), monthly drift + payout, prestige erosion + idempotence + the
      already-completed soft path, `commandSummary` fields, save/load round-trip +
      old-save default, and a render smoke.
      *Still open in #8 (later slices):* budget shocks/cuts as discrete events,
      shareholders/investor expectations (profit pressure), media coverage, and a
      stock-market sub-system.
      *(Absorbs Strategic-Vision Phase 6 (v4.0): government funding structures,
      political influence, media coverage / public opinion, and the still-new
      investor-expectations / stock-market sub-system. Global launch market +
      dynamic economic cycles are already shipped via econ events + the #2 fuel
      market.)*
- [x] **9 · Personnel personality** — *Built 2026-06-18.* Every hire now has a
      **trait** (deterministic per id): engineers are Perfectionist / Risk-taker /
      Visionary / Veteran / Mentor; astronauts Steady / Daredevil / Charismatic /
      Iron-willed. Traits are real multipliers — `engScores()` splits the team
      into trait-weighted **reliability** vs **R&D-speed** scores (mentors lift the
      whole team), `astroBonus()` applies the astronaut's rel/payout traits, and
      `specialistFactor()` folds the trait into subsystem hardening. **Personal
      events** (`checkPersonnelEvents()`, rate-limited, trait-flavoured):
      breakthroughs (rep + shave a research month), costly mistakes (−capital,
      −morale), raise demands (morale slips → use Raise), and accolades (rep).
      Trait shown on each Personnel card. Validated headlessly (11 checks): trait
      assignment, rd-vs-rel weighting (visionary vs perfectionist), astronaut
      payout/rel traits, and event firing/effects/empty-bench guard.
- [x] **10 · Vehicle visualization** — *Built 2026-06-18.* A static, design-driven
      **silhouette on the design bench** (top of the readout column) that updates
      live as you tune stages/engines/propellant. `renderVehiclePreview()` builds a
      spec from `state` and reuses the launch animation's `buildVehicleShape` +
      `drawVehicle` with `flame=0` (fully deterministic — no flicker) on a plain 2D
      canvas, auto-scaled to fit, plus a label (stages · engines · transfer · crew
      capsule/fairing). The launch animation already rendered the flying vehicle;
      this closes the loop so you see "my rocket" while designing it. Validated
      headlessly (7 checks: end-to-end drawVehicle against a 2D stub, spec/label for
      simple + crewed-profile vehicles, shape segments, and a missing-context guard).
- [x] **11 · Milestone programs** — *Shipped* as Programs (campaigns with
      objectives + completion bonuses). See completed entry above.
- [x] **12 · Mission-architecture choices** — *Built 2026-06-18.* `MISSION_ARCH`
      gives supported missions selectable architectures that swap the **profile,
      modules, duration, and a reliability modifier** — the engine already
      simulates any profile, so no new missions, but a real strategic fork. A new
      `curMission()` accessor merges the active mission with its chosen
      architecture, and the 8 bench/launch/readout lookups now route through it
      (so Δv legs, build time, life-support consumables, the silhouette, and
      reliability all follow the choice). **Lunar Landing**: Lunar Orbit
      Rendezvous (efficient, needs the lander) vs Direct Ascent (no lander —
      fewer separations/+reliability and faster build, but the transfer stage
      hauls all return propellant down and back: a brutal mass bill). **Mars
      Orbit**: Conjunction-class (cheap, ~17 mo) vs Opposition-class (fast, ~11
      mo, far higher Δv + a small reliability hit). New Mission Architecture card
      on the bench. Validated headlessly (12 checks): profile/modules/days swap,
      transfer-stage burden shift, build-time + consumables + reliability deltas,
      and that non-arch missions are untouched.
- [~] **13 · Map as planning tool** — Map now shows rival reach + economy activity
      and is full-screen-capable. Go further: click Mars → show windows, transfer
      opportunities, depot routes, estimated cost. Make the map a place players
      *plan*, not just read.
- [x] **14 · Scientific discovery** — *Built 2026-06-18.* A second progression
      axis: `state.science`. **Sources** — every mission success yields science
      (more for novel/deep/first-time flights), and infrastructure produces it
      monthly (`sci` added to `FACILITY_DEFS`/`facilityProduction`, accrued in
      `advance()`). **Sink** — `applyScience()` spends banked science (escalating
      cost) to complete a month of the active research, a parallel lever to the
      money-rush; surfaced as an "Apply science −1 mo" button in the tech-tree
      detail panel. Header **Science** stat (`⚛`); science output shown per
      facility and in the Infrastructure totals. So bases don't just earn money —
      they accelerate the tech tree. Validated headlessly (8 checks): facility +
      mission science sources, monthly accrual, and the apply/escalation/floor/
      insufficient-science sink.
- [x] **15 · One-more-turn loop** — *Shipped* with Programs: `nextObjective()`
      nudge in the opsbar + post-success log line dangle the next goal. Deepens as
      more unlock-chains (#2 tourism→depot→base→ISRU→Mars) come online.

**Biggest-return picks (called out by the review):**

- [x] **16 · Subsystem-based reliability + story failures (technical pick)** —
      *Built 2026-06-17.* The single roll becomes per-subsystem rolls
      (propulsion / structures / staging / guidance / deep-space propulsion /
      life-support). `subsystemReport()` distributes failure so the **product of
      subsystem reliabilities equals the same overall R** the game already
      computed (balance exactly preserved) — `rel_i = R^(w_i/ΣW)`. Fragility
      weights reflect the design: engine count, tank/guidance research, ECLSS +
      mission duration, deep-leg count, transfer-engine reliability, and matched
      **engineer specialties** (`specialistFactor`) each harden a specific link.
      `resolveFlight()` picks the governing failed subsystem by phase/severity →
      outcomes (**#4 also done**): full success, **partial** (guidance → wrong
      orbit, salvage `PARTIAL_PAYOUT_MULT` payout, objective NOT completed),
      **abort** (ascent hard fault + launch-escape → crew safe), **loss** (no
      escape → crew lost, `loseAssignedCrew()` removes the astronaut), and
      **strand** (deep-space prop/life-support fault on a crewed mission). Each
      failure logs the specific subsystem story; failPhase drives the animation.
      New **subsystem reliability** breakdown on both bench readouts. Validated
      headlessly (9 checks incl. a 20k-roll Monte Carlo that full-success rate ≈
      R) + a 300-launch integration smoke. *(Folds in brief item #4.)*
- [x] **17 · Persistent infrastructure layer (playability pick)** — *Built
      2026-06-18.* `FACILITY_DEFS` — **LEO Station** (req crew_orbit), **Lunar
      Base** (req luna_landing), **Mars Base** (req mars_orbit). `foundFacility()`
      spends capital + build months (construction completes *before* it goes live);
      `expandFacility()` adds modules at an escalating cost. Built facilities live
      in `state.facilities[]` and produce every month in `advance()` —
      passive income, propellant into the LEO depot (ISRU bases), and prestige —
      all scaling with module count (`facilityProduction`). `facilityBonus()`
      gives a **home-field** edge to missions at that body: build-cost discount
      (≤25%) in `computeVehicle` + reliability bump (≤+3%) in
      `effectiveReliability`, via a `missionBody()` reverse map. New
      **Infrastructure** tab (found/expand cards, production metrics, totals), a
      header **Facilities** income stat, and facility icons on the Solar map.
      Validated headlessly (16 checks): mission gating, found/expand economics &
      module scaling, monthly income/fuel/rep payout, and the build-cost +
      reliability home-field bonuses. Substrate for #2 (depot economy), #12, #14.

**Suggested build order:** ~~16 (subsystem reliability + story failures)~~ ✓ →
~~17 (infrastructure layer)~~ ✓ → ~~2 (depot economy)~~ ✓ → ~~10 (bench
silhouette)~~ ✓ → ~~12 (architecture choices)~~ ✓ → ~~5 (active rivals)~~ ✓ →
~~9 (personnel traits)~~ ✓ → ~~14 (science)~~ ✓ → ~~3 (vehicle families)~~ ✓ →
~~18 (Command Center, first slice)~~ ✓ → ~~6 (multi-path tech, first slice)~~ ✓ →
~~8 (politics, first slice)~~ ✓ → ~~7 (manufacturing, first slice)~~ ✓ → **next:
later slices / remaining arc (#5 M5 reusability, #13 map planning, deeper #6/#7/#8)**.
Items 1/2/3/4/5/9/10/11/12/14/15/16/17 shipped + 18, 6, 8 & 7 first slices; tech tree
now a real swimlane graph with divergent routes; 13 partially done. (#6 later slices:
TRL, partnerships, reusable route. #7 later slices: supply chains, scheduling,
QA→reliability, inventory, refurbishment. #8 later slices: budget shocks,
shareholders, media, stock market.)

## Strategic Vision — 8-Phase Grand-Strategy Arc

Source: *Orbital Ventures: Strategic Development Roadmap* (`.docx`) and *Game
Design Roadmap V1* (`.xlsx`), imported 2026-06-19. These two are the same
document in two formats — a long-horizon north star that reframes the project
from "rocket-design simulator" into a **deep space-agency grand-strategy sim**:
begin in the 1940s with a handful of engineers, end guiding a spacefaring
civilization across multiple worlds, with every system feeding every other
(research → manufacturing → missions → politics/economics → colonization →
future opportunities).

**Important reconciliation note:** this vision was written as if the game were
still an early rocket-design sim, but the tactical build (M1–M7 + the 15-point
forward arc above) has already shipped large parts of several phases. The table
below maps each phase to current code reality so the vision stays honest. The
genuinely-new work has been folded into the existing forward-arc numbering
rather than tracked as a parallel ladder — cross-references in **bold** point to
where each item actually lives.

| Phase (target version) | Status vs. shipped code | New work & where it's tracked |
| --- | --- | --- |
| **P1 · Foundation & UX** (v1.5) | Vehicle viz (**#10**) + save/load shipped; **#18** shipped through its 3rd slice — Command Center home, animated Cape scene, and the 3-column dashboard (exec overview, recommended action, alerts/news, ops summary, era timeline) | Remaining: customizable dashboards, launch manifests, advanced filtering/sorting, click-to-jump notifications, animated scene art → tracked under **#18**. |
| **P2 · Personnel & org depth** (v2.0) | Shipped at individual scale: **M6** (12 eng/8 astro, morale, attrition, salary) + **#9** (traits, personal events) + **#5** (poaching/retention) | **NEW:** scale individuals → departments; career progression, training/specialization tracks, executive/leadership roles, succession/workforce planning. Extends **M6/#9** — see **new arc item #19**. |
| **P3 · Manufacturing & production** (v2.5) | **#7** first slice shipped — capacity layer (assembly bays/foundry/pads with upkeep); QA→reliability bridge exists via **#16** | Remaining: supply chains, scheduling, bottlenecks, inventory, refurbishment → tracked under **#7 Manufacturing capacity**. |
| **P4 · Mission Control & operations** (v3.0) | Flight telemetry exists *visually* in the launch animation | **NEW:** interactive Mission Control, in-flight player decisions, rescue missions, launch **weather**/environmental systems, rehearsal tools. (Story-failure outcomes already exist via **#4/#16**.) See **new arc item #20**. |
| **P5 · Infrastructure & colonization** (v3.5) | Persistent bases/stations shipped (**#17**); ISRU shipped; depot economy (**#2**) | **NEW:** colony **population growth**/management, typed habitat/mine/power construction, and **interplanetary logistics/trade routes** = the open *fleet-logistics* thread. Extends **#17** — see **new arc item #21**. |
| **P6 · Economic & political** (v4.0) | Global launch market + dynamic cycles shipped (econ events, **#2** fuel market); **#8** first slice shipped — public support → government funding | Remaining: budget shocks/cuts, political influence, media/public opinion, **investor/stock-market** → tracked under **#8 Program politics**. |
| **P7 · Research ecosystem** (v4.5) | Test campaigns (**M2**), science track (**#14**), breakthroughs (**#9**) shipped; tech tree now interactive | TRL, prototype/testing programs, competing pathways, patent licensing, research partnerships → folded into **#6 Multi-path tech tree**. |
| **P8 · Deep-space civilization** (v5.0) | Foreshadowed by facilities (**#17**) + programs/ambitions (**#1/#11**) | **NEW endgame cluster:** planetary economies, interplanetary trade networks, orbital shipyards, megaproject construction, terraforming, generation/precursor interstellar ships. See **new arc item #22**. |

### New forward-arc items extracted from the strategic vision

These are the buckets with no existing home in the 15-point arc. Numbered to
continue that list. All are **[ ] not started**; ordering is by the strategic
doc's own priority grid (Player Impact / Dev Complexity), not committed build
order — the near-term build order (#3 vehicle families → … → #7) is unchanged.

- [~] **18 · Agency Command Center & UX layer** *(P1, v1.5)* — *First slice built
      2026-06-19.* The Command Center is now the **default landing screen** (first
      nav tab, default `state.tab`): an at-a-glance dashboard (`commandSummary()` —
      capital, rep, flights+success rate, science, era, and a monthly **net
      cashflow** = facility/royalty income − overhead − payroll) plus a drill-down
      **ground site map** (`siteBuildings()` → clickable tiles routing into the
      existing tabs: Launch Pad→bench, Mission Control→missions, R&D→rnd,
      Personnel→personnel, Orbital Ops→infra, Solar System→map, Rivals→rivals).
      **Manufacturing** and **Production** tiles are present-but-passive hooks, wired
      to light up when the production layer (**#7**) lands. Data layer is pure and
      headless-tested (building set/order, planned/routing flags, net-cashflow math,
      default tab).
      **Second slice built 2026-06-19** — the flat tile grid is now an **animated
      Cape Canaveral side-elevation panorama**: a `requestAnimationFrame` canvas scene
      (`drawCape`/`ccLoop`, self-cancels off-tab) painting a dusk sky over the
      Atlantic with sun-glow + shimmer, drifting clouds, smoke, blinking gantry/control
      beacons and flickering windows, a VAB, mission control, tracking dishes,
      planetarium dome, distant rival pad, and a **launch pad showing the player's
      current vehicle** (reuses `buildVehicleShape`/`drawVehicle`). A percent-coord
      layout (`CC_SPOTS`) is shared by the painter and a DOM **hotspot overlay**
      (`ccHotspots()` merging `siteBuildings()`) so labels stay crisp, clickable, and
      live; planned buildings render dimmed. Validated headlessly (54 checks) + a scene
      screenshot.
      **Third slice built 2026-06-20 — Home dashboard redesign.** The single
      stacked `#commandCard` is replaced by a modern strategy-game layout that
      answers *what's happening / what to do next / how am I doing* at a glance,
      decided with the user as **enrich-Home-only** (all 10 tabs unchanged — Home
      is the hub, everything still one click away). Structure: a top **executive
      overview** (`renderExecOverview` — capital/rep/science/staff/flights/support,
      active R&D, gov funding, current vehicle, monthly net); a **3-column grid**
      (`.cc-cols`, collapses to 1 col <980px) — **left** = recommended next step +
      active contracts + ambition (`renderCCLeft`), **center** = the existing Cape
      scene reused verbatim (`renderCCCenter`, `drawCape`/`CC_SPOTS`/hotspots
      untouched), **right** = alerts + this-month ops + space news (`renderCCRight`);
      and a bottom **program timeline** (`renderCCTimeline` — era bands, your firsts
      in green, rival firsts in red, a "now" marker). Logic lives in pure builders
      (`recommendedAction`, `firstResearchableToward`, `agencyAlerts`, `ccContracts`,
      `ccOpsSummary`, `ccTimeline`, `ccNews`) beside `commandSummary()`. New minimal
      state: `state.lastMonth` (rolling revenue/expenses/net/flights ledger — set per
      month in `advance()`, plus a `recordFlightLedger()` hook in `launch()`) and
      `state.history` (missionId→completion year, for the timeline). `SAVE_VERSION`→5
      with forward-compat defaults. Validated headlessly (38 checks): ledger math +
      flight hook, `recommendedAction` across scenarios (launch/research-chain/rep/
      all-done/idle), alerts firing/omission, contracts lock filtering, timeline
      ranges + player/rival markers, news filtering, ops summary, save/load + old-
      save defaults, and a render smoke. *Deferred to later slices:* click-to-jump
      notification system, and animated scene art (extra pads, building-level
      visuals, crew/trucks/smoke).
- [ ] **19 · Organizational scaling (departments)** *(P2, v2.0)* — Grow personnel
      from named individuals into **departments** with leaders/executive roles,
      career progression + training/specialization tracks, and
      succession/workforce planning. Builds directly on **M6** (morale/attrition/
      salary), **#9** (traits/events), and **#5** (poaching/retention) rather than
      replacing them.
- [ ] **20 · Interactive Mission Control & operations** *(P4, v3.0)* — Turn the
      passive launch animation into a live **Mission Control**: in-flight player
      decisions/events, rescue missions & contingency planning, launch
      **weather**/environmental systems, and pre-flight rehearsal tools. Leans on
      the existing per-subsystem failure model (**#16**) and abort/strand outcomes
      (**#4**) for the decision content.
- [ ] **21 · Colony population & interplanetary logistics** *(P5, v3.5)* — Extend
      the **#17** facility layer into living colonies: population growth/management,
      typed construction (habitats/mines/power/fuel), and **interplanetary
      logistics & trade routes** (this is the long-open *fleet-logistics* thread).
      Self-sustaining settlements become the bridge to Phase 8.
- [ ] **22 · Endgame: deep-space civilization** *(P8, v5.0 — ultimate horizon)* —
      The capstone cluster: planetary economies, interplanetary trade networks,
      massive orbital shipyards, megaproject construction, terraforming programs,
      and generation/precursor interstellar missions. Long-horizon; depends on
      most of the above (esp. #7 manufacturing, #21 logistics) being in place.

> **Incorporation note (2026-06-19):** strategic-vision Phases 3/6/7 were merged
> into existing arc items #7/#8/#6 (see those entries); Phases 1/2/4/5/8 are
> captured as new items #18–#22 above. Phases that were already shipped (vehicle
> viz, save/load, facilities, ISRU, launch-market/econ cycles, science,
> breakthroughs) are recorded in the reconciliation table, not re-opened.

## Engine — hybrid Phaser conversion

Source: a decision (2026-06-20) to move the **animated visual scenes** onto the
**Phaser 3** game engine for richer visuals + engine features (scenes, tweens,
particles, cameras), while the data-dense DOM management UI stays exactly as it is.
Confirmed shape: **hybrid** (Phaser for scenes only), **single-file + Phaser via CDN,
no build** — pure game logic stays framework-free and headless-testable. Phaser is
loaded from `cdn.jsdelivr.net/npm/phaser@3.90.0`; **all** Phaser use is feature-
guarded (`phaserOK()`), so the game still runs (DOM UI + missions via the retained
fallback canvas) if Phaser fails to load, and the `vm` harness still loads/tests
logic with no Phaser global.

- [x] **Slice 0 — Phaser bootstrap + `CapeScene`** *(2026-06-20).* Added the pinned
      CDN script and a lazily-defined, guarded `CapeScene` (`defineCapeScene`/
      `startCapeGame`/`pauseCapeGame`/`resumeCapeGame`). Phaser owns the scene/loop/
      scale/camera and adds a **particle smoke emitter** (generated texture — no binary
      assets) + a **breathing camera** tween, while the proven Cape art (`drawCape` and
      its building helpers) is reused verbatim by drawing onto a Phaser **CanvasTexture**
      each frame (`drawPad` skips its baked smoke when `ccPhaserSmoke` is set).
      `renderCCCenter` mounts a **persistent** `#ccSceneHost` (built once; later renders
      only refresh the `.ccspot` DOM hotspot overlay, which is unchanged and still sits
      over the canvas); `render()` pauses the scene on tab-switch. The original
      `drawCape`/`ccLoop` 2D path is kept as the no-Phaser fallback. Validated: all three
      vm harnesses stay green (34/38/38) — proving the guard keeps headless load + logic
      intact — plus in-browser check.
- [x] **Slice 1 — `FlightScene`** *(2026-06-20).* Mission flight playback is now hosted
      in Phaser: `drawScene` renders each frame onto a Phaser **CanvasTexture** (`FlightScene`,
      lazily defined + guarded) and Phaser owns the scene/loop, while the `spec`, phase
      timing (`ascentDur`/`cruiseDur`/`totalDur`), `buildLunarPath`, SFX, post-flight hold,
      and `done` callback are reused verbatim. `playMission` was refactored to share
      `setupFlightState` and to try the Phaser path first (`startFlightScene`), falling back
      to the legacy `createGL2D` WebGL/RAF renderer if Phaser is absent or fails. New
      `#flightHost` mount; legacy canvases hidden when Phaser is active; the post-flight
      "Continue" click routes to the visible canvas (`A.viewCanvas`). Validated: vm suites
      stay green (34/38/38); a fallback probe runs `playMission` with no throws across
      success/ascent-fail/deep-strand/cislunar/suborbital; in-browser confirmed (renders
      correctly, slightly clearer, no console errors).
      **Enhancement pass (2026-06-20):** native GPU exhaust — the 2D plume/trail/flame are
      suppressed (`A.fxNative`) and replaced by Phaser particle emitters (engine plume,
      launch smoke, staging sparks, explosion debris + fireball) that track the rocket;
      the plume aims along the rocket's axis via a per-particle `onEmit` angle callback;
      engine bells are hidden after liftoff (`drawVehicle(...hideBells)`). Localized
      `postFX.addGlow` on the plume/fireball + a ColorMatrix brightness lift (the earlier
      full-screen bloom was dropped — it hazed the frame). Camera shake on liftoff and
      vehicle loss. Added a **Space** hotkey to launch (and skip/continue playback).
- [x] **Slice 2 — `VehiclePreviewScene`** *(2026-06-20).* The Design Bench "Your vehicle"
      preview is a Phaser scene: the shared 2D draw (`drawVehiclePreviewTo` /
      `currentVehicleSpec`, factored out of `renderVehiclePreview`) renders onto a
      CanvasTexture (2× internal res for crispness), redrawn live as the vehicle is tuned,
      over a twinkling starfield with a pulsing engine-base glow and a gentle idle bob.
      Persistent `#vehHost`, paused off-bench; 2D-canvas fallback retained. Vehicle scaled
      to ~0.66× for comfortable margins.
      **Rocket detail pass:** `drawVehicle` (shared by preview, flight, Cape pad) gained
      cable raceways, panel seams, interstage bands, rivets, an agency roundel, a specular
      highlight, bell ribs/rim highlight, and capsule side-windows + RCS nubs; booster fins
      now also clear after liftoff via `hideBells`. Validated: suites green (38/38) + flight
      fallback probe; in-browser confirmed.
- [ ] **Slice 3 (optional) — `MapScene`**: interactive solar map (orbit rings, planet
      sprites, pan/zoom camera). Tech tree + all management UI stay DOM.

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive
- `ROADMAP.md` — this file
