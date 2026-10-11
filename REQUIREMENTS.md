# Requirements

What the site must do and the constraints that bind it. The data's meaning is defined by
[contract/export/EXPORT_FORMAT.md](contract/export/EXPORT_FORMAT.md).

## 0. Product

### P-1 Purpose

The site drives Domain Connect adoption by making support, and its absence, visible: DNS providers
enable more templates, service providers publish more.

The landing page answers: **is Domain Connect support improving?** It shows the trend of supporting
DNS providers, supported templates and reach, and the latest values.

### P-2 Audiences

All get the same public data.

| Audience                                                       | Comes to                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Domain Connect community (protocol maintainers, working group) | Track adoption and ecosystem health; point others to it                   |
| DNS providers                                                  | Compare their support with peers; spot gaps or errors in their deployment |
| Service providers (template publishers)                        | See how many DNS providers and domains can apply their templates          |
| Public, press, analysts                                        | Get citable headline numbers and trends                                   |

### P-3 Tone towards named companies

Every fact is shown, framed carefully:

- neutral wording, stating what was observed and when ("last probe failed on <date>", not
  "broken");
- context next to the fact: statuses lag, probes fail transiently, numbers cover scanned zones
  only;
- positive rankings only.

### P-4 Leaderboards

- **Top supporting providers**, two boards: by templates supported, and by domains reached.
- **Most improved**: largest gain in supported templates over recent sweeps.
- **Biggest reach**: templates and service providers whose templates reach the most domains.

No boards of low support.

### P-5 Calls to action

Short pointers on how to get listed or improve support, linking to domainconnect.org and the
Domain Connect Templates repository. No marketing copy.

### P-6 Trust and corrections

- **Methodology page**: how the data comes about (scanning, sampling, provider identification and
  attribution, support probing, sweeps), what the numbers count, their limits. Data pages link to
  it where a caveat applies.
- **Report a problem**: every card links to a new GitHub issue in this repository, pre-filled with
  the entity's id and the release's `generated_at`.

### P-7 Freshness

The site shows the latest release the Scanner publishes and always states its age.

### P-8 Success

- Adoption rises: the overview's trends go up.
- The site is cited and linked by the community, providers and the press (measured with
  privacy-friendly analytics).
- DNS providers fix errors or add support after seeing their card.

### P-9 Direction

- This site and stats.domainconnect.org (Templates statistics) will merge. Navigation, page names
  and URLs stay compatible.
- English now; texts translatable.

### P-10 Out of scope

- Per-domain lookup (the export has no per-domain data).
- Live or on-demand probing.
- Accounts, subscriptions, alerts, notifications.
- Data reuse features: downloads (JSON/CSV), chart image export, embeddable badges.

## 1. Functional requirements

### F-1 Pages

