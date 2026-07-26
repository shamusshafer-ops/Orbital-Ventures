// Phase 5 shared-shell consolidation: one scene order, one responsive shell breakpoint,
// no retired panel-state geometry, and accessible/focusable navigation landmarks.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');
check('Tab order follows the visible scene dock',
  sceneAtOffset('command',1)==='bench' &&
  sceneAtOffset('bench',1)==='rnd' &&
  sceneAtOffset('command',-1)==='base');
check('scene stepping wraps in both directions',
  sceneAtOffset('base',1)==='command' &&
  sceneAtOffset('command',-1)==='base');

const fs=require('fs'), path=require('path');
const repo=fs.existsSync(path.join(__dirname,'..','src','shell.html')) ? path.join(__dirname,'..') : process.cwd();
const shell=fs.readFileSync(path.join(repo,'src','shell.html'),'utf8');
const renderSrc=fs.readFileSync(path.join(repo,'src','render.js'),'utf8');
const shellJs=fs.readFileSync(path.join(repo,'src','shell.js'),'utf8');

check('number keys use the same dock order as Tab and visible navigation',
  /setTab\(SCENE_DOCK_TABS\[idx\]\)/.test(shellJs));
check('the dock is a labelled navigation landmark with real buttons',
  /<nav class="rail-nav" id="sceneNav" aria-label="Primary scenes"/.test(shell) &&
  /<button id="\$\{def\.navId\}" class="scene" type="button"/.test(renderSrc));
check('all contextual destinations expose stable accessible labels',
  /id="mapRosterSlot"[^>]*aria-label="Solar System bodies"/.test(shell) &&
  /id="assemblyPaletteSlot"[^>]*aria-label="Assembly module palette"/.test(shell) &&
  /id="workspaceContextSlot"[^>]*aria-label="Workspace context"/.test(shell));
check('the shell has one three-column geometry and one shared stacking breakpoint',
  /\.scene-shell\{display:grid;grid-template-columns:var\(--cc-rail-width\) minmax\(0,1fr\) var\(--cc-rail-width\)/.test(shell) &&
  /@media\(max-width:880px\)\{\s*\.scene-shell\{grid-template-columns:1fr\}/.test(shell));
check('center and side zones explicitly contain intrinsic overflow',
  /\.scene-slot,.scene-monitor,.hud-deck,.scene-inspector,.scene-roster\{min-width:0\}/.test(shell) &&
  /\.rail-right\{[^}]*overflow-y:auto/.test(shell) &&
  /\.workspace-context-slot\{[^}]*overflow:auto/.test(shell));
check('retired panel-state and optional-right geometry are gone',
  !/viewing-panel|viewing-scene|classList\.add\('has-right'\)|shell\.has-right|shell:not\(\.has-right\)/.test(shell+renderSrc));
check('the remaining timeline projection is named for its actual responsibility',
  /function placeTimelineChrome\(\)/.test(renderSrc) && !/placeCommandCenterChrome/.test(renderSrc));

console.log(`${pass}/${pass+fail} checks passed`);
process.exit(fail?1:0);
