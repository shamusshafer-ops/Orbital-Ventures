// E1.1 slice B — rival intel dossier: generalize the single-goal projection into a full
// remaining-firsts timeline (rivalFullProjection), a one-time paid unlock per rival
// (buyRivalIntel / state.rivalIntel), and the Standings dossier block that renders it.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

function sameProj(a, b){
  if(!a || !b) return a===b;
  return a.goal===b.goal && a.year===b.year && a.nominal===b.nominal;
}

// ---------- 1. parity: rivalProjectedYear === rivalFullProjection(r)[0] for the next goal ----------
newGame('engineer');
// advance a little so momentum/capital have drifted off their seed values for a real comparison
for(let i=0;i<24;i++){ tickRivals(); }
for(const r of RIVALS.slice(0,3)){
  const single=rivalProjectedYear(r);
  const full=rivalFullProjection(r);
  const head=full[0]||null;
  check(`parity: ${r.id} single === full[0]`, sameProj(single, head));
}
// at least 2 distinct rivals actually have a pending goal to compare (guard the parity isn't vacuous)
const withPending=RIVALS.filter(r=>rivalProjectedYear(r)!==null).length;
check('parity: at least 2 rivals have a pending goal (non-vacuous)', withPending>=2);

// ---------- 2. rivalFullProjection: one entry per remaining goal, ordered, non-decreasing year ----------
newGame('engineer');
for(let i=0;i<12;i++){ tickRivals(); }
for(const r of RIVALS){
  const rs=rivalStateFor(r);
  const full=rivalFullProjection(r);
  check(`length: ${r.id} one entry per remaining goal`, full.length===(r.firsts.length-rs.idx));
  let ordered=true, nonDec=true;
  for(let i=0;i<full.length;i++){
    if(full[i].goal!==r.firsts[rs.idx+i]) ordered=false;      // same order as r.firsts from rs.idx
    if(i>0 && full[i].year<full[i-1].year) nonDec=false;      // later goals project no earlier
  }
  check(`order: ${r.id} entries follow r.firsts from rs.idx`, ordered);
  check(`monotonic: ${r.id} projected years non-decreasing`, nonDec);
}

// ---------- 3. buyRivalIntel: affordability, deduction, idempotence ----------
newGame('engineer');
const rid=RIVALS[0].id;
state.money=RIVAL_INTEL_COST-0.5; // short
let m0=state.money;
let r0=buyRivalIntel(rid);
check('buy: fails when short on money (returns false)', r0===false);
check('buy: no money change when short', state.money===m0);
check('buy: no state set when short', !rivalIntelOwned(rid) && !(state.rivalIntel&&state.rivalIntel[rid]));

state.money=10;
let m1=state.money;
let r1=buyRivalIntel(rid);
check('buy: succeeds when affordable (returns true)', r1===true);
check('buy: deducts exactly RIVAL_INTEL_COST', Math.abs(state.money-(m1-RIVAL_INTEL_COST))<1e-9);
check('buy: sets ownership flag', rivalIntelOwned(rid) && state.rivalIntel[rid]===true);

let m2=state.money;
let r2=buyRivalIntel(rid); // second call — already owned
check('buy: second call on owned rival is a no-op (returns false)', r2===false);
check('buy: second call does not double-charge', state.money===m2);

// ---------- 4. render smoke: renderRivals doesn't throw, dossier appears only for the bought rival ----------
const _elCache={};
const _origGEBI=global.document.getElementById.bind(global.document);
global.document.getElementById=(id)=>{ if(!(id in _elCache)) _elCache[id]=_origGEBI(id); return _elCache[id]; };
function htmlOf(id){ const el=_elCache[id]; return el?el.innerHTML:''; }

newGame('engineer');
let threwBefore=false;
try{ renderRivals(); }catch(e){ threwBefore=true; console.log('threw(before):', e && e.message); }
check('render: renderRivals does not throw before any purchase', !threwBefore);
const htmlBefore=htmlOf('rivalsCard');
check('render: no dossier block before buying', !htmlBefore.includes('Full program projection'));
check('render: buy-intel button offered before purchase', htmlBefore.includes('Buy intel dossier'));

state.money=10;
const boughtId=RIVALS[0].id;
buyRivalIntel(boughtId);
let threwAfter=false;
try{ renderRivals(); }catch(e){ threwAfter=true; console.log('threw(after):', e && e.message); }
check('render: renderRivals does not throw after buying', !threwAfter);
const htmlAfter=htmlOf('rivalsCard');
check('render: dossier block appears after buying', htmlAfter.includes('Full program projection'));
check('render: owned button label shown for bought rival', htmlAfter.includes('Dossier owned'));
// dossier appears exactly once — only for the one rival bought, not the others
const occ=(htmlAfter.match(/Full program projection/g)||[]).length;
check('render: dossier block present for exactly one rival', occ===1);
check('render: other rivals still offer the buy button', htmlAfter.includes('Buy intel dossier'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
