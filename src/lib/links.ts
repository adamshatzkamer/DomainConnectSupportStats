/**
 * Page URLs. Query parameters carry the raw ids (the browser URL-encodes them), never the encoded
 * file segment, so every view is a plain shareable link (EXPORT_FORMAT.md "Pages").
 */

function page(
  name: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === true) query.set(key, '1');
    else if (value !== null && value !== undefined && value !== '' && value !== false)
      query.set(key, String(value));
  }
  const qs = query.toString();
  return `./${name}.html${qs ? '?' + qs : ''}`;
}

export const links = {
  overview: () => page('index'),
  dnsProviders: (filters: { stack?: string | null; q?: string | null; all?: boolean } = {}) =>
    page('dns-providers', filters),
  stacks: () => page('stacks'),
  serviceProviders: (filters: { q?: string | null } = {}) => page('service-providers', filters),
  templates: (filters: { spid?: string | null; q?: string | null; all?: boolean } = {}) =>
    page('templates', filters),
  leaderboards: (filters: { window?: string | null } = {}) => page('leaderboards', filters),
  dnsProvider: (dnsProviderId: number) => page('dns-provider', { id: dnsProviderId }),
  stack: (providerId: string) => page('stack', { id: providerId }),
  serviceProvider: (serviceProviderId: string) =>
    page('service-provider', { id: serviceProviderId }),
  template: (serviceProviderId: string, serviceId: string) =>
    page('template', { spid: serviceProviderId, sid: serviceId }),
  /** A section of the methodology by its heading anchor (GitHub style, `8-limitations`). */
  methodology: (section?: string) => page('methodology') + (section ? `#${section}` : ''),
  privacy: () => page('privacy'),
  imprint: () => page('imprint'),
};

/** Anchor of the onboarding contacts in a card's contact block. */
export const ONBOARDING_CONTACTS = 'onboarding-contacts';

/** Top navigation: the landing page, the four lists and the leaderboards. */
export const NAV = [
  { page: 'index', label: 'Overview', href: links.overview() },
  { page: 'dns-providers', label: 'DNS providers', href: links.dnsProviders() },
  { page: 'stacks', label: 'Stacks', href: links.stacks() },
  { page: 'service-providers', label: 'Service providers', href: links.serviceProviders() },
  { page: 'templates', label: 'Templates', href: links.templates() },
  { page: 'leaderboards', label: 'Leaderboards', href: links.leaderboards() },
] as const;

/**
 * A URL from the export (logo, API, control panel) usable as an `href`/`src`, or null. The values
 * come from third parties: only absolute http(s) URLs pass, so a `javascript:` or `data:` value
 * can never become a link.
 */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const EMAIL = /^[^@\s<>"?&#/:]+@[^@\s<>"?&#/:]+$/;

/** A `mailto:` link for an e-mail address from the data, or null when it is not a plain address. */
export function safeMailto(value: string | null | undefined): string | null {
  const address = value?.trim();
  return address && EMAIL.test(address) ? `mailto:${address}` : null;
}

/** The Domain Connect settings response of `domain` at API `apiUrl`, both from the data. */
export function settingsUrl(apiUrl: string | null, domain: string | null): string | null {
  const api = safeUrl(apiUrl);
  if (!api || !domain) return null;
  return safeUrl(`${api.replace(/\/+$/, '')}/v2/${encodeURIComponent(domain)}/settings`);
}
