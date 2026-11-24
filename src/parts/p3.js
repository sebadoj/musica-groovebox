
/* ---------------- UI: utilidades ---------------- */
let toastT=null;function toast(s){const t=$('#toast');t.textContent=s;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1900);}
function bindPad(el,down,up){
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{el.setPointerCapture(e.pointerId);}catch(x){}el.classList.add('dn');down(e);});
  const end=e=>{if(el.classList.contains('dn')){el.classList.remove('dn');if(up)up(e);}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
function repeatBtn(el,fn){let t1=null,t2=null;const stop=()=>{clearTimeout(t1);clearInterval(t2);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();fn();t1=setTimeout(()=>{t2=setInterval(fn,70);},380);});
  ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,stop));}
const paints=[];
function slider(el,get,set,vertical,reg){
  const fill=el.querySelector('i');
  const knob=el.classList.contains('knob');let k0=0,kx=0,ky=0;
  const paint=()=>{const v=clamp(get(),0,1),p=v*100+'%';el.style.setProperty('--v',v.toFixed(3));if(vertical)fill.style.height=p;else fill.style.width=p;};
  const upd=e=>{if(knob){set(clamp(k0+((e.clientX-kx)-(e.clientY-ky))/140,0,1));paint();return;}const r=el.getBoundingClientRect();set(clamp(vertical?1-(e.clientY-r.top)/r.height:(e.clientX-r.left)/r.width,0,1));paint();};
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{el.setPointerCapture(e.pointerId);}catch(x){}el._d=true;if(knob){k0=clamp(get(),0,1);kx=e.clientX;ky=e.clientY;if(e.detail>=2&&el.classList.contains('pan')){set(.5);paint();}return;}upd(e);});
  el.addEventListener('pointermove',e=>{if(el._d)upd(e);});
  const end=()=>{el._d=false;};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  paint();if(reg!==false)paints.push(paint);return paint;
}
/* parámetros: definición → slider normalizado (lineal o exponencial) */
const p2n=(d,v)=>d.exp?Math.log(v/d.min)/Math.log(d.max/d.min):(v-d.min)/(d.max-d.min);
const n2p=(d,n)=>d.exp?d.min*Math.pow(d.max/d.min,n):d.min+n*(d.max-d.min);
function mkGrid(pn,P,keys,DEFS,onSet){
  const g=document.createElement('div');g.className='pgrid';
  keys.forEach(key=>{const d=DEFS[key],c=document.createElement('div');c.className='prm';
    c.innerHTML='<div class="top"><span>'+d.n+'</span><span class="pv"></span></div><div class="sl h"><i></i></div>';
    const pv=c.querySelector('.pv');pv.textContent=d.f(P[key]);
    slider(c.querySelector('.sl'),()=>clamp(p2n(d,P[key]),0,1),n=>{P[key]=n2p(d,n);pv.textContent=d.f(P[key]);onSet(key);},false,false);g.appendChild(c);});
  pn.appendChild(g);return g;
}
function mkSeg(pn,label,opts,isOn,onPick){
  const d=document.createElement('div');d.className='pseg';d.innerHTML='<span>'+label+'</span>';
  opts.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o[0];b.classList.toggle('on',isOn(o,i));
    b.onclick=()=>{onPick(o,i);[...d.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===b));};d.appendChild(b);});
  pn.appendChild(d);return d;
}

/* ---------------- header ---------------- */
function sync(){
  $('#bPlay').textContent=S.playing?'■':'▶';$('#bPlay').classList.toggle('on',S.playing);
  $('#bRec').classList.toggle('on',S.rec);$('#bRec').classList.toggle('red',S.rec);$('#bRec').classList.toggle('dark',!S.rec);
  $('#bpmV').textContent=String(S.bpm).padStart(3,'0');$('#bpmD').setAttribute('aria-valuenow',S.bpm);
}
NN.forEach((n,i)=>$('#selKey').add(new Option(n,i)));SCALES.forEach((s,i)=>$('#selScale').add(new Option(s[0],i)));
$('#selKey').value=S.key;$('#selScale').value=S.scale;
$('#selKey').onchange=e=>{S.key=+e.target.value;dirty=true;renderKeys();renderPalette();queueSave();};
$('#selScale').onchange=e=>{S.scale=+e.target.value;dirty=true;renderKeys();renderPalette();queueSave();};
bindPad($('#bPlay'),()=>togglePlay());
$('#bRec').onclick=()=>{S.rec=!S.rec;if(S.rec){takeUndo();toast(S.playing?'REC: TOCÁ LAS TECLAS · METRÓNOMO ON':'REC: DALE PLAY Y TOCÁ · METRÓNOMO ON');}sync();};
$('#bUndo').onclick=doUndo;
/* TEMPO: apretá el número y mové el dedo a los costados (1 BPM cada 5 px) · 50–200 */
const BPMMAX=200;
function setBpm(v){const n=clamp(Math.round(v),50,BPMMAX);if(n===S.bpm)return;S.bpm=n;setDelayTime();sync();queueSave();}
(function bpmDrag(){const el=$('#bpmD');let x0=0,b0=0,on=false;
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{el.setPointerCapture(e.pointerId);}catch(x){}x0=e.clientX;b0=S.bpm;on=true;el.classList.add('drag');});
  el.addEventListener('pointermove',e=>{if(on)setBpm(b0+(e.clientX-x0)/5);});
  const end=()=>{if(!on)return;on=false;el.classList.remove('drag');};
  ['pointerup','pointercancel','lostpointercapture'].forEach(n=>el.addEventListener(n,end));
  el.addEventListener('wheel',e=>{e.preventDefault();setBpm(S.bpm+(e.deltaY<0?1:-1));},{passive:false});})();
/* contador COMPÁS.TIEMPO (sigue lo que se escucha, con la compensación de latencia) */
let cntL='';function cntUi(){const on=S.playing&&S.cur>=0,g=on?(S.g||0):0,txt=(Math.floor(g/16)+1)+'.'+(Math.floor((g%16)/4)+1);if(txt!==cntL){cntL=txt;$('#cntV').textContent=txt;}const b=$('#cntBox');if(b.classList.contains('on')!==on)b.classList.toggle('on',on);}
{const sb=$('#bSir');let sx=0,sy=0;   // mantener = suena; mover el dedo: ↕ tono · ↔ velocidad del lfo (como el pad de sirena)
  bindPad(sb,e=>{sx=e.clientX;sy=e.clientY;SIR.pm=1;SIR.rm=1;sirHold('btn',true);},()=>{SIR.pm=1;SIR.rm=1;sirLive();sirHold('btn',false);sb.style.removeProperty('--sx');sb.style.removeProperty('--sy');});
  sb.addEventListener('pointermove',e=>{if(!sb.classList.contains('dn'))return;const dy=clamp((sy-e.clientY)/60,-1,1),dx=clamp((e.clientX-sx)/110,-1,1);SIR.pm=Math.pow(2,dy);SIR.rm=Math.pow(4,dx);sirLive();
    sb.style.setProperty('--sx',(dx*14).toFixed(1)+'px');sb.style.setProperty('--sy',(-dy*8).toFixed(1)+'px');});}
let clrT=null;
$('#bClr').onclick=()=>{
  const b=$('#bClr');
  if(!b.classList.contains('arm')){b.classList.add('arm','on');b.textContent='¿SEGURO?';clearTimeout(clrT);clrT=setTimeout(()=>{b.classList.remove('arm','on');b.textContent='BORRAR';},3000);return;}
  clearTimeout(clrT);b.classList.remove('arm','on');b.textContent='BORRAR';takeUndo();pat.forEach(r=>r.fill(0));XYR.forEach(a=>a.fill(null));dirty=true;toast('SECUENCIA BORRADA · ↶ DESHACE');queueSave();
};
let CLIPLATCH=false;
const clipReset=()=>{CLIPLATCH=false;};
$('#clipLed').onclick=clipReset;
$$('#tabs button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;$$('#tabs button').forEach(x=>x.classList.toggle('on',x===b));$$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+S.tab));
  if(S.tab==='mix')paints.forEach(p=>p());if(S.tab==='smp')smpUi();if(S.tab==='fx')fxUi();});

/* ---------------- vista SEQ ---------------- */
const cells=[];
(function buildGrid(){
  const g=$('#grid');
  ROWS.forEach((R,r)=>{
    const row=document.createElement('div');row.className='row'+(r===8||r===R_VIN||r===R_SMP2?' sep':'');row.style.setProperty('--c',R.c);
    const lb=document.createElement('div');lb.className='rl';lb.textContent=R.n;row.appendChild(lb);
    let lt=null;
    lb.addEventListener('pointerdown',e=>{e.preventDefault();lt=setTimeout(()=>{lt=null;takeUndo();pat[r].fill(0);XYR[r].fill(null);dirty=true;toast('RENGLÓN '+R.n+' BORRADO · ↶ DESHACE');queueSave();},600);});
    ['pointerup','pointercancel','pointerleave'].forEach(n=>lb.addEventListener(n,()=>{if(lt){clearTimeout(lt);lt=null;S.sel={r,s:S.sel.s};dirty=true;renderPalette();}}));
    for(let s=0;s<8;s++){const el=document.createElement('div');el.className='st';el.dataset.r=r;el.dataset.s=s;el.style.setProperty('--c',R.c);row.appendChild(el);cells.push({el,r,s});}
    g.appendChild(row);
  });
  let paintVal=null;
  const hit=e=>{const el=document.elementFromPoint(e.clientX,e.clientY);return el&&el.classList.contains('st')?el:null;};
  g.addEventListener('pointerdown',e=>{
    const el=hit(e);if(!el)return;e.preventDefault();initAudio();try{g.setPointerCapture(e.pointerId);}catch(x){}
    const r=+el.dataset.r,st=S.page*8+(+el.dataset.s);
    if(ROWS[r].t==='drum'){paintVal=pat[r][st]?0:1;pat[r][st]=paintVal;S.sel={r,s:st};if(paintVal&&ctx)drumPlay(r,ctx.currentTime+.005,.9);}
    else{paintVal=null;stepTap(r,st);}
    dirty=true;renderPalette();queueSave();
  });
  g.addEventListener('pointermove',e=>{
    if(paintVal===null||!(e.buttons&1||e.pointerType==='touch'))return;const el=hit(e);if(!el)return;
    const r=+el.dataset.r,st=S.page*8+(+el.dataset.s);if(ROWS[r].t!=='drum'||pat[r][st]===paintVal)return;
    pat[r][st]=paintVal;dirty=true;queueSave();
  });
  const end=()=>{paintVal=null;};g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
})();
function preview(r,st){
  if(!ctx)return;const R=ROWS[r],t=ctx.currentTime+.005;seqLit(r,st,t,.3);
  if(R.t==='syn')mkVoice(curP(R.k),mtof(scaleNote(seqN[R.k][st],BASEOCT[R.k])),t,.9,bus[1+R.k].inp,.3);
  else if(R.t==='chd')chordPlay(chdSeq[st],false,t,bus[3].inp,.5);
  else if(R.t==='smp'&&sSeq(R)[st])chopPlay(sSeq(R)[st]-1,t,.9,.5);
  else if(R.t==='vin')vinPlay(vinN[R.k][st],false,t,Math.min(1.2,sd()*(vinG[R.k][st]||1)));
}
const vinLbl=(d,ch)=>ch?chordName(((d%7)+7)%7,false).name:noteName(scaleNote(d,VBASE+(S.vinPar.oct||0)));
function stepTap(r,st){
  const was=pat[r][st],isSel=S.sel.r===r&&S.sel.s===st;
  if(!was){pat[r][st]=1;S.sel={r,s:st};if(ROWS[r].t==='smp'&&!sSeq(ROWS[r])[st])sSeq(ROWS[r])[st]=SMPL.sel+1;preview(r,st);}
  else if(isSel){pat[r][st]=0;XYR[r][st]=null;}
  else{S.sel={r,s:st};preview(r,st);}
}
function pageUi(){const sg=$('#pageSeg'),n=STEPS/8;if(S.page>=n)S.page=0;
  if(sg.children.length!==n){sg.innerHTML='';for(let p=0;p<n;p++){const b=document.createElement('button');b.dataset.p=p;b.textContent=(p*8+1)+'–'+(p*8+8);b.onclick=()=>{S.page=p;dirty=true;};sg.appendChild(b);}}
  sg.classList.toggle('p4',n>2);const bs=$('#bSteps');bs.textContent=STEPS;bs.classList.toggle('on',STEPS===32);dirty=true;}
$('#bSteps').onclick=()=>{if(setSteps(STEPS===16?32:16)){pageUi();renderPalette();try{ringUi();}catch(e){}toast(STEPS===32?'32 PASOS · SE DUPLICÓ LO QUE HABÍA · ↶ DESHACE':'16 PASOS · ↶ DESHACE');}};
pageUi();
function refreshSeq(){
  const TAIL={};[[R_SYN,synG[0]],[R_SYN+1,synG[1]],...vinG.map((G_,k)=>[R_VIN+k,G_])].forEach(([r,G_])=>{const L=LEN[r],a=new Uint8Array(MAXS);for(let s=0;s<L;s++)if(pat[r][s]){const g=Math.min(G_[s]||1,L);for(let j=1;j<g;j++)a[(s+j)%L]=1;}TAIL[r]=a;});   // pasos que una nota VINT sigue sonando
  cells.forEach(c=>{
    const st=S.page*8+c.s,on=pat[c.r][st],R=ROWS[c.r];
    c.el.className='st'+(st>=LEN[c.r]?' out':'')+(on?' on':'')+(st%4===0?' b4':'')+(S.cur===st?' cur':'')+(S.sel.r===c.r&&S.sel.s===st?' sel':'')+(!on&&TAIL[c.r]&&TAIL[c.r][st]?' tail':'')+(on&&XYR[c.r][st]?' mo':'');
    let tx='';if(on){if(R.t==='syn')tx=noteName(scaleNote(seqN[R.k][st],BASEOCT[R.k]));else if(R.t==='chd')tx=chordName(chdSeq[st],false).roman;else if(R.t==='smp')tx=sSeq(R)[st]?String(sSeq(R)[st]):'';else if(R.t==='vin')tx=vinLbl(vinN[R.k][st],0);}
    if(c.el.textContent!==tx)c.el.textContent=tx;
  });
  $$('#grid .row').forEach((row,r)=>row.classList.toggle('sel',S.sel.r===r));try{ringUi();}catch(e){}
  $$('#pageSeg button').forEach(b=>{b.classList.toggle('on',+b.dataset.p===S.page);b.classList.toggle('ph',S.cur>=0&&Math.floor(S.cur/8)===+b.dataset.p&&+b.dataset.p!==S.page);});
  const R=ROWS[S.sel.r],st=S.sel.s;let info='PASO '+String(st+1).padStart(2,'0')+' · '+R.n;
  if(R.t==='vin')info+=' · '+vinLbl(vinN[R.k][st],0)+' · GATE '+(vinG[R.k][st]||1);
  if(R.t==='syn')info+=' · '+noteName(scaleNote(seqN[R.k][st],BASEOCT[R.k]))+((synG[R.k][st]||1)>1?' · GATE '+synG[R.k][st]:'');else if(R.t==='chd')info+=' · '+chordName(chdSeq[st],false).name+' · G'+chdGate[st];else if(R.t==='smp'&&sSeq(R)[st])info+=(SMPL.mode==='pads'?' · PAD ':' · CHOP ')+sSeq(R)[st];
  $('#stepInfo').textContent=(S.ring&&!$('#rNote').classList.contains('on'))?'':info+(pat[S.sel.r][st]?' [ON]':'');
}
function kitPrev(quiet){ensureKit();queueSave();renderPalette();if(S.tab==='keys')renderKeys();if(ctx){drumPlay(0,ctx.currentTime+.01,1);drumPlay(1,ctx.currentTime+.32,1);drumPlay(2,ctx.currentTime+.32,1);}if(!quiet)toast('KIT '+KITS[S.kit].n);}
/* ---- menú BATERÍA: kits y patrones ---- */
const kitSheet=$('#kitSheet');
function kitMenu(){
  const kl=$('#kitList'),pl=$('#patList');kl.innerHTML='';pl.innerHTML='';{const ks=$('#kitSw');ks.innerHTML='';swGrid(ks);}
  KITS.forEach((k,i)=>{const b=document.createElement('button');b.className='cap '+(i===S.kit?'':'dark');b.classList.toggle('on',i===S.kit);b.textContent=k.n;b.onclick=()=>{initAudio();S.kit=i;kitPrev(true);kitMenu();};kl.appendChild(b);});
  DPRE.forEach((pr,i)=>{const b=document.createElement('button');b.className='cap dark';b.textContent=pr[0];b.onclick=()=>{initAudio();drumPreset(i);toast('PATRÓN '+pr[0]+' · ↶ DESHACE');kitSheet.classList.remove('on');};pl.appendChild(b);});
}
$('#bKit').onclick=()=>{kitMenu();kitSheet.classList.add('on');};$('#kitX').onclick=()=>kitSheet.classList.remove('on');
kitSheet.addEventListener('pointerdown',e=>{if(e.target===kitSheet)kitSheet.classList.remove('on');});
$('#xySheet').addEventListener('pointerdown',e=>{if(e.target.id==='xySheet')$('#xySheet').classList.remove('on');});
/* ---- partes A B C D ---- */
(function buildParts(){
  const row=$('#partRow');
  PN.forEach((n,i)=>{const b=document.createElement('button');b.className='cap dark';b.dataset.i=i;b.textContent=n;
    let lp=null;
    b.addEventListener('pointerdown',()=>{lp=setTimeout(()=>{lp=null;CP.swallow=true;copyStart(i);},550);});
    ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>{if(lp){clearTimeout(lp);lp=null;}}));
    b.onclick=()=>{initAudio();if(CP.swallow){CP.swallow=false;return;}if(CP.src>=0){copyTo(i);return;}partGo(i);};row.appendChild(b);});
  const rp=document.createElement('button');rp.id='ptRep';rp.className='cap dark sm2';rp.onclick=()=>{const c=[1,2,4,8],i=c.indexOf(S.rep[S.part]);S.rep[S.part]=c[(i+1)%c.length];partUi();queueSave();};row.appendChild(rp);
  const sg=document.createElement('button');sg.id='ptSong';sg.className='cap dark sm2';sg.textContent='SONG';sg.onclick=()=>{S.song=!S.song;loopN=0;partUi();queueSave();toast(S.song?'SONG: A→B→C→D según las repeticiones (×)':'SONG apagado: la parte se repite');};row.appendChild(sg);
  const cp=document.createElement('button');cp.id='ptCopy';cp.className='cap dark';cp.textContent='⧉';cp.setAttribute('aria-label','Copiar la parte en otra');
  cp.onclick=()=>{if(CP.src>=0)copyEnd();else copyStart(S.part);};row.appendChild(cp);
})();
const CP={src:-1,t:null,swallow:false};
function copyStart(i){if(i!==S.part&&!PARTS[i]){toast('LA PARTE '+PN[i]+' ESTÁ VACÍA');return;}CP.src=i;clearTimeout(CP.t);CP.t=setTimeout(copyEnd,7000);partUi();toast('COPIAR '+PN[i]+' → TOCÁ LA PARTE DESTINO');}
function copyEnd(){CP.src=-1;clearTimeout(CP.t);partUi();}
function copyTo(i){const s=CP.src;if(i===s){copyEnd();return;}const ok=partCopy(s,i);copyEnd();if(ok){toast('PARTE '+PN[s]+' COPIADA EN '+PN[i]+' · ↶ DESHACE');try{renderPalette();ringUi();}catch(e){}}}
function partUi(){
  $$('#partRow button[data-i]').forEach(b=>{const i=+b.dataset.i;b.classList.toggle('on',i===S.part);b.classList.toggle('nx',S.next===i);b.classList.toggle('has',!!PARTS[i]&&i!==S.part);b.classList.toggle('src',CP.src===i);b.classList.toggle('dst',CP.src>=0&&CP.src!==i);});
  {const c=$('#ptCopy');if(c)c.classList.toggle('on',CP.src>=0);}
  $('#ptSong').classList.toggle('on',S.song);const r=$('#ptRep');r.textContent='×'+S.rep[S.part];r.style.opacity=S.song?1:.55;
}
function renderPalette(){
  const p=$('#palette'),R=ROWS[S.sel.r],st=S.sel.s;p.innerHTML='';
  p.classList.toggle('empty',R.t==='drum');if(R.t==='drum')return;
  const head=document.createElement('div');head.className='palhead';
  head.innerHTML='<span>'+R.n+' · PASO '+String(st+1).padStart(2,'0')+(pat[S.sel.r][st]?'':' (apagado)')+'</span>';
  const mk=(txt,fn,cls)=>{const b=document.createElement('button');b.className='cap sm '+(cls||'dark');b.textContent=txt;b.onclick=fn;return b;};
  if(R.t==='syn'||R.t==='vin'){head.appendChild(mk('OCT −',()=>{S.po=clamp(S.po-1,-1,2);renderPalette();}));head.appendChild(mk('OCT +',()=>{S.po=clamp(S.po+1,-1,2);renderPalette();}));}
  else if(R.t==='chd'){const b=mk('7ª',()=>{S.seventh=!S.seventh;renderPalette();});b.classList.toggle('on',S.seventh);head.appendChild(b);}
  if(XYR[S.sel.r][st]){const b=mk('〰 MOV ✕',()=>{XYR[S.sel.r][st]=null;dirty=true;queueSave();renderPalette();toast('MOVIMIENTO BORRADO');});b.classList.add('on');b.setAttribute('aria-label','Borrar el movimiento grabado de este paso');head.appendChild(b);}
  p.appendChild(head);
  const row=document.createElement('div');row.className='pal';
  const n=R.t==='syn'||R.t==='vin'?8:R.t==='chd'?7:NSP;
  for(let i=0;i<n;i++){
    const b=document.createElement('button');b.className='cap';
    if(R.t==='syn'){const d=S.po*7+i;b.innerHTML=noteName(scaleNote(d,BASEOCT[R.k]))+'<small>'+(i===7?'1':i+1)+'</small>';
      b.onclick=()=>{initAudio();seqN[R.k][st]=d;pat[S.sel.r][st]=1;preview(S.sel.r,st);dirty=true;queueSave();renderPalette();};}
    else if(R.t==='vin'){const d=S.po*7+i;b.innerHTML=vinLbl(d,0)+'<small>'+(i===7?'1':i+1)+'</small>';b.classList.toggle('pk',vinN[R.k][st]===d&&!!pat[S.sel.r][st]);
      b.onclick=()=>{initAudio();vinN[R.k][st]=d;pat[S.sel.r][st]=1;preview(S.sel.r,st);dirty=true;queueSave();renderPalette();};}
    else if(R.t==='chd'){const c=chordName(i,S.seventh);b.innerHTML=c.roman+'<small>'+c.name+'</small>';
      b.onclick=()=>{initAudio();chdSeq[st]=i;pat[S.sel.r][st]=1;if(ctx)chordPlay(i,S.seventh,ctx.currentTime+.005,bus[3].inp,.5);dirty=true;queueSave();renderPalette();};}
    else{b.classList.toggle('pk',sSeq(R)[st]===i+1&&!!pat[S.sel.r][st]);b.innerHTML=(SMPL.mode==='pads'?'PAD ':'CHOP ')+(i+1)+'<small>'+(smpSrc(i)?(SMPL.mode==='pads'?(smpSrc(i).name||'').slice(0,8):''):'sin sample')+'</small>';
      b.onclick=()=>{initAudio();sSeq(R)[st]=i+1;pat[S.sel.r][st]=1;SMPL.sel=i;preview(S.sel.r,st);dirty=true;queueSave();renderPalette();};}
    row.appendChild(b);
  }
  p.appendChild(row);
  if(R.t==='chd'){const GA=chdGate;
    const gr=document.createElement('div');gr.className='pal g';
    GATES.forEach(gv=>{const b=document.createElement('button');b.className='cap dark';b.classList.toggle('on',GA[st]===gv);b.innerHTML='GATE '+gv;b.onclick=()=>{GA[st]=gv;dirty=true;queueSave();renderPalette();};gr.appendChild(b);});
    p.appendChild(gr);
  }
  if(R.t==='vin'||R.t==='syn'){   // GATE del paso: cuántos pasos queda sonando la nota (1…32)
    const GA=R.t==='vin'?vinG[R.k]:synG[R.k],gr=document.createElement('div');gr.className='pal g vg';const set=v=>{GA[st]=clamp(v,1,STEPS);if(!pat[S.sel.r][st]){pat[S.sel.r][st]=1;}dirty=true;queueSave();renderPalette();};
    const mb=(t,fn,on)=>{const b=document.createElement('button');b.className='cap dark';b.classList.toggle('on',!!on);b.innerHTML=t;b.onclick=fn;gr.appendChild(b);};
    mb('−',()=>set(GA[st]-1));mb('GATE <b>'+GA[st]+'</b>',()=>{},false);mb('+',()=>set(GA[st]+1));
    [1,4,8,16].forEach(v=>mb(String(v),()=>set(v),GA[st]===v));
    p.appendChild(gr);
  }
}

/* ---------------- vista TECLAS ---------------- */
$$('#kmodeSeg button').forEach(b=>b.onclick=()=>{S.kmode=b.dataset.m;renderKeys();});
const curPar=()=>S.kmode==='vin'?S.vinPar:S.kmode.startsWith('syn')?S.par[+S.kmode[3]]:S.chdPar;
const cutPaint=slider($('#cutSl'),()=>curPar().cut,v=>{const P=curPar();P.cut=v;liveSet(P,'cut');queueSave();},false);
function renderKeys(){renderKeysBase();buildParPanel();}
/* arrastre sobre la tecla apretada → xyApply en sus voces */
const XYK=[['NADA','none'],['PITCH','pitch'],['FILTRO','cut'],['RESO','res'],['MOD','mod']];
function xyBind(el,mode,voices){
  let x0=0,y0=0,act=false;const R=()=>el.getBoundingClientRect();
  el.addEventListener('pointerdown',e=>{x0=e.clientX;y0=e.clientY;act=false;const r=R();el.style.setProperty('--px',((e.clientX-r.left)/r.width*100)+'%');el.style.setProperty('--py',((e.clientY-r.top)/r.height*100)+'%');});
  el.addEventListener('pointermove',e=>{if(!el.classList.contains('dn'))return;const dx=e.clientX-x0,dy=y0-e.clientY;if(!act&&Math.hypot(dx,dy)<7)return;act=true;
    const r=R();el.style.setProperty('--px',((e.clientX-r.left)/r.width*100)+'%');el.style.setProperty('--py',((e.clientY-r.top)/r.height*100)+'%');
    const vx=clamp(dx/90,-1,1),vy=clamp(dy/90,-1,1);xyApply(voices(),S.xy[mode],vx,vy);if(el._xr&&ctx)el._xr.push([ctx.currentTime,vx,vy]);});
}
/* con REC: lo que movés el dedo mientras mantenés la tecla queda grabado en el paso */
function xyRecStart(el,targets){el._xt=targets&&targets.length?targets:null;el._xr=el._xt?[]:null;el._x0=ctx?ctx.currentTime:0;}
function xyRecEnd(el){if(el._xt&&ctx)xyRec(el._xt,el._xr,el._x0,ctx.currentTime-el._x0);el._xt=el._xr=null;}
const XYN={none:'—',pitch:'PITCH',cut:'FILTRO',res:'RESO',mod:'MOD'};
function xyMenu(mode){
  const box=$('#xyBox'),C=S.xy[mode];box.innerHTML='';
  const h=document.createElement('div');h.className='phead';h.innerHTML='<span>ARRASTRAR SOBRE LA TECLA · '+(mode==='chd'?'ACORDES':'SYN '+(+mode[3]+1))+'</span>';
  const x=document.createElement('button');x.className='cap dark sm';x.textContent='✕';x.onclick=()=>$('#xySheet').classList.remove('on');h.appendChild(x);box.appendChild(h);
  const row=(lbl,opts,get,set)=>{const r=document.createElement('div');r.className='xyrow';r.innerHTML='<span>'+lbl+'</span>';const g=document.createElement('div');g.className='xyopts';
    opts.forEach(o=>{const b=document.createElement('button');b.className='cap dark';b.textContent=o[0];b.classList.toggle('on',get()===o[1]);b.onclick=()=>{set(o[1]);queueSave();xyMenu(mode);renderKeys();};g.appendChild(b);});r.appendChild(g);box.appendChild(r);};
  row('↔ HORIZONTAL',XYK,()=>C.x,v=>C.x=v);row('↕ VERTICAL',XYK,()=>C.y,v=>C.y=v);
  row('RANGO PITCH',[['±2',2],['±5',5],['±7',7],['±12',12]],()=>C.pr,v=>C.pr=v);
}

