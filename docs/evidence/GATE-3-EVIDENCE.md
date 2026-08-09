# Gate 3 evidence record

**Status:** implementation and automated acceptance are complete, the real
Firefox browser lane is green, and the manual browser play-through is tested.
Both final independent re-audits have now run: the design re-audit returned
BLOCK on a payout exploit and the space/aesthetic re-audit returned
APPROVE-WITH-CONDITIONS. Every finding has been remediated and re-validated
(see "Final re-audits and remediation" below).

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
- Gate 3 contracts: `3/3` suites pass; `96/96` checks (adds an exploit-closure
  regression — sponsored success must capture its payout to the estate, not
  Capital — and a tuning regression for the deficit-scaled reputation and
  cycle-escalated legacy penalties).
- Gate 0 evidence sweep: `141/143` suites pass; `1` known red, `1` known skip,
  `0` unexpected.

## Real-browser lane

Codex's checkpoint could not run this lane: its sandbox denied loopback binding
(`listen EPERM`) and honestly recorded the block. Re-run in an environment that
permits loopback:

```bash
node tests/run-browser-gate0.js --browser firefox --json-output docs/evidence/gate0-browser-results.json
```

Both engines: `4 passed, 0 unexpected, 0 unavailable`.

- Firefox (geckodriver 0.37.0) and Chromium (Chrome for Testing 151.0.7922.77 /
  ChromeDriver 151), each covering:
  - `G0-B01`: exact launched hull and decision remained resumable across
    Skip/reload.
  - `G0-B08`: rapid activation of one DOM control was idempotent.
- Chromium was run from a local, root-free Chrome-for-Testing download with
  NSS/NSPR/ALSA staged from extracted Ubuntu packages (`OV_CHROMIUM_BINARY` /
  `OV_CHROMIUM_WEBDRIVER_BINARY` / `OV_CHROMIUM_NO_SANDBOX=1`).

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

## Final re-audits and remediation

Both re-audits (blocked at codex's checkpoint by the agent service usage limit)
ran on `2026-08-09` against commit `223c6e9`. All findings are remediated and
the full suite re-validated.

### Design re-audit — verdict was BLOCK (now cleared)

1. **[BLOCKER — fixed] Deficit-shedding exploit.** The escrow-funded sponsored
   First Flight credited its ~$1.6M success payout to player Capital
   (`finalizeLaunch`), and `settleSponsoredAttempt` never clawed it back, making
   reorganization net cash-positive. Fixed: the sponsored funding now records
   `capitalBefore` at launch, and the success branch captures the flight revenue
   to the restructuring estate and reopens Capital at that baseline — mirroring
   `settleAdministrativeArrival`. Guarded by a new contract check
   (`sponsored success captures the flight payout to the estate rather than
   player Capital`).
2. **[HIGH — tuned] No floor on the forgiven deficit.** The reputation penalty
   now scales with the deficit forgiven:
   `repLoss = min(rep, max(10, round(0.15*rep)) + round(2 * deficitForgiven))`
   (`deficitForgiven` in $M). A $20M shed now costs ~+40 reputation on top of
   the base, so a large wipe is no longer priced like a rounding error.
3. **[MED — tuned] Unlimited repeat cycles.** The legacy penalty escalates per
   cycle (`10 * cycleIndex`: 10, 20, 30, …), making each repeat a worsening
   permanent mark; the cumulative invariant is now triangular
   (`10 * n(n+1)/2`). The acceptance receipt also records `deficitForgiven`,
   `cycleIndex`, and `daysSinceLastReorganization` for further tuning. Both
   changes were made deliberately (user-authorized override of the "measure
   first" default) and are guarded by contract checks.
4. **[MED — fixed] Restructuring estate was invisible.** The administration
   status panel now shows an "Estate deficit held" metric plus a disclosure line
   for captured deferred-arrival cash.
5. **[LOW — fixed] Standdown read as inert.** The standdown modal now shows day
   `elapsed`/`total`, remaining days, rival-months applied, and a progress %.

### Space/aesthetic re-audit — verdict APPROVE-WITH-CONDITIONS (conditions met)

1. **[HIGH — fixed] Escape orphaned the flight-celebration payoff.** The
   success modal is now locked; `closeReorganizationResult()` clears the lock
   before hiding, so Escape can no longer bypass the deferred celebration.
2. **[LOW-MED — fixed] Restricted-support color semantics.** The operating
   support chip now uses `--readout` (informational cyan) instead of success
   green `--ok`.
3. **[LOW — fixed] Over-wide confirmation modal.** The division-training
   confirm is now a narrow modal with an even 3-up metric grid.

### Balance tuning note

Findings D2/D3 are now implemented as real balance changes (deficit-scaled
reputation, cycle-escalated legacy), a deliberate user-authorized override of
the handoff's "measure first" default. The chosen coefficients
(`repDeficitRate = 2` per $M; `legacyPenalty = 10` × cycle) are first estimates;
the acceptance-receipt telemetry (`deficitForgiven`, `cycleIndex`,
`daysSinceLastReorganization`) remains in place so they can be refined against
play data.
