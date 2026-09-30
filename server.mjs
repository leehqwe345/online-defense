import {openAccountStore,AccountError,normalizedNickname} from './account-store.mjs';
import {loadEnvFile} from 'node:process';

try{loadEnvFile(new URL('./.env',import.meta.url));}catch(error){if(error.code!=='ENOENT')throw error;}

import {gameForPlayer} from './game-view.js';
import {stepGame} from './gameplay.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,createPublicKey,verify} from 'node:crypto';
import {createGame,action,tick,advanceStartCountdown,CHAMPIONS} from './engine.js';

const port=Number(process.env.PORT)||3000;
const clientId=process.env.GOOGLE_CLIENT_ID||'';

const sessions=new Map(),rooms=new Map();
const accountStore=await openAccountStore();
const pendingResults=new Set();

const id=()=>randomBytes(16).toString('hex');

const json=(res,status,data)=>{
  res.writeHead(status,{
    'Content-Type':'application/json',
    'Cache-Control':'no-store'
  });
  res.end(JSON.stringify(data));
};

let keys=[],keyUntil=0;

async function verifyGoogle(token){
  const parts=String(token).split('.');

  if(parts.length!==3)
    throw Error('잘못된 로그인 응답');

  const header=JSON.parse(
    Buffer.from(parts[0],'base64url')
  );

  const claims=JSON.parse(
    Buffer.from(parts[1],'base64url')
  );

  if(header.alg!=='RS256')
    throw Error('지원하지 않는 서명');

  if(Date.now()>keyUntil){
    const r=await fetch(
      'https://www.googleapis.com/oauth2/v3/certs'
    );

    if(!r.ok)
      throw Error('Google 인증 서버 오류');

    keys=(await r.json()).keys;
    keyUntil=Date.now()+3600000;
  }

  const key=keys.find(k=>k.kid===header.kid);

  if(
    !key ||
    !verify(
      'RSA-SHA256',
      Buffer.from(parts[0]+'.'+parts[1]),
      createPublicKey({key,format:'jwk'}),
      Buffer.from(parts[2],'base64url')
    ) ||
    claims.aud!==clientId ||
    ![
      'https://accounts.google.com',
      'accounts.google.com'
    ].includes(claims.iss) ||
    !Number.isFinite(claims.exp) ||
    claims.exp*1000<Date.now() ||
    !claims.sub
  ){
    throw Error('Google 인증 검증 실패');
  }

  return claims;
}

function summary(r){
  return {
    id:r.id,
    name:r.name,
    mode:r.options.mode,
    random:r.options.random,
    hard:r.options.hard,
    capacity:r.capacity,

    players:r.users.map(u=>({
      id:u.id,
      name:u.name,
      lobbyCard:u.lobbyCard??0
    })),

    host:r.users[0]?.id,
    messages:r.messages||[],
    status:r.game?.status||'waiting'
  };
}

function send(r){
  for(const [uid,res] of r.streams){
    if(res.writableLength>1000000){
      res.destroy();
      r.streams.delete(uid);
    }else{
      res.write(
        `data: ${JSON.stringify({
          room:summary(r),
          game:gameForPlayer(r.game,uid)
        })}\n\n`
      );
    }
  }
}

