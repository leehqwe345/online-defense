import { TALENTS } from './talents.js';
export const HERO_NAMES=['저격수','궁수','검사','서리술사','화염술사','대지술사','바람술사','연금술사','폭파병','축복술사','뇌전술사','그림자 암살자','용기사','해일술사','룬 포격수'];
// Bonuses affect participating types only, once per combination and per owner's battlefield.
const rows=[
['정밀 사격대',[0,1],{attack:.04,crit:.02}],
['전열 엄호',[0,2],{range:12}],
['빙결 조준',[0,3],{crit:.03}],
['화약 협정',[0,8],{armorPen:.04}],
['장거리 포대',[0,14],{attack:.05}],
['바람의 화살',[1,6],{speed:.05}],
['독화살 연구',[1,7],{attack:.04}],
['숲의 수호',[1,5],{range:12}],
['추적 사냥',[1,11],{crit:.03}],
['축복받은 활',[1,9],{attack:.05}],
['검과 방벽',[2,5],{armorPen:.04}],
['성검 서약',[2,9],{attack:.05}],
['쌍검 기습',[2,11],{speed:.04}],
['용의 검술',[2,12],{critMult:.10}],
['얼음 칼날',[2,3],{crit:.03}],
['증기 마법',[3,4],{magicPen:.04}],
['눈보라',[3,6],{speed:.04}],
['빙해의 결속',[3,13],{range:14}],
['서리 번개',[3,10],{magicPen:.04}],
['냉각 포신',[3,14],{speed:.04}],
['용염 공명',[4,12],{attack:.05}],
['폭발 연소',[4,8],{critMult:.10}],
['불씨 확산',[4,6],{range:12}],
['화학 연소',[4,7],{attack:.04}],
['용암 지대',[4,5],{magicPen:.04}],
['비옥한 대지',[5,13],{attack:.04}],
['광물 정제',[5,7],{magicPen:.04}],
['룬 주춧돌',[5,14],{attack:.05}],
['돌풍 전선',[5,6],{speed:.04}],
['수호의 기도',[5,9],{range:12}],
['폭풍 전류',[6,10],{speed:.05}],
['순풍 항로',[6,13],{range:14}],
['은밀한 바람',[6,11],{crit:.03}],
['축복의 바람',[6,9],{speed:.05}],
['불안정 혼합물',[7,8],{critMult:.10}],
['전도성 시약',[7,10],{magicPen:.04}],
['독 묻은 단검',[7,11],{armorPen:.04}],
['정화의 물결',[7,13],{attack:.04}],
['공성 기술자',[8,14],{armorPen:.04}],
['용의 화약',[8,12],{attack:.05}],
['천둥 축복',[9,10],{attack:.05}],
['용기사의 맹세',[9,12],{critMult:.10}],
['번개 포격',[10,14],{crit:.03}],
['뇌우 해역',[10,13],{magicPen:.04}],
['용의 그림자',[11,12],{armorPen:.04}],
['삼중 사격진',[0,1,14],{attack:.06,range:10}],
['원소 연구회',[3,4,5,6],{magicPen:.06,speed:.04}],
['성역의 기사단',[2,9,12],{attack:.06,crit:.02}],
['폭풍 함대',[6,10,13],{speed:.06,range:10}],
['비밀 공작대',[7,8,11],{armorPen:.05,critMult:.10}]
];
const labels={attack:'공격력',speed:'공격속도',range:'사거리',crit:'치명타 확률',critMult:'치명타 배율',armorPen:'물리 관통',magicPen:'마법 관통'};
export function bonusText(b){return Object.entries(b).map(([k,v])=>labels[k]+' +'+(k==='range'?v:k==='critMult'?v.toFixed(2):Math.round(v*100)+(k==='crit'||k.endsWith('Pen')?'%p':'%'))).join(' · ');}
export const SYNERGIES=rows.map(([name,requires,bonus],i)=>({id:'combo-'+(i+1),name,requires,bonus,description:bonusText(bonus)}));
export const SYNERGY_CAPS={attack:.25,speed:.20,range:60,crit:.12,critMult:.40,armorPen:.15,magicPen:.15};
export function activeSynergies(champions=[],world=false){const types=new Set(champions.filter(c=>!!c.world===world).map(c=>c.base));return SYNERGIES.filter(s=>s.requires.every(t=>types.has(t)));}
export function syncSynergies(g){for(const p of g.players){for(const world of [false,true]){const active=activeSynergies(p.champions,world);for(const c of p.champions.filter(c=>!!c.world===world)){const bonus={};for(const s of active)if(s.requires.includes(c.base))for(const [key,value]of Object.entries(s.bonus))bonus[key]=(bonus[key]||0)+value;for(const key of Object.keys(bonus))bonus[key]=Math.min(bonus[key],SYNERGY_CAPS[key]);c.synergyBonus=bonus;}}}}
export function applySynergyStats(c,s){const b=c.synergyBonus||{};s.attack*=1+(b.attack||0);s.speed*=1+(b.speed||0);for(const key of ['range','crit','critMult','armorPen','magicPen'])s[key]+=b[key]||0;return s;}
export function renderSynergies(game,player){
 const arena=document.querySelector('.arena-wrap');if(!arena||!player)return;
 let stack=arena.querySelector('#trait-stack');if(!stack){stack=document.createElement('div');stack.id='trait-stack';stack.innerHTML='<div class="trait-drag-handle" title="드래그하여 이동">⠿ 특성 패널 이동</div>';arena.append(stack);installTraitDrag(stack,arena);}
 let panel=arena.querySelector('#synergy-panel');if(!panel){panel=document.createElement('details');panel.id='synergy-panel';panel.open=true;panel.innerHTML='<summary></summary><div class="synergy-body"></div>';stack.append(panel);}
 const home=activeSynergies(player.champions),world=game.mode==='coop'?activeSynergies(player.champions,true):[],picked=TALENTS.filter(t=>(player.talents||[]).includes(t.id));
 const key=JSON.stringify([home.map(s=>s.id),world.map(s=>s.id),picked.map(s=>s.id)]);if(panel.dataset.key===key)return;panel.dataset.key=key;
 panel.querySelector('summary').textContent='✦ 영웅 조합 '+(home.length+world.length)+'개';
 let chosen=stack.querySelector('#chosen-traits');if(!chosen){chosen=document.createElement('details');chosen.id='chosen-traits';chosen.open=true;chosen.innerHTML='<summary></summary><div class="synergy-body"></div>';stack.append(chosen);}
 chosen.querySelector('summary').textContent='✧ 선택한 특성 '+picked.length+'개';
 chosen.querySelector('.synergy-body').innerHTML=picked.length?picked.map(t=>'<article><strong>'+t.name+'</strong><span>'+t.description+'</span></article>').join(''):'<p>아직 선택한 특성이 없습니다. 5라운드마다 획득합니다.</p>';
 const list=(title,items)=>items.length?'<h4>'+title+'</h4>'+items.map(s=>'<article><strong>'+s.name+'</strong><span>'+s.description+'</span>'+(s.requires?'<small>'+s.requires.map(t=>HERO_NAMES[t]).join(' + ')+'</small>':'')+'</article>').join(''):'';
 panel.querySelector('.synergy-body').innerHTML='<p>조합 참여 영웅에게만 적용 · 동일 조합 중복 불가</p>'+list('내 방어선',home)+list('내 월드보스 파견대',world)+(!home.length&&!world.length&&!picked.length?'<p>영웅을 모으면 조합 특성이 자동 활성화됩니다.</p>':'')+'<details class="synergy-catalog"><summary>전체 조합 50종 보기</summary>'+SYNERGIES.map(s=>'<article><strong>'+s.name+'</strong><small>'+s.requires.map(t=>HERO_NAMES[t]).join(' + ')+'</small><span>'+s.description+'</span></article>').join('')+'</details><p>조합 상한: 공격력 25% · 공속 20% · 사거리 60 · 치명타 12%p · 치명 배율 0.40 · 각 관통 15%p</p>';
}

function installTraitDrag(stack,arena){
 const handle=stack.querySelector('.trait-drag-handle');let drag;
 const clamp=()=>{stack.style.left=Math.max(0,Math.min(parseFloat(stack.style.left)||14,arena.clientWidth-stack.offsetWidth))+'px';stack.style.top=Math.max(0,Math.min(parseFloat(stack.style.top)||54,arena.clientHeight-stack.offsetHeight))+'px';};
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const r=arena.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:stack.offsetLeft,top:stack.offsetTop,sx:arena.clientWidth/r.width,sy:arena.clientHeight/r.height};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;stack.style.left=drag.left+(e.clientX-drag.x)*drag.sx+'px';stack.style.top=drag.top+(e.clientY-drag.y)*drag.sy+'px';clamp();});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,()=>{drag=null;});
 new ResizeObserver(clamp).observe(stack);
}
