import { domToBlob } from 'modern-screenshot';
import { nameAtom, store } from '@/store';

export async function gen() {
  const root = document.getElementById('IMAGE_ROOT');
  const dataUrl = await domToBlob(root!);
  return dataUrl;
}

export async function copyImage() {
  try {
    const blob = await gen();
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
  const blob = await gen();
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
  const blob = await gen();

  const res = await fetch('https://uploadimg.fx.ctripcorp.com/image/v1/api/upload?public=1&channel=ttl_post_share_repo', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
    },
    body: blob,
  });

  const result = await res.json();
  const { url } = result || {};

  if (!url) {
    throw new Error('上传图片失败，未返回图片地址');
  }

  await navigator.clipboard.writeText(url);
}
