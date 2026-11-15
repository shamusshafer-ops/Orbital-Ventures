# Orbital Ventures — Gameplay & Cohesion Evaluation (2026-11-16)

Owner's brief: *"It feels disjointed and not very much like a game, more a collection of modules. How do we tie
these together? I'd like 'one more turn' to be a real appeal."*

**Method.** Code reading of the turn loop (`advanceDays` → `tickContinuousDay` / `tickMonthlyBoundary`,
`runToNextEvent`, `recommendedAction`), a census of content and player actions, and — the main evidence —
a headless bot (`tools/autoplay-bot.js`) that plays the way the game steers a player: follow the advisor,
design the cheapest rocket that meets the target, fly it, answer every launch decision, sign contracts,
advance with the real "next event" button. 26 seeded runs, Engineer difficulty unless stated, 1942→2000.

**What the bot cannot see** (read every finding with this in mind): it never flies lunar/planetary
"profile" missions, never hires staff, never builds stations or bases, never touches manufacturing. It is
a floor — a player who ignores half the game. Where that matters, it is called out below. It also cannot
feel anything: presentation, drama and clarity are out of scope here.

---

## 1. The verdict in one paragraph

The game has a real core — designing a rocket to a Δv target and watching it fly is genuinely good — and
around it sit roughly twenty well-built systems. They feel like modules because **they don't compete for
anything.** Every system pays out in four currencies (money, reputation, science, public support), and all
four stop constraining your choices early: money by about 1950, reputation by about 1965, science never.
Once the currencies saturate, a station, a contract, a hire or a telescope produces nothing you need, so
there is no reason to choose one over another, and no choice means no game. Separately, the reputation
ladder runs fast while research is locked to the calendar, which opens multi-year gaps where the only thing
to do is fly the same mission again. "One more turn" needs three things the game currently lacks in the
middle and late game: **scarcity that never goes away, a goal 3–12 turns out that changes every year, and
a race you can actually win or lose.**

---

## 2. What was measured

| Measure | Result | Why it matters |
|---|---|---|
| Turns per in-game year | ~7 (median 30 days per turn; 391 turns for 1942–2000) | Cadence is fine; the Outliner + "next event" does its job. |
| Turns where the bot had nothing to do | ~25% | Acceptable on its own; the problem is *what* fills the rest (below). |
| Pioneer era milestones | All 6 done by mid-1944 | The Pioneer era lasts until 1957. |
| Research open 1945–1957 | 2 nodes open, **11 locked by the calendar** | Every remaining mission needs a locked node. |
| What the bot did 1945–1957 | Re-flew First Satellite **24 times** | Nothing else existed to do. No procedural contracts exist before 1957 (all archetypes are `minEra ≥ 1`). |
| What the bot did 1965–2000 | Re-flew Endurance **~170 times** | Repeats pay 40% of the payout forever, no decline. |
| Cash on hand | $22M (1944) → $500M (1956) → $658M (1960) | Overhead was $0.12–0.27M/month: **150+ years of runway.** |
| Cost of every research node in the game, combined | **$597M** | Less than the bot banked by 1960 without flying anything new. |
| LEO station / lunar base founding | $18M / $55M; modules $5–14M | Every sink is small against the surplus. Profile missions pay $14M–$1.8B *each*, so a human flying them is richer still. |
| Reputation | Flat at ~528 from 1965 to 2000 | Every rep gate was passed by ~1965; after that reputation had nothing left to unlock. |
| Science | Accumulated to ~100 and sat there | The science gate never blocked a single node in any run; its only spend is shaving a month off research. |
| Government funding | Fell to $0/month by 1970 | Nobody noticed, because money didn't matter. |
| Staff | **0 for all 58 years, including crewed flights** | Personnel (10 departments, 5 divisions, traits, hiring) is entirely optional. |
| Launch decisions | 173 decision stops on 240 launches (92 weather, 39 live calls, 32 orbit, 10 anomaly) | The bot gave the same answer every time and still thrived: these are chores, not choices. |
| Engineer opening | **7 of 20** runs hit insolvency within months after following the First Flight checklist and losing one launch | Checklist step 2 spends $1.5M of the $3.5M start on research before the first flight. |
| …and then | A bridge loan rescued 6 of 7; by 1950 they were indistinguishable ($100–250M) | Early stakes are high, then vanish: the inverse of a good difficulty curve. |
| Rivals | Claimed 7 firsts, including "first satellite" 13 years after the player's | A historical floor (`RIVAL_MAX_PULL_IN`) means rivals can't race a player who is ahead of history. |

