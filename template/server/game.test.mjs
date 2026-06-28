// Replace with real rules tests for your game. Run with: npm test
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

const g = new Game('TEST');
g.addPlayer('a', 'Ann');
g.addPlayer('b', 'Bo');
ok(g.players.length === 2, 'players can join the lobby');
g.start('a');
ok(g.phase === 'play', 'host can start the game');
for (let i = 0; i < 5; i++) g.handleMessage('a', { t: 'tap' });
ok(g.phase === 'over' && g.winnerId === 'a', 'reaching 5 wins');

const view = g.viewFor('b');
ok(view.yourSecret === g.byId('b').secret, 'you can see your own secret');
ok(view.scores.find((s) => s.id === 'a').score === 5, 'scores are public');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
