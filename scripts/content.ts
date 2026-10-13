/**
 * Values for the `{{ key }}` placeholders in `content/*.md`, from the environment variable
 * `CONTENT_VALUES` (a JSON object of strings), so personal data stays out of the repository.
 */

const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

export type ContentValues = Record<string, string>;

/** The values, or `null` when the variable is unset or blank. */
export function parseContentValues(env: string | undefined): ContentValues | null {
  if (!env?.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(env);
  } catch (e) {
    throw new Error(`CONTENT_VALUES is not valid JSON: ${(e as Error).message}`, { cause: e });
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('CONTENT_VALUES must be a JSON object');
  for (const [key, value] of Object.entries(parsed))
    if (typeof value !== 'string') throw new Error(`CONTENT_VALUES: ${key} is not a string`);
  return parsed as ContentValues;
}

/**
 * Replaces each `{{ key }}` with its value. Without values the placeholders stay; with values,
 * a placeholder without one fails.
 */
export function fillContent(text: string, values: ContentValues | null, file: string): string {
  if (!values) return text;
  const missing = new Set<string>();
  const filled = text.replace(PLACEHOLDER, (match, key: string) => {
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    if (value === undefined) missing.add(key);
    return value ?? match;
  });
  if (missing.size)
    throw new Error(`${file}: no value in CONTENT_VALUES for ${[...missing].join(', ')}`);
  return filled;
}
