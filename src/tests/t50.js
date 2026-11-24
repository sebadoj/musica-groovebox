// v13.25: CADENA con dos modos — ENVÍOS y SALIDA (efectos del pad XY)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.25';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(300);
await p.evaluate(()=>{window.__A=GB.ctx.createAnalyser();window.__A.fftSize=2048;GB.outTap().connect(window.__A);window.__rms=async(n=24)=>{let m=0;for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,25));const d=new Float32Array(2048);window.__A.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}return m;};
  for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;});
await W(600);const r0=await p.evaluate(()=>window.__rms());ok(r0>.05,'la salida suena con la cadena de salida ORIGINAL (RMS '+r0.toFixed(3)+')');
ok(await p.evaluate(()=>JSON.stringify(GB.FXP.out)===JSON.stringify(GB.PATCHPRE2[0][1])),'por defecto la cadena de salida es la de siempre');
await tab('fx');await W(100);await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD').click());await W(200);
ok(await p.evaluate(()=>{const b=[...document.querySelectorAll('.busbox.chain button')].map(x=>x.textContent);return b.includes('ENVÍOS')&&b.includes('SALIDA (PAD XY)');}),'CADENA tiene dos modos: ENVÍOS y SALIDA (PAD XY)');
await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent==='SALIDA (PAD XY)').click());await W(300);
ok(await p.evaluate(()=>{const b=[...document.querySelectorAll('.busbox.chain button')].map(x=>x.textContent);return b.includes('ORIGINAL')&&b.includes('DIST PRIMERO')&&b.includes('TIRADAS FILTRADAS')&&!b.includes('DUB');}),'SALIDA: sus propios presets');
ok(await p.evaluate(()=>['mix','flt','dist','rep','tdly','trev'].every(k=>GB.PCH.G&&GB.PCH.G[k])&&GB.PCH.G.mix.ix==null&&GB.PCH.G.tdly.ox==null),'módulos MIX (solo OUT), FILTER, DIST, REPEAT, DELAY ↗ y REVERB ↗ (solo IN)');
/* gestos */
const J=k=>p.evaluate(k=>{const cv=document.querySelector('#patchCv'),R=cv.getBoundingClientRect(),d=cv.width/R.width,G=GB.PCH.G;const f=(x,y)=>({x:R.left+x/d,y:R.top+y/d});
  if(k==='empty')return f(G.mix.x+G.mix.w+5*d,G.mix.y+G.mix.h+14*d);if(k.startsWith('mst.'))return (s=>f(s.x,s.y))(G.mst.slots.find(s=>s.k===k.slice(4)));const [m,io]=k.split('.');return io==='in'?f(G[m].ix,G[m].iy):f(G[m].ox,G[m].oy);},k);
const drag=async(a,bb,id=51)=>{const A=await J(a),B=await J(bb);await p.evaluate(([A,B,id])=>{const cv=document.querySelector('#patchCv'),ev=(t,P)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:P.x,clientY:P.y,bubbles:true,cancelable:true,pointerType:'touch'}));
  ev('pointerdown',A);for(let k=1;k<=6;k++)ev('pointermove',{x:A.x+(B.x-A.x)*k/6,y:A.y+(B.y-A.y)*k/6});ev('pointerup',B);},[A,B,id]);await W(150);};
const has=(a,b)=>p.evaluate(([a,b])=>GB.FXP.out.some(c=>c[0]===a&&c[1]===b),[a,b]);
const toastT=()=>p.evaluate(()=>document.querySelector('#toast')?.textContent||'');
await drag('flt.in','empty');ok(await has('mix','flt'),'no deja sacar MIX → FILTER (el master quedaría en silencio)');ok(/SIN CAMINO/.test(await toastT()),'avisa: quedaría sin camino al master');
await drag('mst.dist','empty');ok(await has('dist','mst'),'tampoco DIST → MASTER (REPEAT solo no cuenta como camino)');
await drag('dist.out','flt.in');ok(!(await has('dist','flt')),'DIST → FILTER no: armaría un lazo');
/* reordenar: DIST primero a mano */
await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent.replace(/\s/g,'')==='DISTPRIMERO').click());await W(400);
ok(await has('mix','dist')&&await has('dist','flt')&&await has('flt','mst'),'preset DIST PRIMERO: MIX → DIST → FILTER → MASTER');
const r1=await p.evaluate(()=>window.__rms());ok(r1>.05,'sigue sonando con el orden cambiado (RMS '+r1.toFixed(3)+')');
/* el FILTER del pad actúa en el lugar nuevo */
r=await p.evaluate(async()=>{const A=window.__A,hf=async()=>{let m=-200;const F=new Float32Array(A.frequencyBinCount),b0=Math.floor(4000/(GB.ctx.sampleRate/2)*F.length);for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,25));A.getFloatFrequencyData(F);let s=0;for(let k=b0;k<F.length;k++)s+=F[k];m=Math.max(m,s/(F.length-b0));}return m;};
  GB.mfxOn('FLT',0,0);await new Promise(r=>setTimeout(r,150));const lo=await hf();GB.mfxOff('FLT');await new Promise(r=>setTimeout(r,400));const hi=await hf();return {lo,hi};});
