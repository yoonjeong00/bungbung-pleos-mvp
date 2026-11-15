// Names stay plain text and are escaped at every HTML boundary.
export function cleanPetName(value){return Array.from(String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,'').trim()).slice(0,12).join('')||'토토'}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regions={hero:[0,194,780,770],growth:[837,375,142,86],fuel:[848,498,115,82],closet:[840,609,132,88]};
function welcomeArt(kind){const [x,y,w,h]=regions[kind];return `<svg class="welcome-art welcome-art-${kind}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="overflow:hidden" aria-hidden="true"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image href="hmi-assets/welcome-reference.webp" x="0" y="0" width="1448" height="1086"/></svg></svg>`}
export function welcome(name,icon){
 const pet=escapeHtml(cleanPetName(name));
 return `<section class="page-content welcome-layout" aria-label="친구와 첫 만남">
 <div class="welcome-visual"><h1>우리의 첫 드라이브가 시작돼요</h1><div class="welcome-scene" role="img" aria-label="알 옆에서 손을 흔드는 아기 토토와 작은 자동차">${welcomeArt('hero')}</div><span class="welcome-caption">첫 만남 · 아기 ${pet}</span></div>
 <div class="welcome-content"><h2>안녕, 나는 <span>${pet}야</span>!</h2><p class="welcome-intro">함께 달리고, 쉬면서<br>우리만의 추억을 쌓아요.</p>
 <ul class="welcome-features"><li><span class="welcome-symbol">${welcomeArt('growth')}</span>함께 달릴수록 자라요</li><li><span class="welcome-symbol">${welcomeArt('fuel')}</span>차의 상태를 쉽게 알려줘요</li><li><span class="welcome-symbol">${welcomeArt('closet')}</span>주차하면 함께 쉬고 꾸며요</li></ul>
 <div class="welcome-name"><label for="pet-name">친구의 이름</label><input id="pet-name" name="petName" type="text" maxlength="24" value="${pet}" autocomplete="off" aria-describedby="pet-name-help"></div>
 <button class="primary welcome-start" data-action="welcome-start">${pet}와 함께 시작하기 ${icon('right')}</button><p id="pet-name-help" class="welcome-help">이름은 나중에도 바꿀 수 있어요</p></div></section>`;
}
