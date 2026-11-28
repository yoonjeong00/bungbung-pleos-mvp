// Web connector (VEHICLE_BRIDGE_CONTRACT.md 3장): modes, receiving, expiry timer, screen decision, saving.
// Decisions 2026-11-25: lock only when the restriction signal is missing/stale; restricted → drive screen;
// parked only with "not restricted" + gear P; ignition is display-only; ODO is remembered, not used for growth.
import assert from 'node:assert/strict';
import {VehicleProvider,baseline,originOf,usesMockData,vehicleKeys} from '../dist/js/vehicle.js';
import {derive,initial,signalValid,REAL_MAX_AGE_MS} from '../dist/js/logic.js';
import {advance} from '../dist/js/state-machine.js';
import {createLiveConnector,HELD_ITEMS} from '../dist/js/vehicle-live.js';
import {signalStatus} from '../dist/js/sdk-distance.js';
let checks=0;const test=async(name,fn)=>{await fn();checks++;console.log('PASS',name)};
let clock=1_764_000_000_000;const realNow=Date.now;Date.now=()=>clock;
const pk=(item,value,{status='OK',at=clock}={})=>({item,[item]:status==='OK'?value:null,status,source:item==='odometerKm'?'pleos-sdk':'aaos-car',state:status==='OK'?'live':'error',connected:true,supported:status==='OK',receivedAt:status==='OK'?at:0,via:'read'});
const liveProvider=()=>{const p=new VehicleProvider();p.startLive(false);return p};
const real=(p,item,value,opt)=>{const c=createLiveConnector({win:{addEventListener(){}},provider:p,isLive:()=>true,setTimer:()=>0,clearTimer(){}});c.accept(pk(item,value,opt),{notify:false});return p.value};

// ---- 1. Live start: no mock defaults ----
await test('Live start: every item real and unknown, no mock values, no warning item',()=>{
 const v=liveProvider().value;
 for(const k of vehicleKeys.filter(k=>k!=='safetyWarnings')){assert.equal(v[k],null,k);assert.equal(v.dataStatus[k],'LOADING',k);assert.equal(originOf(v,k),'real',k);}
 assert.equal(Object.hasOwn(v,'safetyWarnings'),false,'safety warnings need an OEM permission: not part of live mode');
 assert.equal(usesMockData(v),false);
 const d=derive(v,initial());assert.equal(d.restricted,true,'no restriction signal yet → lock');assert.equal(d.warningUnknown,false);assert.equal(d.parked,false);
});

// ---- 2. Screen decision (spec 3.1, decided 2026-11-25) ----
await test('No restriction signal → lock',()=>{const p=liveProvider();real(p,'gear','P');assert.equal(derive(p.value,initial()).restricted,true)});
await test('Restricted + no gear → drive screen (not lock, not parked)',()=>{
 const p=liveProvider();const d=derive(real(p,'uxRestricted',true),initial());
 assert.equal(d.restricted,false);assert.equal(d.parked,false);
});
await test('Not restricted + no gear → NOT the parked screen (drive screen)',()=>{
 const p=liveProvider();const d=derive(real(p,'uxRestricted',false),initial());
 assert.equal(d.restricted,false);assert.equal(d.parked,false);
});
await test('Not restricted + gear P → parked; any other gear → drive',()=>{
 const p=liveProvider();real(p,'uxRestricted',false);
 assert.equal(derive(real(p,'gear','P'),initial()).parked,true);
 for(const g of ['D','R','N'])assert.equal(derive(real(p,'gear',g),initial()).parked,false,g);
});
await test('Restricted + gear P → still drive screen (restriction wins, never parked)',()=>{
 const p=liveProvider();real(p,'uxRestricted',true);assert.equal(derive(real(p,'gear','P'),initial()).parked,false);
});
await test('Gear is never used to guess the restriction: not restricted + D is drive, not lock',()=>{
 const p=liveProvider();real(p,'uxRestricted',false);const d=derive(real(p,'gear','D'),initial());
 assert.equal(d.restricted,false);assert.equal(d.parked,false);
});
await test('Ignition is display-only: missing/OFF/error never locks or blocks parking',()=>{
 const p=liveProvider();real(p,'uxRestricted',false);real(p,'gear','P');
 assert.equal(derive(p.value,initial()).parked,true,'ignition still LOADING');
 assert.equal(derive(real(p,'ignition','OFF'),initial()).parked,true);
 assert.equal(derive(real(p,'ignition',null,{status:'NO_PERMISSION'}),initial()).parked,true);
 assert.equal(signalStatus('ignition',pk('ignition','OFF'),clock),'OFF (0초 전)','shown in the SDK panel');
});
await test('Restriction status not OK → lock',()=>{
 for(const status of ['LOADING','NO_PERMISSION','UNSUPPORTED','ERROR']){const p=liveProvider();real(p,'gear','P');assert.equal(derive(real(p,'uxRestricted',null,{status}),initial()).restricted,true,status)}
});