function xyBtn(m){const b=document.createElement('button');b.className='cap dark sm xyb';const C=S.xy[m];b.innerHTML='<b>↔</b>'+XYN[C.x]+' <b>↕</b>'+XYN[C.y];b.setAttribute('aria-label','Configurar arrastre sobre la tecla');b.onclick=()=>{xyMenu(m);$('#xySheet').classList.add('on');};return b;}
function renderKeysBase(){
  const m=S.kmode,pads=$('#pads'),opts=$('#kopts');
  [...pads.children].forEach(el=>{if(el._v){try{(Array.isArray(el._v)?el._v:[el._v]).forEach(v=>v.stop());}catch(e){}el._v=null;}});
  pads.innerHTML='';opts.innerHTML='';
  $$('#kmodeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  $('#cutRow').style.display=m==='drum'?'none':'flex';$('#bmRow').style.display=m==='drum'?'none':'flex';if(typeof bmPaint==='function')bmPaint();
  const mkb=(t,fn)=>{const b=document.createElement('button');b.className='cap dark sm';b.textContent=t;b.onclick=fn;return b;};
  const label=document.createElement('span');label.className='grow';
  if(m.startsWith('syn')){
    const k=+m[3];
    opts.append(mkb('◀',()=>{S.pre[k]=(S.pre[k]+SYNP.length-1)%SYNP.length;S.par[k]=Object.assign({},SYNP[S.pre[k]]);renderKeys();queueSave();}),label,mkb('▶',()=>{S.pre[k]=(S.pre[k]+1)%SYNP.length;S.par[k]=Object.assign({},SYNP[S.pre[k]]);renderKeys();queueSave();}),mkb('OCT −',()=>{S.ko[k]=clamp(S.ko[k]-1,-1,2);renderKeys();}),mkb('OCT +',()=>{S.ko[k]=clamp(S.ko[k]+1,-1,2);renderKeys();}),xyBtn(m));
    label.textContent=SYNP[S.pre[k]].n;label.classList.toggle('tight',SYNP[S.pre[k]].n.length>7);
    pads.style.gridTemplateColumns='repeat(7,1fr)';pads.style.gridTemplateRows='1fr 1fr';
    for(let r=1;r>=0;r--)for(let i=0;i<7;i++){
      const idx=r*7+i,d=idx+7*S.ko[k],el=document.createElement('div'),col=CH[1+k].c;el.dataset.d=d;
      el.className='pad cap'+(r?'':' dark');el.style.setProperty('--c',col);
      el.innerHTML=noteName(scaleNote(d,BASEOCT[k]))+'<small>'+(i+1)+'</small>';
      bindPad(el,()=>{if(!ctx)return;el._v=mkVoice(curP(k),mtof(scaleNote(d,BASEOCT[k])),ctx.currentTime+.003,.9,bus[1+k].inp);const st=recWrite(R_SYN+k,d);el._sst=st;xyRecStart(el,st>=0?[{r:R_SYN+k,st}]:null);},()=>{if(el._sst>=0&&ctx)synGate(k,el._sst,ctx.currentTime-el._x0);el._sst=-1;xyRecEnd(el);if(el._v){el._v.stop(ctx.currentTime);el._v=null;}});xyBind(el,m,()=>el._v?[el._v]:null);
      pads.appendChild(el);
    }
    $('#cutSl').style.setProperty('--c',CH[1+k].c);cutPaint();
  }else if(m==='chd'){
    const b7=mkb('7ª',()=>{S.seventh=!S.seventh;renderKeys();});b7.classList.toggle('on',S.seventh);
    const pv=()=>{S.chdPar=Object.assign({},CHDPRE[S.chdPre]);renderKeys();queueSave();};
    opts.append(mkb('◀',()=>{S.chdPre=(S.chdPre+CHDPRE.length-1)%CHDPRE.length;pv();}),label,mkb('▶',()=>{S.chdPre=(S.chdPre+1)%CHDPRE.length;pv();}),b7,xyBtn(m));
    label.textContent=CHDPRE[S.chdPre].n+' · '+NN[S.key]+' '+SCALES[S.scale][0];
    pads.style.gridTemplateColumns='repeat(4,1fr)';pads.style.gridTemplateRows='1fr 1fr';
    for(let i=0;i<7;i++){
      const c=chordName(i,S.seventh),el=document.createElement('div');el.dataset.c=i;
      el.className='pad cap'+(i<4?'':' dark');el.style.setProperty('--c',CH[3].c);
      el.innerHTML='<span class="rn">'+c.roman+'</span><small>'+c.name+'</small>';
      bindPad(el,()=>{if(!ctx)return;el._v=chordPlay(i,S.seventh,ctx.currentTime+.003,bus[3].inp);el._st=recWrite(R_CHD,i);el._t0=ctx.currentTime;xyRecStart(el,el._st>=0?[{r:R_CHD,st:el._st}]:null);},()=>{xyRecEnd(el);if(el._v){el._v.forEach(v=>v.stop(ctx.currentTime));el._v=null;if(el._st>=0)recGate(el._st,ctx.currentTime-el._t0);el._st=-1;}});xyBind(el,'chd',()=>el._v||null);
      pads.appendChild(el);
    }
    const info=document.createElement('div');info.className='lcd';info.style.cssText='display:flex;align-items:center;justify-content:center;text-align:center;padding:6px';info.textContent='REC: mantené el acorde para fijar el GATE';pads.appendChild(info);
  }else if(m==='vin'){
    const P=S.vinPar,pv=i=>{S.vinPre=i;S.vinPar=vinFresh(i);vinFx();renderKeys();queueSave();};
    const bc=mkb('ACORDE',()=>{S.vch=!S.vch;renderKeysBase();queueSave();});bc.classList.toggle('on',S.vch);
    opts.append(mkb('◀',()=>pv((S.vinPre+VINP.length-1)%VINP.length)),label,mkb('▶',()=>pv((S.vinPre+1)%VINP.length)),mkb('OCT −',()=>{S.vko=clamp(S.vko-1,-1,2);renderKeysBase();}),mkb('OCT +',()=>{S.vko=clamp(S.vko+1,-1,2);renderKeysBase();}),bc);
    label.textContent=P.n;label.classList.toggle('tight',P.n.length>9);
    pads.style.gridTemplateColumns='repeat(7,1fr)';pads.style.gridTemplateRows='1fr 1fr';
    for(let r=1;r>=0;r--)for(let i=0;i<7;i++){
      const idx=r*7+i,d=idx+7*S.vko,el=document.createElement('div');el.dataset.d=d;
      el.className='pad cap'+(r?'':' dark');el.style.setProperty('--c',CH[6].c);
      el.innerHTML=vinLbl(d,S.vch)+'<small>'+(i+1)+'</small>';
      bindPad(el,()=>{if(!ctx)return;el._v=vinPlay(d,S.vch,ctx.currentTime+.003,0,.9);el._st=vinRec(S.vch?[d,d+2,d+4]:[d]);el._t0=ctx.currentTime;xyRecStart(el,el._st.map(o=>({r:R_VIN+o.k,st:o.st})));},
        ()=>{xyRecEnd(el);if(el._v){el._v.stop(ctx.currentTime);el._v=null;}if(el._st&&el._st.length){const h=ctx.currentTime-el._t0;el._st.forEach(o=>vinGate(o,h));}el._st=null;});
      xyBind(el,m,()=>el._v?[el._v]:null);pads.appendChild(el);
    }
    $('#cutSl').style.setProperty('--c',CH[6].c);cutPaint();
  }else{
    label.textContent='KIT: '+KITS[S.kit].n;const ba=mkb('AJUSTES '+(S.parOpen?'▴':'▾'),()=>{S.parOpen=!S.parOpen;renderKeys();});ba.classList.toggle('on',!!S.parOpen);ba.id='bParD';
    opts.append(mkb('◀',()=>{S.kit=(S.kit+KITS.length-1)%KITS.length;kitPrev();if(S.parOpen)buildParPanel();}),label,mkb('▶',()=>{S.kit=(S.kit+1)%KITS.length;kitPrev();if(S.parOpen)buildParPanel();}),ba);
    pads.style.gridTemplateColumns='repeat(4,1fr)';pads.style.gridTemplateRows='1fr 1fr';
    DR.forEach((d,i)=>{
      const el=document.createElement('div');el.className='pad cap dark';el.style.setProperty('--c',d.c);el.innerHTML=d.n;
      el.classList.toggle('dsel',!!S.parOpen&&S.dsel===i);el.classList.toggle('ed',dkEdited(i));
      bindPad(el,()=>{if(S.parOpen&&S.dsel!==i){S.dsel=i;buildParPanel();$$('#pads .pad').forEach((p,j)=>p.classList.toggle('dsel',j===i));}if(!ctx)return;drumPlay(i,ctx.currentTime+.003,1);recWrite(i,1);});pads.appendChild(el);
    });
  }
}

/* ---- parámetros básicos + LFO (SYN 1, SYN 2, ACORDES) ---- */
const WAVES=[['SIN','sine'],['TRI','triangle'],['SAW','sawtooth'],['SQR','square']];
const LFOSH=[['SIN','sine'],['TRI','triangle'],['SQR','square'],['SAW','sawtooth']];
const LFODEST=[['CORTE',0],['TONO',1],['VOL',2]];
const tfmt=v=>v<.1?Math.round(v*1000)+' ms':v.toFixed(2)+' s';
const PCT=v=>Math.round(v*100)+'%',HZ=v=>v>=1000?(v/1000).toFixed(1)+' kHz':Math.round(v)+' Hz';
const PDEF={
  det:{n:'DETUNE',min:0,max:30,f:v=>Math.round(v)+' ct'},
  sub:{n:'SUB',min:0,max:1,f:PCT},
  res:{n:'RESO',min:.5,max:16,exp:1,f:v=>v.toFixed(1)},
  dec:{n:'DECAIMIENTO',min:.02,max:2.5,exp:1,f:tfmt},
  sus:{n:'SUSTAIN',min:0,max:1,f:PCT},
  atk:{n:'ATAQUE',min:.002,max:1.5,exp:1,f:tfmt},
  rel:{n:'RELEASE',min:.03,max:2,exp:1,f:tfmt},
  lfoR:{n:'RATE',min:.1,max:20,exp:1,f:v=>v.toFixed(1)+' Hz'},
  lfoD:{n:'PROFUNDIDAD',min:0,max:1,f:PCT}};
$('#bPar').onclick=()=>{S.parOpen=!S.parOpen;buildParPanel();};
function buildParPanel(){
  const pn=$('#parPanel'),m=S.kmode,isDrum=m==='drum';
  $('#bPar').textContent='AJUSTES '+(S.parOpen?'▴':'▾');$('#bPar').classList.toggle('on',S.parOpen);
  pn.innerHTML='';pn.classList.toggle('on',!!S.parOpen);$('#v-keys').classList.toggle('paron',!!S.parOpen);if(isDrum){drumPanel(pn);return;}if(m==='vin'){vinPanel(pn);return;}
  const k=m==='chd'?-1:+m[3],P=curPar(),col=k<0?CH[3].c:CH[1+k].c;pn.style.setProperty('--c',col);
  $('#cutSl').style.setProperty('--c',col);cutPaint();if(!S.parOpen)return;
  const head=(txt,withReset)=>{const h=document.createElement('div');h.className='phead';h.innerHTML='<span>'+txt+'</span>';
    if(withReset){const b=document.createElement('button');b.className='cap dark sm';b.textContent='↺ RESET';b.onclick=()=>{Object.assign(P,k<0?CHDPRE[S.chdPre]:SYNP[S.pre[k]]);['w1','det','sub','res','cut','lfoR','lfoS','lfoD','lfoT'].forEach(x=>liveSet(P,x));renderKeys();queueSave();toast('PARÁMETROS RESTAURADOS');};h.appendChild(b);}
    pn.appendChild(h);};
  const seg=(label,opts,key)=>mkSeg(pn,label,opts,o=>P[key]===o[1],o=>{P[key]=o[1];liveSet(P,key);queueSave();});
  const grid=keys=>mkGrid(pn,P,keys,PDEF,key=>{liveSet(P,key);queueSave();});
  head((k<0?'ACORDES':'SYN '+(k+1))+' · SONIDO',true);
  seg('ONDA',WAVES,'w1');grid(['det','sub','res']);
  head('ENVOLVENTE');grid(['atk','dec','sus','rel']);
  head('LFO');
  seg('FORMA',LFOSH,'lfoS');seg('DESTINO',LFODEST,'lfoT');
  const rg=grid(['lfoR','lfoD']),rateEl=rg.firstChild,rateDim=()=>{rateEl.style.opacity=P.sync?.3:1;rateEl.style.pointerEvents=P.sync?'none':'';};
  mkSeg(pn,'TEMPO',[['LIBRE',0],['1/2',.5],['1/4',1],['1/8',2],['1/8T',3],['1/16',4]],o=>(P.sync||0)===o[1],o=>{P.sync=o[1];liveSet(P,'sync');rateDim();queueSave();});
  pn.insertBefore(pn.lastChild,rg);rateDim();
}

/* ---- LUCES: lo que toca el secuenciador (o lo que previsualizás al programar) se ilumina en su módulo,
   TECLAS o SMP, al ritmo de lo que se escucha (con la compensación de latencia) ---- */
function smp2Ui(){const on=!!S.smp2,rows=$$('#grid .row');if(rows[R_SMP2])rows[R_SMP2].hidden=!on;const st=$$('#strips .strip');if(st[7])st[7].hidden=!on;$('#strips').classList.toggle('n9',on);
  const pk=$$('#rPickBox .cap');if(pk[R_SMP2])pk[R_SMP2].hidden=!on;if(!on&&S.sel.r===R_SMP2){S.sel={r:R_SMP,s:S.sel.s};renderPalette();}dirty=true;}
const LQ=[],LIT=new Set();let SPB=0,SPT=null;
function seqLit(r,s,t,dur){LQ.push({r,s,t,end:t+Math.max(.09,Math.min(dur||.13,4))});if(LQ.length>256)LQ.splice(0,LQ.length-256);}
function litEls(r,s){const R=ROWS[r];
  if(S.tab==='smp')return R.t==='smp'&&sSeq(R)[s]?[sPads.children[sSeq(R)[s]-1]]:[];
  if(S.tab!=='keys')return [];const m=S.kmode,pads=$('#pads');
  if(R.t==='drum')return m==='drum'?[pads.children[r]]:[];
  if(R.t==='syn')return m==='syn'+R.k?[...pads.querySelectorAll('[data-d="'+seqN[R.k][s]+'"]')]:[];
  if(R.t==='chd')return m==='chd'?[pads.querySelector('[data-c="'+chdSeq[s]+'"]')]:[];
  if(R.t==='vin')return m==='vin'?[...pads.querySelectorAll('[data-d="'+vinN[R.k][s]+'"]')]:[];
  return [];}
function litTick(){if(!ctx)return;const now=vNow();
  for(let i=LQ.length-1;i>=0;i--){const e=LQ[i];if(e.t>now)continue;LQ.splice(i,1);if(e.end<now)continue;
    litEls(e.r,e.s).forEach(el=>{if(!el)return;el.classList.add('seqlit');el._le=Math.max(el._le||0,e.end);LIT.add(el);});}
  LIT.forEach(el=>{if(el._le<=now||!el.isConnected){el.classList.remove('seqlit');LIT.delete(el);}});}

/* ---- VINTAGE: AJUSTES (drawbars del órgano, motor, rotor) ---- */
const VDEF={atk:PDEF.atk,dec:{n:'DECAIMIENTO',min:.05,max:4,exp:1,f:tfmt},sus:PDEF.sus,rel:PDEF.rel,res:PDEF.res,
  drv:{n:'DRIVE',min:0,max:1,f:PCT},env:{n:'ENV FILTRO',min:0,max:1,f:PCT},click:{n:'CLICK',min:0,max:1,f:PCT},
  ix:{n:'BRILLO FM',min:.2,max:6,exp:1,f:v=>v.toFixed(1)},bell:{n:'CAMPANA',min:0,max:1,f:PCT},vk:{n:'VIBRATO (MOD)',min:0,max:1,f:PCT}};
const ROTN=[['NO','off'],['LENTO','slow'],['RÁPIDO','fast'],['TRÉM','trem'],['VIBR','vib'],['ENS','ens']];
const DBN=['16′','5⅓′','8′','4′','2⅔′','2′','1⅗′','1⅓′','1′'];
function vinPanel(pn){
  const P=S.vinPar,col=CH[6].c;pn.style.setProperty('--c',col);$('#cutSl').style.setProperty('--c',col);cutPaint();if(!S.parOpen)return;
  const head=(txt,btn)=>{const h=document.createElement('div');h.className='phead';h.innerHTML='<span>'+txt+'</span>';if(btn)h.appendChild(btn);pn.appendChild(h);};
  const rb=document.createElement('button');rb.className='cap dark sm';rb.textContent='↺ RESET';rb.onclick=()=>{S.vinPar=vinFresh(S.vinPre);vinFx();renderKeys();queueSave();toast(S.vinPar.n+' COMO VIENE');};
  head('VINTAGE · '+P.n,rb);
  const grid=keys=>mkGrid(pn,P,keys,VDEF,key=>{if(key==='drv')vinFx();else liveSet(P,key);queueSave();});
  if(P.e==='org'){
    const box=document.createElement('div');box.className='dbars';
    DBN.forEach((nm,i)=>{const c=document.createElement('div');c.className='dbar';c.innerHTML='<b></b><div class="sl v"><i></i></div><span>'+nm+'</span>';
      const vb=c.querySelector('b');vb.textContent=P.db[i];
      slider(c.querySelector('.sl'),()=>P.db[i]/8,n=>{const v=Math.round(n*8);if(v!==P.db[i]){P.db[i]=v;vb.textContent=v;liveSet(P,'db');queueSave();}},true,false);box.appendChild(c);});
    head('DRAWBARS');pn.appendChild(box);
    mkSeg(pn,'PERCUSIÓN',[['NO',0],['2ª',2],['3ª',3]],o=>(P.perc||0)===o[1],o=>{P.perc=o[1];queueSave();});
    grid(['click','drv','vk','rel']);}
  else if(P.e==='ep')grid(['ix','bell','dec','rel','drv','vk']);
  else if(P.e==='ana')grid(['res','env','atk','dec','sus','rel','drv','vk']);
  else if(P.e==='clav')grid(['res','env','dec','drv']);
  else grid(['atk','rel','res','vk']);
  mkSeg(pn,'ROTOR',ROTN,o=>P.fx===o[1],o=>{P.fx=o[1];vinFx();queueSave();renderKeysBase();});
}
const SWDEF={sw:{n:'SWING DE LA BATERÍA',min:0,max:1,f:v=>v<.02?'RECTO · 50%':Math.round(50+v*25)+'%'}};
function swGrid(box){mkGrid(box,S,['sw'],SWDEF,()=>queueSave()).classList.add('one');}

/* ---- BATERÍA: edición por golpe (como los AJUSTES de los sintes) ---- */
const DKDEF={
  tune:{n:'AFINACIÓN',min:-12,max:12,f:v=>Math.abs(v)<.05?'0 st':(v>0?'+':'−')+Math.abs(v).toFixed(1)+' st'},
  dec:{n:'DECAIMIENTO',min:.25,max:3,exp:1,f:v=>'×'+v.toFixed(2)},
  tone:{n:'TONO',min:0,max:1,f:v=>v<.48?'OSCURO '+Math.round((.5-v)*200)+'%':v>.52?'BRILLO '+Math.round((v-.5)*200)+'%':'NEUTRO'},
  drv:{n:'DRIVE',min:0,max:1,f:PCT},
  hit:{n:'GOLPE',min:0,max:1,f:v=>Math.round(v*200)+'%'},
  snap:{n:'CUERPO ↔ RUIDO',min:0,max:1,f:v=>v<.48?'CUERPO '+Math.round((.5-v)*200)+'%':v>.52?'RUIDO '+Math.round((v-.5)*200)+'%':'PAREJO'},
  lvl:{n:'NIVEL',min:0,max:1.5,f:PCT},
  pan:{n:'PANEO',min:-1,max:1,f:v=>Math.abs(v)<.04?'CENTRO':(v<0?'IZQ ':'DER ')+Math.round(Math.abs(v)*100)}};
S.dsel=S.dsel||0;let dkT=null;
function dkBake(i){clearTimeout(dkT);dkT=setTimeout(()=>{const p=drumRe(i);if(p&&p.then)p.then(ok=>{if(ok&&ctx)drumPlay(i,ctx.currentTime+.01,1);});},140);}
const DKBAKE=['dec','tone','drv','hit','snap'];
const dkEdited=j=>Object.keys(DKD).some(k=>Math.abs((S.dk[j][k]??DKD[k])-DKD[k])>.005);
const padEd=()=>{if(S.kmode==='drum')$$('#pads .pad').forEach((p,j)=>p.classList.toggle('ed',dkEdited(j)));};
function drumPanel(pn){
  const i=S.dsel,E=S.dk[i],col=DR[i].c;pn.style.setProperty('--c',col);
  const head=(txt,btn)=>{const h=document.createElement('div');h.className='phead';h.innerHTML='<span>'+txt+'</span>';if(btn)h.appendChild(btn);pn.appendChild(h);};
  const mk=(t,fn)=>{const b=document.createElement('button');b.className='cap dark sm';b.textContent=t;b.onclick=fn;return b;};
  head(DR[i].n+' · KIT '+KITS[S.kit].n,mk('↺ RESET',()=>{Object.assign(E,DKD);drumRe(i);buildParPanel();padEd();queueSave();toast(DR[i].n+' RESTAURADO');}));
  mkGrid(pn,E,['tune','dec','hit','snap','tone','drv','lvl','pan'],DKDEF,key=>{if(DKBAKE.includes(key))dkBake(i);queueSave();padEd();});
  const r=document.createElement('div');r.className='shbtns';
  head('GROOVE');swGrid(pn);
  r.appendChild(mk('↺ TODO EL KIT COMO VIENE',()=>{S.dk.forEach(e=>Object.assign(e,DKD));for(let j=0;j<8;j++)drumRe(j);buildParPanel();padEd();queueSave();toast('BATERÍA COMO EL KIT');}));
  pn.appendChild(r);
}

/* ---------------- PITCH / MOD: ruedas táctiles + inclinación del celular ---------------- */
const BM={bend:0,mod:0},TILT={on:false,got:false,b0:null,g0:null,b:0,g:0,touch:{bend:false,mod:false}};
const bendW=$('#bendW'),modW=$('#modW');
function bmPaint(){
  const bi=bendW.querySelector('i'),bb=bendW.querySelector('b'),mi=modW.querySelector('i'),mb=modW.querySelector('b');
  const x=BM.bend;bi.style.left=(x<0?50+x*50:50)+'%';bi.style.width=Math.abs(x)*50+'%';bb.style.left=(50+x*50)+'%';
  mi.style.left='0';mi.style.width=BM.mod*100+'%';mb.style.left=(BM.mod*100)+'%';
  const col=CH[S.kmode==='syn1'?2:S.kmode==='chd'?3:S.kmode==='vin'?6:1].c;bendW.style.setProperty('--c',col);modW.style.setProperty('--c',col);
}
function setBend(x){BM.bend=clamp(x,-1,1);BEND=BM.bend*200;bmDirty=true;bmPaint();}
function setMod(x){BM.mod=clamp(x,0,1);MOD=BM.mod;bmDirty=true;bmPaint();}
function wheel(el,kind){
  const upd=e=>{const r=el.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,0,1);
    if(kind==='bend')setBend(Math.abs(x-.5)<.04?0:(x-.5)*2);else setMod(x);};
  el.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{el.setPointerCapture(e.pointerId);}catch(x){}TILT.touch[kind]=true;upd(e);});
  el.addEventListener('pointermove',e=>{if(TILT.touch[kind])upd(e);});
  const end=()=>{if(!TILT.touch[kind])return;TILT.touch[kind]=false;if(kind==='bend')setBend(0);};   // pitch vuelve al centro; mod se queda
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
wheel(bendW,'bend');wheel(modW,'mod');
function onOri(e){
  if(e.beta==null||e.gamma==null)return;TILT.got=true;if(!e._m)TILT.gotO=true;
  TILT.b+=(e.beta-TILT.b)*.3;TILT.g+=(e.gamma-TILT.g)*.3;
  if(TILT.b0===null){TILT.b=e.beta;TILT.g=e.gamma;TILT.b0=e.beta;TILT.g0=e.gamma;return;}
  if(!TILT.touch.bend){const d=TILT.g-TILT.g0,dz=3;setBend(Math.abs(d)<dz?0:(d-Math.sign(d)*dz)/28);}      // inclinar a los costados = pitch
  if(!TILT.touch.mod){const d=Math.abs(TILT.b-TILT.b0);setMod(d<4?0:(d-4)/30);}                           // inclinar adelante/atrás = mod
}
function tiltDiag(extra){
  let pp='?';try{const f=document.permissionsPolicy||document.featurePolicy;if(f&&f.allowsFeature)pp=['accelerometer','gyroscope','magnetometer'].map(x=>x+':'+(f.allowsFeature(x)?'sí':'NO')).join(' ');}catch(e){}
  const inFrame=(()=>{try{return window.self!==window.top;}catch(e){return true;}})();
  const L=['DIAGNÓSTICO SENSOR','en visor/iframe: '+(inFrame?'sí':'no'),'conexión segura: '+(window.isSecureContext?'sí':'NO'),
    'DeviceOrientation: '+(window.DeviceOrientationEvent?'existe':'NO existe'),'sistema: '+(IS_IOS?'iPhone/iPad':IS_AND?'Android':'otro')+' · dirección: '+location.protocol.replace(':',''),'pide permiso: '+(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'?'sí':'no'),
    'política del marco: '+pp,'eventos recibidos: '+(TILT.gotO?'orientación':TILT.got?'solo acelerómetro':'NINGUNO')];
  if(extra)L.push(extra);
  let d=$('#tiltDiag');if(!d){d=document.createElement('div');d.id='tiltDiag';d.onclick=()=>d.remove();document.body.appendChild(d);}
  d.textContent=L.join('\n');
}
function tiltOff(msg){TILT.on=false;window.removeEventListener('deviceorientation',onOri);window.removeEventListener('devicemotion',onMot);$('#bmRow').classList.remove('tilt');setBend(0);setMod(0);if(msg)toast(msg);}
/* respaldo: si no llegan eventos de orientación, se calcula la inclinación con la gravedad del acelerómetro */
function onMot(e){if(TILT.gotO)return;const g=e.accelerationIncludingGravity;if(!g||g.x==null||g.y==null||g.z==null)return;
  onOri({beta:Math.atan2(g.y,g.z)*180/Math.PI,gamma:Math.atan2(-g.x,Math.hypot(g.y,g.z))*180/Math.PI,_m:true});}
function tiltStart(){
  TILT.on=true;TILT.got=false;TILT.gotO=false;TILT.b0=TILT.g0=null;$('#bmRow').classList.add('tilt');
  window.addEventListener('deviceorientation',onOri);window.addEventListener('devicemotion',onMot);
  toast('ACEL: AGARRÁ EL CEL COMO PARA TOCAR');
  setTimeout(()=>{if(TILT.on&&!TILT.got){tiltOff('SIN DATOS DEL SENSOR');tiltDiag('permiso informado: '+TPERM+'\n\n'+tiltHelp());}},2200);
}
const UA=navigator.userAgent||'',IS_IOS=/iP(hone|ad|od)/.test(UA)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),IS_AND=/Android/i.test(UA);
let TPERM='—';
function tiltHelp(){
  const L=[];const sch=location.protocol;
  if(sch==='file:'||sch==='content:')L.push('⚠ Está abierta como ARCHIVO ('+sch+'): el navegador no deja dar permiso de sensores a archivos. Abrila desde un enlace https.');
  if(IS_AND)L.push('CÓMO ACTIVARLO EN ANDROID (Chrome):','1. Abrí el groovebox desde un enlace https en Chrome (no el archivo descargado ni dentro de la app de Claude).','2. Chrome › ⋮ › Configuración › Configuración de sitios › Sensores de movimiento → Permitir.','3. En la página: ícono junto a la dirección › Permisos › Sensores de movimiento → Permitir, y recargá.','4. Tocá ACEL.');
  else if(IS_IOS)L.push('CÓMO ACTIVARLO EN IPHONE:','1. Abrí la página en Safari, no dentro de otra app (Claude, WhatsApp, Archivos).','2. Si alguna vez tocaste “No permitir”: cerrá Safari del todo y volvé a abrir, o Ajustes › Safari › Avanzado › Datos de sitios web › borrá este sitio.','3. Tocá ACEL y elegí “Permitir”.');
  else L.push('Este navegador no entrega datos de movimiento (en la compu es normal).');
  return L.join('\n');
}
function tiltDenied(r,dt){toast('PERMISO DE MOVIMIENTO DENEGADO');tiltDiag('permiso: '+r+(IS_IOS?(dt<350?' (iOS respondió sin mostrar el aviso)':' (se rechazó el aviso)'):'')+'\n\n'+tiltHelp());}
/* el permiso se pide como primera cosa dentro del toque */
$('#bTilt').onclick=()=>{
  if(TILT.on){tiltOff('ACEL APAGADO');return;}
  const DOE=window.DeviceOrientationEvent,DME=window.DeviceMotionEvent,t0=performance.now();let pr=null;
  try{if(DOE&&typeof DOE.requestPermission==='function')pr=DOE.requestPermission();else if(DME&&typeof DME.requestPermission==='function')pr=DME.requestPermission();}catch(e){pr=Promise.reject(e);}
  initAudio();
  try{navigator.permissions&&navigator.permissions.query({name:'accelerometer'}).then(s=>{TPERM=s.state;}).catch(()=>{TPERM='no se puede consultar';});}catch(e){}
  if(!pr){tiltStart();return;}
  pr.then(r=>{TPERM=r;if(r==='granted'||!IS_IOS)tiltStart();else tiltDenied(r,performance.now()-t0);})   // en Android el resultado solo informa la configuración: igual se escucha
    .catch(e=>{if(!IS_IOS){tiltStart();return;}toast('SENSOR NO DISPONIBLE ACÁ');tiltDiag('error: '+(e&&(e.name||e.message)||e)+'\n\n'+tiltHelp());});
};
$('#bCtr').onclick=()=>{TILT.b0=null;TILT.g0=null;toast('CENTRO RECALIBRADO');};
bmPaint();

/* ---------------- vista MIX: 6 canales + master ---------------- */
(function buildMix(){
  const box=$('#strips');
  const html=(nm,mid,bot)=>'<div class="nm">'+nm+'</div><div class="sends">'+mid+'</div><div class="db"></div><div class="fad"><div class="sl v"><i></i><div class="meter"><em></em><b></b></div></div></div>'+bot;
  CH.forEach((c,i)=>{
    const s=document.createElement('div');s.className='strip';s.style.setProperty('--c',c.c);
    const mini=(l,cls)=>'<div class="mini">'+l+'<div class="sl h knob '+(cls||'')+'"><i></i></div></div>';
    s.innerHTML=html(c.s,mini('PAN','pan')+mini('DLY')+mini('REV')+mini('MOD')+mini('DST'),'<button class="cap dark m">M</button><button class="cap dark s">S</button><button class="cap dark t">THR</button>');
    box.appendChild(s);
    const sls=s.querySelectorAll('.sl');
    slider(sls[0],()=>(c.pan+1)/2,v=>{c.pan=Math.abs(v-.5)<.05?0:(v-.5)*2;applyCh(i);queueSave();},false);
    slider(sls[1],()=>c.dly,v=>{c.dly=v;applyCh(i);queueSave();},false);
    slider(sls[2],()=>c.rev,v=>{c.rev=v;applyCh(i);queueSave();},false);
    slider(sls[3],()=>c.mod,v=>{c.mod=v;applyCh(i);queueSave();},false);
    slider(sls[4],()=>c.dst,v=>{c.dst=v;applyCh(i);queueSave();},false);
    slider(sls[5],()=>c.vol,v=>{c.vol=v;applyCh(i);queueSave();},true);
    c.meter=s.querySelector('.meter em');c.dbEl=s.querySelector('.db');c.meterB=s.querySelector('.meter b');
    const bm=s.querySelector('.m'),bs=s.querySelector('.s'),bt=s.querySelector('.t');
    bm.onclick=()=>{c.mute=!c.mute;bm.classList.toggle('on',c.mute);CH.forEach((_,j)=>applyCh(j));};
    bs.onclick=()=>{c.solo=!c.solo;bs.classList.toggle('on',c.solo);CH.forEach((_,j)=>applyCh(j));};
    bindPad(bt,()=>{c.thr=true;bt.classList.add('on');applyCh(i);},()=>{c.thr=false;bt.classList.remove('on');applyCh(i);});
  });
  const m=document.createElement('div');m.className='strip';m.style.setProperty('--c','#e8e4d6');
  m.classList.add('mst');m.innerHTML=html('MST','<div class="mini">LIMIT<b id="limR">0.0</b></div><div class="mini">PEAK<b id="pkR">-∞</b></div>','<button class="lamp" id="clipM">CLIP</button><div style="height:28px"></div><div style="height:28px"></div>');
  box.appendChild(m);
  slider(m.querySelector('.sl.v'),()=>S.master,v=>{S.master=v;applyAll();queueSave();},true);
  $('#clipM').onclick=clipReset;
  window.masterMeter=m.querySelector('.meter em');window.masterDb=m.querySelector('.db');window.masterMeterB=m.querySelector('.meter b');
})();
let peakHold=0,MPH=0;
function drawMeters(){
  if(!ctx)return;
  anM.getFloatTimeDomainData(mbuf);let pk=0;for(let k=0;k<mbuf.length;k++){const v=Math.abs(mbuf[k]);if(v>pk)pk=v;}
  if(pk>=.995)CLIPLATCH=true;
  const hot=CLIPLATCH;$('#clipLed').classList.toggle('hot',hot);
  if(S.tab!=='mix')return;
  $('#clipM').classList.toggle('hot',hot);
  CH.forEach((c,i)=>{const b=bus[i];b.an.getByteTimeDomainData(b.buf);let m=0;for(let k=0;k<b.buf.length;k++){const v=Math.abs(b.buf[k]-128)/128;if(v>m)m=v;}c._l=Math.max(m,(c._l||0)*.88);c.meter.style.height=Math.min(100,c._l*140)+'%';c._ph=Math.max(c._l*1.4,(c._ph||0)-.007);c.meterB.style.bottom=Math.min(98,c._ph*100)+'%';});
  peakHold=Math.max(pk,peakHold*.96);window.masterMeter.style.height=Math.min(100,peakHold*100)+'%';MPH=Math.max(peakHold,MPH-.006);window.masterMeterB.style.bottom=Math.min(98,MPH*100)+'%';
  const dbs=v=>v>.0005?((v=20*Math.log10(v))>=0?'+':'')+v.toFixed(1)+' dB':'-∞';CH.forEach(c=>{const t=dbs(c.vol);if(c.dbEl.textContent!==t)c.dbEl.textContent=t;});{const t=dbs(S.master);if(window.masterDb.textContent!==t)window.masterDb.textContent=t;}
  $('#limR').textContent=(lim.reduction||0).toFixed(1);$('#pkR').textContent=peakHold>.001?(20*Math.log10(peakHold)).toFixed(1):'-∞';
}

