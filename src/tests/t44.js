// v13.17: zoom por pellizco en la onda, AUTO CUE y SAMPLER 2 (canal y renglón opcionales)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;try{localStorage.setItem('musica_gb_smppar','1');}catch(e){}});   // v13.24: los parámetros del pad se ven con AJUSTES
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.17';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');
/* ---- SAMPLER 2 apagado por defecto */
let r=await p.evaluate(()=>{const rows=document.querySelectorAll('#grid .row'),st=document.querySelectorAll('#strips .strip');return {n:rows.length,h:rows[GB.R_SMP2].hidden,lab:rows[GB.R_SMP2].querySelector('.rl').textContent,sh:st[7].hidden,sn:st[7].querySelector('.nm').textContent,on:GB.S.smp2,aud:GB.rowAud(GB.R_SMP2)};});
ok(r.n===18&&r.h&&r.lab==='SMP 2','renglón SMP 2 existe y está oculto ('+r.lab+')');
ok(r.sh&&r.sn==='SMP2','canal SMP2 en el mixer, oculto');
ok(!r.on&&!r.aud,'apagado: SMP 2 no suena');
/* sample de prueba: silencio 0,3 s → golpe que decae 0,4 s → silencio hasta 2 s */
await p.evaluate(()=>{const sr=44100,n=sr*2,d=new Float32Array(n);for(let i=Math.floor(sr*.3);i<Math.floor(sr*.7);i++){const t=(i-sr*.3)/sr;d[i]=Math.sin(2*Math.PI*220*t)*.8*Math.exp(-t*6);}
  GB.smpMode('chop');GB.smpSet(d,sr,'GOLPE',-1);Object.assign(GB.SMPL.chops[0],{s:0,e:1,pitch:0,rev:false,mode:'one',sync:'off',q:0,qa:true,spd:1,out:0});GB.SMPL.chops.slice(1).forEach((C,i)=>Object.assign(C,{s:.9+i*.03,e:.92+i*.03}));GB.SMPL.sel=0;});
