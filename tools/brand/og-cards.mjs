// Renders one 1200 × 630 share image per reference page and guide into assets/og/, with the
// page's own numbers and a small chart, so links shared on social sites and the Article schema
// show the page's subject instead of the site logo. Numbers come from data/entities.json and
// data/answers.json; guide titles from includes/class-guides.php.
// Usage: node tools/brand/og-cards.mjs   (needs the playwright package installed)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'assets/og');
const ent = JSON.parse(readFileSync(path.join(root, 'data/entities.json'), 'utf8'));
const icon = readFileSync(path.join(root, 'assets/brand/icon.svg'), 'utf8');
const g = (n) => `${Math.round(n).toLocaleString('en-US')}g`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const css = `
html,body{margin:0;width:1200px;height:630px;font-family:Inter,system-ui,sans-serif}
body{background:#FBF7EC;box-sizing:border-box;padding:64px 80px;position:relative;overflow:hidden;display:flex;gap:56px}
.l{flex:1 1 0;display:flex;flex-direction:column;min-width:0}
.eyebrow{font-size:26px;font-weight:700;color:#8A5A12;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px}
h1{font-size:72px;line-height:1.05;font-weight:800;color:#1F2A1F;margin:0;letter-spacing:-1px}
h1.long{font-size:56px}
.sub{font-size:34px;line-height:1.3;color:#3B4A39;margin:24px 0 0;max-width:900px}
.stats{display:flex;flex-wrap:wrap;gap:18px;margin-top:auto}
.stat{background:#fff;border:3px solid #2F6B34;border-radius:14px;padding:14px 20px;min-width:150px}
.stat b{display:block;font-size:40px;color:#2F6B34}
.stat span{font-size:21px;color:#3B4A39}
.r{flex:0 0 380px;display:flex;flex-direction:column;justify-content:flex-end}
.r h2{font-size:22px;color:#3B4A39;margin:0 0 12px;font-weight:700}
.bars{display:flex;align-items:flex-end;gap:18px;height:300px;border-bottom:3px solid #1F2A1F}
.bar{flex:1;background:#2F6B34;border-radius:8px 8px 0 0;position:relative}
.bar.alt{background:#E3A72F}
.bar i{position:absolute;top:-34px;left:0;right:0;text-align:center;font-style:normal;font-size:22px;font-weight:700;color:#1F2A1F}
.labels{display:flex;gap:18px;margin-top:8px}.labels span{flex:1;text-align:center;font-size:19px;color:#3B4A39}
ul.list{list-style:none;margin:0;padding:0;font-size:28px;color:#1F2A1F}ul.list li{padding:8px 0;border-bottom:2px solid #E7DFC9}
.brand{position:absolute;left:80px;bottom:30px;display:flex;align-items:center;gap:12px;font-size:22px;font-weight:700;color:#1F2A1F}
.brand svg{width:34px;height:34px}.brand em{font-style:normal;font-weight:400;color:#5E6B5B}
.band{position:absolute;left:0;right:0;bottom:0;height:14px;background:linear-gradient(90deg,#2F6B34 0 70%,#E3A72F 70%)}
body{padding-bottom:100px}`;

