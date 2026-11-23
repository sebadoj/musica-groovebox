<script>
'use strict';
/* =====================================================================
   MUSICA GROOVEBOX — versión celular v13.19 (20261123)
   Un solo archivo, sin librerías, Web Audio.
   16/32 pasos · 2 synths · VINTAGE (órgano, piano eléctrico, analógico, clavinet, cuerdas) · acordes (4 presets + GATE) · 8 drums · SAMPLER (chop en 4 teclas)
   · mixer 6 canales + master (pan, 3 envíos, medidores) · buses FX (delay/reverb/mod/master)
   · limiter + medidor de clip · REC en vivo con metrónomo y deshacer · sesiones en Drive.
   ===================================================================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const mtof=m=>440*Math.pow(2,(m-69)/12);
const noteName=m=>NN[((m%12)+12)%12]+(Math.floor(m/12)-1);
const SCALES=[['MAYOR',[0,2,4,5,7,9,11]],['MENOR',[0,2,3,5,7,8,10]],['DÓRICA',[0,2,3,5,7,9,10]],['MIXOLIDIA',[0,2,4,5,7,9,10]],['FRIGIA',[0,1,3,5,7,8,10]],['ARMÓNICA m',[0,2,3,5,7,8,11]]];
const ROMAN=['I','II','III','IV','V','VI','VII'];

/* ---------------- estado ---------------- */
const MAXS=32;let STEPS=16;   // STEPS = largo del patrón (16 o 32); los arrays siempre tienen 32
const fitA=(a,d)=>{const o=Array.isArray(a)?a.slice(0,MAXS):[];for(let i=0;i<MAXS;i++)if(o[i]==null)o[i]=d;return o;};
const CH=[{n:'DRUMS',s:'DRUMS',c:'#ff6a4d'},{n:'SYN 1',s:'SYN1',c:'#4df0c4'},{n:'SYN 2',s:'SYN2',c:'#7dff9a'},{n:'CHORDS',s:'CHORD',c:'#c9a6ff'},{n:'SIRENA',s:'SIREN',c:'#ff5a8a'},{n:'SAMPLER',s:'SMPL',c:'#ffd27a'},{n:'VINTAGE',s:'VINT',c:'#7ab8ff'},{n:'SAMPLER 2',s:'SMP2',c:'#ffab6e'}]
  .map((c,i)=>Object.assign(c,{vol:[.85,.8,.7,.6,.7,.8,.72,.8][i],dly:[.1,.2,.3,.3,.55,.15,.12,.15][i],rev:[.05,.1,.15,.25,.35,.1,.2,.1][i],mod:0,dst:0,pan:0,mute:false,solo:false,thr:false}));
const DR=[
 {n:'KICK',c:'#ff6a4d'},{n:'SNARE',c:'#ffb347'},{n:'C.HAT',c:'#4df0c4'},{n:'O.HAT',c:'#7dff9a'},
 {n:'CLAP',c:'#c9ffee'},{n:'TOM',c:'#ff8a5c'},{n:'RIM',c:'#f5e08a'},{n:'COW',c:'#ffd27a'}];
const ROWS=DR.map((d,i)=>({n:d.n,c:d.c,t:'drum'})).concat([{n:'SYN 1',c:CH[1].c,t:'syn',k:0},{n:'SYN 2',c:CH[2].c,t:'syn',k:1},{n:'ACORD',c:CH[3].c,t:'chd'},{n:'SMPL',c:CH[5].c,t:'smp'},...['#7ab8ff','#94c6ff','#b0d6ff','#6aa2ec','#5b8fd8'].map((c,k)=>({n:'VIN '+(k+1),c,t:'vin',k})),{n:'SMP 2',c:CH[7].c,t:'smp',k:1}]);
const NR=ROWS.length;
const R_SYN=8,R_CHD=10,R_SMP=11,R_VIN=12,R_SMP2=17;
/* MOVIMIENTO grabado por paso: lo que hiciste con el dedo sobre la tecla, XYQ muestras por paso, x/y en −100…100 */
const XYQ=4,XYR=ROWS.map(()=>Array(MAXS).fill(null));
const LEN=Array(NR).fill(16),RM=Array(NR).fill(false),RS=Array(NR).fill(false);   // largo (polirritmo), mute y solo por pista
const pat=ROWS.map(()=>Array(MAXS).fill(0));
const seqN=[Array(MAXS).fill(0),Array(MAXS).fill(0)],chdSeq=Array(MAXS).fill(0),chdGate=Array(MAXS).fill(2),smpSeq=Array(MAXS).fill(0),smpSeq2=Array(MAXS).fill(0);
const sSeq=R=>R&&R.k?smpSeq2:smpSeq;   // secuencia del renglón SMPL o SMP 2
const synG=[Array(MAXS).fill(1),Array(MAXS).fill(1)];   // SYN 1 / SYN 2: GATE por paso (1 = como antes)
const VL=5;   // VINTAGE: 5 carriles (anillos); cada paso de cada carril tiene su nota (grado) y su GATE en pasos (1…32)
const vinN=[...Array(VL)].map(()=>Array(MAXS).fill(0)),vinG=[...Array(VL)].map(()=>Array(MAXS).fill(1));
const GATES=[1,2,4,8];
const BASEOCT=[2,4],VBASE=3;
const S={tab:'seq',bpm:90,key:9,scale:1,playing:false,rec:false,page:0,cur:-1,sel:{r:0,s:0},po:0,name:'',
  kmode:'syn0',ko:[0,0],seventh:false,pre:[0,2],chdPre:0,cut:[0,0],mfx:'DLY',hold:false,master:.85,fxMode:'PAD',hasUndo:false,xy:{syn0:{x:'pitch',y:'cut',pr:2},syn1:{x:'pitch',y:'cut',pr:2},chd:{x:'pitch',y:'cut',pr:2}},kit:0,part:0,next:null,song:false,rep:[1,1,1,1],smp2:false,sw:0,vinPre:0,vko:0,vch:false};
S.xy.vin={x:'pitch',y:'cut',pr:2};
const XY={x:.5,y:.7,on:false};

/* patrón de ejemplo (dub lento en La menor) para que arranque sonando algo */
[0,8,11].forEach(s=>pat[0][s]=1);[4,12].forEach(s=>pat[1][s]=1);[2,6,10,14].forEach(s=>pat[2][s]=1);pat[3][15]=1;pat[6][7]=1;
[[0,0],[3,0],[6,4],[10,2],[12,4]].forEach(a=>{pat[8][a[0]]=1;seqN[0][a[0]]=a[1];});
[[2,0],[6,0],[10,5],[14,5]].forEach(a=>{pat[10][a[0]]=1;chdSeq[a[0]]=a[1];});
[[4,7],[7,9]].forEach(a=>{pat[9][a[0]]=1;seqN[1][a[0]]=a[1];});

/* ---------------- sonidos ---------------- */
const SYNP=[
 {n:'SUB BASS',w1:'sine',w2:'triangle',det:0,sub:.6,cut:.28,res:1,env:.5,atk:.004,dec:.25,sus:.75,rel:.12,g:.68,lfoR:2,lfoD:0,lfoS:'sine',lfoT:0},
 {n:'DUB BASS',w1:'sawtooth',w2:'square',det:6,sub:.5,cut:.32,res:5,env:.6,atk:.004,dec:.3,sus:.55,rel:.15,g:.62,lfoR:1.9,lfoD:.15,lfoS:'sine',lfoT:0},
 {n:'LEAD',w1:'sawtooth',w2:'sawtooth',det:9,sub:0,cut:.62,res:3,env:.35,atk:.01,dec:.2,sus:.7,rel:.22,g:.55,lfoR:5.5,lfoD:.05,lfoS:'sine',lfoT:1},
 {n:'PLUCK',w1:'square',w2:'sawtooth',det:4,sub:.1,cut:.4,res:4,env:.7,atk:.002,dec:.14,sus:0,rel:.1,g:.6,lfoR:2,lfoD:0,lfoS:'sine',lfoT:0},
 {n:'PAD',w1:'sawtooth',w2:'triangle',det:12,sub:.2,cut:.42,res:1,env:.2,atk:.35,dec:.4,sus:.8,rel:.7,g:.5,lfoR:.9,lfoD:.08,lfoS:'sine',lfoT:0},
 /* bajos nuevos: el WOBBLE mueve el filtro con un LFO sincronizado al BPM (sync = ciclos por negra) */
 {n:'WOBBLE 1/8',w1:'sawtooth',w2:'square',det:7,sub:.5,cut:.36,res:8,env:.1,atk:.005,dec:.4,sus:.9,rel:.12,g:.6,lfoR:3,lfoD:.9,lfoS:'sine',lfoT:0,sync:2},
 {n:'WOBBLE TRIPLE',w1:'square',w2:'sawtooth',det:5,sub:.6,cut:.33,res:10,env:.1,atk:.005,dec:.4,sus:.9,rel:.12,g:.56,lfoR:4.5,lfoD:1,lfoS:'triangle',lfoT:0,sync:3},
 {n:'REESE',w1:'sawtooth',w2:'sawtooth',det:26,sub:.55,cut:.34,res:3,env:.2,atk:.01,dec:.5,sus:.85,rel:.25,g:.56,lfoR:.4,lfoD:.55,lfoS:'sine',lfoT:0,sync:.25},
 /* leads nuevos */
 {n:'SUPERSAW',w1:'sawtooth',w2:'sawtooth',det:22,sub:0,cut:.72,res:1.5,env:.25,atk:.012,dec:.3,sus:.8,rel:.35,g:.55,lfoR:5.2,lfoD:.04,lfoS:'sine',lfoT:1},
 {n:'SQUARE SUAVE',w1:'square',w2:'triangle',det:8,sub:.1,cut:.5,res:2,env:.3,atk:.02,dec:.25,sus:.75,rel:.3,g:.5,lfoR:5.5,lfoD:.08,lfoS:'sine',lfoT:1},
 {n:'ACID',w1:'sawtooth',w2:'sawtooth',det:0,sub:0,cut:.3,res:13,env:.95,atk:.002,dec:.22,sus:.15,rel:.08,g:.95,lfoR:2,lfoD:0,lfoS:'sine',lfoT:0}];
const CHDPRE=[
 {n:'CLASSIC',w1:'sawtooth',w2:'square',det:8,sub:0,cut:.5,res:2,env:.5,atk:.01,dec:.3,sus:.35,rel:.25,g:.5,lfoR:2,lfoD:0,lfoS:'sine',lfoT:0},
 {n:'PADS',w1:'sawtooth',w2:'triangle',det:12,sub:0,cut:.4,res:1,env:.2,atk:.4,dec:.5,sus:.8,rel:.9,g:.45,lfoR:.6,lfoD:.1,lfoS:'sine',lfoT:0},
 {n:'KEYS',w1:'triangle',w2:'sine',det:3,sub:0,cut:.55,res:1,env:.4,atk:.004,dec:.5,sus:.25,rel:.3,g:.55,lfoR:5,lfoD:0,lfoS:'sine',lfoT:0},
 {n:'STAB',w1:'square',w2:'sawtooth',det:7,sub:0,cut:.45,res:5,env:.8,atk:.002,dec:.12,sus:0,rel:.1,g:.5,lfoR:2,lfoD:0,lfoS:'sine',lfoT:0},
 {n:'ORGAN',w1:'sine',w2:'square',det:2,sub:.4,cut:.7,res:.7,env:0,atk:.01,dec:.1,sus:1,rel:.08,g:.4,lfoR:6.5,lfoD:.15,lfoS:'sine',lfoT:2}];
const CHDP=CHDPRE[0];
S.par=[Object.assign({},SYNP[S.pre[0]]),Object.assign({},SYNP[S.pre[1]])];S.chdPar=Object.assign({},CHDPRE[S.chdPre]);S.parOpen=false;
const curP=k=>S.par[k];
/* VINTAGE: teclados clásicos. e = motor: org (órgano de ruedas, drawbars), ep (piano eléctrico FM), ana (analógico tipo Moog),
   clav (clavinet), str (máquina de cuerdas). fx = rotor del canal: off · slow/fast (leslie) · trem · vib · ens (ensamble) */
const VD={e:'org',res:.7,env:0,lfoR:5.8,lfoD:0,lfoS:'sine',lfoT:1,vk:.18,g:.55,drv:0,fx:'off',oct:0,cut:.85,atk:.005,dec:.5,sus:1,rel:.1,det:0,sub:0};
const VINP=[
 {n:'HAMMOND',e:'org',db:[8,8,8,0,0,0,0,0,0],perc:3,click:.5,fx:'slow',cut:.9,rel:.06,g:.64},
 {n:'ÓRGANO ROCK',e:'org',db:[8,8,8,6,0,0,0,0,3],perc:0,click:.8,fx:'fast',drv:.65,cut:.86,rel:.08,g:.4},
 {n:'GOSPEL',e:'org',db:[8,8,8,8,6,6,5,5,6],perc:2,click:.4,fx:'fast',drv:.18,cut:.9,rel:.1,g:.42},
 {n:'COMBO 60s',e:'org',db:[0,0,8,8,5,7,4,3,6],perc:0,click:.1,fx:'vib',drv:.3,cut:.8,rel:.05,g:.4},
 {n:'RHODES',e:'ep',ix:1.6,bell:.6,fx:'trem',cut:.78,atk:.002,dec:2.8,sus:0,rel:.4,g:.7},
 {n:'WURLI',e:'ep',ix:3.4,bell:.25,fx:'trem',drv:.4,cut:.72,atk:.002,dec:1.5,sus:0,rel:.22,g:.46},
 {n:'MOOG BAJO',e:'ana',oct:-1,w:['sawtooth','sawtooth','square'],dt:[0,7,-1200],mx:[1,.75,.55],cut:.3,res:4,env:.6,atk:.003,dec:.32,sus:.55,rel:.1,drv:.25,g:.62},
 {n:'MOOG LEAD',e:'ana',w:['sawtooth','sawtooth','square'],dt:[0,-8,1200],mx:[1,.8,.35],cut:.48,res:6,env:.5,atk:.006,dec:.4,sus:.75,rel:.2,vk:.25,lfoR:5.4,g:.6},
 {n:'BRASS 80',e:'ana',w:['sawtooth','sawtooth','sawtooth'],dt:[0,9,-9],mx:[1,.8,.8],cut:.34,res:1.4,env:.6,fatk:.09,atk:.05,dec:.6,sus:.75,rel:.32,fx:'ens',g:.62},
 {n:'CLAVINET',e:'clav',cut:.6,res:5,env:.7,atk:.001,dec:.42,sus:0,rel:.05,drv:.12,g:.42},
 {n:'CUERDAS 70s',e:'str',cut:.5,res:.8,atk:.5,dec:.6,sus:.85,rel:1,fx:'ens',g:.6}].map(p=>Object.assign({},VD,p));
const vinFresh=i=>JSON.parse(JSON.stringify(VINP[i]||VINP[0]));
S.vinPar=vinFresh(0);

