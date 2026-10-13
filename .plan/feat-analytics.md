# feat/analytics: GoatCounter page views (#13), privacy and imprint pages (#39)

## Tasks

- [x] `src/lib/analytics.ts`: endpoint from `DC_STATS_CONFIG.goatCounter` (https only), counted
      path (page + card id), script injection; unit tests
- [x] Call from `mountPage`; `public/config.js` sets the endpoint
- [x] e2e: analytics hosts answered empty in every test; pages work with them blocked; counted path
- [x] REQUIREMENTS.md C-7, F-2.22 and §4; DEPLOYMENT.md runtime config; CLAUDE.md
- [x] `privacy.html`, `imprint.html` from `content/*.md` (build-time Markdown, `MarkdownDoc`),
      footer links; methodology privacy note removed; docs, e2e
- [x] 0.20.0, CHANGELOG
- [~] verify, screenshots (methodology, privacy, imprint, footer), PR
- [x] Imprint personal data from `CONTENT_VALUES` (GitHub variable, JSON) into `{{ key }}` placeholders at build; deploy requires it
- [ ] Maintainer sets `CONTENT_VALUES` (`FULL NAME`, `EMAIL`)

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
- Privacy notice is its own page linked from the footer, done with #39 (imprint) in this PR; both
  texts are editable Markdown files; imprint has placeholders for personal data.

## Findings

- `.agent-sync.yml` from `chore/contract-registry` (#68) was stale: PR #69 merged 2026-10-11.
  Removed with the maintainer's consent.
- Every entry mounts through `src/lib/mount.ts` `mountPage`: one place to start counting.
- GoatCounter: `window.goatcounter.path` set before `count.js` loads overrides the path
  (help/path); referrer is taken automatically.
