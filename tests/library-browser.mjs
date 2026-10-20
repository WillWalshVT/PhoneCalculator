import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const base=process.env.BASE_URL||'http://localhost:8176/PhoneCalculator/';
const external=!!process.env.BASE_URL;
const live=process.env.LIVE_SIGNALING==='1';
let server,browser;
const sockets=new Set(),events=[];
function matches(event,filter){return (!filter.kinds||filter.kinds.includes(event.kind))&&(!filter['#x']||event.tags.some(t=>t[0]==='x'&&filter['#x'].includes(t[1])));}
async function testRelay(context){
 if(live)return;
 await context.routeWebSocket(/wss:\/\//,ws=>{
  const state={ws,subs:new Map()};sockets.add(state);ws.onClose(()=>sockets.delete(state));
  ws.onMessage(raw=>{const [kind,id,...args]=JSON.parse(String(raw));if(kind==='REQ'){state.subs.set(id,args);for(const event of events)if(args.some(f=>matches(event,f)))ws.send(JSON.stringify(['EVENT',id,event]));ws.send(JSON.stringify(['EOSE',id]));}else if(kind==='CLOSE')state.subs.delete(id);else if(kind==='EVENT'){const event=id;events.push(event);ws.send(JSON.stringify(['OK',event.id,true,'']));for(const target of sockets)for(const [sub,filters]of target.subs)if(filters.some(f=>matches(event,f)))target.ws.send(JSON.stringify(['EVENT',sub,event]));}});
 });
 await context.addInitScript(()=>{const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(config){super({...config,iceServers:[]});}};});
}
const file=(name,body)=>({name,mimeType:'text/html',buffer:Buffer.from(body)});
const first='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><h1>Counter One</h1><button id="count"></button><script>let n=Number(localStorage.getItem("n")||0);const b=document.querySelector("button");const draw=()=>b.textContent="Count: "+n;draw();b.onclick=()=>{localStorage.setItem("n",++n);draw();};try{parent.document.body.dataset.compromised="yes";}catch{}<\/script>'+'<!--'+ 'transfer-chunk-test'.repeat(8000)+'-->';
const second='<!doctype html><h1>Second App</h1><p id="value"></p><script>document.querySelector("p").textContent=localStorage.getItem("n")||"No shared data";<\/script>';
try{
 if(!external){server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,PORT:'8176',PREVIEW_PREFIX:'/PhoneCalculator/'},stdio:'inherit'});for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}}
 browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch({headless:true});const senderContext=await browser.newContext();const phoneContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await testRelay(senderContext);await testRelay(phoneContext);
 const sender=await senderContext.newPage(),phone=await phoneContext.newPage();
  for(const page of [sender,phone]){page.on('console',m=>{if(m.type()==='error')console.log('Browser:',m.text());});}
