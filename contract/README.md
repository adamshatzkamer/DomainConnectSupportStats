# Contracts (vendored)

Verbatim copies of the two external inputs' published contracts. Never edit these files by hand.

| Path                       | Upstream                                       | What it is                       |
| -------------------------- | ---------------------------------------------- | -------------------------------- |
| [`export/`](export/)       | Domain Connect Scanner (`docs/`)               | Static JSON export (`export.py`) |
| [`registry/`](registry/)   | DNS provider registry (test repository, root) | Registry entries                 |

## Export contract (`export/`)

The only interface to the Scanner: never read, copy or depend on Scanner source code.

| Path                                                   | Upstream (DomainConnectScanner) | What it is                                                                                                       |
| ------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [`export/EXPORT_FORMAT.md`](export/EXPORT_FORMAT.md)   | `docs/EXPORT_FORMAT.md`         | Human description of every file, table and column. The reference for page work.                                  |
| [`export/METHODOLOGY.md`](export/METHODOLOGY.md)       | `docs/METHODOLOGY.md`           | How the numbers are measured, for the public. Basis of a methodology page.                                       |
| [`export/schemas/`](export/schemas/)                   | `docs/schemas/`                 | JSON Schemas (Draft 2020-12). `schemas/export/` is the export; the report schemas next to it are `$ref`'d by it. |
| [`export/examples/export/`](export/examples/export/)   | `docs/examples/export/`         | The full export of the Scanner's simulated example database. Used as the dev data set and as test fixtures.      |

Current `format_version`: **5**.

The deploy validates every data release against `export/schemas/export/`; a release that fails is
not published ([DEPLOYMENT.md](../DEPLOYMENT.md)).

## Registry contract (`registry/`)

| Path                                                       | Upstream ([DomainConnectDNSProviderRegistryTest](https://github.com/pawel-kow/DomainConnectDNSProviderRegistryTest)) | What it is                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`registry/REGISTRY_FORMAT.md`](registry/REGISTRY_FORMAT.md) | `README.md`                                                                                                         | Layout, folder rule, matching, entry format.                   |
| [`registry/schema/`](registry/schema/)                     | `schema/`                                                                                                           | JSON Schema (Draft 2020-12) of an entry.                       |
| [`registry/examples/`](registry/examples/)                 | `providers/` (as `examples/providers/`)                                                                             | Fixed selection of entries (`FIXTURE_PROVIDER_IDS`). Test fixtures only. |

Validation (CI, deploy) uses `registry/schema/` only, never the schema of a registry checkout. The
dev registry is the test repository itself, as git submodule `../registry/`.

## Updating

On a `chore/contract-<topic>` branch:

1. Copy the upstream paths over these, unchanged. Registry: `npm run contract:registry --
   <registryCheckout>`.
2. Run `npm test` and `npm run test:e2e`.
3. Export: if `format_version` changed (a breaking change), update `SUPPORTED_FORMAT_VERSION` in
   `src/lib/data/manifest.ts` and fix the pages in the same PR. Additive changes need no code
   change.
4. Registry: bump the `registry/` submodule to the copied commit when the dev registry should
   follow.
