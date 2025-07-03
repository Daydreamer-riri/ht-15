import { OpCard } from '@/components/Playground';
import { nameAtom, store } from '@/store';
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

  const satori = (await import('satori')).default;

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
  a.download = `op_${store.get(nameAtom)}_card.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function uploadImageAndCopyUrl() {
  const data = await gen();

  const params = {
    imageInfo: {
      fileBytes: encode(data),
      fileName: `op_${store.get(nameAtom)}_card_${Date.now()}.png`,
    },
    imageOption: {
      localStoreImage: true,
    },
  };

  const res = await fetch('http://m.ctrip.com/restapi/soa2/22314/uploadImage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const result = await res.json();
  if (result.errorCode !== 0) {
    throw new Error(result.errorMessage || '上传图片失败');
  }
  const imageUrl = result.imagePathInfo?.imageUrl;

  if (!imageUrl) {
    throw new Error('上传图片失败，未返回图片地址');
  }

  const clipboardItem = new ClipboardItem({
    'text/plain': imageUrl,
  });
  await navigator.clipboard.write([clipboardItem]);
}

function encode(uint8array: Uint8Array<ArrayBufferLike>) {
  const { fromCharCode } = String;

  const output: string[] = [];
  for (let i = 0, { length } = uint8array; i < length; i++) {
    output.push(fromCharCode(uint8array[i]));
  }
  return btoa(output.join(''));
}
