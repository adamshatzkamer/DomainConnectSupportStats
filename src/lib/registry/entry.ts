/**
 * A DNS provider registry entry as the site reads it (contract/registry/schema/provider.schema.json).
 * Entries come from a third-party repository: every field is read defensively, unknown keys are
 * ignored, and a flag that is not `true` or `false` is unknown (`null`).
 */

export type Flag = boolean | null;

export interface Contact {
  type: 'email' | 'url' | 'other';
  value: string;
  label: string | null;
}

export interface Link {
  title: string;
  url: string;
}

export interface RegistryEntry {
  providerId: string;
  name: string;
  url: string | null;
  logo: string | null;
  documentation: Link[];
  technicalContacts: Contact[];
  onboarding: {
    mode: 'automatic' | 'on-request' | null;
    documentationUrl: string | null;
    contacts: Contact[];
    usesPartner: Flag;
    cost: Flag;
    requirements: {
      signedTemplatesOnly: Flag;
      warnPhishingRejected: Flag;
      signingKeyPublished: Flag;
    };
    notes: string | null;
  };
  features: Record<FeatureKey, Flag>;
  notes: string | null;
}

/** Feature flags in display order: dotted path under `features`, label, group. */
export const FEATURES = [
  ['syncFlow', 'Synchronous flow', 'Flows'],
  ['syncRedirectUri', 'redirect_uri in the synchronous flow', 'Flows'],
  ['asyncFlow', 'Asynchronous flow (OAuth)', 'Flows'],
  ['asyncRevert', 'Revert in the asynchronous flow', 'Flows'],
  ['templateStateTracking', 'Applied templates tracked', 'Flows'],
  ['templates.txtConflictMatching', 'txtConflictMatchingMode / Prefix', 'Templates'],
  ['templates.variablesInNumberFields', 'Variables in TTL, priority, weight, port', 'Templates'],
  ['templates.multiInstance', 'multiInstance', 'Templates'],
  ['templates.sharedNames', 'sharedProviderName / sharedServiceName', 'Templates'],
  ['templates.essential', 'Record attribute essential', 'Templates'],
  ['recordTypes.spfm', 'SPFM', 'Record types'],
  ['recordTypes.custom', 'Custom RR types', 'Record types'],
  ['recordTypes.apexCname', 'APEXCNAME', 'Record types'],
  ['recordTypes.redir301', 'REDIR301', 'Record types'],
  ['recordTypes.redir302', 'REDIR302', 'Record types'],
  ['nonStandard.cnameFlattening', 'CNAME flattening (CNAME on the apex)', 'Non-standard'],
] as const;

export type FeatureKey = (typeof FEATURES)[number][0];

/** The entry is not an object with a string `providerId` and `name`. */
export class InvalidEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEntryError';
  }
}

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : {};
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

function flag(v: unknown): Flag {
  return typeof v === 'boolean' ? v : null;
}

function at(root: Obj, path: string): unknown {
  return path.split('.').reduce<unknown>((o, key) => obj(o)[key], root);
}

function contacts(v: unknown): Contact[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((c) => {
    const o = obj(c);
    const value = str(o.value);
    const type = o.type === 'email' || o.type === 'url' ? o.type : 'other';
    return value ? [{ type, value, label: str(o.label) }] : [];
  });
}

function links(v: unknown): Link[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((l) => {
    const o = obj(l);
    const url = str(o.url);
    return url ? [{ title: str(o.title) ?? url, url }] : [];
  });
}

export function parseEntry(json: unknown): RegistryEntry {
  const root = obj(json);
  const providerId = str(root.providerId);
  const name = str(root.name);
  if (!providerId || !name)
    throw new InvalidEntryError('Registry entry without providerId or name');

  const onboarding = obj(root.onboarding);
  const requirements = obj(onboarding.requirements);
  const features = obj(root.features);

  return {
    providerId,
    name,
    url: str(root.url),
    logo: str(root.logo),
    documentation: links(root.documentation),
    technicalContacts: contacts(obj(root.contacts).technical),
    onboarding: {
      mode:
        onboarding.mode === 'automatic' || onboarding.mode === 'on-request'
          ? onboarding.mode
          : null,
      documentationUrl: str(onboarding.documentationUrl),
      contacts: contacts(onboarding.contacts),
      usesPartner: flag(onboarding.usesPartner),
      cost: flag(onboarding.cost),
      requirements: {
        signedTemplatesOnly: flag(requirements.signedTemplatesOnly),
        warnPhishingRejected: flag(requirements.warnPhishingRejected),
        signingKeyPublished: flag(requirements.signingKeyPublished),
      },
      notes: str(onboarding.notes),
    },
    features: Object.fromEntries(FEATURES.map(([key]) => [key, flag(at(features, key))])) as Record<
      FeatureKey,
      Flag
    >,
    notes: str(root.notes),
  };
}

/** `registry.json` written by the deploy's bundle step: where the entries come from. */
export interface RegistrySource {
  repository: string;
  commit: string;
}

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT = /^[0-9a-f]{7,40}$/;

export function parseSource(json: unknown): RegistrySource | null {
  const o = obj(json);
  const repository = str(o.repository);
  const commit = str(o.commit);
  return repository && commit && REPOSITORY.test(repository) && COMMIT.test(commit)
    ? { repository, commit }
    : null;
}
