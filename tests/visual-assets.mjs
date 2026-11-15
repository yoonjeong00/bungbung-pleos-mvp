import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {art,crops,cutoutNames} from '../dist/js/hmi-art.js';
// Every runtime crop must be an independent file: no adjacent screenshot UI
// can escape an SVG viewport in an older/software-rendered Android WebView.
for(const name of Object.keys(crops)){
 const html=art(name);
 assert.match(html, /^<img /);
 assert.doesNotMatch(html, /<svg|<image|viewBox/);
 const src=html.match(/src="([^"]+)"/)[1];
 await access(new URL('../dist/'+src,import.meta.url));
}
// A renamed opaque screenshot must not silently replace a transparent asset.
for(const name of cutoutNames){
 const html=art(name);
 assert.match(html,/art-cutout/);
 const bytes=await readFile(new URL(`../dist/hmi-assets/cutouts/${name}.webp`,import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.toString('ascii',12,16),'VP8X');
 assert.ok(bytes[20]&0x10,`${name} must retain alpha transparency`);
 assert.ok(bytes.length<150000,`${name} exceeds UI asset budget`);
}
const {welcome}=await import('../dist/js/onboarding.js');
const html=welcome('토토',()=> '');
assert.doesNotMatch(html, /<svg|<image|viewBox/);
for(const kind of ['hero','growth','fuel','closet']){
 assert.ok(html.includes(`extracted/welcome-${kind}.webp`));
 await access(new URL(`../dist/hmi-assets/extracted/welcome-${kind}.webp`,import.meta.url));
}
await access(new URL('../dist/hmi-assets/toto-departure.webp',import.meta.url));
console.log('PASS artwork files exist; welcome and HMI images do not embed clipped reference screens (not a visual/browser test)');
