// XP Calculator: XP left to a target level, and how many harvests or catches that takes.
import { xpToLevel, totalForLevel, fishXp, farmingXpPerDay, actionsFor } from '../engine/index.js';
import { loadData, bindTool, esc, num } from './common.js';

const all = loadData();
const sk = all.skills;
const crops = new Map(all.crops.map((c) => [c.id, c]));
const form = document.getElementById('xp-form');
const tool = form.closest('.tool');
const out = tool.querySelector('[data-results]');
const summary = tool.querySelector('[data-summary]');
const t = sk.thresholds;

function render(v) {
  const skill = v.skill === 'fishing' ? 'fishing' : 'farming';
  for (const fs of form.querySelectorAll('[data-skill]')) fs.hidden = fs.dataset.skill !== skill;
  const level = Math.min(9, Math.max(0, parseInt(v.level, 10) || 0));
  const target = Math.min(10, Math.max(level + 1, parseInt(v.target, 10) || 10));
  const current = totalForLevel(level, t) + Math.max(0, parseInt(v.xp, 10) || 0);
  const needed = xpToLevel(current, target, t);
  const head = `You need <strong>${num(needed)} XP</strong> to go from level ${level} to level ${target}`;

  if (skill === 'farming') {
    const pick = sk.farming.crops.find((c) => c.id === v.crop) || sk.farming.crops[0];
    summary.innerHTML = `${head}: about <strong>${num(actionsFor(needed, pick.xp))} ${esc(pick.name)} harvests</strong> at ${pick.xp} XP each.`;
    const rows = sk.farming.crops
      .filter((c) => crops.has(c.id))
      .map((c) => ({ c, perDay: farmingXpPerDay(c, crops.get(c.id)) }))
      .sort((a, b) => b.perDay - a.perDay);
    out.innerHTML = `<table class="results-table">
      <caption class="visually-hidden">Crops ranked by farming XP per tile per day</caption>
      <thead><tr><th scope="col">Crop</th><th scope="col" class="num">XP per harvest</th><th scope="col" class="num">XP a day per tile</th><th scope="col" class="num">Harvests needed</th></tr></thead>
      <tbody>${rows
        .map(({ c, perDay }) => `<tr${c.id === pick.id ? ' class="is-best"' : ''}><th scope="row">${esc(c.name)}</th><td class="num">${c.xp}</td><td class="num">${num(perDay, 1)}</td><td class="num">${num(actionsFor(needed, c.xp))}</td></tr>`)
        .join('')}</tbody></table>`;
    return;
  }

  const opts = { quality: v.quality, perfect: v.perfect, treasure: v.treasure };
  const pick = sk.fishing.fish.find((f) => f.id === v.fish) || sk.fishing.fish[0];
  const each = fishXp(pick, sk.fishing.formula, opts);
  summary.innerHTML = `${head}: about <strong>${num(actionsFor(needed, each))} ${esc(pick.name)}</strong> at ${each} XP each, or ${num(actionsFor(needed, sk.fishing.crab_pot))} crab pot collections at ${sk.fishing.crab_pot} XP.`;
  const rows = sk.fishing.fish
    .filter((f) => !f.family)
    .map((f) => ({ f, xp: fishXp(f, sk.fishing.formula, opts) }))
    .sort((a, b) => b.xp - a.xp);
  out.innerHTML = `<table class="results-table">
    <caption class="visually-hidden">Fish ranked by XP per catch</caption>
    <thead><tr><th scope="col">Fish</th><th scope="col" class="num col-hide-sm">Difficulty</th><th scope="col" class="num">XP per catch</th><th scope="col" class="num">Catches needed</th></tr></thead>
    <tbody>${rows
      .map(({ f, xp }) => `<tr${f.id === pick.id ? ' class="is-best"' : ''}><th scope="row">${esc(f.name)}${f.legendary ? '<span class="tag">legendary</span>' : ''}</th><td class="num col-hide-sm">${f.difficulty}</td><td class="num">${xp}</td><td class="num">${num(actionsFor(needed, xp))}</td></tr>`)
      .join('')}</tbody></table>`;
}

bindTool({ form, storageKey: 'st:xp', render, farmFields: [] });
