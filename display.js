import {getSettings,normalizeSettings} from './graphics-settings.js';
let settings=getSettings();
export function fitGameDisplay(){const [width,height]=settings.resolution.split('x').map(Number),scale=Math.min(window.innerWidth/width,window.innerHeight/height),frame=document.getElementById('game-display');if(!frame)return;frame.style.width=width+'px';frame.style.height=height+'px';frame.style.transform='scale('+scale+')';frame.style.left=((window.innerWidth-width*scale)/2)+'px';frame.style.top=((window.innerHeight-height*scale)/2)+'px';document.title='LOOP — '+width+' × '+height;}
window.addEventListener('resize',fitGameDisplay);
window.addEventListener('message',event=>{const frame=document.getElementById('game-display');if(event.origin!==location.origin||event.source!==frame?.contentWindow||event.data?.type!=='loop-display-settings')return;settings=normalizeSettings(event.data.settings);fitGameDisplay();});
window.addEventListener('loop-settings-changed',event=>{settings=normalizeSettings(event.detail);fitGameDisplay();});fitGameDisplay();
