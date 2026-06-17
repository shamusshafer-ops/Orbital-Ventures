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
  per body) and ambient economy events; **fleet logistics** is still not modeled.

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
- [ ] **2 · Depot → living economy** — Today the LEO depot is a number
      (`state.depot`) + a top-off slider. Turn it into a market: fluctuating fuel
      price, buy/sell with rivals, resupply contracts, shortages, government
      subsidies. Creates the "build a fuel empire vs. fly to Mars" fork. Hooks:
      `state.depot`, `econEvents`, rival `color`/firsts already present.
- [ ] **3 · Hardware reuse & vehicle families** — No persistent vehicle identity
      today (each launch re-derives a design). Add named lineages (OV-1 → OV-2 →
      OV-Heavy) that accumulate reliability heritage, manufacturing knowledge, and
      brand/rep; losing a veteran airframe should sting. Needs a saved-design model
      (`state.vehicles[]`) distinct from the live bench config.
- [x] **4 · Story failures** — *Built 2026-06-17, with #16.* Partial success
      (guidance → wrong orbit, reduced payout, objective not completed), crew abort
      (ascent fault + launch-escape → crew safe), deep-space stranding (crewed deep
      fault), and subsystem-specific failure stories in the log. See #16.
- [~] **5 · Strategic rivals** — Bones in place: `RIVALS` with map reach markers,
      firsts, scoop penalties, and ambient economy events. Make them *act*: steal
      contracts, poach staff (ties to M6 morale/attrition), beat you to tech, cut
      launch prices industry-wide (e.g. a rival's reusable booster drops everyone's
      payouts), forcing the player to react. Emergent pressure, not a news feed.
- [~] **6 · Multi-path tech tree** — Research exists but is largely linear with a
      "correct" path. Add divergent branches (heavy-lift vs orbital-assembly vs
      refueling vs reusable vs nuclear) so different strategies reach Mars
      differently. Needs tree restructure + UI to show branches.
- [ ] **7 · Manufacturing capacity** — Money is nearly the only resource. Add build
      bays / engine production / launch-pad capacity as constraints, so "another pad
      vs. hydrogen engines" becomes a real decision. New resource layer in `state`.
- [~] **8 · Program politics** — Partially foreshadowed by rep + economy events.
      Add government funding (budget increases/cuts), public support (Moon landing
      ↑, crew deaths ↓), shareholders (demand profit), national prestige (the race).
      Launches affect more than money.
- [~] **9 · Personnel personality** — M6 gives named engineers/astronauts with
      morale/attrition. Add traits (risk-taker, perfectionist, visionary,
      bureaucrat) and events (raise demands, rival poaching, breakthrough paper,
      costly mistake). Football-Manager/RimWorld-style story generation.
- [~] **10 · Vehicle visualization** — The launch animation *already* renders a
      design-driven silhouette (stage sizes, engine clusters, fairing vs capsule,
      staging). Missing piece is a **static silhouette on the design bench** so you
      see "my rocket" while tuning it — a small SVG/canvas add reusing
      `buildVehicleShape`/`drawVehicle`.
- [x] **11 · Milestone programs** — *Shipped* as Programs (campaigns with
      objectives + completion bonuses). See completed entry above.
- [ ] **12 · Mission-architecture choices** — Machinery exists (profiles already
      model staging, depot top-off, ISRU free-legs as Δv trade-offs). Surface it as
      a pre-mission *choice* screen: e.g. Lunar = direct ascent / EOR / LOR /
      depot-assisted, each with different cost/complexity/risk. Deep strategy
      without new missions.
- [~] **13 · Map as planning tool** — Map now shows rival reach + economy activity
      and is full-screen-capable. Go further: click Mars → show windows, transfer
      opportunities, depot routes, estimated cost. Make the map a place players
      *plan*, not just read.
- [ ] **14 · Scientific discovery** — Rewards are money + rep only. Add a science
      track (lunar ice found, Mars water confirmed, asteroid survey) yielding
      science points that unlock tech or funding — a second progression axis.
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
- [ ] **17 · Persistent infrastructure layer (playability pick)** — Stations,
      depots, lunar/Mars bases as entities that persist after a mission and grow /
      produce over decades (ISRU output, fuel, science, passive income). The "build
      something that remains" addiction loop; the substrate that makes #2, #12, #14
      compound. Largest structural change; high payoff.

**Suggested build order:** ~~16 (subsystem reliability + story failures)~~ ✓ →
**17 (infrastructure layer) ← next** → 2 (depot economy) → 10 (bench silhouette,
quick win) → 12 (architecture choices) → 5 (active rivals) → 9 (personnel traits)
→ 3 (vehicle families) → 14 (science) → 6 (multi-path tech) → 8 (politics) → 7
(manufacturing). Items 1/4/11/15/16 shipped; 13 partially done.

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive
- `ROADMAP.md` — this file
