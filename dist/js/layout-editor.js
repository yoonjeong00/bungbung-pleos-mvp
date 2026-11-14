import {layoutKey,targets,freeTargets,freshLayout,normalizeLayout,changeBox,clamp} from './layout-model.js';
const names={pet:'토토',level:'레벨바',weather:'날씨',message:'말풍선',panel:'오른쪽 패널',nav:'하단 메뉴',header:'방 제목'};
let layout=freshLayout(),history=[],future=[],selected='pet',active=false,dirty=false,drag=null,framePending=false;
try{const raw=localStorage.getItem(layoutKey);if(raw)layout=normalizeLayout(JSON.parse(raw))}catch{}
const $=s=>document.querySelector(s),clone=x=>structuredClone(x);
const toggle=document.createElement('button');toggle.id='layout-edit-toggle';toggle.textContent='레이아웃 편집';$('.bench-actions').append(toggle);
const toolbar=document.createElement('section');toolbar.id='layout-editor';toolbar.hidden=true;toolbar.setAttribute('aria-label','레이아웃 편집 도구');
toolbar.innerHTML=`<div class="le-top"><strong>레이아웃 편집</strong><span id="le-status" role="status">주차 중 내 방에서 편집할 수 있어요.</span><button id="le-close">편집 종료</button></div><div class="le-controls"><label>선택<select id="le-target">${Object.entries(names).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label><label>방 비율 <input id="le-ratio" type="range" min="45" max="85"><output id="le-ratio-value"></output></label><label>방 높이 <input id="le-height" type="number" min="280" max="720" step="10" placeholder="자동"></label><button id="le-auto">높이 자동</button><button id="le-swap">패널 좌우 바꾸기</button><button id="le-hide">선택 숨기기</button><button id="le-restore">모두 복원</button></div><div class="le-controls"><label>X %<input id="le-x" type="number" step="1"></label><label>Y %<input id="le-y" type="number" step="1"></label><label>너비 %<input id="le-w" type="number" step="1"></label><label>높이 %<input id="le-h" type="number" step="1"></label><button id="le-undo">↶ 실행 취소</button><button id="le-redo">↷ 다시 실행</button><button id="le-reset">기본 배치</button><button id="le-save">이 기기에 저장</button><button id="le-export">JSON 내보내기</button><button id="le-import">JSON 불러오기</button><input id="le-file" type="file" accept="application/json,.json" hidden></div><p>방 안 요소: 드래그로 이동 · 우측 아래 손잡이로 크기 조절. 큰 섹션: 비율·높이·좌우 배치로 조절. 숨김은 복원할 수 있어요. 주행 화면에는 편집 배치를 적용하지 않아요.</p>`;
document.body.append(toolbar);
const outline=document.createElement('div');outline.id='layout-selection';outline.hidden=true;outline.innerHTML='<span id="le-label"></span><button id="le-resize" aria-label="선택 요소 크기 조절">↘</button>';document.body.append(outline);
const divider=document.createElement('div');divider.id='layout-divider';divider.hidden=true;divider.setAttribute('aria-label','방과 패널 비율 조절');divider.title='좌우로 끌어 비율 조절';document.body.append(divider);
function available(){return !!$('.room-scene')&&$('#vehicle-state')?.textContent.includes('주차 중')}
function status(t){$('#le-status').textContent=t}
function remember(){history.push(clone(layout));if(history.length>50)history.shift();future=[];dirty=true}
function commit(fn){remember();fn();layout=normalizeLayout(layout);apply();controls();status('수정됨 · 저장 버튼을 누르면 다음 실행에도 유지돼요.')}
function boxFor(id){if(layout.boxes[id])return layout.boxes[id];const el=$(targets[id]),room=$('.room-scene');if(!el||!room)return null;const r=room.getBoundingClientRect(),b=el.getBoundingClientRect();if(!r.width||!r.height)return null;return{x:(b.left-r.left)/r.width*100,y:(b.top-r.top)/r.height*100,w:b.width/r.width*100,h:b.height/r.height*100}}
function apply(){
 const room=$('.room-scene'),grid=$('.room-layout');if(!room||!grid){outline.hidden=true;return}
 const narrow=grid.getBoundingClientRect().width<520;
 grid.style.gridTemplateColumns=narrow||layout.hidden.includes('panel')?'minmax(0,1fr)':layout.sideLeft?`minmax(170px,${100-layout.ratio}fr) minmax(0,${layout.ratio}fr)`:`minmax(0,${layout.ratio}fr) minmax(170px,${100-layout.ratio}fr)`;
 room.style.height=layout.roomHeight?`${layout.roomHeight}px`:'';
 room.style.minHeight=layout.roomHeight?`${layout.roomHeight}px`:'';
 const panel=$('.room-side');if(panel)panel.style.order=layout.sideLeft&&!narrow?'-1':'';
 for(const [id,selector] of Object.entries(targets)){const el=$(selector);if(!el)continue;el.style.display=layout.hidden.includes(id)?'none':'';
  if(freeTargets.includes(id)){for(const key of ['left','top','right','bottom','width','height','transform','maxWidth'])el.style[key]='';const b=layout.boxes[id];if(b){Object.assign(el.style,{left:b.x+'%',top:b.y+'%',width:b.w+'%',height:b.h+'%',right:'auto',bottom:'auto',transform:'none',maxWidth:'none'})}}
 }
 refreshFrame();
}
function controls(){
 $('#le-target').value=selected;$('#le-ratio').value=layout.ratio;$('#le-ratio-value').textContent=`${Math.round(layout.ratio)} : ${100-Math.round(layout.ratio)}`;$('#le-height').value=layout.roomHeight||'';
 const b=freeTargets.includes(selected)?boxFor(selected):null;
 for(const k of ['x','y','w','h']){const input=$('#le-'+k);input.disabled=!b||layout.hidden.includes(selected);input.value=b?Math.round(b[k]):''}
 $('#le-hide').textContent=layout.hidden.includes(selected)?'선택 다시 표시':'선택 숨기기';$('#le-undo').disabled=!history.length;$('#le-redo').disabled=!future.length;
}
function refreshFrame(){const room=$('.room-scene'),panel=$('.room-side'),grid=$('.room-layout');divider.hidden=!active||!available()||layout.hidden.includes('panel')||!grid||grid.getBoundingClientRect().width<520;if(!divider.hidden){const r=room.getBoundingClientRect(),p=panel.getBoundingClientRect();Object.assign(divider.style,{left:(layout.sideLeft?(p.right+r.left)/2:(r.right+p.left)/2)-6+'px',top:r.top+'px',height:Math.min(r.height,p.height)+'px'})}const el=$(targets[selected]);outline.hidden=!active||!available()||!el||layout.hidden.includes(selected);if(outline.hidden)return;const r=el.getBoundingClientRect();Object.assign(outline.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});$('#le-label').textContent=names[selected];$('#le-resize').hidden=!freeTargets.includes(selected)}
function setActive(value){active=value&&available();toolbar.hidden=!active;document.body.classList.toggle('layout-editing',active);toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'편집 중':'레이아웃 편집';if(active){$('#stop')?.click();controls();status(dirty?'저장하지 않은 변경이 있어요.':'요소를 선택한 뒤 드래그해 보세요.')}refreshFrame()}
toggle.onclick=()=>{if(!available()){status('주차 중 내 방에서 열어주세요.');toggle.textContent='내 방·주차 상태에서 편집';return}setActive(!active)};$('#le-close').onclick=()=>setActive(false);
$('#le-target').onchange=e=>{selected=e.target.value;controls();refreshFrame()};
$('#le-ratio').onchange=e=>commit(()=>layout.ratio=Number(e.target.value));
$('#le-height').onchange=e=>commit(()=>layout.roomHeight=e.target.value===''?0:Number(e.target.value));
$('#le-auto').onclick=()=>commit(()=>layout.roomHeight=0);
$('#le-swap').onclick=()=>commit(()=>layout.sideLeft=!layout.sideLeft);
$('#le-hide').onclick=()=>commit(()=>layout.hidden=layout.hidden.includes(selected)?layout.hidden.filter(k=>k!==selected):[...layout.hidden,selected]);
$('#le-restore').onclick=()=>commit(()=>layout.hidden=[]);
for(const k of ['x','y','w','h'])$('#le-'+k).onchange=e=>{const b=boxFor(selected),n=Number(e.target.value);if(b&&Number.isFinite(n))commit(()=>layout.boxes[selected]={...b,[k]:n})};
$('#le-undo').onclick=()=>{if(!history.length)return;future.push(clone(layout));layout=history.pop();dirty=true;apply();controls();status('실행 취소했어요. 저장하면 반영돼요.')};
$('#le-redo').onclick=()=>{if(!future.length)return;history.push(clone(layout));layout=future.pop();dirty=true;apply();controls()};
$('#le-reset').onclick=()=>commit(()=>layout=freshLayout());
$('#le-save').onclick=()=>{try{localStorage.setItem(layoutKey,JSON.stringify(layout));dirty=false;status('이 브라우저에 배치를 저장했어요. 팀 공유는 JSON을 내보내세요.')}catch{status('기기 저장에 실패했어요. JSON으로 내보내 주세요.')}};
$('#le-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(layout,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='bungbung-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('현재 배치를 JSON으로 내보냈어요.')};
$('#le-import').onclick=()=>$('#le-file').click();
$('#le-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('100KB 이하의 배치 파일을 선택해 주세요.');const imported=normalizeLayout(JSON.parse(await file.text()));commit(()=>layout=imported);status('배치를 불러왔어요. 저장하면 다음 실행에도 유지돼요.')}catch(err){status('불러오기 실패: '+err.message)}e.target.value=''};
function startDrag(e,resize,id=selected){if(!active||!available()||!freeTargets.includes(id)||e.button!==0)return;const b=boxFor(id);if(!b)return;selected=id;remember();drag={id,resize,box:clone(b),x:e.clientX,y:e.clientY,room:$('.room-scene').getBoundingClientRect()};document.body.classList.add('layout-dragging');e.preventDefault();e.stopPropagation();controls()}
$('#le-resize').onpointerdown=e=>startDrag(e,true);
divider.onpointerdown=e=>{if(e.button!==0||!active)return;remember();drag={ratio:layout.ratio,x:e.clientX,grid:$('.room-layout').getBoundingClientRect(),split:true};e.preventDefault();document.body.classList.add('layout-dragging')};
$('#app').addEventListener('pointerdown',e=>{if(!active)return;for(const [id,sel] of Object.entries(targets)){if(e.target.closest(sel)){selected=id;controls();refreshFrame();startDrag(e,false,id);e.stopPropagation();break}}},true);
$('#app').addEventListener('click',e=>{if(active){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('pointermove',e=>{if(!drag)return;if(drag.split){layout.ratio=clamp(drag.ratio+(e.clientX-drag.x)/drag.grid.width*100*(layout.sideLeft?-1:1),45,85);apply();controls();return}layout.boxes[drag.id]=changeBox(drag.box,(e.clientX-drag.x)/drag.room.width*100,(e.clientY-drag.y)/drag.room.height*100,drag.resize);apply()});
function endDrag(){if(!drag)return;drag=null;layout=normalizeLayout(layout);document.body.classList.remove('layout-dragging');controls();status('위치·크기를 수정했어요. 저장 버튼으로 보관하세요.')}
window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
window.addEventListener('keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape')setActive(false);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'#le-redo':'#le-undo').click()}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
window.addEventListener('scroll',refreshFrame,true);window.addEventListener('resize',()=>{apply();controls()});
const observer=new MutationObserver(()=>{if(framePending)return;framePending=true;requestAnimationFrame(()=>{framePending=false;if(!available()){endDrag();setActive(false)}apply();if(active)controls()})});observer.observe($('#app'),{childList:true,subtree:true});
apply();
