// Gate 1D — stable action descriptors, exact-hull identity, native keyboard
// behavior, modal semantics, and accessible mutation feedback.
let g1ActionPass=0, g1ActionFail=0;
function g1ActionCheck(name,cond){ if(cond) g1ActionPass++; else { g1ActionFail++; console.log('FAIL:',name); } }

const g1ActionBase={label:'Commit First Flight',role:'primary',enabled:true,subjectType:'mission',subjectId:'first_flight',quote:{cashNow:.44}};
const g1ActionA=makeActionDescriptor(g1ActionBase), g1ActionB=makeActionDescriptor(g1ActionBase);
g1ActionCheck('descriptor fallback identity is stable across renders', g1ActionA.id===g1ActionB.id);
g1ActionCheck('descriptor is JSON-safe and validates', actionDescriptorErrors(g1ActionA).length===0&&recordIsJsonSafe(g1ActionA));
const g1ActionDisabled=makeActionDescriptor({id:'fly:h1',label:'Fly H1',role:'primary',enabled:false,disabledReason:'Insufficient runway',subjectType:'hull',subjectId:'h1'});
const g1ActionAttrs=actionButtonAttrs(g1ActionDisabled);
g1ActionCheck('disabled descriptor carries reason and native disabled semantics',
  /disabled aria-disabled="true"/.test(g1ActionAttrs)&&/Insufficient runway/.test(g1ActionAttrs));
g1ActionCheck('button attributes expose action role and exact subject identity',
  /data-action-role="primary"/.test(g1ActionAttrs)&&/data-subject-id="h1"/.test(g1ActionAttrs));
g1ActionCheck('invalid descriptor reports missing semantic subject',
  actionDescriptorErrors(makeActionDescriptor({label:'Broken'})).includes('subject'));

g1ActionCheck('native buttons, links, and form fields retain keyboard ownership',
  isNativeInteractive({target:{tagName:'BUTTON'}})&&isNativeInteractive({target:{tagName:'A'}})&&isNativeInteractive({target:{tagName:'INPUT'}}));
g1ActionCheck('non-interactive canvas does not block game shortcuts', !isNativeInteractive({target:{tagName:'CANVAS'}}));
g1ActionCheck('repeat and native control each block mutating shortcut routing',
  mutatingShortcutBlocked({repeat:true,target:{tagName:'DIV'}})&&mutatingShortcutBlocked({repeat:false,target:{tagName:'BUTTON'}}));
const g1ActionModal=$('modal');
g1ActionModal.classList.remove('hidden');
g1ActionCheck('an open modal blocks playback Enter/Space mutation routing',
  mutatingShortcutBlocked({repeat:false,target:{tagName:'DIV'}}));
g1ActionModal.classList.add('hidden');
const g1VisibleFocus={disabled:false,hidden:false,offsetWidth:10,offsetHeight:2,getAttribute:()=>null,closest:()=>null,getClientRects:()=>[{}]};
const g1DisabledFocus=Object.assign({},g1VisibleFocus,{disabled:true});
const g1HiddenFocus=Object.assign({},g1VisibleFocus,{closest:()=>({className:'hidden'})});
g1ActionCheck('modal focus candidates exclude disabled and hidden controls',
  JSON.stringify(modalFocusableElements({querySelectorAll:()=>[g1DisabledFocus,g1HiddenFocus,g1VisibleFocus]}))===JSON.stringify([g1VisibleFocus]));

newGame('engineer'); state.money=100; state.activeMission='first_flight';
const g1Queued=queueBuild(true,'request:first-flight:1');
g1ActionCheck('mutation records its stable request id for Gate 2 ownership', g1Queued&&g1Queued.requestId==='request:first-flight:1');
while(buildQueueList().length) advanceDays(1);
const g1Ready=hangarFor(curMission())[0], g1ReadyHull=g1Ready&&g1Ready.hullId;
const g1SurfaceA=benchQueueHTML(curMission()), g1SurfaceB=benchQueueHTML(curMission());
g1ActionCheck('exact-hull action surface is render-idempotent', g1SurfaceA===g1SurfaceB);
g1ActionCheck('ready action is primary and binds both order and exact hull',
  g1SurfaceA.includes(`launchFromHangar('${g1Ready.id}','${g1ReadyHull}'`)&&
  g1SurfaceA.includes('data-action-role="primary"')&&g1SurfaceA.includes(`data-subject-id="${g1ReadyHull}"`));
const g1HangarCount=hangarList().length;
g1ActionCheck('stale exact-hull identity is rejected before ownership mutation',
  launchFromHangar(g1Ready.id,'wrong-hull','stale-request')===false&&hangarList().length===g1HangarCount&&hullById(g1ReadyHull).status==='hangar');

const g1ActionFs=require('fs'), g1ActionShell=g1ActionFs.readFileSync('src/shell.html','utf8');
const g1ActionRenderSource=g1ActionFs.readFileSync('src/render.js','utf8');
g1ActionCheck('capture-phase pop-out handlers honor repeat, native-control, and modal ownership',
  (g1ActionRenderSource.match(/if\(e\.repeat\|\|isNativeInteractive\(e\)\|\|modalOpen\(\)\) return;/g)||[]).length>=2);
g1ActionCheck('shared modal declares dialog semantics and hidden state',
  /id="modal"[^>]*aria-hidden="true"/.test(g1ActionShell)&&
  /id="modalBody"[^>]*role="dialog"[^>]*aria-modal="true"/.test(g1ActionShell));
g1ActionCheck('mutation feedback owns a polite screen-reader live region',
  /id="actionStatus"[^>]*aria-live="polite"/.test(g1ActionShell));
g1ActionCheck('modal body receives fallback focusability when opened',
  /setAttribute\('tabindex','-1'\)/.test(g1ActionFs.readFileSync('src/sim.js','utf8')));

console.log(`${g1ActionPass}/${g1ActionPass+g1ActionFail} checks passed`);
process.exitCode=g1ActionFail?1:0;
