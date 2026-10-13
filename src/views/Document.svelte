<script lang="ts">
  import Layout from '../lib/components/Layout.svelte';
  import MarkdownDoc from '../lib/components/MarkdownDoc.svelte';

  interface Props {
    /** Page name (file name without `.html`). */
    current: string;
  }

  let { current }: Props = $props();
</script>

<Layout {current} annotated={false}>
  <MarkdownDoc />
</Layout>
