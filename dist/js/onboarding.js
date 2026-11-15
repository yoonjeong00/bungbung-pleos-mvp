// Names stay plain text and are escaped at every HTML boundary.
export function cleanPetName(value){return Array.from(String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,'').trim()).slice(0,12).join('')||'토토'}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function petParticle(name,withFinal,withoutFinal){const last=Array.from(cleanPetName(name)).at(-1).codePointAt(0);return last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0?withFinal:withoutFinal}
const regions={hero:[0,194,780,770],growth:[837,375,142,86],fuel:[848,498,115,82],closet:[840,609,132,88]};
function welcomeArt(kind){const [,,w,h]=regions[kind];return `<img class="welcome-art welcome-art-${kind}" src="hmi-assets/extracted/welcome-${kind}.webp" width="${w}" height="${h}" alt="" decoding="async">`}
export function welcome(name,icon,{rename=false}={}){
 const pet=escapeHtml(cleanPetName(name)),withPet=pet+petParticle(name,'과','와');
 return `<section class="page-content welcome-layout" aria-label="친구와 첫 만남">
 <div class="welcome-visual"><h1>${rename?'친구의 이름을 바꿔요':'우리의 첫 드라이브가 시작돼요'}</h1><div class="welcome-scene" role="img" aria-label="알 옆에서 손을 흔드는 아기 토토와 작은 자동차">${welcomeArt('hero')}</div><span class="welcome-caption">첫 만남 · 아기 ${pet}</span></div>
 <div class="welcome-content"><h2>안녕, 나는 <span>${pet}${petParticle(name,'이야','야')}</span>!</h2><p class="welcome-intro">함께 달리고, 쉬면서<br>우리만의 추억을 쌓아요.</p>
 <ul class="welcome-features"><li><span class="welcome-symbol">${welcomeArt('growth')}</span>함께 달릴수록 자라요</li><li><span class="welcome-symbol">${welcomeArt('fuel')}</span>차의 상태를 쉽게 알려줘요</li><li><span class="welcome-symbol">${welcomeArt('closet')}</span>주차하면 함께 쉬고 꾸며요</li></ul>
 <div class="welcome-name"><label for="pet-name">친구의 이름</label><input id="pet-name" name="petName" type="text" maxlength="12" value="${pet}" autocomplete="off" aria-describedby="pet-name-help"></div>
 <button class="primary welcome-start" data-action="welcome-start">${rename?'이름 저장':withPet+' 함께 시작하기'} ${icon('right')}</button>${rename?'<button class="secondary" data-action="back">취소</button>':''}<p id="pet-name-help" class="welcome-help">최대 12자 · 이름은 나중에도 바꿀 수 있어요</p></div></section>`;
}
