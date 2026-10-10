// Homepage hero: an original pixel-art farm scene (day colours, night colours in dark mode).
// Run `npm run art` to regenerate theme/stardew-tools-theme/assets/img/hero-farm.svg.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 240, H = 100;
const out = [];
const rect = (x, y, w, h, c) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="px-${c}"/>`);
// Merge horizontal runs per row for a sprite.
function sprite(rows, map, ox, oy) {
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let e = x; while (e < row.length && row[e] === ch) e++;
      rect(ox + x, oy + y, e - x, 1, map[ch]);
      x = e;
    }
  });
}
// Stepped silhouette path from a height function.
function ridge(fn, c, step = 2) {
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += step) {
    const y = Math.round(fn(x));
    d += `V${y}H${Math.min(x + step, W)}`;
  }
  d += `V${H}Z`;
  out.push(`<path d="${d}" class="px-${c}"/>`);
}

// Sky bands (dithered edges by alternating pixels)
const bands = [['sky1', 0, 16], ['sky2', 16, 14], ['sky3', 30, 12], ['sky4', 42, 30]];
bands.forEach(([c, y, h]) => rect(0, y, W, h, c));
for (let i = 1; i < bands.length; i++) {
  const [c, y] = bands[i];
  for (let x = (i % 2); x < W; x += 2) rect(x, y - 1, 1, 1, c);
  for (let x = (i % 2) + 1; x < W; x += 4) rect(x, y - 2, 1, 1, c);
}
// Stars (night only; hidden by CSS in day)
const stars = [[12,6],[30,14],[51,4],[70,11],[96,7],[118,3],[139,12],[160,5],[176,15],[214,8],[228,3],[84,20],[150,22],[22,24]];
out.push('<g class="px-stars">');
stars.forEach(([x, y]) => rect(x, y, 1, 1, 'star'));
[[51,4],[160,5]].forEach(([x,y]) => { rect(x-1,y,3,1,'star'); rect(x,y-1,1,3,'star'); });
out.push('</g>');
// Sun / moon
out.push('<g class="px-sun">');
sprite([
  '...oooo...',
  '.oooooooo.',
  '.oooooooo.',
  'oooooooooo',
  'oooooooooo',
  'oooooooooo',
  'oooooooooo',
  '.oooooooo.',
  '.oooooooo.',
  '...oooo...',
], { o: 'sun' }, 196, 12);
out.push('</g>');
// Clouds
const cloud = [
  '.....wwww.......',
  '...wwwwwwww.....',
  '.wwwwwwwwwwwww..',
  'wwwwwwwwwwwwwwww',
  '.ssssssssssssss.',
];
out.push('<g class="px-clouds">');
sprite(cloud, { w: 'cloud', s: 'cloud2' }, 34, 14);
sprite(cloud, { w: 'cloud', s: 'cloud2' }, 132, 22);
sprite(cloud.map(r => r.slice(0, 12)), { w: 'cloud', s: 'cloud2' }, 222, 30);
out.push('</g>');

// Far mountains, hills
ridge(x => 50 - 9 * Math.sin(x / 23) - 5 * Math.sin(x / 9 + 1), 'far', 2);
ridge(x => 60 - 5 * Math.sin(x / 17 + 2) - 3 * Math.sin(x / 7), 'mid', 2);

// Tree line on mid hills
const pine = [
  '..d..',
  '.ddd.',
  '.ddd.',
  'ddddd',
  '.ddd.',
  'ddddd',
  '..t..',
];
const round = [
  '.ggg.',
  'ggggg',
  'gGggg',
  'ggggg',
  '.ggg.',
  '..t..',
  '..t..',
];
for (let x = 2; x < W; x += 7) {
  const base = Math.round(60 - 5 * Math.sin(x / 17 + 2) - 3 * Math.sin(x / 7));
  if (x > 142 && x < 178) continue; // gap behind the house
  const s = (x * 7) % 3 === 0 ? round : pine;
  sprite(s, { d: 'pine', t: 'trunk', g: 'leaf', G: 'leaf2' }, x, base - s.length + 2);
}

// Near meadow
ridge(x => 66 - 2 * Math.sin(x / 30), 'grass', 4);
rect(0, 70, W, 30, 'grass');

// Path to house
for (let y = 68; y < 100; y++) {
  const w = 4 + Math.floor((y - 68) / 3);
  rect(162 - Math.floor(w / 2), y, w, 1, 'path');
}

// Farmhouse (original cottage)
sprite([
  '.........cc.............',
  '.........cc.............',
  '......rrrrrrrrrrrr......',
  '.....rRRRRRRRRRRRRr.....',
  '....rRRRRRRRRRRRRRRr....',
  '...rRRRRRRRRRRRRRRRRr...',
  '..rRRRRRRRRRRRRRRRRRRr..',
  '.rrrrrrrrrrrrrrrrrrrrrr.',
  '..wwwwwwwwwwwwwwwwwwww..',
  '..wWWWWWWWWWWWWWWWWWWw..',
  '..wWllllWWWWWWWllllWWw..',
  '..wWlLLlWWWbbWWWlLLlWw..',
  '..wWlLLlWWbbbbWWlLLlWw..',
  '..wWllllWWbbbbWWllllWw..',
  '..wWWWWWWWbbkbWWWWWWWw..',
  '..wWWWWWWWbbbbWWWWWWWw..',
  '..wwwwwwwwbbbbwwwwwwww..',
], { c: 'chimney', r: 'roof2', R: 'roof', w: 'wall2', W: 'wall', l: 'frame', L: 'window', b: 'door', k: 'frame' }, 150, 51);
// Smoke
out.push('<g class="px-smoke">');
[[160,48],[161,46],[160,44],[162,42],[163,40]].forEach(([x,y], i) => rect(x, y, i > 2 ? 2 : 1, 1, 'smoke'));
out.push('</g>');

// Big tree right of house
sprite([
  '....gggggg....',
  '..gggggggggg..',
  '.ggggGggggggg.',
  'gggGGgggggGggg',
  'gggggggggGgggg',
  'ggggggGggggggg',
  '.gggggggggggg.',
  '..gggggggggg..',
  '.....tttt.....',
  '.....tttt.....',
  '.....tttt.....',
  '....tttttt....',
], { g: 'leaf', G: 'leaf2', t: 'trunk' }, 128, 54);

// Fence
for (let x = 0; x < W; x += 6) {
  if (x >= 156 && x <= 168) continue;
  rect(x, 70, 1, 6, 'fence');
}
rect(0, 72, 156, 1, 'fence'); rect(170, 72, W - 170, 1, 'fence');
rect(0, 74, 156, 1, 'fence2'); rect(170, 74, W - 170, 1, 'fence2');

// Tilled fields with crops
function field(x0, y0, cols, rows, crop) {
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * 6;
    rect(x0, y, cols * 6, 4, 'soil');
    rect(x0, y + 4, cols * 6, 1, 'soil2');
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * 6 + 1;
      sprite(crop[(r + c) % crop.length], { g: 'crop', G: 'crop2', y: 'bloom', p: 'pump', P: 'pump2', s: 'stem', b: 'berry' }, x, y - 4);
    }
  }
}
const sprout = ['.....', '.g.g.', '..g..', '..g..', '.....'];
const leafy = ['.GgG.', 'GgggG', '.ggg.', '..g..', '.....'];
const flower = ['..y..', '.yby.', '..y..', '.gsg.', '..s..'];
const pumpkin = ['..s..', '.pPp.', 'pPpPp', 'pppppp'.slice(0,5), '.....'];
field(96, 82, 9, 3, [leafy, flower, leafy, sprout]);
field(14, 84, 9, 3, [pumpkin, leafy, sprout, leafy]);
field(184, 82, 8, 3, [flower, leafy, pumpkin]);

// Foreground grass tufts
for (let x = 3; x < W; x += 11) {
  const y = 96 + (x % 3);
  rect(x, y, 1, 2, 'tuft'); rect(x + 1, y - 1, 1, 3, 'tuft'); rect(x + 2, y, 1, 2, 'tuft');
}

const day = {sky1:'#7EC8E3',sky2:'#9ED6EA',sky3:'#C2E5EE',sky4:'#E4F2E6',star:'#FFF6C8',sun:'#FFD25A',cloud:'#FFFFFF',cloud2:'#D9EEF5',far:'#8FB8A8',mid:'#5E9B5A',pine:'#2F6B34',trunk:'#6B4423',leaf:'#3F8A3A',leaf2:'#7BC062',grass:'#6DB24F',path:'#D8B67A',chimney:'#7A4A2A',roof:'#B5462E',roof2:'#7E2E1E',wall:'#F2DDB0',wall2:'#A87443',frame:'#5C3A1E',window:'#9FD3EA',door:'#8B5A2B',smoke:'#B8C6CC',fence:'#8B5A2B',fence2:'#6B4423',soil:'#8A5A32',soil2:'#6B4423',crop:'#3E9B3A',crop2:'#8ED36A',bloom:'#F6D04D',pump:'#E8862A',pump2:'#C9661A',stem:'#3E7A2A',berry:'#E86A8A',tuft:'#4E9A3C'};
const night = {sky1:'#141B3A',sky2:'#1E2A55',sky3:'#2C3B6B',sky4:'#43507E',sun:'#F3EFD8',cloud:'#3D4A78',cloud2:'#323E68',far:'#2E4058',mid:'#24433A',pine:'#16301F',trunk:'#3A2816',leaf:'#1F4A2C',leaf2:'#2E6A3A',grass:'#2C5A33',path:'#6E5A3C',roof:'#6E2C22',roof2:'#4A1C15',wall:'#9C8A6A',wall2:'#5E4428',window:'#FFD36A',door:'#4E3218',fence:'#4E3218',fence2:'#3A2816',soil:'#4A3220',soil2:'#3A2816',crop:'#2A6A2E',crop2:'#4A8A42',bloom:'#C9A63E',pump:'#A8601E',pump2:'#844A14',berry:'#A84A62',tuft:'#24502C',smoke:'#6A7390'};
const css = (p) => Object.entries(p).map(([k,v]) => `.px-${k}{fill:${v}}`).join('');
const style = `<style>${css(day)}.px-stars{display:none}@media (prefers-color-scheme:dark){${css(night)}.px-stars{display:inline}}</style>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*6}" height="${H*6}" shape-rendering="crispEdges"><title>Pixel art farm: a cottage, crop fields, fence and hills</title>${style}${out.join('')}</svg>`;
writeFileSync(fileURLToPath(new URL('../../theme/stardew-tools-theme/assets/img/hero-farm.svg', import.meta.url)), svg + '\n');
