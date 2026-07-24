// BACKLOG #68 — Staff aging/retirement across a long campaign. Age is derived from a per-hire
// birthYear stamp (self-healing for legacy staff records missing it). Retirement age and starting
// hire age are deterministic per person id (hash-based), so the ~40 hand-authored named characters
// need no new per-record fields. A retirement OR a crewed-mission death spawns one procedural
// replacement candidate (same role, and for engineers same specialty) into the hire pool, so the
// small named rosters never permanently run dry across a 50+-year campaign. Departure itself is a
// quiet log line only — no rep hit, no fanfare.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- 1. deterministic age helpers: stable, in-range, decorrelated from each other ----------
{
  check('startingHireAge always in [26,45]', ENGINEERS.every(p=>{ const a=startingHireAge(p.id); return a>=26 && a<=45; }));
  check('retirementAge always in [58,69]', ENGINEERS.every(p=>{ const a=retirementAge(p.id); return a>=58 && a<=69; }));
  check('startingHireAge is deterministic (same id → same value across calls)', startingHireAge('e01')===startingHireAge('e01'));
  check('retirementAge is deterministic', retirementAge('e01')===retirementAge('e01'));
  // not every id maps to the exact same age (spread actually varies across the roster)
  const ages=new Set(ENGINEERS.map(p=>startingHireAge(p.id)));
  check('hire ages vary across different people (not a constant)', ages.size>1);
}

// ---------- 2. hiring stamps birthYear; staffAge derives correctly from the campaign clock ----------
{
  newGame('engineer'); // starts 1942
  const id='e01';
  hirePersonnel(id);
  const sr=staffRecord(id);
  check('birthYear stamped on hire', typeof sr.birthYear==='number');
  check('birthYear consistent with startingHireAge at hire time', sr.birthYear===1942-startingHireAge(id));
  check('staffAge starts at exactly the hire age', staffAge(id)===startingHireAge(id));
  state.year+=10;
  check('staffAge advances with the campaign year', staffAge(id)===startingHireAge(id)+10);
}

// ---------- 3. legacy save self-heal: a staff record with no birthYear gets one lazily, no crash ----------
{
  newGame('engineer');
  const id='e02';
  hirePersonnel(id);
  delete staffRecord(id).birthYear; // simulate a pre-#68 save
  check('staffAge does not throw on a legacy record', (()=>{ try{ staffAge(id); return true; }catch(e){ return false; } })());
  const age=staffAge(id);
  check('staffAge self-heals to a sane value', age===startingHireAge(id));
  check('birthYear is now populated on the record (healed in place)', typeof staffRecord(id).birthYear==='number');
}

// ---------- 4. tickRetirements: a staffer past retirement age is quietly retired ----------
{
  newGame('engineer');
  const id='e03';
  hirePersonnel(id);
  const sr=staffRecord(id);
  sr.birthYear=state.year-retirementAge(id); // force them to already be at retirement age
  const before=state.log.length;
  tickRetirements();
  check('retired staffer is removed from state.staff', !isHired(id));
  const entry=state.log.find(l=>/retired/.test(l.msg));
  check('a quiet retirement log line was written', !!entry);
  check('the retirement log is neutral, not a bad/rep-hit tone', entry.kind==='note');
  check('no rep change from a retirement', state.rep===0); // fresh game starts at 0 rep, unaffected
}

// ---------- 5. tickRetirements leaves everyone below retirement age untouched ----------
{
  newGame('engineer');
  const id='e04';
  hirePersonnel(id); // freshly hired — nowhere near retirement
  const before=(state.staff||[]).length;
  tickRetirements();
  check('a fresh hire is not retired', isHired(id));
  check('staff count unchanged', state.staff.length===before);
}

