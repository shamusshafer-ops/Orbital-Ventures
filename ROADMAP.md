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
- The Solar System map is a planning reference; it doesn't yet drive rival
  activity, economy-wide events, or fleet logistics.
## Completed milestones (continued)

- [x] **M5 — Reusability & rapid cadence**: `propulsive_landing` research
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
- [x] **M7 — Outer system**: NTR (`ntr_nerva`, NERVA, Isp 800s,
      `transferOnly`) and NEP (`nep_snap`, SNAP-derived, Isp 3000s,
      `lowThrust`, `transferOnly`) engines — both blocked from LV stage
      selectors, available to transfer stage only. Four research nodes:
      `nuclear_thermal` (req hydrolox_up+deep_space, $9M/10mo, unlocks NTR),
      `nuclear_electric` (req nuclear_thermal, $12M/12mo, unlocks NEP),
      `rad_shielding` (req nuclear_thermal, $6M/6mo, required for Jupiter
      crewed missions), `belt_volatiles` (req nuclear_thermal + belt_mining
      done, $8M/9mo, free return-leg propellant for Belt missions via
      ISRU_FREE_LEG). Four missions: Belt Survey (robotic, 780d, $280M),
      Belt Mining Claim (crewed, 960d, $320M — triggers $4.5M/mo PGM
      royalties on first completion), Jupiter Flyby (crewed, 1460d, $480M,
      req rad_shielding), Jupiter Orbital Mission (crewed, 2190d, $680M,
      the M7 capstone). PGM royalties shown in header stat. NEP low-thrust
      warning flag in readout. Validated headlessly: all engines, missions,
      research, ISRU, PGM royalty, and LV/transfer engine filter correct.
- [x] **Passive income contracts**: `PASSIVE_CONTRACT_DEFS` pool of 9 signable
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

## Repo

`shamusshafer-ops/Orbital-Ventures` (private), branch `main`.
- `orbital-ventures.html` — the game
- `orbital-ventures-design.md` — original full design doc
- `orbital-ventures-systems-spec.md` — rocket equation + ECLSS deep dive
- `ROADMAP.md` — this file
