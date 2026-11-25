// N11·N12: fake bridge packets (docs/VEHICLE_BRIDGE_CONTRACT.md ch.2) against the web side.
import assert from 'node:assert/strict';
import {VehicleProvider,baseline,bridgePatch,originOf,usesMockData,vehicleKeys} from '../dist/js/vehicle.js';
import {derive,initial,readValue,signalValid} from '../dist/js/logic.js';
import {advance} from '../dist/js/state-machine.js';
import {distanceStatus,isOdometerPacket,mountDistanceMonitor} from '../dist/js/sdk-distance.js';
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS',name)};
const now=Date.now();
const base={source:'pleos-sdk',state:'live',connected:true,supported:true,access:'READ',receivedAt:now,updates:1,valueChanges:0,via:'read'};
const odoPacket={...base,item:'odometerKm',status:'OK',odometerKm:10180.5};
const legacyOdo={...base,odometerKm:10180.5}; // today's packet: no item, no status
const gearPacket={...base,source:'pleos-sdk',item:'gear',status:'OK',gear:'D',odometerKm:undefined};
const feed=(provider,packet)=>{const b=bridgePatch(packet);assert.ok(b,'packet accepted');provider.set(b.patch,true,{origin:b.origin,receivedAt:b.receivedAt});return b};

// ---- N11: per-item real/mock ----
test('Real ODO + mock gear: each item keeps its own origin',()=>{
 const p=new VehicleProvider();feed(p,odoPacket);p.set({gear:'D'});const v=p.value;
 assert.equal(originOf(v,'odometerKm'),'real');
 assert.equal(originOf(v,'gear'),'mock');
 assert.equal(originOf(v,'rangeRemainingKm'),'mock');
 assert.equal(v.odometerKm,10180.5,'decimal km kept');
 assert.equal(v.receivedAt.odometerKm,now,'real item keeps the bridge receive time');
 assert.equal(v.isMock,false,'not every item is mock any more');
 assert.equal(usesMockData(v),true,'mock-data label must stay on while a mock item is used');
});
test('Mock items stay valid while a real item is checked for freshness',()=>{
 const p=new VehicleProvider();feed(p,{...base,source:'aaos-car',item:'uxRestricted',status:'OK',uxRestricted:false});
 const v=p.value,later=now+20000;
 assert.equal(signalValid(v,'uxRestricted',now),true);
 assert.equal(signalValid(v,'uxRestricted',later),false,'real signal older than 15 s expires');
 assert.equal(signalValid(v,'gear',later),true,'mock gear is not treated as a stale real value');
 assert.equal(signalValid(v,'ignition',later),true);
 assert.equal(derive(v,initial()).parked,true);
});
test('Mixed values: a real restriction signal still blocks the screen',()=>{
 const p=new VehicleProvider();feed(p,{...base,source:'aaos-car',item:'uxRestricted',status:'OK',uxRestricted:true});
 assert.equal(derive(p.value,initial()).restricted,true);
});
test('Non-OK packet: value null, status kept, receive time not refreshed, screen blocked',()=>{
 const p=new VehicleProvider();const b=feed(p,{...base,source:'aaos-car',item:'gear',status:'NO_PERMISSION',gear:'D',receivedAt:0,state:'error'});
 const v=p.value;
 assert.deepEqual(b.patch,{gear:null,dataStatus:{gear:'NO_PERMISSION'}});
 assert.equal(v.gear,null);assert.equal(v.dataStatus.gear,'NO_PERMISSION');assert.equal(v.receivedAt.gear,0);
 assert.equal(originOf(v,'gear'),'real');
 assert.equal(derive(v,initial()).restricted,true);
});
test('OK packet with an out-of-range value becomes ERROR, not a number',()=>{
 const p=new VehicleProvider();feed(p,{...odoPacket,odometerKm:-5});
 assert.equal(p.value.dataStatus.odometerKm,'ERROR');assert.equal(readValue(p.value,'odometerKm'),null);
});
test('Every item real: no mock data in use',()=>{
 const p=new VehicleProvider();
 for(const key of vehicleKeys)p.set(key==='safetyWarnings'?{safetyWarnings:[]}:{[key]:baseline()[key]},false,{origin:'real',receivedAt:now});
 assert.equal(usesMockData(p.value),false);assert.equal(p.value.isMock,false);
});
test('Demo patches after a real packet mark that item mock again',()=>{
 const p=new VehicleProvider();feed(p,odoPacket);p.set({odometerKm:12000});
 assert.equal(originOf(p.value,'odometerKm'),'mock');assert.equal(p.value.isMock,true);
});

