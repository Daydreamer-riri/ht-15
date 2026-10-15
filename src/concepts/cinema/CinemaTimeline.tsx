import type { CSSProperties, ReactNode } from 'react';
import type { DaySummary } from '../shared/trip';
import type { Leg, TransportUnit, Unit } from '@/data/types';
import { BedDouble, Car, MapPin, MountainSnow, Plane } from 'lucide-react';
import { crop } from '../shared/trip';

const ICONS = { transport: Plane, poi: MountainSnow, hotel: BedDouble, custom: MapPin } as const;

const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

function LegRow({ leg, index, target }: { leg: Leg; index: number; target?: string }) {
  const extra = leg.from ? `从${leg.from}出发` : target ? `返回${target}` : '';
  return (
    <li
      className="cn-tl__leg"
      style={stagger(index)}
    >
      <Car aria-hidden />
      <span>{[leg.duration, leg.distance, extra].filter(Boolean).join(' · ')}</span>
    </li>
  );
}

function FlightBody({ unit }: { unit: TransportUnit }) {
  return (
    <>
      <p className="cn-tl__name">{`${unit.from.city} → ${unit.to.city}`}</p>
      <div className="cn-tl__flight">
        <b>{unit.departTime}</b>
        <span className="cn-tl__line">
          <em>{unit.duration}</em>
          <Plane aria-hidden />
        </span>
        <b>{unit.arriveTime}</b>
      </div>
      <p className="cn-tl__meta">
        {`${unit.number ?? ''} · ${unit.from.name}${unit.from.terminal ? ` ${unit.from.terminal}` : ''} → ${unit.to.name}`}
      </p>
    </>
  );
}

function Body({ unit }: { unit: Unit }): ReactNode {
  switch (unit.kind) {
    case 'transport':
      return unit.mode === 'flight'
        ? <FlightBody unit={unit} />
        : <p className="cn-tl__name">{`${unit.from.city} → ${unit.to.city}`}</p>;
    case 'poi':
      return (
        <>
          <p className="cn-tl__name">{unit.name}</p>
          <p className="cn-tl__meta">{[unit.playTime, unit.price, unit.openStatus].filter(Boolean).join(' · ')}</p>
          {unit.remark && <p className="cn-tl__remark">{unit.remark}</p>}
        </>
      );
    case 'hotel':
      return (
        <>
          <p className="cn-tl__kicker">今晚入住</p>
          <p className="cn-tl__name">{unit.name}</p>
          <p className="cn-tl__meta">
            <span className="cn-tl__diamonds">{'◆'.repeat(unit.star)}</span>
            {` ${unit.score.toFixed(1)}分 · ${unit.reviewCount.toLocaleString()}条点评`}
          </p>
          {unit.rank && <p className="cn-tl__rank">{unit.rank}</p>}
        </>
      );
    case 'custom':
      return (
        <>
          <p className="cn-tl__name">{unit.name}</p>
          <p className="cn-tl__meta">自定义地点</p>
        </>
      );
  }
}

export function CinemaTimeline({ summary }: { summary: DaySummary }) {
  const { day } = summary;
  const rows: ReactNode[] = [];
  for (const u of day.items) {
    if (u.leg) {
      rows.push(
        <LegRow
          key={`${u.id}-leg`}
          leg={u.leg}
          index={rows.length}
        />,
      );
    }
    const Icon = ICONS[u.kind];
    const image = (u.kind === 'poi' || u.kind === 'hotel') ? u.image : '';
    rows.push(
      <li
        key={u.id}
        className="cn-tl__item"
        data-kind={u.kind}
        style={stagger(rows.length)}
      >
        <span
          className="cn-tl__dot"
          aria-hidden
        >
          <Icon />
        </span>
        <div className="cn-tl__main">
          <Body unit={u} />
        </div>
        {image && (
          <img
            className="cn-tl__thumb"
            src={crop(image, '180x180')}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
      </li>,
    );
  }
  if (day.returnLeg) {
    rows.push(
      <LegRow
        key="return"
        leg={day.returnLeg}
        index={rows.length}
        target={day.returnLeg.target}
      />,
    );
  }
  return <ol className="cn-tl">{rows}</ol>;
}
