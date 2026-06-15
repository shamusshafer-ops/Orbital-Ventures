# ORBITAL VENTURES — Hardcore Systems Spec
### v0.2 — Vehicle Design (Rocket Equation) & Life Support (ECLSS)

This document expands the two systems you flagged as central, designed for a **video game** with a **hardcore** philosophy: the player reasons with the actual rocket equation, and life support is a managed, mass-and-power-budgeted system — not an abstraction. The two are deliberately coupled: **every kilogram of life support is payload, and payload is what the rocket equation punishes.**

---

## PART 1 — VEHICLE DESIGN: THE ROCKET EQUATION AS GAMEPLAY

### 1.1 Design philosophy

The player does not pick a "rocket" off a shelf. They sit at a **design bench**, stack stages, choose engines, size tanks, and the game computes everything from physics. The fun is the optimization loop: *fighting the exponential.* A player who internalizes mass ratio, staging, and Isp tradeoffs builds better rockets than one who doesn't — and the game never hides why.

### 1.2 The core equation (exposed to the player)

> **Δv = Isp · g₀ · ln(m₀ / m_f)**
> g₀ = 9.81 m/s² · Isp in seconds · m₀ = wet (start) mass · m_f = dry (burnout) mass

Rearranged, the form the player learns to fear:

> **Mass ratio MR = m₀ / m_f = e^(Δv / (Isp · g₀))**

Because MR is **exponential in Δv**, propellant demand explodes as missions get harder. This is the spine of the whole game.

### 1.3 What the player assembles per stage

Each stage is built from real parts, each with real numbers:

- **Engine(s):** thrust (sea-level & vacuum), Isp (sea-level & vacuum), mass, cost, gimbal range, throttle range, restart count, reliability, propellant type. Player chooses **how many** (clustering).
- **Tankage:** propellant mass loaded. Tank dry mass is derived from the **structural coefficient (σ)** granted by your Materials tech.
- **Structure / interstage / TPS:** further dry mass; reuse hardware (legs, fins, wings, heat shield) lives here.
- **Avionics:** sets guidance accuracy, landing capability, and a reliability modifier; small mass.
- **Payload** (top stage): satellite, crew module, cargo, or **life-support + crew** (Part 2).

### 1.4 The mass model the game runs

For a stage carrying payload `m_pl`:

- **Structural coefficient** σ = m_structure / (m_structure + m_propellant). Better materials tech → lower σ.
  - Typical ranges the game uses: poor early stage σ ≈ 0.12; good modern stage σ ≈ 0.06; exceptional ≈ 0.04.
- m_structure = σ / (1 − σ) · m_propellant
- m₀ = m_pl + m_structure + m_propellant
- m_f = m_pl + m_structure
- Δv_stage = Isp · g₀ · ln(m₀ / m_f)

**Total vehicle Δv** = sum of stage Δv, each stage's "payload" being everything stacked above it.

### 1.5 Why staging exists — shown in numbers

To reach LEO the vehicle needs to *produce* roughly **9,400 m/s** (orbital velocity plus gravity/drag/steering losses).

**Single stage, kerolox (Isp ≈ 330 s):**
MR = e^(9400 / (330 × 9.81)) = e^2.90 ≈ **18.3**
→ dry mass + payload is only **5.5%** of liftoff mass. Structure alone eats most of that. Payload ≈ near zero. **A single stage to orbit is a trap.**

**Two stages, ~4,700 m/s each:**
MR per stage = e^(4700 / 3237) = e^1.45 ≈ **4.27**
→ each stage's dry+payload is ~23% of its start mass — *achievable*, with real payload left over. The product (4.27 × 4.27 ≈ 18.2) matches the single-stage requirement, but split into two survivable chunks. **This is the lesson the bench teaches by play.**

### 1.6 The other constraints the bench enforces

- **Thrust-to-weight at liftoff** must exceed 1 (the game flags ~1.2–1.4 as the efficient band). Too low: it can't climb and bleeds Δv to gravity losses. Too high: wasted engine mass.
- **Gravity / drag / steering losses** (~1.5–2.0 km/s to LEO) are *subtracted* — the player must budget **margin**, not just hit the ideal number.
- **Reserves & residuals:** landing/boostback propellant, ullage, boil-off for cryogens, and unusable residuals are real mass the player must carry.
- **Max-Q and acceleration limits:** structural and (for crew) g-load ceilings; throttling down through max-Q costs a little performance.
- **Engine-out:** the game shows TWR with one engine failed — buying engine-out survivability is a deliberate (heavier) choice.

### 1.7 Reading the bench (the hardcore UI)

