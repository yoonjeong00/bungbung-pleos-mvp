import {PresentationController} from './presentation.js';
import {advance,enqueue,takeEvent,addBadge} from './state-machine.js';
import {roomScreen} from './room-ui.js';
import {VehicleProvider,ScenarioPlayer,scenes,baseline} from './vehicle.js';
import {derive,load,save,initial,stages,readValue} from './logic.js';
import {pet,icons} from './character.js';
if(new URLSearchParams(location.search).has('android'))document.body.classList.add('embedded');
const $=s=>document.querySelector(s);
let state=load();
const provider=new VehicleProvider(state.vehicleSnapshot);
let sceneLoading=false;
let page='home',event=null,split=false,scene=-1,pose='idle',bubble='',walkTimer=null,previewHat=state.hat;
let roomTab='home',previewStage=null,previewMood='idle';
let last=derive(provider.value,state);
const items=[['none','기본 모습'],['cap','민트 베레모'],['flower','작은 꽃'],['scarf','보라 머플러'],['star','별빛 소품']];
const num=v=>v===null?'—':Math.round(v).toLocaleString('ko-KR');
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2400)}
function nav(){return `<nav class="app-nav">${[['home','내 방','home'],['closet','꾸미기','closet'],['badges','배지','badge'],['album','성장','growth']].map(([id,label,icon])=>`<button data-page="${id}" class="${page===id?'active':''}">${icons[icon]}${label}</button>`).join('')}</nav>`}
function eventView(d){if(!event)return '';const texts={birth:['안녕, 나는 토토야!','우리의 첫 번째 드라이브를 기다리고 있어.'],recovery:['냠냠, 다시 힘이 나요!','주유를 감지했어요. 배부른 날 배지를 받았어요.'],growth:[`${stages[d.stage].name} 토토로 성장했어요!`,'함께 달린 시간이 새로운 모습이 되었어요.'],summary:['오늘도 함께여서 좋았어.',`오늘 ${num(readValue(provider.value,'tripDistanceKm'))} km · ${num(readValue(provider.value,'tripTimeMin'))}분 함께 달렸어요.`]};const t=texts[event]||texts.birth;return `<div class="event-card ${event}" role="dialog" aria-label="${t[0]}">${pet(d.stage,'happy',state.hat,d.temp)}<h2>${t[0]}</h2><p>${t[1]}</p><button class="primary" id="event-close">좋아!</button></div>`}
function home(d){return roomScreen(d,state,{tab:roomTab,previewStage,previewMood,previewHat,pose,bubble},eventView(d))}
function collection(d){if(page==='closet')return `<div class="section-title"><span class="eyebrow">TOTO'S WARDROBE</span><h1>오늘은 어떤 토토?</h1><p>작은 소품 하나로, 새로운 기분.</p></div><div class="wardrobe"><div class="look-preview">${pet(d.stage,'happy',previewHat,d.temp)}<span>${items.find(x=>x[0]===previewHat)?.[1]||'기본 모습'}</span></div><div><div class="looks">${items.map(([id,name])=>`<button data-hat="${id}" class="look ${previewHat===id?'selected':''}">${pet(d.stage,'happy',id,d.temp)}<strong>${name}</strong><small>${id==='star'?'미리보기':'보유 중'}</small></button>`).join('')}</div><button id="apply-look" class="primary apply-look">이 모습으로 적용하기</button></div></div>`;
if(page==='album')return `<div class="section-title"><span class="eyebrow">OUR LITTLE JOURNEY</span><h1>함께 달리며 자라는 토토.</h1><p>우리의 기록 ${num(d.distance)} km · 현재 ${stages[d.stage].name}</p></div><div class="growth-gallery">${stages.map((s,i)=>`<article class="growth-card ${i===d.stage?'current':''}"><span class="step">0${i+1}</span>${pet(i,'happy','none',18)}<h2>${s.name}</h2><p>${i===0?'처음 만난 날':i===1?'첫 드라이브':num(s.km)+' km'}</p><span class="pill">${i===d.stage?'지금의 토토':i<d.stage?'함께한 모습':'미리보기'}</span></article>`).join('')}</div>`;
return `<div class="section-title"><span class="eyebrow">LITTLE MOMENTS, BIG MEMORIES</span><h1>우리만의 작은 수집.</h1><p>드라이브 속 특별한 순간을 모아봐요.</p></div><div class="badge-grid">${[['first','첫 드라이브','home'],['meal','배부른 날','fuel'],['grow','한 뼘 자란 날','growth'],['cold','추운 날 드라이브','temp']].map(([id,name,ic])=>`<article class="badge-tile ${state.badges.includes(id)?'earned':'unearned'}">${icons[ic]}<h2>${name}</h2><p>${state.badges.includes(id)?'획득했어요':'아직 만나지 않은 순간'}</p></article>`).join('')}</div>`}
function render(){const v=provider.value,d=derive(v,state),actualSplit=!d.restricted&&(split||!d.parked);$('#vehicle').classList.toggle('split',actualSplit);$('#map').hidden=!actualSplit;$('#vehicle-state').textContent=`${v.gear||'—'} · ${d.restricted?'표시 제한':d.parked?'주차 중':'주행 중'}`;$('#layout').textContent=split?'전체 보기':'분할 보기';$('#app').innerHTML=d.restricted?`<div class="locked-view"><h2>지금은 화면을 쉬어갈게요.</h2><p>차량의 사용 가능 상태를 확인하고 있어요.<br>안전하게 주차한 뒤 다시 만나세요.</p></div>`:!d.parked?`<header class="app-header"><h1>토토와 드라이브</h1><span class="chip">${stages[d.stage].name}</span></header><div class="drive-view">${pet(d.stage,d.hungry?'hungry':'happy',state.hat,d.temp)}<div class="drive-icons"><span>${icons.fuel}<small>${num(d.range)}</small></span><span>${icons.temp}<small>${num(d.temp)}°</small></span></div><div class="drive-message">${d.hungry?'주유소에 들러주세요 · '+num(d.range)+' km':'오늘도 안전하게 함께해요.'}</div></div>`:`<div class="app-content">${page==='home'?home(d):collection(d)}</div>${page==='home'?'':nav()}`;$('#gear').value=v.gear;$('#odometer').value=readValue(v,'odometerKm')??'';$('#ux').value=String(v.uxRestricted);$('#range').value=d.range??'';$('#temp').value=d.temp??'';$('#scenarios').innerHTML=scenes.map((s,i)=>`<button class="scene ${scene===i?'active':''}" data-scene="${i}"><b>${s[0]}</b><strong>${s[1]}</strong></button>`).join('')}
function badge(id){addBadge(state,id)}
const motion=new PresentationController({onChange:active=>{pose=active?.type||'idle';if(!active)bubble='';render()},onComplete:done=>{if(done?.payload.summary){event='summary';render()}}});
motion.setParked(last.parked);
provider.addEventListener('change',()=>{
 const d=advance(state,last,provider.value,{detect:!sceneLoading});
 motion.setParked(d.parked);
 if(!d.parked){if(event){state.queuedEvents.unshift(event);event=null}previewMood='idle';previewStage=null;pose='idle';bubble='';clearTimeout(walkTimer)}
 else if(!event)event=takeEvent(state,d);
 if(event){page='home';roomTab='home'}
 save(state);last=d;render();
});
function run(i,{continuous=false}={}){
 motion.stop();scene=i;page='home';roomTab='home';event=null;bubble='';pose='idle';previewMood='idle';previewStage=null;clearTimeout(walkTimer);
 // Scenario selection is an explicit fixture, never interpreted as a refueling signal.
 if(!continuous||i===0)state=initial();previewHat=state.hat;sceneLoading=!continuous||i===0;
 provider.set({...baseline(),...scenes[i][3]});sceneLoading=false;
 const d=derive(provider.value,state);
 if(scenes[i][4]&&(!continuous||i===0)&&event!==scenes[i][4])enqueue(state,scenes[i][4]);
 if(!continuous&&scenes[i][4]==='recovery')badge('meal');
 if(!event)event=takeEvent(state,d);save(state);last=d;
 $('#scenario-status').textContent=`${scenes[i][0]} · ${scenes[i][2]}`;render();
}
const player=new ScenarioPlayer(run,playing=>{$('#play').disabled=playing;$('#stop').disabled=!playing});$('#play').onclick=()=>player.play();$('#stop').onclick=()=>{player.stop();$('#scenario-status').textContent='자동 재생을 정지했어요'};$('#layout').onclick=()=>{split=!split;render()};$('#panel-toggle').onclick=()=>{$('#demo-panel').hidden=!$('#demo-panel').hidden};$('#apply').onclick=()=>{player.stop();const r=$('#range').value,t=$('#temp').value,o=$('#odometer').value,u=$('#ux').value;if((r!==''&&(Number(r)<0||Number(r)>1500))||(t!==''&&(Number(t)<-40||Number(t)>60)))return toast('입력 범위를 확인해 주세요');provider.set({odometerKm:o===''?null:Number(o),gear:$('#gear').value,rangeRemainingKm:r===''?null:Number(r),outsideTempC:t===''?null:Number(t),uxRestricted:u==='null'?null:u==='true',ignition:'ON',dataStatus:{}})};$('#reset').onclick=()=>{player.stop();motion.stop();state=initial();event=null;scene=-1;page='home';roomTab='home';previewStage=null;previewMood='idle';previewHat='none';sceneLoading=true;provider.reset();sceneLoading=false;last=derive(provider.value,state);save(state);$('#scenario-status').textContent='준비됨 · 가상 신호만 사용합니다';toast('시연 상태를 초기화했어요')};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.scene!==undefined){player.stop();run(Number(b.dataset.scene));return}
 const d=derive(provider.value,state);if(!d.parked)return;
 if(b.dataset.roomTab){roomTab=b.dataset.roomTab;page='home';previewHat=state.hat;previewStage=null;previewMood='idle';event=null;render()}
 if(b.dataset.previewStage){previewStage=Number(b.dataset.previewStage);previewMood='idle';render()}
 if(b.dataset.previewMood){previewMood=b.dataset.previewMood;previewStage=previewMood==='idle'?null:3;page='home';render()}
 if(b.id==='music-toggle'){previewMood=previewMood==='music'?'idle':'music';previewStage=previewMood==='music'?3:null;render()}
 if(b.dataset.page){page=b.dataset.page;previewHat=state.hat;event=null;render()}
 if(b.dataset.hat){previewHat=b.dataset.hat;if(roomTab==='shop'){roomTab='home'}render()}
 if(b.id==='apply-look'){if(previewHat==='star'){toast('별빛 소품은 미리보기만 가능해요');return}state.hat=previewHat;save(state);render();toast('토토에게 새 소품을 입혔어요')}
 if(b.id==='event-close'){event=takeEvent(state,d);save(state);render()}
 if(b.id==='summary'){event='summary';page='home';render()}
 if(b.id==='pet'){bubble='헤헤, 다음 드라이브도 함께해!';motion.start('joy',{duration:1800});}
 if(b.id==='walk'||b.id==='note'){bubble=b.id==='note'?'오늘의 기록을 가져올게!':'음악에 맞춰 한 걸음!';motion.start('walking',{duration:2100,payload:{summary:b.id==='note'}});requestAnimationFrame(()=>{if(!motion.parked||motion.active?.type!=='walking')return;const p=$('#pet');if(p)p.style.transform='translateX(45px)'});}

});
$('#next-scene').onclick=()=>player.step();$('#resume-scenes').onclick=()=>player.resume();
window.addEventListener('pagehide',()=>{player.stop();motion.dispose()});
window.addEventListener('pageshow',()=>motion.setParked(derive(provider.value,state).parked));
render();$('#stop').disabled=true;
