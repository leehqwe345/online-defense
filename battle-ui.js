import {playerMapOrder} from './encounters.js';
import {sortMergeableChampions} from './roster-sort.js';
import {QUEST_METRICS} from './quests.js';
import {bossBoardIndex} from './encounters.js';
import {drawCost,upgradeCost} from './talents.js';
import {skillMarkup} from './champion-skills.js';
import {bossNoticeMarkup} from './boss-skills.js';
import {MONSTERS,TRAITS,familyForRound,monsterDefinition,traitDefinition} from './monsters.js';
import { portraitMarkup, monsterPortraitMarkup, monsterName, equipmentMarkup } from './art.js';
import { monsterCount, ELEMENTS, CHAMPIONS, MAX_CHAMPIONS, ITEMS, TIERS, COLORS, SLOTS, IMMUNITIES, chances, stats, itemDescription, monsterProfile } from './engine.js';
import { mapForRound } from './maps.js';
import { TARGETS, mergePartner } from './gameplay.js';

const glyphs = ['⌖', '➶', '⚔', '❄', '♨', '◆', '≋', '☣', '✹', '✦', 'ϟ', '⚔', '♜', '≋', '⌖', '◆', '⚔', '➶', '✦', '⌛'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = selector => document.querySelector(selector);
const text = (selector, value) => { const el = $(selector); if (el && el.textContent !== String(value)) el.textContent = value; };
const html = (selector, value) => {
  const el = $(selector);
  if (el && el._lastHTML !== value) { el.innerHTML = value; el._lastHTML = value; }
};
let lastDetailKey = '', selectedTarget = null;
function itemEffectText(item) { return itemDescription(ITEMS[item.base], item.tier); }

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
  $('.arena-wrap').insertAdjacentHTML('beforeend', '<details class="dps-panel" open><summary>내 챔피언 DPS <small>최근 5초 · 나만 보기</small></summary><div id="champion-dps"></div></details>');
  $('.arena-wrap').insertAdjacentHTML('beforeend', '<div class="arena-state" id="arena-state" hidden></div><div class="wave-announcement" id="wave-announcement" role="status"></div>');
  $('#heroes').insertAdjacentHTML('beforebegin', '<div class="inventory-tools"><input id="hero-search" placeholder="보유 챔피언 검색" aria-label="보유 챔피언 검색"><label><input type="checkbox" id="hero-merge-only"> 합성 가능만</label></div>');
  $('#items').insertAdjacentHTML('beforebegin', `<div class="inventory-tools"><select id="item-slot-filter" aria-label="가방 부위 필터"><option value="all">모든 부위</option>${SLOTS.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select><label><input type="checkbox" id="item-merge-only"> 합성 가능만</label></div>`);
  $('#briefing').insertAdjacentHTML('afterend', '<div id="map-stage" class="muted"></div><div id="wave-preview" class="wave-preview"></div><div id="inspect-enemy" class="enemy-inspector"></div>');
  arrangeBattleScreen(game);
}

