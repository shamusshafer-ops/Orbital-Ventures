# Orbital Ventures — Exhaustive Professional Evaluation
**Build reviewed:** `orbital-ventures__1___6_.html` — 16,166 lines, 1.25 MB, 1,117 functions
**Reviewer stance:** Senior game dev / lead engineer / UI-UX / systems design / technical art, evaluating as if for Steam release readiness.
**Date:** 2026-07-10

---

## 0. One Correction Before Anything Else

The brief says the game is "using Phaser for graphics and rendering." That is not accurate for this build, and the distinction matters for every technical recommendation below. **Phaser 3.90 is loaded from CDN and powers only the decorative scene layers** (Cape, bench, map, station visual hosts, post-FX bloom). The actual game — all UI, all panels, all interaction — is **DOM + innerHTML string rebuilding**. The Phaser-hosted FlightScene was explicitly disabled on 2026-06-25 (line ~8199) in favor of the 2D canvas fallback. So this is a DOM-first game with a Phaser garnish, not a Phaser game. Everything is also guarded so the game runs fully with Phaser absent — which is genuinely good defensive engineering, but it means "Phaser rendering optimization" is mostly the wrong lever. The right levers are DOM churn, render() granularity, and string-building GC pressure.

---

## 1. Code Quality — 6.5/10

### What's genuinely good
- **Discipline for a monolith.** For a 16k-line single file, this is among the more navigable I've reviewed. Section banners, slice-numbered comments (`#19 Slice C`, `CE3 slice (c)`), and rationale comments explaining *why* code exists (e.g., the disabled FlightScene note, the CanvasTexture context-reuse warning at ~8146) are professional habits most indie codebases lack.
- **Pure data layers deliberately separated from rendering** (`commandSummary`, `contractsRailSummary`, "Derived only — no new state" comments) — this is exactly what makes the headless Node test harness possible, and the harness itself (six suites, committed to repo) puts this project ahead of 90% of Steam sim indies on validation.
- **Save migration awareness.** Legacy-save defaults are handled at read sites (`facilitySupply` legacy default, `RETIRED_TABS` migration inside `render()`), and there's a `SAVE_VERSION` field.
- **Data-driven content.** MISSIONS/RESEARCH/BODIES/ENGINES/RIVALS as declarative tables with real historical engine names is the right architecture for a content-heavy sim.

### What's holding it back
- **The single file is past its viability ceiling.** At 1.25 MB you've already been forced off GitHub's Contents API. 16k lines in one scroll means every merge, every diff, every AI-assisted edit carries collision risk. You don't need a build system to fix this: an `index.html` + `<script src>` per module (data / sim / render / phaser / tests-seams) preserves "open the file and play" while making the code tractable. If single-file distribution matters, a 20-line concat script produces the shippable artifact.
- **Global mutable `state` + 300+ inline `onclick="..."` string handlers.** Inline handlers mean every renamed function is a runtime error discovered by clicking, not a load-time error; they also block CSP, complicate testing, and force globals. Event delegation (one listener per container, `data-action` attributes) would eliminate an entire bug class.
- **`render()` is a god function.** It rebuilds badges, outliner, topbar, rails, and the active tab's full DOM on *every* call — and it's called from 136 sites. On the bench tab a single slider tick triggers ~17 sub-renderers. It works today because the DOM is modest, but it's the primary scalability wall (see §2).
- **Double-deep-clone save:** `JSON.parse(JSON.stringify(state))` inside another `JSON.stringify` in `writeSave()` serializes the entire state twice per save. Harmless now; measurable in late-game saves with long metric histories and chronicle logs.
- **Magic numbers still leak.** Despite good constant tables (FAM_REL_CAP etc.), balance values like `lunarSwitchCost()`'s `(state.flights||0)*1.0 + 15` live inline. A single `BALANCE` object would make tuning and difficulty-scaling far cheaper.
- **Naming drift.** `fM/fI/$/clampA/round2` are fine terse helpers, but there are three generations of idiom visible (early era code vs. flow-architecture-era code vs. departments-era code). A style pass isn't urgent; a **conventions comment block** at the top declaring the current idiom would stop the drift.

### Concrete refactors (see §14 for detail)
1. Split into ~8 script files with a concat build (risk: low; payoff: huge).
2. Dirty-flag partial rendering (risk: medium; payoff: the single biggest perf + feel win).
3. Event delegation replacing inline onclick (risk: low, mechanical; payoff: robustness + CSP).
4. Single-pass save serialization with a replacer function (risk: trivial).

---

## 2. Performance — 7/10 today, 5/10 trajectory

### Current reality
For a DOM game with this content volume, it will run fine on any desktop. The real findings:

