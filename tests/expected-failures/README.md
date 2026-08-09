# Gate 0 expected failures

These fixtures pin known release blockers without adding knowingly red files to
the required `tests/test-*.js` suite. Each fixture asserts the desired invariant
and exits non-zero while the linked `G0-B*` defect is present.

There are currently no quarantined Gate 0 blockers.

Promoted in Gate 1: `G0-B06` (exact-hull primary action and immediate ownership refresh) and `G0-B07` (staged build/flight/carry quote disclosure) now run as positive checks in `test-gate1-lifecycle-regressions.js`.

Promoted in Gate 2: `G0-B01`, `G0-B02`, `G0-B03`, `G0-B04`, and
`G0-B08` now run as positive transaction/resume/settlement checks in
`tests/run-gate2-contracts.js`. Their old reproduction files remain as historical
fixtures but are no longer quarantine entries.

Promoted in Gate 3: `G0-B05` now runs as a positive exact-path regression in
`tests/test-gate3-opening-economy.js`. Its old reproduction file remains as a
historical fixture but is no longer a quarantine entry.

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
