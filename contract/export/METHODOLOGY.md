# Measuring Domain Connect support: methodology

How the published Domain Connect support statistics are obtained: which domains are
examined, how the DNS providers behind them are identified, how support for each template is
established, and which limits apply. For readers of the statistics; no knowledge of the
measuring software or the data format is assumed. Terms are defined in Section 1.1.

## 1. Overview

The measurement consists of two independent processes with different cadences.

1. **Domain scan.** The domains of one or more top-level domain (TLD) zones are examined
   for a Domain Connect record. The result is, per scan, the number of domains examined and
   the number of those domains that refer to each Domain Connect endpoint. The domain scan
   determines how many domains a DNS provider serves.
2. **Support probing.** Every DNS provider identified from those endpoints is asked, for
   every published Domain Connect template, whether it supports the template. Support
   probing determines what a DNS provider supports.

The published statistics combine both: the domain counts of one selected scan (the
*reference scan*) with the support state at the time of publication.

### 1.1 Terms

| Term | Meaning |
|---|---|
| Domain Connect | An open protocol that lets a service (for example, a website builder or an e-mail host) configure the DNS records of a customer's domain at the customer's DNS provider by applying a *template*. A domain advertises support through a TXT record that holds the address of its DNS provider's Domain Connect endpoint (Section 3). |
| Service provider | A publisher of templates in the public Domain Connect Templates repository (Section 5.1), identified by a domain-like identifier. |
| Template | One service of a service provider: a set of DNS records that a DNS provider applies on request. Identified by the service provider's identifier together with a service identifier. |
| Template version | A numbered revision of a template. Support is determined per template, not per version (Section 5.2). |
| DNS provider | One deployment of Domain Connect: an endpoint that answered the protocol's settings request (Section 4.2). Two companies running the same software are two DNS providers. |
| Stack | All DNS providers that declare the same provider identifier, that is, deployments of the same software or company (Section 4.2). |
| Scan | One examination of the domains of one or more zone files (Section 2), dated by its start. |
| Scanned domains | The domains a scan actually examined; the denominator of every published percentage of domains. |
| Domain Connect domain | A scanned domain that publishes a valid Domain Connect record (Section 3). |
| Attributed domain | A Domain Connect domain whose record leads to an identified DNS provider (Section 4.3). |
| Reference scan | The scan whose domain counts the published statistics use: by default the most recent completed scan. |
| Reach | For a template: the attributed domains of the reference scan whose DNS providers support the template, each DNS provider counted once. It is the number of scanned domains that could apply the template at the time of publication. |
| Support probe | One query asking a DNS provider whether it supports a template (Section 5.2). |
| Sweep, run | A batch of support probes over a defined set of DNS providers and templates; a *full sweep* covers all of them (Section 5.3). |
| Current state | The outcome of the most recent conclusive probe of each combination of DNS provider and template (Section 5.2). |
| History | The recorded changes of support over time, from which past numbers of supported templates and supporting DNS providers are reconstructed (Section 5.2). |

## 2. Population and sampling

### 2.1 Zone files

The population consists of the domains delegated in the zone files of generic top-level
domains, obtained from ICANN's Centralized Zone Data Service (CZDS). A domain is counted
when the zone file contains a name-server (NS) delegation for it; every delegated name is
counted once, irrespective of the number of its name-server records. Names below the
delegated domains (subdomains) are not part of the population, because zone files do not
list them.

The scanned zones are `.com`, `.net` and `.org`. Each scan is published with its zones, the
number of domains the zone files contained and the sampling percentage (Section 2.2), where
recorded; the oldest scans lack this information.

### 2.2 Census and probability sample

A scan is either a **census**, in which every domain of the selected zones is examined, or
a **probability sample**. In a sample, each domain is included independently with the same
fixed probability π (Bernoulli sampling); the published *sampling percentage* is 100·π, and
100 denotes a census. The number of sampled domains is therefore itself random, with
expectation π·N for a zone of N domains. Inclusion does not depend on the domain's name,
age, registrar or DNS provider.

