// v13.24: sampler con 8 pads, fila de fuentes compacta, AJUSTES muestra los parámetros y achata los pads
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.24';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(100);await p.tap('#bPlay');await tab('smp');await W(150);
/* fila de fuentes */
let r=await p.evaluate(()=>{const ids=['#sMic','#sRecL','#sFileL','#sRes','#sDemo','#sClr'].map(s=>document.querySelector(s).getBoundingClientRect());return {tops:ids.map(x=>Math.round(x.top)),h:Math.max(...ids.map(x=>x.height))};});
ok(new Set(r.tops).size===1,'MIC · GRABADOR · ARCHIVO · RESAMP · DEMO · VACIAR en una sola fila');
ok(r.h<=32,'fila de fuentes chica ('+Math.round(r.h)+' px de alto)');
/* 8 pads */
r=await p.evaluate(()=>{const P=[...document.querySelectorAll('#sPads .pad')];return {n:P.length,rows:new Set(P.map(x=>Math.round(x.getBoundingClientRect().top))).size,cols:new Set(P.map(x=>Math.round(x.getBoundingClientRect().left))).size,h:P[0].getBoundingClientRect().height};});
ok(r.n===8&&r.rows===2&&r.cols===4,'8 pads en 2 filas de 4');
const hBig=r.h;
ok(await p.evaluate(()=>GB.NSP===8&&GB.SMPL.chops.length===8&&GB.SMPL.pads.length===8&&GB.SMPL.voice.length===8),'el motor tiene 8 chops / 8 pads');
/* AJUSTES apagado por defecto */
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#sPar')).display==='none'&&!document.querySelector('#sAj').classList.contains('on')),'AJUSTES apagado: no se ven los parámetros');
await p.evaluate(()=>document.querySelector('#sDemo').click());await W(500);
r=await p.evaluate(()=>GB.SMPL.chops.map(C=>[+C.s.toFixed(3),+C.e.toFixed(3)]));ok(r.length===8&&Math.abs(r[7][0]-.875)<1e-3&&r[7][1]===1,'DEMO: el sample se corta en 8');
ok(await p.evaluate(()=>!!GB.chopPlay(7,GB.ctx.currentTime+.01,1)),'el pad 8 suena');
/* AJUSTES prendido */
await p.tap('#sAj');await W(200);
r=await p.evaluate(()=>{const P=document.querySelector('#sPads .pad');return {par:getComputedStyle(document.querySelector('#sPar')).display,h:P.getBoundingClientRect().height,sm:getComputedStyle(P.querySelector('small')).display,on:document.querySelector('#sAj').classList.contains('on'),txt:document.querySelector('#sPar').textContent};});
ok(r.on&&r.par!=='none'&&/CHOP 1/.test(r.txt)&&/REVERSA/.test(r.txt),'AJUSTES: aparecen los parámetros del pad');
ok(r.h<hBig*.6&&r.sm==='none','AJUSTES: los pads se achatan ('+Math.round(hBig)+' → '+Math.round(r.h)+' px) como en TECLAS');
ok(await p.evaluate(()=>{const b=document.querySelector('#sPar').getBoundingClientRect(),n=document.querySelector('nav').getBoundingClientRect();return b.height>150&&b.bottom<=n.top+1;}),'el panel de ajustes tiene lugar y no tapa la navegación');
const pad6=await p.evaluate(()=>{const r=document.querySelectorAll('#sPads .pad')[5].getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await p.touchscreen.tap(pad6.x,pad6.y);await W(200);
ok(await p.evaluate(()=>GB.SMPL.sel===5&&/CHOP 6/.test(document.querySelector('#sPar').textContent)),'tocar el pad 6 muestra sus ajustes (CHOP 6)');
await p.reload();await W(500);await p.tap('#bPlay');await W(100);await p.tap('#bPlay');await tab('smp');await W(150);
ok(await p.evaluate(()=>document.querySelector('#sAj').classList.contains('on')&&document.querySelector('#v-smp').classList.contains('paron')),'AJUSTES queda prendido al reabrir');
await p.tap('#sAj');await W(150);ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#sPar')).display==='none'),'AJUSTES apagado de nuevo: pads grandes');
/* motor con 8 */
r=await p.evaluate(()=>{GB.smpEqual();const eq=GB.SMPL.chops.map(C=>+C.e.toFixed(3));const c1=GB.smpCopy(0,7),c2=GB.smpCopy(0,8);return {eq,c1,c2};});
ok(r.eq[0]===.125&&r.eq[7]===1&&r.c1&&!r.c2,'IGUALES en 8 · COPIAR hasta el pad 8');
/* secuenciador: paleta del SMPL con 8 y AZAR hasta 8 */
await tab('seq');await W(150);await p.evaluate(()=>{GB.S.sel={r:11,s:0};GB.pat[11][0]=1;GB.smpSeq[0]=1;GB.renderPalette();});await W(100);
ok(await p.evaluate(()=>[...document.querySelectorAll('#palette .pal button')].filter(b=>/CHOP|PAD/.test(b.textContent)).length===8),'paleta del secuenciador: CHOP 1…8');
r=await p.evaluate(()=>{GB.smpSeq.fill(0);GB.smpSeq[3]=8;GB.pat[11].fill(0);GB.pat[11][3]=1;const o=AudioNode.prototype.connect;let hit=false;AudioNode.prototype.connect=function(d,...a){if(d===GB.bus[5].inp)hit=true;return o.call(this,d,...a);};GB.trig(11,3,GB.ctx.currentTime+.02);AudioNode.prototype.connect=o;return hit;});
ok(r,'un paso con el pad 8 suena desde el secuenciador');
/* sesiones viejas de 4 pads */
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));j.smp.chops=j.smp.chops.slice(0,4).map((C,i)=>Object.assign(C,{s:i/4,e:(i+1)/4,pitch:i}));j.smp.mode='chop';GB.loadSession(j);
  return GB.SMPL.chops.map(C=>[C.s,C.e,C.pitch]);});
ok(r[0][1]===.25&&r[3][1]===1&&r[4][0]===0&&r[4][1]===.25&&r[7][1]===1&&r[4][2]===0,'sesión vieja de 4 chops: 1–4 como estaban, 5–8 repiten las regiones con ajustes de fábrica');
ok(await p.evaluate(()=>GB.SMPL.chops.every(C=>C.out===0&&C.spd===1)),'los 8 chops con valores válidos');
/* PADS: convierte 8 chops en 8 samples */
r=await p.evaluate(()=>{GB.smpMode('chop');document.querySelector('#sDemo').click();GB.SMPL.pads.fill(null);const conv=GB.smpMode('pads');return {conv,n:GB.SMPL.pads.filter(Boolean).length};});
ok(r.conv&&r.n===8,'pasar a PADS convierte los 8 chops en 8 samples');
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(true)));const n=j.smp.pads.length;j.smp.pads=j.smp.pads.slice(0,4);GB.loadSession(j);return {n,after:GB.SMPL.pads.filter(Boolean).length};});
ok(r.n===8&&r.after===4,'sesión con 4 pads: los pads 5–8 quedan vacíos ('+r.after+' cargados)');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
