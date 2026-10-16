import type { Day, HotelUnit, Itinerary, LatLng, Leg, PoiUnit, Unit } from '@/data/types';

/** 'overview' 总览 | 'todo' 待安排 | number 第 N 天 */
export type TabKey = 'overview' | 'todo' | number;

export const INK = '#14110f';
export const PAPER = '#f7f2e8';

export interface Theme {
  /** 章节主色 */
  color: string;
  /** 压在主色上的文字色 */
  on: string;
}

/** 每天一个高饱和主题色：沙漠橙、白桦金、喀纳斯青、魔鬼城红、赛里木蓝、独库绿、归途粉 */
export const DAY_THEMES: Theme[] = [
  { color: '#ff5b23', on: INK },
  { color: '#ffc21a', on: INK },
  { color: '#00a88f', on: INK },
  { color: '#e8253f', on: '#ffffff' },
  { color: '#1e4fff', on: '#ffffff' },
  { color: '#3dbe5a', on: INK },
  { color: '#ff4fa0', on: INK },
];

export const INK_THEME: Theme = { color: INK, on: PAPER };
export const TODO_THEME: Theme = { color: '#ffc21a', on: INK };

export const dayTheme = (index: number) => DAY_THEMES[(index - 1) % DAY_THEMES.length];

/** 主题色写成 CSS 变量，子元素用 bg-(--accent) / text-(--on) 取用 */
export const themeVars = (theme: Theme) => ({ '--accent': theme.color, '--on': theme.on }) as React.CSSProperties;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/** 携程图片按需裁剪：xxx_C_180_180_R5.jpg -> xxx_C_{w}_{h}.jpg */
export function sizedImage(url: string, w: number, h: number) {
  return url.replace(/(?:_C_\d+_\d+(?:_R\d+)?)?\.jpg$/, `_C_${w}_${h}.jpg`);
}

/** 1 -> "01" */
export const pad2 = (n: number) => String(n).padStart(2, '0');
export const dayNo = (day: Day) => pad2(day.index);

/** 10月01日 -> 10/01 */
export const shortDate = (label: string) => label.replace(/(\d+)月(\d+)日/, '$1/$2');

/** 上海 → 吐鲁番 → 福海 */
export const dayCities = (day: Day) => day.title ?? day.cities.map(c => c.name).join(' → ');

/** 非交通类行程项按顺序编号（1.xxx、2.xxx） */
export function itemNumbers(items: Unit[]) {
  const nums = new Map<string, number>();
  let n = 0;
  for (const u of items) {
    if (u.kind !== 'transport') {
      nums.set(u.id, ++n);
    }
  }
  return nums;
}

/** [1, 6, 7] -> 第1天,第6-7天 */
export function formatDayRanges(indices: number[]) {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (sorted[i + 1] === sorted[i] + 1) {
      i++;
    }
    ranges.push(start === sorted[i] ? `第${start}天` : `第${start}-${sorted[i]}天`);
  }
  return ranges.join(',');
}

/** 行程项的简短名称 */
export function unitShortName(unit: Unit) {
  return unit.kind === 'transport' ? `${unit.from.city} → ${unit.to.city}` : unit.name;
}

/** "367.5公里" -> 367.5；"800米" -> 0.8 */
export function parseKm(distance: string) {
  const n = Number.parseFloat(distance);
  if (Number.isNaN(n)) {
    return 0;
  }
  return distance.includes('公里') ? n : n / 1000;
}

/** "1小时33分" / "59分钟" -> 分钟数 */
export function parseMinutes(duration: string) {
  const h = /(\d+)小时/.exec(duration);
  const m = /(\d+)分/.exec(duration);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

/** 333 -> "5h33"；45 -> "45min" */
export function formatDrive(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${pad2(m)}` : `${m}min`;
}

/** 367.5 -> "368"；5.2 -> "5.2" */
export function formatKm(km: number) {
  return km >= 100 ? Math.round(km).toLocaleString('en-US') : km.toFixed(1).replace(/\.0$/, '');
}

export function dayLegs(day: Day): Leg[] {
  return [...day.items.map(u => u.leg), day.returnLeg].filter((l): l is Leg => !!l);
}

const isStop = (u: Unit) => u.kind === 'poi' || u.kind === 'custom';

/** 单日概要：驾车里程、驾车时长、打卡地点数 */
export function dayStats(day: Day) {
  const legs = dayLegs(day);
  return {
    km: legs.reduce((s, l) => s + parseKm(l.distance), 0),
    minutes: legs.reduce((s, l) => s + parseMinutes(l.duration), 0),
    stops: day.items.filter(isStop).length,
  };
}

/** 章节封面图：当天第一个景点，没有则用酒店 */
export function dayHero(day: Day): PoiUnit | HotelUnit | undefined {
  return day.items.find((u): u is PoiUnit => u.kind === 'poi')
    ?? day.items.find((u): u is HotelUnit => u.kind === 'hotel');
}

/** 行程概要：天数、城市数、地点数、总里程 */
export function tripStats(itinerary: Itinerary) {
  const cities = new Set(itinerary.days.flatMap(d => d.cities.map(c => c.name)));
  const first = itinerary.days[0];
  const last = itinerary.days.at(-1);
  return {
    days: itinerary.days.length,
    nights: Math.max(0, itinerary.days.length - 1),
    cities: cities.size,
    places: itinerary.days.flatMap(d => d.items).filter(isStop).length,
    km: itinerary.days.reduce((s, d) => s + dayStats(d).km, 0),
    range: (first && last) ? `${shortDate(first.label)} – ${shortDate(last.label)}` : '',
  };
}

/** 两点之间的二次贝塞尔弧线，用于绘制航线 */
export function arcPoints(a: LatLng, b: LatLng, segments = 48): LatLng[] {
  const [y1, x1] = a;
  const [y2, x2] = b;
  const cx = (x1 + x2) / 2 - (y2 - y1) * 0.2;
  const cy = (y1 + y2) / 2 + (x2 - x1) * 0.2;
  const pts: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const k = 1 - t;
    pts.push([k * k * y1 + 2 * k * t * cy + t * t * y2, k * k * x1 + 2 * k * t * cx + t * t * x2]);
  }
  return pts;
}
