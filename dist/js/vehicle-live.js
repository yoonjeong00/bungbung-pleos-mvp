// Web connector: Android bridge packets → VehicleProvider (docs/VEHICLE_BRIDGE_CONTRACT.md).
// - Reads the per-item snapshot Java fills first, then the ODO-only legacy global, then 'bungbung-vehicle' events.
// - Remembers the last real packet per item in every mode; applies it only while live (not demo).
// - ODO is remembered but NOT applied this step: growth still uses the fixed hatch ODO, so a real ODO
//   would jump Toto to adult. It goes in together with saving the real hatch ODO (spec 14 / 6.2).
// - A 1 s timer re-checks freshness so stale safety signals expire even when no packet arrives.
import {bridgePatch} from './vehicle.js?v=20261128-range-r1';
export const HELD_ITEMS=Object.freeze(['odometerKm']); // remembered, not applied yet
export const TICK_MS=1000;
export function createLiveConnector({win,provider,isLive,onTick=()=>{},setTimer=(fn,ms)=>win.setInterval(fn,ms),clearTimer=id=>win.clearInterval(id)}){
 const last=new Map();let timer=null;
 const apply=(b,notify)=>{if(!HELD_ITEMS.includes(b.item))provider.set(b.patch,notify,{origin:'real',receivedAt:b.receivedAt});};
 function accept(packet,{notify=true}={}){
  const b=bridgePatch(packet);if(!b)return false;
  const prev=last.get(b.item);
  // An older successful read never replaces a newer one. Failure packets (receivedAt 0) always count.
  if(b.receivedAt>0&&prev&&prev.receivedAt>b.receivedAt)return false;
  last.set(b.item,b);
  if(isLive())apply(b,notify);
  return true;
 }
 const onEvent=e=>accept(e?.detail);
 // Re-apply every remembered real packet (after startLive, e.g. when leaving demo). Caller re-derives.
 function applyRemembered(){for(const b of last.values())apply(b,false);}
 function start(){
  const items=win.__bungbungVehicleItems;
  if(items&&typeof items==='object')for(const packet of Object.values(items))accept(packet,{notify:false});
  const legacy=win.__bungbungVehicle;
  if(!last.has('odometerKm')&&legacy&&(legacy.item===undefined||legacy.item==='odometerKm'))accept(legacy,{notify:false});
  win.addEventListener('bungbung-vehicle',onEvent);
  timer=setTimer(()=>{if(isLive())onTick();},TICK_MS);
 }
 function stop(){win.removeEventListener?.('bungbung-vehicle',onEvent);if(timer!==null)clearTimer(timer);timer=null;}
 return {start,stop,accept,applyRemembered,remembered:item=>last.get(item)??null};
}
