import satori from 'satori';
import { OpCard } from '@/components/Playground';
import { FONT_FAMILY_NORMAL, loadFonts } from './font';

export const toPngConfig = { fitTo: { mode: 'zoom', value: 2 } } as const;

export async function gen() {
  const fonts = await loadFonts();
  const fontsConfig = [
    {
      name: FONT_FAMILY_NORMAL,
      data: fonts.notoSansSC_regular!,
      weight: 400 as const,
    },
    {
      name: FONT_FAMILY_NORMAL,
      data: fonts.notoSansSC_bold!,
      weight: 600 as const,
    },
  ];

  const svg = await satori(
    <OpCard />,
    {
      width: 620,
      height: 934,
      fonts: fontsConfig,
    },
  );

  // return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const resvgJS = new resvg.Resvg(svg, { ...toPngConfig });
  const pngData = resvgJS.render(); // Output PNG data, Uint8Array
  const pngBuffer = pngData.asPng();
  return pngBuffer; // Return the PNG buffer
}

export async function copyImage() {
  try {
    const data = await gen();
    const blob = new Blob([data], { type: 'image/png' });
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob,
    });
    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    console.error(error);
    throw new Error('复制失败，请手动下载图片');
  }
}

export async function downloadImage() {
  const data = await gen();
  const blob = new Blob([data], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'op_card.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