Napkin difficulty: 0 of 12 openings went insolvent. Results were consistent across seeds (6 full runs to 2000
landed within ±8% on cash, flights and research).

---

## 3. Why it feels like a collection of modules

**3.1 Nothing is scarce for long, so modules never trade off against each other.**
This is the root cause; most of the rest follows from it. A game is a series of choices under scarcity. Here,
each system is an independent source of money/rep/science, and those currencies saturate. Stations, bases,
contracts, telescope, divisions, partnerships, doctrine multipliers — each is a reasonable producer of
something that has stopped being worth producing. That is exactly the "collection of modules" sensation: you
can visit each one, but none of them is *needed* by any other.

**3.2 Two clocks that disagree.** The reputation ladder (28 authored missions) runs at the player's pace;
research is gated to the calendar (C6 option b). A competent player outruns history in 2½ years and then
waits 13 years with nothing new to do. It recurs: in 1985 the bot had 0 open nodes and 14 calendar-locked.
The design document's own §2 says eras are driven by *"calendar year and by the technology the global
community has unlocked"* and that *"an aggressive [player] can pull future tech forward at high R&D cost"* —
the implementation kept only the calendar half.

**3.3 Repetition is the filler, and it is never priced out.** Routine re-flights pay 40% of the original
payout forever. With heritage making each repeat cheaper, re-flying your best mission is the dominant
strategy for decades, and the game never pushes back.

**3.4 The race isn't a race.** Rivals have momentum and rubber-banding (good), but cannot claim a first
before a historical floor. Ahead of history, you are racing no one; behind it, you lose on a timetable you
can't influence much. Either way the rival is a calendar, not an opponent.

**3.5 Interrupts are frequent and decided in advance.** About 70% of launches stop for a decision. Pressing
on / launching anyway was never punished enough to show up in the outcome. Frequent, predictable stops teach
the player to click through, which also blunts the rare stop that *does* matter.

**3.6 Whole systems are optional.** Zero staff for 58 years. Manufacturing micro (material dip-buys, engine
and part stock) was never touched and never missed. Optional systems read as side-modules by definition.

**3.7 Long-term identity choices don't change month-to-month play.** Programs (the milestone ladder),
Ambitions (the win condition) and Doctrine (playstyle multipliers) are distinct and well-conceived — they are
*not* redundant and should not be merged — but after you pick them, nothing on a given turn asks you to act
on them.

---

## 4. What works — keep and build on

- **The design loop.** Sizing a vehicle to a real Δv target with real engines is the game's identity and it
  holds up. Vehicle families and heritage create attachment to hardware.
- **Turn cadence.** ~7 turns a year, median 30 days, with the Outliner choosing where to stop. The machinery
  for "one more turn" is already right; it needs better things to stop *for*.
- **The Programs ladder** (Pioneer → Vanguard → Mercury → Gemini → Apollo → Ares → Outer Worlds). It maps
  almost one-to-one onto the eras. It is the natural spine and should become one (§5).
- **Rival momentum + rubber-band**, **lunar architecture fork**, **procedural contracts (E1.3)**, **flight
  presentation and decisions** — all good mechanisms, currently starved of stakes.
- **Failure as content** (inquiries, setbacks, near-miss attribution) — works when failures are rare.

