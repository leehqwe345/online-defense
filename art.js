import {ITEMS,itemDescription} from './engine.js';
import {MONSTERS} from './monsters.js';
const monsterPortraitImages=[];
const portraitImages = [];
export const WALK_ATLASES=Array.from({length:15},(_,i)=>`/assets/champion-${i}-walk-v1.png`);
export const ATTACK_ATLASES=Array.from({length:15},(_,i)=>`/assets/champion-${i}-attack-v1.png`);
// Generated RGBA atlases retain their original alpha. Effects use additive blending at render time.
export const CHARACTER_ATLAS = '/assets/champions-v3.png';
export const EFFECT_ATLAS = '/assets/effects-v3.png';
export const MONSTER_ATLAS = '/assets/monsters-v4.png';
export const REACTION_ATLAS = '/assets/monster-reactions-v4.png';
export const MONSTER_NAMES = [...MONSTERS.slice(0,10).map(m=>m.name),'고대 비취 수호자','홍염의 군주',...MONSTERS.slice(10).map(m=>m.name)];
export function monsterSpriteIndex(monster) {
  return monster.boss ? 10 + Math.max(0, Math.floor((monster.round || 10) / 10) - 1) % 2 : ((monster.family||0)<10?Math.max(0,monster.family||0):Math.min(39,monster.family)+2);
}
export function monsterName(monster) { return MONSTER_NAMES[monsterSpriteIndex(monster)]; }
export function monsterPortraitMarkup(monster) {
  const index = monsterSpriteIndex(monster);
  if(index>=12)return `<span aria-hidden="true" class="monster-portrait" data-monster-portrait="${index}" style="background-image:url('${monsterPortraitImages[index]||''}');background-size:contain;background-position:center"></span>`;
  return `<span aria-hidden="true" class="monster-portrait" style="background-position:${index % 4 / 3 * 100}% ${Math.floor(index / 4) * 50}%"></span>`;
}

export function portraitMarkup(type, className = '', variant = 0) {
  return `<span aria-hidden="true" data-champion-portrait="${type}" class="character-portrait ${className}" style="background-image:url('${portraitImages[type] || ''}');background-size:contain;background-position:center;--variant:${variant * 3}deg"></span>`;
}