// ---- 2b. Growth pause (spec 6.2): only "restriction signal missing/stale" or "red warning" ----
await test('Live: restricted (true) + real signal keeps arriving → distance keeps growing (mock ODO, calculation only)',()=>{
 const p=liveProvider();const c=createLiveConnector({win:{addEventListener(){},removeEventListener(){}},provider:p,isLive:()=>true,setTimer:()=>0,clearTimer(){}});
 const s={...initial(),baseOdo:10000};let d=null;
 for(const odo of [10000,10120,10250,10320]){
  clock+=5000;c.accept(pk('uxRestricted',true));            // Java re-reads every 5 s: still restricted
  p.set({odometerKm:odo},false);                              // mock ODO (real ODO is not used for growth yet)
  d=advance(s,d,p.value);
  assert.equal(d.distanceHold,false,`${odo}: restricted must not pause growth`);
  assert.equal(d.parked,false,'still the drive screen');assert.equal(d.distance,odo-10000);
 }
 assert.equal(s.maxDistanceKm,320);assert.equal(d.stage,2,'reached 어린이 (300 km) while restricted');
});
await test('Growth pauses only for a missing/stale restriction signal or a red warning',()=>{
 const s={...initial(),baseOdo:10000,maxDistanceKm:100};
 const odo=(p,km)=>{p.set({odometerKm:km},false);return p.value};
 let p=liveProvider();assert.equal(derive(odo(p,10300),s).distanceHold,true,'no restriction signal yet');
 p=liveProvider();real(p,'uxRestricted',true);const v=odo(p,10300);
 assert.equal(derive(v,s).distanceHold,false);assert.equal(derive(v,s).distance,300);
 const later={...v};assert.equal(signalValid(later,'uxRestricted',clock+16000),false);
 Date.now=()=>clock+16000;assert.equal(derive(later,s).distanceHold,true,'stale after 15 s');assert.equal(derive(later,s).distance,100,'held at max');Date.now=()=>clock;
 const red=new VehicleProvider();red.set({odometerKm:10300,safetyWarnings:[{id:'brake',level:'red',label:'브레이크'}]},false);
 assert.equal(derive(red.value,s).distanceHold,true,'red warning');
 const bad=new VehicleProvider();bad.set({odometerKm:10300,safetyWarnings:'broken'},false);const db=derive(bad.value,s);
 assert.equal(db.warningUnknown,true);assert.equal(db.restricted,true,'unknown warning data still locks the screen');
 assert.equal(db.distanceHold,false,'…but does not pause growth');assert.equal(db.parked,false);
 const yellow=new VehicleProvider();yellow.set({odometerKm:10300,safetyWarnings:[{id:'tire',level:'yellow',label:'타이어'}],tireWarning:true},false);
 assert.equal(derive(yellow.value,s).distanceHold,false,'yellow/tire warnings never pause growth');
});

// ---- 3. Time: 15 s safety signals, 45 s ODO ----
await test('Restriction signal expires after 15 s; 14 s is still valid',()=>{
 assert.equal(REAL_MAX_AGE_MS.default,15000);
 const p=liveProvider();const v=real(p,'uxRestricted',false);
 assert.equal(signalValid(v,'uxRestricted',clock+14000),true);
 assert.equal(signalValid(v,'uxRestricted',clock+15001),false);
});
await test('ODO uses 45 s',()=>{
 assert.equal(REAL_MAX_AGE_MS.odometerKm,45000);
 const p=liveProvider();p.set({odometerKm:10180},false,{origin:'real',receivedAt:clock});const v=p.value;
 assert.equal(signalValid(v,'odometerKm',clock+44000),true);assert.equal(signalValid(v,'odometerKm',clock+45001),false);
});

