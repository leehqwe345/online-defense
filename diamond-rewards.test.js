import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGame,tick} from './engine.js';
import {openAccountStore} from './account-store.mjs';
function game(mode,round){const g=createGame([{id:'g_a',name:'A'},{id:'g_b',name:'B'}],{mode});g.status='playing';g.round=round;g.boards.forEach(b=>b.round=round);g.diamondRounds=Array.from({length:Math.max(0,round-20)},(_,i)=>20+i);return g;}
test('coop pays each player once starting at cleared wave 20',()=>{const g=game('coop',20);tick(g,.01);assert.deepEqual(g.diamondRewards.map(r=>r.amount),[1,1]);tick(g,.01);assert.equal(g.diamondRewards.length,2);const low=game('coop',19);tick(low,.01);assert.equal(low.diamondRewards.length,0);});
test('timer advance does not reward uncleared coop wave',()=>{const g=game('coop',20);g.time=61;g.boards[0].spawn=[{at:999,round:20}];tick(g,.01);assert.equal(g.round,21);assert.equal(g.diamondRewards.length,0);});
test('versus at 20 rewards survivor 30 and eliminated player 10',()=>{const g=game('versus',20);g.boards[1].monsters=Array.from({length:100},()=>({hp:1,boss:false}));g.boards[0].spawn=[{at:999,round:20}];tick(g,.01);assert.equal(g.diamondRewards.find(r=>r.accountId==='g_a').amount,30);assert.equal(g.diamondRewards.find(r=>r.accountId==='g_b').amount,10);tick(g,.01);assert.equal(g.diamondRewards.length,2);const low=game('versus',19);low.players[1].alive=false;tick(low,.01);assert.equal(low.diamondRewards.length,0);});
test('diamond retries and concurrent saves are idempotent and persist on restart',async()=>{const dir=await mkdtemp(join(tmpdir(),'loop-diamonds-'));let s=await openAccountStore({dir,databaseUrl:'',render:false});const rewards=[{key:'coop:20',accountId:'g_a',amount:1},{key:'versus',accountId:'g_b',amount:30}];await Promise.all([s.grantDiamonds('battle',rewards),s.grantDiamonds('battle',rewards)]);assert.equal(await s.diamonds('g_a'),1);assert.equal(await s.diamonds('g_b'),30);await s.close();s=await openAccountStore({dir,databaseUrl:'',render:false});assert.equal(await s.diamonds('g_b'),30);assert.equal((await s.exportData()).diamonds.length,2);await s.close();});
