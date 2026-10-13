# analytics-titles — iteration plan

**Branch:** feat/analytics-titles **Started:** 2026-10-13 **Issue:** #72, #73
**Goal:** card titles name the entity and reach GoatCounter; `count.js` served from the site.

## Tasks

- [x] Investigate titles, analytics, count.js
- [~] Unit tests first: `countView()`, bundled script, `cardTitle()`
- [ ] Implement analytics (no_onload, count once with path and title), title helper, views
- [ ] e2e: card titles, beacon path and title, script from the site, endpoint blocked
- [ ] Docs: REQUIREMENTS C-7, F-2.22; DEPLOYMENT (update count.js); privacy; TESTING; CLAUDE.md
- [ ] Version 0.21.0, CHANGELOG
- [ ] Real-release check, screenshots (privacy page)
- [ ] Custom domain endpoint in config.js, DEPLOYMENT, privacy (when live); Brave test with maintainer
- [ ] Promote findings, delete this file

## Findings

- `count.v5.js` is GoatCounter's newest versioned script (`count.v6.js` 404); ISC licence header.
- `count.v5.js` reads `window.goatcounter` settings (`no_onload`, `allow_local`, `path`, `title`)
  and `data-goatcounter-settings`; `goatcounter.count({path, title})` sends the beacon; the filter
  skips localhost unless `allow_local`.
- With `no_onload`, count.js's visibility wait and `bind_events` are skipped; the site has no
  click events; prerender is still filtered.
- Card views set `document.title` only on success: DnsProvider and Template only when named.

## Decisions

- Bundle `count.v5.js` as `public/goatcounter/count.v5.js`.
- Title fallbacks: DNS provider "Unnamed DNS provider" (id is internal, F-2.9), template
  "Unnamed template", stack and service provider their id.
- Not found, missing parameter, load error: counted with the page's static title.
- Endpoint stays `domain-connect.goatcounter.com` until the custom domain is live.

## Corrections

## Open questions

- Custom domain host for the endpoint (maintainer, before merge).
