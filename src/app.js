import {MathfieldElement,convertLatexToMarkup} from 'mathlive';
import {createCalculator} from './engine.js';
import {toLatex,toExpression} from './expression.js';
import {APP_VERSION,updateApp} from './update.js';
MathfieldElement.fontsDirectory=new URL('./fonts',location.href).href;
MathfieldElement.soundsDirectory=null;
// A prior updater reloads only its iframe. Reopen the shell once to activate
// new viewport handling after that legacy upgrade, without creating a loop.
try{if(window.top!==window&&!window.top.document.querySelector('#app-top-surface')&&!sessionStorage.getItem('phasor-viewport-shell-reloaded')){sessionStorage.setItem('phasor-viewport-shell-reloaded','1');window.top.location.reload();}}catch{}
const calc=createCalculator();
const $=s=>document.querySelector(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
let settings=load('phasor-settings',{angle:'DEG',form:'RECT',precision:10});
if(!['DEG','RAD'].includes(settings.angle))settings.angle='DEG';if(!['RECT','POLAR'].includes(settings.form))settings.form='RECT';
if(![10,14].includes(settings.precision))settings.precision=10;
let history=load('phasor-history',[]);if(!Array.isArray(history))history=[];history=history.filter(x=>typeof x.expression==='string'&&x.value&&typeof x.value.re==='number'&&typeof x.value.im==='number').slice(-100);
let stack=[],second=false;
const save=()=>{try{localStorage.setItem('phasor-settings',JSON.stringify(settings));localStorage.setItem('phasor-history',JSON.stringify(history));localStorage.setItem('phasor-state',JSON.stringify(calc.exportState()));}catch{$('#message').textContent='Storage is full. This session still works.';}};
calc.setAngle(settings.angle);
try{calc.restoreState(load('phasor-state',[]));}catch{}
const menus={
 'root':[['Number','number'],['Algebra & variables','algebra'],['Trigonometry','trig'],['Complex numbers','complex'],['Electrical engineering','ee'],['Probability','prob'],['Settings & help','settings']],
 'number':[['Square root','sqrt('],['Nth root · nthRoot(x,n)','nthRoot('],['Natural logarithm','log('],['Common logarithm','log10('],['Exponential · eˣ','@exponential'],['Absolute value','abs('],['Round · round(x,n)','round('],['Greatest common divisor','gcd('],['Least common multiple','lcm(']],
 'algebra':[['Previous answer','ans'],['Store variable · example: z = 3+4j','z = '],['Recall variables','variables'],['Power · x^y','^'],['Fraction','@fraction'],['Undo edit','@undo'],['Reciprocal','1/(']],
 'trig':[['Sine','sin('],['Cosine','cos('],['Tangent','tan('],['Inverse sine','asin('],['Inverse cosine','acos('],['Inverse tangent','atan('],['atan2(y,x)','atan2('],['Hyperbolic sine','sinh('],['Hyperbolic cosine','cosh('],['Hyperbolic tangent','tanh(']],
 'complex':[['Polar → rectangular · polar(r,θ)','polar('],['Magnitude · abs(z)','abs('],['Phase angle · arg(z)','arg('],['Complex conjugate','conj('],['Real component','re('],['Imaginary component','im('],['Imaginary unit j','j'],['Show rectangular results','@RECT'],['Show polar results','@POLAR']],
 'ee':[['Parallel impedance · parallel(z1,z2,…)','parallel('],['Peak → RMS','rms('],['Amplitude → dB','db('],['Power ratio → dB','db10('],['dB → amplitude ratio','fromdb('],['Example · RLC impedance','100 + j*(2*pi*1000*0.01 - 1/(2*pi*1000*1e-6))'],['Example · parallel impedances','parallel(100, -200j)']],
 'prob':[['Factorial · factorial(5)','factorial('],['Permutations · permutations(n,k)','permutations('],['Combinations · combinations(n,k)','combinations(']],
 'settings':[['Angle: degrees','@DEG'],['Angle: radians','@RAD'],['Results: rectangular','@RECT'],['Results: polar','@POLAR'],['Precision: 10 significant digits','@10'],['Precision: 14 significant digits','@14'],['Version '+APP_VERSION,''],['Update app','@update'],['How to use Phasor','help'],['Export calculation history','@export'],['Clear history & variables','@clear']],
 'help':[['Type 3+4j or polar(5,53.13). Use ∠ for numeric polar values.',''],['Angle mode affects trig, polar() and arg().',''],['2nd → ÷ inserts a fraction. Use → or tap to move between its slots.',''],['^ opens an exponent. → moves out; nested templates work in any slot.',''],['Tap a past result to insert it. Tap an expression to edit it.',''],['Store values with z = 3+4j; use z in later expressions.',''],['i and j both represent √(−1).',''],['History, variables and settings are saved on this device.','']],
 'variables':[]};

$('#app').innerHTML=`<section class="calculator" aria-label="Scientific calculator"><div class="workspace"><nav class="modes" aria-label="Calculation modes"><button id="menu">menu</button><button id="angle" aria-label="Angle mode: ${settings.angle==='DEG'?'degrees':'radians'}">${settings.angle}</button><button id="form" aria-label="Complex results: ${settings.form==='RECT'?'rectangular':'polar'}">${settings.form==='RECT'?'a + bj':'r ∠ θ'}</button></nav><div class="history" id="history" aria-label="Calculation history"></div><div class="editor"><math-field id="expression" aria-label="Expression" math-virtual-keyboard-policy="manual"></math-field><div id="message" role="status" aria-live="polite"></div></div></div><div class="controls"><nav class="tools" aria-label="Editing controls"><button id="second" aria-pressed="false">2nd</button><button id="trig" aria-haspopup="menu" aria-expanded="false" aria-controls="trig-list">trig<span aria-hidden="true">▸</span></button><button class="key" data-key="π" aria-label="π">π<small>e</small></button><button data-command="moveToPreviousChar" aria-label="Move left">←</button><button data-command="moveToNextChar" aria-label="Move right">→</button><button id="back" aria-label="Delete backward">⌫<small>AC</small></button></nav><div class="functions" id="function-keys"></div><div class="keypad" id="keys"></div></div></section><div id="trig-list" popover="manual" role="menu" aria-label="Trig functions"></div><dialog id="functions"><div class="menu-heading"><button id="menu-back" aria-label="Previous menu">‹</button><h2 id="menu-title">Calculator</h2><button id="menu-close" aria-label="Close menu">×</button></div><div id="menu-items"></div></dialog>`;
const input=$('#expression');
input.mathVirtualKeyboardPolicy='manual';input.smartFence=true;input.smartMode=false;
input.inlineShortcuts={...input.inlineShortcuts,...Object.fromEntries(['asin','acos','atan','polar','rect','parallel','rms','db','db10','fromdb','arg','phase','conj','re','im','ans','atan2','factorial','permutations','combinations','nthRoot','round','gcd','lcm','log10'].map(n=>[n,'\\operatorname{'+n+'}']))};
// Buttons keep the mathfield's selection, including the active fraction/exponent slot.
document.querySelector('.controls').addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
const functions=[['^','nth-root'],['ln','log-base'],['(','['],[')',']'],['÷','fraction']];
const keys=[['7'],['8'],['9'],['×'],['4'],['5'],['6'],['−'],['1'],['2'],['3'],['+'],['complex'],['0'],['.'],['enter','ans']];
const fractionLabel='<span class="fraction-key" aria-hidden="true"><span>□</span><span>□</span></span>';
const label=k=>({complex:settings.form==='RECT'?'j':'∠','nth-root':'ⁿ√','e^':'eˣ',sqrt:'√','10^':'10ˣ','log-base':'logₙ',enter:'=',ans:'ans',fraction:fractionLabel}[k]||k);
function drawKeys(){
 const draw=list=>list.map(([a,b])=>{const active=second&&b?b:a;return `<button class="key ${['÷','×','−','+'].includes(a)?'operator':''} ${a==='enter'?'enter':''}" data-key="${a}" aria-label="${active==='fraction'?'Insert fraction':active==='^'?'Power':active==='nth-root'?'Nth root':active==='complex'?(settings.form==='RECT'?'Imaginary unit j':'Polar angle'):active==='e^'?'Exponential':active==='enter'?'Calculate':active}">${label(active)}${b&&!second?`<small>${label(b)}</small>`:''}</button>`;}).join('');
 $('#keys').innerHTML=draw(keys);$('#function-keys').innerHTML=draw(functions);$('#second').classList.toggle('active',second);$('#second').setAttribute('aria-pressed',String(second));$('#back').setAttribute('aria-label',second?'Clear expression':'Delete backward');const pi=$('[data-key="π"]');pi.innerHTML=second?'e':'π<small>e</small>';pi.setAttribute('aria-label',second?'Euler’s number':'π');
}
// Use the same upright sans-serif math glyphs in the editor and history.
const mathTypography='.ML__cmr,.ML__mathit,.ML__mathbf,.ML__mathbfit,.ML__sans,.ML__text,.ML__small-delim{font-family:KaTeX_SansSerif,Arial,sans-serif!important;font-style:normal!important}';
const mathStyle=document.createElement('style');mathStyle.textContent=mathTypography;input.shadowRoot.append(mathStyle);
const historyStyle=document.createElement('style');historyStyle.textContent=mathTypography;document.head.append(historyStyle);
function insert(text){if(/^[A-Za-z][A-Za-z0-9_]*\($/.test(text)){const name=text.slice(0,-1);latex(({sin:'\\sin',cos:'\\cos',tan:'\\tan',asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan',log:'\\ln'}[name]||toLatex(name))+'\\left(#0\\right)');}else input.insert(toLatex(text),{format:'latex',selectionMode:'after',focus:true});$('#message').textContent='';}
function latex(text,selectionMode='placeholder'){input.insert(text,{format:'latex',selectionMode,focus:true});$('#message').textContent='';}
function command(name){input.executeCommand(name);if(name==='moveToNextGroup'||name==='moveToPreviousGroup')input.position=Math.max(...input.selection.ranges.flat());input.focus();}
// Use public atom offsets to remove an empty function and its fence together.
// This also works inside fractions, powers and another function's argument.
function deleteBackward(){
 const range=input.selection.ranges[0],position=input.position;
 for(let end=1;end<=input.lastOffset;end++){
  const fence=input.getElementInfo(end);if(!/^\\left\((?:\\placeholder\{\})?\\right\)$/.test(fence?.latex||''))continue;
  const first=end-(fence.latex.includes('placeholder')?2:1);
  if(position<first||position>end||range[0]<first)continue;
  const fnEnd=first-1,fn=input.getElementInfo(fnEnd);
  if(!/^(?:\\(?:sin|cos|tan|arcsin|arccos|arctan|ln|log)|\\operatorname\{(?:\\mathrm\{)?(?:sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10)\}?\})$/.test(fn?.latex||''))continue;
  let start=fnEnd-1;while(start>0&&input.getElementInfo(start)?.depth>fn.depth)start--;
  input.selection={ranges:[[start,end]]};command('deleteBackward');return;
 }
 command('deleteBackward');
}
function renderHistory(){const box=$('#history');box.replaceChildren();history.forEach(h=>{const row=document.createElement('div');row.className='calculation';const expression=document.createElement('button');expression.className='past-expression';expression.setAttribute('aria-label','Recall '+h.expression);if(h.latex)expression.innerHTML=convertLatexToMarkup(h.latex);else expression.textContent=h.expression;expression.onclick=()=>{input.setValue(h.latex||toLatex(h.expression));input.focus();input.position=-1;};const value=document.createElement('button');value.className='past-result';value.textContent=calc.format(calc.restore(h.value),settings.form,settings.precision);value.setAttribute('aria-label','Insert result '+value.textContent);value.onclick=()=>insert(`(${h.value.re}+(${h.value.im})j)`);row.append(expression,value);box.append(row);});box.scrollTop=box.scrollHeight;}
function run(){if(!input.value.trim())return;try{const expression=toExpression(input.getValue('latex'));const value=calc.evaluate(expression);history.push({expression,latex:input.getValue('latex'),value:calc.serialize(value)});history=history.slice(-100);input.value='';$('#message').textContent='';save();renderHistory();}catch(err){$('#message').textContent=err.message.replace(/^Error:\s*/,'');}}
function press(key){
 if(key==='enter')run();
 else if(key==='AC'){input.value='';$('#message').textContent='';input.focus();}
 else if(key==='fraction')latex('\\frac{#0}{#?}');
 else if(key==='^'){if(input.selection.ranges.some(([a,b])=>a!==b))latex('\\left(#0\\right)^{#?}');else command('moveToSuperscript');}
 else if(key==='^2'||key==='x²'){command('moveToSuperscript');insert('2');command('moveAfterParent');}
 else if(key==='nth-root')latex('\\sqrt[#?]{#0}');
 else if(key==='e^'){latex('e');command('moveToSuperscript');}
 else if(key==='complex')press(settings.form==='RECT'?'j':'∠');
 else if(key==='sqrt')latex('\\sqrt{#0}');
 else if(key==='ans')insert('ans');
 else if(key==='10^'){latex('10');command('moveToSuperscript');}
 else if(key==='log-base')latex('\\log_{#?}\\left(#0\\right)');
 else if(key==='(')latex('\\left(#0\\right)');
 else if(key===')')command('moveAfterParent');
 else if(key==='[')latex('\\left[#0\\right]');
 else if(key===']')command('moveAfterParent');
 else if(key==='(−)')insert('-');
 else if(['sin','cos','tan','asin','acos','atan','log','ln','exp'].includes(key))insert((key==='ln'?'log':key==='log'?'log10':key)+'(');
 else if(key==='÷')latex('/');
 else if(key==='×')latex('\\times');
 else if(key==='∠')latex('\\angle');
 else insert(key);
}
$('.controls').onclick=e=>{const button=e.target.closest('[data-key]');if(!button)return;const pair=[...keys,...functions,['π','e']].find(k=>k[0]===button.dataset.key);press(second&&pair[1]?pair[1]:pair[0]);if(second){second=false;drawKeys();}};
$('#back').onclick=()=>{if(second){press('AC');second=false;drawKeys();}else deleteBackward();};
$('.tools').addEventListener('click',e=>{const button=e.target.closest('[data-command]');if(button)command(second?(button.dataset.command==='moveToPreviousChar'?'extendSelectionBackward':'extendSelectionForward'):button.dataset.command);});
$('#second').onclick=()=>{second=!second;drawKeys();};
input.addEventListener('keydown',e=>{if(e.key==='Backspace'){e.preventDefault();e.stopPropagation();deleteBackward();}if(e.key==='Enter'){e.preventDefault();e.stopPropagation();run();}});
input.addEventListener('input',()=>{$('#message').textContent='';});
function setting(action){if(action==='undo'){command('undo');return;}if(action==='exponential'){press('e^');return;}if(action==='update'){updateApp(text=>$('#message').textContent=text).catch(e=>$('#message').textContent=e.message);return;}if(action==='fraction'){press('fraction');return;}if(['DEG','RAD'].includes(action)){settings.angle=action;calc.setAngle(action);}else if(['RECT','POLAR'].includes(action))settings.form=action;else if(['10','14'].includes(action))settings.precision=Number(action);else if(action==='clear'){if(!confirm('Clear all calculation history and variables?'))return;history=[];calc.reset();}else if(action==='export'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify({settings,history},null,2)],{type:'application/json'}));a.href=url;a.download='phasor-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}save();$('#angle').textContent=settings.angle;$('#angle').setAttribute('aria-label','Angle mode: '+(settings.angle==='DEG'?'degrees':'radians'));$('#form').setAttribute('aria-label','Complex results: '+(settings.form==='RECT'?'rectangular':'polar'));$('#form').textContent=settings.form==='RECT'?'a + bj':'r ∠ θ';renderHistory();drawKeys();}
$('#angle').onclick=()=>setting(settings.angle==='DEG'?'RAD':'DEG');$('#form').onclick=()=>setting(settings.form==='RECT'?'POLAR':'RECT');
function showMenu(category='root'){stack.push(category);drawMenu();if(!$('#functions').open)$('#functions').showModal();}
function drawMenu(){const category=stack.at(-1);$('#menu-title').textContent=category==='root'?'Calculator':{ee:'Electrical engineering',trig:'Trigonometry',prob:'Probability',variables:'Stored variables'}[category]||category[0].toUpperCase()+category.slice(1);$('#menu-back').disabled=stack.length===1;const items=category==='variables'?calc.variables().map(([name,v])=>[`${name} = ${calc.format(v,settings.form)}`,name]):menus[category];$('#menu-items').replaceChildren();if(!items.length)$('#menu-items').textContent='No stored variables yet. Type z = 3+4j to create one.';items.forEach(([label,action],i)=>{const b=document.createElement('button');const num=document.createElement('span');num.textContent=String(i+1);const text=document.createElement('strong');text.textContent=label;const arrow=document.createElement('span');arrow.textContent=menus[action]?'›':'';b.append(num,text,arrow);b.disabled=!action;b.onclick=()=>{if(menus[action])showMenu(action);else{if(action.startsWith('@'))setting(action.slice(1));else if(action==='^')press('^');else insert(action);$('#functions').close();input.focus();}};$('#menu-items').append(b);});}
$('#menu').onclick=()=>{$('#trig-list').hidePopover();stack=[];showMenu();};$('#menu-back').onclick=()=>{stack.pop();drawMenu();};$('#menu-close').onclick=()=>$('#functions').close();
const trigList=$('#trig-list');
function positionTrig(){const anchor=$('#trig').getBoundingClientRect();const width=Math.min(300,innerWidth-20);trigList.style.width=width+'px';trigList.style.left=Math.min(Math.max(10,anchor.left),innerWidth-width-10)+'px';trigList.style.top=(anchor.bottom+6)+'px';trigList.style.bottom='auto';trigList.style.maxHeight=Math.max(100,innerHeight-anchor.bottom-16)+'px';}
for(const [name,action]of [['sin()','sin('],['sin⁻¹()','asin('],['cos()','cos('],['cos⁻¹()','acos('],['tan()','tan('],['tan⁻¹()','atan(']]){const button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent=name;button.onclick=()=>{insert(action);trigList.hidePopover();second=false;drawKeys();};trigList.append(button);}
trigList.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
trigList.addEventListener('toggle',()=>$('#trig').setAttribute('aria-expanded',String(trigList.matches(':popover-open'))));
// Capture the dismissal gesture before any keypad handler. Keep the matching
// click suppressed even on browsers that synthesize one after preventDefault.
let dismissPointer=null;
window.addEventListener('pointerdown',()=>{dismissPointer=null;},true);
document.addEventListener('pointerdown',e=>{if(trigList.matches(':popover-open')&&!trigList.contains(e.target)&&!$('#trig').contains(e.target)){dismissPointer=e.pointerId;e.preventDefault();e.stopImmediatePropagation();trigList.hidePopover();}},true);
document.addEventListener('click',e=>{if(dismissPointer!==null){dismissPointer=null;e.preventDefault();e.stopImmediatePropagation();}},true);
$('#trig').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();positionTrig();trigList.showPopover();trigList.querySelector('button').focus();}});trigList.addEventListener('keydown',e=>{const buttons=[...trigList.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?2:-2)+buttons.length)%buttons.length].focus();}if(e.key==='Escape'){trigList.hidePopover();input.focus();}});
$('#trig').onclick=()=>{positionTrig();trigList.togglePopover();};window.addEventListener('resize',()=>{if(trigList.matches(':popover-open'))positionTrig();});
renderHistory();drawKeys();
