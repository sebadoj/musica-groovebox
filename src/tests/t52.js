// v13.27: en la cadena de SALIDA, DELAY y REVERB del pad tienen IN y OUT (unidades propias)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.27';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
const tab=t=>p.evaluate(t=>[...document.querySelectorAll('nav button')].find(x=>x.dataset.t===t).click(),t);
await p.tap('#bPlay');await W(300);
await p.evaluate(()=>{for(let s=0;s<GB.STEPS;s+=2)GB.pat[2][s]=1;for(let s=0;s<GB.STEPS;s+=4)GB.pat[0][s]=1;GB.CH.forEach((c,i)=>{c.dly=0;c.rev=0;GB.applyCh(i);});
  window.__mx=async(f,n=40)=>{let x=0;for(let i=0;i<n;i++){await new Promise(r=>setTimeout(r,25));x=Math.max(x,f());}return x;};});
await W(2500);
let r=await p.evaluate(()=>GB.PATCHPRE2.every(p=>p[1].some(c=>c[0]==='tdly'&&c[1]==='mst')&&p[1].some(c=>c[0]==='trev'&&c[1]==='mst')));
ok(r,'todas las cadenas de salida mandan DELAY y REVERB al master');
await tab('fx');await W(100);await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD').click());await W(150);
await p.evaluate(()=>[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent==='SALIDA (PAD XY)').click());await W(300);
ok(await p.evaluate(()=>{const G=GB.PCH.G;return G.tdly.ix!=null&&G.tdly.ox!=null&&G.trev.ix!=null&&G.trev.ox!=null&&G.mst.slots.length===6;}),'DELAY y REVERB con IN y OUT · MASTER con 6 retornos');
/* el pad usa su propio delay: el de envíos no se entera */
r=await p.evaluate(async()=>{GB.mfxOn('DLY',.6,.8);const pad=await window.__mx(()=>GB.CHO.lvl('tdly'));const snd=await window.__mx(()=>GB.fxLevel('dly'),4);GB.mfxOff('DLY');return {pad,snd};});
ok(r.pad>.1,'pad DELAY: suena por el DELAY de la salida ('+r.pad.toFixed(3)+')');ok(r.snd<.06,'el DELAY de envíos no se entera ('+r.snd.toFixed(3)+')');
/* reverb propia del pad: se prende solo mientras se usa */
r=await p.evaluate(async()=>{const a0=GB.PRV.v;GB.mfxOn('REV',.5,.8);await new Promise(r=>setTimeout(r,50));const a1=GB.PRV.v;const lv=await window.__mx(()=>GB.CHO.lvl('trev'),30);GB.mfxOff('REV');const a2=GB.PRV.v;await new Promise(r=>setTimeout(r,(GB.FXP.rev.size+1)*1000));return {a0,a1,a2,a3:GB.PRV.v,lv};});
ok(!r.a0&&r.a1&&r.lv>.05,'pad REVERB: prende su reverb propia y suena ('+r.lv.toFixed(3)+')');ok(r.a2&&!r.a3,'al soltar deja sonar la cola y después se apaga (ahorra CPU)');
/* cablear REVERB OUT → FILTER IN: la cola pasa por el filtro del pad */
r=await p.evaluate(()=>{GB.FXP.out=GB.FXP.out.filter(c=>!(c[0]==='trev'&&c[1]==='mst'));GB.FXP.out.push(['trev','flt',1]);GB.applyOut();return GB.CHO.N.some(n=>n.a==='trev'&&n.b==='flt')&&!GB.CHO.N.some(n=>n.a==='trev'&&n.b==='mst');});
ok(r,'REVERB OUT → FILTER IN se puede cablear');
r=await p.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms)),a=GB.ctx.createAnalyser();a.fftSize=2048;GB.outTap().connect(a);GB.pat.forEach(row=>row.fill(0));await sl(1500);
  const lv=async(n=8)=>{let m=0;for(let i=0;i<n;i++){await sl(20);const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}return m;};
  const tail=async to=>{GB.FXP.out=GB.FXP.out.filter(c=>c[0]!=='trev');GB.FXP.out.push(['trev',to,1]);GB.applyOut();await sl(300);
    GB.mfxOn('FLT',0,0);GB.mfxOn('REV',.9,1);await sl(150);GB.drumPlay(1,GB.ctx.currentTime+.01,1);GB.drumPlay(4,GB.ctx.currentTime+.01,1);await sl(200);GB.mfxOff('REV');await sl(350);const v=await lv();GB.mfxOff('FLT');await sl((GB.FXP.rev.size+1.2)*1000);return v;};
  const direct=await tail('mst'),filt=await tail('flt');return {direct,filt};});
ok(r.filt<r.direct*.5,'REVERB OUT → FILTER: la cola pasa por el filtro del pad (con el filtro cerrado: directo '+r.direct.toFixed(3)+' · por FILTER '+r.filt.toFixed(3)+')');
/* lazos */
r=await p.evaluate(()=>GB.outCycle([...GB.FXP.out.filter(c=>c[0]!=='trev'),['trev','flt',1],['flt','trev',1]]));ok(r,'FILTER → REVERB con REVERB → FILTER sería un lazo: no se permite');
r=await p.evaluate(()=>GB.outCycle([['mix','tdly',1],['tdly','trev',1],['trev','tdly',1]]));ok(r,'DELAY ↔ REVERB tampoco');
r=await p.evaluate(()=>GB.outPath([['mix','tdly',1],['tdly','mst',1]]));ok(!r,'el DELAY no cuenta como camino del MIX al master (solo suena mientras se toca)');
/* ajustes compartidos con DELAY */
r=await p.evaluate(()=>{GB.FXP.dly.div=3;GB.applyFx();GB.setDelayTime&&GB.setDelayTime();return new Promise(res=>setTimeout(()=>res(GB.fxv()),400));});
ok(Math.abs(r.pdt-r.dt)<.01&&r.pdt>.5,'el DELAY del pad toma el tiempo de DELAY ('+r.pdt.toFixed(3)+' s = '+r.dt.toFixed(3)+' s)');
/* sesiones: las de antes migran (DELAY/REVERB → master), las nuevas se respetan */
r=await p.evaluate(()=>{const j=JSON.parse(JSON.stringify(GB.snapshot(false)));
  j.fx.out=[['mix','flt',1],['flt','dist',1],['dist','mst',1],['flt','tdly',1],['flt','trev',1]];delete j.fx.outV;GB.loadSession(j);const old=GB.FXP.out.map(c=>c[0]+'>'+c[1]).sort().join(',');
  j.fx.out=[['mix','flt',1],['flt','dist',1],['dist','mst',1],['mix','tdly',1]];j.fx.outV=2;GB.loadSession(j);const nu=GB.FXP.out.map(c=>c[0]+'>'+c[1]).sort().join(',');return {old,nu};});
ok(r.old.includes('tdly>mst')&&r.old.includes('trev>mst'),'sesión de antes: DELAY y REVERB del pad salen al master (no quedan mudos) '+r.old);
ok(!r.nu.includes('tdly>mst'),'sesión nueva: se respeta un DELAY sin salida '+r.nu);
await p.tap('#bPlay');await W(100);
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
