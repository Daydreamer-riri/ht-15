import { build } from 'esbuild';
import { mkdir, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { EXPERIENCE_URL } from '../src/presentation/config.js';

await rm('dist/presentation', { recursive: true, force: true });
await mkdir('dist/presentation/assets', { recursive: true });
for (const asset of ['mark.svg', 'sayram.jpg', 'baihaba.jpg', 'kanas.jpg']) {
  await copyFile(`src/presentation/assets/${asset}`, `dist/presentation/assets/${asset}`);
}
const html = await readFile('src/presentation/index.html', 'utf8');
await writeFile('dist/presentation/index.html', html.replace(/\s*<!-- Source-file preview[^]*?<base[^>]*data-source-preview>\n/, '\n'));
await copyFile('src/presentation/style.css', 'dist/presentation/presentation.css');
await QRCode.toFile('dist/presentation/assets/experience-qr.svg', EXPERIENCE_URL, {
  type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 360,
  color: { dark: '#123d35', light: '#ffffff' },
});
await build({ entryPoints: ['src/presentation/main.js'], bundle: true, minify: true, format: 'iife', outfile: 'dist/presentation/presentation.js' });
console.log('Presentation built → dist/presentation/');
