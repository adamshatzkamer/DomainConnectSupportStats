/**
 * Publish a validated DNS provider registry checkout into the built site, at `<distDir>/registry/`,
 * logos decoded or downloaded, with `registry.json` naming its repository and commit. Refuses an
 * invalid registry; a logo that cannot be downloaded is left out with a warning.
 * Usage: node scripts/bundle-registry.ts <registryDir> <distDir> <owner/name> <commit>
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { bundleRegistry, validateRegistry } from './registry.ts';

const [registryArg, distArg, repository, commit] = process.argv.slice(2);
if (!registryArg || !distArg || !repository || !commit) {
  console.error(
    'usage: node scripts/bundle-registry.ts <registryDir> <distDir> <owner/name> <commit>',
  );
  process.exit(2);
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[0-9a-f]{7,40}$/.test(commit)) {
  console.error(`invalid repository ${repository} or commit ${commit}`);
  process.exit(2);
}
const registryDir = resolve(registryArg);
const distDir = resolve(distArg);
if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`${distDir} has no index.html: run the build first`);
  process.exit(2);
}

const { entries, errors } = validateRegistry(registryDir);
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`refusing to bundle ${registryDir}: ${errors.length} error(s)`);
  process.exit(1);
}
const { published, warnings } = await bundleRegistry(registryDir, entries, distDir, {
  repository,
  commit,
});
for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(
  `bundled ${published.length} file(s) from ${registryDir} into ${join(distDir, 'registry')}`,
);
