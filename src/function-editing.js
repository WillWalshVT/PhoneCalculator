// MathLive's public offsets are a post-order view of its expression tree.
// Keep a function's operator, optional base, and fenced argument together while
// leaving ordinary character movement inside each editable expression intact.
const functionName=/^(?:\\(?:sin|cos|tan|arcsin|arccos|arctan|sinh|cosh|tanh|ln|log)(?:\b|(?=_))|\\operatorname\{(?:\\mathrm\{)?(?:sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10)\}?\})/;
const emptyFence=/^\\left\((?:\\placeholder\{\})?\\right\)$/;
export function functionUnits(input){
 const atoms=Array.from({length:input.lastOffset+1},(_,i)=>input.getElementInfo(i));const units=[];
 for(let end=1;end<atoms.length;end++){
  const fence=atoms[end];if(!fence?.latex?.startsWith('\\left(')||!fence.latex.endsWith('\\right)'))continue;
  let fnEnd=end-1;while(fnEnd>0&&atoms[fnEnd]?.depth>fence.depth)fnEnd--;
  const fn=atoms[fnEnd];if(fn?.depth!==fence.depth||!functionName.test(fn.latex||''))continue;
  let start=fnEnd-1;while(start>0&&atoms[start]?.depth>fn.depth)start--;
  const hasBase=fn.latex.startsWith('\\log')&&fnEnd-start>1;
  units.push({start,end,fnEnd,bodyStart:fnEnd+1,bodyEnd:end-1,bodyEmpty:emptyFence.test(fence.latex),hasBase,baseDepth:fn.depth+1,baseStart:start+1,baseEnd:fnEnd-1,baseEmpty:hasBase&&atoms.slice(start+1,fnEnd).every(a=>!a?.latex||a.latex==='\\placeholder{}')});
 }
 return units.sort((a,b)=>(a.end-a.start)-(b.end-b.start));
}
function slot(input,start,end,atEnd=false){
 if(input.getElementInfo(start+1)?.latex==='\\placeholder{}')input.selection={ranges:[[start,start+1]]};else input.position=atEnd?end:start;
}
export function moveFunctionCaret(input,forward){
 const {ranges}=input.selection;const [a,b]=ranges[0];
 // Normal navigation can enter an empty slot even when its placeholder is selected.
 if(a!==b&&input.getValue(a,b)!=='\\placeholder{}')return false;
 const p=input.position;
 for(const u of functionUnits(input)){
  if(forward){
   if(p===u.start){u.hasBase?slot(input,u.baseStart,u.baseEnd):slot(input,u.bodyStart,u.bodyEnd);return true;}
   if(p===u.fnEnd||(u.hasBase&&p===u.baseEnd)){slot(input,u.bodyStart,u.bodyEnd);return true;}
   if(p===u.bodyEnd){input.position=u.end;return true;}
  }else{
   if(p===u.bodyStart||(u.bodyEmpty&&a===u.bodyStart)){u.hasBase?slot(input,u.baseStart,u.baseEnd,true):input.position=u.start;return true;}
   if(p===u.end){slot(input,u.bodyStart,u.bodyEnd,true);return true;}
   if(u.hasBase&&p===u.baseStart){input.position=u.start;return true;}
   if(p===u.fnEnd){u.hasBase?slot(input,u.baseStart,u.baseEnd,true):input.position=u.start;return true;}
  }
 }
 return false;
}
export function deleteFunctionBoundary(input){
 const [a,b]=input.selection.ranges[0],p=input.position;
 const selectedPlaceholder=a!==b&&input.getValue(a,b)==='\\placeholder{}';
 for(const u of functionUnits(input)){
  if(a<=u.start||b>u.end)continue;
  // MathLive removes a log operator with its final subscript character. Keep
  // the argument attached and leave an editable base slot until the next delete.
  if(u.hasBase&&!u.baseEmpty&&((a===b&&p===u.baseEnd&&u.baseEnd-u.baseStart===1)||(a===u.baseStart&&b===u.baseEnd))){
   const body=input.getValue(u.bodyStart,u.bodyEnd)||'#?';
   input.selection={ranges:[[u.start,u.end]]};input.insert('\\log_{#?}\\left('+body+'\\right)',{format:'latex',selectionMode:'placeholder',focus:true});return true;
  }
  if(u.hasBase&&a===b&&p>u.baseStart&&p<=u.baseEnd&&input.getElementInfo(p)?.depth===u.baseDepth){
   input.selection={ranges:[[p-1,p]]};input.insert('',{format:'latex',selectionMode:'after',focus:true});return true;
  }
  if(u.hasBase&&a===b&&p===u.baseStart&&!u.baseEmpty){input.position=u.start;return true;}
  if(a!==b&&!selectedPlaceholder)continue;
  if(u.bodyEmpty&&(!u.hasBase||u.baseEmpty)){
   input.selection={ranges:[[u.start,u.end]]};input.insert('',{format:'latex',selectionMode:'after',focus:true});return true;
  }
  if(p===u.bodyStart||(u.bodyEmpty&&a===u.bodyStart)||p===u.fnEnd){
   u.hasBase?slot(input,u.baseStart,u.baseEnd,true):input.position=u.start;return true;
  }
  // An empty base can be refilled without dismantling an argument with content.
  if(u.hasBase&&u.baseEmpty&&a>=u.baseStart&&b<=u.baseEnd)return true;
 }
 return false;
}
