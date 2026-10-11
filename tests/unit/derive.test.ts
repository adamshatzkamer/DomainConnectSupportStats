import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { deriveEcosystem, deriveLeaderboards } from '../../scripts/derive';
import { EXAMPLE_DIR } from '../fixtures';

describe('deriveLeaderboards on the example export', () => {
  const derived = deriveLeaderboards(EXAMPLE_DIR);

  it("carries the release's generated_at", () => {
    expect(derived.generated_at).toBe('2026-10-01T00:00:00Z');
  });

  it("names the export's first sweep", () => {
    expect(derived.first_sweep).toEqual({ sweep_id: 1, started_at: '2026-03-02 02:00:00' });
  });

  it('lists the first sweep with support per DNS provider, newest first', () => {
    expect(derived.first_support).toEqual([
      {
        dns_provider_id: 5,
        sweep_id: 4,
        started_at: '2026-06-02 02:00:00',
        supported_templates: 1,
      },
      {
        dns_provider_id: 3,
        sweep_id: 2,
        started_at: '2026-03-10 02:00:00',
        supported_templates: 1,
      },
    ]);
  });
});

describe('deriveLeaderboards on an edited copy', () => {
  let dir: string;
  const copy = () => {
    dir = mkdtempSync(join(tmpdir(), 'release-'));
    cpSync(EXAMPLE_DIR, dir, { recursive: true });
  };
  const history = (rel: string, rows: Record<string, unknown>[] | undefined) => {
    const json = JSON.parse(readFileSync(join(dir, rel), 'utf8'));
    if (rows) json.tables.support_history.rows = rows;
    else delete json.tables.support_history;
    writeFileSync(join(dir, rel), JSON.stringify(json));
  };
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('skips a card without support_history', () => {
    copy();
    history('dns-providers/5.json', undefined);
    expect(deriveLeaderboards(dir).first_support.map((r) => r.dns_provider_id)).toEqual([3]);
  });

  it('orders ties by dns_provider_id and ignores rows after the first support', () => {
    copy();
    const rows = [
      { sweep_id: 1, started_at: '2026-03-02 02:00:00', supported_templates: 0, change: 0 },
      { sweep_id: 4, started_at: '2026-06-02 02:00:00', supported_templates: 2, change: 2 },
      { sweep_id: 6, started_at: '2026-09-02 02:00:00', supported_templates: 0, change: -2 },
    ];
    history('dns-providers/5.json', rows);
    history('dns-providers/4.json', rows);
    expect(
      deriveLeaderboards(dir).first_support.map((r) => [r.dns_provider_id, r.sweep_id]),
    ).toEqual([
      [4, 4],
      [5, 4],
      [3, 2],
    ]);
  });

  it('has no first sweep and no rows when no card has history', () => {
    copy();
    for (const id of [1, 2, 3, 4, 5, 6]) history(`dns-providers/${id}.json`, []);
    expect(deriveLeaderboards(dir)).toMatchObject({ first_sweep: null, first_support: [] });
  });

  it('refuses a release whose card has another generated_at', () => {
    copy();
    const rel = 'dns-providers/3.json';
    const json = JSON.parse(readFileSync(join(dir, rel), 'utf8'));
    json.generated_at = '2026-09-01T00:00:00Z';
    writeFileSync(join(dir, rel), JSON.stringify(json));
    expect(() => deriveLeaderboards(dir)).toThrow(/dns-providers\/3\.json: generated_at/);
  });
});

describe('deriveEcosystem', () => {
  let dir: string | undefined;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));
  const copy = (): string => {
    dir = mkdtempSync(join(tmpdir(), 'release-'));
    cpSync(EXAMPLE_DIR, dir, { recursive: true });
    return dir;
  };
  const edit = (rel: string, change: (json: Record<string, unknown>) => void) => {
    const json = JSON.parse(readFileSync(join(dir!, rel), 'utf8'));
    change(json);
    writeFileSync(join(dir!, rel), JSON.stringify(json));
  };

  it('weighs supported templates by domain share per full sweep, smaller runs counted in', () => {
    const derived = deriveEcosystem(EXAMPLE_DIR);
    expect(derived.generated_at).toBe('2026-10-01T00:00:00Z');
    expect(derived.ecosystem.map((r) => [r.sweep_id, r.started_at])).toEqual([
      [1, '2026-03-02 02:00:00'],
      [4, '2026-06-02 02:00:00'],
      [6, '2026-09-02 02:00:00'],
    ]);
    // Sweep 1 window: DNS provider 3's support from sweep 2 counts.
    const values = derived.ecosystem.map((r) => r.templates_per_domain);
    expect(values[0]).toBeCloseTo((3 * 33.333333 + 1 * 7.5 + 1 * 2.083333) / 100, 5);
    expect(values[1]).toBeCloseTo((3 * 33.333333 + 2 * 7.5 + 2.083333 + 16.666667) / 100, 5);
    expect(values[2]).toBeCloseTo((3 * 33.333333 + 2 * 7.5 + 2.083333 + 2 * 16.666667) / 100, 5);
  });

  it('leaves out a DNS provider without a domain share', () => {
    copy();
    edit('dns-providers.json', (j) => {
      const t = (j.tables as Record<string, { rows: Record<string, unknown>[] }>).dns_providers!;
      for (const r of t.rows) if (r.dns_provider_id === 1) r.domains_pct = null;
    });
    expect(deriveEcosystem(dir!).ecosystem[0]?.templates_per_domain).toBeCloseTo(0.095833, 5);
  });

  it('is null without a domain-share import', () => {
    copy();
    edit('manifest.json', (j) => (j.share_import = null));
    expect(deriveEcosystem(dir!).ecosystem.map((r) => r.templates_per_domain)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('refuses a release whose card has another generated_at', () => {
    copy();
    edit('dns-providers/2.json', (j) => (j.generated_at = '2026-09-01T00:00:00Z'));
    expect(() => deriveEcosystem(dir!)).toThrow(/dns-providers\/2\.json: generated_at/);
  });
});
