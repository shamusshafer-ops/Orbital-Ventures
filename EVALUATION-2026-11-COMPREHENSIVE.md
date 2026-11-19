# Orbital Ventures — Comprehensive Gameplay, Progression & Systems Evaluation (2026-11-19)

Owner's brief: the 12-phase "comprehensive gameplay, progression & systems refinement" prompt
(`C:\Users\sshaf\Documents\# ORBITAL VENTURES — COMPREHENSIVE.txt`), run in full from scratch rather than as a gap pass.
It overlaps heavily with `EVALUATION-2026-11-GAMEPLAY.md` (2026-11-16) and the decision-loop roadmap that followed; where
an earlier fix still holds it is credited, where it has regressed that is called out with the measurement.

**Method.** Code reading of every system named in the brief, a data census, and — the main evidence — the headless
autoplay bot (`tools/autoplay-bot.js`) run as **eight player strategies** (this pass added five new strategy knobs) on
fixed seeds from 1942 to 2010, plus 30-seed opening sweeps and a 7-commit bisect. Screenshots of the Design Bench and
R&D tree in headless Firefox for the UI read.

**What this cannot tell you.** The bot is a floor, not a person. It designs rockets by random search, so it rarely
manages Mars or Jupiter profiles (32 "no design" attempts at Mars Flyby in one run) — late-game interplanetary pacing is
therefore *not* validated here. It feels nothing: excitement, clarity and drama are judged by reading the code and the
screens, not measured. Simulated play is not a playtest.

---

## 1. Initial gameplay assessment

**Strengths (keep and build on).** The core loop — size a vehicle against a real Δv target with real engines, then
watch it fly — is the game's identity and holds up. The Design Bench is unusually legible: reliability, risk, net
economics, test campaign and the go/no-go block are all on one screen. The spine work of 11-16 → 11-18 (frontier era,
re-flight saturation, launch policy, Annual Review, science-as-cost, flight teams, failure investigations) gave the
mid-game real pressure. The Programs ladder is a natural spine. Twenty-odd systems are individually well built.

**Weaknesses (measured, worst first).**

1. **Engaging with the game was economically punished.** Across 8 strategies × 3 seeds, **15 of 18 runs that hired
   staff, built a station, followed a strategy or built a base ended bankrupt (1963–2006)**, while the "floor" bot that
   ignores staff, stations and crew finished every seed with **$2.4–2.9 billion**. Part of this is a bot limitation
   (fixed in this pass, §5) — but the shape is real: fixed costs of infrastructure and staff outran what they returned.
2. **The Engineer opening had regressed to lethal.** 14/30 campaigns went insolvent at least once and **7/30 were
   game-over by 1946** (11-16 step 4 had measured 0/40 — on a narrower one-year window). Bisect: 2/30 → 6/30 → 9/30 →
   11/30 insolvent-before-1944 across steps 5a, 5b–7 and Phase 2. Survivors were rich by 1950 — lethal-then-forgiven.
3. **Reliability stopped being a decision.** Company reliability (heritage + 26 reliability nodes worth +0.89) exceeds
   the Engineer cap (0.95) by the end of Early Orbital; **81–94% of all flights flew at the cap**. An engine's own
   rated reliability never touched the odds (A/B: five engines on one rocket all flew at 0.650). Heritage used the
   *best*-proven engine on the stack. So engine choice was cost-vs-Δv only, and methalox (era 4) strictly dominated
   every kerosene engine on cost/kN, Isp, TWR and reliability the day it arrived.
4. **The Cautious launch policy guaranteed failures.** It aborted every uncrewed, unrecoverable vehicle on an amber
   flag — the abort saves nothing, pressing on rolls the flight as-is. Cautious + static fire: **3/3 seeds dead in 1943
   with a 100% failure rate.**
5. **Bases were generic producers.** A base was a bigger station: income/science/fuel scaled by distance, a ≤25% build
   discount for missions to its world, and nothing only a base could do. Modules never changed what a base *was*. The
   infrastructure bot went bankrupt first (1967, 1974, 1981). Base "fuel" teleports to the LEO depot.
6. **Late content is thin.** Five procedural contract archetypes exist; none use a base, a station's cargo, or
   interplanetary logistics. Once the 28 authored missions are flown, the board offers comsats, crew rotations and
   lunar samples.
7. **A broke company got no advice.** After a failed First Satellite ($5–6M — five times any Pioneer rocket) the
   advisor kept saying "Launch: First Satellite" to a company that could not afford it.

