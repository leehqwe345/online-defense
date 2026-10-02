import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,action,tick,damage} from './engine.js';
const hero=(id=1,base=0)=>({id,base,tier:0,x:400,y:140,cd:0,equipment:{}});
function battle(c){const g=createGame([{id:'a'}]);g.status='playing';g.round=1;g.boards[0].round=1;g.players[0].champions=[c];g.boards[0].monsters=[{id:900,family:0,p:.12,hp:1e6,maxHp:1e6,speed:.02,defenses:[],slow:0,stun:0,shred:0,poison:0}];return g;}
test('slow equipment strength and tier affect actual movement; strongest slow survives weaker hits',()=>{
 for(const tier of [0,2]){const c=hero();c.equipment={2:{base:28,tier}};const g=battle(c),m=g.boards[0].monsters[0];tick(g,.05);c.cd=100;const start=m.p;tick(g,.05);assert.ok(Math.abs((m.p-start)/(.02*.05)-(1-.18*1.6**tier))<1e-8);}
 const c=hero();c.equipment={2:{base:28,tier:3}};const g=battle(c),m=g.boards[0].monsters[0];tick(g,.05);const strength=m.slowAmount;c.equipment[2].tier=0;c.cd=0;tick(g,.05);assert.equal(m.slowAmount,strength);
});
test('weaker poison cannot steal damage ownership from stronger poison',()=>{const c=hero(1,7),g=battle(c),m=g.boards[0].monsters[0];m.poison=1000;m.poisonOwner='original';m.poisonSource=88;tick(g,.05);assert.equal(m.poison,1000);assert.equal(m.poisonOwner,'original');assert.equal(m.poisonSource,88);});
test('full bag rejects unequip and champion merge without losing equipment or champions',()=>{
 const g=createGame([{id:'a'}]),p=g.players[0],c=hero(),other=hero(2);c.equipment={0:{id:3,base:0,tier:0}};other.equipment={1:{id:4,base:10,tier:0}};p.champions=[c,other];p.items=Array.from({length:80},(_,i)=>({id:100+i,base:0,tier:0}));
 assert.match(action(g,'a',{type:'unequip',id:1,slot:0}),/80/);assert.ok(c.equipment[0]);assert.equal(p.items.length,80);
 assert.match(action(g,'a',{type:'merge',kind:'hero',id:1}),/80/);assert.equal(p.champions.length,2);assert.equal(c.tier,0);
 p.items.pop();assert.equal(action(g,'a',{type:'merge',kind:'hero',id:1}),undefined);assert.equal(c.tier,1);assert.equal(p.items.length,80);
});
