// Permanent per-run choices. Flat/additive bonuses and explicit caps prevent exponential stacking.
const cards=[];
const add=(id,name,category,description,bonus)=>cards.push({id,name,category,description,bonus});
add('attack','전투 교본','공격','전체 공격력 +6%',{attack:.06});
add('speed','신속한 손놀림','공격','전체 공격속도 +5%',{speed:.05});
add('range','넓은 시야','공격','전체 사거리 +15',{range:15});
add('crit','급소 연구','공격','치명타 확률 +4%p',{crit:.04});
add('critpower','치명적인 일격','공격','치명타 배율 +0.15',{critMult:.15});
add('physicalpen','강철 파괴','관통','물리 관통 +5%p',{armorPen:.05});
add('magicpen','마력 해석','관통','마법 관통 +5%p',{magicPen:.05});
add('hybridpen','저항 분석','관통','물리·마법 관통 각각 +3%p',{armorPen:.03,magicPen:.03});
add('slow','끈질긴 추격','제어','공격에 둔화 +6%p · 둔화 상한 80%',{slow:.06});
add('shred','틈새 공격','제어','공격 시 저항 감소 +3%p · 누적 상한 60%',{shred:.03});
add('boss','거인 사냥','공격','보스에게 주는 직접 피해 +10%',{boss:.10});
add('crowd','무리 사냥','공격','일반 몬스터에게 주는 직접 피해 +6%',{normal:.06});
add('cooldown','집중 훈련','스킬','고유 스킬 쿨타임 6% 감소 · 전체 상한 20%',{cooldown:.06});
add('skillpower','비전 증폭','스킬','공격형 고유 스킬 피해 +10%',{skillPower:.10});
add('skillrange','확장 마법진','스킬','범위형 고유 스킬 반경 +8%',{skillRadius:.08});
add('funds','긴급 보급','경제','즉시 45골드 획득',{gold:45});
add('heroDiscount','소환 계약','경제','챔피언 소환 비용 30 → 28골드',{heroDiscount:2});
add('itemDiscount','장비 계약','경제','장비 뽑기 비용 30 → 28골드',{itemDiscount:2});
add('upgradeDiscount','상인과의 약속','경제','상점 강화 비용 10% 할인 (올림)',{upgradeDiscount:.1});
add('bossBounty','현상금 사냥꾼','경제','보스 처치 보상 +8골드 · 협동은 본인만 추가',{bossGold:8});
add('balanced','균형 잡힌 훈련','공격','공격력 +3%, 공격속도 +2%',{attack:.03,speed:.02});
add('scout','정찰 전술','공격','사거리 +8, 치명타 확률 +2%p',{range:8,crit:.02});
add('precise','정밀 사격','공격','물리 관통 +3%p, 치명타 배율 +0.08',{armorPen:.03,critMult:.08});
add('arcane','마력 순환','스킬','마법 관통 +3%p, 고유 스킬 쿨타임 3% 감소',{magicPen:.03,cooldown:.03});
add('frost','냉기 숙련','제어','둔화 +3%p, 사거리 +8',{slow:.03,range:8});
add('siege','공성 전술','공격','보스 피해 +6%, 물리 관통 +2%p',{boss:.06,armorPen:.02});
add('flow','연속 주문','스킬','스킬 피해 +5%, 쿨타임 3% 감소',{skillPower:.05,cooldown:.03});
const names=['저격수','궁수','검사','서리술사','화염술사','대지술사','바람술사','연금술사','폭파병','축복술사','뇌전술사','그림자 암살자','용기사','해일술사','룬 포격수'];
for(let type=0;type<15;type++)add('mastery'+type,names[type]+' 숙련','전문',type===9?'축복술사의 기본 지원 쿨타임 10 → 9초':names[type]+' 공격력 +12% (해당 챔피언만)',{mastery:type});
export const TALENTS=cards;
export function talentTotals(ids=[]){const sum={masteries:[]};for(const id of new Set(ids)){const card=TALENTS.find(c=>c.id===id);if(!card)continue;for(const [key,value]of Object.entries(card.bonus)){if(key==='mastery')sum.masteries.push(value);else sum[key]=(sum[key]||0)+value;}}sum.cooldown=Math.min(.2,sum.cooldown||0);sum.attack=Math.min(.3,sum.attack||0);sum.speed=Math.min(.2,sum.speed||0);return sum;}
export function applyTalentStats(c,s){const b=talentTotals(c.talents);s.attack*=1+b.attack+(b.masteries.includes(c.base)&&c.base!==9?.12:0);s.speed*=1+b.speed;for(const key of ['range','crit','critMult','armorPen','magicPen','slow','shred'])s[key]+=b[key]||0;s.bossBonus=b.boss||0;s.normalBonus=b.normal||0;s.skillPower=b.skillPower||0;s.skillRadius=b.skillRadius||0;s.skillCooldown=b.cooldown;return s;}
export function drawCost(p,kind){const b=talentTotals(p.talents);return 30-(kind==='hero'?b.heroDiscount||0:b.itemDiscount||0);}
export function upgradeCost(p,kind){const b=talentTotals(p.talents);return Math.ceil(p[kind==='hero'?'heroLevel':'itemLevel']*35*(1-(b.upgradeDiscount||0)));}
export function grantTalentOffers(g,rng=Math.random){if(g.round%5)return;for(const p of g.players){if(!p.alive)continue;p.talentOffers??=[];p.talentRounds??=[];if(p.talentRounds.includes(g.round))continue;const owned=new Set(p.talents||[]),eligible=TALENTS.filter(c=>!owned.has(c.id)&&(!('mastery' in c.bonus)||p.champions.some(h=>h.base===c.bonus.mastery)));const choices=[];for(let i=0;i<3&&eligible.length;i++){const diverse=eligible.filter(c=>!choices.some(id=>TALENTS.find(t=>t.id===id).category===c.category));const pool=diverse.length?diverse:eligible;const chosen=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];choices.push(chosen.id);eligible.splice(eligible.indexOf(chosen),1);}p.talentOffers.push({round:g.round,choices});p.talentRounds.push(g.round);}}
export function chooseTalent(g,p,id){const offer=p.talentOffers?.[0];if(Number.isInteger(id))id=offer?.choices[id];if(!offer||!offer.choices.includes(id)||p.talents?.includes(id))return '현재 제시된 특성 중 하나를 선택하세요.';const card=TALENTS.find(c=>c.id===id);p.talents??=[];p.talents.push(id);p.gold+=card.bonus.gold||0;p.talentReveal={round:offer.round,choices:[...offer.choices],selected:id,until:Date.now()+2500};p.talentOffers.shift();for(const c of p.champions)c.talents=[...p.talents];for(const next of p.talentOffers){const used=new Set(p.talents);next.choices=next.choices.filter(id=>!used.has(id));while(next.choices.length<3){const pool=TALENTS.filter(c=>!used.has(c.id)&&!next.choices.includes(c.id));if(!pool.length)break;next.choices.push(pool[Math.floor(Math.random()*pool.length)].id);}}if(g.talentPause&&!p.talentOffers.length){g.talentPause=false;g.status='playing';}return;}
export function renderTalents(game,player,connected,choose){
 let panel=document.querySelector('#talent-panel');if(!panel){panel=document.createElement('section');panel.id='talent-panel';document.querySelector('.arena-wrap')?.append(panel);}
 const reveal=player?.talentReveal?.until>Date.now()?player.talentReveal:null,offer=player?.talentOffers?.[0];
 const key=JSON.stringify([reveal,offer,connected,game.status]);if(panel.dataset.key===key)return;panel.dataset.key=key;panel.hidden=(!offer&&!reveal)||game.status==='ended';if(panel.hidden)return;
 const choices=reveal?.choices||Array.from({length:offer.count||offer.choices?.length||3},()=>null);
 panel.innerHTML='<div class="talent-heading"><strong>ROUND '+(reveal?.round||offer.round)+' · 운명의 특성</strong><span>전투 진행 중 · '+(reveal?'선택한 특성이 적용되었습니다':'뒷면 카드 한 장을 선택하세요')+'</span></div><div class="talent-cards">'+choices.map((id,index)=>{const c=TALENTS.find(t=>t.id===id);return '<button data-talent-index="'+index+'" class="'+(reveal?'revealed ':'')+(reveal?.selected===id?'chosen':'')+'" '+(!connected||reveal?'disabled':'')+'>'+ (c?'<small>'+c.category+'</small><strong>'+c.name+'</strong><p>'+c.description+'</p><span>'+(reveal.selected===id?'✓ 적용됨':'선택하지 않음')+'</span>':'<span class="card-rune">✦</span><strong>운명의 카드 '+(index+1)+'</strong><p>클릭하면 세 장이 모두 공개됩니다</p>')+'</button>';}).join('')+'</div>';
 panel.querySelectorAll('[data-talent-index]').forEach(button=>button.onclick=async()=>{panel.querySelectorAll('button').forEach(b=>b.disabled=true);const ok=await choose(Number(button.dataset.talentIndex),offer.round);if(!ok)panel.dataset.key='';});
}
