import type { CustomUnit, Day, HotelUnit, Itinerary, LatLng, Leg, PoiUnit, TransportUnit } from '@/data/types';

export type Place = PoiUnit | CustomUnit;

/** rest 基本不开车 | easy 轻松 | normal 正常 | hard 长途驾驶日 */
export type Intensity = 'rest' | 'easy' | 'normal' | 'hard';

export interface DayPhoto {
  src: string;
  thumb: string;
  name: string;
}

export interface DaySummary {
  day: Day;
  /** 第 N 天，从 1 开始 */
  no: number;
  /** 当天所有驾车路段（含返回酒店） */
  legs: Leg[];
  driveKm: number;
  driveMin: number;
  places: Place[];
  /** 当晚入住的酒店 */
  hotel?: HotelUnit;
  flights: TransportUnit[];
  /** 当天照片，主图在前 */
  photos: DayPhoto[];
  /** 布尔津 → 克拉玛依 */
  route: string;
  intensity: Intensity;
}

export interface TripSummary {
  itinerary: Itinerary;
  days: DaySummary[];
  totalKm: number;
  totalMin: number;
  /** 去重后的景点数 */
  placeCount: number;
  /** 去重后的酒店数 */
  hotelCount: number;
  nights: number;
  flights: TransportUnit[];
  /** 自驾段的全部坐标（不含航线），按行程顺序首尾相连 */
  drivePoints: LatLng[];
  /** 10.01 – 10.07 */
  dateRange: string;
}

/** "367.5公里" -> 367.5 */
export function parseKm(text?: string) {
  return text ? (Number.parseFloat(text) || 0) : 0;
}

/** "4小时5分" / "59分钟" -> 分钟数 */
export function parseMinutes(text?: string) {
  if (!text) {
    return 0;
  }
  const h = /(\d+)小时/.exec(text);
  const m = /(\d+)分/.exec(text);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

/** 245 -> 4小时5分 */
export function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) {
    return `${m}分钟`;
  }
  return m ? `${h}小时${m}分` : `${h}小时`;
}

/** "建议玩1-2天" -> 48，"建议玩3-5小时" -> 5（取上限，单位小时） */
export function playHours(text?: string) {
  const m = text ? /([\d.]+)(?:-([\d.]+))?\s*(天|小时)/.exec(text) : null;
  if (!m) {
    return 0;
  }
  const v = Number(m[2] ?? m[1]);
  return m[3] === '天' ? v * 24 : v;
}

/** 图片 CDN 只接受白名单尺寸（如 _W_360_0 会返回 400），这里只用实测可用的几档 */
const CDN_WIDTHS = [180, 200, 300, 400, 480, 500, 540, 600, 640, 750, 800, 960, 1080, 1280];
export type CropSize = '120x120' | '180x180' | '300x420' | '600x800';

function resize(url: string, suffix: string) {
  const sized = /_[CWR]_\d+_\d+(?:_R\d+)?(?=\.\w+$)/;
  return sized.test(url) ? url.replace(sized, suffix) : url.replace(/(?=\.\w+$)/, suffix);
}

/** 按宽度缩放、保持原图比例 */
export function photo(url: string, width = 1080) {
  return resize(url, `_W_${CDN_WIDTHS.find(w => w >= width) ?? 1280}_0`);
}

/** 居中裁切成固定比例 */
export function crop(url: string, size: CropSize) {
  const [w, h] = size.split('x');
  return resize(url, `_C_${w}_${h}`);
}

/** 10月01日 -> 10.01 */
export function shortDate(label: string) {
  const m = /(\d+)月(\d+)日/.exec(label);
  return m ? `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}` : label;
}

function intensityOf(driveMin: number): Intensity {
  if (driveMin < 60) {
    return 'rest';
  }
  if (driveMin < 240) {
    return 'easy';
  }
  return driveMin < 420 ? 'normal' : 'hard';
}

/** 每个景点出现在几天里：挑主图时优先用只属于当天的景点，避免相邻两天同一张图 */
function placeDayCounts(days: Day[]) {
  const counts = new Map<string, number>();
  for (const d of days) {
    for (const name of new Set(d.items.filter(u => u.kind === 'poi').map(u => u.name))) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

function dayPhotos(day: Day, counts: Map<string, number>): DayPhoto[] {
  const ranked = day.items
    .filter((u): u is PoiUnit => u.kind === 'poi' && Boolean(u.image))
    .map((u, order) => ({ u, order, unique: counts.get(u.name) === 1 ? 1 : 0, hours: playHours(u.playTime) }))
    .sort((a, b) => b.unique - a.unique || b.hours - a.hours || a.order - b.order)
    .map(r => r.u);
  const hotels = day.items.filter((u): u is HotelUnit => u.kind === 'hotel' && Boolean(u.image));
  const seen = new Set<string>();
  const photos: DayPhoto[] = [];
  for (const u of [...ranked, ...hotels]) {
    if (!seen.has(u.image)) {
      seen.add(u.image);
      photos.push({ src: photo(u.image), thumb: crop(u.image, '300x420'), name: u.name });
    }
  }
  return photos;
}

export function summarize(itinerary: Itinerary): TripSummary {
  const counts = placeDayCounts(itinerary.days);
  const days = itinerary.days.map((day, i): DaySummary => {
    const legs = [...day.items.flatMap(u => (u.leg ? [u.leg] : [])), ...(day.returnLeg ? [day.returnLeg] : [])];
    const driveMin = legs.reduce((sum, l) => sum + parseMinutes(l.duration), 0);
    return {
      day,
      no: i + 1,
      legs,
      driveKm: legs.reduce((sum, l) => sum + parseKm(l.distance), 0),
      driveMin,
      places: day.items.filter((u): u is Place => u.kind === 'poi' || u.kind === 'custom'),
      hotel: day.items.filter((u): u is HotelUnit => u.kind === 'hotel').at(-1),
      flights: day.items.filter((u): u is TransportUnit => u.kind === 'transport' && u.mode === 'flight'),
      photos: dayPhotos(day, counts),
      route: day.title ?? day.cities.map(c => c.name).join(' → '),
      intensity: intensityOf(driveMin),
    };
  });
  const last = days.at(-1);
  return {
    itinerary,
    days,
    totalKm: days.reduce((sum, d) => sum + d.driveKm, 0),
    totalMin: days.reduce((sum, d) => sum + d.driveMin, 0),
    placeCount: new Set(days.flatMap(d => d.places.map(p => p.name))).size,
    hotelCount: new Set(days.flatMap(d => (d.hotel ? [d.hotel.name] : []))).size,
    nights: Math.max(0, days.length - 1),
    flights: days.flatMap(d => d.flights),
    drivePoints: days.flatMap(d => d.legs.flatMap(l => l.points)),
    dateRange: last ? `${shortDate(days[0].day.label)} – ${shortDate(last.day.label)}` : '',
  };
}

/** 行程经过的城市（按首次到达排序，去重） */
export function tripCities(trip: TripSummary) {
  const cities = new Map<string, { name: string; position: LatLng; day: number }>();
  for (const d of trip.days) {
    for (const c of d.day.cities) {
      if (!cities.has(c.name)) {
        cities.set(c.name, { ...c, day: d.no });
      }
    }
  }
  return [...cities.values()];
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  rest: '休整日',
  easy: '轻松',
  normal: '适中',
  hard: '长途驾驶日',
};
