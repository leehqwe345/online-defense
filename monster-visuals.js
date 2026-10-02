import {advanceLocomotion,locomotionRate} from './monster-motion.js';
import {monsterDefinition,traitDefinition} from './monsters.js';
import { position } from './engine.js';
import { monsterSpriteIndex, monsterName, bossVariant } from './art.js';

export const reactionDelay = type => type === 'poison' ? 0 : [2, 9, 11, 12].includes(type) ? 0.05 : type === 0 ? 0.08 : 0.18;
// Explicit material coverage for all 40 families and 14 boss variants.
export const MONSTER_MATERIALS=[5,4,0,2,5,1,5,0,0,3,1,0,3,5,1,4,3,3,4,2,2,0,2,5,0,4,1,0,2,0,1,4,1,5,4,4,3,0,5,1];
export const BOSS_MATERIALS=[3,1,2,0,0,5,0,0,0,4,4,0,5,0];
export const damageMaterial=m=>m.boss?BOSS_MATERIALS[bossVariant(m)]:(MONSTER_MATERIALS[m.family]??0);
export function bossDamageStage(m){if(!m.boss||!(m.maxHp>0)||!(m.hp>0))return -1;const ratio=m.hp/m.maxHp;return ratio<=.25?2:ratio<=.5?1:ratio<=.75?0:-1;}
const colors = ['#92ad79', '#ad9b7b', '#b18771', '#73acbd', '#cc8862', '#a19a74', '#9c8db2', '#ae7ea0', '#78a995', '#b3a67e'];
const keyFor = (board, id) => `${board}:${id}`;

