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
  import { MIN_KEY, supportLabel, supportRange } from '../lib/stacks';
  import { templateCount } from '../lib/supporting';

  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of domain shares. */
  let scan = $state<Scan | null>(null);
  const loading = client.manifest().then((m) => {
    manifest = m;
    void overviewFacts(client, m).then((f) => (scan = f.scan));
    return client.file('stacks');
  });

  // One column shows the range; it sorts by its lowest value.
  const KEYS = ['name', 'deployments', MIN_KEY, 'domains'];
  const CUSTOM_KEYS = KEYS;

  function num(row: Row, key: string): number | null {
    const v = row[key];
    return typeof v === 'number' ? v : null;
  }

  function text(row: Row, key: string): string | null {
    const v = row[key];
    return typeof v === 'string' ? v : null;
  }
</script>

{#snippet stackCell(column: Column, row: Row)}
  {@const id = text(row, 'provider_id')}
  {#if column.key === 'name'}
    {@const name = text(row, 'name') ?? id}
    {#if id}<a class="name" href={links.stack(id)}>{name}</a>{:else}{name ?? UNKNOWN}{/if}
    <!-- A stack without a name is listed by its id: no second line. -->
    {#if id !== name}<div class="mono muted id">{id ?? UNKNOWN}</div>{/if}
  {:else if column.key === 'deployments'}
    {@const n = num(row, 'deployments')}
    {#if id && n}<a href={links.dnsProviders({ stack: id })}>{formatCount(n)}</a
      >{:else}{formatCount(n)}{/if}
  {:else if column.key === MIN_KEY}
    {@const range = supportRange(row)}
    <span class="count">{supportLabel(row)}</span>
    {#if range}
      <!-- Span from the lowest to the highest deployment. -->
      <div class="range" data-testid="range-bar" aria-hidden="true">
        <span class="span" style="left: {range.left}%; width: {range.width}%"></span>
      </div>
    {/if}
  {:else if column.key === 'domains'}
    <DomainShare pct={num(row, 'domains_pct')} domains={num(row, 'domains')} {scan} />
  {/if}
{/snippet}

<Layout current="stacks" {manifest}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then file}
    {@const source = findTable(file, 'stacks')}
    {#if source}
      <Panel id="stacks" title="Stacks" context="Stacks">
        <Notes notes={file.notes} />
        <DataTable
          table={{
            ...source,
            columns: source.columns.map((c) =>
              c.key === MIN_KEY ? { ...c, header: 'SUPPORT' } : c,
            ),
          }}
          keys={KEYS}
          customKeys={CUSTOM_KEYS}
          phoneKeys={KEYS}
          cell={stackCell}
          searchable
          pageSize={20}
          caption="Stacks"
          emptyText="No stack to show"
        />
        <ul class="caveats" data-testid="caveats">
          <li>
            Support: the share of every template ({formatCount(templateCount(manifest))}) each
            deployment with a probe answer supports in any version; lowest and highest across the
            stack, shown as a bar on a 0–100% scale (<a href={links.methodology('52-support-probe')}
              >methodology 5.2</a
            >).
          </li>
          <li>
            Deployments: DNS providers running the stack, probed or not. DNS providers without a
            stack are not listed (<a href={links.methodology('42-deployments-providers-and-stacks')}
              >methodology 4.2</a
            >).
          </li>
          <li>
            Domains: share of the scanned domains behind the stack's DNS providers (<a
              href={links.methodology('43-attribution-of-domains')}>methodology 4.3</a
            >).
          </li>
        </ul>
      </Panel>
    {:else}
      <LoadError error={new Error('The release has no stacks table')} />
    {/if}
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>

<style>
  .count {
    white-space: nowrap;
  }

  .name,
  .id {
    overflow-wrap: anywhere;
  }

  /* The id repeats the name closely; at phone width the name column stays narrow. */
  @media (max-width: 480px) {
    .id {
      display: none;
    }
  }

  .range {
    position: relative;
    height: 0.4rem;
    min-width: 5rem;
    margin-top: 0.25rem;
    border-radius: 0.2rem;
    background-color: var(--border-color);
  }

  .span {
    position: absolute;
    top: 0;
    bottom: 0;
    min-width: 2px;
    border-radius: 0.2rem;
    background-color: var(--accent-cyan);
    opacity: 0.6;
  }

  .caveats {
    margin-top: var(--spacing-md);
    padding-left: var(--spacing-md);
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
</style>
