// ============================================================================
// Headless Node test harness for orbital-ventures.html.
//
// This file stubs just enough of the browser environment (DOM, window,
// localStorage, canvas 2D context, Web Audio API, rAF) for the game's script
// to load and run under plain Node — including the animated flight-overlay
// render path (drawScene/drawAscent/animLoop), not just the headless
// (animEnabled=false) fast path.
//
// Usage: the game's script body (build/game.js, emitted by `node build.js`
// from the src/*.js modules) is concatenated AFTER this file, then
// (optionally) a test file AFTER that — all three run as one Node script, not
// required as modules. This matters because the game declares its state with
// top-level `let`/`const`; only true script-scope concatenation (not
// `require()`) makes those visible to appended test code in the same scope.
//
//   node build.js                                       # (from repo root) regenerates build/game.js
//   cat harness.js ../build/game.js your-test.js > bundle.js
//   node bundle.js
//
// build/game.js IS the release inline script, byte-for-byte: build.js writes
// both from the same concatenated module body, so `awk '/^<script>$/{f=1;next}
// /^<\/script>$/{f=0} f' orbital-ventures.html` equals build/game.js exactly
// (a build-parity cross-check worth running if a build.js emission bug is
// suspected). Sourcing build/game.js — not an awk extraction of the HTML —
// keeps the tests one hop from the src/ modules that are actually edited.
//
// A test file typically does: `newGame('engineer');` then calls game
// functions/asserts directly, ending with `console.log(pass+'/'+(pass+fail))`
// and `process.exit(fail>0?1:0)`.
// ============================================================================

// --- fake canvas 2D context: swallows every draw call/style set, but returns sane values for
// the handful of calls that read something back (gradients' addColorStop, measureText, etc).
// Needed starting with the flight-overlay pad-phase work (Slice A) — no prior suite exercised
// the actual drawScene/drawAscent render path (they all stayed on the animEnabled=false side).
function makeFakeCtx2D(){
  const gradient={ addColorStop(){} };
  const pattern={};
  const special={
    createLinearGradient:()=>gradient, createRadialGradient:()=>gradient, createConicGradient:()=>gradient,
    createPattern:()=>pattern,
    measureText:(txt)=>({width:((txt&&txt.length)||0)*6, actualBoundingBoxAscent:8, actualBoundingBoxDescent:2}),
    getImageData:()=>({data:new Uint8ClampedArray(4), width:1, height:1}),
    isPointInPath:()=>false, isPointInStroke:()=>false,
    getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),
    getLineDash:()=>[],
    save(){}, restore(){}, // explicit no-ops (would otherwise fall through to the generic no-op function below anyway)
  };
  const target={};
  return new Proxy(target, {
    get(obj,prop){
      if(prop in special) return special[prop];
      if(prop==='canvas') return obj._canvas||null;
      if(prop in obj) return obj[prop]; // a previously-set style property (fillStyle, font, etc.)
      return function(){}; // any other method call (fillRect, arc, translate, fillText, reset, ...) is a safe no-op
    },
    set(obj,prop,val){ obj[prop]=val; return true; }
  });
}
function makeCanvasStub(w,h){
  const el=makeStubEl();
  el.width=w||960; el.height=h||540;
  el.getContext=function(type){
    if(type==='2d') return makeFakeCtx2D();
    return null; // no fake WebGL — forces the game's own '2d' fallback path, which is what we want to test
  };
  return el;
}

// --- fake DOM element: swallows any property get/set/method call harmlessly ---
function makeStubEl(){
  const classListSet = new Set();
  const el = {
    _text: '', _html: '',
    style: new Proxy({}, { get(){ return ''; }, set(){ return true; } }),
    classList: {
      add: (...c)=>c.forEach(x=>classListSet.add(x)),
      remove: (...c)=>c.forEach(x=>classListSet.delete(x)),
      toggle: (c,f)=>{ if(f===undefined){ if(classListSet.has(c)) classListSet.delete(c); else classListSet.add(c); } else if(f) classListSet.add(c); else classListSet.delete(c); },
      contains: c=>classListSet.has(c),
    },
    dataset: {},
    children: [], childNodes: [], parentNode: null,
    get firstChild(){ return this.children[0]||null; },
    get lastChild(){ return this.children[this.children.length-1]||null; },
    get nextSibling(){ return null; },
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
    appendChild(c){ this.children.push(c); if(c&&typeof c==='object') c.parentNode=this; return c; },
    insertBefore(c){ this.children.push(c); if(c&&typeof c==='object') c.parentNode=this; return c; },
    removeChild(c){ const i=this.children.indexOf(c); if(i>=0) this.children.splice(i,1); if(c&&typeof c==='object') c.parentNode=null; return c; },
    remove(){ if(this.parentNode) this.parentNode.removeChild(this); },
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    querySelector(){ return makeStubEl(); },
    querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
    focus(){}, blur(){}, click(){}, scrollIntoView(){},
    get textContent(){ return this._text; }, set textContent(v){ this._text=v; },
    get innerHTML(){ return this._html; }, set innerHTML(v){ this._html=v; },
    get innerText(){ return this._text; }, set innerText(v){ this._text=v; },
    get offsetWidth(){ return 0; }, get offsetHeight(){ return 0; },
    get value(){ return this._value||''; }, set value(v){ this._value=v; },
  };
  return el;
}

