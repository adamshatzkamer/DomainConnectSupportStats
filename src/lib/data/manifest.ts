import { encodeSegment } from './encode';
import type { FileKindName, Manifest } from './types';

/** The export `format_version` this site is written for (contract/README.md "Updating"). */
export const SUPPORTED_FORMAT_VERSION = 5;

const PLACEHOLDER = /\{([a-z_]+)\}/g;

export class UnsupportedFormatError extends Error {
  constructor(readonly formatVersion: unknown) {
    super(
      `Unsupported export format_version ${String(formatVersion)} (expected ${SUPPORTED_FORMAT_VERSION})`,
    );
    this.name = 'UnsupportedFormatError';
  }
}

export class UnknownFileKindError extends Error {
  constructor(readonly kind: string) {
    super(`The export manifest has no file kind "${kind}"`);
    this.name = 'UnknownFileKindError';
  }
}

export class MissingIdError extends Error {
  constructor(readonly placeholder: string) {
    super(`Missing id for {${placeholder}}`);
    this.name = 'MissingIdError';
  }
}

/** Throw unless the manifest's format is one this site understands. */
export function assertSupportedFormat(manifest: Pick<Manifest, 'format_version'>): void {
  if (manifest.format_version !== SUPPORTED_FORMAT_VERSION) {
    throw new UnsupportedFormatError(manifest.format_version);
  }
}

/**
 * The release-relative path of one file: the manifest's path template with each `{placeholder}`
 * replaced by its encoded raw id. Paths are never hard-coded; the manifest is authoritative.
 */
export function filePath(
  manifest: Manifest,
  kind: FileKindName,
  ids: Record<string, string | number> = {},
): string {
  const fileKind = manifest.files[kind];
  if (!fileKind) throw new UnknownFileKindError(kind);
  return fileKind.path.replace(PLACEHOLDER, (_, name: string) => {
    const id = ids[name];
    if (id === undefined || id === null || id === '') throw new MissingIdError(name);
    return encodeSegment(id);
  });
}
