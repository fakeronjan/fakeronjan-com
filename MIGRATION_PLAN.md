# fakeronjan.com migration off Squarespace

## Why
Squarespace subscription renews 12/14/2026. Domain `fakeronjan.com` is registered
through Squarespace (backend registrar: Tucows). Goal: move to GitHub Pages
(matching the rest of the fakeronjan fleet) and stop paying Squarespace. December
is just the trigger, not a hard start date - work can begin anytime.

## What's on the current site
(Verified live 2026-08-02 via WebFetch against fakeronjan.com - this section supersedes
the original 07-17 pass.)

- Nav: Home, Blog, Music, Sports Ratings (dropdown), Video Games, Fake Basketball
- **Blog**: at least 24 posts visible plus an "Older" pagination link, spanning Nov 2024
  to Jun 2026 (~19 months) - genuine Squarespace CMS content, the real migration work
- **Music**: intro essay (musical background - piano/violin, Carnegie Hall, orchestral
  work) + chronological list of music-related posts 2015-2025 (showtunes, video-game
  soundtrack rankings, NFL music, etc.) + a "Musical Creations" section organized by era:
  90s MIDI remixes (Punch-Out!!, NFL themes), the 1999 Tagore/Nazrul album, Mario Paint
  remixes (links out to the MPMG site/YouTube channel)
- **Sports Ratings**: 14 sub-pages under the dropdown (All Sports Summary, NBA, WNBA,
  Intl Basketball, NFL, NCAA Football, Euro Soccer, MLS, Intl Soccer, MLB, Intl Baseball,
  NHL, Intl Hockey, Tennis, The Challenge). Each already a thin wrapper - embeds an
  `<iframe src="https://fakeronjan.github.io/duncan/">` (etc per sport) with a
  `postMessage` resize listener. This content already lives outside Squarespace - cheap
  phase, rebuild the wrapper + iframe embed 14 times, not real migration work.
- **Video Games**: Top-N ranking posts (Zelda, Mario, Switch games, soundtrack rankings)
  + a Game of the Year list 1990-2025 (winner/runner-up per year, plus decade winners;
  1990-2012 retroactive, 2013-2018 mixed, 2019-2025 contemporaneous) + a "Contemporaneous
  Commentary" section (13 entries, 2013-2025, prose + image per year)
- **Homepage tagline**: "Not useless analysis!" attributed to "Real Ronjan" - this is
  real, already-live homepage copy, not something to cut when the new site is built.

## Decisions made
- **Host**: GitHub Pages, same as the rest of the fleet
- **Generator**: Eleventy (Markdown + Nunjucks), not a hand-rolled site like the ratings fleet
- **Editing workflow**: Markdown + git, no CMS layer (no strong preference either way, and this
  matches every other fakeronjan property already)
- **Domain**: transfer `fakeronjan.com` registration from Squarespace to Cloudflare Registrar
  (same as `mariopaintmusicguy.com`), which also moves DNS to Cloudflare
- **URL preservation**: not required - internal site links just need to stay consistent, old
  Squarespace URLs don't need to keep working

## Phases
0. **Tooling spike** - Eleventy skeleton, confirm the Markdown workflow feels good
1. **Sports Ratings pages** - recreate the iframe-embed pattern in the new templates (cheap)
2. **Video Games gallery** - convert GOTY list + commentary into a data file + template
3. **Blog** - Squarespace export (Settings > Advanced > Import/Export, WordPress XML) ->
   Markdown conversion, re-host images, manual pass per post (~1.5-2 years of posts)
4. **Music page** - blog-post list (reuses Phase 3 tooling) + Musical Creations section
   (reuses Phase 2 structured-data pattern)
5. **Domain cutover** - unlock + transfer `fakeronjan.com` to Cloudflare, point DNS at
   GitHub Pages, verify live, then cancel Squarespace

## Status
- **Phase 0: scaffolded 2026-07-17.** Local prototype at `~/code/fakeronjan-com`
  (not deployed, not a git repo yet). Eleventy config, base layout matching current nav,
  light/dark stylesheet, home page, `/blog/` index, two placeholder posts under `src/blog/`.
  Confirmed `npm install` + `npx eleventy` build clean and `npx eleventy --serve` hot-reloads.
- Everything else (Phases 1-5) not started.
- **Phase 0 review (2026-08-02), filed for later, not yet fixed:**
  1. **Bug** - homepage "Recent posts" list renders empty. Cause: `collections.blog | slice(0, 5)`
     in `src/index.md` - Nunjucks' `slice` filter is Jinja's chunking filter (split into N
     *groups*), not JS's `Array.slice` (first N items), so `slice(0, 5)` means "0 groups" and
     silently produces nothing. `/blog/`'s index page works because it loops the full collection
     with no slice call. Fix: add a custom Eleventy filter (e.g. `limit`) in `eleventy.config.js`
     that does `(arr, n) => arr.slice(0, n)`, use that instead of the built-in `slice` anywhere a
     "top N" list is needed (homepage recent-posts, and likely wherever Music/Video-Games reuse
     the same list pattern in later phases).
  2. **RETRACTED** - originally flagged the `src/index.md` tagline ("Not useless
     analysis!") as the corny-AI-tagline pattern to cut. Checked the live site: it's a
     real quote already on the production homepage, attributed to "Real Ronjan," not
     invented copy. Keep it as-is - see the "Homepage tagline" note above.
- **Priority note (2026-08-02):** this migration had been paused behind getting HTTPS
  working on two just-launched custom domains (`nielson.football` for just-stream-it,
  `fakebasketball.com` for the fakebasketball game). That's now resolved (both fully live
  on HTTPS - the fix was removing and re-adding the custom domain via the GitHub API to
  force a fresh cert request after both got stuck for hours). Migration is free to resume
  whenever - next step is picking the phase order back up, not yet decided.
