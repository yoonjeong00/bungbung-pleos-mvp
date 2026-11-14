import assert from 'node:assert/strict';
import {freshLayout,normalizeLayout,changeBox} from '../dist/js/layout-model.js';
const l=freshLayout();assert.deepEqual(normalizeLayout(JSON.parse(JSON.stringify(l))),l);
assert.throws(()=>normalizeLayout({version:3}));
const n=normalizeLayout({version:1,ratio:999,roomHeight:-1,hidden:['pet','unknown','pet'],boxes:{pet:{x:99,y:-30,w:50,h:60},weather:{x:NaN,y:0,w:10,h:10}}});
assert.equal(n.ratio,85);assert.equal(n.roomHeight,280);assert.deepEqual(n.hidden,['pet']);assert.deepEqual(n.boxes.pet,{x:50,y:0,w:50,h:60});assert.equal(n.boxes.weather,undefined);
const b={x:20,y:30,w:40,h:50};assert.deepEqual(changeBox(b,100,-100),{x:60,y:0,w:40,h:50});assert.deepEqual(changeBox(b,100,100,true),{x:20,y:30,w:80,h:70});assert.deepEqual(b,{x:20,y:30,w:40,h:50});
assert.deepEqual(normalizeLayout({version:1,boxes:{pet:{x:10,y:10,w:20,h:30}},sideLeft:true}).boxes.pet,{x:10,y:10,w:20,h:30});
console.log('Layout model: roundtrip, version validation, import sanitization, move/resize bounds passed');
