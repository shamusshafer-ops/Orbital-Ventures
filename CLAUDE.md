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

## Next task

Suggested: **booster/stage separation visual polish + a brief separation event in the Flight Card**,
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
