export const layoutKey='bungbung-layout-v1';
export const targets={pet:'.scene-pet',level:'.level-dock',weather:'.room-weather',message:'.scene-message',panel:'.room-side',nav:'.room-nav',header:'.room-header'};
export const freeTargets=['pet','level','weather','message'];
export const freshLayout=()=>({version:1,ratio:70,roomHeight:0,sideLeft:false,hidden:[],boxes:{}});
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function normalizeLayout(input){
 if(!input||input.version!==1)throw Error('붕붕이 배치 파일 버전이 맞지 않아요.');
 const out=freshLayout();
 out.ratio=Number.isFinite(input.ratio)?clamp(input.ratio,45,85):70;
 out.roomHeight=Number.isFinite(input.roomHeight)?(input.roomHeight===0?0:clamp(input.roomHeight,280,720)):0;
 out.sideLeft=input.sideLeft===true;
 out.hidden=Array.isArray(input.hidden)?[...new Set(input.hidden.filter(k=>k in targets))]:[];
 for(const k of freeTargets){const b=input.boxes?.[k];if(!b||!['x','y','w','h'].every(p=>Number.isFinite(b[p])))continue;const w=clamp(b.w,5,100),h=clamp(b.h,4,100);out.boxes[k]={x:clamp(b.x,0,100-w),y:clamp(b.y,0,100-h),w,h}}
 return out;
}
export function changeBox(box,dx,dy,resize=false){const b={...box};if(resize){b.w=clamp(b.w+dx,5,100-b.x);b.h=clamp(b.h+dy,4,100-b.y)}else{b.x=clamp(b.x+dx,0,100-b.w);b.y=clamp(b.y+dy,0,100-b.h)}return b}
