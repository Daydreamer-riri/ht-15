import type { Day, Itinerary, LatLng, Unit } from '@/data/types';

/** 'overview' 总览 | 'todo' 待安排 | number 第 N 天 */
export type TabKey = 'overview' | 'todo' | number;

export const COLORS = {
  brand: '#1f6fd6',
  flight: '#7c70d8',
  hotel: '#3a7be0',
  poi: '#2a9d78',
  custom: '#e07b2a',
  todo: '#a39d93',
} as const;

/** 行程项对应的类别色（与地图图钉一致） */
export function unitColor(unit: Unit) {
  switch (unit.kind) {
    case 'hotel':
      return COLORS.hotel;
    case 'custom':
      return COLORS.custom;
    case 'transport':
      return COLORS.flight;
    default:
      return COLORS.poi;
  }
}

/** 1 -> "01" */
export const dayNo = (day: Day) => String(day.index).padStart(2, '0');

/** 10月01日 -> 10/01 */
export const shortDate = (label: string) => label.replace(/(\d+)月(\d+)日/, '$1/$2');

/** 上海 → 吐鲁番 → 福海 */
export const dayCities = (day: Day) => day.title ?? day.cities.map(c => c.name).join(' → ');

/** 行程概要：天数、城市数、地点数 */
export function tripStats(itinerary: Itinerary) {
  const cities = new Set(itinerary.days.flatMap(d => d.cities.map(c => c.name)));
  const places = itinerary.days.flatMap(d => d.items).filter(u => u.kind === 'poi' || u.kind === 'custom').length;
  const first = itinerary.days[0];
  const last = itinerary.days.at(-1);
  return {
    days: itinerary.days.length,
    nights: Math.max(0, itinerary.days.length - 1),
    cities: cities.size,
    places,
    range: (first && last) ? `${shortDate(first.label)} – ${shortDate(last.label)}` : '',
  };
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/** 10月01日 周四 · 上海 — 吐鲁番 */
export function dayTitle(day: Day) {
  return `${day.label} ${day.weekday} · ${day.title ?? day.cities.map(c => c.name).join(' — ')}`;
}

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

/** 行程项在总览/待安排中的简短名称 */
export function unitShortName(unit: Unit) {
  return unit.kind === 'transport' ? `${unit.from.city} → ${unit.to.city}` : unit.name;
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
