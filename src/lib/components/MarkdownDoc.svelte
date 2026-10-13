<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    /** Settles when the content above the document is in place: scroll to the linked section again. */
    ready?: Promise<unknown>;
  }

  let { ready }: Props = $props();

  /** The page's Markdown, baked in at build time as `<template id="document">` (vite.config.ts). */
  function showDocument(node: HTMLElement) {
    const template = document.getElementById('document');
    if (template instanceof HTMLTemplateElement) node.append(template.content.cloneNode(true));
    scrollToHash();
    void ready?.then(() => tick().then(scrollToHash));
  }

  /** The browser scrolled before the document was in place: scroll to the linked section. */
  function scrollToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }
</script>

<article class="panel markdown" use:showDocument></article>

<style>
  .markdown :global(h2) {
    font-size: 1.5rem;
  }

  .markdown :global(h4) {
    font-size: 1.05rem;
    color: var(--secondary-navy);
    margin-top: var(--spacing-md);
  }

  .markdown :global(h3) {
    margin-top: var(--spacing-lg);
  }

  .markdown :global(p),
  .markdown :global(ul),
  .markdown :global(ol),
  .markdown :global(.table-wrapper) {
    margin-bottom: var(--spacing-md);
  }

  .markdown :global(ul),
  .markdown :global(ol) {
    padding-left: var(--spacing-lg);
  }

  .markdown :global(pre) {
    overflow-x: auto;
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-md);
    background-color: var(--bg-light-gray);
    border-radius: var(--radius-sm);
  }

  .markdown :global(code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
  }

  .markdown :global(td) {
    vertical-align: top;
  }

  .markdown :global(td:first-child) {
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }

  /* Anchored headings clear the top of the window. */
  .markdown :global([id]) {
    scroll-margin-top: var(--spacing-md);
  }
</style>
