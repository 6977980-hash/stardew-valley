# Project state

**Current Phase:** 1 — Foundation + Branding (complete, awaiting approval for Phase 2)

**Completed Phases:**
- 0 — Discovery & research (see docs/research/README.md)
- 1 — Foundation + Branding

**Current Branch:** phase-1-foundation (PR into main)

**Latest Commit:** see PR

**Tests Run:**
- PHP lint on every PHP file
- Integration tests inside WordPress 7.1.3 (`tests/integration/run.php`): 57 checks
- Playwright E2E (`tests/e2e/phase1.spec.js`): 28 tests incl. axe-core WCAG 2.1 A/AA in light and dark mode
- Lighthouse 12.8.2 mobile on `/` and `/about/`

**Test Results:**
- Integration: 57 passed, 0 failed
- E2E: 28 passed, 0 failed
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100 on both pages (LCP 1.1 s / 0.9 s, CLS 0)
- Ads-on check: slot, label, reserved height, loader and `/ads.txt` render; nothing on 404

**Known Issues:**
- Tested on a local WordPress (SQLite, PHP built-in server), not yet on the live Hostinger site.
- WordPress default "Sample Page" and "Hello world!" post may exist on the live site; the owner should delete them.
- Homepage tool cards are "Coming soon" until Phase 3.

**Important Decisions:**
- Site language: English. Brand name kept: Stardew Tools.
- Repo `stardew-valley` = plugin folder `stardew-tools` (already active on the live site; never rename).
- Theme bundled inside the plugin via `register_theme_directory()` instead of a second repo.
- No SEO plugin; the plugin handles titles, meta, schema. It steps aside if Yoast/Rank Math/AIOSEO is installed.
- Ads built but off until AdSense approval; apply after Phase 5 (20+ useful pages).
- No web fonts (system font stack) for speed.
- Plan: 7 phases, each tested, then explicit approval before the next.

**Next Phase:** 2 — Verified data layer + calculation engine (crops, machines, artisan goods, animals, fish ponds, fertilizers, professions) with automated tests.
