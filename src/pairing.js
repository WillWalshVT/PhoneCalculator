import {joinRoom,getRelaySockets} from 'trystero';
import {MAX_BYTES,decodePackage} from './package.js';
const token=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function newInvite(){return {v:1,room:token(),secret:token(),expires:Date.now()+10*60*1000};}
export function inviteLink(invite){const url=new URL('./',location.href);url.hash='receive='+btoa(JSON.stringify(invite));return url.href;}
export function parseInvite(hash){let invite;try{invite=JSON.parse(atob(hash.replace(/^#receive=/,'')));}catch{throw Error('Invalid invitation. Scan a new QR.');}if(invite?.v!==1||! /^[a-f0-9]{48}$/.test(invite.room)||! /^[a-f0-9]{48}$/.test(invite.secret)||!Number.isFinite(invite.expires)||invite.expires<Date.now()||invite.expires>Date.now()+11*60*1000)throw Error('Invitation expired or invalid. Scan a new QR.');return invite;}
export function connect({invite,role,bundle,onStatus,onOffer,onApp,onProgress,onDone,onError}){
 if(invite.expires<=Date.now())throw Error('Invitation expired. Make a new QR.');
 let closed=false,remote=null,accepted=false,offered=null,sending=false;
 const status=text=>{if(!closed)onStatus?.(text);};
 const room=joinRoom({appId:'willwalshvt-pocket-library-v1',password:invite.secret,relayConfig:{redundancy:3},trickleIce:true},invite.room,{onJoinError:()=>onError?.(Error('Direct connection could not be established. Try the same Wi-Fi or a new invitation.'))});
 const hello=room.makeAction('hello'),offer=room.makeAction('offer'),accept=room.makeAction('accept'),payload=room.makeAction('payload'),receipt=room.makeAction('receipt');
 const safeSend=(action,data,peerId,options={})=>action.send(data,{target:peerId,...options}).catch(err=>{if(!closed)onError?.(err);});
 const ownHello=peerId=>safeSend(hello,{role},peerId);
 room.onPeerJoin=peerId=>{status('Connected · checking app…');ownHello(peerId);};
 hello.onMessage=async(data,{peerId})=>{
  if(closed||data?.role===role||!['send','receive'].includes(data?.role))return;
  if(remote&&remote!==peerId)return;
  if(!remote){remote=peerId;await ownHello(peerId);}
  if(role==='send')await safeSend(offer,{id:bundle.pack.id,name:bundle.pack.name,entry:bundle.pack.entry,count:bundle.pack.files.length,size:bundle.size,bytes:bundle.bytes.byteLength,version:bundle.version},peerId);
 };
 offer.onMessage=(meta,{peerId})=>{
  if(role!=='receive'||closed||peerId!==remote||offered)return;
  if(!meta||! /^[a-z0-9][a-z0-9-]{0,47}$/.test(meta.id)||typeof meta.name!=='string'||meta.name.length>80||! /^[a-f0-9]{64}$/.test(meta.version)||!Number.isInteger(meta.bytes)||meta.bytes<1||meta.bytes>MAX_BYTES*1.4+100000||!Number.isInteger(meta.count)||meta.count<1||meta.count>250||!Number.isInteger(meta.size)||meta.size<0||meta.size>MAX_BYTES){onError?.(Error('Invalid app offer.'));return;}
  offered=meta;status('App ready · review and save');onOffer?.(meta);
 };
 accept.onMessage=async(data,{peerId})=>{
  if(role!=='send'||closed||peerId!==remote||data?.version!==bundle.version||sending)return;
  sending=true;status('Sending app…');
  try{await payload.send(bundle.bytes,{target:peerId,onProgress:percent=>onProgress?.(percent)});status('Transfer complete · waiting for saved confirmation…');}catch(err){onError?.(err);}
 };
 payload.onReceiveProgress=(percent,{peerId})=>{if(role==='receive'&&accepted&&peerId===remote)onProgress?.(percent);};
 payload.onMessage=async(bytes,{peerId})=>{
  if(role!=='receive'||!accepted||closed||peerId!==remote)return;
  accepted=false;
  try{
   const raw=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
   if(raw.byteLength!==offered.bytes)throw Error('Transfer size mismatch.');
   status('Checking and saving app…');const app=await decodePackage(raw,offered.version);
   if(app.id!==offered.id||app.name!==offered.name||app.entry!==offered.entry||app.size!==offered.size||app.files.length!==offered.count)throw Error('App differs from the accepted offer.');
   await onApp(app);await receipt.send({version:app.version},{target:peerId});onDone?.();close();
  }catch(err){onError?.(err);close();}
 };
 receipt.onMessage=(data,{peerId})=>{if(role==='send'&&peerId===remote&&data?.version===bundle.version){onDone?.();close();}};
 room.onPeerLeave=peerId=>{if(peerId===remote&&!closed){onError?.(Error('The other device disconnected. Make a new invitation.'));close();}};
 const expires=setTimeout(()=>{onError?.(Error('Invitation expired. Make a new QR.'));close();},invite.expires-Date.now());
 const relay=setInterval(()=>{if(closed||remote)return;const connected=Object.values(getRelaySockets()).filter(s=>s.readyState===1).length;status(connected?'Signaling ready · waiting for other device…':'Connecting to free signaling relays…');},2500);
 function close(){if(closed)return;closed=true;clearTimeout(expires);clearInterval(relay);room.leave();}
 return {close,accept:()=>{if(!offered||!remote||accepted)return;accepted=true;status('Receiving app…');return safeSend(accept,{version:offered.version},remote);}};
}
