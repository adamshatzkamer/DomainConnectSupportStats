<script lang="ts">
  import type { Row } from '../data/types';
  import { servedLabel } from '../served';

  interface Props {
    /** A supported pair: `served_version`, `response_kind`, `template_match`. */
    row: Row;
    /** The repository's version, when the row has no `repository_version`. */
    repositoryVersion?: number | null;
  }

  let { row, repositoryVersion = null }: Props = $props();
  const s = $derived(servedLabel(row, repositoryVersion));
</script>

{#if s.text === null}
  <span class="muted" title={s.title}>Not recorded yet</span>
{:else}
  <span title={s.title}>
    {s.base}
    {#if s.match}
      <span class="badge {s.tone ? `badge-${s.tone}` : 'badge-muted'}" title={s.matchTitle}
        >{s.match}</span
      >
    {/if}
  </span>
{/if}

<style>
  .badge {
    white-space: normal;
  }
</style>
