import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const external=!!process.env.BASE_URL;
const base=process.env.BASE_URL||'http://localhost:8175/phasor-calculator/';
let server,browser,originalSW;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 if(!external){
  server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,PORT:'8175',PREVIEW_PREFIX:'/phasor-calculator/'},stdio:'inherit'});
  let online=false;for(let i=0;i<40;i++){try{if((await fetch(base)).ok){online=true;break;}}catch{}await sleep(100);}assert.ok(online,'Static preview starts');
 }
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(base);await page.locator('#expression').waitFor();await page.getByText('● Offline ready').waitFor();
 await page.locator('#expression').fill('(3+4j)*(2-j)');await page.locator('[data-key="enter"]').click();
 assert.equal(await page.locator('.past-result').last().textContent(),'10 + 5j');
 await page.locator('#form').click();assert.match(await page.locator('.past-result').last().textContent(),/11.18033989 ∠ 26.56505118°/);
 await page.locator('#menu').click();await page.getByRole('button',{name:'4 Complex numbers'}).click();await page.getByRole('button',{name:'1 Polar → rectangular'}).click();assert.equal(await page.locator('#expression').inputValue(),'polar(');
 await page.locator('#expression').fill('z=polar(5,90)');await page.locator('[data-key="enter"]').click();
 await page.locator('#options').click();await page.getByRole('button',{name:'8 Install on iPhone'}).click();await page.locator('#install[open]').waitFor();
 assert.equal(await page.locator('#install-link').getAttribute('href'),base);
 assert.ok(await page.locator('#install-qr').evaluate(c=>c.width>0));
 await page.locator('#install-close').click();
 await page.screenshot({path:'tests/phone-preview.png',fullPage:true});
 await context.setOffline(true);await page.goto(base+'?from=home-screen');await page.locator('#expression').waitFor();await page.getByText('● Offline ready').waitFor();
 await page.locator('#expression').fill('parallel(100,100)');await page.locator('[data-key="enter"]').click();assert.match(await page.locator('.past-result').last().textContent(),/50 ∠ 0°/);
 await page.locator('#expression').fill('im(z)');await page.locator('[data-key="enter"]').click();assert.match(await page.locator('.past-result').last().textContent(),/5 ∠ 0°/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin),'No external scripts or services');
 await context.setOffline(false);
 const manifest=await page.evaluate(async()=>fetch('./manifest.webmanifest').then(r=>r.json()));assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 if(!external){
  originalSW=await readFile('dist/sw.js','utf8');
  await page.evaluate(async()=>{const c=await caches.open('unrelated-app');await c.put('/unrelated',new Response('keep'));});
  await writeFile('dist/sw.js',originalSW.replace(/PREFIX \+ '[a-f0-9]+'/,'PREFIX + \'integration-update\''));
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
  await page.waitForFunction(async()=>{const names=await caches.keys();return names.some(n=>n.endsWith(':integration-update'))&&names.filter(n=>n.startsWith('phasor-static:')).length===1;});
  assert.ok(await page.evaluate(async()=>!!await caches.match('/unrelated')),'Updates preserve other apps on this origin');
  await context.setOffline(true);await page.reload();await page.locator('#expression').waitFor();await page.getByText('● Offline ready').waitFor();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: static project-subdirectory hosting, QR install link, scientific/complex functions, polar results, variables, history, offline Home Screen URL, cache updates and mobile layout.');
 await context.close();
} finally {
 if(originalSW)await writeFile('dist/sw.js',originalSW);
 await browser?.close();server?.kill();
}
