// v13.28: HOLD por efecto en el pad XY de FX (se pueden dejar trabados varios a la vez)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.28';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await p.evaluate(()=>{for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;});await W(300);await tab('fx');await W(150);
await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='PAD').click());await W(150);
const fx=t=>p.evaluate(t=>[...document.querySelectorAll('#fxSeg button')].find(x=>x.dataset.t===t).click(),t);
const padAt=(fx_,fy,id=71)=>p.evaluate(([fx_,fy,id])=>{const el=document.querySelector('#xy'),r=el.getBoundingClientRect(),P={clientX:r.left+fx_*r.width,clientY:r.top+(1-fy)*r.height};
  el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,...P,bubbles:true,cancelable:true,pointerType:'touch'}));el.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,...P,bubbles:true,cancelable:true,pointerType:'touch'}));},[fx_,fy,id]);
const st=()=>p.evaluate(()=>({...GB.fxv(),H:Object.fromEntries(Object.entries(GB.XYH).map(([k,v])=>[k,v.on])),held:[...document.querySelectorAll('#fxSeg button.held')].map(b=>b.dataset.t),sel:GB.S.mfx,info:document.querySelector('#fxInfo').textContent,X:GB.XY}));
/* sin HOLD: soltar apaga */
await fx('DLY');await padAt(.5,.8);await W(200);let s=await st();ok(s.mDly<.05&&!s.H.DLY,'sin HOLD: soltar el pad apaga el DELAY');
/* con HOLD: DELAY queda trabado al pasar a FILTER */
await p.tap('#bHold');await W(50);
await fx('DLY');await padAt(.7,.8);await W(250);s=await st();ok(s.mDly>1&&s.H.DLY,'HOLD: el DELAY queda trabado al soltar ('+s.mDly.toFixed(2)+')');
await fx('FLT');await W(250);s=await st();ok(s.mDly>1&&s.H.DLY&&s.sel==='FLT','pasar a FILTER: el DELAY sigue trabado');
ok(s.held.includes('DLY')&&!s.held.includes('FLT'),'el botón DLY muestra que está trabado (●)');
ok(Math.abs(s.X.x-.5)<1e-6&&!s.X.on,'el pad muestra el FILTER (libre), no el punto del DELAY');
await padAt(.2,.6);await W(250);s=await st();ok(s.fltF<1000&&s.H.FLT&&s.mDly>1,'FILTER trabado también: DELAY + FILTER a la vez ('+Math.round(s.fltF)+' Hz)');
await fx('REV');await padAt(.6,.7);await W(200);s=await st();ok(s.mRev>1&&s.H.REV&&s.H.FLT&&s.H.DLY,'y REVERB: tres efectos trabados ('+s.held.join(' ')+')');
/* volver a un efecto trabado muestra su punto */
await fx('DLY');await W(100);s=await st();ok(Math.abs(s.X.x-.7)<.02&&s.X.on,'volver a DLY muestra su punto trabado');
ok(/TRABADO/.test(s.info),'el texto avisa: TRABADO (tocá DLY para soltarlo)');
/* tocar el efecto trabado lo suelta (solo ese) */
await fx('DLY');await W(300);s=await st();ok(s.mDly<.05&&!s.H.DLY&&s.H.FLT&&s.H.REV,'tocar DLY otra vez suelta solo el DELAY');
await fx('FLT');await fx('FLT');await W(300);s=await st();ok(s.fltF>8000&&!s.H.FLT&&s.H.REV,'tocar FLT dos veces suelta el FILTER');
/* apagar HOLD suelta todos */
await fx('DST');await padAt(.6,.6);await W(150);s=await st();ok(s.H.DST&&s.H.REV,'DIST y REVERB trabados');
await p.tap('#bHold');await W(300);s=await st();ok(!s.H.DST&&!s.H.REV&&s.mRev<.05&&s.held.length===0,'apagar HOLD suelta todos los efectos trabados');
/* sin HOLD, cambiar de efecto sigue como siempre */
await fx('DLY');await padAt(.5,.8);await W(150);s=await st();ok(!s.H.DLY,'sin HOLD vuelve a ser momentáneo');
/* el REPEAT trabado sigue loopeando */
await p.tap('#bHold');await fx('REP');await padAt(.4,.5);await W(500);s=await p.evaluate(async()=>{let l=0;for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,25));l=Math.max(l,GB.CHO.lvl('rep'));}return {h:GB.XYH.REP.on,l};});ok(s.h&&s.l>.02,'REPEAT trabado sigue loopeando ('+s.l.toFixed(3)+')');
await p.tap('#bHold');await W(200);ok(await p.evaluate(()=>!GB.XYH.REP.on),'y se suelta al apagar HOLD');
await p.tap('#bPlay');await W(100);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
