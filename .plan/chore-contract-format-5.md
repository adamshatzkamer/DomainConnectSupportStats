# Export format_version 5 — iteration plan

**Branch:** chore/contract-format-5 **Started:** 2026-10-17 **Issue:** #78, #79
**Goal:** the site reads export `format_version` 5 only (4 and 5 breaking changes), every page
shows the new meaning of the counts, the new statuses and what each DNS provider serves.

## Tasks

- [x] Copy contract from Scanner `main` (dc99260, PR #284 merged): `docs/EXPORT_FORMAT.md`,
      `docs/METHODOLOGY.md`, `docs/schemas/`, `docs/examples/export/`
- [x] `SUPPORTED_FORMAT_VERSION` = 5, manifest test, `contract/README.md`
- [x] Ask the maintainer how to replace dropped columns and what new data to show
- [x] Types / lib: drop removed columns (`supported_templates`, `unsupported_templates`,
      `undetermined_templates`, `min/median/max_supported_templates_pct`, `supporting_providers`
      in `templates.json`, `versions`), read `supported_count`/`*_pct`/`undetermined_*` from the export
- [x] Status badges: settings `ok`/`failed` (+ `settings_error_kind`), support
      `ok`/`partial`/`error`/`dead`, answered/failed probe counts
- [x] DNS providers list: per-template counts from the export, statuses, caveats
- [x] DNS provider card: statuses, support counts, served counts, served columns per supported template
- [x] Stacks list and card: distribution from `min/median/max_supported_pct`, summed served counts,
      deployments table
- [x] Templates list: `supported_count` replaces `supporting_providers`
- [x] Template card: served version, response kind, match per supporter; `served` table; drop `versions`
- [x] Service provider card: drop `versions`
- [x] Leaderboards: `supported_count` replaces `supported_templates` (dns-providers rows)
- [x] Methodology page texts follow new METHODOLOGY.md (page bakes the file; check hand-written texts)
- [x] Tests (unit, component, contract, e2e) against the new example export
- [x] Docs (REQUIREMENTS.md, CLAUDE.md), version (minor) + CHANGELOG
- [~] Real-release check (data repo needs v5), screenshots, maintainer acceptance
- [ ] Promote findings, delete this file

## Findings

- Scanner #276 merged 2026-10-16, #284 merged 2026-10-17; Scanner `main` dc99260 exports
  `format_version` 5 (`contract/export/schemas/export/manifest.schema.json` `const: 5`).
- With only `SUPPORTED_FORMAT_VERSION` = 5: 17 of 427 Vitest tests fail (7 files).
- v5 `dns-providers.json` columns: `support_answered`, `support_failed`, `undetermined_count`,
  `undetermined_pct`, `with_version_count`, `full_template_count`, `morphed_count`,
  `outdated_count` added; `supported_templates`, `unsupported_templates`,
  `undetermined_templates` removed. `supported_templates` stays in `stacks.json` and in
  `support_history`.
- `npm run verify` green: 436 Vitest, 423 Playwright (share.spec "absolute image" failed once,
  passed on rerun: 42/42).
- Production data repo (`statsdata/providers`, 2026-10-17T05:00:03Z) is still `format_version` 2:
  real-release check waits for the Scanner rollout (DomainConnectScanner#277).
- Methodology anchors used by the site (`52-support-probe`, `61-status-values`, ...) still exist.

## Decisions

- No v2/v3/v4 fallback (issues #78, #79): data ships first.
- Version: minor (new visible content: served templates, probe counts).
- Maintainer (2026-10-17):
  - DNS providers list, DNS provider card, stack deployments: SUPPORTED / NOT SUPP. /
    UNDETERMINED swap 1:1 to the export's `*_count` / `*_pct`; the site stops computing shares.
  - Templates list: `supported_count` replaces `supporting_providers`; shares stay of the DNS
    providers supporting at least one template, NOT SUPP. the rest. No visible change.
  - `versions` → one "Served" column (DNS provider card supported templates, template card
    supporters): version + kind/match, e.g. `v2 · full, morphed`; repository version in the
    hover; `null` = not recorded yet; kept at phone width. DNS provider card at phone width:
    service provider, template, served (supported since left out: 4 columns overflowed by 50 px).
  - Template card: Version stat card detail "N of M supporters serve it" (`current_version_count`
    of `supporters`); "Served templates" record panel with the six `served` counts.
  - Status badges: OK; Failed (settings `failed`, support `error`); Partly failed (`partial`);
    Given up (`dead`, settings `failed` + `settings_error_kind` `dead` on the card); Not checked
    yet (`null`). Hover: raw value, latest completed run, may be weeks old.
  - Probe counts: muted line under the SUPPORT badge in the list and stack deployments
    ("12 answered, 3 failed", failed left out at 0); on the DNS provider card too.
  - Served counts per DNS provider / stack: cards only, a "Served templates" record panel
    (with version, full template, morphed, outdated; count and % of supported). Lists unchanged.
  - Stacks: bar and Median card from `min/median/max_supported_pct`, wording "across deployments
    with probe answers".
- Leaderboards: `supported_count` replaces `supported_templates` of `dns-providers.json` (same meaning).

## Corrections

## Open questions
