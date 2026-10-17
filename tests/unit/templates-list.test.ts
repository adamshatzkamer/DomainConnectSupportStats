import { describe, expect, it } from 'vitest';
import type { Row, Table } from '../../src/lib/data/types';
import { isNeverProbed, templateList, withSupport } from '../../src/lib/templates-list';
import { exampleJson } from '../fixtures';

const templates = () => exampleJson('templates.json').tables.service_templates as Table;
const ids = (rows: Row[]) => rows.map((r) => `${r.provider_id}/${r.service_id}`);

/** The example export has no never-probed template: the last row becomes one. */
function withNeverProbed(): Table {
  const source = templates();
  Object.assign(source.rows.at(-1)!, {
    supported_count: 0,
    supported_pct: 0,
    unsupported_count: 0,
    unsupported_pct: 0,
    undetermined_count: 5,
    undetermined_pct: 100,
  });
  return source;
}

describe('isNeverProbed', () => {
  it('is a template no DNS provider has answered for', () => {
    expect(isNeverProbed({ total: 5, supported_count: 0, unsupported_count: 0 })).toBe(true);
    expect(isNeverProbed({ total: 0, supported_count: 0, unsupported_count: 0 })).toBe(true);
    expect(isNeverProbed({ total: 5, supported_count: 0, unsupported_count: 1 })).toBe(false);
    expect(isNeverProbed({ total: 5, supported_count: 1, unsupported_count: 0 })).toBe(false);
    expect(isNeverProbed({ supported_count: null, unsupported_count: 0 })).toBe(false);
    expect(isNeverProbed({})).toBe(false);
  });
});

describe('templateList', () => {
  it('shows every probed template in export order', () => {
    const list = templateList(templates(), { spid: null, showAll: false });
    expect(ids(list.table.rows)).toEqual(ids(templates().rows));
    expect(list.table.rows).toHaveLength(5);
    expect(list.hiddenCount).toBe(0);
  });

  it('hides never-probed templates and counts them, unless asked', () => {
    const hidden = templateList(withNeverProbed(), { spid: null, showAll: false });
    expect(ids(hidden.table.rows)).not.toContain('exampleservice.domainconnect.org/template2');
    expect(hidden.hiddenCount).toBe(1);
    const all = templateList(withNeverProbed(), { spid: null, showAll: true });
    expect(ids(all.table.rows)).toContain('exampleservice.domainconnect.org/template2');
    expect(all.hiddenCount).toBe(1);
  });

  it("filters to one service provider's templates before hiding", () => {
    expect(
      ids(templateList(templates(), { spid: 'mail.acme.example', showAll: false }).table.rows),
    ).toEqual(ids(templates().rows.filter((r) => r.provider_id === 'mail.acme.example')));
    const hidden = templateList(withNeverProbed(), {
      spid: 'exampleservice.domainconnect.org',
      showAll: false,
    });
    expect(ids(hidden.table.rows)).toEqual(['exampleservice.domainconnect.org/template1']);
    expect(hidden.hiddenCount).toBe(1);
    expect(templateList(templates(), { spid: 'nope', showAll: true }).table.rows).toEqual([]);
  });

  it('keeps unknown columns and keys', () => {
    const source = templates();
    source.columns.push({ key: 'brand_new', header: 'NEW' });
    source.rows[0]!.brand_new = 'x';
    const { table } = templateList(source, { spid: null, showAll: false });
    expect(table.columns.map((c) => c.key)).toContain('brand_new');
    expect(table.rows[0]!.brand_new).toBe('x');
  });
});

describe('withSupport', () => {
  const row = (table: ReturnType<typeof withSupport>, id: string) =>
    table.rows.find((r) => `${r.provider_id}/${r.service_id}` === id)!;

  it('adds supporting and not supporting DNS providers, as shares of the supporting ones', () => {
    const table = withSupport(templates(), 4);
    expect(table.columns.map((c) => c.key)).toEqual(
      expect.arrayContaining(['supporting_dns_providers', 'not_supporting_dns_providers']),
    );
    expect(row(table, 'mail.acme.example/verify')).toMatchObject({
      supporting_dns_providers: 2,
      supporting_dns_providers_pct: 50,
      not_supporting_dns_providers: 2,
      not_supporting_dns_providers_pct: 50,
    });
    expect(row(table, 'exampleservice.domainconnect.org/template2')).toMatchObject({
      supporting_dns_providers: 0,
      not_supporting_dns_providers: 4,
      not_supporting_dns_providers_pct: 100,
    });
  });

  it('leaves unknown what the row or the denominator lacks', () => {
    const source = templates();
    source.rows.find((r) => r.service_id === 'mail')!.supported_count = null;
    expect(row(withSupport(source, 4), 'mail.acme.example/mail')).toMatchObject({
      supporting_dns_providers: null,
      supporting_dns_providers_pct: null,
      not_supporting_dns_providers: null,
    });
    expect(
      row(withSupport(templates(), null), 'exampleservice.domainconnect.org/template1'),
    ).toMatchObject({
      supporting_dns_providers: 4,
      supporting_dns_providers_pct: null,
      not_supporting_dns_providers: null,
    });
  });

  it('never shows a negative count of not supporting DNS providers', () => {
    const r = row(withSupport(templates(), 3), 'exampleservice.domainconnect.org/template1');
    expect(r.not_supporting_dns_providers).toBeNull();
    expect(r.not_supporting_dns_providers_pct).toBeNull();
  });
});
