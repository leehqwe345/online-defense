import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('HTTP sessions, 2/3/4-player rooms, authority checks, SSE and reconnection',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...publicKey.export({format:'jwk'}),kid:'test-key'};
 const credential=i=>{const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url'),body=Buffer.from(JSON.stringify({sub:'test-'+i,name:'Test '+i,aud:'test-client',iss:'https://accounts.google.com',exp:Math.floor(Date.now()/1000)+600})).toString('base64url');return head+'.'+body+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+body),privateKey).toString('base64url');};
 const dataDir=await mkdtemp(join(tmpdir(),'loop-http-'));
 const port=33000+Math.floor(Math.random()*10000),child=spawn(process.execPath,['--import','./qa/google-auth-fixture.mjs','server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dataDir,DATABASE_URL:"",RENDER:"",GOOGLE_CLIENT_ID:"test-client",TEST_GOOGLE_JWK:JSON.stringify(jwk)},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),8000).unref())]);
 const base=`http://localhost:${port}`;
 async function request(path,body,cookie){const res=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 async function snapshot(cookie){const res=await fetch(base+'/api/events',{headers:{cookie}});const reader=res.body.getReader();let text='';while(!text.includes('\n\n')){const chunk=await reader.read();text+=new TextDecoder().decode(chunk.value);}await reader.cancel();return JSON.parse(text.slice(6,text.indexOf('\n\n')));}
 assert.equal((await request('rooms')).status,401);
 assert.equal((await request('login',{name:'guest'})).status,401);
 assert.notEqual((await request('login',{credential:'invalid'})).status,200);
 const clients=[];for(let i=0;i<4;i++){const c=await request('login',{credential:credential(i)});assert.equal(c.status,200);clients.push(c);if(c.data.user.needsNickname){assert.equal((await request('rooms',{mode:'single'},c.cookie)).status,403);assert.equal((await request('nickname',{name:'테스트'+port+i},c.cookie)).status,200);}}
 for(const mode of ['coop','versus'])for(const capacity of [2,3,4]){const r=await request('rooms',{mode,capacity,random:true,hard:5},clients[0].cookie);assert.equal(r.status,200);assert.equal((await request('action',{type:'launch'},clients[0].cookie)).status,400);for(let i=1;i<capacity;i++)assert.equal((await request('join',{id:r.data.id},clients[i].cookie)).status,200);assert.equal((await request('action',{type:'launch'},clients[1].cookie)).status,400);assert.equal((await request('action',{type:'launch'},clients[0].cookie)).status,200);const snap=await snapshot(clients[0].cookie);assert.equal(snap.game.boards.length,mode==='coop'?capacity+1:capacity);assert.equal(snap.game.hard,5);assert.equal(snap.game.players.length,capacity);await request('action',{type:'draw',kind:'hero'},clients[0].cookie);const drawn=await snapshot(clients[0].cookie);assert.equal(drawn.game.players[0].gold,30);assert.equal((await request('me',undefined,clients[0].cookie)).data.room,r.data.id);assert.equal((await request('action',{type:'start'},clients[1].cookie)).status,403);await request('action',{type:'start'},clients[0].cookie);const countdown=await snapshot(clients[0].cookie);assert.equal(countdown.game.status,'countdown');assert.equal(countdown.game.round,0);if(mode==='coop'&&capacity===2){const deadline=Date.now()+7000;let started;do{await new Promise(resolve=>setTimeout(resolve,250));started=(await snapshot(clients[0].cookie)).game;}while(started.round===0&&Date.now()<deadline);assert.equal(started.round,1);}for(let i=0;i<capacity;i++)await request('leave',{},clients[i].cookie);}
 const lobby=await request('rooms',{mode:'coop',capacity:3},clients[0].cookie);
 await request('join',{id:lobby.data.id},clients[1].cookie);
 assert.equal((await request('lobby-card',{card:14},clients[1].cookie)).status,200);
 assert.equal((await snapshot(clients[0].cookie)).room.players[1].lobbyCard,14);
 assert.equal((await request('lobby-card',{card:15},clients[1].cookie)).status,400);
 assert.equal((await request('lobby-settings',{capacity:4},clients[1].cookie)).status,403);
 assert.equal((await request('lobby-settings',{capacity:4,mode:'versus',random:true,hard:2},clients[0].cookie)).status,200);
 let changed=await snapshot(clients[1].cookie);assert.equal(changed.room.capacity,4);assert.equal(changed.room.mode,'versus');assert.equal(changed.room.hard,2);
 await request('join',{id:lobby.data.id},clients[2].cookie);
 assert.equal((await request('lobby-settings',{capacity:2},clients[0].cookie)).status,400);
 assert.equal((await request('lobby-chat',{text:''},clients[1].cookie)).status,400);
 assert.equal((await request('lobby-chat',{text:'보스 같이 잡아요 <test>'},clients[1].cookie)).status,200);
 changed=await snapshot(clients[0].cookie);assert.equal(changed.room.messages.at(-1).text,'보스 같이 잡아요 <test>');
 assert.equal((await request('lobby-chat',{text:'too fast'},clients[1].cookie)).status,429);
 await request('leave',{},clients[0].cookie);changed=await snapshot(clients[1].cookie);assert.equal(changed.room.host,changed.room.players[0].id);
 assert.equal((await request('lobby-settings',{capacity:2},clients[1].cookie)).status,200);
 await request('action',{type:'launch'},clients[1].cookie);
 assert.equal((await request('lobby-settings',{hard:1},clients[1].cookie)).status,403);
 assert.equal((await request('lobby-chat',{text:'after launch'},clients[1].cookie)).status,400);
 await request('leave',{},clients[1].cookie);await request('leave',{},clients[2].cookie);
 const bad=await fetch(base+'/api/rooms',{method:'POST',headers:{cookie:clients[0].cookie,origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,403);
 assert.equal((await fetch(base+'/.git/config')).status,404);
 }finally{child.kill();await once(child,'exit');}
});
