// Generated RGBA atlases retain their original alpha. Effects use additive blending at render time.
export const CHARACTER_ATLAS = '/assets/champions-v3.png';
export const EFFECT_ATLAS = '/assets/effects-v3.png';
export const MONSTER_ATLAS = '/assets/monsters-v4.png';
export const REACTION_ATLAS = '/assets/monster-reactions-v4.png';
export const MONSTER_NAMES = ['이끼뿔 슬라임', '청동 방패 고블린', '붉은 송곳니 멧돼지', '빙정 정령', '잿불 임프', '사암 골렘', '그림자 망령', '심연의 마안', '회오리 박쥐', '맹독 버섯', '고대 비취 수호자', '홍염의 군주'];
export function monsterSpriteIndex(monster) {
  return monster.boss ? 10 + Math.max(0, Math.floor((monster.round || 10) / 10) - 1) % 2 : Math.max(0, Math.min(9, monster.family || 0));
}
export function monsterName(monster) { return MONSTER_NAMES[monsterSpriteIndex(monster)]; }
export function monsterPortraitMarkup(monster) {
  const index = monsterSpriteIndex(monster);
  return `<span aria-hidden="true" class="monster-portrait" style="background-position:${index % 4 / 3 * 100}% ${Math.floor(index / 4) * 50}%"></span>`;
}

export function portraitMarkup(type, className = '', variant = 0) {
  const column = type % 5, row = Math.floor(type / 5);
  return `<span aria-hidden="true" class="character-portrait ${className}" style="--portrait-x:${column * 25}%;--portrait-y:${row * 100}%;--variant:${variant * 3}deg"></span>`;
}

export class ArtAssets {
  constructor() {
    this.characters = [];
    this.effects = [];
    this.monsters = []; this.monsterFlashes = []; this.reactions = [];
    this.monstersReady = false;
    this.ready = false;
    this.error = false;
    this.load();
    this.loadMonsters();
  }
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url;
    });
  }
  async load() {
    try {
      const [characters, effects] = await Promise.all([this.loadImage(CHARACTER_ATLAS), this.loadImage(EFFECT_ATLAS)]);
      for (let i = 0; i < 10; i++) {
        this.characters.push(this.tile(characters, i, true));
        this.effects.push(this.tile(effects, i, false));
      }
      this.ready = true;
    } catch { this.error = true; }
  }
  async loadMonsters() {
    try {
      const image = await this.loadImage(MONSTER_ATLAS);
      for (let i = 0; i < 12; i++) {
        const tile = this.gridTile(image, i, 4, 3);
        this.monsters.push(tile);
        const flash = this.gridTile(image, i, 4, 3), ctx = flash.getContext('2d');
        ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#fff7d7'; ctx.fillRect(0, 0, flash.width, flash.height);
        this.monsterFlashes.push(flash);
      }
      this.monstersReady = true;
    } catch { this.monsterError = true; }
    try {
      const image = await this.loadImage(REACTION_ATLAS);
      for (let i = 0; i < 8; i++) this.reactions.push(this.gridTile(image, i, 4, 2));
    } catch { this.reactionError = true; }
  }
  gridTile(image, index, columns, rows) {
    const tile = document.createElement('canvas');
    tile.width = 256; tile.height = Math.round(256 * (image.height / rows) / (image.width / columns));
    const ctx = tile.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, index % columns * image.width / columns, Math.floor(index / columns) * image.height / rows, image.width / columns, image.height / rows, 0, 0, tile.width, tile.height);
    return tile;
  }
  tile(image, index, character) {
    const tile = document.createElement('canvas'); tile.width = 256; tile.height = character ? 400 : 256;
    const ctx = tile.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, index % 5 * image.width / 5, Math.floor(index / 5) * image.height / 2, image.width / 5, image.height / 2, 0, 0, tile.width, tile.height);
    if (!character) {
      ctx.globalCompositeOperation = 'destination-in';
      const fade = ctx.createRadialGradient(128, 128, 70, 128, 128, 130);
      fade.addColorStop(0, '#fff'); fade.addColorStop(1, '#fff0');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, 256, 256);
    }
    return tile;
  }
}
