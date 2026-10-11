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
- [x] Step 2: cards
  - `src/lib/registry/schema.ts`: `label(path)` (title, description; through `items`, `$ref`),
    `FEATURE_GROUPS`/`FEATURES` from the schema (flags under `features` first, no group header;
    then one group per object; arrays with `items.properties.key` are list features)
  - `parseEntry`: `exampleDomain`, mode `other`, `updateSchedule`, `modeDescription`,
    `costDetails`, `agreementRequired`/`agreementUrl`, `partners`, contact type `form`,
    `features` (flags) and `featureLists` (null unknown, [] none)
  - `RegistryTerm.svelte`: `<dt>` with schema title, description as `title`
  - `Registry`: example domain (+ "settings response" link via `settingsUrl` prop), onboarding
    rows in schema order, partners, feature groups with descriptions on hover, list feature
    `key: description` or "none"; `RegistryContact`: schema titles ("Onboarding process
    documentation" composed)
  - `links.settingsUrl(apiUrl, domain)`; DnsProvider passes it only when `r.stack` is null
  - Tests: component, unit (`registry-schema.test.ts`), e2e (settings link on DNS provider 1,
    none on the stack card)
- [~] Step 3: docs (REQUIREMENTS F-1a/F-3.6, CLAUDE.md, DEPLOYMENT.md, TESTING.md,
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
- After step 2: `npm test` 400 passed; `npm run test:e2e` 373 passed, 5 skipped.
- Ajv never checked formats (no ajv-formats); now `validateFormats: false` silences the
  warnings; patterns do the checking.

## Decisions

- Fixture: `provider.example`, `cloudflare.com`, `ionos.com`, `plesk.com`, `domainchief`,
  `vercel.com`, `aruba.it`; verbatim, not anonymised; list in the script.
- One PR, branch `chore/contract-registry`, minor bump.
- Bundled entry is the site's own format: `logo` rewritten to the published file name.
- URL logo download: https only, 10 s timeout, ≤ 1 MB, content type `image/svg+xml`,
  `image/png` or `image/jpeg` (extension from it).
- Schema descriptions on hover.
- `links`, `consent` not shown.
- Mode shown as its text from the schema description (`enumTexts`), the raw value on hover; feature labels are the schema titles (e.g. "Asynchronous flow").
- Step 3 docs: add `RegistryTerm`, `schema.ts`, `settingsUrl` to CLAUDE.md.

## Corrections

- Mode shown raw → maintainer: human-friendly text from the schema's mode description.
- The fixture has no HTML in notes any more (real data); the component test uses an inline entry.

## Open questions
