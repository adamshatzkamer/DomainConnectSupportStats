<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import CardTitle from '../lib/components/CardTitle.svelte';
  import DataTable from '../lib/components/DataTable.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import Timestamp from '../lib/components/Timestamp.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import NotFound from '../lib/components/NotFound.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import StatCard from '../lib/components/StatCard.svelte';
  import { scannerStart } from '../lib/data/config';
  import TimeChart from '../lib/components/TimeChart.svelte';
  import { cardSweep } from '../lib/annotation';
  import { countView } from '../lib/analytics';
  import { defaultClient, NotFoundError } from '../lib/data/load';
  import { findTable, oneRecord } from '../lib/data/tables';
  import type { Column, ExportFile, Manifest, Row } from '../lib/data/types';
  import { formatCount, formatPct, UNKNOWN } from '../lib/format';
  import { pageTitle } from '../lib/title';
  import { links, safeUrl } from '../lib/links';
  import { textParam } from '../lib/params';
  import { sweepSeries } from '../lib/series';
  import {
    historyDiffers,
    OWN_COLUMN_KEYS,
    recordDetails,
    recordsTable,
    RECORD_DETAILS_KEY,
    recordValue,
    tableTitle,
  } from '../lib/templates';
  import { domainsTitle } from '../lib/domains';
  import DomainShare from '../lib/components/DomainShare.svelte';
  import { NO_FACTS, overviewFacts, type OverviewFacts } from '../lib/overview-facts';
  import { ofSupporting } from '../lib/supporting';

  const spid = textParam(window.location.search, 'spid');
  const sid = textParam(window.location.search, 'sid');
  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  let facts = $state<OverviewFacts>(NO_FACTS);

  /** The card, or null when a parameter is missing or the template has no card (404). */
  const loading: Promise<ExportFile | null> = client.manifest().then((m) => {
    manifest = m;
    if (spid === null || sid === null) return null;
    void overviewFacts(client, m).then((f) => (facts = f));
    return client.file('template', { service_provider_id: spid, service_id: sid }).then(
      (file) => {
        const name = text(oneRecord(findTable(file, 'metadata')), 'name');
        document.title = pageTitle(name ?? 'Unnamed template', 'Template');
        return file;
      },
      (e: unknown) => {
        if (e instanceof NotFoundError) return null;
        throw e;
      },
    );
  });

  // Counted with the card's title; not found or failed, with the page's own.
  void loading.then(
    () => countView(),
    () => countView(),
  );

  /** The newest sweep the card reflects, for the data annotation. */
  const sweep = loading.then((f) => (f ? cardSweep('template', f) : null));

  function num(row: Row | null | undefined, key: string): number | null {
    const v = row?.[key];
    return typeof v === 'number' ? v : null;
  }

  function text(row: Row | undefined, key: string): string | null {
    const v = row?.[key];
    return typeof v === 'string' ? v : null;
  }

  function versionList(row: Row | undefined): string {
    const v = row?.versions;
    return Array.isArray(v) ? v.join(', ') : UNKNOWN;
  }
</script>

