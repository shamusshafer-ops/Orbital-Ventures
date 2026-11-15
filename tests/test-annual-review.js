// Spine step 7 (2026-11-16): the Annual Review. Appended after harness.js + build/game.js.
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const toJanuary=()=>{ const y=state.year+1; while(!(state.year===y&&state.month===0)) advanceDays(1); };

// headless: the review fires each January and auto-commits to the first two offers
animEnabled=false;
newGame('engineer'); state.money=200;
check('a new game has no review yet', state.review===null);
toJanuary();
check('the first review comes in January 1943', state.year===1943 && state.review && state.review.year===1943);
check('it offers three objectives', state.review.offered.length===3 && new Set(state.review.offered.map(o=>o.id)).size===3);
check('one of them is the mandate (fly a specific mission)', state.review.offered.some(o=>o.kind==='mission' && MISSIONS.some(m=>m.id===o.missionId)));
check('headless commits to two', !state.review.pending && state.review.chosen.length===2);
check('no grades in the first review', state.review.graded.length===0);

// grading: meet one, miss one
{
  const rv=state.review;
  rv.chosen=[{id:'flights',kind:'flights',target:1,reward:{money:3,rep:4,support:2}},{id:'research',kind:'research',target:5,reward:{money:2,rep:4,support:1}}];
  state.successes=(rv.snap.successes||0)+1;
  const m0=state.money, r0=state.rep, s0=publicSupport();
  state.month=11; state.day=0; while(!(state.month===0&&state.day===0)) advanceDays(1);
  const g=state.review.graded;
  check('last year\'s objectives are graded at the next review', g.length===2 && g.find(x=>x.kind==='flights').met===true && g.find(x=>x.kind==='research').met===false);
  check('a met objective pays money and rep', state.money>m0-0.5 && state.rep>=r0+4); // money also moves with the month's flows
  check('support moves by +reward and −1 per miss', (state.supportLedger||[]).some(e=>e.reason==='reviewObjective') && (state.supportLedger||[]).some(e=>e.reason==='reviewObjectiveMissed'));
}

// progress, labels and the outliner
{
  newGame('engineer'); state.year=1950; state.review={year:1950, snap:reviewSnapshot(), chosen:[{id:'flights',kind:'flights',target:3,reward:{money:3,rep:4,support:2}}], pending:false, offered:[], graded:[]};
  state.successes+=2;
  check('progress is measured from the snapshot', JSON.stringify(objectiveProgress(state.review.chosen[0]))===JSON.stringify({have:2,need:3}));
  check('labels read naturally', objectiveLabel({kind:'service',target:4})==='Deliver 4 service flights' && objectiveLabel({kind:'mission',name:'Lunar Flyby'})==='Fly Lunar Flyby');
  const item=outlinerItems().find(i=>/Fly 3 successful missions/.test(i.label));
  check('this year\'s objectives sit in Up Next with progress and a year-end deadline', !!item && /\(2\/3\)/.test(item.label) && item.etaDays>0 && item.etaDays<=366);
}

// mandates no longer arrive at random; existing ones still resolve
{
  newGame('engineer'); state.mandate=null; state.mandateCooldown=0; for(let k=0;k<40;k++) tickMandate();
  check('no random mandate offers any more', state.mandate===null);
  check('the mission objective uses the mandate bonus formula', reviewOffers(null).filter(o=>o.kind==='mission').every(o=>o.reward.support===MANDATE_SUPPORT_WIN && o.reward.money>0));
}

// the screen: pick exactly two
{
  animEnabled=true; newGame('engineer'); state.year=1946; state.month=0; annualReviewTick();
  check('with animation on the review waits for the player', state.review.pending===true);
  const html=document.getElementById('modalBody').innerHTML||'';
  check('the screen shows results, rivals, budget and three choices', /Annual Review/.test(html) && /Rivals/.test(html) && /Government funding next year/.test(html) && (html.match(/role="checkbox"/g)||[]).length===3);
  check('committing needs two picks', chooseReviewObjectives([state.review.offered[0].id])===false && state.review.pending);
  toggleReviewPick(state.review.offered[0].id); toggleReviewPick(state.review.offered[1].id); toggleReviewPick(state.review.offered[2].id);
  check('picking a third drops the oldest', _reviewPick.length===2 && _reviewPick.includes(state.review.offered[2].id));
  check('two picks commit', chooseReviewObjectives(_reviewPick.slice())===true && !state.review.pending && state.review.chosen.length===2);
  animEnabled=false;
}
// a hangar launch never takes ownership while a decision is pending (stranded-launch soft-lock, 2026-11-16)
{
  animEnabled=false; newGame('engineer'); state.money=50; state.activeMission='first_flight';
  queueBuild(true,'s1'); let g=0; while(!hangarList().length&&g++<400) advanceDays(1);
  const h=hangarList()[0]; _pendingSetback={rId:'kerosene'};
  const r=launchFromHangar(h.id,h.hullId,'s-fly');
  check('a hangar launch is refused while a decision is pending', r===false && !state.launchTxn && hangarList().some(x=>x.id===h.id));
  _pendingSetback=null;
  check('…and goes ahead once it is resolved', launchFromHangar(h.id,h.hullId,'s-fly2')!==false && (state.flights||0)>=1);
}
check('SAVE_VERSION bumped for the review', SAVE_VERSION>=73);
console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