const errors=[];for(const page of [sender,phone])page.on('pageerror',e=>errors.push(e.message));
 await sender.goto(base);await sender.getByText('● Offline ready').waitFor();console.log('Library cached.');await sender.locator('#show-send').click();await sender.locator('#html-files').setInputFiles(file('counter.html',first));await sender.locator('#app-name').fill('Counter One');await sender.locator('#app-id').fill('counter-one');await sender.locator('#pair').click();await sender.locator('#pairing:not([hidden])').waitFor();const link=await sender.locator('#pair-link').getAttribute('href');
 console.log('Invitation ready.');await phone.goto(link);console.log('Receiver loaded.');await phone.locator('#offer:not([hidden])').waitFor({timeout:live?90000:30000});console.log('Offer received.');await phone.locator('#accept-app').click();await phone.getByText('App saved. Open it from Your apps, even offline.').waitFor();await sender.getByText('App saved on the receiving device. You can close this tab.').waitFor();
 console.log('App transferred and saved.');await senderContext.close();
 await phone.getByRole('button',{name:'Open app ↗',exact:true}).click();const frame=phone.frameLocator('#app-frame');await frame.getByText('Counter One',{exact:true}).waitFor();console.log('Sandbox app opened.');await frame.locator('#count').click();await frame.getByText('Count: 1',{exact:true}).waitFor();await phone.getByText('Saved locally',{exact:true}).waitFor();assert.equal(await phone.evaluate(()=>document.body.dataset.compromised),undefined);await phone.locator('#exit-app').click();
 await phone.locator('#show-send').click();await phone.locator('#html-files').setInputFiles(file('second.html',second));await phone.locator('#save-local').click();await phone.getByText('App saved on this device. Open it from Your apps.').waitFor();
 await phone.getByRole('button',{name:'Open app ↗',exact:true}).first().click();await phone.frameLocator('#app-frame').getByText('No shared data').waitFor();await phone.locator('#exit-app').click();
 // Import a folder with an ES module and a fetchable JSON file.
 const folder=await import('node:fs/promises');const tmp=await folder.mkdtemp('/tmp/pocket-test-');await folder.writeFile(tmp+'/index.html','<!doctype html><h1 id="result">Loading</h1><script type="module" src="./main.js"></script>');await folder.writeFile(tmp+'/main.js','import {label} from "./helper.js";const data=await fetch("./data.json").then(r=>r.json());document.querySelector("h1").textContent=label+data.n;');await folder.writeFile(tmp+'/helper.js','export const label="Module app: ";');await folder.writeFile(tmp+'/data.json','{"n":42}');
 console.log('Per-app storage isolated.');await phone.locator('#folder-files').setInputFiles(tmp);await phone.locator('#app-name').fill('Module App');await phone.locator('#app-id').fill('module-app');await phone.locator('#save-local').click();await phone.getByText('App saved on this device. Open it from Your apps.').waitFor();await phone.getByRole('button',{name:'Open app ↗',exact:true}).first().click();await phone.frameLocator('#app-frame').getByText('Module app: 42').waitFor();await phone.locator('#exit-app').click();await folder.rm(tmp,{recursive:true});
 await phone.locator('#html-files').setInputFiles(file('counter.html',first.replace('Counter One','Counter One Updated')));await phone.locator('#app-name').fill('Counter One');await phone.locator('#app-id').fill('counter-one');await phone.locator('#save-local').click();await phone.getByText('App saved on this device. Open it from Your apps.').waitFor();
 const updated=phone.locator('.app-card').filter({has:phone.getByRole('heading',{name:'Counter One',exact:true})});await updated.getByRole('button',{name:'Open app ↗',exact:true}).click();await phone.frameLocator('#app-frame').getByText('Counter One Updated',{exact:true}).waitFor();await phone.frameLocator('#app-frame').getByText('Count: 1',{exact:true}).waitFor();await phone.locator('#exit-app').click();
 await phone.locator('#close-send').click();await phone.screenshot({path:'tests/library-preview.png',fullPage:true});
 if(process.env.TEST_BROWSER==='webkit'&&!external){server.kill();await new Promise(r=>server.once('exit',r));server=null;}else await phoneContext.setOffline(true);await phone.goto(base+'?home-screen');await phone.getByText('● Offline ready').waitFor();const card=phone.locator('.app-card').filter({has:phone.getByRole('heading',{name:'Counter One',exact:true})});await card.getByRole('button',{name:'Open app ↗',exact:true}).click();await phone.frameLocator('#app-frame').getByText('Count: 1',{exact:true}).waitFor();await phone.locator('#exit-app').click();
 const moduleCard=phone.locator('.app-card').filter({has:phone.getByRole('heading',{name:'Module App',exact:true})});await moduleCard.getByRole('button',{name:'Open app ↗',exact:true}).click();await phone.frameLocator('#app-frame').getByText('Module app: 42').waitFor();
 assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS: real WebRTC HTML transfer, consent, multi-app library, sandbox isolation, persistent per-app storage, relative modules/fetch and offline reopening'+(live?' with public signaling.':' with deterministic signaling.'));
 await phoneContext.close();
}finally{await browser?.close();server?.kill();}
