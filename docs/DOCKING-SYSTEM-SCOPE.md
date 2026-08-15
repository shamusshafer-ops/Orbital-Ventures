# Generalized Docking Operations — Scope

Status: D0, D1 and D2 shipped 2026-08-15; D3–D5 remain planned.

## Goal

Turn docking into one reusable game system for:

- two independently launched spacecraft, including crew capsules, cargo pods, tugs and targets;
- a capsule or cargo pod visiting a station;
- a delivered module becoming a permanent part of a station; and
- mission-internal rendezvous such as lunar-orbit rendezvous and Earth-orbit assembly.

Docking should create planning and operational decisions without becoming a six-degree-of-freedom
piloting minigame. The simulation owns interfaces, target geometry, port reservations, rendezvous
margin, risk, attachment, transfers and persistent vehicle ownership. The flight presentation owns
the visible approach, stationkeeping, capture and settle.

## What existed at scoping time

The repository already has four useful but separate seams:

1. `assemblyDockPenalty()` applies an abstract reliability multiplier when a mission uses orbital
   assembly. No vehicles, ports or docking operation exist behind that number.
2. `dockModuleNow()` appends a delivered module directly to `facilityModuleList()`. On a successful
   delivery, `spec.dock` then plays a success-only `drawDockCard()` spectacle. The module is already
   attached before the animation begins.
3. The Station/Base Three.js editor stores `dockTargetPort` and `dockOwnPort` in
   `state.assemblyLayouts`, but that state is intentionally cosmetic. It cannot decide whether a
   mission may dock or whether a berth is occupied.
4. The vehicle builder has a crew capsule and probe core but no flight docking interface. Hulls know
   `hangar`, `preparing`, `in-flight`, `recovered`, `expended` and `lost`; a surviving spacecraft
   cannot currently remain in orbit as a target for a later launch.

The current probe core is avionics, not a cargo/service pod. D2 therefore needs an explicit pod
capability (and eventually a Cargo Pod part), rather than pretending every uncrewed fairing or guidance
core can dock, carry supplies and transfer propellant.

The new system must unify those seams without making animation state or cosmetic assembly layout
authoritative.

## Vocabulary

- **Capsule:** crew-capable, pressurized and normally recoverable spacecraft.
- **Pod:** uncrewed cargo, logistics, servicing or target spacecraft.
- **Module:** permanent station hardware. Once attached, it remains in `facilityModuleList()` and is
  not treated as a visiting spacecraft.
- **Orbit asset:** a spacecraft that survives launch settlement and remains available in orbit.
- **Dock interface:** a physical connection described by standard, size, role and transfer services.
- **Dock operation:** one actor approaching one target through rendezvous, capture and settlement.

These are gameplay roles, not separate rendering engines. A capsule and pod use the same operation
model; their crew, recovery and transfer capabilities differ.

## Locked design decisions

### 1. Mission-scale control

The player plans the target, compatible hardware and rendezvous reserve. During flight, the player
may make a consequential approach call, but does not translate and rotate the craft by hand.

Routine docking becomes quick once the interface pair and vehicle family are proven. A first docking,
a marginal approach, a damaged subsystem, an occupied target or a forced retry earns a full decision
and presentation beat.

### 2. One compatibility model

Every dock interface exposes this normalized shape:

```js
{
  id,                         // stable within its owning asset/facility
  standard,                   // probe_drogue | androgynous | berthing
  size,                       // small | standard | heavy
  role,                       // active | passive | androgynous
  services: {crew,cargo,fuel,power,data,permanent},
  occupiedBy: null            // reservation or established link
}
```

Two interfaces are compatible only when:

- their standard and size match, unless a fitted adapter explicitly bridges them;
- active meets passive, or at least one side is androgynous;
- both are free or reserved for this exact operation; and
- the intended transfer is present in the intersection of their `services`.

A mechanical hard dock does not imply every service. Two unpressurized pods may exchange fuel and
data but cannot transfer crew. A capsule may attach to a cargo pod without gaining an internal hatch.

