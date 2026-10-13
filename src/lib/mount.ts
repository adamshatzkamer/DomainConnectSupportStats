import './styles.css';
import { mount, type Component } from 'svelte';
import { startAnalytics } from './analytics';

/** Mount one page's root component into `#app` and count the view. Every page entry calls this once. */
export function mountPage<P extends Record<string, unknown>>(
  component: Component<P>,
  props: P,
): void {
  const target = document.getElementById('app');
  if (!target) throw new Error('Page has no #app element');
  mount(component, { target, props });
  startAnalytics();
}
