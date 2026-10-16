import type { Day, HotelUnit, Itinerary, Leg, PoiUnit, TransportUnit, Unit } from '@/data/types';
import { ArrowUpRight, Car, ChevronRight, ChevronsUp, Clock, MapPin, Plane, Ticket, Trophy } from 'lucide-react';
import { dayCities, dayNo, itemNumbers, shortDate, unitColor, unitShortName } from './utils';

/** 卡片：无边框，暖色调投影 */
export const cardClass = 'rounded-[16px] bg-white shadow-card';

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-[72px] shrink-0 rounded-[10px] bg-paper-deep object-cover"
    />
  );
}

function Remark({ text }: { text?: string }) {
  if (!text) {
    return null;
  }
  return (
    <p className="mt-[12px] line-clamp-2 border-l-2 border-line pl-[10px] text-[12.5px] leading-[19px] break-all text-ink-2">
      {text}
    </p>
  );
}

function HotelStars({ count }: { count: number }) {
  return (
    <span
      className="ml-[4px] inline-flex shrink-0 items-center"
      aria-label={`${count}钻`}
    >
      {Array.from({ length: count }, (_, i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path
            d="M3 1.5h6L11 4.5 6 10.5 1 4.5z"
            fill="#e0a43a"
          />
        </svg>
      ))}
    </span>
  );
}

function FlowArrow() {
  return (
    <svg
      aria-hidden
      width="12"
      height="6"
      viewBox="0 0 15 6"
      className="mx-[5px] shrink-0"
    >
      <path
        d="M0 4.5h13L9.5 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-ink-3/60"
      />
    </svg>
  );
}

/* ---------------- 总览 ---------------- */

const overviewButton = `${cardClass} group flex w-full items-stretch gap-[14px] px-[16px] py-[14px] text-left transition duration-200 ease-out hover:-translate-y-px hover:shadow-card-hover active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`;

export function OverviewCard({ day, onClick }: { day: Day; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={overviewButton}
    >
      <div className="flex w-[40px] shrink-0 flex-col">
        <span className="font-serif text-[28px] leading-[30px] font-bold tracking-[-0.02em] text-ink tabular-nums">{dayNo(day)}</span>
        <span className="mt-[6px] text-[11px] leading-[14px] text-ink-3 tabular-nums">{shortDate(day.label)}</span>
        <span className="text-[11px] leading-[14px] text-ink-3">{day.weekday}</span>
      </div>
      <div className="min-w-0 flex-1 border-l border-line pl-[14px]">
        <h3 className="text-[15.5px] leading-[22px] font-semibold text-balance text-ink">{dayCities(day)}</h3>
        <ul className="mt-[6px] flex flex-wrap items-center gap-y-[4px] text-[12.5px] leading-[18px] text-ink-2">
          {day.items.map((u, i) => (
            <li
              key={u.id}
              className="inline-flex items-center"
            >
              {i > 0 && <FlowArrow />}
              <span
                aria-hidden
                className="mr-[4px] size-[6px] shrink-0 rounded-full"
                style={{ background: unitColor(u) }}
              />
              {unitShortName(u)}
            </li>
          ))}
        </ul>
      </div>
      <ChevronRight
        aria-hidden
        className="size-[16px] shrink-0 self-center text-ink-3 transition-transform duration-200 group-hover:translate-x-[2px]"
      />
    </button>
  );
}

