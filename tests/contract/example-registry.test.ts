import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bundleRegistry,
  decodeLogo,
  EXAMPLE_REGISTRY_DIR,
  entryPath,
  FIXTURE_PROVIDER_IDS,
  imageFormat,
  loadRegistrySchema,
  servedRegistryFile,
  validateRegistry,
} from '../../scripts/registry';

const validate = loadRegistrySchema();

const SVG = Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const embed = (format: string, bytes: Buffer) => ({
  format,
  data: gzipSync(bytes).toString('base64'),
});

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, 'utf8'));

describe('example registry', () => {
  it('is valid and holds the fixture selection', () => {
    const { entries, errors } = validateRegistry(EXAMPLE_REGISTRY_DIR, validate);
    expect(errors).toEqual([]);
    expect(entries.map((e) => e.providerId).sort()).toEqual([...FIXTURE_PROVIDER_IDS].sort());
    const logos = Object.fromEntries(
      entries.map((e) => [e.providerId, e.logo && 'format' in e.logo ? e.logo.format : null]),
    );
    expect(logos).toMatchObject({
      'provider.example': 'svg',
      'cloudflare.com': 'png',
      'vercel.com': 'jpg',
      'aruba.it': null,
    });
  });
});

describe('registry schema', () => {
  const entry = (extra: Record<string, unknown>) => ({ providerId: 'x', name: 'X', ...extra });

  it('needs providerId and name only, and ignores unknown keys', () => {
    expect(validate({ providerId: 'x', name: 'X', futureKey: 1 })).toBe(true);
    expect(validate({ providerId: 'x' })).toBe(false);
    expect(validate({ name: 'X' })).toBe(false);
  });

  it('takes true, false and null as booleans', () => {
    for (const value of [true, false, null])
      expect(validate(entry({ features: { syncFlow: value } }))).toBe(true);
    expect(validate(entry({ features: { syncFlow: 'yes' } }))).toBe(false);
  });

  it('rejects an unknown onboarding mode, a bad contact and a non-http URL', () => {
    expect(validate(entry({ onboarding: { mode: 'sometimes' } }))).toBe(false);
    expect(
      validate(
        entry({ onboarding: { mode: 'on-request', contacts: [{ type: 'email', value: 'x' }] } }),
      ),
    ).toBe(false);
    expect(validate(entry({ url: 'javascript:alert(1)' }))).toBe(false);
  });

  it('takes a logo URL or an embedded logo, not a file name', () => {
    expect(validate(entry({ logo: 'https://x.example/logo.svg' }))).toBe(true);
    expect(validate(entry({ logo: embed('png', PNG) }))).toBe(true);
    expect(validate(entry({ logo: 'x.svg' }))).toBe(false);
    expect(validate(entry({ logo: { format: 'gif', data: 'H4sI' } }))).toBe(false);
  });
});

