import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {distanceStatus} from '../../dist/js/sdk-distance.js';

const scripts = readFileSync(0, 'utf8').trim().split('\n');
assert.equal(scripts.length, 3);
const page = 'https://appassets.androidplatform.net/assets/index.html?android=1';
const trace = [];
const window = {dispatchEvent(event) {
  trace.push([event.type, event.detail, Object.keys(window.__bungbungVehicleItems)]);
}};
const context = vm.createContext({window, location: {href: 'https://example.invalid/'}, CustomEvent:
  class { constructor(type, {detail}) {Object.assign(this,{type,detail});} }});
vm.runInContext(scripts[0], context);
assert.equal(trace.length, 0);
context.location.href = page;
vm.runInContext(scripts[0], context);
assert.equal(trace.length, 2);
for (const [event,,keys] of trace) {
  assert.equal(event,'bungbung-vehicle');
  assert.deepEqual(Array.from(keys).sort(),['odometerKm','uxRestricted']);
}
assert.equal(trace[0][1].odometerKm,2.5);
assert.equal(trace[1][1].uxRestricted,false);
assert.equal(window.__bungbungVehicle.odometerKm,2.5);
assert.equal(distanceStatus(window.__bungbungVehicle,1003).state,'live');
vm.runInContext(scripts[1], context);
assert.equal(trace.length,3);
assert.equal(trace[2][1].item,'uxRestricted');
assert.equal(window.__bungbungVehicleItems.uxRestricted.uxRestricted,null);
assert.equal(window.__bungbungVehicleItems.uxRestricted.status,'LOADING');
assert.equal(window.__bungbungVehicle.odometerKm,2.5);
const cached=window.__bungbungVehicleItems;
delete window.__bungbungVehicleItems;
delete window.__bungbungVehicle;
vm.runInContext(scripts[2],context);
assert.equal(window.__bungbungVehicleItems.uxRestricted.state,'stopped');
assert.equal(window.__bungbungVehicleItems.odometerKm.odometerKm,cached.odometerKm.odometerKm);
console.log('PASS native packet store to JS: latest per item, full pre-event snapshot, reload, legacy ODO, stopped null, exact page guard');
