# Claude handoff — Solar System Map continuation

**Read this together with `CLAUDE.md` and `SOLAR-SYSTEM-MAP-ROADMAP.md`.**

This handoff was added on 2026-07-25 to make the next Solar Map work unambiguous without rewriting or confusing the completed D-pass history.

## What was added in this branch

- `SOLAR-SYSTEM-MAP-ROADMAP.md`
  - Six implementation phases (`SM1`–`SM6`).
  - Every phase is divided into independently claimable vertical slices.
  - Each slice has acceptance criteria or suggested tests.
  - Explicit status markers distinguish done, in progress, planned/not touched, blocked, and test-build-only work.
  - A protected-baseline section lists D1–D4 and the WebGL/pop-out fixes that must remain intact.
  - An explicit not-touched section prevents documentation from being mistaken for implementation.

## Current truth

### Done in repository

- Solar Map D1 through D4 are complete.
- The live Three.js scene is reparented between inline and pop-out mounts rather than rebuilt.
- `pauseMap3D()`, `remountMap3D()`, `disposeMap3D()`, the 2D fallback, context-loss protection, `#mapPopStage{min-width:0}`, and `ovMapDiag()` are the stable baseline.

### Test build only

- A separate exported HTML was produced during review with improved lighting and a layered starfield.
- That HTML was not a repository source change.
- The visual work must be ported into `src/`, built, tested, and Firefox-verified before marking `SM4.1`–`SM4.3` complete.

### Planned and not touched

- `SM1` viewport size and near-full-screen pop-out.
- `SM2` camera presets, fit helpers, transitions, and zoom behavior.
- `SM3` selection emphasis, distant markers, label collision, and orbit modes.
- `SM4` source-integrated lighting/starfield plus quality tiers.
- `SM5` toolbar and Navigation/Mission Planning/Operations/Strategic modes.
- `SM6` breadcrumbs, optional locator, and scale communication.

## Claude/Codex operating rule

Before implementing any Solar Map continuation slice:

1. Read `SOLAR-SYSTEM-MAP-ROADMAP.md`.
2. Claim exactly one slice in the main `CLAUDE.md` STATUS block.
3. Do not mark a phase complete because a standalone HTML prototype exists.
4. Edit `src/`, never generated `orbital-ventures.html`.
5. Preserve the one-live-WebGL-context architecture.
6. Add a focused test where the logic is headless-testable.
7. Run `node build.js`, then **always** run `node --check build/game.js`.
8. Run the full suite and `git diff --check`.
9. Browser-verify Firefox for any visual/layout slice, using `ovMapDiag()` where relevant.
10. Update the status ledger and append the completed result according to the existing `CLAUDE.md`/`ROADMAP.md` rules.

## Recommended first claim

`SM1.1 — Larger inline map`

It is the smallest high-impact slice and establishes the responsive sizing rules needed by the rest of SM1.

## Files intentionally untouched by this documentation branch

- `src/*`
- `orbital-ventures.html`
- `index.html`
- `build/game.js`
- tests
- save schema
- gameplay, economy, R&D, missions, contracts, personnel, facilities, rivals, flight renderer, and Cape scene
