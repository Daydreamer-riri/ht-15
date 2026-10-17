import { build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const template = await readFile('src/atlas/index.html', 'utf8');
for (const [directory, entry] of [['route-3d', 'route'], ['sky-soho', 'sky-soho']]) {
  const output = `dist/${directory}`;
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await build({
    entryPoints: [`src/${directory}/main.js`], bundle: true, minify: true,
    format: 'esm', legalComments: 'linked', outfile: `${output}/${entry}.bundle.js`,
  });
  await writeFile(`${output}/index.html`, template.replaceAll('ENTRY', entry));
  await copyFile('node_modules/three/LICENSE', `${output}/THREE-LICENSE.txt`);
  console.log(`Travel planet built → ${output}/`);
}
