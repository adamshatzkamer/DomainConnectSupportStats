<script lang="ts">
  import Panel from '../lib/components/Panel.svelte';
  import Board from '../lib/components/Board.svelte';
  import Layout from '../lib/components/Layout.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import NewSupporters from '../lib/components/NewSupporters.svelte';
  import Unavailable from '../lib/components/Unavailable.svelte';
  import Notes from '../lib/components/Notes.svelte';
  import { scannerStart } from '../lib/data/config';
  import { defaultClient } from '../lib/data/load';
  import { findTable } from '../lib/data/tables';
  import type { ExportFile, Manifest, Row } from '../lib/data/types';
  import { formatDate, formatPct } from '../lib/format';
  import {
    BOARD_SIZE,
    entrantRows,
    entrants,
    improvedWindow,
    isMeasured,
    mostImproved,
    NEW_SUPPORT_DAYS,
    newSupporting,
    topByDomains,
    topByTemplates,
    topReach,
    WINDOW_LABELS,
    type BoardRow,
    type ImprovedWindow,
    type Ranked,
  } from '../lib/leaderboards';
  import { links } from '../lib/links';
  import { domainsTitle, type Scan } from '../lib/domains';
  import { overviewFacts } from '../lib/overview-facts';
  import { withHash } from '../lib/share';

  const client = defaultClient();
  let window_ = $state(improvedWindow(window.location.search));

  // Switch in place; the URL stays a shareable link.
  $effect(() => {
    window.history.replaceState(
      null,
      '',
      withHash(links.leaderboards({ window: window_ === 'sweep' ? null : window_ }), location.hash),
    );
  });
  let manifest = $state<Manifest | null>(null);
  /** The domain-share import, for the hover text of domain shares. */
  let scan = $state<Scan | null>(null);
  const loading = client.manifest().then(async (m) => {
    manifest = m;
    void overviewFacts(client, m).then((f) => (scan = f.scan));
    const [dnsProviders, templates, serviceProviders] = await Promise.all([
      client.file('dns_providers'),
      client.file('templates'),
      client.file('service_providers'),
    ]);
    return { dnsProviders, templates, serviceProviders };
  });
  const derived = client.leaderboards();
  // Shown by its own {#await}, which may render only after it settles.
  derived.catch(() => undefined);
  // An anchored link scrolls once every board's height is final.
  let boardsReady = $state(false);
  void Promise.allSettled([loading, derived]).then(() => (boardsReady = true));

  const rowsOf = (file: ExportFile, id: string): Row[] => findTable(file, id)?.rows ?? [];
  const text = (row: Row, key: string): string | null =>
    typeof row[key] === 'string' ? (row[key] as string) : null;

  /** Every file's notes once, verbatim. */
  function notes(files: ExportFile[]): string[] {
    return [...new Set(files.flatMap((f) => f.notes))];
  }

  function reachRows(ranked: Ranked<Row>[], kind: 'template' | 'service_provider'): BoardRow[] {
    return ranked.map(({ rank, value, entry }) => {
      const spid =
        kind === 'template' ? text(entry, 'provider_id') : text(entry, 'service_provider_id');
      const sid = text(entry, 'service_id') ?? '';
      return {
        rank,
        name:
          kind === 'template'
            ? (text(entry, 'service_name') ?? sid)
            : (text(entry, 'name') ?? spid ?? '?'),
        href:
          kind === 'template' ? links.template(spid ?? '', sid) : links.serviceProvider(spid ?? ''),
        detail: kind === 'template' ? text(entry, 'provider_name') : null,
        value: formatPct(typeof entry.reach_pct === 'number' ? entry.reach_pct : null),
        title: domainsTitle(value, scan),
      };
    });
  }

  const templateName = (r: Row) =>
    `${text(r, 'service_name') ?? ''} ${text(r, 'provider_name') ?? ''}`;
  const serviceProviderName = (r: Row) => text(r, 'name') ?? '';

  function improvedEmpty(measured: boolean, w: ImprovedWindow): string {
    if (!measured) {
      return w === '90d'
        ? 'Not measured yet: the history does not reach back about 90 days'
        : 'Not measured yet: there is no previous sweep';
    }
    return 'No DNS provider gained templates in this window';
  }
</script>

