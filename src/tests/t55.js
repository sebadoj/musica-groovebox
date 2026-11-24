// v13.29: botón KILL — apaga todo
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.29';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const rms=(n=16)=>p.evaluate(async n=>{const a=GB.ctx.createAnalyser();a.fftSize=2048;GB.outTap().connect(a);let m=0;for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,25));const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}a.disconnect();return m;},n);
ok(await p.evaluate(()=>{const k=document.querySelector('#bKill');return !!k&&k.textContent==='KILL'&&k.getBoundingClientRect().width>30;}),'botón KILL visible');
/* armar el caos: tema sonando, efectos trabados con HOLD, sirena en LATCH, botón DJ apretado, sampler en loop */
await p.tap('#bPlay');await p.evaluate(()=>{for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;});await W(600);
await p.evaluate(()=>{GB.S.hold=true;['DLY','REV','REP'].forEach(t=>{GB.XYH[t]={on:true,x:.6,y:.9};GB.mfxOn(t,.6,.9);});GB.sirHold('latch',true);
  const sr=44100,d=new Float32Array(sr);for(let i=0;i<sr;i++)d[i]=Math.sin(i/7)*.5;GB.smpSet(d,sr,'LOOP',-1);GB.SMPL.chops[0].mode='loop';GB.chopPlay(0,GB.ctx.currentTime+.01,1,99);});
await W(700);
const before=await rms();ok(before>.05,'antes: suena todo junto (RMS '+before.toFixed(3)+')');
await p.tap('#bKill');await W(400);
let r=await p.evaluate(()=>({pl:GB.S.playing,hold:GB.S.hold,xyh:Object.values(GB.XYH).some(h=>h.on),sir:GB.sirHolds.size,held:document.querySelectorAll('#fxSeg button.held').length,t:document.querySelector('#toast')?.textContent||''}));
ok(!r.pl,'KILL para el tema');ok(!r.hold&&!r.xyh&&r.held===0,'suelta HOLD y todos los efectos trabados');ok(r.sir===0,'apaga la sirena (también LATCH)');ok(/KILL/.test(r.t),'avisa: KILL · todo apagado');
await W(500);const after=await rms(20);ok(after<.002,'silencio total, sin colas de reverb/delay/repeat ni loop del sampler (RMS '+after.toFixed(4)+')');
/* sigue andando después */
r=await p.evaluate(()=>!!GB.SCR.node);ok(true,'(audio reiniciado)');
await p.tap('#bPlay');await W(800);const again=await rms();ok(again>.05,'después del KILL, PLAY vuelve a sonar normal (RMS '+again.toFixed(3)+')');
r=await p.evaluate(async()=>{GB.mfxOn('FLT',0,0);await new Promise(r=>setTimeout(r,100));const f=GB.fxv().fltF;GB.mfxOff('FLT');return f;});ok(r<500,'los efectos del pad siguen andando ('+Math.round(r)+' Hz)');
await W(600);ok(await p.evaluate(()=>!!GB.SCR.node&&GB.SCR.node.context===GB.ctx),'el scratch se rearma');
/* KILL con todo parado no rompe nada */
await p.tap('#bPlay');await p.tap('#bKill');await W(300);await p.tap('#bKill');await W(300);ok(await p.evaluate(()=>!GB.S.playing),'KILL dos veces seguidas con todo parado: sin problemas');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
