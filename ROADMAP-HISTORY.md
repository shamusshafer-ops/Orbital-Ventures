# Orbital Ventures — Session History

Append-only record of completed session work, split out of `ROADMAP.md` on
2026-07-28. Entries are verbatim and in their original order; the oldest entry
is first and new sessions are appended at the end.

Forward-looking work — workflow, milestone status, open threads, scoped epics,
and `Planned` blocks — stays in `ROADMAP.md`. Read that first; come here only
when you need the detail behind a specific completed slice.

---

## #7 · Sub-assemblies — Engine Yard + Structures/Habitats + Bench-test ✅ DONE (2026-06-27)

The missing middle manufacturing layer between raw-commodity inventory and the whole-vehicle hangar. Chosen
mechanic: **cadence/timing tool** — fitted sub-assemblies shave assembly days and are already paid for (cost-neutral:
charged at stock-time, credited at build-time). Foundry level = parallel build for all yards.

- **Slice 1 — Engine Yard:** `state.engineStock{engId:count}`. `engineBuildDays` 20d L1→8d L5.
  `ENGINE_STOCK_CAP` 24/type. `ENGINE_ASSEMBLY_SAVE_DAYS` 6d shaved per fitted engine. ⚙ Engine Yard panel.
  SAVE_VERSION→35. **Validated /tmp/ov-engyard.js 23/23:** cost/time + parallelism, exact cost-neutrality, launch
  saves days + consumes stock. TG 66/66 + CE5 green.
- **Slice 2 — Structures & Habitats yard:** Pre-fabricate **stage tank sets** (keyed by tank material) and
  **crew-module habitats** (keyed by ECLSS tier). `state.partStock{"kind:sub":count}`. `PART_ASSEMBLY_SAVE_DAYS`
  5d each. `TANK_UNIT_BASE` 0.15, `HAB_UNIT_BASE` 0.3+0.4×sysBase. `PART_STOCK_CAP` 12/type. SAVE_VERSION→36.
  **Validated /tmp/ov-partyard.js 31/31:** cost-neutrality, foundry parallelism, all types.
- **Slice 3 — Bench-tested components:** Proof/static-fire testing of stocked components: +60% cost
  (`BENCH_TEST_COST_MULT`), +50% time (`BENCH_TEST_DAYS_MULT`), adds +1.5% flight reliability per tested
  component (`BENCH_REL_PER`, capped +6% `BENCH_REL_CAP`). `state.engineStockTested`/`state.partStockTested`.
  Proven units fitted+consumed first. `benchRelBonus(m)` wired into `computeVehicle`. SAVE_VERSION→37.
  **Validated /tmp/ov-bench.js 23/23 + full regression green.**

**Production UI:** Production drill auto-opens as first layer on boot (`showInfrastructureModal`), Esc/Enter
minimizes. Modal `.scrim` z-index 20→80. Icons: engineIcon(id) by propulsion type, partCompIcon(key) for
tank materials + ECLSS tiers.

**#7 Manufacturing Capacity (8 slices, 2026-06-20→2026-06-22) summary:**
1. Assembly Bays/Engine Foundry/Launch Pads/QA production lines (L1–L5, capital + upkeep, `SAVE_VERSION`→4). Validated (38).
2. QA flat reliability bonus (`qaRelBonus`, `QA_REL_PER`/`QA_REL_CAP` ≤+4.8%).
3. QA→#16 subsystem bridge: `qaFragMult()` scales manufacturing subsystem weights (QA_MFG_SUBSYS); overall R untouched. Validated (20).
4. Reusable-hardware refurbishment: `reflights` counter; `refurbCostMult` 0.45→0.85, `refurbRelPenalty` 0→4% over 5 reflights. `SAVE_VERSION`→13. Validated (31).
5. Build-cadence pressure: `cadenceLoad()` ring buffer; `cadenceSurcharge()` up to 30% buildCost over capacity. `SAVE_VERSION`→14. Validated (25).
6. Raw-material supply chains: alloy/electronics spot markets (mean-reverting, [0.7,1.4]); 12-month contract lock at +5% premium. `state.materials`. `SAVE_VERSION`→15. Validated (28).
7. Inventory & forecasting: per-commodity stockpile (`stock`/`avgCost`); `consumeMaterialsForBuild()`. `materialMonthsCoverage()`. Cap 24 builds-worth. `SAVE_VERSION`→16. Validated (36).
8. Production queue & manifest: `state.buildQueue[]`/`state.hangar[]`; `buildSlots()`=bays level (parallel); `launchFromHangar` (skip build cost/time; `prebuilt` flag). Bench waterfall breakdown + sparklines + gauges. `SAVE_VERSION`→19. Validated (38).

## Vehicle Architecture — Side Boosters & Solid Rockets ✅ DONE (2026-06-21)

Adds strap-on side boosters and solid rocket motors. Balance-preserved (sidegrade); solids serve standalone stages too.

**Modeling:** serial-equivalent boost phase — boosters lift the full wet stack, jettison at burnout; boost Δv = Isp·g₀·ln(m0/mf); liftoff TWR = combined core+booster thrust. Solids: `solid:true` flag, Isp ~250–290s, no throttle/restart.

1. ✅ **Solid motor engine class** *(2026-06-21)* — 3 solid engines (Castor, Scout-class, Segmented SRB). `effect.engines` array unlock vocabulary. In-space exclusion (`!solid` for transfer/lander). Validated.
2. ✅ **Side-booster construct (liquid first)** *(2026-06-21)* — `state.boosters={eng,count,prop}`; `boosterMasses()` in `stackPerformance`; combined-thrust TWR; `vehicleUnits` counts strap-ons. Gated by `strapon_integration` research node. Bench Strap-on Boosters card. SAVE_VERSION→12. Validated (33: balance-preservation proof, boost-Δv formula, jettison bookkeeping).
3. ✅ **Research gating + reliability** *(2026-06-21)* — `solid_propellant`→`segmented_srb`→`strapon_integration` chain. `boosterRelPenalty()` (solid penalises less than liquid; cap 12%). New `boosters` subsystem in #16 model. Validated (35: penalty neutrality at 0, solid-vs-liquid, product-still-equals-R).
4. ✅ **Visuals — strap-ons on silhouette, pad & in flight** *(2026-06-21)* — `drawOneBooster`/`drawStrapOns` painters; separation at p≈0.14 with peel+tumble+sparks. Boosters on all 4 specs (preview, flight, Cape, hangar). Validated (41).

*Optional future polish:* recoverable solids (Shuttle SRB-style); solid-specific plume tint.

## Engine — hybrid Phaser conversion ✅ DONE (slices 0–3, 2026-06-20)

**Shape:** Phaser 3 via CDN for scenes only; DOM management UI stays framework-free. All Phaser use feature-guarded
(`phaserOK()`). The `vm` harness loads/tests logic with no Phaser global.

- [x] **Slice 0 — Phaser bootstrap + CapeScene** *(2026-06-20)* — `defineCapeScene`/`startCapeGame`; particle
  smoke emitter; breathing camera tween. `drawCape` rendered onto Phaser CanvasTexture. 2D fallback kept. Validated
  (suites green + browser confirmed).
- [x] **Slice 1 — FlightScene** *(2026-06-20)* — `FlightScene` hosts mission playback; native GPU exhaust
  (particle emitters: plume, smoke, staging sparks, explosion debris). Camera shake. Space hotkey. **Booster recovery
  landing** *(2026-06-23)*: M5 reuse visual payoff — recovered stage flies back (grid fins, landing burn, legs, fade
  at touchdown). **NOTE:** Phaser FlightScene disabled 2026-06-25 (CanvasTexture blanked post-ascent phases in user's
  WebGL setup — GPU-texture issue); reverted to proven `createGL2D` renderer. Phaser still powers Cape/bench/map.
- [x] **Slice 2 — VehiclePreviewScene** *(2026-06-20)* — Design Bench rocket preview as Phaser scene; 2× internal
  res; twinkling starfield + engine-base glow + idle bob. Rocket detail pass: cable raceways, panel seams, interstage
  bands, rivets, roundel, specular highlight, bell ribs, capsule windows/RCS.
- [x] **Slice 3 — MapScene** *(2026-06-20)* — Phaser Solar System: drag-to-pan + wheel-zoom, parallax starfield,
  rival-reach + facility markers, click→`selectBody`. Detailed planet textures (procedural 448px per body). Jupiter
  rings with front/back occlusion. **Transfer-trajectory arcs** *(2026-06-23)*: committed window draws dashed amber
  quadratic arc Earth→destination, shared between SVG overview + Phaser MapScene. Validated (16 + suites green).

### Scene realism overhaul (post-conversion, 2026-06-23 — reverted)

> **⚠ Reverted to proven 2D flight renderer (2026-06-25).** Slices 1–3 of the realism overhaul (orbital Earth
> native FX, ascent sky/atmosphere, plume/FX polish) were built on the Phaser-hosted FlightScene but the
> CanvasTexture blanked post-ascent phases. Code kept dormant behind the `startFlightScene` comment. Phaser
> still powers Cape/bench/map; flight uses the solid 2D sky/clouds/plume renderer.

## UI Consolidation — The Mission Control Shell ✅ DONE (8 slices, 2026-06-24)

Source: game-dev layout review (2026-06-24). Promoted the Command Center shell to the whole app: one persistent
frame with a left rail (4 scene selectors + always-on Advisor/Objectives), center viewport (swaps scenes), right
contextual rail, and ⚙ menu. **11 tabs → 4 center scenes + rail panels.** Target click-depth ≤2 for every primary
function.

**Target architecture:** HUD (top, persistent: date·capital·rep·science·▸Advance·⚙ menu) · Left rail (⌂ Space Center · ✎ Design Bench · ⚛ R&D · ☉ Solar System + Advisor + Objectives) · Center viewport (4 scenes) · Right rail (contextual per scene) · Bottom (opsTimeline strip).

- [x] **Slice 1** *(2026-06-24)* — `.shell` CSS grid; `aside.rail-left` + `main.viewport`; all 11 `*View` divs moved
  inside; header/opsbar/log persist outside. Same button ids + `setTab` onclicks; nothing removed. Validated (53 + browser sweep).
- [x] **Slice 2** *(2026-06-24)* — `SCENES` registry (command/bench/rnd/map); `isSceneTab()`/`viewKind()`. Rail regrouped: Mission Control block (4 scenes) above Operations block (7 panels). `render()` tags `#appShell` with viewing-scene/viewing-panel. Phaser pause-not-destroy lifecycle already existed. Validated (29).
- [x] **Slice 3** *(2026-06-24)* — 4 per-view sidebars relocated into `#railRight` as `.rail-panel` wrappers (ids unchanged so render fns untouched). `render()` shows only active scene's panel + toggles `#appShell.has-right`. uiLayer gating preserved. Validated (41).
- [x] **Slice 4** *(2026-06-24)* — `#ccLeft` (advisor + objectives) promoted to always-on left rail. **Planner tab removed** — flight plan folded into rail advisor (reuses `plannerSteps()`). `RETIRED_TABS={planner:'command'}`. Left rail 184→220px. Validated (53).
- [x] **Slice 5** *(2026-06-24)* — **Missions tab removed.** Contracts + passive income moved to `#railContracts` right-rail panel. Hub drill: `hubPanel` ('alerts'|'contracts'); `openHubPanel('contracts')` from Cape Mission Control building. `RETIRED_TABS.missions='command'`. Validated (68).
- [x] **Slice 6** *(2026-06-24)* — **Programs/Rivals/Personnel tabs removed.** Each to a live modal: Programs→left-rail Objectives "Programs→" link, Rivals→right-rail mini-leaderboard + `showRivalsModal()`, Personnel→Cape building + `showPersonnelModal()`. `tabIntent(t)` router + `RETIRED_TABS` migrations. `activeModal` thunk; `closeLiveModal()` on nav. Validated (85).
- [x] **Slice 7** *(2026-06-24)* — **Infrastructure tab removed.** 3 Cape buildings (Manufacturing/Production/Orbital Ops) → `showInfrastructureModal()` live wide modal. Live: founding/expanding/trading refresh in place; nav closes it. Validated (95).
- [x] **Slice 8** *(2026-06-24)* — HUD **⚙ Menu** modal (animation/wide/fullscreen toggles, Save/Load/New, Settings panel). Opsbar drops to 1 ⚙ button + View toggle + Advance + Skip. **Settings tab removed.** Left rail now purely 4 scene selectors. Validated (104 + full browser sweep).

**Epic status:** all 8 slices shipped. 11-tab bar → 4-scene Mission Control shell. Headless suite 104/104.

## Bench Customization (mini-epic) ✅ DONE (BC1–BC5, 2026-06-25)

- [x] **BC1 · Cosmetic livery** — `state.livery` ({body,accent,nose,name}). `drawVehicle` reads `curLivery()`: hull gradient from chosen color, accent stripe per stage, three nose styles (ogive/cone/blunt; crewed=capsule). 🎨 Livery card in bench editor. SAVE_VERSION→23. Validated (20).
- [x] **BC2 · Performance parts** — `state.parts` ({tank,avionics,fairing}). Tank material → `curSigma()` scales σ (+Δv/cost/rel tradeoffs); avionics tier → `partsRelBonus` (+3/+6%); payload fairing → mass/cost/rel (excluded on crewed). Default = zero-impact baseline (existing balance untouched). 🔧 Performance Parts card. SAVE_VERSION→24. Validated (32).
- [x] **BC3 · Per-stage geometry** — `st.dia` (0.7–1.4, default 1.0 = today's exact shape). Wider = more structural mass + +rel; narrower = lighter + −rel. `tankStruct(prop,dia)` scaled. Shape reflects in preview + flight. No SAVE_VERSION bump (nested optional). Validated (22).
- [x] **BC4 · More part variety** — 3 sidegrade engines: LR79 (more thrust, lower Isp, cheaper; on `kerosene`), RL10-class (high-Isp cryo upper; on `cryo_upper`), Methalox Vacuum (vac-optimized; on `methane_propulsion`). Switched nodes to `effect.engines[]`. No SAVE_VERSION bump. Validated (23).
- [x] **BC5 · Saved designs (blueprints)** — `fullBenchSnapshot()` captures stages/boosters/transfer/descent/ascent/ECLSS/power/recovery/livery/parts. `state.blueprints[]`. 💾 Saved Designs card (name + Save; Load/Delete per row). SAVE_VERSION→25. Validated (25 incl. topbar checks).

## Design-Critique Epics — Depth & Stakes ✅ ALL DONE CE1–CE5 (2026-06-26/27)

Source: brutal-honesty design pass (2026-06-26). Diagnosis: codebase optimised to *protect the simulation*
(bounded caps, rivals-on-rails, snowballing income, single-roll launches) rather than to *pressure the player*.
These five epics deliberately add scarcity, irreversibility, a real opponent, a rising stakes curve, and live
decisions. **These intentionally break "balance exactly preserved" where it conflicts with player payoff.**

### CE1 · Rival Agent Model ✅ DONE (a/b/c, 2026-06-26)

**Problem:** `RIVALS` hardcoded calendar-firing with no state, no budget, no reaction. Can't out-compete an opponent that isn't simulated.

**The fix:** Goals-not-dates. `tickRivals()` accrues `income·momentum` and fires a goal when capital clears cost. Momentum ∝ (rivalIdx − playerFirsts); rubber-band floor so dominated rival never fully stalls.

- ✅ **Slice (a)** — `RIVAL_PROFILES` + `state.rivalState[id]={capital,momentum,idx,prevYear}` SAVE_VERSION→26. `tickRivals()` accrues + buys goals. `seedRivalState()` migrates legacy saves. Validated (16: nominal pacing, lead pull-in, dominated slip, rubber-band, migration, 300-month no-throw).
- ✅ **Slice (b)** — 3 player levers: (1) contract crowding `rivalCrowdFactor()` starves rival accrual; (2) firsts-denial `denyRivalGoal()` on mission success cuts rival capital + momentum; (3) poaching war: `counterPoach(rivalId)` costs $2.5M, knocks rival momentum −0.25, lifts staff morale. Validated (26).
- ✅ **Slice (c)** — `rivalProjectedYear(r)` live projection. Standings panel: momentum arrow, projected year (shifts as player acts), Counter-poach button. `ccTimeline()` emits dashed projected markers. Validated (16: projection reactivity, historical-floor cap, timeline markers).

### CE2 · Power Curve ✅ DONE (a/b/c, 2026-06-26)

**Problem:** Every research effect folds into a hard cap — a 100-node tree where the marginal node is +2% into a ceiling kills the tech-tree power fantasy.

**The fix:** Keep *flyability* caps (Isp +10%, thrust +15%, reliability) — these guard the rocket equation. Release *economy* caps to a diminishing-but-unbounded curve. Add throughput scaling and a juggernaut capstone.

- ✅ **Slice (a)** — `dimCurve(sum,cap,asymptote)`: identity at/below the old cap (exact balance preservation below), C1-smooth past it, asymptotes toward but never reaches `asymptote`. Wired: `mfgBuildMult`/`groundLaunchMult` (cap 0.30 → asymptote 0.80), `buildTimeCut` (cap 3 → asymptote 6mo). Physics caps left on hard `Math.min`. Validated (25: identity ≤ cap, C1 slope, asymptote-bounded, cost always >0, floor ≥1, sciYield still capped).
- ✅ **Slice (b)** — Launch cadence: `launchPadCap()` == Pads level = launches/month. `canParallelLaunch()` for rapid prebuilt flights. `padMonthAbs`/`padMonthUsed`. SAVE_VERSION→27. L1 = today's exact behavior. Validated (25: cap==level, rollover, full gate, L1 serialized, end-to-end tempo table).
- ✅ **Slice (c)** — Juggernaut capstone: `isJuggernaut()` = all 4 prod lines at max + `automated_factory`. `setStandingProduction()` snapshots bench; `tickStandingProduction()` rolls 1 copy/month into hangar (bounded by `standingStockCap()`=2×pads + $3M floor; pays full cost). JUGGERNAUT badge + gold panel. SAVE_VERSION→28. Validated (30).

### CE3 · Strategic Identity ✅ DONE (a/b/c, 2026-06-26)

**Problem:** Nothing in the tree is mutually exclusive — "specialization" is just sequencing; "what kind of company am I?" is cosmetic.

**The fix:** One-time semi-irreversible Doctrine choice + branch opportunity cost + hard lunar architecture fork.

- ✅ **Slice (a)** — `state.doctrine` (null = undeclared = today's neutral). 5 doctrines, each bonus+penalty: Reusability/Heavy-Lift/Commercial/Statecraft/Science. `doctrineMult(key)`/`doctrineRelMod()`/`rdCostOf(r)` thread through all economy hooks. First declaration free; switch = `doctrineSwitchCost()` (≥$8M) + 20 rep + 6mo. SAVE_VERSION→29. Validated (39).
- ✅ **Slice (b)** — `branchAffinityMult(track)` = `clamp(1−min(0.35, 0.035·aff)+min(0.30, 0.030·gap), 0.55, 1.30)`. Folded into single `rdCostOf(r)` hook. Purely derived from state — no SAVE bump. Specialist $2.64M vs generalist $3.61M at the same node. Validated (24).
- ✅ **Slice (c)** — Committed lunar architecture fork: LOR→`lunar_lander`, Direct→`heavy_lift_infrastructure`, EOR→`orbital_assembly`. `missionTechMet(m)` single gate helper. `commitLunarArch()`: first free, switch ≥$20M + 8mo. SAVE_VERSION→30. Validated (38: each path independently unlocks the mission, mutual exclusivity, backward-compat).

### CE4 · The Stakes Curve ✅ DONE (a/b/c, 2026-06-26/27)

**Problem:** Tension trivial late-game once royalties + passive + facilities + gov stack against flat overhead.

**The fix:** Make ambition expensive to *hold*, not just to buy.

- ✅ **Slice (a)** — `empireOpex()`: monthly carrying cost from what you've built. `EMPIRE_FAC_OPEX_BASE 0.6` + `_MODULE 0.45`/extra module + `_DEPOT 0.02`/t + `_BELT 1.5` while Belt claim runs + `_HANGAR 0.15`/parked vehicle + `_DIV 0.25`/invested division. **Exactly $0 fresh** (derived from existing state, no SAVE bump). Wired into all 3 burn sites (`advance()`, `lastMonth.mExp`, `commandSummary.overhead`). Validated (26: $0 fresh, rises with each dimension, in the burn, shrinks net; idle empire $11.25M/mo → −$5.17M/mo net).
- ✅ **Slice (b)** — Standing resupply-or-decay: per-facility `supply` meter (`FAC_SUPPLY_MONTHS 8`), drains 1/mo. Starved: output ×0.4, bleeds rep+support, after 6 months evacuates a module. `resupplyFacility()` instantaneous contracted launch: cost ∝ modules × bodyResupplyMult (earth 1.0 / moon 2.2 / mars 4.2) × (missing/cap). Legacy saves provisioned. SAVE_VERSION→31. Validated (29: cost scales size+distance, starvation effects, legacy compat).
- ✅ **Slice (c)** — Era-scaled failure stakes + bailout retune. `applyEraStakes()` on severe losses: −22% of current rep + collapse public support 8 + spike rival momentum 0.22, all ×`eraStakesFrac()` = eraIndex/(ERAS−1) → **0 in Pioneer** (early game provably unchanged). Bailout: era-scaled principal + steeper rep cost + **permanent loan interest** (`state.loanInterest` += amount×0.06, folded into all 3 overhead sites). SAVE_VERSION→32. Validated (18).

### CE5 · Live Launch ✅ DONE (a/b/c, 2026-06-27)

**Problem:** `resolveFlight()` resolves in one hidden instant. High reliability = boring; low = feels unfair.

**The fix:** Phase-split flight; near-miss surfaces a live call (abort/press-on or bank/burn). Agency, not power — high-R flights rarely prompt a call; risky flights become decisions.

- ✅ **Slice (a)** — Phase-split `resolveFlight`: `FLIGHT_PHASE_ORDER` (pad→ascent→staging→coast→deep→return); `SUBSYS_PHASE`/`livePhaseOf`. `flightPhaseBreakdown(report)` groups subsystems per phase; ∏ phaseRel = overall R exactly. `resolveFlight` attaches `phases`+`govPhase`; outcome selection unchanged. Validated (15: ∏phaseRel=R within ε, phases canonical/non-empty, 20k rolls ≈ R).
- ✅ **Slice (b)** — Near-miss live abort/press-on: `liveCallFlag(outcome)` flags worst loss-severity early-phase subsystem in amber band (rel ≤ 0.94) when R ≥ 0.40. Deterministic, no RNG. Only when `animEnabled && (crewed || !routine)`, never headless. **Press on** = exact rolled outcome (balance-neutral). **Abort** = new `scrub` outcome: vehicle+crew recovered, mission+payout forfeit, rep −min(rep, crewed?8:5), no crew loss, no stand-down. Validated (31 + ce5-regress 9/9).
- ✅ **Slice (c)** — Deep-leg reserve-margin (bank/burn): `deepReserveMargin(sim)` = tightest spare-dV fraction across in-space legs. `deepCallFlag()` flags drifting deep subsystem (deep_propulsion/life_support, amber band) when reserve ≥ 0.08. **Bank** = exact rolled outcome (balance-neutral). **Burn** = guaranteed salvaged `partial` (PARTIAL_PAYOUT_MULT haircut; crewed → crew home). No new state, no SAVE bump. Validated (26).

**Build sequence:** CE1 → CE2/CE3 → CE4 → CE5. All done.

## Session — Balance/UX audit, trap-node wiring, Station Bench slice 2 (2026-07-02)

**Context.** User uploaded the live game file for a fresh audit: "improve overall cohesiveness, playability, and features... think like both a game developer and a KSP/Stellaris fan." Full playthrough simulation (headless bot, 50-trial survival tests) surfaced that idle play was earning money (government funding paid at neutral public support), making the treasury a non-issue. Fixed, then worked through the priority list the audit produced.

### Balance & cohesion pass ✅ DONE (commit `f9b2ec8`)

- **Economy tension:** `govMonthlyFunding()` now pays only for public support *above* neutral (50), full grant at 80; goodwill above neutral decays at half the rate bad blood heals (sticky). Windfall/grant events gated on an active program (flight in last 36 months, active research, or support > neutral+3) — an idle agency stops attracting money. Napkin difficulty keeps a small floor grant as its forgiving identity. **Idle-only play now bankrupts in ~4 years** (was: grew from $5M to $88M over 30 years, confirmed via headless sim).
- **Runway tracking:** `runwayMonths()` + one-shot treasury warnings at 12mo/6mo remaining.
- **Government Mandates (new system):** periodic (every ~15mo) offer to fly a specific achievable mission by a deadline for a cash bonus (0.65× payout, era-scaled) + support swing (+8 fulfilled / −10 missed). The designed replacement for the old ambient grants — earned bridge financing that makes the calendar matter. `MANDATE_COOLDOWN_MO`/`MANDATE_BONUS_MULT` are the tuning knobs if pacing needs adjustment.
- **UX:** attention badges (`tabAlerts()`/`renderTabBadges()`) on all 5 scene tabs — treasury danger, mandate deadlines, staff morale crises, expiring passive contracts, a vehicle design that can't fly the active mission, an idle R&D lab with affordable research, an imminent committed launch window. Δv shortfall message now quantifies the exact gap instead of a vague "build more capability." Launch re-entry guard while any decision modal (`_pendingLaunch`/`_pendingLive`/`_pendingSetback`) is open. Type floor lifted ~200 instances (10px→11px, 11px→12px) for readability.
- **Milestone celebrations:** every first-time mission completion gets a fanfare modal framed against the rival space race ("You beat Vostochny Dynamics to it by 3 years" / "Meridian got there first — but flying it yourself is what builds an agency"), historical footnote, and reward readout.

### Trap-node wiring ✅ DONE (commit `f9b2ec8`)

All 7 research nodes that previously had `effect:{}` (purchasable, cost real money/months, did nothing) now have real mechanics:
- `cryo_boiloff_control` — new mechanic: LH₂ (CH₄ at half rate) in-space stages lose propellant over long coasts (1.5%/mo uncontrolled, capped 30%); node cuts rate ~4× to 0.4%/mo. Surfaced in mission readout + leg table. Validated: hypergolics immune, MISSIONS data never mutated, hydrolox Mars prop floor rises 100t→175t uncontrolled, research buys it back to 100t.
- `gravity_assist_planning` — −8% Δv on Jupiter/Saturn/Belt transfer legs, marked on the leg row.
- `orbital_eva` — crewed reliability penalty 0.92→0.95.
- `surface_fission_power` — −25% facility standing resupply cost.
- `onorbit_servicing` — unlocks the Satellite Servicing Fleet passive contract ($2.6M/mo, 150 rep).
- `megawatt_electric` — +10% Isp on all electric drives (Hall/Ion/NEP), via `reconcileEngineMods()` against captured base values — survives save/load/newGame without double-applying.
- `fusion_propulsion_research` — unlocks the new **Daedalus Fusion Torch** engine (Isp 6000s, real thrust 60kN) — the Speculative-era capstone drive.

### Station Bench slice 2 — full module assembly ✅ DONE (commit `5c60c8c`)

Previously a placeholder tab (one annotated sample module, no assembly). Now a real designer wired to actual built facilities:
- **Module library** (`STATION_MODULES`, 6 types): Habitat (`can_std`, power-positive core), Research Lab, Solar Power Truss, Docking Node (adds +3 ports), Propellant Depot Module (needs `orbital_depot`), Greenhouse (needs `eclss_partial`, −15% resupply + self-feeding).
- **Per-facility assembly:** `fs.moduleList[]` (legacy saves migrate lazily — old generic module counts become Habitats). `addStationModule()`: cost = module base × body multiplier × size escalation; build months advance the calendar; assembly flight refreshes supply clock.
- **Typed production:** facility output = base + Σ(docked module `prod` × body multiplier); **power-starved stations (draw > gen) run at 60%** — labs are science engines but power-hungry, forcing a Power Truss.
- **Port caps:** 4 base slots, +3 per Docking Node.
- **New bench UI:** facility selector tabs (when multiple built), assembled-stack side-view SVG with per-module-type silhouettes, aggregate stats panel (mass/crew/power/income/science/resupply) with power-starve and port-cap warnings, 6-card dock palette with live cost/gate/afford state.
- Legacy `expandFacility()` (Command Center quick-expand) now routes through the typed path, adding a Habitat.

**Validated headlessly (all three):** boot, all 5 tab renders, flight resolution, save/load roundtrip, idle-bankruptcy pacing (4yr), boil-off margins, engine-stat reconciliation across save/load/newGame, full assembly flow (found→dock lab→power-starve→dock truss→recovers→port cap blocks→node raises cap→greenhouse gate+resupply cut→legacy expand→migration→render→save/load).

### Post-session corrections (2026-07-02, later same day)

The "recommended next steps" list below was written before several more commits landed later
the same day (`1e9de2df`→`b7ba8fb5`). Verified directly against the live repo file — items 1,
3, 4 were built; item 5 was addressed by design (not a bug); item 2 remains genuinely open:

1. ✅ **DONE** (`1e9de2df`) — `missionNetEconomics()`/`missionNetHTML()` now show true margin
   after mission-duration carrying costs, wired into both the mission list and detail readout.
2. ⬜ **STILL OPEN** — confirmed via code read: `renderMapActivity()` is a side card (market
   events + rival frontier), not an on-map overlay. No planned-trajectory line or live
   depot/base/in-flight-mission markers drawn on the map scene itself yet.
3. ✅ **DONE** (`f226159d`) — Engine differentiation: heritage system (`state.engineHeritage`,
   flight-count-based cost/reliability bonus), solid-motor simplicity discount + insertion
   reliability tax (`SOLID_SIMPLICITY_DISCOUNT`, `SOLID_INSERTION_REL_TAX`).
4. ✅ **DONE** (`5b42187e`) — Cape status glyphs: `buildingGlyph()`/`GLYPH_COLOR`, live
   attention/active/ok/idle state per building on the home screen.
5. ✅ **ADDRESSED BY DESIGN** — the low-payout science missions (`space_telescope`,
   `sample_return`, `astrobiology`) are explicitly commented in the source as "#3: prestige
   science missions — pay little money, but bank a large knowledge windfall (sciYield)". Not
   a balance bug; intentional payout/knowledge tradeoff. Not revisited.

**Also shipped same session, beyond the original list:**
- `0ea922e1` — Station Bench finished: crew requirements (`facilityCrew`), synergies
  (`facilitySynergies`), station-wide R&D speed bonus (`stationRdSpeedBonus`).
- `b7ba8fb5` — Tech tree interaction layer: track/status filters, prereq-chain path
  highlighting on node focus (`techPrereqChain`, `setTechFilter`, `setTechFocus`), per-track
  progress.
- `aef0edd4` — Debloat pass: removed dead code, consolidated duplication (−226 lines).

### Recommended next steps, in priority order (corrected)

1. ✅ **DONE — Solar system map asset overlay ("Empire Layer")**. One shared model
   (`mapAssetModel()`/`plannedRoute()`/`empireStripHTML()`) rendered with parity in both the
   SVG map and the Phaser MapScene: player presence pennants (pulsing) on every body with
   completed missions + firsts tooltip; facility markers with health rings (green nominal /
   amber strained: low supply, power-starved or under-crewed / red starved, blink rate encodes
   urgency) + module-count pips; LEO depot arc-gauge around Earth; ISRU picks on Moon/Mars/Belt;
   Belt mining-claim pulse ring; planned-route arc for the ACTIVE mission (cyan when the design
   closes, red with "Δv short" when it doesn't; committed windows keep the existing amber
   animated arc); empire ledger strip above the canvas (bodies reached, facilities+modules,
   depot tonnage, Belt claim, space income/mo). Note: true "in-flight mission" markers are not
   representable — missions resolve with a calendar jump, no persistent in-flight entity exists;
   planned+committed routes cover that intent. Validated headlessly across empire states
   (fresh/flags/facility health transitions/depot/ISRU/claim/route feasibility/strip/regression).
2. *(No other open items from the original audit — re-audit before adding new ones.)*

**Repo state:** all changes on `main` through commit `c4b88dc9` (this file). Live file is
`orbital-ventures.html`, ~972K chars. Pushed via Git Data API (fine-grained PAT, treated as
compromised/revoked immediately after use per standing practice).


## Session — Personnel expansion: deeper roster + four new hire categories (2026-07-04)

**Context.** Expand *who* can be hired beyond the 4 engineering specialties + Astronaut Corps —
more named people in every pool, plus four genuinely new hire categories, each on a new effect
axis staffing didn't previously touch. Designed via a plan pass (verdict: generalize the pool
model first, then ship categories as independent, balance-neutral slices; **no SAVE_VERSION bump**
— every effect derives from who's hired, and departments already lazy-default). Also fixed the
`pendingCelebration` 1990 crash first (§ above, now ✅).

**Core design decision — role registry, not a bolt-on.** A binary engineer/astronaut split lived
in ~10 call sites; with 5 roles a per-site if/else is untenable. Introduced `STAFF_POOLS` +
`poolOf`/`roleOf`/`roleLabel`; the named `ENGINEERS`/`ASTRONAUTS` arrays and all hire/fire/
morale/XP/poaching machinery are already role-agnostic, so new roles plug in without touching them.

- **Slice 1 — Roster expansion.** +8 engineers (e13–e20; each of the 4 specialties now has 5,
  filling era gaps) + 4 astronauts (a09–a12). New per-id hash-assigned traits; existing
  personalities unchanged (hash is per-id).
- **Slice 2 — Role-registry refactor.** `STAFF_POOLS`/`roleOf` replace the binary across
  `personById`, `availablePool`, `deptMembers`, `deptOfPerson`, `traitOf`/`traitKeyOf`, UI labels.
  Froze `ENG_TRAITS`/`ASTRO_TRAITS` key order with a warning comment (trait = `hash(id)%keys.length`
  — derived, not saved; reordering would silently reassign every character's personality). **Fixed**
  the pre-existing poach-log bug printing `(undefined)` for non-engineers (now `roleLabel`). Proven
  byte-identical via a parity harness (318/318) over every id, all 5 eras, 4 seeded rosters.
- **Slice 3 — New engineering specialties.** `software` (Flight Software 💻) + `materials`
  (Materials & Processes 🧪), 3 hires + 1 dept each. Feed `engScores` rel/R&D automatically
  (specialty-agnostic). Niche via `SUBSYS_SPECIALISTS`: materials strengthens the structures
  subsystem, software strengthens avionics (`bestSpecialistSkill`) — byte-identical unstaffed. NOT
  added to `criticalDepts`/`deptStaffingRelPenalty` (would penalize existing saves).
- **Slice 4 — Scientists 🔬.** `SCIENTISTS` pool + `SCI_TRAITS` + Science Division. Generic
  `roleTeamScore(role,chan)` helper (lead-weighted, mirrors #19; 0 unstaffed). Hooks: `sciYieldMult`
  ×(1+yield, cap 25%); R&D-speed sum += rd (cap 10%, kept small — sum already stacks 4 uncapped
  sources).
- **Slice 5 — Executives 💼.** `EXECUTIVES` + `EXEC_TRAITS` + Front Office. Hooks: `govMonthlyFunding`
  earned term ×(1+gov, cap 20%); `empireOpex` ×(1−opex, cap 15%); mandate offer ×(1+mandate, cap 15%).
  Does NOT touch contract payouts (CE4 owns reward inflation). Era-scaled by nature.
- **Slice 6 — Mission Controllers 🎧 (launch flow).** `CONTROLLERS` + `CTRL_TRAITS`
  (anom/call/rescue channels) + Mission Control dept. All hooks are CHANCE-only (**CE5 invariant**:
  staffing never changes how a call *resolves*): `rollMissionEvents` chance ×(1−anom, cap 35%);
  anomaly thresholds wrapped in `opsLuck(p)` (=p unstaffed, +call ≤10% staffed); `rescueChance` +=
  rescue (cap 8%, inside clamp); `flightReadiness` mirrors the cut. CE5 flags untouched. Proven
  byte-identical launch flow with no controllers (40 seeds × 4 contexts) + a 20k-trial Monte Carlo
  confirming the anomaly rate drops when staffed.
- **Slice 7 — Polish.** Contextual advisor nudges ("Hire a scientist/flight director/executive" only
  when the role would help and one is hirable); `staffEffectsHTML()` aggregate line on the exec
  overview; balance sweep on the 8 new constants (all bounded, neutral-when-unstaffed, gated by
  salary 0.05–0.18M/mo).

**Validation.** Whole-script syntax + a comprehensive headless staff suite: registry parity, roster
(26 eng / 12 astro / 3 sci / 3 exec / 3 controllers, ids unique), 10 departments, specialist niche,
every effect hook (neutral unstaffed → active-within-cap staffed), the CE5 launch-flow invariant,
and the Monte Carlo. **223/223 green.** No SAVE_VERSION bump.

**Repo state:** all changes in the local working copy `orbital-ventures.html`; **not yet pushed**
(user pushes via Git Data API). New save fields: none.

### Recommended next steps
1. Browser-test the expanded Personnel view (deeper roster; Science Division / Front Office /
   Mission Control departments; per-hire contribution lines; exec-overview staff-bonuses line), then
   push.
2. Optional follow-ups deferred from the plan: role-flavored personnel events (`checkPersonnelEvents`
   currently routes new-role traits to the neutral else-branch); an aggregate R&D-speed clamp (the
   sum stacks eng+station+division+partner+sci uncapped — a latent pre-existing issue, now nudged);
   the CE5 live-call band-widening stretch (deliberately skipped to keep the invariant airtight).

## Session — Contracts accessibility: rail accordion section + Flight/Passive sub-tabs (2026-07-04)

**Context.** Contracts are the main money source outside regular missions but felt buried — passive
contracts in particular sat at the bottom of the drill behind a long scroll. Two UX changes, both
pure presentation (no economy/state changes, no SAVE_VERSION bump):

- **Persistent rail Contracts section.** New `railPersistent` accordion entry (`raccContracts`) —
  click to preview signable contracts inline, double-click to open the full drill. `contractsRailSummary()`
  aggregates open mission contracts + available passive contracts + standing/available $/mo;
  `railContractsHTML()` renders standing-income line, top-3 signable passive rows with inline Sign
  buttons, mission count, and an "Open full Contracts →" footer. Badge (`#badgeContracts`) shows
  `count·+$X/mo`, refreshed every render inside `renderRailPersistent()`. Removed the now-redundant
  `Contracts →` button from the Objectives rail; retitled the drill header `📡 Mission Control` → `📡 Contracts`.
- **Flight / Passive sub-tabs.** Split the full Contracts drill into 🚀 Flight Contracts / 📶 Passive
  Income sub-tabs (`contractsSubTab` state, `setContractsSubTab`, `renderContractsSubtabs`) so passive
  income is one click away instead of a full scroll. Tab labels carry live pills (open-mission count;
  active +$/mo or signable count).

**Validation.** Whole-script syntax OK; `contractsRailSummary` harness 18/18; staff regression 223/223.

**Repo state:** pushed to `shamusshafer-ops/Orbital-Ventures` main. New save fields: none.

## Session — Save management & startup screen (2026-07-04)

Player request: "make sure the game always starts by asking to continue the last game, open a save, or start new."
The boot previously called `newGame()` unconditionally (the localStorage save was only restored via a manual Load).
Decisions (user): add real save files (export/import) + autosave.

- **Startup screen (`showStartup`).** Boot now establishes a baseline state to render, then ALWAYS shows a
  Continue last game / Open a save file / New game modal. Continue → `autoLoad` + recap; New → difficulty picker →
  `newGame` + the Production intro; Open → file import. `savedGameMeta()` labels Continue with company/year/save-time.
- **Autosave.** Silent throttled `autosave()` (≥4 s apart) on each turn (end of `advanceDays`) + a forced save on
  `beforeunload`, so Continue always resumes the latest session. Skips mid-flight-resolution snapshots.
- **Export / Import save files.** `exportSave()` downloads a `.json`; `importSave()` file-picks → `loadSaveFromText`
  (shared with localStorage load). Wired into the startup screen + Settings (alongside Save/Load).
- **Data-safety guard.** `_gameStarted` gates autosave so the boot placeholder game can NEVER overwrite the real
  save if the tab is closed at the startup screen; import validates and shows a clean error on a bad file.
- Forced SAVE_VERSION 40→41 (autosave now persists `activeFlights`) — completing 1.2c's persistence half.

**Validation.** Whole-script syntax OK; new headless suites — save/load round-trip + autosave guards (ov-persist
13/13), startup/import/meta + `_gameStarted` guard (ov-save 11/11); regressions crew 12/12, arrival 17/17, flight
42/42, beginResolve 3/3.

### Progress log — P2 (living logistics)
- **2.1 ✅ (2026-07-04)** — Resupply becomes a live logistics flight, Mars only. New `LOGI_TRANSIT_DAYS`
  table (`earth:0, moon:4, mars:210`, a fresh Hohmann-class figure — no existing one-way Earth↔Mars constant to
  reuse; `mars_flyby.days:420` is round-trip) + `logiTransitDays()`. `resupplyFacility()` still pays cost
  immediately; transit `< DEFER_CRUISE_DAYS` (LEO, Moon) resolves exactly as before — byte-identical; Mars
  pushes a `{kind:'logistics', deferred:true, facId, monthsShipped, launchAbs, arriveAbs, name, crew:0}` record
  onto `state.activeFlights` (no ctx/mission) and logs "shipment launched" instead of "resupplied".
  `pumpFlightArrivals()` gets a logistics branch ahead of the no-ctx corrupt-record drop: on arrival, tops up
  `supply = min(FAC_SUPPLY_MONTHS, supply+monthsShipped)`, resets `starvedMonths`, logs arrival, removes the
  record. New `canResupply()`/`resupplyInTransit()` gate blocks a second order ("Resupply en route.") and the
  button reflects it. `rehydrateFlights()` now keeps `kind:'logistics'` records (validates `facId`) instead of
  dropping them as corrupt. `flightsPanelHTML()` renders a 📦 row for logistics flights with no abort/recall verb
  (cancellation is a future slice). No SAVE_VERSION bump (`activeFlights` already persisted since 1.2c/41).
  **Design note:** `monthsShipped` is the shortfall at launch time (not a flat refill), and the base keeps
  draining during the ~7-month Mars transit — a late order now carries real starvation risk. Pioneer era (no
  facilities) and LEO/Moon are provably unchanged. Harness ov-logistics 37/37 (parity, lifecycle, round-trip,
  double-order block, corrupt-facId safety, Pioneer no-op, panel rendering, ctx-mission regressions).
  **Known cosmetic gap:** the Outliner in-flight row still shows 🚀 instead of 📦 for logistics shipments
  (function-correct, cosmetic only — left alone per the 2.1 scope). Next: **2.2** — plug the fuel market and
  cryo boil-off into transit cost/risk.
- **2.2 ✅ (2026-07-04)** — Resupply cost now floats with the live fuel market and cryo boil-off instead of a flat
  number. New `LOGI_FUEL_FRAC=0.45` (propellant share of resupply cost); `resupplyCostFull` becomes
  `base × (1 − LOGI_FUEL_FRAC + LOGI_FUEL_FRAC × marketRatio × boiloffRatio)` where `marketRatio =
  fuelBuyPrice()/FUEL_BUY_BASE` and `boiloffRatio` is a boil-off margin over the facility's transit duration,
  normalized to exactly 1.0 at baseline (no cryo research) for every body. Boil-off rates
  (`BOILOFF_RATE_BASE=0.015`, `BOILOFF_RATE_CONTROLLED=0.004`, `BOILOFF_CAP=0.30`) were extracted from the
  mission simulator into shared constants and reused here — mission-sim output is unchanged (regression-checked
  across 16 stack/day/control combos). Applies to **all bodies** (not just Mars) per user sign-off; effect is
  ~0% on LEO/Moon (near-zero transit) and material on Mars. `cryo_boiloff_control` research now also discounts
  Mars resupply (~3.6% total, since it's `LOGI_FUEL_FRAC`-weighted — the ~8% quoted during planning was the
  propellant-only figure). Fuel-market surcharge ranges ~+34% at normal high prices (~0.70) up to ~+62% at the
  rare event-shock ceiling (0.95) — higher than the "~+30% typical" planning estimate; user reviewed and
  accepted both actual numbers. Small dim-text hint added near the resupply button ("incl. propellant at market
  rate."). No SAVE_VERSION bump (no new persisted state).
  **Validation.** `node --check` OK. Baseline parity 48/48 byte-identical (LEO/Moon/Mars × modules × greenhouse
  × fission) vs. reconstructed old formula. Monotonic vs. fuel price and cryo research confirmed. Mission-sim
  regression clean. Lifecycle (charge==display, money-gate, prorate, Pioneer no-op) 11/11.
- **2.3 ✅ (2026-07-05)** — Route interruptions. New weighted `logi_mishap` entry in the existing `ECONOMY_EVENTS`
  pool (same `EVENT_CHANCE=0.14`/5-mo-cooldown machinery already used for fuel shocks), gated via a new
  `logiFlightsInTransit()` helper so it can only roll while a logistics flight is genuinely mid-cruise (mirrors
  the existing `reqDepot` gating idiom). On fire: picks one random in-transit shipment, computes a 20-45 day
  slip (`LOGI_MISHAP_DELAY_MIN/MAX`), and surfaces a decision modal reusing the existing research-setback
  pattern (`_pendingLogiMishap`, transient/unpersisted like `_pendingSetback` — no SAVE_VERSION bump): **expedite**
  (pay to fully hold the original `arriveAbs`) or **accept** (free, full delay applied). Expedite cost =
  `max(0.4, resupplyCostFull(facId) × 0.6 × delay/30)` — scaled off the shipment's own market-aware cost
  (already includes 2.2's fuel/boil-off terms) by delay fraction, not a flat number; unaffordable → accept-only.
  Delay is applied directly to the existing `activeFlights` record's `arriveAbs`, so the 📦 telemetry panel and
  Outliner row both reflect the new ETA automatically (both already compute ETA live from `arriveAbs`, verified,
  no separate field needed). Per-flight targeting confirmed even (33/33/33 split across 3 simultaneous test
  flights, arrived flights never targeted).
  **Validation.** `node --check` OK. Monte Carlo 200k rolls: fire rate 0.1253 vs expected 0.1250. **Critical
  parity guard: zero mishap fires across 300k+ rolls / 40k simulated months with no logistics flight in
  transit** (including a present-but-already-arrived flight) — airtight. Lifecycle: delayed record still tops
  up supply correctly at its new `arriveAbs`; survives save/load round-trip with the delay intact. Modal
  accept/expedite/unaffordable paths all verified. 21/21 assertions. Modal wording/readability needs a manual
  browser pass. Next: **2.4** — per-facility auto-reorder toggle (new persisted state → SAVE_VERSION bump).
- **2.4 ✅ (2026-07-05)** — Per-facility auto-resupply toggle (`fs.autoResupply`, default off). Monthly-tick hook
  (right after the supply drain, before the starvation check): if the toggle is on, supply ≤
  `AUTO_RESUPPLY_THRESHOLD=6` (of `FAC_SUPPLY_MONTHS=8`), and `canResupply(id).ok`, calls `resupplyFacility(id)`
  automatically — same cost/gate/lifecycle as a manual click, just triggered by the toggle. Threshold reasoned
  from drain rate: gives a ~2-month reaction buffer without log-spam; on Mars a base ordering at 6 still arrives
  ~1 month into starvation given the ~7-month transit, but that's inherent to 2.1's one-shipment-at-a-time model
  and matches a manual player's own experience — flagged as an easy-retune constant. Every auto-order logs
  clearly so a fuel-price-spike auto-charge (per 2.2) is never a silent surprise. **SAVE_VERSION 41→42** +
  `migrateFacilityAutoResupply()` lazily defaults the field to `false` on old saves (both load paths). UI: a
  small on/off toggle in the infra panel mirroring the existing `setAssembleOrbit` button pattern.
  **Validation.** `node --check` OK. 20/20 headless: migration default+idempotency, threshold boundary (no fire
  at 7, fires at 6), money gate respected, toggle-off never fires even while starving, **fires exactly once
  across 6 in-transit months on Mars** (no spam), log line present, Pioneer/no-facility no-op. UI wording/
  placement needs a manual browser pass. **This closes out P2 (living logistics, slices 2.1-2.4) — one of the
  P1/P2/P11 "put the universe in motion" through-line initiatives, alongside P1 (done) and P11 (not yet started).**

### Progress log — P3 (failure investigation loop)
- **3.1 ✅ (2026-07-05)** — After an uncrewed loss/abort/strand, a fund/decline modal (mirrors `_pendingSetback`/
  P2's `_pendingLogiMishap` exactly, slotting into the same precedence chain: setback > mishap > inquiry) offers
  an inquiry costing `max(0.6, 0.3×flightExpense)` (the lost flight's own build+launch+etc. cost). Reward is
  determined by what failed, via existing `SUBSYS_PHASE`: ascent/staging subsystems → a flat +0.02 reliability
  credit (`state.inquiryCredit={subsystem,rel:0.02,flights:3}`, additive to `effectiveReliability` like
  `familyRelBonus`, consumed one flight at a time, only when that subsystem is actually relevant — zero overhead/
  drift when unfunded); deep-phase subsystems → a flat `INQUIRY_SCI_BONUS=10`⚛ science grant (~1.5× a base deep
  mission's yield). No cooldown/stacking — a new inquiry replaces any unused prior credit. Crewed catastrophes
  are completely untouched (they keep their existing implied 6-month grounding narration; this is uncrewed-only
  by design). Decline path is byte-identical to today. New persisted state → **SAVE_VERSION 42→43** + migration
  (old saves → `inquiryCredit:null`).
  **Validation.** `node --check` OK. 43/43 headless: cost math, reward-selection-by-subsystem, credit lifecycle
  (3→2→1→null via real launches, irrelevant credit never consumed, no-stacking replace), decline no-op, trigger
  scope (uncrewed loss only — never success/rescued/crewed), save/load round-trip of a partially-consumed
  credit, v42→v43 migration. **Monte Carlo (N=300, paired RNG):** reliability delta lands at exactly the
  intended +0.02×relevance-fraction, zero drift when never funded. Modal wording/layout needs a manual browser
  pass. Quick wins **P4/P5/P7-P10** remain independent of the entity model and can be tackled in any order.

### Progress log — P4 (rival voice)
- **✅ (2026-07-05)** — Per-profile rival communiqués/taunts, strings only. Distinct rival archetypes already
  existed (`RIVALS`, Vostochny/state agency, Meridian/legacy contractor, Halcyon/scrappy newcomer) — no new
  personality system needed. New `RIVAL_VOICE` (per-id `taunt`/`defiant` line pools) + `rivalVoiceLine(r,kind)`
  helper wired into the two existing user-facing rival events: `fireRivalFirst()` (a rival claims a "first" —
  logs a boastful taunt) and `denyRivalGoal()` (you beat them to a goal — logs a defiant reply). Voice modeled
  on the game's existing dry, em-dash log register. Purely flavor: no state mutation beyond the existing
  append-only log, no persisted state, no SAVE_VERSION bump.
  **Validation.** `node --check` OK. Distribution check (4000 picks/pool) confirms every line in every pool is
  reachable; unknown rival/kind returns a safe no-op. Tone/quality is a human judgment call, not machine-checked.
  **Flagged, not built:** a deeper reactive rival mood/relationship system — today's archetypes are static, this
  slice didn't add dynamic personality state, which would be a larger follow-up if wanted.

### Progress log — P5 (rival disasters + rescue)
- **✅ (2026-07-05)** — Rivals can now fail publicly. New monthly `tickRivals()` disaster roll
  (`RIVAL_DISASTER_BASE_P=0.0055`/mo, Monte Carlo-tuned to a ~15yr mean interval at baseline) times a
  per-archetype multiplier (Vostochny ×1.0, Meridian ×0.6, Halcyon ×1.5 — empirically ~15/25/10yr). Two kinds:
  **uncrewed** (flavor + `RIVAL_DENY_MOM×0.5` momentum knock + a new `distress` `RIVAL_VOICE` line) and
  **crewed** (only once that rival has claimed a crewed first; full momentum knock; surfaces a rescue-offer
  decision modal) — a coin-flip between the two when crewed-eligible (not specified by the sign-off, flagged).
  The rescue offer is a **lightweight simulated decision**, not the real player rescue-mission pipeline (that
  would need a fake mission ctx) — cost/chance mirror the real `rescueCost`/`rescueChance` formula shape with a
  fixed synthetic strand difficulty (cost 15; chance uses the same rep/rendezvous/nuclear-thermal/facilities/
  `ctrlRescueScore` levers, capped ~0.78, floored 0.10). **Mount+succeed:** +6 rep, +5 support (2×
  `SUPPORT_DELTA.rivalFirst`), new `humbled` voice line. **Mount+fail:** cost sunk, no windfall, rival's
  momentum hit stands regardless. **Decline:** −2 rep, −1.5 support (a real but minor cost, ~1/3 the windfall
  size) + the rival's momentum hit stands. Modal is deferred (not shown this tick) if a setback/mishap/inquiry
  is already pending, matching the existing precedence chain. No persisted state (`_pendingRivalDisaster` is
  module-scope, never serialized) — no SAVE_VERSION bump.
  **Validation.** `node --check` OK. 30/30 headless: crewed-first gating per rival, cost/chance formula, both
  disaster-kind deltas, modal deferral under the existing chain, mount-succeed/mount-fail/decline exact deltas,
  no save-state leakage. Flavor tone and modal wording need a manual browser pass. **Closes P5.** Remaining
  quick wins: **P7-P10** (P6/P11 are the two remaining big swings).

### Progress log — P6 (era texture pass)

Scoped as 4 slices: 6.1 era-transition interstitial (most visible/self-contained, first), 6.2 per-era event
pools, 6.3 passive-contract reskins, 6.4 era-sensitive public mood (reweight only, smallest, last).

- **6.1 ✅ (2026-07-05)** — Era-transition interstitial. Trigger is derived (`eraIndex(currentEra()) >
  state.eraSeen`), not a transient flag, so it can never be lost — checked at all four post-advance settle
  points, deferred behind the full existing `_pendingSetback/_pendingLogiMishap/_pendingInquiry/
  _pendingRivalDisaster` chain as lowest priority. On trigger: single click-through full-screen card showing
  the new era's name/years/`blurb` plus a retrospective (flights flown, firsts claimed vs. rivals scooped,
  treasury/rep change) diffed against `state.eraStartSnapshot`, taken at the start of the era just finished;
  snapshot resets on dismiss. Multi-era jumps (e.g. a big time-skip) chain one card per boundary. New persisted
  state (`state.eraSeen`, `state.eraStartSnapshot`) → **SAVE_VERSION 43→44**. **Critical migration behavior:**
  loading an old save backfills `eraSeen` to that save's OWN current era (via `eraIndexForYear`), not to 0 —
  so an old save resumes cleanly with zero stale interstitials for eras already played through.
  **Validation.** `node --check` OK. 25/25 headless: one card per transition, no fire mid-era/after dismiss,
  **old-save backfill confirmed zero stale cards** (year-2015 save → backfills to Commercial era index, not
  Pioneer), modal-priority deferral under all four existing blockers, retrospective diff math (incl. negative
  deltas), multi-era-jump chaining. Visual card layout/copy tone needs a manual browser pass. Next: **6.2** —
  per-era event pools (`minEra`/`maxEra` gating on `ECONOMY_EVENTS`, old events retired as eras advance per
  user decision).
- **6.2 ✅ (2026-07-05)** — Per-era event pools. Added optional `minEra`/`maxEra` (era-index bounds) to the
  central `ECONOMY_EVENTS` eligibility filter — absent on an entry means no era restriction (all 13 pre-existing
  unbounded entries fully backward-compatible). **Retired** two government-funding events by era: `gov_grant`
  (`maxEra:3`, fades as Commercial arrives) and `subsidy` (`maxEra:4`, fades at Expansion) — their bad-half
  counterparts (`austerity`, compliance audits) intentionally stay era-agnostic. **Added 6 new entries** across
  three thematic bands, one good/bad pair each, magnitudes matched to existing entries of similar severity:
  Cold War prestige panic/audit (eras 1-2), commercial investor mania/correction (eras 4-6), expansion-era ISRU
  windfall/off-world dispute (eras 5-7). Voice modeled on existing dry economic-event blurbs with era inflection
  (legislative/prestige politics → market/stock language → resource-rights language). No new persisted state —
  era gating computed live from `state.year`, no SAVE_VERSION bump.
  **Validation.** `node --check` OK. Off-by-one boundary check 8/8 (every era-bounded entry eligible exactly at
  its bounds, not one era outside). Parity: all 13 unbounded entries unaffected in every era. Per-era pool
  weight checked structurally across all 8 eras — no era left thin or overloaded (e.g. mature-player weight
  went 3→3 / 20→24 / 24→28 / 32→32 / 32→33 / 32→35 / 32→33 / 32→31 across eras 0-7). Monte Carlo (1000 sim-yr,
  4 sampled eras): fire rate stable ~10.6-11/decade regardless of era. **Known pre-existing gap, unchanged by
  this slice:** Pioneer era (1942-44) has zero eligible events until `gov_grant` unlocks at 1945 (a `minYear`
  effect predating this work) — an acceptable thin-start gap. Next: **6.3** — passive-contract reskins
  (including 1-2 new contract types per user decision).
- **6.3 ✅ (2026-07-05)** — Passive-contract reskins, scoped to **reskin only, no new contract types** (user
  decision — the prior "1-2 new contract types" note was an open flag, not a locked decision). **Found first:**
  `PASSIVE_CONTRACT_DEFS`'s `sat_weather`/`sat_comms`/`sat_imaging` already had an `eraVariants` field stubbed
  from an earlier, unfinished pass — tagged `// P6 6.3` in comments but never read anywhere, i.e. dead data.
  Also found in passing: `tabAlerts()`'s expiring-contract badge referenced `cn.name`, which is never set on a
  signed contract record (`state.passiveContracts` entries only carry `id`/`monthsLeft`/`income`) — a
  pre-existing `undefined` display bug, fixed alongside this slice since it's the same "contract shows the
  wrong text" class of problem the user flagged earlier this session (see the suborbital-narration fix above).
  Added `passiveContractDisplay(d)` — resolves a contract's live name/blurb against `d.eraVariants` (checked
  in order, first `minEra`/`maxEra` bound match wins, unset fields fall through to the base def) using
  `eraIndex(currentEra())`, same gating idiom as 6.2's `ECONOMY_EVENTS`. Resolution is **live**, not
  snapshotted at signing — a contract signed pre-Commercial-era that's still running when the era turns
  updates its displayed flavor text (deliberate, matches 6.2's "computed live" precedent; no gameplay/number
  effect either way, text only). Wired into all 6 display sites: the sign-up list (`renderPassiveContracts`),
  the persistent-rail top-3 preview (`railContractsHTML`), the Outliner's expiring-soon row, the Command-tab
  alert badge (fixing the `cn.name` bug in the same edit), and both the sign/expire log lines. **Extended the
  reskin to `mil_launch`/`mil_warning`/`mil_recon`** (same `first_sat`/`crew_orbit` reachability window as the
  sat_* contracts, so the variant is actually visitable in a normal playthrough) — Cold War strategic-mandate/
  deterrence-network flavor pre-Commercial era for the first two, a modern commercial-recon-partnership variant
  post-Commercial era for the third (its base text already reads as the classic-state flavor, so the variant
  runs the other direction — deliberate, not a mistake). **Deliberately skipped `lic_*`:** their `reqResearch`
  (propulsive_landing/nuclear_thermal/mars_isru) generally isn't reachable until well past the era-4 boundary
  in a normal game, so an "older-era" variant would rarely or never actually be seen — not worth the dead
  weight. Every base string left **byte-identical** for any def with no `eraVariants` (`svc_orbit`, `tour_*`,
  `lic_*`) — purely additive. Headless: `node --check` OK; standalone resolver harness (45 assertions) — all
  3 unaffected contract types return base text unchanged across all 8 eras; all 5 `maxEra:3` variants resolve
  to the old flavor from era 0 through the 1999/era-3 boundary and flip to base/modern exactly at the
  2000/era-4 boundary; `mil_recon`'s `minEra:4` variant mirrors that boundary in the other direction. **This
  closes out 6.3.** Next: **6.4** — era-sensitive public mood (reweight `SUPPORT_DELTA` only, no new mechanic).

- **6.4 ✅ (2026-07-05)** — Era-sensitive public mood. New `SUPPORT_ERA_MULT=[1,1,1,1,0.85,0.7,0.55,0.45]`
  (indexed Pioneer..Speculative) and `supportDelta(key)` (`SUPPORT_DELTA[key]*supportEraMult()`) — same
  "old era is the untouched reference, later eras change" idiom as 6.3's contract reskins and 6.2's
  gov-funding retirement. **Eras 0-3 (Pioneer through Station & Shuttle) are exactly 1× — every
  `SUPPORT_DELTA` outcome swing is byte-identical to today**, since the space race is still front-page news
  through the Shuttle era; from Commercial era on, a single mission's outcome moves public opinion
  progressively less (spaceflight normalizing), bottoming out at 0.45× in the Speculative era. Replaced
  every `addSupport(SUPPORT_DELTA.x)` call site (7 of them, across mission outcomes + the rival-firsts-denial
  path) with `addSupport(supportDelta('x'))`; sign is always preserved (multiplier is a plain positive
  scalar). **Deliberate scope boundary:** left two things outside the `SUPPORT_DELTA` table untouched — the
  non-routine "big win" success formula (`clampA(2+(m.rep||5)*0.05,2,10)`, a custom expression, not a table
  lookup) and P5's `RIVAL_RESCUE_SUPPORT`/`RIVAL_DECLINE_SUPPORT` constants (a separate rival-rescue system
  that only happens to reference `SUPPORT_DELTA.rivalFirst` once, at parse time, to derive its own value) —
  both are outside the literal "reweight `SUPPORT_DELTA`" mandate for this slice; flag if revisiting. No new
  persisted state, no SAVE_VERSION bump — era gating computed live from `state.year` exactly like 6.2/6.3.
  Headless: `node --check` OK; standalone resolver harness (108 assertions) — every `SUPPORT_DELTA` key is
  byte-identical to its raw value across the full eras-0-3 year range (1942-1999); every key scales to
  exactly 0.85× at the 2000/era-4 boundary; monotonic non-increasing multiplier confirmed across eras 4-7;
  sign preservation confirmed for every key at three sampled eras; no NaN/undefined arbitrarily far into the
  Speculative era (year 9998). **This closes out P6 (era texture pass) — all four slices shipped.** Next:
  quick wins **P7-P10** (P6/P11 were the two remaining big swings; P11 is the last item on the ranked list).

## Session — P7-P10 quick wins (2026-07-05)

User green-lit all four remaining quick wins in one pass; asked for token frugality, so this ran as one
sitting with the coordinator making the content/design calls directly (as with P6's reskins) rather than
a round of upfront questions — each design decision is called out below. All four ship with **no new
persisted state and no SAVE_VERSION bump** (frontPages uses the same lazy-guard pattern as `blueprints()`;
everything else is fully derived or reuses existing fields). `node --check` OK after every slice;
standalone logic harnesses per slice (counts below) — no in-browser pass yet, flagged like other
UI-heavy work this session.

**P7 — Newspaper front page + Chronicle scrapbook.** New `frontPages()`/`pushFrontPage()` (cap 24, same
lazy-default idiom as `blueprints()`) files a headline record at 4 existing trigger points — untouched
otherwise — a player milestone (`showMilestoneModal`), a rival claiming any first incl. a scoop
(`fireRivalFirst`), a rival's crewed disaster (`maybeRivalDisaster`), and a player crewed catastrophe
(the CATASTROPHE branch). Deliberately did **not** touch any existing modal's trigger/timing logic (the
`pendingCelebration` chain is fragile) — purely additive data capture. New `frontPageHTML()` renders a
newspaper-styled artifact (masthead, kind label, headline, dek — serif/letter-spacing via existing CSS
vars, no new assets); the existing "📖 Chronicle" view gained a new "📰 The Agency Wire" scrollable section
(`frontPagesHTML()`) listing headlines, each opening its styled rendering. 4/4 harness assertions (cap +
ordering).

**P8 — Cross-track synergies as verbs.** The `SYNERGIES` config described in the 2026-06-26 review was
**never actually built** (confirmed: zero hits for `SYNERGIES` in the live file before this slice — the
"config ready" note in the plan meant the design was spec'd, not the code). Built it fresh: `SYNERGIES[]`,
`synergyActive(s)` (all `requires` researched), fully derived, no new state. Mapped the 4 seed concepts
onto real current research ids (the plan's old "T-number" placeholders don't correspond to anything in the
live tree): **Lightweight Cryotanks** (`balloon_tanks`+`cryo_upper`, +1% rel), **Radiation Hardening**
(`rad_shielding`+`redundant_avionics`+`radiation_countermeasures`, +1.5% rel) fold into the *same*
reliability accumulator as `familyRelBonus`/`doctrineRelMod` (existing 0.995 cap still bounds it — verified
both stack correctly). **Autonomous Landing** (`propulsive_landing`+`autonomous_navigation`) and **Rapid
Refurbishment** (`rapid_inspection`+`qa_program`) are the ≥2 real unlocks the plan called for: a new
uncrewed `precision_cargo` mission (Precision Cargo Delivery, reqDv 9400, payout 22, gated via new
`reqSynergy` field checked in `missionTechMet`) and a new `lic_refurb` passive contract (Fleet
Refurbishment Licensing, same gate in `passiveReqMet`). New Synergies strip (chips, active=✓/locked=○ with
a "needs: …" tooltip) prepended to the Research Divisions card. **Bug caught by the harness before ship:**
first draft had synergies carry a separate `unlock:` string compared against `reqSynergy` by *value*
inequality — `reqSynergy:'autonomous_landing'` (the synergy's own id) never matched `s.unlock ===
'precision_cargo'`, so both new unlocks would have been permanently unreachable. Fixed by having
`synergyUnlocked(id)` look up the synergy by its own `id` directly; dropped the redundant `unlock` field.
14/14 harness assertions after the fix (partial-requires stay inactive, multi-synergy stacking, the
gate-unlock progression, the caught bug's exact repro).

**P9 — Doctrine content drip.** One exclusive standing contract per doctrine (5 total, reusing
`PASSIVE_CONTRACT_DEFS` with a new `reqDoctrine` field checked in `passiveReqMet` — only signable while
that doctrine is declared; an already-signed one keeps running if you later switch, same as any other
req-gated contract, just not renewable) — scoped to *one* content type across all 5 doctrines rather than
"1-2 contracts/events/hires" mixed, to stay a true quick win. New `doct` category. Advisor surfacing: a
Command-tab alert badge fires once the active doctrine's exclusive contract is actually signable and not
yet signed. 5/5 harness assertions (locked when undeclared/mismatched, unlocks on match, re-locks on
switching away).

**P10 — Reward for flying risky.** All three sub-mechanics reuse existing state — no new persistence.
(1) **Schedule-pressure mandate premium**: `fulfillMandateIfMatch` now scales the bonus by urgency —
`1×` if flown the moment a mandate is accepted, ramping to `1+SCHEDULE_PRESSURE_MAX` (1.5×) flown right at
the deadline (`missionNetEconomics`'s preview updated to match). (2) **First-flight-of-design prestige**:
reuses the existing vehicle-family heritage tracking (`activeFamily().flights`, already `0` pre-increment
at the payout point) — a design's maiden flight pays `+10%` and `+2` rep, on top of (not instead of) the
existing routine/non-routine split; scoped to the clean-success branch only (tanker/partial branches
deliberately left alone). (3) **Insurance-premium contract**: new `SPECIAL_MODS` entry (`insurance`,
mult 1.6× — the highest of any special-contract mod) reusing the existing special-contract system
untouched; risk is flavor framing only, like every other mod in that pool — no mechanical risk
verification, a deliberate scope boundary flagged rather than half-built. 17/17 harness assertions
(schedule-pressure boundary math + monotonicity + zero-lead guard; first-of-design gating).

**No duplicate ids** verified across `MISSIONS`/`PASSIVE_CONTRACT_DEFS`/`SPECIAL_MODS`/`SYNERGIES` after
all four slices. **This closes out the entire P1-P10 ranked list bar P11** (the one remaining big swing —
a late-game crisis arc).

## Session — P11: one late-game crisis (2026-07-05)

The last item on the ranked list, and the only remaining "big swing." Confirmed the core shape with the
user before building (unlike the P7-P10 quick wins) since it's new persisted state + a real stakes
mechanic, not just a reskin/reweight — got a straight "build it as described."

**The crisis: a Kessler debris cascade in LEO.** Leverages exactly what the plan called for — P1's flight
model (missions already resolve through a real pipeline) and CE4's `eraStakesFrac()` (the same era-scaling
idiom as the bridge-loan mechanic). New `state.crisis` (active: `{phase,startAbs,severity,peakSeverity,
fundedUntilAbs}`), `state.crisisDone` (`{outcome,peakSeverity,months}` once resolved — this is a **one-time
arc**, not recurring), `state.leoFlights` (a new cumulative counter — the empire's own launch history is
what creates the hazard). **SAVE_VERSION 44→45**, but no explicit migrate function needed: all three fields
are read through `||`/falsy guards everywhere, so a legacy save is simply inactive/eligible-from-scratch.

**Trigger** (`crisisEligible`/`tickCrisisTrigger`, checked on the monthly tick): era ≥ Commercial (index 4)
AND `leoFlights` ≥ 40 (new `isLeoClassMission`: no profile, reqDv≥9000 — the same threshold the existing
`isOrbital` flag already uses), then a small monthly chance (2%) so it doesn't fire the instant you cross
the threshold. **Stakes**: while active, `isLeoClassMission` flights take a reliability penalty scaling
linearly with severity (0→12% at severity 1), folded into `effectiveReliability` alongside
`radRelPenalty`/`synergyRelBonus` — never a hard lockout, just a rising tax, as agreed. **Mitigation**:
`fundCrisisRemediation()` — a Debris Remediation Program, cost scaling with `eraStakesFrac()` like
`bailoutTerms()`, funds a 6-month term during which severity falls instead of rises. **Resolution**: two
paths, both "survived" per the confirmed design — `mitigated` (severity reaches 0, +8 rep/+6 support,
legacyScore +18) or `endured` (36 months elapse regardless of severity, +2 support, legacyScore +8) — never
a game-over. New `showCrisisModal()` (severity/tax readout + fund button), surfaced via a Command-tab
badge, a standing (eta-0) Outliner row while active, and a Chronicle stat line once resolved.

**Validation.** `node --check` OK. 21/21 headless assertions against the exact production functions (not a
reimplementation — copy-verified line-for-line against the live file): eligibility gating (era boundary,
exact-threshold and one-short cases), reliability penalty (zero when inactive, linear scaling, correctly
zero for both a `profile` mission and a sub-9000-reqDv mission even though the code checks two different
fields), the full escalate→fund→fall arithmetic, both resolution paths (mitigated via full remediation,
endured via the 36-month floor with zero funding), the legacyScore bonus split (18 vs 8), and fund-cost
scaling with era (never free, rises with `eraStakesFrac()`). Not yet browser-tested — this needs a save
artificially advanced to Commercial-era-plus-40-LEO-flights to see live, flagged for a manual pass like the
rest of this session's work. **This closes out the entire P1-P11 ranked improvement initiative.**

## Session — Isometric command-center layout redistribution (2026-07-04)

Player request (not part of the P-list initiative): the isometric Command/Cape view's buildings were unevenly
spaced and overlapping/blocking each other visually. Slice A of two: layout only, no animation yet.

- **Growth ceiling grounded, not guessed.** `PROD_MAX_LEVEL=5` (`:1273`) caps `prodLevel('pads')` at 5 → max
  4 extra pads; ops facilities are 3 boolean flags (`leoOps/lunarOps/marsOps`) → max 3 ops buildings. Designed
  the full 9-base + 4-pads + 3-ops = 16-footprint max-growth state, not just the default view.
- **`ISO_BUILDINGS` (`:10134-10143`)** recoordinated into a logical campus: industrial back row (R&D · mfg ·
  prod), admin/command mid row (personnel · mission · infra), dome + main pad front, rivals isolated far-right.
  Only `gx,gy` changed — footprint/height/type/tint untouched.
- **Extra-pad formula (`:10520`)** was marching left into other buildings' footprints as pad count grew — the
  core overlap bug. Now a coastal launch row alongside the main pad, with an undefined-guard replacing the old
  `gx<2` break.
- **Ops formula (`:10525`)** was self-overlapping at its old `0.1/0.9` spacing; now a clean front-centre diagonal.
- `ISO_SPREAD` (1.7), `ISO_AV` (2.85), and shoreline/water/decor literals left untouched — new layout still fits
  inside the existing gx≤7.5 grass boundary, nothing stranded or underwater.
- Hotspot-derivation math (`isoLayout()`, `:10155`) and the depth-sort z-order (`:10546`) are byte-for-byte
  unchanged — this was a coordinates-only change.

**Validation.** `node --check` OK. Headless geometry check against the actual edited table + formulas at max
growth: **0 footprint overlaps, 0 hotspot overlaps, 0 off-canvas** (baseline was 8 overlaps + 4). No fake
assertions for subjective layout quality — that was a manual visual pass, user-approved. Next: **Slice B** —
launch-pad liftoff animation (rocket leaves the pad on the isometric view) with a camera zoom-chase, then
handoff into the existing full-screen ascent/flight overlay; auto-switches to the Command tab if Launch is
triggered from the mission panel.

### Slice B — launch-pad liftoff, zoom-chase, ascent handoff ✅ (2026-07-04)

New `playLiftoff(spec, next)` (~2.4s, `LIFTOFF_DUR`): on launch (animated + non-deferred flights only), the pad
rocket rises (`drawIsoPad` offsets the sprite + draws a plume via the existing smoke emitter) while the camera
zooms to ~2.15× and pans to track it; auto-switches to the Command tab first if Launch was triggered from the
mission panel; click-to-skip cuts straight through. Manual `capeZoom`/pan state is snapshotted and restored
after, so the player's view isn't left stuck zoomed in. Hands off into the existing `playMission`/`#animOverlay`
ascent renderer completely unchanged. `animEnabled=false` (headless) path is fully bypassed — byte-identical.

**Playtest fixes (same session):** the rise/camera motion was on an ease-in-out curve (reads as fast-then-slow —
wrong for a rocket); switched to `easeInQuad` (near-zero initial velocity, then accelerating; chosen over cubic,
which stalls too long in a 2.4s window). The ascent scene previously always opened at `virtT=0` (rocket on the
pad, tower attached) — added an optional `seedP` threaded `playLiftoff→next(seedP)→playMission→setupFlightState`,
computed from the eased liftoff progress at handoff (~0.12 of ascent duration on a natural completion,
proportionally less on an early skip) via new `LIFTOFF_SEED_P=0.12` — so the cut lands mid-climb (tower
retracted, ground receding) instead of resetting to the pad. Default/no-seed callers (deferred-arrival path,
disabled Phaser flight setup) are unaffected — `seedP` defaults to 0, today's exact behavior.

**Validation.** `node --check` OK on every pass. Seed math verified numerically (default→0, full liftoff→0.12,
proportional on skip). Motion feel and cut-continuity are inherently visual — manual browser pass, user-approved
after one tuning round. Not headlessly fakeable and not faked.

**Pop-out parity fix (same session, 2026-07-04).** The CC pop-out (`openCCPopout`, ~:12370) already showed the
rocket rise/plume — it renders through the same `drawCape()` — but the zoom-chase drove only the normal view's
`capeZoom`/`capePanX`/`capePanY`, and click-to-skip was only wired to the normal view's DOM node. Fixed in
priority order (skip listener first, per user request): (1) a pointerdown/up skip handler on `#ccPopStage` with
a <6px movement threshold so a pan-drag release doesn't falsely skip, attached/detached live each tick as the
pop-out opens/closes (`syncPopSkip()`); (2) the camera drive now branches on `ccPopoutOpen` each tick, targeting
`ccPop.{z,x,y}` with the pop-out's own fit/scale math (mirrors `ccPopLoop`'s blit) instead of the normal view's
camera when the pop-out is active, snapshotting/restoring only whichever surface was actually driven — handles
toggling the pop-out mid-liftoff without corrupting either camera. Headless: `node --check` OK; a stubbed-DOM
run of the real `playLiftoff` confirmed both branches (pop-out open vs. closed) touch only their own camera
object and restore correctly. Pop-out chase feel is visual, unverified by the agent — user directed commit
without a manual pass this round.

**Pop-out as launch default (2026-07-05).** Every animated launch now opens the CC pop-out automatically —
`openCCPopout()` called at the top of `playLiftoff` (after the no-pad early-out), `closeCCPopout()` called in
`finishSeq()` right after the camera-state restore, before handoff to the ascent overlay. The existing
`state.tab='command'` switch is untouched, so closing the pop-out later still lands on the Command tab.
Idempotency (`openCCPopout`/`closeCCPopout` both early-return if already in the target state) and the
`animEnabled=false` headless path are both unaffected. Headless: `node --check` OK; stubbed-DOM run of the real
`playLiftoff` — 10/10 assertions pass (pop-out opens exactly once regardless of launch origin tab, closes
exactly once at handoff, headless path untouched). First slice of a broader ask: also unify the vehicle's
rendered size across the Cape pad, ascent, and orbit/trajectory scenes (next), and add wheel-zoom to the
ascent/trajectory/orbit scenes, which currently have none.

**Vehicle-size unification, slice 1 — ascent scene (2026-07-05).** New shared constant `VEH_BASE_PX_PER_UNIT =
0.40` (module scope, right after `buildVehicleShape`) — literally equal to the pad's existing `PAD_ROCKET_K`.
Ascent scene's vehicle-size formula changed from an independent `25+totalH*0.95` fit-to-frame heuristic to
`clampA(shape.totalH*VEH_BASE_PX_PER_UNIT, 50, 190)`. No conversion factor was needed: pad and ascent both
already read the same `shape.totalH` from `buildVehicleShape()`. The `50/190` safety clamp is unchanged (50 =
readability floor for tiny early rockets, 190 = anti-overflow cap for heavy multi-stage vehicles) per user
decision to keep per-scene clamps rather than rework camera framing. `drawIsoPad`'s own sizing code is
byte-identical/untouched — it remains the reference. Headless: `node --check` OK; numeric check — a mid-size
vehicle renders at the exact same pixel height on both pad and ascent (86.88px, 0 diff, unclamped regime); a
heavy 4-stage vehicle correctly clamps to the ascent's 190px max rather than matching the pad's larger
gantry-clamped size. Next: **slice 2** — orbit/trajectory `craftSprite` (currently a fixed ~26px silhouette),
scale up toward the shared base with its own cap (per user decision), then wheel-zoom for ascent/trajectory/
orbit (new scope, approved).

**Vehicle-size unification, slice 2 — orbit/trajectory `craftSprite` (2026-07-05).** Replaced the flat
`clampA(26/totalH, 0.06, 0.5)` silhouette with `clampA(shape.totalH*VEH_BASE_PX_PER_UNIT, CRAFT_SPRITE_MIN_PX,
CRAFT_SPRITE_MAX_PX)` — same shared-base source as the pad/ascent, capped separately for orbit-view readability.
New tunable constants (flagged like `LIFTOFF_SEED_P`): `CRAFT_SPRITE_MAX_PX=46`, `CRAFT_SPRITE_MIN_PX=18`. Cap
chosen from real on-screen reference sizes: Earth disc 60px, Moon disc 26px, orbit corridor 68px — 46px keeps
heavy vehicles clearly bigger than the old flat 26px without dominating planets/orbits. Size driver is the
vehicle's **full** `totalH` (all stages), not just the small upper-stage/transfer silhouette actually drawn in
this scene — otherwise heavier rockets wouldn't read as bigger at all; the drawn silhouette scales up
proportionally as a result (a deliberate "sprite size = vehicle class" choice). Zero diff to the pad or ascent
formulas. Headless: `node --check` OK; small/mid/heavy test vehicles render 18/35.7/46px vs. the old flat 26px
for all three — floor, ramp, and cap all confirmed. Cap value is a manual in-browser judgment call, easy to
retune. Next: **slice 3** — wheel-zoom on the ascent/trajectory/orbit scenes (new capability, none exists there
today).

**Vehicle-size unification, slice 3 — flight-overlay wheel-zoom (2026-07-05).** Added manual pan/zoom to the
full-screen flight overlay (`#animOverlay`, ascent → trajectory → orbit phases), which had none before. Couldn't
reuse the pop-out's blit-based `initCanvasPopZoom` (the overlay draws straight to an on-screen canvas, no
offscreen source to blit) — instead mirrored the Cape view's CSS-transform pattern: canvases wrapped in a new
`#flightZoom` div, `flightCam` state (`initFlightZoom`/`applyFlightZoom`/`resetFlightZoom`/`flightClampPan`),
drag-pan + wheel-zoom-toward-cursor + dblclick-reset, 1–3× range. Camera state persists across phase
transitions (the canvas is continuously redrawn, never torn down) and resets only when a fresh flight opens
(`playMission`). A capture-phase click-swallow (after a >6px pan) prevents panning from firing the overlay's
existing post-flight "Continue ▸" click handler; the liftoff's own skip-listener lives on a separate element,
no conflict. `animEnabled=false` path fully bypasses `playMission`, unaffected. Headless: `node --check` OK;
zoom-toward-cursor math, pan clamping, range bounds, cross-phase persistence, and fresh-open reset all verified
by simulation. Feel of zooming mid-animation is inherently visual — not machine-checked. **This closes out the
vehicle-size-unification initiative** (shared base scale across pad/ascent/orbit + zoom everywhere).

## Session — CC pop-out functional parity with the normal Command Center view (2026-07-05)

Player request: the CC pop-out (`⤢ Pop out` on Command Center) showed the Cape scene visually but had none of
the normal view's clickable building hotspots (live status glyphs, labels, click-to-drill-in) — its info panel
even claimed "click a building… to drill in," which didn't actually work. Two-slice plan (tech-lead): refactor
the pop-out's zoom architecture first, then add the real hotspot layer, closing the pop-out before any
drill-in action (matching the existing `earthGoToCape()` precedent) since drill-in modals render at a lower
z-index than the pop-out's scrim and would otherwise open invisibly behind it.

### Slice 1 — pop-out transform-wrapper refactor ✅ (2026-07-05)

Replaced the pop-out's manual offscreen-canvas-blit-with-JS-math zoom (`fit`/`dw`/`dh`/`ctx.drawImage`) with the
same CSS-transform-wrapper pattern used by the Cape view and the just-shipped flight-overlay zoom: `drawCape()`
now renders straight onto the visible `#ccPopCanvas` at native `CAPE_W×CAPE_H`; new DOM nesting `#ccPopFit`
(letterbox-fit reference box, resized each frame) → `#ccPopZoom` (the `translate/scale` transform target,
where hotspots will live as % children in slice 2) → `#ccPopCanvas`. New `applyCcPopZoom`/`ccPopClampPan`/
`ccPopFitBox`/`initCcPopZoom` replace the old blit loop and `initCanvasPopZoom` wiring. The launch-liftoff
camera-chase math targeting `ccPop.{z,x,y}` was re-derived for the new semantics and **simplified** to the
byte-for-byte same form as the normal view's equivalent branch, once the letterbox fit is baked into the
reference box. Two small deliberate deviations: zoom-out floor raised 0.5×→1× (avoids a corner-shrink artifact
with `transform-origin:0 0`); liftoff's vertical framing reference shifted by a sub-percent amount in
letterboxed cases only (imperceptible). Headless: `node --check` OK; numeric parity — pop-out and normal-view
liftoff targets place the rocket at the identical screen fraction (0.500, 0.420) at multiple zoom levels;
wheel-zoom cursor-anchoring, range clamp, and pan clamp all verified. Skip-listener unaffected. Zoom *feel*
needs a manual browser pass. Next: **slice 2** — the actual `ccSpotsHTML()` shared hotspot layer + close-then-
act clicks + live glyph refresh.

### Slice 2 — shared hotspot layer + close-then-act clicks ✅ (2026-07-05)

Extracted `ccSpotsHTML()` from `renderCCCenter()`'s inline hotspot-building logic — now the single source for
both views (`renderCCCenter()` calls it for `#ccSpots`; the pop-out calls it for `#ccPopSpots`, a new sibling of
`#ccPopCanvas` inside `#ccPopZoom` from slice 1, so hotspots inherit the transform for free). Pop-out clicks are
handled via **one capture-phase delegated listener** on `#ccPopSpots` — resolves the clicked `.ccspot`, and if
it has a compiled `onclick`, stops propagation, calls `closeCCPopout()`, then invokes the original action —
rather than a second HTML variant; the normal view's inline `onclick`s are completely untouched. Live status
glyphs refresh every 30 frames (~2×/sec) inside the existing `ccPopLoop`, since glyphs only change on
game-turn boundaries, not every animation frame. A capture-phase drag-swallow click listener (mirroring
`initCapeZoom`'s `moved>6` pattern) keeps panning-that-starts-on-a-hotspot from misfiring its click.
**Known pre-existing gap, left alone deliberately:** the pop-out's side status board (`ccPopInfo`) still shows
its open-time snapshot rather than refreshing live like the new hotspot glyphs now do — flagged, not fixed, to
stay surgical to this slice's scope. Headless: `node --check` OK; confirmed exactly one hotspot-HTML-building
function used by both views (no duplicated building list); simulated click trace confirms close-then-act
ordering, drag-swallow, and planned-spot no-op. Visual placement/tracking/tooltip readability needs a manual
browser pass. **This closes out the CC pop-out functional-parity initiative.**

## Session — Suborbital/orbital failure-narration mismatch (2026-07-05)

Prompted by a user report that mission failure text could reference orbit/deep-space framing on flights that
never get there. Two bugs found in `resolveFlight`/`subsystemFragilities`, both from the same root cause: a
few pieces of the #16 failure model applied orbit- or deep-space-flavored outcomes unconditionally, without
checking whether the mission actually reaches orbital velocity.

**Bug 1 — wrong-orbit story on suborbital flights.** The avionics `partial`-severity failure always narrated
"the payload reached space but in the wrong orbit," even for Sounding Rocket / Reach Space / High-Altitude
Science / Reentry Test / First Astronaut — none of which reach orbital velocity (reqDv well under ~9,400 m/s).
**Fixed** with a new `missionReachesOrbit(m)` helper (`!!m.profile || (m.reqDv||0)>=9000`, matching the
existing `isOrbital` convention) — suborbital flights now get "...well off the planned trajectory" instead.

**Bug 2 — deep-space strand on a 15-minute hop.** `life_support`'s fragility weight carried a floor
(`Math.max(0.3,stress)`) regardless of mission duration and was hardcoded to `phase:'deep'`/`severity:'deep'`,
so **First Astronaut** (crew:1, days:0.2, no profile) could roll a life-support failure that resolved as a
`strand` — "a life-support failure on the long coast home," full rescue-mission mechanic — on a suborbital
ballistic arc lasting minutes. **Fixed**: for missions where `missionReachesOrbit(m)` is false, the floor is
dropped (risk now scales purely with actual `m.days`) and the entry is pushed as an ordinary `phase:'ascent'`,
`severity:'loss'` fragility instead, with a new `storyMap.life_support` line ("a cabin environmental-control
fault surfaced during the brief flight."). Checked every `MISSIONS` entry: First Astronaut is the *only*
crewed, non-profile mission with `reqDv<9000`, so this is provably balance-neutral for every other
crewed mission (crew_orbit/multi_day/endurance/luna_*/mars_*/jupiter_*/belt_mining/astrobiology all still
hit the pre-existing floor/deep/strand path unchanged).

**Known residual, left alone deliberately:** the pre-flight phase-breakdown UI (`SUBSYS_PHASE` static
key→phase map used by `flightPhaseBreakdown`/live-call eligibility) still buckets `life_support` under
"Deep space" regardless of mission, since that map is keyed by subsystem only, not by mission — a cosmetic
label mismatch only, not reachable by First Astronaut's actual failure resolution or by the reserve-margin/
10-day-leak mechanics (neither applies to it). Headless: `node --check` OK; traced `missionReachesOrbit`
against every mission definition by hand to confirm the isolation claim above.

## Session — Time hotkeys, featured research/build progress, tracked Launch (2026-07-05)

Three player requests. First two are additive/cosmetic; the third is a genuine behavior change to the
single most central function in the game (`launch()`), confirmed with the user in two rounds before
touching it (which flow, then the exact commit/concurrency semantics) since it isn't balance-neutral like
almost everything else this session.

**F1/F2/F3 time hotkeys.** New keydown listener calls the same `clickTimeArrow('day'|'week'|'month')` the
▸/▸▸/▸▸▸ buttons already use — so double-tapping F2 auto-runs at 1/week/sec exactly like double-clicking
does, and the running-arrow highlight comes along for free. Guarded like the existing scene-nav listener
(no modal open, not typing, not mid-animation). Caveat: some browsers/OSes reserve F1 for their own help
system and never deliver the keydown to the page — F2/F3 should be reliable, F1 is best-effort.

**Featured Active Research + Build/Launch progress.** New always-visible `#ccProgress` card on the Command
Center (`renderCCProgress()`, called from `renderCommandCenter()`), pulled out of `execOverview`'s cramped
one-line "Active R&D: …" mention (left untouched, harmless duplication). Shows the active research
project's own name + progress bar + time left, and — the more interesting half, see below — every
build/launch campaign in progress with its own bar + ETA, plus any hangar-ready vehicle with a one-click
Fly button.

**Direct Launch now builds as a tracked, real-time campaign instead of one instant jump.** Investigation
found the game already had a second build path — "Queue this build" (Assembly Bays) — that already ticks
down over real turns with a progress bar, landing in a hangar for a manual Fly click; it just wasn't what
the *primary* Launch button did. Rather than build a parallel tracking system, `launch(prebuilt)` now
routes a fresh (non-prebuilt) commit on a non-`window` mission straight into `queueBuild(true)` — the exact
same machinery "Queue this build" already used and this project already trusted. Confirmed with the user:
manual Fly click when the build completes (not auto-fly), and concurrent builds allowed (already inherent
to the queue's existing Assembly-Bays FIFO slotting — no extra work needed there).
- **`queueBuild(committed)`** gained a flag purely for clearer log text (`"Launch committed: …"` vs
  `"Manufacturing — queued …"`) — mechanically identical either way.
- **`queueSpecSnapshot()`/`loadOrderSpec()`** extended to carry `testLevel`/`rehearsal` — load-bearing now
  that Launch goes through this snapshot: the test-campaign/rehearsal choice made at commit time must
  survive to the later Fly click even if the player changes the Bench's live toggles for a different
  design while this one is mid-build. A legacy queued order (pre-this-session, missing these fields)
  degrades safely — falsy-guarded, doesn't stomp the live value.
- **Window missions excluded on purpose** (`mars_flyby`/`mars_orbit`/`astrobiology`): their build/test
  time must land exactly on the committed transfer-window date, which the generic queue has no notion of
  — confirmed this was the *original* design intent too (`canQueue`'s own comment already said "minus
  window/test/weather, which are resolved at launch"). They keep today's exact single-jump behavior,
  unchanged.
- **Queue-full guard added**: committing a launch when the manufacturing queue is already at `QUEUE_MAX`
  now logs a clear message instead of silently no-op-ing (a real edge case `canLaunch` can't see, since it
  has no queue-capacity awareness — `canQueue` does).
- **Scope boundaries, left alone deliberately (matches pre-existing behavior of "Queue this build",
  not a new gap this session introduced):** crew assignment isn't reserved for a build in progress — the
  player could reassign the same astronaut elsewhere mid-build, same as today's plain queue path; the
  post-build test-campaign/rehearsal/weather step (usually ≤3 months) still resolves in one instant jump
  the moment "Fly" is clicked, same as today's hangar flow — only the (usually larger) build-months
  portion is now trackable.
- **No SAVE_VERSION bump**: no old-save migration needed — the new `committed`/`testLevel`/`rehearsal`
  order fields are all read through falsy/existence guards, so a pre-existing queued order or a legacy
  save simply behaves as it always has.

**Validation.** `node --check` OK. 10/10 headless assertions against the exact production branch logic
(copy-verified, not reimplemented): non-window direct launch commits via `queueBuild(true)`; a window
mission and a `prebuilt=true` hangar-Fly call both still take the untouched old path; the queue-full guard
logs instead of silently failing; the testLevel/rehearsal snapshot round-trip survives an intervening live
Bench change; a legacy snapshot missing the new fields doesn't corrupt live state. Not yet browser-tested —
this is the biggest-risk change of the day (core launch flow) and needs a real playthrough before trusting
it fully, flagged same as the rest of this session's UI-heavy work.

## Session — #29: Filtered Flight & Ops log timeline (2026-07-05)

The always-visible `#opsTimeline` strip (shipped 2026-06-27) already had the date chip + UPCOMING items +
reverse-chron log; this closes the two things left open under #29: category filters and a collapse toggle.
Per-entry icons were the third ask — added as a side effect of building the filter (an entry needs a
category to filter by; showing that category's icon on the chip itself was free once computed).

- **New `logCategory(e)`** — coarse topic bucket (`launch`/`research`/`economy`/`rivals`/`crew`/`infra`/
  `other`) from `e.kind` + text-sniffing, same precision/spirit as the existing `logNav()` (which already
  infers a *navigation target* from log text) — not exhaustive, good enough for a filter. Checked
  most-specific-first so overlapping substrings land right (e.g. a `SUCCESS` line that also says "Crew of
  2 home safe" is `launch`, not `crew` — personnel-specific terms like *hired/quit/commended/poached* are
  what actually mean `crew`).
- **`TL_CATEGORIES`/`TL_CAT_ICON`** — the exact 6 named in the plan (All/Launches/Research/Economy/Rivals/
  Crew/Infrastructure) plus an `other` icon for whatever a filter can't place.
- **New `#tlControls` row** above the timeline strip: a filter pill per category (click to select, `All` is
  default) + a collapse toggle (`▾ Hide log` / `▸ Show log`) that hides just the scrolling chip strip, not
  the whole top bar (that's the separate, pre-existing `toggleTopbar()`). Both the selected filter and the
  collapsed state persist in `localStorage` (`ov_tlFilter`/`ov_tlCollapsed`), same pattern as the existing
  theme/wide-mode prefs — not part of `state`, so it isn't saved into/loaded from a game save, and a
  corrupted/unknown stored value falls back safely to `All`/expanded.
- `upcomingEvents()`'s three synthetic entries (active R&D, in-progress build, committed window) got a
  `cat` field too, so switching to "Research" also shows the live R&D countdown, not just past log lines.
- The existing "slide in the newest chip" animation now also checks the entry is literally
  `state.log[0]` (not just "first in the filtered list") — otherwise switching to a filter that excludes
  the actual newest entry would incorrectly animate an old one that happens to be first under that filter.

**Validation.** `node --check` OK. 21/21 headless assertions running `logCategory` **extracted directly
from the live file** (not a reimplementation) against 18 real message strings sampled from actual `log()`
call sites across the codebase (placeholders resolved to plausible values), one full pass per category
plus a deliberate `other` fallback case — all landed correctly. localStorage restore logic separately
verified against null/valid/garbage inputs (falls back to `all` safely in every non-valid case). Not yet
browser-tested — filter-pill layout/spacing in the topbar and the categorization's real-world accuracy
against actual gameplay logs both need a look, flagged like the rest of this session's UI-heavy work.
**Closes out #29.**

## Session — Finances pop-out: detailed current/past/future cash flow (2026-07-05)

User request: a "💰 Finances" entry point (added to the "This month" card on the Command Center's right
rail, next to the existing 📖 Chronicle button) opening a detailed pop-out — current breakdown, recent
transactions, a past trend, and a future projection, green for positive/red for negative throughout.

**Current.** `financesBreakdown()` itemizes revenue (facility income, Belt royalty, gov funding, passive
contracts) and expenses (base overhead, market/event surcharge, production upkeep, empire opex, bridge-loan
interest, partnership upkeep, payroll) — reusing the exact same functions `commandSummary()`/
`state.lastMonth` already call, just un-summed, so nothing here can drift out of sync with numbers shown
elsewhere. Near-zero items (<$1k/mo) are filtered so an inactive line (e.g. no royalty yet) doesn't clutter
the list.

**Recent transactions.** No formal transaction ledger exists in this codebase (~47 separate `state.money`
call sites — instrumenting all of them for a proper ledger was judged too invasive for this pass). Instead,
new `tlMoneyAmount()` pulls the dollar amount straight out of a log line's own already-`fM()`-formatted text
(e.g. "+$12.00M") — same heuristic-text-sniffing spirit as #29's `logCategory()`. `recentCashEvents()` scans
`state.log` (already newest-first, capped at 40 total entries across all categories) for the first parseable
$ amount per line. Best-effort, not a formal ledger — flagged as such in the code comment.

**Past.** `defaultMetricHist()`/`pushMetricHistory()` gained three new series (`revenue`/`expenses`/`net`,
alongside the existing money/rep/support/success/science), snapshotting `state.lastMonth` each month at the
same 24-month cap. New `netFlowBarsSVG()` — a genuine diverging bar chart around a zero baseline (green
bars above, red below), distinct from the existing `sparklineSVG` (a single line, one trend color for the
whole series) since monthly net can cross zero month to month. No SAVE_VERSION bump: `pushMetricHistory`'s
existing `push()` helper already guards `if(!Array.isArray(h[key]))`, so a legacy save's `metricHist` missing
these three keys just starts tracking them from the next tick — no migration needed.

**Future.** `financeProjections()` — a linear projection at the current recurring net rate (money now + net
× 6/12 months) when net is non-negative, or the existing `runwayMonths()` figure when it's burning down;
plus a short "known upcoming" list derived from state already present (an accepted mandate's bonus + due
date, any passive contract expiring within 3 months and the income that lapses with it, an open special
contract's bonus + deadline). Not a full future simulator — deliberately scoped to what's already knowable
from existing state, not a probabilistic forecast of research/mission outcomes.

**Validation.** `node --check` OK. 22/22 headless assertions run the actual `financesBreakdown`/
`tlMoneyAmount`/`recentCashEvents`/`financeProjections`/`netFlowBarsSVG` functions **extracted directly from
the live file** (not reimplementations) against stubbed inputs: revenue/expense sums match exactly and
near-zero items are filtered; dollar-amount parsing handles +/−/unicode-minus and correctly returns `null`
on non-financial log lines (including a deliberate false-positive check against "40%" in a scoop message);
recent-events ordering; both projection branches (positive-net horizon math vs. negative-net runway text);
all three upcoming-deltas sources (mandate/expiring contract/special contract) surface with correct
amounts; the bar chart never throws on an empty series and always draws its zero line. Not yet
browser-tested — the two-column layout, chart legibility, and log-mining accuracy against a real
multi-hour save all need a look, flagged like the rest of this session's UI-heavy work.

## Session — I5: research queue, depth 1 (2026-07-05)

First item picked off the second design-pass backlog. Scoped to Fable's "90% win": a single "next" slot,
not a multi-item reorderable queue — avoids the lab idling silently when a project completes mid-skip,
without the UI complexity of managing an ordered list.

New `state.researchNext` (nullable id). **Queueing a currently-*locked* node is allowed on purpose** — the
common case is mid-project, already knowing the next step in a prereq chain that isn't unlocked yet; real
eligibility is checked for real at start time, not at queue time, so this can't soft-lock anything.
`queueResearchNext(id)`/`clearResearchNext()` just set/clear the pick (no cost, no gate check — it's a
bookmark). `tryStartQueuedResearch()` is the one function that actually starts it: no-ops while a project
is still active; if the queued node no longer resolves (id vanished) or is already researched (e.g.
backfilled by `reconcileResearch()`), it's dropped silently; otherwise it stays queued — untouched — until
prereqs + science gate + affordability are *all* met, at which point it deducts cost exactly like a manual
`buyResearch()` (refactored the shared "actually start it" mutation into `startResearchProject(r, viaQueue)`
so the two paths can never drift apart) and clears the queue. Called from two places: right after
`completeResearch()` (the immediate happy path — already affordable the moment the prior project finishes)
and once every monthly tick (the deferred path — becomes affordable/unlocked later, without the player
needing to babysit it).

**UI:** `renderTechAction()` — when a project is already active and the selected tree node isn't done/active,
the disabled "Another project in progress" button is replaced with "📋 Queue next" (or "📋 Queued next",
disabled, if this node is already the pick). A dashed "Next up: X — auto-starts once..." row appears
whenever a pick exists, with its own ✕ Clear, regardless of which node is currently selected in the tree.
The `#ccProgress` Command Center card (shipped earlier today) also gets a small "📋 Next: X" line under the
active-research bar. No SAVE_VERSION bump — `researchNext` is a plain nullable scalar, safe under any
falsy-check, so a legacy save simply starts with no pick queued.

**Validation.** `node --check` OK. 17/17 headless assertions run the actual `queueResearchNext`/
`clearResearchNext`/`tryStartQueuedResearch`/`startResearchProject`/`buyResearch` functions **extracted
directly from the live file**: queueing guards (can't queue the active node or an already-researched one);
the three "stays queued, doesn't clear" cases (insufficient money, prereqs not met, science gate not met);
the three "clears without starting" cases (a stale/vanished id, an already-researched pick); the happy path
(cost + science both deducted correctly, log line distinguishes auto-start from manual buy); and a
regression check that `buyResearch()` itself is byte-identical in behavior after the shared-mutation
refactor. Not yet browser-tested — the new UI row's layout/wording needs a look, same as the rest of this
session's work.

## Session — I1: the content horizon (2026-07-05)

The big one off the second-pass backlog. Confirmed the finding first (missions really do stop at
`jupiter_orbit`; `BODIES` really does define Saturn through the Oort Cloud with nothing flyable) before
building — most of what was needed turned out to already be half-authored: `precision_edl` and
`fusion_propulsion_research` were research nodes whose own descriptions ("the drive every other transfer
stage has been building toward," "the most-studied path to true interstellar precursor missions") were
explicitly foreshadowing missions that were never built. This landed almost entirely as data — no new
architecture, no new subsystem, reusing the generic `profile`/lander/ISRU-free-leg machinery every existing
deep-space mission already runs on.

**Mars Landing** (`mars_landing`) — gated on `precision_edl` (already existed, `reqMissionDone:'mars_flyby'`,
zero mechanical effect until now). Descent reuses `mars_orbit`'s implied 1000 dv surface leg (mostly
aerodynamic); **ascent is 4100 dv — more than double the Moon's 1730** — Mars's thin atmosphere still
cushions the way down but gives no lift on the way back up, unlike the Moon's roughly-symmetric profile.
Added an `ISRU_FREE_LEG` entry pointing `mars_isru` at the *ascent* leg rather than TEI (mars_orbit's
mapping) — Sabatier ISRU's classic real-world application is fueling the ascent vehicle, not the return
cruise. Ares Program extended to include it (reward bumped 60/130→100/190 for the 3rd, much harder
objective); the Red Planet ambition's capstone raised from `mars_orbit` to `mars_landing` — landing, not
just orbiting, is the actual "hardest thing anyone has ever attempted."

**Saturn/Titan pair** (`saturn_orbit`, `titan_landing`) — `BODIES.saturn`/`titan` had full Δv legs and rich
flavor text ("you can aerobrake here, and almost fly") but no `missions` array at all. Gated on
`nuclear_electric` (a sibling of Jupiter's `rad_shielding` off the same `nuclear_thermal` prereq — no
soft-lock, and its own description already says it "makes the deep outer system reachable"). Titan's ascent
(1500 dv) is deliberately far cheaper than Mars's (4100) — thick atmosphere + a seventh of Earth's gravity
make it the gentlest departure of any landing in the game, a direct contrast the flavor text leans into.
New **Cronian Frontier** program (`saturn_orbit`+`titan_landing`) and **The Methane Shore** ambition
(capstone `titan_landing`). Retired stale "capstone"/"furthest humans have ever gone" wording from
`jupiter_orbit`'s and the Jovian Frontier ambition's blurbs now that something sits beyond them.

**Interstellar precursor** (`oort_precursor`) — the true endgame capstone, gated on
`fusion_propulsion_research` (itself gated behind `jupiter_orbit` completion). Uncrewed, one-way, science-
flagged (Voyager precedent: "the point is the burn, not the destination"). `BODIES.oort` went from `legs:[]`
("schematic ring only") to a real illustrative leg. New **Daedalus Program** and **First Light, First Star**
ambition — the last program/ambition on their respective lists.

**Second scoring bookend (I2) not attempted this round** — scoped as its own backlog item, left for later.

**Validation.** `node --check` OK. 137/137 headless assertions against the actual `MISSIONS`/`PROGRAMS`/
`AMBITIONS`/`BODIES`/`RESEARCH`/`ISRU_FREE_LEG` data **extracted directly from the live file**: no duplicate
ids anywhere; every new mission has a valid reqResearch gate resolving to a real node, a non-empty profile
with valid `by`/positive `dv` on every leg; both lander missions correctly declare `dropAfter` on their
descent/ascent legs; the Mars-vs-Titan ascent asymmetry holds (Mars >2× Titan); `oort_precursor` is
uncrewed/one-way/science-flagged; every `PROGRAMS`/`AMBITIONS`/`BODIES.missions` reference resolves to a
real mission id (including the 3 new/updated programs and 2 new ambitions); every ambition's capstone is
reachable by `ambitionProgress()`'s own PROGRAMS-walk; the `mars_landing` ISRU leg-name mapping matches its
own profile exactly; and the three new/reused research gates (`precision_edl`, `nuclear_electric`,
`fusion_propulsion_research`) have fully-resolving, non-circular prereq chains. Balance (payout/rep/minRep/
days scaling, whether the new late-game missions feel appropriately hard vs. rewarding) is inherently a
playtest call, not something a headless check can validate — flagged for Playtest Zero same as everything
else. No SAVE_VERSION bump (pure data — no new state shape, `programsAwarded`/`ambitionFulfilled` already
handle new ids generically).

## Session — I2 + I3: second scoring bookend, generalized crisis roster (2026-07-05)

**I2 — second scoring bookend.** New `SCORING_YEAR_2=2100` (the Speculative era opens), a fully independent
flag (`state.eraScored2`) alongside the original `state.eraScored` — both checked every `checkScoringDate()`
call, both can fire in the same call if a save somehow starts past both thresholds at once (currently
unreachable in normal play, but the harness covers it since it's cheap to). New `showChronicle('era2')`
mode: its own heading ("A new age dawns — 2100") and sub-text, shares the `'era'` mode's Continue/Retire
button branch rather than the plain-Close one. `legacyScore()` gained `fusionFlown` (has `oort_precursor`
been completed?) and a flat +20 bonus for it — the "deep-space dimensions" framing Fable asked for turned
out to already be covered by existing stats (worlds reached, facilities, the P11 crisis) once `fusionFlown`
filled the one actual gap. No new migration needed — `state.eraScored`'s own convention was already "no
explicit default anywhere, just read via a falsy check," so `eraScored2` follows the identical pattern.

**I3 — generalized crisis roster.** P11 shipped exactly one crisis (a debris cascade), explicitly a
one-time arc. This generalizes the same escalate/fund/resolve skeleton across a new `CRISES` config (3
entries, matching Fable's suggestion) instead of hardcoded debris-only logic:
- **Debris Cascade** (unchanged from P11) — LEO-reliability tax, gated on `leoFlights≥40` + Commercial era.
- **Solar Storm Season** (new) — deep-space-reliability tax (any `profile` mission), gated on a new
  `deepFlights≥15` counter (incremented alongside `leoFlights` at mission-success) + Expansion era.
- **Funding Collapse** (new) — a political/economic crisis with *no* mission-reliability effect at all;
  instead cuts `govMonthlyFunding()`'s earned grant by up to 50% (the difficulty-based funding floor is
  untouched — a funding cut hits discretionary support-based income, not the baseline safety net). Gated on
  era alone (Station & Shuttle+, no flight-count threshold) — the earliest-reachable, most political of the
  three.

Only one crisis is ever active at a time (unchanged from P11); after one resolves, the *same* type can't
immediately roll again next time (variety over a full game), but the game is no longer a one-shot — new
`state.crisisHistory[]` records every resolution. **Lazily backfilled from P11's original singular
`state.crisisDone`** the first time `crisisHistory()` is called (an old save's one already-resolved crisis
just becomes history entry #1) — no explicit migration function, no SAVE_VERSION bump. `legacyScore()`'s
crisis bonus now sums across the whole history instead of reading a single object. Effect dispatch is
data-driven: `crisisRelPenalty(m)` checks the active crisis's `effectKey` (`'leoRel'`/`'deepRel'`) against
the mission; `crisisGovFundingMult()` is 1 (no-op) unless the active crisis's `effectKey` is `'govFunding'`.
Fund cost, modal copy (title/description/effect label), and all three log lines (trigger/mitigated/endured)
are now per-crisis-type data rather than hardcoded strings — the 3 UI touchpoints that previously said
"Debris crisis" unconditionally (outliner row, Command-tab badge, `showCrisisModal`) now read the active
crisis's own name/icon.

**Validation.** `node --check` OK. I2: 26/26 headless assertions (fusion bonus math, both scoring-date
flags firing independently/together/in-sequence, `showChronicle`'s per-mode heading/button/stat-row
branching, the interstellar stat row appearing only once flown) — re-run and confirmed unaffected after I3
landed on top of it (since `legacyScore` now calls the new `crisisHistory()`). I3: 44/44 headless assertions
against the actual production functions **extracted directly from the live file**: era/threshold gating per
crisis type (including the flight-count-free `funding_collapse` case); only one crisis eligible at a time;
same-type-can't-immediately-repeat; the singular-to-array lazy backfill (and its idempotency); effect
dispatch correctly isolated per type (a LEO tax never leaks onto a deep mission and vice versa;
`funding_collapse` has zero mission-reliability effect; only `funding_collapse` ever touches the gov-funding
multiplier); per-crisis fund-cost scaling (different base cost per type, rising with era, `Infinity` with no
active crisis); the full escalate→fund→fall→resolve lifecycle generically across two different crisis
types (mitigated via `debris_cascade`, endured via `solar_storm`); and `showCrisisModal`/
`canFundCrisisRemediation` rendering/gating correctly for all 3 types without throwing. No SAVE_VERSION
bump for either slice.

## Session — I6: aerocapture as a real mechanic (2026-07-05)

Last open Improvement on the second-pass backlog. The `aerocapture` research node already existed (req
`precision_edl`) with `effect:{}` — a pure no-op, exactly like Fable found. Its sibling `gravity_assist_planning`
turned out to have the identical shape (`effect:{}`, mechanical effect hardcoded ad-hoc in `simulateMission`
instead of the generic effect-object system) — so this landed as a direct extension of an already-proven
pattern, not a new mechanism.

`simulateMission`'s `legDv(leg)` closure (the single point every leg's effective Δv already flows through,
for both the displayed capability numbers and the actual propellant-burn math) gained a second multiplier
alongside the existing `gaMult`: `aeroMult=state.research.aerocapture?0.3:1`, applied to any leg whose name
matches a new `AEROCAPTURE_LEG_RE` — `Mars Orbit Insertion`/`Jovian Orbit Insertion`/`Saturn System Capture`,
the three existing orbital-*capture* legs at genuinely atmosphere-bearing bodies (Mars, Jupiter, Saturn).
Deliberately excludes Ceres/Lunar insertions (airless — no atmosphere to skim) and the interplanetary
*injection* legs (gravity-assist's own job, a different real technique). **The two can legitimately stack**
— `Saturn System Capture` contains "Saturn" and is `by:'transfer'`, so it already matched
`gravity_assist_planning`'s own pre-existing regex too; a well-planned gravity-assisted approach genuinely
can also set up a cheaper aerocapture in reality, so this wasn't corrected, just confirmed intentional-enough
to leave alone. 70% cut chosen deliberately steeper than gravity-assist's 8% shave — aerocapture skips the
propulsive burn almost entirely, not just a trajectory optimization.

Added a `missionAerocaptureLeg(m)` helper (finds the matching leg in a given mission's own profile, or
`null`) and wired an "Aerocapture is online" mention into the mission-economics `.eq` info text, right
alongside the existing ISRU-online callout — same convention, same spot. Research node's own `desc` text
gained a concrete `<b>−70% Δv on Mars, Jovian and Saturn orbital-capture burns.</b>` callout (previously just
narrative, no number, matching what every OTHER research node with a real effect already states).

**Validation.** `node --check` OK. 18/18 headless assertions against `legDv`'s exact logic (copy-verified
line-for-line against the live file — extracting the whole `simulateMission` function wasn't practical
given how much game state it closes over) plus the real, directly-extracted `missionAerocaptureLeg`: no
discount with neither tech researched; aerocapture alone cuts exactly the 3 targeted legs by 70% and
nothing else (confirmed airless captures, transfer-injection legs, and the launch-vehicle leg all stay
untouched); gravity-assist alone only touches its own regex's legs; both researched stack correctly and
sequentially on `Saturn System Capture` while `Mars Orbit Insertion` (never in gravity-assist's own regex)
only gets aerocapture's cut; the helper correctly finds/misses the leg in realistic mission-shaped profiles
and doesn't throw on `null`/profile-less input. No SAVE_VERSION bump (no new state; `effect:{}` stays empty,
matching `gravity_assist_planning`'s own precedent for this exact class of ad-hoc research effect).

**This closes out every Improvement (I1–I6) on the second-pass backlog.** Remaining: the 7 Pruning
candidates and 6 Flow-polish items, including Fable's own top pick (Playtest Zero + merging the duplicate
Launch/Queue buttons + an auto-fly option).

## User-directed: unified flight pop-out overlay (2026-07-09, Slice A)

New top-level ask (not from the second-pass backlog above): launch → ascent → orbit → reentry should
play as **one continuous pop-out** instead of separate containers/modals. Plan agreed with the user,
sliced A–D; **A shipped this session**, B/C/D not started.

**Why this supersedes (for launches) the 2026-07-04/07-05 `playLiftoff`/pop-out-as-launch-default work
above, deliberately, not by accident:** that work made every animated launch open the CC pop-out, rise
the rocket on the isometric Cape view with a camera zoom-chase, then cut into the full-screen ascent
overlay. It was well-crafted (playtest-tuned easing, seed-continuity math so the cut lands mid-climb,
pop-out camera parity, skip-listener threshold tuning) — but it's still fundamentally **two containers
with a cut between them**, which is exactly what this new ask is against. User was shown both options —
(a) retire the iso liftoff and build a real pad phase inside the overlay itself, or (b) keep the iso
liftoff and make the cut a tuned crossfade — and chose **(a)**, explicitly, after the tradeoff was laid
out. `playLiftoff` and its supporting code (`_liftoff`/`_liftoffArmed`/`LIFTOFF_SEED_P`/the pop-out
camera-parity branch) are **left fully defined and working, just not called during a launch anymore** —
by explicit user instruction, in case it's wanted again later. The Cape pop-out itself is untouched as a
manual feature (the "⤢ Pop out" button still works anytime); only its automatic-open-on-launch behavior
is gone, because there's no longer a launch-time cut for it to smooth over.

**What Slice A actually built.** A real pad phase (`drawPad`, `PAD_PHASE_MS=3200`, `PAD_HOLD_FRAC=0.55`)
now plays first, on the flight overlay's own canvas — silent countdown hold, then an ignition ramp
(`A.ignite` 0→1, read by `drawAscent`'s flame/exhaust calc) with an engine-audio start timed to the
ramp's onset. `drawPad` calls `drawAscent(0, false)` directly — the pad IS ascent's own p=0 frame, not a
separate art asset — so the handoff at padDur is the literal same draw call on both sides, proven in test
(rocket X, altitude fraction, and ignite are frame-continuous across the seam; no crossfade needed there).
`drawScene` now runs the pad phase first, then shifts an `at = t - padDur` clock into the existing
ascent/cruise/reentry math unchanged. `finalizeLaunch`'s dispatch simplified to always `playMission(spec,
finish)` for animated launches (no more `_liftoffArmed` branch). A `spec.mode:'arrive'` flag skips the pad
entirely (`padDur=0`) — groundwork for Slice B's deferred-arrival replays, which never had a "launch" to
show in the first place.

**Free wins from landing after the 2026-07-05 work, not before:** the pad phase inherits the *shared*
`VEH_BASE_PX_PER_UNIT` vehicle scale (pad/ascent/orbit already render vehicles at one consistent pixel
size, per that session's unification work) and the overlay's own wheel-zoom/pan camera
(`initFlightZoom`/`resetFlightZoom`, called once per `playMission()`) — both automatically, since the pad
phase is just another phase on the same canvas with the same camera. No extra work needed to keep it
visually consistent with ascent/orbit.

**Validation.** `node --check` OK. New headless suite (34/34) — first suite in the project to actually
drive `animEnabled=true` rendering rather than staying on the headless fast path; required adding a
permissive fake canvas-2D-context + a fuller Web Audio API stub to the shared test harness (`prelude.js`),
now reusable for Slices B–D. Covers: pad phase is the entry state with `ignite=0`/engines cold; ignite
stays exactly 0 through the countdown hold, ramps 0→1 after it, engine-start SFX fires exactly once at
the ramp's onset; the pad→ascent seam is frame-continuous (rocket X/altFrac/ignite match on both sides);
a full pump-driven flight (real `animLoop`/`endAnim`, controlled virtual clock, not reimplemented phase
math) visits pad→ascent→orbit and ends correctly held on a successful orbital flight; `mode:'arrive'`
skips the pad and starts hot (`ignite=1`, engine already running); an ascent-phase failure still starts on
the pad and still fails correctly; a cislunar/deep flight reaches the cislunar phase without throwing;
`finalizeLaunch` never calls `playLiftoff` anymore and `_liftoffArmed` ends false; the headless
(`animEnabled=false`) dispatch path is confirmed to never create `animState` at all — genuinely
untouched, not just re-tested. Full gauntlet at pause: pad-A 34 + dept-A 42 + dept-B 27 + dept-C 30 +
materials 46 + regression 18 = **197/197.**

**One bug found and fixed during this slice** (not pre-existing, introduced then caught in-session):
without an explicit reset, `A.ignite` would drift to a near-but-not-exactly-1 value at the end of the pad
ramp (an easing-curve tail) and then sit there for the *entire rest of the flight*, permanently shaving a
fraction off the ascent flame size. Fixed with an explicit `A.ignite=1` the instant the pad phase ends —
caught by the handoff-continuity test, not by inspection.

**Aside, logged for hygiene:** an earlier attempt this session at fixing the unrelated
`pendingCelebration`/1990-scoring-date crash (see the "#19 Organizational scaling" session's flagged bug)
built a `pendingChronicle`/`drainPendingChronicle` deferral system, then discovered upstream had already
landed a simpler inline fix (`showChronicle('era')` directly in `checkScoringDate`, from the "I2: second
scoring bookend" work) in the same window. Discarded, never pushed. `test-chronicle.js` (which validated
the discarded version) is retired — renamed `.OBSOLETE` rather than deleted, in case its patterns are
useful reference, but it is **not** part of the active suite set and will fail if run (it references
functions that don't exist in this file, on purpose).

## User-directed: unified flight pop-out overlay (2026-07-09, Slice B)

**B shipped this session** (A shipped earlier the same day; C/D still not started). Slice B is the mirror of
Slice A's launch-time pad phase, at the other end of a deferred flight's launch-day session.

**The problem it fixes.** A deferred (≥`DEFER_CRUISE_DAYS`=60-day) interplanetary launch — `proceedLaunch`'s
`missionDays>=DEFER_CRUISE_DAYS` branch — registered the live flight, logged "departed — arrival in ~N mo",
and **returned with no animation at all**. The launch-day session for the biggest, most expensive flights in
the game just *cut to nothing*. (The mission's real, resolved-at-launch outcome still lands on ARRIVAL turns
later via `pumpFlightArrivals` — that's unchanged and out of scope here.)

**What Slice B actually built.** A "cruise begins / ETA" outro card, played on the flight overlay's own canvas
via a new `spec.mode:'depart'` flag — the deliberate mirror of Slice A's `'arrive'`. Where `'arrive'` *drops
the pad* (an arrival never had a launch), `'depart'` *keeps the pad but drops the orbit/cruise/reentry tail*
(a departure has a launch to show, but its outcome is a spoiler that belongs to the arrival). So a deferred
departure now plays **pad → ascent → cruise-begins card**, then holds for the player to dismiss. Threading:
`setupFlightState` gives depart mode its own `totalDur = padDur + ascentDur + DEPART_CARD_MS` (new const,
4200 ms) with no cruise/reentry; `drawScene`'s post-ascent `else` branch, right after the same one-time
context-reset + `captureHandoff('cruise')` the normal path uses, routes depart flights into the card with the
existing `beginHandoff`/`finishHandoff` crossfade (so the ascent→card seam eases exactly like ascent→orbit)
instead of `drawOrbit`/`drawCislunar`/`drawReentry`. `endAnim` holds a depart flight on the card (not on
`drawPostFlight`'s "ORBIT ACHIEVED" stats, which would be wrong for an unresolved departure). New
`drawDepartCard(ct, held)` renders it in the overlay's own language: deep-space `spaceBg`, a receding Earth
lower-left, the real `drawCraftSprite` coasting toward a destination pip along a dashed transfer line, and a
fade-in panel with DESTINATION / TRANSIT (days + ~months) / ARRIVAL (`dayToDate(arriveAbs)`) / CREW. Dispatch:
`proceedLaunch`'s deferred branch now builds a `buildDepartSpec(m,crewed,missionDays,rec.arriveAbs)` (mirrors
the `finalizeLaunch` flight spec — same vehicle geometry/livery/rng shape so pad+ascent render identically —
but always `success:true`/`failPhase:null`) and, **only when `animEnabled`**, plays it with the settle
(`_flightResolving=false; render(); pumpFlightArrivals()`) moved into the `done` callback; animation-off /
headless takes that settle synchronously — byte-identical to the old return. The held card reuses Slice A's
"Continue ▸" button + dismissal wiring, extracted from `drawPostFlight` into a shared `drawFlightContinueBtn`.

**Balance-neutral.** Purely presentational: no `SAVE_VERSION` touch (no new persisted state — the card exists
only during an active overlay session), no mechanics change. Short/non-deferred missions never reach
`buildDepartSpec` (guarded by `missionDays>=DEFER_CRUISE_DAYS`); animation-off is proven byte-identical.

**Validation.** `node --check` OK. New headless suite **`test-depart-b.js` (39/39)** — reuses Slice A's
`pumpFlight()` (real `animLoop`/`endAnim` on a controlled virtual clock) + the shared `harness.js` canvas/audio
stubs, no new harness needed. Covers: `buildDepartSpec` is always a clean success carrying transitDays/etaAbs/
destName/crew (uncrewed *and* crewed); a depart flight keeps the full pad (unlike `'arrive'`) and gets the
launch+card-only `totalDur`; a pump-driven departure visits pad→ascent→**depart** and provably **never** enters
orbit/cislunar/reentry/suborbital, ending *held* (not an abrupt cut, not auto-closed), `done()` withheld until
dismiss; dismiss settles + tears down; the hold draws the card, never `drawPostFlight`; the real `proceedLaunch`
dispatch on `belt_survey` (uncrewed, 780 d) builds the card + registers the deferred flight with anim ON, and
with anim OFF builds **no** card / creates **no** `animState` while still registering the flight; a short
(`first_sat`, 0 d) mission never builds a depart card. Full gauntlet at pause: regression 18 + materials 46 +
dept-a 42 + dept-b 27 + dept-c 30 + pad-a 34 + **depart-b 39** = **236/236.** No bugs surfaced this slice (the
`'arrive'` groundwork Slice A left in `setupFlightState` made the `'depart'` mirror land cleanly first try).

### Remaining — Slices C, D (not started)
- **Slice C** — bring the live-flight decision modals (abort/press-on, reserve, anomaly, rescue) into
  in-overlay mission-control panels instead of separate `showModal` calls; weather go/no-go becomes an
  overlay panel too (user confirmed) rather than staying a pre-flight modal. Existing `_pending*` guard
  state and `pumpFlightArrivals` gating stay exactly as-is — presentation-only change.
- **Slice D** — unified chrome/transition-timing polish pass across all phases (pad/ascent/cruise/
  reentry/decision panels), once B and C exist to polish.

## Session — E0.1 file split + concat build, slice (a) (2026-07-10)

**Slice (a) shipped: the mechanical split + build script + harness parity, zero behavior change.**
Slice (b) (hygiene the split makes cheap) deliberately untouched. `orbital-ventures.html` is no
longer hand-edited — it is now a **generated build artifact**; source lives in `src/`.

**What shipped.** The single 15,408-line inline `<script>` is now seven plain classic-script modules
in `src/`, loaded in order into one shared global scope: `data.js` (1–1396: ERAS/staff/DEPARTMENTS/
RIVALS/ENGINES/MISSIONS/RESEARCH/BODIES/DIFFICULTY + small helpers), `sim.js` (1397–6322: `state`,
`newGame`, `advance`, contracts/rivals/facilities/build-queue/materials, `simulateMission`,
`resolveFlight`), `save.js` (6323–6563: save/load/export-import/recap/startup), `shell.js` (6564–6939:
anim flags, wide mode, THEMES, fullscreen, keyboard listeners, WebAudio sfx), `flight.js` (6940–9776:
WebGL-2D compat layer + flight overlay + FlightScene + drawScene/reentry), `render.js` (9777–15399:
`render()`, iso Cape/Veh/Map/Station Phaser scenes, STATION_MODULES, popouts, tech tree, timeline),
`main.js` (15400–15408: the `newGame(); render(); applyWide(); applyTheme(); showStartup();`
bootstrap). Line numbers are extracted-script-local (HTML line = +755).

**Build.** `build.js` (repo root, plain Node, zero deps): a single `MODULES` array is the order source
of truth; `src/shell.html` is the page template with the whole `<script>` block replaced by an
`<!-- OV:SCRIPTS -->` placeholder. One `node build.js` emits **(a)** `orbital-ventures.html` — placeholder
→ `<script>`\n + modules joined + \n`</script>`, each tag on its own line so the harness's `awk`
extraction is unaffected; **(b)** `build/game.js` — the bare concatenated body for the harness; **(c)**
`index.html` — the same template with `<script src="src/X.js">` tags, so dev and release can't drift
structurally. **Loading is plain ordered `<script src>` tags, NOT ES modules** — required to preserve
global-scope semantics for the 241 string `onclick=` handlers. No banner/"generated" comments in the
module files, so the first build is **byte-identical** to the pre-split HTML.

**Deviations from the original E0.1 wording (both user-approved up front).** No separate `phaser.js`:
the four non-flight Phaser scenes (Cape/Veh/Map/Station) are interleaved with render code and aren't
cleanly separable, so they stay in `render.js` — a 7th file, `shell.js`, took `phaser.js`'s slot.
`render.js` is **deliberately not** split further into render+scenes despite its size (5.6k lines) —
user's call, same interleaving reason. Two cosmetic seam nudges off the approximate line numbers so a
section/descriptive comment travels with the code it heads: the `/* flight animation (canvas) */`
header opens `shell.js` (6564, not 6565); the bootstrap's explanatory comment opens `main.js`
(15400, not 15403). Every seam falls on a top-level-statement boundary — confirmed by `node --check`
passing on each module standalone.

**Behavior-preservation audit (the real risk: cross-script hoisting).** In one script, a top-level
statement can reference a function/const declared later (hoisting/TDZ); across ordered `<script>`s it
can't. Audited **every** top-level executable statement (not function bodies — those run after all
scripts load): all load-time references resolve within their own module or an earlier one. The
shell.js listener registrations (`applyWide`/`syncTopbarH`/`_firstGestureFs` as args to
`addEventListener`, plus `wideOn`/`THEMES`/`currentTheme`) all resolve inside `shell.js` itself
(functions hoist within the file; the lets/consts physically precede their use). The `main.js`
bootstrap only calls into earlier modules. **One known pre-existing bug left exactly as-is** (noted,
NOT fixed — out of scope): the top-level `try{ …TL_CAT_ICON[f]… }catch(e){}` at extracted line 9775
(now in `flight.js`) references `TL_CAT_ICON`, a `const` declared ~5,600 lines later (line 15345, now
in `render.js`). It was a swallowed TDZ `ReferenceError` when everything was one script; split across
ordered scripts it's a swallowed "not defined" `ReferenceError` — same net effect (`_tlFilter` stays
`'all'`, error caught), behavior preserved. If anyone ever "fixes" this, do it as its own change with
its own validation.

**Validation.** (1) Baseline before touching anything: 236/236. (2) Scripted byte-exact split
(line-offset slicing, not copy-paste), then `node build.js`, then `cmp` of rebuilt vs pristine
`orbital-ventures.html` → **byte-identical** (same md5). (3) Full suite against the rebuilt HTML via the
existing `awk` path → 236/236. (4) Harness recipe repointed to `build/game.js` (`node build.js && cat
harness.js build/game.js test-X.js | node`); added the build-parity cross-check `awk(orbital-ventures.html)
== build/game.js` → identical; full suite → 236/236. Updated the recipe in `tests/harness.js` +
`tests/README.md`. (5) Dev `index.html` verification: no browser/puppeteer/jsdom is available in this
environment, so **no real-browser render smoke test was run** — flagged for the user to do once. Instead,
static audit (above) **plus** a faithful ordered-multi-`<script>` simulation: Node v22 `vm.runInContext`
shares top-level `let`/`const`/`function` across separate script runs while preserving per-script
hoisting + ordering (verified) — i.e. exactly browser classic-`<script>` semantics for the one thing
that could differ. Ran all seven modules as separate ordered scripts under the harness stubs; the game
booted with **zero** thrown load errors and the full suite passed **236/236** in that multi-script
context (identical to the concatenated path).

**Test counts:** the official suite is the seven files `test-regression`(18) + `test-materials`(46) +
`test-dept-a`(42) + `test-dept-b`(27) + `test-dept-c`(30) + `test-pad-a`(34) + `test-depart-b`(39) =
**236/236**, unchanged at every checkpoint (baseline → awk-rebuilt → build/game.js → multi-script
sim). `test-progress-unify.js` is a separate WIP suite that was **already 23/35 at baseline** (12
checks fail on unfinished F4 behavior) — **not** part of the 236, and it stayed **23/35** through the
split (behavior preserved, as required). Real-browser check of `index.html` done after this session by
the user ("everything looks exactly as before") — slice (a) fully validated. Committed + pushed as
`963d86f`.

## Session — E0.1 slice (b): trimmed backwards-dependency cleanup + TL_CAT_ICON fix (2026-07-10)

**Scoped by a tech-lead pass first** (real risk here, unlike slice (a): moving code changes its
position in the concatenated build, reopening the cross-script load-order question slice (a) sidestepped
by never moving anything). Verified against the actual post-split `src/` files, not the pre-split
scoping guesses. Most originally-flagged "misplaced" code turned out fine on inspection (`poolOf`,
`currentEra`, the data.js family/blueprint region, the sim.js UI-builder functions) — moving those would
have been taxonomy churn with no payoff, explicitly declined. Only 3 real issues existed, all the same
shape: `sim.js` calling backwards into `render.js` for economy logic and station data.

**Moved (all three, ordering-safe — each moves a declaration to an *earlier*-loading file, which can
never break a later reference):**
- Special-contracts cluster (`SPECIAL_MODS`, `SPECIAL_COOLDOWN_MO`, `specialCandidateMissions`,
  `tickSpecialContract`, `fulfillSpecialIfMatch`): `render.js` → `sim.js`, placed after
  `tickPassiveContracts`.
- `monthlyPayroll`: `render.js` → `sim.js`, same neighborhood.
- `STATION_MODULES` + `STATION_PORT_BASE` (plus its "side-view module spec" doc comment):
  `render.js` → `data.js`, placed right after `FACILITY_DEFS`. `stationActiveModule`,
  `stationExpanded`, `toggleStationExpand` (UI state) stayed in `render.js`.

**Verification (no longer byte-identical, since content genuinely moved — a new invariant was needed):**
sorted-line diff of `build/game.js` before vs. after is **identical** (same multiset of 15,408 lines —
proves pure relocation, nothing edited/dropped/duplicated, confirmed against a fresh clone of the
pre-slice-(b) commit `963d86f`). `node --check` clean on every touched module. Full suite **236/236**
after the move. `awk`-extraction-vs-`build/game.js` cross-check still identical. Byte size of the built
HTML unchanged (1,246,630 bytes) — expected, since total content didn't change, only position.

**Separate bug-fix commit (not bundled with the moves above — this one is a real, if tiny, behavior
change):** the pre-existing `TL_CAT_ICON` issue noted in slice (a) — a top-level statement in
`flight.js` referenced `TL_CAT_ICON`, a `const` declared ~5,600 lines later in `render.js`, silently
swallowed by a `try/catch`, so the timeline category-filter preference never actually restored on
reload. Fixed by moving just the `TL_CAT_ICON` declaration (one line) to the top of `data.js`, which
loads before everything else. Verified the fix landed: in the rebuilt bundle the declaration is now at
line 6, its use in `flight.js` is at line ~9893 — declared well before used. Full suite still 236/236
after this change too.

## Session — E0.2 slice (a): save serialization fix + load-path unification (2026-07-10)

**Scoped by tech-lead first.** Found export/import (backlog #6) and autosave (backlog #8) already mostly
shipped in `src/save.js` — real remaining E0.2 scope smaller than the roadmap bullet implied. **Key
architecture call (user-approved):** localStorage stays the canonical live-game save; IndexedDB (slices
B/C) will be purely additive for manual slots + an autosave ring — rejected making IDB primary because
`beforeunload`'s synchronous-write guarantee (tab-close protection) matters more than storage-layer
cleanliness, and an IDB-primary design would need a one-time migration copy on first boot (a real
data-loss window for zero benefit). Ring cadence agreed for slice B: game-month-change AND ≥3 real
minutes (both conditions — time-warp can't spam it, idling can't duplicate it). Import/restore will get
an auto-backup safety net in slice B (closes a real footgun: importing a file today silently clobbers
your live save within ~4s via the next autosave). Manual-check target platform: Firefox via `file://`.

**Slice (a) shipped — pure refactor, zero user-visible behavior change:**
- Fixed the double-serialize (`JSON.stringify({...state:JSON.parse(JSON.stringify(state))})`) in
  **both** `writeSave` *and* `exportSave` — the roadmap bullet only named `writeSave`; `exportSave` had
  the identical waste, found during implementation. Confirmed **empirically** (not just reasoned) that
  old double-serialize and new single-pass output are byte-identical, against a played-forward state
  with an in-progress interplanetary flight (exercises nested `activeFlights`/`ctx.m`/research/staff
  structures) — `JSON.stringify` applies the same undefined/NaN/toJSON normalizations whether it sees
  the original object or a round-tripped clone of it, so the inner clone really was pure waste.
- Unified the two duplicated load paths (`loadSaveFromText`, `autoLoad`) into one `applyLoadedSave()`
  (migrate → defaults → `reconcileResearch` → `rehydrateFlights`). The two original blocks were
  confirmed **character-identical** before merging — they diverged only in per-call-site invalid-save
  handling (throw vs. return false) and post-load UI work, which correctly stayed at the call sites.
  This closes a latent corruption risk: a future migration added to one path but not the other would
  previously have silently produced two classes of save behavior.
- New `tests/test-save.js`, **34/34**, deliberately proven non-vacuous by sabotage-testing scratch
  copies: neutering each migration (window scaling, facility autoResupply default, eraSeen backfill) one
  at a time turns the corresponding test red; deliberately diverging the two load paths (recreating the
  exact bug this slice eliminates) turns the both-paths-identical guard test red specifically.
- No `SAVE_VERSION` bump (still 45), no new `state` fields — plumbing only.
- **Suite total: 270/270** (236 + 34), unchanged at every checkpoint. `test-progress-unify.js` (separate
  WIP, 23/35 baseline) untouched.

**Not started:** slice (b) IndexedDB adapter + autosave ring + restore UI + import-safety-net; slice (c)
manual save-slot picker UI.

## Session — E0.2 slice (b): IndexedDB autosave ring + import-safety net (2026-07-10)

**Shipped, user-verified in Firefox via `file://`, committed.** Builds on slice (a)'s
`applyLoadedSave()` unified load path — no changes to slice (a)'s serialization/migration logic.

- **New IndexedDB adapter** in `src/save.js` (`idbPut`/`idbGet`/`idbGetAll`/`idbDelete`, ~4 small
  Promise-returning functions, no external library). **Falls back to an in-memory `Map`** whenever
  `indexedDB` is undefined (the harness' testability seam — this is what makes the ring headlessly
  testable in Node) or on any open/transaction error in a real browser (one-time `console.warn`, then
  silent degrade — never throws, never breaks the game loop).
- **localStorage remains fully canonical and untouched** — the fast synchronous `autosave()` path and
  `beforeunload` force-save are exactly as they were. The ring is a purely additive second write path.
- `pickRingSlot` (pure, overwrite-oldest-of-3) + `ringCadenceDue` (pure, game-month-changed AND
  ≥3-real-minutes-elapsed, both required) + `ringAutosave`, hooked in right after the existing
  `autosave()` call at `sim.js:608`.
- Ring writes deferred via `requestIdleCallback` (with a `setTimeout` shim for browsers without it) —
  but the save payload is built **synchronously at the trigger moment**, so a ring entry always reflects
  state as of when it was triggered regardless of when the deferred write actually lands.
- **Import-safety net**: `snapshotLiveToRing` fires unconditionally (bypasses the cadence gate)
  immediately before `loadSaveFromText` overwrites live state — closes a real footgun where importing a
  file "just to look" could silently destroy the real save via the next fast autosave a few seconds
  later.
- New "↻ Restore autosave…" button next to the existing Settings save/export/import controls
  (`render.js:1834`); restoring an entry routes through slice (a)'s `applyLoadedSave`.
- New `tests/test-save-ring.js`, **42/42** — slot selection (empty/partial/full/tied), cadence gate (all
  combinations), eviction in practice (4 writes → oldest evicted), restore round-trip, and the
  import-safety-net ordering (pre-import snapshot proven to carry the *old* company's data, not the
  imported one) — all via the in-memory adapter fallback. **Suite total: 312/312** (270 + 42), the other
  270 unaffected.
- **User manually verified in Firefox via `file://` (2026-07-10), all four checks passed:** IDB entries
  persist across a real tab close/reopen; no perceptible hitch from ring writes during turn advances; the
  restore modal renders and an actual restore rolls the game back correctly; a private/incognito window
  still plays fine with the ring silently no-op'd.

## Session — E0.2 slice (c): manual save slots, E0.2 complete (2026-07-10)

**Shipped, user-verified in Firefox via `file://`, committed. E0.2 (all 3 slices) is now done.**

5 manual slots (`slot:1`..`slot:5`) behind a "🗂 Manage saves…" button in Settings + startup screen
(user-approved: 5 slots, behind-a-button). Reuses slice B's adapter/record shape (`kind:'slot'` sharing
one IDB store with the ring's `kind:'auto'`) and slice A's `applyLoadedSave`. Overwrite/delete use the
codebase's existing two-button `showModal` confirm pattern; load doesn't confirm since it inherits slice
B's pre-load ring-snapshot safety net. Save/Overwrite hidden on the startup screen (same guard as
`autosave`) so a fresh placeholder game can't get saved into a slot. New `test-save-slots.js`, 69/69.
**Suite total: 381/381.**

## Session — E0.4 slice (a): pause/warp hotkeys + help overlay (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Scoped by tech-lead first — found "tab hotkeys" and
"Esc closes modals" already shipped, so E0.4's real scope is smaller than the roadmap bullet implies.
4-slice plan: A (this one) hotkeys; B focus trap; C reduced-motion + colorblind icons; D UI-scale slider.

Slice A, all in `src/shell.js`: shared `isTyping()` guard (replaced 5 duplicated checks); `Space` pauses
during auto-run, launches otherwise (unchanged when not auto-running); `p` unconditional pause toggle on
any scene; `+`/`-` warp the day→week→month ladder, except on the R&D scene where they keep zooming the
tech tree; `?` opens a hotkey-help modal. New `test-hotkeys.js`, 31/31, pure-function coverage
(`warpStep`, `spaceAction`, `isTyping`, `warpKeysActive`). **Suite total: 412/412.**

## Session — E0.4 slice (b): modal focus trap (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Single shared wrapper fix in `showModal`/`hideModal`
(`src/sim.js`) — no per-call-site changes, all ~114 existing call sites unaffected. On open: captures the
triggering element (+ its id as a stale-reference fallback, since `render()` frequently rebuilds DOM),
focuses the first focusable descendant or `#modalBody`. Tab/Shift+Tab cycle only within the modal
(`trapModalTab` in `src/shell.js`, wired into the existing Esc-close keydown handler); list is recomputed
live each press since deep-view modals (Personnel, Programs) re-render their content every tick while
open. On close: restores focus to the trigger if still connected, else by id, else `document.body`.
New `test-focus-trap.js`, 31/31, on the two extracted pure functions (`nextTrapFocus`,
`resolveReturnFocus`) — real focus/DOM behavior isn't testable in the Node harness, tested live instead.
**Suite total: 443/443.**

## Session — E0.4 slice (d): UI-scale slider (2026-07-10)

**Shipped, user-verified in Firefox (incl. Phaser click-accuracy at 80%/130%), committed. Slice (c)
(reduced-motion + colorblind icons) deliberately deferred, not started.**

CSS `zoom` mechanism (`--ui-scale` var on `:root`, `zoom:var(--ui-scale)` on `body`), 80–130% in 10%
steps, localStorage-only (`ov_uiscale`, same pattern as `ov_theme`/`ov_wide` — no `SAVE_VERSION` bump,
survives new games/slot switches). Slider added to Settings (`renderSettings`, matches the existing
custom-difficulty slider style), applies live, re-runs `syncTopbarH()` on change. Default (100%) is a
provable no-op. New `test-ui-scale.js`, 48/48 (clamp/sanitize/boot-decision logic only — real CSS zoom
isn't testable in the harness). **Suite total: 491/491.**

## Session — E0.5 slice (a): Phaser sleep + hidden-tab fixes (2026-07-10)

**Shipped, user-verified in Firefox, committed.** Scoped by tech-lead first — found the log/metric/
chronicle caps already in place from earlier work, so the roadmap's real value was the RAF/Phaser audit.
Confirmed real bug: 4 popout scenes (Cape/Vehicle/Map/Station) called `pause()` on tab-leave, which stops
`update()` but **not rendering** in Phaser 3 — fixed to `sleep()`/`wake()`. The flight scene was never
paused after a mission ended, rendering its postFX indefinitely behind the hidden overlay — now sleeps on
dismiss/skip, wakes before restart. Canvas-fallback `animLoop`'s wall-clock delta is now clamped (~50ms)
so a hidden-tab return resumes smoothly instead of jump-cutting. New `visibilitychange` handler pauses
`timeAuto` when the tab hides and resumes it (same unit) on return, only if hidden-pause caused it (a
manual pause stays paused). `FRONT_PAGE_CAP` raised 24→100 (folded in, trivial). New
`test-hidden-tab.js`, 34/34. **Suite total: 525/525.** Slice (b) log retention/windowing and metric
archive (deferred per user) not started.

## Session — E0.5 slice (b): bounded histories + unified renderer sleep (2026-07-26)

**Shipped.** The global ops timeline now mounts 12 retained entries at a time and the Chronicle Wire
mounts 20 editions at a time, each with an explicit **Show older** affordance. The simulation still
keeps the existing small recent log (40) and Wire archive (100), but normal renders no longer rebuild
all of either collection.

The 24-month dashboard histories now decimate evicted monthly samples into exact three-month averages
in `state.metricArchive`, with an incomplete-quarter buffer so no sample disappears. The Chronicle
renders full-campaign quarterly capital/reputation/support trends; old saves lazily acquire both
archive fields without a save-version migration. Resolved crisis objects are capped at 48 and older
records roll into a compact aggregate that preserves exact crisis count, mitigated count, and legacy
score bonus.

The earlier visibility handler now snapshots and stops every sustained canvas/Three.js RAF plus every
active Phaser scene, then resumes only renderers it actually stopped. This covers Command Center,
Cape 3D, Vehicle, Solar Map 2D/3D, Station, flight playback, Earth pop-out, and Command Center pop-out;
time auto-advance retains its existing same-unit resume semantics. New `test-e05-retention.js` validates
the retention math, paging, score-preserving archive, and snapshot/idempotency behavior (27/27);
`test-hidden-tab.js` remains 34/34 and the regression/build-parity checks remain green.

## Session — BACKLOG.md #9: floating money/rep deltas (2026-07-10)

**Shipped, out-of-band from the E0.x sequence** (user-requested, first still-untriaged `Backlog`-status
item). Extended the existing `_statBump` HUD-flash helper (`flight.js`) with an optional `fmtDelta`
formatter: when given, spawns a small `.stat-delta` chip ("+$1.23M"/"−45") that rises and fades over 1s
near the stat, replacing any in-flight chip for that stat rather than stacking (spam control during
time-warp). Wired for money and rep only, matching the backlog title; other stats' bump-glow is
unchanged. `.stat` given `position:relative` as the anchor. One bug caught by the test suite itself: the
harness's DOM stubs don't implement `closest()`, crashing 3 test files — fixed with a defensive
`typeof`-guarded fallback + try/catch, headless-safe by construction now. **Suite total: still 525/525**
(pure addition, no new test file — cosmetic UI feature, real verification is visual).

## Session — visual/UI overhaul kickoff + E1.2 slice A: decision-frequency widening (2026-07-11)

**User-directed visual overhaul, scope agreed (not yet built beyond this piece):** era-evolving visual
identity (Apollo era → 80s NASA → 90s/2000s → SpaceX-modern, as the game's own era system advances;
Battlestar Galactica/retro-sci-fi as a mood reference), Phaser scenes synced to the existing DOM theme
system (currently 69 hardcoded hex colors don't react to theme at all), commit to a custom SVG icon set
(replacing emoji), sound in scope. Sequencing: flight-scene slice first, then icon set. Corrected an
earlier assumption before starting: camera shake/particles/bloom postFX/debris already exist in
`flight.js` (native Phaser particle system) — NOT the actual gap. Real diagnosis: the live abort/press-on
decision only fires in a narrow amber reliability band, so it structurally trends toward *zero* as the
player's engineering matures and as routine reflights (the bulk of a long campaign) dominate. User
confirmed: widen frequency, tied specifically to routine reflights.

**Shipped this session: the frequency-widening piece.** `liveCallFlag`/`deepCallFlag` (sim.js) now take a
`routine` flag and use a wider amber band on a reflight (0.97 vs 0.94) — doesn't touch the underlying
reliability roll, only how forgivingly it's read. `beginResolve`/`postResolve` no longer exclude uncrewed
routine flights outright (previously the only excluded combination). New `test-live-call-freq.js` (10/10).
**Suite total 671/671**, build parity clean, not yet committed/pushed.

**Also shipped this session: the live-call decision now genuinely plays inside the flight overlay**, not
as a page modal before it opens. User chose the architectural option over a cheaper reskin. Real
finding first: the decision resolves BEFORE `playMission` is ever called — the whole flight sequence is
a replay of an already-locked outcome, so "in-scene" requires the overlay to open EARLY and hold.
New `openFlightForDecision(ctx,decision)` (flight.js) opens the overlay with a placeholder (pad-safe)
spec and arms `animState.pendingDecision`; `drawScene`'s pad→ascent boundary now checks it and holds
there (reusing the existing held/dismiss idiom from the post-flight card) instead of continuing into
ascent, drawing a new generic `drawDecisionPanel()` (title/lines/N buttons, canvas hit-tested, same
rounded-rect idiom as `drawFlightContinueBtn`). `resumeFlightForDecision(finalSpec,finish)` patches the
real outcome into the SAME spec object once resolved (keeps stages/boosters/rng continuous), recomputes
`totalDur`/`reentryDur` (they depend on success/failPhase, computed only now), and resumes the SAME
animLoop — `finalizeLaunch` tries this before ever falling back to a fresh `playMission`. Only the live
call is wired this way so far; `showLiveCallModal` rewritten, `resolveLiveCall` untouched (already
routes through the same chain). New `test-decision-panel.js` (15/15) drives the real animLoop/click
handler on a virtual clock, not a reimplementation. **Suite total 686/686**, build parity clean.

**User-verified in browser 2026-07-11 — the live-call in-scene panel works.** Confirmed real, not just
headlessly plausible.

**Same session, following the browser confirmation: the other 3 decision types wired onto the same
primitive.** Reserve call and rescue both hold at a NEW `'cislunar-start'` point (entering the deep
cruise — their own "far from home" moment, distinct from the live call's pad→ascent point; both only
ever apply to cislunar/profile missions, confirmed via `deepReserveMargin`'s leg-filter and `resolveFlight`'s
`strand` kind both being deep-phase-only). Weather go/no-go holds at a NEW `'pad-start'` point (before the
countdown even ramps — it's decided before anything else about the flight is known, architecturally
earlier than the others: `resolveFlight` hasn't even run yet when weather fires).

Generalized `openFlightForDecision`/`resumeFlightForDecision` to support **chaining multiple decisions on
the same flight attempt** (e.g. weather → then a live call once the outcome is known) — reuses the
already-open overlay instead of opening a second one, replacing the earlier ctx-identity check
(`_decisionCtx===ctx`, which broke chaining since each stage builds its own ctx object) with a simpler
`_openedForDecision` boolean, safe because only one flight can ever be resolving at a time (`_flightResolving`
lock). `scrubLaunch()` (weather) explicitly `dismissAnim()`s before its multi-month `advance()` — scrubbing
is a genuinely new future attempt, not a continuation of the held pad frame, unlike the other three where
resuming in place is correct. Caught and fixed a **real ordering bug** during testing: `pendingDecision` was
being set on `animState` *after* `playMission()`'s first synchronous `animLoop()` frame already ran, so
the very first frame always missed the hold check — fixed by threading it through `spec._pendingDecisionSeed`
so `setupFlightState` seeds it into `animState` before that first frame, not after.

New assertions folded into `test-decision-panel.js` (28/28 total). **Suite total 699/699**, build parity
clean. **Not yet committed/pushed — needs a real browser check** for these three specifically (the live
call was already verified; reserve/weather/rescue are new code on the same proven mechanism, but still
unverified visually): trigger weather adverse conditions, a reserve-margin drift on a lunar mission, and
a deep-space strand, confirm each panel appears at its own correct moment and reads/clicks correctly, and
confirm chaining (e.g. weather → live call on the same launch) transitions smoothly with no flash/restart.

**Telemetry strip: already existed, no work needed.** Checked before building anything — `drawAscent`
already runs a full live per-frame HUD (`drawTelemetry`: T+/ALT/SPEED/Vx/Vy/ACC/Q/DRANGE/THROT/STAGE),
same pattern as the earlier camera-shake/particles/debris/plasma/chutes discovery — another eval claim
that was stale against current code.

**Phaser/canvas theme-sync — infrastructure built, first bounded slice done.** New `THEME_COLORS` (JS
table mirroring the 3 `body.theme-*` CSS palettes — Phaser/canvas draw calls can't read CSS custom
properties) + `themeColor(key)`/`themeRgba(key,alpha)` helpers (flight.js, top of file). Deliberately
scoped to HUD **chrome only** (telemetry panel, phase bar, continue button, decision panels, mission-info
box) — NOT the "physical world" (Earth's blue, rocket flame, plasma, stars, splashdown stay their real
colors regardless of console theme, same as a mission-control room's console color not repainting the
sky outside the window). Also found: the elaborate Phaser-native particle/camera-shake/postFX/mach-diamond
code in `flight.js` (`defineFlightScene`/`startFlightScene`, ~230 lines) is **100% dead code** — the
flight scene's `startFlightScene` call is commented out in `playMission` (disabled 2026-06-25), so none
of it renders; correctly excluded from theme-sync scope. New `test-theme-sync.js` (31/31) covers the
color-table infrastructure itself. **Suite total 730/730**, build parity clean.

**flight.js chrome theme-sync: finished** (same session, continued after the checkpoint above). Converted
all remaining chrome/status colors — telemetry panel, phase bar, decision panels, mission-info box, plus
every status-semantic color (phase-progress colors, G-load/skin-temp/chute-state warnings, orbit/trajectory
overlay lines) across `drawPad`/`drawAscent`/`drawOrbit`/`drawSuborbital`/`drawReentry`/`drawCislunar`/
`drawMiniMap`/`drawOrbitalMiniMap`/`drawPostFlight`/`drawDepartCard` — roughly 90 occurrences total,
via `themeColor`/`themeRgba`. Deliberately left alone: ~176 remaining hex literals that are genuinely
"physical world" colors (Earth-blue gradients, vehicle structural greys, flame/plasma/atmosphere) — sampled
broadly to confirm none of them are chrome hiding in plain sight before stopping.

**User-directed layout change, same pass: the telemetry HUD moved from a vertical list pinned top-left to
a horizontal strip along the bottom**, stacked just above the existing phase bar (new shared `PHASE_BAR_Y`
constant keeps the two in sync). Auto-wraps to multiple rows of up to 5 columns for the richer telemetry
sets (ascent/orbit run 10 items) — label-over-value per cell, divider lines between columns. Frees the
entire left side of the canvas (minimap + mission-info box were already top-right, unaffected).

**render.js's Cape/vehicle-preview/map/station Phaser scenes — deliberately deferred, not started.**
These are still genuinely active (unlike the dead flight scene) and mostly use the same canvas-2D
mechanism (`themeColor`/`themeRgba` would work directly), but a few spots are true Phaser GameObjects
(`.setTint()`) needing a different approach — a real, uninventoried scope of its own. Stopped here to
move to the icon set per the agreed sequencing rather than let theme-sync run indefinitely.

**Suite total 730/730**, build parity clean, not yet committed/pushed. **Needs a real browser check**:
the bottom-strip HUD reposition is a real layout change (confirm it doesn't overlap the phase bar or
run off-canvas at different vehicle/mission telemetry-row-counts), and confirm the theme actually
recolors the flight overlay chrome when switching Mission Dark / Control Room Green / Apollo Beige.

**Icon set — first bounded slice done, same session.** New `svgIcon(name,size)` (data.js) — inline
16x16 line icons, `stroke/fill="currentColor"` so they theme-sync for free via plain CSS (unlike the
canvas HUD chrome above, these are DOM/innerHTML — no JS color table needed). Scoped to the 7 TL_CAT
timeline categories (launch/research/rivals/crew/infra/other — `economy` stays the plain `$` glyph,
it was never an emoji-consistency problem), replacing `TL_CAT_ICON`'s emoji and the matching
`TL_CATEGORIES` filter-pill icons. `economy`'s `$`, `upcomingEvents()`'s own icon literals (⚛🔧🪟),
the main tab bar (already plain Unicode dingbats ⌂✎⚛☉⬡, not full-color emoji — lower priority), and
every other emoji sprinkled through card headers/buttons are **not** touched — this was a bounded
slice matching the eval's specific "TL_CAT icons... tab badges" framing, not an exhaustive
emoji-to-SVG sweep of the whole UI. New `test-icon-set.js` (27/27) — including a real render check
(not just unit-testing the generator) that the rendered timeline strip actually contains `<svg>`, not
emoji. **Suite total 757/757**, build parity clean, not yet committed/pushed.

**User feedback after browser-testing the bottom HUD**: reposition it below the rocket, everything
else fine. The telemetry strip and phase bar were stacked telemetry-above-phase-bar; swapped so
**telemetry is now the bottom-most HUD element** (hugs the canvas edge, `HUD_BOTTOM_MARGIN=6`), phase
bar stacks just above it. `drawTelemetry` records its own top edge on `animState._telemetryTopY` each
frame (row count varies 5-10 depending on flight phase) so `drawPhaseBar` always stacks correctly
above whatever height that frame's telemetry strip actually is — no hardcoded shared offset to keep
in sync anymore. Didn't touch the rocket-position math (`baseY` in `drawAscent`) at all — lower risk,
and matches the literal ask (move the HUD, not the rocket). **Suite total still 757/757**, build
parity clean, not yet committed/pushed — **this specific change needs a browser recheck** (the
previous rounds were tested before this swap).

**render.js Phaser-scene theme-sync — bounded first slice done, same session.** New `themeColorNum(key)`
(flight.js, alongside `themeColor`/`themeRgba`) returns the numeric `0xRRGGBB` form true Phaser
GameObjects need (`.setTint()`/`lineStyle()`/`fillStyle()` take numbers, not CSS strings — Phaser
`add.text()` configs take CSS strings though, so those use `themeColor()` directly). Scoped to
**exact matches** — hex values already numerically identical to an existing theme color, found by
grepping for the literal theme hex/rgb values across the file: MapScene's `HEALTH_HEX` status colors
(ok/warn/attention → theme ok/warn/bad, a clean semantic map), selection rings and orbit-guide lines
in VehScene/MapScene (already used ignite-orange/muted-gray, now via the theme table), text labels
across VehScene/MapScene/StationScene (drag label, hint text, body/module name labels — Oort Cloud
label existed in both a Phaser-text and an SVG-string render path, both converted), and 2
canvas-2D/inline-style rgba(ignite,...) occurrences. This is a **narrower, higher-confidence slice**
than a full chrome-vs-world audit of all 4 scenes — deliberately so, since Phaser GameObjects don't
live-retint on a theme switch the way canvas-2D redraws do (a scene only picks up the theme active
when it was created/entered — a real, documented limitation, not a bug). New assertions in
`test-theme-sync.js` (40/40 total). **Suite total 766/766**, build parity clean, not yet
committed/pushed.

**Full chrome-vs-world judgment pass: done, same session.** Corrected a boundary mistake from the
earlier exact-match pass first — `defineVehScene()` actually ends at line 2662, not ~3799 as
originally assumed (grabbed a bunch of unrelated popout/portrait functions into the earlier scan).
Redid the inventory with correct scene boundaries and read each of the 4 scenes in full:

- **CapeScene** (~30 lines) — genuinely almost no inline chrome; the pad's visual richness lives in
  `drawIsoPad()` (a canvas-2D texture-builder, read in full — confirmed its whole palette is
  legitimate physical pad/sky/flame art, nothing chrome-shaped in it).
- **VehScene** — 2 more found by reading closely: the stage-separation dashed guide line (→`dim`)
  and the three-tier Δv-loss annotation color (`loss<=0` good / `>250` bad / else warn → `ok`/`bad`/
  `warn`, a clean status semantic that wasn't an exact hex match to catch by grep).
- **MapScene** — 7 more: planned-route line (ok/bad by `pr.ok`), transfer-path traveling marker,
  player-pennant flagpole (now matches its already-converted flag fill), facility health-badge
  backdrop (→`bg`), ISRU pick indicator (→`ok`), Belt-claim ring (→`ignite`), LEO depot arc gauge
  (→`readout`). Left alone: star field, sun corona/glow/core (all genuinely physical), Oort cloud
  particles, and the `hx()`/`C()` helpers that convert *data-driven* categorical colors (planet
  color, rival faction color, facility-type color) — those are intentional per-entity color coding,
  not theme chrome, same category as the procedural-portrait palette left untouched in flight.js.
- **StationScene** — 1 more (an annotation label's text color, pairing it with its already-converted
  leader-line color). Everything else here is the station module's own hardware rendering (solar
  wings, radiator, hull, docking ports, antennas, handrails) — confirmed genuinely physical, same
  category as the rocket/vehicle rendering left alone in flight.js.

**Suite still 766/766** (pure color-constant swaps, no new test file — the underlying `themeColor`/
`themeColorNum` functions were already covered by `test-theme-sync.js`; the actual Phaser rendering
can't be verified headlessly regardless), build parity clean, not yet committed/pushed. **This is now
believed complete** for the "exact-match + close-reading" scope — a genuinely exhaustive re-audit of
every remaining hex literal in all 4 scenes was not attempted (would mean re-litigating already-
confirmed "world" colors with no new information).

## Session — era-evolving visual identity, slice 1: Apollo (2026-07-11)

User asked to see the 80s era in-browser; clarified nothing existed yet (only the manual Mission
Dark/Green/Beige theme picker) — I can't launch a browser myself either, so redirected to building a
real first slice. User picked: automatic (tied to `state.year`, not a manual picker) and Apollo era
first (the anchor of the whole progression).

New `ERA_VISUAL_MAP` (data.js) groups the 8 `ERAS` entries into 4 visual eras — apollo (Pioneer/Early
Orbital/Crewed Lunar, up to 1975), 80s (Station & Shuttle, 1975-2000), 90s2000s (Commercial,
2000-2030), spacex (Expansion/Interplanetary/Speculative, 2030+) — coarser than gameplay-era
granularity on purpose. `eraVisualKey()` reads it; `applyEraVisual()` (render.js, hooked into the top
of `render()`, cached against the last-applied key so it's a no-op most renders) swaps a
`body.era-*` class.

**Only Apollo has real CSS so far** (shell.html) — per the user's own scope call (palette + chrome
shapes/fonts, not just palette): reuses the existing Apollo Beige theme's exact color values
(warm 1960s console), gated `:not(.theme-green):not(.theme-beige)` so an explicit manual theme pick
still wins over the era default — only the color precedence is conditional; sharp/minimal
border-radius, thicker 2px borders, uppercase+letter-spaced headers apply in Apollo era
unconditionally (shape isn't really a "color scheme" choice the way the theme picker is). A fresh
new game starts in 1942 (Pioneer), so **it shows the Apollo look immediately with zero setup** — no
need to advance time to see it.

80s/90s2000s/spacex classes are correctly detected and applied but have no CSS yet — falls through
to today's default look, not a bug. New `test-era-visual.js` (12/12). **Suite total 778/778**, build
parity clean, not yet committed/pushed. **Needs a real browser look** — this is the first genuinely
new visual identity shipped this session (not just a recolor of what already existed), open
`orbital-ventures.html` fresh (default Mission Dark theme, don't pick Green/Beige) and it should read
noticeably different: warm amber/beige, boxier cards and buttons, uppercase label-plate headers.

**All 4 eras done, same session.** 80s (Station & Shuttle, 1975-2000) reuses Control Room Green's
exact palette — that theme's own comment already called it "phosphor-CRT mission control," a clean
match for the era — plus moderate rounding/medium borders, short of Apollo's hard corners. 90s2000s
(Commercial, 2000-2030) is a fresh Y2K/early-broadband-web palette (brighter cooler blue-gray, no
existing theme fit) with bubbly rounded corners and a glossy gradient highlight on buttons. SpaceX-
modern (Expansion onward, 2030+) is also a fresh palette, pushed meaningfully past today's default —
near-black background, thin/near-borderless cards, fully pill-shaped buttons, condensed headers — the
actual destination the whole progression ages toward, not just a restatement of the current look.
Updated the now-stale "only Apollo has styling" comments in data.js/render.js/shell.html to match.
`test-era-visual.js` extended to 16/16, including a check that the built HTML actually contains real
CSS rules for all 4 era classes (not just detection logic). **Suite total 782/782**, build parity
clean, not yet committed/pushed. **Needs a real browser look at all 4** — advance a save through
each era (or just start fresh games and manually bump `state.year` via the console) and confirm each
one reads as genuinely distinct, and that switching a manual theme (Green/Beige) still correctly
overrides the era palette in every era, not just Apollo.

Rest of the emoji inventory (if wanted) and sound not started. Treat this ROADMAP entry + the memory
note as the record if the session ends before those land.

## Session — E1.1: reactive rival race, slice B — rival intel dossier (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Slice B was
originally scoped as "intel purchases — pay to see rival progress", but reading the code showed the
*free* Standings panel already surfaces momentum, threat, price-war status, and a live momentum-projected
ETA — for the rival's NEXT goal only. The real gap: `rivalProjectedYear(r)` projects one pending goal;
the per-goal firsts list below it shows every *other* remaining goal at its flat static `f.year`, not
momentum-adjusted. So a naive "pay to see the same thing" would be pure duplication — instead slice B
sells the momentum-adjusted projection of the rival's *whole remaining roadmap*.

**Generalized projection** (`rivalFullProjection(r)`, sim.js) — returns an array of `{goal,year,nominal}`
for every remaining goal from `rs.idx` to the end of `r.firsts`. Goal 0 uses the exact formula
`rivalProjectedYear` used before; each subsequent goal treats the previous goal's *projected* year as its
`prevYear` (its saving window opens where the last one lands) and reuses the same `window`/`cost`/`rate`
shape, with momentum/crowd held at today's live snapshot for the whole chain (a projection, not a
re-sim — same simplifying assumption the single-goal version already made). `rivalProjectedYear(r)` is
now a thin wrapper — `return rivalFullProjection(r)[0]||null` — a pure refactor of the first entry.

**Parity-regression guarantee** — a test asserts `rivalProjectedYear(r)` is byte-identical (goal/year/
nominal) to `rivalFullProjection(r)[0]` for ≥2 rivals after 24 rival ticks (so momentum/capital have
drifted off seed), proving the refactor didn't move the free number every player already sees.

**Paid unlock** — `buyRivalIntel(rivalId)` (sim.js, next to `counterPoach`): checks money + not-already-
owned (early-return + `log('note',…)` on either, matching `counterPoach`), deducts `RIVAL_INTEL_COST`
(`RIVAL_INTEL_COST=1.5` $M, data.js — cheaper than the momentum-affecting `RIVAL_COUNTERPOACH_COST=2.5`
because it's pure information), sets `state.rivalIntel[rivalId]=true` (permanent, non-expiring). Lazy-
defaulted via `rivalIntelOwned(id)` — no migration, matches E1.4's accessor pattern. `SAVE_VERSION`
51→52.

**UI** (`renderRivals()`, render.js) — a second button beside counter-poach: `🕵 Buy intel dossier −$1.5M`,
which flips to a disabled `🕵 Dossier owned` once bought. When owned, a visually distinct
`🕵 Full program projection` block renders `rivalFullProjection(r)` — every remaining goal, projected
year, and the same "Ny ahead of history / Ny behind — you're slowing them" framing the free next-goal
line uses (reused verbatim). Sits above the existing static firsts list so the paid momentum-adjusted
timeline and the free nominal one compare side by side; the free list is untouched.

**Tests** — new `tests/test-rival-intel.js`, 29/29: parity regression (×3 rivals + non-vacuous guard),
length/order/monotonic-year of the full projection, `buyRivalIntel` affordability/deduction/idempotence,
and a render smoke check (no throw before/after; dossier block present for exactly the one bought rival,
its button reads "owned", others still offer "Buy"). Full suite green — 974 checks excl. the known
pre-existing `test-progress-unify.js` shortfall (23/35); `test-station-slice2.js` clean this run (its
RNG flakiness is unrelated). `test-rivals-e11.js` unchanged at 24/24.

**Real-browser checklist:** open the Standings/Rivals panel → each rival shows a `🕵 Buy intel dossier
−$1.5M` button → click it for ONE rival → treasury drops $1.5M, that rival's button now reads
`🕵 Dossier owned` (disabled), and a `🕵 Full program projection` block appears listing every remaining
goal with a projected year → confirm the block appears ONLY for that rival, the others still show the
buy button and no projection block → reload the page (save round-trip) and confirm the dossier is still
owned.

## Session — E1.1: reactive rival race, slice A (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Tech-lead scoped
first: **most of the roadmap bullet was already shipped** by CE1(a/b/c) — momentum already reacts to
player firsts (schedule variance), `denyRivalGoal()` already damages a rival's schedule, staff poaching
already exists and is momentum-weighted. The eval's "rivals are scheduled, not adaptive" framing was
stale. Real gap was three pieces: contract snatching, budget hearings after a *fatal* crewed loss (the
existing failure inquiry is explicitly uncrewed-only — the crewed branch's own comment said so), and a
literal failure→poaching link.

**Contract snatching** (`tickRivalSnatch()`, sim.js) — a surging rival (momentum ≥1.1) bids on an open,
uncommitted procedural offer; two-beat warning (2 mo) then taken if you don't commit. Committing
(select/queue/hangar) is the whole counter — reuses E1.3's `contractOfferReferenced()` guard, so a bid
on a build in progress just falls through. Reward is rival **capital**, not momentum (momentum drives
the Monte-Carlo-tuned firsts-pacing; a snatch shouldn't touch that). Never touches authored missions,
the special contract, or mandates — only `state.contractOffers`.

**Budget hearing** (`triggerHearing`/`showHearingModal`/`resolveHearing`, sim.js) — the political sibling
of the engineering-only failure inquiry, fired from the same two branches in `finalizeLaunch` that E1.4's
memorial/flight-log already hook. Three choices: fund a safety program (costs $, +support), defend the
record (free, −rep, +support), blame the vendor (free, +support, staff morale hit + extends poach heat).
Same transient `_pendingX` + priority-chain shape as `_pendingSetback`/`_pendingInquiry`.

**Poach heat** (`state.poachHeat`, `tickPoachHeat()`) — any fatal crewed loss opens a 6-month window
that multiplies `checkPoaching()`'s roll ×2.5; decays monthly. Closes the "poaching after player
failures" ask literally, on top of the momentum-weighting that already existed.

SAVE_VERSION 48→49. New `test-rivals-e11.js` (24/24). **Suite total 661/661**, build parity clean.
Slice B (intel dossier purchase) — tech-lead's own recommendation was to consider cutting it, since the
rival projection is already free in the Standings panel; not started, low priority.

## Session — E1.3: procedural filler contracts (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Tech-lead scoped
first: existing "special contract" system is a bonus ticket on an authored mission, not a new flyable
object, so this is genuinely new. `state.contractOffers` (era + capability-gated via `CONTRACT_ARCHETYPES`
in data.js — comsat block buy, crew rotation; `tickContractOffers()` generates/expires them, cap 2
concurrent, priced ~0.6x a comparable authored mission). New `missionById(id)` resolves authored or
procedural ids at the ~6 call sites that resolve `state.activeMission`. The one real risk: `finalizeLaunch`
gates the whole firsts/milestone block on `!m.proc` so a procedural flight never writes
`state.completed`/`firstDates`/`history` or pops the milestone modal — full payout, no farming (sciGain
also uses the routine-tier rate for proc flights). An offer is consumed on success, survives its own
expiry if referenced by `activeMission`/build queue/hangar, otherwise expires and rotates. New
`renderContractOffers()` section (Flight Contracts tab, same mount pattern as the special-contract
banner). SAVE_VERSION 47→48. New `test-contracts.js` (25/25). **Suite total 629/629**, build parity clean.

**Slice B done same session**: Deep-Space Sample Return archetype (`modules:['lv','transfer']`, the same
profile shape as authored Lunar Sample Return), gated on `deep_space` research + `deepFlights≥1`. Kept
its cruise under `DEFER_CRUISE_DAYS` (60) so it resolves synchronously like its authored counterpart —
sidesteps the deferred/`activeFlights`/rehydration edge case entirely rather than taking it on. Deliberately
**no `sciYield`** on the archetype (that bonus is explicitly first-flight-only and would be an infinite
farm on a regenerating offer); also hardened the underlying `finalizeLaunch` line itself
(`m.sciYield && !routine && !m.proc`) so a future careless archetype can't reopen that hole. Balance pass:
concurrent-offer cap now 2 early-game, 3 from the Commercial era onward (`contractOfferCap()`, era-derived,
replacing the flat `CONTRACT_OFFER_CAP` constant). New assertions folded into `test-contracts.js` (33/33).
**E1.3 complete (both slices). Suite total 637/637**, build parity clean.

## Session — E1.4: astronaut flight log + memorial wall (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Names/traits
were already built; added the two missing pieces. `state.astronautLog` ({id:[{when,mission,outcome}]}),
appended once per crewed flight in `finalizeLaunch`, keyed by id so it outlives the astronaut leaving
`state.staff`; surfaced as a "N flights flown" line on the astronaut's Personnel card. `state.memorial`
([{id,name,when,mission,story}]), appended in `loseAssignedCrew` at the exact death moment (name
snapshotted there); renders as a "🕊 Memorial Wall" section in the Personnel tab, only when non-empty.
SAVE_VERSION 45→47 (one bump per field, both lazy-default `[]`/`{}` via accessor functions, no migrate
needed). New `test-astronaut-log.js` (9/9) + `test-memorial.js` (13/13).

Also added the roster view: a "🚀 Astronaut Roster" section in the Personnel tab, appears once anyone's
flown, lists every astronaut who has (portrait, trait, Active/Lost status, full flight-by-flight list),
sorted most-flown first. Reuses the existing `personPortrait()`/`traitOf()` — no new data. New
`test-roster.js` (12/12). **E1.4 complete. Suite total 604/604**, build parity clean.

## Session — E1.5: ops friction + trust (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check.** Read the code
first: 3 of the 4 backlog sub-items were **already fully built** (verified against the source, deliberately
NOT rebuilt): **#18** "why can't I fly this?" — `canLaunch()` already returns `{ok,why}` and every disabled
launch button (Bench + ~8 others) already renders `chk.why`; locked program-ladder missions already show
`needs N rep`. **#29** pad turnaround — the whole `launchPadCap()`/`padSlotsLeft()`/`curMonthPadUsed()`
launches-per-month mechanic (CE2 slice b) already exists and is surfaced in the Infrastructure card +
attention flags. **#10 econ half** — `missionNetEconomics()`/`missionNetHTML()` already renders the full
per-line payout/cost/carry/net breakdown inline on the Bench.

**The real gap** (the reliability half of #10 + all of #32): `flightPhaseBreakdown()` already decomposes
every flight into per-phase, per-subsystem reliabilities (∏ phaseRel = R) and every resolved `outcome`
already carries `.phases`/`.subsystem` — but a grep proved that data was computed and thrown away (zero
readers in render.js/flight.js). Newly built, all pure display/derived-data plumbing:

- **`phaseBreakdownLines(phases, govKey)`** (sim.js, beside `flightPhaseBreakdown`) — turns the breakdown
  into plain-text lines, one per phase (`"Ascent 91% — Propulsion 94%, Structures 97%, …"`); when `govKey`
  (the failing subsystem) is passed, that phase gets a leading `✕ ` and the subsystem is tagged `✕FAILED`.
  Plain text on purpose — it feeds native `title=` tooltips (no markup) and the log detail field.
- **Bench reliability hover** — both readout sites (`renderReadout` non-profile + `renderProfileReadout`)
  now put `esc(phaseBreakdownLines(flightPhaseBreakdown(subsystemReport(m,v,sim,v.crewed)),null).join('\n'))`
  on the reliability `.metric` as `title=`. Pre-flight/informational, so `govKey` is null. Reuses the exact
  `subsystemReport(m,v,sim,v.crewed)` pattern already in `subsystemBreakdownHTML`.
- **Failure causal chain in the log** — `log(kind,msg,nav,detail)` gains an OPTIONAL trailing `detail`
  param (fully backward-compatible; every existing 3-arg call is unchanged and stores `detail:undefined`,
  which JSON drops). `finalizeLaunch` computes `failDetail = phaseBreakdownLines(outcome.phases,
  outcome.subsystem).join('\n')` once (guarded on `.phases`; dev-forced outcomes carry it too) and threads
  it into the 5 failure/partial/abort/strand/loss log lines. `renderLog()` appends `l.detail` to the
  existing `title=` on the log chip (concatenated with `tlAttr(l.msg)`, both `esc`'d — not replaced).
  The `upcomingEvents()` chip loop was left alone: its objects carry no `.detail` field.
- **Pad-slot line on the Bench** — `renderBenchLaunch` now renders `Pads: {free}/{cap} free this month`
  under the launch button, but ONLY when `launchPadCap()>1` (a one-pad startup has nothing to see, no noise).

No `SAVE_VERSION` bump — `log.detail` is transient UI-only, never read back from a save; no new persisted
state. New `test-ops-friction.js` (36/36): `phaseBreakdownLines` shape + gov-marking, `log()` 3-arg vs
4-arg backward compat, a forced-loss flight driven through `resolveFlight`+`finalizeLaunch` producing a
log entry whose `.detail` names the failed subsystem, `renderLog()` not throwing on mixed detailed/plain
entries (title carries both message + breakdown), Bench reliability title present/non-empty, and the
pad-slot line absent at L1 / present + correct at raised `prodLevel('pads')`. **Suite total 640/640** of
the always-green files (pre-existing `test-progress-unify.js` 23/35 shortfall and the RNG-flaky
`test-station-slice2.js` are expected and untouched), build parity clean.

**Real-browser check:** (1) hover the Bench reliability number and confirm a multi-line phase-by-phase
breakdown tooltip appears; (2) force a launch failure via the dev menu (Ctrl+Shift+D → force loss) and
hover its Flight & Ops log entry to see the causal chain with the failed subsystem tagged; (3) research a
second Launch Pad level and confirm the "Pads: N/M free this month" line appears under the launch button.

## Session — E0.6: esc() all dynamic text in innerHTML templates (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check before push.**
Scoped by tech-lead first: the roadmap line's premise was half-stale (no company-name *input* exists —
`state.company` is hardcoded, family names auto-generate as `OV-n`), so the real user-typed surface is
blueprint/livery names, and the real threat channel is **imported save files** — every persisted string
in a shared save is attacker-controlled once sharecodes exist, which is what this item is actually
guarding against. New `esc()` one-liner in `data.js` (first module in build order, global scope).
Wrapped ~20 call sites: blueprint names, livery name, `state.company` (4 render.js + 5 save.js sites,
including saved-slot/ring metadata), vehicle family names (active/list/parent-pill/register-button in
`renderVehicleFamilies`, plus the build-cost-multiplier log line and reliability note in `sim.js`),
front-page headline/dek (both the modal and list-row renderers). **Real bug fixed**: the pre-existing
`tlStrip()` tag-stripper (used across the flight/ops log timeline) was bypassable via an *unclosed* tag
(`<img src=x onerror=...` with no closing `>` survives its `/<[^>]*>/g` regex untouched) — split into
`tlStripPlain()` (strip-only, kept for `logCategory`/`logNav`'s plaintext regex matching, where escaping
`&` to `&amp;` would silently break patterns like `/R&D /`) and `tlStrip()` (strip-then-escape, for
actual rendering); `tlAttr()` now just aliases `tlStrip()` since full escaping already covers
double-quoted-attribute safety. Caught and fixed a **double-escaping trap**: `recentCashEvents()`
pre-escapes `l.msg` via `tlStrip` before storing it, but the Finances modal was re-running `tlAttr` on
that already-escaped value for the tooltip — fixed to use the pre-escaped string directly. New
`test-esc.js` (36/36) also **caught a real gap the tech-lead audit missed**: `vehicleCompareHTML()`'s
`<option>` labels (the A/B compare-designs dropdowns, embedded in the same family card) interpolated
family names unescaped — found by the test asserting the whole rendered card, not just the primary
family-name spans; fixed alongside. **Suite total now 561/561** (525 + 36), all pre-existing suites
unaffected, build-parity (`orbital-ventures.html` inline script ≡ `build/game.js`) reconfirmed.
**Honest scope note for the eventual commit message**: this secures every user-typed/import-controlled
name field found in this pass, but true sharecode-era safety still needs an import-time sanitize/
whitelist pass over arbitrary save-file strings beyond the named fields (e.g. JS-in-attribute contexts
like `onclick="loadBlueprint('${b.id}')"` — `esc()` can't protect those since entities decode before the
attribute's JS parses; ids are program-generated so safe today, but a hostile save with a crafted id is a
separate, not-yet-addressed vector). That's future scope, not claimed as done here.

## Session — Command Center scene: era-tied variety, slice 1 (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** User asked for another pass on the isometric
Command Center scene to "increase realism and variety"; two directions proposed (era-tied variety vs.
atmosphere/realism), user picked era-tied variety first. Investigation found the existing "Phase B
realism" prop system (roads, crawler, gantry blink light, greebles, etc.) is rich but has zero variation
by era or game state — only VAB height (bay count) and dish count actually scale. New `ERA_BUILDING_TINT`
+ `eraBuildingTint(type)` and `ERA_PAD_STYLE` + `eraPadStyle()` (render.js), both keyed by the same
`eraVisualKey()` the DOM-chrome era system already uses, so the two visual identities age up together.
Apollo gets warm weathered beige/gray buildings + a white-steel umbilical-tower gantry (matching the
Saturn V reference); 80s gets cooler grays; 90s2000s gets brighter blue-tinted corporate grays + a
cleaner light-gray tower. `spacex` deliberately has no entries in either table — today's existing colors
already read as the modern baseline, so that era falls through to the unchanged defaults for free
(zero risk, mirrors how the DOM-chrome era pass treated the newest era). Scoped to palette only this
pass — no geometry/shape changes to buildings, roads, or vehicles. `test-era-visual.js` extended to
24/24 (was 16/16). Full suite: 796/808 (the 12 failures are in `test-progress-unify.js`, a pre-existing
unrelated failure predating this session — confirmed by isolating the file, unrelated to any Command
Center code). Deferred/next: atmosphere-realism pass (sky/lighting/time-of-day) proposed as the second
direction but not yet greenlit; extending era-tied variety to roads/vehicles/gantry-beam geometry if
wanted later.

## Session — Command Center scene: atmosphere/realism, slice 2 (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** Fast-follow to the era-tied variety pass —
the Command Center's sky was a permanently fixed dusk gradient with a sun stuck at a fixed high-right
position regardless of how long the scene had been open. New ambient day/night cycle: `SKY_KEYFRAMES` +
`skyAtmosphere(t)` (render.js), a pure function of the scene's own elapsed-seconds clock `t` (same idiom
as the existing blink-light/idle animations — no new persisted game state). Cycles dawn → day → dusk →
night → dawn over `SKY_CYCLE_SEC` (240s/4min) real time: sky gradient color, sun position/color/opacity,
and star visibility all interpolate smoothly between keyframes. The dusk keyframe (p=0.50) is an EXACT
reproduction of the scene's original fixed values, so a mid-cycle glance looks identical to before this
pass — the cycle just breathes around that anchor, zero regression risk at that point. Scoped to sky/sun/
stars only; ground/water/terrain colors deliberately left fixed (isometric strategy scenes commonly keep
ground readable/consistent regardless of time-of-day — a deliberate boundary, not an oversight). New
`test-cc-atmosphere.js` (14/14): exact-dusk-match anchor, clean cycle wrap (incl. negative-t safety), day
brightness/starlessness vs night darkness/starriness, smooth (non-cut) interpolation, and an end-to-end
`drawCape` smoke test across the full cycle using the harness's `makeCanvasStub`. Suite: 818/830 (same
pre-existing unrelated `test-progress-unify.js` failure, confirmed isolated in the prior slice's entry).
This closes out both proposed Command Center directions (era-tied variety + atmosphere/realism) from the
2026-07-11 "increase realism and variety" ask.

## Session — Vehicle pop-out: full workbench editor + pop-out sizing pass (2026-07-11)

**Implemented, tests passing, not yet committed/pushed — needs a real-browser check (see below).** Two
asks: (1) bring all the normal Design Bench editing functionality into the vehicle pop-out (previously
just a read-only pan/zoom viewer + a hand-written stats summary), and (2) make every pop-out's default
view fill ~10% more of the screen. Clarified #2 with the user first since every pop-out overlay is
already `position:fixed;inset:0` (literally the full viewport) — answer was "both": bump default content
zoom AND trim chrome padding.

**#1 — full editor, via the existing "move the live node" trick.** The vehicle pop-out already moved the
live Build/Launch button into its bar on open and back on close; generalized this to the whole editor.
New `id="benchEditorPanel"` on the `.bench-editor` div (shell.html) — the tabs bar + all 6 bench-panel
tabs (Vehicle/Modules/Customize/Saved Designs/Families/Mission: stages, boosters, transfer, lander, crew,
power, livery, parts, blueprints, families, architecture, window planner, routes). `openVehPopout()` now
moves `#readoutCard` (the REAL Δv/TWR/mass/economics/test-campaign readout — replaces the old hand-rolled
`vehPopStatsHTML()`, deleted as dead code) and `#benchEditorPanel` into the pop-out's aside, remembering
homes exactly like the launch button; `closeVehPopout()` restores both before the scrim is removed. No
render-function changes needed — `render()`'s bench block already writes into these ids by `$('id')`
regardless of DOM location, so every existing edit interaction (stage add/remove, parts swap, tab
switching, etc.) keeps working untouched. Widened the aside for this: new `.vehpop-stats.wide` CSS
(`flex:0 0 46vw;max-width:760px;min-width:420px`, only applied to the vehicle pop-out — station/map/cc
pop-outs keep the narrow 300px stats rail).

**#2 — pop-out sizing.** New shared `POPOUT_ZOOM_BOOST=1.1` + `centeredZoomOffset(w,h,z)` (render.js).
Every pop-out's default/reset zoom bumped from 1.0 → 1.1, paired with a compensating pan offset so the
content stays visually centered (each pop-out's zoom transform is anchored at its content box's top-left,
so a naive zoom bump alone would drift the view toward the bottom-right corner) — worked out the geometry
per pop-out type: vehicle + earth (canvas-drawn, translate-then-scale) vs. station + map (CSS transform on
a full-stage wrapper, shared `initSvgPopZoom` helper) vs. command center (CSS transform on a letterbox-
fit box, `ccPopFitBox()`). Earth needed no offset — its draw loop already translates to canvas-center
before scaling. Double-click "reset" on every pop-out now resets to this boosted+centered default, not
the old smaller one. Chrome trim: `.vehpop-bar`/`.vehpop-stats` padding trimmed ~10-15%.

**Tests**: `test-popout-sizing.js` (19/19) — pure-logic coverage only (`centeredZoomOffset` exact math,
every pop-out opens at the boosted zoom default without throwing, vehicle pop-out open/close/open/close
repeatability). Extended `harness.js`'s canvas-id allowlist (`vehPopCanvas`/`earthPopCanvas`/
`ccPopCanvas`) so `drawVehPopout()`/earth/CC draw loops don't crash under test — this was a **pre-existing
gap**, not a regression (pop-outs had zero test coverage before this pass; the harness's `getElementById`
returns a fresh stub per call with no real DOM tree, so the actual node-relocation and visual-centering
behavior is fundamentally a real-browser-only concern, same limitation as the pre-existing launch-button
move). Suite: 837/849 (same pre-existing unrelated `test-progress-unify.js` failure).

**Needs a real-browser check**: does the moved-in editor render/behave identically to the normal bench
(tab switching, stage/parts editing, blueprints save/load) inside the pop-out's wider aside; does closing
and reopening the pop-out correctly restore the editor to its normal bench-view spot with no duplication
or loss; does each pop-out's default zoom look centered (not cropped to one side) on typical viewport
sizes; readability of the ~46vw editor column on smaller/laptop screens.

**Fast-follow same session**: user asked for a 3-column layout — editor tabs/sliders on the LEFT of the
rocket, mission-fit readout on the RIGHT, rocket still visible in the middle (manipulate left, read
results right). Split the single wide aside into `#vehPopEditor` (left, `.vehpop-stats.wide.left` — same
46vw sizing, border flipped to the right edge) and `#vehPopStats` (right, back to the original narrow
300px rail, since the readout no longer shares space with the editor). New progressive-degradation step:
the editor rail alone hides under 900px width (before the existing 760px cutoff that hides both asides),
so a squeezed pop-out drops the editor first and still shows rocket + readout. No JS logic changes beyond
the DOM target ids — `closeVehPopout()`'s restore-by-id-and-remembered-home code was already agnostic to
which aside currently holds the nodes. Suite unchanged at 837/849 (same pre-existing unrelated failure).

## Session — Vehicle bench: faint blueprint-paper background (2026-07-11)

**Implemented, tests passing, not yet committed/pushed.** User asked for the vehicle bench's background
to look like a very faint blueprint. Scoped to `.bench-rocket` (`#vehicleCard`, the card the rocket sits
in) rather than the whole `#benchView` — every other card in the bench (editor tabs, readout) is opaque
(`.card{background:var(--panel)}`), so a background on the outer view would only be visible in the ~16px
gutters; the rocket card is where the negative space actually reads. New CSS-only `background-image`: a
fine 10px grid + a coarser 50px grid, both using `color-mix(in srgb, var(--readout) N%, transparent)`
rather than hardcoded blueprint-blue — reuses the game's own existing "technical/telemetry" cyan accent,
so it re-tints automatically across every theme (default/green/beige) and all 4 visual eras with zero
extra per-theme CSS. Pure CSS, no JS/build-output-size(script) change. Suite unchanged 837/849 (same
pre-existing unrelated failure). Not extended to the vehicle pop-out's rocket stage — easy follow-up if
wanted, deliberately left out since the ask was specifically "the vehicle bench."

**Fast-follow same session**: user wanted the AUTHENTIC blueprint look — dark navy, not a theme-tinted
accent, with white (not cyan) gridlines. Swapped the `color-mix(var(--readout)...)` approach for a fixed
`background-color:#0b2545` (blueprint navy, deliberately NOT theme/era-reactive — real blueprints are
always this color) + `rgba(255,255,255,...)` white gridlines. Confirmed safe: every theme/era in this game
uses light ink text on dark panels (no light-background themes exist), so white-on-navy stays legible
everywhere without a per-theme contrast check. Suite unchanged 837/849 (same pre-existing failure).

**Root-cause fix same session**: user reported only seeing a border effect, not the background behind the
vehicle itself. Real cause — the bench's rocket preview actually renders via a **Phaser scene**
(`VehScene`, hosted in `#vehHost`) whenever Phaser is available (`startVehPreview`/`phaserOK()`), which
is the case in virtually every real browser; the plain `#vehiclePreview` 2D-canvas path (which already
correctly `clearRect`s to transparent, showing CSS through fine) is only a fallback that real users rarely
see. Phaser's canvas is `transparent:false` with its own `setBackgroundColor('#0a1016')` — fully opaque,
painting over the CSS blueprint background everywhere except the card's own margins outside the canvas
(which is what read as "just a border"). Fixed by drawing the SAME navy + white grid inside the Phaser
scene itself (`this.cameras.main.setBackgroundColor('#0b2545')` + a Graphics-drawn 20px/100px grid at
2× internal resolution, matching the CSS's 10px/50px visual spacing once scaled down for display),
added once in `create()` before the stars/rocket layers so it sits as a static backdrop. Also recolored
the drag-readout label's background chip from near-black to the matching navy for consistency. Not a
regression — pop-out unaffected (it uses the plain 2D-canvas path, not this Phaser scene). Suite unchanged
837/849 (same pre-existing failure).

**Fast-follow same session**: extended to the vehicle pop-out too, on request. `#vehPopStage` (unique id,
so this doesn't leak onto the station/map/earth/cc pop-outs which share the same `.vehpop-stage` class)
gets the identical navy+grid CSS. Simpler than the bench fix — the pop-out's canvas (`drawVehPopout` →
`drawVehiclePreviewTo`) is a plain 2D canvas that already `clearRect`s to transparent every frame (it
never had the Phaser-opaque-background problem), so plain CSS was sufficient, no JS changes needed. Suite
unchanged 837/849 (same pre-existing failure).

## Session — newspaper front pages, research-completion notice, countdown voice, external audio (2026-07-12)

**Newspaper pop-out (backlog #97/E1.6), Slices A–C, all shipped.** `showMilestoneModal` (sim.js) re-skins
into a full "Agency Wire" front page (`frontPageHTML`, render.js) for any authored first with `m.rep>=15`
(the Chronicle's existing significance bar) — rep<15 firsts keep the original compact modal, byte-identical.
Slice A reused the front-page entry `showMilestoneModal` already files via `pushFrontPage`, no duplicate
copy. **Slice B**: the crewed-catastrophe budget-hearing modal now leads with a DISASTER front page (merged
into the existing hearing modal rather than a second pop, since a standalone modal would've collided with
the always-fired hearing without touching `finalizeLaunch`/`finish()` control flow); epoch `victory*` modals
gained a "Read the front page ▸" link (these previously filed no Chronicle entry at all — now they do, so
landmark firsts are browsable in the Chronicle for the first time); the Chronicle's own browser
(`showFrontPage`) now shares the same renderer instead of a fourth parallel path. **Slice C-visual**: the
newspaper modal got its own much larger size class (`max-width:960px;width:95vw`, vs the standard 440px/
680px modals) plus 4 distinct era-reactive looks reusing the existing `body.era-*` visual system — heavy
sepia halftone (Apollo), lighter grain + one green spot-color kicker (80s), glossy full-color magazine
(90s/2000s), clean sans-serif card with a fake browser-chrome bar + mock URL (spacex/modern). Early-era
paper colors are hardcoded light/cream regardless of the era's dark console palette (deliberate — a
newspaper is a physical light object). **Slice C (filler)**: `NEWS_FILLER[]` (data.js, mirrors
`CONTRACT_ARCHETYPES`' shape) — 5 state-derived archetypes (rival claim count, staff callout, facility
note, market sentiment, public mood) render as 1-2 below-the-fold briefs on real editions only (milestone/
disaster/victory, NOT Chronicle replays — replays stay static since re-rolling live state onto a historical
entry would be anachronistic). Filler is never persisted. All wired through `showModal`'s existing ESC
path, zero new interrupts anywhere in the chain. Suite: era-visual 56/56, regression 18/18, esc 36/36,
save 34/34, plus dedicated smoke suites per slice.

**Research-completion notice.** `completeResearch` (sim.js) previously only logged to the ops timeline —
now also queues a compact (non-newspaper) modal via `queueResearchNotice`/`maybeShowResearchNotice`,
draining `_pendingResearchDone` at the end of `stepTime` so a multi-node batch (e.g. a fast-forward) yields
one notice listing all completed nodes, not one popup per node. Gated behind the existing `_pending*`
decision chain and any open modal — never stacks. Reuses the tech tree's own node `desc` copy verbatim, no
new content written. Shows regardless of `animEnabled` (the point was visibility). `test-research-notice.js`
14/14.

**Countdown voice (backlog #35/E1.6), Slices A–B.** User chose tones-only over `speechSynthesis` (the pad
phase is only 1.76s of countdown — real spoken numbers would've required extending `PAD_PHASE_MS`, rippling
into `test-pad-a.js`'s pins). **Slice A**: new global sound toggle (`ov_sound`, Settings menu — first mute
control the game has ever had) + a real top-level `sfxBus` master gain all SFX route through (fixed a bug
where `sfxSep`/`sfxBoom`/`sfxSplash`/`sfxBurn` bypassed the mixer straight to `destination`); countdown
blips (988Hz) on each T-4→T-1 label change plus a liftoff confirm tone (1319Hz), via new `sfxBlip()`.
**Slice B**: the existing weather go/no-go pad-start hold reskinned as "HOLD AT T-31s — WEATHER GO/NO-GO"
(mechanics untouched) with a distinct low hold tone (392Hz), fired once per hold via a guard flag. Zero
pad-phase timing changes either slice — `test-pad-a.js` 34/34 both times. `test-sound.js` 12/12 (Slice A).

**External audio asset pipeline, Slices 1–2 (first binary assets this project has ever shipped).** A
tech-lead scoping pass + a real Firefox `file://` test (this session's first use of the new "launch real
firefox.exe via WSL interop" convention, not headless Playwright) settled the mechanism: `fetch()`/
`decodeAudioData` is blocked on `file://`, and — confirmed by ear, not just by absence of errors —
`createMediaElementSource` is silently muted on `file://` too. Real clips play via a bare `<audio>` element
`.play()` **outside** the Web Audio graph, so `assets/` lives alongside `orbital-ventures.html`/`index.html`
in the repo root with no build-time path rewriting, and mute is a second parallel path (`el.muted =
!soundOn`) rather than routing through `sfxBus`. **Slice 1**: plumbing only — `AUDIO_CLIPS` manifest,
`playClip(key, fallback)` (lazy per-key `<audio>` cache, falls back to the procedural equivalent on missing
file/load/play failure, headless-safe via an `Audio!==undefined` guard), proven with a synthetic
placeholder tone (never a copied system sound — clean licensing) wired to the T-31 hold. **Slice 2**: two
real NASA clips (public domain, official nasa.gov hosting) — Apollo 11 "We have a lift-off" (~25s) for the
Apollo visual era, STS-135 "Countdown to Launch" (~20s) for 80s/90s2000s/spacex. Both clips are 10-25x
longer than the pad phase, so playback is deliberately decoupled from the pad-phase timer — the clip runs
its natural length as an audio bed under ascent/coast, never gated at `padU>=0.96`/liftoff. New `stopClips()`
added to every overlay-close path (`dismissAnim`/`skipAnim`/`scrubLaunch`/`endAnim`'s non-hold close) so a
skip/dismiss doesn't leave a 20+ second clip playing — this wasn't needed for Slice 1's 350ms placeholder.
`assets/CREDITS.md` tracks source/license/date per file. **Known gap, not blocking**: STS-135's 2011 audio
is a weak thematic fit for the `spacex`/modern era (apollo/80s/90s2000s are well-matched) — a 3rd clip for
the modern era is the natural next step. `test-sound.js` 19/19, pad/decision-panel suites unaffected.

**No SAVE_VERSION bump anywhere in this session** — everything above is presentation, transient
notification state, or `localStorage` preferences, no new persisted save-game fields.

**Correction, same day:** the external audio pipeline above (Slices 1-2 + the "every launch" trigger fix)
was **fully reverted** at user request — they didn't want the specific Apollo-11-named real clip in the
game. `AUDIO_CLIPS`/`playClip`/`clipCache`/`stopClips` (shell.js) and the entire `assets/` folder (both
mp3s + CREDITS.md) were deleted; confirmed by grep, zero references remain anywhere including the built
output. The pad-phase-start audio cue is back to purely procedural: `sfxBlip(392,0.55,0.13)` fires once per
launch via a `_padStartCue` guard (renamed from `_countdownClipPlayed`), same trigger point (top of
`drawPad`, every launch) the "every launch" fix had just established — so the *behavior* the user asked for
last (a cue on every launch) is preserved, only the *content* is synthesized again instead of real audio.
Countdown voice (backlog #35) is therefore back to tones-only end-to-end: Slice A (toggle + blips + liftoff
tone) + Slice B (T-31 hold reskin), no external-asset dependency. `test-sound.js`/`test-decision-panel.js`
updated to match (no clip-specific assertions remain). If real audio is revisited later, don't just re-add
the Apollo/Shuttle clips — source something the user is comfortable with first.

## Session — E0.3 Slice 0: dirty-flag rendering snapshot harness (2026-07-12)

**Planning pass (tech-lead) revised the roadmap's original E0.3 framing.** The two named bugs (focus/scroll
loss in re-rendered panels, time-warp GC churn) don't need a full per-region dirty-flag architecture — both
are fixed by one `setHTML()` helper (skip the DOM write when the string is unchanged; capture/restore focus
+ scroll on a real write). Migrating all ~158 `render()` call sites to `invalidate(region)` was rejected as
over-scoped: nearly all of those sites are cold (once-per-click), safe, and correct to leave calling
`render()` forever — only the 1Hz warp tick is actually hot. A thin region layer is still worth building,
but only so the *future* ops-density feature (simultaneous-mission widgets) has somewhere to register named
subregions later; it doesn't need to be exhaustive now. Revised slice plan: **0** snapshot test harness
(this session) · **1** extract `render()`'s body into ~9 named regions + `renderAll()`/`invalidate()`, with
`render()` staying a permanent alias for `renderAll()` so all existing call sites keep working untouched ·
**2** `setHTML()` memoize + focus/scroll fix — the slice that actually fixes the bugs · **3** (optional,
small) migrate just the warp-tick hot path + a few exemplar cold sites · **4** deferred until ops-density
is a real feature. Roadmap's real deliverable is Slices 0–2; 3–4 are discretionary.

**Slice 0 (snapshot harness) DONE, tests passing, not yet committed/pushed.** New
`tests/test-render-regions.js`: defines the region→container-id map Slice 1 will extract `render()`'s body
into (topbar/badges/railLeft/railRight/objective/log/scene×5-tabs/modal, representative ids not exhaustive
— written down once in the file as the authoritative reference for Slice 1), scripts a playthrough (boot,
all 5 tabs, 3 years of time advance, an infra-modal open/close), and asserts `render()` is idempotent —
calling it twice back-to-back with no state change in between produces byte-identical output for every
inspected id. 21/21 checks.

**Found and worked around three real gaps in the existing harness/suite while building this — all fixed
locally in the new test file, nothing shared touched:**
- `document.getElementById` (harness.js) returns a fresh, memory-less stub every call by design (production
  code only ever writes to the DOM, never reads back) — so no prior test could actually inspect rendered
  content. Added a scoped memoizing cache in the new test file for just the ids it inspects; every other id
  keeps the harness's original behavior.
- The stub's `.innerHTML=''` never clears `.children` — an `appendChild`-based renderer (`renderLog` does
  `box.innerHTML=''` then appends real row nodes) accumulated children forever across repeated `render()`
  calls once an element was memoized. Patched the memoized instances' `innerHTML` setter to also clear
  `.children`, matching real DOM semantics.
- **`setTab()` defers the actual `state.tab=t; render()` behind a 150ms `setTimeout`, gated on finding a
  `.viewport` element** (for the tab-fade transition) — the harness's `document.querySelector` always
  returns a truthy stub, so `setTab()` **always** takes that async branch under the harness, and a
  synchronous `render()` called right after is still rendering the OLD tab. This means every existing
  test's `setTab(t); render();` pattern (e.g. `test-regression.js`'s per-scene loop) has never actually
  rendered the target tab — `test-regression.js`'s check there is `check('render scene '+t, true)`, a
  trivial always-pass, so this was never caught. Worked around locally with a `gotoTab()` helper that goes
  straight to `state.tab=t; render()` (the same synchronous path `setTab()` itself takes when `.viewport`
  is absent). Not fixed in `test-regression.js` or `harness.js` — out of this slice's scope — but worth
  knowing before trusting any existing "renders every tab" test as real coverage.
- Also discovered (and correctly treated as intentional, not a bug): render.js's module-level `_texSeq`
  counter mints a fresh numeric suffix on every call for SVG gradient/texture ids (`sun0`, `sun0h`,
  `texmars3`, ...) specifically so a live browser never reuses a stale cached gradient across a re-render —
  expected to differ between any two `render()` calls. Normalized these out (regex strip) before comparing
  rather than treating the diff as a failure.

Full suite re-run after this slice: 21/21 new, all 37 other test files unaffected, same single
pre-existing unrelated `test-progress-unify.js` shortfall as before this session. No SAVE_VERSION bump
(pure test code, zero product-code changes). **Next: Slice 1** (extract `render()`'s body into the named
regions as pure code motion, validated against this suite's snapshots).

## Session — E0.3 Slice 1: render() → named regions, pure code motion (2026-07-12)

**DONE, tests passing, not yet committed/pushed.** `render()`'s ~90-line body (render.js) is now 12 small
functions, each tagged with one of the 8 region names from Slice 0's snapshot map (`chrome`, `badges`,
`topbar`, `railLeft`, `railRight`, `scene`, `objective`, `log`, `modal`) in a `RENDER_REGIONS` array, run in
**exactly the original statement order** — zero reordering. Some region names tag two non-adjacent
functions (`chrome` and `topbar` each appear at two points in the original flow, `scene` splits into a
command/bench/contracts dispatch and a later rnd/map/station dispatch, because `renderNextObjective()`
originally sits between them) rather than force a single contiguous block per name — preserving today's
exact execution order took priority over tidy grouping, since `syncTopbarH()`/`updateTimeArrows()`
(`renderTopbarLayout`, kept last) depend on every other region having already written its content, per the
Slice 0 planning pass's explicit warning about layout-order dependencies.

New `renderAll()` runs every function in `RENDER_REGIONS` in order (identical to the old `render()` body,
plus the same `RETIRED_TABS` migration preamble). New `invalidate(...names)` runs only the functions whose
tag matches, in the same relative order — a strict subset of `renderAll()`'s work, so the two mechanisms
can never disagree or drift apart. **`render()` itself is now a one-line permanent alias for `renderAll()`**
— every one of the ~158 existing call sites across the codebase needed zero changes and keeps working
forever; nothing calls `invalidate()` yet (that starts in a later slice, scoped to the warp-tick hot path
per the Slice 0 plan). No new dead code either: `renderCCLeft`/`renderRailPersistent`/`renderNextObjective`/
`renderLog` are pre-existing standalone functions, just registered directly as region entries rather than
wrapped.

**Validation:** Slice 0's `test-render-regions.js` — 21/21, byte-identical to pre-refactor (the actual
region-by-region diffing the roadmap item asked for). Full suite: same single pre-existing unrelated
`test-progress-unify.js` shortfall (24/34, unchanged pass count from before this slice), all other 36 files
green. No SAVE_VERSION bump (pure render-layer code motion, no persisted-state change). **Needs a real-
browser check**: general smoke pass across all 5 tabs, time-warp, and an open modal — this slice should be
indistinguishable from before by design, so "nothing looks different" *is* the pass condition.

**Next: Slice 2** — `setHTML(el, html)` with memoized last-written-string skip + focus/scroll capture-
restore, the slice that actually fixes E0.3's two named bugs (focus/scroll loss, warp-tick DOM churn).

## Session — E0.3 Slice 2: setHTML() memoize + focus/scroll fix (2026-07-12)

**DONE, tests passing, not yet committed/pushed. No SAVE_VERSION bump** (pure render-layer behavior,
no persisted state). This is the slice that actually fixes E0.3's two named bugs.

**New `setHTML(el, html)` (render.js)**: skips the `.innerHTML` write entirely when `html` is byte-
identical to what that exact element was last written with (cached in a `Map<element,string>` — never
reads `el.innerHTML` back, per the planning pass's warning that re-serialization doesn't round-trip
byte-identically). On a real write, captures `document.activeElement` (+ its selection range, if it's
inside `el` and has an id) and the scrollTop of `el` itself plus any id-bearing scrollable descendant,
restoring both after the rewrite. **Cache-clear-on-load guard**: `newGame()`/`applyLoadedSave()` both
reassign the top-level `state` variable to a fresh object (confirmed by reading both — `state = {...}`
in sim.js, `state=saved` in save.js), so `setHTML` compares `state`'s identity against the state it
last saw and wipes its cache on any mismatch — zero changes needed in sim.js/save.js, no risk of a
stale string from a previous game silently surviving a new game or a load.

**Routed through `setHTML` this slice** (the always-on regions + one bench panel, per the Slice 0
plan's "sweep incrementally" instruction — not all ~97 innerHTML sites):
- `renderNextObjective` (`nextObjStatus`), `renderOutliner` (`outlinerCard`, both its empty- and
  populated-state writes), `renderRailPersistent`'s per-section accordion body write (covers all 4
  rail sections — Mission Control/Design Bench/Programs/Contracts — through the one shared line).
- `readoutCard`, the bench mission-fit card — both its non-profile (`renderReadout`) and profile-
  mission (`renderProfileReadout`) writers.
- `showModal` (sim.js): this is where the actual "modal jitter" bug lived — `render()` re-invokes
  `activeModal()` (→ `showModal` again) on **every single tick** while a deep-view modal is open, so
  the body was being fully rebuilt and the entrance animation (`.modal-entering`) was replaying on
  every re-render, not just the genuine open. Routed the body write through `setHTML`, and moved the
  entrance-class-add + initial-focus-grab to fire only on the closed→open transition (`!wasOpen`) —
  consistent with the trigger-focus capture immediately above it, which already made that exact
  distinction for a different reason. This was speculated as a real bug when Slice 0's snapshot test
  was being written and is now confirmed and fixed.

**`renderLog` (`opsTimeline`) is a scroll-only fix, not routed through `setHTML`.** It builds real DOM
nodes via `document.createElement`+`appendChild` with actual JS-closure `onclick` handlers (not the
rest of the codebase's `onclick="fn('id')"` attribute-string convention), so there's no single html
string to memoize against. Wrapped the whole function body in a capture-before / restore-in-`finally`
of `opsTimeline.scrollTop` instead — covers both early-return paths (collapsed, empty-after-filter)
and the normal fall-through. This directly fixes the "scroll the log during warp" bug without touching
the function's internals or risking the closure-based nav handlers.

**Known, deliberate non-fix: range-slider drag continuity on the bench.** Investigated whether the
bench's `type="range"` sliders (`oninput="setProp(...);render()"`, fires continuously while dragging)
suffer DOM-node replacement mid-drag, which can drop the browser's native mouse-capture on the slider.
Confirmed this is a *different* bug than what `setHTML` fixes — the html content genuinely changes on
every drag tick (the displayed value differs), so the memoize-skip can't help here by construction. Not
in scope for this slice; would need a lower-level fix (e.g. patching just the `value` attribute instead
of replacing the containing card) if it's ever a real complaint.

**Validation:** new `tests/test-sethtml.js` (9/9) — direct unit tests of the memoize-skip decision
(identical writes skipped, different writes go through, two elements don't share a cache slot) and the
newGame cache-clear trap specifically (writes the same string before/after `newGame()` and confirms the
second write is NOT skipped despite being identical, proving the state-identity guard actually fires).
Focus/scroll capture-restore itself isn't asserted here — the harness doesn't model
`document.activeElement` or a real browser's "`innerHTML=''` resets `scrollTop`" behavior, so that half
needs the real-browser checklist below. Slice 0's `test-render-regions.js`: 21/21, byte-identical to
pre-Slice-2 output (confirms none of the above changed *what* gets rendered, only *when*). Full suite:
39 files, same single pre-existing `test-progress-unify.js` shortfall (24/34, unchanged) and one
already-documented RNG-flaky file (`test-station-slice2.js`, 3/4 clean re-runs — unrelated to this
slice, its Mars delivery reliability roll).

**Needs a real-browser check**: (1) open a deep-view modal (Programs/Rivals/Personnel/Infrastructure),
let time run/warp with it open, and confirm the entrance animation no longer replays on every tick;
(2) scroll the ops-timeline log up while advancing time and confirm it stays put instead of snapping to
top; (3) type into the livery/blueprint name field and confirm nothing about typing feels different
(this was already probably fine per the `onchange`-not-`oninput` analysis above, but worth a real look);
(4) general smoke pass across all 5 tabs — this slice should be behaviorally invisible except for the
two fixes above.

**Next: Slice 3** (optional, small) — migrate the warp-tick hot path to `invalidate(...)` plus a
couple of trivially-scoped cold sites as pattern exemplars; explicitly not the remaining ~140 sites.
Roadmap's real E0.3 deliverable (Slices 0-2) is now complete — Slice 3/4 are discretionary polish.

## Session — Technical audit + H1/M1–M5 fixes (2026-07-13)

A focused technical-only second-pass audit (bugs / perf / memory / save integrity / error handling /
security / browser compat — design sections deliberately excluded, already triaged via
`EVALUATION-2026-07.md`). Full findings in **`TECH-AUDIT-2026-07.md`**. Headline: codebase in strong
technical shape (38/39 baseline, no state growth over a 15-year headless campaign, clean
rAF/timer/audio lifecycles, robust save architecture). All High/Medium findings fixed this session:

- **H1 (High) — stored XSS via save import**: `openVehPopout`'s title injected the user-editable
  `livery.name` into innerHTML unescaped (the ONE pop-out title sink that missed the `esc()` pattern —
  station's escapes correctly), and the import path applied `livery.name` with no length clamp, so a
  shared save file could execute script on pop-out open. Fixed: `esc(title)` at the sink +
  `applyLoadedSave` re-clamps `livery.name` (24) and `company` (48) as defense in depth. New suite
  `tests/test-livery-esc.js` (10 checks): esc() fundamentals, hostile-name-renders-inert at the real
  sink (captured via appendChild shim), import re-clamp, live-input clamp.
- **M1 — dead resupply badge**: the Station tab badge called `resupplyShortfall()`, a function that
  never existed (typeof-guarded → silently never fired). Replaced with a real check: any built
  facility starved or ≤2 mo provisions with no shipment en route. Probe-validated (off fresh / fires
  starved / suppressed while a logistics flight is in transit).
- **M2 — silent autosave failure**: `autosave()` swallowed write failures forever. Now counts
  consecutive failures, surfaces ONE in-game 'bad' log line at the 3rd (points at Export save),
  re-arms after any successful write.
- **M3 — forward-version load guard**: `loadSaveFromText` now warns + requires explicit "Load anyway"
  when `payload.v > SAVE_VERSION` (newer-build semantics could be misread, then corrupted on next
  write — the v34 months→days kind of change). `autoLoad` (Continue, same-browser canonical slot)
  applies but logs a visible warning instead — an interactive confirm doesn't fit that flow.
  Refactor: shared `_applySaveFromPayload()` extracted from loadSaveFromText's body.
- **M4 — mobile save gap**: forced flush rode `beforeunload` only, which iOS Safari/Android
  tab-discard frequently never fire; everything since the last time-advance (bench edits, purchases)
  was at risk. Added `pagehide` + `visibilitychange→hidden` flushes (`autosave(true)`, idempotent).
- **M5 — HEAD was red by design**: `test-progress-unify.js` (F4 forward test, documented) now
  self-skips with a visible `SKIP` line + exit 0 unless `RUN_F4=1`, so the full suite gates green and
  real regressions elsewhere stay distinguishable. Delete the skip header when F4 lands.

**Not fixed (Low, deliberate)**: L1 tech-pane window-listener orphaning on pane recreation, L2 setHTML
Map→WeakMap, L3 timeInterrupt() at flight-overlay open, L4 dead locals (`thrSL`, 2× `chk`, `isEng`,
unused `mapScene`/`stationScene` assignments). All small; folded into backlog-tier cleanup.

**No persisted-state change** — SAVE_VERSION stays 52 (the livery/company clamp is a load-time
transform, not a schema change).

**Validation.** `node --check` OK; ESLint no-undef over the full concatenation now clean except the
27 expected guarded-Phaser refs (the `resupplyShortfall` no-undef is gone). **40/40 suites pass**
(39 real + the F4 skip). New livery-esc suite 10/10. M1 probe 3/3. Not yet browser-tested: the M3
newer-version modal's layout and the M2 warning line deserve one real-browser look.

## Session — #38 Night launches, era-scaled (2026-07-13)

Backlog #38 (S/★, ungrouped) implemented: launches now roll a `night` flag (era-scaled chance,
`nightLaunchChance()` in data.js — 8% Pioneer era rising to a 32% cap by Commercial+, reflecting
early-program range/tracking limits vs. later routine night ops). Purely visual — no mechanical
effect on reliability, cost, or outcome.

- **Where it's rolled**: both real pad→ascent spec-build sites (`finalizeLaunch`, `buildDepartSpec`
  in sim.js) roll independently via the existing per-flight `rnd()` (same pattern as `rng.wind` etc).
  `openFlightForDecision` (flight.js) also rolls its own, for the case where a live-call/weather/
  rescue decision opens the overlay *before* the outcome is known — `finalizeLaunch`'s later spec
  then **reuses** that earlier roll (via `animState._openedForDecision`) rather than re-rolling,
  so `resumeFlightForDecision`'s `Object.assign` merge can't flip the sky mid-launch on a flight
  the player is already watching.
- **Visuals** (`drawAscent`, flight.js): night launches start the sky near-black with stars visible
  from t=0 (day launches still fade in stars after climbing past the dusk band) — same 3-stop
  gradient structure, no downstream code touched. Added ground-level xenon floodlight cones on the
  tower/pad apron, fading out on the same altitude envelope the pad structure itself already used,
  keyed off the existing `padGroundY`/`towerTop` geometry — no new layout math.
- **No SAVE_VERSION bump** — `night` lives only on the transient flight spec, never persisted.

**Validation.** `node --check` OK, lint clean (same 27 guarded-Phaser refs as baseline, no new
no-undef). New `tests/test-night-launch.js` (9/9): era-scaling bounds + monotonicity, sampled-rate
sanity check against the stated chance, both spec-build sites produce a strict boolean and can be
forced either way via rng, `drawAscent` renders without throwing at four altitudes with
`night:true` (using the harness's real canvas-stub, not a hand-rolled one), and the resume-reuse
guard. **41/41 suites** (40 real + the F4 skip). **Needs a real-browser check**: the floodlight
cones' angle/brightness read correctly against the dark sky, and a live-call decision mid-launch
genuinely doesn't flip day↔night on resume.

## Session — E1.7 shipped: space telescope standing program (2026-07-16)

Backlog #82 implemented per the E1.7 scoping entry above. Reused two existing patterns rather than
new mechanics: the passive-contract tick/expiry shape for the steady drip, the inquiry fund/decline
shape for fault events.

- **Seed**: a successful `space_telescope` (Orbital Observatory) flight sets `state.scienceProgram=
  {monthsLeft:TELESCOPE_TERM(60), sciPerMonth:TELESCOPE_SCI_BASE(2), health:100}` — one slot; a
  re-flight while one's already running just banks the normal one-time sciYield, no stacking.
- **`tickScienceProgram()`** (called from `tickMonthlyBoundary` alongside `tickPassiveContracts`):
  pays `sciPerMonth` into `state.science`, decrements `monthsLeft`, decays `health` by
  `TELESCOPE_HEALTH_DRAIN` (1.2/mo), rolls a 6%/mo discovery chance, clears the program at
  `monthsLeft<=0` (term complete, re-flyable) or `health<=0` (failed, re-flyable).
- **Discovery events**: 65% windfall (instant +8⚛, no decision — the steady-drip case stays a case
  needing a call, kept it a genuine decision), rest fault (`_pendingDiscovery`, fund/decline —
  `resolveDiscovery()` mirrors `resolveInquiry()` exactly). Wired into all four `maybeShowSetback`-
  style decision-priority chains as `maybeShowDiscovery()`, lowest precedence (the others are
  time-critical crises; this is routine upkeep).
- **Surfacing**: `commandSummary().scienceProgram` (data hook, no new UI yet — deliberately deferred,
  per the scoping note); Outliner row appears only when near-expiry (≤4mo) or degraded (health≤40),
  matching the existing passive-contract "only when it's actionable" convention.

**No SAVE_VERSION bump** — `state.scienceProgram` defaults to `null` lazily, same convention every
other optional field uses.

**Validation.** `node --check` OK, lint clean (27 guarded-Phaser refs, unchanged). New
`tests/test-science-program.js` (22/22): seeding shape, drip/decay math, both expiry paths, both
discovery-roll branches (rng forced via call-counted `Math.random` stub), both `resolveDiscovery`
branches, one-slot guard, and commandSummary/Outliner surfacing with and without an active program.
**40/42 suites** — 2 pre-existing failures (`test-era-visual.js`, `test-theme-sync.js`) unrelated to
this slice, inherited from work pushed since the last session (era pad-style/theme-color checks,
nothing E1.7 touches) — flagged, not fixed here.

**Needs a real-browser check**: the fault-decision modal styling, and that the Outliner row's icon/
color read correctly against the other rows.

## Session — Fable-framework evaluation + backlog additions (2026-07-16)

Code-grounded re-evaluation (UI/UX 6.5, Gameplay 8, Fun 7.5 → **7.3 weighted**, up from July's 7.0
on the flow-architecture/economy passes). One material gap surfaced: **no tutorial exists** — #24
("tutorial replay") presumed one that was never built; onboarding is only the advisor card +
drawing-board + detail toggle. Five new backlog items added (#106–#110): guided first launch (H),
header-stat tooltips, ~1280px desktop breakpoint (zero @media rules today), font-scale setting,
progressive CC deck. Path to 8+: #106, overlay C/D, sound pass, keyboard/reduced-motion — consistent
with the existing EA gate plus the tutorial gap.

## Session — E1.8 slices A+B shipped: Base Bench (2026-07-16)

#111 implemented per scoping. New `⛰ Base Bench` rail scene + `baseView`/`railBase` panels; surface
facilities (body≠earth) now render on a horizontal ground-line SVG — modules side by side on the
regolith joined by pressurized corridors, body-tinted sky (LUNA: airless black + seeded starfield;
MARS: butterscotch), landing-shadow grounding, reusing `stationModuleSVG` art and the station
gradient defs verbatim. Own pan/zoom/expand state (`basePanX/Y/Zoom`, `wireBasePan`), locked/empty
state lists founding gates per facility. **The split**: `stationCurrentView` now filters to
`body==='earth'` — surface bases no longer appear as station-bench tabs; `baseCurrentView` owns
them. Stats panel reused via new optional `(focusId, focusFn)` params on
`renderStationFacilityStats` (station callers unchanged). Palette/spec-cards/docking reused
verbatim (already facility-generic). Slice C (surface-specific modules, #112) and D (blueprint
board) not started.

**No SAVE_VERSION bump** — only `state.baseFocus` added, lazily defaulted.

**Validation.** New `tests/test-base-bench.js` (22/22): facility split both directions, focus
fallback, locked-state gates, both body palettes render (stars/corridors/gradient reuse asserted),
stats-panel reuse routes to `setBaseFocus` with correct highlight, zoom clamp + state independence,
end-to-end renderBase locked+active. `test-station-popout.js` updated to the split semantics (focus
exercise via a second orbital facility + explicit split assertion; surface side owned by the new
suite). **41/43** — the 2 pre-existing failures (era-visual, theme-sync) remain untouched.
**Flakiness found (not fixed, out of scope)**: `test-station-slice2.js` Mars-e2e fails ~2/6 runs on
unseeded rng (advance-month event rolls occasionally interfere with the arrival pump) — predates
this slice; worth a seeded-rng harness pass someday.

**Needs a real-browser check**: ground-line composition/colors on both bodies, corridor joints at
odd zoom levels, rail button icon rendering.

## Session — E1.8 slice C shipped: surface base modules (2026-07-16)

#112 implemented. Four surface-only modules added to STATION_MODULES with `surface:true`: ISRU Plant
(fuel, `lunar_isru`-gated), Surface Reactor (24 kW day/night, `surface_fission_power`-gated,
resupply-cut 10%), Habitat Dome (4 crew, the surface Habitat), Rover Garage (field science). Wider/
shorter hulls than orbital cans. Existing modules are implicitly orbital (no flag).

**Filtering**: `renderStationPalette` now branches on `cur.def.body` — orbital benches hide
`surface:true` modules; surface benches hide the orbital-only berth-sphere Node (`node_hub`) but keep
the shared five (Habitat, Lab, Power Truss, Depot, Greenhouse). **Gate enforcement**: new shared
`moduleFacilityCompatible(def, md)` predicate called by all three acquire-gates
(`canAddStationModule` / `canContractStationModule` / `canFlyModuleDelivery`) so a save-edit or stale
delivery offer can't mount an incompatible module — the palette filter alone isn't a security
boundary.

**No SAVE_VERSION bump** — modules are content, moduleLists already persist.

**Validation.** New `tests/test-surface-modules.js` (34/34): definitions + surface flag, the compat
predicate matrix (surface↔orbital both directions, shared modules on both), palette filtering both
benches, all three gates rejecting incompatible pairs + accepting valid ones, and the surface SVG
rendering a base full of the new wide modules. **42/44** — same 2 pre-existing failures untouched.
Slice D (blueprint board for surface bases) remains optional/unstarted; E1.8 is otherwise complete.

**Needs a real-browser check**: the wider surface-module hulls' proportions on the ground line, and
that ISRU/Reactor read as distinct silhouettes from the orbital cans.

## Session — E1.8 slice D shipped: Base Bench blueprint drawing board (2026-07-16)

Final slice of #111. Pre-facility drawing board, parity with the Station Bench's ("dreaming is free")
draft mode — one blueprint per surface body (`state.baseDraftByBody.moon`/`.mars`, independent lists,
toggled in-view via Luna/Mars tabs) since a lunar outpost and a Mars settlement are different designs,
unlike the Station Bench's single orbital facility type. `baseCurrentView()` now returns
`{isDraft:true}` before any surface base is founded; `renderBase()` routes to the new
`renderBaseDraft()` in that case.

**Reuse, not duplication**: `draftAdd`/`draftRemove`/`draftClear` now dispatch on `state.tab==='base'`
to `draftAddBase`/etc — `stationModuleCard`'s hardcoded `onclick="draftAdd(...)"` needed zero changes,
so both benches' draft modes share one card-rendering codepath. `renderStationPalette`'s slice-C body
filtering applies automatically. `renderBaseSurfaceSVG` reused verbatim for the draft preview.

**Bug found and fixed while wiring this**: slice C's exclusion of `node_hub` (the orbital berth-sphere,
the only port-expanding module) from surface benches left surface bases hard-capped at
`STATION_PORT_BASE` (4) forever, with no reachable growth module — would have made slice D's draft
mode unusable past 4 modules. Fixed at the source: `facilityPortCap(fs, def)` now takes the facility
def and returns `Infinity` for any `body!=='earth'` facility — ports are an orbital-assembly metaphor
(finite berths on a stack) that doesn't apply to a ground base spreading out. Threaded `def` through
all 7 call sites (3 in sim.js's gate functions, 4 in render.js); caught and fixed two `ReferenceError`s
(`def` not in scope) the mechanical thread-through introduced in `draftAdd`/`stationDraftStatsHTML` —
station draft is always orbital, so both now pass `undefined` explicitly, unchanged behavior.

**No SAVE_VERSION bump** — `state.baseDraftByBody`/`state.baseDraftBody` lazily default.

**Validation.** New `tests/test-base-draft.js` (23/23): the port-cap fix directly, per-body draft
independence, dispatch routing both directions (base tab doesn't touch station draft and vice versa,
regression-guarded), the station-draft 4-cap still enforced without a Node, cost preview, stats
messaging, `renderBaseDraft` end-to-end for both bodies, and the draft→founded lifecycle transition.
`test-base-bench.js` updated for the empty-state change (draft mode replaces the old locked view).
**43/45** — same 2 pre-existing failures (era-visual, theme-sync) untouched. **E1.8 is now complete**
(#111 all four slices, #112 slice C content).

**Needs a real-browser check**: Luna/Mars tab toggle interaction, draft SVG at zoom, and the
unlimited-module claim rendering sensibly at high module counts (ground-line width/scroll behavior
untested past ~6 modules).

## Session — E3.0 shipped: part-graph model + physics bridge (2026-07-16)

The make-or-break slice of the E3 epic, and it **passes**. New `src/parts.js` (loaded after data.js,
before sim.js, in the build order) holds: `PART_DEFS` (viable set — tank, decoupler, engine, capsule,
nosecone, probe core — with attach-node classes, footprints, and a real `phys` block), the
`state.build` part-graph model (`{parts, links, root}`), spine/tree traversal, and **the bridge**:
`buildToStageIR(build)` walks the spine top→bottom, splits into stages at decoupler boundaries, and
emits the exact `{eng, count, prop, dia}` stage array + payload that the existing
`stackPerformance`/`stageMasses` physics core already consumes — so `computeVehicle()`'s deep contract
(materials, doctrines, heritage, recovery, families, difficulty) is **reused, not rewritten**.
`sliderDesignToBuild()` is the reverse map (used by the E3.5 save migration and, now, the equivalence
harness). Everything is behind `BENCH_V2=false` and reachable only from tests — zero live-game wiring
this slice, exactly the parallel-flag plan.

**The proof.** `tests/test-parts-bridge.js` (31/31): builds slider designs, converts to graphs,
reduces graphs back to stages, and asserts Δv / liftoff mass / stage-1 TWR / every per-stage Δv match
the direct slider path within tolerance — across single-stage uncrewed, two-stage crewed, and
three-stage clustered designs. Plus graph-integrity (spine length, decoupler count = stages−1, firing
order preserved), malformed-build handling (empty / payload-only / tank-without-engine all error
cleanly), and IR determinism. Sabotage-verified out-of-band: doubling a stage's prop in the graph is
caught, so the harness genuinely discriminates.

**No SAVE_VERSION bump** — nothing persisted yet; `state.build` doesn't exist in live saves until
E3.5. **No behaviour change** — the old bench is untouched and still default.

**Validation.** `node --check` OK, lint clean (same 27 guarded-Phaser refs). **43/46** — the 3 failures
are all pre-existing and unrelated (era-visual, theme-sync, and the known rng-flaky station-slice2,
confirmed flaky this run: FAIL/FAIL/PASS across 3 runs).

**Next:** E3.1 (read-only 2D bench render of `state.build`) is mechanical once the model exists —
lighter model fits. The remaining physics-depth wiring (E3.4) and save migration (E3.5) are the other
substantial pieces.

## Session — E3.1 shipped: read-only part-graph renderer (2026-07-16)

Pure `renderBuildSVG(build, W, H)` added to `src/parts.js`: static SVG rocket drawn from `state.build`
— tapered nosecone, engine bell trapezoid, tank/generic cylinder with the same gradient-hull idiom
E1.8's `renderStationStackSVG`/`renderBaseSurfaceSVG` established, category-colored (structural/
propulsion/avionics/payload), plus a real per-stage Δv/TWR text overlay computed from
`buildToStageIR` → `stackPerformance` — the same numbers the E3.0 harness already proved equivalent
to the slider bench, not decoration.

**Refactor while wiring this**: extracted `spineGroups(build)` (split the spine at decoupler
boundaries) out of `buildToStageIR` so the physics bridge and the renderer share one source of truth
for "what counts as a stage" — `buildToStageIR` reverses it to firing order, the renderer walks it
top-down for label placement. Prevents the two from silently drifting on stage boundaries as parts are
added in later slices.

**Deliberate design choice, not deferred scope**: the renderer's error surface is intentionally
narrower than the bridge's — it draws any structurally valid spine (including a lone decoupler or an
engine with no tank) because a player needs to *see* a non-flying rocket to fix it; only unknown-part/
empty/no-spine are render errors, while "no propulsive stage" is bridge-only and just yields an empty
stage-label overlay. Test suite documents this explicitly rather than assuming parity.

**Still behind `BENCH_V2=false`, still zero live UI wiring** — this slice is a proven, tested pure
function, not a reachable view. Live wiring (a dev-flippable read-only tab) is deferred to E3.2, where
there's something interactive to actually look at; wiring dead markup into `shell.html` for a
permanently-invisible feature isn't worth the surface area yet.

**No SAVE_VERSION bump, no behaviour change.**

**Validation.** New `tests/test-parts-render.js` (24/24): every viable-set part renders standalone,
full 2-stage crewed build renders correct part shapes + stage-label count, overlay Δv/TWR numbers
verified against real `stackPerformance` output (not just "doesn't throw"), single-stage label count,
malformed-build handling (with the narrower-contract distinction explicit), geometry sanity (no NaN/
negative dimensions), and symmetry (`sym>1`) tolerance ahead of E3.3. Re-ran `test-parts-bridge.js`
after the `spineGroups` refactor — still 31/31, no regression. **44/47** — same 3 pre-existing
failures (era-visual, theme-sync, rng-flaky station-slice2), none related.

**Next:** E3.2 (drag-drop editing — palette, snap-to-node, ghost preview) is the first slice where
live UI wiring actually earns its keep. Large (L); design/interaction work — heavier model likely
worth it for the snap/validation logic, though the palette-card rendering itself is mechanical.

## Session — E3.2 shipped: drag-drop part editing (2026-07-16)

The first live-reachable slice of the part bench (still `BENCH_V2`-gated). Built in two layers:

**Model layer (pure, headless-tested — the risk).** Added to `src/parts.js`: `openNodes` (occupancy-
aware), `nodesCompatible` (diameter-class match + opposite-facing rule — hard block on mismatches),
`canAttach` (with reasons), `attachPart`/`detachPart` (detach takes the whole subtree, KSP-style,
never the root), `findSnapTarget` (nearest open compatible node, taking a node-position lookup as a
callback so it stays pure), and `buildWarnings` (soft, non-blocking — e.g. no-avionics). All 29 checks
in `tests/test-parts-attach.js` green before any DOM existed.

**UI layer (DOM controller).** Palette (`renderPartsPalette` — 4 category groups, draggable cards with
real stats pulled from ENGINES for engines), and two placement paths both routed through `attachPart`:
click a part → attaches to the selected open node, or auto-targets when exactly one node is open (the
touch-friendly baseline that always works); or drag → drop snaps to the nearest compatible node via
`findSnapTarget` over the rendered `nodePos` map. `renderBuildSVG` gained an `interactive` mode that
emits open-node markers + a `nodePos` map for the snap layer. The SVG hit-target overlay is defensive
(wrapped so headless/partial-DOM can't throw — it's pure decoration).

**Wiring.** `benchView` gained a hidden `#benchV2` assembly UI (canvas + palette + live stats); the
bench render path shows it and calls `renderPartsBench()` only when `BENCH_V2` is on, else the old
slider bench is untouched and default. First slice where live wiring earned its keep (there's finally
something interactive to see when a dev flips the flag).

**No SAVE_VERSION bump, no shipped-behaviour change** (flag still false).

**Validation.** `test-parts-attach.js` (29/29 model) + `test-parts-ui.js` (23/23 interaction logic —
palette, auto-target, explicit-select, drop-snap commit, interactive-render markers). Re-ran the E3.0
bridge (31/31) and E3.1 renderer (24/24) — no regression. **47/49** — the 2 failures are the
pre-existing era-visual/theme-sync (station-slice2 passed this run, being the known flaky one).

**Deliberately deferred to polish/E3.6, not silently dropped:** pointer-drag ghost that follows the
cursor before drop (current drag uses native HTML5 dragstart/drop, which works but shows no live
snapping preview mid-drag); touch-drag (native dnd is mouse-only — the click-attach path is the touch
story for now). Both are feel-refinements on a working core, not blockers.

**Needs a real-browser check** (the reason this slice most wants human eyes — it's the first
interactive one): drag-drop actually snapping, node markers being tappable at real sizes, palette-card
drag ergonomics.

**Next:** E3.3 (auto-inferred + editable staging stack, symmetry tool). Mechanical-ish given the model
layer exists — symmetry is a `sym` field the bridge already multiplies; the editable fire-order stack
is new UI. Lighter model likely fine.

## Session — E3.3 shipped: booster folding + symmetry tool (2026-07-16)

**Scope narrowed honestly from the epic's original phrasing** — worth stating plainly. "Auto-infer
stage order from decouplers with an editable stack" turns out to have no legitimate free-reorder
interpretation for a single linear spine: `stackPerformance`'s mass-shedding model requires
bottom-fires-first order, so the auto-inferred order IS the only physically valid one. What shipped
instead: a **visible** auto-inferred stage list (engine/Δv/TWR per stage, in the stats panel) rather
than a fake reorder control that would produce nonsense physics. If the physics core ever grows
non-adjacent staging support, revisit — not expected to be worth it.

**What's real and useful: strap-on boosters + symmetry.** New `booster_solid` part (radial-only, uses
`ENGINES.solid_castor` — already documented in data.js as booster-usable), `tank_std` gained a radial
attach node. The bridge folds stage-0 radial boosters into the **existing** `state.boosters` side-
channel (`{eng,count,prop}`) rather than inventing parallel-timed staging the physics core has never
supported — `boosterMasses()` (sim.js) has always read a single global booster bundle that augments
stage-0's whole burn, so that's the honest integration point. `applySymmetry(build, uid, n)` sets a
clamped (1-4) `sym` field, rejected on non-radial parts (a spine part is singular, nothing to mirror).
New `stackPerformanceForBuild(build)` — the one function that touches `state.boosters` as a global,
always restored via try/finally even on error, isolated from the otherwise-pure bridge.

**Honest edge-case handling, not silent wrongness**: a booster attached to a non-first-firing stage
doesn't get silently dropped or misapplied — `buildToStageIR` warns explicitly ("Boosters only take
effect on the first stage to fire..."). Mixed booster types (not yet reachable with only one radial
node per tank, but the logic is in place) warn rather than averaging into physical nonsense.

**Two real bugs found and fixed while building this** (both the same mistake, in two places): a node's
*id* (e.g. `'rad'`) was being compared against the literal string `'radial'` instead of looking up the
node definition's `.at` field. Caught first in `applySymmetry` (never shipped), then discovered via a
failing test that `radialParts()` — defined in E3.0, unexercised until now — had the identical bug,
silently returning empty for every build regardless of radial attachments. Fixed both at the source.
Also fixed the E3.2 click-attach auto-target heuristic: it counted *all* open nodes rather than nodes
*compatible with the specific part being placed*, which broke the moment a part (the now-radial-
capable tank) had more than one open node type at once.

**Rendering**: booster silhouettes draw mirrored left/right of the spine (correct 2D-side-elevation
convention — a real N-way ring can only ever show two sides in profile), with a ×N label for sym>1.
Stats panel gained Liftoff TWR (where boosters actually show up — same convention the classic bench
has always used; per-stage Δv/TWR numbers don't reflect boosters, only liftoff TWR and total Δv do)
and a symmetry stepper UI on any placed radial part.

**No SAVE_VERSION bump, no shipped-behaviour change** (still `BENCH_V2`-gated).

**Validation.** New `tests/test-parts-staging.js` (31/31): booster def shape, folding into `ir.boosters`,
symmetry multiplying count, symmetry rejected on axial parts, off-stage-0 warning, mixed-type warning
logic, full numerical equivalence vs. directly setting `state.boosters` and calling `stackPerformance`
(proves the graph path produces identical Δv/liftoff/TWR/boostDv to the classic path), and global-state
restoration on both success and error paths. Re-ran all 4 prior E3 suites (110/110, zero regression) —
the auto-target fix and both radial-bug fixes are covered there and here. **47/50** overall, same 3
pre-existing failures.

**Epic status: 139 checks green across 6 suites (E3.0-E3.3).** Remaining: E3.4 (deeper physics — drag/
thermal/power from real per-part stats), E3.5 (save migration + cutover — the only slice that touches
shipped behavior), E3.6 (polish, optional).

**Next boundary:** E3.4 mixes real design judgment (how much of "deep physics" is worth modeling vs.
diminishing returns) with mechanical wiring. Worth a design pass on paper before coding — heavier
model for the scoping half, lighter fine for implementation once decided.

## Session — E3.4 shipped: per-part physics depth (2026-07-16)

The phys stats in PART_DEFS finally do something. **Hard constraint respected**: `stackPerformance()`
is the shared core the E3.0 equivalence harness locks against the slider bench — it MUST NOT change or
equivalence breaks. So every E3.4 effect is a pure, PART-BENCH-ONLY adjustment layered on top of
`stackPerformanceForBuild`, never touching `stackPerformance` or the slider path (test-parts-physics
section 3 asserts this isolation directly: raw stackPerformance is byte-identical before/after the
E3.4 path runs, and never gains a dragLoss field).

**Scope decided on paper first** (the design question this slice carried): of the four candidate stats,
two feed real physics, one is a warning, one is deferred with a reason —
- **drag (worth it)**: genuinely NEW physics — the existing model has gravity loss but never modeled
  aero. `buildAeroProfile` computes a bounded stage-1 Δv drag loss (≤6%) from the stack's largest
  cross-section × the top part's drag coeff + radial boosters in the freestream; a nosecone halves it.
  Rewards good aero design, which the drawing already shows.
- **control (worth it)**: E3.2 already WARNED on no-avionics; E3.4 makes it BITE — `buildControlProfile`
  returns a reliability multiplier (0.85 open-loop). The warning now names the penalty.
- **power (warning only)**: `buildPowerBalance` — avionics draw power; the probe core has a real draw,
  the crew capsule carries its own generation (fuel cells), so uncrewed-vs-crewed is a genuine power
  distinction and a deficit surfaces as a "systems run down" caution, never a Δv effect. Batteries as a
  real system is a future part, not this slice.
- **thermal (deferred, with reason)**: reentry survival is scripted per-mission-profile, deeply wired;
  retrofitting heat-shield parts into it is its own epic, not a slice. Explicitly out of E3.4.

**Small data additions**: probe_core gains powerDraw 0.3; capsule_mk1 gains powerGen 0.5 / powerDraw
0.3 (power-neutral). These are warning-inputs only — they do NOT feed the mass model, so the E3.0
equivalence harness is untouched (verified: bridge still 31/31).

Stats panel now shows drag loss (with nosecone hint) and the open-loop reliability note; buildWarnings
surfaces the power deficit and the sharpened no-avionics penalty.

**No SAVE_VERSION bump, no shipped-behaviour change** (still BENCH_V2-gated).

**Validation.** New `tests/test-parts-physics.js` (21/21). Two prior-suite checks correctly updated for
the intended divergence (render overlay + booster equivalence now expect the drag-adjusted numbers, and
separately assert drag is the ONLY difference from raw physics) — these were tests asserting the old
"part numbers == raw stackPerformance" identity that E3.4 deliberately breaks for part-built vehicles.
All 7 E3 suites green: **161 checks** (bridge 31, render 26, attach 29, ui 23, staging 31, physics 21).
**48/51** overall, same 3 pre-existing failures.

**Epic status: E3.0-E3.4 complete.** Remaining: **E3.5 (save migration + cutover)** — the ONLY slice
that touches shipped behavior: migrate every saved state.stages design + vehicle family to a build
graph, point the flight animation at the graph, retire the slider bench, flip BENCH_V2 on, SAVE_VERSION
bump. This is the high-risk slice (touches real player saves) and wants its own careful session. E3.6
(polish) optional after.

**Next boundary:** E3.5 is high-stakes migration work — heavier model strongly recommended, and worth
treating as its own focused session rather than a quick continue.

## Session — E3.5 shipped: save-safe migration (2026-07-16)

The one slice that touches real player saves. **Built deliberately NON-destructively** — the responsible
version of "cutover", chosen because a migration bug here corrupts real games irreversibly.

**Design: state.stages stays the source of truth; state.build is a DERIVED, additive companion.**
`stateDesignToBuild(st)` generates a part graph FROM the live slider design (defensive — returns null on
any problem, never throws); `migrateStateToBuild(saved)` calls it from `applyLoadedSave` AFTER state is
set, purely additively (never mutates state.stages). Consequences: the slider bench keeps working
unchanged; saves stay backward-readable by older builds; the graph is always regenerable so there's no
irreversible commit; flipping BENCH_V2 is a VIEW choice, not a data cutover. A true destructive cutover
(retiring state.stages) is explicitly NOT done — it would make saves one-way and a migration bug
unrecoverable. That waits until the part bench has shipped and proven itself in the wild.

`SAVE_VERSION` → 54 (additive: the derived build graph; safe to drop, regenerated on load). `benchBuild()`
derives from the live slider design on demand when no graph exists yet (fresh game), so the part bench
always reflects the current design.

**A real bug the parity check caught — the reason this slice earned its careful treatment.** The
end-to-end save→load→verify test flagged a Δv gap between a migrated graph and its slider source. Isolated
it to booster propellant: `buildToStageIR`'s booster-folding read `bdef.phys.propMass` (the part-def
default, 5) instead of the per-instance `_propOverride` (6) that migration stamps — so a migrated design
with non-default booster prop would have silently flown with wrong Δv. Fixed booster folding to honour
`_engOverride`/`_propOverride`. A physics-parity assertion (derived graph must fly the same Δv as its
slider source, at matched payload with drag added back) is now permanently in the migration suite across
four cases including the exact bug case.

**Save integrity proven end-to-end**: a real save→serialize→load cycle leaves state.stages byte-identical,
derives a correct 7-part graph, carries boosters, and the derived graph's physics matches the slider's
exactly (7064 = 7064 m/s at matched payload).

**Validation.** New `tests/test-parts-migration.js` (28/28): round-trip fidelity across real-shaped
designs, additive-only proof, never-throws on garbage, crewed/uncrewed roots, booster carry, idempotency,
version-bump backward compat, and the 4-case physics-parity guard. All 6 prior E3 suites green after the
booster-fold fix (161 checks). **50/52** overall, same 2 pre-existing failures. Epic total: **189 checks
across 8 suites.**

**Epic E3.0–E3.5 complete and save-safe.** BENCH_V2 remains OFF by default: the part bench is fully built,
tested, migration-safe, and dev-flippable, but not yet the shipped default — the honest state is "ready to
enable once it's had real-browser playtesting", not "silently switched on". E3.6 (polish — part tooltips,
blueprint view, undo/redo, the deferred cursor-follow drag ghost + touch-drag from E3.2) is optional.

**This is a natural stopping point for the epic** — everything shipped is safe and dormant. Enabling
BENCH_V2 as the default is a deliberate future decision that should follow real playtesting, not ride in
on a code session.

## Session — E3.6 shipped: bench polish (2026-07-16) — EPIC E3 COMPLETE

Optional polish slice. Undo/redo (deep-clone snapshots via `benchPushUndo`, capped at 40, redo stack
cleared on any fresh mutation), part deletion (`benchDeletePart` — removes a part + its whole subtree,
undoable, root-protected; the bench could add but not remove a specific part before), a blueprint/
schematic view toggle (cyan-on-navy CSS filter tint), and palette tooltips that carry each part's blurb
+ historical flavor (engines pull their heritage line from ENGINES, reusing the established voice). A
toolbar (undo/redo/blueprint) sits above the canvas. All routed through the single `benchPushUndo`
choke point so every edit is undoable without per-callsite bookkeeping.

**No SAVE_VERSION bump, no shipped-behaviour change** (still BENCH_V2-gated).

**Validation.** New `tests/test-parts-polish.js` (18/18): undo restores exactly, redo re-applies,
new-mutation-clears-redo, undo cap, delete+subtree+undo+root-protection, blueprint toggle, tooltip
flavor content, and deep-clone integrity (later edits don't corrupt history snapshots). All 8 prior E3
suites green. **51/53** overall, same 2 pre-existing failures (era-visual, theme-sync). 

**EPIC E3 (Part-Based Vehicle Bench) COMPLETE — all 7 slices E3.0–E3.6, 9 test suites, 207 checks.**
The part bench is fully built: parts-as-truth graph model with a physics bridge proven numerically
equivalent to the slider core, drag-drop editing with snap-to-node, boosters + symmetry, per-part
physics depth (drag/power/control), save-safe non-destructive migration, and polish (undo/redo/delete/
blueprint/tooltips). **BENCH_V2 remains OFF by default** — everything is built, tested, and migration-
safe, but enabling it as the shipped default is a deliberate decision that should follow real-browser
playtesting, not a code session. Backlog #113 (the epic) is done as scoped; flipping the flag is the
one remaining step and belongs to a human playtest pass.

**Recommended real-browser playtest checklist before enabling BENCH_V2** (the whole epic never ran in a
browser — headless-tested only): drag-drop snap feel, node marker tap sizes, undo/redo responsiveness,
blueprint view legibility, tooltip readability, and a full build→launch cycle confirming the derived
graph flies identically to the slider design it replaces.

## Session — #81 Sample-return market: bank vs sell decision (2026-07-17)

Backlog #81 ("Sample return market — sell/keep for science"), scoped to all 4 sciMission missions
(`space_telescope`, `sample_return`, `astrobiology`, `oort_precursor`), not just literal sample-return
flights. Prior state: each banked a fixed `sciYield` windfall automatically on its first flight (per the
explicit 2026-07-02 design note — "not a balance bug; intentional payout/knowledge tradeoff. Not
revisited."). This session doesn't touch that tradeoff's numbers; it adds a genuine choice on top of it.

**Design.** Reuses the inquiry fund/decline pending-decision shape (`_pendingInquiry` family) rather than
the in-flight-overlay decision panels (unified flight overlay Slice C — still not started, so nothing new
depends on it). `triggerSampleDecision(m, sciAmount)` fires in `finalizeLaunch` at the exact point the old
automatic `sciGain +=` line used to run — same gating (first flight only, not routine, not procedural),
same `sciYieldMult()`/`doctrineMult('sci')` multipliers, so the *computed* amount is unchanged from before.
The baseline per-flight `sciGain` (present on every successful flight regardless of `sciYield`) is
untouched. `maybeShowSampleDecision()` surfaces the modal from the same `finish()` choke point as
`maybeShowInquiry`/`maybeShowHearing`, gated behind setback/mishap/inquiry/hearing/rivalDisaster (lowest
precedence — good news, not a crisis). A same-tick double-trigger (two prestige flights resolving in one
batch of deferred arrivals) auto-banks the second windfall rather than clobbering the pending one or
losing it silently.

**Sell conversion.** New constant `SCI_SELL_RATE=0.5` ($M per ⚛ if sold). First-pass number, not a final
balance call: for `sample_return` (42⚛/$14M payout) selling roughly triples the flight's take; for
`oort_precursor` (120⚛/$1800M payout) the $60M sell value barely registers — selling is tempting early
when money is tight, banking wins naturally once it isn't. No SAVE_VERSION bump — `_pendingSampleDecision`
is transient, same as `_pendingInquiry`/`_pendingDiscovery`/`_pendingRescue`.

**Files.** `src/sim.js` only (mission data in `data.js` untouched — no new missions, just a decision layer
on the existing four). Rebuilt `orbital-ventures.html`/`build/game.js`/`index.html` via `node build.js`;
`node build.js --check` confirms parity.

**Validation.** New `tests/test-sample-decision.js` (29/29): mission-data dependency check (all 4
sciMission missions still carry `sciYield`; the procedural Deep-Space Sample Return contract still
carries none, by design), `triggerSampleDecision` open + amount math, double-trigger auto-bank,
`resolveSampleDecision` both branches + stale-pending no-op, and `maybeShowSampleDecision`'s full
priority-gate chain. Full existing suite (59 files) + `test-build-parity.js` (run standalone per its own
`require('../build.js')` design, not harness-concatenated) all green — no regressions.

**Not done / next:** BACKLOG.md #81 marked shipped. The `SCI_SELL_RATE=0.5` conversion rate is a first
pass — worth a real balance look once there's playtest signal on whether players actually sell early-game
prestige missions or always bank them out of habit.

## Session — #14 Pinned research goal: persistent path highlight (2026-07-17)

Backlog #14 ("Pin a research node as 'goal' → path highlight"). The tech tree already had transient
click-to-highlight (`techFocus`/`techPrereqChain`/`techHighlightSet`, from the 2026-07-02 tech-tree
interaction layer) — this makes it a standing pin instead of something that resets on every click
elsewhere, and adds real planning value on top (remaining-steps count, next-buyable-step callout).

**Design.** New persisted `state.researchGoal` (a RESEARCH id or null). `pinResearchGoal(id)` deliberately
works on **locked** nodes — pinning something several prereqs away and seeing the whole chain light up is
the entire point — and only refuses an already-researched node (nothing to plan toward) or an unknown id.
`techHighlightSet()` now falls back to the goal's chain when `techFocus` is null, so the tree opens with
the goal's path lit by default; any click still transiently overrides to that node's own chain (existing
behavior, unchanged), reverting to the goal view once focus clears. `researchGoalProgress()` walks
`techPrereqChain` to report `{goal, remaining, nextSteps}` — `nextSteps` is filtered to nodes whose state
is `'available'` right now, so the R&D rail can tell the player exactly what's buyable toward the goal
today, not just how far off it is. Surfacing: a 📌-marked band under the track-filter list in the R&D
right rail (`researchGoalBandHTML`, always visible regardless of what's selected — the "planning aid"
part), a 📌 marker on the goal's node in the tree itself, and a pin/unpin button in the research detail
panel (hidden once a node is done).

**Auto-clear.** `completeResearch()` checks the finishing node against `state.researchGoal` and, on a
match, logs `🎯 Goal reached: <name>!` and clears the pin — no stale pins sitting on already-done nodes
under normal play. `researchGoalProgress()` also self-heals defensively (clears + returns null) if a goal
somehow points at an already-researched node by the time it's read — covers `reconcileResearch()`
backfilling a node transitively (tech-tree reshape migration) without going through `completeResearch()`.

**Save.** SAVE_VERSION → 55. Purely additive: `state.researchGoal` reads through `researchGoalProgress()`/
`techHighlightSet()`, both of which treat `undefined` exactly like `null`. No migrate function — pre-v55
saves just load with nothing pinned.

**Files.** `src/sim.js` (state field, `pinResearchGoal`/`clearResearchGoal`, the `completeResearch` hook),
`src/render.js` (`techHighlightSet` fallback, `researchGoalProgress`/`researchGoalBandHTML`, the tree
marker, the detail-panel button), `src/save.js` (SAVE_VERSION). Rebuilt via `node build.js`;
`node build.js --check` confirms parity.

**Validation.** New `tests/test-research-goal.js` (27/27), built on the real `earth_observation` →
`planetary_science` pair (a clean 2-hop chain with no mission gate) rather than fixture nodes: pin/unpin/
toggle/guard-against-done, `techHighlightSet`'s fallback-vs-override behavior, `researchGoalProgress`'s
remaining-count and next-step math across both prereq states, the stale-pin self-heal, `completeResearch`'s
auto-clear-and-log on the goal vs. leaving it alone on an unrelated completion, and a surfacing no-throw
check across the band/tree/detail-panel render paths. Full 60-suite regression + `test-build-parity.js` +
`build.js --check` all green — no regressions.

## Session — #45 Ground track visualization (2026-07-17)

Backlog #45, unblocked by #114 (inclination physics). `groundTrackPasses(inclDeg, ascNodeLon, passes)`
in sim.js: standard argument-of-latitude parametrization for a circular orbit's ground path — 3 passes,
each drifting west by a flavor `LEO_PERIOD_MIN=90` approximation (altitude/period isn't modeled anywhere
else in this game, so this is illustrative, not orbit prediction). Drawn in `drawEarthGlobe` via the
existing `P(lon,lat)` projection — same one used for continents and the Cape marker — so it's correctly
aligned to the globe's current rotation. Solid track for the current pass (anchored at the Cape), dashed
and fading for the next two. Each point is tested front/back-facing so the arc breaks cleanly at the limb
instead of drawing through the globe.

Trigger: shown only when `missionById(state.activeMission)` has `.inclination` set — currently Crewed
Orbit and the Comsat contract, from #114. Nothing else changes; no mission carries this by default.
`earthPopInfoHTML` gets a matching dynamic caption (mission name + inclination) when applicable, silent
otherwise.

`tests/test-ground-track.js` 12/12 — math (max\|lat\|==inclination, equatorial flat, westward drift,
longitude normalization), caption presence/absence, `drawEarthGlobe` no-throw across all 3 cases via the
harness's fake canvas context. Full 64-suite regression + `build.js --check` clean.

**Not done:** this is a real-browser-owed item like the last few visual slices — verified headlessly
(math + no-throw), not eyeballed for legibility/aesthetics at actual popout size.

## Session — Launch azimuth ceiling / dogleg tax (2026-07-17)

Symmetric extension of #114, prompted by a "what else is missing for realism" survey. `inclinationDv`
generalized from a one-sided floor (≥28.4° free) to a band: `[LAUNCH_SITE_LAT=28.4°,
LAUNCH_SITE_MAX_DIRECT_INCL=57°]` is free; outside either edge costs the same `2·v·sin(Δi/2)`
formula, measured from whichever edge was crossed. Real physics: a coastal site's launch azimuth is
range-safety-limited (can't send an ascent trajectory over populated land), which is exactly why real
polar/sun-synchronous missions fly from Vandenberg AFB, not the Cape.

**Correction to previously-shipped content.** crew_orbit's 65° (Vostok 1's real inclination) exceeds the
new 57° ceiling, so it's no longer free — it now pays a ~1088 m/s dogleg tax. This is actually *more*
accurate: Vostok flew from Baikonur, a higher-latitude site with a far more permissive over-land range
than a Florida-analog coast, so 65° was never realistically "free from the Cape" in the first place —
the earlier slice's teaching-case framing was a simplification this closes. Payout raised 30.0→35.0 to
compensate; blurb updated to state the dogleg honestly. Comsat (0°, well below the floor) is unaffected.

Test suites updated in place rather than left stale: the now-false "65° is free" assertions replaced with
a genuinely-free 45° case, new symmetric ceiling/dogleg tests added (polar 90°, monotonicity, floor/ceiling
formula symmetry), and the MISSIONS identity loop now excludes intentional inclination opt-ins — same
treatment already used for procedural archetypes. Full regression clean; `test-station-slice2`'s known
pre-existing RNG flake (logged in the #114 slice-1 entry above) reconfirmed via 5 extra runs, not a new
regression.

## Session — Physics realism #2: one-way communication light-lag (2026-07-17)

`lightLagMinutes(bodyId, farthest)` in sim.js — static distance-from-Sun (AU) table, Earth-to-body
distance approximated as closest-opposition/farthest-conjunction range (no live ephemeris exists
anywhere in this game). Moons share their parent planet's AU. Verified against real published figures:
Moon ~1.3s, Mars ~4-24min, Jupiter ~35-52min — all match. Surfaced as a "Signal delay (one-way)" metric
on the body card (Map tab, via `lightLagHTML`/`fmtLag`), present for every body except Earth. Display-only
— pure sim texture, same category as #45. `tests/test-light-lag.js` 22/22. Full regression clean.

Sets up #3 (solar conjunction blackout) well — the same BODY_AU table is the natural source for "this
body just passed behind the Sun" logic.

## Session — Physics realism #3: solar conjunction blackout (2026-07-17)

`synodicDays(bodyId)` in sim.js: orbital period via Kepler's third law (reusing the BODY_AU table from
light-lag), synodic period from that. Cross-checked against reality twice: Mars comes out to 783 days,
matching the game's own pre-existing `SYNODIC_MONTHS=26` constant almost exactly; Jupiter ~399 days
matches the real ~13-month figure. `nextConjunction(bodyId)` anchors conjunctions to the synodic-period
midpoint from a fixed epoch (a flavor simplification, not synchronized ephemeris) with a flat ~20-day
blackout window (Mars' real ballpark) applied to every body.

Body card: a warning flag during an active blackout, a "next conjunction" metric otherwise. Display-only.
`tests/test-solar-conjunction.js` 19/19, using a monkey-patched `absDay` for deterministic day-of-cycle
testing rather than real time. Full regression clean.

Physics-realism survey (from the #45 ground-track conversation) is now 3/3 tractable items done:
azimuth ceiling, light-lag, solar conjunction. Remaining: orbital decay/station-keeping (not started),
Lagrange-point missions (recommended to stay flavor-only).

## Session — Orbital decay/station-keeping: correction, not a new feature (2026-07-17)

Item #4 from the physics-realism survey. Investigated before building and found it already existed: a
mature facility condition/maintenance-decay system (`STATION_MAINT_DECAY_BASE`/`PER_MODULE`,
`stationCondition()`, Repair action, resupply contracts). Building a parallel decay mechanic would have
duplicated it — caught before writing any of that code.

The one real gap: the UI never said *why* condition decays, reading as generic wear for all three
facilities alike. Added `FACILITY_DEFS.decayReason` and surfaced it in the Condition metric: `leo_station`
now honestly reads as real orbital decay (atmospheric drag, ISS-reboost-equivalent) since it's the one
facility that actually orbits something; the surface bases get their own non-orbital reasons. Data +
display only. `tests/test-facility-decay-flavor.js` 5/5.

Physics-realism survey closed out: azimuth ceiling, light-lag, solar conjunction all shipped as new
mechanics; orbital decay turned out to be a documentation fix, not new work. Lagrange-point missions
remain recommended flavor-only (not pursued).

## Session — #115 Fleet Registry slice 1 (2026-07-17)

Shipped the collector + board. `assetRegistryGroups()` (sim.js) is a DOM-free normalized list grouped by
class — in-flight vehicles, logistics, bases/stations, LEO depot, standing programs — each item carrying a
one-line status + a detail map. The information-architecture call landed as: each class's status line is
its single most decision-relevant stat, and for facilities that means dynamically surfacing whichever of
supply/condition/crew is *most at risk* rather than a fixed field (a healthy base shows its output
summary instead). In-flight detail reuses the light-lag/conjunction helpers from the physics-realism work.
render.js adds an accordion board (`showFleetRegistry`) reached from a new Outliner-header "registry"
button; rows expand in place, multiple can stay open. `tests/test-fleet-registry.js` 26/26. Full regression
clean.

**Slice 2 — NOT STARTED.** Standing-ops/"satellites" (the (A)-vs-(B) design call still needs settling with
the user — (A) show passive contracts as standing operations, honest and small; (B) build persistent
satellite objects first, an epic) + the optional astronaut-roster section. Polish: sorting, section
collapse, maybe a keyboard shortcut. No real-browser pass yet on the board's feel/legibility — the usual
headless caveat.

## Session — #115 Fleet Registry slice 2 (2026-07-17)

Standing operations + astronaut roster added to the collector. Standing ops surfaces `state.passiveContracts`
per the chosen **option A** — name/income/term/category with a near-expiry marker, satellites getting the
sat icon — and deliberately shows NO location/Δv/consumables, since none exists for a passive contract and
fabricating it would be exactly the fake telemetry the feature exists to avoid. Astronaut corps resolves
each crew member's real position (in flight → names the mission, on station → names the facility, or
available) plus flights flown and career radiation dose. Render layer needed no changes — slice 1's
accordion renders any collector group generically. `test-fleet-registry.js` → 41/41. Full regression clean.

**#115 feature-complete (option A).** Option B — promoting satellites to persistent objects with real orbit
params/degradation/servicing — is filed as backlog #116, its own epic, not blocking anything. No real-browser
pass on the board yet (usual headless caveat).


## Session — E4.0 shipped: harness seedable RNG (2026-07-18)

Added `seedRNG(seed)` / `restoreRNG()` to `tests/harness.js`: a small mulberry32 PRNG
that monkeypatches the global `Math.random`. The game calls `Math.random()` directly at
~117 sites across sim.js/flight.js/data.js/render.js/shell.js with no threaded rng
parameter and no captured local reference anywhere in src/ — so a global monkeypatch is
the only way to get determinism without touching game source, and it correctly reaches
every call site. Opt-in per suite: a test that never calls `seedRNG()` sees native,
unseeded `Math.random` exactly as before — zero behavior change for the other 68 suites.

Fixed the flaky `test-station-slice2.js` Mars e2e block flagged in the 2026-07-17 log
(its 8-month `advance()` loop rides random econ/logistics rolls with no RNG control).
Reproduced the flake locally first — 3/8 passing across 8 unseeded runs — then verified
`seedRNG(1)` gives 10/10 passing, deterministic runs. Does NOT fix the underlying
`dockModuleNow`-vs-decommissioned-facility crash the flake occasionally exposed; that
stays logged separately as its own out-of-scope finding. Seeding only makes which random
draws happen reproducible, so a draw-dependent bug now either always reproduces at a
given seed or never does, instead of intermittently.

Documented in `tests/README.md` (new "Determinism" section). Full regression: 69/69 real
suites green (`test-build-parity.js` excluded — a pre-existing `/tmp`-relative
`require('../build.js')` path issue, reproduced identically against an unmodified build
in a properly-rooted checkout; unrelated to this change, not fixed here).

**E4.1 + E4.2 + E4.3 (code-complete, MAP3D flag OFF pending browser playtest) shipped 2026-07-18 (below). E4.4 (persistent ship identity + save migration) is next up — heavy design → Sonnet wiring.**


## Session — E4.1 shipped: real Keplerian ephemeris (2026-07-18)

Replaced the fake launch-window model (fixed ~780-day spacing + random jitter + **random**
window quality, tied to nothing physical) with real on-rails orbital mechanics. Commit
`fb8fe0f`.

**Physics.** New `ORBITAL_ELEMENTS` map (real J2000 mean elements a/e/lop/L0 for the 9
planets + Ceres) drives `planetHelio(bodyId, absD)` → heliocentric {theta, r} via a Newton
`solveKepler`. Windows now open at the true Earth→target Hohmann phase geometry
(`hohmannPhaseLead` derives the ~44° lead from the semi-major axes, not hardcoded), and
window **quality comes from where the eccentric-orbit target actually is at the encounter**
— perihelic opposition favorable (~1.15), aphelic marginal (~0.85). That's the real reason
Mars windows differ across the ~15-year great-opposition cycle, and it maps exactly onto the
existing quality→payout multiplier, which now rides on physics instead of `Math.random`.

**Time base.** Kept in the game's own 360-day-year unit (no dual calendar) with each planet's
period scaled from the real orbital ratio (Kepler's 3rd law, T = 360·a^1.5). Earth = 360
game-days, Mars ≈ 677; the Earth–Mars synodic period **falls out to ~769 game-days**, matching
the old hand-tuned 26-month (780) constant as a derived sanity check rather than an assertion.
Sample generated windows: first ~14 months out, ~26-month spacing, quality swinging
1.14→0.85→1.15 over ~15 years — the real opposition cycle, now a genuine "launch now vs wait
two years for a much better window" decision.

**Shared foundation.** `planetHelio` gives every planet a real heliocentric position(absDay) —
exactly what the E4.3 3D solar-system view will render — so A1 is infrastructure for both the
deeper-orbital-mechanics track and the 3D viewport, not just window math.

**API/consumers.** `windowsFor` now delegates to `computeWindows` but keeps the identical
`{abs, quality}` shape and ~4-upcoming-windows count, so `nextWindowFor` / `missionPlan` /
`bodyPlan` / `commitWindow` are all unchanged. Non-window missions completely untouched (the
identity-style guarantee for the set that shouldn't move).

**Save.** SAVE_VERSION 56→57. `state.windows` is a regenerable cache; `migrateEphemerisWindows`
clears it on pre-v57 load so windows regenerate from the new geometry. `committedWindow` (a
concrete date the player already chose) is preserved. No new persisted fields.

**Two-model coexistence (deliberate).** The July-17 conjunction feature's `BODY_AU` +
`synodicDays` (a real-DAY light-lag/conjunction "flavor" model covering all bodies incl.
moons/Pluto/Oort, epoch = opposition-for-all) is kept **separate** from `ORBITAL_ELEMENTS`
(precise, eccentric, game-day periods, planets only). Unifying now would move the shipped
conjunction blackout dates. **Unification target is E4.3**, when the 3D scene needs real
positions for every body (moons included) and `BODY_AU` can fold into an extended
`ORBITAL_ELEMENTS`. A coexistence note is in the code at `BODY_AU`.

**Tests.** New `test-ephemeris.js` (54 checks): Kepler round-trips, periods from a^1.5, the
~769-day synodic period, position periodicity + peri/aphelion bounds, textbook Hohmann transfer
time (~255 game-days) & phase lead (~44°), phase-geometry windows, quality varying across the
opposition cycle, determinism (Math.random fully removed from window gen), and every consumer +
non-window mission intact. `test-solar-conjunction.js`: dropped the reference to the removed
`SYNODIC_MONTHS` constant, now cross-checks the real ~780-day figure directly.

**test-station-slice2.js flakiness — root-caused and fixed durably.** E4.1's change perturbed
this pre-existing flake (logged 2026-07-17, only partially tamed by E4.0). Diagnosed the real
cause: on some RNG streams a random decision-modal event during the 8-month Mars cruise leaves a
`_pending*` flag set, which gates `pumpFlightArrivals` (a legit production safety — don't resolve
an arrival mid-decision), so the flight never resolved (observed unresolved at absDay 240 >
arriveAbs 210). Also found E4.0 had seeded only the advance loop, leaving `newGame` setup on the
unseeded stream. Durable fix (not a magic seed): seed the whole e2e block, clear the dangling
`_pending*` flags before `pumpFlightArrivals`, and keep the facility provisioned as a second
confound guard. Now **28/28 across 12 seeds and deterministic** across repeated runs.

Full regression: **69/69 real suites green** (`test-build-parity.js` excluded — pre-existing
`/tmp`-path env issue). Documented in `tests/README.md`.

**E4.2 shipped 2026-07-18 (below).** Note: E4.3+ (the actual 3D scene) is not headless-testable in this sandbox (no browser), same constraint as BENCH_V2 — those will need real-browser playtests.


## Session — E4.2 shipped: Three.js CDN plumbing + ESM→global shim + guard (2026-07-18)

Pure plumbing per MIGRATION.md §6 — no behavior change yet. Commit `4745827`.

Added Three.js the same way Phaser is added: a single pinned jsDelivr tag in `src/shell.html`,
placed right after the Phaser tag and before `<!-- OV:SCRIPTS -->`. No single-file bloat, no
build change. Because modern Three.js is ESM-only (the UMD global build was dropped ~r160), it
loads via a tiny module shim that stashes it on `window.THREE` for the game's classic-script /
global scope — current Three.js without making any of the game's onclick handlers modular.

- **Version pin (resolved MIGRATION §9 open-item #1):** `three@0.185.1` (current npm `latest`;
  ESM entry `build/three.module.js` verified against the package's declared `exports["."]` before
  pinning). URL: `https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js`.
- **Dynamic import + catch** (rather than the static `import * as THREE` in the MIGRATION example)
  so a CDN/offline failure is a quiet `console.warn`, not an uncaught module error — `window.THREE`
  simply stays undefined and the guard reports absent. Directly delivers the "treat not-loaded as
  absent, degrade to 2D" requirement.
- **Guard:** `threeOK()` in `render.js`, placed next to `phaserOK()`, mirrors it exactly:
  `typeof THREE!=='undefined' && !!THREE.Scene`. Every future Three.js call site (E4.3+) gates on
  it and falls back to the existing 2D Solar System view. The shim is async (module scripts defer),
  so THREE may be absent at first paint — the guard treats "not loaded yet" identically to "absent",
  and the 3D tab will initialize on first open, not at boot.

The 2D Solar System map is untouched and retained as the permanent fallback.

**Tests:** new `test-three-guard.js` (9 checks) — `threeOK()` false when THREE absent (the headless
harness / CDN-down / pre-deferred-load case), false when THREE exists but lacks `Scene` (partial or
failed load), true when a real-shaped THREE is present, never throws, matches the `phaserOK()`
convention, and the game boots + renders with THREE absent (3D is optional, not required). The shim
itself isn't Node-testable; this covers the guard every call site will gate on. Reverified the build
parity invariant (release inline `<script>` == `build/game.js`) after the shell.html edit — the awk
extraction only captures the exact `<script>`/`</script>` OV block, not the module shim or the
one-line CDN tags.

Full regression: **70/70 real suites green** (build-parity excluded — pre-existing /tmp-path env
issue). Documented in `tests/README.md`.

**E4.3 shipped 2026-07-18 as two slices — E4.3.0 (scene math, fully tested) + E4.3.1 (Three.js shell, flag MAP3D OFF, browser-pending). See below.**
heavy design.** First not-headless-testable step (no browser in the sandbox), same discipline as
BENCH_V2: the scene-graph math (positions, camera transforms) is unit-testable, but visual
correctness and the default-on flip will need a real-browser playtest pass from Shamus.


## Session — E4.3 shipped: 3D solar-system scene + camera (2026-07-18)

Built as two slices, mirroring the E3/BENCH_V2 discipline: the headless-testable math first, then the
Three.js rendering shell behind an OFF flag. Commits `41815db` (E4.3.0) + `46b1d40` (E4.3.1).

**Why it matters beyond eye-candy:** the *current* 2D solar map fakes both the planet angles and the
orbital motion (arbitrary `speed = 0.05/√r` from made-up start angles), and never consumed E4.1's real
`planetHelio`. The 3D view places every planet at its **true heliocentric angle**, so it actually shows
the Earth↔target geometry that drives launch windows.

### E4.3.0 — scene math (`41815db`, fully tested)
Pure geometry turning `planetHelio` into 3D scene coordinates. **Design: "real angles, schematic
radii".** ANGLE is truthful (scene angle == real heliocentric theta; the Earth→Mars scene separation
equals the real separation — window geometry preserved). RADIUS is compressed (real orbits span 0.39–30
AU, unrenderable to scale) via a documented power law `R = SCENE_AU_BASE·AU^SCENE_AU_EXP` (exp 0.6):
inner planets stay separated, Neptune ~74 units not ~300. Orbit rings are schematic circles (same
spirit as the 2D map's rings). New pure fns: `sceneRadiusFor`, `bodyScenePos` (ecliptic x–z plane,
y=0; moons resolve to parent + small offset), `orbitRingPoints`, `cameraTargetFor`, `orbitCameraEye`
(spherical→cartesian for the hand-rolled camera, elevation clamped inside the poles). `test-scene-math.js`,
36 checks.

### E4.3.1 — Three.js rendering shell (`46b1d40`, flag MAP3D OFF, browser-pending)
`startMap3D()` is `threeOK()`-guarded and, when `MAP3D` is on, becomes the top-priority renderer in
`renderMap()` ahead of the existing Phaser 2D → SVG chain; on any absence/failure it disposes and falls
through, so it can never break the game. Builds Sun + point/ambient light, planet spheres, schematic
orbit-ring lines, starfield; a **hand-rolled orbit camera** (drag = rotate az/el, wheel = zoom within
clamps, click = raycast → `selectBody`, chosen over importing OrbitControls to keep the shim to one
import); and a render loop that repositions every planet each frame from `bodyScenePos(id, absDay())`
— truthful, not the 2D map's fake spin. `pauseMap3D()` tears the loop down on tab switch. Pure helpers
`hexToNum` / `planetMeshRadius` factored out and tested. `test-map3d-shell.js`, 17 checks.

**CRITICAL STATUS — MAP3D stays OFF by default.** Like BENCH_V2, the entire Three.js shell was built and
tested *headlessly only* — the sandbox has no browser/WebGL, so the scene has never actually rendered.
The math is fully unit-tested; the rendering, camera feel, and picking are not. **Flipping `MAP3D=true`
as the shipped default should follow a real-browser playtest**, not ride in on a code session. Playtest
checklist is in the E4.3.1 code comment (scene renders + no console errors; camera drag/zoom/click-focus;
positions track the body card as months advance; forced-fallback verified; no leaked canvas or runaway
rAF across tab switches).

Full regression: **72/72 real suites green** (build-parity excluded — pre-existing /tmp-path env issue);
release-inline `<script>` == `build/game.js` parity reverified after the render.js edits.

**E4.4 (persistent ship/hull identity + flight history + reuse count, save-versioned & additive, reusing
the Fleet Registry #115 collector shape) is next up — heavy design → Sonnet wiring. Headless-testable
(no renderer), so it's back to fully-verifiable ground after the browser-pending E4.3 shell.**


## Session — MAP3D flipped default-ON; Cape 3D work landed outside this log; flight trajectory rework (2026-07-18 → 2026-07-19)

*This entry is a catch-up append: several commits shipped to `main` without ROADMAP entries. Nothing
above this line has been altered — some "next up" statements above are now stale; this entry is the
current status.*

### MAP3D default-ON (`dd55e30`, 2026-07-18)
At the repo owner's request (private single-user repo), `MAP3D` was flipped to `true` so the E4.3 3D
solar-system view could be playtested in a real browser. Safe to default-on because the shell degrades
three ways (threeOK() gate, try/catch in startMap3D, try/catch → 2D fallback in the render loop). The
`test-map3d-shell.js` flag assertion was updated; safety/fallback checks retained.

### Cape 3D epic — landed on `main` outside this log (commits `2ec3ef1`, `d9d1f43`, `07c3da2`)
Three commits were authored directly against the repo (per `AGENTS.md`, via a separate GPT-5.6-based
agent toolchain — not the sessions writing this log). For the record, they shipped:
- **`2ec3ef1` — photographic textures + Cape 3D design.** `assets/` added (10 planet-texture JPGs, 2
  Cape albedo PNGs, `CREDITS.md`); `build.js` now base64-inlines assets into both HTMLs (release grew
  ~1.6MB → ~18MB; build gracefully skips missing assets so texture-less forks still build).
  `docs/cape-3d-architecture.md` (full design: replace the Command Center Cape's Canvas/Phaser
  presentation with a Three.js site scene — one scene/renderer, two mounts, projected DOM hotspot
  anchors). New `CAPE3D` flag + foundation (`capeWorldPoint`, `capeFacilityDescriptors`,
  `cape3dCameraEye`), `test-cape3d-foundation.js`.
- **`d9d1f43` — 3D Cape flight sequence.** `docs/cape-3d-launch-orbit-scope.md` (pad → ignition →
  ascent → high-atmosphere handoff → orbit → result; 3D is a renderer over the authoritative sim, never
  a second flight model). `FLIGHT3D` flag + presentation adapter (`flight3dPhaseAt`,
  `flight3dPresentationSnapshot`), launch/orbit/reentry presentations, decision + readout overlays,
  fallback handoff. `test-flight3d-foundation.js`.
- **`07c3da2` — launch presentation refinements.**

Both `CAPE3D` and `FLIGHT3D` shipped enabled. These slices are browser-verified by the owner directly
(the sandbox writing this log has no browser). ROADMAP entries for future Cape-3D work may continue to
land outside this log; treat the commit history as authoritative for that workstream.

### Flight trajectory rework (`e90d7e6`, 2026-07-19) — owner-requested realism pass
Replaced `cape3dLaunchProfile`'s three independent curves (altitude `p^1.62`, downrange, pitch — which
could and did disagree, so the nose visibly didn't match the motion) with **one integrated gravity-turn
trajectory**: a pitch program (vertical until the tower is cleared at ~5.5% of ascent, then a smoothstep
ramp — imperceptible turn onset, very gradual pitch-over; γmax 87° orbital / 16–36° suborbital scaling
with energy) and a speed program (`v = .035 + .965·p^1.7` — a TWR≈1.2 crawl off the pad, ~25× faster by
MECO), integrated as d·alt = v·cosγ, d·downrange = v·sinγ (96 steps, memoized per flight class). The
nose equals the velocity direction **by construction** (zero-angle-of-attack), and the orbital altitude
curve becomes the correct S-shape automatically — the old model was steepest at the END; now the climb
rate dies at insertion while downrange accelerates: horizontal flight into orbit at 87°, MECO exactly at
the 185 km target.

Suborbital coast is now a real unpowered ballistic arc, continuous with burnout in altitude/downrange/
nose: apogee at 42% of the coast (normalized to ~1.12× targetAltitudeKm so readouts stay in the shipped
range; burnout at ~53% of apogee — textbook sounding-rocket proportions), **horizontal at apogee, arcing
over nose-down, reaching the water exactly at coast end** (new `splash` flag). Fixed en route: the old
code kept the engine burning through the entire ballistic coast (plume/smoke now die at burnout); smoke
is now dense-atmosphere-only (fades by ~13 km); vacuum shading is altitude-based (fixes the old bug
where a 70 m first hop got vacuum plume effects at 73% progress); suborbital sky blend (`launchSpace`)
is altitude-driven instead of a fixed .12. The metre-scale first-hop branch is preserved verbatim.
Return shape kept (+ `flightPathRad`/`apogeeKm`/`splash` added).

Tests: new `test-flight3d-trajectory.js` (31 checks — slow-then-fast, vertical rise, gradual monotone
turn ≤3.2°/2%-of-ascent, nose-tracks-velocity <2.5° worst error, orbital S-curve + near-horizontal
insertion, coast continuity, apogee timing/band, arc-over, splash, downrange monotone, energy scaling,
engine-off coast, altitude-based effects, first-hop invariants, determinism). One
`test-flight3d-foundation.js` assertion encoding the old long-vertical shape was updated to the new
contract; all other assertions unchanged. Full regression at push time: **75/75 real suites green**
(build-parity excluded — pre-existing /tmp-path env issue); build byte-faithful including embedded
textures.

**Known follow-ups from the trajectory rework (browser feedback wanted):** camera framing vs. the much
larger realistic downrange travel (the pad now properly recedes; if the finite ground-plane edge shows
late in ascent, blend it out earlier); speed continuity across the burnout handoff (ascent and coast map
their own clocks — the cutoff reads as a pacing change, acceptable but tunable).

**E4.4 (persistent ship/hull identity) remains the next E4 workstream** — unchanged from the entry
above; the Cape-3D thread proceeds in parallel outside this log.


## Session — E4.4 confirmed shipped by Codex; E4.5 ship markers (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered.*

### E4.4 — persistent hull identity — confirmed already shipped (Codex, `075654d`)
Before starting E4.5 ("wires E4.4 registry entries onto the E4.3 scene"), checked whether E4.4
itself existed yet — it did, landed by Codex's "Refine physical launch vehicles and hull registry"
commit without a ROADMAP entry. `state.hulls[]`: serial-numbered (`OVH-####`) physical vehicles
with rollout/launch/loss/recovery/refurbishment lifecycle and a capped history log, wired through
`assignHullToHangar`/`markHullLaunched`/`settleHullFlight`, save-migrated (`migrateHulls`,
backfills a ready hangar hull without inventing prior flights, idempotent), and surfaced in the
Fleet Registry (#115). `test-hull-registry.js` (9 checks) verified passing.

### E4.5 — ships as tracked 3D markers (`71671bc`)
An active (deferred/long-cruise) mission now gets a real 3D marker on the solar-system map, moving
along a genuine two-body transfer arc and tied to its physical hull's identity.

**`flightTargetBody(missionId)`** (`sim.js`) — a general mission→body lookup for markers, distinct
from `missionTargetBody` (which exists for window math and always falls back to Mars — wrong for a
marker: an Apollo mission should head to the Moon, not collapse to Mars). Returns `null` for unknown
missions or schematic non-point bodies (the Oort cloud) rather than defaulting anywhere.

**`flightScenePos(rec, absD)`** (`render.js`) — reuses `bodyScenePos` for BOTH endpoints (never
re-derives Earth/target position independently), so a marker's departure/arrival points are
pixel-identical to wherever the actual planet mesh sits on those exact days — including Codex's
eccentric/inclined orbits (Belt at 10.6°) and per-moon orbit model. Because endpoints can have y≠0,
the transfer is built in the real 3D plane through the Sun and both endpoints (orthonormal basis),
not assumed flat. Within that plane: the same Hohmann-shaped Kepler construction as the E4.1/ascent
work — endpoints ARE periapsis/apoapsis (exact by construction, e always <1 for positive radii),
half-orbit true-anomaly sweep reparametrized to land EXACTLY on both endpoints while following a
genuine Kepler radius/angle profile in between (fast near periapsis, slow near apoapsis), not a
linear interpolation. Verified numerically (endpoints match `bodyScenePos` to float precision) —
caught and fixed one real bug in the process: a double-division in the angle-between-vectors
formula that left radius correct but direction wrong, found by comparing computed vs. actual arrival
position rather than trusting the algebra alone.

**`activeShipMarkers(absD)`** — scans `state.activeFlights` for deferred flights with a renderable
target, joining in hull serial/family/reuse-count from the E4.4 registry; synchronous flights and
malformed records are silently skipped, never thrown on.

**Three.js shell** — a small emissive marker + label per active flight, reconciled every
`map3dTick` (create/update/remove as flights start and end), added to the existing `pickables`
array with a `ship:` `userData` prefix so the existing hover/pick handlers route to hull info
(serial, family, reuse count, cruise progress) instead of falling through to a `BODIES` lookup.
Uses `mapViewAbsDay()` so markers scrub consistently with the existing time-preview HUD.

**Also fixed, found via regression (unrelated to E4.5, pre-existing):** `map3dApplyCamera()` called
`orbitCameraEye`, which had been dropped from source in an earlier refactor (only
`cape3dCameraEye`, the Cape launch-site camera, remained) — the solar map's free-orbit camera was
throwing every frame and silently falling back to 2D (caught by `map3dRenderLoop`'s try/catch, so
it degraded quietly rather than crashing — but the 3D solar map has effectively not been renderable
since that refactor). Restored `orbitCameraEye` with its original symmetric ~±89° elevation clamp
— a "drag to orbit the solar system" camera needs full freedom, unlike `cape3dCameraEye`'s
ground-level `.18–1.25` clamp, which would have wrongly restricted it if reused instead.

Tests: new `test-flight-markers.js` (38 checks — target lookup per program, transfer-element
well-posedness, endpoint-exactness against `bodyScenePos` itself, monotonic radius growth,
before/after clamping, graceful nulls, and the marker query's filtering/hull-joining/safety).

Full regression at push time: 77 suites; only `test-flight3d-trajectory.js` still differs (Codex's
already-reviewed-and-accepted vehicle/hull refinement — noted, not touched, out of scope here).
Build byte-faithful.

**E4.6 (A2 orbital-element gameplay slices) is next up per the original E4 breakdown** — one
opt-in decision-bearing mechanic at a time, each with its own identity-guarantee test. *Heavy per
slice.*


## Session — E4.6 (A2 slice 1): depot rendezvous/phasing as a Δv cost (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered.*

Before scoping, checked MIGRATION.md's §9 open item #2 (A2 slice list) against what's actually
live: **"phase-angle window quality as a real decision" is already fully shipped** — the existing
`renderWindowPlanner()` UI lets the player commit to any of the ~4 offered windows, trading
soonest-vs-best (a real, live decision, not just E4.1's underlying physics). **Ground track (#45)
is also already shipped** (a separate thread — `groundTrackPasses`/`drawEarthGlobe`, tested in
`test-ground-track.js`). That left **rendezvous & phasing for reuse/refuel** as the one genuinely
open A2 candidate.

**The gap:** the LEO propellant depot (#7/M3b-ii) tops off a mission's transfer stage for free,
regardless of orbital plane — no rendezvous physics at all. Closed with `depotPhasingDv(m)`
(`sim.js`), reusing the exact `2·v·sin(Δi/2)` formula `inclinationDv` already established: a depot
can hand over propellant once you're alongside it, but can't pay for the plane-change burn your
own vehicle needs to get there.

`DEPOT_INCLINATION = LAUNCH_SITE_LAT` — no depot vehicle carries its own `.inclination` (Tanker Run
flights are unmodified/free-plane), so by the same "unset ⇒ default plane" convention
`inclinationDv` uses, the depot naturally forms at the launch site's latitude (28.4°).

`depotPhasingDv(m)` is zero unless **both**: the mission is `.profile`-shaped (the only category
the depot benefits at all — a flat-reqDv mission like `crew_orbit`, which already carries
`.inclination:65` for the *unrelated* launch-azimuth tax, is correctly zero here since the depot
mechanic doesn't apply to it at all), **and** `state.depotUse>0` this flight — unlike
`inclinationDv` (a static, always-on per-mission surcharge), this is a *dynamic* cost: it only
exists when the player actively chooses to draw from the depot. Also unlike `inclinationDv`'s
floor/ceiling (free to steer higher via azimuth), there's no free band here — meeting a specific
existing depot plane costs a burn in either direction, so it's a plain symmetric mismatch cost.

Wired into `simulateMission`'s `'Ascent to LEO'` leg: when a mission draws from the depot with a
plane mismatch, the phasing cost is added to that leg's required Δv (the depot's mass top-off,
added to the transfer stage after this leg, is unchanged — only the vehicle's OWN Δv requirement to
reach the rendezvous grows). The leg carries a new `phasingDv` field (`undefined` when zero) for
display; `render.js`'s existing depot-note line grows a phasing explainer when it fires.

**Identity guarantee:** no mission today combines `.profile` with `.inclination`, so
`depotPhasingDv` is provably 0 for every mission in `MISSIONS`, regardless of `state.depotUse` —
mechanism-only, exactly like `inclinationDv`'s slice 1. No existing mission's numbers move, and
every real `.profile` mission's Ascent-to-LEO leg dv/pass output is unaffected by turning
`depotUse` on. A synthetic mission (constructed in the test, following the established
`test-inclination.js` pattern of not touching real content for a mechanism-only slice) proves the
leg-dv gate actually responds once both conditions hold.

Tests: new `test-depot-phasing.js` (17 checks — the `MISSIONS`-wide identity, per-mission
`simulateMission` leg-output identity, the formula's opt-in/symmetric/monotonic properties matching
the same ~3827 m/s magnitude the launch-site slice found for an equivalent angular offset, and the
synthetic integration case).

Full regression at push time: 78 suites; only `test-flight3d-trajectory.js` still differs
(Codex's already-reviewed-and-accepted vehicle/hull refinement — unrelated, not touched). Build
byte-faithful.

**Remaining A2 candidates for a future slice** (per MIGRATION §9): extending the inclination
mechanic into a fuller plane-management layer (the deferred #30 second-launch-site economics is
the natural home for this). No mission currently combines `.profile`+`.inclination` in the *real*
content, so a natural follow-on (mirroring the historical inclination Slice 1→Slice 2 pattern) is
retrofitting one real interplanetary mission with a non-Cape-matching inclination to make this
slice's mechanism *felt* rather than dormant — a deliberate balance call, not done here.


## Session — E4.7: visual multi-stage separation in the Cape 3D flight renderer (2026-07-19)

*Pure append, per standing instruction — nothing above this line altered. Coordinated next task
from CLAUDE.md; built by Claude against main HEAD d273bee.*

The physical trajectory already burns and drops every stage's dry mass in `cape3dTrajectoryPlan`,
but the visual rocket was a single mesh. This slice splits it and detaches spent stages/boosters at
their real staging times, letting them coast and fall under gravity while the next stage ignites —
sim and outcome logic untouched.

**`cape3dTrajectoryPlan` now records `stageEvents[]`** — `{t, kind:'booster'|'stage', index,
altitudeKm, xKm, vx, vy}` captured at each real drop point during the burn integration it already
ran (a booster jettison when `boosterProp` hits zero; a spent-stage drop when `coreProp` hits zero
and it's not the last stage). These were previously computed and discarded; now they're the
authoritative separation schedule. The final stage never generates an event — it burns out rather
than separating.

**`cape3dSeparationStates(plan, time)`** — a pure, headless-testable function mapping the current
flight time to each event's state: `separated` (has time passed its `t`) and `fallTime` (seconds
since it let go, 0 until then). Touches no Three.js and no sim state.

**`cape3dVehicleMesh` restructured into per-stage sub-groups** — each `segs[i]` (a real
`physics.stages[i]`, same order, same source `state.stages`) is built into its own `THREE.Group` at
identity transform, so visual output is byte-identical but each stage can be reparented as a unit.
Boosters get their own sub-group (they separate distinctly, matching the plan's separate
`boosterAttached` tracking); the nose rides the top stage's group; engine bells and the flame stay
on the bottom stage. `userData.stageGroups` / `userData.boosterGroup` expose the pieces.
`cape3dResetStaging(rocket)` reattaches everything at identity before each flight — necessary
because the rocket mesh is built once (`buildCape3DScene`) and reused across launches, so a piece
dropped last flight would otherwise be missing this flight. Wired into both enter and exit.

**`cape3dUpdateLaunchPresentation` detach + fall** — when a piece's separation time passes, it's
reparented to the scene root via `root.attach()` (preserves world transform, so no jump across the
rocket's current pitch) with its captured separation position/velocity, then driven each frame under
honest free fall (`sep.y + sep.vy·t − ½·G0·t²`; the scene is 1:1 real metres, so `G0` applies
directly) plus a cosmetic tumble. Only the tumble is invented — the separation moment and the
piece's initial state are real sim values. Debris is culled 3000 m below the pad. Skipped on a
failure (the failure FX owns the whole vehicle) or when there are no events (single-stage). On a
core-stage separation the flame FX's nozzle offset moves up to the new bottom stage's base, so the
exhaust visibly re-ignites there instead of hanging in the dropped stage's empty space.

**Tests:** new `test-flight3d-staging.js` (29 checks) — single-stage produces no events; two-stage
produces exactly one `stage:0` event at the real burnout time with real position/velocity;
boosters+stages produce a booster event *before* the core-stage event with correct `fallTime`
ordering; three-stage drops exactly two stages in increasing time/index order; and
`cape3dSeparationStates` edge cases (null plan, missing `stageEvents`, pre-liftoff query,
non-numeric time — none throw). Also verifies `cape3dLaunchProfile` now exposes `t` (trajectory
time), which the detach logic keys off.

**NOT browser-verified — the honest gap.** This sandbox has no WebGL and the harness has no THREE
stub, so the mesh/reparent/fall path has never actually rendered; only the pure math is tested. A
real-browser playtest should confirm: pieces detach at the right moments and fall away without
popping, the flame re-anchors to the new bottom stage, boosters drop before the core stage, and a
second launch after a first (mesh reuse) still shows a complete rocket. Playtest checklist is in
CLAUDE.md.

**Regression at push time:** 79 suites. Three failing, all confirmed NOT caused by this work
(checked against a clean pre-edit pull): `test-flight3d-trajectory.js` (Codex's accepted
trajectory/vehicle-physics changes), and — newer — `test-decision-panel.js` + `test-pad-a.js`
(from Codex's "Refine command UI and flight reporting" commit; look like an intentional
post-failure hold/debrief screen, flagged in CLAUDE.md for intent confirmation). Build byte-faithful.


## Session — E4.7: deep (in-space) failures stay in the 3D renderer (2026-07-20)

*Pure append. Model tier: heavy (failure-visualization design + gate-loosening judgment).*

**Scoping finding (why this slice, and what it is NOT):** audited what still drops to the flat 2D
fallback in `updateFlight3DSession`. The gate kept `orbit` in 3D only for `isOrbital && success!==false`
and `reentry` only for `isOrbital && crewed && success!==false`. Investigating the renderers showed
the gates are *conservative, not protective* — `cape3dUpdateOrbitPresentation` /
`cape3dUpdateReentryPresentation` render from `phaseProgress` alone and read no `crewed`/`success`
flag. Two real gaps fell out: (a) a **deep in-space failure** (post-orbit strand/loss) cut to 2D at
the flight's climax; (b) a crewed **cislunar** mission gets **no reentry leg at all**
(`flightHasReentry` requires `isOrbital`), so its Earth return isn't animated. This slice does (a);
(b) is logged as the next candidate (it's new mission-leg content, not a gating fix).

**Shipped — deep-failure 3D stranding.** A `success===false` / `failPhase==='deep'` outcome now stays
in Three.js. Snapshot (`flight3dPresentationSnapshot`) emits `effects.deepFailure` /
`deepFailureFrac` (0.42, matching the 2D renderer's freeze point) / `deepFailureProgress`, armed only
for `orbit`/`transfer` phases once coasted past the freeze fraction, and passes `failPhase` through —
mirroring the existing `ascentFailure` pattern. `cape3dOrbitProfile` and `cape3dTransferProfile`
freeze `progress` at the loss fraction and cut `burn`/`arrival` when dead-stick, exposing `deadStick`
+ `failProgress`; both presentations tumble the craft dead-and-dark with a build driven by
`failProgress`, and the 3D readout shows `SPACECRAFT LOST`. The `updateFlight3DSession` gate was
loosened to keep `orbit` in 3D for a deep fail (`transfer` was already unconditionally in 3D but had
no failure visual). Sim/outcome untouched — presentation only; the outcome was resolved by the sim
before the animation opened.

Test: `tests/test-flight3d-deepfail.js` (26 checks — signal arms only for a deep fail past the freeze
fraction, never on success or an ascent fail; orbit + transfer freeze/dead-stick identically; a
successful flight runs full progress and still reaches arrival). NOT browser-verified (no WebGL in
sandbox) — the tumble should be eyeballed in a real failed-orbital-insertion flight.

Regression: 80 suites; the only failures are the three pre-existing Codex drifts
(`test-flight3d-trajectory.js`, `test-decision-panel.js`, `test-pad-a.js`), verified unchanged from
baseline (identical failing-check counts) — this slice added nothing to the failure set. Build
byte-faithful.


## Session — E4.7: crewed cislunar returns get a reentry leg (2026-07-20)

*Pure append. Heavy tier (mission-leg content).* Follow-on to the deep-failure slice, which flagged
this gap: `flightHasReentry` required `isOrbital`, so a crewed Moon mission's Earth return was never
animated (flight ended after the cislunar transfer). Fix: `flightHasReentry` now allows
`isCislunar||isOrbital`; the `updateFlight3DSession` reentry gate widened to `(isOrbital||isCislunar)`.
No new renderer — the reentry presentation and `drawScene`'s `entering` transition are already
progress-only / isOrbital-agnostic, so a crewed cislunar return flows pad→ascent→transfer→reentry
automatically once `reentryDur>0`. Uncrewed and failed cislunar correctly get no reentry leg.
Test: `tests/test-flight3d-cislunar-reentry.js` (8 checks). Regression: only the 3 pre-existing Codex
drifts fail. NOT browser-verified (no WebGL) — eyeball a crewed Moon-return flight.


## Session — E4.7: booster/stage separation polish (2026-07-20)

*Pure append. Sonnet tier (polish on the staging base).* Two additions: (1) an expanding additive
puff at the interstage on each detach (`cape3dSepPuffPool`/`cape3dSpawnSepPuff`/`cape3dTickSepPuffs`,
4-sprite reused pool, spawned at the detach world position, expands+fades over 900ms; ticked each
launch frame); (2) a transient flight-readout beat: `flightSeparationBeat(snapshot)` finds the
most-recent staging event within 3.2s of the current flight time and returns `BOOSTER SEP` /
`STAGE N SEP` (1-indexed) with a 1→0 fade, surfaced in the `flightAltitude` readout via a
`flight-sep-beat` span. Both reuse the real `stageEvents` — no new timing, no sim coupling.
Test: `tests/test-flight3d-sepbeat.js` (10 checks — booster vs stage label, fade ramp, none for
single-stage or outside ascent). Regression: only the 3 pre-existing Codex drifts. NOT
browser-verified (puff is Three.js) — eyeball a multi-stage launch.


## Session — E4.7: user-steerable launch camera + gradual separation (2026-07-20)

*Pure append. Heavy tier (camera feel).* (1) Launch camera was fully scripted with input detached;
now `attachCape3DInput` stays on during launch and the drag/wheel handlers branch on `launchActive`
to steer a new `cape3d.launchCam` {azOff,elOff,distMul} instead of the site cam. The ascent follow
was rewritten to a closer base distance (150 + alt*.05, was 170 + alt*.085) orbited by those offsets
— drag rotates, wheel zooms, reset each launch. `flightPan` (previously a dead hook) still layered on.
(2) Gradual separation: debris now gets an eased (smoothstep over 1.4s) retro/lateral push on top of
the ballistic path, so a stage visibly drifts back-and-down instead of the split reading as instant.
Both are Three.js visual-only (no headless tests); staging-preview.html updated to match (drag/zoom +
the eased push) for offline review. Regression: only the 3 pre-existing Codex drifts. NOT
browser-verified in-game. Bench height/diameter scale readout is the paired follow-up (Sonnet).


## Session — vehicle bench height/diameter scale readout (2026-07-20)

*Pure append. Sonnet tier.* Paired follow-up to the launch-camera slice's #3 finding: the 3D mesh
already reflects bench design (prop/dia-driven), it just had no numeric readout. New
`vehicleRealDimensions(spec)` (flight.js) gives an honest metres estimate — tank length = propellant
volume ÷ cross-section (~1.0 t/m³ representative density, single number across the game's
LOX/RP-1/methalox/solid mix) + 15% structure margin; diameter is the real value already used by the
drag model. Distinct from `buildVehicleShape`'s `h`, a deliberately-compressed rendering unit not
meant to be read as metres. Surfaced as a "📏 Vehicle scale" line in both bench readouts (flat-reqDv
and profile/multi-leg) — total height, max diameter, per-stage breakdown for 2+ stage designs.
Test: `tests/test-vehicle-dimensions.js` (12 checks — degenerate input, prop/diameter scaling
direction, multi-stage sum, crewed nose allowance, transfer-stage addition, real bench sanity).
Regression: only the 3 pre-existing Codex drifts. Build byte-faithful.


## Session — flight playback speed range widened (2026-07-20)

*Pure append. Sonnet tier.* `ANIM_SPEEDS`/`animSpeed()` (shell.js) already existed and drives
`animLoop`'s virtual-time advance for every flight overlay screen — the button lives outside
`flightCanvasWrap` so it already covered both 2D and 3D. Only offered 0.5/1/2x. Widened to
0.1x/0.25x/1x/2x/5x/10x/25x/50x per the request ("sub frames per second to much faster"). Default
speed index fixed to the 1x entry so real behavior is unchanged unless the player cycles (avoids a
silent default-speed change from array reordering). Also fixed a stale static button label ("1×
Slow" in shell.html, never matched the actual default). No change to `ANIM_MAX_WALL_DT`'s
tab-resume clamp — it still bounds wall-dt per frame before the multiplier, so high speeds stay
smoothly rendered rather than skipping frames.
Test: `tests/test-anim-speed.js` (9 checks — range, default, cycling, wraparound). Regression: only
the 3 pre-existing Codex drifts. Build byte-faithful.


## Session — launch camera distance bug + Earth-curvature reveal fix (2026-07-20)

*Pure append. Heavy tier (camera/reveal design, root-cause investigation of 3 reported symptoms).*
Player reported three launch-view issues; investigated before touching anything since they might
share one cause. Confirmed two distinct root causes, both explaining all three symptoms together:

1. **Camera distance formula bug**, introduced in the prior camera-control slice:
   `baseDist=(150+q.altitude*.05)*distMul` used q.altitude in RAW METRES, not km — by a realistic
   ~300 km orbital insertion that term alone is 15,150 units, and the zoom range (.35-3.2x) can
   only claw back a factor of ~9x, nowhere near enough. Explains "far even with zoom" directly, and
   plausibly "no ship after separation" too — a now-smaller, still-distant mesh becomes
   imperceptible next to a bright additive-blended flame sprite. Fixed: extracted into standalone
   `cape3dLaunchChaseDist(altitudeMeters)`, sqrt(km)-based, capped at 620 units — stays close
   through the low climb (where staging/pad-recession happen) and grows only gently at altitude.
2. **Earth-curvature ascent reveal was fully built (`cape3dAscentBlend`'s space/capeVisible curve)
   but force-disabled** — a past comment noted a bright full-frame flash while the async-loaded
   Earth texture decoded, so opacity was hardcoded to 0 and the flat launch-site ground plane
   forced always-visible instead. This is exactly "panning shows the square of the facility, not
   an expanding Earth." Re-wired to use the existing blend curve, gated on
   `earth.material.map.image` (true only once the texture has actually decoded) so the original
   flash risk is closed rather than worked around by disabling the feature.

Test: `tests/test-launch-camera.js` (11 checks — distance stays bounded/monotonic at any altitude,
even at min zoom-in orbital-altitude distance is sane; blend curve shape/monotonicity). Regression:
only the 3 pre-existing Codex drifts. Build byte-faithful. NOT browser-verified (no WebGL) — all
three original symptoms are plausible from the identified bugs but unconfirmed visually.


## Session — launch view: real fixes for "no ship after sep" + "pad/Earth mixed" (2026-07-20)

*Pure append. Heavy tier (root-cause investigation of persisting symptoms after a prior fix
attempt).* The prior camera-distance-formula fix did not resolve "no rocket, just plume" after
separation — the player re-reported it. Rather than theorize further, root-caused with a headless
scene-graph inspection: built a minimal THREE stub (`/tmp/three_stub.js`, not committed — a
throwaway diagnostic, not a real dependency) and actually ran `cape3dVehicleMesh()` +
`root.attach()` on a 2-stage vehicle to inspect what remains parented to the rocket after a
detach. Confirmed the MESH is fine (4 meshes remain: upper stage + nose) — the bug was the
camera/flame TARGET, not the geometry.

**Fix 1 — camera/flame target re-centring.** `target=rocket.position+55` assumed stage 0's
original span (baseY 0..totalHeight) held for the whole flight. Once stage 0 detaches, the
remaining stack's real base moved to wherever the next still-attached stage starts (verified via
the stub: baseY jumps 0→20.9 on a 2-stage test vehicle) — but the camera kept aiming at the
now-vacated space, with only the flame (which does correctly reanchor per the earlier polish
slice) in frame. New `cape3dLiveStageSpan(stageGroups, rocket)`: pure, scans which stage groups are
still parented to the rocket (a plain `.parent` property check, no THREE dependency, so directly
testable with mock objects), returns the real current span. Camera + flame targets now use its
midpoint instead of the fixed original-span assumption.

**Fix 2 — ascent-blend clock misalignment.** `cape3dAscentBlend`'s Earth-opacity ramp (`space`)
reaches full opacity at progress 0.62; the flat launch-site ground's visibility (`capeVisible`) was
on an independently-chosen clock, staying true until 0.72. A real 0.10-progress window had BOTH the
fully-opaque Earth sphere and the fully-visible flat pad simultaneously on screen — exactly "pad
and Earth mixed, no smooth transition" — then the ground popped off in a single frame once past
0.72. Aligned `capeVisible` to cut off at the exact point `space` saturates (`capeVisible:
space<1`), closing the overlap window entirely.

Test: `tests/test-launch-camera.js` grew from 11 to 24 checks — live-span recentring (mock
stage-group objects), and an exhaustive progress-range scan proving no value has both a
near-full-opacity Earth and a visible site simultaneously. Regression: only the 3 pre-existing
Codex drifts. Build byte-faithful. NOT browser-verified (no WebGL in sandbox) — both are
well-reasoned, scene-graph-confirmed fixes but the actual visual result is still unconfirmed.


## Session — fixed 2 stale test drifts (2026-07-20)

*Pure append. Sonnet tier.* Both `test-decision-panel.js` and `test-pad-a.js` failures traced to
the SAME intentional behavior from Codex's "Refine command UI and flight reporting" commit: a
failure (ascent-fail directly, or an abort that resolves to a scrub) now correctly holds on a
post-failure debrief card (`{held:true, exploding:true}`) instead of either resuming the same
animState in place or firing `done()` immediately — a real UX improvement, confirmed by pumping
each scenario to completion and inspecting the actual final state before touching either test.
Updated both to assert the new correct behavior. `test-decision-panel.js` 35/35,
`test-pad-a.js` 36/36. Only `test-flight3d-trajectory.js` remains as a known drift (Codex's
accepted trajectory/vehicle-physics changes, unrelated to this). Build byte-faithful.


## Session — BACKLOG #40: crew survival mini-arc, escape-save visual (2026-07-20)

*Pure append. Heavy tier (new visual content + real-mechanic investigation).* Investigated before
building: BACKLOG.md listed #40 as untriaged, but the underlying MECHANIC — a `launch_escape` tech
that turns a crewed ascent failure into `kind:'abort'` (crew survives) instead of crew death —
already existed, complete with UI warnings and historical flavor text. The actual gap: the 3D
failure sequence had no way to tell an escape-tower save apart from a full catastrophe (both set
`success=false/failPhase='ascent'`), so both played the identical explosion, undercutting the
already-written "the escape system pulled the crew clear" story.

Reused the existing failure-debrief system instead of new geometry: `cape3dFailureEffects` already
clones each stage group as one discrete debris "piece" with its own explosion velocity; the top
group (nose/capsule) is now tagged as the escape-pod candidate at build time (structural, not
outcome-dependent). Threaded a real signal end to end: `spec.crewEscaped` (sim.js, derived from
`crewed && outcome.kind==='abort' && failPhase==='ascent'` — both branches set the same
success/failPhase, only `kind` differs) → `flight3dPresentationSnapshot`'s `effects.crewEscaped`
(gated on the same arm-point as `ascentFailure`, never premature) → `cape3dStartFailure`/
`cape3dUpdateFailure`, which give the tagged pod piece a fast, mostly-upward clear-away velocity and
its own brief abort-motor flash instead of the generic radial debris spread, with a much slower
fade so it reads as "leaving," not "vanishing with the explosion." Readout branches to "LAUNCH
ESCAPE — CREW CLEAR" vs "VEHICLE LOSS".

Test: `tests/test-crew-escape.js` (12 checks) — signal only fires for a genuinely crewed,
abort-kind, ascent-phase save; never premature (gated with ascentFailure); never for an uncrewed
flight or a real loss; a deep-phase failure never sets it (abort only exists on ascent today);
readout text branches correctly. Pod clear-away render itself isn't headless-testable (no WebGL) —
every value driving it is. Regression: only the 1 pre-existing Codex drift
(`test-flight3d-trajectory.js`). Build byte-faithful. BACKLOG.md #40 marked shipped.


## Session — tech-tree audit + fixed 2 dead capstone nodes (2026-07-20)

*Pure append. Heavy tier (game-design/balance judgment).* Audited the full 110-node RESEARCH tree
structurally: 14 tracks (~8 nodes each), cost scales cleanly with prereq depth (avg 2.8 at root →
6.4 mid → 18 at the single deepest node), reliability aggregate (+0.89 across 28 nodes) is hard-
capped by relCap so it can't trivialize the core risk mechanic — all good design. Two real problems
surfaced: (1) `megastructure_construction` (cost 18, the most expensive node in the game) and
`atmospheric_isru` (cost 10) had `effect:{}` AND zero references anywhere outside their own
definition — verified via grep that nothing gated on them, nothing consumed them. Researching either
did nothing: the worst possible payoff for an endgame capstone. (2) Broader: ~35 nodes are
+0.02-type passive stat-shavers (32% of tree) that are individually imperceptible, and 36 nodes are
dead-end leaves — real "complexity without consequence" bloat.

Fixed (1) this session: wired both dead nodes to real, cap-bounded economic effects matching their
existing flavor text — `megastructure_construction` → `buildCostCut:0.10 + buildTimeCut:1.5`
(kilometer-scale orbital construction rewrites the production economy); `atmospheric_isru` →
`launchCostCut:0.08` (gas-giant propellant relieves the launch-cost burden of outer-system ops).
Both use existing effect fields consumed by `mfgBuildMult`/`groundLaunchMult`/`buildTimeCut` through
the `dimCurve` soft-knee (identity below cap 0.30, asymptotes toward 0.80, never trivializes) — no
new machinery, felt but bounded. Confirmed the 14 remaining `effect:{}` nodes are NOT dead: they
gate content via `reqMissionDone`/prereq chains or apply point-of-use multipliers (e.g.
`strapon_integration` gates the booster card, `orbital_eva` a crewed-reliability multiplier,
`megawatt_electric` a 1.10 factor).

Deferred (2) for a future dedicated balance pass, logged in CLAUDE.md: merge the passive stat-node
clusters (the 6-node guidance reliability chain radio→inertial→digital→star_trackers→autonomous→
quantum is the clearest candidate) toward ~85 punchier nodes. That's a real balance/design pass, not
a fix — scope it deliberately.

Test: `tests/test-tech-capstones.js` (13 checks — both now non-empty; effects match fantasy;
researching them moves the real effect sums; the whole tree stays under the dimCurve asymptote;
values are substantial, not tokenistic). Regression: only the 1 pre-existing Codex drift. Build
byte-faithful.


## Session — tech-tree design pass, slice 1: guidance merge 6→3 (2026-07-20)

*Pure append. Heavy tier (balance/design). First slice of the tree-tightening pass flagged by the
earlier audit.* Owner waived back-compat, so this does real merges (option 1), sliced one track at a
time. Guidance track's six-node linear reliability chain (radio_guidance → inertial_nav →
digital_computer → star_trackers → autonomous_navigation → quantum_navigation — each a +0.02-to-0.03
shrug) collapsed to three meaningful steps:
- `digital_computer` ("Onboard Guidance & Flight Computer") absorbs radio_guidance + inertial_nav:
  req:[], reliability 0.07 (=0.02+0.02+0.03), cost compressed 7.5→5.
- `autonomous_navigation` ("Autonomous Deep-Space Navigation") absorbs star_trackers: req:
  digital_computer, reliability 0.06 (=0.03+0.03), cost 8.5→7.
- `quantum_navigation` kept unchanged as the deep-tail capstone (req: autonomous_navigation).

Method (the reusable recipe for the remaining slices): grepped every external reference FIRST and
kept the two load-bearing ids — `digital_computer` gates `deep_space` (cislunar unlock) and
`flight_automation`, and has a leveled variant in sim.js keyed by that id; `autonomous_navigation`
feeds the `autonomous_landing` synergy. Collapsed only the pure-stat nodes that nothing else
references (radio_guidance/inertial_nav/star_trackers → now zero references anywhere). Preserved the
EXACT 0.15 chain reliability total (verified) — this is a legibility change, not a power change.

Test: `tests/test-tech-guidance-merge.js` (18 checks — chain is now 3 nodes; removed ids gone; no
dangling reqs anywhere; all four external gates still resolve; reliability total exactly preserved;
each survivor is a substantial step; costs compressed not inflated; leveled variant intact).
Regression: only the 1 pre-existing Codex drift. Build byte-faithful.

Remaining clusters for future slices (same recipe): testing (9 nodes → ~4-5), structures (7 sigma
nodes → ~4), propulsion combustion sub-chain (combustion_stability→turbopump→regen_cooling→
chamber_pressure, 4 → ~2). Each is its own slice; grep-for-external-refs first every time.


## Session — tech-tree design pass, slice 2: testing merge 9→5 (2026-07-21)

*Pure append. Heavy tier (balance/design). Second slice of the tree-tightening pass, same recipe as
slice 1.* Testing & Reliability track was nine nodes: `test_program` (root) branching into
`qa_program` (a standalone QA node), an instrumentation/qualification chain (`flight_telemetry` →
`vibration_testing` → `accelerated_life_testing` → `digital_twin` → `autonomous_qa`), and an
engine/stage chain (`engine_test_stands` → `stage_test`). Collapsed to five nodes:
- `test_program` — untouched. NOT merged: it's load-bearing beyond its listed effect — sim.js
  directly multiplies ascent propulsion-failure weight by 0.7 when researched, and render.js gates a
  bench-tab CTA on it. A pure-stat node this is not.
- `qa_program` — untouched. Load-bearing: required (with `rapid_inspection`) by the `rapid_refurb`
  synergy that unlocks the `lic_refurb` contract.
- `flight_qualification` ("Flight Instrumentation & Qualification") absorbs `flight_telemetry` +
  `vibration_testing`: req test_program, reliability 0.07 (=0.04+0.03), cost compressed 4.5→3.5.
- `engine_test_stands` kept its id (grep found it's the req for `heavy_booster` in the propulsion
  track — the one external gate in this whole cluster) while absorbing `stage_test`: req
  test_program, reliability 0.05 (=0.02+0.03), cost compressed 5.0→3.5.
- `autonomous_test_program` ("Autonomous Life-Cycle Testing") absorbs `accelerated_life_testing` +
  `digital_twin` + `autonomous_qa`: req flight_qualification (chain re-pointed since
  vibration_testing is gone), sciCost 20 preserved from digital_twin, reliability 0.09
  (=0.03+0.04+0.02), cost compressed 14.5→10.0.

Reliability total preserved exactly: 0.34 before and after. Method: grepped every external reference
first (whole repo, not just data.js) — this is what caught `engine_test_stands` as load-bearing via
`heavy_booster`, which a data.js-only grep would have missed since the reference lives in the
propulsion block, not the testing block. Kept that id as the merge survivor rather than renaming, so
no downstream req needed updating.

Test: `tests/test-tech-testing-merge.js` (28 checks — track is now 5 nodes; all 6 removed ids gone;
no dangling reqs; heavy_booster still gates on engine_test_stands; rapid_refurb still requires
qa_program; reliability total exactly 0.34; each merged survivor is a substantial step; costs
compressed not inflated; sciCost carried over; test_program's point-of-use effect still fires;
fresh-game reachability). Regression: full suite run, only the 1 pre-existing Codex drift
(`test-flight3d-trajectory.js`, unrelated) — everything else including
`test-tech-guidance-merge.js` (slice 1, still 18/18) and `test-tech-capstones.js` (13/13) clean.
Build byte-faithful (`node build.js --check` passes before commit).

Remaining clusters for future slices (same recipe): structures/sigma track (7 nodes → ~4), propulsion
combustion sub-chain (combustion_stability→turbopump→regen_cooling→chamber_pressure, 4 → ~2). Each is
its own slice; grep-for-external-refs first every time, across the WHOLE repo not just the track's
own file section — the engine_test_stands case shows a load-bearing ref can live far from the node's
own listing.


## Session — tech-tree design pass, slice 3: structures merge 7→4 (2026-07-21)

*Pure append. Heavy tier (balance/design). Third slice of the tree-tightening pass, same recipe as
slices 1-2.* Structures/sigma track was a strictly linear 7-node chain (`alloy_tanks` →
`balloon_tanks` → `composite_structures` → `friction_stir_welding` → `carbon_cryotanks` →
`self_healing_materials` → `metamaterial_structures`). Unlike reliability (summed), each of these
nodes directly SETS `state.sigma` on completion — so the chain is a sequence of stepping-stone floors
from the 0.12 baseline down to 0.040, not an additive stack. Collapsed to 4 nodes:
- `alloy_tanks`, `balloon_tanks` — both untouched. NOT merged: repo-wide grep found a tiered if/else
  in sim.js (`if(state.research.balloon_tanks) ws*=0.6; else if(state.research.alloy_tanks) ws*=0.78`)
  keying the ascent structural-failure weight directly off these two research flags — a two-step
  point-of-use gate exactly like `test_program` in slice 2. `balloon_tanks` is also required by the
  `lightweight_cryo` synergy (with `cryo_upper`). Both ids preserved unchanged.
- `composite_isogrid_structures` ("Composite Structures & Friction-Stir Welding") absorbs
  `composite_structures` + `friction_stir_welding`: req balloon_tanks, sigma floor 0.050 (the deeper
  of the two absorbed values, since sigma is a SET not a sum), cost compressed 8.5→6.5.
- `advanced_composite_structures` ("Carbon-Fiber, Self-Healing & Metamaterial Structures") absorbs
  `carbon_cryotanks` + `self_healing_materials` + `metamaterial_structures`: req
  composite_isogrid_structures, sigma floor 0.040 (the deepest/final value — same endgame mass-ratio
  ceiling as before), cost compressed 24.0→22.0 (the shallowest discount of any merge slice yet — this
  absorbs the game's 3 most expensive structures nodes and 22.0 still front-loads real capital, on
  purpose: this is the endgame capstone tier, not a cheap consolidation).

Final sigma floor preserved exactly: 0.040 reachable via the same 4-step chain order as before,
verified by simulating `completeResearch`'s sigma-set side effect end-to-end from the 0.12 baseline.
Method (unchanged from slice 2, worth restating): grepped every external reference to all 7 ids
across the WHOLE repo, not just data.js — this is what caught the alloy_tanks/balloon_tanks
point-of-use gate in sim.js, which a data.js-only pass would have missed entirely, exactly as
engine_test_stands' heavy_booster reference was missed by a naive grep in slice 2.

Test: `tests/test-tech-structures-merge.js` (21 checks — track is now 4 nodes; all 5 removed ids
gone; no dangling reqs; alloy_tanks/balloon_tanks chain and gates intact; lightweight_cryo still
resolves; both sigma floors (0.050 intermediate, 0.040 final) preserved exactly; costs compressed not
inflated; full-chain simulation reaches 0.040 from the 0.12 baseline). Regression: full suite run,
only the 1 pre-existing Codex drift (`test-flight3d-trajectory.js`, unrelated) — everything else
including slice 1's `test-tech-guidance-merge.js` and slice 2's `test-tech-testing-merge.js` still
clean. Build byte-faithful (`node build.js --check` passes before commit).

Remaining cluster for a future slice (same recipe): propulsion combustion sub-chain
(combustion_stability→turbopump→regen_cooling→chamber_pressure, 4 → ~2). Grep the WHOLE repo for
external refs before merging any of the four — the pattern in slices 2-3 (a load-bearing point-of-use
gate hiding outside the track's own file section) has held twice in a row now, so assume it holds
again until proven otherwise.


## Session — tech-tree design pass, slice 4: combustion chain merge 4→2 — PASS COMPLETE (2026-07-21)

*Pure append. Heavy tier (balance/design). Fourth and final slice of the tree-tightening pass.*
Propulsion combustion sub-chain (`combustion_stability` → `turbopump` → `regen_cooling` →
`chamber_pressure`) was structurally different from slices 1-3: **every** node in this 4-node chain is
externally load-bearing — `combustion_stability` gates `sustainer`; `turbopump` gates `heavy_booster` +
`strapon_integration`; `regen_cooling` gates `methane_propulsion`; `chamber_pressure` gates
`super_heavy` + `full_flow_staged`. No pure-stat node existed to quietly drop, unlike the guidance,
testing, and structures tracks. Collapsed 4→2 anyway by picking the survivor id at each pair with the
heavier external footprint and re-pointing the lighter dependent onto it:
- `turbopump` (kept id — 2 external dependents vs `combustion_stability`'s 1) absorbs
  `combustion_stability`: req kerosene (unchanged root), thrust 0.09 (=0.04+0.05), cost compressed
  4.5→3.5. `sustainer`'s req re-pointed from the removed `combustion_stability` onto `turbopump`.
- `chamber_pressure` (kept id — 2 external dependents vs `regen_cooling`'s 1) absorbs `regen_cooling`:
  req turbopump, isp 0.08 (=0.04+0.04) + thrust 0.05 (unchanged), cost compressed 6.5→5.0.
  `methane_propulsion`'s req re-pointed from the removed `regen_cooling` onto `chamber_pressure`.

**Flagged explicitly, not a silent side effect:** this is a real gating-*granularity* change, not just
legibility, unlike slices 1-3. Before, `sustainer` sat one node shallower than
`heavy_booster`/`strapon_integration`; `methane_propulsion` sat one node shallower than
`super_heavy`/`full_flow_staged`. After, both pairs now gate on the same merged node — `sustainer` and
`methane_propulsion` each cost one extra research step to reach than before. Thrust/Isp effect TOTALS
are preserved exactly (0.14 thrust, 0.08 isp, same as the old 4-node chain), but this specific slice
does shift *when* those two nodes become available, unlike the pure legibility wins in slices 1-3.
Documented here and asserted directly in the test suite (section 8) rather than left implicit.

Test: `tests/test-tech-combustion-merge.js` (21 checks — chain is now turbopump + chamber_pressure;
both removed ids gone; no dangling reqs; all 6 external dependents re-verified (2 re-pointed, 4
unchanged since their gating id survived); thrust/isp totals exactly preserved; costs compressed not
inflated; the granularity change explicitly asserted; fresh-game reachability). Additionally ran a
full-tree reachability + dangling-req proof across the whole 98-node RESEARCH array (down from 110
before this 4-slice pass) post-merge: 0 dangling reqs, 0 unreachable nodes, matching the same proof
style the original 2026-06-21 tech-tree buildout used. Regression: full suite run, only the 1
pre-existing Codex drift (`test-flight3d-trajectory.js`, unrelated) — everything else including slices
1-3's dedicated test files all still clean. Build byte-faithful (`node build.js --check` passes before
commit).

**This closes the tech-tree tightening pass** flagged by the 2026-07-20 audit. Summary across all 4
slices: 110 → 98 nodes (12 removed, 0 orphaned, 2 dead capstones fixed pre-pass). Guidance 6→3,
testing 9→5, structures 7→4, combustion 4→2. Every merge preserved its track's effect total (or, for
structures, its final sigma floor) exactly; the combustion slice is the one exception where gating
depth (not total power) shifted, called out above. No further clusters are queued — the tree is at a
natural resting point. A future balance pass could still revisit: the ~35 nodes flagged in the
2026-07-20 audit as individually-imperceptible passive stat-shavers span multiple tracks beyond the 4
tackled here (guidance/testing/structures/combustion were the clearest linear-chain candidates;
what's left is more scattered and would need a different approach than "collapse a chain").

---

**Note for Codex** (or whichever agent picks this repo up next): the tech-tree design pass that
started with the 2026-07-20 audit is now complete across 4 slices (this file, search "tech-tree design
pass" for all of them). `RESEARCH` in `src/data.js` is now 98 nodes, down from 110. If you're
auditing, testing, or building against tech-tree node ids, the following ids **no longer exist** and
will need updating in any external references, saved test fixtures, or docs you maintain:
`radio_guidance`, `inertial_nav`, `star_trackers` (guidance, slice 1); `flight_telemetry`,
`vibration_testing`, `accelerated_life_testing`, `digital_twin`, `autonomous_qa`, `stage_test`
(testing, slice 2); `composite_structures`, `friction_stir_welding`, `carbon_cryotanks`,
`self_healing_materials`, `metamaterial_structures` (structures, slice 3); `combustion_stability`,
`regen_cooling` (combustion, slice 4). Their functionality was folded into surviving nodes — see each
slice's entry above for the exact mapping and the reasoning. No save-compat shim was added (owner
waived back-compat for this pass), so anything keying off the old ids will silently no-op rather than
error — check `RESEARCH.find(r=>r.id===...)` for `undefined` if you're touching this area.


## Session — Palette Population PP.0: gate infrastructure (2026-07-21)

*Pure append. Heavy tier (design/integrity judgment throughout — no lighter-model sub-slice in PP.0).*
First slice of the palette-population epic that follows the part-builder assessment: the E3 VAB-style
part bench (`BENCH_V2`, still flagged OFF) has a beautifully-engineered chassis but only 7 parts and
ONE engine. PP.0 builds the gate machinery the full catalogue needs, tested against the existing 7
parts + synthetic gated parts, before any new part data lands (same make-or-break role E3.0 played).

**Three things built:**

1. **`partAvailable(def, st)` — research/unlock gate.** An engine part (`def.engId`) is available iff
   its engine id is in `state.unlocked`; a part with `def.reqResearch` iff that node is researched;
   base parts (`def.base:true`) always. This mirrors the SLIDER bench's existing
   `state.unlocked[e.id]` engine filter EXACTLY (render.js unlockedEngines / renderStages) — keeping
   both benches on one unlock signal is the whole point of the E3 equivalence discipline: the palette
   can never offer an engine the slider bench would refuse. Because `reconcileResearch` repopulates
   `state.unlocked` from the LIVE `RESEARCH` array, the tech-tree merges we did earlier this session
   can't strand a part. Marked the 5 always-on base parts (`tank_std`, `decoupler`, `nosecone`,
   `capsule_mk1`, `probe_core`) with explicit `base:true` so intent is greppable and a future typo'd
   `engId` can't silently fall through to "available".

2. **`era` is deliberately NOT a hard gate.** ERAS are soft/overlapping/calendar-driven by design
   (see currentEra in data.js); the game gates capability on RESEARCH, not year. `def.era` stays a
   display-sort/flavor hint only. Documented in the partAvailable header so a future slice doesn't
   "fix" it into a hard gate.

3. **transfer-only enforcement in `canAttach`.** A `transferOnly` engine (NTR/NEP/ion/Hall/fusion)
   can't power a launch stage — mirrors the slider bench's `!e.transferOnly` filter on ground stages.
   "Launch stage" is defined in graph terms via new `attachWouldBeLaunchStage(build, parentUid)`: the
   bottom-most spineGroups group (below the lowest decoupler, which fires first). Radial parents
   resolve to their spine anchor; fail-OPEN (stricter) on an unresolvable spine so a malformed build
   never permits a transfer engine on the pad.

**Key architectural decision (this is why PP.0 is heavy-tier, not data entry): the availability gate
lives at the INTERACTION layer, NOT in `canAttach`'s graph validation.** Availability is a UI
affordance (what the palette offers); graph integrity is separate. A loaded save may legitimately hold
a part that research changes have since gated, and the graph MUST still represent it — so
`partAvailable` gates `benchPaletteClick` and `benchCanvasDrop`, while `canAttach`/`attachPart` stay
research-agnostic. transfer-only, by contrast, IS physics integrity (a transfer engine on the pad is
wrong however the build was made), so it stays in `canAttach`. This split was forced by a real signal:
`test-parts-staging.js` builds with `booster_solid` right after `newGame` without unlocking
`solid_castor` — putting the gate in `canAttach` broke 5 E3.3 staging tests, which correctly want to
construct any topology regardless of research. Moving the gate to the interaction layer fixed that AND
is the more correct design.

**Diameter compatibility turned out to already exist** (E3.2 `nodesCompatible` hard-blocks class
mismatch across the 4 NODE_CLASS tiers tiny/small/large/huge). PP.0's original scope assumed this
needed building; it didn't. Re-verified in the test suite so the "PP.0 needs diameter work" assumption
is on record as false — the future large-engine parts just declare the right node class, no adapter
machinery needed yet (adapters are a later parts-data question, not gate infrastructure).

**Palette rendering:** locked parts stay VISIBLE but greyed (opacity 0.45, dashed border, 🔒 badge,
unlock reason shown + in tooltip) rather than vanishing — the player sees what's coming and what to
research for it. `partLockReason(def)` names the engine to unlock in R&D.

Test: `tests/test-parts-gate.js` (27 checks — base/engine/reqResearch availability; slider-bench
signal parity; lock reason; the interaction-vs-graph layer split proven both directions; transfer-only
refused on launch stage + allowed on upper; attachWouldBeLaunchStage predicate incl. radial resolution;
diameter-already-built re-verification). All 8 existing E3 part suites still green (staging 31,
attach 29, bridge 31, physics 21, migration 28, ui 23, render 26, polish 18). Regression: only the 1
pre-existing Codex drift. Build byte-faithful.

**Next (PP.1 — launch propulsion, MEDIUM tier, and the first place a lighter model fits):** the ~12
launch/upper liquid + solid engine parts, each `engId`-linked and auto-gated by PP.0's machinery, with
per-tier harness equivalence coverage (a part-built F-1 vehicle must produce the same numbers as the
slider bench with an F-1). Once the engine→part mapping is locked, PP.1 is genuinely "type the decided
entries + stamp the harness" — flag the model down at that point. Full remaining plan: PP.1 launch
propulsion, PP.2 transfer propulsion (exercises the transfer-only gate + power-balance bite), PP.3
structural/payload (diameter tank tiers, fairings), PP.4 palette polish. Still all headless behind
BENCH_V2 — the browser-playtest caveat from the E3.6 ROADMAP entry stands; populating the palette makes
the flagged-off bench more worth turning on but doesn't substitute for a real-browser pass.


## Session — Palette Population PP.1: launch/upper propulsion (2026-07-21)

*Pure append. Started heavy tier (mapping lock, still design judgment); execution itself was the
first genuinely lighter-tier PP slice as flagged in PP.0.* 13 new engine parts landed against the
mapping locked and signed off earlier this session: `engine_s3d` (kerolox_mk1), `engine_vernier`
(vernier_v), `engine_ma3` (kerolox_mk2), `engine_lr79` (kerolox_le), `engine_h1` (kerolox_mk3),
`engine_f1` (f1_class), `engine_methalox` (methalox), `engine_aj10` (hyper_storable), `engine_j2`
(hydrolox_up), `engine_rl10` (hydrolox_rl10), `engine_methalox_vac` (methalox_vac),
`stage_solid_scout` (solid_scout, self-contained axial stage), `booster_srb` (solid_srb, radial heavy
strap-on generalizing the existing booster_solid one tier up). `PART_DEFS` now 20 total (7 pre-PP.1 +
13 new). Every part is `engId`-linked (no duplicated thrust/isp/mass — all flows from `ENGINES`), gated
automatically via PP.0's `partAvailable()` off the SAME `state.unlocked[engId]` signal the slider bench
already uses, and node-class-sized to its thrust tier (tiny<150kN vac / small 150-900 / large 900-3000
/ huge>3000).

**Honest finding surfaced by building this slice, not glossed over:** the game has exactly ONE tank
part today (`tank_std`, node class `small`). That means only the 4 `small`-class liquids
(`engine_s3d`, `engine_ma3`, `engine_lr79`, `engine_methalox_vac`) plus the self-contained
`stage_solid_scout` can actually be PLACED in a build right now. The 3 `tiny`-class engines
(`engine_vernier`, `engine_aj10`, `engine_rl10`) and the 4 `large`/`huge`-class engines (`engine_h1`,
`engine_f1`, `engine_methalox`, `engine_j2`) plus `booster_srb` — 8 of the 13 new parts — are
CORRECTLY and DELIBERATELY refused by E3.2's existing diameter-class gate (`nodesCompatible`'s hard
class-mismatch block, verified already built in PP.0). This is the exact PP.3 dependency flagged when
the mapping was signed off, now concretely visible: those 8 parts are geometrically inert until PP.3
ships matching tank tiers (tiny/large/huge). The gate working correctly here — refusing an F-1 under a
standard tank instead of silently allowing a wrong-scale build — is the diameter system doing its job,
not a defect.

**Data integrity is NOT blocked on PP.3, though.** Every one of the 8 pending parts carries verified-
correct physics: `engId` resolves to the right `ENGINES` entry, and — via the same `_engOverride`
stamping technique the E3.0 harness already established — each one's Δv/TWR contribution through the
bridge-core (`stackPerformance(ir.stages, ir.payload)`) matches the direct slider-path calculation
exactly. So when PP.3 lands the missing tank tiers, these parts' physics is already proven right; only
the attach geometry was pending.

**Test-convention correction worth recording:** the first equivalence pass failed all 5 attachable-
today parts by ~7 m/s each — not a part-data bug, but a wrong comparison function. `stackPerformanceForBuild`
(the E3.4 aero-aware wrapper) deliberately layers a small drag-loss reward on top of the core physics
for part-built vehicles ("the slider bench has never modeled drag; part-built vehicles get to" — E3.4
header comment) — it is SUPPOSED to diverge from the direct slider path by design. Switched to
`stackPerformance(ir.stages, ir.payload)` — the exact convention `test-parts-bridge.js` already uses —
to isolate what this slice needs to prove (bridge conversion fidelity for the new parts), and added an
explicit check (section 3b) confirming the aero divergence IS present and intentional on the full-bench
path, so the choice of comparison function is asserted, not just quietly made.

Test: `tests/test-parts-pp1-propulsion.js` (120 checks — data integrity for all 13 parts; universal
lock-at-game-start + unlock-signal-parity gating; real end-to-end attach+bridge+equivalence for the 5
usable-today parts including the self-contained solid stage; the E3.4 divergence proof; honest
diameter-gate refusal for the 8 pending parts; physics-correctness-via-override for those same 8;
booster_srb's E3.3 booster-detection contract shape). Regression: full suite, only the 1 pre-existing
Codex drift. Build byte-faithful.

**Next: PP.2 — transfer propulsion** (medium-heavy tier — exercises the transfer-only gate built in
PP.0 for real, plus the power-balance/low-thrust interactions for the 5 `transferOnly` engines: NTR,
NEP, Hall, ion, fusion torch). **Then PP.3 — structural/payload**, which is no longer just "nice to
have diameter tiers" but the thing that unlocks 8 of PP.1's 13 parts plus whatever PP.2 adds. Consider
resequencing PP.3 ahead of PP.2 if the goal is "make what's already built usable" rather than "keep
adding data" — worth a decision before starting either.


## Session — Palette Population PP.3: diameter tank tiers + adapters (2026-07-21)

*Pure append. Lighter tier throughout (structural data + straightforward adapter geometry, no new
gate machinery needed).* Sequenced ahead of PP.2 deliberately — PP.1 left 8 of its 13 new engine parts
geometrically stranded (correctly refused by the diameter gate, since the game only had one tank,
'small'-class tank_std). PP.3 unsticks them rather than adding more data behind the same wall.

**6 new structural parts**, `PART_DEFS` now 26 (up from 20):
- `tank_tiny` / `tank_large` / `tank_huge` — one tank per non-small `NODE_CLASS` tier (tiny 0.5,
  large 1.6, huge 2.4), matching the engine tiers PP.1 already shipped. Nominal `propMass` scales
  ~diameter² (2.0 / 20.0 / 46.0t) as a starting point — same "stretchable, not a hard cap" contract
  `tank_std` already has. No research gate (`base:true`): tank diameter is a structural choice, not a
  tech unlock, consistent with `tank_std`/`decoupler`/`nosecone` already being base parts.
- `adapter_tiny_small` / `adapter_small_large` / `adapter_large_huge` — thin structural parts with two
  DIFFERENT node classes (top faces the narrower tier, bottom the wider), so the game's existing
  small-class-only payload/decoupler/nosecone can cap a stack of ANY diameter instead of needing 4x
  redundant copies of every structural/payload part. Standard KSP solution to exactly this problem.

**Verification, precisely targeted at what PP.1 flagged as pending:** all 8 previously-stranded parts
(`engine_vernier`, `engine_h1`, `engine_f1`, `engine_methalox`, `engine_aj10`, `engine_j2`,
`engine_rl10`, `booster_srb`) now attach cleanly to their matching tank tier — re-tested directly
against PP.1's own list, not just spot-checked. A full cross-tier stack (capsule → adapter →
`tank_large` → adapter → `tank_huge` → `engine_f1`) builds end-to-end and bridges without error.
Confirmed a real, correct, PRE-EXISTING accumulation behavior along the way: two tank sections joined
by an adapter with no decoupler between them are the SAME stage, so their propellant sums (20+46=66)
— a tapered single stage feeding one engine, not a bug. Per-tier equivalence proven for the large tier
(H-1 + tank_large) and tiny tier (RL10 + tank_tiny) against the direct slider path, same
`stackPerformance(ir.stages, ir.payload)` bridge-core convention as PP.1/E3.0.

**Two of my own test mistakes caught and fixed in this slice, both worth recording as the same class
of error:** (1) first attach-check attempt capped a tiny/large/huge tank directly under `probe_core`
(small-class) with no adapter — the resulting "no such part" failures were the test proving exactly
why adapters are needed, not a part-def bug; fixed by testing tank↔engine compatibility in isolation
(tank as build root). (2) the large-tier equivalence check hardcoded the direct-path payload as the
capsule's 1.2t alone, missing that `ir.payload` correctly folds in the adapter's 0.15t dry mass too —
fixed by comparing against `ir.payload` on both sides rather than a hand-computed figure. Also fixed a
brittle pattern flagged for the future: PP.1's test asserted an exact GLOBAL `PART_DEFS` count (20),
which PP.3 correctly grew past (26) — broke PP.1's suite on this session's regression sweep. Rewrote
both PP.1's and PP.3's count checks to assert their own slice's delta (their own parts exist) rather
than a global total, so PP.4 won't repeat the same break.

Test: `tests/test-parts-pp3-structural.js` (53 checks — tank/adapter data integrity; all 8 PP.1-
stranded parts unstuck; adapter class-pairing correctness incl. refusing a mismatched third tier;
full cross-tier bridge; tapered-stage propellant-sum sanity; large-tier and tiny-tier equivalence).
Regression: full suite, only the 1 pre-existing Codex drift (both PP.1 and PP.3 suites now stable
against each other's part counts). Build byte-faithful.

**Deliberately deferred, not forgotten:** fairing and avionics TIERS (the slider bench's
`FAIRINGS`/`AVIONICS` tables) have no equivalent in the part-graph bench at all — confirmed by grep,
`parts.js` never references `curParts()`/`fairingPart()`/`avionicsPart()`. Tank MATERIAL (`TANK_MATERIALS`,
the σ tiers), by contrast, is confirmed ALREADY correctly shared across both benches via the global
`curSigma()`/`tankMaterial()` path — no part-level work was needed there, and none was done. Whether
fairing/avionics tiers become graph parts is a real, separate design question for a future slice, not
folded into PP.3's diameter-focused scope.

**Status: PP.0/PP.1/PP.3 are all now mutually consistent — the palette has 26 parts, every non-base
part is research-gated, every diameter tier has a matching tank, and the 8 previously-stranded PP.1
engines are all buildable.** Remaining planned slice: **PP.2 — transfer propulsion** (the 5
`transferOnly` engines: NTR, NEP, Hall, ion, fusion torch — exercises PP.0's transfer-only gate for
real, plus the power-balance/low-thrust interactions those engines are built to trigger). After PP.2,
consider a PP.4 palette-polish pass and, separately, a real browser playtest before `BENCH_V2` ships —
that caveat from the E3.6 ROADMAP entry still stands; the palette is far more populated now but still
entirely unverified outside the headless harness.


## Session — BACKLOG #37: Max-Q structural check vs. fairing choice (2026-07-22)

*Pure append. Heavy tier (physics extension + balance judgment).* "Max-Q" was purely cosmetic
(2D-canvas display formula, `35 + reqDv*0.003`, zero gameplay weight); the fairing choice was a
flat reliability delta blind to the actual trajectory flown. Connected them via a real physics
quantity for the first time:

`cape3dTrajectoryPlan` (render.js) now computes and exposes real dynamic pressure per trajectory
point (`qKpa = 0.5·ρ·v²`, reusing the ρ/v² the existing drag term already integrates — no new
physics, just exposing what was already computed) and a `maxQKpa` peak on the plan. This reflects
each vehicle's actual diameter/mass/thrust/gravity-turn shape — verified narrower vehicles (less
drag area, accelerate faster while still low) peak higher than wide ones for the same design, and
a 2-stage orbital design peaks roughly 2× a small suborbital hop.

New `vehicleMaxQ(m, vehicle)` and `structuralLoadAssessment(m, v, crewed)` (sim.js): builds the
mission's real physics spec, runs the trajectory, reads the peak, and combines it with fairing
sensitivity (none 1.6×, standard 1.0×, heavy 0.65×; crewed flights carry a capsule so use neutral
1.0× regardless of the fairing field) into a bounded weight multiplier and a qualitative band
(Low/Nominal/High/Severe) — game-scaled reference point (`MAXQ_REF=420`) since the integrator runs
roughly 10× real-world kPa.

Modulates `subsystemFragilities`'s `structures` weight — attribution only. `subsystemReport`
renormalizes so `rel_i = R^(weight_i/ΣW)`, which guarantees `∏rel_i = R` exactly for ANY weight
distribution — proven in the test with exact equality (not a tolerance check), across three fairing
choices. This means the mechanic is balance-neutral on aggregate mission difficulty by
construction: a no-fairing vehicle flying a high-Q ascent gets blamed for structural failures more
often, but the overall chance of *some* failure is unchanged — matching the design goal ("part
relevance," not "part power creep").

Surfaced as a "🛡 Structural load" flag on both bench readouts (flat-reqDv and profile/multi-leg),
alongside the existing "📏 Vehicle scale" line, with a plain-language note explaining the fairing
interaction for the player's specific design.

**Test-budget fix found in the same session (not stale, reproduced 3× against live GitHub content):**
`test-pad-a.js`'s orbital-success pump loop used a 3000-frame budget sized for the pre-mission-control
1x default speed; at the now-intentional 0.1x default (confirmed with the owner, not reverted) each
frame contributes at most 5ms of virtual time (ANIM_MAX_WALL_DT clamp × speed), so a ~15.5-21.6s
flight needs up to ~4300 frames — bumped to 6000 with the math documented inline. Confirmed via a
byte-for-byte diff against live GitHub content that this wasn't a local staleness artifact.

Test: `tests/test-maxq-fairing.js` (18 checks — real q exposure on every trajectory point, vehicle-
shape sensitivity direction, fairing-band response on an aggressive design, the aggregate-neutrality
invariant proven exactly across all three fairing choices, crewed-neutral sensitivity, graceful
degradation on a degenerate mission). Regression: 96 suites, only the 1 pre-existing Codex drift
(`test-flight3d-trajectory.js`). Build byte-faithful.

Claimed and cleared per the STATUS-block convention (first real use of it end to end).


## Session — Flight 3D frozen-vehicle sync + staging/haze repair (2026-07-22)

The reported “tiny basic rocket” and “sound, then plume with no rocket” were one lifecycle defect:
the persistent Cape scene cached the starting one-stage A-4 while the launch simulation used a later,
frozen multi-stage vehicle. At core separation the renderer therefore detached the stale mesh's only
stage/nose, even though the real launch still had upper stages. Flight 3D now normalizes and signs the
immutable launch spec/snapshot, rebuilds any mismatched pad/ascent craft plus its launch/failure FX,
and synchronizes the orbit/transfer craft. A topology guard requires exact stage/transfer kinds and
booster count before separation. Bench edits also refresh the idle pad mesh. No sim/outcome balance
changed.

Secondary correctness fixes in the same path: engine ids survive spec snapshots; separation vx/vy
are no longer discarded; live-stack targeting is proportional to the remaining stage height and is
converted through the pitched rocket's world transform; the camera-side fill is directional so it
does not disappear with inverse-square distance at staging.

The ascent wash was fixed as an Earth-scale rendering problem. Local FogExp2 now decays
exponentially and never affects Earth/atmosphere/stars; Cape and Earth use a complementary 28–70 km
cross-fade; sky, clouds, and atmosphere have separate restrained altitude curves; the chase camera
settles toward the geometric horizon. The packaged daytime Earth map is rendered unlit (it already
contains lighting) and quaternion-oriented so the launch tangent is Cape Canaveral, 28.4°N / 80.6°W,
with a tangent roll that puts Florida/Bahamas in the foreground instead of the north-pole ice or a
featureless Atlantic patch.

Actual generated-game WebGL validation in headless Firefox used a three-stage/two-booster vehicle.
Pad topology was 3+2; at the first core event the attached-stage mask was
`[false,true,true]`, separated booster/core objects existed, the lit upper stack remained visible,
fog was ~`1.25e-9` at 94.7 km, the 2048 px map was applied, and the measured tangent was exactly the
Cape coordinate. New `test-flight3d-vehicle-sync.js` is 14/14; staging 30/30; launch camera 46/46.
Full sweep: 97 suite files pass, only the established `test-flight3d-trajectory.js` drift remains;
build parity and `git diff --check` clean. A Node compatibility shim also makes the harness's
virtual `performance.now` writable again, restoring all animation suites under the current runtime.


## Session — Flight 3D booster-first staging + post-ascent stack (2026-07-22)

The user's remaining “boosters stay attached to the end” report had two reproducible causes. The
bench's first-click booster default is 20 t each and selects the always-unlocked A-4. Two such
boosters burn for ~160 s, almost twice a normal 12 t S-3D core. Flight 3D had been burning booster
and core propellant in parallel, so the core event could precede BOOSTER SEP; on a single-stage or
short high-thrust stack, final burnout terminated the orbital plan before a booster event existed.
Separately, the orbit/transfer worlds were synchronized with the complete frozen launch spec,
making discarded stages and boosters reappear as a pristine full stack after ascent.

The trajectory now implements the performance model's documented serial-equivalent stage 0. While
boosters are attached, combined core-plus-booster thrust is paid from the booster segment at booster
Isp and core propellant remains untouched. Booster burnout therefore emits the first event and drops
the booster mass; core burning and core-stage events begin afterward. Its duration is included in
the gravity-turn clock. This preserves the established combined-liftoff-thrust/unchanged-core model
without inventing a fixed cosmetic separation fraction.

New pure `cape3dPostAscentVehicleSpec` derives a phase-appropriate surviving craft from the frozen
launch vehicle: only the final insertion stage, optional transfer segment, and payload/capsule.
Orbit and transfer sync use that derivative; the launch mesh continues using the complete stack.

Tests extend `test-flight3d-staging.js` with real `flightPhysicsSpec` cases for default 2×20 t A-4
boosters on two-stage and single-stage cores, and extend `test-flight3d-vehicle-sync.js` with
immutability/survivor-topology assertions. They pass 35/35 and 20/20. Firefox/WebGL acceptance on
the generated release confirmed event order booster → stage 1 → stage 2, boosters detached/falling
while stage 1 remained attached, and an orbit craft with one upper stage and no booster group.
Full regression: 97 suite files pass; only the long-standing `test-flight3d-trajectory.js` drift
remains. Build parity and `git diff --check` clean.


## Session — E1.2 Slice C: anomaly modal moves into the flight overlay (2026-07-23)

**Slice C complete.** The last of the six live-flight decision modals — `showAnomalyModal` — is now
rendered inside the flight overlay instead of as a page-level `showModal`. The other five
(`showLiveCallModal`, `showReserveModal`, `showRescueModal`, `showWeatherModal`,
`showOrbitalManeuverDecision`) were already wired to `openFlightForDecision` in the July 11 session
but the anomaly modal was left unconverted; this closes the gap.

**What changed in `sim.js`.** `showAnomalyModal` drops its `showModal` call entirely. It now calls
`openFlightForDecision(ctx, {holdAt, buildPanel:()=>({...})})` exactly like the other five decisions.
Hold point is `'orbit-start'` for orbital missions (`!m.profile && reqDv≥9000`) and
`'cislunar-start'` for deep/profile missions — the same hold as reserve and rescue, since anomalies
fire in that same late-mission operational zone. `resolveAnomaly()` is unchanged; its `hideModal()`
call becomes a no-op (the page modal was never shown). The `_pendingOps.ev`/`_pendingOps.opts`
assignment that `resolveAnomaly` reads is kept — it was already in `showAnomalyModal` and is still
needed. Detail text is word-wrapped at 62 chars (fits the 420 px overlay panel at 11 px monospace;
the longest anomaly detail is ~105 chars and splits cleanly at the `—`). No SAVE_VERSION bump —
purely presentational, no persisted state touched.

**Validation.** `node --check` OK. Updated `test-decision-panel.js` (49/49, up from 28/28 before this
session) — new checks 10–13 cover: orbital anomaly holds at `orbit-start`; cislunar anomaly holds at
`cislunar-start`; panel title/lines/buttons correct; long detail word-wraps into two lines with no
content lost; short detail stays single line. Full regression: **95/98** — the 3 failures are all
pre-existing (build-parity env path, command-hero-layout filesystem read, flight3d-trajectory
long-standing drift); nothing introduced by this change. Slice D (chrome/transition polish) remains
open.

## Session — E1.2 Slice D: decision panel layering fix (2026-07-23)

**Slice D complete. Unified flight overlay Slices A–D all done.**

**The bug.** When a decision fires at `cislunar-start` or `orbit-start` (reserve, rescue, anomaly,
orbital maneuver), `drawScene` called `drawDecisionPanel` BEFORE `finishHandoff()`. The crossfade
handoff starts at `u=0` (the hold fires on the exact frame the ascent ends), so at `u≈0`
`finishHandoff` draws the previous-phase (ascent) snapshot at full opacity — completely covering
the decision panel. The held frame displayed the old ascent frame, not the decision box.

**The fix.** In `flight.js`'s `drawScene`, two hold paths reordered:
- **`cislunar-start`** (reserve/rescue/cislunar anomaly): `drawCislunar(0)` → `finishHandoff()` →
  `drawDecisionPanel(panel)`. Also added the missing `showFlight3DDecision` guard (the cislunar
  path was calling `drawDecisionPanel` directly, bypassing the 3D DOM path — the orbit-start path
  already had this guard).
- **`orbit-start`** (orbital anomaly/maneuver): `drawOrbit(0)` → presentation snapshot update →
  `finishHandoff()` → `drawDecisionPanel(panel)`.

Net visual: the ascent snapshot fades over the incoming phase background (crossfade starts), then
the decision dim + box paint on top of that faded composite. At `u=0` the result is a dark-dimmed
ascent frame with the decision box clearly visible — correct and readable. The `pad-start` and
`pad-end` holds are unaffected (no crossfade running at those points).

**Balance/behavior.** Purely presentational — no timing, outcome, or state changes. No SAVE_VERSION
bump. The existing `test-decision-panel.js` (49/49) already verifies that held states at each hold
point produce the correct `animState` and button wiring; the visual ordering is a browser-only
concern not testable headlessly.

**Regression: 95/98** — 3 pre-existing failures unchanged, 0 new failures.

**Unified flight overlay status: Slices A–D all complete.**
- A: pad phase (`drawPad`, countdown, ignition ramp) — July 9
- B: cruise-begins outro (`drawDepartCard`, `spec.mode:'depart'`) — July 9
- C: in-overlay decision panels (all 6 modals) — July 11 (infra) + July 23 (anomaly)
- D: crossfade layering fix — July 23

## Session — BACKLOG #39: pad aborts damage the pad (2026-07-24)

Only a *catastrophic* pad-phase loss now has a structural consequence. Previously the pad-turnaround
system (`launchPadCap()`/`padSlotsLeft()`, #29) limited monthly cadence but a failed launch had zero
effect on future pad availability — the fleet was always back to full cadence next month regardless
of how the flight was lost.

**Trigger.** `finalizeLaunch`'s final `else` branch is exactly and only `outcome.kind==='loss'` —
a full vehicle loss with no escape-tower save (crewed `abort` outcomes and uncrewed `partial`/`scrub`
are handled in earlier branches and never reach here). Gated further on `failPhase==='ascent'`
(deep-space losses don't touch the pad). This reuses the existing outcome taxonomy with no new
failure category — "catastrophic" == the branch that already reads "CATASTROPHE"/"FAILURE" in the
log line.

**Per-pad tracking, not a global flag.** New `state.padDamage` maps pad index (1..`prodLevel('pads')`)
to the absMonth its repair completes. `damageAPad()` picks the lowest-index *currently healthy* pad
(deterministic, not random) and marks it; `launchPadCap()` now returns `prodLevel('pads') -
damagedPadCount()`, floored at 1 so a bad flight never fully locks out launching, even on a one-pad
startup. A juggernaut with 5 pads only loses 1/5 cadence from a single loss — multi-pad investment now
pays off as damage resilience, not just raw throughput.

**Repair time scales with Pads level** (`padRepairMonths`): base 3 months at L1, `−0.4mo`/level,
floored at 1 month — better infrastructure and crews fix a damaged pad faster. If every pad somehow
happens to already be down (edge case, not reachable at L1 without two losses in the same repair
window), a further catastrophic loss extends the first pad's repair instead of silently no-op'ing.

**No SAVE_VERSION bump** — `state.padDamage` is read through a lazy-init `padDamageMap()` (creates
`{}` if missing), so a legacy save with no field at all just starts with every pad healthy.

**UI.** Bench shows `⚠ N pads under repair` under the launch button when any pad is down; the topbar
production status line gets a `, ⚠N repairing` suffix. The failure log line itself announces which
pad was hit and how many months of downtime (`🔥 The failure damaged Pad N — offline for repairs,
M months.`).

**Validation.** New `tests/test-pad-abort.js` (32/32): repair-time level scaling + floor, pad
selection (lowest healthy index, never the same pad twice on consecutive hits), cap math (floor at 1
even with every pad down, single-pad-startup never locks out), repair-window expiry via direct
calendar advance, wiring against real `resolveFlight`/`finalizeLaunch` for all three outcome kinds
(`loss` damages, `success` and `partial` do not), and legacy-save lazy-init. Full regression: only the
long-standing `test-flight3d-trajectory.js` drift remains; build parity and `git diff --check` show
the same pre-existing trailing-blank-line lines as the `main` baseline (confirmed via stash diff),
nothing newly introduced.

## Session — BACKLOG #68: staff aging/retirement + procedural replacement pool (2026-07-24)

Previously every named engineer/astronaut/scientist/executive/controller (~40 hand-authored
characters across `STAFF_POOLS`) was immortal outside of firing, quitting on low morale, or a
crewed-mission death — there was no age at all, so a 50+-year campaign could run entirely on the
original Pioneer-era hires. This closes that gap and, per the owner's scoping call, extends the same
replacement mechanism to crewed-mission deaths (which previously just shrank the named pool forever).

**Age is derived, not stored per-tick.** A staff record stamps `birthYear` once at `hirePersonnel()`
time (`state.year - startingHireAge(id)`); `staffAge(id)` reads it back against the live campaign
year. `startingHireAge`/`retirementAge` are deterministic per person id (hash-based, salted
differently so they don't correlate) — hired between 26–45, retires between 58–69 — so none of the
~40 named characters needed new per-record fields, and procedural hires get identical treatment for
free. A staff record loaded from a save that predates this feature self-heals on first read
(`staffBirthYear` backfills it in place) — no `SAVE_VERSION` bump needed.

**Procedural replacement pool.** `state.proceduralStaffDefs` (new, lazily-initialized, persisted)
holds generated candidates shaped exactly like the hand-authored roster entries (id/name/skill/
salary/era/bio/specialty), so every existing consumer (`personById`, `effSkill`, `traitOf`,
`roleLabel`, department membership, `availablePool`) treats them identically to a named hire once
`poolOf`/`roleOf`/`personById` were extended to also search this pool. `generateProceduralCandidate`
matches the departing person's role (and, for engineers, specialty) and scales skill/salary to the
current era's going rate — a late-campaign replacement isn't stuck at Pioneer-era competence. Names
draw from new `FIRST_NAMES`/`LAST_NAMES` pools with a collision check against every name already in
use (static + procedural).

**Two triggers, one mechanism.** `tickRetirements()` (new, called from the monthly tick right after
the existing low-morale attrition filter) retires anyone past their retirement age with a quiet
`log('note', …)` line — no rep hit, no fanfare, per the owner's call — then calls the same
`reconcileDeptLeads()` succession logic firing/quitting already use. `loseAssignedCrew` (crewed-loss
death path) now also calls `spawnReplacementFor` alongside its existing memorial-wall write, so a
fatal loss no longer permanently shrinks the astronaut corps pool — the emotional weight of the loss
(rep hit, memorial, stand-down) is untouched; only the pool-exhaustion side effect is fixed.

**Mechanical fixes along the way.** Six call sites (`engTeam`, a Command Center recommendation check,
three portrait/card render sites) did direct `ENGINEERS.find`/`ASTRONAUTS.find` lookups instead of
going through `roleOf`/`poolOf` — harmless while every hire was static, but would have silently
excluded procedural hires from engineer-team bonuses and portrait styling. All six now route through
`roleOf`, so a procedural engineer counts toward `engTeam()` bonuses exactly like a named one.

**No SAVE_VERSION bump** — `proceduralStaffDefs` lazy-inits via `proceduralDefs()`, `birthYear`
self-heals via `staffBirthYear()`; both read through `||`/null guards, so a pre-#68 save just starts
every existing hire at their deterministic hire-age with an empty procedural pool.

**Validation.** New `tests/test-personnel-retirement.js` (39/39): age-helper determinism and range,
hire-time birthYear stamping + age progression with the campaign clock, legacy-record self-heal,
retirement removes the staffer with a quiet neutral-tone log line and zero rep impact, staff below
retirement age are untouched, retirement spawns a same-specialty engineer replacement that's
immediately hirable and fully functional (effSkill/traitOf/hiring all work), a crewed death spawns an
astro replacement without disturbing the existing memorial-wall behavior, department-lead succession
fires on a retirement, legacy/fresh-save safety (missing field lazy-inits, `newGame` resets the pool),
and multiple simultaneous retirements in one tick each get their own replacement. Full regression:
only the long-standing `test-flight3d-trajectory.js` drift remains; build parity and `git diff --check`
both clean (confirmed against the `main` baseline via stash diff).

**Needs a real-browser check**: procedural-hire cards in the Personnel tab (portrait rendering, role
label, hire flow), and that a long time-warp actually produces visible retirements/replacements over
a multi-decade session.

## Session — Money & Budget balance pass: Option A (early tension) + Option B (passive-income pacing) (2026-07-24)

Prompted by an owner-requested design review ("are costs, funding, and contracts fair and realistic
but also fun — one more turn aspect?"). The audit (empirical sim traces, not just reading numbers)
found the systems realistic but under-tense: a first-flight attempt cost 0.58M against a 5M
Engineer-mode bankroll (8 cash-only attempts before broke, 1.5 expected tries to first success — no
real risk of running out), and every passive-income contract paid back its setup in under 3 months
then ran 30-36 months of pure profit with no cap on how many could run simultaneously — money stopped
being a real constraint by mid-game. Full writeup with before/after numbers is in this session's chat
transcript; only the shipped changes are logged here.

**Option A — Engineer-difficulty starting capital: 5.0M → 3.5M** (`DIFFICULTY.engineer.startMoney`
in `src/data.js`). Napkin (8.0M) and Custom (5.0M default, user-tunable) left untouched — this only
sharpens the "Realistic" mode's opening, which is where the pinch should live. New numbers: 6
cash-only attempts before broke (was 8), same 1.5 expected tries to first success, first-success net
still comfortably positive — tighter without being unfair or risking an unwinnable opening.

**Option B — passive-contract setup costs quadrupled** (all 18 entries in `PASSIVE_CONTRACT_DEFS`,
`src/data.js`). Payback stretched from ~2-2.7 months to ~7-11 months uniformly (income and term
untouched, so lifetime value per contract is still strongly positive — entry is now a real "saving
toward" decision instead of a near-instant no-brainer). Example: Satellite Servicing Fleet
5.0M→20.0M setup (payback 1.9mo→7.7mo); Lunar Flyby Tourism 12.0M→48.0M (2.7mo→10.7mo).

**Option B — new portfolio cap on concurrent active contracts** (`passiveMaxActive()`, new,
`src/data.js`): `3 + eraIndex(currentEra())` — 3 at Pioneer era, 6 by Station & Shuttle era (where 9+
rep-gated contracts are simultaneously unlockable without any research/doctrine prerequisite, so the
cap is a real constraint there), 10 by Speculative era. Enforced via a new `'capped'` status in
`passiveStatus()` (sim.js) — distinct from `'unaffordable'`/`'locked'`/`'cooldown'` — that blocks
`signPassiveContract()` and is surfaced in the Passive Income panel
(`renderPassiveContracts`, render.js) as a "portfolio full" pill/button with an X/Y active count in
the panel header. Freeing a slot (a contract's term expiring) immediately re-opens signing on
whatever was capped — verified in tests, not just assumed.

**Validation.** New `tests/test-econ-balance-2026-07.js` (40/40): starting-capital values, early-attempt
tolerance bounds (tighter but not lethal), all 18 contracts' payback windows fall in the intended 6-12mo
band, cap value at two different eras, cap enforcement (signing blocked exactly at the cap, capped
status vs. locked/unaffordable stays distinct), cap release on contract expiry, and a regression check
that diminishing-returns math on renewals is untouched by any of this.

**One side effect caught and fixed**: `tests/test-materials.js` implicitly relied on the old 5.0M
Engineer-mode boot default to fund several sequential dip-buys; with the tighter 3.5M start it ran out
of cash mid-test and a later assertion failed on an unrelated symptom (stock not reaching cap). Fixed
by giving that suite its own explicit test money (`state.money=100`) at the top rather than relying on
difficulty defaults — decouples it from future balance passes, which is the right fix regardless of
which change exposed it.

**Full regression**: only the long-standing `test-flight3d-trajectory.js` drift remains; build parity
and `git diff --check` both clean.

**Needs a real-browser/playtest check**: does the tighter Engineer-mode opening actually *feel* tense
rather than annoying over a real play session, and does the portfolio cap read clearly in the Passive
Income panel (the new "portfolio full" state, the X/Y count in the header)? Also worth watching over a
longer playtest: does the passive-income curve still eventually make money a non-issue late-game (by
design, once the cap is 8-10 and paybacks are sunk), or does it need Option C (failure economic teeth,
scoped but not started) to keep tension alive into the late game too.

## Session — Money & Budget balance pass, Option C: "investor confidence" loss-streak surcharge (2026-07-24)

Third and final piece of the Money & Budget balance pass (see the two prior session entries for
Options A/B and the original design audit). Scoped thoroughly before writing any code — a design
scope was reviewed and approved, then a death-spiral risk was traced *before* implementation per
that plan.

**Pre-implementation trace.** The proposed mechanism (a rolling loss-streak build-cost surcharge)
raised one real question: stacked on Option A's tightened Engineer-mode starting cash (3.5M), could a
bad-luck early loss streak spiral into an unrecoverable state? Traced a worst-case 4-consecutive-
failure First Flight opening (~1.5% probability at 65% reliability, no staff hired) both with and
without the proposed surcharge: **the baseline (Option A alone, mechanism OFF) already exhausts the
bankroll at that point** (0.22M left, can't afford attempt 5) — the surcharge only shaves the
remaining margin (0.04M instead of 0.22M), it doesn't create the qualitative risk. Further check:
`state.money<0` already triggers `gameOver()` throughout the codebase (found at 9+ call sites), which
offers an emergency bridge loan or restart — running out of money is a designed jeopardy moment, not
a silent dead end. Cleared to proceed with the originally-scoped rates.

**Mechanism — "investor confidence"** (`src/data.js`, `src/sim.js`): a rolling loss-streak surcharge,
deliberately built as a sibling to the existing cadence surcharge (same rolling-window / self-decaying
/ capped shape) rather than a new subsystem. `state.recentLosses` (new, rolling `{at,severity}` list,
12-month window) is populated by `recordLoss()`, called from `finalizeLaunch`'s four vehicle-loss
branches (`abort`, `strand`, `rescued`, and the catastrophic-loss else-branch) — explicitly NOT from
`scrub` (vehicle & crew recovered) or `partial` (objective incomplete but nothing lost). Severity is
1.0 for an uncrewed loss, 0.5 for crewed — halved on purpose, since a crewed loss already carries
rep/era-stakes/hearing consequences elsewhere that an uncrewed loss never had until now; this fills
that specific gap rather than doubling up on the crewed case.

`investorConfidenceBuildPenalty()` (≤25%, `INVESTOR_CONF_BUILD_RATE=0.05`/severity point) multiplies
`buildCost` in `computeVehicle` right alongside the cadence surcharge.
`investorConfidenceFundMult()` (≥0.80, `INVESTOR_CONF_FUND_RATE=0.04`/severity point) multiplies the
earned grant in `govMonthlyFunding()` in the same slot as `crisisGovFundingMult()`. Both decay
automatically as old losses age out of the 12-month window — no separate tick/expiry logic needed,
same elegant self-cleaning the cadence mechanism already has.

**UI**: a `flag warn` banner on the Bench (mirrors the existing cadence-surcharge banner exactly) when
active, plus a new "Investor confidence" metric on the Manufacturing Capacity panel right next to the
existing Build Cadence gauge.

**Validation.** New `tests/test-investor-confidence.js` (27/27): severity accumulation and weighting
(uncrewed vs. halved crewed), both multipliers scale correctly with severity and cap correctly, the
rolling window actually decays a stale loss back to zero, `computeVehicle`/`govMonthlyFunding`
integration match the raw multiplier math, all four real `finalizeLaunch` loss branches record the
right severity, `scrub`/`partial`/`success` correctly do NOT record a loss, and a codified version of
the pre-implementation death-spiral check (gameOver/bailout remain reachable, penalty stays capped).

**Full regression**: only the long-standing `test-flight3d-trajectory.js` drift remains; build parity
and `git diff --check` both clean.

**This closes the three-part Money & Budget balance pass** (audit → Option A early-tension → Option B
passive-income pacing → Option C failure consequences). **Needs a real playtest** across all three
together: does the full curve — tight open, real loss consequences, capped passive income — read as
tense-but-fair across a real multi-hour session, and does the Investor Confidence banner/metric
communicate clearly in the actual UI (not just in a sim trace).

## Session — Solar System map improvement pass, Slice A: truthful angle + sizing (2026-07-24)

First of a three-slice epic (A → B WASD nav → C ship-tracking port), scoped after a design
conversation and owner feedback: "too small unless popped out, things look too close together,
doesn't give the scale of the solar system feel." Traced the actual causes empirically before
touching any code rather than guessing.

**Two grounding discoveries changed the plan from the initial sketch:**

1. **Live in-flight ship tracking already exists — only in the 3D view.** `activeShipMarkers()` +
   `map3dUpdateShipMarkers()` (E4.5) already draw a moving marker for any deferred flight in transit.
   Phaser and SVG never call it. This became Slice C: a port, not new invention.

2. **The 3D view already solves real-vs-fake positioning — the 2D views didn't.** `bodyScenePos()`
   positions every body from its REAL heliocentric angle (`planetHelio`) each frame; the SVG/Phaser
   paths instead drew a frozen static `ANGLES` constant that never changed. Concretely: the body
   card's "Next window: March 1994, good geometry" text was already computed from real orbital
   mechanics, but the map you were looking at while reading that text showed planets that never
   moved and never matched. That's the actual "not connected" bug behind the request.

**A power-law radius port was tried and rejected — traced, not assumed.** The obvious move was to
also port the 3D view's `SCENE_AU_EXP=0.74` real-AU radius compression to 2D. Numerically traced
several exponents (see chat) against the existing hand-tuned per-body `.r` schedule: at every
exponent tested, the real-AU model produced a *smaller* minimum inner-cluster gap (Mercury–Venus–
Earth–Mars–Belt) than the existing hand-tuned values, because Venus–Earth–Mars are inherently close
in AU terms relative to the 30 AU swing to Neptune — compression can't fix that for a static,
non-flyable 2D chart the way it can for a 3D view you fly a camera into. **Radius was left untouched.**

**What shipped:**
- `map2dAngle(bodyId, absD)` (new, `src/render.js`, sibling to the 3D scene math) — real heliocentric
  angle for any body with `ORBITAL_ELEMENTS` (planets + the belt), falling back to the old static
  `ANGLES` constant for moons (correctly kept local/decorative — a moon's own heliocentric longitude
  isn't the meaningful thing to draw) and Pluto (no orbital elements at all).
- `renderMapOverview` (SVG) and Phaser's `MapScene` now draw top-level bodies at their truthful
  angle. Phaser's fake continuous per-frame spin (`o.ang+=o.speed*dt`, tied to wall-clock time, not
  game time) is replaced with a `map2dAngle` recompute each frame for anything with real elements —
  planets now hold their true position and only move when game time actually advances, matching the
  3D view's already-established behavior. Pluto and moons keep their old decorative spin unchanged.
- `transferArc()` (shared by the committed-window arc and the planned-route preview) now sources its
  Earth/destination/parent endpoints from `map2dAngle` too — otherwise the arc would visually
  disconnect from the now-correctly-repositioned planet dots.
- `renderMapOverview`'s fit-box calculation (`maxR`) now excludes the Oort Cloud (`kind==='cloud'`)
  — previously the whole diagram sized itself to fit a mostly-empty outer shell nobody reaches until
  deep endgame, forcing the entire inner system to render at a fraction of the available space every
  single playthrough. (Phaser's `MapScene` already excluded Oort correctly — this was an
  overview-only inconsistency.)
- Canvas size: `MAP_W`/`MAP_H` (shared by SVG/Phaser/3D) raised 760×480 → 980×620 (same aspect
  ratio), plus matching `.mapsvg`/`#mapHost` CSS max-width and the `renderMapZoom` per-body view —
  addresses "too small unless popped out" directly, without touching the Expand/Pop-out modes
  (already fine, just no longer mandatory for a usable view).

**Validation.** New `tests/test-map-slice-a.js` (21/21): truthful-angle correctness against
`planetHelio` for every body with real elements, correct static fallback for moons/Pluto, angle
actually changes as game time advances (the whole point), Oort-exclusion sizes the viewBox to Pluto
not Oort, `transferArc` endpoints match the truthful positions for both Earth and a top-level
destination, a moon destination still resolves correctly through its parent, canvas dimensions and
aspect ratio, and the Phaser truthful/decorative classification logic (mercury–neptune+belt vs.
pluto/moons). Full regression clean except the known `test-flight3d-trajectory.js` drift; build
parity and `git diff --check` clean.

**Deliberately deferred to Slice B/C** (per the agreed sequencing): WASD/keyboard navigation across
all three renderers, and porting `activeShipMarkers` to Phaser + SVG. **Needs a real-browser check**:
does the bigger default canvas actually read as roomier in the real 3-column shell layout (the map's
center grid column is bounded by two 380px side rails — a real viewport-width check, not just a
canvas-dimension one), and does the now-moving Phaser/SVG map feel right rather than janky when time
advances.

## Session — Solar System map improvement pass, Slice B: WASD/keyboard navigation (2026-07-24)

Second of the three-slice map epic (A shipped earlier this session → B → C). Added keyboard
navigation across all three render paths, each matched to its OWN existing interaction model rather
than one scheme forced onto all three — same principle Slice A used for angle-vs-radius.

**3D map** (`map3dKeyNav`, new): WASD/arrows orbit the camera (az/el), Q/E or −/+ zoom (dist). Signs
matched exactly to the existing drag-to-orbit mouse handler's convention (`az-=dx*0.01`,
`el-=dy*0.01` on a rightward/downward drag) rather than picked independently, so keyboard and mouse
rotate the same direction instead of fighting each other.

**Phaser map** (`phaserMapKeyNav`, new): WASD/arrows pan, Q/E or −/+ zoom. Caught a real sign error
while implementing: assumed a "camera-scroll" convention (scrollX increasing = camera moves right)
but the actual mouse handler is content-follows-drag (`scrollX-=dx` on a rightward drag) — traced the
actual handler before finalizing signs rather than shipping the wrong assumption.

**SVG popout** (`svgPopKeyNav`, new, on the shared `initSvgPopZoom` used by both the map AND station
popouts): WASD/arrows pan, Q/E or −/+ zoom — station bench gets this for free as a consistency bonus,
not a separate implementation. `initSvgPopZoom` now exposes `st.keyPan`/`st.keyZoom` on its state
object so a shared document-level listener can drive it without reaching into the function's private
closure.

**SVG inline fallback** (`svgMapKeyNav`, new): this view has no free camera at all (not even mouse
pan/zoom) — its model is click-a-body-to-zoom-in, click-Overview-to-back-out. Rather than bolt on an
unrelated camera, keyboard nav matches that model: left/right browses the selection cursor around the
overview WITHOUT committing to a zoom; up/Enter commits; down/Escape/Backspace backs out; once already
zoomed, left/right flips directly between bodies' zoomed views (no reason to force a second confirm
once you're already in the detail view).

**A real bug caught mid-implementation, not just in code review**: the original design had left/right
call the existing `selectBody()` to move the cursor — but `selectBody()` already auto-zooms on its
*first* call ("first click zooms in" — pre-existing behavior, not something this session touched).
That would have made the very first arrow-key press in the overview zoom in immediately instead of
just browsing, defeating the intended browse-then-confirm distinction. Caught by writing a debug trace
before finalizing rather than assuming the design worked — fixed by setting `state.selectedBody`
directly and bypassing `selectBody()`'s auto-zoom for the browsing case.

**Routing**: a new document-level capture-phase `keydown` listener (separate from the existing
Esc/Enter/Tab popout-close listener — the two are mutually exclusive by guard condition, so no key
conflict) routes to the right handler: `map3d`/`svgPopKeyNav` when the map popout is open,
`svgPopKeyNav` when the station popout is open, and whichever of 3D/Phaser/SVG is actually mounted
when the map TAB is active inline. Guarded against hijacking a focused text input.

Hint text updated in three places (map popout bar, station popout bar, inline map card description)
so the new controls are discoverable, matching the game's existing convention of surfacing every
control in copy.

**Validation.** New `tests/test-map-slice-b.js` (25/25): the browse-vs-commit distinction (including
the caught bug's fixed behavior), wraparound at both ends of the body list, up/Enter/down/Escape/
Backspace all correctly mapped, the already-zoomed flip-between-bodies behavior, unhandled keys
correctly return false (so the caller doesn't preventDefault a key it didn't use), map3d/Phaser nav
safely no-op when nothing is mounted, and the SVG popout's pan-sign inversion verified against a mock
state object for all four directions plus zoom in/out, including null/uninitialized-state safety.
Full regression clean except the known `test-flight3d-trajectory.js` drift; build parity and
`git diff --check` clean.

**One slip caught and fixed inline**: an early hint-text edit accidentally dropped the station
popout's close button (an overly broad `old_str` match in the edit). Caught by viewing the file
immediately after the edit rather than assuming it worked — standard practice, worth noting here
since it's exactly the kind of small mechanical slip this practice exists to catch.

**Needs a real-browser check**: does the keyboard camera direction actually feel right (sign
conventions were derived algebraically from the existing mouse handlers, not visually confirmed), and
does the SVG inline browse-then-confirm model feel intuitive without a visible hint of *which* mode
(browsing vs. zoomed) a given arrow press will produce.

**Next: Slice C** — port the existing `activeShipMarkers()` live in-flight tracking (3D-only today,
E4.5) to the Phaser and SVG render paths.

## Session — Solar System map improvement pass, Slice C: ported live ship-tracking (2026-07-24)

Third and final slice of the map epic (A truthful angle/sizing → B WASD nav → C, this entry).
Closes the epic: the map originally identified as "too small, too crowded, doesn't feel connected"
is now bigger, keyboard-navigable everywhere, and shows real in-flight missions in all three views,
not just one.

**What existed already**: `activeShipMarkers()`/`flightScenePos()` (E4.5) already computed a real
Kepler-conic transfer position for any active flight, consumed only by the 3D view
(`map3dUpdateShipMarkers`). Phaser and SVG never called it — a mission in transit was invisible in
either.

**Deliberate design choice: don't re-derive the real 3D transfer math in 2D pixel space.** The
straightforward-looking option was porting `flightScenePos`'s Kepler-conic construction into 2D
screen coordinates directly. Rejected for the same reason Slice A rejected porting the 3D radius
model to 2D: `flightScenePos` works in the 3D view's real-AU scene-unit space, and Slice A already
established that space doesn't map well onto the 2D map's hand-tuned legibility-first radii. Instead:

- `transferArc()` generalized to accept explicit `launchAbsD`/`arriveAbsD` params (both default to
  "now" via `==null`, so the two existing callers — committed-window and planned-route arcs — are
  byte-identical in behavior). This lets a ship's *actual* fixed departure/arrival body positions
  (not "where Earth/target are right now") anchor its arc.
- `shipMapPoint(cx,cy,marker)` (new) evaluates the standard quadratic-bezier point formula at the
  marker's real progress fraction (from the 3D model, so timing stays truthful) along that arc. A
  ship marker rides the *exact same curve* the map already draws for the committed/planned arcs,
  rather than a second, incompatible 2D transfer shape — real connectedness, not just a moving dot.
- `activeShipMarkers()` extended with `destId`/`launchAbs`/`arriveAbs` (additive; the existing 3D
  consumer ignores the new fields) so the 2D renderers have what they need to reconstruct a matching
  arc without a second lookup path.
- SVG (`renderMapOverview`): draws each active flight as a small amber marker + mission-name label,
  with a title tooltip showing % en route.
- Phaser (`MapScene`): new `drawShips()` method (graphics circle + a small pooled Text-object map
  keyed by flightId, add/update/remove to match the current active-flights list each frame — same
  add/update/remove shape as the 3D view's `map3dUpdateShipMarkers`), called from `update()`.

**Validation.** New `tests/test-map-slice-c.js` (16/16) — verified empirically, not just by reading
the math: a marker sits at *exactly* the origin body's hand-tuned radius at progress=0 and the
destination's at progress=1 (checked against a real Mars Flyby fixture: 82.0px at launch matching
Earth's r=82, 104.0px at arrival matching Mars's r=104, both within floating-point tolerance), bows
outward past both endpoints at the midpoint (matching the existing static-arc visual language),
`transferArc`'s generalized signature is provably byte-identical to the old 3-arg behavior when the
new params are omitted, explicit launch/arrival days produce genuinely different (truthful, moving)
endpoints, the SVG overview actually renders the marker for an active flight and renders nothing when
there are none, multiple simultaneous flights each get their own independent marker, and
`shipMapPoint`/`activeShipMarkers` handle missing/null input safely. Full regression clean except the
known `test-flight3d-trajectory.js` drift; build parity and `git diff --check` clean.

**This closes the three-slice Solar System map epic** (BACKLOG #117). All three sessions' full
rationale, rejected alternatives, and numeric traces are in this file under their own entries above.

**Needs a real-browser check** across all three slices together: does the bigger, truthfully-moving,
keyboard-navigable, ship-tracking map actually read as a connected dashboard-and-planner in an actual
play session — the sim traces and headless geometry checks say the pieces are individually correct,
but only a real session confirms they add up to what was asked for.

## Session — Solar Map D1: port empire overlay + route arcs into the 3D view (2026-07-25)

First slice of the D-pass scoped in the review above. Confirmed the review's central finding before
writing any code: `mapAssetModel()`/`plannedRoute()`/`transferArc()`/`rivalsAtBody()` were consumed by
the SVG and Phaser renderers only (`src/render.js` ~L6420/~L6473/~L7366) — never by `map3dTick()`, so
none of the empire-overlay data (facility health, ISRU, depot tonnage, belt claim, tracking stations,
player firsts, rival reach) or the committed/planned transfer arcs were visible in the 3D view, which
is the DEFAULT view (`MAP3D=true`). This slice ports the same data in, reusing the existing pure
functions rather than inventing new overlay data.

**What shipped:**
- `map3dBodyOverlaySpec(bodyId, model, rivalsHere)` (new, pure) — mirrors `assetMarkersSVG` +
  `rivalMarkersSVG`'s DATA (not their SVG markup) into one spec per body: an icon list (🏁 firsts, a
  facility's own `def.icon` + a health-colored ring, ⛏ ISRU, 🪙 belt claim, ⛽ depot, 📡 tracking, ●
  per unique rival) plus one combined tooltip string. Returns `null` for the common case (a body with
  nothing to show). Deliberately reuses the SAME glyph vocabulary the SVG map and the empire strip
  already use (`empireStripHTML`'s 🏁/⬢/⛽/⛏/📡) rather than inventing a parallel icon language for 3D.
- `map3dOverlaySpecKey(spec)` (new, pure) — a stable string key so the per-frame tick can skip
  rebuilding a body's canvas texture unless its overlay actually changed (facility health/module count,
  rival reach, etc.) — most frames do zero texture work.
- `map3dOverlayBadgeTexture(spec)` (new, THREE-dependent) — canvas-texture sprite, same construction
  pattern as the existing `map3dLabelSprite`/`map3dShipMarkerMesh`: a small dark rounded strip with the
  spec's icons drawn left-to-right, health rings as colored circles behind facility icons.
- `map3dUpdateOverlayBadges(d)` (new) — per-frame add/update/remove of one badge sprite per body with
  a non-null spec, positioned just below the body (labels sit above, so the two never collide). Same
  add/update/remove shape as the existing `map3dUpdateShipMarkers`. Picked via a `'asset:'+bodyId`
  userData prefix, mirroring the existing `'ship:'+flightId` convention.
- `scene3DTransferArc(destId, absD)` (new, pure) — the 3D equivalent of `transferArc()`'s
  bow-outward-from-centre geometry. The 2D SVG bows a quadratic curve away from a canvas-space
  `cx,cy` standing in for the Sun; in the 3D scene the Sun genuinely IS the origin (`bodyScenePos`
  already places every body relative to it), so "bow from centre" becomes "bow along the midpoint's
  own radial distance from the origin" with no coordinate translation needed — same formula, one
  fewer abstraction layer. Sources both endpoints from `bodyScenePos`, the same function every other
  3D element (planets, ship markers) already positions from, so a moon destination resolves through
  its parent for free with no special-casing.
- `map3dQuadPoints`/`map3dMakeArcLine`/`map3dUpdateArcLine` (new, THREE-dependent) — samples the
  bezier into a fixed-length `THREE.Line` with a dashed material, updated in place each frame (vertex
  attribute array write, not a geometry dispose/recreate — avoids per-frame GC churn for what's at
  most 2 concurrent arcs).
- `map3dUpdateRouteArcs(d)` (new) — draws the committed-window arc (amber) when
  `state.committedWindow` is set, else the planned-route arc (cyan=closes, red=Δv short) when
  `plannedRoute()` returns an uncommitted route — same precedence as `plannedRouteSVG`'s own
  `if(pr.committed) return ''`.
- `map3dHover`/`map3dPick` extended for the `'asset:'` prefix: hovering a badge shows its tooltip
  (same info the SVG marker's `<title>` shows); clicking a badge selects that body, same as clicking
  the planet mesh itself.

**Validation.** New `tests/test-map3d-overlay.js` (34/34) — covers `map3dBodyOverlaySpec` for every
overlay type individually and in combination (a facility's health ring color, ISRU + belt claim
co-occurring on the same body with visually distinct glyphs so one doesn't read as the other, rival
dedup by id with the rival's own color, depot's 0.05-ton badge-or-not threshold matching the SVG's own
cutoff), `map3dOverlaySpecKey` stability/null-safety, and `scene3DTransferArc`/`map3dQuadPoints`
against real `bodyScenePos` output (arc endpoints match exactly, control point providably bows farther
from the origin than either endpoint, a moon destination resolves through its parent, unknown body
returns null cleanly). Full regression clean (106 suites) except the two known pre-existing drifts
(`test-build-parity.js` env path, `test-flight3d-trajectory.js` Codex's own accepted physics change);
build parity and `git diff --check` clean.

**NOT browser-verified** (no WebGL in this sandbox, same caveat as every other `map3d*` renderer
function in this file): does a badge actually read as legible rather than clutter once several bodies
have simultaneous overlays, does the dashed arc's bow look right at typical camera distances, and does
clicking a badge sprite reliably hit-test given its `depthTest:false` billboard rendering (should be
fine — the ship marker/label sprites already work this way — but worth eyeballing in a real session
alongside the D1 badges specifically).

**Deferred to D2/D3/D4** (per the review's proposed order): AU ring labels, HUD scale bar, per-body
light-time readout, ecliptic grid, off-screen direction chevrons, body roster rail, label LOD, and
promoting the time-scrubber HUD with a jump-to-next-window control + live arc while previewing a date.

## Session — Solar Map D2: scale legibility (2026-07-25)

Second slice of the D-pass. **The review's own proposal was traced and rejected** — worth recording,
since it's the substantive finding of this slice.

**Rejected: the HUD scale bar.** The D2 review proposed "a scale bar in the HUD that updates with
camera distance." Traced the actual scene→AU mapping before building it. The scene compresses radially
via `sceneRadiusAtAU` = `SCENE_AU_BASE·AU^SCENE_AU_EXP` (18·AU^0.74), which is **nonlinear by ~3.1×
across the system**:

| body | AU | scene units | scene-units per AU |
|---|---|---|---|
| Mercury | 0.387 | 8.9 | **23.0** |
| Earth | 1.00 | 18.0 | 18.0 |
| Jupiter | 5.20 | 61.0 | 11.7 |
| Neptune | 30.1 | 223.6 | **7.4** |

A linear scale bar is meaningful only under a linear mapping. Here, the same on-screen bar length
represents a ~3× different real distance depending where the camera is pointed — a player using it to
judge "how far is that jump" would be actively misled, not merely given an imprecise figure. That's
worse than no scale bar at all. **Not built.** The nonlinearity is now asserted in
`tests/test-map3d-scale.js` so a later session doesn't helpfully "finish" D2 by adding it back.

**What shipped instead — honest by construction:**
- **AU labels on the orbit rings** (`mapAuRulerTicks`, `map3dAuLabelSprite`, `addMap3dAuRuler`). Each
  label sits at its own true ring radius, so it cannot misrepresent anything; together they read as a
  ruler spoke outward from the Sun and make the compression itself *legible* rather than hidden. Placed
  on a fixed −z bearing rather than beside each planet, so they line up as one readable scale and never
  chase planets around their orbits or collide with the body-name labels. Tick radii derive from the
  same `ORBITAL_ELEMENTS` semi-major axis the ring geometry uses, so a label can never drift from the
  ring it annotates (asserted).
- **Real numeric readouts** the compression can't distort — a new HUD `SCALE` block
  (`mapScaleReadoutHTML`, pure) showing the selected body's live distance from Earth, the one-way light
  time that follows, and its distance from the Sun; plus the same live figures added to the hover card
  alongside the pre-existing static Sun-distance line. Ends with one standing note that on-screen orbit
  spacing is compressed and the numbers are the real thing — stated outright rather than letting the
  player infer scale from a picture that isn't linear.
- **Ruler LOD** (`map3dUpdateAuRuler`): fades out below camera distance 45 (at planet-inspection range
  it's clutter, not orientation) and scales up with distance so it stays readable zoomed out.

**Deliberately uses live `planetHelio` positions, not sim.js's static `BODY_AU`.** `lightLagMinutes`
(body card) reads `BODY_AU`, a fixed mean distance — it can only ever quote a near/far *range*. The map
wants the number *right now*, because a distance that visibly changes as you scrub the time HUD is
exactly the scale-and-motion feel this slice is for. New `liveSunDistanceAU`/`liveEarthDistanceAU`/
`liveLightMinutes` compute from real elements via law-of-cosines on the two heliocentric vectors.
`lightLagMinutes` is untouched — its range framing is still the right thing on the body card.

**A real bug caught by tracing rather than by reading the code.** `planetHelio` resolves a moon to its
PARENT's heliocentric position, so the naive law-of-cosines gives **Earth↔Moon = exactly 0** — the HUD
would have rendered "0.0000 AU · 0 s signal delay" for the Moon. Fixed: a moon of Earth falls back to
`BODY_AU`'s real Earth-relative distance (0.00257 AU → ~1.3 s, verified against reality); a moon of any
other planet correctly inherits its parent's distance, which is right at solar-system scale (Io differs
from Jupiter by ~0.003 AU against 4–6 AU of range). Only surfaced because the trace printed the Moon
row — the code reads correctly.

**Empirical validation against reality, not just internal consistency.** Traced Mars over a full
synodic cycle: Earth-distance sweeps **0.46 – 2.62 AU**, light time **5.9 – 21.2 min** (real Mars:
~0.37–2.68 AU, ~3–22 min). Mercury's Sun-distance varies 0.31–0.47 AU, matching its real e=0.2056
perihelion/aphelion band rather than sitting at a mean. Earth→Sun light time lands on the textbook
8.3 min. All asserted as bounds in the test file.

**Validation.** New `tests/test-map3d-scale.js` (48/48): the rejected-scale-bar nonlinearity, live
distances against real physical bounds for Sun/Earth/Mars/Mercury/Jupiter/Neptune, the moon-distance
bug's fixed behavior (Moon non-zero and ~correct; Io/Titan inherit parent), light-time consistency with
distance, `fmtAU` at every magnitude the system spans, ruler tick sorting/derivation/exclusions
(moons, Oort, and Pluto-without-elements all correctly absent), and `mapScaleReadoutHTML` rendering
NaN-free and undefined-free for **every** body in `BODIES` (it's selection-driven, so any body can
reach it), with Earth correctly saying "You are here" instead of a meaningless 0 AU from itself. Full
regression clean (107 suites) except the two known pre-existing drifts. Build parity and
`git diff --check` clean.

**One mechanical slip caught and fixed inline, worth recording** because it exposes a real gap: an
early edit's `new_str` dropped the D1 comment block's opening `/*`, orphaning ~5 comment lines as bare
code. **`node build.js` still reported success** — the "build" is a zero-dependency string concat with
no syntax check, so it cannot catch this class of error. Caught by running the harness immediately
after. Worth knowing: a green `build.js` is NOT evidence the output parses. `node --check build/game.js`
is, and was added to this session's verification loop.

**NOT browser-verified** (no WebGL in this sandbox): whether the ruler labels read as a helpful scale
spoke or as visual noise across the ecliptic, whether the LOD fade threshold (dist>45) is tuned right
in practice, and whether the HUD `SCALE` block crowds the time scrubber it sits under — that block is
also the natural home for D4's jump-to-next-window control, so its layout is worth judging with D4 in
mind rather than in isolation.

**Deferred to D3/D4:** ecliptic grid, off-screen direction chevrons for Sun/Earth, and promoting the
time scrubber with a jump-to-next-window control + live arc while previewing a date. (Body roster rail
and label LOD — the rest of the original D3 scope — shipped as D3a below.)

## Session — Solar Map D3a: body roster rail + body-name label LOD (2026-07-25)

Lighter-tier wiring slice, split off D3 per this session's own model-recommendation: the roster and
label LOD are mostly reuse of existing pure functions and an established LOD pattern; the ecliptic
grid + off-screen chevrons (now D3b) involve real projection-math correctness risk (screen-space
projection sign-flips behind the camera) and clutter-vs-clarity judgment calls better suited to the
heavier tier — deferred rather than rushed.

**Body roster rail** (`mapRosterBodies`/`mapRosterTier`/`mapRosterModel`/`mapRosterHTML`,
`renderMapRoster`, `mapRosterSelect`) — answers "where is everything" directly with a left-side list of
every navigable body, grouped **Reached → Available → Locked → No content yet**, click to select+focus.
Deliberately a plain DOM sidebar, not a 3D/Phaser/SVG-specific overlay — `renderMap()` calls it once,
unconditionally, so it's identical across all three renderer paths for free rather than a per-renderer
reimplementation.

- **Membership rule**, reasoned from the game's own content structure rather than assumed: every body
  with its OWN `missions` array (moon, mars, belt, jupiter, saturn, titan, oort — the Moon and Titan
  are technically moons but carry real distinct mission content, e.g. the Apollo-era Moon program)
  PLUS every top-level planet that has no missions yet (mercury/venus/uranus/neptune/pluto — visible on
  the map, nothing to do there yet, but a player should see "no content yet" rather than a silent gap
  in the roster). Deliberately excludes the 12 purely decorative moons with no distinct mission content
  of their own (Phobos, Io, Titania, etc.) — the game already reaches them by drilling into their
  parent planet, and a roster row for each would add clutter, not roster value. Earth is a pinned
  "Home" row, handled separately from the tiered groups.
- **Tiering** reuses `mapAssetModel()` (D1, for "reached") and `bodyPlan()` (already built for the body
  card, for "available" vs "locked") rather than inventing new gate logic — same semantics the body
  card's own `pill ok`/`pill`/`pill lock` badges already use, so a body's roster tier and its body-card
  pill can never disagree.
- **Selecting from the rail** (`mapRosterSelect`) mirrors `map3dPick`'s own camera-distance clamp when
  the inline 3D view is mounted, so navigating from the roster behaves identically to clicking the
  planet mesh itself — not a lesser or different path into the same feature.
- New CSS (`src/shell.html`): `.map-stage` (172px roster column + flexible canvas column, same
  narrow-column-beside-main-content pattern as the existing `.bench-stage`, collapses to one column
  under 820px), `.map-roster-row`/`.map-roster-dot`/`.map-roster-heading` (hover/selected states, each
  row's dot colored from the body's own existing `BODIES[].color` — free visual link back to the map).

**Body-name label LOD** (`map3dMoonLabelOpacity`, `map3dUpdateLabelLOD`) — every body in `BODIES` gets a
full-scale name sprite regardless of camera distance; with 12 decorative moons alongside 8 planets,
that's "label mush" per the original review. Reuses the exact fade-by-camera-distance pattern D2
established for the AU ruler rather than inventing a second LOD mechanism: moon labels fade from full
opacity at distance ≤40 to fully hidden at distance ≥90; planet/Sun/belt/Oort labels are never touched
(always full opacity — 8 names is orientation, not clutter). The two LOD bands were deliberately tuned
to overlap coherently: D2's AU-ruler fade starts at the same distance (45) the moon-label band spans,
so zooming out reads as one continuous decluttering rather than two unrelated cutoffs firing at
arbitrary, unrelated distances (asserted in the test file).

**A real gap in an early test, caught before it papered over incorrect behavior.** The "available"-tier
test originally set `state.rep=100` assuming that was near-max — it isn't; `mars_flyby.minRep` is 480,
so the test was accidentally checking the wrong thing and silently passing for the wrong reason (mars
correctly landed in `locked`, but not because rep was insufficiently maxed — because the test's idea of
"maxed" was wrong). Raising rep to 2000 then still failed: `mars_flyby` is a `.profile` mission, and
`needsTrackingNetwork()` gates ALL profile missions on having a built tracking station
(`TRACKING_NETWORK_LIVE=true`) — a gate independent of rep or research entirely. Fixed by fixturing
`state.trackingStations=['goldstone']` alongside maxed rep/research. Worth recording because it's a
second instance (after D1's rival-index assumption) of a test asserting the wrong thing for the right
reason on the first pass — the fix in both cases was tracing the ACTUAL gate function rather than
guessing what "unlocked" requires.

**Repeated the D2 comment-header slip, twice, and finally added a guardrail.** Two more `str_replace`
edits in this same session again matched only the OPENING line of a preceding multi-line `/* ... */`
comment block (D1's, both times) and didn't re-include it in `new_str`, orphaning the comment body as
bare code — the identical mistake noted in the D2 write-up. **Both were caught immediately** because
`node --check build/game.js` (the guardrail D2 added after the first occurrence) was run right after
every build this session, before any test was attempted. Given it recurred twice more even with the
lesson written down, the fix going forward is mechanical, not just "remember better": when editing near
the start of an existing `/* */` block, prefer widening `old_str` to include a full unique line PAST
the opening `/*` (or edit below the block's closing `*/` instead of at its top), so a narrow match can't
silently sever the comment marker from its body.

**Validation.** New `tests/test-map3d-roster.js` (25/25) — roster membership (missions-bearing bodies
included, decorative moons excluded, Earth excluded from the tiered groups, no duplicates), tiering
precedence (reached > available > locked > future, verified against real gate functions including the
tracking-network requirement), `mapRosterModel`'s exhaustive/exclusive partition (every roster body in
exactly one group), `mapRosterHTML` rendering every body + Earth with no NaN/undefined and correct
selected-row highlighting, and the LOD fade curve (full visibility at/below the start distance, fully
hidden at/above the end distance, exact midpoint value, monotonic, clamped, and coherent with D2's own
ruler threshold). Full regression clean (109 suites) except the two known pre-existing drifts. Build
parity, `node --check build/game.js`, and `git diff --check` all clean.

**Deliberately NOT added to the map pop-out** (`openMapPopout`) — that view is a maximized-canvas
overlay with no side panel today, and the inline tab (where the roster now lives, alongside the
persistent body-card right rail) is the default daily-use surface this was scoped to fix. Revisit if a
pop-out roster turns out to matter in practice.

**NOT browser-verified** (no WebGL in this sandbox for the 3D-specific pieces; the roster itself is
plain DOM so it should render everywhere, but layout wasn't visually confirmed): does the 172px roster
column actually read as a helpful list rather than a cramped one against the 980px canvas at typical
window widths, does clicking a roster row's camera-snap feel identical to clicking the planet, and
does the moon-label fade look smooth rather than a visible pop-in/pop-out at the threshold.

**Deferred to D3b** (heavier tier, per the review's own split): ecliptic grid + off-screen direction
chevrons for Sun/Earth — the projection-math and clutter-vs-clarity work the roster's existence may
partly reduce the need for. Worth judging whether D3b's scope shrinks now that a roster exists before
starting it.

## Session — Solar Map D3b: ecliptic grid + off-screen chevrons (2026-07-25)

Final slice of D3, and of the orientation half of the D-pass. Heavier tier was the right call for one
specific reason — the chevron projection had a real correctness trap, and the first draft hit it.

**The trap, and why the math is pure.** A world→NDC projection divides by camera-space depth. For a
point BEHIND the camera that depth is negative, silently flipping BOTH screen axes: an off-screen
arrow points exactly backwards. It only manifests past 90° of rotation, which is exactly what a quick
visual check misses — and it would have been invisible to a headless test that leaned on THREE's own
projection. So `map3dProjectPoint`/`map3dChevronDirection`/`map3dChevronEdgePoint` are pure (no THREE),
and the behind-camera cases are asserted directly.

**A real bug the trace caught immediately:** the first draft's right-vector was negated —
`f × (0,1,0)` is `(−f.z, 0, f.x)`, not `(f.z, 0, −f.x)`. Every chevron direction was mirrored, in front
AND behind. Found by tracing known cases (camera at +z looking at the origin, so screen axes are
unambiguous by inspection) before writing the test file, not by reading the code back.

**Resolution:** the chevron direction uses the camera-space `(cx, cy)` direction for both the in-front
and behind cases — correct in both, and the reason this sidesteps the flip: for a behind-camera target,
rotating toward its `(cx,cy)` side is what brings it into view, whereas the perspective-divided NDC
would have inverted that. Dead-astern (no lateral component) falls back to a defined direction rather
than NaN. The test asserts the invariant that matters: *a target on the same world side gives the same
screen side whether it is in front of or behind the camera.*

**What shipped:**
- `addMap3dEclipticGrid` — concentric rings at 1/5/10/20/30 AU plus 12 radial spokes, all at y=0.
  Ring radii come from `sceneRadiusAtAU`, the same transform the orbit rings and D2's AU labels use,
  so the grid can never imply a spacing the rest of the view contradicts (asserted).
- `addMap3dChevrons`/`map3dUpdateChevrons` — two small screen-space arrows (Sun, Earth) that appear
  only when their target is off screen. Plain DOM over the canvas rather than sprites, so they sit in
  screen space by construction and can't be occluded or scaled by the scene. Torn down explicitly in
  `disposeMap3D` alongside the HUD and hover card.

**Repeated the comment-header edit slip a 4th time** — and again `node --check build/game.js` caught it
before any test ran. The guardrail is working; the habit is now to run it after literally every build.

**Validation.** New `tests/test-map3d-orient.js` (35/35): in-front basics (target at NDC origin, no
chevron when on screen, non-mirrored axes), all four in-front off-screen directions, the full
behind-camera set including the same-side invariant and the degenerate dead-astern fallback, unit-length
and finiteness across mixed positions, edge placement (right edge, corner diagonal, never exceeding the
NDC box, null-safe), the straight-down-the-pole basis-degeneracy case, grid stop consistency with
`sceneRadiusAtAU`, and chevron target resolution (Sun to origin, Earth via `bodyScenePos` — the same
source the planet mesh uses). Full regression clean (109 suites) except the two known pre-existing
drifts. `node --check build/game.js` and `git diff --check` clean.

**NOT browser-verified** (no WebGL/DOM here): whether the grid reads as a helpful reference plane or as
noise at typical camera angles (its opacity 0.34 is a guess and is the first thing to tune if it reads
busy), whether the chevrons are legible at the 8% edge inset, and whether two anchors is the right
number — Sun and Earth were chosen as the two frames a player actually navigates by, but the selected
body may deserve a third.

**This closes D3.** Remaining in the D-pass: **D4** — promote the time scrubber (jump-to-next-window per
body, live transfer arc while previewing a date). D4 is design work; heavier tier recommended. Note the
D2 write-up's standing point that the HUD SCALE block is the natural home for D4's jump control, so its
layout is worth judging together with D4 rather than in isolation.

## Session — Solar Map D4: time-scrubber promotion (2026-07-25) — D-PASS COMPLETE

Owner confirmed D1–D3b look right in a real browser before this slice started, which removed the
standing risk that D4 would build onto a HUD needing rework.

**The design question this slice had to settle** (flagged back in the D2 write-up): the map and the
body card were two surfaces telling the same story independently. Resolution — they answer *different*
questions and are deliberately anchored differently:
- **body card** → `nextWindowFor(missionId)`, anchored to `absDay()`, the LIVE date. "When is my next
  window?" must not drift because the map is being previewed. **Untouched by this slice.**
- **map** → `nextWindowFromDay(bodyId, viewDay)` (new), anchored to the PREVIEWED date, so repeated
  jumps step forward through successive windows.

Both derive from the same `computeWindows()` geometry, so they cannot disagree about *where* windows
are — only about which one is "next", which is the intended difference. The readout names its
reference date outright ("From today" vs "From preview") so a previewed figure can't be mistaken for
the live one. All asserted, including the invariant that previewing the map does not move the card.

Deliberately NOT the `state.windows` cache: it's keyed per-mission and anchored at `absDay()`, so it
structurally cannot answer "what comes after the date I'm previewing."

**What shipped:**
- `nextWindowFromDay(bodyId, fromAbs)` (pure) — next real transfer window strictly after any reference
  day, straight off `computeWindows` geometry.
- `bodyHasWindows(bodyId)` (pure) — whether the body has window-gated missions at all.
- `mapWindowReadoutHTML` (pure) + a HUD `TRANSFER WINDOW` block under D2's SCALE block: next window
  date, geometry quality (colour-coded), distance from the reference date, and the jump control.
- `mapJumpNextWindow()` — sets the preview date to that window; pressing again steps to the one after.
  Visual-only, never mutates the simulation or save (asserted: live day and money both unchanged).
- **Preview arc** — a third precedence tier below the committed (amber) and planned (cyan/red) arcs
  from D1: the geometry to the *selected* body at the *previewed* date, drawn only while actually
  scrubbing, and only when neither real arc is already showing that body, so it can never overdraw or
  contradict a real plan. Dimmer and thinner-dashed so it reads as hypothetical at a glance.

**A real bug caught by the tests.** `nextWindowFromDay` is pure orbital geometry, so it happily returns
a phase alignment for ANY body with elements — including Mercury, which has no window-gated missions.
The readout gated on `bodyHasWindows`, but the jump ACTION did not, so it would have jumped to a
"window" the game has no concept of. Fixed by gating both identically.

**Content finding worth flagging.** `window:true` exists on exactly **4 missions in the entire game,
all targeting Mars** (`mars_flyby`, `mars_orbit`, `mars_landing`, `astrobiology`). So D4's control is
**Mars-only in practice today**. The implementation is fully data-driven — any future body whose
missions declare `window:true` lights it up with no code change — and the test file carries an explicit
canary asserting "exactly one body has windows" that will fail the moment new window content is
authored, flagging that D4's reach widened. Worth deciding separately whether more destinations *should*
be window-gated; that's a game-design question, not a map question, and is left alone here.

**Validation.** New `tests/test-map3d-window.js` (36/36): window search correctness (strictly future,
never the reference day itself, label vocabulary, null-safety), four-step forward stepping with gaps
asserted against Mars' real ~26-month synodic period (not a made-up cadence), the map-vs-card anchoring
invariants in both directions, `bodyHasWindows` gating plus the content canary, readout rendering
(NaN/undefined-free for every body, Earth renders nothing, a window-less body explains itself rather
than showing a dead button, correct "From today"/"From preview" labelling), and `mapJumpNextWindow`'s
preview-only mutation plus its safe no-ops. Full regression clean (110 suites) except the two known
pre-existing drifts. `node --check build/game.js` and `git diff --check` clean.

**Repeated the comment-header edit slip a 5th time**, caught immediately by `node --check` as before.

**NOT browser-verified**: whether the HUD now carries too many stacked blocks (SOLAR DATE + SCALE +
TRANSFER WINDOW), and whether the preview arc is distinguishable from the planned arc at a glance.

**The D-pass is complete** (D1 overlay port, D2 scale legibility, D3a roster + label LOD, D3b
orientation aids, D4 scrubber promotion). Original review is in the "Design review — Solar Map utility
pass" entry above; every proposed item shipped except the linear scale bar, which was traced and
rejected on correctness grounds — see the D2 entry.

## Session — Solar Map: pop-out parity follow-up (2026-07-25)

Owner asked whether the D-pass could be mirrored into the map pop-out. **Most of it already was** —
worth recording, because the honest answer was much smaller than the request implied.

`refreshMapPopout()` calls the SAME `startMap3D('mapPopHost', …)` scene builder the inline tab uses, so
every 3D-scene feature was already inherited there with no work at all: D1's overlay badges and route
arcs, D2's AU ruler and HUD SCALE block, D3a's moon-label LOD, D3b's ecliptic grid and off-screen
chevrons, and D4's TRANSFER WINDOW block, jump control, and preview arc. A grep for mount-specific
gating confirmed only ONE line in the entire D-pass was conditional on `mountId==='mapHost'`.

**That one line was a bug**, and it was mine: D3a's `mapRosterSelect` gated its camera snap on
`mountId==='mapHost'`, so even once a pop-out roster existed the snap would have silently done nothing
there. The gate was never load-bearing — any live `map3d` mount can be snapped — so it's now just
`if(map3d)`. (Original D3a note said the pop-out was "deliberately NOT" given a roster because it had
no side panel; that reasoning stands for why it wasn't done then, but the gate should have been written
mount-agnostic regardless.)

**The real gap** was the roster rail itself, because it's plain DOM rather than part of the 3D scene —
so unlike everything else, it didn't come along for free. Now mounted in both places:
- `.vehpop-roster` column in the pop-out body (172px, mirroring the inline `.map-stage` column width so
  the two surfaces read identically; hidden under 900px like the existing `.vehpop-stats`).
- `renderMapRoster()` writes to BOTH `#mapRoster` and `#mapPopRoster` from one `mapRosterHTML()` call —
  the pop-out is the same rail mounted twice, not a reimplementation. `refreshMapPopout()` calls it so
  the rail tracks selection there too.

**Validation.** Four parity assertions appended to `tests/test-map3d-roster.js` (29/29 total): the
roster HTML carries no host container id (so it's genuinely mount-agnostic), rows call the shared
handler, `renderMapRoster` degrades safely when neither host exists (headless / pop-out closed), and
`mapRosterSelect` works with no live 3D mount at all — covering the SVG/Phaser fallback paths as well as
the pop-out. Full regression clean (110 suites) except the two known pre-existing drifts.

One test needed fixing rather than the code: the first draft asserted the HTML contained no `mapRoster`
substring, which matched inside the shared `mapRosterSelect(` handler name. Narrowed to the container
id specifically.

**NOT browser-verified**: whether a 172px roster plus the 300px `.vehpop-stats` info panel leaves enough
stage width in the pop-out at typical window sizes — that's the one layout call worth eyeballing, since
the pop-out now has furniture on both sides of the canvas.

### Follow-up fix — the pop-out canvas vanished (2026-07-25)

The layout concern flagged directly above turned out to be an actual regression, reported immediately:
both side panels rendered but the solar system did not.

**Cause — the classic flexbox `min-width:auto` trap.** `.vehpop-stage` is `flex:1` but inherits the
default `min-width:auto`, so its shrink floor is its CONTENT's intrinsic width — the 960px canvas.
`.vehpop-roster` and `.vehpop-stats` were both `flex:0 0 <basis>`, i.e. `flex-shrink:0`, so neither
could give up space. The row therefore demanded `172 + 960 + 300 = 1432px` inside a pop-out capped at
`min(1380px, 100vw−32px)`. The overflow pushed the stage past `.popout-window`'s `overflow:hidden` edge,
so the canvas was clipped out of view entirely while both non-shrinkable panels stayed put. Arithmetic
check across 1024/1280/1440/1600/1920px viewports: it overflowed at EVERY width, which matches the
report that the canvas was never visible at any window size rather than only when narrow.

Before the roster existed the row demanded `960 + 300 = 1260px`, comfortably inside 1380 — which is why
this only appeared with the pop-out roster, and why the inline tab (a CSS grid with a `minmax(0,1fr)`
canvas column, already immune) was unaffected.

**Fix:** `#mapPopStage{min-width:0}` so the stage can actually shrink, plus `.vehpop-roster` relaxed
from `flex:0 0` to `flex:0 1` with `min-width:0`. Scoped to the map pop-out by id rather than patching
the shared `.vehpop-stage` class, to keep the blast radius off the vehicle/station/earth/command
pop-outs that also use it. The canvas already carried `max-width:100%`, so once the parent can shrink it
scales down cleanly — 520px wide at a 1024px viewport up to 908px at 1440+.

**Lesson worth carrying:** adding a fixed-basis flex item next to a canvas is not a free layout change.
Any `flex:1` sibling holding replaced content (canvas/img/video) needs an explicit `min-width:0`, because
its default floor is the content's intrinsic size, not zero. The inline tab avoided this only because it
was built as a grid with `minmax(0,1fr)` — the grid equivalent of the same guard.

### Second follow-up — the flexbox fix was NOT the cause (2026-07-25)

Owner reported the canvas still missing after the `min-width:0` fix, and confirmed the build had shipped
(`#mapPopStage{min-width:0}` verified present in `orbital-ventures.html`). So the flexbox overflow was a
real latent bug worth fixing, but it was not what he was seeing. Diagnosis restarted rather than patched
further.

**Actual defect: `refreshMapPopout()` had no fallback chain.** It destroyed the 2D fallback FIRST
(`z.innerHTML=''; z.style.display='none'`) and then called `startMap3D(…)` while **ignoring its return
value**. `startMap3D` wraps its whole scene construction in a try/catch that, on ANY failure, logs
`3D map failed, falling back to 2D`, calls `disposeMap3D()`, and returns `false`. The pop-out never
checked — so any 3D failure left it with the fallback already torn down and nothing to replace it:
a permanently blank stage with both side panels rendering perfectly. That matches the reported symptom
exactly, and matches it for ANY underlying 3D cause, which is why chasing a specific cause was the wrong
move.

The inline tab never had this bug: `renderMap()` tests the return value and falls through 3D → Phaser →
SVG. The pop-out simply never got that treatment.

**Fix:** prove 3D actually started *before* tearing down the 2D map, and restore the 2D map if it
didn't. The stage is now guaranteed non-blank on every path. This also makes the pop-out
self-diagnosing: if the 2D SVG map now appears there, 3D is genuinely failing and the console warning
from `startMap3D`'s catch names the underlying error; if the 3D map appears, the failure was in the
ordering/teardown itself.

**Process note for future sessions.** Two guesses were spent on this before finding it (the flexbox
overflow, then a mis-read of `disposeMap3D` as not nulling `map3d` — it does, at the end). The thing
that actually located it was reading the FAILURE path of the function being called rather than the
happy path, and asking "what would make the centre blank regardless of cause" instead of "what is
different about the 3D scene here". Worth reaching for sooner when a symptom is *absence* rather than
misbehaviour: absence usually means a fallback was removed, not that the primary is subtly wrong.

### ROOT CAUSE — WebGL context leak (2026-07-25)

Still blank after the fallback-ordering fix, with the decisive new detail: **"empty blue space"**, not
a missing element. That reframed it — the canvas was present and rendering its clear colour with
nothing in it, which means no exception was ever thrown, which is why two rounds of exception-handling
fixes changed nothing.

**Cause: `disposeMap3D()` never released the WebGL context.** `renderer.dispose()` frees THREE's own
objects but does NOT release the underlying context — that needs `forceContextLoss()`, which appeared
nowhere in the file. And `disposeMap3D()` runs constantly: on every tab leave (`pauseMap3D`), every
pop-out open (`refreshMapPopout` re-mounts), every pop-out close, plus both failure paths. Every one of
those leaked a context.

Browsers cap concurrent WebGL contexts (~8–16) and, once the cap is hit, **silently drop the oldest**.
A lost context renders nothing, throws nothing, and logs nothing — so `map3dTick()` kept running
happily, `startMap3D()` kept returning `true`, no catch fired, no fallback engaged. Silent blank canvas.
This is also why the inline tab looked fine while the pop-out didn't: the pop-out's context is created
last, after a session's worth of leaks, so it's the one on the wrong side of the cap.

**Three fixes, addressing three independent ways the stage could go blank:**
1. **The leak itself** — `disposeMap3D()` now calls `renderer.forceContextLoss()` after `dispose()`,
   and traverses the scene disposing geometries and materials first. Deliberately does NOT dispose
   `material.map`: the photographic planet textures live in `map3dPhotoTextureCache` and are reused
   across rebuilds, so disposing them would leave the cache holding dead textures.
2. **Silent context loss** — a `webglcontextlost` listener on the canvas now falls back to the 2D map
   instead of leaving a blank surface. `preventDefault()` marks it restorable, but we fall back rather
   than restore, since a restore would need every texture and geometry rebuilt anyway.
3. **The pop-out had no fallback in the tick-failure path** — `map3dRenderLoop`'s catch read
   `map3d.fallbackId`, which is `'mapCanvas'` for the inline mount but **null** for the pop-out, so it
   hid the host and showed nothing. All three failure paths (`startMap3D` catch, tick catch, context
   loss) now route through one new `map3dFallbackTo2D(mountId, reason)` helper that knows both mounts.

**Why this took three attempts, worth internalising.** The first two fixes both targeted *thrown
errors* — but the actual failure mode threw nothing at all. The tell was in the symptom wording all
along: "empty blue space" describes a canvas that IS there and IS painting, which rules out every
exception path before you start. When a rendering symptom is a flat colour rather than a missing
element, suspect resource/context state, not control flow. Ask "is it painting nothing, or is it not
painting?" first — those have disjoint cause sets.

**NOT browser-verified.** If the pop-out is still blank after this, the next diagnostic is the browser
console: with fix (2) in place a lost context now logs `3D map falling back to 2D: webglcontextlost`
and the 2D SVG map should appear in its place, which would confirm context loss and rule out
everything else.

### Follow-up — the context-lost handler was killing its own successor (2026-07-25)

Console output confirmed the diagnostic path above, and named the remaining defect precisely:

```
WebGL warning: generateMipmap: ... lazy initialization. 15   <- new scene's 15 textures uploading
WebGL context was lost.                                       three.module.js
3D map falling back to 2D: webglcontextlost                   (twice)
```

**`forceContextLoss()` fires the very `webglcontextlost` event the new listener subscribes to — and it
arrives asynchronously**, after the next scene has already been constructed. So opening the pop-out ran:
dispose the inline scene → `forceContextLoss()` queues a loss event → `startMap3D('mapPopHost')` builds
the pop-out scene (the 15 texture uploads in the log) → the stale queued event finally lands → the
handler read the CURRENT `map3d` and tore down the freshly-built pop-out scene. Nothing was actually
wrong with it. The texture-upload warnings appearing immediately BEFORE the loss line is the giveaway:
the thing being destroyed had only just finished loading.

So the previous commit's leak fix was correct and necessary, but it introduced a self-inflicted teardown
on top of the bug it fixed.

**Fix:** each canvas's listener closes over its own `dom`, so the handler now ignores any loss whose
canvas is no longer the live mount, and ignores losses raised during our own teardown:
`if(!map3d || map3d._disposing || map3d.dom!==dom) return;` with `_disposing` set at the top of
`disposeMap3D()` before `forceContextLoss()` runs. A genuine loss on the live canvas is still honoured.
Verified against the exact reported sequence (loss during dispose → ignored; stale loss after remount →
ignored; genuine loss on the live canvas → falls back correctly).

**General lesson:** a teardown API that *causes* the event your recovery handler listens for will make
that handler fire against its own replacement. Any such handler needs an identity check against the
currently-live object, not just a null check — a null check passes precisely when the successor exists.

### STRUCTURAL FIX — stop destroying and rebuilding the context at all (2026-07-25)

The identity guard worked (the `falling back to 2D` lines disappeared) but the stage was still blue and
`WebGL context was lost` still appeared. At that point three successive fixes had each been correct and
none had solved it, which was the signal that the problem was architectural rather than a bug to patch.

**The real problem: the map destroyed and recreated its WebGL context constantly.**
- `pauseMap3D()` — called on EVERY tab switch away from the map — ran `disposeMap3D()`, despite its own
  comment claiming it only cancelled the rAF.
- Opening the pop-out ran `disposeMap3D()` then `startMap3D('mapPopHost')` — tear down one context,
  build another.
- Closing it did the same in reverse.

So a normal session churned contexts continuously, each rebuild re-uploading all 15 planet textures
(exactly the `generateMipmap ... lazy initialization. 15` warnings in the console, which were appearing
on every single pop-out open — a strong hint in hindsight that the whole scene was being rebuilt when it
had no reason to be). Browsers cap concurrent contexts and drop the oldest, and no amount of
fallback-handling fixes a design that keeps allocating them.

**Fix: one context per session, moved rather than rebuilt.** New `remountMap3D(hostId, W, H)` reparents
the LIVE scene between mounts — `appendChild()` on an already-parented element moves it, so the canvas
keeps its context and every listener `attachMap3DInput()` bound stays bound. It moves the canvas plus
all three screen-space overlays that are appended alongside it (the HUD, the hover card, and D3b's
chevron layer — miss any of those and they stay behind in the old host), flips `mountId`/`fallbackId`,
and resizes the camera/renderer.

Wired in at every churn point:
- `refreshMapPopout()` — remount the live scene into the pop-out; only build fresh if nothing is live.
- `closeMapPopout()` — remount back to the inline host BEFORE `removeScrim()`, or the canvas is
  destroyed along with the pop-out DOM and the next open pays for a fresh context again.
- `startMap3D()` — if a live scene exists on a different host, remount instead of assuming it's already
  here (makes the function idempotent across mounts), plus a guard against starting a second rAF chain.
- `pauseMap3D()` — now does what its comment always claimed: cancels the rAF and leaves the scene
  intact. Returning to the map tab is instant, with no context churn and no texture re-upload.

`disposeMap3D()` now runs only on genuine teardown (pop-out closed while the map tab is hidden, or a
real 3D failure). `forceContextLoss()` stays, because those remaining paths do still need to release
the context rather than orphan it.

**Lesson worth carrying.** Three correct fixes in a row that don't resolve the symptom is itself
diagnostic information: it means the thing being fixed isn't the thing causing it. The console had been
saying so from the first message — 15 texture uploads on every pop-out open should have prompted "why is
the entire scene being rebuilt to move it into a different div?" long before the fourth attempt. When a
resource is being exhausted, look at what ALLOCATES it, not at the handler for what happens when it runs
out.

### Instrumentation + host-sizing fix (2026-07-25)

The structural fix worked as far as it went — `WebGL context was lost` disappeared from the console —
but the stage was still blank. Four speculative fixes in, every one reasoned from reading the code
rather than from the running page's state. Stopped guessing and added instrumentation.

**`ovMapDiag()`** — a console diagnostic (`window.ovMapDiag`) reporting what actually matters: which
host the scene is mounted on, whether the canvas is in the DOM and has non-zero layout size, whether the
rAF loop is running, whether the GL context reports itself lost, the renderer's draw-call count, camera
position/target, and the computed display/position/size of every relevant host element. Headless-safe
(returns nulls rather than throwing) so it's harmless in the test harness.

**A concrete bug found while adding it: `addMap3DTimeHud` clobbered an intentional layout.** It ran
`host.style.position='relative'` unconditionally. `#mapPopHost`'s markup is
`position:absolute; inset:0` *specifically so it fills `.vehpop-stage`* — forcing it to `relative` makes
it content-sized instead of stage-filling, which can collapse it. The override was never necessary:
`absolute` is already a positioned ancestor, so the HUD/hover-card/chevron overlays anchor correctly
either way. Now only promotes a host whose computed position is `static`.

**Related: the renderer was sized to nominal constants, not reality.** `remountMap3D` used the passed
`MAP_POP_W/H` (960×680), but the pop-out stage is now squeezed by the roster on one side and the info
panel on the other, so 960 was never the real width. It now measures the host's actual
`getBoundingClientRect()` (falling back to the nominal values if layout hasn't settled) and calls
`setSize(w,h,true)` so the canvas's CSS box matches its drawing buffer.

**Process note.** The lesson from the previous entry recurred immediately: after the structural fix
didn't fully land, the correct next move was instrumentation, not a fifth hypothesis. Reading code tells
you what SHOULD happen; only the running page tells you what IS happening. For a UI symptom that has
survived more than two fixes, add the diagnostic first — it is almost always cheaper than another wrong
guess, and it converts an open-ended search into a single question.

### Solar Map SM1–SM5 source integration (2026-07-26)

Ported the complete SM1–SM5 review-build chain into authoritative source and rebuilt all generated
artifacts. The Solar System scene now has a larger inline viewport and near-full-screen operations
pop-out; collapsible rails and Map Only; real-size resize observation; camera presets, fit/easing, and
distance-sensitive zoom; selection/hover/marker/label/orbit readability layers; deterministic layered
deep space, solar lighting, and map quality tiers; and Navigation, Mission Planning, Operations, and
Strategic modes over existing simulation truth.

Preserved the one-live-WebGL-context architecture. Firefox/WebGL verification covered 1902×870 Map
Only resizing, screen-stable labels/halo, mode and quality/orbit controls, and repeated remount cycles
with exactly one canvas. Added `tests/test-map-sm1-sm5-source.js` (26/26); all 11 adjacent map suites
pass; full sweep is 108/109 with only the documented pre-existing `test-flight3d-trajectory.js` drift.

## Shipped — Mission Control UI shell standardization (completed 2026-07-26)

Use Mission Control's spatial language as the shared application shell without forcing every scene
into the Cape's exact composition. All six primary scenes should share the global HUD, a permanently
mounted bottom scene dock, compact contextual side slots, a common monitor toolbar, consistent surface
tokens, and one responsive breakpoint system. Preserve each scene's specialized interaction model
through three shell variants:

- **Immersive:** Command Center and Solar System.
- **Assembly:** Station Bench and Base Bench.
- **Workspace:** Design Bench and R&D.

Logical scene-slot mapping:

- **Command Center:** agency/program/technology deck | Cape scene | mission and global status.
- **Solar System:** body roster | live map | selected-body and activity inspector.
- **Station/Base Bench:** facility or module palette | assembly board | focused facility statistics
  and actions.
- **Design Bench:** vehicle and mission summary | stage editor | delta-v and readiness inspector.
- **R&D:** active project and filters | technology tree | node inspector; divisions and partnerships
  remain below the monitor or move into subtabs.

### Migration phases

1. **Shared shell contract — SHIPPED 2026-07-26:** replaced parallel scene metadata with one
   `SCENE_DEFS` registry, correctly classified Base as a scene, permanently mounted the six-page
   scene dock, and added shared shell tokens/primitives without moving specialized page content.
   Firefox verified dock visibility on the initial Bench and long R&D views; focused shell,
   hotkey, Command hero, regression, Base Bench, syntax, and build-parity checks pass.
2. **Solar System pilot — SHIPPED 2026-07-26:** moved the existing roster DOM into the shared
   left contextual slot, kept the live map and all SM1–SM5 controls in the central monitor, and
   retained selected-body/activity information in the right inspector. Expand mode returns the
   same roster node inline, so no renderer state or WebGL context is duplicated. Verified at
   1920×1080 and 800px wide with exactly one map canvas; all 11 map suites pass.
3. **Assembly unification — SHIPPED 2026-07-26:** Station and Base now render through one
   configurable assembly-shell structure with a shared palette, monitor toolbar, right inspector,
   responsive stacking, and pop-out contract. Base gained a read-only pop-out projection without
   duplicating simulation state. Verified at 1920×1080 and 800px wide; assembly, Base, Station,
   shell, pop-out, syntax, and build-parity checks pass.
4. **Workspace migration — SHIPPED 2026-07-26:** Design Bench now places the existing live
   vehicle/mission summary in the left contextual slot, keeps its stage editor central, and retains
   delta-v/readiness on the right. R&D places active-project status and track filters left, keeps
   the technology tree central and node inspector right, with divisions and partnerships below.
   Both preserve one live DOM host and stack cleanly at 800px.
5. **Consolidation and verification — SHIPPED 2026-07-26:** removed retired scene/panel and
   optional-right shell state, collapsed workspace layout onto the shared 880px breakpoint, and
   limited Command-specific DOM projection to the timeline only. Tab and number-key navigation now
   follow the visible six-scene dock order. Added focused workspace and shell-consolidation tests;
   desktop and 800px Firefox checks confirm focusable navigation landmarks, unique live hosts,
   contained overflow, and stable left/center/right geometry.

Primary risks to hold constant during migration: do not alter simulation state or game balance; do
not rebuild or duplicate the Solar Map's live WebGL context; keep generated release artifacts in sync
through `node build.js`; and preserve the existing classic-script/global-handler execution model.

## Session — Station/Base Three.js assembly views, slice 1 (2026-07-26)

Replaced the inline Station and Base assembly-board projections with one shared, remountable Three.js
renderer. The Station view now builds the current ordered module list as a radial orbital complex with
procedural pressure vessels, labs, docking nodes, trusses, arrays, connectors, an Earth limb, and an
orbit camera. The Base view builds the same authoritative module model as a connected surface site on
deterministic Moon- or Mars-specific terrain, including habitat domes, ISRU equipment, reactors,
garages, corridors, pads, rocks, lighting, and atmosphere/body color treatment.

The renderer consumes the existing `facilityModuleList`/draft state and module definitions; it does
not add parallel assembly state or change costs, power, crew, ports, production, or progression. One
WebGL context remounts between Station and Base hosts, pauses with the hidden-renderer lifecycle, and
retains the exact SVG projection as the no-Three/WebGL fallback and for the current read-only pop-outs.
Mouse drag orbits, the wheel zooms, double-click and the toolbar reset restore the scene camera, and
the existing expand/zoom shell controls address the live 3D view.

Firefox/WebGL review covered a seven-module orbital draft plus eight-module lunar and Martian sites:
each view mounted exactly one canvas, the shared renderer moved cleanly between hosts, and the surface
palette, Mission Control shell, and facility inspector remained intact. Added
`tests/test-assembly3d.js` (21/21); the adjacent Station, Base, shell, retention, and Three guard suites
are 111/111, with build parity clean.

Logical follow-ups are interaction polish rather than a second renderer: hover/select module focus,
inspector-to-mesh highlighting, lower-density label LOD, construction/attachment animation, and
bringing the pop-out projections onto the same remountable context once their window lifecycle has a
single-context handoff contract.

## Session — #19 Time-to-affordability estimates (2026-08-04)

Backlog item #19 (S complexity, ★★ impact): a shared progress-bar widget showing how close the
player is to affording a purchase, wired into every one-time capital-purchase surface in the game.

`affordEstimate(cost)` (render.js) is the pure calc. Two months-to-afford figures, deliberately
reusing two "net" figures the game already tracks for a different question rather than inventing
a third:
- `months` — shortfall ÷ `commandSummary().net`, the instantaneous recurring net at this moment
  (current facilities/payroll/overhead, no one-off mission income).
- `monthsTypical` — shortfall ÷ `state.lastMonth.net`, what actually landed last completed month
  (the same field `runwayMonths()` already reads for the inverse question — months of runway
  left). Falls back to the instantaneous figure before the first month ticks.

`affordWidgetHTML(cost)` renders both alongside a slim progress bar (`state.money/cost`).
Always renders — even once affordable, showing a full green bar and "0 mo" — rather than
disappearing, so it reads as a stable element beside the button instead of popping in and out.
Amber when on track; red with a "won't close this gap at current burn" warning when the live net
is at or below zero.

Wired into: research (tree action bar `renderTechAction`, detail panel `renderResearchDetail`,
and leveled-tech upgrades), facility founding and expansion (`renderInfrastructure`), division
training (`renderDivisions`), department training (`renderPersonnel`), passive-contract signing
(`renderPassiveContracts`), and material dip bulk-buys. Each site only calls the widget when the
specific gate is "not enough capital" (checked against each function's own `why`/`chk.why`
discriminator, e.g. `canBuyMaterialDip`'s `'Not enough capital.'` vs `'Yard cap is...'`) so a
locked/prereq-gated/full-yard state never shows a misleading afford-widget.

Deliberately NOT wired into hiring — `hirePersonnel(id)` has no money gate at all (salary is a
recurring monthly cost, not an upfront capital purchase) — nor into small instant-decision buys
(fuel lots, station resupply/repair, rival intel/counterpoach) where a save-up estimate adds
little over the existing disabled-button state.

New `tests/test-afford-estimate.js` (39/39): pure-calc branches (affordable/shortfall/typical-vs-
simple/no-lastMonth-fallback/stuck-on-either-side), the formatter, widget HTML for all three
color states, wiring checks for every surface above (using a cached-`getElementById` shim, same
pattern as `test-roster.js`, since the harness's default stub is memory-less per call), and a
behavioral check that hiring succeeds at $0. `commandSummary()` is locally stubbed for the calc/
widget sections so the arithmetic is deterministic rather than riding the live starting economy
(which nets negative at game start on Engineer difficulty, before any facilities or contracts).

Full suite: 120/120 files run clean except the pre-existing `test-flight3d-trajectory.js` drift
(documented above as Codex's own accepted physics change, unrelated to this slice). Build parity
clean; `node --check build/game.js` clean.

## Session — Tier 0.1: dev build stops embedding textures, generated artifacts untracked (2026-08-04)

From the Tier 0 playability-review scoping. `build.js`'s `embeddedTextureScript()` was inlining the
same ~16.6MB base64 texture blob into both `orbital-ventures.html` (release) and `index.html` (dev).
Only the release build needs it — confirmed it's opened via `file://` for personal use, where Firefox
can refuse `THREE.TextureLoader`'s separate image fetches, and the code comment in `build.js` documents
that as the deliberate reason for embedding. `index.html` runs from a folder with `assets/` sitting
right next to it and carries no such constraint.

Change: `createBuildArtifacts()` now only threads `textureScript` into `releaseHtml`, not `devHtml`.
No source-code change was needed beyond `build.js` — `map3dPhotoTexture()`/`cape3dTexture()`
(`src/render.js`) already prefer `window.__OV_TEXTURE_DATA__` when present and fall back to plain
`assets/*.jpg`/`.png` relative URLs (`MAP3D_TEXTURE_ASSET`/`CAPE3D_TEXTURE_ASSET`) when it's absent —
that fallback path was already correct, just never exercised for the dev build before now.
`index.html` dropped from 16.7MB to 117KB; `orbital-ventures.html` unchanged at 18.6MB (by design).

Added two checks to `tests/test-build-parity.js`: a synthetic fixture with one fake texture file
confirms the release build's output contains `__OV_TEXTURE_DATA__` and the dev build's does not.

Separately: added `.gitignore` for `orbital-ventures.html`, `index.html`, `build/game.js` and
`git rm --cached` all three (files remain on disk, still fully playable — only git tracking changed).
Confirmed with Shamus this is safe: actual save/progress lives in browser `localStorage`
(`src/save.js`'s `SAVE_KEY`), never in these generated files, and all three regenerate byte-identical
from `src/` via `node build.js`. Rewriting `.git` history to reclaim the ~109MB already committed
across past sessions was explicitly declined (repo size isn't currently a problem) — left as a
possible future decision, not done here.

Full suite clean except the pre-existing, documented `test-flight3d-trajectory.js` drift. Build parity
clean. **Open item for Shamus to verify in a real browser**: confirm `index.html`'s Solar Map/Cape
textures actually render when opened however he normally runs the dev build — the fallback logic is
sound by inspection, but wasn't (and can't be, headlessly) visually confirmed this session.

## Session — Tier 0.2: desktop breakpoint for the persistent 3-column shell (2026-08-04)

Added one `@media(max-width:1200px)` tier narrowing `--cc-rail-width` from 380px to 300px on both
left and right rails (confirmed with Shamus — not a right-rail-drop approach), sitting above the
existing 880px single-column collapse in `src/shell.html`. Nothing else in the file changed —
`.scene-shell`'s `grid-template-columns:var(--cc-rail-width) minmax(0,1fr) var(--cc-rail-width)`
already read the variable, so overriding it at `:root` was sufficient.

Found while placing the rule: `.command-hero` (Command Center's own hero composition,
`@media(min-width:1101px)`, added Phase 3A) already gives that one scene a fluid
`--cc-rail-width:clamp(220px,20vw,285px)` — narrower and continuously responsive, no fixed
breakpoint needed. Its comment says it explicitly: "Scoped to .command-hero so the bench, R&D, map
and station keep the established shell." Same specificity as the new `:root` rule, later in source
order → wins on Command Center as intended, leaving the new tier to reach exactly the 5 scenes that
didn't already have an answer for this width range (Bench/R&D/Map/Station/Base). No conflict, no
double-narrowing.

CSS-only change; `node --check`/build parity trivially clean (no JS touched). No headless test —
this class of layout change isn't testable in the current DOM-stub harness, matching the item's own
scoping note. **Not yet browser-verified** — Shamus to confirm visually at 1150px, 1200px, and
1366px viewport widths in Firefox per the existing layout-slice convention.

## Session — Tier 0.3: header/readout tooltips, Tier 0 complete (2026-08-04)

Last of the three Tier 0 playability items. Added `title=` tooltips to every header stat in
`src/shell.html` (Date, Capital, Reputation, Flights, Public Support, Market, PGM Royalties,
Passive Income, Facilities, Science, LEO Depot) and to the bench readout's Δv gauge and Liftoff
TWR metric in `src/render.js` — both previously had zero tooltips despite the adjacent
time-control buttons already using the exact same `title=` pattern.

Checked each stat's actual mechanic against source before writing copy rather than guessing from
the label — caught one real mistake in the process: "Market" reads like it should be about
propellant/materials pricing, but `renderMarketStat()` shows it's actually active `econEvents`
(booms/downturns) affecting payout multiplier and overhead. Tooltip text corrected before shipping
to describe economy events, not a fuel-price mechanic that doesn't exist for this stat.

New `tests/test-header-tooltips.js` — a source-guard test (reads `src/shell.html`/`src/render.js`
directly, same style as `test-scene-shell-contract.js`/`test-map-sm1-sm5-source.js` rather than a
harness+game.js render test, since this is static markup) confirming every listed stat and the
Δv/TWR readout carry a non-empty `title=`. 13/13.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

**Tier 0 is now fully shipped (0.1 texture-embed split + git untracking, 0.2 desktop breakpoint,
0.3 tooltips).** Two items from this arc still need Shamus's own eyes, not headlessly verifiable:
`index.html`'s textures actually loading when opened his normal way, and the 0.2 breakpoint's
visual result at 1150/1200/1366px in Firefox.

## Session — Tier 1.1: in-flight anomaly pool expanded 3 → 10 (2026-08-04)

`MISSION_ANOMALIES` (`src/sim.js`) held three entries — stuck solar array, life-support leak,
terminal guidance radar — selected uniformly by `rollMissionEvents()`, so the same three recurred
across an entire 158-year campaign. The mechanism was already good; it just had no content depth.

Added seven historically-grounded entries, each following the existing shape exactly
(`{id, title, when(ctx), detail, options(ctx)}` → `resolve(rng)` returning
`{payoutMult?, repDelta?, outcomeOverride?, log}`), with odds running through `opsLuck()` so
mission-controller staffing still improves them:

- **thruster_stuck** — Gemini 8's stuck-open OAMS thruster. Isolate the ring, null the rates on the
  reentry control system (crewed), or let it drain.
- **guidance_alarm** — Apollo 11's 1202/1203 executive overflow alarms during descent. Call go on
  the reasoning that overflow ≠ failure, abort the burn, or hand-fly it. Gated on `digital_computer`.
- **thermal_loss** — Skylab's torn-away sun shield. Improvise a parasol (crewed), thermal-roll the
  vehicle, or power down and ride it out.
- **comms_blackout** — link lost before a burn window closes. Trust the stored onboard sequence,
  wait for reacquisition and take a later window, or safe-mode the vehicle.
- **dock_latch** — soft capture holds but the hard-latch ring won't seat. Retry, EVA to the interface
  and drive them by hand, or work the soft capture alone. Gated on `orbital_assembly`; the EVA branch
  additionally on `orbital_eva`.
- **transfer_leak** — transfer stage venting faster than boil-off explains. Burn early, isolate the
  feed line, or re-plan for a lower-energy objective.
- **micrometeoroid** — hypervelocity strike. Survey before committing, patch from inside (crewed), or
  seal off the affected section.

**Balance-neutral by construction:** `ANOMALY_CHANCE_BASE` (0.26) and every frequency modifier
(crewed +0.06, profile +0.06, `REHEARSAL_ANOMALY_MULT`, `ctrlAnomScore()`) are untouched. Pool length
does not enter `rollMissionEvents()`'s chance calculation at all — this changes *variety*, not risk.
A dedicated test pins both constants and asserts a draw just under/over the computed threshold still
fires/doesn't, so a future pool change can't silently move the risk curve.

Two conventions held throughout and now test-enforced: every anomaly always offers at least one option
that cannot strand or lose the crew even on the worst roll (the player is never forced to gamble
lives), and anything presupposing a capability gates on `state.research` rather than mission shape
alone.

Also tightened while here: coerced every new `when()` predicate to return a strict boolean. The
originals are inconsistent about this (`guidance` returns `!!c.m.profile`, `solar_array` returns a
truthy expression) — harmless since all callers use truthiness, but the new entries are consistent.
Caught by the new test asserting `when()===true`, which is worth keeping strict.

New `tests/test-anomaly-pool.js` (24/24): structural contract, unique ids, the three originals still
present, `when()`/`options()` never throwing across six representative flight contexts (suborbital/
orbital/deep × crewed/uncrewed/tanker), every entry reachable, every option well-formed, every
`resolve()` safe on both RNG extremes, the safe-option convention, research gating on and off,
crew-only branches never leaking onto uncrewed flights, frequency neutrality, and uniform selection
across the eligible set.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

## Session — Tier 1.2: near-miss attribution on successful flights (2026-08-04)

`resolveFlight()` rolled every subsystem independently and, on a clean success, set `subsystem:null`
and discarded the roll data — so a player never learned which subsystem nearly ended the flight, and
reliability investment produced no felt moment.

The loop now binds each draw to a local instead of comparing it inline, and tracks the narrowest
surviving margin (`s.rel - roll`) as it goes. Same single `Math.random()` per subsystem, same order,
same comparisons — the roll sequence and every outcome are unchanged. It simply stops throwing away a
number that was already computed. `NEAR_MISS_MARGIN` (0.05) gates whether it surfaces; attribution
attaches only to `kind==='success'`, since a failure already carries a subsystem and causal story and
a "what nearly went wrong" note beside "what did go wrong" would only muddy it.

`nearMissText()` renders it: "⚠ Close call — Structures held at 91%, 2 points from failing."

**A scoping estimate corrected by measurement.** The entry predicted ~1 in 4 successful flights would
carry attribution, assuming ~0.95 reliabilities across 5-7 subsystems. Measured over 5000 seeded
flights from an Engineer start, the real figure early game is **~11%** — an early vehicle has THREE
subsystems (propulsion 81%, structures 91%, avionics 88%), not five to seven at 95%. The rate rises
through the campaign as staging/boosters/deep-propulsion/life-support come online, each an
independent chance to land in the band, toward roughly 25-30% late. Constant left at 0.05; the code
comment and ROADMAP entry now carry the measured range rather than the guess.

**Scope limit held.** The original review framing — "the QA program you funded is why this held" — was
not shipped, because it is not derivable: reliability aggregates research, engineer score, QA level,
test campaigns, era and weather into a single `R` before `subsystemReport()` splits it per-subsystem
by weight. `nearMissText()` names the subsystem and the margin and makes no per-investment causal
claim; a test asserts it doesn't.

**Bonus, deliberately kept.** The per-phase causal breakdown previously threaded only into failure log
entries is now attached to every outcome. `phaseBreakdownLines()` marks a governing subsystem only
when one is supplied, so on a clean success it renders as a plain per-phase reliability breakdown with
nothing flagged — hovering a successful flight now shows what the odds actually were and where. The
variable was renamed `failDetail` → `phaseDetail` to match its widened role.

New `tests/test-near-miss.js` (33/33). The important one is a parity proof: a reference implementation
of the ORIGINAL inline-compare loop is run against the same seeded stream as the live `resolveFlight`
across 300 seeds, asserting an identical governing subsystem every time, with the fixture verified to
exercise both successes and failures. Also covers the text shape (including singular/plural and
sub-point margins never rendering as "0 points"), attribution never riding on a failure, every
reported margin being under threshold, the reported subsystem being real and surviving and never the
failed one, dev-forced outcomes carrying none, and the clean-vs-governed breakdown rendering.

**A test bug worth recording.** The first fixture hand-rolled a `v` literal instead of calling
`computeVehicle()`. `subsystemReport()` returned NaN reliabilities, `roll > NaN` is false, so every
flight "succeeded", no margin was ever finite, and three assertions silently proved nothing while the
suite reported passes. A fixture-sanity block now asserts reliabilities are finite and in (0,1] before
anything else runs. RULE: when a fixture feeds a numeric model, assert the model's output is finite
before asserting anything about its behaviour.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

## Session — Tier 1.3: third Chronicle bookend at 2060, Tier 1 complete (2026-08-04)

Last item in Tier 1. `SCORING_YEAR` (1990) and `SCORING_YEAR_2` (2100) left a 110-year stretch with no
scored milestone — the campaign's weakest pacing zone per the second critical review. Added
`SCORING_YEAR_3=2060`, aligned to the Interplanetary era boundary, mirroring the existing pattern
exactly: an independent one-shot `state.eraScored3` flag, a third `'era3'` mode in `showChronicle()`
with its own heading/sub-text, and a block in `checkScoringDate()` placed in year order between the
existing two. `SAVE_VERSION` bumped 58→59 documenting the additive field (no migration code needed —
`!state.eraScored3` is naturally true when the field doesn't exist).

**Corrected a mistake in my own prior scoping before implementing it.** The ROADMAP entry, written
when Tier 1 was first scoped, required that "a save already past 2060 does not retroactively fire the
ceremony on load." Checked against the actual behavior of `SCORING_YEAR`/`SCORING_YEAR_2` and found
that requirement contradicts how both already work: `state.eraScored2` is simply `undefined` on any
save predating it, so a save already past 2100 fires that ceremony once on its next check — there is
no code path distinguishing "the player just crossed this year during play" from "this save was
already past it," because both produce identical state (`state.year>=SCORING_YEAR_2 &&
!state.eraScored2`). No test guarded this for era/era2 either. Building a skip-guard for 2060 alone
would have made it behave inconsistently with its two siblings for no principled reason. Shipped to
match the real, established behavior instead, and corrected the ROADMAP wording rather than leaving a
requirement in the doc that the implementation deliberately doesn't satisfy.

New `tests/test-chronicle-bookends.js` (22/22) — `checkScoringDate()`/`showChronicle()` had **zero**
prior test coverage for any of the three bookends, so this backfills 1990 and 2100 alongside the new
2060: each fires exactly once and does not re-fire on repeated checks; a fresh save jumped straight to
year 2150 (simulating an old save's first post-load check) fires all three once each, in chronological
log order; `showChronicle()` accepts every mode without throwing; the era3 heading/footer render with
the expected text; and a source-level check confirms the continue/retire button branch's condition
actually lists `'era3'` (a missed mode there would have silently degraded era3's modal to the plain
'view' footer instead of the ceremony footer — the kind of gap this session has been especially
careful about after Tier 3's `uiLayerBtn` finding).

One test-authoring note worth keeping: the first draft of the modal-content check guessed at the DOM
host id (`'modal'` before falling back to `'modalBody'`) rather than confirming which one `showModal()`
actually writes to. It happened to resolve correctly, but a debug script was run to prove that before
trusting it, and the test was tightened afterward to assert the real id directly with a fixture-sanity
check (`html.length>0`) guarding the two assertions that would otherwise have been silently vacuous
had the guess been wrong.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

**Tier 1 is now fully shipped: 1.1 anomaly pool (3→10), 1.2 near-miss attribution, 1.3 this bookend.**
Remaining work is Tier 2 (A1 human-blocked, A2/A3/B4/B5/C7 open, C6 decision-blocked) and Tier 3
(3.1-3.5, all open).

## Session — Tier 2 A2: surface the rival simulation on the Command deck (2026-08-04)

The Command deck's rival strip (`renderCCRight()`) showed only `flag · name · threat-pill` for the top
three rivals by threat score — none of the momentum, projection or market-crowding machinery that
`showRivalsModal()`'s deep view already renders was visible without opening it.

Each of the three rows now also shows the rival's next goal and its projected claim year, reusing
`rivalProjectedYear(r)` — the exact same accessor the modal already calls — with the same ahead/behind
framing against the historical nominal year. A shared line below the three rows reports
`rivalCrowdFactor()` when it's below 1, naming the player's own passive-contract count as the cause.

**A scoping assumption turned out backwards, in the reviewer's favor.** The ROADMAP entry (written
during Tier 2's scoping) worried about correctly gating the projection behind `rivalIntelOwned()`. Reading
`rivalFullProjection()`'s own code comment settled it the other way: `rivalProjectedYear(r)` —
`rivalFullProjection(r)[0]` — is explicitly documented as the free figure ("the first entry is
byte-identical to the number this used to compute... every free player sees the same"). Only the REST
of the timeline (indices 1+, the paid intel dossier's content) is gated. So surfacing the pending goal
needed no new gate logic at all — it just needed reusing the existing free accessor, exactly as
`showRivalsModal()` already does for its own `projTxt`. Verified directly rather than assumed: a debug
script confirmed a rival with 7 remaining goals never leaks goal #2's name onto the strip, with or
without intel owned.

New `tests/test-rival-strip.js` (22/22): basic rendering, the projection text matches the real
accessor's output, the "all goals claimed" fallback when a rival is exhausted, the intel-gate
non-leak (both without and with intel owned — the strip stays to the free pending goal either way, by
design; the full timeline stays modal-only), the crowd-factor line's presence/absence and exact
displayed value against `rivalCrowdFactor()` across contract counts, singular/plural grammar at n=1,
and that the Deep view / Chronicle buttons and threat pills are untouched.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

## Session — Tier 2 A3: surface crisis proximity on the Command deck (2026-08-04)

`crisisCandidates()` gates each of the three `CRISES` on era AND threshold — it only returns crises
already eligible to trigger. The player was never shown either counter, so a crisis arrived as an
ambush even though the ingredients for dramatic irony ("34 of 40 — every LEO launch is loading the
gun") were already sitting in `state.leoFlights`/`state.deepFlights`.

Added `crisisProximity()` (`sim.js`, next to `crisisCandidates()`) as a deliberately different query:
every ERA-eligible crisis regardless of threshold, each with its current value and percent progress.
Era-ineligible crises are omitted entirely — no spoilers for content not yet reachable. Returns `[]`
while a crisis is already active, since that state is already surfaced elsewhere (the Outliner strip
and `agencyAlerts()` both read `state.crisis` directly) — the new card would be redundant, not just
quiet, so it doesn't render at all in that state rather than rendering an empty shell.

A new "Horizon" card in `renderCCRight()`'s right rail (between "This month" and "Space news") reads
this: `34/40` for a threshold crisis, amber once past 75%, and "watching political conditions" for
`funding_collapse` (`thresholdStat:null`) instead of a nonsensical `0/0`. The card itself omits when
`crisisProximity()` returns empty, matching the existing convention of the other cards in this rail
(the "Rivals" card similarly only renders its crowd line conditionally).

Deliberately did NOT fold in `crisisCandidates()`'s "not an immediate repeat of the last resolved
crisis" exclusion — that's a mechanical rule about what can trigger *next*, not a reason to hide a
real, rising number the player has been building toward. Documented directly in `crisisProximity()`'s
comment so a future reader doesn't "fix" it into matching `crisisCandidates()`.

New `tests/test-crisis-proximity.js` (29/29): era gating tested one crisis at a time rather than
all-or-nothing (era 3 admits only `funding_collapse`, era 4 adds `debris_cascade`, era 5 adds
`solar_storm`); progress percentage correctness at 0%, mid-range, exactly-at-threshold, and clamped at
100% past it; the `funding_collapse` null-not-zero contract at both the accessor and rendered-text
level; the card's self-omission when nothing is eligible; the card's disappearance while a crisis is
active; and — as an explicit protected-baseline check — that `crisisCandidates()` still excludes a
below-threshold crisis that `crisisProximity()` correctly still lists, proving the two functions answer
different questions rather than one silently becoming a wrapper around the other.

Full suite clean except the pre-existing `test-flight3d-trajectory.js` drift. Build parity clean.

**Tier 2 progress: A1 (human-blocked) and C6 (decision-blocked) remain blocked; A2 and A3 shipped;
B4, B5, C7 still open.**

## Session — Tier 2 B4: crisis pool expanded 3 → 9, four new effect axes (2026-08-04)

`CRISES` held three entries gated to eras 3, 4 and 5, leaving the Interplanetary (2060+) and
Speculative (2100+) eras — the back half of a 158-year campaign, and the second review's identified
weak zone — with no crisis content at all.

Shamus chose shape (b) from the pre-work options: genuinely new effect axes rather than reskinning the
existing three. Four were added, each with exactly one application site in live code:

- `crewRel` — crewed-mission reliability tax. A fourth branch in the existing `crisisRelPenalty()`,
  so near-zero risk: same shape as `leoRel`/`deepRel`, same call site.
- `research` — `crisisResearchMult()`, applied at the daily R&D tick (`state.activeResearch.monthsLeft
  -= perDay((1+rdBonus)*crisisResearchMult())`).
- `facilityOut` — `crisisFacilityMult()`, folded into the daily facility production loop's `factor`,
  so it cuts every stream a facility produces (money, rep, fuel, science) rather than just income.
- `buildTime` — `crisisBuildMult()`, applied in `buildMonths()`. The only axis that INCREASES rather
  than decreasing. `buildMonths()` is pure and recomputed per call, so this shows live in every
  build-time readout in the UI and does not retroactively extend already-queued builds.

All three new multiplier accessors follow `crisisGovFundingMult()`'s existing contract exactly —
return the neutral value unless a crisis is active AND owns that axis — so every call site is a safe
unconditional multiply.

Six new entries: `crew_attrition` (era 6, crewFlown≥30, crewRel), `isru_supply_shock` (era 6,
deepFlights≥30, facilityOut), `talent_exodus` (era 6, flights≥80, research), `orbital_congestion`
(era 7, leoFlights≥80, buildTime), `safety_backlash` (era 5, crewLost≥3, govFunding) and
`deep_comms_saturation` (era 7, deepFlights≥45, deepRel). The last two deliberately reuse an existing
axis with a new fiction and a new TRIGGER — the trigger is what makes a crisis feel distinct, not only
the tax.

**No new counters were introduced.** Every threshold uses one of the five that already exist and are
already incremented. A `thresholdStat` naming a field nothing increments would make its crisis
unreachable forever, so the test now pins the whole set against a known-counter allowlist.

`CRISIS_TRIGGER_CHANCE` and every frequency modifier are untouched — more variety at the same rate,
the same discipline used for Tier 1.1's anomaly pool.

New `tests/test-crisis-pool.js` (43/43). The load-bearing check loops every distinct `effectKey` in
the pool and asserts each moves at least one live observable at full severity — a typo'd or unhandled
key would otherwise ship as an inert label-only crisis, and this catches that by construction rather
than by remembering to hand-test each new axis.

**A stale assertion in my own A3 test broke, correctly.** `test-crisis-proximity.js` asserted "at era
5: all three crises are eligible" with a hardcoded `=== 3`, written when the pool held exactly three.
Expanding to nine made four eligible at era 5 and the assertion failed — the logic was right, the test
was brittle. Rewritten to derive the expected count from `CRISES` itself, so it tests the actual
invariant ("every crisis whose eraMin is satisfied is listed") and survives future pool changes. RULE:
don't hardcode a collection's size in an assertion when the collection is expected to grow.

Also verified explicitly, rather than assumed, that `test-flight3d-trajectory.js`'s drift is unchanged
by this slice: stashed the changes, rebuilt, ran it (13/31), restored, rebuilt, ran it again (13/31).
Worth doing because this slice touched three live game paths and a genuine new regression there would
have been easy to wave away as the known drift.

**Balance note for playtest:** `safety_backlash` is the only crisis triggered by failure rather than
scale (`crewLost >= 3`). Thematically strong but it does compound a bad run, so its `maxPenalty` is
0.30 against `funding_collapse`'s 0.50 on the same axis. One number to change if it feels punitive.

Full suite clean except the pre-existing drift. Build parity clean.

## Session — Tier 2 B5: research node audit finds no placeholders; two stale docs corrected (2026-08-04)

B5's original scoping assumed some of the 14 `effect:{}` RESEARCH nodes were unfulfilled placeholders
needing real payloads. A full audit — grepping every id for both quoted and dot-notation references,
then reading each call site rather than trusting the name — found zero. All 14 are legitimately empty:

- **Bespoke-implemented (7):** `strapon_integration`, `orbital_eva`, `cryo_boiloff_control`,
  `megawatt_electric`, `gravity_assist_planning`, `aerocapture`, `surface_fission_power`. Each has a
  real mechanic wired at its own point of use rather than through the generic effect bus
  `researchEffectSum()` pools for stats like reliability/cost-cut/isp.
- **Capability gates (2):** `precision_edl`, `onorbit_servicing`.
- **Pure prereqs (5):** `electrolysis_scaleup`, `station_keeping`, `large_space_stations`,
  `autonomous_operations`, `hydrogen_storage`.

The actual finding was two stale documentation defects. ROADMAP.md's own "Open threads" section
claimed cryo boil-off "is not modeled as a *mechanic*" and that `cryo_boiloff_control` was an
unfulfilled placeholder — but `boiloffMargin()` (`sim.js:1800`) has existed and been consumed by
`resupplyCostFull()` for some time; the note was simply never updated after the mechanic shipped.
B5's own ROADMAP entry then repeated that stale claim as its justification for existing. Both
corrected — the open-thread note left visible with a strikethrough and correction rather than deleted,
as a record that a stale doc can survive multiple sessions unnoticed.

This is the third review finding in this project's history that traced to reasoning about the design
instead of reading the code, after "build a decision system" (Tier 1) and "build a crisis system"
(Tier 2 A-series) — both already built when proposed.

Shipped: `RESEARCH_EMPTY_EFFECT_ALLOWLIST` (`data.js`, immediately after `RESEARCH`) documenting each
of the 14 with its specific reason. New `tests/test-research-effect-gates.js` (12/12) guards the
invariant both directions — any new empty-effect node must be documented (catches a genuine future
placeholder), and any allowlisted id must still exist and still be empty (catches a stale entry
surviving a future edit that gives that node a real payload) — plus a substantive-reason-string check
and spot-checks that each claimed category (bespoke/gate/prereq) actually holds up against source,
not just against the audit's own say-so.

Full suite clean. Build parity clean. No source logic changed — this session's actual code delta is
one new constant and its guarding test.

## Session — Tier 2 C8: outer-system bases + per-body environmental hazard (2026-08-04)

C7 ("give facilities a specialization axis") was superseded before any code was written: the audit
found that system already exists and is good — 10 distinct `STATION_MODULES` with real production
profiles, four working synergies rewarding composition over accumulation, surface/orbital gating, and
power/crew/maintenance constraints. Module choice already changes what a base *is*. `facilityPortCap`
returning `Infinity` off-Earth, flagged in C7 as a gap, is a documented deliberate decision. That was
the **fourth** review finding in this project not to survive contact with the source.

The real gap: `FACILITY_DEFS` had exactly three entries, so base *count* was hard-capped at 3 for a
158-year campaign, and Moon/Mars differed only by numeric scalars. Shamus confirmed new bodies were
wanted, specifically outer-system ones with body-defining problems (Jovian radiation, Io's volcanism),
and asked for a combined push.

**Built in a strict internal order so a mistake in one half couldn't hide in the other:**

*Step 1 — hazard mechanic, inert.* `BODY_HAZARD` + `hazardDecayMult`/`hazardResupplyMult`, wired into
the two existing live hooks: the condition-decay line in `tickStationOperations()` and
`resupplyCostFull()`. Earth/Moon/Mars set to 0 and unlisted bodies falling back to 0, so the mechanic
shipped numerically inert for every facility that existed before it. Verified empirically rather than
by inspection: captured production/resupply/decay figures for all three existing facilities, stashed
the changes, rebuilt, re-ran the same fixture, and diffed — output identical. Those exact figures are
now pinned as literals in `test-outer-bases.js`, so if hazard ever stops being inert for a pre-C8 body
the suite fails.

*Step 2 — the new bodies.* `callisto_base` (gated on `jupiter_orbit`) and `titan_base` (gated on
`titan_landing`), both reusing `STATION_MODULES` and existing surface gating wholesale — no new module
types. Callisto is the game's own nominated safe Jovian site per its `BODIES` note. Hazard 0.55 and
0.40 respectively; `BODY_RESUPPLY_MULT` 9.5/12.0; `LOGI_TRANSIT_DAYS` 1000/1400 — the multi-year
resupply lead is the real difficulty of holding an outer base, not the sticker cost.

Also generalized `BASE_DRAFT_FACID` from a hardcoded `{moon,mars}` literal to being derived from
`FACILITY_DEFS`, with `baseDraftBody()`/`setBaseDraftBody()` validating against the derived list — so a
future surface body needs only its `FACILITY_DEFS` entry.

**Io deliberately excluded.** Volcanism is a structural-risk problem (episodic damage), not a
sustained-cost one; bolting it onto a hazard system designed around ongoing cost would either
trivialise it or make it arbitrary. Left as a future item with its own mechanic.

New `tests/test-outer-bases.js` (72/72). Full suite clean; build parity clean.

**Balance figures for playtest — these are the first hazard numbers, with no precedent to calibrate
against.** Sustained monthly economics for a 3-module base: Mars net +3.14/mo (sci 17.4), Callisto
+1.60 (sci 22.7), Titan +0.15 (sci 22.6, fuel 1.40). Outer bases are deliberately science/fuel plays
rather than income plays, and Titan sits right at break-even — a single `isru_supply_shock` crisis
(−35% facility output, added in B4) would push it negative. That may be good drama or may be too
tight; it is the item in this slice most likely to need retuning after actual play.

## Session — Tier 2 C6: era-gated research, option (b) (2026-08-04)

Shamus chose option (b) — era-gate research, leave missions ungated — from the three C6 options. It
was the compromise neither critic objected to: a player who falls behind never has *fewer* things to
do (the Ranger's objection to hard-gating missions), but the tech tree stops being a pure
capital-and-science race, so you cannot out-spend the calendar.

`eraMin` added to all 98 `RESEARCH` nodes. `researchNodeState()` gains a distinct `'era'` state,
checked *before* `reqsMet` so an era-gated node reads as era-gated even when its prereqs are complete —
"not invented yet" and "you haven't earned it yet" imply completely different player actions and must
not look identical. UI copy, node palette tint and the status tag all distinguish the two.

Enforced at BOTH purchase paths. `buyResearch()` was the obvious one; `tryStartQueuedResearch()` was
the one that mattered, because it calls `startResearchProject()` directly and would have been a silent
bypass letting any queued node auto-start regardless of era. A queued era-gated pick is retained
rather than cleared, matching how the existing not-yet-affordable case behaves, so it fires when the
era arrives.

**The approved method was generated and then discarded.** The plan (agreed with Shamus before starting)
was track-baseline + prereq-depth offset — 14 reviewable decisions instead of 98. Generated it, and it
was unusable: `lunar_lander`, `mars_traj`, `precision_edl` and `rad_shielding` all landed in era 7
(2100+), `parachute_recovery` in era 4. That would have made Mars landings impossible until the
Speculative era and gated Mercury-era parachute recovery to the year 2000. The clearest failure:
`orbital_depot` at era 6 while gating `tanker_leo` at **minRep 38**, a near-start mission. Depth-from-
root turns out to measure position within a track's own arc, not position in history, and the two
diverge badly for tracks whose roots are late (deepspace, nuclear, automation) or early (reuse).

All 98 were hand-assigned instead, anchored to real spaceflight history, then validated
programmatically against two hard constraints: every mission's `reqResearch` must remain reachable,
and no node may be gated later than its own prerequisites. The second check caught two genuine
inversions — `deep_space`(1) before `digital_computer`(2), and `deep_throttling`(2) before
`methane_propulsion`(4) — both resolved in favour of the tree's own structure rather than my
historical instinct, since an unreachable branch is worse than a slightly-late one.

Resulting curve: 9/98 era-open at 1942, 21 by 1957, 43 by 1961, 62 by 1975, 80 by 2000, 89 by 2030,
96 by 2060, 98 by 2100. Six nodes available at game start spanning multiple tracks and including an
engine unlock — a real opening choice, not a forced line, and no softlock risk.

**Three pre-existing fixtures broke, all correctly.** `test-afford-estimate.js` and
`test-research-goal.js` both assumed "prereqs met ⇒ available", which C6(b) makes false by design.
Both advanced to an era that opens their nodes so they test their actual subject rather than the era
gate. New `tests/test-research-era-gate.js` (25/25) covers the three things that would be disastrous
if wrong: the game is playable at turn one, no node precedes its prereqs, and no mission is stranded
behind late research — plus both enforcement paths and the era/locked distinction.

One test-authoring note: the first draft of the "queued node starts once its era arrives" check failed
against correct code, because `reqsMet()` also tests `reqMissionDone` and the fixture satisfied only
`req`, leaving it returning `undefined`. A fixture-sanity assertion now pins `reqsMet(late)===true`
before the real assertion runs.

Full suite clean. Build parity clean.

## Session — Tier 3.1: the missing uiLayerBtn header control, built (2026-08-04)

`applyUiLayer()` (`render.js`) had been calling `$('uiLayerBtn')` and no-oping via `if(b)` on every
single render, because `uiLayerBtn` never existed in `src/shell.html`. Added it to the header, next to
the existing Settings button, wired to a new `cycleUiLayer()` helper (basic→advanced→expert→basic,
wrapping) that calls the same `setUiLayer()` the Settings picker's three buttons already call — one
source of truth, so the header control and the picker cannot disagree.

`applyUiLayer()` also gained a `title=` naming both the current layer and what the next click does
(the Tier 0.3 convention), computed fresh on every render rather than baked into the static HTML, so
it stays correct across every cycle rather than only being right once.

**Found and fixed a real documentation bug before starting.** This item's three checklist items were
already marked `[x]` in ROADMAP.md despite the button genuinely not existing — `git log -S` confirms
this was wrong from the very commit that first scoped Tier 3, not a later accidental flip during a
"mark shipped" pass. Reverted to `[ ]` before doing the actual work, so the doc reflected reality
during the build rather than claiming completion for code that didn't exist.

New `tests/test-ui-layer-button.js` (19/19): the button resolves on a real render (the original bug —
it did not); text and title update live across every cycle, not just on first paint; the cycle order
and its wrap; and explicit protected-baseline checks that `setUiLayer()`'s validation, the
Settings-picker call path, and the advanced default for a save with no `uiLayer` field are all
untouched — the header control is additive, not a replacement for anything that existed before it.

Full suite clean. Build parity clean. Smallest slice of the session; per its own sequencing note this
was intentionally done first and alone, since it makes the rest of Tier 3 (specifically 3.4) worth
doing at all — nobody could reach Basic or Expert mode before this.

## Session — Tier 3.2: persistent history archive (state.annals) (2026-08-04)

The live log (`log()`, `sim.js`) caps at 40 entries and unshifts newest-first — a scrolling console,
not a record. Over ~1,900 monthly ticks it forgets everything; a single Mars transfer can push its own
launch out of history before arrival. Added a separate permanent archive of significant events only.

Two corrections were needed before any code:
1. Same checklist mislabel as 3.1 — this entry's boxes were `[x]` from the initial Tier 3 scoping
   despite nothing being built. Reverted to `[ ]` first.
2. The entry proposed `state.history` for the archive, but `state.history` already exists as a
   `{missionId: year}` map driving the Home timeline. Using it as an array would have corrupted that.
   Renamed the archive to **`state.annals`**.

`appendAnnal(kind, summary)` sits beside `log()` and is deliberately NOT a modification of it — the
protected baseline requires `log()`'s 4-arg signature stay intact, so the archive is a separate
function significant sites call explicitly rather than a 5th positional arg or a flag threaded through
179 call sites. Entries are compact (date, numeric year, kind, one-line summary — no nav, no detail),
stored oldest-first, ring-buffer capped at 1200 (a full campaign produces a few hundred significant
events, so the cap is headroom, not a live constraint).

Eight significant-event sites wired: flight success (tanker + general), flight failure (crew-safe +
full loss), crisis trigger, crisis resolution (mitigated + endured, distinct summaries), facility
founded, and research completed. Routine `log()` chatter deliberately does not record — the
significance predicate is "the caller chose to call appendAnnal", decided per-site, not mirrored from
every log line.

Surfaced in the Chronicle (`chronicleAnnalsHTML()`), grouped by era newest-first, below the existing
milestones board — milestones answer "what was historic", annals answer "what did the agency actually
do". The section omits itself entirely when the archive is empty, so an existing save (which starts
empty by design) sees no change until it accumulates history. `SAVE_VERSION` 59→60; additive, lazy
default via `state.annals||[]` at both the append and render sites, no migration, no retroactive
reconstruction.

New `tests/test-annals-archive.js` (28/28), including explicit protected-baseline checks that the live
log's cap, order and signature are untouched, and that a save with no annals field loads and records
forward without error. One test-authoring slip caught in the run: the first draft called a
`triggerCrisis()` function that doesn't exist (triggering is inlined in `tickCrisisTrigger()`); fixed
to set the crisis state the way the real code does.

3.5 (log text search) depends on this — searching a 40-entry live strip is near-pointless, searching
the archive is a real feature. Full suite clean; build parity clean.

---

# Archived from ROADMAP.md on 2026-08-12

Second archival pass (the first was the 2026-07-28 split that created this file).
`ROADMAP.md` had grown back to 210KB, which every session pays for up front since it
is read at session start. The 21 sections below were verified complete before moving --
each was checked against the codebase, not just its own header -- and none contained an
open `[ ]` item. Sections still holding open work stayed in `ROADMAP.md`, including E3
(shipped but BENCH_V2 still flagged OFF pending a browser playtest), Solar Map SM6,
#118 seeded RNG, and Tiers 0-3.

Entries keep their original text and relative order.

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

---

# Archived from CLAUDE.md History on 2026-08-12

`CLAUDE.md` is read at session start by both agents, so its size is a per-session cost.
Its History zone had stopped being appended to after 2026-07-26 -- weeks of subsequent work
(Tiers 0-3, the Codex bankruptcy pull, Gates 0-6) went into ROADMAP-HISTORY.md and the STATUS
block instead, leaving this zone as a frozen, fully-superseded record. All 24 entries below
(2026-07-20 through 2026-07-26) are moved here verbatim and in their original order.

The durable lessons from these entries were NOT discarded -- they were promoted into the
rewritten STATUS block in CLAUDE.md as standing RULES, which is where an agent will actually
read them. Come here for the full detail behind a specific 2026-07 slice.


# Claude collaboration handoff

`main` is the shared integration branch for Codex and Claude. Before editing, pull/rebase
against `origin/main`; after a coherent, verified slice, commit and push to `main`.

## Current E4 status

- E4.4 shipped: `state.hulls` provides persistent, serial-numbered physical launch-vehicle
  records. Rollout, launch, loss/expending, recovery, reuse count, save migration, and Fleet
  Registry visibility are implemented. The physical trajectory is frozen per vehicle from its
  thrust, mass, propellant, Isp, and drag inputs.
- E4.5 shipped: deferred interplanetary hulls appear as clickable 3D Solar System markers on
  true two-body transfer arcs. The shared marker path is `flightTargetBody`, `flightScenePos`,
  `activeShipMarkers`, and `map3dUpdateShipMarkers`; it is explicitly mission-progress
  visualization, not fabricated live orbital telemetry. Test: `tests/test-flight-markers.js`.
- E4.7 has been extended: successful cislunar missions stay in Three.js through a dedicated
  Earth–Moon transfer presentation instead of handing off to the legacy 2D canvas. Pad/ascent,
  suborbital splashdown, Earth orbit, cislunar transfer, and crewed Earth reentry are already
  rendered through the Flight 3D adapter.

## Current UI / flight-report pass (Codex)

- The Command Center now follows the framed-monitor composition: responsive side rails, clear
  central Cape viewport, and one readable bottom scene-navigation row. The Earth pop-out uses
  the same packaged equirectangular day-map as the Solar Map, with the correct longitude origin
  for the Cape marker.
- Vehicle, Station, Solar System, Earth, Command Center, and Contracts pop-outs are desktop
  windows: drag their top bar, resize from the lower-right grip, or pin them to keep working in
  the underlying game. Their existing close controls remain at the top.
- Flight reports are data-backed by `flightReport()`: the bench shows a pre-flight card; the
  launch overlay has an always-visible Flight Card; completion/failure holds a Flight Debrief
  with payload, mass, Δv/TWR, duration, distance, outcome, and any recorded failed subsystem.
  Do not replace these values with animation-derived estimates.

## Visual multi-stage separation — SHIPPED (Claude), core mechanism visually validated

Done. `cape3dTrajectoryPlan` now records `stageEvents[]` (booster-jettison and spent-stage-drop
times, positions, and velocities — real values from the burn integration it already ran; they were
previously discarded). Pure query `cape3dSeparationStates(plan, time)` maps the current flight time
to which pieces have separated and how long each has been falling. `cape3dVehicleMesh` is now built
as per-stage sub-groups (`userData.stageGroups`, `userData.boosterGroup`) with byte-identical visual
output; `cape3dResetStaging(rocket)` reattaches them before each flight since the mesh is built once
and reused. `cape3dUpdateLaunchPresentation` detaches each piece at its real separation time via
`root.attach()` (world-transform-preserving, so no jump across the rocket's pitch) and drifts it
under real free fall (scene is 1:1 metres, reuses `G0`); the flame FX moves to the new bottom
stage's base on a core separation so the next stage visibly ignites. Sim and outcome logic untouched.

**Update (2026-07-20):** since the sandbox has no WebGL, a standalone offline preview
(`staging-preview.html`, not committed to the repo — a scratch tuning tool) was built that pastes
`cape3dTrajectoryPlan`/`cape3dSeparationStates` in **verbatim** from `build/game.js` and runs a
faithful copy of the detach/free-fall logic against four synthetic vehicles (two-stage, three-stage,
boosters+2-stage, single-stage control). The repo owner reviewed it directly and confirmed the
separation timing and ballistic fall/tumble read correctly — boosters drop before the core stage,
pieces coast away under gravity rather than popping, trajectory trails visibly diverge. **This
confirms the underlying math and detach/fall logic are sound**, which was the main open risk.

What it does NOT confirm: the ACTUAL in-game Cape 3D scene — real camera behavior (pulls back with
altitude on its own schedule, unverified), real vehicle art/livery, and — importantly — **mesh
reuse across a second launch in the real game session** (the preview rebuilds a fresh rocket per
vehicle-button click, so it never exercised `cape3dResetStaging`'s actual job of un-doing a prior
flight's separations). A real-browser playtest in the actual game should still confirm: the camera
frames a separation sensibly at real Cape distances, and a second launch after a first shows a
complete, correctly-reset rocket.

Headless coverage unchanged: `tests/test-flight3d-staging.js`, 29 checks (stageEvents recording for
1/2/3-stage and boosters+stages vehicles, ordering, separation-state time mapping/edge cases).

## Deep (in-space) failure stays in 3D — SHIPPED (Claude)

A strand/loss that happens AFTER reaching orbit or cislunar cruise (`success===false`,
`failPhase==='deep'` — e.g. life-support/propulsion loss in space) used to cut to the flat 2D
fallback at the flight's most dramatic beat, because `updateFlight3DSession` gated `orbit` on
`success!==false`. Now it stays in the Three.js renderer: the orbit/transfer presentation freezes
the craft at the loss fraction (0.42, matching the 2D renderer's freeze point) and tumbles it
dead-and-dark (`deadStick`), engine cut, with the readout showing `SPACECRAFT LOST`.

Mechanism mirrors the existing ascent-failure path: `flight3dPresentationSnapshot` now emits
`effects.deepFailure` / `deepFailureFrac` / `deepFailureProgress` (armed only for `orbit`/`transfer`
phases past the freeze fraction) and passes `failPhase` through. `cape3dOrbitProfile` /
`cape3dTransferProfile` freeze `progress` and cut `burn`/`arrival` when dead-stick, exposing
`deadStick` + `failProgress`; the two presentations apply a building tumble. The gate in
`updateFlight3DSession` was loosened to keep `orbit` in 3D for a deep fail (`transfer` was already
unconditionally in 3D but had no failure visual before this). Sim/outcome logic untouched — this is
presentation only; the outcome was resolved by the sim long before the animation opened.

Test: `tests/test-flight3d-deepfail.js` (26 checks — the signal arms only for a deep fail past the
freeze fraction, never on success or an ascent fail; orbit + transfer profiles freeze/dead-stick
identically; a successful flight still runs full progress and reaches arrival). NOT browser-verified
(no WebGL here) — the tumble render should be eyeballed in a real failed-orbital-insertion flight.

NOTE — a related gap found while scoping, NOT fixed here: a crewed **cislunar** mission gets **no
reentry leg at all** (`flightHasReentry` requires `isOrbital`, which cislunar isn't), so a Moon
mission's Earth return currently isn't animated — the flight ends after the transfer with a
post-flight card. That's missing content (a new mission leg), not a gating fix; logged as the next
Flight-3D-coverage candidate.

## Crewed cislunar returns get a reentry leg — SHIPPED (Claude)

`flightHasReentry` now allows `isCislunar` (not just `isOrbital`), so a crewed successful Moon
mission gets the same 6.4s reentry leg an orbital crewed flight does — previously its Earth return
was never animated (flight ended after the transfer). The reentry presentation is already
progress-only (no isOrbital dependency), so no new renderer was needed; `drawScene`'s `entering`
check already fires for cislunar once past the cruise. The `updateFlight3DSession` reentry gate was
widened to `(isOrbital||isCislunar)`. Uncrewed/failed cislunar correctly get no reentry.
Test: `tests/test-flight3d-cislunar-reentry.js` (8 checks). NOT browser-verified.

## Booster/stage separation polish — SHIPPED (Claude)

Two additions on the E4.7 staging base: (1) a brief expanding additive puff at the interstage when
a piece detaches (`cape3dSepPuffPool`/`cape3dSpawnSepPuff`/`cape3dTickSepPuffs`, a 4-sprite reused
pool, spawned at the detach point, expands+fades over 900ms); (2) a transient flight-readout beat —
`flightSeparationBeat(snapshot)` finds the most-recent staging event within 3.2s of the current
flight time and returns `BOOSTER SEP` / `STAGE N SEP` (1-indexed) with a 1→0 fade, surfaced in the
`flightAltitude` readout. Reuses the real `stageEvents` — no new timing. Sim untouched.
Test: `tests/test-flight3d-sepbeat.js` (10 checks). Puff is Three.js (not headless-testable); beat
label/timing is. NOT browser-verified — eyeball a multi-stage launch.

## Vehicle bench height/diameter scale readout — SHIPPED (Claude)

New `vehicleRealDimensions(spec)` (flight.js): honest metres-based estimate distinct from
`buildVehicleShape`'s `h` (a deliberately-compressed rendering unit). Tank length = propellant
volume ÷ cross-section (~1.0 t/m³ representative density) + 15% structure margin; diameter is the
real `dia` value already used by drag. Surfaced as a "📏 Vehicle scale" flag line in both bench
readouts (`renderReadout`/`renderProfileReadout`) — total height, max diameter, per-stage heights.
Test: `tests/test-vehicle-dimensions.js` (12 checks, pure). This also answers the earlier "does the
mesh reflect the bench design" question — it does (prop/dia-driven), just wasn't legible before.

## Flight playback speed range widened — SHIPPED (Claude)

`ANIM_SPEEDS` (shell.js) already existed and applies to every flight overlay screen (2D and 3D
alike — the button sits outside `flightCanvasWrap`) but only offered 0.5/1/2x. Widened to
0.1x/0.25x/1x/2x/5x/10x/25x/50x — sub-fps slow-mo for watching a separation closely, up to 50x for
skipping through a long cislunar cruise without a hard cut. Default stays 1x (index fixed to point
at the 1x entry so behavior is unchanged unless the player cycles). Fixed a stale static button
label ("1× Slow" → "1× Normal") found in the process. Cycle via the existing button or [Enter].
Test: `tests/test-anim-speed.js` (9 checks, pure).

## Launch camera distance bug + Earth-curvature reveal — SHIPPED (Claude)

Root-caused all three player-reported issues (far camera even at zoom, "no ship, just plume" after
a booster/stage sep, panning shows the flat launch-site square not an expanding Earth):

1. **Camera distance bug (mine, from the prior camera slice):** `baseDist` scaled linearly with
   raw ALTITUDE IN METRES (`150+altitudeM*.05`) — exploded to 5000+ units by 100 km and 15000+ by a
   realistic ~300 km insertion, far beyond what the .35–3.2x zoom range could pull back. This is
   the dominant explanation for "far even with zoom," and very likely for "no ship, just plume"
   too (a small/distant mesh reads as invisible against a bright additive flame). Fixed:
   `cape3dLaunchChaseDist(altitude)` now uses sqrt(km), capped at 620 units — extracted as a
   standalone pure function so the "never runs away" property is directly tested.
2. **Earth-curvature reveal was fully built but force-disabled.** `cape3dAscentBlend` already
   computed the right `space`/`capeVisible` curve; the update function hardcoded opacity to 0 and
   the flat site plane to always-visible, with a comment noting a past bright-flash bug from the
   Earth texture loading async. Re-wired to actually use the blend curve, gated on
   `earth.material.map.image` being truthy (real decoded image data) so opacity can't rise before
   there's something real to show — the same flash risk, closed properly instead of left disabled.

Test: `tests/test-launch-camera.js` (11 checks — distance boundedness/monotonicity, blend curve
shape). NOT browser-verified (no WebGL here) — this is exactly the kind of thing worth a look.

## Launch view: real fixes for "no ship after sep" + "pad/Earth mixed" — SHIPPED (Claude)

The prior camera-distance fix wasn't the actual cause of "no rocket, just a plume." Root-caused
both remaining reports with a headless scene-graph inspection (a minimal THREE stub in
`/tmp/three_stub.js`, not committed) confirming the mesh itself was fine — the bug was elsewhere:

1. **"No rocket, just plume" after separation:** the camera/flame target used `rocket.position+55`
   — a FIXED offset assuming stage 0's original span (baseY 0..totalHeight) for the whole flight.
   Once stage 0 separates and leaves, the remaining stack's actual base is wherever the NEXT
   still-attached stage starts (confirmed via the stub: e.g. baseY jumps from 0 to 20.9 on a
   2-stage vehicle) — but the camera kept aiming at the now-empty space stage 0 vacated. Only the
   flame (which DOES correctly reanchor) was in frame. New `cape3dLiveStageSpan(stageGroups,rocket)`
   — pure, scans which stage groups are still parented to the rocket, returns the REAL current span
   — re-centers both camera target and (implicitly, since it shares the target) framing on whatever
   remains.
2. **"Earth/pad mixed, no smooth transition":** `cape3dAscentBlend`'s `space` (Earth opacity) and
   `capeVisible` (flat launch-site ground) were on two different clocks — `space` reaches full
   opacity at progress 0.62, but `capeVisible` stayed true until 0.72. A real 0.10-progress window
   had the fully-opaque Earth sphere AND the fully-visible flat pad ground rendering
   simultaneously, then the ground popped off in one frame. Aligned `capeVisible` to cut off at the
   exact point `space` saturates — verified with an exhaustive scan (no progress value has both
   ≥full-opacity Earth and a visible site).

Test: `tests/test-launch-camera.js` now 24 checks (was 11) — added live-span recentring (mock
stage-group objects, no THREE needed) and the exhaustive no-overlap-window scan. NOT
browser-verified (no WebGL here) — this is exactly the category of thing worth confirming visually.

## Two stale test drifts fixed — SHIPPED (Claude)

Confirmed both were the SAME intentional Codex behavior ("Refine command UI and flight reporting"):
a failure (ascent-fail directly, or abort→scrub) now correctly HOLDS on a post-failure debrief card
(`held:true, exploding:true`) instead of the old behavior — a real UX improvement, not a
regression. Verified directly by pumping each to completion and inspecting the final animState.
Updated both tests' assertions to verify the new correct behavior rather than the stale one.
`test-decision-panel.js` 35/35, `test-pad-a.js` 36/36. Only `test-flight3d-trajectory.js` (Codex's
accepted physics changes, unrelated) remains as a known drift.

## BACKLOG #40: crew survival mini-arc (escape-save visual) — SHIPPED (Claude)

Investigated first: the `launch_escape` tech and its outcome-level branch (crewed ascent failure
becomes `kind:'abort'` — crew survives — instead of the crew-death path) ALREADY existed, complete
with UI warnings and flavor text. The real gap: the 3D failure VISUAL couldn't tell an escape-tower
save apart from a full catastrophe — both set `success=false/failPhase='ascent'`, so the same
explosion (and "VEHICLE LOSS" text) played either way, undercutting the "the escape system pulled
the crew clear" story line.

Fix reuses the existing failure-debrief system rather than building new geometry: the top stage
group (holding the nose/capsule) is already cloned as one discrete debris "piece"; tagged as the
escape-pod candidate at build time. On a real escape save (`spec.crewEscaped`, derived from
`outcome.kind==='abort'`, threaded spec→snapshot→effects), that piece gets a distinct fast,
mostly-upward clear-away velocity + its own brief abort-motor flash and a much slower fade, instead
of joining the generic radial debris spread every other piece gets. Readout shows "LAUNCH ESCAPE —
CREW CLEAR" instead of "VEHICLE LOSS".

Test: `tests/test-crew-escape.js` (12 checks — signal only fires for a real crewed/abort-kind/
ascent-phase save, never premature, never for uncrewed or a genuine loss; readout text). The pod
clear-away render itself isn't headless-testable (no WebGL) — every value driving it is. BACKLOG.md
#40 marked shipped.

## Tech-tree audit + fixed 2 dead capstone nodes — SHIPPED (Claude)

Ran a full structural audit of the 110-node tree (cost/depth pacing, effect-type distribution,
prereq depth, dead-end analysis). Verdict: strong core — cost scales cleanly with depth (2.8→18
avg), reliability hard-capped so the 28 reliability nodes can't trivialize risk — but ~20% filler,
concentrated in tiny passive stat nodes, and TWO genuinely dead nodes found: `megastructure_construction`
(cost 18, the single most expensive node) and `atmospheric_isru` (cost 10) both had `effect:{}` and
ZERO references anywhere else — researching them did literally nothing (worst-feel outcome for a
capstone). Wired both to real, cap-bounded effects matching their descriptions: megastructure →
buildCostCut 0.10 + buildTimeCut 1.5 (civilization-scale production economy); atmospheric_isru →
launchCostCut 0.08 (deep-space propellant relieves outer-system launch cost). Both flow through the
existing `dimCurve` soft-knee caps, so they're felt but can't unbalance. Test:
`tests/test-tech-capstones.js` (13 checks).

The larger audit finding (NOT done here, logged for a future balance pass): ~35 nodes are
+0.02-type passive stat-shavers (32% of the tree), individually imperceptible; and 36 nodes are
dead-end leaves. A tightening pass merging stat clusters (esp. the 6-node guidance reliability
chain) → ~85 punchier nodes would make each research choice matter more. Scope separately — it's a
real balance pass, not a fix.

## Tech-tree design pass — SLICE 1 (guidance) SHIPPED (Claude)

First slice of the tree-tightening balance pass (option 1: real merges, no back-compat constraint —
owner confirmed). Guidance reliability chain collapsed 6→3: radio_guidance + inertial_nav + digital_computer
→ one `digital_computer` ("Onboard Guidance & Flight Computer", req:[], reliability 0.07); star_trackers +
autonomous_navigation → one `autonomous_navigation` (req:digital_computer, reliability 0.06);
quantum_navigation kept as the deep-tail capstone. Preserved the two LOAD-BEARING ids other systems
reference (digital_computer gates deep_space/flight_automation + has a leveled sim.js variant;
autonomous_navigation feeds the autonomous_landing synergy) and the EXACT 0.15 reliability total — no
stealth buff/nerf, just fewer/punchier nodes. Removed ids (radio_guidance, inertial_nav, star_trackers)
have zero remaining references anywhere. Test: `tests/test-tech-guidance-merge.js` (18 checks).

**Pattern proven — repeat for the other clusters when ready** (each its own slice): testing (9→~4-5),
structures (7 sigma→~4), propulsion combustion sub-chain (combustion_stability→turbopump→regen→chamber,
4→~2). Same recipe: keep any id referenced externally (grep first), collapse the rest, preserve the
effect total, rewire prereqs through survivors, test for dangling reqs.

## Next task

## Flight 3D: physical Earth handoff + orbital operations — SHIPPED (Codex)

This pass turns the Flight 3D Earth-orbit segment into an interactive Mission Control sequence.
Earth-orbit flights now pause at insertion and expose four authoritative maneuver outcomes:
planned circularization, a reserve-margin-gated orbit raise, a reserve-margin-gated orbit lower,
or deorbit/recovery. The selected plan threads through settlement (payout/rep/outcome), the 3D
orbit plane, and the new Mission Control telemetry card (apoapsis, periapsis, inclination,
velocity, remaining maneuver Δv). Orbit camera drag/zoom remains enabled instead of being detached.

The launch side now uses named, event-driven camera shots (pad, tower clear, ascent, actual
booster/stage separation, insertion) and a decimated guide derived from the real integrated
trajectory plus real staging markers. Camera offsets stay player-adjustable. Default playback is
now **0.1× Slow-mo**; the existing control still cycles through 50× for coasts.

**Important visual correction:** the ascent Earth is now physically scaled (Earth mean radius
6,371 km) and permanently anchored below the pad. Its handoff is based on physical altitude rather
than animation progress: globe begins at ~28 km and completes around 96 km; camera far distance is
the real geometric horizon plus margin. The old texture guard left only a pale atmosphere shell
while a map decoded, so the Earth mesh now renders immediately with a dark-blue fallback, then
attaches the photo texture when ready. Atmosphere opacity is deliberately very low (4.5% of the
blend) to avoid masking the surface.

Files: `src/sim.js` (maneuver outcomes), `src/flight.js` (pause/HUD), `src/render.js` (orbit,
trajectory, camera, physical Earth), `src/shell.js` + `src/shell.html` (speed/HUD/responsive CSS).
Generated: `build/game.js`, `index.html`, `orbital-ventures.html`. Tests added/extended:
`tests/test-orbital-maneuvers.js`, `tests/test-launch-camera.js`, `tests/test-anim-speed.js`.

Validated after the final fallback-Earth fix: launch camera 37/37; orbital maneuvers 14/14;
flight-3D foundation 58/58; deep-failure 26/26; cislunar reentry 8/8; staging 29/29;
separation beat 10/10; regression 18/18; build parity and `git diff --check` clean.

**Claude browser follow-up:** visually fly an orbital mission and inspect the 28–96 km Earth
handoff now that the fallback globe cannot disappear. If the real horizon still needs art tuning,
change only the constants in `cape3dPhysicalAscentBlend`, the physical-Earth material, or the
camera director—do not return to a camera-relative globe. Plane changes are deliberately next;
rendezvous/docking follows after that.

Suggested (open — pick per priority):
OR pick up remaining **E4.7** scope (fold any remaining legacy 2D-canvas flight paths into the
Flight 3D adapter). Coordinate on which. If continuing staging: the detached-debris drift is
deliberately simple ballistic (no re-contact, no atmospheric tumble model) and debris is culled
3000 m below the pad — a polish pass could add a small separation flash/puff at the interstage and
a one-line "Stage 1 separation" beat on the always-visible Flight Card. Keep sim/outcome untouched.

The core separation math/logic is now visually confirmed sound (see above) — the one remaining
staging risk worth a quick real-browser check before further polish: fly two launches back-to-back
in one session and confirm the second rocket is fully intact (mesh reuse + `cape3dResetStaging`
was never exercised by the offline preview, only by the pure identity logic in code).

Two pre-existing test drifts to be aware of (NOT from the staging work — verified against a clean
pre-edit pull): `test-flight3d-trajectory.js` (Codex's accepted trajectory/vehicle-physics changes)
and, newer, `test-decision-panel.js` + `test-pad-a.js` (from the "Refine command UI and flight
reporting" commit — look like an intentional post-failure hold/debrief screen). Confirm intent and
refresh those assertions when convenient.

## Verification

```bash
node build.js
node tests/test-build-parity.js
```

Additional focused checks for this pass:

```bash
node tests/test-command-hero-layout.js
```

Focused harness commands use `tests/harness.js + build/game.js + test file`, e.g.:

```bash
node -e "const F=require('fs'); const a=F.readFileSync('tests/harness.js','utf8'), b=F.readFileSync('build/game.js','utf8'), c=F.readFileSync('tests/test-flight3d-foundation.js','utf8'); require('vm').runInThisContext(a+'\n'+b+'\n'+c);"
```

Also run `git diff --check`. Generated files are `build/game.js`, `index.html`, and
`orbital-ventures.html`; edit `src/` and run `node build.js`, never edit the generated HTML.

## Tech-tree design pass — complete, 4 slices (Claude, 2026-07-20/21)

Note for Codex (or whoever touches `RESEARCH` in `src/data.js` next): a 4-slice tree-tightening
pass just landed on `main`, triggered by a 2026-07-20 audit that found two dead capstone nodes
(fixed same session) plus ~35 individually-imperceptible passive stat-shaver nodes. Full detail
and per-slice reasoning is in `ROADMAP.md` — search "tech-tree design pass" for all 4 entries — but
the load-bearing summary is:

- `RESEARCH` is now **98 nodes**, down from 110. 12 ids were removed and folded into surviving
  nodes; 0 orphaned, 0 dangling reqs, 0 unreachable (verified by a full-tree BFS reachability proof
  after the last slice).
- **Removed ids** — do not reference these, they no longer exist: `radio_guidance`, `inertial_nav`,
  `star_trackers` (guidance); `flight_telemetry`, `vibration_testing`, `accelerated_life_testing`,
  `digital_twin`, `autonomous_qa`, `stage_test` (testing); `composite_structures`,
  `friction_stir_welding`, `carbon_cryotanks`, `self_healing_materials`, `metamaterial_structures`
  (structures); `combustion_stability`, `regen_cooling` (propulsion combustion chain).
- **Two reqs were re-pointed** onto merge survivors, not just internal chain links: `sustainer`
  now reqs `turbopump` (was `combustion_stability`); `methane_propulsion` now reqs
  `chamber_pressure` (was `regen_cooling`). This is a real gating-depth change for those two nodes,
  not just a rename — flagged explicitly in the slice-4 ROADMAP entry and in
  `tests/test-tech-combustion-merge.js`.
- No save-compat shim exists for any of this (owner waived back-compat for the whole pass). A save
  with a completed removed-id flag just carries a harmless dead key — `curRel()`/`curSigma()`/
  `researchEffectSum()` all iterate the live `RESEARCH` array, not raw `state.research` keys, so
  stale flags are inert, not broken. If you add a save-compat layer later, these are the ids to map.
- Every merge slice has its own dedicated test file (`test-tech-guidance-merge.js`,
  `test-tech-testing-merge.js`, `test-tech-structures-merge.js`, `test-tech-combustion-merge.js`) —
  run these first if you're debugging anything tech-tree-adjacent, before assuming a regression is
  new.
- This pass is considered CLOSED — no more clusters are queued. If you're picking up the remaining
  scattered +0.02-type stat-shavers flagged by the 2026-07-20 audit, note they don't form clean
  linear chains like the 4 tackled here, so the same "collapse a chain" recipe won't directly apply.

## Consolidation pass (Claude, 2026-07-22) — repo verified in a single healthy state

Pulled fresh at HEAD `7d6d0df` (Codex's "Palette Population PP.3") and reconciled against my last
push (`c62b3a6`, guidance tech-tree slice 1). Summary for whoever picks this up next:

**Everything since `c62b3a6` is sound and cleanly integrated — no conflicts found.** Checked
specifically because several commits touched files I'd been working in:

- **Tech-tree design pass**: Codex picked up the recipe from my slice-1 entry and completed slices
  2–4 (testing 9→5, structures 7→4, combustion 4→2) — the whole pass is now closed at 98 nodes (was
  110). Their handoff note above is thorough; nothing to add.
- **Camera director** (`cape3dLaunchCameraProfile`): a new named-shot system (PAD TRACKER, TOWER
  CLEAR, ASCENT TRACK, INSERTION TRACK, reactive SEPARATION shots) that layers `distMul`/`az`/`el`
  offsets on top of — not instead of — my `cape3dLaunchChaseDist` (sqrt-altitude base distance) and
  the player's manual drag/zoom (`cape3d.launchCam`). Verified the actual call site combines all
  three correctly. Clean extension.
- **`cape3dPhysicalAscentBlend`** supersedes my `cape3dAscentBlend` (progress-driven) with an
  altitude-driven Earth-reveal — a genuine correctness improvement I hadn't caught: tying the
  reveal to playback progress meant a fast, powerful vehicle would "reach space" at the same
  progress % as a slow climber regardless of real altitude. Altitude-driven is right. My old
  function is now dead code (harmless, unused) — not cleaned up, matching the pure-append/no-
  destructive-edit convention; flagging for whoever wants to prune it.
- **0.1× default playback speed**: confirmed intentional with the owner (was going to flag as a
  likely regression — it isn't). Not reverting.
- **Palette Population (PP.0/PP.1/PP.3)**: entirely self-contained in `src/parts.js` + new tests.
  Zero overlap with anything I or the mission-control pass touched.

**Stale note correction:** an earlier note here said `test-decision-panel.js` + `test-pad-a.js`
needed their assertions "refreshed when convenient" for an intentional post-failure hold screen.
That was already done (commit `2ee7888`, 2026-07-20) — and `test-pad-a.js` was independently
re-touched again by the mission-control commit for the new 0.1× default. Both are current and
passing. Disregard that note going forward.

**Full regression, clean pull, rebuilt from scratch:** 95 suites. Only `test-flight3d-trajectory.js`
fails — the same single pre-existing drift flagged for weeks (Codex's own accepted
trajectory/vehicle-physics changes). Build parity clean, `git diff --check` clean. No code changes
were needed this pass — this is a documentation/verification consolidation only.

**On Codex's direct ask** ("Claude browser follow-up: visually fly an orbital mission and inspect
the 28–96 km Earth handoff"): still can't — this sandbox has no WebGL/display, unchanged limitation.
Passing that ask through to the repo owner, who does have a browser.

**Respecting Codex's stated next direction** (plane changes, then rendezvous/docking) — not
proposing a competing next task here.

## BACKLOG #37: Max-Q structural check vs. fairing choice — SHIPPED (Claude)

"Max-Q" was a cosmetic 2D-canvas approximation (`35 + reqDv*0.003`) with zero gameplay weight; the
fairing choice was a flat, trajectory-blind reliability delta ("No fairing" always −2%, regardless
of how brutal the ascent actually was). Wired them together for real:

- `cape3dTrajectoryPlan` now exposes real per-point dynamic pressure (`qKpa`, from the same ρ/v² the
  drag term already computes) and a `maxQKpa` peak — reflecting THIS vehicle's actual diameter,
  mass, thrust, and gravity-turn shape, not a reqDv formula.
- New `vehicleMaxQ(m, vehicle)` / `structuralLoadAssessment(m, v, crewed)` (sim.js): the real peak
  Max-Q combined with fairing sensitivity (none=1.6×, standard=1.0×, heavy=0.65×; crewed=neutral,
  no fairing choice) into a bounded weight multiplier (0.6–2.4×) and a qualitative band
  (Low/Nominal/High/Severe).
- Modulates the `structures` fragility weight in `subsystemFragilities` — **attribution only**. The
  `subsystemReport` renormalization (`rel_i = R^(weight_i/ΣW)`) guarantees `∏rel_i = R` exactly
  regardless of weights, so aggregate mission difficulty is provably unchanged — verified directly
  in the test (exact equality, not approximate). A no-fairing vehicle flying an aggressive ascent
  just gets blamed for structural failures far more often, instead of an arbitrary flat penalty.
- Surfaced as a "🛡 Structural load" bench flag (both readouts) with a plain-language note
  ("no fairing on this high-Q ascent; fit one to cut structural-failure risk") so the player can see
  *why* before a failure teaches them, matching the "Vehicle scale" readout precedent.

Also fixed a real (not stale-build) test issue found while regressing: `test-pad-a.js`'s orbital
pump-loop frame budget (3000) was sized for the old 1x default speed and fell just short of `held`
at the now-intentional 0.1x default (~5ms virt/frame worst case) — bumped to 6000 with the math
documented inline.

Test: `tests/test-maxq-fairing.js` (18 checks — real q exposure, vehicle-shape sensitivity,
fairing-band response, the aggregate-neutrality invariant proven exactly, crewed-neutral
sensitivity). Regression: 96 suites, only the 1 pre-existing Codex drift.

## Next task

Suggested (open — pick per priority): #11 confirm-with-preview on destructive actions (S); #106
guided first-launch tutorial (H, none exists); or continue the tech-tree bloat cleanup (36 dead-end
leaves still untouched — different from the merged clusters already done).

## Flight 3D vehicle authority + ascent visibility repair — SHIPPED (Codex, 2026-07-22)

Root cause was lifecycle, not missing stage art: the persistent Cape scene built its rocket once,
usually from the new-game one-stage A-4, then reused that stale mesh for later launches. Flight
physics/audio correctly used the frozen multi-stage launch spec, so the first core event detached
the stale mesh's only stage (including its nose) and left a live plume under an empty root.

`cape3dFlightVehicleSpec` / `cape3dVehicleVisualKey` now make the immutable launch spec or snapshot
the renderer's authority. `cape3dInstallFlightVehicle` rebuilds a mismatched pad rocket and all
topology-dependent effects, synchronizes orbit/transfer craft, and validates stage/transfer/booster
group counts before separation can run. Idle Mission Control also refreshes its pad stack when the
bench design changes. Engine ids now survive every spec/snapshot seam, separation states preserve
their real vx/vy, and camera targeting transforms the remaining live-stage span through the pitched
rocket's world matrix instead of aiming at vacated local coordinates.

The blue-grey ascent wash had three independent causes: Earth-scale objects shared the Cape's
FogExp2 density, the Earth/Cape handoff left poor visual coverage, and a dynamically-lit day map was
both dim and geographically pinned to the sphere's north pole. The launch blend now exponentially
removes local fog with altitude, cross-fades Cape/Earth complementarily by 28–70 km, darkens the sky
on its own 8–55 km curve, fades local clouds, and exempts Earth/atmosphere/stars from local fog. The
day map uses an unlit material, its Cape Canaveral surface vector (28.4°N, 80.6°W) is quaternion-mapped
to the physical launch tangent, and a harmless tangent roll puts the Florida/Bahamas coastline into
the chase view. A camera-side directional fill and shallow real-horizon elevation keep the upper
stack readable against space.

Real headless-Firefox/WebGL validation used a synthetic three-stage vehicle with two boosters in the
actual generated game: 3 stage groups + 2 boosters were present on the pad; after the first core
event the parent mask was `[false,true,true]`, both separated assemblies existed as debris, the
remaining stack stayed in frame, fog was `1.25e-9` at 94.7 km, the Earth texture decoded at 2048 px,
and the visible tangent measured exactly 28.4°N / 80.6°W. No screenshot fixture was committed.

Tests: new `test-flight3d-vehicle-sync.js` (14 checks), staging 30/30, launch camera 46/46, plus the
complete suite sweep: 97 passing suite files and only the one documented trajectory drift. Build
parity and `git diff --check` clean. The sweep also exposed a Node-runtime harness issue (modern
Node's inherited `performance.now` resisted assignment); `tests/harness.js` now installs the native
clock as a writable own property so all virtual-clock animation suites pass again.

## Flight 3D booster-first separation + surviving-stack handoff — SHIPPED (Codex, 2026-07-22)

Two independent defects made side boosters survive to the end. First, the real bench default is
20 t per booster; two slow A-4 strap-ons naturally burned for about 160 s while a normal 12 t S-3D
core burned for about 84 s. The Flight 3D integrator burned both in parallel, so the core separated
first—or a single-stage plan ended before ever creating a booster event. Second, the orbit and
transfer scenes rebuilt the entire frozen launch stack, so even correctly detached hardware
reappeared at the phase handoff.

`cape3dTrajectoryPlan` now follows the authoritative performance model's serial-equivalent stage-0
contract: during boost it applies combined core/booster thrust at booster Isp, consumes only the
booster segment, emits BOOSTER SEP, drops booster dry mass, and only then begins consuming untouched
core propellant. The booster segment is included in the gravity-turn burn clock. This guarantees a
real booster event strictly before stage 1 for every fitted design without a cosmetic fixed-time
override. `cape3dPostAscentVehicleSpec` separately derives the surviving craft—final insertion stage,
optional transfer segment, and payload/capsule; no lower cores or strap-ons—for orbit/transfer sync.

Regression coverage now includes the actual 2×20 t default A-4 case on both two-stage and
single-stage cores, plus immutable post-ascent topology checks. Generated-game Firefox/WebGL
acceptance used a three-stage/default-booster vehicle: events were booster → stage 1 → stage 2;
8 s after BOOSTER SEP the booster group was root-detached and 597 m behind while stage 1 remained
attached; the orbit handoff hid the launch vehicle and exposed exactly one upper stage with zero
booster geometry. `test-flight3d-staging.js` is 35/35 and `test-flight3d-vehicle-sync.js` is 20/20.
Full sweep: 97 suite files pass, only the established `test-flight3d-trajectory.js` drift remains;
build parity and `git diff --check` clean.

## Solar Map SM1–SM5 source integration — SHIPPED (Codex, 2026-07-26)

The five standalone review builds from the owner’s Downloads folder were ported into authoritative
`src/shell.html` and `src/render.js`, then rebuilt into `index.html`, `orbital-ventures.html`, and
`build/game.js`. SM1 adds the larger inline viewport, near-full-screen pop-out, collapsible
Bodies/Details rails, Map Only, and `ResizeObserver`-driven live sizing. SM2 adds named camera
presets, fit math, eased/cancellable transitions, reset/focus controls, and distance-sensitive zoom.
SM3 adds selection halo, distant-body DOM markers, screen-stable collision-managed labels, orbit
modes, and hover emphasis. SM4 adds deterministic near/mid/far star layers, galactic backdrop,
solar lighting, atmosphere/corona tuning, camera-relative parallax, and Low/Balanced/High map quality.
SM5 adds Navigation, Mission Planning, Operations, and Strategic presentation modes over the shared
scene and existing mission/asset truth.

The supplied source-integration package had one bad preflight assertion (`mapPopRosterBtn` was
correctly generated from `render.js`, not static `shell.html`); the payload itself matched the current
map anchors. Firefox/WebGL validation then exposed prototype label sprites growing enormous at close
range. Labels and the selection halo now convert target screen pixels to world units every frame, and
a visible DOM marker suppresses its duplicate sprite label.

Validation: focused source guard 26/26; build parity 3/3; all 11 existing map/Three.js suites pass;
full sweep 108/109 with only the documented pre-existing `test-flight3d-trajectory.js` drift.
Firefox at 1920×1080 verified an 836×696 inline map, a 1902×870 Map Only host/drawing buffer,
readable labels, all operating modes, quality/orbit controls, rail toggles, and repeated close/reopen
cycles with exactly one live canvas/context.

## Exhaust plume visual-language overhaul — SHIPPED (Codex, 2026-08-15)

The live Three.js launch renderer was literally drawing three opaque cone meshes inside one another,
and the Canvas fallback repeated the same inner/outer-cone construction. Both paths now use one soft,
pressure-shaped exhaust envelope: tight and luminous near sea level, progressively broader and more
translucent as ambient pressure falls, with restrained shock cells in the atmospheric transition
instead of permanent geometric bands. Orbit and transfer burns use the same sprite-based language,
and the launch plume stays anchored to the lowest attached live stage through separation. The Canvas
envelope uses the quadratic-curve primitive supported by the game's WebGL 2D compatibility context.

Plume colour, width and particulate smoke now follow the fitted propulsion family (kerolox/alcohol,
hydrolox/NTR, methalox, hypergolic, solid, electric or fusion). Frozen launch snapshots preserve core,
booster and transfer-engine identity through the presentation boundary, so staging changes the plume
with the active engine and a deep-space drive cannot inherit the insertion engine's appearance.

Headless Firefox/WebGL acceptance used the rebuilt local game at 4.0 km and 40.1 km: the lower-
atmosphere plume read as one continuous luminous body with no nested shell, while the high-altitude
plume opened into a wider, softer fan. Firefox also confirmed Three.js active, electric transfer-family
resolution, and no `ConeGeometry` in the live launch plume constructor. No screenshot fixture was
committed. The new plume contract is 16/16; 13 adjacent flight, staging, trajectory, failure, departure,
night-launch and accessibility suites add 346/346 checks. Build, generated-script syntax, parity and
`git diff --check` are clean.

## Stage-proportional rocket fins — SHIPPED (Codex, 2026-08-15)

Sounding-rocket fins previously used fixed Three.js dimensions (`14` root chord and at least `7`
span), so the smallest vehicles inherited surfaces sized for much larger stacks. Canvas separately
used a root chord equal to 45% of first-stage height. Both renderers now consume one fin profile
derived from the carrier stage's actual radius and height, with height, radius and thickness clamps
that remain proportional across both short/wide and long/narrow designs.

Firefox/WebGL instantiated the real minimum A-4 vehicle as a sounding rocket and reported a fin root
at 22% of first-stage height and outward span at 75% of body radius; the retired fixed mesh would have
been roughly 67% of that stage's height and 2.3 body radii. The new fin contract is 12/12 and five
adjacent vehicle, Flight 3D, pad and regression suites add 144/144 checks. Build parity, generated-
script syntax and `git diff --check` are clean.

## Cape ascent-guide removal + coastal green terrain — SHIPPED (Codex, 2026-08-15)

The cyan past/future line and its event-marker scene object have been removed from live ascent and
suborbital presentation. This is a presentation-only deletion: the physics-derived trajectory plan,
samples, staging events, vehicle motion, camera tracking and altitude/range telemetry remain the
authoritative flight path.

The Three.js Cape ground now tints its existing photographic albedo toward muted coastal green and
layers a stronger mottled overlay whose patches are three parts vegetation to one part sand. Roads,
crawlerways, concrete pads and the existing palms/scrub remain separate materials and geometry, so
the site keeps its industrial clearings rather than turning into a flat lawn. The already-green
Canvas fallback is unchanged.

Firefox/WebGL mounted the rebuilt Cape and confirmed ground colour `0xb6c78b`, terrain-overlay
opacity `0.68`, and no `cape3d_trajectory_guide` anywhere in the live scene graph. The new cleanup
contract is 10/10 and six adjacent Cape, Flight 3D, trajectory, camera, pad and regression suites add
206/206 checks. Build parity, generated-script syntax and `git diff --check` are clean.

## Extended Cape ascent-to-orbit transition — SHIPPED (Codex, 2026-08-15)

The launch camera previously chased only the vehicle while the local Cape scene covered just an
8×12 km patch. That combination sent the pad out of frame almost immediately and exposed the edge
of the local terrain before the orbital Earth presentation was ready, making ascent read as two
disconnected scenes.

The coastal shelf now extends 180 km inland and 260 km along the range while retaining physical
texture density and an exact land/ocean shoreline. From 60 m through the first few kilometres, a
range-wide camera framing function holds both the launch site and rising vehicle in view, then
releases cleanly back to the normal chase camera by 6.5 km. Local haze now clears on that same visual
scale. Cape materials fade continuously as the Earth becomes opaque from 38–96 km, so the handoff
has no geometry pop or translucent coverage gap.

Firefox/WebGL validation used the real flight overlay at 3 km: the rocket remained clear of the
altitude HUD while the facility, coastline, land and ocean stayed visible below. A deterministic
runtime audit confirmed full Cape coverage at 1, 3 and 30 km, Cape/Earth opacity of 0.793/0.207 at
55 km and 0.188/0.812 at 80 km, and a complete Earth handoff at 96 km. The new continuity contract
is 17/17 and seven adjacent launch, Cape, trajectory, pad and regression suites add 216/216 checks.
Build parity, generated-script syntax and `git diff --check` are clean.

## Generalized vehicle and station docking — SCOPED (Codex, 2026-08-15)

Repository audit found four disconnected docking seams: abstract orbital-assembly reliability,
module delivery that mutates a facility before playing a success-only dock card, cosmetic Station 3D
port links, and launch hulls that cannot persist as orbital targets. The scoped design unifies them
under one simulation-owned dock interface and operation contract while keeping presentation read-only.

The design covers capsule-to-capsule/pod, capsule/pod-to-station, permanent module attachment and
mission-internal LOR/EOR rendezvous. It locks mission-scale control rather than manual six-axis flight;
three broad interface standards with size, role and service compatibility; temporary visiting berths
separate from permanent station capacity; docking as a named mission-reliability phase rather than a
second post-success roll; and a future `state.orbitAssets[]` authority so persistent craft retain exact
hull ownership outside the cruise-only `activeFlights[]` queue.

Delivery is split into D0 compatibility/reservations, D1 mission-internal rendezvous, D2 station
visits and transfer, D3 persistent orbit assets and separately launched vehicles, D4 retry/undock/
refuel/servicing operations, and D5 presentation/automation/balance. The complete interaction matrix,
state shapes, player flow, tests, protected baselines, non-goals and risks live in
`docs/DOCKING-SYSTEM-SCOPE.md`. No gameplay code or balance values changed in this scoping pass.

## Generalized docking D0–D1 — SHIPPED (Codex, 2026-08-15)

D0 establishes one pure, JSON-safe docking authority in `src/data.js`: normalized interfaces expose
standard, size, active/passive role, transfer services and exact occupancy; operations bind stable
actor/target port ids; compatibility reports standard, size, role, service and occupancy failures;
explicit adapters bridge only the dimensions they declare; and reservation/release transitions are
pure and idempotent. Capability audits reject duplicate operations, unknown reservation owners and
one-sided port ownership. Vehicle build snapshots now freeze fitted mission ports and rendezvous
guidance independently of the parts bench's launch-stack nodes and Station 3D's cosmetic layout.

D1 proves that authority on mission-internal rendezvous. LOR reserves a lunar ascent-craft to command-
capsule operation; EOR reserves its Earth-orbit transfer/lander assembly plus lunar rendezvous; and
the existing optional orbital-assembly route creates one operation per separately launched module.
The established EOR and orbital-assembly reliability values now flow through the shared docking
capability, which enters the existing subsystem outcome exactly once as a named “Rendezvous &
docking” phase. `dock_latch` is eligible only when the frozen flight context owns a real operation.
Flight/debrief specs receive generic read-only actor/target presentation records; D5 still owns the
visual approach playback and eventual balance tuning, so the existing module-delivery spectacle and
economics remain unchanged.

Three focused suites cover 83/83 checks across compatibility/frozen fitment, reservation/audit
ownership and LOR/EOR mission integration; the updated anomaly pool is 25/25. The repository-wide
headless sweep passes 148/158 suites after this work, with one intentional skip. An isolated archive
of untouched `HEAD` passes 145/155 and produces the exact same nine red suite names, proving they are
baseline issues: four source-reading tests run from a temporary directory, four Gregorian-calendar
expectation suites still assert the retired 360-day model, and one personnel succession suite has two
unrelated failures. Build parity, generated-script syntax and `git diff --check` are clean.

## Generalized docking D2 — SHIPPED (Codex, 2026-08-15)

D2 turns LEO station servicing into real docking missions. The core Habitat supplies one visiting
berth and every Docking Node adds two, held in a facility-local occupancy ledger that never changes
`facilityModuleList()` or `facilityPortCap()`. Crew rotation and manual resupply actions now create
one-shot mission offers; flown LEO module deliveries join the same path. Each reserves an exact berth,
freezes an explicit capsule or cargo pod plus station interface into the build snapshot, rechecks the
live facility/berth at launch, and feeds the existing docking reliability phase without a second roll.

On success the simulation settles hard dock before presentation and applies only the intersection of
declared services: named-astronaut exchange, provisions unload, or permanent module installation.
Same-mission return releases both ports into the existing recovery/expended lifecycle. “Remain” stores
a canonical station visitor, applied transfer receipt and `docked` hull owner; replay is idempotent and
the lifecycle audit rejects duplicate/missing berth or hull ownership. D3 still owns free-flying
`orbitAssets[]`, while D4 owns later persistent undock/retry/refuel operations. Surface-base deliveries
remain economically identical and are now explicitly presented as surface cargo handoffs, not docks.

Save v64 records the new facility docking state. `test-station-docking.js` and
`test-docking-transfer.js` add 38/38 checks; the complete focused D0–D2/station set passes
228/228, with another 55/55 selected Gate 2/3 ownership checks green. The repository sweep passes 150/160 suites plus one intentional skip (up from 148/158 only because of the two new
suites), with exactly the same nine pre-existing failing suite names and no new red suite. Build
parity, `node --check build/game.js`, and `git diff --check` are clean.

## Generalized docking D3 — SHIPPED (Codex, 2026-08-15)

D3 introduces the durable owner that separate-launch rendezvous needed. `state.orbitAssets[]` stores
free, reserved, soft-captured, or docked capsules, cargo pods, tugs, and targets with an exact hull,
orbit, frozen vehicle snapshot, interfaces, resources, and link state. Successful deployment missions
leave a capsule/pod/target in low Earth orbit instead of expending its hull; a D2 station-local visitor
can also be released into the same collection while freeing its exact station berth. Hull lifecycle
status `in-orbit` is valid only with one orbit-asset owner.

A later launch reserves one exact interface on a free target. Its build freezes separate actor and
target records, launch rechecks the live target/reservation, and hard dock atomically replaces the
reservation with reciprocal links and one shared operation on both persistent assets. Failed/aborted
approaches release the target, retained missions can rebook it, cancellation is exact, simultaneous
targets remain independent, and target removal cancels only its owning mission. Forced linked-target
loss deterministically frees the surviving craft. D4 retains retry from stationkeeping, ordinary
linked-pair undock/return/relocation, refueling, and service transfers.

Fleet Registry now provides deployment, target-rendezvous and cancellation actions; its orbital group,
the global Outliner, the empire strip, and SVG/Phaser/Three Solar Map badges all derive from the same
asset collection. Save v65 records the new state and lifecycle audits reject malformed reservations,
duplicate hull owners, non-reciprocal links, or links that own no physical interface.

`test-orbit-assets.js` and `test-vehicle-docking.js` add 35/35 checks. The focused D0–D3, station,
lifecycle, registry, and map set passes 367/367; Gate 2 passes 49/49 and Gate 3 passes 96/96. The full
162-suite sweep has 152 real passes plus one intentional skip and the same nine baseline failures as
before D3; the separately invoked source-only SM1–SM5 contract is 26/26. Build parity,
`node --check build/game.js`, and `git diff --check` are clean.
