import { describe, expect, it } from 'vitest';
import {
  assertSupportedFormat,
  filePath,
  MissingIdError,
  UnknownFileKindError,
  UnsupportedFormatError,
} from '../../src/lib/data/manifest';
import { exampleManifest } from '../fixtures';

describe('filePath', () => {
  const manifest = exampleManifest();

  it('returns a list path unchanged', () => {
    expect(filePath(manifest, 'overview')).toBe('overview.json');
    expect(filePath(manifest, 'dns_providers')).toBe('dns-providers.json');
  });

  it('fills card placeholders with encoded raw ids', () => {
    expect(filePath(manifest, 'dns_provider', { dns_provider_id: 42 })).toBe(
      'dns-providers/42.json',
    );
    expect(filePath(manifest, 'stack', { provider_id: 'plesk.com' })).toBe('stacks/plesk.com.json');
    // EXPORT_FORMAT.md: the card of template `Mail` of service provider `Acme.example`.
    expect(
      filePath(manifest, 'template', { service_provider_id: 'Acme.example', service_id: 'Mail' }),
    ).toBe('templates/~41cme.example/~4dail.json');
  });

  it('uses the path template from the manifest, not a hard-coded one', () => {
    const moved = {
      ...manifest,
      files: {
        ...manifest.files,
        stack: { ...manifest.files.stack!, path: 'v2/stacks/{provider_id}.json' },
      },
    };
    expect(filePath(moved, 'stack', { provider_id: 'x' })).toBe('v2/stacks/x.json');
  });

  it('rejects a missing or empty id', () => {
    expect(() => filePath(manifest, 'template', { service_provider_id: 'a' })).toThrow(
      MissingIdError,
    );
    expect(() => filePath(manifest, 'stack', { provider_id: '' })).toThrow(MissingIdError);
  });

  it('rejects a file kind the manifest does not have', () => {
    const files = { ...manifest.files };
    delete files.overview;
    expect(() => filePath({ ...manifest, files }, 'overview')).toThrow(UnknownFileKindError);
  });
});

describe('assertSupportedFormat', () => {
  it('accepts format_version 2 and rejects others', () => {
    expect(() => assertSupportedFormat({ format_version: 2 })).not.toThrow();
    expect(() => assertSupportedFormat({ format_version: 1 })).toThrow(UnsupportedFormatError);
    expect(() => assertSupportedFormat({ format_version: 3 })).toThrow(UnsupportedFormatError);
  });
});
