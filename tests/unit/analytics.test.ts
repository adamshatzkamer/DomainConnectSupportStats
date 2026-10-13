// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GOATCOUNTER_SCRIPT,
  countView,
  countedPath,
  resetAnalytics,
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
    resetAnalytics();
    document.head.innerHTML = '';
    delete window.goatcounter;
    delete window.DC_STATS_CONFIG;
    window.history.replaceState(null, '', '/');
  });

  it('loads the bundled count.js with the endpoint, counting left to the page', () => {
    window.DC_STATS_CONFIG = { goatCounter: ENDPOINT };
    startAnalytics();
    const script = document.head.querySelector('script');
    expect(GOATCOUNTER_SCRIPT).toBe('./goatcounter/count.v5.js');
    expect(script?.getAttribute('src')).toBe(GOATCOUNTER_SCRIPT);
    expect(script?.async).toBe(true);
    expect(script?.dataset.goatcounter).toBe(ENDPOINT);
    expect(window.goatcounter?.no_onload).toBe(true);
  });

  it('keeps settings set before it', () => {
    window.DC_STATS_CONFIG = { goatCounter: ENDPOINT };
    window.goatcounter = { allow_local: true };
    startAnalytics();
    expect(window.goatcounter).toEqual({ allow_local: true, no_onload: true });
  });

  it('does nothing without an endpoint', () => {
    window.DC_STATS_CONFIG = {};
    startAnalytics();
    expect(document.head.querySelector('script')).toBeNull();
    expect(window.goatcounter).toBeUndefined();
  });
});

describe('countView', () => {
  const count = vi.fn();

  /** count.js has run: it defines `goatcounter.count`, then the script fires `load`. */
  function loadScript() {
    window.goatcounter = { ...window.goatcounter, count };
    document.head.querySelector('script')?.dispatchEvent(new Event('load'));
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    window.DC_STATS_CONFIG = { goatCounter: ENDPOINT };
    window.history.replaceState(null, '', '/site/stack.html?id=plesk.com&q=x');
    document.title = 'Stack - Domain Connect Support Statistics';
  });

  afterEach(() => {
    resetAnalytics();
    count.mockReset();
    document.head.innerHTML = '';
    delete window.goatcounter;
    delete window.DC_STATS_CONFIG;
    window.history.replaceState(null, '', '/');
  });

  it('counts the counted path and the given title once count.js has loaded', async () => {
    startAnalytics();
    countView('Plesk - Stack - Domain Connect Support Statistics');
    await flush();
    expect(count).not.toHaveBeenCalled();
    loadScript();
    await flush();
    expect(count).toHaveBeenCalledExactlyOnceWith({
      path: '/stack.html?id=plesk.com',
      title: 'Plesk - Stack - Domain Connect Support Statistics',
    });
  });

  it('counts the page title without a title', async () => {
    startAnalytics();
    loadScript();
    countView();
    await flush();
    expect(count).toHaveBeenCalledExactlyOnceWith({
      path: '/stack.html?id=plesk.com',
      title: 'Stack - Domain Connect Support Statistics',
    });
  });

  it('counts a page once', async () => {
    startAnalytics();
    loadScript();
    countView('first');
    countView('second');
    await flush();
    expect(count).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'first' }));
  });

  it('does nothing without an endpoint or when count.js fails to load', async () => {
    window.DC_STATS_CONFIG = {};
    startAnalytics();
    countView('x');
    resetAnalytics();
    window.DC_STATS_CONFIG = { goatCounter: ENDPOINT };
    startAnalytics();
    document.head.querySelector('script')?.dispatchEvent(new Event('error'));
    countView('x');
    await flush();
    expect(count).not.toHaveBeenCalled();
  });
});
