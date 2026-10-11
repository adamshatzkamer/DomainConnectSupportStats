import { describe, expect, it } from 'vitest';
import { enumTexts, FEATURE_GROUPS, FEATURES, label } from '../../src/lib/registry/schema';

describe('label', () => {
  it('reads title and description, through arrays and $ref', () => {
    expect(label('onboarding.cost')).toEqual({
      title: 'Charged',
      description: 'Onboarding is charged.',
    });
    expect(label('onboarding.partners.url').title).toBe('Website');
    expect(label('contacts.technical')).toEqual({
      title: 'Technical contacts',
      description: 'Technical contact.',
    });
  });

  it('falls back to the key for a field the schema lacks', () => {
    expect(label('onboarding.unknownField')).toEqual({ title: 'unknownField', description: null });
  });
});

describe('FEATURE_GROUPS', () => {
  it('lists the flags under features first, then one group per object, in schema order', () => {
    expect(FEATURE_GROUPS.map((g) => g.key)).toEqual([
      null,
      'templates',
      'recordTypes',
      'settings',
      'nonStandard',
    ]);
    expect(FEATURE_GROUPS[0]?.features.map((f) => f.key)).toEqual([
      'syncFlow',
      'syncRedirectUri',
      'asyncFlow',
      'asyncRevert',
      'templateStateTracking',
    ]);
  });

  it('marks list features', () => {
    expect(FEATURES.filter((f) => f.list).map((f) => f.key)).toEqual(['settings.nonStandard']);
    expect(FEATURES.find((f) => f.key === 'settings.windowSize')).toMatchObject({
      title: 'Window size',
      list: false,
    });
  });
});

describe('enumTexts', () => {
  it('maps each value to its text in the description', () => {
    expect(enumTexts('onboarding.mode')).toEqual({
      automatic: 'Templates merged into the Templates repository are deployed without a request',
      'on-request': 'Service providers request onboarding through the onboarding contacts',
      other: 'Described in the mode description',
    });
  });

  it('is empty for a field without an enum', () => {
    expect(enumTexts('onboarding.unknownField')).toEqual({});
  });

  it('reads an enum through arrays and $ref', () => {
    expect(enumTexts('contacts.technical.type')).toEqual({
      email: 'Value is an e-mail address',
      url: 'Value is a web page',
      form: 'Value is the URL of an online request form',
      other: 'Free text',
    });
  });
});
