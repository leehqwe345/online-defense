export const TRAITS={
  none:{name:'기본형',description:'표시된 속성 피해를 65% 줄입니다.',color:'#a7bac6'},
  armor:{name:'중장갑',description:'체력 60% 증가 · 이동속도 22% 감소. 속성 저항을 관통하는 조합이 유리합니다.',hp:1.6,speed:.78,color:'#d4b46f'},
  runner:{name:'질주',description:'이동속도 40% 증가 · 체력 20% 감소. 슬로우로 발을 묶으세요.',hp:.8,speed:1.4,color:'#6ee3ed'},
  regen:{name:'자가 재생',description:'매초 최대 체력의 0.8% 회복. 집중 공격으로 처치하세요.',hp:1.1,color:'#80e49e'},
  healer:{name:'치유 파동',description:'12초마다 가까운 몬스터 최대 5마리의 체력 8% 회복. 먼저 처치하세요.',hp:.85,color:'#b4f48b'},
  rally:{name:'행진 지휘',description:'12초마다 가까운 몬스터 최대 5마리를 3초간 50% 가속합니다.',color:'#f4d879'},
  barrier:{name:'주기적 보호막',description:'12초마다 3초간 받는 피해 50% 감소. 보호막이 꺼질 때 집중 공격하세요.',color:'#77c6ff'},
  berserk:{name:'빈사 광폭',description:'체력 40% 이하에서 이동속도 65% 증가. 약해진 적을 놓치지 마세요.',hp:1.15,color:'#ff896e'},
  phase:{name:'영체 외피',description:'8초 주기 중 첫 2초 동안 받는 피해 30% 감소. 완전 면역은 아닙니다.',hp:.9,color:'#d8a4ff'},
};
const old=['이끼뿔 슬라임','청동 방패 고블린','붉은 송곳니 멧돼지','빙정 정령','잿불 임프','사암 골렘','그림자 망령','심연의 마안','회오리 박쥐','맹독 버섯'];
const defenses=['물리원거리','물리근거리','수','풍','지','화','물리저항','마법저항','슬로우저항','방깎저항'];
const added=[
 ['호박성 달팽이','armor','물리저항'],['가시뿔 사슴','runner','풍'],['포식 꽃괴물','regen','수'],['등불 까마귀 주술사','phase','마법저항'],['이끼산 거북','barrier','물리원거리'],
 ['황금벌 기수','rally','풍'],['걸어오는 숲 토템','healer','지'],['붉은갓 약초술사','healer','방깎저항'],['비취갑 사마귀','berserk','물리근거리'],['수정등 늪악어','armor','수'],
 ['빙갑 펭귄 기사','barrier','수'],['설원 검치늑대','runner','슬로우저항'],['서리수정 거미','berserk','수'],['빙령 종지기','phase','마법저항'],['눈보라 예티','regen','물리근거리'],
 ['황금갑 전갈','armor','지'],['어린 사암 스핑크스','rally','마법저항'],['사막 미라 사제','healer','화'],['유리날개 풍뎅이','runner','물리원거리'],['붉은 모래벌레','berserk','방깎저항'],
 ['용암등 소라게','armor','화'],['걸어오는 용광로','barrier','화'],['흑요석 뿔산양','berserk','지'],['어린 불사조','regen','화'],['쇳물 지네','runner','슬로우저항'],
 ['황동 태엽벌레','rally','물리원거리'],['탐식 보물상자','barrier','물리근거리'],['심연 오징어 술사','healer','마법저항'],['별핵 공허해파리','phase','풍'],['어린 해골용','berserk','물리저항'],
];
export const MONSTERS=[...old.map((name,id)=>({id,name,trait:'none',defense:defenses[id],floating:[3,6,7,8].includes(id)})),...added.map(([name,trait,defense],i)=>({id:i+10,name,trait,defense,floating:[13,15,23,33,38].includes(i+10)}))];
export function monsterDefinition(m){return MONSTERS[m.family]||MONSTERS[0];}
export function traitDefinition(m){return TRAITS[m.boss?'none':monsterDefinition(m).trait];}
export function familyForRound(round){return (Math.max(1,round)-1)%MONSTERS.length;}
export function chooseFamily(round,random=false,rng=Math.random){return random?Math.min(MONSTERS.length-1,Math.floor(rng()*MONSTERS.length)):familyForRound(round);}
export function traitDamageMultiplier(m){return m.phaseGuard?.7:1;}
export function updateMonsterTraits(board,time,dt){
  for(const m of board.monsters){
    if(m.hp<=0||m.boss)continue;
    const trait=monsterDefinition(m).trait;
    m.traitSpeed=trait==='berserk'&&m.hp/m.maxHp<=.4?1.65:1;
    m.phaseGuard=trait==='phase'&&((time-(m.spawnedAt||0))%8)<2;
    if(trait==='regen')m.hp=Math.min(m.maxHp,m.hp+m.maxHp*.008*dt);
    if(!['healer','rally','barrier'].includes(trait))continue;
    m.nextTraitAt??=time+12;
    if(time<m.nextTraitAt)continue;
    m.nextTraitAt=time+12;m.traitPulseUntil=time+1;
    if(trait==='barrier'){m.shield=Math.max(m.shield||0,3);continue;}
    const distance=n=>Math.min(Math.abs(n.p-m.p),1-Math.abs(n.p-m.p));
    const nearby=board.monsters.filter(n=>n.hp>0&&!n.boss&&distance(n)<=.09).sort((a,b)=>distance(a)-distance(b)||a.id-b.id).slice(0,5);
    for(const n of nearby){if(trait==='healer')n.hp=Math.min(n.maxHp,n.hp+n.maxHp*.08);else n.haste=Math.max(n.haste||0,3);}
  }
}