await tab('smp');await W(150);
ok(await p.evaluate(()=>!!document.querySelector('#sCue')&&!!document.querySelector('#s2ch')&&!document.querySelector('#sPar').innerText.includes('SALIDA')),'botones AUTO CUE y CANAL 2 (v13.32: sin SALIDA por chop)');
/* ---- AUTO CUE */
await p.tap('#sCue');await W(150);
r=await p.evaluate(()=>({s:GB.SMPL.chops[0].s*2,e:GB.SMPL.chops[0].e*2,t:document.querySelector('#toast')?.textContent||''}));
ok(r.s>.29&&r.s<.301,'AUTO CUE: el inicio va al golpe ('+r.s.toFixed(4)+' s, el golpe empieza en 0,300)');
ok(r.e>.5&&r.e<.75,'AUTO CUE: corta el silencio del final ('+r.e.toFixed(3)+' s)');
ok(await p.evaluate(()=>{const d=GB.SMPL.buf.getChannelData(0),i=Math.round(GB.SMPL.chops[0].s*d.length);return Math.abs(d[i])<.06;}),'el inicio cae en un cruce por cero (sin click)');
await p.evaluate(()=>{GB.smpMode('pads');GB.SMPL.sel=0;const sr=44100,n=sr,d=new Float32Array(n);for(let i=Math.floor(sr*.2);i<Math.floor(sr*.5);i++){const t=(i-sr*.2)/sr;d[i]=Math.sin(2*Math.PI*330*t)*.7*Math.exp(-t*8);}GB.smpSet(d,sr,'PADG',0);Object.assign(GB.SMPL.chops[0],{ps:0,pe:1});});await W(80);
await p.tap('#sCue');await W(120);
r=await p.evaluate(()=>{const C=GB.SMPL.chops[0],L=GB.SMPL.pads[0].buf.duration;return {s:C.ps*L,e:C.pe*L};});ok(r.s>.19&&r.s<.201&&r.e>.3&&r.e<.52,'AUTO CUE en PADS recorta el pad ('+r.s.toFixed(3)+'–'+r.e.toFixed(3)+' s; golpe 0,200–0,500)');
await p.evaluate(()=>GB.smpMode('chop'));await W(80);
/* ---- ZOOM con dos dedos */
const pt=(type,id,x)=>p.evaluate(([type,id,x])=>{const w=document.querySelector('#wave'),R=w.getBoundingClientRect();w.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:R.left+x*R.width,clientY:R.top+R.height/2,bubbles:true,pointerType:'touch',isPrimary:id===1}));},[type,id,x]);
await p.evaluate(()=>GB.wvSet(0,1));
await pt('pointerdown',1,.4);await pt('pointerdown',2,.6);
for(let k=1;k<=5;k++){await pt('pointermove',1,.4-.06*k);await pt('pointermove',2,.6+.06*k);}
await pt('pointerup',1,.1);await pt('pointerup',2,.9);
r=await p.evaluate(()=>({a:GB.WV.a,b:GB.WV.b}));
ok(r.b-r.a<.3&&r.b-r.a>.2,'pellizco abre ×4 aprox (ventana '+r.a.toFixed(3)+'–'+r.b.toFixed(3)+')');
ok(Math.abs((r.a+r.b)/2-.5)<.02,'el zoom queda centrado entre los dedos');
ok(await p.evaluate(()=>{const s=GB.SMPL.chops[0];return s.e*2>.5&&s.s*2>.29;}),'pellizcar no mueve los marcadores');
/* con zoom, tocar mapea a la parte visible: arrastro el FIN del chop 1 */
await p.evaluate(()=>{GB.wvSet(.1,.4);GB.SMPL.chops[0].s=.15;GB.SMPL.chops[0].e=.35;GB.drawWave();});
await pt('pointerdown',3,(0.35-.1)/.3);await pt('pointermove',3,(0.30-.1)/.3);await pt('pointerup',3,(0.30-.1)/.3);
r=await p.evaluate(()=>GB.SMPL.chops[0].e);ok(Math.abs(r-.30)<.003,'con zoom, arrastrar el marcador es preciso ('+r.toFixed(4)+' ≈ 0,300)');
await W(400);await pt('pointerdown',4,.5);await pt('pointerup',4,.5);await W(60);await pt('pointerdown',5,.5);await pt('pointerup',5,.5);
r=await p.evaluate(()=>({a:GB.WV.a,b:GB.WV.b}));ok(r.a===0&&r.b===1,'doble toque vuelve a la onda entera');
await p.evaluate(()=>{const w=document.querySelector('#wave'),R=w.getBoundingClientRect();w.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,clientX:R.left+R.width*.25,clientY:R.top+5,bubbles:true,cancelable:true}));});
r=await p.evaluate(()=>({a:GB.WV.a,b:GB.WV.b}));ok(r.b-r.a<.85&&Math.abs(r.a+(r.b-r.a)*.25-.25)<.01,'rueda del mouse: zoom anclado al puntero');
await p.evaluate(()=>{GB.wvSet(.2,.3);const sr=44100,d=new Float32Array(sr);GB.smpSet(d,sr,'OTRO',-1);GB.drawWave();});
ok(await p.evaluate(()=>GB.WV.a===0&&GB.WV.b===1),'sample nuevo → zoom a la onda entera');
/* ---- v13.32: CHOP = canal 1 · PADS = canal 2 (el botón CANAL 2 los muestra en SEQ y MIX) */
await p.evaluate(()=>{GB.smpMode('chop');const sr=44100,n=sr,d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=Math.sin(i/9)*.4;GB.smpSet(d,sr,'TONO',-1);GB.SMPL.cch.forEach((C,i)=>Object.assign(C,{sync:'off',spd:1,pitch:0}));
  GB.smpLoadPad(1,d,sr,'PADTONO');GB.SMPL.sel=1;GB.smpUi();});