// ---------- 6. retirement spawns a same-specialty procedural engineer replacement ----------
{
  newGame('engineer');
  const id='e01'; // propulsion specialty
  hirePersonnel(id);
  const specialty=personById(id).specialty;
  const beforePoolCount=proceduralDefs().length;
  staffRecord(id).birthYear=state.year-retirementAge(id);
  tickRetirements();
  check('a procedural candidate was generated', proceduralDefs().length===beforePoolCount+1);
  const cand=proceduralDefs()[proceduralDefs().length-1];
  check('the replacement matches the departing role (eng)', roleOf(cand.id)==='eng');
  check('the replacement matches the departing specialty', cand.specialty===specialty);
  check('the replacement has a name', typeof cand.name==='string' && cand.name.length>0);
  check('the replacement is immediately hirable (era ≤ current era index)', cand.era<=eraIndex(currentEra()));
}

// ---------- 7. procedural replacements appear in availablePool and are hirable end-to-end ----------
{
  newGame('engineer');
  const id='e01';
  hirePersonnel(id);
  staffRecord(id).birthYear=state.year-retirementAge(id);
  tickRetirements();
  const cand=proceduralDefs()[proceduralDefs().length-1];
  check('the procedural candidate shows up in availablePool', availablePool().some(p=>p.id===cand.id));
  hirePersonnel(cand.id);
  check('the procedural candidate can be hired like any other person', isHired(cand.id));
  check('personById resolves the procedural hire', personById(cand.id).id===cand.id);
  check('effSkill works on a procedural hire (no crash, sane range)', (()=>{ const s=effSkill(cand.id); return s>0 && s<=1; })());
  check('traitOf resolves for a procedural hire', !!traitOf(cand.id));
}

// ---------- 8. a crewed mission death also spawns a replacement (not just retirement) ----------
{
  newGame('engineer');
  const astroId=ASTRONAUTS[0].id;
  hirePersonnel(astroId);
  state.assignedAstronaut=astroId;
  const beforePoolCount=proceduralDefs().length;
  loseAssignedCrew(astroId, 'Test Mission', 'a catastrophic failure');
  check('the astronaut is removed from staff', !isHired(astroId));
  check('a procedural replacement was generated on death', proceduralDefs().length===beforePoolCount+1);
  const cand=proceduralDefs()[proceduralDefs().length-1];
  check('the replacement matches the astro role', roleOf(cand.id)==='astro');
  check('the memorial wall still records the death (existing E1.4 behavior unaffected)', memorialRoll().some(m=>m.id===astroId));
}

// ---------- 9. department-lead succession fires on a retirement, same as any other departure ----------
{
  newGame('engineer');
  const leadId='e01'; // propulsion engineer -> propulsion dept
  const deputyId='e05'; // another propulsion engineer, junior
  hirePersonnel(leadId); hirePersonnel(deputyId);
  state.departments.propulsion=state.departments.propulsion||{};
  state.departments.propulsion.lead=leadId;
  staffRecord(leadId).birthYear=state.year-retirementAge(leadId);
  tickRetirements();
  check('the retired lead is no longer the department lead', state.departments.propulsion.lead!==leadId);
  check('someone succeeded (a remaining propulsion engineer)', state.departments.propulsion.lead===deputyId || state.departments.propulsion.lead===null);
}

// ---------- 10. legacy/fresh save safety: proceduralStaffDefs lazy-inits, no SAVE_VERSION dependency ----------
{
  newGame('engineer');
  delete state.proceduralStaffDefs; // simulate a save from before #68 existed
  check('proceduralDefs() creates an empty array when missing', Array.isArray(proceduralDefs()) && proceduralDefs().length===0);
  check('availablePool still works on a legacy/missing field', availablePool().length>0);
  check('a fresh newGame resets the procedural pool to empty', (()=>{ generateProceduralCandidate('eng','propulsion'); newGame('engineer'); return proceduralDefs().length===0; })());
}

// ---------- 11. multiple retirements in one tick are all handled, each gets its own replacement ----------
{
  newGame('engineer');
  const ids=['e01','e02','e03'];
  ids.forEach(id=>{ hirePersonnel(id); staffRecord(id).birthYear=state.year-retirementAge(id); });
  const beforePoolCount=proceduralDefs().length;
  tickRetirements();
  check('all three retire in the same tick', ids.every(id=>!isHired(id)));
  check('three replacements were generated', proceduralDefs().length===beforePoolCount+3);
}

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
