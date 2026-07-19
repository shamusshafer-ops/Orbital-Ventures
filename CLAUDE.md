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

## Visual multi-stage separation — SHIPPED (Claude)

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

NOT browser-verified: the sandbox has no WebGL/THREE, so the mesh/reparent/fall-physics path has
never actually rendered — only the pure math is headless-tested (`tests/test-flight3d-staging.js`,
29 checks: stageEvents recording for 1/2/3-stage and boosters+stages vehicles, ordering, and the
separation-state time mapping/edge cases). A real-browser playtest should confirm: pieces detach at
the right moments, fall away cleanly without popping, the flame re-anchors to the new base, and a
second launch after a first (mesh reuse) still shows a complete rocket.

## Next task

Suggested: **booster/stage separation visual polish + a brief separation event in the Flight Card**,
OR pick up remaining **E4.7** scope (fold any remaining legacy 2D-canvas flight paths into the
Flight 3D adapter). Coordinate on which. If continuing staging: the detached-debris drift is
deliberately simple ballistic (no re-contact, no atmospheric tumble model) and debris is culled
3000 m below the pad — a polish pass could add a small separation flash/puff at the interstage and
a one-line "Stage 1 separation" beat on the always-visible Flight Card. Keep sim/outcome untouched.

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
