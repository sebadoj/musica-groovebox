// v13.11: compensación de latencia, swing, VINTAGE, 32 pasos, tempo por arrastre, contador, bug de la paleta
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.11',SH=process.env.SH;
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(300);await p.tap('#bPlay');await W(100);   // arranca el audio
/* ---- tempo por arrastre ---- */
ok(!(await p.$('#bpmM'))&&!(await p.$('#bpmP')),'sin botones − / + del tempo');
let bb=await p.$eval('#bpmD',el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.evaluate(()=>GB.S.bpm=90);
await p.mouse.move(bb.x,bb.y);await p.mouse.down();await p.mouse.move(bb.x+100,bb.y,{steps:8});await p.mouse.up();
ok(await p.evaluate(()=>GB.S.bpm===110),'arrastrar 100 px a la derecha = +20 BPM ('+await p.evaluate(()=>GB.S.bpm)+')');
await p.mouse.move(bb.x,bb.y);await p.mouse.down();await p.mouse.move(bb.x-60,bb.y,{steps:6});await p.mouse.up();
ok(await p.evaluate(()=>GB.S.bpm===98),'a la izquierda baja ('+await p.evaluate(()=>GB.S.bpm)+')');
await p.mouse.move(bb.x,bb.y);await p.mouse.down();await p.mouse.move(bb.x+1200,bb.y,{steps:10});await p.mouse.up();
ok(await p.evaluate(()=>GB.S.bpm===200&&document.querySelector('#bpmV').textContent==='200'),'tope 200 BPM');
await p.evaluate(()=>GB.setBpm(120));
/* ---- contador ---- */
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));});
ok(await p.$eval('#cntV',el=>el.textContent)==='1.1','contador parado en 1.1');
await p.tap('#bPlay');await W(2300);const cnt=await p.$eval('#cntV',el=>el.textContent);
ok(/^\d+\.[1-4]$/.test(cnt)&&cnt!=='1.1'&&await p.$eval('#cntBox',el=>el.classList.contains('on')),'contador corre al tocar ('+cnt+')');
await p.tap('#bPlay');await W(100);
/* ---- 32 pasos ---- */
await p.evaluate(()=>{GB.pat[0].fill(0);[0,4,8,12].forEach(s=>GB.pat[0][s]=1);GB.pat[8].fill(0);GB.pat[8][3]=1;GB.seqN[0][3]=5;GB.LEN.fill(16);GB.LEN[5]=7;});
await p.tap('#bSteps');await W(100);
ok(await p.evaluate(()=>GB.STEPS===32&&GB.LEN[0]===32&&GB.pat[0][16]===1&&GB.pat[0][28]===1&&GB.pat[8][19]===1&&GB.seqN[0][19]===5&&GB.LEN[5]===7),'16→32: duplica lo que había (polirritmo 7 queda)');
ok(await p.$$eval('#pageSeg button',a=>a.length===4&&a[3].textContent==='25–32'),'grilla con 4 páginas');
await p.evaluate(()=>{document.querySelector('#bRing').click();});await W(50);
const ring=await p.evaluate(()=>GB.S.ring);if(ring)await p.evaluate(()=>document.querySelector('#bRing').click());
await p.tap('#pageSeg button:nth-child(4)');await W(80);
ok(await p.evaluate(()=>GB.S.page===3&&document.querySelectorAll('#grid .st.on').length>0),'página 25–32 muestra pasos');
await p.evaluate(()=>GB.setBpm(200));await p.tap('#bPlay');await W(1900);
ok(await p.evaluate(()=>GB.SCH.some(x=>x.s>=24)),'el secuenciador recorre hasta el paso 32 ('+await p.evaluate(()=>Math.max(...GB.SCH.map(x=>x.s)))+')');
await p.tap('#bPlay');await W(80);
if(SH)await p.screenshot({path:SH+'/a-grid32.png'});
await p.evaluate(()=>document.querySelector('#bRing').click());await W(250);if(SH)await p.screenshot({path:SH+'/b-ring32.png'});
await p.evaluate(()=>{GB.doUndo();});await W(50);
ok(await p.evaluate(()=>GB.STEPS===16&&GB.LEN[0]===16),'↶ deshace el cambio a 32');
await p.evaluate(()=>{GB.setSteps(32);GB.pageUi();});await p.tap('#bSteps');await W(50);
ok(await p.evaluate(()=>GB.STEPS===16&&GB.LEN.every(l=>l<=16)),'32→16 acorta');
/* ---- swing ---- */
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.pat[0][1]=1;GB.pat[0][3]=1;GB.pat[0][2]=1;GB.S.sw=1;GB.setBpm(100);});
await p.tap('#bPlay');await W(700);
const sw=await p.evaluate(()=>{const e1=GB.SCH.find(x=>x.s===1),e2=GB.SCH.find(x=>x.s===2);return {d1:(GB.DHIT[0]>0?null:null),sd:GB.sd(),s1:e1&&e1.t,s2:e2&&e2.t};});
await p.tap('#bPlay');await W(50);
await p.evaluate(()=>{GB.pat[0].fill(0);GB.pat[0][1]=1;GB.S.sw=1;});await p.tap('#bPlay');await W(400);
const sw2=await p.evaluate(()=>{const e1=GB.SCH.find(x=>x.s===1);return {hit:GB.DHIT[0],t:e1.t,sd:GB.sd()};});
await p.tap('#bPlay');
ok(Math.abs((sw2.hit-sw2.t)-sw2.sd*.5)<.002,'SWING 75%: el 16avo par sale media semicorchea tarde ('+((sw2.hit-sw2.t)*1000).toFixed(1)+' ms de '+(sw2.sd*500).toFixed(1)+')');
await p.evaluate(()=>{GB.pat[0].fill(0);GB.pat[0][2]=1;});await p.tap('#bPlay');await W(500);
const sw3=await p.evaluate(()=>{const e=GB.SCH.find(x=>x.s===2);return GB.DHIT[0]-e.t;});await p.tap('#bPlay');
ok(Math.abs(sw3)<.002,'los 16avos impares no se mueven');
await p.evaluate(()=>{GB.S.sw=0;});
await p.evaluate(()=>document.querySelector('#bKit').click());await W(150);
ok(await p.$$eval('#kitSw .prm',a=>a.length===1&&a[0].textContent.includes('SWING')),'SWING en el menú BATERÍA');
if(SH)await p.screenshot({path:SH+'/c-kit-swing.png'});
await p.evaluate(()=>document.querySelector('#kitX').click());
/* ---- latencia ---- */
const cc=await p.evaluate(()=>{const iv=.75,cl=[...Array(12)].map((_,i)=>1+i*iv),tp=cl.map((c,i)=>c+.21+(i%3-1)*.012);return GB.calCalc(cl,tp,iv);});
ok(cc.ok&&Math.abs(cc.ms-210)<=4,'calibración: mediana de los toques ('+cc.ms+' ms)');
const cc2=await p.evaluate(()=>{const iv=.75,cl=[...Array(12)].map((_,i)=>1+i*iv),tp=cl.map((c,i)=>c+.15+(i%2?.12:-.1));return GB.calCalc(cl,tp,iv);});
ok(!cc2.ok&&cc2.why==='desparejo','calibración: toques desparejos se rechazan');
const cc3=await p.evaluate(()=>{const iv=.75,cl=[...Array(12)].map((_,i)=>1+i*iv),tp=cl.slice(0,5).map(c=>c+.3);return GB.calCalc(cl,tp,iv);});
ok(!cc3.ok&&cc3.why==='pocos','calibración: pocos toques se rechazan');
const cc4=await p.evaluate(()=>{const iv=.75,cl=[...Array(12)].map((_,i)=>1+i*iv),tp=cl.map((c,i)=>c+.55+(i%2)*.01);return GB.calCalc(cl,tp,iv);});
ok(cc4.ok&&Math.abs(cc4.ms-555)<=6,'calibración: aguanta Bluetooth lento ('+cc4.ms+' ms)');
// REC compensado
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.setBpm(90);GB.PERF.lc='off';});
await p.tap('#bRec');await p.tap('#bPlay');await W(1500);
const rc=await p.evaluate(()=>{const R=8,ctx=GB.ctx,find=lat=>{const tn=ctx.currentTime-lat,q=GB.sd();let best=null,bd=9;GB.SCH.forEach(x=>{const d=Math.abs(x.t-tn);if(d<bd){bd=d;best=x;}});return best.s%GB.STEPS;};
  GB.PERF.lc='cal';GB.PERF.lcMs=250;const exp=find(.25),got=GB.recWrite(R,4);GB.PERF.lc='off';const raw=find(0);return {exp,got,raw};});
