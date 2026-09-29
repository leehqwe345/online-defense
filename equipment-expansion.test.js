import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,stats,itemDescription,createGame,action} from './engine.js';
import {equipmentMarkup} from './art.js';
test('four equipment slots each contain 15 items; original IDs retain their slot and effect',()=>{
 assert.equal(ITEMS.length,60);
 for(let slot=0;slot<4;slot++)assert.equal(ITEMS.filter(i=>i.slot===slot).length,15);
 for(let id=0;id<40;id++){assert.equal(ITEMS[id].slot,Math.floor(id/10));assert.equal(ITEMS[id].effect,id%10);}
});
test('all 20 new items apply both bonuses at every tier, with matching descriptions and art',()=>{
 const hero={base:0,tier:0,equipment:{}},plain=stats(hero);
 for(const item of ITEMS.slice(40))for(let tier=0;tier<7;tier++){
  const result=stats({...hero,equipment:{[item.slot]:{base:item.id,tier}}});
  for(const [key,value]of Object.entries(item.bonuses)){
   let expected=key==='speed'?plain.speed*(1+value*1.6**tier):plain[key]+value*1.6**tier;
   if(key==='crit')expected=Math.min(.85,expected);if(key==='range')expected=Math.min(550,expected);
   assert.ok(Math.abs(result[key]-expected)<1e-8,`${item.name} ${key} tier ${tier}`);
  }
  assert.ok(!itemDescription(item,tier).includes('undefined'));
  assert.match(equipmentMarkup({base:item.id,tier}),/equipment-set-expansion-v1.png/);
 }
});
test('new equipment is drawable, mergeable, equippable in its own slot and removable',()=>{
 const saved=Math.random;
 try{for(let base=40;base<60;base++){
  const g=createGame([{id:'p',name:'P'}]),p=g.players[0];Math.random=()=>(base+.1)/ITEMS.length;
  action(g,'p',{type:'draw',kind:'item'});assert.equal(p.items[0].base,base);
  const item=p.items[0];item.tier=0;p.items.push({...item,id:999});action(g,'p',{type:'merge',kind:'item',id:item.id});assert.equal(item.tier,1);assert.equal(p.items.length,1);
  p.champions.push({id:1000,base:0,tier:0,equipment:{}});action(g,'p',{type:'equip',id:1000,item:item.id});assert.equal(p.champions[0].equipment[ITEMS[base].slot],item);
  action(g,'p',{type:'unequip',id:1000,slot:ITEMS[base].slot});assert.equal(p.items[0],item);
 }}finally{Math.random=saved;}
});
