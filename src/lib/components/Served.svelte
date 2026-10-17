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
  <span class={s.tone ? `badge badge-${s.tone}` : undefined} title={s.title}>{s.text}</span>
{/if}

<style>
  span {
    white-space: nowrap;
  }
</style>
