import { build } from 'esbuild';
import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { experiences, sceneHref } from '../src/sky-soho/experience.js';
import { icon } from '../src/atlas/icons.js';
import { versionAssets } from './version-assets.mjs';

// 标题字体：只保留 woff2，按 unicode-range 分片，浏览器只下载页面用到的字。两颗星球共用一份。
const fontCss = (await readFile('node_modules/@fontsource/noto-serif-sc/600.css', 'utf8'))
  .replace(/,\s*url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g, '')
  .replaceAll('./files/', '../atlas-fonts/');
await rm('dist/atlas-fonts', { recursive: true, force: true });
await cp('node_modules/@fontsource/noto-serif-sc/files', 'dist/atlas-fonts', { recursive: true, filter: file => !/\.woff$/.test(file) && (!/\.woff2$/.test(file) || /-600-normal\.woff2$/.test(file)) });

// 场景入口在 HTML 里直接生成，没有 WebGL 或 JavaScript 也能点进去。
// 图片是各场景的实景截图（由 /walk/ 渲染），属于本项目自己的画面。
const sceneLinks = experiences.map((scene, index) => [
  `<a class="scene-card" style="--i:${index}" data-scene="${scene.sceneId}" href="${sceneHref(scene.sceneId)}" aria-label="进入${scene.name}实景探索">`,
  `<img class="scene-photo" src="./assets/scenes/${scene.sceneId}${index ? '-s' : ''}.jpg" alt="${scene.name}的实景画面" width="${index ? 480 : 960}" height="${index ? 360 : 720}"${index ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`,
  `<span class="scene-copy"><strong>${scene.name}</strong><small>${scene.caption}</small>`,
  `</span><span class="scene-arrow">${icon('arrow')}</span></a>`,
].join('')).join('\n          ');

// 首屏唯一的主按钮：直接进入主会场
const primary = experiences[0];
const primaryAction = `<a class="btn btn-primary planet-cta" data-rise style="--d:2500" href="${sceneHref(primary.sceneId)}">走进${primary.name}${icon('arrow')}</a>`;

const mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0b1f27"/><circle cx="32" cy="34" r="17" fill="#14303a"/><path d="M15 34a17 17 0 0 0 34 0z" fill="#e9b44c"/><circle cx="32" cy="34" r="17" fill="none" stroke="#e8eee6" stroke-width="3"/></svg>\n';

for (const [directory, entry] of [['route-3d', 'route'], ['sky-soho', 'sky-soho']]) {
  const template = await readFile(directory === 'sky-soho' ? 'src/sky-soho/index.html' : 'src/atlas/index.html', 'utf8');
  const output = `dist/${directory}`;
  await rm(output, { recursive: true, force: true });
  await mkdir(`${output}/assets`, { recursive: true });
  await build({
    entryPoints: [`src/${directory}/main.js`], bundle: true, minify: true,
    format: 'esm', legalComments: 'linked', outfile: `${output}/${entry}.bundle.js`,
    external: ['*.woff2'],
  });
  // 在页面样式前插入共用的字体声明
  const bundleCss = `${output}/${entry}.bundle.css`;
  await writeFile(bundleCss, fontCss + await readFile(bundleCss, 'utf8'));
  if (directory === 'sky-soho') await cp('src/sky-soho/assets/scenes', `${output}/assets/scenes`, { recursive: true });
  await writeFile(`${output}/assets/mark.svg`, mark);
  const html = template.replaceAll('ENTRY', entry).replace('<!-- SCENE_LINKS -->', sceneLinks).replace('<!-- PRIMARY_ACTION -->', primaryAction);
  await writeFile(`${output}/index.html`, await versionAssets(html, output));
  await copyFile('node_modules/three/LICENSE', `${output}/THREE-LICENSE.txt`);
  console.log(`Travel planet built → ${output}/`);
}
