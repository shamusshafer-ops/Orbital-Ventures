// Command chrome lives outside #appShell, so its body class must follow the selected tab.
let pass=0, fail=0;
function check(name, cond){ if(cond) pass++; else { fail++; console.log('FAIL:',name); } }

state.tab='command';
renderChromeShellRail();
check('Command Center enables the body-scoped command chrome', document.body.classList.contains('command-mode'));

state.tab='bench';
renderChromeShellRail();
check('leaving Command Center removes the command chrome without changing the selected tab', !document.body.classList.contains('command-mode') && state.tab==='bench');

state.tab='command';
renderChromeShellRail();
check('returning to Command Center restores the command chrome', document.body.classList.contains('command-mode'));

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
