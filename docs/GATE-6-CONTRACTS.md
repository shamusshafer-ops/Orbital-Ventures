# Gate 6 — Presentation, graphics, and aesthetic polish

Gate 6 makes the chrome look like one designed product. It closes the gap
between what the visual-identity code claims and what it renders, moves colour
decisions onto the token system so theming reaches the whole UI, gives the
product a typographic identity that does not depend on what fonts a player
happens to have installed, and brings contrast and reduced-motion up to a
defensible floor.

It is a presentation contract. No authoritative simulation value — rocket
equation, Δv, reliability, weather, outcome, recovery, hull, economy, save
shape, or any Gate 1–3 transaction rule — is read or changed.

## Why this gate exists

An adversarial presentation review (2026-08-10) verified every finding against
source before recording it. Four defects were structural rather than cosmetic.

**The era/theme system does not do what it says.** `body.theme-green`,
`body.theme-beige`, `body.era-apollo`, `body.era-80s`, `body.era-90s2000s` and
`body.era-spacex` each declare a full palette, and all six are byte-identical
(`--bg:#071523; --panel:#0b2033; --panel2:#102c43; --line:#2d5c7a;
--ink:#d9efff; --muted:#7fa8bf; --dim:#55758b;` and the same accent and domain
hues). The source comment above them states that all four visual eras have real
distinct CSS, and the 90s2000s block states that it is a fresh palette. Neither
is true of colour. What genuinely does differ per era — corner radius, border
weight, letter-spacing, uppercase treatment, and a grid tint on two of four —
is real and is protected by this gate. `THEMES` in `shell.js` offers
`Control Room Green` and `Apollo Beige`; both render the same blue, so a player
who picks Apollo Beige receives no beige.

**Half the UI cannot be themed at all.** `render.js` carries 391 distinct hex
literals across 497 occurrences and 921 inline `style="` attributes, against 437
`var(--token)` references; `flight.js` adds 135 distinct literals, `shell.html`
104. Against a 47-token system this initially read as a half-applied migration —
re-point the tokens and the rest would follow.

*Superseded by implementation (2026-08-11): it isn't.* Only 3 of the 391
literals in `render.js` exactly matched a token value, and 82% of distinct
literals are used exactly once — there is no head to the distribution for a
migration to work through. The Token coverage contract below reflects the
corrected scope: named chrome surfaces resolve through tokens and respond to
theme/era changes; the literal count itself is not the target.

**Typography is decided by the player's operating system.** `--sans` is
`"Arial Narrow","Roboto Condensed","Segoe UI",system-ui,sans-serif` with no
`@font-face` rule, no bundled face and no font link anywhere in the repo. A
Linux or ChromeOS player falls through the whole stack to `system-ui` and reads
the game in a non-condensed face. `font-stretch:condensed` is then applied to
`h1,h2,h3,.brand .co,.mission-tag,.cc-panel-h,.rail-group` on top of a static
family that carries no width axis, where it is close to a no-op.

**Contrast and reduced-motion have measurable floors and one token misses.**
`--dim` measures 2.72:1 on `--panel2`, below even the 3.0 large-text floor;
3.06:1 on `--panel`; 3.32:1 on `--bg`; 3.39:1 in the era palette. It is used at
40 `var(--dim)` sites and 167 `class="dim"` applications. `--muted` (5.50:1) and
`--ink` (13.86:1) are fine, so this is one token, not a palette failure.
Separately, `prefers-reduced-motion` appears exactly once in the codebase, in a
CSS query that suppresses transitions and animations; it appears zero times in
any JavaScript, so the flight animations, the Cape Phaser scene and the 3D map —
the heaviest motion in the product — ignore the preference entirely.

## Locked product rules

- Gate 6 is chrome and DOM presentation. Canvas and 3D **art direction** —
  scene composition, lighting, model or texture work, the Cape scene's own
  palette — is out of scope. Only the reduced-motion contract reaches the
  animation layer, and only to suppress motion, never to restyle it.
- Era geometry is a **protected baseline**. The per-era corner radius, border
  weight, letter-spacing, uppercase treatment and grid tint currently applied by
  `body.era-*` rules must survive unchanged in kind. Gate 6 adds palette
  differentiation alongside them; it does not replace them.
- Manual theme selection continues to win over era palette. The existing
  `:not(.theme-green):not(.theme-beige)` override gate is preserved exactly.
- No layout restructure. Column widths, rail geometry, panel order, scene
  routing, the topbar collapse and `--ui-scale` behave as they do today.