| Id     | Page                                             | Data                            | Must show                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1.1  | `index.html` (landing)                           | `overview.json`, derived data   | Four charts, 2×2 on desktop, one column on a phone, each its own panel: DC adoption `dc_pct` per import (`dc_domains` in the tooltip; `#support-history`); supporting DNS providers (of known), supported templates (of published) and ecosystem growth (F-1h) per full sweep, these three with the first-scan shadow; the latest values as headline numbers (F-1g); F-4.6 |
| F-1.2  | `dns-providers.html` (`?stack=`, `&q=`, `&all=`) | `dns-providers.json`            | Every DNS provider; filter by stack and search; layout F-1b                                                                                                                                                                                                                                                                                                                |
| F-1.3  | `stacks.html`                                    | `stacks.json`                   | Every stack with its support distribution                                                                                                                                                                                                                                                                                                                                  |
| F-1.4  | `service-providers.html` (`?q=`)                 | `service-providers.json`        | Every service provider, including ones without templates; search; layout F-1f                                                                                                                                                                                                                                                                                              |
| F-1.5  | `templates.html` (`?spid=`, `&q=`, `&all=`)      | `templates.json`                | Every template; filter by service provider and search; layout F-1d                                                                                                                                                                                                                                                                                                         |
| F-1.6  | `dns-provider.html?id=`                          | DNS provider card               | Layout F-1a; charts: domain share per import, supported templates per sweep; the stack's registry entry                                                                                                                                                                                                                                                                    |
| F-1.7  | `stack.html?id=`                                 | Stack card                      | Layout F-1a; deployments, template coverage; chart: share per import (summed over current deployments); the stack's registry entry                                                                                                                                                                                                                                         |
| F-1.8  | `service-provider.html?id=`                      | Service provider card           | Layout F-1e; templates; chart: supporting providers per template per sweep                                                                                                                                                                                                                                                                                                 |
| F-1.9  | `template.html?spid=&sid=`                       | Template card                   | Layout F-1c; records, supporters; chart: supporting DNS providers per sweep                                                                                                                                                                                                                                                                                                |
| F-1.10 | `methodology.html`                               | `manifest.json`, METHODOLOGY.md | The release's zones, zone domains, sampling and scanned domains; not covered; report a problem; privacy; then the vendored METHODOLOGY.md verbatim, rendered at build time. Linked from the footer                                                                                                                                                                         |
| F-1.11 | `leaderboards.html` (`?window=`)                 | Lists, derived data             | Boards F-4                                                                                                                                                                                                                                                                                                                                                                 |

### F-1a DNS provider and stack cards

Both cards share one layout, top to bottom:

1. Title: name and the registry logo; the card's id and stack in a small line.
2. Headline stat cards.
3. Contact block from the registry: website, documentation, technical contact, onboarding contact,
   process documentation. Labels are the schema titles, descriptions on hover.
4. Domain share over time; supported templates over time; supported templates.
5. Registry details: example domain (DNS provider card without a stack: with a link to its
   settings response), onboarding facts in schema order, partners, features grouped as in the
   schema, notes, link to the entry. Labels are the schema titles, descriptions on hover; the
   onboarding mode is a short text, the schema's text on hover;
   mode on-request links to the onboarding contacts. `links` and `consent` are not
   shown.
6. Settings, notes, owned URLs.

A deployment of a multi-deployment stack shows the stack's registry entry (logo, contact block,
details), labelled as the stack's. Registry values that are unknown or empty are not shown; a
block with nothing left is not shown. No registry entry: no registry blocks; an entry that fails to
load: a short error in their place.

Settings show the URLs, name servers and first-seen time; probe statuses, errors and last-success
times are not shown.

Headline: supported, not supported and not yet determined templates (F-2.21), domain share, rank. Stack card: median,
lowest and highest template support across its deployments (F-2.21); deployments table as F-1b
(without the stack column).
DNS provider card supported templates: newest `since` first by default. "Supported since" is when
a probe first saw support of any version; new versions and gaps don't move it; a footnote says so
(also on the template card supporters).

### F-1b DNS providers list

- Columns: name (card link) with its API host below; stack (stack card link); settings and support
  status badges; supported, not supported and undetermined templates (F-2.21); domains (F-2.18). Sorted by the
  counts. Phone width: name, supported and domains only. Paginated (F-2.10).
- Badges: `ok` "OK" green; `http_error`, `error` "HTTP error" and `connection_error` "Connection
  error" orange; `dead` "Given up" and `null` "Not checked yet" grey. The hover text shows the raw
  value.
- Hidden by default (F-2.6): either status `dead`, support status `null`, or `domains` 0 (`null`
  domains stays visible). The toggle is `&all=1`; it applies after `?stack=`.
- `?q=` and `&all=` follow the search box and toggle in the URL.
- Footnotes: what supported and not supported count, and of what; attributed domains only;
  statuses describe the last attempt.

### F-1c Template card

1. Title: template name and its logo (`logo_url`); service provider link and the ids in a small
   line.
2. Headline: supporting DNS providers (F-2.19), reach (F-2.18), version and stored versions.
3. About: description, variables, added, updated, template SHA.
4. Supporting DNS providers over time (stepped); a caveat below when the latest point differs from
   the current supporter count.