For a characteristic present in a fraction p of a zone's domains (for example, a Domain
Connect record pointing to one particular DNS provider), the fraction p̂ = x / n observed
among the n scanned domains is an unbiased estimator of p (given n, the sample is a simple
random sample of the zone). Its standard error is approximately

    SE(p̂) ≈ √( (1 − π) · p̂ (1 − p̂) / n ),

where the factor (1 − π) is the finite-population correction; it is negligible for small
sampling percentages and makes the error vanish for a census.

A DNS provider with K domains in the zone is absent from the sample with probability
(1 − π)^K. The sampling percentage required to detect such a provider, that is, to include
at least one of its domains, with probability P is therefore

    π ≥ 1 − (1 − P)^(1/K).

As an illustration, detecting a DNS provider with K = 50 domains in the zone with
probability P = 99.5 % requires π ≥ 1 − 0.005^(1/50) ≈ 0.1005, a sampling percentage of
about 10.1 %. Applied to a zone of 23.7 million domains, such a sample contains about
2.39 million domains. The same sample estimates the share of a DNS provider serving 5 % of
the zone with a standard error of about 0.013 percentage points (95 % confidence interval
approximately ±0.026 percentage points). For the provider with 50 domains, however, the
sample contains on average only about 5 of its domains, and the estimate of its domain
count has a relative standard error of about 42 %, given by √((1 − π) / (π·K)). Small
DNS providers are thus detected reliably at this sampling percentage, but their domain
counts are imprecise. Detection in the sample does not by itself imply that the provider
is examined further; Section 4.4 states the threshold that applies.

Every percentage of domains in the published statistics is a percentage of the **scanned**
domains of the respective scan, that is, of the domains actually examined. For a sample,
it is an estimate of the corresponding percentage of the zone; for a census, it is the zone
value itself. Published domain *counts* of a sampled scan are counts within the sample; an
estimate of the corresponding count in the zone is obtained by dividing by π.

### 2.3 Order of examination

The domains of a scan are examined in a randomised order. A scan that is still in
progress therefore approximates a random sample of its zones. Such a scan is nonetheless
reported as incomplete and is only published when explicitly requested; by default, the
statistics are based on the most recent completed scan.

### 2.4 Frequency

The zone files are downloaded and scanned once per month. A scan of all three zones takes
several days.

## 3. Discovery of Domain Connect records

A domain advertises Domain Connect by publishing a TXT record at the name
`_domainconnect.<domain>`, whose value is the host name and path of its DNS provider's
Domain Connect endpoint. For each scanned domain, this TXT record is queried through public
recursive resolvers using DNS over HTTPS. Queries are distributed over several independent
public resolvers; a query that times out or fails transiently is repeated up to four times.

Each scanned domain is assigned exactly one outcome:

- **Domain Connect URL**: the record exists and its value, prefixed with `https://`, is a
  valid HTTPS URL without query or fragment. The domain counts as a Domain Connect domain
  and is associated with that URL.
- **No record**: the name does not exist or carries no TXT record.
- **Invalid record**: a TXT record exists but does not form a valid URL.
- **Resolution failure**: the resolvers reported a server failure or the query could not
  be completed after the repetitions.

All four outcomes count as scanned. Domains whose resolution failed are thus part of the
denominator although their Domain Connect status is unknown. Most such failures are server
failures, which typically indicate a broken delegation of the domain itself; in recent scans
they concerned of the order of 6 % of the scanned domains. The published percentages are
therefore shares of all delegated domains; shares of the resolvable domains alone would be
higher by approximately the same relative amount.

## 4. Identification of DNS providers

### 4.1 Settings request

A Domain Connect URL is the address of an endpoint, not the identity of a DNS provider.
To identify the provider, the endpoint's *settings* resource is requested, as defined by
the Domain Connect specification, on behalf of one of the domains that referred to the URL
in a scan. A successful answer names the DNS provider (`providerName`), optionally the
provider software or company (`providerId`), and the base address of its template API
(`urlAPI`). An answer that lacks a valid `urlAPI` is treated as unsuccessful, because
support cannot be probed without it. If the request fails for one domain, it is repeated on
behalf of other domains that referred to the same URL before the attempt counts as failed.

### 4.2 Deployments, providers and stacks

