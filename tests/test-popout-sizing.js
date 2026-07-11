// User-directed pop-out sizing pass (2026-07-11): all 5 pop-outs (vehicle/station/map/earth/command
// center) default to ~10% more zoomed-in content, and the vehicle pop-out hosts the FULL live Design
// Bench editor (moved-in DOM nodes, not a read-only stats summary). The harness's getElementById/
// getBoundingClientRect are dumb stubs (no real layout), so this only covers the pure-logic pieces —
// the actual DOM node relocation and visual centering need a real-browser check (noted to the user).
let pass=0, fail=0;
function check(name, cond){ if(cond){ pass++; } else { fail++; console.log('FAIL:', name); } }

check('POPOUT_ZOOM_BOOST is a 10% bump', POPOUT_ZOOM_BOOST===1.1);

// ---------- centeredZoomOffset: pure math, exact values ----------
const near=(a,b)=>Math.abs(a-b)<1e-6;
let off=centeredZoomOffset(800,600,1.1);
check('centeredZoomOffset: x centers the extra width', near(off.x,-40));
check('centeredZoomOffset: y centers the extra height', near(off.y,-30));
off=centeredZoomOffset(1000,1000,1);
check('centeredZoomOffset: z=1 (no boost) is a no-op offset', off.x===0 && off.y===0);

// ---------- every pop-out opens at the boosted default zoom, without throwing ----------
newGame('engineer');
try{ openVehPopout(); check('openVehPopout: no throw', true); }catch(e){ check('openVehPopout: no throw ('+e.message+')', false); }
check('openVehPopout: vpZoom defaults to the boost', vpZoom===POPOUT_ZOOM_BOOST);
check('openVehPopout: vehPopoutOpen flag set', vehPopoutOpen===true);
try{ closeVehPopout(); check('closeVehPopout: no throw', true); }catch(e){ check('closeVehPopout: no throw ('+e.message+')', false); }
check('closeVehPopout: flag cleared', vehPopoutOpen===false);

try{ openStationPopout(); check('openStationPopout: no throw', true); }catch(e){ check('openStationPopout: no throw ('+e.message+')', false); }
check('openStationPopout: stnPop.z defaults to the boost', stnPop.z===POPOUT_ZOOM_BOOST);
closeStationPopout();

try{ openMapPopout(); check('openMapPopout: no throw', true); }catch(e){ check('openMapPopout: no throw ('+e.message+')', false); }
check('openMapPopout: mapPop.z defaults to the boost', mapPop.z===POPOUT_ZOOM_BOOST);
closeMapPopout();

try{ openEarthPopout(); check('openEarthPopout: no throw', true); }catch(e){ check('openEarthPopout: no throw ('+e.message+')', false); }
check('openEarthPopout: earthPop.z defaults to the boost', earthPop.z===POPOUT_ZOOM_BOOST);
check('openEarthPopout: earthPop stays centered (x=0,y=0 — draw loop translates to center first)', earthPop.x===0 && earthPop.y===0);
closeEarthPopout();

try{ openCCPopout(); check('openCCPopout: no throw', true); }catch(e){ check('openCCPopout: no throw ('+e.message+')', false); }
check('openCCPopout: ccPop.z defaults to the boost', ccPop.z===POPOUT_ZOOM_BOOST);
closeCCPopout();

// ---------- vehicle pop-out: open/close is repeatable (catches a "second open" DOM-shuffle regression) ----------
try{
  openVehPopout(); closeVehPopout(); openVehPopout(); closeVehPopout();
  check('vehicle pop-out: open/close/open/close cycles without throwing', true);
}catch(e){ check('vehicle pop-out: open/close/open/close cycles without throwing ('+e.message+')', false); }

console.log(pass+'/'+(pass+fail)+' checks passed');
process.exit(fail>0 ? 1 : 0);
