import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {art,crops} from '../dist/js/hmi-art.js';
// Every runtime crop must be an independent file: no adjacent screenshot UI
// can escape an SVG viewport in an older/software-rendered Android WebView.
for(const name of Object.keys(crops)){
 const html=art(name);
 assert.match(html, /^<img /);
 assert.doesNotMatch(html, /<svg|<image|viewBox/);
 const src=html.match(/src="([^"]+)"/)[1];
 await access(new URL('../dist/'+src,import.meta.url));
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
