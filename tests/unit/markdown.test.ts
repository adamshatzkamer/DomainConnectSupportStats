import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { headingId, renderMarkdown } from '../../scripts/markdown';

describe('headingId', () => {
  it('builds GitHub anchors', () => {
    expect(headingId('2.2 Census and probability sample')).toBe('22-census-and-probability-sample');
    expect(headingId("7. Load on DNS providers' endpoints")).toBe(
      '7-load-on-dns-providers-endpoints',
    );
    expect(headingId('4.2 Deployments, providers and stacks')).toBe(
      '42-deployments-providers-and-stacks',
    );
  });
});

describe('renderMarkdown', () => {
  it('moves headings one level down, with ids', () => {
    const html = renderMarkdown('# Title\n\n## 1. Overview\n\n### 1.1 Terms\n');
    expect(html).toContain('<h2 id="title">Title</h2>');
    expect(html).toContain('<h3 id="1-overview">1. Overview</h3>');
    expect(html).toContain('<h4 id="11-terms">1.1 Terms</h4>');
  });

  it('wraps tables in a scroll container', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n');
    expect(html).toMatch(/^<div class="table-wrapper"><table>/);
    expect(html).toContain('</table></div>');
  });

  it('opens external links in a new tab, keeps anchors in the page', () => {
    const html = renderMarkdown('[x](https://example.com/) and [y](#2-population)\n');
    expect(html).toContain('<a href="https://example.com/" target="_blank" rel="noopener">x</a>');
    expect(html).toContain('<a href="#2-population">y</a>');
  });

  it('escapes raw HTML', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\ntext <b>bold</b>\n');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders the vendored METHODOLOGY.md with the anchors the site links to', () => {
    const html = renderMarkdown(readFileSync('contract/export/METHODOLOGY.md', 'utf8'));
    for (const id of [
      '21-zone-files',
      '22-census-and-probability-sample',
      '42-deployments-providers-and-stacks',
      '43-attribution-of-domains',
      '8-limitations',
    ])
      expect(html).toContain(`id="${id}"`);
  });
});