**Most important opportunities.** Make reliability a design decision again (hardware maturity), make bases a
progression with capabilities, give outposts customers, and make failure recoverable without making it free.

---

## 2. Systems integration analysis

### 2.1 Dependency map (as found)

```
                 ┌──────────── money ◄──── payouts (authored, procedural, service, passive)
                 │               ▲  ▲
 RESEARCH ──$,⚛──┤               │  └── facility income (station/base) ◄── modules ◄── $
   │  engines    │               │
   │  rel nodes ─┼─► company reliability ──► [CAP 0.95] ──► flight roll ◄── weather, team ceiling, flaws
   │  unlocks    │        ▲ heritage (successes)                 ▲
   ▼             │        │                                      │ engines: cost, Isp, thrust ONLY (rating ignored)
 DESIGN BENCH ───┴── build $ ─► hull ─► launch ─► outcome ─► rep ─► mission gates (minRep)
   ▲                                       │            └► science ─► research gate
   │                                       └► investigations (Phase 2), debrief card
 STAFF ── salary $ ─► team ceiling, R&D speed, astronauts (crew gate), flight teams
 STATION ── $ ─► science, R&D speed, depot fuel ─► profile-mission top-off
 BASES ── $ ─► income/sci/fuel (same as station ×distance), build discount to own world
 RIVALS ◄─► firsts (frontier era)        ANNUAL REVIEW ─► objectives ─► $/rep
```

**Disconnected or one-directional before this pass:** engine rating → odds (absent); reliability research after the
cap (dead); base modules → anything a station doesn't also give (absent); bases → contract demand (absent); the
advisor → affordability (absent); Cautious policy → uncrewed recovery (wrong).

### 2.2 How the changes reconnect them

- **Design ↔ reliability ↔ research ↔ testing:** hardware maturity multiplies the capped process number, so engine
  choice, engine experience, test campaigns and the Testing track feed the odds all game.
- **Bases ↔ logistics ↔ missions ↔ contracts:** base tiers change resupply cost, abandonment risk, mission build cost
  and founding cost elsewhere; a Research Base creates contract demand the fleet flies.
- **Failure ↔ recovery ↔ advice:** early failures teach, the advisor routes a broke company to cheaper work, and the
  checklist keeps a two-flight reserve.

---

## 3. Implemented improvements

All changes are in `src/` with tests; save version 77.

### Rocket construction (Phase 3)
- **Hardware maturity** (`hardwareMaturity`, `computeVehicle`): vehicle reliability = capped process × Π over every
  distinct engine type on the vehicle (launch stages, strap-ons, transfer, lander) of
  *rating* × *qualification*.
  - *Rating* = engine rel ÷ 0.96 (the V-2), bounded ×0.96–×1.02. An F-1 costs ~3%; solids earn ~1.6%.
  - *Qualification*: an unflown engine type carries up to 10% extra risk, falling to 0 over 8 successful flights.
    The risk scales with how new the technology is to the **world**: 1940s–50s engines 4%, era-2 hardware 8%,
    era-4+ the full 10%; anything two eras behind the frontier is off-the-shelf (0%). The V-2 is qualified.
  - Static fire credits 3 qualification flights, an uncrewed test flight 6; Engine Test Stands (+2), Flight
    Qualification (+1) and the Autonomous Test Program (+2) credit every engine.
  - Result: a proven engine vs a frontier one is a real trade (methalox no longer replaces everything for free), and
    the least-proven engine on the stack is what bites.
- Bench flags explain it: "New engine — X: n/8 qualification flights, −y% reliability…", and engine ratings above or
  below the norm.

### Missions and progression (Phase 2, 8)
- **Early-program learning** (`noteEarlyLesson`): with fewer than 5 successes, each failed flight adds +4% to the next
  attempt (max +12%); the next success spends it. Shown on the bench.
- **"Earn first" advice** (`earnFirstFor`): when the next objective's recorded attempt cost exceeds cash, the advisor
  names the best-paying job on a clearly smaller rocket (≤80% of the Δv) instead of "Launch".
- **Checklist reserve** after First Flight is two attempts, not one.
- **Cautious launch policy** (`policyChoice`): aborts only when it saves the crew or recovers the vehicle.

