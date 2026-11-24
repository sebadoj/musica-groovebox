// v13.28: los retornos de los efectos de ENVÍO pasan por los efectos de SALIDA (pad XY)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const c=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2,hasTouch:true});await c.addInitScript(()=>{delete window.showDirectoryPicker;});
const p=await c.newPage();const e=[];p.on('pageerror',x=>e.push(x.message));
const ok=(v,m)=>console.log((v?'PASS ':'FAIL ')+m);const W=ms=>p.waitForTimeout(ms);const V=process.env.V||'13.28';
await p.goto('file://'+require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+V+'.html'));await W(400);
await p.tap('#bPlay');await W(200);await p.tap('#bPlay');await W(200);
const tail=async(setup,closeFlt)=>p.evaluate(async([setup,closeFlt])=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));
  GB.CH.forEach((c,i)=>{c.dly=0;c.mod=0;c.dst=0;c.rev=i===0?1:0;GB.applyCh(i);});
  if(setup==='paralelo'){GB.FXP.patch=GB.PATCHPRE[0][1].map(c=>c.slice());GB.FXP.out=GB.PATCHPRE2[0][1].map(c=>c.slice());}
  if(setup==='distprimero'){GB.FXP.patch=GB.PATCHPRE[0][1].map(c=>c.slice());GB.FXP.out=GB.PATCHPRE2[1][1].map(c=>c.slice());}
  if(setup==='directo'){GB.FXP.patch=GB.PATCHPRE[0][1].map(c=>c.slice());GB.FXP.out=[['mix','mst',1]];}
  GB.applyPatch();GB.applyOut();await sl(400);
  const a=GB.ctx.createAnalyser();a.fftSize=2048;GB.outTap().connect(a);
  const lv=async(n=10)=>{let m=0;for(let i=0;i<n;i++){await sl(20);const d=new Float32Array(2048);a.getFloatTimeDomainData(d);let s=0;for(const v of d)s+=v*v;m=Math.max(m,Math.sqrt(s/d.length));}return m;};
  if(closeFlt)GB.mfxOn('FLT',0,0);await sl(80);
  GB.drumPlay(1,GB.ctx.currentTime+.01,1);GB.drumPlay(4,GB.ctx.currentTime+.01,1);await sl(450);   // el golpe seco ya se apagó: queda la cola de la reverb de envíos
  const v=await lv();if(closeFlt)GB.mfxOff('FLT');await sl((GB.FXP.rev.size+1.2)*1000);a.disconnect();return v;},[setup,closeFlt]);
const open=await tail('paralelo',false),closed=await tail('paralelo',true);
ok(open>.01,'la reverb de envíos suena (cola '+open.toFixed(3)+')');
ok(closed<open*.4,'el FILTER del pad filtra también la cola de la reverb de envíos ('+open.toFixed(3)+' → '+closed.toFixed(3)+')');
const c2=await tail('distprimero',true);ok(c2<open*.4,'con DIST PRIMERO la cola también pasa por el FILTER ('+c2.toFixed(3)+')');
const d0=await tail('directo',false),d1=await tail('directo',true);
ok(d0>.01&&d1>d0*.7,'con la SALIDA desconectada (MIX → MASTER) los retornos siguen sonando y el filtro no actúa ('+d0.toFixed(3)+' / '+d1.toFixed(3)+')');
/* el DELAY del pad también agarra los retornos (están en el MIX) */
r=await p.evaluate(async()=>{const sl=ms=>new Promise(r=>setTimeout(r,ms));GB.FXP.out=GB.PATCHPRE2[0][1].map(c=>c.slice());GB.applyOut();GB.CH.forEach((c,i)=>{c.dly=0;c.rev=i===0?1:0;GB.applyCh(i);});await sl(300);
  GB.drumPlay(1,GB.ctx.currentTime+.01,1);await sl(400);GB.mfxOn('DLY',.3,1);let m=0;for(let i=0;i<30;i++){await sl(25);m=Math.max(m,GB.CHO.lvl('tdly'));}GB.mfxOff('DLY');return m;});
var r;ok(r>.02,'el DELAY del pad agarra la cola de la reverb de envíos ('+r.toFixed(3)+')');
/* no se arma realimentación: los envíos salen de los canales, no del MIX */
r=await p.evaluate(()=>GB.FXP.patch.every(c=>c[1]==='mst')&&!GB.CHO.N.some(n=>n.b==='dly'));ok(r,'sin lazos: la SALIDA no vuelve a entrar a los efectos de envío');
/* interfaz */
r=await p.evaluate(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.dataset.t==='fx');b.click();return 1;});await W(100);
await p.evaluate(()=>[...document.querySelectorAll('#fxMode button')].find(x=>x.dataset.m==='CAD').click());await W(150);
await p.evaluate(()=>{const b=[...document.querySelectorAll('.busbox.chain button')].find(x=>x.textContent==='ENVÍOS');b&&b.click();});await W(200);
ok(await p.evaluate(()=>GB.CFS.names.mst==='SALIDA'),'en ENVÍOS el destino se llama SALIDA (pasa por el pad XY)');
ok(e.length===0,'errors '+(e.length?e.join(' | '):'none'));console.log('errors',e.length?e.join(' | '):'none');
await b.close();})();