The three standards are deliberately broad game abstractions:

| Standard | Gameplay role |
| --- | --- |
| Probe/drogue | Early crewed rendezvous; directional active/passive pairing. |
| Androgynous | Mature capsule, tug and station operations; either vehicle may lead. |
| Berthing | Heavy permanent modules and captured cargo; not a free crew-transfer assumption. |

The game should not reproduce every historical national docking standard. Adapters create the useful
tradeoff: extra mass and a small reliability cost in exchange for compatibility.

### 3. One docking outcome, not a second surprise roll

Docking becomes a named phase in the mission reliability report. Its reliability is computed before
settlement from:

- fitted interface and adapter penalty;
- avionics and `auto_rendezvous` capability;
- crew/mission-controller skill where applicable;
- target facility condition;
- reserved rendezvous delta-v margin; and
- any approach anomaly already in the transaction.

The docking phase feeds the existing flight outcome. The game must not announce mission success and
then perform an unrelated coin flip that destroys the vehicle at the port. The existing
`dock_latch` anomaly should become docking-phase content rather than firing on a generic deep mission.

### 4. Presentation never settles state

The simulation settles a hard dock exactly once and supplies a frozen presentation spec. Canvas and
Three.js renderers consume that spec but never attach modules, move crew, pay contracts or occupy a
port. Closing or skipping the animation cannot change the outcome.

### 5. Temporary visits do not consume permanent module capacity

Keep the existing station expansion economy intact:

- `facilityModuleList()` remains the permanent module/production authority.
- `facilityPortCap()` continues to govern permanent station growth.
- Visiting spacecraft use a separate berth count and occupancy record.
- The core habitat supplies one visiting berth.
- Each Docking Node still adds three permanent growth berths and also exposes two visiting berths:
  one of its six physical connections attaches the node, three support permanent growth, and two are
  available to visiting craft.

Surface facilities keep their existing uncapped construction rule. Surface arrival/landing is not
docking and remains outside this system.

### 6. Preserve exact vehicle ownership

An independently launched target requires a persistent spacecraft seam. Add canonical
`state.orbitAssets[]` records rather than stretching `activeFlights[]` beyond its cruise/arrival job.

```js
{
  id,
  hullId,
  name,
  kind,                       // capsule | pod | tug | target
  bodyId,
  orbit: {band,inclination},
  vehicleSnapshot,
  interfaces: [],
  status,                     // free | reserved | soft-captured | docked
  dockedTo: null,
  dockOperation: null,
  reservation: null,          // exact pending mission + target interface owner
  crewId: null,               // current named-astronaut model; other seats remain abstract
  cargo: {},
  resources: {rendezvousDv,fuel,power},
  createdAbs
}
```

`activeFlights[]` owns spacecraft in transit. D2's station-local `dockedVisitors[]` owns a spacecraft
only while it remains attached to that facility; D3's `orbitAssets[]` will own free-flying surviving
spacecraft. A facility or another orbit asset may reference an established dock link, but never owns a
duplicate copy of the hull. `auditLifecycleState()` requires each physical hull to have exactly one
durable owner.

Existing missions that launch, complete and recover/expire in one resolution do not create orbit
assets. Mission-internal capsule/lander rendezvous can use an ephemeral dock operation until a craft
needs to persist between turns.

### 7. One operation state machine

```text
planned → reserved → rendezvous → stationkeeping → soft capture → hard dock → transfer
                         │              │               │              │
                         └─ wave off ───┴─ hold/retry ───┴─ failed ─────┘
                                                                        ↓
                                                               undock / remain
```

Required meanings:

- **Reserved:** exact actor and target ports are held; another mission cannot silently take them.
- **Stationkeeping:** compatibility is rechecked against live target existence and port condition.
- **Soft capture:** craft are mechanically held, but no crew/cargo/fuel transfer or payout occurs.
- **Hard dock:** the link and allowed services become available atomically.
- **Wave off:** the spacecraft remains safe and free in orbit; retry costs time and rendezvous reserve.
- **Failed:** may damage/disable the selected port or lose the approaching craft. It does not silently
  destroy an entire station.

