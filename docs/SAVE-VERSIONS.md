# Orbital Ventures — Save Version History

Per-version record of every `SAVE_VERSION` bump and what it added to persisted state.
Extracted verbatim from `src/save.js` on 2026-07-28 — the history had accumulated as a
single ~12,800-character inline comment (one line of it was 9,459 characters), which made
`save.js` 42% comment by volume and the block itself undiffable. The text below is unchanged;
only the formatting is new.

## Conventions

**Backwards compatibility is NOT required (owner directive, 2026-07-28).** This is a single-player
game with a single player and no released install base. Save-breaking changes are acceptable. Do not
add lazy-default guards, grandfather clauses, or `migrate*()` functions purely to keep old saves
loading — if the clean implementation needs a format change, take it.

Two things still apply:

- **Bump `SAVE_VERSION` and add an entry below anyway.** This history is useful as a record of what
  persisted state exists and why, independent of any migration concern.
- **Keep the forward-version guard on load.** A save written by a newer build opened in an older one
  should warn rather than silently misread — that protects against the two-agent workflow, not an
  install base.

The entries below predate this directive, so nearly all of them describe the older additive-only
pattern: new fields read through `||` / falsy guards so a pre-bump save loaded unchanged, with an
explicit `migrate*()` only where a value had to be *transformed* rather than defaulted (e.g.
`migrateWindowsToDays`, `migrateEraSeen`, `migrateEphemerisWindows`). That existing code is not to be
stripped out wholesale — much of it now doubles as ordinary defensive coding against malformed state.

When bumping `SAVE_VERSION`, add an entry at the top of the list below.

---

## v66 — Docking D4 persistent operations and services

Adds a durable command-and-receipt ledger for spacecraft that already exist in orbit:

- `state.orbitOps[]` records exact actor/target identities and ports, operation phase, services, source dock, immutable request identity, payload, and exactly-once receipts. `state.orbitOpSeq` supplies stable operation ids.
- Existing craft can reserve both ports for stationkeeping, wave off, retry from wave-off or soft capture, then establish reciprocal soft-capture or hard-dock links. Each approach consumes a recorded 25 m/s rendezvous increment; reload and repeated requests cannot spend it twice.
- Hard-docked craft can undock and free only their shared interfaces. Free craft can relocate between supported orbit bands or return, recovering capsules/recovery-fitted hulls and disposing of other hardware without duplicating hull ownership.
- Named crew, defined numeric cargo, and propellant cross-feed only across a reciprocal hard dock with the matching shared service. Station visitors can exchange named crew with their host, LEO depot stock can refuel a fuel-capable craft, and power/data servicing writes a durable hook for later satellite/tug systems.
- Fleet Registry operation consoles expose rendezvous phase control, transfers, refueling, relocation, return, and station-visitor crew management from the same canonical state.

## v65 — Docking D3 persistent orbit assets

Adds durable spacecraft that survive between launches:

- `state.orbitAssets[]` is the single owner for free, reserved, soft-captured, or vehicle-docked capsules, pods, tugs, and targets. Each record carries an exact hull, orbit, frozen vehicle snapshot, docking interfaces, crew/cargo/resources, and any reciprocal link.
- `state.orbitAssetSeq` and `state.orbitMissionSeq` provide stable asset and player-created deployment/rendezvous identities.
- Hull lifecycle status `in-orbit` is valid only when exactly one orbit asset owns that hull. Lifecycle auditing rejects missing/duplicate owners, malformed reservations, non-reciprocal links, and dock operations that own no physical interface.
- A pending later-launch rendezvous stores its reservation on the target asset and exact target port. Hard dock replaces that reservation atomically with reciprocal `dockedTo` and operation records on both assets; failure, cancellation, or target removal releases it deterministically.
- Station-local D2 visitors may undock into `orbitAssets[]` without copying their hull. Fleet Registry, Outliner, and Solar Map state are derived from the same collection.

## v64 — Docking D2 station visits

Adds persisted capsule/pod visits to orbital stations:

