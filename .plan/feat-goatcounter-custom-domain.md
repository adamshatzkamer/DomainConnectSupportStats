# goatcounter-custom-domain — iteration plan

**Branch:** feat/goatcounter-custom-domain **Started:** 2026-10-13 **Issue:** #73 (custom domain part)
**Goal:** page views reach GoatCounter from Brave with shields on, through a custom domain.

## Tasks

- [~] Wait for the maintainer: custom domain live, its count URL
- [ ] `goatCounter` in `public/config.js` → custom domain endpoint
- [ ] DEPLOYMENT.md "Runtime configuration", privacy page (`content/privacy.md`): name the host
- [ ] e2e: `ENDPOINT` in `tests/e2e/analytics.spec.ts`, `ANALYTICS_HOSTS` in `tests/e2e/fixtures.ts`
- [ ] Version (patch), CHANGELOG
- [ ] Test with the maintainer: a page view from Brave (shields on) and one other browser reaches
      the dashboard; compare `domain-connect.goatcounter.com/count` in Brave
- [ ] Screenshots of the privacy page (desktop, phone), accepted
- [ ] `git rm -r .plan` in its own commit

## Findings

- PR #74 (0.21.0) merged: `count.v5.js` bundled in `public/goatcounter/`, card titles counted
  (#72, #73 closed). The endpoint is still `https://domain-connect.goatcounter.com/count`.
- Without the custom domain, Brave most likely still blocks the beacon to `*.goatcounter.com`
  (filter lists); untested. Other browsers count.
- PR #74 merged with `.plan/feat-analytics-titles.md` on `main`; this branch removes it.

## Decisions

- Custom domain in a separate PR, once it is live.

## Corrections

## Open questions

- Custom domain count URL (maintainer).
