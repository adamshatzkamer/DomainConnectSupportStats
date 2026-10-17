# Domain Connect support statistics: the static export format

The data set `export.py` writes, for frontend developers: with this file and one export
directory you can build every page. Machine-readable contract: the JSON Schemas in
[`docs/schemas/export/`](schemas/export/). Complete example: [`docs/examples/export/`](examples/export/).
How the numbers are measured: [`METHODOLOGY.md`](METHODOLOGY.md).

## Purpose and audience

How far [Domain Connect](https://www.domainconnect.org/) is supported across the DNS
providers hosting real domains. Zone files (e.g. `.com`) are scanned for domains publishing a
Domain Connect record; the DNS providers behind them are identified and probed for every
published template. The export holds:

- **who supports what, now**: per DNS provider, per stack of DNS providers, per service
  provider and per template, which templates are supported;
- **how much it matters**: how many of the scanned domains are hosted by a DNS provider,
  and therefore how many domains a template can reach;
- **how it changes**: series over the scans (imports) and over the support sweeps.

No per-domain data, and nothing about scans beyond the totals below.

## Glossary

| Term | Meaning |
|---|---|
| Domain Connect | An open protocol that lets a service (e.g. a website builder or mail host) configure a customer's DNS at the customer's DNS provider in one click, by applying a *template*. A domain advertises support through a `_domainconnect` TXT record that holds the URL of its DNS provider's Domain Connect endpoint. |
| DNS provider | One Domain Connect deployment: one endpoint (API URL) that answered the protocol's settings request. Keyed by `dns_provider_id`, a number. Two deployments of the same software (e.g. two hosting companies running Plesk) are two DNS providers. Sometimes called a deployment. |
| Stack | All DNS providers that declare the same `providerId` in their settings response, i.e. deployments of the same provider software or company. Keyed by `provider_id`, a string such as `plesk.com`. A DNS provider that declares no `providerId` belongs to no stack. |
| Service provider | A publisher of templates in the [Domain Connect Templates repository](https://github.com/Domain-Connect/Templates). Keyed by `service_provider_id`, a string, usually a domain name. |
| Template | One service of a service provider (one file in the Templates repository): a set of DNS records the DNS provider applies. Keyed by the pair (`service_provider_id`, `service_id`). |
| Template version | A template's `version` number. `version` is the Templates repository's current one; `served_version` is the one a DNS provider's answer named (see *Served template*). Support is per template, not per version. |
| Import, scan | One scan of one or more zone files. Keyed by `import_id`, a number (normally the scan's start time as Unix seconds, but not guaranteed). A scan may be *probe-sampled*: only a random percentage of the zone's domains is scanned, so "% of scanned domains" is a share of the sample, which estimates, but is not, a share of the whole zone. Each import's zones and sampling percentage are published with it (`zones`, `sample_percent`). |
| Scanned domains | The domains an import actually queried (`scanned_domains`), the denominator of every domain percentage. |
| Support sweep | One run of the support probes: every DNS provider is asked about every template (a *full* sweep, monthly), or every template on the DNS providers supporting at least one template (a *weekly* sweep). Keyed by `sweep_id`, a number normally increasing with time (order by `started_at`, not by id). Smaller runs exist too (one provider only, one template only, or only recently changed templates); the history tables say which runs they count. The export never says whether a sweep was full or weekly. |
| Supported | The latest conclusive probe of the DNS provider for a template answered that it supports it (HTTP 200). Only a later 404 changes that: a failed probe, or a sweep that has the combination queued again, leaves it supported. |
| Not supported | The latest conclusive probe answered that it does not (HTTP 404). Only a later 200 changes that, as above. |
| Not yet determined | Neither: no conclusive probe yet (never probed, still being retried, or failed). It is the rest of a total, `total - supported_count - unsupported_count` (`undetermined_count`); the export does not break it down (see [Redaction](#redaction)). |
| Total | The templates a DNS provider can be asked about: every template of the Templates repository, for each DNS provider that declares a Domain Connect API (or already has an answer). It does not depend on how far probing has got: a newly found DNS provider starts with every template not yet determined, and a DNS provider without an API has a total of 0. A template's total is the DNS providers that can be asked. |
| Served template | What a supporting DNS provider's latest 200 carried: nothing usable (`response_kind` `empty`), only the template's version (`version`), or the full template (`template`). `served_version` is the version it named (`null` when none). A full template is compared with the repository's (`template_match`): `match` (equal, ignoring key order and whitespace), `morphed` (altered by the DNS provider) or `outdated` (its version below the repository's). All three are `null` for a template supported before they were recorded, until its next probe. |
| Provider status | Whether a DNS provider's Domain Connect endpoints answered in the latest **completed** run - its settings run and its support sweep - after retries (`settings_status`, `support_status`, with the error message when they failed). A request that fails while the run is still retrying changes nothing; see [Provider statuses](#provider-statuses). |
| Domain share | How many of an import's scanned domains point to a DNS provider (or stack) through their Domain Connect record (`domains`), and that as a percentage of the scanned domains. |
| Reach | For a template or service provider: the scanned domains hosted by the DNS providers that support it, each DNS provider counted once. It is how many of the scanned domains could apply the template today. |
| Domain-share import | The one import that every domain and reach column of an export describes (see [Domain-share import](#domain-share-import)). |
| Release | One complete export: a directory of files written together from one consistent view of the database. |

## Directory layout

```
DIR/
  current -> releases/20261001T000000Z      symlink to the newest release
  releases/
    20261001T000000Z/                       one release, named after its generated_at
      manifest.json
      overview.json
      dns-providers.json
      dns-providers/{dns_provider_id}.json
      stacks.json
      stacks/{provider_id}.json
      service-providers.json
      service-providers/{service_provider_id}.json
      templates.json
      templates/{service_provider_id}/{service_id}.json
```

- Serve or copy `current/`. `current` is replaced atomically once a new release is
  complete, so it always points at a whole release. A few older releases are kept next to
  it.
- **One release is one consistent snapshot.** All its files were read from the database
  in one transaction, so the lists and cards agree with each other. Never mix files from
  two releases: every file carries its release's `generated_at`, which a reader can
  compare with the manifest's.
- A release directory's name is its `generated_at` without separators. If two exports run
  in the same second, the second gets a `.1` suffix. Don't parse the name; read
  `generated_at`.

File kinds, as keyed in the manifest's `files`:

| Kind | Path template | Report | What it is |
|---|---|---|---|
| `overview` | `overview.json` | `support-overview` | Ecosystem-wide series: adoption per import, support per sweep |
| `dns_providers` | `dns-providers.json` | `dns-providers` | List of every DNS provider |
| `dns_provider` | `dns-providers/{dns_provider_id}.json` | `dns-provider-summary` | One DNS provider's card |
| `stacks` | `stacks.json` | `stacks` | List of every stack |
| `stack` | `stacks/{provider_id}.json` | `stack-summary` | One stack's card |
| `service_providers` | `service-providers.json` | `service-providers` | List of every service provider |
| `service_provider` | `service-providers/{service_provider_id}.json` | `service-provider-summary` | One service provider's card |
| `templates` | `templates.json` | `service-templates` | List of every template |
| `template` | `templates/{service_provider_id}/{service_id}.json` | `template-summary` | One template's card |

The report name is the `report.py` subcommand that produces the same data; you don't need
it to read the files.

## Reading order

1. Fetch `manifest.json` from the release (`current/manifest.json`).
2. Build each file's URL from the kind's `path` in `manifest.files`: replace each
   `{placeholder}` with the [encoded](#id-encoding) id.
3. Fetch the list or card file.

Don't hard-code the paths from the table above: the manifest's `path` is authoritative.

## `manifest.json`

The release's index, written last. One JSON object on one line.

| Field | Type | Meaning |
|---|---|---|
| `format_version` | integer | Version of this format, currently `5`. See [Versioning](#versioning-and-compatibility). |
| `generated_at` | string | When the export ran, UTC, to the second, as `YYYY-MM-DDTHH:MM:SSZ` (e.g. `2026-10-01T00:00:00Z`). Every other file of the release carries the same value. Show it in the page header. |
| `schema_version` | integer | Version of the database schema the export was read from. Informational. |
| `share_import` | object or null | The [domain-share import](#domain-share-import). `null` when no import has share data; then every domain and reach column is `null`. |
| `share_import.import_id` | integer | The import's id. |
| `share_import.status` | string | `completed`, `in_progress` (only when the export was asked to include an unfinished scan) or `pruned` (the scan's detailed data was deleted by housekeeping; its totals were kept). |
| `share_import.source` | string | `live` (computed from the scan's data) or `snapshot` (from the totals kept after pruning). Same numbers either way. |
| `share_import.started_at` | timestamp or null | When the import started. `null` when unknown (an import pruned before its dates were kept). |
| `share_import.completed_at` | timestamp or null | When the import completed. `null` while it runs (`in_progress`), and when unknown as for `started_at`. The notes name the import by this time (else by `started_at`). |
| `share_import.scanned_domains` | integer | Domains the import scanned: the denominator of every domain percentage. |
| `share_import.zones` | array of strings or null | The zones the import scanned, by name without the trailing dot (e.g. `["com", "net", "org"]`), sorted. `null` when not recorded (imports from before the zones were recorded). |
| `share_import.zone_domains` | integer or null | The domains the zone files listed, summed over the zones, **before** sampling: the population the scanned domains were drawn from. `null` as for `zones`. |
| `share_import.sample_percent` | number or null | The percentage of the zones' domains sampled for scanning: `100` is a census (every domain scanned), e.g. `10.1` a probe sample. `null` when not recorded, or when the import's zones were sampled at different rates. |
| `latest_sweep` | object or null | The support sweep that completed last, of any kind (a full sweep, or a smaller run: one DNS provider, one template or service provider, or the daily run of recently changed templates): when support was last measured anywhere. `null` when no sweep has completed since completion times were recorded. A sweep still running is never this one. See [sweep completion](#sweep-completion). |
| `latest_sweep.sweep_id` | integer | The sweep. |
| `latest_sweep.started_at` | timestamp | When it started. |
| `latest_sweep.completed_at` | timestamp | When it completed. |
| `latest_full_sweep` | object or null | The full support sweep (all DNS providers × all templates) that completed last: when the whole ecosystem was last measured. Never a weekly sweep, although `overview.json` `ecosystem` has rows for those too: a weekly sweep re-probes the supporting DNS providers only. Same keys as `latest_sweep`; `null` likewise. It is also `latest_sweep` unless a smaller run completed after it. |
| `latest_full_sweep.sweep_id` | integer | The sweep. |
| `latest_full_sweep.started_at` | timestamp | When it started. |
| `latest_full_sweep.completed_at` | timestamp | When it completed. |
| `id_encoding` | string | The [id encoding](#id-encoding) in one sentence, for reference. |
| `files` | object | Every file kind, keyed by kind (table above), in the order written. |
| `files.<kind>.path` | string | The kind's path relative to the release. A list's path is fixed; a card's has `{placeholder}`s. |
| `files.<kind>.report` | string | The report the file kind holds. |
| `files.<kind>.rows` | object | Lists only: row count per table id, e.g. `{"dns_providers": 6}`. |
| `files.<kind>.list` | string | Cards only: the kind of the list whose rows name the cards. |
| `files.<kind>.table` | string | Cards only: the table id within that list whose rows name the cards. |
| `files.<kind>.keys` | object | Cards only: placeholder → the list column holding its id. For `template`, `{"service_provider_id": "provider_id", "service_id": "service_id"}`: the templates list calls the service provider's id `provider_id`. |
| `files.<kind>.files` | integer | Cards only: card files written, one per row of the list table. |

## Id encoding

Ids come from external data (the Templates repository, DNS providers' settings
responses), so each id is encoded into exactly one safe path segment before it is put
into a path template. Numeric ids are encoded from their decimal text.

**Encode:** take the id's UTF-8 bytes. Keep each byte that is `a`-`z`, `0`-`9`, `.`, `_`
or `-`, except a `.` that is the first byte. Replace every other byte, uppercase letters
included, with `~` followed by the byte's value as two lowercase hex digits.

**Decode:** replace each `~xx` with the byte `0xxx`, keep every other character, and read
the bytes as UTF-8.

The result never contains `/`, `%` or uppercase letters, is never `.` or `..` and never
starts with `.`. It is safe on case-insensitive filesystems and needs no further URL
encoding. Domain-like ids stay readable.

| Id | Encoded segment |
|---|---|
| `example.com` | `example.com` |
| `42` | `42` |
| `Example.com` | `~45xample.com` |
| `a/b` | `a~2fb` |
| `100%` | `100~25` |
| `..` | `~2e.` |
| `.hidden` | `~2ehidden` |
| `münchen.de` | `m~c3~bcnchen.de` |
| `UPPER case` | `~55~50~50~45~52~20case` |

For example, the card of template `Mail` of service provider `Acme.example` is
`templates/~41cme.example/~4dail.json`.

Page URLs (see [Cross-links](#cross-links)) carry the **raw** id in a query parameter
(`?id=Acme.example`, URL-encoded by the browser as usual); the page encodes it with the
rule above to build the file path. Only file paths use this encoding.

```js
function encodeSegment(id) {
  const bytes = new TextEncoder().encode(String(id));
  let out = "";
  bytes.forEach((b, i) => {
    const keep = (b >= 0x61 && b <= 0x7a) || (b >= 0x30 && b <= 0x39) || b === 0x5f || b === 0x2d
      || (b === 0x2e && i > 0);
    out += keep ? String.fromCharCode(b) : "~" + b.toString(16).padStart(2, "0");
  });
  return out;
}
```

## File shape

Every file except the manifest has the same shape:

```json
{"generated_at": "2026-10-01T00:00:00Z",
 "notes": ["Domain share: import completed 2026-06-01 07:00 UTC (live), 12,000 domains scanned. Support columns are current state."],
 "tables": {
  "<table id>": {"title": "...", "columns": [{"key": "...", "header": "..."}], "rows": [{...}], "footer": null}
 }}
```

| Key | Meaning |
|---|---|
| `generated_at` | The release's `generated_at` (same as the manifest's). |
| `notes` | Free-text lines to show with the data, in order. In every list and card except `overview.json` the first note names the domain-share import. Show them verbatim, don't parse them; the manifest's `share_import` has the same facts as fields. Notes carry no internal ids: the domain-share import is named by its completion time (UTC), or by its start time while it runs or when its completion is unknown. |
| `tables` | The file's tables, keyed by **table id**, in display order. Find a table by its id, never by position or title. |
| `tables.<id>.title` | Display title. |
| `tables.<id>.columns` | The columns in display order: `key` (the row key) and `header` (a short display label, often upper case). |
| `tables.<id>.rows` | The rows. Each row is an object with exactly the column keys, holding raw values: numbers stay numbers, a count and its percentage are separate keys. |
| `tables.<id>.footer` | A summary row keyed like the rows (e.g. a `TOTAL` row), or `null`. |

Some tables hold one record, not a list: they have exactly one row, and each column is a
field (e.g. a DNS provider's stored data). Read them as `rows[0].<field>`; show them
transposed, one labelled line per field.

Each file is compact JSON with one table row per line, so it can be parsed while it
downloads, but a normal `JSON.parse` of the whole file is fine.

**Ignore what you don't know.** New tables, new columns and new keys may appear without
a format version bump. A frontend must ignore unknown tables, columns and keys, and must
not depend on the order of keys inside a row.

## Values

| Kind of value | Representation |
|---|---|
| Count | Integer ≥ 0. |
| Percentage | Number on a 0–100 scale, **not rounded** (e.g. `33.33333333333333`): round for display. |
| Timestamp | String, UTC, `YYYY-MM-DD HH:MM:SS` (e.g. `2026-03-02 02:00:00`). A few older values may be ISO 8601 with a `T` and a UTC offset; read the first 19 characters. Only `generated_at` uses the `YYYY-MM-DDTHH:MM:SSZ` form. |
| Id | `dns_provider_id`, `import_id`, `sweep_id`: integers. `provider_id`, `service_provider_id`, `service_id`: strings. |
| `null` | Unknown or not applicable, **never** a stand-in for zero. The column tables below say what `null` means where it can occur. A domain or reach column is `null` when there is no domain-share import (`share_import` is `null`) or the import has no measurement for that entity. A percentage is `null` when its denominator is unknown or 0. |

Text values (names, descriptions, error messages) come from external sources. Escape them
when rendering HTML.

## Domain-share import

Domain and reach columns (`domains`, `domains_pct`, `reach_domains`, `reach_pct`,
`share_pct`, `rank`, ...) describe **one import**, the same for every file of a release:
`manifest.share_import`. By default it is the newest completed import. The person running
the export can pick another one, or include an import that is still running.

Support columns (supported counts, supporting providers, statuses) are always the
**current state** at `generated_at`, not the state at the time of that import. A DNS
provider's support is probed continuously, while scans of the zone are rare and large, so
the two have different clocks. The history tables give the past values of both.

Domains are attributed through the URL in each domain's Domain Connect record: a domain
counts for the DNS provider that currently owns that URL. Each URL has one owner, so no
domain counts twice.

## Provider statuses

A DNS provider's `settings_status` and `support_status` describe its latest **completed**
run, never a single request:

- **Settings**: the latest settings run that finished with one of the DNS provider's
  Domain Connect URLs. A request that fails is retried (with another example domain, then
  with growing pauses); only once every retry is used up, or the host is given up, does the
  run record `failed`. `ok` when any of its URLs answered in that run.
- **Support**: the latest support sweep that probed it and has finished. Each probe is
  retried before it counts as failed. `support_answered` and `support_failed` count the
  sweep's probes by their final outcome; `support_status` summarises them (`ok`, `partial`,
  `error`, or `dead` when the host was given up during the sweep). Any finished run counts,
  also a weekly or single-template one: the counters show how much it covered.

While a run is still going, its DNS providers keep the statuses of the previous completed
run, so a timeout during a sweep never shows up as an error in the export.

## Files

Each file kind below lists its tables by id, and every column with its type and meaning.
Unless said otherwise, a list contains **every** entity (no limit, no filter) and a card
always contains all of its tables.

### `overview.json` (report `support-overview`)

The data for the "Domain Connect support over time" chart: two series, each on its own
time axis, oldest first. No notes.

#### Table `adoption`

"Adoption per import": one row per import, oldest first. Completed imports and pruned ones
(kept as totals after housekeeping) are included, and an import still running only if the
export was run with `--include-incomplete` (its `status` is then `in_progress`). An import
without data has no row.

| Key | Type | Meaning |
|---|---|---|
| `import_id` | integer | The import. |
| `status` | string | `completed`, `pruned` or `in_progress`. |
| `source` | string | `live` or `snapshot` (from the totals kept after pruning). |
| `started_at` | timestamp | When the import started. For imports pruned before the totals kept their dates, inferred from the `import_id` read as Unix seconds; `null` when that is not a plausible date. |
| `completed_at` | timestamp | When the import finished. `null` while running, and for some old pruned imports. |
| `zones` | array of strings | The zones the import scanned, sorted (e.g. `["com", "org"]`). `null` when not recorded (imports from before the zones were recorded). |
| `zone_domains` | count | The domains of those zones before sampling (the population). `null` as for `zones`. |
| `sample_percent` | number | Percentage of the zones' domains sampled for scanning, `100` for a census. `null` when not recorded or when the zones were sampled at different rates. |
| `scanned_domains` | count | Domains scanned. |
| `dc_domains` | count | Scanned domains whose Domain Connect URL is attributed to a known DNS provider. `null` when the import has no share data. |
| `dc_pct` | percentage | `dc_domains` / `scanned_domains`. `null` when either is unknown or nothing was scanned. |
| `dc_domains_total` | count | Every scanned domain with a Domain Connect URL, attributed or not (at least `dc_domains`). `null` for old pruned imports that didn't keep it. |
| `dc_total_pct` | percentage | `dc_domains_total` / `scanned_domains`. `null` as above. |
| `dns_providers` | count | DNS providers with at least one attributed domain in the import. `null` without share data. |
| `stacks` | count | Distinct stacks among those DNS providers (by each provider's current stack). `null` without share data. |

#### Table `ecosystem`

"Support ecosystem per sweep": one row per full or weekly support sweep, oldest first,
with the support state once that sweep had run. A weekly sweep re-probes the DNS providers
supporting a template only; the others' state is carried forward from the previous row.
Support seen by smaller runs in between counts towards the preceding row's sweep. Sweeps
before the first recorded support have no row. Older rows are monthly, newer ones weekly:
plot by `started_at`, not by row index (see [Time series](#time-series)).

A row therefore covers a window: from its sweep's start up to the next row's sweep's start
(exclusive), or, for the last row, up to the export. The denominators `known_dns_providers`
and `published_templates` count over the same window, so `supporting_dns_providers` ≤
`known_dns_providers` and `supported_templates` ≤ `published_templates` in every row.

| Key | Type | Meaning |
|---|---|---|
| `sweep_id` | integer | The sweep. |
| `started_at` | timestamp | When the sweep started. |
| `completed_at` | timestamp | When it completed. `null` while it runs, or if not recorded (see [sweep completion](#sweep-completion)). |
| `supporting_dns_providers` | count | DNS providers supporting at least one template. |
| `supporting_stacks` | count | Distinct stacks among them (by each provider's current stack). |
| `supported_templates` | count | Templates supported by at least one DNS provider. |
| `supported_combinations` | count | Distinct (DNS provider, template) pairs with support. |
| `known_dns_providers` | count | DNS providers first seen before the row's window ends (the next row's sweep start; for the last row, any time up to the export): a denominator for `supporting_dns_providers`. |
| `published_templates` | count | Templates added to the Templates repository before the row's window ends (as `known_dns_providers`): a denominator for `supported_templates`. |

### `dns-providers.json` (report `dns-providers`)

#### Table `dns_providers`

"DNS providers": every DNS provider, including ones never probed, unreachable ones and
ones with no domains in the domain-share import. Ordered by `domains` descending
(unmeasured last); without a domain-share import, by `supported_count` descending, then
name.

The support columns count **templates**: every template, when the DNS provider can be asked
(see *Total* in the [Glossary](#glossary)).

| Key | Type | Meaning |
|---|---|---|
| `name` | string | The DNS provider's name (`providerName` from its settings), else its first Domain Connect URL, else `?`. Not unique: several deployments of one stack often share a name; show `api_host` next to it. |
| `dns_provider_id` | integer | The DNS provider's id: links to its card. |
| `provider_id` | string | Its stack: links to the stack card. `null` when it declares none (no stack). |
| `api_host` | string | Host name of its Domain Connect API. `null` when it declares none. |
| `settings_status` | string | Outcome of the latest settings run that finished with one of its Domain Connect URLs: `ok` (its settings answered, possibly after retries) or `failed` (every retry used up, or the host given up; the card's `settings_error_kind` says which). `null` before the first finished run. See [Provider statuses](#provider-statuses). |
| `support_status` | string | Outcome of the latest completed support sweep that probed it, after retries: `ok` (every probe answered), `partial` (some answered, some failed), `error` (none answered) or `dead` (its host was given up during the sweep: unreachable for a long time, or a permanent failure such as an invalid TLS certificate). `null` before the first completed sweep. |
| `support_answered` | count | Probes of that sweep answered (supported or not supported). `null` with `support_status`. |
| `support_failed` | count | Probes of that sweep that failed after their retries. `null` with `support_status`. |
| `total` | count | Templates it can be asked about (see *Total* in the [Glossary](#glossary)): every template, or 0 when it declares no Domain Connect API. |
| `supported_count` | count | Templates supported (see [Glossary](#glossary)): the number of rows of its card's `supported_templates`. Rank "most templates supported" by this. |
| `supported_pct` | percentage | `supported_count` / `total`. `null` when `total` is 0. |
| `unsupported_count` | count | Templates not supported (see [Glossary](#glossary)). |
| `unsupported_pct` | percentage | `unsupported_count` / `total`. `null` when `total` is 0. |
| `undetermined_count` | count | Templates not yet determined (see [Glossary](#glossary)): `total - supported_count - unsupported_count`. |
| `undetermined_pct` | percentage | `undetermined_count` / `total`. `null` when `total` is 0. |
| `supported_templates_change` | integer | Change in supported templates over its latest sweep: its card's last `support_history` row's `supported_templates` minus the previous row's. `null` when there is no previous row, or the previous sweep started before the DNS provider was first seen (no measured starting point). |
| `supported_templates_change_90d` | integer | Change in supported templates over about 90 days: its card's last `support_history` row minus the newest row whose sweep started at least 90 days before the last one's. `null` when there is no such row, or it started before the DNS provider was first seen. |
| `with_version_count` | count | Supported templates whose latest answer named a version (`served_version` not `null` on its card). See *Served template* in the [Glossary](#glossary). |
| `full_template_count` | count | Supported templates answered with the full template (`response_kind` `template`). |
| `morphed_count` | count | Of those, templates that differ from the repository's (`template_match` `morphed`). |
| `outdated_count` | count | Of those, templates with a version below the repository's (`template_match` `outdated`). |
| `domains` | count | Domains attributed to this DNS provider in the domain-share import. `null` without a domain-share import, or when the provider has no measurement in a pruned import (it was first seen later). |
| `domains_pct` | percentage | `domains` / the import's scanned domains. |

### `dns-providers/{dns_provider_id}.json` (report `dns-provider-summary`)

One DNS provider's card, one per row of `dns-providers.json`.

#### Table `provider`

"DNS provider": its stored data, one record.

| Key | Type | Meaning |
|---|---|---|
| `id` | integer | The DNS provider's id (`dns_provider_id`). |
| `name` | string | `providerName` from its settings. |
| `provider_id` | string | Its stack. `null` if it declares none. |
| `domain_connect_url` | string | The Domain Connect URL it was first discovered from. Display only; `urls` has the current ones. |
| `api_url` | string | Its Domain Connect API URL (`urlAPI`). `null` if it declares none. |
| `sync_url` | string | Its synchronous-flow UI URL (`urlSyncUX`). `null` if none. |
| `async_url` | string | Its asynchronous-flow UI URL (`urlAsyncUX`). `null` if none. |
| `control_panel_url` | string | Its control panel URL (`urlControlPanel`). `null` if none. |
| `nameservers` | string | Its declared name servers as a JSON-encoded array **inside a string** (e.g. `"[\"ns1.example.net\"]"`): parse it a second time. `null` if none. |
| `first_seen_at` | timestamp | When it was first identified. `null` when unknown. |
| `settings_status` | string | As in the list. |
| `settings_error_kind` | string | Why the latest finished settings run failed: `http_error` (an unusable HTTP answer, every retry used up) or `dead` (the host was given up). `null` unless `settings_status` is `failed`. |
| `settings_last_error` | string | That run's error message. `null` unless `settings_status` is `failed`. |
| `settings_last_seen_ok_at` | timestamp | When its settings last answered, in a finished run. `null` if never. |
| `support_status` | string | As in the list. |
| `support_answered` | count | As in the list. |
| `support_failed` | count | As in the list. |
| `support_last_error` | string | The error message of a probe that failed in that sweep. `null` when none failed. |
| `support_last_seen_ok_at` | timestamp | When the latest completed sweep in which a probe of it was answered finished. `null` if never. |

#### Table `support`

"Template support": one row, the same numbers as its row in `dns-providers.json`.

| Key | Type | Meaning |
|---|---|---|
| `total` | count | Templates it can be asked about, as in `dns-providers.json`. |
| `supported_count` | count | Supported. |
| `supported_pct` | percentage | `supported_count` / `total`; `null` when `total` is 0. |
| `unsupported_count` | count | Not supported. |
| `unsupported_pct` | percentage | `unsupported_count` / `total`; `null` when `total` is 0. |
| `undetermined_count` | count | Not yet determined. |
| `undetermined_pct` | percentage | `undetermined_count` / `total`; `null` when `total` is 0. |
| `with_version_count` | count | As in `dns-providers.json`. |
| `full_template_count` | count | As in `dns-providers.json`. |
| `morphed_count` | count | As in `dns-providers.json`. |
| `outdated_count` | count | As in `dns-providers.json`. |

#### Table `share`

"Domain share in the selected import": one row, or no row without a domain-share import.

| Key | Type | Meaning |
|---|---|---|
| `import_id` | integer | The domain-share import. |
| `status` | string | `completed`, `in_progress` or `pruned`. |
| `source` | string | `live` or `snapshot`. |
| `domains` | count | Its domains in that import. `null` when the import has no measurement for it. |
| `scanned_domains` | count | The import's scanned domains. |
| `share_pct` | percentage | `domains` / `scanned_domains`. |
| `rank` | integer | 1 = most domains among the import's DNS providers; ties share a rank. `null` at 0 or unmeasured domains. |
| `providers` | count | DNS providers with domains in the import: the denominator of `rank`. |

#### Table `urls`

"Domain Connect URLs owned": the Domain Connect URLs (from domains' records) that
currently resolve to this DNS provider, by first seen.

| Key | Type | Meaning |
|---|---|---|
| `domain_connect_url` | string | The URL. |
| `first_seen_at` | timestamp | When this URL was first attributed to a DNS provider. `null` when unknown. |

#### Table `supported_templates`

"Supported templates (current state)": every template it supports, with what its latest
answer served, ordered by service provider, then template.

| Key | Type | Meaning |
|---|---|---|
| `service_provider_name` | string | The service provider's name, else its id. |
| `service_provider_id` | string | Links to the service provider card (and with `service_id` to the template card). |
| `service_name` | string | The template's name, else its id. |
| `service_id` | string | The template's id. |
| `served_version` | integer | The version its latest answer named; `null` when none (see *Served template* in the [Glossary](#glossary)). |
| `repository_version` | integer | The template's version in the Templates repository now. |
| `response_kind` | string | `empty`, `version` or `template`. `null` when not recorded yet. |
| `template_match` | string | For `response_kind` `template`: `match`, `morphed` or `outdated`; else `null`. |
| `since` | timestamp | When it first supported the template: see [Supported since](#supported-since). `null` if not recorded. |

#### Table `support_history`

"Supported templates per support sweep": one row per sweep that re-probed all of its
templates (a full sweep, a sweep of this DNS provider only, or a weekly sweep while it
supported a template), oldest first.

| Key | Type | Meaning |
|---|---|---|
| `sweep_id` | integer | The sweep. |
| `started_at` | timestamp | When it started. |
| `completed_at` | timestamp | When it completed. `null` while it runs, or if not recorded (see [sweep completion](#sweep-completion)). |
| `supported_templates` | count | Templates it supported once the sweep had run. |
| `change` | integer | Difference to the previous row (the first row's difference to 0). |

#### Table `share_history`

"Domain share per import": its share in every completed import and every pruned import,
oldest first.

| Key | Type | Meaning |
|---|---|---|
| `import_id` | integer | The import. |
| `completed_at` | timestamp | When it finished. `null` for a pruned import. |
| `status` | string | `completed` or `pruned`. |
| `source` | string | `live` or `snapshot`. |
| `domains` | count | Its domains. `null` when the import has no measurement for it. |
| `scanned_domains` | count | The import's scanned domains. |
| `share_pct` | percentage | `domains` / `scanned_domains`. |
| `change_pct` | number | Change of `share_pct` in percentage points since the previous row that measured it. `null` for the first such row or an unmeasured one. |
| `rank` | integer | As in `share`, within that import. |
| `providers` | count | As in `share`, within that import. |

### `stacks.json` (report `stacks`)

#### Table `stacks`

"DNS provider stacks": every stack. DNS providers without a stack are not in any row. The
support of a stack is given as a distribution over its deployments (min/median/max),
because it often varies a lot between deployments of the same software; what their supported
templates serve is summed. Ordered by
`domains` descending; without a domain-share import, by `deployments` descending.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | Name of the stack's DNS provider with the lowest id, else the `provider_id`, else `?`. |
| `provider_id` | string | The stack's id: links to its card, and to its deployments in `dns-providers.json` (rows with this `provider_id`). |
| `deployments` | count | DNS providers in the stack, probed or not. |
| `min_supported_pct` | percentage | Lowest `supported_pct` among its DNS providers with at least one probe answer (`supported_count + unsupported_count` above 0). `null` when none has an answer. |
| `median_supported_pct` | percentage | Median of the same. |
| `max_supported_pct` | percentage | Highest of the same. |
| `supported_templates` | count | Templates at least one of its DNS providers supports now, each counted once: the number of rows of its card's `template_coverage`. |
| `supported_templates_change` | integer | Change in the templates any of its DNS providers supported, from the previous full or weekly sweep to the latest one, replayed like a DNS provider card's `support_history` but over full and weekly sweeps only. `null` when there is no previous such sweep, or it started before the stack's first DNS provider was first seen. |
| `supported_templates_change_90d` | integer | The same from the newest full or weekly sweep that started at least 90 days before the latest one. `null` likewise. |
| `with_version_count` | count | Sum of its DNS providers' `with_version_count` (`dns-providers.json`). |
| `full_template_count` | count | Sum of its DNS providers' `full_template_count`. |
| `morphed_count` | count | Sum of its DNS providers' `morphed_count`. |
| `outdated_count` | count | Sum of its DNS providers' `outdated_count`. |
| `domains` | count | Sum of its DNS providers' domains in the domain-share import. `null` without one, or when no deployment has a measurement. |
| `domains_pct` | percentage | `domains` / the import's scanned domains. |

### `stacks/{provider_id}.json` (report `stack-summary`)

One stack's card, one per row of `stacks.json`.

#### Table `stack`

"DNS provider stack": its row of `stacks.json`, one record, same keys and values.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | As in `stacks.json`. |
| `provider_id` | string | As in `stacks.json`. |
| `deployments` | count | As in `stacks.json`. |
| `min_supported_pct` | percentage | As in `stacks.json`. |
| `median_supported_pct` | percentage | As in `stacks.json`. |
| `max_supported_pct` | percentage | As in `stacks.json`. |
| `supported_templates` | count | As in `stacks.json`. |
| `supported_templates_change` | integer | As in `stacks.json`. |
| `supported_templates_change_90d` | integer | As in `stacks.json`. |
| `with_version_count` | count | As in `stacks.json`. |
| `full_template_count` | count | As in `stacks.json`. |
| `morphed_count` | count | As in `stacks.json`. |
| `outdated_count` | count | As in `stacks.json`. |
| `domains` | count | As in `stacks.json`. |
| `domains_pct` | percentage | As in `stacks.json`. |

#### Table `deployments`

"Deployments": its DNS providers, each its row of `dns-providers.json` without
`provider_id`, in the same order. At least one row.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | As in `dns-providers.json`. |
| `dns_provider_id` | integer | Links to the DNS provider card. |
| `api_host` | string | As in `dns-providers.json`. |
| `settings_status` | string | As in `dns-providers.json`. |
| `support_status` | string | As in `dns-providers.json`. |
| `support_answered` | count | As in `dns-providers.json`. |
| `support_failed` | count | As in `dns-providers.json`. |
| `total` | count | As in `dns-providers.json`. |
| `supported_count` | count | As in `dns-providers.json`. |
| `supported_pct` | percentage | As in `dns-providers.json`. |
| `unsupported_count` | count | As in `dns-providers.json`. |
| `unsupported_pct` | percentage | As in `dns-providers.json`. |
| `undetermined_count` | count | As in `dns-providers.json`. |
| `undetermined_pct` | percentage | As in `dns-providers.json`. |
| `supported_templates_change` | integer | As in `dns-providers.json`. |
| `supported_templates_change_90d` | integer | As in `dns-providers.json`. |
| `with_version_count` | count | As in `dns-providers.json`. |
| `full_template_count` | count | As in `dns-providers.json`. |
| `morphed_count` | count | As in `dns-providers.json`. |
| `outdated_count` | count | As in `dns-providers.json`. |
| `domains` | count | As in `dns-providers.json`. |
| `domains_pct` | percentage | As in `dns-providers.json`. |

#### Table `template_coverage`

"Supporting deployments per template (current state)": one row per template that at least
one of its deployments supports (a template none supports has no row). Ordered by
`reach_domains` descending; without a domain-share import, by `supporting_deployments`
descending; then by service provider and template name.

| Key | Type | Meaning |
|---|---|---|
| `service_provider_name` | string | The service provider's name, else its id. |
| `service_provider_id` | string | Links to the service provider card (and the template card). |
| `service_name` | string | The template's name, else its id. |
| `service_id` | string | The template's id. |
| `supporting_deployments` | count | Its deployments supporting the template. |
| `supporting_pct` | percentage | `supporting_deployments` / all its deployments (probed or not). |
| `reach_domains` | count | Domains behind the supporting deployments in the domain-share import. `null` without one. |
| `reach_pct` | percentage | `reach_domains` / the import's scanned domains. |

#### Table `share_history`

"Domain share per import": the stack's domains in every completed import and every pruned
import, oldest first, always summed over its **current** deployments.

| Key | Type | Meaning |
|---|---|---|
| `import_id` | integer | The import. |
| `completed_at` | timestamp | When it finished. `null` for a pruned import. |
| `status` | string | `completed` or `pruned`. |
| `source` | string | `live` or `snapshot`. |
| `domains` | count | Sum of its deployments' domains. `null` when none of them has a measurement there. |
| `scanned_domains` | count | The import's scanned domains. |
| `share_pct` | percentage | `domains` / `scanned_domains`. |
| `change_pct` | number | Change of `share_pct` in percentage points since the previous row that measured it. `null` for the first such row or an unmeasured one. |
| `rank` | integer | 1 = most domains among the import's stacks (each summed over its current deployments); ties share a rank. `null` at 0 or unmeasured domains. |
| `stacks` | count | Stacks with domains in the import: the denominator of `rank`. |

### `service-providers.json` (report `service-providers`)

#### Table `service_providers`

"Service providers": every service provider, including one without templates. Ordered by
`reach_domains` descending; without a domain-share import, by `supported_templates`
descending; ties by name, ignoring case.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | Its name, else its id. |
| `service_provider_id` | string | Its id: links to its card, and to its templates in `templates.json` (rows whose `provider_id` is this id). |
| `templates` | count | Its templates. 0 without templates. |
| `supported_templates` | count | Its templates at least one DNS provider supports. |
| `supporting_dns_providers` | count | DNS providers supporting at least one of its templates, each counted once. |
| `first_added_at` | timestamp | When its first template was published. `null` without templates or when unknown. |
| `last_updated_at` | timestamp | When one of its templates last changed. `null` without templates or when unknown. |
| `reach_domains` | count | Domains behind its `supporting_dns_providers` in the domain-share import, each DNS provider counted once (so at most the sum of its templates' reach). `null` without a domain-share import. |
| `reach_pct` | percentage | `reach_domains` / the import's scanned domains. |

### `service-providers/{service_provider_id}.json` (report `service-provider-summary`)

One service provider's card, one per row of `service-providers.json`. Every per-template
number equals that template's card.

#### Table `service_provider`

"Service provider": one record.

| Key | Type | Meaning |
|---|---|---|
| `service_provider_id` | string | Its id. |
| `name` | string | Its stored name. `null` when it declares none. |
| `first_added_at` | timestamp | As in `service-providers.json`. |
| `last_updated_at` | timestamp | As in `service-providers.json`. |

#### Table `support`

"Template support (current state)": one record, the same values as its row in
`service-providers.json`.

| Key | Type | Meaning |
|---|---|---|
| `templates` | count | Its templates. |
| `supported_templates` | count | Its templates at least one DNS provider supports. |
| `supporting_dns_providers` | count | DNS providers supporting at least one of them, each counted once. |
| `reach_domains` | count | Domains behind those DNS providers. `null` without a domain-share import. |
| `reach_pct` | percentage | `reach_domains` / the import's scanned domains. |

#### Table `templates`

"Templates (current state)": one row per template. Ordered by `reach_domains` descending;
without a domain-share import, by `supporting_providers` descending; ties by `service_id`.
Empty for a service provider without templates.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | The template's name, else the id. |
| `service_id` | string | The template's id: with the card's `service_provider_id`, links to the template card. |
| `version` | integer | Its version in the Templates repository now. |
| `added_at` | timestamp | When it was added to the Templates repository. `null` when unknown. |
| `updated_at` | timestamp | When it last changed there. `null` when unknown. |
| `supporting_providers` | count | DNS providers supporting it. |
| `reach_domains` | count | Domains behind them. `null` without a domain-share import. |
| `reach_pct` | percentage | `reach_domains` / the import's scanned domains. |

#### Table `support_history`

"Supporting DNS providers per template and support sweep", in long format: one row per
(sweep, template) for each sweep that re-probed the template on every DNS provider.
Ordered by sweep, then `service_id`. It is each template card's `history` without
`change`.

| Key | Type | Meaning |
|---|---|---|
| `sweep_id` | integer | The sweep. |
| `started_at` | timestamp | When it started. |
| `completed_at` | timestamp | When it completed. `null` while it runs, or if not recorded (see [sweep completion](#sweep-completion)). |
| `service_id` | string | The template. |
| `supporting_providers` | count | DNS providers supporting it once the sweep had run. |

### `templates.json` (report `service-templates`)

#### Table `service_templates`

"Service templates": every template, including templates no DNS provider has answered for
yet. Ordered by `reach_domains` descending;
without a domain-share import, by `supported_count` descending.

The support columns count **DNS providers**: every DNS provider that can be asked (see
*Total* in the [Glossary](#glossary)).

| Key | Type | Meaning |
|---|---|---|
| `provider_name` | string | The service provider's name, else its id. |
| `provider_id` | string | The **service provider's** id (not a stack): links to the service provider card, and with `service_id` to the template card. |
| `service_name` | string | The template's name, else its id. |
| `service_id` | string | The template's id. |
| `added_at` | timestamp | When it was added to the Templates repository. `null` when unknown. |
| `total` | count | DNS providers that can be asked. 0 only when none can. |
| `supported_count` | count | DNS providers supporting it (see [Glossary](#glossary)): as the service provider card's `templates.supporting_providers`. |
| `supported_pct` | percentage | `supported_count` / `total`. `null` when `total` is 0. |
| `unsupported_count` | count | DNS providers not supporting it (see [Glossary](#glossary)). |
| `unsupported_pct` | percentage | `unsupported_count` / `total`. `null` when `total` is 0. |
| `undetermined_count` | count | DNS providers not yet determined: `total - supported_count - unsupported_count`. |
| `undetermined_pct` | percentage | `undetermined_count` / `total`. `null` when `total` is 0. |
| `reach_domains` | count | Domains behind the DNS providers counted in `supported_count`, each counted once. `null` without a domain-share import. |
| `reach_pct` | percentage | `reach_domains` / the import's scanned domains. |

### `templates/{service_provider_id}/{service_id}.json` (report `template-summary`)

One template's card, one per row of `templates.json`. Its five table ids are prefixed with
the template's raw (unencoded) ids: `<service_provider_id>/<service_id>/metadata`, and so
on. Find them by that full id, or by the suffix after the last `/`. Each title starts with
`<service_provider_id>/<service_id> - `.

#### Table `{service_provider_id}/{service_id}/metadata`

"Template metadata": the template as the Templates repository holds it now, one record.

| Key | Type | Meaning |
|---|---|---|
| `service_provider_name` | string | The service provider's name. `null` if it declares none. |
| `service_provider_id` | string | Links to the service provider card. |
| `service_id` | string | The template's id. |
| `name` | string | The template's name. `null` if none. |
| `version` | integer | Its version in the Templates repository. |
| `description` | string | Free text from the template; may span several lines. `null` if none. |
| `variable_description` | string | The template's description of its variables. `null` if none. |
| `logo_url` | string | The template's logo URL. `null` if none. |
| `template_sha` | string | Git blob SHA of the template file in the Templates repository at the last sync. |
| `created_at` | timestamp | When it was added to the Templates repository (from its git history). `null` when unknown. |
| `updated_at` | timestamp | When it last changed there. `null` when unknown. |

#### Table `{service_provider_id}/{service_id}/records`

"Records": the DNS records the template applies, one row each, as published in the
Templates repository. **The columns vary per template**: they are the field names the
records use, verbatim as key and header, the common ones first in this order, then any
others alphabetically. A field a record lacks is `null`. No rows when no records are
stored.

| Key | Type | Meaning |
|---|---|---|
| `type` | string | Record type (`A`, `CNAME`, `TXT`, `MX`, `SRV`, `SPFM`, ...). |
| `groupId` | string | Group the record belongs to; groups can be applied separately. |
| `host` | string | Host name, relative to the domain (`@` = the domain itself). May contain `%variables%`. |
| `pointsTo` | string | Target of an `A`/`AAAA`/`CNAME`/`MX`/`NS` record. |
| `data` | string | Content of a `TXT` (or similar) record. |
| `target` | string | Target of an `SRV` record. |
| `ttl` | integer | Time to live, seconds. |
| `priority` | integer | Priority of an `MX` or `SRV` record. |
| `weight` | integer | Weight of an `SRV` record. |
| `port` | integer | Port of an `SRV` record. |
| `protocol` | string | Protocol of an `SRV` record (e.g. `_tcp`). |
| `service` | string | Service of an `SRV` record (e.g. `_sip`). |
| `spfRules` | string | Rules an `SPFM` record merges into the domain's SPF record. |
| `txtConflictMatchingMode` | string | How a `TXT` record replaces existing ones (`None`, `All`, `Prefix`). |
| `txtConflictMatchingPrefix` | string | The prefix for `txtConflictMatchingMode` `Prefix`. |

Any other field follows the Domain Connect template specification and is shown as is.
Values are as written in the template file, so a number may also appear as a string, and
`%variables%` may appear in any field.

#### Table `{service_provider_id}/{service_id}/supporters`

"Supporting DNS providers (current state)": every DNS provider currently supporting the
template, with what its latest answer served, one row each. Ordered by `domains` descending; without a domain-share import, by
name. The `footer` is a `TOTAL` row: `name` is `TOTAL`, `domains` and `reach_pct` are the
sums (`null` without a domain-share import), every other key is `null`.

| Key | Type | Meaning |
|---|---|---|
| `name` | string | As in `dns-providers.json`. |
| `dns_provider_id` | integer | Links to the DNS provider card. |
| `provider_id` | string | Its stack: links to the stack card. `null` if none. |
| `api_host` | string | As in `dns-providers.json`. |
| `served_version` | integer | As in the DNS provider card's `supported_templates`. |
| `response_kind` | string | As there. |
| `template_match` | string | As there. |
| `since` | timestamp | When it first supported the template, the same value as its DNS provider card's `supported_templates` `since`: see [Supported since](#supported-since). `null` if not recorded. |
| `domains` | count | Its domains in the domain-share import. `null` without one. |
| `reach_pct` | percentage | `domains` / the import's scanned domains. |

#### Table `{service_provider_id}/{service_id}/served`

"Served templates (current state)": what the supporters' latest answers served, counted, one
record (see *Served template* in the [Glossary](#glossary)).

| Key | Type | Meaning |
|---|---|---|
| `supporters` | count | Supporting DNS providers: the rows of `supporters`. |
| `with_version_count` | count | Supporters whose answer named a version. |
| `current_version_count` | count | Supporters whose answer named the repository's version (`metadata` `version`). |
| `full_template_count` | count | Supporters answering with the full template. |
| `morphed_count` | count | Of those, ones differing from the repository's. |
| `outdated_count` | count | Of those, ones with a version below the repository's. |

#### Table `{service_provider_id}/{service_id}/history`

"Support history": one row per sweep that re-probed the template on every DNS provider,
or on every supporting one (a weekly sweep), oldest first. A sweep limited to recently
changed templates is a row only for the templates it covered.

| Key | Type | Meaning |
|---|---|---|
| `sweep_id` | integer | The sweep. |
| `started_at` | timestamp | When it started. |
| `completed_at` | timestamp | When it completed. `null` while it runs, or if not recorded (see [sweep completion](#sweep-completion)). |
| `supporting_providers` | count | DNS providers supporting it once the sweep had run. |
| `change` | integer | Difference to the previous row (the first row's difference to 0). |

## Row order and completeness

- Every list holds **all** rows, with no limit. Its default order (given per table above)
  is by domains or reach in the domain-share import, the most important first. Sort and
  filter on the client as you like; the export's order is a sensible default.
- Every list row has exactly one card, and every card belongs to exactly one list row:
  `files.<kind>.files` equals the list table's row count.
- Every id that appears anywhere in the export (in a list, a card, a footer) resolves to
  an existing card file. The exceptions: a `provider_id` that is `null` (no stack, so no
  stack card), and the `TOTAL` footer row.

## Cross-links

Which key links to which card:

| In file / table | Key(s) | Links to |
|---|---|---|
| `dns-providers.json` `dns_providers` | `dns_provider_id` | `dns-providers/{dns_provider_id}.json` |
| `dns-providers.json` `dns_providers` | `provider_id` (when not `null`) | `stacks/{provider_id}.json` |
| `dns-providers/{id}.json` `provider` | `provider_id` (when not `null`) | `stacks/{provider_id}.json` |
| `dns-providers/{id}.json` `supported_templates` | `service_provider_id` | `service-providers/{service_provider_id}.json` |
| `dns-providers/{id}.json` `supported_templates` | `service_provider_id` + `service_id` | `templates/{service_provider_id}/{service_id}.json` |
| `stacks.json` `stacks` | `provider_id` | `stacks/{provider_id}.json` |
| `stacks/{id}.json` `deployments` | `dns_provider_id` | `dns-providers/{dns_provider_id}.json` |
| `stacks/{id}.json` `template_coverage` | `service_provider_id` (+ `service_id`) | the service provider card (template card) |
| `service-providers.json` `service_providers` | `service_provider_id` | `service-providers/{service_provider_id}.json` |
| `service-providers/{id}.json` `templates`, `support_history` | the card's `service_provider_id` + `service_id` | `templates/{service_provider_id}/{service_id}.json` |
| `templates.json` `service_templates` | `provider_id` (the service provider) | `service-providers/{provider_id}.json` |
| `templates.json` `service_templates` | `provider_id` + `service_id` | `templates/{provider_id}/{service_id}.json` |
| template card `metadata` | `service_provider_id` | `service-providers/{service_provider_id}.json` |
| template card `supporters` | `dns_provider_id` | `dns-providers/{dns_provider_id}.json` |
| template card `supporters` | `provider_id` (when not `null`) | `stacks/{provider_id}.json` |

Reverse links that are a filter of a list rather than a key: a stack's deployments are the
`dns-providers.json` rows with its `provider_id` (also in its card's `deployments`), and a
service provider's templates are the `templates.json` rows whose `provider_id` is its id
(also in its card's `templates`).

### Pages

The intended frontend has one HTML page per view. Query parameters carry the **raw** ids
(not the encoded file segment) and filters, so every view is a plain, shareable link:

| Page | Data file |
|---|---|
| `index.html` (overview, the landing page) | `overview.json` |
| `dns-providers.html` (optional `?stack=<provider_id>`, `&q=<search>`) | `dns-providers.json` |
| `stacks.html` | `stacks.json` |
| `service-providers.html` | `service-providers.json` |
| `templates.html` (optional `?spid=<service_provider_id>`) | `templates.json` |
| `dns-provider.html?id=<dns_provider_id>` | `dns-providers/{dns_provider_id}.json` |
| `stack.html?id=<provider_id>` | `stacks/{provider_id}.json` |
| `service-provider.html?id=<service_provider_id>` | `service-providers/{service_provider_id}.json` |
| `template.html?spid=<service_provider_id>&sid=<service_id>` | `templates/{service_provider_id}/{service_id}.json` |

A card page with a missing parameter, or whose file is not found (404), shows a "not
found" state that links back to its list page. Every page shows the manifest's
`generated_at` and domain-share import in its header.

## Time series

| Series | File / table | Time axis | One point |
|---|---|---|---|
| Adoption | `overview.json` `adoption` | import | DC domains among the scanned domains of one import |
| Ecosystem support | `overview.json` `ecosystem` | full or weekly sweep | Support counts once that sweep had run |
| DNS provider support | DNS provider card `support_history` | sweep re-probing all its templates | Templates it supported |
| DNS provider share | DNS provider card `share_history` | import | Its domains and share |
| Stack share | stack card `share_history` | import | The stack's summed domains, share and rank |
| Template support | template card `history` | sweep covering the template | DNS providers supporting it |
| Service provider support | service provider card `support_history` | sweep covering each template | DNS providers supporting each template (one line per `service_id`) |

- **Two clocks.** Import-based series are per import, sweep-based ones per sweep. To plot
  both on one date axis, place a sweep at its `started_at`, and an import at its
  `started_at` from `overview.json` `adoption` (look it up by `import_id`; if it is
  missing or `null`, use `completed_at`, and as a last resort `import_id` read as Unix
  seconds).
- **Gaps are not zeros.** A missing row means "not measured then", never 0: no row
  exists before the first event of a series, for sweeps that didn't cover the entity, or
  for an import without data. A `null` value inside a row is likewise unknown. Don't
  interpolate zeros; draw a gap or connect the measured points.
- Each history row is the state **once that sweep had run**, replayed from the recorded
  changes of support, so values only change at sweeps.
- <a id="irregular-sweeps"></a>**Sweep series are irregular.** Older points are
  monthly, newer ones weekly, plus, for template and service provider cards, the daily runs
  of recently changed templates. Plot by `started_at` on a date axis, never by row index.
  "Change since the previous sweep" (`supported_templates_change`) is a change over that
  interval, so weekly changes are smaller than monthly ones. Nothing marks a point as weekly
  or monthly.
- <a id="sweep-completion"></a>**Sweep completion.** Every sweep row has `started_at` and
  `completed_at`: when the last of the sweep's probes was done (answered, or given up on
  after its retries). A sweep's probes can also be handed to a later sweep that starts
  before they are done (the daily run for recently changed templates takes over those
  templates' probes); the sweep then completes when nothing of its own is left. `null`
  means still running - the row is the state so far and may still change - or a sweep
  from before completion times were recorded. `manifest.json` names the sweep that completed
  last (`latest_sweep`, any kind) and the full sweep that completed last
  (`latest_full_sweep`).
- **Leaderboards without the cards.** `dns-providers.json` and `stacks.json` carry each
  entity's change in supported templates over its latest sweep and over about 90 days
  (`supported_templates_change`, `supported_templates_change_90d`), so a "most improved"
  ranking needs no card. A DNS provider's values are differences of its card's
  `support_history` rows.
- Import series include pruned imports from their kept totals (`source: snapshot`), so they
  reach back further than the detailed data.
- <a id="supported-since"></a>**Supported since.** `since` (DNS provider card
  `supported_templates`, template card `supporters`) is when a probe first saw the DNS
  provider support the template, and is given only for a template it supports now. Gaps
  don't move it: a template that stopped being supported and was supported again keeps its
  first date. A version change doesn't move it either. Like every history time, it is
  when a probe observed the change, up to one probing interval after the real change.

## Redaction

The data is public. The export deliberately leaves out pipeline internals, so don't look
for them:

- the raw settings response a DNS provider returned (its useful fields are the `provider`
  table's columns);
- how far probing has got: the counts of probes still pending, being retried or failed
  (they are all "not yet determined", `undetermined_count`);
- internal keys and scheduling data: row identity keys, rate-limiting keys and the
  timestamps of the last check attempts.

Error messages (`settings_last_error`, `support_last_error`) and the last successful
contact (`*_last_seen_ok_at`) **are** included.

## Versioning and compatibility

- `format_version` (now `5`) changes only on a **breaking** change: a removed or renamed
  file kind, table id or column key; a changed type or meaning of a value; a changed path
  template or id encoding.
- **Additive** changes keep the version: new file kinds, tables, columns, manifest keys or
  notes, and new values of a status enumeration. A frontend must ignore what it doesn't
  know (see [File shape](#file-shape)).
- Titles, headers and note texts are display text, not part of the contract; they may
  change at any time.
- **Breaking changes per `format_version`:**
  - `5`: support is per template, no longer per stored version: every support count and
    `total` counts templates (a template's: DNS providers); `versions` columns replaced by
    what each DNS provider serves (`served_version`, `repository_version` on the DNS
    provider card, `response_kind`, `template_match`); `supported_templates`,
    `unsupported_templates` and `undetermined_templates` removed from DNS provider rows and
    cards (`supported_count` and the other counts mean the same now), `supporting_providers`
    from `templates.json`, `min/median/max_supported_templates_pct` from stacks; columns
    `with_version_count`, `full_template_count`, `morphed_count`, `outdated_count` and the
    template card's `served` table added.
  - `4`: `settings_status` / `support_status` (with their error and last-OK columns) are
    results of completed runs ([Provider statuses](#provider-statuses)): values `failed`
    (settings) and `partial` (support) added, `http_error`/`connection_error` no longer
    settings statuses; columns `support_answered`, `support_failed`, `settings_error_kind`
    added; card columns `settings_last_status` / `support_last_status` renamed to
    `settings_status` / `support_status`.
  - `3`: support `total` (and every `*_pct` next to it) means template versions that can be
    asked about; `undetermined_count`/`undetermined_pct` added; a stack's
    `min/median/max_supported_pct` leave out deployments without an answer.
  - `2`: the DNS provider card's `supported_templates` `since` means first support of any
    version ([Supported since](#supported-since)); the template card's `supporters` `since`
    added.
  - `1`: first format.
- Card URLs are stable as long as the ids are. A `dns_provider_id` is never reused; its
  card disappears only when two DNS providers are merged into one, keeping one id. Service provider and template ids come from the Templates repository and change
  only when a template is renamed or removed there. Stack ids are the providers' own
  `providerId`s.

## Caveats

Limits of the data a page should footnote or surface:

- **Attributed domains only.** `domains`, `dc_domains` and reach count only domains whose
  Domain Connect URL is attributed to a known DNS provider. Domains whose provider could
  never be identified are in `dc_domains_total` only.
- **Sampled scans.** An import may scan only a random sample of a zone. Percentages are of
  the scanned domains, an estimate for the zone, not a census. Each import's sampling rate
  is in `sample_percent` (`overview.json` `adoption`, and `manifest.share_import` for the
  domain-share import); [METHODOLOGY.md](METHODOLOGY.md#22-census-and-probability-sample)
  gives the estimators and their standard errors.
- **One zone set.** The numbers describe the zones that were scanned (`zones`, e.g.
  `.com`, `.net`, `.org`), not the whole Internet.
- **Older imports have less history.** Share histories start with the first import whose
  per-provider share was recorded; very old imports may lack `completed_at`,
  `dc_domains_total` or even `started_at`.
- **History vs. current state.** The history tables replay the recorded *changes* of
  support. Both rest on the same conclusive probes: a DNS provider whose latest probe failed
  keeps the answers it last had, in the history and in the current-state tables alike.
- **Current stacks.** Stack attribution (`stacks`, `supporting_stacks`, stack share
  histories) uses each DNS provider's **current** stack, also for past imports and sweeps.
- **Old sweep classification.** Old sweeps limited to recently changed templates, whose
  limit was not recorded, count as full sweeps.
- **Statuses lag.** `settings_status`/`support_status` describe the latest *completed*
  run, which may be weeks old: a monthly settings run, a weekly or monthly support sweep
  (see [Provider statuses](#provider-statuses)).

## Examples

Excerpts from [`docs/examples/export/`](examples/export/), the export of a small simulated
database, regenerated with it by `scripts/generate_json_examples.py`. The manifest is
shown indented; data files are shown as written.

`manifest.json`:

<!-- example: manifest.json -->
```json
{
  "format_version": 5,
  "generated_at": "2026-10-01T00:00:00Z",
  "schema_version": 21,
  "share_import": {
    "import_id": 1780272000,
    "status": "completed",
    "source": "live",
    "started_at": "2026-06-01 00:00:00",
    "completed_at": "2026-06-01 07:00:00",
    "scanned_domains": 12000,
    "zones": [
      "com",
      "org"
    ],
    "zone_domains": 240000,
    "sample_percent": 5.0
  },
  "latest_sweep": {
    "sweep_id": 5,
    "started_at": "2026-07-01 02:00:00",
    "completed_at": "2026-07-01 04:20:16"
  },
  "latest_full_sweep": {
    "sweep_id": 4,
    "started_at": "2026-06-02 02:00:00",
    "completed_at": "2026-06-05 09:48:27"
  },
  "id_encoding": "Each {placeholder} is the id encoded as one path segment: a-z, 0-9, '.', '_' and '-' are kept (a leading '.' is not); every other byte of the id's UTF-8 encoding, uppercase letters included, becomes '~' followed by two lowercase hex digits. Example: 'Example.com/A b' -> '~45xample.com~2f~41~20b'.",
  "files": {
    "overview": {
      "path": "overview.json",
      "report": "support-overview",
      "rows": {
        "adoption": 3,
        "ecosystem": 4
      }
    },
    "dns_providers": {
      "path": "dns-providers.json",
      "report": "dns-providers",
      "rows": {
        "dns_providers": 6
      }
    },
    "dns_provider": {
      "path": "dns-providers/{dns_provider_id}.json",
      "report": "dns-provider-summary",
      "list": "dns_providers",
      "table": "dns_providers",
      "keys": {
        "dns_provider_id": "dns_provider_id"
      },
      "files": 6
    },
    "stacks": {
      "path": "stacks.json",
      "report": "stacks",
      "rows": {
        "stacks": 4
      }
    },
    "stack": {
      "path": "stacks/{provider_id}.json",
      "report": "stack-summary",
      "list": "stacks",
      "table": "stacks",
      "keys": {
        "provider_id": "provider_id"
      },
      "files": 4
    },
    "service_providers": {
      "path": "service-providers.json",
      "report": "service-providers",
      "rows": {
        "service_providers": 3
      }
    },
    "service_provider": {
      "path": "service-providers/{service_provider_id}.json",
      "report": "service-provider-summary",
      "list": "service_providers",
      "table": "service_providers",
      "keys": {
        "service_provider_id": "service_provider_id"
      },
      "files": 3
    },
    "templates": {
      "path": "templates.json",
      "report": "service-templates",
      "rows": {
        "service_templates": 5
      }
    },
    "template": {
      "path": "templates/{service_provider_id}/{service_id}.json",
      "report": "template-summary",
      "list": "templates",
      "table": "service_templates",
      "keys": {
        "service_provider_id": "provider_id",
        "service_id": "service_id"
      },
      "files": 5
    }
  }
}
```
<!-- /example -->

One list, `stacks.json`:

<!-- example: stacks.json -->
```json
{"generated_at": "2026-10-01T00:00:00Z", "notes": ["Domain share: import completed 2026-06-01 07:00 UTC (live), 12,000 domains scanned. Support columns are current state."], "tables": {
"stacks": {"title": "DNS provider stacks", "columns": [{"key": "name", "header": "STACK"}, {"key": "provider_id", "header": "PROVIDER ID"}, {"key": "deployments", "header": "DEPLOYMENTS"}, {"key": "min_supported_pct", "header": "MIN SUPPORT"}, {"key": "median_supported_pct", "header": "MEDIAN SUPPORT"}, {"key": "max_supported_pct", "header": "MAX SUPPORT"}, {"key": "supported_templates", "header": "TEMPLATES"}, {"key": "supported_templates_change", "header": "CHANGE"}, {"key": "supported_templates_change_90d", "header": "CHANGE 90D"}, {"key": "with_version_count", "header": "WITH VERSION"}, {"key": "full_template_count", "header": "FULL TEMPLATE"}, {"key": "morphed_count", "header": "MORPHED"}, {"key": "outdated_count", "header": "OUTDATED"}, {"key": "domains", "header": "DOMAINS"}, {"key": "domains_pct", "header": "% SCANNED"}], "rows": [
{"name": "Cloudflare", "provider_id": "cloudflare.com", "deployments": 1, "min_supported_pct": 60.0, "median_supported_pct": 60.0, "max_supported_pct": 60.0, "supported_templates": 3, "supported_templates_change": 0, "supported_templates_change_90d": 1, "with_version_count": 2, "full_template_count": 1, "morphed_count": 0, "outdated_count": 0, "domains": 4000, "domains_pct": 33.33333333333333},
{"name": "IONOS", "provider_id": "ionos.com", "deployments": 1, "min_supported_pct": 40.0, "median_supported_pct": 40.0, "max_supported_pct": 40.0, "supported_templates": 2, "supported_templates_change": 1, "supported_templates_change_90d": 1, "with_version_count": 2, "full_template_count": 1, "morphed_count": 0, "outdated_count": 0, "domains": 2000, "domains_pct": 16.666666666666664},
{"name": "Plesk", "provider_id": "plesk.com", "deployments": 2, "min_supported_pct": 20.0, "median_supported_pct": 30.0, "max_supported_pct": 40.0, "supported_templates": 2, "supported_templates_change": 0, "supported_templates_change_90d": 0, "with_version_count": 2, "full_template_count": 2, "morphed_count": 1, "outdated_count": 1, "domains": 1150, "domains_pct": 9.583333333333334},
{"name": "Quiet Host", "provider_id": "quiet-host.example", "deployments": 1, "min_supported_pct": 0.0, "median_supported_pct": 0.0, "max_supported_pct": 0.0, "supported_templates": 0, "supported_templates_change": null, "supported_templates_change_90d": null, "with_version_count": 0, "full_template_count": 0, "morphed_count": 0, "outdated_count": 0, "domains": 0, "domains_pct": 0.0}
], "footer": null}
}}
```
<!-- /example -->

One card, `stacks/plesk.com.json`:

<!-- example: stacks/plesk.com.json -->
```json
{"generated_at": "2026-10-01T00:00:00Z", "notes": ["Domain share: import completed 2026-06-01 07:00 UTC (live), 12,000 domains scanned. Support columns are current state."], "tables": {
"stack": {"title": "DNS provider stack", "columns": [{"key": "name", "header": "Stack"}, {"key": "provider_id", "header": "Provider ID"}, {"key": "deployments", "header": "Deployments"}, {"key": "min_supported_pct", "header": "Min support"}, {"key": "median_supported_pct", "header": "Median support"}, {"key": "max_supported_pct", "header": "Max support"}, {"key": "supported_templates", "header": "Supported templates"}, {"key": "supported_templates_change", "header": "Change since previous sweep"}, {"key": "supported_templates_change_90d", "header": "Change over 90 days"}, {"key": "with_version_count", "header": "Served with version"}, {"key": "full_template_count", "header": "Served as full template"}, {"key": "morphed_count", "header": "Morphed"}, {"key": "outdated_count", "header": "Outdated"}, {"key": "domains", "header": "Domains"}, {"key": "domains_pct", "header": "% scanned"}], "rows": [
{"name": "Plesk", "provider_id": "plesk.com", "deployments": 2, "min_supported_pct": 20.0, "median_supported_pct": 30.0, "max_supported_pct": 40.0, "supported_templates": 2, "supported_templates_change": 0, "supported_templates_change_90d": 0, "with_version_count": 2, "full_template_count": 2, "morphed_count": 1, "outdated_count": 1, "domains": 1150, "domains_pct": 9.583333333333334}
], "footer": null},
"deployments": {"title": "Deployments", "columns": [{"key": "name", "header": "NAME"}, {"key": "dns_provider_id", "header": "ID"}, {"key": "api_host", "header": "API HOST"}, {"key": "settings_status", "header": "SETTINGS"}, {"key": "support_status", "header": "SUPPORT"}, {"key": "support_answered", "header": "ANSWERED"}, {"key": "support_failed", "header": "ERRORS"}, {"key": "total", "header": "TOTAL"}, {"key": "supported_count", "header": "SUPPORTED"}, {"key": "supported_pct", "header": "SUPPORTED %"}, {"key": "unsupported_count", "header": "NOT SUPP."}, {"key": "unsupported_pct", "header": "NOT SUPP. %"}, {"key": "undetermined_count", "header": "UNDETERMINED"}, {"key": "undetermined_pct", "header": "UNDETERMINED %"}, {"key": "supported_templates_change", "header": "CHANGE"}, {"key": "supported_templates_change_90d", "header": "CHANGE 90D"}, {"key": "with_version_count", "header": "WITH VERSION"}, {"key": "full_template_count", "header": "FULL TEMPLATE"}, {"key": "morphed_count", "header": "MORPHED"}, {"key": "outdated_count", "header": "OUTDATED"}, {"key": "domains", "header": "DOMAINS"}, {"key": "domains_pct", "header": "% SCANNED"}], "rows": [
{"name": "Plesk", "dns_provider_id": 2, "api_host": "domainconnect.plesk.com", "settings_status": "ok", "support_status": "ok", "support_answered": 2, "support_failed": 0, "total": 5, "supported_count": 2, "supported_pct": 40.0, "unsupported_count": 2, "unsupported_pct": 40.0, "undetermined_count": 1, "undetermined_pct": 20.0, "supported_templates_change": 0, "supported_templates_change_90d": 0, "with_version_count": 2, "full_template_count": 2, "morphed_count": 1, "outdated_count": 1, "domains": 900, "domains_pct": 7.5},
{"name": "Plesk", "dns_provider_id": 3, "api_host": "domainconnect.plesk.com", "settings_status": "failed", "support_status": "dead", "support_answered": 0, "support_failed": 6, "total": 5, "supported_count": 1, "supported_pct": 20.0, "unsupported_count": 0, "unsupported_pct": 0.0, "undetermined_count": 4, "undetermined_pct": 80.0, "supported_templates_change": 0, "supported_templates_change_90d": 0, "with_version_count": 0, "full_template_count": 0, "morphed_count": 0, "outdated_count": 0, "domains": 250, "domains_pct": 2.083333333333333}
], "footer": null},
"template_coverage": {"title": "Supporting deployments per template (current state)", "columns": [{"key": "service_provider_name", "header": "SERVICE PROVIDER"}, {"key": "service_provider_id", "header": "PROVIDER ID"}, {"key": "service_name", "header": "TEMPLATE"}, {"key": "service_id", "header": "SERVICE ID"}, {"key": "supporting_deployments", "header": "SUPPORTING"}, {"key": "supporting_pct", "header": "% OF DEPLOYMENTS"}, {"key": "reach_domains", "header": "REACH"}, {"key": "reach_pct", "header": "REACH %"}], "rows": [
{"service_provider_name": "Example Service", "service_provider_id": "exampleservice.domainconnect.org", "service_name": "Example Website", "service_id": "template1", "supporting_deployments": 2, "supporting_pct": 100.0, "reach_domains": 1150, "reach_pct": 9.583333333333334},
{"service_provider_name": "Acme Mail Inc.", "service_provider_id": "mail.acme.example", "service_name": "Acme Mail", "service_id": "mail", "supporting_deployments": 1, "supporting_pct": 50.0, "reach_domains": 900, "reach_pct": 7.5}
], "footer": null},
"share_history": {"title": "Domain share per import", "columns": [{"key": "import_id", "header": "IMPORT"}, {"key": "completed_at", "header": "COMPLETED"}, {"key": "status", "header": "STATUS"}, {"key": "source", "header": "SOURCE"}, {"key": "domains", "header": "DOMAINS"}, {"key": "scanned_domains", "header": "SCANNED"}, {"key": "share_pct", "header": "SHARE"}, {"key": "change_pct", "header": "CHANGE (PP)"}, {"key": "rank", "header": "RANK"}, {"key": "stacks", "header": "STACKS"}], "rows": [
{"import_id": 1767225600, "completed_at": null, "status": "pruned", "source": "snapshot", "domains": 1000, "scanned_domains": 9000, "share_pct": 11.11111111111111, "change_pct": null, "rank": 2, "stacks": 2},
{"import_id": 1772323200, "completed_at": "2026-03-01 06:00:00", "status": "completed", "source": "live", "domains": 1000, "scanned_domains": 10000, "share_pct": 10.0, "change_pct": -1.1111111111111107, "rank": 3, "stacks": 3},
{"import_id": 1780272000, "completed_at": "2026-06-01 07:00:00", "status": "completed", "source": "live", "domains": 1150, "scanned_domains": 12000, "share_pct": 9.583333333333334, "change_pct": -0.4166666666666661, "rank": 3, "stacks": 3}
], "footer": null}
}}
```
<!-- /example -->
