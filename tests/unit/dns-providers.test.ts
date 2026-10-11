import { describe, expect, it } from 'vitest';
import type { Row, Table } from '../../src/lib/data/types';
import {
  dnsProviderList,
  isHiddenByDefault,
  statusBadge,
  SUPPORTED_PCT_KEY,
  templateSupport,
  templateTotal,
  UNDETERMINED_PCT_KEY,
  UNSUPPORTED_PCT_KEY,
  withTemplateSupportColumns,
} from '../../src/lib/dns-providers';
import { exampleJson } from '../fixtures';

const providers = () => exampleJson('dns-providers.json').tables.dns_providers as Table;
const ids = (rows: Row[]) => rows.map((r) => r.dns_provider_id);

describe('templateSupport', () => {
  const row: Row = { supported_templates: 1, unsupported_templates: 2, undetermined_templates: 1 };

  it('is each template answer as a share of the three together', () => {
    expect(templateTotal(row)).toBe(4);
    expect(templateSupport(row)).toEqual({
      supportedPct: 25,
      unsupportedPct: 50,
      undeterminedPct: 25,
    });
  });

  it('is unknown when a count is unknown, or there are no templates', () => {
    const unknown = { supportedPct: null, unsupportedPct: null, undeterminedPct: null };
    expect(templateTotal({ ...row, undetermined_templates: null })).toBeNull();
    expect(templateSupport({ ...row, undetermined_templates: null })).toEqual(unknown);
    expect(templateSupport({ supported_templates: 1, undetermined_templates: 1 })).toEqual(unknown);
    expect(
      templateSupport({
        supported_templates: 0,
        unsupported_templates: 0,
        undetermined_templates: 0,
      }),
    ).toEqual(unknown);
    expect(templateSupport(undefined)).toEqual(unknown);
  });
});

describe('withTemplateSupportColumns', () => {
  it('renames the template answers, each followed by its share', () => {
    const columns = withTemplateSupportColumns([
      { key: 'name', header: 'NAME' },
      { key: 'supported_templates', header: 'TEMPLATES' },
      { key: 'unsupported_templates', header: 'NOT SUPP. TEMPLATES' },
      { key: 'undetermined_templates', header: 'UNDETERMINED TEMPLATES' },
    ]);
    expect(columns.map((c) => c.header)).toEqual([
      'NAME',
      'SUPPORTED',
      'SUPPORTED %',
      'NOT SUPP.',
      'NOT SUPP. %',
      'UNDETERMINED',
      'UNDETERMINED %',
    ]);
  });
});

describe('isHiddenByDefault', () => {
  const visible: Row = { settings_status: 'ok', support_status: 'ok', domains: 10 };

  it('hides given-up, never-probed and zero-domain providers', () => {
    expect(isHiddenByDefault(visible)).toBe(false);
    expect(isHiddenByDefault({ ...visible, settings_status: 'dead' })).toBe(true);
    expect(isHiddenByDefault({ ...visible, support_status: 'dead' })).toBe(true);
    expect(isHiddenByDefault({ ...visible, support_status: null })).toBe(true);
    expect(isHiddenByDefault({ ...visible, domains: 0 })).toBe(true);
  });

  it('keeps unmeasured domains and failing probes visible', () => {
    expect(isHiddenByDefault({ ...visible, domains: null })).toBe(false);
    expect(isHiddenByDefault({ ...visible, settings_status: 'connection_error' })).toBe(false);
    expect(isHiddenByDefault({ ...visible, support_status: 'error' })).toBe(false);
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

  it('adds the shares of the template answers, never probed included', () => {
    const { table } = dnsProviderList(providers(), { stack: null, showAll: true });
    const keys = table.columns.map((c) => c.key);
    expect(keys.indexOf(SUPPORTED_PCT_KEY)).toBe(keys.indexOf('supported_templates') + 1);
    expect(table.rows.map((r) => r[SUPPORTED_PCT_KEY])).toEqual([60, 40, 40, 0, 0, 0]);
    expect(table.rows.map((r) => r[UNSUPPORTED_PCT_KEY])).toEqual([20, 0, 40, 0, 0, 20]);
    expect(table.rows.map((r) => r[UNDETERMINED_PCT_KEY])).toEqual([20, 60, 20, 100, 100, 80]);
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
    expect(statusBadge('http_error')).toMatchObject({ label: 'HTTP error', tone: 'warn' });
    expect(statusBadge('error')).toMatchObject({ label: 'HTTP error', tone: 'warn' });
    expect(statusBadge('connection_error')).toMatchObject({
      label: 'Connection error',
      tone: 'warn',
    });
    expect(statusBadge('dead')).toMatchObject({ label: 'Given up', tone: 'muted' });
    expect(statusBadge(null)).toMatchObject({ label: 'Not checked yet', tone: 'muted' });
  });

  it('carries the raw value in the hover text', () => {
    expect(statusBadge('connection_error').title).toContain('connection_error');
    expect(statusBadge(null).title).toContain('null');
  });

  it('shows an unknown status as is', () => {
    expect(statusBadge('brand_new')).toMatchObject({ label: 'brand_new', tone: 'muted' });
  });
});
