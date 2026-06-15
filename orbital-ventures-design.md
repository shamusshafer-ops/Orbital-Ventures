# ORBITAL VENTURES — Space Launch Company Simulation
### Core Design Document (v0.1 — Foundations)

A management/strategy simulation in which the player founds and runs a private space launch company. Play begins in the early 1940s with crude liquid-fuel and solid sounding rockets and progresses, era by era, through the historical Space Age and into speculative future technology. The entire Solar System is the game board, with physically realistic distances, energies, and hazards. The player builds technology, acquires resources, designs and flies launch vehicles, runs an economy, and manages people.

---

## 1. Design Pillars

1. **Physically honest.** Vehicle performance is computed from the real rocket equation and real propellant/material properties — not from arbitrary stat blocks. A player who understands rocketry should be rewarded; the math is the game.
2. **Earned capability.** You don't buy a Mars rocket. You earn the propulsion, materials, avionics, and operations tech needed to build one, then validate it through testing and flight heritage.
3. **Failure is content, not punishment.** Explosions, anomalies, and disasters are expected, generate investigations, reputation swings, and engineering data — they advance the story rather than just ending the run.
4. **The Solar System has texture.** Every destination has a real delta-v cost, real hazards (radiation, thermal, dust, gravity well), and real economic reasons to go there.
5. **Time and history press on you.** Rival agencies and companies achieve "firsts." Budgets swing with politics and markets. You react to a living world, not a static sandbox.

---

## 2. Time Structure & Eras

**Turn unit:** one month (default). Players can fast-forward through quiet periods and the game auto-pauses for decisions, launches, and events. R&D, manufacturing, and missions all resolve on the monthly tick.

**Era progression** is driven by calendar year *and* by the technology the global community (you + rivals) has unlocked. Each era opens new tech branches, contract types, destinations, and event pools.

| Era | Years (approx.) | Defining capability | New playspace |
|---|---|---|---|
| 0 — Pioneer | 1942–1957 | Liquid/solid sounding rockets, captured/derived V-2-class tech | Sub-orbital, upper atmosphere |
| 1 — Early Orbital | 1957–1969 | First satellites, expendable orbital launchers | LEO, basic comms/recon sats |
| 2 — Crewed & Lunar | 1961–1975 | Human spaceflight, capsules, lunar trajectories | Crewed LEO, Moon flybys & landings |
| 3 — Station & Shuttle | 1975–2000 | Partial reuse, long-duration stations, deep-space probes | LEO stations, planetary probes |
| 4 — Commercial | 2000–2030 | Cheap reusable launch, smallsats, commercial crew | Megaconstellations, crewed commercial |
| 5 — Expansion | 2030–2060 | In-space refueling, ISRU, lunar/Mars surface ops | Lunar base, Mars landing |
| 6 — Interplanetary | 2060–2100 | Nuclear thermal/electric, asteroid mining, cyclers | Belt, outer-planet moons |
| 7 — Speculative | 2100+ | Fusion drives, large-scale settlement, mass drivers | Whole system economy, precursor interstellar |

Eras are **soft**: a slow player can still be flying expendable kerolox in 2010; an aggressive one can pull future tech forward at high R&D cost and risk.

---

## 3. The Solar System as Game Board

The map is an energy map, not a distance map. Movement between any two points costs **delta-v (Δv)** and **time**, and may require a **launch window**.

### 3.1 Delta-v budget (approximate, m/s)

These are the numbers the simulation uses to gate destinations. They are deliberately close to real mission-planning figures.

| Maneuver | Δv (m/s) | Notes |
|---|---|---|
| Earth surface → LEO | ~9,400 | Includes gravity + drag losses; the great filter |
| LEO → GTO | ~2,440 | Geostationary transfer |
| GTO → GEO | ~1,470 | Circularization |
| LEO → Trans-Lunar Injection | ~3,120 | |
| TLI → Low Lunar Orbit | ~900 | Lunar orbit insertion |
| LLO → Moon surface | ~1,730 | Descent (ascent similar) |
| LEO → Earth escape | ~3,200 | |
| LEO → Trans-Mars Injection | ~3,600 | Window-dependent |
| Mars capture → low orbit | ~1,400 | Less with aerobraking |
| Mars orbit → surface | ~1,000+ | Mostly aero; powered terminal |
| LEO → Asteroid Belt (Ceres) | ~7,000–9,000 | Highly target-dependent |
| LEO → Jupiter system | ~6,300 + capture | Gravity assists reduce this |

