import {derive,readValue} from './logic.js?v=20261128-motion-r1';
import {FUEL_THRESHOLDS,TEMP_THRESHOLDS,vehicleKeys,originOf} from './vehicle.js?v=20261128-motion-r1';
// Spec 13.1 (2026-11-25): real vehicle values are never saved. The saved snapshot is the previous snapshot
// with only the mock items overwritten; `origin` itself is never saved, so the format stays the same.
function snapshotForSave(previous,vehicle){
 const {origin,...current}=vehicle;
 const present=vehicleKeys.filter(k=>Object.hasOwn(vehicle,k));
 const mockKeys=present.filter(k=>originOf(vehicle,k)==='mock');
 if(mockKeys.length===present.length)return structuredClone(current); // all mock: exactly as before
 if(!previous||mockKeys.length===0)return previous??null;             // live: keep what was saved
 // Only fields the previous snapshot already had are touched, so the saved shape never changes.
 const next=structuredClone(previous);
 for(const k of mockKeys){
  next[k]=structuredClone(vehicle[k]);
  for(const map of ['dataStatus','receivedAt']){
   if(!next[map]||typeof next[map]!=='object')continue;
   if(Object.hasOwn(vehicle[map]||{},k))next[map][k]=vehicle[map][k];else delete next[map][k];
  }
 }
 next.isMock=true;
 return next;
}
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
  if(originOf(vehicle,'rangeRemainingKm')==='mock'){
   const lows=[s.lowRangeKm,previous?.demoRange,d.demoRange].filter(n=>Number.isFinite(n)&&n>=0&&n<FUEL_THRESHOLDS.lowFuelKm);
   if(lows.length)s.lowRangeKm=Math.min(...lows);
   if(Number.isFinite(s.lowRangeKm)&&d.demoRange!==null&&d.demoRange-s.lowRangeKm>=FUEL_THRESHOLDS.refuelJumpKm){
    s.refuelDetails={beforeKm:s.lowRangeKm,afterKm:d.demoRange};s.lowRangeKm=null;
    enqueue(s,'recovery');addBadge(s,'meal',now);
    s.items??=[];if(!s.items.includes('bowl'))s.items.push('bowl');
   }
  }
  s.pendingGrowthStage=Math.max(s.ackStage||1,s.pendingGrowthStage||1,d.stage);
  if(s.pendingGrowthStage>s.ackStage)enqueue(s,'growth');
  const trip=readValue(vehicle,'tripDistanceKm');
  const hasMoved=(d.distance!==null&&d.distance>0)||(trip!==null&&trip>0);
  if(!d.parked&&hasMoved){
   addBadge(s,'first',now);
   if(d.temp!==null&&d.temp<=TEMP_THRESHOLDS.coldMaxC){
    addBadge(s,'cold',now);
    s.items??=[];if(!s.items.includes('scarf'))s.items.push('scarf');
   }
  }
 }else if(!detect){
  // An explicit fixture reset must not inherit a prior low-fuel latch.
  s.lowRangeKm=d.hungry?d.demoRange:null;
  s.pendingGrowthStage=Math.max(s.ackStage||1,d.stage||1);
 }
 s.vehicleSnapshot=snapshotForSave(s.vehicleSnapshot,vehicle);
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
