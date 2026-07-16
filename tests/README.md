# Headless test suite

The game now lives in `src/*.js` (seven plain classic-script modules loaded in
order into one shared global scope) plus `src/shell.html` (the page template).
`node build.js` (from the repo root) concatenates the modules into three
outputs: the release `orbital-ventures.html` (one inline `<script>`), the dev
`index.html` (one `<script src="src/X.js">` per module), and `build/game.js`
(the bare concatenated script body used by these tests). **`orbital-ventures.html`
is a generated build artifact — edit `src/`, not the HTML.**

These tests run that script body under plain Node — no browser — by stubbing
the DOM, canvas 2D context, Web Audio API, and localStorage well enough for the
game to boot, play, and render exactly as it does in a real browser.

`node build.js --check` is the read-only parity gate: it regenerates all three
outputs in memory and reports every stale or missing artifact without writing
files.

## Running a suite

Run the parity check first; rebuild only when it reports drift. Then concatenate
`build/game.js` **after** `harness.js` and **before**
the test file, and run the whole thing as one script (not `require()`d — the
game declares state with top-level `let`/`const`, which only true script-scope
concatenation exposes to the appended test code):

```bash
node build.js --check                                # read-only: ensure all generated outputs are current
node build.js                                        # regenerate outputs only when parity check reports drift
node tests/test-build-parity.js                       # isolated clean/stale/missing parity coverage
cat harness.js ../build/game.js test-regression.js > bundle.js
node bundle.js
```

`build/game.js` is byte-identical to the release inline script, so
`awk '/^<script>$/{f=1;next} /^<\/script>$/{f=0} f' ../orbital-ventures.html`
equals it exactly — a build-parity cross-check worth running if a `build.js`
emission bug is ever suspected.

Every suite ends with `console.log('N/M checks passed')` and a matching
process exit code (0 = all passed).

## Suites

| File | Covers |
|---|---|
| `test-livery-esc.js` | H1 stored-XSS regression: esc() fundamentals, hostile livery.name renders inert at the vehicle pop-out title sink, import path re-clamps user-string lengths. |
| `test-parts-bridge.js` | E3.0 make-or-break: part graph → stage-IR bridge reduces to the same stages the slider bench produces; Δv/TWR/liftoff/per-stage numerical equivalence + graph integrity + malformed-build handling. |
| `test-parts-render.js` | E3.1 read-only bench renderer: every part shape draws without throwing, stage-Δv/TWR overlay matches real physics (no drift from the E3.0-proven bridge), stage-label count is correct, malformed builds handled, geometry sanity, symmetry tolerance. |
| `test-parts-attach.js` | E3.2 model layer: open-node discovery, node compatibility (class+facing), attach/detach-takes-subtree, snap-target finding, soft warnings. |
| `test-parts-ui.js` | E3.2 interaction logic: palette rendering, click-attach auto-targeting + explicit select, drop→snap→attach path, interactive-render nodePos/markers. |
| `test-regression.js` | General smoke test: all difficulties boot, every scene tab renders, a long time-skip, a playthrough bot. Run this against *any* change as a baseline. |
| `test-materials.js` | The collapsed raw-materials market — dip-threshold gating, dip pricing, buy/no-op paths, save/load, render, outliner/glyph surfacing. |
| `test-station-operations.js` | Station operations — resupply contracts, crew assignment/rotation, maintenance condition, repair, and science output. |
| `test-contract-popout.js` | Contracts pop-out overlay and collapsible passive-contract categories. |
| `test-dept-a.js` | Org departments — structure + promotable leads, derived membership, balance-neutrality with no leads declared. |
| `test-dept-b.js` | Career progression — staff XP accrual, effective skill above hire-day base, department training investment. |
| `test-dept-c.js` | Succession + workforce planning — auto-succession on lead departure, unstaffed-department risk, era-scaled reliability penalty. |
| `test-pad-a.js` | Flight pop-out overlay, Slice A — the in-overlay pad phase (countdown/ignition ramp), the pad→ascent seam being frame-continuous, the retired two-container iso-liftoff. First suite to drive `animEnabled=true` rendering rather than the headless fast path. |
| `test-depart-b.js` | Flight pop-out overlay, Slice B — the deferred-departure "cruise begins / ETA" outro card (`spec.mode:'depart'`), driving the real `playMission`/`animLoop`/`endAnim` + `proceedLaunch` dispatch; the actual mission outcome still resolves on arrival, turns later. |
| `test-progress-unify.js` | F4 — the unified "what's happening now" surface (`#ccProgress` as a view of `outlinerItems()`, the retired UPCOMING chips / "Active R&D" stat line). **Work-in-progress: currently 16/34 — 18 checks fail on unfinished F4 behavior, a pre-existing state, not part of the 236-assertion baseline.** |

## Adding a new suite

Copy the `check()`/`pass`/`fail` pattern from any existing suite. If your
feature touches the animated flight overlay (`animEnabled=true`), see
`test-pad-a.js`'s `pumpFlight()` helper — it drives the real `animLoop`/
`endAnim` on a controlled virtual clock rather than reimplementing the phase
math, which is the more trustworthy way to validate render-path changes.

Always re-run the full suite set (a simple shell loop over all `test-*.js`
files) before pushing — each suite validates a different system, and a
change to shared code (state shape, a widely-called helper) can regress one
suite while you're focused on another.
