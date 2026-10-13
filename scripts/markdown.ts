/**
 * Markdown as HTML, rendered at build time: the vendored METHODOLOGY.md (`methodology.html`) and
 * the site's own texts in `content/` (`privacy.html`, `imprint.html`).
 */
import { Marked, Renderer, type Tokens } from 'marked';

/** GitHub's heading anchor: lower case, punctuation dropped, spaces as hyphens. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const marked = new Marked({
  renderer: {
    // The page header holds the h1.
    heading({ tokens, depth, text }: Tokens.Heading) {
      const level = Math.min(depth + 1, 6);
      return `<h${level} id="${headingId(text)}">${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    // Phone width: a wide table scrolls, the page does not.
    table(token: Tokens.Table) {
      return `<div class="table-wrapper">${Renderer.prototype.table.call(this, token).trim()}</div>\n`;
    },
    link({ href, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${escape(href).replace(/"/g, '&quot;')}"${external}>${text}</a>`;
    },
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escape(text);
    },
  },
});

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
