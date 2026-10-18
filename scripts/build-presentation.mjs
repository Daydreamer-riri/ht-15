import { build } from 'esbuild';
import { mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import { versionAssets } from './version-assets.mjs';

await rm('dist/presentation', { recursive: true, force: true });
await mkdir('dist/presentation/assets', { recursive: true });
await copyFile('src/presentation/assets/mark.svg', 'dist/presentation/assets/mark.svg');
// 顶栏「技术架构图」按钮展示的图片，产物里用 ASCII 文件名
await copyFile('src/assets/技术图.jpg', 'dist/presentation/assets/tech-diagram.jpg');
// 第三代演示视频（已压缩、faststart）与封面
for (const asset of ['demo.mp4', 'demo-poster.jpg']) await copyFile(`src/presentation/assets/${asset}`, `dist/presentation/assets/${asset}`);
// 图文版使用一日游星球卡片同一组实景截图
for (const scene of ['hackathon', 'terrace', 'cafeteria', 'building2', 'two-floor']) {
  await copyFile(`src/sky-soho/assets/scenes/${scene}.jpg`, `dist/presentation/assets/${scene}.jpg`);
}
const html = await readFile('src/presentation/index.html', 'utf8');
await copyFile('src/presentation/style.css', 'dist/presentation/presentation.css');
await build({ entryPoints: ['src/presentation/main.js'], bundle: true, minify: true, format: 'iife', outfile: 'dist/presentation/presentation.js' });
await writeFile('dist/presentation/index.html', await versionAssets(html.replace(/\s*<!-- Source-file preview[^]*?<base[^>]*data-source-preview>\n/, '\n'), 'dist/presentation'));
console.log('Presentation built → dist/presentation/');