A *DNS provider* is one deployment of Domain Connect: the endpoint identified by its
`urlAPI`, or, when the provider declares none, by the Domain Connect URL itself. Several
Domain Connect URLs often lead to the same deployment (for example, redirects or several
nodes behind one API); they are then counted as one DNS provider. Conversely, two
companies running the same software are two DNS providers. A DNS provider is recorded only
after at least one successful settings answer.

DNS providers that declare the same `providerId` form a *stack*, for example all
deployments of one hosting control panel. A DNS provider that declares no `providerId`
belongs to no stack. Stack membership is taken from each DNS provider's most recent
answer.

### 4.3 Attribution of domains

Each Domain Connect URL is attributed to exactly one DNS provider: the one that most
recently answered the settings request for it. A domain is attributed to the DNS provider
of its URL. Because every URL has a single owner, no domain is counted for two DNS
providers, and the domain counts of all DNS providers may be added. A domain whose URL
could not be attributed (Section 4.4) counts as a Domain Connect domain but not towards any
DNS provider.

### 4.4 Minimum size

Settings requests and support probes are restricted to Domain Connect URLs that were
referred to by at least a minimum number of scanned domains, summed over the scans still
retained. The minimum is 50 domains. The restriction concentrates
the measurement on endpoints that serve a meaningful number of domains; most of the excluded
URLs are individual installations of hosting software that serve a single domain. As a
consequence, support by DNS providers below the threshold is not observed.

The threshold applies to scanned domains, not to domains in the zone. In a sampled scan
with sampling percentage 100·π, it therefore corresponds to approximately 50 / π domains
in the zone for an endpoint seen in that scan alone; at the 10.1 % of the example in
Section 2.2, to about 500 domains. An endpoint that is detected in the sample but referred
to by fewer scanned domains than the threshold is counted as a Domain Connect domain, but
its DNS provider is not identified.

### 4.5 Frequency

The settings of all DNS providers above the threshold are requested again once per month,
as soon as the monthly domain scan has examined every domain of its sample, so that DNS
providers first seen in that scan are identified and changes of name, software or API
address are detected. A scan that never examines its whole sample, for example because
reading a zone file failed, starts no such request; nor does a scan extended later with
further domains, since its month's request was already made.

## 5. Determination of template support

### 5.1 Templates

The set of templates is the public [Domain Connect Templates
repository](https://github.com/Domain-Connect/Templates), synchronised daily. Each template
is recorded with its current version, the date on which it was first published in the
repository, and a fingerprint of its whole file: the SHA-256 hash of its JSON in canonical
form (object keys sorted, no whitespace, characters as UTF-8), so that two templates that
differ only in key order or formatting have the same fingerprint.

### 5.2 Support probe

For each combination of a DNS provider and a template, the DNS provider's template API is
queried once for the template, identified by its service provider and service identifiers,
as defined by the Domain Connect specification. The query names the template, not a
version of it. The answer is classified as
follows:

- **Supported**: HTTP status 200.
- **Not supported**: HTTP status 404.
- **Not yet determined**: any other answer, a failed connection, or no probe yet.

The identifiers are sent exactly as they appear in the repository, including upper-case
letters, since the specification defines them as case-sensitive.

The specification lets a DNS provider answer *supported* with an empty body, with the
version of the template it has deployed (`{"version": N}`), or with the full deployed
template. The body of each *supported* answer is read up to 256 KiB and classified, then
discarded:

- **Response kind**: *full template* when the body is a JSON object with a list of
  `records`; *version only* when it is a JSON object with a non-negative integer `version`
  and no such list; *empty* otherwise (no body, not JSON, not an object, larger than the
  limit, or a `version` that is not a non-negative integer).
- **Served version**: the integer `version` of the body, if any.
- **Template match**, for a full template only: *outdated* when its version is lower than
  the repository's current version; otherwise *match* when its fingerprint (computed as in
  Section 5.1) equals the repository template's, and *morphed* when it differs in any
  part, records and metadata alike. It is not stated while the repository template's
  fingerprint is not yet recorded.

Answers recorded per template version before support was determined per template are
merged: supported when any version was, not supported when every version was, otherwise
not yet determined.

