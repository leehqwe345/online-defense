// Normal boards always occupy [0, playerCount); boss rooms follow them.
export function bossBoardIndex(g, playerIndex=0){return g.players.length+(g.mode==='coop'?0:playerIndex);}
export function encounterScope(g,b){
 const index=g.boards?.indexOf(b)??-1;
 if(!b.world)return {boards:[b],players:(g.players||[]).filter((p,i)=>i===index)};
 const players=g.mode==='coop'?g.players.filter(p=>p.alive):g.players.filter((p,i)=>i===index-g.players.length&&p.alive);
 const boards=[b,...players.map(p=>g.boards[g.players.indexOf(p)])];
 return {boards,players};
}
export function mirrorBossEvents(g,b,key,event){for(const target of encounterScope(g,b).boards){target[key]=(target[key]||[]).filter(e=>e.until>g.time);target[key].push({...event});}}

export function playerMapOrder(g,ownId){const own=Math.max(0,g.players.findIndex(p=>p.id===ownId));return [own,...g.players.map((_,i)=>i).filter(i=>i!==own)];}
