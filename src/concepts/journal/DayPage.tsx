import type { ReactNode } from 'react';
import type { DaySummary } from '../shared/trip';
import type { SketchMark } from './RouteSketch';
import type { Leg, PoiUnit, Unit } from '@/data/types';
import { Car } from 'lucide-react';
import { useMemo } from 'react';
import { itemNumbers } from '@/components/route/utils';
import { formatMinutes, shortDate } from '../shared/trip';
import { BoardingPass, LuggageTag, Polaroid, Postmark, RubberStamp, StickyNote, Tape } from './Paper';
import { RouteSketch } from './RouteSketch';

const WEEK_EN: Record<string, string> = { 周一: 'MON', 周二: 'TUE', 周三: 'WED', 周四: 'THU', 周五: 'FRI', 周六: 'SAT', 周日: 'SUN' };

function markOf(u: Unit, nums: Map<string, number>): SketchMark {
  switch (u.kind) {
    case 'transport':
      return { position: u.leg ? u.from.position : u.to.position, badge: '✈', kind: 'air' };
    case 'hotel':
      return { position: u.position, badge: '宿', kind: 'stay' };
    default:
      return { position: u.position, badge: String(nums.get(u.id) ?? '') };
  }
}

function LegLine({ leg, note }: { leg: Leg; note?: string }) {
  return (
    <li className="jr-leg">
      <Car aria-hidden />
      <span>{[leg.duration, leg.distance, note].filter(Boolean).join(' · ')}</span>
    </li>
  );
}

function ItemLine({ unit, no }: { unit: Unit; no?: number }) {
  let badge = no === undefined ? '·' : String(no);
  let name = '';
  let meta = '';
  switch (unit.kind) {
    case 'transport':
      badge = '✈';
      name = `${unit.from.city} → ${unit.to.city}  ${unit.number ?? ''}`;
      meta = `${unit.departTime ?? ''} – ${unit.arriveTime ?? ''} · ${unit.duration ?? ''}`;
      break;
    case 'hotel':
      badge = '宿';
      name = unit.name;
      meta = `入住 · ${unit.score.toFixed(1)}分`;
      break;
    case 'poi':
      name = unit.name;
      meta = [unit.playTime, unit.price].filter(Boolean).join(' · ');
      break;
    case 'custom':
      name = unit.name;
      meta = '自定义地点';
      break;
  }
  return (
    <li
      className="jr-item"
      data-kind={unit.kind}
    >
      <span className="jr-item__badge">{badge}</span>
      <span className="jr-item__text">
        <b>{name}</b>
        <small>{meta}</small>
      </span>
    </li>
  );
}

function dayStamp(s: DaySummary): ReactNode {
  if (s.flights.length && s.driveKm < 50) {
    return (
      <RubberStamp
        tone="blue"
        angle={-8}
      >
        回家啦
      </RubberStamp>
    );
  }
  if (s.intensity === 'hard') {
    return <RubberStamp angle={-11}>长途驾驶</RubberStamp>;
  }
  if (s.intensity === 'rest') {
    return (
      <RubberStamp
        tone="green"
        angle={-7}
      >
        慢游日
      </RubberStamp>
    );
  }
  return null;
}

export function DayPage({ summary, pageRef }: { summary: DaySummary; pageRef: (el: HTMLElement | null) => void }) {
  const { day, no } = summary;
  const nums = useMemo(() => itemNumbers(day.items), [day]);
  const sketch = useMemo(() => {
    const marks: SketchMark[] = [];
    if (day.departHotel) {
      marks.push({ position: day.departHotel.position, badge: '起', kind: 'start' });
    }
    for (const u of day.items) {
      marks.push(markOf(u, nums));
    }
    return { paths: summary.legs.map(l => l.points), marks };
  }, [day, nums, summary.legs]);

  const polaroids = day.items
    .filter((u): u is PoiUnit => u.kind === 'poi' && Boolean(u.image))
    .filter((u, i, all) => all.findIndex(x => x.name === u.name) === i)
    .slice(0, 2);
  const remarks = day.items.filter(u => u.remark);
  const flight = summary.flights[0];
  const flightFirst = day.items[0]?.kind === 'transport';
  const date = shortDate(day.label);

  const rows: ReactNode[] = [];
  for (const u of day.items) {
    if (u.leg) {
      rows.push(
        <LegLine
          key={`${u.id}-leg`}
          leg={u.leg}
          note={u.leg.from ? `从${u.leg.from}出发` : undefined}
        />,
      );
    }
    rows.push(
      <ItemLine
        key={u.id}
        unit={u}
        no={nums.get(u.id)}
      />,
    );
  }
  if (day.returnLeg) {
    rows.push(
      <LegLine
        key="return"
        leg={day.returnLeg}
        note={`返回${day.returnLeg.target}`}
      />,
    );
  }

  return (
    <section
      ref={pageRef}
      id={`jr-day-${no}`}
      className="jr-page jr-day"
      data-page={no}
      aria-label={`第${no}天 ${summary.route}`}
    >
      <header className="jr-day__head">
        <p className="jr-day__no">{`Day ${no}`}</p>
        <p className="jr-day__date">{`${date} ${WEEK_EN[day.weekday] ?? ''} · ${day.weekday}`}</p>
        <h2 className="jr-day__route">{summary.route}</h2>
        <Postmark
          id={`jr-pm-${no}`}
          top={`XINJIANG · ${summary.hotel?.city ?? day.cities.at(-1)?.name ?? ''} · 2026`}
          date={date}
          weekday={day.weekday}
        />
      </header>

      <div className="jr-day__stats">
        <span>
          <Car aria-hidden />
          {summary.driveKm >= 1 ? `${summary.driveKm.toFixed(1)} km · ${formatMinutes(summary.driveMin)}` : '今日不开车'}
        </span>
        {dayStamp(summary)}
      </div>

      {flight && flightFirst && (
        <BoardingPass
          flight={flight}
          date={date}
        />
      )}

      {sketch.paths.length > 0 && (
        <figure className="jr-mapcard">
          <Tape
            tone="mint"
            angle={-8}
            className="jr-mapcard__tape jr-mapcard__tape--l"
          />
          <Tape
            tone="yellow"
            angle={7}
            className="jr-mapcard__tape jr-mapcard__tape--r"
          />
          <RouteSketch
            paths={sketch.paths}
            marks={sketch.marks}
            label={`第${no}天路线草图`}
          />
        </figure>
      )}

      <ol className="jr-list">{rows}</ol>

      {polaroids.length > 0 && (
        <div
          className="jr-polaroids"
          data-count={polaroids.length}
        >
          {polaroids.map((u, i) => (
            <Polaroid
              key={u.id}
              unit={u}
              angle={i % 2 ? 4 : -3.5}
              delay={i * 260}
            />
          ))}
        </div>
      )}

      {(remarks.length > 0 || summary.hotel) && (
        <div className="jr-notes">
          {remarks.map(u => (
            <StickyNote
              key={u.id}
              title={u.kind === 'transport' ? u.to.name : u.name}
              text={u.remark ?? ''}
            />
          ))}
          {summary.hotel && (
            <LuggageTag
              hotel={summary.hotel}
              angle={no % 2 ? 3 : -3}
            />
          )}
        </div>
      )}

      {flight && !flightFirst && (
        <BoardingPass
          flight={flight}
          date={date}
        />
      )}
    </section>
  );
}
