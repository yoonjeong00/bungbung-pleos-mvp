import {installRecording} from './recording.js?v=20261128-range-r1';
import {welcome,cleanPetName,escapeHtml,petParticle} from './onboarding.js?v=20261128-range-r1';
import {DemoSession} from './demo-session.js?v=20261128-range-r1';
import {PresentationController} from './presentation.js?v=20261128-range-r1';
import {art as artwork} from './hmi-art.js?v=20261128-range-r1';
import {icon} from './hmi-icons.js?v=20261128-range-r1';
import {VehicleProvider,ScenarioPlayer,scenes,baseline,FUEL_THRESHOLDS,TEMP_THRESHOLDS,usesMockData,originOf} from './vehicle.js?v=20261128-range-r1';
import {derive,initial,load,save,stages,readValue,signalValid} from './logic.js?v=20261128-range-r1';
import {advance,takeEvent,completeEvent,enqueue} from './state-machine.js?v=20261128-range-r1';
import {createLiveConnector} from './vehicle-live.js?v=20261128-range-r1';
const art=(n,c='')=>artwork(n,`art ${c}`),$=s=>document.querySelector(s),fmt=n=>n===null?'—':Math.round(n).toLocaleString('ko-KR');
let adbSimulation=false;
const recordingMode=new URLSearchParams(location.search).get('record')==='1';
// Modes (VEHICLE_BRIDGE_CONTRACT.md 3.1): live = inside the Android app (?android=1), not recording, not forced mock (?mock=1)
// and not in a demo session. Browser = mock mode (saves as before). Demo session = previews/scenarios/manual/ADB (no save).
const liveCapable=new URLSearchParams(location.search).get('android')==='1'&&!recordingMode&&!new URLSearchParams(location.search).has('mock');
const isLive=()=>liveCapable&&!session.active;
// Entering a demo from live starts from the saved mock values (or mock defaults), never from live LOADING values.
function enterDemo(){if(isLive())provider.set({...baseline(),...(s.vehicleSnapshot||{odometerKm:s.baseOdo,tripDistanceKm:0,tripTimeMin:0})},false);session.enter(s);}
const session=new DemoSession({load,save});
let s=session.leave(),page='home',selectedBadge='meal',category='소품',pending=s.hat==='none'?'headphones':s.hat,previewEvent=null,demoSpeedKmH=null,refuelUntil=0,refuelTimer=null;
const provider=new VehicleProvider(liveCapable?null:s.vehicleSnapshot||{...baseline(),odometerKm:s.baseOdo,tripDistanceKm:0,tripTimeMin:0});if(liveCapable)provider.startLive(false);let v=provider.value,d=derive(v,s);if(!s.onboardingComplete)enqueue(s,'birth');takeEvent(s,d);
const motion=new PresentationController({onChange(active){
 document.querySelectorAll('.room-stage .bubble').forEach(node=>node.remove());
 const room=$('.room-stage');if(!room)return;
 room.classList.toggle('touch',Boolean(active));
 if(active){const bubble=document.createElement('div');bubble.className='bubble';bubble.textContent=active.payload.text;room.append(bubble)}
}});
const badges=[['first','첫 드라이브','토토와 첫 주행을 함께했어요'],['meal','배부른 날','주유 후 토토가 기운을 되찾았어요'],['grow','첫 성장','함께 달리며 한 단계 성장했어요'],['cold','추운 날 드라이브',`${TEMP_THRESHOLDS.coldMaxC}° 이하 추운 날에 함께 달렸어요`],['time','함께한 시간','함께한 시간 배지는 준비 중이에요'],['mileage','1만 km의 추억','누적 거리 배지는 준비 중이에요']];
const items=[['headphones','헤드폰'],['scarf','머플러'],['cap','베레모'],['flower','꽃 브로치'],['star','별 브로치'],['knit','니트 모자']];
const btn=(label,action,cls='primary')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const progress=()=>d.distance===null?0:d.next?Math.max(0,Math.min(100,(d.distance-stages[d.stage].km)/(d.next.km-stages[d.stage].km)*100)):100;
const remaining=()=>d.distance===null?'—':d.next?fmt(Math.max(0,d.next.km-d.distance)):0;
const bar=()=>`<span class="progress" role="progressbar" aria-label="성장 진행도" aria-valuemin="0" aria-valuemax="100" ${d.distance===null?'aria-valuetext="주행 거리 미수신"':`aria-valuenow="${Math.round(progress())}"`}><i style="width:${progress()}%"></i></span>`;
function rail(){return `<aside class="vehicle-rail"><div class="rail-top"><span class="rail-gear">${v.gear||'—'}</span>${!d.parked&&!d.restricted?`<div class="rail-speed">${fmt(demoSpeedKmH)}<small>km/h</small></div>`:''}</div>${d.parked||d.restricted?'<div class="rail-speed">0<small> km/h</small></div>':'<div class="belt">♧ &nbsp; 안전벨트를 착용하세요</div>'}${art('car','rail-car')}<div class="rail-fuel"><div class="fuel-pill">${icon('fuel')}<b>${fmt(d.range)} <small>km</small></b></div>${d.range!==null?`<div class="fuel-track"><i style="width:${Math.min(100,d.range/7)}%"></i></div>`:''}</div></aside>`}
function tabs(){return `<nav class="app-tabs" aria-label="앱 메뉴">${[['home','home','내 방'],['growth','growth','성장 기록'],['closet','closet','꾸미기']].map(([id,i,t])=>`<button data-page="${id}" class="${page===id||(page==='badges'&&id==='growth')?'active':''}">${icon(i)}${t}</button>`).join('')}</nav>`}
function heading(title,sub='',back=false,extra=''){return `<div class="page-heading">${back?btn(icon('back'),'back','back'):''}<h1>${title}</h1>${sub?`<p class="subtitle">${sub}</p>`:''}${extra}</div>`}
function home(){return `${heading(escapeHtml(s.petName||'토토')+petParticle(s.petName,'과','와')+' 잠시 쉬어가요',d.temp!==null&&d.temp<=TEMP_THRESHOLDS.coldMaxC?'추운 날이에요 · 따뜻하게 챙겨 입어요':'',false,btn('이름 바꾸기','rename','rename-button'))}<div class="page-content home-layout"><div class="room-stage"><img class="room-image" src="hmi-assets/home-room.png" alt="하얀 음악방에서 쉬는 두 귀의 토토"><button class="room-pet-button" data-action="pet" aria-label="토토 쓰다듬기"></button><div class="room-distance">함께 달린 거리<b>${fmt(d.distance)} km</b></div><div class="room-level">${icon('growth')}<b>Lv.${d.stage} ${stages[d.stage].name}</b>${bar()}<span>${d.next?`다음 성장까지 ${remaining()} km`:'모든 성장 완료'}</span></div></div><div class="home-side"><button class="metric-link surface" data-page="range">${icon('fuel')}<span>주행 가능 거리<strong>${fmt(d.range)} km</strong></span>${icon('right','chev')}</button><button class="metric-link surface" data-action="summary">${icon('route')}<span>오늘의 주행<strong>${fmt(readValue(v,'tripDistanceKm'))} km · ${fmt(readValue(v,'tripTimeMin'))}분</strong></span>${icon('right','chev')}</button><div class="closet-shortcut surface"><div class="mini-items">${art('headphones')}${art('cap')}</div><small>적용 소품: ${items.find(([id])=>id===(s.hat==='none'?'headphones':s.hat))?.[1]||'헤드폰'} · 방은 대표 이미지(성장·착용 합성 준비 중)</small>${btn('옷장 열기　'+icon('right'),'closet')}</div></div></div>${tabs()}`}
function growth(){return `${heading('함께 자라는 토토',`함께 달린 거리 ${fmt(d.distance)} km`)}<div class="page-content growth-layout"><div class="growth-cards">${stages.slice(1).map((stage,i)=>`<button data-stage="${i+1}" class="growth-card surface ${d.stage===i+1?'current':d.stage<i+1?'future':''}">${art('stage'+(i+1),'stage-art')}<h2>0${i+1} ${stage.name}</h2><p>${i?fmt(stage.km)+' km':'첫 만남'}</p></button>`).join('')}</div><div class="growth-progress surface">${d.next?`다음 성장까지 ${remaining()} km`:'토토가 어른이 되었어요'}${bar()}</div><div class="badge-strip">${badges.slice(0,3).map(([id,name])=>`<button data-badge="${id}">${art('badge-'+id)}${name}</button>`).join('')}</div></div>${tabs()}`}
function badgePage(){const b=badges.find(x=>x[0]===selectedBadge),owned=s.badges.includes(b[0]);return `${heading('배지 도감','함께 만든 작은 기록',true,`<span class="count">획득한 배지 <b>${s.badges.length} / 6</b></span>`)}<div class="page-content badge-layout"><div class="badge-grid">${badges.map(([id,name])=>`<button data-badge="${id}" class="badge-card surface ${id===selectedBadge?'selected':''}">${art('badge-'+id)}<span>${name}</span>${s.badges.includes(id)?'':icon('lock','lock')}</button>`).join('')}</div><div class="badge-detail surface">${art('badge-'+b[0])}<h2>${b[1]}</h2><p>${b[2]}</p><span class="status-pill ${owned?'':'preview'}">${icon(owned?'check':'lock')}${owned?'획득 완료':['time','mileage'].includes(b[0])?'준비 중':'아직 잠겨 있어요'}</span>${art('stage3','detail-pet')}</div></div>${tabs()}`}
function fittingArt(){return art(pending==='cap'?'wardrobe':'stage'+d.stage)+(pending!=='cap'&&pending!=='headphones'?art(pending,'fitting-overlay'):'')}
function updateItemSelection(){
 const owned=s.items.includes(pending),item=items.find(([id])=>id===pending);
 $('.fitting-art').innerHTML=fittingArt();
 $('.fitting-name').textContent=`${owned?'선택한 소품':'착용 미리보기'} · ${item[1]}`;
 document.querySelectorAll('[data-item]').forEach(card=>{
  card.classList.toggle('selected',card.dataset.item===pending);
  card.setAttribute('aria-pressed',String(card.dataset.item===pending));
  const mark=card.querySelector('.item-state');
  if(mark)mark.innerHTML=card.dataset.item===pending?icon('check'):s.items.includes(card.dataset.item)?'':icon('lock');
 });
 const apply=$('.wardrobe-right [data-action="apply"]');apply.textContent=owned?'선택 저장':'아직 잠겨 있어요';apply.disabled=!owned;
}
function closet(){const item=items.find(x=>x[0]===pending)||items[2],owned=s.items.includes(pending);return `${heading('오늘의 토토를 꾸며요')}<div class="page-content wardrobe-layout"><div class="fitting surface"><div class="fitting-art">${fittingArt()}</div><p class="fitting-name">${owned?'선택한 소품':'착용 미리보기'} · ${item[1]}</p><small class="wardrobe-message">대표 이미지 · 착용 합성 준비 중. 소품 선택만 저장돼요.</small></div><div class="wardrobe-right"><div class="category-tabs">${['소품','의상','방'].map(t=>`<button data-category="${t}" class="${category===t?'active':''}">${t}</button>`).join('')}</div>${category==='소품'?`<div class="item-grid">${items.map(([id,name])=>`<button data-item="${id}" aria-pressed="${pending===id}" class="item-card surface ${pending===id?'selected':''}">${art(id)}<span>${name}</span><span class="item-state">${pending===id?icon('check'):s.items.includes(id)?'':icon('lock')}</span></button>`).join('')}</div>`:`<div class="simple-event surface" style="flex:1">${category==='방'?art('wardrobe'):art('stage2')}<p>${category==='방'?'방 꾸미기':'의상 변경'} · 준비 중</p><small>현재는 기본 디자인으로 보여드려요.</small></div>`}<div class="actions">${btn('취소','cancel','secondary')}${category==='소품'?`<button class="primary" data-action="apply" ${owned?'':'disabled'}>${owned?'선택 저장':'아직 잠겨 있어요'}</button>`:''}</div></div></div>${tabs()}`}
function eventPage(type){if(type==='birth')return welcome(s.petName,icon,{rename:previewEvent==='birth'});const shownStage=type==='growth'?(s.activeEventData?.stage||d.stage):d.stage;if(type==='recovery'){const r=s.activeEventData?.refuel||s.refuelDetails||{beforeKm:49,afterKm:620};return `${heading('주유 회복 이벤트','주유로 되찾은 에너지',true)}<div class="page-content event-layout"><div class="event-picture">${art('recovery')}</div><div class="event-content"><span class="status-pill">${icon('check')} 주유 후 회복</span><h2>냠냠, 배불러요!</h2><p>다시 함께 달릴 준비가 됐어요</p><div class="range-card"><h3>${icon('fuel')} 주행 가능 거리</h3><div class="range-values"><span class="before">${fmt(r.beforeKm)}<small> km</small></span><span class="arrow">→</span><span class="after">${fmt(r.afterKm)}<small> km</small></span></div></div><div class="reward-row surface">${art('badge-meal')}배부른 날 · 배지 획득</div><div class="reward-row surface">${art('bowl')}밥그릇 · 소품 획득</div>${btn('내 방으로　→','confirm')}</div></div>`}
if(type==='summary')return `${heading('오늘도 함께 달렸어요','토토와 하루를 마무리해요',true)}<div class="page-content event-layout"><div class="event-picture">${art('summary')}</div><div class="event-content"><div class="summary-metrics"><div class="surface"><h3>${icon('route')} 오늘 달린 거리</h3><strong>${fmt(readValue(v,'tripDistanceKm'))}<small> km</small></strong></div><div class="surface"><h3>${icon('clock')} 함께한 시간</h3><strong>${fmt(readValue(v,'tripTimeMin'))}<small> 분</small></strong></div></div><div class="summary-total surface">${icon('growth')}함께 달린 거리<strong>${fmt(d.distance)}<small> km</small></strong></div><div class="reward-row surface">${art('badge-meal')}${s.badges.includes('meal')?'획득한 배지 · 배부른 날':'오늘의 기록을 간직해요'}</div><p class="farewell">오늘도 수고 많으셨어요.</p><div class="actions">${btn('내 방으로','confirm','secondary')}${btn('확인','confirm')}</div></div></div>`;
return `${heading(type==='birth'?'토토와의 첫 만남':'함께 달리며 자랐어요')}<div class="page-content simple-event growth-enter">${art('stage'+(type==='birth'?1:shownStage))}<h2>${type==='birth'?'안녕, 나는 토토야!':stages[shownStage].name+' 토토로 성장했어요'}</h2><p>${type==='birth'?'우리 함께 달려볼까요?':fmt(d.distance)+' km의 동행을 기억할게요'}</p>${btn('함께하기','confirm')}</div>`}
// Team driving artwork, adapted to the current isolated demo session and acknowledged stage.
// Refuel moment: shown for a short fixed time after the range jumps up, then one re-render clears it (no animation).
// Parked touch reaction in Toto's voice (spec 7.2 / 13.3 N3). Uses FUEL_THRESHOLDS, not logic.js d.hungry.
const petLine=()=>d.demoRange!==null&&d.demoRange<FUEL_THRESHOLDS.lowFuelKm?'배고파… 주유소 들를까?':d.demoRange!==null&&d.demoRange<FUEL_THRESHOLDS.hungryKm?`출출해… 주행 가능 ${fmt(d.range)}km`:'같이 쉬니까 좋다!';
// Rain comes from wiper data: any state other than OFF counts as rain (spec 5.1).
const raining=()=>signalValid(v,'wiperState')&&['INT','LOW','HIGH'].includes(v.wiperState);
function markRefuel(on=true){clearTimeout(refuelTimer);refuelTimer=null;refuelUntil=on?Date.now()+FUEL_THRESHOLDS.refuelShowMs:0;if(on){refuelTimer=setTimeout(()=>{refuelUntil=0;refuelTimer=null;render()},FUEL_THRESHOLDS.refuelShowMs);refuelTimer?.unref?.()}}
// One situation only. Priority: red (criticalWarning) > low fuel > tire/yellow > refuel > hungry > cold/hot > rain > night > default.
function driveMood(){
 const warnings=signalValid(v,'safetyWarnings')&&Array.isArray(v.safetyWarnings)?v.safetyWarnings:[];
 if(d.demoRange!==null&&d.demoRange<FUEL_THRESHOLDS.lowFuelKm)return {image:'hungry',icon:'fuel',label:'연료 부족',message:'배고파… 주유소 들를까?'};
 if(signalValid(v,'tireWarning')&&v.tireWarning===true)return {image:'hurt',icon:'alert',label:'타이어 확인 필요',message:'발이 아파… 타이어 봐줄래?'};
 if(warnings.some(w=>w.level==='yellow'))return {image:'worried',icon:'alert',label:'차량 알림 있음',message:'차가 알려줄 게 있대요'};
 if(Date.now()<refuelUntil)return {image:'happy',icon:'fuel',label:'주유 완료',message:'배불러! 고마워요'};
 if(d.demoRange!==null&&d.demoRange<FUEL_THRESHOLDS.hungryKm)return {image:'hungry',icon:'fuel',label:'주행 가능 거리',message:'주행 가능 '+fmt(d.range)+'km'};
 if(d.temp!==null&&d.temp<=TEMP_THRESHOLDS.coldMaxC)return {image:'cold',icon:'snow',label:'추운 날',message:'코끝이 시려요'};
 if(d.temp!==null&&d.temp>=TEMP_THRESHOLDS.hotMinC)return {image:'hot',icon:'sun',label:'더운 날',message:'오늘 덥다~'};
 if(raining())return null; // rain keeps its own team artwork below
 if(signalValid(v,'headlightOn')&&v.headlightOn===true)return {image:'sleepy',icon:'moon',label:'밤 운전 중',message:'별이 뜨는 밤이에요'};
 return null;
}
function criticalWarning(){return `<section class="critical-warning" role="alert"><h1>차량 경고를 확인해 주세요</h1><p>안전한 곳에 정차하고 차량의 경고 안내를 따라 주세요.</p><small>캐릭터·꾸미기·성장 처리가 잠시 중단돼요 · 모의 경고 시연</small></section>`;}
function mapPanel(){return `<section class="map-panel"><div class="map-fill">${art('map')}</div><div class="turn-card"><span class="turn-arrow"><svg viewBox="0 0 32 32" width="100%" height="100%"><path d="M6 28V15Q6 9 12 9H25M19 3L26 9L19 15" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg></span><b>300 m 앞 우회전</b>${icon('right')}</div><div class="eta">${icon('route')}<b>12분 · <small>6.4 km</small></b></div></section>`}
function drive(){const visibleStage=s.ackStage||1,mood=driveMood(),rain=!mood&&raining(),waiting=demoSpeedKmH===0&&v.gear==='D';return `${mapPanel()}<section class="drive-app"><div class="drive-brand">${art('logo')}<b>마이카펫</b><span class="weather-label">${icon(mood?mood.icon:rain?'wiper':'route')}${mood?mood.label:rain?'와이퍼 작동 중':waiting?'신호 대기 · D':'함께 달리는 중'}</span></div><div class="drive-character ${rain?'':'basic'} ${!mood&&!rain&&visibleStage===1?'departure-scene':''} ${mood?'mood-scene':''} ${!mood&&(rain||visibleStage!==1)?'cutout-scene':''}">${mood?`<img class="art drive-pet" src="hmi-assets/bungbung_child_${mood.image}.png" alt="${mood.label} 상태의 토토" decoding="async">`:!rain&&visibleStage===1?'<div class="departure-visual"><img class="departure-art" src="hmi-assets/toto-departure.webp" width="1440" height="810" alt="안전벨트를 매고 함께 출발하는 토토" decoding="async"></div>':art(rain?'rain':'stage'+visibleStage)}<div class="drive-stats">${d.range===null?'':`<span>${icon('fuel')}${fmt(d.range)} km</span>`}${d.temp===null?'':`<span>${icon('temp')}${fmt(d.temp)}°</span>`}</div></div><div class="drive-message">${icon(mood?mood.icon:rain?'rain':'check')}<span>${mood?mood.message:rain?'톡톡, 비가 와요':waiting?'잠시 멈췄어요':'오늘도 함께 달려요'}</span><small class="drive-stage-label">성장 단계: ${stages[visibleStage].name}</small></div></section>`}
function render(){motion.stop('render');motion.setParked(d.parked&&!document.hidden);const event=d.parked?(previewEvent||takeEvent(s,d)):null;$('#screen-body').classList.toggle('driving',!d.parked&&!d.restricted);$('#screen-body').innerHTML=rail()+(d.dangerous?(!d.parked&&!d.restricted?mapPanel():'')+criticalWarning():d.restricted?`<section class="locked">${icon('lock')}<h1>차량 상태를 확인하고 있어요</h1><p>사용 가능한 상태에서 다시 만나요.<br>캐릭터와 상호작용이 잠시 중단됩니다.</p></section>`:!d.parked?drive():`<section class="app-window"><div class="app-brand">${art('logo','logo')}마이카펫 <span class="parked-chip">주차 중</span></div>${event?eventPage(event):page==='home'?home():page==='growth'?growth():page==='badges'?badgePage():page==='closet'?closet():`${heading('주행 가능 거리','',true)}<div class="page-content metric-detail">${art('stage'+d.stage)}<div><h2>${d.range===null?'차량 정보를 기다리고 있어요':d.demoRange===null?'차량에서 받은 거리':d.range<FUEL_THRESHOLDS.lowFuelKm?'배고파… 주유소 들를까?':d.range<FUEL_THRESHOLDS.hungryKm?'조금 출출해':'배불러, 든든해!'}</h2><strong>${fmt(d.range)} km</strong><p>${d.range===null?'차량에서 제공되지 않는 정보예요.':d.demoRange===null?'차량이 알려주는 예상 거리예요.':'현재는 모의 주행 가능 거리 증가로 회복을 시연해요.'}</p>${btn('내 방으로','home')}</div></div>`}</section>`);session.checkpoint(s);syncForm();$('#demo-return').hidden=!session.active;$('.mock-label').textContent=session.active?'모의 데이터 · 시연 중 (저장 안 함)':usesMockData(v)?'모의 데이터':'실차 연결 시험 중';$('#data-source').textContent=recordingMode?'시연용 모의 차량 데이터 · 실제 SDK 연동 영상 아님':adbSimulation?'앱 동작: ADB 모의 데이터 · SDK 거리는 별도 표시':isLive()?'앱 동작: 실차 연결 시험 중 · 주행 제한·기어 신호로 화면 판단':'앱 동작: 모의 차량 데이터 · SDK 거리는 별도 표시'}
$('#system-dock').innerHTML=`<div class="climate">22° ${icon('seat')}</div><span class="dock-separator"></span><div class="dock-apps">${['home','nav','music','phone','grid','settings'].map(n=>`<span class="dock-item ${n==='nav'?'selected':''}" aria-hidden="true">${icon(n)}</span>`).join('')}</div><span class="dock-separator"></span><div class="climate">${icon('seat')} 22°</div>`;
let toastTimer;function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function syncForm(){for(const k of ['gear','ignition','odometerKm','rangeRemainingKm','outsideTempC','tripDistanceKm','tripTimeMin','uxRestricted']){const el=$('#manual').elements[k];el.value=v[k]===null?(k==='uxRestricted'?'null':''):String(v[k])}}
provider.subscribe(next=>{const before=originOf(v,'rangeRemainingKm')==='mock'?readValue(v,'rangeRemainingKm'):null,after=originOf(next,'rangeRemainingKm')==='mock'?readValue(next,'rangeRemainingKm'):null;if(before!==null&&after!==null&&after-before>=FUEL_THRESHOLDS.refuelJumpKm)markRefuel();v=next;d=advance(s,d,v);if(!d.parked)previewEvent=null;render()});
$('#screen-body').addEventListener('click',e=>{const el=e.target.closest('button');if(!el||!d.parked||document.hidden||el.isConnected===false||el.disabled)return;if(el.dataset.page){if(page===el.dataset.page)return;page=el.dataset.page;pending=s.hat==='none'?'headphones':s.hat;render();return}if(el.dataset.badge){selectedBadge=el.dataset.badge;page='badges';render();return}if(el.dataset.stage){toast(`${stages[+el.dataset.stage].name} · ${+el.dataset.stage<=d.stage?'성장 기록':'함께 '+fmt(stages[+el.dataset.stage].km)+' km를 달리면 만나요'}`);return}if(el.dataset.category){if(category===el.dataset.category)return;category=el.dataset.category;render();return}if(el.dataset.item){if(pending===el.dataset.item)return;pending=el.dataset.item;updateItemSelection();return}switch(el.dataset.action){case'rename':previewEvent='birth';break;case'welcome-start':{const input=$('#pet-name');if(!input)return;s.petName=cleanPetName(input.value);s.onboardingComplete=true;if(previewEvent)previewEvent=null;else if(s.activeEvent==='birth')completeEvent(s,d);page='home';break;}case'pet':motion.start('joy',{duration:1600,payload:{text:petLine()}});return;case'closet':page='closet';pending=s.hat==='none'?'headphones':s.hat;category='소품';break;case'home':page='home';previewEvent=null;break;case'back':if(previewEvent)previewEvent=null;else if(s.activeEvent)completeEvent(s,d);page=page==='badges'?'growth':'home';break;case'summary':previewEvent='summary';break;case'cancel':pending=s.hat==='none'?'headphones':s.hat;page='home';break;case'apply':if(category!=='소품'){toast('현재 기본 제공 디자인을 사용 중이에요.');return}if(!s.items.includes(pending)){toast('아직 잠긴 소품이에요. 미리보기만 가능해요.');return}s.hat=pending==='headphones'?'none':pending;session.checkpoint(s);toast('소품 선택을 저장했어요. 착용 이미지는 예시예요.');return;case'confirm':if(previewEvent)previewEvent=null;else completeEvent(s,d);page='home';break}render()});
function fixture(view){enterDemo();player.reset();const driveViews={rain:{wiperState:'LOW'},tire:{tireWarning:true},yellow:{safetyWarnings:[{id:'washer',level:'yellow',label:'워셔액 부족'}]},red:{safetyWarnings:[{id:'brake',level:'red',label:'브레이크 경고'}]},hungry:{rangeRemainingKm:49},refuel:{rangeRemainingKm:620},cold:{outsideTempC:1},hot:{outsideTempC:33},night:{headlightOn:true}};markRefuel(view==='refuel');demoSpeedKmH=view in driveViews?48:0;s={...initial(),ackStage:3,maxDistanceKm:2180,hat:'cap',badges:['first','meal','grow'],items:['headphones','cap','scarf','bowl']};v={...baseline(),odometerKm:12180,gear:view in driveViews?'D':'P',rangeRemainingKm:view==='recovery'?620:420,...(driveViews[view]||{})};provider.set(v,false);v=provider.value;d=advance(s,null,v,{detect:false});page=['home','growth','badges','closet'].includes(view)?view:'home';pending='cap';category='소품';previewEvent=['recovery','summary'].includes(view)?view:null;render()}
function runScene(i,{continuous=false}={}){
 enterDemo();demoSpeedKmH=[1,2,5].includes(i)?48:0;
 // In the demo player only, moving to the next scene acknowledges its visible card.
 // Ordinary vehicle updates keep an unacknowledged event suspended until parked again.
 if(continuous&&i>0&&d.parked&&s.activeEvent)completeEvent(s,d);
 previewEvent=null;markRefuel(false);page='home';category='소품';
 if(!continuous||i===0){
  s=initial();provider.set({...baseline(),odometerKm:10000,rangeRemainingKm:i===3?49:420},false);d=derive(provider.value,s);
 }
 const scene=scenes[i];provider.set(scene[3],false);v=provider.value;d=advance(s,d,v);
 if(scene[4])enqueue(s,scene[4]);takeEvent(s,d);pending=s.hat==='none'?'headphones':s.hat;
 $('#scenario-status').textContent=`${scene[0]} · ${scene[1]} — ${scene[2]} · 다음 장면 이동은 현재 카드 확인으로 처리됩니다`;
 document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('active',+b.dataset.scene===i));render();
}
const player=new ScenarioPlayer(runScene,playing=>{$('#play').disabled=playing;$('#scenario-status').textContent=playing?'S1–S5 시나리오 재생 중':'시나리오 재생 대기'});
$('#scenario-list').innerHTML=scenes.map(([id,title],i)=>`<button data-scene="${i}"><b>${id}</b>${title}</button>`).join('');
$('#scenario-list').onclick=e=>{const b=e.target.closest('[data-scene]');if(b){player.seek(+b.dataset.scene+1);runScene(+b.dataset.scene);if(recordingMode)$('#demo-panel').hidden=true}};
document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>fixture(b.dataset.preview));
const toggleDemo=()=>{$('#demo-panel').hidden=!$('#demo-panel').hidden};
$('#demo-toggle').onclick=toggleDemo;
$('#app-demo-toggle').onclick=toggleDemo;
$('#fullscreen').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('.device').requestFullscreen();
// Recording mode fills the whole page so the mock-data notice stays visible on camera.
const recordingFullscreen=()=>{const operation=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();operation?.catch(()=>toast('크롬 메뉴에서 전체 화면을 선택해 주세요.'));};
$('#demo-close').onclick=()=>{$('#demo-panel').hidden=true};
if(recordingMode)installRecording({doc:document,runScene,pause:()=>player.pause(),togglePanel:toggleDemo,fullscreen:recordingFullscreen});
$('#play').onclick=()=>player.play();$('#pause').onclick=()=>player.pause();$('#resume').onclick=()=>player.resume();$('#step').onclick=()=>player.step();$('#reset').onclick=()=>{player.reset();fixture('home');toast('모의 시연 상태를 초기화했어요')};
$('#manual').onsubmit=e=>{e.preventDefault();enterDemo();player.stop();demoSpeedKmH=null;const f=new FormData(e.target),patch={gear:f.get('gear'),uxRestricted:JSON.parse(f.get('uxRestricted')),ignition:f.get('ignition')};for(const k of ['odometerKm','rangeRemainingKm','outsideTempC','tripDistanceKm','tripTimeMin'])patch[k]=f.get(k)===''?null:Number(f.get(k));provider.set(patch)};
$('#demo-return').onclick=()=>{player.reset();motion.stop('return');adbSimulation=false;s=session.leave();if(liveCapable){provider.startLive(false);live.applyRemembered();}else provider.set({...baseline(),...(s.vehicleSnapshot||{odometerKm:s.baseOdo,tripDistanceKm:0,tripTimeMin:0})},false);v=provider.value;d=derive(v,s);previewEvent=null;markRefuel(false);demoSpeedKmH=null;page='home';pending=s.hat==='none'?'headphones':s.hat;$('#scenario-status').textContent='저장된 내 토토 상태로 돌아왔어요.';document.querySelectorAll('[data-scene]').forEach(b=>b.classList.remove('active'));render()};
// Debug Android intent injection. This is simulation, never SDK telemetry.
window.addEventListener('bungbung-simulation',event=>{
 if(!new URLSearchParams(location.search).has('android'))return;
 const packet=event.detail;
 if(!packet || typeof packet!=='object')return;
 adbSimulation=true;
 if(Number.isInteger(packet.scene)&&packet.scene>=1&&packet.scene<=10){
  player.pause();runScene(packet.scene-1,{continuous:packet.scene<=5});
 }else if(packet.patch && typeof packet.patch==='object' && !Array.isArray(packet.patch)){
  enterDemo();player.pause();demoSpeedKmH=null;provider.set(packet.patch);
 }
});
window.addEventListener('pagehide',()=>{player.pause();motion.setParked(false)});
window.addEventListener('pageshow',()=>motion.setParked(d.parked&&!document.hidden));
document.addEventListener('visibilitychange',()=>{if(document.hidden){player.pause();motion.setParked(false)}else motion.setParked(d.parked)});
if(['embedded','android'].some(key=>new URLSearchParams(location.search).has(key)))document.body.classList.add('embedded');
if(new URLSearchParams(location.search).has('android'))document.body.classList.add('android-app');
render();
// Web connector (live mode only). The 1 s tick re-renders only when the screen decision changes.
const live=createLiveConnector({win:window,provider,isLive,setTimer:(fn,ms)=>setInterval(fn,ms),clearTimer:id=>clearInterval(id),onTick(){const next=derive(v,s);if(next.restricted!==d.restricted||next.parked!==d.parked||next.dangerous!==d.dangerous||next.range!==d.range){d=advance(s,d,v);if(!d.parked)previewEvent=null;render();}}});
if(liveCapable){live.start();v=provider.value;d=advance(s,d,v);render();}
