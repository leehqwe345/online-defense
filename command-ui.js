import {skillMarkup} from './champion-skills.js';
import {CHAMPIONS,ITEMS,TIERS,COLORS,TYPES,SLOTS,stats,itemDescription} from './engine.js';
import {portraitMarkup,equipmentMarkup} from './art.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols=['⌖','➶','⚔','❄','♨','◆','≋','☣','✹','✦','ϟ','☾','⚑','≋','◎'];
const talents=['긴 사거리의 강력한 단발 공격','빠른 공격속도와 안정적인 화력','짧은 사거리의 묵직한 근접 공격','적 둔화 · 유니크 이상 빙결','강력한 화염 · 유니크 이상 범위 공격','적 기절 · 유니크 이상 범위 기절','빠른 공격 · 유니크 이상 아군 공속 버프','지속 독 피해','유니크 이상 폭발 피해','강한 아군에게 무작위 피해량·공격속도 버프',"최대 3대상 번개 공격 · 유니크 이상 5대상 및 짧은 기절","치명타 30%, 배율 ×2.2 · 유니크 이상 체력 35% 이하 적 피해 +50%","물리 관통 20% · 2대상 창술 · 유니크 이상 적 저항 감소","2대상 수속성 둔화 · 유니크 이상 4대상 공격","사거리 410, 물리 관통 25% · 유니크 이상 보스 피해 +75%"];
let selectedHero=2;
export function banner(title,description,label,art,side=''){
  return `<section class="command-banner art-${art}"><div><span class="eyebrow">${label}</span><h1>${title}</h1><p>${description}</p></div>${side}</section>`;
}
function itemArt(item){return equipmentMarkup(item,'equipment-art');}
function itemStat(item,tier){return itemDescription(item,tier);}
export function catalogShell(kind,filter,filterType,tier){
  const hero=kind==='collection',total=hero?CHAMPIONS.length:ITEMS.length;
  return `<div class="command-page ${hero?'champion-page':'equipment-page'}">${banner(hero?'챔피언 도감':'장비 도감',hero?`${TYPES.length}가지 전투 계열, ${total}종의 챔피언. 모든 챔피언은 7등급으로 성장합니다.`:'무기 · 장갑 · 신발 · 목걸이, 부위별 15종의 장비로 조합을 완성하세요.','BUILD YOUR COLLECTION',hero?'castle':'forge',`<div class="collection-count"><span>✧</span><div><small>전체 도감</small><strong>${total} <em>종 · 7등급</em></strong><div class="collection-line"></div></div></div>`)}<div class="catalog-toolbar"><div class="catalog-tabs">${(hero?['전체','물리','마법','특수']:['전체',...SLOTS]).map((name,i)=>`<button data-catalog-category="${i}" class="${i===0?'active':''}">${name}</button>`).join('')}</div><select id="filter-type" aria-label="계열 필터"><option value="all">모든 ${hero?'계열':'부위'}</option>${(hero?TYPES:SLOTS).map((t,i)=>`<option value="${i}" ${filterType===String(i)?'selected':''}>${t}</option>`).join('')}</select><select id="catalog-tier" aria-label="등급 미리보기">${TIERS.map((t,i)=>`<option value="${i}" ${tier===i?'selected':''}>${t}</option>`).join('')}</select><input id="search" placeholder="${hero?'챔피언':'장비'} 이름을 검색하세요…" value="${esc(filter)}" aria-label="도감 검색"></div><div class="catalog-layout"><div id="catalog-grid" class="catalog"></div>${hero?'<aside id="catalog-detail" class="codex-detail"></aside>':''}</div></div>`;
}
export function catalogCards(kind,filter,filterType,tier){
  const hero=kind==='collection',root=document.querySelector('.command-page');
  const category=Number(root.dataset.category||0);
  const list=(hero?CHAMPIONS:ITEMS).filter(c=>c.name.includes(filter)&&(filterType==='all'||(hero?c.type:c.slot)===Number(filterType))&&(!category||(hero?(category===1?[0,1,2,11,12,14].includes(c.type):category===2?[3,4,5,6,10,13].includes(c.type):[7,8,9].includes(c.type)):c.slot===category-1)));
  if(hero&&!list.some(c=>c.id===selectedHero))selectedHero=list[0]?.id;
  document.querySelector('#catalog-grid').innerHTML=list.map(c=>hero?`<button class="codex-hero ${selectedHero===c.id?'active':''}" data-codex-hero="${c.id}" style="--rarity:${COLORS[tier]};--hero-color:${['#dfb76a','#74d58c','#edb965','#79caff','#ff7745','#bd9b76','#6bebc7','#b381e6','#ee9d60','#ffe392','#7ce9ff','#d2a0ff','#ffbe79','#71edec','#e5c282'][c.type]}"><span class="hero-diamond">◇</span>${portraitMarkup(c.type,'codex-portrait',0)}<span class="codex-hero-footer"><small>${TIERS[tier]}</small><strong>${symbols[c.type]} ${c.name}</strong></span></button>`:`<article class="codex-item" style="--rarity:${COLORS[tier]}"><div class="item-card-top"><span>◇ ${TIERS[tier]}</span><span>${SLOTS[c.slot]}</span></div>${itemArt(c)}<h3>${c.name}</h3><p>${itemStat(c,tier)}</p><small>등급별 효과 ×1.6</small></article>`).join('')||'<div class="empty">검색 결과가 없습니다.</div>';
  root.querySelectorAll('[data-catalog-category]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.catalogCategory)===category);b.onclick=()=>{root.dataset.category=b.dataset.catalogCategory;catalogCards(kind,filter,filterType,tier);};});
  root.querySelectorAll('[data-codex-hero]').forEach(b=>b.onclick=()=>{selectedHero=Number(b.dataset.codexHero);catalogCards(kind,filter,filterType,tier);});
  if(hero)renderHeroDetail(tier);
}
function renderHeroDetail(tier){
  const c=CHAMPIONS.find(c=>c.id===selectedHero),target=document.querySelector('#catalog-detail');
  if(!c){target.innerHTML='<p class="muted">챔피언을 선택하세요.</p>';return;}
  const s=stats({base:c.id,tier,equipment:{}});
  target.innerHTML=`<div class="codex-detail-art art-castle"><div><span class="eyebrow">${TYPES[c.type]}</span><h2>${symbols[c.type]} ${c.name}</h2><p style="color:${COLORS[tier]}">${TIERS[tier]} · ${'◆'.repeat(tier+1)}</p></div>${portraitMarkup(c.type,'codex-large',0)}</div><div class="codex-detail-body"><p class="codex-talent">${talents[c.type]}</p>${skillMarkup({base:c.id,tier},0)}<h3>능력치 <small>등급 미리보기</small></h3><div class="codex-stats">${[['공격력',s.attack.toFixed(1)],['공격속도',s.speed.toFixed(2)],['사거리',s.range],['공격대상',s.targets],['치명타 확률',`${Math.round(s.crit*100)}%`],['치명타 배율',`×${s.critMult}`],['방어관통',`${s.armorPen*100}%`],['마법관통',`${s.magicPen*100}%`]].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div><h3>7단계 성장</h3><div class="tier-preview">${TIERS.map((t,i)=>`<span style="color:${COLORS[i]}">${portraitMarkup(c.type,'tier-portrait',0)}<small>${t}</small></span>`).join('')}</div></div>`;
}
export function rankingShell(){return `<div class="command-page ranking-page">${banner('수호자 랭킹','이 세계에 도전한 수호자들의 기록입니다.<br>최고의 전략과 조합으로 정상에 도전하세요.','HALL OF GUARDIANS','hall','<span class="season">♛ SEASON 00<br>THE FIRST LOOP</span>')}<div class="ranking-layout"><section><div class="catalog-toolbar"><select id="rank-mode" aria-label="랭킹 모드"><option value="all">전체 모드</option><option value="single">싱글 모드</option><option value="coop">협동 모드</option><option value="versus">대전 모드</option><option value="hard">하드 모드</option></select><input id="rank-search" placeholder="닉네임을 검색하세요…" aria-label="랭킹 닉네임 검색"></div><div id="rank-list" aria-live="polite">기록을 불러오는 중…</div></section><aside><section class="rank-personal panel"><h3>♔ 내 기록</h3><div id="rank-personal"></div></section><section class="rank-podium panel"><h3>시즌 TOP 3</h3><div id="rank-top"></div></section></aside></div></div>`;}
export function renderRanks(list,user,modes){
  if(!document.querySelector('#rank-list'))return;
  const render=()=>{const mode=document.querySelector('#rank-mode').value,query=document.querySelector('#rank-search').value;const rows=list.filter(r=>(mode==='all'||(mode==='hard'?r.hard>0:r.mode===mode))&&r.name.includes(query));document.querySelector('#rank-list').innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>순위</th><th>수호자</th><th>최고 라운드</th><th>플레이 모드</th><th>처치</th><th>플레이 시간</th><th>등록일</th></tr></thead><tbody>${rows.map(r=>{const i=list.indexOf(r);return `<tr class="rank-place-${i+1}"><td><span class="rank-medal">${i<3?'♛':''} ${i+1}</span></td><td><strong>${esc(r.name)}</strong></td><td>${r.round}</td><td><span class="rank-mode-tag">${modes[r.mode]}${r.hard?' · 하드 '+r.hard:''}</span></td><td>${r.kills}</td><td>${Math.floor(r.seconds/60)}:${String(r.seconds%60).padStart(2,'0')}</td><td>${esc((r.date||'').slice(0,10))}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="rank-empty"><span>♛</span><h2>첫 번째 전설을 기다립니다</h2><p>조건에 맞는 완료 기록이 없습니다.<br>전투를 완료하고 수호자 랭킹에 이름을 남겨보세요.</p></div>';};
  document.querySelector('#rank-mode').onchange=render;document.querySelector('#rank-search').oninput=render;render();
  const mine=user&&list.find(r=>r.name===user.name);
  document.querySelector('#rank-personal').innerHTML=`<div class="rank-avatar">♜</div><h2>${esc(user?.name||'로그인 전')}</h2><p class="muted">${mine?'현재 서버의 완료 기록':'완료한 전투 기록이 없습니다.'}</p><div class="personal-stats"><div>최고 라운드<strong>${mine?.round??'—'}</strong></div><div>전체 순위<strong>${mine?'#'+(list.indexOf(mine)+1):'—'}</strong></div></div>`;
  document.querySelector('#rank-top').innerHTML=list.length?list.slice(0,3).map((r,i)=>`<div class="podium-entry"><span>${['🥇','🥈','🥉'][i]}</span><b>${esc(r.name)}</b><small>ROUND ${r.round}</small></div>`).join(''):'<p class="muted">전투가 끝나면 상위 수호자들이 표시됩니다.</p>';
}
export function enhanceGuide(){
  const heading=document.querySelector('.page-heading');heading.outerHTML=banner('방어선 운용 <em>가이드</em>','소환부터 마지막 웨이브까지, 수호자가 알아야 할 모든 것.','FIELD MANUAL','party','<span class="season">SEASON 00<br>THE FIRST LOOP</span>');
  const articles=[...document.querySelectorAll('.guide-grid article')];
  articles.forEach((a,i)=>{a.classList.add('manual-card');const h=a.querySelector('h3');h.innerHTML=`<span class="manual-number">0${i+1}</span>${h.textContent.split(' / ')[1]}`;});
  articles[0].insertAdjacentHTML('beforeend',`<div class="manual-flow"><span>◉<b>시작</b><small>60 GOLD</small></span><i>»</i><span>${portraitMarkup(2,'manual-portrait',0)}<b>소환</b><small>30 GOLD</small></span><i>»</i><span>⚔<b>자동 전투</b><small>최대 30명</small></span><i>»</i><span>➜<b>다음 웨이브</b><small>전멸 또는 60초</small></span></div>`);
  articles[1].insertAdjacentHTML('beforeend','<div class="manual-modes"><div class="art-forest"><b>싱글 모드</b><small>혼자 도전하는 방어선</small></div><div class="art-castle"><b>협동 모드</b><small>개인 전장 · 월드보스 협공</small></div><div class="art-volcano"><b>대전 모드</b><small>최후의 생존자</small></div></div>');
  articles[2].insertAdjacentHTML('beforeend',`<div class="manual-merge">${portraitMarkup(4,'manual-portrait',0)}<b>＋</b>${portraitMarkup(4,'manual-portrait',0)}<b>»</b><div>${portraitMarkup(4,'manual-portrait upgraded',0)}<small>상위 등급</small></div></div>`);
  articles[3].insertAdjacentHTML('beforeend','<div class="element-strip"><span>⚔<small>물리</small></span><span>❄<small>수</small></span><span>≋<small>풍</small></span><span>◆<small>지</small></span><span>♨<small>화</small></span><span>☣<small>독</small></span></div>');
  articles[5].insertAdjacentHTML('beforeend',`<div class="online-party">${[2,3,1].map(t=>portraitMarkup(t,'manual-portrait',0)).join('')}<span>✧<small>함께 지키는 방어선</small></span></div>`);
  document.querySelector('#content').classList.add('manual-page');
}
