// Appended after prelude.js + extracted-script.js in the same file scope, so it can see
// `state` and every game function directly. Game auto-boots (newGame(); render(); ...)
// at the bottom of the extracted script before this code runs.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function approx(a,b,eps){ eps=eps===undefined?1e-6:eps; return Math.abs(a-b)<=eps; }
state.money=100; // this suite buys several batches; give it ample cash so it tests material logic, not the difficulty's starting-cash balance (see DIFFICULTY.engineer.startMoney)

// ---------- 1. Boot sanity ----------
check('boot: state exists', !!state);
check('boot: materials state has both commodities', state.materials && state.materials.alloy && state.materials.electronics);
check('boot: MATERIAL_DEFS has 2 entries', MATERIAL_DEFS.length===2);

// ---------- 2. Retired primitives are gone / dip primitives exist ----------
check('retired: canBuyMaterialStock is gone', typeof canBuyMaterialStock === 'undefined');
check('retired: buyMaterialStock is gone', typeof buyMaterialStock === 'undefined');
check('retired: canSignMaterialContract is gone', typeof canSignMaterialContract === 'undefined');
check('retired: signMaterialContract is gone', typeof signMaterialContract === 'undefined');
check('new: isMaterialDip exists', typeof isMaterialDip === 'function');
check('new: buyMaterialDip exists', typeof buyMaterialDip === 'function');
check('new: canBuyMaterialDip exists', typeof canBuyMaterialDip === 'function');
check('new: materialDipUnitCost exists', typeof materialDipUnitCost === 'function');

// ---------- 3. Dip detection is exactly threshold-gated ----------
{
  const s = materialState('alloy');
  s.spot = MATERIAL_DIP_THRESHOLD; // exactly at threshold => dip (<=)
  check('dip: at threshold is a dip', isMaterialDip('alloy')===true);
  s.spot = round2(MATERIAL_DIP_THRESHOLD + 0.01);
  check('dip: just above threshold is NOT a dip', isMaterialDip('alloy')===false);
  s.spot = round2(MATERIAL_DIP_THRESHOLD - 0.01);
  check('dip: just below threshold IS a dip', isMaterialDip('alloy')===true);
  s.spot = 1.0; // reset
}

// ---------- 4. Dip pricing is a real discount vs spot, and vs pre-collapse per-unit price ----------
{
  const s = materialState('alloy'), d = materialDef('alloy');
  s.spot = 0.80;
  const dipUnit = materialDipUnitCost('alloy');
  const naiveUnit = round2(d.share*s.spot*MATERIAL_STOCK_UNIT_BUILD); // old materialUnitBuyCost formula
  check('dip price: strictly cheaper than naive spot price', dipUnit < naiveUnit);
  check('dip price: matches spot*(1-bonus)*share exactly', approx(dipUnit, round2(d.share*s.spot*(1-MATERIAL_DIP_BONUS)*MATERIAL_STOCK_UNIT_BUILD), 1e-9));
  s.spot = 1.0;
}

// ---------- 5. canBuyMaterialDip gates correctly: not-a-dip, no-cash, yard-cap ----------
{
  const s = materialState('electronics');
  s.spot = 1.0; s.stock = 0;
  let chk = canBuyMaterialDip('electronics');
  check('gate: refuses when not in dip band', chk.ok===false);

  s.spot = 0.80; // now a dip
  const savedMoney = state.money;
  state.money = 0;
  chk = canBuyMaterialDip('electronics');
  check('gate: refuses with no capital', chk.ok===false && /capital/i.test(chk.why));
  state.money = savedMoney;

  s.stock = MATERIAL_STOCK_CAP; // yard already full
  chk = canBuyMaterialDip('electronics');
  check('gate: refuses when yard is already at cap', chk.ok===false);
  s.stock = 0; s.spot = 1.0;
}

// ---------- 6. buyMaterialDip: money debited exactly, stock/avgCost update correctly, batch capped by yard room ----------
{
  const s = materialState('alloy');
  s.spot = 0.75; s.stock = 0; s.avgCost = 1.0;
  const before = state.money;
  const chk = canBuyMaterialDip('alloy');
  check('buy: precheck ok on a real dip with cash', chk.ok===true);
  buyMaterialDip('alloy');
  const spent = round2(before - state.money);
  check('buy: money debited exactly matches quoted cost', approx(spent, chk.cost, 1e-6));
  check('buy: stock increased by the batch size', s.stock === Math.min(MATERIAL_DIP_BATCH, MATERIAL_STOCK_CAP));
  check('buy: avgCost pulled down toward the discounted unit price', s.avgCost < 1.0);

  // batch capped by remaining yard room, not the full MATERIAL_DIP_BATCH
  s.stock = MATERIAL_STOCK_CAP - 2; s.spot = 0.75;
  const units = materialDipUnits('alloy');
  check('buy: batch caps at remaining yard room when near cap', units === 2);
  buyMaterialDip('alloy');
  check('buy: stock lands exactly at cap, never over', s.stock === MATERIAL_STOCK_CAP);

  // reset for downstream tests
  s.stock = 0; s.avgCost = 1.0; s.spot = 1.0;
}

