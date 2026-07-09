# Headless test suite

`orbital-ventures.html` embeds its entire game as one inline `<script>`. These
tests run that script under plain Node — no browser — by stubbing the DOM,
canvas 2D context, Web Audio API, and localStorage well enough for the game
to boot, play, and render exactly as it does in a real browser.

## Running a suite

The game's script must be extracted, then concatenated **after** `harness.js`
and **before** the test file, and the whole thing run as one script (not
`require()`d — the game declares state with top-level `let`/`const`, which
only true script-scope concatenation exposes to the appended test code):

```bash
awk '/^<script>$/{f=1;next} /^<\/script>$/{f=0} f' orbital-ventures.html > extracted-script.js
cat harness.js extracted-script.js test-regression.js > bundle.js
node bundle.js
```

Every suite ends with `console.log('N/M checks passed')` and a matching
process exit code (0 = all passed).

## Suites

| File | Covers |
|---|---|
| `test-regression.js` | General smoke test: all difficulties boot, every scene tab renders, a long time-skip, a playthrough bot. Run this against *any* change as a baseline. |
| `test-materials.js` | The collapsed raw-materials market — dip-threshold gating, dip pricing, buy/no-op paths, save/load, render, outliner/glyph surfacing. |
| `test-dept-a.js` | Org departments — structure + promotable leads, derived membership, balance-neutrality with no leads declared. |
| `test-dept-b.js` | Career progression — staff XP accrual, effective skill above hire-day base, department training investment. |
| `test-dept-c.js` | Succession + workforce planning — auto-succession on lead departure, unstaffed-department risk, era-scaled reliability penalty. |
| `test-pad-a.js` | Flight pop-out overlay, Slice A — the in-overlay pad phase (countdown/ignition ramp), the pad→ascent seam being frame-continuous, the retired two-container iso-liftoff. First suite to drive `animEnabled=true` rendering rather than the headless fast path. |

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
