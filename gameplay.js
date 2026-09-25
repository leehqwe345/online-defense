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
  if (request.type === 'pause') {
    if (game.mode !== 'single') return '온라인 전투는 일시정지할 수 없습니다.';
    if (!['playing', 'paused'].includes(game.status)) return '전투 중에만 일시정지할 수 있습니다.';
    game.status = game.status === 'paused' ? 'playing' : 'paused';
    return null;
  }
  if (request.type === 'speed') {
    if (game.mode !== 'single') return '배속은 싱글 모드에서만 사용할 수 있습니다.';
    if (![1, 2, 3].includes(request.value)) return '배속은 1, 2, 3 중 선택하세요.';
    game.speed = request.value;
    return null;
  }
  if (request.type === 'formation') {
    const playerOffset = game.mode === 'coop' ? game.players.indexOf(player) * 8 : 0;
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
  const multiplier = game.mode === 'single' ? game.speed || 1 : 1;
  // Substeps keep fire rate, status durations and spawn checks identical at every speed.
  let remaining = realDelta * multiplier;
  while (remaining > 0.000001 && game.status === 'playing') {
    const delta = Math.min(0.05, remaining);
    tick(game, delta);
    remaining -= delta;
  }
}