// ---- Save format unchanged ----
test('Saved snapshot has no origin and the same keys as before',()=>{
 const p=new VehicleProvider(),s=initial(),v=p.value;advance(s,derive(v,s),v);
 assert.equal(Object.hasOwn(s.vehicleSnapshot,'origin'),false);
 const {origin,...expected}=v;assert.deepEqual(s.vehicleSnapshot,expected);
 assert.equal(s.vehicleSnapshot.isMock,true,'mock-only snapshot still passes load (isMock:true)');
});
test('Old snapshot without origin restores as all-mock',()=>{
 const old={...baseline(),gear:'D',odometerKm:10300};delete old.origin;
 const v=new VehicleProvider(old).value;
 assert.ok(vehicleKeys.every(k=>originOf(v,k)==='mock'));assert.equal(v.isMock,true);assert.equal(v.gear,'D');
 assert.equal(originOf({...baseline()},'gear'),'mock','plain fixture objects (isMock:true) count as mock');
 assert.equal(originOf({gear:'P',isMock:false},'gear'),'real','isMock:false without origin keeps the old real meaning');
});

// ---- Legacy packet compatibility ----
test('Legacy ODO packet (no item/status) is read as ODO',()=>{
 const b=bridgePatch(legacyOdo);assert.equal(b.item,'odometerKm');assert.deepEqual(b.patch,{odometerKm:10180.5});
 assert.equal(bridgePatch({...legacyOdo,state:'stopped',odometerKm:null}).patch.dataStatus.odometerKm,'LOADING');
 assert.equal(bridgePatch({...legacyOdo,state:'unsupported'}).patch.dataStatus.odometerKm,'UNSUPPORTED');
 assert.equal(bridgePatch({...legacyOdo,state:'error'}).patch.dataStatus.odometerKm,'ERROR');
 assert.equal(bridgePatch({...legacyOdo,supported:false}).patch.dataStatus.odometerKm,'ERROR');
});
test('Unknown items and safety warnings are not taken from the bridge',()=>{
 assert.equal(bridgePatch({...base,item:'speedKmh',speedKmh:30,status:'OK'}),null);
 assert.equal(bridgePatch({...base,item:'safetyWarnings',safetyWarnings:[],status:'OK'}),null,'safety stays mock (OEM-only permission)');
 assert.equal(bridgePatch(null),null);assert.equal(bridgePatch([]),null);
});

// ---- N12: ODO panel reads only ODO packets ----
test('ODO panel: gear packet is not an ODO error',()=>{
 assert.equal(isOdometerPacket(gearPacket),false);
 assert.equal(distanceStatus(gearPacket,now).state,'waiting','another item must not show as an ODO error');
 assert.equal(distanceStatus(odoPacket,now).value,'10,180.5');
 assert.equal(distanceStatus(legacyOdo,now).value,'10,180.5','legacy packet still shows');
});
test('ODO panel keeps the last ODO value when a gear packet arrives',()=>{
 const listeners={},nodes={};
 const el=()=>({dataset:{},textContent:'',setAttribute(){},querySelector(sel){return nodes[sel]??=el()}});
 const panel=el();panel.querySelector=sel=>nodes[sel]??=el();
 const doc={querySelector:sel=>sel==='.app-demo-bar'?{after(){}}:null,createElement:()=>panel};
 const win={__bungbungVehicle:legacyOdo,addEventListener:(t,fn)=>listeners[t]=fn,setInterval:()=>1,clearInterval(){}};
 mountDistanceMonitor(doc,win);
 assert.equal(nodes['#sdk-distance'].textContent,'10,180.5','legacy global is read on mount');
 listeners['bungbung-vehicle']({detail:{...odoPacket,odometerKm:10200}});
 assert.equal(nodes['#sdk-distance'].textContent,'10,200');
 listeners['bungbung-vehicle']({detail:gearPacket});
 assert.equal(nodes['#sdk-distance'].textContent,'10,200','gear packet ignored');assert.equal(panel.dataset.state,'live');
});
test('ODO panel prefers the per-item snapshot over the legacy global',()=>{
 const nodes={},panel={dataset:{},setAttribute(){},querySelector:sel=>nodes[sel]??={textContent:''}};
 const win={__bungbungVehicleItems:{odometerKm:{...odoPacket,odometerKm:11000},gear:gearPacket},__bungbungVehicle:legacyOdo,addEventListener(){},setInterval:()=>1};
 mountDistanceMonitor({querySelector:sel=>sel==='.app-demo-bar'?{after(){}}:null,createElement:()=>panel},win);
 assert.equal(nodes['#sdk-distance'].textContent,'11,000');
});
console.log(`${checks} vehicle bridge checks passed (N11 per-item origin, N12 ODO item filter, legacy packets)`);
