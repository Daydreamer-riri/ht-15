import type { TabKey } from './utils';
import type { Itinerary } from '@/data/types';
import { Maximize2, Menu, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DaySection, OverviewCard, OverviewFooter, OverviewTodoCard, TodoSection } from './RouteCards';
import { RouteMap } from './RouteMap';

/** 抽屉展开时顶部露出的地图高度 */
const OPEN_TOP = 161;
/** 抽屉收起时露出的高度（拖拽条 + 标题 + tab） */
const PEEK_HEIGHT = 200;
/** sticky tab 栏高度 */
const TABS_HEIGHT = 56;

type DrawerState = 'open' | 'peek';

function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(() => window.innerHeight);
  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

function CoEditors({ editors }: { editors: Itinerary['coEditors'] }) {
  const shown = editors.slice(0, 2);
  const rest = editors.length - shown.length;
  return (
    <div
      className="flex justify-end"
      aria-label={`${editors.length}位共同编辑者`}
    >
      {shown.map(e => (
        <span
          key={e.avatar}
          className="-ml-[6px] size-[28px] overflow-hidden rounded-full border border-white bg-[#f5f7fa] first:ml-0"
        >
          <img
            src={e.avatar}
            alt={e.nickName}
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        </span>
      ))}
      {rest > 0 && (
        <span className="-ml-[6px] flex size-[28px] items-center justify-center rounded-full border border-white bg-[#f5f7fa] text-[11.4px] text-[#555]">
          +
          {rest}
        </span>
      )}
    </div>
  );
}

interface TabBarProps {
  itinerary: Itinerary;
  tab: TabKey;
  onChange: (tab: TabKey) => void;
}

