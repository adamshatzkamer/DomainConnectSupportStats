<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import DataTable from '../lib/components/DataTable.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import { defaultClient } from '../lib/data/load';
  import { findTable } from '../lib/data/tables';
  import type { Column, Manifest, Row } from '../lib/data/types';
  import { formatCount, formatPct, UNKNOWN } from '../lib/format';
  import { pageTitle } from '../lib/title';
  import { links } from '../lib/links';
  import { withHash } from '../lib/share';
  import { flagParam, textParam } from '../lib/params';
  import { isNeverProbed, templateList, withSupport } from '../lib/templates-list';
  import type { Scan } from '../lib/domains';
  import DomainShare from '../lib/components/DomainShare.svelte';
  import { overviewFacts } from '../lib/overview-facts';

  const search = window.location.search;
  const spid = textParam(search, 'spid');
  let query = $state(textParam(search, 'q') ?? '');
  let showAll = $state(flagParam(search, 'all'));

  // Keep the view a shareable link while the search and toggle change.
  $effect(() => {
    window.history.replaceState(
      null,
      '',
      withHash(links.templates({ spid, q: query, all: showAll }), location.hash),
    );
  });

  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of reach. */
  let scan = $state<Scan | null>(null);
  const loading = client.manifest().then(async (m) => {
    manifest = m;
    const [file, facts] = await Promise.all([client.file('templates'), overviewFacts(client, m)]);
    scan = facts.scan;
    return { file, total: facts.supportingDnsProviders };
  });

  if (spid) document.title = pageTitle(spid, 'Templates');

  const KEYS = [
    'provider_name',
    'service_name',
    'added_at',
    'supporting_dns_providers',
    'not_supporting_dns_providers',
    'reach_domains',
  ];
  const CUSTOM_KEYS = [
    'service_name',
    'provider_name',
    'supporting_dns_providers',
    'not_supporting_dns_providers',
    'reach_domains',
  ];

  function num(row: Row, key: string): number | null {
    const v = row[key];
    return typeof v === 'number' ? v : null;
  }

  function text(row: Row, key: string): string | null {
    const v = row[key];
    return typeof v === 'string' ? v : null;
  }

  /** The service provider's name from its rows, else its id. */
  function providerName(rows: Row[], id: string): string {
    const row = rows.find((r) => r.provider_id === id);
    return (row && text(row, 'provider_name')) ?? id;
  }
</script>

{#snippet countPct(count: string, pct: number | null)}
  <span class="count">{count}</span>
  {#if count !== UNKNOWN}<div class="muted">{formatPct(pct)}</div>{/if}
{/snippet}

{#snippet templateCell(column: Column, row: Row)}
  {@const spidOf = text(row, 'provider_id')}
  {@const sid = text(row, 'service_id')}
  {#if column.key === 'service_name'}
    {#if spidOf && sid}<a href={links.template(spidOf, sid)}>{row.service_name ?? sid}</a
      >{:else}{row.service_name ?? UNKNOWN}{/if}
    <div class="mono muted id">{sid ?? UNKNOWN}</div>
  {:else if column.key === 'provider_name'}
    {#if spidOf}<a class="provider" href={links.serviceProvider(spidOf)}
        >{row.provider_name ?? spidOf}</a
      >{:else}{row.provider_name ?? UNKNOWN}{/if}
  {:else if isNeverProbed(row) && column.key !== 'reach_domains'}
    {#if column.key === 'supporting_dns_providers'}<span class="muted not-probed"
        >Not probed yet</span
      >{:else}{UNKNOWN}{/if}
  {:else if column.key === 'supporting_dns_providers' || column.key === 'not_supporting_dns_providers'}
    {@render countPct(formatCount(num(row, column.key)), num(row, `${column.key}_pct`))}
  {:else if column.key === 'reach_domains'}
    <DomainShare pct={num(row, 'reach_pct')} domains={num(row, 'reach_domains')} {scan} />
  {/if}
{/snippet}

<Layout current="templates" {manifest}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then { file, total }}
    {@const source = findTable(file, 'service_templates')}
    {#if source}
      {@const list = templateList(withSupport(source, total), { spid, showAll })}
      {@const spName = spid ? providerName(source.rows, spid) : null}
      <Panel
        id="templates"
        title={spid ? `Templates of ${spName}` : 'Templates'}
        context="Templates"
      >
        {#if spid}
          <p class="filter" data-testid="spid-filter">
            Templates of service provider <a href={links.serviceProvider(spid)}>{spName}</a> ·
            <a href={links.templates({ q: query, all: showAll })}>All templates</a>
          </p>
        {/if}
        <Notes notes={file.notes} />
        <p class="toggle">
          <label>
            <input type="checkbox" bind:checked={showAll} data-testid="show-all" />
            Show all ({list.hiddenCount} hidden: never probed)
          </label>
        </p>
        <DataTable
          table={list.table}
          keys={KEYS}
          customKeys={CUSTOM_KEYS}
          phoneKeys={['provider_name', 'service_name', 'supporting_dns_providers', 'reach_domains']}
          cell={templateCell}
          searchable
          pageSize={20}
          bind:query
          caption="Templates"
          emptyText={spid
            ? `No template of service provider ${spid} to show`
            : 'No template to show'}
        />
        <ul class="caveats" data-testid="caveats">
          <li>
            Supported: DNS providers supporting any version of the template; not supported: the
            other DNS providers supporting at least one template ({formatCount(total)}), including
            those not yet determined. Both as a share of those {formatCount(total)} (<a
              href={links.methodology('52-support-probe')}>methodology 5.2</a
            >).
          </li>
          <li>
            Reach: share of the scanned domains behind the DNS providers that support it, each
            counted once (<a href={links.methodology('11-terms')}>methodology 1.1</a>).
          </li>
        </ul>
      </Panel>
    {:else}
      <LoadError error={new Error('The release has no templates table')} />
    {/if}
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>

<style>
  .filter,
  .toggle {
    margin-bottom: var(--spacing-sm);
  }

  .toggle input {
    margin-right: var(--spacing-xs);
  }

  /* Wide screens: long ids wrap so the table fits. Phones: the table scrolls. */
  .id,
  .count,
  .not-probed {
    white-space: nowrap;
  }

  @media (min-width: 769px) {
    .id {
      white-space: normal;
      overflow-wrap: anywhere;
    }
  }

  /* Provider names fall back to their id, a host without spaces. */
  .provider {
    overflow-wrap: anywhere;
  }

  .caveats {
    margin-top: var(--spacing-md);
    padding-left: var(--spacing-md);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
</style>
