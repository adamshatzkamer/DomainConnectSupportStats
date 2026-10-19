<script lang="ts">
  import Layout from '../lib/components/Layout.svelte';
  import MarkdownDoc from '../lib/components/MarkdownDoc.svelte';
  import LoadError from '../lib/components/LoadError.svelte';
  import { defaultClient } from '../lib/data/load';
  import type { Manifest } from '../lib/data/types';
  import { formatCount, formatPct, UNKNOWN } from '../lib/format';

  const client = defaultClient();
  let manifest = $state<Manifest | null>(null);
  const loading = client.manifest().then((m) => (manifest = m));

  function sampling(percent: number | null | undefined): string {
    if (percent === null || percent === undefined) return UNKNOWN;
    return percent === 100 ? 'census (every domain)' : `random sample of ${formatPct(percent)}`;
  }
</script>

<Layout current="methodology" {manifest} annotated={false}>
  <section class="panel" data-testid="site-part">
    <h2>Methodology</h2>
    <p>
      The figures come from the export of the Domain Connect Scanner. Its methodology follows below,
      as published with the export: the domains scanned, how DNS providers are identified, how
      support is probed, and the limits of the figures.
    </p>

    <h3>This release</h3>
    {#await loading}
      <p class="muted">Loading…</p>
    {:then m}
      {@const share = m.share_import}
      {#if share}
        <dl class="record" data-testid="release-facts">
          <dt>Zones</dt>
          <dd>{share.zones ? share.zones.map((z) => `.${z}`).join(', ') : UNKNOWN}</dd>
          <dt>Domains in the zones</dt>
          <dd>{formatCount(share.zone_domains)}</dd>
          <dt>Sampling</dt>
          <dd>{sampling(share.sample_percent)}</dd>
          <dt>Scanned domains</dt>
          <dd>{formatCount(share.scanned_domains)}</dd>
        </dl>
        <p>
          Every percentage of domains is a share of the scanned domains; for a sample, an estimate
          for the zones (<a href="#22-census-and-probability-sample">2.2</a>).
        </p>
      {:else}
        <p data-testid="release-facts">
          The release has no domain-share import: domain and reach figures are unknown.
        </p>
      {/if}
    {:catch error}
      <LoadError {error} />
    {/await}

    <h3>Not covered</h3>
    <ul>
      <li>
        Zones other than the scanned ones, including country-code top-level domains, and subdomains
        (<a href="#8-limitations">8</a>).
      </li>
      <li>
        DNS providers below the minimum size: their domains count only in the total of Domain
        Connect domains (<a href="#44-minimum-size">4.4</a>).
      </li>
      <li>Individual domains: the export holds no per-domain data.</li>
    </ul>

    <h3>Corrections</h3>
    <p>
      A figure looks wrong?
      <a
        href="https://github.com/pawel-kow/DomainConnectSupportStats/issues/new"
        target="_blank"
        rel="noopener">Report a problem</a
      >
      with the page link and what you observed. A DNS provider's card describes its latest completed runs
      (<a href="#6-status-of-dns-providers-and-handling-of-failures">6</a>); the next run that
      covers it updates the card.
    </p>
  </section>

  <!-- The release facts change the height above the document. -->
  <MarkdownDoc ready={loading.catch(() => null)} />
</Layout>

<style>
  ul {
    padding-left: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
  }

  h3 {
    margin-top: var(--spacing-lg);
  }

  p,
  dl {
    margin-bottom: var(--spacing-md);
  }
</style>
