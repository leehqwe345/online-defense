import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openAccountStore} from './account-store.mjs';
import {recordDamage,updateDps} from './engine.js';
test('normal DPS excludes boss damage and boss damage stays cumulative',()=>{const c={};recordDamage(c,100,1);recordDamage(c,500,1,true);updateDps({time:2,players:[{champions:[c]}]});assert.equal(c.dps,20);assert.equal(c.bossDamage,500);updateDps({time:10,players:[{champions:[c]}]});assert.equal(c.dps,0);assert.equal(c.bossDamage,500);});
test('sessions survive reopening; rankings include only personal best',async()=>{const dir=await mkdtemp(join(tmpdir(),'loop-session-'));let store;try{store=await openAccountStore({dir,autoImport:false,databaseUrl:null,render:false});await store.ensureProfile('g_test');await store.saveSession('abc123','g_test');await store.close();store=await openAccountStore({dir,autoImport:false,databaseUrl:null,render:false});assert.equal((await store.restoreSession('abc123')).id,'g_test');assert.equal(await store.restoreSession('wrong'),null);const r={accountId:'g_test',name:'테스트',mode:'single',hard:0,random:false,round:20,kills:40,seconds:100,date:new Date().toISOString()};await store.recordBattle('one',[r]);await store.recordBattle('two',[{...r,round:30}]);const rows=await store.rankings();assert.equal(rows.length,1);assert.equal(rows[0].round,30);assert.equal((await store.history('g_test')).length,2);await store.revokeSessions('g_test');assert.equal(await store.restoreSession('abc123'),null);}finally{await store?.close();await rm(dir,{recursive:true,force:true});}});
