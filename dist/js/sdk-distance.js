// Independent read-only SDK monitor: never writes the mock provider or saved pet.
// N12: only ODO packets belong here. Legacy packets have no `item` and are ODO (VEHICLE_BRIDGE_CONTRACT.md 2.1).
export const isOdometerPacket=p=>!!p&&typeof p==='object'&&p.source==='pleos-sdk'&&(p.item===undefined||p.item===null||p.item==='odometerKm');
export function distanceStatus(packet,now=Date.now()){
 if(!isOdometerPacket(packet))return {state:'waiting',value:'—',message:'Android SDK 응답 대기',support:'확인 전',via:'—',updates:0,valueChanges:null,time:'—'};
 const valid=typeof packet.odometerKm==='number'&&Number.isFinite(packet.odometerKm)&&packet.odometerKm>=0;
 const recent=Number.isFinite(packet.receivedAt)&&packet.receivedAt>0&&now-packet.receivedAt>=-5000&&now-packet.receivedAt<45000;
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
 panel.innerHTML='<div><b>차량 SDK · 누적 거리</b><strong id="sdk-distance">—</strong><span> km</span></div><div><span id="sdk-state"></span><small id="sdk-detail"></small><small>이 값만 SDK 수신 · 토토 성장·기어·연료는 아직 모의 데이터</small></div>';
 // Late mount: prefer the per-item snapshot (N10), then the ODO-only compatibility global.
 bar.after(panel);let packet=[win.__bungbungVehicleItems?.odometerKm,win.__bungbungVehicle].find(isOdometerPacket);
 const update=()=>{const s=distanceStatus(packet);panel.dataset.state=s.state;panel.querySelector('#sdk-distance').textContent=s.value;panel.querySelector('#sdk-state').textContent=s.message;panel.querySelector('#sdk-detail').textContent=`${s.support} · ${s.via} · 알림 수신 ${s.updates}회 · ${s.valueChanges===null?'값 변경 확인 전':`값 변경 ${s.valueChanges}회`} · 마지막 수신 ${s.time}`;};
 // Other items (gear, uxRestricted ...) share the event; ignore them so the last ODO packet stays on screen.
 const receive=e=>{if(!isOdometerPacket(e.detail))return;packet=e.detail;update();};
 win.addEventListener('bungbung-vehicle',receive);const timer=win.setInterval(update,5000);update();
 win.addEventListener('pagehide',()=>{win.clearInterval(timer);win.removeEventListener('bungbung-vehicle',receive);},{once:true});
}
if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('android')==='1')mountDistanceMonitor(document,window);
