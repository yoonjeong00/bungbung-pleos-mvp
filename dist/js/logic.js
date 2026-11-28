import {cleanPetName} from './onboarding.js?v=20261128-motion-r1';
import {FUEL_THRESHOLDS,originOf} from './vehicle.js?v=20261128-motion-r1';
// TEAM 2: pure state and persistence boundary. Demo thresholds, not diagnostic rules.
export const stages=[{name:'알',km:0},{name:'아기',km:0},{name:'어린이',km:300},{name:'청소년',km:2000},{name:'어른',km:6000}];
// Highest stage number comes from the list length (0 = 알 ... 4 = 어른). Keep only stages in `stages`.
export const MAX_STAGE=stages.length-1;
// Stage reached by distance, using only the km values in `stages` (spec 6.1 / 13.3 N7).
// Returns the last stage passed. Never returns 0 (알): 0km and unknown distance are 1 (아기).
export function stageForDistance(km){
 if(!Number.isFinite(km))return 1;
 let stage=1;
 for(let i=1;i<stages.length;i++)if(km>=stages[i].km)stage=i;
 return stage;
}
export const initial=()=>({petName:'토토',onboardingComplete:false,baseOdo:10000,hat:'none',badges:[],badgeEarnedAt:{},items:['headphones','cap','scarf'],ackStage:1,pendingGrowthStage:1,maxDistanceKm:0,queuedEvents:[],activeEvent:null,activeEventData:null,lowRangeKm:null,refuelDetails:null,vehicleSnapshot:null});
const limits={odometerKm:[0,999999],tripDistanceKm:[0,2000],tripTimeMin:[0,1440],rangeRemainingKm:[0,1500],outsideTempC:[-40,60]};
// How long a real (bridge) value stays valid without a new successful read (VEHICLE_BRIDGE_CONTRACT.md 0장).
// Java re-reads safety signals every 5 s and ODO every 15 s.
export const REAL_MAX_AGE_MS=Object.freeze({default:15000,odometerKm:45000});
export const realMaxAgeMs=k=>REAL_MAX_AGE_MS[k]??REAL_MAX_AGE_MS.default;
export function signalValid(v,k,now=Date.now()){
 const status=v.dataStatus?.[k];
 if(status&&status!=='OK')return false;
 // N11: judge each item by its own origin. A mock item is always current; a real item must be OK and fresh.
 if(originOf(v,k)==='mock')return true;
 const at=v.receivedAt?.[k];
 return status==='OK'&&Number.isFinite(at)&&now>=at&&now-at<=realMaxAgeMs(k);
}
export function readValue(v,k){const n=v[k],bounds=limits[k];return signalValid(v,k)&&Number.isFinite(n)&&(!bounds||(n>=bounds[0]&&n<=bounds[1]))?n:null}
export function derive(v,s){
 // Old snapshots have no warning contract; an explicit unknown signal must fail closed.
 const hasWarningSignal=Object.hasOwn(v,'safetyWarnings')||Object.hasOwn(v.dataStatus||{},'safetyWarnings');
 const warningUnknown=hasWarningSignal&&(!Array.isArray(v.safetyWarnings)||!signalValid(v,'safetyWarnings'));
 // Spec 3.1 (2026-11-25): lock only when the driving-restriction signal is missing or stale.
 // uxRestricted:true means "driving UX" → drive screen, not lock. Gear and ignition never lock the screen.
 const restrictionKnown=signalValid(v,'uxRestricted')&&typeof v.uxRestricted==='boolean';
 const restricted=warningUnknown||!restrictionKnown;
 const dangerous=signalValid(v,'safetyWarnings')&&Array.isArray(v.safetyWarnings)&&v.safetyWarnings.some(w=>w?.level==='red');
 // Spec 6.2: growth distance pauses ONLY while the restriction signal is missing/stale or a red warning is on.
 // A real car reports uxRestricted:true the whole time it drives, so "restricted" must never pause growth.
 const distanceHold=!restrictionKnown||dangerous;
 const odo=readValue(v,'odometerKm');
 const rawDistance=odo===null?null:Math.max(0,odo-s.baseOdo);
 const distance=rawDistance===null?null:distanceHold?Math.max(0,s.maxDistanceKm||0):Math.max(0,s.maxDistanceKm||0,rawDistance);
 const rawStage=stageForDistance(distance);
 const stage=Math.max(rawStage,s.ackStage||1),range=readValue(v,'rangeRemainingKm');
 const demoRange=originOf(v,'rangeRemainingKm')==='mock'?range:null;
 return {restricted,dangerous,warningUnknown,distanceHold,parked:!restricted&&!dangerous&&v.uxRestricted===false&&signalValid(v,'gear')&&v.gear==='P',distance,rawStage,stage,range,demoRange,hungry:demoRange!==null&&demoRange<FUEL_THRESHOLDS.lowFuelKm,temp:readValue(v,'outsideTempC'),next:stages[stage+1]||null};
}
const eventTypes=['recovery','growth','summary','birth'];
const badgeIds=['first','meal','grow','cold'];
const itemIds=['headphones','cap','scarf','flower','bowl'];
const validRange=n=>Number.isFinite(n)&&n>=0&&n<=1500;
export function load(){
 try {
  const r=JSON.parse(localStorage.getItem('bungbung-v1')||'{}'),s=initial();
  const badges=Array.isArray(r.badges)?[...new Set(r.badges.filter(x=>badgeIds.includes(x)))]:s.badges;
  const activeEvent=eventTypes.includes(r.activeEvent)?r.activeEvent:null;
  const refuelDetails=validRange(r.refuelDetails?.beforeKm)&&validRange(r.refuelDetails?.afterKm)?{beforeKm:r.refuelDetails.beforeKm,afterKm:r.refuelDetails.afterKm}:null;
  const savedEventData=r.activeEventData;
  const activeEventData=activeEvent?{
   stage:Number.isInteger(savedEventData?.stage)?Math.max(1,Math.min(MAX_STAGE,savedEventData.stage)):null,
   refuel:validRange(savedEventData?.refuel?.beforeKm)&&validRange(savedEventData?.refuel?.afterKm)?{beforeKm:savedEventData.refuel.beforeKm,afterKm:savedEventData.refuel.afterKm}:null
  }:null;
  const ackStage=Number.isInteger(r.ackStage)?Math.max(1,Math.min(MAX_STAGE,r.ackStage)):1;
  // Migrate queued/active growth in legacy saves without losing the earned stage.
  const earnedStage=stageForDistance(r.maxDistanceKm);
  const legacyPending=Math.max(ackStage,activeEvent==='growth'?(activeEventData?.stage||1):1,Array.isArray(r.queuedEvents)&&r.queuedEvents.includes('growth')?earnedStage:1);
  const pendingGrowthStage=Number.isInteger(r.pendingGrowthStage)?Math.max(ackStage,Math.min(MAX_STAGE,r.pendingGrowthStage)):legacyPending;
  return {...s,
   petName:cleanPetName(r.petName),
   // Existing valid saves predate onboarding; never reset their pet.
   onboardingComplete:typeof r.onboardingComplete==='boolean'?r.onboardingComplete:['baseOdo','ackStage','hat','vehicleSnapshot'].some(key=>Object.hasOwn(r,key)),
   baseOdo:Number.isFinite(r.baseOdo)&&r.baseOdo>=0&&r.baseOdo<=999999?r.baseOdo:s.baseOdo,
   hat:['none','cap','flower','scarf'].includes(r.hat)?r.hat:'none',badges,
   badgeEarnedAt:Object.fromEntries(badges.filter(id=>Number.isFinite(r.badgeEarnedAt?.[id])&&r.badgeEarnedAt[id]>0).map(id=>[id,r.badgeEarnedAt[id]])),
   items:[...new Set([...s.items,...(Array.isArray(r.items)?r.items.filter(x=>itemIds.includes(x)):[]),...(badges.includes('meal')?['bowl']:[])])],
   ackStage,pendingGrowthStage,
   maxDistanceKm:Math.max(0,Number.isFinite(r.maxDistanceKm)?r.maxDistanceKm:0),
   queuedEvents:Array.isArray(r.queuedEvents)?[...new Set(r.queuedEvents.filter(x=>eventTypes.includes(x)&&x!==activeEvent))]:[],
   activeEvent,activeEventData,refuelDetails,
   lowRangeKm:validRange(r.lowRangeKm)&&r.lowRangeKm<FUEL_THRESHOLDS.lowFuelKm?r.lowRangeKm:null,
   vehicleSnapshot:r.vehicleSnapshot?.isMock===true?r.vehicleSnapshot:null
  };
 }catch{return initial()}
}
export function save(s){try{localStorage.setItem('bungbung-v1',JSON.stringify(s))}catch{}}