/* buses FX generales (delay / reverb / mod / master) — valores y presets de fábrica */
const DIVS=[['1/16',.25],['1/8',.5],['1/8.',.75],['1/4',1],['1/2',2]];
const FXD=()=>({dly:{div:2,fb:.4,tone:3200,ret:.8},rev:{size:1.8,pre:0,damp:6000,ret:.8},mod:{mode:0,rate:.8,depth:.5,fb:.2,ret:.7},mst:{comp:.5,sat:0,tone:.5},dst:{drive:.5,tone:5000,ret:.8}});
const FXP=FXD();
const FXPRE=[
 ['INIT',{}],
 ['DUB ECO',{dly:{div:2,fb:.7,tone:2200,ret:1}}],
 ['SALA',{rev:{size:1.4,pre:12,damp:7000,ret:1}}],
 ['CATEDRAL',{rev:{size:4.6,pre:40,damp:4200,ret:1}}],
 ['CHORUS ANCHO',{mod:{mode:0,rate:.6,depth:.7,fb:.15,ret:1}}],
 ['FLANGER JET',{mod:{mode:1,rate:.25,depth:.8,fb:.7,ret:1}}],
 ['PEGAMENTO LOFI',{mst:{comp:.8,sat:.45,tone:.35}}],
 ['DIST SUCIA',{dst:{drive:.8,tone:3200,ret:1}}],
 ['FUZZ',{dst:{drive:1,tone:2400,ret:.9}}]];
function fxPreset(i){const b=FXD(),o=FXPRE[i][1];['dly','rev','mod','mst','dst'].forEach(k=>Object.assign(FXP[k],b[k],o[k]||{}));applyFx();}

function scaleNote(idx,base){const sc=SCALES[S.scale][1],o=Math.floor(idx/7),i=((idx%7)+7)%7;return 12*(base+1)+S.key+sc[i]+12*o;}
function chordMidi(deg,sev){const ix=[deg,deg+2,deg+4];if(sev)ix.push(deg+6);return ix.map(i=>scaleNote(i,3));}
function chordName(deg,sev){
  const m=chordMidi(deg,sev),r=m[0],a=m[1]-r,b=m[2]-r;
  const q=(a===3&&b===7)?'m':(a===4&&b===7)?'':(a===3&&b===6)?'°':(a===4&&b===8)?'+':'?';
  const minor=q==='m'||q==='°';
  return{name:NN[r%12]+q+(sev?'7':''),roman:minor?ROMAN[deg].toLowerCase():ROMAN[deg]};
}

let ctx=null,mixOut,fltM,shaper,dstDry,dstWet,pre,masterG,satDry,satWet,satSh,toneF,mcomp,lim,clampSh,anM,dlySum,dly,dfb,dflt,dRet,revIn,revPre,conv,revTone,revRet,mDly,mRev,repIn,repDel,repFb,repOut,
  modIn,modDel,modFb,modLfo,modDepth,modRet,sdIn,sdHp,sdSh,sdLp,sdRet,noiseBuf,silentEl=null,
  vinIn=null,vinSh,vinPost,rotDry,rotWet,rotDel,rotAmp,rotPan,rotLfo=null,rotDD,rotDA,rotDP;
const bus=[];
const mbuf=new Float32Array(1024);
const G=v=>{const g=ctx.createGain();g.gain.value=v;return g;};
function makeIR(sec){const n=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6);return b;}   // IR mono: la mitad de CPU
let lastDrive=-1;
function setDrive(v){if(Math.abs(v-lastDrive)<.02)return;lastDrive=v;const k=v*120+1,n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(1+k)*x/(1+k*Math.abs(x));}shaper.curve=c;}
let lastSd=-1;
function sdCurve(v){if(!ctx||Math.abs(v-lastSd)<.02)return;lastSd=v;const k=v*90+2,n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;c[i]=(1+k)*x/(1+k*Math.abs(x));}sdSh.curve=c;}
function setDelayTime(){if(ctx)dly.delayTime.setTargetAtTime(60/S.bpm*DIVS[FXP.dly.div][1],ctx.currentTime,.05);}
let irSize=0,irT=null;
function applyFx(){
  if(!ctx)return;const t=ctx.currentTime,F=FXP;
  setDelayTime();dfb.gain.setTargetAtTime(F.dly.fb,t,.03);dflt.frequency.setTargetAtTime(F.dly.tone,t,.03);dRet.gain.setTargetAtTime(F.dly.ret,t,.03);
  revPre.delayTime.setTargetAtTime(F.rev.pre/1000,t,.03);revTone.frequency.setTargetAtTime(F.rev.damp,t,.03);revRet.gain.setTargetAtTime(F.rev.ret,t,.03);
  const want=PERF.lite?Math.min(F.rev.size,1.1):F.rev.size;if(Math.abs(want-irSize)>.05){clearTimeout(irT);irT=setTimeout(()=>{irSize=want;try{conv.buffer=makeIR(irSize);}catch(e){}},220);}
  sdCurve(F.dst.drive);sdLp.frequency.setTargetAtTime(F.dst.tone,t,.03);sdRet.gain.setTargetAtTime(F.dst.ret*.7,t,.03);
  setSat(F.mst.sat>.01);
  const fl=F.mod.mode===1;modDel.delayTime.setTargetAtTime(fl?.004:.018,t,.03);modDepth.gain.setTargetAtTime((fl?.003:.007)*F.mod.depth,t,.03);
  modLfo.frequency.setTargetAtTime(F.mod.rate,t,.03);modFb.gain.setTargetAtTime(F.mod.fb*(fl?1.1:.6),t,.03);modRet.gain.setTargetAtTime(F.mod.ret,t,.03);
  mcomp.threshold.setTargetAtTime(-6-F.mst.comp*16,t,.03);mcomp.ratio.setTargetAtTime(2+F.mst.comp*2,t,.03);
  satWet.gain.setTargetAtTime(F.mst.sat*.8,t,.03);satDry.gain.setTargetAtTime(1-F.mst.sat*.5,t,.03);toneF.gain.setTargetAtTime((F.mst.tone-.5)*24,t,.03);
}
function initAudio(){
  if(ctx){if(ctx.state!=='running')ctx.resume().catch(()=>{});return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
  try{ // en iPhone el interruptor de silencio apaga Web Audio salvo que haya un <audio> sonando
    const n=4000,u=new Uint8Array(44+n),dv=new DataView(u.buffer),w=(o,s)=>[...s].forEach((c,i)=>dv.setUint8(o+i,c.charCodeAt(0)));
    w(0,'RIFF');dv.setUint32(4,36+n,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,8000,true);dv.setUint32(28,8000,true);dv.setUint16(32,1,true);dv.setUint16(34,8,true);w(36,'data');dv.setUint32(40,n,true);u.fill(128,44);
    silentEl=new Audio(URL.createObjectURL(new Blob([u],{type:'audio/wav'})));silentEl.loop=true;silentEl.play().catch(()=>{});
  }catch(e){}
  ctx=new AC({latencyHint:PERF.lat==='low'?'interactive':PERF.lat==='high'?'playback':'balanced'});satOn=false;dstOn=false;revConn=false;modConn=false;repConn=false;
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);{const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  /* master: pre → vol → (saturación paralela) → tono → compresor → LIMITER → clamp suave → salida; el analizador mide antes del clamp */
  pre=G(1);masterG=G(S.master);
  satDry=G(1);satWet=G(0);satSh=ctx.createWaveShaper();satSh.oversample='2x';
  {const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=Math.tanh(x*2.2)/Math.tanh(2.2);}satSh.curve=c;}
  toneF=ctx.createBiquadFilter();toneF.type='highshelf';toneF.frequency.value=3000;toneF.gain.value=0;
  mcomp=ctx.createDynamicsCompressor();mcomp.threshold.value=-14;mcomp.ratio.value=3;mcomp.attack.value=.005;mcomp.release.value=.2;
  lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.08;
  clampSh=ctx.createWaveShaper();
  {const n=2048,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/(n-1)-1,a=Math.abs(x);c[i]=a<=.9?x:Math.sign(x)*(.9+.1*Math.tanh((a-.9)/.1));}clampSh.curve=c;}
  anM=ctx.createAnalyser();anM.fftSize=1024;
  pre.connect(masterG);masterG.connect(satDry);satSh.connect(satWet);satDry.connect(toneF);satWet.connect(toneF);
  toneF.connect(mcomp);mcomp.connect(lim);lim.connect(clampSh);lim.connect(anM);clampSh.connect(ctx.destination);scrInit();
  mixOut=G(1);fltM=ctx.createBiquadFilter();fltM.type='lowpass';fltM.frequency.value=20000;fltM.Q.value=.7;
  shaper=ctx.createWaveShaper();shaper.oversample='2x';setDrive(0);dstDry=G(1);dstWet=G(0);
  mixOut.connect(fltM);fltM.connect(dstDry);shaper.connect(dstWet);dstDry.connect(pre);dstWet.connect(pre);
  repIn=G(0);repDel=ctx.createDelay(1);repFb=G(0);repOut=G(0);
  repIn.connect(repDel);repDel.connect(repOut);repOut.connect(pre);repDel.connect(repFb);repFb.connect(repDel);
  /* delay */
  dlySum=G(1);dly=ctx.createDelay(2);dfb=G(.4);dflt=ctx.createBiquadFilter();dflt.type='lowpass';dflt.frequency.value=3200;
  dRet=G(.8);dlySum.connect(dly);dly.connect(dflt);dflt.connect(dfb);dfb.connect(dly);dflt.connect(dRet);dRet.connect(pre);
  /* reverb */
  revIn=G(1);revPre=ctx.createDelay(.5);conv=ctx.createConvolver();irSize=PERF.lite?Math.min(FXP.rev.size,1.1):FXP.rev.size;conv.buffer=makeIR(irSize);revTone=ctx.createBiquadFilter();revTone.type='lowpass';revTone.frequency.value=6000;
  revRet=G(.8);revIn.connect(revPre);conv.connect(revTone);revTone.connect(revRet);revRet.connect(pre);
  /* mod (chorus / flanger) */
  modIn=G(1);modDel=ctx.createDelay(.05);modFb=G(.2);modLfo=ctx.createOscillator();modLfo.type='sine';modDepth=G(.003);modRet=G(.7);
  modDel.connect(modFb);modFb.connect(modDel);modDel.connect(modRet);modRet.connect(pre);modLfo.connect(modDepth);modDepth.connect(modDel.delayTime);modLfo.start();
  /* distorsión como envío del mixer: ganancia → hp → shaper → tono → retorno */
  sdIn=G(1);sdHp=ctx.createBiquadFilter();sdHp.type='highpass';sdHp.frequency.value=90;sdSh=ctx.createWaveShaper();sdSh.oversample='2x';sdLp=ctx.createBiquadFilter();sdLp.type='lowpass';sdLp.frequency.value=5000;sdRet=G(.55);
  sdHp.connect(sdSh);sdSh.connect(sdLp);sdLp.connect(sdRet);sdRet.connect(pre);
  mDly=G(0);mRev=G(0);mixOut.connect(mDly);mDly.connect(dlySum);mixOut.connect(mRev);mRev.connect(revIn);
  CH.forEach((c,i)=>{
    const inp=G(1),vol=G(c.vol),pn=ctx.createStereoPanner(),an=ctx.createAnalyser(),ds=G(0),rs=G(0),ms=G(0),dx=G(0);an.fftSize=256;
    inp.connect(vol);vol.connect(pn);pn.connect(mixOut);vol.connect(an);vol.connect(ds);ds.connect(dlySum);vol.connect(rs);rs.connect(revIn);vol.connect(ms);ms.connect(modIn);vol.connect(dx);dx.connect(sdIn);   // envíos post-fader
    bus[i]={inp,vol,pn,an,ds,rs,ms,dx,buf:new Uint8Array(an.fftSize)};
  });
  /* VINTAGE: drive + rotor (leslie / trémolo / vibrato / ensamble) antes de su canal del mixer */
  vinIn=G(1);vinSh=ctx.createWaveShaper();vinSh.oversample='2x';vinPost=G(1);vinIn.connect(vinSh);vinSh.connect(vinPost);vinDrvL=-1;
  rotDry=G(1);rotWet=G(0);rotDel=ctx.createDelay(.03);rotDel.delayTime.value=.006;rotAmp=G(1);rotPan=ctx.createStereoPanner();
  rotLfo=ctx.createOscillator();rotLfo.frequency.value=.75;rotDD=G(0);rotDA=G(0);rotDP=G(0);
  rotLfo.connect(rotDD);rotDD.connect(rotDel.delayTime);rotLfo.connect(rotDA);rotDA.connect(rotAmp.gain);rotLfo.connect(rotDP);rotDP.connect(rotPan.pan);
  vinPost.connect(rotDry);vinPost.connect(rotDel);rotDel.connect(rotAmp);rotAmp.connect(rotPan);rotPan.connect(rotWet);
  rotDry.connect(bus[6].inp);rotWet.connect(bus[6].inp);rotLfo.start();
  applyFx();applyAll();updateRoutes();ensureKit();vinFx();
}
/* rutas condicionales: lo que está apagado no se procesa (convolver, chorus, shapers) */
let satOn=false,dstOn=false,revConn=false,modConn=false,revOffT=null,modOffT=null,dstOffT=null,padRev=false;
function setSat(on){if(!ctx||on===satOn)return;satOn=on;try{if(on)masterG.connect(satSh);else masterG.disconnect(satSh);}catch(e){}}
function setDst(on){if(!ctx)return;clearTimeout(dstOffT);if(on){if(!dstOn){dstOn=true;try{fltM.connect(shaper);}catch(e){}}}else if(dstOn){dstOffT=setTimeout(()=>{dstOn=false;try{fltM.disconnect(shaper);}catch(e){}},250);}}
function setRoute(on,conn,offT,connect,disconnect,hold){
  if(on){clearTimeout(offT.t);offT.t=null;if(!conn.v){conn.v=true;connect();}}
  else if(conn.v&&!offT.t){offT.t=setTimeout(()=>{offT.t=null;if(conn.v){conn.v=false;disconnect();}},hold);}
}
const RV={v:false},MD={v:false},SD={v:false},RVT={t:null},MDT={t:null},SDT={t:null};
function updateRoutes(){
  if(!ctx)return;revConn=RV.v;modConn=MD.v;
  setRoute(padRev||CH.some(c=>c.rev>.02),RV,RVT,()=>{try{revPre.connect(conv);}catch(e){}},()=>{try{revPre.disconnect(conv);}catch(e){}},(irSize+.6)*1000);
  setRoute(CH.some(c=>c.dst>.02),SD,SDT,()=>{try{sdIn.connect(sdHp);}catch(e){}},()=>{try{sdIn.disconnect(sdHp);}catch(e){}},500);
  setRoute(!PERF.lite&&CH.some(c=>c.mod>.02),MD,MDT,()=>{try{modIn.connect(modDel);}catch(e){}},()=>{try{modIn.disconnect(modDel);}catch(e){}},1500);
}
function restartAudio(){
  try{if(window.liveStop)liveStop(true);}catch(e){}
  const was=S.playing;if(S.playing)stop();if(CAP)capStop();sirHolds.clear();sirV=null;LIVE.clear();SMPL.voice.fill(null);bus.length=0;
  clearTimeout(RVT.t);clearTimeout(MDT.t);clearTimeout(SDT.t);clearTimeout(dstOffT);clearTimeout(repOffT);RV.v=false;MD.v=false;SD.v=false;RVT.t=MDT.t=SDT.t=null;lastDrive=-1;lastSd=-1;repOnFlag=false;
  const old=ctx;ctx=null;try{old&&old.close();}catch(e){}
  initAudio();if(was)play();
}
function applyCh(i){
  if(!ctx)return;const c=CH[i],b=bus[i],t=ctx.currentTime,solos=CH.some(x=>x.solo),aud=!c.mute&&(!solos||c.solo);
  b.inp.gain.setTargetAtTime(aud?1:0,t,.01);b.vol.gain.setTargetAtTime(c.vol,t,.02);b.pn.pan.setTargetAtTime(clamp(c.pan,-1,1),t,.02);
  b.ds.gain.setTargetAtTime(c.thr?1:c.dly*.8,t,.02);b.rs.gain.setTargetAtTime(c.rev*.8,t,.02);b.ms.gain.setTargetAtTime(c.mod*.8,t,.02);b.dx.gain.setTargetAtTime(c.dst*.9,t,.02);updateRoutes();
}
const applyAll=()=>{CH.forEach((_,i)=>applyCh(i));if(ctx)masterG.gain.setTargetAtTime(S.master,ctx.currentTime,.02);};