export class ArtAssets {
  constructor() {
    this.characters = [];
    this.effects = [];
    this.attackFrames=[];this.walkFrames=[];this.loadAttackFrames();this.loadWalkFrames();
    this.monsterWalks=[];this.loadMonsterWalks();this.monsters = []; this.monsterFlashes = []; this.reactions = [];
    this.monstersReady = false;
    this.ready = false;
    this.error = false;
    this.load();
    this.loadMonsters();this.loadExpandedMonsters();
  }
  async loadAttackFrames(){await Promise.all(ATTACK_ATLASES.map(async(url,type)=>{try{const sheet=await this.loadImage(url);this.attackFrames[type]=this.characterFrames(sheet);portraitImages[type]=this.tightPortrait(this.attackFrames[type][7]).toDataURL();document.querySelectorAll('[data-champion-portrait="'+type+'"]').forEach(el=>el.style.backgroundImage='url("'+portraitImages[type]+'")');}catch{}}));}
  async loadWalkFrames(){await Promise.all(WALK_ATLASES.map(async(url,type)=>{try{this.walkFrames[type]=this.characterFrames(await this.loadImage(url));}catch(error){console.warn('Walking sprite failed to load',url,error);}}));}
  characterFrames(image,expected=8) {
    const source=document.createElement('canvas');source.width=image.width;source.height=image.height;
    const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,image.width,image.height);
    return splitCharacterPixels(pixels,expected).map(frame=>{
      const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
      canvas.getContext('2d').putImageData(new ImageData(frame.data,frame.width,frame.height),0,0);canvas.anchorY=frame.anchorY;canvas.bodyHeight=frame.bodyHeight;return canvas;
    });
  }
  async loadMonsterWalks(){await Promise.all(Array.from({length:7},async(_,group)=>{try{const image=await this.loadImage('/assets/monster-walk-'+group+'-v1.png');const frames=this.characterFrames(image,24);for(let row=0;row<6;row++)this.monsterWalks[group*6+row]=frames.slice(row*4,row*4+4);}catch(error){console.warn('Monster walking atlas',group,error);}}));}
  tightPortrait(frame){const ctx=frame.getContext('2d',{willReadFrequently:true}),{data}=ctx.getImageData(0,0,frame.width,frame.height);let left=frame.width,top=frame.height,right=0,bottom=0;for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++)if(data[(y*frame.width+x)*4+3]>=32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}const tile=document.createElement('canvas');tile.width=right-left+9;tile.height=bottom-top+9;tile.getContext('2d').drawImage(frame,left,top,right-left+1,bottom-top+1,4,4,right-left+1,bottom-top+1);return tile;}
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
      for(const type of [6,2,2,3,8])this.effects.push(this.effects[type]);
      for(const type of [6,2,2,3,0])this.characters.push(this.characters[type]);
      this.ready = true;
    } catch { this.error = true; }
  }
  async loadExpandedMonsters(){await Promise.all([0,1,2].map(async group=>{try{const sheet=await this.loadImage('/assets/monsters-expansion-'+group+'-v1.png');const tiles=this.characterFrames(sheet,10);tiles.forEach((tile,i)=>{const index=12+group*10+i;this.monsters[index]=tile;const flash=document.createElement('canvas');flash.width=tile.width;flash.height=tile.height;const ctx=flash.getContext('2d');ctx.drawImage(tile,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#fff7d7';ctx.fillRect(0,0,flash.width,flash.height);this.monsterFlashes[index]=flash;monsterPortraitImages[index]=tile.toDataURL();document.querySelectorAll('[data-monster-portrait="'+index+'"]').forEach(el=>el.style.backgroundImage='url("'+monsterPortraitImages[index]+'")');});}catch(error){console.warn('Monster atlas failed',group,error);}}));}
  async loadMonsters() {
    try {
      const image = await this.loadImage(MONSTER_ATLAS);
      for (let i = 0; i < 12; i++) {
        const tile = this.gridTile(image, i, 4, 3);
        this.monsters[i]=tile;
        const flash = this.gridTile(image, i, 4, 3), ctx = flash.getContext('2d');
        ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#fff7d7'; ctx.fillRect(0, 0, flash.width, flash.height);
        this.monsterFlashes[i]=flash;
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

export function equipmentMarkup(item,className=''){const base=item.base??item.id,def=ITEMS[base],slot=def.slot,column=base>=40?(base-40)%5:base%5,atlas=base>=40?'expansion-v1':Math.floor((base%10)/5)+'-v2';return `<span class="equipment-icon ${className}" title="${itemDescription(def,item.tier??0)}" style="background-image:url('/assets/equipment-set-${atlas}.png');background-position:${column*25}% ${slot*100/3}%"></span>`;}

// Segment opaque pose silhouettes instead of assuming generated art obeys grid boundaries.
export function splitCharacterPixels({data,width,height},expected=8) {
  const count=width*height,labels=new Int32Array(count),queue=new Int32Array(count),parts=[];
  for(let start=0;start<count;start++){
    if(labels[start]||data[start*4+3]<32)continue;
    const id=parts.length+1;let head=0,tail=1,left=width,right=0,top=height,bottom=0;queue[0]=start;labels[start]=id;
    while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const n of [x?p-1:-1,x<width-1?p+1:-1,y?p-width:-1,y<height-1?p+width:-1])if(n>=0&&!labels[n]&&data[n*4+3]>=32){labels[n]=id;queue[tail++]=n;}
    }
    parts.push({id,size:tail,left,right,top,bottom});
  }
  const bodies=parts.slice().sort((a,b)=>b.size-a.size).slice(0,expected);
  if(bodies.length!==expected)throw Error('Expected '+expected+' separate sprites');
  if(expected===24){bodies.sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom));for(let row=0;row<6;row++)bodies.splice(row*4,4,...bodies.slice(row*4,row*4+4).sort((a,b)=>a.left-b.left));}else bodies.sort((a,b)=>((a.top+a.bottom)/2<height/2?0:1)-((b.top+b.bottom)/2<height/2?0:1)||a.left-b.left);
  const owner=new Int16Array(parts.length+1);owner.fill(-1);
  bodies.forEach((p,i)=>owner[p.id]=i);
  for(const p of parts)if(owner[p.id]<0){const x=(p.left+p.right)/2,y=(p.top+p.bottom)/2;let best=Infinity;
    bodies.forEach((b,i)=>{const dx=Math.max(b.left-x,0,x-b.right),dy=Math.max(b.top-y,0,y-b.bottom);const d=dx*dx+dy*dy;if(d<best){best=d;owner[p.id]=i;}});
  }
  // Extend ownership into translucent outlines and glows without rectangular clipping.
  let head=0,tail=0;const assigned=new Int16Array(count);assigned.fill(-1);
  for(let p=0;p<count;p++)if(labels[p]){assigned[p]=owner[labels[p]];queue[tail++]=p;}
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);for(const n of [x?p-1:-1,x<width-1?p+1:-1,y?p-width:-1,y<height-1?p+width:-1])if(n>=0&&assigned[n]<0&&data[n*4+3]){assigned[n]=assigned[p];queue[tail++]=n;}}
  const anchors=bodies.map(b=>{let sum=0,n=0;for(let y=b.bottom-45;y<=b.bottom;y++)for(let x=b.left;x<=b.right;x++)if(y>=0&&labels[y*width+x]===b.id){sum+=x;n++;}return {x:n?sum/n:(b.left+b.right)/2,y:b.bottom};});
  let radius=0,up=0,down=0;
  for(let p=0;p<count;p++){const i=assigned[p];if(i<0)continue;radius=Math.max(radius,Math.abs(p%width-anchors[i].x));up=Math.max(up,anchors[i].y-Math.floor(p/width));down=Math.max(down,Math.floor(p/width)-anchors[i].y);}
  const fw=Math.ceil(radius*2)+24,fh=Math.ceil(up+down)+24;
  const frames=bodies.map(()=>({width:fw,height:fh,data:new Uint8ClampedArray(fw*fh*4)}));
  for(let p=0;p<count;p++){const i=assigned[p];if(i<0)continue;const x=Math.round(p%width-anchors[i].x+fw/2),y=Math.round(Math.floor(p/width)-anchors[i].y+up+12),dst=(y*fw+x)*4;frames[i].data.set(data.subarray(p*4,p*4+4),dst);}
  frames.forEach((f,i)=>{f.anchorY=(up+12)/fh;const b=bodies[expected===24?Math.floor(i/4)*4:expected-1];f.bodyHeight=b.bottom-b.top+1;});return frames;
}
