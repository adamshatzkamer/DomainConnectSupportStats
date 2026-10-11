import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { entryPath, FIXTURE_PROVIDER_IDS, vendorRegistry } from '../../scripts/registry';

describe('vendorRegistry', () => {
  let root: string;
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(rel: string, content: string) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  }

  function checkout(ids: readonly string[]) {
    root = mkdtempSync(join(tmpdir(), 'vendor-'));
    write('checkout/README.md', '# Registry\n');
    write('checkout/schema/provider.schema.json', '{"type":"object"}\n');
    write('checkout/TERMS.md', 'terms\n');
    for (const id of ids) write(`checkout/${entryPath(id)}`, `{"providerId":"${id}"}\n`);
    write('contract/examples/providers/s/t/stale.json', '{}');
    write('contract/schema/old.schema.json', '{}');
    return { src: join(root, 'checkout'), dest: join(root, 'contract') };
  }

  it('copies README, schema and the fixture entries verbatim, and nothing else', () => {
    const { src, dest } = checkout([...FIXTURE_PROVIDER_IDS, 'not-selected.example']);
    const copied = vendorRegistry(src, dest);

    expect(readFileSync(join(dest, 'REGISTRY_FORMAT.md'), 'utf8')).toBe('# Registry\n');
    expect(readFileSync(join(dest, 'schema/provider.schema.json'), 'utf8')).toBe(
      '{"type":"object"}\n',
    );
    for (const id of FIXTURE_PROVIDER_IDS)
      expect(readFileSync(join(dest, 'examples', entryPath(id)), 'utf8')).toBe(
        `{"providerId":"${id}"}\n`,
      );
    expect(existsSync(join(dest, 'examples', entryPath('not-selected.example')))).toBe(false);
    expect(existsSync(join(dest, 'examples/providers/s/t/stale.json'))).toBe(false);
    expect(existsSync(join(dest, 'schema/old.schema.json'))).toBe(false);
    expect(existsSync(join(dest, 'TERMS.md'))).toBe(false);
    expect(copied).toHaveLength(2 + FIXTURE_PROVIDER_IDS.length);
  });

  it('refuses a checkout without a selected entry, leaving the contract unchanged', () => {
    const { src, dest } = checkout(FIXTURE_PROVIDER_IDS.slice(1));
    expect(() => vendorRegistry(src, dest)).toThrow(FIXTURE_PROVIDER_IDS[0]);
    expect(existsSync(join(dest, 'examples/providers/s/t/stale.json'))).toBe(true);
  });
});
