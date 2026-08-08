# Gate 0 expected failures

These fixtures pin known release blockers without adding knowingly red files to
the required `tests/test-*.js` suite. Each fixture asserts the desired invariant
and exits non-zero while the linked `G0-B*` defect is present.

| Baseline | Quarantined reproduction |
|---|---|
| `G0-B05` | Recommended Static Fire Test Program research plus the prominently offered bench static fire and build leaves the exact First Flight hull without launch runway. Gate 1 now disables the action and states the staged shortfall honestly; economy continuity remains owned by Gate 3. This does not claim all eventual recovery routes are exhausted. |

Promoted in Gate 1: `G0-B06` (exact-hull primary action and immediate ownership refresh) and `G0-B07` (staged build/flight/carry quote disclosure) now run as positive checks in `test-gate1-lifecycle-regressions.js`.

Promoted in Gate 2: `G0-B01`, `G0-B02`, `G0-B03`, `G0-B04`, and
`G0-B08` now run as positive transaction/resume/settlement checks in
`tests/run-gate2-contracts.js`. Their old reproduction files remain as historical
fixtures but are no longer quarantine entries.

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
