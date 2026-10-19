import { describe, expect, it } from 'vitest';
import type { Leaderboards } from '../../src/lib/data/derived';
import type { Row, Table } from '../../src/lib/data/types';
import {
  entrantRows,
  entrants,
  isMeasured,
  improvedWindow,
  mostImproved,
  newSupporting,
  topByDomains,
  topByTemplates,
  topReach,
  type Entrant,
  type Ranked,
} from '../../src/lib/leaderboards';
import { exampleJson } from '../fixtures';

const dnsProviders = () => (exampleJson('dns-providers.json').tables.dns_providers as Table).rows;
const templates = () => (exampleJson('templates.json').tables.service_templates as Table).rows;
const serviceProviders = () =>
  (exampleJson('service-providers.json').tables.service_providers as Table).rows;

const board = (ranked: Ranked<Entrant>[]) => ranked.map((r) => [r.rank, r.entry.name, r.value]);

function provider(id: number, values: Row): Row {
  return {
    name: `DNS ${id}`,
    dns_provider_id: id,
    provider_id: null,
    api_host: `dc.dns${id}.example`,
    supported_count: 0,
    supported_templates_change: 0,
    supported_templates_change_90d: null,
    domains: 0,
    ...values,
  };
}

describe('entrants', () => {
  it('lists every DNS provider on its own', () => {
    const list = entrants(dnsProviders());
    expect(list.map((e) => [e.name, e.href])).toEqual([
      ['Cloudflare', './dns-provider.html?id=1'],
      ['IONOS', './dns-provider.html?id=5'],
      ['Plesk', './dns-provider.html?id=2'],
      ['Plesk', './dns-provider.html?id=3'],
      ['Small Registrar', './dns-provider.html?id=4'],
      ['Quiet Host', './dns-provider.html?id=6'],
    ]);
  });

  it('describes a DNS provider by its API host', () => {
    expect(entrants([provider(7, {})])[0]?.detail).toBe('dc.dns7.example');
    expect(entrants([provider(7, { api_host: null })])[0]?.detail).toBeNull();
  });

  it('reaches its domains only when it supports a template', () => {
    const list = entrants(dnsProviders());
    expect(list[2]?.reachedDomains).toBe(900);
    // Plesk deployment 3: 250 domains, 1 template.
    expect(list[3]?.reachedDomains).toBe(250);
    expect(entrants([provider(1, { supported_count: 0, domains: 5 })])[0]?.reachedDomains).toBe(0);
    expect(
      entrants([provider(1, { supported_count: 3, domains: null })])[0]?.reachedDomains,
    ).toBeNull();
    expect(
      entrants([provider(1, { supported_count: null, domains: 5 })])[0]?.reachedDomains,
    ).toBeNull();
  });
});

describe('topByTemplates', () => {
  it('ranks DNS providers by supported templates, positive only, ties by domains', () => {
    // IONOS (2000 domains) before Plesk (900) at 2 templates each.
    expect(board(topByTemplates(entrants(dnsProviders())))).toEqual([
      [1, 'Cloudflare', 3],
      [2, 'IONOS', 2],
      [3, 'Plesk', 2],
      [4, 'Plesk', 1],
    ]);
  });

  it('ranks the deployments of a stack separately', () => {
    const rows = [
      provider(1, { name: 'Plesk', provider_id: 'plesk.com', supported_count: 5 }),
      provider(2, { name: 'Plesk', provider_id: 'plesk.com', supported_count: 4 }),
    ];
    const ranked = topByTemplates(entrants(rows));
    expect(ranked.map((r) => [r.rank, r.entry.href, r.value])).toEqual([
      [1, './dns-provider.html?id=1', 5],
      [2, './dns-provider.html?id=2', 4],
    ]);
  });

  it('breaks ties of equal domains by name, ignoring case, and puts unknown domains last', () => {
    const rows = [
      provider(1, { name: 'beta', supported_count: 1, domains: 10 }),
      provider(2, { name: 'Alpha', supported_count: 1, domains: 10 }),
      provider(3, { name: 'Aaa', supported_count: 1, domains: null }),
      provider(4, { name: 'Zed', supported_count: 1, domains: 20 }),
    ];
    expect(board(topByTemplates(entrants(rows)))).toEqual([
      [1, 'Zed', 1],
      [2, 'Alpha', 1],
      [3, 'beta', 1],
      [4, 'Aaa', 1],
    ]);
  });

  it('keeps the top 10 and leaves out unknown values', () => {
    const rows = Array.from({ length: 12 }, (_, i) => provider(i + 1, { supported_count: i + 1 }));
    rows.push(provider(99, { supported_count: null }));
    const ranked = topByTemplates(entrants(rows));
    expect(ranked).toHaveLength(10);
    expect(ranked[0]?.value).toBe(12);
    expect(ranked.at(-1)).toMatchObject({ rank: 10, value: 3 });
  });
});

