// Parser for the wiki "Crop Growth Calendars" page. Each crop section holds a Base table and
// comparison tables for Speed-Gro (10%), Deluxe (25%), Hyper (33%) and the same with the
// Agriculturist profession. Calendars are drawn day by day, so the run lengths of each stage
// image before the first harvest image are the crop's stage lengths under that speed bonus.

/** @returns {{name:string, tables:{label:string, group:string, phases:number[], days:number}[]}[]} */
export function parseCalendars(wikitext) {
  const out = [];
  const sections = wikitext.split(/^===\[\[([^\]|]+)(?:\|[^\]]*)?\]\]===\s*$/m);
  for (let i = 1; i < sections.length; i += 2) {
    const name = sections[i].trim();
    const body = sections[i + 1].split(/^==[^=]/m)[0];
    const tables = [];
    let group = 'Regular';
    // Walk tables in order, remembering which row group ("Regular" / "Agriculturist") they sit in.
    const tokens = body.split(/(\{\|[^\n]*\n|<div[^>]*>(?:Regular|Agriculturist)<\/div>)/);
    for (let t = 0; t < tokens.length; t++) {
      const g = tokens[t].match(/>(Regular|Agriculturist)</);
      if (g) group = g[1];
      if (!/^\{\|/.test(tokens[t])) continue;
      const content = tokens[t + 1] || '';
      const label = (content.match(/!colspan="7"\|([^\n]+)/) || [])[1];
      if (!label) continue;
      const cells = [...content.split('|}')[0].matchAll(/\[\[File:([^\]|]+?)\.png/g)].map((m) => m[1]);
      const phases = [];
      let days = null;
      for (let d = 0; d < cells.length; d++) {
        if (!/ Stage \w+$/.test(cells[d])) {
          days = d;
          break;
        }
        if (d > 0 && cells[d] === cells[d - 1]) phases[phases.length - 1]++;
        else phases.push(1);
      }
      tables.push({ label: label.trim(), group: label.trim() === 'Base' ? 'Base' : group, phases, days });
    }
    out.push({ name, tables });
  }
  return out;
}
