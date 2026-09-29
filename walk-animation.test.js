import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWalk, ArenaRenderer} from './renderer.js';

test('walking cycles through eight frames by distance and retains direction vertically',()=>{
  let c={x:100,y:100,destination:{x:400,y:400}};
  let s=advanceWalk(null,c,0,'playing');
  const seen=new Set();
  for(let i=1;i<=8;i++){c.x+=8;s=advanceWalk(s,c,i*.05,'playing');seen.add(s.frame);assert.ok(s.moving);}
  assert.equal(seen.size,8);
  c.x-=8;s=advanceWalk(s,c,.5,'playing');assert.equal(s.facing,-1);
  c.y+=8;s=advanceWalk(s,c,.55,'playing');assert.equal(s.facing,-1);
});

test('blocked orders stop walking; pause freezes; preparation teleports never walk',()=>{
  let c={x:100,y:100,destination:{x:400,y:400}};
  let s=advanceWalk(null,c,0,'playing');assert.equal(s.moving,false);
  c.x+=8;s=advanceWalk(s,c,.05,'playing');
  const paused=advanceWalk(s,c,20,'paused');assert.deepEqual(paused,s);
  s=advanceWalk(s,c,.25,'playing');assert.equal(s.moving,false);
  s=advanceWalk(s,{...c,x:400},.3,'ready');assert.equal(s.moving,false);
});

test('renderer uses walking frames while moving and attack frames only after stopping',()=>{
  const attack=Array.from({length:8},(_,i)=>({kind:'attack',i,width:500,height:500,bodyHeight:400,anchorY:.9}));
  const walk=Array.from({length:8},(_,i)=>({kind:'walk',i,width:400,height:400,bodyHeight:320,anchorY:.9}));
  const r=Object.create(ArenaRenderer.prototype);
  Object.assign(r,{walkStates:new Map(),attacks:new Map(),clock:0,verticalScale:.575,current:{status:'playing'},art:{attackFrames:[attack],walkFrames:[walk],characters:[attack[7]]}});
  const draws=[],ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args);}};
  const c={id:1,base:0,tier:0,x:100,y:100,equipment:{},destination:{x:400,y:100}};
  r.drawCharacterSprite(ctx,c,0);assert.equal(draws.at(-1)[0].kind,'attack');
  r.clock=.05;c.x+=16;r.drawCharacterSprite(ctx,c,0);assert.equal(draws.at(-1)[0].kind,'walk');
  r.current.status='paused';r.drawCharacterSprite(ctx,c,0);assert.equal(draws.at(-1)[0].kind,'walk');
  r.current.status='playing';r.clock=.3;delete c.destination;
  r.attacks.set(c.id,{start:.3,x:c.x,y:c.y,tx:400,ty:100});
  r.drawCharacterSprite(ctx,c,0);assert.equal(draws.at(-1)[0].kind,'attack');assert.equal(draws.at(-1)[0].i,0);
});
