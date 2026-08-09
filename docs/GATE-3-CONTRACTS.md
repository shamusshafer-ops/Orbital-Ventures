# Gate 3 — Economic continuity and an honest opening

**Status:** locked implementation contract. **Authority:** Gate 2 commit
`cc50c3c`. Gate 3 promotes G0-B05 without changing launch physics, vehicle
reliability, mission outcomes, or Gate 2 transaction ownership.

## Product decision

Standard campaigns are always recoverable. Insolvency may impose lost time,
reputation, public support, legacy, failed hardware, and rival progress, but it
may not permanently end a campaign. Permanent insolvency is available only
when a future campaign setup explicitly selects Ironman. Gate 3 persists and
enforces that rule seam, but the current new-game screen creates Standard
campaigns only; it does not yet expose an Ironman selector.

Gate 3 uses two separate repairs:

1. The opening Static Fire path stops charging an unchosen research-division
   operating cost. Project experience alone has no new upkeep; the first
   explicit training investment activates and discloses the division's
   `$0.25M/month` standing cost.
2. Settled non-Ironman insolvency offers a sponsor-controlled **Program
   Reorganization**. It is not unrestricted cash, an opening subsidy, or a
   bypass around the normal launch simulation.

## G0-B05 root repair

The deterministic seed-7 Engineer path currently completes Static Fire Test
Program research, performs the prominent `$0.35M` bench firing, builds one
First Flight article, and reaches rollout with `$0.25M` against a displayed
`$0.51M` flight requirement.

The shortfall is caused by `completeResearch()` giving the Structures &
Production Division one experience point and `empireOpex()` treating that
experience as if the player had deliberately established a new `$0.25M/month`
standing organization. The research purchase discloses neither that commitment
nor its effect on the later launch reserve. It also contradicts the existing
claim that fresh-company empire opex is zero.

Gate 3 does **not** add an opening grant, waive the static-fire charge, increase
starting capital, reduce launch reserve, or inflate First Flight payout. It
changes division cost ownership:

- Every division has a core team covered by base overhead.
- Completed projects may add experience and morale without activating division
  opex.
- Breakthroughs and ordinary morale ticks may write division state without
  activating division opex.
- The first explicit Training action raises the division above its baseline
  skill (`skill > DIV_SKILL0`) and activates exactly `$0.25M/month`. This is a
  derived predicate; Gate 3 adds no persisted `expanded` field.
- Later training in that division raises skill but never adds a second division
  charge.
- The first expansion action must disclose both its immediate price and the
  recurring charge before mutation.

With the experience-only charge removed, the locked seed-7 path is expected to
reach rollout with about `$0.75M` against about `$0.26M` of post-research flight
burn and reserve. Tests own the exact values and rounding; the invariant is that
the exact ready hull is flyable through the same quote authority.

## Insolvency eligibility and ordering

Program Reorganization is offered only after insolvency is real and ownership
is safe:

- `state.money < 0` after all foreground launch mutation and settlement work;
- no unresolved foreground Gate 2 transaction phase may be bypassed;
- no pending outcome, decision, ledger effect, or hull disposition may be
  discarded to enter reorganization; and
- an ordinary campaign may take an available bridge loan instead.

Foreground transaction terminal requests remain deferred exactly as Gate 2
specifies. Reorganization eligibility is derived only after the transaction
settles or releases. A successful payout that restores solvency suppresses the
offer.

`campaignRules.ironman` is the persisted, immutable campaign-rule seam. Current
player-created and migrated campaigns are Standard (`false`). A synthetic or
future campaign created with `true` retains the existing limited, optional
bridge loans but suppresses Program Reorganization; permanent failure is
therefore possible only for such a campaign. Exposing that future setup choice
is outside Gate 3.

## One reorganization cycle

Every accepted Program Reorganization receives a fresh monotonic id. A cycle
has the following phases:

```text
offered
  ├─ bridge loan chosen ───────────────> ordinary play
  ├─ declined in Ironman ──────────────> terminal
  └─ accepted
       -> suspended
       -> stand-down (360 days)
       -> article-authorized
       -> build / prepare / launch      [ordinary Gate 2 ownership]
       -> settling
            ├─ success ────────────────> reserve-active -> closed-success
            └─ any non-success ────────> closed-non-success -> new offer
```

