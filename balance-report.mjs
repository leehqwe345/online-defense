import { monsterProfile } from './engine.js';

const rows = [1, 10, 30, 50, 75, 100].map(round => {
  const old = (28 + round * 7) * 1.064 ** (round - 1);
  const profile = monsterProfile({ mode: 'single', hard: 0, players: [{}] }, round);
  return {
    round,
    previousHP: Math.round(old),
    currentHP: Math.round(profile.hp),
    bossHP: Math.round(profile.hp * 10),
    hard5HP: Math.round(profile.hp * 3.5),
  };
});
console.table(rows);