// ---- 4. Connector: receiving, order, demo, ODO held ----
const fakeWin=(extra={})=>{const l={};return {l,addEventListener:(t,fn)=>l[t]=fn,removeEventListener(){},...extra}};
await test('Start reads the per-item snapshot first, legacy ODO global only when the snapshot has no ODO',()=>{
 const p=liveProvider();const win=fakeWin({__bungbungVehicleItems:{uxRestricted:pk('uxRestricted',false),odometerKm:pk('odometerKm',12000)},__bungbungVehicle:{...pk('odometerKm',11000),item:undefined}});
 const c=createLiveConnector({win,provider:p,isLive:()=>true,setTimer:()=>0,clearTimer(){}});c.start();
 assert.equal(p.value.uxRestricted,false);assert.equal(c.remembered('odometerKm').patch.odometerKm,12000);
 assert.equal(typeof win.l['bungbung-vehicle'],'function','listens for later packets');
 const p2=liveProvider();const c2=createLiveConnector({win:fakeWin({__bungbungVehicle:{...pk('odometerKm',11000),item:undefined}}),provider:p2,isLive:()=>true,setTimer:()=>0,clearTimer(){}});c2.start();
 assert.equal(c2.remembered('odometerKm').patch.odometerKm,11000,'legacy packet (no item) is ODO');
});
await test('ODO is remembered but not applied (growth unchanged this step)',()=>{
 assert.deepEqual([...HELD_ITEMS],['odometerKm']);
 const p=liveProvider();const c=createLiveConnector({win:fakeWin(),provider:p,isLive:()=>true,setTimer:()=>0,clearTimer(){}});
 c.accept(pk('odometerKm',45000));assert.equal(p.value.odometerKm,null);assert.equal(c.remembered('odometerKm').patch.odometerKm,45000);
 const s=initial();const d=advance(s,null,{...p.value});assert.equal(d.distance,null);assert.equal(s.ackStage,1);assert.equal(s.maxDistanceKm,0);
});
await test('Older OK packet never replaces a newer one; failure packets always count',()=>{
 const p=liveProvider();const c=createLiveConnector({win:fakeWin(),provider:p,isLive:()=>true,setTimer:()=>0,clearTimer(){}});
 c.accept(pk('gear','D',{at:clock}));assert.equal(c.accept(pk('gear','P',{at:clock-1000})),false);assert.equal(p.value.gear,'D');
 c.accept(pk('gear',null,{status:'ERROR'}));assert.equal(p.value.gear,null);assert.equal(p.value.dataStatus.gear,'ERROR');assert.equal(p.value.receivedAt.gear,0,'failure does not refresh the time');
});
await test('Demo: real packets are remembered but not applied; leaving demo re-applies them',()=>{
 let live=false;const p=new VehicleProvider();const c=createLiveConnector({win:fakeWin(),provider:p,isLive:()=>live,setTimer:()=>0,clearTimer(){}});
 c.accept(pk('uxRestricted',true));c.accept(pk('gear','D'));
 assert.equal(p.value.uxRestricted,false,'mock value untouched during demo');assert.equal(originOf(p.value,'gear'),'mock');
 live=true;p.startLive(false);c.applyRemembered();
 assert.equal(p.value.uxRestricted,true);assert.equal(p.value.gear,'D');assert.equal(originOf(p.value,'gear'),'real');assert.equal(p.value.odometerKm,null);
});
await test('Timer ticks only in live mode',()=>{
 let live=false,tick=null,ticks=0;const c=createLiveConnector({win:fakeWin(),provider:liveProvider(),isLive:()=>live,setTimer:(fn,ms)=>{assert.equal(ms,1000);tick=fn;return 7},clearTimer(){},onTick:()=>ticks++});
 c.start();tick();assert.equal(ticks,0);live=true;tick();assert.equal(ticks,1);
});

