// Names stay plain text and are escaped at every HTML boundary.
export function cleanPetName(value){return Array.from(String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,'').trim()).slice(0,12).join('')||'토토'}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function welcome(name,icon){
 const pet=escapeHtml(cleanPetName(name));
 return `<section class="page-content welcome-layout" aria-label="친구와 첫 만남">
 <div class="welcome-visual"><h1>우리의 첫 드라이브가 시작돼요</h1><img src="hmi-assets/onboarding-hero.webp" width="800" height="1000" alt="알 옆에서 손을 흔드는 아기 토토와 작은 자동차" decoding="async"><span class="welcome-caption">첫 만남 · 아기 친구</span></div>
 <div class="welcome-content"><h2>안녕, 나는 <span>${pet}</span>야!</h2><p class="welcome-intro">함께 달리고, 쉬면서<br>우리만의 추억을 쌓아요.</p>
 <ul class="welcome-features"><li><span class="welcome-symbol">${icon('growth')}</span>함께 달릴수록 자라요</li><li><span class="welcome-symbol">${icon('fuel')}</span>차의 상태를 쉽게 알려줘요</li><li><span class="welcome-symbol">${icon('closet')}</span>주차하면 함께 쉬고 꾸며요</li></ul>
 <div class="welcome-name"><label for="pet-name">친구의 이름</label><input id="pet-name" name="petName" type="text" maxlength="24" value="${pet}" autocomplete="off" aria-describedby="pet-name-help"></div>
 <button class="primary welcome-start" data-action="welcome-start">함께 시작하기 ${icon('right')}</button><p id="pet-name-help" class="welcome-help">이름은 내 방에서 다시 바꿀 수 있어요 · 최대 12자</p></div></section>`;
}