- `state.stationVisitSeq` provides stable identities for player-created crew-rotation and resupply missions.
- Orbital facility records may carry `visitingBerths`, `dockReservations`, and `dockedVisitors`. These are separate from permanent `moduleList` capacity: the core Habitat supplies one visiting berth and each Docking Node supplies two.
- Reservations bind one mission operation to one exact berth. A successful hard dock records an immutable transfer receipt and either releases the berth for same-mission return or leaves a visitor as its durable owner.
- Hull lifecycle status `docked` is owned by exactly one persisted station visitor; lifecycle auditing rejects duplicate, missing, or mismatched berth/hull ownership.

## v63 — Gate 3 economic continuity

Adds persisted insolvency and Program Reorganization continuity:

- `state.campaignRules` — immutable campaign-creation rules. Its `ironman`
  member defaults to Standard (`false`) for missing development state; Ironman
  suppresses Program Reorganization and permits permanent insolvency after
  optional credit.
- `state.insolvencySeq`, `state.insolvency`, and `state.lastInsolvency` —
  monotonic insolvency identity, the active offer/reorganization owner, and the
  most recently resolved compact record.
- `state.reorganizationSeq`, `state.reorganizationAttempts`,
  `state.reorganizationSuccesses`, `state.reorganization`, and
  `state.lastReorganization` — monotonic cycle identity and counters, the live
  360-day narrow-clock owner with exact sponsored mission/design/order/hull,
  quote, restricted escrow and receipts, and the most recently closed compact
  cycle. Every non-success closes the current cycle; retry creates a fresh id,
  fresh 360-day stand-down, fresh penalties, and fresh exact article/escrow.
- `state.legacyPenalty` — cumulative explicit legacy deduction (`10` per
  accepted cycle), scored without rewriting unrelated history.
- `state.debtRenegotiated` — one-way campaign flag. The first accepted cycle
  sets `loanInterest=round2(old*0.5)`; replay, reload, and later cycles cannot
  reduce it again. Existing bailout-use history is preserved.
- `state.operatingSupport` — null or a separate 90-day restricted operating
  ledger. It stores the success-time recurring-economy snapshot, monthly cap,
  remaining three-month authorization, amount paid, daily accrual receipts
  grouped into three 30-day periods, a consistency fingerprint, and closure
  reason. Each of 90 elapsed days pays at most the lesser of one-thirtieth of
  live recurring burn, one-thirtieth of the snapshot cap, and remaining authorization. Unspent
  authorization is never available Capital and cannot directly pay one-time
  purchases; only a receipted monthly reimbursement enters Capital. A new
  reorganization closes active support with `new-reorganization` before
  suspension starts.

Division capitalization adds no persisted field: it is derived from
`skill > DIV_SKILL0`. Project experience and morale at or below the baseline do
not create division opex; the first explicit training crosses the predicate and
activates one `$0.25M/month` charge.

Deferred flights retain their existing Gate 2 ownership and dates. The narrow
administrative clock stops at a due arrival; logistics settles normally, while
a mission acquires Gate 2 foreground/UI/transaction ownership. Administration
resumes after that owner releases. No arrival/deadline is frozen or shifted,
and v63 creates no second flight owner or rerolled outcome.

## v62 — Gate 2 resumable launch transactions

Adds the single foreground `launchTxn`, durable request receipts, exact mission,
hull, quote, capability, decision, outcome, and effect snapshots, plus transaction
ownership on deferred flights. Launch decisions resume from JSON state after reload
and settlement receipts make repeated delivery a no-op. Pre-v62 saves captured with
an in-progress launch or mission flight are rejected: development builds do not
fabricate missing hull ownership, random results, or flight history. Ordinary v61
lifecycle records are remapped through the schema-2 factories.

## v61 — Gate 1 canonical campaign and lifecycle schema

Adds the explicit campaign `schemaId`, canonical empty `annals` and `launchTxn`
slots, JSON-safe lifecycle records, and one fresh-state/default authority. The
transaction slot is deliberately `null`: Gate 1 defines its serializable shape,
while Gate 2 alone may create, resume, settle, or roll back live launch
transactions. Version 60 payloads remain best-effort compatible through additive
defaults; schema mismatches and future save versions are rejected before the
incoming payload or live campaign is mutated. A v60 order that lacks the newly
canonical physical snapshot fields freezes them once from that save's current
Bench/defaults; historical per-order values are intentionally not invented.

## v60 — Tier 3.2 persistent history archive

Adds `state.annals`, the compact campaign-wide archive of significant events.
No retroactive reconstruction is attempted; a save without the field records
forward from an empty archive.

