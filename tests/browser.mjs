import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {toLatex} from '../src/expression.js';
const base=process.env.BASE_URL||'http://localhost:8175/phasor-calculator/';
let server,browser;
try {
 if(!process.env.BASE_URL){
  server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,PORT:'8175',PREVIEW_PREFIX:'/phasor-calculator/'},stdio:'inherit'});
  let ready=false;
  for(let i=0;i<40;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,'Preview starts');
 }
 browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(), errors=[], requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(base);await page.locator('#expression').waitFor();
 async function setExpression(text){await page.locator('#expression').evaluate((e,latex)=>e.setValue(latex),toLatex(text));}
 async function calculate(text){await setExpression(text);await page.locator('[data-key="enter"]').click();return page.locator('.past-result').last().textContent();}
 assert.equal(await calculate('(3+4j)*(2-j)'),'10 + 5j');
 await page.locator('#form').click();assert.match(await page.locator('.past-result').last().textContent(),/11.18033989 ∠ 26.56505118°/);
 await page.locator('#menu').click();await page.getByRole('button',{name:'4 Complex numbers'}).click();await page.getByRole('button',{name:'1 Polar → rectangular'}).click();assert.match(await page.locator('#expression').evaluate(e=>e.value),/polar/);
 await calculate('z=polar(5,90)');
 await page.reload();await page.locator('#expression').waitFor();
 assert.match(await calculate('im(z)'),/5 ∠ 0°/);
 assert.match(await calculate('parallel(100,100)'),/50 ∠ 0°/);
 await setExpression('1/0');await page.locator('[data-key="enter"]').click();assert.match(await page.locator('#message').textContent(),/undefined/);
 await page.locator('#menu').click();await page.getByRole('button',{name:'7 Settings & help'}).click();
 assert.equal(await page.getByRole('button',{name:'Install on iPhone'}).count(),0);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export calculation history'}).click();assert.equal((await downloadPromise).suggestedFilename(),'phasor-history.json');

 async function key(k){await page.locator('[data-key="'+k+'"]').click();}
 async function move(direction){await page.locator('[data-command="'+direction+'"]').click();}
 async function fraction(){await page.locator('#second').click();await key('÷');}
 await key('AC');await fraction();await key('1');await move('moveDown');await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^0.5 ∠/);
 await key('AC');await fraction();await fraction();await key('1');await move('moveDown');await key('2');await move('moveToNextChar');await move('moveDown');await key('3');
 assert.match(await page.locator('#expression').evaluate(e=>e.value),/\\frac/);await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^0.1666666667 ∠/);
 await key('AC');await key('2');await key('^');await key('3');await key('^');await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^512 ∠/);
 await key('AC');await key('2');await key('^');await fraction();await key('1');await move('moveDown');await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^1.414213562 ∠/);
 await key('AC');await fraction();await key('1');await key('enter');assert.match(await page.locator('#message').textContent(),/empty expression slots/);
 await key('AC');await key('2');await key('^');await key('3');await move('moveToNextChar');await key('+');await key('1');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^9 ∠/);
 await key('AC');await page.locator('#form').click();await fraction();await key('1');await move('moveDown');await key('2');await key('+');await fraction();await key('3');await move('moveDown');await key('4');
 await page.waitForFunction(()=>document.querySelector('#expression').value.includes('4'));await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'test-results/calculator-structured.png'});await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'0.3636363636');
 await key('AC');
 const clean=await browser.newContext({viewport:{width:390,height:844}});const fresh=await clean.newPage();await fresh.goto(base);await fresh.locator('#expression').waitFor();assert.equal(await fresh.locator('#history').textContent(),'');assert.equal(await fresh.locator('header,footer,#catalog,#keyboard,.brand,.empty,.mode-label').count(),0);await fresh.screenshot({path:'test-results/calculator-empty.png'});await clean.close();
 for(const size of [{width:390,height:844},{width:375,height:667}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,'Phone viewport fits');}
 assert.equal(await page.locator('link[rel=manifest]').count(),0);
 assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);
 assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin),'No external runtime requests');
 assert.deepEqual(errors,[]);
 console.log('PASS: nested static paths, mobile layout, complex/polar/EE functions, nested fractions/powers entered with keypad, slot navigation, incomplete-slot errors, menu stack, persistence, export, blank initial screen, no external runtime.');
}finally{await browser?.close();server?.kill();}
