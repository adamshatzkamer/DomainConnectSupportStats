import './styles.css';
import { mount, type Component } from 'svelte';
import { countView, startAnalytics } from './analytics';

/**
 * Mount one page's root component into `#app` and count the view. Every page entry calls this
 * once. `countsItself`: the page calls `countView` once its title is known (cards).
 */
export function mountPage<P extends Record<string, unknown>>(
  component: Component<P>,
  props: P,
  { countsItself = false } = {},
): void {
  const target = document.getElementById('app');
  if (!target) throw new Error('Page has no #app element');
  startAnalytics();
  mount(component, { target, props });
  if (!countsItself) countView();
}
