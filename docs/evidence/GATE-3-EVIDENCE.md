# Gate 3 evidence record

**Status:** implementation and automated acceptance are complete, the real
Firefox browser lane is green, and the manual browser play-through is tested.
The final independent design and space/aesthetic re-audits remain the
outstanding sign-off gate (see [handoff](../HANDOFF-CLAUDE-CODE-GATE3.md)).

## Checkout identity and scope

- Capture date: `2026-08-09`.
- Branch: `main`.
- Commit: `83838b26216fa94cc59d05cade85284af9171225`.
- Contract: [GATE-3-CONTRACTS.md](../GATE-3-CONTRACTS.md).
- Machine-readable evidence:
  [headless/build results](gate0-headless-results.json) and
  [Firefox browser results](gate0-browser-results.json).
- Content fingerprint (authoritative source/tests/assets and Gate 1-3
  contracts; generated evidence excluded):
  `3ffdc14e27e8b942c6fe4e54635613cec22a59d482a6c1c2fc752b2851b52d4d`
  (194 files, 15,730,425 bytes).

## Contract lanes

Commands:

```bash
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-gate3-contracts.js
node tests/run-gate0-evidence.js
```

Recorded results:

- Gate 1 contracts: `5/5` suites pass; `102/102` checks.
- Gate 2 contracts: `3/3` suites pass; `49/49` checks.
- Gate 3 contracts: `3/3` suites pass; `94/94` checks.
- Gate 0 evidence sweep: `141/143` suites pass; `1` known red, `1` known skip,
  `0` unexpected.

## Real-browser lane

Codex's checkpoint could not run this lane: its sandbox denied loopback binding
(`listen EPERM`) and honestly recorded the block. Re-run in an environment that
permits loopback:

```bash
node tests/run-browser-gate0.js --browser firefox --json-output docs/evidence/gate0-browser-results.json
```

- Firefox (geckodriver 0.37.0): `2 passed, 0 unexpected, 0 unavailable`.
  - `G0-B01`: exact launched hull and decision remained resumable across
    Skip/reload.
  - `G0-B08`: rapid activation of one DOM control was idempotent.
- Chromium arm not run in this environment (no Chromium binary installed).

## Manual browser play-through

**Tested** — `2026-08-09`, Firefox, commit `83838b2`. Verified the Gate 3
surfaces called out in the handoff:

- Division training crosses the capitalization threshold once: confirmation
  shows immediate price and `$0.25M/month`, adds a single recurring finance
  line, and repeat training adds no second charge.
- Insolvency triggers the two-step Program Reorganization confirmation;
  negative Capital transfers to the restructuring estate and player Capital
  reopens at `$0.00M` with explicit penalty and debt receipts.
- The 360-day administrative clock suspends ordinary economy/research/
  production/time controls; recovery article is the canonical uncrewed A-4
  First Flight.
- The 90-day operating-support ledger is visible in the Command Center /
  finances and reads as restricted (never spendable Capital).
- Pre-liftoff weather recycles the same attempt and hull; a resolved
  non-success closes the attempt and escrow, then a fresh 360-day cycle is
  offered.

## Outstanding sign-off

- Final independent design re-audit.
- Final independent space/aesthetic re-audit.

Both were blocked at codex's checkpoint by the agent service usage limit. Treat
these two re-audits as the remaining sign-off gate before claiming unanimous
Gate 3 approval.
