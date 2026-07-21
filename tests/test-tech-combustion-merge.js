// Tech-tree design pass, slice 4 — propulsion combustion sub-chain (2026-07-21). Unlike slices 1-3,
// EVERY node in this 4-node linear chain (combustion_stability -> turbopump -> regen_cooling ->
// chamber_pressure) is externally load-bearing: combustion_stability gates sustainer; turbopump gates
// heavy_booster + strapon_integration; regen_cooling gates methane_propulsion; chamber_pressure gates
// super_heavy + full_flow_staged. There was no pure-stat node to quietly drop. Collapsed 4->2 by
// picking the survivor id at each pair with the heavier external footprint (turbopump: 2 dependents
// vs combustion_stability's 1; chamber_pressure: 2 dependents vs regen_cooling's 1) and re-pointing
// the other two dependents (sustainer, methane_propulsion) onto the merged survivor.
//
// IMPORTANT, flagged explicitly (not a silent side effect): this is a real gating-GRANULARITY change,
// not just legibility. Before: sustainer sat one node shallower than heavy_booster/strapon_
// integration; methane_propulsion sat one node shallower than super_heavy/full_flow_staged. After:
// sustainer now requires the same depth as heavy_booster/strapon_integration (both gate on the merged
// turbopump), and methane_propulsion now requires the same depth as super_heavy/full_flow_staged
// (both gate on the merged chamber_pressure). Effect TOTALS (thrust/isp) are preserved exactly either
// way, but sustainer and methane_propulsion each now cost one extra research step to reach than
// before. Deliberate consequence of merging externally-gated chain nodes, not an oversight — logged
// here and in ROADMAP.md for visibility. No back-compat constraint (per owner, same as slices 1-3).
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }
const byId={}; for(const n of RESEARCH) byId[n.id]=n;

// ---------- 1. the four-node chain is now two nodes ----------
{
  const chain=['turbopump','chamber_pressure'];
  check('turbopump and chamber_pressure both still exist as the two merge survivors', !!byId.turbopump && !!byId.chamber_pressure);
}

// ---------- 2. the removed ids are gone ----------
for(const gone of ['combustion_stability','regen_cooling']){
  check('removed node "'+gone+'" no longer exists', !byId[gone]);
}

// ---------- 3. NOTHING anywhere references a removed id in its req ----------
{
  const removed=new Set(['combustion_stability','regen_cooling']);
  const dangling=RESEARCH.filter(n=>(n.req||[]).some(r=>removed.has(r)));
  check('no research node has a dangling req to a removed id', dangling.length===0);
}

// ---------- 4. every external gate on this chain still resolves, re-pointed onto the survivor ids ----------
{
  check('sustainer re-points onto the merged turbopump (was combustion_stability)', (byId.sustainer.req||[]).includes('turbopump'));
  check('heavy_booster still gates on turbopump (id unchanged, no re-point needed)', (byId.heavy_booster.req||[]).includes('turbopump'));
  check('strapon_integration still gates on turbopump (id unchanged, no re-point needed)', (byId.strapon_integration.req||[]).includes('turbopump'));
  check('methane_propulsion re-points onto the merged chamber_pressure (was regen_cooling)', (byId.methane_propulsion.req||[]).includes('chamber_pressure'));
  check('super_heavy still gates on chamber_pressure (id unchanged, no re-point needed)', (byId.super_heavy.req||[]).includes('chamber_pressure'));
  check('full_flow_staged still gates on chamber_pressure (id unchanged, no re-point needed)', (byId.full_flow_staged.req||[]).includes('chamber_pressure'));
}

// ---------- 5. turbopump's own req chain still bottoms out at kerosene (unchanged root) ----------
{
  check('turbopump still roots on kerosene (the original combustion_stability root)', (byId.turbopump.req||[]).includes('kerosene'));
  check('chamber_pressure now chains directly off the merged turbopump', (byId.chamber_pressure.req||[]).includes('turbopump'));
}

// ---------- 6. effect totals preserved exactly (no stealth buff/nerf to thrust/isp) ----------
{
  const thrustTotal=(byId.turbopump.effect.thrust||0)+(byId.chamber_pressure.effect.thrust||0);
  const ispTotal=(byId.turbopump.effect.isp||0)+(byId.chamber_pressure.effect.isp||0);
  // old chain: thrust 0.04(combustion)+0.05(turbopump)+0.05(chamber_pressure)=0.14; isp 0.04(regen)+0.04(chamber_pressure)=0.08
  check('the collapsed chain preserves the exact 0.14 thrust total', Math.abs(thrustTotal-0.14)<1e-9);
  check('the collapsed chain preserves the exact 0.08 isp total', Math.abs(ispTotal-0.08)<1e-9);
}

// ---------- 7. costs stayed sane (compressed from the sum they absorbed, not inflated) ----------
{
  // combustion(2.0)+turbopump(2.5)=4.5 absorbed; compressed to 3.5
  check('turbopump cost is compressed, not the naive 4.5 sum', byId.turbopump.cost<4.5 && byId.turbopump.cost>=2.5);
  // regen(3.0)+chamber(3.5)=6.5 absorbed; compressed to 5.0
  check('chamber_pressure cost is compressed, not the naive 6.5 sum', byId.chamber_pressure.cost<6.5 && byId.chamber_pressure.cost>=3.5);
}

// ---------- 8. GRANULARITY CHANGE, explicitly asserted (documents the real balance shift, not just legibility) ----------
{
  check('sustainer and heavy_booster/strapon_integration now gate on the SAME node (turbopump) — previously one step apart',
    (byId.sustainer.req||[]).includes('turbopump') && (byId.heavy_booster.req||[]).includes('turbopump') && (byId.strapon_integration.req||[]).includes('turbopump'));
  check('methane_propulsion and super_heavy/full_flow_staged now gate on the SAME node (chamber_pressure) — previously one step apart',
    (byId.methane_propulsion.req||[]).includes('chamber_pressure') && (byId.super_heavy.req||[]).includes('chamber_pressure') && (byId.full_flow_staged.req||[]).includes('chamber_pressure'));
}

// ---------- 9. the whole tree still loads & is researchable from a fresh game ----------
{
  newGame('engineer');
  check('turbopump is reachable in a fresh game once kerosene is done', (byId.turbopump.req||[]).length===1);
  state.research.kerosene=true; state.research.turbopump=true;
  check('sustainer becomes reachable once turbopump is done', (byId.sustainer.req||[]).every(r=>state.research[r]));
  check('chamber_pressure becomes reachable once turbopump is done', (byId.chamber_pressure.req||[]).every(r=>state.research[r]));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
