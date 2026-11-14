import assert from 'node:assert/strict';
import {initial,derive,load,save} from '../dist/js/logic.js';
import {advance,takeEvent,completeEvent,enqueue} from '../dist/js/state-machine.js';
import {baseline,VehicleProvider,ScenarioPlayer,scenes} from '../dist/js/vehicle.js';
let saved='';globalThis.localStorage={getItem:()=>saved,setItem:(k,v)=>saved=v};
let s=initial(),p=new VehicleProvider({...baseline(),rangeRemainingKm:49}),last=derive(p.value,s);
for(const rangeRemainingKm of [80,null,620]){p.set({rangeRemainingKm});last=advance(s,last,p.value,{now:1000})}
assert.deepEqual(s.refuelDetails,{beforeKm:49,afterKm:620});assert.ok(s.items.includes('bowl'));assert.deepEqual(s.badges,['meal']);assert.equal(s.badgeEarnedAt.meal,1000);
assert.equal(takeEvent(s,last),'recovery');assert.equal(takeEvent(s,last),'recovery');save(s);s=load();assert.equal(takeEvent(s,last),'recovery');
assert.deepEqual(s.activeEventData.refuel,{beforeKm:49,afterKm:620});
assert.equal(takeEvent(s,{...last,parked:false}),null);assert.equal(s.activeEvent,'recovery');assert.equal(completeEvent(s,{...last,parked:false}),null);assert.equal(s.activeEvent,'recovery');
assert.equal(completeEvent(s,last),null);assert.equal(takeEvent(s,last),null);
p.set({rangeRemainingKm:621});last=advance(s,last,p.value,{now:2000});assert.deepEqual(s.queuedEvents,[]);assert.equal(s.badgeEarnedAt.meal,1000);
// Latch persists across restarts even when intermediate range is no longer hungry.
s=initial();p=new VehicleProvider({...baseline(),rangeRemainingKm:49});last=derive(p.value,s);p.set({rangeRemainingKm:80});last=advance(s,last,p.value);save(s);s=load();p=new VehicleProvider(s.vehicleSnapshot);last=derive(p.value,s);p.set({rangeRemainingKm:620});advance(s,last,p.value);assert.ok(s.badges.includes('meal'));
// No fake first-drive badge, but a valid driving event earns one.
s=initial();assert.deepEqual(s.badges,[]);advance(s,derive(baseline(),s),baseline());assert.ok(!s.badges.includes('first'));advance(s,derive(baseline(),s),{...baseline(),gear:'D'},{now:3000});assert.equal(s.badgeEarnedAt.first,3000);
// Active growth survives reload, acknowledges original stage, queues higher stage.
s=initial();let d=advance(s,derive(baseline(),s),{...baseline(),odometerKm:10300});assert.equal(takeEvent(s,d),'growth');assert.equal(s.ackStage,1);save(s);s=load();d=advance(s,d,{...baseline(),odometerKm:12000});assert.equal(takeEvent(s,d),'growth');assert.equal(completeEvent(s,d),'growth');assert.equal(s.ackStage,2);assert.equal(s.activeEventData.stage,3);assert.equal(completeEvent(s,d),null);assert.equal(s.ackStage,3);
// Deduplicate active events; pending queue can be restored and activated immediately.
enqueue(s,'summary');save(s);s=load();assert.equal(takeEvent(s,d),'summary');enqueue(s,'summary');assert.deepEqual(s.queuedEvents,[]);
// Reset and seek preserve a predictable next-step cursor.
const called=[];const player=new ScenarioPlayer(i=>called.push(i),()=>{});for(let i=0;i<5;i++)player.step();player.reset();player.step();assert.deepEqual(called,[0,1,2,3,4,0]);player.seek(3);player.step();assert.equal(called.at(-1),3);
// Continuous fixture patches preserve the newly refueled range in S5.
p=new VehicleProvider();for(let i=0;i<5;i++)p.set(scenes[i][3]);assert.equal(p.value.rangeRemainingKm,620);assert.equal(p.value.odometerKm,10300);
console.log('PASS event lifecycle: gradual refuel/reload, reward persistence, active event acknowledgment, higher growth, first drive, reset/seek, continuous fuel');