## v59 — Tier 1.3 third Chronicle bookend

Adds `state.eraScored3` for the 2060 Chronicle bookend. It is additive and reads
false until the campaign crosses the scoring year.

## v58 — E4.4 persistent launch-vehicle hull registry

Additive serial-numbered hulls and flight history; existing hangar entries are backfilled, never historical flights invented.

## v57 — E4.1 — real Keplerian ephemeris

state.windows is a regenerable cache; migrateEphemerisWindows() clears it on pre-v57 load so launch windows regenerate from real Earth→target phase geometry (with eccentricity-driven quality) instead of the old fixed-cadence + random-quality synthesis. committedWindow (a concrete absDay + quality the player already picked) is preserved as-is. No new persisted fields; purely a cache invalidation + physics swap, so no balance migration beyond the (intended) shift in window dates/qualities on next regeneration.

## v56 — #89 slice 1 — tracking-station network backend

state.trackingStations (built station ids, TRACKING_STATIONS in data.js). Purely additive: reads through trackingStationCount()/trackingUpkeep(), both `||[]`-guarded. The gate itself (missionTechMet) is inert — TRACKING_NETWORK_LIVE=false until slice 2 ships a build UI — so this version bump changes NOTHING about what any existing save can fly; it only adds a (currently unreachable) empty array. No migrate function needed.

## v55 — #14 — pinned research goal

state.researchGoal (a RESEARCH id or null, settable on locked nodes too — it's a highlight/tracking pin, not a purchase). Purely additive: read only through researchGoalProgress()/techHighlightSet(), both of which treat undefined exactly like null (no highlight, no band). No migrate function needed — pre-v55 saves simply load with no goal pinned.

## v54 — E3.5 — derived state.build part graph (additive;

state.stages remains source of truth, graph regenerated on load, safe to drop) cruise. New optional `cargo` field on any mission/contractOffer object (uncrewed payload mass carried through every leg of a `.profile` mission — read only by lvPayload()'s profile branch and simulateMission()'s stackMass(), both via `m.cargo||0`; a mission with no cargo field behaves exactly as before). No new top-level state — Moon deliveries resolve synchronously (days:8, same turn) exactly like Slice 1's LEO deliveries; Mars deliveries (days:210) ride the EXISTING state.activeFlights deferred-flight mechanism unchanged (a normal ctx-bearing record, not a new record shape) — so a mid-cruise Mars delivery save round-trips through the same rehydrateFlights() path any other deferred mission already uses. No explicit migrate function needed. Purely additive, no balance impact on existing saves or any mission that doesn't set m.cargo.

## v50 — #73 Slice 1 — module delivery is a real launch (LEO only)

state.mdSeq (module-delivery id counter, lazily defaulted via `(state.mdSeq||0)+1`, mirrors state.procSeq's pattern) + two new optional fields on state.contractOffers[] items: deliverModule ({facId,modId}) and moduleCost (the base price, locked in at generation so a later balance change can't retroactively over/undercharge an in-flight delivery). Both fields are read only through m.deliverModule truthy checks in finalizeLaunch's success branch and pendingModuleDelivery()'s .find() — old offers (which never have deliverModule) just read as "not a module delivery," exactly the lazy-default convention every other proc-offer field already uses. No explicit migrate function needed. Purely additive, no balance impact on existing saves or existing (repeat-of-type) module purchases.

## v49 — E1.1 slice A — reactive rival race

state.poachHeat (months remaining in a post-fatal-loss window; set by triggerHearing's siblings in finalizeLaunch's two crewed-loss branches and by the hearing's "blame" choice, decremented monthly by tickPoachHeat(), multiplies checkPoaching's roll ×POACH_HEAT_MULT while >0). Per-offer state.contractOffers[].rivalBid ({rivalId,snatchAbs} or absent) set by tickRivalSnatch() when a surging rival bids on an uncommitted procedural offer — forward-compatible by construction (an existing offer object just gains an optional key; old offers read as unbid, exactly the lazy-default convention every other proc-offer field already uses). No persisted state for the budget-hearing decision itself (_pendingHearing is transient, like _pendingInquiry/_pendingSetback). No explicit migrate function needed: poachHeat reads through `||0` everywhere, rivalBid reads through truthy checks — pre-v49 saves just start cold on both. Purely additive, no balance impact.

