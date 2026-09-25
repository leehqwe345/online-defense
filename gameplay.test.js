import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, action, tick, monsterProfile } from './engine.js';
import { formationPosition, sortTargets, stepGame } from './gameplay.js';

const users = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
const single = () => createGame(users.slice(0, 1));

test('60-second pressure adds a wave without removing survivors in single and co-op', () => {
  for (const mode of ['single', 'coop']) {
    const game = createGame(mode === 'single' ? users.slice(0, 1) : users, { mode });
    action(game, 'a', { type: 'start' });
    for (let i = 0; i < 599; i++) tick(game, 0.1);
    assert.equal(game.round, 1);
    const survivor = game.boards[0].monsters[0].id;
    tick(game, 0.1);
    assert.equal(game.round, 2);
    assert.equal(game.boards[0].monsters.length, 30);
    assert.equal(game.boards[0].spawn.length, 30);
    assert.ok(game.boards[0].monsters.some(m => m.id === survivor));
  }
});

test('clearing early resets countdown for the next wave', () => {
  const game = single();
  action(game, 'a', { type: 'start' });
  game.time = 35;
  game.boards[0].spawn = [];
  tick(game, 0.1);
  assert.equal(game.round, 2);
  assert.equal(game.roundStartedAt, 35.1);
  assert.equal(game.waveInterval - (game.time - game.roundStartedAt), 60);
});

test('no defense reaches the 100-monster loss condition at round four', () => {
  const game = single();
  action(game, 'a', { type: 'start' });
  for (let i = 0; i < 2000 && game.status !== 'ended'; i++) stepGame(game, 0.1, tick);
  assert.equal(game.status, 'ended');
  assert.equal(game.round, 4);
  assert.ok(game.boards[0].monsters.length >= 100);
});

test('versus does not spawn from timer, and 100 is the last wave', () => {
  const game = createGame(users, { mode: 'versus' });
  action(game, 'a', { type: 'start' });
  for (let i = 0; i < 650; i++) tick(game, 0.1);
  assert.equal(game.round, 1);
  const final = single();
  action(final, 'a', { type: 'start' });
  tick(final, 0.1);
  final.round = 100;
  final.boards[0].round = 100;
  final.boards[0].spawn = [];
  final.time = 1000;
  tick(final, 0.1);
  assert.equal(final.round, 100);
  assert.equal(final.status, 'playing');
});

test('pause freezes combat and countdown; 3x uses simulation substeps', () => {
  const game = single();
  action(game, 'a', { type: 'start' });
  action(game, 'a', { type: 'pause' });
  const before = structuredClone(game);
  stepGame(game, 1, tick);
  assert.deepEqual(game, before);
  action(game, 'a', { type: 'speed', value: 3 });
  action(game, 'a', { type: 'pause' });
  stepGame(game, 1, tick);
  assert.ok(Math.abs(game.time - 3) < 1e-8);
  const coop = createGame(users, { mode: 'coop' });
  assert.match(action(coop, 'a', { type: 'pause' }), /온라인/);
  assert.match(action(coop, 'a', { type: 'speed', value: 3 }), /싱글/);
});

test('auto formation stays inside map and affects only requesting player', () => {
  for (let i = 0; i < 80; i++) {
    const pos = formationPosition(i);
    assert.ok(pos.x >= 140 && pos.x <= 660 && pos.y >= 140 && pos.y <= 660);
    assert.ok(Math.min(pos.x - 80, 720 - pos.x, pos.y - 80, 720 - pos.y) <= 145 / 1.4);
  }
  const game = createGame(users, { mode: 'coop' });
  action(game, 'a', { type: 'draw', kind: 'hero' });
  action(game, 'b', { type: 'draw', kind: 'hero' });
  const other = structuredClone(game.players[1]);
  action(game, 'a', { type: 'formation' });
  assert.deepEqual(game.players[1], other);
});

test('target priority excludes immunity and obeys boss or health priority', () => {
  const immune = { id: 1, hp: 1, boss: true, immune: true };
  const weak = { id: 2, hp: 10, boss: false };
  const boss = { id: 3, hp: 90, boss: true };
  const effective = m => m.immune ? 0 : 1;
  assert.deepEqual(sortTargets([immune, weak, boss], 'boss', effective).map(m => m.id), [3, 2]);
  assert.deepEqual(sortTargets([immune, weak, boss], 'weak', effective).map(m => m.id), [2, 3]);
  assert.deepEqual(sortTargets([immune], 'smart', effective), []);
});

test('late-game HP curve is bounded, monotonically increasing and scales with difficulty', () => {
  const game = single();
  let previous = 0;
  for (let round = 1; round <= 100; round++) {
    const hp = monsterProfile(game, round).hp;
    assert.ok(hp > previous); previous = hp;
  }
  assert.ok(previous > 6000 && previous < 6500);
  assert.equal(monsterProfile({ ...game, hard: 5 }, 100).hp, previous * 3.5);
});
