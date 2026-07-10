#!/usr/bin/env node
// Orbital Ventures build. Zero dependencies; run as `node build.js`.
//
// The game lives in src/*.js (7 plain classic-script modules loaded in the
// order below into one shared global scope) plus src/shell.html (the page
// template with the whole <script> block replaced by <!-- OV:SCRIPTS -->).
//
// Outputs:
//   orbital-ventures.html  release: one inline <script> = modules concatenated.
//                          <script>/</script> each on their own line so the
//                          test harness's awk extraction keeps working.
//   build/game.js          the bare concatenated script body, for the harness.
//   index.html             dev page: one <script src="src/X.js"> per module,
//                          same order, same template — so dev and release
//                          can't drift structurally.
//
// MODULES is the single order source of truth.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const BUILD = path.join(ROOT, 'build');

const MODULES = [
  'data.js',
  'sim.js',
  'save.js',
  'shell.js',
  'flight.js',
  'render.js',
  'main.js',
];

const PLACEHOLDER = '<!-- OV:SCRIPTS -->\n';

function read(p) { return fs.readFileSync(p); }

// Concatenated script body (no separator — modules are exact line-range slices
// whose concatenation reproduces the original inline script byte-for-byte).
const body = Buffer.concat(MODULES.map((m) => read(path.join(SRC, m))));

const shell = read(path.join(SRC, 'shell.html'));
const idx = shell.indexOf(PLACEHOLDER);
if (idx === -1) throw new Error('placeholder not found in src/shell.html');
const before = shell.slice(0, idx);
const after = shell.slice(idx + PLACEHOLDER.length);

// --- release: orbital-ventures.html ---
const scriptBlock = Buffer.concat([
  Buffer.from('<script>\n'),
  body,
  Buffer.from('</script>\n'),
]);
const releaseHtml = Buffer.concat([before, scriptBlock, after]);
fs.writeFileSync(path.join(ROOT, 'orbital-ventures.html'), releaseHtml);

// --- harness body: build/game.js ---
fs.mkdirSync(BUILD, { recursive: true });
fs.writeFileSync(path.join(BUILD, 'game.js'), body);

// --- dev: index.html ---
const devTags = Buffer.from(
  MODULES.map((m) => `<script src="src/${m}"></script>`).join('\n') + '\n'
);
const devHtml = Buffer.concat([before, devTags, after]);
fs.writeFileSync(path.join(ROOT, 'index.html'), devHtml);

console.log('build ok:');
console.log('  orbital-ventures.html', releaseHtml.length, 'bytes');
console.log('  build/game.js        ', body.length, 'bytes');
console.log('  index.html           ', devHtml.length, 'bytes');
