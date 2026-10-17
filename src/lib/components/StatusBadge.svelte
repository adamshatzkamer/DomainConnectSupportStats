<script lang="ts">
  import type { CellValue } from '../data/types';
  import { statusBadge } from '../dns-providers';

  interface Props {
    /** A `settings_status` or `support_status` value. */
    status: CellValue;
    /** The settings `settings_error_kind`, when known. */
    errorKind?: CellValue;
    /** A muted line under the badge, e.g. the probe counts. */
    detail?: string | null;
  }

  let { status, errorKind = null, detail = null }: Props = $props();
  const badge = $derived(statusBadge(status, errorKind));
</script>

<span class="badge badge-{badge.tone}" title={badge.title}>{badge.label}</span>
{#if detail}<div class="muted detail">{detail}</div>{/if}

<style>
  .badge,
  .detail {
    white-space: nowrap;
  }

  .detail {
    font-size: 0.8rem;
  }

  @media (min-width: 769px) {
    .badge,
    .detail {
      white-space: normal;
    }
  }
</style>
