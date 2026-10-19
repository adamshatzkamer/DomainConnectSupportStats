<script lang="ts">
  import { formatExact, formatPct } from '../format';
  import { links } from '../links';
  import type { ServedCount } from '../served';

  interface Props {
    counts: ServedCount[];
    /** What the shares are of, e.g. `of 3 supported templates`. */
    of: string;
  }

  let { counts, of }: Props = $props();
</script>

<section class="panel" data-testid="served">
  <h2>Served templates</h2>
  <dl class="record">
    {#each counts as c (c.key)}
      <dt>{c.label}</dt>
      <dd>
        <span class="count">{formatExact(c.count)}</span>
        {#if c.pct !== null}<span class="muted">({formatPct(c.pct)} {of})</span>{/if}
      </dd>
    {/each}
  </dl>
  <p class="caveat">
    What the latest supported answers carried: a version, the full template, a template altered by
    the DNS provider (morphed) or one older than the repository's (outdated) (<a
      href={links.methodology('52-support-probe')}>methodology 5.2</a
    >).
  </p>
</section>
