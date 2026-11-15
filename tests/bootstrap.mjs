import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../dist/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const version='20261115-r10';
assert.ok(html.includes(`bootstrap.js?v=${version}`));
assert.ok(html.includes(`hmi.css?v=${version}`));
const visited=new Set();
function graph(file){
 if(visited.has(file))return;visited.add(file);
 const source=readFileSync(new URL('js/'+file,root),'utf8');
 for(const match of source.matchAll(/(?:from\s+|import\()['"]\.\/([^'"]+)['"]/g)){
  const [name,query]=match[1].split('?');
  assert.equal(query,`v=${version}`,`${file} must request the same release of ${name}`);
  assert.ok(existsSync(new URL('js/'+name,root)),name);graph(name);
 }
}
graph('bootstrap.js');
// Exercise the failure UI with a rejected module load; this does not simulate Chrome rendering.
const source=readFileSync(new URL('js/bootstrap.js',root),'utf8');
let replaced=false,reloaded=false;const classes=new Set();
const element=()=>({style:{},children:[],append(...x){this.children.push(...x)},addEventListener(type,fn){this[type]=fn}});
const host=element();host.replaceChildren=()=>{replaced=true;host.children=[]};
const context={URLSearchParams,location:{search:'?android=1',reload(){reloaded=true}},console:{error(){}},
 document:{body:{classList:{add:x=>classes.add(x)}},querySelector:()=>host,createElement:element},
 loadApp(){assert.ok(classes.has('embedded')&&classes.has('android-app'));return Promise.reject(new Error('missing export <example>'))}};
vm.runInNewContext(source.replace("import('./hmi-app.js?v=20261115-r10')",'loadApp()'),context);
await new Promise(resolve=>setImmediate(resolve));
assert.ok(replaced);assert.equal(host.children.length,1);
const children=host.children[0].children;
assert.match(children[2].textContent,/missing export <example>/);
assert.equal(children[2].innerHTML,undefined,'error is plain text');
children[3].click();assert.ok(reloaded);
console.log('PASS release-consistent module graph and explicit initialization error/retry UI (not browser rendering)');
