export const HEART_MS=620;
export const HEART_COOLDOWN_MS=900;

/** Independent, non-queued feedback; eligibility is the same gate as parked blink. */
export class ParkedTap {
 constructor({deadline,onHeart,now=Date.now,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
  Object.assign(this,{deadline,onHeart,now,schedule,cancel});this.timer=null;this.epoch=0;this.active=false;this.lastAt=-Infinity;
 }
 show(active){if(this.active===active)return;this.active=active;this.onHeart(active)}
 stop(){
  ++this.epoch;
  if(this.timer!==null)this.cancel(this.timer);
  this.timer=null;this.show(false);
 }
 trigger(){
  const now=this.now(),until=this.deadline(now);
  if(until<=now){this.stop();return false;}
  if(this.active||now-this.lastAt<HEART_COOLDOWN_MS)return false;
  this.lastAt=now;
  const id=++this.epoch;
  this.show(true);
  this.timer=this.schedule(()=>{
   if(id!==this.epoch)return;
   this.timer=null;this.show(false);
  },Math.min(HEART_MS,until-now));
  return true;
 }
}

export const heartLayer=`<svg class="toto-tap-heart" viewBox="0 0 16 15" aria-hidden="true" focusable="false" shape-rendering="crispEdges">
 <path fill="#7d2b55" d="M3 0h4v1h2V0h4v1h2v2h1v5h-1v2h-2v2h-2v1h-1v1H9v1H7v-1H6v-1H5v-1H3v-2H1V8H0V3h1V1h2z"/>
 <path fill="#f475a7" d="M3 2h4v1h2V2h4v1h1v5h-1v2h-2v2h-1v1H9v1H7v-1H6v-1H5v-2H3V8H2V3h1z"/>
 <path fill="#ffd1df" d="M4 3h2v1H4zM3 4h1v2H3z"/>
</svg>`;
