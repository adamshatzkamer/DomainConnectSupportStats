# Domain Connect Support Statistics

Static statistics site on [Domain Connect](https://www.domainconnect.org/) support across the DNS
providers hosting real domains: adoption among scanned domains, template support per DNS provider,
stack, service provider and template, and their history.

Data: the static JSON export of the
[Domain Connect Scanner](https://github.com/pawel-kow/DomainConnectScanner), and the DNS provider
registry (logos, contacts, onboarding facts; schema in [`registry/`](registry/)). Look: the Templates
statistics dashboard at [stats.domainconnect.org](https://stats.domainconnect.org).

**Live:** https://pawel-kow.github.io/DomainConnectSupportStats/ · **Changes:**
[CHANGELOG.md](CHANGELOG.md)

## Pages

| Page                                                | Shows                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Overview (`index.html`)                             | DC adoption, supporting DNS providers, supported templates, ecosystem growth over time; latest headline numbers |
| DNS provider card (`dns-provider.html?id=`)         | Support, domain share over time, supported templates, registry entry                                            |
| DNS providers, Stacks, Service providers, Templates | Full lists with sort, filter and search _(in progress)_                                                         |
| Stack, Service provider, Template cards             | One entity's support, domain share, history and cross-links _(in progress)_                                     |
| Methodology (`methodology.html`)                    | How the figures come about, this release's zones and sampling, limits                                           |
| Privacy (`privacy.html`), Imprint (`imprint.html`)  | What is collected about visitors; publisher. Text in `content/*.md`                                             |

Every view is a shareable link; query parameters carry only ids and filters.

## Development

Node 22.18+ (the devcontainer has Node 24 and Chromium for Playwright).

```bash
git submodule update --init   # dev registry (or clone with --recurse-submodules)
npm ci
npm run dev          # http://localhost:5173/ with the example data set and the test registry
npm run verify       # lint, type check, tests, build, e2e
```

`DATA_DIR=<path to a release> npm run dev` renders a real export release,
`REGISTRY_DIR=<registry checkout>` a real registry; `npm run derive` writes the derived data of
`DATA_DIR` that the overview, the stacks list and the leaderboards read. All commands:
[CLAUDE.md](CLAUDE.md#development-commands).

## Structure

- **Svelte 5 + TypeScript, Vite multi-page build**: one HTML file per page, no backend.
- **Chart.js**, bundled.
- **[`contract/`](contract/)**: the Scanner's export format and the DNS provider registry format,
  with schemas and examples, vendored verbatim; the only interface to the data.
- **`registry/`**: git submodule, the test DNS provider registry (dev registry).
- **Deploy**: approved, tagged site versions plus the current data release, published together to
  GitHub Pages ([DEPLOYMENT.md](DEPLOYMENT.md)).

## Documentation

| Document                                                                     | Content                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [REQUIREMENTS.md](REQUIREMENTS.md)                                           | What the site must do                                |
| [DEVELOPING.md](DEVELOPING.md)                                               | Writing, code and process conventions, versioning    |
| [TESTING.md](TESTING.md)                                                     | Test layers and gates                                |
| [DEPLOYMENT.md](DEPLOYMENT.md)                                               | Pages, data repo, Scanner publish step, operations   |
| [CHANGELOG.md](CHANGELOG.md)                                                 | Changes per version                                  |
| [contract/export/EXPORT_FORMAT.md](contract/export/EXPORT_FORMAT.md)         | The data: every file, table and column               |
| [contract/registry/REGISTRY_FORMAT.md](contract/registry/REGISTRY_FORMAT.md) | The registry: layout and entry format                |
| [CLAUDE.md](CLAUDE.md)                                                       | Architecture and file reference (also for AI agents) |
