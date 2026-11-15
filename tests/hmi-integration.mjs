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
const previews=['home','growth','badges','closet','recovery','summary','rain'].map(view=>Object.assign(new Element(),{dataset:{preview:view}}));
const documentListeners={};const windowListeners={};
globalThis.document={hidden:false,body:node('body'),querySelector:node,querySelectorAll(selector){if(selector==='[data-preview]')return previews;if(selector==='.room-stage .bubble')return [...node('.room-stage').children];return [];},createElement:()=>new Element(),addEventListener:(type,fn)=>documentListeners[type]=fn};
globalThis.window={addEventListener:(type,fn)=>windowListeners[type]=fn};
globalThis.location={search:'?android=1'};
node('#manual').elements=Object.fromEntries(['gear','ignition','odometerKm','rangeRemainingKm','outsideTempC','tripDistanceKm','tripTimeMin','uxRestricted'].map(k=>[k,{value:''}]));
let formValues={};globalThis.FormData=class{get(k){return formValues[k];}};
const saved={...initial(),hat:'scarf',badges:['first'],vehicleSnapshot:{...baseline(),odometerKm:10025}};
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
 if(scene===3)assert.match(node('#screen-body').innerHTML,/배가 고파요/);
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

// Read/write failures used to crash before the first render through bootstrap code.
globalThis.localStorage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
await import('../dist/js/hmi-app.js?storage-denied');
assert.match(node('#screen-body').innerHTML,/토토와 잠시/);
windowListeners.pagehide();
console.log('PASS actual HMI wiring: preview/scenario/manual isolation, restore, S7 stop, deferred growth, motion cancellation, Android query, denied storage');
