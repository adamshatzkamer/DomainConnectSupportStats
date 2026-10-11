<script lang="ts">
  import { label } from '../registry/schema';

  interface Props {
    /** Dotted path of the field in the registry schema. */
    path: string;
    /** Shown instead of the schema title. */
    text?: string;
  }

  let { path, text }: Props = $props();
  const field = $derived(label(path));
</script>

<dt class:hint={field.description !== null} title={field.description}>{text ?? field.title}</dt>

<style>
  .hint {
    cursor: help;
  }
</style>