function arrangeBattleScreen(game) {
  document.body.classList.add('battle-mode');
  const nodes = Object.fromEntries(['result','round','wave-status','wave-clock','wave-fill','round-rule','connection-warning','board-tabs','arena','heroes','items','detail','scores','gold','upgrades','probabilities','start','leave','formation','pause-game','briefing'].map(id => [id, document.getElementById(id)]));
  const arena = $('.arena-wrap'), heroPanel = nodes.heroes.parentElement, itemPanel = nodes.items.parentElement, scorePanel = nodes.scores.parentElement, intel = nodes.briefing.parentElement;
  const draws = [...document.querySelectorAll('[data-draw]')];
  const shell = document.createElement('div'); shell.className = 'battle-screen';
  shell.innerHTML = `<div class="battle-hud"><div class="hud-round"><span class="hud-emblem">LOOP</span><div><small>${game.random?'랜덤':'클래식'} · ${game.mode==='single'?'싱글':game.mode==='coop'?'협동':'대전'}${game.hard?' · 하드 '+game.hard:''}</small><div id="round-slot"></div></div></div><div class="hud-wave"><div class="hud-countdown"><small>다음 웨이브</small></div><div class="hud-wave-track"><div class="wave-progress"></div><div id="status-slot"></div></div></div><div class="hud-speeds"><span class="fixed-speed" title="모든 모드 공통 고정 배속">×2 <small>고정</small></span></div><div id="gold-slot"></div><details class="battle-menu"><summary>☰ 메뉴</summary><div id="battle-menu-content"></div></details></div><div id="notice-slot"></div><div class="battle-stage"><div class="battle-field"><div id="arena-slot"></div><div class="battle-actions"></div><div class="battle-shop panel" id="battle-shop" hidden><h3>소환 상점 강화 <button class="mini-btn" data-shop-toggle="true">닫기 ×</button></h3></div></div><aside class="battle-inspector"></aside></div><div class="battle-storage"></div>`;
  shell.querySelector('#round-slot').append(nodes.round);
  shell.querySelector('.hud-countdown').append(nodes['wave-clock']);
  shell.querySelector('.wave-progress').append(nodes['wave-fill']);
  shell.querySelector('#status-slot').append(nodes['wave-status']);
  shell.querySelector('#gold-slot').append(nodes.gold);
  shell.querySelector('#battle-menu-content').append(nodes['round-rule'], nodes.leave);
  shell.querySelector('#notice-slot').append(nodes.result,nodes['connection-warning'],nodes['board-tabs']);
  shell.querySelector('#arena-slot').append(arena); nodes.arena.height = 430;
  const actions = shell.querySelector('.battle-actions');
  draws[0].className = 'action-summon'; draws[1].className = 'action-item';
  draws[0].innerHTML = '<span class="action-icon">♜</span><span>챔피언 소환<small>30 G</small></span>';
  draws[1].innerHTML = '<span class="action-icon">◇</span><span>장비 소환<small>30 G</small></span>';
  actions.append(...draws);
  const shop = document.createElement('button'); shop.dataset.shopToggle = 'true'; shop.className='action-shop'; shop.innerHTML='<span class="action-icon" aria-hidden="true">◉</span><span>상점 강화</span>'; nodes.formation.innerHTML='<span class="action-icon" aria-hidden="true">♜</span><span>자동 배치</span>';nodes.start.innerHTML='<span class="action-icon" aria-hidden="true">⚔</span><span>전투 시작 →</span>';actions.append(shop,nodes.formation,nodes.start);
  if (nodes['pause-game']) shell.querySelector('#battle-menu-content').append(nodes['pause-game']);
  shell.querySelector('#battle-shop').append(nodes.upgrades,nodes.probabilities);
  const dps=arena.querySelector('.dps-panel');dps.classList.add('panel');dps.querySelector('summary').innerHTML='전투 현황 <small>내 챔피언 · 최근 5초 DPS</small>';shell.querySelector('.battle-inspector').append(nodes.detail,scorePanel,dps,intel);scorePanel.classList.add('guardian-panel');
  intel.classList.add('battle-intel'); intel.querySelector('h3').textContent='다음 정보';
  intel.querySelectorAll('.preview-attack').forEach(el=>el.remove());
  const extra = document.createElement('details');extra.className='enemy-extra';extra.innerHTML='<summary>선택한 몬스터 정보</summary>';extra.append(intel.querySelector('#inspect-enemy'));intel.append(extra);
  const intelDetails = document.createElement('details');
  intelDetails.className = intel.className;
  intelDetails.id = 'battle-intel';
  intelDetails.open = false;
  const intelSummary = document.createElement('summary');
  intelSummary.innerHTML = '<h3>다음 정보</h3><span class="intel-toggle" aria-hidden="true"></span>';
  intel.querySelector('h3').remove();
  const intelContent = document.createElement('div');
  intelContent.className = 'intel-content';
  intelContent.append(...intel.childNodes);
  intelDetails.append(intelSummary, intelContent);
  intel.replaceWith(intelDetails);
  heroPanel.classList.add('hero-storage'); itemPanel.classList.add('item-storage');
  heroPanel.removeAttribute('style');itemPanel.removeAttribute('style');
  itemPanel.querySelector('h3').innerHTML='보유 장비 <span id="item-count"></span>';
  shell.querySelector('.battle-storage').append(heroPanel,itemPanel);
  const footer=document.createElement('footer');footer.className='battle-footer';footer.innerHTML='<span>LOOP <small>끝은 또 다른 시작이 된다.</small></span><small>SAME PATH. A STRONGER YOU.</small>';shell.append(footer);$('#content').replaceChildren(shell);
}

