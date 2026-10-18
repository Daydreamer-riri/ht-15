import type { DaySummary, TripSummary } from '../shared/trip';
import type { HotelUnit, PoiUnit, TransportUnit, Unit } from '@/data/types';
import { itemNumbers } from '@/components/route/utils';
import { parseKm, parseMinutes, shortDate } from '../shared/trip';

/** 每条线（每天）的颜色，像地铁线路图一样区分 */
export const LINE_COLORS = ['#d81e26', '#0b63c5', '#128a4b', '#d98300', '#0a8f8f', '#6f42c1', '#c2185b'];

export const VIEW_W = 348;
/** 线路左右端点 */
export const PAD = 26;
const SPAN = VIEW_W - PAD * 2;
const ROW_H = 160;
const TOP = 84;
const CORNER = 18;

export type StationKind = 'place' | 'hotel' | 'flight' | 'custom';

export interface Station {
  id: string;
  kind: StationKind;
  /** 圆点里的字：编号 / 宿 / ✈ */
  badge: string;
  name: string;
  /** 名称按行折好，最多两行 */
  lines: string[];
  meta: string;
  remark?: string;
  photo?: string;
  /** 驶向本站的路段文字 */
  leg?: string;
  x: number;
  y: number;
}

export interface DayRow {
  no: number;
  date: string;
  weekday: string;
  route: string;
  color: string;
  km: number;
  minutes: number;
  stay?: string;
  y: number;
  dir: 1 | -1;
  path: string;
  stations: Station[];
}

export interface Diagram {
  rows: DayRow[];
  height: number;
  legend: { kind: StationKind | 'leg'; label: string }[];
}

/** "乌伦古湖(黄金海岸景区)" -> 两行；过长且没有括号的名字对半折 */
function wrapName(name: string): string[] {
  const m = /^(.+?)[(（](.+)[)）]$/.exec(name);
  if (m) {
    return [m[1], m[2]];
  }
  const chars = [...name];
  if (chars.length <= 7) {
    return [name];
  }
  const half = Math.ceil(chars.length / 2);
  return [chars.slice(0, half).join(''), chars.slice(half).join('')];
}

/** 119 分钟 -> 1h59m；线路图上的路段标注用紧凑写法，避免和站名抢位置 */
function shortDuration(min: number) {
  const h = Math.floor(min / 60);
  return h ? `${h}h${min % 60 ? `${min % 60}m` : ''}` : `${min}m`;
}

function legText(leg?: { distance?: string; duration?: string }) {
  if (!leg) {
    return undefined;
  }
  return `${parseKm(leg.distance).toFixed(1)}km · ${shortDuration(parseMinutes(leg.duration))}`;
}

function stationOf(u: Unit, x: number, y: number, nums: Map<string, number>): Station {
  const base = { id: u.id, x, y, leg: legText(u.leg), remark: u.remark };
  if (u.kind === 'transport') {
    const flight = u as TransportUnit;
    return {
      ...base,
      kind: 'flight',
      badge: '✈\uFE0E',
      name: `${flight.from.city} → ${flight.to.city}`,
      lines: [flight.from.city, flight.to.city],
      meta: [flight.number, flight.departTime, flight.arriveTime].filter(Boolean).join(' · '),
    };
  }
  if (u.kind === 'hotel') {
    const hotel = u as HotelUnit;
    return {
      ...base,
      kind: 'hotel',
      badge: '宿',
      name: hotel.name,
      lines: wrapName(hotel.name),
      meta: `${'◆'.repeat(hotel.star)} ${hotel.score.toFixed(1)}分`,
      photo: hotel.image,
    };
  }
  if (u.kind === 'poi') {
    const poi = u as PoiUnit;
    return {
      ...base,
      kind: 'place',
      badge: String(nums.get(poi.id) ?? ''),
      name: poi.name,
      lines: wrapName(poi.name),
      meta: [poi.playTime, poi.price].filter(Boolean).join(' · '),
      photo: poi.image,
    };
  }
  return { ...base, kind: 'custom', badge: '·', name: u.name, lines: wrapName(u.name), meta: '自定义地点' };
}

export function buildDiagram(trip: TripSummary): Diagram {
  const rows = trip.days.map((d: DaySummary, i): DayRow => {
    const y = TOP + i * ROW_H;
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const start = dir === 1 ? PAD : VIEW_W - PAD;
    const end = dir === 1 ? VIEW_W - PAD : PAD;
    const nums = itemNumbers(d.day.items);
    const n = d.day.items.length;
    const step = n > 1 ? SPAN / (n - 1) : 0;
    const stations = d.day.items.map((u, k) => {
      const x = n > 1 ? start + dir * step * k : (start + end) / 2;
      return stationOf(u, x, y, nums);
    });
    const down = i < trip.days.length - 1 ? ROW_H : 0;
    const path = down
      ? `M${start} ${y}H${end - dir * CORNER}Q${end} ${y} ${end} ${y + CORNER}V${y + down}`
      : `M${start} ${y}H${end}`;
    return {
      no: d.no,
      date: shortDate(d.day.label),
      weekday: d.day.weekday,
      route: d.route,
      color: LINE_COLORS[i % LINE_COLORS.length],
      km: d.driveKm,
      minutes: d.driveMin,
      stay: d.hotel?.city,
      y,
      dir,
      path,
      stations,
    };
  });
  return {
    rows,
    height: TOP + (rows.length - 1) * ROW_H + 116,
    legend: [
      { kind: 'place', label: '景点' },
      { kind: 'hotel', label: '住宿' },
      { kind: 'flight', label: '航班' },
      { kind: 'leg', label: '驾车' },
    ],
  };
}

export const DAY_KM = (d: DayRow) => (d.km >= 1 ? `驾车 ${d.km.toFixed(1)} km · ${formatMin(d.minutes)}` : '今日无需驾车');

export function formatMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}小时${m ? `${m}分` : ''}` : `${m}分钟`;
}