ok(rc.got===rc.exp&&rc.got!==rc.raw,'REC compensado: escribe el paso que se escuchaba (paso '+(rc.got+1)+', sin compensar sería '+(rc.raw+1)+')');
const rc2=await p.evaluate(()=>{GB.PERF.lc='off';const tn=GB.ctx.currentTime;let best=null,bd=9;GB.SCH.forEach(x=>{const d=Math.abs(x.t-tn);if(d<bd){bd=d;best=x;}});return {got:GB.recWrite(8,2),exp:best.s%GB.STEPS};});
ok(rc2.got===rc2.exp,'NADA: igual que antes');
await p.tap('#bPlay');await p.tap('#bRec');await W(50);
await p.evaluate(()=>{GB.PERF.lc='cal';GB.PERF.lcMs=300;});
ok(await p.evaluate(()=>Math.abs(GB.latOut()-.3)<1e-6&&Math.abs((GB.ctx.currentTime-GB.vNow())-.3)<1e-6),'gráficos corridos lo que tarda el sonido');
await p.evaluate(()=>{GB.PERF.lc='auto';});ok(await p.evaluate(()=>GB.latOut()>=0&&GB.latOut()<.6),'AUTO usa lo que informa el navegador ('+Math.round(await p.evaluate(()=>GB.latOut()*1000))+' ms)');
await p.evaluate(()=>{GB.PERF.lc='off';});
await p.tap('#bSes');await W(150);
ok(await p.$eval('#pfLc',el=>el.textContent.includes('COMPENSAR')),'botón COMPENSAR en AUDIO');
await p.evaluate(()=>document.querySelector('#pfLc').click());ok(await p.evaluate(()=>GB.PERF.lc==='auto'),'COMPENSAR: NADA → AUTO');
await p.evaluate(()=>{GB.PERF.lcMs=0;document.querySelector('#pfLc').click();});ok(await p.evaluate(()=>GB.PERF.lc==='off'),'sin medida salta MEDIDA y vuelve a NADA');
if(SH){await p.evaluate(()=>{const s=document.querySelector('#sheet .sbox');s.scrollTop=s.scrollHeight;});await W(50);await p.screenshot({path:SH+'/d-audio.png'});}
await p.evaluate(()=>document.querySelector('#pfCal').click());await W(80);
ok(await p.$eval('#calSheet',el=>el.classList.contains('on')),'hoja CALIBRAR');
await p.tap('#calGo');await W(150);
for(let i=0;i<3;i++){await p.tap('#calPad');await W(120);}
ok((await p.$eval('#calMsg',el=>el.textContent)).includes('3 / 12'),'cuenta los toques');
if(SH)await p.screenshot({path:SH+'/e-cal.png'});
await p.tap('#calX');await p.evaluate(()=>document.querySelector('#shX').click());
/* ---- VINTAGE ---- */
const lv=await p.evaluate(async()=>{const out=[];for(let i=0;i<GB.VINP.length;i++){GB.S.vinPar=JSON.parse(JSON.stringify(GB.VINP[i]));GB.vinFx();const ctx=GB.ctx,v=GB.vinPlay(0,i%2,ctx.currentTime+.01,.35);
  let pk=0;const a=GB.bus[6].an,buf=new Uint8Array(a.fftSize);for(let k=0;k<12;k++){await new Promise(r=>setTimeout(r,25));a.getByteTimeDomainData(buf);for(const x of buf)pk=Math.max(pk,Math.abs(x-128)/128);}
  out.push([GB.VINP[i].n,+pk.toFixed(3),!!v&&v.vin===true]);await new Promise(r=>setTimeout(r,250));}return out;});
