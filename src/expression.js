import {convertAsciiMathToLatex,convertLatexToAsciiMath} from 'mathlive';
// Preserve calculator identifiers: MathLive's generic ASCII export otherwise
// expands operatorname{parallel} into the unrelated symbols p a r a l l e l.
export function toLatex(text){
 const protectedNames=String(text).replace(/\b[A-Za-z][A-Za-z0-9_]+\b/g,name=>['sqrt','pi'].includes(name)?name:'"'+name+'"');
 return convertAsciiMathToLatex(protectedNames).replace(/\\text\{([A-Za-z][A-Za-z0-9_]*)\}/g,'\\operatorname{$1}');
}
export function toExpression(latex){
 if(/\\placeholder\b/.test(latex))throw Error('Complete the empty expression slots.');
 const names=[];
 const protectedNames=latex.replace(/\\operatorname\{(?:\\mathrm\{([A-Za-z][A-Za-z0-9_]*)\}|([A-Za-z][A-Za-z0-9_]*))\}/g,(_,wrapped,name)=>{names.push(wrapped||name);return '\\text{PHASORIDENT'+(names.length-1)+'}';});
 return convertLatexToAsciiMath(protectedNames).replace(/"PHASORIDENT(\d+)"/g,(_,i)=>names[Number(i)]);
}
