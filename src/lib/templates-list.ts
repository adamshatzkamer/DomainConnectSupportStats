import type { Row, Table } from './data/types';
import { ofSupporting } from './supporting';

/**
 * The templates list (EXPORT_FORMAT.md "templates.json"): service provider filter and
 * never-probed templates hidden by default. Its `provider_id` is the service provider's id.
 */

/** No probe combination on record yet: every count is 0, every share `null`. */
export function isNeverProbed(row: Row): boolean {
  return row.total === 0;
}

export interface TemplateList {
  /** The rows to show, in export order. */
  table: Table;
  /** Rows of the service provider (or of all) hidden by default. */
  hiddenCount: number;
}

/** The list rows for `?spid=` and the show-all toggle; unknown columns and keys are kept. */
export function templateList(
  source: Table,
  filters: { spid: string | null; showAll: boolean },
): TemplateList {
  const ofProvider = source.rows.filter(
    (r) => filters.spid === null || r.provider_id === filters.spid,
  );
  return {
    table: {
      ...source,
      rows: filters.showAll ? ofProvider : ofProvider.filter((r) => !isNeverProbed(r)),
    },
    hiddenCount: ofProvider.filter(isNeverProbed).length,
  };
}

/**
 * The list with each template's supporting DNS providers (`supporting_providers`) and the rest of
 * the `total` supporting DNS providers, each also as a share of `total`. Unknown when the row
 * lacks the count, `total` is unknown, or the rest would be negative.
 */
export function withSupport(source: Table, total: number | null): Table {
  return {
    ...source,
    columns: [
      ...source.columns,
      { key: 'supporting_dns_providers', header: 'SUPPORTED' },
      { key: 'not_supporting_dns_providers', header: 'NOT SUPP.' },
    ],
    rows: source.rows.map((row) => {
      const n = typeof row.supporting_providers === 'number' ? row.supporting_providers : null;
      const rest = n === null || total === null || n > total ? null : total - n;
      return {
        ...row,
        supporting_dns_providers: n,
        supporting_dns_providers_pct: ofSupporting(n, total),
        not_supporting_dns_providers: rest,
        not_supporting_dns_providers_pct: ofSupporting(rest, total),
      };
    }),
  };
}
