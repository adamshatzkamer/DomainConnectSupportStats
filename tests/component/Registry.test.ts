// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import CardTitle from '../../src/lib/components/CardTitle.svelte';
import Registry from '../../src/lib/components/Registry.svelte';
import RegistryContact from '../../src/lib/components/RegistryContact.svelte';
import { EXAMPLE_REGISTRY_DIR, servedRegistryFile } from '../../scripts/registry';
import { parseEntry } from '../../src/lib/registry/entry';

/** A golden-copy entry as the deploy bundles it. */
const example = (path: string) =>
  parseEntry(JSON.parse(servedRegistryFile(EXAMPLE_REGISTRY_DIR, path)!.body.toString()));

function feature(label: string): string | null {
  const row = within(screen.getByTestId('registry-features')).queryByText(label)?.closest('tr');
  return row?.querySelector('td')?.textContent?.trim() ?? null;
}

describe('CardTitle', () => {
  const children = createRawSnippet(() => ({ render: () => '<span>DNS provider 1</span>' }));

  it('shows the name, the small line and the logo once loaded', async () => {
    render(CardTitle, {
      name: 'Cloudflare',
      kind: 'DNS provider',
      logo: Promise.resolve({ url: './registry/c/l/cloudflare.com.svg', alt: 'Cloudflare' }),
      children,
    });
    expect(screen.getByRole('heading', { name: 'Cloudflare' })).toBeInTheDocument();
    expect(screen.getByText('DNS provider 1')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Cloudflare' })).toHaveAttribute(
      'src',
      './registry/c/l/cloudflare.com.svg',
    );
  });

  it('shows no image without a logo', () => {
    render(CardTitle, { name: 'Quiet Host', kind: 'DNS provider', children });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('has a share button for the whole card: the page link without an anchor', async () => {
    history.replaceState(null, '', '/stack.html?id=godaddy.com#coverage');
    render(CardTitle, { name: 'GoDaddy', kind: 'Stack', children });
    await fireEvent.click(screen.getByRole('button', { name: 'Share: GoDaddy' }));
    const bluesky = new URL(
      screen.getByRole('menuitem', { name: 'Bluesky' }).getAttribute('href')!,
    );
    expect(bluesky.searchParams.get('text')).toBe(
      'GoDaddy – Stack – Domain Connect support statistics ' +
        'http://localhost:3000/stack.html?id=godaddy.com',
    );
  });
});

describe('RegistryContact', () => {
  it('shows links and contacts', () => {
    render(RegistryContact, { entry: example('p/r/provider.example.json'), stack: null });
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://www.provider.example' })).toHaveAttribute(
      'rel',
      'nofollow noopener noreferrer',
    );
    expect(screen.getByRole('link', { name: 'DNS engineering' })).toHaveAttribute(
      'href',
      'mailto:dns-engineering@provider.example',
    );
    expect(screen.getByRole('link', { name: 'Domain Connect' })).toHaveAttribute(
      'href',
      'https://docs.provider.example/domain-connect',
    );
    expect(
      screen.getByRole('link', { name: 'domainconnect@provider.example' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'https://partners.provider.example/domain-connect/request',
      }),
    ).toHaveAttribute('href', 'https://partners.provider.example/domain-connect/request');
    expect(screen.getByText('Existing partners: Partner account manager')).toBeInTheDocument();
  });

  it('labels fields with the schema titles, descriptions on hover', () => {
    render(RegistryContact, { entry: example('p/r/provider.example.json'), stack: null });
    expect(screen.getByText('Technical contacts')).toHaveAttribute('title', 'Technical contact.');
    expect(screen.getByText('Onboarding process documentation')).toHaveAttribute(
      'title',
      'Documentation of the onboarding process.',
    );
    expect(screen.getByText('Website')).toHaveAttribute('title', 'Website.');
  });

  it('never links a URL or address that is not plain http(s) or e-mail', () => {
    render(RegistryContact, {
      entry: parseEntry({
        providerId: 'x',
        name: 'X',
        url: 'javascript:alert(1)',
        onboarding: { contacts: [{ type: 'email', value: 'a@b?x=<y>' }] },
      }),
      stack: null,
    });
    expect(screen.getByText('javascript:alert(1)').closest('a')).toBeNull();
    expect(screen.getByText('a@b?x=<y>').closest('a')).toBeNull();
  });

  it('leaves out unknown rows', () => {
    render(RegistryContact, { entry: example('i/o/ionos.com.json'), stack: null });
    expect(screen.getByText('Onboarding contacts')).toBeInTheDocument();
    expect(screen.queryByText('Documentation')).toBeNull();
    expect(screen.queryByText('Technical contacts')).toBeNull();
    expect(screen.queryByText('–')).toBeNull();
  });

  it('shows nothing for an entry without contact data', () => {
    const { container } = render(RegistryContact, {
      entry: parseEntry({ providerId: 'x', name: 'X' }),
      stack: null,
    });
    expect(container.querySelector('section')).toBeNull();
  });

  it('names and links the stack of several deployments', () => {
    render(RegistryContact, {
      entry: example('p/l/plesk.com.json'),
      stack: { id: 'plesk.com', name: 'Plesk' },
    });
    expect(screen.getByRole('heading', { name: /Contact of stack Plesk/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plesk' })).toHaveAttribute(
      'href',
      './stack.html?id=plesk.com',
    );
  });
});

describe('Registry', () => {
  it('shows onboarding facts, features and the repository link', () => {
    render(Registry, {
      entry: example('c/l/cloudflare.com.json'),
      fileUrl: 'https://github.com/o/r/blob/abc1234/providers/c/l/cloudflare.com.json',
      stack: null,
    });
    expect(screen.getByRole('heading', { name: 'Registry' })).toBeInTheDocument();
    expect(screen.getByTestId('registry-onboarding')).toHaveTextContent(
      'On request, through the onboarding contacts',
    );
    expect(feature('Synchronous flow')).toBe('yes');
    expect(feature('Asynchronous flow')).toBe('no');
    expect(feature('Revert in the asynchronous flow')).toBeNull();
    expect(screen.queryByText('–')).toBeNull();
    expect(screen.getByRole('link', { name: 'Entry in the registry repository' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/blob/abc1234/providers/c/l/cloudflare.com.json',
    );
  });

  it('shows every onboarding fact of a full entry, descriptions on hover', () => {
    render(Registry, { entry: example('p/r/provider.example.json'), fileUrl: null, stack: null });
    const onboarding = within(screen.getByTestId('registry-onboarding'));
    const value = (term: string) => onboarding.getByText(term).nextElementSibling?.textContent;
    expect(onboarding.getByText('Mode')).toHaveAttribute(
      'title',
      expect.stringContaining('on-request: service providers request onboarding'),
    );
    expect(value('Mode')).toBe('On request, through the onboarding contacts');
    expect(onboarding.getByText('On request, through the onboarding contacts')).toHaveAttribute(
      'title',
      'Service providers request onboarding through the onboarding contacts',
    );
    expect(value('Charged')).toBe('no');
    expect(value('Contract, agreement or T&C acceptance required')).toBe('yes');
    expect(onboarding.getByRole('link', { name: /domain-connect\/terms/ })).toHaveAttribute(
      'href',
      'https://partners.provider.example/domain-connect/terms',
    );
    expect(value('Uses a partner')).toBe('yes');
    const partners = within(screen.getByTestId('registry-partners'));
    expect(partners.getByRole('link', { name: 'Example Onboarding Partner' })).toHaveAttribute(
      'href',
      'https://www.partner.example/',
    );
    expect(partners.getByRole('link', { name: 'onboarding@partner.example' })).toHaveAttribute(
      'href',
      'mailto:onboarding@partner.example',
    );
    expect(value('Signed templates only')).toBe('yes');
    expect(value('warnPhishing rejected')).toBe('yes');
  });

  it('shows the update schedule of mode automatic', () => {
    render(Registry, { entry: example('d/o/domainchief.json'), fileUrl: null, stack: null });
    const onboarding = screen.getByTestId('registry-onboarding');
    expect(onboarding).toHaveTextContent('Automatic, no request needed');
    expect(onboarding).toHaveTextContent(/Update schedule\s*Compatible templates are imported/);
  });

  it('shows the description of mode other and the cost details', () => {
    render(Registry, {
      entry: parseEntry({
        providerId: 'x',
        name: 'X',
        onboarding: {
          mode: 'other',
          modeDescription: 'Ask your account manager.',
          cost: true,
          costDetails: 'Per template.',
        },
      }),
      fileUrl: null,
      stack: null,
    });
    const onboarding = screen.getByTestId('registry-onboarding');
    expect(onboarding).toHaveTextContent(
      /Mode\s*Other, see the description\s*Description\s*Ask your account manager\./,
    );
    expect(onboarding).toHaveTextContent(/Charged\s*yes\s*Details\s*Per template\./);
  });

  it('groups features by the schema, the group description on hover', () => {
    render(Registry, { entry: example('p/r/provider.example.json'), fileUrl: null, stack: null });
    expect(screen.getByText('Settings response')).toHaveAttribute(
      'title',
      expect.stringContaining('Optional properties of the settings response.'),
    );
    expect(screen.getByText('Control panel URL')).toHaveAttribute(
      'title',
      'urlControlPanel is returned.',
    );
    expect(feature('Control panel URL')).toBe('yes');
    expect(feature('Non-standard properties')).toBe(
      'redirectSupported: Boolean; true when REDIR301/REDIR302 records can be applied for the domain.',
    );
    expect(feature('CNAME flattening')).toBe('no');
  });

  it('shows an empty non-standard settings list as none', () => {
    render(Registry, { entry: example('a/r/aruba.it.json'), fileUrl: null, stack: null });
    expect(feature('Non-standard properties')).toBe('none');
  });

  it('shows the example domain, with the settings response link when given', () => {
    render(Registry, {
      entry: example('c/l/cloudflare.com.json'),
      fileUrl: null,
      stack: null,
      settingsUrl: 'https://api.example/v2/cloudflare.com/settings',
    });
    const example_ = screen.getByTestId('registry-example');
    expect(example_).toHaveTextContent('Example domain cloudflare.com (settings response)');
    expect(within(example_).getByRole('link', { name: 'settings response' })).toHaveAttribute(
      'href',
      'https://api.example/v2/cloudflare.com/settings',
    );
  });

  it('shows the example domain as text without a settings response link', () => {
    render(Registry, { entry: example('c/l/cloudflare.com.json'), fileUrl: null, stack: null });
    const example_ = screen.getByTestId('registry-example');
    expect(example_).toHaveTextContent('cloudflare.com');
    expect(within(example_).queryByRole('link')).toBeNull();
  });

  it('shows HTML in notes as text', () => {
    const { container } = render(Registry, {
      entry: parseEntry({
        providerId: 'x',
        name: 'X',
        notes: 'Use <script>alert(1)</script>',
        onboarding: { notes: 'Templates must <b>not</b> overwrite' },
      }),
      fileUrl: null,
      stack: null,
    });
    expect(screen.getByTestId('registry-notes')).toHaveTextContent('<script>alert(1)</script>');
    expect(screen.getByText(/Templates must <b>not<\/b> overwrite/)).toBeInTheDocument();
    expect(container.querySelector('script, b')).toBeNull();
  });

  it('names the stack of several deployments; leaves out unknown values', () => {
    render(Registry, {
      entry: example('p/l/plesk.com.json'),
      fileUrl: null,
      stack: { id: 'plesk.com', name: 'Plesk' },
    });
    expect(
      screen.getByRole('heading', { name: 'Registry entry of stack Plesk' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /registry repository/ })).toBeNull();
    expect(screen.getByTestId('registry-onboarding')).toHaveTextContent(
      'On request, through the onboarding contacts',
    );
    expect(screen.queryByText('Charged')).toBeNull();
    expect(feature('Asynchronous flow')).toBe('no');
    expect(feature('Revert in the asynchronous flow')).toBeNull();
    expect(screen.queryByText('Template features')).toBeNull();
  });

  it('leaves out onboarding and Features when nothing is known', () => {
    render(Registry, {
      entry: parseEntry({ providerId: 'x', name: 'X', notes: 'n', features: { syncFlow: null } }),
      fileUrl: null,
      stack: null,
    });
    expect(screen.queryByTestId('registry-onboarding')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Features' })).toBeNull();
    expect(screen.queryByTestId('registry-features')).toBeNull();
  });

  it('shows nothing for an entry without known details, even with a repository link', () => {
    const { container } = render(Registry, {
      entry: parseEntry({ providerId: 'x', name: 'X', features: { syncFlow: null } }),
      fileUrl: 'https://github.com/o/r/blob/abc1234/providers/x/x.json',
      stack: null,
    });
    expect(container.querySelector('section')).toBeNull();
  });
});
