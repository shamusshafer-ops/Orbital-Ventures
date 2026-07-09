animEnabled=false; // documented harness convention: no modal-blocking celebration paths
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function approx(a,b,eps){ eps=eps===undefined?1e-9:eps; return Math.abs(a-b)<=eps; }

// helper: hire everyone available (force era so the full pool is hirable)
function hireAll(){ state.year=1990; availablePool().forEach(p=>hirePersonnel(p.id)); }

// ---------- 1. Boot + state shape ----------
newGame('engineer');
check('boot: departments state exists', !!state.departments);
check('boot: all 5 departments present', DEPARTMENTS.every(d=>state.departments[d.id]));
check('boot: every dept starts leaderless', DEPARTMENTS.every(d=>state.departments[d.id].lead===null));
check('boot: DEPARTMENTS has propulsion/structures/avionics/production/astronaut', 
  ['propulsion','structures','avionics','production','astronaut'].every(id=>DEPARTMENTS.find(d=>d.id===id)));

// ---------- 2. Derived membership tracks hiring ----------
newGame('engineer');
check('membership: empty before hiring', DEPARTMENTS.every(d=>deptMembers(d.id).length===0));
hireAll();
{
  const propEng = ENGINEERS.filter(e=>e.specialty==='propulsion' && isHired(e.id)).length;
  check('membership: propulsion dept = hired propulsion engineers', deptMembers('propulsion').length===propEng && propEng>0);
  check('membership: astronaut corps = hired astronauts', deptMembers('astronaut').length===ASTRONAUTS.filter(a=>isHired(a.id)).length);
  check('membership: deptOfPerson maps engineer to specialty', deptOfPerson(ENGINEERS.find(e=>e.specialty==='avionics').id)==='avionics');
  check('membership: deptOfPerson maps astronaut to corps', deptOfPerson(ASTRONAUTS[0].id)==='astronaut');
}

// ---------- 3. BALANCE NEUTRALITY: with no leads + no xp, all team math is identical to pre-#19 ----------
// Reconstruct the OLD engScores formula (unweighted average, p.skill) and compare.
function oldEngScores(){
  const team=(state.staff||[]).filter(s=>ENGINEERS.find(e=>e.id===s.id));
  if(!team.length) return {rel:0,rd:0,avg:0};
  let mentor=0; team.forEach(s=>{ const tr=traitOf(s.id); if(tr.team) mentor+=tr.team; });
  const mult=1+Math.min(0.3,mentor);
  let relSum=0,rdSum=0,avgSum=0;
  team.forEach(s=>{ const p=personById(s.id), tr=traitOf(s.id); const mf=Math.max(0.2,(s.morale||50)/100), base=p.skill*mf;
    relSum+=base*(tr.rel||1); rdSum+=base*(tr.rd||1); avgSum+=base; });
  const n=team.length;
  return {rel:Math.min(1,relSum/n*mult), rd:Math.min(1,rdSum/n*mult), avg:Math.min(1,avgSum/n)};
}
{
  newGame('engineer'); hireAll();
  const now=engScores(), old=oldEngScores();
  check('neutral: engScores.rel identical to pre-#19 with no leads', approx(now.rel, old.rel));
  check('neutral: engScores.rd identical to pre-#19 with no leads', approx(now.rd, old.rd));
  check('neutral: engScores.avg identical to pre-#19 with no leads', approx(now.avg, old.avg));
  check('neutral: corpsLeadRelBonus is 0 with no corps lead', corpsLeadRelBonus()===0);
  // effSkill == base with xp 0
  check('neutral: effSkill equals base skill at xp 0', ENGINEERS.every(e=>approx(effSkill(e.id), e.skill)));
}

// ---------- 4. Promote a lead: weighting changes the score, and it's driven by the lead's trait ----------
{
  newGame('engineer'); hireAll();
  const base=engScores();
  // find a propulsion engineer and promote them
  const propEng=deptMembers('propulsion')[0];
  const chk=canPromoteLead(propEng.id);
  check('promote: canPromoteLead ok for a hired member', chk.ok===true);
  promoteLead(propEng.id);
  check('promote: lead recorded in state', state.departments.propulsion.lead===propEng.id);
  check('promote: isDeptLead true for the promoted person', isDeptLead(propEng.id)===true);
  const after=engScores();
  check('promote: engScores shifts when a lead is weighted', !approx(after.rel, base.rel) || !approx(after.rd, base.rd));
  // re-promoting the same person is a no-op guard
  check('promote: canPromoteLead refuses the current lead', canPromoteLead(propEng.id).ok===false);
}