export function OverviewTodoCard({ units, onClick }: { units: Unit[]; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${overviewButton} bg-transparent shadow-none ring-1 ring-line ring-inset hover:bg-white`}
    >
      <div className="flex w-[40px] shrink-0 flex-col">
        <span className="font-serif text-[28px] leading-[30px] font-bold text-ink-3 tabular-nums">{units.length}</span>
        <span className="mt-[6px] text-[11px] leading-[14px] text-ink-3">项</span>
      </div>
      <div className="min-w-0 flex-1 border-l border-line pl-[14px]">
        <h3 className="text-[15.5px] leading-[22px] font-semibold text-ink">待安排</h3>
        <p className="mt-[6px] line-clamp-2 text-[12.5px] leading-[18px] text-ink-2">
          {units.map(unitShortName).join('、')}
        </p>
      </div>
      <ChevronRight
        aria-hidden
        className="size-[16px] shrink-0 self-center text-ink-3"
      />
    </button>
  );
}

export function OverviewFooter({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-[4px] rounded-full px-[12px] py-[14px] text-[12.5px] text-ink-3 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
    >
      向上滑动查看每日详情
      <ChevronsUp className="size-[14px] animate-bounce" />
    </button>
  );
}

/* ---------------- 详情 ---------------- */

/** 时间轴左侧留白，节点与竖线都放在这里 */
const RAIL = 'pl-[24px]';

export function LegRow({ leg, to }: { leg: Leg; to?: string }) {
  const parts = [leg.duration];
  if (leg.from) {
    parts.push(`从${leg.from}出发`);
  }
  parts.push(leg.target ? `距${leg.target} ${leg.distance}` : leg.distance);
  const navTarget = leg.target ?? to;
  return (
    <div className={`relative flex h-[44px] items-center gap-[8px] ${RAIL} text-[12px] text-ink-2 tabular-nums`}>
      <span
        aria-hidden
        className="absolute top-1/2 left-[-1px] flex size-[14px] -translate-y-1/2 items-center justify-center bg-paper text-ink-3"
      >
        <Car className="size-[13px]" />
      </span>
      <span className="min-w-0 flex-1 truncate">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="px-[4px] text-ink-3">·</span>}
            {p}
          </span>
        ))}
      </span>
      {navTarget && (
        <a
          className="inline-flex shrink-0 items-center gap-[2px] rounded-full bg-brand/10 px-[9px] py-[3px] font-medium text-brand transition-colors hover:bg-brand/15 focus-visible:outline-2 focus-visible:outline-brand"
          href={`https://uri.amap.com/search?keyword=${encodeURIComponent(navTarget)}`}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`导航到${navTarget}`}
        >
          导航
          <ArrowUpRight className="size-[12px]" />
        </a>
      )}
    </div>
  );
}

