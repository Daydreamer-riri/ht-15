import type { Day, HotelUnit, Itinerary, Leg, PoiUnit, TransportUnit, Unit } from '@/data/types';
import { BedDouble, Car, ChevronDown, ChevronsUp, MapPin, Plane, Trophy } from 'lucide-react';
import { dayTitle, itemNumbers, unitShortName } from './utils';

const cardClass = 'rounded-[8px] border border-[#e5e5e5] bg-white';

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-[67px] shrink-0 rounded-[6px] bg-[#f5f7fa] object-cover"
    />
  );
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-[5px] h-[10px] w-px shrink-0 bg-[#ddd]"
    />
  );
}

function Remark({ text }: { text?: string }) {
  if (!text) {
    return null;
  }
  return (
    <p className="mt-[10px] line-clamp-2 rounded-[6px] bg-[#f5f7fa] px-[8px] py-[6px] text-[12.5px] leading-[18px] break-all text-[#555]">
      {text}
    </p>
  );
}

function HotelStars({ count }: { count: number }) {
  return (
    <span
      className="ml-[2px] inline-flex shrink-0 items-center"
      aria-label={`${count}钻`}
    >
      {Array.from({ length: count }, (_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path
            d="M3 1.5h6L11 4.5 6 10.5 1 4.5z"
            fill="#ffaf00"
          />
        </svg>
      ))}
    </span>
  );
}

/* ---------------- 总览 ---------------- */

function UnitBadge({ unit }: { unit: Unit }) {
  if (unit.kind === 'transport') {
    return (
      <span className="mr-[3px] inline-flex size-[15px] shrink-0 items-center justify-center rounded-full bg-[#8188ff]">
        <Plane
          className="size-[9px] text-white"
          strokeWidth={2.5}
        />
      </span>
    );
  }
  if (unit.kind === 'hotel') {
    return (
      <span className="mr-[3px] inline-flex size-[15px] shrink-0 items-center justify-center rounded-full bg-[#3290fa]">
        <BedDouble
          className="size-[9px] text-white"
          strokeWidth={2.5}
        />
      </span>
    );
  }
  return null;
}

