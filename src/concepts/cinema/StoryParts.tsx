import type { DaySummary, TripSummary } from '../shared/trip';
import type { Page } from './pages';
import type { Unit } from '@/data/types';
import { BedDouble, Car, ChevronLeft, Gauge, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { unitShortName } from '@/components/route/utils';
import { formatMinutes, INTENSITY_LABEL, photo } from '../shared/trip';
import { hasImage } from './pages';
import { RouteGlyph } from './RouteGlyph';

function dayTag(summary: DaySummary) {
  return (summary.flights.length > 0 && summary.driveKm < 50) ? '飞行日' : INTENSITY_LABEL[summary.intensity];
}

export function StoryTitle({ page, dir }: { page: Page; dir: 'next' | 'prev' }) {
  if (page.kind === 'todo') {
    return (
      <div
        className="cn-title-block"
        data-dir={dir}
      >
        <span
          className="cn-day-no"
          aria-hidden
        >
          {`+${page.units.length}`}
        </span>
        <p className="cn-day-date">还没排进日程的灵感</p>
        <h2 className="cn-day-title">待安排</h2>
      </div>
    );
  }
  const { summary } = page;
  return (
    <div
      className="cn-title-block"
      data-dir={dir}
    >
      <span
        className="cn-day-no"
        aria-hidden
      >
        {String(summary.no).padStart(2, '0')}
      </span>
      <p className="cn-day-date">{`${summary.day.label} · ${summary.day.weekday}`}</p>
      <h2 className="cn-day-title">{summary.route}</h2>
      <ul className="cn-chips">
        {summary.driveKm > 0 && (
          <li>
            <Car aria-hidden />
            {`${summary.driveKm.toFixed(1)} km · ${formatMinutes(summary.driveMin)}`}
          </li>
        )}
        <li data-tone={summary.intensity}>
          <Gauge aria-hidden />
          {dayTag(summary)}
        </li>
        {summary.hotel && (
          <li className="cn-chips__hotel">
            <BedDouble aria-hidden />
            <span>{summary.hotel.name}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

interface HeadProps {
  trip: TripSummary;
  pages: Page[];
  index: number;
  onClose: () => void;
}

export function StoryHead({ trip, pages, index, onClose }: HeadProps) {
  const page = pages[index];
  return (
    <header className="cn-story__head">
      <ol
        className="cn-progress"
        aria-label={`第 ${index + 1} 页，共 ${pages.length} 页`}
      >
        {pages.map((p, i) => (
          <li
            key={p.kind === 'day' ? p.summary.no : 'todo'}
            data-state={i < index ? 'done' : i === index ? 'active' : 'todo'}
          >
            <span key={i === index ? `on-${index}` : 'off'} />
          </li>
        ))}
      </ol>
      <div className="cn-story__bar">
        <button
          type="button"
          className="cn-close"
          onClick={onClose}
        >
          <ChevronLeft aria-hidden />
          总览
        </button>
        <span className="cn-counter">
          {page.kind === 'day' ? `DAY ${String(page.summary.no).padStart(2, '0')} / ${String(trip.days.length).padStart(2, '0')}` : 'WISHLIST'}
        </span>
        <RouteGlyph
          trip={trip}
          highlight={page.kind === 'day' ? index : undefined}
          className="cn-story__glyph"
        />
      </div>
    </header>
  );
}

export function TodoGrid({ units }: { units: Unit[] }) {
  return (
    <ul className="cn-todo">
      {units.map(u => (
        <li key={u.id}>
          {hasImage(u)
            ? (
                <img
                  src={photo(u.image, 400)}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )
            : (
                <span className="cn-todo__icon">
                  <Car aria-hidden />
                </span>
              )}
          <b>{unitShortName(u)}</b>
          <span>{u.kind === 'poi' ? u.playTime : u.kind === 'hotel' ? `备选酒店 · ${u.score.toFixed(1)}分` : '交通'}</span>
          <button
            type="button"
            onClick={() => toast(`演示页面：把「${unitShortName(u)}」排进某一天`)}
          >
            <Plus aria-hidden />
            排进行程
          </button>
        </li>
      ))}
    </ul>
  );
}
