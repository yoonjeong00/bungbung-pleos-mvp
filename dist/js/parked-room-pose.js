// Pure browser QA motion sampler. Does not read vehicle data or self-enable.
export const artwork = Object.freeze({w:1536,h:1024,left:785,top:125,width:481,height:750,pivotX:992.71,pivotY:850.97});
const clamp=(n)=>Math.max(0,Math.min(1,n));
const ramp=(n)=>{const x=clamp(n);return x*x*(3-2*x)};
export function permitsStudy(s) {
  return s?.explicitBrowserSimulation===true && s.native===false && s.gear==='P' && s.signalFresh===true && s.uxRestricted===false && s.seriousWarning===false && s.foreground===true && s.reducedMotion===false;
}
const rest = Object.freeze({sway:0,smile:0,eyelid:null});
export function pose(ms, s) {
  if (!permitsStudy(s) || !Number.isFinite(ms) || ms<0 || ms>=7000 || s.blinkActive!==false || s.tapActive!==false) return rest;
  const t=ms/1000;
  const sway=1.03*Math.sin(2*Math.PI*(t-.4)/2.55)*ramp((t-.4)/.6)*ramp((6.6-t)/.7);
  const smile=ramp((t-1.05)/.7)*ramp((5.92-t)/.65);
  const i=Math.max(0,Math.min(167,Math.round(ms*24/1000)));
  const dt=Math.min(Math.abs(i-54),Math.abs(i-113));
  // Original 24fps sequence: open -> 16% -> 50% -> 84% -> closed -> reverse.
  const eyelid=dt>4?null:Math.min(3,4-dt);
  return {sway:sway||0,smile,eyelid};
}
