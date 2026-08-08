const {waitUntil}=require('./webdriver');

const activateVisibleButton=`
  const wanted=String(arguments[0]).toLowerCase();
  const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
  const button=[...document.querySelectorAll('button')].find(el=>visible(el)&&!el.disabled&&
    (el.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase().includes(wanted));
  if(!button) return false;
  button.click(); return true;
`;

async function activate(driver,label){
  const activated=await driver.execute(activateVisibleButton,[label]);
  if(!activated) throw new Error(`Visible enabled button not found: ${label}`);
}

async function runGate0DuplicateControlFlow(driver,url){
  await driver.navigate(url);
  await waitUntil(()=>driver.execute(`return typeof startupNew==='function' && !!document.getElementById('modal');`),
    {timeout:30000,label:'Orbital Ventures startup for G0-B08'});
  await activate(driver,'new game');
  await activate(driver,'engineer');
  await activate(driver,'close');

  const openedBench=await driver.execute(`
    const button=document.getElementById('tabBench');
    if(!button||button.disabled) return false;
    button.click(); return true;
  `);
  if(!openedBench) throw new Error('Design Bench navigation is unavailable for G0-B08');
  await waitUntil(()=>driver.execute(`
    const view=document.getElementById('benchView');
    return !!view&&!view.classList.contains('hidden')&&[...document.querySelectorAll('button[data-action-role="primary"][data-subject-type="mission"]')]
      .some(button=>!button.disabled&&button.dataset.subjectId==='first_flight');
  `),{timeout:5000,label:'primary First Flight commitment control for G0-B08'});

  // Hold one concrete DOM node and deliver two click activations in the same
  // browser task. The second activation is against that exact node even if the
  // first synchronous render detaches it; this models duplicate delivery of one
  // UI control, not two independent direct calls to queueBuild/launch.
  const result=await driver.execute(`
    const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
    const button=[...document.querySelectorAll('button[data-action-role="primary"][data-subject-type="mission"]')]
      .find(el=>visible(el)&&!el.disabled&&el.dataset.subjectId==='first_flight');
    if(!button) return {setupError:'primary First Flight commitment control disappeared'};
    const heldButton=button;
    const beforeState=window.eval('({orders:buildQueueList().length,money:state.money,buildCost:computeVehicle().buildCost})');
    const before={...beforeState,text:(button.textContent||'').replace(/\\s+/g,' ').trim(),html:button.outerHTML};
    heldButton.click();
    const firstState=window.eval('({orders:buildQueueList().length,money:state.money})');
    const afterFirst={...firstState,isConnected:heldButton.isConnected};
    heldButton.click();
    const secondState=window.eval('({orders:buildQueueList().length,money:state.money})');
    const afterSecond={...secondState,isConnected:heldButton.isConnected};
    const firstOrdersAdded=afterFirst.orders-before.orders;
    const firstDebit=Math.round((before.money-afterFirst.money)*100)/100;
    const secondOrdersAdded=afterSecond.orders-afterFirst.orders;
    const secondDebit=Math.round((afterFirst.money-afterSecond.money)*100)/100;
    const ordersAdded=afterSecond.orders-before.orders;
    const debit=Math.round((before.money-afterSecond.money)*100)/100;
    const expectedDebit=Math.round(before.buildCost*100)/100;
    const setupValid=firstOrdersAdded===1&&Math.abs(firstDebit-expectedDebit)<0.011;
    const duplicateExact=secondOrdersAdded===1&&Math.abs(secondDebit-expectedDebit)<0.011;
    const idempotentExact=secondOrdersAdded===0&&Math.abs(secondDebit)<0.011;
    return {sameControlObject:heldButton===button,syntheticDomActivations:2,before,afterFirst,afterSecond,
      firstOrdersAdded,firstDebit,secondOrdersAdded,secondDebit,ordersAdded,debit,expectedDebit,
      setupValid,targetShapeValid:duplicateExact||idempotentExact,idempotent:idempotentExact,
      reproduced:setupValid&&duplicateExact};
  `);
  if(result.setupError) throw new Error(result.setupError);
  if(!result.sameControlObject||!result.setupValid){
    throw new Error(`First activation did not produce one valid build commitment: ${JSON.stringify(result)}`);
  }
  if(!result.targetShapeValid){
    throw new Error(`Second activation produced neither exact duplication nor idempotent rejection: ${JSON.stringify(result)}`);
  }
  return result;
}

module.exports={runGate0DuplicateControlFlow};
