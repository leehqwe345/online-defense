import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, action, tick } from './engine.js';
import { MonsterVisuals } from './monster-visuals.js';
import { monsterSpriteIndex } from './art.js';

function fixture(mode = 'single') {
  const game = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }].slice(0, mode === 'single' ? 1 : 2), { mode });
  action(game, 'a', { type: 'start' }); tick(game, 0.05);
  for (const board of game.boards) board.spawn = [];
  return game;
}
function hero(game, base = 0, tier = 0) {
  const champion = { id: game.nextId++, base, tier, x: 140, y: 140, cd: 0, equipment: {}, growth: 0 };
  game.players[0].champions.push(champion); return champion;
}

test('a lethal hit preserves its target and death pose once, without delaying rewards or waves', () => {
  const game = fixture(), m = game.boards[0].monsters[0], champion = hero(game);
  m.hp = 1; m.defenses = []; tick(game, 0.05);
  assert.equal(game.boards[0].monsters.length, 0); assert.equal(game.round, 2);
  assert.equal(game.deaths.length, 1); assert.equal(game.deaths[0].id, m.id);
  assert.equal(game.deaths[0].family, m.family); assert.equal(game.deaths[0].round, 1);
  assert.equal(game.effects[0].target, m.id); assert.equal(game.effects[0].source, champion.id);
  assert.ok(game.deaths[0].hurt.dx < 0);
  assert.equal(game.players[0].kills, 1); assert.equal(game.players[0].gold, 61);
  game.players[0].champions = []; tick(game, 0.05);
  assert.equal(game.deaths.length, 1); assert.equal(game.players[0].kills, 1);
  tick(game, 1.6); assert.equal(game.deaths.length, 0);
});

test('damage immunity has no hurt reaction; actual damage records one', () => {
  const game = fixture(), m = game.boards[0].monsters[0], c = hero(game);
  m.hp = m.maxHp = 1000;
  m.defenses = ['물리면역']; tick(game, 0.05);
  assert.equal(m.hp, 1000); assert.equal(m.hurt, undefined);
  m.defenses = []; c.cd = 0; tick(game, 0.05);
  assert.ok(m.hp < 1000); assert.equal(m.hurt.type, 0);
});

test('poison deaths and co-op boss deaths retain visuals with correct shared rewards', () => {
  const game = fixture('coop'), m = game.boards[0].monsters[0];
  m.hp = 1; m.poison = 100; m.poisonOwner = 'b'; m.boss = true;
  tick(game, 0.05);
  assert.equal(game.deaths.length, 1); assert.equal(game.deaths[0].hurt.type, 'poison');
  assert.equal(game.deaths[0].boss, true); assert.deepEqual(game.players.map(p => p.gold), [90, 90]);
  assert.deepEqual(game.players.map(p => p.kills), [0, 1]);
});

test('AoE keeps every death and versus death events stay on their own board', () => {
  const game = fixture('versus'), base = game.boards[0].monsters[0]; hero(game, 4, 4);
  game.boards[0].monsters = Array.from({ length: 6 }, () => ({ ...base, id: game.nextId++, hp: 1, defenses: [] }));
  const opponent = game.boards[1].monsters[0]; tick(game, 0.05);
  assert.equal(game.deaths.length, 6); assert.equal(new Set(game.deaths.map(m => m.id)).size, 6);
  assert.ok(game.deaths.every(m => m.board === 0)); assert.ok(opponent.hp > 0);
  assert.equal(game.players[0].kills, 6); assert.equal(game.players[1].kills, 0);
});

test('final-wave kill retains its death animation after victory', () => {
  const game = fixture(), m = game.boards[0].monsters[0];
  game.round = game.boards[0].round = 100; m.hp = 1; m.poison = 100; m.poisonOwner = 'a';
  tick(game, 0.05); assert.equal(game.status, 'ended'); assert.equal(game.deaths.length, 1);
});

test('repeated network packets never restart death animation, and render time controls expiry', () => {
  const game = fixture(), m = game.boards[0].monsters[0]; m.hp = 0; tick(game, 0.05);
  const visuals = new MonsterVisuals({}); visuals.receive(game, 4);
  const death = [...visuals.deaths.values()][0];
  visuals.receive(game, 4.2); assert.equal(visuals.deaths.size, 1); assert.equal([...visuals.deaths.values()][0].start, death.start);
  visuals.prune(4.2); assert.equal(visuals.deaths.size, 1);
  visuals.prune(6); assert.equal(visuals.deaths.size, 0);
  visuals.receive(game, 6.1); assert.equal(visuals.deaths.size, 0);
  visuals.reset(); assert.equal(visuals.seenDeaths.size, 0);
});

test('rapid hit packets cannot endlessly postpone reactions; removed targets release hit state', () => {
  const game = fixture(), m = game.boards[0].monsters[0], visuals = new MonsterVisuals({});
  m.hurt = { born: game.time, type: 4, dx: 1, dy: 0 }; visuals.receive(game, 0);
  const start = [...visuals.hits.values()][0].start;
  game.time += 0.05; m.hurt = { ...m.hurt, born: game.time }; visuals.receive(game, 0.05);
  assert.equal([...visuals.hits.values()][0].start, start);
  game.boards[0].monsters = []; visuals.receive(game, 0.1); assert.equal(visuals.hits.size, 0);
});

test('the ten normal families and alternating ten-round bosses select distinct atlas cells', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, family) => monsterSpriteIndex({ family })), [0,1,2,3,4,5,6,7,8,9]);
  assert.equal(monsterSpriteIndex({ boss: true, round: 10 }), 10);
  assert.equal(monsterSpriteIndex({ boss: true, round: 20 }), 11);
  assert.equal(monsterSpriteIndex({ boss: true, round: 100 }), 11);
});
