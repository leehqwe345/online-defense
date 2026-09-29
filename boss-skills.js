// Shared display metadata; warning time follows simulation time, including pause/speed.
export const BOSS_SKILL_ART='/assets/boss-skills-v1.png';
export const BOSS_SKILL_INFO=[
 {name:'공포의 포효',color:'#ce8aff',description:'아군 전체 · 10초 동안 공격 불가'},
 {name:'쇠약의 저주',color:'#78cfff',description:'아군 전체 · 10초 동안 공격속도 50% 감소'},
 {name:'재생의 파동',color:'#83f39c',description:'생존 몬스터 전체 · 최대 체력의 20% 회복'},
 {name:'광폭 행진',color:'#ff916d',description:'몬스터 전체 · 10초 동안 이동속도 50% 증가'},
 {name:'철벽 보호막',color:'#ffe190',description:'몬스터 전체 · 10초 동안 받는 피해 50% 감소'},
];
export function bossWarnings(board,time){return (board?.monsters||[]).filter(m=>m.boss&&m.hp>0&&Number.isFinite(m.nextSkillAt)&&m.nextSkillAt-time>0&&m.nextSkillAt-time<=3+1e-8).map(m=>({bossId:m.id,skill:(m.skillIndex||0)%5,remaining:m.nextSkillAt-time,p:m.p,worldBoss:m.worldBoss})).sort((a,b)=>a.remaining-b.remaining||a.bossId-b.bossId);}
export function activeBossCasts(board,time){return (board?.bossCasts||(board?.bossCast?[board.bossCast]:[])).filter(c=>c.until>time);}
export function bossIconMarkup(skill){return `<span class="boss-skill-icon" aria-hidden="true" style="background-position:${skill*25}% 0%"></span>`;}
export function bossNoticeMarkup(board,time){const warnings=bossWarnings(board,time),casts=activeBossCasts(board,time);return [...warnings.map(w=>({...w,warning:true})),...casts].map(v=>{const info=BOSS_SKILL_INFO[v.skill];return `<div class="boss-skill-card ${v.warning?'is-warning':'is-cast'}" style="--skill-color:${info.color}">${bossIconMarkup(v.skill)}<div><strong>${v.warning?'발동 예고':'스킬 발동'} · ${info.name}</strong><small>${info.description}</small>${v.warning?`<progress max="3" value="${Math.max(0,v.remaining)}" aria-label="발동까지 남은 시간"></progress>`:''}</div><b>${v.warning?Math.ceil(v.remaining)+'초':'발동'}</b></div>`;}).join('');}

export class BossSkillVisuals{
 constructor(){this.image=new Image();this.image.src=BOSS_SKILL_ART;}
 sprite(ctx,skill,row,x,y,size,alpha=1){if(!this.image.complete||!this.image.naturalWidth)return;const w=this.image.naturalWidth/5,h=this.image.naturalHeight/2;ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='screen';ctx.drawImage(this.image,skill*w,row*h,w,h,x-size/2,y-size/2,size,size);ctx.restore();}
 draw(ctx,game,board,owners,positions,verticalScale,position){
  ctx.save();const density=ctx.getTransform().a;ctx.setTransform(density,0,0,density,0,0);ctx.textAlign='center';
  const time=game.time,warnings=bossWarnings(board,time),casts=activeBossCasts(board,time);
  for(const warning of warnings){const raw=positions.get(warning.bossId)||position(warning.p,warning),x=raw.x,y=raw.y*verticalScale,info=BOSS_SKILL_INFO[warning.skill];this.sprite(ctx,warning.skill,1,x,y,82+Math.sin(time*8)*5,.5);this.sprite(ctx,warning.skill,0,x,y-44,38);ctx.fillStyle='#070b16e8';ctx.fillRect(x-25,y-77,50,20);ctx.fillStyle=info.color;ctx.font='bold 13px sans-serif';ctx.fillText(Math.ceil(warning.remaining)+'초',x,y-62);}
  for(const cast of casts){const age=Math.max(0,time-(cast.born??cast.until-4));if(age>1.6)continue;const alpha=Math.max(0,1-age/1.6);const targets=cast.skill<2?owners.flatMap(p=>p.champions):board.monsters;for(const target of targets){const point=positions.get(target.id)||(target.p===undefined?target:position(target.p,target));this.sprite(ctx,cast.skill,1,point.x,point.y*verticalScale,48+age*35,alpha*.8);}}
  for(const c of owners.flatMap(p=>p.champions)){const point=positions.get(c.id)||c;let offset=0;for(const [skill,until]of [[0,c.fearUntil],[1,c.slowAttackUntil]]){if(!(until>time))continue;const x=point.x+offset,y=point.y*verticalScale-39;this.sprite(ctx,skill,0,x,y,26);ctx.font='bold 10px sans-serif';ctx.fillStyle=BOSS_SKILL_INFO[skill].color;ctx.fillText(Math.ceil(until-time)+'s',x,y-16);offset+=29;}}
  ctx.restore();
 }
}
