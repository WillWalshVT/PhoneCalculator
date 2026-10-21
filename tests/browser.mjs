import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const base=process.env.BASE_URL||'http://localhost:8175/phasor-calculator/';
let server,browser;
try {
 if(!process.env.BASE_URL){
  server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,PORT:'8175',PREVIEW_PREFIX:'/phasor-calculator/'},stdio:'inherit'});
  let ready=false;
  for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'Preview starts');
 }
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(), errors=[], requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(base);await page.locator('#expression').waitFor();
 async function calculate(text){await page.locator('#expression').fill(text);await page.locator('[data-key="enter"]').click();return page.locator('.past-result').last().textContent();}
 assert.equal(await calculate('(3+4j)*(2-j)'),'10 + 5j');
 await page.locator('#form').click();assert.match(await page.locator('.past-result').last().textContent(),/11.18033989 ∠ 26.56505118°/);
 await page.locator('#menu').click();await page.getByRole('button',{name:'4 Complex numbers'}).click();await page.getByRole('button',{name:'1 Polar → rectangular'}).click();assert.equal(await page.locator('#expression').inputValue(),'polar(');
 await calculate('z=polar(5,90)');
 await page.reload();await page.locator('#expression').waitFor();
 assert.match(await calculate('im(z)'),/5 ∠ 0°/);
 assert.match(await calculate('parallel(100,100)'),/50 ∠ 0°/);
 await page.locator('#expression').fill('1/0');await page.locator('[data-key="enter"]').click();assert.match(await page.locator('#message').textContent(),/undefined/);
 await page.locator('#options').click();
 assert.equal(await page.getByRole('button',{name:'Install on iPhone'}).count(),0);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export calculation history'}).click();assert.equal((await downloadPromise).suggestedFilename(),'phasor-history.json');
 for(const size of [{width:390,height:844},{width:375,height:667}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,'Phone viewport fits');}
 assert.equal(await page.locator('link[rel=manifest]').count(),0);
 assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);
 assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin),'No external runtime requests');
 assert.deepEqual(errors,[]);
 console.log('PASS: nested static paths, mobile layout, complex/polar/EE functions, menu stack, persistence, export, errors, no app-owned PWA/service worker or external runtime.');
}finally{await browser?.close();server?.kill();}
