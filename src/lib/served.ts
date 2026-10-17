import type { CellValue, Row } from './data/types';

/**
 * What supporting DNS providers serve (EXPORT_FORMAT.md Glossary "Served template"): the
 * template's latest supported answer per DNS provider, and its counts.
 */

const KIND_TEXT: Record<string, string> = {
  empty: 'empty answer',
  version: 'version only',
  template: 'full',
};

const MATCH_TEXT: Record<string, string> = {
  match: 'matches',
  morphed: 'morphed',
  outdated: 'outdated',
};

function explainMatch(match: string, version: number | null, repo: number | null): string {
  switch (match) {
    case 'match':
      return "The full template equals the repository's (key order and whitespace ignored)";
    case 'morphed':
      return "The full template differs from the repository's: altered by the DNS provider";
    case 'outdated':
      return version === null || repo === null
        ? "The full template's version is below the repository's"
        : `The full template's version (${version}) is below the repository's (${repo})`;
    default:
      return match;
  }
}

export interface ServedLabel {
  /** e.g. `v2 · full, morphed`; null when not recorded yet. */
  text: string | null;
  /** The text without the match, e.g. `v2 · full`. */
  base: string | null;
  /** The match in words, e.g. `morphed`; null without one. */
  match: string | null;
  /** What the match means, for its hover text; null without one. */
  matchTitle: string | null;
  title: string;
  tone: 'ok' | 'warn' | null;
}

const str = (v: CellValue | undefined): string | null => (typeof v === 'string' ? v : null);
const num = (v: CellValue | undefined): number | null => (typeof v === 'number' ? v : null);

/**
 * One supported pair's served version, response kind and match. `repositoryVersion` stands in
 * for a row without `repository_version` (template card: the metadata's `version`).
 */
export function servedLabel(row: Row, repositoryVersion: number | null = null): ServedLabel {
  const version = num(row.served_version);
  const kind = str(row.response_kind);
  const match = str(row.template_match);
  const repo = num(row.repository_version) ?? repositoryVersion;
  if (kind === null)
    return {
      text: null,
      base: null,
      match: null,
      matchTitle: null,
      title: 'Not recorded yet',
      tone: null,
    };
  const kindText = KIND_TEXT[kind] ?? kind;
  const base = version === null ? kindText : `v${version} · ${kindText}`;
  const matchText = match === null ? null : (MATCH_TEXT[match] ?? match);
  const title = [
    `Served version ${version ?? 'none'}`,
    repo === null ? null : `repository version ${repo}`,
    `response ${kind}`,
    match ? `match ${match}` : null,
  ]
    .filter((p) => p !== null)
    .join(', ');
  return {
    text: matchText === null ? base : `${base}, ${matchText}`,
    base,
    match: matchText,
    matchTitle: match === null ? null : explainMatch(match, version, repo),
    title,
    tone: match === 'match' ? 'ok' : match === 'morphed' || match === 'outdated' ? 'warn' : null,
  };
}

export interface ServedCount {
  key: string;
  label: string;
  count: number | null;
  /** `count` as a percentage of the denominator; null when either is unknown or it is 0. */
  pct: number | null;
}

function counts(row: Row | undefined, keys: [string, string][], total: number | null) {
  return keys.map(([key, label]): ServedCount => {
    const count = num(row?.[key]);
    return { key, label, count, pct: count === null || !total ? null : (count / total) * 100 };
  });
}

/** A DNS provider's or stack's served counts, each of `total` supported (DNS provider, template) pairs. */
export function servedCounts(row: Row | undefined, total: number | null): ServedCount[] {
  return counts(
    row,
    [
      ['with_version_count', 'With version'],
      ['full_template_count', 'Full template'],
      ['morphed_count', 'Morphed'],
      ['outdated_count', 'Outdated'],
    ],
    total,
  );
}

/** A template card's `served` record, each of its supporters. */
export function templateServedCounts(served: Row | undefined): ServedCount[] {
  return counts(
    served,
    [
      ['with_version_count', 'With version'],
      ['current_version_count', 'Current version'],
      ['full_template_count', 'Full template'],
      ['morphed_count', 'Morphed'],
      ['outdated_count', 'Outdated'],
    ],
    num(served?.supporters),
  );
}

/** Supported templates summed over a stack's deployments: the denominator of its served counts; null when one is unknown. */
export function supportedPairs(deployments: Row[]): number | null {
  return deployments.reduce<number | null>((sum, r) => {
    const n = num(r.supported_count);
    return sum === null || n === null ? null : sum + n;
  }, 0);
}