Served version, response kind and template match always describe the most recent
*supported* answer; an answer without a version clears the served version. A change of any
of them is recorded with the time at which it was observed.

The *current state* of a combination is the classification of its most recent conclusive
probe, that is, the most recent probe that yielded *supported* or *not supported*. Only the
opposite conclusive answer changes it: neither a failed probe nor a run that has the
combination outstanding again (Section 5.3) does, so the published figures do not move
while a run re-examines the combinations or while a DNS provider's endpoint fails. A
combination is *not yet determined* only until its first conclusive probe. Every change
between *supported* and *not supported* is recorded with the time at which it was observed. These records form the published history. A change is observed at
the time of the first probe after it occurred, so the temporal resolution of the history
equals the probing interval of the respective combination (Section 5.3).

Counts per template are given as supported, not supported and not yet determined, with
their percentages of a total. A DNS provider's total is every template when it declares a
template API (or already has a conclusive answer), and zero otherwise; a template's total is
the number of such DNS providers. Not yet determined is the remainder of the total. The
total does not depend on how far probing has progressed: a newly identified DNS provider
starts with every template not yet determined, and the state of probes still outstanding,
being repeated or given up on is not part of the published figures. For a stack, the share
of templates each of its DNS providers supports is given as its lowest, median and highest
value across the DNS providers that have answered at least one probe with *supported* or
*not supported*.

For each DNS provider, its supported templates are also counted by what they serve: with a
version, as a full template, morphed and outdated. For a stack, these counts are summed
over its DNS providers. For a template, its supporting DNS providers are counted the same
way, together with those serving the repository's current version.

The date from which a DNS provider supports a template ("supported since") is the first
recorded change to *supported* of the template. It is stated only while the template is
currently supported. A new version of the template does not move it, and neither does an
interruption: a template that was not supported for a time and then
supported again keeps its original date. It therefore states since when support has
existed at all, not how long it has lasted without interruption.

### 5.3 Probing runs

Probes are organised in runs, each covering a defined set of combinations:

| Run | Combinations | Frequency |
|---|---|---|
| Full sweep | Every DNS provider × every template | Monthly, after the settings of all DNS providers have been requested again (Section 4.5) |
| Weekly sweep | Every DNS provider supporting at least one template when the run starts × every template | Weekly (Sunday) |
| Recent templates | Every DNS provider × templates first published in the preceding 14 days | Daily, except on the day of the weekly sweep |
| Single DNS provider | One DNS provider × every template | On demand, for example after a provider reports a change |
| Single template or service provider | Every DNS provider × one template, or all templates of one service provider | On demand |

A full sweep re-examines every combination, including those already known to be
supported, so that withdrawn support is detected. The weekly sweep does the same, every
week, for the DNS providers that support at least one template: a DNS provider counts as
supporting when the current state (Section 5.2) of any template is *supported*, so a failed
probe does not remove it.
It detects their adoption of older templates, new versions and withdrawals at weekly
rather than monthly resolution. A DNS provider supporting nothing is re-examined by the
monthly full sweep only; one that has withdrawn all its support leaves the weekly sweep
from the next week on. The daily run of recent templates observes the adoption of a new
template during its first two weeks at daily resolution. It does not run on the day of the
weekly sweep, which probes the new templates on the supporting DNS providers itself, so a
DNS provider supporting nothing is probed for a new template on six days a week rather
than seven, and its first adoption may be observed up to a day later.

Published histories count only runs that covered the subject of the history completely:
a DNS provider's history counts full sweeps, runs for that DNS provider alone and the
weekly sweeps that covered it; a template's history counts every run that probed the
template on all DNS providers, including the daily run of recent templates while the
template is covered by it, and the weekly sweeps; and ecosystem-wide series count full and
weekly sweeps, a smaller run counting towards the preceding one of them. A point after a
weekly sweep restates the state of the DNS providers it did not cover, which no probe has
changed since the previous point; full and weekly points are not distinguished. Older
points of these series are monthly, newer ones weekly.

