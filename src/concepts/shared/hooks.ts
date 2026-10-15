import { useEffect, useState } from 'react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** 数字从 0 缓动到 target；减弱动效时直接给终值 */
export function useCountUp(target: number, duration = 1400, delay = 0) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) {
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduced]);
  return reduced ? target : value;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 按饱和度加权求平均色，再把饱和度和亮度拉到适合做强调色的区间 */
function extractAccent(img: HTMLImageElement) {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    // 图片未开跨域时画布被污染，退回默认色
    return null;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const sat = max ? (max - min) / max : 0;
    const weight = sat * sat * (max / 255) + 0.02;
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    w += weight;
  }
  const [h, s, l] = rgbToHsl(r / w, g / w, b / w);
  return `hsl(${Math.round(h)} ${Math.round(clamp(s * 1.25, 0.5, 0.95) * 100)}% ${Math.round(clamp(l, 0.58, 0.7) * 100)}%)`;
}

const accentCache = new Map<string, string>();

/** 从图片里取一个鲜明的主色；src 用独立的小图地址，避免命中无跨域头的缓存 */
export function useImageAccent(src: string | undefined, fallback: string) {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!src || accentCache.has(src)) {
      return;
    }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      const color = extractAccent(img);
      if (color) {
        accentCache.set(src, color);
        if (alive) {
          setVersion(v => v + 1);
        }
      }
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return (src && accentCache.get(src)) || fallback;
}
