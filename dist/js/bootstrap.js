// Apply the app shell before loading modules; report initialization failures without
// deleting saved pets or replacing a failed initialization with a success screen.
const params=new URLSearchParams(location.search);
if(params.has('android')||params.has('embedded'))document.body.classList.add('embedded');
if(params.has('android'))document.body.classList.add('android-app');
if(params.get('record')==='1')document.body.classList.add('recording-mode');
import('./hmi-app.js?v=20261125-r3').catch(error=>{
 console.error('Bungbung initialization failed',error);
 const host=document.querySelector('#screen-body');
 if(!host)return;
 host.replaceChildren();
 const panel=document.createElement('section');
 panel.style.cssText='grid-column:1/-1;padding:32px;overflow:auto;background:#f5f3ff;color:#252438;';
 const title=document.createElement('h1');title.textContent='화면을 불러오지 못했어요';
 const help=document.createElement('p');help.textContent='저장된 토토는 삭제하지 않았어요. 아래 오류 내용을 전달해 주세요.';
 const detail=document.createElement('pre');detail.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px';
 detail.textContent='UI r7 · '+String(error?.stack||error?.message||error);
 const retry=document.createElement('button');retry.className='primary';retry.textContent='다시 불러오기';retry.addEventListener('click',()=>location.reload());
 panel.append(title,help,detail,retry);host.append(panel);
});
