import { describe, expect, it } from 'vitest';
import { EXAMPLE_REGISTRY_DIR, servedRegistryFile } from '../../scripts/registry';
import { InvalidEntryError, parseEntry, parseSource } from '../../src/lib/registry/entry';

/** A golden-copy entry as the deploy bundles it. */
const example = (path: string): unknown =>
  JSON.parse(servedRegistryFile(EXAMPLE_REGISTRY_DIR, path)!.body.toString());

describe('parseEntry', () => {
  it('reads every field of a full entry and ignores unknown keys', () => {
    const entry = parseEntry(example('p/r/provider.example.json'));
    expect(entry.name).toBe('Example DNS Provider');
    expect(entry.logo).toBe('provider.example.svg');
    expect(entry.documentation).toHaveLength(2);
    expect(entry.technicalContacts[0]).toEqual({
      type: 'email',
      value: 'dns-engineering@provider.example',
      label: 'DNS engineering',
    });
    expect(entry.onboarding.contacts[2]?.label).toBe('Existing partners');
    expect(entry.onboarding.requirements.signedTemplatesOnly).toBe(true);
    expect(entry.features.syncFlow).toBe(true);
    expect(entry.features.asyncRevert).toBe(false);
    expect(entry.features['templates.essential']).toBeNull();
    expect(entry.features['nonStandard.cnameFlattening']).toBe(false);
    expect(entry.features['settings.urlControlPanel']).toBe(true);
    expect(entry.featureLists['settings.nonStandard']).toEqual([
      {
        key: 'redirectSupported',
        description: 'Boolean; true when REDIR301/REDIR302 records can be applied for the domain.',
      },
    ]);
    expect(entry.exampleDomain).toBe('provider.example');
    expect(entry.onboarding.contacts[0]?.type).toBe('form');
    expect(entry.onboarding.agreementRequired).toBe(true);
    expect(entry.onboarding.agreementUrl).toBe(
      'https://partners.provider.example/domain-connect/terms',
    );
    expect(entry.onboarding.partners).toEqual([
      {
        name: 'Example Onboarding Partner',
        url: 'https://www.partner.example',
        contacts: [{ type: 'email', value: 'onboarding@partner.example', label: null }],
      },
    ]);
    expect(entry).not.toHaveProperty('links');
    expect(entry).not.toHaveProperty('consent');
  });

  it('reads an absent flag as unknown', () => {
    const entry = parseEntry(example('i/o/ionos.com.json'));
    expect(entry.onboarding.mode).toBe('on-request');
    expect(entry.onboarding.cost).toBeNull();
    expect(entry.features.asyncRevert).toBeNull();
    expect(entry.documentation).toEqual([]);
  });

  it('reads mode other with its description, an empty list as none, an absent one as unknown', () => {
    const entry = parseEntry({
      providerId: 'x',
      name: 'X',
      onboarding: { mode: 'other', modeDescription: 'By phone.', updateSchedule: 'daily' },
      features: { settings: { nonStandard: [] } },
    });
    expect(entry.onboarding.mode).toBe('other');
    expect(entry.onboarding.modeDescription).toBe('By phone.');
    expect(entry.onboarding.updateSchedule).toBe('daily');
    expect(entry.featureLists['settings.nonStandard']).toEqual([]);
    expect(
      parseEntry({ providerId: 'x', name: 'X' }).featureLists['settings.nonStandard'],
    ).toBeNull();
  });

  it('drops partners without a name and list items without a key', () => {
    const entry = parseEntry({
      providerId: 'x',
      name: 'X',
      onboarding: { partners: [{ url: 'https://p.example' }, { name: 'P' }] },
      features: { settings: { nonStandard: [{ description: 'd' }, { key: 'k' }] } },
    });
    expect(entry.onboarding.partners).toEqual([{ name: 'P', url: null, contacts: [] }]);
    expect(entry.featureLists['settings.nonStandard']).toEqual([{ key: 'k', description: null }]);
  });

  it('reads a flag that is not a boolean, and an unknown mode, as unknown', () => {
    const entry = parseEntry({
      providerId: 'x',
      name: 'X',
      onboarding: { mode: 'sometimes', cost: 'yes' },
      features: { syncFlow: 1, templates: 'all' },
    });
    expect(entry.onboarding.mode).toBeNull();
    expect(entry.onboarding.cost).toBeNull();
    expect(entry.features.syncFlow).toBeNull();
    expect(entry.features['templates.multiInstance']).toBeNull();
  });

  it('drops contacts and links without a value', () => {
    const entry = parseEntry({
      providerId: 'x',
      name: 'X',
      documentation: [{ title: 'No URL' }, 'text', { url: 'https://d.example' }],
      contacts: { technical: [{ type: 'email' }, { type: 'fax', value: '123' }] },
    });
    expect(entry.documentation).toEqual([{ title: 'https://d.example', url: 'https://d.example' }]);
    expect(entry.technicalContacts).toEqual([{ type: 'other', value: '123', label: null }]);
  });

  it('rejects an entry without providerId or name', () => {
    expect(() => parseEntry({ providerId: 'x' })).toThrow(InvalidEntryError);
    expect(() => parseEntry([])).toThrow(InvalidEntryError);
  });
});

describe('parseSource', () => {
  it('reads repository and commit', () => {
    expect(parseSource({ repository: 'Domain-Connect/DnsProviders', commit: 'abc1234' })).toEqual({
      repository: 'Domain-Connect/DnsProviders',
      commit: 'abc1234',
    });
  });

  it.each([
    {},
    { repository: 'a/b/c', commit: 'abc1234' },
    { repository: 'a/b', commit: 'main' },
    { repository: 'a/b"><script>', commit: 'abc1234' },
  ])('rejects %j', (json) => {
    expect(parseSource(json)).toBeNull();
  });
});
