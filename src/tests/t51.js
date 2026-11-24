// v13.26: opciones para DESCONECTAR en la CADENA (módulo puenteado, todo, cable)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.26';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(300);
await p.evaluate(()=>{window.__A=GB.ctx.createAnalyser();window.__A.fftSize=2048;GB.outTap().connect(window.__A);window.__rms=async(n=20)=>{let m=0;for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,25));const d=new Float32Array(2048);window.__A.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}return m;};
  for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;});
await tab('fx');await W(100);await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD').click());await W(200);
const btn=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent===t);if(b)b.click();return !!b;},t);
const sel=(k)=>p.evaluate(k=>{GB.PCH.sel={k:'mod',id:k};},k);
const L=k=>p.evaluate(k=>JSON.stringify(GB.FXP[k].map(c=>c[0]+'>'+c[1]).sort()),k);
ok(await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].some(x=>x.textContent==='DESCONECTAR TODO')),'botón DESCONECTAR TODO');
/* ---- ENVÍOS */
await btn('DUB');await W(200);
await sel('rev');await p.evaluate(()=>{});await p.evaluate(()=>{const cv=document.querySelector('#patchCv');});
await p.evaluate(()=>{GB.PCH.sel={k:'mod',id:'rev'};});await p.evaluate(()=>window.dispatchEvent(new Event('x')));
await p.evaluate(()=>{const sp=document.querySelector('#patchSel');});
/* abrir el panel del módulo tocándolo */
const tapMod=async k=>{const P=await p.evaluate(k=>{const cv=document.querySelector('#patchCv'),R=cv.getBoundingClientRect(),d=cv.width/R.width,m=GB.PCH.G[k];return {x:R.left+(m.x+m.w/2)/d,y:R.top+(m.y+18*d)/d};},k);
  await p.evaluate(P=>{const cv=document.querySelector('#patchCv');['pointerdown','pointerup'].forEach(t=>cv.dispatchEvent(new PointerEvent(t,{pointerId:61,clientX:P.x,clientY:P.y,bubbles:true,cancelable:true,pointerType:'touch'})));},P);await W(150);};
