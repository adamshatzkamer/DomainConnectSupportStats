/**
 * Validation, bundling and vendoring of a DNS provider registry checkout against the vendored
 * registry contract (contract/registry/), shared by the CLIs, the contract tests and the dev
 * server. Run by Node's type stripping: import only extension-qualified, dependency-free modules
 * from `src/`.
 */
import { Ajv2020 } from 'ajv/dist/2020.js';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { decodeSegment, encodeSegment } from '../src/lib/data/encode.ts';
import { entryPath, registryPath } from '../src/lib/registry/path.ts';

export { entryPath };

export const CONTRACT_DIR = resolve(import.meta.dirname, '../contract/registry');
export const REGISTRY_SCHEMA = join(CONTRACT_DIR, 'schema/provider.schema.json');
/** The golden copy of the test registry: the fixture of every test layer. */
export const EXAMPLE_REGISTRY_DIR = join(CONTRACT_DIR, 'examples');
/** The dev registry: the test registry repository as git submodule. */
export const DEV_REGISTRY_DIR = resolve(import.meta.dirname, '../registry');

export type LogoFormat = 'svg' | 'png' | 'jpg';

export interface Image {
  format: LogoFormat;
  bytes: Buffer;
}

export interface RegistryEntryFile {
  providerId: string;
  /** Registry-relative path of the entry. */
  file: string;
  /** Its logo: decoded when embedded, the address when a URL. */
  logo?: Image | { url: string };
}

export interface RegistryReport {
  entries: RegistryEntryFile[];
  errors: string[];
}

function jsonFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return jsonFilesUnder(full);
    return entry.name.endsWith('.json') ? [full] : [];
  });
}

export function loadRegistrySchema(schemaFile = REGISTRY_SCHEMA) {
  // Formats are not checked; the schema's patterns are.
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  return ajv.compile(JSON.parse(readFileSync(schemaFile, 'utf8')));
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff];
/** XML declaration, comments and whitespace, then the `svg` root element. */
const SVG = /^\uFEFF?(\s|<\?xml[^>]*\?>|<!--[\s\S]*?-->)*<svg[\s>/]/;

/** The image format of `bytes` by its signature, or null when not SVG, PNG or JPEG. */
export function imageFormat(bytes: Buffer): LogoFormat | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(PNG)) return 'png';
  if (starts(JPG)) return 'jpg';
  return SVG.test(bytes.subarray(0, 4096).toString('utf8')) ? 'svg' : null;
}

/** An embedded logo's image: base64, then gzip; throws when that fails or the format differs. */
export function decodeLogo(logo: { format: string; data: string }): Image {
  const bytes = gunzipSync(Buffer.from(logo.data, 'base64'));
  const format = imageFormat(bytes);
  if (format !== logo.format)
    throw new Error(`image is ${format ?? 'unknown'}, not ${logo.format}`);
  return { format, bytes };
}

type Entry = Record<string, unknown> & { providerId: string };

function logoOf(entry: Entry): RegistryEntryFile['logo'] {
  const { logo } = entry;
  if (typeof logo === 'string') return { url: logo };
  return logo ? decodeLogo(logo as { format: string; data: string }) : undefined;
}

/**
 * Validate a registry directory: every `providers/**.json` against the schema, at the path its
 * `providerId` determines, with an embedded logo that decodes to its format.
 */
