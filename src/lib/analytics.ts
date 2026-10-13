/**
 * Page views counted by GoatCounter: on when `window.DC_STATS_CONFIG.goatCounter` names the
 * endpoint. The page counts itself once its title is known (`countView`). `count.js` skips
 * localhost; a blocked endpoint leaves the page unchanged.
 */

/** GoatCounter's `count.js`, bundled from `public/`, relative to the page. */
export const GOATCOUNTER_SCRIPT = './goatcounter/count.v5.js';

/** The query parameters naming a card; every other parameter is dropped. */
const CARD_PARAMS: Record<string, readonly string[]> = {
  'dns-provider.html': ['id'],
  'stack.html': ['id'],
  'service-provider.html': ['id'],
  'template.html': ['spid', 'sid'],
};

declare global {
  interface Window {
    goatcounter?: {
      no_onload?: boolean;
      allow_local?: boolean;
      count?: (vars: { path: string; title: string }) => void;
    };
  }
}

/** Resolves once `count.js` has loaded; null when nothing is counted. */
let loaded: Promise<void> | null = null;
let counted = false;

/** The configured endpoint, or `null` when unset or not an https URL. */
export function resolveGoatCounter(runtime: unknown): string | null {
  if (typeof runtime !== 'string') return null;
  try {
    return new URL(runtime).protocol === 'https:' ? runtime : null;
  } catch {
    return null;
  }
}

/** The page file name and its card id, without the site base path: `/stack.html?id=plesk.com`. */
export function countedPath(pathname: string, search: string): string {
  const page = pathname.slice(pathname.lastIndexOf('/') + 1) || 'index.html';
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of CARD_PARAMS[page] ?? []) {
    const value = params.get(name);
    if (value?.trim()) kept.set(name, value);
  }
  const query = kept.toString();
  return `/${page}${query ? `?${query}` : ''}`;
}

export function startAnalytics(): void {
  const endpoint = resolveGoatCounter(window.DC_STATS_CONFIG?.goatCounter);
  if (!endpoint) return;
  window.goatcounter = { ...window.goatcounter, no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = GOATCOUNTER_SCRIPT;
  script.dataset.goatcounter = endpoint;
  loaded = new Promise((resolve) => script.addEventListener('load', () => resolve()));
  document.head.append(script);
}

/** Count this page view once, with `title` or the page's title. */
export function countView(title: string = document.title): void {
  if (!loaded || counted) return;
  counted = true;
  const path = countedPath(window.location.pathname, window.location.search);
  void loaded.then(() => window.goatcounter?.count?.({ path, title }));
}

/** Forget the loaded script and the counted view (tests). */
export function resetAnalytics(): void {
  loaded = null;
  counted = false;
}
