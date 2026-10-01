import {encounterScope} from './encounters.js';
export const BOSS_AREAS=[
 ['비취 뿌리 감옥','stun',5,0],['홍염 십자 폭발','weaken',8,1],['빙하 고리','slow',8,2],['심연 촉수','stun',5,3],['사자왕의 진격','stun',6,1],['망자의 낙인','silence',8,3],['분쇄의 대지','stun',6,0],['천뢰 삼연격','stun',5,2],['독거미의 사냥터','slow',9,0],['전갈 독침','weaken',8,3],['천벌의 성역','silence',8,2],['삼중 악몽','fear',6,3],['불사조의 날개','weaken',9,1],['심해의 해일','slow',9,2]
].map(([name,status,duration,art],id)=>({id,name,status,duration,art}));
const circle=(x,y,r)=>({shape:'circle',x,y,r}),rect=(x,y,w,h)=>({shape:'rect',x,y,w,h});
export function areaPattern(id,targets=[],cycle=0){const t=targets[cycle%Math.max(1,targets.length)]||{x:400,y:400};switch(id){
 case 0:return [circle(t.x,t.y,100),circle(250,470,85),circle(550,470,85)];
 case 1:return [rect(400,400,110,520),rect(400,400,520,110)];
 case 2:return [{shape:'ring',x:400,y:400,r:245,inner:140}];
 case 3:return [rect(240,400,80,530),rect(560,400,80,530),circle(t.x,t.y,75)];
 case 4:return [rect(t.x,400,140,540)];
 case 5:return targets.slice(0,5).map(c=>circle(c.x,c.y,80)).concat(targets.length?[]:[circle(400,400,100)]);
 case 6:return [rect(400,260,520,100),rect(400,530,520,100)];
 case 7:return [circle(260,290,105),circle(540,290,105),circle(400,560,105)];
 case 8:return [circle(240,240,115),circle(560,240,115),circle(240,560,115),circle(560,560,115)];
 case 9:return [rect(400,cycle%2?280:520,520,110),circle(t.x,t.y,85)];
 case 10:return [{shape:'ring',x:400,y:400,r:270,inner:190},circle(400,400,85)];
 case 11:return [circle(230,400,95),circle(400,400,95),circle(570,400,95)];
 case 12:return [rect(250,400,130,500),rect(550,400,130,500)];
 default:return [rect(400,240+cycle%3*150,540,135)];}}
export function insideArea(c,z){const d=Math.hypot(c.x-z.x,c.y-z.y);return z.shape==='rect'?Math.abs(c.x-z.x)<=z.w/2&&Math.abs(c.y-z.y)<=z.h/2:z.shape==='ring'?d<=z.r&&d>=z.inner:d<=z.r;}
export function updateBossAreas(g,b){if(!b.world)return;const scope=encounterScope(g,b),boss=b.monsters.find(m=>m.boss&&m.hp>0);
 for(const board of scope.boards){board.bossAreas=(board.bossAreas||[]).filter(a=>a.until>g.time&&boss&&a.bossId===boss.id);for(const area of board.bossAreas){if(area.hit||g.time<area.trigger)continue;area.hit=true;const info=BOSS_AREAS[area.variant];const players=board.world?scope.players:[g.players[g.boards.indexOf(board)]];for(const p of players.filter(Boolean))for(const c of p.champions){if(!!c.world!==!!board.world||!area.zones.some(z=>insideArea(c,z)))continue;const key={stun:'areaStunUntil',slow:'areaSlowUntil',weaken:'areaWeakUntil',silence:'silenceUntil',fear:'fearUntil'}[info.status];c[key]=Math.max(c[key]||0,g.time+info.duration);}}}
 if(!boss)return;boss.nextAreaAt??=g.time+6;if(g.time<boss.nextAreaAt)return;boss.nextAreaAt=g.time+20;const variant=(boss.bossVariant||0)%14,cycle=boss.areaCycle||0;boss.areaCycle=cycle+1;
 for(const board of scope.boards){const players=board.world?scope.players:[g.players[g.boards.indexOf(board)]],targets=players.filter(Boolean).flatMap(p=>p.champions).filter(c=>!!c.world===!!board.world);board.bossAreas??=[];board.bossAreas.push({bossId:boss.id,variant,born:g.time,trigger:g.time+5,until:g.time+7,zones:areaPattern(variant,targets,cycle)});}}
export class BossAreaVisuals{
 constructor(){this.image=new Image();this.image.src='/assets/boss-area-frames-v1.png';}
 draw(ctx,board,time,effects=true){for(const area of board.bossAreas||[]){if(time>=area.until)continue;const warning=time<area.trigger,info=BOSS_AREAS[area.variant];ctx.save();ctx.fillStyle=warning?'rgba(220,25,35,.26)':'rgba(255,65,25,.18)';ctx.strokeStyle='#ff534c';ctx.lineWidth=3;for(const z of area.zones){ctx.beginPath();if(z.shape==='rect')ctx.rect(z.x-z.w/2,z.y-z.h/2,z.w,z.h);else{ctx.arc(z.x,z.y,z.r,0,Math.PI*2);if(z.shape==='ring'){ctx.moveTo(z.x+z.inner,z.y);ctx.arc(z.x,z.y,z.inner,0,Math.PI*2,true);}}ctx.fill('evenodd');ctx.stroke();if(warning){ctx.fillStyle='#fff5df';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('⚠ '+Math.ceil((area.trigger-time)/2)+'초',z.x,z.y);ctx.fillStyle='rgba(220,25,35,.26)';}else if(effects&&this.image.complete&&this.image.naturalWidth){const w=this.image.naturalWidth/4,h=this.image.naturalHeight/4,frame=Math.min(3,Math.floor((time-area.trigger)*2)),size=z.shape==='rect'?Math.min(z.w,z.h)*1.7:z.r*2;ctx.drawImage(this.image,frame*w,info.art*h,w,h,z.x-size/2,z.y-size/2,size,size);}}
 if(warning){ctx.fillStyle='#22080be6';ctx.fillRect(200,100,400,30);ctx.fillStyle='#ffceba';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(info.name+' · 붉은 구역에서 벗어나세요!',400,121);}ctx.restore();}}
}