describe('imageFormat and decodeLogo', () => {
  it('recognises SVG, PNG and JPEG', () => {
    expect(imageFormat(SVG)).toBe('svg');
    expect(imageFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('svg');
    expect(imageFormat(PNG)).toBe('png');
    expect(imageFormat(JPG)).toBe('jpg');
    expect(imageFormat(Buffer.from('GIF89a'))).toBeNull();
    expect(imageFormat(Buffer.from('<html><svg/></html>'))).toBeNull();
  });

  it('decodes gzip and base64 and checks the format', () => {
    expect(decodeLogo(embed('png', PNG))).toEqual({ format: 'png', bytes: PNG });
    expect(() => decodeLogo(embed('svg', PNG))).toThrow('not svg');
    expect(() => decodeLogo({ format: 'png', data: 'H4sIbroken' })).toThrow();
  });
});

describe('validateRegistry on a corrupted copy', () => {
  let dir: string;
  const copy = () => {
    dir = mkdtempSync(join(tmpdir(), 'registry-'));
    cpSync(EXAMPLE_REGISTRY_DIR, dir, { recursive: true });
    return dir;
  };
  const write = (rel: string, json: unknown) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), JSON.stringify(json));
  };
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reports a missing providers folder', () => {
    rmSync(join(copy(), 'providers'), { recursive: true });
    expect(validateRegistry(dir, validate).errors).toEqual(['providers/: missing']);
  });

  it('reports an entry at the wrong path', () => {
    copy();
    write('providers/c/f/cloudflare.com.json', { providerId: 'cloudflare.com', name: 'C' });
    write('providers/1/a/1And1.json', { providerId: '1and1', name: '1&1' });
    expect(validateRegistry(dir, validate).errors).toEqual(
      expect.arrayContaining([
        'providers/c/f/cloudflare.com.json: providerId cloudflare.com belongs at providers/c/l/cloudflare.com.json',
        'providers/1/a/1And1.json: providerId 1and1 belongs at providers/1/a/1and1.json',
      ]),
    );
  });

  it('accepts an entry at the path of its providerId', () => {
    copy();
    write(entryPath('X'), { providerId: 'X', name: 'X' });
    expect(validateRegistry(dir, validate).errors).toEqual([]);
  });

  it('reports an embedded logo that does not decode or does not match its format', () => {
    copy();
    write(entryPath('a'), { providerId: 'a', name: 'A', logo: embed('svg', PNG) });
    write(entryPath('b'), { providerId: 'b', name: 'B', logo: { format: 'png', data: 'H4sIAA' } });
    const errors = validateRegistry(dir, validate).errors;
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^providers\/a\/_\/a\.json: logo: .*not svg/);
    expect(errors[1]).toMatch(/^providers\/b\/_\/b\.json: logo: /);
  });

  it('reports a schema violation and invalid JSON', () => {
    copy();
    const rel = 'providers/p/l/plesk.com.json';
    const json = readJson(join(dir, rel));
    delete json.name;
    write(rel, json);
    writeFileSync(join(dir, 'providers/i/o/ionos.com.json'), '{');
    const errors = validateRegistry(dir, validate).errors.join('\n');
    expect(errors).toMatch(/plesk\.com\.json: \/ must have required property 'name'/);
    expect(errors).toMatch(/ionos\.com\.json: invalid JSON/);
  });
});

