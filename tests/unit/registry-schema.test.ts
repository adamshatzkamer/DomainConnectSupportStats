import { describe, expect, it } from 'vitest';
import { FEATURE_GROUPS, FEATURES, label } from '../../src/lib/registry/schema';

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
