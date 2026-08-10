# Gate 5 evidence record

**Status:** implementation and automated acceptance are complete. The
long-standing known-red trajectory suite is promoted to a normal enforced pass
(13/31 → 31/31), the full headless sweep has no known-red and no unexpected
failures, and both real browser engines are green.

## Checkout identity and scope

- Capture date: `2026-08-10`.
- Branch: `main`; parent commit: `bbdb9523c820f2323b26370192db991872f3062f`.
- Work is captured against the working tree on top of that parent, pending the
  closure commit; the content fingerprint below identifies the exact bytes.
- Contract: [GATE-5-CONTRACTS.md](../GATE-5-CONTRACTS.md).
- Content fingerprint (authoritative source/tests/assets and Gate 1-3/5
  contracts; generated evidence excluded):
  `2d7932884f82cf0edeefd7ccc7e79c8b0af995acb42a5037f483cf792c94e1bd`
  (196 files, 15,768,615 bytes). The fingerprint scope now also covers the
  Gate 3 and Gate 5 contract docs (Gate 3 had never been included).
- Machine-readable evidence:
  [headless/build results](gate5-headless-results.json),
  [Firefox browser results](gate5-browser-results.json), and
  [Chromium browser results](gate5-browser-chromium.json).

## What Gate 5 changed

The physics-less fallback in `cape3dLaunchProfile` (used by replay/old specs that
predate the per-vehicle physics record) was three independent parametric curves
and had left `tests/test-flight3d-trajectory.js` red at 13/31 since the
2026-07-19 trajectory rework. It is now a single **integrated gravity turn**
(`cape3dParametricPlan` / `cape3dParametricSample`): a pitch program γ(p) and a
speed program v(p) integrated as `d·alt = v·cosγ` and `d·downrange = v·sinγ`, so
the nose direction is the velocity direction by construction. Orbital ascents
hit the 185 km MECO target and insert near-horizontal on an altitude S-curve;
suborbital flights burn out below apogee then coast on a ballistic arc that
crests ~42% into the coast and splashes down. The engine is off through the
coast, smoke is a dense-atmosphere effect, and vacuum shading is altitude-based.

The physics-integrated path used by live launches was left behaving as before;
it only gained the two additive projection fields (`apogeeKm`, `splash`) so both
paths expose the same contract.

## Contract lanes

Commands:

```bash
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-gate3-contracts.js
node tests/run-gate0-evidence.js --output docs/evidence/gate5-headless-results.json
```

Recorded results:

- Gate 1 contracts: `5/5` suites pass; `102/102` checks.
- Gate 2 contracts: `3/3` suites pass; `49/49` checks.
- Gate 3 contracts: `3/3` suites pass; `96/96` checks.
- Gate 0 evidence sweep: `142/143` suites pass; `0` known red, `1` known skip
  (the F4 forward test), `0` unexpected. `test-flight3d-trajectory.js` is now a
  normal pass (`31/31`); the known-red machinery was removed from the runner.
- `test-flight3d-foundation.js`: `58/58` (the fallback's splashdown snapping and
  orbital replay downrange were kept green through the rewrite).
- Build parity: `build parity ok`; `3/3` build parity checks; `2/2` texture
  embedding checks. `git diff --check`: clean.

## Real-browser lane

```bash
node tests/run-browser-gate0.js --browser firefox  --json-output docs/evidence/gate5-browser-results.json
node tests/run-browser-gate0.js --browser chromium --json-output docs/evidence/gate5-browser-chromium.json
```

Both engines: `2 passed, 0 unexpected, 0 unavailable`.

- Firefox (geckodriver 0.37.0, snap Firefox) and Chromium (Chrome for Testing
  151.0.7922.77 / ChromeDriver 151), each covering:
  - `G0-B01`: exact launched hull and decision remained resumable across
    Skip/reload.
  - `G0-B08`: rapid activation of one DOM control was idempotent.
- Chromium was run from a local, root-free Chrome-for-Testing download with
  NSS/NSPR/ALSA staged from extracted Ubuntu packages (`OV_CHROMIUM_BINARY` /
  `OV_CHROMIUM_WEBDRIVER_BINARY` / `OV_CHROMIUM_NO_SANDBOX=1` /
  `LD_LIBRARY_PATH`). These browser checks exercise DOM/save flows, not the
  Three.js trajectory canvas; they confirm the rebuilt bundle still loads and
  behaves in a real browser.