export function validateRegistry(dir: string, validate = loadRegistrySchema()): RegistryReport {
  const errors: string[] = [];
  const entries: RegistryEntryFile[] = [];
  const providers = join(dir, 'providers');
  if (!existsSync(providers)) return { entries, errors: ['providers/: missing'] };

  for (const full of jsonFilesUnder(providers)) {
    const rel = relative(dir, full).split(sep).join('/');
    let entry: Entry;
    try {
      entry = JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: invalid JSON (${(e as Error).message})`);
      continue;
    }
    if (!validate(entry)) {
      for (const err of validate.errors ?? [])
        errors.push(`${rel}: ${err.instancePath || '/'} ${err.message}`);
      continue;
    }
    const expected = entryPath(entry.providerId);
    if (rel !== expected) {
      errors.push(`${rel}: providerId ${entry.providerId} belongs at ${expected}`);
      continue;
    }
    let logo: RegistryEntryFile['logo'];
    try {
      logo = logoOf(entry);
    } catch (e) {
      errors.push(`${rel}: logo: ${(e as Error).message}`);
      continue;
    }
    entries.push({ providerId: entry.providerId, file: rel, ...(logo ? { logo } : {}) });
  }
  return { entries, errors };
}

/**
 * The upstream entries copied into the golden copy: every field and an SVG logo
 * (`provider.example`), PNG logos with on-request onboarding (`cloudflare.com`, `ionos.com`), a
 * stack of several deployments (`plesk.com`), automatic onboarding (`domainchief`), a JPG logo
 * (`vercel.com`), no logo and no onboarding (`aruba.it`). The first three are stacks of the
 * example export.
 */
export const FIXTURE_PROVIDER_IDS = [
  'provider.example',
  'cloudflare.com',
  'ionos.com',
  'plesk.com',
  'domainchief',
  'vercel.com',
  'aruba.it',
] as const;

/**
 * Replace the registry contract in `contractDir` with a registry checkout's `README.md` (as
 * `REGISTRY_FORMAT.md`), `schema/` and the `FIXTURE_PROVIDER_IDS` entries (into `examples/`),
 * unchanged. Returns the contract-relative paths written.
 */
export function vendorRegistry(checkout: string, contractDir: string): string[] {
  const files: [string, string][] = [
    ['README.md', 'REGISTRY_FORMAT.md'],
    ...readdirSync(join(checkout, 'schema')).map((f): [string, string] => [
      `schema/${f}`,
      `schema/${f}`,
    ]),
    ...FIXTURE_PROVIDER_IDS.map((id): [string, string] => [
      entryPath(id),
      `examples/${entryPath(id)}`,
    ]),
  ];
  const missing = files.filter(([from]) => !existsSync(join(checkout, from)));
  if (missing.length)
    throw new Error(`missing in ${checkout}: ${missing.map(([f]) => f).join(', ')}`);

  rmSync(join(contractDir, 'schema'), { recursive: true, force: true });
  rmSync(join(contractDir, 'examples'), { recursive: true, force: true });
  for (const [from, to] of files) {
    mkdirSync(dirname(join(contractDir, to)), { recursive: true });
    copyFileSync(join(checkout, from), join(contractDir, to));
  }
  return files.map(([, to]) => to);
}

/** Where the registry was checked out from, written to `registry.json` for the site. */
export interface RegistrySource {
  repository: string;
  commit: string;
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const LOGO_MAX_BYTES = 1024 * 1024;
const LOGO_TIMEOUT_MS = 10_000;
const LOGO_TYPES: Record<string, LogoFormat> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Download a logo URL: https only, at most 1 MB, an SVG, PNG or JPEG matching its content type. */
export async function fetchLogo(url: string, fetchFn: Fetch): Promise<Image> {
  if (!url.startsWith('https://')) throw new Error('not https');
  const response = await fetchFn(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(LOGO_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  const format = LOGO_TYPES[type];
  if (!format) throw new Error(`content type ${type || 'missing'}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > LOGO_MAX_BYTES) throw new Error(`larger than ${LOGO_MAX_BYTES} bytes`);
  if (imageFormat(bytes) !== format) throw new Error(`image is not ${format}`);
  return { format, bytes };
}

/** The entry as the site reads it: `logo` is the file name of the published logo, or absent. */
export function bundledEntry(entry: Entry, logo: LogoFormat | null): Entry {
  const rest = { ...entry };
  delete rest.logo;
  return logo ? { ...rest, logo: `${entry.providerId}.${logo}` } : rest;
}

/**
 * Publish the validated entries of `dir` into `<distDir>/registry/` at the paths the site reads:
 * `<a>/<b>/<encoded providerId>.json` (`bundledEntry`) and its logo next to it (embedded logos
 * decoded, URL logos downloaded), plus `registry.json` with `source`. A logo that cannot be
 * downloaded is left out with a warning. Returns the published paths; nothing else in the
 * checkout is published.
 */
export async function bundleRegistry(
  dir: string,
  entries: RegistryEntryFile[],
  distDir: string,
  source: RegistrySource,
  fetchFn: Fetch = (url, init) => fetch(url, init),
): Promise<{ published: string[]; warnings: string[] }> {
  const target = join(distDir, 'registry');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const published: string[] = [];
  const warnings: string[] = [];
  const publish = (out: string, content: Buffer | string) => {
    mkdirSync(dirname(join(target, out)), { recursive: true });
    writeFileSync(join(target, out), content);
    published.push(out);
  };
  for (const { providerId, file, logo } of entries) {
    let image: Image | null = null;
    if (logo && 'url' in logo) {
      try {
        image = await fetchLogo(logo.url, fetchFn);
      } catch (e) {
        warnings.push(`${providerId}: logo ${logo.url}: ${(e as Error).message}`);
      }
    } else if (logo) image = logo;
    const entry = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Entry;
    const folder = registryPath(providerId);
    publish(
      folder + encodeSegment(`${providerId}.json`),
      JSON.stringify(bundledEntry(entry, image?.format ?? null), null, 2) + '\n',
    );
    if (image) publish(folder + encodeSegment(`${providerId}.${image.format}`), image.bytes);
  }
  writeFileSync(join(target, 'registry.json'), JSON.stringify(source) + '\n');
  published.push('registry.json');
  return { published, warnings };
}

/**
 * A file of the bundle, made from the checkout `dir` on request (dev and preview servers):
 * `path` is `<a>/<b>/<encoded name>`, the entry as bundled or its embedded logo. URL logos are
 * not downloaded. Null when there is no such file.
 */
export function servedRegistryFile(
  dir: string,
  path: string,
): { body: Buffer; type: 'json' | LogoFormat } | null {
  const segments = path.split('/');
  if (segments.length !== 3 || segments.some((s) => s === '' || s.startsWith('.'))) return null;
  const [a, b, name] = segments as [string, string, string];
  const match = /^(.+)\.(json|svg|png|jpg)$/.exec(decodeSegment(name));
  if (!match) return null;
  const [, providerId, type] = match as unknown as [string, string, 'json' | LogoFormat];
  if (registryPath(providerId) !== `${a}/${b}/`) return null;
  const file = join(dir, entryPath(providerId));
  if (!existsSync(file)) return null;
  let entry: Entry;
  let logo: RegistryEntryFile['logo'];
  try {
    entry = JSON.parse(readFileSync(file, 'utf8'));
    logo = logoOf(entry);
  } catch {
    return null;
  }
  const image = logo && 'format' in logo ? logo : null;
  if (type === 'json')
    return {
      body: Buffer.from(JSON.stringify(bundledEntry(entry, image?.format ?? null))),
      type,
    };
  return image?.format === type ? { body: image.bytes, type } : null;
}
