# Outdated badge for version-only answers — iteration plan

**Branch:** feat/outdated-version-only **Started:** 2026-10-20 **Issue:** #84
**Goal:** Version column shows Outdated when `template_match` is null and the served version is below the repository's.

## Tasks

- [x] Investigate `servedLabel` (src/lib/served.ts)
- [~] Failing unit test for version-only outdated
- [ ] Implement in `servedLabel`
- [ ] Docs (REQUIREMENTS F-1a served), version, CHANGELOG
- [ ] Verify, screenshots
- [ ] Promote findings, delete this file

## Findings

- Badge comes from `template_match` only (`src/lib/served.ts` `servedLabel`).
- Example export has no version-only answer below the repository version (all `response_kind: "version"` rows serve the repository version), so e2e cannot show it; unit tests cover it.

## Decisions

- Hover text reuses the `outdated` text.
- Served counts unchanged.

## Corrections

## Open questions

- Version level: patch assumed.