ok(r.lo<r.hi-20,'el pad FILTER sigue filtrando en su nuevo lugar (agudos '+r.lo.toFixed(0)+' dB vs '+r.hi.toFixed(0)+' dB)');
var r;
/* tiradas del pad: de dónde salen */
r=await p.evaluate(async()=>{GB.CH.forEach((c,i)=>{c.dly=0;c.rev=0;GB.applyCh(i);});GB.FXP.out=GB.PATCHPRE2[0][1].filter(c=>c[1]!=='tdly').map(c=>c.slice());GB.applyOut();await new Promise(r=>setTimeout(r,3000));
  const m=async()=>{let x=0;for(let i=0;i<48;i++){await new Promise(r=>setTimeout(r,25));x=Math.max(x,GB.fxLevel('dly'));}return x;};
  GB.mfxOn('DLY',.5,.8);const sin=await m();GB.mfxOff('DLY');await new Promise(r=>setTimeout(r,3000));GB.FXP.out.push(['flt','tdly',1]);GB.applyOut();await new Promise(r=>setTimeout(r,400));GB.mfxOn('DLY',.5,.8);const con=await m();GB.mfxOff('DLY');return {sin,con};});
ok(r.con>r.sin*3&&r.con>.1,'la tirada del pad DELAY sale de donde esté cableado DELAY ↗ (sin cable '+r.sin.toFixed(3)+' · desde FILTER '+r.con.toFixed(3)+')');
/* REPEAT y DIST del pad siguen andando */
r=await p.evaluate(async()=>{GB.FXP.out=GB.PATCHPRE2[0][1].map(c=>c.slice());GB.applyOut();await new Promise(r=>setTimeout(r,300));GB.mfxOn('REP',.3,.5);let m=0;for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,25));m=Math.max(m,GB.CHO.lvl('rep'));}GB.mfxOff('REP');
  GB.mfxOn('DST',.8,.9);let d=0;for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,25));d=Math.max(d,GB.CHO.lvl('dist'));}GB.mfxOff('DST');return {m,d};});
ok(r.m>.02,'pad REPEAT: el loop sale por su módulo (nivel '+r.m.toFixed(3)+')');ok(r.d>.02,'pad DIST: suena por su módulo ('+r.d.toFixed(3)+')');
/* la cadena de ENVÍOS no se toca */
ok(await p.evaluate(()=>JSON.stringify(GB.FXP.patch)===JSON.stringify(GB.PATCHPRE[0][1])),'la cadena de ENVÍOS sigue aparte');
await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent==='ENVÍOS').click());await W(250);
ok(await p.evaluate(()=>GB.PCH.G&&GB.PCH.G.dly&&GB.PCH.G.dly.ix!=null&&!GB.PCH.G.mix&&[...document.querySelectorAll('.busbox.chain button')].some(x=>x.textContent==='DUB')),'volver a ENVÍOS muestra su patch y sus presets');
/* sesión */
r=await p.evaluate(()=>{GB.FXP.out=GB.PATCHPRE2[2][1].map(c=>c.slice());GB.applyOut();const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const sv=JSON.stringify(j.fx.out);
  GB.FXP.out=GB.PATCHPRE2[0][1].map(c=>c.slice());GB.applyOut();GB.loadSession(j);const back=JSON.stringify(GB.FXP.out);
  delete j.fx.out;GB.loadSession(j);const old=JSON.stringify(GB.FXP.out);
  j.fx.out=[['mix','tdly',1],['flt','mst',1]];GB.loadSession(j);const nopath=JSON.stringify(GB.FXP.out);return {sv,back,old,nopath,def:JSON.stringify(GB.PATCHPRE2[0][1])};});
ok(r.back===r.sv,'la sesión guarda y abre la cadena de salida');
ok(r.old===r.def,'sesión vieja: cadena de salida ORIGINAL');
ok(r.nopath===r.def,'cadena de salida sin camino al master: se descarta (ORIGINAL)');
const r2=await p.evaluate(()=>window.__rms());ok(r2>.05,'después de todo, sigue sonando (RMS '+r2.toFixed(3)+')');
await p.tap('#bPlay');await W(100);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
