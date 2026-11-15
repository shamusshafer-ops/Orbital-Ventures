// Spine step 6 (2026-11-16): rivals run on the world clock. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const monthTick=()=>{ state.month++; if(state.month>11){ state.month=0; state.year++; } tickRivals(); };
const vost=RIVALS.find(r=>r.id==='vostochny'), satFirst=vost.firsts.find(f=>f.missionId==='first_sat');

newGame('engineer');
check('a new game: no lead, the rival clock is the calendar', state.rivalLead===0 && rivalYear()===state.year && frontierLeadYears()===0);

// passive player: history unchanged (first satellite near its nominal year)
{
  newGame('engineer'); let claimed=null;
  while(state.year<1966 && claimed===null){ monthTick(); if(state.rivalFired['vostochny|'+satFirst.name]) claimed=state.year; }
  check('with no player progress the rival satellite lands near history (1953-1961)', claimed!==null && claimed>=1953 && claimed<=1961);
}

// a sprinting player: the world clock jumps and rivals keep pace
{
  newGame('engineer');
  PROGRAMS.find(p=>p.id==='pioneer').missions.forEach(m=>{ state.completed[m]=true; });
  const lead=frontierLeadYears();
  check('finishing Pioneer in 1942 puts the frontier 15 years ahead', lead===ERAS[1].from-1942);
  tickRivals();
  check('rivals adopt the lead', state.rivalLead===lead && rivalYear()===1942+lead);
  const rs=rivalStateFor(vost), cost=(RIVAL_PROFILES.vostochny.income)*12*Math.max(RIVAL_MIN_WINDOW, satFirst.year-(satFirst.year-RIVAL_FIRST_RUNWAY));
  check('they are credited savings for the skipped years, capped at half the goal cost', rs.capital>0 && rs.capital<=cost*RIVAL_CATCHUP_CAP+RIVAL_PROFILES.vostochny.income*RIVAL_MOM_MAX+1e-9); // plus the tick's own month of saving
  check('so a jump never hands a rival a first on the spot', !state.rivalFired['vostochny|'+satFirst.name]);
  check('the catch-up is announced once', (state.log||[]).filter(e=>/rival agencies are \d+ years ahead of history/.test(e.msg||'')).length===1);
  tickRivals();
  check('…and not again without a new jump', (state.log||[]).filter(e=>/rival agencies are \d+ years ahead of history/.test(e.msg||'')).length===1);
  let claimed=null; while(state.year<1952 && claimed===null){ monthTick(); if(state.rivalFired['vostochny|'+satFirst.name]) claimed=state.year; }
  check('the rival satellite now comes within a few years of the player\'s pace (by 1949)', claimed!==null && claimed<=1949);
  const leadNow=state.rivalLead; state.year+=10;
  check('the lead never shrinks as the calendar catches up', state.rivalLead===leadNow && leadNow>=lead);
}

// projections are shown in calendar years
{
  newGame('engineer'); PROGRAMS.find(p=>p.id==='pioneer').missions.forEach(m=>{ state.completed[m]=true; }); tickRivals();
  const p=rivalProjectedYear(vost);
  check('the Standings projection is a calendar year on the world clock', p && p.year<satFirst.year && p.year>=1942);
}

// contested late firsts
{
  const contested=RIVALS.flatMap(r=>r.firsts).filter(f=>f.missionId).map(f=>f.missionId);
  check('seven rival firsts contest player missions', contested.length===7 && ['first_sat','crew_orbit','luna_landing','jupiter_flyby','belt_survey','jupiter_orbit','belt_mining'].every(m=>contested.includes(m)));
  check('every contested mission exists', contested.every(m=>MISSIONS.some(x=>x.id===m)));
  const outer=PROGRAMS.find(p=>p.id==='outer');
  check('rivals can now complete Outer Worlds for the world (frontier)', outer.missions.every(m=>contested.includes(m)));
}

// front page: a rival matching a milestone you already reached
{
  newGame('engineer'); state.completed.first_sat=true; state.frontPages=[]; fireRivalFirst(vost,satFirst);
  const fp=(state.frontPages||[]).map(x=>JSON.stringify(x)).join(' ');
  check('the front page credits your program when you got there first', /matches a milestone your program reached first/.test(fp) && !/hasn't/.test(fp));
}
check('SAVE_VERSION bumped for state.rivalLead', SAVE_VERSION>=72);
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