/* voces de synth: livianas (sin gains por voz); el LFO de una voz solo existe mientras su profundidad > 0 */
const PERF={lite:false,lat:'mid',lc:'off',lcMs:0};
try{Object.assign(PERF,JSON.parse(localStorage.getItem('musica_gb_perf')||'{}'));}catch(e){}
const maxVoices=()=>PERF.lite?8:16;
const LIVE=new Set();let BEND=0,MOD=0,bmDirty=false;   // BEND en cents, MOD 0..1
function lfoKill(v){if(!v.l)return;try{v.l.stop();}catch(e){}try{v.l.disconnect();v.lg.disconnect();}catch(e){}v.l=v.lg=null;}
function lfoBuild(v,t){
  const P=v.P,l=v.c.createOscillator(),lg=v.c.createGain();l.type=P.lfoS||'sine';l.frequency.value=P.sync?S.bpm/60*P.sync:P.lfoR;lg.gain.value=0;l.connect(lg);
  if(P.lfoT===0)lg.connect(v.fl.detune);
  else if(P.lfoT===1){v.o1.forEach(o=>lg.connect(o.detune));v.o2.forEach(o=>lg.connect(o.detune));v.os.forEach(o=>lg.connect(o.detune));}
  else lg.connect(v.a.gain);
  l.start(t);v.l=l;v.lg=lg;v.lT=P.lfoT;
}
function lfoApply(v,tt){
  if(v.done)return;const P=v.P,d=Math.min(1,P.lfoD+Math.max(MOD,v.xmod||0)*(1-P.lfoD)),t=tt||v.c.currentTime;
  if(d<.02||(v.lite&&!P.sync)){lfoKill(v);return;}
  if(v.l&&v.lT!==P.lfoT)lfoKill(v);
  if(!v.l)lfoBuild(v,t);
  v.lg.gain.setTargetAtTime(P.lfoT===1?d*200*(P.vk||1):P.lfoT===0?d*(P.sync?2200:1500):d*.5*v.pk,t,.02);
}
function liveSet(P,key){   // cambia un parámetro sobre las notas que ya suenan
  if(!ctx)return;const t=ctx.currentTime;
  LIVE.forEach(v=>{if(v.P!==P||v.done)return;
    if(key==='w1')v.o1.forEach(o=>o.type=P.w1);
    else if(key==='det')v.o2.forEach(o=>o.detune.setTargetAtTime(P.det+BEND+(v.xb||0),t,.015));
    else if(key==='sub'){if(v.hasSub)v.gs.gain.setTargetAtTime(P.sub*2,t,.02);}
    else if(key==='res')v.fl.Q.setTargetAtTime(P.res,t,.02);
    else if(key==='cut'){v.base=v.cutF?v.cutF(P.cut):120*Math.pow(60,P.cut);(v.fls||[v.fl]).forEach((F,i)=>F.frequency.setTargetAtTime(v.base*(i?1.6:1),t,.03));lfoApply(v);}
    else if(key==='db'){if(v.ow)v.ow.forEach(o=>o.setPeriodicWave(orgWave(P.db)));}
    else if(key==='lfoR'||key==='sync'){if(v.l)v.l.frequency.setTargetAtTime(P.sync?S.bpm/60*P.sync:P.lfoR,t,.02);}
    else if(key==='lfoS'){if(v.l)v.l.type=P.lfoS||'sine';}
    else if(key==='lfoD'||key==='lfoT')lfoApply(v);
  });
}
/* grabar el movimiento: muestras [tiempo, vx, vy] mientras la tecla está apretada → XYQ por paso desde que empezó la nota */
function xyRec(targets,smp,t0,held){
  if(!targets||!targets.length)return;let M=null;
  if(smp&&smp.length){const dt=sd()/XYQ,n=clamp(Math.ceil(held/dt),1,MAXS*XYQ),x=[],y=[];let j=0,cx=0,cy=0;
    for(let i=0;i<n;i++){const t=t0+i*dt;while(j<smp.length&&smp[j][0]<=t){cx=smp[j][1];cy=smp[j][2];j++;}x.push(Math.round(cx*100));y.push(Math.round(cy*100));}
    if(x.some(v=>v)||y.some(v=>v))M={x,y};}
  targets.forEach(o=>{if(XYR[o.r])XYR[o.r][o.st]=M;});dirty=true;queueSave();}
/* reproducir el movimiento: se programa en el tiempo del audio sobre la voz que dispara el paso */
function xyAuto(vs,cfg,M,t0,dt){
  const n=Math.min(M.x.length,M.y.length),A=[];
  for(let i=0;i<n;i++){const a={pitch:0,cut:0,res:0,mod:0};if(cfg.x!=='none')a[cfg.x]+=M.x[i]/100;if(cfg.y!=='none')a[cfg.y]+=M.y[i]/100;A.push(a);}
  const has=k=>cfg.x===k||cfg.y===k,tau=dt/3;
  vs.forEach(v=>{if(!v)return;const P=v.P;
    A.forEach((a,i)=>{const t=t0+i*dt;
      if(has('pitch')){const xb=clamp(a.pitch,-1,1)*(cfg.pr||2)*100;v.o1.forEach(o=>o.detune.setTargetAtTime((o._d||0)+BEND+xb,t,tau));v.o2.forEach(o=>o.detune.setTargetAtTime(P.det+BEND+xb,t,tau));v.os.forEach(o=>o.detune.setTargetAtTime(BEND+xb,t,tau));}
      if(has('cut'))(v.fls||[v.fl]).forEach(F=>F.detune.setTargetAtTime(clamp(a.cut,-1,1)*2400,t,tau));
      if(has('res'))v.fl.Q.setTargetAtTime(clamp(P.res+clamp(a.res,-1,1)*14,.5,30),t,tau*1.5);});
    if(has('mod')&&A.some(a=>a.mod>.02)&&!(v.lite&&!P.sync)){if(!v.l)lfoBuild(v,t0);
      A.forEach((a,i)=>{const d=Math.min(1,P.lfoD+Math.max(MOD,clamp(a.mod,0,1))*(1-P.lfoD));v.lg.gain.setTargetAtTime(P.lfoT===1?d*200*(P.vk||1):P.lfoT===0?d*(P.sync?2200:1500):d*.5*v.pk,t0+i*dt,tau);});}
  });}
const xyPlay=(r,s,vs,mode,t)=>{const M=XYR[r]&&XYR[r][s];if(M&&vs)try{xyAuto(vs,S.xy[mode]||S.xy.syn0,M,t,sd()/XYQ);}catch(e){}};
/* tocar y arrastrar sobre una tecla: cada eje modula esa nota (PITCH, FILTRO, RESO, MOD o nada) */
function xyApply(vs,cfg,vx,vy){
  if(!ctx||!vs)return;const t=ctx.currentTime,acc={pitch:0,cut:0,res:0,mod:0};
  if(cfg.x!=='none')acc[cfg.x]+=vx;if(cfg.y!=='none')acc[cfg.y]+=vy;
  vs.forEach(v=>{if(!v||v.done)return;
    const xb=clamp(acc.pitch,-1,1)*(cfg.pr||2)*100;if(xb!==(v.xb||0)){v.xb=xb;v.o1.forEach(o=>o.detune.setTargetAtTime((o._d||0)+BEND+xb,t,.012));v.o2.forEach(o=>o.detune.setTargetAtTime(v.P.det+BEND+xb,t,.012));v.os.forEach(o=>o.detune.setTargetAtTime(BEND+xb,t,.012));}
    (v.fls||[v.fl]).forEach(F=>F.detune.setTargetAtTime(clamp(acc.cut,-1,1)*2400,t,.015));
    v.fl.Q.setTargetAtTime(clamp(v.P.res+clamp(acc.res,-1,1)*14,.5,30),t,.02);
    const xm=clamp(acc.mod,0,1);if(xm!==(v.xmod||0)){v.xmod=xm;lfoApply(v,t);}
  });
}
function bmFlush(){   // pitch bend + mod wheel sobre todas las voces vivas
  if(!bmDirty||!ctx)return;bmDirty=false;const t=ctx.currentTime;
  LIVE.forEach(v=>{if(v.done)return;const xb=v.xb||0;v.o1.forEach(o=>o.detune.setTargetAtTime((o._d||0)+BEND+xb,t,.02));v.o2.forEach(o=>o.detune.setTargetAtTime(v.P.det+BEND+xb,t,.02));v.os.forEach(o=>o.detune.setTargetAtTime(BEND+xb,t,.02));lfoApply(v,t);});
}
/* una voz = una o varias notas (acorde) que comparten filtro, envolvente y LFO: 1 filtro por acorde en vez de 1 por nota */
/* soltar una nota: congela la envolvente donde esté (cancelScheduledValues borraba la rampa de ataque y la nota corta quedaba muda) */
const gHold=(p,tt)=>{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(tt);else p.cancelScheduledValues(tt);};
function mkVoice(P,fq,t,vel,dest,dur){
  const c=ctx,fs=Array.isArray(fq)?fq:[fq];
  if(LIVE.size>=maxVoices()){const old=LIVE.values().next().value;LIVE.delete(old);try{old.stop(c.currentTime);}catch(e){}}   // límite de polifonía: roba la voz más vieja
  const lite=PERF.lite,hasSub=P.sub>.001,a=G(0),fl=c.createBiquadFilter(),gs=G(P.sub*2),pk=vel*P.g*.5/(1+Math.max(0,P.res-4)*.1),o1=[],o2=[],os=[];
  fl.type='lowpass';fl.Q.value=P.res;
  const base=120*Math.pow(60,P.cut),peak=Math.min(16000,base*(1+P.env*8));
  fl.frequency.setValueAtTime(peak,t);fl.frequency.setTargetAtTime(base,t+.005,P.dec*.6+.01);
  a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(pk,t+P.atk);a.gain.setTargetAtTime(pk*P.sus,t+P.atk,P.dec/3+.005);
  fs.forEach(f=>{
    const x=c.createOscillator();x.type=P.w1;x.frequency.value=f;x.detune.value=BEND;x.connect(fl);x.start(t);o1.push(x);
    if(!lite){const y=c.createOscillator();y.type=P.w2;y.frequency.value=f;y.detune.value=P.det+BEND;y.connect(fl);y.start(t);o2.push(y);}
    if(hasSub){const s=c.createOscillator();s.type='sine';s.frequency.value=f/2;s.detune.value=BEND;s.connect(gs);s.start(t);os.push(s);}
  });
  if(hasSub)gs.connect(fl);
  fl.connect(a);a.connect(dest);
  const v={c,P,o1,o2,os,gs,fl,a,base,pk,l:null,lg:null,lite,hasSub,done:false,t0:t,tr:0};
  lfoApply(v,t);
  LIVE.add(v);
  v.stop=function(tt){
    if(v.done)return;v.done=true;tt=Math.max(tt===undefined?0:tt,c.currentTime);v.tr=tt;
    gHold(a.gain,tt);a.gain.setTargetAtTime(0,tt,P.rel/3+.005);
    const e=tt+P.rel*1.6+.1;[...o1,...o2,...os,v.l].forEach(o=>{if(o)try{o.stop(e);}catch(x){}});
    setTimeout(()=>LIVE.delete(v),Math.max(0,(e-c.currentTime+.2))*1000);
  };
  if(dur)v.stop(t+dur);
  return v;
}
function chordPlay(deg,sev,t,dest,dur){return [mkVoice(S.chdPar,chordMidi(deg,sev).map(mtof),t,.55,dest,dur)];}

/* ---------------- VINTAGE: motor ---------------- */
const ORGH=[1,3,2,4,6,8,10,12,16];   // drawbars 16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1' = armónicos de f/2 → una sola onda por nota
let OWC={c:null,m:{}};
function orgWave(db){if(OWC.c!==ctx)OWC={c:ctx,m:{}};const k=db.join('');if(OWC.m[k])return OWC.m[k];
  const re=new Float32Array(17),im=new Float32Array(17);db.forEach((v,i)=>{if(v>0)im[ORGH[i]]+=Math.pow(10,(v-8)*3/20);});
  if(!db.some(v=>v>0))im[2]=1;return OWC.m[k]=ctx.createPeriodicWave(re,im);}