### Planetary and lunar bases (Phase 4)
- **Base progression tiers** (`baseTierFor`, derived from what is built): Outpost → Research Base (habitat + lab/rover
  + room for 4: science ×1.25) → Industrial (ISRU + reactor, power surplus: resupply ×0.75, missions to that world
  +10% cheaper) → Self-Sufficient (greenhouse + room for 8: resupply ×0.5, cannot be abandoned for want of supplies)
  → Logistics Hub (8+ modules: the next world's base founded 30% cheaper). Promotions are announced on the log and
  front page with a rep award; the Outposts panel shows the ladder with what the next tier needs and gives.

### Orbital stations (Phase 5)
- **Depot capacity and export** (`depotCapacity`, `exportDepotOverflow`): 40 t + 60 t per Propellant Depot module;
  surplus is sold at the market rate monthly (vented without Orbital Depot research). Holding opex per tonne had made
  an ISRU plant's output an unbounded storage bill — ~$7.7M/mo after ten years.
- **Mothballing** (`mothballFacility`, `reactivateFacility`): any station or base can be safed — no output, no opex,
  no provisions consumed, no wear; reactivation costs 10% of its founding price. The recovery tool a cash-strapped
  program lacked.
- No other station change this pass. The station keeps its distinct role (labs, R&D speed, depot, crew rotation) and is
  deliberately *not* tiered. Measured economics in §4: it is a science investment that loses money after the third
  module — acceptable as a choice, flagged in §6.

### Technology tree (Phase 6)
- The Testing track (Engine Test Stands, Flight Qualification, Autonomous Test Program) now also credits engine
  qualification, so it keeps paying after the process cap. The remaining reliability-only nodes are flagged in §6.

### Economy and pacing (Phase 7)
- **Bridge loans amortize** (`loanRepayDay`, `state.loanBalance`): each loan books 1.35× principal; the 6%/mo service
  pays it down and stops (~22 months). It used to be permanent (~72%/yr forever) — the bot measured the loans
  themselves as the opening's death spiral. Service set without a balance (reorganization workout on an older save)
  keeps the old behaviour.
- Depot export and mothballing above. The late-game insolvency was partly a bot artifact (§5).

### UI and visual presentation (Phase 9)
- Bench flags for lessons, new-engine qualification and engine ratings; the base progression ladder; the "Earn
  first" advisor card. (Earlier this session, outside the brief: Command Center label flicker fix, wider site, sized
  parking, propellant farm — commit a7c8366.)

---

## 4. Balance changes

| Value / rule | Before | After | Why |
|---|---|---|---|
| Vehicle reliability | min(cap, process) | min(cap, process) × Π(rating × qualification) | Engine choice and experience matter after the cap (81–94% of flights sat at it). |
| Engine rated reliability | ignored by the roll | ×(rel/0.96), bounded 0.96–1.02 | A/B showed every engine flew identically. |
| New engine | free | −4% / −8% / −10% by era, gone over 8 flights; 0 if two eras old | Proven vs experimental is a decision; methalox no longer dominates for free. |
| Static fire / uncrewed test | +5% / +12% (pre-cap — dead once capped) | also +3 / +6 qualification flights | Testing stays useful all game. |
| Testing research | +rel (pre-cap) | also +2/+1/+2 qualification flights | Same. |
| Green-company failure | nothing | +4% next attempt per failure (≤ +12%) while < 5 successes | Failures teach; opening was lethal. |
| Checklist reserve after First Flight | 1 attempt | 2 attempts | Next flights cost more than First Flight. |
| Cautious, uncrewed, no recovery, amber flag | abort (certain loss) | press on | Abort saved nothing. |
| Lunar base, 8 modules | Outpost-equivalent; resupply full; abandonable | Logistics Hub; resupply ×0.5; not abandonable; +10% mission discount; Mars base −30% | Bases become a progression with capabilities. |
| Lunar base science | flat | ×1.25 from Research Base | |
| Lunar base contracts | none | Crew Exchange, Science Cargo (Research Base+) | Demand that only an outpost creates. |
| LEO depot | unlimited, $0.02M/t/mo holding | 40 t + 60 t per depot module; surplus exported at market | ISRU output was an unbounded bill. |
| Bridge loan service | +6% of principal/mo, permanent | same rate until 1.35× principal is repaid (~22 mo) | ~72%/yr forever made recovery impossible. |
| Station/base carrying cost when broke | unavoidable | mothball: $0 until reactivated (10% of founding cost) | No way to cut fixed costs. |
| Advisor with an unaffordable target | "Launch: X" | "Earn first: Y" (best job on ≤80% of the Δv) | A broke company sat idle until overhead finished it. |

