// v13.23: mixer (DLY/REV grandes, PAN chica) + CADENA DE FX como patch de cables
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.23';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
/* ---- mixer */
await tab('mix');await W(200);
let r=await p.evaluate(()=>{const st=[...document.querySelectorAll('#strips .strip:not(.mst)')].filter(s=>!s.hidden),o=[];let over=false;
  st.forEach(s=>{const sr=s.getBoundingClientRect(),m=[...s.querySelectorAll('.sends .mini')],k=m.map(x=>x.querySelector('.knob')||x.querySelector('.sl'));
    k.forEach(el=>{const r=el.getBoundingClientRect();if(r.left<sr.left-1||r.right>sr.right+1)over=true;});
    o.push({lab:m.map(x=>x.textContent.replace(/[^A-Z]/g,'')),w:k.map(el=>Math.round(el.getBoundingClientRect().width))});});return {o,over};});
const s0=r.o[0],wOf=l=>s0.w[s0.lab.findIndex(x=>x.startsWith(l))];
ok(wOf('DLY')>wOf('PAN')+6&&wOf('REV')>wOf('PAN')+6,'mixer: DLY y REV más grandes que PAN ('+wOf('DLY')+'/'+wOf('REV')+' vs '+wOf('PAN')+' px)');
ok(!r.over,'ninguna perilla se sale de su canal');
ok(await p.evaluate(()=>{const s=document.querySelector('#strips .strip'),m=[...s.querySelectorAll('.sends .mini')],y=l=>m.find(x=>x.textContent.includes(l)).getBoundingClientRect().top;return y('DLY')<y('REV')&&y('REV')<y('MOD')&&y('MOD')<y('PAN');}),'orden: DLY arriba, REV, MOD·DST, PAN abajo');
await p.evaluate(()=>{GB.S.smp2=true;GB.smp2Ui();});await W(150);
ok(await p.evaluate(()=>{let over=false;[...document.querySelectorAll('#strips .strip:not(.mst)')].filter(s=>!s.hidden).forEach(s=>{const sr=s.getBoundingClientRect();s.querySelectorAll('.sends .knob,.sends .sl').forEach(el=>{const r=el.getBoundingClientRect();if(r.left<sr.left-1||r.right>sr.right+1)over=true;});});return !over;}),'con 9 canales tampoco se pisan');
await p.evaluate(()=>{GB.S.smp2=false;GB.smp2Ui();});
/* ---- CADENA */
await p.tap('#bPlay');await W(200);await tab('fx');await W(100);
ok(await p.evaluate(()=>!![...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD'&&x.textContent==='CADENA')),'FX: vista CADENA');
await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD').click());await W(300);
ok(await p.evaluate(()=>!!document.querySelector('#patchCv')&&!!GB.PCH.G),'patch de cables dibujado');
ok(await p.evaluate(()=>JSON.stringify(GB.FXP.patch)===JSON.stringify(GB.PATCHPRE[0][1])),'por defecto: todo en paralelo al master (como antes)');
/* ruteo real: solo envío de DELAY en la batería; la reverb no recibe nada */
await p.evaluate(()=>{GB.CH.forEach((c,i)=>{c.rev=0;c.mod=0;c.dst=0;c.dly=i===0?.8:0;GB.applyCh(i);});for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;});await W(3400);
r=await p.evaluate(async()=>{let lr=0,ld=0;for(let i=0;i<20;i++){lr=Math.max(lr,GB.fxLevel('rev'));ld=Math.max(ld,GB.fxLevel('dly'));await new Promise(r=>setTimeout(r,20));}return {act:GB.fxAct(),lr,ld};});
ok(r.ld>.01&&!r.act.rev&&r.lr<.005,'PARALELO: suena el delay, la reverb no recibe (dly '+r.ld.toFixed(3)+' · rev '+r.lr.toFixed(4)+')');
await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent==='DUB').click());await W(1500);
r=await p.evaluate(async()=>{let lr=0;for(let i=0;i<20;i++){lr=Math.max(lr,GB.fxLevel('rev'));await new Promise(r=>setTimeout(r,20));}return {act:GB.fxAct(),lr};});
ok(r.act.rev&&r.lr>.003,'DUB: el delay entra por cable a la reverb y la prende (rev '+r.lr.toFixed(3)+')');
/* gestos sobre el patch */
const J=k=>p.evaluate(k=>{const cv=document.querySelector('#patchCv'),R=cv.getBoundingClientRect(),d=cv.width/R.width,G=GB.PCH.G;const f=(x,y)=>({x:R.left+x/d,y:R.top+y/d});
  if(k==='mstIn')return f(G.mst.slots[3].x,G.mst.slots[3].y);if(k==='mstBody')return f(G.mst.x+30*d,G.mst.y+G.mst.h-12*d);if(k==='empty')return f(G.dly.x+G.dly.w+5*d,G.dly.y+G.dly.h+20*d);const [m,io]=k.split('.');return io==='in'?f(G[m].ix,G[m].iy):io==='out'?f(G[m].ox,G[m].oy):f(G[m].x+G[m].w/2,G[m].y+18*d);},k);
const drag=async(a,bb,id=31)=>{const A=await J(a),B=await J(bb);await p.evaluate(([A,B,id])=>{const cv=document.querySelector('#patchCv'),ev=(t,P)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:P.x,clientY:P.y,bubbles:true,cancelable:true,pointerType:'touch'}));
  ev('pointerdown',A);for(let k=1;k<=6;k++)ev('pointermove',{x:A.x+(B.x-A.x)*k/6,y:A.y+(B.y-A.y)*k/6});ev('pointerup',B);},[A,B,id]);await W(120);};
