import { describe, expect, it } from 'vitest';
import { fillContent, parseContentValues } from '../../scripts/content';

describe('parseContentValues', () => {
  it('is null when unset or blank', () => {
    expect(parseContentValues(undefined)).toBeNull();
    expect(parseContentValues('  ')).toBeNull();
  });

  it('reads a JSON object of strings', () => {
    expect(parseContentValues('{"name": "Jane Doe", "email": "jane@example.org"}')).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.org',
    });
  });

  it('rejects invalid JSON, non-objects and non-string values', () => {
    expect(() => parseContentValues('{name}')).toThrow(/CONTENT_VALUES/);
    expect(() => parseContentValues('["a"]')).toThrow(/object/);
    expect(() => parseContentValues('{"phone": 123}')).toThrow(/phone/);
  });
});

describe('fillContent', () => {
  it('replaces every {{ key }}, with or without spaces', () => {
    expect(fillContent('{{ name }}, {{name}}; {{  name  }}', { name: 'Jane' }, 'x.md')).toBe(
      'Jane, Jane; Jane',
    );
  });

  it('takes keys with spaces', () => {
    expect(fillContent('{{ FULL NAME }}', { 'FULL NAME': 'Jane Doe' }, 'x.md')).toBe('Jane Doe');
  });

  it('inserts values literally', () => {
    expect(fillContent('{{ a }}', { a: '$& $1' }, 'x.md')).toBe('$& $1');
  });

  it('leaves placeholders without values', () => {
    expect(fillContent('{{ name }}', null, 'x.md')).toBe('{{ name }}');
  });

  it('fails on a placeholder without a value when values are given', () => {
    expect(() =>
      fillContent('{{ name }} {{ phone }} {{ city }}', { name: 'J' }, 'imprint.md'),
    ).toThrow('imprint.md: no value in CONTENT_VALUES for phone, city');
  });
});
