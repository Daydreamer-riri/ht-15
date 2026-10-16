import type { Day, HotelUnit, Itinerary, Leg, PoiUnit, TransportUnit, Unit } from '@/data/types';
import { ArrowUpRight, BedDouble, Clock, MapPin, Plane, Ticket, Trophy } from 'lucide-react';
import {
  dayCities,
  dayHero,
  dayNo,
  dayStats,
  dayTheme,
  formatDrive,
  formatKm,
  itemNumbers,
  pad2,
  parseMinutes,
  shortDate,
  sizedImage,
  type Theme,
  themeVars,
  TODO_THEME,
  type tripStats,
  unitShortName,
} from './utils';

/* ================= 通用 ================= */

/** 带墨色硬投影的“贴纸”块 */
const sticker = 'border-2 border-ink shadow-[4px_4px_0_var(--color-ink)]';

function Photo({ src, alt, w, h, className = '' }: { src: string; alt: string; w: number; h: number; className?: string }) {
  return (
    <img
      src={sizedImage(src, w, h)}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`bg-ink/10 object-cover ${className}`}
    />
  );
}

/** 跑马灯：重复两份内容，平移 -50% 实现无缝循环 */
export function Marquee({ items, theme, reverse }: { items: string[]; theme: Theme; reverse?: boolean }) {
  const row = items.map((t, i) => (
    <span
      key={i}
      className="flex items-center gap-[14px] pr-[14px]"
    >
      {t}
      <span aria-hidden>✦</span>
    </span>
  ));
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y-2 border-ink py-[7px] font-display text-[19px] leading-none tracking-[0.02em] uppercase"
      style={{ background: theme.color, color: theme.on }}
    >
      <div className={`flex w-max animate-marquee whitespace-nowrap ${reverse ? '[animation-direction:reverse]' : ''}`}>
        {row}
        {row}
      </div>
    </div>
  );
}

/* ================= 封面 ================= */

