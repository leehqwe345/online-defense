export const TALENTS=[];
export function talentTotals(){return {masteries:[],cooldown:0,attack:0,speed:0};}
export function applyTalentStats(c,s){return s;}
export function drawCost(){return 30;}
export function upgradeCost(p,kind){return p[kind==='hero'?'heroLevel':'itemLevel']*35;}
export function grantTalentOffers(){}
export function chooseTalent(){return '특성 시스템은 삭제되었습니다.';}
export function renderTalents(){}
