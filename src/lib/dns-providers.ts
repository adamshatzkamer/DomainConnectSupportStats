import type { CellValue, Row, Table } from './data/types';
import { formatExact } from './format';

/**
 * The DNS providers list (EXPORT_FORMAT.md "dns-providers.json"): stack filter, rows hidden by
 * default, status badges and probe counts.
 */

function num(row: Row | undefined, key: string): number | null {
  const v = row?.[key];
  return typeof v === 'number' ? v : null;
}

/** Never probed: no completed support sweep yet. */
export function isNeverProbed(row: Row): boolean {
  return row.support_status === null;
}

/** Given up, never probed, or no domains in the domain-share import (`null` domains is unknown). */
export function isHiddenByDefault(row: Row): boolean {
  return row.support_status === 'dead' || row.support_status === null || row.domains === 0;
}

export interface DnsProviderList {
  /** The rows to show, in export order. */
  table: Table;
  /** Rows of the stack (or of all) hidden by default. */
  hiddenCount: number;
}

/** The list rows for `?stack=` and the show-all toggle; unknown columns and keys are kept. */
export function dnsProviderList(
  source: Table,
  filters: { stack: string | null; showAll: boolean },
): DnsProviderList {
  const inStack = source.rows.filter(
    (r) => filters.stack === null || r.provider_id === filters.stack,
  );
  const shown = filters.showAll ? inStack : inStack.filter((r) => !isHiddenByDefault(r));
  return {
    table: { ...source, rows: shown },
    hiddenCount: inStack.filter(isHiddenByDefault).length,
  };
}

export type BadgeTone = 'ok' | 'warn' | 'muted';

const STATUS_LABELS: Record<string, [string, BadgeTone]> = {
  ok: ['OK', 'ok'],
  partial: ['Partly failed', 'warn'],
  error: ['Failed', 'warn'],
  failed: ['Failed', 'warn'],
  dead: ['Given up', 'muted'],
};

/**
 * Badge of a `settings_status` or `support_status`, with the settings `settings_error_kind` when
 * known; the hover text carries the raw values.
 */
export function statusBadge(
  status: CellValue,
  errorKind: CellValue = null,
): { label: string; tone: BadgeTone; title: string } {
  if (status === null || status === undefined) {
    return { label: 'Not checked yet', tone: 'muted', title: 'null: no completed run yet' };
  }
  const raw =
    errorKind === null || errorKind === undefined
      ? String(status)
      : `${String(status)} (${String(errorKind)})`;
  const [label, tone] = STATUS_LABELS[errorKind === 'dead' ? 'dead' : String(status)] ?? [
    String(status),
    'muted',
  ];
  return { label, tone, title: `${raw}: latest completed run, may be weeks old` };
}

/** Answered and failed probes of the latest completed sweep; failed left out at 0. */
export function probeCounts(row: Row | undefined): string | null {
  const answered = num(row, 'support_answered');
  if (answered === null) return null;
  const failed = num(row, 'support_failed');
  const text = `${formatExact(answered)} answered`;
  return failed ? `${text}, ${formatExact(failed)} failed` : text;
}
