import { describe, expect, it } from 'vitest';
import type { Row, Table } from '../../src/lib/data/types';
import { findTable, oneRecord } from '../../src/lib/data/tables';
import {
  servedCounts,
  servedLabel,
  supportedPairs,
  templateServedCounts,
} from '../../src/lib/served';
import { exampleJson } from '../fixtures';

describe('servedLabel', () => {
  const full: Row = {
    served_version: 2,
    repository_version: 2,
    response_kind: 'template',
    template_match: 'match',
  };

  it('shows the version as is', () => {
    expect(servedLabel(full).version).toBe('2');
    expect(servedLabel({ served_version: 3, response_kind: 'version' }).version).toBe('3');
    expect(servedLabel({ served_version: null, response_kind: 'empty' }).version).toBeNull();
  });

  it('badges morphed and outdated templates only', () => {
    expect(servedLabel({ ...full, template_match: 'morphed' }).badge).toBe('Morphed');
    expect(servedLabel({ ...full, template_match: 'outdated' }).badge).toBe('Outdated');
    expect(servedLabel(full).badge).toBeNull();
    expect(servedLabel({ ...full, template_match: 'brand_new' }).badge).toBeNull();
    expect(servedLabel({ served_version: 3, response_kind: 'version' }).badge).toBeNull();
  });

  it('badges a version-only answer below the repository version as outdated', () => {
    const versionOnly: Row = {
      served_version: 1,
      repository_version: 3,
      response_kind: 'version',
      template_match: null,
    };
    expect(servedLabel(versionOnly).badge).toBe('Outdated');
    expect(servedLabel(versionOnly).badgeTitle).toBe(
      "The full template's version (1) is below the repository's (3)",
    );
    const supporter: Row = { served_version: 1, response_kind: 'version', template_match: null };
    expect(servedLabel(supporter, 3).badge).toBe('Outdated');
    expect(servedLabel(supporter).badge).toBeNull();
    expect(servedLabel({ ...versionOnly, served_version: 3 }).badge).toBeNull();
    expect(servedLabel({ ...versionOnly, served_version: null }).badge).toBeNull();
  });

  it('is unknown before the answer was recorded', () => {
    const label = servedLabel({ served_version: null, response_kind: null, template_match: null });
    expect(label).toMatchObject({ version: null, badge: null });
    expect(label.title).toBe('Not recorded yet');
  });

  it('gives the raw values and the repository version in the hover text', () => {
    expect(servedLabel(full).title).toBe(
      'Served version 2, repository version 2, response template, match match',
    );
    const supporter: Row = {
      served_version: 2,
      response_kind: 'template',
      template_match: 'match',
    };
    expect(servedLabel(supporter, 3).title).toContain('repository version 3');
  });

  it('explains the badge', () => {
    expect(servedLabel({ ...full, template_match: 'morphed' }).badgeTitle).toBe(
      "The full template differs from the repository's: altered by the DNS provider",
    );
    expect(servedLabel({ ...full, served_version: 1, template_match: 'outdated' }).badgeTitle).toBe(
      "The full template's version (1) is below the repository's (2)",
    );
    expect(servedLabel(full).badgeTitle).toBeNull();
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

describe('supportedPairs', () => {
  it("sums the deployments' supported templates", () => {
    const deployments = findTable(exampleJson('stacks/plesk.com.json'), 'deployments')!.rows;
    expect(supportedPairs(deployments)).toBe(3);
    expect(supportedPairs([])).toBe(0);
    expect(supportedPairs([...deployments, { supported_count: null }])).toBeNull();
  });
});
