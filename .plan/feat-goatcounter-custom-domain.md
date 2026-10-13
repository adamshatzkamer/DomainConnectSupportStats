# goatcounter-custom-domain — iteration plan

**Branch:** feat/goatcounter-custom-domain **Started:** 2026-10-13 **Issue:** #73 (custom domain part)
**Goal:** page views reach GoatCounter from Brave with shields on, through a custom domain.

## Tasks

- [x] Custom domain from the maintainer: `dcss.dc.paulonet.eu`
- [x] `goatCounter` in `public/config.js` → custom domain endpoint
- [x] DEPLOYMENT.md "Runtime configuration", privacy page (`content/privacy.md`): name the host
- [x] e2e: `ENDPOINT` in `tests/e2e/analytics.spec.ts`, `ANALYTICS_HOSTS` in `tests/e2e/fixtures.ts`
- [x] Version (patch), CHANGELOG
- [~] Test with the maintainer: a page view from Brave (shields on) and one other browser reaches
      the dashboard; compare `domain-connect.goatcounter.com/count` in Brave
- [ ] Screenshots of the privacy page (desktop, phone), accepted
- [ ] `git rm -r .plan` in its own commit

## Findings

- PR #74 (0.21.0) merged: `count.v5.js` bundled in `public/goatcounter/`, card titles counted
  (#72, #73 closed). The endpoint is still `https://domain-connect.goatcounter.com/count`.
- Without the custom domain, Brave most likely still blocks the beacon to `*.goatcounter.com`
  (filter lists); untested. Other browsers count.
- PR #74 merged with `.plan/feat-analytics-titles.md` on `main`; this branch removes it.

- `dcss.dc.paulonet.eu` resolves to 65.21.71.180, but its TLS certificate is GoatCounter's
  (`CN=goatcounter.com`), no SAN for the custom domain: `curl https://dcss.dc.paulonet.eu/count`
  fails verification (2026-10-13). Counting works only once GoatCounter has its certificate.
- Unit, lint, analytics and documents e2e green with the new endpoint.

## Decisions

- Custom domain in a separate PR, once it is live.

## Corrections

## Open questions

- Certificate for `dcss.dc.paulonet.eu` (GoatCounter custom domain setting, maintainer).