export function updateCombat(game, room, user, selected, selectedItem, boardIndex, connected, abilities, effects, selectedEnemy) {
  const p = game.players.find(player => player.id === user.id);
  const board = game.boards[boardIndex];const enemyCount=game.mode==='coop'?game.boards.reduce((sum,b)=>sum+b.monsters.length,0):monsterCount(game,game.boards[game.players.findIndex(q=>q.id===user.id)])+monsterCount(game,game.boards[bossBoardIndex(game,game.players.findIndex(q=>q.id===user.id))]);
  const combatHeroes=p.champions.filter(c=>board.world?(c.world||c.bossDamage>0):!c.world),metric=c=>board.world?(c.bossDamage||0):(c.dps||0);
  text('.dps-panel summary',board.world?'보스 전투 현황 · 누적 피해':'전투 현황 · 최근 5초 DPS');
  const peakDps=Math.max(1,...combatHeroes.map(metric));
  html('#champion-dps', [...combatHeroes].sort((a,b)=>metric(b)-metric(a)).map(c=>`<div class="dps-row" style="--dps-width:${Math.max(0,metric(c)/peakDps*100)}%">${portraitMarkup(CHAMPIONS[c.base].type,'dps-portrait',0)}<span style="color:${COLORS[c.tier]}">${CHAMPIONS[c.base].name} <small>#${c.id}</small></span><b>${metric(c).toFixed(board.world?0:1)}</b>${Object.keys(c.supportBuffs||{}).length?'<small class="buff-recipient">✦ 축복 중</small>':''}</div>`).join('')||'<p>소환한 챔피언이 없습니다.</p>');
  const editable = p.alive && game.status !== 'ended' && connected;
  html('#round', `ROUND ${String(game.round).padStart(2, '0')} <small>/ 100</small>`);
  html('#wave-status', `<span class="${enemyCount >= 75 ? 'danger' : ''}">적 ${enemyCount} / 100${game.mode==='coop'?' · 공동 한도':''}</span> · 대기 ${board.spawn.length}`);
  html('#gold', `${p.gold}<small>GOLD</small>`);
  html('#scores', game.players.map(q => `<div class="score ${q.id === user.id ? 'me' : ''}"><span>${escape(q.name)} ${q.id === user.id ? '· 나' : ''} ${!q.alive ? '[탈락]' : ''}</span><b>${q.kills}</b>${game.mode==='coop'&&q.id!==user.id?`<button data-donate="${q.id}" ${p.gold<10?'disabled':''}>10 G 지원</button>`:''}</div>`).join(''));
  const start = $('#start');
  start.hidden = game.status !== 'ready' || room.host !== user.id;
  start.disabled = !connected || !p.champions.length;
  start.title = !p.champions.length ? '챔피언을 먼저 소환하세요.' : '';
  text('#briefing', game.message);
  let bossNotice=$('#boss-skill-notice');if(!bossNotice){bossNotice=document.createElement('div');bossNotice.id='boss-skill-notice';bossNotice.className='boss-skill-notices';$('#notice-slot').append(bossNotice);}const bossMarkup=bossNoticeMarkup(board,game.time);bossNotice.hidden=!bossMarkup;html('#boss-skill-notice',bossMarkup);
  html('#result', game.status === 'ended' ? `<div class="result"><strong>${escape(game.message)}</strong><p class="muted" style="margin:8px 0 0">${game.round}라운드 · ${p.kills}마리 처치 · ${Math.floor(game.time / 60)}분 ${Math.floor(game.time % 60)}초</p><button class="mini-btn" id="return-home" style="margin-top:12px">대기실로 돌아가기 →</button></div>` : '');
  $('#connection-warning').hidden = connected;
  const remaining = Math.max(0, (game.waveInterval || 60) - (game.time - (game.roundStartedAt || 0)));
  const countdown = game.mode !== 'versus' && game.round > 0 && game.round < 100;
  text('#wave-clock', game.status === 'ready' ? '준비 중' : game.round === 100 ? 'LAST WAVE' : game.mode === 'versus' ? '상대와 경쟁' : `${Math.ceil(remaining)}s`);
  $('#wave-clock').classList.toggle('danger', countdown && remaining <= 10);
  $('#wave-fill').style.width = `${countdown ? remaining / (game.waveInterval || 60) * 100 : 100}%`;
  text('#round-rule', game.mode==='coop'?'개인 전장 · 공동 한도 100 · 다음 월드보스 출현 전 처치':game.mode === 'versus' ? '먼저 처치하면 모두에게 다음 웨이브' : game.round === 100 ? '마지막 적까지 처치하세요' : '전멸 즉시 또는 60초마다 다음 웨이브');
  if ($('#pause-game')) {
    text('#pause-game', game.status === 'paused' ? '▶ 전투 재개' : 'Ⅱ 일시정지');
    $('#pause-game').disabled = game.talentPause || !connected || !['playing', 'paused'].includes(game.status);
  }
  $('#formation').disabled = !editable || !p.champions.length;
  const overlay = $('#arena-state');
  overlay.hidden = !['ready', 'paused'].includes(game.status);
  html('#arena-state', game.status === 'paused' ? (game.talentPause?'<b>특성을 선택하세요</b><span>위쪽 카드 3장 중 하나를 고르면 전투가 재개됩니다.</span>':'<b>Ⅱ PAUSED</b><span>배치와 장비를 정비하고 전투를 재개하세요.</span>') : '<b>BUILD YOUR DEFENSE</b><span>챔피언 소환 → 자동 배치 → 전투 시작</span>');
  const ownIndex=Math.max(0,game.players.findIndex(q=>q.id===user.id)),bossIndex=bossBoardIndex(game,ownIndex);
  html('#board-tabs',playerMapOrder(game,p.id).map((i,n)=>{const q=game.players[i];return `<button data-board="${i}" class="${boardIndex===i?'selected':''}">[${n+1}] ${q.id===p.id?'내 맵':escape(q.name)+'의 맵'} (${monsterCount(game,game.boards[i])}) ${!q.alive?'· 탈락':''}</button>`;}).join('')+`<button data-board="${bossIndex}" class="${boardIndex===bossIndex?'selected':''}">${game.mode==='coop'?'공동 월드보스':'내 보스방'} · ${game.boards[bossIndex]?.monsters.length?'전투 중':'대기'}</button>`);
  updateQuestPanel(game,p);

  text('#hero-count', `${p.champions.length} / ${MAX_CHAMPIONS}`);
  text('#item-count', `${p.items.length} / 80`);
  const search = $('#hero-search').value;
  const mergeOnly = $('#hero-merge-only').checked;
  const heroes = sortMergeableChampions(p.champions).sort((a,b)=>b.tier-a.tier||((window.rosterOrder||[]).includes(a.id)||(window.rosterOrder||[]).includes(b.id)?((window.rosterOrder||[]).indexOf(a.id)<0?999:(window.rosterOrder||[]).indexOf(a.id))-((window.rosterOrder||[]).indexOf(b.id)<0?999:(window.rosterOrder||[]).indexOf(b.id)):0)).filter(c => CHAMPIONS[c.base].name.includes(search) && (!mergeOnly || mergePartner(p.champions, c)));
  html('#heroes', heroes.map(c => {
    const partner=mergePartner(p.champions,c);
    const equipment=SLOTS.map((slot,i)=>{
      const item=c.equipment[i];
      const label=item?`${slot}: ${ITEMS[item.base].name} (${TIERS[item.tier]})`:`${slot}: 미장착`;
      return `<span class="roster-slot ${item?'equipped':''}" style="--slot-color:${item?COLORS[item.tier]:'#34485a'}" title="${escape(label)}" aria-label="${escape(label)}">${item?equipmentMarkup(item):['⚔','✥','♧','◇'][i]}</span>`;
    }).join('');
    return `<div class="roster-card" draggable="true" data-roster-id="${c.id}" style="--tier:${COLORS[c.tier]}"><label class="roster-auto-boss" title="보스 등장 시 자동 파견"><input type="checkbox" data-auto-boss="${c.id}" ${c.autoBoss?'checked':''} ${!editable?'disabled':''} aria-label="${CHAMPIONS[c.base].name} 보스 자동 파견">보스</label><button class="champion-sell" data-sell="${c.id}" title="판매 · 15골드 (장비 반환)" aria-label="${CHAMPIONS[c.base].name} 판매 · 15골드" ${!editable?'disabled':''}><svg class="sell-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="5.2"/><path d="M10 6v8M12 7.5H9a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H8"/></svg><span>15</span></button><button data-select="${c.id}" class="${selected===c.id?'selected':''}">${portraitMarkup(CHAMPIONS[c.base].type,'roster-portrait',0)}<span class="roster-name">${CHAMPIONS[c.base].name}</span><small class="roster-stars" aria-label="${TIERS[c.tier]}" title="${TIERS[c.tier]}">${'★'.repeat(c.tier+1)}</small><span class="roster-equipment">${equipment}</span></button>${partner?`<button class="roster-merge" data-merge="hero" data-id="${c.id}" ${!editable?'disabled':''} title="${TIERS[c.tier+1]} 등급으로 합성">합성하기 ↑</button>`:''}</div>`;
  }).join('') || `<span class="muted">${p.champions.length?'조건에 맞는 챔피언이 없습니다.':'챔피언을 소환하세요. 시작 골드로 2번 소환할 수 있습니다.'}</span>`);
  if (!$('#heroes .inventory-empty-slot')) for(let i=heroes.length;i<7;i++){const slot=document.createElement('span');slot.className='inventory-empty-slot';slot.setAttribute('aria-hidden','true');slot.textContent='+';$('#heroes').append(slot);}
  const slot = $('#item-slot-filter').value;
  const itemMergeOnly = $('#item-merge-only').checked;
  const items = p.items.filter(i => (slot === 'all' || ITEMS[i.base].slot === Number(slot)) && (!itemMergeOnly || mergePartner(allEquipment(p), i))).sort((a,b)=>b.tier-a.tier || a.base-b.base || a.id-b.id);
  updateBattleNotices(game,p);
  html('#items', items.map(i => `<div class="item-roster-card"><button class="item-sell" data-sell-item="${i.id}" ${!editable?'disabled':''} title="장비 판매 · 15골드">판매 · 15 G</button><button draggable="true" data-item="${i.id}" class="${selectedItem === i.id ? 'selected' : ''}" style="--tier:${COLORS[i.tier]}">${equipmentMarkup(i)}${ITEMS[i.base].name}<br><small style="color:${COLORS[i.tier]}">${TIERS[i.tier]} ${mergePartner(allEquipment(p), i) ? '· 합성 가능 ↑' : ''}</small><br><small class="item-option">${itemEffectText(i)}</small></button>${mergePartner(allEquipment(p),i)?`<button class="roster-merge" data-merge="item" data-id="${i.id}" ${!editable?'disabled':''}>합성하기 ↑</button>`:''}</div>`).join('') || `<span class="muted">${p.items.length ? '조건에 맞는 장비가 없습니다.' : '장비를 뽑아 챔피언의 능력을 강화하세요.'}</span>`);
  if (!$('#items .inventory-empty-slot')) for(let i=items.length;i<6;i++){const slot=document.createElement('span');slot.className='inventory-empty-slot equipment-empty';slot.setAttribute('aria-hidden','true');slot.textContent='+';$('#items').append(slot);}
  html('#upgrades', ['hero','item'].map(kind=>{const level=p[kind==='hero'?'heroLevel':'itemLevel'],cost=upgradeCost(p,kind),max=level>=10;const current=chances(level),next=chances(Math.min(10,level+1));return `<section class="upgrade-card upgrade-${kind}"><div class="upgrade-art"></div><div class="upgrade-heading"><span>${kind==='hero'?'CHAMPION SUMMON':'EQUIPMENT FORGE'}</span><h4>${kind==='hero'?'챔피언 소환 강화':'장비 소환 강화'}</h4><b>Lv.${level} <small>${max?'최고 레벨':'→ Lv.'+(level+1)}</small></b></div><div class="upgrade-rates"><div class="upgrade-rate-head"><span>등급</span><span>현재</span><span>${max?'최대':'강화 후'}</span></div>${current.map((n,i)=>`<div><span style="color:${COLORS[i]}">${TIERS[i]}</span><b>${Number(n.toFixed(3))}%</b><b class="${next[i]>n?'rate-up':''}">${Number(next[i].toFixed(3))}%</b></div>`).join('')}</div><button data-upgrade="${kind}" ${!editable||max||p.gold<cost?'disabled':''}>${max?'최고 레벨 도달':cost+' G · 강화하기'}</button></section>`;}).join(''));
  html('#probabilities','<span>보유 골드 <b>'+p.gold+' G</b></span><span>강화한 소환 확률은 이번 전투에 적용됩니다.</span>');
  document.querySelectorAll('[data-draw]').forEach(button => {const cost=drawCost(p,button.dataset.draw);button.disabled=p.gold<cost||!editable||(button.dataset.draw==='hero'?p.champions.length>=MAX_CHAMPIONS:p.items.length>=80);button.querySelector('small').textContent=cost+' G';});
  const next = Math.min(100, game.round + 1);
  const definition=MONSTERS[familyForRound(next)],trait=TRAITS[definition.trait];
  const profile = monsterProfile(game, next);profile.hp*=game.random?1:(trait.hp||1);
  html('#wave-preview', `<span class="eyebrow">${game.round === 100 ? 'FINAL WAVE' : 'NEXT INTEL'}</span><p>${next}라운드 · ${game.random?'기본 HP':'HP'} ${Math.ceil(profile.hp).toLocaleString()}${next % 5 === 0 && game.mode!=='coop' ? '<br>보스 1마리 · HP '+Math.ceil(monsterProfile(game,next,true).hp).toLocaleString() : ''}</p><span class="defense-chip">${game.random ? '무작위 방어속성' : definition.defense}</span>${game.hard ? `<span class="defense-chip">추가 방어 최대 ${game.hard}개</span>` : ''}`);
  $('#wave-preview .trait-preview')?.remove();if(!game.random)$('#wave-preview').insertAdjacentHTML('beforeend',`<div class="trait-preview"><p><b>${definition.name}</b> · ${trait.name}</p><p class="muted">${trait.description}</p></div>`);
  const theme = mapForRound(game.round || 1);
  let preview = $('#next-monsters');
  if (!preview) { preview = document.createElement('div');preview.id='next-monsters';$('#wave-preview').append(preview); }
  preview.innerHTML = (game.random ? [0,10,20,30] : [familyForRound(next)]).map(family=>monsterPortraitMarkup({family})).join('')+(next%5===0?monsterPortraitMarkup({boss:true,round:next}):'');
  text('#map-stage', `${theme.name} · ${theme.first}~${theme.last}라운드`);
  const enemy = board.monsters.find(m => m.id === selectedEnemy);
  html('#inspect-enemy', enemy ? `${monsterPortraitMarkup(enemy)}<h3>${monsterName(enemy)}</h3><p class="muted">${enemy.boss ? '보스' : '몬스터'} #${enemy.id} · HP ${Math.max(0, Math.ceil(enemy.hp)).toLocaleString()} / ${Math.ceil(enemy.maxHp).toLocaleString()}</p><p style="color:${traitDefinition(enemy).color}">${enemy.boss?'보스 전술':traitDefinition(enemy).name}</p><p class="muted">${enemy.boss?'30초마다 공포·쇠약·회복·가속·보호막·서리 폭풍·암흑 장막·마력 봉인을 순환 사용합니다.':traitDefinition(enemy).description}</p>${enemy.defenses.map(d => `<span class="defense-chip">${d}</span>`).join('')}` : '<p class="muted">길 위의 몬스터를 클릭하면 외형과 방어속성을 확인할 수 있습니다.</p>');
  let worldNotice=document.querySelector('#world-boss-persistent');if(!worldNotice){worldNotice=document.createElement('div');worldNotice.id='world-boss-persistent';document.querySelector('#board-tabs').after(worldNotice);}const world=game.boards[bossIndex];const worldBoss=world?.monsters.find(m=>m.hp>0);worldNotice.hidden=!worldBoss;if(worldBoss){const hp=Math.max(0,worldBoss.hp),pct=Math.ceil(hp/worldBoss.maxHp*100);worldNotice.innerHTML='<div class="world-alert-copy"><strong><span class="world-alert-icon" aria-hidden="true">☠</span> '+(game.mode==='coop'?'월드보스':'개인 보스')+' 출현</strong><span>'+world.expiresRound+'라운드 전까지 처치 · 남은 '+Math.max(0,world.expiresRound-game.round)+'라운드 · 미처치 시 게임오버</span></div><div class="world-hp"><b>HP '+Math.ceil(hp).toLocaleString()+' / '+Math.ceil(worldBoss.maxHp).toLocaleString()+' ('+pct+'%)</b><progress max="'+worldBoss.maxHp+'" value="'+hp+'"></progress></div><button data-board="'+bossIndex+'">보스방 이동 [5] →</button>';}
  if(enemy){lastDetailKey=null;const detail=$('#detail');detail._lastHTML=null;detail.innerHTML='<div class="monster-detail-art">'+monsterPortraitMarkup(enemy)+'</div><h3>'+monsterName(enemy)+'</h3><p>'+ (enemy.worldBoss?(game.mode==='coop'?'월드보스':'개인 보스'):enemy.boss?'보스':'일반 몬스터')+' · '+enemy.round+'라운드</p><progress max="'+enemy.maxHp+'" value="'+Math.max(0,enemy.hp)+'"></progress><p>체력 '+Math.ceil(Math.max(0,enemy.hp)).toLocaleString()+' / '+Math.ceil(enemy.maxHp).toLocaleString()+'</p><p>누적 몬스터 집계: '+(enemy.boss&&game.mode!=='coop'?10:1)+'마리</p><h4>방어 속성</h4>'+enemy.defenses.map(d=>'<span class="defense-chip">'+d+'</span>').join('')+'<p>물리 방어력 '+(enemy.armor??enemy.round??0)+' · 마법 방어력 '+(enemy.magicArmor??enemy.round??0)+'</p><p class="muted">방어력 1당 해당 속성 피해 1 감소 · 관통/방깎 적용 후 계산</p><h4>'+traitDefinition(enemy).name+'</h4><p>'+traitDefinition(enemy).description+'</p><p>이동 속도 '+(enemy.speed*2560).toFixed(1)+' · 둔화 '+Math.ceil(enemy.slow||0)+'초 · 기절 '+(enemy.stun||0).toFixed(1)+'초</p>'+(enemy.boss?'<p>다음 스킬까지 '+Math.ceil(Math.max(0,enemy.nextSkillAt-game.time))+'초</p>':'');}else renderDetail(game, p, selected, selectedItem, editable, abilities, effects);
}

