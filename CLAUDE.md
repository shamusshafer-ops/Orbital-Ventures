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

## Next task

Implement visual **multi-stage separation** in the Cape 3D flight renderer. The physical
trajectory already burns and drops every stage's dry mass in `cape3dTrajectoryPlan`; the visual
rocket remains one mesh. Split it into stage meshes, detach spent stages at the real burn/staging
times, let them coast/fall under gravity, and ignite/display the following stage. Keep the
authoritative sim and outcome logic untouched.

## Verification

```bash
node build.js
node tests/test-build-parity.js
```

Focused harness commands use `tests/harness.js + build/game.js + test file`, e.g.:

```bash
node -e "const F=require('fs'); const a=F.readFileSync('tests/harness.js','utf8'), b=F.readFileSync('build/game.js','utf8'), c=F.readFileSync('tests/test-flight3d-foundation.js','utf8'); require('vm').runInThisContext(a+'\n'+b+'\n'+c);"
```

Also run `git diff --check`. Generated files are `build/game.js`, `index.html`, and
`orbital-ventures.html`; edit `src/` and run `node build.js`, never edit the generated HTML.
