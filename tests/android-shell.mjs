import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {art,crops} from '../dist/js/hmi-art.js';
for(const [name,[,, ,w,h]] of Object.entries(crops)){
 const html=art(name,'art','토토');
 assert.match(html,/^<img /);
 assert.doesNotMatch(html,/<svg|clip-path|reference-/);
 const png=readFileSync(new URL(`../dist/hmi-assets/extracted/${name}.webp`,import.meta.url));
 assert.equal(png.toString("ascii",0,4),"RIFF");
 assert.equal(png.toString("ascii",8,12),"WEBP");
}
assert.match(art('logo','','"<토토>'),/alt="&quot;&lt;토토&gt;"/);
console.log('PASS isolated artwork: all WebP resources exist, no full-reference SVG images');
