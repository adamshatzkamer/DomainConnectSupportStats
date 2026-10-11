<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import BeforeScansBadge from '../lib/components/BeforeScansBadge.svelte';
  import CardTitle from '../lib/components/CardTitle.svelte';
  import DataTable from '../lib/components/DataTable.svelte';
  import ExternalLink from '../lib/components/ExternalLink.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import Timestamp from '../lib/components/Timestamp.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import NotFound from '../lib/components/NotFound.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import Registry from '../lib/components/Registry.svelte';
  import RegistryContact from '../lib/components/RegistryContact.svelte';
  import StatCard from '../lib/components/StatCard.svelte';
  import TimeChart from '../lib/components/TimeChart.svelte';
  import { isBeforeScans, parseNameservers } from '../lib/cells';
  import { scannerStart } from '../lib/data/config';
  import { cardSweep } from '../lib/annotation';
  import { defaultClient, NotFoundError } from '../lib/data/load';
  import { templateSupport, templateTotal } from '../lib/dns-providers';
  import { findTable, oneRecord } from '../lib/data/tables';
  import type { Column, ExportFile, Manifest, Row } from '../lib/data/types';
  import { formatAxisPct, formatCount, formatPct, UNKNOWN } from '../lib/format';
  import { links } from '../lib/links';
  import { integerParam } from '../lib/params';
  import { defaultRegistryClient, entryFileUrl } from '../lib/registry/load';
  import { importSeries, sweepSeries } from '../lib/series';
  import { domainsTitle, importScanLabel, ofScanned, type Scan } from '../lib/domains';
  import { overviewFacts } from '../lib/overview-facts';

  const id = integerParam(window.location.search, 'id');
  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of domain shares. */
  let scan = $state<Scan | null>(null);

  /** The card, or null when the id is missing, malformed or has no card (404). */
  const loading: Promise<ExportFile | null> = client.manifest().then((m) => {
    manifest = m;
    if (id === null) return null;
    void overviewFacts(client, m).then((f) => (scan = f.scan));
    return client.file('dns_provider', { dns_provider_id: id }).then(
      (file) => {
        const name = text(oneRecord(findTable(file, 'provider')), 'name');
        if (name) document.title = `${name} - DNS provider - Domain Connect Support Statistics`;
        return file;
      },
      (e: unknown) => {
        if (e instanceof NotFoundError) return null;
        throw e;
      },
    );
  });
  /** The newest sweep the card reflects, for the data annotation. */
  const sweep = loading.then((f) => (f ? cardSweep('dns_provider', f) : null));

  /** The overview's `adoption` rows: each import's date and sampling. */
  function adoptionFor(): Promise<Row[]> {
    return client
      .file('overview')
      .then((f) => findTable(f, 'adoption')?.rows ?? [])
      .catch(() => []);
  }

  const registry = defaultRegistryClient();
  const registryLoads: Record<string, ReturnType<typeof loadRegistry>> = {};

  /** The registry of stack `providerId`, loaded once for the title, contact and details. */
  function registryOf(providerId: string) {
    return (registryLoads[providerId] ??= loadRegistry(providerId));
  }

  /**
   * The registry entry of stack `providerId`, or null when the stack has none. The stack card is
   * fetched only for an entry: several deployments share it, so the card names the stack; if that
   * fetch fails, it names the stack by its id.
   */
  async function loadRegistry(providerId: string) {
    const entry = await registry.entry(providerId);
    if (!entry) return null;
    const [source, stack] = await Promise.all([
      registry.source(),
      client.file('stack', { provider_id: providerId }).then(
        (f) => {
          const record = oneRecord(findTable(f, 'stack'));
          const deployments = num(record, 'deployments');
          if (deployments !== null && deployments <= 1) return null;
          return { id: providerId, name: text(record, 'name') ?? providerId };
        },
        () => ({ id: providerId, name: providerId }),
      ),
    ]);
    return {
      entry,
      logoUrl: registry.logoUrl(entry),
      fileUrl: source && entryFileUrl(source, providerId),
      stack,
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

  const URL_FIELDS = [
    ['api_url', 'API URL'],
    ['sync_url', 'Synchronous flow URL'],
    ['async_url', 'Asynchronous flow URL'],
    ['control_panel_url', 'Control panel URL'],
    ['domain_connect_url', 'First Domain Connect URL'],
  ] as const;
</script>

{#snippet templateCell(column: Column, row: Row)}
  {@const spid = text(row, 'service_provider_id')}
  {@const sid = text(row, 'service_id')}
  {#if column.key === 'service_provider_name' && spid}
    <a href={links.serviceProvider(spid)}>{row.service_provider_name ?? spid}</a>
  {:else if column.key === 'service_name' && spid && sid}
    <a href={links.template(spid, sid)}>{row.service_name ?? sid}</a>
  {/if}
{/snippet}

<Layout current="dns-provider" {manifest} {sweep} {registry}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then file}
    {#if !file}
      <NotFound
        what="This DNS provider"
        backHref={links.dnsProviders()}
        backLabel="DNS providers"
      />
    {:else}
      {@const provider = oneRecord(findTable(file, 'provider'))}
      {@const share = oneRecord(findTable(file, 'share'))}
      {@const urls = findTable(file, 'urls')}
      {@const templates = findTable(file, 'supported_templates')}
      {@const probed = text(provider, 'support_last_status') !== null}
      {@const support = oneRecord(findTable(file, 'support'))}
      {@const templateShare = templateSupport(support)}
      {@const supportHistory = findTable(file, 'support_history')}
      {@const shareHistory = findTable(file, 'share_history')}
      {@const stack = text(provider, 'provider_id')}
      {@const nameservers = parseNameservers(text(provider, 'nameservers'))}
      {@const providerName = text(provider, 'name') ?? 'Unnamed DNS provider'}
      {@const reg = stack ? registryOf(stack) : Promise.resolve(null)}

      <CardTitle
        kind="DNS provider"
        name={providerName}
        logo={reg.then(
          (r) => (r?.logoUrl ? { url: r.logoUrl, alt: r.entry.name } : null),
          () => null,
        )}
      >
        {#if stack}
          Stack <a href={links.stack(stack)} data-testid="stack-link"
            >{#await reg}{stack}{:then r}{r?.stack
                ? `${r.stack.name} (${stack})`
                : stack}{:catch}{stack}{/await}</a
          >
        {:else}
          No stack (declares no providerId)
        {/if}
      </CardTitle>

      <section class="summary-stats" aria-label="Support and domain share" data-testid="headline">
        <StatCard
          value={formatCount(num(support, 'supported_templates'))}
          label="Supported templates"
          detail={probed
            ? `of ${formatCount(templateTotal(support))} templates (${formatPct(templateShare.supportedPct)})`
            : 'not probed yet'}
        />
        <StatCard
          value={formatCount(num(support, 'unsupported_templates'))}
          label="Not supported"
          detail={`${formatPct(templateShare.unsupportedPct)} of templates`}
        />
        <StatCard
          value={formatCount(num(support, 'undetermined_templates'))}
          label="Not yet determined"
          detail={`${formatPct(templateShare.undeterminedPct)}: never probed, retried or failed`}
        />
        <StatCard
          value={formatPct(num(share, 'share_pct'))}
          title={domainsTitle(num(share, 'domains'), scan)}
          label="Domain share"
          detail={share ? 'of scanned domains' : 'no domain-share import'}
        />
        <StatCard
          value={num(share, 'rank') === null ? UNKNOWN : `#${num(share, 'rank')}`}
          label="Rank by domains"
          detail={share
            ? `of ${formatCount(num(share, 'providers'))} DNS providers with domains`
            : undefined}
        />
      </section>

      {#await reg then r}
        {#if r}<RegistryContact entry={r.entry} stack={r.stack} />{/if}
      {:catch}
        <!-- The registry details section below says the entry could not be loaded. -->
      {/await}

      {#if shareHistory}
        <Panel id="domain-share-history" title="Domain share over time" context={providerName}>
          {#if shareHistory.rows.length}
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

      {#if supportHistory}
        <Panel id="support-history" title="Supported templates over time" context={providerName}>
          {#if supportHistory.rows.length}
            <TimeChart
              label="Supported templates over time"
              beforeScans={scannerStart()}
              series={[
                {
                  label: 'Supported templates',
                  points: sweepSeries(supportHistory.rows, 'supported_templates'),
                  stepped: true,
                  tooltip: (p) => `Supported templates: ${p.y}`,
                },
              ]}
              leftTitle="Templates"
              formatLeft={(v) => (Number.isInteger(v) ? formatCount(v) : '')}
            />
          {:else}
            <p class="no-data">Not measured yet</p>
          {/if}
        </Panel>
      {/if}

      {#if templates}
        <Panel id="templates" title={templates.title} context={providerName}>
          <DataTable
            table={templates}
            keys={['service_provider_name', 'service_name', 'versions', 'since']}
            customKeys={['service_provider_name', 'service_name']}
            phoneKeys={['service_provider_name', 'service_name', 'since']}
            searchable
            pageSize={20}
            cell={templateCell}
            sort={{ key: 'since', direction: -1 }}
            emptyText="No template supported in the latest probes"
          />
          <p class="caveat" data-testid="since-caveat">
            Supported since: when a probe first saw the DNS provider support any version of the
            template. New versions and gaps in support don't move it (<a
              href={links.methodology('52-support-probe')}>methodology 5.2</a
            >).
          </p>
        </Panel>
      {/if}

      {#await reg then r}
        {#if r}<Registry entry={r.entry} fileUrl={r.fileUrl} stack={r.stack} />{/if}
      {:catch}
        <section class="panel" data-testid="registry">
          <h2>Registry</h2>
          <p class="no-data">The registry entry could not be loaded.</p>
        </section>
      {/await}

      <section class="panel">
        <h2>Settings</h2>
        <dl class="record" data-testid="provider-record">
          {#each URL_FIELDS as [key, label] (key)}
            <dt>{label}</dt>
            <dd><ExternalLink url={text(provider, key)} mono /></dd>
          {/each}
          <dt>Name servers</dt>
          <dd>
            {#if nameservers?.length}
              <ul class="plain mono">
                {#each nameservers as ns, i (i)}<li>{ns}</li>{/each}
              </ul>
            {:else}
              {nameservers ? 'none' : (text(provider, 'nameservers') ?? UNKNOWN)}
            {/if}
          </dd>
          <dt>First seen</dt>
          <dd>
            {#if isBeforeScans('first_seen_at', text(provider, 'first_seen_at'), scannerStart())}
              <BeforeScansBadge value={text(provider, 'first_seen_at') ?? ''} />
            {:else}
              <Timestamp value={text(provider, 'first_seen_at')} />
            {/if}
          </dd>
        </dl>
      </section>

      {#if file.notes.length}
        <section class="panel">
          <h2>Notes</h2>
          <Notes notes={file.notes} />
        </section>
      {/if}

      {#if urls}
        <Panel id="urls" title={urls.title} context={providerName}>
          <DataTable table={urls} emptyText="No Domain Connect URL is attributed to it" />
        </Panel>
      {/if}
    {/if}
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>
