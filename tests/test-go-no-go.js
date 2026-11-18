// Decision-loop roadmap Phase 1 (2026-11-18): one go/no-go authority (launchGoNoGo) and the block under the
// bench's launch button. The button and the block must agree for every way a launch can be blocked.
// Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
animEnabled=false;
const host=()=>{ renderBenchLaunch(); return document.getElementById('benchLaunch').innerHTML||''; };
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
/* the bench's primary (big) button and whether it renders disabled */
const primaryDisabled=html=>{ const b=(html.match(/<button class="launch"[^>]*>/)||[''])[0]; return /\sdisabled[\s>]/.test(b); };
function agree(name){
  const g=launchGoNoGo(), html=host();
  check(`${name}: block verdict matches the button`, !!g && (g.verdict==='blocked')===primaryDisabled(html) && (g.verdict==='blocked')===!g.check.ok);
  check(`${name}: the block renders that verdict`, new RegExp(`data-verdict="${g.verdict}"`).test(html));
  return g;
}
function lateGame(){ newGame('engineer'); state.money=5000; state.year=1968; state.rep=2000;
  RESEARCH.forEach(r=>state.research[r.id]=true); Object.keys(ENGINES).forEach(k=>state.unlocked[k]=true); }

// ---------- the opening: a flyable but below-target rocket is RISKY, with the reason ----------
newGame('engineer'); state.activeMission='first_flight';
{ const g=agree('opening');
  check('opening: the block exists under the button', /id="goNoGo"/.test(host()));
  check('opening: the default rocket is risky because of its odds', g.verdict==='risky' && /below the 70% recommended/.test(g.why));
  check('opening: money row agrees with the quote', Math.abs(g.money.now-g.quote.cashNow)<0.01 && Math.abs(g.money.after-(state.money-g.money.runway))<0.01);
  check('opening: odds are the quote’s modeled success', Math.abs(g.odds.success-g.quote.successProbability)<1e-9);
  check('opening: the policy line moved into the block', /Launch calls: <b>/.test(host()));
  check('opening: the full commitment text folds away', /<details class="gng-details"/.test(host()) && /Commitment:/.test(host()));
}
// test chips are real: each shows the odds that campaign buys, and clicking one changes the bench
{ const g=launchGoNoGo(), o1=g.test.options[1];
  check('test chips: one per campaign level', g.test.options.length===TEST_LEVELS.length && !g.test.fixed);
  check('test chips: a static fire raises the odds', o1.odds>g.test.options[0].odds);
  setTestLevel(1);
  const g2=launchGoNoGo();
  check('test chips: choosing one changes the block’s odds to what the chip said', Math.abs(g2.odds.success-o1.odds)<1e-9 && g2.test.level===1);
  check('test chips: …and the money row picks up its cost', g2.money.runway>g.money.runway);
  setTestLevel(0);
}
// not enough to fly after committing: risky, and says by how much
{ const g0=launchGoNoGo(); state.money=round2(g0.money.now+0.05);
  const g=agree('thin cash');
  check('thin cash: commit allowed but flagged as unaffordable to fly', g.verdict==='risky' && g.risks.some(r=>/can’t yet pay to fly it|can't yet pay to fly it/.test(r)) && g.money.after<0);
  check('thin cash: the money row shows the shortfall', /short/.test(strip(host())));
  state.money=0.05;
  const g2=agree('no cash');
  check('no cash: blocked, with the quote’s reason', g2.verdict==='blocked' && /short/.test(g2.why));
  state.money=20; }

// ---------- every block reason: button and block agree ----------
{ state.activeMission='sounding'; const m=curMission(); state.stages=[{eng:'a4',count:1,prop:0.5}];
  const g=agree('Δv shortfall'); check('Δv shortfall: blocked with the Δv reason', g.verdict==='blocked' && /Δv shortfall/.test(g.why)); }
{ state.activeMission='first_flight'; state.stages=[{eng:'a4',count:1,prop:400}];
  const g=agree('TWR'); check('TWR ≤ 1: blocked', g.verdict==='blocked' && /Thrust-to-weight|TWR|pad/i.test(g.why)); }
{ lateGame(); state.year=1962; state.activeMission='first_astro'; state.stages=[{eng:'kerolox_mk2',count:2,prop:30},{eng:'kerolox_mk1',count:1,prop:6}];
  const p=autoSizePlan(); if(p.ok) applyAutoSize();
  const g=agree('crewed, no escape research missing'); check('crewed build: flyable', g.check.ok);
  delete state.research.launch_escape;
  const g2=agree('crewed, no escape'); check('crewed with no escape system: risky and says why', g2.risks.some(r=>/escape system/.test(r)));
  state.research.launch_escape=true;
  queueBuild(true,'gh'); { let n=0; while(!hangarList().length&&n++<900) advanceDays(1); }
  const g3=agree('crewed hull, no astronaut');
  check('crewed hull without an astronaut: blocked with the crew reason', g3.hull && g3.verdict==='blocked' && g3.reason==='NO_ASTRONAUT');
  check('a hull’s test campaign is shown as fixed at commit', g3.test.fixed && /set when this hull was committed/.test(strip(host())));
  const a=ASTRONAUTS.slice().sort((x,y)=>(x.era||0)-(y.era||0))[0]; hirePersonnel(a.id); staffRecord(a.id).trainedAbs=absDay();
  const g4=agree('crewed hull, astronaut ready'); check('…and flyable once an astronaut is ready', g4.hull && g4.check.ok); }
{ lateGame(); const w=MISSIONS.find(x=>x.window&&!x.profile)||MISSIONS.find(x=>x.window);
  if(w){ state.activeMission=w.id; state.stages=[{eng:'f1_class',count:5,prop:900},{eng:'hydrolox_up',count:5,prop:250}]; if(w.profile){ state.transfer={eng:'hydrolox_up',prop:120}; }
    const g=agree('launch window'); check('window mission without a committed window: blocked', g.verdict==='blocked'); }
  else check('a window mission exists to test', false); }

// ---------- rehearsal, team ceiling ----------
{ lateGame(); state.activeMission='first_sat'; state.stages=[{eng:'kerolox_mk3',count:2,prop:60},{eng:'hydrolox_up',count:1,prop:12}];
  const p=autoSizePlan(); if(p.ok) applyAutoSize();
  const g=launchGoNoGo();
  check('orbital mission: anomaly odds shown and a rehearsal offered', g.odds.anomaly>0 && g.rehearsal.useful && /class="btn gng-reh"/.test(host()));
  toggleRehearsal();
  const g2=launchGoNoGo();
  check('rehearsing cuts the shown anomaly odds and costs money', g2.odds.anomaly<g.odds.anomaly && g2.money.runway>g.money.runway);
  state.rehearsal=false;
  state.staff=[]; state.year=1990;
  const g3=launchGoNoGo();
  check('an unstaffed team in a late era caps the odds, and the block says so', g3.odds.ceiling!=null && (g3.odds.success>g3.odds.ceiling-0.006 ? g3.risks.some(r=>/engineering team caps/.test(r)) : true) && /team cap/.test(strip(host()))); }

// ---------- one "keep this to fly" number ----------
{ newGame('engineer'); state.activeMission='first_flight'; const m=curMission();
  check('the card’s reserve is the go/no-go runway', Math.abs(debriefKeepToFly(m)-flightAttemptCost(m))<0.01 && Math.abs(flightAttemptCost(m)-launchGoNoGo().money.runway)<0.01);
  check('the checklist’s attempt cost is the same runway', Math.abs(onboardingAttemptCost()-flightAttemptCost(missionById(OB_MISSION)))<0.01); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
