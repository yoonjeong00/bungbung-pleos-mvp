import assert from 'node:assert/strict';
import {initial} from '../dist/js/logic.js';
import {baseline} from '../dist/js/vehicle.js';

// Execute the real HMI entry point with a minimal DOM adapter. This checks wiring,
// not layout or browser rendering. No browser automation substitute is used.
class Element {
  constructor(){this.innerHTML='';this.textContent='';this.hidden=false;this.listeners={};this.children=[];this.dataset={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  addEventListener(type,fn){this.listeners[type]=fn;}
  append(child){this.children.push(child);child.parent=this;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
}
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,new Element());return nodes.get(key);};
const previews=['home','growth','badges','closet','recovery','summary','rain','hungry','tire','yellow','red','refuel','cold','hot','night'].map(view=>Object.assign(new Element(),{dataset:{preview:view}}));
const documentListeners={};const windowListeners={};
globalThis.document={hidden:false,body:node('body'),querySelector:node,querySelectorAll(selector){if(selector==='[data-preview]')return previews;if(selector==='.room-stage .bubble')return [...node('.room-stage').children];return [];},createElement:()=>new Element(),addEventListener:(type,fn)=>documentListeners[type]=fn};
globalThis.window={addEventListener:(type,fn)=>windowListeners[type]=fn};
globalThis.location={search:'?android=1'};
node('#manual').elements=Object.fromEntries(['gear','ignition','odometerKm','rangeRemainingKm','outsideTempC','tripDistanceKm','tripTimeMin','uxRestricted'].map(k=>[k,{value:''}]));
let formValues={};globalThis.FormData=class{get(k){return formValues[k];}};
const saved={...initial(),onboardingComplete:true,hat:'scarf',badges:['first'],vehicleSnapshot:{...baseline(),odometerKm:10025}};
const storage=new Map([['bungbung-v1',JSON.stringify(saved)]]);
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
await import('../dist/js/hmi-app.js');
assert.ok(node('body').classes.has('embedded'),'Android query hides the external frame');
assert.match(node('#screen-body').innerHTML,/25 km/,'first render preserves saved distance');
const before=storage.get('bungbung-v1');
previews.find(x=>x.dataset.preview==='recovery').onclick();
assert.match(node('#screen-body').innerHTML,/냠냠/);
assert.equal(storage.get('bungbung-v1'),before,'preview must not write fixture rewards');
assert.equal(node('#demo-return').hidden,false);
previews.find(x=>x.dataset.preview==='home').onclick();
node('#demo-return').onclick();
assert.match(node('#screen-body').innerHTML,/25 km/);
assert.equal(JSON.parse(storage.get('bungbung-v1')).hat,'scarf');
assert.equal(node('#demo-return').hidden,true);

const scene=i=>node('#scenario-list').onclick({target:{closest:()=>({dataset:{scene:String(i)}})}});
const click=action=>node('#screen-body').listeners.click({target:{closest:()=>({dataset:{action}})}});
const manual=patch=>{formValues={gear:'P',ignition:'ON',odometerKm:'10025',rangeRemainingKm:'420',outsideTempC:'18',tripDistanceKm:'32',tripTimeMin:'41',uxRestricted:'false',...patch};node('#manual').onsubmit({preventDefault(){},target:node('#manual')});};
scene(6);
assert.match(node('#screen-body').innerHTML,/신호 대기 · D/);
assert.match(node('#screen-body').innerHTML,/잠시 멈췄어요/);
assert.doesNotMatch(node('#screen-body').innerHTML,/함께 달리는 중/);
assert.match(node('#screen-body').innerHTML,/rail-speed">0<small>/,'S7 is stopped in D');
assert.doesNotMatch(node('#screen-body').innerHTML,/app-tabs/);
scene(4);manual({gear:'D',odometerKm:'10300'});
assert.match(node('#screen-body').innerHTML,/성장 단계: 아기/,'unacknowledged growth stays hidden while driving');
assert.doesNotMatch(node('#screen-body').innerHTML,/성장 단계: 어린이/);
manual({gear:'P',odometerKm:'10300'});assert.match(node('#screen-body').innerHTML,/어린이 토토로 성장/,'growth resumes in P');
click('confirm');click('pet');assert.equal(node('.room-stage').children.length,1);
document.hidden=true;documentListeners.visibilitychange();assert.equal(node('.room-stage').children.length,0,'background transition cancels touch presentation');
document.hidden=false;documentListeners.visibilitychange();click('pet');manual({gear:'D'});assert.equal(node('.room-stage').children.length,0,'leaving P cancels touch');
manual({ignition:'OFF'});assert.match(node('#screen-body').innerHTML,/차량 상태를 확인/,'OFF fails closed');
assert.equal(storage.get('bungbung-v1'),before,'scenario and manual controls must not overwrite the saved pet');
node('#demo-return').onclick();assert.match(node('#screen-body').innerHTML,/25 km/);

// Selecting or applying an accessory preserves the expensive screen root/grid.
previews.find(x=>x.dataset.preview==='closet').onclick();
const screenBefore=node('#screen-body').innerHTML;
node('#screen-body').listeners.click({target:{closest:()=>({dataset:{item:'scarf'}})}});
assert.equal(node('#screen-body').innerHTML,screenBefore,'item selection preserves screen root');
assert.match(node('.fitting-art').innerHTML,/data-art="scarf"/);
assert.match(node('.fitting-name').textContent,/머플러/);
click('apply');assert.equal(node('#screen-body').innerHTML,screenBefore,'apply preserves screen root');
node('#demo-return').onclick();

// Exercise the same event that the debug Android Activity delivers.
const native=detail=>windowListeners['bungbung-simulation']({detail});
const savedBeforeNative=storage.get('bungbung-v1');
for(let scene=1;scene<=10;scene++){
 native({scene});
 assert.match(node('#data-source').textContent,/ADB 모의/);
 if(scene===2||scene===7)assert.doesNotMatch(node('#screen-body').innerHTML,/app-tabs/);
 if(scene===3)assert.match(node('#screen-body').innerHTML,/배고파… 주유소 들를까\?/);
 if(scene===4)assert.match(node('#screen-body').innerHTML,/냠냠/);
 if(scene===5)assert.match(node('#screen-body').innerHTML,/성장했어요/);
 if(scene===8)assert.match(node('#screen-body').innerHTML,/차량 상태를 확인/);
 if(scene===10)assert.match(node('#screen-body').innerHTML,/오늘도 함께 달렸어요/);
}
native({patch:{gear:'D',ignition:'ON',uxRestricted:false}});
assert.doesNotMatch(node('#screen-body').innerHTML,/app-tabs/);
native({patch:{gear:'P',uxRestricted:null}});
assert.match(node('#screen-body').innerHTML,/차량 상태를 확인/);
assert.equal(storage.get('bungbung-v1'),savedBeforeNative,'native simulation preserves saved pet');
node('#demo-return').onclick();assert.doesNotMatch(node('#data-source').textContent,/ADB/);

// Personal rename persists, native demo rename is discarded when returning.
click('rename');assert.match(node('#screen-body').innerHTML,/id="pet-name"/);
node('#pet-name').value='별이';click('welcome-start');
assert.match(node('#screen-body').innerHTML,/별이와 잠시/);
assert.equal(JSON.parse(storage.get('bungbung-v1')).petName,'별이');
native({scene:1});node('#pet-name').value='보리';click('welcome-start');
assert.match(node('#screen-body').innerHTML,/보리와 잠시/);
node('#demo-return').onclick();assert.match(node('#screen-body').innerHTML,/별이와 잠시/);

// End-to-end simulated tour: explicit confirmation, no dead end after S5.
for(let i=1;i<=5;i++){
 native({scene:i});
 if(i===1){assert.match(node('#screen-body').innerHTML,/우리의 첫 드라이브/);node('#pet-name').value='동행';click('welcome-start');}
 if(i===2)assert.match(node('#screen-body').innerHTML,/toto-departure.webp/);
 if(i===3)assert.match(node('#screen-body').innerHTML,/배고파… 주유소 들를까\?/);
 if(i===4){assert.match(node('#screen-body').innerHTML,/냠냠/);click('confirm');assert.match(node('#screen-body').innerHTML,/동행과 잠시/);}
 if(i===5){assert.match(node('#screen-body').innerHTML,/어린이 토토로 성장/);click('confirm');assert.match(node('#screen-body').innerHTML,/Lv.2 어린이/);}
}
// A queued click on a detached old confirmation button must not acknowledge a new card.
native({scene:4});
const recoveryBefore=node('#screen-body').innerHTML;
node('#screen-body').listeners.click({target:{closest:()=>({dataset:{action:'confirm'},isConnected:false})}});
assert.equal(node('#screen-body').innerHTML,recoveryBefore,'detached double-click is ignored');
click('confirm');
click('summary');assert.match(node('#screen-body').innerHTML,/오늘도 함께 달렸어요/);click('confirm');assert.match(node('#screen-body').innerHTML,/app-tabs/);
click('rename');node('#pet-name').value='저장안함';click('back');assert.doesNotMatch(node('#screen-body').innerHTML,/저장안함/);
previews.find(x=>x.dataset.preview==='closet').onclick();
node('#screen-body').listeners.click({target:{closest:()=>({dataset:{category:'방'}})}});
assert.match(node('#screen-body').innerHTML,/방 꾸미기 · 준비 중/);assert.doesNotMatch(node('#screen-body').innerHTML,/data-action="apply"/);
click('cancel');assert.match(node('#screen-body').innerHTML,/app-tabs/);
node('#demo-return').onclick();

const warningSaved=storage.get('bungbung-v1');
// Team warning scenes reuse the real HMI handler and isolated demo lifecycle.
for(const [view,asset,text] of [['hungry','hungry','배고파… 주유소 들를까'],['tire','hurt','발이 좀 아파… 타이어 봐줄래'],['yellow','worried','차가 알려줄 게 있대요'],['refuel','happy','배불러! 고마워요'],['cold','cold','코끝이 시려요'],['hot','hot','오늘 덥다~'],['night','sleepy','별이 뜨는 밤이에요']]){
 previews.find(x=>x.dataset.preview===view).onclick();
 assert.match(node('#screen-body').innerHTML,new RegExp('bungbung_child_'+asset+'\\.png'));
 assert.ok(node('#screen-body').innerHTML.includes(text),view+' line');
 assert.match(node('#screen-body').innerHTML,/rail-gear">D</,view+' is driving');
 assert.doesNotMatch(node('#screen-body').innerHTML,/차간거리|조심하세요|천천히|안전하게 (달려|주유)/,view+' has no driving instruction');
 assert.doesNotMatch(node('#screen-body').innerHTML,/app-tabs/);
}
// Rain comes from wiperState (spec 5.1 / 13.3 N1): preview button, ADB patch, and OFF clears it.
previews.find(x=>x.dataset.preview==='rain').onclick();
assert.match(node('#screen-body').innerHTML,/와이퍼 작동 중/);
assert.match(node('#screen-body').innerHTML,/톡톡, 비가 와요/);
assert.match(node('#screen-body').innerHTML,/rail-gear">D</);
native({patch:{wiperState:'OFF'}});
assert.doesNotMatch(node('#screen-body').innerHTML,/와이퍼 작동 중|톡톡, 비가 와요/,'wiper OFF ends rain');
native({patch:{wiperState:'HIGH'}});
assert.match(node('#screen-body').innerHTML,/톡톡, 비가 와요/,'ADB wiper patch starts rain');
native({patch:{wiperState:'HIGH',outsideTempC:1}});
assert.match(node('#screen-body').innerHTML,/코끝이 시려요/,'cold outranks rain');
node('#demo-return').onclick();
// S6 cold day is a driving scene (spec 10.2 / 13.3 N4).
scene(5);
assert.match(node('#screen-body').innerHTML,/rail-gear">D</,'S6 is driving');
assert.match(node('#screen-body').innerHTML,/bungbung_child_cold\.png/);
assert.match(node('#screen-body').innerHTML,/코끝이 시려요/);
assert.doesNotMatch(node('#screen-body').innerHTML,/app-tabs/);
node('#demo-return').onclick();
previews.find(x=>x.dataset.preview==='red').onclick();
assert.match(node('#screen-body').innerHTML,/critical-warning/);
assert.doesNotMatch(node('#screen-body').innerHTML,/drive-pet|drive-message|app-tabs|departure-art/);
manual({gear:'P'});assert.match(node('#screen-body').innerHTML,/critical-warning/,'red warning also blocks parked interaction');
node('#demo-return').onclick();assert.doesNotMatch(node('#screen-body').innerHTML,/critical-warning/,'old saved snapshots clear mock warnings on restore');
assert.equal(storage.get('bungbung-v1'),warningSaved,'warning previews preserve saved state');
console.log('Team warning HMI: 7 artwork routes, critical priority, parked block, return isolation passed');

// Read/write failures used to crash before the first render through bootstrap code.
globalThis.localStorage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
await import('../dist/js/hmi-app.js?storage-denied');
assert.match(node('#screen-body').innerHTML,/우리의 첫 드라이브/,'fresh or inaccessible storage begins with welcome');
node('#pet-name').value='';click('welcome-start');assert.match(node('#screen-body').innerHTML,/토토와 잠시/,'blank name falls back and welcome can finish');
windowListeners.pagehide();
console.log('PASS actual HMI wiring: preview/scenario/manual isolation, restore, S7 stop, deferred growth, motion cancellation, Android query, denied storage');