## v48 — E1.3 — procedural filler contracts

state.contractOffers ([{id:'pc_N',proc:true,name,reqDv,payload,crew,days,payout,rep,minRep,reqResearch?,blurb,expiresAbs}]) + state.procSeq, generated monthly by tickContractOffers() (era + capability-gated via CONTRACT_ARCHETYPES, data.js) up to CONTRACT_OFFER_CAP concurrent, expiring after CONTRACT_OFFER_LEAD months unless referenced by activeMission/buildQueue/hangar. Resolved via the new missionById(id) (checks MISSIONS then contractOffers) at the handful of call sites that resolve state.activeMission by id; deferred-flight/history/program lookups stay MISSIONS-only by design (procedural archetypes are immediate, non-deferred, and deliberately never write state.completed/firstDates/history — finalizeLaunch's success branch gates the whole firsts/milestone block on `!m.proc`, and sciGain uses the routine-tier rate for proc flights too, so a contract offer pays full money once at a discounted rate and is removed on success — never a repeatable science/firsts farm). No explicit migrate function needed: both fields read only through missionById/tickContractOffers, which fall back to []/0 — pre-v48 saves just start with an empty board. Purely additive, no balance impact on existing saves.

## v47 — E1.4 — memorial wall

state.memorial ([{id,name,when,mission,story}]), appended in loseAssignedCrew at the moment a crewed flight kills its astronaut (name snapshotted, so it survives the id leaving state.staff and any future pool edits), rendered in the Personnel tab when non-empty. Read only through memorialRoll(), which falls back to [] — pre-v47 saves just start with an empty wall. Purely additive, no balance impact.

## v46 — E1.4 — per-astronaut flight log

state.astronautLog ({astronautId:[{when,mission,outcome}]}), appended once per crewed flight resolution in finalizeLaunch, keyed by id so it survives the astronaut leaving state.staff (death/fire/quit). No explicit migrate function needed: read only through astronautFlights(id), which falls back to [] when the field or the id's entry is missing — pre-v46 saves just start every astronaut with an empty log. Purely additive, no balance impact.

## v45 — P11 — one late-game crisis (Kessler debris cascade)

state.crisis ({phase,startAbs,severity,peakSeverity,fundedUntilAbs} or null), state.crisisDone ({outcome:'mitigated'|'endured',peakSeverity,months} or null once resolved — a ONE-TIME arc, not recurring), state.leoFlights (cumulative successful LEO-class flights, the trigger's own counter). Eligible from Commercial era (index 4) + leoFlights≥40; a small monthly chance then starts it. Active: LEO-class missions (isLeoClassMission — no profile, reqDv≥9000) fly at up to −12% reliability, scaling with severity; funding a Debris Remediation Program (cost scales with eraStakesFrac(), like the bailout mechanic) brings severity down, letting it go unfunded lets it rise. Resolves 'mitigated' (severity hits 0, bigger legacyScore bonus) or 'endured' (36 months elapse regardless, smaller bonus) — never a hard lockout, just a rising tax. No explicit migrate function needed: all three fields are read through `||`/falsy guards everywhere (state.crisis falsy on a legacy load = inactive; leoFlights||0 = 0), so behavior is unchanged until a save's own play crosses the era+flight-count threshold.

## v44 — P6 6.1 era-transition interstitial — state.eraSeen (index of the last era acknowledged via the full-screen card) + state.eraStartSnapshot ({flights,playerFirsts,rivalFirsts,money,rep} baseline captured when that era began, diffed for the retrospective)

Both persisted. Trigger is DERIVED (eraIndex(currentEra())>state.eraSeen), gated behind the setback>mishap>inquiry>rival-disaster _pending chain (era is lowest priority; deferred to a later settle-point if any decision is pending, never lost since the condition is stateful). eraSeen advances only on Continue; balance-neutral (pure notification). Lazy migration: pre-v44 saves lack both — migrateEraSeen() backfills eraSeen to the save's CURRENT era index (from its own year, NOT 0, so a late-game load fires ZERO stale interstitials) and seeds eraStartSnapshot from current metrics; newGame seeds eraSeen:0 + a Pioneer baseline.

## v43 — P3 failure investigation loop — state.inquiryCredit ({subsystem,rel,flights} or null): a funded uncrewed-loss inquiry into an ascent/staging subsystem grants a +2% additive-R credit (like familyRelBonus) gated to that subsystem, consumed over 3 flights at launch;

a deep-phase failure grants a flat +10⚛ science instead (no persisted credit). Transient _pendingInquiry (fund/decline modal, precedence setback>mishap>inquiry) is NOT persisted. Lazy migration: pre-v43 saves lack inquiryCredit — loadDefaults() seeds it null on both load paths (undefined is already falsy, so behavior is unchanged either way).

## v42 — P2 slice 2.4 — per-facility auto-resupply toggle (fs.autoResupply boolean;

opt-in per facility). On the monthly tick a facility with the toggle ON auto-fires resupplyFacility() once supply falls to/below AUTO_RESUPPLY_THRESHOLD(6) and canResupply().ok — same cost/gate/lifecycle as a manual order (the resupplyInTransit + money gates prevent double-ordering and unaffordable fires). Pure automation, balance-neutral otherwise; each auto-order logs a 'note' line. Lazy migration: pre-v42 facilities carry no autoResupply — migrateFacilityAutoResupply() defaults it false on load (undefined is already falsy, so behavior is unchanged either way); foundFacility seeds autoResupply:false on fresh bases.

## v41 — P1 persistent in-flight missions — state.activeFlights[] (deferred interplanetary flights carry a resolved-at-launch ctx applied on arrival;

ctx stores famId + crewId, not object refs, so a mid-cruise save round-trips; legacy saves default [] via loadDefaults; rehydrateFlights() re-links ctx.m + restores _flightSeq on load).