function FlightCard({ unit }: { unit: TransportUnit }) {
  const place = (end: TransportUnit['from']) => [end.name, end.terminal].filter(Boolean).join(' ');
  return (
    <div className={`${cardClass} px-[16px] pt-[14px] pb-[12px]`}>
      <div className="flex items-center justify-between text-[11.5px] text-ink-3 tabular-nums">
        <span className="inline-flex items-center gap-[5px] font-medium text-flight">
          <Plane className="size-[12px]" />
          {unit.number}
        </span>
        <span>{unit.dateText}</span>
      </div>
      <div className="mt-[8px] grid grid-cols-[1fr_auto_1fr] items-center gap-[10px]">
        <div className="min-w-0">
          <div className="text-[24px] leading-[28px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{unit.departTime}</div>
          <div className="mt-[2px] truncate text-[12px] text-ink-2">{place(unit.from)}</div>
        </div>
        <div className="flex w-[74px] flex-col items-center text-[11px] text-ink-3">
          <span className="tabular-nums">{unit.duration}</span>
          <span className="mt-[3px] flex w-full items-center">
            <span className="h-px flex-1 border-t border-dashed border-ink-3/50" />
            <Plane className="mx-[3px] size-[11px] rotate-45 text-flight" />
            <span className="h-px flex-1 border-t border-dashed border-ink-3/50" />
          </span>
        </div>
        <div className="min-w-0 text-right">
          <div className="text-[24px] leading-[28px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{unit.arriveTime}</div>
          <div className="mt-[2px] truncate text-[12px] text-ink-2">{place(unit.to)}</div>
        </div>
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

function SimpleTransportCard({ unit }: { unit: TransportUnit }) {
  return (
    <div className={`${cardClass} flex items-center gap-[10px] px-[16px] py-[14px]`}>
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-semibold text-ink">{unit.from.city}</div>
        <div className="truncate text-[12px] text-ink-2">{unit.from.name}</div>
      </div>
      <FlowArrow />
      <div className="min-w-0 flex-1 text-right">
        <div className="text-[15.5px] font-semibold text-ink">{unit.to.city}</div>
        <div className="truncate text-[12px] text-ink-2">{unit.to.name}</div>
      </div>
    </div>
  );
}

function ItemNo({ no }: { no?: number }) {
  if (no === undefined) {
    return null;
  }
  return <span className="mr-[6px] font-serif text-ink-3 tabular-nums">{String(no).padStart(2, '0')}</span>;
}

function PoiCard({ unit, no }: { unit: PoiUnit; no?: number }) {
  return (
    <div className={`${cardClass} p-[12px]`}>
      <div className="flex gap-[12px]">
        <Thumb
          src={unit.image}
          alt={unit.name}
        />
        <div className="min-w-0 flex-1 py-[2px]">
          <h4 className="truncate text-[15.5px] leading-[20px] font-semibold text-ink">
            <ItemNo no={no} />
            {unit.name}
          </h4>
          <div className="mt-[6px] flex items-center gap-[4px] text-[12px] leading-[18px] text-ink-2">
            <Clock className="size-[12px] shrink-0 text-ink-3" />
            <span className="shrink-0">{unit.playTime}</span>
            {unit.openStatus && (
              <>
                <span className="px-[2px] text-ink-3">·</span>
                <span className="truncate">{unit.openStatus}</span>
              </>
            )}
          </div>
          {unit.price && (
            <div className="mt-[2px] flex items-center gap-[4px] text-[12px] leading-[18px] text-ink-2">
              <Ticket className="size-[12px] shrink-0 text-ink-3" />
              <span className="truncate">{unit.price}</span>
            </div>
          )}
        </div>
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

function HotelCard({ unit, no }: { unit: HotelUnit; no?: number }) {
  return (
    <div className={`${cardClass} p-[12px]`}>
      <div className="flex gap-[12px]">
        <Thumb
          src={unit.image}
          alt={unit.name}
        />
        <div className="min-w-0 flex-1 py-[2px]">
          <h4 className="flex items-center text-[15.5px] leading-[20px] font-semibold text-ink">
            <span className="truncate">
              <ItemNo no={no} />
              {unit.name}
            </span>
            <HotelStars count={unit.star} />
          </h4>
          <div className="mt-[6px] flex items-center text-[12px] tabular-nums">
            <span className="flex h-[19px] items-center gap-[1px] rounded-[6px_6px_6px_2px] bg-brand px-[6px] text-white">
              <span className="font-semibold">{unit.score.toFixed(1)}</span>
              <span className="text-[10.5px]">分</span>
            </span>
            <span className="ml-[6px] text-ink-2">
              {unit.reviewCount.toLocaleString('zh-CN')}
              {' '}
              条点评
            </span>
          </div>
          {unit.rank && (
            <div className="mt-[5px] flex items-center gap-[4px] truncate text-[12px] text-[#94621a]">
              <Trophy className="size-[12px] shrink-0" />
              {unit.rank}
            </div>
          )}
        </div>
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

function CustomCard({ unit, no }: { unit: Extract<Unit, { kind: 'custom' }>; no?: number }) {
  return (
    <div className={`${cardClass} px-[16px] py-[14px]`}>
      <div className="flex items-center gap-[6px]">
        <MapPin className="size-[15px] shrink-0 text-custom" />
        <h4 className="truncate text-[15.5px] font-semibold text-ink">
          <ItemNo no={no} />
          {unit.name}
        </h4>
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

export function UnitCard({ unit, no }: { unit: Unit; no?: number }) {
  switch (unit.kind) {
    case 'transport':
      return unit.mode === 'flight' ? <FlightCard unit={unit} /> : <SimpleTransportCard unit={unit} />;
    case 'poi':
      return (
        <PoiCard
          unit={unit}
          no={no}
        />
      );
    case 'hotel':
      return (
        <HotelCard
          unit={unit}
          no={no}
        />
      );
    case 'custom':
      return (
        <CustomCard
          unit={unit}
          no={no}
        />
      );
  }
}

/** 时间轴节点：类别色圆点，压在竖线上 */
function TimelineDot({ unit }: { unit: Unit }) {
  return (
    <span
      aria-hidden
      className="absolute top-[22px] left-0 size-[13px] rounded-full border-[3px] border-paper"
      style={{ background: unitColor(unit) }}
    />
  );
}

function SectionShell({ first, children }: { first?: boolean; children: React.ReactNode }) {
  return <div className={first ? 'pt-[14px]' : 'mt-[28px] border-t border-dashed border-line pt-[26px]'}>{children}</div>;
}

const unitTarget = (u: Unit) => (u.kind === 'transport' ? u.from.name : u.name);

export function DaySection({ day, first, sectionRef }: { day: Day; first?: boolean; sectionRef: (el: HTMLElement | null) => void }) {
  const nums = itemNumbers(day.items);
  return (
    <section
      ref={sectionRef}
      data-day={day.index}
      aria-label={`${day.label} ${day.weekday} ${dayCities(day)}`}
    >
      <SectionShell first={first}>
        <header className="flex items-end gap-[12px] pb-[14px]">
          <span className="font-serif text-[46px] leading-[40px] font-bold tracking-[-0.03em] text-brand tabular-nums">{dayNo(day)}</span>
          <div className="min-w-0 pb-[1px]">
            <div className="text-[11.5px] leading-[16px] text-ink-3 tabular-nums">
              {shortDate(day.label)}
              {' · '}
              {day.weekday}
            </div>
            <h3 className="font-serif text-[18.5px] leading-[24px] font-bold text-balance text-ink">{dayCities(day)}</h3>
          </div>
        </header>
        {/* 竖线贯穿整天，节点和驾车段都挂在上面 */}
        <ol className="relative before:absolute before:top-[12px] before:bottom-[12px] before:left-[6px] before:w-px before:bg-line">
          {day.items.map((u, i) => (
            <li key={u.id}>
              {u.leg
                ? (
                    <LegRow
                      leg={u.leg}
                      to={unitTarget(u)}
                    />
                  )
                : (i > 0 && <div className="h-[12px]" />)}
              <div className={`relative ${RAIL}`}>
                <TimelineDot unit={u} />
                <UnitCard
                  unit={u}
                  no={nums.get(u.id)}
                />
              </div>
            </li>
          ))}
          {day.returnLeg && (
            <li>
              <LegRow leg={day.returnLeg} />
            </li>
          )}
        </ol>
      </SectionShell>
    </section>
  );
}

export function TodoSection({ itinerary, sectionRef }: { itinerary: Itinerary; sectionRef: (el: HTMLElement | null) => void }) {
  return (
    <section
      ref={sectionRef}
      data-day="todo"
      aria-label="待安排"
    >
      <SectionShell>
        <header className="flex items-end gap-[12px] pb-[14px]">
          <span className="font-serif text-[46px] leading-[40px] font-bold text-ink-3 tabular-nums">{itinerary.toBePlanned.length}</span>
          <div className="pb-[1px]">
            <div className="text-[11.5px] leading-[16px] text-ink-3">还没排进日程</div>
            <h3 className="font-serif text-[18.5px] leading-[24px] font-bold text-ink">待安排</h3>
          </div>
        </header>
        <div className="flex flex-col gap-[12px]">
          {itinerary.toBePlanned.map(u => (
            <div
              key={u.id}
              className="opacity-90"
            >
              <UnitCard unit={u} />
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}
