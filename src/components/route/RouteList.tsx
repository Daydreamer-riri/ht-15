import type { Itinerary } from '@/data/types';
import { ArrowUpRight } from 'lucide-react';
import { Marquee } from './RouteCards';
import { coverHero, dayTheme, formatDrive, formatKm, legLabel, sizedImage, tripStats } from './utils';

const sticker = 'border-2 border-ink shadow-[4px_4px_0_var(--color-ink)]';

/** 列表卡片：封面色块 + 封面图 + 关键数字 */
function RouteCard({ itinerary, no }: { itinerary: Itinerary; no: number }) {
  const { cover } = itinerary;
  const stats = tripStats(itinerary);
  const hero = coverHero(itinerary);
  const facts = [
    [`${stats.days}D${stats.nights ? `${stats.nights}N` : ''}`, '天数'],
    [String(stats.places), '地点'],
    itinerary.mode === 'walk'
      ? [formatDrive(stats.minutes), legLabel(itinerary)]
      : [formatKm(stats.km), '公里'],
  ];
  return (
    <a
      href={`#/route/${itinerary.id}`}
      className={`group block bg-paper transition duration-150 hover:-translate-y-[2px] hover:shadow-[6px_6px_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ${sticker}`}
    >
      <div
        className="relative overflow-hidden border-b-2 border-ink text-white"
        style={{ background: cover.color }}
      >
        <div className="flex items-center justify-between px-[14px] pt-[12px] text-[10.5px] font-bold tracking-[0.16em] uppercase">
          <span className="tabular-nums">
            Route
            {' '}
            {String(no).padStart(2, '0')}
          </span>
          <span className="tabular-nums">{cover.issue}</span>
        </div>
        <div className="flex items-end gap-[12px] px-[14px] pt-[6px] pb-[14px]">
          <div className="min-w-0 flex-1 font-display text-[52px] leading-[0.88] text-[#ffc21a] uppercase">
            {cover.headline.map(line => (
              <span
                key={line}
                className="block truncate"
              >
                {line}
              </span>
            ))}
          </div>
          {hero && (
            <img
              src={sizedImage(hero.image, 240, 300)}
              alt=""
              width={240}
              height={300}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="aspect-[4/5] w-[34%] shrink-0 rotate-[3deg] border-2 border-ink bg-ink/10 object-cover shadow-[3px_3px_0_var(--color-ink)] transition-transform duration-200 group-hover:rotate-0"
            />
          )}
        </div>
      </div>
      <div className="px-[14px] pt-[12px] pb-[14px]">
        <div className="flex items-center gap-[8px]">
          <h2 className="min-w-0 flex-1 truncate font-serif text-[22px] leading-[28px] font-black">{itinerary.name}</h2>
          <span className="shrink-0 border-2 border-ink bg-[#ffc21a] px-[6px] py-[1px] text-[11px] font-bold">{cover.badge}</span>
        </div>
        <p className="mt-[4px] line-clamp-2 text-[12.5px] leading-[19px] text-ink/65">{cover.intro}</p>
        <div className="mt-[12px] flex items-end gap-[18px] border-t-2 border-ink pt-[8px]">
          <dl className="flex flex-1 gap-[18px]">
            {facts.map(([n, k]) => (
              <div key={k}>
                <dt className="text-[10px] font-bold tracking-[0.12em] text-ink/55">{k}</dt>
                <dd className="font-display text-[22px] leading-[26px] tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
          <span className="flex items-center gap-[2px] pb-[3px] text-[12px] font-bold">
            查看线路
            <ArrowUpRight className="size-[14px] transition-transform duration-200 group-hover:rotate-45" />
          </span>
        </div>
        {/* 每天一个色块，与详情页章节色一致 */}
        <div
          aria-hidden
          className="mt-[10px] flex h-[6px]"
        >
          {itinerary.days.map(d => (
            <span
              key={d.index}
              className="flex-1"
              style={{ background: dayTheme(d.index).color }}
            />
          ))}
        </div>
      </div>
    </a>
  );
}

export function RouteList({ routes }: { routes: Itinerary[] }) {
  return (
    <div className="relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden bg-paper text-ink shadow-[0_0_80px_-10px_rgb(0_0_0/0.5)]">
      <main className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <header className="bg-ink px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-[22px] text-paper">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] uppercase">
            <span>Trip Journal</span>
            <span className="tabular-nums">
              {routes.length}
              {' '}
              Routes
            </span>
          </div>
          <h1 className="mt-[14px] font-display text-[84px] leading-[0.86] text-[#ff5b23] uppercase">
            All
            <br />
            routes
          </h1>
          <p className="mt-[12px] font-serif text-[20px] font-black">线路列表</p>
          <p className="mt-[4px] text-[12.5px] leading-[19px] text-paper/60">选一条线路，翻开它的行程手册。</p>
        </header>
        <Marquee
          theme={{ color: '#ffc21a', on: '#14110f' }}
          items={routes.map(r => r.name)}
        />
        <ol className="flex flex-col gap-[22px] px-[18px] pt-[24px] pb-[48px]">
          {routes.map((r, i) => (
            <li key={r.id}>
              <RouteCard
                itinerary={r}
                no={i + 1}
              />
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