{#snippet supporterCell(column: Column, row: Row)}
  {@const id = num(row, 'dns_provider_id')}
  {#if column.key === 'name'}
    {#if id !== null}<a href={links.dnsProvider(id)}>{row.name ?? UNKNOWN}</a>{:else}{row.name ??
        UNKNOWN}{/if}
    <div class="mono muted host">{text(row, 'api_host') ?? UNKNOWN}</div>
  {:else if column.key === 'provider_id'}
    {@const s = text(row, 'provider_id')}
    {#if s}<a href={links.stack(s)}>{s}</a>{:else}{UNKNOWN}{/if}
  {:else if column.key === 'reach_pct'}
    <DomainShare pct={num(row, 'reach_pct')} domains={num(row, 'domains')} scan={facts.scan} />
  {/if}
{/snippet}

<Layout current="template" {manifest} {sweep}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then file}
    {#if !file}
      <NotFound what="This template" backHref={links.templates()} backLabel="Templates" />
    {:else}
      {@const metadata = oneRecord(findTable(file, 'metadata'))}
      {@const records = findTable(file, 'records')}
      {@const supporters = findTable(file, 'supporters')}
      {@const history = findTable(file, 'history')}
      {@const serviceProviderId = text(metadata, 'service_provider_id') ?? spid!}
      {@const serviceId = text(metadata, 'service_id') ?? sid!}
      {@const templateName = text(metadata, 'name') ?? 'Unnamed template'}
      {@const logoUrl = safeUrl(text(metadata, 'logo_url'))}
      {@const total = supporters?.footer}

      <CardTitle
        kind="Template"
        name={templateName}
        logo={Promise.resolve(logoUrl ? { url: logoUrl, alt: templateName } : null)}
      >
        Service provider
        <a href={links.serviceProvider(serviceProviderId)} data-testid="service-provider-link"
          >{text(metadata, 'service_provider_name') ?? serviceProviderId}</a
        >
        · <span class="mono">{serviceProviderId} / {serviceId}</span>
      </CardTitle>

      <section class="summary-stats" aria-label="Support and reach" data-testid="headline">
        <StatCard
          value={supporters ? formatCount(supporters.rows.length) : UNKNOWN}
          label="Supporting DNS providers"
          detail={supporters && facts.supportingDnsProviders !== null
            ? `${formatPct(ofSupporting(supporters.rows.length, facts.supportingDnsProviders))} of ${formatCount(facts.supportingDnsProviders)} with at least 1 template`
            : 'any version, in the latest probes'}
        />
        <StatCard
          value={formatPct(num(total, 'reach_pct'))}
          title={domainsTitle(num(total, 'domains'), facts.scan)}
          label="Reach"
          detail={num(total, 'reach_pct') === null
            ? 'no domain-share import'
            : 'of scanned domains'}
        />
        <StatCard
          value={num(metadata, 'version') === null ? UNKNOWN : `${num(metadata, 'version')}`}
          label="Version"
          detail={`stored versions: ${versionList(metadata)}`}
        />
      </section>

      <section class="panel">
        <h2>About</h2>
        <dl class="record" data-testid="template-record">
          <dt>Description</dt>
          <dd class="multiline">{text(metadata, 'description') ?? UNKNOWN}</dd>
          <dt>Variables</dt>
          <dd class="multiline">{text(metadata, 'variable_description') ?? UNKNOWN}</dd>
          <dt>Added</dt>
          <dd><Timestamp value={text(metadata, 'created_at')} /></dd>
          <dt>Updated</dt>
          <dd><Timestamp value={text(metadata, 'updated_at')} /></dd>
          <dt>Template SHA</dt>
          <dd class="mono break">{text(metadata, 'template_sha') ?? UNKNOWN}</dd>
        </dl>
      </section>

      {#if history}
        <Panel
          id="support-history"
          title="Supporting DNS providers over time"
          context={templateName}
        >
          {#if history.rows.length}
            <TimeChart
              beforeScans={scannerStart()}
              label="Supporting DNS providers over time"
              series={[
                {
                  label: 'Supporting DNS providers',
                  points: sweepSeries(history.rows, 'supporting_providers'),
                  stepped: true,
                  tooltip: (p) => `Supporting DNS providers: ${p.y}`,
                },
              ]}
              leftTitle="DNS providers"
              formatLeft={(v) => (Number.isInteger(v) ? formatCount(v) : '')}
            />
            {#if supporters && historyDiffers(history.rows, supporters.rows.length)}
              <p class="caveat" data-testid="history-caveat">
                The latest point counts {formatCount(
                  num(history.rows.at(-1), 'supporting_providers'),
                )}
                DNS providers, the latest probes {formatCount(supporters.rows.length)}: the history
                keeps the support a DNS provider last had when its latest probe failed (<a
                  href={links.methodology('8-limitations')}>methodology 8</a
                >).
              </p>
            {/if}
          {:else}
            <p class="no-data">Not measured yet</p>
          {/if}
        </Panel>
      {/if}

      {#if supporters}
        <Panel
          id="supporters"
          title={tableTitle(supporters.title, serviceProviderId, serviceId)}
          context={templateName}
        >
          <DataTable
            table={supporters}
            keys={['name', 'provider_id', 'versions', 'since', 'reach_pct']}
            customKeys={['name', 'provider_id', 'reach_pct']}
            phoneKeys={['name', 'since', 'reach_pct']}
            searchable
            pageSize={20}
            cell={supporterCell}
            emptyText="No DNS provider supports it in the latest probes"
          />
          <p class="caveat" data-testid="since-caveat">
            Supported since: when a probe first saw the DNS provider support any version of the
            template. New versions and gaps in support don't move it (<a
              href={links.methodology('52-support-probe')}>methodology 5.2</a
            >).
          </p>
        </Panel>
      {/if}

      {#if records}
        {@const shown = recordsTable(records)}
        <Panel id="records" title="Records" context={templateName}>
          <DataTable
            table={shown}
            customKeys={[RECORD_DETAILS_KEY, ...OWN_COLUMN_KEYS]}
            phoneKeys={['type', 'host', RECORD_DETAILS_KEY]}
            emptyText="No records stored"
          >
            {#snippet cell(column: Column, row: Row)}
              {#if column.key === RECORD_DETAILS_KEY}
                <dl class="fields mono">
                  {#each recordDetails(records.columns, row) as d (d.key)}
                    <div class:phone-only={d.ownColumn}>
                      <dt>{d.key}:</dt>
                      <dd>{d.value}</dd>
                    </div>
                  {/each}
                </dl>
              {:else}
                <span class="mono">{recordValue(row[column.key]) ?? UNKNOWN}</span>
              {/if}
            {/snippet}
          </DataTable>
        </Panel>
      {/if}

      {#if file.notes.length}
        <section class="panel">
          <h2>Notes</h2>
          <Notes notes={file.notes} />
        </section>
      {/if}
    {/if}
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>

<style>
  .multiline {
    white-space: pre-line;
  }

  .break {
    overflow-wrap: anywhere;
  }

  .host {
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }

  .fields {
    margin: 0;
    font-size: 0.85rem;
  }

  .fields div {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.5rem;
  }

  .fields dt {
    color: var(--text-secondary);
  }

  @media (min-width: 481px) {
    .fields .phone-only {
      display: none;
    }
  }

  .fields dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
</style>
