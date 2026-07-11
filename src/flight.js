/* E1.2 slice C (visual overhaul): theme-synced HUD chrome for the flight overlay's canvas rendering.
   CSS custom properties (shell.html's body.theme-* classes) can't be read from canvas/Phaser draw
   calls, so this mirrors the same 3 palettes as a JS table — keep both in sync by hand if a theme
   color ever changes. Applies to HUD/instrument-panel CHROME only (telemetry box, decision panels,
   phase bar, buttons) — deliberately NOT the "physical world" being rendered (Earth's blue, rocket
   flame, plasma, stars, ocean splashdown stay their real colors regardless of console theme, the
   same way a mission-control room's console color doesn't repaint the sky outside the window). */
const THEME_COLORS = {
  dark:  {bg:'#0e1418', panel:'#151d23', panel2:'#1b252c', line:'#2a3a44', ink:'#d8e2e7', muted:'#7d909b', dim:'#56666f', ignite:'#f5a623', readout:'#4fd1d9', ok:'#58c47a', bad:'#e0564f', warn:'#e8b341'},
  green: {bg:'#0a1410', panel:'#0e1c14', panel2:'#163024', line:'#26442f', ink:'#9affb4', muted:'#5a9a6e', dim:'#3d6e4d', ignite:'#d7b32a', readout:'#5fe0a0', ok:'#4fe26e', bad:'#e0564f', warn:'#e8c341'},
  beige: {bg:'#1b1610', panel:'#2a2218', panel2:'#342a1c', line:'#4a3c28', ink:'#ecdfc4', muted:'#b09a72', dim:'#7d6a4c', ignite:'#e08a3c', readout:'#5bb9c4', ok:'#6db86a', bad:'#d2542b', warn:'#e8b341'},
};
function themeColor(key){ const t=THEME_COLORS[typeof currentTheme!=='undefined'?currentTheme:'dark']||THEME_COLORS.dark; return t[key]||THEME_COLORS.dark[key]; }
function themeRgba(key, alpha){
  const hex=themeColor(key).replace('#','');
  const r=parseInt(hex.substring(0,2),16), g=parseInt(hex.substring(2,4),16), b=parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
// Numeric 0xRRGGBB form for true Phaser GameObjects (render.js's Cape/vehicle-preview/map/station
// scenes) — .setTint()/lineStyle()/fillStyle() all take a number, not a CSS string. NOTE: unlike the
// canvas-2D chrome above (redrawn every frame, so a theme switch takes effect on the next frame for
// free), Phaser GameObjects only read this at the moment they're created — switching theme while a
// scene is already open does NOT live-retint it. Matches Phaser's natural object lifecycle; a real
// live-refresh would need each scene to track its own tintable objects and re-apply on theme change.
function themeColorNum(key){ return parseInt(themeColor(key).replace('#',''),16); }
/* ===== WebGL 2D compatibility layer ===== */
const _glShaders={
flatV:`attribute vec2 aPos;uniform mat3 uProj;uniform mat3 uTransform;void main(){vec3 p=uProj*uTransform*vec3(aPos,1.0);gl_Position=vec4(p.xy,0.0,1.0);}`,
flatF:`precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`,
linGradV:`attribute vec2 aPos;uniform mat3 uProj;uniform mat3 uTransform;varying vec2 vWorldPos;void main(){vec3 w=uTransform*vec3(aPos,1.0);vWorldPos=w.xy;vec3 p=uProj*w;gl_Position=vec4(p.xy,0.0,1.0);}`,
linGradF:`precision mediump float;varying vec2 vWorldPos;uniform vec2 uGradStart;uniform vec2 uGradEnd;uniform vec4 uStops[8];uniform float uStopPos[8];uniform int uNumStops;void main(){vec2 d=uGradEnd-uGradStart;float len2=dot(d,d);float t=len2>0.0?dot(vWorldPos-uGradStart,d)/len2:0.0;t=clamp(t,0.0,1.0);vec4 c=uStops[0];for(int i=1;i<8;i++){if(i>=uNumStops)break;float f=clamp((t-uStopPos[i-1])/(uStopPos[i]-uStopPos[i-1]+0.0001),0.0,1.0);c=mix(c,uStops[i],f);if(t<=uStopPos[i])break;}gl_FragColor=c;}`,
radGradV:`attribute vec2 aPos;uniform mat3 uProj;uniform mat3 uTransform;varying vec2 vWorldPos;void main(){vec3 w=uTransform*vec3(aPos,1.0);vWorldPos=w.xy;vec3 p=uProj*w;gl_Position=vec4(p.xy,0.0,1.0);}`,
radGradF:`precision mediump float;varying vec2 vWorldPos;uniform vec2 uCenter0;uniform vec2 uCenter1;uniform float uRadius0;uniform float uRadius1;uniform vec4 uStops[8];uniform float uStopPos[8];uniform int uNumStops;void main(){float dist=length(vWorldPos-uCenter1);float t=(dist-uRadius0)/(uRadius1-uRadius0+0.0001);t=clamp(t,0.0,1.0);vec4 c=uStops[0];for(int i=1;i<8;i++){if(i>=uNumStops)break;float f=clamp((t-uStopPos[i-1])/(uStopPos[i]-uStopPos[i-1]+0.0001),0.0,1.0);c=mix(c,uStops[i],f);if(t<=uStopPos[i])break;}gl_FragColor=c;}`,
dashV:`attribute vec2 aPos;attribute float aDist;uniform mat3 uProj;uniform mat3 uTransform;varying float vDist;void main(){vDist=aDist;vec3 p=uProj*uTransform*vec3(aPos,1.0);gl_Position=vec4(p.xy,0.0,1.0);}`,
dashF:`precision mediump float;varying float vDist;uniform vec4 uColor;uniform float uDashLen;uniform float uGapLen;void main(){float cycle=uDashLen+uGapLen;float m=mod(vDist,cycle);if(m>uDashLen)discard;gl_FragColor=uColor;}`
};
function glCompile(gl,vSrc,fSrc){
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('Shader:',gl.getShaderInfoLog(s));}return s;}
  const vs=sh(gl.VERTEX_SHADER,vSrc), fs=sh(gl.FRAGMENT_SHADER,fSrc);
  const prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) console.error('Link:',gl.getProgramInfoLog(prog));
  const attrs={},uniforms={};
  const na=gl.getProgramParameter(prog,gl.ACTIVE_ATTRIBUTES);
  for(let i=0;i<na;i++){const a=gl.getActiveAttrib(prog,i);attrs[a.name]=gl.getAttribLocation(prog,a.name);}
  const nu=gl.getProgramParameter(prog,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<nu;i++){const u=gl.getActiveUniform(prog,i);uniforms[u.name.replace(/\[0\]$/,'')]=gl.getUniformLocation(prog,u.name);}
  return {prog,attrs,uniforms};
}
function tessArc(cx,cy,r,sa,ea,n){
  n=n||32;const pts=[];
  let sweep=ea-sa;if(Math.abs(sweep)>Math.PI*2)sweep=Math.PI*2*(sweep>0?1:-1);
  for(let i=0;i<=n;i++){const a=sa+sweep*i/n;pts.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}
  return pts;
}
function tessEllipse(cx,cy,rx,ry,rot,n){
  n=n||32;const pts=[];const cr=Math.cos(rot),sr=Math.sin(rot);
  for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;const px=rx*Math.cos(a),py=ry*Math.sin(a);
    pts.push(cx+cr*px-sr*py,cy+sr*px+cr*py);}
  return pts;
}
function tessQuadBezier(x0,y0,cpx,cpy,x1,y1,n){
  n=n||20;const pts=[];
  for(let i=0;i<=n;i++){const t=i/n,u=1-t;
    pts.push(u*u*x0+2*u*t*cpx+t*t*x1,u*u*y0+2*u*t*cpy+t*t*y1);}
  return pts;
}
function tessThickLine(points,width){
  const hw=width/2,out=[];
  for(let i=0;i<points.length;i+=2){
    let nx=0,ny=-1;
    if(i+2<points.length){const dx=points[i+2]-points[i],dy=points[i+3]-points[i+1];const len=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/len;ny=dx/len;}
    else if(i>=2){const dx=points[i]-points[i-2],dy=points[i+1]-points[i-1];const len=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/len;ny=dx/len;}
    out.push(points[i]+nx*hw,points[i+1]+ny*hw,points[i]-nx*hw,points[i+1]-ny*hw);
  }
  return out;
}
function tessThickLineDash(points,width){
  const hw=width/2,out=[],dists=[];
  let cumDist=0;
  for(let i=0;i<points.length;i+=2){
    if(i>=2){const dx=points[i]-points[i-2],dy=points[i+1]-points[i-1];cumDist+=Math.sqrt(dx*dx+dy*dy);}
    let nx=0,ny=-1;
    if(i+2<points.length){const dx=points[i+2]-points[i],dy=points[i+3]-points[i+1];const len=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/len;ny=dx/len;}
    else if(i>=2){const dx=points[i]-points[i-2],dy=points[i+1]-points[i-1];const len=Math.sqrt(dx*dx+dy*dy)||1;nx=-dy/len;ny=dx/len;}
    out.push(points[i]+nx*hw,points[i+1]+ny*hw,points[i]-nx*hw,points[i+1]-ny*hw);
    dists.push(cumDist,cumDist);
  }
  return {verts:out,dists};
}
function earClipTriangulate(pts){
  if(pts.length<6) return new Float32Array(0);
  const n=pts.length/2;
  if(n<3) return new Float32Array(0);
  const idx=[];for(let i=0;i<n;i++) idx.push(i);
  const out=[];
  function cross(o,a,b){return (pts[a*2]-pts[o*2])*(pts[b*2+1]-pts[o*2+1])-(pts[a*2+1]-pts[o*2+1])*(pts[b*2]-pts[o*2]);}
  function isEar(prev,cur,next){
    if(cross(prev,cur,next)<=0) return false;
    for(let i=0;i<idx.length;i++){
      const p=idx[i];if(p===prev||p===cur||p===next) continue;
      if(ptInTri(pts[p*2],pts[p*2+1],pts[prev*2],pts[prev*2+1],pts[cur*2],pts[cur*2+1],pts[next*2],pts[next*2+1])) return false;
    }
    return true;
  }
  function ptInTri(px,py,ax,ay,bx,by,cx,cy){
    const d1=(px-bx)*(ay-by)-(ax-bx)*(py-by);
    const d2=(px-cx)*(by-cy)-(bx-cx)*(py-cy);
    const d3=(px-ax)*(cy-ay)-(cx-ax)*(py-ay);
    const neg=(d1<0)||(d2<0)||(d3<0);
    const pos=(d1>0)||(d2>0)||(d3>0);
    return !(neg&&pos);
  }
  let safety=n*3;
  while(idx.length>2&&safety-->0){
    let found=false;
    for(let i=0;i<idx.length;i++){
      const prev=idx[(i-1+idx.length)%idx.length];
      const cur=idx[i];
      const next=idx[(i+1)%idx.length];
      if(isEar(prev,cur,next)){
        out.push(pts[prev*2],pts[prev*2+1],pts[cur*2],pts[cur*2+1],pts[next*2],pts[next*2+1]);
        idx.splice(i,1);found=true;break;
      }
    }
    if(!found) break;
  }
  return new Float32Array(out);
}
function parseColor(str){
  if(!str||str==='transparent') return [0,0,0,0];
  if(typeof str!=='string') return [0,0,0,1];
  str=str.trim();
  if(str.charAt(0)==='#'){
    const h=str.substring(1);
    if(h.length===8) return [parseInt(h.substring(0,2),16)/255,parseInt(h.substring(2,4),16)/255,parseInt(h.substring(4,6),16)/255,parseInt(h.substring(6,8),16)/255];
    if(h.length===6) return [parseInt(h.substring(0,2),16)/255,parseInt(h.substring(2,4),16)/255,parseInt(h.substring(4,6),16)/255,1];
    if(h.length===3) return [parseInt(h[0]+h[0],16)/255,parseInt(h[1]+h[1],16)/255,parseInt(h[2]+h[2],16)/255,1];
  }
  const rm=str.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if(rm) return [parseFloat(rm[1])/255,parseFloat(rm[2])/255,parseFloat(rm[3])/255,rm[4]!==undefined?parseFloat(rm[4]):1];
  return [0,0,0,1];
}
class GLLinearGradient{
  constructor(x0,y0,x1,y1){this.x0=x0;this.y0=y0;this.x1=x1;this.y1=y1;this.stops=[];this.type='linearGradient';}
  addColorStop(pos,color){this.stops.push({pos,color:parseColor(color)});}
}
class GLRadialGradient{
  constructor(x0,y0,r0,x1,y1,r1){this.x0=x0;this.y0=y0;this.r0=r0;this.x1=x1;this.y1=y1;this.r1=r1;this.stops=[];this.type='radialGradient';}
  addColorStop(pos,color){this.stops.push({pos,color:parseColor(color)});}
}
function createGL2D(gl,textCtx,W,H){
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.STENCIL_TEST);
  gl.stencilFunc(gl.ALWAYS,0,0xFF);
  gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
  gl.viewport(0,0,W,H);
  const flatProg=glCompile(gl,_glShaders.flatV,_glShaders.flatF);
  const linGradProg=glCompile(gl,_glShaders.linGradV,_glShaders.linGradF);
  const radGradProg=glCompile(gl,_glShaders.radGradV,_glShaders.radGradF);
  const dashProg=glCompile(gl,_glShaders.dashV,_glShaders.dashF);
  const projMat=new Float32Array([2/W,0,0, 0,-2/H,0, -1,1,1]);
  const vBuf=gl.createBuffer();
  const dBuf=gl.createBuffer();
  function identMat(){return [1,0,0,1,0,0];}
  function matMul(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function matToGL(m){return new Float32Array([m[0],m[1],0, m[2],m[3],0, m[4],m[5],1]);}
  function txPt(m,x,y){return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}
  let stateStack=[];
  let curTransform=identMat();
  let _fillStyle=[0,0,0,1];
  let _fillStyleRaw='#000000';
  let _strokeStyle=[0,0,0,1];
  let _strokeStyleRaw='#000000';
  let _lineWidth=1;
  let _globalAlpha=1;
  let _lineDash=[];
  let _font='10px sans-serif';
  let _textAlign='left';
  let _textBaseline='alphabetic';
  let stencilLevel=0;
  let subPaths=[];
  let curSubPath=[];
  const ctx={
    canvas:gl.canvas,
    get fillStyle(){return _fillStyleRaw;},
    set fillStyle(v){
      _fillStyleRaw=v;
      if(typeof v==='string') _fillStyle=parseColor(v);
      else _fillStyle=v;
    },
    get strokeStyle(){return _strokeStyleRaw;},
    set strokeStyle(v){
      _strokeStyleRaw=v;
      if(typeof v==='string') _strokeStyle=parseColor(v);
      else _strokeStyle=v;
    },
    get lineWidth(){return _lineWidth;},
    set lineWidth(v){_lineWidth=v;},
    get globalAlpha(){return _globalAlpha;},
    set globalAlpha(v){_globalAlpha=v;},
    get font(){return _font;},
    set font(v){_font=v;textCtx.font=v;},
    get textAlign(){return _textAlign;},
    set textAlign(v){_textAlign=v;textCtx.textAlign=v;},
    get textBaseline(){return _textBaseline;},
    set textBaseline(v){_textBaseline=v;textCtx.textBaseline=v;},
    save(){
      stateStack.push({transform:curTransform.slice(),fillStyle:_fillStyle,fillStyleRaw:_fillStyleRaw,strokeStyle:_strokeStyle,strokeStyleRaw:_strokeStyleRaw,lineWidth:_lineWidth,globalAlpha:_globalAlpha,lineDash:_lineDash.slice(),font:_font,textAlign:_textAlign,textBaseline:_textBaseline,stencilLevel});
    },
    restore(){
      if(!stateStack.length) return;
      const s=stateStack.pop();
      curTransform=s.transform;_fillStyle=s.fillStyle;_fillStyleRaw=s.fillStyleRaw;
      _strokeStyle=s.strokeStyle;_strokeStyleRaw=s.strokeStyleRaw;
      _lineWidth=s.lineWidth;_globalAlpha=s.globalAlpha;_lineDash=s.lineDash;
      _font=s.font;textCtx.font=s.font;_textAlign=s.textAlign;textCtx.textAlign=s.textAlign;
      _textBaseline=s.textBaseline;textCtx.textBaseline=s.textBaseline;
      if(s.stencilLevel<stencilLevel){
        stencilLevel=s.stencilLevel;
        if(stencilLevel===0){gl.stencilFunc(gl.ALWAYS,0,0xFF);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);}
        else{gl.stencilFunc(gl.EQUAL,stencilLevel,0xFF);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);}
      }
    },
    translate(x,y){
      curTransform=matMul(curTransform,[1,0,0,1,x,y]);
    },
    rotate(a){
      const c=Math.cos(a),s=Math.sin(a);
      curTransform=matMul(curTransform,[c,s,-s,c,0,0]);
    },
    scale(x,y){
      curTransform=matMul(curTransform,[x,0,0,y,0,0]);
    },
    setLineDash(pattern){_lineDash=pattern&&pattern.length?pattern.slice():[];},
    createLinearGradient(x0,y0,x1,y1){return new GLLinearGradient(x0,y0,x1,y1);},
    createRadialGradient(x0,y0,r0,x1,y1,r1){return new GLRadialGradient(x0,y0,r0,x1,y1,r1);},
    beginPath(){subPaths=[];curSubPath=[];},
    moveTo(x,y){if(curSubPath.length)subPaths.push(curSubPath);curSubPath=[x,y];},
    lineTo(x,y){if(!curSubPath.length)curSubPath=[x,y];else{curSubPath.push(x,y);}},
    arc(cx,cy,r,sa,ea){
      if(r<=0) return;
      const fullCircle=Math.abs(ea-sa)>=Math.PI*2-0.0001||ea>Math.PI*2;
      const n=Math.min(Math.max(12,Math.round(r*2)),128);
      let pts;
      if(fullCircle){pts=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;pts.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}}
      else{pts=tessArc(cx,cy,r,sa,ea,n);}
      if(curSubPath.length) for(let i=0;i<pts.length;i+=2) curSubPath.push(pts[i],pts[i+1]);
      else curSubPath=pts.slice();
    },
    ellipse(cx,cy,rx,ry,rot,sa,ea){
      if(rx<=0||ry<=0) return;
      const n=Math.min(Math.max(12,Math.round(Math.max(rx,ry)*2)),128);
      const pts=tessEllipse(cx,cy,rx,ry,rot,n);
      if(curSubPath.length) for(let i=0;i<pts.length;i+=2) curSubPath.push(pts[i],pts[i+1]);
      else curSubPath=pts.slice();
    },
    quadraticCurveTo(cpx,cpy,x,y){
      const sx=curSubPath.length>=2?curSubPath[curSubPath.length-2]:0;
      const sy=curSubPath.length>=2?curSubPath[curSubPath.length-1]:0;
      const pts=tessQuadBezier(sx,sy,cpx,cpy,x,y,20);
      for(let i=2;i<pts.length;i+=2) curSubPath.push(pts[i],pts[i+1]);
    },
    closePath(){
      if(curSubPath.length>=4){curSubPath.push(curSubPath[0],curSubPath[1]);}
      subPaths.push(curSubPath);curSubPath=[];
    },
    rect(x,y,w,h){
      // 4 distinct corners (no duplicated closing vertex): the closing point made
      // ear-clipping collapse to a single triangle, so rect-based clip() only covered half the box.
      if(curSubPath.length) subPaths.push(curSubPath);
      curSubPath=[x,y,x+w,y,x+w,y+h,x,y+h];
      subPaths.push(curSubPath);curSubPath=[];
    },
    fill(){
      const allPts=curSubPath.length?subPaths.concat([curSubPath]):subPaths;
      for(const sp of allPts){
        if(sp.length<6) continue;
        const n=sp.length/2;
        if(n>=10){
          const cx=sp.reduce((a,_,i)=>i%2===0?a+sp[i]:a,0)/n;
          const cy=sp.reduce((a,_,i)=>i%2===1?a+sp[i]:a,0)/n;
          const fan=new Float32Array(2+sp.length);
          fan[0]=cx;fan[1]=cy;
          for(let i=0;i<sp.length;i++) fan[i+2]=sp[i];
          _draw(fan,_fillStyle,gl.TRIANGLE_FAN);
        } else {
          const tris=earClipTriangulate(sp);
          if(tris.length) _draw(tris,_fillStyle,gl.TRIANGLES);
        }
      }
    },
    stroke(){
      const allPts=curSubPath.length?subPaths.concat([curSubPath]):subPaths;
      for(const sp of allPts){
        if(sp.length<4) continue;
        _strokePath(sp,_lineWidth,_strokeStyle,_lineDash);
      }
    },
    clip(){
      const allPts=curSubPath.length?subPaths.concat([curSubPath]):subPaths;
      stencilLevel++;
      gl.colorMask(false,false,false,false);
      gl.stencilFunc(gl.ALWAYS,stencilLevel,0xFF);
      gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);
      for(const sp of allPts){
        if(sp.length<6) continue;
        const n=sp.length/2;
        if(n>=10){
          const ccx=sp.reduce((a,_,i)=>i%2===0?a+sp[i]:a,0)/n;
          const ccy=sp.reduce((a,_,i)=>i%2===1?a+sp[i]:a,0)/n;
          const fan=new Float32Array(2+sp.length);
          fan[0]=ccx;fan[1]=ccy;
          for(let i=0;i<sp.length;i++) fan[i+2]=sp[i];
          _draw(fan,[1,1,1,1],gl.TRIANGLE_FAN);
        } else {
          const tris=earClipTriangulate(sp);
          if(tris.length) _draw(tris,[1,1,1,1],gl.TRIANGLES);
        }
      }
      gl.colorMask(true,true,true,true);
      gl.stencilFunc(gl.EQUAL,stencilLevel,0xFF);
      gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
    },
    fillRect(x,y,w,h){
      const verts=new Float32Array([x,y,x+w,y,x,y+h, x+w,y,x+w,y+h,x,y+h]);
      _draw(verts,_fillStyle,gl.TRIANGLES);
    },
    strokeRect(x,y,w,h){
      const pts=[x,y,x+w,y,x+w,y+h,x,y+h,x,y];
      _strokePath(pts,_lineWidth,_strokeStyle,_lineDash);
    },
    fillText(text,x,y){
      textCtx.save();
      const m=curTransform;
      textCtx.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);
      textCtx.globalAlpha=_globalAlpha;
      const fs=_fillStyleRaw;
      if(typeof fs==='string') textCtx.fillStyle=fs;
      else if(fs&&fs.type) textCtx.fillStyle='#ffffff';
      else{const c=_fillStyle;textCtx.fillStyle=`rgba(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)},${c[3]})`;}
      textCtx.fillText(text,x,y);
      textCtx.restore();
    },
    measureText(text){return textCtx.measureText(text);},
    clearFrame(){
      gl.clear(gl.COLOR_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
      textCtx.clearRect(0,0,W,H);
      stateStack=[];curTransform=identMat();
      _fillStyle=[0,0,0,1];_fillStyleRaw='#000000';
      _strokeStyle=[0,0,0,1];_strokeStyleRaw='#000000';
      _lineWidth=1;_globalAlpha=1;_lineDash=[];
      stencilLevel=0;
      gl.stencilFunc(gl.ALWAYS,0,0xFF);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
      subPaths=[];curSubPath=[];
    }
  };
  gl.clearColor(0.016,0.024,0.04,1);
  function _draw(vertices,style,mode){
    if(!vertices.length) return;
    const isGrad=style&&typeof style==='object'&&style.type;
    if(isGrad&&style.type==='linearGradient') _drawLinGrad(vertices,style,mode);
    else if(isGrad&&style.type==='radialGradient') _drawRadGrad(vertices,style,mode);
    else _drawFlat(vertices,style,mode);
  }
  function _applyAlpha(c){
    if(_globalAlpha>=1) return c;
    if(Array.isArray(c)) return [c[0],c[1],c[2],c[3]*_globalAlpha];
    return c;
  }
  function _drawFlat(vertices,color,mode){
    const p=flatProg;
    gl.useProgram(p.prog);
    gl.uniformMatrix3fv(p.uniforms.uProj,false,projMat);
    gl.uniformMatrix3fv(p.uniforms.uTransform,false,matToGL(curTransform));
    const c=_applyAlpha(Array.isArray(color)?color:[0,0,0,1]);
    gl.uniform4f(p.uniforms.uColor,c[0],c[1],c[2],c[3]);
    gl.bindBuffer(gl.ARRAY_BUFFER,vBuf);
    gl.bufferData(gl.ARRAY_BUFFER,vertices instanceof Float32Array?vertices:new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(p.attrs.aPos);
    gl.vertexAttribPointer(p.attrs.aPos,2,gl.FLOAT,false,0,0);
    gl.drawArrays(mode,0,vertices.length/2);
    gl.disableVertexAttribArray(p.attrs.aPos);
  }
  function _setupGradStops(p,grad){
    const stops=grad.stops.slice().sort((a,b)=>a.pos-b.pos);
    const nStops=Math.min(stops.length,8);
    gl.uniform1i(p.uniforms.uNumStops,nStops);
    for(let i=0;i<8;i++){
      const s=i<nStops?stops[i]:stops[nStops-1]||{pos:0,color:[0,0,0,1]};
      const c=s.color;
      const ac=[c[0],c[1],c[2],c[3]*_globalAlpha];
      gl.uniform4f(gl.getUniformLocation(p.prog,'uStops['+i+']'),ac[0],ac[1],ac[2],ac[3]);
      gl.uniform1f(gl.getUniformLocation(p.prog,'uStopPos['+i+']'),s.pos);
    }
  }
  function _drawLinGrad(vertices,grad,mode){
    const p=linGradProg;
    gl.useProgram(p.prog);
    gl.uniformMatrix3fv(p.uniforms.uProj,false,projMat);
    gl.uniformMatrix3fv(p.uniforms.uTransform,false,matToGL(curTransform));
    const gs=txPt(curTransform,grad.x0,grad.y0);
    const ge=txPt(curTransform,grad.x1,grad.y1);
    gl.uniform2f(p.uniforms.uGradStart,gs[0],gs[1]);
    gl.uniform2f(p.uniforms.uGradEnd,ge[0],ge[1]);
    _setupGradStops(p,grad);
    gl.bindBuffer(gl.ARRAY_BUFFER,vBuf);
    gl.bufferData(gl.ARRAY_BUFFER,vertices instanceof Float32Array?vertices:new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(p.attrs.aPos);
    gl.vertexAttribPointer(p.attrs.aPos,2,gl.FLOAT,false,0,0);
    gl.drawArrays(mode,0,vertices.length/2);
    gl.disableVertexAttribArray(p.attrs.aPos);
  }
  function _drawRadGrad(vertices,grad,mode){
    const p=radGradProg;
    gl.useProgram(p.prog);
    gl.uniformMatrix3fv(p.uniforms.uProj,false,projMat);
    gl.uniformMatrix3fv(p.uniforms.uTransform,false,matToGL(curTransform));
    const c0=txPt(curTransform,grad.x0,grad.y0);
    const c1=txPt(curTransform,grad.x1,grad.y1);
    const sx=Math.sqrt(curTransform[0]*curTransform[0]+curTransform[1]*curTransform[1]);
    gl.uniform2f(p.uniforms.uCenter0,c0[0],c0[1]);
    gl.uniform2f(p.uniforms.uCenter1,c1[0],c1[1]);
    gl.uniform1f(p.uniforms.uRadius0,grad.r0*sx);
    gl.uniform1f(p.uniforms.uRadius1,grad.r1*sx);
    _setupGradStops(p,grad);
    gl.bindBuffer(gl.ARRAY_BUFFER,vBuf);
    gl.bufferData(gl.ARRAY_BUFFER,vertices instanceof Float32Array?vertices:new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(p.attrs.aPos);
    gl.vertexAttribPointer(p.attrs.aPos,2,gl.FLOAT,false,0,0);
    gl.drawArrays(mode,0,vertices.length/2);
    gl.disableVertexAttribArray(p.attrs.aPos);
  }
  function _strokePath(pts,lineWidth,style,dashPattern){
    if(pts.length<4) return;
    if(dashPattern&&dashPattern.length>=2){
      const td=tessThickLineDash(pts,lineWidth);
      const p=dashProg;
      gl.useProgram(p.prog);
      gl.uniformMatrix3fv(p.uniforms.uProj,false,projMat);
      gl.uniformMatrix3fv(p.uniforms.uTransform,false,matToGL(curTransform));
      const c=_applyAlpha(Array.isArray(style)?style:(style&&style.type)?[1,1,1,1]:[0,0,0,1]);
      gl.uniform4f(p.uniforms.uColor,c[0],c[1],c[2],c[3]);
      gl.uniform1f(p.uniforms.uDashLen,dashPattern[0]);
      gl.uniform1f(p.uniforms.uGapLen,dashPattern[1]||dashPattern[0]);
      gl.bindBuffer(gl.ARRAY_BUFFER,vBuf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(td.verts),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(p.attrs.aPos);
      gl.vertexAttribPointer(p.attrs.aPos,2,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,dBuf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(td.dists),gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(p.attrs.aDist);
      gl.vertexAttribPointer(p.attrs.aDist,1,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,td.verts.length/2);
      gl.disableVertexAttribArray(p.attrs.aPos);
      gl.disableVertexAttribArray(p.attrs.aDist);
    } else {
      const verts=tessThickLine(pts,lineWidth);
      const isGrad=style&&typeof style==='object'&&style.type;
      if(isGrad&&style.type==='linearGradient') _drawLinGrad(new Float32Array(verts),style,gl.TRIANGLE_STRIP);
      else if(isGrad&&style.type==='radialGradient') _drawRadGrad(new Float32Array(verts),style,gl.TRIANGLE_STRIP);
      else _drawFlat(new Float32Array(verts),style,gl.TRIANGLE_STRIP);
    }
  }
  return ctx;
}
/* ===== End WebGL 2D compatibility layer ===== */

// A crewed capsule returning from Earth orbit gets a reentry-&-recovery scene after the
// orbit phase: plasma sheath + heat down through the atmosphere, then chutes into the ocean.
// Gated to success + orbital + crewed (the capsule nose) — suborbital already shows reentry
// inline, and cislunar/deep returns aren't wired here yet (future extension).
function flightHasReentry(s){ return !!(s && s.success && s.isOrbital && s.crewed); }
// Shared flight setup — builds animState for either the Phaser host (CanvasTexture
// 2D context) or the legacy WebGL/2D canvas. drawScene drives everything from t.
function setupFlightState(spec, done, ctx, cv, viewCanvas, seedP){
  // The Phaser path reuses ONE CanvasTexture 2D context across launches. Any residual
  // state from the previous flight (a leftover clip region, transform, alpha, or line
  // dash) would otherwise confine/blank the next flight's drawing — the "black square
  // blocking everything, only a segment of the globe shows" replay bug. Reset it.
  try{
    if(ctx){
      if(typeof ctx.reset==='function') ctx.reset();
      else { if(ctx.setTransform) ctx.setTransform(1,0,0,1,0,0); if(ctx.setLineDash) ctx.setLineDash([]); ctx.globalAlpha=1; if('globalCompositeOperation' in ctx) ctx.globalCompositeOperation='source-over'; }
    }
  }catch(e){}
  const ascentDur=7200, cruiseDur=spec.isCislunar?9000:4800;
  const reentryDur=flightHasReentry(spec)?6400:0; // appended after the orbit phase for a returning capsule
  // Slice A: a pad phase (countdown → ignition → hold-down) plays on THIS canvas, ahead of the
  // ascent, so the launch and the climb are one continuous shot instead of two containers. Only
  // full launches get it; an arrival-only replay (mode 'arrive', Slice B) starts in cruise (padDur 0).
  const launchMode = spec.mode!=='arrive';
  const padDur = launchMode ? PAD_PHASE_MS : 0;
  // Slice B: a deferred departure plays pad → ascent → a "cruise begins" outro card, then holds; it never
  // shows orbit/cruise/reentry (the real outcome is deferred to arrival), so its own totalDur is just the
  // launch plus the card. Mirror of 'arrive' (which drops the pad); 'depart' keeps the pad but drops the tail.
  const departMode = spec.mode==='depart';
  let totalDur;
  if(departMode) totalDur=ascentDur+DEPART_CARD_MS;
  else if(!spec.success && spec.failPhase==='ascent') totalDur=ascentDur*0.55+2000;
  else if(!spec.success && spec.failPhase==='deep') totalDur=ascentDur+cruiseDur*0.42+2000;
  // #73 Slice 3: a successful module delivery (spec.dock) appends a rendezvous+dock card after the cruise,
  // in place of the usual 1200ms settle tail (reentryDur is 0 here — module deliveries are uncrewed).
  else totalDur=ascentDur+cruiseDur+reentryDur+(spec.dock?DOCK_CARD_MS:1200);
  totalDur+=padDur; // the loop must run through the pad pre-roll too
  const stars=[]; for(let i=0;i<160;i++) stars.push({x:Math.random(),y:Math.random()*0.92,b:0.3+Math.random()*0.7,s:0.8+Math.random()*1.4,twinkle:Math.random()*6.28});
  const path=spec.isCislunar?buildLunarPath(cv.width,cv.height,spec.rng):null;
  // Optional seed: begin the ascent already this fraction of the way up (the altitude the pad-liftoff
  // lead-in had reached at handoff), so the cut from the command-center scene reads as continuous rather
  // than resetting the rocket to the ground. Defaults to 0 (today's ground-level start) for every other caller.
  const seedT=clampA(seedP||0,0,0.85)*ascentDur;
  animState={spec,done,ctx,cv,viewCanvas:viewCanvas||cv,t0:performance.now(),padDur,ascentDur,cruiseDur,reentryDur,totalDur,stars,path,raf:0,trail:[],particles:[],debris:[],rePlasma:[],reSplash:[],shakeX:0,shakeY:0,lastT:0,virtT:seedT,prevWall:performance.now(),sfxSepFired:{},sfxBoomFired:false,sfxEnginePhase:null,recovering:!!spec.recovering,_splashed:false,_splashX:null,reRing:0,ignite:1,_engineStarted:false,pendingDecision:spec._pendingDecisionSeed||null}; // E1.2 slice C: seeded from spec (not set after playMission returns) so the FIRST synchronous animLoop frame already sees it
  sfxInit();
  const totalProp=spec.stages.reduce((a,s)=>a+s.prop,0)+(spec.transferProp||0);
  const engCount=spec.stages[0]?spec.stages[0].count||1:1;
  animState._engSpec={engCount,totalProp};
  // With a pad phase, the engines light at ignition (drawn in drawAscent's pad branch); without one,
  // start immediately as before so the arrival-replay / seeded paths are unchanged.
  if(padDur<=0){ sfxStartEngine(engCount, totalProp); animState._engineStarted=true; }
  animState.sfxEnginePhase='ascent';
}
function playMission(spec, done, seedP){
  $('animTitle').textContent=spec.title+(spec.crewed?'  ·  crewed':'');
  $('animOverlay').classList.remove('hidden');
  initFlightZoom(); resetFlightZoom(); // attach camera listeners once; reset the view for this fresh flight (persists across its own phase transitions)
  // The Phaser-hosted FlightScene (graphics Slices 1–3) rendered the ascent richly but its
  // reused CanvasTexture blanked the post-ascent phases (orbit / suborbital / cislunar) in
  // this WebGL setup — a GPU-texture issue we couldn't resolve from outside the browser.
  // Reverted to the PROVEN direct renderer below (WebGL-2D `createGL2D`, with a 2D-canvas
  // fallback), which draws every flight phase reliably. Phaser stays in use for the Cape /
  // bench / map scenes; only the flight scene is disabled.
  // if(phaserOK() && startFlightScene(spec, done)) return;  // disabled 2026-06-25 — see note above
  const cv=$('flightCanvas');
  const gl=cv&&cv.getContext('webgl',{alpha:false,antialias:true,stencil:true,premultipliedAlpha:false});
  let ctx;
  if(gl){
    const textCv=$('flightTextCanvas');
    const textCtx=textCv.getContext('2d');
    ctx=createGL2D(gl,textCtx,cv.width,cv.height);
  } else {
    ctx=cv&&cv.getContext('2d');
  }
  if(!ctx){ if(done) done(); return; }
  setupFlightState(spec, done, ctx, cv, cv, seedP);
  animLoop();
}
// E0.5-A: cap one frame's wall-clock advance at ~one 20fps frame. RAF halts in a hidden tab, so
// the FIRST frame after returning can carry a multi-second delta that would fast-forward the
// canvas-fallback animation straight to the end. Clamping resumes it smoothly instead of jump-cutting.
const ANIM_MAX_WALL_DT=50;
function clampWallDt(dt){ return dt>ANIM_MAX_WALL_DT ? ANIM_MAX_WALL_DT : dt; }
function animLoop(){
  const A=animState; if(!A||A.held) return;
  const now=performance.now();
  const wallDt=clampWallDt(now-A.prevWall);
  A.prevWall=now;
  A.virtT+=wallDt*animSpeed();
  const t=A.virtT;
  try{ drawScene(t); }catch(e){ console.error('Animation error:',e); endAnim(); return; }
  if(t>=A.totalDur){ endAnim(true); return; }
  A.raf=requestAnimationFrame(animLoop);
}
// E0.5-A: put the Phaser flight scene to sleep once the overlay is hidden. FlightScene.update
// early-outs when playing=false, but Phaser keeps RENDERING the scene — its camera ColorMatrix
// postFX plus the plume/atmosphere/city glow FX — every frame behind the hidden overlay until it
// is slept. The next launch wakes it before scene.restart() (see startFlightScene). No-op in the
// canvas fallback (flightScene is null) and while the overlay is still on-screen (hold frames).
function sleepFlightScene(){ try{ if(flightScene && flightScene.scene && !flightScene.scene.isSleeping()) flightScene.scene.sleep(); }catch(e){} }
function endAnim(hold){
  const A=animState; if(!A) return;
  cancelAnimationFrame(A.raf);
  sfxStop();
  if(hold && A.spec.mode==='depart'){ // Slice B: hold on the cruise-begins card until the player dismisses it
    A.held=true;
    drawDepartCard(DEPART_CARD_MS, true); // settled final frame + a Continue affordance
    flightRefresh();
    return;
  }
  if(hold && A.spec.dock){ // #73 Slice 3: hold on the module-docked spectacle (checked before the generic post-flight card, which a delivery would otherwise match)
    A.held=true;
    drawDockCard(DOCK_CARD_MS, true); // settled soft-dock frame + a Continue affordance
    flightRefresh();
    return;
  }
  if(hold && A.spec.success && (A.spec.isOrbital||A.spec.isCislunar)){
    A.held=true;
    drawPostFlight();
    flightRefresh(); // push the post-flight frame to the Phaser texture (no-op in fallback)
    return;
  }
  animState=null; $('animOverlay').classList.add('hidden'); sleepFlightScene(); if(A.done) A.done();
}
/* ---------- Flight-overlay manual camera (wheel-zoom + drag-pan) ----------
   New this slice: the full-screen flight overlay (ascent → trajectory → orbit, all
   drawn straight into #flightCanvas by drawScene/createGL2D) had no manual camera.
   We mirror the Cape's capeZoom model (a CSS transform on an inner element wrapping
   the fitted scene) rather than reusing initCanvasPopZoom: that helper drives a
   fit+drawImage BLIT from an off-screen source canvas, but the flight scene is drawn
   directly into the on-screen canvas, so the blit interface doesn't apply. Interaction
   model is identical to the pop-outs / Cape (drag-pan, wheel-zoom-toward-cursor,
   dblclick-reset). The transform magnifies the whole camera view ON TOP of the slice
   1-2 vehicle-size formulas (VEH_BASE_PX_PER_UNIT / craftSprite caps / ascent clamp) —
   exactly as capeZoom multiplies over the pad's PAD_ROCKET_K sizing — so it never
   touches those base-size calcs. One camera per overlay session: it persists across
   phase transitions (the same canvas is redrawn every frame; drawScene never touches
   the element transform) and is reset only when a fresh flight opens in playMission. */
let flightCam={z:1,x:0,y:0};
function applyFlightZoom(){ const z=$('flightZoom'); if(z) z.style.transform=`translate(${flightCam.x}px,${flightCam.y}px) scale(${flightCam.z})`; }
function flightClampPan(w,h){ flightCam.x=Math.min(0,Math.max(w*(1-flightCam.z),flightCam.x)); flightCam.y=Math.min(0,Math.max(h*(1-flightCam.z),flightCam.y)); }
function resetFlightZoom(){ flightCam={z:1,x:0,y:0}; applyFlightZoom(); }
function initFlightZoom(){
  const wrap=$('flightCanvasWrap'); if(!wrap||wrap._zoomInit) return; wrap._zoomInit=true;
  let drag=false, lx=0, ly=0, moved=0;
  wrap.addEventListener('wheel',e=>{ e.preventDefault(); const r=wrap.getBoundingClientRect(); const cx=e.clientX-r.left, cy=e.clientY-r.top, z0=flightCam.z;
    flightCam.z=Math.min(3,Math.max(1, flightCam.z*(e.deltaY<0?1.12:0.89)));
    flightCam.x=cx-(cx-flightCam.x)*(flightCam.z/z0); flightCam.y=cy-(cy-flightCam.y)*(flightCam.z/z0);
    flightClampPan(r.width,r.height); applyFlightZoom(); },{passive:false});
  wrap.addEventListener('pointerdown',e=>{ if(flightCam.z<=1) return; drag=true; moved=0; lx=e.clientX; ly=e.clientY; try{wrap.setPointerCapture(e.pointerId);}catch(_){}});
  wrap.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy); const r=wrap.getBoundingClientRect(); flightCam.x+=dx; flightCam.y+=dy; flightClampPan(r.width,r.height); applyFlightZoom(); });
  wrap.addEventListener('pointerup',()=>{ drag=false; });
  wrap.addEventListener('pointercancel',()=>{ drag=false; });
  // Swallow the click that follows a real pan (>6px, same threshold as the Cape/pop-out skip
  // guards) in capture phase so it never reaches the canvas' post-flight "Continue ▸" click
  // handler; a genuine tap (no drag) passes through untouched.
  wrap.addEventListener('click',e=>{ if(moved>6){ e.stopPropagation(); e.preventDefault(); moved=0; } }, true);
  wrap.addEventListener('dblclick',()=>{ resetFlightZoom(); });
}
/* ---------- Hybrid Phaser layer (Slice 1): FlightScene ----------
   Hosts the mission flight playback in Phaser. The proven drawScene renderer (its
   2D path) draws each frame onto a Phaser CanvasTexture; Phaser owns the scene and
   loop. Reuses spec/timing/sfx/post-flight/done verbatim. Lazily defined + guarded
   so the headless vm harness still loads. Falls back to the legacy WebGL/RAF path. */
let FlightScene=null, flightGame=null, flightScene=null, flightPending=null;
function flightRefresh(){ if(flightScene && flightScene.tex){ try{ flightScene.tex.refresh(); }catch(e){} } }
function defineFlightScene(){
  if(FlightScene || !phaserOK()) return;
  FlightScene=class extends Phaser.Scene {
    constructor(){ super('flight'); }
    create(){
      this.tex = this.textures.exists('flightTex') ? this.textures.get('flightTex') : this.textures.createCanvas('flightTex',900,520);
      this.add.image(0,0,'flightTex').setOrigin(0,0);
      // "best of Phaser": cinematic postFX over the whole flight — bloom makes the
      // plume / atmosphere limb / Earth / stars / orbital burns glow; vignette frames it.
      // No full-screen bloom (it hazes the whole frame). Keep the rendered scene crisp
      // and just lift overall brightness with a ColorMatrix; the glow lives on the plume.
      this.bloom=null;
      try{
        const fx=this.cameras.main.postFX;
        if(fx){ const cm=fx.addColorMatrix(); if(cm&&cm.brightness){ cm.brightness(1.18); } this.camFX=cm; }
      }catch(e){ console.warn('flight postFX unavailable:',e); }
      // native GPU particle layer (exhaust plume, launch smoke, staging sparks, debris/fireball)
      this.np=false; const self=this; this._plumeAngle=90;
      try{
        const mk=(key,draw,w,h)=>{ if(!this.textures.exists(key)){ const g=this.make.graphics({x:0,y:0,add:false}); draw(g); g.generateTexture(key,w,h); g.destroy(); } };
        mk('fxFlame',g=>{ g.fillStyle(0xffffff,1); g.fillCircle(12,12,12); },24,24);
        mk('fxSmoke',g=>{ g.fillStyle(0xffffff,1); g.fillCircle(16,16,16); },32,32);
        mk('fxChunk',g=>{ g.fillStyle(0xffffff,1); g.fillRect(0,0,6,6); },6,6);
        // angle via onEmit callback so the plume reliably tracks the rocket's pitch each particle
        this.plume=this.add.particles(0,0,'fxFlame',{ lifespan:{min:260,max:520}, speed:{min:70,max:190}, angle:{ onEmit:()=> self._plumeAngle + (Math.random()*16-8) }, scale:{start:0.6,end:0}, alpha:{start:0.95,end:0}, tint:[0xffffff,0xffe48a,0xffa83a,0xff5a22], blendMode:'ADD', frequency:12, quantity:2, emitting:false });
        // Slice 3: a tighter, brighter inner core for a volumetric layered plume (bluish-white shock core)
        this.plumeCore=this.add.particles(0,0,'fxFlame',{ lifespan:{min:150,max:320}, speed:{min:50,max:130}, angle:{ onEmit:()=> self._plumeAngle + (Math.random()*8-4) }, scale:{start:0.42,end:0}, alpha:{start:1,end:0}, tint:[0xffffff,0xe6f0ff,0xbfe0ff], blendMode:'ADD', frequency:10, quantity:2, emitting:false });
        this.smoke=this.add.particles(0,0,'fxSmoke',{ lifespan:{min:700,max:1300}, speed:{min:20,max:70}, angle:{min:60,max:120}, scale:{start:0.3,end:1.5}, alpha:{start:0.35,end:0}, tint:[0xbfc7cf,0x8a949d], frequency:28, quantity:1, emitting:false });
        this.sparks=this.add.particles(0,0,'fxFlame',{ lifespan:{min:300,max:700}, speed:{min:50,max:220}, scale:{start:0.4,end:0}, alpha:{start:1,end:0}, tint:[0xffe07a,0xff9836], blendMode:'ADD', emitting:false });
        this.debris=this.add.particles(0,0,'fxChunk',{ lifespan:{min:900,max:1700}, speed:{min:80,max:300}, gravityY:160, scale:{start:1.1,end:0.3}, alpha:{start:1,end:0}, rotate:{min:0,max:360}, tint:[0x8a6a44,0x554433,0xff7a30], emitting:false });
        this.fireball=this.add.particles(0,0,'fxFlame',{ lifespan:{min:400,max:900}, speed:{min:40,max:200}, scale:{start:1.3,end:0}, alpha:{start:1,end:0}, tint:[0xffffff,0xffd060,0xff5020,0x802000], blendMode:'ADD', emitting:false });
        // glow localized to the exhaust/fireball — bright plume without hazing the scene
        try{ if(this.plume.postFX) this.plume.postFX.addGlow(0xffd49a, 4, 0); }catch(_){}
        try{ if(this.plumeCore && this.plumeCore.postFX) this.plumeCore.postFX.addGlow(0xcfe6ff, 3, 0); }catch(_){}
        try{ if(this.fireball.postFX) this.fireball.postFX.addGlow(0xff7a30, 6, 0); }catch(_){}
        this.np=true;
      }catch(e){ console.warn('flight native particles unavailable:',e); this.np=false; }
      try{ this.buildEarthFX(); }catch(e){ console.warn('flight earth FX unavailable:',e); }
      try{ this.buildAscentFX(); }catch(e){ console.warn('flight ascent FX unavailable:',e); }
      this.playing=false; this.didBoomShake=false; flightScene=this;
      if(flightPending) this.beginFlight();
    }
    // Native orbital-Earth layer (slice 1): a parallax twinkling starfield, an additive
    // glowing atmosphere limb rim, night-side city lights, and a sun glint — composited in
    // front of the existing 2D limb. All additive/bloomed, which plain canvas can't do cheaply.
    buildEarthFX(){
      if(this.efxBuilt || !phaserOK()) return;
      if(!this.textures.exists('fxDot')){ const g=this.make.graphics({x:0,y:0,add:false}); g.fillStyle(0xffffff,1); g.fillCircle(8,8,8); g.generateTexture('fxDot',16,16); g.destroy(); }
      this.stars=[];
      for(let i=0;i<120;i++){
        const st=this.add.image(Math.random()*900, Math.random()*300, 'fxDot').setBlendMode('ADD').setDepth(1).setVisible(false);
        st.setScale(0.04+Math.random()*0.10);
        st.baseA=0.25+Math.random()*0.6; st.tw=Math.random()*6.28; st.twS=0.5+Math.random()*1.6; st.par=0.15+Math.random()*0.7;
        this.stars.push(st);
      }
      this.cityPts=[]; for(let i=0;i<90;i++){ this.cityPts.push({a:-Math.PI/2+(Math.random()-0.5)*1.05, rf:1-(0.003+Math.random()*0.02), br:0.25+Math.random()*0.55, sz:0.6+Math.random()*1.1}); }
      this.atmoG=this.add.graphics().setDepth(2).setVisible(false);
      try{ if(this.atmoG.postFX) this.atmoG.postFX.addGlow(0x7fc7ff, 6, 0); }catch(_){}
      this.cityG=this.add.graphics().setDepth(2).setVisible(false);
      try{ if(this.cityG.postFX) this.cityG.postFX.addGlow(0xffd07a, 4, 0); }catch(_){}
      this.glint=this.add.image(0,0,'fxDot').setBlendMode('ADD').setDepth(3).setVisible(false).setTint(0xfff4d0);
      this.efxBuilt=true;
    }
    updateEarthFX(A,time){
      if(!this.efxBuilt) return;
      const on=!!A.earthPhase && !!A.earthGeom;
      // Slice 2: stars also fade in during high-altitude ascent (the sky going black)
      const ascentStars = !!A.ascentPhase && (A.altN||0)>0.45;
      const showStars = !!A.earthPhase || ascentStars;
      const ascA = ascentStars && !A.earthPhase ? clampA(((A.altN||0)-0.45)/0.45,0,1) : 1;
      for(const st of this.stars){ if(!showStars){ if(st.visible) st.setVisible(false); continue; }
        if(!st.visible) st.setVisible(true);
        st.tw+=0.016*st.twS; st.setAlpha(st.baseA*(0.5+0.5*Math.sin(st.tw))*ascA);
        st.x-=0.02*st.par; if(st.x<-4) st.x=904; }
      if(!on){ this.atmoG.setVisible(false); this.cityG.setVisible(false); this.glint.setVisible(false); return; }
      const {cx,cy,r,sunA}=A.earthGeom, sx=Math.cos(sunA), sy=Math.sin(sunA);
      const ag=this.atmoG; ag.setVisible(true); ag.clear();
      ag.lineStyle(7,0x8fd0ff,0.55);  ag.beginPath(); ag.arc(cx,cy,r+3, Math.PI*1.15, Math.PI*1.85); ag.strokePath();
      ag.lineStyle(16,0x4fa6e8,0.20);  ag.beginPath(); ag.arc(cx,cy,r+12,Math.PI*1.12, Math.PI*1.88); ag.strokePath();
      ag.lineStyle(32,0x2f7bd0,0.10);  ag.beginPath(); ag.arc(cx,cy,r+30,Math.PI*1.10, Math.PI*1.90); ag.strokePath();
      const cg=this.cityG; cg.setVisible(true); cg.clear();
      for(const p of this.cityPts){ const dx=Math.cos(p.a), dy=Math.sin(p.a); const lit=dx*sx+dy*sy;
        if(lit>-0.04) continue; // night side only
        const rr=r*p.rf, px=cx+dx*rr, py=cy+dy*rr; if(py<-2||py>522) continue;
        cg.fillStyle(0xffd890, p.br); cg.fillCircle(px,py,p.sz); }
      const ga=-Math.PI/2 + Math.max(-1,Math.min(1,sx))*0.5, litAt=Math.cos(ga)*sx+Math.sin(ga)*sy;
      if(litAt>0.08){ this.glint.setVisible(true).setPosition(cx+Math.cos(ga)*(r-6), cy+Math.sin(ga)*(r-6)).setScale(1.5+0.5*Math.sin(time*0.005)).setAlpha(0.45); }
      else this.glint.setVisible(false);
    }
    // Slice 2: native ascent atmosphere — parallax cloud decks the rocket climbs through,
    // a max-Q vapor cone on the vehicle, and an additive horizon-scattering glow. All
    // composited over the 2D scene, feature-guarded, and shown only during the ascent phase.
    buildAscentFX(){
      if(this.afxBuilt || !phaserOK()) return;
      if(!this.textures.exists('fxCloud')){ const g=this.make.graphics({x:0,y:0,add:false}); for(let i=8;i>=1;i--){ g.fillStyle(0xffffff,0.05); g.fillCircle(32,32,i*4); } g.generateTexture('fxCloud',64,64); g.destroy(); }
      this.clouds=[];
      for(let i=0;i<12;i++){ const c=this.add.image(0,0,'fxCloud').setDepth(6).setVisible(false);
        c.px=Math.random(); c.spd=0.04+Math.random()*0.10; c.phase=Math.random(); c.baseA=0.22+Math.random()*0.34; c.sclMin=1.1+Math.random()*1.1; c.warm=Math.random()<0.5;
        this.clouds.push(c); }
      this.vapor=this.add.image(0,0,'fxCloud').setDepth(5).setVisible(false).setBlendMode('ADD').setTint(0xcfe6ff);
      // Slice 3: Mach (shock) diamonds — a row of bright nodes in the exhaust during atmospheric supersonic flight
      this.machD=[];
      for(let i=0;i<6;i++){ const d=this.add.image(0,0,'fxFlame').setDepth(5).setBlendMode('ADD').setVisible(false).setTint(0xfff0c0); this.machD.push(d); }
      this.afxBuilt=true;
    }
    updateAscentFX(A,time){
      if(!this.afxBuilt) return;
      const active = !!A.ascentPhase && !A.exploding;
      const altN = A.altN||0;
      // clouds ramp in just off the pad and thin out by the mid-stratosphere
      const cloudBand = active ? clampA(altN/0.06,0,1) * clampA(1-(altN-0.06)/0.5,0,1) : 0;
      for(const c of this.clouds){
        if(cloudBand<=0.02){ if(c.visible) c.setVisible(false); continue; }
        if(!c.visible) c.setVisible(true);
        const ph=((time*c.spd*0.004)+c.phase)%1;           // 0..1 stream progress (a few seconds per pass)
        c.setPosition(c.px*900 + Math.sin(time*0.0003+c.phase*6)*22, -60 + ph*640);
        c.setScale(c.sclMin*(0.6+ph*1.2));                  // grow as it sweeps down past the camera
        c.setAlpha(c.baseA*cloudBand);
        c.setTint(c.warm?0xeef2f6:0xdfe8f2);
      }
      // max-Q vapor cone hugging the vehicle through the transonic window
      const q=A.qNorm||0;
      if(active && q>0.15 && A.rocketX!=null){
        if(!this.vapor.visible) this.vapor.setVisible(true);
        this.vapor.setPosition(A.rocketX, A.rocketY-10).setScale(1.1+q*1.3, 0.7+q*0.7).setAlpha(clampA(q*0.5,0,0.5));
      } else if(this.vapor.visible) this.vapor.setVisible(false);
      // Mach (shock) diamonds along the exhaust during atmospheric supersonic flight; gone in vacuum
      const aP=A.ascentP||0;
      const showMach = active && this._plumeOn && A.rocketX!=null && altN<0.5 && aP>0.06 && aP<0.55;
      if(this.machD){
        if(showMach){
          const ang=(this._plumeAngle||90)*Math.PI/180, dx=Math.cos(ang), dy=Math.sin(ang);
          const fade=clampA(1-altN/0.5,0,1)*clampA((aP-0.06)/0.06,0,1);
          for(let i=0;i<this.machD.length;i++){ const d=this.machD[i], dist=10+i*7, pulse=0.6+0.4*Math.sin(time*0.02+i);
            d.setVisible(true).setPosition(A.rocketX+dx*dist, A.rocketY+dy*dist).setScale((0.5-i*0.06)*pulse).setAlpha(fade*(0.9-i*0.12)); }
        } else { for(const d of this.machD) if(d.visible) d.setVisible(false); }
      }
    }
    beginFlight(){
      if(!flightPending) return;
      const {spec,done}=flightPending; flightPending=null;
      setupFlightState(spec, done, this.tex.context, this.tex.canvas, (flightGame&&flightGame.canvas)||this.tex.canvas);
      animState.fxNative=!!this.np; // suppress the 2D plume/trail/flame only if native particles are live
      animState.nativeStars=!!this.efxBuilt; // native parallax starfield replaces the canvas stars in the orbit phase
      this.didBoomShake=false; this._lastDropped=0; this._didDebris=false;
      try{ if(this.scene && !this.scene.isActive()) this.scene.wake(); }catch(e){} // E0.5-A: defensive — an inactive (now slept, not paused) flight scene won't drive particles; wake() un-sleeps AND un-pauses
      // reset the exhaust emitters to a known-stopped state each flight so the plume reliably
      // re-emits on repeat launches (a prior failure/explosion can leave .emitting stale)
      this._plumeOn=false; this._smokeOn=false;
      if(this.np){ try{ this.plume.stop(); this.smoke.stop(); if(this.plumeCore) this.plumeCore.stop(); }catch(e){} }
      this.playing=true;
      try{ this.cameras.main.setZoom(1); }catch(e){} // ensure no leftover zoom from a prior flight
      try{ this.cameras.main.shake(1000, 0.006); }catch(e){} // liftoff rumble
    }
    aimPlume(pitch){ // exhaust fires straight out the nozzle, along the rocket's axis
      this._plumeAngle = Math.atan2(Math.cos(pitch||0), -Math.sin(pitch||0))*180/Math.PI; // 90° = down when pitch 0
    }
    driveParticles(A){
      const ascent=A.phase==='ascent', haveXY=A.rocketX!=null;
      const fire = ascent && !A.exploding && haveXY && (A.ascentP==null || A.ascentP<0.96);
      if(fire){ this.aimPlume(A.pitch);
        const bloom=1+(A.altFrac||0)*1.2;   // Slice 3: vacuum plume blooms wider/longer with altitude
        this.plume.setPosition(A.rocketX, A.rocketY); try{ this.plume.setScale(bloom); }catch(_){}
        if(this.plumeCore){ this.plumeCore.setPosition(A.rocketX, A.rocketY); try{ this.plumeCore.setScale(1+(A.altFrac||0)*0.6); }catch(_){} }
        if(!this._plumeOn){ this.plume.start(); if(this.plumeCore) this.plumeCore.start(); this._plumeOn=true; } }
      else if(this._plumeOn){ this.plume.stop(); if(this.plumeCore) this.plumeCore.stop(); this._plumeOn=false; }
      if(ascent && !A.exploding && haveXY && A.ascentP!=null && A.ascentP<0.14){ this.smoke.setPosition(A.rocketX, A.rocketY+4); if(!this._smokeOn){ this.smoke.start(); this._smokeOn=true; } }
      else if(this._smokeOn){ this.smoke.stop(); this._smokeOn=false; }
      if(A.dropped!=null && A.dropped>this._lastDropped){ this._lastDropped=A.dropped;
        if(haveXY){ this.sparks.explode(40, A.rocketX, A.rocketY); this.fireball.explode(8, A.rocketX, A.rocketY); if(this.debris) this.debris.explode(6, A.rocketX, A.rocketY); } // Slice 3: punchier stage separation
        try{ this.cameras.main.shake(180, 0.006); }catch(_){}
      }
      if(A.exploding && !this._didDebris){ this._didDebris=true; if(this._plumeOn){ this.plume.stop(); if(this.plumeCore) this.plumeCore.stop(); this._plumeOn=false; } if(this._smokeOn){ this.smoke.stop(); this._smokeOn=false; }
        if(haveXY){ this.debris.explode(46, A.rocketX, A.rocketY-12); this.fireball.explode(34, A.rocketX, A.rocketY-14); } }
    }
    update(time,delta){
      if(!this.playing) return;
      const A=animState; if(!A||A.held){ this.playing=false; if(this.np){ if(this._plumeOn){ this.plume.stop(); if(this.plumeCore) this.plumeCore.stop(); this._plumeOn=false; } if(this._smokeOn){ this.smoke.stop(); this._smokeOn=false; } } return; }
      A.virtT += (delta||16)*animSpeed();
      const t=A.virtT;
      try{ drawScene(t); this.tex.refresh(); }catch(e){ console.error('flight anim error:',e); this.playing=false; endAnim(); return; }
      if(this.np){ try{ this.driveParticles(A); }catch(e){} }
      try{ this.updateEarthFX(A,t); }catch(e){}
      try{ this.updateAscentFX(A,t); }catch(e){}
      // dynamic bloom: punch up engine glow during powered ascent, ease off in coast/orbit
      if(this.bloom){ const want = (A.ascentP!=null && A.ascentP<0.95 && t<A.ascentDur) ? 1.0 : 0.7; this.bloom.strength += (want-this.bloom.strength)*0.05; }
      if(A.exploding && !this.didBoomShake){ this.didBoomShake=true; try{ this.cameras.main.shake(700, 0.022); }catch(e){} } // vehicle-loss kick
      if(t>=A.totalDur){ this.playing=false; if(this.np){ if(this._plumeOn){ this.plume.stop(); if(this.plumeCore) this.plumeCore.stop(); this._plumeOn=false; } if(this._smokeOn){ this.smoke.stop(); this._smokeOn=false; } } endAnim(true); }
    }
  };
}
function ensureFlightHost(){
  const host=$('flightHost'); if(!host) return false;
  host.style.display='block';
  const c1=$('flightCanvas'), c2=$('flightTextCanvas');
  if(c1) c1.style.display='none'; if(c2) c2.style.display='none';
  return true;
}
function startFlightScene(spec, done){
  defineFlightScene();
  if(!ensureFlightHost()) return false;
  try{
    flightPending={spec,done}; // create()'s tail (and beginFlight) consume this
    if(!flightGame){
      flightGame=new Phaser.Game({ type:Phaser.AUTO, parent:'flightHost', width:900, height:520,
        backgroundColor:'#04060a', banner:false, audio:{noAudio:true}, scale:{mode:Phaser.Scale.NONE}, scene:[FlightScene] });
      const cv=flightGame.canvas; if(cv){ cv.style.maxWidth='100%'; cv.style.height='auto'; cv.style.display='block'; }
      // first boot: create() runs and starts the flight from flightPending
    } else if(flightScene){
      // Reuse bug fix: rebuild the scene fresh each launch so ALL native FX (plume, smoke,
      // clouds, vapor, starfield) are recreated — reusing one scene across flights left
      // them in a dead state after a prior flight/explosion (no plume + no atmosphere on
      // the 2nd launch). Generated textures are cached (exists() guards), so this is cheap.
      // create()'s tail calls beginFlight() since flightPending is set.
      // E0.5-A: a prior flight now leaves this scene SLEEPING (sleepFlightScene). Wake it first so
      // restart() operates on a RUNNING scene — the known-good path this rebuild has always used —
      // rather than relying on restart's stop/start handling a sleeping scene. No-op if awake.
      try{ if(flightScene.scene.isSleeping()) flightScene.scene.wake(); }catch(e){}
      flightScene.scene.restart();
    }
    // (game exists but scene not yet booted → create() will pick up flightPending)
    return true;
  }catch(e){
    console.warn('flight scene failed, using fallback:',e);
    const h=$('flightHost'); if(h) h.style.display='none';
    const c1=$('flightCanvas'), c2=$('flightTextCanvas'); if(c1) c1.style.display=''; if(c2) c2.style.display='';
    return false;
  }
}
function sfxCleanupClickHandler(A){ if(A&&A.clickHandler){ const vc=A.viewCanvas||A.cv; if(vc) vc.removeEventListener('click',A.clickHandler); A.clickHandler=null; } }
function dismissAnim(){ const A=animState; if(!A) return; sfxStop(); sfxCleanupClickHandler(A); const done=A.done; animState=null; $('animOverlay').classList.add('hidden'); sleepFlightScene(); if(done) done(); }
function skipAnim(){ const A=animState; if(A&&A.held){ dismissAnim(); return; } if(!A) return; cancelAnimationFrame(A.raf); sfxStop(); sfxCleanupClickHandler(A); animState=null; $('animOverlay').classList.add('hidden'); sleepFlightScene(); if(A.done) A.done(); }
function drawPostFlight(){
  const A=animState; if(!A) return;
  const ctx=A.ctx,W=A.cv.width,H=A.cv.height,s=A.spec;
  if(ctx.clearFrame) ctx.clearFrame();
  const fd=A.flightData||{};
  ctx.fillStyle='#04060a'; ctx.fillRect(0,0,W,H);
  drawStars(ctx,W,H,performance.now());
  const eCx=W*0.42, eCy=H*1.55, eR=H*1.2;
  const eGrad=ctx.createRadialGradient(eCx-eR*0.1,eCy-eR*0.15,eR*0.3,eCx,eCy,eR);
  eGrad.addColorStop(0,'#3a8cc7'); eGrad.addColorStop(0.5,'#2a6aaa'); eGrad.addColorStop(0.8,'#1a4a80'); eGrad.addColorStop(1,'#0e2840');
  ctx.fillStyle=eGrad; ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.clip();
  ctx.fillStyle='rgba(2,5,15,0.45)'; ctx.beginPath(); ctx.arc(eCx+eR*0.4,eCy-eR*0.1,eR*1.05,0,7); ctx.fill();
  ctx.fillStyle='rgba(60,120,60,0.2)';
  ctx.beginPath(); ctx.ellipse(eCx-eR*0.15,eCy-eR*0.02,eR*0.12,eR*0.06,0.2,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(eCx+eR*0.08,eCy-eR*0.04,eR*0.08,eR*0.04,-0.1,0,7); ctx.fill();
  ctx.restore();
  for(let i=0;i<3;i++){
    ctx.strokeStyle=`rgba(100,180,255,${0.2-i*0.06})`; ctx.lineWidth=2.5-i*0.6;
    ctx.beginPath(); ctx.arc(eCx,eCy,eR+3+i*5,0,7); ctx.stroke();
  }
  const pe=fd.pe||172, ap=fd.ap||192, orbAlt=fd.orbAlt||180;
  const orbR=eR+55;
  const peR=orbR-4, apR=orbR+4;
  ctx.strokeStyle=themeRgba('readout',0.12); ctx.setLineDash([3,5]); ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.arc(eCx,eCy,peR,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
  ctx.beginPath(); ctx.arc(eCx,eCy,apR,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle=themeRgba('readout',0.25); ctx.setLineDash([4,6]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(eCx,eCy,orbR,Math.PI*1.05,Math.PI*1.95); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(eCx,eCy,orbR,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
  const craftA=Math.PI*1.55;
  const craftPx=eCx+Math.cos(craftA)*orbR, craftPy=eCy+Math.sin(craftA)*orbR;
  ctx.fillStyle=themeColor('ignite'); ctx.beginPath(); ctx.arc(craftPx,craftPy,5,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,166,35,0.4)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(craftPx,craftPy,10,0,7); ctx.stroke();
  const proA=craftA-Math.PI/2;
  ctx.save(); ctx.translate(craftPx+Math.cos(proA)*14,craftPy+Math.sin(proA)*14); ctx.rotate(proA-Math.PI/2);
  ctx.fillStyle=themeRgba('readout',0.7); ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.closePath(); ctx.fill();
  ctx.restore();
  const peA=Math.PI*1.12, apA=Math.PI*1.88;
  const peX=eCx+Math.cos(peA)*(peR-3), peY=eCy+Math.sin(peA)*(peR-3);
  const apX=eCx+Math.cos(apA)*(apR+3), apY=eCy+Math.sin(apA)*(apR+3);
  ctx.font='9px ui-monospace,monospace'; ctx.fillStyle=themeRgba('readout',0.6); ctx.textAlign='center';
  ctx.fillText('PE '+pe+' km',peX,peY-12);
  ctx.fillText('AP '+ap+' km',apX,apY-12);
  ctx.fillStyle=themeRgba('readout',0.5); ctx.beginPath(); ctx.arc(peX,peY,2.5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(apX,apY,2.5,0,7); ctx.fill();
  const launchA=Math.PI*1.08;
  const lx=eCx+Math.cos(launchA)*(eR+2), ly=eCy+Math.sin(launchA)*(eR+2);
  ctx.fillStyle='rgba(88,196,122,0.6)'; ctx.beginPath(); ctx.arc(lx,ly,2.5,0,7); ctx.fill();
  ctx.font='8px ui-monospace,monospace'; ctx.fillStyle='rgba(88,196,122,0.5)'; ctx.textAlign='left';
  ctx.fillText('LAUNCH',lx+6,ly-3);
  ctx.save();
  const panelW=220, panelH=s.crewed?190:170, panelX=14, panelY=14;
  ctx.fillStyle=themeRgba('bg',0.85); ctx.fillRect(panelX,panelY,panelW,panelH);
  ctx.strokeStyle=themeRgba('readout',0.3); ctx.lineWidth=0.5; ctx.strokeRect(panelX,panelY,panelW,panelH);
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillStyle=themeColor('ok'); ctx.font='bold 14px ui-monospace,monospace';
  ctx.fillText(s.isCislunar?'MISSION COMPLETE':'ORBIT ACHIEVED',panelX+12,panelY+10);
  ctx.fillStyle=themeColor('ink'); ctx.font='12px ui-monospace,monospace';
  ctx.fillText(s.title,panelX+12,panelY+30);
  if(s.crewed){ ctx.fillStyle=themeColor('ignite'); ctx.font='10px ui-monospace,monospace'; ctx.fillText('▲ CREWED FLIGHT',panelX+12,panelY+48); }
  const dataY=panelY+(s.crewed?66:50);
  ctx.font='10px ui-monospace,monospace';
  const rows=[
    ['ORBIT', pe+' × '+ap+' km'],
    ['PERIOD', (fd.period||88)+' min'],
    ['VEL', (fd.orbVel||7700).toLocaleString()+' m/s'],
    ['INC', '28.5°'],
  ];
  if(fd.drangeKm) rows.push(['DRANGE', (fd.orbDrange||fd.drangeKm)+' km']);
  if(fd.stages) rows.push(['STAGES', (fd.dropped!==undefined?fd.dropped+1:fd.stages)+'/'+fd.stages+' used']);
  if(fd.maxQ) rows.push(['MAX-Q', fd.maxQ+' kPa']);
  rows.forEach((r,i)=>{
    const ry=dataY+i*16;
    ctx.fillStyle=themeColor('dim'); ctx.fillText(r[0],panelX+12,ry);
    ctx.fillStyle=themeColor('ink'); ctx.textAlign='right'; ctx.fillText(r[1],panelX+panelW-12,ry);
    ctx.textAlign='left';
  });
  ctx.restore();
  const mmX=W-170, mmY=14, mmW=155, mmH=160;
  ctx.save();
  ctx.fillStyle=themeRgba('bg',0.85); ctx.fillRect(mmX-4,mmY-4,mmW+8,mmH+8);
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.lineWidth=0.5; ctx.strokeRect(mmX-4,mmY-4,mmW+8,mmH+8);
  ctx.beginPath(); ctx.rect(mmX,mmY,mmW,mmH); ctx.clip();
  const meR=40, meCx=mmX+mmW*0.4, meCy=mmY+mmH*0.5;
  const meGrad=ctx.createRadialGradient(meCx-5,meCy-5,5,meCx,meCy,meR);
  meGrad.addColorStop(0,'#3a8cc7'); meGrad.addColorStop(0.6,'#1a4a80'); meGrad.addColorStop(1,'#0e2840');
  ctx.fillStyle=meGrad; ctx.beginPath(); ctx.arc(meCx,meCy,meR,0,7); ctx.fill();
  ctx.strokeStyle='rgba(100,180,255,0.2)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.arc(meCx,meCy,meR+2,0,7); ctx.stroke();
  const moR=meR+14;
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(meCx,meCy,moR,0,7); ctx.stroke();
  const mCraftA=-Math.PI*0.35;
  const mcx=meCx+Math.cos(mCraftA)*moR, mcy=meCy+Math.sin(mCraftA)*moR;
  ctx.fillStyle=themeColor('ignite'); ctx.beginPath(); ctx.arc(mcx,mcy,3,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,166,35,0.3)'; ctx.lineWidth=0.5; ctx.beginPath(); ctx.arc(mcx,mcy,6,0,7); ctx.stroke();
  const mPeA=Math.PI*0.5, mApA=-Math.PI*0.5;
  const mpx=meCx+Math.cos(mPeA)*(moR-3), mpy=meCy+Math.sin(mPeA)*(moR-3);
  const max2=meCx+Math.cos(mApA)*(moR+3), may=meCy+Math.sin(mApA)*(moR+3);
  ctx.fillStyle=themeRgba('readout',0.5); ctx.beginPath(); ctx.arc(mpx,mpy,1.5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(max2,may,1.5,0,7); ctx.fill();
  ctx.font='7px ui-monospace,monospace'; ctx.textAlign='center';
  ctx.fillStyle=themeRgba('readout',0.5);
  ctx.fillText('PE',mpx,mpy+8); ctx.fillText('AP',max2,may-5);
  const mlA=Math.PI*0.6;
  const mlx=meCx+Math.cos(mlA)*(meR+1), mly=meCy+Math.sin(mlA)*(meR+1);
  ctx.fillStyle='rgba(88,196,122,0.5)'; ctx.beginPath(); ctx.arc(mlx,mly,1.5,0,7); ctx.fill();
  ctx.fillStyle='rgba(88,196,122,0.4)'; ctx.textAlign='left'; ctx.fillText('PAD',mlx+4,mly-2);
  if(fd.curAlt){
    ctx.font='7px ui-monospace,monospace'; ctx.fillStyle='rgba(200,210,220,0.35)';
    ctx.textAlign='left'; ctx.fillText('ASCENT PROFILE',mmX+3,mmY+6);
    ctx.fillStyle='rgba(200,210,220,0.3)'; ctx.font='6px ui-monospace,monospace';
    ctx.fillText('MECO ALT: '+fd.curAlt+' km',mmX+3,mmH+mmY-22);
    ctx.fillText('MECO VEL: '+fd.finalVel+' m/s',mmX+3,mmH+mmY-14);
    ctx.fillText('DRANGE: '+(fd.orbDrange||fd.drangeKm)+' km',mmX+3,mmH+mmY-6);
  } else {
    ctx.font='7px ui-monospace,monospace'; ctx.fillStyle='rgba(200,210,220,0.35)'; ctx.textAlign='left';
    ctx.fillText('ORBITAL MAP',mmX+3,mmY+6);
  }
  ctx.restore();
  ctx.textAlign='left';
  drawFlightContinueBtn(ctx,W,H);
}
// The shared "Continue ▸" affordance for a held flight overlay: the rounded button, the [Enter]
// hint, the hit-box on animState, and the one-shot canvas click handler that dismisses the overlay.
// Extracted from drawPostFlight (Slice A's orbit/mission-complete card) so Slice B's cruise-begins
// card reuses the identical button + dismissal wiring instead of duplicating it.
function drawFlightContinueBtn(ctx,W,H){
  const A=animState; if(!A) return;
  const btnW=140, btnH=34, btnX=(W-btnW)/2, btnY=H-52;
  const br=6;
  ctx.beginPath(); ctx.moveTo(btnX+br,btnY); ctx.lineTo(btnX+btnW-br,btnY);
  ctx.quadraticCurveTo(btnX+btnW,btnY,btnX+btnW,btnY+br); ctx.lineTo(btnX+btnW,btnY+btnH-br);
  ctx.quadraticCurveTo(btnX+btnW,btnY+btnH,btnX+btnW-br,btnY+btnH); ctx.lineTo(btnX+br,btnY+btnH);
  ctx.quadraticCurveTo(btnX,btnY+btnH,btnX,btnY+btnH-br); ctx.lineTo(btnX,btnY+br);
  ctx.quadraticCurveTo(btnX,btnY,btnX+br,btnY); ctx.closePath();
  ctx.fillStyle=themeRgba('readout',0.12); ctx.fill();
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=themeColor('readout'); ctx.font='bold 13px ui-monospace,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Continue ▸',W/2,btnY+btnH/2);
  ctx.font='9px ui-monospace,monospace'; ctx.fillStyle=themeRgba('ink',0.4);
  ctx.fillText('[Enter]',W/2,btnY+btnH+14);
  ctx.textAlign='left';
  A.continueBtn={x:btnX,y:btnY,w:btnW,h:btnH};
  if(!A.clickHandler){
    const vc=A.viewCanvas||A.cv; // the on-screen canvas (Phaser canvas in the hosted path)
    A.clickHandler=function(ev){
      const rect=vc.getBoundingClientRect();
      const sx=(ev.clientX-rect.left)*(vc.width/rect.width);
      const sy=(ev.clientY-rect.top)*(vc.height/rect.height);
      if(A.continueBtn && sx>=A.continueBtn.x && sx<=A.continueBtn.x+A.continueBtn.w && sy>=A.continueBtn.y && sy<=A.continueBtn.y+A.continueBtn.h){
        vc.removeEventListener('click',A.clickHandler);
        dismissAnim();
      }
    };
    vc.addEventListener('click',A.clickHandler);
  }
}
// E1.2 slice C: a generic in-overlay decision panel — dims the frozen backdrop frame and draws a
// mission-control console box (title + body lines + 1-3 stacked buttons), reusing
// drawFlightContinueBtn's rounded-rect + hit-test + one-shot click-handler idiom, generalized to N
// buttons. Callers (showLiveCallModal etc.) build a {title,color,lines,buttons:[{label,action,ghost}]}
// spec; this only draws + wires clicks, it doesn't know what any button means.
function drawDecisionPanel(spec){
  const A=animState; if(!A) return;
  const ctx=A.ctx, W=A.cv.width, H=A.cv.height;
  ctx.fillStyle=themeRgba('bg',0.55); ctx.fillRect(0,0,W,H);
  const lineH=15, btnH=30, btnGap=8;
  const boxW=Math.min(420,W*0.86);
  const boxH=64+spec.lines.length*lineH+spec.buttons.length*(btnH+btnGap);
  const boxX=(W-boxW)/2, boxY=Math.max(10,(H-boxH)/2), br=8;
  ctx.beginPath(); ctx.moveTo(boxX+br,boxY); ctx.lineTo(boxX+boxW-br,boxY);
  ctx.quadraticCurveTo(boxX+boxW,boxY,boxX+boxW,boxY+br); ctx.lineTo(boxX+boxW,boxY+boxH-br);
  ctx.quadraticCurveTo(boxX+boxW,boxY+boxH,boxX+boxW-br,boxY+boxH); ctx.lineTo(boxX+br,boxY+boxH);
  ctx.quadraticCurveTo(boxX,boxY+boxH,boxX,boxY+boxH-br); ctx.lineTo(boxX,boxY+br);
  ctx.quadraticCurveTo(boxX,boxY,boxX+br,boxY); ctx.closePath();
  ctx.fillStyle=themeRgba('panel2',0.97); ctx.fill();
  ctx.strokeStyle=spec.color||themeColor('warn'); ctx.lineWidth=1.5; ctx.stroke();
  ctx.textAlign='center';
  let ty=boxY+24;
  ctx.fillStyle=spec.color||themeColor('warn'); ctx.font='bold 13px ui-monospace,monospace';
  ctx.fillText(spec.title, W/2, ty);
  ctx.font='11px ui-monospace,monospace'; ctx.fillStyle=themeRgba('ink',0.85);
  for(const line of spec.lines){ ty+=lineH; ctx.fillText(line, W/2, ty); }
  ty+=btnGap+6;
  const btnW=Math.min(340,boxW-40), btnX=(W-btnW)/2;
  A.decisionButtons=[];
  for(const b of spec.buttons){
    const bx=btnX, by=ty, br2=6;
    ctx.beginPath(); ctx.moveTo(bx+br2,by); ctx.lineTo(bx+btnW-br2,by);
    ctx.quadraticCurveTo(bx+btnW,by,bx+btnW,by+br2); ctx.lineTo(bx+btnW,by+btnH-br2);
    ctx.quadraticCurveTo(bx+btnW,by+btnH,bx+btnW-br2,by+btnH); ctx.lineTo(bx+br2,by+btnH);
    ctx.quadraticCurveTo(bx,by+btnH,bx,by+btnH-br2); ctx.lineTo(bx,by+br2);
    ctx.quadraticCurveTo(bx,by,bx+br2,by); ctx.closePath();
    ctx.fillStyle=b.ghost?'rgba(255,255,255,0.04)':themeRgba('readout',0.14); ctx.fill();
    ctx.strokeStyle=b.ghost?themeRgba('ink',0.35):themeColor('readout'); ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=b.ghost?themeRgba('ink',0.8):themeColor('readout'); ctx.font='bold 12px ui-monospace,monospace';
    ctx.fillText(b.label, W/2, by+btnH/2+4);
    A.decisionButtons.push({x:bx,y:by,w:btnW,h:btnH,action:b.action});
    ty+=btnH+btnGap;
  }
  ctx.textAlign='left';
  wireDecisionClicks();
}
function wireDecisionClicks(){
  const A=animState; if(!A) return;
  const vc=A.viewCanvas||A.cv;
  if(A.decisionClickHandler) vc.removeEventListener('click',A.decisionClickHandler);
  A.decisionClickHandler=function(ev){
    const rect=vc.getBoundingClientRect();
    const sx=(ev.clientX-rect.left)*(vc.width/rect.width);
    const sy=(ev.clientY-rect.top)*(vc.height/rect.height);
    for(const b of (A.decisionButtons||[])){
      if(sx>=b.x && sx<=b.x+b.w && sy>=b.y && sy<=b.y+b.h){
        vc.removeEventListener('click',A.decisionClickHandler);
        A.decisionClickHandler=null; A.decisionButtons=null;
        b.action();
        return;
      }
    }
  };
  vc.addEventListener('click',A.decisionClickHandler);
}
// E1.2 slice C: opens the flight overlay EARLY (before the outcome is even resolved into a final
// spec) so a pending live-flight decision (live call, reserve call, weather go/no-go, rescue) can be
// shown IN the scene at its own natural moment, instead of a page-level modal appearing before the
// overlay opens at all. Builds a placeholder spec (everything the pad phase actually draws —
// stages/boosters/rng — none of which depend on the outcome); `resumeFlightForDecision` patches in
// the real outcome once every decision on this flight has resolved. `decision` is
// `{holdAt:'pad-start'|'pad-end'|'cislunar-start', buildPanel(){ return {title,color,lines,buttons}; }}`
// (holdAt defaults to 'pad-end' if omitted — see drawScene's checks).
// REUSE: a flight can hit more than one decision (e.g. weather, then a live call once outcome is
// known) — if the overlay is already open for this same flight attempt, just arm the new decision
// and let the animation play forward to ITS own hold point (drawScene re-checks every frame).
function openFlightForDecision(ctx, decision){
  if(animState){
    animState.pendingDecision=decision;
    animState.held=false; animState.prevWall=performance.now();
    animLoop();
    return;
  }
  const m=ctx.m, rnd=()=>Math.random();
  const spec={ title:m.name, crewed:ctx.crewed, success:true, failPhase:null,
    stages: state.stages.map(s=>({prop:s.prop,count:s.count,dia:s.dia})),
    boosters: boosterSpec(),
    transferProp: (m.profile&&m.modules&&m.modules.includes('transfer'))?state.transfer.prop:0,
    recovering:false, hasCapsule: !!(state.research.crew_capsule || ctx.crewed),
    isCislunar: !!m.profile, isOrbital: (!m.profile && m.reqDv>=9000), reqDv: m.reqDv||9400,
    rng: { wind:(rnd()-0.5)*0.9, windFreq:1.4+rnd()*1.6, windPhase:rnd()*6.283,
           pitchJitter:(rnd()-0.5)*0.16, sep:state.stages.map(()=>(rnd()-0.5)*0.06),
           apogee:0.86+rnd()*0.28, bow:(rnd()-0.5)*0.9 } };
  // Threaded through spec (not set on animState after the fact) because playMission calls animLoop
  // SYNCHRONOUSLY once — setting pendingDecision afterward would miss the very first frame's hold
  // check. setupFlightState copies this onto the animState it builds, before that first frame runs.
  spec._pendingDecisionSeed=decision;
  _liftoffArmed=false;
  playMission(spec, ()=>{}); // no-op done — the real finish() is wired in by resumeFlightForDecision
  if(animState) animState._openedForDecision=true;
}
// The other half of openFlightForDecision: called from finalizeLaunch once every decision on this
// flight has resolved and the real outcome-dependent spec fields are known. Patches them into the
// SAME spec object (keeps stages/boosters/rng/title intact — the visual trajectory already rolled
// stays continuous), recomputes the outcome-dependent derived animState fields (reentryDur/totalDur)
// exactly as setupFlightState does — they were placeholder values built for a fake success — then
// un-holds and resumes the SAME animation loop. Guards on `_openedForDecision` (set once at first
// open, NOT `pendingDecision`, which is null here — every decision already resolved is exactly the
// case this function handles). Returns false (caller should fall back to a fresh playMission) if
// there's no such animState to resume, e.g. the overlay was somehow closed underneath it.
function resumeFlightForDecision(finalSpec, finish){
  const A=animState; if(!A || !A._openedForDecision) return false;
  Object.assign(A.spec, finalSpec);
  const reentryDur=flightHasReentry(A.spec)?6400:0;
  const departMode=A.spec.mode==='depart';
  let totalDur;
  if(departMode) totalDur=A.ascentDur+DEPART_CARD_MS;
  else if(!A.spec.success && A.spec.failPhase==='ascent') totalDur=A.ascentDur*0.55+2000;
  else if(!A.spec.success && A.spec.failPhase==='deep') totalDur=A.ascentDur+A.cruiseDur*0.42+2000;
  // #73 Slice 3: keep the dock-card tail when a delivery hit an in-flight decision (reserve/rescue) and is
  // resumed here — spec.dock rode in via the Object.assign above, so totalDur must include it as setupFlightState does.
  else totalDur=A.ascentDur+A.cruiseDur+reentryDur+(A.spec.dock?DOCK_CARD_MS:1200);
  totalDur+=A.padDur;
  A.reentryDur=reentryDur; A.totalDur=totalDur; A.recovering=!!A.spec.recovering;
  A.done=finish; A.pendingDecision=null; A._openedForDecision=false;
  A.held=false; A.prevWall=performance.now();
  animLoop();
  return true;
}
// Slice B: the "cruise begins / ETA" outro card. Played on the flight overlay's own canvas after a
// deferred interplanetary departure's ascent (spec.mode:'depart'), it reads as the launch-day session's
// natural conclusion: the craft coasting away from a receding Earth toward its destination, with the
// transit duration and arrival date. Purely presentational — the mission outcome still lands on arrival.
function drawDepartCard(ct, held){
  const A=animState, s=A.spec, ctx=A.ctx, W=A.cv.width, H=A.cv.height;
  const time=(A.padDur||0)+A.ascentDur+ct;
  const cp=clampA(ct/DEPART_CARD_MS,0,1);
  spaceBg(ctx,W,H,time,A.nativeStars); // deep-space backdrop + parallax stars (native layer when Phaser-hosted)
  // Earth receding at lower-left — the world left behind at the start of the long cruise.
  const eR=Math.max(34,H*0.17), eCx=W*0.15, eCy=H*0.98;
  const eg=ctx.createRadialGradient(eCx-eR*0.32,eCy-eR*0.34,eR*0.2,eCx,eCy,eR);
  eg.addColorStop(0,'#3a8cc7'); eg.addColorStop(0.55,'#245f96'); eg.addColorStop(0.85,'#14406e'); eg.addColorStop(1,'#0a2340');
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.clip(); // night-side shadow
  ctx.fillStyle='rgba(2,5,15,0.4)'; ctx.beginPath(); ctx.arc(eCx+eR*0.5,eCy-eR*0.15,eR*1.02,0,7); ctx.fill(); ctx.restore();
  ctx.strokeStyle='rgba(120,190,255,0.28)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(eCx,eCy,eR+2,0,7); ctx.stroke();
  // The craft coasts up-range toward a destination marker; a faint dashed transfer line connects them.
  const destX=W*0.85, destY=H*0.18;
  const cx=W*0.30+cp*W*0.20, cy=H*0.64-cp*H*0.12;
  const ang=Math.atan2(destY-cy, destX-cx);
  ctx.strokeStyle='rgba(245,166,35,0.22)'; ctx.setLineDash([4,6]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(destX,destY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(245,205,130,0.9)'; ctx.beginPath(); ctx.arc(destX,destY,3,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,205,130,0.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(destX,destY,7+Math.sin(time*0.004),0,7); ctx.stroke();
  drawCraftSprite(ctx,cx,cy,ang,cp<0.3); // a short trans-injection burn as the coast begins
  // The information panel fades in over the first part of the card.
  const pa=clampA(ct/(DEPART_CARD_MS*0.4),0,1);
  if(pa>0){
    ctx.save(); ctx.globalAlpha=pa;
    const transitDays=Math.max(0,Math.round(s.transitDays||0));
    const months=Math.max(1,Math.round(transitDays/30));
    const eta=s.etaAbs!=null?dayToDate(s.etaAbs):null;
    const rows=[['DESTINATION', s.destName||s.title], ['TRANSIT', transitDays+' days (~'+months+' mo)']];
    if(eta) rows.push(['ARRIVAL', eta]);
    if(s.crewed && s.crew>0) rows.push(['CREW', s.crew+' aboard']);
    const panelW=250, panelH=46+rows.length*16, panelX=(W-panelW)/2, panelY=Math.round(H*0.30);
    ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(panelX,panelY,panelW,panelH);
    ctx.strokeStyle=themeRgba('readout',0.3); ctx.lineWidth=0.5; ctx.strokeRect(panelX,panelY,panelW,panelH);
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle=themeColor('readout'); ctx.font='bold 15px ui-monospace,monospace';
    ctx.fillText('CRUISE BEGINS', W/2, panelY+10);
    ctx.font='10px ui-monospace,monospace'; ctx.textBaseline='alphabetic';
    rows.forEach((r,i)=>{ const ry=panelY+42+i*16;
      ctx.textAlign='left'; ctx.fillStyle=themeColor('dim'); ctx.fillText(r[0],panelX+14,ry);
      ctx.textAlign='right'; ctx.fillStyle=themeColor('ink'); ctx.fillText(String(r[1]),panelX+panelW-14,ry); });
    ctx.textAlign='left'; ctx.restore();
  }
  if(held) drawFlightContinueBtn(ctx,W,H);
}

// #73 Slice 3 (2026-07-11): the module rendezvous + soft-dock spectacle. Played on the flight overlay's
// own canvas as the TERMINAL beat of a successful "fly it yourself" module delivery (spec.dock, set in
// finalizeLaunch) — after the ascent + orbit/cislunar cruise, in place of the generic post-flight card.
// Purely presentational: the module already docked in state (dockModuleNow, at resolution); this is the
// visual payoff, NOT a separate success/fail roll — a resolved-success delivery simply docks (mirrors
// Slice 2's precedent of not modeling a separate landing mechanic). One abstraction across LEO/Moon/Mars:
// the backdrop body is tinted per spec.dock.body, everything else is identical. Structured after
// drawDepartCard (backdrop + a moving craft + a fading info panel + a held Continue affordance), but the
// beat is an APPROACH — the module closes on the station's berthing port and captures.
function drawDockCard(ct, held){
  const A=animState, s=A.spec, ctx=A.ctx, W=A.cv.width, H=A.cv.height;
  const d=s.dock||{};
  const time=(A.padDur||0)+A.ascentDur+A.cruiseDur+ct;
  const cp=clampA(ct/DOCK_CARD_MS,0,1);
  spaceBg(ctx,W,H,time,A.nativeStars); // deep-space backdrop + parallax stars (native layer when Phaser-hosted)
  // Destination body limb at lower-left, tinted per body — Earth blue / Moon grey / Mars rust. The one
  // per-body branch in the whole beat; the station + docking geometry is shared across all three.
  const BODY_PAL={ earth:['#3a8cc7','#245f96','#14406e','#0a2340'], moon:['#c9cdd2','#9aa0a7','#6c727a','#3c4046'],
                   mars:['#d9764a','#b4542b','#7e381b','#4a2011'] };
  const pal=BODY_PAL[d.body]||BODY_PAL.earth;
  const bR=Math.max(60,H*0.44), bCx=W*0.15, bCy=H*1.30;
  const bg=ctx.createRadialGradient(bCx-bR*0.30,bCy-bR*0.34,bR*0.2,bCx,bCy,bR);
  bg.addColorStop(0,pal[0]); bg.addColorStop(0.55,pal[1]); bg.addColorStop(0.85,pal[2]); bg.addColorStop(1,pal[3]);
  ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(bCx,bCy,bR,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(bCx,bCy,bR,0,7); ctx.clip(); // night-side terminator shadow
  ctx.fillStyle='rgba(2,5,15,0.42)'; ctx.beginPath(); ctx.arc(bCx+bR*0.5,bCy-bR*0.15,bR*1.02,0,7); ctx.fill(); ctx.restore();
  ctx.strokeStyle='rgba(150,180,220,0.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(bCx,bCy,bR+2,0,7); ctx.stroke();

  // Station right-of-centre; the incoming module closes from the left onto the open berthing port.
  const stX=W*0.66, stY=H*0.44;
  const portX=stX-52, portY=stY;           // the open port the module approaches (left face of the node)
  const contact=0.82;                       // capture happens here; the tail is the settled soft-dock
  const ap=clampA(cp/contact,0,1), ae=1-Math.pow(1-ap,2); // easeOut approach
  const startX=portX-152, seatX=portX-22;   // module right end (modX+halfLen, halfLen≈22) meets the port at capture
  const settle=cp>=contact ? Math.sin((cp-contact)*40)*Math.max(0,1-(cp-contact)/(1-contact))*0.8 : 0; // tiny post-capture damped nudge
  const modX=startX+(seatX-startX)*ae+settle;
  const docked=cp>=contact;

  // A capsule (horizontal cylinder w/ ellipse endcaps) — used for both the station core and the module.
  function can(cx,cy,hl,r,col){
    ctx.save();
    ctx.fillStyle=col;
    ctx.beginPath();
    ctx.moveTo(cx-hl,cy-r); ctx.lineTo(cx+hl,cy-r);
    ctx.ellipse(cx+hl,cy,r*0.55,r,0,-Math.PI/2,Math.PI/2);
    ctx.lineTo(cx-hl,cy+r);
    ctx.ellipse(cx-hl,cy,r*0.55,r,0,Math.PI/2,Math.PI*1.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(cx-hl,cy-r,hl*2,r*0.4);   // top highlight
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(cx-hl,cy+r*0.55,hl*2,r*0.45);   // underside shade
    ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=0.6;
    for(let gx=cx-hl+8; gx<cx+hl; gx+=12){ ctx.beginPath(); ctx.moveTo(gx,cy-r); ctx.lineTo(gx,cy+r); ctx.stroke(); } // ring frames
    ctx.restore();
  }

  // approach corridor guide + range crosshair on the port
  ctx.strokeStyle=themeRgba('readout',0.18); ctx.setLineDash([4,6]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(seatX-118,portY); ctx.lineTo(portX,portY); ctx.stroke(); ctx.setLineDash([]);

  // --- station: solar wings, core, berthing node with the open port ---
  ctx.save();
  for(const sgn of [-1,1]){
    const wy=stY+sgn*52;
    ctx.strokeStyle='rgba(70,100,150,0.6)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(stX,stY+sgn*16); ctx.lineTo(stX,wy); ctx.stroke(); // truss to the wing
    ctx.fillStyle='rgba(38,66,116,0.55)'; ctx.fillRect(stX-34,wy-9,68,18);
    ctx.strokeStyle='rgba(96,146,206,0.5)';
    for(let i=0;i<=4;i++){ ctx.beginPath(); ctx.moveTo(stX-34+i*17,wy-9); ctx.lineTo(stX-34+i*17,wy+9); ctx.stroke(); }
    ctx.strokeStyle='rgba(70,100,150,0.6)'; ctx.strokeRect(stX-34,wy-9,68,18);
  }
  can(stX+6,stY,30,16,d.facColor||'#aeb6bd');                     // core
  ctx.fillStyle='#8f9aa6'; ctx.beginPath(); ctx.arc(stX-34,stY,13,0,7); ctx.fill(); // berthing node sphere
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(stX-34,stY,13,0,7); ctx.stroke();
  // open port mouth (a shallow ring facing the incoming module)
  ctx.strokeStyle=docked?themeColor('ok'):themeRgba('readout',0.85); ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(portX,portY,4,9,0,0,7); ctx.stroke();
  ctx.restore();

  // --- the incoming module + its docking probe + approach RCS puffs ---
  ctx.save();
  can(modX,portY,20,13,d.modColor||'#b8c0c7');
  ctx.strokeStyle='rgba(60,66,72,0.9)'; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(modX+20,portY); ctx.lineTo(modX+27,portY); ctx.stroke(); // capture probe
  if(d.modShort){ ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font='bold 8px ui-monospace,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(d.modShort,modX,portY); }
  if(!docked){ // translation thruster puffs firing aft as it brakes into the port
    const puff=0.4+0.6*Math.abs(Math.sin(time*0.02));
    ctx.fillStyle=`rgba(210,225,255,${0.18*puff})`;
    for(const sgn of [-1,1]){ ctx.beginPath(); ctx.arc(modX-20-6, portY+sgn*9, 3+2*puff, 0,7); ctx.fill(); }
  }
  ctx.restore();

  if(docked){ // soft-dock capture: an expanding ring flash + a steady green contact light
    const dg=clampA((cp-contact)/0.12,0,1);
    ctx.strokeStyle=themeRgba('ok',0.6*(1-dg)); ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(portX,portY,4+dg*22,0,7); ctx.stroke();
    ctx.fillStyle=themeColor('ok'); ctx.beginPath(); ctx.arc(portX,portY,2.2,0,7); ctx.fill();
  }

  // Info panel fades in over the first part of the card (mirrors drawDepartCard's panel).
  const pa=clampA(ct/(DOCK_CARD_MS*0.4),0,1);
  if(pa>0){
    ctx.save(); ctx.globalAlpha=pa;
    const rows=[['STATION', d.facName||s.title], ['MODULE', d.modName||'Module']];
    if(d.moduleCount) rows.push(['ASSEMBLY', d.moduleCount+' module'+(d.moduleCount===1?'':'s')]);
    const panelW=250, panelH=46+rows.length*16, panelX=(W-panelW)/2, panelY=Math.round(H*0.09);
    ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(panelX,panelY,panelW,panelH);
    ctx.strokeStyle=themeRgba('readout',0.3); ctx.lineWidth=0.5; ctx.strokeRect(panelX,panelY,panelW,panelH);
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle=docked?themeColor('ok'):themeColor('readout'); ctx.font='bold 15px ui-monospace,monospace';
    ctx.fillText(docked?'MODULE DOCKED':'RENDEZVOUS', W/2, panelY+10);
    ctx.font='10px ui-monospace,monospace'; ctx.textBaseline='alphabetic';
    rows.forEach((r,i)=>{ const ry=panelY+42+i*16;
      ctx.textAlign='left'; ctx.fillStyle=themeColor('dim'); ctx.fillText(r[0],panelX+14,ry);
      ctx.textAlign='right'; ctx.fillStyle=themeColor('ink'); ctx.fillText(String(r[1]),panelX+panelW-14,ry); });
    ctx.textAlign='left'; ctx.restore();
  }
  if(held) drawFlightContinueBtn(ctx,W,H);
}


/* ---------- Phase A: seamless scene handoffs ----------
   The ascent → orbit/cruise cut becomes a camera move: the moment a phase ends we snapshot
   its final frame, then over HANDOFF_MS the next scene draws with its camera easing out from
   a zoomed-in start while the snapshot crossfades away on top. The same helper runs the
   cruise → reentry cut (zooming IN, shorter). Pure presentation — no timing/logic changes. */
const HANDOFF_MS=1300, HANDOFF_RE_MS=850;
function captureHandoff(kind){
  const A=animState; if(!A||!A.cv) return;
  try{
    const snap=document.createElement('canvas'); snap.width=A.cv.width; snap.height=A.cv.height;
    const sc=snap.getContext('2d'); if(!sc) return;
    sc.drawImage(A.cv,0,0);
    A.handoff={snap, t0:A.lastT!=null?A.lastT:0, kind};
  }catch(e){ A.handoff=null; }
}
// Eases the incoming scene's camera. Call BEFORE the scene draw; returns true if a
// transform was applied (caller's scene draws inside it; finishHandoff() restores + fades snap).
function beginHandoff(t){
  const A=animState; if(!A||!A.handoff||!A.ctx||A.ctx.clearFrame) return false;
  const dur=A.handoff.kind==='reentry'?HANDOFF_RE_MS:HANDOFF_MS;
  const u=clampA((t-A.handoff.t0)/dur,0,1);
  if(u>=1){ A.handoff=null; return false; }
  const e=1-Math.pow(1-u,3); // easeOutCubic
  A.handoff.u=u; A.handoff.e=e;
  const W=A.cv.width, H=A.cv.height, ctx=A.ctx;
  ctx.save();
  if(A.handoff.kind==='reentry'){
    // zoom IN toward the entry corridor (top-left third, where drawReentry starts the streak)
    const z=1+(1-e)*0.0; // reentry reads better without scale — the crossfade alone carries it
  } else if(A.handoff.kind==='dock'){
    // #73 Slice 3: cruise → dock is a pure crossfade (no camera move) — the dock scene reveals its own
    // framing (station + approaching module), so a zoom would fight it. ctx.save() above still balances finishHandoff's restore.
  } else {
    // zoom OUT: start framed tight on where the craft appears, ease to identity
    const z=1+(1-e)*0.85;
    const fx=W*0.5, fy=H*0.34; // insertion region in the orbit/cruise framings
    ctx.translate(fx,fy); ctx.scale(z,z); ctx.translate(-fx,-fy);
  }
  return true;
}
function finishHandoff(){
  const A=animState; if(!A||!A.handoff||!A.ctx||A.ctx.clearFrame) return;
  const ctx=A.ctx;
  ctx.restore(); // undo beginHandoff camera
  const e=A.handoff.e!=null?A.handoff.e:1;
  if(A.handoff.snap){
    ctx.save(); ctx.globalAlpha=Math.pow(1-e,1.35); // snapshot fades out over the incoming scene
    try{ ctx.drawImage(A.handoff.snap,0,0); }catch(err){}
    ctx.restore();
  }
}

// Slice A: the pad phase — reuses drawAscent's own p=0 frame (pad/tower/rocket at rest) so the
// handoff into ascent is a truly identical frame, not a crossfade. Only A.ignite (0→1 through the
// countdown hold + ignition ramp) changes what's drawn; ascent itself always sees ignite=1.
function drawPad(t){
  const A=animState;
  const padU=clampA((A.padDur>0?t/A.padDur:1),0,1);
  A.ignite = padU<PAD_HOLD_FRAC ? 0 : smooth(clampA((padU-PAD_HOLD_FRAC)/(1-PAD_HOLD_FRAC),0,1));
  if(!A._engineStarted && padU>=PAD_HOLD_FRAC){
    const es=A._engSpec||{engCount:1,totalProp:0};
    sfxStartEngine(es.engCount, es.totalProp); A._engineStarted=true;
  }
  drawAscent(0, false); // the exact ground-rest frame; A.ignite (read inside) scales only the flame/exhaust
  const ctx=A.ctx, W=A.cv.width, H=A.cv.height;
  ctx.save();
  ctx.textAlign='center'; ctx.font='bold 14px ui-monospace,monospace';
  let label, color;
  if(padU<PAD_HOLD_FRAC){ const secs=Math.max(1,Math.ceil((PAD_HOLD_FRAC-padU)/PAD_HOLD_FRAC*4)); label='T-'+secs; color='rgba(210,224,255,0.85)'; }
  else if(padU<0.96){ label='IGNITION'; color='rgba(255,196,110,0.92)'; }
  else { label='LIFTOFF'; color='rgba(255,236,190,0.96)'; }
  ctx.fillStyle=color; ctx.fillText(label, W/2, H*0.13);
  ctx.restore();
}
function drawScene(t){
  const A=animState,s=A.spec;
  if(A.ctx&&A.ctx.clearFrame) A.ctx.clearFrame(); // GL-2D fallback clears its framebuffer each frame
  A.earthPhase=false; // set true by drawOrbit so the Phaser scene knows to show the native Earth FX layer
  A.ascentPhase=false; // set true by drawAscent so the native ascent FX layer (clouds/vapor) shows only during ascent
  const ascentFail = !s.success && s.failPhase==='ascent';
  // Slice A: everything after the pad runs on an "at" (ascent-local) clock shifted by padDur, so the
  // ascent/cruise/reentry math below is byte-identical to before — only the pad phase is new.
  const at = t - (A.padDur||0);
  // Phase C: one continuous mission ribbon. Overall progress across pad+ascent+cruise+reentry
  // (weighted by duration), with tick fractions at the phase boundaries for the bar to mark.
  const departMode = s.mode==='depart'; // Slice B: launch → climb → "cruise begins" card, no orbit/reentry tail
  { const activeDur=(A.padDur||0)+A.ascentDur+(departMode?DEPART_CARD_MS:A.cruiseDur+A.reentryDur);
    A.overallP=clampA(t/activeDur,0,1);
    A.phaseTicks=[]; if(A.padDur>0) A.phaseTicks.push(A.padDur/activeDur);
    A.phaseTicks.push(((A.padDur||0)+A.ascentDur)/activeDur);
    if(!departMode && A.reentryDur>0) A.phaseTicks.push(((A.padDur||0)+A.ascentDur+A.cruiseDur)/activeDur); }
  const prevPhase=A.phase;
  if(A.padDur>0 && t < A.padDur){
    A.phase='pad';
    // E1.2 slice C: weather go/no-go holds right at pad open, before the countdown even ramps —
    // the range-weather call comes before anything else about the flight is known.
    if(A.pendingDecision && A.pendingDecision.holdAt==='pad-start'){ A.held=true; drawPad(0); drawDecisionPanel(A.pendingDecision.buildPanel()); A.lastT=t; return; }
    drawPad(t); A.lastT=t; return;
  }
  // E1.2 slice C: the live-call decision holds RIGHT here, at the pad→ascent handoff — the
  // ignition/liftoff moment — instead of letting the outcome (already resolved before this
  // animation even opened) play out before the player has chosen press-on/abort. Default hold
  // point when a decision doesn't specify one (matches the original live-call-only behavior).
  if(A.pendingDecision && (A.pendingDecision.holdAt==='pad-end' || !A.pendingDecision.holdAt)){ A.phase='pad'; A.held=true; drawPad(A.padDur); drawDecisionPanel(A.pendingDecision.buildPanel()); A.lastT=t; return; }
  A.ignite=1; // Slice A: full flame for the rest of the flight — don't inherit the pad's near-1 ramp tail
  if(at < A.ascentDur || ascentFail){ A.phase='ascent'; drawAscent(at, ascentFail); }
  else {
    // One-time context reset when first leaving the ascent phase. The Phaser path reuses ONE
    // CanvasTexture 2D context; ascent's last frame can leave residual state (clip/transform/
    // alpha) that confines/blanks the post-ascent draws (orbit/suborbital/cislunar). Reset
    // ONCE at the transition — not every frame, which churns the GPU texture (the "lazy
    // initialization" warning → renders-then-blanks). drawOrbit/etc repaint the full frame.
    if(prevPhase==='ascent' && A.ctx && !A.ctx.clearFrame){
      captureHandoff('cruise'); // Phase A: snapshot the last ascent frame BEFORE the context reset
      try{ if(typeof A.ctx.reset==='function') A.ctx.reset();
        else { if(A.ctx.setTransform) A.ctx.setTransform(1,0,0,1,0,0); if(A.ctx.setLineDash) A.ctx.setLineDash([]); A.ctx.globalAlpha=1; if('globalCompositeOperation' in A.ctx) A.ctx.globalCompositeOperation='source-over'; } }catch(e){}
    }
    // Slice B: a deferred departure ends here — the ascent hands off (crossfade) into the cruise-begins
    // outro card instead of the orbit/reentry phases, which belong to the arrival that lands turns later.
    if(departMode){
      if(A.sfxEnginePhase==='ascent'){ sfxStop(); A.sfxEnginePhase='coast'; } // engines cut as the launch ends
      const ho=beginHandoff(t); A.phase='depart'; drawDepartCard(at-A.ascentDur, false); if(ho) finishHandoff();
      A.lastT=t; return;
    }
    const ct=at-A.ascentDur;
    // #73 Slice 3: a successful module delivery ends with a rendezvous+dock beat once the cruise completes,
    // in place of the orbit/cislunar tail's post-flight card — an additional terminal phase for deliveries
    // only (reentryDur is 0 for these uncrewed flights, so `entering` never competes for this same instant).
    const docking = !!s.dock && ct>=A.cruiseDur;
    const entering = A.reentryDur>0 && ct>=A.cruiseDur;
    if(docking && prevPhase!=='dock' && prevPhase!=='ascent') captureHandoff('dock'); // cruise → dock crossfade
    if(entering && prevPhase!=='reentry' && prevPhase!=='ascent') captureHandoff('reentry'); // cruise → reentry cut
    const ho=beginHandoff(t); // Phase A: camera ease while the previous frame crossfades away
    if(docking){ A.phase='dock'; drawDockCard(ct-A.cruiseDur, false); }
    else if(entering){ A.phase='reentry'; drawReentry(ct-A.cruiseDur); }
    else if(s.isCislunar){
      // E1.2 slice C: the reserve call (a drifting deep-phase subsystem) and rescue (a stranded
      // crew) both only ever apply to cislunar/deep missions — this is their natural "far from
      // home" moment, right on entering the cruise, rather than the pad→ascent handoff.
      if(A.pendingDecision && A.pendingDecision.holdAt==='cislunar-start'){ A.phase='cislunar'; A.held=true; drawCislunar(0); drawDecisionPanel(A.pendingDecision.buildPanel()); if(ho) finishHandoff(); A.lastT=t; return; }
      A.phase='cislunar'; drawCislunar(ct);
    }
    else if(s.isOrbital){ A.phase='orbit'; drawOrbit(ct); }
    else { A.phase='suborbital'; drawSuborbital(ct); }
    if(ho) finishHandoff();
  }
  A.lastT=t;
}
function buildVehicleShape(spec){
  const segs=[];
  spec.stages.forEach(s=>{
    const dia=clampA(s.dia||1, GEO_DIA_MIN, GEO_DIA_MAX); // BC3: wider tank → shorter for the same propellant
    const w=clampA(clampA(5+2.8*Math.cbrt(s.prop),6,20)*dia, 4, 30);
    const h=clampA(clampA(22+5.0*Math.sqrt(s.prop),24,200)/dia, 16, 260);
    segs.push({ w, h, engines:Math.max(1,Math.min(s.count,8)), kind:'stage', prop:s.prop });
  });
  if(spec.transferProp>0){
    segs.push({ w:clampA(5+2.4*Math.cbrt(spec.transferProp),6,16), h:clampA(16+3.6*Math.sqrt(spec.transferProp),16,80), engines:1, kind:'transfer', prop:spec.transferProp });
  }
  const nose = spec.crewed ? 'capsule' : 'fairing';
  const totalH=segs.reduce((a,s)=>a+s.h,0);
  let maxW=Math.max.apply(null,segs.map(s=>s.w));
  // strap-on boosters flank the first stage — shorter + narrower than the core
  let boosters=null;
  if(spec.boosters && spec.boosters.count>0 && segs.length){
    const bp=spec.boosters.prop||10;
    boosters={ count:Math.min(spec.boosters.count,8), solid:!!spec.boosters.solid,
      w:clampA(4+2.2*Math.cbrt(bp),4,segs[0].w*0.8),
      h:clampA(16+4.4*Math.sqrt(bp),16,segs[0].h*0.95) };
    maxW += 2*(boosters.w+1.5); // leave room so the fit-to-frame scale doesn't clip them
    segs.boosters=boosters; // carried on the FULL seg array → drawVehicle renders them (sliced arrays won't)
  }
  return {segs, nose, totalH, maxW, boosters};
}
// Shared physical render scale: px per shape-unit of vehicle height. Literally equal to
// drawIsoPad's PAD_ROCKET_K (0.40) — the Cape pad is the reference/source of truth for vehicle
// sizing. The ascent scene multiplies shape.totalH (same unit buildVehicleShape produces for both
// scenes, so no conversion factor is needed) by this so a vehicle renders at the same physical
// size it does on the pad, instead of an independent fit-to-frame heuristic. Kept as its own
// named constant (not a reference into drawIsoPad) so the pad's reference code stays untouched.
const VEH_BASE_PX_PER_UNIT = 0.40;
// #graphics: a recovered first stage flies itself back — settle from the sep kick to
// engine-down, deploy grid fins, light a landing burn, drop legs — instead of tumbling
// away as spent debris. Makes the M5 reuse mechanic (recoveryActive) visible.
function drawRecoveryStage(ctx, spent, x, baseY, dt, scale, altFrac, pitch){
  if(dt>3600) return;
  const SETTLE=600, BURN=1400, LEGS=2400;
  const w=spent.w*scale, h=spent.h*scale;
  const rx = x - 22 - dt*0.010;     // drift downrange
  const ry = baseY + 44 + dt*0.050; // fall away below the climbing stack
  let rot;
  if(dt<SETTLE){ const fp=dt/SETTLE; rot=(pitch+0.45)*(1-fp); } // settle to engine-down upright
  else rot=Math.sin(dt*0.004)*0.05; // gentle attitude hold
  const fade = dt>3100 ? clampA(1-(dt-3100)/500,0,1) : 1; // touchdown fade-out
  const burning = dt>=BURN;
  ctx.save();
  ctx.globalAlpha=fade;
  ctx.translate(rx,ry); ctx.rotate(rot);
  if(dt>400){ // grid fins near the aero (top) end
    [-1,1].forEach(s=>{ ctx.save(); ctx.translate(s*w*0.5, -h*0.86);
      ctx.fillStyle='rgba(120,130,138,0.9)'; ctx.strokeStyle='#6a747c'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.rect(0,-1.5*scale, s*3.2*scale, 4*scale); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(40,48,54,0.6)'; ctx.lineWidth=0.4;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(s*3.2*scale,0); ctx.moveTo(s*1.6*scale,-1.5*scale); ctx.lineTo(s*1.6*scale,2.5*scale); ctx.stroke();
      ctx.restore(); });
  }
  if(dt>LEGS){ // landing legs splay out near touchdown
    const lp=clampA((dt-LEGS)/700,0,1);
    ctx.strokeStyle='#3a444b'; ctx.lineWidth=1.4*scale; ctx.lineCap='round';
    [-1,1].forEach(s=>{ ctx.beginPath(); ctx.moveTo(s*w*0.42,-1*scale);
      ctx.lineTo(s*(w*0.42+lp*7*scale), 3*scale+6*scale*lp); ctx.stroke(); });
  }
  const flame = burning ? (7+Math.random()*5) : 0;
  drawVehicle(ctx,[spent],'none',scale*0.95, flame, altFrac);
  ctx.restore();
  if(burning){ // landing-burn plume puffs (2D — native FX tracks the main vehicle only)
    for(let i=0;i<3;i++){ const px=rx+(Math.random()-0.5)*w*0.5, py=ry+5*scale+Math.random()*10*scale;
      ctx.fillStyle=`rgba(255,${150+(Math.random()*60|0)},60,${0.4*fade})`;
      ctx.beginPath(); ctx.arc(px,py,1.5+Math.random()*2,0,7); ctx.fill(); }
  } else if(dt<SETTLE){ // boostback RCS puffs during the settle
    for(let i=0;i<2;i++){ const a=Math.random()*6.28;
      ctx.fillStyle=`rgba(220,230,240,${0.5*fade})`;
      ctx.fillRect(rx+Math.cos(a)*w*0.6, ry-h*0.7+Math.sin(a)*4, 1.6,1.6); }
  }
}
function drawVehicle(ctx, segs, nose, scale, flame, altFrac, hideBells){
  if(!segs.length) return;
  altFrac=altFrac||0;
  const liv=curLivery(); // bench livery: body color, accent, nose style
  const base=segs[0], bw=base.w*scale, ne=base.engines;
  const plumeExpand = 1 + altFrac * 2.5;
  // strap-on boosters (only the full shape's seg array carries .boosters — sliced/spent draws won't)
  if(segs.boosters && segs.boosters.count>0) drawStrapOns(ctx, base, segs.boosters, scale, flame, altFrac, hideBells);
  if(!hideBells) for(let e=0;e<ne;e++){
    const ex = ne===1?0:(-bw/2 + bw*(e+0.5)/ne), nz=bw/(ne*2.2);
    ctx.beginPath(); ctx.moveTo(ex-nz*0.4,-2*scale); ctx.lineTo(ex-nz*0.75,5*scale);
    ctx.lineTo(ex+nz*0.75,5*scale); ctx.lineTo(ex+nz*0.4,-2*scale); ctx.closePath();
    ctx.fillStyle='#22292e'; ctx.fill();
    ctx.strokeStyle='#3a444b'; ctx.lineWidth=0.6; ctx.stroke();
    const bellGrad=ctx.createLinearGradient(ex-nz*0.6,0,ex+nz*0.6,0);
    bellGrad.addColorStop(0,'#3a444b'); bellGrad.addColorStop(0.5,'#5a666e'); bellGrad.addColorStop(1,'#3a444b');
    ctx.fillStyle=bellGrad;
    ctx.beginPath(); ctx.moveTo(ex-nz*0.35,-1*scale); ctx.lineTo(ex-nz*0.6,4.5*scale);
    ctx.lineTo(ex+nz*0.6,4.5*scale); ctx.lineTo(ex+nz*0.35,-1*scale); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(28,34,38,0.5)'; ctx.lineWidth=0.4; // bell ribs
    ctx.beginPath(); ctx.moveTo(ex,-1*scale); ctx.lineTo(ex,4.5*scale);
    ctx.moveTo(ex-nz*0.22,-1*scale); ctx.lineTo(ex-nz*0.42,4.5*scale);
    ctx.moveTo(ex+nz*0.22,-1*scale); ctx.lineTo(ex+nz*0.42,4.5*scale); ctx.stroke();
    ctx.strokeStyle='rgba(170,182,190,0.5)'; ctx.lineWidth=0.5; // bell rim highlight
    ctx.beginPath(); ctx.moveTo(ex-nz*0.6,4.5*scale); ctx.lineTo(ex+nz*0.6,4.5*scale); ctx.stroke();
    if(flame>0){
      const fl=flame*(0.7+Math.random()*0.4)*plumeExpand;
      const nzE=nz*plumeExpand*0.85;
      const coreGrad=ctx.createLinearGradient(ex,3*scale,ex,fl);
      coreGrad.addColorStop(0,'rgba(210,230,255,0.95)');
      coreGrad.addColorStop(0.08,'rgba(180,200,255,0.9)');
      coreGrad.addColorStop(0.25,'rgba(255,220,130,0.85)');
      coreGrad.addColorStop(0.5,'rgba(255,150,50,0.6)');
      coreGrad.addColorStop(0.8,'rgba(255,80,20,0.25)');
      coreGrad.addColorStop(1,'rgba(200,40,10,0)');
      ctx.fillStyle=coreGrad;
      ctx.beginPath(); ctx.moveTo(ex-nzE*0.9,3*scale); ctx.lineTo(ex+nzE*0.9,3*scale);
      ctx.quadraticCurveTo(ex+nzE*0.3,fl*0.6,ex+nzE*0.08,fl);
      ctx.lineTo(ex-nzE*0.08,fl);
      ctx.quadraticCurveTo(ex-nzE*0.3,fl*0.6,ex-nzE*0.9,3*scale);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(200,220,255,0.75)';
      ctx.beginPath(); ctx.moveTo(ex-nz*0.3,3*scale); ctx.lineTo(ex+nz*0.3,3*scale);
      ctx.lineTo(ex+nz*0.05,fl*0.4); ctx.lineTo(ex-nz*0.05,fl*0.4); ctx.closePath(); ctx.fill();
      if(altFrac<0.55){
        const dCount=Math.floor(2+altFrac*6);
        for(let d=0;d<dCount;d++){
          const dy=fl*0.45+fl*0.5*(d/dCount);
          const dw=nzE*(0.5-d*0.05)*(0.8+Math.random()*0.3);
          ctx.fillStyle=`rgba(255,${170+Math.random()*50},${40+Math.random()*30},${0.25-altFrac*0.4})`;
          ctx.beginPath(); ctx.ellipse(ex+(Math.random()-0.5)*nz*0.2,dy,Math.max(0.5,dw),Math.max(0.5,nzE*0.06),0,0,6.28); ctx.fill();
        }
      }
      ctx.fillStyle=`rgba(255,${130+Math.random()*50},20,${0.1*plumeExpand})`;
      ctx.beginPath(); ctx.arc(ex,fl*0.25,nzE*1.5,0,7); ctx.fill();
    }
  }
  let y=0;
  for(let i=0;i<segs.length;i++){
    const s=segs[i], w=s.w*scale, h=s.h*scale;
    const bodyGrad=ctx.createLinearGradient(-w/2,y-h,w/2,y-h);
    if(s.kind==='transfer'){
      bodyGrad.addColorStop(0,'#6a7580'); bodyGrad.addColorStop(0.3,'#8a949e'); bodyGrad.addColorStop(0.5,'#a0aab2'); bodyGrad.addColorStop(0.7,'#8a949e'); bodyGrad.addColorStop(1,'#6a7580');
    } else {
      // livery-tinted body: derive light/mid/dark by shading the chosen body color
      const light=shade(liv.body, i%2?0.14:0.20);
      const mid=shade(liv.body, i%2?-0.02:0.03);
      const dark=shade(liv.body, i%2?-0.20:-0.15);
      bodyGrad.addColorStop(0,dark); bodyGrad.addColorStop(0.2,mid); bodyGrad.addColorStop(0.45,light);
      bodyGrad.addColorStop(0.55,light); bodyGrad.addColorStop(0.8,mid); bodyGrad.addColorStop(1,dark);
    }
    const rr=Math.min(w*0.12,3);
    ctx.beginPath(); ctx.moveTo(-w/2+rr,y-h); ctx.lineTo(w/2-rr,y-h);
    ctx.quadraticCurveTo(w/2,y-h,w/2,y-h+rr); ctx.lineTo(w/2,y-rr);
    ctx.quadraticCurveTo(w/2,y,w/2-rr,y); ctx.lineTo(-w/2+rr,y);
    ctx.quadraticCurveTo(-w/2,y,-w/2,y-rr); ctx.lineTo(-w/2,y-h+rr);
    ctx.quadraticCurveTo(-w/2,y-h,-w/2+rr,y-h); ctx.closePath();
    ctx.fillStyle=bodyGrad; ctx.fill();
    ctx.strokeStyle='rgba(60,72,82,0.7)'; ctx.lineWidth=0.7; ctx.stroke();
    if(h>16*scale){
      ctx.strokeStyle='rgba(60,72,82,0.25)'; ctx.lineWidth=0.4;
      const stripes=Math.floor(h/(8*scale));
      for(let j=1;j<stripes;j++){
        const sy=y-h+j*(h/stripes);
        ctx.beginPath(); ctx.moveTo(-w/2+1,sy); ctx.lineTo(w/2-1,sy); ctx.stroke();
      }
    }
    // --- surface detail: specular highlight, cable raceway, panel seams, interstage band, rivets ---
    if(w>7){
      ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.fillRect(-w*0.20, y-h+1.5, Math.max(0.6,w*0.05), h-3); // highlight
      const rcx=w*0.30; // cable raceway / conduit
      ctx.fillStyle='rgba(38,46,52,0.85)'; ctx.fillRect(rcx-0.9, y-h+2, 1.8, h-4);
      ctx.fillStyle='rgba(150,162,170,0.45)'; ctx.fillRect(rcx-1.3, y-h+2, 0.55, h-4);
      ctx.strokeStyle='rgba(60,72,82,0.22)'; ctx.lineWidth=0.4; // vertical panel seams
      [-0.22,0.08].forEach(fx=>{ const px=w*fx; ctx.beginPath(); ctx.moveTo(px,y-h+2); ctx.lineTo(px,y-2); ctx.stroke(); });
      ctx.fillStyle='rgba(28,34,40,0.55)'; ctx.fillRect(-w/2+0.5, y-h, w-1, Math.max(1.2,h*0.045)); // dark interstage band at top
      // livery accent stripe near the top of the stage
      ctx.save(); ctx.globalAlpha=0.88; ctx.fillStyle=liv.accent; ctx.fillRect(-w/2+0.5, y-h+Math.max(3,h*0.11), w-1, Math.max(1.4,h*0.035)); ctx.restore();
      if(w>10){ ctx.fillStyle='rgba(70,82,92,0.55)'; const rn=Math.min(9,Math.max(3,Math.floor(w/2))); for(let r=0;r<rn;r++){ const rx=-w/2+2+(w-4)*r/(rn-1); ctx.fillRect(rx-0.4,y-3,0.8,0.8); } } // rivets along lower seam
    }
    if(s.kind==='stage' && h>22*scale && w>11){
      // agency roundel marking
      const rcy=y-h*0.4, rr=Math.min(w*0.16, h*0.085);
      ctx.fillStyle='#e8edf1'; ctx.beginPath(); ctx.arc(0,rcy,rr,0,7); ctx.fill();
      ctx.fillStyle=liv.accent; ctx.beginPath(); ctx.arc(0,rcy,rr*0.66,0,7); ctx.fill();
      ctx.fillStyle=shade(liv.accent,-0.35); ctx.beginPath(); ctx.arc(0,rcy,rr*0.28,0,7); ctx.fill();
    } else if(s.kind==='stage' && h>20*scale){
      ctx.fillStyle='rgba(60,72,82,0.3)';
      const patchY=y-h*0.35, patchH=h*0.12, patchW=w*0.3;
      ctx.fillRect(-patchW/2,patchY,patchW,patchH);
      ctx.save(); ctx.globalAlpha=0.5; ctx.fillStyle=liv.accent;
      ctx.fillRect(-patchW/2+1,patchY+1,patchW*0.3,patchH-2); ctx.restore();
    }
    if(i<segs.length-1){
      const nextW=segs[i+1].w*scale;
      const adH=Math.max(3,Math.abs(w-nextW)*0.6+3);
      const adGrad=ctx.createLinearGradient(-Math.max(w,nextW)/2,y-h,Math.max(w,nextW)/2,y-h);
      adGrad.addColorStop(0,'#4a545c'); adGrad.addColorStop(0.3,'#5e686f'); adGrad.addColorStop(0.5,'#6a747c');
      adGrad.addColorStop(0.7,'#5e686f'); adGrad.addColorStop(1,'#4a545c');
      ctx.fillStyle=adGrad;
      ctx.beginPath();
      ctx.moveTo(-w/2,y-h); ctx.lineTo(w/2,y-h);
      ctx.lineTo(nextW/2,y-h-adH); ctx.lineTo(-nextW/2,y-h-adH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(60,72,82,0.6)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(-w/2,y-h); ctx.lineTo(-nextW/2,y-h-adH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w/2,y-h); ctx.lineTo(nextW/2,y-h-adH); ctx.stroke();
      ctx.strokeStyle='rgba(80,92,102,0.4)'; ctx.lineWidth=0.3;
      ctx.beginPath(); ctx.moveTo(-w/2,y-h); ctx.lineTo(w/2,y-h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-nextW/2,y-h-adH); ctx.lineTo(nextW/2,y-h-adH); ctx.stroke();
      y-=h+adH;
    } else {
      y-=h;
    }
  }
  const fw=base.w*scale, fh=base.h*scale;
  const finH=fh*0.45, finW=fw*0.55;
  if(!hideBells){ // booster fins (hidden once lifted off, like the bells)
  ctx.fillStyle='#5a666e'; ctx.strokeStyle='rgba(60,72,82,0.6)'; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.moveTo(-fw/2,0); ctx.lineTo(-fw/2-finW*0.6,4*scale);
  ctx.lineTo(-fw/2-finW*0.3,4*scale); ctx.lineTo(-fw/2,-finH); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fw/2,0); ctx.lineTo(fw/2+finW*0.6,4*scale);
  ctx.lineTo(fw/2+finW*0.3,4*scale); ctx.lineTo(fw/2,-finH); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const topSeg=segs[segs.length-1];
  const tw=topSeg.w*scale, th=topSeg.h*scale;
  if(segs.length>1 || topSeg.kind==='transfer'){
    const rcsY=y+th*0.3;
    ctx.fillStyle='#7a8490';
    ctx.fillRect(-tw/2-2.5*scale,rcsY,2.5*scale,3*scale);
    ctx.fillRect(tw/2,rcsY,2.5*scale,3*scale);
  }
  if(nose==='capsule'){
    const capGrad=ctx.createLinearGradient(-tw*0.5,y,tw*0.5,y);
    capGrad.addColorStop(0,'#7a848c'); capGrad.addColorStop(0.3,'#b0b8c0'); capGrad.addColorStop(0.5,'#ccd4da');
    capGrad.addColorStop(0.7,'#b0b8c0'); capGrad.addColorStop(1,'#7a848c');
    ctx.beginPath(); ctx.moveTo(-tw*0.52,y); ctx.lineTo(-tw*0.42,y-6*scale);
    ctx.lineTo(-tw*0.30,y-10*scale); ctx.quadraticCurveTo(0,y-16*scale,tw*0.30,y-10*scale);
    ctx.lineTo(tw*0.42,y-6*scale); ctx.lineTo(tw*0.52,y); ctx.closePath();
    ctx.fillStyle=capGrad; ctx.fill();
    ctx.strokeStyle='rgba(60,72,82,0.7)'; ctx.lineWidth=0.7; ctx.stroke();
    ctx.strokeStyle='rgba(60,72,82,0.3)'; ctx.lineWidth=0.4;
    ctx.beginPath(); ctx.moveTo(-tw*0.35,y-3*scale); ctx.lineTo(tw*0.35,y-3*scale); ctx.stroke();
    ctx.fillStyle='rgba(120,180,220,0.3)';
    ctx.beginPath(); ctx.arc(0,y-8*scale,tw*0.1,0,7); ctx.fill();
    // side windows + RCS quad nubs
    ctx.fillStyle='rgba(120,180,220,0.28)';
    [-tw*0.24, tw*0.24].forEach(wx=>{ ctx.beginPath(); ctx.arc(wx,y-6*scale,tw*0.045,0,7); ctx.fill(); });
    ctx.fillStyle='#6a747c';
    ctx.fillRect(-tw*0.5-1.5*scale, y-4*scale, 1.5*scale, 2*scale);
    ctx.fillRect(tw*0.5, y-4*scale, 1.5*scale, 2*scale);
    ctx.strokeStyle='rgba(60,72,82,0.5)'; ctx.lineWidth=0.4;
    ctx.beginPath(); ctx.arc(0,y-8*scale,tw*0.1,0,7); ctx.stroke();
    const dockY=y-14*scale;
    ctx.fillStyle='#5a646c'; ctx.fillRect(-tw*0.06,dockY-2*scale,tw*0.12,2*scale);
    ctx.fillStyle='#4a545c'; ctx.fillRect(-tw*0.04,dockY-3.5*scale,tw*0.08,1.5*scale);
  } else if(nose==='fairing'){
    const fairGrad=ctx.createLinearGradient(-tw/2,y,tw/2,y);
    fairGrad.addColorStop(0,'#a0aab2'); fairGrad.addColorStop(0.3,'#c8d2d8'); fairGrad.addColorStop(0.5,'#dce4ea');
    fairGrad.addColorStop(0.7,'#c8d2d8'); fairGrad.addColorStop(1,'#a0aab2');
    // livery nose style — cone (sharp), blunt (short rounded), ogive/auto (default shroud)
    const ns=liv.nose||'auto';
    const tipH=(ns==='cone'?34:ns==='blunt'?18:28)*scale;
    ctx.beginPath(); ctx.moveTo(-tw/2,y); ctx.lineTo(-tw*0.48,y-4*scale);
    if(ns==='cone'){
      ctx.lineTo(0,y-tipH);                                   // straight pointed cone
      ctx.lineTo(tw*0.48,y-4*scale);
    } else if(ns==='blunt'){
      ctx.quadraticCurveTo(-tw*0.34,y-tipH,0,y-tipH);         // broad rounded dome
      ctx.quadraticCurveTo(tw*0.34,y-tipH,tw*0.48,y-4*scale);
    } else {
      ctx.quadraticCurveTo(-tw*0.25,y-(tipH-6*scale),0,y-tipH); // ogive shroud (default)
      ctx.quadraticCurveTo(tw*0.25,y-(tipH-6*scale),tw*0.48,y-4*scale);
    }
    ctx.lineTo(tw/2,y); ctx.closePath();
    ctx.fillStyle=fairGrad; ctx.fill();
    ctx.strokeStyle='rgba(60,72,82,0.6)'; ctx.lineWidth=0.7; ctx.stroke();
    ctx.strokeStyle='rgba(60,72,82,0.35)'; ctx.lineWidth=0.4;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(0,y-tipH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-tw*0.35,y-6*scale); ctx.lineTo(tw*0.35,y-6*scale); ctx.stroke();
  }
}
// One strap-on booster (body + ogive nose + bell + optional flame), centered at the
// local origin with its base at y=0 (so it shares drawVehicle's "engines downward" frame).
function drawOneBooster(ctx, boostW, boostH, scale, flame, altFrac, hideBells, dim, solid){
  dim=dim||1; altFrac=altFrac||0;
  const C=(r,g,b)=>`rgb(${(r*dim)|0},${(g*dim)|0},${(b*dim)|0})`;
  const grad=ctx.createLinearGradient(-boostW/2,0,boostW/2,0);
  if(solid){ grad.addColorStop(0,C(196,200,204)); grad.addColorStop(0.5,C(238,240,242)); grad.addColorStop(1,C(196,200,204)); } // solids: pale composite casing
  else { grad.addColorStop(0,C(149,160,168)); grad.addColorStop(0.5,C(208,216,222)); grad.addColorStop(1,C(149,160,168)); }
  const rr=Math.min(boostW*0.3,2.2);
  ctx.beginPath();
  ctx.moveTo(-boostW/2+rr,-boostH); ctx.lineTo(boostW/2-rr,-boostH);
  ctx.quadraticCurveTo(boostW/2,-boostH,boostW/2,-boostH+rr); ctx.lineTo(boostW/2,-rr);
  ctx.quadraticCurveTo(boostW/2,0,boostW/2-rr,0); ctx.lineTo(-boostW/2+rr,0);
  ctx.quadraticCurveTo(-boostW/2,0,-boostW/2,-rr); ctx.lineTo(-boostW/2,-boostH+rr);
  ctx.quadraticCurveTo(-boostW/2,-boostH,-boostW/2+rr,-boostH); ctx.closePath();
  ctx.fillStyle=grad; ctx.fill();
  ctx.strokeStyle='rgba(60,72,82,0.7)'; ctx.lineWidth=0.6; ctx.stroke();
  if(solid){ // segment field joints across the casing
    ctx.strokeStyle='rgba(80,90,98,0.5)'; ctx.lineWidth=0.5;
    const segN=Math.max(2,Math.floor(boostH/(7*scale)));
    for(let k=1;k<segN;k++){ const sy=-boostH*k/segN; ctx.beginPath(); ctx.moveTo(-boostW/2+0.6,sy); ctx.lineTo(boostW/2-0.6,sy); ctx.stroke(); }
  }
  // ogive nose cone
  ctx.beginPath(); ctx.moveTo(-boostW/2,-boostH);
  ctx.quadraticCurveTo(0,-boostH-boostW*1.15,boostW/2,-boostH); ctx.closePath();
  ctx.fillStyle=C(190,198,205); ctx.fill();
  ctx.strokeStyle='rgba(60,72,82,0.5)'; ctx.lineWidth=0.5; ctx.stroke();
  // engine bell
  if(!hideBells){
    const nz=boostW/2.4;
    ctx.fillStyle=C(58,68,75);
    ctx.beginPath(); ctx.moveTo(-nz*0.5,-1*scale); ctx.lineTo(-nz*0.78,4*scale); ctx.lineTo(nz*0.78,4*scale); ctx.lineTo(nz*0.5,-1*scale); ctx.closePath(); ctx.fill();
  }
  if(flame>0){
    const fl=flame*(0.7+Math.random()*0.4)*(1+altFrac*2.5)*0.9, nzE=boostW*0.42;
    const g=ctx.createLinearGradient(0,3*scale,0,fl);
    g.addColorStop(0,'rgba(210,230,255,0.9)'); g.addColorStop(0.28,'rgba(255,220,130,0.8)');
    g.addColorStop(0.65,'rgba(255,120,40,0.4)'); g.addColorStop(1,'rgba(200,40,10,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.moveTo(-nzE*0.8,3*scale); ctx.lineTo(nzE*0.8,3*scale);
    ctx.quadraticCurveTo(nzE*0.2,fl*0.7,0,fl); ctx.quadraticCurveTo(-nzE*0.2,fl*0.7,-nzE*0.8,3*scale); ctx.closePath(); ctx.fill();
  }
}
// The strap-on cluster flanking the core's first stage. Draws a primary booster on each
// side (one only, if count===1), plus any extras peeking from behind toward the centerline.
function drawStrapOns(ctx, base, b, scale, flame, altFrac, hideBells){
  const n=b.count, bw=base.w*scale, boostW=b.w*scale, boostH=b.h*scale;
  const gap=Math.max(1,boostW*0.14), outX=bw/2+boostW/2+gap;
  const list=[];
  if(n===1){ list.push({x:outX,behind:false}); }
  else {
    list.push({x:-outX,behind:false}); list.push({x:outX,behind:false});
    let extra=n-2, side=1;
    while(extra>0){ list.push({x:side*(outX-boostW*0.55),behind:true}); side=-side; extra--; }
  }
  list.sort((a,c)=>(a.behind===c.behind)?0:(a.behind?-1:1)); // behind ones first
  list.forEach(pos=>{
    ctx.save(); ctx.translate(pos.x,0);
    drawOneBooster(ctx, boostW, boostH, scale, pos.behind?0:flame, altFrac, hideBells, pos.behind?0.8:1, b.solid);
    if(!pos.behind){ // attach struts toward the core
      ctx.strokeStyle='rgba(70,82,92,0.8)'; ctx.lineWidth=0.8; const dir=pos.x>0?-1:1;
      [0.7,0.28].forEach(fy=>{ ctx.beginPath(); ctx.moveTo(dir*boostW/2,-boostH*fy); ctx.lineTo(dir*(boostW/2+gap+1),-boostH*fy); ctx.stroke(); });
    }
    ctx.restore();
  });
}
function drawBoom(ctx,x,y,dt){
  const p=clampA(dt/1800,0,1);
  const maxR=65;
  const r=smooth(Math.min(p*1.5,1))*maxR;
  const a=clampA(1-p,0,1);
  const coreR=r*0.4;
  const coreGrad=ctx.createRadialGradient(x,y,0,x,y,coreR);
  coreGrad.addColorStop(0,`rgba(255,255,220,${a*0.9})`);
  coreGrad.addColorStop(0.5,`rgba(255,200,80,${a*0.7})`);
  coreGrad.addColorStop(1,`rgba(255,120,30,${a*0.3})`);
  ctx.fillStyle=coreGrad; ctx.beginPath(); ctx.arc(x,y,coreR,0,7); ctx.fill();
  const outerGrad=ctx.createRadialGradient(x,y,coreR*0.5,x,y,r);
  outerGrad.addColorStop(0,`rgba(245,120,35,${a*0.5})`);
  outerGrad.addColorStop(0.6,`rgba(200,60,30,${a*0.3})`);
  outerGrad.addColorStop(1,`rgba(80,20,10,0)`);
  ctx.fillStyle=outerGrad; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
  const A=animState;
  if(A && dt<100 && A.debris.length===0){
    for(let i=0;i<25;i++){
      const ang=Math.random()*6.28, spd=1.5+Math.random()*4;
      A.debris.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-2,rot:Math.random()*6.28,rv:0.02+Math.random()*0.08,sz:2+Math.random()*5,life:1});
    }
  }
  if(A){
    for(const d of A.debris){
      d.x+=d.vx; d.y+=d.vy; d.vy+=0.06; d.rot+=d.rv; d.life-=0.008;
      if(d.life>0){
        ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(d.rot);
        ctx.fillStyle=`rgba(${150+Math.random()*50},${80+Math.random()*40},${30+Math.random()*20},${d.life})`;
        ctx.fillRect(-d.sz/2,-d.sz/4,d.sz,d.sz/2); ctx.restore();
      }
    }
  }
  if(p<0.6){
    const smokeA=a*0.25;
    for(let i=0;i<5;i++){
      const sx=x+(Math.random()-0.5)*r*1.5, sy=y+(Math.random()-0.5)*r*0.8;
      const sr=5+Math.random()*15;
      ctx.fillStyle=`rgba(60,50,40,${smokeA*Math.random()})`;
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,7); ctx.fill();
    }
  }
}
// User-directed relayout (2026-07-11): was a vertical list pinned top-left, then a horizontal strip
// stacked ABOVE the phase bar; now the BOTTOM-most HUD element (below the phase bar, hugging the
// canvas edge) so it sits clear under the rocket sprite instead of competing with it for the same
// vertical band during ascent. Stores its own top edge on animState (_telemetryTopY) so
// drawPhaseBar can stack itself just above, whatever the current data's row count is.
const HUD_BOTTOM_MARGIN=6; // gap from the telemetry strip's bottom edge to the true canvas bottom
function drawTelemetry(data){
  const A=animState,ctx=A.ctx,W=A.cv.width,H=A.cv.height;
  ctx.save();
  const cols=Math.min(data.length,5), rows=Math.ceil(data.length/cols);
  const cellW=128, rowH=28, pad=7;
  const stripW=Math.min(W-20, cols*cellW), stripH=rows*rowH+pad*2;
  const stripX=(W-stripW)/2, stripY=H-HUD_BOTTOM_MARGIN-stripH;
  A._telemetryTopY=stripY; // drawPhaseBar reads this to stack just above, whatever this frame's row count is
  ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(stripX,stripY,stripW,stripH);
  ctx.strokeStyle=themeRgba('readout',0.25); ctx.lineWidth=0.5; ctx.strokeRect(stripX,stripY,stripW,stripH);
  ctx.textBaseline='top'; ctx.textAlign='center';
  data.forEach((row,i)=>{
    const c=i%cols, r=Math.floor(i/cols);
    const cellX=stripX+c*(stripW/cols), cellCx=cellX+stripW/cols/2, cellY=stripY+pad+r*rowH;
    if(c>0){ ctx.strokeStyle=themeRgba('readout',0.12); ctx.beginPath(); ctx.moveTo(cellX,stripY+4); ctx.lineTo(cellX,stripY+stripH-4); ctx.stroke(); }
    ctx.fillStyle=themeColor('dim'); ctx.font='9px ui-monospace,monospace'; ctx.fillText(row.label,cellCx,cellY);
    ctx.fillStyle=row.color||themeColor('ink'); ctx.font='bold 12px ui-monospace,monospace'; ctx.fillText(row.value,cellCx,cellY+12);
  });
  ctx.textAlign='left';
  ctx.restore();
}
function drawPhaseBar(phase,color,progress){
  const A=animState,ctx=A.ctx,W=A.cv.width,H=A.cv.height;
  ctx.save();
  const barW=320, barH=28, bx=(W-barW)/2;
  // Stacks just above the telemetry strip (drawTelemetry always runs first in every caller and
  // records its own top edge) — an 8px gap, then this bar's box extends 5px above `by`, hence -41.
  const by=(A._telemetryTopY!=null?A._telemetryTopY:H-38)-41;
  ctx.fillStyle=themeRgba('bg',0.82);
  ctx.beginPath();
  const br=6;
  ctx.moveTo(bx-6+br,by-5); ctx.lineTo(bx+barW+6-br,by-5);
  ctx.quadraticCurveTo(bx+barW+6,by-5,bx+barW+6,by-5+br);
  ctx.lineTo(bx+barW+6,by+barH+5-br);
  ctx.quadraticCurveTo(bx+barW+6,by+barH+5,bx+barW+6-br,by+barH+5);
  ctx.lineTo(bx-6+br,by+barH+5);
  ctx.quadraticCurveTo(bx-6,by+barH+5,bx-6,by+barH+5-br);
  ctx.lineTo(bx-6,by-5+br);
  ctx.quadraticCurveTo(bx-6,by-5,bx-6+br,by-5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.lineWidth=0.5;
  ctx.stroke();
  if(progress!==undefined){
    ctx.fillStyle=themeRgba('readout',0.08); ctx.fillRect(bx,by,barW,barH);
    // Phase C: the fill is the WHOLE mission (continuous across ascent/cruise/reentry),
    // not the current scene — the flight reads as one broadcast. Text stays contextual.
    const pg=clampA(A.overallP!=null?A.overallP:progress,0,1);
    const barColor=color||themeColor('readout');
    const progGrad=ctx.createLinearGradient(bx,0,bx+barW*pg,0);
    progGrad.addColorStop(0,barColor+'55');
    progGrad.addColorStop(1,barColor+'22');
    ctx.fillStyle=progGrad; ctx.fillRect(bx,by,barW*pg,barH);
    ctx.fillStyle=barColor; ctx.fillRect(bx+barW*pg-1,by,2,barH);
    (A.phaseTicks||[]).forEach(f=>{ ctx.fillStyle=themeRgba('ink',0.4); ctx.fillRect(bx+barW*f-0.5,by,1,barH); });
  }
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=color||themeColor('readout'); ctx.font='bold 13px ui-monospace,monospace';
  ctx.fillText(phase,W/2,by+barH/2);
  ctx.restore();
}

/* ---------- Phase B: your craft on the cruise/orbit screens — not a dot ----------
   The dot becomes a sprite built from the vehicle you actually designed: the remaining
   stack (final core stage + transfer stage + your capsule/fairing, in your livery),
   rotated to the direction of travel, with the real engine plume when burning. A faint
   halo keeps it findable at planetary scale. Built once per flight, drawn cheap. */
// TUNABLE KNOBS (like LIFTOFF_SEED_P): the orbit/cruise sprite's on-screen height bounds. The size
// itself is now driven off the FULL vehicle at the shared pad px/unit (VEH_BASE_PX_PER_UNIT === 0.40,
// same as the pad + ascent scene) so a heavier rocket reads bigger — but capped FAR below the ascent
// scene's 190px. At orbit/cislunar zoom the Earth disc is only ~60px across and the Moon ~26px
// (buildLunarPath E.r=30, M.r=13), and the orbit-to-limb clearance is ~68px (drawOrbit orbitR=E.r+68) —
// a 190px rocket would swamp the planets/orbit paths and break the "findable ship" readability the old
// flat ~26px silhouette protected. 46px keeps a heavy stack clearly bigger than the old 26px yet still
// under Earth's disc and inside the orbit corridor; the 18px floor keeps tiny early rockets legible.
// Retune in-browser if the ship looks off against the planets.
const CRAFT_SPRITE_MAX_PX = 46; // orbit/cruise sprite height cap (well below ascent's 190px)
const CRAFT_SPRITE_MIN_PX = 18; // readability floor so tiny early-game rockets aren't invisible specks
function craftSprite(){
  const A=animState; if(A.craftSprite) return A.craftSprite;
  let shape=null; try{ shape=buildVehicleShape(A.spec); }catch(e){ return null; }
  if(!shape || !shape.segs.length) return null;
  const nCore=(A.spec.stages||[]).length;
  let segs=shape.segs.slice(Math.max(0,nCore-1));  // last core stage + transfer (boosters long gone)
  if(!segs.length) segs=[shape.segs[shape.segs.length-1]];
  const totalH=segs.reduce((a,s)=>a+s.h,0);              // height of the silhouette actually drawn (last core stage + transfer)
  // Size off the FULL vehicle at the shared pad px/unit (matches slice 1's ascent formula: shape.totalH *
  // VEH_BASE_PX_PER_UNIT), but with craftSprite's OWN cap (see CRAFT_SPRITE_* above) instead of 190px, then
  // scale the drawn (sliced) silhouette so it fills that height. Replaces the old flat ~26px (no size variation).
  const drawnPx=clampA(shape.totalH*VEH_BASE_PX_PER_UNIT, CRAFT_SPRITE_MIN_PX, CRAFT_SPRITE_MAX_PX);
  const scale=drawnPx/Math.max(1,totalH);
  const spent=nCore>=2 ? shape.segs[nCore-2] : null;     // the stage you just dropped, for the sep beat
  A.craftSprite={segs, nose:shape.nose, scale, h:totalH*scale, spent};
  return A.craftSprite;
}
// ang = direction of travel in canvas radians. burning draws the real vacuum plume.
function drawCraftSprite(ctx,x,y,ang,burning){
  const cs=craftSprite();
  if(!cs){ drawCraftDot(ctx,x,y,true); return; }
  // readability halo (the old dot's glow, kept faint)
  const g=ctx.createRadialGradient(x,y,2,x,y,15);
  g.addColorStop(0,'rgba(245,166,35,0.16)'); g.addColorStop(1,'rgba(245,166,35,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,15,0,7); ctx.fill();
  ctx.save(); ctx.translate(x,y); ctx.rotate(ang+Math.PI/2); ctx.translate(0, cs.h/2);
  try{ drawVehicle(ctx, cs.segs, cs.nose, cs.scale, burning?1:0, 1); }catch(e){ ctx.restore(); drawCraftDot(ctx,x,y,true); return; }
  ctx.restore();
}
// The separation beat: for the first moments of cruise, the spent core stage tumbles away
// retrograde-and-below — the ascent's story handing its last prop to the new scene.
function drawSpentStageDrift(ctx,x,y,ang,ct){
  const cs=craftSprite(); if(!cs || !cs.spent || ct>2600) return;
  const u=ct/2600;
  const dx=-Math.cos(ang)*(14+u*46), dy=-Math.sin(ang)*(14+u*46)+u*22;
  ctx.save(); ctx.globalAlpha=0.85*(1-u);
  ctx.translate(x+dx,y+dy); ctx.rotate(ang+Math.PI/2 + ct*0.0016);
  try{ drawVehicle(ctx,[cs.spent],'none',cs.scale*0.9,0,1); }catch(e){}
  ctx.restore();
}

function drawCraftDot(ctx,x,y,glow){
  glow=glow||false;
  ctx.fillStyle=themeColor('ignite'); ctx.beginPath(); ctx.arc(x,y,4,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,166,35,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x,y,8,0,7); ctx.stroke();
  if(glow){
    const g=ctx.createRadialGradient(x,y,2,x,y,16);
    g.addColorStop(0,'rgba(245,166,35,0.25)'); g.addColorStop(1,'rgba(245,166,35,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,16,0,7); ctx.fill();
  }
}
function drawMiniMap(ctx,W,H,p,orb,maxAlt,drangeKm,pitch){
  const mx=W-172, my=58, mw=155, mh=105;
  ctx.save();
  ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(mx-4,my-4,mw+8,mh+8);
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.lineWidth=0.5; ctx.strokeRect(mx-4,my-4,mw+8,mh+8);
  ctx.beginPath(); ctx.rect(mx,my,mw,mh); ctx.clip();
  const eR=320, eCx=mx+mw*0.15, eCy=my+mh+eR-12;
  const atmGrad=ctx.createRadialGradient(eCx,eCy,eR,eCx,eCy,eR+8);
  atmGrad.addColorStop(0,'rgba(60,140,220,0.25)'); atmGrad.addColorStop(1,'rgba(60,140,220,0)');
  ctx.fillStyle=atmGrad; ctx.beginPath(); ctx.arc(eCx,eCy,eR+8,0,7); ctx.fill();
  const eGrad=ctx.createRadialGradient(eCx-eR*0.1,eCy-eR*0.1,eR*0.5,eCx,eCy,eR);
  eGrad.addColorStop(0,'#2a6aaa'); eGrad.addColorStop(0.7,'#1a4a80'); eGrad.addColorStop(1,'#0e2840');
  ctx.fillStyle=eGrad; ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.fill();
  const maxDrange=orb?2200:Math.max(400,drangeKm*1.3);
  const maxAltPx=mh*0.85;
  const altScale=maxAltPx/Math.max(maxAlt*1.2,50);
  const dScale=mw*0.8/maxDrange;
  const launchX=mx+mw*0.08, launchY=my+mh-8;
  if(orb){
    const orbAlt=maxAlt*0.95;
    const orbY=launchY-orbAlt*altScale;
    ctx.strokeStyle=themeRgba('readout',0.2); ctx.setLineDash([2,3]); ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(mx,orbY); ctx.lineTo(mx+mw,orbY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='7px ui-monospace,monospace'; ctx.fillStyle=themeRgba('readout',0.4); ctx.textAlign='right';
    ctx.fillText(Math.round(orbAlt)+' km',mx+mw-2,orbY-3);
    ctx.textAlign='left';
  }
  const curAlt=p*p*maxAlt;
  const curDrange=drangeKm*Math.pow(p,1.8);
  ctx.strokeStyle=themeRgba('readout',0.35); ctx.setLineDash([3,4]); ctx.lineWidth=0.8; ctx.beginPath();
  const steps=40;
  for(let i=0;i<=steps;i++){
    const f=i/steps;
    const fa=f*f*maxAlt;
    const fd=drangeKm*Math.pow(f,1.8);
    const px=launchX+fd*dScale, py=launchY-fa*altScale;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.stroke(); ctx.setLineDash([]);
  const curPx=launchX+curDrange*dScale, curPy=launchY-curAlt*altScale;
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=1.5; ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const f=i/steps*p;
    const fa=f*f*maxAlt;
    const fd=drangeKm*Math.pow(f,1.8);
    const px=launchX+fd*dScale, py=launchY-fa*altScale;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.stroke();
  ctx.fillStyle=themeColor('ignite'); ctx.beginPath(); ctx.arc(curPx,curPy,3,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,166,35,0.4)'; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(curPx,curPy,6,0,7); ctx.stroke();
  ctx.fillStyle=themeRgba('readout',0.5); ctx.beginPath(); ctx.arc(launchX,launchY,2,0,7); ctx.fill();
  ctx.font='7px ui-monospace,monospace'; ctx.fillStyle='rgba(200,210,220,0.5)'; ctx.textAlign='left';
  ctx.fillText('PAD',launchX+5,launchY-2);
  if(!orb){
    const apeF=0.7, apeAlt=apeF*apeF*maxAlt;
    const apeDrange=drangeKm*Math.pow(apeF,1.8);
    const apeX=launchX+apeDrange*dScale, apeY=launchY-apeAlt*altScale;
    ctx.strokeStyle=themeRgba('readout',0.3); ctx.setLineDash([1,2]); ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(apeX,apeY); ctx.lineTo(apeX,launchY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=themeRgba('readout',0.4); ctx.font='7px ui-monospace,monospace';
    ctx.fillText('APO',apeX+3,apeY-3);
    const splashX=launchX+drangeKm*dScale;
    ctx.fillStyle='rgba(88,196,122,0.5)'; ctx.beginPath(); ctx.arc(splashX,launchY,2,0,7); ctx.fill();
    ctx.fillStyle='rgba(88,196,122,0.4)'; ctx.fillText('SPLASH',splashX+4,launchY-2);
  } else if(p>0.85){
    ctx.fillStyle='rgba(88,196,122,0.5)'; ctx.font='7px ui-monospace,monospace';
    ctx.fillText('ORBIT',mx+mw-22,launchY-maxAlt*0.95*altScale-3);
  }
  ctx.font='7px ui-monospace,monospace'; ctx.fillStyle='rgba(200,210,220,0.35)'; ctx.textAlign='left';
  ctx.fillText('GROUND TRACK',mx+2,my+8);
  ctx.restore();
}
function drawOrbitalMiniMap(ctx,W,H,op,alt,pe,ap,fd){
  const mx=W-172, my=58, mw=155, mh=105;
  ctx.save();
  ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(mx-4,my-4,mw+8,mh+8);
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.lineWidth=0.5; ctx.strokeRect(mx-4,my-4,mw+8,mh+8);
  ctx.beginPath(); ctx.rect(mx,my,mw,mh); ctx.clip();
  const eCx=mx+mw*0.4, eCy=my+mh*0.5, eR=28;
  const eGrad=ctx.createRadialGradient(eCx-4,eCy-4,4,eCx,eCy,eR);
  eGrad.addColorStop(0,'#3a8cc7'); eGrad.addColorStop(0.6,'#1a4a80'); eGrad.addColorStop(1,'#0e2840');
  ctx.fillStyle=eGrad; ctx.beginPath(); ctx.arc(eCx,eCy,eR,0,7); ctx.fill();
  ctx.strokeStyle='rgba(100,180,255,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(eCx,eCy,eR+2,0,7); ctx.stroke();
  const orbScale=eR/6371;
  const peRpx=eR+pe*orbScale*8, apRpx=eR+ap*orbScale*8;
  const orbRpx=(peRpx+apRpx)/2;
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.setLineDash([2,3]); ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.arc(eCx,eCy,orbRpx,0,7); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=1.5;
  const orbArc=op*Math.PI*1.8;
  ctx.beginPath(); ctx.arc(eCx,eCy,orbRpx,-Math.PI/2,-Math.PI/2+orbArc); ctx.stroke();
  const craftAng=-Math.PI/2+orbArc;
  const craftX=eCx+Math.cos(craftAng)*orbRpx, craftY=eCy+Math.sin(craftAng)*orbRpx;
  ctx.fillStyle=themeColor('ignite'); ctx.beginPath(); ctx.arc(craftX,craftY,2.5,0,7); ctx.fill();
  ctx.strokeStyle='rgba(245,166,35,0.4)'; ctx.lineWidth=0.5; ctx.beginPath(); ctx.arc(craftX,craftY,5,0,7); ctx.stroke();
  const peAng=-Math.PI/2, apAng=Math.PI/2;
  const pePx=eCx+Math.cos(peAng)*peRpx, pePy=eCy+Math.sin(peAng)*peRpx;
  const apPx=eCx+Math.cos(apAng)*apRpx, apPy=eCy+Math.sin(apAng)*apRpx;
  ctx.fillStyle=themeRgba('readout',0.5); ctx.beginPath(); ctx.arc(pePx,pePy,1.5,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(apPx,apPy,1.5,0,7); ctx.fill();
  ctx.font='7px ui-monospace,monospace'; ctx.textAlign='center';
  ctx.fillStyle=themeRgba('readout',0.5); ctx.fillText('PE '+pe+'km',pePx,pePy-6);
  ctx.fillText('AP '+ap+'km',apPx,apPy+10);
  if(fd && fd.drangeKm){
    const launchAng=-Math.PI/2-0.05;
    const lx=eCx+Math.cos(launchAng)*(eR+1), ly=eCy+Math.sin(launchAng)*(eR+1);
    ctx.fillStyle='rgba(88,196,122,0.5)'; ctx.beginPath(); ctx.arc(lx,ly,1.5,0,7); ctx.fill();
    ctx.fillStyle='rgba(88,196,122,0.4)'; ctx.textAlign='left';
    ctx.fillText('PAD',lx+4,ly-2);
  }
  ctx.font='7px ui-monospace,monospace'; ctx.fillStyle='rgba(200,210,220,0.35)'; ctx.textAlign='left';
  ctx.fillText('ORBITAL MAP',mx+2,my+8);
  if(fd && fd.stages){
    ctx.fillStyle='rgba(200,210,220,0.3)'; ctx.font='6px ui-monospace,monospace';
    ctx.fillText('ASC: '+fd.curAlt+'km '+fd.finalVel+'m/s',mx+2,my+mh-14);
    ctx.fillText('STG: '+(fd.dropped+1)+'/'+fd.stages+' DR: '+fd.drangeKm+'km',mx+2,my+mh-6);
  }
  ctx.restore();
}
function drawStars(ctx,W,H,time){
  const A=animState;
  for(const st of A.stars){
    const twk=0.5+0.5*Math.sin((time||0)*0.002+st.twinkle);
    const alpha=st.b*twk;
    ctx.fillStyle=`rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.fillRect(st.x*W,st.y*H,st.s,st.s);
  }
}
function rndH(s){const x=Math.sin(s*127.1+0.7)*43758.5453;return x-Math.floor(x);}
/* A cloud built from several soft, sun-lit lobes over a shadowed underside.
   flatBase => cumulus seen from the side (puffy top, flat bottom);
   otherwise => a cloud top seen from above (rounded, irregular). Sun is up-and-to-the-right. */
function puffCloud(ctx,cx,cy,w,h,alpha,seed,flatBase){
  if(alpha<=0.004) return;
  const lobes=4+Math.floor(rndH(seed)*3);
  ctx.save();
  if(flatBase){
    ctx.globalAlpha=alpha*0.45;
    ctx.fillStyle='rgba(120,138,162,1)';
    ctx.beginPath(); ctx.ellipse(cx,cy+h*0.12,w*0.96,h*0.24,0,0,7); ctx.fill();
  } else {
    ctx.globalAlpha=alpha*0.32;
    ctx.fillStyle='rgba(86,106,136,1)';
    ctx.beginPath(); ctx.ellipse(cx-w*0.12,cy+h*0.28,w*0.74,h*0.55,0,0,7); ctx.fill();
  }
  for(let k=0;k<lobes;k++){
    const u=lobes>1?k/(lobes-1):0.5;
    const bell=Math.sin(u*Math.PI);
    const r=h*(0.35+0.65*bell)*(0.85+rndH(seed+k*3.3)*0.4);
    const lx=cx+(u-0.5)*1.7*w+(rndH(seed+k*1.7)-0.5)*0.26*w;
    const ly=flatBase ? cy-r*0.45-(1-bell)*h*0.16
                      : cy+(rndH(seed+k*5.1)-0.5)*h*0.6;
    const g=ctx.createRadialGradient(lx+r*0.34,ly-r*0.4,r*0.06,lx,ly,r);
    g.addColorStop(0,'rgba(255,255,255,0.97)');
    g.addColorStop(0.55,'rgba(244,248,253,0.7)');
    g.addColorStop(1,'rgba(232,238,247,0)');
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(lx,ly,r,0,7); ctx.fill();
  }
  ctx.restore();
}
function drawAscent(t,canFail){
  const A=animState,s=A.spec,ctx=A.ctx,W=A.cv.width,H=A.cv.height;
  const R=s.rng||{wind:0,windFreq:1,windPhase:0,pitchJitter:0,sep:[]};
  const p=clampA(t/A.ascentDur,0,1);
  const orb=s.isOrbital||s.isCislunar;
  const maxA=orb?185:clampA(s.reqDv*0.045,40,150);
  const maxV=orb?7800:clampA(s.reqDv*0.85,700,4000);
  const altFrac=Math.pow(p,1.5);
  const curAlt=altFrac*maxA;
  const curVel=Math.pow(p,1.3)*maxV;
  const qNorm = p<0.15 ? p/0.15 : p<0.35 ? 1 : p<0.55 ? 1-(p-0.35)/0.2 : 0;
  const maxQ = 35 + s.reqDv*0.003;
  const throttle = (p>0.12 && p<0.40) ? clampA(1 - qNorm*0.25, 0.65, 1.0) : 1.0;
  const accel = (1 + p*2.5) * throttle;
  const g=ctx.createLinearGradient(0,0,0,H);
  const skyP=smooth(clampA(p/0.7,0,1));
  if(skyP<0.3){
    g.addColorStop(0,mix('#1a3a5e','#0e2040',skyP/0.3));
    g.addColorStop(0.5,mix('#2a5580','#142a48',skyP/0.3));
    g.addColorStop(1,mix('#3a6a9e','#1a3858',skyP/0.3));
  } else if(skyP<0.6){
    const sp=(skyP-0.3)/0.3;
    g.addColorStop(0,mix('#0e2040','#060e18',sp));
    g.addColorStop(0.5,mix('#142a48','#080f1a',sp));
    g.addColorStop(1,mix('#1a3858','#0a1420',sp));
  } else {
    const sp=(skyP-0.6)/0.4;
    g.addColorStop(0,mix('#060e18','#04060a',sp));
    g.addColorStop(1,mix('#0a1420','#04060a',sp));
  }
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  if(p>0.15){
    const starAlpha=clampA((p-0.15)/0.4,0,0.85);
    ctx.globalAlpha=starAlpha; drawStars(ctx,W,H,t); ctx.globalAlpha=1;
  }
  /* === Side-tracking liftoff camera: ground + horizon + clouds.
     The horizon is present from liftoff and grows more curved with altitude;
     the ground recedes but the horizon stays in frame the whole ascent. === */
  const altN = clampA(curAlt/(orb?120:Math.max(50,maxA*0.9)),0,1);   // 0 on the pad, ~1 high up
  // Horizon drops in frame (we look down on more of the Earth) and curves harder as we climb.
  const horizonY = H*0.50 + smooth(altN)*(H*0.30);
  const curveR   = 1000 + 30000*Math.pow(1-altN,1.6);                // huge R = flat; small R = strong curve
  const horizCY  = horizonY + curveR;                                // arc centre, far below the frame
  // --- Earth surface below the horizon arc ---
  // Fill the disc directly (no clip): clipping here would leave stencil bits set
  // that bleed into the HUD mini-map's own clip and flood the scene with its globe.
  const surf=ctx.createLinearGradient(0,horizonY,0,H);
  surf.addColorStop(0,    mix('#84937a','#327ab8',altN));            // hazy land near horizon -> ocean blue
  surf.addColorStop(0.12, mix('#4d5a39','#206099',altN));
  surf.addColorStop(0.5,  mix('#2d3621','#15436f',altN));
  surf.addColorStop(1,    mix('#15130c','#0c2238',altN));            // dark foreground earth -> deep limb
  ctx.fillStyle=surf; ctx.beginPath(); ctx.arc(W/2,horizCY,curveR,0,7); ctx.fill();
  // cloud tops over the surface (denser and brighter the higher we are — looking down on the deck)
  for(let i=0;i<13;i++){
    const cx=W*(((i*0.173+0.03+t*0.000004*((i%3)+1))%1));
    const depth=((i*7)%5)/5;                                         // 0 near horizon .. 1 deep below
    let cy=horizonY+10+depth*(H-horizonY)*0.92;
    const dx=cx-W/2;                                                 // keep clouds on the Earth side of the curved horizon
    if(curveR*curveR>dx*dx){ const hAtX=horizCY-Math.sqrt(curveR*curveR-dx*dx); if(cy<hAtX+6) cy=hAtX+6; }
    const cw=(11+(i%3)*9)*(0.6+depth);
    const ca=clampA((0.12+0.16*altN)*(0.6+0.5*depth),0,0.7);
    puffCloud(ctx,cx,cy,cw,cw*0.42,ca,i*4.7+1,false);
  }
  // night side / terminator shading once we are high enough to see Earth's shadow (fill the disc, stays on Earth)
  if(altN>0.5){
    const nA=clampA((altN-0.5)/0.5,0,1)*0.55;
    const tg=ctx.createLinearGradient(0,0,W,0);
    tg.addColorStop(0,`rgba(2,4,12,${nA})`);
    tg.addColorStop(0.5,`rgba(2,4,12,${(nA*0.4).toFixed(3)})`);
    tg.addColorStop(1,'rgba(2,4,12,0)');
    ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(W/2,horizCY,curveR,0,7); ctx.fill();
  }
  // --- horizon limb: a crisp edge plus an atmospheric glow rising into the sky ---
  const limbA=clampA(0.4+altN*0.5,0,0.92);
  const limbLayers=[[1,'150,210,255',0.34],[4,'110,185,255',0.22],[9,'80,160,240',0.13],[16,'60,135,215',0.07],[26,'50,115,195',0.035]];
  for(let li=0;li<limbLayers.length;li++){
    const off=limbLayers[li][0], col=limbLayers[li][1], a=limbLayers[li][2];
    ctx.strokeStyle=`rgba(${col},${(a*limbA).toFixed(3)})`;
    ctx.lineWidth=off<2?1.5:off*0.55;
    ctx.beginPath(); ctx.arc(W/2,horizCY,curveR+off,0,7); ctx.stroke();          // +off rises into the sky
  }
  ctx.strokeStyle=`rgba(205,228,255,${(0.5*limbA).toFixed(3)})`; ctx.lineWidth=1.3;
  ctx.beginPath(); ctx.arc(W/2,horizCY,curveR,0,7); ctx.stroke();
  // --- distant cumulus sitting along the horizon (fade out as the air thins) ---
  const skyCloudA=clampA(1-altN*1.25,0,1);
  if(skyCloudA>0.02){
    for(let i=0;i<7;i++){
      const cx=W*(((i*0.241+0.05+t*0.000006)%1));
      const cw=22+(i%4)*16;
      const cy=horizonY-8-(i%3)*13;
      puffCloud(ctx,cx,cy,cw,cw*0.5,skyCloudA*0.55,i*5.3+2,true);
    }
  }
  // --- launch pad + tower, planted on the ground, receding as the camera follows the rocket up ---
  const padGroundY=(H-18)+smooth(clampA(p/0.32,0,1))*(H*0.95);
  if(padGroundY<H+40){
    ctx.fillStyle=`rgba(18,14,9,${clampA(1-altN*1.4,0,1).toFixed(3)})`;
    ctx.fillRect(0,padGroundY,W,H-padGroundY+80);
    const grd=ctx.createLinearGradient(0,padGroundY-2,0,padGroundY+10);
    grd.addColorStop(0,'#46341a'); grd.addColorStop(1,'#1a1208');
    ctx.fillStyle=grd; ctx.fillRect(0,padGroundY-2,W,12);
    const towerX=W*0.28-18, towerH=110, towerW=8;
    const towerTop=padGroundY-towerH;
    ctx.fillStyle='#3a3a3e'; ctx.fillRect(towerX-towerW/2,towerTop,towerW,towerH);
    for(let ly=0;ly<towerH;ly+=8){
      ctx.strokeStyle='rgba(90,90,100,0.5)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(towerX-towerW/2,towerTop+ly); ctx.lineTo(towerX+towerW/2,towerTop+ly+8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(towerX+towerW/2,towerTop+ly); ctx.lineTo(towerX-towerW/2,towerTop+ly+8); ctx.stroke();
    }
    ctx.fillStyle='#4a4a50'; ctx.fillRect(towerX-towerW/2-1,towerTop,towerW+2,3);
    ctx.fillStyle='#555'; ctx.fillRect(towerX-0.5,towerTop-14,1,14);
    ctx.fillStyle='#e03030'; ctx.beginPath(); ctx.arc(towerX,towerTop-14,2,0,7); ctx.fill();
    if(p<0.04){
      const armY1=padGroundY-towerH*0.65, armY2=padGroundY-towerH*0.40;
      const armRetract=clampA(p/0.03,0,1);
      const armLen=22-armRetract*18;
      ctx.fillStyle='#505058'; ctx.fillRect(towerX+towerW/2,armY1-1.5,armLen,3);
      ctx.fillStyle='#505058'; ctx.fillRect(towerX+towerW/2,armY2-1.5,armLen,3);
      ctx.fillStyle='#606068';
      ctx.fillRect(towerX+towerW/2+armLen-2,armY1-3,3,6);
      ctx.fillRect(towerX+towerW/2+armLen-2,armY2-3,3,6);
    }
    const padLeft=W*0.27-30, padRight=W*0.27+30;
    ctx.fillStyle='#2a2a2e'; ctx.fillRect(padLeft,padGroundY-3,padRight-padLeft,5);
    ctx.fillStyle='#1a1a1e'; ctx.fillRect(padLeft+8,padGroundY+2,padRight-padLeft-16,12);
    ctx.fillStyle='rgba(255,80,20,'+clampA(0.25-p*2,0,0.25)+')';
    ctx.beginPath(); ctx.arc(W*0.27,padGroundY+8,6+p*30,0,7); ctx.fill();
    ctx.fillStyle='rgba(180,180,190,'+clampA(0.4-p*3,0,0.4)+')';
    for(let si=0;si<3;si++){
      const sx=W*0.27-12+si*12, sy=padGroundY+2;
      ctx.beginPath(); ctx.arc(sx,sy+4+Math.random()*3,5+Math.random()*8+p*40,0,7); ctx.fill();
    }
  }
  const shakeAmt = qNorm * 2.5;
  A.shakeX = (Math.random()-0.5)*shakeAmt;
  A.shakeY = (Math.random()-0.5)*shakeAmt;
  if(!A.shape) A.shape=buildVehicleShape(s);
  // Match the Cape pad's physical scale (VEH_BASE_PX_PER_UNIT === pad's PAD_ROCKET_K) instead of the
  // old independent fit-to-frame heuristic, then keep the existing 50..190px heavy-vehicle safety clamp
  // as an outer bound so oversized rockets still can't overflow the ascent frame.
  const shape=A.shape, drawnPx=clampA(shape.totalH*VEH_BASE_PX_PER_UNIT,50,190), scale=drawnPx/shape.totalH;
  const baseY=(H-28)-altFrac*(H-66);
  const finalPitch=(orb?1.12:0.55)+R.pitchJitter;
  const pp=clampA((p-0.06)/0.94,0,1), pitch=Math.pow(pp,1.8)*finalPitch;
  const downrange=(W*0.05 + W*0.20*(finalPitch/1.2))*Math.pow(pp,1.8);
  const wind=(R.wind||0)*30*Math.sin(p*6.283*(R.windFreq||1)+(R.windPhase||0))*p;
  const x=W*0.28+downrange+wind;
  const n=s.stages.length; let dropped=0; const seps=[];
  for(let i=1;i<n;i++){ const thr=clampA(i/(n+0.25)+((R.sep&&R.sep[i])||0),0.12,0.95); seps.push(thr); if(p>thr) dropped++; }
  const remaining=shape.segs.slice(dropped);
  A.rocketX=x; A.rocketY=baseY; A.pitch=pitch; A.throttle=throttle; A.altFrac=altFrac; A.dropped=dropped; // expose for native Phaser particle FX
  const exploding=canFail&&p>=0.5;
  A.exploding=exploding; A.ascentP=p; // expose for the Phaser FX layer (camera shake)
  // Slice 2: publish ascent atmospherics for the native FX layer (clouds / vapor cone / scattering / star fade)
  A.ascentPhase=true; A.qNorm=qNorm; A.altN=altN; A.horizonY=horizonY;
  const fairingSep = orb && p>0.45 && !A.fairingSep;
  if(fairingSep){ A.fairingSep=t; sfxSep(); }
  const fairingGone = A.fairingSep && (t-A.fairingSep)>0;
  sfxUpdateEngine(throttle, altFrac);
  for(let d=0;d<dropped;d++){
    if(!A.sfxSepFired[d]){ A.sfxSepFired[d]=true; sfxSep(); }
  }
  if(exploding&&!A.sfxBoomFired){ A.sfxBoomFired=true; sfxEngineOff(); sfxBoom(); }
  ctx.save();
  ctx.translate(A.shakeX, A.shakeY);
  if(!A.fxNative && p<0.5 && !exploding){
    let ti=A.trail.length;
    while(ti-->0){
      const tr=A.trail[ti];
      tr.life-=0.012;
      tr.x+=tr.vx; tr.y+=tr.vy; tr.vy+=0.01; tr.r+=0.3;
      if(tr.life<=0){ A.trail[ti]=A.trail[A.trail.length-1]; A.trail.pop(); continue; }
      ctx.fillStyle=`rgba(${tr.c},${(tr.life*0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(tr.x,tr.y,tr.r,0,7); ctx.fill();
    }
    if(!exploding && t-A.lastT>15 && (A.ignite==null || A.ignite>0.05)){
      const trX=x+Math.sin(pitch)*5, trY=baseY+Math.cos(pitch)*5;
      for(let j=0;j<2;j++){
        A.trail.push({
          x:trX+(Math.random()-0.5)*6,y:trY+(Math.random()-0.5)*4,
          vx:(Math.random()-0.5)*0.3-Math.sin(pitch)*0.2, vy:0.2+Math.random()*0.3,
          r:3+Math.random()*4, life:0.7+Math.random()*0.3,
          c: p<0.08 ? '200,180,160' : '120,110,100'
        });
      }
    }
  }
  if(dropped>0 && !exploding){
    for(let d=0;d<dropped;d++){
      const sepTime=seps[d];
      const dt=(p-sepTime)*A.ascentDur;
      if(d===0 && A.recovering){ drawRecoveryStage(ctx, shape.segs[0], x, baseY, dt, scale, altFrac, pitch); continue; }
      if(dt<1200){
        const spent=shape.segs[d];
        const sepProgress=dt/1200;
        const sepX=x-15*sepProgress-dt*0.015;
        const sepY=baseY+dt*0.04+sepProgress*sepProgress*30;
        const sepRot=pitch+sepProgress*0.6*(d%2?1:-1);
        ctx.save();
        ctx.translate(sepX,sepY); ctx.rotate(sepRot);
        ctx.globalAlpha=clampA(1-sepProgress,0,1);
        drawVehicle(ctx,[spent],'none',scale*0.95,0,altFrac);
        ctx.globalAlpha=1;
        ctx.restore();
        if(dt<200){
          const sparkN=4;
          for(let si=0;si<sparkN;si++){
            const sa=Math.random()*6.28, sd=5+Math.random()*12;
            ctx.fillStyle=`rgba(255,200,100,${0.6-dt/400})`;
            ctx.fillRect(sepX+Math.cos(sa)*sd,sepY+Math.sin(sa)*sd,2,2);
          }
        }
      }
    }
  }
  if(fairingGone && A.fairingSep){
    const fdt=t-A.fairingSep;
    if(fdt<1500){
      const fp=fdt/1500;
      const tw=shape.segs[shape.segs.length-1].w*scale;
      ctx.save(); ctx.translate(x,baseY); ctx.rotate(pitch);
      const topY=-shape.totalH*scale;
      ctx.globalAlpha=clampA(1-fp,0,1);
      ctx.fillStyle='#cdd6db';
      ctx.save(); ctx.translate(-tw*0.5-fp*20,topY-fp*10); ctx.rotate(-fp*0.5);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(tw*0.15,-16*scale,tw*0.25,0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(tw*0.5+fp*20,topY-fp*8); ctx.rotate(fp*0.5);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(-tw*0.15,-16*scale,-tw*0.25,0); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha=1;
      ctx.restore();
    }
  }
  // strap-on boosters: lit alongside the core through the boost phase, then jettisoned
  if(shape.boosters && shape.boosters.count>0 && !exploding){
    const BOOST_SEP=0.14, base0=shape.segs[0];
    if(p<=BOOST_SEP){
      ctx.save(); ctx.translate(x,baseY); ctx.rotate(pitch);
      const bflame=A.fxNative?0:(p>0.05?(9+Math.random()*7)*throttle:0);
      drawStrapOns(ctx, base0, shape.boosters, scale, bflame, altFrac, A.fxNative&&p>0.04);
      ctx.restore();
    } else {
      const bdt=(p-BOOST_SEP)*A.ascentDur;
      if(bdt<1500){
        const bp2=bdt/1500, bw=base0.w*scale, boostW=shape.boosters.w*scale, boostH=shape.boosters.h*scale;
        const outX=bw/2+boostW/2+Math.max(1,boostW*0.14);
        if(!A.sfxBoostSep){ A.sfxBoostSep=true; sfxSep(); }
        [-1,1].forEach(side=>{
          ctx.save();
          ctx.translate(x+side*outX+side*bdt*0.05, baseY+bdt*0.045+bp2*bp2*36);
          ctx.rotate(pitch+side*bp2*0.7);
          ctx.globalAlpha=clampA(1-bp2,0,1);
          drawOneBooster(ctx, boostW, boostH, scale, 0, altFrac, true, 0.95, shape.boosters.solid);
          ctx.globalAlpha=1; ctx.restore();
        });
        if(bdt<220){ for(let si=0;si<6;si++){ const sa=Math.random()*6.28, sd=6+Math.random()*14;
          ctx.fillStyle=`rgba(255,200,100,${0.6-bdt/400})`; ctx.fillRect(x+Math.cos(sa)*sd, baseY+Math.sin(sa)*sd, 2,2); } }
      }
    }
  }
  if(!exploding){
    ctx.save(); ctx.translate(x,baseY); ctx.rotate(pitch);
    const flameSize=A.fxNative?0:(10+Math.random()*8)*throttle*(1+p*0.5)*(A.ignite==null?1:A.ignite); // Slice A: ignite ramps 0→1 through the pad phase; always 1 once ascent is underway
    const noseType = (fairingGone && shape.nose==='fairing') ? 'none' : shape.nose;
    drawVehicle(ctx, remaining.length?remaining:[shape.segs[shape.segs.length-1]], noseType, scale, flameSize, altFrac, (A.fxNative && p>0.04)); // hide engine bells once lifted off (native plume covers the base)
    ctx.restore();
  } else {
    drawBoom(ctx,x,baseY-18,t-A.ascentDur*0.5);
  }
  ctx.restore();
  if(p>0.02 && p<0.3 && !exploding){
    const condensation = qNorm>0.5;
    if(condensation){
      ctx.save();
      const cx0=x+Math.cos(pitch+Math.PI/2)*20, cy0=baseY+Math.sin(pitch+Math.PI/2)*20;
      ctx.globalAlpha=qNorm*0.15;
      ctx.fillStyle='#ffffff';
      for(let c=0;c<3;c++){
        ctx.beginPath(); ctx.arc(cx0+(Math.random()-0.5)*15,cy0+(Math.random()-0.5)*10,8+Math.random()*6,0,7); ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.restore();
    }
  }
  if(p>0.55 && orb && !exploding){
    const burnA=clampA((p-0.55)/0.1,0,0.5);
    ctx.fillStyle=themeRgba('readout',burnA*0.3);
    ctx.beginPath(); ctx.arc(x,baseY,3,0,7); ctx.fill();
  }
  const tPlus=Math.round(p*(orb?520:180));
  const tMin=Math.floor(tPlus/60), tSec=(tPlus%60).toString().padStart(2,'0');
  const pitchDeg=pitch*180/Math.PI;
  const vVert=Math.round(curVel*Math.cos(Math.min(pitch,1.2)));
  const vHoriz=Math.round(curVel*Math.sin(Math.min(pitch,1.2)));
  const drangeKm=Math.round(downrange/W*800);
  const telData=[
    {label:'T+', value:`${tMin}:${tSec}`, color:themeColor('readout')},
    {label:'ALT', value:Math.round(curAlt)+' km'},
    {label:'SPEED', value:Math.round(curVel).toLocaleString()+' m/s'},
    {label:'Vx', value:vHoriz.toLocaleString()+' m/s', color:themeColor('readout')},
    {label:'Vy', value:vVert.toLocaleString()+' m/s', color:themeColor('readout')},
    {label:'ACC', value:accel.toFixed(1)+' g'},
    {label:'Q', value:Math.round(qNorm*maxQ)+' kPa', color:qNorm>0.8?themeColor('bad'):(qNorm>0.5?themeColor('ignite'):themeColor('ink'))},
    {label:'DRANGE', value:drangeKm+' km'},
    {label:'THROT', value:Math.round(throttle*100)+'%', color:throttle<0.9?themeColor('ignite'):themeColor('ink')},
    {label:'STAGE', value:(Math.min(dropped+1,n))+'/'+n}
  ];
  drawTelemetry(telData);
  drawMiniMap(ctx,W,H,p,orb,maxA,orb?2000:Math.max(300,drangeKm*1.2),pitch);
  ctx.save();
  const rpW=155, rpH=s.crewed?58:42, rpX=W-rpW-10, rpY=8;
  ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(rpX,rpY,rpW,rpH);
  ctx.strokeStyle=themeRgba('readout',0.25); ctx.lineWidth=0.5; ctx.strokeRect(rpX,rpY,rpW,rpH);
  ctx.font='9px ui-monospace,monospace'; ctx.textBaseline='top'; ctx.textAlign='right';
  ctx.fillStyle=themeColor('dim'); ctx.fillText('MISSION', W-18, rpY+6);
  ctx.fillStyle=themeColor('ink'); ctx.font='bold 12px ui-monospace,monospace';
  ctx.fillText(s.title, W-18, rpY+20);
  if(s.crewed){ ctx.fillStyle=themeColor('ignite'); ctx.font='10px ui-monospace,monospace'; ctx.fillText('▲ CREWED FLIGHT', W-18, rpY+38); }
  ctx.textAlign='left';
  ctx.restore();
  const phaseTxt = exploding ? 'VEHICLE LOST' :
    (p<0.06 ? 'LIFTOFF' :
     (p<0.15 ? 'CLEARING THE TOWER' :
      (qNorm>0.7 ? 'MAX-Q' :
       (fairingGone && t-A.fairingSep<1500 ? 'FAIRING SEP' :
        (dropped>0 && (p-seps[dropped-1])*A.ascentDur<800 ? 'STAGE SEPARATION' :
         (p>0.92 ? (orb?'ORBITAL INSERTION':'BURNOUT') :
          'ASCENT · STAGE '+(Math.min(dropped+1,n))))))));
  const phaseColor = exploding ? themeColor('bad') : (qNorm>0.7 ? themeColor('ignite') : (p>0.92 ? themeColor('ok') : themeColor('readout')));
  drawPhaseBar(phaseTxt, phaseColor, p);

  A.flightData={
    maxAlt:maxA, curAlt:Math.round(curAlt), finalVel:Math.round(curVel),
    vx:vHoriz, vy:vVert, drangeKm, pitch, maxQ:Math.round(qNorm*maxQ),
    stages:n, dropped, orb, tPlus,
    accel:parseFloat(accel.toFixed(1)), throttle:Math.round(throttle*100)
  };
}
function earthLimb(ctx,W,H,detailed,sunAngle){
  const cx=W/2,cy=H*2.3,r=H*2.0;
  const sa=sunAngle!=null?sunAngle:-0.6;
  const sunX=Math.cos(sa),sunY=Math.sin(sa);
  if(detailed){
    const grd=ctx.createRadialGradient(cx+sunX*r*0.18,cy+sunY*r*0.12,r*0.15,cx,cy,r);
    grd.addColorStop(0,'#4da8d8'); grd.addColorStop(0.2,'#3a92c7');
    grd.addColorStop(0.4,'#2b78b0'); grd.addColorStop(0.6,'#1e5c95');
    grd.addColorStop(0.8,'#154578'); grd.addColorStop(1,'#0e2840');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    const tealGrd=ctx.createRadialGradient(cx+sunX*r*0.12,cy+sunY*r*0.08,r*0.02,cx+sunX*r*0.12,cy+sunY*r*0.08,r*0.35);
    tealGrd.addColorStop(0,'rgba(50,160,180,0.25)');
    tealGrd.addColorStop(0.5,'rgba(40,130,155,0.12)');
    tealGrd.addColorStop(1,'rgba(40,130,155,0)');
    ctx.fillStyle=tealGrd; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    const edgeGrd=ctx.createRadialGradient(cx,cy,r*0.6,cx,cy,r);
    edgeGrd.addColorStop(0,'rgba(0,0,0,0)');
    edgeGrd.addColorStop(0.7,'rgba(8,20,50,0.15)');
    edgeGrd.addColorStop(1,'rgba(5,12,30,0.3)');
    ctx.fillStyle=edgeGrd; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.clip();
    const nightCX=cx-sunX*r*0.6,nightCY=cy-sunY*r*0.3;
    const termGrd=ctx.createRadialGradient(nightCX,nightCY,r*0.05,nightCX,nightCY,r*0.85);
    termGrd.addColorStop(0,'rgba(2,3,10,0.7)');
    termGrd.addColorStop(0.4,'rgba(2,3,10,0.35)');
    termGrd.addColorStop(0.8,'rgba(2,3,10,0.08)');
    termGrd.addColorStop(1,'rgba(2,3,10,0)');
    ctx.fillStyle=termGrd; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    ctx.fillStyle='rgba(160,130,75,0.3)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.06,cy-r*0.02,r*0.1,r*0.07,0.12,0,7); ctx.fill();
    ctx.fillStyle='rgba(145,118,65,0.27)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.04,cy-r*0.015,r*0.08,r*0.055,-0.05,0,7); ctx.fill();
    ctx.fillStyle='rgba(135,108,58,0.24)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.085,cy-r*0.008,r*0.055,r*0.05,0.3,0,7); ctx.fill();
    /* Sahara/N.Africa desert */
    ctx.fillStyle='rgba(195,165,105,0.22)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.035,cy-r*0.03,r*0.07,r*0.022,0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(185,155,95,0.18)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.06,cy-r*0.035,r*0.04,r*0.015,0.2,0,7); ctx.fill();
    /* Tropical Africa (darker green near equator) */
    ctx.fillStyle='rgba(50,95,35,0.22)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.055,cy-r*0.005,r*0.04,r*0.025,0.15,0,7); ctx.fill();
    /* East Africa highlands */
    ctx.fillStyle='rgba(85,105,50,0.2)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.1,cy-r*0.003,r*0.025,r*0.04,0.2,0,7); ctx.fill();
    /* Arabian peninsula */
    ctx.fillStyle='rgba(175,150,95,0.24)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.125,cy-r*0.035,r*0.035,r*0.03,0.5,0,7); ctx.fill();
    ctx.fillStyle='rgba(185,158,100,0.18)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.13,cy-r*0.03,r*0.022,r*0.022,0.4,0,7); ctx.fill();
    /* --- Europe (green, above and left of Africa) --- */
    ctx.fillStyle='rgba(72,125,55,0.24)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.02,cy-r*0.05,r*0.065,r*0.022,0.2,0,7); ctx.fill();
    ctx.fillStyle='rgba(82,135,62,0.2)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.005,cy-r*0.055,r*0.045,r*0.016,-0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(68,115,52,0.18)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.045,cy-r*0.052,r*0.03,r*0.013,0.35,0,7); ctx.fill();
    ctx.fillStyle='rgba(75,120,55,0.16)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.02,cy-r*0.046,r*0.028,r*0.02,0.0,0,7); ctx.fill();
    /* --- India subcontinent --- */
    ctx.fillStyle='rgba(90,130,60,0.22)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.16,cy-r*0.02,r*0.02,r*0.035,0.15,0,7); ctx.fill();
    ctx.fillStyle='rgba(140,120,70,0.18)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.155,cy-r*0.03,r*0.018,r*0.02,0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(80,120,55,0.16)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.165,cy-r*0.012,r*0.012,r*0.022,0.2,0,7); ctx.fill();
    /* --- South America (green, left edge) --- */
    ctx.fillStyle='rgba(55,120,48,0.28)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.18,cy-r*0.015,r*0.045,r*0.08,-0.15,0,7); ctx.fill();
    ctx.fillStyle='rgba(48,108,42,0.24)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.17,cy-r*0.005,r*0.038,r*0.065,-0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(42,98,38,0.22)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.19,cy-r*0.028,r*0.03,r*0.045,-0.2,0,7); ctx.fill();
    /* Amazon (dark green) */
    ctx.fillStyle='rgba(32,82,28,0.22)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.17,cy-r*0.008,r*0.028,r*0.035,0.0,0,7); ctx.fill();
    /* Andes */
    ctx.fillStyle='rgba(105,88,58,0.18)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.195,cy-r*0.015,r*0.008,r*0.055,-0.12,0,7); ctx.fill();
    /* --- Small islands/features --- */
    ctx.fillStyle='rgba(70,115,50,0.15)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.14,cy-r*0.055,r*0.012,r*0.008,0.3,0,7); ctx.fill();
    ctx.fillStyle='rgba(75,120,55,0.14)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.1,cy-r*0.06,r*0.015,r*0.01,0.1,0,7); ctx.fill();
    /* --- Polar regions --- */
    ctx.fillStyle='rgba(220,232,242,0.18)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.01,cy-r*0.085,r*0.08,r*0.018,0.05,0,7); ctx.fill();
    ctx.fillStyle='rgba(210,225,238,0.12)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.02,cy+r*0.015,r*0.1,r*0.015,0.0,0,7); ctx.fill();
    const glintX=cx+sunX*r*0.12,glintY=cy+sunY*r*0.08;
    const glintGrd=ctx.createRadialGradient(glintX,glintY,r*0.005,glintX,glintY,r*0.06);
    glintGrd.addColorStop(0,'rgba(255,255,255,0.2)');
    glintGrd.addColorStop(0.4,'rgba(200,230,255,0.08)');
    glintGrd.addColorStop(1,'rgba(200,230,255,0)');
    ctx.fillStyle=glintGrd; ctx.beginPath(); ctx.arc(glintX,glintY,r*0.06,0,7); ctx.fill();
    /* --- Clouds (15 formations) --- */
    /* Large spiral weather systems */
    ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.08,cy-r*0.03,r*0.08,r*0.025,0.4,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.075,cy-r*0.035,r*0.06,r*0.03,0.7,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.07,cy-r*0.028,r*0.04,r*0.02,1.0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.14,cy-r*0.06,r*0.06,r*0.02,0.3,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.09)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.135,cy-r*0.065,r*0.04,r*0.025,0.6,0,7); ctx.fill();
    /* Long thin cloud bands */
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.02,cy-r*0.06,r*0.1,r*0.008,0.15,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.05,cy-r*0.015,r*0.12,r*0.006,-0.1,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.12,cy-r*0.04,r*0.08,r*0.007,0.25,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.09)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.1,cy-r*0.04,r*0.09,r*0.005,-0.2,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.05,cy-r*0.07,r*0.07,r*0.006,0.35,0,7); ctx.fill();
    /* Small puffy cloud clusters */
    ctx.fillStyle='rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.02,cy-r*0.045,r*0.015,r*0.012,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.14,cy-r*0.01,r*0.012,r*0.01,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.08,cy-r*0.07,r*0.01,r*0.008,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.06,cy-r*0.02,r*0.013,r*0.011,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.11)';
    ctx.beginPath(); ctx.ellipse(cx+r*0.18,cy-r*0.03,r*0.01,r*0.008,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(240,245,255,0.13)';
    ctx.beginPath(); ctx.ellipse(cx-r*0.16,cy-r*0.05,r*0.011,r*0.009,0,0,7); ctx.fill();
    ctx.restore();
    /* --- Atmosphere glow (6 concentric layers) --- */
    /* inner bright blue-white limb */
    ctx.strokeStyle='rgba(150,210,255,0.3)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx,cy,r+1,0,7); ctx.stroke();
    /* bright blue */
    ctx.strokeStyle='rgba(110,185,255,0.22)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(cx,cy,r+4,0,7); ctx.stroke();
    /* medium blue */
    ctx.strokeStyle='rgba(80,160,240,0.16)'; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.arc(cx,cy,r+8,0,7); ctx.stroke();
    /* softer blue */
    ctx.strokeStyle='rgba(65,140,220,0.1)'; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(cx,cy,r+14,0,7); ctx.stroke();
    /* outer haze */
    ctx.strokeStyle='rgba(55,120,200,0.06)'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(cx,cy,r+22,0,7); ctx.stroke();
    /* very subtle outer scatter */
    ctx.strokeStyle='rgba(50,110,190,0.03)'; ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(cx,cy,r+32,0,7); ctx.stroke();
  } else {
    const grd=ctx.createRadialGradient(cx,cy,r*0.78,cx,cy,r);
    grd.addColorStop(0,'#2b6cb0'); grd.addColorStop(1,'#15324f');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    ctx.strokeStyle='rgba(120,180,240,0.35)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.stroke();
  }
  return {cx,cy,r};
}
function spaceBg(ctx,W,H,time,skipStars){
  ctx.fillStyle='#04060a'; ctx.fillRect(0,0,W,H);
  if(!skipStars) drawStars(ctx,W,H,time||0); // skipped when the Phaser scene paints a native parallax starfield
}
function drawOrbit(ct){
  const A=animState,s=A.spec,ctx=A.ctx,W=A.cv.width,H=A.cv.height,R=s.rng||{bow:0,pitchJitter:0};
  const time=ct+A.ascentDur;
  spaceBg(ctx,W,H,time,A.nativeStars); // native parallax stars replace the canvas ones when the Phaser scene is live
  const sunA=-0.6+time*0.0003;
  const E=earthLimb(ctx,W,H,true,sunA);
  A.earthGeom={cx:E.cx,cy:E.cy,r:E.r,sunA}; A.earthPhase=true; // hand the limb geometry to the native Earth FX layer
  const op=clampA(ct/A.cruiseDur,0,1);
  const orbitR=E.r+68+(R.bow||0)*16;
  const peR=orbitR-8, apR=orbitR+12;
  const a0=Math.PI*(1.16+(R.pitchJitter||0)*0.12), a1=a0+Math.PI*0.72;
  const deepFail=!s.success&&s.failPhase==='deep';
  const failP=deepFail?0.42:null;
  if(A.sfxEnginePhase==='ascent'){ sfxStop(); A.sfxEnginePhase='orbit'; }
  const burning=op<0.15;
  if(burning&&A.sfxEnginePhase!=='burn'){ A.sfxEnginePhase='burn'; sfxBurn(0.6); }
  else if(!burning&&A.sfxEnginePhase==='burn'){ sfxStop(); A.sfxEnginePhase='coast'; }
  if(failP!=null&&op>=failP&&!A.sfxBoomFired){ A.sfxBoomFired=true; sfxStop(); sfxBoom(); }
  ctx.strokeStyle=themeRgba('readout',0.15); ctx.setLineDash([3,6]); ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(E.cx,E.cy,orbitR,a0-0.3,a1+0.5); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle=themeRgba('readout',0.08); ctx.lineWidth=1; ctx.setLineDash([2,4]);
  ctx.beginPath(); ctx.arc(E.cx,E.cy,peR,a0,a1); ctx.stroke();
  ctx.beginPath(); ctx.arc(E.cx,E.cy,apR,a0,a1); ctx.stroke();
  ctx.setLineDash([]);
  const curP = failP!=null ? Math.min(op,failP) : op;
  // Reentering flights spend the last stretch of the orbit phase DEORBITING: a retrograde
  // burn, then a trajectory that peels off the circular orbit and descends toward the limb —
  // so the return is shown on the map, then handed to the close-up reentry scene.
  const willReenter = A.reentryDur>0 && s.success;
  const DEORBIT_START=0.80; // fraction of the orbit phase where the deorbit sequence begins
  const deorbiting = willReenter && op>=DEORBIT_START && failP==null;
  const curAng=a0+ (deorbiting?DEORBIT_START:curP) *(a1-a0);
  // completed orbit track up to the deorbit point
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(E.cx,E.cy,orbitR,a0,curAng); ctx.stroke();
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(E.cx,E.cy,orbitR,a0,curAng); ctx.stroke();
  let cx=E.cx+Math.cos(curAng)*orbitR, cy=E.cy+Math.sin(curAng)*orbitR;
  let deorbitBurning=false, entryInterface=false;
  if(deorbiting){
    // dp: 0 at deorbit burn → 1 at entry interface (the handoff point to drawReentry)
    const dp=clampA((op-DEORBIT_START)/(1-DEORBIT_START),0,1);
    deorbitBurning = dp<0.22;                 // retrograde burn kicks it out of orbit
    entryInterface = dp>0.9;
    // descending trajectory: spiral inward from orbitR toward the atmosphere interface (limb+~10)
    const entryR=E.r+10, endAng=curAng+0.62;  // travels ~0.6 rad downrange while dropping in
    const dr=(u)=>orbitR+(entryR-orbitR)*(u*u); // ease-in fall (accelerating descent)
    const da=(u)=>curAng+(endAng-curAng)*u;
    // dashed predicted entry path (faint), then the solid flown portion
    ctx.strokeStyle='rgba(245,166,35,0.22)'; ctx.setLineDash([4,5]); ctx.lineWidth=1; ctx.beginPath();
    for(let i=0;i<=40;i++){ const u=i/40, rr=dr(u), aa=da(u); const x=E.cx+Math.cos(aa)*rr, y=E.cy+Math.sin(aa)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle=themeColor('ignite'); ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<=40;i++){ const u=i/40*dp, rr=dr(u), aa=da(u); const x=E.cx+Math.cos(aa)*rr, y=E.cy+Math.sin(aa)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.stroke();
    const rrNow=dr(dp), aNow=da(dp);
    cx=E.cx+Math.cos(aNow)*rrNow; cy=E.cy+Math.sin(aNow)*rrNow;
    // travel tangent along the descending spiral (approx by finite difference)
    const u2=Math.min(1,dp+0.01), x2=E.cx+Math.cos(da(u2))*dr(u2), y2=E.cy+Math.sin(da(u2))*dr(u2);
    const travelAng=Math.atan2(y2-cy, x2-cx);
    // entry heat builds as it nears the interface
    if(entryInterface || dp>0.75){ const hp=clampA((dp-0.75)/0.25,0,1);
      const hg=ctx.createRadialGradient(cx,cy,2,cx,cy,16);
      hg.addColorStop(0,`rgba(255,150,50,${hp*0.6})`); hg.addColorStop(0.5,`rgba(255,90,30,${hp*0.4})`); hg.addColorStop(1,'rgba(255,50,20,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(cx,cy,16,0,7); ctx.fill(); }
    drawCraftSprite(ctx,cx,cy,travelAng, deorbitBurning);
    // retrograde burn plume (points prograde = opposite travel) during the deorbit kick
    if(deorbitBurning){ const bAng=travelAng+Math.PI, fl=10+Math.random()*6;
      const fx=cx+Math.cos(bAng)*fl, fy=cy+Math.sin(bAng)*fl;
      const bg=ctx.createRadialGradient(cx,cy,1,fx,fy,7);
      bg.addColorStop(0,'rgba(200,220,255,0.8)'); bg.addColorStop(0.5,'rgba(255,190,90,0.45)'); bg.addColorStop(1,'rgba(255,110,30,0)');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(fx,fy,7,0,7); ctx.fill(); }
  } else if(failP!=null && op>=failP){
    drawBoom(ctx,cx,cy,ct-A.cruiseDur*failP);
  } else {
    const travelAng=curAng+Math.PI/2; // tangent of the increasing-angle arc = direction of motion
    drawSpentStageDrift(ctx,cx,cy,travelAng,ct);
    drawCraftSprite(ctx,cx,cy,travelAng,burning);
    const proAng=curAng-Math.PI/2;
    const pm=14;
    const px=cx+Math.cos(proAng)*pm, py=cy+Math.sin(proAng)*pm;
    ctx.save(); ctx.translate(px,py); ctx.rotate(proAng-Math.PI/2);
    ctx.fillStyle=themeRgba('readout',0.7);
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font='8px ui-monospace,monospace'; ctx.fillStyle=themeRgba('readout',0.5); ctx.textAlign='center';
    ctx.fillText('PRO',px+Math.cos(proAng)*8,py+Math.sin(proAng)*8+3);
    ctx.textAlign='left';
  }
  A._deorbitState={deorbiting, deorbitBurning, entryInterface};
  const fd=A.flightData||{};
  const alt=Math.round((180+(R.bow||0)*30)+op*15);
  const vel=Math.round(7680+op*120);
  const period=Math.round(88+alt*0.06);
  const pe=alt-8, ap=alt+12;
  const ascentT=fd.tPlus||520;
  const totalSec=ascentT+Math.round(op*period*60);
  const tMin=Math.floor(totalSec/60), tSec=(totalSec%60).toString().padStart(2,'0');
  const orbVx=Math.round(vel*0.998);
  const orbVy=Math.round(vel*Math.sin((curAng-a0)/(a1-a0)*0.04));
  const telData=[
    {label:'T+', value:`${tMin}:${tSec}`, color:themeColor('readout')},
    {label:'ALT', value:alt+' km'},
    {label:'SPEED', value:vel.toLocaleString()+' m/s'},
    {label:'Vx', value:orbVx.toLocaleString()+' m/s', color:themeColor('readout')},
    {label:'Vy', value:(orbVy>=0?'+':'')+orbVy+' m/s', color:themeColor('readout')},
    {label:'PE', value:pe+' km'},
    {label:'AP', value:ap+' km'},
    {label:'PERIOD', value:period+' min'},
    {label:'INC', value:'28.5°'},
    {label:'DRANGE', value:(fd.drangeKm||0)+Math.round(op*400)+' km'}
  ];
  drawTelemetry(telData);
  drawOrbitalMiniMap(ctx,W,H,op,alt,pe,ap,fd);
  ctx.save();
  const rpW=155, rpH=s.crewed?58:42, rpX=W-rpW-10, rpY=8;
  ctx.fillStyle=themeRgba('bg',0.82); ctx.fillRect(rpX,rpY,rpW,rpH);
  ctx.strokeStyle=themeRgba('readout',0.25); ctx.lineWidth=0.5; ctx.strokeRect(rpX,rpY,rpW,rpH);
  ctx.font='9px ui-monospace,monospace'; ctx.textBaseline='top'; ctx.textAlign='right';
  ctx.fillStyle=themeColor('dim'); ctx.fillText('MISSION', W-18, rpY+6);
  ctx.fillStyle=themeColor('ink'); ctx.font='bold 12px ui-monospace,monospace';
  ctx.fillText(s.title, W-18, rpY+20);
  if(s.crewed){ ctx.fillStyle=themeColor('ignite'); ctx.font='10px ui-monospace,monospace'; ctx.fillText('▲ CREWED FLIGHT', W-18, rpY+38); }
  ctx.textAlign='left'; ctx.restore();
  A.flightData=Object.assign(fd,{orbAlt:alt,pe,ap,period,orbVel:vel,orbDrange:(fd.drangeKm||0)+Math.round(op*400)});
  const ds=A._deorbitState||{};
  const phase = (failP!=null&&op>=failP) ? 'CONTACT LOST' :
    (ds.entryInterface ? 'ENTRY INTERFACE' :
     (ds.deorbitBurning ? 'DEORBIT BURN · RETROGRADE' :
      (ds.deorbiting ? 'REENTRY DESCENT' :
       (op>0.9 ? 'ORBIT ACHIEVED ✓' : (burning ? 'CIRCULARIZATION BURN' : 'ORBITAL FLIGHT')))));
  const phaseCol = (failP!=null&&op>=failP) ? themeColor('bad') : (ds.deorbiting ? themeColor('ignite') : (op>0.9 ? themeColor('ok') : themeColor('readout')));
  drawPhaseBar(phase, phaseCol, op);
  const orbPitch=curAng-Math.PI/2;

}
// Reentry & recovery for a crewed capsule coming home from orbit. Three beats over rt∈[0,reentryDur]:
//   plasma     (p<0.46) — blunt-body capsule rides a glowing plasma sheath down, ablative spark wake, heat shimmer
//   chutes     (0.52 drogue, 0.66 mains) — canopies blossom and deceleration kicks in
//   splashdown (>0.96) — capsule hits the ocean, water bursts, chutes collapse, it bobs
// Pure canvas (the live renderer); particles live in A.rePlasma / A.reSplash.
function drawReentry(rt){
  const A=animState,s=A.spec,ctx=A.ctx,W=A.cv.width,H=A.cv.height;
  const dur=A.reentryDur||6400, p=clampA(rt/dur,0,1);
  const DROGUE=0.52, MAIN=0.66, SPLASH=0.96, PLASMA_END=0.46;
  const horizon=Math.round(H*0.80);
  // segment lerp over keyframes [[p,val],...]
  const kf=(x,pts)=>{ for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; if(x<=b[0]){ const f=clampA((x-a[0])/((b[0]-a[0])||1),0,1); return a[1]+(b[1]-a[1])*f; } } return pts[pts.length-1][1]; };
  // --- sky: space-black up high fading down to atmosphere blue at the horizon ---
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#04060a'); sky.addColorStop(0.42,'#0a2236'); sky.addColorStop(0.74,'#27506f'); sky.addColorStop(1,'#7fa3bc');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);
  const starA=clampA(1-p*1.5,0,1)*0.55;
  if(starA>0.02){ ctx.fillStyle='#dfe8f2'; for(const st of (A.stars||[])){ if(st.y>0.42) continue; ctx.globalAlpha=starA*st.b; ctx.fillRect(st.x*W, st.y*H*0.5, st.s*0.8, st.s*0.8); } ctx.globalAlpha=1; }
  // --- ocean ---
  const og=ctx.createLinearGradient(0,horizon,0,H);
  og.addColorStop(0,'#15455f'); og.addColorStop(1,'#08263a');
  ctx.fillStyle=og; ctx.fillRect(0,horizon,W,H-horizon);
  ctx.fillStyle='rgba(180,220,240,0.10)'; ctx.fillRect(0,horizon-1,W,2); // horizon haze
  for(let i=0;i<22;i++){ const f=i/22, wy=horizon+6+f*(H-horizon-6); ctx.strokeStyle=`rgba(150,200,225,${0.05+0.10*(1-f)})`; ctx.lineWidth=1; ctx.beginPath(); for(let x=0;x<=W;x+=24){ const yy=wy+Math.sin((x*0.03)+(rt*0.004)+i)*1.8; x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);} ctx.stroke(); }
  // --- capsule travel: fast under plasma, eases once the chutes are out ---
  const capR=16;
  const capTopY=H*0.10, capWaterY=horizon-capR*0.4;
  let capY=capTopY+(capWaterY-capTopY)*kf(p,[[0,0],[PLASMA_END,0.52],[MAIN,0.72],[SPLASH,0.985],[1,1]]);
  const drift=Math.sin(rt*0.0007)*W*0.05*(1-clampA(p/MAIN,0,1)); // cross-range early, steadies under canopy
  let capX=W*0.5+drift;
  const jit = p<PLASMA_END ? (1-p/PLASMA_END) : 0; // buffeting during the fireball
  capX+=(Math.random()-0.5)*jit*3; capY+=(Math.random()-0.5)*jit*2.4;
  const plasma=clampA((PLASMA_END-p)/PLASMA_END,0,1); // hottest at entry interface, fades as it slows
  const tilt = p>MAIN ? Math.sin(rt*0.002)*0.12 : 0; // gentle swing hanging under the mains
  // --- plasma sheath + ablative spark wake (drawn behind the capsule, i.e. above it) ---
  if(plasma>0.04){
    const shY=capY+capR*0.7; // leading heat-shield point
    if(A.rePlasma.length<170){ for(let i=0;i<3;i++) A.rePlasma.push({x:capX+(Math.random()-0.5)*capR*1.7, y:shY, vx:(Math.random()-0.5)*1.2, vy:-(1.6+Math.random()*2.8), life:1, hot:Math.random()}); }
    // bow-shock cap ahead of the shield
    const bow=ctx.createRadialGradient(capX,shY+4,2,capX,shY+4,capR*2.4);
    bow.addColorStop(0,`rgba(255,255,250,${0.85*plasma})`); bow.addColorStop(0.35,`rgba(255,210,120,${0.7*plasma})`);
    bow.addColorStop(0.7,`rgba(255,110,40,${0.45*plasma})`); bow.addColorStop(1,'rgba(200,40,20,0)');
    ctx.fillStyle=bow; ctx.beginPath(); ctx.ellipse(capX,shY+4,capR*2.0,capR*2.4,0,0,7); ctx.fill();
  }
  // advance + draw the spark wake regardless (it lingers a moment after plasma ends)
  for(const q of A.rePlasma){ q.x+=q.vx; q.y+=q.vy; q.vy-=0.015; q.vx*=0.99; q.life-=0.02; }
  A.rePlasma=A.rePlasma.filter(q=>q.life>0);
  for(const q of A.rePlasma){ const l=q.life; const r=140+115*(1-l)*q.hot, g=Math.round(90+120*l), b=Math.round(30+40*(1-q.hot)*l);
    ctx.fillStyle=`rgba(255,${g},${b},${0.7*l})`; ctx.fillRect(q.x-1, q.y-1, 2.2, 2.2); }
  // --- chutes ---
  const drogueOn=p>=DROGUE && p<MAIN+0.04, mainOn=p>=MAIN;
  const apexX=capX-Math.sin(tilt)*capR*2, apexY=capY-capR*1.3;
  if(drogueOn){ const inf=clampA((p-DROGUE)/0.06,0,1); drawChute(ctx,apexX,apexY-26*inf,13*inf,'#d6dde2','#9aa5ad',[apexX-6,apexX+6],capY-capR*0.6,inf); }
  if(mainOn){ const inf=clampA((p-MAIN)/0.07,0,1); const collapse=p>=SPLASH?clampA(1-(p-SPLASH)/0.03,0,1):1; const sc=inf*collapse;
    [-1,0,1].forEach(k=>{ const cxp=apexX+k*26*sc, cyp=apexY-44*sc-Math.abs(k)*4*sc; drawChute(ctx,cxp,cyp,22*sc,k?'#e8552f':'#f2f4f6',k?'#b53a1c':'#c6ccd2',[capX-7,capX+7],capY-capR*0.7,sc); }); }
  // --- the capsule (blunt-body: wide ablative shield at the bottom, tapering up) ---
  ctx.save(); ctx.translate(capX,capY); ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(-capR*0.55,-capR*0.95); ctx.lineTo(capR*0.55,-capR*0.95);   // narrow top
  ctx.lineTo(capR,capR*0.45); ctx.quadraticCurveTo(capR,capR*0.95,0,capR*0.95);  // flared side → shield
  ctx.quadraticCurveTo(-capR,capR*0.95,-capR,capR*0.45); ctx.closePath();
  const body=ctx.createLinearGradient(-capR,0,capR,0); body.addColorStop(0,'#3a4650'); body.addColorStop(0.5,'#9aa6ae'); body.addColorStop(1,'#566069');
  ctx.fillStyle=body; ctx.fill();
  ctx.fillStyle = plasma>0.04 ? `rgba(255,${Math.round(120+120*(1-plasma))},60,1)` : '#2a2118'; // heat-shield glows while hot
  ctx.beginPath(); ctx.moveTo(-capR,capR*0.45); ctx.quadraticCurveTo(-capR,capR*0.95,0,capR*0.95); ctx.quadraticCurveTo(capR,capR*0.95,capR,capR*0.45); ctx.lineTo(capR*0.78,capR*0.3); ctx.quadraticCurveTo(0,capR*0.7,-capR*0.78,capR*0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(20,26,32,0.6)'; ctx.lineWidth=0.8; for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*capR*0.4,-capR*0.9); ctx.lineTo(i*capR*0.55,capR*0.4); ctx.stroke(); } // hull panel lines
  ctx.fillStyle='#1a2a36'; ctx.beginPath(); ctx.arc(capR*0.2,-capR*0.3,capR*0.16,0,7); ctx.fill(); // window
  ctx.restore();
  // --- splashdown ---
  if(p>=SPLASH){
    if(!A._splashed){ A._splashed=true; for(let i=0;i<46;i++){ const a=-Math.PI/2+(Math.random()-0.5)*2.2, spd=1.5+Math.random()*4.5; A.reSplash.push({x:capX,y:capWaterY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,sz:1.5+Math.random()*2.5}); } }
    A.reRing=(A.reRing||0)+1;
    for(let r=0;r<3;r++){ const rr=10+A.reRing*1.6+r*14; ctx.strokeStyle=`rgba(200,230,245,${clampA(0.4-A.reRing*0.01-r*0.1,0,0.4)})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(capX,capWaterY+4,rr,rr*0.34,0,0,7); ctx.stroke(); }
  }
  for(const d of A.reSplash){ d.x+=d.vx; d.y+=d.vy; d.vy+=0.16; d.life-=0.02; }
  A.reSplash=A.reSplash.filter(d=>d.life>0 && d.y<H);
  ctx.fillStyle='#cfeaf5'; for(const d of A.reSplash){ ctx.globalAlpha=clampA(d.life,0,1); ctx.fillRect(d.x-d.sz/2,d.y-d.sz/2,d.sz,d.sz); } ctx.globalAlpha=1;
  // --- telemetry + phase ---
  const alt=Math.max(0,Math.round(kf(p,[[0,122],[PLASMA_END,55],[MAIN,8],[SPLASH,0.1],[1,0]])));
  const vel=Math.max(0,Math.round(kf(p,[[0,7650],[0.30,4200],[PLASMA_END,820],[MAIN,95],[SPLASH,8],[1,0]])));
  const gLoad=(plasma>0.04?(1.2+plasma*5.6):(p<MAIN?2.0:1.0)).toFixed(1);
  const skinT=Math.round(kf(p,[[0,420],[0.10,1620],[PLASMA_END,540],[1,35]]));
  drawTelemetry([
    {label:'PHASE', value:'REENTRY', color:themeColor('ignite')},
    {label:'ALT', value:alt+' km'},
    {label:'VEL', value:vel.toLocaleString()+' m/s'},
    {label:'G-LOAD', value:gLoad+' g', color:(+gLoad>4?themeColor('bad'):themeColor('ink'))},
    {label:'SKIN', value:skinT+' °C', color:(skinT>900?themeColor('bad'):themeColor('ink'))},
    {label:'CHUTES', value:mainOn?'MAIN ✓':(drogueOn?'DROGUE':'STOWED'), color:mainOn?themeColor('ok'):themeColor('ink')}
  ]);
  const phase = p>=SPLASH?'SPLASHDOWN ✓' : (mainOn?'MAINS · DESCENT' : (drogueOn?'DROGUE OUT' : (plasma>0.15?'PLASMA BLACKOUT':'REENTRY INTERFACE')));
  const phaseCol = p>=SPLASH?themeColor('ok') : (plasma>0.15?themeColor('bad'):themeColor('ignite'));
  drawPhaseBar(phase,phaseCol,p);
  ctx.save();
  ctx.font='bold 12px ui-monospace,monospace'; ctx.textAlign='right'; ctx.textBaseline='top';
  ctx.fillStyle=themeColor('dim'); ctx.fillText('RECOVERY', W-18, 12); ctx.fillStyle=themeColor('ink'); ctx.fillText(s.title, W-18, 28);
  ctx.fillStyle=themeColor('ignite'); ctx.font='10px ui-monospace,monospace'; ctx.fillText('▲ CREW ABOARD', W-18, 46);
  ctx.restore();
}
// a single parachute canopy + risers, drawn at (cx,cy) with the given radius, inflating with f∈[0,1]
function drawChute(ctx,cx,cy,r,fill,edge,attachX,attachY,f){
  if(r<1) return;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.quadraticCurveTo(cx,cy-r*1.5,cx+r,cy); // canopy dome
  ctx.quadraticCurveTo(cx+r*0.5,cy+r*0.45,cx,cy+r*0.32); ctx.quadraticCurveTo(cx-r*0.5,cy+r*0.45,cx-r,cy); ctx.closePath();
  ctx.fillStyle=fill; ctx.fill();
  ctx.strokeStyle=edge; ctx.lineWidth=1; ctx.stroke();
  ctx.lineWidth=0.7; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(cx+i*r*0.32, cy-r*1.0*(1-Math.abs(i)*0.18)); ctx.lineTo(cx+i*r*0.3, cy+r*0.3); ctx.stroke(); } // panel seams
  ctx.strokeStyle='rgba(200,210,218,0.7)'; ctx.lineWidth=0.8; // risers to the capsule
  for(const ax of attachX){ ctx.beginPath(); ctx.moveTo(cx+(ax-cx)*0.18, cy+r*0.25); ctx.lineTo(ax,attachY); ctx.stroke(); }
  ctx.restore();
}

/* ---------- Shared splashdown / recovery ending ----------
   Two eras, gated on the capsule (parachute + heat-shield) recovery tech:
   · No capsule tech  → the vehicle comes down and SPLASHES into the sea, then is gone
     (early hardware is expendable, lost at sea — no dot lying flat on the water).
   · Capsule tech     → a blunt-body capsule descends vertically under a drogue then mains,
     SPLASHES DOWN UPRIGHT, sheds the canopies, and BOBS in the ocean awaiting recovery.
   Call once the descending craft nears the waterline. `dp` is 0→1 over the terminal descent.
   Returns true while it owns the frame (caller should stop drawing the in-flight craft). */
function drawSplashdown(ctx, W, H, waterY, cx, entryX, dp, hasCapsule, rt){
  const A=animState;
  // ---- expendable: no recovery capability. Arc ends, hardware hits the water, vanishes. ----
  if(!hasCapsule){
    if(dp<1){
      // final plunge: the craft (already drawn by caller until here) is at the surface point;
      // we just add the impact once it crosses.
      return false; // let the caller keep drawing the descending craft until dp>=1
    }
    if(!A._splashed){ A._splashed=true; A._splashX=cx; sfxSplash&&sfxSplash();
      for(let i=0;i<54;i++){ const a=-Math.PI/2+(Math.random()-0.5)*2.4, spd=1.8+Math.random()*5.5; A.reSplash.push({x:cx,y:waterY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,sz:1.6+Math.random()*3}); } }
    splashRingsAndSpray(ctx,W,H,A._splashX!=null?A._splashX:cx,waterY,rt);
    return true; // craft is gone; caller draws nothing more
  }
  // ---- capsule recovery: vertical descent under canopies → upright splashdown → bob ----
  const capR=15;
  const DROGUE=0.30, MAIN=0.52, TOUCH=0.90; // fractions of the terminal descent dp
  const topY=H*0.16, sitY=waterY-capR*0.35;  // where it rides at rest in the swell
  // vertical fall, easing as the mains bite; a touch of pendulum swing under canopy
  const fall=kfLocal(dp,[[0,0],[DROGUE,0.34],[MAIN,0.62],[TOUCH,0.985],[1,1]]);
  const capY=topY+(sitY-topY)*fall;
  const swing = dp>MAIN && dp<TOUCH ? Math.sin(rt*0.0022)*0.10*(1-(dp-MAIN)/(TOUCH-MAIN)) : 0;
  const bob = dp>=TOUCH ? Math.sin(rt*0.004)*2.2 : 0;               // gentle sea bob after splashdown
  const bobTilt = dp>=TOUCH ? Math.sin(rt*0.004+0.7)*0.06 : swing;  // rock in the swell
  const capX = cx + (dp<MAIN ? Math.sin(rt*0.001)*W*0.015*(1-dp/MAIN) : 0); // slight cross-range early
  const drawY = capY + bob;
  // chutes: drogue first, then three mains; collapse just after touchdown
  const drogueOn = dp>=DROGUE && dp<MAIN+0.05;
  const mainOn   = dp>=MAIN && dp<TOUCH+0.05;
  const apexX=capX-Math.sin(bobTilt)*capR*2, apexY=drawY-capR*1.4;
  if(drogueOn){ const inf=clampA((dp-DROGUE)/0.05,0,1); drawChute(ctx,apexX,apexY-26*inf,13*inf,'#d6dde2','#9aa5ad',[apexX-6,apexX+6],drawY-capR*0.6,inf); }
  if(mainOn){ const inf=clampA((dp-MAIN)/0.06,0,1); const collapse=dp>=TOUCH?clampA(1-(dp-TOUCH)/0.05,0,1):1; const sc=inf*collapse;
    [-1,0,1].forEach(k=>{ const cxp=apexX+k*26*sc, cyp=apexY-44*sc-Math.abs(k)*4*sc; drawChute(ctx,cxp,cyp,22*sc,k?'#e8552f':'#f2f4f6',k?'#b53a1c':'#c6ccd2',[capX-7,capX+7],drawY-capR*0.7,sc); }); }
  // splashdown effects once it touches
  if(dp>=TOUCH){ if(!A._splashed){ A._splashed=true; A._splashX=capX; sfxSplash&&sfxSplash();
      for(let i=0;i<40;i++){ const a=-Math.PI/2+(Math.random()-0.5)*2.0, spd=1.4+Math.random()*4; A.reSplash.push({x:capX,y:waterY,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,sz:1.4+Math.random()*2.4}); } }
    splashRingsAndSpray(ctx,W,H,A._splashX!=null?A._splashX:capX,waterY,rt);
  }
  // the capsule itself — UPRIGHT (heat shield down), rocking gently once afloat
  drawCapsuleBody(ctx, capX, drawY, capR, bobTilt, dp<MAIN?clampA((MAIN-dp)/MAIN,0,1)*0.5:0, dp>=TOUCH?waterY:null);
  return true;
}
// Blunt-body capsule, heat-shield DOWN. heat 0..1 glows the shield; if afloatY given, draws a waterline clip.
function drawCapsuleBody(ctx, x, y, capR, tilt, heat, afloatY){
  ctx.save(); ctx.translate(x,y); ctx.rotate(tilt||0);
  ctx.beginPath();
  ctx.moveTo(-capR*0.55,-capR*0.95); ctx.lineTo(capR*0.55,-capR*0.95);
  ctx.lineTo(capR,capR*0.45); ctx.quadraticCurveTo(capR,capR*0.95,0,capR*0.95);
  ctx.quadraticCurveTo(-capR,capR*0.95,-capR,capR*0.45); ctx.closePath();
  const body=ctx.createLinearGradient(-capR,0,capR,0); body.addColorStop(0,'#3a4650'); body.addColorStop(0.5,'#9aa6ae'); body.addColorStop(1,'#566069');
  ctx.fillStyle=body; ctx.fill();
  ctx.fillStyle = heat>0.04 ? `rgba(255,${Math.round(120+120*(1-heat))},60,1)` : '#2a2118';
  ctx.beginPath(); ctx.moveTo(-capR,capR*0.45); ctx.quadraticCurveTo(-capR,capR*0.95,0,capR*0.95); ctx.quadraticCurveTo(capR,capR*0.95,capR,capR*0.45); ctx.lineTo(capR*0.78,capR*0.3); ctx.quadraticCurveTo(0,capR*0.7,-capR*0.78,capR*0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(20,26,32,0.6)'; ctx.lineWidth=0.8; for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*capR*0.4,-capR*0.9); ctx.lineTo(i*capR*0.55,capR*0.4); ctx.stroke(); }
  ctx.fillStyle='#1a2a36'; ctx.beginPath(); ctx.arc(capR*0.2,-capR*0.3,capR*0.16,0,7); ctx.fill();
  ctx.restore();
  // waterline: a soft band across the shield where it meets the sea, plus a meniscus highlight
  if(afloatY!=null){ ctx.save(); ctx.fillStyle='rgba(10,40,58,0.45)'; ctx.beginPath(); ctx.ellipse(x,afloatY+2,capR*1.05,capR*0.28,0,0,7); ctx.fill();
    ctx.strokeStyle='rgba(190,225,240,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(x,afloatY+1,capR*0.95,capR*0.24,0,Math.PI*0.05,Math.PI*0.95); ctx.stroke(); ctx.restore(); }
}
// Expanding rings + settling spray at a splashdown point (shared by both endings).
function splashRingsAndSpray(ctx,W,H,x,waterY,rt){
  const A=animState; A.reRing=(A.reRing||0)+1;
  for(let r=0;r<3;r++){ const rr=10+A.reRing*1.6+r*14; ctx.strokeStyle=`rgba(200,230,245,${clampA(0.4-A.reRing*0.01-r*0.1,0,0.4)})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(x,waterY+4,rr,rr*0.34,0,0,7); ctx.stroke(); }
}
// local keyframe lerp (drawSplashdown is self-contained; mirrors the one inside drawReentry)
function kfLocal(x,pts){ for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; if(x<=b[0]){ const f=clampA((x-a[0])/((b[0]-a[0])||1),0,1); return a[1]+(b[1]-a[1])*f; } } return pts[pts.length-1][1]; }

function drawSuborbital(ct){
  const A=animState,s=A.spec,ctx=A.ctx,W=A.cv.width,H=A.cv.height,R=s.rng||{apogee:1,bow:0};
  const time=ct+A.ascentDur;
  spaceBg(ctx,W,H,time);
  earthLimb(ctx,W,H,true,-0.6+time*0.0003);
  const op=clampA(ct/A.cruiseDur,0,1), x0=W*0.18,x1=W*0.84, base=H-94;
  if(A.sfxEnginePhase==='ascent'){ sfxStop(); A.sfxEnginePhase='suborbital'; }
  const exitPitch=clampA(0.55+R.pitchJitter,0.2,1.0);
  const apexY=clampA(H*0.40 - s.reqDv*0.03, H*0.12, H*0.40)/(R.apogee||1);
  const apexX=x0+(x1-x0)*clampA(0.30+exitPitch*0.30,0.2,0.7);
  const xAt=f=> (1-f)*(1-f)*x0 + 2*(1-f)*f*apexX + f*f*x1 + (R.bow||0)*30*Math.sin(f*Math.PI);
  const yAt=f=> base-Math.sin(f*Math.PI)*(base-apexY);
  const angAt=f=>{ const e=0.01, d=Math.atan2(yAt(Math.min(f+e,1))-yAt(f), xAt(Math.min(f+e,1))-xAt(f)); return d; };
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.setLineDash([4,6]); ctx.lineWidth=1; ctx.beginPath();
  for(let i=0;i<=60;i++){const f=i/60; i?ctx.lineTo(xAt(f),yAt(f)):ctx.moveTo(xAt(f),yAt(f));} ctx.stroke(); ctx.setLineDash([]);
  // terminal-descent handoff: past DESCENT_START the trajectory ends in a splashdown
  // (expendable = splash & vanish; capsule tech = chutes → upright splashdown → bob).
  const DESCENT_START=0.86, waterY=base+18;
  // ocean band beneath the arc's base so the craft comes down to real water
  { const og=ctx.createLinearGradient(0,waterY,0,H); og.addColorStop(0,'#15455f'); og.addColorStop(1,'#08263a');
    ctx.fillStyle=og; ctx.fillRect(0,waterY,W,H-waterY);
    ctx.fillStyle='rgba(180,220,240,0.10)'; ctx.fillRect(0,waterY-1,W,2);
    for(let i=0;i<10;i++){ const f=i/10, wy=waterY+4+f*(H-waterY-4); ctx.strokeStyle=`rgba(150,200,225,${0.04+0.08*(1-f)})`; ctx.lineWidth=1; ctx.beginPath(); for(let x=0;x<=W;x+=26){ const yy=wy+Math.sin((x*0.03)+(ct*0.004)+i)*1.6; x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);} ctx.stroke(); } }
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=2.5; ctx.beginPath();
  const drawTo=Math.min(op,DESCENT_START);
  for(let i=0;i<=60;i++){const f=i/60*drawTo; i?ctx.lineTo(xAt(f),yAt(f)):ctx.moveTo(xAt(f),yAt(f));} ctx.stroke();
  const curX=xAt(op), curY=yAt(op);
  if(op<DESCENT_START){
    // still on the ballistic arc — draw the vehicle as before
    drawCraftSprite(ctx,curX,curY,angAt(op), op<0.10);
    if(op>0.7){ const heatP=clampA((op-0.7)/0.16,0,1);
      const heatGrad=ctx.createRadialGradient(curX,curY,2,curX,curY,14);
      heatGrad.addColorStop(0,`rgba(255,140,40,${heatP*0.5})`); heatGrad.addColorStop(0.5,`rgba(255,80,30,${heatP*0.3})`); heatGrad.addColorStop(1,'rgba(255,40,20,0)');
      ctx.fillStyle=heatGrad; ctx.beginPath(); ctx.arc(curX,curY,14,0,7); ctx.fill(); }
  } else {
    const dp=clampA((op-DESCENT_START)/(1-DESCENT_START),0,1);
    const entryX=xAt(DESCENT_START);
    const splashX=xAt(0.98);
    if(!s.hasCapsule && dp<1){
      // expendable: keep the falling vehicle visible until it meets the water, then splash & vanish
      drawCraftSprite(ctx, xAt(op), Math.min(yAt(op),waterY), angAt(op), false);
    }
    drawSplashdown(ctx, W, H, waterY, s.hasCapsule?entryX:splashX, entryX, dp, s.hasCapsule, ct);
  }
  const apogeeKm=Math.round((100+ s.reqDv*0.04)*(R.apogee||1)*Math.sin(Math.max(op,0.0001)*Math.PI)+ (op>0.5? s.reqDv*0.02:0));
  const drange=Math.round((curX-x0)/(x1-x0)*600);
  const vel=Math.round(Math.max(0, s.reqDv*0.8*(1-Math.abs(op-0.5)*1.5)));
  const telData=[
    {label:'T+', value:Math.floor(op*300/60)+'m '+Math.round(op*300%60)+'s', color:themeColor('readout')},
    {label:'ALT', value:Math.max(0,apogeeKm)+' km'},
    {label:'VEL', value:vel.toLocaleString()+' m/s'},
    {label:'DRANGE', value:drange+' km'},
    {label:'STATUS', value:op<0.45?'COAST':op<0.5?'APOGEE':op<0.85?'DESCENT':'RECOVERY', color:op>0.85?themeColor('ok'):themeColor('ink')}
  ];
  drawTelemetry(telData);
  const phase=op<0.45?'COAST TO APOGEE':(op<0.52?'APOGEE · WEIGHTLESSNESS':(op<0.85?'REENTRY':(op<0.95?'CHUTE DEPLOY':'RECOVERED ✓')));
  const phaseCol=op>0.95?themeColor('ok'):(op>0.7&&op<0.9?themeColor('ignite'):themeColor('readout'));
  drawPhaseBar(phase,phaseCol,op);
  const subPitch=angAt(op);

}
function buildLunarPath(W,H,rng){
  rng=rng||{bow:0}; const bz=(rng.bow||0)*55;
  const E={x:W*0.26,y:H*0.62,r:30}, M={x:W*0.8,y:H*0.34,r:13}, leoR=E.r+18;
  const bez=(p0,p1,p2,p3,t)=>{const u=1-t;return{x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x,y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y};};
  const S={x:E.x+leoR*Math.cos(-0.6),y:E.y+leoR*Math.sin(-0.6)};
  const o1={x:W*0.45,y:H*0.10+bz},o2={x:W*0.66,y:H*0.12+bz},o3={x:M.x-2,y:M.y-M.r-6};
  const i0={x:M.x+2,y:M.y+M.r+6},i1={x:W*0.62,y:H*0.80-bz},i2={x:W*0.42,y:H*0.90-bz},i3={x:E.x+E.r*0.2,y:E.y+E.r+10};
  const pts=[],seg=[],burns=[];
  for(let i=0;i<=50;i++){pts.push(bez(S,o1,o2,o3,i/50)); seg.push('Trans-Lunar Injection'); burns.push(i<3);}
  for(let i=0;i<=20;i++){const a=-Math.PI*0.5+(i/20)*6.28; pts.push({x:M.x+Math.cos(a)*(M.r+8),y:M.y+Math.sin(a)*(M.r+8)}); seg.push('Lunar Orbit'); burns.push(i<2||i>18);}
  for(let i=0;i<=50;i++){pts.push(bez(i0,i1,i2,i3,i/50)); seg.push('Trans-Earth Injection'); burns.push(i<3);}
  for(let i=0;i<=8;i++){pts.push({x:i3.x-i*1.4,y:i3.y+i*0.5}); seg.push('Reentry'); burns.push(false);}
  return {E,M,leoR,pts,seg,burns};
}
function drawCislunar(ct){
  const A=animState,s=A.spec,ctx=A.ctx,W=A.cv.width,H=A.cv.height,P=A.path;
  const time=ct+A.ascentDur;
  spaceBg(ctx,W,H,time);
  const sunX=-40, sunY=H*0.3;
  const sunGrad=ctx.createRadialGradient(sunX,sunY,5,sunX,sunY,80);
  sunGrad.addColorStop(0,'rgba(255,230,150,0.3)'); sunGrad.addColorStop(0.5,'rgba(255,200,80,0.08)'); sunGrad.addColorStop(1,'rgba(255,200,80,0)');
  ctx.fillStyle=sunGrad; ctx.beginPath(); ctx.arc(sunX,sunY,80,0,7); ctx.fill();
  const eg=ctx.createRadialGradient(P.E.x-8,P.E.y-8,5,P.E.x,P.E.y,P.E.r);
  eg.addColorStop(0,'#4a90d9'); eg.addColorStop(0.5,'#2a6aaa'); eg.addColorStop(1,'#173b5e');
  ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(P.E.x,P.E.y,P.E.r,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(P.E.x,P.E.y,P.E.r,0,7); ctx.clip();
  ctx.fillStyle='rgba(2,5,15,0.4)'; ctx.beginPath(); ctx.arc(P.E.x+P.E.r*0.5,P.E.y,P.E.r*1.1,0,7); ctx.fill();
  ctx.fillStyle='rgba(60,120,60,0.25)'; ctx.beginPath(); ctx.ellipse(P.E.x-P.E.r*0.3,P.E.y-P.E.r*0.2,P.E.r*0.3,P.E.r*0.15,0,0,7); ctx.fill();
  ctx.restore();
  for(let i=0;i<2;i++){
    ctx.strokeStyle=`rgba(100,180,255,${0.2-i*0.07})`; ctx.lineWidth=2-i*0.5;
    ctx.beginPath(); ctx.arc(P.E.x,P.E.y,P.E.r+3+i*4,0,7); ctx.stroke();
  }
  ctx.strokeStyle=themeRgba('readout',0.2); ctx.setLineDash([3,4]); ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.arc(P.E.x,P.E.y,P.leoR,0,7); ctx.stroke(); ctx.setLineDash([]);
  const mg=ctx.createRadialGradient(P.M.x-4,P.M.y-4,2,P.M.x,P.M.y,P.M.r);
  mg.addColorStop(0,'#dde0e4'); mg.addColorStop(0.4,'#b0b6bc'); mg.addColorStop(1,'#6b7178');
  ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(P.M.x,P.M.y,P.M.r,0,7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(P.M.x,P.M.y,P.M.r,0,7); ctx.clip();
  ctx.fillStyle='rgba(90,96,102,0.4)';
  ctx.beginPath(); ctx.arc(P.M.x-P.M.r*0.3,P.M.y-P.M.r*0.2,P.M.r*0.3,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(P.M.x+P.M.r*0.2,P.M.y+P.M.r*0.15,P.M.r*0.2,0,7); ctx.fill();
  ctx.restore();
  const deepFail=!s.success&&s.failPhase==='deep';
  const op=clampA(ct/A.cruiseDur,0,1), maxIdx=P.pts.length-1;
  const failIdx=deepFail?Math.floor(P.pts.length*0.34):null;
  const curIdx=Math.min(Math.round(op*maxIdx), failIdx!=null?failIdx:maxIdx);
  if(A.sfxEnginePhase==='ascent'){ sfxStop(); A.sfxEnginePhase='cislunar'; }
  const isBurningCL=P.burns&&P.burns[curIdx];
  if(isBurningCL&&A.sfxEnginePhase!=='burn'){ A.sfxEnginePhase='burn'; sfxBurn(0.5); }
  else if(!isBurningCL&&A.sfxEnginePhase==='burn'){ sfxStop(); A.sfxEnginePhase='coast'; }
  if(failIdx!=null&&curIdx>=failIdx&&!A.sfxBoomFired){ A.sfxBoomFired=true; sfxStop(); sfxBoom(); }
  ctx.strokeStyle='rgba(125,144,155,0.18)'; ctx.lineWidth=1; ctx.setLineDash([4,6]); ctx.beginPath();
  P.pts.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle=themeColor('readout'); ctx.lineWidth=2.5; ctx.beginPath();
  for(let i=0;i<=curIdx;i++){const p=P.pts[i]; i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);} ctx.stroke();
  ctx.strokeStyle=themeRgba('readout',0.15); ctx.lineWidth=5; ctx.beginPath();
  for(let i=Math.max(0,curIdx-8);i<=curIdx;i++){const p=P.pts[i]; i===Math.max(0,curIdx-8)?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);} ctx.stroke();
  const cur=P.pts[curIdx];
  if(failIdx!=null && curIdx>=failIdx){
    drawBoom(ctx,cur.x,cur.y,ct-A.cruiseDur*0.34);
  } else {
    const isBurning=P.burns[curIdx];
    { const nxt=P.pts[Math.min(P.pts.length-1,curIdx+1)], prv=P.pts[Math.max(0,curIdx-1)];
      const tAng=Math.atan2(nxt.y-prv.y, nxt.x-prv.x);
      drawSpentStageDrift(ctx,cur.x,cur.y,tAng,ct);
      drawCraftSprite(ctx,cur.x,cur.y,tAng,isBurning); }
  }
  const segName=P.seg[curIdx]||'Transit';
  const distToMoon=Math.sqrt((cur.x-P.M.x)**2+(cur.y-P.M.y)**2);
  const distToEarth=Math.sqrt((cur.x-P.E.x)**2+(cur.y-P.E.y)**2);
  const lunarDist=Math.round(distToMoon/((P.M.x-P.E.x)*0.003));
  const earthDist=Math.round(distToEarth/((P.M.x-P.E.x)*0.003));
  const missionDayTotal=s.crewed?Math.round(8+(s.reqDv/1000)):6;
  const missionDay=Math.round(op*missionDayTotal);
  const telData=[
    {label:'MET', value:'Day '+missionDay, color:themeColor('readout')},
    {label:'PHASE', value:segName.toUpperCase().substring(0,16)},
    {label:'→MOON', value:lunarDist<50?lunarDist+'k km':'—'},
    {label:'→EARTH', value:earthDist>P.E.r*1.5?earthDist+'k km':'—'},
    {label:'STATUS', value:segName.includes('Orbit')?'IN ORBIT':'TRANSIT'}
  ];
  drawTelemetry(telData);
  ctx.save(); ctx.font='10px ui-monospace,monospace'; ctx.textBaseline='top'; ctx.textAlign='right';
  ctx.fillStyle=themeColor('dim'); ctx.fillText('MISSION', W-14, 8);
  ctx.fillStyle=themeColor('ink'); ctx.fillText(s.title, W-14, 22);
  if(s.crewed){ ctx.fillStyle=themeColor('ignite'); ctx.fillText('CREWED', W-14, 36); }
  ctx.textAlign='left'; ctx.restore();
  const phase = (failIdx!=null&&curIdx>=failIdx) ? 'CONTACT LOST' :
    (op>0.96 ? 'RETURNED ✓' : segName.toUpperCase());
  const phaseCol = (failIdx!=null&&curIdx>=failIdx) ? themeColor('bad') : (op>0.96 ? themeColor('ok') : themeColor('readout'));
  drawPhaseBar(phase, phaseCol, op);
  if(!(failIdx!=null&&curIdx>=failIdx)){
    const prev=P.pts[Math.max(0,curIdx-1)];
    const cisTravel=Math.atan2(cur.y-prev.y,cur.x-prev.x);

  }
}

/* ---------- #31 microanimation helpers ---------- */
// Slice 1: HUD stat bump — flash the value element when it changes
const _prevStats={};
function _statBump(id,numVal,fmtDelta){
  const el=$(id); if(!el) return;
  const prev=_prevStats[id];
  _prevStats[id]=numVal;
  if(prev===undefined||prev===numVal) return;
  const up=numVal>prev;
  const cls=up?'stat-bump-up':'stat-bump-down';
  el.classList.remove('stat-bump-up','stat-bump-down');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add(cls);
  el.addEventListener('animationend',()=>el.classList.remove(cls),{once:true});
  // #9: floating delta chip — one at a time per stat, replace rather than stack
  if(fmtDelta){
    try{
      const wrap=(typeof el.closest==='function'?el.closest('.stat'):null)||el.parentElement;
      if(wrap&&typeof wrap.querySelector==='function'){
        const old=wrap.querySelector('.stat-delta'); if(old) old.remove();
        const chip=document.createElement('span');
        chip.className='stat-delta '+(up?'stat-delta-up':'stat-delta-down');
        chip.textContent=fmtDelta(numVal-prev);
        wrap.appendChild(chip);
        chip.addEventListener('animationend',()=>chip.remove(),{once:true});
      }
    }catch(e){}
  }
}
// Slice 2: ephemeral flags consumed once per render
let _lastUnlockedTech=null; // set by completeResearch(), consumed by renderTechTree()
let _missionPulse=null;     // 'ok'|'bad', set by finalizeLaunch(), consumed by render()
// Slice 3: log chip tracking
let _prevLogLength=0;
// #29: timeline category filter + collapse state — persisted like the theme/wide-mode prefs
// (localStorage, not part of state, so it isn't saved into/loaded from a game save).
let _tlFilter='all';
let _tlCollapsed=false;
try{ const f=localStorage.getItem('ov_tlFilter'); if(f==='all' || TL_CAT_ICON[f]!==undefined) _tlFilter=f; }catch(e){}
try{ _tlCollapsed=localStorage.getItem('ov_tlCollapsed')==='1'; }catch(e){}