describe('bundleRegistry', () => {
  let dist: string;
  afterEach(() => rmSync(dist, { recursive: true, force: true }));
  const source = { repository: 'Domain-Connect/DnsProviders', commit: 'abc1234' };
  const offline = () => Promise.reject(new Error('offline'));

  /** A checkout in `dist/checkout` with `entries`, validated. */
  function checkout(entries: Record<string, unknown>[]) {
    dist = mkdtempSync(join(tmpdir(), 'dist-'));
    const dir = join(dist, 'checkout');
    for (const e of entries) {
      const file = join(dir, entryPath(e.providerId as string));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify(e));
    }
    const report = validateRegistry(dir, validate);
    expect(report.errors).toEqual([]);
    return { dir, entries: report.entries };
  }

  it('publishes entries, decoded logos named by the entry, and registry.json', async () => {
    dist = mkdtempSync(join(tmpdir(), 'dist-'));
    const { entries } = validateRegistry(EXAMPLE_REGISTRY_DIR, validate);
    const { published, warnings } = await bundleRegistry(
      EXAMPLE_REGISTRY_DIR,
      entries,
      dist,
      source,
      offline,
    );
    expect(warnings).toEqual([]);
    expect(published).toEqual(
      expect.arrayContaining([
        'p/r/provider.example.json',
        'p/r/provider.example.svg',
        'v/e/vercel.com.json',
        'v/e/vercel.com.jpg',
        'a/r/aruba.it.json',
        'registry.json',
      ]),
    );
    expect(published).not.toContain('a/r/aruba.it.png');
    expect(readJson(join(dist, 'registry/registry.json'))).toEqual(source);

    const raw = readJson(join(EXAMPLE_REGISTRY_DIR, 'providers/v/e/vercel.com.json'));
    const bundled = readJson(join(dist, 'registry/v/e/vercel.com.json'));
    expect(bundled).toEqual({ ...raw, logo: 'vercel.com.jpg' });
    expect(readFileSync(join(dist, 'registry/v/e/vercel.com.jpg'))).toEqual(
      decodeLogo(raw.logo as { format: string; data: string }).bytes,
    );
    expect(readJson(join(dist, 'registry/a/r/aruba.it.json'))).not.toHaveProperty('logo');
  });

  it('downloads a logo URL', async () => {
    const { dir, entries } = checkout([
      { providerId: 'x', name: 'X', logo: 'https://x.example/logo' },
    ]);
    const requested: string[] = [];
    const fetchFn = (url: string) => {
      requested.push(url);
      return Promise.resolve(new Response(PNG, { headers: { 'Content-Type': 'image/png' } }));
    };
    const { published, warnings } = await bundleRegistry(dir, entries, dist, source, fetchFn);
    expect(requested).toEqual(['https://x.example/logo']);
    expect(warnings).toEqual([]);
    expect(published).toContain('x/_/x.png');
    expect(readFileSync(join(dist, 'registry/x/_/x.png'))).toEqual(PNG);
    expect(readJson(join(dist, 'registry/x/_/x.json')).logo).toBe('x.png');
  });

  it('publishes the entry without logo when the download fails or is refused', async () => {
    const cases: [string, () => Promise<Response>][] = [
      ['https://x.example/a', () => Promise.reject(new Error('timeout'))],
      ['https://x.example/b', () => Promise.resolve(new Response('', { status: 404 }))],
      [
        'https://x.example/c',
        () => Promise.resolve(new Response('<html/>', { headers: { 'Content-Type': 'text/html' } })),
      ],
      [
        'https://x.example/d',
        () => Promise.resolve(new Response(JPG, { headers: { 'Content-Type': 'image/png' } })),
      ],
      [
        'https://x.example/e',
        () =>
          Promise.resolve(
            new Response(Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]), {
              headers: { 'Content-Type': 'image/png' },
            }),
          ),
      ],
      ['http://x.example/f', () => Promise.resolve(new Response(PNG))],
    ];
    const { dir, entries } = checkout(
      cases.map(([url], i) => ({ providerId: `p${i}`, name: 'P', logo: url })),
    );
    const responses = Object.fromEntries(cases);
    const { published, warnings } = await bundleRegistry(dir, entries, dist, source, (url) =>
      responses[url]!(),
    );
    expect(warnings).toHaveLength(cases.length);
    expect(warnings[0]).toMatch(/^p0: logo https:\/\/x\.example\/a: /);
    expect(published.filter((p) => !p.endsWith('.json'))).toEqual([]);
    for (let i = 0; i < cases.length; i++)
      expect(readJson(join(dist, `registry/p/${i}/p${i}.json`))).not.toHaveProperty('logo');
  });

  it('encodes file names and replaces an earlier bundle', async () => {
    const { dir, entries } = checkout([
      { providerId: 'My Host', name: 'My Host', logo: embed('svg', SVG) },
    ]);
    mkdirSync(join(dist, 'registry'));
    writeFileSync(join(dist, 'registry/stale.json'), '{}');
    const { published } = await bundleRegistry(dir, entries, dist, source, offline);
    expect(published).toEqual(['m/y/~4dy~20~48ost.json', 'm/y/~4dy~20~48ost.svg', 'registry.json']);
    expect(readJson(join(dist, 'registry/m/y/~4dy~20~48ost.json')).logo).toBe('My Host.svg');
    expect(() => readFileSync(join(dist, 'registry/stale.json'))).toThrow();
  });
});

describe('servedRegistryFile', () => {
  it('serves an entry as bundled and its embedded logo, never a URL logo', () => {
    const vercel = servedRegistryFile(EXAMPLE_REGISTRY_DIR, 'v/e/vercel.com.json');
    expect(JSON.parse(vercel!.body.toString()).logo).toBe('vercel.com.jpg');
    expect(vercel!.type).toBe('json');
    expect(servedRegistryFile(EXAMPLE_REGISTRY_DIR, 'v/e/vercel.com.jpg')?.type).toBe('jpg');
    expect(servedRegistryFile(EXAMPLE_REGISTRY_DIR, 'v/e/vercel.com.png')).toBeNull();
    expect(servedRegistryFile(EXAMPLE_REGISTRY_DIR, 'a/r/aruba.it.png')).toBeNull();
    expect(servedRegistryFile(EXAMPLE_REGISTRY_DIR, 'x/_/x.json')).toBeNull();
    expect(servedRegistryFile(EXAMPLE_REGISTRY_DIR, '../../package.json')).toBeNull();
  });
});
