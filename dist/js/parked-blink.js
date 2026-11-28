// Nothing here treats the prototype vehicle provider as Pleos safety telemetry.
export const BLINK_MS=200;
export const PREVIEW_SIGNAL_MS=15000;
const safetyKeys=['gear','uxRestricted','ignition','safetyWarnings'];

export function blinkPreviewEnabled(search,hostname){
 const params=new URLSearchParams(search);
 return ['localhost','127.0.0.1','[::1]'].includes(hostname)&&params.get('blink-preview')==='1'&&!params.has('android')&&!params.has('embedded')&&!params.has('record');
}

export function blinkPreviewDeadline(v,state,now=Date.now()){
 if(!state.preview||!state.demo||!state.home||state.hidden||state.reduced||
    !state.parked||state.restricted||state.dangerous||
    v.isMock!==true||v.gear!=='P'||v.uxRestricted!==false||v.ignition!=='ON'||
    !Array.isArray(v.safetyWarnings)||v.safetyWarnings.some(w=>!w||w.level!=='yellow'))return 0;
 const times=safetyKeys.map(k=>v.receivedAt?.[k]);
 if(!safetyKeys.every((k,i)=>v.dataStatus?.[k]==='OK'&&Number.isFinite(times[i])&&times[i]<=now))return 0;
 const until=Math.min(...times)+PREVIEW_SIGNAL_MS;
 return now<until?until:0;
}

// A single timer owns both phases; old callbacks cannot affect a replacement room.
export class ParkedBlink {
 constructor({deadline,onClosed,now=Date.now,random=Math.random,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
  Object.assign(this,{deadline,onClosed,now,random,schedule,cancel});
  this.generation=0;this.timer=null;this.closed=false;
 }
 reset(){
  this.generation++;
  if(this.timer!==null)this.cancel(this.timer);
  this.timer=null;this.show(false);
 }
 show(closed){if(this.closed!==closed){this.closed=closed;this.onClosed(closed)}}
 start(){
  this.reset();
  const generation=this.generation;
  const next=(startedAt=null)=>{
   const now=this.now(),interval=3000+Math.floor(this.random()*2001);
   const elapsed=startedAt===null?0:Math.max(0,now-startedAt);
   // Count from the previous blink's start. A stalled timer never queues a catch-up blink.
   const wait=elapsed<interval?interval-elapsed:interval;
   if(this.deadline(now)<=now+wait)return;
   this.timer=this.schedule(()=>{
    if(this.generation!==generation)return;
    this.timer=null;
    const current=this.now(),until=this.deadline(current);
    if(until<=current)return;
    this.show(true);
    this.timer=this.schedule(()=>{
     if(this.generation!==generation)return;
     this.timer=null;this.show(false);next(current);
    },Math.min(BLINK_MS,until-current));
   },wait);
  };
  next();
 }
}

// Pupil colors are never faded through an eyelid. The feather only begins outside
// the high-contrast outline, then an opaque top-to-bottom reveal covers each eye.
export const blinkLayer=`<svg class="toto-blink-layer" viewBox="0 0 1536 1024" aria-hidden="true" focusable="false">
 <defs>
  <linearGradient id="toto-lid-left" x1="0%" y1="0%" x2="80%" y2="100%"><stop stop-color="#f8f2f0"/><stop offset="1" stop-color="#f0e6e3"/></linearGradient>
  <linearGradient id="toto-lid-right" x1="0%" y1="0%" x2="85%" y2="100%"><stop stop-color="#eee7e3"/><stop offset="1" stop-color="#e5d9d5"/></linearGradient>
  <radialGradient id="toto-lid-opaque-core">
   <stop offset="86%" stop-color="white"/>
   <stop offset="97%" stop-color="white" stop-opacity=".14"/>
   <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <mask id="toto-lid-feather" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1" style="mask-type:alpha">
   <rect width="1" height="1" fill="url(#toto-lid-opaque-core)"/>
  </mask>
  <clipPath id="toto-lid-clip-left" clipPathUnits="userSpaceOnUse"><rect class="toto-lid-sweep" x="890" y="443" width="52" height="0"/></clipPath>
  <clipPath id="toto-lid-clip-right" clipPathUnits="userSpaceOnUse"><rect class="toto-lid-sweep" x="998" y="461" width="56" height="0"/></clipPath>
 </defs>
 <g clip-path="url(#toto-lid-clip-left)">
  <ellipse cx="915.5" cy="475.5" rx="20" ry="30" transform="rotate(13 915.5 475.5)" fill="url(#toto-lid-left)" mask="url(#toto-lid-feather)"/>
 </g>
 <g clip-path="url(#toto-lid-clip-right)">
  <ellipse cx="1026.5" cy="494" rx="20" ry="30" transform="rotate(13 1026.5 494)" fill="url(#toto-lid-right)" mask="url(#toto-lid-feather)"/>
 </g>
 <path class="toto-lid-line" d="M905.5 475Q914.4 481.7 924.9 476M1015.5 494Q1025 500.7 1036.6 495" fill="none" stroke="#454040" stroke-width="3.6" stroke-linecap="round"/>
 </svg>`;
