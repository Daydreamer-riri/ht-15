import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Model preparation verifies the original SHA-256 before assembling the site.
for (const scene of ['honor', 'insta360', 'terrace', 'cafeteria', 'alpine', 'hackathon']) {
  execFileSync(process.execPath, [`realtrip/scripts/prepare-${scene}.mjs`], { stdio: 'inherit' });
}

await mkdir('dist', { recursive: true });
await rm('dist/walk', { recursive: true, force: true });
await cp('realtrip/public', 'dist/walk', { recursive: true });
await build({
  entryPoints: ['realtrip/src/walker.js'], bundle: true, format: 'esm',
  outfile: 'dist/walk/walker.bundle.js', external: ['node:worker_threads'],
});
await build({
  entryPoints: ['realtrip/photo-to-walk/walk-viewer/walk.js'], bundle: true,
  minify: true, format: 'esm', legalComments: 'linked',
  outfile: 'dist/walk/honor-corridor/walk.bundle.js', external: ['node:worker_threads'],
});
console.log('RealTrip built → dist/walk/');
