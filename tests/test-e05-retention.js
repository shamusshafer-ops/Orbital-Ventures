// E0.5 slice B — bounded rendering, quarterly metric decimation, crisis archival,
// and the unified hidden-tab visual lifecycle.
animEnabled=false;
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:',name); } }

newGame('engineer');

// Monthly dashboard history stays at 24, while older points become exact 3-month averages.
state.metricHist=defaultMetricHist();
state.metricArchive=defaultMetricArchive();
state.metricArchivePending=defaultMetricArchivePending();
for(let i=1;i<=30;i++){
  state.money=i; state.rep=i*2; state.publicSupport=i; state.science=i*3;
  state.flights=i; state.successes=i;
  state.lastMonth={revenue:i,expenses:i/2,net:i/2,flights:0};
  pushMetricHistory();
}
check('monthly metric window remains capped at 24', state.metricHist.money.length===METRIC_HISTORY_LEN);
check('six evicted months become two quarterly points', JSON.stringify(state.metricArchive.money)===JSON.stringify([2,5]));
check('completed quarter has no pending samples', state.metricArchivePending.money.length===0);
check('recent window begins after archived samples', state.metricHist.money[0]===7&&state.metricHist.money[23]===30);
check('Chronicle series preserves all 30 months as 10 quarters', chronicleMetricSeries('money').length===10);
check('Chronicle series is chronologically exact', JSON.stringify(chronicleMetricSeries('money'))===JSON.stringify([2,5,8,11,14,17,20,23,26,29]));
state.money=31; pushMetricHistory();
check('incomplete evicted quarter is retained', JSON.stringify(state.metricArchivePending.money)===JSON.stringify([7]));
check('Chronicle includes a final partial quarter', chronicleMetricSeries('money').length===11&&chronicleMetricSeries('money').at(-1)===31);

// Crisis objects are bounded, but aggregate scoring/counts survive archival.
state.crisisHistory=[];
state.crisisArchive=null;
for(let i=0;i<60;i++) state.crisisHistory.push({id:'c'+i,outcome:i%2?'endured':'mitigated'});
const recent=crisisHistory(), archived=crisisArchive();
check('recent crisis object history is capped', recent.length===CRISIS_HISTORY_CAP&&recent.length===48);
check('older crisis records aggregate into archive', archived.resolved===12&&archived.mitigated===6);
check('archived legacy bonus is exact', archived.bonus===156);
const legacy=legacyScore();
check('legacy crisis count includes archive plus recent', legacy.crisisCount===60);
check('legacy mitigated count includes archive plus recent', legacy.crisisMitigated===30);

// Chronicle wire and global ops timeline render in pages rather than mounting every retained record.
state.frontPages=[];
for(let i=0;i<55;i++) pushFrontPage('milestone','*','headline '+i,'dek');
_frontPageVisible=FRONT_PAGE_RENDER_PAGE;
let wire=frontPagesHTML();
check('wire first page renders 20 editions', (wire.match(/showFrontPage\(/g)||[]).length===20);
check('wire first page offers older editions', /Show older editions · 35 remaining/.test(wire));
_frontPageVisible+=FRONT_PAGE_RENDER_PAGE;
wire=frontPagesHTML();
check('wire second page renders 40 editions', (wire.match(/showFrontPage\(/g)||[]).length===40);

const oldGet=document.getElementById.bind(document);
const ops=makeStubEl(), controls=makeStubEl();
document.getElementById=id=>id==='opsTimeline'?ops:id==='tlControls'?controls:oldGet(id);
state.log=Array.from({length:30},(_,i)=>({when:'Jan '+(2000-i),kind:'note',msg:'routine note '+i}));
_tlFilter='other'; _tlCollapsed=false; _tlVisible=TL_RENDER_PAGE;
renderLog();
check('timeline first page renders 12 log chips', ops.children.filter(c=>(c.className||'').includes('tl-chip')).length===12);
check('timeline first page appends one Show older control', ops.children.some(c=>(c.textContent||'').includes('18 remaining')));
ops.children.length=0;
showOlderLog();
check('timeline second page renders 24 log chips', ops.children.filter(c=>(c.className||'').includes('tl-chip')).length===24);
document.getElementById=oldGet;

// Sustained RAF loops are canceled and only the snapshotted active loops restart.
let nextRaf=1000, cancelled=[];
requestAnimationFrame=()=>++nextRaf;
cancelAnimationFrame=id=>cancelled.push(id);
state.tab='command';
ccAnim=101; earthPopoutOpen=true; earthAnim=102; ccPopoutOpen=true; ccPopAnim=103;
animState={raf:104,held:false,prevWall:0};
_hiddenVisuals=null;
pauseVisualLoopsForHidden();
check('hidden lifecycle cancels all active canvas RAFs', [101,102,103,104].every(id=>cancelled.includes(id)));
check('hidden lifecycle clears active RAF handles', ccAnim===null&&earthAnim===null&&ccPopAnim===null&&animState.raf===0);
pauseVisualLoopsForHidden();
check('hidden lifecycle is idempotent', cancelled.length===4);
resumeVisualLoopsFromHidden();
check('visible lifecycle restarts snapshotted RAFs', ccAnim!=null&&earthAnim!=null&&ccPopAnim!=null&&animState.raf!==0);
const resumed=[ccAnim,earthAnim,ccPopAnim,animState.raf];
resumeVisualLoopsFromHidden();
check('visible lifecycle does not create duplicate RAF chains', JSON.stringify([ccAnim,earthAnim,ccPopAnim,animState.raf])===JSON.stringify(resumed));

// Phaser managers are slept, not merely paused, then woken on return.
function fakeGame(key){
  let active=true, sleeps=0, wakes=0;
  return {scene:{
    isActive:k=>k===key&&active,
    sleep:k=>{ if(k===key){ active=false; sleeps++; } },
    wake:k=>{ if(k===key){ active=true; wakes++; } },
    stats:()=>({active,sleeps,wakes})
  }};
}
capeGame=fakeGame('cape'); vehGame=fakeGame('vehprev'); mapGame=fakeGame('solarmap'); stationGame=fakeGame('station');
flightGame=fakeGame('flight');
flightScene={scene:{isSleeping:()=>!flightGame.scene.stats().active,sleep:()=>flightGame.scene.sleep('flight'),wake:()=>flightGame.scene.wake('flight')}};
_hiddenVisuals=null;
pauseVisualLoopsForHidden();
check('all four persistent Phaser scenes sleep while hidden',
  capeGame.scene.stats().sleeps===1&&vehGame.scene.stats().sleeps===1&&mapGame.scene.stats().sleeps===1&&stationGame.scene.stats().sleeps===1);
check('flight Phaser scene sleeps while hidden', flightGame.scene.stats().sleeps===1);
resumeVisualLoopsFromHidden();
check('all snapshotted Phaser scenes wake on return',
  capeGame.scene.stats().wakes===1&&vehGame.scene.stats().wakes===1&&mapGame.scene.stats().wakes===1&&stationGame.scene.stats().wakes===1&&flightGame.scene.stats().wakes===1);

earthPopoutOpen=false; ccPopoutOpen=false; animState=null; ccAnim=null;
console.log(`\n${pass}/${pass+fail} checks passed`);
process.exit(fail>0?1:0);
