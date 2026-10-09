import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const json = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
export const data = {
  crops: json('data/crops.json'),
  fertilizers: json('data/fertilizers.json'),
  machines: json('data/machines.json'),
  professions: json('data/professions.json'),
  seasons: json('data/seasons.json'),
  greenhouse: json('data/greenhouse.json'),
  fishponds: json('data/fishponds.json'),
  animals: json('data/animals.json'),
};
export const crop = (id) => {
  const c = data.crops.crops.find((x) => x.id === id);
  if (!c) throw new Error(`no crop ${id}`);
  return c;
};
