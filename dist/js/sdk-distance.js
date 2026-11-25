// Independent read-only SDK monitor: never writes the mock provider or saved pet.
import {realMaxAgeMs} from './logic.js?v=20261125-r3';
// N12: only ODO packets belong here. Legacy packets have no `item` and are ODO (VEHICLE_BRIDGE_CONTRACT.md 2.1).
export const isOdometerPacket=p=>!!p&&typeof p==='object'&&p.source==='pleos-sdk'&&(p.item===undefined||p.item===null||p.item==='odometerKm');
// Safety signals shown for testers (spec 13.1: ignition is displayed only, never used to lock the screen).
export const SIGNAL_ITEMS=Object.freeze([['uxRestricted','주행 제한'],['gear','기어'],['ignition','시동']]);
const statusText={LOADING:'기다리는 중',NO_PERMISSION:'권한 없음',UNSUPPORTED:'미지원',ERROR:'오류'};
export function signalStatus(item,packet,now=Date.now()){
 if(!packet)return '기다리는 중';
 const status=packet.status??'ERROR';
 if(status!=='OK')return statusText[status]??'오류';
 const age=now-packet.receivedAt;
 if(!Number.isFinite(packet.receivedAt)||packet.receivedAt<=0||age<-5000||age>realMaxAgeMs(item))return '오래됨';
 const value=item==='uxRestricted'?(packet.uxRestricted===true?'제한 있음':packet.uxRestricted===false?'제한 없음':null):packet[item];
 if(value===null||value===undefined)return '오류';
 return `${value} (${Math.max(0,Math.round(age/1000))}초 전)`;
}
export function distanceStatus(packet,now=Date.now()){
 if(!isOdometerPacket(packet))return {state:'waiting',value:'—',message:'Android SDK 응답 대기',support:'확인 전',via:'—',updates:0,valueChanges:null,time:'—'};
 const valid=typeof packet.odometerKm==='number'&&Number.isFinite(packet.odometerKm)&&packet.odometerKm>=0;
 const recent=Number.isFinite(packet.receivedAt)&&packet.receivedAt>0&&now-packet.receivedAt>=-5000&&now-packet.receivedAt<realMaxAgeMs('odometerKm');
 const live=packet.state==='live'&&packet.connected===true&&packet.supported===true&&valid&&recent;
 const stale=packet.state==='live'&&!recent;
 const invalidLive=packet.state==='live'&&!live&&!stale;
 return {state:live?'live':stale?'stale':invalidLive?'error':packet.state,value:live?packet.odometerKm.toLocaleString('ko-KR',{maximumFractionDigits:2}):'—',
 message:stale?'거리 값이 오래되었거나 수신 시간이 유효하지 않아요':invalidLive?'유효한 SDK 거리 값을 기다리고 있어요':String(packet.message||'상태 확인 중').slice(0,240),
 support:packet.connected?(packet.supported?'읽기 지원 ('+String(packet.access)+')':'읽기 미지원'):'확인 전',
 via:packet.via==='listener'?'변경 알림':packet.via==='read'?'현재 값 조회':String(packet.via||'—'),
 updates:Number.isInteger(packet.updates)&&packet.updates>=0?packet.updates:0,
 valueChanges:Number.isInteger(packet.valueChanges)&&packet.valueChanges>=0?packet.valueChanges:null,
 time:packet.receivedAt>0?new Date(packet.receivedAt).toLocaleTimeString('ko-KR'):'—'};
}
export function mountDistanceMonitor(doc,win){
 const bar=doc.querySelector('.app-demo-bar');if(!bar||doc.querySelector('.sdk-distance-panel'))return;
 const panel=doc.createElement('section');panel.className='sdk-distance-panel';panel.setAttribute('aria-label','차량 SDK 연결 확인');
 panel.innerHTML='<div><b>차량 SDK · 누적 거리</b><strong id="sdk-distance">—</strong><span> km</span></div><div><span id="sdk-state"></span><small id="sdk-detail"></small><small id="sdk-signals"></small></div>';
 // Late mount: prefer the per-item snapshot (N10), then the ODO-only compatibility global.
 bar.after(panel);let packet=[win.__bungbungVehicleItems?.odometerKm,win.__bungbungVehicle].find(isOdometerPacket);
 const signals=new Map();
 const keepSignal=p=>{if(!p||typeof p!=='object'||!SIGNAL_ITEMS.some(([k])=>k===p.item))return;const prev=signals.get(p.item);if(p.receivedAt>0&&prev?.receivedAt>p.receivedAt)return;signals.set(p.item,p);};
 for(const [k] of SIGNAL_ITEMS)keepSignal(win.__bungbungVehicleItems?.[k]);
 const update=()=>{const s=distanceStatus(packet);panel.dataset.state=s.state;panel.querySelector('#sdk-distance').textContent=s.value;panel.querySelector('#sdk-state').textContent=s.message;panel.querySelector('#sdk-detail').textContent=`${s.support} · ${s.via} · 알림 수신 ${s.updates}회 · ${s.valueChanges===null?'값 변경 확인 전':`값 변경 ${s.valueChanges}회`} · 마지막 수신 ${s.time}`;
  // One line (same panel height as before): safety-signal states, then the ODO note.
  panel.querySelector('#sdk-signals').textContent=SIGNAL_ITEMS.map(([k,label])=>`${label} · ${signalStatus(k,signals.get(k))}`).join(' / ')+' · ODO는 확인용(성장 계산에 아직 안 씀)';};
 // Other items share the event: ODO packets update the distance, safety signals update their own line.
 const receive=e=>{const p=e?.detail;if(isOdometerPacket(p))packet=p;else keepSignal(p);update();};
 win.addEventListener('bungbung-vehicle',receive);const timer=win.setInterval(update,1000);update();
 win.addEventListener('pagehide',()=>{win.clearInterval(timer);win.removeEventListener('bungbung-vehicle',receive);},{once:true});
}
if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('android')==='1')mountDistanceMonitor(document,window);