5. Supporting DNS providers (current state): name (card link) with its API host below, stack, versions,
   supported since (F-1a), reach (F-2.18); `TOTAL` footer. Phone width: name, supported since,
   reach.
6. Records: type, host, `groupId`, `ttl`, `essential` (when declared), and every other declared
   field of the record as `key: value` in one cell, verbatim; unknown fields left out. Phone
   width: type, host, and the rest in the one cell.
7. Notes.

### F-1d Templates list

- Columns: service provider (card link); template name (card link) with its service id below;
  added; supported: DNS providers supporting any version (`supporting_providers`); not supported: the
  other DNS providers supporting at least one template, not yet determined included; both with
  their share (F-2.19); reach (F-2.18). Sorted by the counts. Phone width: service provider,
  template, supported and reach. Paginated (F-2.10).
- `?spid=` filters to one service provider's templates, titled with its name.
- Hidden by default (F-2.6): never probed (`total` 0); shown, they read "Not probed yet" in
  supported and `–` in not supported. The toggle is `&all=1`; it applies after `?spid=`.
- `?q=` and `&all=` follow the search box and toggle in the URL.
- No logos: `templates.json` carries no `logo_url`.
- Footnotes: what supported and not supported count, and of what; reach.

### F-1e Service provider card

1. Title: name (else its id); the id and a link to its templates in the templates list
   (`templates.html?spid=`) in a small line.
2. Headline: templates (supported by a DNS provider), supporting DNS providers, reach (F-2.18).
3. Supporting DNS providers per template over time (stepped), one line per template. The 7
   templates with most reach are drawn by default; a checkbox list with each line's colour turns
   any template on or off (not in the URL). A template keeps its colour; past the palette, lines
   dash.
4. Templates (current state): template (card link) with its service id below, version, added,
   updated, supporting (with its share, F-2.19), reach (F-2.18). Phone width: template,
   supporting, reach. Paginated (F-2.10).
5. Details: first added, last updated.
6. Notes.

- No logo: the export carries none for a service provider.

### F-1f Service providers list

- Columns: service provider (card link) with its id below (left out when the name is the id);
  templates (link to `templates.html?spid=`, plain when 0); supported templates; supporting DNS
  providers; first added; last updated; reach (F-2.18). Sorted by the counts.
  Phone width: service provider, templates and reach. Paginated (F-2.10).
- No rows hidden: every service provider is listed.
- `?q=` follows the search box in the URL.
- Footnotes: what templates, supported and DNS providers count; reach.

### F-1g Overview headline

DC adoption (`dc_pct`, with `dc_domains` of `scanned_domains`: the only absolute domain counts of
the pages, F-2.18); discovered DNS providers "with DC TXT record" (rows of the
`dns_providers` list, `manifest.files.dns_providers.rows`); supporting DNS providers "with at
least 1 template", supporting stacks and supported templates (of published) from the last
`ecosystem` row; templates per domain "weighted by reach" (F-1h) of the last sweep with a value.

### F-1h Ecosystem growth

Supported (DNS provider, template) pairs weighted by DNS provider reach, per full sweep: Σ over DNS
providers of their supported templates × domain share (`domains_pct` / 100), the supported templates
of the average scanned domain. A DNS provider's templates in a sweep are those of its latest
`support_history` row started before the next full sweep (for the last sweep, its latest row), as
`ecosystem` counts smaller runs. Weights are the domain-share import's, for every sweep; a DNS
provider without a share counts 0; without an import there is no value.

### F-2 Common behaviour

- F-2.1 Every page but the methodology ends its main content with an annotation (small muted
  text, left-aligned, no box) of both clocks:
  `Data generated <generated_at> · Domain figures: scan completed <completed_at> (<scanned_domains> domains scanned) · Support figures: sweep started <started_at> · Methodology`.
  Domain figures: the domain-share import's `completed_at` (`overview.json` `adoption`) and
  `scanned_domains`; without an import, `no domain-share import`. Support figures: the newest sweep
  the page's data reflects: DNS provider card `support_history` last row, service provider card
  `support_history` newest `started_at`, template card `history` last row, every other page
  `overview.json` `ecosystem` last row; `–` without rows or when the card does not load. While
  loading: `Loading data release…`. The footer shows the site version.
