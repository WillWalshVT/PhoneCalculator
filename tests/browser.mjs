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
 async function tab(back=false){await page.getByRole('button',{name:back?'Move left':'Move right',exact:true}).click();}
 async function clear(){await page.locator('#second').click();await page.locator('#back').click();}
 async function fraction(){await page.locator('#second').click();await key('÷');}
 await clear();await key('1');await key('÷');await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^0.5 ∠/,'Ordinary keypad division');
 await clear();await fraction();await key('1');await tab();await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^0.5 ∠/);
 await clear();await key('2');await key('^');await key('3');await key('^');await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^512 ∠/);
 await clear();await key('2');await key('^');await fraction();await key('1');await tab();await key('2');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^1.414213562 ∠/);
 await clear();await fraction();await key('1');await key('enter');assert.match(await page.locator('#message').textContent(),/empty expression slots/);
 await clear();await key('2');await key('^');await key('3');await tab();await key('+');await key('1');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^9 ∠/);
 await clear();await page.locator('#form').click();await fraction();await key('1');await tab();await key('2');await key('+');await fraction();await key('3');await tab();await key('4');
 await page.waitForFunction(()=>document.querySelector('#expression').value.includes('4'));await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:'test-results/calculator-structured.png'});await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'0.3636363636');
 await clear();await page.locator('#second').click();await key('^');await key('3');await tab();await key('8');await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'2','Indexed root slots');
 await clear();await key('ln');await key('1');await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'0');
 await clear();await page.locator('#second').click();await key('ln');await key('2');await tab();await tab();await key('8');await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'3','Editable logarithm base and argument');
 await clear();await page.locator('#second').click();await key('(');await key('2');await key('+');await key('3');await page.locator('#second').click();await key(')');await key('×');await key('4');await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'20','Square bracket grouping');
 await clear();await key('−');await key('2');await key('enter');assert.equal(await page.locator('.past-result').last().textContent(),'−2'.replace('−','-'));
 assert.equal(await page.locator('.navigation').count(),0);assert.equal(await page.locator('#keys .key').count(),16);assert.match(await page.locator('[data-key=complex]').textContent(),/j/);await page.locator('#form').click();assert.match(await page.locator('[data-key=complex]').textContent(),/∠/);
 await clear();await setExpression('123');await page.locator('#expression').evaluate(e=>e.position=-1);const end=await page.locator('#expression').evaluate(e=>e.position);await tab(true);assert.equal(await page.locator('#expression').evaluate(e=>e.position),end-1);await tab();assert.equal(await page.locator('#expression').evaluate(e=>e.position),end,'Arrows move one position');
 await clear();await page.locator('#trig').click();await page.getByRole('menuitem',{name:'sin()',exact:true}).click();await key('3');await key('0');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^0.5 ∠/);
 // Popup sits below its trigger; dismissal consumes the entire gesture.
 await clear();await page.locator('#trig').click();
 const trigger=await page.locator('#trig').boundingBox(),popup=await page.locator('#trig-list').boundingBox();assert.ok(popup.y>=trigger.y+trigger.height);
 assert.deepEqual(await page.locator('#trig-list button').allTextContents(),['sin()','sin⁻¹()','cos()','cos⁻¹()','tan()','tan⁻¹()']);
 await page.screenshot({path:'test-results/calculator-trig-menu.png'});
 await key('0');assert.equal(await page.locator('#expression').evaluate(e=>e.value),'','Dismissal does not type zero');assert.equal(await page.locator('#trig-list').isVisible(),false);
 await key('0');assert.equal(await page.locator('#expression').evaluate(e=>e.value),'0','Following gesture types normally');
 await clear();await page.locator('#trig').click();await page.locator('#trig').click();assert.equal(await page.locator('#trig-list').isVisible(),false);
 await page.locator('#trig').click();await page.getByRole('menuitem',{name:'sin()',exact:true}).click();await key('3');await page.locator('#back').click();await page.locator('#back').click();assert.equal(await page.locator('#expression').evaluate(e=>e.value),'','Empty trig deletes as one unit');
 await page.locator('#trig').click();await page.getByRole('menuitem',{name:'sin()',exact:true}).click();await key('3');await page.locator('#expression').press('Backspace');await page.locator('#expression').press('Backspace');assert.equal(await page.locator('#expression').evaluate(e=>e.value),'','Keyboard removes empty trig as a unit');
 await key('(');await key('2');await key('+');await key('3');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^5 ∠/,'Parentheses close automatically');
 // 2nd arrows extend selection, and templates wrap that selection.
 for(const mode of ['parenthesis','trig','power','root','log']){
  await clear();await setExpression('2+3');await page.locator('#expression').evaluate(e=>e.position=-1);await page.locator('#second').click();await tab(true);await tab(true);await tab(true);
  assert.ok(await page.locator('#expression').evaluate(e=>e.selection.ranges.some(([a,b])=>a!==b)));
  if(mode==='parenthesis'){await page.locator('#second').click();await key('(');await key('×');await key('2');}
  if(mode==='trig'){await page.locator('#trig').click();await page.getByRole('menuitem',{name:'cos()',exact:true}).click();}
  if(mode==='power'){await page.locator('#second').click();await key('^');await key('2');}
  if(mode==='root'){await key('^');await key('2');}
  if(mode==='log'){await key('ln');await key('2');}
  await key('enter');assert.equal(await page.locator('#message').textContent(),'','Wrapping '+mode+' evaluates');
  const result=await page.locator('.past-result').last().textContent();assert.match(result,new RegExp('^'+({parenthesis:'10',trig:'0.9961946981',power:'25',root:'2.236067977',log:'2.321928095'}[mode]).replace('.','\\.')));
 }
 await clear();await setExpression('j6+6j');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^12 ∠ 90/);
 // Restore previous answer fixture for the following check.
 await calculate('0.5');
 await clear();await page.locator('#second').click();await key('enter');assert.match(await page.locator('#expression').evaluate(e=>e.value),/ans/);await key('+');await key('1');await key('enter');assert.match(await page.locator('.past-result').last().textContent(),/^1.5 ∠/,'2nd = inserts the previous answer');
 assert.equal(await page.locator('.modes #menu').count(),1);assert.equal(await page.locator('.tools #menu').count(),0);assert.equal(await page.locator('#function-keys .key').count(),5);assert.equal(await page.locator('#second').textContent(),'2nd');
 const colors=await page.locator('.calculation').evaluateAll(es=>es.slice(-2).map(e=>getComputedStyle(e).backgroundColor));assert.notEqual(colors[0],colors[1]);
 await setExpression('123+4j');await page.waitForFunction(()=>document.querySelector('#expression').shadowRoot.querySelector('.ML__cmr'));
 const fonts=await page.locator('#expression').evaluate(e=>[...e.shadowRoot.querySelectorAll('.ML__cmr')].map(x=>getComputedStyle(x).fontFamily));assert.ok(fonts.length);assert.ok(fonts.every(x=>x.includes('KaTeX_SansSerif')));
 await clear();
 const clean=await browser.newContext({viewport:{width:390,height:844}});const fresh=await clean.newPage();await fresh.goto(base);await fresh.locator('#expression').waitFor();assert.equal(await fresh.locator('#history').textContent(),'');assert.equal(await fresh.locator('header,footer,#catalog,#keyboard,.brand,.empty,.mode-label').count(),0);await fresh.screenshot({path:'test-results/calculator-empty.png'});await clean.close();
 for(const size of [{width:390,height:844},{width:375,height:667}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false,'Phone viewport fits');}
 assert.equal(await page.locator('link[rel=manifest]').count(),0);
 assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);
 assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin),'No external runtime requests');
 assert.deepEqual(errors,[]);
 console.log('PASS: nested static paths, mobile layout, complex/polar/EE functions, nested fractions/powers entered with keypad, slot navigation, incomplete-slot errors, menu stack, persistence, export, blank initial screen, no external runtime.');
}finally{await browser?.close();server?.kill();}
