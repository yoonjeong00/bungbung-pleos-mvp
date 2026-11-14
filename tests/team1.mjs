import assert from 'node:assert/strict';
import {VehicleProvider,ScenarioPlayer,scenes,baseline} from '../dist/js/vehicle.js';
import {PresentationController} from '../dist/js/presentation.js';
import {derive,initial} from '../dist/js/logic.js';
import {advance,takeEvent,completeEvent} from '../dist/js/state-machine.js';
const p=new VehicleProvider();let calls=0;const off=p.subscribe(()=>calls++);
p.set({gear:'bad',rangeRemainingKm:-1});assert.equal(derive(p.value,initial()).restricted,true);assert.equal(p.value.rangeRemainingKm,null);
p.set({gear:'P',rangeRemainingKm:0});assert.equal(p.value.rangeRemainingKm,0);assert.equal(p.value.dataStatus.rangeRemainingKm,'OK');
p.set({outsideTempC:null,dataStatus:{outsideTempC:'UNSUPPORTED'}});assert.equal(p.value.outsideTempC,null);assert.equal(p.value.dataStatus.outsideTempC,'UNSUPPORTED');
const copy=p.value;copy.gear='D';assert.equal(p.value.gear,'P');off();const n=calls;p.set({gear:'P'});assert.equal(calls,n);
const callbacks=[];let completed=0,changes=[];const motion=new PresentationController({schedule:fn=>{callbacks.push(fn);return callbacks.length},cancel:()=>{},onChange:a=>changes.push(a),onComplete:()=>completed++});
assert.equal(motion.start('joy'),false);motion.setParked(true);motion.start('walking');motion.setParked(false);callbacks[0]();assert.equal(completed,0);assert.equal(motion.active,null);
motion.setParked(true);motion.start('joy');motion.start('walking');callbacks[1]();assert.equal(completed,0);callbacks[2]();assert.equal(completed,1);
let pending=[],indices=[];const player=new ScenarioPlayer(i=>indices.push(i),()=>{},{schedule:fn=>{pending.push(fn);return pending.length},cancel:()=>{}});
player.play();assert.deepEqual(indices,[0]);player.pause();pending[0]();assert.deepEqual(indices,[0]);player.resume();assert.deepEqual(indices,[0,1]);player.step();assert.deepEqual(indices,[0,1,2]);pending[1]();assert.deepEqual(indices,[0,1,2]);
// End-to-end chronological S1–S5: rewards arise from TEAM 2 logic, not fixture rewards.
let s=initial(),last=derive(baseline(),s),events=[];
const vehicle=new VehicleProvider();
for(let i=0;i<5;i++){vehicle.set({...baseline(),...scenes[i][3]});const d=advance(s,last,vehicle.value,{detect:i!==0});const event=takeEvent(s,d);if(event){events.push(event);completeEvent(s,d)}last=d;}
assert.deepEqual(events,['recovery','growth']);assert.equal(s.ackStage,2);assert.ok(s.badges.includes('meal'));assert.ok(s.badges.includes('grow'));
// Motion cannot run under any restricted / invalid / non-P fixture.
for(const patch of [{gear:'D'},{gear:'N'},{gear:'R'},{uxRestricted:null},{uxRestricted:true},{ignition:'OFF'},{dataStatus:{gear:'ERROR'}}]){const d=derive({...baseline(),...patch},initial());motion.setParked(d.parked);assert.equal(motion.start('joy'),false);}
console.log('PASS: provider validation/isolation, unsubscribe, pause/resume/step cancellation, presentation interruption, S1–S5 recovery/growth, fail-closed motion');
