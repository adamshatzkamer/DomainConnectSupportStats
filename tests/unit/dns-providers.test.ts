import { describe, expect, it } from 'vitest';
import type { Row, Table } from '../../src/lib/data/types';
import {
  dnsProviderList,
  isHiddenByDefault,
  probeCounts,
  statusBadge,
} from '../../src/lib/dns-providers';
import { exampleJson } from '../fixtures';

const providers = () => exampleJson('dns-providers.json').tables.dns_providers as Table;
const ids = (rows: Row[]) => rows.map((r) => r.dns_provider_id);

describe('isHiddenByDefault', () => {
  const visible: Row = { settings_status: 'ok', support_status: 'ok', domains: 10 };

  it('hides given-up, never-probed and zero-domain providers', () => {
    expect(isHiddenByDefault(visible)).toBe(false);
    expect(isHiddenByDefault({ ...visible, support_status: 'dead' })).toBe(true);
    expect(isHiddenByDefault({ ...visible, support_status: null })).toBe(true);
    expect(isHiddenByDefault({ ...visible, domains: 0 })).toBe(true);
  });

  it('keeps unmeasured domains and failing probes visible', () => {
    expect(isHiddenByDefault({ ...visible, domains: null })).toBe(false);
    expect(isHiddenByDefault({ ...visible, settings_status: 'failed' })).toBe(false);
    expect(isHiddenByDefault({ ...visible, support_status: 'error' })).toBe(false);
    expect(isHiddenByDefault({ ...visible, support_status: 'partial' })).toBe(false);
  });
});

describe('dnsProviderList', () => {
  it('hides the default-hidden rows and counts them, keeping export order', () => {
    const list = dnsProviderList(providers(), { stack: null, showAll: false });
    expect(ids(list.table.rows)).toEqual([1, 5, 2]);
    expect(list.hiddenCount).toBe(3);
  });

  it('shows every row when asked', () => {
    const list = dnsProviderList(providers(), { stack: null, showAll: true });
    expect(ids(list.table.rows)).toEqual([1, 5, 2, 3, 4, 6]);
    expect(list.hiddenCount).toBe(3);
  });

  it("filters to one stack's deployments before hiding", () => {
    expect(
      ids(dnsProviderList(providers(), { stack: 'plesk.com', showAll: true }).table.rows),
    ).toEqual([2, 3]);
    const hidden = dnsProviderList(providers(), { stack: 'plesk.com', showAll: false });
    expect(ids(hidden.table.rows)).toEqual([2]);
    expect(hidden.hiddenCount).toBe(1);
    expect(dnsProviderList(providers(), { stack: 'nope', showAll: true }).table.rows).toEqual([]);
  });

  it('keeps the counts and shares of the template answers as exported', () => {
    const { table } = dnsProviderList(providers(), { stack: null, showAll: true });
    expect(table.columns).toEqual(providers().columns);
    expect(table.rows).toEqual(providers().rows);
  });

  it('keeps unknown columns and keys', () => {
    const source = providers();
    source.columns.push({ key: 'brand_new', header: 'NEW' });
    source.rows[0]!.brand_new = 'x';
    const { table } = dnsProviderList(source, { stack: null, showAll: false });
    expect(table.columns.map((c) => c.key)).toContain('brand_new');
    expect(table.rows[0]!.brand_new).toBe('x');
  });
});

describe('statusBadge', () => {
  it('labels statuses in plain words with a tone', () => {
    expect(statusBadge('ok')).toMatchObject({ label: 'OK', tone: 'ok' });
    expect(statusBadge('partial')).toMatchObject({ label: 'Partly failed', tone: 'warn' });
    expect(statusBadge('error')).toMatchObject({ label: 'Failed', tone: 'warn' });
    expect(statusBadge('failed')).toMatchObject({ label: 'Failed', tone: 'warn' });
    expect(statusBadge('dead')).toMatchObject({ label: 'Given up', tone: 'muted' });
    expect(statusBadge(null)).toMatchObject({ label: 'Not checked yet', tone: 'muted' });
  });

  it('labels a settings failure by its kind', () => {
    expect(statusBadge('failed', 'dead')).toMatchObject({ label: 'Given up', tone: 'muted' });
    expect(statusBadge('failed', 'http_error')).toMatchObject({ label: 'Failed', tone: 'warn' });
    expect(statusBadge('failed', 'http_error').title).toContain('http_error');
  });

  it('carries the raw value and the completed run in the hover text', () => {
    expect(statusBadge('partial').title).toBe('partial: latest completed run, may be weeks old');
    expect(statusBadge(null).title).toContain('null');
  });

  it('shows an unknown status as is', () => {
    expect(statusBadge('brand_new')).toMatchObject({ label: 'brand_new', tone: 'muted' });
  });
});

describe('probeCounts', () => {
  it('counts the answered and failed probes of the latest completed sweep', () => {
    expect(probeCounts({ support_answered: 1, support_failed: 1 })).toBe('1 answered, 1 failed');
    expect(probeCounts({ support_answered: 1200, support_failed: 0 })).toBe('1,200 answered');
    expect(probeCounts({ support_answered: 0, support_failed: 6 })).toBe('0 answered, 6 failed');
  });

  it('is null without a completed sweep', () => {
    expect(probeCounts({ support_answered: null, support_failed: null })).toBeNull();
    expect(probeCounts({})).toBeNull();
    expect(probeCounts(undefined)).toBeNull();
  });
});
