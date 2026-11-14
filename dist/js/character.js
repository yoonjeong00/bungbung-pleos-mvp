// TOTO: user-supplied concept, generated transparent growth sheet.
const frames={1:[197,270,290,255],2:[740,103,365,421],3:[78,648,430,530],4:[687,622,493,554]};
export function pet(stage=1,mood='happy',hat='none',temp=18){
 const names=['알','아기','어린이','청소년','어른'];
 const poseFrames={hungry:[180,85,335,510],recovery:[720,85,390,510],music:[135,646,420,545],rain:[730,646,355,545]};
 const variant=stage===3&&poseFrames[mood];
 const art=variant?`<svg x="4" y="4" width="92" height="92" viewBox="${variant.join(' ')}" preserveAspectRatio="xMidYMax meet"><image href="bungbung-assets/toto-poses.png" width="1254" height="1254"/></svg>`:stage===0?`<ellipse cx="50" cy="89" rx="21" ry="4" fill="#b9a2d029"/><path d="M50 15C30 15 22 51 22 65a28 28 0 0 0 56 0C78 51 70 15 50 15" fill="#fffaf1" stroke="#6a513d" stroke-width="2.4"/><path d="m24 61 12-6 8 9 10-9 10 7 12-6" fill="none" stroke="#c6afd9" stroke-width="2"/><path d="M43 35h13v15h-5V39h-8v17h-5V35z" fill="#b69adc"/>`:`<svg x="4" y="4" width="92" height="92" viewBox="${frames[stage].join(' ')}" preserveAspectRatio="xMidYMax meet"><image href="bungbung-assets/toto-growth.png" width="1254" height="1254"/></svg>`;
 let ornament='';
 if(stage>0){
  if(hat==='cap')ornament='<path d="M20 17q5-12 19-6l9 9-26 4z" fill="#99c9bc" stroke="#514734" stroke-width="1.2"/><path d="m33 9 2-4" stroke="#514734" stroke-width="2"/>';
  if(hat==='flower')ornament='<g transform="translate(23 32)"><path d="M0-8Q7-11 7-4Q15-2 8 5Q7 12 0 8Q-8 12-9 4Q-15-2-7-4Q-8-11 0-8" fill="#c3a9f6" stroke="#72549c" stroke-width="1"/><circle r="3" fill="#ffdf79"/></g>';
  if(hat==='scarf'||temp!==null&&temp<=0)ornament+='<path d="M34 66q18 7 35-1v7q-18 6-35 0zM62 71h8v17h-8z" fill="#a18adc" stroke="#67537d" stroke-width="1.2"/>';
  if(hat==='star')ornament+='<path d="m78 8 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#f9cf63" stroke="#85672c" stroke-width="1.2"/>';
 }
 return `<svg viewBox="0 0 100 100" class="pet-svg stage-${stage}" role="img" aria-label="토토 ${names[stage]}${mood==='hungry'?' · 연료 부족':''}">${art}${ornament}</svg>`;
}
let iconId=0;
function drawIcon(path){const id='bb-icon-'+(++iconId);return `<svg class="ui-icon" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="${id}" x2=".8" y2="1"><stop stop-color="#bba3ff"/><stop offset="1" stop-color="#7140ed"/></linearGradient></defs><rect x="3" y="5" width="42" height="40" rx="13" fill="#7140ed" opacity=".09"/><g fill="url(#${id})" stroke="#7140ed" stroke-width="1.4" stroke-linejoin="round">${path}</g></svg>`}
export const icons={home:drawIcon('<path d="M10 23L24 11l14 12v15H28V27h-8v11H10z"/>'),closet:drawIcon('<path d="M17 12l7 4 7-4 10 9-7 7-3-3v15H17V25l-3 3-7-7z"/>'),badge:drawIcon('<path d="M17 29l-3 13 10-5 10 5-3-13" fill="#ccbaff"/><circle cx="24" cy="22" r="13"/><path d="m24 13 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff" stroke="none"/>'),album:drawIcon('<rect x="10" y="9" width="29" height="31" rx="4"/><path d="M15 9v31" stroke="white"/><rect x="20" y="16" width="13" height="14" rx="2" fill="#efe7ff"/><path d="m21 28 4-5 3 3 4-5" fill="none"/>'),fuel:drawIcon('<rect x="11" y="10" width="22" height="30" rx="4"/><path d="M33 19h5v14q0 5 4 4V19l-5-5" fill="none" stroke-width="3"/><rect x="16" y="15" width="12" height="9" rx="2" fill="#efe7ff"/>'),growth:drawIcon('<path d="M24 39V24" stroke-width="3"/><path d="M24 26C7 28 8 12 8 12s17-2 16 14zm0-5C23 7 39 8 39 8s1 16-15 13z"/><path d="M14 39h20" stroke-width="3"/>'),temp:drawIcon('<path d="M19 27V12a5 5 0 0 1 10 0v15a10 10 0 1 1-10 0z"/><path d="M24 15v17" stroke="white" stroke-width="3"/><circle cx="24" cy="34" r="4" fill="white"/>')};