console.log(JSON.stringify(lv));
ok(lv.every(x=>x[1]>.02&&x[2]),'los '+lv.length+' sonidos VINTAGE suenan');
ok(lv.every(x=>x[1]<1),'ninguno satura el canal');
await tab('keys');await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=vin]').click());await W(150);
ok(await p.$$eval('#pads .pad',a=>a.length===14),'TECLAS VINT: 14 teclas');
await p.evaluate(()=>{GB.S.vinPre=0;GB.S.vinPar=JSON.parse(JSON.stringify(GB.VINP[0]));});await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=vin]').click());await W(80);
const pad=await p.$('#pads .pad');const pb=await pad.boundingBox();
await p.mouse.move(pb.x+pb.width/2,pb.y+pb.height/2);await p.mouse.down();await W(200);
ok(await p.evaluate(()=>[...GB.LIVE_()].some(v=>v.vin&&!v.done)),'tecla VINT suena mientras se mantiene');
await p.evaluate(()=>GB.S.vinPre=GB.S.vinPre);await p.evaluate(()=>document.querySelector('#kmodeSeg [data-m=vin]').click());await W(60);
ok(await p.evaluate(()=>![...GB.LIVE_()].some(v=>v.vin&&!v.done)),'si se redibuja el teclado con la tecla apretada no queda nota colgada');
await p.mouse.up();
await p.evaluate(()=>{GB.S.parOpen=true;document.querySelector('#kmodeSeg [data-m=vin]').click();});await W(200);
ok(await p.$$eval('#parPanel .dbar',a=>a.length===9),'HAMMOND: 9 drawbars en AJUSTES');
const db=await p.$('#parPanel .dbar:nth-child(4) .sl');const dbb=await db.boundingBox();await p.mouse.click(dbb.x+dbb.width/2,dbb.y+dbb.height*.1);
ok(await p.evaluate(()=>GB.S.vinPar.db[3]>=7),'drawbar 4′ se sube ('+await p.evaluate(()=>GB.S.vinPar.db.join(''))+')');
if(SH)await p.screenshot({path:SH+'/f-vint-org.png'});
ok(await p.evaluate(()=>{const nm=document.querySelector('#kopts .grow');return nm.scrollWidth<=nm.clientWidth+1;}),'el nombre del preset entra entero');
const vv=await (await p.$('#vview')).boundingBox();await p.mouse.click(vv.x+vv.width*.85,vv.y+vv.height/2);
ok(await p.evaluate(()=>GB.S.vinPar.fx==='fast'),'tocar el ROTOR acelera el leslie');await p.mouse.click(vv.x+vv.width*.85,vv.y+vv.height/2);
ok(await p.evaluate(()=>GB.S.vinPar.fx==='slow'),'y lo vuelve a frenar');
await p.evaluate(()=>{const b=[...document.querySelectorAll('#kopts .cap')].find(x=>x.textContent==='▶');for(let i=0;i<4;i++){[...document.querySelectorAll('#kopts .cap')].find(x=>x.textContent==='▶').click();}});await W(150);
ok(await p.evaluate(()=>GB.S.vinPar.n==='RHODES'&&!document.querySelector('#parPanel .dbar')&&document.querySelectorAll('#parPanel .prm').length===6),'RHODES: sin drawbars, 6 ajustes');
if(SH)await p.screenshot({path:SH+'/g-vint-rhodes.png'});
await p.evaluate(()=>{GB.S.parOpen=false;});
// secuenciador
await tab('seq');await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.pat[12][0]=1;GB.vinN[0][0]=2;GB.vinG[0][0]=4;GB.S.vinPar=JSON.parse(JSON.stringify(GB.VINP[0]));GB.vinFx();GB.setBpm(120);});
await p.tap('#bPlay');await W(300);
const sq=await p.evaluate(()=>{const a=GB.bus[6].an,buf=new Uint8Array(a.fftSize);a.getByteTimeDomainData(buf);let pk=0;for(const x of buf)pk=Math.max(pk,Math.abs(x-128)/128);return pk;});
await p.tap('#bPlay');ok(sq>.02,'la pista VINT suena en el secuenciador ('+sq.toFixed(3)+')');
ok(await p.evaluate(()=>{const r=document.querySelectorAll('#grid .row');return r.length===17&&[12,13,14,15,16].every((i,k)=>r[i].querySelector('.rl').textContent==='VIN '+(k+1));}),'5 carriles VIN 1…5 en la grilla');
await p.evaluate(()=>{GB.S.sel={r:12,s:0};GB.renderPalette();});
ok(await p.evaluate(()=>{const t=document.querySelector('#palette').textContent;return t.includes('GATE 4')&&document.querySelectorAll('#palette .pal.vg .cap').length===7;}),'paleta VINT: notas y GATE − n + 1 4 8 16');
// mixer
await tab('mix');await W(120);ok(await p.$$eval('#strips .strip',a=>a.length===8&&a[6].querySelector('.nm').textContent==='VINT'),'mixer: canal VINT');
if(SH)await p.screenshot({path:SH+'/h-mix.png'});
await tab('seq');
/* ---- guardado ---- */
const rt=await p.evaluate(()=>{GB.setSteps(32);GB.S.sw=.6;GB.vinN[0][20]=5;GB.pat[12][20]=1;const j=JSON.parse(JSON.stringify(GB.snapshot(false)));GB.setSteps(16);GB.S.sw=0;GB.vinN[0][20]=0;GB.applySnapshot(j);return {st:GB.STEPS,sw:GB.S.sw,v:GB.vinN[0][20],p:GB.pat[12][20],vp:GB.S.vinPar.n};});
ok(rt.st===32&&rt.sw===.6&&rt.v===5&&rt.p===1&&!!rt.vp,'la sesión guarda 32 pasos, swing y VINT');
const old=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));j.v=8;delete j.steps;delete j.sw;delete j.vinN;delete j.vinG;delete j.vinPar;delete j.vinPre;j.pat=j.pat.slice(0,12).map(r=>r.slice(0,16));j.seqN=j.seqN.map(r=>r.slice(0,16));j.len=j.len.slice(0,12).map(()=>16);j.ch=j.ch.slice(0,6);delete j.xy.vin;
  GB.applySnapshot(j);return {st:GB.STEPS,l:GB.pat[12].length,l0:GB.pat[0].length,xy:!!GB.S.xy.vin,len:GB.LEN[12]};});
