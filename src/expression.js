import {convertAsciiMathToLatex,convertLatexToAsciiMath} from 'mathlive';
// Preserve calculator identifiers: MathLive's generic ASCII export otherwise
// expands operatorname{parallel} into the unrelated symbols p a r a l l e l.
export function toLatex(text){
 const protectedNames=String(text).replace(/\b[A-Za-z][A-Za-z0-9_]+\b/g,name=>['sqrt','pi'].includes(name)?name:'"'+name+'"');
 return convertAsciiMathToLatex(protectedNames).replace(/\\text\{([A-Za-z][A-Za-z0-9_]*)\}/g,'\\operatorname{$1}');
}
// Expand indexed radicals before generic ASCII export (which emits root(n)(x)).
function expandRoots(text){
 const group=(start,open,close)=>{let depth=1,i=start+1;for(;i<text.length&&depth;i++){if(text[i]===open)depth++;if(text[i]===close)depth--;}if(depth)throw Error('Complete the root expression.');return [text.slice(start+1,i-1),i];};
 let out='';for(let i=0;i<text.length;){if(text.startsWith('\\sqrt[',i)){const [n,next]=group(i+5,'[',']');let at=next;while(text[at]===' ')at++;if(text[at]!=='{')throw Error('Complete the root expression.');const [body,end]=group(at,'{','}');out+='\\operatorname{nthRoot}\\left('+expandRoots(body)+','+expandRoots(n)+'\\right)';i=end;}else out+=text[i++];}return out;
}
export function toExpression(latex){
 latex=expandRoots(latex).replace(/\\left\[/g,'\\left(').replace(/\\right\]/g,'\\right)');
 if(/\\placeholder\b/.test(latex))throw Error('Complete the empty expression slots.');
 const names=[];
 const protectedNames=latex.replace(/\\operatorname\{(?:\\mathrm\{([A-Za-z][A-Za-z0-9_]*)\}|([A-Za-z][A-Za-z0-9_]*))\}/g,(_,wrapped,name)=>{names.push(wrapped||name);return '\\text{PHASORIDENT'+(names.length-1)+'}';});
 return convertLatexToAsciiMath(protectedNames.replace(/\\mathbin\{\/\}/g,'/')).replace(/"PHASORIDENT(\d+)"/g,(_,i)=>names[Number(i)]);
}
