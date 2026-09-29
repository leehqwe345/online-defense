import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tick, action, CHAMPIONS } from './engine.js';
import { mapForRound, MAPS } from './maps.js';

function setup(base, mode = 'single') {
  const g = createGame([{id:'a',name:'A'}, {id:'b',name:'B'}].slice(0, mode==='single'?1:2), {mode});
  g.status='playing';g.round=1;g.nextId=100;
  const c={id:1,base,tier:0,x:400,y:400,cd:0,equipment:{},growth:0};g.players[0].champions=[c];
  for(const [i,b] of g.boards.entries()) {b.round=1;b.monsters=[{id:10+i,p:.125,hp:1e7,maxHp:1e7,speed:.023,family:0,defenses:[],slow:0,stun:0,shred:0,poison:0}];}
  return {g,c,m:g.boards[0].monsters[0]};
}

test('all damage champion types placed at center approach and attack in single, coop and versus',()=>{
  for(const mode of ['single','coop','versus'])for(const def of CHAMPIONS.filter(c=>c.type!==9)){
    const {g,c,m}=setup(def.id,mode);
    for(let n=0;n<400;n++){tick(g,.05);assert.ok(c.x>=140&&c.x<=660&&c.y>=140&&c.y<=660);}
    assert.ok(m.hp<m.maxHp,`${mode} ${def.name} never attacked`);
    if(mode==='versus')assert.equal(g.boards[1].monsters[0].hp,1e7);
  }
});
test('manual move orders take priority over automatic pursuit',()=>{
  const {g,c}=setup(2);action(g,'a',{type:'move',id:1,x:600,y:600});tick(g,.05);
  assert.ok(c.x>400&&c.y>400);assert.equal(c.combatState,'moving');assert.equal(c.approach,undefined);
});
test('hold position does not move, enabling approach resumes combat; other players cannot toggle it',()=>{
  const {g,c,m}=setup(2,'coop');action(g,'a',{type:'autoApproach',id:1,enabled:false});
  for(let n=0;n<40;n++)tick(g,.05);
  assert.equal(c.x,400);assert.equal(c.y,400);assert.equal(c.combatState,'range');assert.equal(m.hp,m.maxHp);
  assert.ok(action(g,'b',{type:'autoApproach',id:1,enabled:true}));assert.equal(c.autoApproach,false);
  action(g,'a',{type:'autoApproach',id:1,enabled:true});for(let n=0;n<200;n++)tick(g,.05);assert.ok(m.hp<m.maxHp);
});
test('resistant targets still trigger pursuit and receive reduced damage',()=>{const {g,c,m}=setup(2);m.defenses=['물리저항'];for(let n=0;n<400;n++)tick(g,.05);assert.ok(m.hp<m.maxHp);assert.notEqual(c.combatState,'immune');});

test('approach continues during cooldown and pause freezes all combat movement',()=>{
  const {g,c}=setup(2);c.cd=3;tick(g,.05);assert.ok(c.y<400);assert.ok(c.cd>2);
  action(g,'a',{type:'pause'});const frozen=structuredClone(g);tick(g,2);assert.deepEqual(g,frozen);
});
test('in-range champions keep their placement while firing',()=>{
  const {g,c,m}=setup(2);c.y=145;const x=c.x,y=c.y;tick(g,.05);
  assert.equal(c.x,x);assert.equal(c.y,y);assert.ok(m.hp<m.maxHp);
});
test('all 100 rounds map to ten distinct consecutive ten-round regions',()=>{
  assert.equal(MAPS.length,10);assert.equal(new Set(MAPS.map(m=>m.name)).size,10);
  for(let round=1;round<=100;round++){const m=mapForRound(round);assert.equal(m.index,Math.floor((round-1)/10));assert.ok(round>=m.first&&round<=m.last);}
  assert.equal(mapForRound(0),MAPS[0]);assert.equal(mapForRound(101),MAPS[9]);
});
