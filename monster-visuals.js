import { position } from './engine.js';
import { monsterSpriteIndex } from './art.js';

export const reactionDelay = type => type === 'poison' ? 0 : [2, 9].includes(type) ? 0.05 : type === 0 ? 0.08 : 0.18;
const colors = ['#92ad79', '#ad9b7b', '#b18771', '#73acbd', '#cc8862', '#a19a74', '#9c8db2', '#ae7ea0', '#78a995', '#b3a67e'];
const keyFor = (board, id) => `${board}:${id}`;

// Network events are deduplicated separately from the render clock, so pausing
// freezes the animation and a monster removed between snapshots can still die visibly.
export class MonsterVisuals {
  constructor(art) { this.art = art; this.reset(); }
  reset() { this.hits = new Map(); this.deaths = new Map(); this.seenDeaths = new Map(); }
  receive(game, clock) {
    const alive = new Set();
    game.boards.forEach((board, bi) => {
      for (const monster of board.monsters) {
        const key = keyFor(bi, monster.id); alive.add(key);
        const hurt = monster.hurt, old = this.hits.get(key);
        if (hurt && game.time - hurt.born < 0.6 && hurt.born !== old?.born) {
          // Rapid hits may refresh the reaction but cannot postpone an already scheduled impact.
          const start = old && old.start > clock ? old.start : clock + reactionDelay(hurt.type);
          this.hits.set(key, { ...hurt, start });
        }
      }
    });
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
  sprite(ctx, monster, width, flash = 0) {
    const index = monsterSpriteIndex(monster), tile = this.art.monsters[index];
    if (tile) {
      const height = width * tile.height / tile.width;
      ctx.drawImage(tile, -width / 2, -height * 0.68, width, height);
      if (flash > 0) {
        const alpha = ctx.globalAlpha; ctx.globalAlpha *= flash;
        ctx.drawImage(this.art.monsterFlashes[index], -width / 2, -height * 0.68, width, height); ctx.globalAlpha = alpha;
      }
    } else {
      ctx.fillStyle = colors[monster.family] || colors[0];
      ctx.beginPath(); ctx.arc(0, -5, width * 0.23, 0, Math.PI * 2); ctx.fill();
    }
  }
  reaction(ctx, row, progress, x, y, size, alpha = 1) {
    if (progress < 0 || progress >= 1) return;
    const frame = Math.min(3, Math.floor(progress * 4)), tile = this.art.reactions[row * 4 + frame];
    if (!tile) return;
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha * (1 - progress * 0.5);
    ctx.drawImage(tile, x - size / 2, y - size / 2, size, size); ctx.restore();
  }
  drawMonster(ctx, monster, board, x, y, clock, selected) {
    const width = monster.boss ? 96 : 62, halfBar = monster.boss ? 32 : 20;
    const hit = this.hits.get(keyFor(board, monster.id)), age = hit ? clock - hit.start : 10;
    const progress = age >= 0 && age < 0.3 ? age / 0.3 : 1;
    const pulse = Math.sin(progress * Math.PI) * (1 - progress);
    const moving = !(monster.stun > 0), phase = clock * (monster.slow > 0 ? 5 : 10) + monster.id;
    const floating = [3, 6, 7, 8].includes(monster.family);
    const bob = moving ? Math.sin(phase) * (floating ? 2.2 : 1.1) : 0;
    const dx = (hit?.dx || 0) * pulse * (monster.boss ? 5 : 10), dy = (hit?.dy || 0) * pulse * 5;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(0, 10, width * 0.25, width * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    if (selected) { ctx.strokeStyle = '#fff2b4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 9, width * 0.36, width * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(dx, dy + bob); ctx.rotate(pulse * 0.12 * (hit?.dx || 1));
    ctx.scale(monster.p >= 0.5 ? -1 : 1, 1);
    const squash = moving && [0, 9].includes(monster.family) ? Math.sin(phase) * 0.035 : 0;
    ctx.scale(1 + squash + pulse * 0.16, 1 - squash - pulse * 0.18);
    if (monster.slow > 0) ctx.filter = 'saturate(.65) brightness(1.12)';
    this.sprite(ctx, monster, width, age >= 0 && age < 0.12 ? (1 - age / 0.12) * 0.9 : 0);
    ctx.restore();
    if (age >= 0 && age < 0.3 && hit?.type !== 'poison') this.reaction(ctx, 0, age / 0.3, dx, dy - 8, width * 0.75, 0.8);
    if (hit?.type === 'poison' && age >= 0 && age < 0.3) { ctx.strokeStyle = `rgba(171,223,97,${1 - age / 0.3})`; ctx.beginPath(); ctx.ellipse(0, 8, width * 0.28, width * 0.1, 0, 0, Math.PI * 2); ctx.stroke(); }
    const barY = monster.boss ? -53 : -36;
    ctx.fillStyle = '#08120e'; ctx.fillRect(-halfBar - 1, barY - 1, halfBar * 2 + 2, 6);
    ctx.fillStyle = monster.boss ? '#ffcd78' : '#b9e388'; ctx.fillRect(-halfBar, barY, halfBar * 2 * Math.max(0, Math.min(1, monster.hp / monster.maxHp)), 4);
    ctx.textAlign = 'center';
    if (monster.boss) { ctx.fillStyle = '#ffdc94'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('BOSS', 0, barY - 5); }
    if (monster.stun > 0) { ctx.fillStyle = '#c8efff'; ctx.font = '15px sans-serif'; ctx.fillText('✧', halfBar + 7, barY + 4); }
    ctx.restore();
  }
  drawDeaths(ctx, board, clock) {
    this.prune(clock);
    for (const monster of this.deaths.values()) {
      if (monster.board !== board) continue;
      const age = clock - monster.start, t = Math.max(0, age / monster.duration);
      const { x, y } = position(monster.p), width = monster.boss ? 96 : 62;
      const fall = Math.min(1, t / 0.6), direction = monster.p >= 0.5 ? -1 : 1;
      ctx.save(); ctx.translate(x + (monster.hurt?.dx || 0) * fall * 9, y + fall * 12);
      ctx.globalAlpha = Math.max(0, 1 - t * 1.8);
      ctx.rotate(direction * fall * 0.75); ctx.scale(direction * (1 - fall * 0.35), 1 - fall * 0.65);
      this.sprite(ctx, monster, width, age >= 0 && age < 0.1 ? 1 - age / 0.1 : 0); ctx.restore();
      if (age >= 0) this.reaction(ctx, 1, t, x, y - 10 - t * 20, width * (0.8 + t * 0.65), monster.boss ? 1 : 0.8);
    }
  }
}
