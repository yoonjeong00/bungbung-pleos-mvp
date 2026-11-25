import assert from 'node:assert/strict';
import {initial,derive,load,save} from '../dist/js/logic.js';
import {baseline} from '../dist/js/vehicle.js';
import {advance,takeEvent,completeEvent} from '../dist/js/state-machine.js';
const red=[{id:'brake',level:'red',label:'브레이크 경고'}];
const car=(patch={})=>({...baseline(),odometerKm:10000,tripDistanceKm:0,safetyWarnings:[],...patch});
let s=initial(),d=derive(car(),s);
// Gear alone is not evidence of travel. Invalid/stale trip data cannot earn a badge.
for(const patch of [{gear:'D'},{gear:'D',tripDistanceKm:12,dataStatus:{tripDistanceKm:'UNSUPPORTED'}},{gear:'D',tripDistanceKm:Infinity},{gear:'D',tripDistanceKm:-1}]){
 s=initial();advance(s,derive(car(),s),car(patch));assert.deepEqual(s.badges,[]);
}
s=initial();advance(s,d,car({gear:'D',tripDistanceKm:0.1,outsideTempC:-3}),{now:10});
assert.deepEqual(s.badges,['first','cold']);assert.equal(s.items.filter(x=>x==='scarf').length,1);

// Both a restriction and a red warning suspend distance/recovery/growth/rewards.
for(const hold of [{uxRestricted:null},{safetyWarnings:red}]){ // missing restriction signal, red warning
 s=initial();d=advance(s,null,car({odometerKm:10299,rangeRemainingKm:49}));
 const before=structuredClone(s);
 d=advance(s,d,car({...hold,gear:'D',odometerKm:10600,rangeRemainingKm:620,tripDistanceKm:100,outsideTempC:-3}));
 assert.equal(d.distanceHold,true);assert.equal(d.parked,false);assert.equal(d.distance,299);
 assert.equal(s.maxDistanceKm,299);assert.equal(s.pendingGrowthStage,before.pendingGrowthStage);
 assert.deepEqual(s.queuedEvents,[]);assert.deepEqual(s.badges,[]);assert.equal(s.lowRangeKm,49);
 assert.equal(takeEvent(s,d),null);assert.equal(completeEvent(s,d),null);
 d=advance(s,d,car({odometerKm:10600,rangeRemainingKm:620}));
 assert.equal(d.distanceHold,false);assert.equal(d.distance,600);assert.equal(s.maxDistanceKm,600);
 assert.deepEqual(s.queuedEvents,['recovery','growth']);assert.equal(s.pendingGrowthStage,2);
 assert.equal(takeEvent(s,d),'recovery');assert.equal(completeEvent(s,d),'growth');assert.equal(completeEvent(s,d),null);
 assert.equal(s.ackStage,2);assert.equal(s.pendingGrowthStage,2);
}
assert.equal(derive(car({safetyWarnings:red}),initial()).dangerous,true);
assert.equal(derive(car({safetyWarnings:red}),initial()).parked,false);
assert.equal(derive(car({safetyWarnings:[{id:'tire',level:'yellow',label:'타이어'}]}),initial()).parked,true);
assert.equal(derive(car({safetyWarnings:red,dataStatus:{safetyWarnings:'ERROR'}}),initial()).dangerous,false);

// Queued growth survives reload and a temporarily unavailable odometer.
let raw='';globalThis.localStorage={getItem:()=>raw,setItem:(key,value)=>raw=value};
s=initial();d=advance(s,null,car({gear:'D',odometerKm:10300}));
assert.equal(s.pendingGrowthStage,2);save(s);s=load();
d=derive(car({odometerKm:null}),s);assert.equal(takeEvent(s,d),'growth');assert.equal(s.activeEventData.stage,2);
completeEvent(s,d);assert.equal(s.ackStage,2);assert.deepEqual(s.queuedEvents,[]);

// Higher growth while an older growth card is open remains pending exactly once.
s=initial();d=advance(s,null,car({odometerKm:10300}));takeEvent(s,d);
d=advance(s,d,car({gear:'D',odometerKm:12000}));assert.equal(s.pendingGrowthStage,3);
for(let i=0;i<20;i++)d=advance(s,d,car({gear:'D',odometerKm:12000}));
assert.deepEqual(s.queuedEvents,[]);assert.equal(s.activeEventData.stage,2);
d=advance(s,d,car({odometerKm:12000}));assert.equal(completeEvent(s,d),'growth');
assert.equal(s.ackStage,2);assert.equal(s.activeEventData.stage,3);assert.equal(completeEvent(s,d),null);
assert.equal(s.ackStage,3);assert.equal(s.badges.filter(x=>x==='grow').length,1);

// Legacy saves retain earned queued growth and identity; malformed stage is bounded.
raw=JSON.stringify({baseOdo:10000,ackStage:1,maxDistanceKm:2000,queuedEvents:['growth'],petName:'기존친구',onboardingComplete:true});
s=load();assert.equal(s.pendingGrowthStage,3);assert.equal(s.petName,'기존친구');assert.equal(s.onboardingComplete,true);
raw=JSON.stringify({...s,pendingGrowthStage:99});assert.equal(load().pendingGrowthStage,4);
raw=JSON.stringify({...s,ackStage:3,pendingGrowthStage:-1});assert.equal(load().pendingGrowthStage,3);
console.log('PASS team integration: hold/release, red priority, valid movement badges, pending growth persistence and deduplication');

// Red -> unknown must remain blocked until an explicit valid empty warning list.
let warningState=initial(),warningView=advance(warningState,null,car({safetyWarnings:red}));
assert.equal(warningView.dangerous,true);assert.equal(warningView.parked,false);
for(const invalid of [{safetyWarnings:null},{safetyWarnings:[],dataStatus:{safetyWarnings:'ERROR'}},{safetyWarnings:[],dataStatus:{safetyWarnings:'UNSUPPORTED'}}]){
 warningView=advance(warningState,warningView,car(invalid));
 assert.equal(warningView.warningUnknown,true);assert.equal(warningView.restricted,true);assert.equal(warningView.parked,false);
}
warningView=advance(warningState,warningView,car({safetyWarnings:[],dataStatus:{safetyWarnings:'OK'}}));
assert.equal(warningView.warningUnknown,false);assert.equal(warningView.restricted,false);assert.equal(warningView.parked,true);
const legacyCar=car();delete legacyCar.safetyWarnings;delete legacyCar.dataStatus.safetyWarnings;
assert.equal(derive(legacyCar,initial()).parked,true);
assert.equal(derive({...legacyCar,dataStatus:{safetyWarnings:'ERROR'}},initial()).parked,false);
console.log('PASS warning signal fail-closed: red -> unknown -> valid clear, legacy compatibility');