**Aerobraking/aerocapture** is a tech that discounts capture/descent Δv at the cost of heat-shield mass and risk. **Gravity assists** are a planning minigame that trade time for Δv.

### 3.2 Destinations and why you go

Each body offers economic and prestige reasons, gated by hazards:

- **LEO** — comms, Earth observation, crew stations, debris (a growing late-game hazard you can monetize cleaning up).
- **GEO** — high-value comms slots, limited "parking spaces" you can lease.
- **The Moon** — prestige firsts, then water ice at the poles → in-situ propellant (LOX/LH2), a fuel station for everything beyond.
- **Mars** — prestige, science, eventually settlement contracts; CO₂ + water → methalox via Sabatier.
- **Near-Earth Asteroids / Belt** — volatiles (water = propellant), metals, platinum-group metals (huge value, huge Δv and time).
- **Outer moons (Europa, Titan, Enceladus)** — science contracts, late-game volatiles, He-3 narrative (gas giants).

### 3.3 Environmental hazards (design knobs per destination)

- **Radiation** (Van Allen belts, solar particle events, deep-space GCR) — drives shielding mass and crew health timers.
- **Thermal** (inner-system heat, outer-system cold) — drives power and TPS requirements.
- **Dust/regolith** (Moon, Mars) — abrasion, seal failure, EVA wear.
- **Gravity wells & atmospheres** — landing difficulty; Mars's thin atmosphere is "too thick to ignore, too thin to rely on."
- **Distance/light-lag** — autonomy requirement; teleoperation impossible past the Moon.

---

## 4. Resources & Economy Inputs

The economy runs on several distinct resource types so that no single currency dominates:

1. **Capital ($)** — the master currency. Funds R&D, payroll, construction, and operations.
2. **Raw materials** — aluminum, steel, titanium, composites, exotic alloys. Bought on a fluctuating commodity market; later self-produced or mined.
3. **Propellants** — the consumable that flies. Tracked by type (see §10.2): LOX, RP-1, LH2, hydrazine/N₂O₄, methane. Have price, density, storability, and toxicity attributes.
4. **Research capacity (RP)** — generated by your engineering staff and facilities; spent down the tech tree.
5. **Manufacturing capacity** — throughput of your factories; gates how fast you build vehicles and how many you can fly.
6. **Reputation** — a multi-axis trust score (§8.4) affecting contracts, investment, talent, and insurance.
7. **Rare/strategic resources (late game)** — platinum-group metals, He-3, in-space-produced propellant. Bridge the economy from "launch company" to "space industrial concern."

Resources have **storage limits** (tank farms, warehouses, propellant depots) and **logistics** — getting LH2 to a remote pad, or propellant to lunar orbit, becomes a puzzle in later eras.

---

## 5. Technology Tree

### 5.1 Mechanics