---

## 5. The fix: one spine, and every module feeds it

> **Firsts are the score. The frontier is the clock. Money is the throttle.**

**5.1 Achievement moves the era (the frontier).** Define a *frontier era* = the later of the calendar era and
the era opened by the most recent completed Program (by you **or** a rival). Finishing the Pioneer Program
opens Early Orbital — a Sputnik moment — instead of waiting for 1957. `researchEraMet()` compares against the
frontier. This deletes the 13-year wall and makes the calendar a pressure, not a lock. A typical-pace player
sees history unchanged.

**5.2 Money buys speed.** Research one era *beyond* the frontier is allowed at a steep premium (a "crash
program", e.g. ×2.5 cost and +50% time). This is the design document's pillar, it gives surplus cash a
permanent use, and it ties the economy to the race.

**5.3 Rivals race the frontier, not the history book.** Key rival saving windows to the frontier era rather
than historical years (drop or relativise `RIVAL_MAX_PULL_IN`). If you sprint, they sprint; if you stall, they
take firsts. Firsts you lose cost payout and support (already implemented) — now it can actually happen.

**5.4 An Annual Review as the heartbeat.** Once a year, one screen: the year's results against objectives,
rival standings, public support → next year's government budget, and **three objectives offered, pick two**,
each with a reward. Objectives are drawn from your Program, skewed by Ambition and Doctrine — which finally
makes those choices matter month-to-month. This folds mandates, hearings, government funding and support
(currently four separate systems and modals) into one ritual. "One more turn" becomes "let me finish the
year" — a concrete goal 1–12 turns away, refreshed every year.

**5.5 Make every module produce something only it can.**
- **Science becomes a research currency**: nodes cost money *and* science. Flights, the telescope, station
  labs and science staff produce it. Now stations and staff are inputs to the tech race, not optional bonuses.
- **Personnel becomes required where it's real**: crewed missions need a trained astronaut (training takes
  time — a pipeline to plan), and staffed departments set a reliability *ceiling* per era rather than a small
  bonus. Consider collapsing 10 departments into ~4 teams so the requirement is legible.
- **Repeat flights saturate**: routine payout decays with repeat count (e.g. 40% → 30% → 20%, floor 10%,
  recovering slowly over years). Steady income moves to procedural contracts, which need an era-0 set
  (upper-atmosphere research, military range tests, weather sounding) so the Pioneer years have content.
- **Costs grow by era** (hardware and salaries) so late-game cash pressure exists without hand-tuning each
  sink. Target, measured by the bot: cash on hand should rarely exceed ~3 years of operating cost.

**5.6 Fewer, sharper interrupts.** Replace per-launch weather/live-call stops with a standing **launch
commit policy** (Conservative / Nominal / Aggressive), set once on the bench or via Doctrine, that answers
routine holds automatically. Only events the policy can't cover stop the clock. That removes most of the
173 decision stops per campaign and makes the remaining ones land.

**5.7 Fix the difficulty curve's shape.** On Engineer the opening is lethal-then-forgiven, and the middle is
trivial. Either have the checklist recommend flying before researching on Engineer, or give a founding grant
that covers one failed first flight; then let 5.2–5.5 supply the mid-game pressure.

---

## 6. Remove, merge, replace