The operation belongs inside the existing launch transaction while it is part of a new flight. A
later retry/undock operation needs an equivalently durable `orbitOp` transaction/receipt rather than a
new `_pendingDock` global.

## Player-facing flow

### Mission planning

1. Choose a mission or action that requires rendezvous.
2. Choose a target: facility, compatible orbit asset, or mission-internal craft.
3. The Bench shows target orbit, required rendezvous reserve, open target interfaces, fitted actor
   interface and transfer services.
4. Incompatible builds receive an exact explanation: wrong standard, wrong size, two active ports,
   no free berth, missing crew passage, insufficient reserve, or target already committed.
5. Queue/build snapshots freeze the interface and target reservation just like engines, recovery and
   other launch capability.

Actor and target must share a destination body and a reachable orbital regime. Reuse the existing
inclination/plane-management seams to price phasing and plane change into the displayed rendezvous
reserve; docking must not become a flat fee that ignores the orbit the target actually occupies.

Until `BENCH_V2` is enabled, the current Bench may expose a compact Docking Package selector. Its
output is the canonical frozen `dockInterfaces[]` capability. Once the part builder is enabled,
physical docking-port/adapter parts derive the same capability and the transitional selector
disappears. There must never be two competing authorities.

Flight docking interfaces are also distinct from E3's launch-stack attachment nodes. A capsule nose
port is used after staging; it is not a new axial path through the launch build graph. The Mk1 capsule
may receive an integrated nose package, while a future Cargo Pod part owns its own interface and
capacity.

### Flight and approach

Normal ascent and cruise remain unchanged. The docking phase begins after orbital insertion or target
arrival. Most flights show a short automatic approach. The decision panel opens when the operation is
first-of-type or materially risky:

- **Proceed:** accept the displayed reliability and remaining margin.
- **Hold and inspect:** spend one day and some stationkeeping reserve to improve the approach check.
- **Wave off:** preserve the craft as a free orbit asset and retry later.
- **Manual approach:** crewed-only fallback using astronaut/controller skill when automation is absent
  or degraded.

`auto_rendezvous` improves reliability and makes proven routine dockings skippable; it does not remove
port compatibility or resource requirements.

### Hard dock and transfer

On hard dock, show only services actually available across both ports:

- transfer the named astronaut between capsule and station;
- unload provisions or a defined cargo package;
- transfer propellant when both sides expose `fuel` and a source has stock;
- attach a delivered station module permanently; or
- remain docked without transferring anything.

Contract payout, module installation and crew reassignment occur only with the corresponding transfer,
not merely because soft capture was achieved.

### Undock and return

A same-mission station visit can transfer and return without persisting between turns. A player who
chooses to remain docked leaves a station-local visitor occupying the berth. D3 promotes that visitor
to a free orbit asset when the player releases it from the station. D4 will add persistent operations
for undocking linked vehicle pairs, relocation, retry and return. A same-mission capsule already uses
the existing reentry/recovery flow.

## Supported interaction matrix

| Actor → target | First useful gameplay | Persistence |
| --- | --- | --- |
| Capsule → station | Crew rotation, delivery, extended visit and return | Optional |
| Cargo pod → station | Provisions, fuel, equipment and permanent-module delivery | Optional/permanent module |
| Capsule → capsule/pod | Gemini-style rendezvous, rescue, crew transfer or target inspection | Required for separate launches |
| Tug/pod → pod | Refueling, servicing, relocation | Required |
| Mission capsule → lander/transfer craft | LOR/EOR reliability and presentation | Ephemeral initially |

## Delivery slices

### D0 — Pure contracts and compatibility authority

**Shipped 2026-08-15.** `src/data.js` now owns the JSON-safe interface, actor, operation,
capability, compatibility, adapter, reservation, release, presentation and audit contracts. Build
snapshots freeze fitted ports and rendezvous guidance; incompatible frozen hulls receive exact
reasons. This authority remains separate from structural build nodes and cosmetic Station 3D ports.

