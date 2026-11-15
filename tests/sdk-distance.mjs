import assert from 'node:assert/strict';
import {distanceStatus} from '../dist/js/sdk-distance.js';
const now=100000;
const live={source:'pleos-sdk',state:'live',connected:true,supported:true,access:'READ',odometerKm:1234.5,receivedAt:now,via:'listener',updates:2};
assert.equal(distanceStatus(live,now).value,'1,234.5');
assert.equal(distanceStatus({...live,odometerKm:1235},now).value,'1,235');
assert.equal(distanceStatus(live,now+45001).state,'stale');
for(const p of [{...live,source:'mock'},{...live,odometerKm:null},{...live,odometerKm:-1},{...live,odometerKm:NaN},{...live,state:'error'},{...live,state:'stopped'},{...live,supported:false},{...live,connected:false}])assert.equal(distanceStatus(p,now).value,'—');
assert.equal(distanceStatus(live,now).via,'변경 알림');
assert.equal(distanceStatus({...live,via:'read'},now).via,'현재 값 조회');
console.log('PASS SDK monitor: live updates, stale/null/error masking, source separation');

// Listener deliveries can repeat one value: never label them as value changes.
assert.equal(distanceStatus({...live,updates:49,valueChanges:0,odometerKm:0},now).updates,49);
assert.equal(distanceStatus({...live,updates:49,valueChanges:0,odometerKm:0},now).valueChanges,0);
assert.equal(distanceStatus({...live,valueChanges:1},now).valueChanges,1);
assert.equal(distanceStatus(live,now).valueChanges,null);
assert.equal(distanceStatus({...live,odometerKm:null},now).state,'error');
assert.equal(distanceStatus({...live,connected:false},now).state,'error');
assert.equal(distanceStatus({...live,receivedAt:now+5001},now).value,'—');
assert.equal(distanceStatus({...live,receivedAt:now-45000},now).state,'stale');
assert.equal(distanceStatus({...live,updates:-1,valueChanges:-2},now).valueChanges,null);
console.log('PASS SDK counter semantics and invalid live state');
