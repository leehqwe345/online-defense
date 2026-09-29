import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTERS,TRAITS,chooseFamily,familyForRound,updateMonsterTraits} from './monsters.js';
import {createGame,monster,monsterProfile,damage,tick,action} from './engine.js';
import {monsterName,monsterSpriteIndex,MONSTER_NAMES} from './art.js';
const game=()=>createGame([{id:'a',name:'tester'}]);
const unit=(family,id=1)=>({id,family,hp:50,maxHp:100,p:0,spawnedAt:0,nextTraitAt:12});

test('40 species map to unique names and sprites; both modes cover every species',()=>{
  assert.equal(MONSTERS.length,40);assert.equal(MONSTER_NAMES.length,42);
  assert.equal(new Set(MONSTERS.map(m=>m.name)).size,40);
  assert.equal(new Set(MONSTERS.map(m=>monsterSpriteIndex({family:m.id}))).size,40);
  for(let i=0;i<40;i++){assert.equal(familyForRound(i+1),i);assert.equal(chooseFamily(1,true,()=>i/40),i);assert.equal(monsterName({family:i}),MONSTERS[i].name);assert.ok(TRAITS[MONSTERS[i].trait]);}
  assert.equal(familyForRound(41),0);assert.equal(chooseFamily(1,true,()=>1),39);
});

test('new monster profiles vary HP and speed but bosses retain their existing scaling',()=>{
  const g=game(),tank=monster(g,{round:11,boss:false}),runner=monster(g,{round:12,boss:false});
  assert.equal(tank.hp,monsterProfile(g,11).hp*1.6);
  assert.equal(runner.hp,monsterProfile(g,12).hp*.8);assert.ok(runner.speed>tank.speed);
  assert.equal(monster(g,{round:15,boss:true}).hp,monsterProfile(g,15,true).hp);
});

test('regen caps HP and never revives dead units; berserk and phase are temporary',()=>{
  const regen=unit(12),dead={...unit(12,2),hp:0},berserk={...unit(18,3),hp:30},phase=unit(13,4);
  const b={monsters:[regen,dead,berserk,phase]};updateMonsterTraits(b,1,1);
  assert.equal(regen.hp,50.8);assert.equal(dead.hp,0);assert.equal(berserk.traitSpeed,1.65);assert.equal(phase.phaseGuard,true);
  regen.hp=99.9;berserk.hp=70;updateMonsterTraits(b,3,1);assert.equal(regen.hp,100);assert.equal(berserk.traitSpeed,1);assert.equal(phase.phaseGuard,false);
});

test('healer respects cooldown, nearby loop distance, five-target cap and boss isolation',()=>{
  const healer=unit(17),near=Array.from({length:7},(_,i)=>({...unit(10,i+2),p:.001*i}));
  const far={...unit(10,20),p:.5},boss={...unit(10,21),boss:true};const b={monsters:[healer,...near,far,boss]};
  updateMonsterTraits(b,11,.1);assert.equal(healer.hp,50);
  updateMonsterTraits(b,12,.1);assert.equal(b.monsters.filter(m=>m.hp===58).length,5);assert.equal(far.hp,50);assert.equal(boss.hp,50);
  updateMonsterTraits(b,12.1,.1);assert.equal(healer.hp,58);
});

test('rally and barrier apply bounded statuses; stacked resistance never gives immunity',()=>{
  const rally=unit(15),barrier=unit(14);updateMonsterTraits({monsters:[rally,barrier]},12,.1);
  assert.equal(rally.haste,3);assert.equal(barrier.shield,3);
  for(const definition of MONSTERS){const m={...unit(definition.id),defenses:[definition.defense,'물리저항','마법저항'],shield:3,phaseGuard:true};for(const element of ['물리근거리','물리원거리','수','화','지','풍','독'])assert.ok(damage(m,100,element,{})>0);}
});

test('new species retain one gold rewards and waves still contain 30 enemies',()=>{
  const g=game();action(g,'a',{type:'start'});assert.equal(g.boards[0].spawn.length,30);
  const m=monster(g,{round:11,boss:false});m.hp=0;m.lastHit='a';g.boards[0].spawn=[];g.boards[0].monsters=[m];tick(g,.05);
  assert.equal(g.players[0].gold,61);assert.equal(g.players[0].kills,1);assert.equal(g.deaths[0].family,10);
});
