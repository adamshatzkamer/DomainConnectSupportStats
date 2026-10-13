// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  GOATCOUNTER_SCRIPT,
  countedPath,
  resolveGoatCounter,
  startAnalytics,
} from '../../src/lib/analytics';

const ENDPOINT = 'https://domain-connect.goatcounter.com/count';

describe('resolveGoatCounter', () => {
  it('accepts an https endpoint', () => {
    expect(resolveGoatCounter(ENDPOINT)).toBe(ENDPOINT);
  });

  it('is null when unset, not https or not a URL', () => {
    expect(resolveGoatCounter(undefined)).toBeNull();
    expect(resolveGoatCounter('')).toBeNull();
    expect(resolveGoatCounter(42)).toBeNull();
    expect(resolveGoatCounter('http://domain-connect.goatcounter.com/count')).toBeNull();
    expect(resolveGoatCounter('javascript:alert(1)')).toBeNull();
    expect(resolveGoatCounter('/count')).toBeNull();
  });
});

describe('countedPath', () => {
  it('keeps the page file name without the site base path', () => {
    expect(countedPath('/DomainConnectSupportStats/stacks.html', '')).toBe('/stacks.html');
    expect(countedPath('/stacks.html', '')).toBe('/stacks.html');
  });

  it('names the site root index.html', () => {
    expect(countedPath('/DomainConnectSupportStats/', '')).toBe('/index.html');
    expect(countedPath('/', '')).toBe('/index.html');
  });

  it('keeps the card id', () => {
    expect(countedPath('/x/dns-provider.html', '?id=42&tab=1')).toBe('/dns-provider.html?id=42');
    expect(countedPath('/x/stack.html', '?id=plesk.com')).toBe('/stack.html?id=plesk.com');
    expect(countedPath('/x/service-provider.html', '?id=a b')).toBe(
      '/service-provider.html?id=a+b',
    );
  });

  it('keeps spid and sid of a template card in that order', () => {
    expect(countedPath('/x/template.html', '?sid=s1&spid=sp.com')).toBe(
      '/template.html?spid=sp.com&sid=s1',
    );
  });

  it('drops list filters and blank ids', () => {
    expect(countedPath('/x/dns-providers.html', '?stack=plesk.com&q=go&all=1')).toBe(
      '/dns-providers.html',
    );
    expect(countedPath('/x/templates.html', '?spid=sp.com')).toBe('/templates.html');
    expect(countedPath('/x/leaderboards.html', '?window=30')).toBe('/leaderboards.html');
    expect(countedPath('/x/stack.html', '?id=%20')).toBe('/stack.html');
  });
});

describe('startAnalytics', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    delete window.goatcounter;
    delete window.DC_STATS_CONFIG;
    window.history.replaceState(null, '', '/');
  });

  it('loads count.js with the endpoint and the counted path', () => {
    window.DC_STATS_CONFIG = { goatCounter: ENDPOINT };
    window.history.replaceState(null, '', '/site/stack.html?id=plesk.com&q=x');
    startAnalytics();
    const script = document.head.querySelector('script');
    expect(script?.src).toBe(GOATCOUNTER_SCRIPT);
    expect(script?.async).toBe(true);
    expect(script?.dataset.goatcounter).toBe(ENDPOINT);
    expect(window.goatcounter?.path).toBe('/stack.html?id=plesk.com');
  });

  it('does nothing without an endpoint', () => {
    window.DC_STATS_CONFIG = {};
    startAnalytics();
    expect(document.head.querySelector('script')).toBeNull();
    expect(window.goatcounter).toBeUndefined();
  });
});
