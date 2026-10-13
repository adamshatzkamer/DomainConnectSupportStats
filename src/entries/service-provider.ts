import ServiceProvider from '../views/ServiceProvider.svelte';
import { mountPage } from '../lib/mount';

mountPage(ServiceProvider, {}, { countsItself: true });
