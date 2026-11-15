import {derive,readValue} from './logic.js';
const eventTypes=['recovery','growth','summary','birth'];
export function addBadge(s,id,at=Date.now()){
 if(!s.badges.includes(id)){s.badges.push(id);(s.badgeEarnedAt??={})[id]=at}
}
export function enqueue(s,type){if(eventTypes.includes(type)&&s.activeEvent!==type&&!s.queuedEvents.includes(type))s.queuedEvents.push(type)}
export function advance(s,previous,vehicle,{detect=true,now=Date.now()}={}){
 const d=derive(vehicle,s);
 if(!d.distanceHold&&d.distance!==null)s.maxDistanceKm=Math.max(s.maxDistanceKm||0,d.distance);
 if(detect&&!d.distanceHold){
  // Keep the low-range observation until a meaningful total increase occurs.
  // This is a mock heuristic, not a claim that range alone proves a real refuel.
  const lows=[s.lowRangeKm,previous?.range,d.range].filter(n=>Number.isFinite(n)&&n>=0&&n<50);
  if(lows.length)s.lowRangeKm=Math.min(...lows);
  if(Number.isFinite(s.lowRangeKm)&&d.range!==null&&d.range-s.lowRangeKm>=100){
   s.refuelDetails={beforeKm:s.lowRangeKm,afterKm:d.range};s.lowRangeKm=null;
   enqueue(s,'recovery');addBadge(s,'meal',now);
   s.items??=[];if(!s.items.includes('bowl'))s.items.push('bowl');
  }
  s.pendingGrowthStage=Math.max(s.ackStage||1,s.pendingGrowthStage||1,d.stage);
  if(s.pendingGrowthStage>s.ackStage)enqueue(s,'growth');
  const trip=readValue(vehicle,'tripDistanceKm');
  const hasMoved=(d.distance!==null&&d.distance>0)||(trip!==null&&trip>0);
  if(!d.parked&&hasMoved){
   addBadge(s,'first',now);
   if(d.temp!==null&&d.temp<=0){
    addBadge(s,'cold',now);
    s.items??=[];if(!s.items.includes('scarf'))s.items.push('scarf');
   }
  }
 }else if(!detect){
  // An explicit fixture reset must not inherit a prior low-fuel latch.
  s.lowRangeKm=d.hungry?d.range:null;
  s.pendingGrowthStage=Math.max(s.ackStage||1,d.stage||1);
 }
 s.vehicleSnapshot=structuredClone(vehicle);
 return d;
}
// Activate once, then return the same pending presentation until explicit acknowledgment.
export function takeEvent(s,d){
 if(!d.parked)return null;
 if(s.activeEvent)return s.activeEvent;
 s.activeEvent=s.queuedEvents.shift()||null;
 if(s.activeEvent)s.activeEventData={stage:s.activeEvent==='growth'?Math.max(d.stage,s.pendingGrowthStage||1):d.stage,refuel:s.refuelDetails?{...s.refuelDetails}:null};
 return s.activeEvent;
}
export function completeEvent(s,d,{now=Date.now()}={}){
 if(!d.parked)return null;
 if(s.activeEvent==='growth'){
  s.ackStage=Math.max(s.ackStage,s.activeEventData?.stage||d.stage);
  s.pendingGrowthStage=Math.max(s.ackStage,s.pendingGrowthStage||1);
  addBadge(s,'grow',now);
 }
 s.activeEvent=null;s.activeEventData=null;
 s.pendingGrowthStage=Math.max(s.ackStage,s.pendingGrowthStage||1,d.stage);
 if(s.pendingGrowthStage>s.ackStage)enqueue(s,'growth');
 return takeEvent(s,d);
}