const vinCut=x=>120*Math.pow(110,clamp(x,0,1));
function vinVoice(P,fq,t,vel,dest,dur){
  const c=ctx,fs=Array.isArray(fq)?fq:[fq],lite=PERF.lite;
  if(LIVE.size>=maxVoices()){const old=LIVE.values().next().value;LIVE.delete(old);try{old.stop(c.currentTime);}catch(e){}}
  const a=G(0),fl=c.createBiquadFilter(),o1=[],ow=[],tmp=[],n=fs.length,pk=vel*P.g*.5/(1+(n-1)*.3);
  fl.type='lowpass';fl.Q.value=P.res;const base=vinCut(P.cut);let fls=[fl];
  const env=(g,v0,t0,tau,fl0)=>{g.gain.setValueAtTime(v0,t0);g.gain.setTargetAtTime(fl0||0,t0+.001,tau);};
  const osc=(type,f,det,to)=>{const o=c.createOscillator();if(typeof type==='string')o.type=type;else o.setPeriodicWave(type);o.frequency.value=f;o._d=det||0;o.detune.value=o._d+BEND;o.connect(to);o.start(t);o1.push(o);return o;};
  if(P.e==='org'){
    fl.frequency.value=base;const w=orgWave(P.db);
    fs.forEach(f=>{ow.push(osc(w,f/2,0,fl));
      if(P.perc){const pg=G(0);env(pg,.9,t,.11);osc('sine',f*P.perc,0,pg);pg.connect(fl);}});
    if(P.click>.01){const s=noiseSrc(t,.03),bp=c.createBiquadFilter(),cg=G(0);bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=.9;env(cg,.5*P.click,t,.0035);s.connect(bp);bp.connect(cg);cg.connect(a);tmp.push(s);}
  }else if(P.e==='ep'){
    fl.frequency.value=base;
    fs.forEach(f=>{const kf=clamp(440/f,.35,2.5),ix=P.ix*f*(.5+vel*.6),mg=G(0),car=osc('sine',f,0,fl);
      env(mg,ix,t,.25*Math.sqrt(kf)+.05,ix*.12);osc('sine',f,0,mg);mg.connect(car.frequency);
      if(P.bell>.01&&!lite){const bg=G(0);env(bg,P.bell*f*4*vel,t,.018);osc('sine',f*14,0,bg);bg.connect(car.frequency);}});
  }else if(P.e==='ana'){
    const fl2=c.createBiquadFilter();fl2.type='lowpass';fl2.Q.value=.7;fls=[fl,fl2];
    const peak=Math.min(16000,base*(1+P.env*9)),fa=P.fatk||0;
    fls.forEach((F,i)=>{const b=i?base*1.6:base,p=i?Math.min(18000,peak*1.6):peak;F.frequency.setValueAtTime(fa?b:p,t);if(fa)F.frequency.linearRampToValueAtTime(p,t+fa);F.frequency.setTargetAtTime(b,t+fa+.004,P.dec*.5+.01);});
    fs.forEach(f=>{(lite?[0,2]:[0,1,2]).forEach(i=>{const g=G(P.mx[i]*.55);osc(P.w[i],f,P.dt[i],g);g.connect(fl);});});
    fl.connect(fl2);
  }else if(P.e==='clav'){
    const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=220;hp.connect(fl);
    const peak=Math.min(14000,base*(1+P.env*7));fl.frequency.setValueAtTime(peak,t);fl.frequency.setTargetAtTime(base,t+.002,.06);
    fs.forEach(f=>{osc('square',f,0,hp);if(!lite)osc('sawtooth',f,5,hp);});
  }else{   // cuerdas
    fl.frequency.value=base;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=160;hp.connect(fl);
    fs.forEach(f=>{(lite?[-7,7]:[-9,0,9]).forEach(dc=>{const g=G(.45);osc('sawtooth',f,dc,g);g.connect(hp);});});
  }
  fls[fls.length-1].connect(a);a.connect(dest);
  a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(pk,t+Math.max(.002,P.atk));
  if(P.sus<1)a.gain.setTargetAtTime(pk*P.sus,t+Math.max(.002,P.atk),(P.e==='ep'?P.dec*clamp(Math.sqrt(440/fs[0]),.5,1.8):P.dec)/3+.005);
  const v={c,P,o1,o2:[],os:[],ow,gs:null,fl,fls,a,base,pk,l:null,lg:null,lite,hasSub:false,done:false,t0:t,tr:0,cutF:vinCut,vin:true};
  lfoApply(v,t);LIVE.add(v);
  v.stop=function(tt){
    if(v.done)return;v.done=true;tt=Math.max(tt===undefined?0:tt,c.currentTime);v.tr=tt;
    gHold(a.gain,tt);a.gain.setTargetAtTime(0,tt,P.rel/3+.004);
    const e=tt+P.rel*1.6+.1;[...o1,...tmp,v.l].forEach(o=>{if(o)try{o.stop(e);}catch(x){}});
    setTimeout(()=>LIVE.delete(v),Math.max(0,(e-c.currentTime+.2))*1000);};
  if(dur)v.stop(t+dur);
  return v;
}
function vinNotes(deg,ch){const b=VBASE+(S.vinPar.oct||0),ix=ch?[deg,deg+2,deg+4]:[deg];return ix.map(i=>mtof(scaleNote(i,b)));}
function vinPlay(deg,ch,t,dur,vel){if(!ctx)return null;return vinVoice(S.vinPar,vinNotes(deg,ch),t,vel||.85,vinIn||bus[6].inp,dur);}
/* rotor del canal: [velocidad Hz, prof. delay (doppler), prof. volumen, prof. paneo, seco, rotor] */
const ROTM={off:[.5,0,0,0,1,0],slow:[.75,.0009,.22,.55,.5,.75],fast:[6.4,.00035,.28,.65,.5,.75],trem:[4.4,0,.55,.8,0,1],vib:[6.6,.0011,0,0,0,1],ens:[.6,.003,0,.35,.75,.65]};
let vinDrvL=-1;
function vinFx(){if(!ctx||!rotLfo)return;const P=S.vinPar,t=ctx.currentTime,m=ROTM[P.fx]||ROTM.off,spin=P.fx==='slow'||P.fx==='fast';
  rotLfo.frequency.setTargetAtTime(m[0],t,spin?.8:.03);rotDD.gain.setTargetAtTime(m[1],t,.05);rotDA.gain.setTargetAtTime(m[2],t,.05);rotDP.gain.setTargetAtTime(m[3],t,.05);
  rotDry.gain.setTargetAtTime(m[4],t,.05);rotWet.gain.setTargetAtTime(m[5],t,.05);
  const d=Math.round((P.drv||0)*50)/50;if(d!==vinDrvL){vinDrvL=d;const n=1024,cv=new Float32Array(n),k=1+d*9;for(let i=0;i<n;i++){const x=i*2/(n-1)-1;cv[i]=d<.01?x:Math.tanh(x*k)/Math.tanh(k)*(1-d*.25);}vinSh.curve=cv;}}

/* drums */
function noiseSrc(t,dur){const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.start(t);s.stop(t+dur);return s;}
function nz(t,dur,type,freq,q,peak,dec,d){const s=noiseSrc(t,dur),f=ctx.createBiquadFilter(),g=G(0);f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(.001,t+dec);s.connect(f);f.connect(g);g.connect(d);}
function tn(t,type,f0,f1,peak,dec,d){const o=ctx.createOscillator(),g=G(0);o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dec*.6);g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(.001,t+dec);o.connect(g);g.connect(d);o.start(t);o.stop(t+dec+.05);}
const KITS=[
 {n:'CLÁSICO',kf:160,ke:42,kd:.45,kc:.25,sf:1900,sd:.2,sb:.5,hf:7500,hd:1,cf:1300,cd:1,tp:1,td:1,rf:480,wf:560},
 {n:'909',kf:200,ke:48,kd:.32,kc:.5,sf:2300,sd:.16,sb:.35,hf:9000,hd:.8,cf:1500,cd:.9,tp:1.25,td:.8,rf:560,wf:620},
 {n:'DUB',kf:120,ke:36,kd:.7,kc:.1,sf:1400,sd:.3,sb:.7,hf:5500,hd:1.3,cf:1100,cd:1.3,tp:.8,td:1.3,rf:420,wf:480},
 {n:'LOFI',kf:130,ke:50,kd:.22,kc:.05,sf:1100,sd:.14,sb:.6,hf:4500,hd:.7,cf:900,cd:.8,tp:.85,td:.8,rf:380,wf:440},
 {n:'TRAP',kf:110,ke:32,kd:1.1,kc:.15,sf:2600,sd:.12,sb:.3,hf:9500,hd:.5,cf:1700,cd:.7,tp:1.1,td:1,rf:600,wf:700},
 {n:'808 LARGO',kf:140,ke:38,kd:.9,kc:.2,sf:1700,sd:.24,sb:.45,hf:8000,hd:1.1,cf:1300,cd:1.1,tp:.9,td:1.2,rf:500,wf:580},
 {n:'ELECTRO',kf:230,ke:60,kd:.2,kc:.6,sf:3000,sd:.1,sb:.25,hf:10500,hd:.6,cf:1800,cd:.7,tp:1.5,td:.7,rf:700,wf:760},
 {n:'SECO',kf:105,ke:55,kd:.18,kc:.4,sf:1300,sd:.22,sb:.8,hf:6500,hd:.9,cf:1000,cd:.9,tp:.7,td:1.1,rf:400,wf:450},
 {n:'ACÚSTICA',kf:95,ke:55,kd:.38,kc:.55,sf:1500,sd:.19,sb:.9,hf:6800,hd:1,cf:1200,cd:1,tp:.75,td:1.1,rf:430,wf:500,room:.3},
 {n:'SALA GRANDE',kf:88,ke:50,kd:.45,kc:.5,sf:1400,sd:.26,sb:.95,hf:6200,hd:1.2,cf:1100,cd:1.2,tp:.7,td:1.25,rf:410,wf:480,room:.75}];
const K=()=>KITS[S.kit]||KITS[0];
const DRUMFN=[
 (t,v,d)=>{const k=K();tn(t,'sine',k.kf,k.ke,v,k.kd,d);nz(t,.03,'highpass',2000,.7,k.kc*v,.02,d);},
 (t,v,d)=>{const k=K();nz(t,k.sd+.08,'bandpass',k.sf,.8,.8*v,k.sd,d);tn(t,'triangle',200,150,k.sb*v,.12,d);},
 (t,v,d)=>{const k=K();nz(t,.1,'highpass',k.hf,.7,.45*v,.05*k.hd,d);},
 (t,v,d)=>{const k=K();nz(t,.5,'highpass',k.hf*.93,.7,.4*v,.32*k.hd,d);},
 (t,v,d)=>{const k=K();[0,.012,.024].forEach(o=>nz(t+o,.06,'bandpass',k.cf,1.2,.7*v,.05,d));nz(t+.036,.3,'bandpass',k.cf,1.2,.6*v,.18*k.cd,d);},
 (t,v,d)=>{const k=K();tn(t,'sine',190*k.tp,95*k.tp,.8*v,.32*k.td,d);},
 (t,v,d)=>{const k=K();tn(t,'square',k.rf,k.rf*.79,.35*v,.05,d);nz(t,.05,'highpass',3000,.7,.3*v,.03,d);},
 (t,v,d)=>{const k=K();tn(t,'square',k.wf,k.wf,.3*v,.3,d);tn(t,'square',k.wf*1.49,k.wf*1.49,.3*v,.3,d);}];
/* patrones de batería de fábrica: 8 renglones (KICK SNARE CHAT OHAT CLAP TOM RIM COW) × 16 pasos */
const DPRE=[
 ['ROCK',['x.......x.x.....','....x.......x...','x.x.x.x.x.x.x.x.']],
 ['HOUSE',['x...x...x...x...',null,null,'..x...x...x...x.','....x.......x...']],
 ['HIPHOP',['x.....x..x.x....','....x.......x...','x.x.x.x.x.x.x.xx']],
 ['REGGAE',['........x.......','........x.......','x.x.x.x.x.x.x.x.',null,null,null,'..x...x...x...x.']],
 ['TECHNO',['x...x...x...x...',null,'x.x.x.x.x.x.x.x.','.x...x...x...x..','....x.......x...']],
 ['TRAP',['x.....x....x....','........x.......','x.x.x.x.x.x.xxxx','......x.........','........x.......']],
 ['BREAK',['x.xx......x.....','....x..x.x..x..x','x.x.x.x.x.x.x.x.']],
 ['DEMBOW',['x...x...x...x...','...x..x....x..x.','x.x.x.x.x.x.x.x.']],
 ['VACÍO',[]]];
function drumPreset(i){
  const P=DPRE[i];if(!P)return;takeUndo();
  for(let r=0;r<8;r++){const s=P[1][r];LEN[r]=STEPS;for(let k=0;k<MAXS;k++)pat[r][k]=s&&s[k%16]==='x'?1:0;}
  dirty=true;queueSave();
}

/* batería: cada golpe se pre-renderiza una vez por kit (OfflineAudioContext) y se toca como buffer.
   Suena más real (varias capas, platillos metálicos, sala) y casi no gasta CPU. Mientras se renderiza usa la síntesis en vivo. */
const KB={},KBP={},KH={},KQ={},DLV=[1,.95,.55,.5,.85,.9,.7,.55];let OHV=null,KVER=0;
/* edición por golpe (encima del kit): nivel, afinación, decaimiento, tono, drive, paneo.
   DECAIMIENTO, TONO y DRIVE se "hornean" re-renderizando ese golpe; NIVEL, AFINACIÓN y PANEO se aplican al tocar (instantáneo). */
