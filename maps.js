export const MAP_ATLAS = '/assets/battle-terrains-v6.png';
export const MAPS = [
  ['이끼숲 경계', '#a7d478', '#33472b'], ['황금 사막', '#edc47c', '#68513b'],
  ['빙정 호수', '#a5e7ff', '#345a74'], ['잿불 화산', '#ffad79', '#493632'],
  ['비전 유적', '#c7acff', '#49405f'], ['해무 해안', '#8bdcda', '#305450'],
  ['황혼의 숲', '#ffd18b', '#60462e'], ['심연 동굴', '#bda1ff', '#343052'],
  ['별빛 성역', '#fff0b4', '#6a6559'], ['종언의 성채', '#ff9b8c', '#4b2929'],
].map(([name, accent, road], index) => ({ name, accent, road, index, first: index * 10 + 1, last: index * 10 + 10 }));
export function mapForRound(round = 1) { return MAPS[Math.max(0, Math.min(9, Math.floor((round - 1) / 10)))]; }

export class MapArt {
  constructor() {
    this.tiles = new Map();this.ruins=new Image();this.ruins.src='/assets/battle-ruins-v1.png';
    this.image = new Image(); this.image.src = MAP_ATLAS;
    this.road = new Image(); this.road.src = '/assets/battle-road-v1.png';
  }
  terrain(index,width,height) {
    if (!this.image.complete || !this.image.naturalWidth) return null;
    const key=index+':'+width+':'+height;
    if(this.tiles.has(key))return this.tiles.get(key);
    const tile=document.createElement('canvas');tile.width=width;tile.height=height;
    const ctx=tile.getContext('2d'),sw=this.image.width/2-6;
    const edges=[0,320,652,988,1330,1842],row=Math.floor(index/2);
    const sy=edges[row]/1842*this.image.height+3,sh=(edges[row+1]-edges[row])/1842*this.image.height-6;
    // Cover in screen pixels: crop excess edges rather than squash the terrain.
    const scale=Math.max(width/sw,height/sh),cw=width/scale,ch=height/scale;
    ctx.drawImage(this.image,index%2*this.image.width/2+3+(sw-cw)/2,sy+(sh-ch)/2,cw,ch,0,0,width,height);
    ctx.fillStyle='#06101328';ctx.fillRect(0,0,width,height);
    this.tiles.set(key,tile);return tile;
  }
  draw(ctx,round,clock) {
    const theme=mapForRound(round),width=ctx.canvas.width,height=ctx.canvas.height;
    if(this.active!==theme.index){this.previous=this.active;this.active=theme.index;this.changed=clock;}
    const tile=this.terrain(theme.index,width,height),old=this.previous===undefined?null:this.terrain(this.previous,width,height);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    if(this.ruins.complete&&this.ruins.naturalWidth){const scale=Math.max(width/this.ruins.width,height/this.ruins.height),sw=width/scale,sh=height/scale;ctx.drawImage(this.ruins,(this.ruins.width-sw)/2,(this.ruins.height-sh)/2,sw,sh,0,0,width,height);ctx.fillStyle=['#09152908','#ad713212','#3589b91c','#972c251b','#633bb91c','#259a9a14','#ac71311a','#34215825','#cdbf6a0e','#701d2325'][theme.index];ctx.fillRect(0,0,width,height);}else if(tile){const blend=Math.min(1,(clock-this.changed)/.8);if(old&&blend<1){ctx.drawImage(old,0,0);ctx.globalAlpha=blend;}ctx.drawImage(tile,0,0);ctx.globalAlpha=1;}
    ctx.restore();return theme;
  }
  drawRoad(ctx,theme) {
    const w=ctx.canvas.width,h=ctx.canvas.height,roadWidth=Math.min(w,h)*.075;
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    const path=new Path2D();path.roundRect(w*.1,h*.1,w*.8,h*.8,10);
    ctx.lineJoin='round';ctx.shadowColor='#000a';ctx.shadowBlur=7;ctx.lineWidth=roadWidth+8;ctx.strokeStyle='#171b18';ctx.stroke(path);ctx.shadowBlur=0;
    ctx.lineWidth=roadWidth+4;ctx.strokeStyle='#8b8970';ctx.stroke(path);
    let texture=null;
    if(this.road.complete&&this.road.naturalWidth){texture=ctx.createPattern(this.road,'repeat');texture.setTransform(new DOMMatrix().scale(.16));}
    ctx.lineWidth=roadWidth;ctx.strokeStyle=texture||theme.road;ctx.stroke(path);
    ctx.strokeStyle='#939a9825';ctx.stroke(path);
    ctx.fillStyle='#fff2c9aa';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('→',w*.5,h*.1);ctx.fillText('↓',w*.9,h*.5);ctx.fillText('←',w*.5,h*.9);ctx.fillText('↑',w*.1,h*.5);
    ctx.restore();
  }
}
