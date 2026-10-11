<script lang="ts">
  import { safeMailto, safeUrl } from '../links';
  import type { Contact } from '../registry/entry';

  let { contacts }: { contacts: Contact[] } = $props();

  function href(c: Contact): string | null {
    if (c.type === 'email') return safeMailto(c.value);
    return c.type === 'url' || c.type === 'form' ? safeUrl(c.value) : null;
  }
</script>

<ul>
  {#each contacts as c, i (i)}
    {@const link = href(c)}
    <li>
      {#if link}
        <a href={link} target="_blank" rel="nofollow noopener noreferrer">{c.label ?? c.value}</a>
      {:else}
        {c.label ? `${c.label}: ${c.value}` : c.value}
      {/if}
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    overflow-wrap: anywhere;
  }
</style>