ok(old.st===16&&old.l===32&&old.l0===32&&old.xy&&old.len===16,'sesión vieja (v13.10) abre bien');
/* ---- bug: la paleta del anillo no se cierra sola ---- */
await p.evaluate(()=>{if(!GB.S.ring)document.querySelector('#bRing').click();});await W(150);
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.S.sel={r:8,s:2};GB.pat[8][2]=1;GB.seqN[0][2]=0;GB.renderPalette();GB.noteOpen(true);
  const b=[...document.querySelectorAll('#rNote .pal:not(.g) .cap')][4];b.click();});   // el "click fantasma" del mismo toque
await W(300);
ok(await p.evaluate(()=>document.querySelector('#rNote').classList.contains('on')&&GB.seqN[0][2]===0),'el click del mismo toque no elige nota ni cierra la paleta');
await W(350);await p.evaluate(()=>{[...document.querySelectorAll('#rNote .pal:not(.g) .cap')][4].click();});await W(260);
ok(await p.evaluate(()=>!document.querySelector('#rNote').classList.contains('on')&&GB.seqN[0][2]===4),'un toque de verdad elige la nota y cierra');
// toque real sobre el anillo (táctil)
const rg=await p.evaluate(()=>{GB.ringSel(8);GB.pat[8].fill(0);GB.pat[8][2]=1;GB.seqN[0][2]=1;GB.S.sel={r:8,s:0};return null;});await W(250);
const pos=await p.evaluate(()=>{const cv=document.querySelector('#ring'),b=cv.getBoundingClientRect();GB.viz.drawRing();return {cx:b.x+b.width/2,cy:b.y+b.height/2,w:b.width};});
// el paso 3 de 16 en el anillo de la pista elegida (radio exterior)
const tapAt=await p.evaluate(()=>{const cv=document.querySelector('#ring'),b=cv.getBoundingClientRect(),d=cv.width/b.width;let rad=null;return null;});
if(SH)await p.screenshot({path:SH+'/i-ring.png'});

