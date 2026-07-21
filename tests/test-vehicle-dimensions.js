// Vehicle bench height/diameter scale readout (2026-07-20). vehicleRealDimensions gives an honest
// metres-based estimate (tank length = prop volume / cross-section, real diameter), distinct from
// buildVehicleShape's deliberately-compressed rendering unit. Pure function, fully testable.
let pass=0, fail=0;
function check(n,c){ if(c) pass++; else{ fail++; console.log('FAIL:',n); } }

// ---------- empty/degenerate input ----------
check('no stages -> zero dims, no throw', vehicleRealDimensions({stages:[]}).totalHeightM===0);
check('null spec -> zero dims, no throw', vehicleRealDimensions(null).totalHeightM===0);

// ---------- basic scaling: more propellant -> taller; wider tank -> shorter for same propellant ----------
{
  const small=vehicleRealDimensions({stages:[{prop:10,count:1,dia:1}]});
  const big  =vehicleRealDimensions({stages:[{prop:80,count:1,dia:1}]});
  check('more propellant makes a taller stage', big.stages[0].heightM>small.stages[0].heightM);
  const narrow=vehicleRealDimensions({stages:[{prop:40,count:1,dia:0.8}]});
  const wide  =vehicleRealDimensions({stages:[{prop:40,count:1,dia:1.4}]});
  check('a wider tank is shorter for the same propellant (real tank geometry)', wide.stages[0].heightM<narrow.stages[0].heightM);
}

// ---------- diameter is real (unclamped input reflects clamp bounds correctly) ----------
{
  const d=vehicleRealDimensions({stages:[{prop:20,count:1,dia:1.2}]});
  check('diameter passes through as real metres', d.maxDiameterM===1.2);
  check('diameter is clamped to GEO_DIA bounds like the bench slider', vehicleRealDimensions({stages:[{prop:20,count:1,dia:99}]}).maxDiameterM===GEO_DIA_MAX);
}

// ---------- multi-stage: total height is the sum, max diameter is the widest stage ----------
{
  const d=vehicleRealDimensions({stages:[{prop:100,count:1,dia:1.4},{prop:20,count:1,dia:0.9}]});
  check('total height includes both stages\' tank heights plus a nose/fairing allowance', d.totalHeightM>d.stages[0].heightM+d.stages[1].heightM);
  check('max diameter is the widest stage, not the last', d.maxDiameterM===1.4);
}

// ---------- crewed vehicles get a taller nose allowance (capsule vs plain fairing) ----------
{
  const uncrewed=vehicleRealDimensions({stages:[{prop:40,count:1,dia:1.2}],crewed:false});
  const crewed  =vehicleRealDimensions({stages:[{prop:40,count:1,dia:1.2}],crewed:true});
  check('a crewed vehicle gets a taller total (capsule allowance > fairing allowance)', crewed.totalHeightM>uncrewed.totalHeightM);
}

// ---------- transfer stage adds height when present ----------
{
  const noTransfer=vehicleRealDimensions({stages:[{prop:40,count:1,dia:1.2}],transferProp:0});
  const withTransfer=vehicleRealDimensions({stages:[{prop:40,count:1,dia:1.2}],transferProp:15});
  check('a transfer stage adds real height', withTransfer.totalHeightM>noTransfer.totalHeightM);
}

// ---------- real game vehicle produces a sane, non-degenerate figure ----------
{
  newGame('engineer');
  const spec={stages:state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),transferProp:0,crewed:false};
  const d=vehicleRealDimensions(spec);
  check('default bench vehicle has a positive, finite height', d.totalHeightM>0 && isFinite(d.totalHeightM));
  check('default bench vehicle has a positive, finite diameter', d.maxDiameterM>0 && isFinite(d.maxDiameterM));
}

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail?1:0);
