export const MAP_ATLAS = '/assets/battle-terrains-v6.png';
export const MAPS = [
  ['공중 성채', '#a7d478', '#33472b'], ['황금 사막', '#edc47c', '#68513b'],
  ['빙정 호수', '#a5e7ff', '#345a74'], ['잿불 화산', '#ffad79', '#493632'],
  ['비전 유적', '#c7acff', '#49405f'], ['해무 해안', '#8bdcda', '#305450'],
  ['황혼의 숲', '#ffd18b', '#60462e'], ['심연 동굴', '#bda1ff', '#343052'],
  ['별빛 성역', '#fff0b4', '#6a6559'], ['종언의 성채', '#ff9b8c', '#4b2929'],
].map(([name, accent, road], index) => ({ name, accent, road, index, first: index * 10 + 1, last: index * 10 + 10 }));
export function mapForRound(round = 1) { return MAPS[Math.max(0, Math.min(9, Math.floor((round - 1) / 10)))]; }


export const CITADEL_MAPS={default:'/assets/map-citadel-default-v1.png',forest:'/assets/map-citadel-forest-v1.png',frost:'/assets/map-citadel-frost-v1.png',ember:'/assets/map-citadel-ember-v1.png',arcane:'/assets/map-citadel-arcane-v1.png',ocean:'/assets/map-citadel-ocean-v1.png',royal:'/assets/map-citadel-royal-v1.png'};
export const customMapKey=index=>({0:'forest',2:'frost',3:'ember',4:'arcane',5:'ocean',8:'royal'}[index]||'default');
// Align the generated road centerlines to the simulation's 10% / 90% perimeter.
export const ROAD_SOURCE_X=[0,.117,.882,1],ROAD_SOURCE_Y=[0,.133,.82,1],ROAD_TARGET=[0,.1,.9,1];
export class MapArt {
 constructor(){this.tiles=new Map();this.images={};for(const [key,src]of Object.entries(CITADEL_MAPS)){const img=new Image();img.src=src;img.addEventListener('load',()=>{this.tiles.clear();if(key!=='default')this.image.dispatchEvent(new Event('load'));});this.images[key]=img;}this.image=this.images.default;this.road=new Image();}
 terrain(key,width,height){const image=this.images[key];if(!image?.complete||!image.naturalWidth)return null;const cacheKey=key+':'+width+':'+height;if(this.tiles.has(cacheKey))return this.tiles.get(cacheKey);const tile=document.createElement('canvas');tile.width=width;tile.height=height;const c=tile.getContext('2d');for(let y=0;y<3;y++)for(let x=0;x<3;x++){const sx=ROAD_SOURCE_X[x]*image.naturalWidth,sy=ROAD_SOURCE_Y[y]*image.naturalHeight,sw=(ROAD_SOURCE_X[x+1]-ROAD_SOURCE_X[x])*image.naturalWidth,sh=(ROAD_SOURCE_Y[y+1]-ROAD_SOURCE_Y[y])*image.naturalHeight;const dx=Math.round(ROAD_TARGET[x]*width),dy=Math.round(ROAD_TARGET[y]*height),dw=Math.round(ROAD_TARGET[x+1]*width)-dx,dh=Math.round(ROAD_TARGET[y+1]*height)-dy;c.drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh);}if(this.tiles.size>=4)this.tiles.delete(this.tiles.keys().next().value);this.tiles.set(cacheKey,tile);return tile;}
 draw(ctx,round,clock,custom=false){const theme=mapForRound(round),w=ctx.canvas.width,h=ctx.canvas.height,key=custom?customMapKey(theme.index):'default';const tile=this.terrain(key,w,h);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#101c29';ctx.fillRect(0,0,w,h);if(tile)ctx.drawImage(tile,0,0);if(!custom){ctx.fillStyle=['#09152900','#ad713212','#3589b91c','#972c251b','#633bb91c','#259a9a14','#ac71311a','#34215825','#cdbf6a0e','#701d2325'][theme.index];ctx.fillRect(0,0,w,h);}ctx.restore();return theme;}
 drawRoad(ctx){const w=ctx.canvas.width,h=ctx.canvas.height;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff2c999';ctx.font=Math.max(10,Math.min(w,h)*.021)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('→',w*.5,h*.1);ctx.fillText('↓',w*.9,h*.5);ctx.fillText('←',w*.5,h*.9);ctx.fillText('↑',w*.1,h*.5);ctx.restore();}
}
