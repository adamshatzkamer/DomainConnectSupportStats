/**
 * Page views counted by GoatCounter: on when `window.DC_STATS_CONFIG.goatCounter` names the
 * endpoint. `count.js` skips localhost; a blocked script leaves the page unchanged.
 */

export const GOATCOUNTER_SCRIPT = 'https://gc.zgo.at/count.js';

/** The query parameters naming a card; every other parameter is dropped. */
const CARD_PARAMS: Record<string, readonly string[]> = {
  'dns-provider.html': ['id'],
  'stack.html': ['id'],
  'service-provider.html': ['id'],
  'template.html': ['spid', 'sid'],
};

declare global {
  interface Window {
    goatcounter?: { path?: string };
  }
}

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
  window.goatcounter = {
    ...window.goatcounter,
    path: countedPath(window.location.pathname, window.location.search),
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = GOATCOUNTER_SCRIPT;
  script.dataset.goatcounter = endpoint;
  document.head.append(script);
}
