#!/usr/bin/env node
// Asks the Stardew Valley Wiki which game version is newest and compares it with the version
// our data was checked for. Run it after a game patch (or every week):
//   npm run data:check-version
// Exit code 0 = up to date, 1 = a newer version exists (re-run the importers and re-check the
// numbers), 2 = the wiki could not be read or the page changed shape.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage } from './wiki.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ours = JSON.parse(readFileSync(join(ROOT, 'data', 'crops.json'), 'utf8'));

const cmp = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};

try {
  const page = await fetchPage('Version History');
  const versions = [...page.wikitext.matchAll(/^==\s*(\d+\.\d+\.\d+)\s*==/gm)].map((m) => m[1]);
  if (!versions.length) throw new Error('no version headings found on the Version History page');
  const newest = versions.reduce((a, b) => (cmp(a, b) >= 0 ? a : b));
  console.log(`Wiki newest version: ${newest} (revision ${page.revid}). Our data: ${ours.game_version}, generated ${ours.generated}.`);
  if (cmp(newest, ours.game_version) > 0) {
    console.log(`A newer game version exists. Next steps: read the ${newest} changelog, run \`npm run data:import\` and the other tools/data importers, review the diff, then bump game_version.`);
    process.exit(1);
  }
  console.log('Data is up to date with the newest version on the wiki.');
} catch (e) {
  console.error(`Could not check the version: ${e.message}`);
  process.exit(2);
}