await tapMod('rev');
ok(await p.evaluate(()=>[...document.querySelectorAll('#patchSel button')].some(b=>b.textContent==='DESCONECTAR REVERB')),'tocar un módulo: botón DESCONECTAR REVERB');
await p.evaluate(()=>[...document.querySelectorAll('#patchSel button')].find(b=>b.textContent==='DESCONECTAR REVERB').click());await W(150);
ok(await L('patch')===JSON.stringify(['dly>mst','dst>mst','mod>mst']),'DUB sin REVERB: el delay sigue al master, la reverb queda afuera '+(await L('patch')));
await tapMod('rev');await p.evaluate(()=>[...document.querySelectorAll('#patchSel button')].find(b=>b.textContent==='DESCONECTAR REVERB').click());await W(100);
ok(/YA ESTÁ DESCONECTADO/.test(await p.evaluate(()=>document.querySelector('#toast')?.textContent||'')),'si ya estaba desconectado, avisa');
/* cadena de envíos en serie: puentear el del medio */
r=await p.evaluate(()=>{GB.FXP.patch=[['dst','dly',1],['dly','rev',.7],['rev','mst',1]];GB.applyPatch();return GB.chainUnplug(GB.CFS,'dly');});
ok(r==='ok'&&await L('patch')===JSON.stringify(['dst>rev','rev>mst']),'DIST → DELAY → REVERB: desconectar DELAY puentea DIST → REVERB '+(await L('patch')));
var r;
/* desconectar todo en ENVÍOS */
await btn('DESCONECTAR TODO');await W(300);
ok(await p.evaluate(()=>GB.FXP.patch.length===0),'ENVÍOS: DESCONECTAR TODO deja los efectos de envío sin retorno');
let s1=await p.evaluate(()=>window.__rms());ok(s1>.05,'el seco sigue sonando (RMS '+s1.toFixed(3)+')');
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));GB.FXP.patch=GB.PATCHPRE[0][1].map(c=>c.slice());GB.applyPatch();GB.loadSession(j);return GB.FXP.patch.length;});
ok(r===0,'la sesión guarda la cadena de envíos vacía (no la reemplaza por PARALELO)');
await btn('PARALELO');await W(150);
/* ---- SALIDA */
await btn('SALIDA (PAD XY)');await W(250);
await tapMod('flt');
ok(await p.evaluate(()=>[...document.querySelectorAll('#patchSel button')].some(b=>b.textContent==='DESCONECTAR FILTER')),'SALIDA: DESCONECTAR FILTER');
await p.evaluate(()=>[...document.querySelectorAll('#patchSel button')].find(b=>b.textContent==='DESCONECTAR FILTER').click());await W(250);
ok(await L('out')===JSON.stringify(['dist>mst','mix>dist','mix>rep','mix>tdly','mix>trev','rep>mst']),'sin FILTER: MIX va directo a DIST y a REPEAT '+(await L('out')));
s1=await p.evaluate(()=>window.__rms());ok(s1>.05,'sigue sonando (RMS '+s1.toFixed(3)+')');
r=await p.evaluate(()=>GB.chainUnplug(GB.CFO,'dist'));ok(r==='ok'&&await L('out')===JSON.stringify(['mix>mst','mix>rep','mix>tdly','mix>trev','rep>mst']),'sin DIST tampoco: MIX → MASTER directo '+(await L('out')));
r=await p.evaluate(()=>{const b=JSON.stringify(GB.FXP.out);const x=GB.chainUnplug(GB.CFO,'mix');return [x,JSON.stringify(GB.FXP.out)===b];});
ok(r[0]==='silencio'&&r[1],'desconectar MIX no se permite (silencio) y no cambia nada');
await btn('ORIGINAL');await W(200);
await btn('DESCONECTAR TODO');await W(300);
ok(await L('out')===JSON.stringify(['mix>mst']),'SALIDA: DESCONECTAR TODO = MIX → MASTER directo');
s1=await p.evaluate(()=>window.__rms());ok(s1>.05,'sigue sonando (RMS '+s1.toFixed(3)+')');
r=await p.evaluate(async()=>{const A=window.__A,hf=async()=>{let m=-200;const F=new Float32Array(A.frequencyBinCount),b0=Math.floor(4000/(GB.ctx.sampleRate/2)*F.length);for(let i=0;i<16;i++){await new Promise(r=>setTimeout(r,25));A.getFloatFrequencyData(F);let s=0;for(let k=b0;k<F.length;k++)s+=F[k];m=Math.max(m,s/(F.length-b0));}return m;};
  const hi=await hf();GB.mfxOn('FLT',0,0);await new Promise(r=>setTimeout(r,150));const lo=await hf();GB.mfxOff('FLT');return {hi,lo};});
ok(Math.abs(r.hi-r.lo)<8,'con la salida desconectada el pad FILTER no actúa ('+r.hi.toFixed(0)+' / '+r.lo.toFixed(0)+' dB)');
/* cable: DESCONECTAR CABLE */
await btn('ORIGINAL');await W(200);
r=await p.evaluate(()=>{GB.PCH.sel={k:'cab',i:GB.FXP.out.findIndex(c=>c[0]==='mix'&&c[1]==='tdly')};GB.patchSelUi();const b=[...document.querySelectorAll('#patchSel button')].find(x=>x.textContent==='DESCONECTAR CABLE');if(!b)return 'sin botón';b.click();return GB.FXP.out.some(c=>c[0]==='mix'&&c[1]==='tdly')?'sigue':'ok';});
ok(r==='ok','elegir un cable → DESCONECTAR CABLE lo saca ('+r+')');
r=await p.evaluate(()=>{GB.PCH.sel={k:'cab',i:GB.FXP.out.findIndex(c=>c[0]==='mix'&&c[1]==='flt')};GB.patchSelUi();[...document.querySelectorAll('#patchSel button')].find(x=>x.textContent==='DESCONECTAR CABLE').click();return GB.FXP.out.some(c=>c[0]==='mix'&&c[1]==='flt');});
ok(r,'DESCONECTAR CABLE respeta la protección (MIX → FILTER no se saca)');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