- Add dock-interface, compatibility, berth and operation constructors/accessors.
- Define a frozen docking capability in build/launch snapshots.
- Add exact rejection reasons and port reservations.
- Extend lifecycle audits for reservation uniqueness, without adding orbital persistence yet.
- Preserve all non-docking mission math and current module-delivery economics exactly.

Suggested tests: `test-docking-compatibility.js`, `test-docking-reservations.js`.

### D1 — Mission-internal rendezvous

**Shipped 2026-08-15.** LOR, EOR and the optional orbital-assembly route now create exact reserved
operations from the frozen build capability. The existing architecture/assembly reliability values
flow through docking authority, reliability and debrief output name a docking phase, `dock_latch`
requires a real operation, and the flight spec receives generic read-only actor/target presentation
records. Visual approach playback and balance tuning remain D5 work.

- Route LOR/EOR `assemblyDockPenalty()` through the shared docking reliability helper.
- Make docking a named phase in reliability/debrief output.
- Gate `dock_latch` and related anomaly content on a real docking operation.
- Add a generalized presentation spec for capsule-to-lander/craft capture.

This proves the model without introducing long-lived orbital entities.

Suggested test: `test-docking-mission-phase.js` plus existing lunar architecture and anomaly suites.

### D2 — Capsule/pod to station

**Shipped 2026-08-15.** Orbital facilities now expose one visiting berth from their core Habitat and
two more per Docking Node, independent of permanent module ports. Player-created crew-rotation and
resupply missions plus flown LEO module deliveries reserve an exact berth and freeze an explicit
capsule/pod, station target, interface and transfer. Successful hard dock applies the typed transfer
once, then either releases for same-mission return or persists a station-local visitor with exact
berth/hull ownership. Surface-base cargo arrivals are explicitly presented as handoffs rather than
false orbital docks. Save v64 records the new ownership state.

- Add station visiting berths and occupancy separate from permanent module capacity.
- Target a station from crew-rotation, resupply and module-delivery missions.
- Support hard-dock transfer, same-mission undock/return and optional remain-docked state.
- Replace `spec.dock`'s module-only assumptions with actor/target/interface frozen specs.
- Keep existing module delivery cost, cargo mass, arrival and production behavior unchanged.

Suggested tests: `test-station-docking.js`, `test-docking-transfer.js`, and the existing station Slice
1–3 suites.

### D3 — Persistent orbit assets and separately launched craft

**Shipped 2026-08-15.** Launches may now deploy free capsules, cargo pods, and docking targets into a
canonical `state.orbitAssets[]` collection, and station-local visitors may be released into that same
owner without duplicating their hull. A later launch reserves one exact target interface, freezes
separate actor/target fitment, rechecks the live reservation, and converts a successful hard dock into
reciprocal links between two persistent craft. Failure/cancellation releases the target; removal
cancels only missions that own that target. Hull status `in-orbit`, save v65, and lifecycle auditing
enforce single ownership and reciprocal links. Fleet Registry deployment/rendezvous actions, the
global Outliner, and all Solar Map renderers derive from the same collection. Retry after approach,
undocking linked pairs, return/refuel/relocation, and transfer services remain D4.

- Add `state.orbitAssets[]`, hull ownership states and save-version documentation.
- Allow a launch or station undock to leave a free capsule, pod or target in orbit.
- Target that asset from a later launch and establish capsule-to-capsule/pod links.
- Extend Fleet Registry, Outliner and Solar Map markers from the same asset collector.
- Make target removal, abort, loss and stale reservation behavior deterministic and recoverable.

Suggested tests: `test-orbit-assets.js`, `test-vehicle-docking.js`, lifecycle audit, save/reload and
simultaneous-flight coverage.

### D4 — Persistent operations

