import {parse} from 'es-module-lexer/js';
import {toBase64} from './package.js';
// This code is injected before imported app scripts, inside an opaque sandbox.
export function storageBridge(seed,token){
 const make=(initial,persist)=>{
  let values=Object.assign(Object.create(null),initial);
  const notify=()=>{if(persist)parent.postMessage({type:'pocket-storage',token,data:{...values}},'*');};
  const methods={getItem:key=>Object.hasOwn(values,String(key))?values[String(key)]:null,setItem:(key,value)=>{const next={...values,[String(key)]:String(value)};if(JSON.stringify(next).length>262144)throw new DOMException('Saved data limit reached','QuotaExceededError');values=Object.assign(Object.create(null),next);notify();},removeItem:key=>{delete values[String(key)];notify();},clear:()=>{values=Object.create(null);notify();},key:index=>Object.keys(values)[index]??null};
  return new Proxy(methods,{get:(target,key)=>key==='length'?Object.keys(values).length:key in target?target[key]:values[key],set:(_,key,value)=>{methods.setItem(key,value);return true;},deleteProperty:(_,key)=>{methods.removeItem(key);return true;},ownKeys:()=>Object.keys(values),getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
 };
 Object.defineProperty(window,'localStorage',{value:make(seed,true)});
 Object.defineProperty(window,'sessionStorage',{value:make({},false)});
}

export function rewriteImports(source,path,resolve){
 const [imports]=parse(source,path);const edits=[];
 for(const item of imports){
  if(item.d===-2){edits.push({s:item.s,e:item.e,value:'({url:'+JSON.stringify(resolve(path,''))+ '})'});continue;}
  if(item.n===undefined)throw Error('Dynamic imports must use a literal file path.');
  const value=resolve(item.n,path);
  edits.push({s:item.s,e:item.e,value:item.d===-1?value:JSON.stringify(value)});
 }
 for(const edit of edits.sort((a,b)=>b.s-a.s))source=source.slice(0,edit.s)+edit.value+source.slice(edit.e);
 return source;
}
export function appPolicy(){return "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' data:; style-src 'unsafe-inline' data:; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri https://pocket.invalid/; form-action 'none'";}
// Executes in the opaque iframe. Fetches are resolved from the received package.
function fetchBridge(files,root,token){
 window.fetch=async(input,options={})=>{
  const value=typeof input==='string'?input:input.url||String(input);const url=new URL(value,document.baseURI);
  if((options.method||input.method||'GET').toUpperCase()!=='GET')throw new TypeError('Offline apps support GET requests for included files only.');
  const file=files[url.origin+url.pathname];if(!file)throw new TypeError('File not included in this app: '+url.pathname);
  return new Response(Uint8Array.from(atob(file.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':file.type}});
 };
 document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a)return;const url=new URL(a.href,root);if(url.origin==='https://pocket.invalid'&&files[url.origin+url.pathname]?.type==='text/html'){event.preventDefault();parent.postMessage({type:'pocket-navigate',token,url:url.href},'*');}});
}
export function appDocument(app,{token,entry=app.entry}){
 const root='https://pocket.invalid/'+app.id+'/';
 const files=new Map(app.files.map(f=>[f.path,f]));
 const resolve=(ref,from='')=>{
  if(!ref.startsWith('.')&&!ref.startsWith('/')&&!files.has(ref))throw Error('Bundle dependencies locally and use relative imports: '+ref);
  const url=new URL(ref,new URL(from||'./',root));
  if(!url.href.startsWith(root))throw Error('App files must use relative paths within the app folder.');
  const path=decodeURIComponent(url.pathname.slice(new URL(root).pathname.length));
  if(!files.has(path))throw Error('Missing app file: '+path);
  return url.origin+url.pathname;
 };
 const encoded=new Map(),imports={},fetchFiles={};
 const text=f=>new TextDecoder().decode(f.data);
 const dataURL=(body,type)=>'data:'+type+';base64,'+toBase64(typeof body==='string'?new TextEncoder().encode(body):new Uint8Array(body));
 const getPath=(url)=>decodeURIComponent(new URL(url).pathname.slice(new URL(root).pathname.length));
 const asset=(ref,from='',depth=0)=>{
  if(/^(data:|blob:|#)/.test(ref))return ref;
  if(depth>15)throw Error('Too many nested stylesheet imports.');
  const absolute=resolve(ref,from),path=getPath(absolute);
  if(encoded.has(path))return encoded.get(path);
  const f=files.get(path);let body=f.data;
  if(f.type==='text/javascript')body=rewriteImports(text(f),path,resolve);
  if(f.type==='text/css')body=text(f).replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(_,q,url)=>'url("'+asset(url,path,depth+1)+'")').replace(/@import\s+(['"])(.*?)\1/g,(_,q,url)=>'@import "'+asset(url,path,depth+1)+'"');
  const result=dataURL(body,f.type);encoded.set(path,result);return result;
 };
 for(const [path,f]of files){const absolute=new URL(path,root).href;fetchFiles[absolute]={data:toBase64(new Uint8Array(f.data)),type:f.type};if(f.type==='text/javascript')imports[absolute]=asset(path);}
 const f=files.get(entry);if(!f||f.type!=='text/html')throw Error('HTML entry page is missing.');
 const doc=new DOMParser().parseFromString(text(f),'text/html');
 doc.querySelectorAll('base,meta[http-equiv="Content-Security-Policy" i],script[type="importmap"]').forEach(el=>el.remove());
 for(const el of doc.querySelectorAll('[src],[href],[poster]')){
  for(const attr of ['src','href','poster']){
   const value=el.getAttribute(attr);if(!value||value.startsWith('#')||value.startsWith('data:'))continue;
   if(el.tagName==='A'&&attr==='href'){try{el.setAttribute(attr,resolve(value,entry));}catch{el.removeAttribute(attr);}continue;}
   if(el.tagName==='LINK'&&/^(manifest|preconnect|dns-prefetch|modulepreload)$/i.test(el.rel)){el.remove();break;}
   el.setAttribute(attr,asset(value,entry));
  }
 }
 for(const el of doc.querySelectorAll('script[type="module"]:not([src])'))el.textContent=rewriteImports(el.textContent,entry,resolve);
 for(const el of doc.querySelectorAll('style'))el.textContent=el.textContent.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(_,q,url)=>'url("'+asset(url,entry)+'")');
 for(const el of doc.querySelectorAll('[style]'))el.setAttribute('style',el.getAttribute('style').replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(_,q,url)=>'url("'+asset(url,entry)+'")'));
 const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
 const base=doc.createElement('base');base.href=new URL(entry,root).href;
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content=appPolicy();
 const bootstrap=doc.createElement('script');bootstrap.textContent=`(${storageBridge.toString()})(${safe(app.storage||{})},${safe(token)});(${fetchBridge.toString()})(${safe(fetchFiles)},${safe(root)},${safe(token)});`;
 const map=doc.createElement('script');map.type='importmap';map.textContent=safe({imports});
 doc.head.prepend(policy,base,bootstrap,map);
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
