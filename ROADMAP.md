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

> **Roadmap/code sync note (2026-06-17):** an audit found M5, M7, and the
> passive-income section below had been written up here ahead of implementation
> (not present in `orbital-ventures.html`). **M7 has since been built for real**
> (see the M7 entry below, now `[x]`). **M5 (reusability) has since been built too**
> (2026-06-21 — `propulsive_landing` + recovery economics; see the M5 entry, now
> `[x]`). **Passive-income contracts have since been built too** (2026-06-21 —
> `PASSIVE_CONTRACT_DEFS`, repeatable with cooldown + diminishing returns + a military
> category; see the `[x]` entry below). M6 (personnel) *is* in code.

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

- [x] **M5 — Reusability & rapid cadence** *(Built 2026-06-21.)* New
      `propulsive_landing` research (Propulsion track, req: `kerosene` +
      `heavy_booster`, $5M, 6 mo) unlocks a **Recovery toggle on Stage 1**
      (`state.recovery`, persisted; `SAVE_VERSION`→6 with forward-compat default).
      Economics live in `computeVehicle`/`buildMonths` via three guards
      (`recoveryAvailable`/`recoveryActive`/`recoveryRefly`) and two constants
      (`RECOVERY_HARDWARE` $1.2M, `RECOVERY_REFLY_MULT` 0.45): with recovery ON,
      +$1.2M hardware (legs, grid fins, reserved propellant) on **every** flight;
      on routine (already-completed) missions the booster is **reflown** — build
      cost drops to 45% of base *and* `buildMonths` sheds 1 month (floored at 1).
      The first flight of a new mission proves the hardware but earns no discount
      yet (`state.completed[id]` gates the refly). Surfaced as a Recovery toggle +
      live economics line on the **Stage 1 bench card** (`recoveryStageHTML`) and a
      ♻ status flag in **both readout views** (simple + profile). Validated
      headlessly (31 checks): research node fields, gating without research,
      OFF==base, ON-new == base+hardware (months unchanged), ON-routine ==
      base×0.45+hardware (months −1), the min-1 floor, profile-mission parity
      (Lunar Landing), save defaults + `SAVE_VERSION`, toggle gating, and a
      bench/readout render smoke; plus a 24-combo full-render smoke and an R&D-tab
      render confirming the node lands in the propulsion swimlane.
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
- [x] **Passive income contracts** *(Built 2026-06-21 — repeatable, with cooldown +
      diminishing returns + a military category, per the user's request.)*
      `PASSIVE_CONTRACT_DEFS` — **12** signable standing contracts across **4**
      categories (`PASSIVE_CATS`), each gated by flown mission / research / reputation:
      **Satellite Services** (weather $0.9M/mo, comms $1.6M/mo, imaging $2.4M/mo — req
      `first_sat` + rising rep); **Human Spaceflight** (suborbital $0.7M/mo req
      `first_astro`, orbital $1.8M/mo req `crew_orbit`, lunar flyby $4.5M/mo req
      `luna_flyby`); **Technology Licensing** (booster recovery $2.0M/mo req
      `propulsive_landing`, NTR IP $3.5M/mo req `nuclear_thermal`, Sabatier ISRU
      $2.8M/mo req `mars_isru`); and a new **Military & Defense** category (defense
      launch $2.2M/mo, recon-sat program $3.2M/mo, missile-warning $4.0M/mo — higher
      pay, **shorter terms** (24–30 mo / 10–12 mo cooldown → more renewal churn), and
      each **lifts public support** `+3–5` via `addSupport`). **Repeatable with a
      cooldown + diminishing returns** (the user's headline ask): a signed contract
      pays a fixed income for its term, then expires onto a per-def cooldown
      (`PASSIVE_COOLDOWN` 12 mo default) before it can be re-signed; each renewal pays
      `PASSIVE_DIMINISH`^signings (0.85/renewal) of base, floored at `PASSIVE_FLOOR`
      40% — a renewable-but-fading stream, not infinite money. State:
      `state.passiveContracts[]` (active `{id,monthsLeft,income}`, income locked at
      sign time), `state.contractCooldown{}`, `state.contractSignings{}`
      (`SAVE_VERSION`→11, forward-compat defaults on both load paths). Income locked
      per-sign so later diminishing never retroactively changes a running contract.
      `tickPassiveContracts()` pays each active contract every `advance()` tick, expires
      to cooldown with a log line, and counts cooldowns down; folded into the #18 Home
      ledger + `commandSummary` net cashflow. Max-1-active per contract (the active-check
      blocks re-signing). New **Passive Income** card atop the Missions tab — grouped by
      category, active contracts show a term progress bar + months left, cooldowns show
      the renew countdown, available ones show the (diminished) income + setup + a Sign
      button; fully-locked contracts are hidden until their prerequisites are met. New
      header **Passive Income** stat (`+$X/mo`, shown when >0). Validated headlessly
      (37 checks): data shape + military category, fresh-game gating, unlock +
      affordability, signing (setup deduction, income lock, active flip, no double-sign),
      monthly payout + term countdown, expiry→cooldown→renewable cycle, **diminishing
      returns + the 40% floor**, military support lift, research-gated licensing, save
      default/version, legacy-save no-crash, and a missions-tab render smoke; all 8
      sampled prior suites green (power2 27, rad 26, reactorrad 13, ls 17, M5 31, #13 33,
      slice6d 19, propexp 23).
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
      prototype/testing programs, research partnerships, reusable route (M5 ✓).
      *(Strategic-Vision Phase 7; patent/licensing partly covered by the patent econ
      event + spec'd passive-income tech-licensing, breakthroughs by #9/#14.)*
      > **Superseded/expanded by the R&D Deep Expansion epic (2026-06-21):** #6 is
      > now the home of a much larger plan — tripling/quadrupling the tree to ~100–125
      > nodes across 13 tracks, plus Tech Levels, Research Divisions, and Breakthrough
      > Events. The TRL/partnerships/reusable items above are folded into it. See
      > **§ R&D Deep Expansion — The Research Pillar** for the full track-by-track plan
      > and build order. This is now the **primary near-term focus**.
- [x] **7 · Manufacturing capacity** — *Fully built across 8 slices 2026-06-20 → 2026-06-22.* *First slice built 2026-06-20: industrial
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
      *Second slice (in code ahead of this entry): a 4th production line, **Quality
      Assurance** (`qa`), was added with a flat reliability bonus (`qaRelBonus`,
      `QA_REL_PER`/`QA_REL_CAP`, ≤+4.8% at L5) folded into `productionRelMod`.*
      *Third slice built 2026-06-22 — **QA → #16 reliability bridge**.* QA now
      speaks to the subsystem model, not just the overall rate. New `qaFragMult()`
      (`QA_FRAG_PER` 5%/level, cap **20% at L5**; L1 → 1.00, L5 → 0.80) scales down
      the weights of the **manufacturing-touched** subsystems inside
      `subsystemFragilities()` — `QA_MFG_SUBSYS = {propulsion, structures,
      separation, boosters}` — leaving `avionics` / `life_support` /
      `deep_propulsion` untouched (QA can't fix software, radiation, or in-space
      restart physics). Because the #16 model normalises (`rel_i = R^(w_i/ΣW)`),
      reducing a subsystem's weight shifts the *picked-failure distribution* away
      from it: a high-QA program that loses a vehicle is now more likely to lose
      it to guidance or radiation than to a welded tank or turbopump. **Overall R
      is untouched by this slice** (the rate is still governed by `effectiveReliability`
      and the existing flat `qaRelBonus`); this is purely a redistribution, so all
      prior balance is exactly preserved at L1 (no-op). Surfaced: the production
      panel **Build quality** card gains a sibling **Defect catch −X% mfg share**
      metric, the QA line's `prodEffectText` shows both effects (`+X% reliability ·
      −Y% mfg-defect share`), and the subsystem-breakdown readout rows for mfg
      subsystems carry a **🔬 QA L{n}** chip when L≥2 (avionics/life-support rows
      explicitly excluded). No new save fields — derives from existing
      `state.production.qa`. Validated headlessly (20/20, `/tmp/ov-qa-bridge.js`):
      `qaFragMult` cap formula across L1–L5, L1 no-op, mfg subsystems scaled by
      exactly 0.80 at L5 + non-mfg byte-identical, product-preservation invariant
      (`Π rel_i == R`) holds at L5, boosters fitted respect the scaling, a Monte-
      Carlo-style failure-share shift on a richer mission (mfg share drops L1→L5,
      no subsystem disappears), UI text/render smoke (`prodEffectText`,
      `productionPanelHTML` includes "Defect catch", `subsystemBreakdownHTML`
      chip present at L4 and absent on the Guidance row).
      *Fourth slice built 2026-06-22 — **reusable-hardware refurbishment** (M5
      tie-in).* Per-family `reflights` counter (`SAVE_VERSION`→13, forward-compat
      via `||0` guards on read + at the increment site, so legacy vehicles read as
      zero wear and only gain the field on first refly). Wear curve saturates at
      5: `refurbCostMult()` rises 0.45 → 0.85 (+0.08/refly, `REFLY_WEAR_COST_PER`
      / `REFLY_WEAR_COST_CAP`); `refurbRelPenalty()` chips 0 → 4% (+0.8%/refly,
      `REFLY_WEAR_REL_PER` / `REFLY_WEAR_REL_CAP`, capped against `diff().relFloor`).
      Wired into `computeVehicle` (`buildCost*=refurbCostMult()` replacing the
      flat `RECOVERY_REFLY_MULT`) and `effectiveReliability` (subtracts the wear
      penalty when `recoveryRefly(m)`). Foundry and the QA→#16 bridge still flow
      through unchanged — the foundry discount applies to the refly cost via the
      unconditional `buildCost*=foundryCostMult()` upstream, and QA continues to
      reshape per-subsystem weights every flight. The increment hook lives next
      to the `fam.successes++` line: a successful routine refly bumps `reflights`.
      Surfaced: recovery card shows `wear N/5 · −X% rel` and flips to a *(retire &
      build fresh)* hint at saturation; both bench readout flags swap the flat
      `−55%` for the live `×{mult}` and the wear note. *Story:* an aging booster
      gets cheaper for a while, then costs more per refly **and** flies a touch
      less reliably — at saturation, the foundry savings on a fresh airframe
      (with zero wear) beat reflying a 5-time-tired one.
      Validated headlessly (31/31, `/tmp/ov-refurb.js`): cost & rel curves
      across r=0..5, saturation past 5, no-active-family guard (no crash, wear=0),
      `buildCost` rises with wear in `computeVehicle`, `effectiveReliability` drops
      ~4% at full wear and only when the mission is *routine* (first flight on a
      worn airframe is unpenalised because the refly mult never fires), Foundry
      still cuts refly buildCost, QA→#16 bridge still scales subsystem weights on
      refly designs, `recoveryStageHTML` shows/hides the wear note correctly,
      save/load preserves `reflights`, and the saturation render includes the
      retire hint. Slice-3 QA suite re-run: 20/20 still green.
      *Fifth slice built 2026-06-22 — **production scheduling: build-cadence
      pressure & bottleneck identification.*** A rolling ring buffer
      (`state.recentBuilds`, `SAVE_VERSION`→14, forward-compat default `[]`) records
      `{at, units}` for every launch. `cadenceLoad()` divides total recent units by
      sustainable throughput (`bayCapacity() × CADENCE_WINDOW = 12 mo`); at load 1.0
      you're running flat-out, past that overtime + expediting parts cost extra.
      `cadenceSurcharge()` returns `min(0.30, (load−1)·0.5)` so each +0.10 of load
      over 1.0 is +5% buildCost (`CADENCE_SURCHARGE_PER` / `CADENCE_SURCHARGE_CAP`).
      Wired into `computeVehicle()` as `buildCost *= 1 + cadenceSurcharge()` right
      after the foundry discount, so foundry/family/refurb all compose with it.
      The buffer is appended + pruned inside `launch()` immediately after the time
      advance, so this launch shows up in the *next* launch's cadence — the rush
      surcharge you pay reflects the program you've actually been running.
      `bottleneckLine(m)` returns `'bays'` whenever you're paying a cadence
      surcharge **or** the current order is overstretched (`bayBuildDelta>0`),
      otherwise `null` — a single, unambiguous "expand bays" signal. Surfaced:
      Production panel gets a new "Build cadence" metric (colour shifts ok→warn→bad
      at 0%/80%/over-cap) and a top-of-panel bottleneck banner; both bench-readout
      flag blocks show a rush-surcharge warning when active. *Story:* growing fast
      gets expensive — three launches in a quarter on L1 bays means overtime, rushed
      part orders, and a 5–30% rush premium baked into every new build until you
      either slow down or pay the upgrade.
      Validated headlessly (25/25, `/tmp/ov-cadence.js`): empty buffer is a no-op,
      stale entries are pruned outside the window, load math hits exactly 0 at
      cap·window units and ≈10% surcharge at load 1.2, cap saturates at 30%,
      buildCost ratio matches `1+surcharge` analytically, higher bay capacity
      clears the surcharge, save/load round-trips the buffer, helpers tolerate a
      missing buffer (forward-compat), panel renders with the new metric, the
      banner appears only when bottlenecked, and `bottleneckLine` correctly fires
      on single-build overstretch as well as cadence pressure.
      *Sixth slice built 2026-06-22 — **raw-material supply chains**.* Two
      tracked commodities (`alloy` 50%, `electronics` 20%, plus 30% non-material
      baseline) each wander on a spot market — mean-reverting random walk toward
      1.0, clamped to [0.7, 1.4], ±5% walk with 10% revert pull per month
      (`MATERIAL_PRICE_REVERT` / `MATERIAL_PRICE_WALK`). The blended multiplier
      `materialCostMult()` = baseline + Σ(share × effective price) wires into
      `computeVehicle` right after the cadence surcharge, so foundry/refurb/
      cadence all compose with material costs. `materialPriceTick()` is called
      every month in `advance()` alongside the existing fuel walk. Players can
      sign a 12-month fixed-price contract on either commodity at a +5%
      premium over spot (`MATERIAL_CONTRACT_MONTHS` / `MATERIAL_CONTRACT_PREMIUM`)
      — the lock holds even when the market swings, trading optionality for
      predictability. Contracts decay one month per tick and expire automatically
      with a log notice. State (`state.materials`, `SAVE_VERSION`→15, forward-
      compat via `defaultMaterialsState()` + `materialState()` lazy-init guard,
      so old saves auto-seed to 1.0× spot with no contracts on first read).
      Surfaced: Production panel gets a new "Materials" delta metric (ok/warn/
      bad shading on ±3%/±10%) and a dedicated supply card with per-commodity
      spot price, trend arrow, effective price, and a sign-lock button (swaps
      to a "contract X.XX× · N mo left" pill while active). Bench-readout flag
      blocks gain a hot/cold market warning when blend exceeds ±5%. *Story:*
      alloy prices spike during a war scare and your next vehicle is suddenly
      28% pricier — unless you locked in a contract last quarter, in which case
      you ride out the storm.
      Validated headlessly (28/28, `/tmp/ov-supply.js`): state seeding, blend
      math at extremes matches formula, contract locks effective price under
      spot shock, double-sign rejected, contract decay/expiry, 2000-tick band
      invariant, long-run mean reversion to ~1.0 over 5000 ticks, buildCost
      ratio matches `materialCostMult` analytically, contract insulates
      buildCost from spot moves, save/load preserves the entire materials
      block including active contract, missing-`materials` forward-compat,
      panel surfaces Materials metric and supply card, contract pill appears
      while active, and `advance()` actually calls the tick (mean-reverts when
      spot is high). Slices 3–5 harnesses re-run: all green (20+31+25 = 76/76).
      *Seventh slice built 2026-06-22 — **inventory & forecasting**.* Each
      commodity gains a per-build stockpile (`state.materials[k].stock`,
      `avgCost`, `SAVE_VERSION`→16). 1 stock unit = 1 build's worth at
      `share × spot × MATERIAL_STOCK_UNIT_BUILD` (so an alloy build-worth at
      spot 1.0 costs $0.50M, calibrated against a $1M reference build).
      Players buy in +1/+6 chunks at the current spot via the production
      panel; the weighted-average price is rolled into `avgCost` so subsequent
      builds price against what you actually paid, not what the market shows
      today. `materialEffectivePrice(key)` now returns `avgCost` whenever
      `stock>=1`, beating both the contract lock and the live spot — held
      inventory is *settled* cost. `consumeMaterialsForBuild()` runs in
      `launch()` right after the cadence buffer append, dropping one unit
      from each material that has stock; an empty stock is a no-op (falls
      back to spot/contract pricing). Forecast: `materialMonthsCoverage(key)`
      = `stock / (recentBuilds / CADENCE_WINDOW)`, with ∞ when nothing has
      flown recently — surfaced in the supply card alongside stock count
      and avg cost. Yard cap of 24 builds-worth (`MATERIAL_STOCK_CAP`)
      prevents infinite stockpiling. Forward-compat: `materialState()` lazy-
      inits `stock`/`avgCost` on read, so a v15 save with only spot/contract
      auto-fills to zero stock the first time it's touched.
      Surfaced: the supply card now renders per-commodity stock line with
      buy buttons, an avg/coverage subline, and a *from stock* pill on the
      effective-price row whenever the next build draws from inventory.
      The bench-readout flag block gains an inventory-draw note so the
      player sees the discount before launch. *Story:* alloy hit 0.75× last
      quarter; you spent $3M filling the yard with 6 builds-worth at avg
      0.78×. Now spot is 1.30× — your next six vehicles ship at 0.78×
      while a rival without stockpile eats the markup, and the bench reads
      "Drawing from inventory: Alloys @ 0.78×."
      Validated headlessly (36/36, `/tmp/ov-inventory.js`): default state,
      `SAVE_VERSION` bump, buy cost = `share × spot`, weighted-avg math
      (1@1.0 + 1@1.3 → 1.15), inventory beats contract beats spot fall-
      through chain, buildCost ratio matches material-mult ratio analytically
      under inventory pricing, consume drops stock without touching avgCost,
      yard cap & out-of-money gating, coverage math (∞ idle, `stock/rate`
      with traffic), forward-compat with v15-style materials, save/load
      round-trip of stock+avgCost, panel renders all three controls and the
      "from stock" badge. Slices 3–6 harnesses re-run: 20+31+25+28 = 104/104
      still green. *#7 Manufacturing Capacity is now complete (slices 1–7
      built).*
      *Visualisation layer added 2026-06-22 — **bench build-cost waterfall**.*
      Now that the buildCost passes through 6+ modifiers (difficulty, facility,
      family, foundry, cadence, materials, mfg R&D, refurb, recovery hardware),
      the player needs to see *why* the number is what it is.
      `buildCostBreakdown(m)` mirrors `computeVehicle`'s exact accumulation,
      returning `{rows, total}` where each row is `{label, kind, factor?, delta,
      running}`. `buildCostBreakdownHTML(m)` renders it as a collapsible
      `<details>` table on the bench (both renderers — simple-mission and
      profile-mission), inserted right above the subsystem breakdown. Each row
      shows the step label, the $ delta (red for adds, green for cuts), a
      mini-bar scaled against the largest |Δ| in the breakdown (anchored left
      for adds, right for cuts so the eye reads direction), and the running
      total. The Materials row gets a "from stock" annotation when inventory
      is feeding the price, so the player sees which discounts are theirs.
      Rows for no-op modifiers (e.g. Family heritage on a fresh program,
      Foundry at L1) are suppressed to keep the table to the steps that
      actually move the cost. Validated headlessly (33/33,
      `/tmp/ov-bdbreakdown.js`): the breakdown total is pinned to
      `v.buildCost` to floating-point tolerance across 8 distinct state
      shapes — vanilla, foundry L5, hot/cold materials, inventory-drawn,
      cadence rush, refly+wear, family heritage, custom difficulty, and a
      composite where multiple modifiers fire at once. Slice harnesses
      3–7 re-run: 20+31+25+28+36 = 140/140 still green (173/173 total).

      *Visualisation layer extended 2026-06-22 — **per-material spot-price
      sparklines**.* Now that material spot prices wander monthly and the
      blend feeds into every build, the player needs to see the *trend* —
      is alloy mid-bull-run, or settling back toward 1.0× after a spike?
      Each material now records its post-tick spot into a ring buffer
      (`state.materials[k].history`, capped at `MATERIAL_HISTORY_LEN = 24`
      months — long enough to see a contract's full life). `materialPriceTick`
      pushes one sample per material per month and trims to the cap.
      `materialSparklineSVG(key, w, h)` emits a tiny inline SVG (120×28 by
      default): a dashed baseline at 1.0×, the spot path normalised to the
      `[MATERIAL_PRICE_MIN, MATERIAL_PRICE_MAX]` band, and a coloured
      endpoint dot (red when above 1.05×, green below 0.95×, default ink
      in the dead-band) plus a stroke colour matched to the current
      regime. Wired into the Raw-material supply card in
      `productionPanelHTML` between the material blurb and the spot-price
      column, with a `title=` tooltip naming the baseline. `SAVE_VERSION`→17;
      forward-compat: missing `history` arrays are lazy-filled to `[]` by
      `materialState` and the sparkline tolerates 0/1-point histories
      gracefully (centres a single dot, no crash). Validated headlessly
      (25/25, `/tmp/ov-sparkline.js`): buffer append, cap enforcement,
      sample equals current spot, SVG structure (`<svg>`/`<path>`/dashed
      baseline), single-point render, missing-history forward-compat,
      save/load round-trip, v16-style save lazy-fill, panel embeds at
      least one `<svg>` per material, `advance(n)` records ~n points.
      Prior slice harnesses still green: 36+28+33+25 = 122/122 (the
      v16 `===` check in `/tmp/ov-inventory.js` was loosened to `>=`,
      same forward-compat pattern used after slices 6 and 7).

      *Visualisation layer extended 2026-06-22 — **cadence load gauge +
      contract-lock band**.* Two more reads-at-a-glance for the production
      panel, both pure derived visuals (no save bump). (1) `cadenceGaugeSVG`
      draws a 160×8 horizontal bar inside the Build-cadence metric tile:
      green fill for in-band load, a red overflow segment past the 100%
      mark when you're paying a rush surcharge, and a dashed gold tick at
      the 100% threshold. Visual scale runs 0–150% so the bar tells you
      *how far* over you are without growing without bound. (2) The
      existing material sparklines now carry a gold horizontal line
      showing your contract position: **solid** at `lockedPrice` when a
      contract is active (it stays put even as spot wanders, so you see
      whether your lock is winning or losing), **dashed** at
      `spot × (1 + MATERIAL_CONTRACT_PREMIUM)` when free (where signing
      *now* would land, relative to recent history). Validated headlessly
      (24/24, `/tmp/ov-gauges.js`): gauge structure (track, fill, threshold
      tick), no over-bar when load≤1, over-bar appears past 100%, bar
      widths clamp under extreme load so they fit the track, sparkline
      lock-line solid-vs-dashed by contract presence, locked-line y stays
      pinned across spot shocks, dashed-line y tracks spot. Prior
      harnesses still green: 25+28+36+33+25 = 147/147 (171/171 total
      across all manufacturing slices and viz adds).

      *Eighth slice built 2026-06-22 — **production queue & vehicle manifest**.* The
      capstone that **decouples building from launching**. New `state.buildQueue[]`
      (in-progress/waiting orders) + `state.hangar[]` (finished vehicles), `SAVE_VERSION`
      →19 with forward-compat defaults on both load paths. **Queue from the bench**
      (`queueBuild` → `canQueue` feasibility, build cost paid up front, materials drawn
      and cadence load registered *now*); the order builds over its locked `buildMonths`
      during `advance()` via `tickBuildQueue()`. **Assembly Bays level now also sets
      parallel build slots** (`buildSlots()`=bays level: L1=1 → sequential, exactly
      today's feel; each level adds a concurrent slot) — a tangible *new* payoff for the
      Bays line, balance-neutral for non-users. Finished vehicles roll to the **hangar**
      and **launch on demand** (`launchFromHangar` loads the snapshot, validates, flies
      `prebuilt`), **skipping the build wait & cost** — the timing lever for tight launch
      windows and sustained cadence. Threaded a `prebuilt` flag through
      `launch`/`canLaunch`/`proceedLaunch` (and the weather-pause handlers) so a hangar
      flight charges only launch+test+rehearsal, advances only the launch month, and does
      **not** re-incur cadence/materials. **Total cost is identical to building on
      demand** — a timing tool, not a discount. `cancelOrder` refunds an un-started order
      (scraps a started one); `scrapHangar` clears finished stock. New **🏗 Production
      queue & manifest** panel in the Manufacturing tab (in-progress bars + ETA, waiting
      orders, hangar with Fly/Bench/Scrap) and a **⊕ Queue this build** button + a
      hangar-ready "Fly from hangar" shortcut on both bench readouts. Validated headlessly
      (`/tmp/ov-queue.js`, 38/38): defaults/save-version, `buildSlots`=bays, `canQueue`
      gating (Δv/affordability/queue-full), `queueBuild` economics + order shape + cadence
      registration, **sequential at L1 vs parallel at L3**, completion→hangar, `advance()`
      integration, cancel-refund vs scrap-no-refund, `launchFromHangar` end-to-end, the
      **prebuilt economics** (skips build months + excludes build cost from affordability +
      no double cadence), **balance equivalence** (queued cost == on-demand build cost),
      save/load + legacy default, and render smoke (empty + populated). All #20 suites
      green (30/30/26/22); render 11/11.
      *(Primary home for Strategic-Vision Phase 3 (v2.5) — now essentially complete: the
      capacity layer (bays/foundry/pads), raw-material supply chains, build-cadence
      pressure + bottleneck management, quality-assurance feeding the #16 reliability
      model, reusable-hardware refurbishment (ties to M5), forecasting/inventory, and the
      production queue/manifest are all shipped. Only the deeper "build named
      engine/tank/habitat **sub-assemblies**" vision remains as a future direction.)*
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
- [x] **13 · Map as planning tool** — *Built 2026-06-21.* Selecting a body on the
      Solar map now opens a **Mission planning** section in the body card (shared by
      both the Phaser `MapScene` and the SVG fallback, since both call
      `renderBodyCard`). Pure, headless-testable planners drive it: `bodyMissions`
      (a body's missions), `nextWindowFor` (soonest *future* transfer window + index,
      countdown, and geometry label — reuses `windowsFor`/`absMonth`/`monthToDate`),
      `bodyRoutes` (LEO-depot status + tonnage and on-site **ISRU** detection/online
      state via `ISRU_FREE_LEG`), `missionPlan` (lead time `buildMonths+1+test`,
      transit months, availability via `missionFlyable`, base + geometry-adjusted
      payout), and `bodyPlan` (composes them + finds the transfer-injection leg, total
      Δv, and the soonest window across the body's missions). The card now shows
      **propellant-route pills** (depot ready/empty/locked, ISRU online/locked), the
      **transfer opportunity** (injection leg Δv, flagged window-dependent), the
      **soonest window**, and per-mission rows enriched with payout, lead/transit
      time, next-window date + payout-×geometry, unmet-requirement hints, and a
      one-click **Commit window** action (into the existing `commitWindow`) alongside
      Fly-this. So clicking Mars answers *when can I go, how long will it take, what's
      it worth, and how do I get the propellant there* — the map plans, not just reads.
      Validated headlessly (33 checks): window selection/advance-past-closed, route
      detection + depot/ISRU online flips, lead-time + geometry-adjusted payout math,
      availability gating, soonest-window selection, empty/unknown-body guards, and a
      `renderBodyCard`/`renderMap` smoke across all bodies incl. late-game state.
      *Still open (later slices):* per-mission cost estimate against a recomputed
      vehicle (currently lead-time + payout only), and depot-route cost/ROI overlays
      drawn on the map itself.
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
~~8 (politics, first slice)~~ ✓ → ~~7 (manufacturing, first slice)~~ ✓ →
~~13 (map as planning tool)~~ ✓ → ~~M5 (reusability & rapid cadence)~~ ✓ →
**next: the R&D Deep Expansion epic (see its own section below — now the primary
near-term focus), then remaining arc (deeper #8, map cost/ROI overlays)**.
(Passive-income contracts shipped 2026-06-21; #7 production queue shipped 2026-06-22.)
Items 1/2/3/4/5/9/10/11/12/13/14/15/16/17 + M5 shipped + #7 fully built (7 slices)
+ 18, 6 & 8 first slices; tech tree now a real swimlane graph with divergent
routes. (#6 is being supplanted by the R&D Deep Expansion epic. #7 is complete —
supply chains, build-cadence pressure, QA→reliability, inventory/forecasting,
refurbishment, and the production queue/manifest all shipped; only the deeper
"build named sub-assemblies" vision remains. #8 later slices: budget shocks,
shareholders, media, stock market.)

## R&D Deep Expansion — The Research Pillar (epic)

Source: a game-design proposal (2026-06-21) to make R&D one of the *major*
gameplay pillars — transform research from "research thing → unlock thing" into
"develop an entire aerospace ecosystem over decades." The headline: roughly
**triple/quadruple the tech tree** to **~100–125 nodes across 13 tracks**, add
**Tech Levels** (keep-investing technologies), **Research Divisions** (teams that
gate research speed), and **Breakthrough Events**, and make every major mission
demand progress across several independent tracks.

**Decisions taken with the user (2026-06-21):**
- **Priority — capture now, build *next*.** This epic is the **primary near-term
  focus**, ahead of passive-income / deeper #7-#8 / map ROI overlays. It expands
  and largely supersedes forward-arc **#6 (Multi-path tech tree)**; #6's open
  "later slices" (TRL, partnerships, reusable route) fold in here.
- **Balance — rebalance for a decades-feel** *(a deliberate departure from the
  project's prior "balance exactly preserved" ethos)*. The larger tree is allowed
  to **re-gate and lengthen** progression so research genuinely spans decades:
  early game slows, existing missions get retimed behind richer prerequisite
  chains. **Implications to honour during the build:** (a) every milestone still
  needs a *reachable* path (no dead-ends / unwinnable gates); (b) the rocket
  equation is still never touched — only gating, cost, time, and economy move;
  (c) old saves must survive (forward-compat defaults; a one-time research
  reconciliation on load, granting prerequisite nodes implied by already-completed
  research/missions so nobody is soft-locked); (d) re-validate that each era's
  flagship mission is still flyable once its new prerequisites exist. Each slice's
  headless harness must include a "reachability" check, not just unit math.
- **Scope — full epic.** Track-by-track sub-plans **with the proposal's node
  chains listed** (not full per-node stat specs yet), plus all three meta-systems
  (Tech Levels, Research Divisions, Breakthrough Events) and heavy mission-gating.

**Current baseline (what we're expanding from):** 32 nodes / 7 tracks —
`propulsion`(8), `structures`(8), `crew`(4), `deepspace`(4), `refueling`(4),
`nuclear`(2), `assembly`(2). Critically, today's **`structures` track bundles
three of the proposed tracks**: materials (`alloy_tanks`, `balloon_tanks`,
`composite_structures`), testing/reliability (`test_program`, `flight_telemetry`,
`qa_program`, `vibration_testing`), and an avionics node (`redundant_avionics`).
`curRel()` already sums every completed node's `effect.reliability`, so splitting
the track is safe. The tech-tree UI is already a swimlane graph (`techLayout()` /
`renderTechTree()`) keyed on each node's `track`, so adding tracks + nodes is
mostly data plus lane-layout work.

### Target track structure (13 tracks)

Legend: **[E]** expand existing · **[S]** split out of today's `structures` ·
**[R]** rename+expand · **[N]** new track. Existing node ids marked ✓.

**T1 · Propulsion [E]** — branch the currently-linear line.
- *Chemical core:* Alcohol/LOX ✓(base) → RP-1 Combustion Stability → Turbopump
  Engineering → Regenerative Cooling → High Chamber Pressure. (folds `kerosene`✓,
  `sustainer`✓, `heavy_booster`✓, `super_heavy`✓)
- *Cryogenic branch:* Cryogenic Propellants ✓(`cryo_upper`) → Hydrogen Storage →
  Expander Cycle → Staged Combustion → Advanced Cryo Upper Stages.
- *Methane branch (new):* Methane Propulsion → Deep Throttling → Full-Flow Staged
  Combustion → Rapid Reusability (ties T11).
- *Electric branch (new):* Ion Thrusters → Hall-Effect Thrusters → High-Power SEP
  → MW-class Electric (meshes with Nuclear T9 `nuclear_electric`✓).
- *Solid branch (new):* Solid Propellant Casting → Segmented Solid Motors → Strap-on
  Booster Integration. Home of the solid-rocket engine class + side-booster mechanic —
  see **§ Vehicle Architecture — Side Boosters & Solid Rockets** for the full plan.
- Also holds `vac_upper`✓, `hypergolic`✓. Effects: +Isp, +reliability, +thrust,
  bigger engines.

**T2 · Structures & Materials [S]** — Riveted Steel → Aluminum Alloys
✓(`alloy_tanks`) → Monocoque → Honeycomb Panels → Friction Stir Welding →
Composite Structures ✓(`composite_structures`) → Carbon-Fiber Cryotanks →
Self-Healing Materials. (`balloon_tanks`✓ sits on the alloy→composite line.)
Effects: lower dry mass (σ), reduced cost, +reliability, larger payloads.

**T3 · Guidance & Avionics [N]** — Radio Guidance → Inertial Navigation → Digital
Flight Computers → Redundant Computers ✓(`redundant_avionics`) → Star Trackers →
Autonomous Navigation → AI Mission Management (bridges T12). Effects: +launch
reliability, −mission-failure chance, unlocks automated docking + deep-space.
**Hard gate example:** Digital Flight Computers required for Mars-class missions.

**T4 · Crew Systems [E]** — Pressure Suit Systems → Environmental Control
✓(`eclss_partial`/`eclss_closed`) → Orbital EVA → Docking Airlocks → Long-Duration
Habitats → Artificial-Gravity Research → Radiation Countermeasures →
Interplanetary Habitats. (`crew_capsule`✓, `launch_escape`✓ feed the front.)

**T5 · Manufacturing & Production [N]** *(research track; feeds the #7 capacity
layer)* — Hand Fabrication → Assembly-Line Production → Modular Vehicle Design →
Computer-Aided Manufacturing → Automated Assembly → Rapid Prototyping → Additive
Manufacturing → Fully Automated Factory. Effects: shorter build times, lower
vehicle cost, larger production queue. **Cross-ref #7** (production lines /
`buildMonths` / `vehicleUnits` / foundry) — research here should *raise the
ceilings* the #7 resource layer operates within.

**T6 · Testing & Reliability [S]** — Static Fire ✓(`test_program`) → Engine Test
Stands → Component Qualification → Stage Test Facilities → Integrated Vehicle
Testing → Accelerated Lifetime Testing → Failure Analysis Lab → Digital-Twin
Simulation. (folds `flight_telemetry`✓, `qa_program`✓, `vibration_testing`✓.)
Effects: +reliability, fewer catastrophic failures, lower dev cost. **Cross-ref
#16** subsystem-reliability + **#7** QA bridge.

**T7 · Ground Infrastructure [N]** — Concrete Launch Pads → Flame Trenches →
Mobile Service Towers → Vehicle Assembly Buildings → Crawler Transporters →
Cryogenic Ground Systems → Dual Launch Pads → Heavy-Lift Infrastructure. Effects:
bigger rockets possible, reduced turnaround, higher cadence. **Cross-ref #7**
(launch pads / `padLaunchMult`), **#17** (facilities), **#18** (the Space Center
scene already grows with `siteScale()` — ground-infra research should drive that).

**T8 · Orbital Operations [R]** *(rename of `assembly`)* — Orbital Rendezvous →
Manual Docking → Automated Docking ✓(`auto_rendezvous`) → Orbital Construction
✓(`orbital_assembly`) → Station Keeping → Large Space Stations → On-Orbit Servicing
→ Orbital Shipyards. **Cross-ref #17/#21** (stations/shipyards) and #6's assembly
route.

**T9 · Nuclear Technologies [E]** — keep `nuclear_thermal`✓ / `nuclear_electric`✓;
add upstream/downstream nodes (reactor materials, NTR restart, bimodal NTR, surface
fission power → ties **#21** colony power, gated on Lunar/Mars Base).

**T10 · Refueling & ISRU [E]** — keep `orbital_depot`✓, `lunar_isru`✓,
`mars_isru`✓, `belt_volatiles`✓; cryo-depot boil-off control node shipped as a
gate (`cryo_boiloff_control`✓) but still `effect:{}` — the boil-off *mechanic*
(and thus closing the long-open scoping note) is pending; add electrolysis
scale-up, mobile ISRU. **Cross-ref #2** fuel market.

**T11 · Reusability [N/E]** *(extends shipped M5)* — Parachute Recovery → Powered
Landing → Precision Landing ✓(`propulsive_landing` = M5) → Rapid Inspection →
Reusable First Stage → Reusable Upper Stage → Full Vehicle Reuse. Effects:
escalating launch-cost reduction (M5's refly economics are the first rung).

**T12 · Automation & AI [N]** — Flight Automation → Automated Range Safety →
Autonomous Mission Ops → Fleet Autonomy → AI R&D Assistant (cross-feeds research
speed) → AI Mission Management (shared capstone with T3). Effects: reduces
crew/ops burden, enables uncrewed deep-space + high-cadence ops.

**T13 · Science & Exploration [N]** *(research track distinct from the `state.science`
currency in #14)* — Earth Observation → Planetary Science → Astronomy Instruments
→ Astrobiology → Geology Labs → Sample-Return Science → Exobiology → Advanced
Research Institutes. Effects: +mission science yield (feeds #14), unlocks special
contracts + prestige missions. **Cross-ref #14** (science is the currency; this
track is the multiplier + unlock chain).

### Meta-systems (all three in scope)

- **Heavy mission-gating** *(extend existing `reqMissionDone`)* — many nodes gate
  on flown missions, e.g. Orbital EVA ⇐ Crewed Orbit, Mars EDL ⇐ Mars Flyby,
  Orbital Shipyards ⇐ Space Station, Nuclear Surface Power ⇐ Lunar Base. Already
  supported by `researchAvailable()`'s `reqMissionDone`; just author more of them.
- **Technology Levels** *(new mechanic)* — flagship technologies become
  multi-level (e.g. Cryogenic Engines L I Atlas-Centaur → L II Saturn → L III
  Shuttle → L IV modern-reusable). Players keep investing capital/time/science for
  escalating effect. Mechanically analogous to the #7 production lines (level,
  escalating cost, per-level effect) — reuse that pattern (`prodLevel`-style) for
  research. New `state.techLevel[id]`; forward-compat default L1 for completed
  nodes.
- **Research Divisions** *(new; overlaps M6 + #19)* — group R&D into divisions
  (Propulsion / Structures / Life Sciences / …), each with skill, experience,
  morale, budget; **research speed depends on division quality** for that node's
  track. Generalises today's flat `engRdSpeedBonus()` into per-track speed.
  **Cross-ref M6** (engineers/morale/attrition), **#9** (traits), **#19**
  (departments) — Divisions are the concrete first slice of #19, scoped to R&D.
- **Breakthrough Events** *(new; extends #9)* — rare events ("BREAKTHROUGH! …
  cryogenic research time −40%") that shock a track's cost/time. Today #9's
  personnel breakthroughs already shave one research month — generalise into
  track-scoped, division-driven breakthroughs (higher-skill/morale divisions roll
  them more often). **Do not duplicate #9** — extend the same event plumbing.

### Era node-count targets (~100–125 total)

Rocketry/Early ~20 · Orbital ~25 · Lunar ~30 · Interplanetary ~30 · Far-Future
~20. Each era's flagship mission should require progress across several tracks
(Propulsion + Structures + Guidance + Crew + Ground + Ops + Manufacturing +
Science), not a single line — that's the "decades-long effort" feel.

### Suggested build order (slices)

1. ✅ **Track split (foundation, low risk)** — *Built 2026-06-21.* Split today's
   `structures` track into **Structures & Materials** (3 materials nodes),
   **Testing & Reliability** (`test_program`, `flight_telemetry`, `qa_program`,
   `vibration_testing`), and **Guidance & Avionics** (`redundant_avionics`);
   relabelled `assembly`→**Orbital Operations** (track key kept for back-compat).
   Pure data: 2 new `TRACKS` entries + node `track` reassignments; `techLayout()`
   is fully data-driven so lanes/legend/colors follow automatically. Balance-neutral
   — `curRel()` sums `effect.reliability` across all tracks and `researchTier`
   keys off `req` chains, both track-agnostic. Validated headlessly (28 checks):
   TRACKS shape + distinct colors, no orphan tracks, every node reassigned
   correctly, node count unchanged (32), `curRel()` rises by exactly the summed
   0.25 across the now-split tracks, `techLayout` places every node with one lane
   per non-empty track (in order) and no (x,y) collisions, plus a tech-tree render
   smoke. No regression in the M5 (31) or #13 (33) suites.
2. ✅ **Early-era content + first rebalance pass** — *Built 2026-06-21.* Added a
   first wave of **9 early nodes** as capability/maturity **gates** (no direct stat
   effect yet — pure time+capital sinks that lengthen the road, so the rocket
   equation and reliability ceilings stay untouched; quantitative +Isp/+thrust
   effects await the engine-model extension noted below): Propulsion refinement
   chain — `combustion_stability`→`turbopump`→`regen_cooling`→`chamber_pressure`;
   Guidance front — `radio_guidance`→`inertial_nav`→`digital_computer`; Testing
   front — `engine_test_stands`→`stage_test`. **Decades-feel re-gating** threads
   the new tracks through the existing ladder: `sustainer` now sits behind
   `combustion_stability`; `heavy_booster` behind `turbopump`+`engine_test_stands`;
   **the whole deep-space era (`deep_space`) now requires `digital_computer`
   + `stage_test`** (Moon/Mars need flight computers + integrated-stage testing),
   and `super_heavy` (F-1) behind `chamber_pressure` — so the lunar era demands
   built-up Propulsion + Guidance + Testing, not a single line. Early *orbital* path
   is deliberately untouched (`first_sat` still has no research gate; new nodes carry
   no σ/reliability/engine effect). **Save safety:** new `reconcileResearch()` runs
   on both load paths — it transitively backfills every completed node's
   (now-deeper) prerequisites and re-applies engine unlocks, so a legacy save with
   `deep_space` done but the new guidance/testing gates unresearched can never
   soft-lock. Validated headlessly (29 checks) incl. the **reachability proof**
   (closure from prerequisite-free roots covers all 41 nodes — no orphans/cycles;
   every engine-unlock node reachable), the re-gates, fresh-start gating via
   `reqsMet`, and reconciliation (no completed node left with an unmet prereq,
   idempotent, fresh-game no-op); 8-tab render clean; slice 1 (28), M5 (31), #13
   (33) suites still green. *Deferred to slice 2b:* the remaining ~10 early nodes
   (materials front, more crew/guidance) and **quantitative node effects**, which
   need a small engine-model extension (research-driven Isp/thrust/σ deltas) so
   gates can also confer measurable performance.
2b. ✅ **Engine-model extension (research-driven performance)** — *Built
   2026-06-21.* New `effect.isp` / `effect.thrust` node-effect vocabulary +
   accumulators (`researchEffectSum`, `ispMult`, `thrustMult`) capped at +10% Isp /
   +15% thrust, wired into `stackPerformance` (Isp scales each stage's effective
   Isp; thrust scales liftoff TWR) and reflected in the shown Δv equation. **The
   rocket equation itself is untouched — only its Isp/thrust *inputs* scale**, and
   the buff is applied to the **launch vehicle only**: in-space transfer/lander legs
   are deliberately not scaled, so deep-space mass ratios stay as balanced and the
   effect is bounded to ascent. The 9 slice-2 gates now confer measurable effect:
   propulsion chain → Isp/thrust (combustion +4% thrust, turbopump +5% thrust,
   regen +4% Isp, chamber +4% Isp/+5% thrust; sums 0.08 Isp / 0.14 thrust, both
   under cap), guidance + testing fronts → small reliability (+0.02–0.03 each,
   bounded by the existing `relCap`). Effects stated in each node's description
   (the detail panel shows `desc`) and in a new bench-readout flag + the completion
   log. Validated headlessly (25 checks): effect assignment, multiplier
   accumulation + clamp formula, Δv/TWR scaling *exactly* by the multipliers,
   **in-space legs provably unchanged**, reliability into `curRel` within cap, and
   monotonic "research only ever helps flyability"; 8-tab render clean; slice 1
   (28), slice 2 (29), M5 (31), #13 (33) suites green. *Still deferred:* the
   remaining ~10 early-era nodes (materials front, more crew/guidance) — content,
   now that the effect machinery exists.
- ✅ **Tech-tree hover tooltips** — *Built 2026-06-21.* Hovering any tech node pops
   a rich `#techTip` card: name + track chip + status/cost, a derived **benefits &
   modifiers** block (`techModifierText` — engine unlock w/ Isp+thrust, +Isp/+thrust,
   +reliability, σ, capability unlock, or "leveled technology" w/ per-level effect &
   current level), the full description, the **real-world example** (the existing
   `.hist` note), and the requirement chain. Cursor-following, edge-flipping,
   pointer-events-none overlay; replaced the plain SVG `<title>`. Validated (10
   tooltip-content checks across every node type; never throws); suites green.

3. ✅ **Tech Levels mechanic** — *Built 2026-06-21.* Flagship technologies you keep
   investing in. `TECH_LEVELS` config + `state.techLevel` (`SAVE_VERSION`→7,
   forward-compat default `{}`; a researched leveled tech with no entry reads as
   L1). Helpers mirror the #7 production-line pattern: `techLevel`/`techLevelName`/
   `techUpgradeCost` (escalates ×`costMul`)/`canUpgradeTech`/`upgradeTech` (deducts
   capital, `advance`s the dev months, raises the level). Level effects feed the
   **same** isp/thrust/reliability accumulators (`techLevelEffectSum` folded into
   `researchEffectSum` + `curRel`), so the existing caps still bound performance.
   Shipped tech: **Cryogenic Engines** (L1 Atlas-Centaur → L2 Saturn → L3 Shuttle →
   L4 Modern Reusable; +2% Isp/level beyond L1). The tech-tree detail panel now
   shows level/max + the per-level effect + an Upgrade button for a researched
   leveled tech (and "max level" when capped); `completeResearch` seeds L1.
   Validated headlessly (27 checks): config, L1 seeding, cost escalation, upgrade
   (level↑ + capital↓ + time advance), max guard + no-op, research/funds/busy
   guards, accumulator feed (+ global-cap clamp when combined with the propulsion
   chain), exact Δv scaling on a fixed design, save default/version, old-entry→L1,
   and detail-panel render; 8-tab render clean; slice 1/2/2b + M5 + #13 suites
   green. *Next leveled techs* (engines, materials, etc.) are now just `TECH_LEVELS`
   entries.
4. ✅ **Research Divisions** — *Built 2026-06-21.* Org-level depth above individual
   engineers (M6) and the first concrete slice of arc **#19**. `DIVISIONS` (5 teams,
   each covering a few tracks — Propulsion[+nuclear], Structures & Test[+testing],
   Avionics & Software[guidance+assembly], Life Sciences[crew], Deep Space[+refueling];
   every track covered exactly once) + `state.divisions` (`SAVE_VERSION`→8,
   forward-compat default `{}`; a missing entry reads defaults skill 0.40/exp 0/
   morale 60). A division's **quality** = 0.5·skill + 0.3·experience + 0.2·morale
   drives `divisionSpeedBonus` (a pure +0–25%/mo R&D accelerator for projects in its
   tracks), folded into the existing R&D tick beside `engRdSpeedBonus`
   (`divisionForResearch`/`divisionQuality`/`divisionSpeedBonus`). **Experience**
   grows as a division ships projects (`divisionGainExp` in `completeResearch`);
   **morale** drifts with company finances each month (`tickDivisionMorale`);
   **training** spends escalating capital to raise skill (`trainDivision`). New
   Research Divisions panel in the R&D tab (per-division track chips, skill/exp/
   morale bars, live +%/mo, the active project's division highlighted, Train
   button). Validated headlessly (27 checks): full track coverage (no gaps/overlap),
   quality formula + range, speed-bonus scaling, training (skill↑ capped + cost
   escalation + morale + funds/maxed guards), exp accrual, morale drift by solvency,
   the bonus accelerating the R&D tick (top division finishes ≤ a poor one), save
   default/version + old-save defaults, and a panel render; 8-tab render clean;
   slice 1/2/2b/3 + M5 + #13 suites green.
5. ✅ **Breakthrough Events** — *Built 2026-06-21.* The division-driven sibling of
   the #9 personnel breakthroughs (**extends, doesn't duplicate**: #9 is staff/trait-
   driven and still fires; this one keys off the active project's **covering
   division**). `checkDivisionBreakthroughs()` runs each month in `advance()`: a
   higher-quality division rolls a breakthrough more often (chance = `BREAK_BASE` +
   quality·`BREAK_QUALITY_SCALE`), each shaving 1–2 months off the active project
   (more for high quality, floored at 1 mo), lifting the division's morale and
   awarding rep, with a flavored, track-specific "⚡ BREAKTHROUGH!" log line.
   Rate-limited by its own `state.breakthroughCooldown` (`SAVE_VERSION`→9; missing
   field defaults gracefully). Surfaced in the Divisions panel blurb. Validated
   headlessly (20 checks, deterministic RNG): fires/shaves/cooldown/rep/log,
   quality→shave (1 vs 2 mo), cooldown blocks back-to-back, roll can fail,
   **monotonic chance** (mid-roll fires for a top division but not a poor one),
   guards (no active research, 1-mo floor, no staff needed), save default/version;
   plus a 200-month long-run smoke (12 breakthroughs, rate-limited, no errors);
   slice 1/2/2b/3/4 + M5 + #13 suites green.
6. 🟡 **Mid/late-era content (first wave)** — *Built 2026-06-21.* Grew the tree
   **41 → 78 nodes** and completed the 13-track vision: added the **5 missing
   tracks** — Manufacturing & Production, Ground Infrastructure, Reusability
   (`propulsive_landing` moved here), Automation & AI, Science & Exploration — and
   deepened every existing track with mid/late-era nodes (materials ladder extended
   to σ 0.042, testing/guidance/crew/deepspace/nuclear/refueling/orbital-ops chains),
   **heavily mission-gated** via `reqMissionDone` (Orbital EVA⇐Crewed Orbit, Precision
   EDL⇐Mars Flyby, Surface Fission Power⇐Lunar Landing, Astrobiology⇐Mars Orbit, etc).
   All effects use the existing vocabulary (σ / reliability / Isp / leveled / gate),
   so balance stays bounded; several new-track nodes are honest capability gates
   pending effect-wiring (see remaining). Divisions broadened to cover all 14 tracks;
   2nd leveled tech added (Flight Computers). Validated headlessly (slice-6 suite
   23/23: 78-node count, 14 tracks, **full reachability proof** from roots, no
   dangling reqs, valid mission gates, division coverage, monotonic σ ladder,
   flyability preserved, reconcile over the deeper chains, render/tooltip smoke) +
   8-tab all-78-researched render clean; all prior suites green.
6b. ✅ **Effect-wiring for the new-track nodes** — *Built 2026-06-21.* Gave the
   Slice 6 gate nodes real, capped economy effects via three new accumulators
   (mirroring the 2b Isp/thrust pattern, all fed by `researchEffectSum`): `mfgBuildMult`
   (Manufacturing + Reuse → −build cost, cap 30%, wired into `computeVehicle` buildCost),
   `groundLaunchMult` (Ground + Reuse → −launch-ops cost, cap 30%, into the launchCost
   base), and `sciYieldMult` (Science track → +mission science yield, cap 50%, into the
   `sciGain` grant). 15 nodes assigned new effect keys (`buildCostCut`/`launchCostCut`/
   `sciYield`; manufacturing nodes carry reliability *and* build-cut). Effects now show in
   the **tooltip** (`techModifierText` extended) and the **click detail panel** (reuses
   `techModifierText` — no per-desc edits), plus a 🏭 bench-readout flag for active
   build/launch savings. Validated headlessly (20 checks): baselines, accumulation, the
   science-yield cap clamp, all three caps, exact buildCost/launchCost scaling in
   `computeVehicle`, per-mission science gain rising, tooltip/detail display, render smoke;
   all prior suites green (slice 1/2/2b/3/4/5/6 + M5 + #13).
6c. ✅ **Industrial build-time** — *Built 2026-06-21.* Gave Manufacturing & Ground
   real *time* weight (they previously cut only cost): new `buildTimeCut` effect key +
   `buildTimeCut()` accumulator (cap **3 mo**, fed by `researchEffectSum`), wired into
   `buildMonths` (rounded, still floored at 1, stacking with bay-capacity and M5 refly).
   Assigned to 6 nodes (assembly_line/modular/cad 0.5, additive 1.0, mobile tower &
   cryo-ground 0.5; total 3.5 → clamps at 3) as multi-effects alongside their existing
   cost cuts. Shown in tooltip/detail (`techModifierText`) and the 🏭 bench-readout flag.
   Validated headlessly (14 checks): effect assignment + multi-effect preservation,
   accumulation + cap clamp, `buildMonths` shave (1 mo and capped 3 mo), 1-month floor,
   tooltip display, render smoke; all prior suites green.
6d. ✅ **Far-future / capstone tier** — *Built 2026-06-21.* Grew the tree **78 → 98
   nodes** with a 20-node endgame wave capping every track and gated to the deepest
   missions (Orbital Shipyards ⇐ Mars Orbit; Megastructure Construction, Fusion
   Propulsion Research, Atmospheric ISRU ⇐ Jupiter Orbit; Artificial Gravity ⇐ Mars
   Orbit): full-flow staged combustion, bimodal NTR, Full Vehicle Reuse, metamaterial
   structures (σ→0.040), quantum nav, fleet autonomy, closed-ecology life support,
   aerocapture/gravity-assist, Heavy-Lift Infra + Dual Pads, Exoplanet Survey + Research
   Institutes, Fully Automated Factory, etc. Effects reuse the capped vocabulary
   (reliability / σ / buildCost / launchCost / sciYield / buildTime), so the caps keep
   balance bounded. **Two more leveled techs** added (`full_vehicle_reuse` → launchCostCut/
   level, `automated_factory` → buildCostCut/level), demonstrating leveled *economy*
   effects. Validated headlessly (19 checks): 98-node count, all 20 present, no dangling
   reqs, valid deep-mission gates, **full reachability proof**, monotonic σ ladder to
   0.040, all economy caps still clamp with everything researched + both new techs at L3,
   leveled-tech accumulator feed, flyability preserved, reconcile over the deepest chain,
   render/tooltip smoke; 8-tab all-98-researched render clean; all prior suites green.
   *Remaining (slice 6e+):* the last ~15 nodes toward the 125 ceiling; TRL/research-
   partnerships (#6 leftovers); Ground→true launch-cadence (the fixed +1 campaign month).
- ✅ **Crew life-support recycling effect** — *Built 2026-06-21.* Fixed a gap the
   player spotted: the crew-track research nodes only granted *reliability* — they
   didn't reduce the consumable/supply mass that is the whole point of life-support
   tech (only the ECLSS tier's `recovery` did). New `lsRecovery` effect key +
   `lsRecoveryBonus()`/`eclssRecovery()`: crew research now pushes consumable recovery
   **above** the base ECLSS tier (`consumables = crew·days·5kg·(1−recovery)`), capped at
   `LS_RECOVERY_CAP` 98% (never a perfect closed loop) and gated to only apply once you
   actually have a recycling system (partial/closed tier, not open-loop). Assigned to
   **Long-Duration Habitats** (+2%) and **Closed Ecological Life Support** (+7%,
   bioregenerative) as multi-effects beside their reliability. The saved mass flows
   through `lvPayload` into the rocket equation. Surfaced in the Crew & Life Support
   bench card (effective recovery + a recycling-research note) and the node tooltips.
   Validated headlessly (17 checks): effect assignment, recovery raise + cap clamp,
   consumables drop matching the formula, **open-loop gets no bonus** while partial/closed
   do, `lvPayload` shrinks, tooltip, render; all 13 prior suites green.
- ✅ **Propulsion branch expansion** — *Built 2026-06-21.* Built out the three missing
   propulsion branches from the original design sketch (98 → 107 nodes; propulsion track
   12 → 21). **3 new engines** (pure data — the stage/transfer selectors are already
   `unlocked`/`transferOnly`-filtered): **Methalox Full-Flow** (Raptor-class — high Isp
   *and* high thrust, launch-vehicle usable) and two solar-electric transfer drives,
   **Hall-Effect** (Isp 1800) and **Gridded Ion** (Isp 3600, both `transferOnly`+
   `lowThrust`). **9 nodes** across: *methane* (`methane_propulsion`→methalox,
   `deep_throttling`), *electric* (`ion_propulsion`→ion, `hall_effect`→hall,
   `high_power_sep`, `megawatt_electric` ⇐ Belt Survey), and *deeper cryogenic*
   (`hydrogen_storage`→`expander_cycle`→`advanced_cryo_upper`, the last bringing the Isp
   accumulator to its 0.10 cap). Validated headlessly (23 checks): engines + flags,
   node/track counts, engine-unlock effects + actual unlock on completion, reachability,
   mission gate, **selector routing** (electrics transfer-only, methalox on LV stages),
   Isp-cap clamp, and a methalox launch-vehicle design that computes + renders; all prior
   suites green (13 total).
- ✅ **Radiation — equipment + personnel + career dose** — *Built 2026-06-21.* Turned the
   previously-binary rad techs into a real mechanic. Per-mission **dose = environment ×
   duration**: `RAD_ENV` per destination (LEO 1 → Lunar 2 → interplanetary 3 → Belt 4 →
   Jupiter 9), `radSeverity` saturating in [0,1) — **negligible for LEO/short flights (so
   existing early/mid balance is exactly preserved)**, severe on long deep missions.
   **Equipment:** radiation multiplies the **avionics** subsystem fragility (`radEquipMult`,
   bought down by `rad_shielding` + `redundant_avionics`). **Personnel:** it multiplies the
   **life-support** fragility (`radCrewMult`, bought down by `radiation_countermeasures` +
   `rad_shielding` + `closed_ecology`). Both feed the #16 product-preserving subsystem
   model, and `effectiveReliability` takes a bounded overall penalty (`radRelPenalty`, ≤12%,
   mitigated). **Astronaut career dose:** the assigned crew accumulate `dose` on surviving
   crewed flights (`applyCrewDose`, per-mission capped, shielding-reduced); at
   `RAD_CAREER_LIMIT` they're force-retired — unshielded ≈3 Mars missions, shielded ≈8.
   Surfaced: a ☢ dose bar on astronaut cards (warns near the limit) and a ☢ radiation flag
   in both bench readouts (env, shielding state, equipment/crew fragility ×). Validated
   headlessly (26 checks): env/severity scaling + LEO≈0, shielding cuts equip/crew mults
   (never below 1×), bounded reliability penalty + mitigation flowing into
   `effectiveReliability`, subsystem report on a high-rad crewed mission, career-dose
   accumulation + per-mission cap + shielding reduction + force-retirement + no-op guards,
   render smoke; all 14 prior suites green.
- ✅ **Power — Phase 1 (solar-electric needs sunlight)** — *Built 2026-06-21.* First
   step of the power model, tying the electric + nuclear tracks. The ion/Hall drives are
   flagged `solarElectric`; a `SOLAR_FLUX` map (∼1/r²: Earth 1 → Mars 0.43 → Belt 0.11 →
   Jupiter 0.037) + `solarElectricViable`/`solarElectricBlocked` gate them. `canLaunch`
   now blocks a solar-electric transfer drive on outer-system missions (below 20% of
   Earth's sunlight — Belt/Jupiter) with a clear reason, so the outer system **forces a
   nuclear-electric (NEP) reactor drive** (which works anywhere); inner-system electric
   (to Mars) still flies. Surfaced proactively as a ☀ viability note in the transfer card.
   Validated headlessly (17 checks): engine flags, flux falloff, viability by destination,
   blocked only when profile+transfer+solar-electric+outer, `canLaunch` enforcement +
   clear reason, NEP/chemical/Mars all unblocked, render; all 15 prior suites green.
   *(Superseded by Phase 2 below — the engine-level block became a general power-source rule.)*
- ✅ **Power — Phase 2 (supply-vs-demand budget)** — *Built 2026-06-21.* The full power
   model. `powerDemand(m)` = baseline comms (more in deep space) + ECLSS (crew × tier;
   closed-loop is power-hungry) + electric-drive draw (`powerDraw`: ion 25 kW, Hall 15).
   A chosen **power source** (`state.powerSource`, `SAVE_VERSION`→10) — Solar (12 kW/t,
   ∝ sunlight), RTG (0.6 kW/t anywhere), or Fission Reactor (6 kW/t anywhere, gated on
   `nuclear_electric`) — must supply it; `powerSystemMass = demand / specific-power` is
   added to `lvPayload` (so the power plant rides the rocket equation). **NEP self-powers**
   (its onboard reactor covers the craft, mass 0). `powerViable`/`canLaunch` block a
   non-viable source (solar below 20% sunlight in the outer system, or an un-researched
   reactor) with a clear reason — **generalising & replacing the Phase-1 engine block**, and
   now ion+reactor = a nuclear-electric craft that *can* run in the outer system. New
   **Power bench card**: source picker (per-source mass estimate), demand breakdown, specific
   power at the destination, plant mass, and a viability flag. Validated headlessly (27
   checks): sources/flags, demand breakdown + electric draw, distance-scaled vs flat specific
   power, mass into payload (heavier source → more payload), viability matrix
   (solar-outer-blocked / RTG / reactor-gated / NEP self-powered / inner-solar-OK), canLaunch
   enforcement + reactor clearing it, `setPowerSource` research gate, save default/version,
   render across combos; all 15 prior suites green.
- ✅ **Reactor → radiation link** — *Built 2026-06-21.* Closes the loop between the
   power and radiation systems: an onboard reactor (the Reactor power source, or a
   self-powered NEP) — and to a lesser degree RTGs — irradiate the **crew**. `powerRad(m)`
   (solar 0, RTG 0.15, reactor/NEP 0.4) feeds a duration-weighted `reactorCrewLoad` into
   `radCrewMult` and an extra term into the `applyCrewDose` career dose, both **mitigated by
   shielding/countermeasures**. Zero when the source is solar, so the prior radiation model
   is exactly preserved (rad suite still 26/26). Equipment fragility is deliberately
   untouched (crew-proximity effect). Surfaced in the bench radiation flag, which now shows
   even on shorter missions when a reactor is aboard ("+ onboard Fission Reactor / NEP
   reactor"). Validated headlessly (13 checks): powerRad by source incl. NEP, crew fragility
   reactor>RTG>solar, shielding mitigation, solar-unchanged-formula proof, equipment
   untouched, career dose adds + shielding reduces, render; all 16 prior suites green.

### Cross-reference map (this epic ↔ existing items)

- **#6 Multi-path tech tree** — parent item; this epic *is* its expansion.
- **#7 Manufacturing capacity** — T5 (research) raises the ceilings the #7
  resource layer works within; T7 ground infra ↔ pads.
- **#9 Personnel personality** — Breakthrough Events extend #9; Divisions build on
  traits.
- **#14 Scientific discovery** — T13 multiplies yield for / unlocks via the `state.science`
  currency.
- **#16 Subsystem reliability** — T6 testing nodes harden subsystems.
- **#17 Infrastructure / #21 colonies** — T7/T8/T9 feed stations, shipyards,
  surface power.
- **#18 Command Center** — T7 ground-infra research drives `siteScale()` scene
  growth.
- **#19 Departments** — Research Divisions are the first concrete slice.
- **M5 Reusability ✓** — first rung of the T11 reusability chain.
- **Boil-off scoping note** — addressed by a T10 cryo-depot node.

## Vehicle Architecture — Side Boosters & Solid Rockets (epic)

Source: a user request (2026-06-21) to add **strap-on side boosters** and **solid
rocket motors** as buildable vehicle elements — the staging architecture every real
launcher from Atlas/Titan to the Shuttle, Ariane, Atlas V and SLS is built on. This is
the first time the bench models anything other than a **serial** liquid stack, so it is
both a new **engine class** (solids) and a new **vehicle-architecture mechanic**
(parallel "stage 0" boosters), with a visual payoff (strap-ons on the silhouette + in
flight).

**Decisions taken with the user (2026-06-21):**
- **Balance — preserve the existing balance (sidegrade, not power creep).** Solids and
  boosters are an *alternative architecture* (cheaper, higher-thrust, simpler — traded
  against lower Isp and no throttle/restart), gated behind new research so they don't
  trivialise the early game. Every mission that is winnable today stays winnable on the
  same timeline; the rocket equation is untouched — only new inputs (a solid engine
  class, a parallel boost phase) and gating/economy are added. *(This deliberately keeps
  the older "balance exactly preserved" ethos, unlike the R&D Deep Expansion epic.)*
- **Solid role — boosters AND standalone stages.** Solid motors can populate strap-on
  boosters *and* serve as cheap standalone lower/upper stages, so an all-solid
  small-launcher (Scout/Minuteman style) is a real, emergent option — not just
  liquid-core augmentation.

**Current baseline (what we're extending):** `state.stages[]` is a **serial** stack
(max 3), every `ENGINES` entry is liquid, and `stackPerformance()` computes Δv serially
(stage *i*'s payload = all stages above + payload; first-stage Isp = SL/Vac average,
others vacuum) with **TWR derived from the first stage only** (`sm[0].eng.thrustSL ·
count`). There is no parallel element and no solid flag. `stageMasses()` →
`computeVehicle()` → `lvPayload()` → `canLaunch()` (TWR>1 gate) → `buildCost`/
`buildMonths` (#7 `vehicleUnits`) → `subsystemReport()` (#16) → the silhouette (#10) →
the Phaser `FlightScene` all read off `state.stages`, so each is a known integration
point.

### Modeling approach (the one real physics decision)

True parallel burn (crossfeed, simultaneous core+booster thrust) is more than the serial
math supports. The plan uses a **serial-equivalent boost phase** — physically honest and
conservative (never *more* generous than reality), and validatable against the rocket
equation:
- A new `state.boosters = {eng, count, prop}` parallel cluster (count identical strap-ons;
  `count:0` = none, the current behaviour).
- **Liftoff TWR** uses combined thrust: `(core stage-1 SL thrust × count) + (booster SL
  thrust × booster count)` over total liftoff weight — so boosters are what gets a
  thrust-starved heavy core off the pad.
- **Boost-phase Δv** is added as a base segment beneath stage 1: the boosters (and,
  optionally, the core firing alongside) burn, then jettison their **dry mass + spent
  propellant** at burnout; the core continues serially from the lighter post-jettison
  mass. Modeled as an extra bottom segment in `stackPerformance`, mass-bookkept so no
  propellant is double-counted.
- Solids: a `solid:true` engine flag — high thrust, **low Isp** (~250–290 s), cheap,
  high *ignition* reliability but **no throttle and no restart** (can't be shut down once
  lit), so their failure character is distinct (feeds #16 as a `boosters`/separation
  subsystem; Challenger is the cautionary historical anchor). `ispSL`/`ispVac` are close
  (little altitude compensation). They burn their `prop` (grain mass) at a fixed profile.

### Suggested build order (slices)

1. ✅ **Solid motor engine class (data + model)** *(Built 2026-06-21.)* Three
   `solid:true` motors with historical anchors: **Castor** (strap-on/small-stage
   workhorse), **Scout-class solid stage** (small standalone/upper), and the **Segmented
   Solid Booster** (Shuttle-SRB/Ariane-EAP-class heavy strap-on). Solids are high-thrust,
   **low-Isp** (≤290 s, with SL≈Vac — little altitude compensation), cheap, very reliable
   to ignite (`rel` 0.965–0.975) but `noThrottle` (no throttle/shutdown once lit). They
   flow through `stageMasses`/`stackPerformance` unchanged (the rocket equation is
   untouched — solids are just low-Isp inputs), so they work as **standalone stages** (an
   all-solid Scout-style small launcher computes + clears the pad) *and* as strap-on
   boosters; the stage + booster selectors already accept them (filtered by
   `!transferOnly`), while `moduleOptions` now also excludes `solid` engines from in-space
   transfer/lander modules (no restart/throttle for precise burns). New `effect.engines`
   (array) research-effect vocabulary added to `completeResearch` + `reconcileResearch`
   so one node can unlock several engines. Validated (in `/tmp/ov-solids.js`): flags/Isp/
   thrust/reliability, gating, **solid stage Δv = Isp·g₀·ln(m0/mf)** at the low Isp, an
   all-solid stack flying, and in-space exclusion. Balance-preserved by physics — low Isp
   means solids never trivialise efficient orbit; they buy thrust, not Δv.
2. ✅ **Side-booster construct (parallel "stage 0") — liquid first** *(Built
   2026-06-21; built ahead of slice 1 per the user's "liquid side boosters first"
   request, using the existing liquid engines — solids fold in once slice 1 lands).*
   `state.boosters = {eng,count,prop}` (count identical strap-ons, per-booster
   propellant; `count:0` = none). `stackPerformance` now reads `boosterMasses()`
   internally — so every call site (`computeVehicle`, the `simulateMission` LV leg)
   picks boosters up automatically — and adds a **serial-equivalent boost segment**:
   the boosters lift the full wet stack and jettison their dry mass + spent propellant
   (`m0 = payload+stackWet+boosterWet → mf = …+boosterDry`, Isp = SL/Vac average since
   they fly through the atmosphere), so the core stack's own Δv above is untouched and
   `boostDv` adds on top. **Liftoff TWR uses combined thrust** (core stage-1 + every
   booster, both lit at liftoff) — the whole point of strap-ons is getting a
   thrust-starved heavy core off the pad. `computeVehicle` folds booster engine +
   propellant cost into `buildCost`/`totalProp`; `vehicleUnits` counts each strap-on as
   an integration unit (so boosters consume #7 assembly-bay capacity → build time/cost).
   Gated behind a new propulsion-track research node **`strapon_integration`** (req
   `turbopump`, $3.5M/4 mo — the slice-3 node, pulled forward so boosters aren't a
   turn-1 freebie, keeping the balance-preserved stance). Bench gets a **Strap-on
   Boosters card** (count stepper 0–8 with auto engine-pick, engine picker over unlocked
   LV engines, per-booster propellant, live each/cluster-wet/boost-Δv/TWR readout); both
   readouts gain a ⫶ booster flag; the silhouette label notes the booster count.
   `SAVE_VERSION`→12 + forward-compat default on both load paths (legacy saves read as
   no boosters). Validated headlessly (`/tmp/ov-boosters.js`, 33/33): node shape +
   gating, **the balance-preservation proof (`count:0` == today's exact totalDv / TWR /
   liftoff / buildCost)**, boosters raise TWR + total Δv, **boost Δv equals
   Isp·g₀·ln(m0/mf) to the tonne**, combined-thrust TWR formula, jettison bookkeeping
   (no double-counted propellant), a thrust-starved core that fails TWR alone clearing
   the pad once boosted, `vehicleUnits`/bays, the profile-mission LV leg seeing boosters,
   save version + legacy no-crash, setter clamps [0,8], and a bench/both-readouts render
   smoke; all prior suites green (node-count assertions in slice6d/propexp bumped for the
   +1 node). *Deferred to later slices:* the solid engine class (slice 1); slice-4 visuals
   (strap-ons drawn on the silhouette/pad/flight + a separation event) have **since been
   built** — see slice 4 below.
3. ✅ **Research gating + economy + reliability (#7 / #16)** *(Built 2026-06-21.)*
   Propulsion-track nodes now complete the chain: `solid_propellant` (Solid Propellant
   Casting, req none, `effect.engines:['solid_castor','solid_scout']`) → `segmented_srb`
   (Segmented Solid Motors, req `solid_propellant`, unlocks `solid_srb` — the Challenger
   field-joint history is in the node text) → `strapon_integration` ✅ (built slice 2,
   unlocks the boosters card). **#16 booster reliability link:** boosters are now a real
   reliability trade, not free thrust. `boosterRelPenalty()` (folded into
   `computeVehicle`'s reliability) makes more boosters lower R — a higher-ignition-
   reliability engine costs less per unit (so **solids penalise less than equal-count
   liquids**, capturing their high-ignition character), bounded at `BOOST_REL_CAP` 12% so
   it's a trade not a cliff. A new **`boosters`** subsystem joins the #16 product-
   preserving model (`subsystemFragilities` adds a weighted ascent `loss` link when
   fitted, in `SUBSYS_LABEL`/`SUBSYS_PRIORITY`), so a booster failure becomes a named,
   catastrophic story (`resolveFlight` storyMap — solids get a distinct "burned through
   its casing, no way to shut it down" line). Boosters already consumed #7 assembly-bay
   capacity (slice 2). Surfaced: reliability cost shown in the Boosters card + the readout
   booster flag. Validated (`/tmp/ov-solids.js`, 35/35): node shape + `effect.engines`
   unlock + reconcile, penalty neutrality at count 0 / monotonic / cap / solid-vs-liquid,
   the `boosters` link appears only when fitted, and **the subsystem product still equals
   overall R** with boosters present.
4. ✅ **Visuals — strap-ons on the silhouette, pad & in flight** *(Built 2026-06-21.)*
   The boosters are now drawn everywhere a vehicle is. `buildVehicleShape` computes a
   booster geometry (shorter + narrower than the core stage 1, scaled from per-booster
   propellant) and **attaches it to the full seg array** (`shape.segs.boosters`) — the
   key trick that makes the rest fall out cleanly: `drawVehicle` renders the cluster when
   it sees `segs.boosters`, but the flight animation's **sliced** `remaining`/spent arrays
   don't carry the property, so they never accidentally draw boosters. Two new shared
   painters: `drawOneBooster` (body + ogive nose + bell + optional flame, in
   drawVehicle's "engines-downward" frame) and `drawStrapOns` (a primary booster each
   side — one only if count===1 — plus extras peeking from behind toward the centerline,
   with attach struts). `drawVehicle` calls `drawStrapOns` near the top so the core
   overlaps the inner edges (attached look); `maxW` is widened so the silhouette's
   fit-to-frame scale never clips them. **In flight** the boosters are lit alongside the
   core through the boost phase, then **jettisoned at p≈0.14** — both clusters peel
   outward, tumble (pitch ± progress), fall behind and fade, with a separation-spark burst
   and an `sfxSep()` cue — mirroring the existing stage-sep choreography. `boosters` was
   added to all four vehicle specs (silhouette `currentVehicleSpec`, the flight spec, and
   both Cape-scene specs), so the design-bench preview, the launch-pad rocket in the Cape
   panorama, and the ascent animation all show them. Validated headlessly (8 new checks,
   41/41 total): shape geometry (present/null, w/h>0, h ≤ core, count clamped to 8,
   widened `maxW`, attached to the seg array) and the **draw paths run for real against a
   2D-context stub** — a boostered vehicle issues more draw ops than the bare core, a
   sliced array skips the cluster without throwing, and `drawStrapOns`/`drawOneBooster`
   are callable with flame on. All prior suites green. *(Solid-motor visual
   differentiation has since landed with slice 1: a shared `boosterSpec()` carries a
   `solid` flag through the shape, and `drawOneBooster` paints solids with a pale
   composite casing + segment field-joint bands — see slices 1/3 above.)*

> **Epic status (2026-06-21):** slices 1–4 + #16 all shipped. The side-boosters /
> solid-rockets epic is **functionally complete** — liquid & solid strap-ons, all-solid
> launchers, research gating, the #16 reliability link, and full visuals. *Optional
> future polish:* recoverable solids (Shuttle-SRB-style sea recovery → the T11 reuse
> chain); a solid-specific plume tint in flight.

### Cross-reference map (this epic ↔ existing items)

- **R&D epic T1 Propulsion** — the solid branch (`solid_propellant` → `segmented_srb` →
  `strapon_integration`) lands in the Propulsion swimlane; this epic is its content.
- **#7 Manufacturing capacity** — boosters add `vehicleUnits` (bay capacity / build
  time / cost).
- **#16 Subsystem reliability** — boosters/separation become a distributed subsystem
  link; solids' failure character is the story material (Challenger anchor).
- **#10 Vehicle visualization + Phaser `FlightScene`** — strap-ons drawn on the
  silhouette, pad, and in flight with a separation event.
- **M5 Reusability** — *optional later tie-in:* recoverable solids (Shuttle SRBs
  parachuted into the sea) could extend the T11 reuse chain.
- **Eras** — solids fit the Pioneer era (the design doc already names "Liquid/solid
  sounding rockets"); an early solid sounding-rocket path is era-appropriate.

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
| **P3 · Manufacturing & production** (v2.5) | **Essentially complete** — **#7** fully built across 8 slices: capacity layer (bays/foundry/pads + upkeep), QA→reliability bridge (**#16**), refurbishment wear, build-cadence pressure/bottlenecks, raw-material supply chains, inventory & forecasting, and the production queue/manifest | Remaining: only the deeper "build named engine/tank/habitat **sub-assemblies**" vision → tracked under **#7**. |
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
      **Mission Control deepening (slices 4–9, from a UX review):** turn the dashboard
      into a true "home base." Planned: 4 · Mission Control Advisor (focus goal +
      requirement ✓/✗ analysis + ranked actions); 5 · structured Objectives checklist
      (main/recommended/optional/long-term); 6 · growing Space Center (era/asset-gated
      buildings); 7 · alert-priority polish (info level, icons, sort, cap); 8 · Company
      History milestone list; 9 · Program Status strip + prominent CTAs.
      - [x] **Slice 4 — Mission Control Advisor** *(2026-06-20).* `missionAdvisor()` extends
        `recommendedAction` into a focus-goal card with a requirement ✓/✗ checklist
        (research, reputation, Δv/TWR, reliability-vs-target — reused from
        `computeVehicle`/`simulateMission`/`missionFlyable`) and up to 4 ranked, one-click
        action buttons (research / fly-for-rep / fix Δv / test campaign / Launch when
        ready). Replaces the old "Recommended next step" card. Validated headlessly (9
        checks) + render smoke; suites green.
      - [x] **Slice 5 — Objectives checklist** *(2026-06-20).* `objectivesList()` builds a
        grouped, checkmarked list (Main objective + live sub-status · Recommended
        situational items · Long-term headline milestones with ☑/☐ · recently Completed
        with year) from `nextObjective`/`PROGRAMS`/`state.completed`/`state.history`,
        rendered as one "Current Objectives" card (with the ambition bar) replacing the
        separate contracts/ambition cards; items click-route. Validated (10 checks) + smoke.
      - [x] **Slice 6 — Growing Space Center** *(2026-06-20).* `siteScale()` (pure) drives a
        scene that reflects company scale: the VAB grows taller with Assembly Bays, extra
        launch pads appear with the Pads line, tracking dishes multiply by era, and
        LEO/Lunar/Mars ops buildings appear once those facilities exist. Painters
        (`drawSiteGrowth`/`drawMiniPad`/`drawOpsBuilding`) append to `drawCape`. Validated
        (9 checks incl. a drawCape no-throw with full growth) + suites.
      - [~] **Isometric Cape scene** *(Phase A, 2026-06-20).* The space-center scene was
        rebuilt from side-elevation to a true **isometric** 3/4 view on a taller canvas
        (`CAPE_H` 600→860, same width). `isoLayout()` (grid cells → iso screen anchor +
        % rect) is shared by the painter and `ccHotspots()` so labels stay on their
        buildings. New iso painter (`isoX/isoY`/`isoBox`/`drawIso*`) draws shaded prism
        buildings (lit windows), pad with gantry + upright rocket, dishes, dome, and the
        coastline (land/water matched); `siteScale` growth re-expressed; `ISO_SPREAD`
        controls spacing. CapeScene thinned (pad smoke at iso anchor + camera breathe).
        Validated (6 checks) + suites; browser-confirmed clean iso + aligned hotspots.
        **Phase B (2026-06-20):** realism pass — drop shadows; a logical road network (campus
        avenue + per-building driveways + VAB→pad crawlerway); moving crawler-transporter +
        truck; a drifting boat; varied vegetation (broadleaf/palm/shrub/scrub); richer ground
        (diagonal gradient + mottled terrain + sandy shore); per-building variance (dimensions
        + neutral/light tints incl. a pale VAB) and greebles — rooftop units, antenna arrays,
        facade ribs, VAB flag/logo + bay doors, a Production roll-up door, scaffolding towers,
        plus decorative ground dishes + a lightning rod. Sun moved to the top-right corner.
        Validated (6 checks) + suites; browser-confirmed.
        **Zoom/pan (2026-06-20):** scroll-to-zoom (1–3×, toward cursor) + drag-to-pan +
        dbl-click reset, via a CSS transform on a shared `#ccZoom` container holding the
        canvas *and* the hotspot overlay so labels stay aligned (Phaser camera-breathe
        removed to avoid desync; drag-then-click swallowed).
- [ ] **19 · Organizational scaling (departments)** *(P2, v2.0)* — Grow personnel
      from named individuals into **departments** with leaders/executive roles,
      career progression + training/specialization tracks, and
      succession/workforce planning. Builds directly on **M6** (morale/attrition/
      salary), **#9** (traits/events), and **#5** (poaching/retention) rather than
      replacing them.
- [x] **20 · Interactive Mission Control & operations** *(P4, v3.0)* — *All four
      slices shipped 2026-06-22 (see the epic-status note below).* Turn the
      passive launch animation into a live **Mission Control**: in-flight player
      decisions/events, rescue missions & contingency planning, launch
      **weather**/environmental systems, and pre-flight rehearsal tools. Leans on
      the existing per-subsystem failure model (**#16**) and abort/strand outcomes
      (**#4**) for the decision content. *(Corroborated by the 2026-06-22 evaluation
      review #6 — see that section.)*
      - [~] **Slice 1 — Launch weather & go/no-go scrub** *(Built 2026-06-22.)* The
        first real player **ops decision**, chosen with the user as the low-risk
        opener (synchronous, pre-resolution — no surgery on the resolve→animate
        pipeline). On launch day (after the build/rollout advance) `rollWeather(m)`
        draws from `WEATHER_CONDITIONS` — mostly **GO** (~62%), else an adverse
        condition (high winds / thunderstorms / heavy cloud / wind shear / sub-limit
        cold), each with a reliability `penalty` (3.5–8%) and a `clear` time. Adverse
        weather opens a **go/no-go modal** (`showWeatherModal`): **Scrub & wait**
        (`scrubLaunch` — advance the clear time, then fly in the clear) or **Launch
        anyway** (`launchAnyway` — fly now at the penalty). **Challenger anchor:**
        cold + *solid* strap-on boosters bumps the penalty (field-joint O-rings).
        Implementation: `launch()` was split into `launch()` (build/cost/window +
        the weather gate) and **`proceedLaunch(m,v,sim,windowQuality,weatherPenalty)`**
        (the unchanged outcome/ledger/spec/animation body); the penalty threads
        through `resolveFlight(…,relPenalty)` → `subsystemReport(…,relMult)` as a
        one-flight multiplier on `R` (`R·(1−penalty)`), so the **#16 subsystem product
        still equals the penalized R** and the **rocket equation is untouched** — only
        reliability and schedule move. The held launch lives in a transient
        `_pendingLaunch` (no save change / no `SAVE_VERSION` bump). Animations-off /
        headless takes the conservative auto-scrub. Validated headlessly
        (`/tmp/ov-weather.js`, 30/30): condition distribution + fields, the
        Challenger cold+solid synergy, **penalty neutrality** (default param ==
        no-penalty == `effectiveReliability`), exact `R·(1−p)` scaling, the
        subsystem-product-==-R invariant under penalty, a `proceedLaunch` end-to-end
        flight, and `launch()` GO + adverse-auto-scrub integration on a flyable
        orbital config; plus a 10-tab render smoke (11/11). *Deferred to later
        slices:* weather interaction with committed launch **windows** (a scrub can
        currently push past a window only via the time advance — no explicit
        miss-the-window path yet); a pre-flight weather forecast surfaced on the
        bench; and an animated weather state in the Cape scene.
      - [x] **Slice 2 — In-flight anomaly decisions** *(Built 2026-06-22.)* The
        eval review #6 headline drama, and the async mid-flight pause slice 1 deferred.
        On missions that **reach their operational phase** (base outcome success/partial)
        an in-flight incident can fire — `MISSION_ANOMALIES` (3 to start, data-driven):
        **solar-array deploy fault** (orbital+; EVA-repair[crewed] / deploy-motor reboot /
        run-degraded), **life-support leak** (crewed ≥10-day; tap-reserves / press-on /
        abort), **guidance-radar glitch** (profile missions; manual[crewed] / auto-retry).
        `rollMissionEvents(ctx,rng)` gates by `when(ctx)` + a modest chance
        (`ANOMALY_CHANCE_BASE` 0.26, +0.06 crewed, +0.06 profile) and returns at most one;
        `showAnomalyModal`/`resolveAnomaly` present the choice and apply the picked option's
        `resolve(rng)` **effect** — a bounded `{payoutMult, repDelta, outcomeOverride, log}`.
        Most calls resolve cleanly; the worst case is a **downgrade to partial** (lost
        payout + the objective doesn't count), or — only via a crewed life-support *gamble*
        — a **strand** (crew lost). **The base #16 subsystem model still governs hardware
        loss**; anomalies are an ops-skill layer with the safe option always available, and
        the rocket equation is untouched. Implementation: `proceedLaunch` was split — setup
        (flights++/cadence/materials/`resolveFlight`) stays, the outcome-application body
        moved to **`finalizeLaunch(ctx, ops)`**, and the anomaly modal pauses between them
        via a transient `_pendingOps` (no save change). `ops.outcomeOverride` rewrites the
        outcome kind; `ops.payoutMult`/`ops.repDelta` fold into the success & partial
        branches. Animations-off / headless **skips** anomalies (deterministic — no
        auto-pick), so prior headless flights are unchanged. Validated headlessly
        (`/tmp/ov-anomaly.js`, 30/30): data shape, eligibility gating (orbital→solar only,
        crewed-deep→all three, sounding-rocket→none, uncrewed solar drops the EVA option),
        chance gating, both probabilistic branches of each risky option, **payout/rep
        scaling** (routine flights to isolate from completion bonuses), `outcomeOverride`
        partial→mission not completed & strand→crew lost, the animations-off skip
        (regression), and a modal+`resolveAnomaly` integration; slice 1 still 30/30, render
        smoke 11/11. *Deferred to later slices:* multiple anomalies per flight; anomalies
        woven into the real-time flight animation (currently a pre-animation modal);
        anomaly outcomes feeding the radiation/dose & morale systems.
      - [x] **Slice 3 — Rescue missions & contingency** *(Built 2026-06-22.)* A
        **strand** (deep-space crew that can't get home) is no longer an automatic loss —
        it becomes a decision. When `finalizeLaunch` resolves to `strand` with a crew
        aboard (from either `resolveFlight` or a slice-2 life-support gamble), it pauses on
        a **rescue modal** (transient `_pendingRescue`, before any effects/logs fire): *Mount
        a rescue* (`mountRescue` — spend `rescueCost(m)` capital, advance `rescueMonths(m)`,
        roll `rescueChance(m)`) or *Abandon* (`abandonRescue` — the old strand: crew lost).
        A success becomes the **new `rescued` outcome** (crew home, vehicle/mission lost,
        a light ≤10 rep hit); a failure falls back to `strand` (crew lost + the wasted
        cost/time). **`rescueChance` is the "contingency planning" lever** — base 0.55,
        bounded [0.10, 0.90], *lowered* by mission depth (`m.days`) and *raised* by
        `auto_rendezvous` / `nuclear_thermal` research, standing **facilities** (#17), and
        reputation — so a prepared, well-resourced agency saves more crews. Implementation:
        a re-entrant guard (`ops.rescueResolved`) lets `mountRescue`/`abandonRescue` call
        `finalizeLaunch` again to apply the resolved outcome; **no save change** (transient
        state + existing research/facilities/rep drive the odds). Animations-off / headless
        **skips** the rescue (strand resolves as before — deterministic, no regression). The
        new `rescued` branch keeps the crew (no `loseAssignedCrew`) but still records a
        family vehicle loss (#3). Validated headlessly (`/tmp/ov-rescue.js`, 26/26):
        chance formula (each factor's direction, both clamps, depth penalty), cost/months
        scaling, the strand→pause interception (crew alive while pending), abandon (crew
        lost), mount success (crew kept + capital spent) and failure (crew lost),
        animations-off no-pause regression, the `rescued` rep/crew effects, modal
        affordability render, and a **slice-2 interaction** (anomaly-driven strand also
        triggers the rescue). Slices 1 & 2 still 30/30 each; render smoke 11/11. *Deferred:*
        a designed/launched rescue *vehicle* (currently abstract); active pre-funded
        contingency (insurance/reserves); the rescue playing out in the flight animation.
      - [x] **Slice 4 — Pre-flight rehearsal & readiness tools** *(Built 2026-06-22.)*
        The complement to the hardware **test campaign**: where a test campaign buys down
        *reliability*, a **rehearsal** buys down *operations* risk. A per-flight
        `state.rehearsal` toggle (`SAVE_VERSION`→18, forward-compat default false, resets
        after each flight like `testLevel`) costs `rehearsalCost(m)` (~15% of payout) + one
        prep month and multiplies the slice-2 **anomaly chance by `REHEARSAL_ANOMALY_MULT`
        (0.4)** — rehearsed contingencies mean fewer surprises in flight. Wired through:
        `launch()` deducts the cost + adds the month to the build advance, `canLaunch` folds
        both into the affordability + window-lead checks, `proceedLaunch` stamps
        `ctx.rehearsed` and `rollMissionEvents` applies the multiplier, and `finalizeLaunch`
        resets the flag. The **"tools" layer** is `flightReadiness(m)` — a pure readout of
        weather **GO odds**, in-flight **anomaly risk** (base → rehearsed), and (crewed)
        **deep-space rescue odds** — surfaced via `rehearsalHTML(m)` on **both** bench
        readouts beneath the test-campaign row, so the player can see all the slice-1–3 odds
        and decide before committing. The rocket equation is untouched (cost/time/anomaly-rate
        only). Validated headlessly (`/tmp/ov-rehearsal.js`, 22/22): defaults + save version,
        toggle, cost scaling, `flightReadiness` fields (GO %, anomaly = base×mult, rescue only
        when crewed), the **rehearsal lowers the fire rate** (an rng between rehearsed and base
        chance fires un-rehearsed but not rehearsed), `launch()` adds the cost + month + resets
        the flag, **balance neutrality** (rehearsal-off chance == base), save/load round-trip +
        legacy default, and a render smoke (both readouts show the card). Slices 1/2/3 still
        30/30/30/26; render 11/11. *Deferred:* rehearsal also improving anomaly *decision*
        odds (not just the rate); a multi-step rehearsal/readiness-review mini-flow.
      > **Epic status (2026-06-22):** all four planned slices shipped — launch weather
      > go/no-go (1), in-flight anomaly decisions (2), deep-space rescue & contingency (3),
      > and pre-flight rehearsal & readiness tools (4). #20 turns the once-passive launch
      > into a chain of real operational decisions, built on the #16 subsystem model and
      > #4 outcomes. *Optional future polish:* decisions woven into the real-time flight
      > animation (currently pre/post-animation modals); a designed rescue **vehicle**;
      > active pre-funded contingency; anomaly outcomes feeding radiation/dose & morale.
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

## Evaluation Review — UX, Manufacturing & Mission-Ops Pass

Source: a play-and-code evaluation (2026-06-22) scoring the game **Concept 10 ·
Gameplay 10 · UI 7 · Graphics 6 · Architecture 6 · Sim depth 9 · Long-term 10**,
framing it as "a modern successor to Buzz Aldrin's Race Into Space × KSP × Aurora
4X." Its headline call: the next leap should target **UI clarity, manufacturing,
and mission operations**, since those three multiply engagement on top of the
already-strong simulation foundation.

**Important reconciliation note (same discipline as the Strategic Vision import):**
the review reads the game as earlier-stage than it is — several of its
recommendations are **already shipped or already tracked**. The table below maps
each of its 12 points to current code reality so the plan stays honest; genuinely-
new work is then extracted as numbered arc items (continuing the #18–#22 list) or
folded into the item where it already lives. **No committed build order** — this is
a capture pass (decided with the user 2026-06-22); sequencing is a later call, and
nothing here re-prioritizes the in-flight R&D / boosters work.

**Decisions taken with the user (2026-06-22):**
- **#11 Code modularization — declined; single-file ethos preserved.** Moving to a
  `src/` module tree + build step contradicts the project's core working agreement
  (single `orbital-ventures.html`, no build, headless `vm` validation). Recorded as
  a known tension, *not* a planned epic. Any maintainability relief stays **in-file**
  (clearer section banners / organization), never a build pipeline. See the
  reconciliation row for #11.
- **Priority — capture only.** Mapped honestly with no build order; pick sequencing
  in a later session.

### Reconciliation table (review's 12 points ↔ code reality)

| Review point | Status vs. shipped code | New work & where it's tracked |
| --- | --- | --- |
| **1 · UI complexity layers** (Basic/Advanced/Expert) | **Shipped — #23 complete** (slices 1–3, 2026-06-22/23) — `state.uiLayer` 3-tier disclosure (independent of the Napkin/Engineer math toggle), ops-bar + Settings controls; tagging spans header/Home/Bench/Personnel/Rivals/Infrastructure/Map/R&D, and Basic gets a focal "what to do next" card | Done. |
| **2 · Mission Planner wizard** (step-by-step) | Not started — systems live in separate tabs (Command Center is the hub, all one click away via **#18**) | **NEW:** an optional guided flow (Choose mission → architecture → design vehicle → assign crew → review reliability → integrate → launch) layered over the freeform tabs. → **new arc item #24**. |
| **3A · Side-by-side vehicle comparison** | Not started | **NEW:** compare two saved vehicles on payload/reliability/cost/build-time/TWR/Δv. Builds on `state.vehicles[]` (**#3**) + `computeVehicle`. → **new arc item #25**. |
| **3B · Saved vehicle families** (operational/retire/upgrade/heritage) | **Shipped** as forward-arc **#3** — `state.vehicles[]`, lineage (OV-1→OV-2…), heritage reliability/build bonuses, register/retire | Remaining nuance (explicit "mark operational" flag, in-place upgrade vs. derive) → folds into **#3**. |
| **3C · Manufacturing queue** (build hardware before launch) | **Shipped** — **#7** capacity layer (bays/foundry/pads) + slices 5–7 (cadence, supply chains, inventory) + the **production queue & manifest** (slice 8): queue vehicles, build in parallel by Bays level, stockpile in a hangar, launch on demand | Remaining: only the deeper "build named **sub-assemblies**" vision → **#7**. |
| **4 · Living Command Center** (trucks, cranes, day/night, weather, launch-campaign rollout) | Largely **shipped** via **#18** — animated isometric Cape scene with moving crawler-transporter + truck, drifting boat, growing site, beacons/lit windows | Remaining: **launch-campaign rollout choreography** (rollout→fueling→tower retract→countdown), **weather**, **day/night + seasonal** cycles → rollout/weather fold into **#18**/**#20**; ambient cycles fold into **#18**. |
| **5 · R&D: TRL, experimental failures, competing paths** | Competing paths **shipped** (multi-path swimlane tree, divergent routes); TRL is the known open **#6** leftover | TRL (research→testing→operational gating) → **#6 / R&D epic** leftover (already listed). **NEW: experimental research failures** (combustion instability destroyed prototype → spend more / delay / accept lower reliability) — extends **Breakthrough Events** (their negative sibling) → **new arc item #26**. |
| **6 · Mission operations** (in-flight events/decisions) | Not started — exactly **arc #20** (interactive Mission Control) | All of it → **#20** (this review is strong corroboration; the EVA/repair/abort decision content is the heart of that item). |
| **7 · Persistent map assets** (stations, depots, probes, colonies, mining, active craft) | Partial — **#13** map-as-planner; rival-reach + facility markers; **#17** facilities visible | **NEW:** render *persistent player assets* on the map (stations/depots/probes/active spacecraft as living objects) → folds into **#13** (display) + **#21** (the assets/logistics themselves). |
| **8 · Personnel careers/injuries/poaching/departments** | Poaching **shipped** (**#5**); traits/events (**#9**); morale/attrition/salary (**M6**) | **NEW:** career progression (junior→chief→retire), **injuries** (EVA accident → out N months), promotions, and **departments** → departments are **#19**; careers/injuries/promotions fold into **#19**. |
| **9 · Rivals: behaviors/espionage/partnerships/market** | **Shipped** (**#5**): per-rival threat, price wars, scooping, staff poaching, behavior-flavored timelines; launch market via econ events + **#2** | **NEW:** **espionage** (steal/protect research, hire-away as a player-vs-rival action) and **partnerships** (joint missions, tech sharing) → folds into **#5** (deeper strategic-rival slice). |
| **10 · Graphics** (particles/plumes → detailed viewer → Electron/Godot/Unity) | Short/mid-term largely **shipped** — Phaser hybrid conversion (Slices 0–3), GPU exhaust plumes/particles, detailed rocket + planet textures, stage-sep animation | Long-term **engine migration** (Electron/Godot/Unity, multi-window desktop app) conflicts with the single-file/no-build ethos — recorded as a *horizon idea only*, same status as #11 below; not planned. |
| **11 · Code modularization** (single file → `src/` modules + build) | n/a — by design the project is **single-file, no build, headless-`vm` tested** | **Declined** (decision above). Tension acknowledged; relief stays in-file only. |
| **12 · Version ladder** (v0.6–v2.0) | Parallels the existing **v1.5–v5.0** Strategic-Vision ladder | The review's 0.6–2.0 milestones map onto already-tracked work: 0.6 UX→#18/#23/#24/#25; 0.7 manufacturing→#7; 0.8 mission ops→#20/#26; 0.9 personnel→#19; 1.0 living agency→#8/#5; 1.5 colonization→#21; 2.0 civilization→#22. No separate version ladder added — use the existing one. |

### New forward-arc items extracted from the review

Continuing the #18–#22 numbering. All **[ ] not started**; **no committed build
order** (capture pass). The review's own "biggest-return" picks were UI clarity
(#23/#24), manufacturing (#7), and mission ops (#20).

- [x] **23 · Progressive UI complexity layers** *(review #1)* — a 3-tier view mode
      (Basic / Advanced / Expert) for **progressive disclosure**, distinct from the
      Napkin/Engineer *difficulty* (which changes economy + math exposure). Basic
      surfaces only money, reputation, active mission, current research, success
      chance, and the recommended action (reusing `recommendedAction`/
      `missionAdvisor` from **#18**), hiding advanced metrics; Advanced = today's UI;
      Expert exposes exact reliability equations, mass fractions, subsystem risk
      (**#16**), economic modifiers, and hidden rival stats (**#5**). Lowers the
      newcomer cognitive load the review flags as the single biggest UI issue.
      **Decisions taken with the user (2026-06-22):** an **independent axis** from
      difficulty (Expert overrides the difficulty hide-equations); **full 3-tier
      mechanism**, applied to the key screens first.
      - [x] **Slice 1 — mechanism + key screens** *(Built 2026-06-22.)* `state.uiLayer`
        ∈ basic/advanced/expert (default **advanced** → nothing changes unless chosen;
        `SAVE_VERSION`→20, forward-compat default on both load paths). `applyUiLayer()`
        (folded into `applyDifficultyUI`, called every render) toggles a body class
        (`ui-basic`/`ui-advanced`/`ui-expert`); pure CSS does the disclosure —
        `body.ui-basic .adv-only{display:none}`, `body:not(.ui-expert) .expert-only{display:none}`,
        and the equation override (`ui-basic` hides `.eq`, `ui-expert` forces it on even
        when difficulty set `hide-eq` — the independent-axis decision). Controls: an
        ops-bar **View: Basic/Advanced/Expert** cycle button (`cycleUiLayer`) + a
        Settings **Interface detail level** card (`setUiLayer`). Coverage this slice
        (the highest-overload surfaces): **header** (secondary stats tagged `adv-only`,
        leaving Date/Capital/Reputation in Basic), **Home** (the program timeline + the
        dense right column hidden in Basic; `cc-cols` collapses to two columns), and the
        **Design Bench readout** (build-cost waterfall + subsystem breakdown wrapped
        `adv-only`; the `.eq` blocks follow the layer; a new **Expert-only mass-fraction**
        block, `massFractionHTML`, exposes per-stage propellant ÷ wet mass). Validated
        headlessly (`/tmp/ov-uilayer.js`, 23/23): defaults/save-version, `uiLayer()`
        fallback, `setUiLayer` valid/invalid + **body-class toggles** (one layer class at
        a time, asserted via a tracking `classList`), `cycleUiLayer` order, `massFractionHTML`
        content/empty-guard, **per-layer render smoke across all 10 tabs**, save/load +
        legacy default, and **independence from difficulty** (switching difficulty leaves
        the layer untouched). All prior suites green (#20 30/30/26/22, #7 38/38; render 11/11).
        *Next slices:* extend `adv-only`/`expert-only` tagging to the remaining tabs
        (R&D tree detail, Personnel, Rivals internals, Infrastructure, Map), and a Basic
        "what do I do next" emphasis pass.
      - [x] **Slice 2 — remaining-tab tagging** *(Built 2026-06-23.)* Extended the same
        CSS-driven disclosure (`adv-only`/`expert-only`, no new state, no `SAVE_VERSION`
        bump) to the five highest-density tabs left after slice 1:
        **Personnel** — summary metrics row + each card's reliability-contribution line →
        `adv-only`; a new **`expert-only`** engineer reliability formula
        (`skill × morale × ENG_REL_BONUS_MAX`). **Rivals** — the per-rival firsts timeline
        → `adv-only`; a new **`expert-only`** raw threat score (+ price-war multiplier).
        **Infrastructure** — manufacturing-capacity metrics, the raw-material supply card,
        and the facility summary metrics → `adv-only`. **Map** — the body-card Δv profile
        (tag + leg breakdown + cumulative metrics) and the market/rival-frontier activity
        card → `adv-only`. **R&D** — the research-detail exact-modifier list (`tt-mods`) and
        the division skill/experience/morale bars → `adv-only`. Basic now shows each tab's
        identity + primary action (hire/fire, found/expand, fly-this, research) while the
        dense numeric breakdowns recede; Expert adds the reliability formula + raw rival
        stats on top of Advanced. Validated headlessly (`/tmp/ov-uilayer2.js`, 30/30):
        mechanism intact, all five tabs render across basic/advanced/expert without
        throwing, the expected disclosure classes are present, the engineer expert-formula
        appears after hiring, and the layer stays independent of difficulty.
        *Next slice:* the Basic **"what do I do next"** emphasis pass (surfacing
        `recommendedAction`/`missionAdvisor` as the focal element in Basic) — **slice 3**.
      - [x] **Slice 3 — Basic "what to do next" focal element** *(Built 2026-06-23.)*
        Added a new **`basic-only`** disclosure class (`body:not(.ui-basic) .basic-only{display:none}`,
        the mirror of `adv-only`). On the Command Center, Basic now leads with a single
        focal card driven by **`recommendedAction()`** — the why (its `detail`), the reward
        preview, an **estimated success chance** (from `computeVehicle()` when the
        recommended launch's vehicle is on the bench), and **one** primary button that runs
        the same `advisorClick()` navigation. In Advanced/Expert that card is hidden and the
        full **🎛 Mission Control Advisor** (now `adv-only`, with its requirement ✓/✗
        checklist and ranked actions) shows instead — a clean Basic↔Advanced swap rather
        than two stacked panels. No new state (pure CSS + existing pure helpers). Validated
        headlessly (`/tmp/ov-uilayer3.js`, 15/15; slice-2 suite re-run 30/30): the
        `basic-only` CSS rule exists, `renderCCLeft` emits both the focal card and the
        adv-only advisor and never throws across all three layers, the focal button wires
        `advisorClick(recommendedAction())` with the recommended title, and the success
        chance appears exactly when a launch is recommended with the vehicle on the bench.
        **This completes arc item #23.**
- [ ] **24 · Mission Planner wizard** *(review #2)* — an optional guided, linear
      flow over the existing systems (Choose mission → assign architecture → design
      vehicle → assign crew → review reliability → integrate → launch), each step a
      thin wrapper around the tab it already drives (missions / `MISSION_ARCH` / bench
      / personnel / `subsystemReport` / build / `launch`). Tabs stay for freeform
      play; the wizard is the on-ramp that removes the tab-hopping friction the review
      calls out. Pairs naturally with **#23 Basic mode**.
- [x] **25 · Side-by-side vehicle comparison** *(review #3A)* — compare two saved
      `state.vehicles[]` designs across payload / reliability / cost / build-time /
      TWR / Δv (all already derivable via `computeVehicle`/`stackPerformance`). A
      bench/family-card comparison view; becomes essential once families branch.
      *(Built 2026-06-23.)* A **⚖ Compare designs** panel inside the Vehicle Family
      card (bench tab): two dropdowns pick any two of **Current bench** + the saved
      families, and a six-row grid shows payload / Δv / TWR / reliability / build cost /
      build time, with the better value flagged green ▸ (higher payload/Δv/TWR/rel,
      lower cost/time). Both designs are measured against the **active mission** as a
      shared yardstick. Implemented by `compareMetrics(id)` — for a family it
      temporarily applies the saved `spec` (+ its heritage as `activeVehicle`) to live
      state, runs the existing `computeVehicle()`/`buildMonths()`, then restores via
      `try/finally`; `'__bench__'` reads the live config directly. Selection is
      transient module state (`cmpA`/`cmpB`, like `mapExpanded`) — **no new save field,
      no `SAVE_VERSION` bump** — and stale ids (a retired family) fall back gracefully.
      The panel is `adv-only` (hidden in #23 Basic). Validated headlessly
      (`/tmp/ov-compare.js`, 21/21): no panel under 2 options; bench metrics match a
      direct `computeVehicle()`; family compute **restores** live state exactly; a
      half-propellant design correctly shows less Δv; building the panel mutates no
      state; better-value highlighting fires; stale selections don't throw; and
      `renderVehicleFamilies` embeds the panel end-to-end. *(Known limitation, shared
      with `loadFamily`: families don't carry booster/recovery flags, so those use the
      live bench values during comparison.)*
- [ ] **26 · Experimental research failures** *(review #5)* — the negative sibling of
      **Breakthrough Events**: a research project can hit a setback ("combustion
      instability destroyed the prototype") forcing a choice — spend more capital,
      accept a delay, or accept a lower reliability/effect on completion. Reuses the
      Breakthrough plumbing (division-quality-driven, rate-limited via a cooldown);
      higher-quality **Research Divisions** fail less. Turns the TRL idea (research →
      *testing* → operational) into drama rather than a pure timer. Cross-ref **#6 /
      R&D epic** (TRL gating), **#9** (event plumbing), Research Divisions.

### Folded into existing items (no new number)

- **Launch-campaign rollout choreography + weather + day/night/seasons** (review #4)
  → **#18** (ambient scene life + rollout animation) and **#20** (weather as a
  launch-ops constraint).
- ~~Visible multi-build production queue / manifest~~ (review #3C) — **shipped** as
  **#7** slice 8 (queue + hangar, parallel builds by Bays level, launch-from-hangar).
- **Persistent player assets drawn on the Solar map** (review #7) → **#13** (render)
  + **#21** (the assets/logistics model).
- **Careers / injuries / promotions** (review #8) → **#19** (departments/org scaling).
- **Espionage + partnerships** (review #9) → **#5** (deeper strategic rivals).
- **TRL gating** (review #5) → already an open **#6 / R&D Deep Expansion** leftover.
- **In-flight mission events/decisions** (review #6) → **#20** (its core content).

> **Incorporation note (2026-06-22):** of the review's 12 points, **#3B/#5/#6
> (firsts)/#9/#10 short-mid** are already shipped; **#4/#7/#8** ship through
> existing items #18/#7/#19/#20/#21/#5/#13; genuinely-new buckets become arc items
> **#23–#26**; **#11 (modularization)** and the **#10 long-term engine migration**
> are declined as contrary to the single-file/no-build ethos (recorded, not
> planned). The review's "UI clarity / manufacturing / mission ops" thesis lines up
> with #23/#24 · #7 · #20 — a useful corroboration of where the highest-impact
> unbuilt work sits.

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
- [x] **Slice 3 — `MapScene`** *(2026-06-20).* The Solar System tab is a Phaser scene:
      Sun + orbit rings, bodies in slow orbital motion, **drag-to-pan + wheel-zoom camera**,
      parallax starfield, rival-reach + facility markers, and click→`selectBody` (reuses
      the DOM Δv detail card). Replaces the discrete SVG click-zoom with free camera zoom;
      SVG map retained as fallback (and used headlessly). **Detailed planets:** procedurally
      generated 448px textures per body — shaded sphere, surface grain, atmosphere rim, and
      body-specific features (Earth continents/clouds/ice/storm, Mars Valles Marineris +
      Olympus Mons + caps, Moon crater-ray systems + maria, Jupiter banding + Great Red Spot,
      Venus cloud swirls). **Jupiter rings** with proper front/back occlusion. **Sun-accurate
      terminator:** rocky bodies rotate so their lit hemisphere faces the Sun as they orbit
      (Jupiter uses symmetric limb-shading + stays upright so its rings hold a fixed tilt).
      Validated: suites green (38/38/34) + map render smoke; in-browser confirmed. *This
      completes the planned hybrid Phaser conversion (Slices 0–3).*

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive
- `ROADMAP.md` — this file
