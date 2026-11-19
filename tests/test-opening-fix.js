// Spine step 4 (2026-11-16): the opening. Appended after harness.js + build/game.js.
// The checklist's research step now follows the first flight, and its pick never spends the money needed
// for the next attempts (two attempts, before and after First Flight — raised from one after, 2026-11-19).
let pass=0, fail=0;
function check(name,cond){ if(cond) pass++; else{ fail++; console.log('FAIL:',name); } }
const keys=()=>onboardingSteps().map(s=>s.key);
const cur=()=>(onboardingSteps().find(s=>s.current)||{}).key;

newGame('engineer');
check('research is the last step, after the debrief', keys().join('>')==='bench>commit>rollout>launch>debrief>research');
check('a new campaign starts on the bench step', cur()==='bench');
onboardingMark('bench');
check('after the bench comes the build, not research', cur()==='commit');
_gameStarted=true;
check('the "Then:" list reads in the new order', /Then: Wait for rollout → Launch → Read the debrief → Put the payout to work/.test(coachHTML()));

// the reserve and the pick
const attempt=onboardingAttemptCost();
check('an attempt costs build + launch + carry through the build', attempt>0.5 && attempt<1.5);
check('before First Flight succeeds the reserve is two attempts', Math.abs(onboardingReserve()-2*attempt)<0.011);
check('at game start Static Fire still fits with the reserve kept ($3.5M on Engineer)', (onboardingResearchPick()||{}).id==='test_program');
state.money=2.2;
check('after a failed flight it no longer does — nothing is suggested', onboardingResearchPick()===null);
const step=onboardingSteps().find(s=>s.key==='research');
check('…and the step says to keep money back instead', /keep \$[0-9.]+M back for two more tries at First Flight/.test(step.detail) && step.show===null);
state.money=50;
check('with plenty of money it suggests Static Fire again', (onboardingResearchPick()||{}).id==='test_program');
state.completed.first_flight=true;
check('after First Flight succeeds the reserve stays two attempts (comprehensive eval P1: one left a single retry for the dearer next flights)', Math.abs(onboardingReserve()-2*attempt)<0.011);
state.research.test_program=true;
const alt=onboardingResearchPick();
check('with Static Fire done it suggests the cheapest affordable project', !!alt && alt.id!=='test_program' && RESEARCH.filter(r=>!state.research[r.id]&&reqsMet(r)&&researchEraMet(r)&&sciGateMet(r)).every(r=>rdCostOf(r)>=rdCostOf(alt)));
check('it never suggests era-locked research', !!alt && researchEraMet(alt));

// Napkin is unaffected in spirit: plenty of room for research first
newGame('napkin');
check('Napkin can afford Static Fire with the reserve', (onboardingResearchPick()||{}).id==='test_program');

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
