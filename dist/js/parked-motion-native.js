import {originOf} from './vehicle.js?v=20261128-motion-r1';
import {signalValid,realMaxAgeMs} from './logic.js?v=20261128-motion-r1';
const required=['gear','uxRestricted'];
export function nativeParkedDeadline(v,s,now=Date.now()){
 if(s?.enabled!==true||s.home!==true||s.hidden||s.reduced||
    s.parked!==true||s.restricted||s.dangerous||v.gear!=='P'||v.uxRestricted!==false)return 0;
 if(!required.every(k=>originOf(v,k)==='real'&&signalValid(v,k,now)))return 0;
 const deadline=Math.min(...required.map(k=>v.receivedAt[k]+realMaxAgeMs(k)));
 return deadline>now?deadline:0;
}
