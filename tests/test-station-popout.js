// #73 Slice 0 (2026-07-11): the station pop-out used to show a hardcoded sample module
// (stationActiveModule()) instead of the player's real assembled facility. stationCurrentView() is
// now the single source of truth for both the main bench and the pop-out, so they can't drift apart.
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

// ---------- draft mode: no facility built yet ----------
newGame('engineer');
let v=stationCurrentView();
check('draft: isDraft true with no facilities built', v.isDraft===true);
check('draft: built is null', v.built===null);
check('draft: cur.fs is the draft module list', Array.isArray(v.cur.fs.moduleList));

try{ openStationPopout(); check('draft: openStationPopout does not throw', true); }
catch(e){ check('draft: openStationPopout does not throw ('+e.message+')', false); }
check('draft: stnPopoutOpen flag set', stnPopoutOpen===true);
try{ closeStationPopout(); check('draft: closeStationPopout does not throw', true); }
catch(e){ check('draft: closeStationPopout does not throw ('+e.message+')', false); }
check('draft: flag cleared', stnPopoutOpen===false);

// refreshStationPopout must no-op safely when the pop-out isn't open
try{ refreshStationPopout(); check('refreshStationPopout no-ops safely when closed', true); }
catch(e){ check('refreshStationPopout no-ops safely when closed ('+e.message+')', false); }

// ---------- built facility mode ----------
newGame('engineer');
state.facilities.leo_station={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, moduleList:['can_std']};
v=stationCurrentView();
check('built: isDraft false once a facility exists', v.isDraft===false);
check('built: built array has the facility', v.built && v.built.length===1 && v.built[0].def.id==='leo_station');
check('built: cur resolves to that facility', v.cur && v.cur.def.id==='leo_station');
check('built: stationFocus defaulted to the only facility', state.stationFocus==='leo_station');

try{ openStationPopout(); check('built: openStationPopout does not throw', true); }
catch(e){ check('built: openStationPopout does not throw ('+e.message+')', false); }

// dock a second module, then switch focus via the same handler the pop-out tabs use — must not throw
// even with the pop-out open (this is exactly the staleness bug: switching facilities used to only
// refresh the main view, leaving the pop-out showing the old one)
state.facilities.mars_base={built:true, modules:1, since:state.year, supply:FAC_SUPPLY_MONTHS, starvedMonths:0, autoResupply:false, moduleList:['can_std']};
try{ setStationFocus('mars_base'); check('setStationFocus with pop-out open does not throw', true); }
catch(e){ check('setStationFocus with pop-out open does not throw ('+e.message+')', false); }
check('setStationFocus updates state.stationFocus', state.stationFocus==='mars_base');
v=stationCurrentView();
check('stationCurrentView reflects the switched focus', v.cur.def.id==='mars_base');

try{ closeStationPopout(); check('built: closeStationPopout does not throw', true); }
catch(e){ check('built: closeStationPopout does not throw ('+e.message+')', false); }

// ---------- orphaned functions were actually removed, not just unused ----------
check('renderStationSVG was removed (superseded by renderStationStackSVG)', typeof renderStationSVG==='undefined');
check('stationStatsHTML was removed (superseded by renderStationFacilityStats/stationDraftStatsHTML)', typeof stationStatsHTML==='undefined');

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
