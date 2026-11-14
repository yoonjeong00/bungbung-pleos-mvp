/** Reference artwork viewport library.
 * Original PNGs are copied byte-for-byte; SVG viewBox clips display only.
 * These are opaque screenshot regions, not transparent standalone 3D assets.
 * Keep UI labels/numbers outside these viewports and render them as live HTML.
 */
export const referenceImages=Object.freeze({
 growth:{src:'hmi-assets/reference-growth.png',width:1678,height:937},
 badges:{src:'hmi-assets/reference-badges.png',width:1678,height:937},
 driving:{src:'hmi-assets/reference-driving.png',width:1687,height:932},
 home:{src:'hmi-assets/reference-home.png',width:1670,height:942},
 recovery:{src:'hmi-assets/reference-recovery.png',width:1678,height:937},
 wardrobe:{src:'hmi-assets/reference-wardrobe.png',width:1678,height:937},
 summary:{src:'hmi-assets/reference-summary.png',width:1678,height:937},
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
 const [source,x,y,width,height]=crop,ref=referenceImages[source];
 const accessible=label?`role="img" aria-label="${escapeAttr(label)}"`:'aria-hidden="true"';
 return `<svg xmlns="http://www.w3.org/2000/svg" class="hmi-art ${escapeAttr(className)}" data-art="${escapeAttr(name)}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="${name==='map'?'xMidYMid slice':'xMidYMid meet'}" style="aspect-ratio:${width}/${height};overflow:hidden" ${accessible}><defs><clipPath id="crop-${name}-${className.replace(/[^a-z0-9]/gi,'')}">${name==='rain'?'<path d="M1143 198H1517V420H1445V589H1143Z"/>':`<rect x="${x}" y="${y}" width="${width}" height="${height}"/>`}</clipPath></defs><image clip-path="url(#crop-${name}-${className.replace(/[^a-z0-9]/gi,'')})" href="${ref.src}" x="0" y="0" width="${ref.width}" height="${ref.height}"/></svg>`;
}