<Layout current="leaderboards" {manifest}>
  {#await loading}
    <p class="no-data">Loading…</p>
  {:then files}
    {@const dnsProviders = rowsOf(files.dnsProviders, 'dns_providers')}
    {@const providers = entrants(dnsProviders)}
    {@const measured = isMeasured(providers, window_)}

    <section class="panel intro">
      <h2>Leaderboards</h2>
      <Notes notes={notes([files.dnsProviders, files.templates, files.serviceProviders])} />
      <p>
        Who leads Domain Connect adoption in the release of
        <strong>{formatDate(manifest?.generated_at)}</strong>: the top {BOARD_SIZE} of each board, positive
        values only. Ties go to more domains, then by name.
      </p>
    </section>

    <div class="boards">
      <Panel
        id="most-templates"
        title="Most templates supported"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-templates"
      >
        <p class="muted about">
          Templates supported now by each DNS provider. Every deployment of a stack ranks on its
          own.
        </p>
        <Board
          caption="DNS providers by templates supported"
          nameHeader="DNS provider"
          valueHeader="Templates"
          rows={entrantRows(topByTemplates(providers))}
          emptyText="No DNS provider supports a template"
        />
      </Panel>

      <Panel
        id="most-domains"
        title="Most domains reached"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-domains"
      >
        <p class="muted about">
          Share of the scanned domains of each DNS provider supporting at least one template. Every
          deployment of a stack ranks on its own.
        </p>
        <Board
          caption="DNS providers by domains reached"
          nameHeader="DNS provider"
          valueHeader="Share"
          rows={entrantRows(topByDomains(providers), 'share', scan)}
          emptyText="No domains measured for supporting DNS providers"
        />
      </Panel>

      <Panel
        id="most-improved"
        title="Most improved"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-improved"
      >
        <div class="windows" role="group" aria-label="Most improved window">
          {#each ['sweep', '90d'] as const as w (w)}
            <button type="button" aria-pressed={w === window_} onclick={() => (window_ = w)}
              >{WINDOW_LABELS[w]}</button
            >
          {/each}
        </div>
        <p class="muted about">
          Templates each DNS provider gained {window_ === 'sweep'
            ? 'over its latest sweep'
            : 'over about 90 days'}. Every deployment of a stack ranks on its own.
        </p>
        <Board
          caption="DNS providers by templates gained, {WINDOW_LABELS[window_].toLowerCase()}"
          nameHeader="DNS provider"
          valueHeader="Gained"
          rows={entrantRows(mostImproved(providers, window_), 'change')}
          emptyText={improvedEmpty(measured, window_)}
        />
      </Panel>

      <Panel
        id="new-supporting"
        title="New supporting DNS providers"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-new"
      >
        <p class="muted about">
          DNS providers whose first supported template was found in the last {NEW_SUPPORT_DAYS} days,
          newest first; the date is the start of that sweep. Each deployment of a stack is listed.
        </p>
        {#await derived}
          <p class="no-data">Loading…</p>
        {:then leaderboards}
          <NewSupporters rows={newSupporting(leaderboards, dnsProviders, scannerStart())} />
        {:catch}
          <Unavailable />
        {/await}
      </Panel>

      <Panel
        id="template-reach"
        title="Templates with the biggest reach"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-template-reach"
      >
        <p class="muted about">
          Share of the scanned domains behind the DNS providers supporting the template.
        </p>
        <Board
          caption="Templates by domains reached"
          nameHeader="Template"
          valueHeader="Reach"
          rows={reachRows(
            topReach(rowsOf(files.templates, 'service_templates'), templateName),
            'template',
          )}
          emptyText="No reach measured"
        />
      </Panel>

      <Panel
        id="service-provider-reach"
        title="Service providers with the biggest reach"
        context="Leaderboards"
        ready={boardsReady}
        testid="board-service-provider-reach"
      >
        <p class="muted about">
          Share of the scanned domains behind the DNS providers supporting at least one of its
          templates, each counted once.
        </p>
        <Board
          caption="Service providers by domains reached"
          nameHeader="Service provider"
          valueHeader="Reach"
          rows={reachRows(
            topReach(rowsOf(files.serviceProviders, 'service_providers'), serviceProviderName),
            'service_provider',
          )}
          emptyText="No reach measured"
        />
      </Panel>
    </div>
  {:catch error}
    <LoadError {error} />
  {/await}
</Layout>

<style>
  .boards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 var(--spacing-lg);
  }

  @media (max-width: 900px) {
    .boards {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .about {
    font-size: 0.85rem;
    margin: var(--spacing-sm) 0;
  }

  .windows {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
  }

  .windows button {
    font: inherit;
    color: var(--secondary-navy);
    background-color: var(--bg-white);
    cursor: pointer;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--light-blue-gray);
    border-radius: var(--radius-lg);
    font-size: 0.85rem;
  }

  .windows button[aria-pressed='true'] {
    background-color: var(--primary-navy);
    border-color: var(--primary-navy);
    color: var(--bg-white);
  }
</style>
