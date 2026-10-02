import {updateBossAreas} from './boss-area.js';
import {bossBoardIndex,encounterScope,mirrorBossEvents} from './encounters.js';
import {createQuests,updateQuests,questMetric} from './quests.js';
import {castBossArrival} from './boss-skills.js';

import {applyTalentStats,grantTalentOffers,chooseTalent,drawCost,upgradeCost,talentTotals} from './talents.js';
import {randomUnbuffedAllies,tryChampionSkill,updateChampionSkills} from './champion-skills.js';
import {chooseFamily,monsterDefinition,TRAITS,updateMonsterTraits,traitDamageMultiplier} from './monsters.js';
import { controlAction, formationPosition, sortTargets, placeChampion, moveChampion, separateChampions } from './gameplay.js';
export function monsterProfile(game, round, boss = false) {
  const party = 1;
  return { hp: (28 + round * 7) * 1.022 ** (round - 1) * (1 + game.hard * 0.5) * (boss ? 60 : 1) * party };
}
export const TIERS=['커먼','언커먼','노말','레어','유니크','에픽','레전더리'];
export const COLORS=['#98abb9','#74cfaa','#68bafa','#b39aff','#ffcc72','#ff87b8','#fff0a1'];
export const TYPES=['총기','활','검','얼음','화염','대지','바람','독','폭탄','지원','뇌전','암살','창술','해일','포격','철퇴','쌍검','석궁','룬권','시간'];
export const ELEMENTS=['물리원거리','물리원거리','물리근거리','수','화','지','풍','독','화','물리근거리','풍','물리근거리','물리근거리','수','물리원거리','물리근거리','물리근거리','물리원거리','지','풍'];
export const IMMUNITIES=['물리원거리','물리근거리','수','풍','지','화','물리저항','마법저항','슬로우저항','방깎저항'];
export const MAX_CHAMPIONS=30;
export const SLOTS=['무기','장갑','신발','목걸이'];
const names=['아르','루나','카이','세라','레온','니아','제드','에린','노아','벨'];
export const CHAMPIONS=['저격수','궁수','검사','서리술사','화염술사','대지술사','바람술사','연금술사','폭파병','축복술사','뇌전술사','그림자 암살자','용기사','해일술사','룬 포격수','철벽 기사','쌍월 무사','황혼 석궁수','룬 권투사','시간술사'].map((name,i)=>({id:i,name,type:i}));
const itemNames=['맹공','신속','매의 눈','정밀','격노','관통','비전','분열','빙하','파쇄'];
export const ITEMS=Array.from({length:40},(_,i)=>({id:i,name:`${itemNames[i%10]}의 ${SLOTS[Math.floor(i/10)]}`,slot:Math.floor(i/10),effect:i%10})).concat([{"id":40,"name":"용아검","slot":0,"effect":null,"bonuses":{"attack":8,"critMult":0.12}},{"id":41,"name":"뇌광창","slot":0,"effect":null,"bonuses":{"attack":5,"speed":0.08}},{"id":42,"name":"공허 지팡이","slot":0,"effect":null,"bonuses":{"attack":6,"magicPen":0.06}},{"id":43,"name":"태양궁","slot":0,"effect":null,"bonuses":{"range":16,"crit":0.04}},{"id":44,"name":"흑요석 파쇄추","slot":0,"effect":null,"bonuses":{"attack":7,"shred":0.08}},{"id":45,"name":"광전사의 장갑","slot":1,"effect":null,"bonuses":{"attack":6,"crit":0.04}},{"id":46,"name":"번개손 장갑","slot":1,"effect":null,"bonuses":{"speed":0.09,"armorPen":0.04}},{"id":47,"name":"주문술사의 장갑","slot":1,"effect":null,"bonuses":{"speed":0.07,"magicPen":0.05}},{"id":48,"name":"추적자의 장갑","slot":1,"effect":null,"bonuses":{"range":15,"crit":0.04}},{"id":49,"name":"분쇄자의 장갑","slot":1,"effect":null,"bonuses":{"armorPen":0.06,"shred":0.07}},{"id":50,"name":"바람깃 신발","slot":2,"effect":null,"bonuses":{"speed":0.08,"range":12}},{"id":51,"name":"서리걸음 신발","slot":2,"effect":null,"bonuses":{"slow":0.09,"range":12}},{"id":52,"name":"그림자 신발","slot":2,"effect":null,"bonuses":{"crit":0.04,"critMult":0.12}},{"id":53,"name":"황금 정찰화","slot":2,"effect":null,"bonuses":{"range":18,"armorPen":0.04}},{"id":54,"name":"대지의 철화","slot":2,"effect":null,"bonuses":{"attack":6,"shred":0.07}},{"id":55,"name":"분노의 루비 목걸이","slot":3,"effect":null,"bonuses":{"attack":7,"critMult":0.14}},{"id":56,"name":"공허석 목걸이","slot":3,"effect":null,"bonuses":{"magicPen":0.06,"shred":0.06}},{"id":57,"name":"뇌정의 목걸이","slot":3,"effect":null,"bonuses":{"speed":0.08,"crit":0.04}},{"id":58,"name":"서리달 목걸이","slot":3,"effect":null,"bonuses":{"slow":0.08,"magicPen":0.05}},{"id":59,"name":"태양의 목걸이","slot":3,"effect":null,"bonuses":{"attack":5,"range":15}}]);
// Equipment values shared by combat stats and all item descriptions.
export const EQUIPMENT_BASE_OPTIONS=[{attack:10},{speed:.12},{range:35},{crit:.10},{critMult:.50},{armorPen:.14},{magicPen:.14},null,{slow:.18},{shred:.12}];
const equipmentBuffs={42:{attack:8,magicPen:.10},43:{range:30,crit:.07},44:{attack:8,shred:.08},46:{speed:.09,armorPen:.07},47:{speed:.09,magicPen:.08},48:{range:30,crit:.07},49:{armorPen:.12,shred:.10},50:{speed:.08,range:22},51:{slow:.16,range:25},53:{range:32,armorPen:.08},54:{attack:8,shred:.08},55:{attack:8,critMult:.22},56:{magicPen:.12,shred:.10},58:{slow:.15,magicPen:.10},59:{attack:7,range:28}};
for(const [id,bonuses]of Object.entries(equipmentBuffs))ITEMS[Number(id)].bonuses=bonuses;
export function equipmentBonuses(item){return item.bonuses||EQUIPMENT_BASE_OPTIONS[item.effect];}
export function chances(level){const base=[90,5.556,2.667,1.222,.4,.133,.022],top=[10,18,25,24,14,7,2];const result=base.map((n,i)=>+(n+(top[i]-n)*(level-1)/9).toFixed(3));result[0]+=100-result.reduce((a,b)=>a+b,0);return result;}
export function roll(level,rng=Math.random){let n=rng()*100;const index=chances(level).findIndex(p=>(n-=p)<0);return index<0?6:index;}
export function position(p,monster){if(monster?.worldBoss)return {x:400,y:360};p=((p%1)+1)%1;let t=p*4;return t<1?{x:80+640*t,y:80}:t<2?{x:720,y:80+640*(t-1)}:t<3?{x:720-640*(t-2),y:720}:{x:80,y:720-640*(t-3)};}
export function createGame(users,options={}){const mode=['single','coop','versus'].includes(options.mode)?options.mode:'single';return {quests:createQuests(CHAMPIONS.length,ITEMS.length),mode,mapScale:1,random:!!options.random,hard:Math.max(0,Math.min(5,Number(options.hard)||0)),round:0,time:0,roundStartedAt:0,waveInterval:60,speed:2,status:'ready',nextId:1,effects:[],deaths:[],players:users.map(u=>({id:u.id,name:u.name,cosmetics:{...u.cosmetics},gold:60,kills:0,champions:[],items:[],heroLevel:1,itemLevel:1,alive:true})),boards:Array.from({length:users.length+(mode==='coop'?1:users.length)},(_,i)=>({monsters:[],spawn:[],round:0,cleared:0,world:i>=users.length})),message:'챔피언을 소환하고 전투를 시작하세요.'};}
export function stats(c){const def=CHAMPIONS[c.base],t=def.type,m=1.7**c.tier;let s={attack:([32,16,42,17,34,22,13,17,30,0,12,23,22,13,48,52,22,38,32,16][t])*m+(t===9?0:(c.growth||0)),speed:[.65,1.45,.9,.85,.65,.7,1.7,1,.65,.9,.85,1.4,.8,.8,.42,.65,1.65,.75,1.1,.8][t],range:[370,275,165,270,250,220,260,250,260,260,270,150,180,270,390,150,145,310,165,250][t],crit:t===11?.3:.08,critMult:t===11?2.2:1.7,armorPen:t===12?.2:t===14?.25:t===15?.3:[2,16,17].includes(t)?.15:0,magicPen:t===18?.25:t===6?.1:0,targets:t===10?(c.tier>=4?5:3):[12,13].includes(t)?(t===13&&c.tier>=4?4:2):1,slow:t===13?.15:t===19?.25:0,shred:t===12&&c.tier>=4?.15:0};for(const it of Object.values(c.equipment)){if(!it)continue;const p=1.6**it.tier;const item=ITEMS[it.base];const bonuses=equipmentBonuses(item);if(bonuses)for(const [key,value]of Object.entries(bonuses)){if(key==='speed')s.speed*=1+value*p;else s[key]+=value*p;}}Object.assign(s,chainStats(c));s.attack*=(1+(c.supportBuffs?.damage?.amount||0))*(c.bossWeakened?.7:1)*(c.areaWeakened?.5:1);s.speed*=(1+(c.supportBuffs?.speed?.amount||0))*(c.areaSlowed?.5:1);s.crit=Math.min(.85,s.crit);s.range=Math.min(550,s.range);return s;}
function spawnRound(g){
 for(let i=0;i<g.players.length;i++){
  const p=g.players[i],b=g.boards[bossBoardIndex(g,i)];
  if(p.alive&&b?.monsters.some(m=>m.hp>0)&&g.round+1>=b.expiresRound){
   if(g.mode==='versus'){p.alive=false;g.boards[i].spawn=[];b.spawn=[];}
   else{g.status='ended';g.message=(g.mode==='coop'?'월드보스':'보스')+' 처치 실패 · 다음 보스가 도착했습니다';return;}
  }
 }
 if(g.mode==='versus'&&g.players.filter(p=>p.alive).length<=1){g.status='ended';g.message=(g.players.find(p=>p.alive)?.name||'모두')+' · 생존 승리';return;}
 const clearedBy=g.players.filter((p,i)=>g.mode==='versus'&&p.alive&&g.boards[i].cleared===g.round).map(p=>p.id);
 if(g.mode==='versus'&&g.round>0)for(const p of g.players)if(clearedBy.includes(p.id))p.gold+=5;
 const reason=g.round===0?'start':g.mode==='versus'?'versus':g.boards.slice(0,g.players.length).some(b=>b.cleared===g.round)?'clear':'timer';
 g.round++;g.roundEvent={round:g.round,reason,clearedBy,born:g.time};g.roundStartedAt=g.time;g.message='ROUND '+g.round+' · '+(g.round%5===0?'보스방에 보스 출현':'방어선을 지키세요');
 for(const [i,p]of g.players.entries()){if(!p.alive)continue;const b=g.boards[i];b.round=g.round;const count=g.mode!=='coop'&&g.round%5===0?29:30;for(let n=0;n<count;n++)b.spawn.push({at:g.time+n*.6,round:g.round,boss:false});}
 if(g.round%5===0)for(let i=0;i<(g.mode==='coop'?1:g.players.length);i++){
  if(g.mode!=='coop'&&!g.players[i].alive)continue;const b=g.boards[bossBoardIndex(g,i)],boss=monster(g,{round:g.round,boss:true});
  boss.worldBoss=true;boss.hp=boss.maxHp=monsterProfile(g,g.round,true).hp*(g.mode==='coop'?g.players.length*1.3:1);boss.p=.125;boss.speed=0;
  for(const p of (g.mode==='coop'?g.players:[g.players[i]]))for(const c of p.champions)c.bossDamage=0;b.world=true;b.round=g.round;b.monsters=[boss];b.expiresRound=g.round+5;b.cleared=0;
 }
 autoDispatchChampions(g,true);
}
export const MAX_BOSS_CHAMPIONS=5;
export function dispatchChampion(g,p,c){
 if(c.world||p.champions.filter(v=>v.world).length>=MAX_BOSS_CHAMPIONS)return false;
 const bi=bossBoardIndex(g,g.players.indexOf(p)),boss=g.boards[bi]?.monsters.find(m=>m.hp>0);if(!boss)return false;
 const point=position(boss.p,boss),range=stats(c).range/g.mapScale*(c.blindUntil>g.time?.6:1),allies=boardOwners(g,bi).flatMap(p=>p.champions).filter(a=>a.id!==c.id);
 // Short-range units occupy inner rings; ranged units leave room near the boss.
 const outer=Math.min(range*.85,240),inner=Math.min(45,outer);let target;
 for(let radius=outer;radius>=inner&&!target;radius-=8)for(let n=0;n<96;n++){const angle=Math.PI/2+n*Math.PI*2/96,x=point.x+Math.cos(angle)*radius,y=point.y+Math.sin(angle)*radius;if(x>=140&&x<=660&&y>=140&&y<=660&&allies.every(a=>Math.hypot(a.x-x,a.y-y)>=44)){target={x,y};break;}}
 if(!target)return false;c.returnPosition??={x:c.x,y:c.y};c.world=true;c.x=target.x;c.y=target.y;delete c.destination;delete c.approach;return true;
}
function returnChampion(g,c){c.world=false;delete c.destination;delete c.approach;placeChampion(g,c,c.returnPosition||{x:400,y:400});delete c.returnPosition;}
export function autoDispatchChampions(g,force=false){if(!force&&g.time<(g.nextAutoDispatchAt||0))return;g.nextAutoDispatchAt=g.time+.5;for(const p of g.players){if(!p.alive)continue;const boss=g.boards[bossBoardIndex(g,g.players.indexOf(p))]?.monsters.find(m=>m.hp>0);if(!boss)continue;for(const c of [...p.champions].sort((a,b)=>stats(a).range-stats(b).range))if(c.autoBoss&&!c.world&&c.bossAutoSkipId!==boss.id)dispatchChampion(g,p,c);}}
export function action(g,pid,a){const p=g.players.find(p=>p.id===pid);const result=performAction(g,pid,a);if(!result)updateQuests(g);return result;}
function performAction(g,pid,a){const p=g.players.find(p=>p.id===pid);if(!p||!p.alive||g.status==='ended')return '현재 행동할 수 없습니다.';if(a.type==='prepareStart'){if(g.status==='ready'){g.status='countdown';g.startRemaining=3.7;g.startCountdownEndsAt=Date.now()+3700;}return;}if(a.type==='talent'){const offer=p.talentOffers?.[0];if(!Number.isInteger(a.index)||a.index<0||a.index>2||(a.round!==undefined&&a.round!==offer?.round))return '현재 제시된 카드 중 하나를 선택하세요.';return chooseTalent(g,p,a.index);}if(a.type==='pause'&&g.talentPause)return '특성을 선택하면 전투가 재개됩니다.';const control=controlAction(g,p,a);if(control!==undefined){separateChampions(g);return control;}if(a.type==='start'){if(g.status==='ready'){g.status='playing';spawnRound(g);}return;}
if(a.type==='claimQuest'){const q=g.quests?.find(q=>q.id===a.quest);updateQuests(g);if(!q||(p.questProgress?.[q.id]||0)<q.target)return '아직 완료하지 않은 퀘스트입니다.';p.questClaims??=[];if(p.questClaims.includes(q.id))return '이미 받은 보상입니다.';const r=q.reward;if(r.kind==='gold')p.gold+=r.amount;else{const hero=r.kind==='hero',list=hero?p.champions:p.items;if(list.length>=(hero?MAX_CHAMPIONS:80))return '보유 공간을 비운 뒤 보상을 받으세요.';const reward={id:g.nextId++,base:r.base,tier:r.tier};if(hero)Object.assign(reward,{...formationPosition(p.champions.length),target:'smart',cd:0,equipment:{},growth:0});list.push(reward);if(hero)placeChampion(g,reward,reward);}p.questClaims.push(q.id);return;}
if(a.type==='draw'){const cost=drawCost(p,a.kind);if(p.gold<cost)return '골드가 부족합니다.';const hero=a.kind==='hero';if((hero?p.champions:p.items).length>=(hero?MAX_CHAMPIONS:80))return hero?'챔피언은 최대 30명까지 보유할 수 있습니다.':'장비 보유 한도는 80개입니다.';p.gold-=cost;let item={id:g.nextId++,base:Math.floor(Math.random()*(hero?CHAMPIONS.length:ITEMS.length)),tier:roll(hero?p.heroLevel:p.itemLevel)};if(hero)Object.assign(item,{...formationPosition(p.champions.length%80),target:'smart',cd:0,equipment:{},growth:0,talents:[...(p.talents||[])]});(hero?p.champions:p.items).push(item);if(hero)placeChampion(g,item,item);g.summonLog??=[];g.summonLog.push({id:item.id,player:p.name,name:(hero?CHAMPIONS:ITEMS)[item.base].name,tier:item.tier,at:Date.now()});g.summonLog=g.summonLog.slice(-8);questMetric(p,hero?'heroDraws':'itemDraws');return;}
if(a.type==='upgrade'){let key=a.kind==='hero'?'heroLevel':'itemLevel',cost=upgradeCost(p,a.kind);if(p[key]>=10)return '최고 레벨입니다.';if(p.gold<cost)return '골드가 부족합니다.';p.gold-=cost;p[key]++;return;}
if(a.type==='donate'){const target=g.players.find(q=>q.id===a.to);if(g.mode!=='coop'||!target||target===p||!Number.isSafeInteger(a.amount)||a.amount<=0||a.amount>p.gold)return '지원할 아군과 골드를 확인하세요.';p.gold-=a.amount;target.gold+=a.amount;return;}
if(a.type==='sellItem'){const i=p.items.findIndex(i=>i.id===a.id);if(i<0)return '보유 장비만 판매할 수 있습니다.';p.items.splice(i,1);p.gold+=15;return;}
const c=p.champions.find(c=>c.id===a.id);
if(a.type==='sell'){if(!c)return '내 챔피언만 판매할 수 있습니다.';const gear=Object.values(c.equipment).filter(Boolean);if(p.items.length+gear.length>80)return '장비를 돌려받을 가방 공간이 부족합니다.';p.items.push(...gear);p.champions.splice(p.champions.indexOf(c),1);p.gold+=15;return;}
if(a.type==='autoBoss'){if(!c||typeof a.enabled!=='boolean')return '내 챔피언을 선택하세요.';c.autoBoss=a.enabled;if(a.enabled){delete c.bossAutoSkipId;if(!c.world&&['playing','paused'].includes(g.status))dispatchChampion(g,p,c);}return;}
if(a.type==='dispatch'){if(!c)return '파견할 챔피언을 선택하세요.';const b=g.boards[bossBoardIndex(g,g.players.indexOf(p))];if(c.world){c.bossAutoSkipId=b.monsters.find(m=>m.hp>0)?.id;returnChampion(g,c);return;}if(!['playing','paused'].includes(g.status)||!b.monsters.some(m=>m.hp>0))return '보스 출현 중에 파견할 수 있습니다.';if(p.champions.filter(v=>v.world).length>=MAX_BOSS_CHAMPIONS)return '보스방에는 플레이어당 최대 5명까지 입장할 수 있습니다.';if(!dispatchChampion(g,p,c))return '사거리 안에 빈자리가 없습니다. 자리가 비면 다시 파견하세요.';return;}
if(a.type==='moveGroup'&&Array.isArray(a.ids)&&Number.isFinite(a.x)&&Number.isFinite(a.y)){const chosen=p.champions.filter(c=>a.ids.includes(c.id)).slice(0,80);if(!chosen.length)return;const cx=chosen.reduce((s,c)=>s+c.x,0)/chosen.length,cy=chosen.reduce((s,c)=>s+c.y,0)/chosen.length;for(const hero of chosen){const target={x:Math.min(660,Math.max(140,a.x+(hero.x-cx))),y:Math.min(660,Math.max(140,a.y+(hero.y-cy)))};if(g.status==='ready'){placeChampion(g,hero,target);delete hero.destination;}else hero.destination=target;}return;}
if(a.type==='move'&&c&&Number.isFinite(a.x)&&Number.isFinite(a.y)){const target={x:Math.min(660,Math.max(140,a.x)),y:Math.min(660,Math.max(140,a.y))};if(g.status==='ready'){placeChampion(g,c,target);delete c.destination;}else c.destination=target;return;}
if(a.type==='equip'&&c){const i=p.items.findIndex(i=>i.id===a.item);if(i<0)return;const item=p.items.splice(i,1)[0],slot=ITEMS[item.base].slot;if(c.equipment[slot])p.items.push(c.equipment[slot]);c.equipment[slot]=item;return;}
if(a.type==='unequip'&&c&&c.equipment[a.slot]){if(p.items.length>=80)return '장비 보유 한도는 80개입니다. 가방을 비워주세요.';p.items.push(c.equipment[a.slot]);delete c.equipment[a.slot];return;}
if(a.type==='merge'&&a.kind==='item'){const all=[...p.items,...p.champions.flatMap(c=>Object.values(c.equipment).filter(Boolean))],first=all.find(i=>i.id===a.id);if(!first||first.tier>=6)return '합성할 수 없습니다.';const other=all.find(i=>i.id!==first.id&&i.base===first.base&&i.tier===first.tier);if(!other)return '동일 이름·등급 2개가 필요합니다.';const index=p.items.indexOf(other);if(index>=0)p.items.splice(index,1);else for(const hero of p.champions)for(const [slot,item]of Object.entries(hero.equipment))if(item?.id===other.id)delete hero.equipment[slot];first.tier++;questMetric(p,'itemMerges');return;}
if(a.type==='merge'){const list=a.kind==='hero'?p.champions:p.items,first=list.find(i=>i.id===a.id);if(!first||first.tier===6)return '합성할 수 없습니다.';const other=list.find(i=>i.id!==first.id&&i.base===first.base&&i.tier===first.tier);if(!other)return '동일 이름·등급 2개가 필요합니다.';if(other.equipment){const returned=Object.values(other.equipment).filter(Boolean);if(p.items.length+returned.length>80)return '합성으로 반환되는 장비가 80개 한도를 초과합니다. 가방을 비워주세요.';p.items.push(...returned);}list.splice(list.indexOf(other),1);first.tier++;questMetric(p,a.kind==='hero'?'heroMerges':'itemMerges');return;}}
export function monster(g,s){const family=chooseFamily(s.round,g.random),definition=monsterDefinition({family}),trait=TRAITS[s.boss?'none':definition.trait];let defenses=[definition.defense];for(let j=0;j<g.hard;j++){const d=IMMUNITIES[(family+j+1)%10];if(!defenses.includes(d))defenses.push(d);}const hp=monsterProfile(g,s.round,s.boss).hp*(trait.hp||1);return {id:g.nextId++,p:0,hp,maxHp:hp,speed:1.2*(.023+(family%10)*.001)*(1+g.hard*.05)*(trait.speed||1),family,round:s.round,...(s.boss?{bossVariant:g.random?Math.floor(Math.random()*14):Math.max(0,Math.floor(s.round/5)-1)%14}:{}),armor:s.round,magicArmor:s.round,defenses,boss:s.boss,spawnedAt:g.time,nextTraitAt:g.time+12,nextSkillAt:g.time+30,skillIndex:(Math.floor(s.round/5)-1)%5,slow:0,stun:0,shred:0,poison:0,poisonOwner:null};}
export function damage(mon,amount,element,s){const physical=element.startsWith('물리');const broad=physical?['물리저항','물리면역']:['마법저항','마법면역'];const magical=['수','화','지','풍'].includes(element);const resisted=mon.defenses.includes(element)||((physical||magical)&&broad.some(d=>mon.defenses.includes(d)));const resistance=resisted?.65:0;const pen=physical?s.armorPen:s.magicPen;const baseArmor=Math.max(0,physical?(mon.armor??mon.round??0):(mon.magicArmor??mon.round??0));const effectiveArmor=baseArmor*(1-Math.min(1,Math.max(0,(pen||0)+(mon.shred||0)+(mon.skillShred||0))));return Math.max(0,amount*(1+(mon.boss?s.bossBonus||0:s.normalBonus||0))-effectiveArmor)*(1-Math.max(0,resistance-(pen||0)-(mon.shred||0)-(mon.skillShred||0)))*(mon.shield>0?.5:1)*traitDamageMultiplier(mon);}
export function recordDamage(c,amount,time,world=false){if(!c||!(amount>0))return;if(world){c.bossDamage=(c.bossDamage||0)+amount;return;}c.damageLog??=[];const bucket=Math.floor(time*10)/10,last=c.damageLog.at(-1);if(last&&last.time===bucket)last.amount+=amount;else c.damageLog.push({time:bucket,amount});}
export function updateDps(g){for(const p of g.players)for(const c of p.champions){c.damageLog=(c.damageLog||[]).filter(e=>e.time>g.time-5);c.dps=c.damageLog.reduce((n,e)=>n+e.amount,0)/5;}}
export function castSupport(g,owners,c,rng=Math.random){
 const target=randomUnbuffedAllies(owners,c,g.time,1,rng)[0];if(!target)return false;
 const kind=rng()<.5?'damage':'speed',amount=.3+c.tier*.05;target.supportBuffs??={};const prior=target.supportBuffs[kind];
 if(!prior||prior.until<=g.time||prior.amount<=amount)target.supportBuffs[kind]={amount,until:g.time+10,source:c.id};
 c.supportCast={target:target.id,kind,until:g.time+2};c.cd=talentTotals(c.talents).masteries.includes(9)?9:10;
 const board=championBoard(g,c);
 g.effects.push({source:c.id,target:target.id,x:c.x,y:c.y,tx:target.x,ty:target.y,born:g.time,until:g.time+.6,type:9,amount:0,board,support:true});return true;
}
export const BOSS_SKILLS=['공포의 포효','쇠약의 저주','재생의 파동','광폭 행진','철벽 보호막','서리 폭풍','암흑 장막','마력 봉인'];
export function castBossSkill(g,b,owners,boss){
 const scope=encounterScope(g,b);if(b.world)owners=scope.players;const affectedMonsters=scope.boards.flatMap(board=>board.monsters);const skill=(boss.skillIndex||0)%BOSS_SKILLS.length;
 if(skill===0)for(const p of owners)for(const c of p.champions)c.fearUntil=g.time+5;
 if(skill===1)for(const p of owners)for(const c of p.champions)c.slowAttackUntil=g.time+10;
 if(skill===2)for(const m of affectedMonsters)if(m.hp>0)m.hp=Math.min(m.maxHp,m.hp+m.maxHp*.2);
 if(skill===3)for(const m of affectedMonsters)m.haste=10;
 if(skill===4)for(const m of affectedMonsters)m.shield=10;
 if(skill===5){for(const p of owners)for(const c of p.champions)c.slowAttackUntil=g.time+6;}if(skill===6)for(const p of owners)for(const c of p.champions)c.blindUntil=g.time+8;if(skill===7)for(const p of owners)for(const c of p.champions)c.silenceUntil=g.time+8;
 b.bossCast={name:BOSS_SKILLS[skill],bossId:boss.id,born:g.time,until:g.time+[5,10,4,10,10,6,8,8][skill],skill};mirrorBossEvents(g,b,'bossCasts',b.bossCast);boss.skillIndex=(skill+1)%BOSS_SKILLS.length;boss.nextSkillAt=g.time+30;
}
// Manual orders take priority. Automatic approach stays strictly inside the square.
function moveToward(c, target, step) {
  const dx=target.x-c.x, dy=target.y-c.y, distance=Math.hypot(dx,dy);
  if(distance<=step){c.x=target.x;c.y=target.y;return true;}
  c.x+=dx/distance*step;c.y+=dy/distance*step;return false;
}
function acquireTargets(g,c,monsters,s,element,dt,manualMove) {
  if(manualMove){c.combatState='moving';return [];}
  const alive=monsters.filter(m=>m.hp>0);
  const viable=sortTargets(alive,c.target||'smart',m=>Math.max(.000001,damage(m,s.attack,element,s)));
  const range=s.range/g.mapScale*(c.blindUntil>g.time?.6:1);
  let near=viable.filter(m=>Math.hypot(position(m.p,m).x-c.x,position(m.p,m).y-c.y)<=range);
  delete c.approach;
  c.combatState=near.length?'attacking':!alive.length?'waiting':'range';
  return near;
}
export function bossBasicAttack(g,b,owners,rng=Math.random){
 if(!b.world)return;
 const targets=owners.flatMap(p=>p.champions).filter(c=>c.world);
 for(const boss of b.monsters){
  if(!boss.boss||boss.hp<=0)continue;
  boss.nextBasicAt??=g.time+1;
  if(g.time<boss.nextBasicAt)continue;
  boss.nextBasicAt=g.time+1;
  if(!targets.length||boss.stun>0)continue;
  const c=targets[Math.min(targets.length-1,Math.floor(rng()*targets.length))];
  const kind=['stun','weaken','slow'][Math.min(2,Math.floor(rng()*3))];
  c.bossDebuff={kind,until:g.time+1};c.bossWeakened=kind==='weaken';
  boss.basicAttack={target:c.id,x:c.x,y:c.y,kind,born:g.time,until:g.time+.3};
 }
}
function combatTick(g,dt){if(g.status!=='playing')return;g.time+=dt;if(g.mode==='coop'){for(const b of g.boards)while(b.spawn.length&&b.spawn[0].at<=g.time)b.monsters.push(monster(g,b.spawn.shift()));if(g.boards.reduce((n,b)=>n+b.monsters.filter(m=>m.hp>0).length,0)>=100){g.status='ended';g.message='공동 방어선 붕괴 · 전체 몬스터 100마리';return;}}for(const p of g.players)for(const c of p.champions)for(const [kind,buff]of Object.entries(c.supportBuffs||{}))if(buff.until<=g.time)delete c.supportBuffs[kind];for(const p of g.players)for(const c of p.champions){c.areaWeakened=c.areaWeakUntil>g.time;c.areaSlowed=c.areaSlowUntil>g.time;if(c.bossDebuff?.until<=g.time){delete c.bossDebuff;c.bossWeakened=false;}}for(const b of g.boards)updateBossAreas(g,b);autoDispatchChampions(g);separateChampions(g);g.effects=g.effects.filter(e=>e.until>g.time);g.deaths=(g.deaths||[]).filter(e=>e.until>g.time);for(const [bi,b]of g.boards.entries()){const ownerIndex=b.world?bi-g.players.length:bi;if(g.mode==='versus'&&!g.players[ownerIndex]?.alive)continue;while(b.spawn.length&&b.spawn[0].at<=g.time)b.monsters.push(monster(g,b.spawn.shift()));if(!b.world&&monsterCount(g,b)+monsterCount(g,g.boards[bossBoardIndex(g,bi)])>=100){if(g.mode==='versus'){g.players[bi].alive=false;b.spawn=[];continue;}g.status='ended';g.message='방어선 붕괴 · 몬스터 100마리';return;}const owners=boardOwners(g,bi);for(const boss of b.monsters)if(boss.boss)castBossArrival(g,b,owners,boss);
b.bossCasts=(b.bossCasts||[]).filter(c=>c.until>g.time);
for(const boss of b.monsters.filter(m=>m.boss&&m.hp>0)){boss.nextSkillAt??=g.time+30;if(g.time>=boss.nextSkillAt)castBossSkill(g,b,owners,boss);}
updateMonsterTraits(b,g.time,dt);
const skillApi={stats,damage,recordDamage,position,elements:ELEMENTS};updateChampionSkills(g,b,owners,skillApi);
for(const m of b.monsters){m.haste=Math.max(0,(m.haste||0)-dt);m.shield=Math.max(0,(m.shield||0)-dt);m.stun=Math.max(0,m.stun-dt);if(!m.stun)m.p=(m.p+m.speed*(m.traitSpeed||1)*(m.haste>0?1.5:1)*dt/g.mapScale*(m.slow>0?1-Math.min(.8,Math.max(0,m.slowAmount??.45)):1))%1;m.slow=Math.max(0,m.slow-dt);if(!m.slow)m.slowAmount=0;if(m.poison>0){const actual=Math.min(Math.max(0,m.hp),m.poison*dt*(m.shield>0?.5:1)*traitDamageMultiplier(m));m.hp-=actual;recordDamage(owners.flatMap(p=>p.champions).find(c=>c.id===m.poisonSource),actual,g.time,b.world);m.lastHit=m.poisonOwner;if(!m.hurt||g.time-m.hurt.born>=.3)m.hurt={born:g.time,type:"poison",dx:0,dy:0};}}
bossBasicAttack(g,b,owners);
for(const p of owners)for(const c of p.champions){if(c.areaStunUntil>g.time||(c.bossDebuff?.kind==='stun'&&c.bossDebuff.until>g.time)){c.combatState='stunned';continue;}const manualMove=!!c.destination;if(manualMove){const moved=moveChampion(g,c,c.destination,150*dt/g.mapScale*(c.areaSlowUntil>g.time||(c.bossDebuff?.kind==='slow'&&c.bossDebuff.until>g.time)?.5:1));if(Math.hypot(c.x-c.destination.x,c.y-c.destination.y)<2||(!moved&&Math.hypot(c.x-c.destination.x,c.y-c.destination.y)<60))delete c.destination;}
c.cd=Math.max(0,(Number.isFinite(c.cd)?c.cd:0)-dt);if(c.fearUntil>g.time){c.combatState='fear';continue;}if(CHAMPIONS[c.base].type===9){c.combatState=manualMove?'moving':'support';const supportNear=b.monsters.filter(m=>m.hp>0&&Math.hypot(position(m.p,m).x-c.x,position(m.p,m).y-c.y)<=stats(c).range/g.mapScale);if(!manualMove&&tryChampionSkill(g,b,owners,p,c,supportNear,skillApi))continue;if(!manualMove&&c.cd<=0&&b.monsters.some(m=>m.hp>0))castSupport(g,owners,c);continue;}const s=stats(c);const t=CHAMPIONS[c.base].type,near=acquireTargets(g,c,b.monsters,s,ELEMENTS[t],dt,manualMove);if(tryChampionSkill(g,b,owners,p,c,near,skillApi))continue;if(c.cd>0||!near.length)continue;const buff=owners.some(o=>o.champions.some(v=>v.tier>=4&&CHAMPIONS[v.base].type===6&&Math.hypot(v.x-c.x,v.y-c.y)<220/g.mapScale));c.cd=1/(s.speed*(buff?Math.max(1,1.25/(1+(c.supportBuffs?.speed?.amount||0))):1)*(c.slowAttackUntil>g.time?.5:1));let targets=near.slice(0,s.targets);if(c.tier>=4&&[4,5,8].includes(t)){const origin=position(near[0].p,near[0]);targets=near.filter(m=>Math.hypot(position(m.p,m).x-origin.x,position(m.p,m).y-origin.y)<100/g.mapScale).slice(0,4+c.tier-4);}const chainLinks=chainTargets(targets,b.monsters,s);targets=[...targets,...chainLinks.map(link=>link.to)];const skillBonus=1+(c.nextAttackBonus||0);delete c.nextAttackBonus;for(const m of targets){const hit=damage(m,s.attack*skillBonus*(Math.random()<s.crit?s.critMult:1)*championDamageMultiplier(c,m),ELEMENTS[t],s);recordDamage(c,Math.min(Math.max(0,m.hp),hit),g.time,b.world);m.hp-=hit;m.lastHit=p.id;if(hit>0){const point=position(m.p,m),distance=Math.hypot(point.x-c.x,point.y-c.y)||1;m.hurt={born:g.time,type:t,dx:(point.x-c.x)/distance,dy:(point.y-c.y)/distance};if(t===3||s.slow){const strength=Math.min(.8,(t===3?.45:0)+s.slow);if(m.slow<=0||strength>=(m.slowAmount||0)){m.slowAmount=strength;m.slow=m.defenses.includes('슬로우저항')?.7:2;}if(t===3&&c.tier>=4)m.stun=m.boss?.1:.5;}if(t===10&&c.tier>=4)m.stun=m.boss?.05:.2;if(t===15)m.stun=Math.max(m.stun,m.boss?.05:.2);if(t===5)m.stun=m.boss?.08:c.tier>=4?.5:.18;if(s.shred)m.shred=Math.min(.6,m.shred+s.shred*(m.defenses.includes('방깎저항')?.35:1));if(t===7&&hit*.25>m.poison){m.poison=hit*.25;m.poisonOwner=p.id;m.poisonSource=c.id;}if(t===8&&c.tier>=4){recordDamage(c,Math.min(Math.max(0,m.hp),hit*.35),g.time,b.world);m.hp-=hit*.35;}}const chainLink=chainLinks.find(link=>link.to===m),from=chainLink?position(chainLink.from.p,chainLink.from):c;g.effects.push({chain:!!chainLink,source:c.id,target:m.id,x:from.x,y:from.y,...{tx:position(m.p,m).x,ty:position(m.p,m).y},color:COLORS[c.tier],until:g.time+.3,born:g.time,amount:Math.round(hit),type:t,board:bi});}}
for(const m of b.monsters.filter(m=>m.hp<=0)){g.deaths.push({id:m.id,board:bi,owner:m.lastHit,family:m.family,round:m.round,boss:m.boss,worldBoss:m.worldBoss,bossVariant:m.bossVariant,p:m.p,hurt:m.hurt,born:g.time,until:g.time+1.5});const p=g.players.find(p=>p.id===m.lastHit);if(m.boss){const recipients=b.world&&g.mode==='coop'?g.players:g.players.filter(q=>q===p);for(const q of recipients)questMetric(q,'bossKills');}if(p){p.kills++;p.gold+=m.boss?30+(talentTotals(p.talents).bossGold||0):1;}}b.monsters=b.monsters.filter(m=>m.hp>0);if(!b.monsters.length&&!b.spawn.length)b.cleared=b.round;}
updateDps(g);
if(g.mode==='versus'&&g.players.filter(p=>p.alive).length<=1){g.status='ended';g.message=(g.players.find(p=>p.alive)?.name||'모두')+' · 생존 승리';return;}
if(g.mode==='coop'&&g.boards.reduce((n,b)=>n+b.monsters.length,0)>=100){g.status='ended';g.message='공동 방어선 붕괴 · 전체 몬스터 100마리';return;}
for(const [i,p]of g.players.entries()){const room=g.boards[bossBoardIndex(g,i)];if(!room.monsters.length)for(const c of p.champions)if(c.world)returnChampion(g,c);}
for(let i=0;i<g.players.length;i++)g.boards[i].remoteBosses=g.boards[bossBoardIndex(g,i)].monsters.filter(m=>m.hp>0).map(m=>({id:m.id,boss:true,hp:m.hp,p:m.p,worldBoss:true,nextSkillAt:m.nextSkillAt,skillIndex:m.skillIndex}));
const active=g.boards.slice(0,g.players.length).filter((b,i)=>g.players[i].alive),bossAlive=g.boards.slice(g.players.length).some((b,i)=>(g.mode==='coop'||g.players[i].alive)&&b.monsters.some(m=>m.hp>0));
if(g.round===100){if(!bossAlive&&active.every(b=>!b.monsters.length&&!b.spawn.length)){g.status='ended';g.message='100 ROUND CLEAR · 방어 성공';}return;}
const clear=g.mode==='coop'?active.every(b=>b.cleared===g.round):active.some(b=>b.cleared===g.round);
if(clear||(g.mode!=='versus'&&g.time-g.roundStartedAt>=g.waveInterval-1e-8))spawnRound(g);
}

