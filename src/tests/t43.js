// v13.16: sampler con SYNC al tempo (REPITCH / ESTIRAR) y SPEED; las notas del secuenciador se iluminan en su módulo
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;try{localStorage.setItem('musica_gb_smppar','1');}catch(e){}});   // v13.24: los parámetros del pad se ven con AJUSTES
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.16',SH=process.env.SH;
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');
await p.evaluate(()=>{const o=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){if(this.buffer&&this.buffer.duration>.05)window.__st={a,rate:this.playbackRate.value,dur:this.buffer.duration};return o.apply(this,a);};});
/* auto-detección de tiempos */
ok(await p.evaluate(()=>{GB.setBpm(120);return GB.smpAutoQ(5)===8&&GB.smpAutoQ(2)===4&&GB.smpAutoQ(.26)===.5;}),'detecta los tiempos de la región (5 s a 120 → 8 tiempos)');
/* sample de prueba: 2 s de tono 440 Hz en el chop 1 entero */
await p.evaluate(()=>{const sr=44100,n=sr*2,d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=Math.sin(2*Math.PI*440*i/sr)*.5;GB.smpMode('chop');GB.smpSet(d,sr,'TONO',-1);const C=GB.SMPL.chops[0];Object.assign(C,{s:0,e:1,pitch:0,rev:false,mode:'one',sync:'off',q:0,qa:true,spd:1});GB.SMPL.sel=0;});
const len=await p.evaluate(()=>GB.smpLen(0));ok(Math.abs(len-2)<.01,'región de 2 s');
/* REPITCH */
await p.evaluate(()=>{GB.setBpm(100);const C=GB.SMPL.chops[0];C.sync='pitch';C.q=GB.smpAutoQ(2);C.qa=true;GB.chopPlay(0,GB.ctx.currentTime+.01,1);});
let r=await p.evaluate(()=>({st:window.__st,q:GB.SMPL.chops[0].q}));
ok(r.q===4&&Math.abs(r.st.rate*(4*60/100)-2)<.001,'REPITCH: 2 s → 4 tiempos a 100 BPM = 2,4 s (velocidad ×'+r.st.rate.toFixed(3)+')');
/* ESTIRAR */
await p.evaluate(()=>{GB.SMPL.chops[0].sync='tempo';GB.smpPrep();});await W(700);
await p.evaluate(()=>GB.chopPlay(0,GB.ctx.currentTime+.01,1));r=await p.evaluate(()=>window.__st);
ok(Math.abs(r.dur-2.4)<.005&&r.rate===1,'ESTIRAR: buffer de 2,4 s a velocidad 1 (misma altura) · '+r.dur.toFixed(3)+' s');
const hz=await p.evaluate(()=>{const b=GB.SMPL.chops[0]._st.buf.getChannelData(0);let z=0;for(let i=4410;i<b.length-4410;i++)if(b[i-1]<0&&b[i]>=0)z++;return z/((b.length-8820)/44100);});
ok(Math.abs(hz-440)<6,'el tono sigue en 440 Hz después de estirar ('+hz.toFixed(1)+' Hz)');
const rms=await p.evaluate(()=>{const R=b=>{let s=0;for(let i=0;i<b.length;i++)s+=b[i]*b[i];return Math.sqrt(s/b.length);};return [R(GB.SMPL.chops[0]._st.buf.getChannelData(0)),R(GB.SMPL.buf.getChannelData(0))];});
ok(Math.abs(rms[0]/rms[1]-1)<.05,'mismo volumen que el original, sin huecos (RMS '+rms[0].toFixed(3)+' vs '+rms[1].toFixed(3)+')');
/* pitch con ESTIRAR: la duración se mantiene */
await p.evaluate(()=>{GB.SMPL.chops[0].pitch=12;GB.smpPrep();});await W(700);
await p.evaluate(()=>GB.chopPlay(0,GB.ctx.currentTime+.01,1));r=await p.evaluate(()=>window.__st);
ok(Math.abs(r.dur/r.rate-2.4)<.01&&Math.abs(r.rate-2)<1e-6,'PITCH +12 con ESTIRAR: una octava arriba y sigue durando 2,4 s');
await p.evaluate(()=>{GB.SMPL.chops[0].pitch=0;});
/* SPEED */
await p.evaluate(()=>{GB.SMPL.chops[0].spd=2;GB.smpPrep();});await W(700);
await p.evaluate(()=>GB.chopPlay(0,GB.ctx.currentTime+.01,1));r=await p.evaluate(()=>window.__st);
ok(Math.abs(r.dur-1.2)<.005,'SPEED ×2 con SYNC: dura la mitad (1,2 s)');
await p.evaluate(()=>{const C=GB.SMPL.chops[0];C.spd=.5;C.sync='off';GB.chopPlay(0,GB.ctx.currentTime+.01,1);});r=await p.evaluate(()=>window.__st);
ok(Math.abs(r.rate-.5)<1e-6,'SPEED ½ sin SYNC: mitad de velocidad');
await p.evaluate(()=>{const C=GB.SMPL.chops[0];C.spd=1;C.sync='tempo';});
/* cambiar el tempo recalcula */
await p.evaluate(()=>GB.setBpm(120));await W(1100);
await p.evaluate(()=>GB.chopPlay(0,GB.ctx.currentTime+.01,1));r=await p.evaluate(()=>window.__st);
ok(Math.abs(r.dur-2)<.005,'a 120 BPM los 4 tiempos duran 2 s ('+r.dur.toFixed(3)+')');
/* interfaz */
await tab('smp');await W(200);await p.evaluate(()=>{GB.SMPL.sel=0;});await p.evaluate(()=>document.querySelector('#sPads .pad').dispatchEvent(new Event('x')));
await p.evaluate(()=>{[...document.querySelectorAll('nav button')].find(x=>x.dataset.t==='smp').click();});await W(200);
ok(await p.evaluate(()=>{const t=document.querySelector('#sPar').textContent;return t.includes('SYNC AL TEMPO')&&t.includes('ESTIRAR')&&t.includes('SPEED')&&t.includes('4 TIEMPOS · 1 COMPÁS');}),'SMP: SYNC, SPEED y "4 TIEMPOS · 1 COMPÁS"');
await p.evaluate(()=>{[...document.querySelectorAll('#sPar .qrow .cap')].find(b=>b.textContent==='+').click();});await W(100);
ok(await p.evaluate(()=>GB.SMPL.chops[0].q===6&&!GB.SMPL.chops[0].qa),'+ pasa a 6 tiempos');
await p.evaluate(()=>{[...document.querySelectorAll('#sPar .qrow .cap')].find(b=>b.textContent==='−').click();[...document.querySelectorAll('#sPar .qrow .cap')].find(b=>b.textContent==='−').click();});await W(100);
ok(await p.evaluate(()=>GB.SMPL.chops[0].q===3),'− baja a 3 tiempos');
await p.evaluate(()=>{[...document.querySelectorAll('#sPar .qrow .cap')].find(b=>b.textContent.includes('BPM'))||document.querySelector('#sPar .qbpm');document.querySelector('#sPar .qbpm').click();});
ok(await p.evaluate(()=>GB.S.bpm===90),'BPM ← SAMPLE: 3 tiempos en 2 s = 90 BPM');
ok(await p.evaluate(()=>document.querySelector('#sPads .pad small').textContent.startsWith('3T · ONE')),'el pad muestra 3T · ONE');
if(SH)await p.screenshot({path:SH+'/u-smp.png'});
const rt=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const C=GB.SMPL.chops[0];C.sync='off';C.q=0;C.spd=1;GB.applySnapshot(j);const D=GB.SMPL.chops[0];return D.sync==='tempo'&&D.q===3&&D.spd===1&&!('_st' in j.smp.chops[0]);});
ok(rt,'la sesión guarda SYNC/tiempos/SPEED (y no el audio estirado)');
/* luces */
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.pat[0].fill(1);GB.pat[8].fill(1);GB.seqN[0].fill(3);GB.pat[11].fill(1);GB.smpSeq.fill(1);GB.setBpm(120);});
await tab('keys');await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=drum]').click());await p.tap('#bPlay');await W(500);
ok(await p.evaluate(()=>document.querySelectorAll('#pads .pad')[0].classList.contains('seqlit')),'TECLAS DRUMS: se ilumina el KICK');
await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=syn0]').click());await W(400);
ok(await p.evaluate(()=>{const l=[...document.querySelectorAll('#pads .seqlit')];return l.length>=1&&l.every(x=>x.dataset.d==='3');}),'TECLAS SYN 1: se ilumina la tecla de la nota (grado 3)');
if(SH)await p.screenshot({path:SH+'/v-lit.png'});
await tab('smp');await W(400);ok(await p.evaluate(()=>document.querySelectorAll('#sPads .pad')[0].classList.contains('seqlit')),'SMP: se ilumina el pad 1');
await p.tap('#bPlay');await W(500);
ok(await p.evaluate(()=>document.querySelectorAll('.seqlit').length===0),'al parar se apagan');
await tab('keys');await p.evaluate(()=>{document.querySelector('#kmodeSeg [data-m=syn0]').click();GB.seqN[0][2]=5;GB.pat[8][2]=1;});
await p.evaluate(()=>{GB.S.sel={r:8,s:2};GB.renderPalette();});await tab('keys');
await p.evaluate(()=>{GB.trig;});await p.evaluate(()=>{const r=8,st=2;GB.seqLit(r,st,GB.ctx.currentTime,.3);});await W(80);
ok(await p.evaluate(()=>[...document.querySelectorAll('#pads .seqlit')].some(x=>x.dataset.d==='5')),'al programar/previsualizar una nota se ilumina su tecla');
console.log(e.length?'errors '+e.join(' | '):'errors none');await b.close();})();
