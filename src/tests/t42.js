// v13.15: app instalada → carpeta del TELÉFONO (File System Access): elegir/crear, GUARDAR, ÚLTIMAS 5, autoguardado _AS_, TOMAS, permiso al volver, versión
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const http=require('http'),fs=require('fs');const V=process.env.V||'13.15',SH=process.env.SH;
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(fs.readFileSync(require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html')));}).listen(8768);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});
await c.addInitScript(()=>{   // selector de carpetas del teléfono → carpetas reales del almacenamiento privado (OPFS), con la misma API
  window.__pick=[];window.showDirectoryPicker=async o=>{window.__pick.push(o&&o.id);const r=await navigator.storage.getDirectory();return r.getDirectoryHandle(o&&o.id==='gbpar'?'TARJETA':'Documentos',{create:true});};});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);
const ls=path=>p.evaluate(async path=>{let d=await navigator.storage.getDirectory();for(const n of path.split('/').filter(Boolean)){try{d=await d.getDirectoryHandle(n);}catch(x){return null;}}const o=[];for await(const [n,h] of d.entries())o.push(h.kind==='directory'?n+'/':n);return o.sort();},path);
const rd=path=>p.evaluate(async path=>{let d=await navigator.storage.getDirectory();const a=path.split('/');const fn=a.pop();for(const n of a)d=await d.getDirectoryHandle(n);return (await (await d.getFileHandle(fn)).getFile()).text();},path);
await p.goto('http://localhost:8768/');await W(1700);
await p.evaluate(async()=>{const r=await navigator.storage.getDirectory();for await(const [n] of r.entries())await r.removeEntry(n,{recursive:true});});
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');
/* versión en el menú */
await p.tap('#bSes');await W(500);
ok(await p.$eval('#shVer',x=>x.textContent)==='v'+V,'la versión aparece en el menú (v'+V+')');
ok(await p.evaluate(()=>GB.fMode()==='local'&&document.querySelector('#sheet').classList.contains('loc')),'app instalada: modo carpeta del TELÉFONO');
ok(await p.evaluate(()=>document.querySelector('#shFold small').textContent==='CARPETA DEL TELÉFONO'&&!document.querySelector('#shFoldP').hidden),'pide elegir la carpeta');
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#shLocL')).display==='none'),'no muestra la biblioteca vieja');
await p.tap('#shFoldPick');await W(400);
ok(await p.evaluate(()=>GB.DV.f&&GB.DV.f.name==='Documentos'&&document.querySelector('#shFoldN').textContent==='Documentos'),'ELEGIR CARPETA: Documentos');
/* guardar */
await p.fill('#shName','JAM UNO');await p.tap('#shLoc');await W(400);
ok(JSON.stringify(await ls('Documentos'))==='["JAM UNO.json"]','GUARDAR escribe JAM UNO.json en la carpeta');
ok(await p.$eval('#shMsg',x=>x.textContent.includes('GUARDADA EN EL TELÉFONO')),'mensaje: guardada en el teléfono');
await p.evaluate(()=>GB.setBpm(144));await p.tap('#shLoc');await W(400);
ok(JSON.stringify(await ls('Documentos'))==='["JAM UNO.json"]'&&JSON.parse(await rd('Documentos/JAM UNO.json')).bpm===144,'GUARDAR otra vez reescribe el mismo archivo (144 BPM)');
for(const n of ['B','C','D','E','F']){await p.fill('#shName',n);await p.tap('#shLoc');await W(150);}
await p.evaluate(()=>GB.sesRecent(false,true));await W(300);
const rec=await p.$$eval('#shRecL .lm span',a=>a.map(x=>x.textContent));
ok(rec.length===5&&rec[0]==='F'&&!rec.includes('JAM UNO'),'ÚLTIMAS 5 ('+rec.join(', ')+')');
await p.tap('#shAll');await W(300);ok(await p.$$eval('#shRecL .lm',a=>a.length===6),'VER TODAS: 6');await p.tap('#shAll');await W(200);
if(SH)await p.screenshot({path:SH+'/s-tel.png'});
/* abrir */
await p.evaluate(()=>GB.setBpm(70));await p.tap('#shAll');await W(300);
const ix=await p.$$eval('#shRecL .lm span',a=>a.findIndex(x=>x.textContent==='JAM UNO'));const row=(await p.$$('#shRecL .lm'))[ix];await row.tap();await W(100);await row.tap();await W(600);
ok(await p.evaluate(()=>GB.S.bpm===144&&GB.S.name==='JAM UNO'&&!GB.CHG.on),'abre JAM UNO (144) sin cambios pendientes');
/* autoguardado */
await p.evaluate(()=>GB.setBpm(150));
ok(await p.evaluate(()=>GB.drvAuto(false).then(r=>r===false)),'no autoguarda antes de 5 min');
await p.evaluate(()=>{GB.CHG.t0-=6*60000;});ok(await p.evaluate(()=>GB.drvAuto(false)),'a los 5 min autoguarda');
const as1=await ls('Documentos/AUTOSAVE');ok(as1&&as1.length===1&&/^JAM UNO_AS_\d{12}\.json$/.test(as1[0]),'AUTOSAVE/JAM UNO_AS_YYYYMMDDHHMM.json ('+(as1&&as1[0])+')');
ok(JSON.parse(await rd('Documentos/JAM UNO.json')).bpm===144,'el original no se toca');
await p.evaluate(async()=>{for(let i=0;i<12;i++){GB.setBpm(100+i);await new Promise(r=>setTimeout(r,5));const n=new Date(Date.UTC(2026,10,21,i,0));GB.DV.last=0;await GB.BK.local.write('AUTOSAVE','JAM UNO_AS_2026112'+String(100+i).padStart(5,'0')+'.json','{}','application/json');}GB.queueSave();GB.setBpm(99);await GB.drvAuto(true);});
const as2=await ls('Documentos/AUTOSAVE');ok(as2.length===10,'quedan las 10 más nuevas ('+as2.length+')');
await p.evaluate(()=>GB.sesRecent());await W(300);ok(await p.$$eval('#shRecL .lm span',a=>!a.some(x=>/_AS_/.test(x.textContent))),'los _AS_ no aparecen en la lista');
/* tomas LIVE */
const up=await p.evaluate(async()=>{const blob=new Blob([new Uint8Array(2500).fill(9)],{type:'audio/webm'});await GB.IDB.put('live',{id:'Ly',name:'GB-LIVE-202611202300',dur:2,mime:'audio/webm',blob,saved:Date.now()});
  const t=await GB.liveUp({id:'Ly',name:'GB-LIVE-202611202300',mime:'audio/webm',blob});return {t,left:!!(await GB.IDB.get('live','Ly'))};});
ok(up.t&&!up.left&&JSON.stringify(await ls('Documentos/TOMAS'))==='["GB-LIVE-202611202300.webm"]','toma LIVE a TOMAS y fuera de la base del navegador');
await p.tap('#bSes');await W(600);await p.evaluate(()=>GB.drvLive());await W(300);await p.tap('#shLiveL .lm');await W(400);
ok(await p.evaluate(()=>document.querySelector('#liveSheet').classList.contains('on')&&GB.LV.blob.size===2500),'abre la toma desde la carpeta');
await p.evaluate(()=>{const b=document.querySelector('#lvDel');b.click();b.click();});await W(300);
ok(JSON.stringify(await ls('Documentos/TOMAS'))==='[]','BORRAR TOMA la borra de la carpeta');
/* biblioteca vieja → carpeta */
await p.evaluate(async()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));j.bpm=111;await GB.IDB.put('ses',{id:'s_vieja',name:'VIEJA',saved:Date.now(),snap:j,smp:null,pads:null});await GB.migUi();});
ok(await p.evaluate(()=>!document.querySelector('#shMig').hidden&&document.querySelector('#shMig').textContent.includes('1 SESIÓN')),'ofrece pasar la biblioteca vieja');
await p.tap('#shMig');await W(400);ok((await ls('Documentos')).includes('VIEJA.json')&&JSON.parse(await rd('Documentos/VIEJA.json')).bpm===111,'pasó VIEJA.json a la carpeta');
/* crear carpeta dentro de otra */
await p.tap('#shFold');await W(200);await p.fill('#shFoldQ','GROOVES');await p.tap('#shFoldNew');await W(500);
ok(await p.evaluate(()=>GB.DV.f.name==='GROOVES')&&JSON.stringify(await ls('TARJETA'))==='["GROOVES/"]','＋ CREAR CARPETA: TARJETA / GROOVES');
/* al volver a abrir: protección si leer la carpeta guardada hace caer la página (en este Chrome de pruebas leer la carpeta guardada se cae siempre) */
await p.evaluate(()=>localStorage.setItem('musica_gb_dirload','1'));await p.reload();await W(2200);
const lost=await p.evaluate(async()=>{await GB.LBR;const keys=await new Promise(res=>{const r=indexedDB.open('musica_gb');r.onsuccess=()=>{const q=r.result.transaction('kv').objectStore('kv').getAllKeys();q.onsuccess=()=>res(q.result);};});return {f:GB.DV.f,lost:GB.DV.lost,keys,flag:localStorage.getItem('musica_gb_dirload')};});
ok(!lost.f&&lost.lost==='GROOVES'&&!lost.keys.includes('dir')&&lost.flag===null,'si la app se cayó leyendo la carpeta: la olvida y no se traba ('+JSON.stringify(lost.keys)+')');
await p.tap('#bSes');await W(500);ok(await p.$eval('#shMsg',x=>x.textContent.includes('No pude recuperar GROOVES')),'y pide elegirla de nuevo');
await p.tap('#shFoldPick');await W(400);ok(await p.evaluate(()=>GB.DV.f&&GB.DV.f.name==='Documentos'&&!GB.DV.lost),'elegirla de nuevo funciona');
console.log(e.length?'errors '+e.join(' | '):'errors none');srv.close();await b.close();})();