- Theme and era changes remain pure CSS custom-property re-points driven by
  `applyEraVisual()` and the theme picker. No new render path, no new state
  field, no save-version bump.
- Token migration is behaviour-preserving. A migrated colour resolves to the
  same rendered value under the default theme as the literal it replaced,
  except where a token is deliberately re-valued under the contrast rule below.

## Visual identity contract

Each of the four visual eras and each of the two named manual themes resolves
to a palette that is distinguishable from the others, and every palette block is
declared once rather than repeated per selector.

- `Apollo Beige` reads as a warm, low-chroma palette. `Control Room Green` reads
  as a phosphor-green palette. Neither resolves to the default blue, and the two
  are not equal to each other.
- The four eras progress rather than alternate: Apollo warm and high-contrast,
  80s phosphor-leaning, 90s2000s cooler and brighter, SpaceX-modern coolest and
  most minimal. Adjacent eras differ; non-adjacent eras differ more.
- Distinguishability is asserted mechanically, not by eye: for any two named
  palettes, at least one of `--bg`, `--panel`, `--ink` or `--ignite` differs, and
  no two palette blocks are byte-identical across their full property set.
- Any documentation or source comment describing a palette must match the values
  it sits above. A comment claiming a distinct or fresh palette is a contract
  statement and is tested as one.

## Token coverage contract

*Revised from the original draft (2026-08-11).* The ratchet below was written
before implementation and assumed a literal count was the right thing to
constrain. Measurement disproved that: only 3 of 391 distinct literals in
`render.js` exactly matched a token value, and 82% of distinct literals are
used exactly once, so a per-file hex-count ceiling would have passed while the
UI stayed exactly as visually incoherent as before. It is replaced with a
contract on the thing a player can actually perceive.

- Named chrome surfaces — panel backgrounds, borders, body text, section
  captions, status text — resolve through the token system wherever the
  surrounding markup is a `style`/`cssText` CSS context. They respond when the
  theme or era changes.
- Canvas drawing code, scene art, and SVG presentation attributes (`fill=`,
  `stroke=`, `stop-color=` as bare attributes rather than inside a `style=`
  value) are out of scope for this rule: `var()` does not reliably resolve in a
  presentation attribute, and canvas literals are excluded by the Locked
  product rules above. A colour sitting in either of these contexts is not a
  token-coverage gap.
- One-off accent colours used exactly once, in dense data readouts where the
  value itself carries meaning distinct from the surrounding chrome, are not
  required to migrate. Forcing every such value onto a shared token would
  either multiply the token set past the point of being a coherent design
  language or collapse genuinely different colours onto one token and lose
  information.
- New tokens are added when a literal represents a real recurring role rather
  than a one-off — for example `--label`, added to cover a section-caption
  colour that was hardcoded identically at four call sites and could not
  respond to theme or era.
- Coverage is asserted per named surface, not per literal count: a fixed list
  of chrome roles (surface backgrounds, borders, body/value/footnote text,
  section captions) must resolve through tokens at every site that renders
  them, and the assertion fails if any of those specific sites regresses to a
  literal. The list grows only when a new recurring chrome role is identified
  and given a token.
- Dead and duplicate tokens: two of three identified problems are fixed.
  `--cc-hero-navy-raised` was defined and referenced zero times repo-wide;
  removed. The `--hud-*` redeclaration under the theme/era selectors repeated
  `--hud-line`, `--hud-line-soft` and `--hud-glow` at values byte-identical to
  `:root`, with the other two properties (`--hud-surface`, `--hud-raised`)
  differing only by an undocumented 2% alpha nudge; removed, no visible change.
  Both are asserted by `test-dead-tokens.js`.

  *Revised from the original draft (2026-08-11):* a full merge of `--cc-hero-*`
  into `--hud-*` onto one cyan is **not done**. The premise — that the two
  families are a naive duplicate pair — was disproven during implementation.
  `.shell.command-hero` and `body.command-mode` toggle from the same state
  (`render.js`: `state.tab==='command'`) and form a deliberate two-tier system:
  `--cc-hero-*` is applied directly to header/opsbar with no viewport gate, and
  separately bridged into `--hud-*` only at `>=1101px` for the Phase 3A hero
  composition — so header/opsbar stay cyan-tinted below that breakpoint while
  the rest of the hero layout only exists above it. Flattening the two families
  risks losing that breakpoint behaviour, and there is no browser available to
  confirm the visual result either way. Deferred until a browser pass can verify
  it; `--cc-hero-navy` and `--cc-hero-cyan` remain as live, singly-used tokens.