function FlowArrow() {
  return (
    <svg
      aria-hidden
      width="15"
      height="6"
      viewBox="0 0 15 6"
      className="mx-[6px] shrink-0"
    >
      <path
        d="M0 4.5h13L9.5 1"
        fill="none"
        stroke="#c7cbd1"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function OverviewCard({ day, onClick }: { day: Day; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} w-full px-[13px] py-[12px] text-left active:bg-[#f8f9fb]`}
    >
      <h3 className="text-[17.7px] leading-[22px] font-medium text-[#111]">{dayTitle(day)}</h3>
      <div className="mt-[7px] flex flex-wrap items-center gap-y-[3px] text-[13.5px] leading-[19px] text-[#555]">
        {day.items.map((u, i) => (
          <span
            key={u.id}
            className="inline-flex items-center"
          >
            {i > 0 && <FlowArrow />}
            <UnitBadge unit={u} />
            {unitShortName(u)}
          </span>
        ))}
      </div>
    </button>
  );
}

export function OverviewTodoCard({ units, onClick }: { units: Unit[]; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} w-full px-[13px] py-[12px] text-left active:bg-[#f8f9fb]`}
    >
      <h3 className="text-[17.7px] leading-[22px] font-medium text-[#111]">待安排</h3>
      <p className="mt-[7px] line-clamp-2 text-[13.5px] leading-[19px] text-[#555]">
        {units.map(unitShortName).join('、')}
      </p>
    </button>
  );
}

export function OverviewFooter({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-[2px] py-[16px] text-[13px] text-[#888]"
    >
      向上滑动查看详情
      <ChevronsUp className="size-[13px]" />
    </button>
  );
}

/* ---------------- 详情 ---------------- */

export function LegRow({ leg, to }: { leg: Leg; to?: string }) {
  const parts = [leg.duration];
  if (leg.from) {
    parts.push(`从${leg.from}出发`);
  }
  parts.push(leg.target ? `距${leg.target} ${leg.distance}` : leg.distance);
  const navTarget = leg.target ?? to;
  return (
    <div className="flex h-[46px] items-center text-[12.5px] text-[#555]">
      <Car className="mr-[4px] size-[15px] shrink-0" />
      <span className="min-w-0 truncate">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="px-[1px]">·</span>}
            {p}
          </span>
        ))}
      </span>
      <ChevronDown
        aria-hidden
        className="mx-[6px] size-[11px] shrink-0"
      />
      {navTarget
        ? (
            <a
              className="shrink-0 text-[#006ff6]"
              href={`https://uri.amap.com/search?keyword=${encodeURIComponent(navTarget)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              导航
            </a>
          )
        : <span className="shrink-0 text-[#006ff6]">导航</span>}
    </div>
  );
}

function FlightCard({ unit }: { unit: TransportUnit }) {
  return (
    <div className={`${cardClass} px-[13px] pt-[12px] pb-[10px]`}>
      <div className="flex items-center">
        <div className="min-w-0">
          <div className="text-[18.7px] leading-[24px] font-medium text-[#111]">{unit.departTime}</div>
        </div>
        <div className="flex flex-1 items-center px-[6px] text-[11.4px] text-[#555]">
          <span className="h-px flex-1 bg-[#ddd]" />
          <span className="px-[3px]">{unit.duration}</span>
          <span className="h-px flex-1 bg-[#ddd]" />
          <svg
            aria-hidden
            width="4"
            height="6"
            viewBox="0 0 4 6"
            className="-ml-px"
          >
            <path
              d="M0 0l4 3-4 3z"
              fill="#ddd"
            />
          </svg>
        </div>
        <div className="w-[45%] min-w-0">
          <div className="text-[18.7px] leading-[24px] font-medium text-[#111]">{unit.arriveTime}</div>
        </div>
      </div>
      <div className="mt-[2px] flex text-[12.5px] text-[#111]">
        <span className="min-w-0 flex-1 truncate">{[unit.from.name, unit.from.terminal].filter(Boolean).join(' ')}</span>
        <span className="w-[45%] min-w-0 truncate">{[unit.to.name, unit.to.terminal].filter(Boolean).join(' ')}</span>
      </div>
      <div className="mt-[10px] flex items-center text-[12.5px] text-[#555]">
        {unit.dateText}
        <Divider />
        <Plane className="mr-[4px] size-[12px]" />
        {unit.number}
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

function SimpleTransportCard({ unit }: { unit: TransportUnit }) {
  return (
    <div className={`${cardClass} flex items-center gap-[10px] px-[13px] py-[12px]`}>
      <div className="min-w-0 flex-1">
        <div className="text-[15.6px] font-medium text-[#111]">{unit.from.city}</div>
        <div className="truncate text-[12.5px] text-[#555]">{unit.from.name}</div>
      </div>
      <FlowArrow />
      <div className="min-w-0 flex-1 text-right">
        <div className="text-[15.6px] font-medium text-[#111]">{unit.to.city}</div>
        <div className="truncate text-[12.5px] text-[#555]">{unit.to.name}</div>
      </div>
    </div>
  );
}

function PoiCard({ unit, no }: { unit: PoiUnit; no?: number }) {
  return (
    <div className={`${cardClass} p-[13px]`}>
      <div className="flex gap-[6px]">
        <Thumb
          src={unit.image}
          alt={unit.name}
        />
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[15.6px] leading-[19px] font-medium text-[#111]">
            {no !== undefined && `${no}.`}
            {unit.name}
          </h4>
          <div className="mt-[4px] flex items-center text-[12.5px] leading-[19px] text-[#555]">
            <span className="shrink-0">{unit.playTime}</span>
            {unit.openStatus && (
              <>
                <Divider />
                <span className="truncate">{unit.openStatus}</span>
              </>
            )}
          </div>
          {unit.price && <div className="mt-[3px] text-[12.5px] leading-[19px] text-[#555]">{unit.price}</div>}
        </div>
      </div>
      <Remark text={unit.remark} />
    </div>
  );
}

function HotelCard({ unit, no }: { unit: HotelUnit; no?: number }) {
  return (
    <div className={`${cardClass} p-[13px]`}>
      <div className="flex gap-[6px]">
        <Thumb
          src={unit.image}
          alt={unit.name}
        />
        <div className="min-w-0 flex-1">
          <h4 className="flex items-center text-[15.6px] leading-[19px] font-medium text-[#111]">
            <span className="truncate">
              {no !== undefined && `${no}.`}
              {unit.name}
            </span>
            <HotelStars count={unit.star} />
          </h4>
          <div className="mt-[4px] flex items-center text-[13.5px]">
            <span className="flex h-[19px] items-center rounded-[2px_2px_6px_2px] bg-[#006ff6] px-[5px] text-white">
              <span className="font-medium">{unit.score.toFixed(1)}</span>
              <span>分</span>
            </span>
            <span className="ml-[4px] text-[#555]">
              {unit.reviewCount}
              条点评
            </span>
          </div>
          {unit.rank && (
            <div className="mt-[4px] flex items-center gap-[3px] truncate text-[12.5px] text-[#a86500]">
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
    <div className={`${cardClass} p-[13px]`}>
      <div className="flex items-center gap-[6px]">
        <MapPin className="size-[16px] shrink-0 text-[#ff8a00]" />
        <h4 className="truncate text-[15.6px] font-medium text-[#111]">
          {no !== undefined && `${no}. `}
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

function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <h3 className={`${first ? 'pt-[12px]' : 'mt-[14px] border-t border-[#f0f0f0] pt-[26px]'} pb-[14px] text-[19.8px] leading-[25px] font-medium text-[#111]`}>
      {children}
    </h3>
  );
}

const unitTarget = (u: Unit) => (u.kind === 'transport' ? u.from.name : u.name);

export function DaySection({ day, first, sectionRef }: { day: Day; first?: boolean; sectionRef: (el: HTMLElement | null) => void }) {
  const nums = itemNumbers(day.items);
  return (
    <section
      ref={sectionRef}
      data-day={day.index}
      aria-label={dayTitle(day)}
    >
      <SectionTitle first={first}>{dayTitle(day)}</SectionTitle>
      {day.items.map((u, i) => (
        <div key={u.id}>
          {u.leg ? (
            <LegRow
              leg={u.leg}
              to={unitTarget(u)}
            />
          ) : (i > 0 && <div className="h-[12px]" />)}
          <UnitCard
            unit={u}
            no={nums.get(u.id)}
          />
        </div>
      ))}
      {day.returnLeg && <LegRow leg={day.returnLeg} />}
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
      <SectionTitle>待安排</SectionTitle>
      <div className="flex flex-col gap-[12px]">
        {itinerary.toBePlanned.map(u => (
          <UnitCard
            key={u.id}
            unit={u}
          />
        ))}
      </div>
    </section>
  );
}