const DKD={lvl:1,tune:0,dec:1,tone:.5,drv:0,pan:0,hit:.5,snap:.5};
S.dk=DR.map(()=>Object.assign({},DKD));
const dkE=i=>S.dk[i]||DKD,dkKey=i=>{const e=dkE(i);return [e.dec,e.tone,e.drv,e.hit??.5,e.snap??.5].map(v=>(+v).toFixed(2)).join('|');};
function renderDrum(i,k,sr,e){
  e=e||DKD;const DS=clamp(+e.dec||1,.2,4);
  /* GOLPE: transientes cortos ×0..2 · CUERPO↔RUIDO: balance entre lo tonal (osciladores) y el ruido */
  const sn=clamp(e.snap??.5,0,1),HM=clamp(e.hit??.5,0,1)*2,BM=sn>.5?1-(sn-.5)*1.7:1,NM=sn<.5?1-(.5-sn)*1.7:1;
  const len=Math.max(.08,[Math.max(.45,k.kd+.25),k.sd+.5,.3,1.0,k.cd*.3+.45,k.td*.45+.25,.25,.5][i]*DS)+(k.room?.4:0);
  const o=new OfflineAudioContext(1,Math.ceil(sr*len),sr),N=o.length;
  const G=v=>{const g=o.createGain();g.gain.value=v;return g;};
  const nb=o.createBuffer(1,N,sr),nd=nb.getChannelData(0);for(let n=0;n<N;n++)nd[n]=Math.random()*2-1;
  const sat=o.createWaveShaper(),dk=1.4+clamp(+e.drv||0,0,1)*9;{const n=1024,c=new Float32Array(n);for(let q=0;q<n;q++){const x=q*2/(n-1)-1;c[q]=Math.tanh(x*dk)/Math.tanh(dk);}sat.curve=c;}
  /* TONO: oscuro (pasabajos) ↔ brillante (realce de agudos, menos graves) */
  let out=o.destination;const tv=clamp(+e.tone,0,1);
  if(tv<.48){const lp=o.createBiquadFilter();lp.type='lowpass';lp.frequency.value=380*Math.pow(52,tv*2);lp.Q.value=.6;lp.connect(out);out=lp;}
  else if(tv>.52){const a=(tv-.5)*2,hs=o.createBiquadFilter(),ls=o.createBiquadFilter();hs.type='highshelf';hs.frequency.value=3200;hs.gain.value=a*14;ls.type='lowshelf';ls.frequency.value=180;ls.gain.value=-a*8;hs.connect(ls);ls.connect(out);out=hs;}
  const dry=G(1);dry.connect(sat);sat.connect(out);
  if(k.room&&i!==2&&i!==3){const cv=o.createConvolver(),L=Math.floor(sr*.4),ir=o.createBuffer(1,L,sr),d=ir.getChannelData(0);for(let n=0;n<L;n++)d[n]=(Math.random()*2-1)*Math.pow(1-n/L,2.6);cv.buffer=ir;const w=G(k.room*(i===0?.35:1));dry.connect(cv);cv.connect(w);w.connect(out);}
  const env=(g,t,pk,dec,at)=>{at=at||.001;dec*=DS;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+at);g.gain.exponentialRampToValueAtTime(.0001,t+at+dec);};
  const noise=(t,type,f,q,pk,dec,at)=>{pk*=NM*(dec<=.026?HM:1);const s=o.createBufferSource();s.buffer=nb;const fl=o.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=G(0);env(g,t,pk,dec,at);s.connect(fl);fl.connect(g);g.connect(dry);s.start(t);};
  const osc=(t,type,f0,f1,tc,pk,dec,at)=>{pk*=BM;const x=o.createOscillator();x.type=type;x.frequency.setValueAtTime(f0,t);if(f1!==f0)x.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+tc);const g=G(0);env(g,t,pk,dec,at);x.connect(g);g.connect(dry);x.start(t);x.stop(t+dec*DS+.05);};
  const metal=(t,pk,dec,hp,at)=>{pk*=BM;const g=G(0),bp=o.createBiquadFilter(),hf=o.createBiquadFilter();bp.type='bandpass';bp.frequency.value=10200;bp.Q.value=.7;hf.type='highpass';hf.frequency.value=hp;env(g,t,pk,dec,at);
    [2,3,4.16,5.43,6.79,8.21].forEach(r=>{const x=o.createOscillator();x.type='square';x.frequency.value=40*r*(k.hf/7500>1.1?1.12:1);const s=G(.17);x.connect(s);s.connect(bp);x.start(t);x.stop(t+dec*DS+.05);});
    bp.connect(hf);hf.connect(g);g.connect(dry);};
  if(i===0){   // bombo: barrido de tono + cuerpo + golpe de pedal + click
    const x=o.createOscillator();x.type='sine';x.frequency.setValueAtTime(k.kf,0);x.frequency.exponentialRampToValueAtTime(k.ke*1.7,.018);x.frequency.exponentialRampToValueAtTime(k.ke,.14);const g=G(0);env(g,0,BM,k.kd,.002);x.connect(g);g.connect(dry);x.start(0);x.stop(k.kd*DS+.1);
    osc(0,'triangle',k.ke*2.4,k.ke*1.9,.05,.22,k.kd*.3,.002);noise(0,'lowpass',240,.7,.55,.045,.002);noise(0,'highpass',2600,.7,k.kc*.55,.012,.0005);
  }else if(i===1){   // caja: dos modos de parche + ruido de bordonas + transiente
    osc(0,'triangle',190,168,.08,k.sb*.7,.12,.001);osc(0,'sine',335,300,.06,k.sb*.34,.075,.001);
    noise(0,'bandpass',k.sf,.9,.85,k.sd,.001);noise(.003,'highpass',5200,.5,.34,k.sd*1.25,.002);noise(0,'bandpass',3600,1,.6,.012,.0005);
  }else if(i===2){   // hi-hat cerrado (metálico)
    metal(0,.8,.05*k.hd,k.hf*.85,.0008);metal(.012,.3,.11*k.hd,k.hf*.85,.002);noise(0,'highpass',k.hf,.6,.3,.06*k.hd,.001);
  }else if(i===3){   // hi-hat abierto
    metal(0,.75,.42*k.hd,k.hf*.8,.001);noise(0,'highpass',k.hf*.9,.6,.28,.36*k.hd,.002);
  }else if(i===4){   // palmas: ráfagas + cola
    [0,.011,.023,.035].forEach(d=>noise(d,'bandpass',k.cf,1.6,.75,.012,.0006));noise(.04,'bandpass',k.cf*.95,1.2,.58,.2*k.cd,.002);
  }else if(i===5){   // tom
    osc(0,'sine',190*k.tp,105*k.tp,.1,.9,.3*k.td,.002);osc(0,'triangle',380*k.tp,230*k.tp,.08,.14,.12,.002);noise(0,'bandpass',1800,1,.25,.02,.0005);
  }else if(i===6){   // aro (rim)
    osc(0,'triangle',k.rf,k.rf*.8,.02,.5,.035,.0005);osc(0,'sine',1750,1700,.01,.3,.03,.0005);noise(0,'highpass',3500,.7,.35,.02,.0005);
  }else{   // cencerro
    const g=G(0),bp=o.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=2.5;env(g,0,.6*BM,.3,.001);
    [k.wf,k.wf*1.5].forEach(f=>{const x=o.createOscillator();x.type='square';x.frequency.value=f;x.connect(bp);x.start(0);x.stop(.1+.3*DS);});bp.connect(g);g.connect(dry);
  }
  return o.startRendering().then(b=>{const d=b.getChannelData(0);let pk=0;for(let n=0;n<d.length;n++)pk=Math.max(pk,Math.abs(d[n]));if(pk>0){const m=.95/pk;for(let n=0;n<d.length;n++)d[n]*=m;}return b;});
}
function renderKit(idx){
  if(!ctx||KBP[idx]||typeof OfflineAudioContext==='undefined')return;KBP[idx]=true;const k=KITS[idx],sr=ctx.sampleRate,h=DR.map((_,i)=>dkKey(i));
  Promise.all(DRUMFN.map((_,i)=>renderDrum(i,k,sr,Object.assign({},dkE(i))))).then(a=>{KB[idx]=a;KH[idx]=h;KVER++;}).catch(()=>{KBP[idx]=false;});
}
/* re-renderiza un golpe si su edición cambió (la última pedida gana) */
function drumRe(i,idx){
  idx=idx===undefined?S.kit:idx;if(!ctx||!KB[idx]||!KH[idx])return Promise.resolve(false);const h=dkKey(i),Q=KQ[idx]=KQ[idx]||[];
  if(KH[idx][i]===h)return Promise.resolve(false);if(Q[i]===h)return Q['p'+i];Q[i]=h;
  return Q['p'+i]=renderDrum(i,KITS[idx],ctx.sampleRate,Object.assign({},dkE(i))).then(b=>{if(Q[i]!==h)return false;KB[idx][i]=b;KH[idx][i]=h;Q[i]=null;KVER++;return true;}).catch(()=>{Q[i]=null;return false;});
}
const ensureKit=()=>{if(!ctx)return;if(!KBP[S.kit]){renderKit(S.kit);return;}if(KH[S.kit])for(let i=0;i<8;i++)if(KH[S.kit][i]!==dkKey(i))drumRe(i);};
function drumBuf(i,t,v,d){
  const B=KB[S.kit];if(!(B&&B[i]))return false;const e=dkE(i);
  const s=ctx.createBufferSource(),g=G(v*DLV[i]*(e.lvl??1));s.buffer=B[i];s.detune.value=(e.tune||0)*100+((i===1||i===2||i===3)?(Math.random()-.5)*28:0);s.connect(g);
  if(Math.abs(e.pan||0)>.02&&ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=clamp(e.pan,-1,1);g.connect(p);p.connect(d);s.onended=()=>{try{p.disconnect();}catch(x){}};}else g.connect(d);
  if(i===2&&OHV){try{OHV.gain.cancelScheduledValues(t);OHV.gain.setTargetAtTime(0,t,.006);}catch(e){}OHV=null;}   // el cerrado corta al abierto
  if(i===3)OHV=g;
  s.start(t);return true;
}
const DHIT=new Float64Array(8).fill(-9);
const drumPlay=(i,t,v)=>{DHIT[i]=t;ensureKit();if(!drumBuf(i,t,v,bus[0].inp))DRUMFN[i](t,v*(dkE(i).lvl??1),bus[0].inp);};
function click(t,acc){const o=ctx.createOscillator(),g=G(0);o.type='square';o.frequency.value=acc?1600:1000;g.gain.setValueAtTime(.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.03);o.connect(g);g.connect(pre);o.start(t);o.stop(t+.04);}

/* sirena */
const sirHolds=new Set(),SIR={pm:1,rm:1};let sirV=null;
function sirStart(){
  if(sirV||!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),l=ctx.createOscillator(),lg=G(260*SIR.pm),f=ctx.createBiquadFilter(),a=G(0);
  o.type='square';l.type='triangle';f.type='lowpass';f.frequency.value=3500;f.Q.value=3;o.frequency.value=520*SIR.pm;l.frequency.value=1.4*SIR.rm;
  l.connect(lg);lg.connect(o.frequency);o.connect(f);f.connect(a);a.connect(bus[4].inp);
  a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(.35,t+.02);o.start(t);l.start(t);sirV={o,l,lg,a};
}
function sirStop(){if(!sirV)return;const{o,l,a}=sirV,t=ctx.currentTime;a.gain.cancelScheduledValues(t);a.gain.setTargetAtTime(0,t,.15);o.stop(t+1);l.stop(t+1);sirV=null;}
function sirLive(){if(!sirV)return;const t=ctx.currentTime;sirV.o.frequency.setTargetAtTime(520*SIR.pm,t,.03);sirV.l.frequency.setTargetAtTime(1.4*SIR.rm,t,.03);sirV.lg.gain.setTargetAtTime(260*SIR.pm,t,.03);}
function sirHold(k,on){
  initAudio();if(on)sirHolds.add(k);else sirHolds.delete(k);
  if(sirHolds.size&&!sirV)sirStart();else if(!sirHolds.size&&sirV)sirStop();
  $('#bSir').classList.toggle('on',!!sirHolds.size);$('#bLatch').classList.toggle('on',sirHolds.has('latch'));$('#sirPad').classList.toggle('dn',sirHolds.has('pad'));
}

/* multi-FX del master (pad XY) */
let repOnFlag=false,repConn=false,repOffT=null;
function repLen(x){return 60/S.bpm*[1,.5,.25,.125][Math.min(3,Math.floor(x*4))];}
function padDuck(v,t){if(dstDry)dstDry.gain.setTargetAtTime(v,t,.03);}   // baja un poco el seco para que el delay/reverb del pad se note
function mfxOn(type,x,y){
  if(!ctx)return;const t=ctx.currentTime;
  if(type==='FLT'){fltM.frequency.setTargetAtTime(80*Math.pow(250,x),t,.02);fltM.Q.setTargetAtTime(.7+y*14,t,.02);}
  else if(type==='DST'){setDst(true);setDrive(x);dstWet.gain.setTargetAtTime(y*.7,t,.02);dstDry.gain.setTargetAtTime(1-y*.6,t,.02);}
  else if(type==='DLY'){dfb.gain.setTargetAtTime(.2+x*.7,t,.03);mDly.gain.setTargetAtTime(y*2,t,.02);dRet.gain.setTargetAtTime(Math.max(FXP.dly.ret,1.2),t,.03);padDuck(1-y*.35,t);}
  else if(type==='REV'){padRev=true;updateRoutes();revTone.frequency.setTargetAtTime(800*Math.pow(15,x),t,.03);mRev.gain.setTargetAtTime(y*3.2,t,.02);revRet.gain.setTargetAtTime(Math.max(FXP.rev.ret,1.5),t,.03);padDuck(1-y*.5,t);}
  else if(type==='REP'){
    if(!repConn){repConn=true;try{fltM.connect(repIn);}catch(e){}}clearTimeout(repOffT);
    const len=repLen(x);repDel.delayTime.setTargetAtTime(len,t,.01);
    if(!repOnFlag){repOnFlag=true;repIn.gain.cancelScheduledValues(t);repIn.gain.setValueAtTime(1,t);repIn.gain.setValueAtTime(0,t+len);repFb.gain.setTargetAtTime(.97,t,.005);repOut.gain.setTargetAtTime(1,t,.005);}
  }
}
function mfxOff(type){
  if(!ctx)return;const t=ctx.currentTime;
  if(type==='FLT'){fltM.frequency.setTargetAtTime(20000,t,.04);fltM.Q.setTargetAtTime(.7,t,.04);}
  else if(type==='DST'){dstWet.gain.setTargetAtTime(0,t,.03);dstDry.gain.setTargetAtTime(1,t,.03);setDst(false);}
  else if(type==='DLY'){mDly.gain.setTargetAtTime(0,t,.03);dfb.gain.setTargetAtTime(FXP.dly.fb,t,.3);dRet.gain.setTargetAtTime(FXP.dly.ret,t,.3);padDuck(1,t);}
  else if(type==='REV'){padRev=false;updateRoutes();mRev.gain.setTargetAtTime(0,t,.03);revTone.frequency.setTargetAtTime(FXP.rev.damp,t,.2);revRet.gain.setTargetAtTime(FXP.rev.ret,t,.3);padDuck(1,t);}
  else if(type==='REP'){clearTimeout(repOffT);repOffT=setTimeout(()=>{if(repConn){repConn=false;try{fltM.disconnect(repIn);}catch(e){}}},1500);repOnFlag=false;repIn.gain.cancelScheduledValues(t);repIn.gain.setValueAtTime(0,t);repOut.gain.setTargetAtTime(0,t,.01);repFb.gain.setTargetAtTime(0,t,.05);}
}

/* ---------------- SAMPLER: motor ---------------- */
/* dos modos: CHOP = un sample cortado en 4 · PADS = cada uno de los 4 botones tiene su propio sample (con su recorte ps..pe) */
const SMPL={buf:null,rbuf:null,name:'',sel:0,mode:'chop',pads:[null,null,null,null],voice:[null,null,null,null],
  chops:[0,1,2,3].map(i=>({s:i/4,e:(i+1)/4,ps:0,pe:1,pitch:0,filt:.5,crush:0,gain:1,rev:false,mode:'one',sync:'off',q:0,qa:true,spd:1,out:0}))};
const smpOut=i=>S.smp2&&SMPL.chops[i]&&SMPL.chops[i].out?7:5;   // canal del mixer: SAMPLER o SAMPLER 2
const smpSrc=i=>SMPL.mode==='pads'?SMPL.pads[i]:(SMPL.buf?{buf:SMPL.buf,rbuf:SMPL.rbuf,name:SMPL.name}:null);
const smpHas=()=>SMPL.mode==='pads'?SMPL.pads.some(Boolean):!!SMPL.buf;
const smpReg=(C)=>SMPL.mode==='pads'?[C.ps??0,C.pe??1]:[C.s,C.e];
const CRCACHE={};
function crushCurve(bits){if(CRCACHE[bits])return CRCACHE[bits];const n=2048,c=new Float32Array(n),L=Math.pow(2,bits)/2;for(let i=0;i<n;i++){const x=i*2/(n-1)-1;c[i]=Math.round(x*L)/L;}return CRCACHE[bits]=c;}
function smpEqual(){SMPL.chops.forEach((C,i)=>{C.s=i/4;C.e=(i+1)/4;});}
function smpSet(data,rate,name,slot){
  if(!data||data.length<64)return false;if(slot===undefined)slot=SMPL.mode==='pads'?SMPL.sel:-1;
  const mkB=(n,r)=>ctx?ctx.createBuffer(1,n,r):new AudioBuffer({length:n,sampleRate:r,numberOfChannels:1});
  const maxN=Math.floor(rate*12);if(data.length>maxN)data=data.subarray(0,maxN);
  let pk=0;for(let i=0;i<data.length;i++){const a=Math.abs(data[i]);if(a>pk)pk=a;}
  const g=pk>.0005?.95/pk:1,b=mkB(data.length,rate),d=b.getChannelData(0),rb=mkB(data.length,rate),rd=rb.getChannelData(0),N=data.length;
  for(let i=0;i<N;i++){const v=data[i]*g;d[i]=v;rd[N-1-i]=v;}
  if(slot>=0){SMPL.pads[slot]={buf:b,rbuf:rb,name:name||'SAMPLE'};const C=SMPL.chops[slot];C.ps=0;C.pe=1;}
  else{SMPL.buf=b;SMPL.rbuf=rb;SMPL.name=name||'SAMPLE';smpEqual();if(SMPL.mode==='chop')SMPL.sel=0;}
  if(!SMPL._rs&&typeof smpStore==='function')smpStore();   // queda guardado en el teléfono
  return true;
}
function chopPlay(i,t,vel,dur){
  const P=smpSrc(i);if(!ctx||!P)return null;const C=SMPL.chops[i],N=P.buf.duration;if(!C)return null;
  if(SMPL.voice[i]){try{SMPL.voice[i].stop(t);}catch(e){}}
  const R=smpReg(C);let s=R[0]*N,e=R[1]*N;if(C.rev){const ss=N-e;e=N-s;s=ss;}
  if(e-s<.005)return null;
  /* SPEED multiplica la velocidad; SYNC ajusta la región a Q tiempos del tema (REPITCH: velocidad y altura · ESTIRAR: misma altura) */
  const sp=C.spd||1,L=e-s;let rate=Math.pow(2,C.pitch/12)*sp,buf=C.rev?P.rbuf:P.buf;
  if(C.sync==='pitch'||C.sync==='tempo'){const T=smpQ(C,L)*60/S.bpm/sp;
    if(C.sync==='pitch')rate=L/T;
    else{const pr=Math.pow(2,C.pitch/12),st=smpStretch(C,buf,s,e,T*pr);if(st){buf=st;s=0;e=st.duration;rate=pr;}else rate=L/T;}}
  const src=ctx.createBufferSource(),g=G(0),f=ctx.createBiquadFilter();
  src.buffer=buf;src.playbackRate.value=rate;
  if(C.filt<.47){f.type='lowpass';f.frequency.value=200*Math.pow(90,C.filt/.47);}
  else if(C.filt>.53){f.type='highpass';f.frequency.value=20*Math.pow(300,(C.filt-.53)/.47);}
  else{f.type='lowpass';f.frequency.value=22000;}
  src.connect(f);let last=f;
  if(C.crush>.02){const w=ctx.createWaveShaper();w.curve=crushCurve(Math.round(16-C.crush*13));f.connect(w);last=w;}
  last.connect(g);g.connect(bus[smpOut(i)].inp);
  const len=(e-s)/rate,pk=vel*C.gain;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.003);
  let end=null;
  if(C.mode==='loop'){src.loop=true;src.loopStart=s;src.loopEnd=e;src.start(t,s);}
  else{src.start(t,s,e-s);end=t+len;}
  let done=false;
  const v={stop(tt){if(done)return;done=true;tt=Math.max(tt===undefined?0:tt,ctx.currentTime);g.gain.cancelScheduledValues(tt);g.gain.setTargetAtTime(0,tt,.012);try{src.stop(tt+.1);}catch(x){}if(SMPL.voice[i]===v)SMPL.voice[i]=null;}};
  if(C.mode==='one'&&dur){ /* secuenciador: one-shot completo */ }
  if(C.mode==='one'){g.gain.setValueAtTime(pk,Math.max(t+.004,end-.01));g.gain.linearRampToValueAtTime(0,end);src.onended=()=>{done=true;if(SMPL.voice[i]===v)SMPL.voice[i]=null;};}
  else if(dur){v.stop(t+dur);}
  SMPL.voice[i]=v;return v;
}
/* ---- SYNC del sampler ----
   Q = cuántos tiempos dura la región. Se detecta al prender SYNC (el más cercano al BPM actual, en potencias de 2) y se ajusta con − / +.
   ESTIRAR calcula aparte (WSOLA) una versión de la región con el largo exacto y la misma altura; mientras tanto suena con REPITCH. */
