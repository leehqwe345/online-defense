import {talentTotals} from './talents.js';
export const CHAMPION_SKILLS=[
 ['관통 저격',15,'보스 우선 직선 관통 · 첫 대상 5배, 관통 대상 2.5배 피해'],
 ['화살 폭풍',12,'밀집 지점에 3회 화살비 · 회당 1.2배 피해'],
 ['회전 참격',10,'주변 3배 피해 · 적중당 다음 기본 공격 +20% (최대 100%)'],
 ['절대영도',18,'범위 2배 피해 · 일반 적 2초 빙결, 보스 60% 둔화'],
 ['운석 낙하',20,'1초 후 4배 피해 · 이후 3초간 초당 0.8배 화상'],
 ['지진',18,'3회 충격파 · 회당 1배 피해, 짧은 기절과 4초 저항 감소'],
 ['폭풍의 가호',20,'주변 아군 공격속도 +35% · 6초'],
 ['맹독 확산',16,'주변에 독 전파 · 중독된 적은 3배, 나머지는 1.5배 피해'],
 ['시한폭탄',15,'높은 체력의 적에게 부착 · 3초 후 주변에 5배 피해'],
 ['영웅의 축복',20,'강한 아군 피해량 또는 공속 +60% · 8초, 공포 해제'],
 ['연쇄 번개',14,'최대 8회 연쇄 · 재타격은 35% 피해'],
 ['처형의 표식',12,'낮은 체력의 적에게 5배 피해 · 처치 시 쿨타임 50% 환급'],
 ['용의 숨결',18,'부채꼴 화염 3.5배 마법 피해'],
 ['밀려오는 해일',16,'경로를 따라 파도 3배 피해 · 3초 둔화, 짧은 기절'],
 ['공성 포격',22,'보스 우선 포격 · 6배 피해, 보스에게 추가 50%'],
].map(([name,cooldown,description],type)=>({type,name,cooldown,description}));
export const SKILL_ATLAS='/assets/champion-skills-v1.png';
export function skillMarkup(c,time){const skill=CHAMPION_SKILLS[c.base];if(!skill)return '';const cooldown=skill.cooldown*(1-talentTotals(c.talents).cooldown);const remaining=Math.max(0,(c.skillReadyAt??time+cooldown)-time);return `<section class="champion-skill"><span class="champion-skill-icon" style="background-position:${c.base%5*25}% ${Math.floor(c.base/5)*50}%"></span><div><strong>${skill.name}</strong><small>${skill.description}</small><b>${c.tier<4?'유니크 등급부터 해금':remaining>0?'재사용 '+Math.ceil(remaining)+'초':'자동 사용 준비'} · ${Number(cooldown.toFixed(1))}초</b><small>에픽·레전더리: 스킬별 피해·범위·버프 강화 / 레전더리 축복 2명</small></div></section>`;}
function show(g,bi,c,type,point,size=110){g.skillEffects??=[];g.skillEffects.push({source:c.id,type,board:bi,x:point.x,y:point.y,size,born:g.time,until:g.time+1.2});}
function buff(c,kind,amount,until,now,source){c.supportBuffs??={};const old=c.supportBuffs[kind];if(!old||old.until<=now||old.amount<=amount)c.supportBuffs[kind]={amount,until,source};}
export function tryChampionSkill(g,b,owners,p,c,near,api){if(c.silenceUntil>g.time)return false;
 const type=c.base,skill=CHAMPION_SKILLS[type];if(c.tier<4||c.destination||c.fearUntil>g.time||['moving','approaching'].includes(c.combatState)||!near.length||g.time<(c.skillReadyAt??Infinity))return false;
 const s=api.stats(c),power=(1+(c.tier-4)*.25)*(1+(s.skillPower||0)),radius=(110+(c.tier-4)*20)*(1+(s.skillRadius||0))/g.mapScale;
 const living=()=>b.monsters.filter(m=>m.hp>0),point=m=>api.position(m.p,m),distance=(a,z)=>Math.hypot(a.x-z.x,a.y-z.y);
 const cluster=near.reduce((best,m)=>living().filter(n=>distance(point(n),point(m))<=radius).length>living().filter(n=>distance(point(n),point(best))<=radius).length?m:best,near[0]);
 const strongest=[...near].sort((a,z)=>Number(z.boss)-Number(a.boss)||z.hp-a.hp)[0];
 const hit=(m,mult,element=api.elements[type])=>{if(m.hp<=0)return;const dealt=api.damage(m,s.attack*mult*power,element,s);api.recordDamage(c,Math.min(m.hp,dealt),g.time);m.hp-=dealt;m.lastHit=p.id;m.hurt={born:g.time,type,dx:0,dy:0};};
 const area=(center)=>living().filter(m=>distance(point(m),center)<=radius);
 const slow=(m,amount,duration)=>{if(m.slow<=0||amount>=(m.slowAmount||0)){m.slowAmount=amount;m.slow=duration*(m.defenses.includes('슬로우저항')?.35:1);}};
 const around=point(cluster);let visual=around;
 c.skillReadyAt=g.time+skill.cooldown*(1-talentTotals(c.talents).cooldown);c.lastSkill={type,born:g.time};
 const schedule=(at,center,mult,targetId)=>{g.skillPending??=[];g.skillPending.push({at,board:g.boards.indexOf(b),source:c.id,owner:p.id,type,center:{...center},targetId,attack:s.attack*power,mult,radius,stats:{...s},element:api.elements[type]});};
 switch(type){
 case 0:{visual=point(strongest);const dx=visual.x-c.x,dy=visual.y-c.y,len=Math.hypot(dx,dy)||1;for(const m of living()){const q=point(m),projection=((q.x-c.x)*dx+(q.y-c.y)*dy)/len,cross=Math.abs((q.x-c.x)*dy-(q.y-c.y)*dx)/len;if(m===strongest||(projection>=0&&projection<=s.range/g.mapScale&&cross<30/g.mapScale))hit(m,m===strongest?5:2.5);}break;}
 case 1:for(let i=0;i<3;i++)schedule(g.time+i*.4,around,1.2);break;
 case 2:{visual=c;const targets=living().filter(m=>distance(point(m),c)<=s.range/g.mapScale);targets.forEach(m=>hit(m,3));c.nextAttackBonus=Math.min(1,targets.length*.2);break;}
 case 3:for(const m of area(around)){hit(m,2);if(m.boss)slow(m,.6,2);else m.stun=Math.max(m.stun,2+(c.tier-4)*.3);}break;
 case 4:schedule(g.time+1,around,4);for(let i=2;i<=4;i++)schedule(g.time+i,around,.8);break;
 case 5:for(let i=0;i<3;i++)schedule(g.time+i*.5,around,1);break;
 case 6:case 9:{let allies=owners.flatMap(o=>o.champions).filter(a=>a.base!==9);if(type===6)allies=allies.filter(a=>distance(a,c)<=220/g.mapScale);else allies.sort((a,z)=>{const x=api.stats({...a,supportBuffs:{}}),y=api.stats({...z,supportBuffs:{}});return y.attack*y.speed*y.targets-x.attack*x.speed*x.targets;});if(type===9)allies=allies.slice(0,c.tier===6?2:1);if(!allies.length){c.skillReadyAt=g.time;return false;}const kind=type===6?'speed':Math.random()<.5?'damage':'speed';for(const a of allies){buff(a,kind,(type===6?.35:.6)+(c.tier-4)*.1,g.time+(type===6?6:8),g.time,c.id);if(type===9){c.supportCast={target:a.id,kind,until:g.time+2};g.effects.push({source:c.id,target:a.id,x:c.x,y:c.y,tx:a.x,ty:a.y,born:g.time,until:g.time+.6,type:9,amount:0,board:g.boards.indexOf(b),support:true});}if(type===9)a.fearUntil=0;show(g,g.boards.indexOf(b),c,type,a,85);}visual=c;break;}
 case 7:for(const m of area(around)){hit(m,m.poison>0?3:1.5);const poison=api.damage(m,s.attack*.4*power,'독',s);if(poison>m.poison){m.poison=poison;m.poisonSource=c.id;m.poisonOwner=p.id;}}break;
 case 8:{const target=[...near].sort((a,z)=>z.hp-a.hp)[0];visual=point(target);schedule(g.time+3,visual,5,target.id);break;}
 case 10:{let target=cluster;const visited=new Set();for(let i=0;i<8;i++){hit(target,visited.has(target.id)?.35:1.25);show(g,g.boards.indexOf(b),c,type,point(target),65);visited.add(target.id);const candidates=living().filter(m=>distance(point(m),point(target))<=180/g.mapScale).sort((a,z)=>Number(visited.has(a.id))-Number(visited.has(z.id))||distance(point(a),point(target))-distance(point(z),point(target)));if(!candidates.length)break;target=candidates[0];}break;}
 case 11:{const target=[...near].sort((a,z)=>a.hp-z.hp)[0];visual=point(target);hit(target,5);if(target.hp<=0)c.skillReadyAt=g.time+skill.cooldown*(1-talentTotals(c.talents).cooldown)*.5;break;}
 case 12:{visual=point(strongest);const direction=Math.atan2(visual.y-c.y,visual.x-c.x);for(const m of living()){const q=point(m),angle=Math.atan2(q.y-c.y,q.x-c.x),delta=Math.atan2(Math.sin(angle-direction),Math.cos(angle-direction));if(distance(q,c)<=Math.max(s.range,240)/g.mapScale&&Math.abs(delta)<=Math.PI/4)hit(m,3.5,'화');}break;}
 case 13:for(const m of living()){const gap=Math.min(Math.abs(m.p-cluster.p),1-Math.abs(m.p-cluster.p));if(gap<=.08+(c.tier-4)*.015){hit(m,3);slow(m,.5,3);m.stun=Math.max(m.stun,m.boss?.15:.6);}}break;
 case 14:visual=point(strongest);hit(strongest,strongest.boss?9:6);break;
 }
 show(g,g.boards.indexOf(b),c,type,visual,type===2?140:110);
 g.effects.push({source:c.id,target:strongest.id,x:c.x,y:c.y,tx:visual.x,ty:visual.y,born:g.time,until:g.time+.3,type,amount:0,board:g.boards.indexOf(b)});
 return true;
}
export function updateChampionSkills(g,b,owners,api){
 const bi=g.boards.indexOf(b);g.skillEffects=(g.skillEffects||[]).filter(e=>e.until>g.time);
 for(const p of owners)for(const c of p.champions)if(c.tier>=4)c.skillReadyAt??=g.time+CHAMPION_SKILLS[c.base].cooldown*(1-talentTotals(c.talents).cooldown);
 for(const m of b.monsters)if(m.skillShredUntil<=g.time)m.skillShred=0;
 const pending=g.skillPending||[];for(const e of pending.filter(e=>e.board===bi&&e.targetId!==undefined)){const target=b.monsters.find(m=>m.id===e.targetId);if(target)e.center=api.position(target.p,target);}g.skillPending=pending.filter(e=>e.board!==bi||e.at>g.time);
 for(const e of pending.filter(e=>e.board===bi&&e.at<=g.time)){
  const source=owners.flatMap(p=>p.champions).find(c=>c.id===e.source),target=b.monsters.find(m=>m.id===e.targetId);if(target)e.center=api.position(target.p,target);
  for(const m of b.monsters){if(m.hp<=0)continue;const pos=api.position(m.p,m);if(Math.hypot(pos.x-e.center.x,pos.y-e.center.y)>e.radius)continue;const dealt=api.damage(m,e.attack*e.mult,e.element,e.stats);api.recordDamage(source,Math.min(m.hp,dealt),g.time);m.hp-=dealt;m.lastHit=e.owner;m.hurt={born:g.time,type:e.type,dx:0,dy:0};if(e.type===5){m.stun=Math.max(m.stun,m.boss?.1:.35);m.skillShred=.15*(m.defenses.includes('방깎저항')?.35:1);m.skillShredUntil=g.time+4;}}
  show(g,bi,{id:e.source},e.type,e.center,e.radius*2*g.mapScale);
 }
}
