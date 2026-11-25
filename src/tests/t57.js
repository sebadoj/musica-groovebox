// v13.32: CHOP = canal 1 (hasta 3 samples) · PADS = canal 2 · sin DEMO/RESAMP/2 CANALES · selector de sample de CHOP
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.32';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(100);await p.tap('#bPlay');await tab('smp');await W(150);
const vis=s=>p.evaluate(s=>{const el=document.querySelector(s);return !!el&&el.getBoundingClientRect().height>0&&getComputedStyle(el).display!=='none';},s);
ok(await p.evaluate(()=>!document.querySelector('#sDemo')&&!document.querySelector('#sRes')),'sin botones DEMO ni RESAMP');
ok(await p.evaluate(()=>!/2 CANALES/.test(document.querySelector('#v-smp').innerText)&&/CANAL 2/.test(document.querySelector('#s2ch').textContent)),'sin el switch 2 CANALES: botón CANAL 2');
ok(await vis('#sSel')&&await p.evaluate(()=>document.querySelectorAll('#sSel .sk').length===3),'CHOP: selector de sample 1 · 2 · 3');
/* tres sonidos distintos */
await p.evaluate(()=>{const sr=44100;window.__mk=(f,n)=>{const d=new Float32Array(Math.floor(sr*n));for(let i=0;i<d.length;i++)d[i]=Math.sin(2*Math.PI*f*i/sr)*.5;return d;};window.__sr=sr;});
await p.evaluate(()=>{GB.SMPL.cur=0;GB.smpSet(window.__mk(110,2),window.__sr,'BAJO',-1);GB.smpUi();});
let r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(''),e:GB.SMPL.cch.map(C=>+C.e.toFixed(3))}));
ok(r.src==='00000000'&&r.e[7]===1&&r.e[0]===.125,'cargar S1: los 8 chops libres lo toman y se cortan parejo');
/* S2: cargar no toca los chops ya asignados */
await p.evaluate(()=>document.querySelectorAll('#sSel .sk')[1].click());await W(80);
await p.evaluate(()=>{GB.smpSet(window.__mk(440,1),window.__sr,'VOZ',-1);GB.smpUi();});
r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(''),cur:GB.SMPL.cur,has:!!GB.SMPL.srcs[1],e:GB.SMPL.cch.map(C=>+C.e.toFixed(3))}));
ok(r.cur===1&&r.has&&r.src==='00000000'&&r.e[0]===.125,'cargar S2: los chops que ya usan S1 no se tocan');
/* ASIGNAR: el chop 6 pasa a S2 */
await p.evaluate(()=>{GB.SMPL.sel=5;GB.smpUi();});await p.tap('#sAsg');await W(100);
r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(''),s:GB.SMPL.cch[5].s,e:GB.SMPL.cch[5].e,lbl:document.querySelector('#sAsg').textContent,txt:document.querySelectorAll('#sPads .pad')[5].querySelector('small').textContent}));
ok(r.src==='00000100'&&r.s===0&&r.e===1,'ASIGNAR: el chop 6 pasa a S2 (entero), los demás siguen en S1');
ok(/✓/.test(r.lbl)&&/^S2/.test(r.txt),'el botón y el pad lo muestran ('+r.lbl+' · '+r.txt+')');
/* cargar de nuevo S1: se recortan solo sus 7 chops; el 6 sigue en S2 */
await p.evaluate(()=>{document.querySelectorAll('#sSel .sk')[0].click();GB.smpSet(window.__mk(220,2),window.__sr,'BAJO2',-1);});
r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(''),six:[GB.SMPL.cch[5].s,GB.SMPL.cch[5].e],n:GB.chopsOf(0).length,last:+GB.SMPL.cch[7].e.toFixed(3),first:+GB.SMPL.cch[0].e.toFixed(3)}));
ok(r.src==='00000100'&&r.six[0]===0&&r.six[1]===1&&r.n===7&&r.last===1&&Math.abs(r.first-1/7)<.002,'recargar S1: se reparte entre sus 7 chops; el chop 6 (S2) no se modifica');
/* cada chop suena con su sample */
await p.evaluate(()=>{const o=AudioBufferSourceNode.prototype.start;window.__bufs=[];AudioBufferSourceNode.prototype.start=function(...a){window.__bufs.push(this.buffer);return o.apply(this,a);};});
r=await p.evaluate(()=>{window.__bufs=[];GB.chopPlay(5,GB.ctx.currentTime+.01,1,undefined,0);GB.chopPlay(0,GB.ctx.currentTime+.01,1,undefined,0);return [window.__bufs[0]===GB.SMPL.srcs[1].buf,window.__bufs[1]===GB.SMPL.srcs[0].buf];});
ok(r[0]&&r[1],'el chop 6 suena con S2 y el chop 1 con S1');
/* VACIAR S2: su chop queda libre; cargar S3 lo toma */
await p.evaluate(()=>document.querySelectorAll('#sSel .sk')[1].click());await p.tap('#sClr');await W(80);
r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(','),s2:!!GB.SMPL.srcs[1]}));ok(!r.s2&&r.src==='0,0,0,0,0,-1,0,0','VACIAR S2: su chop queda libre, el resto sigue en S1');
await p.evaluate(()=>{document.querySelectorAll('#sSel .sk')[2].click();GB.smpSet(window.__mk(880,.5),window.__sr,'HAT',-1);GB.smpUi();});
r=await p.evaluate(()=>({src:GB.SMPL.cch.map(C=>C.src).join(','),last:GB.SMPL.last}));ok(r.src==='0,0,0,0,0,2,0,0'&&r.last.took===1,'cargar S3: el chop libre (6) lo toma, nada más');
ok(await p.evaluate(()=>{const t=[...document.querySelectorAll('#sSel .sk')].map(b=>b.textContent);return /^1 · BAJO2 \(7\)/.test(t[0])&&/vacío/.test(t[1])&&/^3 · HAT \(1\)/.test(t[2]);}),'el selector muestra nombre y cuántos chops tiene cada sample');
/* tocar un chop lleva la onda a su sample */
await p.evaluate(()=>document.querySelectorAll('#sSel .sk')[0].click());
const pad=await p.evaluate(()=>{const r=document.querySelectorAll('#sPads .pad')[5].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await p.touchscreen.tap(pad.x,pad.y);await W(150);ok(await p.evaluate(()=>GB.SMPL.cur===2&&GB.SMPL.sel===5),'tocar el chop 6 muestra su sample (S3) en la onda');
/* PADS: otro sampler con sus propios ajustes */
await p.evaluate(()=>{GB.SMPL.cch[0].pitch=3;document.querySelector('#sModeSeg [data-m=pads]').click();});await W(100);
ok(!(await vis('#sSel')),'PADS: el selector de sample se oculta');
r=await p.evaluate(()=>{GB.SMPL.sel=0;GB.smpSet(window.__mk(330,1),window.__sr,'PADX');GB.SMPL.pch[0].pitch=-5;return {cp:GB.SMPL.cch[0].pitch,pp:GB.SMPL.pch[0].pitch,src:GB.SMPL.cch.map(C=>C.src).join(','),pad:GB.SMPL.pads[0].name};});
ok(r.cp===3&&r.pp===-5&&r.pad==='PADX'&&r.src==='0,0,0,0,0,2,0,0','PADS tiene sus propios samples y ajustes; los chops no cambian');
r=await p.evaluate(()=>{window.__bufs=[];GB.chopPlay(0,GB.ctx.currentTime+.01,1,undefined,1);GB.chopPlay(0,GB.ctx.currentTime+.01,1,undefined,0);return [window.__bufs[0]===GB.SMPL.pads[0].buf,window.__bufs[1]===GB.SMPL.srcs[0].buf,!!GB.SMPL.vp[0],!!GB.SMPL.vc[0]];});
ok(r.every(Boolean),'el pad 1 y el chop 1 suenan a la vez, cada uno con lo suyo');
await p.evaluate(()=>document.querySelector('#sModeSeg [data-m=chop]').click());
/* paleta del secuenciador */
await tab('seq');await W(100);await p.evaluate(()=>{GB.S.smp2=true;GB.smp2Ui();GB.S.sel={r:11,s:0};GB.renderPalette();});await W(80);
ok(await p.evaluate(()=>{const t=[...document.querySelectorAll('#palette .pal button')].map(b=>b.textContent);return t.some(x=>/CHOP 6S3/.test(x))&&t.some(x=>/CHOP 1S1/.test(x));}),'paleta SMPL: CHOP 1…8 con su sample');
await p.evaluate(()=>{GB.S.sel={r:GB.R_SMP2,s:0};GB.renderPalette();});ok(await p.evaluate(()=>[...document.querySelectorAll('#palette .pal button')].some(b=>/PAD 1PADX/.test(b.textContent))),'paleta SMP 2: PAD 1…8');
/* sesión con los 3 samples */
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(true)));const n=j.smp.srcs.filter(Boolean).length;GB.SMPL.srcs.fill(null);GB.SMPL.cch.forEach(C=>C.src=-1);GB.loadSession(j);
  return {n,names:GB.SMPL.srcs.map(s=>s?s.name:null),src:GB.SMPL.cch.map(C=>C.src).join(','),pad:GB.SMPL.pads[0]&&GB.SMPL.pads[0].name};});