export function championDamageMultiplier(c,m){const t=CHAMPIONS[c.base].type;return c.tier>=4&&((t===11&&m.hp/m.maxHp<=.35)||(t===14&&m.boss))?(t===14?1.75:1.5):1;}

export function itemDescription(item,tier=0){const p=1.6**tier,bonuses=equipmentBonuses(item);if(bonuses){const labels={attack:'공격력',speed:'공격속도',range:'사거리',crit:'치명타 확률',critMult:'치명타 배율',armorPen:'물리 방어관통',magicPen:'마법 방어관통',slow:'둔화',shred:'방어 저항 감소'};return Object.entries(bonuses).map(([key,value])=>{const percentage=['speed','crit','armorPen','magicPen','slow','shred'].includes(key);return labels[key]+' +'+(value*p*(percentage?100:1)).toFixed(key==='critMult'?2:key==='range'?0:1)+(percentage?(key==='speed'?'%':'%p'):'');}).join(' · ');}return tier<5?'추가 연쇄 공격 확률 '+[20,30,50,80,100][tier]+'%':(tier===5?'2':'3')+'회 연쇄 공격';}

export function advanceStartCountdown(g,dt){if(g.status!=='countdown')return;g.startRemaining=Math.max(0,g.startRemaining-dt);if(g.startRemaining<1e-8){g.startRemaining=0;g.status='ready';action(g,g.players[0].id,{type:'start'});}}