global.document = {
  body: makeStubEl(),
  documentElement: makeStubEl(),
  fullscreenElement: null,
  webkitFullscreenElement: null,
  getElementById(id){
    if(id==='flightCanvas'||id==='flightTextCanvas'||id==='vehPopCanvas'||id==='earthPopCanvas'||id==='ccPopCanvas') return makeCanvasStub(960,540);
    // #73 Slice 2: pumpFlightArrivals() (and anything else checking "is a modal open?") reads
    // $('modal').classList.contains('hidden') as its neutral/no-modal-shown state — every other id
    // returns a fresh, memory-less stub each call, so without this #modal would look permanently
    // "open" (empty classList never contains 'hidden'), silently blocking deferred-flight arrival
    // resolution in every headless test, forever. Default to hidden (no modal shown), matching what
    // every existing test file already implicitly assumes.
    if(id==='modal'){ const el=makeStubEl(); el.classList.add('hidden'); return el; }
    return makeStubEl();
  },
  createElement(){ return makeStubEl(); },
  querySelector(){ return makeStubEl(); },
  querySelectorAll(){ return []; },
  addEventListener(){}, removeEventListener(){},
  exitFullscreen(){ return Promise.resolve(); },
  webkitExitFullscreen(){},
};

global.localStorage = (()=>{
  const store = {};
  return {
    getItem(k){ return Object.prototype.hasOwnProperty.call(store,k) ? store[k] : null; },
    setItem(k,v){ store[k]=String(v); },
    removeItem(k){ delete store[k]; },
    clear(){ for(const k in store) delete store[k]; },
  };
})();

global.window = global;
global.navigator = { userAgent: 'node-harness' };
global.addEventListener = ()=>{};
global.removeEventListener = ()=>{};
global.innerWidth = 1280;
global.innerHeight = 800;
global.requestAnimationFrame = ()=>0;
global.cancelAnimationFrame = ()=>{};
// --- fake Web Audio API: covers exactly the surface the game's sfx* functions touch (gain,
// oscillator, biquad filter, buffer/bufferSource nodes; AudioParam ramp/schedule methods).
// Needed starting with Slice A since it's the first suite to exercise animEnabled=true.
function makeAudioParamStub(initial){
  return { value:initial||0, setValueAtTime(){return this;}, setTargetAtTime(){return this;},
    linearRampToValueAtTime(){return this;}, exponentialRampToValueAtTime(){return this;},
    cancelScheduledValues(){return this;} };
}
function makeAudioNodeStub(extra){
  return Object.assign({ connect(){return this;}, disconnect(){return this;}, start(){}, stop(){} }, extra||{});
}
global.AudioContext = function(){
  return {
    sampleRate:44100, currentTime:0, state:'running', destination:{},
    createGain(){ return makeAudioNodeStub({ gain:makeAudioParamStub(1) }); },
    createOscillator(){ return makeAudioNodeStub({ type:'sine', frequency:makeAudioParamStub(440), detune:makeAudioParamStub(0) }); },
    createBiquadFilter(){ return makeAudioNodeStub({ type:'lowpass', frequency:makeAudioParamStub(350), Q:makeAudioParamStub(1), gain:makeAudioParamStub(0) }); },
    createBufferSource(){ return makeAudioNodeStub({ buffer:null, loop:false }); },
    createBuffer(channels, length, sr){ const chans=[]; for(let i=0;i<channels;i++) chans.push(new Float32Array(length));
      return { sampleRate:sr||44100, length, numberOfChannels:channels, getChannelData(i){ return chans[i]||chans[0]; } }; },
    resume(){ return Promise.resolve(); }, close(){ return Promise.resolve(); },
  };
};
global.webkitAudioContext = global.AudioContext;
global.Image = function(){ return { set src(v){}, addEventListener(){} }; };
