// Tier 0.3 (2026-08-04) — header + Δv/TWR readout tooltips for jargon-cold new-player stats.
// Source-guard test, same pattern as test-scene-shell-contract.js / test-map-sm1-sm5-source.js:
// reads src/shell.html and src/render.js directly rather than rendering, since these are static
// title= attributes on markup that either has them or doesn't.
const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; } else { fail++; console.log('FAIL:', name); } }

const repo = fs.existsSync(path.join(__dirname, '..', 'src', 'shell.html')) ? path.join(__dirname, '..') : process.cwd();
const shellSource = fs.readFileSync(path.join(repo, 'src', 'shell.html'), 'utf8');
const renderSource = fs.readFileSync(path.join(repo, 'src', 'render.js'), 'utf8');

// Every header stat id that previously had no title= now has one on its containing .stat div.
const headerStatIds = ['stDate', 'stMoney', 'stRep', 'stFlights', 'stSupport', 'stMarketWrap', 'stRoyaltyWrap', 'stPassiveWrap', 'stInfraWrap', 'stSciWrap', 'stDepotWrap'];
for (const id of headerStatIds) {
  // the title= attribute sits on the same <div class="stat ..."> that carries the id (or its Wrap id)
  const re = new RegExp(`<div class="stat[^"]*"[^>]*id="${id}"[^>]*title="[^"]+"|<div class="stat[^"]*" title="[^"]+"[^>]*id="${id}"`, 's');
  // ids without a *Wrap suffix live directly on a bare .stat div with no id at all preceding the span — fall back to a looser check for those (stDate/stMoney/stRep/stFlights/stSupport)
  const looseRe = new RegExp(`<div class="stat[^"]*"\\s+title="[^"]+"[^>]*>\\s*<span class="k">[^<]*</span><span class="v" id="${id}"`, 's');
  check(`header stat "${id}" has a title tooltip`, re.test(shellSource) || looseRe.test(shellSource));
}

// The Δv gauge and Liftoff TWR metric in the bench readout now carry title= too.
check('Δv gauge has a title tooltip', /class="gauge" title="[^"]*Δv[^"]*"/.test(renderSource));
check('Liftoff TWR metric has a title tooltip', /class="metric" title="[^"]+"><div class="k">Liftoff TWR<\/div>/.test(renderSource));

console.log(`${pass}/${pass + fail} checks passed`);
if (typeof process !== 'undefined') process.exit(fail ? 1 : 0);