export function championBoard(g,c){const owner=g.players.findIndex(p=>p.champions.includes(c));return c.world?bossBoardIndex(g,owner):Math.max(0,owner);}
export function boardOwners(g,bi){return g.players.map(p=>({...p,champions:p.champions.filter(c=>championBoard(g,c)===bi)})).filter(p=>p.champions.length);}

export function monsterCount(g,b){return (b?.monsters||[]).reduce((n,m)=>n+(m.hp>0?(m.boss&&g.mode!=='coop'?10:1):0),0);}
export function chainStats(c){let chance=0,count=0;for(const it of Object.values(c.equipment||{})){if(!it||ITEMS[it.base]?.effect!==7)continue;if(it.tier>=5)count=Math.max(count,it.tier===6?3:2);else chance+=[.2,.3,.5,.8,1][it.tier];}return {chainChance:count?1:Math.min(1,chance),chainCount:count||1};}
export function chainTargets(initial,monsters,s,rng=Math.random){if(!initial.length||!s.chainChance||rng()>=s.chainChance)return [];const used=new Set(initial),links=[];let from=initial[0];for(let i=0;i<s.chainCount;i++){const p=position(from.p,from);const choices=monsters.filter(m=>m.hp>0&&!used.has(m)).map(m=>({m,d:Math.hypot(position(m.p,m).x-p.x,position(m.p,m).y-p.y)})).filter(x=>x.d<=240).sort((a,b)=>a.d-b.d||a.m.id-b.m.id);if(!choices.length)break;const to=choices[0].m;links.push({from,to});used.add(to);from=to;}return links;}

// Capture rewards at each simulation step, including waves cleared before an automatic advance.
export function tick(g,dt){
 const playing=g.status==='playing',round=g.round,alive=g.players.map(p=>p.alive);
 combatTick(g,dt);updateQuests(g);if(!playing)return;
 g.diamondRewards??=[];
 if(g.mode==='coop'){
  g.diamondRounds??=[];
  for(let r=20;r<=round;r++)if(!g.diamondRounds.includes(r)&&g.boards.every(b=>!b.monsters.some(m=>m.round===r&&m.hp>0)&&!b.spawn.some(m=>m.round===r))){
   g.diamondRounds.push(r);for(const p of g.players)g.diamondRewards.push({key:'coop:'+r,accountId:p.id,amount:1});
  }
 }
 if(g.mode==='versus'){
  g.players.forEach((p,i)=>{if(alive[i]&&!p.alive&&round>=20)g.diamondRewards.push({key:'versus',accountId:p.id,amount:10});});
  if(g.status==='ended'&&round>=20){const survivors=g.players.filter(p=>p.alive);if(survivors.length===1)g.diamondRewards.push({key:'versus',accountId:survivors[0].id,amount:30});}
 }
}
