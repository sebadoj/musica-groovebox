// v13.30: sin BORRAR en la barra; ↶ deshacer (hasta 2 pasos) y ↷ rehacer
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.31';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(500);
let r=await p.evaluate(()=>({clr:!!document.querySelector('#bClr'),borrar:[...document.querySelectorAll('header button')].some(b=>/BORRAR/.test(b.textContent)),u:document.querySelector('#bUndo'),rd:document.querySelector('#bRedo')}));
ok(!r.clr&&!r.borrar,'ya no está BORRAR en la barra');
r=await p.evaluate(()=>{const u=document.querySelector('#bUndo'),d=document.querySelector('#bRedo');return {u:u&&u.textContent,d:d&&d.textContent,uo:u.classList.contains('off'),do:d.classList.contains('off'),vis:u.getBoundingClientRect().width>20&&d.getBoundingClientRect().width>20};});
ok(r.u==='↶'&&r.d==='↷'&&r.vis,'botones ↶ y ↷ en la barra');ok(r.uo&&r.do,'arrancan apagados (no hay nada para deshacer)');
const step=(row,s,v)=>p.evaluate(([row,s,v])=>{GB.pat[row][s]=v;GB.queueSave();},[row,s,v]);
const has=(row,s)=>p.evaluate(([row,s])=>!!GB.pat[row][s],[row,s]);
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.histReset();});
/* tres cambios separados */
await step(0,0,1);await W(1100);await step(0,4,1);await W(1100);await step(0,8,1);await W(1100);
r=await p.evaluate(()=>({u:GB.HIST.u.length,n:document.querySelector('#bUndo').dataset.n,off:document.querySelector('#bUndo').classList.contains('off')}));
ok(r.u===2&&!r.off,'tres cambios: guarda los últimos 2 pasos');
ok(await p.evaluate(()=>['#bUndo','#bRedo'].every(s=>{const c=getComputedStyle(document.querySelector(s),'::after').content;return c==='none'||c==='normal'||c==='""';})),'v13.31: los botones no muestran numeritos');
await p.tap('#bUndo');await W(150);ok(await has(0,4)&&!(await has(0,8)),'↶ deshace el último paso');
await p.tap('#bUndo');await W(150);ok(await has(0,0)&&!(await has(0,4)),'↶ otra vez: deshace el anterior (2 pasos)');
await p.tap('#bUndo');await W(150);ok(await has(0,0)&&/NADA PARA DESHACER/.test(await p.evaluate(()=>document.querySelector('#toast').textContent)),'no va más allá de 2 pasos');
ok(await p.evaluate(()=>document.querySelector('#bUndo').classList.contains('off')&&!document.querySelector('#bRedo').classList.contains('off')&&GB.HIST.r.length===2),'↶ apagado · ↷ prendido con 2 para rehacer');
await p.tap('#bRedo');await W(150);ok(await has(0,4)&&!(await has(0,8)),'↷ rehace');
await p.tap('#bRedo');await W(150);ok(await has(0,8),'↷ otra vez: vuelve al último estado');
await p.tap('#bRedo');await W(150);ok(/NADA PARA REHACER/.test(await p.evaluate(()=>document.querySelector('#toast').textContent)),'no hay más para rehacer');
/* un cambio nuevo después de deshacer borra lo que había para rehacer */
await p.tap('#bUndo');await W(150);await step(1,2,1);await W(1100);
ok(await p.evaluate(()=>GB.HIST.r.length===0&&document.querySelector('#bRedo').classList.contains('off')),'un cambio nuevo después de ↶ anula el ↷');
/* cambios seguidos se juntan en un paso */
await p.evaluate(()=>GB.histReset());await step(2,0,1);await W(150);await step(2,1,1);await W(150);await step(2,2,1);await W(1100);
ok(await p.evaluate(()=>GB.HIST.u.length===1),'tres toques seguidos = un solo paso');
await p.tap('#bUndo');await W(150);ok(!(await has(2,0))&&!(await has(2,2)),'↶ los deshace juntos');
/* ↶ apenas hecho un cambio (sin esperar) también funciona */
await step(3,5,1);await p.tap('#bUndo');await W(150);ok(!(await has(3,5)),'↶ enseguida de un cambio lo deshace igual');
/* una pasada de REC con el tema andando = un paso */
await p.evaluate(()=>{GB.pat[0].fill(0);GB.histReset();});await p.tap('#bPlay');await W(200);await p.tap('#bRec');await W(100);
for(let k=0;k<5;k++){await p.evaluate(k=>{GB.pat[0][k*3]=1;GB.queueSave();},k);await W(500);}
await p.tap('#bRec');await W(1300);await p.tap('#bPlay');
r=await p.evaluate(()=>GB.HIST.u.length);ok(r===1,'una pasada de REC (5 notas en 2,5 s) = un solo paso ('+r+')');
await p.tap('#bUndo');await W(150);ok(await p.evaluate(()=>[0,3,6,9,12].every(s=>!GB.pat[0][s])),'↶ deshace toda la grabación');
/* 16 → 32 pasos */
await p.evaluate(()=>{GB.histReset();GB.setSteps(32);GB.pageUi();GB.queueSave();});await p.tap('#bUndo');await W(150);ok(await p.evaluate(()=>GB.STEPS===16),'↶ deshace el cambio a 32 pasos');
/* cambiar de parte reinicia el historial */
await step(0,1,1);await W(1100);await p.evaluate(()=>GB.partSwitch(1));await W(200);
ok(await p.evaluate(()=>GB.HIST.u.length===0&&GB.HIST.r.length===0&&document.querySelector('#bUndo').classList.contains('off')),'cambiar de parte arranca el historial de cero');
await p.evaluate(()=>GB.partSwitch(0));
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
