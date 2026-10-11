/**
 * A DNS provider registry entry as the site reads it (contract/registry/schema/provider.schema.json).
 * Entries come from a third-party repository: every field is read defensively, unknown keys are
 * ignored, and a flag that is not `true` or `false` is unknown (`null`).
 */

import { FEATURES } from './schema';

export type Flag = boolean | null;

export interface Contact {
  type: 'email' | 'url' | 'form' | 'other';
  value: string;
  label: string | null;
}

export interface Link {
  title: string;
  url: string;
}

export interface Partner {
  name: string;
  url: string | null;
  contacts: Contact[];
}

/** An item of a list feature, e.g. a non-standard settings property. */
export interface ListItem {
  key: string;
  description: string | null;
}

export type Mode = 'automatic' | 'on-request' | 'other';

export interface RegistryEntry {
  providerId: string;
  name: string;
  url: string | null;
  exampleDomain: string | null;
  logo: string | null;
  documentation: Link[];
  technicalContacts: Contact[];
  onboarding: {
    mode: Mode | null;
    updateSchedule: string | null;
    modeDescription: string | null;
    documentationUrl: string | null;
    contacts: Contact[];
    cost: Flag;
    costDetails: string | null;
    agreementRequired: Flag;
    agreementUrl: string | null;
    usesPartner: Flag;
    partners: Partner[];
    requirements: {
      signedTemplatesOnly: Flag;
      warnPhishingRejected: Flag;
      signingKeyPublished: Flag;
    };
    notes: string | null;
  };
  /** Flag features by dotted path under `features` (schema `FEATURES`). */
  features: Record<string, Flag>;
  /** List features by dotted path; null = unknown, empty = none. */
  featureLists: Record<string, ListItem[] | null>;
  notes: string | null;
}

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
    const type =
      o.type === 'email' || o.type === 'url' || o.type === 'form' ? o.type : 'other';
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

function partners(v: unknown): Partner[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((p) => {
    const o = obj(p);
    const name = str(o.name);
    return name ? [{ name, url: str(o.url), contacts: contacts(o.contacts) }] : [];
  });
}

function listItems(v: unknown): ListItem[] | null {
  if (!Array.isArray(v)) return null;
  return v.flatMap((i) => {
    const o = obj(i);
    const key = str(o.key);
    return key ? [{ key, description: str(o.description) }] : [];
  });
}

const MODES: readonly unknown[] = ['automatic', 'on-request', 'other'] satisfies Mode[];

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
    exampleDomain: str(root.exampleDomain),
    logo: str(root.logo),
    documentation: links(root.documentation),
    technicalContacts: contacts(obj(root.contacts).technical),
    onboarding: {
      mode: MODES.includes(onboarding.mode) ? (onboarding.mode as Mode) : null,
      updateSchedule: str(onboarding.updateSchedule),
      modeDescription: str(onboarding.modeDescription),
      documentationUrl: str(onboarding.documentationUrl),
      contacts: contacts(onboarding.contacts),
      cost: flag(onboarding.cost),
      costDetails: str(onboarding.costDetails),
      agreementRequired: flag(onboarding.agreementRequired),
      agreementUrl: str(onboarding.agreementUrl),
      usesPartner: flag(onboarding.usesPartner),
      partners: partners(onboarding.partners),
      requirements: {
        signedTemplatesOnly: flag(requirements.signedTemplatesOnly),
        warnPhishingRejected: flag(requirements.warnPhishingRejected),
        signingKeyPublished: flag(requirements.signingKeyPublished),
      },
      notes: str(onboarding.notes),
    },
    features: Object.fromEntries(
      FEATURES.filter((f) => !f.list).map(({ key }) => [key, flag(at(features, key))]),
    ),
    featureLists: Object.fromEntries(
      FEATURES.filter((f) => f.list).map(({ key }) => [key, listItems(at(features, key))]),
    ),
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
