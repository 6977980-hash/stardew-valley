// Original 16x16 pixel icons for the theme: writes inc/pixel-icons.php (inline SVG bodies, one
// path per colour) and a few standalone SVGs used from CSS. Run `npm run art`.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const theme = (p) => fileURLToPath(new URL('../../theme/stardew-tools-theme/' + p, import.meta.url));

const P = {
  k: '#3B2414', // outline
  g: '#3E9B3A', G: '#8ED36A', d: '#24632A',
  y: '#F6D04D', Y: '#C9961E', o: '#E8862A', O: '#B85E14',
  b: '#8B5A2B', B: '#5C3A1E', l: '#C08A4F',
  w: '#FFFFFF', c: '#9FD3EA', C: '#5BA8CF',
  p: '#F4A6B8', P: '#D9748F', r: '#D9473A', R: '#9E2A22',
  s: '#C9D3D8', S: '#8A979E', n: '#F2DDB0',
};
const icons = {
  sprout: [
    '................',
    '..........kkk...',
    '.........kGGGk..',
    '..kkk...kGGgGk..',
    '.kGGGk..kGgggk..',
    '.kGggGk.kgggk...',
    '..kgggkkgggk....',
    '...kkgggggk.....',
    '.....kkgkk......',
    '.......gk.......',
    '.......gk.......',
    '...kkkkkkkkkk...',
    '..kBbbbbbbbbBk..',
    '..kbBbbBbbbBbk..',
    '...kkkkkkkkkk...',
    '................',
  ],
  coin: [
    '................',
    '.....kkkkkk.....',
    '...kkyyyyyykk...',
    '..kyyyYYYYyyyk..',
    '..kyyYyyyyYyyk..',
    '.kyyYyyyyyyYyyk.',
    '.kyyYyywwyyYyyk.',
    '.kyyYyywyyyYyyk.',
    '.kyyYyyyyyyYyyk.',
    '.kyyYyyyyyyYyyk.',
    '..kyyYyyyyYyyk..',
    '..kyyyYYYYyyyk..',
    '...kkyyyyyykk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
  jar: [
    '................',
    '....kkkkkkkk....',
    '....kbbbbbbk....',
    '....kkkkkkkk....',
    '.....kcwcck.....',
    '....kccwccck....',
    '...kcwwcccccck..',
    '...kcppppppck...',
    '...kcpPpppPpck..',
    '...kcppppppPck..',
    '...kcpPpppppck..',
    '...kcppppPppck..',
    '...kcppppppcck..',
    '....kccccccck...',
    '.....kkkkkkk....',
    '................',
  ].map(r => r.slice(0, 16)),
  keg: [
    '................',
    '.....kkkkkk.....',
    '...kkbbbbbbkk...',
    '..kbbbbbbbbbbk..',
    '..kSSSSSSSSSSk..',
    '..kblbblbblbbk..',
    '.kbblbblbblbbbk.',
    '.kbblbblbblbbbk.',
    '.kSSSSSSSSSSSSk.',
    '.kbblbblbblbbbk.',
    '.kbblbblbblbbbk.',
    '..kblbblbblbbk..',
    '..kSSSSSSSSSSk..',
    '...kkbbbbbbkk...',
    '.....kkkkkk.....',
    '................',
  ],
  house: [
    '................',
    '.......kk.......',
    '......kRRk......',
    '.....kRrrRk.....',
    '....kRrrrrRk....',
    '...kRrrrrrrRk...',
    '..kRrrrrrrrrRk..',
    '.kkkkkkkkkkkkkk.',
    '..knnnnnnnnnnk..',
    '..knkkknnkkknk..',
    '..knkckbbkckk...',
    '..knkkkbbkkknk..',
    '..knnnnbbnnnnk..',
    '..knnnnbBnnnnk..',
    '..kkkkkkkkkkkk..',
    '................',
  ].map(r => r.padEnd(16, '.')),
  greenhouse: [
    '................',
    '.......kk.......',
    '......kcck......',
    '.....kcwcck.....',
    '....kcwccCck....',
    '...kcwcckcCck...',
    '..kcwcckkcCCck..',
    '.kkkkkkkkkkkkkk.',
    '.kcwckccckcCck..',
    '.kcwckcGckcCck..',
    '.kcckkGgGkkcck..',
    '.kccckgggkccck..',
    '.kkkkkkgkkkkkk..',
    '.kbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkk.',
    '................',
  ].map(r => r.padEnd(16, '.')),
  fish: [
    '................',
    '................',
    '.........kkk....',
    '......kkkCCk....',
    '....kkCCCCCkk..k',
    '...kCCCCCCCCCkkk',
    '..kCwkCCCCCCCCCk',
    '..kCkkCCCCCCCCck',
    '.kCCCCCCCCCCCcck',
    '..kcccccccccckck',
    '...kcccccccckk.k',
    '....kkccccckk...',
    '......kkkkk.....',
    '................',
    '................',
    '................',
  ],
  pig: [
    '................',
    '................',
    '...kk......kk...',
    '..kPpk....kpPk..',
    '..kppkkkkkkppk..',
    '.kpppppppppppk..',
    '.kpkppppppkpppk.',
    '.kpkppppppkpppk.',
    '.kpppkkkkppppppk',
    '.kpppkPPkpppppk.',
    '.kpppPkkPppppPk.',
    '..kppppppppppk..',
    '..kkpkkkkkkpkk..',
    '...kpk....kpk...',
    '...kkk....kkk...',
    '................',
  ].map(r => r.slice(0, 16)),
  fishpond: null,
  hammer: [
    '................',
    '........kkkk....',
    '.......kSSSSk...',
    '......kSsssSSk..',
    '.....kSsssSSSkk.',
    '......kSSSSkkbk.',
    '.......kkkkbbk..',
    '.........kbbk...',
    '........kbbk....',
    '.......kbbk.....',
    '......kbbk......',
    '.....kbbk.......',
    '....kbbk........',
    '...kBbk.........',
    '...kkk..........',
    '................',
  ],
  check: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.knnnnnnnnnnnnk.',
    '.knnnnnnnnnnggk.',
    '.knnnnnnnnnnggk.',
    '.knnnnnnnnnggnk.',
    '.knnnnnnnnnggnk.',
    '.kngnnnnnnggnnk.',
    '.knggnnnnggnnnk.',
    '.knnggnnggnnnnk.',
    '.knnnggggnnnnnk.',
    '.knnnnggnnnnnnk.',
    '.knnnnnnnnnnnnk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  gift: [
    '................',
    '....kkk..kkk....',
    '...kyyyk.kyyyk..',
    '...kyk.kkkkyyk..',
    '....kkkyyykkk...',
    '.kkkkkkyyykkkkk.',
    '.krrrrrkyykrrrk.',
    '.kRRRRRkyykRRRk.',
    '.kkkkkkkyykkkkk.',
    '..krrrrkyykrrk..',
    '..krrrrkyykrrk..',
    '..krrrrkyykrrk..',
    '..kRRRRkyykRRk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ].map(r => r.padEnd(16, '.')),
  star: [
    '................',
    '.......kk.......',
    '......kyyk......',
    '......kyyk......',
    '.....kyyyyk.....',
    'kkkkkkyyyyykkkkk',
    'kyyyyyyyyyyyyyyk',
    '.kyyyyyywyyyyyk.',
    '..kyyyyywyyyyk..',
    '...kyyyyyyyyk...',
    '...kyyyyYyyyk...',
    '..kyyyYkkYyyyk..',
    '..kyyYk..kYyyk..',
    '.kyYkk....kkYyk.',
    '.kkk........kkk.',
    '................',
  ],
  scroll: [
    '................',
    '..kkkkkkkkkkkk..',
    '.knnnnnnnnnnnnk.',
    '.kkkkkkkkkkkkkk.',
    '..knnnnnnnnnnk..',
    '..knBBBBBBBnnk..',
    '..knnnnnnnnnnk..',
    '..knBBBBBnnnnk..',
    '..knnnnnnnnnnk..',
    '..knBBBBBBBBnk..',
    '..knnnnnnnnnnk..',
    '..knBBBBBBnnnk..',
    '.kkkkkkkkkkkkkk.',
    '.knnnnnnnnnnnnk.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
};
delete icons.fishpond;
const php = [];
const bodies = {};
for (const [name, rows] of Object.entries(icons)) {
  const byColor = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      if (!P[ch]) throw new Error(name + ' ' + ch);
      let e = x; while (e < row.length && row[e] === ch) e++;
      (byColor[ch] ||= []).push(`M${x} ${y}h${e - x}v1h-${e - x}z`);
      x = e;
    }
  });
  const body = Object.entries(byColor).map(([ch, d]) => `<path fill="${P[ch]}" d="${d.join('')}"/>`).join('');
  bodies[name] = body;
  php.push(`\t'${name}' => '${body}',`);
}
writeFileSync(theme('inc/pixel-icons.php'), `<?php
/**
 * Original 16x16 pixel icons. Generated by tools/brand/pixel-icons.mjs; do not edit by hand.
 *
 * @package Stardew_Tools_Theme
 */

defined( 'ABSPATH' ) || exit;

return array(
${php.join('\n')}
);
`);
for (const name of ['star', 'scroll']) {
  writeFileSync(theme(`assets/img/icon-${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">${bodies[name]}</svg>\n`);
}
