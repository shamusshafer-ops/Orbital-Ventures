/* Gate 6 F1/F5 — theme + era palette contracts.
   Parses the real CSS out of src/shell.html (no DOM, no build step) and asserts:
     1. every named palette declares the full token set
     2. no two named palettes are byte-identical
     3. any two palettes differ on at least one of --bg/--panel/--ink/--ignite
     4. every foreground + accent token clears WCAG AA body contrast (4.5:1)
     5. the three emphasis tiers stay ordered dim < muted < ink by measured ratio
     6. domain hues stay mutually separable (>=20deg) so the domain language survives
     7. era geometry rules (radius/border/letter-spacing/grid tint) still exist
   Pre-Gate-6 this file would fail on 2, 3, 4 and 6 simultaneously. */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'shell.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' -- ' + detail : '')); }
}

/* ---------- colour maths ---------- */
function unhex(h) {
  h = h.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function lum(rgb) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
function contrast(a, b) {
  const l1 = lum(unhex(a)), l2 = lum(unhex(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function hue(hex) {
  const [r, g, b] = unhex(hex).map(c => c / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}
function hueSep(a, b) { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); }

/* ---------- extract palettes ---------- */
const FG = ['ink', 'muted', 'dim'];
const ACCENT = ['ignite', 'readout', 'ok', 'bad', 'warn'];
const DOMAIN = ['dom-economy', 'dom-engineering', 'dom-research', 'dom-military',
                'dom-exploration', 'dom-crew', 'dom-warn'];
const SURFACES = ['bg', 'panel', 'panel2'];
const REQUIRED = SURFACES.concat(['line'], FG, ACCENT, DOMAIN);

// selector -> friendly palette name. era-80s intentionally shares the Control Room Green
// rule, so it is not listed separately; the shared declaration is asserted below.
const WANT = {
  ':root': 'default',
  'body.theme-green': 'phosphor',
  'body.theme-beige': 'beige',
  'body.era-apollo': 'apollo',
  'body.era-90s2000s': 'y2k',
  'body.era-spacex': 'spacex'
};

function readBlock(anchor) {
  const i = SRC.indexOf(anchor);
  if (i < 0) return null;
  const open = SRC.indexOf('{', i);
  const close = SRC.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  const body = SRC.slice(open + 1, close);
  const out = {};
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g;
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2].toLowerCase();
  return out;
}

const palettes = {};
for (const sel of Object.keys(WANT)) palettes[WANT[sel]] = readBlock(sel);

console.log('Gate 6 — theme/era palette contracts');

/* 1. completeness */
for (const name of Object.keys(palettes)) {
  const p = palettes[name];
  check('palette "' + name + '" parsed', !!p);
  if (!p) continue;
  const missing = REQUIRED.filter(t => !p[t]);
  check('palette "' + name + '" declares full token set', missing.length === 0,
        missing.length ? 'missing: ' + missing.join(',') : '');
}

/* 2 + 3. distinctness */
const names = Object.keys(palettes).filter(n => palettes[n]);
const KEY = ['bg', 'panel', 'ink', 'ignite'];
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = palettes[names[i]], b = palettes[names[j]];
    const identical = REQUIRED.every(t => a[t] === b[t]);
    check('"' + names[i] + '" vs "' + names[j] + '" not byte-identical', !identical);
    const keyDiff = KEY.filter(t => a[t] !== b[t]);
    check('"' + names[i] + '" vs "' + names[j] + '" differs on a key token',
          keyDiff.length > 0, 'bg/panel/ink/ignite all equal');
  }
}

/* 4. contrast — foregrounds on all surfaces, accents on panel/panel2 */
for (const name of names) {
  const p = palettes[name];
  for (const tok of FG) {
    for (const s of SURFACES) {
      const r = contrast(p[tok], p[s]);
      check('[' + name + '] --' + tok + ' on --' + s + ' >= 4.5:1',
            r >= 4.5, r.toFixed(2) + ':1');
    }
  }
  for (const tok of ACCENT.concat(DOMAIN)) {
    for (const s of ['panel', 'panel2']) {
      const r = contrast(p[tok], p[s]);
      check('[' + name + '] --' + tok + ' on --' + s + ' >= 4.5:1',
            r >= 4.5, r.toFixed(2) + ':1');
    }
  }
}

/* 5. tier ordering preserved (raising --dim must not flatten the hierarchy) */
for (const name of names) {
  const p = palettes[name];
  const d = contrast(p.dim, p.panel2), m = contrast(p.muted, p.panel2), i = contrast(p.ink, p.panel2);
  check('[' + name + '] emphasis tiers ordered dim<muted<ink',
        d < m && m < i, [d, m, i].map(x => x.toFixed(2)).join(' / '));
}

/* 6. domain hue separability */
for (const name of names) {
  const p = palettes[name];
  let worst = 999, pair = '';
  for (let i = 0; i < DOMAIN.length; i++) {
    for (let j = i + 1; j < DOMAIN.length; j++) {
      const s = hueSep(p[DOMAIN[i]], p[DOMAIN[j]]);
      if (s < worst) { worst = s; pair = DOMAIN[i] + '/' + DOMAIN[j]; }
    }
  }
  check('[' + name + '] domain hues >=20deg apart', worst >= 20,
        worst.toFixed(1) + 'deg (' + pair + ')');
}

/* 7. era geometry survives — Gate 6 adds palette, it does not replace shape */
const GEOM = [
  ['era-apollo radius/border', /body\.era-apollo \.card[^{]*\{[^}]*border-radius:2px/],
  ['era-apollo uppercase headers', /body\.era-apollo h1[^{]*\{[^}]*text-transform:uppercase/],
  ['era-80s radius', /body\.era-80s \.card[^{]*\{[^}]*border-radius:4px/],
  ['era-90s2000s radius', /body\.era-90s2000s \.card[^{]*\{[^}]*border-radius:10px/],
  ['era-90s2000s glossy button', /body\.era-90s2000s \.btn[^{]*\{[^}]*linear-gradient/],
  ['era-spacex thin border', /body\.era-spacex \.card[^{]*\{[^}]*border-width:0\.5px/],
  ['era-apollo grid tint', /body\.era-apollo[^{]*\{[^}]*rgba\(90,72,46/],
  ['era-80s grid tint', /body\.era-80s[^{]*\{[^}]*rgba\(40,90,55/]
];
for (const [label, re] of GEOM) check('geometry preserved: ' + label, re.test(SRC));

/* manual theme pick must still beat era palette */
check('era palettes keep manual-theme override gate',
      (SRC.match(/body\.era-[a-z0-9]+:not\(\.theme-green\):not\(\.theme-beige\)/g) || []).length >= 4);
/* documented reuse is declared once, not duplicated */
check('era-80s shares the Control Room Green declaration',
      /body\.theme-green,\s*body\.era-80s:not\(\.theme-green\):not\(\.theme-beige\)\s*\{/.test(SRC));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
