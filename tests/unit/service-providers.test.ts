import { describe, expect, it } from 'vitest';
import type { Row } from '../../src/lib/data/types';
import { findTable } from '../../src/lib/data/tables';
import { CHART_DEFAULT_COUNT, defaultShown, templateSeries } from '../../src/lib/service-providers';
import { exampleJson } from '../fixtures';

const card = (id: string) => exampleJson(`service-providers/${id}.json`);
const rows = (id: string, table: string) => findTable(card(id), table)!.rows;

describe('templateSeries', () => {
  it('splits the long-format history into one series per template, in table order', () => {
    const series = templateSeries(
      rows('mail.acme.example', 'templates'),
      rows('mail.acme.example', 'support_history'),
    );
    expect(series.map((s) => [s.serviceId, s.name])).toEqual(
      rows('mail.acme.example', 'templates').map((r) => [r.service_id, r.name]),
    );
    const points = (id: string) => series.find((s) => s.serviceId === id)!.points;
    expect(points('mail').map((p) => p.y)).toEqual([0, 1, 1, 2, 2]);
    expect(points('verify').map((p) => p.y)).toEqual([0, 1, 1, 1, 1, 2]);
  });

  it('leaves a sweep without a row as a gap, not a zero', () => {
    const mail = templateSeries(
      rows('mail.acme.example', 'templates'),
      rows('mail.acme.example', 'support_history'),
    ).find((s) => s.serviceId === 'mail');
    expect(mail!.points.map((p) => p.row.sweep_id)).toEqual([1, 4, 7, 5, 6]);
  });

  it('keeps templates without history and appends ones only in the history', () => {
    const templates: Row[] = [
      { service_id: 'a', name: 'A' },
      { service_id: 'b', name: null },
    ];
    const history: Row[] = [
      { started_at: '2026-01-01 00:00:00', service_id: 'c', supporting_providers: 2 },
      { started_at: '2026-01-01 00:00:00', service_id: 'a', supporting_providers: null },
    ];
    const series = templateSeries(templates, history);
    expect(series.map((s) => [s.serviceId, s.name, s.points.length])).toEqual([
      ['a', 'A', 0],
      ['b', 'b', 0],
      ['c', 'c', 1],
    ]);
  });
});

describe('defaultShown', () => {
  it(`takes the first ${CHART_DEFAULT_COUNT} templates with points`, () => {
    const series = Array.from({ length: 10 }, (_, i) => ({
      serviceId: `t${i}`,
      name: `T${i}`,
      points: i === 1 ? [] : [{ x: 0, y: i, row: {} }],
    }));
    expect(defaultShown(series)).toEqual(['t0', 't2', 't3', 't4', 't5', 't6', 't7']);
  });
});
