# Stardew Tools

Core WordPress plugin and theme for **[StardewTools.net](https://stardewtools.net/)**, a fan-made
Stardew Valley planning and decision hub. *Calculate. Compare. Decide. Plan.*

> Stardew Valley is a trademark of ConcernedApe. This is a fan-made website and is not affiliated
> with or endorsed by ConcernedApe.

## Install / deploy

The repo root is the plugin folder. Hostinger "Deploy from GitHub" root directory:

```
public_html/wp-content/plugins/stardew-tools
```

After the first deploy of a new version:

1. WP Admin > Plugins: **Stardew Tools** is active.
2. WP Admin > Appearance > Themes: activate **Stardew Tools Theme**.
3. WP Admin > Settings > Permalinks: "Post name".
4. WP Admin > Settings > Stardew Tools: check the status panel. Leave ads off until AdSense approval.

## Release checklist

1. Bump the version in `stardew-tools.php` (header and `STARDEW_TOOLS_VERSION`), `readme.txt`
   (Stable tag and `== Changelog ==`) and `theme/stardew-tools-theme/style.css`, and add a dated entry
   to `includes/page-templates/changelog.php`.
2. `npm test` and the GitHub Actions checks are green.
3. Merge to `main`. Hostinger deploys it; on the first request the plugin refreshes its pages and
   purges LiteSpeed Cache by itself.
4. Purge the Hostinger CDN: hPanel > Websites > stardewtools.net > Cache Manager > Purge all.
5. Check the changed pages on https://stardewtools.net/.

## Development

```
npm install                 # Playwright + axe (dev only)
npm run brand               # re-render PNG icons and the OG image from the SVG sources
npx playwright test         # E2E tests (BASE_URL defaults to http://localhost:8089)
BASE_URL=https://stardewtools.net npx playwright test --grep @live   # checks safe to run on the live site
wp eval-file wp-content/plugins/stardew-tools/tests/integration/run.php   # integration tests in WordPress
```

Work goes phase by phase. Read `docs/project-state.md` first and update it at the end of each phase.
Architecture: `docs/architecture.md`.