describe('topByDomains', () => {
  it('ranks supporting DNS providers by domains', () => {
    expect(board(topByDomains(entrants(dnsProviders())))).toEqual([
      [1, 'Cloudflare', 4000],
      [2, 'IONOS', 2000],
      [3, 'Plesk', 900],
      [4, 'Plesk', 250],
    ]);
  });
});

describe('mostImproved', () => {
  it('ranks DNS providers by the change since the previous sweep, positive only', () => {
    expect(board(mostImproved(entrants(dnsProviders()), 'sweep'))).toEqual([[1, 'IONOS', 1]]);
  });

  it('ranks by the change over about 90 days', () => {
    const rows = [
      provider(1, { supported_templates_change: 5, supported_templates_change_90d: 2 }),
      provider(2, { supported_templates_change: 0, supported_templates_change_90d: 4 }),
      provider(3, { supported_templates_change: -1, supported_templates_change_90d: null }),
    ];
    expect(board(mostImproved(entrants(rows), '90d'))).toEqual([
      [1, 'DNS 2', 4],
      [2, 'DNS 1', 2],
    ]);
  });

  it('takes a smaller size', () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      provider(i + 1, { supported_templates_change: i + 1 }),
    );
    expect(mostImproved(entrants(rows), 'sweep', 5)).toHaveLength(5);
  });
});

describe('improvedWindow', () => {
  it('reads ?window=90d, else since the previous sweep', () => {
    expect(improvedWindow('?window=90d')).toBe('90d');
    expect(improvedWindow('?window=sweep')).toBe('sweep');
    expect(improvedWindow('?window=x')).toBe('sweep');
    expect(improvedWindow('')).toBe('sweep');
  });
});

describe('topReach', () => {
  it('ranks templates by reach, positive only, ties by name', () => {
    const ranked = topReach(templates(), (r) => String(r.service_name));
    expect(ranked.map((r) => [r.rank, r.entry.service_name, r.value])).toEqual([
      [1, 'Example Website', 7150],
      [2, 'Domain Verification', 6000],
      [3, 'Acme Mail', 4900],
    ]);
  });

  it('ranks service providers by reach', () => {
    const ranked = topReach(serviceProviders(), (r) => String(r.name));
    expect(ranked.map((r) => [r.rank, r.entry.name, r.value])).toEqual([
      [1, 'Example Service', 7150],
      [2, 'Acme Mail Inc.', 6900],
    ]);
  });

  it('is empty without a domain-share import', () => {
    const rows = serviceProviders().map((r) => ({ ...r, reach_domains: null }));
    expect(topReach(rows, (r) => String(r.name))).toEqual([]);
  });
});