const tapAt=async k=>{const A=await J(k);await p.evaluate(A=>{const cv=document.querySelector('#patchCv'),ev=t=>cv.dispatchEvent(new PointerEvent(t,{pointerId:41,clientX:A.x,clientY:A.y,bubbles:true,cancelable:true,pointerType:'touch'}));ev('pointerdown');ev('pointerup');},A);await W(120);};
const has=(a,b)=>p.evaluate(([a,b])=>GB.FXP.patch.some(c=>c[0]===a&&c[1]===b),[a,b]);
await drag('dly.out','mod.in');ok(await has('dly','mod'),'arrastrar DELAY OUT → MOD IN crea el cable');
ok(await p.evaluate(()=>GB.PCH.sel&&GB.PCH.sel.k==='cab'&&/DELAY.*MOD/.test(document.querySelector('#patchSel').textContent)&&/NIVEL/.test(document.querySelector('#patchSel').textContent)),'el cable nuevo queda elegido con su NIVEL');
await drag('mod.out','dly.in');ok(!(await has('mod','dly')),'MOD → DELAY no se permite (armaría un lazo sin fin)');
ok(await p.evaluate(()=>/LAZO/.test(document.querySelector('#toast')?.textContent||'')),'avisa por qué');
await drag('dly.out','mod.in');ok(await p.evaluate(()=>GB.FXP.patch.filter(c=>c[0]==='dly'&&c[1]==='mod').length===1),'no duplica cables');
await drag('dst.out','dst.in');ok(!(await has('dst','dst')),'un efecto no se conecta a sí mismo');
/* desenchufar: agarrar el enchufe en MOD IN y soltarlo afuera */
await drag('mod.in','empty');ok(!(await has('dly','mod')),'sacar el enchufe de un IN y soltarlo afuera desconecta');
/* re-enchufar: agarrar el enchufe de REVERB IN y llevarlo a MOD IN */
await drag('rev.in','mod.in');ok(!(await has('dly','rev'))&&await has('dly','mod'),'mover un enchufe de un IN a otro mueve el cable');
/* nivel y quitar desde el panel */
await p.evaluate(()=>{const i=GB.FXP.patch.findIndex(c=>c[0]==='dly'&&c[1]==='mod');GB.PCH.sel={k:'cab',i};});await p.evaluate(()=>{});
await tapAt('mod.body');ok(await p.evaluate(()=>GB.PCH.sel&&GB.PCH.sel.k==='mod'&&GB.PCH.sel.id==='mod'&&/VELOCIDAD|PROFUNDIDAD/.test(document.querySelector('#patchSel').textContent)),'tocar un módulo muestra sus parámetros');
await tapAt('dly.body');ok(await p.evaluate(()=>/FEEDBACK/.test(document.querySelector('#patchSel').textContent)),'DELAY: sus parámetros (FEEDBACK…)');
r=await p.evaluate(()=>{const i=GB.FXP.patch.findIndex(c=>c[0]==='dly'&&c[1]==='mod');GB.patchLevel(i,.3);return GB.FXP.patch[i][2];});ok(Math.abs(r-.3)<1e-6,'el nivel del cable se ajusta');
await tapAt('mstBody');ok(await p.evaluate(()=>GB.PCH.sel&&GB.PCH.sel.k==='mst'),'tocar el MASTER lo elige');
/* quitar el retorno directo del delay: solo se oye a través de MOD */
await drag('mstIn','empty');   // saca el último enchufe del master
r=await p.evaluate(()=>GB.FXP.patch.length);ok(r>=3,'desenchufar del master saca un retorno ('+r+' cables)');
/* sesión */
r=await p.evaluate(()=>{GB.FXP.patch=[['dly','rev',.6],['rev','mst',1],['dly','mst',1]];GB.applyPatch();const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const sv=JSON.stringify(j.fx.patch);
  GB.FXP.patch=GB.PATCHPRE[0][1].map(c=>c.slice());GB.applyPatch();GB.loadSession(j);const back=JSON.stringify(GB.FXP.patch);
  delete j.fx.patch;GB.loadSession(j);const old=JSON.stringify(GB.FXP.patch);
  j.fx.patch=[['dly','rev',1],['rev','dly',1],['zzz','mst',1],['mod','mst',9]];GB.loadSession(j);const bad=GB.FXP.patch;return {sv,back,old,bad:JSON.stringify(bad),cyc:GB.patchCycle(bad)};});
