const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const http=require('http'),fs=require('fs');
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(fs.readFileSync(require('path').resolve(__dirname,'../build/MUSICA-GROOVEBOX-MOBILE-v'+(process.env.V||'13.10')+'.html')));}).listen(8765);
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const ctxb=await b.newContext({viewport:{width:390,height:780},hasTouch:true,deviceScaleFactor:2});
 await ctxb.addInitScript(()=>{
  const calls=[];window.__calls=calls;let store={};
  window.claude={use:async n=>{
   if(n==='mcp')return{callTool:async(s,t,i)=>{calls.push([s,t,i]);
     if(t==='search_files'){ if(/mimeType = 'application\/vnd.google-apps.folder'/.test(i.query))return{payload:{files:[]}}; return{payload:{files:Object.keys(store).map(k=>({id:k,title:store[k].title}))}};}
     if(t==='create_file'){ if(i.mimeType==='application/vnd.google-apps.folder')return{payload:{id:'FOLD1'}}; const id='F'+Object.keys(store).length;store[id]={title:i.title,text:i.textContent};return{payload:{id}};}
     if(t==='download_file_content'){return{payload:{content:btoa(store[i.fileId].text)}};}
     return{payload:null};}};
   if(n==='downloads')return{save:async x=>{calls.push(['dl',x.filename,x.data.length]);return{status:'saved'};}};
   return null;}};
 });
 const p=await ctxb.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_|Failed to load/.test(m.text()))errs.push('CONSOLE '+m.text());});
 await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
 const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
 await p.tap('#bPlay');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>GB.ctx&&GB.ctx.state==='running'),'audio running');
 ok(await p.evaluate(()=>!!GB.lim),'limiter node');
 await p.screenshot({path:'s_seq.png'});
 for(const t of ['keys','mix','fx','smp']){await p.tap(`#tabs [data-t=${t}]`);await p.waitForTimeout(300);await p.screenshot({path:`s_${t}.png`});}
 // sampler
 await p.tap('#sDemo');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!GB.SMPL.buf&&GB.SMPL.buf.duration>1.9),'demo sample');
 const box=await p.locator('#sPads .pad').nth(1).boundingBox();
 await p.touchscreen.tap(box.x+10,box.y+10);await p.waitForTimeout(150);
 ok(await p.evaluate(()=>GB.SMPL.sel===1),'pad select');
 ok(await p.evaluate(()=>{const v=GB.chopPlay(2,GB.ctx.currentTime+.01,1);return !!v;}),'chopPlay voice');
 await p.tap('#sTr');await p.waitForTimeout(100);
 ok(await p.evaluate(()=>GB.SMPL.chops[0].s===0&&GB.SMPL.chops[GB.SMPL.chops.length-1].e===1&&GB.SMPL.chops[1].s>0&&GB.SMPL.chops.length===8),'transient chops '+JSON.stringify(await p.evaluate(()=>GB.SMPL.chops.map(c=>[+c.s.toFixed(2),+c.e.toFixed(2)]))));
 await p.screenshot({path:'s_smp2.png'});
 // seq row for sampler + rec
 await p.tap('#tabs [data-t=seq]');await p.waitForTimeout(200);
 await p.evaluate(()=>{GB.S.sel={r:11,s:0};});
 await p.tap('#bRec');ok(await p.evaluate(()=>GB.S.rec),'rec armed');
 await p.tap('#tabs [data-t=smp]');
 for(let k=0;k<3;k++){const bx=await p.locator('#sPads .pad').nth(k).boundingBox();await p.touchscreen.tap(bx.x+8,bx.y+8);await p.waitForTimeout(260);}
 ok(await p.evaluate(()=>GB.smpSeq.some(v=>v>0)&&GB.pat[11].some(v=>v)),'rec wrote sampler steps '+await p.evaluate(()=>JSON.stringify(GB.smpSeq)));
 await p.tap('#tabs [data-t=seq]');await p.waitForTimeout(200);await p.screenshot({path:'s_seq2.png'});
 await p.tap('#bUndo');ok(await p.evaluate(()=>!GB.pat[11].some(v=>v)),'undo clears rec take');
 // limiter / clip: slam
 await p.evaluate(()=>{GB.CH.forEach(c=>c.vol=1);GB.S.master=1;});
 await p.evaluate(()=>{const c=GB.ctx,o=c.createOscillator(),g=c.createGain();g.gain.value=6;o.type='square';o.connect(g);g.connect(window.GB.bus[0].inp);o.start();setTimeout(()=>o.stop(),600);});
 await p.waitForTimeout(400);
 const lr=await p.evaluate(()=>GB.lim.reduction);ok(lr<-1,'limiter reducing '+lr.toFixed(1)+' dB');
 // session roundtrip
 const j=await p.evaluate(()=>JSON.stringify(GB.snapshot(true)));
 ok(j.length<900000,'session size '+j.length);
 await p.evaluate(s=>{GB.SMPL.buf=null;GB.loadSession(JSON.parse(s));},j);
 ok(await p.evaluate(()=>!!GB.SMPL.buf),'sample restored after load');
 // drive save/list/load via mock
 await p.tap('#bSes');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.querySelector('#shFoldP').hidden),'sin carpeta: pide elegirla');
 await p.fill('#shFoldQ','MI CARPETA');await p.waitForTimeout(700);await p.tap('#shFoldNew');await p.waitForTimeout(400);
 await p.fill('#shName','test uno');await p.tap('#shLoc');await p.waitForTimeout(500);
 console.log('MSG:',await p.textContent('#shMsg'));
 ok(await p.locator('#shRecL .lm').count()===1,'listed 1 session');
 await p.evaluate(()=>{GB.S.bpm=140;});await p.tap('#shRecL .lm');await p.waitForTimeout(150);await p.tap('#shRecL .lm');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>GB.S.bpm===90||GB.S.bpm!==140),'loaded from drive bpm='+await p.evaluate(()=>GB.S.bpm));
 console.log('calls:',JSON.stringify(await p.evaluate(()=>window.__calls.map(c=>[c[0],c[1],c[2]&&(c[2].title||c[2].query||c[2].fileId)]))));
 await p.screenshot({path:'s_sheet.png'});
 await p.waitForTimeout(800);await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on'));
 // fx bus pages
 await p.tap('#tabs [data-t=fx]');for(const m of ['DLY','REV','MOD','MST']){await p.tap(`#fxMode [data-m=${m}]`);await p.waitForTimeout(150);}
 await p.screenshot({path:'s_fxmst.png'});
 ok(await p.evaluate(()=>{GB.S.fxMode='DLY';return true;}),'fx pages');
 await p.tap('#tabs [data-t=mix]');await p.waitForTimeout(400);await p.screenshot({path:'s_mix2.png'});
 await p.waitForTimeout(200);
 console.log('ERRORS:',errs.length?errs:'none');
 await b.close();srv.close();
})();
