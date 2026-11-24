// v13.22: modo DJ con vista propia (solo patrones, sin selector) + DELAY/FILTER/REVERB como pad XY + SIREN como pad XY
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.22';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
const vis=s=>p.evaluate(s=>{const el=document.querySelector(s);if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).display!=='none';},s);
await tab('seq');await W(200);
ok(await vis('#rCenter')&&await vis('#rTools')&&!(await vis('#djFx')),'modo SEQ: selector del centro y botonera de programación');
const hSeq=await p.evaluate(()=>document.querySelector('#ringPanel').getBoundingClientRect().height);
await p.tap('#bPlay');await W(200);await p.tap('#rDJ');await W(200);
ok(!(await vis('#rCenter'))&&!(await vis('#rTools'))&&!(await vis('#rM'))&&await vis('#djFx'),'modo DJ: sin selector de instrumentos ni botonera de programación');
const names=await p.$$eval('#djFx .djfx b',a=>a.map(x=>x.textContent));ok(names.join(',')==='DELAY,FILTER,REVERB','botones DELAY · FILTER · REVERB');
const hDj=await p.evaluate(()=>document.querySelector('#ringPanel').getBoundingClientRect().height);ok(Math.abs(hDj-hSeq)<8,'la botonera mantiene el alto ('+hSeq.toFixed(0)+' → '+hDj.toFixed(0)+' px): el anillo no salta');
ok(await p.evaluate(()=>[...document.querySelectorAll('.djfx')].every(b=>b.getBoundingClientRect().height>60)),'botones grandes (pad)');
/* el anillo en DJ dibuja solo los pasos programados: contamos píxeles "de grilla" (grises) en un anillo vacío */
const grey=()=>p.evaluate(()=>{const cv=document.querySelector('#ring'),x=cv.getContext('2d'),d=x.getImageData(0,0,cv.width,cv.height).data;let g=0,n=0;for(let i=0;i<d.length;i+=4*7){if(d[i+3]>8){n++;const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);if(mx-mn<14&&d[i+3]<140)g++;}}return {g,n};});
let gDj=await grey();await p.tap('#rDJ');await W(250);let gSeq=await grey();await p.tap('#rDJ');await W(250);
ok(gDj.g<gSeq.g*.35,'DJ: el anillo muestra solo los patrones, sin la grilla ('+gDj.g+' vs '+gSeq.g+' px grises)');
/* pad XY: DELAY */
const pt=(sel,type,dx,dy,id)=>p.evaluate(([sel,type,dx,dy,id])=>{const el=document.querySelector(sel),r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:r.left+r.width/2+dx,clientY:r.top+r.height/2+dy,bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));},[sel,type,dx,dy,id]);
const D='.djfx[data-t="DLY"]',F='.djfx[data-t="FLT"]',R='.djfx[data-t="REV"]';
let f0=await p.evaluate(()=>GB.fxv());ok(f0.mDly===0&&f0.mRev===0&&f0.fltF>15000,'efectos apagados al arrancar');
await pt(D,'pointerdown',0,0,11);await W(150);let f1=await p.evaluate(()=>GB.fxv());ok(f1.mDly>.5,'mantener DELAY: entra el delay (envío '+f1.mDly.toFixed(2)+')');
await pt(D,'pointermove',80,-90,11);await W(200);let f2=await p.evaluate(()=>GB.fxv());
ok(f2.mDly>f1.mDly+.4&&f2.dfb>f1.dfb+.15,'mover arriba/derecha: más envío y más feedback ('+f2.mDly.toFixed(2)+' · fb '+f2.dfb.toFixed(2)+')');
ok(await p.evaluate(()=>document.querySelector('.djfx[data-t="DLY"]').classList.contains('dn')&&/FEEDBACK \d+/.test(document.querySelector('.djfx[data-t="DLY"] small').textContent)),'el botón muestra los valores del pad');
await pt(D,'pointermove',400,-400,11);await W(150);ok(await p.evaluate(()=>GB.DJXY.DLY.x===1&&GB.DJXY.DLY.y===1),'el pad se limita a 0…1 aunque el dedo salga del botón');
await pt(D,'pointerup',400,-400,11);await W(250);let f3=await p.evaluate(()=>({...GB.fxv(),h:!!GB.DJXY.DLY}));ok(f3.mDly<.05&&!f3.h,'soltar DELAY: se apaga el envío (las repeticiones siguen)');
/* FILTER */
await pt(F,'pointerdown',0,0,12);await pt(F,'pointermove',-90,-60,12);await W(200);let f4=await p.evaluate(()=>GB.fxv());
ok(f4.fltF<600&&f4.fltQ>8,'FILTER: izquierda cierra el corte, arriba sube la reso ('+Math.round(f4.fltF)+' Hz · Q '+f4.fltQ.toFixed(1)+')');
await pt(F,'pointerup',-90,-60,12);await W(300);ok(await p.evaluate(()=>GB.fxv().fltF>8000),'soltar FILTER: abre de nuevo');
/* REVERB, y dos a la vez (multitáctil) */
await pt(R,'pointerdown',0,-30,13);await pt(D,'pointerdown',0,0,14);await W(200);let f5=await p.evaluate(()=>GB.fxv());
ok(f5.mRev>1&&f5.mDly>.5,'REVERB y DELAY a la vez con dos dedos');
await pt(R,'pointerup',0,-30,13);await pt(D,'pointerup',0,0,14);await W(250);f5=await p.evaluate(()=>GB.fxv());ok(f5.mRev<.05&&f5.mDly<.05,'al soltar los dos se apagan');
/* apagar DJ con un efecto apretado lo suelta */
await pt(F,'pointerdown',-80,0,15);await W(100);await p.tap('#rDJ');await W(300);
ok(await p.evaluate(()=>GB.fxv().fltF>8000&&!GB.DJXY.FLT),'apagar DJ con un efecto apretado lo suelta');
ok(await vis('#rCenter')&&await vis('#rTools')&&!(await vis('#djFx')),'DJ apagado: vuelve el selector y la botonera de programación');
/* SIREN de arriba como pad XY */
const S='#bSir';
await pt(S,'pointerdown',0,0,21);await W(150);let s1=await p.evaluate(()=>({h:GB.sirHolds.has('btn'),pm:GB.SIR.pm,rm:GB.SIR.rm}));ok(s1.h&&s1.pm===1&&s1.rm===1,'SIREN: mantener suena (tono y lfo normales)');
await pt(S,'pointermove',0,-60,21);await W(100);let s2=await p.evaluate(()=>GB.SIR.pm);ok(Math.abs(s2-2)<.01,'SIREN: arrastrar arriba sube el tono una octava ('+s2.toFixed(2)+'×)');
await pt(S,'pointermove',110,30,21);await W(100);let s3=await p.evaluate(()=>({pm:GB.SIR.pm,rm:GB.SIR.rm}));ok(Math.abs(s3.rm-4)<.01&&s3.pm<1,'SIREN: derecha acelera el lfo, abajo baja el tono ('+s3.rm.toFixed(2)+'× · '+s3.pm.toFixed(2)+'×)');
await pt(S,'pointermove',-300,0,21);await W(60);ok(await p.evaluate(()=>Math.abs(GB.SIR.rm-.25)<.01),'SIREN: el pad se limita (lfo mínimo ¼)');
await pt(S,'pointerup',-300,0,21);await W(150);let s4=await p.evaluate(()=>({h:GB.sirHolds.has('btn'),pm:GB.SIR.pm,rm:GB.SIR.rm}));ok(!s4.h&&s4.pm===1&&s4.rm===1,'SIREN: soltar corta y vuelve a lo normal');
await pt(S,'pointerdown',0,0,22);await pt(S,'pointerup',0,0,22);await W(100);ok(await p.evaluate(()=>!GB.sirHolds.has('btn')),'SIREN: tocar y soltar sigue funcionando como antes');
await p.tap('#bPlay');await W(100);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