ok(r.n===2&&r.names[0]==='BAJO2'&&r.names[2]==='HAT'&&r.names[1]===null&&r.src==='0,0,0,0,0,2,0,0'&&r.pad==='PADX','la sesión guarda los 3 samples de CHOP, las asignaciones y los pads');
/* teléfono */
await W(700);await p.reload();await W(1300);await p.tap('#bPlay');await W(100);await p.tap('#bPlay');
r=await p.evaluate(()=>({names:GB.SMPL.srcs.map(s=>s?s.name:null),src:GB.SMPL.cch.map(C=>C.src).join(','),pad:GB.SMPL.pads[0]&&GB.SMPL.pads[0].name}));
ok(r.names[0]==='BAJO2'&&r.names[2]==='HAT'&&r.src==='0,0,0,0,0,2,0,0'&&r.pad==='PADX','al reabrir la app vuelven los 3 samples, las asignaciones y los pads');
/* sesión vieja de un solo sample */
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const pcm=GB.smpEncode(GB.SMPL.srcs[0].buf,'VIEJO');j.smp={chops:GB.SMPL.cch.map(C=>({s:C.s,e:C.e,pitch:0})),mode:'chop',pcm};GB.SMPL.srcs.fill(null);GB.loadSession(j);
  return {s1:GB.SMPL.srcs[0]&&GB.SMPL.srcs[0].name,src:GB.SMPL.cch.map(C=>C.src).join('')};});
ok(r.s1==='VIEJO'&&r.src==='00000000','sesión de antes (un sample): va a S1 y todos los chops lo usan');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