- **Full-rebuild rendering is the #1 bottleneck-in-waiting.** Every `render()` throws away and rebuilds large innerHTML trees (90 innerHTML sites). Costs: layout thrash, lost scroll positions, lost focus (a known killer for text inputs inside re-rendered panels), and GC churn from megabytes of transient strings during time-warp. Fix: dirty flags per region (`markDirty('topbar'|'bench'|'log')`) and only rebuild flagged regions; memoize pure HTML builders on their input hash.
- **Timeline/log growth.** `renderLog()` runs on every render; if the chronicle/log array is unbounded, late-game renders scale linearly with campaign length. Cap rendered entries (windowed render, "show older" button) and cap stored entries or archive to a summary.
- **Metric history arrays** (`defaultMetricHist` — 8 series) grow monthly forever. Fine for years; decimate to monthly→quarterly after N years to bound save size and chart cost.
- **`setInterval(1000)` time-auto + RAF loops:** three separate animation systems (animLoop, ccLoop, liftoff RAF) each manage their own RAF. Consolidate into one ticker that dispatches to active scenes — fewer wake-ups, easier pause-on-hidden. **Verify `document.hidden` pausing exists for all three**; a hidden tab burning RAF + Phaser is a battery complaint on Steam Deck/laptops day one.
- **Phaser layer:** since it's decorative, the wins are: `Scale.NONE` is already handled; ensure scenes `sleep()` (not just your pause functions) when tabs switch so Phaser's own update loop stops; destroy postFX pipelines on scene sleep (bloom on a hidden canvas is pure GPU waste); and reuse the single CanvasTexture (already done — good).
- **localStorage save:** synchronous, main-thread, and browsers cap ~5 MB. A long campaign with histories + chronicle + saved designs + blueprints will approach it. Move autosave to `requestIdleCallback`, and offer file export/import (you appear to have an export path at ~7263 — make it first-class UI) plus IndexedDB for slots.

### Mobile
There are responsive breakpoints (880/900/980px) but this is a dense desktop UI; on a phone it will be technically functional and practically unplayable. Recommendation: **declare desktop-only for 1.0** and spend zero further effort here until after Steam feedback. Steam Deck (1280×800, gamepad-less touch) is the one "mobile-ish" target worth testing.

---

## 3. Gameplay — 7.5/10 (unusually strong decision density; late-game is the risk)

### What already works
This is not a shallow clicker. The core loop — **design under real constraints → static-fire → fly → learn → reinvest** — has genuine texture:

- **Vehicle families with heritage** (reliability accrues per airframe lineage, build cost falls with successes) creates the single most important sim emotion: *attachment to hardware*. This is the Buzz Aldrin's RIS magic and you have it.
- **Trap-node elimination** was the right call: all 7 former no-op research nodes now carry real mechanics (cryo boil-off, gravity assist, fusion torch). No dead unlocks found in the tree scan.
- **The lunar architecture fork** (committed, mutually exclusive, expensive to switch — `lunarSwitchCost` scales with flights) is a real strategic decision with teeth. More of these, please (see below).
- **Economy tension systems** — mandates, dip-buy materials, passive contracts with era reskins, net-economics per mission — mean money decisions aren't just "can I afford it."
- **The Outliner + smart time (`timeInterrupt`/`runToNextEvent`)** solves the #1 killer of turn-based sims: dead time between decisions. This is your "one more turn" engine and it's built correctly.
- **Failure is content:** setbacks, mishaps, rival disasters, engine-out capability, static-fire — risk/reward is present at the flight level.

### Where it will lose players
1. **Late-game decision starvation.** The era arc (1942 → soft-score 1990 → continue) front-loads its best decisions. By the Mars/Jovian era the player has heritage-maxed families, standing passive income, and the loop risks becoming "wait for window → fly → win." The outer-system missions (Jovian capstone) are *destinations*, not *systems*. The station layer (6 modules, assembly/docking/economy explicitly deferred per the code comment at ~14492) is the natural fix: make stations a persistent logistics/economy game (crew rotation cadence, resupply contracts, module degradation) and the late game gets a standing plate-spinning layer.
2. **One committed fork isn't enough.** The lunar arch fork proves the pattern. Add 3–4 more mutually-exclusive program commitments: Mars architecture (conjunction vs. opposition vs. ISRU-dependent), crew vehicle philosophy (capsule vs. lifting body vs. spaceplane), propulsion doctrine (NTR vs. NEP vs. chemical-depot). Each reshapes a decade of play → replayability multiplies.
3. **Rivals are scheduled, not adaptive.** Credit where due: rivals *do* claim firsts on calendar-anchored timelines and scoop them — a scooped mission's payout is cut to 60% (M4b/M4c) — and they have voice lines, disasters, and rescue events. But the schedule doesn't react to the player: they never accelerate when you're ahead, slip when you damage them, snatch open contracts, or poach staff. It's a countdown, not an opponent. Making the race *responsive* is the highest-value gameplay upgrade in the file (RIS, Mars Horizon).
4. **Difficulty is a settings choice, not a dynamic.** DIFFICULTY table exists; what's missing is *mid-campaign* difficulty: political winds (budget hearings after failures), inflation/era cost growth, aging workforce. The mandates system is the seam — extend it into a recurring political layer.
5. **Repetition risk in mission contracts.** 28 authored missions + procedural specials is decent, but authored missions complete once. Between milestones the player flies passive-ish repeats. A light procedural contract generator keyed to era + built capability (comsat block buys, crew rotation, sample return variants) fills the troughs.

