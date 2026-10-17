import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { experiences, sceneHref } from '../src/sky-soho/experience.js';
import { versionAssets } from './version-assets.mjs';

for (const [directory, entry] of [['route-3d', 'route'], ['sky-soho', 'sky-soho']]) {
  const template = await readFile(directory === 'sky-soho' ? 'src/sky-soho/index.html' : 'src/atlas/index.html', 'utf8');
  const output = `dist/${directory}`;
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await build({
    entryPoints: [`src/${directory}/main.js`], bundle: true, minify: true,
    format: 'esm', legalComments: 'linked', outfile: `${output}/${entry}.bundle.js`,
  });
  const sceneLinks = experiences.map((scene, index) => `<a class="scene-card" href="${sceneHref(scene.sceneId)}" aria-label="进入${scene.name}实景探索"><span class="scene-number">${String(index + 1).padStart(2, '0')}</span><span class="scene-copy"><strong>${scene.name}</strong><small>${scene.caption}</small></span><span class="scene-arrow" aria-hidden="true">↗</span></a>`).join('\n          ');
  const html = template.replaceAll('ENTRY', entry).replace('<!-- SCENE_LINKS -->', sceneLinks);
  await writeFile(`${output}/index.html`, await versionAssets(html, output));
  await copyFile('node_modules/three/LICENSE', `${output}/THREE-LICENSE.txt`);
  console.log(`Travel planet built → ${output}/`);
}
