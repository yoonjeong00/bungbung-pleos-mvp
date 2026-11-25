import assert from 'node:assert/strict';
import {derive,initial,readValue} from '../dist/js/logic.js';
import {baseline,VehicleProvider,scenes} from '../dist/js/vehicle.js';
let v=baseline(),s=initial();
assert.equal(derive(v,s).parked,true);
for(const gear of ['D','R','N'])assert.equal(derive({...v,gear},s).parked,false);
// Spec 3.1 (2026-11-25): only a missing/stale restriction signal locks. Restricted (true) = drive screen.
assert.equal(derive({...v,uxRestricted:null},s).restricted,true);
assert.equal(derive({...v,uxRestricted:true},s).restricted,false);assert.equal(derive({...v,uxRestricted:true},s).parked,false);
// Ignition is display-only: it never locks and never blocks the parked screen.
assert.equal(derive({...v,ignition:'OFF'},s).restricted,false);assert.equal(derive({...v,ignition:'OFF'},s).parked,true);
assert.equal(derive({...v,odometerKm:10300},s).stage,2);
assert.equal(derive({...v,odometerKm:9999},s).distance,0);
assert.equal(derive({...v,rangeRemainingKm:49},s).hungry,true);
assert.equal(derive({...v,rangeRemainingKm:null},s).hungry,false);
assert.equal(readValue({...v,dataStatus:{rangeRemainingKm:'UNSUPPORTED'}},'rangeRemainingKm'),null);
assert.equal(scenes.length,10);
const provider=new VehicleProvider();provider.set({isMock:false});assert.equal(provider.value.isMock,true);
console.log('12 core contract assertions passed');
