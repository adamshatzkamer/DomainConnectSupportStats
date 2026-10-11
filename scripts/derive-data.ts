/**
 * Write the derived data of an export release into `<outDir>/`: `leaderboards.json`
 * and `ecosystem.json`.
 * Usage: node scripts/derive-data.ts [releaseDir] [outDir]
 * releaseDir defaults to DATA_DIR, else the contract's example export; outDir to DERIVED_DIR, else
 * `.derived`. The deploy writes into
 * `dist/data/derived/` after bundling the release; `vite dev`/`preview` serve `.derived/` there.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  ECOSYSTEM_FILE,
  LEADERBOARDS_FILE,
  deriveEcosystem,
  deriveLeaderboards,
} from './derive.ts';
import { EXAMPLE_EXPORT_DIR } from './export-release.ts';

const [
  releaseArg = process.env.DATA_DIR ?? EXAMPLE_EXPORT_DIR,
  outArg = process.env.DERIVED_DIR ?? '.derived',
] = process.argv.slice(2);
const releaseDir = resolve(releaseArg);
const outDir = resolve(outArg);

const write = (rel: string, data: unknown) => {
  const path = join(outDir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
};

const leaderboards = deriveLeaderboards(releaseDir);
write(LEADERBOARDS_FILE, leaderboards);
write(ECOSYSTEM_FILE, deriveEcosystem(releaseDir));
console.log(
  `derived ${LEADERBOARDS_FILE} and ${ECOSYSTEM_FILE} ` +
    `from ${releaseDir} into ${outDir}: ` +
    `${leaderboards.first_support.length} DNS provider(s) with a first support`,
);
