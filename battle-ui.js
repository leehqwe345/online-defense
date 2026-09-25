import { portraitMarkup } from './art.js';
import { CHAMPIONS, ITEMS, TIERS, COLORS, SLOTS, IMMUNITIES, chances, stats, monsterProfile } from './engine.js';
import { TARGETS, mergePartner } from './gameplay.js';

const glyphs = ['⌖', '➶', '⚔', '❄', '♨', '◆', '≋', '☣', '✹', '✦'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = selector => document.querySelector(selector);
const text = (selector, value) => { const el = $(selector); if (el && el.textContent !== String(value)) el.textContent = value; };
const html = (selector, value) => {
  const el = $(selector);
  if (el && el._lastHTML !== value) { el.innerHTML = value; el._lastHTML = value; }
};
let lastDetailKey = '', selectedTarget = null;
function itemEffectText(item) {
  const p = 1.6 ** item.tier, effect = ITEMS[item.base].effect;
  return [
    `공격력 +${(10*p).toFixed(1)}`,
    `공격속도 +${(12*p).toFixed(1)}%`,
    `사거리 +${(20*p).toFixed(0)}`,
    `치명타 확률 +${(6*p).toFixed(1)}%p`,
    `치명타 배율 +${(0.2*p).toFixed(2)}배`,
    `물리 방어관통 +${(8*p).toFixed(1)}%p`,
    `마법 방어관통 +${(8*p).toFixed(1)}%p`,
    `공격대상 +${Math.max(1,Math.floor(p/2))}명`,
    `둔화 +${(12*p).toFixed(1)}%p`,
    `방어 저항 감소 +${(12*p).toFixed(1)}%p`
  ][effect];
}

export function installBattleTools(game) {
  lastDetailKey = '';
  selectedTarget = null;
  $('#board-tabs').insertAdjacentHTML('afterend', `
    <div class="combat-toolbar">
      <div class="combat-clock"><span class="eyebrow">NEXT WAVE</span><strong id="wave-clock">준비 중</strong></div>
      <div class="wave-progress"><div id="wave-fill"></div></div>
      <span id="round-rule" class="muted"></span>
      ${game.mode === 'single' ? '<button id="pause-game" class="mini-btn">Ⅱ 일시정지</button><span class="muted">기본 2× 속도</span>' : ''}
      <button id="formation" class="mini-btn">⌗ 자동 배치</button>
    </div>
    <div id="connection-warning" class="connection-warning" hidden>연결을 복구하고 있습니다. 서버의 전투는 계속 진행됩니다.</div>
  `);
  $('.arena-wrap').insertAdjacentHTML('beforeend', '<div class="arena-state" id="arena-state" hidden></div><div class="wave-announcement" id="wave-announcement" role="status"></div>');
  $('#heroes').insertAdjacentHTML('beforebegin', '<div class="inventory-tools"><input id="hero-search" placeholder="보유 챔피언 검색" aria-label="보유 챔피언 검색"><label><input type="checkbox" id="hero-merge-only"> 합성 가능만</label></div>');
  $('#items').insertAdjacentHTML('beforebegin', `<div class="inventory-tools"><select id="item-slot-filter" aria-label="가방 부위 필터"><option value="all">모든 부위</option>${SLOTS.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select><label><input type="checkbox" id="item-merge-only"> 합성 가능만</label></div>`);
  $('#briefing').insertAdjacentHTML('afterend', '<div id="wave-preview" class="wave-preview"></div><div id="inspect-enemy" class="enemy-inspector"></div>');
}

export function updateCombat(game, room, user, selected, selectedItem, boardIndex, connected, abilities, effects, selectedEnemy) {
  const p = game.players.find(player => player.id === user.id);
  const board = game.boards[boardIndex];
  const editable = p.alive && game.status !== 'ended' && connected;
  html('#round', `ROUND ${String(game.round).padStart(2, '0')} <small>/ 100</small>`);
  html('#wave-status', `<span class="${board.monsters.length >= 75 ? 'danger' : ''}">적 ${board.monsters.length} / 100</span> · 대기 ${board.spawn.length}`);
  html('#gold', `${p.gold}<small>GOLD</small>`);
  html('#scores', game.players.map(q => `<div class="score ${q.id === user.id ? 'me' : ''}"><span>${escape(q.name)} ${q.id === user.id ? '· 나' : ''} ${!q.alive ? '[탈락]' : ''}</span><b>${q.kills}</b></div>`).join(''));
  const start = $('#start');
  start.hidden = game.status !== 'ready' || room.host !== user.id;
  start.disabled = !connected || !p.champions.length;
  start.title = !p.champions.length ? '챔피언을 먼저 소환하세요.' : '';
  text('#briefing', game.message);
  html('#result', game.status === 'ended' ? `<div class="result"><strong>${escape(game.message)}</strong><p class="muted" style="margin:8px 0 0">${game.round}라운드 · ${p.kills}마리 처치 · ${Math.floor(game.time / 60)}분 ${Math.floor(game.time % 60)}초</p><button class="mini-btn" id="return-home" style="margin-top:12px">대기실로 돌아가기 →</button></div>` : '');
  $('#connection-warning').hidden = connected;
  const remaining = Math.max(0, (game.waveInterval || 60) - (game.time - (game.roundStartedAt || 0)));
  const countdown = game.mode !== 'versus' && game.round > 0 && game.round < 100;
  text('#wave-clock', game.status === 'ready' ? '준비 중' : game.round === 100 ? 'LAST WAVE' : game.mode === 'versus' ? '상대와 경쟁' : `${Math.ceil(remaining)}s`);
  $('#wave-clock').classList.toggle('danger', countdown && remaining <= 10);
  $('#wave-fill').style.width = `${countdown ? remaining / (game.waveInterval || 60) * 100 : 100}%`;
  text('#round-rule', game.mode === 'versus' ? '먼저 처치하면 모두에게 다음 웨이브' : game.round === 100 ? '마지막 적까지 처치하세요' : '전멸 즉시 또는 60초마다 다음 웨이브');
  if ($('#pause-game')) {
    text('#pause-game', game.status === 'paused' ? '▶ 전투 재개' : 'Ⅱ 일시정지');
    $('#pause-game').disabled = !connected || !['playing', 'paused'].includes(game.status);
  }
  $('#formation').disabled = !editable || !p.champions.length;
  const overlay = $('#arena-state');
  overlay.hidden = !['ready', 'paused'].includes(game.status);
  html('#arena-state', game.status === 'paused' ? '<b>Ⅱ PAUSED</b><span>배치와 장비를 정비하고 전투를 재개하세요.</span>' : '<b>BUILD YOUR DEFENSE</b><span>챔피언 소환 → 자동 배치 → 전투 시작</span>');
  html('#board-tabs', game.mode === 'versus' ? game.players.map((q, i) => `<button data-board="${i}" class="${boardIndex === i ? 'selected' : ''}">${escape(q.name)}의 맵 ${!q.alive ? '· 탈락' : ''}</button>`).join('') : '');
  text('#hero-count', `${p.champions.length} / 80`);
  const search = $('#hero-search').value;
  const mergeOnly = $('#hero-merge-only').checked;
  const heroes = p.champions.filter(c => CHAMPIONS[c.base].name.includes(search) && (!mergeOnly || mergePartner(p.champions, c)));
  html('#heroes', heroes.map(c => `<button data-select="${c.id}" class="${selected === c.id ? 'selected' : ''}" style="--tier:${COLORS[c.tier]}">${portraitMarkup(CHAMPIONS[c.base].type, "roster-portrait", Math.floor(c.base/10))}<span class="roster-name">${CHAMPIONS[c.base].name}</span><br><small style="color:${COLORS[c.tier]}">${TIERS[c.tier]} ${mergePartner(p.champions, c) ? '· 합성 가능 ↑' : ''}</small></button>`).join('') || `<span class="muted">${p.champions.length ? '조건에 맞는 챔피언이 없습니다.' : '챔피언을 소환하세요. 시작 골드로 2번 소환할 수 있습니다.'}</span>`);
  const slot = $('#item-slot-filter').value;
  const itemMergeOnly = $('#item-merge-only').checked;
  const items = p.items.filter(i => (slot === 'all' || ITEMS[i.base].slot === Number(slot)) && (!itemMergeOnly || mergePartner(p.items, i)));
  html('#items', items.map(i => `<button draggable="true" data-item="${i.id}" class="${selectedItem === i.id ? 'selected' : ''}" style="--tier:${COLORS[i.tier]}">${ITEMS[i.base].name}<br><small style="color:${COLORS[i.tier]}">${TIERS[i.tier]} ${mergePartner(p.items, i) ? '· 합성 가능 ↑' : ''}</small><br><small class="item-option">${itemEffectText(i)}</small></button>`).join('') || `<span class="muted">${p.items.length ? '조건에 맞는 장비가 없습니다.' : '장비를 뽑아 챔피언의 능력을 강화하세요.'}</span>`);
  html('#upgrades', ['hero', 'item'].map(kind => {
    const level = p[kind === 'hero' ? 'heroLevel' : 'itemLevel'];
    return `<div class="upgrade"><span>${kind === 'hero' ? '챔피언' : '장비'} 상점 Lv.${level}</span><button data-upgrade="${kind}" ${!editable || level >= 10 || p.gold < level * 40 ? 'disabled' : ''}>${level >= 10 ? 'MAX' : `${level * 40} G ↑`}</button></div>`;
  }).join(''));
  html('#probabilities', ['hero', 'item'].map(kind => `${kind === 'hero' ? '챔피언' : '장비'} 확률<br>${chances(p[kind === 'hero' ? 'heroLevel' : 'itemLevel']).map((n, i) => `<span style="color:${COLORS[i]}" title="${TIERS[i]}">${Number(n.toFixed(3))}%</span>`).join(' / ')}`).join('<br>'));
  document.querySelectorAll('[data-draw]').forEach(button => button.disabled = p.gold < 30 || !editable);
  const next = Math.min(100, game.round + 1);
  const profile = monsterProfile(game, next);
  html('#wave-preview', `<span class="eyebrow">${game.round === 100 ? 'FINAL WAVE' : 'NEXT INTEL'}</span><p>${next}라운드 · 일반 HP ${Math.ceil(profile.hp).toLocaleString()}${next % 10 === 0 ? '<br>보스 1마리 포함' : ''}</p><span class="defense-chip">${game.random ? '무작위 방어속성' : IMMUNITIES[(next - 1) % 10]}</span>${game.hard ? `<span class="defense-chip">추가 방어 최대 ${game.hard}개</span>` : ''}`);
  const enemy = board.monsters.find(m => m.id === selectedEnemy);
  html('#inspect-enemy', enemy ? `<h3>${enemy.boss ? '보스' : '몬스터'} #${enemy.id}</h3><p class="muted">HP ${Math.max(0, Math.ceil(enemy.hp)).toLocaleString()} / ${Math.ceil(enemy.maxHp).toLocaleString()}</p>${enemy.defenses.map(d => `<span class="defense-chip">${d}</span>`).join('')}` : '<p class="muted">길 위의 몬스터를 클릭하면 방어속성을 확인할 수 있습니다.</p>');
  renderDetail(game, p, selected, selectedItem, editable, abilities, effects);
}

function renderDetail(game, player, selected, selectedItem, editable, abilities, effects) {
  const champion = game.players.flatMap(p => p.champions).find(c => c.id === selected);
  const item = player.items.find(i => i.id === selectedItem);
  const key = JSON.stringify({
    selected, selectedItem, editable,
    champion: champion && { base: champion.base, tier: champion.tier, equipment: champion.equipment, growth: champion.growth, target: champion.target },
    item,
    roster: player.champions.map(c => [c.id, c.base, c.tier]),
    bag: player.items.map(i => [i.id, i.base, i.tier]),
  });
  if (key === lastDetailKey) return;
  if (document.activeElement?.tagName === 'SELECT' && $('#detail').contains(document.activeElement)) return;
  const previousTarget = $('#equip-target')?.value;
  if (previousTarget) selectedTarget = previousTarget;
  lastDetailKey = key;
  if (item) {
    const partner = mergePartner(player.items, item);
    html('#detail', `<h3 style="color:${COLORS[item.tier]}">${ITEMS[item.base].name} · ${TIERS[item.tier]}</h3><p class="muted">${effects[ITEMS[item.base].effect]}<br><strong class="item-option-detail">${itemEffectText(item)}</strong><br>챔피언 카드로 드래그하거나 아래에서 장착 대상을 선택하세요.</p><select id="equip-target" aria-label="장착 대상">${player.champions.map(c => `<option value="${c.id}">${CHAMPIONS[c.base].name} (${TIERS[c.tier]})</option>`).join('')}</select><div class="draw-row"><button id="equip" ${!editable || !player.champions.length ? 'disabled' : ''}>장착</button><button data-merge="item" data-id="${item.id}" ${!editable || !partner ? 'disabled' : ''}>2개 합성 ↑</button></div><p class="muted merge-hint">${partner ? `${TIERS[item.tier + 1]} 등급으로 확정 합성` : item.tier === 6 ? '최고 등급입니다.' : '동일 이름·등급의 장비가 1개 더 필요합니다.'}</p>`);
    if (player.champions.some(c => String(c.id) === selectedTarget)) $('#equip-target').value = selectedTarget;
    return;
  }
  if (!champion) {
    html('#detail', '<h3>챔피언 정보</h3><div class="selection-hint">♜<br><br>챔피언을 선택해<br>능력치와 장비를 확인하세요.</div>');
    return;
  }
  const c = champion, own = player.champions.includes(c), s = stats(c), partner = mergePartner(player.champions, c);
  const pairs = [['공격력', s.attack.toFixed(1)], ['공격속도', s.speed.toFixed(2)], ['사거리', s.range.toFixed(0)], ['공격대상', s.targets], ['치명 확률', (s.crit * 100).toFixed(0) + '%'], ['치명 배율', '×' + s.critMult.toFixed(1)], ['방어관통', (s.armorPen * 100).toFixed(0) + '%'], ['마법관통', (s.magicPen * 100).toFixed(0) + '%']];
  html('#detail', `<div class="detail-character" style="--tier:${COLORS[c.tier]}">${portraitMarkup(CHAMPIONS[c.base].type, "detail-portrait", Math.floor(c.base/10))}<span>${TIERS[c.tier]}</span></div><button class="preview-attack" data-preview="${c.base}" data-preview-tier="${c.tier}" style="margin:0 0 14px">공격 모션 보기 ↗</button><h3 style="color:${COLORS[c.tier]}">${glyphs[CHAMPIONS[c.base].type]} ${CHAMPIONS[c.base].name}</h3><p class="muted">${TIERS[c.tier]} · ${abilities[CHAMPIONS[c.base].type]}</p><div class="stats">${pairs.map(([k, v]) => `<div>${k} <b>${v}</b></div>`).join('')}</div><label class="target-label" for="target-priority">공격 우선순위</label><select id="target-priority" ${!own || !editable ? 'disabled' : ''}>${Object.entries(TARGETS).map(([value, label]) => `<option value="${value}" ${(c.target || 'smart') === value ? 'selected' : ''}>${label}</option>`).join('')}</select><div class="equipment">${SLOTS.map((slot, i) => `<button ${own && c.equipment[i] ? `data-unequip="${i}"` : ''} ${!own || !editable ? 'disabled' : ''}>${slot} · ${c.equipment[i] ? `${ITEMS[c.equipment[i].base].name} (${TIERS[c.equipment[i].tier]}) ${own ? '×' : ''}` : '미장착'}</button>`).join('')}</div>${own ? `<button class="mini-btn" style="width:100%;margin-top:10px" data-merge="hero" data-id="${c.id}" ${!editable || !partner ? 'disabled' : ''}>동일 챔피언 2개 합성 ↑</button><p class="muted merge-hint">${partner ? `${TIERS[c.tier + 1]} 등급으로 확정 합성` : c.tier === 6 ? '최고 등급입니다.' : '동일 이름·등급의 챔피언이 1개 더 필요합니다.'}</p>` : '<p class="muted">다른 수호자의 챔피언</p>'}`);
}

export function announceWave(round, boss) {
  const el = $('#wave-announcement');
  if (!el) return;
  el.innerHTML = `<small>${boss ? 'BOSS INCOMING' : 'NEW WAVE'}</small><strong>ROUND ${String(round).padStart(2, '0')}</strong>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
