// Independent read-only SDK monitor: never writes the mock provider or saved pet.
export function distanceStatus(packet,now=Date.now()){
 if(!packet||packet.source!=='pleos-sdk')return {state:'waiting',value:'—',message:'Android SDK 응답 대기',support:'확인 전',via:'—',updates:0,time:'—'};
 const valid=typeof packet.odometerKm==='number'&&Number.isFinite(packet.odometerKm)&&packet.odometerKm>=0;
 const recent=Number.isFinite(packet.receivedAt)&&packet.receivedAt>0&&now-packet.receivedAt>=-5000&&now-packet.receivedAt<45000;
 const live=packet.state==='live'&&packet.connected===true&&packet.supported===true&&valid&&recent;
 const stale=packet.state==='live'&&!recent;
 return {state:live?'live':stale?'stale':packet.state,value:live?packet.odometerKm.toLocaleString('ko-KR',{maximumFractionDigits:2}):'—',
 message:stale?'45초 이상 갱신 없음 · 현재 값 확인 필요':String(packet.message||'상태 확인 중').slice(0,240),
 support:packet.connected?(packet.supported?'읽기 지원 ('+String(packet.access)+')':'읽기 미지원'):'확인 전',
 via:packet.via==='listener'?'변경 알림':packet.via==='read'?'현재 값 조회':String(packet.via||'—'),
 updates:Number.isInteger(packet.updates)&&packet.updates>=0?packet.updates:0,
 time:packet.receivedAt>0?new Date(packet.receivedAt).toLocaleTimeString('ko-KR'):'—'};
}
export function mountDistanceMonitor(doc,win){
 const bar=doc.querySelector('.app-demo-bar');if(!bar)return;
 const panel=doc.createElement('section');panel.className='sdk-distance-panel';panel.setAttribute('aria-label','차량 SDK 연결 확인');
 panel.innerHTML='<div><b>차량 SDK · 누적 거리</b><strong id="sdk-distance">—</strong><span> km</span></div><div><span id="sdk-state"></span><small id="sdk-detail"></small><small>이 값만 SDK 수신 · 토토 성장·기어·연료는 아직 모의 데이터</small></div>';
 bar.after(panel);let packet=win.__bungbungVehicle;
 const update=()=>{const s=distanceStatus(packet);panel.dataset.state=s.state;panel.querySelector('#sdk-distance').textContent=s.value;panel.querySelector('#sdk-state').textContent=s.message;panel.querySelector('#sdk-detail').textContent=`${s.support} · ${s.via} · 변경 알림 ${s.updates}회 · 마지막 수신 ${s.time}`;};
 const receive=e=>{if(e.detail?.source!=='pleos-sdk')return;packet=e.detail;update();};
 win.addEventListener('bungbung-vehicle',receive);const timer=win.setInterval(update,5000);update();
 win.addEventListener('pagehide',()=>{win.clearInterval(timer);win.removeEventListener('bungbung-vehicle',receive);},{once:true});
}
if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('android')==='1')mountDistanceMonitor(document,window);
