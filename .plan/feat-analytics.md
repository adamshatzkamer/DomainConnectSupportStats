# feat/analytics: GoatCounter page views (#13)

## Tasks

- [~] `src/lib/analytics.ts`: endpoint from `DC_STATS_CONFIG.goatCounter` (https only), counted
      path (page + card id), script injection; unit tests
- [ ] Call from `mountPage`; `public/config.js` sets the endpoint
- [ ] e2e: analytics hosts blocked in every test; pages work with them blocked; counted path
- [ ] Methodology privacy note; REQUIREMENTS.md C-7 and §4; DEPLOYMENT.md runtime config; CLAUDE.md
- [ ] 0.20.0, CHANGELOG
- [ ] verify, screenshots (methodology), PR

## Decisions (maintainer)

- GoatCounter, account `domain-connect.goatcounter.com`, endpoint `/count`.
- `count.js` from the CDN `gc.zgo.at` (C-7 allows it for the analytics service).
- No tracking pixel: pages don't work without JavaScript.
- Path: page file name plus card id only (`id`; template `spid`, `sid`); list filters, anchors and
  the site base path dropped.
- Counts private (no public dashboard link).
- On through the shipped `public/config.js` (`goatCounter`); removing the line turns it off.
  Localhost hits are skipped by `count.js`; e2e blocks the hosts.
- Version: minor (0.20.0).

## Findings

- `.agent-sync.yml` from `chore/contract-registry` (#68) was stale: PR #69 merged 2026-10-11.
  Removed with the maintainer's consent.
- Every entry mounts through `src/lib/mount.ts` `mountPage`: one place to start counting.
- GoatCounter: `window.goatcounter.path` set before `count.js` loads overrides the path
  (help/path); referrer is taken automatically.