Acceptance applies once per cycle:

- advance a narrow stand-down clock by exactly `360` campaign days;
- let rival programs advance over those same dates;
- subtract reputation by
  `min(currentRep, max(10, round(0.15 * currentRep)))`;
- subtract `10` public-support points, clamped to the ordinary support bounds;
- apply `-10` legacy points through the explicit persisted `legacyPenalty`
  accumulator, never by rewriting unrelated history; and
- on the first accepted reorganization in the campaign only, perform the
  one-time creditor workout below.

The penalty values shown to the player are the resolved values. At reputation
below 10, the formula removes the remaining reputation rather than making it
negative.

### One-time creditor workout

The game has no bridge-loan principal balance; it models only permanent monthly
debt service. Gate 3 must not claim that principal was repaid or forgiven.

On the first accepted reorganization only:

```text
new loanInterest = round2(old loanInterest * 0.5)
debtRenegotiated = true
```

Later cycles cannot ratchet the value lower. Prior bailout/loan-use history is
unchanged, and later optional loans add their ordinary debt service. This is a
one-time reduction in the game's recurring debt-service abstraction, not debt
erasure.

## Global suspension and the narrow clock

There is one global reorganization suspension, active only from acceptance
until the sponsored attempt settles. It avoids a new per-staff, per-facility,
per-contract mothball/reactivation subsystem.

During the 360-day stand-down:

- calendar/date and rivals advance;
- ordinary player recurring income and expenses do not accrue;
- R&D, unrelated production, facilities, contracts, markets, staff, morale,
  materials, supplies, and ordinary event clocks do not progress;
- no unrestricted capital is created or consumed; and
- a due deferred arrival interrupts the narrow clock through its existing Gate
  2 foreground owner before administration can continue.

After stand-down, the suspension remains active while the one sponsored article
builds, prepares, flies, and settles. Only that article's normal hardware,
time, test, launch, and transaction work progresses; unrelated campaign systems
remain paused. Rivals and the calendar continue through the real build and
flight time.

This suspension is a simulation abstraction of creditor/sponsor protection and
custodial operation. It does not claim that inhabited facilities were literally
abandoned or that real staff could be furloughed without consequence.

### Deferred-flight ownership

A foreground transaction must settle before entry, but the campaign may contain
already-deferred flights whose Gate 2 owner lives on `activeFlights`.
Reorganization must preserve those records and their exact transaction,
mission, hull, decision, outcome, and arrival ownership.

Deferred flights do not freeze and no arrival or deadline date is shifted. The
narrow clock advances only to the next due arrival. A due logistics delivery
settles normally. A due mission arrival acquires the exact Gate 2 foreground,
UI, and transaction ownership already defined for it, interrupting sponsor
administration. After the player resolves that arrival and Gate 2 releases its
owner, the same reorganization resumes toward its unchanged stand-down target.
No arrival is removed, re-rolled, duplicated, delayed, or given a second owner.

## Sponsored article and restricted escrow

After the stand-down, the sponsor authorizes one deterministic
**return-to-flight mission**. Player copy must not call it a “recovery mission,”
which conflicts with physical vehicle recovery.

The mission is always the authored, uncrewed **First Flight** flown by one fresh
article built from the canonical opening A-4 design. It does not reuse an
existing hangar hull, adapt to the player's current Bench design, or choose a
cheaper mission. The authority freezes that exact mission, design fingerprint,
quote, order, and eventual hull identity. Ordinary physics and pad gates still
validate the article before authorization and again before launch. The escrow
authorizes only the displayed amount required for that exact article's
hardware, flight/test operations, operating carry, and bounded weather carry.

Restricted escrow:

- is displayed separately from Capital;
- cannot buy research, staff, facilities, materials, stock, partnerships,
  training, or unrelated hardware;
- cannot change mission, design scope, or article after authorization;
- follows ordinary manufacturing time, test time, launch timing, weather,
  physics, reliability, decisions, failures, hull lifecycle, receipts, and Gate
  2 transaction checkpoints; and
- closes with the sponsored attempt's settlement.

The escrow is not a reliability guarantee. A new article has a new exact order
and hull; duplicate request ids may not create another article or escrow debit.

## Success, non-success, and retry

