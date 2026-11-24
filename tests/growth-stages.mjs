import assert from 'node:assert/strict';
import {derive,initial,load,stages} from '../dist/js/logic.js';
import {advance,takeEvent,completeEvent} from '../dist/js/state-machine.js';
import {baseline} from '../dist/js/vehicle.js';

// Characterization tests for growth before spec 13.3 N7 (one place for 300/2,000/6,000).
// They pin what the code does today so the refactor can prove nothing changed.

const loadSaved=saved=>{
 const store=new Map(saved===undefined?[]:[['bungbung-v1',typeof saved==='string'?saved:JSON.stringify(saved)]]);
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 return load();
};
const car=(km,gear='D')=>({...baseline(),gear,odometerKm:10000+km}); // initial baseOdo is 10,000
const growthCount=s=>s.queuedEvents.filter(x=>x==='growth').length+(s.activeEvent==='growth'?1:0);

// 1. Old saves (no stage fields, or old shape) -> stage values load() produces today.
{
 // No ackStage / pendingGrowthStage at all: starts at 아기, real stage comes from distance later.
 const s=loadSaved({baseOdo:10000,maxDistanceKm:2500});
 assert.equal(s.ackStage,1,'old save without ackStage loads as 아기');
 assert.equal(s.pendingGrowthStage,1,'old save without queued growth has nothing pending');
 assert.equal(derive(car(2500),s).stage,3,'distance still makes it 청소년 on screen');
 const d=advance(s,null,car(2500));
 assert.equal(s.pendingGrowthStage,3,'next drive schedules the missed growth');
 assert.equal(growthCount(s),1,'exactly one growth scene is scheduled');
 assert.equal(d.stage,3);
}
// Old save with a queued growth but no pendingGrowthStage: load() derives it from maxDistanceKm.
for(const [km,expected] of [[0,1],[299,1],[300,2],[1999,2],[2000,3],[5999,3],[6000,4],[9000,4]]){
 const s=loadSaved({baseOdo:10000,ackStage:1,maxDistanceKm:km,queuedEvents:['growth']});
 assert.equal(s.pendingGrowthStage,expected,`old queued growth at ${km}km -> pending stage ${expected}`);
}
{
 const s=loadSaved({baseOdo:10000,ackStage:2,maxDistanceKm:2500,queuedEvents:['growth']});
 assert.equal(s.pendingGrowthStage,3,'old queued growth keeps the higher earned stage');
 assert.deepEqual(s.queuedEvents,['growth']);
}
{
 // Old save with the growth scene already open (activeEvent) and its stage.
 const s=loadSaved({baseOdo:10000,ackStage:2,maxDistanceKm:6500,activeEvent:'growth',activeEventData:{stage:4}});
 assert.equal(s.activeEvent,'growth');
 assert.equal(s.activeEventData.stage,4);
 assert.equal(s.pendingGrowthStage,4,'open growth scene keeps its stage');
}
{
 // Out-of-range numbers are clamped to 1..4 (아기..어른); 0 (알) is never loaded as a stage.
 const high=loadSaved({baseOdo:10000,ackStage:9,pendingGrowthStage:9});
 assert.equal(high.ackStage,4);assert.equal(high.pendingGrowthStage,4);
 const zero=loadSaved({baseOdo:10000,ackStage:0,activeEvent:'growth',activeEventData:{stage:0}});
 assert.equal(zero.ackStage,1,'ackStage 0 (알) loads as 아기');
 assert.equal(zero.activeEventData.stage,1,'growth scene stage 0 loads as 아기');
 const lowPending=loadSaved({baseOdo:10000,ackStage:3,pendingGrowthStage:1});
 assert.equal(lowPending.pendingGrowthStage,3,'pending is never below the acknowledged stage');
}
{
 // Missing or broken saves fall back to a fresh 아기.
 for(const raw of [undefined,'{',JSON.stringify(null)]){
  const s=loadSaved(raw);
  assert.equal(s.ackStage,1);assert.equal(s.pendingGrowthStage,1);assert.equal(s.maxDistanceKm,0);
 }
}

// 2. A stage, once reached, never goes back down.
{
 const s=initial();let d=advance(s,null,car(2500));
 d=advance(s,d,car(2500,'P'));takeEvent(s,d);completeEvent(s,d);
 assert.equal(s.ackStage,3);
 d=advance(s,d,car(100));
 assert.equal(d.distance,2500,'a lower odometer report keeps the longest distance');
 assert.equal(d.stage,3,'stage stays 청소년 when the odometer reads lower');
 const restarted={...initial(),ackStage:3,maxDistanceKm:0};
 assert.equal(derive(car(0),restarted).stage,3,'acknowledged stage stays even with 0km');
 assert.equal(derive({...baseline(),gear:'D',odometerKm:null},restarted).stage,3,'unknown odometer keeps the stage');
}

// 3. Each boundary schedules the growth scene exactly once, and only shows it when parked.
{
 const s=initial();let d=null;
 const drive=km=>{d=advance(s,d,car(km));};
 for(const [below,at,stage] of [[299,300,2],[1999,2000,3],[5999,6000,4]]){
  drive(below);
  assert.equal(growthCount(s),0,`${below}km schedules nothing`);
  drive(at);
  assert.equal(growthCount(s),1,`${at}km schedules one growth scene`);
  drive(at+1);drive(at+50);
  assert.equal(growthCount(s),1,`driving on past ${at}km does not schedule another`);
  assert.equal(takeEvent(s,d),null,'growth is not shown while driving');
  d=advance(s,d,car(at+50,'P'));
  assert.equal(takeEvent(s,d),'growth','growth is shown once parked');
  assert.equal(s.activeEventData.stage,stage);
  completeEvent(s,d);
  assert.equal(s.ackStage,stage,`after confirming, the stage is ${stages[stage].name}`);
  assert.equal(growthCount(s),0,'nothing left to show');
  drive(at+60);
  assert.equal(growthCount(s),0,'no repeat after confirming');
 }
 assert.equal(s.badges.filter(x=>x==='grow').length,1,'첫 성장 badge is given once');
}
{
 // Jumping over a boundary (0 -> 2,500km) schedules one scene straight to 청소년.
 const s=initial();let d=advance(s,null,car(2500));
 assert.equal(growthCount(s),1);
 d=advance(s,d,car(2500,'P'));takeEvent(s,d);
 assert.equal(s.activeEventData.stage,3);
 completeEvent(s,d);
 assert.equal(s.ackStage,3);assert.equal(growthCount(s),0);
}

console.log('PASS growth stages: old saves, no regression, one growth scene per boundary');
