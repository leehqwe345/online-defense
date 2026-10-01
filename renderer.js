import {graphics,getSettings} from './graphics-settings.js';
import {CosmeticEffects} from './cosmetic-effects.js';
import {equippedProduct,themeFor} from './cosmetics.js';
import {ChampionSkillVisuals} from './champion-skill-visuals.js';
import {BossSkillVisuals} from './boss-skills.js';
import {MONSTERS,traitDefinition} from './monsters.js';
import { monsterCount, boardOwners, CHAMPIONS, COLORS, stats, position } from './engine.js';
import { ArtAssets, MONSTER_NAMES, monsterName } from './art.js';
import { MonsterVisuals } from './monster-visuals.js';
import { MapArt, MAPS } from './maps.js';

const elementColors = ['#edcb87', '#b9dc89', '#e3b09b', '#78d2ed', '#ffad6c', '#ceb992', '#88debd', '#acd76f', '#ecba79', '#c8a5f2','#7ce9ff','#d2a0ff','#ffbe79','#71edec','#e5c282'];

export function openMonsterPreview() {
  document.querySelector('#monster-preview')?.close();
  const dialog = document.createElement('dialog'); dialog.id = 'monster-preview';
  dialog.setAttribute('aria-label', '몬스터 피격·사망 미리보기');
  dialog.innerHTML = `<span class="eyebrow">BESTIARY / REACTION STUDY</span><h2>몬스터 피격 · 사망</h2><p>실제 전투와 같은 이미지·연출로 재생합니다.</p><label for="preview-monster">몬스터 종류</label><select id="preview-monster">${MONSTER_NAMES.map((name, i) => `<option value="${i}">${[10,11].includes(i) ? '보스 · ' : ''}${name}</option>`).join('')}</select><canvas width="700" height="400" aria-label="몬스터 반응 애니메이션"></canvas><div class="preview-legend"><span id="monster-preview-state" role="status">이미지 불러오는 중</span><div><button class="mini-btn" data-reaction="hit">피격 재생</button><button class="mini-btn" data-reaction="death">사망 재생</button><button class="mini-btn" id="monster-preview-close">닫기 ×</button></div></div>`;
  document.body.append(dialog); dialog.showModal();
  const renderer = new ArenaRenderer(), scene = document.createElement('canvas'); scene.width = scene.height = 800;
  const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
  let frameId, last = performance.now(), time = 0, phase = 0, id = 1, dead = false, hurt = null, deaths = [];
  let hitDone = false, deathDone = false, requested = null;
  const reset = () => { phase = 0; id++; dead = false; hurt = null; deaths = []; hitDone = false; deathDone = false; renderer.current = null; };
  dialog.querySelector('select').onchange = reset;
  dialog.querySelectorAll('[data-reaction]').forEach(button => { button.onclick = () => { reset(); requested = button.dataset.reaction; }; });
  dialog.querySelector('#monster-preview-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { cancelAnimationFrame(frameId); dialog.remove(); }, { once: true });
  const loop = now => {
    if (!dialog.open) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (renderer.art.monstersReady) phase += dt;
    if (phase > 5) reset();
    const index = Number(dialog.querySelector('select').value), boss = [10,11].includes(index);
    const monster = { id, family: index>=12?index-2:index%10, round: index === 11 ? 20 : 10, boss, p: 0.125, hp: 100, maxHp: 100, slow: 0, stun: 0 };
    if (renderer.art.monstersReady && ((!hitDone && phase >= 1) || requested === 'hit')) { hurt = { born: time, type: 2, dx: 1, dy: 0 }; hitDone = true; }
    if (renderer.art.monstersReady && ((!deathDone && phase >= 2.8) || requested === 'death')) {
      hurt = { born: time, type: 2, dx: 1, dy: 0 }; dead = deathDone = true;
      deaths = [{ ...monster, hurt, board: 0, born: time, until: time + 1.5 }];
    }
    if (requested && renderer.art.monstersReady) { phase = requested === 'hit' ? 1 : 2.8; requested = null; }
    monster.hurt = hurt; if (hitDone) monster.hp = 65;
    const game = { time, status: 'playing', mode: 'single', mapScale: 1, players: [], boards: [{ monsters: dead ? [] : [monster], spawn: [] }], effects: [], deaths: deaths.filter(e => e.until > time) };
    renderer.receive(game); renderer.draw(scene, 0, null, null);
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(scene, 230, 0, 340, 194, 0, 0, canvas.width, canvas.height);
    dialog.querySelector('#monster-preview-state').textContent = `${monsterName(monster)} · ${boss?'보스':traitDefinition(monster).name+' — '+traitDefinition(monster).description} · ${!renderer.art.monstersReady ? '불러오는 중' : dead ? '붕괴 → 영혼 소멸' : hitDone ? '피격 → 복귀' : '대기'}`;
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
}

export function openMapPreview() {
  document.querySelector('#map-preview')?.close();
  const dialog = document.createElement('dialog'); dialog.id = 'map-preview';
  dialog.setAttribute('aria-label', '단계별 전장 지도');
  dialog.innerHTML = `<span class="eyebrow">TEN SECTORS / ONE HUNDRED WAVES</span><h2>단계별 전장 지도</h2><p>10라운드마다 다음 지역으로 이동합니다. 네모 경로와 배치 위치는 유지됩니다.</p><label for="map-preview-stage">전장 선택</label><select id="map-preview-stage">${MAPS.map(m => `<option value="${m.first}">${m.first}–${m.last} · ${m.name}</option>`).join('')}</select><canvas width="800" height="800" aria-label="단계별 전장 미리보기"></canvas><button class="mini-btn" id="map-preview-close">닫기 ×</button>`;
  document.body.append(dialog); dialog.showModal();
  const renderer = new ArenaRenderer(), canvas = dialog.querySelector('canvas'); let frame;
  dialog.querySelector('#map-preview-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { cancelAnimationFrame(frame); dialog.remove(); }, { once: true });
  const loop = () => {
    if (!dialog.open) return;
    renderer.receive({ round: Number(dialog.querySelector('select').value), time: 0, status: 'ready', mode: 'single', mapScale: 1, players: [], boards: [{ monsters: [], spawn: [] }], effects: [] });
    renderer.draw(canvas, 0); frame = requestAnimationFrame(loop);
  };
  loop();
}

export class ArenaRenderer {
  constructor() {
    this.cosmetics=new CosmeticEffects();this.previous = null; this.current = null; this.received = 0; this.positions = new Map();
    this.walkStates = new Map();
    this.bossArena=new Image();this.bossArena.src='/assets/boss-arena-citadel-v1.png';
    this.projectileAtlas=new Image();this.projectileAtlas.src='/assets/projectiles-v1.png';this.blessingFrame=new Image();this.blessingFrame.src='/assets/blessing-frame-v1.png';this.art = new ArtAssets(); this.attacks = new Map(); this.seen = new Map(); this.visualEffects = [];
    this.monsterVisuals = new MonsterVisuals(this.art);
    this.mapArt = new MapArt(); this.bossVisuals = new BossSkillVisuals(); this.championSkillVisuals = new ChampionSkillVisuals();
    this.clock = 0; this.lastFrame = performance.now();
  }
  receive(game) {
    if(graphics().world)this.cosmetics.receive(game,this.clock);
    if (!this.current || game.time < this.current.time) { this.walkStates.clear(); this.attacks.clear(); this.seen.clear(); this.visualEffects = []; this.monsterVisuals.reset(); }
    const aliveHeroes=new Set(game.players.flatMap(p=>p.champions.map(c=>c.id)));
    for(const id of this.walkStates.keys())if(!aliveHeroes.has(id))this.walkStates.delete(id);
    this.previous = this.current;
    this.current = game;
    this.received = performance.now();
    if(graphics().world)this.monsterVisuals.receive(game, this.clock);else this.monsterVisuals.reset();
    for (const effect of game.effects) {
      const source = effect.source ?? game.players.flatMap(p => p.champions).find(c => Math.hypot(c.x - effect.x, c.y - effect.y) < 32)?.id;
      const key = `${source}:${effect.target}:${effect.born}:${effect.tx}:${effect.ty}`;
      if (this.seen.has(key)) continue;
      this.seen.set(key, game.time);
      const shot = { ...effect, source, start: this.clock };
      if(graphics().champion)this.visualEffects.push(shot);
      const existing = this.attacks.get(source);
      if (!existing || existing.born !== effect.born) this.attacks.set(source, shot);
    }
    for (const [key, time] of this.seen) if (game.time - time > 2) this.seen.delete(key);
    this.visualEffects = this.visualEffects.slice(-160);
  }
  draw(canvas, boardIndex, selected, selectedEnemy, selectedIds = [], dragStart = null, dragNow = null) {
    const game = this.current;
    if (!game || !canvas || !game.boards[boardIndex]) return;
    const quality=graphics(),prefs=getSettings(),nowDraw=performance.now(),qualityKey=prefs.quality+prefs.resolution;if(qualityKey===this.qualityKey&&nowDraw-(this.lastDrawTime||0)<1000/quality.fps-1)return false;this.qualityKey=qualityKey;this.lastDrawTime=nowDraw;this.monsterVisuals.showEffects=quality.world;this.monsterVisuals.showHits=quality.champion;
    const ctx = canvas.getContext('2d');
    const ratio=canvas.clientWidth&&canvas.clientHeight?canvas.clientHeight/canvas.clientWidth:430/800,pixelRatio=quality.scale,width=Math.round((canvas.clientWidth||800)*pixelRatio),height=Math.round(width*ratio);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    this.verticalScale = ratio;const density=width/800;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    this.monsterVisuals.verticalScale = this.verticalScale;
    ctx.setTransform(density, 0, 0, density*this.verticalScale, 0, 0);
    const now = performance.now();
    if (game.status !== 'paused') this.clock += Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const blend = Math.min(1, (performance.now() - this.received) / 100);
    const previousBoard = this.previous?.boards[boardIndex];
    const previousMonsters = new Map(previousBoard?.monsters.map(m => [m.id, m]) || []);
    const previousHeroes = new Map(this.previous?.players.flatMap(p => p.champions).map(c => [c.id, c]) || []);
    const board = game.boards[boardIndex];
    this.positions.clear();this.monsterVisuals.labelBounds=[];
    const seconds = game.time;
    ctx.clearRect(0, 0, 800, 800);
    const bg = ctx.createRadialGradient(400, 350, 80, 400, 400, 560);
    bg.addColorStop(0, '#1c3028'); bg.addColorStop(1, '#101c1b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 800);
    const mapOwner=game.players[boardIndex],mapItem=!board.world&&equippedProduct(mapOwner?.cosmetics,'map');
    if(board.world){
      if(this.bossArena.complete&&this.bossArena.naturalWidth)ctx.drawImage(this.bossArena,0,0,800,800);
      else{ctx.fillStyle='#14202d';ctx.fillRect(0,0,800,800);}
      ctx.save();ctx.translate(400,748);ctx.scale(1,1/this.verticalScale);ctx.textAlign='center';ctx.font='bold 12px sans-serif';
      const boss=board.monsters.find(m=>m.hp>0),label=(game.mode==='coop'?'월드보스 성채':'보스 성채')+' · 플레이어당 5명'+(boss?' · '+board.expiresRound+'라운드 전까지 처치':' · 다음 보스 출현 대기');
      const w=ctx.measureText(label).width+28;ctx.fillStyle='#06101bd9';ctx.fillRect(-w/2,-16,w,25);ctx.fillStyle='#efd6a0';ctx.fillText(label,0,1);ctx.restore();
    }else{const theme=this.mapArt.draw(ctx,mapItem?themeFor(mapItem).map*10+1:game.round||1,this.clock,!!mapItem);this.mapArt.drawRoad(ctx,theme);}
    ctx.textAlign = 'center';
    for (const m of board.monsters) {
      const old = previousMonsters.get(m.id) || m;
      const progress = old.p + ((m.p - old.p + 1) % 1) * blend;
      const { x, y } = position(progress,m);
      this.positions.set(m.id, { x, y: y - 8 });
      this.monsterVisuals.drawMonster(ctx, m, boardIndex, x, y, this.clock, m.id === selectedEnemy);
    }
    if(quality.world)this.monsterVisuals.drawDeaths(ctx, boardIndex, this.clock);
    if(quality.world)this.cosmetics.deaths(ctx,game,boardIndex,position);
    const owners = boardOwners(game,boardIndex);
    for (const owner of owners) for (const original of owner.champions) {
      const old = previousHeroes.get(original.id) || original;
      const c = { ...original, x: old.x + (original.x - old.x) * blend, y: old.y + (original.y - old.y) * blend };
      this.positions.set(c.id, { x: c.x, y: c.y - (this.art.ready ? 23 : 0) });
      const type = CHAMPIONS[c.base].type, color = elementColors[type];
      if(quality.world)this.cosmetics.summon(ctx,c,owner,this.clock);
      if (c.id === selected || selectedIds.includes(c.id)) {
        ctx.fillStyle = '#b9f66d0a'; ctx.strokeStyle = '#b9f66d55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c.x, c.y, stats(c).range / game.mapScale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#d4fba1'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.arc(c.x, c.y, 27, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (c.destination) {
          ctx.strokeStyle = '#c3f49677'; ctx.setLineDash([3, 6]);
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.destination.x, c.destination.y); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(c.destination.x, c.destination.y, 6, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.fillStyle = '#060e0aaa'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 14, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLORS[c.tier] + 'a0'; ctx.lineWidth = (c.id === selected || selectedIds.includes(c.id)) ? 2 : 1;
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 12, 25, 9, 0, 0, Math.PI * 2); ctx.stroke();
      const ally = false;
      if (this.art.ready) this.drawCharacterSprite(ctx, c, type, ally);
      else { ctx.save(); if (ally) ctx.filter = 'grayscale(1) brightness(.72)'; this.drawChampion(ctx, c.x, c.y, type, ally ? '#8b9290' : color); ctx.restore(); }
      if (quality.world && c.tier >= 4) {
        ctx.strokeStyle = COLORS[c.tier] + '66'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c.x, c.y, 24 + Math.sin(seconds * 3) * 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,1/this.verticalScale);ctx.textAlign='center';ctx.font='bold 11px sans-serif';ctx.strokeStyle='#07101d';ctx.lineWidth=3;const stars='★'.repeat(Math.max(1,Math.min(7,c.tier+1)));ctx.strokeText(stars,0,-65);ctx.fillStyle='#ffda78';ctx.fillText(stars,0,-65);ctx.restore();
      {
        ctx.save();ctx.translate(c.x,c.y+32);ctx.scale(1,1/this.verticalScale);ctx.font='bold 11px sans-serif';const name=CHAMPIONS[c.base].name;const labelWidth=ctx.measureText(name).width+10;ctx.fillStyle='#03101ee8';ctx.fillRect(-labelWidth/2,-12,labelWidth,16);ctx.strokeStyle='#00101b';ctx.lineWidth=3;ctx.strokeText(name,0,0);ctx.fillStyle='#f5f7ff';ctx.fillText(name,0,0);ctx.restore();
        if(c.bossDebuff?.until>game.time){ctx.save();ctx.translate(c.x,c.y-52);ctx.scale(1,1/this.verticalScale);ctx.font='bold 11px sans-serif';ctx.textAlign='center';const label={stun:'✦ 스턴',weaken:'▼ 피해 -30%',slow:'▼ 이동 -50%'}[c.bossDebuff.kind];const w=ctx.measureText(label).width+12;ctx.fillStyle='#24101fee';ctx.fillRect(-w/2,-12,w,18);ctx.fillStyle='#ffb3c2';ctx.fillText(label,0,1);ctx.restore();}
        drawBlessingBadges(ctx,c,game.time,this.verticalScale,quality.champion?this.blessingFrame:null,this.clock,quality.champion);
      }

    }
    if (dragStart && dragNow) {
      const x=Math.min(dragStart.x,dragNow.x), y=Math.min(dragStart.y,dragNow.y), w=Math.abs(dragNow.x-dragStart.x), h=Math.abs(dragNow.y-dragStart.y);
      ctx.save(); ctx.fillStyle='#b9f66d18'; ctx.strokeStyle='#d4fba1'; ctx.lineWidth=2; ctx.setLineDash([8,5]); ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]); ctx.restore();
    }
    if (quality.champion && this.art.ready) this.drawImageEffects(ctx, boardIndex);else if(!quality.champion)this.visualEffects=[];
    for (const e of (this.art.ready || !quality.champion ? [] : game.effects.filter(e => e.board === boardIndex).slice(-100))) {
      const elapsed = Math.max(0, game.time - (e.born || game.time) + blend * 0.08);
      const fade = Math.max(0, 1 - elapsed / 0.3);
      if (!fade) continue;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = elementColors[e.type] || e.color; ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = [0, 1, 2, 4, 5, 8].includes(e.type) ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.tx, e.ty); ctx.stroke();
      ctx.beginPath(); ctx.arc(e.tx, e.ty, 3 + elapsed * 30, 0, Math.PI * 2); ctx.stroke();
      if (e.amount > 0) { ctx.font = 'bold 11px monospace'; ctx.fillText(e.amount, e.tx, e.ty - 14 - elapsed * 32); }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = board.monsters.length >= 75 ? '#ffa99b' : '#b3c4b2'; ctx.font = '11px monospace';
    ctx.fillText(`${monsterCount(game,board)} HOSTILES / ${board.spawn.length} INCOMING`, 400, 27);
    if(quality.champion)this.championSkillVisuals.draw(ctx,game,boardIndex,this.verticalScale,this.positions,position);
    if(quality.world)for(const boss of board.monsters){const hit=boss.basicAttack;if(!hit||hit.until<=game.time)continue;const from=position(boss.p,boss);ctx.save();ctx.globalAlpha=Math.max(0,(hit.until-game.time)/.3);ctx.strokeStyle=hit.kind==='stun'?'#ffe18a':hit.kind==='slow'?'#86d8ff':'#f788a4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(from.x,from.y-35);ctx.lineTo(hit.x,hit.y-15);ctx.stroke();ctx.beginPath();ctx.arc(hit.x,hit.y-15,12+(game.time-hit.born)*30,0,Math.PI*2);ctx.stroke();ctx.restore();}
    this.bossVisuals.sounds(game,board);if(quality.world)this.bossVisuals.draw(ctx,game,board,owners,this.positions,this.verticalScale,position);
    ctx.textAlign = 'left';return true;
  }
  drawCharacterSprite(ctx, c, type, ally = false) {
    const attack = this.attacks.get(c.id);
    const age = attack ? this.clock - attack.start : 10;
    const duration=Math.max(.2,Math.min(.64,1/stats(c).speed));
    const phase = Math.max(0, 1 - age / duration);
    const pulse = Math.sin(Math.min(1, age / 0.38) * Math.PI);
    const angle = attack ? Math.atan2(attack.ty - attack.y, attack.tx - attack.x) : 0;
    const walk=advanceWalk(this.walkStates.get(c.id),c,this.clock,this.current.status,this.verticalScale||1);
    this.walkStates.set(c.id,walk);
    const moving=walk.moving;
    const facing=moving?walk.facing:attack?(Math.cos(angle)<0?-1:1):walk.facing;
    const bob=moving?0:Math.sin(this.clock*2.3+c.id)*.8;
    let dx = 0, dy = 0, rotation = 0;
    if (!moving && phase > 0 && !this.art.attackFrames[type]) {
      if ([2, 9].includes(type)) { dx = Math.cos(angle) * pulse * 13; dy = Math.sin(angle) * pulse * 9; rotation = facing * pulse * 0.23; }
      else if ([0, 1, 8].includes(type)) { dx = -Math.cos(angle) * pulse * 5; rotation = -facing * pulse * 0.09; }
      else { dy = -pulse * 6; rotation = facing * pulse * 0.06; }
    }
    ctx.save(); ctx.translate(c.x + dx, c.y + dy + bob); ctx.rotate(rotation); ctx.scale(facing, 1 / (this.verticalScale || 1));
    const tint = 0;
    ctx.filter = !graphics().world?'none':ally ? 'grayscale(1) brightness(.72)' : `hue-rotate(${tint}deg) saturate(${1 + c.tier * 0.045})`;
    const frames=this.art.attackFrames[type];
    const walkingFrame=moving?this.art.walkFrames[type]?.[walk.frame]:null;
    const frame=walkingFrame||frames?.[!moving&&c.combatState!=='fear'&&c.combatState!=='stunned'&&age>=0&&age<duration?Math.min(7,Math.floor(age/duration*8)):7]||this.art.characters[type];
    // Match the idle character's height, independent of each sheet's transparent padding.
    const idle=frames?.[7];
    const reference=walkingFrame||idle||frame;
    const height=reference.bodyHeight?58*reference.height/reference.bodyHeight:80;
    const width=height*frame.width/frame.height;ctx.drawImage(frame,-width/2,frame.anchorY ? -height*frame.anchorY+12 : 12-height*.9,width,height);
    ctx.filter = 'none'; ctx.restore();
    if (graphics().champion && !moving && phase > 0 && type >= 3 && type <= 7) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = phase * 0.5;
      ctx.drawImage(this.art.effects[type], c.x - 23, c.y - 37, 46, 46); ctx.restore();
    }
  }
  drawImageEffects(ctx, boardIndex) {
    this.visualEffects = this.visualEffects.filter(e => this.clock - e.start < 0.75);
    for (const e of this.visualEffects) {
      if (e.board !== boardIndex) continue;
      const age = this.clock - e.start;
      if(e.chain){const to=this.positions.get(e.target)||{x:e.tx,y:e.ty};ctx.save();ctx.globalAlpha=Math.max(0,1-age/.5);ctx.strokeStyle='#aee8ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo((e.x+to.x)/2+8,(e.y+to.y)/2-10);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.restore();continue;}if(e.support){const target=this.positions.get(e.target)||{x:e.tx,y:e.ty};ctx.save();const source=this.positions.get(e.source)||e;ctx.strokeStyle='#ffdf82';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(source.x,source.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.strokeStyle='#ffe88c';ctx.globalAlpha=Math.max(0,1-age/.75);ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,target.y+12,28+age*15,12+age*8,0,0,Math.PI*2);ctx.stroke();ctx.font='bold 13px sans-serif';ctx.fillStyle='#ffe88c';ctx.fillText('✦ BUFF',target.x-24,target.y-65-age*20);ctx.restore();continue;}
      const type = e.type ?? 0;
      const target = this.positions.get(e.target);
      const tx = target?.x ?? e.tx, ty = target?.y ?? e.ty;
      const angle = Math.atan2(ty - e.y, tx - e.x);
      const melee = [2,11,12,15,16,18].includes(type);
      const travel = melee ? 0.05 : Math.min(.32,Math.max(.14,Math.hypot(tx-e.x,ty-e.y)/(type===0?1500:950)));
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      if (!melee && age < travel) {
        const t = age / travel;
        const px = e.x + (tx - e.x) * t, py = e.y - 24 + (ty - e.y + 24) * t;
        ctx.translate(px, py); ctx.rotate(Math.atan2(ty-e.y+24,tx-e.x));
        const w=type===14?58:type===0?42:48;
        if(this.projectileAtlas?.complete&&this.projectileAtlas.naturalWidth){
          const cell=projectileCell(type,t,this.projectileAtlas.naturalWidth,this.projectileAtlas.naturalHeight);
          for(let trail=2;trail>=0;trail--){ctx.globalAlpha=trail?.12/trail:.95;ctx.drawImage(this.projectileAtlas,...cell,-w*.65-trail*9,-w*.28,w,w*.56);}
        }else{ctx.globalAlpha=.9;ctx.drawImage(this.art.effects[type],-w/2,-w/2,w,w);}
      } else {
        const t = Math.min(1, (age - travel) / 0.5);
        const size = (type === 0 || type === 1 ? 37 : type === 8 ? 92 : 74) * (0.55 + Math.sin(t * Math.PI * 0.65) * 0.75);
        ctx.globalAlpha = (1 - t) * 0.95;
        ctx.translate(tx, ty);
        if (melee) ctx.rotate(angle + t * 0.8);
        if (type === 6) ctx.rotate(t * 2);
        ctx.drawImage(this.art.effects[type], -size / 2, -size / 2, size, size);
      }
      ctx.restore();
      if (e.amount > 0 && age >= travel) {
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - (age - travel) / 0.55);
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.strokeStyle = '#07110a'; ctx.lineWidth = 3;
        const y = ty - 23 - (age - travel) * 30;
        ctx.strokeText(e.amount, tx, y); ctx.fillStyle = elementColors[type]; ctx.fillText(e.amount, tx, y); ctx.restore();
      }
    }
  }
  drawChampion(ctx, x, y, type, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
    if (type === 0) { // Rifle and sight.
      ctx.fillRect(-10, -4, 17, 7); ctx.fillRect(5, -2, 12, 3); ctx.fillRect(-6, 3, 4, 8);
      ctx.strokeRect(-2, -8, 6, 3);
    } else if (type === 1) {
      ctx.beginPath(); ctx.arc(-5, 0, 13, -1.25, 1.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.moveTo(-10, 0); ctx.lineTo(15, 0); ctx.lineTo(10, -4); ctx.stroke();
    } else if (type === 2 || type === 9) {
      ctx.rotate(0.55); ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(4, -6); ctx.lineTo(2, 7); ctx.lineTo(-2, 7); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill();
      ctx.fillRect(-8, 6, 16, 3); ctx.fillRect(-2, 9, 4, 6);
      if (type === 9) { ctx.strokeStyle = '#e0c9ff'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 1.5); ctx.stroke(); }
    } else if (type === 3) {
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate(i * Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.moveTo(0, -8); ctx.lineTo(-4, -11); ctx.moveTo(0, -8); ctx.lineTo(4, -11); ctx.stroke(); ctx.restore(); }
    } else if (type === 4) {
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.bezierCurveTo(3, -4, 16, 0, 9, 10); ctx.bezierCurveTo(0, 21, -16, 8, -9, -2); ctx.lineTo(-4, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffefd0'; ctx.beginPath(); ctx.ellipse(0, 7, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    } else if (type === 5) {
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(12, 1); ctx.lineTo(5, 14); ctx.lineTo(-11, 9); ctx.lineTo(-13, -3); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-3, 3); ctx.lineTo(5, 14); ctx.moveTo(-3, 3); ctx.lineTo(12, 1); ctx.stroke();
    } else if (type === 6) {
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-13, i * 7); ctx.bezierCurveTo(0, i * 7, 14, i * 7 + 5, 11, i * 7 - 4); ctx.stroke(); }
    } else if (type === 7) {
      ctx.beginPath(); ctx.moveTo(-5, -13); ctx.lineTo(-5, -4); ctx.lineTo(-12, 10); ctx.quadraticCurveTo(0, 18, 12, 10); ctx.lineTo(5, -4); ctx.lineTo(5, -13); ctx.closePath(); ctx.stroke();
      ctx.fillRect(-5, 4, 10, 6); ctx.fillRect(-7, -15, 14, 3);
    } else {
      ctx.beginPath(); ctx.arc(-1, 3, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -8); ctx.quadraticCurveTo(0, -17, 11, -12); ctx.stroke(); ctx.fillStyle = '#ffe4a5'; ctx.fillRect(10, -16, 3, 6);
    }
    ctx.restore();
  }
}

// Advance footsteps by rendered distance, so blocked champions do not walk in place.
export function advanceWalk(previous,c,clock,status,verticalScale=1){
  const state=previous?{...previous}:{x:c.x,y:c.y,distance:0,lastMoved:-Infinity,facing:1,frame:0,moving:false};
  if(status==='paused')return state;
  const dx=c.x-state.x,dy=c.y-state.y,distance=Math.hypot(dx,dy*verticalScale);
  state.x=c.x;state.y=c.y;
  if(status!=='playing'){state.moving=false;state.distance=0;state.frame=0;return state;}
  if(distance>.01&&distance<80){
    if(!state.moving)state.distance=0;
    state.distance+=distance;state.lastMoved=clock;
    if(Math.abs(dx)>.05)state.facing=dx<0?-1:1;
  }
  const hasOrder=!!(c.destination||c.approach);
  state.moving=clock-state.lastMoved<.12&&(distance>.01||hasOrder);
  state.frame=Math.floor(state.distance/8)%8;
  return state;
}

// Name baseline is y+32. Badge rows begin below the name, with unscaled readable text.
export function drawBlessingBadges(ctx,c,time,verticalScale=1,frame,clock=0,decorative=true){
 const buffs=Object.entries(c.supportBuffs||{}).filter(([,b])=>b.until>time);if(!buffs.length)return;
 if(decorative){ctx.save();ctx.strokeStyle=buffs.some(([k])=>k==='damage')?'#ffe48b':'#89edff';ctx.lineWidth=2;ctx.globalAlpha=.65+.15*Math.sin(clock*3);ctx.beginPath();ctx.ellipse(c.x,c.y+12,26,11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 ctx.save();ctx.translate(c.x,c.y+32);ctx.scale(1,1/verticalScale);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 9px sans-serif';
 buffs.forEach(([kind,b],i)=>{const y=8+i*21,color=kind==='damage'?'#ffe7a0':'#9bf2ff';
 if(frame?.complete&&frame.naturalWidth){ctx.save();if(kind==='speed')ctx.filter='hue-rotate(145deg)';ctx.drawImage(frame,frame.naturalWidth*.025,frame.naturalHeight*.26,frame.naturalWidth*.95,frame.naturalHeight*.42,-57,y,114,21);ctx.restore();}else{ctx.fillStyle='#071729';ctx.fillRect(-54,y+2,108,17);ctx.strokeStyle=color;ctx.strokeRect(-54,y+2,108,17);}
 ctx.strokeStyle='#06101f';ctx.lineWidth=2.5;const label=(kind==='damage'?'피해':'공속')+' +'+Math.round(b.amount*100)+'% · '+Math.ceil(b.until-time)+'초';ctx.strokeText(label,5,y+11);ctx.fillStyle=color;ctx.fillText(label,5,y+11);
 });ctx.restore();
}

export function projectileCell(type,progress,width,height){
 const row=({0:0,1:1,3:2,4:3,5:4,6:5,7:6,8:3,10:7,13:5,14:0,17:1,19:2})[type]??0;
 const edges=[0,.155,.285,.411,.538,.657,.779,.895,1];
 const frame=Math.min(7,Math.max(0,Math.floor(progress*8)));
 return [edges[frame]*width,row*height/8,(edges[frame+1]-edges[frame])*width,height/8];
}

const drawArena=ArenaRenderer.prototype.draw;ArenaRenderer.prototype.draw=function(canvas,boardIndex,...args){const drawn=drawArena.call(this,canvas,boardIndex,...args);if(drawn&&graphics().world&&canvas&&this.current?.boards[boardIndex])this.cosmetics.victory(canvas.getContext('2d'),this.current,this.current.players[boardIndex],this.clock);};