// Compact pixel-compatible UI family: consistent stepped shapes and dark outlines.
const pixelIcon=(body)=>`<svg class="ui-icon pixel-icon" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges"><g stroke="#574b43" stroke-width="1.5" stroke-linejoin="miter">${body}</g></svg>`;
Object.assign(icons,{
 home:pixelIcon('<path d="M3 15 16 4l13 11h-4v13H7V15z" fill="#c9ddc6"/><path d="M13 28V18h7v10" fill="#fffaf1"/>'),
 food:pixelIcon('<path d="m8 16 3-7 5 3 6-3 2 8" fill="#eab075"/><path d="m13 10 1-6 4 1 1 6" fill="#94b58c"/><path d="M4 16h24l-4 11H8z" fill="#f9f7ed"/><path d="M6 20h20" stroke="#8fad94"/>'),
 music:pixelIcon('<path d="M6 18V9l5-5h10l5 5v9" fill="none" stroke="#d2b770" stroke-width="4"/><path d="M4 15h6v12H4zm18 0h6v12h-6z" fill="#f1ce7e"/>'),
 headphones:pixelIcon('<path d="M6 18V9l5-5h10l5 5v9" fill="none" stroke="#d2b770" stroke-width="4"/><path d="M4 15h6v12H4zm18 0h6v12h-6z" fill="#f1ce7e"/>'),
 shop:pixelIcon('<path d="M6 12h20v16H6z" fill="#fffaf1"/><path d="M3 13 7 5h18l4 8v4H3z" fill="#b3cdb4"/><path d="M12 28V20h8v8" fill="#d7c9ae"/>'),
 growth:pixelIcon('<path d="M4 25h6v-6H4zm9 0h6V12h-6zm9 0h6V5h-6z" fill="#93b599"/>'),
 sun:pixelIcon('<path d="M11 9h10v3h3v9h-3v3H11v-3H8v-9h3z" fill="#efd38d"/><path d="M16 1v4m0 23v3M1 16h4m23 0h3M4 4l3 3m18 18 3 3m0-24-3 3M7 25l-3 3" fill="none"/>'),
 rain:pixelIcon('<path d="M5 19V11h5V6h11v5h6v8z" fill="#d0e1e6"/><path d="m9 23-2 5m10-5-2 5m10-5-2 5" stroke="#7fabbc" stroke-width="3"/>'),
 cap:pixelIcon('<path d="M3 17 7 11l7-3h9l6 8-3 6H5z" fill="#a3baa1"/><path d="m17 8 2-5"/>'),
 flower:pixelIcon('<path d="M12 4h8v6h7v8h-7v9h-8v-9H5v-8h7z" fill="#d8bddb"/><path d="M12 11h8v8h-8z" fill="#f3d485"/>'),
 scarf:pixelIcon('<path d="M5 8h22v8H5zm14 8h7v13h-7z" fill="#e3c884"/><path d="M5 12h22M19 25h7" fill="none"/>'),
 star:pixelIcon('<path d="m16 3 4 8 9 2-7 7 1 9-7-4-7 4 1-9-7-7 9-2z" fill="#ead18d"/>')
});
