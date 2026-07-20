// E4.7 — crewed cislunar returns get a reentry leg (2026-07-20). Previously flightHasReentry
// required isOrbital, so a Moon mission's Earth return was never animated (flight ended after the
// transfer). Now a crewed, successful cislunar mission gets the same reentry leg an orbital crewed
// flight does, rendered through the existing (isOrbital-agnostic) reentry presentation.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

const CL_CREW ={mode:'launch',isCislunar:true,isOrbital:false,crewed:true, success:true, reqDv:12000,stages:[{prop:100,count:1,dia:4}]};
const CL_UNCR ={mode:'launch',isCislunar:true,isOrbital:false,crewed:false,success:true, reqDv:12000,stages:[{prop:100,count:1,dia:4}]};
const CL_FAIL ={mode:'launch',isCislunar:true,isOrbital:false,crewed:true, success:false,failPhase:'deep',reqDv:12000,stages:[{prop:100,count:1,dia:4}]};
const ORB_CREW={mode:'launch',isCislunar:false,isOrbital:true,crewed:true, success:true, reqDv:9400, stages:[{prop:100,count:1,dia:4}]};

// ---------- 1. flightHasReentry ----------
check('crewed successful cislunar HAS a reentry leg', flightHasReentry(CL_CREW)===true);
check('uncrewed cislunar has NO reentry leg', flightHasReentry(CL_UNCR)===false);
check('failed cislunar has NO reentry leg (no successful return)', flightHasReentry(CL_FAIL)===false);
check('crewed orbital still HAS a reentry leg (unchanged)', flightHasReentry(ORB_CREW)===true);

// ---------- 2. phase router reaches reentry for a crewed cislunar return ----------
{
  const timing={padDur:3200,ascentDur:7200,cruiseDur:9000,reentryDur:6400,totalDur:3200+7200+9000+6400+1200};
  const before=flight3dPhaseAt(CL_CREW, timing.padDur+timing.ascentDur+timing.cruiseDur*.5, timing); // mid-transfer
  const after =flight3dPhaseAt(CL_CREW, timing.padDur+timing.ascentDur+timing.cruiseDur+3000, timing); // into tail
  check('cislunar cruise is the transfer phase', before==='transfer');
  check('after the transfer, a crewed cislunar return enters reentry', after==='reentry');
  // reentry presentation is progress-only (no isOrbital dep) so the snapshot drives it fine
  const s=flight3dPresentationSnapshot(CL_CREW, timing, timing.padDur+timing.ascentDur+timing.cruiseDur+3000);
  const q=cape3dReentryProfile(s);
  check('the reentry profile produces a valid descent for a cislunar return', q.progress>0 && q.progress<1);
}

// ---------- 3. an uncrewed cislunar flight has reentryDur 0, so its tail is NOT reentry ----------
{
  const timing={padDur:3200,ascentDur:7200,cruiseDur:9000,reentryDur:0,totalDur:3200+7200+9000+1200};
  const after=flight3dPhaseAt(CL_UNCR, timing.padDur+timing.ascentDur+timing.cruiseDur+500, timing);
  check('uncrewed cislunar tail is not reentry (dock or complete)', after!=='reentry');
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
