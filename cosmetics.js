export const THEMES=[
 {id:'forest',name:'새벽숲',color:'#9eea83',symbol:'❧',map:0,scene:'/assets/lobby-courtyard-v1.png'},
 {id:'frost',name:'서리왕관',color:'#87dfff',symbol:'❄',map:2,scene:'/assets/auth-castle-v1.png'},
 {id:'ember',name:'잿불군주',color:'#ff9978',symbol:'♨',map:3,scene:'/assets/shop-banner-v1.png'},
 {id:'arcane',name:'별의서약',color:'#c2a0ff',symbol:'✦',map:4,scene:'/assets/command-scenes-v1.png'},
 {id:'ocean',name:'달빛해무',color:'#7be6d7',symbol:'≋',map:5,scene:'/assets/battle-ruins-v1.png'},
 {id:'royal',name:'황금성역',color:'#f6d683',symbol:'♛',map:8,scene:'/assets/auth-castle-v1.png'}
];
export const SLOTS={avatar:'초상화',frame:'프로필 테두리',nameplate:'명패',title:'칭호',lobby:'대기실 배경',entry:'입장 연출',map:'전장 테마',summon:'소환진',kill:'처치 연출',victory:'승리 연출',emote:'이모티콘'};
const locations={avatar:'내 프로필 · 대기실 · 랭킹',frame:'내 프로필 · 대기실 · 랭킹',nameplate:'내 프로필 · 대기실 · 랭킹',title:'내 프로필 · 대기실 · 랭킹',lobby:'대기실의 내 캐릭터 카드 배경',entry:'대기실 첫 입장 시 내 카드',map:'자신의 전장 배경 (이동 경로 유지)',summon:'새 챔피언 소환 시 발밑',kill:'내 챔피언이 처치한 몬스터 위치',victory:'방어 성공 또는 대전 승리 화면',emote:'대기실 채팅의 이모티콘 버튼'};
export const PRODUCTS=[...THEMES.flatMap(t=>['frame','nameplate','lobby','entry','map','summon','kill','victory','emote'].map(slot=>({id:slot+'-'+t.id,slot,theme:t.id,name:t.name+' '+SLOTS[slot]}))),...Array.from({length:15},(_,i)=>({id:'avatar-'+i,slot:'avatar',theme:THEMES[i%6].id,name:['저격수','궁수','검사','서리술사','화염술사','대지술사','바람술사','연금술사','폭파병','축복술사','뇌전술사','그림자 암살자','용기사','해일술사','룬 포격수'][i]+' 초상화',hero:i})),...['첫 번째 수호자','숲의 파수꾼','서리의 지배자','불꽃을 걷는 자','별을 잇는 자','파도의 인도자','마지막 방어선','함께하는 승리','백전의 전략가','영원한 루프'].map((name,i)=>({id:'title-'+i,slot:'title',theme:THEMES[i%6].id,name}))].map(p=>Object.freeze({...p,price:0,location:locations[p.slot]}));
export const productById=id=>PRODUCTS.find(p=>p.id===id);
export const equippedProduct=(equipment,slot)=>{const p=productById(equipment?.[slot]);return p?.slot===slot?p:null;};
export const themeFor=p=>THEMES.find(t=>t.id===p?.theme)||THEMES[0];
