animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }
function approx(a,b,eps){ eps=eps===undefined?1e-9:eps; return Math.abs(a-b)<=eps; }
function hireAll(){ state.year=1990; availablePool().forEach(p=>hirePersonnel(p.id)); }

// ---------- 1. Succession: firing a lead promotes the best remaining member ----------
{
  newGame('engineer'); hireAll();
  const members=deptMembers('propulsion');
  check('setup: propulsion has >=2 members', members.length>=2);
  // make the lead someone, then fire them; a successor should auto-appear
  promoteLead(members[0].id);
  check('succession: lead set', state.departments.propulsion.lead===members[0].id);
  firePersonnel(members[0].id);
  const newLead=state.departments.propulsion.lead;
  check('succession: a successor auto-promoted after firing the lead', newLead!==null && newLead!==members[0].id);
  check('succession: successor is a current member', deptMembers('propulsion').some(m=>m.id===newLead));
  // successor should be the strongest remaining (effSkill×morale)
  const remaining=deptMembers('propulsion');
  const best=remaining.slice().sort((a,b)=>(effSkill(b.id)*Math.max(0.2,(b.morale||50)/100))-(effSkill(a.id)*Math.max(0.2,(a.morale||50)/100)))[0];
  check('succession: successor is the strongest remaining member', newLead===best.id);
}

// ---------- 2. Succession leaves lead null when the department empties ----------
{
  newGame('engineer');
  state.year=1990;
  // hire exactly one propulsion engineer, make them lead, then fire — no successor possible
  const solo=ENGINEERS.find(e=>e.specialty==='propulsion');
  hirePersonnel(solo.id);
  promoteLead(solo.id);
  firePersonnel(solo.id);
  check('succession: lead nulled when no members remain', state.departments.propulsion.lead===null);
}

// ---------- 3. Succession fires on attrition (quit) and poaching removal ----------
{
  newGame('engineer'); hireAll();
  const members=deptMembers('avionics');
  promoteLead(members[0].id);
  // force the lead to quit via sustained low morale
  const lead=staffRecord(members[0].id);
  lead.morale=5; lead.lowMoraleMonths=MORALE_QUIT_MONTHS; // will be removed next monthly boundary
  const leadId=members[0].id;
  advanceDays(30);
  check('succession: quit lead is gone from roster', !staffRecord(leadId));
  check('succession: dept.lead is valid-or-null after attrition', (()=>{ const L=state.departments.avionics.lead; return L===null || deptMembers('avionics').some(m=>m.id===L); })());
  check('succession: recorded lead is never the departed person', state.departments.avionics.lead!==leadId);
}

// ---------- 4. Workforce gaps: unstaffed core dept detected; leaderless dept detected ----------
{
  newGame('engineer');
  // fresh game: no staff → all three core depts unstaffed
  const gaps0=workforceGaps();
  check('gaps: all 3 core depts flagged unstaffed when empty', gaps0.filter(g=>g.kind==='understaffed').length===3);
  // hire into propulsion only → propulsion becomes leaderless (staffed, no lead), others still unstaffed
  state.year=1990;
  hirePersonnel(ENGINEERS.find(e=>e.specialty==='propulsion').id);
  const gaps1=workforceGaps();
  check('gaps: propulsion now leaderless, not understaffed', gaps1.some(g=>g.id==='propulsion'&&g.kind==='leaderless') && !gaps1.some(g=>g.id==='propulsion'&&g.kind==='understaffed'));
  check('gaps: structures still understaffed', gaps1.some(g=>g.id==='structures'&&g.kind==='understaffed'));
  // promote the propulsion engineer → propulsion gap clears
  promoteLead(deptMembers('propulsion')[0].id);
  check('gaps: promoting clears the leaderless gap', !workforceGaps().some(g=>g.id==='propulsion'));
}

// ---------- 5. Astronaut Corps only critical when active mission is crewed ----------
{
  newGame('engineer');
  const uncrewed=MISSIONS.find(m=>!m.crew);
  const crewed=MISSIONS.find(m=>m.crew>0);
  state.activeMission=uncrewed?uncrewed.id:null;
  check('critical: astronaut corps NOT critical for an uncrewed mission', !criticalDepts().includes('astronaut'));
  if(crewed){ state.activeMission=crewed.id;
    check('critical: astronaut corps critical for a crewed mission', criticalDepts().includes('astronaut')); }
}

