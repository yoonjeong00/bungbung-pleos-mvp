import assert from 'node:assert/strict';
import {initial,derive,readValue} from '../dist/js/logic.js';
import {VehicleProvider,baseline,scenes} from '../dist/js/vehicle.js';
import {advance,takeEvent,completeEvent,enqueue} from '../dist/js/state-machine.js';

// Full chronological mock tour: this proves data/event contracts, not screen rendering.
let s=initial(),p=new VehicleProvider({...baseline(),odometerKm:10000}),d=derive(p.value,s);
const results=[];
for(let i=0;i<scenes.length;i++){
 if(d.parked&&s.activeEvent)completeEvent(s,d);
 p.set(scenes[i][3]);d=advance(s,d,p.value,{now:1000+i});
 if(scenes[i][4])enqueue(s,scenes[i][4]);
 results.push({id:scenes[i][0],parked:d.parked,restricted:d.restricted,hungry:d.hungry,range:d.range,temp:d.temp,event:takeEvent(s,d),ack:s.ackStage});
}
assert.equal(results[0].event,'birth');
assert.equal(results[1].parked,false);assert.equal(results[1].ack,1);
assert.equal(results[2].hungry,true);
assert.equal(results[3].event,'recovery');assert.equal(results[3].range,620);
assert.equal(results[4].event,'growth');assert.equal(results[4].ack,1);
assert.equal(results[5].ack,2);assert.equal(results[5].temp,-3);
assert.equal(results[6].parked,false);
assert.equal(results[7].restricted,true);assert.equal(results[7].event,null);
assert.equal(results[8].range,null);assert.equal(results[8].hungry,false);
assert.equal(results[9].event,'summary');
assert.equal(completeEvent(s,d),null);
assert.deepEqual(s.queuedEvents,[]);
assert.deepEqual(s.badges,['first','meal','grow','cold']);

// Repeated provider notifications cannot repeatedly grant a queued growth.
s=initial();p=new VehicleProvider({...baseline(),gear:'D',odometerKm:10300});d=derive(p.value,s);
for(let i=0;i<50;i++)d=advance(s,d,p.value);
assert.deepEqual(s.queuedEvents,['growth']);assert.equal(s.ackStage,1);assert.equal(takeEvent(s,d),null);
p.set({gear:'P'});d=advance(s,d,p.value);assert.equal(takeEvent(s,d),'growth');completeEvent(s,d);
for(let i=0;i<50;i++)d=advance(s,d,p.value);
assert.deepEqual(s.queuedEvents,[]);assert.equal(s.badges.filter(x=>x==='grow').length,1);assert.equal(s.ackStage,2);

// Invalid provider input is never coerced to plausible zero values.
for(const key of ['odometerKm','tripDistanceKm','tripTimeMin','rangeRemainingKm','outsideTempC']){
 for(const value of [NaN,Infinity,'0',{},null]){
  p.set({[key]:value});assert.equal(readValue(p.value,key),null,`${key}: ${String(value)}`);
 }
}
for(const gear of ['D','R','N'])assert.equal(derive({...baseline(),gear},initial()).parked,false);
console.log('PASS S1–S10 data/event contracts, repeat-event deduplication, invalid numeric inputs');
