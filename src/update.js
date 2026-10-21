// AppLauncher owns offline packages; ask its worker to atomically replace this app.
const source='https://willwalshvt.github.io/PhoneCalculator/';
let updating=false;
function request(worker,data,progress,timeout=90000){return new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(Error('Update timed out. Your saved app is unchanged; retry when online.'));},timeout);channel.port1.onmessage=({data})=>{if(data.progress){progress?.(data.progress);return;}clearTimeout(timer);channel.port1.close();data.error?reject(Error(data.error)):resolve(data);};worker.postMessage(data,[channel.port2]);});}
export async function updateApp(progress){
 if(updating)return;updating=true;
 try{
  progress('Checking for updates…');
  if(!location.pathname.includes('/apps/phasor-calculator/')){location.replace(source+'?updated='+Date.now());return;}
  const registration=await navigator.serviceWorker.getRegistration();if(!registration)throw Error('Open the installed app through AppLauncher.');
  // Upgrade the shared engine without clearing packages or this app’s data.
  await Promise.race([registration.update(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Engine update timed out. Check your connection and retry.')),15000))]);const limit=Date.now()+20000;let info;
  do{if(navigator.serviceWorker.controller)info=await request(navigator.serviceWorker.controller,{type:'STATUS'},null,2000).catch(()=>null);if(info?.appUpdates)break;await new Promise(r=>setTimeout(r,250));}while(Date.now()<limit);
  if(!info?.appUpdates)throw Error('The AppLauncher engine could not update. Check your connection and retry.');
  await request(navigator.serviceWorker.controller,{type:'APP_UPDATE',id:'phasor-calculator',source},progress);
  progress('Updated. Reopening calculator…');location.reload();
 }finally{updating=false;}
}
