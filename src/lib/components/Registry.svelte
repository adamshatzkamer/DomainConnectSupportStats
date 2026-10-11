<script lang="ts">
  import { formatFlag } from '../format';
  import { links } from '../links';
  import type { Flag, RegistryEntry } from '../registry/entry';
  import { FEATURE_GROUPS, label } from '../registry/schema';
  import ContactList from './ContactList.svelte';
  import ExternalLink from './ExternalLink.svelte';
  import RegistryTerm from './RegistryTerm.svelte';

  interface Props {
    entry: RegistryEntry;
    /** The entry's file in the registry's repository, when the bundled source is known. */
    fileUrl: string | null;
    /** Set when the entry belongs to a stack of several deployments. */
    stack: { id: string; name: string } | null;
    /** The settings response of the example domain, when the card's API is known. */
    settingsUrl?: string | null;
  }

  let { entry, fileUrl, stack, settingsUrl = null }: Props = $props();
  const onboarding = $derived(entry.onboarding);

  /** Requirement flags with a known value. */
  const requirements = $derived(
    (['signedTemplatesOnly', 'warnPhishingRejected', 'signingKeyPublished'] as const).filter(
      (key) => onboarding.requirements[key] !== null,
    ),
  );
  const hasOnboarding = $derived(
    onboarding.mode !== null ||
      onboarding.updateSchedule !== null ||
      onboarding.modeDescription !== null ||
      onboarding.cost !== null ||
      onboarding.costDetails !== null ||
      onboarding.agreementRequired !== null ||
      onboarding.agreementUrl !== null ||
      onboarding.usesPartner !== null ||
      onboarding.partners.length > 0 ||
      requirements.length > 0 ||
      onboarding.notes !== null,
  );

  /** Feature groups with their features of known value; groups without any left out. */
  const groups = $derived(
    FEATURE_GROUPS.map((group) => ({
      ...group,
      features: group.features.filter(({ key, list }) =>
        list ? entry.featureLists[key] != null : entry.features[key] != null,
      ),
    })).filter(({ features }) => features.length > 0),
  );
</script>

{#snippet flag(value: Flag)}
  <span class="flag">{formatFlag(value)}</span>
{/snippet}

{#snippet flagRow(path: string, value: Flag)}
  {#if value !== null}
    <RegistryTerm {path} />
    <dd>{@render flag(value)}</dd>
  {/if}
{/snippet}

{#snippet textRow(path: string, value: string | null)}
  {#if value}
    <RegistryTerm {path} />
    <dd class="verbatim">{value}</dd>
  {/if}
{/snippet}

{#if hasOnboarding || groups.length || entry.notes || entry.exampleDomain}
  <section class="panel" data-testid="registry">
    <h2>
      {#if stack}
        Registry entry of stack <a href={links.stack(stack.id)}>{stack.name}</a>
      {:else}
        Registry
      {/if}
    </h2>

    {#if entry.exampleDomain}
      <dl class="record" data-testid="registry-example">
        <RegistryTerm path="exampleDomain" />
        <dd>
          <span class="mono">{entry.exampleDomain}</span>
          {#if settingsUrl}
            (<ExternalLink url={settingsUrl} text="settings response" />)
          {/if}
        </dd>
      </dl>
    {/if}

    {#if hasOnboarding}
      <h3>{label('onboarding').title}</h3>
      <dl class="record" data-testid="registry-onboarding">
        {#if onboarding.mode}
          <RegistryTerm path="onboarding.mode" />
          <dd>{onboarding.mode}</dd>
        {/if}
        {@render textRow('onboarding.updateSchedule', onboarding.updateSchedule)}
        {@render textRow('onboarding.modeDescription', onboarding.modeDescription)}
        {@render flagRow('onboarding.cost', onboarding.cost)}
        {@render textRow('onboarding.costDetails', onboarding.costDetails)}
        {@render flagRow('onboarding.agreementRequired', onboarding.agreementRequired)}
        {#if onboarding.agreementUrl}
          <RegistryTerm path="onboarding.agreementUrl" />
          <dd><ExternalLink url={onboarding.agreementUrl} /></dd>
        {/if}
        {@render flagRow('onboarding.usesPartner', onboarding.usesPartner)}
        {#if onboarding.partners.length}
          <RegistryTerm path="onboarding.partners" />
          <dd>
            <ul class="plain" data-testid="registry-partners">
              {#each onboarding.partners as partner, i (i)}
                <li>
                  {#if partner.url}
                    <ExternalLink url={partner.url} text={partner.name} />
                  {:else}
                    {partner.name}
                  {/if}
                  {#if partner.contacts.length}
                    <ContactList contacts={partner.contacts} />
                  {/if}
                </li>
              {/each}
            </ul>
          </dd>
        {/if}
        {#each requirements as key (key)}
          {@render flagRow(`onboarding.requirements.${key}`, onboarding.requirements[key])}
        {/each}
        {@render textRow('onboarding.notes', onboarding.notes)}
      </dl>
    {/if}

    {#if groups.length}
      <h3>{label('features').title}</h3>
      <div class="table-wrapper">
        <table data-testid="registry-features">
          <caption class="visually-hidden">{label('features').title}</caption>
          <tbody>
            {#each groups as group (group.key)}
              {#if group.key !== null}
                <tr class="group">
                  <th
                    colspan="2"
                    scope="colgroup"
                    class:hint={group.description !== null}
                    title={group.description}>{group.title}</th
                  >
                </tr>
              {/if}
              {#each group.features as feature (feature.key)}
                {@const items = entry.featureLists[feature.key]}
                <tr>
                  <th
                    scope="row"
                    class:hint={feature.description !== null}
                    title={feature.description}>{feature.title}</th
                  >
                  <td>
                    {#if !feature.list}
                      {@render flag(entry.features[feature.key] ?? null)}
                    {:else if items?.length}
                      <ul class="plain">
                        {#each items as item, i (i)}
                          <li>
                            <span class="mono">{item.key}</span>{#if item.description}:
                              <span class="verbatim">{item.description}</span>{/if}
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      none
                    {/if}
                  </td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if entry.notes}
      <h3>{label('notes').title}</h3>
      <p class="verbatim" data-testid="registry-notes">{entry.notes}</p>
    {/if}

    {#if fileUrl}
      <p class="muted source">
        <a href={fileUrl} target="_blank" rel="noopener">Entry in the registry repository</a>
      </p>
    {/if}
  </section>
{/if}

<style>
  h3 {
    margin-top: var(--spacing-md);
  }

  .verbatim {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  table th[scope='row'] {
    font-weight: normal;
    text-align: left;
  }

  tr.group th {
    text-align: left;
    color: var(--text-secondary);
    padding-top: var(--spacing-sm);
  }

  .hint {
    cursor: help;
  }

  .source {
    margin: var(--spacing-md) 0 0;
  }
</style>
