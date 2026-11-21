// v13.14: sesiones en una carpeta de Drive elegida, GUARDAR reemplaza, ÚLTIMAS 5, autoguardado _AS_ (quedan 10), tomas LIVE a TOMAS
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const http=require('http'),fs=require('fs');const V=process.env.V||'13.14',SH=process.env.SH;
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(fs.readFileSync(require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html')));}).listen(8767);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});
await c.addInitScript(()=>{   // Drive falso: entiende las consultas que usa la app
  const D={n:0,f:{}};window.__D=D;window.__calls=[];const FOLD='application/vnd.google-apps.folder';let clock=Date.parse('2026-11-20T20:00:00Z');
  const mk=(o)=>{const id='id'+(++D.n);D.f[id]=Object.assign({id,trashed:false,modifiedTime:new Date(clock+=60000).toISOString()},o);return D.f[id];};
  mk({title:'Mis cosas',mimeType:FOLD,parent:'root'});mk({title:'MUSICA GROOVEBOX',mimeType:FOLD,parent:'root'});mk({title:'otra.json',mimeType:'application/json',parent:'root',text:'{}'});
  const match=(f,q)=>q.split(' and ').every(cl=>{cl=cl.trim();let m;
    if(cl==='trashed = false')return !f.trashed;
    if(m=cl.match(/^(\w+) (=|contains) '((?:[^'\\]|\\.)*)'$/)){const v=m[3].replace(/\\'/g,"'").replace(/\\\\/g,'\\'),k=m[1]==='parentId'?'parent':m[1],x=f[k]||'';return m[2]==='='?x===v:x.includes(v);}
    throw new Error('consulta no soportada: '+cl);});
  window.claude={use:async n=>{if(n!=='mcp')return null;return {callTool:async(s,t,i)=>{window.__calls.push([t,i.title||i.query||i.fileId]);await new Promise(r=>setTimeout(r,5));
    if(t==='search_files'){let a=Object.values(D.f).filter(f=>match(f,i.query));if(i.orderBy&&/modifiedTime/.test(i.orderBy))a.sort((x,y)=>y.modifiedTime.localeCompare(x.modifiedTime));return {payload:{files:a.slice(0,i.pageSize||20).map(f=>({id:f.id,title:f.title,mimeType:f.mimeType,modifiedTime:f.modifiedTime}))}};}
    if(t==='create_file'){if(i.mimeType)throw {code:'tool_error',message:'mimeType deprecado'};const f=mk({title:i.title,mimeType:i.contentMimeType,parent:i.parentId||'root',text:i.textContent,b64:i.base64Content});return {payload:{id:f.id,title:f.title}};}
    if(t==='trash_file'){D.f[i.fileId].trashed=true;return {payload:{}};}
    if(t==='download_file_content'){const f=D.f[i.fileId],b=f.b64||btoa(unescape(encodeURIComponent(f.text)));return {payload:null,content:[{type:'resource',resource:{uri:'googledrive://file/'+f.id,mimeType:f.mimeType,blob:b}}]};}
    throw {code:'tool_error',message:t};}};}};
});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);
const files=q=>p.evaluate(q=>Object.values(window.__D.f).filter(f=>!f.trashed&&(!q||f.parent===q)).map(f=>f.title),q);
await p.goto('http://localhost:8767/');await W(1700);
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');
/* carpeta */
await p.tap('#bSes');await W(500);
ok(await p.evaluate(()=>document.querySelector('#sheet').classList.contains('drv')&&!document.querySelector('#shFoldP').hidden),'en claude.ai: modo Drive y pide la carpeta');
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#shLocL')).display==='none'),'no muestra la biblioteca del teléfono');
ok(await p.$$eval('#shFoldL .lm',a=>a.length===2),'lista las carpetas de Drive');
await p.fill('#shFoldQ','Mis');await W(700);ok(await p.$$eval('#shFoldL .lm',a=>a.length===1&&a[0].textContent.includes('Mis cosas')),'busca carpeta por nombre');
await p.tap('#shFoldL .lm');await W(300);
ok(await p.evaluate(()=>GB.DV.f&&GB.DV.f.name==='Mis cosas'&&document.querySelector('#shFoldN').textContent==='Mis cosas'),'carpeta elegida: Mis cosas');
const fid=await p.evaluate(()=>GB.DV.f.id);
/* guardar: un archivo por sesión */
await p.fill('#shName','TEMA UNO');await p.tap('#shLoc');await W(400);
const f1=await files(fid);ok(f1.join()==='TEMA UNO.json','GUARDAR crea TEMA UNO.json en la carpeta ('+f1.join(' | ')+')');
await p.evaluate(()=>GB.setBpm(133));await p.tap('#shLoc');await W(400);
ok((await files(fid)).join()==='TEMA UNO.json'&&await p.evaluate(()=>Object.values(window.__D.f).filter(f=>f.title==='TEMA UNO.json').length===2),'GUARDAR otra vez reemplaza (la vieja va a la papelera)');
ok(await p.evaluate(()=>!GB.CHG.on&&document.querySelector('#shAs').textContent.includes('TODO GUARDADO')),'queda TODO GUARDADO');
for(const n of ['DOS','TRES','CUATRO','CINCO','SEIS']){await p.fill('#shName',n);await p.tap('#shLoc');await W(250);}
await p.evaluate(()=>GB.drvRecent());await W(300);
const rec=await p.$$eval('#shRecL .lm span',a=>a.map(x=>x.textContent));
ok(rec.length===5&&rec[0]==='SEIS'&&!rec.includes('TEMA UNO'),'ÚLTIMAS 5: las más nuevas primero ('+rec.join(', ')+')');
await p.tap('#shAll');await W(300);ok(await p.$$eval('#shRecL .lm',a=>a.length===6),'VER TODAS: 6');await p.tap('#shAll');await W(300);
if(SH)await p.screenshot({path:SH+'/q-ses.png'});
/* abrir desde la lista (dos toques) */
await p.evaluate(()=>GB.setBpm(77));
await p.evaluate(()=>{GB.DV.rec=GB.DV.rec;});await p.evaluate(()=>GB.drvRecent(true));await W(300);
const ix=await p.$$eval('#shRecL .lm span',a=>a.findIndex(x=>x.textContent==='TEMA UNO'));
const row=(await p.$$('#shRecL .lm'))[ix];await row.tap();await W(100);await row.tap();await W(600);
ok(await p.evaluate(()=>GB.S.bpm===133&&GB.S.name==='TEMA UNO'&&!GB.CHG.on),'abre TEMA UNO (133 BPM) y queda sin cambios pendientes');
/* autoguardado */
await p.evaluate(()=>GB.setBpm(140));
ok(await p.evaluate(()=>GB.CHG.on&&document.querySelector('#bSes').classList.contains('chg')),'un cambio marca ☰ con punto naranja');
ok(await p.evaluate(()=>GB.drvAuto(false).then(r=>r===false)),'no autoguarda antes de 5 min');
await p.evaluate(()=>{GB.CHG.t0-=6*60000;GB.DV.last=0;});
ok(await p.evaluate(()=>GB.drvAuto(false)),'a los 5 min autoguarda');
const asF=await p.evaluate(()=>{const D=window.__D,sub=Object.values(D.f).find(f=>f.title==='AUTOSAVE'&&f.parent===GB.DV.f.id&&!f.trashed);return {sub:!!sub,f:Object.values(D.f).filter(f=>sub&&f.parent===sub.id&&!f.trashed).map(f=>f.title)};});
ok(asF.sub&&asF.f.length===1&&/^TEMA UNO_AS_\d{12}\.json$/.test(asF.f[0]),'TEMA UNO_AS_YYYYMMDDHHMM.json en AUTOSAVE ('+asF.f[0]+')');
ok((await files(fid)).filter(t=>/TEMA UNO/.test(t)).join()==='TEMA UNO.json','el original no se toca');
ok(await p.evaluate(()=>GB.drvAuto(true).then(r=>r===false)),'sin cambios nuevos no autoguarda');
ok(await p.evaluate(()=>{GB.queueSave();return GB.drvAuto(true).then(r=>r===false);}),'si el contenido es igual no crea otra versión');
// 12 autoguardados → quedan 10
await p.evaluate(async()=>{for(let i=0;i<12;i++){GB.setBpm(100+i);GB.DV.last=0;await GB.drvAuto(true);}});
const asN=await p.evaluate(()=>{const D=window.__D,sub=Object.values(D.f).find(f=>f.title==='AUTOSAVE'&&!f.trashed);return Object.values(D.f).filter(f=>f.parent===sub.id&&!f.trashed&&f.title.startsWith('TEMA UNO_AS_')).length;});
ok(asN===10,'quedan las 10 versiones más nuevas ('+asN+')');
ok(await p.evaluate(()=>{const D=window.__D;return Object.values(D.f).filter(f=>f.title.startsWith('TEMA UNO_AS_')&&f.trashed).length>=3;}),'las viejas van a la papelera');
// el autoguardado no aparece en ÚLTIMAS 5
await p.evaluate(()=>GB.drvRecent());await W(300);ok(await p.$$eval('#shRecL .lm span',a=>!a.some(x=>/_AS_/.test(x.textContent))),'los _AS_ no aparecen en la lista');
// abrir un autoguardado: vuelve al nombre del original
const asId=await p.evaluate(()=>{const D=window.__D;return Object.values(D.f).find(f=>f.title.startsWith('TEMA UNO_AS_')&&!f.trashed).id;});
/* sesión nueva y cambio de carpeta */
await p.evaluate(()=>{GB.drvSetF({id:'root',name:'Mi unidad'});});
ok(await p.evaluate(()=>GB.DV.rec.length===0&&document.querySelector('#shFoldN').textContent==='Mi unidad'),'cambiar de carpeta limpia la lista');
await p.evaluate(id=>GB.drvSetF({id,name:'Mis cosas'}),fid);
/* link de Drive */
await p.tap('#bSes');await W(400);await p.tap('#shFold');await W(200);await p.fill('#shFoldQ','https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv');await W(700);
ok(await p.$$eval('#shFoldL .lm',a=>a.length===1&&a[0].textContent.includes('LINK')),'pegar el link de una carpeta');
await p.tap('#shFoldX');
/* crear carpeta */
await p.tap('#shFold');await W(300);await p.fill('#shFoldQ','GROOVES 2026');await W(700);await p.tap('#shFoldNew');await W(400);
ok(await p.evaluate(()=>GB.DV.f.name==='GROOVES 2026'&&Object.values(window.__D.f).some(f=>f.title==='GROOVES 2026'&&f.mimeType==='application/vnd.google-apps.folder')),'＋ CREAR CARPETA');
await p.evaluate(id=>GB.drvSetF({id,name:'Mis cosas'}),fid);
/* tomas LIVE a TOMAS */
const up=await p.evaluate(async()=>{const blob=new Blob([new Uint8Array(3000).fill(7)],{type:'audio/webm'});await GB.IDB.put('live',{id:'Lx',name:'GB-LIVE-202611202200',dur:3,mime:'audio/webm',blob,saved:Date.now()});
  const t=await GB.liveUp({id:'Lx',name:'GB-LIVE-202611202200',mime:'audio/webm',blob});const left=await GB.IDB.get('live','Lx');return {t,left:!!left};});
