import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ExportClient,
  NotFoundError,
  ReleaseMismatchError,
  type Fetch,
} from '../../src/lib/data/load';
import { UnsupportedFormatError } from '../../src/lib/data/manifest';
import { EXAMPLE_DIR } from '../fixtures';

const BASE = 'https://stats.example/data/';

/** Serves the example export, with optional per-path overrides. */
function exampleFetch(overrides: Record<string, unknown> = {}): Fetch & { calls: string[] } {
  const calls: string[] = [];
  const fn = async (url: string) => {
    calls.push(url);
    const rel = decodeURIComponent(url.slice(BASE.length));
    if (rel in overrides) return new Response(JSON.stringify(overrides[rel]));
    const file = join(EXAMPLE_DIR, rel);
    return existsSync(file)
      ? new Response(readFileSync(file))
      : new Response('Not found', { status: 404 });
  };
  return Object.assign(fn, { calls });
}

describe('ExportClient', () => {
  it('reads the manifest once and builds file URLs from it', async () => {
    const fetchFn = exampleFetch();
    const client = new ExportClient(BASE, fetchFn);
    const stack = await client.file('stack', { provider_id: 'plesk.com' });
    await client.file('overview');
    expect(stack.tables.stack?.rows[0]?.name).toBe('Plesk');
    expect(fetchFn.calls.filter((u) => u.endsWith('manifest.json'))).toHaveLength(1);
    expect(fetchFn.calls).toContain(BASE + 'stacks/plesk.com.json');
  });

  it('reports an unknown id as NotFoundError', async () => {
    const client = new ExportClient(BASE, exampleFetch());
    await expect(client.file('dns_provider', { dns_provider_id: 999 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects an unsupported format_version', async () => {
    const manifest = JSON.parse(readFileSync(join(EXAMPLE_DIR, 'manifest.json'), 'utf8'));
    const client = new ExportClient(
      BASE,
      exampleFetch({ 'manifest.json': { ...manifest, format_version: 1 } }),
    );
    await expect(client.manifest()).rejects.toBeInstanceOf(UnsupportedFormatError);
  });

  it('never mixes files of two releases', async () => {
    const overview = JSON.parse(readFileSync(join(EXAMPLE_DIR, 'overview.json'), 'utf8'));
    const client = new ExportClient(
      BASE,
      exampleFetch({ 'overview.json': { ...overview, generated_at: '2027-01-01T00:00:00Z' } }),
    );
    await expect(client.file('overview')).rejects.toBeInstanceOf(ReleaseMismatchError);
  });

  it('reads the derived leaderboards of the same release', async () => {
    const leaderboards = {
      generated_at: '2026-10-01T00:00:00Z',
      first_sweep: null,
      first_support: [],
    };
    const fetchFn = exampleFetch({ 'derived/leaderboards.json': leaderboards });
    await expect(new ExportClient(BASE, fetchFn).leaderboards()).resolves.toEqual(leaderboards);
    expect(fetchFn.calls).toContain(BASE + 'derived/leaderboards.json');
  });

  it('rejects derived leaderboards of another release', async () => {
    const client = new ExportClient(
      BASE,
      exampleFetch({
        'derived/leaderboards.json': {
          generated_at: '2027-01-01T00:00:00Z',
          first_sweep: null,
          first_support: [],
        },
      }),
    );
    await expect(client.leaderboards()).rejects.toBeInstanceOf(ReleaseMismatchError);
  });

  it('reports missing derived leaderboards as NotFoundError', async () => {
    const client = new ExportClient(BASE, exampleFetch());
    await expect(client.leaderboards()).rejects.toBeInstanceOf(NotFoundError);
  });

  it('reads the derived ecosystem of the same release', async () => {
    const ecosystem = { generated_at: '2026-10-01T00:00:00Z', ecosystem: [] };
    const fetchFn = exampleFetch({ 'derived/ecosystem.json': ecosystem });
    await expect(new ExportClient(BASE, fetchFn).ecosystem()).resolves.toEqual(ecosystem);
  });
});
