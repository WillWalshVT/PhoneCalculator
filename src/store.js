const base=new URL('./',import.meta.url).pathname;
const dbName='pocket-library:'+base;
let opening;
export function database(){return opening ||= new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onupgradeneeded=()=>r.result.createObjectStore('apps',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error);};});}
export async function transaction(mode,task){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('apps',mode);let result;try{result=task(tx.objectStore('apps'));}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(result?.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Unable to save app. Storage may be full.'));});}
export const listApps=()=>transaction('readonly',s=>s.getAll());
export const getApp=id=>transaction('readonly',s=>s.get(id));
export const deleteApp=id=>transaction('readwrite',s=>s.delete(id));
export async function saveApp(app){return transaction('readwrite',s=>{const r=s.get(app.id);r.onsuccess=()=>s.put({...app,storage:r.result?.storage||{}});});}
export async function saveStorage(id,storage){if(JSON.stringify(storage).length>262144)throw Error('This app has reached its saved-data limit (256 KB).');return transaction('readwrite',s=>{const r=s.get(id);r.onsuccess=()=>{if(r.result)s.put({...r.result,storage});};});}
