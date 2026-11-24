import assert from 'node:assert/strict';
import {derive,initial,load,stages} from '../dist/js/logic.js';
import {advance} from '../dist/js/state-machine.js';
import {baseline,FUEL_THRESHOLDS,TEMP_THRESHOLDS} from '../dist/js/vehicle.js';

// Threshold contract (spec 5.1, 6.1). These pin today's values so a change in one place
// without the others is caught. Screen-level boundaries are checked in hmi-integration.mjs.

// Constants in vehicle.js
assert.equal(FUEL_THRESHOLDS.lowFuelKm,50,'low fuel below 50km');
assert.equal(FUEL_THRESHOLDS.hungryKm,150,'hungry below 150km');
assert.equal(FUEL_THRESHOLDS.refuelJumpKm,100,'refuel detected at +100km');
assert.equal(FUEL_THRESHOLDS.refuelShowMs,10000,'refuel shown for 10s');
assert.equal(TEMP_THRESHOLDS.coldMaxC,3,'cold at or below 3°');
assert.equal(TEMP_THRESHOLDS.hotMinC,30,'hot at or above 30°');

// logic.js d.hungry (used by parked screens and refuel recovery) still uses 50km.
const car=patch=>({...baseline(),gear:'P',...patch});
assert.equal(derive(car({rangeRemainingKm:49}),initial()).hungry,true,'49km is low fuel in logic.js');
assert.equal(derive(car({rangeRemainingKm:50}),initial()).hungry,false,'50km is not low fuel in logic.js');
assert.equal(derive(car({rangeRemainingKm:49}),initial()).hungry,49<FUEL_THRESHOLDS.lowFuelKm,'logic.js 50 matches FUEL_THRESHOLDS.lowFuelKm');

// Growth stages: distance = odometer - baseOdo (initial baseOdo 10000).
const s=initial();
const stageAt=km=>derive(car({odometerKm:s.baseOdo+km}),initial()).stage;
const name=km=>stages[stageAt(km)].name;
for(const [km,expected] of [[0,'아기'],[299,'아기'],[300,'어린이'],[1999,'어린이'],[2000,'청소년'],[5999,'청소년'],[6000,'어른']])
 assert.equal(name(km),expected,`${km}km is ${expected}`);
// The stage list and the calculation agree on every boundary.
for(const n of [2,3,4]){
 assert.equal(stageAt(stages[n].km),n,`stages[${n}].km reaches stage ${n}`);
 assert.equal(stageAt(stages[n].km-1),n-1,`one km before stages[${n}].km is stage ${n-1}`);
}

// Refuel recovery (state-machine.js) uses FUEL_THRESHOLDS: low below 50km, then +100km.
const recovered=(low,high)=>{const st=initial();let d=advance(st,null,car({gear:'D',rangeRemainingKm:low}));advance(st,d,car({gear:'D',rangeRemainingKm:high}));return st.queuedEvents.includes('recovery')&&st.badges.includes('meal');};
assert.equal(recovered(49,149),true,'49km then +100km recovers');
assert.equal(recovered(49,148),false,'49km then +99km does not recover');
assert.equal(recovered(50,150),false,'starting at 50km is not low fuel, so no recovery');

// load() keeps a saved low-fuel latch only below FUEL_THRESHOLDS.lowFuelKm (same as the old literal 50).
const savedLatch=km=>{const store=new Map([['bungbung-v1',JSON.stringify({...initial(),onboardingComplete:true,lowRangeKm:km})]]);globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};return load().lowRangeKm;};
assert.equal(savedLatch(45),45,'saved 45km latch is kept');
assert.equal(savedLatch(49),49,'saved 49km latch is kept');
assert.equal(savedLatch(50),null,'saved 50km latch is dropped');
assert.equal(savedLatch(55),null,'saved 55km latch is dropped');

// Cold-day badge (spec 7.3 / 13.3 N2): only while actually driving, at or below TEMP_THRESHOLDS.coldMaxC.
const coldBadge=(gear,temp)=>{const st=initial();advance(st,null,car({gear,outsideTempC:temp}),{now:1});return st.badges.includes('cold');};
assert.equal(coldBadge('D',3),true,'driving at 3° earns the cold badge');
assert.equal(coldBadge('D',-3),true,'driving at -3° earns the cold badge');
assert.equal(coldBadge('D',4),false,'driving at 4° does not');
assert.equal(coldBadge('P',-3),false,'parked at -3° does not');
{
 const st=initial();
 advance(st,null,car({gear:'D',outsideTempC:3}),{now:1});
 const earnedAt=st.badgeEarnedAt.cold,scarves=st.items.filter(x=>x==='scarf').length;
 advance(st,null,car({gear:'D',outsideTempC:-5}),{now:2});
 assert.equal(st.badges.filter(x=>x==='cold').length,1,'the cold badge is not given twice');
 assert.equal(st.badgeEarnedAt.cold,earnedAt,'the first earned time is kept');
 assert.equal(st.items.filter(x=>x==='scarf').length,scarves,'the scarf is not added twice');
}

console.log('PASS thresholds: fuel 50/150, refuel 100km/10s, temp 3/30, growth 300/2000/6000 boundaries');
