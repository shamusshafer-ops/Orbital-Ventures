# Gate 0 expected failures

These fixtures pin known release blockers without adding knowingly red files to
the required `tests/test-*.js` suite. Each fixture asserts the desired invariant
and exits non-zero while the linked `G0-B*` defect is present.

| Baseline | Quarantined reproduction |
|---|---|
| `G0-B01` | Skip before a future decision destroys its animation owner. |
| `G0-B02` | A production-path weather hold loses ownership of its exact consumed hull across save/reload; lifecycle-forced autosave is an auxiliary check. Later launch-decision variants remain uncovered. |
| `G0-B03` | A safe weather scrub evaluates game-over while the launch transaction still owns an in-flight hull. |
| `G0-B04` | A seeded successful opening can finish with positive cash but retain a stale `over` latch; bridge loans are not exhausted in this fixture. |
| `G0-B05` | Recommended Static Fire Test Program research plus the prominently offered bench static fire leaves an enabled, displayed-affordable Fly action blocked. This does not claim all eventual recovery routes are exhausted. |
| `G0-B06` | The exact Hangar hull's Fly action is ghost-styled and remains stale across ownership transfer. Viewport burial is not asserted here. |
| `G0-B07` | Commitment surfaces omit the distinction between immediate cash and later operating burn/carry; the displayed ready-hull launch price remains below its affordability gate. |
| `G0-B08` | Two deliberate build-mutation calls expose a missing idempotency contract. This is supporting evidence only; real same-control repeated DOM activation is covered separately by the browser harness. |

Run every quarantine:

```bash
node tests/run-expected-failures.js
```

Run one issue:

```bash
node tests/run-expected-failures.js --issue G0-B01
```

The runner accepts only reserved exit code 42 with an exact structured
expected-failure result. Setup failures, ordinary exit 1, signals, timeouts,
crashes, malformed results, and unexpected passes are errors. Remove a fixed
case from quarantine or promote it into the required suite.
