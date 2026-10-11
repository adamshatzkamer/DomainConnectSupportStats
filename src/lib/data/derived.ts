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