// Network events are deduplicated separately from the render clock, so pausing
// freezes the animation and a monster removed between snapshots can still die visibly.
export class MonsterVisuals {
  constructor(art) { this.art = art; this.reset(); if(typeof Image!=='undefined'){this.hitMaterials=new Image();this.hitMaterials.src='/assets/monster-hit-materials-v1.png';this.damageStages=new Image();this.damageStages.src='/assets/boss-damage-stages-v1.png';this.bossSheet=new Image();this.bossSheet.src='/assets/boss-expansion-v1.png';this.bossArts=['/assets/boss-jade-v2.png','/assets/boss-ember-v2.png'].map(src=>{const image=new Image();image.src=src;return image;});} }
  reset() { this.walkStates=new Map();this.attackStarts=new Map();this.attackBorn=new Map();this.hits = new Map(); this.deaths = new Map(); this.seenDeaths = new Map(); }
  receive(game, clock) {
    const alive = new Set();
    game.boards.forEach((board, bi) => {
      for (const monster of board.monsters) {
        const key = keyFor(bi, monster.id); alive.add(key);
        if(monster.boss&&monster.basicAttack&&this.attackBorn.get(key)!==monster.basicAttack.born){this.attackBorn.set(key,monster.basicAttack.born);if(game.time-monster.basicAttack.born<.6)this.attackStarts.set(key,clock-Math.max(0,game.time-monster.basicAttack.born));}
        const hurt = monster.hurt, old = this.hits.get(key);
        if (hurt && game.time - hurt.born < 0.6 && hurt.born !== old?.born) {
          // Rapid hits may refresh the reaction but cannot postpone an already scheduled impact.
          const start = old && old.start > clock ? old.start : clock + reactionDelay(hurt.type);
          this.hits.set(key, { ...hurt, start });
        }
      }
    });
    for(const key of this.walkStates.keys())if(!alive.has(key))this.walkStates.delete(key);
    for(const [key] of this.attackBorn)if(!alive.has(key)){this.attackBorn.delete(key);this.attackStarts.delete(key);}
    for (const [key] of this.hits) if (!alive.has(key)) this.hits.delete(key);
    for (const event of game.deaths || []) {
      const key = keyFor(event.board, event.id);
      if (this.seenDeaths.has(key)) continue;
      this.seenDeaths.set(key, event.until);
      this.deaths.set(key, { ...event, start: clock + reactionDelay(event.hurt?.type ?? 'poison'), duration: event.boss ? 1.1 : 0.8 });
    }
    for (const [key, until] of this.seenDeaths) if (game.time > until) this.seenDeaths.delete(key);
    this.prune(clock);
  }
  prune(clock) {
    for (const [key, event] of this.deaths) if (clock - event.start >= event.duration) this.deaths.delete(key);
  }
  sprite(ctx, monster, width, flash = 0, walkFrame = null, attackAge = -1) {
    ctx.save(); ctx.scale(1, 1 / (this.verticalScale || 1));
    const variant=bossVariant(monster);
    if(monster.boss){
      const cycle=this.art.bossAttackFrames?.[variant],attacking=attackAge>=0&&attackAge<.6;
      const tile=attacking&&cycle?cycle[Math.min(3,Math.floor(attackAge/.15))]:walkFrame||cycle?.[0]||this.art.bossWalks?.[variant]?.[0];
      if(tile){const scale=width/tile.bodyHeight,w=tile.width*scale,h=tile.height*scale;ctx.drawImage(tile,-w/2,-h*tile.anchorY+width*.1,w,h);ctx.restore();return;}
    }
if(monster.boss&&variant>=2&&this.bossSheet?.complete&&this.bossSheet.naturalWidth){const i=variant-2,sw=this.bossSheet.naturalWidth/4,sh=this.bossSheet.naturalHeight/3;ctx.drawImage(this.bossSheet,i%4*sw+4,Math.floor(i/4)*sh+4,sw-8,sh-8,-width/2,-width*.78,width,width);ctx.restore();return;}const bossArt=monster.boss?this.bossArts?.[variant]:null;if(bossArt?.complete&&bossArt.naturalWidth){const h=width*bossArt.naturalHeight/bossArt.naturalWidth;ctx.drawImage(bossArt,-width/2,-h*.78,width,h);ctx.restore();return;}
    const index = monsterSpriteIndex(monster), tile = walkFrame||this.art.monsters[index];
    if (tile) {
      const height = walkFrame?.bodyHeight?width*.8*tile.height/tile.bodyHeight:width * tile.height / tile.width;const drawWidth=height*tile.width/tile.height;
      ctx.drawImage(tile, -drawWidth / 2, walkFrame?-height*tile.anchorY+12:-height*.68, drawWidth, height);
      if (flash > 0 && !walkFrame) {
        const alpha = ctx.globalAlpha; ctx.globalAlpha *= flash;
        ctx.drawImage(this.art.monsterFlashes[index], -width / 2, -height * 0.68, width, height); ctx.globalAlpha = alpha;
      }
    } else {
      ctx.fillStyle = colors[monster.family] || colors[0];
      ctx.beginPath(); ctx.arc(0, -5, width * 0.23, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  reaction(ctx, row, progress, x, y, size, alpha = 1) {
    if (progress < 0 || progress >= 1) return;
    const frame = Math.min(3, Math.floor(progress * 4)), tile = this.art.reactions[row * 4 + frame];
    if (!tile) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha * (1 - progress * 0.5);
    ctx.drawImage(tile, x - size / 2, y - size / 2, size, size); ctx.restore();
  }
  materialHit(ctx,monster,age,width,dx,dy){
    if(this.showHits===false||age<0||age>=.36||!this.hitMaterials?.naturalWidth)return;
    const image=this.hitMaterials,sw=image.naturalWidth/4,sh=image.naturalHeight/6,frame=Math.min(3,Math.floor(age/.09)),size=width*(monster.boss?.68:.95);
    ctx.save();ctx.translate(dx,dy-width*.3/(this.verticalScale||1));ctx.scale(1,1/(this.verticalScale||1));ctx.globalAlpha*=1-age/.6;
    ctx.drawImage(image,frame*sw,damageMaterial(monster)*sh,sw,sh,-size/2,-size/2,size,size);ctx.restore();
  }
  bossWounds(ctx,monster,width){
    const stage=bossDamageStage(monster),image=this.damageStages;
    if(this.showEffects===false||stage<0||!image?.naturalWidth)return;
    const sw=image.naturalWidth/3,sh=image.naturalHeight/6,w=width*.78,h=w*sh/sw;
    ctx.save();ctx.scale(1,1/(this.verticalScale||1));ctx.globalAlpha*=.85;
    ctx.drawImage(image,stage*sw,damageMaterial(monster)*sh,sw,sh,-w/2,-width*.43-h/2,w,h);
    if(stage===2){ctx.globalAlpha*=.65;ctx.translate(width*.2,-width*.18);ctx.rotate(-.4);ctx.drawImage(image,sw,damageMaterial(monster)*sh,sw,sh,-w*.35,-h/2,w*.65,h*.65);}
    ctx.restore();
  }
  drawMonster(ctx, monster, board, x, y, clock, selected) {
    const width = monster.boss ? (monster.worldBoss?180:132) : 62, halfBar = monster.boss ? 45 : 20;
    if(this.showEffects!==false&&monster.boss){ctx.save();ctx.strokeStyle=bossVariant(monster)===0?"#8ce98b88":"#ff734d88";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+10,width*.45,16,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    const hit = this.showHits===false?null:this.hits.get(keyFor(board, monster.id)), age = hit ? clock - hit.start : 10;
    const progress = age >= 0 && age < 0.3 ? age / 0.3 : 1;
    const pulse = Math.sin(progress * Math.PI) * (1 - progress);
    const moving = locomotionRate(monster,this.animationSpeed)>0, phase = clock * (monster.slow > 0 ? 5 : 10) + monster.id;
    const floating = monsterDefinition(monster).floating;
    const bob = moving ? Math.sin(phase) * (floating ? 2.2 : 1.1) : 0;
    const dx = (hit?.dx || 0) * pulse * (monster.boss ? 5 : 10), dy = (hit?.dy || 0) * pulse * 5;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(0, 10, width * 0.25, width * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    if (selected) { ctx.strokeStyle = '#fff2b4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 9, width * 0.36, width * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(dx, dy + bob); ctx.rotate(monster.boss?0:pulse * 0.12 * (hit?.dx || 1));
    ctx.scale(monster.p >= 0.5 ? -1 : 1, 1);
    const squash = !monster.boss && moving && [0, 9].includes(monster.family) ? Math.sin(phase) * 0.035 : 0;
    if(!monster.boss)ctx.scale(1 + squash + pulse * 0.16, 1 - squash - pulse * 0.18);
    if (this.showEffects!==false && monster.slow > 0) ctx.filter = 'saturate(.65) brightness(1.12)';
    const walkKey=keyFor(board,monster.id),motion=advanceLocomotion(this.walkStates.get(walkKey),monster,clock,this.animationSpeed);this.walkStates.set(walkKey,motion);const frames=monster.boss?this.art.bossWalks?.[variantForWalk(monster)]:this.art.monsterLocomotion?.[monster.family];const walkFrame=monster.boss&&!moving?null:frames?.[Math.floor(motion.phase)];this.sprite(ctx, monster, width, age >= 0 && age < 0.12 ? (1 - age / 0.12) * 0.9 : 0,walkFrame,monster.basicAttack?clock-(this.attackStarts?.get(keyFor(board,monster.id))??-100):-1);
    this.bossWounds(ctx,monster,width);
    ctx.restore();
    this.materialHit(ctx,monster,age,width,dx,dy);
    if (!this.hitMaterials?.naturalWidth && age >= 0 && age < 0.3 && hit?.type !== 'poison') this.reaction(ctx, 0, age / 0.3, dx, dy - 8, width * 0.75, 0.8);
    if (hit?.type === 'poison' && age >= 0 && age < 0.3) { ctx.strokeStyle = `rgba(171,223,97,${1 - age / 0.3})`; ctx.beginPath(); ctx.ellipse(0, 8, width * 0.28, width * 0.1, 0, 0, Math.PI * 2); ctx.stroke(); }
    const barY = monster.boss ? Math.max(-width*.9/(this.verticalScale||1),26/(this.verticalScale||1)-y) : -36/(this.verticalScale||1);
    if(monster.boss){ctx.save();ctx.translate(0,barY);ctx.scale(1,1/(this.verticalScale||1));ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#290904';ctx.lineWidth=4;ctx.strokeText('BOSS',0,-8);ctx.fillStyle='#ff8d70';ctx.fillText('BOSS',0,-8);ctx.restore();}
    ctx.fillStyle = '#08120e'; ctx.fillRect(-halfBar - 1, barY - 1, halfBar * 2 + 2, 6);
    ctx.fillStyle = monster.boss ? '#ff6047' : '#b9e388'; ctx.fillRect(-halfBar, barY, halfBar * 2 * Math.max(0, Math.min(1, monster.hp / monster.maxHp)), 4);
    ctx.textAlign = 'center';
    ctx.save();ctx.scale(1,1/(this.verticalScale||1));ctx.font='bold 10px sans-serif';const name=monsterName(monster)+(monster.boss?' [BOSS]':''),ly=23;ctx.fillStyle='#07101de6';const lw=ctx.measureText(name).width+8;this.labelBounds??=[];const rect={x:x-lw/2,y:y*(this.verticalScale||1)+ly-10,w:lw,h:14};const showName=selected||monster.boss||!this.labelBounds.some(r=>r.x<rect.x+rect.w&&r.x+r.w>rect.x&&r.y<rect.y+rect.h&&r.y+r.h>rect.y);if(showName){this.labelBounds.push(rect);ctx.fillRect(-lw/2,ly-10,lw,14);ctx.strokeStyle='#050914';ctx.lineWidth=3;ctx.strokeText(name,0,ly);ctx.fillStyle=monster.boss?'#ffd47d':'#f0f4ff';ctx.fillText(name,0,ly);}ctx.restore();
    if (selected&&!monster.boss&&monsterDefinition(monster).trait!=='none') {ctx.fillStyle=traitDefinition(monster).color;ctx.font='bold 8px sans-serif';ctx.fillText(traitDefinition(monster).name,0,barY-5);}
    if(this.showEffects!==false&&(monster.shield>0||monster.phaseGuard)){ctx.strokeStyle=monster.phaseGuard?'#d8a4ffaa':'#77c6ffaa';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-8,width*.42,width*.47,0,0,Math.PI*2);ctx.stroke();}
    if (monster.stun > 0) { ctx.fillStyle = '#c8efff'; ctx.font = '15px sans-serif'; ctx.fillText('✧', halfBar + 7, barY + 4); }
    ctx.restore();
  }
  drawDeaths(ctx, board, clock) {
    this.prune(clock);
    for (const monster of this.deaths.values()) {
      if (monster.board !== board) continue;
      const age = clock - monster.start, t = Math.max(0, age / monster.duration);
      const { x, y } = position(monster.p,monster), width = monster.boss ? 96 : 62;
      const fall = Math.min(1, t / 0.6), direction = monster.p >= 0.5 ? -1 : 1;
      ctx.save(); ctx.translate(x + (monster.hurt?.dx || 0) * fall * 9, y + fall * 12);
      ctx.globalAlpha = Math.max(0, 1 - t * 1.8);
      ctx.rotate(direction * fall * 0.75); ctx.scale(direction * (1 - fall * 0.35), 1 - fall * 0.65);
      this.sprite(ctx, monster, width, age >= 0 && age < 0.1 ? 1 - age / 0.1 : 0); ctx.restore();
      if (age >= 0) this.reaction(ctx, 1, t, x, y - 10 - t * 20, width * (0.8 + t * 0.65), monster.boss ? 1 : 0.8);
    }
  }
}

function variantForWalk(monster){return bossVariant(monster);}
