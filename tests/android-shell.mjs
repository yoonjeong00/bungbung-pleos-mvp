import assert from 'node:assert/strict';
import {art} from '../dist/js/hmi-art.js';
const a=art('headphones'),b=art('headphones');
const id=s=>s.match(/clipPath id="([^"]+)"/)[1];
assert.notEqual(id(a),id(b),'Repeated artwork must not share document-global clip IDs');
for(const s of [a,b])assert.ok(s.includes(`url(#${id(s)})`));
console.log('PASS repeated SVG artwork has independent matching clip references');