const tom=await p.evaluate(()=>{const D=window.__D,sub=Object.values(D.f).find(f=>f.title==='TOMAS'&&f.parent===GB.DV.f.id);return sub?Object.values(D.f).filter(f=>f.parent===sub.id).map(f=>[f.title,f.mimeType,(f.b64||'').length]):null;});
ok(up.t&&!up.left&&tom&&tom.length===1&&tom[0][0]==='GB-LIVE-202611202200.webm'&&tom[0][2]===4000,'toma LIVE subida a TOMAS y borrada del teléfono');
await p.evaluate(()=>GB.drvLive());await W(400);
ok(await p.$$eval('#shLiveL .lm',a=>a.length===1&&a[0].textContent.includes('EN DRIVE')),'GRABACIONES LIVE lista las de Drive');
await p.tap('#shLiveL .lm');await W(500);
ok(await p.evaluate(()=>document.querySelector('#liveSheet').classList.contains('on')&&GB.LV.blob&&GB.LV.blob.size===3000),'abre la toma bajándola de Drive');
await p.evaluate(()=>document.querySelector('#lvX').click());
if(SH){await p.evaluate(()=>{document.querySelector('#sheet .sbox').scrollTop=0;});await W(300);await p.screenshot({path:SH+'/r-ses2.png'});}
console.log(e.length?'errors '+e.join(' | '):'errors none');srv.close();await b.close();})();
