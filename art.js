// Generated RGBA atlases retain their original alpha. Effects use additive blending at render time.
export const CHARACTER_ATLAS = '/assets/champions-v3.png';
export const EFFECT_ATLAS = '/assets/effects-v3.png';

export function portraitMarkup(type, className = '', variant = 0) {
  const column = type % 5, row = Math.floor(type / 5);
  return `<span aria-hidden="true" class="character-portrait ${className}" style="--portrait-x:${column * 25}%;--portrait-y:${row * 100}%;--variant:${variant * 3}deg"></span>`;
}

export class ArtAssets {
  constructor() {
    this.characters = [];
    this.effects = [];
    this.ready = false;
    this.error = false;
    this.load();
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