- Tech is organized into **branches** (below). Each branch has **tiers (T0–T8)** loosely mapped to eras.
- Each node has: **prerequisites** (within and across branches), **RP cost**, **calendar time** (some research can't be rushed), **$ cost**, and **unlock effects** (new components, build options, efficiency modifiers, or destinations).
- **Cross-branch gating** is the heart of progression: a reusable methalox booster needs Propulsion T5 *and* Materials T5 (cryo stainless) *and* Avionics T5 (autonomous landing GNC) *and* Recovery T5 *and* the ground infrastructure to catch it.
- **Pulling tech forward:** you may research a node before its era at a steep RP/$/time penalty and an added reliability risk (immature tech), modeling moonshots.
- **Flight heritage feeds research:** flying (and surviving) a technology generates bonus RP toward refining it, and lowers its failure rate (§7.3).

### 5.2 Branches and representative nodes

**A. Propulsion**
- T0: Solid sounding motor; Pressure-fed alcohol/LOX engine (V-2 class)
- T1: Gas-generator kerolox; Storable hypergolics; Thrust-vector gimbaling
- T2: Regenerative cooling; Hydrolox upper stage; Engine clustering
- T3: Staged-combustion cycle; Engine reusability/refurbishment
- T4: Deep throttling; Multi-restart; Sea-level/vacuum optimization
- T5: Full-flow staged-combustion methalox; Landing-rated engines
- T6: Nuclear thermal (NTR); High-area-ratio aerospikes
- T7: Nuclear-electric / high-power ion; Solar-electric tugs
- T8: VASIMR-class plasma; Early fusion drive *(speculative)*

**B. Materials & Structures**
- T0: Riveted aluminum / steel airframes
- T1: Welded aluminum alloys; pressure-stabilized "balloon" tanks
- T2: Titanium components; ablative heat shields
- T3: Reusable tile/blanket TPS
- T4: Carbon-fiber composites
- T5: Friction-stir welding; cryo-stainless (cheap reuse)
- T6: Metallic additive-printed primary structure
- T7: Self-healing composites; metamaterials
- T8: In-space-manufactured large trusses; graphene/CNT structures *(speculative)*

**C. Avionics & Guidance (GNC)**
- T0: Analog gyro guidance
- T1: Radio-command guidance
- T2: Digital inertial guidance computer
- T3: Fly-by-wire; triple-redundant computers
- T4: GNSS-aided navigation
- T5: Autonomous propulsive-landing GNC; machine vision
- T6: Fully autonomous mission management
- T7: AI flight director; fleet/swarm coordination
- T8: Distributed autonomous fleet intelligence *(speculative)*

**D. Recovery & Reuse**
- T0: Expendable only
- T1: Parachute capsule recovery
- T2: Ocean splashdown / aerial catch
- T3: Winged glide-back orbiter
- T4: Parachuted booster recovery
- T5: Propulsive vertical landing
- T6: Full-stack reuse + rapid turnaround
- T7: In-space refurbishment / orbital depots
- T8: Self-maintaining vehicles *(speculative)*

**E. Manufacturing & Production**
- T0: Hand-built prototypes
- T1: Small-batch machining
- T2: Tooling & jigs
- T3: CNC machining
- T4: Automated composite layup
- T5: Additive-manufactured engines
- T6: Mass-production "rocket factory"
- T7: Off-world manufacturing (lunar/orbital)
- T8: Self-replicating production *(speculative)*

**F. Crew & Life Support (ECLSS)**
- T1: Pressurized capsule, open-loop O₂ (hours)
- T2: CO₂ scrubbing (days)
- T3: Partial closed loop (station weeks)
- T4: Water recycling (months)
- T5: Closed-loop ECLSS (deep-space months)
- T6: Bioregenerative food production
- T7: Deep-space radiation shielding; spin-gravity
- T8: Fully closed ecology *(settlement)*

**G. Power**
- T0–T1: Primary/secondary batteries
- T2: Fuel cells
- T3: Silicon solar arrays
- T4: RTG (radioisotope)
- T5: High-efficiency deployable arrays
- T6: Compact fission reactor (kilopower class)
- T7: Megawatt-class space reactor
- T8: Fusion power *(speculative)*

**H. In-Space & ISRU**
- T4: Orbital rendezvous, docking, propellant transfer
- T5: Propellant depots
- T6: Lunar water → LOX/LH2; Mars Sabatier methalox
- T7: Asteroid mining (volatiles, metals, PGMs)
- T8: He-3 extraction; system-scale ISRU economy

**I. Ground & Launch Infrastructure**
- T0: Test stand + simple pad
- T1: Dedicated launch complex
- T2: Mission control + tracking network
- T3: Vehicle integration facilities
- T4: Multi-pad high cadence
- T5: Rapid-reuse pad + catch tower
- T6: Spaceport + orbital traffic management
- T7: Off-world launch/catch infrastructure
- T8: Mass driver / space elevator *(speculative)*

---

## 6. Launch Vehicle Development

Vehicles are **assembled from components**, and performance is **computed**, not assigned.

### 6.1 The design workshop

A vehicle is a stack of **stages**, each composed of:
- **Engine(s):** type (sets ISP, thrust, mass, cost, reliability), count.
- **Tankage:** propellant type and mass loaded (sets structural mass via the materials tech mass-fraction).
- **Structure & TPS:** materials tech sets the dry-mass fraction and reuse capability.
- **Avionics:** GNC tier sets guidance accuracy, landing capability, and a reliability modifier.
- **Payload / fairing / crew module** on the top stage.
- **Recovery hardware** (legs, fins, chutes, wings) — adds dry mass, enables reuse.

### 6.2 The physics model

Performance per stage uses the **Tsiolkovsky rocket equation**:

> **Δv = Isp · g₀ · ln(m₀ / m_f)**
> where g₀ = 9.81 m/s², m₀ = wet mass, m_f = dry mass, Isp in seconds.

Total vehicle Δv = sum of stage Δv (with staging). The sim then compares **achievable Δv** against the **mission Δv budget** (§3.1) plus margins for losses and reserves.

**Worked example (a small Era-1 expendable to LEO):**
- *Stage 1:* kerolox, Isp 290 s (sea level). Wet 100 t, dry 8 t → Δv = 290 × 9.81 × ln(100/8) ≈ **7,180 m/s**
- *Stage 2:* kerolox, Isp 340 s (vacuum). Wet 20 t, dry 3 t → Δv = 340 × 9.81 × ln(20/3) ≈ **6,320 m/s**

Naively summed that's ~13,500 m/s, but the sim subtracts **gravity losses, drag, and steering losses** (~1,500–2,000 m/s to LEO) and requires the second stage to actually carry the payload. After losses and payload mass this vehicle lands around the ~9,400 m/s LEO threshold — a believable early orbital launcher with a small payload. The point: **the player feels staging, mass fraction, and Isp directly.**

Key tunable relationships the player learns to manipulate:
- **Higher Isp** (hydrolox, NTR, electric) → more Δv per kg of propellant, but tradeoffs (LH2 is bulky/cold; NTR is heavy/political; electric has tiny thrust).
- **Better materials** → lower dry mass → better mass ratio → more Δv.
- **Staging** beats a single stage because you shed dead mass.
- **Reuse** adds dry mass (legs, TPS, landing propellant reserve) — it *costs performance* but slashes per-flight cost. This tension is a central strategic choice.

### 6.3 Thrust & liftoff check

The sim also checks **thrust-to-weight > 1** at liftoff (else it sits on the pad) and within structural limits (max-Q, acceleration limits for crew/payload). Too few engines = won't fly; too many = mass/cost/reliability penalty.

### 6.4 Outputs of a design

For any vehicle the workshop reports: payload to each destination, reliability estimate, unit build cost, marginal launch cost, reuse turnaround time, and whether it's crew-rated.

---

## 7. Reliability, Testing & Failure

### 7.1 Reliability model

A vehicle's per-flight success probability is a product of factors:

- **Component reliability** (each engine, stage, separation event — more events, more risk).
- **Engine-out tolerance** (clusters with margin can survive a failure — a design choice).
- **Team skill** in the relevant disciplines (§8).
- **Technology maturity** (newer/pulled-forward tech is riskier).
- **Testing investment** (§7.2).
- **Flight heritage** — the learning curve (§7.3).
- **Schedule pressure** — rushing a launch to hit a contract date or beat a rival raises risk.

### 7.2 The test program

Before flying, players invest in testing to retire risk:
- **Component tests** (engine bench firing, tank pressure tests).
- **Static fires** (full-stack hold-down).
- **Uncrewed test flights** (expensive, but generate heritage and data).
Each test costs $, time, and hardware, and **buys down** the failure probability. Skipping tests is cheaper and faster but gambles with reputation and crew.

### 7.3 The learning curve (flight heritage)

New designs are dangerous. A fresh vehicle might fly at ~1-in-8 to 1-in-20 loss odds; with successful flights it climbs toward 1-in-50, then 1-in-100+. Failures *also* teach (anomaly investigations yield data) but cost reputation, hardware, and downtime. This reproduces the real arc of every launch system.

### 7.4 Failure modes & consequences

- **Pad anomaly / RUD** — loss of vehicle (+ pad damage), grounding, investigation.
- **Ascent failure** — loss of payload; severity scales with what was aboard.
- **Crew loss** — catastrophic reputation hit, lengthy stand-down, possible regulatory action.
- **Partial failure** — wrong orbit, degraded mission; contract penalties, sometimes salvageable.
Every major failure spawns an **investigation** (time + $) that, once resolved, often grants a permanent reliability improvement to that fault path.

---

## 8. Personnel Management

People are the engine of R&D, manufacturing, reliability, and operations.

### 8.1 Roles

- **Engineers**, specialized by discipline: Propulsion, Structures, Materials, Avionics/GNC, Life Support, Production, Mission Operations. Engineers generate **RP** in their branch and raise reliability of work in their discipline.
- **Technicians** — build and maintain hardware; set manufacturing throughput and turnaround.
- **Mission controllers** — run launches and missions; reduce operational error rates.
- **Astronauts** — crew flights; have health, experience, training, and morale; finite careers.
- **Scientists** — boost science-contract value and ISRU/research outputs.
- **Managers/Directors** — multiply department effectiveness and unlock larger org capacity.

### 8.2 Attributes

Each person has **skill** (current ability), **experience** (grows with relevant work, slowly raising skill), **specialization**, **salary**, **morale**, and **fatigue/burnout**. Star hires ("chief engineer" archetypes) provide outsized bonuses and are contested with rivals.

### 8.3 Hiring, training, attrition

- **Talent pool** scales with era, your reputation, and salaries offered. Top talent gravitates to prestigious, successful companies.
- **Training** spends $ and time to raise skill; safer than over-relying on green hires.
- **Attrition** from low morale, burnout, after disasters, or poaching by rivals. Retirements thin senior ranks over decades.

### 8.4 Morale & the multi-axis reputation system

**Morale** rises with success, fair pay, reasonable workload, good facilities; falls with disasters, crunch, pay gaps, and stagnation. Low morale slows R&D, raises error rates, and accelerates attrition.

**Reputation** is tracked on several axes, each affecting different systems:
- **Reliability reputation** → insurance rates, commercial contract win-rate.
- **Innovation reputation** → talent attraction, investor valuation, prestige contracts.
- **Safety reputation** → crew/government contracts, regulatory latitude.
- **Prestige ("firsts")** → milestone bonuses, national/PR contracts, morale.

---

## 9. Economics & Business

### 9.1 Revenue streams (unlock by era)

- **Government launch contracts** — satellites, defense, science; stable, prestige-bearing, sometimes cost-plus (low risk, capped upside).
- **Commercial satellite deployment** — competitive bidding; price-sensitive.
- **Megaconstellation deployment** (Era 4+) — high cadence, rewards reuse.
- **Crew transport & cargo resupply** — to stations and bases; premium, safety-gated.
- **Space tourism** — suborbital → orbital → lunar flyby; premium, reputation-sensitive.
- **Science/probe missions** — planetary contracts; long lead, prestige.
- **In-space services** (Era 5+) — refueling, tugs, debris removal, satellite servicing.
- **Resource returns** (Era 6+) — lunar propellant sold in-orbit, asteroid PGMs, He-3.
- **Tech licensing** — sell mature tech to rivals for income (and help them catch up).

### 9.2 Cost structure

- **R&D spend** — converts $ to progress (alongside engineer-generated RP).
- **Fixed overhead** — facilities, payroll, maintenance; the monthly burn that pressures you.
- **Manufacturing** — per-vehicle build cost, amortized over reuse count.
- **Marginal launch cost** — propellant, refurbishment, range/insurance fees.
- **Insurance** — priced off reliability reputation; self-insuring is a gamble.
- **Failure costs** — lost hardware + payload liability + investigation + downtime + reputation.

### 9.3 Financing

- **Founder seed capital** (chosen at start with the company profile, §11).
- **Venture investment** — cash for equity; dilutes control, raises growth expectations.
- **Government subsidies / anchor contracts** — era- and politics-dependent lifelines.
- **Debt** — loans with interest; dangerous against lumpy launch revenue.
- **IPO** (late) — large capital infusion, ongoing shareholder pressure for performance.

### 9.4 Market dynamics & competition

- Each segment has a **demand curve** that grows across eras (e.g., comms demand explodes in Era 4).
- **Reusable launch crashes prices**, rewarding early movers and squeezing expendable holdouts.
- **Rival firms/agencies** bid against you, achieve firsts, poach talent, and set the pace. They can be modeled on historical analogs or generated.
- **Contract win probability** is a function of bid price, reliability reputation, schedule credibility, and relationship.

---

## 10. Missions & Operations

### 10.1 Mission planning loop

1. **Take a contract** (payload, destination, deadline, payment, penalties) or fly a self-funded mission (tourism, prestige, ISRU).
2. **Assign a vehicle** whose computed Δv/payload meets the destination budget with margin.
3. **Check the launch window** — trivial for LEO; for interplanetary targets, windows open periodically (e.g., a Mars transfer window roughly every ~26 months), forcing scheduling decisions.
4. **Set the test/risk posture** and crew assignment.
5. **Launch** — weather and technical scrubs may delay; then a reliability roll resolves the flight, possibly with partial outcomes.
6. **Operate** — multi-leg missions (transfer, capture, landing, surface ops, return) each carry their own checks; deep-space legs require autonomy and consumables.

### 10.2 Propellant reference (drives the design tradeoffs)

| Propellant | Isp (vac, approx.) | Density | Storable? | Notes |
|---|---|---|---|---|
| Solid (APCP) | ~250 s | High | Yes (long) | Simple, no throttle/restart |
| Hypergolic (N₂O₄/hydrazine) | ~285–340 s | High | Yes | Toxic; reliable ignition; good for in-space |
| Kerolox (RP-1/LOX) | ~300–350 s | High | No (LOX cryo) | Dense, cheap, workhorse |
| Methalox (CH₄/LOX) | ~360–380 s | Med | Semi | Clean reuse, ISRU-friendly (Mars) |
| Hydrolox (LH2/LOX) | ~420–450 s | Very low | No (deep cryo) | High Isp, bulky, hard to store |
| Nuclear thermal | ~850–950 s | n/a | n/a | Heavy, political, huge Δv |
| Electric (ion/Hall) | ~1,500–5,000 s | n/a | n/a | Tiny thrust, needs power, slow |
| Fusion *(spec.)* | 10,000+ s | n/a | n/a | Endgame |

---

## 11. Company Profile & Start Options

At game start the player picks a **starting nation/bloc** (affects available contracts, politics, and talent), a **founding era** (default Era 0; later starts trade prestige for a head start), and a **company archetype** that sets seed capital and biases:

- **Garage Pioneer** — low capital, high innovation reputation potential, slow but flexible.
- **Industrial Spinoff** — strong manufacturing and capital, conservative tech.
- **Government Contractor** — reliable anchor contracts, low autonomy, prestige path.
- **Venture Moonshot** — big capital, big expectations, high burn, aggressive tech-pulling.

---

## 12. Progression & Endgame

**Two modes:**
- **Campaign** — a milestone ladder with historical pressure and rival competition.
- **Sandbox** — open-ended, configurable rivals and economy.

**Milestone ladder (prestige firsts):**
First sounding rocket → first satellite to orbit → first recovery/reuse → first crewed flight → first space station → first lunar landing → first reusable orbital vehicle → first lunar propellant production → first crewed Mars landing → first asteroid mining return → first permanent off-world settlement → interstellar precursor mission.

**Scoring axes** (for sandbox / endgame summary): net worth, market share, prestige firsts achieved, cost-per-kg-to-orbit driven down, and **humans living off-Earth** (the ultimate "score" the whole economy bends toward).

---

## 13. Open Design Questions
*(decisions that will shape the next layer of detail)*

1. **Medium & fidelity** — is this aimed at a video game, a tabletop/board sim, or a software model you'll actually build? It changes how much of the math is exposed vs. abstracted.
2. **Math exposure** — should the player manipulate the rocket equation directly (hardcore, "Kerbal-with-spreadsheets"), or should the workshop present results with the math under the hood?
3. **Single-player vs. competitive** — is the fantasy mainly a solo build, or is jockeying with rival firms/agencies central?
4. **Player's relationship to the state** — independent disruptor competing with national agencies, or contractor working for them (or a toggle)?

---

*End of v0.1 foundations. Each numbered system is ready to be expanded into its own detailed spec — propulsion node-by-node, the full reliability formula, the contract/bidding model, or a concrete tech-tree dependency graph — once direction on §13 is set.*
