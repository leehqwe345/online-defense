import {mkdir,readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
export class AccountError extends Error{constructor(message,status=409){super(message);this.status=status;}}
export function normalizedNickname(value){const name=typeof value==='string'?value.normalize('NFC').trim():'';if(!/^[가-힣a-zA-Z0-9]{2,12}$/.test(name))throw new AccountError('닉네임은 한글·영문·숫자 2~12자로 입력하세요.',400);return name;}
const schema=[
`CREATE TABLE IF NOT EXISTS account_profiles (id TEXT PRIMARY KEY, nickname TEXT, nickname_key TEXT UNIQUE, lobby_card INTEGER NOT NULL DEFAULT 0 CHECK(lobby_card BETWEEN 0 AND 14), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS battle_results (id TEXT PRIMARY KEY, account_id TEXT, name TEXT NOT NULL, mode TEXT NOT NULL, hard INTEGER NOT NULL, random INTEGER NOT NULL, round INTEGER NOT NULL, kills INTEGER NOT NULL, seconds INTEGER NOT NULL, date TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS battle_rank_idx ON battle_results(round DESC,hard DESC,kills DESC)`,
`CREATE INDEX IF NOT EXISTS battle_account_idx ON battle_results(account_id,date DESC)`,
`CREATE TABLE IF NOT EXISTS storage_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`];
export async function openAccountStore({databaseUrl=process.env.DATABASE_URL,dir=process.env.DATA_DIR||'data',render=process.env.RENDER,autoImport=true}={}){
 if(render&&!databaseUrl)throw new Error('Render에서는 DATABASE_URL 설정이 필요합니다. 임시 디스크로 계정 데이터를 저장하지 않습니다.');
 let query,close,backup,transaction,kind;
 if(databaseUrl){const {Pool}=await import('pg');const pool=new Pool({connectionString:databaseUrl,max:5,connectionTimeoutMillis:5000,statement_timeout:10000});pool.on('error',()=>console.error('Account database connection error'));query=async(sql,args=[])=>{const r=await pool.query(sql,args);return r.rows;};transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(async(sql,args=[])=>{const r=await c.query(sql,args);return r.rows;});await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};close=()=>pool.end();kind='postgres';
 }else{const {DatabaseSync,backup:sqliteBackup}=await import('node:sqlite');await mkdir(dir,{recursive:true});const db=new DatabaseSync(resolve(dir,'accounts.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');const raw=async(sql,args=[])=>db.prepare(sql.replace(/\$\d+/g,'?')).all(...args);let tail=Promise.resolve();query=(...args)=>{const work=tail.then(()=>raw(...args));tail=work.catch(()=>{});return work;};transaction=fn=>{const work=tail.then(async()=>{db.exec('BEGIN IMMEDIATE');try{const result=await fn(raw);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}});tail=work.catch(()=>{});return work;};close=async()=>{await tail;db.close();};backup=async path=>{await tail;await mkdir(dirname(path),{recursive:true});await sqliteBackup(db,path);};kind='sqlite';}
 try{for(const sql of schema)await query(sql);}catch(e){await close();throw e;}
 const now=()=>new Date().toISOString();
 const store={kind,close,backup,
 async exportData(){return transaction(async q=>{const p=await q('SELECT id,nickname,lobby_card FROM account_profiles');const r=await q('SELECT id,account_id,name,mode,hard,random,round,kills,seconds,date FROM battle_results ORDER BY date');return {profiles:Object.fromEntries(p.map(p=>[p.id,{nickname:p.nickname,lobbyCard:p.lobby_card}])),rankings:r.map(r=>({...r,accountId:r.account_id,random:!!r.random}))};});},
 async getProfile(id){const rows=await query('SELECT * FROM account_profiles WHERE id=$1',[id]);const p=rows[0];return p?{id:p.id,nickname:p.nickname,lobbyCard:p.lobby_card}:null;},
 async ensureProfile(id){const date=now();await query('INSERT INTO account_profiles(id,created_at,updated_at) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[id,date,date]);return store.getProfile(id);},
 async nicknameAvailable(id,value){const name=normalizedNickname(value);const r=await query('SELECT id FROM account_profiles WHERE nickname_key=$1 AND id<>$2',[name.toLowerCase(),id]);return !r.length;},
 async setNickname(id,value){const name=normalizedNickname(value);try{const rows=await query('UPDATE account_profiles SET nickname=$1,nickname_key=$2,updated_at=$3 WHERE id=$4 AND nickname IS NULL RETURNING id',[name,name.toLowerCase(),now(),id]);if(!rows.length)throw new AccountError('이미 닉네임을 생성했거나 계정을 찾을 수 없습니다.');}catch(e){if(e.code==='23505'||String(e.message).includes('UNIQUE constraint'))throw new AccountError('이미 사용 중인 닉네임입니다.');throw e;}return store.getProfile(id);},
 async setCard(id,card){if(!Number.isInteger(card)||card<0||card>=15)throw new AccountError('올바른 캐릭터 카드를 선택하세요.',400);const r=await query('UPDATE account_profiles SET lobby_card=$1,updated_at=$2 WHERE id=$3 RETURNING id',[card,now(),id]);if(!r.length)throw new AccountError('계정을 찾을 수 없습니다.',404);return store.getProfile(id);},
 async rankings(){return (await query('SELECT name,mode,hard,random,round,kills,seconds,date FROM battle_results ORDER BY round DESC,hard DESC,kills DESC,date DESC LIMIT 200')).map(r=>({...r,random:!!r.random}));},
 async history(id){return (await query('SELECT name,mode,hard,random,round,kills,seconds,date FROM battle_results WHERE account_id=$1 ORDER BY date DESC LIMIT 50',[id])).map(r=>({...r,random:!!r.random}));},
 async recordBattle(battleId,records){await transaction(async q=>{for(const r of records)await insertResult(q,battleId+':'+r.accountId,r);});}
 };
 async function insertResult(q,id,r){await q('INSERT INTO battle_results(id,account_id,name,mode,hard,random,round,kills,seconds,date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING',[id,r.accountId||null,r.name,r.mode,r.hard,r.random?1:0,r.round,r.kills,r.seconds,r.date]);}
 store.importLegacy=async()=>{
 const done=await query('SELECT id FROM storage_migrations WHERE id=$1',['legacy-json-v1']);if(done.length)return;
 const read=async file=>{try{return JSON.parse(await readFile(resolve(dir,file),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw new Error('기존 '+file+' 파일을 읽을 수 없습니다. 원본 확인 후 다시 시작하세요.');}};
 const profiles=await read('profiles.json'),rankings=await read('rankings.json');if(profiles!==null&&(typeof profiles!=='object'||Array.isArray(profiles)))throw Error('profiles.json 형식 오류');if(rankings!==null&&!Array.isArray(rankings))throw Error('rankings.json 형식 오류');
 await transaction(async q=>{for(const [id,p]of Object.entries(profiles||{})){if(!id.startsWith('g_'))continue;const nickname=p.nickname?normalizedNickname(p.nickname):null;const card=p.lobbyCard??0;if(!Number.isInteger(card)||card<0||card>14)throw Error('기존 카드 값 오류');await q('INSERT INTO account_profiles(id,nickname,nickname_key,lobby_card,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[id,nickname,nickname?.toLowerCase()||null,card,now(),now()]);}for(const [i,r]of (rankings||[]).entries()){if(!r||typeof r.name!=='string'||!['single','coop','versus'].includes(r.mode)||!['hard','round','kills','seconds'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||typeof r.date!=='string')throw Error('기존 전투 기록 형식 오류');const key=createHash('sha256').update(JSON.stringify([i,r])).digest('hex');await insertResult(q,r.id||'legacy:'+key,r);}await q('INSERT INTO storage_migrations(id,applied_at) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',['legacy-json-v1',now()]);});
 };
 try{if(autoImport)await store.importLegacy();return store;}catch(e){await close();throw e;}
}
