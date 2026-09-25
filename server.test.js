import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('HTTP sessions, 2/4-player rooms, authority checks, SSE and reconnection',async()=>{
 const port=33000+Math.floor(Math.random()*10000),child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),8000).unref())]);
 const base=`http://localhost:${port}`;
 async function request(path,body,cookie){const res=await fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};}
 async function snapshot(cookie){const res=await fetch(base+'/api/events',{headers:{cookie}});const reader=res.body.getReader();let text='';while(!text.includes('\n\n')){const chunk=await reader.read();text+=new TextDecoder().decode(chunk.value);}await reader.cancel();return JSON.parse(text.slice(6,text.indexOf('\n\n')));}
 assert.equal((await request('rooms')).status,401);
 const clients=[];for(let i=0;i<4;i++)clients.push(await request('login',{name:'Test '+i}));
 for(const mode of ['coop','versus'])for(const capacity of [2,4]){const r=await request('rooms',{mode,capacity,random:true,hard:5},clients[0].cookie);assert.equal(r.status,200);assert.equal((await request('action',{type:'launch'},clients[0].cookie)).status,400);for(let i=1;i<capacity;i++)assert.equal((await request('join',{id:r.data.id},clients[i].cookie)).status,200);assert.equal((await request('action',{type:'launch'},clients[1].cookie)).status,400);assert.equal((await request('action',{type:'launch'},clients[0].cookie)).status,200);const snap=await snapshot(clients[0].cookie);assert.equal(snap.game.boards.length,mode==='coop'?1:capacity);assert.equal(snap.game.hard,5);assert.equal(snap.game.players.length,capacity);await request('action',{type:'draw',kind:'hero'},clients[0].cookie);const drawn=await snapshot(clients[0].cookie);assert.equal(drawn.game.players[0].gold,30);assert.equal((await request('me',undefined,clients[0].cookie)).data.room,r.data.id);assert.equal((await request('action',{type:'start'},clients[1].cookie)).status,403);await request('action',{type:'start'},clients[0].cookie);assert.equal((await snapshot(clients[0].cookie)).game.round,1);for(let i=0;i<capacity;i++)await request('leave',{},clients[i].cookie);}
 const bad=await fetch(base+'/api/rooms',{method:'POST',headers:{cookie:clients[0].cookie,origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});assert.equal(bad.status,403);
 assert.equal((await fetch(base+'/.git/config')).status,404);
 }finally{child.kill();await once(child,'exit');}
});
