# Gate 5 — Honest launch trajectory (physics-less profile)

Gate 5 makes the physics-less presentation trajectory tell the truth. It
promotes the long-standing known-red suite `tests/test-flight3d-trajectory.js`
(13/31 → 31/31) to a normal, enforced pass. It changes only the visual/telemetry
projection for specs that carry no per-vehicle physics record; it does not touch
the authoritative sim, launch physics, reliability, outcomes, or the
physics-integrated path used by live launches.

## Why this gate exists

`cape3dLaunchProfile` has two projection paths:

1. an **integrated** path (`cape3dTrajectoryPlan` / `cape3dTrajectorySample`)
   used when a spec carries a frozen per-vehicle `physics` record — this is what
   every live launch uses; and
2. a **fallback** path for replay/old specs that predate the physics record.

The 2026-07-19 trajectory rework introduced the integrated model but left the
fallback as three independent parametric curves (altitude, downrange, pitch),
so a physics-less spec produced a nose that did not track its velocity vector, a
suborbital arc that never crested a real apogee or reached the water, and an
engine that burned through the ballistic coast. That suite has been red
(13/31) ever since. Gate 5 rewrites the fallback as one integrated gravity turn
so the physical *shape* is honest regardless of whether a physics record exists.

## Locked product rules

- Gate 5 is a **presentation contract only**. No authoritative sim value —
  rocket equation, Δv, reliability distribution, weather, outcome, recovery,
  hull, mission scope, or any Gate 1–3 transaction rule — is read or changed.
- The physics-integrated path (live launches) is the reference and is left
  behaving as before. The fallback is brought up to the same physical shape; it
  never overrides the integrated path when a physics record is present.
- The model is deterministic: identical `(reqDv, isOrbital)` inputs produce
  identical trajectory tables (`cape3dParametricCache`), so a replay renders the
  same arc every time.

## Trajectory model (fallback)

The fallback integrates a single gravity turn from a pitch program γ(p) (angle
from vertical) and a speed program v(p):

- `d·altitude = v·cos γ · dp` and `d·downrange = v·sin γ · dp`, so the nose
  direction (γ) **is** the velocity direction by construction — a true
  zero-angle-of-attack gravity turn (worst nose-vs-velocity error < 2.5°).
- **Off the pad:** a vertical hold (γ = 0, zero downrange) clears the tower, then
  a continuous, monotone smoothstep pitch-over to a mission-energy-scaled maximum
  turn (gentle onset < 5° at 10% of ascent; ≤ 3.2° change per 2% of ascent).
- **Altitude:** scaled so orbital MECO is the 185 km target and insertion is
  near-horizontal (flight-path angle > 77° from vertical, an S-curve that
  flattens toward insertion). Suborbital burnout deliberately sits below apogee.
- **Suborbital coast:** a ballistic arc whose apogee lands ~42% into the coast at
  the mission's apogee band (`apogeeKm`), horizontal at apogee, nose dropping
  below the horizon afterward, downrange growing monotonically, and a splashdown
  at sea level at the end of the coast.
- **Energy scaling:** a higher-energy lob pitches farther over and flies farther
  downrange relative to its altitude than a low-energy sounding rocket.

## Truthful engine and atmosphere effects

- The engine is off through the ballistic coast — plume and smoke read zero, with
  only a brief shutdown fade right at burnout.
- Smoke is a dense-atmosphere effect and disappears above ~13 km; vacuum shading
  is altitude-based (none low, saturated near the Kármán line).
- A metre-scale hop never shows vacuum effects and never pitches over, but still
  climbs visibly clear of its pad.

## Projection field contract

Both projection paths expose `apogeeKm` and a boolean `splash` alongside the
existing `altitudeKm`, `downrangeKm`, `speedMps`, `pitch`, `targetAltitudeKm`,
`plume`, `smoke`, `vacuum`, and `splashProgress`. Splashdown snaps altitude to
exact sea level (0) and `splashProgress` to 1 at the end of the coast.

## Required evidence

```text
node build.js --check
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-gate3-contracts.js
node tests/run-gate0-evidence.js --output docs/evidence/gate5-headless-results.json
node tests/run-browser-gate0.js --json-output docs/evidence/gate5-browser-results.json
```

Gate 5 acceptance requires:

- `tests/test-flight3d-trajectory.js`: 31/31 (promoted from known-red);
- `tests/test-flight3d-foundation.js` and every other flight3d suite: green;
- Gate 1: 5/5 suites, 102/102 checks; Gate 2: 3/3, 49/49; Gate 3: 3/3, 96/96;
- full headless sweep: no known-red and no unexpected failures (known skip: F4
  forward test only);
- Firefox and Chromium: positive Skip/reload and same-control idempotency flows;
- `git diff --check` and deterministic build parity.