const SQA=[.25,.5,1,2,4,8,16,32],SQ=[.25,.5,1,2,3,4,6,8,12,16,24,32];
const smpQ=(C,L)=>C.q||smpAutoQ(L);
function smpAutoQ(L){const raw=L*S.bpm/60;let b=1,bd=9;SQA.forEach(q=>{const d=Math.abs(Math.log2(raw/q));if(d<bd){bd=d;b=q;}});return b;}
function smpLen(i){const P=smpSrc(i),C=SMPL.chops[i];if(!P||!C)return 0;const R=smpReg(C);return (R[1]-R[0])*P.buf.duration;}
function wsola(x,outLen,sr){
  const N=Math.max(256,Math.round(sr*.03))&~1,Hs=N>>1,tol=Math.round(sr*.008),win=new Float32Array(N),X=x.length;
  for(let i=0;i<N;i++)win[i]=.5-.5*Math.cos(2*Math.PI*i/N);
  const y=new Float32Array(outLen+N),w=new Float32Array(outLen+N),ratio=X/outLen;let prev=-1;
  for(let o=0;o<outLen;o+=Hs){
    const nom=Math.min(Math.max(0,X-N),Math.round(o*ratio));let best=nom;
    if(prev>=0&&X>N){const nat=prev+Hs,lo=Math.max(0,nom-tol),hi=Math.min(X-N,nom+tol);let bc=-Infinity;
      for(let c=lo;c<=hi;c+=2){let a=0;for(let j=0;j<Hs;j+=8){const k=nat+j;a+=x[c+j]*(k<X?x[k]:0);}if(a>bc){bc=a;best=c;}}}
    for(let j=0;j<N;j++){const xi=best+j,v=xi<X?x[xi]:0;y[o+j]+=v*win[j];w[o+j]+=win[j];}prev=best;}
  const out=new Float32Array(outLen),fd=Math.min(outLen>>1,Math.round(sr*.004));
  for(let i=0;i<outLen;i++)out[i]=w[i]>.05?y[i]/w[i]:0;
  for(let i=0;i<fd;i++){const g=i/fd;out[i]*=g;out[outLen-1-i]*=g;}return out;}
const STQ=new Map();   // cálculos de ESTIRAR pendientes (uno por buffer+región+largo)
function smpStretch(C,buf,s,e,T){
  const sr=buf.sampleRate,key=[s.toFixed(4),e.toFixed(4),T.toFixed(4)].join('|'),st=C._st;
  if(st&&st.src===buf&&st.key===key)return st.buf;
  if(STQ.get(C)===key)return null;STQ.set(C,key);
  const a=Math.floor(s*sr),b=Math.min(buf.length,Math.floor(e*sr)),n=Math.max(64,Math.round(T*sr)),ch=buf.numberOfChannels,chans=[];
  for(let k=0;k<ch;k++)chans.push(buf.getChannelData(k).slice(a,b));
  stWork(chans,n,sr).then(outs=>{if(STQ.get(C)!==key)return;STQ.delete(C);const out=new AudioBuffer({length:n,numberOfChannels:ch,sampleRate:sr});outs.forEach((o,k)=>out.copyToChannel(o,k));
    Object.defineProperty(C,'_st',{value:{src:buf,key,buf:out},writable:true,configurable:true,enumerable:false});dirty=true;}).catch(()=>{if(STQ.get(C)===key)STQ.delete(C);});
  return null;}
/* el estirado corre en un hilo aparte (Web Worker) para no frenar el secuenciador; si no hay worker, se calcula acá */
let STW=null,STN=0;const STP=new Map();
function stWork(chans,n,sr){
  if(STW===null){try{const src='const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));'+wsola.toString()+';onmessage=e=>{const d=e.data,o=d.c.map(x=>wsola(x,d.n,d.sr));postMessage({id:d.id,o},o.map(x=>x.buffer));};';
      STW=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));STW.onmessage=e=>{const r=STP.get(e.data.id);if(r){STP.delete(e.data.id);r(e.data.o);}};STW.onerror=()=>{STW=false;};}catch(x){STW=false;}}
  if(STW){const id=++STN;return new Promise(res=>{STP.set(id,res);STW.postMessage({id,c:chans,n,sr},chans.map(x=>x.buffer));});}
  return new Promise(res=>setTimeout(()=>res(chans.map(x=>wsola(x,n,sr))),0));}
/* dejar listo ESTIRAR para todos los cortes con SYNC (al prenderlo, al cambiar tempo, región o speed) */
function smpPrep(){for(let i=0;i<4;i++){const C=SMPL.chops[i],P=smpSrc(i);if(!P||!C||C.sync!=='tempo')continue;
  const N=P.buf.duration,R=smpReg(C);let s=R[0]*N,e=R[1]*N;if(C.rev){const ss=N-e;e=N-s;s=ss;}const L=e-s;if(L<.005)continue;
  smpStretch(C,C.rev?P.rbuf:P.buf,s,e,smpQ(C,L)*60/S.bpm/(C.spd||1)*Math.pow(2,C.pitch/12));}}

/* AUTO CUE: el inicio del corte/pad va al primer golpe (un poquito antes, en un cruce por cero) y el final corta el silencio */
function smpCue(i){
  const P=smpSrc(i),C=SMPL.chops[i];if(!P||!C)return null;const PM=SMPL.mode==='pads',d=P.buf.getChannelData(0),sr=P.buf.sampleRate,N=d.length;
  const a=Math.floor((PM?(C.ps??0):C.s)*N),b=Math.min(N,Math.floor((PM?(C.pe??1):C.e)*N));if(b-a<sr*.02)return null;
  const w=Math.max(32,Math.floor(sr*.004)),nb=Math.floor((b-a)/w),env=new Float32Array(nb);let pk=0;
  for(let k=0;k<nb;k++){let m=0;for(let j=a+k*w,e=j+w;j<e;j++){const v=Math.abs(d[j]);if(v>m)m=v;}env[k]=m;if(m>pk)pk=m;}
  if(pk<1e-4)return null;const th=pk*.12;
  let k0=0;while(k0<nb&&env[k0]<th)k0++;let k1=nb-1;while(k1>k0&&env[k1]<th*.25)k1--;
  let s=Math.max(a,a+k0*w-Math.floor(sr*.002));
  for(let j=s,lim=Math.max(a+1,s-Math.floor(sr*.003));j>=lim;j--){if((d[j-1]<=0&&d[j]>0)||(d[j-1]>=0&&d[j]<0)){s=j;break;}}
  const e=Math.min(b,a+(k1+1)*w+Math.floor(sr*.012));
  if(PM){C.ps=s/N;C.pe=Math.max(C.ps+.005,e/N);}else{C.s=s/N;C.e=Math.max(C.s+.005,e/N);}
  if(C.sync&&C.sync!=='off'&&C.qa)C.q=smpAutoQ((e-s)/sr);smpPrep();
  return {ds:(s-a)/sr,de:(b-e)/sr};}

/* captura: micrófono, resampleo del master (graba lo que suena) */
let CAP=null,micStream=null;
function capStart(srcNode,label,stream){
  if(CAP||!ctx)return;
  const node=ctx.createScriptProcessor(4096,2,1),z=G(0);
  CAP={slot:SMPL.mode==='pads'?SMPL.sel:-1,node,srcNode,z,label,chunks:[],n:0,max:Math.floor(ctx.sampleRate*12),stream:stream||null,t0:ctx.currentTime};
  node.onaudioprocess=e=>{if(!CAP)return;const a=e.inputBuffer.getChannelData(0),b=e.inputBuffer.numberOfChannels>1?e.inputBuffer.getChannelData(1):null,m=new Float32Array(a.length);
    for(let i=0;i<a.length;i++)m[i]=b?(a[i]+b[i])*.5:a[i];CAP.chunks.push(m);CAP.n+=m.length;if(CAP.n>=CAP.max)setTimeout(capStop,0);};
  srcNode.connect(node);node.connect(z);z.connect(ctx.destination);smpUi();
}
function capStop(){
  if(!CAP)return;const C=CAP;CAP=null;
  try{C.srcNode.disconnect(C.node);}catch(e){}try{C.node.disconnect();C.z.disconnect();}catch(e){}C.node.onaudioprocess=null;
  if(C.stream)C.stream.getTracks().forEach(t=>t.stop());
  const out=new Float32Array(C.n);let o=0;C.chunks.forEach(c=>{out.set(c,o);o+=c.length;});
  if(smpSet(out,ctx.sampleRate,C.label,C.slot))toast(C.label+(C.slot>=0?' EN PAD '+(C.slot+1):'')+' LISTO · '+(C.n/ctx.sampleRate).toFixed(1)+' s');else toast('NO SE CAPTURÓ AUDIO');
  smpUi();queueSave();
}
async function micToggle(){
  if(CAP){capStop();return;}
  initAudio();if(!ctx)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('ACÁ NO HAY MIC · USÁ GRABADOR');return;}
  let st;try{st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}
  catch(e){toast('MIC BLOQUEADO EN EL VISOR · USÁ GRABADOR');return;}
  capStart(ctx.createMediaStreamSource(st),'MIC',st);
}
function resToggle(){if(CAP){capStop();return;}initAudio();if(!ctx)return;capStart(lim,'RESAMPLE');}
async function smpFromFile(file,label){
  if(!file)return;initAudio();if(!ctx)return;
  try{const ab=await file.arrayBuffer(),b=await ctx.decodeAudioData(ab),n=b.length,m=new Float32Array(n),a=b.getChannelData(0),c=b.numberOfChannels>1?b.getChannelData(1):null;
    for(let i=0;i<n;i++)m[i]=c?(a[i]+c[i])*.5:a[i];
    if(smpSet(m,b.sampleRate,(file.name||label).replace(/\.[^.]+$/,'').slice(0,18).toUpperCase())){toast('SAMPLE CARGADO · '+(n/b.sampleRate).toFixed(1)+' s');smpUi();queueSave();}
    else toast('AUDIO MUY CORTO');
  }catch(e){toast('NO PUDE LEER ESE AUDIO');}
}
function smpDemo(){
  initAudio();if(!ctx)return;const sr=ctx.sampleRate,L=Math.floor(sr*2),d=new Float32Array(L);
  const add=(t0,fn,len)=>{const s0=Math.floor(t0*sr),n=Math.floor(len*sr);for(let i=0;i<n&&s0+i<L;i++)d[s0+i]+=fn(i/sr,i);};
  [0,.5,.75,1,1.25,1.75].forEach(t=>add(t,(t_)=>Math.sin(2*Math.PI*(42*t_+118*(1-Math.exp(-t_*22))/22*1))*Math.exp(-t_*9)*.9,.4));
  [.25,.75,1.25,1.75].forEach(t=>add(t,(t_)=>((Math.random()*2-1)*.6+Math.sin(2*Math.PI*190*t_)*.4)*Math.exp(-t_*16)*.8,.22));
  for(let k=0;k<8;k++)add(k*.25+.125,(t_)=>(Math.random()*2-1)*Math.exp(-t_*60)*.35,.06);
  if(smpSet(d,sr,'DEMO BREAK')){toast(SMPL.mode==='pads'?'DEMO EN PAD '+(SMPL.sel+1):'DEMO: 4 CHOPS · TOCÁ LOS PADS');smpUi();}
}
function smpMode(m){
  if(m===SMPL.mode)return;SMPL.voice.forEach(v=>{try{v&&v.stop();}catch(e){}});let conv=false;
  if(m==='pads'&&SMPL.buf&&!SMPL.pads.some(Boolean)){const d=SMPL.buf.getChannelData(0),N=d.length,sr=SMPL.buf.sampleRate;
    SMPL._rs=true;try{SMPL.chops.forEach((C,i)=>{const a=Math.floor(C.s*N),b=Math.floor(C.e*N);if(b-a>64)smpSet(d.slice(a,b),sr,(SMPL.name||'SAMPLE').slice(0,12)+' '+(i+1),i);});}finally{SMPL._rs=false;}conv=true;}
  SMPL.mode=m;if(typeof smpStore==='function')smpStore();queueSave();return conv;
}
/* copiar un pad en otro: en PADS copia el sample + recorte + ajustes; en CHOP copia la región y los ajustes */
function smpCopy(a,b){
  if(a===b||a<0||b<0||a>3||b>3)return false;const A=SMPL.chops[a],B=SMPL.chops[b];
  if(SMPL.mode==='pads'){if(!SMPL.pads[a])return false;SMPL.pads[b]=Object.assign({},SMPL.pads[a]);}
  try{SMPL.voice[b]&&SMPL.voice[b].stop();}catch(e){}
  Object.assign(B,JSON.parse(JSON.stringify(A)));if(typeof smpStore==='function')smpStore();queueSave();return true;
}
function smpTransients(){
  if(!SMPL.buf)return;const d=SMPL.buf.getChannelData(0),sr=SMPL.buf.sampleRate,w=Math.floor(sr*.01),nb=Math.floor(d.length/w),env=new Float32Array(nb);
  for(let b=0;b<nb;b++){let s=0;for(let i=0;i<w;i++){const v=d[b*w+i];s+=v*v;}env[b]=Math.sqrt(s/w);}
  const flux=[];for(let b=2;b<nb;b++){const df=env[b]-env[b-2];flux.push([df,b]);}
  flux.sort((a,b)=>b[0]-a[0]);const picks=[];
  for(const [df,b] of flux){if(df<=0.002)break;if(b<4)continue;if(picks.every(p=>Math.abs(p-b)>8)){picks.push(b);if(picks.length===3)break;}}
  if(picks.length<3){smpEqual();toast('POCOS GOLPES · 4 IGUALES');return;}
  picks.sort((a,b)=>a-b);const pts=[0,...picks.map(b=>Math.max(0,(b-1)*w/d.length)),1];
  SMPL.chops.forEach((C,i)=>{C.s=pts[i];C.e=pts[i+1];});toast('CORTE POR TRANSIENTES');
}
function smpEncode(B,nm){
  B=B||SMPL.buf;if(!B)return null;nm=nm===undefined?SMPL.name:nm;const b=B,src=b.getChannelData(0),sr=b.sampleRate,dur=b.duration;
  const tr=Math.max(8000,Math.min(22050,Math.floor(22050*8/Math.max(dur,8)))),n=Math.floor(src.length*tr/sr),out=new Int16Array(n);
  for(let i=0;i<n;i++){const p=i*sr/tr,i0=Math.floor(p),f=p-i0,a=src[i0]||0,c=src[i0+1]===undefined?a:src[i0+1];out[i]=Math.round(clamp(a+(c-a)*f,-1,1)*32767);}
  const by=new Uint8Array(out.buffer);let s='';for(let i=0;i<by.length;i+=8192)s+=String.fromCharCode.apply(null,by.subarray(i,i+8192));
  return{rate:tr,len:n,name:nm,b64:btoa(s)};
}
function smpDecode(o,slot){
  if(!o||!o.b64)return false;const s=atob(o.b64),by=new Uint8Array(s.length);for(let i=0;i<s.length;i++)by[i]=s.charCodeAt(i);
  const i16=new Int16Array(by.buffer,0,Math.floor(by.length/2)),f=new Float32Array(i16.length);for(let i=0;i<f.length;i++)f[i]=i16[i]/32767;
  const keep=JSON.parse(JSON.stringify(SMPL.chops));const ok=smpSet(f,o.rate||22050,o.name,slot===undefined?-1:slot);SMPL.chops.forEach((C,i)=>Object.assign(C,keep[i]));return ok;
}

