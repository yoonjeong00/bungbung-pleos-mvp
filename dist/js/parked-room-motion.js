import {pose} from './parked-room-pose.js?v=20261125-p1';
const QA={explicitBrowserSimulation:true,native:false,gear:'P',signalFresh:true,uxRestricted:false,seriousWarning:false,foreground:true,reducedMotion:false,blinkActive:false,tapActive:false};
const IDLE_MS=7000;
const neutral={sway:0,smile:0,eyelid:null};
export const sampleRoomPose=ms=>pose(ms,QA);

// The existing parked-preview deadline is the only permission to present.
export class ParkedRoomMotion {
 constructor({deadline, paint, ended, now=Date.now, request=fn=>requestAnimationFrame(fn), cancel=id=>cancelAnimationFrame(id)}) {
  Object.assign(this,{deadline,paint,ended,now,request,cancel});
  this.frame=null;this.generation=0;
 }
 stop() {
  ++this.generation;
  if(this.frame!==null)this.cancel(this.frame);
  this.frame=null;
  this.paint(neutral);
 }
 start() {
  this.stop();
  const gen=this.generation, start=this.now();
  if(this.deadline(start)<=start)return false;
  const next=()=>{
   if(gen!==this.generation)return;
   this.frame=null;
   const t=this.now(), elapsed=t-start;
   if(this.deadline(t)<=t){this.stop();this.ended(false);return;}
   if(elapsed>=IDLE_MS){this.stop();this.ended(true);return;}
   this.paint(sampleRoomPose(elapsed));
   this.frame=this.request(next);
  };
  this.frame=this.request(next);
  return true;
 }
}

const base='hmi-assets/parked-motion/';
export const parkedRoomLayers=`<div class="toto-room-movement" aria-hidden="true">
 <img class="toto-motion-plate" src="${base}room-plate.webp" alt="">
 <div class="toto-motion-actor">
  <img src="${base}toto-neutral.png" alt="">
  <img class="toto-motion-smile" src="${base}toto-smile.png" alt="">
  ${[0,1,2,3].map(i=>`<img class="toto-motion-eye" data-toto-eye="${i}" src="${base}toto-eyes-${i}.png" alt="" hidden>`).join('')}
 </div></div>`;
