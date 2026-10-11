# Export contract format 2 — iteration plan

**Branch:** chore/contract-format-2 **Started:** 2026-10-11 **Issues:** #60, #59, #61, #62
**Goal:** the site reads export `format_version` 2 and uses its new keys: since from the first
supported version (#60), template since and supporting DNS providers (#59), stack template support
(#61), not supported / not yet determined templates (#62); derived template and stack data gone.

One PR, steps with pauses for a context reset (mutex and branch kept).

## Tasks

- [x] Step 1 (#60): vendor contract, `SUPPORTED_FORMAT_VERSION = 2`, contract/README.md format 2;
      template card shows the export's supporters `since` (no duplicate column); "Supported since"
      footnote on DNS provider and template cards; REQUIREMENTS.md F-1a, F-1c; version 0.18.0 +
      CHANGELOG
- [~] Step 2 (#59): templates list from `service_templates.supporting_providers`; drop
      `deriveTemplates()`, `templatesSupport()`, `templateSupporters()`, `withSince()`, types,
      tests; docs (issue #59 "Do" list)
- [ ] Step 3 (#61): stacks list and stack card from `*_supported_templates_pct`; drop
      `deriveStacks()`, `stacksSupport()`, `withStackSupport()`, `templateShares()`, types, tests,
      e2e route; compare the export's definition with F-2.21 (issue #61 "Do" list)
- [ ] Step 4 (#62): `unsupported_templates`, `undetermined_templates` on DNS provider card, list,
      stack deployments; caveats; F-1a, F-1b, F-2.21 (issue #62 "Do" list)
- [ ] Real-release check, screenshots (desktop + phone) of every affected page, `npm run verify`
- [ ] Promote findings, close issues via PR, `git rm -r .plan`

## Findings

- Live data repo (`pawel-kow/DomainConnectSupportStatsData`, `statsdata/providers`) is on
  `format_version` 2, `schema_version` 16, `generated_at` 2026-10-11T05:00:02Z. Deploy run
  38127916217 failed: `manifest.json: /format_version must be equal to constant`.
- That release validates against the new vendored schemas: `5874 file(s) valid`.
- Format 2 vs 1 (EXPORT_FORMAT.md "History of format_version"): only `since` of DNS provider card
  `supported_templates` changed meaning; everything else is additive (`unsupported_templates`,
  `undetermined_templates`, `*_supported_templates_pct`, `supporting_providers`, template card
  `supporters.since`). New `schemas/config-host-interval-list.schema.json` is unused by the site.
- Real release vs 2026-10-09 (format 1): 45,708 DNS provider/template rows; 137 `since` moved
  earlier, 0 later, 44,993 same; all 137 on DNS provider 11 (AS207960 Cyfyngedig), e.g.
  `atons.ai/email` v1,2 2026-10-03 → 2026-09-20. 257 rows have more than one version.
- Template card supporters: 45,708 rows, none with `since` null.
- With only the format bump, `withSince()` (`src/lib/templates.ts:86`) would add a second `since`
  column next to the export's.
- `npx vitest run` with the new contract and format 1: 13 failures (UnsupportedFormatError).

## Decisions

- Scope: #59–#62 together in this PR (maintainer).
- Footnote below the supported templates / supporters tables: first support of any version; new
  versions and gaps don't move it (maintainer).
- Version: minor, 0.18.0 (maintainer).
- "First scan" badge (F-2.13) text unchanged: a pre-start `since` still means supported on the
  first scan.

- Step 1 done: `npx vitest run` 388 passed; `npm run test:e2e` 371 passed, 5 skipped; lint, check,
  check:version clean. `withSince()` and its tests are gone; `Template.svelte` shows the export's
  supporters table as is. Footnote `data-testid="since-caveat"`, shared `.caveat` class in
  `styles.css`.
- Still to remove in step 2: `deriveTemplates()` still writes the per-template files and
  `templates.json`; `ExportClient.templateSupporters()` is now unused; REQUIREMENTS.md F-4.5 no
  longer mentions the per-template files. Real release for checks: clone
  `https://github.com/pawel-kow/DomainConnectSupportStatsData` (release in `statsdata/providers`).

## Corrections

## Open questions