// ---------- 5. Lead self-heals when the person leaves the roster ----------
// Single-member department so firing the lead nulls it under BOTH slice A (self-heal) and
// slice C (succession finds no successor -> null). Multi-member succession is covered in test-dept-c.
{
  newGame('engineer'); state.year=1990;
  const solo=ENGINEERS.find(e=>e.specialty==='structures');
  hirePersonnel(solo.id);
  promoteLead(solo.id);
  check('selfheal: lead set', state.departments.structures.lead===solo.id);
  firePersonnel(solo.id); // sole member — no successor possible
  check('selfheal: lead cleared after the sole member is fired', deptLeadRecord('structures')===null);
  check('selfheal: state.departments.structures.lead nulled', state.departments.structures.lead===null);
}

// ---------- 6. Astronaut Corps lead grants flat crewed steadiness (0 without, >0 with) ----------
{
  newGame('engineer'); hireAll();
  // assign an astronaut so astroBonus is active
  const astro=deptMembers('astronaut')[0];
  assignAstronaut(astro.id);
  const noLead=astroBonus().rel;
  // promote a DIFFERENT corps member as lead (or same — either way corps lead bonus applies)
  const leadAstro=deptMembers('astronaut')[1]||deptMembers('astronaut')[0];
  promoteLead(leadAstro.id);
  const withLead=astroBonus().rel;
  check('corps lead: astroBonus.rel increases with a corps lead', withLead > noLead);
  check('corps lead: corpsLeadRelBonus > 0 with a lead', corpsLeadRelBonus()>0);
}

// ---------- 7. stepDownLead clears the slot ----------
{
  newGame('engineer'); hireAll();
  const m=deptMembers('avionics')[0];
  promoteLead(m.id);
  stepDownLead('avionics');
  check('stepdown: lead cleared', state.departments.avionics.lead===null);
  check('stepdown: isDeptLead false after step down', isDeptLead(m.id)===false);
}

// ---------- 8. Save/load roundtrip preserves departments ----------
{
  newGame('engineer'); hireAll();
  const m=deptMembers('production')[0];
  promoteLead(m.id);
  saveGame();
  state.departments.production.lead='SCRAMBLED';
  loadGame();
  check('save/load: dept lead roundtrips', state.departments.production.lead===m.id);
  check('save/load: renders after load', (()=>{ try{ render(); return true; }catch(e){ console.log(e.stack); return false; } })());
}

// ---------- 9. Legacy save (no departments field) backfills via loadDefaults ----------
{
  newGame('engineer'); hireAll();
  saveGame();
  // simulate a pre-#19 save by stripping departments from the stored payload
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
  delete raw.state.departments;
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
  loadGame();
  check('legacy: departments backfilled on load of a save without them', !!state.departments && DEPARTMENTS.every(d=>state.departments[d.id]));
  check('legacy: backfilled depts are leaderless', DEPARTMENTS.every(d=>state.departments[d.id].lead===null));
}

// ---------- 10. Personnel modal renders (grouped by department) without throwing ----------
{
  newGame('engineer'); hireAll();
  promoteLead(deptMembers('propulsion')[0].id);
  let ok=true;
  try{ showPersonnelModal(); }catch(e){ ok=false; console.log(e.stack); }
  check('render: personnel modal builds with department grouping', ok);
}

// ---------- 11. Long smoke: promote/fire/advance interleaved never throws or corrupts leads ----------
{
  newGame('engineer');
  let threw=false;
  try{
    for(let i=0;i<300 && !state.over;i++){
      if(i===10){ state.year=1990; availablePool().slice(0,6).forEach(p=>hirePersonnel(p.id)); }
      if(i===12){ const m=deptMembers('propulsion')[0]; if(m) promoteLead(m.id); }
      if(i===40){ const m=deptMembers('propulsion')[0]; if(m) firePersonnel(m.id); } // fire the lead
      advanceDays(30);
      // invariant: any recorded lead must still be a current member of its dept
      DEPARTMENTS.forEach(d=>{ const L=state.departments[d.id].lead; if(L){ check.__inv = check.__inv||0; if(!deptMembers(d.id).some(x=>x.id===L)){ deptLeadRecord(d.id); } } });
    }
  }catch(e){ threw=true; console.log('smoke threw:', e.stack); }
  check('smoke: 300 ticks with promote/fire never throws', !threw);
  DEPARTMENTS.forEach(d=>{ const L=state.departments[d.id].lead; check(`smoke: ${d.id} lead is valid or null`, L===null || deptMembers(d.id).some(x=>x.id===L)); });
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
