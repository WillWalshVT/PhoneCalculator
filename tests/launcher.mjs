// Optional integration check against an independently hosted AppLauncher.
// Run after build: APP_LAUNCHER_URL=https://.../AppLauncher/ node tests/launcher.mjs
import {chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {toLatex} from '../src/expression.js';
import assert from 'node:assert/strict';
const base=process.env.APP_LAUNCHER_URL;
if(!base)throw Error('Set APP_LAUNCHER_URL to a running AppLauncher instance.');
const browser=await chromium.launch({headless:true});
try{
 const senderContext=await browser.newContext(),phoneContext=await browser.newContext(),pwaContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await pwaContext.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
 const sender=await senderContext.newPage(),phone=await phoneContext.newPage(),pwa=await pwaContext.newPage(),errors=[];
 pwa.on('pageerror',e=>errors.push(e.message));
 await sender.goto(base);await sender.locator('#offline.ready').waitFor();await sender.locator('#share').click();await sender.locator('#folder').setInputFiles(resolve('dist'));
 await sender.locator('#editor:not([hidden])').waitFor();assert.equal(await sender.locator('#name').inputValue(),'Phasor');await sender.getByText('App settings',{exact:true}).click();await sender.locator('#app-id').fill('phasor-calculator');
 assert.ok((await sender.locator('#icon-preview').getAttribute('src')).startsWith('data:image/png'));
 await sender.locator('#continue').click();await sender.locator('#share-link').waitFor();const invitation=await sender.locator('#share-link').getAttribute('href');
 await phone.goto(invitation);await phone.locator('#start-link').waitFor({state:'attached',timeout:90000});assert.equal(await phone.title(),'Phasor');
 const manifest=await phone.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(r=>r.json()));assert.equal(manifest.name,'Phasor');assert.ok(manifest.id.endsWith('launch.html?app=phasor-calculator'));
 const start=await phone.locator('#start-link').getAttribute('href');await pwa.goto(start);
 const app=pwa.frameLocator('#app-frame');await app.locator('#expression').waitFor({timeout:90000});
 await app.locator('#expression').evaluate((e,l)=>e.setValue(l),toLatex('z=3+4j'));await app.locator('[data-key="enter"]').click();assert.equal(await app.locator('.past-result').last().textContent(),'3 + 4j');
 assert.equal(await pwa.locator('.shell,.toast').count(),0,'All transfer controls disappear');
 await senderContext.close();await phoneContext.close();
 const before=await app.locator('#expression').evaluate(()=>performance.timeOrigin);
 await app.locator('#menu').click();await app.getByRole('button',{name:'7 Settings & help'}).click();await app.getByRole('button',{name:'Update app',exact:false}).click();
 await app.locator('#message').filter({hasText:'App is up to date'}).waitFor({timeout:90000});assert.equal(await app.locator('#expression').evaluate(()=>performance.timeOrigin),before,'No reload for current release');
 // Model an older cached release so the second click exercises replacement.
 await pwa.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('app-launcher:/AppLauncher/',2);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('apps','readwrite'),store=tx.objectStore('apps'),r=store.get('phasor-calculator');r.onsuccess=()=>{const app=r.result;app.appVersion='3.2.0';app.releaseVersion='a'.repeat(64);store.put(app);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();});
 await app.locator('#menu').click();await app.getByRole('button',{name:'7 Settings & help'}).click();await app.getByRole('button',{name:'Update app',exact:false}).click();
 await pwa.waitForFunction(before=>document.querySelector('#app-frame')?.contentWindow.performance.timeOrigin>before,before,{timeout:90000});await app.locator('#expression').waitFor();
 await app.locator('#expression').evaluate((e,l)=>e.setValue(l),toLatex('abs(z)'));await app.locator('[data-key="enter"]').click();assert.equal(await app.locator('.past-result').last().textContent(),'5','Hosted update preserves exact complex variables');
 console.log('Installed calculator Update app button fetched and verified the live GitHub release.');
 await pwaContext.setOffline(true);await pwa.reload();await app.locator('#expression').waitFor();
 await app.locator('#expression').evaluate((e,l)=>e.setValue(l),toLatex('abs(z)'));await app.locator('[data-key="enter"]').click();assert.equal(await app.locator('.past-result').last().textContent(),'5');
 await app.locator('#form').click();await app.locator('#expression').evaluate((e,l)=>e.setValue(l),toLatex('parallel(100,100)'));await app.locator('[data-key="enter"]').click();assert.equal(await app.locator('.past-result').last().textContent(),'50 ∠ 0°');
 assert.deepEqual(errors,[]);
 console.log('PASS: real signaling/WebRTC, Phasor name/icon discovery, unique install identity, fresh PWA storage transfer, hidden transfer UI, offline restart and persisted complex variables. OS installation itself is not simulated.');
}finally{await browser.close();}