/* ---- VINT: 5 carriles, REC a carril libre, GATE por tiempo apretado ---- */
const mig=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));const n=Array(32).fill(0),c=Array(32).fill(0),g=Array(32).fill(1);n[4]=2;c[4]=1;g[4]=8;n[8]=5;
  j.vinN=n;j.vinC=c;j.vinG=g;j.pat=j.pat.slice(0,13);j.pat[12]=Array(32).fill(0);j.pat[12][4]=1;j.pat[12][8]=1;j.len=j.len.slice(0,13);j.len[12]=16;GB.applySnapshot(j);
  return {a:GB.pat[12][4]&&GB.pat[13][4]&&GB.pat[14][4],n:[GB.vinN[0][4],GB.vinN[1][4],GB.vinN[2][4]],g:GB.vinG[1][4],solo:GB.pat[12][8]&&!GB.pat[13][8],len:GB.LEN[14]};});
ok(mig.a&&mig.n.join()==='2,4,6'&&mig.g===8&&mig.solo&&mig.len===16,'sesión v13.11: el acorde VINT pasa a 3 carriles');
await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.setSteps(16);GB.setBpm(120);GB.PERF.lc='off';});
await p.tap('#bRec');await p.tap('#bPlay');await W(900);
const rec=await p.evaluate(()=>{const a=GB.vinRec([0]),b=GB.vinRec([4]),c=GB.vinRec([0]);return {a,b,c};});
ok(rec.a[0].k===0&&rec.b[0].k===1&&rec.a[0].st===rec.b[0].st,'dos notas en el mismo paso van a carriles distintos');
ok(rec.c[0].k===0,'la misma nota otra vez no duplica');
const ch=await p.evaluate(()=>GB.vinRec([2,4,6]).map(o=>o.k));ok(ch.length===3&&new Set(ch).size===3,'ACORDE en el teclado graba 3 carriles ('+ch.join(',')+')');
await p.evaluate(()=>GB.vinGate(GB.vinRec([3])[0],1.0));
ok(await p.evaluate(()=>GB.vinG.some(a=>a.includes(8))),'mantener 1 s a 120 BPM = GATE 8');
await p.tap('#bPlay');await p.tap('#bRec');await W(60);
// teclado VINT: apretar y soltar con REC
await tab('keys');await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.S.vch=false;document.querySelector('#kmodeSeg [data-m=vin]').click();});
await p.tap('#bRec');await p.tap('#bPlay');await W(600);
const k1=await (await p.$('#pads .pad:nth-child(9)')).boundingBox();await p.mouse.move(k1.x+k1.width/2,k1.y+k1.height/2);await p.mouse.down();await W(760);await p.mouse.up();
const kr=await p.evaluate(()=>{for(let k=0;k<5;k++)for(let s=0;s<16;s++)if(GB.pat[12+k][s])return {k,s,g:GB.vinG[k][s]};return null;});
await p.tap('#bPlay');await p.tap('#bRec');
ok(kr&&kr.g>=5&&kr.g<=7,'tecla mantenida ~0,75 s se graba con GATE '+(kr&&kr.g));
// bajo largo que sigue sonando mientras pasan los otros pasos
await tab('seq');await p.evaluate(()=>{GB.pat.forEach(r=>r.fill(0));GB.S.vinPar=JSON.parse(JSON.stringify(GB.VINP[6]));GB.vinFx();GB.pat[12][0]=1;GB.vinN[0][0]=0;GB.vinG[0][0]=16;GB.pat[13][4]=1;GB.vinN[1][4]=4;GB.pat[14][8]=1;GB.vinN[2][8]=6;GB.setBpm(120);});
await p.tap('#bPlay');await W(1300);
const bass=await p.evaluate(()=>[...GB.LIVE_()].filter(v=>v.vin&&v.tr>GB.ctx.currentTime).length);
await p.tap('#bPlay');ok(bass>=2,'el bajo GATE 16 sigue sonando mientras entran las otras notas ('+bass+' voces)');
await p.evaluate(()=>{GB.S.sel={r:12,s:0};GB.renderPalette();if(GB.S.ring)document.querySelector('#bRing').click();});await W(150);
ok(await p.evaluate(()=>document.querySelectorAll('#grid .row')[12].querySelectorAll('.st.tail').length===7),'la grilla muestra la cola del GATE');
await p.evaluate(()=>{[...document.querySelectorAll('#palette .pal.vg .cap')].find(b=>b.textContent==='+').click();});
ok(await p.evaluate(()=>GB.vinG[0][0]===16),'GATE + no pasa de 16 con 16 pasos');
await p.evaluate(()=>{[...document.querySelectorAll('#palette .pal.vg .cap')].find(b=>b.textContent==='4').click();});ok(await p.evaluate(()=>GB.vinG[0][0]===4),'GATE 4 con un toque');
if(SH){await p.screenshot({path:SH+'/m-vin-grid.png'});await p.evaluate(()=>document.querySelector('#bRing').click());await W(300);await p.evaluate(()=>GB.ringSel(12));await W(400);await p.screenshot({path:SH+'/n-vin-ring.png'});}
console.log(e.length?'errors '+e.join(' | '):'errors none');
await b.close();})();
