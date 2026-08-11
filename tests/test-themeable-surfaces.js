/* Gate 6 F2 (re-scoped) — themeable surfaces.
   The original F2 framing ("662 hardcoded literals against a 47-token system")
   implied a mechanical migration. Measurement disproved that: only 3 literals in
   render.js exactly matched a token value, and 82% of distinct literals are used
   exactly once, so promoting even the top 50 repeated colours would cover ~32% of
   occurrences. There is no head to the distribution to migrate.

   So this suite does NOT ratchet a literal count. It asserts the thing that
   actually matters to a player: the named chrome surfaces resolve through tokens,
   and therefore respond when the theme or era changes. */
'use strict';
const fs = require('fs');
const path = require('path');
const RENDER = fs.readFileSync(path.join(__dirname, '..', 'src', 'render.js'), 'utf8');
const SHELL = fs.readFileSync(path.join(__dirname, '..', 'src', 'shell.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail ? ' -- ' + detail : '')); }
}

console.log('Gate 6 — themeable surface migration');

/* 1. --label exists in every palette (new token for the recurring section-caption
      role; it was #7fb6dd hardcoded at 4 sites and could not respond to theme). */
const paletteAnchors = [':root', 'body.theme-green', 'body.theme-beige',
                        'body.era-apollo', 'body.era-90s2000s', 'body.era-spacex'];
for (const sel of paletteAnchors) {
  const i = SHELL.indexOf(sel);
  const body = i < 0 ? '' : SHELL.slice(SHELL.indexOf('{', i) + 1, SHELL.indexOf('}', SHELL.indexOf('{', i)));
  check('"' + sel + '" declares --label', /--label\s*:\s*#[0-9a-fA-F]{3,6}/.test(body));
}

/* 2. the migrated map-overlay surfaces are tokenised, not literal */
const MUST_BE_TOKEN = [
  ['section caption colour', /style="color:var\(--label\)/, /style="color:#7fb6dd/],
  ['overlay body text', /color:var\(--muted\)/, /color:#8fa9b9/],
  ['overlay value text', /color:var\(--ink\)/, /color:#dcecf7/],
  ['overlay footnote text', /color:var\(--dim\)/, /color:#63798a/],
  ['overlay button surface', /background:var\(--panel2\)/, /background:#102232/],
  ['overlay button border', /border:1px solid var\(--line\)/, /border:1px solid #43677f/]
];
for (const [label, tokenRe, literalRe] of MUST_BE_TOKEN) {
  check(label + ' uses a token', tokenRe.test(RENDER));
  check(label + ' has no literal left', !literalRe.test(RENDER),
        'literal still present in render.js');
}

/* 3. no var() may sit in an SVG presentation attribute.
      Presentation attributes are not parsed as full CSS values, so fill="var(--x)"
      does not resolve the way style="fill:var(--x)" does. This guard exists so the
      migration cannot introduce that shape. NOTE: 15 such sites (fill/stroke =
      var(--ignite)) already existed before Gate 6 and are recorded as F8, pending
      real-browser confirmation; they are counted here but not yet fixed, so the
      assertion is a ceiling that must not rise. */
const svgVar = RENDER.match(/(?:fill|stroke|stop-color)="var\(--[a-z-]+\)"/g) || [];
const PREEXISTING_SVG_VAR = 15;
check('no NEW var() in SVG presentation attributes',
      svgVar.length <= PREEXISTING_SVG_VAR,
      svgVar.length + ' found, ceiling ' + PREEXISTING_SVG_VAR);

/* 4. token references in render.js went up, not down */
const varUses = (RENDER.match(/var\(--[a-z0-9-]+\)/g) || []).length;
check('render.js resolves >=460 colour/token references', varUses >= 460, varUses + ' found');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
