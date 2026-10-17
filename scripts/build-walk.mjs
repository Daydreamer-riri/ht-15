import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { viewerPhysicsPlugin } from './viewer-physics-plugin.mjs';

// Model preparation verifies the original SHA-256 before assembling the site.
for (const scene of ['honor', 'building2', 'terrace', 'cafeteria', 'alpine', 'hackathon', 'imported-scenes']) {
  execFileSync(process.execPath, [`realtrip/scripts/prepare-${scene}.mjs`], { stdio: 'inherit' });
}

await mkdir('dist', { recursive: true });
await rm('dist/walk', { recursive: true, force: true });
await cp('realtrip/public', 'dist/walk', { recursive: true });
await build({
  entryPoints: ['realtrip/src/walker.js'], bundle: true, format: 'esm',
  outfile: 'dist/walk/walker.bundle.js', external: ['node:worker_threads'],
  plugins: [viewerPhysicsPlugin],
});
await build({
  entryPoints: ['realtrip/photo-to-walk/walk-viewer/walk.js'], bundle: true,
  minify: true, format: 'esm', legalComments: 'linked',
  outfile: 'dist/walk/honor-corridor/walk.bundle.js', external: ['node:worker_threads'],
});
// Pages caches assets for ten minutes. A new document must not reuse an older
// viewer bundle, otherwise newly added scene links route to the default scene.
for (const entry of ['dist/walk/index.html', 'dist/walk/honor-corridor/index.html']) {
  let html = await readFile(entry, 'utf8');
  for (const [reference, attribute, asset] of html.matchAll(/(src|href)="([^"?#]+\.bundle\.(?:js|css))(?:\?[^"#]*)?"/g)) {
    const hash = createHash('sha256').update(await readFile(join(dirname(entry), asset))).digest('hex').slice(0, 12);
    html = html.replace(reference, `${attribute}="${asset}?v=${hash}"`);
  }
  await writeFile(entry, html);
}
console.log('RealTrip built → dist/walk/');
