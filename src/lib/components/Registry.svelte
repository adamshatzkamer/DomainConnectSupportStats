<script lang="ts">
  import { formatFlag } from '../format';
  import { links } from '../links';
  import { FEATURES, type Flag, type RegistryEntry } from '../registry/entry';

  interface Props {
    entry: RegistryEntry;
    /** The entry's file in the registry's repository, when the bundled source is known. */
    fileUrl: string | null;
    /** Set when the entry belongs to a stack of several deployments. */
    stack: { id: string; name: string } | null;
  }

  let { entry, fileUrl, stack }: Props = $props();
  const onboarding = $derived(entry.onboarding);

  const MODES = {
    automatic: 'Automatic: templates merged into the Templates repository are deployed',
    'on-request': 'On request',
  } as const;

  /** Onboarding flags with a known value. */
  const flags = $derived(
    (
      [
        ['Through a partner', onboarding.usesPartner],
        ['Charged', onboarding.cost],
        ['Signed templates only', onboarding.requirements.signedTemplatesOnly],
        ['warnPhishing rejected', onboarding.requirements.warnPhishingRejected],
        ['Signing key published', onboarding.requirements.signingKeyPublished],
      ] as const
    ).filter(([, value]) => value !== null),
  );
  const hasOnboarding = $derived(
    onboarding.mode !== null || flags.length > 0 || onboarding.notes !== null,
  );

  /** Feature groups with their features of known value; groups without any left out. */
  const groups = $derived(
    [...new Set(FEATURES.map(([, , group]) => group))]
      .map((group) => ({
        group,
        rows: FEATURES.filter(([key, , g]) => g === group && entry.features[key] !== null),
      }))
      .filter(({ rows }) => rows.length > 0),
  );
</script>

{#snippet flag(value: Flag)}
  <span class="flag">{formatFlag(value)}</span>
{/snippet}

{#if hasOnboarding || groups.length || entry.notes}
  <section class="panel" data-testid="registry">
    <h2>
      {#if stack}
        Registry entry of stack <a href={links.stack(stack.id)}>{stack.name}</a>
      {:else}
        Registry
      {/if}
    </h2>

    {#if hasOnboarding}
      <h3>Onboarding</h3>
      <dl class="record" data-testid="registry-onboarding">
        {#if onboarding.mode}
          <dt>Mode</dt>
          <dd>{MODES[onboarding.mode]}</dd>
        {/if}
        {#each flags as [label, value] (label)}
          <dt>{label}</dt>
          <dd>{@render flag(value)}</dd>
        {/each}
        {#if onboarding.notes}
          <dt>Notes</dt>
          <dd class="verbatim">{onboarding.notes}</dd>
        {/if}
      </dl>
    {/if}

    {#if groups.length}
      <h3>Features</h3>
      <div class="table-wrapper">
        <table data-testid="registry-features">
          <caption class="visually-hidden">Features</caption>
          <tbody>
            {#each groups as { group, rows } (group)}
              <tr class="group"><th colspan="2" scope="colgroup">{group}</th></tr>
              {#each rows as [key, label] (key)}
                <tr>
                  <th scope="row">{label}</th>
                  <td>{@render flag(entry.features[key])}</td>
                </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if entry.notes}
      <h3>Notes</h3>
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

  .source {
    margin: var(--spacing-md) 0 0;
  }
</style>
