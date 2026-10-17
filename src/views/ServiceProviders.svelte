<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import DataTable from '../lib/components/DataTable.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import { defaultClient } from '../lib/data/load';
  import { findTable } from '../lib/data/tables';
  import type { Column, Manifest, Row } from '../lib/data/types';
  import { formatCount, UNKNOWN } from '../lib/format';
  import { links } from '../lib/links';
  import DomainShare from '../lib/components/DomainShare.svelte';
  import type { Scan } from '../lib/domains';
  import { overviewFacts } from '../lib/overview-facts';
  import { withHash } from '../lib/share';
  import { textParam } from '../lib/params';

  let query = $state(textParam(window.location.search, 'q') ?? '');

  // Keep the view a shareable link while the search changes.
  $effect(() => {
    window.history.replaceState(
      null,
      '',
      withHash(links.serviceProviders({ q: query }), location.hash),
    );
  });

  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of domain shares. */
  let scan = $state<Scan | null>(null);
  const loading = client.manifest().then((m) => {
    manifest = m;
    void overviewFacts(client, m).then((f) => (scan = f.scan));
    return client.file('service_providers');
  });

  const KEYS = [
    'name',
    'templates',
    'supported_templates',
    'supporting_dns_providers',
    'first_added_at',
    'last_updated_at',
    'reach_domains',
  ];
  const CUSTOM_KEYS = ['name', 'templates', 'reach_domains'];

  function num(row: Row, key: string): number | null {
    const v = row[key];
    return typeof v === 'number' ? v : null;
  }

  function text(row: Row, key: string): string | null {
    const v = row[key];
    return typeof v === 'string' ? v : null;
  }
</script>

{#snippet providerCell(column: Column, row: Row)}
  {@const id = text(row, 'service_provider_id')}
  {#if column.key === 'name'}
    {@const name = text(row, 'name') ?? id}
    {#if id}<a class="name" href={links.serviceProvider(id)}>{name}</a>{:else}{name ?? UNKNOWN}{/if}
    <!-- A provider without a name is listed by its id: no second line. -->
    {#if id !== name}<div class="mono muted id">{id ?? UNKNOWN}</div>{/if}
  {:else if column.key === 'templates'}
    {@const n = num(row, 'templates')}
    {#if id && n}<a href={links.templates({ spid: id })}>{formatCount(n)}</a>{:else}{formatCount(
        n,
      )}{/if}
  {:else if column.key === 'reach_domains'}
    <DomainShare pct={num(row, 'reach_pct')} domains={num(row, 'reach_domains')} {scan} />
  {/if}
{/snippet}

<Layout current="service-providers" {manifest}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then file}
    {@const source = findTable(file, 'service_providers')}
    {#if source}
      <Panel id="service-providers" title="Service providers" context="Service providers">
        <Notes notes={file.notes} />
        <DataTable
          table={source}
          keys={KEYS}
          customKeys={CUSTOM_KEYS}
          phoneKeys={['name', 'templates', 'reach_domains']}
          cell={providerCell}
          searchable
          pageSize={20}
          bind:query
          caption="Service providers"
          emptyText="No service provider to show"
        />
        <ul class="caveats" data-testid="caveats">
          <li>
            Supported: templates at least one DNS provider supports (<a
              href={links.methodology('52-support-probe')}>methodology 5.2</a
            >).
          </li>
          <li>DNS providers: those supporting at least one of its templates, each counted once.</li>
          <li>
            Reach: share of the scanned domains behind those DNS providers, each counted once (<a
              href={links.methodology('11-terms')}>methodology 1.1</a
            >).
          </li>
        </ul>
      </Panel>
    {:else}
      <LoadError error={new Error('The release has no service providers table')} />
    {/if}
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>

<style>
  /* Names fall back to their id; ids are hosts without spaces. */
  .name,
  .id {
    overflow-wrap: anywhere;
  }

  .caveats {
    margin-top: var(--spacing-md);
    padding-left: var(--spacing-md);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
</style>
