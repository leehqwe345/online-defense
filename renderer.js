import { CHAMPIONS, COLORS, stats, position } from './engine.js';
import { ArtAssets, MONSTER_NAMES, monsterName } from './art.js';
import { MonsterVisuals } from './monster-visuals.js';

const elementColors = ['#edcb87', '#b9dc89', '#e3b09b', '#78d2ed', '#ffad6c', '#ceb992', '#88debd', '#acd76f', '#ecba79', '#c8a5f2'];

// An isolated animation viewer. It never sends gameplay actions or changes a room.
export function openAnimationPreview(base, tier = 0) {
  if (!CHAMPIONS[base]) return;
  document.querySelector('#animation-preview')?.close();
  const dialog = document.createElement('dialog'); dialog.id = 'animation-preview';
  dialog.innerHTML = `<span class="eyebrow">CHARACTER SHOWCASE</span><h2>${CHAMPIONS[base].name}</h2><p>캐릭터 공격 모션과 생성 이펙트 미리보기</p><canvas width="700" height="440" aria-label="캐릭터 공격 애니메이션"></canvas><div class="preview-legend"><span>조준 · 공격 · 명중</span><button class="mini-btn" id="preview-close">닫기 ×</button></div>`;
  document.body.append(dialog); dialog.showModal();
  const renderer = new ArenaRenderer();
  const scene = document.createElement('canvas'); scene.width = scene.height = 800;
  const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
  let frameId, last = performance.now(), time = 0, nextShot = 0;
  dialog.querySelector('#preview-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { cancelAnimationFrame(frameId); dialog.remove(); }, { once: true });
  const loop = now => {
    if (!dialog.open) return;
    time += Math.min(0.05, (now - last) / 1000); last = now;
    const champion = { id: 1, base, tier, x: 400, y: 180, equipment: {}, growth: 0 };
    const target = { id: 2, p: 0.15, hp: 1000, maxHp: 1000, family: 2, defenses: [], slow: 0, stun: 0 };
    const game = { time, status: 'playing', mode: 'single', mapScale: 1, players: [{ name: '미리보기', champions: [champion] }], boards: [{ monsters: [target], spawn: [] }], effects: [] };
    if (time >= nextShot && renderer.art.ready) {
      nextShot = time + Math.max(0.55, 1 / stats(champion).speed);
      const point = position(target.p);
      target.hurt = { born: time, type: CHAMPIONS[base].type, dx: 0, dy: -1 };
      game.effects = [{ source: 1, x: champion.x, y: champion.y, tx: point.x, ty: point.y, born: time, until: time + 0.3, amount: Math.round(stats(champion).attack), type: CHAMPIONS[base].type, board: 0 }];
    }
    renderer.receive(game); renderer.draw(scene, 0, 1, 2);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(scene, 245, 10, 350, 220, 0, 0, canvas.width, canvas.height);
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
}

export function openMonsterPreview() {
  document.querySelector('#monster-preview')?.close();
  const dialog = document.createElement('dialog'); dialog.id = 'monster-preview';
  dialog.setAttribute('aria-label', '몬스터 피격·사망 미리보기');
  dialog.innerHTML = `<span class="eyebrow">BESTIARY / REACTION STUDY</span><h2>몬스터 피격 · 사망</h2><p>실제 전투와 같은 이미지·연출로 재생합니다.</p><label for="preview-monster">몬스터 종류</label><select id="preview-monster">${MONSTER_NAMES.map((name, i) => `<option value="${i}">${i >= 10 ? '보스 · ' : ''}${name}</option>`).join('')}</select><canvas width="700" height="400" aria-label="몬스터 반응 애니메이션"></canvas><div class="preview-legend"><span id="monster-preview-state" role="status">이미지 불러오는 중</span><div><button class="mini-btn" data-reaction="hit">피격 재생</button><button class="mini-btn" data-reaction="death">사망 재생</button><button class="mini-btn" id="monster-preview-close">닫기 ×</button></div></div>`;
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
    const index = Number(dialog.querySelector('select').value), boss = index >= 10;
    const monster = { id, family: index % 10, round: index === 11 ? 20 : 10, boss, p: 0.125, hp: 100, maxHp: 100, slow: 0, stun: 0 };
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
    dialog.querySelector('#monster-preview-state').textContent = `${monsterName(monster)} · ${!renderer.art.monstersReady ? '불러오는 중' : dead ? '붕괴 → 영혼 소멸' : hitDone ? '피격 → 복귀' : '대기'}`;
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
}

export class ArenaRenderer {
  constructor() {
    this.previous = null; this.current = null; this.received = 0; this.positions = new Map();
    this.art = new ArtAssets(); this.attacks = new Map(); this.seen = new Map(); this.visualEffects = [];
    this.monsterVisuals = new MonsterVisuals(this.art);
    this.clock = 0; this.lastFrame = performance.now();
  }
  receive(game) {
    if (!this.current) { this.attacks.clear(); this.seen.clear(); this.visualEffects = []; this.monsterVisuals.reset(); }
    this.previous = this.current;
    this.current = game;
    this.received = performance.now();
    this.monsterVisuals.receive(game, this.clock);
    for (const effect of game.effects) {
      const source = effect.source ?? game.players.flatMap(p => p.champions).find(c => Math.hypot(c.x - effect.x, c.y - effect.y) < 32)?.id;
      const key = `${source}:${effect.target}:${effect.born}:${effect.tx}:${effect.ty}`;
      if (this.seen.has(key)) continue;
      this.seen.set(key, game.time);
      const shot = { ...effect, source, start: this.clock };
      this.visualEffects.push(shot);
      const existing = this.attacks.get(source);
      if (!existing || existing.born !== effect.born) this.attacks.set(source, shot);
    }
    for (const [key, time] of this.seen) if (game.time - time > 2) this.seen.delete(key);
    this.visualEffects = this.visualEffects.slice(-160);
  }
  draw(canvas, boardIndex, selected, selectedEnemy, selectedIds = [], dragStart = null, dragNow = null) {
    const game = this.current;
    if (!game || !canvas || !game.boards[boardIndex]) return;
    const ctx = canvas.getContext('2d');
    const now = performance.now();
    if (game.status !== 'paused') this.clock += Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const blend = Math.min(1, (performance.now() - this.received) / 100);
    const previousBoard = this.previous?.boards[boardIndex];
    const previousMonsters = new Map(previousBoard?.monsters.map(m => [m.id, m]) || []);
    const previousHeroes = new Map(this.previous?.players.flatMap(p => p.champions).map(c => [c.id, c]) || []);
    const board = game.boards[boardIndex];
    this.positions.clear();
    const seconds = game.time;
    ctx.clearRect(0, 0, 800, 800);
    const bg = ctx.createRadialGradient(400, 350, 80, 400, 400, 560);
    bg.addColorStop(0, '#1c3028'); bg.addColorStop(1, '#101c1b');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 800);
    ctx.lineWidth = 1; ctx.strokeStyle = '#688d5720';
    for (let i = 16; i < 800; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 800); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
    }
    ctx.lineJoin = 'round'; ctx.lineWidth = 68; ctx.strokeStyle = '#0b1413'; ctx.strokeRect(80, 80, 640, 640);
    ctx.lineWidth = 59; ctx.strokeStyle = '#334137'; ctx.strokeRect(80, 80, 640, 640);
    ctx.lineWidth = 1; ctx.strokeStyle = '#80976666'; ctx.strokeRect(44, 44, 712, 712); ctx.strokeRect(116, 116, 568, 568);
    ctx.strokeStyle = '#a1b87945'; ctx.setLineDash([7, 19]); ctx.lineDashOffset = -seconds * 10;
    ctx.strokeRect(80, 80, 640, 640); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    for (const [x, y] of [[44, 44], [744, 44], [744, 744], [44, 744]]) {
      ctx.fillStyle = '#b1ca8c'; ctx.fillRect(x, y, 12, 12);
      ctx.strokeStyle = '#b1ca8c40'; ctx.strokeRect(x - 5, y - 5, 22, 22);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#b9d594'; ctx.font = '20px sans-serif';
    ctx.fillText('→', 400, 87); ctx.fillText('↓', 720, 407); ctx.fillText('←', 400, 727); ctx.fillText('↑', 80, 407);
    ctx.fillStyle = '#89b27613'; ctx.font = 'bold 75px sans-serif'; ctx.fillText('LOOP', 400, 402);
    ctx.fillStyle = '#97ba7d3d'; ctx.font = '11px monospace'; ctx.fillText('DEFENSE PROTOCOL / SECTOR 01', 400, 432);
    const owners = game.mode === 'versus' ? [game.players[boardIndex]] : game.players;
    for (const owner of owners) for (const original of owner.champions) {
      const old = previousHeroes.get(original.id) || original;
      const c = { ...original, x: old.x + (original.x - old.x) * blend, y: old.y + (original.y - old.y) * blend };
      this.positions.set(c.id, { x: c.x, y: c.y - (this.art.ready ? 23 : 0) });
      const type = CHAMPIONS[c.base].type, color = elementColors[type];
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
      const ally = game.mode === 'coop' && owner !== game.players[0];
      if (this.art.ready) this.drawCharacterSprite(ctx, c, type, ally);
      else { ctx.save(); if (ally) ctx.filter = 'grayscale(1) brightness(.72)'; this.drawChampion(ctx, c.x, c.y, type, ally ? '#8b9290' : color); ctx.restore(); }
      if (c.tier >= 4) {
        ctx.strokeStyle = COLORS[c.tier] + '66'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(c.x, c.y, 24 + Math.sin(seconds * 3) * 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = COLORS[c.tier];
      for (let i = 0; i <= c.tier; i++) ctx.fillRect(c.x - c.tier * 3 + i * 6 - 1.5, c.y + 26, 3, 3);
      if (c.id === selected || selectedIds.includes(c.id)) {
        ctx.font = '10px sans-serif'; ctx.fillStyle = '#d2e2cb'; ctx.fillText(CHAMPIONS[c.base].name, c.x, c.y + 43);
        if (game.mode === 'coop') { ctx.font = '9px sans-serif'; ctx.fillStyle = '#9bac99'; ctx.fillText(owner.name, c.x, c.y + 55); }
      }
    }
    if (dragStart && dragNow) {
      const x=Math.min(dragStart.x,dragNow.x), y=Math.min(dragStart.y,dragNow.y), w=Math.abs(dragNow.x-dragStart.x), h=Math.abs(dragNow.y-dragStart.y);
      ctx.save(); ctx.fillStyle='#b9f66d18'; ctx.strokeStyle='#d4fba1'; ctx.lineWidth=2; ctx.setLineDash([8,5]); ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]); ctx.restore();
    }
    for (const m of board.monsters) {
      const old = previousMonsters.get(m.id) || m;
      const progress = old.p + ((m.p - old.p + 1) % 1) * blend;
      const { x, y } = position(progress);
      this.positions.set(m.id, { x, y: y - 8 });
      this.monsterVisuals.drawMonster(ctx, m, boardIndex, x, y, this.clock, m.id === selectedEnemy);
    }
    this.monsterVisuals.drawDeaths(ctx, boardIndex, this.clock);
    if (this.art.ready) this.drawImageEffects(ctx, boardIndex);
    for (const e of (this.art.ready ? [] : game.effects.filter(e => e.board === boardIndex).slice(-100))) {
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
    ctx.fillText(`${board.monsters.length} HOSTILES / ${board.spawn.length} INCOMING`, 400, 27);
    ctx.textAlign = 'left';
  }
  drawCharacterSprite(ctx, c, type, ally = false) {
    const attack = this.attacks.get(c.id);
    const age = attack ? this.clock - attack.start : 10;
    const phase = Math.max(0, 1 - age / 0.38);
    const pulse = Math.sin(Math.min(1, age / 0.38) * Math.PI);
    const angle = attack ? Math.atan2(attack.ty - attack.y, attack.tx - attack.x) : 0;
    const facing = c.destination ? (c.destination.x < c.x ? -1 : 1) : attack && Math.cos(angle) < 0 ? -1 : 1;
    const moving = !!c.destination && this.current.status === 'playing';
    const bob = moving ? Math.sin(this.clock * 14 + c.id) * 3 : Math.sin(this.clock * 2.3 + c.id) * 0.8;
    let dx = 0, dy = 0, rotation = 0;
    if (phase > 0) {
      if ([2, 9].includes(type)) { dx = Math.cos(angle) * pulse * 13; dy = Math.sin(angle) * pulse * 9; rotation = facing * pulse * 0.23; }
      else if ([0, 1, 8].includes(type)) { dx = -Math.cos(angle) * pulse * 5; rotation = -facing * pulse * 0.09; }
      else { dy = -pulse * 6; rotation = facing * pulse * 0.06; }
    }
    ctx.save(); ctx.translate(c.x + dx, c.y + dy + bob); ctx.rotate(rotation); ctx.scale(facing, 1);
    const tint = Math.floor(c.base / 10) * 3;
    ctx.filter = ally ? 'grayscale(1) brightness(.72)' : `hue-rotate(${tint}deg) saturate(${1 + c.tier * 0.045})`;
    ctx.drawImage(this.art.characters[type], -34, -78, 68, 100);
    ctx.filter = 'none'; ctx.restore();
    if (phase > 0 && type >= 3 && type <= 7) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = phase * 0.5;
      ctx.drawImage(this.art.effects[type], c.x - 23, c.y - 37, 46, 46); ctx.restore();
    }
  }
  drawImageEffects(ctx, boardIndex) {
    this.visualEffects = this.visualEffects.filter(e => this.clock - e.start < 0.75);
    for (const e of this.visualEffects) {
      if (e.board !== boardIndex) continue;
      const age = this.clock - e.start;
      const type = e.type ?? 0;
      const target = this.positions.get(e.target);
      const tx = target?.x ?? e.tx, ty = target?.y ?? e.ty;
      const angle = Math.atan2(ty - e.y, tx - e.x);
      const melee = type === 2 || type === 9;
      const travel = melee ? 0.05 : type === 0 ? 0.08 : 0.18;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      if (!melee && age < travel) {
        const t = age / travel;
        const px = e.x + (tx - e.x) * t, py = e.y - 24 + (ty - e.y + 24) * t;
        ctx.translate(px, py); ctx.rotate(angle);
        const w = type === 1 ? 42 : type === 0 ? 30 : 28;
        ctx.globalAlpha = 0.9; ctx.drawImage(this.art.effects[type], -w / 2, -w / 2, w, w);
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
