# Registry format alignment — iteration plan

**Branch:** chore/contract-registry **Started:** 2026-10-11 **Issue:** #68
**Goal:** the site validates, bundles and shows entries of the current registry format
(upstream `1be4041`), logos decoded at deploy, labels from the schema.

## Tasks

- [x] Step 1: contract and deploy (commits f6beabb..62ffe78)
  - `scripts/contract-registry.ts` + `vendorRegistry`, `FIXTURE_PROVIDER_IDS` in `scripts/registry.ts`
  - `validateRegistry` decodes embedded logos (`decodeLogo`, `imageFormat`); `bundleRegistry` is
    async, returns `{published, warnings}`, `fetchLogo` for URL logos, `bundledEntry` rewrites `logo`
  - `servedRegistryFile` used by the vite middleware (`/registry/` serves only bundled files and
    `registry.json`)
  - `parseEntry` without `formUrl`, `partner`; tests read the golden copy through
    `servedRegistryFile` (the site's input)
- [~] Step 2: cards
  - [ ] Labels and descriptions from the vendored schema (build time); features from the schema
  - [ ] Onboarding details (mode other, update schedule, cost details, agreement, partners)
  - [ ] Settings response group (non-standard list, empty = none); contact type `form`
  - [ ] Example domain: text; settings link on a DNS provider card with its own entry and `api_url`
  - [ ] Component and e2e tests
- [ ] Step 3: docs (REQUIREMENTS F-1a/F-3.6, CLAUDE.md, DEPLOYMENT.md, TESTING.md,
      contract/README.md), minor version, CHANGELOG, real-release check, screenshots, PR
- [ ] Promote findings, delete this file

## Findings

- Upstream `main` `1be4041`: `logo` is URL or `{format: svg|png|jpg, data}` (gzip, base64,
  starts `H4sI`); logo files not allowed. Vendored schema (`37e4894`) takes a file name only, so
  `validate:registry` fails on every embedded logo — deploys of data releases fail.
- Upstream adds `exampleDomain`, mode `other` + `modeDescription`, `updateSchedule`,
  `costDetails`, `agreementRequired`/`agreementUrl`, `partners[]` with contacts, contact type
  `form`, `features.settings.*`, `links[]`, `consent`; removes `formUrl`, `partner`. Every
  property has `title`, most `description`.
- Upstream entries: 25 real + `provider.example`; logos: 9 PNG, 1 JPG (`vercel.com`), 1 SVG
  (`provider.example`), 14 none; no URL logo; no mode `other`.
- Example export stacks: `cloudflare.com`, `ionos.com`, `plesk.com`, `quiet-host.example`.

- `npm run bundle:registry` on upstream `1be4041`: 25 entries, 36 files, no warnings.
- `npm test` 382 passed; `npm run test:e2e` 371 passed, 5 skipped (after step 1).
- Ajv never checked formats (no ajv-formats); now `validateFormats: false` silences the
  warnings; patterns do the checking.

## Decisions

- Fixture: `provider.example`, `cloudflare.com`, `ionos.com`, `plesk.com`, `domainchief`,
  `vercel.com`, `aruba.it`; verbatim, not anonymised; list in the script.
- One PR, branch `chore/contract-registry`, minor bump.
- Bundled entry is the site's own format: `logo` rewritten to the published file name.
- URL logo download: https only, 10 s timeout, ≤ 1 MB, content type `image/svg+xml`,
  `image/png` or `image/jpeg` (extension from it).
- Schema descriptions on hover; mode values shown raw, the mode description on hover.
- `links`, `consent` not shown.

## Corrections

- The fixture has no HTML in notes any more (real data); the component test uses an inline entry.

## Open questions
