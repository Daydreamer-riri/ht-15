import type { DayPhoto, DaySummary, TripSummary } from '../shared/trip';
import type { HotelUnit, PoiUnit, Unit } from '@/data/types';
import { crop, photo } from '../shared/trip';

/** 故事里的一页：每天一页，最后一页是“待安排” */
export type Page =
  | { kind: 'day'; summary: DaySummary }
  | { kind: 'todo'; units: Unit[]; cover?: DayPhoto };

export const hasImage = (u: Unit): u is PoiUnit | HotelUnit => (u.kind === 'poi' || u.kind === 'hotel') && Boolean(u.image);

export function buildPages(trip: TripSummary): Page[] {
  const pages: Page[] = trip.days.map(summary => ({ kind: 'day', summary }));
  const units = trip.itinerary.toBePlanned;
  if (units.length) {
    const first = units.find(hasImage);
    pages.push({
      kind: 'todo',
      units,
      cover: first && { src: photo(first.image), thumb: crop(first.image, '300x420'), name: first.name },
    });
  }
  return pages;
}

/** 卡片上的短标题：当天主题，没有就用当晚落脚的城市 */
export function pageTitle(page: Page) {
  if (page.kind === 'todo') {
    return '待安排';
  }
  const { day, hotel } = page.summary;
  return day.title ?? hotel?.city ?? day.cities.at(-1)?.name ?? day.label;
}

export function pageCover(page: Page) {
  return page.kind === 'day' ? page.summary.photos[0] : page.cover;
}