// ---------- 7. buyMaterialDip refuses silently (no state change) when preconditions fail ----------
{
  const s = materialState('electronics');
  s.spot = 1.0; s.stock = 0;
  const moneyBefore = state.money, stockBefore = s.stock;
  buyMaterialDip('electronics'); // not a dip — should no-op
  check('no-op: money unchanged when not a dip', state.money === moneyBefore);
  check('no-op: stock unchanged when not a dip', s.stock === stockBefore);
}

// ---------- 8. consumeMaterialsForBuild / materialEffectivePrice / materialCostMult untouched by the collapse ----------
{
  const s = materialState('alloy');
  s.stock = 3; s.avgCost = 0.9;
  check('consume: effective price uses avgCost while stocked', approx(materialEffectivePrice('alloy'), 0.9, 1e-9));
  const drew = consumeMaterialsForBuild();
  check('consume: draws from alloy stock', drew.alloy===true);
  check('consume: stock decremented by exactly 1', s.stock === 2);
  s.stock = 0; s.spot = 1.0; s.avgCost = 1.0;
  check('cost mult: blend is 1.0 at baseline spot/no stock', approx(materialCostMult(), 1.0, 1e-6));
}

// ---------- 9. materialPriceTick: legacy contract still resolves/expires, no crash without one ----------
{
  const s = materialState('alloy');
  s.contract = {lockedPrice: 1.05, monthsLeft: 1};
  materialPriceTick();
  check('legacy contract: expires after ticking past 0', s.contract === null);
  materialPriceTick(); // no contract now — must not throw
  check('legacy contract: no contract present after expiry, tick is a no-op on it', state.materials.alloy.contract === null);
}

// ---------- 10. Save/load roundtrip survives with an active dip + stock ----------
{
  const s = materialState('electronics');
  s.spot = 0.75; s.stock = 4; s.avgCost = 0.77;
  saveGame();
  const beforeStock = s.stock, beforeAvg = s.avgCost;
  s.stock = 999; // scramble live state to prove load actually restores it
  loadGame();
  const s2 = materialState('electronics');
  check('save/load: stock roundtrips', s2.stock === beforeStock);
  check('save/load: avgCost roundtrips', approx(s2.avgCost, beforeAvg, 1e-9));
  check('save/load: game still renders after load', (()=>{ try{ render(); return true; }catch(e){ console.log(e.stack); return false; } })());
}

// ---------- 11. Render panel doesn't throw, and produces the dip button only when dipped ----------
{
  state.money = 999; // fund generously — isolating detection/render, affordability gating already covered by test 5
  materialState('alloy').spot = 1.0; materialState('alloy').stock = 0;
  materialState('electronics').spot = 1.0; materialState('electronics').stock = 0;
  const s = materialState('alloy');
  let html;
  try{ html = productionPanelHTML(); } catch(e){ html = null; console.log('render threw:', e.stack); }
  check('render: productionPanelHTML returns without throwing', html !== null);
  check('render: no dip button text when nothing is on sale', !/On sale/.test(html));

  s.spot = 0.80; // force a dip
  try{ html = productionPanelHTML(); } catch(e){ html = null; console.log('render threw (dip):', e.stack); }
  check('render: dip button text appears when a commodity is on sale', /On sale/.test(html));
  check('render: no leftover contract-sign button text', !/Sign 12-mo lock/.test(html));
  s.spot = 1.0;
}

// ---------- 12. Outliner surfaces the dip opportunity, and only then ----------
{
  const s = materialState('electronics');
  s.spot = 1.0;
  let items = outlinerItems();
  check('outliner: no material item when nothing is on sale', !items.some(it=>/on sale/i.test(it.label)));
  s.spot = 0.75; s.stock = 0;
  items = outlinerItems();
  check('outliner: material item appears when on sale and affordable', items.some(it=>/on sale/i.test(it.label)));
  s.spot = 1.0; s.stock = 0;
}

// ---------- 13. Cape mfg glyph reflects a dip ----------
{
  materialState('alloy').spot = 1.0; materialState('alloy').stock = 0;
  materialState('electronics').spot = 1.0; materialState('electronics').stock = 0;
  const s = materialState('alloy');
  let g = buildingGlyph('mfg');
  check('glyph: ok/idle when nothing on sale', g.state!=='attention' || !/on sale/i.test(g.label));
  s.spot = 0.75; s.stock=0;
  g = buildingGlyph('mfg');
  check('glyph: attention + "on sale" label when dipped', g.state==='attention' && /on sale/i.test(g.label));
  s.spot = 1.0;
}

// ---------- 14. Full build-cost pipeline still works end to end (materialCostMult feeds buildCost) ----------
{
  try{
    const v = computeVehicle();
    check('pipeline: computeVehicle succeeds with collapsed market wired in', v && typeof v.buildCost === 'number' && v.buildCost > 0);
  }catch(e){ check('pipeline: computeVehicle succeeds with collapsed market wired in', false); console.log(e.stack); }
}

// ---------- 15. 300-tick smoke test: advancing time never throws with the new dip logic live ----------
{
  let threw = false;
  try{
    for(let i=0;i<300;i++){ advanceDays(30); if(state.over) break; }
  }catch(e){ threw = true; console.log('300-tick smoke threw:', e.stack); }
  check('smoke: 300 monthly ticks with dip mechanic never throws', !threw);
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
