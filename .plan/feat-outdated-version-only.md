# Outdated badge for version-only answers — iteration plan

**Branch:** feat/outdated-version-only **Started:** 2026-10-20 **Issue:** #84
**Goal:** Version column shows Outdated when `template_match` is null and the served version is below the repository's.

## Tasks

- [x] Investigate `servedLabel` (src/lib/served.ts)
- [x] Failing unit test for version-only outdated
- [x] Implement in `servedLabel`
- [x] Docs (REQUIREMENTS F-2.22), version 0.22.2, CHANGELOG
- [~] Verify, screenshots
- [ ] Promote findings, delete this file

## Findings

- Badge comes from `template_match` only (`src/lib/served.ts` `servedLabel`).
- Example export has no version-only answer below the repository version (all `response_kind: "version"` rows serve the repository version), so e2e cannot show it; unit tests cover it.

- `npm run verify` green: 437 Vitest, 423 Playwright.
- Real release 2026-10-20T05:00:03Z: 6206 files valid. google.com/domain-verification shows Outdated for GoDaddy (1 < 3), IONOS (0 < 3), Secure Server (1 < 3); its Served templates "Outdated" stays 1 (export count).

- Real-release e2e: 198 passed, 5 skipped, the rest fail on example values (names, counts); no page errors or blank pages. Phone-width table overflow (DNS providers +28px, stack +103px, templates +13px) is #81.

## Decisions

- Hover text reuses the `outdated` text.
- Served counts unchanged.

## Corrections

## Open questions

- Version level: patch assumed.
