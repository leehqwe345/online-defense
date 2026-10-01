// Compatibility exports: combinations no longer grant combat bonuses.
export const SYNERGIES=[];
export const SYNERGY_CAPS={};
export function bonusText(){return '';}
export function activeSynergies(){return [];}
export function syncSynergies(g){for(const p of g.players)for(const c of p.champions)delete c.synergyBonus;}
export function applySynergyStats(c,s){return s;}
export function renderSynergies(){}
