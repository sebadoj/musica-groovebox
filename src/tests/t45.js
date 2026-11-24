// v13.18/19: SCRATCH con el bailarín del medidor (v13.19: antes de los efectos, por canal)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.18';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const pe=(type,x,y,id=7)=>p.evaluate(([type,x,y,id])=>{const s=document.querySelector('#scope'),R=s.getBoundingClientRect();s.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:R.left+x,clientY:R.top+y,bubbles:true,cancelable:true,pointerType:'touch',isPrimary:true}));},[type,x,y,id]);
const st=()=>p.evaluate(()=>GB.scrQ());
await p.tap('#bPlay');await W(500);
ok(await p.evaluate(()=>!!GB.SCR.node&&GB.SCR.node.numberOfInputs===GB.bus.length-1&&GB.SCR.ch.indexOf(4)<0),'worklet de scratch en todos los canales menos SIRENA ('+(await p.evaluate(()=>GB.SCR.err||'ok'))+')');
/* analizador después del scratch: medimos lo que sale */
await p.evaluate(()=>{const A=n=>{const a=GB.ctx.createAnalyser();a.fftSize=2048;n.connect(a);return ()=>{const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length);};};const a=GB.ctx.createAnalyser();a.fftSize=2048;GB.SCR.node.connect(a,0);window.__rms=()=>{const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length);};
  window.__mst=A(GB.outTap());window.__bus0=A(GB.bus[0].vol);window.__bus1=A(GB.bus[1].vol);GB.CH[0].rev=1;GB.CH[0].dly=.6;GB.applyCh(0);
  for(let r=0;r<8;r++)for(let s=0;s<GB.STEPS;s++)GB.pat[r][s]=0;for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;});   // hats en corcheas + bombo: siempre suena algo
