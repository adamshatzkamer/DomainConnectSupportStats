import { describe, expect, it } from 'vitest';
import { links, safeMailto, safeUrl, settingsUrl } from '../../src/lib/links';

describe('links', () => {
  it('carries raw ids in query parameters, URL-encoded by URLSearchParams', () => {
    expect(links.stack('plesk.com')).toBe('./stack.html?id=plesk.com');
    expect(links.template('Acme.example', 'Mail & more')).toBe(
      './template.html?spid=Acme.example&sid=Mail+%26+more',
    );
    expect(links.dnsProvider(42)).toBe('./dns-provider.html?id=42');
  });

  it('links a methodology section by its anchor', () => {
    expect(links.methodology()).toBe('./methodology.html');
    expect(links.methodology('8-limitations')).toBe('./methodology.html#8-limitations');
  });

  it('leaves out empty filters', () => {
    expect(links.dnsProviders({ stack: null, q: '' })).toBe('./dns-providers.html');
    expect(links.dnsProviders({ stack: 'plesk.com' })).toBe('./dns-providers.html?stack=plesk.com');
  });

  it('carries the show-all toggle only when on', () => {
    expect(links.dnsProviders({ q: 'plesk', all: true })).toBe(
      './dns-providers.html?q=plesk&all=1',
    );
    expect(links.dnsProviders({ all: false })).toBe('./dns-providers.html');
  });

  it('carries the templates filters', () => {
    expect(links.templates({ spid: 'mail.acme.example', q: 'mail', all: true })).toBe(
      './templates.html?spid=mail.acme.example&q=mail&all=1',
    );
    expect(links.templates({ spid: null, q: '', all: false })).toBe('./templates.html');
  });

  it('carries the service providers search', () => {
    expect(links.serviceProviders({ q: 'acme mail' })).toBe('./service-providers.html?q=acme+mail');
    expect(links.serviceProviders({ q: '' })).toBe('./service-providers.html');
    expect(links.serviceProviders()).toBe('./service-providers.html');
  });
});

describe('safeUrl', () => {
  it('accepts http and https URLs from the data', () => {
    expect(safeUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
    expect(safeUrl('http://example.com/')).toBe('http://example.com/');
  });

  it('rejects other schemes, relative and malformed values', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,x',
      ' JAVASCRIPT:alert(1)',
      '/x',
      'not a url',
      null,
    ]) {
      expect(safeUrl(value)).toBeNull();
    }
  });
});

describe('safeMailto', () => {
  it('links a plain address', () => {
    expect(safeMailto(' dc@host.example ')).toBe('mailto:dc@host.example');
  });

  it.each([null, '', 'no-at', 'a@b@c', 'a@b?cc=x@y', 'javascript:x@y'])('rejects %j', (v) => {
    expect(safeMailto(v)).toBeNull();
  });
});

describe('settingsUrl', () => {
  it('appends /v2/{domain}/settings to the API URL', () => {
    expect(
      settingsUrl('https://api.cloudflare.com/client/v4/dns/domainconnect', 'cloudflare.com'),
    ).toBe('https://api.cloudflare.com/client/v4/dns/domainconnect/v2/cloudflare.com/settings');
    expect(settingsUrl('https://dc.host.example/', 'host.example')).toBe(
      'https://dc.host.example/v2/host.example/settings',
    );
  });

  it.each([
    [null, 'host.example'],
    ['https://dc.host.example', null],
    ['javascript:alert(1)', 'host.example'],
  ])('is null for %s and %s', (api, domain) => {
    expect(settingsUrl(api, domain)).toBeNull();
  });
});