function bars(title, items) {
  const max = Math.max(...items.map((x) => x.value), 1);
  return `<div class="r"><h2>${esc(title)}</h2><div class="bars">${items
    .map((x, i) => `<div class="bar${i === items.length - 1 ? ' alt' : ''}" style="height:${Math.max(4, (x.value / max) * 100)}%"><i>${esc(x.text)}</i></div>`)
    .join('')}</div><div class="labels">${items.map((x) => `<span>${esc(x.label)}</span>`).join('')}</div></div>`;
}
function list(title, items) {
  return `<div class="r"><h2>${esc(title)}</h2><ul class="list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
}
function card({ eyebrow, title, sub = '', stats = [], right = '' }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="l"><p class="eyebrow">${esc(eyebrow)}</p><h1${title.length > 26 ? ' class="long"' : ''}>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
<div class="stats">${stats.map((s) => `<div class="stat"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}</div></div>
${right}<div class="brand">${icon}Stardew Tools <em>· stardewtools.net · Stardew Valley 1.6</em></div><div class="band"></div></body></html>`;
}

const cards = [];
for (const c of Object.values(ent.crops)) {
  const best = c.plantings.reduce((b, p) => (!b || p.profit.level6 > b.profit.level6 ? p : b), null);
  cards.push({
    file: `crop-${c.id}`,
    eyebrow: `Crop · ${c.seasons.map(cap).join(', ')}`,
    title: c.name,
    stats: [[g(c.prices.regular), 'sell price'], [`${c.growth_days} days`, c.regrow_days ? `to grow, regrows ${c.regrow_days}` : 'to grow']],
    right: best ? bars(`Profit per tile, ${cap(best.season)}`, [['Level 0', best.profit.level0], ['Level 6', best.profit.level6], ['Level 10', best.profit.level10]].map(([label, value]) => ({ label, value, text: g(value) }))) : list('Grown in', ['Greenhouse', 'Garden Pots']),
  });
}
for (const a of Object.values(ent.animals)) {
  const h = (n) => a.by_hearts.find((x) => x.hearts === n);
  cards.push({
    file: `animal-${a.id}`,
    eyebrow: `Farm animal · ${cap(a.building)}`,
    title: a.name,
    stats: [[a.price ? g(a.price) : 'Not sold', a.price ? 'at Marnie\'s' : 'hatched from an egg'], [g(a.full.raw), 'a day at 5 hearts']],
    right: bars('Gold a day by hearts', [0, 3, 5].filter((n) => h(n)).map((n) => ({ label: `${n} hearts`, value: h(n).gold, text: g(h(n).gold) }))),
  });
}
for (const m of Object.values(ent.machines)) {
  const top = m.crops.filter((x) => x.input === 1).slice(0, 4);
  cards.push({
    file: `machine-${m.id}`,
    eyebrow: 'Artisan machine',
    title: `${m.name}: best crops`,
    stats: [[String(m.accepted), 'crops accepted'], [top[0].name, 'best per day']],
    right: bars('Extra gold per machine per day', top.map((x) => ({ label: x.name, value: x.gain_per_machine_day, text: g(x.gain_per_machine_day) }))),
  });
}
for (const v of Object.values(ent.villagers || {})) {
  cards.push({
    file: `villager-${v.id}`,
    eyebrow: 'Villager gifts',
    title: v.name,
    stats: [[`${cap(v.birthday.season)} ${v.birthday.day}`, 'birthday'], [`+${v.points.love}`, 'per loved gift']],
    right: list('Loves', (v.tastes.love.own.length ? v.tastes.love.own : v.tastes.love.universal).slice(0, 6)),
  });
}
for (const r of Object.values(ent.bundles || {})) {
  if (r.page === false) continue;
  cards.push({
    file: `bundles-${r.id}`,
    eyebrow: 'Community Center',
    title: `${r.name} bundles`,
    stats: [[String(r.bundles.length), 'bundles'], [r.reward, 'reward']],
    right: list('Bundles', r.bundles.map((b) => b.name.replace(/ Bundle$/, '')).slice(0, 6)),
  });
}
// Ranked crop pages (tools with a season): the top crops by profit per tile from answers.json.
const answers = JSON.parse(readFileSync(path.join(root, 'data/answers.json'), 'utf8'));
for (const [season, rows] of Object.entries(answers.best_crops || {})) {
  const top = rows.slice(0, 4);
  if (!top.length) continue;
  cards.push({
    file: `tool-best-${season}-crops`,
    eyebrow: 'Ranked by profit',
    title: `Best ${cap(season)} Crops`,
    // The greenhouse page names Ancient Fruit best overall; its table ranks seeds you can buy.
    sub: season === 'greenhouse'
      ? `Best seed you can buy: ${top[0].name}, ${g(top[0].profit)} a tile a year.`
      : `${top[0].name} earns the most per tile: ${g(top[0].profit)}.`,
    stats: [[String(rows.length), 'crops ranked'], [g(top[0].profit), `${top[0].name} per tile`]],
    // Lowest first, so the winner is the highlighted last bar and its label clears the heading.
    right: bars('Profit per tile', [...top].reverse().map((r) => ({ value: r.profit, text: g(r.profit), label: r.name }))),
  });
}
// Guides: the title and blurb from the PHP definitions.
const guidesSrc = readFileSync(path.join(root, 'includes/class-guides.php'), 'utf8');
const gpart = guidesSrc.slice(guidesSrc.indexOf('function guides()'));
for (const m of gpart.matchAll(/'([a-z0-9-]+)'\s*=>\s*array\(\s*'hub'\s*=>\s*'([a-z-]+)',\s*'title'\s*=>\s*'((?:[^'\\]|\\.)*)',\s*'short'\s*=>\s*'((?:[^'\\]|\\.)*)',\s*'blurb'\s*=>\s*'((?:[^'\\]|\\.)*)'/g)) {
  const [, id, hub, , short, blurb] = m;
  cards.push({ file: `guide-${id}`, eyebrow: `Guide · ${hub.replace(/-/g, ' ')}`, title: short.replace(/\\'/g, "'"), sub: blurb.replace(/\\'/g, "'") });
}

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.jpg')) unlinkSync(path.join(out, f));
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of cards) {
  await page.setContent(card(c));
  await page.screenshot({ path: path.join(out, `${c.file}.jpg`), type: 'jpeg', quality: 76 });
}
await browser.close();
console.log(`${cards.length} cards written to assets/og/`);
