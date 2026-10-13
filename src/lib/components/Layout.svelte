<script lang="ts">
  import type { Snippet } from 'svelte';
  import { shareBaseUrl } from '../data/config';
  import { defaultClient, type ExportClient } from '../data/load';
  import { ecosystemSweep, importCompletedAt } from '../annotation';
  import type { Manifest } from '../data/types';
  import { formatCount, formatDateTime, UNKNOWN } from '../format';
  import { links, NAV } from '../links';
  import { defaultRegistryClient, type RegistryClient } from '../registry/load';
  import { absoluteOgImage } from '../share';

  interface Props {
    /** Page name (file name without `.html`), to mark the current navigation entry. */
    current: string;
    /** The release's manifest once loaded; the annotation shows its facts on every page. */
    manifest?: Manifest | null;
    /**
     * `started_at` of the newest sweep the page's data reflects (`annotation.ts`). Without it:
     * the overview's last `ecosystem` row.
     */
    sweep?: Promise<string | null>;
    /** False leaves the data annotation out (the methodology page). */
    annotated?: boolean;
    /** Reads the import's completion time and the default sweep from `overview.json`. */
    client?: ExportClient;
    /** Reads the repository and commit of the bundled DNS provider registry for the footer. */
    registry?: RegistryClient;
    children: Snippet;
  }

  let {
    current,
    manifest = null,
    sweep,
    annotated = true,
    client = defaultClient(),
    registry = defaultRegistryClient(),
    children,
  }: Props = $props();
  const registrySource = $derived(registry.source());
  absoluteOgImage(document, location.href, shareBaseUrl());
  const share = $derived(manifest?.share_import ?? null);

  const overview = $derived(
    manifest && annotated ? client.file('overview').catch(() => null) : Promise.resolve(null),
  );
  /** The import's `completed_at`; null when unknown. */
  const completedAt = $derived(
    overview.then((f) => (f && share ? importCompletedAt(f, share.import_id) : null)),
  );
  const sweptAt = $derived(
    (sweep ?? overview.then((f) => (f ? ecosystemSweep(f) : null))).catch(() => null),
  );
  const version = `v${__APP_VERSION__}`;
</script>

<header class="site-header">
  <div class="container">
    <div class="header-content">
      <a href="https://www.domainconnect.org/">
        <img src="./assets/DomainConnectBlackSmall.png" alt="Domain Connect" class="logo" />
      </a>
      <h1>Domain Connect Support</h1>
    </div>
    <p class="subtitle">Statistics Dashboard</p>
    <nav aria-label="Main">
      <ul>
        {#each NAV as item (item.page)}
          <li>
            <a href={item.href} aria-current={item.page === current ? 'page' : undefined}>
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</header>

<main class="container">
  {@render children()}

  {#if annotated}
    <p class="annotation" aria-label="Data release" data-testid="data-annotation">
      {#if manifest}
        Data generated <time data-testid="generated-at"
          >{formatDateTime(manifest.generated_at)}</time
        >
        · Domain figures:
        <span data-testid="share-import"
          >{#if share}scan completed {#await completedAt}…{:then at}<time>{formatDateTime(at)}</time
              >{/await}
            ({formatCount(share.scanned_domains)} domains scanned){:else}no domain-share import{/if}</span
        >
        · Support figures:
        <span data-testid="support-sweep"
          >{#await sweptAt}…{:then at}{#if at}sweep started <time>{formatDateTime(at)}</time
              >{:else}{UNKNOWN}{/if}{/await}</span
        >
        · <a href={links.methodology()}>Methodology</a>
      {:else}
        Loading data release…
      {/if}
    </p>
  {/if}
</main>

<footer class="site-footer">
  <div class="container">
    <p>
      &copy; {new Date().getFullYear()} Domain Connect. Visit
      <a href="https://www.domainconnect.org/" target="_blank" rel="noopener">domainconnect.org</a>
    </p>
    <p>
      <a href={links.methodology()} data-testid="methodology-link">Methodology</a>
      ·
      <a href={links.privacy()} data-testid="privacy-link">Privacy</a>
      ·
      <a href={links.imprint()} data-testid="imprint-link">Imprint</a>
      ·
      <a href="https://stats.domainconnect.org/" target="_blank" rel="noopener"
        >Templates statistics</a
      >
      ·
      <a
        href="https://github.com/pawel-kow/DomainConnectSupportStats"
        target="_blank"
        rel="noopener">View on GitHub</a
      >
      ·
      <a
        href="https://github.com/pawel-kow/DomainConnectSupportStats/releases/tag/{version}"
        target="_blank"
        rel="noopener">{version}</a
      >
      {#await registrySource then source}
        {#if source}
          ·
          <a
            href="https://github.com/{source.repository}/tree/{source.commit}"
            target="_blank"
            rel="noopener"
            data-testid="registry-commit">Registry {source.commit.slice(0, 7)}</a
          >
        {/if}
      {/await}
    </p>
  </div>
</footer>

<style>
  .site-header {
    background-color: var(--bg-white);
    padding: var(--spacing-lg) 0 0;
    box-shadow: 0 2px 8px var(--shadow-light);
    margin-bottom: var(--spacing-xl);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
  }

  .logo {
    height: 40px;
    width: auto;
  }

  h1 {
    margin-bottom: 0;
    color: var(--primary-navy);
  }

  .subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    margin-left: 56px;
  }

  nav ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs) var(--spacing-md);
    list-style: none;
    margin-top: var(--spacing-md);
  }

  nav a {
    display: inline-block;
    padding: var(--spacing-xs) 0;
    color: var(--secondary-navy);
    font-weight: var(--font-weight-semibold);
    border-bottom: 3px solid transparent;
  }

  nav a:hover {
    color: var(--accent-cyan);
    text-decoration: none;
  }

  nav a[aria-current='page'] {
    border-bottom-color: var(--accent-cyan);
    color: var(--primary-navy);
  }

  .annotation {
    margin-top: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: 0.8125rem;
  }

  .annotation time {
    white-space: nowrap;
  }

  .site-footer {
    background-color: var(--primary-navy);
    color: var(--bg-white);
    padding: var(--spacing-lg) 0;
    margin-top: var(--spacing-xl);
    text-align: center;
  }

  .site-footer a {
    color: var(--accent-cyan);
  }

  .site-footer a:hover {
    color: var(--light-blue-gray);
  }

  .site-footer p {
    margin-bottom: var(--spacing-xs);
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      text-align: center;
    }

    .subtitle {
      margin-left: 0;
      text-align: center;
    }

    nav ul {
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .site-header {
      padding-top: var(--spacing-md);
    }

    .logo {
      height: 32px;
    }
  }
</style>
