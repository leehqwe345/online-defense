import test from 'node:test';
import assert from 'node:assert/strict';
import {MonsterVisuals} from './monster-visuals.js';
test('all boss poses use identical scale and anchor, including attack on low graphics',()=>{
  for(let variant=0;variant<14;variant++){
    const frames=Array.from({length:4},()=>({width:340,height:300,bodyHeight:240,anchorY:.9}));
    const calls=[],ctx={save(){},restore(){},scale(){},drawImage(...args){calls.push(args)}};
    const visuals=new MonsterVisuals({bossAttackFrames:Array.from({length:14},()=>frames)});visuals.showEffects=false;
    for(const age of [-1,.01,.16,.31,.46,.61])visuals.sprite(ctx,{boss:true,bossVariant:variant},180,0,null,age);
    for(const call of calls)assert.deepEqual(call.slice(1),calls[0].slice(1));
    assert.equal(calls[3][0],frames[2]);assert.equal(calls[5][0],frames[0]);
  }
});
test('boss hits do not stretch or squash the body',()=>{
  const scales=[],ctx=new Proxy({measureText:()=>({width:10}),scale:(x,y)=>scales.push([x,y])},{get:(o,k)=>o[k]||(()=>{})});
  const visuals=new MonsterVisuals({reactions:[],bossAttackFrames:[[{width:100,height:100,bodyHeight:80,anchorY:.9}]]});
  visuals.hits.set('0:1',{start:0,dx:1,dy:0});
  visuals.drawMonster(ctx,{id:1,boss:true,worldBoss:true,bossVariant:0,family:0,hp:100,maxHp:100,p:0,speed:0},0,200,200,.1,false);
  assert.ok(scales.every(([x,y])=>Math.abs(x)===1&&y===1));
});