Each run is published with its start and completion time. A run is complete once none of
its probes is outstanding: each has been answered, or given up on after its retries
(Section 6). A run that starts while an earlier one is still in progress takes over the
earlier run's outstanding probes within its own scope - the daily run of recent templates
takes over those templates' probes from a full sweep in progress - and the earlier run
completes when none of its remaining probes is outstanding. A run still in progress has no
completion time, and neither do runs from before completion times were recorded. The
support figures after a run in progress are its state so far.

### 5.4 Number of supported templates and its change

The number of templates a DNS provider supports is its supported count (Section 5.2). For
a stack, it is the number of templates supported by at least one of its DNS providers. A
distribution rather than an average is given for a stack's share because support often
varies widely between DNS providers of the same stack.

The change of this number is derived from the recorded history (Section 5.2), not from
repeated current-state counts. The history is replayed up to the start of each run, and
the number of supported templates after a run is compared with the number after an
earlier run. Two intervals are published:

- **Latest run:** the difference between the most recent run and the preceding one. For a
  DNS provider, these are the runs that covered all of its templates (full sweeps, runs
  for that DNS provider alone and the weekly sweeps that covered it); for a stack, full
  and weekly sweeps, a DNS provider the weekly sweep did not cover keeping its state.
  For most points this is a change over one week; older points cover one month.
- **About 90 days:** the difference between the most recent run and the newest run that
  started at least 90 days before it.

No change is stated when the earlier run started before the DNS provider (for a stack: its
first DNS provider) was first identified, because no measured starting point exists; an
increase from such an unmeasured baseline would otherwise be indistinguishable from
adoption. Because the change is computed from the history, it is subject to the
difference between history and current state described in Section 8.

## 6. Status of DNS providers and handling of failures

### 6.1 Status values

Each DNS provider's settings and support statuses describe its latest **completed** run,
after every repetition of Section 6.2, never a single request. A request that fails while
its run is still repeating it changes nothing that is published; until a run completes,
the DNS provider keeps the statuses of the previous one.

The **settings status** is the outcome of the latest settings run that finished with one of
the DNS provider's Domain Connect addresses, with the error message when it failed and the
time of the last successful settings answer:

| Status | Meaning |
|---|---|
| `ok` | One of its addresses gave a usable settings answer in that run, possibly after repetitions. |
| `failed` | None did. The kind of failure is published with it: `http_error` (the endpoint answered, but every repetition gave an unusable answer: an HTTP status other than 200, a body that is not valid JSON, or a missing or invalid `urlAPI`) or `dead` (the endpoint was abandoned, Section 6.3). |

The **support status** summarises the latest completed support sweep that probed the DNS
provider. The number of its probes that ended with an answer (*supported* or *not
supported*) and the number that failed after their repetitions (an HTTP status other than
200 or 404, or no answer) are published with it, as is the error message of a failed probe
and the completion time of the latest sweep in which a probe was answered:

| Status | Meaning |
|---|---|
| `ok` | Every probe of the sweep was answered. |
| `partial` | Some probes were answered, some failed. |
| `error` | No probe was answered. |
| `dead` | The endpoint was abandoned during the sweep (Section 6.3). |

Any completed run counts, also one limited to the weekly re-check, to one DNS provider or
to new templates (Section 5.3); the published numbers of probes show how much it covered.

### 6.2 Repetition after failures

Two kinds of failure are distinguished, and they are repeated differently.

- **Unusable answers** (an HTTP status or body that cannot be interpreted) concern a
  single request. The request is repeated up to five times (settings, after the
  alternative domains of Section 4.1 are exhausted) or six times (support), with the
  waiting time doubling from 5 seconds (5 s, 10 s, 20 s, ...), in total for a few minutes.
  If every repetition fails, the result remains undetermined until the next run that
  covers it. A support probe answered with HTTP status 400 (bad request) is not repeated:
  the same request is rejected again, so the result remains undetermined until the next run.
- **Connection failures** concern the endpoint as a whole. After such a failure, no request
  of any kind is sent to the endpoint for a pause that starts at 30 seconds and doubles with
  every consecutive failure, up to 24 hours. Any answer from the endpoint, even an error
  status, ends the series of failures and the pause, except an overload answer.
