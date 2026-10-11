import { describe, expect, it } from 'vitest';
import type { Table } from '../../src/lib/data/types';
import { findTable } from '../../src/lib/data/tables';
import {
  historyDiffers,
  recordDetails,
  recordsTable,
  RECORD_DETAILS_KEY,
  tableTitle,
} from '../../src/lib/templates';
import { exampleJson } from '../fixtures';

const card = (rel: string) => exampleJson(`templates/${rel}.json`);
const records = (rel: string) => findTable(card(rel), 'records')!;

describe('recordDetails', () => {
  const table = records('mail.acme.example/mail');

  it('lists every field but type and host, in column order, skipping unknown ones', () => {
    expect(recordDetails(table.columns, table.rows[2]!)).toEqual([
      { key: 'groupId', value: 'verify', ownColumn: true },
      { key: 'data', value: 'acme-verification=%token%', ownColumn: false },
      { key: 'ttl', value: '300', ownColumn: true },
      { key: 'txtConflictMatchingMode', value: 'Prefix', ownColumn: false },
      { key: 'txtConflictMatchingPrefix', value: 'acme-verification=', ownColumn: false },
    ]);
  });

  it('keeps numbers verbatim, without thousands separators', () => {
    const srv = records('unnamed.example/x');
    expect(recordDetails(srv.columns, srv.rows[0]!)).toContainEqual({
      key: 'port',
      value: '5060',
      ownColumn: false,
    });
  });

  it('ignores a field the columns do not declare', () => {
    const columns = [{ key: 'type', header: 'type' }];
    expect(recordDetails(columns, { type: 'A', extra: 'x' })).toEqual([]);
  });
});

describe('recordsTable', () => {
  it('has type, host, the declared ones of groupId, ttl and essential, and details', () => {
    const t = recordsTable(records('exampleservice.domainconnect.org/template1'));
    expect(t.columns.map((c) => c.key)).toEqual(['type', 'host', 'ttl', RECORD_DETAILS_KEY]);
    expect(recordsTable(records('mail.acme.example/mail')).columns.map((c) => c.key)).toEqual([
      'type',
      'host',
      'groupId',
      'ttl',
      RECORD_DETAILS_KEY,
    ]);
    expect(t.columns[0]!.header).toBe('type');
    expect(t.rows[0]![RECORD_DETAILS_KEY]).toBe('pointsTo: %ip%\nttl: 3600');
    expect(t.rows[0]!.pointsTo).toBe('%ip%');
  });

  it('keeps essential in its own column', () => {
    const source: Table = {
      title: 'Records',
      columns: [
        { key: 'essential', header: 'essential' },
        { key: 'type', header: 'type' },
      ],
      rows: [{ essential: 'OnApply', type: 'A' }],
      footer: null,
    };
    expect(recordsTable(source).columns.map((c) => c.key)).toEqual([
      'type',
      'essential',
      RECORD_DETAILS_KEY,
    ]);
  });

  it('leaves out type or host when the table lacks it', () => {
    const source: Table = {
      title: 'Records',
      columns: [
        { key: 'host', header: 'host' },
        { key: 'data', header: 'data' },
      ],
      rows: [{ host: '@', data: 'v=1' }],
      footer: null,
    };
    const t = recordsTable(source);
    expect(t.columns.map((c) => c.key)).toEqual(['host', RECORD_DETAILS_KEY]);
    expect(t.rows[0]![RECORD_DETAILS_KEY]).toBe('data: v=1');
  });

  it('keeps an empty table empty', () => {
    const source: Table = { title: 'Records', columns: [], rows: [], footer: null };
    expect(recordsTable(source).rows).toEqual([]);
  });
});

describe('historyDiffers', () => {
  const history = (n: number | null) => [{ supporting_providers: 1 }, { supporting_providers: n }];

  it('is true when the latest history point is not the current supporter count', () => {
    expect(historyDiffers(history(4), 3)).toBe(true);
    expect(historyDiffers(history(2), 3)).toBe(true);
  });

  it('is false when they agree, without history or with an unknown point', () => {
    expect(historyDiffers(history(3), 3)).toBe(false);
    expect(historyDiffers([], 3)).toBe(false);
    expect(historyDiffers(history(null), 3)).toBe(false);
  });

  it('flags the example template whose last sweep saw more supporters', () => {
    const file = card('exampleservice.domainconnect.org/template1');
    expect(
      historyDiffers(findTable(file, 'history')!.rows, findTable(file, 'supporters')!.rows.length),
    ).toBe(true);
  });
});

describe('tableTitle', () => {
  it('drops the "<spid>/<sid> - " prefix', () => {
    expect(tableTitle('a.example/x - Records - all', 'a.example', 'x')).toBe('Records - all');
  });

  it('keeps a title without the prefix', () => {
    expect(tableTitle('Records', 'a.example', 'x')).toBe('Records');
  });
});
