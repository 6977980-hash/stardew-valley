# Architecture

## Deployment

```
Claude / local dev  →  GitHub (6977980-hash/stardew-valley, branch main)
                    →  Hostinger "Deploy from GitHub"
                    →  public_html/wp-content/plugins/stardew-tools
                    →  https://stardewtools.net
```

- The repo root **is** the plugin folder. Do not rename the plugin folder or main file: WordPress would deactivate it.
- The theme ships inside the plugin at `theme/stardew-tools-theme` and is registered with
  `register_theme_directory()`, so one repo and one deployment cover both. The theme appears under
  Appearance > Themes only while the plugin is active.
- A GitHub push is not a deployment. Hostinger must pull (manual "Deploy" or its auto-deploy webhook),
  and every release is checked on the live site before it is called deployed.
- Git deploys do not fire WordPress activation hooks, so one-time setup runs on `init` when the stored
  version (`stardew_tools_installed_version`) differs from `STARDEW_TOOLS_VERSION`.
- `tests/`, `docs/` and `tools/` are deployed with the repo but blocked by `.htaccess` (`Require all denied`).

## Plugin (business logic)

| File | Responsibility |
| --- | --- |
| `stardew-tools.php` | Bootstrap, constants, `stardew_tools_brand()` and `stardew_tools_ad()` helpers, theme directory |
| `includes/class-config.php` | Single source of brand identity, colors, default SEO values (`stardew_tools_config` filter) |
| `includes/class-head.php` | Favicons, manifest, theme-color, emoji/generator clean-up |
| `includes/class-seo.php` | Titles, meta description, canonical, robots, Open Graph/Twitter, JSON-LD, sitemap and robots.txt tweaks; steps aside if Yoast/Rank Math/AIOSEO is active |
| `includes/class-ads.php` | Ad slots (off by default), AdSense loader, `/ads.txt`, reserved slot heights |
| `includes/class-pages.php` + `includes/page-templates/` | About, Contact, Privacy, Terms, Disclaimer, Methodology, Changelog |
| `includes/class-admin.php` | Settings > Stardew Tools (status + ad settings) |

Later phases add `data/` (verified JSON), the calculation engine and the tools here, not in the theme.

## Theme (presentation)

Classic PHP theme, no build step, no web fonts, ~8 KB CSS, ~0.5 KB JS. Mobile-first (360/390/414 px),
light and dark mode via `prefers-color-scheme`, WCAG 2.1 AA. Reads brand values through
`st_theme_brand()`, which falls back safely if the plugin is missing.

## Ads

| Setting | Effect |
| --- | --- |
| Publisher ID | Validated `ca-pub-…`; also publishes `/ads.txt` |
| AdSense code | Adds the AdSense loader for site review |
| Ad slots | Renders slots that have a slot ID; each reserves height and shows "Advertisement" |

With slots off, nothing ad-related is printed. Slots never render on 404s or search results, and are
placed only after content or results, never between inputs and buttons. EEA/UK consent uses
Google's own CMP, configured in AdSense > Privacy & messaging.

## SEO identity defaults

- Home title: `Stardew Valley Tools, Calculators & Planning Hub | Stardew Tools`
- Other pages: `{Title} | Stardew Tools`
- Schema: WebSite + Organization (home), BreadcrumbList (pages). FAQ/HowTo only where content truly is one.
- Sitemap: WordPress core `/wp-sitemap.xml`, users removed, pages with `_stardew_tools_noindex` excluded.
