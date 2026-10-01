import {talentTotals} from './talents.js';
import {boardOwners} from './engine.js';
import {SKILL_ATLAS,CHAMPION_SKILLS,skillArtType} from './champion-skills.js';
export class ChampionSkillVisuals{
 constructor(){this.image=new Image();this.image.src=SKILL_ATLAS;}
 draw(ctx,g,bi,scale,positions,position){
  ctx.save();const density=ctx.getTransform().a;ctx.setTransform(density,0,0,density,0,0);
  if(this.image.complete&&this.image.naturalWidth){const w=this.image.naturalWidth/5,h=this.image.naturalHeight/3;
   for(const e of (g.skillEffects||[]).filter(e=>e.board===bi&&e.until>g.time).slice(-150)){const age=Math.max(0,g.time-e.born),fade=Math.max(0,1-age/1.2),size=e.size*(.8+age*.45);ctx.globalCompositeOperation='screen';ctx.globalAlpha=fade*.9;ctx.drawImage(this.image,skillArtType(e.type)%5*w,Math.floor(skillArtType(e.type)/5)*h,w,h,e.x-size/2,e.y*scale-size/2,size,size);}
  }
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.textAlign='center';
  for(const e of (g.skillPending||[]).filter(e=>e.board===bi&&[4,8].includes(e.type)&&e.mult>=4)){
   const target=g.boards[bi].monsters.find(m=>m.id===e.targetId),point=target?position(target.p,target):e.center,x=point.x,y=point.y*scale;
   ctx.strokeStyle='#ffb365';ctx.fillStyle='#ff9e4222';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,e.radius,e.radius*scale,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='bold 11px sans-serif';ctx.fillStyle='#ffe4b7';ctx.fillText(`${e.type===8?'폭탄':'운석'} ${Math.max(0,e.at-g.time).toFixed(1)}초`,x,y-20);
  }
  const owners=boardOwners(g,bi);
  for(const c of owners.flatMap(p=>p.champions)){if(c.tier<4)continue;const point=positions.get(c.id)||c,skill=CHAMPION_SKILLS[c.base],cooldown=skill.cooldown*(1-talentTotals(c.talents).cooldown),remaining=Math.max(0,(c.skillReadyAt??g.time+cooldown)-g.time);ctx.fillStyle='#06101de0';ctx.fillRect(point.x-18,point.y*scale+23,36,4);ctx.fillStyle=remaining?'#67bee7':'#eadd80';ctx.fillRect(point.x-18,point.y*scale+23,36*(1-Math.min(1,remaining/cooldown)),4);if(c.lastSkill&&g.time-c.lastSkill.born<1.2){ctx.font='bold 11px sans-serif';ctx.fillStyle='#ffe9ad';ctx.fillText(skill.name,point.x,point.y*scale-30);}}
  ctx.restore();
 }
}