- F-2.2 Lists: client-side sort, filter and search over all rows; default order is the export's.
- F-2.3 Cross-links as plain `<a href>` page links: DNS provider ↔ stack, DNS provider ↔ template,
  template ↔ service provider, stack → its deployments (EXPORT_FORMAT.md "Cross-links").
- F-2.4 A card page with a missing parameter or unknown id shows "not found" linking to its list;
  any other load failure shows an error state. Never a blank page. The error state shows no file
  URL, release time or HTTP status: "The data was just updated. Reload the page." when a file is
  from another release than the manifest, otherwise "Could not load the data. The data is not
  available at the moment. Try again later." The technical message goes to the console as a
  warning.
- F-2.5 Query parameters carry only raw entity ids and filters; every view is a shareable link.
- F-2.6 Lists hide dead, never-probed and zero-domain entries by default, with a visible "show all
  (N hidden)" toggle.
- F-2.7 Every card has a "report a problem" link.
- F-2.8 Caveats keep one sentence next to the fact and link to the matching methodology section
  (`links.methodology(<heading anchor>)`).
- F-2.9 Tables at phone width show only the columns that fit the screen without horizontal scroll
  (`DataTable` `phoneKeys`); the other columns appear on wider screens.
- F-2.10 Tables that can grow long have a filter and pages (`DataTable` `searchable`, `pageSize`):
  20 rows by default, 20 / 50 / 100 / All on request; back to the first page when the search, sort,
  filters or page size change. Neither the page nor its size is in the URL.
- F-2.11 Counts from 10,000 are compact: `12.3K`, `38.5M`, `1.2B` (one decimal, `.0` dropped, dot
  decimal); below 10,000 exact. In cards, tables, chart axes and tooltips; the exact count of a
  count other than domains is the `title` of the card value or table cell. Pagination ranges stay exact. Sorting uses the raw value.
- F-2.12 Percentages keep two significant digits below 1% (`0.012%`) and show `<0.0001%` below
  that. Percent axes start at 0; their ticks carry the decimals their step needs, so a small share
  still shows a readable scale.