- `fill="var(--ignite)"` / `stroke="var(--ignite)"` as bare SVG presentation
  attributes (15 sites, pre-existing) are recorded as F8 and held at a ceiling
  rather than fixed under this contract, pending real-browser confirmation of
  whether the value resolves at all. See Explicit non-goals.

## Typography contract

*Shipped 2026-08-11, as specified below.*

- One condensed display face is bundled in `assets/` and declared with
  `@font-face`, loaded locally with no network dependency, and attributed in
  `assets/CREDITS.md` under a licence that permits redistribution.
- `--sans` names the bundled family first and retains the current stack as
  fallback. Rendered headings are visually condensed on a machine with none of
  `Arial Narrow`, `Roboto Condensed` or `Segoe UI` installed.
- `font-stretch:condensed` is removed where the named family carries no width
  axis, or retained only against a variable face that answers to it.
- The bundled face is subset to the glyphs the UI uses and is small enough that
  it does not regress the Tier 0.1 boot-weight work. Build parity and the
  texture-embedding checks stay green.

Implementation: Roboto Condensed (SIL OFL 1.1, github.com/google/fonts),
chosen because it was already second in the pre-Gate-6 `--sans` fallback
chain — bundling it means machines that already had it installed see zero
visual change, and the machines that didn't (the actual bug) get exactly the
look the game was designed around rather than a new typeface. It's a variable
font (`wght` 100-900, no `wdth` axis), so `font-stretch:condensed` was a no-op
against it and is removed. Subsetted with `pyftsubset` to the glyphs a
full-source scan found in actual use — Basic Latin, Latin-1 Supplement, the
specific punctuation in play (en/em dash, curly quotes, bullet, ellipsis), the
Greek letters used inline as physics notation (Δv, γ, θ, etc.), and subscript
digits — 459 glyphs, 78KB. Icon/dingbat ranges (arrows, warning signs,
checkmarks) were deliberately excluded: no text face carries them, so they
already fall through to the system emoji font regardless of which webfont is
active. Embedded as a `data:` URI directly in the `@font-face` rule (not a
separate file reference), mirroring `build.js`'s `embeddedTextureScript()`
pattern for the planet/Cape textures and for the same reason: the release
build opens via `file://`, where Firefox can block a separately-fetched
sub-resource, and a `data:` URI has no fetch to block.

## Contrast and motion contract

- Every foreground token clears WCAG AA body contrast (4.5:1) against every
  surface token it is rendered on, in every named palette. The measured pairs are
  `--ink`, `--muted` and `--dim` against `--bg`, `--panel` and `--panel2`.
- Three legible emphasis tiers survive the rebalance. Raising `--dim` alone
  flattens the hierarchy, so `--muted` and `--ink` move in step and the ordering
  `--dim` < `--muted` < `--ink` holds by measured ratio in every palette.
- Accent tokens used for text — `--ok`, `--bad`, `--warn`, `--ignite`,
  `--readout` and the `--dom-*` hues — clear 4.5:1 on `--panel` and `--panel2`.
- `prefers-reduced-motion: reduce` is honoured by the JavaScript animation layer,
  not only by CSS. Under the preference, the flight animation, the Cape scene and
  the 3D map present their content without sustained motion and every outcome,
  telemetry value and decision point remains reachable. Suppressing motion never
  suppresses information and never changes a simulation result.
- The preference is read once through a `matchMedia` accessor and responds to a
  live change without a reload.

## Evidence baseline

The captured baseline in `docs/ui-baseline/` cannot support a before/after
comparison and is replaced before any visual change lands. Every file is smaller
than its filename claims — `command-1920x1080.png` is 1003×1072, closer to
portrait than to 1920×1080, and shows a fraction of the interface;
`command-1536x1024.png` is 1521×856, `command-1366x768.png` is 1140×760,
`command-1280x800.png` is 1265×711.

Re-capture is a prerequisite of this gate, at true viewport dimensions, with the
resolved dimensions recorded alongside each file and asserted against the
filename. The re-captured set covers the Command Center in every named theme and
every visual era.

## Required evidence

```text
node build.js --check
node tests/test-build-parity.js
node tests/run-gate1-contracts.js
node tests/run-gate2-contracts.js
node tests/run-gate3-contracts.js
node tests/run-gate6-contracts.js
node tests/run-gate0-evidence.js --output docs/evidence/gate6-headless-results.json
node tests/run-browser-gate0.js --json-output docs/evidence/gate6-browser-results.json
git diff --check
```

Gate 6 acceptance requires:

