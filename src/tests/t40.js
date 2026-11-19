// v13.13: movimiento sobre la tecla grabado en el secuenciador (SYN, ACORDES, VINT)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.13',SH=process.env.SH;
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.XYR.forEach(a=>a.fill(null));GB.setBpm(100);GB.PERF.lc='off';GB.S.xy.syn0={x:'pitch',y:'cut',pr:2};GB.S.par[0]=Object.assign({},GB.SYNP[2]);});
/* grabar: REC + mantener una tecla y arrastrar */
await tab('keys');await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=syn0]').click());await W(100);
await p.tap('#bRec');await p.tap('#bPlay');await W(700);
const k=await (await p.$('#pads .pad:nth-child(10)')).boundingBox(),x0=k.x+k.width/2,y0=k.y+k.height/2;
await p.mouse.move(x0,y0);await p.mouse.down();await W(120);
for(let i=1;i<=10;i++){await p.mouse.move(x0+i*10,y0);await W(45);}
await W(250);await p.mouse.up();await W(50);
const rec=await p.evaluate(()=>{for(let s=0;s<16;s++)if(GB.pat[8][s])return {s,M:GB.XYR[8][s]};return null;});
await p.tap('#bPlay');await p.tap('#bRec');
ok(rec&&rec.M&&rec.M.x.length>=5,'el paso grabado guarda el movimiento ('+(rec&&rec.M?rec.M.x.length:0)+' muestras)');
ok(rec&&rec.M&&rec.M.x[0]===0&&Math.max(...rec.M.x)===100&&rec.M.y.every(v=>v===0),'sube de 0 a +100 en X, Y quieto');
/* reproducir: la voz de ese paso sigue la curva */
await tab('seq');await p.evaluate(()=>{if(GB.S.ring)document.querySelector('#bRing').click();});
await p.tap('#bPlay');
const pl=await p.evaluate(async(s)=>{const ctx=GB.ctx;let v=null;for(let i=0;i<200&&!v;i++){await new Promise(r=>setTimeout(r,10));const e=GB.SCH.find(x=>x.s===s&&x.t>ctx.currentTime-.05);if(e)v=[...GB.LIVE_()].find(q=>Math.abs(q.t0-e.t)<.002&&q.P===GB.S.par[0]);}
  if(!v)return null;const vals=[];for(let i=0;i<40;i++){vals.push(Math.round(v.o1[0].detune.value));await new Promise(r=>setTimeout(r,30));}return vals;},rec.s);
