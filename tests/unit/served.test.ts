import { describe, expect, it } from 'vitest';
import type { Row, Table } from '../../src/lib/data/types';
import { findTable, oneRecord } from '../../src/lib/data/tables';
import { servedCounts, servedLabel, templateServedCounts } from '../../src/lib/served';
import { exampleJson } from '../fixtures';

describe('servedLabel', () => {
  const full: Row = {
    served_version: 2,
    repository_version: 2,
    response_kind: 'template',
    template_match: 'match',
  };

  it('names the version, then the response kind and match', () => {
    expect(servedLabel(full).text).toBe('v2 · full, matches');
    expect(servedLabel({ ...full, template_match: 'morphed' }).text).toBe('v2 · full, morphed');
    expect(servedLabel({ ...full, served_version: 1, template_match: 'outdated' }).text).toBe(
      'v1 · full, outdated',
    );
    expect(servedLabel({ ...full, template_match: null }).text).toBe('v2 · full');
    expect(
      servedLabel({ served_version: 3, response_kind: 'version', template_match: null }).text,
    ).toBe('v3 · version only');
    expect(
      servedLabel({ served_version: null, response_kind: 'empty', template_match: null }).text,
    ).toBe('empty answer');
  });

  it('marks morphed and outdated templates', () => {
    expect(servedLabel(full).tone).toBe('ok');
    expect(servedLabel({ ...full, template_match: 'morphed' }).tone).toBe('warn');
    expect(servedLabel({ ...full, template_match: 'outdated' }).tone).toBe('warn');
    expect(servedLabel({ served_version: 3, response_kind: 'version' }).tone).toBeNull();
  });

  it('is unknown before the answer was recorded', () => {
    const label = servedLabel({ served_version: null, response_kind: null, template_match: null });
    expect(label).toMatchObject({ text: null, tone: null });
    expect(label.title).toBe('Not recorded yet');
  });

  it('gives the raw values and the repository version in the hover text', () => {
    expect(servedLabel(full).title).toBe(
      'Served version 2, repository version 2, response template, match match',
    );
    expect(servedLabel({ ...full, repository_version: undefined }, 3).title).toContain(
      'repository version 3',
    );
  });

  it('shows an unknown response kind or match as is', () => {
    expect(servedLabel({ served_version: 1, response_kind: 'brand_new' }).text).toBe(
      'v1 · brand_new',
    );
    expect(servedLabel({ ...full, template_match: 'brand_new' }).text).toBe('v2 · full, brand_new');
  });
});

describe('servedCounts', () => {
  it('counts what the supported templates serve, each as a share of a denominator', () => {
    const provider = oneRecord(findTable(exampleJson('dns-providers/2.json'), 'support'));
    expect(servedCounts(provider, provider?.supported_count as number)).toEqual([
      { key: 'with_version_count', label: 'With version', count: 2, pct: 100 },
      { key: 'full_template_count', label: 'Full template', count: 2, pct: 100 },
      { key: 'morphed_count', label: 'Morphed', count: 1, pct: 50 },
      { key: 'outdated_count', label: 'Outdated', count: 1, pct: 50 },
    ]);
  });

  it('leaves the share unknown without a denominator', () => {
    const counts = servedCounts({ with_version_count: 0 }, 0);
    expect(counts[0]).toMatchObject({ count: 0, pct: null });
    expect(counts[1]).toMatchObject({ count: null, pct: null });
    expect(servedCounts({ with_version_count: 1 }, null)[0]).toMatchObject({ count: 1, pct: null });
  });
});

describe('templateServedCounts', () => {
  it("counts the template card's supporters by what they serve", () => {
    const file = exampleJson('templates/exampleservice.domainconnect.org/template1.json');
    const served = oneRecord(findTable(file, 'served') as Table);
    const counts = templateServedCounts(served);
    expect(counts.map((c) => c.key)).toEqual([
      'with_version_count',
      'current_version_count',
      'full_template_count',
      'morphed_count',
      'outdated_count',
    ]);
    const supporters = served?.supporters as number;
    expect(counts.every((c) => c.pct === (c.count! / supporters) * 100)).toBe(true);
  });
});