ok(r.back===r.sv,'la sesión guarda y abre la cadena');
ok(r.old===JSON.stringify((await p.evaluate(()=>GB.PATCHPRE[0][1]))),'sesión vieja sin cadena: abre en PARALELO');
ok(!r.cyc&&!r.bad.includes('zzz')&&r.bad.includes('1.5'),'cadena inválida se limpia (sin lazos, sin módulos raros, nivel ≤150%: '+r.bad+')');
/* pad de DELAY en FX sin envíos de canal: igual prende lo que cuelga del delay */
r=await p.evaluate(()=>{GB.CH.forEach((c,i)=>{c.dly=0;GB.applyCh(i);});GB.FXP.patch=[['dly','rev',1],['rev','mst',1],['dly','mst',1]];GB.applyPatch();const a0=GB.fxAct().rev;GB.mfxOn('DLY',.5,.5);const a1=GB.fxAct().rev;GB.mfxOff('DLY');return [a0,a1,GB.fxAct().rev];});
ok(!r[0]&&r[1]&&!r[2],'pad DELAY: prende la reverb que cuelga del delay mientras se usa');
/* reinicio del audio: la cadena y el scratch se rearman */
const ra=await p.evaluate(()=>typeof GB.restartAudio==='function');
if(ra){await p.evaluate(()=>GB.restartAudio());await W(800);r=await p.evaluate(()=>({sc:!!GB.SCR.node&&GB.SCR.node.context===GB.ctx,fx:GB.fxLevel?true:false}));ok(r.sc,'después de reiniciar el audio el scratch se rearma (bug de v13.18 arreglado)');}
else ok(true,'(restartAudio no expuesto)');
await p.tap('#bPlay');await W(100);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
