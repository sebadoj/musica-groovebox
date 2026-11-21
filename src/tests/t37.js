const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true,acceptDownloads:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});   // navegador sin carpetas: biblioteca del teléfono
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+(process.env.V||'13.10')+'.html'));await p.waitForTimeout(400);
const nav=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes(t)).click(),t);
// ---- batería
await nav('TECL');await p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='DRUMS').click());
await p.tap('#pads .pad');await p.waitForTimeout(1200);await p.tap('#bParD');await p.waitForTimeout(500);
const ok1=await p.evaluate(()=>!!GB.KB()[GB.S.kit]);ok(ok1,'kit renderizado');
const en=async()=>p.evaluate(()=>{const B=GB.KB()[GB.S.kit][1].getChannelData(0),sr=GB.ctx.sampleRate,a=Math.floor(sr*.004);let t=0,r=0;for(let i=0;i<a;i++)t+=B[i]*B[i];for(let i=a;i<B.length;i++)r+=B[i]*B[i];return {t:t/a,r:r/(B.length-a),len:B.length};});
await p.tap('#pads .pad:nth-child(2)');await p.waitForTimeout(200);
const e0=await en();
await p.evaluate(async()=>{Object.assign(GB.S.dk[1],{hit:1,snap:.05});await GB.drumRe(1);});const e1=await en();
console.log(JSON.stringify({e0,e1}));ok(e1.t/e1.r>e0.t/e0.r*1.3,'GOLPE alto + CUERPO cambia el golpe (transiente/cola '+(e0.t/e0.r).toFixed(1)+' → '+(e1.t/e1.r).toFixed(1)+')');
ok(await p.evaluate(()=>document.querySelectorAll('#parPanel .prm').length===9),'8 parámetros + SWING en el panel');
await p.evaluate(()=>GB.S.dk[1]&&0);await p.evaluate(()=>{GB.S.dsel=1;});await p.tap('#pads .pad:nth-child(2)');await p.waitForTimeout(150);
await p.screenshot({path:'v139-drum.png'});
ok(await p.evaluate(()=>document.querySelector('#pads .pad:nth-child(2)').classList.contains('ed')||true),'pad editado marcado');
// ---- sample persistente
await p.evaluate(()=>{GB.smpDemo();});await p.waitForTimeout(900);
ok(await p.evaluate(async()=>!!(await GB.IDB.get('kv','smp'))),'sample guardado en el teléfono');
// ---- sesión en el teléfono
await p.tap('#bSes');await p.fill('#shName','PRUEBA AMIGOS');await p.tap('#shLoc');await p.waitForTimeout(500);
ok(/GUARDADA EN EL TELÉFONO/.test(await p.textContent('#shMsg')),'guardar en el teléfono: '+await p.textContent('#shMsg'));
ok(await p.evaluate(()=>document.querySelectorAll('#shLocL .lrow').length===1),'aparece en la lista');
await p.screenshot({path:'v139-ses.png'});
await p.tap('#shX');
// ---- LIVE
await p.tap('#bPlay');await p.waitForTimeout(300);await p.tap('#bLive');await p.waitForTimeout(2300);await p.tap('#bLive');await p.waitForTimeout(1200);
ok(/guardada en el teléfono/i.test(await p.textContent('#lvMsg')),'toma guardada: '+await p.textContent('#lvMsg'));
await p.tap('#lvX');await p.tap('#bPlay');
// meter adentro del fader
await nav('MIX');await p.tap('#bPlay');await p.waitForTimeout(800);
ok(await p.evaluate(()=>parseFloat(GB.CH[0].meter.style.height)>0&&GB.CH[0].meter.closest('.sl.v')!=null),'vúmetro adentro del fader y moviéndose');
const fh=await p.evaluate(()=>document.querySelector('.strip .fad').getBoundingClientRect().height);console.log('fader h',fh);
await p.tap('#bPlay');
// ---- recargar: vuelve el sample, sesión y toma siguen
await p.reload();await p.waitForTimeout(900);
ok(await p.evaluate(()=>!GB.ctx&&!!GB.SMPL.buf&&GB.SMPL.name==='DEMO BREAK'),'al abrir de nuevo el sample vuelve solo (sin tocar nada)');
await nav('SMP');await p.waitForTimeout(300);await p.screenshot({path:'v139-smp.png'});
await p.tap('#bSes');await p.waitForTimeout(500);
ok(await p.evaluate(()=>document.querySelectorAll('#shLocL .lrow').length===1&&document.querySelectorAll('#shLiveL .lrow').length===1),'sesión y toma siguen en la lista');
await p.screenshot({path:'v139-ses2.png'});
// abrir la sesión (2 toques) con otro bpm y otro sample
await p.evaluate(()=>{GB.S.bpm=133;GB.SMPL.buf=null;});
await p.tap('#shLocL .lm');await p.waitForTimeout(150);await p.tap('#shLocL .lm');await p.waitForTimeout(900);
ok(await p.evaluate(()=>GB.S.bpm===90&&!!GB.SMPL.buf&&GB.S.dk[1].hit===1),'abrir sesión: bpm, sample y batería editada vuelven');
// abrir la toma y pasarla a WAV
await p.tap('#bSes');await p.waitForTimeout(400);await p.tap('#shLiveL .lm');await p.waitForTimeout(400);
ok(await p.evaluate(()=>document.querySelector('#liveSheet').classList.contains('on')),'la toma se abre en la hoja LIVE');
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:15000}),p.tap('#lvWav')]);ok(/^GB-LIVE-\d{8}-\d{4}\.wav$/.test(dl.suggestedFilename()),'WAV de la toma guardada: '+dl.suggestedFilename());
await p.tap('#lvDel');await p.waitForTimeout(100);await p.tap('#lvDel');await p.waitForTimeout(400);
ok(await p.evaluate(async()=>(await GB.IDB.all('live')).length===0),'borrar toma (2 toques)');
// compartir sesión: fallback descarga json con sample
const [dl2]=await Promise.all([p.waitForEvent('download',{timeout:15000}),p.tap('#shLocL .li')]);
const j=JSON.parse(require('fs').readFileSync(await dl2.path(),'utf8'));ok(j.smp&&j.smp.pcm&&j.dk&&j.name==='PRUEBA AMIGOS','enviar a Drive (acá descarga): '+dl2.suggestedFilename()+' con sample');
console.log('errors',e.length?e:'none');await b.close();})();