function leave(user){
  const r=rooms.get(user.room);

  if(!r)return;

  const stream=r.streams.get(user.id);

  if(stream){
    stream.end();
    r.streams.delete(user.id);
  }

  if(r.game&&r.game.status!=='ended'){
    r.game.status='ended';
    r.game.message='플레이어가 퇴장하여 게임이 종료되었습니다.';
    r.cancelled=true;
  }

  r.users=r.users.filter(u=>u.id!==user.id);
  user.room=null;

  if(!r.users.length){
    if(
      r.game?.status==='ended' &&
      !r.cancelled &&
      !r.recorded &&
      !r.recording
    ){
      persistBattle(r);
    }

    if(!r.game||r.cancelled||r.recorded)
      rooms.delete(r.id);

  }else{
    send(r);
  }
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');

    if(req.method==='POST'){
      const origin=req.headers.origin;

      const forwardedProto=String(
        req.headers['x-forwarded-proto']||''
      ).split(',')[0].trim();

      const expectedOrigin=
        process.env.PUBLIC_ORIGIN ||
        `${forwardedProto||'http'}://${req.headers.host}`;

      if(origin&&origin!==expectedOrigin){
        return json(
          res,
          403,
          {error:'다른 출처의 요청은 허용되지 않습니다.'}
        );
      }
    }

    let token=req.headers.cookie
      ?.match(/(?:^|; )session=([a-f0-9]+)/)?.[1];

    let user=sessions.get(token);

    if(user&&Date.now()-user.seen>86400000){
      sessions.delete(token);
      user=null;
    }

    if(user)
      user.seen=Date.now();

    let body={};

    if(req.method==='POST'){
      let chunks='',size=0;

      for await(const chunk of req){
        size+=chunk.length;

        if(size>16000){
          return json(
            res,
            413,
            {error:'요청이 너무 큽니다.'}
          );
        }

        chunks+=chunk;
      }

      body=JSON.parse(chunks||'{}');
    }

    if(url.pathname==='/api/config'){
      return json(res,200,{clientId});
    }

    if(
      url.pathname==='/api/login' &&
      req.method==='POST'
    ){
      if(
        typeof body.credential!=='string' ||
        !body.credential.trim()
      ){
        return json(
          res,
          401,
          {
            error:
              'Google 계정으로 로그인하세요. 게스트 로그인은 지원하지 않습니다.'
          }
        );
      }

      if(sessions.size>5000){
        return json(
          res,
          503,
          {error:'서버가 혼잡합니다.'}
        );
      }

      let uid=id();
      let google=false;

      if(body.credential){
        if(!clientId){
          return json(
            res,
            503,
            {
              error:
                'Google 클라이언트 ID가 설정되지 않았습니다.'
            }
          );
        }

        const c=await verifyGoogle(body.credential);

        uid='g_'+c.sub;
        google=true;
      }

      const profile=
        await accountStore.ensureProfile(uid);

      if(user)
        leave(user);

      for(const [k,s] of sessions){
        if(s.id===uid){
          leave(s);
          sessions.delete(k);
        }
      }

      token=id();

      user={
        id:uid,
        name:profile.nickname||'수호자',
        needsNickname:!profile.nickname,
        google,
        lobbyCard:profile.lobbyCard??0,
        seen:Date.now(),
        room:null
      };

      sessions.set(token,user);

      res.setHeader(
        'Set-Cookie',
        `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${
          process.env.PUBLIC_ORIGIN?.startsWith('https:')
            ?'; Secure'
            :''
        }`
      );

      return json(
        res,
        200,
        {
          user:{
            id:user.id,
            name:user.name,
            needsNickname:user.needsNickname,
            google
          }
        }
      );
    }

    if(url.pathname==='/api/me'){
      return json(
        res,
        200,
        {
          user:user
            ?{
                id:user.id,
                name:user.name,
                needsNickname:user.needsNickname,
                google:user.google
              }
            :null,

          room:
            user?.room&&rooms.has(user.room)
              ?user.room
              :null
        }
      );
    }

    if(url.pathname==='/api/rankings'){
      return json(
        res,
        200,
        (await accountStore.rankings()).slice(0,50)
      );
    }

    if(
      url.pathname.startsWith('/api/') &&
      (!user||!user.google)
    ){
      return json(
        res,
        401,
        {error:'먼저 로그인하세요.'}
      );
    }

    if(
      ['/api/nickname-check','/api/nickname']
        .includes(url.pathname) &&
      req.method==='POST'
    ){
      const name=normalizedNickname(body.name);

      if(url.pathname==='/api/nickname-check'){
        return json(
          res,
          200,
          {
            available:
              await accountStore.nicknameAvailable(
                user.id,
                name
              )
          }
        );
      }

      const profile=
        await accountStore.setNickname(
          user.id,
          name
        );

      user.name=profile.nickname;
      user.needsNickname=false;

      return json(
        res,
        200,
        {
          user:{
            id:user.id,
            name:user.name,
            google:true,
            needsNickname:false
          }
        }
      );
    }

    if(url.pathname==='/api/account-history'){
      return json(
        res,
        200,
        await accountStore.history(user.id)
      );
    }

    if(
      user?.needsNickname &&
      ['/api/rooms','/api/join','/api/action']
        .includes(url.pathname) &&
      req.method==='POST'
    ){
      return json(
        res,
        403,
        {error:'닉네임을 먼저 생성하세요.'}
      );
    }

    if(
      url.pathname==='/api/rooms' &&
      req.method==='GET'
    ){
      return json(
        res,
        200,
        [...rooms.values()]
          .filter(
            r=>r.options.mode!=='single'
          )
          .map(summary)
      );
    }

    if(
      url.pathname==='/api/rooms' &&
      req.method==='POST'
    ){
      if(rooms.size>=100){
        return json(
          res,
          503,
          {error:'방이 가득 찼습니다.'}
        );
      }

      leave(user);

      const mode=
        ['single','coop','versus']
          .includes(body.mode)
          ?body.mode
          :'single';

      const r={
        id:id().slice(0,8),
        battleId:id(),
        name:`${user.name}의 방`,

        capacity:
          mode==='single'
            ?1
            :[2,3,4].includes(body.capacity)
              ?body.capacity
              :2,

        options:{
          mode,
          random:!!body.random,
          hard:Math.max(
            0,
            Math.min(
              5,
              Math.floor(Number(body.hard)||0)
            )
          )
        },

        users:[user],
        streams:new Map(),
        game:null,
        created:Date.now()
      };

      if(mode==='single'){
        r.game=createGame(
          r.users,
          r.options
        );
      }

      rooms.set(r.id,r);
      user.room=r.id;

      return json(
        res,
        200,
        summary(r)
      );
    }

    if(
      url.pathname==='/api/join' &&
      req.method==='POST'
    ){
      const r=rooms.get(body.id);

      if(
        !r ||
        r.game ||
        r.users.length>=r.capacity
      ){
        return json(
          res,
          400,
          {error:'입장할 수 없는 방입니다.'}
        );
      }

      leave(user);

      r.users.push(user);
      user.room=r.id;

      send(r);

      return json(
        res,
        200,
        summary(r)
      );
    }

    if(
      url.pathname==='/api/lobby-settings' &&
      req.method==='POST'
    ){
      const r=rooms.get(user.room);

      if(
        !r ||
        r.game ||
        r.users[0].id!==user.id
      ){
        return json(
          res,
          403,
          {
            error:
              '대기 중인 방의 방장만 설정할 수 있습니다.'
          }
        );
      }

      if(
        (
          body.mode!==undefined &&
          !['coop','versus']
            .includes(body.mode)
        ) ||
        (
          body.capacity!==undefined &&
          (
            ![2,3,4].includes(body.capacity) ||
            body.capacity<r.users.length
          )
        ) ||
        (
          body.random!==undefined &&
          typeof body.random!=='boolean'
        ) ||
        (
          body.hard!==undefined &&
          (
            !Number.isInteger(body.hard) ||
            body.hard<0 ||
            body.hard>5
          )
        )
      ){
        return json(
          res,
          400,
          {
            error:
              '현재 참가 인원과 전투 설정을 확인하세요.'
          }
        );
      }

      if(body.mode!==undefined)
        r.options.mode=body.mode;

      if(body.capacity!==undefined)
        r.capacity=body.capacity;

      if(body.random!==undefined)
        r.options.random=body.random;

      if(body.hard!==undefined)
        r.options.hard=body.hard;

      send(r);

      return json(
        res,
        200,
        summary(r)
      );
    }

    if(
      url.pathname==='/api/lobby-card' &&
      req.method==='POST'
    ){
      const r=rooms.get(user.room);

      if(!r||r.game){
        return json(
          res,
          400,
          {
            error:
              '대기실에서만 변경할 수 있습니다.'
          }
        );
      }

      if(
        !Number.isInteger(body.card) ||
        body.card<0 ||
        body.card>=CHAMPIONS.length
      ){
        return json(
          res,
          400,
          {
            error:
              '올바른 캐릭터 카드를 선택하세요.'
          }
        );
      }

      await accountStore.setCard(
        user.id,
        body.card
      );

      user.lobbyCard=body.card;

      send(r);

      return json(
        res,
        200,
        {card:body.card}
      );
    }

    if(
      url.pathname==='/api/lobby-chat' &&
      req.method==='POST'
    ){
      const r=rooms.get(user.room);

      if(!r||r.game){
        return json(
          res,
          400,
          {
            error:
              '대기실에서만 대화할 수 있습니다.'
          }
        );
      }

      const text=
        typeof body.text==='string'
          ?body.text.trim()
          :'';

      if(!text||text.length>200){
        return json(
          res,
          400,
          {
            error:
              '메시지는 1~200자로 입력하세요.'
          }
        );
      }

      if(
        Date.now()-(user.lastChatAt||0)<700
      ){
        return json(
          res,
          429,
          {error:'잠시 후 전송하세요.'}
        );
      }

      user.lastChatAt=Date.now();

      r.messages=[
        ...(r.messages||[]),
        {
          name:user.name,
          text,
          at:Date.now()
        }
      ].slice(-50);

      send(r);

      return json(res,200,{});
    }

    if(
      url.pathname==='/api/leave' &&
      req.method==='POST'
    ){
      leave(user);
      return json(res,200,{});
    }

    if(url.pathname==='/api/events'){
      const r=rooms.get(user.room);

      if(!r){
        return json(
          res,
          404,
          {error:'방을 찾을 수 없습니다.'}
        );
      }

      res.writeHead(
        200,
        {
          'Content-Type':'text/event-stream',
          'Cache-Control':'no-cache',
          'Connection':'keep-alive'
        }
      );

      r.streams.get(user.id)?.end();

      r.streams.set(
        user.id,
        res
      );

      res.write(
        `data: ${JSON.stringify({
          room:summary(r),
          game:gameForPlayer(
            r.game,
            user.id
          )
        })}\n\n`
      );

      req.on(
        'close',
        ()=>{
          if(
            r.streams.get(user.id)===res
          ){
            r.streams.delete(user.id);
          }
        }
      );

      return;
    }

    if(
      url.pathname==='/api/action' &&
      req.method==='POST'
    ){
      const r=rooms.get(user.room);

      if(!r){
        return json(
          res,
          404,
          {error:'방을 찾을 수 없습니다.'}
        );
      }

      const now=Date.now();

      if(
        !user.window ||
        now-user.window>1000
      ){
        user.window=now;
        user.requests=0;
      }

      if(++user.requests>45){
        return json(
          res,
          429,
          {error:'잠시 후 다시 시도하세요.'}
        );
      }

      if(body.type==='launch'){
        if(
          r.users[0].id!==user.id ||
          r.users.length!==r.capacity ||
          r.game
        ){
          return json(
            res,
            400,
            {
              error:
                '정원이 모두 입장한 뒤 방장이 시작할 수 있습니다.'
            }
          );
        }

        r.game=createGame(
          r.users,
          r.options
        );

      }else{
        if(!r.game){
          return json(
            res,
            400,
            {error:'대기 중입니다.'}
          );
        }

        if(
          ['start','prepareStart']
            .includes(body.type) &&
          r.users[0].id!==user.id
        ){
          return json(
            res,
            403,
            {
              error:
                '방장만 전투를 시작할 수 있습니다.'
            }
          );
        }

        const error=action(
          r.game,
          user.id,
          body.type==='start'
            ?{
                ...body,
                type:'prepareStart'
              }
            :body
        );

        if(error){
          return json(
            res,
            400,
            {error}
          );
        }
      }

      send(r);

      return json(res,200,{});
    }

    const staticFiles={
      '/auth.css':'auth.css',
      '/assets/auth-castle-v1.png':'assets/auth-castle-v1.png',
      '/assets/boss-spell-frames-v2.png':'assets/boss-spell-frames-v2.png',
      '/assets/projectiles-v1.png':'assets/projectiles-v1.png',
      '/assets/blessing-frame-v1.png':'assets/blessing-frame-v1.png',
      '/synergies.js':'synergies.js',
      '/shop.css':'shop.css',
      '/assets/shop-banner-v1.png':'assets/shop-banner-v1.png',
      '/lobby.js':'lobby.js',
      '/lobby.css':'lobby.css',
      '/assets/lobby-courtyard-v1.png':'assets/lobby-courtyard-v1.png',

      ...Object.fromEntries(
        Array.from(
          {length:7},
          (_,i)=>[
            '/assets/monster-walk-'+i+'-v1.png',
            'assets/monster-walk-'+i+'-v1.png'
          ]
        )
      ),

      '/game.html':'game.html',
      '/display.js':'display.js',
      '/battle-premium.css':'battle-premium.css',
      '/assets/battle-ruins-v1.png':'assets/battle-ruins-v1.png',
      '/battle-announcements.js':'battle-announcements.js',
      '/talents.js':'talents.js',
      '/champion-skills.js':'champion-skills.js',
      '/champion-skill-visuals.js':'champion-skill-visuals.js',
      '/assets/champion-skills-v1.png':'assets/champion-skills-v1.png',
      '/boss-skills.js':'boss-skills.js',
      '/assets/boss-skills-v1.png':'assets/boss-skills-v1.png',
      '/assets/equipment-set-expansion-v1.png':'assets/equipment-set-expansion-v1.png',

      ...Object.fromEntries(
        Array.from(
          {length:5},
          (_,i)=>i+10
        ).flatMap(
          i=>['attack','walk'].map(
            kind=>[
              `/assets/champion-${i}-${kind}-v1.png`,
              `assets/champion-${i}-${kind}-v1.png`
            ]
          )
        )
      ),

      '/monsters.js':'monsters.js',

      ...Object.fromEntries(
        [0,1,2].map(
          i=>[
            `/assets/monsters-expansion-${i}-v1.png`,
            `assets/monsters-expansion-${i}-v1.png`
          ]
        )
      ),

      ...Object.fromEntries(
        Array.from(
          {length:10},
          (_,i)=>[
            `/assets/champion-${i}-walk-v1.png`,
            `assets/champion-${i}-walk-v1.png`
          ]
        )
      ),

      '/assets/champion-0-attack-v1.png':'assets/champion-0-attack-v1.png',
      '/assets/champion-1-attack-v1.png':'assets/champion-1-attack-v1.png',
      '/assets/champion-2-attack-v1.png':'assets/champion-2-attack-v1.png',
      '/assets/champion-3-attack-v1.png':'assets/champion-3-attack-v1.png',
      '/assets/champion-4-attack-v1.png':'assets/champion-4-attack-v1.png',
      '/assets/champion-5-attack-v1.png':'assets/champion-5-attack-v1.png',
      '/assets/champion-6-attack-v1.png':'assets/champion-6-attack-v1.png',
      '/assets/champion-7-attack-v1.png':'assets/champion-7-attack-v1.png',
      '/assets/champion-8-attack-v1.png':'assets/champion-8-attack-v1.png',
      '/assets/champion-9-attack-v1.png':'assets/champion-9-attack-v1.png',

      '/assets/equipment-set-0-v2.png':'assets/equipment-set-0-v2.png',
      '/assets/equipment-set-1-v2.png':'assets/equipment-set-1-v2.png',
      '/assets/battle-terrains-v6.png':'assets/battle-terrains-v6.png',
      '/assets/battle-road-v1.png':'assets/battle-road-v1.png',
      '/command-ui.js':'command-ui.js',
      '/command-ui.css':'command-ui.css',
      '/assets/command-scenes-v1.png':'assets/command-scenes-v1.png',
      '/assets/equipment-icons-v1.png':'assets/equipment-icons-v1.png',

      '/':'index.html',
      '/app.js':'app.js',
      '/engine.js':'engine.js',
      '/gameplay.js':'gameplay.js',
      '/battle-ui.js':'battle-ui.js',
      '/renderer.js':'renderer.js',
      '/art.js':'art.js',
      '/maps.js':'maps.js',
      '/assets/maps-v5.png':'assets/maps-v5.png',
      '/monster-visuals.js':'monster-visuals.js',
      '/assets/monsters-v4.png':'assets/monsters-v4.png',
      '/assets/monster-reactions-v4.png':'assets/monster-reactions-v4.png',
      '/assets/champions-v3.png':'assets/champions-v3.png',
      '/assets/effects-v3.png':'assets/effects-v3.png',
      '/style.css':'style.css'
    };

    const file=staticFiles[url.pathname];

    if(!file){
      return json(
        res,
        404,
        {error:'페이지를 찾을 수 없습니다.'}
      );
    }

    const data=await readFile(
      new URL(file,import.meta.url)
    );

    res.writeHead(
      200,
      {
        'Content-Type':
          file.endsWith('.png')
            ?'image/png'
            :file.endsWith('.js')
              ?'text/javascript'
              :file.endsWith('.css')
                ?'text/css'
                :'text/html',

        'X-Content-Type-Options':'nosniff',
        'Referrer-Policy':
          'strict-origin-when-cross-origin'
      }
    );

    res.end(data);

  }catch(e){
    if(e instanceof AccountError){
      return json(
        res,
        e.status,
        {error:e.message}
      );
    }

    if(e instanceof SyntaxError){
      return json(
        res,
        400,
        {error:'잘못된 요청 형식입니다.'}
      );
    }

    console.error(
      'Request failed:',
      e.code||e.name
    );

    json(
      res,
      503,
      {
        error:
          '요청을 저장하거나 처리하지 못했습니다. 잠시 후 다시 시도하세요.'
      }
    );
  }
});