/* ---------------- secuenciador ---------------- */
let started=false,gT=0,nextT=0,stepI=0,sched=null,qq=[],lastStepT=0,dirty=true;
const SCH=[];   // últimos pasos programados {s,t,g}: el REC busca acá qué paso estaba SONANDO (en el oído) al tocar
/* compensación de latencia (Bluetooth): lo que sale del parlante llega tarde al oído.
   NADA = como antes · AUTO = lo que informa el navegador · MEDIDA = calibración por toque */
const latOut=()=>{if(!ctx||!PERF.lc||PERF.lc==='off')return 0;if(PERF.lc==='cal')return clamp((PERF.lcMs||0)/1000,0,.6);return clamp((ctx.outputLatency||0)+(ctx.baseLatency||0),0,.6);};
const vNow=()=>ctx?ctx.currentTime-latOut():0;
const swOff=()=>gT%2?clamp(S.sw||0,0,1)*.5*sd():0;   // SWING (solo batería): atrasa el 16avo par de cada corchea · 0 = 50% … 1 = 75%
const sd=()=>60/S.bpm/4;
function trig(r,s,t){
  if(!pat[r][s])return;const R=ROWS[r];
  seqLit(r,s,t,R.t==='syn'?sd()*(synG[R.k][s]||1):R.t==='vin'?sd()*(vinG[R.k][s]||1):R.t==='chd'?sd()*chdGate[s]:.13);   // luz en su módulo
  if(R.t==='drum')drumPlay(r,t,1);
  else if(R.t==='syn')xyPlay(r,s,[mkVoice(curP(R.k),mtof(scaleNote(seqN[R.k][s],BASEOCT[R.k])),t,.9,bus[1+R.k].inp,sd()*((synG[R.k][s]||1)-.1))],'syn'+R.k,t);
  else if(R.t==='chd')xyPlay(r,s,chordPlay(chdSeq[s],false,t,bus[3].inp,sd()*chdGate[s]*.95),'chd',t);
  else if(R.t==='smp'&&sSeq(R)[s])chopPlay(sSeq(R)[s]-1,t,.9,sd()*.98);
  else if(R.t==='vin')xyPlay(r,s,[vinPlay(vinN[R.k][s],false,t,sd()*(vinG[R.k][s]||1)*.97)],'vin',t);
}
const rowOn=r=>r!==R_SMP2||S.smp2;   // SMP 2 solo existe si está prendido
const rowAud=r=>rowOn(r)&&!RM[r]&&(!RS.some(Boolean)||RS[r]);
let gDone=-1;   // último paso global ya programado (para no repetir el cambio de parte al retomar después de un scratch)
function tick(){while(nextT<ctx.currentTime+.2){if(stepI===0&&barN>=0&&nextT>0&&started&&gT>gDone)partBar();gDone=Math.max(gDone,gT);started=true;if(S.rec&&stepI%4===0)click(nextT,stepI===0);const so=swOff();for(let r=0;r<NR;r++)if(rowAud(r))trig(r,LEN[r]>=STEPS?stepI:gT%LEN[r],r<8?nextT+so:nextT);const e={s:stepI,t:nextT,g:gT};qq.push(e);SCH.push(e);if(SCH.length>96)SCH.shift();stepI=(stepI+1)%STEPS;gT++;nextT+=sd();}}
function play(){initAudio();if(!ctx||S.playing)return;scrCancel();stepI=0;gT=0;gDone=-1;started=false;barN=0;loopN=0;nextT=ctx.currentTime+.06;qq=[];SCH.length=0;sched=setInterval(tick,40);S.playing=true;sync();}
function stop(){clearInterval(sched);sched=null;scrCancel();S.playing=false;S.next=null;try{partUi();}catch(e){}qq=[];S.cur=-1;dirty=true;sync();}
const togglePlay=()=>S.playing?stop():play();

/* ===== SCRATCH (bailarín del medidor) =====
   Un AudioWorklet al principio de cada canal (entre la entrada y el fader) guarda los últimos 10 s de cada canal:
   lo scratcheado pasa por fader, paneo, envíos (DLY/REV/MOD/DST) y master; las colas de los efectos siguen al frenar.
   Apretar = mano sobre el vinilo: frena y el secuenciador queda en pausa. Arrastrar arriba/abajo = adelanta/atrasa la púa.
   Soltar = vuelve a velocidad normal, reproduce lo que atrasaste y, al llegar al punto donde frenaste, el secuenciador sigue desde ahí. */
const SCR_SRC=`class GbScratch extends AudioWorkletProcessor{
  constructor(o){super();const sr=sampleRate,NB=(o&&o.numberOfInputs)||1;this.sr=sr;this.NB=NB;this.N=Math.floor(sr*10);
    this.B=[];for(let c=0;c<NB*2;c++)this.B.push(new Int16Array(this.N));   // 16 bits (±4 de rango): 8 canales estéreo × 10 s ≈ 15 MB
    this.hx=new Float32Array(NB*2);this.hy=new Float32Array(NB*2);this.P=new Float64Array(128);this.Gk=new Float32Array(128);this.A=new Float32Array(128);
    this.W=0;this.fill=0;this.mode=0;this.ph=0;this.v=0;this.tg=0;this.gp=0;this.endF=0;this.brake=false;this.sent=false;this.FX=Math.floor(sr*.006);this.g=1;
    this.kB=Math.exp(-1/(sr*.03));this.kV=1-Math.exp(-1/(sr*.006));this.kU=1-Math.exp(-1/(sr*.03));this.kH=Math.exp(-2*Math.PI*25/sr);this.kG=1-Math.exp(-1/(sr*.004));
    this.port.onmessage=e=>{const m=e.data,sr=this.sr;
      if(m.t==='down'){if(this.mode===0){if(this.fill<sr*.1)return;this.endF=this.W;this.ph=this.W-sr*.045;for(let c=0;c<this.NB*2;c++){this.hx[c]=this.rd(this.B[c],this.ph);this.hy[c]=0;}this.g=1;this.v=1;this.brake=true;this.port.postMessage({t:'held',T:currentTime});}
        else{this.brake=false;}this.mode=1;this.sent=false;this.gp=this.ph;this.tg=this.ph;}
      else if(m.t==='mv'&&this.mode===1){this.brake=false;this.tg=Math.min(this.endF,Math.max(this.W-this.fill+256,this.gp+m.d*sr));}
      else if(m.t==='up'&&this.mode===1){this.mode=2;this.brake=false;}
      else if(m.t==='q')this.port.postMessage({t:'st',mode:this.mode,ph:this.ph,W:this.W,endF:this.endF,v:this.v,sr,nb:this.NB});};}
  rd(B,p){const N=this.N,i=Math.floor(p),f=p-i,a=((i%N)+N)%N,b=(a+1)%N;return (B[a]+(B[b]-B[a])*f)/8192;}
  process(ins,outs){const NB=this.NB,n=outs[0][0].length,N=this.N;
    if(this.mode===0){const w0=this.W;
      for(let c=0;c<NB;c++){const I=ins[c]||[],iL=I[0],iR=I[1]||I[0],O=outs[c],oL=O[0],oR=O[1]||O[0],BL=this.B[2*c],BR=this.B[2*c+1];
        for(let k=0;k<n;k++){const l=iL?iL[k]:0,r=iR?iR[k]:0,w=(w0+k)%N;BL[w]=Math.max(-32768,Math.min(32767,Math.round(l*8192)));BR[w]=Math.max(-32768,Math.min(32767,Math.round(r*8192)));oL[k]=l;oR[k]=r;}}
      this.W+=n;this.fill=Math.min(N-256,this.fill+n);return true;}
    /* 1) la púa: posición, volumen y mezcla con lo vivo, muestra por muestra */
    const lo=this.W-this.fill+2,P=this.P,Gk=this.Gk,A=this.A;let kEnd=n;
    for(let k=0;k<n;k++){
      if(this.mode===1){if(this.brake){this.v*=this.kB;if(this.v<.004){this.v=0;this.brake=false;this.tg=this.ph;this.gp=this.ph;}}
        else{const want=Math.max(-6,Math.min(6,(this.tg-this.ph)/(this.sr*.01)));this.v+=(want-this.v)*this.kV;}}
      else{this.v+=(1-this.v)*this.kU;if(!this.sent&&this.v>.985){this.sent=true;this.port.postMessage({t:'end',T:currentTime+(k+(this.endF-this.ph)/this.v)/this.sr});}}
      this.ph+=this.v;if(this.ph>this.endF){this.ph=this.endF;if(this.mode===1)this.v=0;}if(this.ph<lo){this.ph=lo;this.v=0;}
      const gt=this.mode===2?1:Math.min(1,Math.abs(this.v)*4);this.g+=(gt-this.g)*this.kG;P[k]=this.ph;Gk[k]=this.g;A[k]=1;
      if(this.mode===2){const rem=this.endF-this.ph;if(rem<this.FX)A[k]=Math.max(0,rem/this.FX);
        if(rem<=0){this.mode=0;kEnd=k+1;if(!this.sent){this.sent=true;this.port.postMessage({t:'end',T:currentTime+k/this.sr});}break;}}}
    /* 2) cada canal lee su audio en esa posición (sin DC: disco quieto = silencio) y entra a su canal del mixer → envíos y efectos */
    for(let c=0;c<NB;c++){const I=ins[c]||[],O=outs[c],oL=O[0],oR=O[1]||O[0];
      for(let h=0;h<2;h++){const B=this.B[2*c+h],out=h?oR:oL,inn=I[h]||I[0],q=2*c+h;if(h&&oR===oL)break;let x=this.hx[q],y=this.hy[q];
        for(let k=0;k<kEnd;k++){const s=this.rd(B,P[k]),yy=s-x+this.kH*y;x=s;y=yy;const iv=inn?inn[k]:0;out[k]=yy*Gk[k]*A[k]+iv*(1-A[k]);}
        this.hx[q]=x;this.hy[q]=y;for(let k=kEnd;k<n;k++)out[k]=inn?inn[k]:0;}}
    return true;}}
registerProcessor('gb-scratch',GbScratch);`;
const SCR={node:null,err:null,held:false,landing:false,paused:false,Tf:0,off:0,last:null,st:null};
function scrInit(){if(SCR.node||SCR._ld||!ctx||!ctx.audioWorklet){if(ctx&&!ctx.audioWorklet)SCR.err='sin AudioWorklet';return;}SCR._ld=true;
  const add=u=>ctx.audioWorklet.addModule(u);   // blob (https) y, si no deja (archivo local), data:
  add(URL.createObjectURL(new Blob([SCR_SRC],{type:'application/javascript'}))).catch(()=>add('data:text/javascript;charset=utf-8,'+encodeURIComponent(SCR_SRC))).then(()=>{const NB=bus.length,nd=new AudioWorkletNode(ctx,'gb-scratch',{numberOfInputs:NB,numberOfOutputs:NB,outputChannelCount:Array(NB).fill(2),channelCount:2,channelCountMode:'explicit'});   // va ANTES de los efectos: entre la entrada de cada canal y su fader
    nd.port.onmessage=e=>{const m=e.data;if(m.t==='held')SCR.Tf=m.T;else if(m.t==='end')scrResume(m.T);else if(m.t==='st'){SCR.st=m;if(SCR._q){SCR._q(m);SCR._q=null;}}};
    bus.forEach((b,i)=>{try{b.inp.disconnect(b.vol);}catch(e){}b.inp.connect(nd,0,i);nd.connect(b.vol,i,0);});SCR.node=nd;}).catch(e=>{SCR.err=String(e&&e.message||e);});}
const outTap=()=>clampSh;   // lo que sale por el parlante (incluye el scratch y sus efectos)
const scrQ=()=>new Promise(r=>{if(!SCR.node)return r(null);SCR._q=r;SCR.node.port.postMessage({t:'q'});});
function scrDown(){if(!SCR.node||SCR.landing)return false;SCR.held=true;SCR.off=0;
  if(!SCR.paused){SCR.Tf=ctx.currentTime;if(S.playing&&sched){clearInterval(sched);sched=null;SCR.paused=true;const tn=ctx.currentTime;qq=qq.filter(e=>e.t<=tn);}}
  SCR.node.port.postMessage({t:'down'});return true;}
function scrMove(sec){if(!SCR.held||!SCR.node)return;SCR.off=sec;SCR.node.port.postMessage({t:'mv',d:sec});}
function scrUp(){if(!SCR.held)return;SCR.held=false;SCR.landing=true;SCR.node.port.postMessage({t:'up'});}
function scrResume(T){SCR.landing=false;SCR.off=0;if(!SCR.paused)return;SCR.paused=false;if(!S.playing||sched)return;
  const Tf=SCR.Tf,t0=Math.max(T,ctx.currentTime+.03),k=SCH.findIndex(e=>e.t>=Tf-1e-4);
  if(k>=0){const e=SCH[k];stepI=e.s;gT=e.g;nextT=t0+(e.t-Tf);SCH.length=k;}else nextT=t0+Math.max(0,nextT-Tf);
  qq=qq.filter(e=>e.t<Tf);SCR.last={Tf,T,t0,s:stepI,g:gT,nt:nextT};sched=setInterval(tick,40);tick();dirty=true;}
