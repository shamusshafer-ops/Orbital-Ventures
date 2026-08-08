// G0-B06: rollout ownership changes do not force a render before a launch
// decision takes over, leaving the old Fly control visible but inert. This
// headless fixture proves ghost styling and stale rendering for one exact hull;
// it makes no viewport-placement or "buried" geometry claim.
const issue=createExpectedFailureTracker('G0-B06','Exact Hangar Fly action is ghost-styled and stale after ownership transfer');
animEnabled=true;
newGame('engineer');
state.money=100;
state.activeMission='first_flight';
queueBuild(true);
while(buildQueueList().length) advanceDays(1);
const ready=hangarFor(curMission())[0];
const beforeHtml=benchQueueHTML(curMission());
const exactAction=`onclick="launchFromHangar('${ready.id}')"`;
issue.setup('surface binds the Fly action to the exact ready hull',
  beforeHtml.includes(exactAction) && ready.hullId && hullById(ready.hullId).status==='hangar',
  `order=${ready.id}, hull=${ready.hullId}, action=${beforeHtml.match(/<button[^>]*>Fly from hangar<\/button>/)?.[0]||'missing'}`);

let renderCalls=0;
render=()=>{ renderCalls++; };
_devForceWeather=true;
launchFromHangar(ready.id);

issue.setup('the same hull transfers from Hangar to the pending weather decision',
  !hangarList().some(rec=>rec.id===ready.id) && !!_pendingLaunch && _pendingLaunch.hullId===ready.hullId &&
    hullById(ready.hullId).status==='in-flight',
  `orderPresent=${hangarList().some(rec=>rec.id===ready.id)}, pendingHull=${_pendingLaunch&&_pendingLaunch.hullId}, hull=${ready.hullId}, status=${hullById(ready.hullId)&&hullById(ready.hullId).status}`);
issue.expect('ready-hull action uses primary launch styling rather than ghost styling',
  /class="[^"]*launch[^"]*"[^>]*>Fly from hangar/.test(beforeHtml),
  beforeHtml.match(/<button[^>]*>Fly from hangar<\/button>/)?.[0]||'missing');
issue.expect('consuming a Hangar hull immediately refreshes the owning UI', renderCalls>0,
  `render calls=${renderCalls}, order=${ready.id}, hull=${ready.hullId}, pendingLaunch=${!!_pendingLaunch}`);
issue.finish();
