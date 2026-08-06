// Tier 2 B5 (2026-08-04) — standing guard for RESEARCH_EMPTY_EFFECT_ALLOWLIST.
// The audit found zero placeholders among the 14 empty-effect nodes — every one is legitimately
// empty. This test doesn't re-litigate that judgment; it guards the INVARIANT going forward: any
// node with effect:{} must be documented, any documented id must still be real and still empty, and
// every reason string must actually explain something. Catches both directions of drift: a new
// undocumented placeholder slipping in, and a stale allowlist entry surviving a future edit that
// gives that node a real payload (which should have removed it from the list, not left it stale).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- every empty-effect node is on the allowlist, and vice versa ----------
{
  const emptyIds=RESEARCH.filter(r=>r.effect && Object.keys(r.effect).length===0).map(r=>r.id);
  const allowIds=Object.keys(RESEARCH_EMPTY_EFFECT_ALLOWLIST);

  const undocumented=emptyIds.filter(id=>!allowIds.includes(id));
  check('every RESEARCH node with effect:{} is on the allowlist (no undocumented placeholder)', undocumented.length===0);
  if(undocumented.length) console.log('   undocumented empty-effect nodes:', undocumented.join(', '));

  const stale=allowIds.filter(id=>!emptyIds.includes(id));
  check('every allowlisted id is a RESEARCH node that still exists and is still empty', stale.length===0);
  if(stale.length) console.log('   stale allowlist entries (node missing, or no longer empty):', stale.join(', '));

  check('the allowlist currently documents exactly 14 nodes (the 2026-08-04 audit count)', allowIds.length===14);
}

// ---------- every reason string is real, not a rubber-stamp ----------
{
  let bad=[];
  for(const [id, reason] of Object.entries(RESEARCH_EMPTY_EFFECT_ALLOWLIST)){
    if(typeof reason!=='string' || reason.trim().length<10) bad.push(id);
  }
  check('every allowlist entry has a substantive (non-trivial) reason string', bad.length===0);
  if(bad.length) console.log('   thin/missing reasons:', bad.join(', '));
}

// ---------- spot-check: the three claimed categories actually hold up ----------
{
  // bespoke: the node's id appears in live game logic outside of its own RESEARCH definition
  const bespoke=['strapon_integration','orbital_eva','cryo_boiloff_control','megawatt_electric','gravity_assist_planning','aerocapture','surface_fission_power'];
  const fs=require('fs'), path=require('path');
  const repo=fs.existsSync(path.join(__dirname,'..','src','data.js')) ? path.join(__dirname,'..') : process.cwd();
  const simSrc=fs.readFileSync(path.join(repo,'src','sim.js'),'utf8');
  const renderSrc=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
  let notBespoke=[];
  for(const id of bespoke){
    const dotRef=new RegExp(`research\\.${id}\\b|research\\['${id}'\\]|research\\["${id}"\\]`);
    if(!dotRef.test(simSrc) && !dotRef.test(renderSrc)) notBespoke.push(id);
  }
  check('every claimed "bespoke-implemented" node has a live state.research.<id> reference in sim.js or render.js', notBespoke.length===0);
  if(notBespoke.length) console.log('   no bespoke reference found for:', notBespoke.join(', '));

  // capability gates: reqResearch elsewhere in data.js
  const dataSrc=fs.readFileSync(path.join(repo,'src','data.js'),'utf8');
  for(const id of ['precision_edl','onorbit_servicing']){
    check(`capability gate "${id}" is referenced by a reqResearch elsewhere in data.js`,
      new RegExp(`reqResearch:'${id}'`).test(dataSrc));
  }

  // pure prereqs: appears in another node's req:[...]
  for(const id of ['electrolysis_scaleup','station_keeping','large_space_stations','autonomous_operations','hydrogen_storage']){
    check(`prereq "${id}" is named in another RESEARCH node's req:[...]`,
      new RegExp(`req:\\[[^\\]]*'${id}'`).test(dataSrc));
  }
}

console.log(`${pass}/${pass+fail} checks passed`);
if(typeof process!=='undefined') process.exit(fail?1:0);
