import type { TripSummary } from '../shared/trip';
import { useId, useMemo } from 'react';
import { fitProjector, toPath } from '../shared/geo';
import { tripCities } from '../shared/trip';

const W = 320;
const H = 230;

interface RouteGlyphProps {
  trip: TripSummary;
  /** 高亮某一天（trip.days 下标） */
  highlight?: number;
  /** 片头大图：带城市名、描线动画和沿路线游走的光点 */
  hero?: boolean;
  className?: string;
}

/** 只画自驾环线的发光线稿，航线用指向上海的短箭头示意 */
export function RouteGlyph({ trip, highlight, hero = false, className }: RouteGlyphProps) {
  const glowId = useId();
  const geo = useMemo(() => {
    const project = fitProjector(trip.drivePoints, W, H, hero ? 30 : 6);
    const inside = ([x, y]: [number, number]) => x >= 0 && x <= W && y >= 0 && y <= H;
    const flight = trip.flights[0];
    return {
      full: toPath(trip.drivePoints, project),
      days: trip.days.map(d => toPath(d.legs.flatMap(l => l.points), project)),
      cities: tripCities(trip)
        .map(c => ({ ...c, xy: project(c.position) }))
        .filter(c => inside(c.xy)),
      airport: flight ? project(flight.to.position) : null,
      airportName: flight?.from.city,
    };
  }, [trip, hero]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      aria-hidden
    >
      <defs>
        <filter
          id={glowId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur
            stdDeviation={hero ? 3 : 2}
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={geo.full}
        className={hero ? 'cn-glyph__base cn-glyph__draw' : 'cn-glyph__base'}
        pathLength={1}
        filter={hero ? `url(#${glowId})` : undefined}
      />
      {highlight !== undefined && geo.days[highlight] && (
        <path
          key={highlight}
          d={geo.days[highlight]}
          className="cn-glyph__hi cn-glyph__draw"
          pathLength={1}
          filter={`url(#${glowId})`}
        />
      )}
      {hero && geo.airport && (
        <g
          className="cn-glyph__flight"
          transform={`translate(${geo.airport[0]} ${geo.airport[1]})`}
        >
          <path d="M4 0 H34" />
          <text
            x="38"
            y="3.5"
          >
            {`✈ ${geo.airportName ?? ''}`}
          </text>
        </g>
      )}
      {hero && geo.cities.map((c, i) => (
        <g
          key={c.name}
          className="cn-glyph__city"
          transform={`translate(${c.xy[0]} ${c.xy[1]})`}
          style={{ animationDelay: `${0.5 + i * 0.28}s` }}
        >
          <circle r="2.6" />
          <text
            x="6"
            y="3.5"
          >
            {c.name}
          </text>
        </g>
      ))}
      {hero && (
        <circle
          r="3.2"
          className="cn-glyph__comet"
          filter={`url(#${glowId})`}
        >
          <animateMotion
            dur="10s"
            begin="3s"
            repeatCount="indefinite"
            path={geo.full}
          />
        </circle>
      )}
    </svg>
  );
}
