# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project Overview

**Static, stateless statistics site** on [Domain Connect](https://www.domainconnect.org/) support
across the DNS providers hosting real domains. It renders the static JSON export of the Domain
Connect Scanner (pawel-kow/DomainConnectScanner, `export.py`) and is published on GitHub Pages.
Look and feel: the Templates statistics dashboard at https://stats.domainconnect.org. DNS provider and stack cards also show
the provider's entry in the DNS provider registry (`registry/`).

No backend, no write path: every page is a static HTML file that fetches the export's JSON files.

## Writing

All text (docs, comments, commits, PRs, issues, UI) is concise: facts in short words; rationale
only when far from obvious; never alternatives or justification by contrast; current state only,
no references to issues, requirement ids, dates or history. History: [CHANGELOG.md](CHANGELOG.md).
Details: [DEVELOPING.md](DEVELOPING.md) §1.

## The external inputs: the contracts

[contract/](contract/) holds verbatim copies of two contracts ([contract/README.md](contract/README.md)):

- `contract/export/`: the Scanner's export contract.
  [contract/export/EXPORT_FORMAT.md](contract/export/EXPORT_FORMAT.md) (every file, table and
  column; **the reference for page work**), `schemas/` (JSON Schemas), `examples/export/`
  (complete example release; dev data set and test fixture).
- `contract/registry/`: the DNS provider registry contract.
  [contract/registry/REGISTRY_FORMAT.md](contract/registry/REGISTRY_FORMAT.md) (layout, entry
  format), `schema/` (validation uses this one only), `examples/` (golden copy; test fixture).

- **Never read, copy or depend on DomainConnectScanner source code.** What the contract doesn't
  say is a question for the maintainer or a Scanner issue.
- **Never edit `contract/` by hand.** It is replaced by a PR ([contract/README.md](contract/README.md)).
- Rules for every page (details in EXPORT_FORMAT.md):
  - read `manifest.json` first; build every file URL from `manifest.files.<kind>.path` and the id
    encoding (`src/lib/data/manifest.ts`, `encode.ts`); never hard-code paths;
  - find tables by **id**, never position or title (template cards: suffix after the last `/`,
    `findTable`);
  - **ignore unknown** files, tables, columns and keys; never depend on key order;
  - `null` is "unknown", **never zero**: show `–`, draw a gap, sort it last;
  - percentages arrive unrounded; round for display only;
  - domain figures show as % of the scanned domains only, counts and scan on hover
    (`DomainShare`, `domains.ts`); dates show the day, the full UTC time on hover (`Timestamp`,
    `cellTitle`);
  - text values come from third parties: never render them as HTML (`{@html}` is a lint error);
  - show `notes` verbatim; show `generated_at`, the domain-share import and the support sweep on
    every page (`Layout` annotation, `annotation.ts`);
  - import series and sweep series run on two clocks (`src/lib/series.ts`);
  - tables keep only the columns that fit at phone width (`phoneKeys`); ask the maintainer which
    when not obvious;
  - one analytics service (GoatCounter, `analytics.ts`); no other third-party requests;
  - tables that can grow long have a filter and 20-row pages (`searchable`, `pageSize`).

## Architecture

```
src/pages/<page>.html      one HTML entry per page (Vite multi-page build)
src/entries/<page>.ts      mounts the page's view into #app
src/views/*.svelte         one view per page (Overview, DnsProvider, Document, ...)
src/lib/components/        shared UI: Layout (header/nav/footer), DataTable, TimeChart, StatCard,
                           NotFound, LoadError, Notes, CardTitle, Panel, ShareMenu,
                           RegistryContact, Registry, RegistryTerm, ContactList, ExternalLink, StatusBadge,
                           Board, NewSupporters, Unavailable, DomainShare, Timestamp,
                           MarkdownDoc, Served, ServedCounts
src/lib/data/              the contract in code: types, id encoding, manifest paths, loader
                           (ExportClient), table lookup, data and registry base URL config,
                           derived data types
src/lib/registry/          the registry in code: entry path, entry parsing, schema labels, loader
                           (RegistryClient)
src/lib/*.ts               pure helpers: format (numbers, dates), cells (column formatting,
                           sort, filter), series (two clocks), links (page URLs), params (query)
src/lib/styles.css         global styles, brand tokens (from stats.domainconnect.org)
content/                   the site's own texts (privacy, imprint), Markdown rendered at build time;
                           `{{ key }}` placeholders filled from `CONTENT_VALUES` (personal data stays
                           out of git)
public/                    copied as is: brand assets, config.js (runtime config), GoatCounter count.js
scripts/                   Node scripts (Node TS type stripping): release and registry
                           validation and bundling, derived data, version/CHANGELOG check,
                           release notes
contract/                  vendored contracts: export/ (Scanner export), registry/ (DNS provider registry)
registry/                  git submodule: the test registry repository (dev registry)
tests/                     unit/, contract/, component/ (Vitest), e2e/ (Playwright)
```

Pages and their data (EXPORT_FORMAT.md "Pages"). Query parameters carry raw ids and filters only;
every view is a shareable link:

| Page                                             | Data                                                | State |
| ------------------------------------------------ | --------------------------------------------------- | ----- |
| `index.html`                                     | `overview.json`, `derived/ecosystem.json`           | built |
| `dns-providers.html` (`?stack=`, `&q=`, `&all=`) | `dns-providers.json`                                | built |
| `stacks.html`                                    | `stacks.json`                                       | built |
| `service-providers.html` (`?q=`)                 | `service-providers.json`                            | built |
| `templates.html` (`?spid=`, `&q=`, `&all=`)      | `templates.json`                                    | built |
| `dns-provider.html?id=`                          | `dns-providers/{dns_provider_id}.json`, registry    | built |
| `stack.html?id=`                                 | `stacks/{provider_id}.json`, registry               | built |
| `service-provider.html?id=`                      | `service-providers/{service_provider_id}.json`      | built |
| `template.html?spid=&sid=`                       | `templates/{service_provider_id}/{service_id}.json` | built |
| `leaderboards.html` (`?window=`)                 | the four lists, `derived/leaderboards.json`         | built |
| `methodology.html`                               | `manifest.json`, `contract/export/METHODOLOGY.md`   | built |
| `privacy.html`, `imprint.html`                   | `content/privacy.md`, `content/imprint.md`          | built |

A card page with a missing parameter or a 404 shows `NotFound` linking to its list; any other load
failure shows `LoadError`; a section that loads on its own (leaderboard panels) shows `Unavailable` instead. Never a blank page. Card layout: REQUIREMENTS.md F-1a. Leaderboards:
F-4; the overview shows four charts (F-1.1) and also new supporting DNS providers and the most improved top 5.

**Data location.** Default `./data/`. Build time: `VITE_DATA_BASE_URL`. Runtime:
`window.DC_STATS_CONFIG.dataBaseUrl` in `config.js` (`src/lib/data/config.ts`). `vite dev` and
`vite preview` serve `/data/` from `DATA_DIR` (default: the contract's example export).

**Derived data.** `scripts/derive.ts` collects what the export spreads over its cards into
`<data>/derived/`: `leaderboards.json` (first support per DNS provider) and `ecosystem.json` (templates per scanned domain per full sweep);
the deploy runs it after bundling the release. The site rejects a derived file when its
`generated_at` differs from the manifest's.
`vite dev`/`preview` serve `DERIVED_DIR` (default `.derived/`, written by `npm run derive`) as
`/data/derived/`.

**Registry location.** Default `./registry/`. Build time: `VITE_REGISTRY_BASE_URL`. Runtime:
`window.DC_STATS_CONFIG.registryBaseUrl`. Entry `registry/<a>/<b>/<encoded providerId>.json`,
logo file next to it (decoded or downloaded at bundling), `registry.json` `{repository, commit}` (footer, entry link). `vite dev` and
`vite preview` serve `/registry/` from `REGISTRY_DIR` (default: the `registry/` submodule;
e2e: `contract/registry/examples/`).

**Version.** `package.json` `version`, injected at build time as `__APP_VERSION__`, shown in the
footer.

**Deployment.** Merging a new version to `main` tags `v<version>`, waits for approval in
environment `release`, then deploys. Data releases (`workflow_dispatch` from the data repo's `notify-site`,
daily, manual) redeploy the latest GitHub Release with the current data and registry.
`deploy.yml` validates the release against `contract/export/schemas/export/`, bundles it into
`dist/data/` and derives `dist/data/derived/`, and the registry (`REGISTRY_REPO`, checked out into `registry/`) against
`contract/registry/schema/` into `dist/registry/`.
[DEPLOYMENT.md](DEPLOYMENT.md).

## Development Commands

```bash
git submodule update --init             # dev registry (devcontainer postCreate does this)
npm ci                                   # install (devcontainer postCreate does this)
npm run dev                              # dev server on :5173 with the example export, dev registry
DATA_DIR=../data-repo npm run dev        # ... against a real release
REGISTRY_DIR=../registry npm run dev     # ... against a registry checkout
npm run build                            # dist/ (site only, no data)
CONTENT_VALUES='{"EMAIL":"…"}' npm run build  # ... with the content placeholders filled
npm run preview                          # serve dist/ on :4173 with DATA_DIR under /data/

npm test                                 # Vitest: unit + contract + component
npm run test:e2e                         # Playwright: builds, previews, desktop + mobile
npm run lint                             # ESLint + Prettier check (npm run format to fix)
npm run check                            # svelte-check / TypeScript, warnings fail
npm run check:version                    # package.json version has a CHANGELOG section
npm run verify                           # all of the above, the pre-PR gate

npm run validate:export -- <releaseDir>  # validate a release against the vendored contract
npm run bundle:data -- <releaseDir> dist # validate + copy a release into dist/data/
npm run derive -- [releaseDir] [outDir]  # derived data (default: DATA_DIR or example → DERIVED_DIR or .derived/)
npm run validate:registry -- <dir>       # validate a registry (default registry/, the dev registry)
npm run bundle:registry -- <dir> dist <owner/name> <commit>  # validate + copy into dist/registry/
npm run contract:registry -- <checkout>  # replace contract/registry/ from a registry checkout
npm run release:notes -- <version>       # print the CHANGELOG section of a version
```

## Working on This Repository (agents)

Full rules: [DEVELOPING.md](DEVELOPING.md) §3.

1. **Branch mutex first** (§3.1): if `.agent-sync.yml` exists, stop and poll every 15 minutes.
   Otherwise create it atomically with `timestamp`/`branch`/`issue`, sync `main` with `origin`,
   branch. Never commit it; remove it when finished and back on `main`.
2. **Plan** (§3.11): before changing code, write `.plan/<branch-or-topic>.md` (tasks, findings
   with evidence, decisions, corrections, open questions), commit and push it, keep it current,
   exactly one task `[~]`.
3. **Version** (§3.10): a PR that changes the site bumps `package.json` and adds a CHANGELOG
   section. Major: page or URL parameter removed/changed incompatibly. Minor: new page, feature or
   visible content. Patch: fixes, styling, dependencies. Docs/tests/CI only: no bump. **Ask the
   maintainer when the level is not obvious.**
4. **Screenshots** (§3.6): a PR that changes a page, component or style shows screenshots of every
   affected page (desktop and phone) to the maintainer in the chat; it is marked ready only after
   acceptance.
5. **Before merge:** defects found but not fixed → GitHub issue (`bug` or `refactoring` plus a
   `severity: *` label); behavioural decisions → REQUIREMENTS.md; rationale, if needed → commit
   message. Then `git rm -r .plan` in its own commit (CI fails otherwise).

Open defects and follow-up work are GitHub issues, not markdown.

The contracts are inputs (§3.9): updates arrive verbatim in a `chore/contract-*` PR; data the
contracts lack is a question for the maintainer.

**Git in the devcontainer:** `origin` is SSH and no key is available; use HTTPS with `gh`
credentials:
`git -c url.https://github.com/.insteadOf=git@github.com: -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`.
Pushing `.github/workflows/` changes needs a token with the `workflow` scope.

## File Reference

- `src/lib/data/encode.ts`: id ↔ path-segment encoding
- `src/lib/data/manifest.ts`: `SUPPORTED_FORMAT_VERSION`, `filePath()` from manifest path templates
- `src/lib/data/load.ts`: `ExportClient` (manifest once, files by kind + raw ids, derived data `leaderboards()`, `ecosystem()`, `NotFoundError`, `ReleaseMismatchError`)
- `src/lib/data/config.ts`: data and registry base URL precedence (runtime → build time → `./data/`, `./registry/`); `shareBaseUrl` (shared links, else the browser's URL)
- `src/lib/data/tables.ts`: `findTable()` by id (template-card suffix), `oneRecord()`
- `src/lib/data/types.ts`: types of the export (only what the site reads)
- `src/lib/data/derived.ts`: types of the derived data (`leaderboards.json`, `ecosystem.json`), shared with `scripts/derive.ts`
- `src/lib/registry/path.ts`: `registryPath()` (`<a>/<b>` folder), `entryPath()`
- `src/lib/registry/entry.ts`: `parseEntry()` (registry entry, unknown values as `null`), `parseSource()`
- `src/lib/registry/schema.ts`: `label()` (schema title, description), `enumTexts()`, `FEATURE_GROUPS`/`FEATURES` from the schema
- `src/lib/registry/load.ts`: `RegistryClient` (entry, logo URL, `registry.json` once), `entryFileUrl()`
- `src/lib/dns-providers.ts`: DNS providers list (stack filter, rows hidden by default, status badges, `probeCounts()`)
- `src/lib/templates-list.ts`: templates list (service provider filter, never-probed rows hidden by default, `withSupport()` support columns from `supported_count`)
- `src/lib/served.ts`: what supporting DNS providers serve: `servedLabel()` (version, response kind, match), `servedCounts()`, `templateServedCounts()`, `supportedPairs()`; shown by `Served.svelte`, `ServedCounts.svelte`
- `src/lib/domains.ts`: domain figures' hover text (`scanLabel`, `shareScan`, `domainsTitle`, `ofScanned`)
- `src/lib/supporting.ts`: DNS providers supporting at least one template (overview `ecosystem`), shares of them, `templateCount()`
- `src/lib/overview-facts.ts`: `overviewFacts()`: scan and supporting DNS providers for pages other than the overview
- `src/lib/paging.ts`: page count, rows and range of a paginated table
- `src/lib/service-providers.ts`: service provider card (one series per template, default chart selection)
- `src/lib/leaderboards.ts`: boards (one row per DNS provider, top 10, ties, `?window=`), new supporting DNS providers, display rows
- `src/lib/annotation.ts`: data annotation (sweep a page reflects, import completion time)
- `src/lib/templates.ts`: template card (records as type, host and details, history caveat, table titles, `withSince()`)
- `src/lib/share.ts`: shared link, post text, share target URLs, Mastodon instance (validation, `localStorage`), `absoluteOgImage()`
- `src/lib/analytics.ts`: GoatCounter page views (`goatCounter` in `config.js`, bundled `public/goatcounter/count.v5.js`, `countedPath()`: page and card id), started by `mount.ts`; cards `countView()` once titled
- `src/lib/title.ts`: `pageTitle()` (`<name> - <kind> - Domain Connect Support Statistics`)
- `src/lib/share-icons.ts`: share target logos (Simple Icons paths, brand colours)
- `src/lib/components/Panel.svelte`: chart and table panel (anchor, `#` link, share menu, scroll and highlight); `ShareMenu.svelte`: the share menu
- `src/lib/format.ts`, `cells.ts`, `series.ts`, `links.ts`, `params.ts`: pure display/series/URL/query helpers (`safeUrl`, `safeMailto` for URLs from the data; `isPublicKey` hides internal ids; `settingsUrl` for a registry example domain)
- `src/lib/components/`: shared Svelte components
- `src/lib/styles.css`: global styles, brand tokens
- `src/views/`: page views; `src/pages/`: HTML entries; `src/entries/`: mount scripts
- `src/env.d.ts`: build-time constants (`__APP_VERSION__`)
- `public/config.js`: optional runtime config (`window.DC_STATS_CONFIG`)
- `scripts/markdown.ts`: Markdown → HTML (GitHub heading ids, raw HTML escaped); `vite.config.ts` bakes METHODOLOGY.md into `methodology.html` and `content/<name>.md` into pages with `<!-- content:<name> -->`; `MarkdownDoc.svelte` shows it
- `scripts/export-release.ts`: `validateRelease()` (schemas, one `generated_at`, counts, card presence)
- `scripts/validate-export.ts`, `scripts/bundle-data.ts`: CLIs over it, used by CI and deploy
- `scripts/derive.ts`: `deriveLeaderboards()` (first support per DNS provider), `deriveEcosystem()` (templates per scanned domain per full sweep); CLI `derive-data.ts`, used by deploy and e2e
- `scripts/registry.ts`: `validateRegistry()` (schema, entry path, embedded logo), `bundleRegistry()` (logos decoded or downloaded into files), `servedRegistryFile()` (dev/preview), `vendorRegistry()` (`FIXTURE_PROVIDER_IDS`); CLIs `validate-registry.ts`, `bundle-registry.ts`, `contract-registry.ts`
- `scripts/content.ts`: `CONTENT_VALUES` (JSON) → `{{ key }}` placeholders of `content/*.md`; with values set, a missing one fails the build
- `scripts/changelog.ts`: CHANGELOG parsing; `scripts/check-version.ts`, `scripts/release-notes.ts`: CLIs over it
- `vite.config.ts`: multi-page inputs, relative base, `__APP_VERSION__`, `/data/` and `/registry/` dev/preview middleware, Vitest config
- `playwright.config.ts`: e2e against `vite preview`, desktop + mobile
- `.github/workflows/ci.yml`: PR/push gates, `.plan/` merge gate
- `.github/workflows/deploy.yml`: tag on merge, approval, Pages deploy
- `contract/export/`: vendored export contract; `contract/registry/`: vendored registry contract (schema, fixture entries for tests)
- `registry/`: git submodule, the test registry repository (dev registry)
- `CHANGELOG.md`: changes per version
- `README.md`, `REQUIREMENTS.md`, `DEVELOPING.md`, `TESTING.md`, `DEPLOYMENT.md`
