// TEAM 1: mock vehicle provider. Replace adapter, keep payload contract.
// 붕붕이 상황 기준값 (임시값). 기준을 바꿀 때는 여기만 고친다.
export const FUEL_THRESHOLDS=Object.freeze({
 hungryKm:150, // 이 값 미만이면 '배고픔'
 lowFuelKm:50, // 이 값 미만이면 '연료 부족'
});
// safetyWarnings 항목 형식: {id:'brake', level:'yellow'|'red', label:'브레이크 경고'}
export const WARNING_LEVELS=Object.freeze(['yellow','red']);
export const baseline=()=>({uxRestricted:false,gear:'P',ignition:'ON',odometerKm:10180,tripDistanceKm:32,tripTimeMin:41,rangeRemainingKm:420,outsideTempC:18,tireWarning:false,safetyWarnings:[],dataStatus:{},isMock:true});
const numericLimits={odometerKm:[0,999999],tripDistanceKm:[0,2000],tripTimeMin:[0,1440],rangeRemainingKm:[0,1500],outsideTempC:[-40,60]};
const enums={gear:['P','R','N','D'],ignition:['OFF','ACC','ON','START'],uxRestricted:[true,false],tireWarning:[true,false]};
const cleanWarnings=list=>Array.isArray(list)&&list.every(w=>w&&WARNING_LEVELS.includes(w.level))?list.map(w=>({id:String(w.id??''),level:w.level,label:String(w.label??'')})):null;
export class VehicleProvider extends EventTarget {
 constructor(snapshot=null){super();this._value=baseline();this.sequence=0;this.set(snapshot||{},false)}
 get value(){return structuredClone(this._value)}
 set(patch,notify=true){
  const next={...this._value,dataStatus:{...this._value.dataStatus},receivedAt:{...this._value.receivedAt}};
  for(const key of [...Object.keys(numericLimits),...Object.keys(enums)]){
   if(Object.hasOwn(patch,key)){
    const v=patch[key],bounds=numericLimits[key];
    const valid=v===null||(bounds?Number.isFinite(v)&&v>=bounds[0]&&v<=bounds[1]:enums[key].includes(v));
    next[key]=valid?v:null;next.dataStatus[key]=valid?(v===null?'LOADING':'OK'):'ERROR';next.receivedAt[key]=Date.now();
   }
   if(Object.hasOwn(patch.dataStatus||{},key))next.dataStatus[key]=['OK','LOADING','NO_PERMISSION','UNSUPPORTED','ERROR'].includes(patch.dataStatus[key])?patch.dataStatus[key]:'ERROR';
  }
  if(Object.hasOwn(patch,'safetyWarnings')){
   const list=cleanWarnings(patch.safetyWarnings);
   next.safetyWarnings=list;next.dataStatus.safetyWarnings=list?'OK':'ERROR';next.receivedAt.safetyWarnings=Date.now();
  }
  next.isMock=true;next.sequence=++this.sequence;this._value=next;
  if(notify)this.dispatchEvent(new CustomEvent('change',{detail:this.value}));
 }
 reset(){this._value=baseline();this.set(baseline())}
 subscribe(listener){const handler=e=>listener(e.detail);this.addEventListener('change',handler);return()=>this.removeEventListener('change',handler)}
}
export const scenes=[
['S1','첫 만남','알에서 태어나는 작은 친구',{...baseline(),odometerKm:10000,tripDistanceKm:0,tripTimeMin:0},'birth'],
['S2','출발','정지 이미지로 전환',{gear:'D',uxRestricted:false,ignition:'ON',odometerKm:10180,tripDistanceKm:12,tripTimeMin:18,dataStatus:{}},null],
['S3','배고픔','남은 거리 49 km',{gear:'D',uxRestricted:false,rangeRemainingKm:49},null],
['S4','주유 회복','주차 후 배부른 붕붕이',{gear:'P',rangeRemainingKm:620},'recovery'],
['S5','첫 성장','누적 300 km 달성',{gear:'P',odometerKm:10300,tripDistanceKm:32,tripTimeMin:41},'growth'],
['S6','겨울 아침','목도리를 두른 친구',{gear:'P',outsideTempC:-3,uxRestricted:false,dataStatus:{}},null],
['S7','신호 대기','D에서는 상호작용 불가',{gear:'D',tripTimeMin:44,uxRestricted:false},null],
['S8','제한 신호 없음','보수적으로 화면 제한',{gear:'P',uxRestricted:null},null],
['S9','미지원 데이터','연료 정보를 추정하지 않음',{gear:'P',uxRestricted:false,rangeRemainingKm:null,dataStatus:{rangeRemainingKm:'UNSUPPORTED'}},null],
['S10','하루 마무리','오늘의 동행 기록',{gear:'P',uxRestricted:false,ignition:'ON',rangeRemainingKm:420,dataStatus:{},tripDistanceKm:32,tripTimeMin:41},'summary']];
export class ScenarioPlayer {
 constructor(run,changed,{schedule=setTimeout,cancel=clearTimeout,interval=6500}={}){Object.assign(this,{run,changed,schedule,cancel,interval});this.timer=null;this.index=0;this.playing=false;this.generation=0}
 stop(){this.generation++;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.playing=false;this.changed(false)}
 reset(){this.stop();this.index=0}
 seek(index){this.stop();this.index=Math.max(0,Math.min(5,Number.isInteger(index)?index:0))}
 play(){this.reset();this.resume()}
 pause(){this.stop()}
 resume(){if(this.playing||this.index>=5)return;this.playing=true;this.changed(true);const generation=++this.generation;const next=()=>{if(!this.playing||generation!==this.generation)return;this.run(this.index++,{continuous:true});if(this.index<5)this.timer=this.schedule(next,this.interval);else{this.timer=null;this.playing=false;this.changed(false)}};next()}
 step(){this.stop();if(this.index<5)this.run(this.index++,{continuous:true})}
}
