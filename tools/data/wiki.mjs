// Minimal Stardew Valley Wiki client (MediaWiki API). Used only by the data import tools.
const API = 'https://stardewvalleywiki.com/mediawiki/api.php';
const UA = 'StardewToolsDataImport/1.0 (+https://stardewtools.net; contact@stardewtools.net)';

export async function fetchPage(title) {
  const url = `${API}?action=parse&format=json&redirects=1&prop=wikitext%7Crevid&page=${encodeURIComponent(title)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const data = await res.json();
      if (data.error) throw new Error(`${title}: ${data.error.info}`);
      return {
        title: data.parse.title,
        revid: data.parse.revid,
        url: `https://stardewvalleywiki.com/${data.parse.title.replace(/ /g, '_')}`,
        wikitext: data.parse.wikitext['*'],
      };
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`${title}: fetch failed`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Rendered HTML of a page (templates and modules evaluated by the wiki itself). */
export async function fetchRendered(title) {
  const url = `${API}?action=parse&format=json&redirects=1&prop=text%7Crevid&page=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`${title}: ${data.error.info}`);
  return { title: data.parse.title, revid: data.parse.revid, url: `https://stardewvalleywiki.com/${data.parse.title.replace(/ /g, '_')}`, html: data.parse.text['*'] };
}
