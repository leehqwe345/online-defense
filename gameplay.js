// Gameplay controls shared by the server and UI. Coordinates use an 800-unit viewport.
export const TARGETS = { smart: '유효 피해 우선', boss: '보스 우선', weak: '낮은 체력 우선', strong: '높은 체력 우선' };

export function mergePartner(list, first) {
  if (!first || first.tier >= 6) return null;
  return list.find(other => other.id !== first.id && other.base === first.base && other.tier === first.tier) || null;
}

export function formationPosition(index) {
  // Inner edge positions guarantee even melee champions can reach the outer path.
  const lane = Math.floor(index / 32);
  const slot = index % 32;
  const side = Math.floor(slot / 8);
  const along = 166 + (slot % 8) * 65;
  const edge = 145 + lane * 17;
  return [
    { x: along, y: edge },
    { x: 800 - edge, y: along },
    { x: 800 - along, y: 800 - edge },
    { x: edge, y: 800 - along },
  ][side];
}

export function controlAction(game, player, request) {
  if (request.type === 'autoApproach' && request.enabled !== false) return '자동 접근은 삭제되었습니다. 우클릭으로 이동하세요.';
  if (request.type === 'hold' || request.type === 'autoApproach') {
    const ids=Array.isArray(request.ids)?request.ids:[request.id];
    const champions=player.champions.filter(c=>ids.includes(c.id));
    if (!champions.length) return '챔피언을 선택하세요.';
    for(const champion of champions){champion.autoApproach=false;delete champion.approach;delete champion.destination;champion.combatState='waiting';}
    return null;
  }
  if (request.type === 'pause') {
    if (game.mode !== 'single') return '온라인 전투는 일시정지할 수 없습니다.';
    if (!['playing', 'paused'].includes(game.status)) return '전투 중에만 일시정지할 수 있습니다.';
    game.status = game.status === 'paused' ? 'playing' : 'paused';
    return null;
  }
  if (request.type === 'speed') return '모든 모드는 2배속으로 고정되어 있습니다.';
  if (request.type === 'formation') {
    const playerOffset = 0;
    player.champions.forEach((champion, index) => {
      const target = formationPosition((index + playerOffset) % 80);
      if (game.status === 'ready') { Object.assign(champion, target); delete champion.destination; }
      else champion.destination = target;
    });
    return null;
  }
  if (request.type === 'target') {
    const champion = player.champions.find(c => c.id === request.id);
    if (!champion || !Object.hasOwn(TARGETS, request.value)) return '공격 대상을 설정할 수 없습니다.';
    champion.target = request.value;
    return null;
  }
  return undefined;
}

export function sortTargets(monsters, priority, effectiveness) {
  // Never waste all shots on an immune enemy while a vulnerable target is in range.
  const viable = monsters.filter(monster => effectiveness(monster) > 0);
  return viable.sort((a, b) => {
    if (priority === 'boss' && a.boss !== b.boss) return Number(b.boss) - Number(a.boss);
    if (priority === 'weak') return a.hp - b.hp;
    if (priority === 'strong') return b.hp - a.hp;
    return effectiveness(b) - effectiveness(a) || a.hp - b.hp;
  });
}

export function stepGame(game, realDelta, tick) {
  if (game.status !== 'playing') return;
  const multiplier = 2;
  // Substeps keep fire rate, status durations and spawn checks identical at every speed.
  let remaining = realDelta * multiplier;
  while (remaining > 0.000001 && game.status === 'playing') {
    const delta = Math.min(0.05, remaining);
    tick(game, delta);
    remaining -= delta;
  }
}

// Collision applies to all allies sharing a board, but never to separate versus maps.
export const CHAMPION_SPACING = 44;
function peers(game,c){const own=game.players.find(p=>p.champions.includes(c));return game.players.flatMap(p=>p.champions.filter(v=>v!==c&&(game.mode==='coop'?(c.world?!!v.world:p===own&&!v.world):p===own&&!!v.world===!!c.world)));}
function free(game,c,x,y){return x>=140&&x<=660&&y>=140&&y<=660&&peers(game,c).every(v=>Math.hypot(v.x-x,v.y-y)>=CHAMPION_SPACING-.001);}
export function placeChampion(game,c,target){
 const x=Math.max(140,Math.min(660,target.x)),y=Math.max(140,Math.min(660,target.y));
 if(free(game,c,x,y)){c.x=x;c.y=y;return;}
 for(let radius=8;radius<=750;radius+=8)for(let n=0;n<64;n++){const a=n*Math.PI/32,nx=x+Math.cos(a)*radius,ny=y+Math.sin(a)*radius;if(free(game,c,nx,ny)){c.x=nx;c.y=ny;return;}}
}
export function separateChampions(game){for(const p of game.players)for(const c of p.champions)if(!free(game,c,c.x,c.y))placeChampion(game,c,c);}
export function moveChampion(game,c,target,step){
 const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy);if(d<.001)return false;
 const distance=Math.min(step,d,CHAMPION_SPACING/3),angle=Math.atan2(dy,dx);
 for(const offset of [0,.5,-.5,1,-1]){const x=c.x+Math.cos(angle+offset)*distance,y=c.y+Math.sin(angle+offset)*distance;if(free(game,c,x,y)){c.x=x;c.y=y;return true;}}
 return false;
}
