<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import CardTitle from '../lib/components/CardTitle.svelte';
  import DataTable from '../lib/components/DataTable.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import NotFound from '../lib/components/NotFound.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import Registry from '../lib/components/Registry.svelte';
  import RegistryContact from '../lib/components/RegistryContact.svelte';
  import StatCard from '../lib/components/StatCard.svelte';
  import StatusBadge from '../lib/components/StatusBadge.svelte';
  import TimeChart from '../lib/components/TimeChart.svelte';
  import { countView } from '../lib/analytics';
  import { defaultClient, NotFoundError } from '../lib/data/load';
  import { findTable, oneRecord } from '../lib/data/tables';
  import type { Column, ExportFile, Manifest, Row } from '../lib/data/types';
  import { formatAxisPct, formatCount, formatPct, UNKNOWN } from '../lib/format';
  import { pageTitle } from '../lib/title';
  import { links } from '../lib/links';
  import { textParam } from '../lib/params';
  import { defaultRegistryClient, entryFileUrl } from '../lib/registry/load';
  import { importSeries } from '../lib/series';
  import DomainShare from '../lib/components/DomainShare.svelte';
  import { domainsTitle, importScanLabel, ofScanned, type Scan } from '../lib/domains';
  import { overviewFacts } from '../lib/overview-facts';
  import { isNeverProbed, probeCounts } from '../lib/dns-providers';
  import { servedCounts, supportedPairs } from '../lib/served';
  import ServedCounts from '../lib/components/ServedCounts.svelte';
  import { MAX_KEY, MEDIAN_KEY, MIN_KEY } from '../lib/stacks';
  import { templateCount } from '../lib/supporting';

  const id = textParam(window.location.search, 'id');
  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of domain shares. */
  let scan = $state<Scan | null>(null);

  /** The card, or null when the parameter is missing or the stack has no card (404). */
  const loading: Promise<ExportFile | null> = client.manifest().then((m) => {
    manifest = m;
    if (id === null) return null;
    void overviewFacts(client, m).then((f) => (scan = f.scan));
    return client.file('stack', { provider_id: id }).then(
      (file) => {
        const name = text(oneRecord(findTable(file, 'stack')), 'name');
        document.title = pageTitle(name ?? id, 'Stack');
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

  /** The overview's `adoption` rows: each import's date and sampling. */
  function adoptionFor(): Promise<Row[]> {
    return client
      .file('overview')
      .then((f) => findTable(f, 'adoption')?.rows ?? [])
      .catch(() => []);
  }

  const DEPLOYMENT_KEYS = [
    'name',
    'settings_status',
    'support_status',
    'supported_count',
    'unsupported_count',
    'undetermined_count',
    'domains',
  ];

  const registry = defaultRegistryClient();
  const registryLoads: Record<string, ReturnType<typeof loadRegistry>> = {};

  /** The registry entry of the stack, loaded once for the title, contact and details. */
  function registryOf(providerId: string) {
    return (registryLoads[providerId] ??= loadRegistry(providerId));
  }

  async function loadRegistry(providerId: string) {
    const entry = await registry.entry(providerId);
    if (!entry) return null;
    const source = await registry.source();
    return {
      entry,
      logoUrl: registry.logoUrl(entry),
      fileUrl: source && entryFileUrl(source, providerId),
    };
  }

  function num(row: Row | undefined, key: string): number | null {
    const v = row?.[key];
    return typeof v === 'number' ? v : null;
  }

  function text(row: Row | undefined, key: string): string | null {
    const v = row?.[key];
    return typeof v === 'string' ? v : null;
  }
</script>

{#snippet countPct(row: Row, key: string, pctKey: string)}
  <span class="count">{formatCount(num(row, key))}</span>
  {#if num(row, pctKey) !== null}<div class="muted">{formatPct(num(row, pctKey))}</div>{/if}
{/snippet}

{#snippet deploymentCell(column: Column, row: Row)}
  {@const dnsId = num(row, 'dns_provider_id')}
  {#if column.key === 'name'}
    {#if dnsId !== null}<a href={links.dnsProvider(dnsId)}>{row.name ?? UNKNOWN}</a
      >{:else}{row.name ?? UNKNOWN}{/if}
    <div class="mono muted host">{text(row, 'api_host') ?? UNKNOWN}</div>
  {:else if column.key === 'settings_status'}
    <StatusBadge status={row.settings_status ?? null} />
  {:else if column.key === 'support_status'}
    <StatusBadge status={row.support_status ?? null} detail={probeCounts(row)} />
  {:else if isNeverProbed(row) && column.key === 'supported_count'}
    <span class="muted count">Not probed yet</span>
  {:else if column.key === 'supported_count' || column.key === 'unsupported_count' || column.key === 'undetermined_count'}
    {@render countPct(row, column.key, column.key.replace(/_count$/, '_pct'))}
  {:else if column.key === 'domains'}
    <DomainShare pct={num(row, 'domains_pct')} domains={num(row, 'domains')} {scan} />
  {/if}
{/snippet}

{#snippet coverageCell(column: Column, row: Row)}
  {@const spid = text(row, 'service_provider_id')}
  {@const sid = text(row, 'service_id')}
  {#if column.key === 'service_provider_name' && spid}
    <a href={links.serviceProvider(spid)}>{row.service_provider_name ?? spid}</a>
  {:else if column.key === 'service_name' && spid && sid}
    <a href={links.template(spid, sid)}>{row.service_name ?? sid}</a>
  {:else if column.key === 'supporting_deployments'}
    <span class="count">{formatCount(num(row, 'supporting_deployments'))}</span>
    <div class="muted">{formatPct(num(row, 'supporting_pct'))}</div>
  {:else if column.key === 'reach_domains'}
    <DomainShare pct={num(row, 'reach_pct')} domains={num(row, 'reach_domains')} {scan} />
  {/if}
{/snippet}

<Layout current="stack" {manifest} {registry}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then file}
    {#if !file}
      <NotFound what="This stack" backHref={links.stacks()} backLabel="Stacks" />
    {:else}
      {@const record = oneRecord(findTable(file, 'stack'))}
      {@const deployments = findTable(file, 'deployments')}
      {@const coverage = findTable(file, 'template_coverage')}
      {@const shareHistory = findTable(file, 'share_history')}
      {@const stackId = text(record, 'provider_id') ?? id!}
      {@const reg = registryOf(stackId)}
      {@const deploymentCount = num(record, 'deployments')}

      <CardTitle
        kind="Stack"
        name={text(record, 'name') ?? stackId}
        logo={reg.then(
          (r) => (r?.logoUrl ? { url: r.logoUrl, alt: r.entry.name } : null),
          () => null,
        )}
      >
        Stack <span class="mono">{stackId}</span>
        ·
        <a href={links.dnsProviders({ stack: stackId })} data-testid="deployments-link"
          >Its deployments in the DNS providers list</a
        >
      </CardTitle>

      <section
        class="summary-stats"
        aria-label="Deployments, support and domain share"
        data-testid="headline"
      >
        <StatCard
          value={formatCount(deploymentCount)}
          exact={deploymentCount}
          label="Deployments"
          detail="DNS providers in the stack"
        />
        <StatCard
          value={formatPct(num(record, MEDIAN_KEY))}
          label="Median support"
          detail={`${formatPct(num(record, MIN_KEY))} to ${formatPct(num(record, MAX_KEY))} of ${formatCount(templateCount(manifest))} templates across deployments with probe answers`}
        />
        <StatCard
          value={formatPct(num(record, 'domains_pct'))}
          title={domainsTitle(num(record, 'domains'), scan)}
          label="Domain share"
          detail={num(record, 'domains_pct') === null
            ? 'no domain-share import'
            : 'of scanned domains'}
        />
      </section>

      {#await reg then r}
        {#if r}<RegistryContact entry={r.entry} stack={null} />{/if}
      {:catch}
        <!-- The registry details section below says the entry could not be loaded. -->
      {/await}

      {#if shareHistory}
        <Panel
          id="domain-share-history"
          title="Domain share over time"
          context={text(record, 'name') ?? stackId}
        >
          {#if shareHistory.rows.length}
            <p class="muted note">
              Summed over the stack's current deployments, also for past imports (<a
                href={links.methodology('42-deployments-providers-and-stacks')}>methodology 4.2</a
              >).
            </p>
            {#await adoptionFor() then adoption}
              <TimeChart
                label="Domain share over time"
                series={[
                  {
                    label: 'Share of scanned domains',
                    points: importSeries(shareHistory.rows, 'share_pct', adoption),
                    tooltip: (p) =>
                      `Share: ${formatPct(p.y, 2)} (${ofScanned(num(p.row, 'domains'), num(p.row, 'scanned_domains'), importScanLabel(adoption, p.row?.import_id ?? null)) ?? UNKNOWN})`,
                  },
                ]}
                leftTitle="% of scanned domains"
                formatLeft={formatAxisPct}
              />
            {/await}
          {:else}
            <p class="no-data">Not measured yet</p>
          {/if}
        </Panel>
      {/if}

      {#if deployments}
        <Panel id="deployments" title={deployments.title} context={text(record, 'name') ?? stackId}>
          <DataTable
            table={deployments}
            keys={DEPLOYMENT_KEYS}
            customKeys={DEPLOYMENT_KEYS}
            phoneKeys={['name', 'supported_count', 'domains']}
            cell={deploymentCell}
            searchable
            pageSize={20}
            emptyText="No deployment"
          />
        </Panel>
      {/if}

      {#if coverage}
        <Panel id="coverage" title={coverage.title} context={text(record, 'name') ?? stackId}>
          <DataTable
            table={coverage}
            keys={[
              'service_provider_name',
              'service_name',
              'supporting_deployments',
              'reach_domains',
            ]}
            customKeys={[
              'service_provider_name',
              'service_name',
              'supporting_deployments',
              'reach_domains',
            ]}
            phoneKeys={['service_provider_name', 'service_name', 'supporting_deployments']}
            cell={coverageCell}
            searchable
            pageSize={20}
            emptyText="No template supported by a deployment in the latest probes"
          />
        </Panel>
      {/if}

      {#if record}
        {@const pairs = deployments ? supportedPairs(deployments.rows) : null}
        <ServedCounts
          counts={servedCounts(record, pairs)}
          of={`of ${formatCount(pairs)} supported templates, summed over deployments`}
        />
      {/if}

      {#await reg then r}
        {#if r}<Registry entry={r.entry} fileUrl={r.fileUrl} stack={null} />{/if}
      {:catch}
        <section class="panel" data-testid="registry">
          <h2>Registry</h2>
          <p class="no-data">The registry entry could not be loaded.</p>
        </section>
      {/await}

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
  .note {
    margin-bottom: var(--spacing-sm);
    font-size: 0.85rem;
  }

  .host,
  .count {
    white-space: nowrap;
  }

  @media (min-width: 769px) {
    .host {
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }
</style>
