import type { CellValue, Column, Row, Table } from './data/types';

/**
 * The DNS providers list (EXPORT_FORMAT.md "dns-providers.json"): stack filter, rows hidden by
 * default, shares of the template answers, and status badges.
 */

/** Keys of the template answers besides `supported_templates`, and of the derived shares. */
export const UNSUPPORTED_KEY = 'unsupported_templates';
export const UNDETERMINED_KEY = 'undetermined_templates';
export const SUPPORTED_PCT_KEY = 'supported_templates_pct';
export const UNSUPPORTED_PCT_KEY = 'unsupported_templates_pct';
export const UNDETERMINED_PCT_KEY = 'undetermined_templates_pct';

function num(row: Row | undefined, key: string): number | null {
  const v = row?.[key];
  return typeof v === 'number' ? v : null;
}

/** Never probed: no support probe attempted yet. */
export function isNeverProbed(row: Row): boolean {
  return row.support_status === null;
}

export interface TemplateSupport {
  supportedPct: number | null;
  unsupportedPct: number | null;
  undeterminedPct: number | null;
}

const ANSWER_KEYS = ['supported_templates', UNSUPPORTED_KEY, UNDETERMINED_KEY];

/** Supported, not supported and not yet determined templates together: every template. */
export function templateTotal(row: Row | undefined): number | null {
  return ANSWER_KEYS.map((k) => num(row, k)).reduce<number | null>(
    (sum, c) => (sum === null || c === null ? null : sum + c),
    0,
  );
}

/** Each template answer of a row as a share of every template; unknown when a count is, or none. */
export function templateSupport(row: Row | undefined): TemplateSupport {
  const total = templateTotal(row);
  const pct = (key: string) => {
    const c = num(row, key);
    return c === null || !total ? null : (c / total) * 100;
  };
  return {
    supportedPct: pct('supported_templates'),
    unsupportedPct: pct(UNSUPPORTED_KEY),
    undeterminedPct: pct(UNDETERMINED_KEY),
  };
}

/** A row with the shares of its template answers. */
export function withTemplateSupport(row: Row): Row {
  const t = templateSupport(row);
  return {
    ...row,
    [SUPPORTED_PCT_KEY]: t.supportedPct,
    [UNSUPPORTED_PCT_KEY]: t.unsupportedPct,
    [UNDETERMINED_PCT_KEY]: t.undeterminedPct,
  };
}

const ANSWER_COLUMNS: [key: string, header: string, pctKey: string, pctHeader: string][] = [
  ['supported_templates', 'SUPPORTED', SUPPORTED_PCT_KEY, 'SUPPORTED %'],
  [UNSUPPORTED_KEY, 'NOT SUPP.', UNSUPPORTED_PCT_KEY, 'NOT SUPP. %'],
  [UNDETERMINED_KEY, 'UNDETERMINED', UNDETERMINED_PCT_KEY, 'UNDETERMINED %'],
];

/** The columns with the template answers renamed, each followed by its share. */
export function withTemplateSupportColumns(columns: Column[]): Column[] {
  return columns.flatMap((c) => {
    const a = ANSWER_COLUMNS.find(([key]) => key === c.key);
    return a
      ? [
          { ...c, header: a[1] },
          { key: a[2], header: a[3] },
        ]
      : [c];
  });
}

/** Given up, never probed, or no domains in the domain-share import (`null` domains is unknown). */
export function isHiddenByDefault(row: Row): boolean {
  return (
    row.settings_status === 'dead' ||
    row.support_status === 'dead' ||
    row.support_status === null ||
    row.domains === 0
  );
}

export interface DnsProviderList {
  /** The rows to show, in export order, with the derived columns. */
  table: Table;
  /** Rows of the stack (or of all) hidden by default. */
  hiddenCount: number;
}

/**
 * The list rows for `?stack=` and the show-all toggle, with the shares of the template answers;
 * unknown columns and keys are kept.
 */
export function dnsProviderList(
  source: Table,
  filters: { stack: string | null; showAll: boolean },
): DnsProviderList {
  const inStack = source.rows.filter(
    (r) => filters.stack === null || r.provider_id === filters.stack,
  );
  const shown = filters.showAll ? inStack : inStack.filter((r) => !isHiddenByDefault(r));
  return {
    table: {
      ...source,
      columns: withTemplateSupportColumns(source.columns),
      rows: shown.map(withTemplateSupport),
    },
    hiddenCount: inStack.filter(isHiddenByDefault).length,
  };
}

export type BadgeTone = 'ok' | 'warn' | 'muted';

const STATUS_LABELS: Record<string, [string, BadgeTone]> = {
  ok: ['OK', 'ok'],
  http_error: ['HTTP error', 'warn'],
  error: ['HTTP error', 'warn'],
  connection_error: ['Connection error', 'warn'],
  dead: ['Given up', 'muted'],
};

/** Badge of a `settings_status` or `support_status`; the hover text carries the raw value. */
export function statusBadge(status: CellValue): { label: string; tone: BadgeTone; title: string } {
  if (status === null || status === undefined) {
    return { label: 'Not checked yet', tone: 'muted', title: 'null: no attempt yet' };
  }
  const raw = String(status);
  const [label, tone] = STATUS_LABELS[raw] ?? [raw, 'muted'];
  return { label, tone, title: `${raw}: last attempt, may be days old` };
}