- Gate 1: 5/5 suites, 102/102 checks; Gate 2: 3/3, 49/49; Gate 3: 3/3, 96/96;
  Gate 5: `test-flight3d-trajectory.js` 31/31;
- new suites green — `test-theme-palettes.js` (no two named palettes
  byte-identical; every measured foreground/accent pair ≥ 4.5:1; emphasis tiers
  ordered dim<muted<ink; domain hues ≥20° apart; era geometry preserved; manual
  override still wins — 274 checks, shipped in the F1/F5 commit),
  `test-themeable-surfaces.js` (named chrome surfaces resolve through tokens at
  every asserted site; no new `var()` in an SVG presentation attribute — 20
  checks, shipped in the F2 commit, supersedes the originally planned
  `test-contrast-tokens.js` and `test-token-drift.js`, folded into the above),
  `test-reduced-motion.js` (accessor on/off/live-toggle; ambientClockT
  freezes and resumes without a catch-up jump; flight shake present when
  motion is allowed and zero throughout ascent when reduced, with virtT
  still advancing either way; source-level wiring + information-preserved
  guards for every ambient loop — 24 checks, shipped in the F6 commit),
  `test-dead-tokens.js` (the two confirmed-dead declarations stay removed
  — 4 checks, shipped in the F7 commit), `test-typography.js` (embedded
  font decodes as a valid WOFF2 of the expected size; --sans and
  font-stretch wiring; CREDITS.md attribution — 23 checks, shipped in the
  F3 commit);
- full headless sweep: no known-red and no unexpected failures;
- Firefox and Chromium: theme and era switching re-tints the whole chrome, the
  bundled face renders, and reduced-motion is honoured live in both engines;
- re-captured `docs/ui-baseline/` at asserted true dimensions;
- `git diff --check` and deterministic build parity.

## Open questions — resolve before implementation, not during

- **Top-region duplication.** The topbar renders Capital, Reputation, Flights and
  Public Support while `renderCCStrip()`'s Venture overview deck simultaneously
  renders Capital, Net, Support and Reputation; date and era each appear two to
  three times on one screen. The review split on whether this is redundancy or
  deliberate separation between glanceable chrome and a drill-in route with its
  own `Finances →` link, and could not settle it from source. It needs a decision
  against the live screen. Until then it is **out of scope** and the current
  arrangement is preserved.
- **Gate 4 ordering.** Gate 4 (progressive disclosure and first-session redesign)
  is unbuilt and sits before Gate 6 in the ladder recorded in
  `GATE-1-CONTRACTS.md`. Onboarding work may replace surfaces this gate polishes.
  Either Gate 4 lands first, or Gate 6 accepts that some migrated markup will be
  rewritten and confines itself to tokens, palettes, type and contrast — which
  survive a layout change — rather than to any specific panel's composition.

## Explicit non-goals

- No canvas, Phaser or Three.js art direction; no scene composition, lighting,
  model, or texture work; no change to the Cape scene's own palette.
- No layout, column, rail, panel-order or scene-routing change; no change to
  `--ui-scale`, topbar collapse, zoom/pan, or timeline filter behaviour.
- No new UI feature, panel, modal or control. Gate 3's REFERENCE-modal docking
  and Tier 3.4's Basic-layer renderings remain their own items.
- No keyboard, focus-trapping, modal-lifecycle or live-region change beyond the
  reduced-motion accessor; Gate 1's interaction foundation is protected.
- No simulation, economy, mission, research, save-shape or progression change,
  and no save-version bump.
- No resolution of the top-region duplication question, and no Gate 4 onboarding
  or progressive-disclosure work.
- No fix to `renderCCLegacyStrip()`. The function is called from no production
  path and only from `tests/browser/gate0-launch-flow.js`, where it synthesises
  the `commandLegacy` surface that the Gate 1 ready-hull check then asserts
  against — so that contract validates a route no player can reach. It is a real
  defect and it belongs to Gate 1 remediation, not to a presentation gate.
- No fix to F8: 15 pre-existing sites (found during the F2 commit, present
  before any Gate 6 work) use `fill="var(--ignite)"` or `stroke="var(--ignite)"`
  as bare SVG presentation attributes rather than inside a `style=` value.
  Presentation attributes are not guaranteed to resolve a full CSS `var()`
  reference the way a `style` property does. Fixing this without a browser to
  confirm the actual rendered behaviour risks the same failure mode this
  project has hit before — a plausible-sounding fix applied to unverified
  source reasoning. `test-themeable-surfaces.js` holds the count at a ceiling
  of 15 so it cannot silently grow; the fix itself waits on real-browser
  confirmation.
