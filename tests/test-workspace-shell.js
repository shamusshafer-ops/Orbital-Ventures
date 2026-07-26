// Phase 4 workspace-shell contract: Bench and R&D share contextual placement while
// preserving their purpose-built editor/tree and established right-side inspectors.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

const _els={};
const _get=document.getElementById.bind(document);
document.getElementById=(id)=>_els[id]||(_els[id]=_get(id));

newGame('engineer');
const benchScene=sceneDef('bench'), rndScene=sceneDef('rnd');
check('Bench and R&D declare the shared workspace context contract',
  [benchScene,rndScene].every(d=>d.layout==='workspace' && d.leftSlot==='workspaceContext' && d.workspace && d.workspace.contextId && d.workspace.contextHomeId));

state.tab='bench';
renderChromeShellRail(); renderCCLeft();
check('Design Bench mounts its existing vehicle summary in the shared left slot',
  _els.benchWorkspaceContext.parentNode===_els.workspaceContextSlot && !_els.workspaceContextSlot.classList.contains('hidden'));
check('Design Bench suppresses the generic advisor while workspace context owns the left slot',
  _els.ccLeft.classList.contains('hidden'));

state.tab='rnd';
renderChromeShellRail(); renderCCLeft(); renderTopbarStatus(); renderTechFilters();
check('switching workspace scenes returns the Bench node to its home',
  _els.benchWorkspaceContext.parentNode===_els.benchWorkspaceHome);
check('R&D mounts its existing project and filter context in the same left slot',
  _els.rndWorkspaceContext.parentNode===_els.workspaceContextSlot);
check('R&D context reports an idle program instead of disappearing',
  !_els.rndStatusBar.classList.contains('hidden') && _els.rndStatus.innerHTML.includes('No active project'));
check('R&D track filters remain live in the contextual slot',
  _els.techFilters.innerHTML.includes('Tracks') && _els.techFilters.innerHTML.includes('ready'));

const fs=require('fs'), path=require('path');
const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
check('workspace destinations and live contexts each exist exactly once',
  (shell.match(/id="workspaceContextSlot"/g)||[]).length===1 &&
  (shell.match(/id="benchWorkspaceContext"/g)||[]).length===1 &&
  (shell.match(/id="rndWorkspaceContext"/g)||[]).length===1);
check('Bench central monitor keeps the stage editor while readiness stays right',
  /<div class="bench-stage">\s*<div class="bench-editor" id="benchEditorPanel">/.test(shell) &&
  /<div id="railBench"[\s\S]*?id="readoutCard"/.test(shell));
check('R&D central monitor keeps the tree and lower management panels while the node inspector stays right',
  /id="techTree"[\s\S]*?id="divisionsCard"[\s\S]*?id="partnershipsCard"/.test(shell) &&
  /<div id="railRnd"[\s\S]*?id="researchDetail"/.test(shell));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