| Item | Recommendation | Evidence / reason |
|---|---|---|
| Mandates, hearings, government funding, public-support readout | **Merge** into the Annual Review | Four systems that all mean "the state's view of you"; funding hit $0 unnoticed. |
| Nine event-modal families (mandate, hearing, inquiry, crisis, discovery, sample decision, setback, mishap, rival disaster) | **Fold** the political ones into the Review; keep the dramatic ones but rarer | Frequency is the enemy of drama. |
| Weather / live-call per-launch stops | **Replace** with a launch commit policy | 131 stops, same answer every time. |
| Science as a free-floating currency | **Replace** with science-as-research-cost, or remove | Gate never bound; balance sat unused. |
| Station Bench + Base Bench tabs | **Merge** into one "Outposts" tab | Same assembly code, same module list, two tabs. |
| Manufacturing micro (material dip-buys, engine/part stock) | **Abstract** into the build (auto-procure) unless it is made to bind | Never touched in 58 years; never missed. |
| Slider bench + part bench | **Revisit** after the browser playtest: one editor, sliders as quick sizing inside it | Owner decided in E3.7 that sliders stay — flagged, not overruled. |
| Doctrine / Ambition / Programs | **Keep all three**, connect them through Review objectives | Distinct purposes; the gap is that they don't act on turns. |
| Rival historical floor | **Replace** with frontier-relative timing | Rivals can't race a player ahead of history. |

Small bug found on the way: when a rival claims a first you already achieved, the front page still says it is
*"a milestone your own program hasn't"* (`fireRivalFirst`, else-branch shared by two cases).

---

## 7. Suggested order, each step measurable with the bot

Each step is small, keeps saves working, and has a pass/fail target `tools/autoplay-bot.js` can check.

| Step | Change | Bot target |
|---|---|---|
| 1 ✅ | Frontier era from completed Programs (5.1) + era-0 procedural contracts | No 5-year span with fewer than 2 new research nodes or missions available. **Met before 1981 in all 4 seeds** (was 30–35 thin windows; the remaining 9–10 are after 1981 and bot-limited). |
| 2 ✅ | Repeat-flight payout decay (5.5) | No single mission flown more than ~15 times in a decade by the bot. **Met: 8–10** (was 13–14 with the same bot; the original eval bot flew Endurance ~170 times). |
| 3 ✅ | Launch commit policy (5.6) | Decision stops per launch drop from ~0.7 to under 0.2. **1.34–1.52 → 0.21–0.23** (measured with animation on; the remainder is anomalies only, by design). |
| 4 | Opening fix (5.7) | Engineer insolvency in year one under ~10% when following the checklist. |
| 5 | Crash programs + era cost growth (5.2, 5.5) | Cash on hand stays under ~3 years of operating cost after 1950. |
| 6 | Rivals keyed to the frontier (5.3) | A sprinting bot faces rival firsts within ~5 years of its own. |
| 7 | Annual Review (5.4), folding mandates/hearings/funding | One political stop per year instead of scattered modals. |
| 8 | Science as research cost; astronauts and team ceilings (5.5) | A bot with no staff or stations stalls by the crewed era — modules become necessary. |

Steps 1–4 are mostly re-wiring existing code and give most of the feel improvement; 5–8 are the deeper
re-balance. After step 8 the bot should be extended to hire, build stations and fly profile missions, since
those systems will then matter.

---

## 8. Appendix — data

- Bot: `tools/autoplay-bot.js` (usage in its header). Deterministic per seed.
- Content census: 98 research nodes, 28 authored missions (15 of them profile missions), 20 engines,
  8 eras, 3 rivals, 9 crises, 10 station modules, 9 Programs, 6 Ambitions, 5 Doctrines, 5 partners,
  10 departments, 5 divisions, 26 parts, **221 distinct player actions** wired to clicks.
- Representative run (seed 2), five-year buckets — cash, reputation, turns, idle turns, main actions:
  - 1940–44: $22M, rep 191, 25 turns — research ×7, the Pioneer ladder, First Satellite.
  - 1945–49: $158M, rep 217, 16 turns — First Satellite ×11.
  - 1950–54: $337M, rep 250, 16 turns — First Satellite ×13.
  - 1955–59: $510M, rep 322, 41 turns — research ×10 once 1957 opens the tree.
  - 1960–64: $658M, rep 506, 51 turns — crewed ladder, then Endurance.
  - 1965–99: $610M → $302M, rep 516 → 528, ~33 turns per five years — Endurance ×~170.
