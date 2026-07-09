animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function approx(a,b,eps){ eps=eps===undefined?1e-9:eps; return Math.abs(a-b)<=eps; }
function hireAll(){ state.year=1990; availablePool().forEach(p=>hirePersonnel(p.id)); }

// ---------- 1. Fresh game: xp is 0, effSkill == base (balance-neutral) ----------
newGame('engineer'); hireAll();
check('fresh: every hire starts at xp 0', state.staff.every(s=>(s.xp||0)===0));
check('fresh: effSkill equals base at xp 0', state.staff.every(s=>approx(effSkill(s.id), personById(s.id).skill)));
check('fresh: skillGain is 0 at xp 0', state.staff.every(s=>skillGain(s.id)===0));

// ---------- 2. XP accrues monthly, raising effSkill (capped) ----------
{
  newGame('engineer'); hireAll();
  const id=state.staff[0].id, base=personById(id).skill;
  const before=effSkill(id);
  for(let i=0;i<12;i++) accrueStaffXp();
  const after=effSkill(id);
  check('accrual: effSkill rises after a year of xp', after>before);
  check('accrual: xp is positive', staffXp(id)>0);
  // drive to the cap and confirm it clamps at base + XP_SKILL_MAX (and hard cap 0.99)
  for(let i=0;i<400;i++) accrueStaffXp();
  const capped=effSkill(id);
  check('accrual: effSkill clamps at base+XP_SKILL_MAX (or hard cap)', approx(capped, Math.min(SKILL_HARD_CAP, base+XP_SKILL_MAX), 1e-6));
  check('accrual: never exceeds hard cap', state.staff.every(s=>effSkill(s.id)<=SKILL_HARD_CAP+1e-9));
}

// ---------- 3. Morale scales accrual (low morale learns slower) ----------
{
  newGame('engineer'); hireAll();
  const a=state.staff[0], b=state.staff[1];
  a.morale=100; b.morale=20;
  a.xp=0; b.xp=0;
  for(let i=0;i<6;i++) accrueStaffXp();
  check('morale: high-morale staff accrues more xp than low-morale', a.xp > b.xp);
}

// ---------- 4. Career progression feeds the real accumulators (engScores, specialistFactor, astroBonus) ----------
{
  newGame('engineer'); hireAll();
  const relBefore=engRelBonus(), rdBefore=engRdSpeedBonus();
  const specBefore=specialistFactor('propulsion');
  state.staff.forEach(s=>s.xp=90); // mature the whole roster
  const relAfter=engRelBonus(), rdAfter=engRdSpeedBonus();
  const specAfter=specialistFactor('propulsion');
  check('feeds: engRelBonus rises with experience', relAfter>relBefore);
  check('feeds: engRdSpeedBonus rises with experience', rdAfter>rdBefore);
  check('feeds: specialistFactor drops (more fragility cut) with experience', specAfter<specBefore);
  // astronaut assigned → astroBonus rises with xp
  const astro=deptMembers('astronaut')[0]; assignAstronaut(astro.id);
  const abLow=(()=>{ staffRecord(astro.id).xp=0; return astroBonus().rel; })();
  const abHigh=(()=>{ staffRecord(astro.id).xp=90; return astroBonus().rel; })();
  check('feeds: astroBonus.rel rises with astronaut experience', abHigh>abLow);
}

// ---------- 5. Training investment: costs capital, raises level, bumps member xp + morale ----------
{
  newGame('engineer'); hireAll();
  state.money=100;
  const dep='structures';
  const lvl0=deptState(dep).training;
  const members=deptMembers(dep);
  const xp0=members.map(m=>m.xp||0);
  const chk=canTrainDepartment(dep);
  check('train: canTrain ok with members + cash + below max', chk.ok===true);
  const moneyBefore=state.money;
  trainDepartment(dep);
  check('train: money debited by quoted cost', approx(round2(moneyBefore-state.money), chk.cost, 1e-6));
  check('train: training level incremented', deptState(dep).training===lvl0+1);
  check('train: every member gained the xp bump', deptMembers(dep).every((m,i)=>(m.xp||0)>=xp0[i]+TRAIN_XP_BUMP-1e-9));
}

// ---------- 6. Training accelerates accrual (trained dept learns faster than untrained) ----------
{
  newGame('engineer'); hireAll();
  state.money=100;
  // structures gets trained to L2, avionics stays L0
  trainDepartment('structures'); trainDepartment('structures');
  // reset xp so we measure pure accrual rate
  state.staff.forEach(s=>s.xp=0);
  for(let i=0;i<6;i++) accrueStaffXp();
  const trainedXp = deptMembers('structures')[0].xp;
  const untrainedXp = deptMembers('avionics')[0].xp;
  check('train: a trained department accrues xp faster', trainedXp > untrainedXp);
}

// ---------- 7. Training gates: no members, maxed level, no cash ----------
{
  newGame('engineer');
  check('gate: cannot train an empty department', canTrainDepartment('propulsion').ok===false);
  hireAll(); state.money=0;
  check('gate: cannot train with no capital', canTrainDepartment('propulsion').ok===false);
  state.money=1000;
  for(let i=0;i<TRAIN_MAX_LEVEL;i++) trainDepartment('propulsion');
  check('gate: training caps at TRAIN_MAX_LEVEL', deptState('propulsion').training===TRAIN_MAX_LEVEL);
  check('gate: cannot train beyond max', canTrainDepartment('propulsion').ok===false);
}

// ---------- 8. Save/load roundtrip preserves xp + training ----------
{
  newGame('engineer'); hireAll();
  state.money=100;
  const id=state.staff[0].id;
  state.staff.forEach(s=>s.xp=55);
  trainDepartment('production');
  const trainLvl=deptState('production').training;
  saveGame();
  state.staff.forEach(s=>s.xp=0);
  state.departments.production.training=0;
  loadGame();
  check('save/load: staff xp roundtrips', staffXp(id)===55);
  check('save/load: dept training roundtrips', deptState('production').training===trainLvl);
}

// ---------- 9. Legacy save without xp: staff default to xp 0, effSkill==base (no balance shift) ----------
{
  newGame('engineer'); hireAll(); saveGame();
  const raw=JSON.parse(localStorage.getItem(SAVE_KEY));
  raw.state.staff.forEach(s=>delete s.xp); // pre-slice-B staff records
  localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
  loadGame();
  check('legacy: missing xp reads as 0', state.staff.every(s=>staffXp(s.id)===0));
  check('legacy: effSkill==base for legacy staff', state.staff.every(s=>approx(effSkill(s.id), personById(s.id).skill)));
}

// ---------- 10. Render + long smoke with training/accrual live ----------
{
  newGame('engineer');
  let threw=false;
  try{
    for(let i=0;i<360 && !state.over;i++){
      if(i===8){ state.year=1990; availablePool().slice(0,8).forEach(p=>hirePersonnel(p.id)); state.money+=50; }
      if(i===12){ trainDepartment('propulsion'); }
      if(i===20){ promoteLead(deptMembers('propulsion')[0].id); }
      advanceDays(30);
      if(i%40===0){ try{ showPersonnelModal(); }catch(e){ threw=true; console.log(e.stack); } }
    }
  }catch(e){ threw=true; console.log('smoke threw:', e.stack); }
  check('smoke: 360 ticks with accrual+training+lead never throws', !threw);
  check('smoke: staff xp grew over the run', state.staff.length===0 || state.staff.some(s=>(s.xp||0)>0));
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