// ---------- 6. BALANCE: staffing penalty is 0 in Pioneer regardless of staffing ----------
{
  newGame('engineer'); // starts 1942 = Pioneer
  check('balance: eraStakesFrac is 0 in Pioneer', eraStakesFrac()===0);
  // even with all core depts empty, no penalty in Pioneer
  check('balance: deptStaffingRelPenalty is 0 in Pioneer with empty depts', deptStaffingRelPenalty()===0);
  const relPioneer=curRel();
  // hiring in Pioneer shouldn't change the penalty term (still 0)
  hireAll();
  check('balance: penalty still 0 after hiring in Pioneer', deptStaffingRelPenalty()===0);
}

// ---------- 7. STAKES: penalty bites in a late era when a core dept is unstaffed, and clears when staffed ----------
{
  newGame('engineer');
  state.year=1995; // push into a later era so eraStakesFrac>0
  check('stakes: eraStakesFrac > 0 in a later era', eraStakesFrac()>0);
  const penEmpty=deptStaffingRelPenalty();
  check('stakes: unstaffed core depts incur a penalty in a late era', penEmpty>0);
  // staff all three core depts → penalty clears
  ['propulsion','structures','avionics'].forEach(spec=>{ const e=ENGINEERS.find(x=>x.specialty===spec); hirePersonnel(e.id); });
  check('stakes: penalty clears once all core depts are staffed', deptStaffingRelPenalty()===0);
  // penalty is capped
  check('stakes: penalty never exceeds the cap', deptStaffingRelPenalty()<=DEPT_UNDERSTAFF_REL_CAP+1e-9);
}

// ---------- 8. Penalty actually flows into curRel ----------
{
  newGame('engineer'); state.year=1995;
  const relEmpty=curRel();
  ['propulsion','structures','avionics'].forEach(spec=>{ const e=ENGINEERS.find(x=>x.specialty===spec); hirePersonnel(e.id); });
  const relStaffed=curRel();
  check('curRel: staffing the core departments raises reliability in a late era', relStaffed>relEmpty);
}

// ---------- 9. Outliner + tab alerts surface an unstaffed critical dept ----------
{
  newGame('engineer'); // empty → gaps exist
  const items=outlinerItems();
  check('outliner: unstaffed dept surfaces as an item', items.some(it=>/unstaffed/i.test(it.label)));
  const alerts=tabAlerts();
  check('alerts: command flags an unstaffed dept', alerts.command.some(x=>/unstaffed/i.test(x)));
  const g=buildingGlyph('personnel');
  check('glyph: personnel glyph flags a dept gap when unstaffed', g.state==='attention');
}

// ---------- 10. Render + save/load + long smoke with succession churn ----------
{
  newGame('engineer'); hireAll();
  promoteLead(deptMembers('production')[0].id);
  saveGame();
  loadGame();
  check('save/load: renders after load with succession live', (()=>{ try{ render(); showPersonnelModal(); return true; }catch(e){ console.log(e.stack); return false; } })());
}
{
  newGame('engineer');
  let threw=false;
  try{
    for(let i=0;i<400 && !state.over;i++){
      if(i===8){ state.year=1990; availablePool().slice(0,8).forEach(p=>hirePersonnel(p.id)); state.money+=80; }
      if(i===12){ deptMembers('propulsion')[0]&&promoteLead(deptMembers('propulsion')[0].id); }
      if(i===30){ deptMembers('propulsion')[0]&&firePersonnel(deptMembers('propulsion')[0].id); } // fire lead → succession
      if(i===50){ // starve someone to quit
        const s=state.staff[0]; if(s){ s.morale=5; s.lowMoraleMonths=MORALE_QUIT_MONTHS; } }
      advanceDays(30);
      // invariant: every recorded lead is a current member
      DEPARTMENTS.forEach(d=>{ const L=state.departments[d.id].lead; if(L && !deptMembers(d.id).some(m=>m.id===L)){ threw=true; console.log('INVARIANT BROKEN:', d.id, L); } });
    }
  }catch(e){ threw=true; console.log('smoke threw:', e.stack); }
  check('smoke: 400 ticks of succession churn never throws or breaks the lead invariant', !threw);
}

// ---------- 11. Prior-slice regressions still hold ----------
{
  newGame('engineer'); hireAll();
  // slice A neutrality still holds (no leads, xp 0)
  newGame('engineer'); hireAll();
  check('regression A: corpsLeadRelBonus 0 with no corps lead', corpsLeadRelBonus()===0);
  // slice B: effSkill==base at xp 0
  check('regression B: effSkill==base at xp 0', state.staff.every(s=>approx(effSkill(s.id), personById(s.id).skill)));
}

try{ if(typeof stopTimeAuto==='function') stopTimeAuto(); }catch(e){}
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0 ? 1 : 0);