A live readout, updating as parts change:
- **Δv budget bar** per stage and total, drawn *against the selected mission's requirement* (from the Solar System Δv map), color-coded for margin (red = won't make it, amber = thin, green = healthy reserve).
- **TWR gauges** at ignition and burnout per stage.
- **Payload-to-destination** table (LEO / GTO / TLI / Mars / …).
- **Mass breakdown** (propellant / structure / payload, per stage).
- **"Show the math" toggle** — expands any number into the actual equation with current values plugged in. Hardcore players live here; the toggle keeps it from overwhelming everyone.
- **Optional Napkin Mode** (difficulty setting): auto-applies sensible loss/margin budgets so newcomers learn staging before learning loss accounting. Full hardcore turns this off — you budget your own losses or you fall short.

### 1.8 Isp tradeoffs the player navigates

Higher Isp means more Δv per kg of propellant, but never free:
- **Hydrolox (Isp ~450 s):** superb Δv, but LH2 is bulky (huge tanks → more structure mass) and deep-cryo (boil-off, ground complexity).
- **Kerolox / Methalox (~330–380 s):** dense, cheap, reuse-friendly; the workhorse band.
- **Hypergolics (~320 s):** storable, restart-reliable — ideal for in-space stages and landers despite toxicity.
- **Nuclear thermal (~900 s):** transformative Δv for deep space, but heavy, hot, and politically gated.
- **Electric (1,500–5,000 s):** astonishing efficiency, but thrust measured in newtons → only works in space, over weeks/months, and demands large **power** (couples to the Power branch and reactor mass).

The hardcore choice is rarely "best Isp" — it's "best Isp *for this leg's thrust, time, and tank-volume constraints.*"

---

## PART 2 — LIFE SUPPORT (ECLSS) AS A MANAGED SYSTEM

### 2.1 Philosophy

Crew are not a "+1 crew" stat. Keeping them alive is a **mass, power, recycling, and time budget** that the player carries through the rocket equation. The central decision — **open loop vs. closed loop** — is a genuine optimization with a duration-dependent crossover. Get it wrong and you either waste payload on consumables you didn't need, or watch a crew run out of oxygen 80 days from home.

### 2.2 Per-crew daily consumption (the baseline the game uses)

Approximate metabolic figures per crew member per day:

| Flow | Amount | Notes |
|---|---|---|
| Oxygen consumed | ~0.84 kg/day | metabolic |
| CO₂ produced | ~1.0 kg/day | must be scrubbed |
| Drinking water | ~2.0 kg/day | |
| Water in food / prep | ~0.5 kg/day | |
| Hygiene water | ~1–25+ kg/day | sponge-bath minimal → full hygiene huge |
| Food (dry mass) | ~0.62 kg/day | ~1.8 kg packaged/wet |
| Metabolic water produced | ~0.35 kg/day | recoverable |

**Lean open-loop consumable budget** (minimal hygiene, packaging included): **~5 kg/crew/day**. Generous hygiene can double it. This single number drives everything downstream.

### 2.3 Open loop vs. closed loop — the core mechanic

**Open loop:** carry every consumable; vent waste. System is light/simple, but consumable mass scales **linearly with crew × duration**. Brutal for long missions, fine for short ones.

**Closed loop:** recycle via tech-gated recovery systems. Adds **fixed system mass + power draw + spare parts + crew maintenance time + new failure modes**, but slashes resupply mass.

**Recovery fractions by tech tier (ECLSS branch):**

| System | Recovery | Tech gate |
|---|---|---|
| Water recovery | 0% → ~70% → ~90% → ~98% | T1 → T4 → T5 → T7 |
| O₂ recovery (CO₂ → O₂ via Sabatier/electrolysis) | 0% → partial → ~75%+ | T2 → T5 → T6 |
| Food (bioregenerative growth) | ~0% → partial only | T6+ (hardest loop to close) |

Food is the stubborn loop: even late-game, most food is carried, which keeps long missions heavy and makes bioregenerative agriculture a major milestone.

### 2.4 The crossover calculation (player-facing)

- **Open-loop mass** = crew × days × daily_consumable
- **Closed-loop mass** = system_fixed_mass + spares + crew × days × daily_consumable × (1 − recovery)

The player solves for the **crossover duration** where closed beats open. Worked illustration (4 crew, lean 5 kg/day, closed system fixed mass ≈ 4 t, recovery cutting consumables to ~1.5 kg/day):