Measured base economics (fully provisioned, before crew salaries; lunar):
`tier 1 → 3 → 5` net cash **+$0.6 → +$3.0 → +$5.2M/mo**, science **2.5 → 10.6 → 23.3/mo** (before: +$4.6M/mo and 18.6
science at 8 modules). LEO station: net **−$0.3 to −$0.6M/mo** from the third module, ~10 science/mo — unchanged.

---

## 5. Validation report

### Tests
- New suites: `test-comprehensive-p1.js` (lessons, Cautious policy, hardware maturity, Testing credit, the earn-first
  advisor) and `test-comprehensive-bases.js` (tiers, effects, promotions, abandonment, ladder UI, base contracts).
- Updated for intended behavior changes: `test-launch-policy.js` (Cautious), `test-opening-fix.js` (reserve),
  `test-failure-learning.js` (isolates investigation math from early lessons).
- Full sweep after all changes: **196/197 suites pass, 1 intentional skip, 0 unexpected** (194/195 before; two new suites).

### Bot changes (measurement fidelity, not game behavior)
- Strategy knobs: `BOT_TEST` (cautious), `BOT_RELCUT` (accident-prone), `BOT_SHOCK=Y:f` (broke at year Y),
  `BOT_SCIENCE=1`, `BOT_BASE=1` (founds and grows the lunar base); summary lines `reliability` (share of flights at the
  cap, by decade) and `base`.
- **Second build line behind long builds.** The bot built one vehicle at a time; a multi-year Saturn/Jupiter build
  froze it for years while fixed costs drained the treasury (full-5: payouts $782M in the 1970s → $9M in the 1980s).
  A person keeps flying. This explained most of the late-game bankruptcies.

### 5.1 Before (baseline at a7c8366)
| Scenario (seeds 2/5/8 → 2010) | Outcome |
|---|---|
| floor | 3/3 alive, $2.4–2.9B |
| full (hire+station+debrief) | 2/3 bankrupt (1985, 1995) |
| cautious (+Cautious policy, static fire) | 3/3 bankrupt **1943**, 100% failures |
| aggressive (Bold) | 2/3 bankrupt (1979, 1984) |
| science-first | 2/3 bankrupt (1984, 1987) |
| infrastructure (lunar base) | 3/3 bankrupt (1967, 1974, 1981) |
| accident-prone (cap −0.1) | 3/3 bankrupt (1982, 1982, 2006) |
| broke in 1960 (cash ×0.1) | 3/3 bankrupt (1963, 1979, 1985) |

Opening (default bot, 30 seeds): insolvent 14/30, game over 7/30 by 1946.
Reliability at cap: 81–94% of flights (all non-cautious scenarios).

### 5.2 After (all changes, same seeds and bot)
| Scenario (seeds 2/5/8 → 2010) | Outcome | vs before |
|---|---|---|
| floor | 3/3 alive, $2.6–3.4B | unchanged shape |
| full | **1/3 bankrupt** (1980); survivors $0.6–0.8B | was 2/3 |
| cautious | **2/3** (1944, 1983) — the 1944 seed is honest bad luck: 5 failures at 0.65–0.73, lessons visibly stacking | was 3/3 in 1943, 100% failures |
| aggressive | **1/3** (1980); **Jupiter reached twice** (1990, 2009) | was 2/3, Jupiter never |
| science-first | **1/3** (1981) | was 2/3 |
| infrastructure (lunar base) | **1/3** (1974); survivors $1.0–1.4B with the **highest reputation of any strategy** (5,650 / 6,846) | was 3/3 |
| accident-prone | **1/3** (1968) | was 3/3 |
| broke in 1960 | **1/3** (1963); two recover to $0.6–0.9B | was 3/3 |

**Non-floor runs bankrupt: 18/21 → 8/21.** Flights at the reliability cap: **81–94% → 26–53%** (floor bot 58–70%) —
engine choice and qualification now move the odds on most flights.

Opening (default bot, 30 seeds to 1955, $3.5M start): insolvent at least once **14/30 → 12/30**; out of bridge loans
(the bot cannot reorganize, so this is "needed Program Reorganization", not literally game over) **7/30 → 4/30**.
Tested and rejected: a $4.5M Engineer start bought one more seed (3/30) at the cost of Engineer's identity.

### 5.3 Unresolved and assumptions
- **The floor strategy is still the richest.** Ignoring staff, stations and crewed flight ends at $2.6–3.4B versus
  $0.6–1.5B for players who engage. Engaging is now *viable* and earns far more reputation and firsts, but cash still
  rewards ignoring the infrastructure game. See §6.1.
