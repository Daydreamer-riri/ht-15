import type { TripSummary } from '../shared/trip';
import type { DriveState } from './drive';
import type { Segment } from './timeline';
import { memo, useMemo } from 'react';
import { fitProjector, toPath } from '../shared/geo';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/** 机械里程表：低位连续滚动，高位只在低位从 9 进到 0 时一起转 */
export function Odometer({ km }: { km: number }) {
  const tenths = Math.max(0, km * 10);
  const places = [5, 4, 3, 2, 1, 0];
  return (
    <div
      className="rd-odo"
      role="img"
      aria-label={`已行驶 ${km.toFixed(1)} 公里`}
    >
      {places.map(p => {
        const unit = 10 ** p;
        const d = Math.floor(tenths / unit) % 10;
        const rem = tenths % unit;
        const roll = p === 0 ? tenths % 10 : d + Math.min(1, Math.max(0, rem - (unit - 1)));
        return (
          <span
            key={p}
            className="rd-odo__cell"
            data-tenth={p === 0}
          >
            <span
              className="rd-odo__strip"
              style={{ transform: `translateY(${(-roll * 100) / DIGITS.length}%)` }}
            >
              {DIGITS.map((n, i) => <span key={i}>{n}</span>)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

const MAP = 96;

interface MiniMapProps {
  trip: TripSummary;
  segs: Segment[];
  state: DriveState;
}

function MiniMapImpl({ trip, segs, state }: MiniMapProps) {
  const geo = useMemo(() => {
    const project = fitProjector(trip.drivePoints, MAP, MAP, 9);
    return {
      project,
      full: toPath(trip.drivePoints, project, 1),
      legs: segs.map(s => (s.leg ? toPath(s.leg.points, project, 0.8) : '')),
    };
  }, [trip, segs]);
  const index = state.seg.index;
  const car = state.car && geo.project(state.car);
  return (
    <svg
      className="rd-map"
      viewBox={`0 0 ${MAP} ${MAP}`}
      aria-hidden
    >
      <circle
        cx={MAP / 2}
        cy={MAP / 2}
        r={MAP / 2 - 1}
        className="rd-map__bg"
      />
      <path
        d={geo.full}
        className="rd-map__route"
      />
      {geo.legs.map((d, i) => d && i <= index && (
        <path
          key={i}
          d={d}
          pathLength={1}
          className="rd-map__done"
          style={{ strokeDashoffset: i < index ? 0 : 1 - state.frac }}
        />
      ))}
      {car && (
        <g transform={`translate(${car[0]} ${car[1]})`}>
          <circle
            r={7}
            className="rd-map__pulse"
          />
          <circle
            r={3.2}
            className="rd-map__car"
          />
        </g>
      )}
    </svg>
  );
}

export const MiniMap = memo(MiniMapImpl);