/* ---------------- vista FX: pad XY + buses ---------------- */
const FXT=['REV','DLY','DST','FLT','REP'],FXC={REV:'#c9a6ff',DLY:'#ffb347',DST:'#ff5a4a',FLT:'#4df0c4',REP:'#7dff9a'};
const XNAME={REV:['TONO','ENVÍO'],DLY:['FEEDBACK','ENVÍO'],DST:['DRIVE','MEZCLA'],FLT:['CORTE','RESO'],REP:['DIVISIÓN','—']};
const FXMODES=[['PAD','PAD'],['CAD','CADENA'],['DLY','DELAY'],['REV','REVERB'],['MOD','MOD'],['DST','DIST'],['MST','MST']];
const FXDEF={
  drive:{n:'DRIVE',min:0,max:1,f:PCT},fb:{n:'FEEDBACK',min:0,max:.92,f:PCT},tone:{n:'TONO',min:300,max:9000,exp:1,f:HZ},ret:{n:'RETORNO',min:0,max:1.2,f:PCT},
  size:{n:'TAMAÑO',min:.4,max:5,exp:1,f:v=>v.toFixed(1)+' s'},pre:{n:'PRE-DELAY',min:0,max:120,f:v=>Math.round(v)+' ms'},damp:{n:'AMORTIG.',min:1000,max:14000,exp:1,f:HZ},
  rate:{n:'VELOCIDAD',min:.1,max:8,exp:1,f:v=>v.toFixed(1)+' Hz'},depth:{n:'PROFUNDIDAD',min:0,max:1,f:PCT},mfb:{n:'FEEDBACK',min:0,max:.85,f:PCT},
  comp:{n:'COMPRESIÓN',min:0,max:1,f:PCT},sat:{n:'SATURACIÓN',min:0,max:1,f:PCT},mtone:{n:'TONO',min:0,max:1,f:v=>((v-.5)*24>=0?'+':'')+((v-.5)*24).toFixed(0)+' dB'},vol:{n:'VOLUMEN',min:0,max:1,f:PCT}};
(function buildFx(){
  const mseg=$('#fxMode');
  FXMODES.forEach(m=>{const b=document.createElement('button');b.textContent=m[1];b.dataset.m=m[0];b.onclick=()=>{S.fxMode=m[0];fxUi();};mseg.appendChild(b);});
  const seg=$('#fxSeg');
  FXT.forEach(t=>{XYH[t]=XYH[t]||{on:false,x:.5,y:.7};const b=document.createElement('button');b.textContent=t;b.dataset.t=t;
    b.onclick=()=>{const H=XYH[t];if(t===S.mfx&&H.on&&!xy._d){mfxOff(t);H.on=false;toast(t+' SUELTO');}   // tocar el efecto trabado lo suelta
      else if(t!==S.mfx){const P=XYH[S.mfx];if(P.on&&!S.hold&&!xy._d){mfxOff(S.mfx);P.on=false;}S.mfx=t;}   // con HOLD, los trabados siguen sonando al cambiar de efecto
      XY.on=XYH[S.mfx].on;XY.x=XYH[S.mfx].x;XY.y=XYH[S.mfx].y;fxUi();};seg.appendChild(b);});
  const xy=$('#xy'),dot=xy.querySelector('.dot'),vl=xy.querySelector('.vl'),hl=xy.querySelector('.hl');
  const move=e=>{const r=xy.getBoundingClientRect();XY.x=clamp((e.clientX-r.left)/r.width,0,1);XY.y=clamp(1-(e.clientY-r.top)/r.height,0,1);XYH[S.mfx]={on:true,x:XY.x,y:XY.y};mfxOn(S.mfx,XY.x,XY.y);paintXY();};
  xy.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();try{xy.setPointerCapture(e.pointerId);}catch(x){}xy._d=true;XY.on=true;move(e);});
  xy.addEventListener('pointermove',e=>{if(xy._d)move(e);});
  const up=()=>{if(!xy._d)return;xy._d=false;if(!S.hold){mfxOff(S.mfx);XY.on=false;XYH[S.mfx].on=false;paintXY();}else heldUi();};
  xy.addEventListener('pointerup',up);xy.addEventListener('pointercancel',up);
  window.paintXY=()=>{dot.classList.toggle('on',XY.on);vl.style.display=hl.style.display=XY.on?'block':'none';dot.style.left=XY.x*100+'%';dot.style.top=(1-XY.y)*100+'%';vl.style.left=XY.x*100+'%';hl.style.top=(1-XY.y)*100+'%';};
  $('#bHold').onclick=()=>{S.hold=!S.hold;$('#bHold').classList.toggle('on',S.hold);
    if(!S.hold){for(const t in XYH){const H=XYH[t];if(H.on&&!(xy._d&&t===S.mfx)){mfxOff(t);H.on=false;}}XY.on=XYH[S.mfx].on;paintXY();heldUi();}};   // apagar HOLD suelta todos
  window.heldUi=()=>{$$('#fxSeg button').forEach(b=>b.classList.toggle('held',!!(XYH[b.dataset.t]&&XYH[b.dataset.t].on)));};
  const sp=$('#sirPad');let sy0=0,sx0=0;
  sp.addEventListener('pointerdown',e=>{e.preventDefault();try{sp.setPointerCapture(e.pointerId);}catch(x){}sy0=e.clientY;sx0=e.clientX;sp._d=true;sirHold('pad',true);});
  sp.addEventListener('pointermove',e=>{if(!sp._d)return;SIR.pm=Math.pow(2,clamp((sy0-e.clientY)/60,-1,1));SIR.rm=Math.pow(4,clamp((e.clientX-sx0)/110,-1,1));sirLive();});
  const sup=()=>{if(!sp._d)return;sp._d=false;SIR.pm=1;SIR.rm=1;sirLive();sirHold('pad',false);};
  sp.addEventListener('pointerup',sup);sp.addEventListener('pointercancel',sup);
  $('#bLatch').onclick=()=>sirHold('latch',!sirHolds.has('latch'));
})();
function buildFxBus(){
  const bx=$('#fxBus');bx.innerHTML='';const m=S.fxMode;if(m==='PAD')return;if(m==='CAD'){buildChain(bx);return;}
  const box=document.createElement('div');box.className='busbox';
  const sel=document.createElement('select');sel.setAttribute('aria-label','Presets de FX');sel.add(new Option('PRESETS DE FX…',-1));FXPRE.forEach((p,i)=>sel.add(new Option(p[0],i)));
  sel.onchange=()=>{const i=+sel.value;if(i<0)return;fxPreset(i);buildFxBus();queueSave();toast('FX: '+FXPRE[i][0]);};box.appendChild(sel);
  const bc=document.createElement('canvas');bc.id='busc';bc.setAttribute('aria-hidden','true');box.appendChild(bc);
  fxParams(box,m);
  bx.appendChild(box);
}
function fxParams(box,m){
  const ch=()=>queueSave();
  const keyMap=(P,pairs)=>{const o={};return new Proxy(P,{get:(t,k)=>t[pairs[k]||k],set:(t,k,v)=>{t[pairs[k]||k]=v;return true;}});};
  if(m==='DLY'){const P=FXP.dly;
    mkSeg(box,'DIVISIÓN',DIVS,(o,i)=>P.div===i,(o,i)=>{P.div=i;applyFx();ch();});
    mkGrid(box,P,['fb','tone','ret'],FXDEF,()=>{applyFx();ch();});}
  else if(m==='REV'){const P=FXP.rev;mkGrid(box,P,['size','pre','damp','ret'],FXDEF,()=>{applyFx();ch();});}
  else if(m==='MOD'){const P=FXP.mod;
    mkSeg(box,'MODO',[['CHORUS',0],['FLANGER',1]],o=>P.mode===o[1],o=>{P.mode=o[1];applyFx();ch();});
    mkGrid(box,keyMap(P,{mfb:'fb'}),['rate','depth','mfb','ret'],FXDEF,()=>{applyFx();ch();});}
  else if(m==='DST'){const P=FXP.dst;mkGrid(box,P,['drive','tone','ret'],FXDEF,()=>{applyFx();ch();});
    const n=document.createElement('div');n.className='pnote';n.textContent='Distorsión como envío: subí DST en cada canal del MIX. Acá definís cuánta (DRIVE), el tono y el retorno.';box.appendChild(n);}
  else if(m==='MST'){const P=FXP.mst;
    mkGrid(box,keyMap(P,{mtone:'tone'}),['comp','sat','mtone'],FXDEF,()=>{applyFx();ch();});
    const V={get vol(){return S.master;},set vol(v){S.master=v;applyAll();ch();}};mkGrid(box,V,['vol'],FXDEF,()=>{});
    const n=document.createElement('div');n.className='pnote';n.textContent='El LIMITER del master está siempre activo. La luz CLIP de arriba se prende si algo llega a 0 dBFS (tocala para limpiar).';box.appendChild(n);}
}
/* ===== CADENA DE FX como patch de cables — dos modos =====
   ENVÍOS: DELAY · REVERB · MOD · DIST de los envíos del mixer (cada uno con IN y OUT) → MASTER
   SALIDA: los efectos del pad XY: MIX → FILTER · DIST · REPEAT → MASTER, y de dónde toman las tiradas DELAY ↗ / REVERB ↗
   Arrastrar de OUT a IN = cable · tocar un cable = nivel / quitar · sacar un enchufe de un IN y soltarlo afuera = desconectar · tocar un módulo = configurarlo */
const CFS={key:'patch',pre:PATCHPRE,srcs:PSRC,mods:PSRC,ch:CHS,cycle:patchCycle,path:()=>true,
  names:{dly:'DELAY',rev:'REVERB',mod:'MOD',dst:'DIST',mst:'SALIDA'},cols:{dly:'#ffb347',rev:'#c9a6ff',mod:'#7ab8ff',dst:'#ff5a4a'},
  io:k=>({i:1,o:1}),grid:{dly:[0,0],rev:[1,0],mod:[0,1],dst:[1,1]},rows:2,
  sum:k=>{if(k==='dly'){const P=FXP.dly;return (DIVS[P.div]?DIVS[P.div][0]:'')+' · FB '+Math.round(P.fb*100)+'%';}if(k==='rev')return FXP.rev.size.toFixed(1)+' s · PRE '+Math.round(FXP.rev.pre)+' ms';
    if(k==='mod')return (FXP.mod.mode?'FLANGER':'CHORUS')+' · '+FXP.mod.rate.toFixed(1)+' Hz';return 'DRIVE '+Math.round(FXP.dst.drive*100)+'%';},
  inLbl:'↓ envío MIX',act:()=>ctx?fxAct():{dly:1,rev:1,mod:1,dst:1},
  modSel:(sp,k,h)=>{h.innerHTML='<b style="color:'+CFS.cols[k]+'">'+CFS.names[k]+'</b> · entra lo que mandan los canales del MIX + los cables';fxParams(sp,{dly:'DLY',rev:'REV',mod:'MOD',dst:'DST'}[k]);},
  mstNote:'<b>SALIDA</b> · los retornos entran con el MIX a la cadena de SALIDA: pasan por FILTER, DIST, REPEAT y las tiradas del pad antes del master · un efecto sin cable acá solo se oye a través de otro'};
const CFO={key:'out',pre:PATCHPRE2,srcs:OSRC,mods:['mix','flt','dist','rep','tdly','trev'],ch:CHO,cycle:outCycle,path:outPath,
  names:{mix:'MIX',flt:'FILTER',dist:'DIST',rep:'REPEAT',tdly:'DELAY',trev:'REVERB',mst:'MASTER'},cols:{mix:'#e8e5de',flt:'#4df0c4',dist:'#ff5a4a',rep:'#7dff9a',tdly:'#ffb347',trev:'#c9a6ff'},
  io:k=>k==='mix'?{o:1}:{i:1,o:1},grid:{mix:[0,0],flt:[1,0],dist:[0,1],rep:[1,1],tdly:[0,2],trev:[1,2]},rows:3,
  sum:k=>({mix:'canales + retornos de envíos',flt:'pad · CORTE ↔ RESO ↕',dist:'pad · DRIVE ↔ MEZCLA ↕',rep:'pad · DIVISIÓN ↔',tdly:'pad · FEEDBACK ↔ ENVÍO ↕',trev:'pad · TONO ↔ ENVÍO ↕'}[k]),
  inLbl:'',act:()=>({mix:1,flt:1,dist:1,rep:1,tdly:1,trev:1}),
  modSel:(sp,k,h)=>{h.innerHTML='<b style="color:'+CFO.cols[k]+'">'+CFO.names[k]+'</b> · '+({mix:'la salida de todos los canales del mixer',flt:'se toca con el pad XY de FX (FLT) o el botón FILTER del modo DJ',dist:'se toca con el pad XY de FX (DST)',rep:'se toca con el pad XY de FX (REP)',tdly:'delay propio del pad (pad DLY o botón DELAY del modo DJ): toma el tiempo, tono y retorno de DELAY',trev:'reverb propia del pad (pad REV o botón REVERB del modo DJ): toma el tamaño y el retorno de REVERB'}[k]);
    if(k==='dist'){const P=FXP.dst;const n=document.createElement('div');n.className='pnote';n.textContent='El DIST de salida usa la curva del pad: DRIVE ↔ y MEZCLA ↕ mientras lo mantenés.';sp.appendChild(n);}
    if(k==='tdly')fxParams(sp,'DLY');if(k==='trev')fxParams(sp,'REV');},
  mstNote:'<b>MASTER</b> · siempre tiene que llegarle el MIX por algún camino (si no, quedaría en silencio)'};
const PCF=()=>S.chainMode==='out'?CFO:CFS;
/* DESCONECTAR un módulo: saca todos sus cables y puentea lo que pasaba por él (lo que entraba va directo a donde salía) */
function chainUnplug(F,id){const L=FXP[F.key],ins=L.filter(c=>c[1]===id),outs=L.filter(c=>c[0]===id);if(!ins.length&&!outs.length)return 'nada';
  const nx=L.filter(c=>c[0]!==id&&c[1]!==id);
  for(const a of ins)for(const b of outs){const nc=[a[0],b[1],Math.min(a[2],b[2])];if(nc[0]===nc[1]||nx.some(c=>c[0]===nc[0]&&c[1]===nc[1])||F.cycle([...nx,nc]))continue;if(F.key==='patch'&&!PSRC.includes(nc[0]))continue;nx.push(nc);}
  if(!F.path(nx))return 'silencio';FXP[F.key].length=0;nx.forEach(c=>FXP[F.key].push(c));F.ch.apply();queueSave();return 'ok';}
function chainUnplugAll(F){FXP[F.key]=F.key==='out'?[['mix','mst',1]]:[];F.ch.apply();queueSave();}
const PCH={sel:null,drag:null,G:null};
function patchGeo(W,H,d){const F=PCF(),p=10*d,w=(W-3*p)/2,h=(F.rows===3?66:80)*d,gy=(F.rows===3?32:46)*d,M={};
  for(const k of F.mods){const [cx,cy]=F.grid[k],x=p+cx*(w+p),y=p+cy*(h+gy),io=F.io(k);M[k]={x,y,w,h};if(io.i){M[k].ix=x+22*d;M[k].iy=y+h-20*d;}if(io.o){M[k].ox=x+w-22*d;M[k].oy=y+h-20*d;}}
  const my=p+F.rows*h+(F.rows-1)*gy+40*d,mh=H-my-p;M.mst={x:p,y:my,w:W-2*p,h:mh,slots:F.srcs.map((k,i)=>({k,x:p+96*d+(W-2*p-106*d)*(i+.5)/F.srcs.length,y:my+mh-22*d}))};return M;}
const pjIn=(G,b,a)=>b==='mst'?(G.mst.slots.find(s=>s.k===a)||G.mst.slots[0]):{x:G[b].ix,y:G[b].iy};
const pbez=(x1,y1,x2,y2,d)=>{const sag=36*d+Math.hypot(x2-x1,y2-y1)*.28;return [x1,y1,x1,y1+sag,x2,y2+sag,x2,y2];};
const bezAt=(B,t)=>{const u=1-t;return [u*u*u*B[0]+3*u*u*t*B[2]+3*u*t*t*B[4]+t*t*t*B[6],u*u*u*B[1]+3*u*u*t*B[3]+3*u*t*t*B[5]+t*t*t*B[7]];};
function buildChain(bx){const F=PCF(),L=()=>FXP[F.key],box=document.createElement('div');box.className='busbox chain';
  mkSeg(box,'MODO',[['ENVÍOS','snd'],['SALIDA (PAD XY)','out']],o=>(S.chainMode||'snd')===o[1],o=>{S.chainMode=o[1];PCH.sel=null;PCH.drag=null;buildFxBus();});
  const same=(A,B)=>A.length===B.length&&A.every(c=>B.some(x=>x[0]===c[0]&&x[1]===c[1]&&Math.abs(x[2]-c[2])<.01));
  mkSeg(box,'CADENA',F.pre.map((p,i)=>[p[0],i]),o=>same(L(),F.pre[o[1]][1]),o=>{FXP[F.key]=F.pre[o[1]][1].map(c=>c.slice());F.ch.apply();PCH.sel=null;buildFxBus();queueSave();toast('CADENA '+(F.key==='out'?'DE SALIDA':'DE ENVÍOS')+': '+F.pre[o[1]][0]);});
  {const row=document.createElement('div');row.className='chainx';const b=document.createElement('button');b.className='cap dark';b.textContent='DESCONECTAR TODO';
    b.onclick=()=>{chainUnplugAll(F);PCH.sel=null;buildFxBus();toast(F.key==='out'?'SALIDA SIN EFECTOS: MIX → MASTER directo (las tiradas del pad no salen)':'ENVÍOS DESCONECTADOS: los efectos de envío no vuelven al master');};row.appendChild(b);box.appendChild(row);}
  const cv=document.createElement('canvas');cv.id='patchCv';cv.style.height=(F.rows===3?380:330)+'px';cv.setAttribute('aria-label','Cadena de efectos: patch de cables');box.appendChild(cv);
  const n=document.createElement('div');n.className='pnote';n.id='patchMsg';n.textContent=F.key==='out'?'Efectos de salida del pad XY: cableá el orden de FILTER, DIST, REPEAT, DELAY y REVERB (por ejemplo REVERB OUT → FILTER IN para filtrar la cola) · siempre tiene que haber camino del MIX al MASTER':'Arrastrá de OUT a IN para conectar · tocá un cable para su nivel · sacá un enchufe de un IN y soltalo afuera para desconectar · tocá un módulo para configurarlo';box.appendChild(n);
  const sp=document.createElement('div');sp.id='patchSel';box.appendChild(sp);bx.appendChild(box);patchSelUi();patchTouch(cv);}
function patchSelUi(){const sp=$('#patchSel');if(!sp)return;sp.innerHTML='';const F=PCF(),L=FXP[F.key],S0=PCH.sel;if(!S0)return;
  const h=document.createElement('div');h.className='psh';sp.appendChild(h);
  if(S0.k==='cab'){const c=L[S0.i];if(!c){PCH.sel=null;return;}h.innerHTML='<b style="color:'+F.cols[c[0]]+'">'+F.names[c[0]]+'</b> → <b style="color:'+(F.cols[c[1]]||'#e8e5de')+'">'+F.names[c[1]]+'</b>';
    const V={get lvl(){return FXP[F.key][S0.i]?FXP[F.key][S0.i][2]:0;},set lvl(v){F.ch.level(S0.i,v);}};mkGrid(sp,V,['lvl'],{lvl:{n:'NIVEL DEL CABLE',min:0,max:1.5,f:PCT}},()=>queueSave());
    const q=document.createElement('button');q.className='cap dark';q.textContent='DESCONECTAR CABLE';q.onclick=()=>{const nx=L.filter((_,i)=>i!==S0.i);if(!F.path(nx)){toast('NO: EL MIX QUEDARÍA SIN CAMINO AL MASTER (SILENCIO)');return;}L.splice(S0.i,1);PCH.sel=null;F.ch.apply();patchSelUi();queueSave();};sp.appendChild(q);}
  else if(S0.k==='mod'){const id=S0.id,u=document.createElement('button');u.className='cap dark';u.textContent='DESCONECTAR '+F.names[id];
    u.onclick=()=>{const r=chainUnplug(F,id);if(r==='nada'){toast(F.names[id]+' YA ESTÁ DESCONECTADO');return;}if(r==='silencio'){toast('NO: EL MIX QUEDARÍA SIN CAMINO AL MASTER (SILENCIO)');return;}
      toast(F.names[id]+' DESCONECTADO · lo que pasaba por él va directo');patchSelUi();};
    sp.appendChild(u);F.modSel(sp,id,h);sp.insertBefore(u,sp.children[1]);}
  else h.innerHTML=F.mstNote;}
function patchTouch(cv){
  const at=e=>{const r=cv.getBoundingClientRect(),d=cv.width/r.width;return {x:(e.clientX-r.left)*d,y:(e.clientY-r.top)*d,d};};
  const near=(p,x,y,R)=>x!=null&&Math.hypot(p.x-x,p.y-y)<=R;
  const target=(p,G,R)=>{const F=PCF();for(const k of F.mods){const m=G[k];if(m.ix==null)continue;if(near(p,m.ix,m.iy,R)||(p.x>=m.x&&p.x<=m.x+m.w&&p.y>=m.y&&p.y<=m.y+m.h))return k;}const m=G.mst;if(p.x>=m.x&&p.x<=m.x+m.w&&p.y>=m.y-10*p.d&&p.y<=m.y+m.h)return 'mst';return null;};
  cv.addEventListener('pointerdown',e=>{const G=PCH.G;if(!G)return;const F=PCF(),L=FXP[F.key],p=at(e),R=22*p.d;e.preventDefault();initAudio();try{cv.setPointerCapture(e.pointerId);}catch(x){}
    for(const k of F.mods)if(near(p,G[k].ox,G[k].oy,R)){PCH.drag={a:k,x:p.x,y:p.y,id:e.pointerId};return;}   // sacar un cable nuevo de OUT
    for(let i=L.length-1;i>=0;i--){const [a,b]=L[i],J=pjIn(G,b,a);if(near(p,J.x,J.y,R)){const c=L.splice(i,1)[0];PCH.drag={a,x:p.x,y:p.y,id:e.pointerId,lift:c,i};PCH.sel=null;patchSelUi();return;}}   // desenchufar (se aplica al soltar)
    let best=-1,bd=14*p.d;L.forEach(([a,b],i)=>{const J=pjIn(G,b,a),B=pbez(G[a].ox,G[a].oy,J.x,J.y,p.d);for(let t=0;t<=1;t+=1/28){const q=bezAt(B,t),dd=Math.hypot(q[0]-p.x,q[1]-p.y);if(dd<bd){bd=dd;best=i;}}});
    if(best>=0){PCH.sel={k:'cab',i:best};patchSelUi();return;}
    const tg=target(p,G,R),inBox=F.mods.find(k=>{const m=G[k];return p.x>=m.x&&p.x<=m.x+m.w&&p.y>=m.y&&p.y<=m.y+m.h;});
    PCH.sel=tg==='mst'?{k:'mst'}:tg?{k:'mod',id:tg}:inBox?{k:'mod',id:inBox}:null;patchSelUi();});
  cv.addEventListener('pointermove',e=>{const D=PCH.drag;if(!D||D.id!==e.pointerId)return;const p=at(e);D.x=p.x;D.y=p.y;});
  const up=e=>{const D=PCH.drag;if(!D||D.id!==e.pointerId)return;PCH.drag=null;const F=PCF(),L=FXP[F.key],G=PCH.G,p=at(e),b=target(p,G,26*p.d),back=()=>{if(D.lift)L.splice(D.i,0,D.lift);};
    if(!b||b===D.a){if(D.lift){if(!F.path(L)){back();toast('NO: EL MIX QUEDARÍA SIN CAMINO AL MASTER (SILENCIO)');return;}F.ch.apply();toast('CABLE QUITADO · '+F.names[D.lift[0]]+' → '+F.names[D.lift[1]]);queueSave();}return;}
    if(L.some(c=>c[0]===D.a&&c[1]===b)){back();toast('YA ESTÁ CONECTADO');return;}
    const nc=[D.a,b,D.lift?D.lift[2]:1];if(F.cycle([...L,nc])){back();toast('ESO ARMA UN LAZO SIN FIN: '+F.names[b]+' ya vuelve a '+F.names[D.a]);return;}
    const nx=[...L,nc];if(!F.path(nx)){back();toast('NO: EL MIX QUEDARÍA SIN CAMINO AL MASTER (SILENCIO)');return;}
    L.push(nc);F.ch.apply();PCH.sel={k:'cab',i:L.length-1};patchSelUi();queueSave();toast(F.names[D.a]+' → '+F.names[b]);};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);}
