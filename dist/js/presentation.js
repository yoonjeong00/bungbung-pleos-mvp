// TEAM 1: animation lifecycle only. TEAM 2 owns event eligibility and rewards.
export const presentationTypes={REFUEL_RECOVERED:'recovery',GROWTH_READY:'growth',DAILY_SUMMARY:'summary',BIRTH_READY:'birth'};
export class PresentationController {
 constructor({onChange=()=>{},onComplete=()=>{},schedule=setTimeout,cancel=clearTimeout}={}){Object.assign(this,{onChange,onComplete,schedule,cancel});this.parked=false;this.active=null;this.timer=null;this.generation=0}
 setParked(allowed){this.parked=allowed===true;if(!this.parked)this.stop('restricted')}
 start(type,{duration=1800,payload={}}={}){if(!this.parked)return false;this.stop('replaced');const generation=++this.generation;this.active={type,payload};this.onChange(this.active);this.timer=this.schedule(()=>{if(generation!==this.generation||!this.parked)return;const done=this.active;this.timer=null;this.active=null;this.onChange(null);this.onComplete(done)},duration);return true}
 stop(reason='cancelled'){++this.generation;if(this.timer!==null)this.cancel(this.timer);this.timer=null;const old=this.active;this.active=null;if(old)this.onChange(null,reason)}
 dispose(){this.stop('disposed');this.parked=false}
}