- **Overload answers.** An answer with HTTP status 429 (too many requests), 503 (service
  unavailable) or 444 (connection closed without response, sent by some web application
  firewalls before they stop answering a client entirely), and an HTTP/2 connection closed
  gracefully before answering (a GOAWAY frame without error, by which some endpoints ask
  their clients to slow down), counts as a connection failure:
  it extends the series of failures and the pause, and the request is repeated after the
  pause without counting as one of its own repetitions. If the answer states how long to
  wait (a `Retry-After` header, or a rate-limit header giving when the quota resets), the
  pause lasts at least that long, up to the 24-hour maximum.
- **Exhausted quotas.** An answer of any kind whose rate-limit header says that no requests
  remain until a reset pauses all requests to the endpoint until that reset, without
  counting as a failure.

### 6.3 Abandonment

An endpoint is marked `dead`, and its outstanding requests in the current run are
abandoned, in two cases:

- its consecutive connection failures (including overload answers) have extended the
  pause to the 24-hour maximum,
  which occurs after 13 consecutive failures spread over roughly a day and a half; or
- a single failure is permanent by nature, namely an invalid TLS certificate (expired,
  self-signed or issued for another name) or an API address that cannot be requested at
  all.

The status `dead` is not final. The next run that covers the DNS provider contacts it
again, and once that run completes, its answers replace the status. Support recorded before an
endpoint became unreachable is retained in the history but not counted in the current
state, which counts only conclusive answers.

## 7. Load on DNS providers' endpoints

The measurement limits the rate of requests to every endpoint. An endpoint is identified by
its host name, port and the leading segments of its path, so that independent
installations sharing one host name are treated separately. At least 0.5 seconds pass
between two requests to the same endpoint, across all measuring processes together, so an
endpoint receives at most two requests per second. An endpoint known to tolerate less (for
example one behind a firewall that blocks clients at about one request per second) is given
a longer interval, and one known to cope with more may be given a shorter one; this changes
only how fast its answers are collected, never which answers count. Pending requests are
interleaved across endpoints, so that the rate typically remains well below the bound.
Connection failures, overload answers and exhausted quotas pause all requests to the
endpoint (Section 6.2); a rate-limit header never makes requests faster than the bound.

Every request identifies the measurement by its HTTP `User-Agent` header, which names the
software and its public project page and carries an identifier of the measuring process.

In absolute terms, a full sweep sends each DNS provider one request per template,
of the order of 1,400 requests per month, spread over at least several minutes. The weekly sweep sends the same number to each supporting DNS provider
once a week. The daily run of recent templates sends each DNS provider one request per
template published in the preceding 14 days, typically a few requests per day. One
settings request per Domain Connect URL is sent per month, apart from the repetitions
described in Section 6.2. The domain scan itself contacts only public DNS resolvers, not
the DNS providers.

## 8. Limitations

- **Zones only.** The statistics describe the scanned zones (Section 2.1), not the whole
  domain name system. Country-code top-level domains, whose zone files are generally not
  available, and subdomains are not covered.
- **Sampling error.** Figures of a sampled scan are estimates (Section 2.2). Differences
  between two scans smaller than about twice the standard error are not meaningful.
- **Attributed domains only.** Domain counts of DNS providers and stacks, and the reach of
  templates, include only domains whose Domain Connect URL is attributed to an identified
  DNS provider (Section 4.3). Domains referring to endpoints below the minimum size
  (Section 4.4) or to endpoints that never answered the settings request are counted only
  in the total of Domain Connect domains.
- **Advertised, not exercised, support.** A positive probe establishes that the DNS
  provider's API acknowledges the template. Whether applying the template succeeds for a
  particular domain or account is not tested.
- **History versus current state.** Domain counts refer to the reference scan, which
  may be several weeks old, whereas support refers to the time of publication. The history
  and the current state rest on the same conclusive probes (Section 5.2): a DNS provider
  whose latest probes failed keeps its last observed answers in both.
- **Temporal resolution.** Changes of support are dated by the probe that observed them:
  within one week for DNS providers supporting a template, one month for the others, and
  one day for templates in their first 14 days.
- **Current stacks.** Stack membership is the current one, also when applied to past
  scans and sweeps (Section 4.2).
- **Status lag.** The status of a DNS provider describes its latest completed run, which
  may be several weeks old (Section 6.1).
