/**
 * Replace contract/registry/ with a registry checkout: README.md as REGISTRY_FORMAT.md, schema/,
 * and the fixed selection of entries as examples/ (FIXTURE_PROVIDER_IDS).
 * Usage: node scripts/contract-registry.ts <registryCheckout>
 */
import { resolve } from 'node:path';
import { CONTRACT_DIR, vendorRegistry } from './registry.ts';

const [checkout] = process.argv.slice(2);
if (!checkout) {
  console.error('usage: node scripts/contract-registry.ts <registryCheckout>');
  process.exit(2);
}
const written = vendorRegistry(resolve(checkout), CONTRACT_DIR);
console.log(`copied ${written.length} file(s) into ${CONTRACT_DIR}`);