## v40 — #19 slice B — career progression (staff.xp accrues monthly ×morale ×dept-training, raising effSkill above hire-day base up to +0.15;

dept.training level bought with capital; legacy staff default xp 0 via staffXp guard, effSkill==base at xp 0 so no balance migration). #19 slice C (succession + workforce planning) adds no persisted state — reconcileDeptLeads mutates existing dept.lead, gaps + the era-scaled unstaffed-department reliability penalty (0 in Pioneer) are derived — so it needs no bump.

## v39 — #19 slice A — organizational departments (state.departments {deptId:{lead,training}};

legacy saves default via loadDefaults/defaultDepartments; membership is derived from hired staff, leads are balance-neutral when unset);

## v38 — #6 research partnerships — bench-tested / flight-proven components (state.engineStockTested + state.partStockTested, the bench-tested subset of each yard;

legacy saves default {}); a fitted bench-tested component adds +1.5% reliability (cap +6%, benchRelBonus), built at +60% cost / +50% time;

## v36 — #7 sub-assemblies slice 2 — structures & habitats yard (state.partStock {"kind:sub":count}, e.g

"tank:steel"/"hab:closed"; legacy saves default {}); same cost-neutral cadence pattern as the Engine Yard;

## v35 — #7 sub-assemblies — Engine Yard (state.engineStock {engId:count};

legacy saves default {});

## v34 — Time Granularity slice 4b — launch windows day-scheduled (window/committedWindow .abs moved from absMonth to absDay;

migrateWindowsToDays ×30 on pre-v34 load + clears the regenerable windows cache);

## v33 — Time Granularity slice 1 — day-iterating advance() funnel (state.day 0..29 + absDay();

legacy saves default day:0 via load defaults; whole-month advances stay bit-identical so no balance migration needed);

## v32 — CE4(c) era-scaled failure stakes + bailout retune (state.loanInterest — permanent bridge-loan debt service;

legacy saves default to 0 via load defaults + loanInterest() guard);

## v31 — CE4(b) standing resupply obligations (per-facility supply/starvedMonths;

legacy facilities default to fully provisioned via facilitySupply());

## v30 — CE3(c) lunar architecture fork (state.lunarArch, null=uncommitted;

luna_landing reqResearch moved to per-arch gates);

## v29 — CE3(a) company doctrine (state.doctrine, null=undeclared/neutral);

## v28 — CE2(c) juggernaut capstone (state.standingProd/juggernautReached);

## v27 — CE2(b) launch cadence (state.padMonthAbs/padMonthUsed) — load defaults seed all of these;

## v26 — CE1 rival agents (state.rivalState), seedRivalState migrates old rivalFired