### Missing systems ranked by hours-of-fun-per-dev-hour
1. Active rivals (steal contracts/firsts, poach staff, offer joint missions)
2. Station operations loop (resupply, rotation, degradation, science-over-time)
3. Procedural contract generator
4. More committed program forks
5. Astronaut identity (names, traits, flight logs, risk of loss with narrative weight — you already track "souls carried")
6. Manufacturing (#7 hooks already present as passive tiles — the seam exists)

---

## 4. Space Agency Simulation — 7/10 authentic feel, with visible gaps

### Present and credible
Budget/overhead, government mandates + grants/subsidies with era retirement (the `gov_grant maxEra:3` pattern is exactly how the real funding environment shifted), public support with era-scaled deltas, R&D with 110 nodes across tracks, vehicle design with real structural/geometry/parts tradeoffs, crew + ECLSS with recovery bonuses, multi-leg missions, launch windows + porkchop-adjacent planning, depots, ISRU, staff with traits/departments/leads/succession, facilities with supply provisioning. The historical grounding (every mission blurb cites the real analogue; engines are V-2 → F-1 lineage) is a genuine differentiator — it reads like the developer loves the subject, and players in this genre reward that.

### Missing or thin (in priority order)
- **Launch operations as a system:** pads are a mass limit, not a resource. Pad turnaround, weather scrubs, range scheduling, VAB/integration queues → makes cadence a managed resource instead of free.
- **Tracking/comms network:** deep-space missions should require ground station investment (a classic, cheap, thematic money sink with a map presence).
- **Astronaut training pipeline:** selection classes, training time, currency/staleness, crew assignment tradeoffs. Right now crew is largely a mass/ECLSS number.
- **Manufacturing/supply chain:** hooks exist (#7 passive tiles). Even a shallow version — engine production lines with rate/learning-curve, long-lead ordering — converts money into *time* decisions, the most interesting currency in this genre.
- **Second launch site:** inclination/azimuth constraints, polar vs. equatorial economics.
- **Tourism/military/commercial verticals** exist as passive contracts; they could each carry one active decision (e.g., military contracts pay best but cost public support — if that coupling isn't already present, it's one line of design).
- **Colonization:** ISRU exists; a settlement layer is expansion-scale, not 1.0.

---

## 5. Technology Tree — 8/10

110 nodes, track-colored, filters in the right rail, synergy bonuses for combinations (`SYNERGIES` with multi-node `requires` — a genuinely good mechanic that rewards breadth), and no dead ends after the trap-node pass. Era gating follows real history without railroading. This is one of the strongest subsystems.

Improvements:
- **Choice scarcity:** if science income eventually buys everything, the tree becomes a schedule, not a strategy. Consider era-capacity limits (you can't research everything before the era turns) or exclusive branch pairs, so two campaigns diverge.
- **Visible synergy prospecting:** show "2 of 3 for Synergy X" on node cards — turns the tree into a set-collection puzzle.
- **Node "flavor moments":** first unlock of landmark nodes (F-1, crew capsule, NTR) deserves an interstitial beat like the era transitions already have.
- **A biology/human-factors track** (radiation, long-duration health) would give the Mars/Jovian era its own research identity instead of reusing propulsion-era pacing.

---

## 6. Economy — 7.5/10

The bones are unusually good: multiple income classes (mission payouts, passive contracts ×19 with era reskins, facility income, PGM royalty, depot economics), overhead + payroll expenses, net-economics surfaced per mission, materials with a single sharp dip-buy decision (the 2026-07-09 collapse from a two-commodity dashboard to one ≤0.88× spot trigger was the correct simplification — one good decision beats two boring dashboards), and mandates creating spend pressure.

Risks:
- **Passive income snowball.** 19 passive contracts + facilities + royalties can plateau into "money stops mattering" mid-game — the classic tycoon death. Countermeasures: contract maintenance/renewal events, facility supply costs scaling with era, and big lumpy sinks (program forks, second sites, station modules) timed to eat surpluses.
- **No inflation/era cost growth** was observed; a gentle per-era cost multiplier keeps early-game payouts from trivializing later purchases.
- **Bankruptcy arc:** money color turns red under 1.5 — is there a debt/loan/emergency-grant mechanic between "low" and "game over"? A one-time bailout with strings attached (mandate + support hit) is more interesting than a cliff.

---

## 7. User Interface — 7/10 (strong architecture, weak accessibility)

### Strengths
The UI consolidation work shows: persistent left rail (Basic-layer focal guide) / center viewport / contextual right rail with scene-vs-panel semantics; retired tabs folded into drills and modals (Missions→rail, Programs→Objectives, Settings→HUD menu) — this is real information-architecture work, not just screens. The Outliner strip is the best single UI element in the game. Attention badges, stat bump animations, mission pulse on rep, mood-colored support, sticky topbar height syncing — the workflow polish layer exists.

### Problems
1. **Accessibility is near zero:** 13 total hits for aria/tabindex/keydown in 16k lines. No keyboard navigation, no focus management (full innerHTML rebuilds destroy focus), no reduced-motion respect, color-only state signaling (money red, support mood colors) without shape/text redundancy for colorblind players. Steam sim audiences skew heavily keyboard. Minimum bar for 1.0: hotkeys for tabs (1–5), time controls (space = pause/step, +/- warp), Esc closes modals, and `prefers-reduced-motion` gating on pulses/bumps.
2. **Font sizes 11–12px pervade** the rail/drill HTML (visible throughout `railContractsHTML` etc.). Dense is fine; add a UI-scale setting (one CSS var) — it's cheap and this audience is older.
3. **Inline styles everywhere in template strings.** Beyond maintainability, it blocks theming consistency — you have a THEMES system, but inline `style="color:var(--ink)"` fragments will drift from it.
4. **Tooltip coverage:** spec cards are rich, but derived numbers (net economics, reliability composition ∏ phaseRel) deserve hover breakdowns showing the math. Sim players trust numbers they can audit — the phase-reliability decomposition comment at ~5333 says the data model already supports exactly this.
5. **Undo:** any destructive action (retire family, delete blueprint, commit arch) should have confirm-with-cost-preview (arch switch appears to) *and* the log should record it. Scan suggests confirms are inconsistent.

---

## 8. Visual Design — 6.5/10

The theme system, livery customization, Cape glyphs, era interstitials, bloom postFX on flight, splashdown/recovery endings phased on research — there's a coherent retro-console aesthetic emerging (`--readout`, `--ignite` variable names tell me the intent). What's missing is **consistency and density of payoff**:

- The DOM panels and the Phaser scenes read as two different games. Pick the terminal/console identity and push it into the Phaser scenes (scanlines are a cliché; a shared palette + CRT-adjacent glow on both layers is not).
- **The flight is the trailer.** Since the 2D fallback renderer is now the permanent flight path, invest there: camera shake on ignition, staging debris, mach diamonds scaling with throttle, plasma on reentry, parachute deploy snap. Each is a day of canvas work and each is a GIF that sells the game.
- Planet/map rendering: 22 bodies deserve at least distinct silhouettes/palettes on the map; icon-consistency pass across TL_CAT icons, Cape glyphs, and tab badges (currently mixed emoji/custom — emoji renders differently per OS; replace with an inline SVG sprite set, ~2 days, large perceived-quality jump).
- Scene transitions: the 0.15s viewport opacity fade is right; add it to modal open/close and drill swaps for uniformity.

---

## 9. Game Feel — 7/10

Already present: WebAudio static-fire SFX, stat bumps, mission pulse, liftoff RAF sequence, session bookend recap (excellent — very few sims do "previously on..."), era interstitials, drag-to-stretch tanks (direct manipulation on the rocket itself is a standout interaction).

Gaps:
- **Sound is one effect deep.** A minimal ambient bed (mission control room tone), UI ticks, milestone stingers, and a countdown voice ("T-minus 10") would transform launch moments. WebAudio synthesis keeps it single-file if that still matters; otherwise ship a small OGG set.
- **Launches should be scarier.** Add a hold/abort window during ascent (player can abort for partial loss vs. ride it out) — one decision point converts watching into playing.
- **Celebration ceilings:** first satellite, first crew, first landing deserve escalating fanfare (newspaper front page mock-up is the genre-classic move and is pure HTML).
- **Number feedback:** money changes should float deltas (+$1.6M) near the stat, not just recolor.

---

## 10. AI Opportunities — currently 4/10, biggest headroom in the design

Rivals have archetypes (state agency / legacy contractor / commercial newcomer), voice lines, disasters + rescue events, a chronicle timeline, and a real scoop mechanic (calendar-anchored firsts that cut your payouts to 60%) — the *presentation and pressure* layers of an AI system with no *decision* layer underneath. The timelines never react to the player. Recommendations:

1. **Rival program simulation (lightweight):** the milestone schedules already exist — add variance, a budget, and 2–3 reactive behaviors (undercut contracts, poach a named engineer after your failures, announce programs that shift public support). No pathfinding, no ML — a weighted event scheduler keyed to your progress. ~2 weeks, transforms the game.
2. **Adaptive contract generation:** bias procedural contracts toward the player's demonstrated capability and gaps (you fly heavy-lift → station resupply offers appear; you've never flown polar → a premium polar contract dangles).
3. **Dynamic world events:** the setback/mishap/event system already exists — extend it with geopolitical arcs (budget crises, détente joint-mission offers) that persist several months rather than firing once.
4. **Advisor voice:** the #26 advisor nudge exists; give it personality per department lead (leads are already promotable/named — let the flight director *say* things at launch).
5. Do **not** bolt an LLM into the loop for 1.0 — deterministic + testable beats novel here, and your harness culture agrees.

---

## 11. Comparative Analysis

| Game | What they do well | What Orbital Ventures should adapt (not copy) |
|---|---|---|
| Buzz Aldrin's Race Into Space | Race dread; every launch a coin-flip you engineered | Rival milestone race with visible "they're 3 months from orbit" intel |
| Kerbal Space Program | Hardware attachment via construction | Already partially there (drag-to-stretch, families) — deepen part-level failure attribution ("Engine #2, third flight, turbopump") |
| Mars Horizon | Approachable agency pacing, mission event mini-decisions | In-flight decision panels — **already scoped as Slice C of the flight overlay**; ship it, it's the right call |
| Terra Invicta | Faction politics depth | A light political layer on mandates (hearings after failures) |
| Children of a Dead Earth | Engineering authenticity as identity | Keep the ∏ phaseRel auditability visible to players — the math *is* the brand |
| Factorio / DSP | Production as compounding puzzle | Manufacturing lines with learning-curve rates (#7 seam exists) |
| RimWorld | Named-character storytelling | Astronaut/engineer identity: flight logs, traits already exist — surface them narratively |
| ONI | Failure cascades that teach | Post-flight failure reports that name the causal chain |
| Workers & Resources | Logistics as the game | Late-game station resupply logistics loop |
| Capitalism Lab | Market depth | Not the right direction — the dip-buy simplification was correct; resist re-complicating markets |

---

## 12. Feature Suggestions (105)

Complexity: S = <1 day, M = 1–5 days, L = 1–3 weeks, XL = 1+ month. Impact: ★–★★★. Deps noted where they exist. Priority H/M/L.

### Quality of life (1–25)
| # | Feature | Why | Cx | Impact | Deps | Pri |
|---|---|---|---|---|---|---|
|1| Keyboard shortcuts (tabs 1–5, space pause, +/- time) | Sim audience expectation | S | ★★★ | — | H |
|2| Esc closes modals / focus trap in modals | Basic UX hygiene | S | ★★ | — | H |
|3| UI scale slider (CSS var) | Readability, older audience | S | ★★ | — | H |
|4| `prefers-reduced-motion` gating | Accessibility | S | ★ | — | H |
|5| Colorblind-safe redundancy (icons beside color states) | Accessibility | M | ★★ | — | H |
|6| Save export/import as first-class UI (file download) | Trust; localStorage is fragile | S | ★★★ | — | H |
|7| Multiple save slots (IndexedDB) | Standard expectation | M | ★★★ | 6 | H |
|8| Autosave ring (keep last 3) | Corruption insurance | S | ★★ | 7 | H |
|9| Floating money/rep deltas on change | Feedback | S | ★★ | — | M |
|10| Hover math breakdowns (reliability ∏, net econ) | Auditability = trust | M | ★★★ | — | H |
|11| Confirm-with-preview on all destructive actions | Prevent rage-quits | S | ★★ | — | H |
|12| Undo last build-change on bench | Design iteration comfort | M | ★★ | — | M |
|13| Searchable tech tree | 110 nodes needs it | S | ★★ | — | M |
|14| Pin a research node as "goal" → path highlight | Planning aid | M | ★★ | — | M |
|15| Notification center (missed events while warping) | Smart-time complement | M | ★★ | — | M |
|16| Log filters already exist → add text search | Late-game archaeology | S | ★ | — | L |
|17| Compare two vehicle families side-by-side | Decision support | M | ★★ | — | M |
|18| "Why can't I fly this?" explainer on disabled launch | Removes guesswork | S | ★★★ | — | H |
|19| Time-to-affordability estimates on purchases | Planning | S | ★★ | — | M |
|20| Clock/date always visible during flight overlay | Orientation | S | ★ | Overlay | M |
|21| Settings: autosave frequency control | Player agency | S | ★ | — | L |
|22| Copy build sharecode (base64 blueprint) | Community seeding | M | ★★ | — | M |
|23| In-game changelog viewer | Live-game hygiene | S | ★ | — | L |
|24| Tutorial replay from settings | Onboarding recovery | S | ★★ | Tutorial | M |
|25| FPS/perf toggle overlay (debug) | Support triage | S | ★ | — | L |

### Flight & operations (26–45)
|26| Ship flight overlay Slices B–D (already scoped) | Finishes core arc | L | ★★★ | — | H |
|27| Ascent abort decision window | Watching→playing | M | ★★★ | 26 | H |
|28| Launch weather + scrub/hold system | Cadence texture | M | ★★ | — | M |
|29| Pad turnaround time per pad | Ops as resource | M | ★★★ | — | H |
|30| Second launch site (inclination economics) | Strategic geography | L | ★★ | 29 | M |
|31| Range scheduling conflicts with rivals | Rival friction | M | ★★ | Rival AI | M |
|32| Post-flight failure report naming causal chain | Failure as content | M | ★★★ | — | H |
|33| Part-level fatigue on reused hardware | Reuse tradeoff | L | ★★ | — | M |
|34| Recovery fleet (ships/zones) for splashdowns | Thematic sink | M | ★ | — | L |
|35| Countdown voice + hold at T-31s events | Drama | M | ★★ | — | M |
|36| Telemetry strip during ascent (alt/vel/Q) | Sim credibility | S | ★★ | 26 | H |
|37| Max-Q structural check vs. fairing choice | Part relevance | M | ★★ | — | M |
|38| Night launches (era/window dependent) w/ visuals | Spectacle | S | ★ | — | L |
|39| Pad aborts that damage pad (repair time) | Risk depth | S | ★★ | 29 | M |
|40| Crew survival mini-arc on failures (escape tower) | Emotional stakes | M | ★★★ | — | H |
|41| Debris/range-safety consequences on populated tracks | Site choice matters | M | ★ | 30 | L |
|42| Mission patches (procedural SVG) per flight | Attachment/collection | M | ★★ | — | M |
|43| Photo mode / GIF export of flights | Marketing engine | L | ★★ | — | M |
|44| Simultaneous missions in flight (overlapping ops) | Late-game ops density | L | ★★★ | Outliner | H |
|45| Ground track visualization on map | Sim texture | M | ★ | — | L |

### Rivals, politics, world (46–60)
|46| Rival milestone race schedules ± variance | Core dread | L | ★★★ | — | H |
|47| Rivals claim "firsts" → your payout/rep decays | Urgency | M | ★★★ | 46 | H |
|48| Engineer/astronaut poaching after your failures | Personnel stakes | M | ★★ | 46 | M |
|49| Intel reports on rival progress (spend money to see) | Info economy | M | ★★ | 46 | M |
|50| Joint-mission offers (share cost, share credit) | Diplomacy lite | L | ★★ | 46 | M |
|51| Budget hearings after fatal failures | Political stakes | M | ★★★ | — | H |
|52| Multi-month geopolitical event arcs | World alive | M | ★★ | — | M |
|53| Public support decomposed (visible drivers) | Auditability | S | ★ | — | L |
|54| Media system: press conferences after events | Support management | M | ★★ | — | M |
|55| Congressional mandate negotiation (pick 1 of 3) | Agency over mandates | M | ★★ | — | M |
|56| Rival bankruptcy/merger events | Dynamic field | S | ★ | 46 | L |
|57| Espionage/leak events (2-way) | Flavor + risk | M | ★ | 46 | L |
|58| International sanctions era-events affecting materials | Ties markets to world | S | ★ | — | L |
|59| Anniversary/commemoration support beats | Warmth | S | ★ | — | L |
|60| End-of-era "state of the race" interstitial | Narrative rhythm | S | ★★ | 46 | M |

### Personnel & crew (61–72)
|61| Astronaut roster: names, portraits (procedural), traits | Identity | M | ★★★ | — | H |
|62| Training pipeline (class selection → currency) | Crew as system | L | ★★ | 61 | M |
|63| Flight logs per astronaut (missions flown) | Attachment | S | ★★ | 61 | H |
|64| Crew assignment tradeoffs (veteran vs. rookie rel/morale) | Decisions | M | ★★ | 61 | M |
|65| Memorial wall on losses | Emotional weight | S | ★★★ | 61 | H |
|66| Chief designer character (Korolev-alike) with buffs/mortality | Era storytelling | M | ★★ | — | M |
|67| Department lead personalities → advisor lines | Leads already exist | S | ★★ | — | M |
|68| Staff aging/retirement across 50-year campaign | Time weight | M | ★★ | — | M |
|69| Hiring market quality tied to rep/support | Feedback loop | S | ★ | — | L |
|70| Strikes/morale events tied to overwork (launch cadence) | Ops coupling | M | ★ | — | L |
|71| Astronaut PR tours (send hero on tour = support, unavailable) | Tradeoff | S | ★★ | 61 | M |
|72| Named test pilots for static-fire/atmospheric era | Pre-1957 texture | S | ★ | 61 | L |

### Stations, logistics, late game (73–85)
|73| Station assembly loop (launch modules, dock) | Deferred seam exists | XL | ★★★ | — | H |
|74| Station resupply contracts (recurring ops) | Late-game loop | L | ★★★ | 73 | H |
|75| Crew rotation cadence requirements | Standing obligation | M | ★★ | 73,61 | M |
|76| Module degradation/maintenance | Sink + tension | M | ★★ | 73 | M |
|77| Science-over-time from staffed station | Passive→active R&D | M | ★★ | 73 | M |
|78| Depot network view (already have depots) | Logistics legibility | M | ★ | — | L |
|79| Cargo manifest choices on resupply (pick 3 of 5) | Small decisions | S | ★★ | 74 | M |
|80| Surface base tier after ISRU (Moon/Mars) | Colonization-lite | XL | ★★ | — | L |
|81| Sample return market (sell/keep for science) | Economy branch | M | ★ | — | L |
|82| Space telescope program (standing science + events) | Passive with events | M | ★★ | — | M |
|83| Satellite constellation management (aging, replacement) | Passive contracts deepen | L | ★★ | — | M |
|84| Orbital debris accumulation from failures | Long-arc consequence | M | ★ | — | L |
|85| Tourism vertical: flights with famous-passenger events | Commercial era color | M | ★★ | — | M |

### Content, systems, meta (86–105)
|86| Procedural contract generator (era+capability keyed) | Fills troughs | L | ★★★ | — | H |
|87| 3–4 more committed program forks (Mars, crew vehicle, propulsion) | Replayability core | L | ★★★ | — | H |
|88| Manufacturing lines w/ learning-curve rates (#7 seam) | Money→time decisions | XL | ★★★ | — | M |
|89| Tracking-station network requirement for deep space | Classic sink | M | ★★ | — | M |
|90| Biology/human-factors research track | Late-era R&D identity | M | ★★ | — | M |
|91| Synergy prospecting UI ("2 of 3") | Set collection | S | ★★ | — | M |
|92| Era research capacity limits (can't buy everything) | Strategic scarcity | M | ★★★ | — | H |
|93| Alt-history start scenarios (1957 USSR-alike, 1970 stagnation) | Replayability | L | ★★ | — | M |
|94| Ironman mode | Genre expectation | S | ★★ | 7 | M |
|95| Challenge scenarios with fixed seeds + par scores | Community competition | M | ★★ | — | M |
|96| End-of-campaign chronicle export (shareable HTML) | Bragging artifact | M | ★★ | — | M |
|97| Newspaper front pages on milestones | Genre-classic joy | M | ★★★ | — | H |
|98| Achievements (Steam) | Discoverability | M | ★★ | Steam | H |
|99| Cloud save (Steam) | Expectation | M | ★★ | Steam | H |
|100| Difficulty presets that alter systems (not just numbers) | Depth | M | ★★ | — | M |
|101| In-game encyclopedia (engines/history — content exists in blurbs) | Surfacing your best asset | M | ★★ | — | M |
|102| Localization scaffold (string table extraction) | Market size; painful later | XL | ★★ | File split | M |
|103| Mod-lite: external JSON content packs (missions/contracts) | Longevity | L | ★★ | File split | L |
|104| Statistics screen (charts exist — add records/superlatives) | Reflection | S | ★ | — | L |
|105| Soundtrack: 4–6 era-shifting ambient tracks | Identity | M | ★★★ | — | H |

---

## 13. Development Roadmap

### Phase 0 — Critical fixes (before anything else, ~2–3 weeks)
1. **File split + concat build** (unblocks everything; do it first while the code is fresh).
2. **Save robustness:** slots, export/import UI, autosave ring, single-pass serialization, size telemetry in the save header.
3. **Focus/scroll preservation across renders** (or dirty-flag rendering directly — see Phase 1).
4. **Keyboard baseline + Esc/modal hygiene + reduced-motion.**
5. **Verify hidden-tab pause across all RAF loops + Phaser scene sleep.**
6. Audit unbounded arrays (log, metric hist, chronicle) → caps/decimation.

### Phase 1 — High-value (the "is this a real game" tier, ~2 months)
1. **Rival race AI** (#46–47, 51) — milestone schedules, first-claiming, budget hearings.
2. **Flight overlay Slices B–D** (already scoped) + ascent abort window (#27) + telemetry strip (#36).
3. **Procedural contract generator** (#86).
4. **Astronaut identity + memorial** (#61, 63, 65).
5. **Ops friction:** pad turnaround (#29) + launch explainer (#18) + failure reports (#32).
6. **Newspaper milestones (#97) + hover math breakdowns (#10).**

### Phase 2 — Medium priority (~2 months)
1. Station assembly + resupply loop (#73–74) — the late-game answer.
2. Program forks ×3 (#87) + era research capacity (#92).
3. Sound pass (#105, 35) + SVG icon unification.
4. Political/media layer (#51–55).
5. Steam integration (achievements, cloud) if going to Steam.

### Phase 3 — Nice-to-have
Manufacturing (#88), second site (#30), training pipeline (#62), scenarios (#93, 95), chronicle export (#96), encyclopedia (#101), simultaneous missions (#44).

### Phase 4 — Future expansions
Surface bases/colonization (#80), constellation management (#83), mod support (#103), localization (#102), mobile/tablet layout.

---

## 14. Technical Refactoring — top 6, with approach and risk

**R1. Modular file split.** *Why:* 1.25 MB single file already forced the Git Data API workaround; diffs, reviews, and tool-assisted edits all degrade with size. *Approach:* `data.js` (MISSIONS/RESEARCH/BODIES/ENGINES/…), `sim.js` (pure state transforms — the test-harness surface), `render.js`, `flight.js`, `phaser.js`, `save.js`, `main.js`; dev `index.html` loads them in order; `node build.js` concatenates into the single-file release artifact. *Gain:* not runtime perf — developer velocity, which is the binding constraint. *Risk:* low; load-order bugs surface immediately; harness validates behavior parity.

**R2. Dirty-flag rendering.** *Why:* `render()` rebuilds everything from 136 call sites; focus loss, scroll loss, GC churn, and it's the wall for feature #44 (simultaneous missions) and any future list growth. *Approach:* `invalidate('topbar'|'bench'|'rail'|'log'|…)`; `render()` becomes a dispatcher that rebuilds only dirty regions; hot regions (topbar stats) switch to targeted textContent updates (already half-done via `_statBump`). *Gain:* 5–20× less DOM work per frame during time-warp; input focus survives. *Risk:* medium — stale-region bugs; mitigate by keeping a `renderAll()` escape hatch and diffing harness snapshots.

**R3. Event delegation.** *Why:* ~300 inline `onclick` strings — runtime-only failure mode, blocks CSP, pollutes global scope. *Approach:* `data-act="signPassive" data-id="…"` + one delegated listener mapping act→handler table. *Gain:* robustness + enables strict CSP for web distribution. *Risk:* low, mechanical; convert per-panel and validate.

**R4. Save pipeline.** *Why:* double serialization; synchronous localStorage on main thread; 5 MB ceiling. *Approach:* single `JSON.stringify(envelope)` (drop the inner parse/stringify clone — stringify already snapshots), autosave in `requestIdleCallback`, IndexedDB slots with localStorage kept as slot-0 compatibility. *Gain:* ~50% save cost immediately; removes ceiling. *Risk:* trivial for the clone fix; low for IDB (keep migration path).

**R5. Unified ticker.** *Why:* setInterval time-auto + ≥3 independent RAF loops. *Approach:* one RAF ticker with subscriber registry and visibility pause; time-auto rides it with an accumulator. *Gain:* fewer wake-ups, one place to pause, drift-free time steps. *Risk:* low.

**R6. HTML builder hygiene.** *Why:* template strings interpolate user-influenced strings (company name, family names) into innerHTML — self-XSS today, real XSS the moment sharecodes (#22) or content packs (#103) exist. *Approach:* `esc()` all dynamic text at interpolation sites; lint-grep for `${` inside innerHTML builders that bypass it. *Gain:* safety headroom for community features. *Risk:* low.

---

## 15. Overall Evaluation

| Axis | Score | One-line justification |
|---|---|---|
| **Gameplay** | 7.5 | Real decision density and hardware attachment; late-game and rival pressure are the gaps |
| **Technical** | 6.5 | Disciplined and tested, but monolith + full-rebuild rendering are at their ceiling |
| **UI/UX** | 7 | Strong information architecture; accessibility near zero |
| **Performance** | 7 | Fine today; trajectory issues are known and fixable |
| **Visual presentation** | 6.5 | Coherent identity emerging; flight spectacle and icon consistency underinvested |
| **Long-term replayability** | 6 | One fork and light rivals ≠ divergent campaigns yet; the seams for it all exist |
| **Commercial potential** | 7 | Real niche (RIS/Mars Horizon gap is underserved); needs the race + audiovisual layer |
| **Overall** | **7 / 10** | A genuinely good simulation core that is not yet a *product* |

### The Steam verdict

**Full commercial launch: No.** Not close — and shipping 1.0 now would burn the one review window this niche gives you.

**Early Access: Not yet, but visibly within reach — roughly Phase 0 + Phase 1 away (~3 months of focused work).**

What a Steam evaluator sees today: a deep, historically literate, mechanically honest sim core with unusual engineering hygiene (headless tests, balance-neutral refactors, no dead unlocks) — and three disqualifying gaps for a *paid* product:

1. **No antagonist.** The genre's promise is a race. Right now the player races a calendar. Rival AI (#46–47) is the single highest-leverage item in this document.
2. **Audiovisual floor below paid-product threshold.** One sound effect, emoji icons, and the trailer moment (launch) rendered at fallback fidelity. Players forgive DOM UIs; they do not forgive silent launches.
3. **Trust infrastructure:** one localStorage slot, no keyboard support, focus-eating re-renders. EA audiences tolerate missing features, not lost saves.

What should give you confidence: the hard part is done. Most projects in this genre have polish and no simulation; this has simulation and needs polish. The flow architecture (Outliner, smart time, bookends) shows the developer already thinks in terms of player experience, not just systems. The deferred seams (stations, manufacturing, flight overlay slices) are correctly scoped rather than hacked in — that's what a sustainable EA roadmap is made of.

**Recommended EA gate checklist:** rival race live · flight overlay B–D shipped · procedural contracts · save slots + export · keyboard + reduced-motion · newspaper milestones · sound pass (ambient + launch audio) · SVG icons · a store-page trailer cut entirely from in-game flight footage. Price at $14.99–19.99 in EA; this audience pays for depth and punishes shallow polish, which is the right market for what this is.

---
*Methodology note: static evaluation of the uploaded build (structure mapping, subsystem sampling, pattern counts) combined with full knowledge of the project's development history. No runtime profiling was performed; performance findings are architectural and should be confirmed with DevTools profiles on a late-game save.*
