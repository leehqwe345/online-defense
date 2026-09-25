import { createGame, action, tick } from './engine.js';
import { mergePartner } from './gameplay.js';

// Reproducible playtest using only legitimate actions and earned gold.
// This is a simple buyer, not a proof of optimal strategy or balance.
let seed = Number(process.argv[2]) || 42;
const originalRandom = Math.random;
Math.random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const game = createGame([{ id: 'bot', name: '밸런스 테스트' }]);
const player = game.players[0];
try {
  action(game, 'bot', { type: 'draw', kind: 'hero' });
  action(game, 'bot', { type: 'draw', kind: 'hero' });
  action(game, 'bot', { type: 'start' });
  let nextShop = 0;
  while (game.status === 'playing' && game.time < 7200) {
    if (game.time >= nextShop) {
      nextShop = game.time + 1;
      let candidate;
      while ((candidate = player.champions.find(c => mergePartner(player.champions, c)))) {
        action(game, 'bot', { type: 'merge', kind: 'hero', id: candidate.id });
      }
      if (game.round >= player.heroLevel * 10 && player.gold >= player.heroLevel * 40 && player.heroLevel < 6) {
        action(game, 'bot', { type: 'upgrade', kind: 'hero' });
      }
      while (player.gold >= 30 && player.champions.length < 80) {
        action(game, 'bot', { type: 'draw', kind: 'hero' });
      }
      action(game, 'bot', { type: 'formation' });
    }
    tick(game, 0.05);
  }
  console.log(JSON.stringify({ status: game.status, round: game.round, gameSeconds: Math.round(game.time), kills: player.kills, heroes: player.champions.length, shopLevel: player.heroLevel, gold: player.gold, result: game.message }, null, 2));
} finally {
  Math.random = originalRandom;
}