Only an ordinary successful mission settlement completes reorganization.
Abort, partial, loss, strand, recall, or any other resolved non-success closes
the current cycle and consumes its escrow. A preflight adverse-weather
stand-down is different: it does not settle the mission, and it recycles the
same article inside the same attempt after debiting the bounded weather carry.

After non-success, Standard mode explicitly offers a **new** reorganization:

- new reorganization id;
- new 360-day narrow stand-down;
- new reputation, support, and legacy penalties;
- no additional creditor-workout reduction when `debtRenegotiated` is already
  true; and
- a fresh exact article and escrow after selection is rerun.

There is no fixed Standard-mode cycle limit. This is the continuity guarantee.
The repeated year, penalties, failed hardware, and rival movement are the cost;
the game never disguises the retry as an instant reroll.

## Restricted three-month operating support

Successful settlement closes suspension and resumes full ordinary play. It
does not deposit a “three-month reserve” into Capital. Instead it creates one
restricted operating-support record lasting exactly three 30-day campaign
months (`90` days).

At successful settlement, the record snapshots current recurring revenue,
expenses, and net burn. That burn sets both a monthly cap and a total
authorization of three times the monthly cap. For each of the next 90 campaign
days, restricted support offsets the least of that day's eligible recurring
burn, one-thirtieth of the frozen monthly cap, and the remaining authorization.

- Mission purchases and other one-time costs are never eligible.
- Later obligations cannot increase the frozen monthly cap or total
  authorization.
- Removed or reduced recurring burn draws less support on each later day.
- Positive eligible net flow produces no payment and no banked credit.
- Support authorization is recorded separately and never shown as spendable
  Capital. Only the capped daily offset enters Capital after that day's
  eligible recurring burn has been realized and receipted.
- After 90 campaign days the record expires. Unused authorization disappears.
- Accepting a new reorganization explicitly closes any still-active support
  record with reason `new-reorganization`; unused authorization disappears.
  A later success then creates a new, independently identified 90-day record.

The reserve protects the returned core program through one quarter without
letting the player inflate a cash award by deliberately acquiring high-burn
assets.

## Authoritative player copy

### Startup premise

> **ALT-HISTORY** · Found a government-chartered, privately operated rocket
> venture in 1942. Opening capital is finite; public contracts pay under their
> stated terms, and neutral public support provides no automatic monthly
> funding.

### Engineer mode

> **Engineer · Detailed and unforgiving**
> Tight budgets, green hardware, and the full rocket-equation math. Physics
> inputs are decision-bearing; budgets, schedules, reliability, and history
> remain compressed simulation models.

The unqualified label “realistic” is not permitted.

### Research divisions

> Core research teams are included in base overhead. Completing projects builds
> experience at no additional monthly cost. The first training investment
> expands a team into a standing division and activates **$0.25M/month** of
> ongoing overhead; later training does not add another upkeep charge.

Unexpanded badge:

> Core team · included in base overhead

First expansion action:

> Expand & train · $X now · +12 skill · adds $0.25M/mo

Confirmation:

> **Expand [Division]?**
> This converts the core team into a standing division. Pay **$X now**, gain
> **+12 skill**, and add **$0.25M/month** to permanent operating overhead.
> Project experience alone does not create this cost.

Later training:

> Advanced training · $X now · +12 skill · no added upkeep

Finance line:

> Expanded research divisions · N × $0.25M · −$X/mo

### Static fire and First Flight

> **Static Fire Test Program** · Establish program-wide ground-test procedures:
> **+8 percentage points modeled launch reliability**. This research does not
> unlock or fund the separate bench static-fire action.

Static-fire tooltip:

> Full-duration stand firing, resolved immediately in compressed campaign time.
> A clean burn banks one ground-heritage credit; a discovered anomaly produces a
> +2-point fix for the next launch. No contract reimbursement.

First Flight:

> Clear the tower, fly a controlled ballistic test, and return usable telemetry.
> The launch vehicle is expendable unless compatible recovery hardware is
> fitted. Contract pays **$1.60M only on successful completion**.

### Insolvency offer

> **Program insolvency**
> The venture is insolvent and all foreground launch transactions have settled.
> Take an available bridge loan or enter Program Reorganization. Standard
> campaigns always retain a recovery route; Ironman campaigns do not.

