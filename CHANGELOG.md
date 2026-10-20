# Changelog

Changes per site version. Versions follow [SemVer](https://semver.org/): major for a page or URL
parameter removed or changed incompatibly, minor for new pages, features or content, patch for
fixes, styling and dependencies.

## [0.22.2] - 2026-10-20

### Changed

- DNS provider and template cards: the Version column also shows Outdated for a version-only
  answer below the repository version.

## [0.22.1] - 2026-10-20

### Changed

- DNS provider and template cards: the served column is "Version": the served version and a
  Morphed or Outdated badge (hidden at phone width); the response kind shows on hover only.

## [0.22.0] - 2026-10-17

### Added

- What each supporting DNS provider serves (version, full template, morphed or outdated) on the
  DNS provider and template cards, and counted per DNS provider, stack and template.
- DNS provider card: settings and support status, errors and last-OK times.
- Support status shows the answered and failed probes of the latest completed sweep.

### Changed

- Reads export `format_version` 5: support counts templates, statuses describe the latest
  completed run (new values: failed, partly failed).
- A stack's support range leaves out deployments without probe answers.
- A template counts as never probed while no DNS provider has answered for it.

## [0.21.2] - 2026-10-13

### Changed

- Page views are counted through the operator's proxy `dcssp.dc.paulonet.eu`.

## [0.21.1] - 2026-10-13

### Changed

- Page views are counted at `dcss.dc.paulonet.eu`, the site's GoatCounter domain.

## [0.21.0] - 2026-10-13

### Changed

- Card page titles name the DNS provider, stack, service provider or template, also in the page
  view counts.
- The page view counter's script is served by the site; only the page view goes to GoatCounter.

## [0.20.0] - 2026-10-13

### Added

- Page views counted with GoatCounter (page and card, referrer; no cookies, no personal data),
  set in `config.js`.
- Privacy and Imprint pages, linked from the footer; their texts in `content/*.md`, personal data
  from the `CONTENT_VALUES` variable at deploy.

### Changed

- The methodology page no longer holds the privacy note.

## [0.19.0] - 2026-10-11

### Changed

- Reads the current DNS provider registry format: logos embedded or as https URL, published as
  files at deploy.
- DNS provider and stack cards: registry fields labelled with the schema titles, descriptions on
  hover; features grouped as in the schema; onboarding mode as a short text, on request with a
  link to the onboarding contacts.
- The request form link is gone (no longer in the registry).

### Added

- DNS provider and stack cards: example domain (with a link to its settings response on a DNS
  provider without a stack), update schedule, mode description, cost details, agreement,
  partners, contact forms, non-standard settings.

## [0.18.0] - 2026-10-11

### Changed

- Reads export `format_version` 2.
- "Supported since" (DNS provider card, template card) is when a probe first saw support of any
  version of the template; new versions and gaps don't move it. A footnote says so.
- Template card: "Supported since" comes from the export.
- DNS provider card, DNS providers list, stack card deployments: "Not supported" counts only
  templates every version answered not supported; shares are of every template.

### Added

- DNS provider card: "Not yet determined" templates (never probed, being retried or failed).
- DNS providers list, stack card deployments: undetermined templates; not supported on the stack
  card too. Wide screens only.

## [0.17.0] - 2026-10-09

### Changed

- Overview: "Domain Connect support over time" is four charts, 2×2 on desktop: DC adoption,
  supporting DNS providers, supported templates and ecosystem growth, each with its own link.
  The supporting stacks line is gone.
- Overview: "Templates per domain" (weighted by reach) replaces supported pairs in the headline.

### Added

- Ecosystem growth: supported pairs weighted by DNS provider reach, the templates the average
  scanned domain can use, per full sweep (derived data `derived/ecosystem.json`).

## [0.16.0] - 2026-10-09

### Changed

- Domain figures (domains, reach) show as a share of the scanned domains only; the hover text
  gives the counts and the scan, e.g. "80M of 190.6M scanned domains in the partial scan of
  05-09-2026". The overview's DC adoption keeps its counts.
- Dates in tables and cards show the day; the hover text shows the full time in UTC.
- Overview: "Discovered DNS providers" (every DNS provider of the list, with a DC TXT record)
  replaces DNS providers with domains; supporting DNS providers read "with at least 1 template".
- Templates list: supported and not supported count DNS providers, as a share of the DNS
  providers supporting at least one template, instead of template version pairs.
- Template card and service provider card templates: supporting DNS providers also as a share of
  the DNS providers supporting at least one template.

- DNS provider support counts templates instead of template versions: supported and not
  supported (not yet determined included) of every template, on the DNS providers list, the DNS
  provider card and the stack card's deployments. The "Not yet determined" card and column are gone.
- Stacks: median, lowest and highest support are shares of every template, over deployments with
  a probe answer.
- DNS provider card: supported templates sorted by "Supported since", newest first.

### Added

- Template card: "Supported since" per supporting DNS provider.

## [0.15.1] - 2026-10-08

### Changed

- Methodology: when a sweep counts as completed.

### Fixed

- A page whose data does not load shows a plain message instead of file URLs, release times and
  HTTP status codes. When the data was just updated, it asks for a reload.

## [0.15.0] - 2026-10-08

### Changed

- The data release is an annotation at the end of every page but the methodology instead of a box below the
  navigation. It names when the domain figures were scanned and which sweep the support figures
  come from, and links to the methodology.

## [0.14.0] - 2026-10-07

### Added

- Share icon on every chart and table panel: Bluesky, Mastodon (mastodon.social unless changed),
  LinkedIn, copy link and the device's share sheet, with the services' logos. The link opens the same page with its filters at that panel.
- Share button in the title of every card (DNS provider, stack, service provider, template).
- Panel anchors (e.g. `#support-history`): a `#` link next to each chart and table heading; a
  link with the anchor scrolls to the panel and highlights it.
- Link previews: Open Graph and Twitter card tags on every page.
- Runtime option `shareBaseUrl` (build time `VITE_SHARE_BASE_URL`): the site URL shared links
  are built on, e.g. the public site while testing on localhost.

## [0.13.0] - 2026-10-07

### Added

- Methodology page (`methodology.html`, linked from the footer): this release's zones, zone
  domains, sampling and scanned domains, what is not covered, how to report a problem, privacy,
  and the Scanner's methodology.
- Caveats link to the matching methodology section.

## [0.12.0] - 2026-10-07

### Added

- Leaderboards page (`leaderboards.html`): most templates supported, most domains reached, most
  improved (since the previous sweep or over about 90 days, `?window=90d`), new supporting DNS
  providers (last 30 days), templates and service providers with the biggest reach. Every
  board of DNS providers ranks each deployment of a stack on its own.
- Overview: new supporting DNS providers of the last 30 days and the most improved DNS providers
  (top 5).
- Navigation entry "Leaderboards".
- Deploy derives `data/derived/leaderboards.json` (first support per DNS provider) from the
  release.

## [0.11.0] - 2026-10-05

### Added

- "Supported since" and "first seen" dates before the scanner start date (2026-09-22,
  `scannerStartDate` in `config.js`; unset marks nothing) show the badge "First scan" with a
  tooltip, and sort as the oldest.
- Charts of support over time shade the span before the scanner start date.

## [0.10.0] - 2026-10-05

### Changed

- Counts from 10,000 show compact (`38.5M`, `12.3K`) in cards, tables, charts and tooltips; the
  exact count is the tooltip.
- Small percentages keep two significant digits (`0.012%`, `<0.0001%` below that).
- DNS providers list: the Supported column shows the count and its share; the template version
  total moves to the tooltip.
- Percent axes keep their 0 baseline and their ticks carry enough decimals, so small providers
  show a readable scale.

## [0.9.0] - 2026-10-05

### Added

- Stacks list: every stack with deployments (link to its DNS providers), support as lowest and
  highest across deployments with a range bar, and domains; sort, search, pages of 20.

## [0.8.0] - 2026-10-05

### Added

- Stack card: deployments (links to DNS provider cards), supporting deployments per template
  (links to template and service provider cards), domain share over time (summed over the
  current deployments), the stack's registry entry (logo, contact, details), link to its
  deployments in the DNS providers list.

## [0.7.0] - 2026-10-05

### Added

- Service providers list: every service provider with templates (link to its templates in the
  templates list), supported templates, supporting DNS providers, first added, last updated and
  reach; search (`?q=`), pages of 20.

## [0.6.0] - 2026-10-04

### Added

- Service provider card: templates, supporting DNS providers and reach, templates with support
  and reach (filter, pages of 20), supporting DNS providers per template over time with a picker
  (the 7 templates with most reach by default), link to its templates in the templates list.

### Changed

- Charts can hide their legend when the page shows its own.

## [0.5.0] - 2026-10-04

### Added

- Templates list: every template with support and reach, filter by service provider (`?spid=`),
  search (`?q=`), never-probed templates behind "show all" (`&all=1`), pages of 20.

## [0.4.0] - 2026-10-04

### Added

- Template card: supporting DNS providers with links and total, reach, supporters over time with
  a caveat when the history differs, description and versions, records, logo, notes.

### Changed

- Card logos that fail to load are hidden and requested without a referrer.

## [0.3.0] - 2026-10-04

### Added

- DNS providers list: support, statuses and domains per DNS provider; search, sort, stack filter;
  given-up, never-probed and zero-domain providers behind a "show all" toggle; caveats.

### Changed

- Tables show fewer columns at phone width to fit the screen; DNS provider card's supported
  templates without versions.
- Long tables in pages of 20 rows (50, 100 or all on request): DNS providers list, DNS provider
  card's supported templates (now with a filter).

## [0.2.0] - 2026-10-04

### Added

- DNS provider card: support, domain share and supported templates over time, supported templates
  with links, settings, notes, owned URLs.
- DNS provider registry entry on the card: logo, contact block, onboarding facts, features.
- Registry commit in the footer of every page.
- Deploy validates and publishes the DNS provider registry with the data.

### Changed

- Header names the domain-share import by its scan's completion time.
- Overview: chart without data tables; no internal ids in tooltips.
- Tables never show internal ids.

## [0.1.0] - 2026-10-04

### Added

- Overview page: Domain Connect support over time and latest headline numbers.
- Placeholder pages for the lists and cards.
- Release facts (`generated_at`, domain-share import) in every page header.
- Site version in the footer.
- Deploy to GitHub Pages: approved, tagged site versions with the current validated data release.
