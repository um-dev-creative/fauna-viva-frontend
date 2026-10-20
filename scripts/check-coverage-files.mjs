// `ng test` (karma) only puts in the coverage report the files that some spec imports, so a component nobody tests would
// simply be missing and the percentage would look better than the truth. This fails when a source file is not in the report.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const lcov = readFileSync(join(root, 'coverage/fauna-viva-frontend/lcov.info'), 'utf8');
const reported = new Set([...lcov.matchAll(/^SF:(.+)$/gm)].map((m) => m[1].split(sep).join('/').replace(/^.*?(src\/)/, '$1')));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

// type-only files compile to nothing and have no statements to report
const TYPE_ONLY = /\/models\/.*\.model\.ts$/;
const IGNORED = /(\.spec\.ts|src\/main\.ts|src\/environments\/.*|src\/testing\/.*)$/;

const missing = walk(join(root, 'src'))
  .map((f) => relative(root, f).split(sep).join('/'))
  .filter((f) => f.endsWith('.ts') && !IGNORED.test(f) && !TYPE_ONLY.test('/' + f))
  .filter((f) => !reported.has(f));

if (missing.length > 0) {
  console.error(`\n${missing.length} source file(s) are not covered by any spec (so they are missing from the coverage report):`);
  missing.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log(`coverage report lists every source file (${reported.size}).`);