await W(1500);
let sound=await p.evaluate(async()=>{let m=0;for(let i=0;i<20;i++){m=Math.max(m,window.__rms());await new Promise(r=>setTimeout(r,25));}return m;});
ok(sound>.01,'el tema suena antes del scratch (RMS '+sound.toFixed(3)+')');
/* tocar fuera del bailarín no hace nada */
await pe('pointerdown',200,20,3);await W(50);ok(await p.evaluate(()=>!GB.SCR.held),'tocar el medidor fuera del bailarín no frena');await pe('pointerup',200,20,3);
/* apretar: frena y pausa */
const s0=await p.evaluate(()=>GB.S.cur);
await pe('pointerdown',20,25);await W(250);
let r=await p.evaluate(()=>({h:GB.SCR.held,pa:GB.SCR.paused,pl:GB.S.playing,cur:GB.S.cur}));
ok(r.h&&r.pa&&r.pl,'apretar el bailarín: frena y el secuenciador queda en pausa');
let q=await st();ok(q.mode===1&&Math.abs(q.v)<.01,'el vinilo quedó quieto (velocidad '+q.v.toFixed(3)+')');
const cur1=await p.evaluate(()=>GB.S.cur);await W(400);ok(await p.evaluate(c=>GB.S.cur===c,cur1),'el paso del secuenciador no avanza mientras está apretado');
let quiet=await p.evaluate(async()=>{let m=0;for(let i=0;i<10;i++){m=Math.max(m,window.__rms());await new Promise(r=>setTimeout(r,25));}return m;});
ok(quiet<sound*.15,'apretado y quieto: el canal queda en silencio (RMS '+quiet.toFixed(4)+')');
const sirB=await p.evaluate(async()=>{const a=GB.ctx.createAnalyser();a.fftSize=2048;GB.bus[4].vol.connect(a);GB.sirHold('btn',true);let m=0;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,25));const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}GB.sirHold('btn',false);return m;});
ok(sirB>.01,'la SIRENA suena mientras el scratch está apretado (RMS '+sirB.toFixed(3)+')');
await W(500);
const tail=await p.evaluate(()=>window.__mst());ok(tail>.002,'las colas de reverb/delay siguen sonando al frenar (master RMS '+tail.toFixed(4)+')');
/* arrastrar para abajo: atrasa */
for(let k=1;k<=10;k++){await pe('pointermove',20,25+10*k);await W(15);}
await W(250);q=await st();const back=(q.endF-q.ph)/q.sr;
ok(Math.abs(back-(.035+.5+.03))<.08,'bajar 100 px atrasa ~0,5 s ('+back.toFixed(3)+' s antes del punto de frenado)');
let mv=await p.evaluate(async()=>{let m=0;return m;});
/* arrastre rápido arriba-abajo = suena (scratch) */
const scr=await p.evaluate(async()=>{let m=0;for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,20));m=Math.max(m,window.__rms());}return m;});
await p.evaluate(()=>{window.__vb=0;window.__vbT=setInterval(()=>{window.__vb=Math.max(window.__vb,window.__bus0());},10);});
await Promise.all([ (async()=>{for(let k=0;k<6;k++){await pe('pointermove',20,95);await W(30);await pe('pointermove',20,125);await W(30);}})() ]);
await p.evaluate(()=>clearInterval(window.__vbT));
const scr2=await p.evaluate(async()=>{let m=0;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,15));m=Math.max(m,window.__rms());}return m;});
ok(scr2>quiet*3&&scr2>.003,'mover la púa hace sonar el audio (RMS '+scr2.toFixed(3)+')');
const viaBus=await p.evaluate(()=>window.__vb);
ok(viaBus>.003,'el scratch entra por el fader del canal → pasa por sus envíos y efectos (RMS '+viaBus.toFixed(3)+')');
/* subir más allá del punto de frenado: no puede ir al futuro */
await pe('pointermove',20,-300);await W(300);q=await st();ok(q.ph<=q.endF+1e-6&&q.endF-q.ph<q.sr*.01,'subir de más: se queda en el punto donde frenó (no hay futuro grabado)');
/* volver a atrasar ~0,55 s desde el tope (la púa sigue al dedo, sin zona muerta) y soltar */
for(let k=1;k<=12;k++){await pe('pointermove',20,-300+10*k);await W(15);}await W(250);
q=await st();ok(Math.abs((q.endF-q.ph)/q.sr-.565)<.04,'después del tope, bajar 120 px atrasa ~0,55 s sin zona muerta ('+((q.endF-q.ph)/q.sr).toFixed(3)+' s)');
const tUp=await p.evaluate(()=>GB.ctx.currentTime);await pe('pointerup',20,-180);
r=await p.evaluate(()=>({l:GB.SCR.landing,h:GB.SCR.held}));ok(r.l&&!r.h,'soltar: arranca a velocidad normal');
await W(150);q=await st();ok(q.mode===2&&q.v>.95,'a los 150 ms ya va a velocidad normal ('+q.v.toFixed(3)+')');
const rep=await p.evaluate(async()=>{let m=0;for(let i=0;i<8;i++){m=Math.max(m,window.__rms());await new Promise(r=>setTimeout(r,25));}return m;});
ok(rep>.01,'reproduce lo que se atrasó (RMS '+rep.toFixed(3)+')');
await W(900);
r=await p.evaluate(()=>({pa:GB.SCR.paused,l:GB.SCR.landing,last:GB.SCR.last,now:GB.ctx.currentTime}));
ok(!r.pa&&!r.l&&r.last,'al llegar al punto de frenado, el secuenciador sigue');
ok(r.last&&Math.abs((r.last.T-tUp)-(.565+.03))<.12,'retoma después de reproducir lo atrasado ('+(r.last.T-tUp).toFixed(3)+' s después de soltar)');
const cont=await p.evaluate(()=>{const L=GB.SCR.last;return L.nt-L.t0>=-1e-6&&L.nt-L.t0<GB.sd()+1e-3;});
ok(cont,'el primer paso que retoma es el que no se llegó a escuchar (a tiempo, sin salto)');
q=await st();ok(q.mode===0,'el worklet volvió a pasar el audio en vivo');
const c1=await p.evaluate(()=>GB.S.cur);await W(400);ok(await p.evaluate(c=>GB.S.cur!==c,c1),'el secuenciador avanza de nuevo');
sound=await p.evaluate(async()=>{let m=0;for(let i=0;i<20;i++){m=Math.max(m,window.__rms());await new Promise(r=>setTimeout(r,25));}return m;});ok(sound>.01,'suena en vivo después del scratch');
/* solo apretar y soltar (sin arrastre): frenada y arranque */
await pe('pointerdown',20,25);await W(300);await pe('pointerup',20,25);await W(500);
r=await p.evaluate(()=>({pa:GB.SCR.paused,l:GB.SCR.landing,pl:GB.S.playing}));ok(!r.pa&&!r.l&&r.pl,'apretar y soltar sin mover: frena y vuelve');
/* STOP durante el scratch */
await pe('pointerdown',20,25);await W(200);await p.tap('#bPlay');await W(50);await pe('pointerup',20,25);await W(500);
r=await p.evaluate(()=>({pl:GB.S.playing,pa:GB.SCR.paused,sch:!!GB.SCR.last}));ok(!r.pl&&!r.pa,'STOP mientras está apretado: queda parado, no retoma solo');
q=await st();ok(q.mode===0,'el audio vuelve a vivo después del STOP');
/* parado: el scratch igual funciona sobre lo que sonó */
await pe('pointerdown',20,25);await W(100);for(let k=1;k<=5;k++){await pe('pointermove',20,25+10*k);await W(15);}await pe('pointerup',20,75);await W(600);
r=await p.evaluate(()=>({pl:GB.S.playing,h:GB.SCR.held,l:GB.SCR.landing}));ok(!r.pl&&!r.h&&!r.l,'con el tema parado también se puede scratchear lo último que sonó');
/* LIVE graba lo que sale (incluido el scratch) */
ok(await p.evaluate(()=>GB.outTap()!==GB.SCR.node),'las tomas LIVE graban la salida del master (scratch + efectos)');
/* play de nuevo y cambio de parte: no se duplica */
await p.tap('#bPlay');await W(400);await pe('pointerdown',20,25);await W(200);await pe('pointerup',20,25);await W(600);
ok(await p.evaluate(()=>GB.S.playing&&!GB.SCR.paused),'play → scratch → sigue');
await p.tap('#bPlay');await W(200);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
