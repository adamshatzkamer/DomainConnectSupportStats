import type { Row } from './data/types';
import { formatPct } from './format';

export interface SupportRange {
  /** Start of the span, 0–100. */
  left: number;
  /** Length of the span, 0–100. */
  width: number;
}

export const MIN_KEY = 'min_supported_templates_pct';
export const MEDIAN_KEY = 'median_supported_templates_pct';
export const MAX_KEY = 'max_supported_templates_pct';

const clamp = (v: number) => Math.min(100, Math.max(0, v));

const pct = (row: Row, key: string): number | null =>
  typeof row[key] === 'number' ? (row[key] as number) : null;

/** A stack's template support distribution (`*_supported_templates_pct`) as bar geometry; null when unknown. */
export function supportRange(row: Row): SupportRange | null {
  const min = pct(row, MIN_KEY);
  const max = pct(row, MAX_KEY);
  if (min === null || max === null) return null;
  const left = clamp(min);
  return { left, width: clamp(max) - left };
}

/** "min – max", or one value when both ends display the same. */
export function supportLabel(row: Row): string {
  const min = formatPct(pct(row, MIN_KEY));
  const max = formatPct(pct(row, MAX_KEY));
  return min === max ? min : `${min} – ${max}`;
}
