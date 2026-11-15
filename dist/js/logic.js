import {cleanPetName} from './onboarding.js';
// TEAM 2: pure state and persistence boundary. Demo thresholds, not diagnostic rules.
export const stages=[{name:'알',km:0},{name:'아기',km:0},{name:'어린이',km:300},{name:'청소년',km:2000},{name:'어른',km:6000}];
export const initial=()=>({petName:'토토',baseOdo:10000,hat:'none',badges:[],badgeEarnedAt:{},items:['headphones','cap','scarf'],ackStage:1,maxDistanceKm:0,queuedEvents:[],activeEvent:null,activeEventData:null,lowRangeKm:null,refuelDetails:null,vehicleSnapshot:null});
const limits={odometerKm:[0,999999],tripDistanceKm:[0,2000],tripTimeMin:[0,1440],rangeRemainingKm:[0,1500],outsideTempC:[-40,60]};
export function signalValid(v,k,now=Date.now()){
 const status=v.dataStatus?.[k];
 if(status&&status!=='OK')return false;
 if(v.isMock===true)return true;
 const at=v.receivedAt?.[k];
 return status==='OK'&&Number.isFinite(at)&&now>=at&&now-at<=15000;
}
export function readValue(v,k){const n=v[k],bounds=limits[k];return signalValid(v,k)&&Number.isFinite(n)&&(!bounds||(n>=bounds[0]&&n<=bounds[1]))?n:null}
export function derive(v,s){
 const restricted=!['gear','uxRestricted','ignition'].every(k=>signalValid(v,k))||v.uxRestricted!==false||!['P','D','R','N'].includes(v.gear)||v.ignition!=='ON';
 const odo=readValue(v,'odometerKm');
 const distance=odo===null?null:Math.max(0,s.maxDistanceKm||0,odo-s.baseOdo);
 const raw=distance===null?1:distance>=6000?4:distance>=2000?3:distance>=300?2:1;
 const stage=Math.max(raw,s.ackStage||1),range=readValue(v,'rangeRemainingKm');
 return {restricted,parked:!restricted&&v.gear==='P',distance,stage,range,hungry:range!==null&&range<50,temp:readValue(v,'outsideTempC'),next:stages[stage+1]||null};
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
   stage:Number.isInteger(savedEventData?.stage)?Math.max(1,Math.min(4,savedEventData.stage)):null,
   refuel:validRange(savedEventData?.refuel?.beforeKm)&&validRange(savedEventData?.refuel?.afterKm)?{beforeKm:savedEventData.refuel.beforeKm,afterKm:savedEventData.refuel.afterKm}:null
  }:null;
  return {...s,
   petName:cleanPetName(r.petName),
   baseOdo:Number.isFinite(r.baseOdo)&&r.baseOdo>=0&&r.baseOdo<=999999?r.baseOdo:s.baseOdo,
   hat:['none','cap','flower','scarf'].includes(r.hat)?r.hat:'none',badges,
   badgeEarnedAt:Object.fromEntries(badges.filter(id=>Number.isFinite(r.badgeEarnedAt?.[id])&&r.badgeEarnedAt[id]>0).map(id=>[id,r.badgeEarnedAt[id]])),
   items:[...new Set([...s.items,...(Array.isArray(r.items)?r.items.filter(x=>itemIds.includes(x)):[]),...(badges.includes('meal')?['bowl']:[])])],
   ackStage:Number.isInteger(r.ackStage)?Math.max(1,Math.min(4,r.ackStage)):1,
   maxDistanceKm:Math.max(0,Number.isFinite(r.maxDistanceKm)?r.maxDistanceKm:0),
   queuedEvents:Array.isArray(r.queuedEvents)?[...new Set(r.queuedEvents.filter(x=>eventTypes.includes(x)&&x!==activeEvent))]:[],
   activeEvent,activeEventData,refuelDetails,
   lowRangeKm:validRange(r.lowRangeKm)&&r.lowRangeKm<50?r.lowRangeKm:null,
   vehicleSnapshot:r.vehicleSnapshot?.isMock===true?r.vehicleSnapshot:null
  };
 }catch{return initial()}
}
export function save(s){try{localStorage.setItem('bungbung-v1',JSON.stringify(s))}catch{}}
