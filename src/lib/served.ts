import type { CellValue, Row } from './data/types';

/**
 * What supporting DNS providers serve (EXPORT_FORMAT.md Glossary "Served template"): the
 * template's latest supported answer per DNS provider, and its counts.
 */

const BADGE_TEXT: Record<string, string> = {
  morphed: 'Morphed',
  outdated: 'Outdated',
};

function explainMatch(match: string, version: number | null, repo: number | null): string {
  return match === 'morphed'
    ? "The full template differs from the repository's: altered by the DNS provider"
    : version === null || repo === null
      ? "The full template's version is below the repository's"
      : `The full template's version (${version}) is below the repository's (${repo})`;
}

export interface ServedLabel {
  /** The served version as is, e.g. `2`; null when none or not recorded yet. */
  version: string | null;
  /** `Morphed` or `Outdated`; null for any other match. */
  badge: string | null;
  /** What the badge means, for its hover text; null without one. */
  badgeTitle: string | null;
  title: string;
}

const str = (v: CellValue | undefined): string | null => (typeof v === 'string' ? v : null);
const num = (v: CellValue | undefined): number | null => (typeof v === 'number' ? v : null);

/**
 * One supported pair's served version and, when morphed or outdated, its match; a version-only
 * answer below the repository version counts as outdated. The hover text
 * gives the raw values. `repositoryVersion` stands in for a row without `repository_version`
 * (template card: the metadata's `version`).
 */
export function servedLabel(row: Row, repositoryVersion: number | null = null): ServedLabel {
  const version = num(row.served_version);
  const kind = str(row.response_kind);
  const match = str(row.template_match);
  const repo = num(row.repository_version) ?? repositoryVersion;
  if (kind === null)
    return { version: null, badge: null, badgeTitle: null, title: 'Not recorded yet' };
  // `template_match` is set for full-template answers only: a version-only answer is compared here.
  const shown = match ?? (version !== null && repo !== null && version < repo ? 'outdated' : null);
  const badge = (shown && BADGE_TEXT[shown]) ?? null;
  const title = [
    `Served version ${version ?? 'none'}`,
    repo === null ? null : `repository version ${repo}`,
    `response ${kind}`,
    match ? `match ${match}` : null,
  ]
    .filter((p) => p !== null)
    .join(', ');
  return {
    version: version === null ? null : String(version),
    badge,
    badgeTitle: badge === null ? null : explainMatch(shown!, version, repo),
    title,
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
