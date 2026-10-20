<script lang="ts">
  import type { Row } from '../data/types';
  import { UNKNOWN } from '../format';
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

<span title={s.title}>
  {s.version ?? UNKNOWN}
  {#if s.badge}
    <span class="badge badge-warn" title={s.badgeTitle}>{s.badge}</span>
  {/if}
</span>

<style>
  .badge {
    white-space: normal;
  }

  @media (max-width: 480px) {
    .badge {
      display: none;
    }
  }
</style>
