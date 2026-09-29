export function gameForPlayer(game,viewer){
 if(!game)return null;
 return {...game,players:game.players.map(p=>({...p,talentOffers:p.id===viewer?(p.talentOffers||[]).map(o=>({round:o.round,count:o.choices.length})):[],talentReveal:p.id===viewer?p.talentReveal:undefined,champions:p.champions.map(c=>{const {damageLog,dps,...publicChampion}=c;return p.id===viewer?{...publicChampion,dps:dps||0}:publicChampion;})}))};
}
