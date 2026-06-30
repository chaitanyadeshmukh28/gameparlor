// Builds every client into the shared root dist/.
// The dashboard builds FIRST (its emptyOutDir clears the whole dist/), then
// each game builds into dist/<slug>. With `--test`, runs each engine's tests.
import { execSync } from 'child_process';

const GAMES = ['coup', 'nightfall', 'cipher', 'council', 'undercover', 'sealed', 'quest', 'intercept'];
const test = process.argv.includes('--test');

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

if (test) {
  for (const g of GAMES) {
    console.log(`\n=== test: ${g} ===`);
    run(`npm run test --workspace games/${g}`);
  }
  process.exit(0);
}

// Dashboard first — it empties dist/. Then games into their subdirs.
console.log('\n=== build: dashboard ===');
run('npm run build --workspace dashboard');
for (const g of GAMES) {
  console.log(`\n=== build: ${g} ===`);
  run(`npm run build --workspace games/${g}`);
}
console.log('\nAll clients built into dist/.');
