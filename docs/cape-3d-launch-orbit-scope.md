# Cape 3D launch, ascent, and orbit scope

## Objective

Extend the enabled Cape 3D scene into the existing launch and flight interfaces without changing mission outcomes, timing, controls, or save data. The 3D presentation remains a renderer over the current deterministic simulation—not a second flight model.

## Shared rendering contract

- Keep the existing simulation and flight phase/progress state authoritative.
- Preserve one Cape renderer while the vehicle remains within the pad/ascent envelope; do not create another WebGL context for the pop-out.
- Transfer only a presentation snapshot: vehicle shape, active pad, weather/sky time, flight phase, normalized progress, camera preset, and effects intensity.
- Retain the current 2D canvas flight route as the no-WebGL fallback.

## Sequence

1. **Pad hold and countdown** — Remount Cape into the launch overlay, lock facility selection, animate pad lamps, venting, and service-arm clearance from the existing countdown fraction.
2. **Ignition and liftoff** — Drive plume, smoke, camera shake, and tower clearance from existing pad/liftoff progress. Use the same state-derived rocket already standing on the pad.
3. **Near-field ascent** — Move the vehicle along a deterministic visual ascent spline. It is camera/render-only and cannot alter physics, mission timing, or outcomes.
4. **High-atmosphere handoff** — Cross-fade Cape terrain to a curved-Earth atmosphere shell, retaining vehicle and plume. Dispose Cape only after the ascent scene is established.
5. **Orbit and mission view** — Reuse the Solar System Three renderer's existing ephemeris. Show the craft on its local orbit or transfer path; arrivals and mission events remain simulation-driven.
6. **Result/return** — Return to the existing outcome and mission UI; 3D never owns risk rolls, contracts, or time advancement.

## Scene modules

| Module | Reuse | New presentation work |
|---|---|---|
| Pad | Cape facility/rocket meshes and day/night state | service arm, venting, ignition plume, launch cameras |
| Ascent | rocket stage shape/data | Earth curvature, atmosphere, spline camera, pooled smoke/fire |
| Orbit | existing 3D body meshes and ephemeris | craft mesh, local-orbit ribbon, maneuver/arrival callouts |
| UI | current launch overlay and skip/close behavior | compact phase readout and equivalent accessibility controls |

## Performance and safety gates

- One active Three renderer at a time; remount Cape during pad phase, then replace it during high-atmosphere handoff.
- Pool particles and use fixed geometry; do not allocate smoke, stars, or path meshes every frame.
- Limit shadows to pad/low ascent. Disable terrain shadows after the atmosphere handoff.
- Provide a quality tier for shadow size, particles, clouds, and atmosphere samples.
- Test normal launch, deferred departure, crewed flight, failed outcome, no-Three fallback, and pop-out transitions.

## Suggested implementation slices

1. Presentation-state adapter and launch-overlay renderer lifecycle.
2. Pad countdown, lighting, venting, plume, and liftoff camera.
3. Ascent scene/handoff and reusable pooled effects.
4. Orbit renderer integration and mission callouts.
5. Browser performance, fallback, and visual acceptance pass.