function TabBar({ itinerary, tab, onChange }: TabBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: '总览' },
    ...itinerary.days.map(d => ({ key: d.index as TabKey, label: d.label })),
    ...(itinerary.toBePlanned.length ? [{ key: 'todo' as TabKey, label: '待安排' }] : []),
  ];

  // 让选中的 tab 滚动到可视区域中间
  useEffect(() => {
    const bar = barRef.current;
    const active = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!bar || !active) {
      return;
    }
    bar.scrollTo({ left: active.offsetLeft - (bar.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [tab]);

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label="行程日期"
      className="sticky top-0 z-10 flex h-[56px] items-center gap-[8px] overflow-x-auto bg-white px-[21px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map(t => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex h-[34px] shrink-0 items-center gap-[4px] rounded-full border px-[9px] text-[14.6px] whitespace-nowrap transition-colors ${
              active ? 'border-[#111] bg-[#111] font-medium text-white' : 'border-[#e5e5e5] bg-white text-[#111]'
            }`}
          >
            {t.key === 'overview' && <Menu className="size-[16px]" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function RoutePlan({ itinerary }: { itinerary: Itinerary }) {
  const [rootRef, rootHeight] = useElementHeight<HTMLDivElement>();
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  /** 程序滚动期间暂停滚动联动，避免 tab 来回跳 */
  const scrollLockUntil = useRef(0);
  /** 切换 tab 后待滚动定位的分区 */
  const pendingScroll = useRef<string | null>(null);

  const [tab, setTab] = useState<TabKey>('overview');
  const [drawer, setDrawer] = useState<DrawerState>('open');
  const [dragTop, setDragTop] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; top: number } | null>(null);

  const openTop = Math.min(OPEN_TOP, rootHeight * 0.3);
  const peekTop = Math.max(openTop, rootHeight - PEEK_HEIGHT);
  const snapTop = drawer === 'open' ? openTop : peekTop;
  const drawerTop = dragTop ?? snapTop;
  const detailMode = tab !== 'overview';

  const scrollToSection = useCallback((key: string) => {
    const list = listRef.current;
    const el = sectionRefs.current.get(key);
    if (!list || !el) {
      return;
    }
    scrollLockUntil.current = Date.now() + 800;
    list.scrollTo({ top: el.offsetTop - TABS_HEIGHT, behavior: 'smooth' });
  }, []);

  const selectTab = (next: TabKey) => {
    setDrawer('open');
    setTab(next);
    if (next === 'overview') {
      pendingScroll.current = null;
      listRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (detailMode) {
      scrollToSection(String(next));
    } else {
      // 从总览切换到详情：等详情列表渲染完成后再定位
      pendingScroll.current = String(next);
    }
  };

  useLayoutEffect(() => {
    const key = pendingScroll.current;
    if (!detailMode || !key) {
      return;
    }
    pendingScroll.current = null;
    const list = listRef.current!;
    const el = sectionRefs.current.get(key);
    scrollLockUntil.current = Date.now() + 300;
    if (el) {
      list.scrollTop = el.offsetTop - TABS_HEIGHT;
    }
  }, [detailMode, tab]);

  // 详情模式下，滚动列表时同步选中的 tab（同时驱动地图切换）
  const onListScroll = () => {
    if (!detailMode || Date.now() < scrollLockUntil.current) {
      return;
    }
    const list = listRef.current!;
    const anchor = list.scrollTop + TABS_HEIGHT + 12;
    let current: string | null = null;
    for (const [key, el] of sectionRefs.current) {
      if (el.offsetTop <= anchor) {
        current = key;
      }
    }
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 2) {
      current = [...sectionRefs.current.keys()].at(-1) ?? current;
    }
    if (!current) {
      return;
    }
    const next: TabKey = current === 'todo' ? 'todo' : Number(current);
    if (next !== tab) {
      setTab(next);
    }
  };

  const sectionRef = (key: string) => (el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(key, el);
    } else {
      sectionRefs.current.delete(key);
    }
  };

  // ---- 抽屉拖拽 ----
  const onDragStart = (e: React.PointerEvent) => {
    dragStart.current = { y: e.clientY, top: snapTop };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragStart.current) {
      return;
    }
    const top = dragStart.current.top + e.clientY - dragStart.current.y;
    setDragTop(Math.min(peekTop, Math.max(openTop, top)));
  };
  const onDragEnd = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) {
      return;
    }
    const delta = e.clientY - start.y;
    if (Math.abs(delta) < 5) {
      setDrawer(d => (d === 'open' ? 'peek' : 'open'));
    } else {
      const top = start.top + delta;
      setDrawer(top - openTop < (peekTop - openTop) / 2 ? 'open' : 'peek');
    }
    setDragTop(null);
  };

  return (
    <div
      ref={rootRef}
      className="relative mx-auto h-[100dvh] w-full max-w-[430px] overflow-hidden bg-white text-[#111] shadow-xl"
    >
      <RouteMap
        itinerary={itinerary}
        tab={tab}
        bottomInset={rootHeight - drawerTop}
      />

      <button
        type="button"
        aria-label={drawer === 'open' ? '展开地图' : '收起地图'}
        onClick={() => setDrawer(d => (d === 'open' ? 'peek' : 'open'))}
        className="absolute right-[11px] z-20 flex size-[33px] items-center justify-center rounded-full bg-black/45 text-white"
        style={{ top: drawerTop - 43, transition: dragTop === null ? 'top 300ms ease' : undefined }}
      >
        {drawer === 'open' ? <Maximize2 className="size-[17px]" /> : <Minimize2 className="size-[17px]" />}
      </button>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[12.5px] bg-white shadow-[0_-2px_10px_rgb(0_0_0/0.08)]"
        style={{ top: drawerTop, transition: dragTop === null ? 'top 300ms ease' : undefined }}
      >
        <div
          className="flex h-[27px] shrink-0 cursor-grab touch-none justify-center pt-[11px]"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          role="button"
          tabIndex={0}
          aria-label={drawer === 'open' ? '收起行程列表' : '展开行程列表'}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDrawer(d => (d === 'open' ? 'peek' : 'open'));
            }
          }}
        >
          <span className="h-[4px] w-[35px] rounded-full bg-[#ced2d9]" />
        </div>

        <div
          ref={listRef}
          onScroll={onListScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {!detailMode && (
            <header className="px-[21px] pt-[1px]">
              <h1 className="text-[22.9px] leading-[26px] font-medium">{itinerary.name}</h1>
              <div className="mt-[9px]">
                <CoEditors editors={itinerary.coEditors} />
              </div>
            </header>
          )}

          <TabBar
            itinerary={itinerary}
            tab={tab}
            onChange={selectTab}
          />

          <div className="px-[21px] pb-[110px]">
            {detailMode
              ? (
                  <>
                    {itinerary.days.map((d, i) => (
                      <DaySection
                        key={d.index}
                        day={d}
                        first={i === 0}
                        sectionRef={sectionRef(String(d.index))}
                      />
                    ))}
                    {itinerary.toBePlanned.length > 0 && (
                      <TodoSection
                        itinerary={itinerary}
                        sectionRef={sectionRef('todo')}
                      />
                    )}
                  </>
                )
              : (
                  <div className="flex flex-col gap-[12px] pt-[1px]">
                    {itinerary.days.map(d => (
                      <OverviewCard
                        key={d.index}
                        day={d}
                        onClick={() => selectTab(d.index)}
                      />
                    ))}
                    {itinerary.toBePlanned.length > 0 && (
                      <OverviewTodoCard
                        units={itinerary.toBePlanned}
                        onClick={() => selectTab('todo')}
                      />
                    )}
                    <OverviewFooter onClick={() => selectTab(itinerary.days[0].index)} />
                  </div>
                )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => toast('演示页面，暂不支持保存编辑')}
        className="absolute inset-x-[12px] bottom-[30px] z-30 h-[50px] rounded-full bg-[#006ff6] text-[15.6px] font-bold text-white shadow-[0_4px_16px_rgb(0_111_246/0.35)] active:bg-[#0062da]"
      >
        保存并编辑线路
      </button>
    </div>
  );
}
