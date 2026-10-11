/**
 * Derived data: facts the export has only spread over its cards, collected by
 * `scripts/derive.ts` into files next to the export (`<data>/derived/`). Dependency-free: the
 * script imports it under Node's type stripping.
 */

/** Folder of the derived files, relative to the data base URL. */
export const DERIVED_DIR = 'derived/';
export const LEADERBOARDS_FILE = 'leaderboards.json';

export interface Sweep {
  sweep_id: number;
  started_at: string;
}

export interface FirstSupport extends Sweep {
  dns_provider_id: number;
  /** Templates supported once that sweep had run. */
  supported_templates: number;
}

export interface Leaderboards {
  /** The release's `generated_at`: the site rejects the file for any other release. */
  generated_at: string;
  /** The earliest sweep in any DNS provider card's `support_history`; `null` without one. */
  first_sweep: Sweep | null;
  /**
   * Per DNS provider, its first `support_history` row with `supported_templates` > 0, unless that
   * row is the export's first sweep. Newest first, then by `dns_provider_id`.
   */
  first_support: FirstSupport[];
}

export const STACKS_FILE = 'stacks.json';

/** A stack's template support distribution over its deployments, each as % of every template. */
export interface StackSupport {
  provider_id: string;
  min_templates_pct: number | null;
  median_templates_pct: number | null;
  max_templates_pct: number | null;
}

/** `stacks.json`: one row per row of the export's stacks list, in its order. */
export interface StacksSupport {
  generated_at: string;
  stacks: StackSupport[];
}

type Deployment = Record<string, unknown>;

const count = (row: Deployment, key: string): number =>
  typeof row[key] === 'number' ? (row[key] as number) : 0;

/**
 * Min, median and max of `supported_templates` / `templates` over the deployments with at least one
 * probe answer (supported or not supported); null without such a deployment or templates.
 */
export function templateShares(
  deployments: Deployment[],
  templates: number | null,
): Omit<StackSupport, 'provider_id'> {
  const shares = deployments
    .filter((d) => count(d, 'supported_count') + count(d, 'unsupported_count') > 0)
    .map((d) => (count(d, 'supported_templates') / (templates ?? 0)) * 100)
    .sort((a, b) => a - b);
  if (!templates || !shares.length)
    return { min_templates_pct: null, median_templates_pct: null, max_templates_pct: null };
  const mid = Math.floor(shares.length / 2);
  return {
    min_templates_pct: shares[0]!,
    median_templates_pct: shares.length % 2 ? shares[mid]! : (shares[mid - 1]! + shares[mid]!) / 2,
    max_templates_pct: shares.at(-1)!,
  };
}

export const ECOSYSTEM_FILE = 'ecosystem.json';

/** One full sweep of `overview.json` `ecosystem`, with support weighted by domain share. */
export interface EcosystemReach extends Sweep {
  /**
   * Σ over DNS providers of supported templates × domain share (`domains_pct` / 100) in the sweep's
   * window: the supported templates of the average scanned domain. `null` without a domain-share
   * import.
   */
  templates_per_domain: number | null;
}

/** `ecosystem.json`: one row per row of `overview.json` `ecosystem`, in its order. */
export interface Ecosystem {
  generated_at: string;
  ecosystem: EcosystemReach[];
}