// ---- 5. Saving: real values never saved, format unchanged ----
await test('Saving in live mode keeps the previous snapshot (no real values saved)',()=>{
 const prev={...baseline(),odometerKm:10025};const s={...initial(),vehicleSnapshot:structuredClone(prev)};
 const p=liveProvider();real(p,'uxRestricted',false);real(p,'gear','P');advance(s,null,p.value);
 assert.deepEqual(s.vehicleSnapshot,prev);assert.equal(s.vehicleSnapshot.isMock,true);
 const s2=initial();advance(s2,null,p.value);assert.equal(s2.vehicleSnapshot,null,'nothing saved before');
});
await test('Mixed values: previous snapshot with only the mock items overwritten',()=>{
 const prev={...baseline(),gear:'P',rangeRemainingKm:420};const s={...initial(),vehicleSnapshot:structuredClone(prev)};
 const p=new VehicleProvider();p.set({gear:'D'},false,{origin:'real',receivedAt:clock});p.set({rangeRemainingKm:100},false);
 advance(s,null,p.value);
 assert.equal(s.vehicleSnapshot.gear,'P','real gear not saved');assert.equal(s.vehicleSnapshot.rangeRemainingKm,100,'mock item saved');
 assert.equal(s.vehicleSnapshot.isMock,true);assert.equal(Object.hasOwn(s.vehicleSnapshot,'origin'),false);
 assert.deepEqual(Object.keys(s.vehicleSnapshot).sort(),Object.keys(prev).sort(),'same fields as before');
});

