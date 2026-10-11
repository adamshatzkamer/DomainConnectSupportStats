<script lang="ts">
  import { label } from '../registry/schema';

  interface Props {
    /** Dotted path of the field in the registry schema. */
    path: string;
    /** Shown instead of the schema title. */
    text?: string;
    id?: string;
  }

  let { path, text, id }: Props = $props();
  const field = $derived(label(path));
</script>

<dt {id} class:hint={field.description !== null} title={field.description}>
  {text ?? field.title}
</dt>

<style>
  .hint {
    cursor: help;
  }
  dt[id] {
    scroll-margin-top: 2rem;
  }
</style>
