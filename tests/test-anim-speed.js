// Flight animation playback speed range widened (2026-07-20): from a narrow 0.5/1/2x cycle to
// 0.1x (sub-fps slow-mo) through 50x (fast-forward long coasts), defaulting to slow-mo for launches. Default changed to 1x on 2026-11-14 (owner request); last choice persists.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

check('speed set includes a genuinely slow (sub-1x, near sub-fps) option', ANIM_SPEEDS.some(s=>s.mult<=0.1));
check('speed set includes a fast option well beyond the old 2x ceiling', ANIM_SPEEDS.some(s=>s.mult>=25));
check('speed set includes exactly one 1x Normal entry', ANIM_SPEEDS.filter(s=>s.mult===1).length===1);
check('multipliers are strictly increasing (sensible cycle order)', ANIM_SPEEDS.every((s,i)=>i===0||s.mult>ANIM_SPEEDS[i-1].mult));

check('default speed index points at the 1x normal entry', ANIM_SPEEDS[animSpeedIdx].mult===1 && animSpeedIdx===ANIM_SPEED_DEFAULT_IDX);
{
  const before=animSpeedIdx;
  cycleAnimSpeed();
  check('cycling persists the chosen speed for the next session', localStorage.getItem('ov_anim_speed')===String(animSpeedIdx));
  while(animSpeedIdx!==before) cycleAnimSpeed();
}
check('animSpeed() returns 1 by default', animSpeed()===1);
{
  const btn={textContent:'stale'}; const orig=document.getElementById;
  document.getElementById=id=>id==='animSpeedBtn'?btn:orig.call(document,id);
  try{ syncAnimSpeedBtn(); } finally { document.getElementById=orig; }
  check('speed button label is synced from animSpeedIdx, not static markup', btn.textContent===ANIM_SPEEDS[animSpeedIdx].label);
  const fs=require('fs'), path=require('path');
  const flightPath=[path.join(process.cwd(),'src','flight.js'), path.join(process.cwd(),'..','src','flight.js')].find(p=>fs.existsSync(p));
  const src=flightPath?fs.readFileSync(flightPath,'utf8'):'';
  check('playMission syncs the speed button when the overlay opens', /function playMission[\s\S]{0,300}syncAnimSpeedBtn\(\)/.test(src));
}

{
  const start=animSpeedIdx;
  cycleAnimSpeed();
  check('cycling moves to the next entry', animSpeedIdx===(start+1)%ANIM_SPEEDS.length);
  check('animSpeed() reflects the new index', animSpeed()===ANIM_SPEEDS[animSpeedIdx].mult);
  for(let i=0;i<ANIM_SPEEDS.length;i++) cycleAnimSpeed();
  check('cycling wraps back around to the same index after a full loop', animSpeedIdx===(start+1)%ANIM_SPEEDS.length);
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
