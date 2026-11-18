// Recording controls change the mock scenario only; never synthesize SDK callbacks.
export function recordingCommand(event){
 if(event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return null;
 if(event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return null;
 return ({Digit1:'scene:0',Digit2:'scene:1',Digit3:'scene:2',Digit4:'scene:3',Digit5:'scene:4',Digit7:'scene:6',Digit0:'scene:9',KeyF:'fullscreen',KeyM:'panel',Escape:'close'})[event.code]||null;
}
export function installRecording({doc,runScene,pause,togglePanel,fullscreen}){
 const panel=doc.querySelector('#demo-panel');
 const button=doc.querySelector('#recording-fullscreen');
 button.hidden=false;button.onclick=fullscreen;
 doc.addEventListener('keydown',event=>{
  const command=recordingCommand(event);if(!command)return;
  event.preventDefault();
  if(command==='fullscreen'){fullscreen();return;}
  if(command==='panel'){pause();togglePanel();return;}
  panel.hidden=true;
  if(command==='close')return;
  pause();runScene(Number(command.split(':')[1]),{continuous:true});
 });
}
