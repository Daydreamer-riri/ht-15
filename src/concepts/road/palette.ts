import type { Biome } from './timeline';

type RGB = [number, number, number];

const rgb = (hex: string): RGB => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t) as RGB;
export const css = (c: RGB) => `rgb(${c.map(Math.round).join(' ')})`;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export function smoothstep(a: number, b: number, v: number) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** 天色关键帧：0 黎明 → 1 深夜 */
const SKY = [
  { at: 0, top: '#1b1f4d', mid: '#8a5a9e', low: '#ffb385' },
  { at: 0.18, top: '#3474cf', mid: '#8fc3ee', low: '#fde3c4' },
  { at: 0.45, top: '#2d7dd6', mid: '#7cc0f2', low: '#e2f2ff' },
  { at: 0.7, top: '#3b3a8f', mid: '#d0698a', low: '#ffae5e' },
  { at: 0.84, top: '#151b47', mid: '#3d2f6b', low: '#a24d63' },
  { at: 1, top: '#03050f', mid: '#0a1230', low: '#1b2850' },
].map(k => ({ at: k.at, top: rgb(k.top), mid: rgb(k.mid), low: rgb(k.low) }));

const GROUND: Record<Biome, RGB> = {
  desert: rgb('#c9a46d'),
  mountain: rgb('#7f8b58'),
  lake: rgb('#8d9b63'),
};

const NIGHT_GROUND = rgb('#0c0e15');
const ASPHALT_DAY = rgb('#5a5d64');
const ASPHALT_NIGHT = rgb('#14161b');
const SHADOW = rgb('#070a11');

export interface Palette {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  ground: string;
  groundHaze: string;
  asphalt: string;
  farRidge: string;
  nearRidge: string;
  lake: string;
  snow: string;
  sun: string;
  /** 0 白天 → 1 夜里，用于星星、车灯、反光柱 */
  night: number;
}

export function palette(clock: number, biome: Biome): Palette {
  const c = clamp01(clock);
  let i = 1;
  while (i < SKY.length - 1 && SKY[i].at < c) {
    i++;
  }
  const a = SKY[i - 1];
  const b = SKY[i];
  const t = (c - a.at) / (b.at - a.at || 1);
  const top = mix(a.top, b.top, t);
  const mid = mix(a.mid, b.mid, t);
  const low = mix(a.low, b.low, t);
  const night = Math.max(smoothstep(0.76, 0.96, c), (1 - smoothstep(0, 0.12, c)) * 0.55);
  const base = mix(GROUND[biome], low, 0.16);
  const ground = mix(base, NIGHT_GROUND, night * 0.92);
  const far = mix(mix(low, base, 0.35), SHADOW, 0.25 + night * 0.55);
  return {
    skyTop: css(top),
    skyMid: css(mid),
    skyLow: css(low),
    ground: css(ground),
    groundHaze: css(mix(ground, low, 0.45 * (1 - night * 0.6))),
    asphalt: css(mix(ASPHALT_DAY, ASPHALT_NIGHT, night)),
    farRidge: css(far),
    nearRidge: css(mix(far, SHADOW, 0.4 + night * 0.3)),
    lake: css(mix(mix(mid, rgb('#1d5f9c'), 0.45), SHADOW, night * 0.7)),
    snow: css(mix(rgb('#f4f7fb'), far, 0.12 + night * 0.72)),
    sun: css(mix(rgb('#fff4d2'), rgb('#ff9a52'), smoothstep(0.5, 0.78, c) + 1 - smoothstep(0, 0.2, c))),
    night,
  };
}