await p.tap('#s2ch');await W(150);
r=await p.evaluate(()=>{const rows=document.querySelectorAll('#grid .row'),st=document.querySelectorAll('#strips .strip');return {on:GB.S.smp2,h:rows[GB.R_SMP2].hidden,sh:st[7].hidden,btn:document.querySelector('#s2ch').textContent};});
ok(r.on&&!r.h&&!r.sh,'CANAL 2: aparece el renglón SMP 2 y el canal SMP2');
ok(/CANAL 2 ✓/.test(r.btn),'el botón muestra CANAL 2 ✓');
ok(await p.evaluate(()=>GB.smpOut(1,0)===5&&GB.smpOut(1,1)===7),'CHOP sale por SAMPLER, PADS por SAMPLER 2');
/* ruteo real */
await p.evaluate(()=>{const o=AudioNode.prototype.connect;window.__cn=[];AudioNode.prototype.connect=function(d,...a){window.__cn.push(d);return o.call(this,d,...a);};});
r=await p.evaluate(()=>{window.__cn=[];GB.chopPlay(1,GB.ctx.currentTime+.01,1,undefined,1);const a=window.__cn.includes(GB.bus[7].inp);window.__cn=[];GB.chopPlay(0,GB.ctx.currentTime+.01,1,undefined,0);return [a,window.__cn.includes(GB.bus[5].inp),window.__cn.includes(GB.bus[7].inp)];});
ok(r[0]&&r[1]&&!r[2],'audio: pad 2 → bus SAMPLER 2, chop 1 → bus SAMPLER');
/* el renglón SMP 2 dispara los PADS; SMPL los CHOPS */
r=await p.evaluate(()=>{GB.smpSeq2[0]=2;GB.pat[GB.R_SMP2][0]=1;window.__cn=[];GB.trig(GB.R_SMP2,0,GB.ctx.currentTime+.02);const a=window.__cn.includes(GB.bus[7].inp)&&GB.rowAud(GB.R_SMP2)&&!!GB.SMPL.vp[1];
  GB.smpSeq[0]=2;GB.pat[11][0]=1;window.__cn=[];GB.trig(11,0,GB.ctx.currentTime+.02);return [a,window.__cn.includes(GB.bus[5].inp)&&!!GB.SMPL.vc[1]];});
ok(r[0],'secuenciador: SMP 2 dispara el PAD por el canal 2');ok(r[1],'secuenciador: SMPL dispara el CHOP por el canal 1');
ok(await p.evaluate(()=>GB.sSeq(GB.ROWS[GB.R_SMP2])===GB.smpSeq2&&GB.sSeq(GB.ROWS[11])===GB.smpSeq),'cada renglón tiene su secuencia');
/* guardar/abrir sesión */
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const ok1=j.smp2===true&&j.smpSeq2[0]===2&&j.smp.v===2&&Array.isArray(j.smp.pch);
  GB.loadSession(Object.assign(JSON.parse(JSON.stringify(j)),{smp2:false}));const off=!GB.S.smp2&&document.querySelectorAll('#grid .row')[GB.R_SMP2].hidden;
  GB.loadSession(j);return [ok1,off,GB.S.smp2&&GB.smpSeq2[0]===2&&!document.querySelectorAll('#grid .row')[GB.R_SMP2].hidden];});
ok(r[0],'la sesión guarda CANAL 2, su secuencia y los ajustes de cada banco');
ok(r[1]&&r[2],'abrir sesión restaura CANAL 2 prendido/apagado');
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));delete j.smp2;delete j.smpSeq2;j.smp={chops:GB.SMPL.cch.map(C=>({s:C.s,e:C.e,pitch:0,out:1})),mode:'chop'};GB.applySnapshot(j);
  return !GB.S.smp2&&GB.smpSeq2.every(v=>v===0)&&GB.SMPL.cch.every(C=>C.src===0&&!('out' in C));});
ok(r,'sesión vieja (v13.16) abre con CANAL 2 oculto y los chops en S1');
/* anillo y mixer con SMP 2 prendido */
await p.evaluate(()=>{GB.S.smp2=true;GB.smp2Ui();});await tab('seq');await W(200);
ok(await p.evaluate(()=>{const b=[...document.querySelectorAll('#rPickBox .cap')];return b.length>=18?!b[GB.R_SMP2].hidden:true;}),'selector de pista del anillo muestra SMP 2');
await tab('mix');await W(120);
ok(await p.$$eval('#strips .strip',a=>a.filter(x=>!x.hidden).length===9),'mixer con 9 canales visibles');
await p.evaluate(()=>{GB.S.smp2=true;});await tab('smp');await W(60);await p.tap('#s2ch');await W(100);
r=await p.evaluate(()=>({on:GB.S.smp2,aud:GB.rowAud(GB.R_SMP2),h:document.querySelectorAll('#strips .strip')[7].hidden,pad:!!GB.chopPlay(1,GB.ctx.currentTime+.01,1,undefined,1)}));
ok(!r.on&&!r.aud&&r.h&&r.pad,'ocultar CANAL 2: SMP 2 se calla en el SEQ, los PADS se tocan igual');
await tab('seq');await W(300);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