function scrCancel(){if(SCR.held||SCR.landing){SCR.held=false;SCR.landing=true;try{SCR.node.port.postMessage({t:'up'});}catch(e){}}SCR.paused=false;}
function updateCur(){if(!ctx)return;const tn=vNow();while(qq.length&&qq[0].t<=tn){if(S.cur!==qq[0].s)dirty=true;S.cur=qq[0].s;S.g=qq[0].g;lastStepT=qq[0].t;qq.shift();}}

/* ---------------- partes (A B C D): cada parte guarda su propio patrón completo ---------------- */
const PARTS=[null,null,null,null],PN=['A','B','C','D'];let loopN=0,barN=0;
const partSnap=()=>JSON.parse(snapSeq());
/* v13.11 tenía un solo renglón VINT (grado + acorde sí/no): pasa a 5 carriles; el acorde ocupa los carriles 2 y 3 */
function vinMig(j){
  if(!j||!Array.isArray(j.vinN)||Array.isArray(j.vinN[0]))return j;
  const n=fitA(j.vinN,0),c=fitA(j.vinC,0),g=fitA(j.vinG,1),p0=fitA(j.pat&&j.pat[R_VIN],0);
  j.vinN=[n,...[1,2,3,4].map(()=>Array(MAXS).fill(0))];j.vinG=[g,...[1,2,3,4].map(()=>Array(MAXS).fill(1))];
  if(j.pat){for(let k=1;k<VL;k++)j.pat[R_VIN+k]=Array(MAXS).fill(0);for(let s=0;s<MAXS;s++)if(p0[s]&&c[s])[2,4].forEach((o,i)=>{j.pat[R_VIN+1+i][s]=1;j.vinN[1+i][s]=n[s]+o;j.vinG[1+i][s]=g[s];});}
  if(Array.isArray(j.len)){const L=j.len[R_VIN]||16;for(let k=1;k<VL;k++)j.len[R_VIN+k]=L;}
  delete j.vinC;return j;}
function partApply(j){vinMig(j);for(let i=0;i<NR;i++){LEN[i]=Math.min((j.len&&j.len[i])||STEPS,MAXS);pat[i]=fitA(j.pat&&j.pat[i],0);XYR[i]=fitA(j.xyr&&j.xyr[i],null);}(j.seqN||[]).forEach((r,i)=>{if(i<2)seqN[i]=fitA(r,0);});
  [[chdSeq,j.chdSeq,0],[chdGate,j.chdGate,2],[smpSeq,j.smpSeq,0],[smpSeq2,j.smpSeq2,0]].forEach(([A,B,d])=>fitA(B,d).forEach((v,i)=>A[i]=v));vinLoad(j);}
function vinLoad(j){for(let k=0;k<2;k++)fitA(j.synG&&j.synG[k],1).forEach((v,i)=>synG[k][i]=v);for(let k=0;k<VL;k++){fitA(j.vinN&&j.vinN[k],0).forEach((v,i)=>vinN[k][i]=v);fitA(j.vinG&&j.vinG[k],1).forEach((v,i)=>vinG[k][i]=v);}}
const partOrder=()=>[0,1,2,3].filter(i=>PARTS[i]||i===S.part);
function partSwitch(i){
  if(i===S.part||i<0||i>3)return;
  PARTS[S.part]=partSnap();if(!PARTS[i])PARTS[i]=JSON.parse(JSON.stringify(PARTS[S.part]));   // una parte nueva arranca como copia de la actual
  partApply(PARTS[i]);S.part=i;UNDO=null;UNDOP=null;S.hasUndo=false;try{$('#bUndo').classList.remove('has');}catch(e){}
  dirty=true;try{renderPalette();partUi();}catch(e){}queueSave();
}
function partGo(i){   // sonando: cambia al final del compás; parado: al instante
  if(!S.playing){S.next=null;partSwitch(i);return;}
  S.next=(S.next===i||i===S.part)?null:i;try{partUi();}catch(e){}
}
function partBar(){   // al empezar cada compás
  barN++;
  if(S.next!=null){const n=S.next;S.next=null;loopN=0;partSwitch(n);return;}
  if(S.song){loopN++;if(loopN>=S.rep[S.part]){const o=partOrder(),nx=o[(o.indexOf(S.part)+1)%o.length];loopN=0;if(nx!==S.part)partSwitch(nx);}}
}

/* REC en vivo: cuantiza al paso más cercano; devuelve el paso escrito (o -1) */
let UNDO=null,UNDOP=null;
/* copiar una parte en otra (si el destino es la parte que suena, se aplica en vivo) */
function partCopy(src,dst){
  if(src===dst||src<0||dst<0||src>3||dst>3)return false;
  const data=src===S.part?partSnap():(PARTS[src]?JSON.parse(JSON.stringify(PARTS[src])):null);if(!data)return false;
  if(dst===S.part){takeUndo();partApply(data);}
  else{UNDO=null;UNDOP={i:dst,prev:PARTS[dst]?JSON.parse(JSON.stringify(PARTS[dst])):null,rep:S.rep[dst]};PARTS[dst]=JSON.parse(JSON.stringify(data));S.hasUndo=true;try{$('#bUndo').classList.add('has');}catch(e){}}
  S.rep[dst]=S.rep[src];dirty=true;queueSave();return true;
}
const snapSeq=()=>JSON.stringify({pat,seqN,synG,chdSeq,chdGate,smpSeq,smpSeq2,vinN,vinG,xyr:XYR,len:LEN,steps:STEPS});
function takeUndo(){UNDOP=null;UNDO=snapSeq();S.hasUndo=true;$('#bUndo').classList.add('has');}
function doUndo(){if(UNDOP){PARTS[UNDOP.i]=UNDOP.prev;S.rep[UNDOP.i]=UNDOP.rep;const n=PN[UNDOP.i];UNDOP=null;S.hasUndo=false;$('#bUndo').classList.remove('has');try{partUi();}catch(e){}queueSave();toast('COPIA EN '+n+' DESHECHA');return;}
  if(!UNDO)return;const j=JSON.parse(UNDO);partApply(j);if(j.steps)STEPS=j.steps;try{pageUi();}catch(e){}UNDO=null;S.hasUndo=false;$('#bUndo').classList.remove('has');dirty=true;renderPalette();queueSave();toast('GRABACIÓN DESHECHA');}
function recPos(row){
  if(!(S.rec&&S.playing)||!ctx||!SCH.length)return -1;
  /* el paso que estabas ESCUCHANDO al tocar = ahora − latencia; se cuantiza al más cercano */
  const tn=ctx.currentTime-latOut(),q=sd();let k=-1;for(let i=SCH.length-1;i>=0;i--)if(SCH[i].t<=tn){k=i;break;}
  const e=k<0?SCH[0]:SCH[k];let g=e.g,s=e.s;if(k>=0&&tn-e.t>q/2){if(SCH[k+1]){g=SCH[k+1].g;s=SCH[k+1].s;}else{g++;s=(s+1)%STEPS;}}
  return LEN[row]<STEPS?g%LEN[row]:s%STEPS;
}
function recWrite(row,val){
  const st=recPos(row);if(st<0)return -1;
  pat[row][st]=1;if(row===R_SYN||row===R_SYN+1){seqN[row-R_SYN][st]=val;synG[row-R_SYN][st]=1;}else if(row===R_CHD){chdSeq[st]=val;chdGate[st]=2;}else if(row===R_SMP)smpSeq[st]=val;else if(row===R_SMP2)smpSeq2[st]=val;
  dirty=true;queueSave();return st;
}
function recGate(st,heldSec){if(st<0)return;const n=heldSec/sd();chdGate[st]=GATES.reduce((a,g)=>Math.abs(g-n)<Math.abs(a-n)?g:a,GATES[0]);dirty=true;queueSave();}
/* REC en VINTAGE: cada nota va al primer carril libre de ese paso (si la misma nota ya está, la reusa);
   al soltar, el GATE = cuánto la mantuviste, en pasos (1…32) */
function vinRec(degs){
  const out=[];if(!(S.rec&&S.playing)||!ctx)return out;
  degs.forEach(d=>{let pick=-1,st=-1;
    for(let k=0;k<VL;k++){const r=R_VIN+k,s=recPos(r);if(s<0)continue;if(pat[r][s]&&vinN[k][s]===d&&!out.some(o=>o.k===k&&o.st===s)){pick=k;st=s;break;}}
    if(pick<0)for(let k=0;k<VL;k++){const r=R_VIN+k,s=recPos(r);if(s<0)continue;if(!pat[r][s]&&!out.some(o=>o.k===k&&o.st===s)){pick=k;st=s;break;}}
    if(pick<0){pick=VL-1;st=recPos(R_VIN+pick);}if(st<0)return;
    pat[R_VIN+pick][st]=1;vinN[pick][st]=d;vinG[pick][st]=1;out.push({k:pick,st});});
  if(out.length){dirty=true;queueSave();}return out;}
function synGate(k,st,heldSec){if(st<0)return;synG[k][st]=clamp(Math.round(heldSec/sd()),1,STEPS);dirty=true;queueSave();}
function vinGate(o,heldSec){vinG[o.k][o.st]=clamp(Math.round(heldSec/sd()),1,STEPS);dirty=true;queueSave();}
/* 16 ↔ 32 pasos: al pasar a 32 se duplica lo que había (suena igual); al volver a 16 se acorta */
function setSteps(n){n=n===32?32:16;if(n===STEPS)return false;takeUndo();
  if(n===32){for(let r=0;r<NR;r++)if(LEN[r]===16){LEN[r]=32;const R=ROWS[r],A=[pat[r],XYR[r]];if(R.t==='syn')A.push(seqN[R.k],synG[R.k]);else if(R.t==='chd')A.push(chdSeq,chdGate);else if(R.t==='smp')A.push(sSeq(R));else if(R.t==='vin')A.push(vinN[R.k],vinG[R.k]);
      A.forEach(a=>{for(let s=0;s<16;s++)a[s+16]=a[s];});}}
  else for(let r=0;r<NR;r++)LEN[r]=Math.min(LEN[r],16);
  STEPS=n;if(S.sel.s>=LEN[S.sel.r])S.sel={r:S.sel.r,s:LEN[S.sel.r]-1};dirty=true;queueSave();return true;}

/* ---------------- guardado: local + sesiones ---------------- */
const KEY='musica_gb_mobile_v1';let saveT=null;
function snapshot(withSample){
  const o={v:9,name:S.name,saved:Date.now(),bpm:S.bpm,key:S.key,scale:S.scale,pat,seqN,chdSeq,chdGate,smpSeq,smpSeq2,smp2:S.smp2,synG,vinN,vinG,xyr:XYR,steps:STEPS,sw:S.sw,vinPre:S.vinPre,vinPar:S.vinPar,vko:S.vko,vch:S.vch,pre:S.pre,par:S.par,chdPar:S.chdPar,chdPre:S.chdPre,ko:S.ko,master:S.master,
    ch:CH.map(c=>[c.vol,c.dly,c.rev,c.mod,c.pan,c.dst]),fx:FXP,smp:{chops:SMPL.chops,mode:SMPL.mode},kit:S.kit,part:S.part,song:S.song,rep:S.rep,parts:PARTS,len:LEN,rm:RM,rs:RS,xy:S.xy,dk:S.dk};
  if(withSample){const e=smpEncode();if(e)o.smp.pcm=e;if(SMPL.pads.some(Boolean))o.smp.pads=SMPL.pads.map(p=>p?smpEncode(p.buf,p.name):null);}
  return o;
}
function applySnapshot(j){
  if(!j||typeof j!=='object')throw new Error('formato');vinMig(j);
  S.bpm=clamp(+j.bpm||S.bpm,50,200);S.key=j.key??S.key;S.scale=j.scale??S.scale;S.pre=j.pre||S.pre;S.chdPre=j.chdPre??S.chdPre;S.name=j.name||S.name;
  S.par=j.par&&j.par.length===2&&j.par[0].lfoS?j.par:[Object.assign({},SYNP[S.pre[0]]),Object.assign({},SYNP[S.pre[1]])];
  S.chdPar=(j.chdPar&&j.chdPar.lfoS)?j.chdPar:Object.assign({},CHDPRE[S.chdPre]||CHDPRE[0]);
  S.ko=j.ko||S.ko;S.master=j.master??S.master;
  if(j.pat)for(let i=0;i<NR;i++)pat[i]=fitA(j.pat[i],0);
  for(let i=0;i<NR;i++)XYR[i]=fitA(j.xyr&&j.xyr[i],null);
  if(j.seqN)j.seqN.forEach((r,i)=>{if(i<2)seqN[i]=fitA(r,0);});
  [[chdSeq,j.chdSeq,0],[chdGate,j.chdGate,2],[smpSeq,j.smpSeq,0],[smpSeq2,j.smpSeq2,0]].forEach(([A,B,d])=>fitA(B,d).forEach((v,i)=>A[i]=v));vinLoad(j);S.smp2=!!j.smp2;
  STEPS=j.steps===32?32:16;S.sw=clamp(+j.sw||0,0,1);S.vko=clamp(+j.vko||0,-1,2);S.vch=!!j.vch;
  S.vinPre=clamp(+j.vinPre||0,0,VINP.length-1);S.vinPar=(j.vinPar&&j.vinPar.e)?Object.assign(vinFresh(S.vinPre),j.vinPar):vinFresh(S.vinPre);
  (j.ch||[]).forEach((a,i)=>{if(!CH[i])return;CH[i].vol=a[0];CH[i].dly=a[1];CH[i].rev=a[2];CH[i].mod=a[3]||0;CH[i].pan=a[4]||0;CH[i].dst=a[5]||0;});
  S.kit=j.kit||0;S.song=!!j.song;S.rep=(j.rep&&j.rep.length===4)?j.rep:[1,1,1,1];S.next=null;S.part=(j.parts&&j.part>=0&&j.part<4)?j.part:0;
  for(let i=0;i<4;i++)PARTS[i]=(j.parts&&j.parts[i])||null;
  if(j.xy&&j.xy.syn0)S.xy=j.xy;if(!S.xy.vin)S.xy.vin={x:'pitch',y:'cut',pr:2};
  S.dk=DR.map((_,i)=>Object.assign({},DKD,(Array.isArray(j.dk)&&j.dk[i])||{}));
  for(let i=0;i<NR;i++){LEN[i]=Math.min((j.len&&j.len[i])||STEPS,MAXS);RM[i]=!!(j.rm&&j.rm[i]);RS[i]=!!(j.rs&&j.rs[i]);}
  if(j.fx){const b=FXD();['dly','rev','mod','mst','dst'].forEach(k=>Object.assign(FXP[k],b[k],j.fx[k]||{}));}
  if(j.smp&&j.smp.chops)j.smp.chops.forEach((C,i)=>{if(SMPL.chops[i])Object.assign(SMPL.chops[i],{ps:0,pe:1,sync:'off',q:0,qa:true,spd:1,out:0},C);});
  SMPL.mode=j.smp&&j.smp.mode==='pads'?'pads':'chop';
}
const CHG={on:false,t0:0,cb:null};   // hay cambios desde el último guardado en Drive
function queueSave(){if(!CHG.on){CHG.on=true;CHG.t0=Date.now();if(CHG.cb)try{CHG.cb();}catch(e){}}clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(snapshot(false)));}catch(e){}},500);}
const DEF=JSON.parse(JSON.stringify(snapshot(false)));   // estado de fábrica (para NUEVA SESIÓN)
(function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j)applySnapshot(j);}catch(e){}})();
</script>
