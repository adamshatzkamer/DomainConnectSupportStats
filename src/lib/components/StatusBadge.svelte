<script lang="ts">
  import type { CellValue } from '../data/types';
  import { statusBadge } from '../dns-providers';

  interface Props {
    /** A `settings_status` or `support_status` value. */
    status: CellValue;
    /** The settings `settings_error_kind`, when known. */
    errorKind?: CellValue;
  }

  let { status, errorKind = null }: Props = $props();
  const badge = $derived(statusBadge(status, errorKind));
</script>

<span class="badge badge-{badge.tone}" title={badge.title}>{badge.label}</span>

<style>
  .badge {
    white-space: nowrap;
  }

  @media (min-width: 769px) {
    .badge {
      white-space: normal;
    }
  }
</style>