- F-2.13 Scanning began on `scannerStartDate` (`config.js`, `YYYY-MM-DD` UTC; the deployed
  `public/config.js` sets 2026-09-22; unset or invalid: nothing is marked). A `since` or
  `first_seen_at` value before 00:00 UTC of that day shows the badge "First scan" instead of the
  date, with the tooltip "Already present on the first scan on <recorded date>. The real date is
  unknown."; `null` stays `–`. Badge rows sort as the oldest, in timestamp order among themselves;
  the filter matches the underlying value. Charts of support-sweep series shade the span before the
  start date and label it "First scan" (tooltip: "Result of the first scan. State before is
  unknown."); points inside it are drawn. Domain share per import is not shaded: zone scans predate
  the start date.
- F-2.14 Every chart and table panel has a stable English anchor (`Panel` `id`, e.g.
  `#support-history`), unique per page and independent of its heading; a `#` link next to the
  heading on hover or focus. A link with the anchor scrolls to the panel once its data is in place
  and highlights it for 2 s (no animation under `prefers-reduced-motion`); an unknown anchor
  opens the page normally. List pages keep the anchor when they rewrite the URL.
- F-2.15 Every chart and table panel has a share icon in its title row (box with arrow on macOS
  and iOS, three nodes elsewhere). Its menu: Bluesky, Mastodon, LinkedIn (each with its logo), Copy
  link, and "More…" (Web Share) where the browser has it; keyboard-usable. The shared link is absolute: the URL the
  browser shows, with its query and the panel anchor (on `shareBaseUrl` when configured, for
  testing on localhost); sort, page and page size stay out (F-2.10). Post text:
  `<panel title> – <entity name or page name> – Domain Connect support statistics`, no numbers;
  the middle part is left out when it equals the title. Mastodon shares to `mastodon.social`
  unless the viewer changed the instance with the small button on the Mastodon row (host name
  only; remembered in the browser); one menu row. LinkedIn opens its feed composer with the post
  text and link (`/feed/?shareActive=true&text=`). "Link copied" shows for 2 s (`aria-live`). Targets
  open in a new tab with `rel="noopener noreferrer"`, only on the viewer's click.
- F-2.17 Every card has the same share button in its title block (top right), for the whole
  card: the page URL with its query, no anchor; post text `<name> – <page kind> – Domain Connect
support statistics`.
- F-2.16 Every page has static `og:title`, `og:description`, `og:image` (the brand square) and
  `twitter:card` `summary`; no `og:url`. The image URL is made absolute in the browser
  (from `shareBaseUrl` when configured).
- F-2.18 Domain figures (domains, reach) show as a share of the scanned domains only. Their hover
  text gives the counts and the scan: `<domains> of <scanned> scanned domains in the <full/partial>
scan of DD-MM-YYYY`: "full scan" at `sample_percent` 100, "partial scan" below, "scan" when
  unknown; dated by the import's `started_at` (else `completed_at`) in `overview.json`
  `adoption`. Absolute domain counts appear only in the overview's DC adoption headline, the
  annotation (F-2.1) and the methodology page.
- F-2.19 A template's support is also a share of the DNS providers supporting at least one
  template: `supporting_dns_providers` of the last `overview.json` `ecosystem` row, the number the
  overview shows (templates list, template card headline, service provider card templates).
- F-2.20 Timestamps in tables, cards and records show the date (`DD-MM-YYYY`); the hover text
  shows `DD-MM-YYYY HH:MM UTC`. Sentences (the annotation, F-2.1) keep the full time.
- F-2.21 A DNS provider's support counts templates, never template versions: supported =
  `supported_templates` (any version), not supported = `unsupported_templates` (every version
  answered not supported), not yet determined = `undetermined_templates` (never probed, being
  retried or failed in a version), each also as a share of the three together (every template). A
  DNS provider never probed (support status `null`) reads "Not probed yet" as supported; its
  other two are the export's counts (0, every template). A stack's support: min, median and max of that share over
  its deployments with at least one probe answer (`supported_count + unsupported_count` > 0), the
  export's `min_`, `median_` and `max_supported_templates_pct`.
- F-2.9 Internal ids (`dns_provider_id`, `import_id`, `sweep_id`) are not shown: no columns, titles,
  tooltips or messages. They stay in URLs and lookups. Charts speak of time only: no "import" or
  "sweep" in headings, labels or tooltips. Public ids (`provider_id`,
  `service_provider_id`, `service_id`) are shown. Export `notes` stay verbatim.

### F-3 Data and deployment

- F-3.1 Pages read `manifest.json` first and build every file URL from its path templates and the
  id encoding.
- F-3.2 Data base URL: build time `VITE_DATA_BASE_URL`, runtime `config.js`, default `./data/`.
- F-3.3 A new data release is deployed without a code change ([DEPLOYMENT.md](DEPLOYMENT.md)).
- F-3.4 A release that fails validation against the vendored contract is not published.
- F-3.5 Only approved, tagged site versions are published.
- F-3.6 The DNS provider registry (entries keyed by `provider_id`, logos embedded or as https URL)
  is a separate public repository, validated against `contract/registry/schema/` and published
  with every deploy under `registry/`, logos decoded or downloaded into files (https, 10 s,
  ≤ 1 MB, SVG, PNG or JPEG; an entry whose logo fails is published without it), with its repository and commit (no repository link and no footer commit when that
  is missing). Base URL: build time `VITE_REGISTRY_BASE_URL`,
  runtime `config.js`, default `./registry/`. The footer shows the registry commit.

### F-4 Leaderboards

Page `leaderboards.html` with every board; each says what it ranks, of what, and the release.

- F-4.0 Boards rank the top 10 by a positive value; `null` is left out; ties by domains (unknown
  last), then name ignoring case. DNS provider boards have one row per DNS provider: each
  deployment of a stack ranks on its own. A DNS provider row links to its card and shows its API host
  below the name.
- F-4.1 Most templates supported (`supported_templates`), and most domains reached: `domains` of
  DNS providers with `supported_templates` > 0, shown as `domains_pct` (F-2.18).
- F-4.2 Most improved by `supported_templates_change` (since the previous sweep, default) or
  `supported_templates_change_90d` (`?window=90d`), switched in place (no reload, the URL
  follows). A window without any known change says
  "not measured yet"; one without a gain says so.
- F-4.3 Biggest reach: templates and service providers by `reach_domains`, shown as `reach_pct`
  (F-2.18).
- F-4.4 New supporting DNS providers: per DNS provider its first `support_history` row with
  `supported_templates` > 0, dated by that sweep's `started_at`, within 30 days before
  `generated_at`; left out when that sweep is the export's first or started before the scanner
  start date. All of them, newest first, one row per DNS provider.
- F-4.5 Derived data: `scripts/derive.ts` collects F-4.4 from the cards into
  `derived/leaderboards.json` next to the export at deploy, and from the DNS provider cards'
  `support_history` and the DNS providers list F-1h into `derived/ecosystem.json`; the site rejects a derived file when its
  `generated_at` differs from the manifest's. A board whose data fails to load (missing, another release) says "Not available at the moment", without technical details; the rest of the page shows.
- F-4.6 The overview shows F-4.4 and the most improved top 5 (since the previous sweep) below the chart, side by side on desktop, with a link to the page.

## 2. Constraints

| Id   | Constraint                                                                                                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1  | Static and stateless: no backend, no write path, no state between pages beyond the URL; only exception: the Mastodon instance in `localStorage` (F-2.15)                           |
| C-2  | One HTML file per page (multi-page build)                                                                                                                                          |
| C-3  | Built only from `contract/` (export, registry), never from Scanner source                                                                                                          |
| C-4  | Unknown files, tables, columns and keys ignored; tables found by id                                                                                                                |
| C-5  | `null` is unknown: `–`, a gap, sorted last, never 0                                                                                                                                |
| C-6  | Third-party text escaped; data URLs pass `safeUrl` (e-mail addresses `safeMailto`) and open with `rel="nofollow noopener noreferrer"`                                              |
| C-7  | No runtime requests to third-party hosts (bundled libraries, no CDN or fonts), except one cookieless analytics service without personal data and template logos (without referrer) |
| C-8  | Look and feel of stats.domainconnect.org; navigation and URLs compatible with a merge                                                                                              |
| C-9  | Works at phone width without horizontal page scroll                                                                                                                                |
| C-10 | Only `format_version` `SUPPORTED_FORMAT_VERSION` is rendered; others fail loudly                                                                                                   |
| C-11 | WCAG 2.2 AA: contrast, keyboard use, screen-reader-usable tables; charts without data tables                                                                                       |
| C-12 | User-facing texts translatable (not scattered through logic); English only                                                                                                         |

## 3. Stack

- Svelte 5 + TypeScript, Vite multi-page; Chart.js.
- Data in a separate data repo; deploy on a `workflow_dispatch` from the data repo, daily fallback.
- GitHub Pages on github.io; custom domain possible without rebuild (relative base).
- Export and registry contracts vendored under `contract/`, updated by PR; test registry as git
  submodule `registry/` (dev).
- Node-only tooling; Vitest (unit, contract, component) and Playwright.
- SemVer site versions, [CHANGELOG.md](CHANGELOG.md).

## 4. Open questions

Tracked and decided in GitHub issues:

- **Analytics service** (C-7, P-8): #13
- **Template logos bundled into the deploy** (C-7): #25
