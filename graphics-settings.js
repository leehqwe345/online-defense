export const RESOLUTIONS=['1280x720','1600x900','1920x1080','2560x1440','3840x2160'];
export const GRAPHICS={
 low:{name:'저사양',description:'모든 전투 이펙트 제거 · 30 FPS · 렌더링 부하 감소',champion:false,world:false,fps:30,scale:.7},
 medium:{name:'중',description:'챔피언 공격·스킬·피격 이펙트 제거 · 보스 연출 유지',champion:false,world:true,fps:60,scale:1},
 high:{name:'고',description:'챔피언·보스·소환·처치 등 모든 이펙트 표시',champion:true,world:true,fps:60,scale:1}
};
const KEY='loop-display-settings-v1';
export function normalizeSettings(value={}){return {resolution:RESOLUTIONS.includes(value?.resolution)?value.resolution:'1920x1080',quality:Object.hasOwn(GRAPHICS,value?.quality)?value.quality:'high',bossSound:typeof value?.bossSound==='boolean'?value.bossSound:true};}
function read(){try{return normalizeSettings(JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}'));}catch{return normalizeSettings();}}
let current=read();
export function getSettings(){return {...current};}
export function graphics(){return GRAPHICS[current.quality];}
export function applySettings(){if(typeof document==='undefined')return;document.documentElement.dataset.quality=current.quality;globalThis.loopBossMuted=!current.bossSound;globalThis.dispatchEvent(new CustomEvent('loop-settings-changed',{detail:getSettings()}));if(globalThis.parent!==globalThis)parent.postMessage({type:'loop-display-settings',settings:getSettings()},location.origin);}
export function saveSettings(patch){current=normalizeSettings({...current,...patch});try{globalThis.localStorage?.setItem(KEY,JSON.stringify(current));}catch{}applySettings();return getSettings();}
if(typeof window!=='undefined'){window.addEventListener('storage',event=>{if(event.key===KEY){current=read();applySettings();}});applySettings();}