describe('newSupporting', () => {
  const GENERATED = '2026-10-01T00:00:00Z';
  const derived = (rows: [number, string][]): Leaderboards => ({
    generated_at: GENERATED,
    first_sweep: { sweep_id: 1, started_at: '2026-03-02 02:00:00' },
    first_support: rows.map(([id, at], i) => ({
      dns_provider_id: id,
      sweep_id: 10 - i,
      started_at: at,
      supported_templates: 1,
    })),
  });

  it('lists DNS providers first supporting within 30 days, newest first', () => {
    const list = newSupporting(
      derived([
        [5, '2026-09-30 02:00:00'],
        [4, '2026-09-01 00:00:00'],
        [3, '2026-08-31 23:59:59'],
      ]),
      dnsProviders(),
      null,
    );
    expect(list).toEqual([
      {
        dnsProviderId: 5,
        name: 'IONOS',
        apiHost: 'domainconnect.ionos.example',
        href: './dns-provider.html?id=5',
        since: '2026-09-30 02:00:00',
        supportedTemplates: 2,
      },
      {
        dnsProviderId: 4,
        name: 'Small Registrar',
        apiHost: null,
        href: './dns-provider.html?id=4',
        since: '2026-09-01 00:00:00',
        supportedTemplates: 0,
      },
    ]);
  });

  it('leaves out first support before the scanner start', () => {
    const list = newSupporting(
      derived([
        [5, '2026-09-30 02:00:00'],
        [4, '2026-09-21 02:00:00'],
      ]),
      dnsProviders(),
      new Date('2026-09-22T00:00:00Z'),
    );
    expect(list.map((r) => r.dnsProviderId)).toEqual([5]);
  });

  it('leaves out a DNS provider missing from the list', () => {
    const list = newSupporting(derived([[99, '2026-09-30 02:00:00']]), dnsProviders(), null);
    expect(list).toEqual([]);
  });

  it('is empty in the example export: its first supports are older', () => {
    const example: Leaderboards = {
      generated_at: GENERATED,
      first_sweep: { sweep_id: 1, started_at: '2026-03-02 02:00:00' },
      first_support: [
        {
          dns_provider_id: 5,
          sweep_id: 4,
          started_at: '2026-06-02 02:00:00',
          supported_templates: 1,
        },
      ],
    };
    expect(newSupporting(example, dnsProviders(), null)).toEqual([]);
  });
});

describe('entrantRows', () => {
  it('formats counts, with the API host', () => {
    const rows = entrantRows(topByTemplates(entrants(dnsProviders())));
    expect(rows[0]).toEqual({
      rank: 1,
      name: 'Cloudflare',
      href: './dns-provider.html?id=1',
      detail: 'api.cloudflare.com',
      value: '3',
      title: '3',
    });
  });

  it('formats domains as their share, the count and scan in the hover text', () => {
    const scan = { scannedDomains: 12000, label: 'partial scan of 01-06-2026' };
    const rows = entrantRows(topByDomains(entrants(dnsProviders())), 'share', scan);
    expect(rows[0]).toMatchObject({
      name: 'Cloudflare',
      value: '33.3%',
      title: '4,000 of 12K scanned domains in the partial scan of 01-06-2026',
    });
  });

  it('formats a change with its sign and keeps a DNS provider detail', () => {
    const rows = entrantRows(
      mostImproved(entrants([provider(1, { supported_templates_change: 12 })]), 'sweep'),
      'change',
    );
    expect(rows[0]).toMatchObject({ value: '+12', detail: 'dc.dns1.example' });
  });

  it('shortens large counts, the exact one in the hover text', () => {
    const rows = entrantRows(
      topByDomains(entrants([provider(1, { supported_count: 1, domains: 123_456 })])),
    );
    expect(rows[0]).toMatchObject({ value: '123.5K', title: '123,456' });
  });
});

describe('isMeasured', () => {
  it('tells an unmeasured window from one without gains', () => {
    const list = entrants(dnsProviders());
    expect(isMeasured(list, 'sweep')).toBe(true);
    const unmeasured = entrants([provider(1, { supported_templates_change_90d: null })]);
    expect(isMeasured(unmeasured, '90d')).toBe(false);
  });
});
