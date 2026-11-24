/** Reference artwork viewport library.
 * Display pre-extracted regions so WebView cannot expose adjacent screenshot UI.
 * These are opaque screenshot regions, not transparent standalone 3D assets.
 * Keep UI labels/numbers outside these viewports and render them as live HTML.
 */
// 출처 기록용, 화면에서 쓰지 않음. extracted/*.webp를 잘라낸 원본 화면 목록이다.
// 경로는 저장소 맨 위 폴더 기준이다(dist/ 밖이라 앱에는 들어가지 않는다).
export const referenceImages=Object.freeze({
 growth:{src:'design/source/reference-growth.png',width:1678,height:937},
 badges:{src:'design/source/reference-badges.png',width:1678,height:937},
 driving:{src:'design/source/reference-driving.png',width:1687,height:932},
 home:{src:'design/source/reference-home.png',width:1670,height:942},
 recovery:{src:'design/source/reference-recovery.png',width:1678,height:937},
 wardrobe:{src:'design/source/reference-wardrobe.png',width:1678,height:937},
 summary:{src:'design/source/reference-summary.png',width:1678,height:937},
});
// [source, x, y, width, height]. No text, numerals or clickable UI in the crop.
export const crops=Object.freeze({
 bowl:['recovery',1070,608,95,70],
 car:['growth',32,319,270,229],
 stage1:['growth',423,277,164,184],
 stage2:['growth',725,228,188,233],
 stage3:['growth',1048,207,195,254],
 stage4:['growth',1369,172,226,289],
 rain:['driving',1143,198,374,391],
 wardrobe:['wardrobe',341,194,539,451],
 recovery:['recovery',329,192,651,593],
 summary:['summary',329,190,650,597],
 headphones:['wardrobe',946,237,158,140],
 scarf:['wardrobe',1182,242,164,136],
 cap:['wardrobe',1422,262,167,115],
 flower:['wardrobe',959,461,151,113],
 star:['wardrobe',1211,468,111,106],
 knit:['wardrobe',1420,452,138,122],
 'badge-first':['badges',371,217,176,176],
 'badge-meal':['badges',618,218,179,176],
 'badge-grow':['badges',865,217,174,176],
 'badge-cold':['badges',372,471,171,168],
 'badge-time':['badges',618,471,176,169],
 'badge-mileage':['badges',864,472,174,169],
 logo:['wardrobe',345,60,66,62],
 map:['driving',536,233,533,410],
});
const escapeAttr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function art(name,className='',label=''){
 const crop=crops[name];if(!crop)throw new RangeError(`Unknown HMI artwork: ${name}`);
 const [,x,y,width,height]=crop;
 return `<img class="hmi-art ${escapeAttr(className)}" data-art="${escapeAttr(name)}" src="hmi-assets/extracted/${name}.webp" width="${width}" height="${height}" alt="${escapeAttr(label)}" decoding="async">`;
}
