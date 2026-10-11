<script lang="ts">
  import { links } from '../links';
  import type { RegistryEntry } from '../registry/entry';
  import ContactList from './ContactList.svelte';
  import ExternalLink from './ExternalLink.svelte';

  interface Props {
    entry: RegistryEntry;
    /** Set when the entry belongs to a stack of several deployments. */
    stack: { id: string; name: string } | null;
  }

  let { entry, stack }: Props = $props();
  const onboarding = $derived(entry.onboarding);
  const known = $derived(
    entry.url !== null ||
      entry.documentation.length > 0 ||
      entry.technicalContacts.length > 0 ||
      onboarding.contacts.length > 0 ||
      onboarding.documentationUrl !== null,
  );
</script>

{#if known}
  <section class="panel" data-testid="registry-contact">
    <h2>
      {#if stack}
        Contact of stack <a href={links.stack(stack.id)}>{stack.name}</a>
      {:else}
        Contact
      {/if}
    </h2>
    <dl class="record">
      {#if entry.url}
        <dt>Website</dt>
        <dd><ExternalLink url={entry.url} /></dd>
      {/if}
      {#if entry.documentation.length}
        <dt>Documentation</dt>
        <dd>
          <ul class="plain">
            {#each entry.documentation as doc, i (i)}
              <li><ExternalLink url={doc.url} text={doc.title} /></li>
            {/each}
          </ul>
        </dd>
      {/if}
      {#if entry.technicalContacts.length}
        <dt>Technical contact</dt>
        <dd><ContactList contacts={entry.technicalContacts} /></dd>
      {/if}
      {#if onboarding.contacts.length}
        <dt>Onboarding contact</dt>
        <dd><ContactList contacts={onboarding.contacts} /></dd>
      {/if}
      {#if onboarding.documentationUrl}
        <dt>Onboarding process</dt>
        <dd><ExternalLink url={onboarding.documentationUrl} /></dd>
      {/if}
    </dl>
  </section>
{/if}
