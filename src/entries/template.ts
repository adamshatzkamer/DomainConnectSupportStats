import Template from '../views/Template.svelte';
import { mountPage } from '../lib/mount';

mountPage(Template, {}, { countsItself: true });