- **4/30 Engineer openings still need reorganization**, all in 1944–46. Early variance at 0.65 is the design intent of
  Engineer; the earn-first advice, lessons, amortized loans and the two-flight reserve cut it from 7/30.
- **Interplanetary pacing is not validated.** The bot's random-search designer cannot size Mars missions (no run reached
  Mars orbit) and only the aggressive runs reached Jupiter. Nothing here should be read as a Mars-era balance claim.
- **Bot strategies are crude proxies.** "Science-first" is a research ordering, "infrastructure" is one lunar base;
  neither is a person playing that way.
- **No human playtest.** The new bench flags and base ladder were checked in headless-Firefox screenshots only.

---

## 6. Remaining opportunities (descending impact; none of this is done)

1. **Make infrastructure pay in cash, not just reputation.** The floor bot is still the richest. Candidates: station
   and base labs that *sell* research (contracts for lab time), Industrial-base propellant contracts that undercut the
   LEO market for depot-fed missions, crew rotation contracts that require a station. Measure with the matrix: the
   infrastructure strategy should end within ~25% of the floor's cash.
2. **Mars and outer-world base demand.** Base contracts exist only for the Moon. Mars and Callisto/Titan bases need the
   same "customers come to your base" layer, gated by tier.
3. **Teach the bot to size interplanetary missions** (it has `autoSizePlan` available) so Mars/Jupiter pacing can be
   measured — prerequisite to tuning the late game honestly.
4. **Retire or repurpose the ~15 reliability-only nodes** outside the Testing track (Guidance, Crew). They still add to
   a process number that caps by the end of Early Orbital. Options: subsystem-specific hazard reductions (they would
   need `subsystemReport` to stop being weight-normalised), or fold them into fewer nodes that raise the cap slightly.
5. **Rocket parts with trade-offs.** The 26 parts are mostly geometry (tanks, adapters). Production time vs testing,
   reusability wear, and engine-out tolerance exist as research options; a part-level "proven vs advanced" choice
   (e.g. Al-Li tanks −15% mass, −1% reliability) already exists for tank materials and could be the template.
6. **Stations: a visible payoff per assembly flight.** A station loses money from its third module by design (labs
   trade money for science). Consider tiering it like bases (laboratory → depot → shipyard) so each assembly flight
   unlocks a capability.
7. **Opening variance.** If 4/30 reorganizations is too many for the owner's taste, the cleanest lever is the First
   Satellite cost cliff (6,000 → 9,400 m/s and $1M → $5–6M rockets): an intermediate paid suborbital/orbital contract
   at ~8,000 m/s would smooth it without touching Engineer's start money.

## 7. Executive summary

- **Is Orbital Ventures now more cohesive?** Yes, measurably. The systems that a player engages with — staff,
  stations, bases, testing — no longer bankrupt the program by default (non-floor bankruptcies 18/21 → 8/21), and
  bases, contracts, logistics and mission costs now feed each other.
- **Are rocket design decisions more meaningful?** Yes. Engine choice now moves the odds (rating × qualification),
  frontier engines carry a real qualification cost, test campaigns and Testing research matter all game, and the share
  of flights pinned at the reliability cap fell from 81–94% to 26–53%.
- **Do stations and bases serve important purposes?** Bases now do: a five-tier progression with concrete capabilities
  (science, cheaper logistics, cheaper missions, immunity to abandonment, cheaper next base), customers that only a
  Research Base attracts, and ISRU that exports. Stations are unchanged — a science investment — and are the next
  candidate (§6.6).
- **Is the technology tree more logical and rewarding?** Partly. The Testing track now pays after the cap; ~15 other
  reliability-only nodes are still dead weight late (§6.4).
- **Has pacing improved across the campaign?** The opening is less lethal (game-over-equivalent 7/30 → 4/30) and the
  mid/late game no longer collapses for engaged players. The late interplanetary game is unmeasured (§5.3).
- **Are there more interesting choices between launches?** Yes: proven vs new engine, test or fly, which base tier to
  build toward, mothball or carry a facility, which contract to fly when the next objective is out of reach.
- **The single biggest remaining weakness:** cash still rewards ignoring the infrastructure game — the floor strategy
  that skips staff, stations and crew finishes richest. Engaging is now viable and earns more reputation and firsts,
  but money does not yet say so (§6.1).
