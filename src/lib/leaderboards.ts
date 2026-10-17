import type { Leaderboards } from './data/derived';
import type { Row } from './data/types';
import { domainsTitle, type Scan } from './domains';
import { formatCount, formatExact, formatPct, parseTimestamp } from './format';
import { links } from './links';

/**
 * Leaderboards (REQUIREMENTS.md F-4): positive rankings of the list files and the derived
 * `leaderboards.json`, one row per DNS provider.
 */

export const BOARD_SIZE = 10;
export const NEW_SUPPORT_DAYS = 30;

/** Most improved window: since the previous sweep, or over about 90 days. */
export type ImprovedWindow = 'sweep' | '90d';

const CHANGE_KEY: Record<ImprovedWindow, string> = {
  sweep: 'supported_templates_change',
  '90d': 'supported_templates_change_90d',
};

export const WINDOW_LABELS: Record<ImprovedWindow, string> = {
  sweep: 'Since the previous sweep',
  '90d': 'Over about 90 days',
};

/** The `?window=` parameter: `90d`, else since the previous sweep. */
export function improvedWindow(search: string): ImprovedWindow {
  return new URLSearchParams(search).get('window') === '90d' ? '90d' : 'sweep';
}

/** One row of a DNS provider board. */
export interface Entrant {
  name: string;
  /** Second line: its API host. */
  detail: string | null;
  href: string;
  /** Its row of `dns-providers.json`. */
  row: Row;
  /** Its domains when it supports at least one template, else 0; `null` when unknown. */
  reachedDomains: number | null;
}

export interface Ranked<T> {
  rank: number;
  value: number;
  entry: T;
}

function num(row: Row | undefined, key: string): number | null {
  const v = row?.[key];
  return typeof v === 'number' ? v : null;
}

function text(row: Row | undefined, key: string): string | null {
  const v = row?.[key];
  return typeof v === 'string' ? v : null;
}

function reachedDomains(row: Row): number | null {
  const supported = num(row, 'supported_count');
  if (supported === null) return null;
  return supported > 0 ? num(row, 'domains') : 0;
}

/** One row per DNS provider: each deployment of a stack ranks on its own. */
export function entrants(dnsProviders: Row[]): Entrant[] {
  return dnsProviders.flatMap((row): Entrant[] => {
    const id = num(row, 'dns_provider_id');
    if (id === null) return [];
    return [
      {
        name: text(row, 'name') ?? '?',
        detail: text(row, 'api_host'),
        href: links.dnsProvider(id),
        row,
        reachedDomains: reachedDomains(row),
      },
    ];
  });
}

const byName = new Intl.Collator('en', { sensitivity: 'base' });

/** Top `size` by a positive value; ties by domains (unknown last), then name ignoring case. */
function rank<T>(
  items: T[],
  value: (item: T) => number | null,
  domains: (item: T) => number | null,
  name: (item: T) => string,
  size: number,
): Ranked<T>[] {
  return items
    .map((entry) => ({ entry, value: value(entry) }))
    .filter((r): r is { entry: T; value: number } => r.value !== null && r.value > 0)
    .sort(
      (a, b) =>
        b.value - a.value ||
        (domains(b.entry) ?? -1) - (domains(a.entry) ?? -1) ||
        byName.compare(name(a.entry), name(b.entry)),
    )
    .slice(0, size)
    .map((r, i) => ({ rank: i + 1, ...r }));
}

const entrantDomains = (e: Entrant) => num(e.row, 'domains');
const entrantName = (e: Entrant) => e.name;

export function topByTemplates(list: Entrant[], size = BOARD_SIZE): Ranked<Entrant>[] {
  return rank(list, (e) => num(e.row, 'supported_count'), entrantDomains, entrantName, size);
}

export function topByDomains(list: Entrant[], size = BOARD_SIZE): Ranked<Entrant>[] {
  return rank(
    list,
    (e) => e.reachedDomains,
    (e) => e.reachedDomains,
    entrantName,
    size,
  );
}

export function mostImproved(
  list: Entrant[],
  window: ImprovedWindow,
  size = BOARD_SIZE,
): Ranked<Entrant>[] {
  return rank(list, (e) => num(e.row, CHANGE_KEY[window]), entrantDomains, entrantName, size);
}

/** Rows of `templates.json` or `service-providers.json` by `reach_domains`; ties by name. */
export function topReach(
  rows: Row[],
  name: (row: Row) => string,
  size = BOARD_SIZE,
): Ranked<Row>[] {
  return rank(
    rows,
    (r) => num(r, 'reach_domains'),
    () => null,
    name,
    size,
  );
}

export interface NewSupporter {
  dnsProviderId: number;
  name: string;
  apiHost: string | null;
  href: string;
  /** When the sweep that found its first support started. */
  since: string;
  /** Templates it supports now. */
  supportedTemplates: number | null;
}

const DAY_MS = 86_400_000;

/**
 * DNS providers whose first support was found within `days` before the release, newest first.
 * Left out: a first support before the scanner start (it was already there).
 */
export function newSupporting(
  derived: Leaderboards,
  dnsProviders: Row[],
  scannerStart: Date | null,
  days = NEW_SUPPORT_DAYS,
): NewSupporter[] {
  const generated = parseTimestamp(derived.generated_at);
  if (!generated) return [];
  const from = generated.getTime() - days * DAY_MS;
  const rows = new Map(dnsProviders.map((r) => [num(r, 'dns_provider_id'), r]));
  return derived.first_support.flatMap((f): NewSupporter[] => {
    const at = parseTimestamp(f.started_at)?.getTime();
    const row = rows.get(f.dns_provider_id);
    if (at === undefined || at < from || at > generated.getTime() || !row) return [];
    if (scannerStart && at < scannerStart.getTime()) return [];
    return [
      {
        dnsProviderId: f.dns_provider_id,
        name: text(row, 'name') ?? '?',
        apiHost: text(row, 'api_host'),
        href: links.dnsProvider(f.dns_provider_id),
        since: f.started_at,
        supportedTemplates: num(row, 'supported_count'),
      },
    ];
  });
}

/** A board's table row. */
export interface BoardRow {
  rank: number;
  name: string;
  href: string;
  /** Second line under the name. */
  detail: string | null;
  value: string;
  /** Hover text of the value: the exact count when shortened. */
  title?: string;
}

/**
 * Display rows of a DNS provider board: a count, a signed change, or domains as their share of the
 * scanned domains (the count and `scan` in the hover text).
 */
export function entrantRows(
  ranked: Ranked<Entrant>[],
  value: 'count' | 'change' | 'share' = 'count',
  scan: Scan | null = null,
): BoardRow[] {
  return ranked.map(({ rank, value: v, entry }) => ({
    rank,
    name: entry.name,
    href: entry.href,
    detail: entry.detail,
    ...(value === 'share'
      ? { value: formatPct(num(entry.row, 'domains_pct')), title: domainsTitle(v, scan) }
      : {
          value: value === 'change' ? `+${formatExact(v)}` : formatCount(v),
          title: formatExact(v),
        }),
  }));
}

/** Whether any entrant has a known change in the window: an empty board then means no gain. */
export function isMeasured(list: Entrant[], window: ImprovedWindow): boolean {
  return list.some((e) => num(e.row, CHANGE_KEY[window]) !== null);
}