export function Cover({ itinerary, stats }: { itinerary: Itinerary; stats: ReturnType<typeof tripStats> }) {
  const hero = itinerary.days.map(dayHero).find(u => u?.kind === 'poi' && u.name.includes('赛里木')) ?? dayHero(itinerary.days[0]);
  const days = itinerary.days.length;
  return (
    <header className="relative bg-[#1e4fff] text-white">
      {/* 刊头 */}
      <div className="flex items-center justify-between px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-[10px] text-[11px] font-semibold tracking-[0.18em] uppercase">
        <span>Trip Journal</span>
        <span className="tabular-nums">No.07 · Autumn</span>
      </div>
      <div className="px-[18px]">
        <div className="font-display text-[90px] leading-[0.86] tracking-[-0.01em] text-[#ffc21a] uppercase">
          North
          <br />
          Xinjiang
        </div>
      </div>

      {/* 封面大图，与刊名互相叠压 */}
      <div className="relative mx-[18px] -mt-[12px]">
        {hero && (
          <Photo
            src={hero.image}
            alt={hero.name}
            w={720}
            h={960}
            className={`aspect-[3/4] w-full ${sticker}`}
          />
        )}
        <div className="absolute -top-[14px] right-[-6px] rotate-[8deg] rounded-full border-2 border-ink bg-[#ff4fa0] px-[12px] py-[8px] text-center text-ink shadow-[3px_3px_0_var(--color-ink)]">
          <div className="font-display text-[30px] leading-[28px]">
            {days}
            D
            {stats.nights}
            N
          </div>
          <div className="text-[10px] font-bold tracking-[0.1em]">自驾环线</div>
        </div>
        <div className="absolute bottom-[14px] left-[14px] bg-ink px-[8px] py-[4px] text-[11px] font-medium text-white">
          封面 ·
          {' '}
          {hero?.name}
        </div>
      </div>

      <div className="px-[18px] pt-[22px] pb-[26px]">
        <h1 className="font-serif text-[40px] leading-[46px] font-black tracking-[-0.01em]">{itinerary.name}</h1>
        <p className="mt-[8px] max-w-[30ch] text-[14px] leading-[22px] text-white/80">
          从吐鲁番的火焰色沙漠出发，一路北上到喀纳斯的白桦林，再折向赛里木湖的蓝。
          {stats.cities}
          {' '}
          座城市，
          {formatKm(stats.km)}
          {' '}
          公里公路。
        </p>
        <dl className="mt-[20px] grid grid-cols-4 border-t-2 border-white/90">
          {[
            [stats.range.split(' – ')[0], '出发'],
            [String(stats.cities), '城市'],
            [String(stats.places), '地点'],
            [formatKm(stats.km), '公里'],
          ].map(([n, k], i) => (
            <div
              key={k}
              className={`pt-[10px] ${i ? 'border-l-2 border-white/90 pl-[10px]' : ''}`}
            >
              <dt className="text-[10.5px] font-semibold tracking-[0.12em] text-white/70">{k}</dt>
              <dd className="font-display text-[26px] leading-[30px] text-white tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
        <Editors editors={itinerary.coEditors} />
      </div>
    </header>
  );
}

function Editors({ editors }: { editors: Itinerary['coEditors'] }) {
  const shown = editors.slice(0, 4);
  const rest = editors.length - shown.length;
  return (
    <div className="mt-[20px] flex items-center gap-[10px]">
      <div
        className="flex"
        aria-label={`${editors.length}位共同编辑者`}
      >
        {shown.map(e => (
          <img
            key={e.avatar}
            src={e.avatar}
            alt={e.nickName}
            referrerPolicy="no-referrer"
            className="-ml-[8px] size-[30px] rounded-full border-2 border-[#1e4fff] bg-white/20 object-cover first:ml-0"
          />
        ))}
        {rest > 0 && (
          <span className="-ml-[8px] flex size-[30px] items-center justify-center rounded-full border-2 border-[#1e4fff] bg-[#ffc21a] text-[11px] font-bold text-ink tabular-nums">
            +
            {rest}
          </span>
        )}
      </div>
      <span className="text-[12px] text-white/75">
        {editors.length}
        {' '}
        位旅伴共同编辑
      </span>
    </div>
  );
}

/* ================= 目录 ================= */

export function Contents({ itinerary, onJump }: { itinerary: Itinerary; onJump: (key: string) => void }) {
  return (
    <section
      aria-labelledby="toc-title"
      className="bg-paper px-[18px] pt-[30px] pb-[34px]"
    >
      <div className="flex items-end justify-between border-b-2 border-ink pb-[8px]">
        <h2
          id="toc-title"
          className="font-display text-[46px] leading-[40px] uppercase"
        >
          Contents
        </h2>
        <span className="pb-[3px] text-[12px] font-semibold text-ink/60">目录 · 7 章</span>
      </div>
      <ol>
        {itinerary.days.map(d => {
          const t = dayTheme(d.index);
          const s = dayStats(d);
          return (
            <li
              key={d.index}
              className="border-b border-ink/15"
            >
              <button
                type="button"
                onClick={() => onJump(String(d.index))}
                className="group flex w-full items-center gap-[12px] py-[12px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span
                  className="flex size-[44px] shrink-0 items-center justify-center border-2 border-ink font-display text-[24px] transition-transform duration-200 group-hover:-rotate-6 group-active:scale-95"
                  style={{ background: t.color, color: t.on }}
                >
                  {dayNo(d)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[17px] leading-[22px] font-black">{dayCities(d)}</span>
                  <span className="mt-[2px] block text-[11.5px] text-ink/60 tabular-nums">
                    {shortDate(d.label)}
                    {' '}
                    {d.weekday}
                    {s.km > 0 && ` · ${formatKm(s.km)} km`}
                    {s.stops > 0 && ` · ${s.stops} 站`}
                  </span>
                </span>
                <ArrowUpRight className="size-[18px] shrink-0 rotate-45 transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ================= 章节 ================= */

function ChapterOpener({ day, theme }: { day: Day; theme: Theme }) {
  const hero = dayHero(day);
  const s = dayStats(day);
  return (
    <div style={{ background: theme.color, color: theme.on }}>
      <div className="flex items-start justify-between px-[18px] pt-[22px] text-[11px] font-bold tracking-[0.16em] uppercase">
        <span>
          Day
          {' '}
          {dayNo(day)}
          {' '}
          / 07
        </span>
        <span className="tabular-nums">
          {shortDate(day.label)}
          {' '}
          {day.weekday}
        </span>
      </div>
      <div className="relative px-[18px]">
        <div className="mt-[16px] min-h-[200px] font-display text-[190px] leading-[0.8] tracking-[-0.04em] tabular-nums">{dayNo(day)}</div>
        {hero && (
          <Photo
            src={hero.image}
            alt={hero.name}
            w={400}
            h={500}
            className={`absolute top-[6px] right-[18px] aspect-[4/5] w-[42%] rotate-[3deg] ${sticker}`}
          />
        )}
      </div>
      <div className="px-[18px] pt-[14px] pb-[20px]">
        <h2 className="font-serif text-[34px] leading-[40px] font-black text-balance">{dayCities(day)}</h2>
        {(s.km > 0 || s.stops > 0) && (
          <dl className="mt-[14px] flex gap-[22px] border-t-2 border-current pt-[10px]">
            {[
              s.km > 0 && [formatKm(s.km), '公里'],
              s.minutes > 0 && [formatDrive(s.minutes), '车程'],
              s.stops > 0 && [String(s.stops), '站'],
            ].filter(Boolean).map(entry => {
              const [n, k] = entry as string[];
              return (
                <div key={k}>
                  <dt className="text-[10.5px] font-bold tracking-[0.12em] opacity-70">{k}</dt>
                  <dd className="font-display text-[28px] leading-[30px] tabular-nums">{n}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </div>
  );
}

function LegRow({ leg, to }: { leg: Leg; to?: string }) {
  const navTarget = leg.target ?? to;
  return (
    <div className="relative flex items-center gap-[10px] py-[10px] pl-[34px] text-[12px] tabular-nums">
      <span
        aria-hidden
        className="absolute top-1/2 left-[7px] size-[12px] -translate-y-1/2 rotate-45 border-2 border-ink bg-paper"
      />
      <span className="font-display text-[17px] leading-none">{formatDrive(parseMinutes(leg.duration))}</span>
      <span className="min-w-0 flex-1 truncate text-ink/60">
        {leg.distance}
        {leg.from && ` · 从${leg.from}出发`}
        {leg.target && ` · 前往${leg.target}`}
      </span>
      {navTarget && (
        <a
          className="inline-flex shrink-0 items-center gap-[2px] border-2 border-ink bg-white px-[8px] py-[2px] text-[11.5px] font-bold transition duration-150 hover:-translate-y-px hover:shadow-[2px_2px_0_var(--color-ink)] active:translate-y-0 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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

function Remark({ text }: { text?: string }) {
  if (!text) {
    return null;
  }
  return (
    <p className="relative mt-[12px] line-clamp-3 bg-[#fff4b8] px-[10px] py-[8px] text-[12.5px] leading-[19px] break-all text-ink/80 before:absolute before:-top-[6px] before:left-[14px] before:h-[12px] before:w-[40px] before:rotate-[-4deg] before:bg-ink/15">
      <span className="mr-[4px] font-bold text-ink">旅伴笔记</span>
      {text}
    </p>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[5px] text-[12px] leading-[18px] text-ink/70">
      <Icon className="mt-[3px] size-[12px] shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** 景点：整宽大图，标题压在图片下沿的色块上 */
function PoiStop({ unit, no, theme }: { unit: PoiUnit; no?: number; theme: Theme }) {
  return (
    <article>
      <div className="relative">
        <Photo
          src={unit.image}
          alt={unit.name}
          w={720}
          h={480}
          className="aspect-[3/2] w-full border-2 border-ink"
        />
        {no !== undefined && (
          <span
            className="absolute top-[-2px] left-[-2px] border-2 border-ink px-[8px] font-display text-[26px] leading-[34px]"
            style={{ background: theme.color, color: theme.on }}
          >
            {pad2(no)}
          </span>
        )}
      </div>
      <div className="relative -mt-[26px] mr-[22px] border-2 border-ink bg-paper px-[12px] pt-[10px] pb-[12px]">
        <h3 className="font-serif text-[22px] leading-[28px] font-black">{unit.name}</h3>
        <div className="mt-[6px] flex flex-col gap-[2px]">
          <Meta icon={Clock}>
            {unit.playTime}
            {unit.openStatus && ` · ${unit.openStatus}`}
          </Meta>
          {unit.price && <Meta icon={Ticket}>{unit.price}</Meta>}
        </div>
      </div>
      <Remark text={unit.remark} />
    </article>
  );
}

function HotelStop({ unit, no }: { unit: HotelUnit; no?: number }) {
  return (
    <article className="flex border-2 border-ink bg-ink text-paper shadow-[4px_4px_0_var(--accent)]">
      {/* 图片随文字高度拉伸，不让 width/height 属性撑高卡片 */}
      <div className="relative w-[32%] shrink-0 border-r-2 border-ink">
        <Photo
          src={unit.image}
          alt={unit.name}
          w={240}
          h={300}
          className="absolute inset-0 size-full"
        />
      </div>
      <div className="min-w-0 flex-1 p-[12px]">
        <div className="flex items-center gap-[6px] text-[10.5px] font-bold tracking-[0.16em] text-(--accent) uppercase">
          <BedDouble className="size-[13px]" />
          Stay
          {no !== undefined && ` · ${pad2(no)}`}
        </div>
        <h3 className="mt-[4px] line-clamp-2 font-serif text-[16px] leading-[21px] font-black">{unit.name}</h3>
        <div className="mt-[8px] flex items-baseline gap-[6px]">
          <span className="font-display text-[30px] leading-[28px] text-(--accent) tabular-nums">{unit.score.toFixed(1)}</span>
          <span className="text-[11.5px] text-paper/65 tabular-nums">
            {'◆'.repeat(unit.star)}
            {' · '}
            {unit.reviewCount.toLocaleString('zh-CN')}
            {' '}
            条点评
          </span>
        </div>
        {unit.rank && (
          <div className="mt-[6px] flex items-center gap-[4px] text-[11.5px] text-paper/80">
            <Trophy className="size-[12px] shrink-0" />
            <span className="truncate">{unit.rank}</span>
          </div>
        )}
      </div>
    </article>
  );
}

/** 航班：撕角登机牌 */
function FlightStop({ unit }: { unit: TransportUnit }) {
  const place = (end: TransportUnit['from']) => [end.name, end.terminal].filter(Boolean).join(' ');
  return (
    <article className={`relative bg-white ${sticker}`}>
      <div className="flex items-center justify-between border-b-2 border-dashed border-ink px-[14px] py-[8px] text-[11px] font-bold tracking-[0.14em] uppercase">
        <span className="flex items-center gap-[6px]">
          <Plane className="size-[13px]" />
          Boarding pass
        </span>
        <span className="tabular-nums">
          {unit.number}
          {' · '}
          {unit.dateText}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-[8px] px-[14px] pt-[12px] pb-[14px]">
        <div className="min-w-0">
          <div className="font-display text-[44px] leading-[40px] tabular-nums">{unit.departTime}</div>
          <div className="mt-[4px] truncate text-[12px] font-medium">{place(unit.from)}</div>
        </div>
        <div className="pb-[22px] text-center text-[11px] font-bold text-ink/60 tabular-nums">
          <Plane className="mx-auto mb-[2px] size-[16px] text-ink" />
          {unit.duration}
        </div>
        <div className="min-w-0 text-right">
          <div className="font-display text-[44px] leading-[40px] tabular-nums">{unit.arriveTime}</div>
          <div className="mt-[4px] truncate text-[12px] font-medium">{place(unit.to)}</div>
        </div>
      </div>
      {unit.remark && (
        <div className="px-[14px] pb-[12px]">
          <Remark text={unit.remark} />
        </div>
      )}
    </article>
  );
}

function SimpleTransportStop({ unit }: { unit: TransportUnit }) {
  return (
    <article className={`flex items-center gap-[10px] bg-white px-[14px] py-[12px] ${sticker}`}>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[17px] font-black">{unit.from.city}</div>
        <div className="truncate text-[12px] text-ink/60">{unit.from.name}</div>
      </div>
      <span className="font-display text-[20px]">→</span>
      <div className="min-w-0 flex-1 text-right">
        <div className="font-serif text-[17px] font-black">{unit.to.city}</div>
        <div className="truncate text-[12px] text-ink/60">{unit.to.name}</div>
      </div>
    </article>
  );
}

function CustomStop({ unit, no, theme }: { unit: Extract<Unit, { kind: 'custom' }>; no?: number; theme: Theme }) {
  return (
    <article className={`bg-white px-[14px] py-[12px] ${sticker}`}>
      <div className="flex items-center gap-[8px]">
        <span
          className="flex size-[26px] shrink-0 items-center justify-center border-2 border-ink"
          style={{ background: theme.color, color: theme.on }}
        >
          <MapPin className="size-[14px]" />
        </span>
        <h3 className="min-w-0 truncate font-serif text-[18px] font-black">
          {no !== undefined && <span className="mr-[6px] font-display font-normal">{pad2(no)}</span>}
          {unit.name}
        </h3>
      </div>
      <Remark text={unit.remark} />
    </article>
  );
}

function Stop({ unit, no, theme }: { unit: Unit; no?: number; theme: Theme }) {
  switch (unit.kind) {
    case 'transport':
      return unit.mode === 'flight' ? <FlightStop unit={unit} /> : <SimpleTransportStop unit={unit} />;
    case 'poi':
      return (
        <PoiStop
          unit={unit}
          no={no}
          theme={theme}
        />
      );
    case 'hotel':
      return (
        <HotelStop
          unit={unit}
          no={no}
        />
      );
    case 'custom':
      return (
        <CustomStop
          unit={unit}
          no={no}
          theme={theme}
        />
      );
  }
}

const unitTarget = (u: Unit) => (u.kind === 'transport' ? u.from.name : u.name);

export function Chapter({ day, sectionRef, onShowMap }: { day: Day; sectionRef: (el: HTMLElement | null) => void; onShowMap: () => void }) {
  const theme = dayTheme(day.index);
  const nums = itemNumbers(day.items);
  return (
    <section
      ref={sectionRef}
      data-day={day.index}
      aria-label={`第${day.index}天 ${dayCities(day)}`}
      style={themeVars(theme)}
      className="scroll-mt-0"
    >
      <ChapterOpener
        day={day}
        theme={theme}
      />
      <Marquee
        theme={{ color: '#14110f', on: theme.color }}
        items={day.items.map(unitShortName)}
        reverse={day.index % 2 === 0}
      />
      <div className="bg-paper px-[18px] pt-[22px] pb-[34px]">
        <ol className="relative before:absolute before:top-[8px] before:bottom-[8px] before:left-[12px] before:w-[2px] before:bg-ink">
          {day.items.map((u, i) => (
            <li key={u.id}>
              {u.leg
                ? (
                    <LegRow
                      leg={u.leg}
                      to={unitTarget(u)}
                    />
                  )
                : (i > 0 && <div className="h-[18px]" />)}
              {/* 卡片盖住时间轴竖线，竖线只在卡片之间露出 */}
              <div
                className="relative"
                data-reveal
              >
                <Stop
                  unit={u}
                  no={nums.get(u.id)}
                  theme={theme}
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
        <button
          type="button"
          onClick={onShowMap}
          className="mt-[22px] flex w-full items-center justify-between border-2 border-ink bg-(--accent) px-[14px] py-[12px] text-(--on) shadow-[4px_4px_0_var(--color-ink)] transition duration-150 hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="font-display text-[20px] uppercase">
            Day
            {' '}
            {dayNo(day)}
            {' '}
            Route map
          </span>
          <span className="text-[12px] font-bold">查看当天路线 →</span>
        </button>
      </div>
    </section>
  );
}

/* ================= 待安排 ================= */

export function Backlog({ itinerary, sectionRef, onShowMap }: { itinerary: Itinerary; sectionRef: (el: HTMLElement | null) => void; onShowMap: () => void }) {
  return (
    <section
      ref={sectionRef}
      data-day="todo"
      aria-labelledby="todo-title"
      className="bg-[#ffc21a] px-[18px] pt-[26px] pb-[34px] text-ink"
      style={themeVars(TODO_THEME)}
    >
      <div className="flex items-end justify-between border-b-2 border-ink pb-[8px]">
        <h2
          id="todo-title"
          className="font-display text-[46px] leading-[40px] uppercase"
        >
          Maybe next
        </h2>
        <span className="pb-[3px] text-[12px] font-bold">
          待安排 ·
          {' '}
          {itinerary.toBePlanned.length}
        </span>
      </div>
      <ul className="mt-[16px] grid grid-cols-2 gap-[12px]">
        {itinerary.toBePlanned.map(u => (
          <li
            key={u.id}
            className={`flex flex-col bg-paper ${sticker}`}
          >
            {'image' in u
              ? (
                  <Photo
                    src={u.image}
                    alt={u.name}
                    w={360}
                    h={270}
                    className="aspect-[4/3] w-full border-b-2 border-ink"
                  />
                )
              : (
                  <div className="flex aspect-[4/3] items-center justify-center border-b-2 border-ink bg-ink text-[#ffc21a]">
                    {u.kind === 'transport' ? <Plane className="size-[30px]" /> : <MapPin className="size-[30px]" />}
                  </div>
                )}
            <div className="p-[9px]">
              <div className="text-[10px] font-bold tracking-[0.14em] text-ink/55 uppercase">
                {u.kind === 'hotel' ? 'Stay' : u.kind === 'transport' ? 'Transfer' : 'Place'}
              </div>
              <h3 className="mt-[2px] line-clamp-2 font-serif text-[14px] leading-[19px] font-black">{unitShortName(u)}</h3>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onShowMap}
        className="mt-[18px] w-full border-2 border-ink bg-ink py-[12px] text-[13px] font-bold text-[#ffc21a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        在地图上看待安排地点 →
      </button>
    </section>
  );
}

/* ================= 封底 ================= */

export function Colophon({ itinerary }: { itinerary: Itinerary }) {
  const owner = itinerary.coEditors.find(e => e.owner);
  return (
    <footer className="bg-ink px-[18px] pt-[30px] pb-[130px] text-paper">
      <div className="font-display text-[64px] leading-[0.9] text-[#ff5b23] uppercase">
        See you
        <br />
        on the road
      </div>
      <p className="mt-[16px] text-[12.5px] leading-[20px] text-paper/60">
        行程由
        {' '}
        {owner?.nickName ?? '旅伴'}
        {' '}
        发起，
        {itinerary.coEditors.length}
        {' '}
        人共同编辑。路线与距离为规划参考，出发前请以实时路况为准。
      </p>
      <div
        aria-hidden
        className="mt-[20px] flex h-[10px]"
      >
        {itinerary.days.map(d => (
          <span
            key={d.index}
            className="flex-1"
            style={{ background: dayTheme(d.index).color }}
          />
        ))}
      </div>
    </footer>
  );
}
