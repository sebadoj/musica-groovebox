// v13.21: modo DJ — el anillo del secuenciador como plato
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.21';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await tab('seq');await W(200);
let r=await p.evaluate(()=>{const B=document.querySelector('#rDJ').getBoundingClientRect(),R=document.querySelector('#ring').getBoundingClientRect();return {b:B,R,txt:document.querySelector('#rDJ').textContent};});
ok(r.txt==='DJ','botón DJ en el anillo');
ok(r.b.left<r.R.left+r.R.width*.2&&r.b.bottom>r.R.bottom-r.R.height*.2&&r.b.bottom<=r.R.bottom+6,'abajo a la izquierda del anillo');
const G=await p.evaluate(()=>{const R=document.querySelector('#ring').getBoundingClientRect();return {cx:R.left+R.width/2,cy:R.top+R.height/2,r:R.width*.43};});
const pe=(type,a,id=9)=>p.evaluate(([type,a,g,id])=>{document.querySelector('#ring').dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:g.cx+Math.sin(a)*g.r,clientY:g.cy-Math.cos(a)*g.r,bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));},[type,a,G,id]);
const st=()=>p.evaluate(()=>GB.scrQ());
/* sin DJ: tocar el anillo edita pasos */
const sum=()=>p.evaluate(()=>GB.pat.flat().reduce((a,b)=>a+(b?1:0),0)+'/'+GB.S.sel.r+'/'+GB.S.sel.s);
let s0=await sum();await pe('pointerdown',.05);await pe('pointerup',.05);await W(80);ok(await sum()!==s0,'sin DJ: tocar el anillo edita pasos');
await pe('pointerdown',.05);await pe('pointerup',.05);await W(80);
/* DJ prendido */
await p.tap('#bPlay');await W(300);await p.tap('#rDJ');await W(150);
ok(await p.evaluate(()=>GB.S.dj&&document.querySelector('#rDJ').classList.contains('on')),'DJ prendido');
const r1=await p.evaluate(()=>GB.DJV.rot);await W(500);const r2=await p.evaluate(()=>GB.DJV.rot);
ok(r2>r1,'mientras suena, el plato gira en sentido horario ('+r1.toFixed(3)+' → '+r2.toFixed(3)+' vueltas)');
ok(await p.evaluate(()=>Math.abs(GB.DJV.pos-(GB.S.cur+0.5))<1.2),'la aguja (arriba) marca el paso que suena');
s0=await sum();await pe('pointerdown',.3);await W(250);
r=await p.evaluate(()=>({h:GB.SCR.held,pa:GB.SCR.paused}));ok(r.h&&r.pa,'tocar el plato: frena y pausa el secuenciador');
ok(await sum()===s0,'con DJ, tocar el anillo NO edita pasos');
const rh1=await p.evaluate(()=>GB.DJV.rot);await W(300);ok(await p.evaluate(v=>Math.abs(GB.DJV.rot-v)<1e-6,rh1),'apretado: el plato queda quieto');
/* cuarto de vuelta antihorario = atrasa 1/4 del secuenciador */
for(let k=1;k<=10;k++){await pe('pointermove',.3-k*Math.PI/20);await W(15);}await W(250);
let q=await st();const sdv=await p.evaluate(()=>GB.sd()*GB.STEPS/4);const back=(q.endF-q.ph)/q.sr;
ok(Math.abs(back-(sdv+.015))<.06,'¼ de vuelta antihorario atrasa ¼ del secuenciador ('+back.toFixed(3)+' s ≈ '+sdv.toFixed(3)+')');
ok(await p.evaluate(v=>Math.abs((v-GB.DJV.rot)-.25)<.02,rh1),'el plato gira con el dedo (−¼ de vuelta)');
/* pasar por el corte de arriba (ángulo 0 / 1) sin saltos */
for(let k=1;k<=3;k++){await pe('pointermove',.3-Math.PI/2+k*Math.PI/12);await W(15);}await W(200);q=await st();const back2=(q.endF-q.ph)/q.sr;
ok(Math.abs(back2-(sdv/2+.015))<.06,'volver ⅛ horario adelanta sin saltos ('+back2.toFixed(3)+' s)');
/* horario de más: no pasa del punto donde frenó */
for(let k=1;k<=12;k++){await pe('pointermove',.3-Math.PI/4+k*Math.PI/12);await W(10);}await W(250);q=await st();ok(q.endF-q.ph<q.sr*.02,'horario de más (cruzando las 12): se queda en el punto donde frenó');
for(let k=1;k<=4;k++){await pe('pointermove',.3-Math.PI/4+Math.PI-k*Math.PI/16);await W(15);}await W(250);q=await st();const bk3=(q.endF-q.ph)/q.sr;
ok(Math.abs(bk3-(sdv/2+.015))<.07,'después del tope, girar para atrás responde enseguida (sin zona muerta: '+bk3.toFixed(3)+' s)');
/* soltar desde ¼ atrás */
for(let k=1;k<=8;k++){await pe('pointermove',.3+Math.PI/2-k*Math.PI/16);await W(10);}await W(250);
q=await st();const backU=(q.endF-q.ph)/q.sr;await pe('pointerup',0);
await W(200);r=await p.evaluate(()=>({l:GB.SCR.landing,rot:GB.DJV.rot}));const rA=r.rot;await W(200);const rB=await p.evaluate(()=>GB.DJV.rot);
ok(r.l&&rB>rA,'soltar: el plato vuelve a girar mientras reproduce lo atrasado (atrás '+backU.toFixed(2)+' s, landing '+r.l+', '+rA.toFixed(3)+'→'+rB.toFixed(3)+')');
await W(backU*1000+600);
r=await p.evaluate(()=>({pa:GB.SCR.paused,l:GB.SCR.landing,pl:GB.S.playing}));ok(!r.pa&&!r.l&&r.pl,'al llegar al punto de frenado el secuenciador sigue');
ok(await p.evaluate(()=>Math.abs(GB.DJV.pos-(GB.S.cur+0.5))<1.2),'la aguja vuelve a coincidir con el paso que suena');
/* volver a agarrar el plato mientras reproduce lo atrasado */
for(let k=1;k<=8;k++){await pe('pointermove',.3-k*Math.PI/16,9);}
await pe('pointerdown',.3);await W(150);for(let k=1;k<=8;k++){await pe('pointermove',.3-k*Math.PI/16);await W(12);}await W(200);q=await st();const g1=(q.endF-q.ph)/q.sr;
await pe('pointerup',.3-Math.PI/2);await W(250);
r=await p.evaluate(()=>({l:GB.SCR.landing,pa:GB.SCR.paused,c:GB.SCR.commit}));
await pe('pointerdown',0);await W(150);const rg=await p.evaluate(()=>({h:GB.SCR.held,pa:GB.SCR.paused,g0:GB.SCR.g0}));q=await st();
ok(rg.h&&rg.pa&&rg.g0<-.2&&q.mode===1,'se puede volver a agarrar el plato mientras reproduce lo atrasado (estaba '+(-rg.g0).toFixed(2)+' s atrás)');
for(let k=1;k<=24;k++){await pe('pointermove',k*Math.PI/12);await W(8);}await W(250);q=await st();ok(q.endF-q.ph<q.sr*.02,'desde ahí, girar horario llega justo al punto de frenado (tope)');
await pe('pointerup',2*Math.PI);await W(900);
r=await p.evaluate(()=>({pa:GB.SCR.paused,l:GB.SCR.landing,pl:GB.S.playing}));ok(!r.pa&&!r.l&&r.pl,'y al soltar sigue el tema');
/* el bailarín también hace girar el plato en modo DJ */
await p.evaluate(()=>{const s=document.querySelector('#scope'),R=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent('pointerdown',{pointerId:5,clientX:R.left+20,clientY:R.top+20,bubbles:true,pointerType:'touch'}));});
await W(150);const rb1=await p.evaluate(()=>GB.DJV.rot);
await p.evaluate(()=>{const s=document.querySelector('#scope'),R=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent('pointermove',{pointerId:5,clientX:R.left+20,clientY:R.top+120,bubbles:true,pointerType:'touch'}));});await W(150);
const rb2=await p.evaluate(()=>GB.DJV.rot);ok(rb2<rb1-.02,'scratch con el bailarín: el plato del anillo lo sigue');
await p.evaluate(()=>{const s=document.querySelector('#scope'),R=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent('pointerup',{pointerId:5,clientX:R.left+20,clientY:R.top+120,bubbles:true,pointerType:'touch'}));});await W(1200);
/* se recuerda y se apaga */
await p.reload();await W(500);await tab('seq');await W(150);ok(await p.evaluate(()=>GB.S.dj&&document.querySelector('#rDJ').classList.contains('on')),'DJ queda prendido al reabrir la app');
await p.tap('#rDJ');await W(100);ok(await p.evaluate(()=>!GB.S.dj&&GB.DJV.rot===0),'DJ apagado: el anillo vuelve a su lugar');
s0=await sum();await pe('pointerdown',.05);await pe('pointerup',.05);await W(80);ok(await sum()!==s0,'DJ apagado: el anillo vuelve a editar pasos');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