function drawPatch(){const cv=$('#patchCv');if(!cv||!cv.isConnected)return;const F=PCF(),L=FXP[F.key],{c,W,H,d}=cvFit(cv),G=PCH.G=patchGeo(W,H,d),A=F.act();
  const jack=(x,y,col,on)=>{c.fillStyle='#1b1b1b';c.beginPath();c.arc(x,y,10*d,0,7);c.fill();c.strokeStyle='rgba(232,229,222,.55)';c.lineWidth=1.6*d;c.stroke();c.fillStyle=on?col:'#050505';c.beginPath();c.arc(x,y,(on?6:4.5)*d,0,7);c.fill();};
  const D=PCH.drag,used=k=>L.some(x=>x[0]===k)||(D&&D.a===k),fed=k=>L.some(x=>x[1]===k);
  for(const k of F.mods){const m=G[k],col=F.cols[k],on=A[k],lv=ctx&&m.ox!=null?F.ch.lvl(k):0,sel=PCH.sel&&PCH.sel.k==='mod'&&PCH.sel.id===k;
    c.globalAlpha=on?1:.55;c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.roundRect?c.roundRect(m.x,m.y,m.w,m.h,12*d):c.rect(m.x,m.y,m.w,m.h);c.fill();c.strokeStyle=sel?'#fff':hexA(col,.7);c.lineWidth=(sel?2:1.2)*d;c.stroke();
    c.fillStyle=col;c.font=UIF(12,d,700);c.textAlign='left';c.textBaseline='top';c.fillText(F.names[k],m.x+10*d,m.y+8*d);
    c.fillStyle='rgba(232,229,222,.6)';c.font=UIF(8.5,d,400);c.fillText(F.sum(k),m.x+10*d,m.y+24*d);
    if(m.ox!=null){c.fillStyle='rgba(232,229,222,.14)';c.fillRect(m.x+m.w-34*d,m.y+11*d,24*d,4*d);c.fillStyle=col;c.fillRect(m.x+m.w-34*d,m.y+11*d,24*d*lv,4*d);}   // nivel
    c.fillStyle='rgba(232,229,222,.5)';c.font=UIF(7.5,d,400);c.textBaseline='middle';   // rótulos al costado de cada jack
    if(m.ix!=null){c.textAlign='left';c.fillText('IN'+(F.inLbl?' · '+F.inLbl:''),m.ix+15*d,m.iy);}if(m.ox!=null){c.textAlign='right';c.fillText('OUT',m.ox-15*d,m.oy);}c.textBaseline='top';
    if(m.ix!=null)jack(m.ix,m.iy,'#e8e5de',fed(k));if(m.ox!=null)jack(m.ox,m.oy,col,used(k));c.globalAlpha=1;}
  const M=G.mst;c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.roundRect?c.roundRect(M.x,M.y,M.w,M.h,12*d):c.rect(M.x,M.y,M.w,M.h);c.fill();c.strokeStyle=PCH.sel&&PCH.sel.k==='mst'?'#fff':'rgba(232,229,222,.4)';c.lineWidth=1.2*d;c.stroke();
  c.fillStyle='#e8e5de';c.font=UIF(12,d,700);c.textAlign='left';c.textBaseline='top';c.fillText(F.names.mst,M.x+10*d,M.y+8*d);c.fillStyle='rgba(232,229,222,.5)';c.font=UIF(8,d,400);c.fillText(F.key==='out'?'al master →':'retornos → pad XY',M.x+10*d,M.y+26*d);
  M.slots.forEach(s=>{jack(s.x,s.y,F.cols[s.k],L.some(x=>x[0]===s.k&&x[1]==='mst'));c.fillStyle=hexA(F.cols[s.k],.8);c.font=UIF(7.5,d,400);c.textAlign='center';c.fillText(F.names[s.k],s.x,s.y-22*d);});
  const cable=(B,col,lv,sel)=>{c.lineCap='round';c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=8*d;c.beginPath();c.moveTo(B[0],B[1]);c.bezierCurveTo(B[2],B[3],B[4],B[5],B[6],B[7]);c.stroke();
    if(sel){c.strokeStyle='#fff';c.lineWidth=7.5*d;c.stroke();}c.strokeStyle=hexA(col,.6+.4*lv);c.lineWidth=5*d;c.stroke();
    if(lv>.05){c.strokeStyle=hexA('#ffffff',Math.min(.6,lv*.8));c.lineWidth=1.6*d;c.stroke();}   // brilla con la señal
    [[B[0],B[1]],[B[6],B[7]]].forEach(([x,y])=>{c.fillStyle=col;c.beginPath();c.arc(x,y,6.5*d,0,7);c.fill();c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.4*d;c.stroke();});};
  L.forEach(([a,b,v],i)=>{const J=pjIn(G,b,a),lv=(ctx?F.ch.lvl(a):0)*Math.min(1,v);c.globalAlpha=v<.02?.35:1;cable(pbez(G[a].ox,G[a].oy,J.x,J.y,d),F.cols[a],lv,PCH.sel&&PCH.sel.k==='cab'&&PCH.sel.i===i);c.globalAlpha=1;});
  if(D&&G[D.a]){cable(pbez(G[D.a].ox,G[D.a].oy,D.x,D.y,d),F.cols[D.a],.5,true);}
}
function fxUi(){
  $$('#fxMode button').forEach(b=>b.classList.toggle('on',b.dataset.m===S.fxMode));
  const pad=S.fxMode==='PAD';$('#fxPad').style.display=pad?'flex':'none';$('#fxBus').classList.toggle('on',!pad);
  $$('#fxSeg button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.mfx));heldUi();
  const n=XNAME[S.mfx];$('#xy').style.setProperty('--c',FXC[S.mfx]);$('#xy .xl').textContent=n[0]+' →';$('#xy .yl').textContent='↑ '+n[1];
  $('#fxInfo').textContent=S.mfx+(XYH[S.mfx]&&XYH[S.mfx].on?' · TRABADO (tocá '+S.mfx+' para soltarlo)':S.hold?' · HOLD: lo que toques queda sonando':' · tocá y mantené el pad');paintXY();buildFxBus();
}

/* ---------------- vista SMP: sampler (grabar · chop en 4 teclas · efectos) ---------------- */
const qName=q=>(q===.25?'¼ TIEMPO':q===.5?'½ TIEMPO':q===1?'1 TIEMPO':q+' TIEMPOS')+(q>=4&&q%4===0?' · '+(q/4)+' COMPÁS'+(q>4?'ES':''):'');
const SMPDEF={
  pitch:{n:'PITCH',min:-12,max:12,f:v=>(v>=0?'+':'')+v.toFixed(1)+' st'},
  filt:{n:'FILTRO',min:0,max:1,f:v=>v<.47?'LP '+HZ(200*Math.pow(90,v/.47)):v>.53?'HP '+HZ(20*Math.pow(300,(v-.53)/.47)):'OFF'},
  crush:{n:'CRUSH',min:0,max:1,f:v=>v>.02?Math.round(16-v*13)+' bits':'OFF'},
  gain:{n:'VOLUMEN',min:0,max:1.5,f:PCT}};
const wave=$('#wave');let wctx=null;
/* ZOOM de la onda: WV = ventana visible (fracción del sample). Pellizco con dos dedos (o rueda), doble toque = entera */
const WV={a:0,b:1,src:null};
const wvSpan=()=>WV.b-WV.a,wvX=(f,W)=>(f-WV.a)/wvSpan()*W;
function wvSet(a,b){const sp=clamp(b-a,.004,1);a=clamp(a,0,1-sp);WV.a=a;WV.b=a+sp;}
function drawWave(){
  const cv=wave,r=cv.getBoundingClientRect(),dpr=window.devicePixelRatio||1,W=Math.max(10,Math.floor(r.width*dpr)),H=Math.max(10,Math.floor(r.height*dpr));
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const c=cv.getContext('2d');c.clearRect(0,0,W,H);
  const PM=SMPL.mode==='pads',P=PM?SMPL.pads[SMPL.sel]:(SMPL.buf?{buf:SMPL.buf}:null);
  if(!P){c.fillStyle='#7b828c';c.font=(12*dpr)+'px '+getComputedStyle(document.body).getPropertyValue('--mono');c.textAlign='center';c.fillText(PM?'PAD '+(SMPL.sel+1)+' VACÍO · grabá, elegí un audio, DEMO o ⧉ COPIAR':'SIN SAMPLE · grabá, elegí un audio o probá DEMO',W/2,H/2);return;}
  if(WV.src!==P.buf){WV.src=P.buf;WV.a=0;WV.b=1;}
  const d=P.buf.getChannelData(0),N=d.length,mid=H/2,X=f=>wvX(f,W),sp=wvSpan();
  if(PM){const C=SMPL.chops[SMPL.sel],a=X(C.ps??0),b=X(C.pe??1);c.fillStyle='rgba(0,0,0,.45)';c.fillRect(0,0,Math.max(0,a),H);c.fillRect(b,0,Math.max(0,W-b),H);c.fillStyle='rgba(255,210,122,.12)';c.fillRect(a,0,b-a,H);}
  else SMPL.chops.forEach((C,i)=>{c.fillStyle=i===SMPL.sel?'rgba(255,210,122,.16)':'rgba(255,255,255,.025)';c.fillRect(X(C.s),0,X(C.e)-X(C.s),H);});
  c.strokeStyle=CH[5].c;c.lineWidth=1;c.beginPath();
  for(let x=0;x<W;x++){const i0=Math.floor((WV.a+x/W*sp)*N),i1=Math.max(i0+1,Math.floor((WV.a+(x+1)/W*sp)*N)),st=Math.max(1,Math.floor((i1-i0)/48));let mn=1,mx=-1;for(let i=i0;i<i1&&i<N;i+=st){const v=d[i];if(v<mn)mn=v;if(v>mx)mx=v;}if(mx<mn)continue;c.moveTo(x+.5,mid-mx*mid*.92);c.lineTo(x+.5,mid-mn*mid*.92);}
  c.stroke();
  {const C=SMPL.chops[SMPL.sel];if(C&&(C.sync==='pitch'||C.sync==='tempo')){const a=PM?(C.ps??0):C.s,b=PM?(C.pe??1):C.e,n=Math.round(smpQ(C,smpLen(SMPL.sel)));   // grilla de tiempos
    if(n>=1&&n<=64){c.fillStyle='rgba(255,210,122,.5)';for(let k=1;k<n;k++){const x=Math.round(X(a+(b-a)*k/n));c.fillRect(x,k%4===0?0:H*.3,Math.max(1,dpr),k%4===0?H:H*.4);}}}}
  if(PM){const C=SMPL.chops[SMPL.sel];c.fillStyle='#ffd27a';c.fillRect(Math.round(X(C.ps??0)),0,3*dpr,H);c.fillRect(Math.round(X(C.pe??1))-3*dpr,0,3*dpr,H);
    c.font='700 '+(13*dpr)+'px sans-serif';c.textAlign='left';c.fillText('PAD '+(SMPL.sel+1),Math.max(0,X(C.ps??0))+6*dpr,15*dpr);}
  else SMPL.chops.forEach((C,i)=>{const sel=i===SMPL.sel;c.fillStyle=sel?'#ffd27a':'#c9ffee';c.globalAlpha=sel?1:.55;c.fillRect(Math.round(X(C.s)),0,sel?3*dpr:1.5*dpr,H);c.fillRect(Math.round(X(C.e))-(sel?3*dpr:1.5*dpr),0,sel?3*dpr:1.5*dpr,H);
    c.globalAlpha=1;c.font='700 '+(13*dpr)+'px sans-serif';c.textAlign='left';const lx=X(C.s)+5*dpr;if(lx>-10*dpr&&lx<W)c.fillText(String(i+1),lx,15*dpr);});
  if(sp<.999){   // zoom: cuánto y dónde estás
    c.font='400 '+(10*dpr)+'px sans-serif';c.textAlign='right';c.fillStyle='rgba(232,229,222,.7)';c.fillText('ZOOM ×'+(1/sp<10?(1/sp).toFixed(1):Math.round(1/sp))+' · 2 TOQUES = TODO',W-6*dpr,H-6*dpr);
    c.fillStyle='rgba(232,229,222,.25)';c.fillRect(0,H-2*dpr,W,2*dpr);c.fillStyle='rgba(255,210,122,.9)';c.fillRect(WV.a*W,H-2*dpr,Math.max(2*dpr,sp*W),2*dpr);}
}
(function waveTouch(){
  let drag=null,pinch=null,lastTap=0,moved=false;const PT=new Map();
  const fr=x=>{const r=wave.getBoundingClientRect();return clamp(WV.a+(x-r.left)/r.width*wvSpan(),0,1);};
  const pinchStart=()=>{const [p,q]=[...PT.values()],r=wave.getBoundingClientRect(),mx=(p.x+q.x)/2;pinch={d0:Math.max(8,Math.abs(p.x-q.x)),a0:WV.a,s0:wvSpan(),c0:WV.a+(mx-r.left)/r.width*wvSpan()};drag=null;};
  wave.addEventListener('pointerdown',e=>{e.preventDefault();try{wave.setPointerCapture(e.pointerId);}catch(x){}PT.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=false;
    if(PT.size>=2){pinchStart();return;}
    const now=performance.now();if(now-lastTap<320&&wvSpan()<.999){wvSet(0,1);lastTap=0;drawWave();return;}lastTap=now;
    if(!smpSrc(SMPL.sel)&&!(SMPL.mode==='chop'&&SMPL.buf))return;
    const x=fr(e.clientX),r=wave.getBoundingClientRect(),tol=18/r.width*wvSpan();let best=null,bd=1;
    if(SMPL.mode==='pads'){const C=SMPL.chops[SMPL.sel];drag={i:SMPL.sel,k:Math.abs(x-(C.ps??0))<Math.abs(x-(C.pe??1))?'ps':'pe'};return;}
    SMPL.chops.forEach((C,i)=>{[['s',C.s],['e',C.e]].forEach(h=>{const dd=Math.abs(h[1]-x);if(dd<bd){bd=dd;best={i,k:h[0]};}});});
    if(best&&bd<=tol){drag=best;SMPL.sel=best.i;}
    else{const hit=SMPL.chops.findIndex(C=>x>=C.s&&x<=C.e);if(hit>=0)SMPL.sel=hit;drag=null;}
    smpUi();});
  wave.addEventListener('pointermove',e=>{if(!PT.has(e.pointerId))return;PT.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=true;
    if(pinch&&PT.size>=2){const [p,q]=[...PT.values()],r=wave.getBoundingClientRect(),d=Math.max(8,Math.abs(p.x-q.x)),mx=(p.x+q.x)/2,sp=clamp(pinch.s0*pinch.d0/d,.004,1),a=pinch.c0-(mx-r.left)/r.width*sp;
      wvSet(a,a+sp);drawWave();return;}
    if(!drag)return;const C=SMPL.chops[drag.i],x=fr(e.clientX);
    if(drag.k==='s')C.s=clamp(x,0,C.e-.002);else if(drag.k==='e')C.e=clamp(x,C.s+.002,1);else if(drag.k==='ps')C.ps=clamp(x,0,(C.pe??1)-.002);else C.pe=clamp(x,(C.ps??0)+.002,1);drawWave();});
  const end=e=>{PT.delete(e.pointerId);if(pinch){if(PT.size<2)pinch=null;lastTap=0;return;}
    if(drag){const C=SMPL.chops[drag.i];if(C&&C.sync&&C.sync!=='off'&&C.qa)C.q=smpAutoQ(smpLen(drag.i));drag=null;smpPrep();queueSave();smpUi();}};
  wave.addEventListener('pointerup',end);wave.addEventListener('pointercancel',end);
  wave.addEventListener('wheel',e=>{e.preventDefault();const r=wave.getBoundingClientRect(),c0=WV.a+(e.clientX-r.left)/r.width*wvSpan(),sp=clamp(wvSpan()*(e.deltaY>0?1.25:.8),.004,1);wvSet(c0-(e.clientX-r.left)/r.width*sp,c0-(e.clientX-r.left)/r.width*sp+sp);drawWave();},{passive:false});
})();
const sPads=$('#sPads');
(function buildSPads(){
  for(let i=0;i<NSP;i++){
    const el=document.createElement('div');el.className='pad cap'+((i+(i>>2))%2?' dark':'');el.style.setProperty('--c',CH[5].c);el.dataset.i=i;
    el.innerHTML='<span class="rn">'+(i+1)+'</span><small></small>';
    bindPad(el,()=>{if(SCP.on){smpCopyTo(i);return;}const ch=SMPL.sel!==i;SMPL.sel=i;if(ch)smpUi();if(!ctx)return;if(!smpSrc(i)){toast(SMPL.mode==='pads'?'PAD '+(i+1)+' VACÍO · GRABÁ O CARGÁ ACÁ':'PRIMERO GRABÁ O CARGÁ UN SAMPLE');smpUi(true);return;}el._v=chopPlay(i,ctx.currentTime+.003,1);recWrite(smpOut(i)===7?R_SMP2:R_SMP,i+1);smpUi(true);},
      ()=>{const C=SMPL.chops[i];if(ctx&&C.mode!=='one'&&SMPL.voice[i])SMPL.voice[i].stop(ctx.currentTime);});
    sPads.appendChild(el);
  }
})();
function smpUi(light){
  const has=!!SMPL.buf,mic=$('#sMic'),res=$('#sRes');
  mic.classList.toggle('on',!!CAP&&CAP.label==='MIC');mic.classList.toggle('smp-rec',!!CAP&&CAP.label==='MIC');mic.textContent=CAP&&CAP.label==='MIC'?'■ PARAR':'● MIC';
  res.classList.toggle('on',!!CAP&&CAP.label==='RESAMPLE');res.classList.toggle('smp-rec',!!CAP&&CAP.label==='RESAMPLE');res.textContent=CAP&&CAP.label==='RESAMPLE'?'■ PARAR':'● RESAMP';
  const PM=SMPL.mode==='pads',MD=C=>C.mode==='one'?'ONE':C.mode.toUpperCase();
  [...sPads.children].forEach((el,i)=>{const C=SMPL.chops[i],P=smpSrc(i),R=smpReg(C);el.style.outline=(i===SMPL.sel)?'2px solid #ffd27a':'none';el.style.outlineOffset='2px';
    el.classList.toggle('cpdst',SCP.on&&i!==SMPL.sel);el.classList.toggle('cpsrc',SCP.on&&i===SMPL.sel);
    el.querySelector('.rn').textContent=PM?'P'+(i+1):String(i+1);
    const sy=C.sync==='pitch'||C.sync==='tempo';el.querySelector('small').textContent=P?(smpOut(i)===7?'→2 ':'')+(sy?qName(smpQ(C,(R[1]-R[0])*P.buf.duration)).split(' ·')[0].replace(' TIEMPOS','T').replace(' TIEMPO','T'):((R[1]-R[0])*P.buf.duration).toFixed(2)+'s')+' · '+MD(C)+((C.spd||1)!==1?' · ×'+C.spd:''):'vacío';});
  $$('#sModeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.m===SMPL.mode));
  $('#sEq').textContent=PM?'ENTERO':'IGUALES';$('#sTr').style.display=PM?'none':'';
  $('#s2ch').classList.toggle('on',!!S.smp2);$('#s2ch').textContent=S.smp2?'2 CANALES ✓':'2 CANALES';
  $('#sCopy').classList.toggle('on',SCP.on);$('#sCopy').textContent=SCP.on?'ELEGÍ DESTINO ✕':'⧉ COPIAR';
  if(light)return;
  const P=smpSrc(SMPL.sel);
  $('#sInfo').textContent=CAP?'GRABANDO '+CAP.label+(CAP.slot>=0?' EN PAD '+(CAP.slot+1):'')+'…':
    PM?('PAD '+(SMPL.sel+1)+' · '+(P?P.name+' · '+P.buf.duration.toFixed(2)+' s (arrastrá los bordes para recortar)':'vacío · MIC, ARCHIVO o DEMO graban acá')):
    has?SMPL.name+' · '+SMPL.buf.duration.toFixed(2)+' s · CHOP '+(SMPL.sel+1)+' (arrastrá los bordes)':'Sin sample. Sin micrófono en el visor: GRABADOR abre la app del cel.';
  const aj=$('#sAj');aj.classList.toggle('on',!!S.smpPar);aj.textContent='AJUSTES '+(S.smpPar?'▴':'▾');$('#v-smp').classList.toggle('paron',!!S.smpPar);
  const pn=$('#sPar');pn.innerHTML='';const show=!!S.smpPar&&(PM?!!P:has);pn.style.display=show?'block':(S.smpPar?'block':'none');
  if(S.smpPar&&!show){const n=document.createElement('div');n.className='pnote';n.textContent=PM?'PAD '+(SMPL.sel+1)+' vacío: grabá o cargá un sample para ajustarlo':'Cargá un sample para ajustar los chops';pn.appendChild(n);}
  if(show){const C=SMPL.chops[SMPL.sel];
    mkSeg(pn,(PM?'PAD ':'CHOP ')+(SMPL.sel+1),[['1-SHOT','one'],['GATE','gate'],['LOOP','loop']],o=>C.mode===o[1],o=>{C.mode=o[1];smpUi(true);queueSave();});
    if(S.smp2)mkSeg(pn,'SALIDA',[['SAMPLER 1',0],['SAMPLER 2',1]],o=>(C.out||0)===o[1],o=>{C.out=o[1];try{SMPL.voice[SMPL.sel]&&SMPL.voice[SMPL.sel].stop();}catch(x){}smpUi(true);queueSave();});
    mkSeg(pn,'REVERSA',[['NO',false],['SÍ',true]],o=>C.rev===o[1],o=>{C.rev=o[1];smpPrep();queueSave();});
    const i=SMPL.sel,L=smpLen(i);
    mkSeg(pn,'SYNC AL TEMPO',[['NO','off'],['REPITCH','pitch'],['ESTIRAR','tempo']],o=>(C.sync||'off')===o[1],o=>{C.sync=o[1];if(o[1]!=='off'&&(!C.q||C.qa)){C.q=smpAutoQ(L);C.qa=true;}smpPrep();smpUi();queueSave();});
    if(C.sync==='pitch'||C.sync==='tempo'){const q=smpQ(C,L),row=document.createElement('div');row.className='qrow';
      const mb=(t,fn,al)=>{const b=document.createElement('button');b.className='cap dark sm';b.textContent=t;if(al)b.setAttribute('aria-label',al);b.onclick=fn;row.appendChild(b);return b;};
      const step=d=>{const k=SQ.indexOf(q);C.q=SQ[clamp((k<0?SQ.indexOf(smpAutoQ(L)):k)+d,0,SQ.length-1)];C.qa=false;smpPrep();smpUi();queueSave();};
      mb('−',()=>step(-1),'Menos tiempos');
      const lb=document.createElement('div');lb.className='qlbl';lb.innerHTML='<b>'+qName(q)+'</b><small>'+(L>0?'el sample está a ≈ '+Math.round(q*60/L)+' BPM':'')+'</small>';row.appendChild(lb);
      mb('+',()=>step(1),'Más tiempos');pn.appendChild(row);
      const bb=document.createElement('button');bb.className='cap dark sm qbpm';bb.textContent='TEMA AL TEMPO DEL SAMPLE ('+(L>0?Math.round(q*60/L):'—')+' BPM)';bb.setAttribute('aria-label','Poner el tempo del tema igual al del sample');
      bb.onclick=()=>{if(L>0){setBpm(q*60/L);toast('TEMPO '+S.bpm+' BPM (EL DEL SAMPLE)');smpUi();}};pn.appendChild(bb);}
    mkSeg(pn,'SPEED',[['½',.5],['¾',.75],['1',1],['1½',1.5],['2',2]],o=>(C.spd||1)===o[1],o=>{C.spd=o[1];smpPrep();smpUi(true);queueSave();});
    mkGrid(pn,C,['pitch','filt','crush','gain'],SMPDEF,k=>{if(k==='pitch')smpPrep();queueSave();});}
  drawWave();
}
$('#sMic').onclick=micToggle;$('#sRes').onclick=resToggle;
$('#sDemo').onclick=smpDemo;
$('#sClr').onclick=()=>{if(CAP)capStop();if(SMPL.mode==='pads'){SMPL.pads[SMPL.sel]=null;smpStore();smpUi();toast('PAD '+(SMPL.sel+1)+' VACÍO');return;}SMPL.buf=null;SMPL.rbuf=null;SMPL.name='';smpStore();smpUi();toast('SAMPLER VACÍO');};
$('#sEq').onclick=()=>{if(SMPL.mode==='pads'){const C=SMPL.chops[SMPL.sel];C.ps=0;C.pe=1;smpUi();queueSave();return;}if(!SMPL.buf)return;smpEqual();smpUi();queueSave();};
/* modo y copia */
const SCP={on:false};
$$('#sModeSeg button').forEach(b=>b.onclick=()=>{SCP.on=false;const conv=smpMode(b.dataset.m);smpUi();renderPalette();
  toast(b.dataset.m==='pads'?(conv?'PADS: LOS 8 CHOPS AHORA SON 8 SAMPLES':'PADS: CADA BOTÓN SU PROPIO SAMPLE'):'CHOP: UN SAMPLE EN 8 PARTES');});
$('#sCopy').onclick=()=>{if(!SCP.on&&!smpSrc(SMPL.sel)){toast('ESE PAD ESTÁ VACÍO');return;}SCP.on=!SCP.on;smpUi(true);if(SCP.on)toast('TOCÁ EL PAD DONDE LO QUERÉS COPIAR');};
function smpCopyTo(i){SCP.on=false;if(i===SMPL.sel){smpUi(true);toast('COPIA CANCELADA');return;}const a=SMPL.sel;if(smpCopy(a,i)){SMPL.sel=i;smpUi();renderPalette();toast((SMPL.mode==='pads'?'PAD ':'CHOP ')+(a+1)+' → '+(i+1));}else smpUi(true);}
$('#sAj').onclick=()=>{S.smpPar=!S.smpPar;try{localStorage.setItem('musica_gb_smppar',S.smpPar?'1':'');}catch(x){}smpUi();};
try{S.smpPar=!!localStorage.getItem('musica_gb_smppar');}catch(x){}
$('#sCue').onclick=()=>{const i=SMPL.sel;const r=smpCue(i);if(!r){toast(smpSrc(i)?'NO ENCONTRÉ UN GOLPE CLARO':'SIN SAMPLE');return;}smpUi();queueSave();
  toast('AUTO CUE '+(SMPL.mode==='pads'?'PAD ':'CHOP ')+(i+1)+' · '+(r.ds>=.001?'−'+Math.round(r.ds*1000)+' ms al inicio':'inicio OK')+(r.de>=.005?' · −'+Math.round(r.de*1000)+' ms al final':''));};
$('#s2ch').onclick=()=>{S.smp2=!S.smp2;smp2Ui();smpUi();renderPalette();queueSave();toast(S.smp2?'SAMPLER 2 PRENDIDO · canal SMP2 en el MIX y renglón SMP 2 en el SEQ · elegí la SALIDA de cada '+(SMPL.mode==='pads'?'pad':'chop'):'SAMPLER 2 APAGADO · todo sale por SAMPLER');};
$('#sTr').onclick=()=>{if(!SMPL.buf)return;smpTransients();smpUi();queueSave();};
$('#sRecL').addEventListener('pointerdown',()=>initAudio());$('#sFileL').addEventListener('pointerdown',()=>initAudio());
$('#sRecF').onchange=e=>{smpFromFile(e.target.files[0],'GRABACIÓN');e.target.value='';};
$('#sFile').onchange=e=>{smpFromFile(e.target.files[0],'ARCHIVO');e.target.value='';};
(function micPolicy(){try{const f=document.permissionsPolicy||document.featurePolicy;if(f&&f.allowsFeature&&!f.allowsFeature('microphone')){$('#sMic').style.opacity='.45';$('#sMic').title='El visor bloquea el micrófono';}}catch(e){}})();

/* ---------------- sesiones: Drive + archivo ---------------- */
const sheet=$('#sheet'),shMsg=t=>{$('#shMsg').textContent=t||'';};
$('#bSes').onclick=()=>{try{lcUi();}catch(e){}$('#shName').value=S.name||'';shMsg('');const d=!!fMode();sheet.classList.toggle('drv',d);$('#shVer').textContent='v'+APPV;
  if(d){$('#shFoldP').hidden=true;drvUi();sesRecent(false,true);migUi();if(!DV.f){shMsg(DV.lost?'No pude recuperar '+DV.lost+': elegila de nuevo (tus sesiones siguen ahí).':'Elegí la carpeta donde van a vivir tus sesiones.');foldOpen(true);}}else libList();
  libLive(true);sheet.classList.add('on');};
$('#shX').onclick=()=>sheet.classList.remove('on');
$('#shName').oninput=e=>{S.name=e.target.value.slice(0,40);};
const DRV='Google Drive';let MCP=null,MCPE=null;
function mcpGet(){if(MCP)return Promise.resolve(MCP);MCPE=null;
  if(!(window.claude&&window.claude.use)){MCPE={code:'standalone'};return Promise.resolve(null);}
  return window.claude.use('mcp').then(m=>{MCP=m;return m;}).catch(e=>{MCPE=e||{code:'unknown'};return null;});}
const mcpWhy=()=>MCPE&&MCPE.code==='standalone'?'Este archivo está fuera de claude.ai: no hay conexión directa a Drive.':'Drive directo no está disponible en este visor'+(MCPE&&(MCPE.code||MCPE.message)?' ('+String(MCPE.code||MCPE.message).slice(0,60)+')':'')+'.';
function mcpErr(e){const c=e&&e.code;
  if(c==='needs_reauth')return 'Drive pide volver a conectarse: reconectalo en claude.ai → Ajustes → Conectores.';
  if(c==='server_not_connected'||c==='server_not_found')return 'No tenés Google Drive conectado en claude.ai (Ajustes → Conectores).';
  if(c==='approval_required'||c==='not_in_manifest'||c==='consent_required')return 'Hace falta tu permiso para usar Drive. Tocá otra vez y aceptá el aviso.';
  if(c==='blocked_by_policy')return 'Tu organización bloquea Drive para esta página.';
  if(c==='selection_required')return 'Tenés más de un Drive conectado: elegí uno cuando claude.ai te lo pregunte.';
  if(c==='server_unavailable'||c==='upstream_error')return 'Drive no respondió. Probá de nuevo en un rato.';
  return 'Error de Drive'+(c?' ('+c+')':'')+(e&&e.message?': '+String(e.message).slice(0,120):'');}
/* archivo de sesión: nombre + JSON; compartir (menú del teléfono → Drive) o descargar */
const sesFile=()=>{const d=new Date(),slug=(S.name||'sesion').trim().replace(/[^\w\-]+/g,'_')||'sesion';return{fn:'GB-'+slug+'-'+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'-'+pad2(d.getHours())+pad2(d.getMinutes())+'.json',data:JSON.stringify(snapshot(true))};};
async function shareSes(){
  const {fn,data}=sesFile();
  try{const f=new File([data],fn,{type:'application/json'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:fn});shMsg('✓ Enviado desde el menú de compartir.');return true;}}
  catch(e){if(e&&e.name==='AbortError'){shMsg('Cancelaste el menú de compartir.');return true;}}
  return false;
}
async function dlSes(){
  const {fn,data}=sesFile();
  try{const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
    if(dl){await dl.save({filename:fn,data});shMsg('✓ Archivo guardado: '+fn);return;}}
  catch(e){if(e&&e.code==='declined'){shMsg('Cancelaste el guardado.');return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=fn;document.body.appendChild(a);a.click();a.remove();shMsg('✓ Descargando '+fn+'\nQueda en Descargas del teléfono.');
}
const jarr=p=>{if(Array.isArray(p))return p;if(p&&typeof p==='object'){for(const k of ['files','items','results'])if(Array.isArray(p[k]))return p[k];for(const k in p)if(Array.isArray(p[k]))return p[k];}return null;};
const fid=f=>f&&(f.id||f.fileId||f.file_id),ftitle=f=>f&&(f.title||f.name);
const pad2=n=>String(n).padStart(2,'0');
/* ---------------- CARPETA DE SESIONES: Drive (en claude.ai, con el conector) o una carpeta del TELÉFONO (app instalada) ----------------
   Las dos funcionan igual:
   · GUARDAR escribe NOMBRE.json en la carpeta (en Drive la versión anterior va a la papelera; en el teléfono se reescribe).
   · ÚLTIMAS 5 / VER TODAS salen de la carpeta.
   · AUTOGUARDADO cada 5 min si hubo cambios: NOMBRE_AS_YYYYMMDDHHMM.json en la subcarpeta AUTOSAVE; quedan las 10 más nuevas.
   · Las tomas LIVE van a la subcarpeta TOMAS.
   Navegadores sin carpetas (iPhone, Firefox): queda la biblioteca del teléfono de antes. */
const AS_MIN=5,AS_KEEP=10,FOLDM='application/vnd.google-apps.folder',ASRX=/_AS_\d{12}\.json$/i;
const APPV='__GBVER__',APPD='__GBDATE__';
const DV={f:null,h:null,need:false,rec:[],last:0,lastT:'',lastBody:'',busy:false,err:'',sub:{}};
const drvMode=()=>!!(window.claude&&window.claude.use);
const FS_OK=typeof window.showDirectoryPicker==='function';
const fMode=()=>drvMode()?'drive':FS_OK?'local':'';   // '' = biblioteca del teléfono de antes
const recKey=()=>fMode()==='local'?'musica_gb_loc_rec':'musica_gb_drv_rec';
if(fMode()==='drive'){try{DV.f=JSON.parse(localStorage.getItem('musica_gb_drv')||'null');}catch(e){}
  if(!DV.f){try{const id=localStorage.getItem('musica_gb_drive_folder');if(id)DV.f={id,name:'MUSICA GROOVEBOX'};}catch(e){}}}
try{DV.rec=JSON.parse(localStorage.getItem(recKey())||'[]')||[];}catch(e){DV.rec=[];}
const qs=v=>String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const escH=v=>String(v).replace(/[<&>"]/g,c=>({'<':'&lt;','&':'&amp;','>':'&gt;','"':'&quot;'}[c]));
const sesBase=()=>((S.name||'').trim().replace(/[\/\\:*?"<>|]+/g,'-').slice(0,40))||'SIN NOMBRE';
const stamp=()=>{const d=new Date();return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+pad2(d.getHours())+pad2(d.getMinutes());};
const hhmm=ms=>{const d=new Date(ms);return pad2(d.getHours())+':'+pad2(d.getMinutes());};
const fmod=f=>Date.parse(f.modifiedTime||f.modified_time||f.modifiedDate||f.updated||'')||0;
const where=()=>fMode()==='local'?'EL TELÉFONO':'DRIVE';
const blobB64=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result).split(',')[1]||'');fr.onerror=()=>rej(fr.error);fr.readAsDataURL(b);});
const splitId=id=>{const k=id.lastIndexOf('/');return [id.slice(0,k)||null,id.slice(k+1)];};
function drvSetF(f){DV.f=f;DV.sub={};DV.rec=[];try{if(fMode()==='drive')localStorage.setItem('musica_gb_drv',JSON.stringify(f));localStorage.setItem(recKey(),'[]');}catch(e){}drvUi();}
async function drvSearch(m,q,n,order){const r=await m.callTool(DRV,'search_files',Object.assign({query:q+' and trashed = false',pageSize:n||20,excludeContentSnippets:true},order?{orderBy:order}:{}));return (jarr(r.payload)||[]).filter(fid);}
async function drvSub(m,name,look){   // subcarpeta (AUTOSAVE / TOMAS) dentro de la carpeta de Drive; look = solo buscar, no crear
  const k=DV.f.id+'/'+name;if(DV.sub[k])return DV.sub[k];
  const a=await drvSearch(m,"mimeType = '"+FOLDM+"' and title = '"+name+"' and parentId = '"+DV.f.id+"'",3);
  let id=a.length?fid(a[0]):null;if(!id&&look)return null;if(!id){const c=await m.callTool(DRV,'create_file',{title:name,contentMimeType:FOLDM,parentId:DV.f.id});id=fid(c.payload)||fid(c.payload&&c.payload.file);}
  if(id)DV.sub[k]=id;return id;}
async function drvTrash(m,id){try{await m.callTool(DRV,'trash_file',{fileId:id});return true;}catch(e){return false;}}
/* permiso de la carpeta del teléfono: se pregunta solo con un toque (GUARDAR, la carpeta, abrir la lista) */
async function lbPerm(ask){const h=DV.h;if(!h)return false;const o={mode:'readwrite'};
  try{if((await h.queryPermission(o))==='granted'){if(DV.need){DV.need=false;drvUi();}return true;}
    if(ask&&(await h.requestPermission(o))==='granted'){DV.need=false;drvUi();return true;}}catch(e){}
  if(!DV.need){DV.need=true;drvUi();}return false;}
/* dos depósitos con las mismas operaciones: ids "sub/nombre" en el teléfono, ids de archivo en Drive */
const BK={
  drive:{
    async ok(){const m=await mcpGet();if(!m)throw {code:'nomcp'};if(!DV.f)throw {code:'nofolder'};return m;},
    async list(sub){const m=await this.ok(),p=sub?await drvSub(m,sub,true):DV.f.id;if(!p)return [];
      return (await drvSearch(m,"parentId = '"+p+"'",80,'modifiedTime desc')).filter(x=>x.mimeType!==FOLDM).map(x=>({id:fid(x),title:ftitle(x)||'',t:fmod(x)}));},
    async write(sub,title,data,mime){const m=await this.ok(),p=sub?await drvSub(m,sub):DV.f.id,old=await drvSearch(m,"title = '"+qs(title)+"' and parentId = '"+p+"'",10);
      const inp={title,contentMimeType:mime,disableConversionToGoogleType:true,parentId:p};if(typeof data==='string')inp.textContent=data;else inp.base64Content=await blobB64(data);
      const c=await m.callTool(DRV,'create_file',inp),id=fid(c.payload)||fid(c.payload&&c.payload.file);let kept=0;for(const x of old)if(fid(x)!==id&&!(await drvTrash(m,fid(x))))kept++;
      return {id,replaced:old.length>0,kept};},
    async read(id,asBlob,title){const m=await this.ok(),r=await m.callTool(DRV,'download_file_content',{fileId:id});
      if(!asBlob){const t=extractText(r);if(!t)throw {code:'parse'};return t;}
      const b=b64Of(r);if(!b)throw {code:'parse'};return new Blob([Uint8Array.from(atob(b),ch=>ch.charCodeAt(0))],{type:mimeOf(title)});},
    async del(id){const m=await this.ok();return drvTrash(m,id);}},
  local:{
    async ok(ask){if(!DV.h)throw {code:'nofolder'};if(!(await lbPerm(ask)))throw {code:'perm'};return DV.h;},
    async dir(sub,create,ask){const h=await this.ok(ask);if(!sub)return h;try{return await h.getDirectoryHandle(sub,{create:!!create});}catch(e){if(!create&&e&&(e.name==='NotFoundError'||e.name==='TypeMismatchError'))return null;throw e;}},
    async list(sub,ask){const d=await this.dir(sub,false,ask);if(!d)return [];const out=[];
      for await(const [n,x] of d.entries()){if(x.kind!=='file')continue;let t=0;try{t=(await x.getFile()).lastModified;}catch(e){}out.push({id:(sub||'')+'/'+n,title:n,t});}
      return out.sort((a,b)=>b.t-a.t||b.title.localeCompare(a.title));},
    async write(sub,title,data,mime,ask){const d=await this.dir(sub,true,ask);let had=false;try{await d.getFileHandle(title);had=true;}catch(e){}
      const fh=await d.getFileHandle(title,{create:true}),w=await fh.createWritable();await w.write(typeof data==='string'?new Blob([data],{type:mime}):data);await w.close();
      return {id:(sub||'')+'/'+title,replaced:had,kept:0};},
    async read(id,asBlob){const [sub,n]=splitId(id),d=await this.dir(sub,false,true);if(!d)throw {code:'notfound'};const fl=await (await d.getFileHandle(n)).getFile();return asBlob?fl:fl.text();},
    async del(id){const [sub,n]=splitId(id),d=await this.dir(sub,false,true);if(!d)return false;await d.removeEntry(n);return true;}}};
const bk=()=>BK[fMode()]||null;
const mimeOf=t=>{const e=(String(t||'').match(/\.(\w+)$/)||[0,''])[1].toLowerCase();return e==='json'?'application/json':e==='m4a'?'audio/mp4':e==='ogg'?'audio/ogg':e==='wav'?'audio/wav':'audio/webm';};
function fsErr(e){const c=e&&(e.code||e.name);
  if(c==='nofolder')return 'Primero elegí la carpeta.';
  if(c==='perm'||c==='NotAllowedError'||c==='SecurityError')return 'Falta el permiso para usar la carpeta: tocá la carpeta (arriba) y aceptá.';
  if(c==='notfound'||c==='NotFoundError')return 'No encontré ese archivo (¿lo movieron o borraron?).';
  if(c==='parse')return 'Ese archivo no parece una sesión del groovebox.';
  if(c==='QuotaExceededError')return 'El teléfono no tiene lugar.';
  if(c==='nomcp')return mcpWhy();
  return fMode()==='drive'?mcpErr(e):'Error con la carpeta'+(c?' ('+c+')':'')+(e&&e.message?': '+String(e.message).slice(0,100):'');}
function sesBody(){let snap=snapshot(true),body=JSON.stringify(snap),note='';
  if(fMode()==='drive'&&body.length>900000){delete snap.smp.pcm;delete snap.smp.pads;body=JSON.stringify(snap);note='\n(los samples eran muy pesados y no se incluyeron)';}
  const cmp=JSON.stringify(Object.assign({},snap,{saved:0,name:''}));return {body,note,cmp};}   // cmp: para saber si cambió algo de verdad
function chgUi(){const b=$('#bSes'),d=!!fMode()&&!!DV.f;b.classList.toggle('chg',d&&CHG.on);b.classList.toggle('ok',d&&!CHG.on&&!!DV.last);}
CHG.cb=()=>{chgUi();asUi();};
function asUi(){const e=$('#shAs');if(!e)return;if(!DV.f){e.innerHTML='AUTOGUARDADO CADA '+AS_MIN+' MIN, CUANDO ELIJAS LA CARPETA';return;}
  e.innerHTML='AUTOGUARDADO CADA '+AS_MIN+' MIN → '+escH(DV.f?DV.f.name:'…')+' / AUTOSAVE'+(DV.last?'\nÚLTIMO '+hhmm(DV.last)+' · '+escH(DV.lastT.replace(/\.json$/i,'')):'')+'\n'+(CHG.on?'<em>HAY CAMBIOS SIN GUARDAR</em>':'<b>TODO GUARDADO</b>')+(DV.err?'\n<em>'+escH(DV.err)+'</em>':'');}
function drvUi(){const b=$('#shFold'),loc=fMode()==='local';$('#shFold small').textContent=loc?'CARPETA DEL TELÉFONO':'CARPETA DE DRIVE';
  $('#shFoldN').textContent=DV.f?(DV.need?DV.f.name+' · TOCÁ PARA DAR PERMISO':DV.f.name):'ELEGÍ UNA CARPETA';b.classList.toggle('need',!DV.f||DV.need);
  $('#sheet').classList.toggle('loc',loc);$('#shFoldQ').placeholder=loc?'nombre de la carpeta nueva':'buscar carpeta o pegar el link de Drive';asUi();chgUi();}
/* ---- elegir carpeta ---- */
function foldOpen(on){$('#shFoldP').hidden=!on;if(on){$('#shFoldQ').value='';if(fMode()==='drive')foldSearch('');else $('#shFoldL').innerHTML='';}}
let foldT=null;
async function foldSearch(q){const box=$('#shFoldL'),m=await mcpGet();box.innerHTML='';if(!m){box.dataset.empty=mcpWhy();return;}
  q=(q||'').trim();const lk=q.match(/folders\/([\w-]{10,})/)||q.match(/[?&]id=([\w-]{10,})/)||(/^[\w-]{25,}$/.test(q)?[0,q]:null);
  if(lk){box.appendChild(lrow('USAR LA CARPETA DEL LINK',lk[1].slice(0,18)+'…',()=>{drvSetF({id:lk[1],name:'CARPETA DEL LINK'});foldOpen(false);shMsg('✓ Carpeta elegida (por link).');sesRecent();},[]));return;}
  box.dataset.empty='Buscando carpetas…';
  try{const a=await drvSearch(m,"mimeType = '"+FOLDM+"'"+(q?" and title contains '"+qs(q)+"'":''),20,'modifiedTime desc');
    box.dataset.empty=q?'No encontré carpetas con ese nombre. Podés crearla con ＋ CREAR CARPETA.':'No encontré carpetas.';
    a.filter(x=>!/^(AUTOSAVE|TOMAS)$/.test(ftitle(x)||'')).forEach(x=>box.appendChild(lrow(ftitle(x),x.id===(DV.f&&DV.f.id)?'LA ACTUAL':'',()=>{drvSetF({id:fid(x),name:ftitle(x)});foldOpen(false);shMsg('✓ Carpeta: '+ftitle(x));sesRecent();libLive();},[])));}
  catch(e){box.dataset.empty='';shMsg(mcpErr(e));}}
/* carpeta del teléfono: el selector de Android (ahí también se puede crear una), o crear una dentro de otra */
async function lbSet(h){DV.h=h;DV.need=false;DV.lost=null;lsS('musica_gb_dirname',h.name);try{await IDB.put('kv',h,'dir');}catch(e){}drvSetF({id:'local',name:h.name});}
async function lbPick(){try{const h=await window.showDirectoryPicker({id:'gbses',mode:'readwrite',startIn:'documents'});await lbSet(h);foldOpen(false);shMsg('✓ Carpeta: '+h.name);sesRecent();libLive();migUi();}
  catch(e){if(e&&e.name==='AbortError')return;shMsg(fsErr(e));}}
async function lbCreate(){const nm=($('#shFoldQ').value.trim()||'MUSICA GROOVEBOX').replace(/[\/\\:*?"<>|]+/g,'-').slice(0,60);
  shMsg('Elegí DÓNDE crear la carpeta "'+nm+'"…');
  try{const p=await window.showDirectoryPicker({id:'gbpar',mode:'readwrite',startIn:'documents'}),h=await p.getDirectoryHandle(nm,{create:true});await lbSet(h);foldOpen(false);shMsg('✓ Carpeta creada: '+p.name+' / '+nm);sesRecent();libLive();migUi();}
  catch(e){if(e&&e.name==='AbortError'){shMsg('');return;}shMsg(fsErr(e));}}
/* recuperar la carpeta al abrir la app. Protección: si un intento anterior se cayó leyendo la carpeta guardada,
   no se vuelve a leer (se olvida y se pide elegirla de nuevo) para que la app nunca quede trabada al abrir */
const LBK='musica_gb_dirload',lsG=k=>{try{return localStorage.getItem(k);}catch(e){return null;}},lsS=(k,v)=>{try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch(e){}};
const LBR=FS_OK&&!drvMode()?new Promise(r=>setTimeout(r,1200)).then(async()=>{
  if(lsG(LBK)==='1'){lsS(LBK,null);await IDB.del('kv','dir').catch(()=>{});DV.lost=lsG('musica_gb_dirname')||'tu carpeta';drvUi();return;}
  lsS(LBK,'1');let h=null;try{h=await IDB.get('kv','dir');}catch(e){}lsS(LBK,null);
  if(h&&h.kind==='directory'){DV.h=h;DV.f={id:'local',name:h.name};await lbPerm(false);drvUi();}}):Promise.resolve();
$('#shFold').onclick=async()=>{if(fMode()==='local'&&DV.h&&DV.need){if(await lbPerm(true)){shMsg('✓ Permiso para '+DV.f.name);sesRecent();libLive();}return;}foldOpen($('#shFoldP').hidden);};
$('#shFoldX').onclick=()=>foldOpen(false);
$('#shFoldQ').oninput=e=>{if(fMode()!=='drive')return;clearTimeout(foldT);foldT=setTimeout(()=>foldSearch(e.target.value),400);};
$('#shFoldPick').onclick=lbPick;
$('#shFoldNew').onclick=async()=>{if(fMode()==='local')return lbCreate();const nm=($('#shFoldQ').value.trim()||'MUSICA GROOVEBOX').slice(0,60),m=await mcpGet();if(!m){shMsg(mcpWhy());return;}
  try{const c=await m.callTool(DRV,'create_file',{title:nm,contentMimeType:FOLDM}),id=fid(c.payload)||fid(c.payload&&c.payload.file);if(!id)throw {message:'Drive no devolvió la carpeta'};
    drvSetF({id,name:nm});foldOpen(false);shMsg('✓ Carpeta creada en tu Drive: '+nm+'\n(la podés mover a donde quieras desde Drive)');sesRecent();}catch(e){shMsg(mcpErr(e));}};
/* ---- GUARDAR ---- */
async function sesSave(){
  const B=bk();if(!B)return libSave();
  if(!DV.f){shMsg('Primero elegí la carpeta.');foldOpen(true);return false;}
  S.name=(($('#shName').value||S.name||'').trim()).slice(0,40)||('SESIÓN '+fmtD(Date.now()).replace(/\//g,'-').replace(':','.'));$('#shName').value=S.name;
  const b=$('#shLoc');b.disabled=true;shMsg('Guardando…');let ok=false;
  try{if(fMode()==='local')await B.ok(true);
    const t=sesBase()+'.json',{body,note,cmp}=sesBody(),r=await B.write(null,t,body,'application/json');
    CHG.on=false;DV.lastBody=cmp;DV.err='';drvRecAdd({id:r.id,title:t,t:Date.now()});
    shMsg('✓ GUARDADA EN '+where()+'\n'+DV.f.name+' / '+t+(r.replaced&&!r.kept?'\n(reemplazó a la anterior)':'')+(r.kept?'\n(la anterior quedó: no pude mandarla a la papelera)':'')+note);ok=true;
  }catch(e){shMsg(fsErr(e));}
  b.disabled=false;drvUi();drvRecPaint();return ok;}
const drvSaveOrig=sesSave;
/* ---- ÚLTIMAS 5 / TODAS ---- */
function drvRecAdd(r){DV.rec=[r,...(DV.rec||[]).filter(x=>x.title!==r.title)].slice(0,5);try{localStorage.setItem(recKey(),JSON.stringify(DV.rec));}catch(e){}}
function drvRecPaint(list){const box=$('#shRecL');box.innerHTML='';box.dataset.empty=DV.f?'Todavía no hay sesiones en '+DV.f.name+'.':'Elegí la carpeta.';(list||DV.rec||[]).forEach(r=>{const nm=r.title.replace(/\.json$/i,'');
  box.appendChild(lrow(nm,r.t?fmtD(r.t):'',mb=>armTap(mb,'<span>¿ABRIR '+escH(nm)+'?</span><small>REEMPLAZA LO ACTUAL · TOCÁ DE NUEVO</small>',()=>sesLoad(r.id,r.title)),[]));});}
async function sesRecent(all,ask){
  $('#shRecH').textContent=all?'TODAS LAS SESIONES':'ÚLTIMAS 5';$('#shAll').textContent=all?'ÚLTIMAS 5':'VER TODAS';$('#shAll').dataset.all=all?'1':'';
  if(!all)drvRecPaint();const B=bk();if(!B||!DV.f)return;
  try{const a=(await B.list(null,ask)).filter(x=>/\.json$/i.test(x.title)&&!ASRX.test(x.title));
    if(all)drvRecPaint(a.slice(0,80));else{DV.rec=a.slice(0,5);try{localStorage.setItem(recKey(),JSON.stringify(DV.rec));}catch(e){}drvRecPaint();}}
  catch(e){if(!(e&&e.code==='perm'&&!ask))shMsg(fsErr(e));}}
const drvRecent=sesRecent;
$('#shAll').onclick=()=>sesRecent(!$('#shAll').dataset.all,true);
/* ---- abrir ---- */
async function sesLoad(id,title){const B=bk();if(!B)return;shMsg('Cargando '+title+'…');
  try{const txt=await B.read(id,false,title);loadSession(JSON.parse(txt));
    S.name=String(title).replace(ASRX,'').replace(/\.json$/i,'').slice(0,40);$('#shName').value=S.name;
    DV.lastBody=sesBody().cmp;CHG.on=false;if(!ASRX.test(title))drvRecAdd({id,title,t:Date.now()});drvUi();shMsg('✓ CARGADA: '+title);toast('SESIÓN '+S.name);setTimeout(()=>sheet.classList.remove('on'),700);}
  catch(e){shMsg(e instanceof SyntaxError?'Ese archivo no parece una sesión del groovebox.':fsErr(e));}}
const drvLoad=sesLoad;
/* ---- AUTOGUARDADO: versión nueva del original cada 5 min si hubo cambios; quedan las 10 más nuevas ---- */
async function drvAuto(force){
  const B=bk();if(DV.busy||!CHG.on||!DV.f||!B)return false;
  if(!force&&Date.now()-Math.max(DV.last,CHG.t0)<AS_MIN*60000)return false;
  DV.busy=true;let ok=false;
  try{const {body,cmp}=sesBody();
    if(cmp===DV.lastBody){CHG.on=false;}
    else{const base=sesBase(),t=base+'_AS_'+stamp()+'.json';
      await B.write('AUTOSAVE',t,body,'application/json');CHG.on=false;DV.lastBody=cmp;DV.last=Date.now();DV.lastT=t;DV.err='';ok=true;
      const a=(await B.list('AUTOSAVE')).filter(x=>x.title.startsWith(base+'_AS_')).sort((x,y)=>y.title.localeCompare(x.title));
      for(const x of a.slice(AS_KEEP))await B.del(x.id).catch(()=>{});}
  }catch(e){DV.err='AUTOGUARDADO: '+fsErr(e);}
  DV.busy=false;asUi();chgUi();return ok;}
setInterval(()=>{drvAuto(false);},30000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&CHG.on&&Date.now()-DV.last>60000)drvAuto(true);});
setTimeout(()=>{CHG.on=false;chgUi();},1500);   // lo que quedó del arranque no cuenta como cambio
/* ---- sesiones viejas de la biblioteca del teléfono → a la carpeta ---- */
async function migUi(){const b=$('#shMig');let n=0;if(fMode()==='local'&&DV.f){try{n=(await IDB.all('ses')).length;}catch(e){}}b.hidden=!n;b.textContent='PASAR '+n+' SESIÓN'+(n>1?'ES':'')+' DE LA BIBLIOTECA VIEJA A LA CARPETA';}
$('#shMig').onclick=async()=>{const B=bk();if(!B||!DV.f)return;let a=[];try{a=await IDB.all('ses');}catch(e){}let k=0;shMsg('Pasando '+a.length+'…');
  try{await B.ok(true);for(const r of a){const {fn,data}=libJson(r);await B.write(null,r.name.replace(/[\/\\:*?"<>|]+/g,'-').slice(0,40)+'.json',data,'application/json');k++;}
    shMsg('✓ '+k+' sesiones copiadas a '+DV.f.name+'.\n(siguen también en la biblioteca vieja)');sesRecent();}catch(e){shMsg(fsErr(e));}};
function extractText(r){
  const cand=[],p=r&&r.payload;if(typeof p==='string')cand.push(p);else if(p&&typeof p==='object')for(const k of ['content','base64Content','data','base64','text','fileContent'])if(typeof p[k]==='string')cand.push(p[k]);
  ((r&&r.content)||[]).forEach(b=>{if(b&&b.type==='text'&&typeof b.text==='string')cand.push(b.text);if(b&&b.resource){if(typeof b.resource.text==='string')cand.push(b.resource.text);if(typeof b.resource.blob==='string')cand.push(b.resource.blob);}});
  for(const c of cand){const t=c.trim();if(t[0]==='{')return t;
    try{const bin=atob(t.replace(/\s/g,'')),by=Uint8Array.from(bin,ch=>ch.charCodeAt(0)),s=new TextDecoder().decode(by);if(s.trim()[0]==='{')return s;}catch(e){}}
  return null;
}
function loadSession(j){
  initAudio();applySnapshot(j);
  if(j.smp&&j.smp.pcm)smpDecode(j.smp.pcm);
  if(j.smp&&Array.isArray(j.smp.pads)){SMPL._rs=true;try{for(let i=0;i<NSP;i++){const p=j.smp.pads[i];if(p)smpDecode(p,i);else SMPL.pads[i]=null;}}finally{SMPL._rs=false;}smpStore();}
  $('#selKey').value=S.key;$('#selScale').value=S.scale;
  renderKeys();renderPalette();paints.forEach(p=>p());applyAll();applyFx();applyPatch();applyOut();PCH.sel=null;vinFx();sync();dirty=true;smpUi();fxUi();partUi();pageUi();smp2Ui();ensureKit();queueSave();
}
/* NUEVA SESIÓN: todo en blanco (patrones, partes, sample, sonidos y mezcla de fábrica) */
let newT=null;
function newSession(){
  if(S.playing)stop();if(CAP)capStop();
  const j=JSON.parse(JSON.stringify(DEF));j.pat.forEach(r=>r.fill(0));j.seqN.forEach(r=>r.fill(0));j.chdSeq.fill(0);j.chdGate.fill(2);j.smpSeq.fill(0);if(j.smpSeq2)j.smpSeq2.fill(0);j.smp2=false;if(j.synG)j.synG.forEach(a=>a.fill(1));j.vinN.forEach(a=>a.fill(0));j.vinG.forEach(a=>a.fill(1));if(j.xyr)j.xyr.forEach(a=>a.fill(null));j.steps=16;j.sw=0;j.parts=null;j.part=0;j.song=false;j.name='';delete j.smp.pcm;
  SMPL.buf=null;SMPL.rbuf=null;SMPL.name='';SMPL.pads.fill(null);SMPL.mode='chop';smpStore();UNDO=null;S.hasUndo=false;try{$('#bUndo').classList.remove('has');}catch(e){}
  loadSession(j);S.name='';$('#shName').value='';queueSave();CHG.on=false;DV.lastBody='';try{chgUi();}catch(e){}
}
$('#shNew').onclick=()=>{const b=$('#shNew');
  if(!newT){b.textContent='¿SEGURO? TOCÁ OTRA VEZ';b.classList.add('on');newT=setTimeout(()=>{newT=null;b.textContent='＋ NUEVA';b.classList.remove('on');},3500);return;}
  clearTimeout(newT);newT=null;b.textContent='＋ NUEVA';b.classList.remove('on');newSession();shMsg('✓ Sesión nueva en blanco.');setTimeout(()=>sheet.classList.remove('on'),600);toast('SESIÓN NUEVA');
};
/* TAP tempo: promedio de los últimos toques; se reinicia si pasan 2 s */
const TAPS=[];
$('#bpmT').addEventListener('pointerdown',e=>{e.preventDefault();initAudio();const n=performance.now();
  if(TAPS.length&&n-TAPS[TAPS.length-1]>2000)TAPS.length=0;TAPS.push(n);if(TAPS.length>6)TAPS.shift();
  const b=$('#bpmT');b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),90);
  if(TAPS.length>=2){let s=0;for(let i=1;i<TAPS.length;i++)s+=TAPS[i]-TAPS[i-1];setBpm(60000/(s/(TAPS.length-1)));}
});
$('#shDl').onclick=dlSes;
$('#shShare').onclick=async()=>{if(!(await shareSes())){shMsg('Este teléfono no permite compartir archivos desde acá: lo descargo.');await dlSes();}};
$('#shImp').onchange=e=>$('#shFile').onchange(e);
$('#shFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{loadSession(JSON.parse(rd.result));shMsg('✓ CARGADA: '+f.name);setTimeout(()=>sheet.classList.remove('on'),700);}catch(x){shMsg('Ese archivo no parece una sesión del groovebox.');}};rd.onerror=()=>shMsg('No pude leer el archivo.');rd.readAsText(f);};


/* ---------------- grabación LIVE: todo lo que sale por el master ----------------
   Se graba comprimido mientras tocás (MediaRecorder, no carga el procesador); al terminar
   se puede guardar como WAV (16 bits estéreo, se convierte recién ahí) o el archivo liviano. */
const LV={rec:null,dest:null,chunks:[],t0:0,blob:null,mime:'',dur:0,tm:null,url:null};
const lvMime=()=>{const c=['audio/webm;codecs=opus','audio/webm','audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/ogg;codecs=opus'];try{for(const m of c)if(MediaRecorder.isTypeSupported(m))return m;}catch(e){}return '';};
const lvExt=m=>m.includes('mp4')?'m4a':m.includes('ogg')?'ogg':'webm';
const fmtT=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const lvName=ext=>{const d=new Date();return 'GB-LIVE-'+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'-'+pad2(d.getHours())+pad2(d.getMinutes())+'.'+ext;};
function liveStart(){
  initAudio();if(!ctx)return;
  if(typeof MediaRecorder==='undefined'||!ctx.createMediaStreamDestination){toast('ESTE NAVEGADOR NO PUEDE GRABAR');return;}
  try{LV.dest=ctx.createMediaStreamDestination();LV.dest.channelCount=2;LV.src=outTap();LV.src.connect(LV.dest);
    LV.mime=lvMime();LV.rec=new MediaRecorder(LV.dest.stream,LV.mime?{mimeType:LV.mime,audioBitsPerSecond:256000}:{audioBitsPerSecond:256000});LV.mime=LV.rec.mimeType||LV.mime;
  }catch(e){toast('NO SE PUDO GRABAR: '+(e.name||e));return;}
  LV.chunks=[];LV.rec.ondataavailable=e=>{if(e.data&&e.data.size)LV.chunks.push(e.data);};
  LV.rec.onstop=()=>{LV.blob=new Blob(LV.chunks,{type:LV.mime||'audio/webm'});LV.chunks=[];LV.id='L'+Date.now();LV.name=lvName('x').slice(0,-2);LV.saved=Date.now();
    liveSheetOpen();IDB.put('live',{id:LV.id,name:LV.name,dur:LV.dur,mime:LV.mime,blob:LV.blob,saved:LV.saved})
      .then(()=>{if(fMode()&&DV.f){const r={id:LV.id,name:LV.name,mime:LV.mime,blob:LV.blob};$('#lvMsg').textContent='Pasando a '+DV.f.name+' / TOMAS…';
          liveUp(r).then(t=>{if(t){LV.id=null;LV.did=DV.lastLive;$('#lvMsg').textContent='✓ GUARDADA: '+DV.f.name+' / TOMAS / '+t;}else $('#lvMsg').textContent='No pude pasarla a la carpeta'+(DV.lerr?' ('+DV.lerr+')':'')+'.\nQuedó aparte: pasala desde SESIONES → GRABACIONES LIVE (↑).';libLive();});}
        else{$('#lvMsg').textContent='✓ Quedó guardada en el teléfono (SESIONES → GRABACIONES LIVE).';libLive();}})
      .catch(()=>{LV.id=null;$('#lvMsg').textContent='No se pudo guardar en el teléfono: bajala con GUARDAR WAV.';});};
  LV.rec.start(1000);LV.t0=performance.now();
  $('#bLive').classList.add('rec');clearInterval(LV.tm);LV.tm=setInterval(()=>{$('#bLive').textContent='● '+fmtT((performance.now()-LV.t0)/1000);},500);
  $('#bLive').textContent='● 0:00';toast('GRABANDO EL MASTER · TOCÁ ● PARA TERMINAR');
}
function liveStop(silent){
  if(!LV.rec)return;clearInterval(LV.tm);LV.dur=(performance.now()-LV.t0)/1000;
  try{LV.rec.stop();}catch(e){}LV.rec=null;try{(LV.src||clampSh).disconnect(LV.dest);}catch(e){}LV.dest=null;
  $('#bLive').classList.remove('rec');$('#bLive').textContent='● LIVE';if(silent)toast('GRABACIÓN CORTADA');
}
window.liveStop=liveStop;
function liveSheetOpen(){
  if(LV.url)URL.revokeObjectURL(LV.url);LV.url=URL.createObjectURL(LV.blob);$('#lvAudio').src=LV.url;
  $('#lvInfo').innerHTML=(LV.dur?fmtT(LV.dur)+' de grabación':'TOMA')+'<small>'+(LV.name||'')+' · '+(LV.blob.size/1048576).toFixed(1)+' MB · '+lvExt(LV.mime).toUpperCase()+'</small>';$('#lvMsg').textContent='';const b=$('#lvDel');clearTimeout(b._arm);b._arm=null;b.classList.remove('arm');b.textContent='BORRAR TOMA';
  $('#liveSheet').classList.add('on');
}
async function lvSave(blob,fn){
  try{const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
    if(dl){await dl.save({filename:fn,data:blob});$('#lvMsg').textContent='✓ Guardado: '+fn;return;}}
  catch(e){if(e&&e.code==='declined'){$('#lvMsg').textContent='Cancelaste el guardado.';return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  $('#lvMsg').textContent='✓ Descargando '+fn+'\nQueda en Descargas del teléfono.';
}
function wavEncode(buf){
  const ch=Math.min(2,buf.numberOfChannels),n=buf.length,sr=buf.sampleRate,data=new DataView(new ArrayBuffer(44+n*ch*2)),w=(o,s)=>{for(let i=0;i<s.length;i++)data.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');data.setUint32(4,36+n*ch*2,true);w(8,'WAVE');w(12,'fmt ');data.setUint32(16,16,true);data.setUint16(20,1,true);data.setUint16(22,ch,true);data.setUint32(24,sr,true);data.setUint32(28,sr*ch*2,true);data.setUint16(32,ch*2,true);data.setUint16(34,16,true);w(36,'data');data.setUint32(40,n*ch*2,true);
  const C=[];for(let c=0;c<ch;c++)C.push(buf.getChannelData(c));let o=44;
  for(let i=0;i<n;i++)for(let c=0;c<ch;c++){const v=Math.max(-1,Math.min(1,C[c][i]));data.setInt16(o,v<0?v*32768:v*32767,true);o+=2;}
  return new Blob([data.buffer],{type:'audio/wav'});
}
async function lvToWav(){
  $('#lvMsg').textContent='Convirtiendo a WAV…';initAudio();
  const ab=await LV.blob.arrayBuffer(),buf=await ctx.decodeAudioData(ab);return wavEncode(buf);
}
$('#bLive').onclick=()=>{if(LV.rec)liveStop();else liveStart();};
$('#lvX').onclick=()=>$('#liveSheet').classList.remove('on');
$('#lvRaw').onclick=()=>{if(LV.blob)lvSave(LV.blob,lvFn(lvExt(LV.mime)));};
$('#lvWav').onclick=async()=>{if(!LV.blob)return;try{const w=await lvToWav();await lvSave(w,lvFn('wav'));}catch(e){$('#lvMsg').textContent='No pude convertir a WAV ('+(e.name||e)+'). Probá GUARDAR LIVIANO.';}};
$('#lvShare').onclick=async()=>{if(!LV.blob)return;
  try{const w=await lvToWav(),f=new File([w],lvFn('wav'),{type:'audio/wav'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:f.name});$('#lvMsg').textContent='✓ Enviado.';}
    else{$('#lvMsg').textContent='Este teléfono no comparte archivos desde acá: lo descargo.';await lvSave(w,f.name);}}
  catch(e){if(e&&e.name==='AbortError')$('#lvMsg').textContent='Cancelaste.';else $('#lvMsg').textContent='No se pudo compartir ('+(e.name||e)+').';}};
$('#lvDel').onclick=()=>{const b=$('#lvDel');
  if(!b._arm){b.classList.add('arm');b.textContent='¿BORRAR? TOCÁ DE NUEVO';b._arm=setTimeout(()=>{b._arm=null;b.classList.remove('arm');b.textContent='BORRAR TOMA';},2600);return;}
  clearTimeout(b._arm);b._arm=null;b.classList.remove('arm');b.textContent='BORRAR TOMA';
  if(LV.id)IDB.del('live',LV.id).then(libLive).catch(()=>{});else if(LV.did&&bk())bk().del(LV.did).catch(()=>{}).then(()=>libLive());LV.id=null;LV.did=null;LV.blob=null;if(LV.url)URL.revokeObjectURL(LV.url);LV.url=null;$('#lvAudio').removeAttribute('src');$('#liveSheet').classList.remove('on');toast('TOMA BORRADA');};
const lvFn=ext=>(LV.name||lvName('x').slice(0,-2))+'.'+ext;

/* ---------------- biblioteca en el teléfono (IndexedDB) ----------------
   Cada persona guarda en SU teléfono: sesiones (con su sample a calidad completa), tomas LIVE y el sample actual
   (que vuelve solo al abrir la app). Para llevarlo a Drive: ENVIAR A DRIVE (menú del teléfono → su cuenta de Google). */
const IDB={p:null,
  open(){if(this.p)return this.p;this.p=new Promise((res,rej)=>{if(!window.indexedDB){rej(new Error('sin IndexedDB'));return;}
    const r=indexedDB.open('musica_gb',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');['ses','live'].forEach(n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:'id'});});};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('bloqueada'));});this.p.catch(()=>{this.p=null;});return this.p;},
  async tx(st,mode,fn){const d=await this.open();return new Promise((res,rej)=>{const t=d.transaction(st,mode),q=fn(t.objectStore(st));let out;if(q)q.onsuccess=()=>{out=q.result;};t.oncomplete=()=>res(out);t.onerror=t.onabort=()=>rej(t.error);});},
  get(st,k){return this.tx(st,'readonly',s=>s.get(k));},put(st,v,k){return this.tx(st,'readwrite',s=>k===undefined?s.put(v):s.put(v,k));},
  del(st,k){return this.tx(st,'readwrite',s=>s.delete(k));},all(st){return this.tx(st,'readonly',s=>s.getAll());}};
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}
const fmtD=ms=>{const d=new Date(ms);return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad2(d.getHours())+':'+pad2(d.getMinutes());};
/* sample actual: se guarda solo cada vez que cambia y vuelve al abrir */
const smpPack=(b,nm)=>{if(b===undefined){b=SMPL.buf;nm=SMPL.name;}if(!b)return null;const d=b.getChannelData(0),q=new Int16Array(d.length);for(let i=0;i<d.length;i++)q[i]=Math.round(clamp(d[i],-1,1)*32767);return{rate:b.sampleRate,name:nm,pcm:q.buffer};};
const padsPack=()=>SMPL.pads.map(p=>p?smpPack(p.buf,p.name):null);
function smpUnpack(o,chops,slot){
  if(!o||!o.pcm)return false;const q=new Int16Array(o.pcm),f=new Float32Array(q.length);for(let i=0;i<q.length;i++)f[i]=q[i]/32767;
  const keep=JSON.parse(JSON.stringify(chops||SMPL.chops));SMPL._rs=true;let ok=false;try{ok=smpSet(f,o.rate,o.name,slot===undefined?-1:slot);}finally{SMPL._rs=false;}
  if(ok)SMPL.chops.forEach((C,i)=>{if(keep[i])Object.assign(C,keep[i]);});return ok;}
function padsUnpack(a,chops){for(let i=0;i<NSP;i++){if(a&&a[i])smpUnpack(a[i],chops,i);else SMPL.pads[i]=null;}}
var smpT=null;
function smpStore(){if(SMPL._rs)return;clearTimeout(smpT);smpT=setTimeout(()=>{const o=smpPack();(o?IDB.put('kv',Object.assign(o,{saved:Date.now()}),'smp'):IDB.del('kv','smp')).catch(()=>{});IDB.put('kv',{mode:SMPL.mode,pads:padsPack()},'smpP').catch(()=>{});},350);}
const SMPR=(async()=>{try{const o=await IDB.get('kv','smp');if(o&&!SMPL.buf&&smpUnpack(o)){smpUi();dirty=true;}
  const p=await IDB.get('kv','smpP');if(p&&Array.isArray(p.pads)&&!SMPL.pads.some(Boolean)){padsUnpack(p.pads);smpUi();dirty=true;}}catch(e){}})();
/* botón que pide un segundo toque */
function armTap(b,txt,fn){if(b._arm){clearTimeout(b._arm);b._arm=null;b.classList.remove('arm');fn();return;}
  const o=b.innerHTML;b.classList.add('arm');b.innerHTML=txt;b._arm=setTimeout(()=>{b._arm=null;b.classList.remove('arm');b.innerHTML=o;},2600);}
/* sesiones en el teléfono */
const sesId=nm=>'s_'+(nm.trim().toLowerCase().replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'')||Date.now());
async function libSave(){
  const nm=(($('#shName').value||S.name||'').trim()).slice(0,40)||('SESIÓN '+fmtD(Date.now()));S.name=nm;$('#shName').value=nm;
  const id=sesId(nm),snap=snapshot(false);snap.name=nm;let had=false;try{had=!!(await IDB.get('ses',id));}catch(e){}
  try{await IDB.put('ses',{id,name:nm,saved:Date.now(),snap:JSON.parse(JSON.stringify(snap)),smp:smpPack(),pads:SMPL.pads.some(Boolean)?padsPack():null});}
  catch(e){shMsg('No pude guardar en el teléfono ('+(e&&(e.name||e.message)||e)+').');return false;}
  queueSave();shMsg('✓ GUARDADA EN EL TELÉFONO: '+nm+(had?' (reemplacé la anterior con ese nombre)':''));libList();return true;}
async function libOpen(id){
  let r=null;try{r=await IDB.get('ses',id);}catch(e){}if(!r){shMsg('No encontré esa sesión.');libList();return;}
  loadSession(r.snap);S.name=r.name;$('#shName').value=r.name;
  const ch=r.snap.smp&&r.snap.smp.chops;if(r.smp){smpUnpack(r.smp,ch);}else{SMPL.buf=null;SMPL.rbuf=null;SMPL.name='';}padsUnpack(r.pads,ch);
  smpStore();smpUi();queueSave();shMsg('✓ ABIERTA: '+r.name);toast('SESIÓN '+r.name);setTimeout(()=>sheet.classList.remove('on'),700);}
function libJson(r){
  const j=JSON.parse(JSON.stringify(r.snap));j.smp=j.smp||{};
  if(r.smp){const q=new Int16Array(r.smp.pcm),f=new Float32Array(q.length);for(let i=0;i<q.length;i++)f[i]=q[i]/32767;
    const e=smpEncode({getChannelData:()=>f,sampleRate:r.smp.rate,duration:f.length/r.smp.rate},r.smp.name);if(e)j.smp.pcm=e;}
  if(r.pads)j.smp.pads=r.pads.map(p=>{if(!p)return null;const q=new Int16Array(p.pcm),f=new Float32Array(q.length);for(let i=0;i<q.length;i++)f[i]=q[i]/32767;return smpEncode({getChannelData:()=>f,sampleRate:p.rate,duration:f.length/p.rate},p.name);});
  const d=new Date(r.saved),fn='GB-'+(r.name.replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'')||'sesion')+'-'+d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate())+'.json',data=JSON.stringify(j);
  return {fn,data};}
async function libShare(id){
  let r=null;try{r=await IDB.get('ses',id);}catch(e){}if(!r)return;const {fn,data}=libJson(r);
  try{const f=new File([data],fn,{type:'application/json'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:fn});shMsg('✓ Enviada: '+fn);return;}}
  catch(e){if(e&&e.name==='AbortError'){shMsg('Cancelaste el menú de compartir.');return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=fn;document.body.appendChild(a);a.click();a.remove();shMsg('✓ Descargando '+fn);}
const lrow=(main,sub,onMain,btns)=>{const r=document.createElement('div');r.className='lrow';
  const m=document.createElement('button');m.className='cap dark lm';m.innerHTML='<span></span><small></small>';m.firstChild.textContent=main;m.lastChild.textContent=sub;m.onclick=()=>onMain(m);r.appendChild(m);
  btns.forEach(([t,lab,fn])=>{const b=document.createElement('button');b.className='cap dark li';b.textContent=t;b.setAttribute('aria-label',lab);b.onclick=()=>fn(b);r.appendChild(b);});return r;};
async function libList(){
  const box=$('#shLocL');let a=[];try{a=await IDB.all('ses');}catch(e){box.innerHTML='';box.dataset.empty='Este navegador no deja guardar acá: usá ENVIAR A DRIVE.';return;}
  a.sort((x,y)=>y.saved-x.saved);box.innerHTML='';
  a.forEach(r=>box.appendChild(lrow(r.name,fmtD(r.saved)+(r.pads&&r.pads.some(Boolean)?' · CON PADS':r.smp?' · CON SAMPLE':''),m=>armTap(m,'<span>¿ABRIR '+r.name.replace(/</g,'')+'?</span><small>REEMPLAZA LO ACTUAL · TOCÁ DE NUEVO</small>',()=>libOpen(r.id)),
    [['↗','Enviar a Drive',()=>libShare(r.id)],['✕','Borrar',b=>armTap(b,'?',()=>IDB.del('ses',r.id).then(libList).then(()=>shMsg('Sesión borrada: '+r.name)).catch(()=>{}))]])));
  useEst();}
async function liveUp(r){const B=bk();if(!B||!DV.f){DV.lerr='sin carpeta';return false;}
  try{const t=r.name+'.'+lvExt(r.mime||r.blob.type||''),w=await B.write('TOMAS',t,r.blob,String(r.mime||r.blob.type||'audio/webm').split(';')[0]);
    DV.lastLive=w.id;await IDB.del('live',r.id).catch(()=>{});DV.lerr='';return t;}
  catch(e){DV.lerr=fsErr(e);return false;}}
function b64Of(r){const p=r&&r.payload,c=[];if(typeof p==='string')c.push(p);else if(p&&typeof p==='object')for(const k of ['content','base64Content','data','base64','fileContent'])if(typeof p[k]==='string')c.push(p[k]);
  ((r&&r.content)||[]).forEach(b=>{if(b&&b.type==='text'&&typeof b.text==='string')c.push(b.text);if(b&&b.resource&&typeof b.resource.blob==='string')c.push(b.resource.blob);});
  for(const x of c){const t=x.replace(/\s/g,'');if(/^[A-Za-z0-9+/=]{16,}$/.test(t))return t;}return null;}
async function drvLiveOpen(id,title){const B=bk();if(!B)return;shMsg('Abriendo '+title+'…');
  try{const bl=await B.read(id,true,title),mime=bl.type||mimeOf(title);
    LV.blob=bl.type?bl:new Blob([bl],{type:mime});LV.mime=mime;LV.dur=0;LV.id=null;LV.did=id;LV.name=title.replace(/\.\w+$/,'');shMsg('');liveSheetOpen();$('#lvMsg').textContent='En '+DV.f.name+' / TOMAS';}
  catch(e){shMsg(fsErr(e));}}
async function drvLive(ask){const box=$('#shLiveL');let loc=[];try{loc=await IDB.all('live');}catch(e){}
  loc.sort((x,y)=>y.saved-x.saved);box.innerHTML='';box.dataset.empty='Las tomas de ● LIVE van a '+(DV.f?DV.f.name:'tu carpeta')+' / TOMAS.';
  loc.forEach(r=>box.appendChild(lrow(r.name.replace(/^GB-LIVE-/,'LIVE '),'SIN PASAR A LA CARPETA · '+fmtT(r.dur||0)+' · '+((r.blob&&r.blob.size||0)/1048576).toFixed(1)+' MB',
    ()=>{LV.blob=r.blob;LV.dur=r.dur||0;LV.mime=r.mime||r.blob.type;LV.id=r.id;LV.did=null;LV.name=r.name;LV.saved=r.saved;liveSheetOpen();$('#lvMsg').textContent='Esta toma todavía no está en la carpeta.';},
    [['↑','Pasar a la carpeta',b=>{b.disabled=true;shMsg('Pasando '+r.name+'…');liveUp(r).then(t=>{shMsg(t?'✓ '+DV.f.name+' / TOMAS / '+t:'No pude pasarla'+(DV.lerr?' ('+DV.lerr+')':''));drvLive();});}]])));
  const B=bk();if(!B||!DV.f)return;
  try{const a=await B.list('TOMAS',ask);
    a.forEach(x=>box.appendChild(lrow(x.title.replace(/^GB-LIVE-/,'LIVE ').replace(/\.\w+$/,''),'EN '+(fMode()==='local'?'LA CARPETA':'DRIVE')+(x.t?' · '+fmtD(x.t):''),()=>drvLiveOpen(x.id,x.title),[])));}
  catch(e){}}
async function libLive(ask){
  if(fMode()&&DV.f)return drvLive(ask);
  const box=$('#shLiveL');let a=[];try{a=await IDB.all('live');}catch(e){box.innerHTML='';return;}
  a.sort((x,y)=>y.saved-x.saved);box.innerHTML='';
  a.forEach(r=>box.appendChild(lrow(r.name.replace(/^GB-LIVE-/,'LIVE '),fmtT(r.dur||0)+' · '+((r.blob&&r.blob.size||0)/1048576).toFixed(1)+' MB · '+fmtD(r.saved),
    ()=>{LV.blob=r.blob;LV.dur=r.dur||0;LV.mime=r.mime||r.blob.type;LV.id=r.id;LV.name=r.name;LV.saved=r.saved;liveSheetOpen();$('#lvMsg').textContent='Guardada en el teléfono.';},
    [['✕','Borrar',b=>armTap(b,'?',()=>IDB.del('live',r.id).then(libLive).catch(()=>{}))]])));
  useEst();}
function useEst(){try{if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(e=>{$('#shUse').textContent='USADO '+((e.usage||0)/1048576).toFixed(1)+' MB';}).catch(()=>{});}catch(e){}}
$('#shLoc').onclick=()=>fMode()?sesSave():libSave();

/* ---------------- rendimiento ---------------- */
const LATN={low:'BAJA',mid:'MEDIA',high:'ALTA'};
function perfUi(){$('#pfLite').textContent='LIVIANO: '+(PERF.lite?'SÍ':'NO');$('#pfLite').classList.toggle('on',PERF.lite);$('#pfLat').textContent='LATENCIA: '+LATN[PERF.lat];}
function perfSave(){try{localStorage.setItem('musica_gb_perf',JSON.stringify(PERF));}catch(e){}}
$('#pfLite').onclick=()=>{PERF.lite=!PERF.lite;perfSave();perfUi();updateRoutes();applyFx();toast(PERF.lite?'LIVIANO: menos voces y reverb simple':'MODO NORMAL');};
$('#pfLat').onclick=()=>{PERF.lat=PERF.lat==='low'?'mid':PERF.lat==='mid'?'high':'low';perfSave();perfUi();if(ctx)restartAudio();toast('LATENCIA '+LATN[PERF.lat]+(PERF.lat==='low'?' (puede cortarse en celus lentos)':''));};
perfUi();
const LCN={off:'NADA',auto:'AUTO',cal:'MEDIDA'};
function lcUi(){const b=$('#pfLc'),on=!!PERF.lc&&PERF.lc!=='off';b.textContent='COMPENSAR: '+LCN[PERF.lc||'off']+(on&&ctx?' · '+Math.round(latOut()*1000)+' ms':on&&PERF.lc==='cal'?' · '+PERF.lcMs+' ms':'');b.classList.toggle('on',on);}
$('#pfLc').onclick=()=>{initAudio();const o=['off','auto','cal'];let i=(o.indexOf(PERF.lc||'off')+1)%3;if(o[i]==='cal'&&!PERF.lcMs)i=0;PERF.lc=o[i];perfSave();lcUi();
  toast(PERF.lc==='off'?'SIN COMPENSAR (COMO ANTES)':PERF.lc==='auto'?'COMPENSAR AUTO · '+Math.round(latOut()*1000)+' ms (lo que informa el teléfono)':'COMPENSAR MEDIDA · '+PERF.lcMs+' ms');};
/* CALIBRAR: 12 clicks cada 0,75 s; tocás cuando los ESCUCHÁS. La mediana de (toque − click) es la demora total (salida + pantalla) */
const CAL={on:false,clicks:[],taps:[],tm:null,iv:.75};
function calStop(){clearTimeout(CAL.tm);CAL.on=false;$('#calGo').textContent='EMPEZAR';}
function calStart(){initAudio();if(!ctx)return;calStop();if(ctx.state!=='running')ctx.resume().catch(()=>{});
  const n=12,t0=ctx.currentTime+.8;CAL.on=true;CAL.clicks=[];CAL.taps=[];
  for(let i=0;i<n;i++){const t=t0+i*CAL.iv;CAL.clicks.push(t);click(t,i%4===0);}
  $('#calGo').textContent='MIDIENDO…';$('#calMsg').textContent='Tocá cuando escuches cada click';
  CAL.tm=setTimeout(calEnd,(t0-ctx.currentTime+n*CAL.iv+.7)*1000);}
function calTap(){if(!CAL.on||!ctx)return;CAL.taps.push(ctx.currentTime);const b=$('#calPad');b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),90);$('#calMsg').textContent=CAL.taps.length+' / '+CAL.clicks.length;}
function calCalc(clicks,taps,iv){const used=new Set(),off=[];
  taps.forEach(t=>{const k=clicks.findIndex(c=>t-c>-.12&&t-c<=iv-.12);if(k>=2&&!used.has(k)){used.add(k);off.push(t-clicks[k]);}});   // los 2 primeros clicks son para agarrar el ritmo
  if(off.length<6)return {ok:false,why:'pocos'};
  const md=a=>{const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;},m=md(off),sp=md(off.map(x=>Math.abs(x-m)));
  if(sp>.045)return {ok:false,why:'desparejo',ms:Math.round(m*1000),sp:Math.round(sp*1000)};
  return {ok:true,ms:clamp(Math.round(m*1000),0,600),sp:Math.round(sp*1000),n:off.length};}
function calEnd(){if(!CAL.on)return;calStop();const r=calCalc(CAL.clicks,CAL.taps,CAL.iv),au=ctx?Math.round(((ctx.outputLatency||0)+(ctx.baseLatency||0))*1000):0;
  if(!r.ok){$('#calMsg').textContent=r.why==='pocos'?'Faltaron toques. Probá de nuevo: tocá con cada click.':'Los toques quedaron muy desparejos (±'+r.sp+' ms). Probá de nuevo, más tranquilo.';return;}
  PERF.lcMs=r.ms;PERF.lc='cal';perfSave();lcUi();
  $('#calMsg').textContent='LATENCIA MEDIDA: '+r.ms+' ms (±'+r.sp+')\nCOMPENSAR quedó en MEDIDA'+(au?'\n(el teléfono informa '+au+' ms)':'');toast('COMPENSAR: '+r.ms+' ms');}
$('#pfCal').onclick=()=>{$('#calMsg').textContent=PERF.lcMs?'Última medida: '+PERF.lcMs+' ms':'';$('#calSheet').classList.add('on');};
$('#calGo').onclick=calStart;
$('#calPad').addEventListener('pointerdown',e=>{e.preventDefault();calTap();});
$('#calX').onclick=()=>{calStop();$('#calSheet').classList.remove('on');};
$('#calOff').onclick=()=>{calStop();PERF.lc='off';perfSave();lcUi();$('#calSheet').classList.remove('on');toast('SIN COMPENSAR (COMO ANTES)');};
lcUi();

/* ---------------- gráficos animados (v11): espectro del master, filtro/envolvente/LFO, pad XY y buses FX ---------------- */
const DPR=()=>Math.min(2,window.devicePixelRatio||1);
function cvFit(cv){const d=DPR(),W=Math.max(10,Math.round(cv.clientWidth*d)),H=Math.max(10,Math.round(cv.clientHeight*d));
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}const c=cv.getContext('2d');c.clearRect(0,0,W,H);return {c,W,H,d};}
const hexA=(h,a)=>{const n=parseInt(h.slice(1,7),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';};
const UIF=(px,d,w)=>(w||500)+' '+Math.round(px*d)+'px "Helvetica Neue",Helvetica,-apple-system,Arial,sans-serif';
const DIMC='#8f8b83',INK='#e8e5de';
function lpMag(f,fc,qdb){const q=Math.pow(10,qdb/20),r=f/fc;return 1/Math.sqrt((1-r*r)*(1-r*r)+(r/q)*(r/q));}
function lfoWave(s,ph){ph-=Math.floor(ph);return s==='triangle'?1-4*Math.abs(ph-.5):s==='square'?(ph<.5?1:-1):s==='sawtooth'?2*ph-1:Math.sin(ph*2*Math.PI);}
const hash=n=>{const x=Math.sin(n*12.9898)*43758.5453;return x-Math.floor(x);};
function poly(c,pts){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));}
function curveFill(c,pts,base,col,a1,a2,lw){
  c.beginPath();c.moveTo(pts[0][0],base);pts.forEach(p=>c.lineTo(p[0],p[1]));c.lineTo(pts[pts.length-1][0],base);c.closePath();
  const top=Math.min(...pts.map(p=>p[1])),g=c.createLinearGradient(0,top,0,base);g.addColorStop(0,hexA(col,a1));g.addColorStop(1,hexA(col,a2));c.fillStyle=g;c.fill();
  poly(c,pts);c.strokeStyle=col;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';c.stroke();}
function label(c,txt,x,y,d,col,al,sz){c.font=UIF(sz||8.5,d,600);c.fillStyle=col||DIMC;c.textAlign=al||'left';c.textBaseline='top';c.fillText(txt,x,y);}
function grid(c,x0,y0,W,H,nx,ny,a){c.strokeStyle='rgba(255,255,255,'+(a||.04)+')';c.lineWidth=1;c.beginPath();
  for(let i=1;i<nx;i++){const x=Math.round(x0+i*W/nx)+.5;c.moveTo(x,y0);c.lineTo(x,y0+H);}for(let j=1;j<ny;j++){const y=Math.round(y0+j*H/ny)+.5;c.moveTo(x0,y);c.lineTo(x0+W,y);}c.stroke();}
function dotGlow(c,x,y,r,col){c.fillStyle=hexA(col,.16);c.beginPath();c.arc(x,y,r*2.6,0,7);c.fill();c.fillStyle=hexA(col,.35);c.beginPath();c.arc(x,y,r*1.6,0,7);c.fill();c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,7);c.fill();}
const nowA=()=>ctx?ctx.currentTime:performance.now()/1000;

const scopeCv=$('#scope'),fbuf=new Float32Array(512),SPC=new Float32Array(300);
/* SCRATCH: apretar el bailarín frena el tema; arriba/abajo adelanta/atrasa; al soltar vuelve a la velocidad normal */
const SCR_PX=.005;   // segundos de audio por píxel de arrastre
(function scratchTouch(){let y0=0,id=null;
  scopeCv.addEventListener('pointerdown',e=>{const r=scopeCv.getBoundingClientRect();if(e.clientX-r.left>62)return;e.preventDefault();initAudio();
    if(!ctx)return;if(!SCR.node){toast(SCR.err?'SCRATCH NO DISPONIBLE ('+SCR.err+')':'SCRATCH: preparando el audio, probá de nuevo');return;}
    if(!scrDown())return;id=e.pointerId;y0=e.clientY;try{scopeCv.setPointerCapture(id);}catch(x){}});
  scopeCv.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;let s=(y0-e.clientY)*SCR_PX;const mx=.05-SCR.g0,mn=-9.9-SCR.g0;if(s>mx){y0=e.clientY+mx/SCR_PX;s=mx;}if(s<mn){y0=e.clientY-mn/SCR_PX;s=mn;}scrMove(s);});
  const up=e=>{if(e.pointerId!==id)return;id=null;scrUp();};
  scopeCv.addEventListener('pointerup',up);scopeCv.addEventListener('pointercancel',up);})();

/* --- isotipo MUSICA GROOVEBOX: baila al pulso en el medidor de arriba --- */
const ISO=new Path2D('M254 774C232 771 231 771 229 769C224 764 223 752 226 734C228 725 227 722 224 726C223 727 221 730 219 733C217 736 214 739 214 741C212 745 208 748 203 750C192 754 165 760 156 760C153 760 148 761 146 761C143 763 138 763 118 762C85 761 81 760 78 756C75 752 75 752 68 757C59 762 54 756 58 744C58 741 59 735 59 731C59 723 60 721 66 721C72 721 78 727 78 734C78 739 78 739 97 739C122 739 148 737 156 736C199 728 208 723 218 702C221 696 223 694 226 692C231 689 232 685 232 677C231 673 231 670 232 668C234 665 234 664 233 659C230 651 231 650 234 646C241 638 241 637 241 616C242 594 242 594 248 594C252 594 253 595 255 600C258 606 260 608 264 611C272 615 270 622 261 622C256 622 256 622 256 626C256 632 258 634 263 634C270 634 277 639 279 646C281 655 268 665 260 660C256 657 255 658 253 684C253 691 252 699 251 702C250 705 250 713 249 720C248 728 247 736 247 739C246 744 246 744 248 746C250 748 263 750 267 749C268 748 276 748 284 747C306 745 336 739 342 736C345 733 345 729 342 669C342 659 341 641 340 628C339 600 337 584 334 565C329 540 328 532 327 520C326 504 327 505 305 503C296 502 285 501 280 500C274 500 269 499 268 499C266 500 267 506 270 513C278 528 269 541 257 534C255 533 252 532 250 532C249 532 246 531 245 530C242 528 243 517 247 513C250 511 248 509 244 510C239 511 237 508 237 504C237 501 238 500 242 500C248 500 251 497 249 493C248 491 247 491 241 491L234 492 L233 483C233 476 233 475 235 474C239 472 239 469 236 464C234 460 233 457 235 454C236 453 236 450 234 445C233 440 233 435 233 425C233 406 236 407 204 407C189 406 175 406 172 405C160 403 106 404 101 406C96 408 81 408 70 406C62 405 44 406 41 408C40 409 40 414 40 427C39 451 37 469 35 475C31 483 33 484 45 485C55 486 59 484 56 479C52 473 55 467 60 468C63 469 65 472 66 479C66 483 67 485 75 491C78 494 78 500 75 506C68 517 70 516 40 516C12 516 10 516 7 509C5 503 7 483 12 468C13 464 14 456 15 451C16 446 16 441 16 441C17 441 18 432 19 422C21 413 22 402 23 399C24 396 24 394 24 393C24 391 37 379 41 377C48 374 70 374 77 376C81 378 82 378 85 377C91 375 100 375 104 377C107 379 109 379 135 380C150 380 168 380 175 381C182 381 194 382 203 383C212 383 220 384 222 384C232 385 233 384 233 362C235 313 237 303 246 296C254 290 257 290 285 289C299 289 311 289 312 289C314 289 315 282 315 264C317 227 318 212 324 184C327 166 339 130 350 102C360 75 402 32 428 22C451 12 485 6 505 7C513 7 520 8 521 8C521 9 526 10 532 10C544 13 562 18 568 22C594 39 610 55 618 71C619 72 621 75 623 77C626 82 629 93 634 123C635 130 636 131 638 134C642 137 642 138 638 142C636 145 635 146 635 156C635 168 634 178 631 187C629 191 629 194 629 198C630 201 629 204 626 214C624 221 621 233 619 240C616 248 614 256 613 259C612 264 612 270 614 273C617 279 614 287 608 291C604 293 604 294 604 299C604 301 603 305 602 307C598 313 598 314 601 320C606 329 603 348 596 355C594 357 594 358 594 362C595 365 595 369 595 370C595 384 595 388 596 391C597 392 598 396 598 398C598 401 599 403 601 405C603 407 604 411 605 413C606 417 608 417 617 415C621 415 631 414 639 413C649 413 655 413 658 411C662 410 667 410 696 410C730 411 734 410 754 408C781 405 781 405 789 400C795 396 820 391 824 394C825 395 835 416 835 418C835 418 836 421 837 423C839 425 841 430 841 433C842 437 844 441 845 443C848 450 847 455 842 454C839 453 832 441 827 430C825 425 824 423 822 422C819 422 809 424 802 426C788 432 760 436 738 436C733 436 711 436 689 436C658 436 646 436 634 437C625 438 615 439 612 439C606 438 606 438 606 442C606 447 610 470 613 484C614 489 616 496 616 499C618 507 619 508 624 506C631 503 633 504 638 507C641 510 644 511 650 513C654 513 661 515 666 517C671 518 677 519 680 519C682 519 685 520 687 520C690 522 702 524 726 527C738 529 750 527 764 523C770 522 776 520 778 520C779 520 787 518 796 516C805 514 816 512 820 512C836 510 840 508 847 498C849 495 853 494 855 496C858 499 856 514 853 519C851 521 850 523 849 525C849 526 849 528 848 530C847 537 842 540 835 537C830 535 822 536 808 539C804 540 797 541 794 542C792 542 788 543 787 544C786 544 782 545 779 545C773 546 763 549 758 551C752 553 733 553 716 550C708 548 694 546 685 545C675 544 667 542 662 540C658 538 652 537 648 537C644 536 639 535 636 533C628 530 625 530 624 535C624 539 626 540 634 543C648 548 647 556 632 555C625 554 625 556 629 563C632 568 632 569 630 576C628 580 630 585 635 590C639 594 639 596 634 600C631 601 630 603 630 604C630 609 632 623 634 630C635 634 636 639 636 641C636 648 636 648 665 648C680 648 692 648 693 649C695 650 697 650 700 648C703 647 706 646 708 646C709 646 712 646 714 645C717 644 726 643 738 641C744 640 750 638 749 636C749 635 723 635 713 637C708 637 700 638 690 637C681 637 672 636 669 637C661 638 656 634 657 626C658 624 658 624 672 623C681 623 691 623 696 622C706 621 731 621 736 622C739 623 751 623 764 624C804 625 819 627 826 633C829 636 829 636 835 635C844 635 847 635 849 639C853 647 846 653 836 650C831 648 830 648 826 650C820 652 820 653 824 658C833 671 828 681 814 676C809 674 806 674 804 678C804 680 802 682 800 683C799 683 797 685 797 687C796 689 795 690 787 690C780 690 778 691 776 692C775 693 771 695 768 696C765 697 761 699 760 700C757 702 753 704 749 704C747 704 742 706 737 708C732 710 724 713 719 715C710 718 691 728 689 730C686 735 675 738 662 738C653 739 648 739 643 741C639 742 632 744 626 744C620 745 613 746 610 746C607 747 601 747 597 747C593 747 585 748 580 748C575 749 568 750 564 751C550 753 547 754 533 761C518 768 516 768 512 761C511 758 509 754 506 752C500 745 498 731 502 724C504 722 504 720 503 714C499 684 497 667 494 630C493 606 492 598 487 576C485 570 484 563 484 561C482 554 476 528 475 524C473 520 470 520 430 515C425 514 418 513 414 513C388 510 344 507 343 508C342 509 345 538 351 572C354 593 356 606 358 646C359 655 360 675 361 688C363 724 363 751 361 756C358 762 356 763 330 768C307 773 273 776 254 774ZM536 733C543 730 546 729 560 727C587 723 599 720 599 717C599 713 593 705 589 703C578 695 577 668 587 663C590 661 609 655 614 654C618 653 619 651 618 646C618 643 616 637 616 632C615 628 613 620 612 616C612 612 610 605 610 600C609 594 609 590 607 587C605 585 605 583 605 580C606 577 605 572 605 568C604 565 603 560 603 558C602 551 600 548 597 547C593 545 581 543 574 543C569 543 567 543 565 541C560 537 550 535 526 531C522 530 514 528 510 527C497 524 494 524 494 528C494 531 498 550 501 559C503 565 504 570 508 593C509 599 511 606 511 610C513 618 515 637 516 664C516 674 517 685 518 688C519 695 521 712 521 718C521 724 525 737 528 737C528 737 532 735 536 733ZM619 717C623 717 629 715 631 714C633 714 638 713 641 712C650 710 652 708 649 704C648 703 645 698 643 694C637 685 632 679 629 679C626 679 605 683 603 684C599 685 599 693 603 699C606 703 607 708 604 712C602 716 603 717 606 718C611 719 610 719 619 717ZM77 714C73 709 72 705 75 698C75 695 76 689 77 684C77 674 79 666 84 649C87 640 88 638 93 635C95 634 97 633 97 632C97 631 89 631 85 632C70 637 67 636 65 628C65 626 65 623 66 622C67 620 90 617 96 619C101 620 109 619 140 615C154 613 183 614 184 616C184 619 183 620 175 621C160 623 155 626 166 627C172 628 176 630 176 634C176 635 177 637 178 639C183 646 179 648 161 648C147 648 137 649 120 652C103 655 102 656 99 673C98 680 96 688 95 690C93 695 91 702 91 707C91 717 83 721 77 714ZM692 699C700 695 708 691 710 690C713 689 718 687 721 685C731 681 748 674 759 671C764 670 770 668 774 667C777 666 784 665 788 664C802 663 807 660 797 659C780 657 763 659 742 666C728 671 696 675 671 675C650 675 650 675 663 692C671 702 675 706 676 706C676 706 684 703 692 699ZM578 518C582 516 587 515 588 515C592 514 594 511 594 509C592 506 586 473 585 464C583 444 582 444 570 446C560 449 557 447 557 439C557 434 560 431 567 428C577 425 578 423 575 418C574 415 573 413 573 411C573 410 572 406 570 403C565 392 564 377 567 372C571 368 571 366 568 362C565 358 566 355 569 351C572 347 572 348 571 337C567 316 563 314 556 328C551 337 547 341 543 341C539 341 538 339 538 327C538 315 540 317 517 315C501 314 501 314 497 316C491 320 487 320 484 317C481 315 481 315 476 320C470 328 464 326 464 317L464 312 L457 311C449 311 449 311 448 316C446 322 436 321 424 313C420 311 419 311 408 310C387 308 387 308 385 313C382 322 371 320 364 308C362 305 361 304 358 303C355 302 352 301 351 301C344 299 338 301 338 305C338 316 320 319 312 309C309 307 308 306 302 305C295 305 268 308 266 309C265 310 264 318 263 337C263 351 261 367 260 373C258 386 258 386 265 388C277 393 275 407 263 407C259 407 259 408 260 426C261 435 261 448 262 456C262 467 262 469 265 471C266 473 267 475 266 476C263 483 266 485 274 485C278 484 284 485 289 485C308 487 322 488 345 489C358 490 374 490 378 491C383 491 393 492 400 493C414 494 439 498 451 500C464 502 467 501 467 495C467 484 480 488 485 500C487 505 490 506 503 507C507 508 515 509 522 511C530 513 540 515 546 516C551 516 558 518 561 519C569 520 570 520 578 518ZM581 302C583 300 584 293 581 291C580 289 578 289 573 289C566 290 566 290 566 295C566 300 567 302 573 303C579 304 579 304 581 302ZM544 299C548 297 551 288 549 284C546 280 519 269 517 272C517 272 515 277 513 283C510 297 510 297 524 298C529 299 533 299 534 299C536 300 542 300 544 299ZM487 294C489 293 491 291 492 289C495 284 499 266 498 264C497 260 478 257 474 260C470 263 468 284 471 289C474 294 481 296 487 294ZM453 293C455 292 455 262 453 260C453 259 449 259 444 260L436 260 L435 276C434 290 434 292 436 293C438 294 450 294 453 293ZM414 290C415 290 416 289 416 289C418 279 419 264 418 263C416 261 393 261 392 263C391 265 385 286 385 287C385 290 390 292 404 292C411 292 413 292 414 290ZM364 280C368 279 374 262 376 246C377 242 378 238 378 236C383 227 399 227 404 236C407 240 409 241 418 240C449 236 491 235 497 238C501 240 504 239 506 235C508 233 509 232 512 232C518 232 519 234 523 244C524 248 523 247 536 254C544 257 548 258 555 259C560 260 564 261 565 261C566 262 570 263 574 263C586 264 587 263 591 248C592 243 594 236 596 232C597 228 599 222 600 218C600 214 603 207 604 200C614 170 619 122 615 116C613 113 612 114 610 122C609 129 608 131 602 141C597 147 573 165 568 165C564 165 560 163 557 160C556 159 553 156 550 154C543 148 542 145 544 142C545 139 545 139 544 137C541 134 541 133 543 130C545 129 547 125 548 121C559 94 589 83 607 99C613 106 614 104 609 90C598 58 569 34 539 32C535 31 529 30 526 29C515 25 480 27 460 34C433 43 428 46 401 73C377 97 370 108 365 130C363 135 360 146 358 154C356 162 354 170 354 172C354 173 353 180 352 186C351 192 349 202 348 207C348 212 347 218 346 220C345 223 344 232 344 242C343 251 343 262 342 267C342 277 343 279 351 279C354 279 358 280 359 280C362 281 363 281 364 280ZM392 167C390 165 389 162 389 159C388 154 386 151 380 144C376 140 377 132 382 127C385 123 385 123 384 120C381 114 393 95 403 89C405 88 410 85 413 82C423 74 429 72 435 76C437 78 440 79 442 80C453 85 456 98 447 111C438 123 418 144 407 151C404 154 402 156 401 163C399 171 396 172 392 167Z'),ISOW=862,ISOH=781;
function drawIso(c,cx,by,h,rot,sx,sy,col){c.save();c.translate(cx,by);c.rotate(rot);const k=h/ISOH;c.scale(k*sx,k*sy);c.translate(-ISOW/2,-ISOH);c.fillStyle=col;c.fill(ISO,'evenodd');c.restore();}
function drawDancer(c,x0,W,H,d){
  const t=performance.now()/1000,lvl=clamp(((MH.pk>-89?MH.pk:-60)+42)/40,0,1);
  let rot,sx=1,sy=1,yo=0,col='#e8e5de';
  if(SCR.held||SCR.landing){const so=scrOffNow();rot=clamp(so,-2,2)*2.2;col='#ff9440';sy=1+Math.max(-.2,Math.min(.15,so*.3));yo=-clamp(so,-1.5,1.5)*H*.06;}
  else if(S.playing&&S.cur>=0&&ctx){
    const pos=S.cur+clamp((vNow()-lastStepT)/sd(),0,.999),bp=(pos/4)%1,bi=Math.floor(pos/4),hop=Math.sin(Math.PI*bp);
    yo=-hop*H*(.07+.1*lvl);rot=(bi%2?1:-1)*hop*(.14+.18*lvl);
    const land=Math.pow(1-hop,6);sy=1-.16*land*(.4+lvl);sx=1+.12*land*(.4+lvl);
    if(Math.floor(pos/16)%2)sx=-sx;                                 // cada compás mira para el otro lado
  }else{rot=Math.sin(t*1.3)*.05;sy=1+Math.sin(t*2.6)*.025;}
  drawIso(c,x0+W/2,H-2*d+yo,H*.7,rot,sx,sy,col);
}

/* --- header (v12): medidor de salida estilo AUM (escala -60…+12, pico y RMS, retención) + progreso del compás --- */
const MH={pk:-90,pkT:0,rm:-90};
function drawScope(){
  const {c,W,H,d}=cvFit(scopeCv),acc='#ff9440',L=50*d,Rr=W-44*d,X=db=>L+clamp((db+60)/72,0,1)*(Rr-L);
  if(ctx&&anM){anM.getFloatFrequencyData(fbuf);const sr=ctx.sampleRate,N=fbuf.length,n=Math.min(SPC.length-1,Math.floor(W/(4*d))),pts=[];
    for(let k=0;k<=n;k++){const f=30*Math.pow(16000/30,k/n),b=Math.min(N-1,Math.max(1,Math.round(f/(sr/2)*N)));let db=fbuf[b];if(!isFinite(db))db=-140;const v=clamp((db+96)/78,0,1);SPC[k]=Math.max(v,SPC[k]*.9);pts.push([k/n*W,H-SPC[k]*H*.9]);}
    c.beginPath();c.moveTo(0,H);pts.forEach(p=>c.lineTo(p[0],p[1]));c.lineTo(W,H);c.fillStyle='rgba(232,229,222,.045)';c.fill();poly(c,pts);c.strokeStyle='rgba(232,229,222,.12)';c.lineWidth=d;c.stroke();}
  let pk=0,s2=0;if(ctx){for(let i=0;i<mbuf.length;i++){const v=mbuf[i];s2+=v*v;if(Math.abs(v)>pk)pk=Math.abs(v);}}
  const pdb=pk>1e-5?20*Math.log10(pk):-90,rdb=s2>1e-10?10*Math.log10(s2/mbuf.length):-90,now=performance.now();
  if(pdb>=MH.pk||now-MH.pkT>1600){MH.pk=pdb;MH.pkT=now;}MH.rm=Math.max(rdb,MH.rm-1.2);
  label(c,'SALIDA',(L+Rr)/2,0,d,DIMC,'center',7);
  const y1=13*d,y2=18.5*d,ys=24*d;
  const bar=(y,db,a)=>{const x1=X(db);if(x1<=L)return;const g=c.createLinearGradient(L,0,Rr,0);g.addColorStop(0,'rgba(63,191,90,'+a+')');g.addColorStop(.72,'rgba(166,214,74,'+a+')');g.addColorStop(.83,'rgba(240,176,60,'+a+')');g.addColorStop(.9,'rgba(232,72,60,'+a+')');
    c.fillStyle=g;c.fillRect(L,y-1.1*d,x1-L,2.2*d);};
  bar(y1,pdb,.95);bar(y2,rdb+3,.8);
  c.fillStyle=INK;c.fillRect(X(MH.pk)-.75*d,y1-2.5*d,1.5*d,5*d);
  c.strokeStyle='rgba(232,229,222,.5)';c.lineWidth=d;c.beginPath();c.moveTo(L,ys);c.lineTo(Rr,ys);
  for(let db=-60;db<=12;db+=6){const x=Math.round(X(db))+.5,big=db%12===0;c.moveTo(x,ys-(big?3.5:2)*d);c.lineTo(x,ys);}c.stroke();
  c.font=UIF(7,d,400);c.fillStyle='rgba(232,229,222,.55)';c.textAlign='center';c.textBaseline='top';
  for(let db=-60;db<=12;db+=12){const x=clamp(X(db),L+8*d,Rr-8*d);c.fillText(db===0?'0 dB':(db>0?'+':'')+db,x,ys+2.5*d);}
  const y1r=y1,y2r=y2;
  // lecturas
  c.font=UIF(10,d,400);c.textAlign='right';c.textBaseline='middle';c.fillStyle=MH.pk>-1?'#ff5a4a':acc;c.fillText(MH.pk>-89?MH.pk.toFixed(1):'-∞',W-3*d,y1r);
  c.fillStyle=acc;c.fillText(MH.rm>-89?MH.rm.toFixed(1):'-∞',W-3*d,y2r+4*d);
  // progreso del compás (línea naranja como el transporte de AUM)
  const sw=(Rr-L)/STEPS;c.fillStyle='rgba(232,229,222,.14)';c.fillRect(L,H-1.6*d,Rr-L,1*d);
  if(S.playing&&S.cur>=0){c.fillStyle=acc;c.fillRect(L,H-2*d,sw*(S.cur+1),2*d);}
  try{drawDancer(c,0,44*d,H,d);}catch(e){}
}

/* --- SEQ: vista ANILLO (v13) — pistas = anillos concéntricos, la elegida se agranda; el centro elige la pista --- */
const ringCv=$('#ring'),RRAD=[],RTHK=[],RTW=[],DJV={base:null,pos:0,rot:0};let RIN=0;
try{const v=localStorage.getItem('musica_gb_ring');S.ring=v===null?true:v==='1';}catch(e){S.ring=true;}
const RDENS=[.32,.18,.55,.12,.15,.2,.3,.25,.35,.3,.18,.25,.2,.12,.1,.08,.08,.25];
const rowHits=r=>{let n=0;for(let s=0;s<LEN[r];s++)n+=pat[r][s];return n;};
let NOTE_T=0;   // al abrir la paleta, el click del mismo toque no debe caer en una nota
function noteOpen(on){$('#rNote').classList.toggle('on',!!on);if(on)NOTE_T=performance.now();dirty=true;}
function ringUi(){
  {const pal=$('#palette'),want=S.ring?$('#rNoteBox'):$('#v-seq');if(pal.parentNode!==want)want.appendChild(pal);if(!S.ring)noteOpen(false);}
  $('#v-seq').classList.toggle('ringon',!!S.ring);$('#bRing').textContent=S.ring?'▦':'◯';$('#bRing').setAttribute('aria-label',S.ring?'Ver grilla':'Ver anillo');
  const r=S.sel.r,R=ROWS[r],nm=$('#rcName');nm.textContent=R.n;nm.style.setProperty('--c',R.c);
  $('#rcMeta').textContent=LEN[r]+' PASOS · '+rowHits(r)+' GOLPES';$('#rLenV').textContent=LEN[r];
  $('#rM').classList.toggle('on',!!RM[r]);$('#rS').classList.toggle('on',!!RS[r]);
  $$('#rPickBox .cap').forEach((b,k)=>b.classList.toggle('on',k===r));
}
function ringSel(r){noteOpen(false);r=(r+NR)%NR;S.sel={r,s:Math.min(S.sel.s,LEN[r]-1)};$('#rPicker').classList.remove('on');dirty=true;renderPalette();ringUi();}
function rowTool(t){
  const r=S.sel.r,L=LEN[r],R=ROWS[r];takeUndo();
  const arrs=[pat[r],XYR[r]];if(t==='rnd'||t==='clr')XYR[r].fill(null);if(R.t==='syn')arrs.push(seqN[R.k],synG[R.k]);else if(R.t==='chd')arrs.push(chdSeq,chdGate);else if(R.t==='smp')arrs.push(sSeq(R));else if(R.t==='vin')arrs.push(vinN[R.k],vinG[R.k]);
  if(t==='rnd'){for(let s=0;s<L;s++){pat[r][s]=Math.random()<RDENS[r]?1:0;if(!pat[r][s])continue;
      if(R.t==='syn'){seqN[R.k][s]=Math.floor(Math.random()*8);synG[R.k][s]=1;}else if(R.t==='chd'){chdSeq[s]=Math.floor(Math.random()*7);chdGate[s]=2;}else if(R.t==='smp')sSeq(R)[s]=1+Math.floor(Math.random()*NSP);else if(R.t==='vin'){vinN[R.k][s]=Math.floor(Math.random()*8);vinG[R.k][s]=[1,1,2,4][Math.floor(Math.random()*4)];}}
    if(r===0)pat[0][0]=1;}
  else if(t==='all'){for(let s=0;s<L;s++){pat[r][s]=1;if(R.t==='smp'&&!sSeq(R)[s])sSeq(R)[s]=SMPL.sel+1;}}
  else if(t==='clr'){for(let s=0;s<L;s++)pat[r][s]=0;}
  else arrs.forEach(A=>{const a=A.slice(0,L);if(t==='shl')a.push(a.shift());else if(t==='shr')a.unshift(a.pop());else a.reverse();for(let s=0;s<L;s++)A[s]=a[s];});
  dirty=true;renderPalette();ringUi();queueSave();
}
(function buildRing(){
  const box=$('#rPickBox');
  ROWS.forEach((R,r)=>{const b=document.createElement('button');b.className='cap';b.style.setProperty('--c',R.c);b.textContent=R.n;b.onclick=()=>ringSel(r);box.appendChild(b);});
  $('#rcName').onclick=()=>{ringUi();$('#rPicker').classList.add('on');};
  $('#rPicker').addEventListener('pointerdown',e=>{if(e.target.id==='rPicker')$('#rPicker').classList.remove('on');});
  $('#rNote').addEventListener('click',e=>{if(performance.now()-NOTE_T<500){e.stopPropagation();e.preventDefault();}},true);
  $('#rNote').addEventListener('pointerdown',e=>{if(performance.now()-NOTE_T<350){e.stopPropagation();return;}if(e.target.id==='rNote')noteOpen(false);},true);
  $('#rNote').addEventListener('click',e=>{const b=e.target.closest('.pal:not(.g) .cap');if(b)setTimeout(()=>noteOpen(false),160);});
  $('#rcPrev').onclick=()=>ringSel(S.sel.r-1);$('#rcNext').onclick=()=>ringSel(S.sel.r+1);
  $('#bRing').onclick=()=>{S.ring=!S.ring;try{localStorage.setItem('musica_gb_ring',S.ring?'1':'0');}catch(e){}ringUi();dirty=true;renderPalette();};
  $$('#rTools .cap').forEach(b=>b.onclick=()=>{rowTool(b.dataset.t);b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');});
  $('#rM').onclick=()=>{RM[S.sel.r]=!RM[S.sel.r];ringUi();queueSave();};
  $('#rS').onclick=()=>{RS[S.sel.r]=!RS[S.sel.r];ringUi();queueSave();};
  const setLen=n=>{const r=S.sel.r;LEN[r]=clamp(n,1,STEPS);if(S.sel.s>=LEN[r])S.sel={r,s:LEN[r]-1};dirty=true;ringUi();queueSave();};
  repeatBtn($('#rLenM'),()=>setLen(LEN[S.sel.r]-1));repeatBtn($('#rLenP'),()=>setLen(LEN[S.sel.r]+1));
  /* toques sobre el círculo */
  let pv=null,lastS=-1,down=false;
  const geo=e=>{const b=ringCv.getBoundingClientRect(),d=ringCv.width/b.width,x=(e.clientX-b.left)*d-ringCv.width/2,y=(e.clientY-b.top)*d-ringCv.height/2;let a=Math.atan2(x,-y)/(2*Math.PI);if(a<0)a+=1;return {a,rad:Math.hypot(x,y)};};
  const ringAt=rad=>{let best=-1,bd=1e9;for(let i=0;i<NR;i++){const dd=Math.abs(rad-RRAD[i]);if(dd<=RTW[i]/2+3&&dd<bd){bd=dd;best=i;}}return best;};
  let dj=null;   // modo DJ: {id,a,turns}
  ringCv.addEventListener('pointerdown',e=>{if(S.dj){const g=geo(e);if(g.rad<RIN*.6)return;e.preventDefault();initAudio();if(!ctx)return;
      if(!SCR.node){toast(SCR.err?'DJ NO DISPONIBLE ('+SCR.err+')':'DJ: preparando el audio, probá de nuevo');return;}
      if(!scrDown())return;dj={id:e.pointerId,a:g.a,turns:0};try{ringCv.setPointerCapture(e.pointerId);}catch(x){}return;}
    const g=geo(e),k=ringAt(g.rad);if(k<0)return;e.preventDefault();initAudio();
    if(k!==S.sel.r){ringSel(k);return;}
    const st=Math.floor(g.a*LEN[k])%LEN[k];lastS=st;down=true;try{ringCv.setPointerCapture(e.pointerId);}catch(x){}
    if(ROWS[k].t==='drum'){pv=pat[k][st]?0:1;pat[k][st]=pv;S.sel={r:k,s:st};if(pv&&ctx)drumPlay(k,ctx.currentTime+.005,.9);}else{pv=null;down=false;stepTap(k,st);}
    dirty=true;renderPalette();ringUi();queueSave();
    if(ROWS[k].t!=='drum'&&pat[k][st])noteOpen(true);});
  ringCv.addEventListener('pointermove',e=>{if(dj&&e.pointerId===dj.id){const g=geo(e);let da=g.a-dj.a;if(da>.5)da-=1;if(da<-.5)da+=1;dj.a=g.a;const T=STEPS*sd();dj.turns=clamp(dj.turns+da,(-9.9-SCR.g0)/T,(.05-SCR.g0)/T);scrMove(dj.turns*T);return;}   // tope: no se empuja más allá del punto donde frenó   // horario = adelanta: una vuelta = todo el secuenciador
    if(!down||pv===null)return;const r=S.sel.r,g=geo(e),st=Math.floor(g.a*LEN[r])%LEN[r];if(st===lastS)return;lastS=st;if(pat[r][st]!==pv){pat[r][st]=pv;S.sel={r,s:st};dirty=true;queueSave();}});
  const end=e=>{if(dj&&e&&e.pointerId===dj.id){dj=null;scrUp();return;}if(down)ringUi();down=false;pv=null;};ringCv.addEventListener('pointerup',end);ringCv.addEventListener('pointercancel',end);
  $('#rDJ').onclick=()=>{S.dj=!S.dj;try{localStorage.setItem('musica_gb_dj',S.dj?'1':'');}catch(x){}$('#rDJ').classList.toggle('on',S.dj);$('#ringWrap').classList.toggle('dj',S.dj);$('#v-seq').classList.toggle('djon',S.dj);djFxOff();
    $('#rNote').classList.remove('on');$('#rPicker').classList.remove('on');dirty=true;toast(S.dj?'DJ · el anillo es el plato: tocá para frenar, girá para scratchear, soltá y sigue':'DJ APAGADO · el anillo vuelve a editar pasos');};
  try{if(localStorage.getItem('musica_gb_dj')){S.dj=true;$('#rDJ').classList.add('on');$('#ringWrap').classList.add('dj');$('#v-seq').classList.add('djon');}}catch(x){}
})();
/* DJ: DELAY · FILTER · REVERB (los mismos efectos del pad de FX). Mantener = efecto prendido; mover el dedo = pad XY; soltar = apagado */
const DJFX=[['DLY','DELAY'],['FLT','FILTER'],['REV','REVERB']],DJXY={},DJR=230;   // DJR: px que recorre el pad virtual de punta a punta
/* KILL: apaga todo — para el tema, suelta todo lo trabado (pad, DJ, sirena, scratch, sampler) y reinicia el audio para cortar las colas */
function killAll(){
  try{if(S.playing)stop();}catch(e){}
  for(const t in XYH){const H=XYH[t];if(H.on){try{mfxOff(t);}catch(e){}H.on=false;}}XY.on=false;S.hold=false;
  try{$('#bHold').classList.remove('on');if(window.heldUi)heldUi();if(window.paintXY)paintXY();}catch(e){}
  try{djFxOff();}catch(e){}
  try{SMPL.voice.forEach(v=>{try{v&&v.stop();}catch(e){}});}catch(e){}
  try{if(ctx)restartAudio();}catch(e){}
  try{['#bSir','#bLatch','#sirPad'].forEach(s=>{const el=$(s);if(el)el.classList.remove('on','dn');});}catch(e){}
  try{$('#clipLed').classList.remove('on');}catch(e){}
  dirty=true;toast('KILL · todo apagado');}
$('#bKill').onclick=killAll;
function djFxOff(){Object.keys(DJXY).forEach(t=>{const o=DJXY[t];if(o){mfxOff(t);o.el.classList.remove('dn');}delete DJXY[t];});}
(function buildDjFx(){const box=document.createElement('div');box.id='djFx';$('#ringPanel').appendChild(box);
  DJFX.forEach(([t,n])=>{const b=document.createElement('button');b.className='cap djfx';b.dataset.t=t;b.style.setProperty('--c',FXC[t]);
    const hint=()=>'↔ '+XNAME[t][0]+'<br>↕ '+XNAME[t][1];b.innerHTML='<b>'+n+'</b><small>'+hint()+'</small><i class="dot"></i>';box.appendChild(b);
    const dot=b.querySelector('.dot'),set=e=>{const o=DJXY[t];if(!o)return;o.x=clamp(.5+(e.clientX-o.cx)/DJR,0,1);o.y=clamp(.5+(o.cy-e.clientY)/DJR,0,1);mfxOn(t,o.x,o.y);
      dot.style.left=o.x*100+'%';dot.style.top=(1-o.y)*100+'%';b.querySelector('small').innerHTML=XNAME[t][0]+' '+Math.round(o.x*100)+'<br>'+XNAME[t][1]+' '+Math.round(o.y*100);};
    b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();if(!ctx)return;try{b.setPointerCapture(e.pointerId);}catch(x){}const r=b.getBoundingClientRect();
      DJXY[t]={id:e.pointerId,el:b,cx:r.left+r.width/2,cy:r.top+r.height/2,x:.5,y:.5};b.classList.add('dn');set(e);});
    b.addEventListener('pointermove',e=>{const o=DJXY[t];if(o&&o.id===e.pointerId)set(e);});
    const up=e=>{const o=DJXY[t];if(!o||o.id!==e.pointerId)return;delete DJXY[t];b.classList.remove('dn');mfxOff(t);b.querySelector('small').innerHTML=hint();};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);});})();
function drawRing(){
  const wrap=$('#ringWrap'),wr=wrap.getBoundingClientRect(),sz=Math.max(60,Math.floor(Math.min(wr.width,wr.height)));
  if(ringCv.style.width!==sz+'px'){ringCv.style.width=sz+'px';ringCv.style.height=sz+'px';}
  {const b=$('#rDJ'),l=Math.round((wr.width-sz)/2+2)+'px',bt=Math.round((wr.height-sz)/2+2)+'px';if(b.style.left!==l)b.style.left=l;if(b.style.bottom!==bt)b.style.bottom=bt;}
  const now=ctx?vNow():0,frac=S.playing&&S.cur>=0&&ctx?clamp((now-lastStepT)/sd(),0,.999):0,fl=S.playing&&ctx?Math.max(0,1-(now-lastStepT)/.28):0;
  /* MODO DJ: el anillo es un vinilo que gira (horario) bajo la aguja fija arriba; lo que viene llega desde la izquierda */
  const DJM=!!S.dj;let djPos=S.playing&&S.cur>=0?S.cur+frac:0;
  if(SCR.held||SCR.landing){if(DJV.base==null)DJV.base=DJV.pos;djPos=DJV.base+scrOffNow()/sd();}else DJV.base=null;
  DJV.pos=djPos;DJV.rot=DJM?djPos/STEPS:0;
  const {c,W,H,d}=cvFit(ringCv),cx=W/2,cy=H/2,R=W/2-2*d,TAU=Math.PI*2,ang=DJM?(s,L)=>-(s/L)*TAU+djPos/STEPS*TAU-Math.PI/2:(s,L)=>s/L*TAU-Math.PI/2;
  /* ojo de pez */
  const rOut=R*.995,rIn=R*.47,band=rOut-rIn,sel=S.sel.r;
  for(let i=0;i<NR;i++){const dd=Math.abs(i-sel),tgt=!rowOn(i)?0:S.dj?1:dd===0?5.2:dd===1?2:1;RTHK[i]=RTHK[i]==null?tgt:RTHK[i]+(tgt-RTHK[i])*.25;}
  const sum=RTHK.reduce((a,b)=>a+b,0);let rr=rOut;for(let i=0;i<NR;i++){const th=RTHK[i]/sum*band;RRAD[i]=rr-th/2;RTW[i]=th;rr-=th;}
  const anySolo=RS.some(Boolean);c.lineCap='butt';
  for(let r=0;r<NR;r++){if(!rowOn(r))continue;const L=LEN[r],rad=RRAD[r],th=RTW[r],isSel=r===sel,col=ROWS[r].c,dim=RM[r]||(anySolo&&!RS[r]);
    const ps=S.playing&&S.cur>=0?(L>=STEPS?S.cur:(S.g||0)%L):-1,lw=Math.max(1.2*d,th*(isSel?.72:.62)),gap=Math.min(.06,.9/L*.12+.012);
    for(let s=0;s<L;s++){const on=pat[r][s],A0=ang(s,L),A1=ang(s+1,L),a0=Math.min(A0,A1)+gap,a1=Math.max(A0,A1)-gap;if(DJM&&!on)continue;   // DJ: solo los pasos programados
      if(on)c.strokeStyle=s===ps&&fl>0?hexA('#ffffff',.55+fl*.45):hexA(col,dim?.22:isSel||DJM?1:.8);
      else c.strokeStyle=isSel?'rgba(232,229,222,.2)':(s%4===0&&L===STEPS?'rgba(232,229,222,.09)':'rgba(232,229,222,.05)');
      c.lineWidth=lw;c.beginPath();c.arc(cx,cy,rad,a0,a1);c.stroke();
      if(on&&XYR[r][s]){const am=(a0+a1)/2,rr=rad+lw/2-Math.max(1.6*d,lw*.18);c.fillStyle=dim?'rgba(255,255,255,.3)':'rgba(255,255,255,.9)';c.beginPath();c.arc(cx+Math.cos(am)*rr,cy+Math.sin(am)*rr,Math.max(1,Math.min(1.6*d,lw*.14)),0,7);c.fill();}   // tiene movimiento grabado
      if(s===ps){c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=Math.max(1,.9*d);c.beginPath();c.arc(cx,cy,rad+lw/2+1.2*d,a0,a1);c.stroke();}
      if(isSel&&s===S.sel.s&&$('#rNote').classList.contains('on')){c.strokeStyle='#ff9440';c.lineWidth=1.4*d;c.beginPath();c.arc(cx,cy,rad-lw/2-1.6*d,a0,a1);c.stroke();}}
    if(ROWS[r].t==='vin'||ROWS[r].t==='syn'){const GG=ROWS[r].t==='vin'?vinG[ROWS[r].k]:synG[ROWS[r].k];c.strokeStyle=hexA(col,dim?.12:.45);c.lineWidth=Math.max(d,lw*.3);   // GATE: arco mientras la nota sigue sonando
      for(let s=0;s<L;s++)if(pat[r][s]){const g=Math.min(GG[s]||1,L);if(g>1){const u=ang(s+1,L),v=ang(s+g,L);c.beginPath();if(DJM)c.arc(cx,cy,rad,v+gap,u+gap);else c.arc(cx,cy,rad,u-gap,v-gap);c.stroke();}}}
    if(isSel&&!DJM){c.strokeStyle='rgba(255,148,64,.75)';c.lineWidth=1.2*d;c.beginPath();c.arc(cx,cy,rad+th/2,0,TAU);c.stroke();c.beginPath();c.arc(cx,cy,Math.max(1,rad-th/2),0,TAU);c.stroke();
      if(th>15*d){const RT=ROWS[r],segW=rad*TAU/L-4*d;c.textAlign='center';c.textBaseline='middle';
        for(let s=0;s<L;s++)if(pat[r][s]){const a=(ang(s,L)+ang(s+1,L))/2;
          let tx=String(s+1);if(RT.t==='syn')tx=noteName(scaleNote(seqN[RT.k][s],BASEOCT[RT.k]));else if(RT.t==='chd')tx=chordName(chdSeq[s],false).name;else if(RT.t==='smp')tx=sSeq(RT)[s]?'CH'+sSeq(RT)[s]:'—';else if(RT.t==='vin')tx=vinLbl(vinN[RT.k][s],0);
          let fs=Math.min(RT.t==='drum'?10:12,th/d*.46);c.font=UIF(fs,d,RT.t==='drum'?400:600);
          while(fs>6&&c.measureText(tx).width>segW){fs-=.5;c.font=UIF(fs,d,600);}
          c.fillStyle=RT.t==='drum'?'rgba(20,20,20,.78)':'rgba(12,12,12,.92)';c.fillText(tx,cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}}}}
  c.strokeStyle='rgba(232,229,222,.14)';c.lineWidth=d;c.beginPath();c.arc(cx,cy,rIn-2*d,0,TAU);c.stroke();
  RIN=rIn;
  if(DJM){const a=-Math.PI/2,hot=SCR.held||SCR.landing;c.strokeStyle=hot?'#ff9440':'rgba(255,148,64,.7)';c.lineWidth=(hot?2.2:1.4)*d;c.beginPath();c.moveTo(cx,cy-rIn+2*d);c.lineTo(cx,cy-R);c.stroke();   // aguja
    c.fillStyle=c.strokeStyle;c.beginPath();c.moveTo(cx-5*d,cy-R-1*d);c.lineTo(cx+5*d,cy-R-1*d);c.lineTo(cx,cy-R+6*d);c.closePath();c.fill();
    c.strokeStyle='rgba(232,229,222,.06)';c.lineWidth=d;for(let k=1;k<4;k++){c.beginPath();c.arc(cx,cy,rIn-2*d-k*4*d,0,TAU);c.stroke();}}   // surcos del label
  else if(S.playing&&S.cur>=0){const a=(S.cur+frac)/STEPS*TAU-Math.PI/2;c.strokeStyle='rgba(232,229,222,.3)';c.lineWidth=d;c.beginPath();c.moveTo(cx+Math.cos(a)*rIn,cy+Math.sin(a)*rIn);c.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);c.stroke();}
  /* el centro se escala al hueco disponible */
  const k=clamp((rIn/d*2-8)/176,.5,1).toFixed(3),ce=$('#rCenter');if(ce._k!==k){ce._k=k;ce.style.transform='translate(-50%,-50%) scale('+k+')';}
}

/* --- teclas: filtro · envolvente · LFO (o los 8 golpes del kit) --- */
const vvCv=$('#vview'),WCACHE={},DN=['KICK','SNARE','C.HAT','O.HAT','CLAP','TOM','RIM','COW'];
function kitPeaks(ki,i,n,full){const key=ki+':'+i+':'+n+':'+KVER+(full?'f':'');if(WCACHE[key])return WCACHE[key];const B=KB[ki];if(!(B&&B[i]))return null;
  const dd=B[i].getChannelData(0);let L=full?dd.length:Math.min(dd.length,Math.floor(B[i].sampleRate*.45));const o=new Float32Array(n);
  if(full){let e=dd.length-1;while(e>0&&Math.abs(dd[e])<.006)e--;L=Math.min(dd.length,Math.floor(e*1.1+B[i].sampleRate*.015));o.len=L/B[i].sampleRate;}
  for(let x=0;x<n;x++){let m=0;const a=Math.floor(x/n*L),b=Math.floor((x+1)/n*L);for(let j=a;j<b;j+=2)m=Math.max(m,Math.abs(dd[j]));o[x]=m;}return WCACHE[key]=o;}
const SYNCN={4:'1/16',3:'1/8T',2:'1/8',1.5:'1/8T',1:'1/4',.5:'1/2',.25:'1 COMPÁS'};
function drawVoice(){
  const {c,W,H,d}=cvFit(vvCv),t=nowA();
  if(S.kmode==='drum'&&S.parOpen){const i=S.dsel,col=DR[i].c,e=dkE(i),B=KB[S.kit],el=ctx?t-DHIT[i]:9,top=17*d,h=H-top-5*d,mid=top+h/2,x0=7*d,w=W-14*d;
    c.beginPath();if(c.roundRect)c.roundRect(.75*d,.75*d,W-1.5*d,H-1.5*d,12*d);else c.rect(.75*d,.75*d,W-1.5*d,H-1.5*d);c.fillStyle='rgba(0,0,0,.16)';c.fill();c.strokeStyle='rgba(232,229,222,.16)';c.lineWidth=d;c.stroke();
    const dur=B&&B[i]?B[i].duration*Math.pow(2,-(e.tune||0)/12):0;
    label(c,DN[i]+' · '+(dur?Math.round(dur*1000)+' ms':'…'),x0,5*d,d,col);
    label(c,'AFIN '+DKDEF.tune.f(e.tune||0)+' · GOLPE '+DKDEF.hit.f(e.hit??.5)+' · '+DKDEF.snap.f(e.snap??.5),W-x0,5*d,d,DIMC,'right');
    grid(c,x0,top,w,h,8,2,.035);
    const n=Math.max(16,Math.floor(w/(1.5*d))),pk=kitPeaks(S.kit,i,n,true);
    if(pk){const top_=[],bot=[];for(let k=0;k<n;k++){const x=x0+k/(n-1)*w,a=Math.pow(pk[k],.8)*h*.48;top_.push([x,mid-a]);bot.push([x,mid+a]);}
      const vd=(pk.len||dur)*Math.pow(2,-(e.tune||0)/12),fl=el>=0&&el<vd?1-el/vd:0;c.beginPath();top_.forEach((p,k)=>k?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));for(let k=n-1;k>=0;k--)c.lineTo(bot[k][0],bot[k][1]);c.closePath();
      c.fillStyle=hexA(col,.22+fl*.25);c.fill();c.strokeStyle=hexA(col,.85);c.lineWidth=1.2*d;c.stroke();
      if(fl>0){const px=x0+(1-fl)*w;c.strokeStyle=INK;c.lineWidth=1.2*d;c.beginPath();c.moveTo(px,top);c.lineTo(px,top+h);c.stroke();}}
    return;}
  if(S.kmode==='drum'){const col=CH[0].c,cw=W/4,rh=H/2;
    for(let i=0;i<8;i++){const x0=(i%4)*cw,y0=Math.floor(i/4)*rh,e=ctx?t-DHIT[i]:9,fl=e>=0&&e<.4?Math.pow(1-e/.4,2):0;
      c.fillStyle=hexA(col,.03+fl*.2);c.fillRect(x0+2*d,y0+2*d,cw-4*d,rh-4*d);c.strokeStyle=hexA(col,.08+fl*.5);c.lineWidth=d;c.strokeRect(x0+2.5*d,y0+2.5*d,cw-5*d,rh-5*d);
      const n=Math.max(8,Math.floor((cw-14*d)/(2*d))),pk=kitPeaks(S.kit,i,n),mid=y0+rh*.62,amp=rh*.26;
      if(pk){c.beginPath();for(let k=0;k<n;k++){const x=x0+7*d+k*2*d;c.moveTo(x,mid-pk[k]*amp-.5);c.lineTo(x,mid+pk[k]*amp+.5);}c.strokeStyle=hexA(col,.35+fl*.65);c.lineWidth=d;c.stroke();}
      if(S.parOpen&&i===S.dsel){c.strokeStyle=hexA(DR[i].c,.9);c.lineWidth=1.5*d;c.strokeRect(x0+2.5*d,y0+2.5*d,cw-5*d,rh-5*d);}
      label(c,DN[i],x0+7*d,y0+6*d,d,fl>.15||(S.parOpen&&i===S.dsel)?col:DIMC,'left',7.5);}
    return;}
  if(S.kmode==='vin'){drawVin(c,W,H,d,t);return;}
  const k=S.kmode==='chd'?-1:+S.kmode[3],P=curPar(),col=k<0?CH[3].c:CH[1+k].c,gap=6*d,pw=(W-2*gap)/3,top=17*d;
  const dEff=Math.min(1,(P.lfoD||0)+MOD*(1-(P.lfoD||0))),lon=dEff>=.02,rate=P.sync?S.bpm/60*P.sync:P.lfoR,ph=t*rate;
  const panel=(x0,name,val)=>{c.beginPath();if(c.roundRect)c.roundRect(x0+.75*d,.75*d,pw-1.5*d,H-1.5*d,12*d);else c.rect(x0+.75*d,.75*d,pw-1.5*d,H-1.5*d);c.fillStyle='rgba(0,0,0,.16)';c.fill();c.strokeStyle='rgba(232,229,222,.16)';c.lineWidth=d;c.stroke();
    label(c,name,x0+6*d,5*d,d);label(c,val,x0+pw-6*d,5*d,d,col,'right');};
  /* FILTRO: curva de respuesta real (pasabajos 12 dB/oct), el corte se mueve con el LFO */
  let x0=0;const base=120*Math.pow(60,P.cut);let fc=base;
  if(P.lfoT===0&&lon)fc=base*Math.pow(2,lfoWave(P.lfoS,ph)*dEff*(P.sync?2200:1500)/1200);fc=clamp(fc,30,16000);
  panel(x0,'FILTRO',HZ(fc));
  {const h=H-top-4*d,pts=[],n=44;for(let j=0;j<=n;j++){const f=30*Math.pow(16000/30,j/n),m=20*Math.log10(lpMag(f,fc,P.res));pts.push([x0+3*d+j/n*(pw-6*d),top+clamp((20-m)/56,0,1)*h]);}
    c.save();c.beginPath();c.rect(x0,top-2*d,pw,H-top+2*d);c.clip();grid(c,x0,top,pw,h,4,2,.035);curveFill(c,pts,H,col,.32,.02,1.5*d);
    const cx=x0+3*d+Math.log(fc/30)/Math.log(16000/30)*(pw-6*d);dotGlow(c,cx,top+clamp((20-20*Math.log10(lpMag(fc,fc,P.res)))/56,0,1)*h,2.2*d,col);c.restore();}
  /* ENVOLVENTE: ADSR con las voces que suenan como puntos */
  x0=pw+gap;panel(x0,'ENV',tfmt(P.atk)+' · '+tfmt(P.rel));
  {const h=H-top-6*d,hold=.35,tau=P.dec/3+.005,tr=P.rel/3+.005,s1=P.atk+P.dec+hold,tot=s1+P.rel*1.4,sx=pw-12*d,X=s=>x0+6*d+s/tot*sx,Y=v=>top+(1-v)*h;
    const Lr=P.sus+(1-P.sus)*Math.exp(-(s1-P.atk)/tau),ev=s=>s<P.atk?s/Math.max(P.atk,1e-4):s<s1?P.sus+(1-P.sus)*Math.exp(-(s-P.atk)/tau):Lr*Math.exp(-(s-s1)/tr);
    const pts=[];for(let j=0;j<=56;j++){const s=j/56*tot;pts.push([X(s),Y(ev(s))]);}
    grid(c,x0,top,pw,h,4,2,.035);curveFill(c,pts,top+h,col,.3,.02,1.5*d);
    c.strokeStyle='rgba(255,255,255,.12)';c.setLineDash([2*d,3*d]);c.beginPath();c.moveTo(X(s1),top);c.lineTo(X(s1),top+h);c.stroke();c.setLineDash([]);
    if(ctx){let n=0;LIVE.forEach(v=>{if(v.P!==P||n>7||!v.t0)return;let s=v.done?s1+(t-v.tr):Math.min(t-v.t0,P.atk+P.dec+hold*.6);if(s<0||s>tot)return;n++;dotGlow(c,X(s),Y(ev(s)),2.3*d,col);});}}
  /* LFO: forma de onda con el punto de fase */
  x0=2*(pw+gap);panel(x0,'LFO → '+['CORTE','TONO','VOL'][P.lfoT||0],lon?(P.sync?(SYNCN[P.sync]||P.sync+'/♩'):rate.toFixed(1)+' Hz'):'OFF');
  {const h=H-top-6*d,mid=top+h/2,sx=pw-12*d,win=2,cyc=clamp(rate*win,.2,26),n=Math.min(300,Math.max(90,Math.round(cyc*26))),amp=h/2*.94*(lon?Math.max(.03,dEff):.5),pts=[];
    for(let j=0;j<=n;j++){const u=j/n;pts.push([x0+6*d+u*sx,mid-lfoWave(P.lfoS||'sine',ph-(1-u)*cyc)*amp]);}
    grid(c,x0,top,pw,h,4,2,.035);c.strokeStyle='rgba(232,229,222,.12)';c.lineWidth=d;c.beginPath();c.moveTo(x0+6*d,mid);c.lineTo(x0+6*d+sx,mid);c.stroke();
    poly(c,pts);c.strokeStyle=lon?col:'rgba(143,139,131,.35)';c.lineWidth=(lon?1.5:1)*d;c.lineJoin='round';if(!lon)c.setLineDash([3*d,3*d]);c.stroke();c.setLineDash([]);
    if(lon)dotGlow(c,x0+6*d+sx,mid-lfoWave(P.lfoS||'sine',ph)*amp,2.3*d,col);}
}

/* --- VINTAGE: timbre (drawbars u onda) · envolvente · rotor girando --- */
const ROTV={ph:0,f:0,lt:0};
/* tocar el panel ROTOR = la llave del leslie (LENTO ↔ RÁPIDO), con la aceleración del motor */
function lesToggle(){const P=S.vinPar;if(P.fx!=='slow'&&P.fx!=='fast')return false;P.fx=P.fx==='fast'?'slow':'fast';vinFx();queueSave();if(S.parOpen)buildParPanel();toast('LESLIE '+(P.fx==='fast'?'RÁPIDO':'LENTO'));return true;}
$('#vview').addEventListener('pointerdown',e=>{if(S.kmode!=='vin')return;const r=$('#vview').getBoundingClientRect();if(e.clientX-r.left>r.width*2/3){initAudio();lesToggle();}});
function rotTick(){const P=S.vinPar,now=performance.now()/1000,dt=ROTV.lt?Math.min(.1,now-ROTV.lt):0,on=P.fx!=='off',tg=on?(ROTM[P.fx]||ROTM.off)[0]:0;ROTV.lt=now;
  ROTV.f+=(tg-ROTV.f)*(1-Math.exp(-dt/((P.fx==='slow'||P.fx==='fast')?.8:.05)));ROTV.ph+=dt*ROTV.f*Math.PI*2;return ROTV.ph;}
function drawVin(c,W,H,d,t){
  const P=S.vinPar,col=CH[6].c,gap=6*d,pw=(W-2*gap)/3,top=17*d,h=H-top-6*d,rp=rotTick();
  const panel=(x0,name,val)=>{c.beginPath();if(c.roundRect)c.roundRect(x0+.75*d,.75*d,pw-1.5*d,H-1.5*d,12*d);else c.rect(x0+.75*d,.75*d,pw-1.5*d,H-1.5*d);c.fillStyle='rgba(0,0,0,.16)';c.fill();c.strokeStyle='rgba(232,229,222,.16)';c.lineWidth=d;c.stroke();
    label(c,name,x0+6*d,5*d,d);label(c,val,x0+pw-6*d,5*d,d,col,'right');};
  let last=0;LIVE.forEach(v=>{if(v.P===P&&!v.done&&v.t0>last)last=v.t0;});const act=last>0,el=ctx&&act?Math.max(0,t-last):9;
  /* 1 · timbre */
  let x0=0;
  if(P.e==='org'){panel(x0,'DRAWBARS',P.db.join(''));const bw=(pw-12*d)/9,spin=P.fx==='slow'||P.fx==='fast';
    grid(c,x0,top,pw,h,1,4,.035);
    for(let i=0;i<9;i++){const v=P.db[i]/8,x=x0+6*d+i*bw,wob=spin?1+Math.sin(rp+i*.8)*.07*v:1,hh=Math.max(1.5*d,v*h*wob);
      c.fillStyle=hexA(col,(act?.3:.16)+.55*v);c.fillRect(x+1*d,top+h-hh,bw-2*d,hh);}}
  else{panel(x0,'ONDA',{ep:'FM',ana:'ANALÓGICO',clav:'CLAVI',str:'CUERDAS'}[P.e]||'');
    const mid=top+h/2,amp=h*.42,n=96,pts=[],ix=(P.ix||1)*(act?Math.exp(-el*2.5)+.12:.35);
    for(let j=0;j<=n;j++){const u=j/n*2,th=u*2*Math.PI;let y;
      if(P.e==='ep')y=Math.sin(th+ix*Math.sin(th));
      else if(P.e==='clav'){const ph=u%1;y=(ph<.5?.8:-.8)*(1-.3*Math.exp(-ph*9));}
      else{let s=0;for(let k=1;k<=10;k++)s+=Math.sin(k*th)/k*Math.exp(-k*(1-P.cut)*.5);y=s*.6;}
      pts.push([x0+6*d+j/n*(pw-12*d),mid-y*amp]);}
    grid(c,x0,top,pw,h,4,2,.035);poly(c,pts);c.strokeStyle=act?col:hexA(col,.55);c.lineWidth=1.5*d;c.lineJoin='round';c.stroke();}
  /* 2 · envolvente */
  x0=pw+gap;panel(x0,'ENV',tfmt(P.atk)+' · '+tfmt(P.rel));
  {const hold=.35,tau=P.dec/3+.005,tr=P.rel/3+.005,s1=P.atk+P.dec+hold,tot=s1+P.rel*1.4,sx=pw-12*d,X=s=>x0+6*d+s/tot*sx,Y=v=>top+(1-v)*h;
    const Lr=P.sus+(1-P.sus)*Math.exp(-(s1-P.atk)/tau),ev=s=>s<P.atk?s/Math.max(P.atk,1e-4):s<s1?P.sus+(1-P.sus)*Math.exp(-(s-P.atk)/tau):Lr*Math.exp(-(s-s1)/tr);
    const pts=[];for(let j=0;j<=56;j++){const s=j/56*tot;pts.push([X(s),Y(ev(s))]);}
    grid(c,x0,top,pw,h,4,2,.035);curveFill(c,pts,top+h,col,.3,.02,1.5*d);
    if(ctx){let n=0;LIVE.forEach(v=>{if(v.P!==P||n>7||!v.t0)return;let s=v.done?s1+(t-v.tr):Math.min(t-v.t0,P.atk+P.dec+hold*.6);if(s<0||s>tot)return;n++;dotGlow(c,X(s),Y(ev(s)),2.3*d,col);});}}
  /* 3 · rotor */
  x0=2*(pw+gap);panel(x0,'ROTOR',(ROTN.find(o=>o[1]===P.fx)||ROTN[0])[0]);
  {const cx=x0+pw/2,cy=top+h/2,R=Math.max(6*d,Math.min(pw*.34,h*.46)),on=P.fx!=='off';
    c.strokeStyle='rgba(232,229,222,.14)';c.lineWidth=d;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
    if(on){for(const o of [0,Math.PI]){c.fillStyle=hexA(col,.26);c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R,rp+o-.38,rp+o+.38);c.closePath();c.fill();}
      dotGlow(c,cx+Math.cos(rp)*R,cy+Math.sin(rp)*R,2.3*d,col);label(c,ROTV.f.toFixed(1)+' Hz',x0+pw-6*d,top+h-4*d,d,DIMC,'right',7.5);
      if(P.fx==='slow'||P.fx==='fast')label(c,'TOCÁ ⟳',x0+6*d,top+h-4*d,d,hexA(col,.8),'left',7.5);}
    else label(c,'SIN ROTOR',cx,cy-4*d,d,DIMC,'center',7.5);
    if(P.drv>.02&&P.fx!=='slow'&&P.fx!=='fast')label(c,'DRIVE '+PCT(P.drv),x0+6*d,top+h-4*d,d,DIMC,'left',7.5);}
}

/* --- pad XY: curva del efecto, estela del dedo y anillos al pulso --- */
const xyCv=$('#xyc'),TRAIL=[];
function drawXY(){
  const {c,W,H,d}=cvFit(xyCv),col=FXC[S.mfx],X=XY.x,Yv=XY.y,px=X*W,py=(1-Yv)*H,t=nowA(),bp=(t*S.bpm/60)%1,on=XY.on;
  grid(c,0,0,W,H,8,5,.045);
  c.globalAlpha=on?1:.38;
  const m=S.mfx;
  if(m==='FLT'){const fc=80*Math.pow(250,X),q=.7+Yv*14,pts=[],n=90;for(let j=0;j<=n;j++){const f=80*Math.pow(250,j/n),g=20*Math.log10(lpMag(f,fc,q));pts.push([j/n*W,H*.62-clamp(g,-40,24)/40*H*.42]);}curveFill(c,pts,H,col,.28,0,2*d);}
  else if(m==='DLY'){const fb=.2+X*.7,n=10,x0=W*.06,sp=W*.093,base=H*.94,pulse=Math.floor((t*S.bpm/60)*2)%n;
    for(let k=0;k<n;k++){const h=(H*.78)*Math.max(.05,Yv)*Math.pow(fb,k),x=x0+k*sp,lit=k===pulse&&on;c.strokeStyle=hexA(col,lit?1:.75*Math.pow(.92,k));c.lineWidth=(lit?4:3)*d;c.lineCap='round';c.beginPath();c.moveTo(x,base);c.lineTo(x,base-h);c.stroke();if(lit)dotGlow(c,x,base-h,3*d,col);}}
  else if(m==='REV'){const n=Math.floor(W/(3*d)),mid=H*.6;c.strokeStyle=hexA(col,.7);c.lineWidth=1.6*d;c.beginPath();
    for(let j=0;j<n;j++){const u=j/n,e=Math.exp(-u*(4.5-X*2.5))*Math.max(.06,Yv)*(.45+.55*hash(j)),x=u*W;c.moveTo(x,mid-e*H*.45);c.lineTo(x,mid+e*H*.3);}c.stroke();}
  else if(m==='DST'){const k=1+X*14,sz=Math.min(W,H)*.78,ox=(W-sz)/2,oy=(H-sz)/2,pts=[];for(let j=0;j<=60;j++){const u=j/60*2-1,y=Math.tanh(k*u)/Math.tanh(k);pts.push([ox+(u+1)/2*sz,oy+(1-y)/2*sz]);}
    c.strokeStyle='rgba(255,255,255,.12)';c.setLineDash([3*d,4*d]);c.beginPath();c.moveTo(ox,oy+sz);c.lineTo(ox+sz,oy);c.stroke();c.setLineDash([]);
    poly(c,pts);c.strokeStyle=col;c.lineWidth=2*d;c.stroke();const u=Math.sin(t*5.2),y=Math.tanh(k*u)/Math.tanh(k);dotGlow(c,ox+(u+1)/2*sz,oy+(1-y)/2*sz,3*d,col);}
  else if(m==='REP'){const div=[1,.5,.25,.125][Math.min(3,Math.floor(X*4))],n=Math.round(4/div),cw=W/n,cur=Math.floor(((t*S.bpm/60)%4)/div);
    for(let i=0;i<n;i++){const lit=on&&i===cur;c.fillStyle=hexA(col,lit?.5:i%Math.max(1,Math.round(1/div))===0?.16:.07);c.fillRect(i*cw+1.5*d,H*.3,cw-3*d,H*.4);}}
  c.globalAlpha=1;
  /* estela */
  if(on){TRAIL.push([X,Yv]);if(TRAIL.length>28)TRAIL.shift();}else if(TRAIL.length)TRAIL.shift();
  if(TRAIL.length>1){c.lineCap='round';for(let i=1;i<TRAIL.length;i++){const a=i/TRAIL.length;c.strokeStyle=hexA(col,a*.7);c.lineWidth=(1+a*3)*d;c.beginPath();c.moveTo(TRAIL[i-1][0]*W,(1-TRAIL[i-1][1])*H);c.lineTo(TRAIL[i][0]*W,(1-TRAIL[i][1])*H);c.stroke();}}
  if(on){c.strokeStyle=hexA(col,.25);c.lineWidth=d;c.setLineDash([2*d,4*d]);c.beginPath();c.moveTo(px,0);c.lineTo(px,H);c.moveTo(0,py);c.lineTo(W,py);c.stroke();c.setLineDash([]);
    for(const o of [0,.5]){const q=(bp+o)%1;c.strokeStyle=hexA(col,(1-q)*.55);c.lineWidth=1.5*d;c.beginPath();c.arc(px,py,(16+q*46)*d,0,7);c.stroke();}
    dotGlow(c,px,py,7*d,col);c.fillStyle='#0e1013';c.beginPath();c.arc(px,py,3*d,0,7);c.fill();
    label(c,Math.round(X*100)+' · '+Math.round(Yv*100),px+12*d,py-20*d,d,col,px>W*.75?'right':'left',9);}
  else{c.strokeStyle=hexA(col,.35);c.lineWidth=1.5*d;c.beginPath();c.arc(px,py,8*d,0,7);c.stroke();}
}

/* --- páginas de FX: diagrama vivo de cada bus --- */
function drawBus(){
  const cv=$('#busc');if(!cv||!cv.isConnected)return;const {c,W,H,d}=cvFit(cv),m=S.fxMode,t=nowA(),beat=t*S.bpm/60,pad=8*d,top=18*d,h=H-top-pad,w=W-2*pad;
  const col={DLY:'#ffb347',REV:'#c9a6ff',MOD:'#4df0c4',DST:'#ff5a4a',MST:'#e7e9ec'}[m]||'#5ef2cf';
  grid(c,pad,top,w,h,8,4,.04);
  if(m==='DLY'){const P=FXP.dly,div=DIVS[P.div][1],beats=4,n=Math.min(40,Math.floor(beats/div)),bw=w/beats,pos=(beat%beats)*bw,br=.45+.55*(P.tone-300)/8700;
    label(c,'DELAY · '+DIVS[P.div][0]+' · FEEDBACK '+PCT(P.fb),pad,5*d,d,col);
    for(let k=0;k<=n;k++){const x=pad+k*div*bw,amp=k===0?1:Math.min(1,P.ret)*Math.pow(P.fb,k-1);if(amp<.01)break;const hh=h*amp,lit=S.playing&&pos>=k*div*bw&&pos-k*div*bw<Math.min(bw*div,bw*.5);
      c.strokeStyle=k===0?'rgba(231,233,236,.55)':hexA(col,(lit?1:.75)*(k===0?1:br));c.lineWidth=(lit?4:3)*d;c.lineCap='round';c.beginPath();c.moveTo(x+2*d,top+h);c.lineTo(x+2*d,top+h-hh);c.stroke();if(lit&&k)dotGlow(c,x+2*d,top+h-hh,2.5*d,col);}
    if(S.playing){c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=d;c.beginPath();c.moveTo(pad+pos,top);c.lineTo(pad+pos,top+h);c.stroke();}}
  else if(m==='REV'){const P=FXP.rev,pre=P.pre/1000,span=Math.max(1.5,(pre+P.size)*1.1),X=s=>pad+s/span*w,dmp=clamp(P.damp/14000,.12,1),n=Math.floor(w/(2.5*d));
    label(c,'REVERB · '+P.size.toFixed(1)+' s · PRE '+Math.round(P.pre)+' ms',pad,5*d,d,col);
    c.strokeStyle=hexA(col,.55);c.lineWidth=1.2*d;c.beginPath();
    for(let j=0;j<n;j++){const s=j/n*span;if(s<pre)continue;const e=Math.exp(-6.9*(s-pre)/P.size)*(.55+.45*hash(j));const x=X(s);c.moveTo(x,top+h);c.lineTo(x,top+h-e*h);}c.stroke();
    const pts=[],pts2=[];for(let j=0;j<=60;j++){const s=pre+j/60*(span-pre);pts.push([X(s),top+h-Math.exp(-6.9*(s-pre)/P.size)*h]);pts2.push([X(s),top+h-Math.exp(-6.9*(s-pre)/(P.size*dmp))*h]);}
    poly(c,pts);c.strokeStyle=col;c.lineWidth=1.6*d;c.stroke();poly(c,pts2);c.strokeStyle='rgba(231,233,236,.4)';c.setLineDash([3*d,3*d]);c.lineWidth=d;c.stroke();c.setLineDash([]);
    label(c,'AGUDOS',X(pre)+4*d,top+3*d,d,'rgba(231,233,236,.45)','left',7);
    const sc=t%span;c.strokeStyle='rgba(255,255,255,.16)';c.beginPath();c.moveTo(X(sc),top);c.lineTo(X(sc),top+h);c.stroke();}
  else if(m==='MOD'){const P=FXP.mod,cyc=2,mid=top+h/2,amp=h*.42*Math.max(.08,P.depth);
    label(c,(P.mode?'FLANGER':'CHORUS')+' · '+P.rate.toFixed(1)+' Hz · '+PCT(P.depth),pad,5*d,d,col);
    for(const [off,a,lw] of [[0,1,1.7],[.25,.4,1.2]]){const pts=[];for(let j=0;j<=100;j++){const u=j/100;pts.push([pad+u*w,mid-Math.sin(2*Math.PI*(u*cyc-t*P.rate*.5+off))*amp]);}poly(c,pts);c.strokeStyle=hexA(col,a);c.lineWidth=lw*d;c.stroke();}
    if(P.fb>.02){const pts=[];for(let j=0;j<=100;j++){const u=j/100;pts.push([pad+u*w,mid-Math.sin(2*Math.PI*(u*cyc-t*P.rate*.5-.12))*amp*P.fb]);}poly(c,pts);c.strokeStyle=hexA(col,.25);c.lineWidth=d;c.stroke();}
    label(c,'L',pad+3*d,mid-amp-12*d<top?top+2*d:mid-amp-12*d,d,col,'left',7);}
  else if(m==='DST'){const P=FXP.dst,k=P.drive*90+2,sz=h,ox=pad,oy=top,f=u=>(1+k)*u/(1+k*Math.abs(u));
    label(c,'DIST · DRIVE '+PCT(P.drive)+' · TONO '+HZ(P.tone),pad,5*d,d,col);
    c.strokeStyle='rgba(255,255,255,.14)';c.setLineDash([2*d,3*d]);c.lineWidth=d;c.beginPath();c.moveTo(ox,oy+sz);c.lineTo(ox+sz,oy);c.stroke();c.setLineDash([]);c.strokeRect(ox+.5,oy+.5,sz,sz);
    const pts=[];for(let j=0;j<=60;j++){const u=j/60*2-1;pts.push([ox+(u+1)/2*sz,oy+(1-f(u)*.98)/2*sz]);}poly(c,pts);c.strokeStyle=col;c.lineWidth=1.8*d;c.stroke();
    const u=Math.sin(t*2*Math.PI*.6);dotGlow(c,ox+(u+1)/2*sz,oy+(1-f(u)*.98)/2*sz,2.6*d,col);
    const x1=ox+sz+12*d,w1=W-pad-x1,mid=top+h/2,a=h*.42,inP=[],outP=[];for(let j=0;j<=90;j++){const v=j/90,s=Math.sin(2*Math.PI*(v*2-t*.6));inP.push([x1+v*w1,mid-s*a*.7]);outP.push([x1+v*w1,mid-f(s*.7)*a]);}
    poly(c,inP);c.strokeStyle='rgba(231,233,236,.25)';c.lineWidth=d;c.stroke();poly(c,outP);c.strokeStyle=col;c.lineWidth=1.6*d;c.stroke();
    label(c,'ENTRADA / SALIDA',x1,top+2*d,d,DIMC,'left',7);}
  else if(m==='MST'){const P=FXP.mst,T=-6-P.comp*16,R=2+P.comp*2,K=30,sz=h,ox=pad,oy=top,lo=-48;
    const cmp=x=>{let y;if(2*(x-T)<-K)y=x;else if(2*Math.abs(x-T)<=K)y=x+(1/R-1)*Math.pow(x-T+K/2,2)/(2*K);else y=T+(x-T)/R;return Math.min(y,-3+(y+3)*.05);};
    const XX=v=>ox+(v-lo)/-lo*sz,YY=v=>oy+(1-(v-lo)/-lo)*sz;
    label(c,'MASTER · COMP '+PCT(P.comp)+' · LIMITER -3 dB',pad,5*d,d,col);
    c.strokeStyle='rgba(255,255,255,.14)';c.setLineDash([2*d,3*d]);c.lineWidth=d;c.beginPath();c.moveTo(XX(lo),YY(lo));c.lineTo(XX(0),YY(0));c.stroke();c.setLineDash([]);c.strokeRect(ox+.5,oy+.5,sz,sz);
    const pts=[];for(let j=0;j<=60;j++){const v=lo+j/60*-lo;pts.push([XX(v),YY(cmp(v))]);}poly(c,pts);c.strokeStyle='#ff9440';c.lineWidth=1.8*d;c.stroke();
    const lvl=clamp(peakHold>1e-4?20*Math.log10(peakHold):lo,lo,0);if(ctx&&peakHold>.003)dotGlow(c,XX(lvl),YY(cmp(lvl)),2.6*d,'#ff9440');
    const x1=ox+sz+14*d,w1=W-pad-x1,bars=[['COMP',ctx&&mcomp?mcomp.reduction:0],['LIMIT',ctx&&lim?lim.reduction:0]];
    bars.forEach((b,i)=>{const y=top+6*d+i*26*d,gr=clamp(-(+b[1]||0)/12,0,1);label(c,b[0]+'  '+(+b[1]||0).toFixed(1)+' dB',x1,y,d,DIMC,'left',7.5);
      c.fillStyle='rgba(255,255,255,.06)';c.fillRect(x1,y+12*d,w1,4*d);c.fillStyle=i?'#ff5a4a':'#ffb347';c.fillRect(x1+w1*(1-gr),y+12*d,w1*gr,4*d);});
    const pk=peakHold>1e-4?20*Math.log10(peakHold):-Infinity;label(c,'PICO  '+(isFinite(pk)?pk.toFixed(1)+' dBFS':'-∞'),x1,top+58*d,d,pk>-1?'#ff5a4a':INK,'left',7.5);}
}


/* --- FX: animación de la sirena (barrido de tono + luz giratoria) --- */
const sirCv=$('#sirCv'),SIRT=[];let SIRA=0,SIRPH=0,SIRLT=0;
function drawSiren(){
  const {c,W,H,d}=cvFit(sirCv),col='#ff5a8a',on=!!sirV,now=performance.now()/1000,dt=SIRLT?Math.min(.1,now-SIRLT):0;SIRLT=now;
  SIRA+=((on?1:0)-SIRA)*.18;const rate=1.4*SIR.rm,pm=SIR.pm;SIRPH+=dt*rate;
  const tri=1-4*Math.abs((SIRPH%1)-.5),f=(520+260*tri)*pm;                         // misma forma que el LFO triangular del motor
  SIRT.push(on?f:0);if(SIRT.length>Math.floor(W/(3*d)))SIRT.shift();
  const cx=W*.82,cy=H/2,R=Math.max(W,H);
  if(SIRA>.02){/* luz giratoria */const a=SIRPH*Math.PI*2*.5;
    for(const o of [0,Math.PI]){const g=c.createRadialGradient(cx,cy,0,cx,cy,R*.9);g.addColorStop(0,hexA(col,.42*SIRA));g.addColorStop(1,hexA(col,0));
      c.fillStyle=g;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,R*.9,a+o-.32,a+o+.32);c.closePath();c.fill();}}
  /* anillos que laten con el LFO */
  for(let i=0;i<3;i++){const q=((SIRPH*.9+i/3)%1);c.strokeStyle=hexA(col,(on?(1-q)*.55:.12)*Math.max(.25,SIRA));c.lineWidth=1.5*d;c.beginPath();c.arc(cx,cy,(10+q*46)*d,0,Math.PI*2);c.stroke();}
  c.fillStyle=hexA(col,.35+.65*SIRA);c.beginPath();c.arc(cx,cy,(5+4*SIRA*tri)*d,0,Math.PI*2);c.fill();
  /* traza del tono (barrido) */
  const fy=v=>H*.86-(Math.log(Math.max(v,200)/200)/Math.log(2400/200))*H*.72,pts=[];
  SIRT.forEach((v,i)=>{if(v>0)pts.push([i*3*d,fy(v)]);else pts.push(null);});
  c.lineWidth=2*d;c.lineJoin='round';c.strokeStyle=hexA(col,.85);c.beginPath();let pen=false;
  pts.forEach(p=>{if(!p){pen=false;return;}if(!pen){c.moveTo(p[0],p[1]);pen=true;}else c.lineTo(p[0],p[1]);});c.stroke();
  if(!on&&SIRA<.05){c.strokeStyle=hexA(col,.18);c.lineWidth=d;c.beginPath();for(let x=0;x<=W*.7;x+=3*d){const y=H*.62+Math.sin(x/(22*d)+now*1.2)*H*.12;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
  else if(on&&pts.length&&pts[pts.length-1]){const p=pts[pts.length-1];dotGlow(c,p[0],p[1],3*d,col);label(c,Math.round(f)+' Hz',Math.min(p[0]+8*d,W-60*d),Math.max(4*d,p[1]-16*d),d,col,'left',8);}
}

let vizT=0;
function viz(){const now=performance.now();if(document.hidden||now-vizT<(PERF.lite?55:30))return;vizT=now;
  try{drawScope();}catch(e){}
  if(S.tab==='seq'&&S.ring)try{drawRing();}catch(e){}
  if(S.tab==='keys')try{drawVoice();}catch(e){}
  if(S.tab==='fx'){if(S.fxMode==='PAD'){try{drawXY();}catch(e){}try{drawSiren();}catch(e){}}else if(S.fxMode==='CAD'){try{drawPatch();}catch(e){}}else try{drawBus();}catch(e){}}
}

/* ---------------- loop de dibujo ---------------- */
function frame(){try{bmFlush();}catch(e){}
  updateCur();try{litTick();}catch(e){}if(S.bpm!==SPB){SPB=S.bpm;clearTimeout(SPT);SPT=setTimeout(smpPrep,300);}try{cntUi();}catch(e){}
  if(dirty){dirty=false;if(S.tab==='seq')refreshSeq();}
  try{drawMeters();}catch(e){}
  viz();
  if(CAP&&S.tab==='smp'&&ctx)$('#sInfo').textContent='GRABANDO '+CAP.label+'… '+(CAP.n/ctx.sampleRate).toFixed(1)+' s (máx 12)';
  requestAnimationFrame(frame);
}
$$('#tabs button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.t==='seq')dirty=true;}));
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&e.target.tagName!=='SELECT'&&e.target.tagName!=='INPUT'){e.preventDefault();togglePlay();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){sirHolds.clear();if(sirV)sirStop();$$('#pads .pad').forEach(el=>{if(el._v){try{(Array.isArray(el._v)?el._v:[el._v]).forEach(v=>v.stop());}catch(e){}el._v=null;el.classList.remove('dn');}});}});
window.addEventListener('resize',()=>{if(S.tab==='smp')drawWave();});
renderPalette();renderKeys();fxUi();sync();refreshSeq();smpUi();partUi();ringUi();smp2Ui();frame();
window.GB={trig,sd,PERF,S,CH,FXP,SMPL,pat,smpSeq,chdGate,snapshot,applySnapshot,loadSession,smpDemo,chopPlay,smpSet,smpEncode,smpDecode,get ctx(){return ctx;},get lim(){return lim;},get CAP(){return CAP;},recWrite,takeUndo,doUndo,bus,extractText};
</script>
</body>
</html>