// ---- 6. Full HMI in live mode (?android=1) with fake packets ----
class Element{constructor(){this.innerHTML='';this.textContent='';this.hidden=false;this.listeners={};this.children=[];this.dataset={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}addEventListener(t,fn){this.listeners[t]=fn}append(c){this.children.push(c)}remove(){}}
const nodes=new Map(),node=k=>{if(!nodes.has(k))nodes.set(k,new Element());return nodes.get(k)};
const previews=['home','growth','badges','closet','recovery','summary','rain','hungry','tire','yellow','red','refuel','cold','hot','night'].map(view=>Object.assign(new Element(),{dataset:{preview:view}}));
const windowListeners={};
globalThis.document={hidden:false,body:node('body'),querySelector:node,querySelectorAll:sel=>sel==='[data-preview]'?previews:[],createElement:()=>new Element(),addEventListener(){}};
globalThis.window={addEventListener:(t,fn)=>windowListeners[t]=fn};
globalThis.location={search:'?android=1'};
node('#manual').elements=Object.fromEntries(['gear','ignition','odometerKm','rangeRemainingKm','outsideTempC','tripDistanceKm','tripTimeMin','uxRestricted'].map(k=>[k,{value:''}]));
globalThis.FormData=class{get(){return ''}};
const saved={...initial(),onboardingComplete:true,hat:'scarf',vehicleSnapshot:{...baseline(),odometerKm:10025}};
const storage=new Map([['bungbung-v1',JSON.stringify(saved)]]);
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
let tick=null;const realSetInterval=globalThis.setInterval;globalThis.setInterval=(fn,ms)=>{if(ms===1000)tick=fn;return 0};
await import('../dist/js/hmi-app.js?live-mode');
globalThis.setInterval=realSetInterval;
const screen=()=>node('#screen-body').innerHTML,send=p=>windowListeners['bungbung-vehicle']({detail:p});
const savedBefore=storage.get('bungbung-v1');
await test('HMI live: starts locked with the live corner label (no mock defaults)',()=>{
 assert.match(screen(),/차량 상태를 확인/);assert.equal(node('.mock-label').textContent,'실차 연결 시험 중');
 assert.match(node('#data-source').textContent,/실차 연결 시험 중/);assert.equal(typeof tick,'function','1 s timer started');
});
await test('HMI live: restricted + no gear → drive screen without the signal-wait label',()=>{
 send(pk('uxRestricted',true));assert.match(screen(),/drive-app/);assert.doesNotMatch(screen(),/신호 대기/);assert.doesNotMatch(screen(),/차량 상태를 확인/);
});
await test('HMI live: not restricted + no gear → not the parked screen',()=>{
 send(pk('uxRestricted',false));assert.match(screen(),/drive-app/);assert.doesNotMatch(screen(),/잠시 쉬어가요/);
});
await test('HMI live: not restricted + P → parked screen; ODO packet does not move growth',()=>{
 send(pk('gear','P'));assert.match(screen(),/잠시 쉬어가요/);
 send(pk('odometerKm',45000));const s=JSON.parse(storage.get('bungbung-v1'));assert.equal(s.ackStage,1);assert.equal(s.maxDistanceKm,0);assert.match(screen(),/잠시 쉬어가요/);
});
await test('HMI live: real range is display only, preserves 0, and disappears on permission failure or expiry',()=>{
 const readRange=(value,opt)=>send(pk('rangeRemainingKm',value,opt));
 assert.match(screen(),/주행 가능 거리<strong>— km/);
 for(const km of [49,150,0]){
  readRange(km);assert.match(screen(),new RegExp('주행 가능 거리<strong>'+km+' km'));
  assert.doesNotMatch(screen(),/냠냠|주유 후 회복|주유소 들를까/);
 }
 readRange(null,{status:'NO_PERMISSION'});assert.match(screen(),/주행 가능 거리<strong>— km/);
 readRange(0);clock+=14000;send(pk('uxRestricted',false));send(pk('gear','P'));
 clock+=1001;tick();assert.match(screen(),/주행 가능 거리<strong>— km/);
 const latest=JSON.parse(storage.get('bungbung-v1'));
 assert.equal(latest.lowRangeKm,null);assert.equal(latest.refuelDetails,null);
 assert(!latest.badges.includes('meal'));assert(!latest.items.includes('bowl'));
 assert.deepEqual(latest.vehicleSnapshot,JSON.parse(savedBefore).vehicleSnapshot);
 send(pk('uxRestricted',true));send(pk('gear','D'));readRange(49);assert.match(screen(),/49 km/);
 readRange(150);assert.match(screen(),/150 km/);assert.doesNotMatch(screen(),/주유 완료|배불러/);
 send(pk('uxRestricted',false));send(pk('gear','P'));
 assert.equal(signalStatus('rangeRemainingKm',pk('rangeRemainingKm',0),clock),'0 km (0초 전)');
 assert.equal(signalStatus('rangeRemainingKm',pk('rangeRemainingKm',-1),clock),'오류');
 assert.equal(signalStatus('rangeRemainingKm',pk('rangeRemainingKm',150,{at:clock-15001}),clock),'오래됨');
});
await test('HMI live: saved data has no real values',()=>{
 const s=JSON.parse(storage.get('bungbung-v1'));assert.deepEqual(s.vehicleSnapshot,JSON.parse(savedBefore).vehicleSnapshot);
});
await test('HMI live: no new packet for 16 s → the timer locks the screen',()=>{
 clock+=14000;tick();assert.match(screen(),/잠시 쉬어가요/,'14 s: still valid');
 clock+=2000;tick();assert.match(screen(),/차량 상태를 확인/,'16 s: expired without any packet');
 send(pk('uxRestricted',false));send(pk('gear','P'));assert.match(screen(),/잠시 쉬어가요/,'fresh packets unlock');
});
await test('HMI live: demo ignores real packets and saves nothing; returning restores live values',()=>{
 const before=storage.get('bungbung-v1');
 previews.find(x=>x.dataset.preview==='recovery').onclick();assert.match(screen(),/냠냠/);assert.match(node('.mock-label').textContent,/시연 중/);
 send(pk('uxRestricted',null,{status:'ERROR'}));assert.match(screen(),/냠냠/,'real packet does not disturb the demo');
 assert.equal(storage.get('bungbung-v1'),before,'demo saves nothing');
 node('#demo-return').onclick();assert.match(screen(),/차량 상태를 확인/,'remembered real state (restriction ERROR) applied on return');
 assert.equal(node('.mock-label').textContent,'실차 연결 시험 중');
 send(pk('uxRestricted',false));assert.match(screen(),/잠시 쉬어가요/);
});
await test('Modes: browser is mock mode (saved values, mock label); ?record=1 and ?mock=1 are never live',async()=>{
 for(const [search,key] of [['','browser'],['?android=1&record=1','record'],['?android=1&mock=1','mock']]){
  storage.set('bungbung-v1',JSON.stringify(saved));globalThis.location={search};tick=null;delete windowListeners['bungbung-vehicle'];
  globalThis.setInterval=(fn,ms)=>{if(ms===1000)tick=fn;return 0};
  await import('../dist/js/hmi-app.js?mode-'+key);globalThis.setInterval=realSetInterval;
  assert.equal(tick,null,`${key}: no live timer`);
  assert.doesNotMatch(screen(),/차량 상태를 확인/,`${key}: opens on mock data, not locked`);
  assert.match(node('.mock-label').textContent,/모의 데이터/,key);
  assert.equal(windowListeners['bungbung-vehicle'],undefined,`${key}: does not listen for real packets`);
 }
});
Date.now=realNow;
console.log(`${checks} web connector checks passed (modes, screen decision, 15/45 s expiry, ODO held, saving)`);
