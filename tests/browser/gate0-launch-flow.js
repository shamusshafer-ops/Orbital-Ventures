const {waitUntil}=require('./webdriver');

const clickText=`
  const wanted=String(arguments[0]).toLowerCase();
  const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
  const button=[...document.querySelectorAll('button')].find(el=>visible(el)&&!el.disabled&&
    (el.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase().includes(wanted));
  if(!button) return false;
  button.click(); return true;
`;

async function click(driver,label){
  const ok=await driver.execute(clickText,[label]);
  if(!ok) throw new Error(`Visible enabled button not found: ${label}`);
}

async function waitForClick(driver,label,timeout=12000){
  return waitUntil(()=>driver.execute(clickText,[label]),{timeout,label:`button “${label}”`});
}

async function openDevPanel(driver){
  await driver.execute(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'D',ctrlKey:true,shiftKey:true,bubbles:true})); return true;`);
  await waitUntil(()=>driver.execute(`return !document.getElementById('devPanel').classList.contains('hidden');`),
    {label:'dev panel'});
}

async function closeDevPanel(driver){
  const closed=await driver.execute(`const p=document.getElementById('devPanel'); const b=[...p.querySelectorAll('button')].find(x=>(x.textContent||'').includes('✕')); if(b)b.click(); return !!b;`);
  if(!closed) throw new Error('Dev panel close control is unavailable');
}

async function dismissBlockingModal(driver){
  return driver.execute(`
    const modal=document.getElementById('modal');
    if(!modal||modal.classList.contains('hidden')) return false;
    const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
    const choices=['decline','close','ok','later','continue'];
    const buttons=[...modal.querySelectorAll('button')].filter(el=>visible(el)&&!el.disabled);
    for(const choice of choices){
      const hit=buttons.find(el=>(el.textContent||'').trim().toLowerCase().includes(choice));
      if(hit){ hit.click(); return choice; }
    }
    return false;
  `);
}

async function runGate0LaunchFlow(driver,url){
  const startedAt=Date.now();
  const metrics={syntheticPlayerDomActivations:0,syntheticDevDomActivations:0,reloadNavigations:0,
    researchCompletionControl:'Next Event'};
  const playerWaitClick=async(label,timeout)=>{ await waitForClick(driver,label,timeout); metrics.syntheticPlayerDomActivations++; };
  const devClick=async label=>{ await click(driver,label); metrics.syntheticDevDomActivations++; };
  await driver.navigate(url);
  await waitUntil(()=>driver.execute(`return typeof startupNew==='function' && !!document.getElementById('modal');`),
    {timeout:30000,label:'Orbital Ventures startup'});

  // Visible controls activated through synthetic DOM click(), not pointer hit-testing.
  await playerWaitClick('new game');
  await playerWaitClick('engineer');
  await playerWaitClick('close');
  const openingTopLevelNavigation=await driver.execute(`
    const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
    const nav=[...document.querySelectorAll('#sceneNav button.scene')].filter(visible).map(b=>({
      id:b.id,label:((b.querySelector('.cc-nav-label')||b).textContent||'').replace(/\\s+/g,' ').trim()}));
    const viewIds=['commandView','benchView','rndView','mapView','stationView','baseView'];
    const activeViews=viewIds.filter(id=>{const el=document.getElementById(id);return el&&!el.classList.contains('hidden');});
    return {count:nav.length,nav,activeViews};
  `);

  // Use the shipped dev-panel cash control so the required research step does
  // not make the later build/launch path depend on opening solvency.
  await openDevPanel(driver);
  metrics.syntheticDevDomActivations++;
  await driver.execute(`const i=document.getElementById('devMoneyInput'); i.value='100'; i.dispatchEvent(new Event('input',{bubbles:true})); return true;`);
  await devClick('set to');
  await closeDevPanel(driver);
  metrics.syntheticDevDomActivations++;

  // Actual R&D UI path: open R&D, select the Static Fire Test Program SVG node,
  // click its rendered Research action, then advance with the visible next-event
  // control until the project is visibly complete.
  const rndClicked=await driver.execute(`const b=document.getElementById('tabRnd'); if(!b||b.disabled)return false; b.click(); return true;`);
  if(!rndClicked) throw new Error('R&D navigation is unavailable');
  metrics.syntheticPlayerDomActivations++;
  await waitUntil(()=>driver.execute(`const v=document.getElementById('rndView'); return v&&!v.classList.contains('hidden')&&!!document.getElementById('tn-test_program');`),
    {timeout:5000,label:'rendered R&D technology tree'});
  const selectedResearch=await driver.execute(`
    const node=document.getElementById('tn-test_program'); if(!node){
      const tree=document.getElementById('techTree'),view=document.getElementById('rndView'),tab=document.getElementById('tabRnd');
      return {ok:false,node:false,treeLength:tree&&(tree.innerHTML||'').length,viewClass:view&&view.className,
        tabClass:tab&&tab.className,tabText:tab&&(tab.textContent||'').trim()};
    }
    node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    const buttons=[...document.querySelectorAll('button')].filter(b=>(b.getAttribute('onclick')||'').includes("buyResearch('test_program')"));
    return {ok:buttons.some(b=>!b.disabled),node:true,buttons:buttons.map(b=>({disabled:b.disabled,text:(b.textContent||'').trim()})),
      detail:(document.getElementById('researchDetail')||{}).textContent||''};
  `);
  if(!selectedResearch.ok) throw new Error(`Static Fire Test Program could not be selected through the technology tree: ${JSON.stringify(selectedResearch)}`);
  metrics.syntheticPlayerDomActivations++;
  const startedResearch=await driver.execute(`
    const b=[...document.querySelectorAll('button')].find(x=>!x.disabled&&(x.getAttribute('onclick')||'').includes("buyResearch('test_program')"));
    if(!b)return false; b.click(); return true;
  `);
  if(!startedResearch) throw new Error('Static Fire Test Program Research action is unavailable');
  metrics.syntheticPlayerDomActivations++;
  await driver.execute(`Math.random=()=>0.99; return true;`); // no incidental setback during the deterministic completion jump
  let researchDone=false;
  for(let i=0;i<8&&!researchDone;i++){
    researchDone=await driver.execute(`
      const d=document.getElementById('researchDetail');
      return !!d && /Static Fire Test Program/i.test(d.textContent||'') && /researched/i.test(d.textContent||'');
    `);
    if(researchDone) break;
    if(await dismissBlockingModal(driver)){ metrics.syntheticPlayerDomActivations++; continue; }
    const advanced=await driver.execute(clickText,['next event']);
    if(!advanced) throw new Error('R&D is active but the next-event control is unreachable');
    metrics.syntheticPlayerDomActivations++;
  }
  if(!researchDone) throw new Error('Static Fire Test Program did not complete within 8 next-event actions');

  const benchClicked=await driver.execute(`const b=document.getElementById('tabBench'); if(!b||b.disabled)return false; b.click(); return true;`);
  if(!benchClicked) throw new Error('Design Bench navigation is unavailable after research completion');
  metrics.syntheticPlayerDomActivations++;
  await waitUntil(()=>driver.execute(`const v=document.getElementById('benchView'); return v&&!v.classList.contains('hidden');`),
    {timeout:5000,label:'rendered Design Bench'});

  // Use the shipped dev outcome controls to force the exact future live-call
  // boundary under review; the research selection/completion above stays real.
  await openDevPanel(driver);
  metrics.syntheticDevDomActivations++;
  await devClick('success');
  await devClick('live call');
  await closeDevPanel(driver);
  metrics.syntheticDevDomActivations++;

  await playerWaitClick('build & launch');

  // Advance through the actual outliner button until rollout. Benign opening modals
  // are dismissed through their visible controls; inability to roll out is a harness error.
  let rolledOut=false;
  for(let i=0;i<16&&!rolledOut;i++){
    rolledOut=await driver.execute(`return [...document.querySelectorAll('button[onclick^="launchFromHangar"]')].some(b=>!b.disabled&&(b.offsetWidth||b.offsetHeight||b.getClientRects().length));`);
    if(rolledOut) break;
    if(await dismissBlockingModal(driver)){ metrics.syntheticPlayerDomActivations++; continue; }
    const advanced=await driver.execute(clickText,['next event']);
    if(!advanced) throw new Error('Neither rollout action nor next-event control is reachable');
    metrics.syntheticPlayerDomActivations++;
  }
  if(!rolledOut) throw new Error('Vehicle did not roll out within 16 next-event actions');

  // Pin the remaining incidental RNG to a weather-GO draw. Outcome and live-call
  // selection still travel through the shipped dev controls above.
  const forcedDecisionSetup=await driver.execute(`
    Math.random=()=>0.01;
    return window.eval('(()=>{const observed={live:!!_devForceLiveCall,weather:!!_devForceWeather,outcome:_devForceOutcome};_devForceWeather=false;_devForceLiveCall=true;_devForceOutcome="success";rollWeather=()=>({id:"go",label:"GO for launch",adverse:false,penalty:0,clear:1,detail:""});return observed;})()');
  `);
  if(!forcedDecisionSetup.live||forcedDecisionSetup.weather||forcedDecisionSetup.outcome!=='success'){
    throw new Error(`Dev controls did not establish the exact live-call setup: ${JSON.stringify(forcedDecisionSetup)}`);
  }
  const launchAndSkip=await driver.execute(`
    const b=[...document.querySelectorAll('button[onclick^="launchFromHangar"]')].find(x=>!x.disabled&&(x.offsetWidth||x.offsetHeight||x.getClientRects().length));
    if(!b)return {activated:false,reason:'missing control'};
    const handler=b.getAttribute('onclick')||'';
    const match=handler.match(/launchFromHangar\\('([^']+)'\\)/);
    const orderId=match&&match[1];
    const record=orderId&&hangarList().find(entry=>entry&&entry.id===orderId);
    if(!record||!record.hullId) return {activated:false,reason:'control is not bound to an exact Hangar hull',handler,orderId};
    const identity={activated:true,orderId,hullId:record.hullId,missionId:record.missionId,handler};
    b.click();
    const decision=document.getElementById('flight3dDecision');
    const visible=el=>!!el&&!el.classList.contains('hidden')&&!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
    const internal=window.eval('({hasAnimState:!!animState,hasPendingFutureDecision:!!(animState&&animState.pendingDecision),decisionHeld:!!(animState&&animState.held),pendingLiveHullId:(typeof _pendingLive!=="undefined"&&_pendingLive&&_pendingLive.hullId)||null,flightResolving:typeof _flightResolving!=="undefined"&&!!_flightResolving})');
    const boundaryBeforeSkip={...internal,overlayVisible:visible(document.getElementById('animOverlay')),decisionVisible:visible(decision)};
    const exactBoundary=boundaryBeforeSkip.overlayVisible&&boundaryBeforeSkip.hasAnimState&&
      boundaryBeforeSkip.hasPendingFutureDecision&&!boundaryBeforeSkip.decisionHeld&&!boundaryBeforeSkip.decisionVisible&&
      boundaryBeforeSkip.pendingLiveHullId===record.hullId&&boundaryBeforeSkip.flightResolving;
    if(!exactBoundary) return {identity,boundaryBeforeSkip,skipped:false};
    const skip=[...document.querySelectorAll('button')].find(button=>visible(button)&&!button.disabled&&
      (button.textContent||'').trim().toLowerCase().includes('skip'));
    if(!skip) return {identity,boundaryBeforeSkip,skipped:false,reason:'visible Skip control missing'};
    skip.click();
    return {identity,boundaryBeforeSkip,skipped:true};
  `);
  const launchIdentity=launchAndSkip.identity||launchAndSkip;
  if(!launchIdentity.activated) throw new Error(`Ready-hull Fly from hangar activation failed: ${JSON.stringify(launchAndSkip)}`);
  const launchedHullId=launchIdentity.hullId;
  const boundaryBeforeSkip=launchAndSkip.boundaryBeforeSkip;
  if(!boundaryBeforeSkip.overlayVisible||!boundaryBeforeSkip.hasAnimState||!boundaryBeforeSkip.hasPendingFutureDecision||
      boundaryBeforeSkip.decisionHeld||boundaryBeforeSkip.decisionVisible||
      boundaryBeforeSkip.pendingLiveHullId!==launchedHullId||!boundaryBeforeSkip.flightResolving||!launchAndSkip.skipped){
    throw new Error(`Skip precondition is not the hidden future-decision boundary for hull ${launchedHullId}: ${JSON.stringify(boundaryBeforeSkip)}`);
  }
  metrics.syntheticPlayerDomActivations+=2; // exact Fly control, then exact visible Skip control
  await waitUntil(()=>driver.execute(`return document.getElementById('animOverlay').classList.contains('hidden');`),
    {timeout:5000,label:'skipped overlay to close'});
  await driver.navigate(url);
  metrics.reloadNavigations++;
  await waitUntil(()=>driver.execute(`return typeof startupContinue==='function' && !!localStorage.getItem('orbital_ventures_save');`),
    {timeout:30000,label:'saved game after reload'});
  await playerWaitClick('continue last game');
  if(await dismissBlockingModal(driver)) metrics.syntheticPlayerDomActivations++;

  const result=await driver.execute(`
    const launchedHullId=arguments[0];
    const raw=localStorage.getItem('orbital_ventures_save');
    const payload=raw&&JSON.parse(raw); const saved=payload&&(payload.state||payload);
    const hulls=saved&&Array.isArray(saved.hulls)?saved.hulls:[];
    const hangar=saved&&Array.isArray(saved.hangar)?saved.hangar:[];
    const exactHull=hulls.find(h=>h&&h.id===launchedHullId)||null;
    const exactHangar=hangar.find(entry=>entry&&entry.hullId===launchedHullId)||null;
    const transactions=saved?[saved.launchTxn,saved.pendingLaunch].filter(Boolean):[];
    const exactTransaction=transactions.find(owner=>owner&&owner.hullId===launchedHullId)||null;
    const pendingOwnerHullIds=window.eval('[typeof _pendingLive!=="undefined"&&_pendingLive,typeof _pendingReserve!=="undefined"&&_pendingReserve,typeof _pendingOps!=="undefined"&&_pendingOps,typeof _pendingRescue!=="undefined"&&_pendingRescue,typeof _pendingLaunch!=="undefined"&&_pendingLaunch].filter(Boolean).map(owner=>owner&&owner.hullId).filter(Boolean)');
    const exactPendingOwner=pendingOwnerHullIds.includes(launchedHullId);
    const decisionVisible=!document.getElementById('animOverlay').classList.contains('hidden') ||
      !document.getElementById('flight3dDecision').classList.contains('hidden');
    const exactDecision=exactPendingOwner&&decisionVisible;
    const exactSettled=!!exactHull&&exactHull.status!=='in-flight';
    // This regression stops before the future decision is shown. Only a
    // resumable owner is recovery: arbitrary/deleted/terminal hull status is a
    // diagnostic, not proof that the interrupted transaction completed safely.
    const recoverable=!!exactTransaction||!!exactHangar||exactDecision;
    return {research:'Static Fire Test Program',researchCompleted:!!(saved&&saved.research&&saved.research.test_program),
      launchedHullId,recoverable,exactTransaction:!!exactTransaction,exactHangar:!!exactHangar,
      exactDecision,exactSettled,decisionVisible,exactHullStatus:exactHull&&exactHull.status||null,
      hangarHullIds:hangar.map(entry=>entry&&entry.hullId).filter(Boolean),
      pendingOwnerHullIds,
      hullStatuses:hulls.map(h=>({id:h&&h.id,status:h&&h.status}))};
  `,[launchedHullId]);
  result.launchIdentity=launchIdentity;
  result.boundaryBeforeSkip=boundaryBeforeSkip;
  result.metrics={...metrics,elapsedEndToEndWallMs:Date.now()-startedAt};
  result.openingTopLevelNavigation=openingTopLevelNavigation;
  return result;
}

module.exports={runGate0LaunchFlow};