function renderDetail(game, player, selected, selectedItem, editable, abilities, effects) {
  const champion = game.players.flatMap(p => p.champions).find(c => c.id === selected);
  const item = player.items.find(i => i.id === selectedItem);
  const key = JSON.stringify({
    selected, selectedItem, editable, skillSecond:Math.ceil(game.time),
    champion: champion && { base: champion.base, tier: champion.tier, world:champion.world, autoBoss:champion.autoBoss, equipment: champion.equipment, growth: champion.growth, talents:champion.talents, synergyBonus:champion.synergyBonus, target: champion.target, autoApproach: champion.autoApproach, combatState: champion.combatState, supportBuffs:champion.supportBuffs },
    item,
    roster: player.champions.map(c => [c.id, c.base, c.tier]),
    bag: player.items.map(i => [i.id, i.base, i.tier]),
  });
  if (key === lastDetailKey) return;
  if (document.activeElement?.tagName === 'SELECT' && $('#detail').contains(document.activeElement)) return;
  const wasOpen = $('#champion-more')?.open || false;
  const previousTarget = $('#equip-target')?.value;
  if (previousTarget) selectedTarget = previousTarget;
  lastDetailKey = key;
  if (item) {
    const partner = mergePartner(allEquipment(player), item);
    html('#detail', `<h3 style="color:${COLORS[item.tier]}">${ITEMS[item.base].name} · ${TIERS[item.tier]}</h3><p class="muted">${(ITEMS[item.base].bonuses?'두 가지 능력치를 강화하는 복합 장비':effects[ITEMS[item.base].effect])}<br><strong class="item-option-detail">${itemEffectText(item)}</strong><br>챔피언 카드로 드래그하거나 아래에서 장착 대상을 선택하세요.</p><select id="equip-target" aria-label="장착 대상">${player.champions.map(c => `<option value="${c.id}">${CHAMPIONS[c.base].name} (${TIERS[c.tier]})</option>`).join('')}</select><div class="draw-row"><button id="equip" ${!editable || !player.champions.length ? 'disabled' : ''}>장착</button><button data-merge="item" data-id="${item.id}" ${!editable || !partner ? 'disabled' : ''}>2개 합성 ↑</button></div><p class="muted merge-hint">${partner ? `${TIERS[item.tier + 1]} 등급으로 확정 합성` : item.tier === 6 ? '최고 등급입니다.' : '동일 이름·등급의 장비가 1개 더 필요합니다.'}</p>`);
    if (player.champions.some(c => String(c.id) === selectedTarget)) $('#equip-target').value = selectedTarget;
    return;
  }
  if (!champion) {
    html('#detail', '<h3>챔피언 정보</h3><div class="selection-hint">♜<br><br>챔피언을 선택해<br>능력치와 장비를 확인하세요.</div>');
    return;
  }
  const c = champion, own = player.champions.includes(c), s = stats(c), partner = mergePartner(player.champions, c);
  const pairs = [['공격력', s.attack.toFixed(1)], ['공격속도', s.speed.toFixed(2)], ['사거리', s.range.toFixed(0)], ['공격대상', s.targets], ['치명 확률', (s.crit * 100).toFixed(0) + '%'], ['치명 배율', '×' + s.critMult.toFixed(1)], ['방어관통', (s.armorPen * 100).toFixed(0) + '%'], ['마법관통', (s.magicPen * 100).toFixed(0) + '%']];
  $('#detail')._lastHTML=null;
  html('#detail', `<div class="detail-character" style="--tier:${COLORS[c.tier]}">${portraitMarkup(CHAMPIONS[c.base].type, "detail-portrait", Math.floor(c.base/10))}<span>${TIERS[c.tier]}</span></div><h3 style="color:${COLORS[c.tier]}">${glyphs[CHAMPIONS[c.base].type]} ${CHAMPIONS[c.base].name}</h3><p class="muted">${TIERS[c.tier]} · ${c.base===9?'지원 · 아군 버프':ELEMENTS[c.base].startsWith('물리')?ELEMENTS[c.base].replace('물리','물리 '):'마법 · '+ELEMENTS[c.base]}<br>${abilities[CHAMPIONS[c.base].type]}</p><p class="combat-status">${({stunned:"기절 · 행동 불가",support:"아군 강화 지원 중",fear:"공포 · 공격 불가",attacking:"공격 중",range:"사거리 밖 · 우클릭으로 이동하세요",immune:"공격 대상 없음",moving:"지정 위치로 이동 중",waiting:"적 출현 대기"})[c.combatState]||"전투 준비"}</p><p class="muted">제자리 공격 · 우클릭 이동 · S 이동 중지</p><div class="stats">${pairs.map(([k, v],i) => `<div><span class="stat-label"><i class="stat-symbol stat-${i}">${['⚔','◷','➶','◎','✦','✧','◈','⬡'][i]}</i>${k}</span> <b>${v}</b></div>`).join('')}</div><label class="target-label" for="target-priority">공격 우선순위</label><select id="target-priority" ${!own || !editable ? 'disabled' : ''}>${Object.entries(TARGETS).map(([value, label]) => `<option value="${value}" ${(c.target || 'smart') === value ? 'selected' : ''}>${label}</option>`).join('')}</select>${skillMarkup(c,game.time)}<div class="active-support-buffs">${Object.entries(c.supportBuffs||{}).map(([kind,buff])=>`<span class="defense-chip">✦ ${kind==='damage'?'피해량':'공격속도'} +${Math.round(buff.amount*100)}%</span>`).join('')}</div><div class="equipment">${SLOTS.map((slot, i) => `<button ${own && c.equipment[i] ? `data-unequip="${i}"` : ''} ${!own || !editable ? 'disabled' : ''}>${c.equipment[i]?equipmentMarkup(c.equipment[i]):''}${slot} · ${c.equipment[i] ? `${ITEMS[c.equipment[i].base].name} (${TIERS[c.equipment[i].tier]}) ${own ? '×' : ''}` : '미장착'}</button>`).join('')}</div>${own ? `<button class="mini-btn" style="width:100%;margin-top:10px" data-merge="hero" data-id="${c.id}" ${!editable || !partner ? 'disabled' : ''}>동일 챔피언 2개 합성 ↑</button><p class="muted merge-hint">${partner ? `${TIERS[c.tier + 1]} 등급으로 확정 합성` : c.tier === 6 ? '최고 등급입니다.' : '동일 이름·등급의 챔피언이 1개 더 필요합니다.'}</p>` : '<p class="muted">다른 수호자의 챔피언</p>'}`);
  const detail=$('#detail'), portrait=detail.querySelector('.detail-character'),title=detail.querySelector('h3'),statsBox=detail.querySelector('.stats'),description=detail.querySelector('p.muted');
  const banner=document.createElement('div');banner.className='champion-banner';const bio=document.createElement('div');bio.className='champion-bio';const grade=document.createElement('div');grade.className='banner-grade';grade.textContent=TIERS[c.tier]+' · '+'★'.repeat(c.tier+1);title.textContent=CHAMPIONS[c.base].name;const tags=document.createElement('div');tags.className='champion-tags';const element=ELEMENTS[CHAMPIONS[c.base].type];const labels=c.base===9?['지원','축복']:element.startsWith('물리')?['물리',element.includes('근거리')?'근거리':'원거리']:c.base===18?['마법','근거리','지']:c.base===19?['특수','시간']:['마법',element];for(const label of labels){const tag=document.createElement('span');tag.textContent=label;tags.append(tag);}bio.append(grade,title,tags);banner.append(portrait,bio);
  const equipment=detail.querySelector('.equipment'),skill=detail.querySelector('.champion-skill');equipment.querySelectorAll('button').forEach((button,i)=>{button.title=button.textContent;button.setAttribute('aria-label',button.textContent);button.innerHTML=c.equipment[i]?equipmentMarkup(c.equipment[i]):'<span class="empty-gear">'+['⚔','✥','♧','◇'][i]+'</span>';});
  const equipTitle=document.createElement('h4');equipTitle.textContent='장착 장비';
  const more=document.createElement('details');more.id='champion-more';more.open=wasOpen;more.innerHTML='<summary>전투 설정 · 상세 정보</summary>';more.append(description);
  for(const el of [...detail.children])if(![portrait,title,description,statsBox,equipment,skill].includes(el))more.append(el);
  if(own){const sell=document.createElement('button');sell.className='champion-sell';sell.dataset.sell=c.id;sell.innerHTML='<svg class="sell-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="5.2"/><path d="M10 6v8M12 7.5H9a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H8"/></svg><span>판매 · 15 G</span>';sell.setAttribute('aria-label',CHAMPIONS[c.base].name+' 판매 · 15골드');sell.title='판매 · 15골드 (장비 반환)';sell.disabled=!editable;banner.append(sell);{const dispatch=document.createElement('button');dispatch.dataset.dispatch=c.id;dispatch.className='dispatch-button';dispatch.textContent=c.world?'내 전장으로 복귀':'보스방 파견 ('+player.champions.filter(v=>v.world).length+'/5)';dispatch.disabled=!editable||(!c.world&&!game.boards[bossBoardIndex(game,game.players.indexOf(player))].monsters.length);banner.append(dispatch);}}detail.replaceChildren(banner,statsBox,equipTitle,equipment);if(own){const auto=document.createElement('label');auto.className='detail-auto-boss';auto.innerHTML='<input type="checkbox" data-auto-boss="'+c.id+'" '+(c.autoBoss?'checked':'')+' '+(!editable?'disabled':'')+'> 보스 등장 시 자동 파견';auto.title='보스 출현 중 체크하면 즉시 파견합니다. 체크 해제는 다음 자동 파견만 취소합니다.';banner.after(auto);}if(skill)detail.append(skill);const status=more.querySelector('.combat-status');if(status)detail.append(status);detail.append(more);if(own)for(const gear of Object.values(c.equipment).filter(Boolean)){if(!mergePartner(allEquipment(player),gear))continue;const merge=document.createElement('button');merge.className='mini-btn';merge.dataset.merge='item';merge.dataset.id=gear.id;merge.disabled=!editable;merge.textContent=ITEMS[gear.base].name+' 합성하기 ↑';detail.append(merge);}

}