### Reorganization confirmation

> **Program Reorganization — Standard campaign**
> The venture will enter a **360-day protective stand-down** while rival programs
> continue. This cycle costs **−X reputation, −10 public support, and −10
> legacy**. Ordinary operations pause; a due deferred arrival may interrupt the
> administrative clock and resolves through its existing mission owner. Its
> physical outcome and date remain unchanged, but any cash consequence belongs
> to the restructuring estate and does not enter player Capital.
>
> After the stand-down, restricted sponsor funds will finance one exact uncrewed
> return-to-flight article. No funds enter Capital. Hardware, build time, tests,
> physics, reliability, launch decisions, failure consequences, and transaction
> ownership remain normal.

First-workout addition:

> **One-time creditor workout** · Permanent bridge-loan service falls 50%, from
> **$X/month** to **$Y/month**. Later reorganizations cannot reduce it again;
> prior bridge-loan uses remain recorded.

Later-cycle replacement:

> The campaign's one-time creditor workout has already been used. Existing
> bridge-loan service does not fall again.

### Active sponsored attempt

> **Sponsor-directed return to flight**
> Mission: [Mission] · Article: [Hull/order] · Restricted funds: $X / $Y
> Restricted funds pay only this article's approved hardware, test and flight
> operations, and carry. Success is not guaranteed.

### Non-success

> **Sponsored attempt unsuccessful**
> [Article] resolved under normal mission risk. This reorganization and its
> restricted escrow are closed. Standard campaigns may enter a new Program
> Reorganization, with a new 360-day stand-down and new reputation, support, and
> legacy penalties. No unrestricted cash was awarded.

### Success and support

> **Reorganization complete**
> [Mission] succeeded. Restricted article funding is closed and full ordinary
> play resumes. For the next **three campaign months**, restricted operating
> support will cover eligible realized recurring deficits. It is not cash,
> cannot fund purchases, and later obligations cannot raise its fixed cap. It
> expires after 90 campaign days.

Capital tooltip while support is active:

> Operating support pays eligible recurring deficits as they occur; it is not
> available Capital. New obligations cannot raise its cap. Support expires
> [date].

### Ironman

> **Ironman · Permanent insolvency**
> Program Reorganization is disabled. Bridge loans remain optional and limited;
> insolvency after available credit is campaign-ending. This choice cannot be
> changed after the campaign begins.

## Invariants

1. Experience, morale, and breakthroughs cannot activate division opex.
2. One explicit first training activates one `$0.25M/month` division charge;
   later training cannot duplicate it.
3. G0-B05 passes through the exact quote and exact-hull action, not a special
   launch exception.
4. Program Reorganization cannot begin inside unresolved Gate 2 ownership.
5. Each cycle has one id, one penalty receipt, one article, one escrow, and one
   terminal settlement; closure writes the compact `lastReorganization` record.
6. The narrow clock advances dates and rivals exactly once while ordinary player
   systems are paused; it stops at a due deferred arrival and resumes only after
   Gate 2 foreground ownership releases.
7. No deferred transaction, date, hull, outcome, or remaining cruise duration
   is shifted, invented, lost, duplicated, or rerolled.
8. Restricted escrow never becomes unrestricted Capital and never pays an
   unrelated mutation.
9. Every sponsored article uses normal quote, time, physics, reliability,
   decision, lifecycle, settlement, and replay authorities.
10. Non-success closes the cycle; it cannot refresh escrow in place.
11. Standard mode always offers another fresh cycle after settled non-success or
    later insolvency. Ironman never does.
12. The creditor workout can reduce debt service only once and exactly by 50%.
13. Operating support is capped by the success-time recurring-burn snapshot,
    pays no more than live recurring burn on each of three monthly ticks, never
    pays purchases, and expires after 90 days.
14. Operating-support records never overlap. A newly accepted reorganization
    closes prior support explicitly before its own suspension begins.

## Acceptance matrix

