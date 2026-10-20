import {all,create} from 'mathjs';
export function createCalculator(){
 const math=create(all,{number:'number',predictable:false});
 const scope=new Map([['ans',0],['j',math.complex(0,1)]]);
 let angle='DEG';
 const raw=create(all);
 const scale=()=>angle==='DEG'?Math.PI/180:1;
 const trig={};
 for(const name of ['sin','cos','tan','sec','csc','cot'])trig[name]=x=>raw[name](raw.multiply(x,scale()));
 for(const name of ['asin','acos','atan','asec','acsc','acot'])trig[name]=x=>raw.divide(raw[name](x),scale());
 math.import({...trig,factorial:n=>{if(!Number.isInteger(n)||n<0||n>170)throw Error('Factorial requires an integer from 0 to 170.');return raw.factorial(n);},atan2:(y,x)=>Math.atan2(y,x)/scale(),arg:z=>raw.arg(z)/scale(),phase:z=>raw.arg(z)/scale(),polar:(r,t)=>math.multiply(r,math.exp(math.complex(0,t*scale()))),rect:(r,t)=>math.multiply(r,math.exp(math.complex(0,t*scale()))),parallel:(...zs)=>math.divide(1,zs.reduce((a,z)=>math.add(a,math.divide(1,z)),0)),rms:z=>math.divide(z,Math.sqrt(2)),db:x=>20*Math.log10(math.abs(x)),db10:x=>10*Math.log10(math.abs(x)),fromdb:x=>10**(x/20)},{override:true});
 function evaluate(input){
  if(input.length>2000)throw Error('Expression is too long.');
  let text=input.trim().replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replaceAll('π','pi').replaceAll('√','sqrt').replace(/\bln\s*\(/g,'log(').replace(/\blog10\s*\(/g,'log10(');
  // a∠b is deliberately bounded to numeric literals; use polar(expr,expr) for expressions.
  text=text.replace(/((?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*∠\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/gi,'polar($1,$2)');
  const tree=math.parse(text);
  const denied=new Set(['import','createUnit','evaluate','parse','simplify','derivative','resolve','reviver','help','config']);
  tree.traverse(node=>{
   if(['FunctionAssignmentNode','AccessorNode','IndexNode','ObjectNode','BlockNode','RangeNode','ArrayNode'].includes(node.type))throw Error('Use a scalar expression or a variable assignment.');
   if(node.isFunctionNode && (!node.fn.isSymbolNode || denied.has(node.fn.name)))throw Error('This function is unavailable.');
   if(node.isAssignmentNode && (!node.object.isSymbolNode || !/^[A-Za-z][A-Za-z0-9_]*$/.test(node.object.name) || ['ans','i','j','pi','e','Infinity','NaN'].includes(node.object.name) || typeof math[node.object.name]==='function'))throw Error('Choose a different variable name.');
  });
  const working=new Map(scope);
  const value=tree.compile().evaluate(working);
  if(!(typeof value==='number'||math.isComplex(value)) || !Number.isFinite(typeof value==='number'?value:value.re) || (math.isComplex(value)&&!Number.isFinite(value.im)))throw Error('Result is undefined or outside the numeric range.');
  for(const [k,v]of working)scope.set(k,v);
  scope.set('ans',value); return value;
 }
 function format(value,mode='RECT',precision=10){
  const c=math.complex(value);const imagZero=c.im===0||Math.abs(c.im)<Math.abs(c.re)*1e-14;const realZero=c.re===0||Math.abs(c.re)<Math.abs(c.im)*1e-14;const n=x=>math.format(Object.is(x,-0)?0:x,{precision});
  if(mode==='POLAR')return `${n(math.abs(c))} ∠ ${n(raw.arg(c)/scale())}${angle==='DEG'?'°':' rad'}`;
  if(imagZero)return n(c.re);
  return `${realZero?'':n(c.re)+' '+(c.im<0?'−':'+')+' '}${realZero&&c.im<0?'−':''}${n(Math.abs(c.im))}j`;
 }
 return {evaluate,format,exportState:()=>[...scope].map(([k,v])=>[k,typeof v==='number'?{re:v,im:0}:{re:v.re,im:v.im}]),restoreState:entries=>{for(const [k,v]of entries)if(/^[A-Za-z][A-Za-z0-9_]*$/.test(k)&&Number.isFinite(v.re)&&Number.isFinite(v.im))scope.set(k,v.im===0?v.re:math.complex(v.re,v.im));},setAngle:v=>{angle=v==='RAD'?'RAD':'DEG';},variables:()=>[...scope].filter(([k])=>!['ans','j'].includes(k)),serialize:v=>typeof v==='number'?{re:v,im:0}:{re:v.re,im:v.im},restore:v=>math.complex(v.re,v.im),reset:()=>{scope.clear();scope.set('ans',0);scope.set('j',math.complex(0,1));}};
}