export function announceWave(round, boss) {
  const el = $('#wave-announcement');
  if (!el) return;
  el.innerHTML = `<small>${boss ? 'BOSS INCOMING' : 'NEW WAVE'}</small><strong>ROUND ${String(round).padStart(2, '0')}</strong>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function updateQuestPanel(game,p){
 let panel=document.querySelector('#match-quests');if(!panel){panel=document.createElement('section');panel.id='match-quests';panel.className='match-quests';panel.innerHTML='<button class="quest-toggle" aria-expanded="false">이번 판 퀘스트 <span></span> ▾</button><div class="quest-list" hidden></div>';document.querySelector('.arena-wrap').append(panel);panel.querySelector('button').onclick=()=>{const list=panel.querySelector('.quest-list');list.hidden=!list.hidden;panel.querySelector('button').setAttribute('aria-expanded',String(!list.hidden));};}
 const claims=p.questClaims||[],ready=(game.quests||[]).filter(q=>(p.questProgress?.[q.id]||0)>=q.target&&!claims.includes(q.id)).length;
 panel.querySelector('.quest-toggle span').textContent=claims.length+'/'+(game.quests||[]).length+(ready?' · 보상 '+ready:'');
 const markup=(game.quests||[]).map(q=>{const value=p.questProgress?.[q.id]||0,done=claims.includes(q.id),r=q.reward,reward=r.kind==='gold'?r.amount+' G':TIERS[r.tier]+' '+(r.kind==='hero'?CHAMPIONS[r.base].name:ITEMS[r.base].name);return '<article><div><strong>'+escape(q.name)+'</strong><small>'+value+' / '+q.target+'</small></div><small class="quest-objective">'+QUEST_METRICS[q.metric]+'</small><progress max="'+q.target+'" value="'+value+'"></progress><footer><span>'+escape(reward)+'</span><button data-claim-quest="'+q.id+'" '+(done||value<q.target?'disabled':'')+'>'+(done?'수령 완료':'보상 받기')+'</button></footer></article>';}).join('');const list=panel.querySelector('.quest-list');if(list._markup!==markup){list.innerHTML=markup;list._markup=markup;}
}

function updateBattleNotices(game,p){
 const arena=document.querySelector('#arena')?.parentElement;if(!arena)return;
 let feed=document.querySelector('#summon-feed');if(!feed){feed=document.createElement('div');feed.id='summon-feed';feed.setAttribute('role','log');arena.append(feed);}
 const lines=(game.summonLog||[]).filter(v=>Date.now()-v.at<6500).slice(-4);feed.innerHTML=lines.map(v=>'<div>'+escape(v.player)+'가 <b style="color:'+COLORS[v.tier]+'">'+escape(v.name)+'('+TIERS[v.tier]+')</b>을 소환했습니다!!</div>').join('');
 if(window.equipmentMergeTipSeen)return;const gear=[...p.items,...p.champions.flatMap(c=>Object.values(c.equipment).filter(Boolean))],seen=new Set();const possible=gear.some(i=>{const key=i.base+':'+i.tier;if(i.tier>=6)return false;if(seen.has(key))return true;seen.add(key);return false;});
 if(possible){window.equipmentMergeTipSeen=true;const tip=document.createElement('div');tip.id='equipment-merge-tip';tip.innerHTML='<span>장착혹은 보유장비 합성이 가능합니다!</span><button aria-label="합성 안내 닫기">×</button>';tip.querySelector('button').onclick=()=>tip.remove();arena.append(tip);}
}

function allEquipment(p){return [...p.items,...p.champions.flatMap(c=>Object.values(c.equipment).filter(Boolean))];}