- **60-day mission:** open = 4 × 60 × 5 = **1.2 t**. closed = 4 t + 4 × 60 × 1.5 = **5.4 t** → **open loop wins** (don't haul a recycler for a short trip).
- **500-day mission:** open = 4 × 500 × 5 = **10.0 t**. closed = 4 t + 4 × 500 × 1.5 = **7.0 t** → **closed loop wins**, and the gap widens with every extra day.

This is exactly the kind of decision a hardcore player should *want* to compute — and the consequences land through Part 1.

### 2.5 Power coupling

Regenerative ECLSS is power-hungry — CO₂ reduction (Sabatier), water electrolysis, and processing all draw continuous kW. This ties life support to the **Power branch**: closing the loop means carrying solar arrays or a reactor, whose mass re-enters the rocket equation. A "closed-loop" win on paper can be erased by the reactor it needs. The bench shows the **combined** ECLSS + power mass.

### 2.6 Crew health timers (the slow-burn pressure)

Beyond consumables, crew accumulate stressors over a mission:

- **Radiation dose (mSv, cumulative).** LEO is shielded by Earth's magnetosphere; **deep space is not** — galactic cosmic rays deliver a steady ~0.3–0.6 mSv/day in interplanetary space, so a Mars round trip runs on the order of **~0.5–1 Sv**, a meaningful career dose. Mitigation = **shielding mass** (water, regolith, dedicated mass) → straight into the rocket equation, or faster transits (better propulsion).
- **Solar particle events (SPE).** Random, sometimes severe. Without a **storm shelter** (a shielded volume), a bad event can deliver an acute, mission-ending — or lethal — dose. Classic tense in-mission event.
- **Microgravity deconditioning.** Without countermeasures, bone loss ~1–1.5%/month, plus muscle and cardiovascular decline. Mitigation: **exercise hardware** (mass + crew time) or **spin gravity** (large structural mass / rotating architecture, a late-game build).
- **Psychological load.** Isolation and confinement on long missions erode crew morale, raising operational **error rates** (feeds the reliability model) — improved by habitable volume, comms, and crew selection.

### 2.7 ECLSS failure modes (in-mission events)

Closing the loop adds failure surfaces. Each can fire as a timed crisis:
- **CO₂ scrubber failure** → rising CO₂; a countdown to repair (needs spares + a skilled crew member) before impairment.
- **Water recycler fault** → fall back to reserves; mission clock now competing with the water clock.
- **Pressure leak** → locate and patch before atmosphere is lost.
- **Power loss to ECLSS** → cascade; the reactor/array reliability now matters for survival, not just thrust.

**Redundancy & spares** are mass the player chooses to carry. More loop-closing = more failure modes = more spares and maintenance time. The hardcore tension: a fully closed, lightweight-on-consumables ship is also a complex ship far from rescue.

### 2.8 EVA

Suits are personal mini-ECLSS: consumables per EVA-hour, prebreathe time before EVA, finite suit life/maintenance, and their own (small) radiation/thermal exposure. Surface operations (Moon/Mars) make EVA a recurring consumable and risk line item, not a free action.

---

## PART 3 — THE CAPSTONE: WHERE THE TWO SYSTEMS COLLIDE

A crewed Mars mission is where the player feels the whole design click — life support mass cascading through the rocket equation across multiple legs.

**Setup:** 4 crew, ~500-day mission. From §2.4, life support payload is **~10 t open-loop** vs **~7 t closed-loop** (system + power included, roughly). That 3 t difference looks small.

**Now push it through the rocket equation.** Say the in-space legs (TMI + Mars capture/descent, partly aero-assisted) demand ~4,600 m/s on a methalox stage (Isp ~360 s → Isp·g₀ ≈ 3,530 m/s):
MR = e^(4600 / 3530) = e^1.30 ≈ **3.68**.
So **every tonne of payload through these legs needs ~2.7 t of propellant** (plus its tankage). The 3 t life-support difference becomes **~8 t** of additional propellant + structure that must already be **in LEO**.

**Then compound it.** That extra ~8 t in LEO had to be lifted from Earth's surface — another ~9,400 m/s leg with its own mass ratio (~18). The penalty *multiplies across legs.* A few tonnes of "just life support" at Mars can mean **dozens of tonnes** of extra launch mass — possibly an entire additional launch.

**The lesson the game wants the player to feel:** open vs. closed loop isn't a life-support footnote. It's a launch-architecture decision worth millions and possibly a whole vehicle. That is the hardcore loop working as designed — and it argues the player toward the tech that breaks the cycle: **in-space refueling, ISRU propellant at Mars, and high-Isp propulsion** to shrink the Δv that makes everything exponential.

---

## PART 4 — DIFFICULTY & ACCESSIBILITY (so "hardcore" still ships)

To keep the hardcore core without locking out players:
- **Napkin Mode** auto-budgets losses/margins and offers a default ECLSS recommendation, while still computing real physics underneath — a teaching ramp.
- **Engineer Mode (default-hardcore)** exposes every number, every equation, every margin; you budget your own losses and own your shortfalls.
- **Tooltips are the textbook:** hover any value to see the equation, the inputs, and *why it moved* when you changed a part. The game teaches rocketry by making consequences legible, not by hiding them.

---

*End of v0.2. Natural next specs to build out: (a) the full reliability formula and test-program economics, (b) a concrete tech-tree dependency graph for the Propulsion + Materials + ECLSS branches, or (c) a wireframe of the design-bench screen showing the live Δv/TWR/ECLSS readouts in action.*