await p.tap('#bPlay');console.log(JSON.stringify(pl));
ok(pl&&pl[0]<60&&Math.max(...pl)>=170,'la nota del secuenciador repite el movimiento (pitch 0 → +2 st)');
ok(await p.evaluate(s=>GB.synG[0][s]>=5,rec.s),'SYN: la tecla mantenida queda con su GATE ('+await p.evaluate(s=>GB.synG[0][s],rec.s)+')');
await p.evaluate(()=>GB.renderPalette());
ok(await p.evaluate(s=>document.querySelectorAll('#grid .row')[8].querySelectorAll('.st.mo').length===1,rec.s),'la grilla marca el paso con movimiento');
await p.evaluate(s=>{GB.S.sel={r:8,s};GB.renderPalette();},rec.s);
ok(await p.evaluate(()=>[...document.querySelectorAll('#palette .cap')].some(b=>b.textContent.includes('MOV'))),'la paleta muestra 〰 MOV ✕');
if(SH)await p.screenshot({path:SH+'/p-mov.png'});
/* guardado, 32 pasos, borrar */
const rt=await p.evaluate(s=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));GB.XYR[8][s]=null;GB.applySnapshot(j);return !!GB.XYR[8][s]&&GB.XYR[8][s].x.length>0;},rec.s);
ok(rt,'el movimiento se guarda en la sesión');
ok(await p.evaluate(s=>{GB.setSteps(32);const r=!!GB.XYR[8][s+16];GB.setSteps(16);return r;},rec.s),'al pasar a 32 pasos se duplica con el movimiento');
await p.evaluate(()=>{[...document.querySelectorAll('#palette .cap')].find(b=>b.textContent.includes('MOV')).click();});
ok(await p.evaluate(s=>GB.XYR[8][s]===null&&GB.pat[8][s]===1,rec.s),'MOV ✕ borra solo el movimiento');
/* acordes y VINT */
const ch=await p.evaluate(()=>{GB.XYR[10][0]={x:[0,50,100,100],y:[0,0,0,0]};GB.S.xy.chd={x:'cut',y:'none',pr:2};const vs=GB.chordPlay(0,false,GB.ctx.currentTime+.02,GB.bus[3].inp,.5);GB.xyPlay(10,0,vs,'chd',GB.ctx.currentTime+.02);return vs.length;});
await W(220);ok(await p.evaluate(()=>{const v=[...GB.LIVE_()].find(q=>q.P===GB.S.chdPar);return v&&v.fl.detune.value>1500;}),'ACORDES: el movimiento abre el filtro');
const vin=await p.evaluate(async()=>{GB.S.vinPar=JSON.parse(JSON.stringify(GB.VINP[6]));const ctx=GB.ctx,v=GB.vinPlay(0,false,ctx.currentTime+.01,0);GB.xyApply([v],{x:'pitch',y:'none',pr:2},.5,0);await new Promise(r=>setTimeout(r,120));const o=v.o1.map(o=>Math.round(o.detune.value));v.stop();return o;});
console.log('MOOG BAJO detune',JSON.stringify(vin));
ok(vin.some(d=>d<-1000)&&vin.some(d=>d>50&&d<150),'VINT: arrastrar el pitch respeta la octava de abajo del MOOG');
/* REC en VINT con movimiento va a cada carril grabado */
await tab('keys');await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.XYR.forEach(a=>a.fill(null));GB.S.vch=true;GB.S.xy.vin={x:'cut',y:'none',pr:2};document.querySelector('#kmodeSeg [data-m=vin]').click();});
await p.tap('#bRec');await p.tap('#bPlay');await W(600);
const k2=await (await p.$('#pads .pad:nth-child(9)')).boundingBox();await p.mouse.move(k2.x+k2.width/2,k2.y+k2.height/2);await p.mouse.down();await W(100);
for(let i=1;i<=6;i++){await p.mouse.move(k2.x+k2.width/2-i*12,k2.y+k2.height/2);await W(40);}await W(150);await p.mouse.up();
await p.tap('#bPlay');await p.tap('#bRec');
const vr=await p.evaluate(()=>{let n=0,neg=0;for(let k=0;k<5;k++)for(let s=0;s<16;s++)if(GB.pat[12+k][s]&&GB.XYR[12+k][s]){n++;if(Math.min(...GB.XYR[12+k][s].x)<-50)neg++;}return {n,neg};});
ok(vr.n===3&&vr.neg===3,'ACORDE en VINT: los 3 carriles guardan el movimiento');
/* sin mover el dedo no se guarda nada */
await p.evaluate(()=>{GB.S.vch=false;GB.pat.forEach(r=>r.fill(0));GB.XYR.forEach(a=>a.fill(null));});await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=vin]').click());
await p.tap('#bRec');await p.tap('#bPlay');await W(500);await p.mouse.move(k2.x+k2.width/2,k2.y+k2.height/2);await p.mouse.down();await W(300);await p.mouse.up();await p.tap('#bPlay');await p.tap('#bRec');
ok(await p.evaluate(()=>{let any=false,on=false;for(let k=0;k<5;k++)for(let s=0;s<16;s++){if(GB.pat[12+k][s])on=true;if(GB.XYR[12+k][s])any=true;}return on&&!any;}),'nota sin arrastre: no guarda movimiento');
console.log(e.length?'errors '+e.join(' | '):'errors none');
await b.close();})();