**Shipped 2026-08-15.** `state.orbitOps[]` is the durable operation/receipt ledger for craft that
already exist in orbit. A rendezvous reserves exact ports on both assets, enters stationkeeping,
charges one recorded reserve increment per attempt, and may wave off, retry, soft-capture or hard-dock
without replaying a charge. Undock frees only the shared operation's ports; relocation and return
preserve exact hull ownership through their terminal disposition. Typed service actions transfer named
crew, numeric cargo and propellant only across compatible hard-dock services, while station crew
exchange, LEO-depot refueling and power/data service receipts provide the promised servicing seams.
Fleet Registry consoles expose the full loop. Save v66 and lifecycle auditing reject missing operation
owners, one-sided captures and malformed/replayed receipts.

- Retry from stationkeeping after a wave-off or soft capture.
- Undock, relocate, return and free the exact port.
- Transfer station crew, defined cargo and depot propellant.
- Add servicing/refueling hooks for later satellite and tug gameplay without building those epics now.

Suggested tests: `test-docking-operations.js`, replay/idempotency tests and arrival-order tests.

### D5 — Presentation, automation and balance pass

- Reuse the real actor vehicle snapshot and facility assembly scene rather than the current generic
  two-can illustration.
- Maintain Canvas fallback and reduced-motion behavior.
- Add first-docking ceremony, routine skip rules and readable telemetry for range, closing rate,
  reserve and capture state.
- Browser-check capsule/capsule, capsule/station and pod/station cases at desktop breakpoints.
- Tune reliability and reserve costs only after the full loop can be played.

Suggested tests: presentation source contracts plus Firefox/WebGL acceptance; do not pixel-lock the
scene in headless tests.

## Protected baselines

- Non-docking missions produce identical physics, costs, reliability and lifecycle results.
- Existing first-of-type module delivery remains fly-or-contract, with unchanged prices and cargo
  masses until a deliberate balance pass says otherwise.
- Permanent station production still comes only from `facilityModuleList()`.
- Cosmetic `assemblyLayouts` never authorize a docking or mutate simulation state.
- `activeFlights[]` remains the transit/arrival queue; it does not become a miscellaneous fleet list.
- Every hull, berth, transfer and reward has one durable owner and settles exactly once across save,
  reload, skipped presentation and repeated clicks.
- A port reservation cannot strand the station permanently after target loss, abort or stale save.

## Explicit non-goals

- Manual six-axis piloting, orbital collision physics or continuous n-body rendezvous simulation.
- Recreating every historical docking standard or adapter lineage.
- Walkable interiors, EVA traversal or a multiple-named-crew rewrite.
- Surface landing, rover/base attachment or treating orbital delivery to a surface base as a literal
  surface dock.
- Making Station 3D layout coordinates authoritative for production or compatibility.
- Building satellite servicing, tourism, full cargo manifests or orbital shipyards inside this epic;
  docking supplies seams for them later.
- Enabling `BENCH_V2` without its separate human playtest gate.

## Principal risks

- **Double resolution:** state changes in both mission settlement and animation. Prevent with one
  transaction-owned simulation settlement and read-only presentation.
- **Hull ownership drift:** a vehicle appearing in active flight, orbit and station at once. Prevent
  with lifecycle audit coverage before D3 UI work.
- **Port deadlock:** stale reservations after a target disappears. Reservations must have an exact
  operation owner and deterministic release paths.
- **Player overload:** interface standards becoming inventory trivia. Keep three standards, explain
  incompatibility in plain language and offer adapters where the tradeoff is meaningful.
- **Balance regression:** adding visitor occupancy accidentally reducing current station production or
  module cap. Keep temporary berths separate and assert existing economics exactly.
- **False visual truth:** generic art showing a compatible seal the simulation did not authorize.
  Render from the frozen interface/link record.

## Model and reasoning guidance

- Overall architecture and D2–D4 implementation: GPT-5.6-sol with xhigh reasoning.
- D0 pure helpers and focused test wiring: GPT-5.6-sol with high reasoning is sufficient.
- D5 visual tuning: GPT-5.6-sol high for implementation; move to xhigh when evaluating interaction,
  balance or conflicting visual/technical constraints.

Do not start all slices in one change. D0 and D1 establish the authority; D2 delivers the first
player-facing loop; D3 is the largest state/lifecycle seam and should land independently.
