import type { CellValue, Column, Row, Table } from './data/types';

/**
 * The template card (EXPORT_FORMAT.md "templates/…"): its records, whose columns vary per
 * template, and the history caveat.
 */

/** Key of the derived column holding every record field but type and host. */
export const RECORD_DETAILS_KEY = 'record_details';

const LEAD_KEYS = ['type', 'host'];

/** Fields with their own column on wide screens, in the details at phone width. */
export const OWN_COLUMN_KEYS = ['groupId', 'ttl', 'essential'];

/** A record value as written in the template file: numbers without separators. */
export function recordValue(value: CellValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? value.join(', ') : String(value);
}

export interface RecordDetail {
  key: string;
  value: string;
  /** Shown in its own column on wide screens. */
  ownColumn: boolean;
}

/** The record's declared fields other than type and host, in column order; unknown ones left out. */
export function recordDetails(columns: Column[], row: Row): RecordDetail[] {
  return columns
    .filter((c) => !LEAD_KEYS.includes(c.key))
    .flatMap((c) => {
      const value = recordValue(row[c.key]);
      return value === null
        ? []
        : [{ key: c.key, value, ownColumn: OWN_COLUMN_KEYS.includes(c.key) }];
    });
}

/**
 * The records as type, host, the declared ones of `OWN_COLUMN_KEYS` and one details column, so a
 * template's varying fields fit any screen. Rows keep their own fields for rendering; the details
 * column holds their text for sort and filter.
 */
export function recordsTable(source: Table): Table {
  const byKey = (keys: string[]) => keys.flatMap((k) => source.columns.filter((c) => c.key === k));
  return {
    title: source.title,
    columns: [
      ...byKey(LEAD_KEYS),
      ...byKey(OWN_COLUMN_KEYS),
      { key: RECORD_DETAILS_KEY, header: 'Details' },
    ],
    rows: source.rows.map((row) => ({
      ...row,
      [RECORD_DETAILS_KEY]: recordDetails(source.columns, row)
        .map((d) => `${d.key}: ${d.value}`)
        .join('\n'),
    })),
    footer: null,
  };
}

/**
 * Whether the latest history point differs from the current supporter count: history replays
 * recorded changes, so a provider whose latest probe failed still counts there (EXPORT_FORMAT.md
 * "Caveats").
 */
export function historyDiffers(history: Row[], supporters: number): boolean {
  const latest = history.at(-1)?.supporting_providers;
  return typeof latest === 'number' && latest !== supporters;
}

/** A card table's title without its `<service_provider_id>/<service_id> - ` prefix. */
export function tableTitle(title: string, serviceProviderId: string, serviceId: string): string {
  const prefix = `${serviceProviderId}/${serviceId} - `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}
