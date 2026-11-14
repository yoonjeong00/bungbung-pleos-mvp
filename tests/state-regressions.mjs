import assert from 'node:assert/strict';
import {derive,initial,load,save,readValue} from '../dist/js/logic.js';
import {baseline,VehicleProvider} from '../dist/js/vehicle.js';
import {advance,takeEvent,completeEvent} from '../dist/js/state-machine.js';
import {roomScreen} from '../dist/js/room-ui.js';
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name)}
test('Bad control signals fail closed',()=>{for(const k of ['gear','ignition','uxRestricted'])for(const status of ['ERROR','UNSUPPORTED','NO_PERMISSION','LOADING'])assert.equal(derive({...baseline(),dataStatus:{[k]:status}},initial()).parked,false)});
test('Live stale signals fail closed',()=>assert.equal(derive({...baseline(),isMock:false,receivedAt:{gear:0,ignition:0,uxRestricted:0}},initial()).restricted,true));
test('Invalid numeric values are unavailable',()=>{assert.equal(readValue({...baseline(),rangeRemainingKm:-20},'rangeRemainingKm'),null);assert.equal(readValue({...baseline(),outsideTempC:90},'outsideTempC'),null)});
test('Adult does not regress when provider reports older ODO',()=>assert.equal(derive(baseline(),{...initial(),ackStage:4,maxDistanceKm:6000}).stage,4));
test('Refuel and growth both survive, in order',()=>{const s=initial(),before=derive({...baseline(),gear:'D',odometerKm:10299,rangeRemainingKm:49},s);const d=advance(s,before,{...baseline(),odometerKm:10300,rangeRemainingKm:620});assert.deepEqual(s.queuedEvents,['recovery','growth']);assert.equal(takeEvent(s,d),'recovery');assert.equal(takeEvent(s,d),'recovery');assert.equal(completeEvent(s,d),'growth');assert.equal(completeEvent(s,d),null)});
test('Fixture reset does not grant meal reward',()=>{const s=initial();advance(s,derive({...baseline(),rangeRemainingKm:49},s),baseline(),{detect:false});assert.equal(s.badges.includes('meal'),false);assert.deepEqual(s.queuedEvents,[])});
test('Queue stays pending while driving',()=>{const s={...initial(),queuedEvents:['recovery']};assert.equal(takeEvent(s,derive({...baseline(),gear:'D'},s)),null);assert.deepEqual(s.queuedEvents,['recovery'])});
test('Storage restores the mock vehicle and growth',()=>{let data='';globalThis.localStorage={getItem:()=>data,setItem:(k,v)=>data=v};const s=initial();advance(s,derive(baseline(),s),{...baseline(),odometerKm:16000});takeEvent(s,derive(s.vehicleSnapshot,s));save(s);const restored=load();assert.equal(derive(new VehicleProvider(restored.vehicleSnapshot).value,restored).stage,4)});
test('All room panels render with unavailable data and poses',()=>{for(const tab of ['home','food','music','shop','level'])for(const previewMood of ['idle','hungry','recovery','music','rain']){const s=initial(),d=derive({...baseline(),rangeRemainingKm:null,odometerKm:null},s);const markup=roomScreen(d,s,{tab,previewMood,previewStage:3,previewHat:'none',pose:'idle',bubble:''},'');assert.ok(markup.includes('room-layout'));assert.ok(!markup.includes('NaN'));assert.ok(!markup.includes('undefined'));assert.equal((markup.match(/data-room-tab=/g)||[]).length>=5,true)}});
test('Team 2 handoff: movement required for drive badges, restricted distance hold, duplicate suppression',()=>{
 const s=initial();
 // Shifting to D at 0 distance and 0 trip does not grant first/cold badges
 let d=advance(s,derive(baseline(),s),{...baseline(),gear:'D',odometerKm:10000,tripDistanceKm:0,outsideTempC:-3});
 assert.equal(s.badges.includes('first'),false);
 assert.equal(s.badges.includes('cold'),false);
 // Actual movement in cold weather grants both first and cold badges
 d=advance(s,d,{...baseline(),gear:'D',odometerKm:10010,tripDistanceKm:10,outsideTempC:-3});
 assert.equal(s.badges.includes('first'),true);
 assert.equal(s.badges.includes('cold'),true);
 // Restricted state holds distance at last valid maxDistanceKm and queues nothing
 d=advance(s,d,{...baseline(),gear:'P',uxRestricted:true,odometerKm:10500});
 assert.equal(d.distance,10);
 assert.equal(s.maxDistanceKm,10);
 assert.deepEqual(s.queuedEvents,[]);
 // Clearing restriction applies accumulated ODO and queues growth once
 d=advance(s,d,{...baseline(),gear:'P',uxRestricted:false,odometerKm:10500});
 assert.equal(d.distance,500);
 assert.equal(s.maxDistanceKm,500);
 assert.deepEqual(s.queuedEvents,['growth']);
 // Duplicate same-stage update does not duplicate growth event
 d=advance(s,d,{...baseline(),gear:'P',uxRestricted:false,odometerKm:10550});
 assert.deepEqual(s.queuedEvents,['growth']);
});
console.log(`${checks} regression groups passed`);