const gameTimer=setInterval(
  ()=>{
    for(const r of rooms.values()){
      if(r.game){
        if(r.game.status==='countdown'){
          advanceStartCountdown(
            r.game,
            Math.max(
              0,
              r.game.startRemaining-
              Math.max(
                0,
                (
                  r.game.startCountdownEndsAt-
                  Date.now()
                )/1000
              )
            )
          );
        }else{
          stepGame(
            r.game,
            .1,
            tick
          );
        }

        if(
          r.game.status==='ended' &&
          !r.cancelled &&
          !r.recorded &&
          !r.recording &&
          Date.now()>=(r.retryAt||0)
        ){
          persistBattle(r);
        }
      }

      send(r);

      if(
        !r.streams.size &&
        Date.now()-r.created>3600000 &&
        (
          !r.game ||
          r.cancelled ||
          r.recorded
        )
      ){
        rooms.delete(r.id);
      }
    }

    for(const [k,u] of sessions){
      if(Date.now()-u.seen>86400000){
        leave(u);
        sessions.delete(k);
      }
    }
  },
  100
);

server.listen(
  port,
  '0.0.0.0',
  ()=>{
    console.log(
      `LOOP DEFENSE · http://localhost:${port}`
    );
  }
);

function persistBattle(r){
  r.recording=true;

  const g=r.game;

  r.resultRows??=
    g.players.map(
      p=>({
        accountId:p.id,
        name:p.name,
        mode:g.mode,
        hard:g.hard,
        random:g.random,
        round:g.round,
        kills:p.kills,
        seconds:Math.round(g.time),
        date:new Date().toISOString()
      })
    );

  const job=
    accountStore
      .recordBattle(
        r.battleId,
        r.resultRows
      )
      .then(
        ()=>{
          r.recorded=true;
        }
      )
      .catch(
        ()=>{
          r.retryAt=Date.now()+5000;
          console.error(
            'Battle result save failed; retry pending'
          );
        }
      )
      .finally(
        ()=>{
          r.recording=false;
          pendingResults.delete(job);
        }
      );

  pendingResults.add(job);

  return job;
}

let shuttingDown=false;

async function shutdown(){
  if(shuttingDown)return;

  shuttingDown=true;

  clearInterval(gameTimer);

  for(const r of rooms.values()){
    for(const res of r.streams.values()){
      res.end();
    }
  }

  await new Promise(
    resolve=>server.close(resolve)
  );

  for(const r of rooms.values()){
    if(
      r.game?.status==='ended' &&
      !r.cancelled &&
      !r.recorded &&
      !r.recording
    ){
      persistBattle(r);
    }
  }

  await Promise.allSettled(
    [...pendingResults]
  );

  await accountStore.close();

  process.exit(0);
}

process.once(
  'SIGTERM',
  shutdown
);

process.once(
  'SIGINT',
  shutdown
);