import { describe, expect, it } from 'vitest';
import { pageTitle } from '../../src/lib/title';

describe('pageTitle', () => {
  it('names the entity, its kind and the site', () => {
    expect(pageTitle('Plesk', 'Stack')).toBe('Plesk - Stack - Domain Connect Support Statistics');
  });
});
