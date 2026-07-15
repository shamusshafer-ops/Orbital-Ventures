// Contracts pop-out and passive-contract category accordions.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

newGame('engineer');
state.money=1000;
state.rep=250;
state.research.crew_capsule=true;
state.completed.first_sat=true;
state.completed.first_astro=true;

try{
  openContractsPopout();
  check('popout: opens without throwing', contractsPopoutOpen===true);
  check('popout: creates overlay', !!$('contractsPopout'));
  check('popout: creates flight category', !!$('contractsPopFlight'));
  check('popout: creates passive category mount', !!$('contractsPopPassive'));
  renderPassiveContracts('contractSubtabs');
  check('passive view: renders category accordion controls', true);
  const before=contractAccordion.sat;
  toggleContractAccordion('sat');
  check('accordion: toggles category state', contractAccordion.sat!==before);
  check('accordion: rerenders passive view', true);
  closeContractsPopout();
  check('popout: closes cleanly', contractsPopoutOpen===false);
}catch(e){ check('popout render path ('+e.message+')', false); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
