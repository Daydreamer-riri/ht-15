import type { TripSummary } from '../shared/trip';
import { useRef } from 'react';

interface CoverProps {
  trip: TripSummary;
  opening: boolean;
  onOpen: () => void;
  onOpened: () => void;
}

/** "七天六晚北疆" -> ["七天六晚", "北疆"] */
function splitTitle(name: string): [string, string] {
  const m = /^(.*[天晚])(.{1,4})$/.exec(name);
  return m ? [m[1], m[2]] : ['', name];
}

/** 皮面封面：点一下或向左滑，封面绕书脊翻开 */
export function Cover({ trip, opening, onOpen, onOpened }: CoverProps) {
  const start = useRef<number | null>(null);
  const [lead, title] = splitTitle(trip.itinerary.name);
  const editors = trip.itinerary.coEditors;
  return (
    <div
      className="jr-cover-wrap"
      data-opening={opening}
    >
      <div
        className="jr-cover"
        onTransitionEnd={e => {
          if (e.target === e.currentTarget && opening) {
            onOpened();
          }
        }}
        onPointerDown={e => {
          start.current = e.clientX;
        }}
        onPointerUp={e => {
          if (start.current !== null && start.current - e.clientX > 40) {
            onOpen();
          }
          start.current = null;
        }}
      >
        <div className="jr-cover__front">
          <span
            className="jr-cover__stitch"
            aria-hidden
          />
          <span
            className="jr-cover__band"
            aria-hidden
          />
          <p className="jr-cover__kicker">ROAD JOURNAL · NO.01</p>
          <h1
            className="jr-cover__title"
            aria-label={trip.itinerary.name}
          >
            {lead && <small>{lead}</small>}
            <strong>{title}</strong>
          </h1>
          <p className="jr-cover__dates">{`2026 · ${trip.dateRange}`}</p>

          <span
            className="jr-sticker jr-sticker--km"
            aria-hidden
          >
            <b>{Math.round(trip.totalKm).toLocaleString()}</b>
            KM
          </span>
          <span
            className="jr-sticker jr-sticker--label"
            aria-hidden
          >
            北疆环线 · 自驾
          </span>
          <span
            className="jr-sticker jr-sticker--days"
            aria-hidden
          >
            {`${trip.days.length}D${trip.nights}N`}
          </span>

          <div className="jr-cover__crew">
            <span className="jr-cover__avatars">
              {editors.slice(0, 5).map(e => (
                <img
                  key={e.avatar}
                  src={e.avatar}
                  alt={e.nickName}
                  referrerPolicy="no-referrer"
                />
              ))}
            </span>
            <span>{`${editors.length} 位旅伴一起写`}</span>
          </div>

          <button
            type="button"
            className="jr-cover__open"
            onClick={onOpen}
          >
            翻开手账
            <span aria-hidden>→</span>
          </button>
        </div>
        <div
          className="jr-cover__back"
          aria-hidden
        >
          <p>这本手账属于</p>
          <p className="jr-cover__owner">{editors.find(e => e.owner)?.nickName ?? editors[0]?.nickName}</p>
          <p>{`和 ${Math.max(0, editors.length - 1)} 位旅伴`}</p>
        </div>
      </div>
    </div>
  );
}
