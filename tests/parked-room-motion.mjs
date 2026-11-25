import assert from 'node:assert/strict';
import {ParkedRoomMotion,sampleRoomPose} from '../dist/js/parked-room-motion.js';
let now=1000,expiry=0,next=0,pending=new Map(),frames=[],ended=[];
const ctrl=new ParkedRoomMotion({now:()=>now,deadline:()=>expiry,paint:x=>frames.push(x),ended:x=>ended.push(x),
 request:fn=>{pending.set(++next,fn);return next},cancel:id=>pending.delete(id)});
const step=t=>{now=t;const [id,fn]=[...pending][0];pending.delete(id);fn()};
assert.equal(ctrl.start(),false);
expiry=15000;assert.equal(ctrl.start(),true);
step(3250);assert.equal(frames.at(-1).eyelid,3);
step(5708);assert.equal(frames.at(-1).eyelid,3);
ctrl.stop();assert.equal(pending.size,0);assert.deepEqual(frames.at(-1),sampleRoomPose(0));
assert(ctrl.start());step(6000);let stale=[...pending][0][1];expiry=6000;step(6001);assert.deepEqual(ended,[false]);
stale();assert.equal(pending.size,0);
expiry=20000;assert(ctrl.start());step(13001);assert.deepEqual(ended,[false,true]);
console.log('PASS exact two approved eye-smiles, deadline cancellation, stale callback protection and end');
