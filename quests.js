// The server rolls one shared set per match. Progress and claims belong to each player.
export const QUEST_POOL=[
 ['첫 전과','kills',30,'gold',15],['방어선 정리','kills',60,'item',0],
 ['증원 요청','heroDraws',3,'gold',15],['장비 보급','itemDraws',2,'gold',15],
 ['첫 합성','heroMerges',1,'item',0],['장비 재련','itemMerges',1,'gold',25],
 ['전투 준비','equipped',3,'gold',20],['전력 확보','roster',4,'gold',20],
 ['숙련 수호자','kills',180,'hero',1],['파도 돌파','rounds',10,'gold',35],
 ['영웅 육성','heroMerges',3,'hero',1],['보급품 정리','itemMerges',2,'item',1],
 ['소환 연구','heroLevel',3,'gold',35],['장비 연구','itemLevel',3,'gold',35],
 ['첫 보스 사냥','bossKills',1,'item',1],['정예 부대','tier2',2,'gold',40],
 ['전장의 베테랑','kills',600,'gold',70],['스무 번째 방어','rounds',20,'hero',2],
 ['보스 추적자','bossKills',3,'item',2],['합성 전문가','heroMerges',6,'gold',60],
 ['장비 장인','itemMerges',5,'item',2],['희귀 전력','tier3',1,'gold',60],
 ['완전 무장','fullyEquipped',2,'hero',2],['연구 완성','levels',10,'gold',70]
].map(([name,metric,target,kind,amount],i)=>({id:'quest-'+i,name,metric,target,reward:kind==='gold'?{kind,amount}:{kind,tier:amount}}));
export function createQuests(heroCount,itemCount,rng=Math.random){
 const result=[];for(let stage=0;stage<3;stage++){const pool=QUEST_POOL.slice(stage*8,stage*8+8);for(let j=0;j<2;j++){const q=structuredClone(pool.splice(Math.min(pool.length-1,Math.floor(rng()*pool.length)),1)[0]);if(q.reward.kind!=='gold')q.reward.base=Math.floor(rng()*(q.reward.kind==='hero'?heroCount:itemCount));result.push(q);}}return result;
}
export function questValue(g,p,q){const heroes=p.champions;switch(q.metric){
 case 'kills':return p.kills;case 'roster':return heroes.length;
 case 'rounds':return g.boards[g.players.indexOf(p)]?.cleared||0;
 case 'equipped':return heroes.reduce((n,c)=>n+Object.values(c.equipment).filter(Boolean).length,0);
 case 'fullyEquipped':return heroes.filter(c=>Object.values(c.equipment).filter(Boolean).length===4).length;
 case 'tier2':return heroes.filter(c=>c.tier>=2).length;case 'tier3':return heroes.filter(c=>c.tier>=3).length;
 case 'heroLevel':return p.heroLevel;case 'itemLevel':return p.itemLevel;case 'levels':return p.heroLevel+p.itemLevel;
 default:return p.questMetrics?.[q.metric]||0;
}}
export function updateQuests(g){for(const p of g.players){p.questProgress??={};for(const q of g.quests||[])p.questProgress[q.id]=Math.min(q.target,Math.max(p.questProgress[q.id]||0,questValue(g,p,q)));}}
export function questMetric(p,key){p.questMetrics??={};p.questMetrics[key]=(p.questMetrics[key]||0)+1;}

export const QUEST_METRICS={kills:'몬스터 처치',heroDraws:'챔피언 골드 소환',itemDraws:'장비 골드 뽑기',heroMerges:'챔피언 합성',itemMerges:'장비 합성',equipped:'동시 장착 장비',roster:'챔피언 동시 보유',rounds:'일반 전장 방어 라운드',heroLevel:'챔피언 상점 레벨',itemLevel:'장비 상점 레벨',bossKills:'보스 처치',tier2:'노말 이상 동시 보유',tier3:'레어 이상 동시 보유',fullyEquipped:'4부위 완전 장착 챔피언',levels:'두 상점 레벨 합계'};
