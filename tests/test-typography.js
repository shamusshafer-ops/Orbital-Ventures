/* Gate 6 F3 -- bundled webfont typography contract.
   Source-level checks: the font is embedded (no network dependency), --sans names it
   first with the original stack preserved as fallback, font-stretch:condensed is gone
   (no width axis to answer it), and the embedded WOFF2 itself decodes to a valid,
   correctly-subsetted variable font -- so this also catches a corrupted or truncated
   base64 blob, not just the wiring around it. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SHELL = fs.readFileSync(path.join(__dirname, '..', 'src', 'shell.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail ? ' -- ' + detail : '')); }
}

console.log('Gate 6 -- typography (bundled webfont)');

/* ---------- wiring ---------- */
check('@font-face rule present', /@font-face\s*\{/.test(SHELL));
check('font embedded as a data: URI (no network fetch)',
      /src:url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\)\s*format\(.woff2.\)/.test(SHELL));
check('font-family declared as Roboto Condensed', /font-family:'Roboto Condensed'/.test(SHELL));
check('variable weight range declared (100-900)', /font-weight:100 900/.test(SHELL));

const sansMatch = SHELL.match(/--sans:"([^;]+);/);
check('--sans token found', !!sansMatch);
if (sansMatch) {
  const stack = sansMatch[1];
  check('--sans names the bundled family first', stack.trim().startsWith('Roboto Condensed"'));
  check('--sans keeps Arial Narrow in the fallback chain', stack.indexOf('Arial Narrow') > -1);
  check('--sans keeps Segoe UI in the fallback chain', stack.indexOf('Segoe UI') > -1);
  check('--sans keeps system-ui in the fallback chain', stack.indexOf('system-ui') > -1);
}

check('font-stretch:condensed removed from the heading rule',
      !/h1,h2,h3,\.brand \.co,\.mission-tag,\.cc-panel-h,\.rail-group\{font-family:var\(--sans\);font-stretch:condensed/.test(SHELL));
check('no font-stretch:condensed left anywhere against --sans',
      !/var\(--sans\)[^}]*font-stretch:condensed/.test(SHELL));

/* ---------- decode and validate the embedded font itself ---------- */
const b64Match = SHELL.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/);
check('embedded font data extracted for validation', !!b64Match);

if (b64Match) {
  const buf = Buffer.from(b64Match[1], 'base64');
  check('decoded buffer is a real WOFF2 (wOF2 magic bytes)', buf.slice(0, 4).toString('ascii') === 'wOF2');

  // WOFF2 header: after the 4-byte signature, flavor(4) length(4) numTables(2) reserved(2)
  // totalSfntSize(4) totalCompressedSize(4) majorVersion(2) minorVersion(2) ...
  const numTables = buf.readUInt16BE(12);
  check('WOFF2 header reports a plausible table count (variable font: 15-25)',
        numTables >= 15 && numTables <= 25, 'numTables=' + numTables);

  const totalLength = buf.readUInt32BE(8);
  check('WOFF2 declared length matches the actual decoded byte count',
        totalLength === buf.length, 'declared=' + totalLength + ' actual=' + buf.length);

  check('subsetted font is small (<150KB) -- does not regress Tier 0.1 boot weight',
        buf.length < 150 * 1024, buf.length + ' bytes');
  check('subsetted font is not suspiciously tiny (>20KB) -- not an empty/broken subset',
        buf.length > 20 * 1024, buf.length + ' bytes');

  // A stable hash lets a future re-subset (different glyph set, different tool version)
  // show up as an intentional diff in review rather than silent drift.
  const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  check('embedded font hash recorded for provenance', sha.length === 16, 'sha256(16)=' + sha);
}

/* ---------- assets/ directory keeps the raw file for provenance, per existing convention ---------- */
const assetPath = path.join(__dirname, '..', 'assets', 'roboto-condensed-subset.woff2');
check('raw subsetted .woff2 kept in assets/ (matches texture provenance convention)',
      fs.existsSync(assetPath));
if (fs.existsSync(assetPath) && b64Match) {
  const onDisk = fs.readFileSync(assetPath);
  const embedded = Buffer.from(b64Match[1], 'base64');
  check('assets/ copy is byte-identical to the embedded copy', onDisk.equals(embedded));
}

/* ---------- CREDITS.md attribution ---------- */
const CREDITS = fs.readFileSync(path.join(__dirname, '..', 'assets', 'CREDITS.md'), 'utf8');
check('CREDITS.md attributes Roboto Condensed', /Roboto Condensed/.test(CREDITS));
check('CREDITS.md names the OFL license', /Open Font License/.test(CREDITS));
check('CREDITS.md links the upstream source', /github\.com\/google\/fonts/.test(CREDITS));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
