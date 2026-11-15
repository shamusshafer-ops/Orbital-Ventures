// @ov-test-mode standalone -- run directly with node (reads repo files via __dirname/cwd); never bundle with harness.js + build/game.js.
/* Gate 6 F7 -- dead/duplicate token cleanup.
   Two of the three items in the original F7 finding are fixed here and asserted
   so they cannot regress. The third, a full hud-star/cc-hero-star token merge,
   is NOT done -- see the note below the checks. */
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'shell.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail ? ' -- ' + detail : '')); }
}

console.log('Gate 6 — dead token cleanup');

check('--cc-hero-navy-raised removed (was 0 uses repo-wide)',
      !/--cc-hero-navy-raised/.test(SRC));

check('--cc-hero-navy still declared (1 live use: topbar gradient), now derived from the theme',
      /--cc-hero-navy:color-mix\(in srgb,var\(--bg\)/.test(SRC));

const dupBlock = /body\.theme-green,body\.theme-beige,\s*\n\s*body\.era-apollo[^{]*\{\s*\n\s*--hud-surface:rgba\(7,20,32,\.92\)/;
check('redundant hud-* redeclaration on theme/era selectors removed', !dupBlock.test(SRC));

// 2026-11-14 layout/theme pass: the single hud-* block moved from :root to body and is derived from the theme's
// core tokens (a var() resolves where it is declared; the theme classes live on body).
const css = SRC.slice(0, SRC.indexOf('</style>'));
check('exactly one hud-* block, declared on body and derived from theme tokens',
      (css.match(/--hud-surface:(?!var\(--cc-hero-surface\))/g) || []).length === 1 && // the command-hero bridge re-points, it doesn't redefine
      /body\{\s*\n\s*--hud-surface:color-mix\(in srgb,var\(--bg\)/.test(css));

console.log('\n' + pass + ' passed, ' + fail + ' failed');

/* Not done: merging cc-hero-star tokens into hud-star tokens onto one cyan, as
   the contract originally specified. Implementation found that .shell.command-hero
   and body.command-mode toggle from the same state (render.js: state.tab==='command')
   and form a deliberate two-tier system -- cc-hero-star is used directly (header/opsbar,
   no viewport gate) AND bridged into hud-star at >=1101px (Phase 3A hero composition),
   so header/opsbar stay cyan-tinted below that breakpoint while the rest of the
   hero layout only exists above it. Flattening the two families risks losing
   that breakpoint behaviour, and there is no browser here to confirm the visual
   result either way. Left as-is; docs/GATE-6-CONTRACTS.md records the reason. */

if (fail) process.exit(1);