| Contract | Required evidence |
|---|---|
| Opening solvency | Seed 7: Engineer → Static Fire Test Program → one static fire → exact First Flight build/rollout. Ready-hull action is enabled and cash meets its quote. |
| Experience-only division | Project completion, breakthrough, morale tick, and save/load leave `skill <= DIV_SKILL0` and produce `$0.00M/month` division opex; no persisted expansion field exists. |
| First division expansion | CTA and confirmation show immediate cost plus `$0.25M/month`; one mutation raises `skill > DIV_SKILL0`, debits once, and adds one ledger line. |
| Repeat training | Same-division training changes skill/cash but not the count or amount of recurring division charges. |
| Terminal ordering | Negative crossings during preparation, decisions, cruise, and settlement cannot open reorganization until Gate 2 releases the foreground owner. Solvent success suppresses it. |
| Cycle idempotency | Repeating Accept with one request id yields one reorganization id, one penalty receipt, one stand-down, and one escrow. Conflicting reuse is rejected. |
| Narrow stand-down | Exactly 360 administrative dates/rival days advance in total. Ordinary economy, R&D, production, facilities, contracts, staff, and events remain unchanged; due arrivals may interrupt the clock. |
| Deferred flights | Arrival/deadline dates remain unchanged. Due logistics settles normally; a due mission acquires Gate 2 foreground/UI/transaction ownership, and administration resumes after release without duplicating or rerolling it. |
| Recovery article | The newly built uncrewed First Flight A-4 design is byte-stable, physically feasible, protected from substitution, and owns one exact order and hull. |
| Escrow isolation | Every unrelated purchase/action is rejected without changing escrow. Sponsored build/flight costs debit escrow and preserve Capital. |
| Sponsored launch | Build, hull creation, launch decision, save/reload, outcome, and settlement pass the ordinary Gate 2 transaction suites. |
| Non-success | Every non-success closes id/escrow, applies normal consequences, and offers a distinct new 360-day Standard cycle. |
| Standard persistence | Repeated failures never exhaust cycle availability; each cycle still pays time/reputation/support/legacy costs. |
| Ironman | Persisted `campaignRules.ironman === true` exposes no reorganization at the same settled insolvency; limited loans and permanent terminal state remain. |
| Creditor workout | First accepted cycle changes interest to `round2(old*0.5)` once; reload/replay/later cycles cannot reduce it again; loan-use count remains. |
| Successful close | Success closes suspension and escrow exactly once, resumes ordinary play, and creates one 90-day support record. |
| Support eligibility | Each day pays `min(snapshot monthly cap / 30, live recurring burn / 30, remaining authorization)`; positive net and one-time purchases produce no payment, and later obligations cannot raise the cap. |
| Support expiry | Ninety daily receipts grouped into three 30-day periods consume at most the original three-cap authorization; at day 90 the record closes, unused authorization disappears, and save/reload cannot extend or duplicate it. |
| Support replacement | Accepting a new reorganization closes prior support with `new-reorganization`; a later success creates a distinct record and no support days overlap. |
| Public copy | Standard/Ironman consequence, resolved penalties, restricted-fund boundary, one-time 50% workout, failure retry cost, and 90-day support expiry are visible before commitment. |

## Planned validation

```text
node build.js --check
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-gate3-contracts.js
node tests/run-expected-failures.js
node tests/run-gate0-evidence.js --output docs/evidence/gate3-headless-results.json
node tests/run-browser-gate0.js --json-output docs/evidence/gate3-browser-results.json
git diff --check
```

Gate 3 may promote G0-B05 only when the expected-failure fixture becomes a
positive regression and the quarantine contains no unexpected pass/failure.

## Explicit non-goals

- No opening subsidy, random safety grant, increased starting money, cheaper
  static fire, reduced launch reserve, increased First Flight payout, or
  overdraft launch.
- No bridge-loan principal ledger, amortization schedule, equity system, bank,
  or general corporate-finance simulation.
- No broad per-operation mothball/reactivation state or UI. Suspension is one
  global, temporary reorganization owner.
- No altered rocket equation, mission Δv, reliability distribution, weather,
  outcome, recovery, hull, or Gate 2 transaction rule.
- No sponsored R&D, crewed recovery mission, mission-scope upgrade, free design
  mutation, or guaranteed success.
- No difficulty rebalance beyond adding the immutable Ironman campaign rule;
  Standard difficulty values remain otherwise unchanged.
- No Gate 4 onboarding redesign, Gate 5 trajectory work, Gate 6 visual polish,
  or content expansion.
