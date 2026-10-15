import type { Itinerary } from '@/data/types';
import { useCallback, useMemo, useRef, useState } from 'react';
import { summarize } from '../shared/trip';
import { CinemaCover } from './CinemaCover';
import { CinemaStory } from './CinemaStory';
import { buildPages } from './pages';
import './cinema.css';
import './cinema-story.css';
import './cinema-parts.css';

/** 方案 A：片头 + 逐日故事。每天是一支短片，照片缓推、左右翻页 */
export function Cinema({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const pages = useMemo(() => buildPages(trip), [trip]);
  const cards = useRef(new Map<number, HTMLButtonElement>());
  const [story, setStory] = useState<{ index: number; from?: DOMRect } | null>(null);

  const registerCard = useCallback((index: number, el: HTMLButtonElement | null) => {
    if (el) {
      cards.current.set(index, el);
    } else {
      cards.current.delete(index);
    }
  }, []);

  // 关闭故事时缩回到当天的卡片：先把卡片滚进可视区再量位置
  const getCardRect = useCallback((index: number) => {
    const el = cards.current.get(index);
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
    return el?.getBoundingClientRect();
  }, []);

  return (
    <div className="cn-root">
      <CinemaCover
        trip={trip}
        pages={pages}
        hidden={story !== null}
        onOpen={(index, from) => setStory({ index, from })}
        registerCard={registerCard}
      />
      {story && (
        <CinemaStory
          trip={trip}
          pages={pages}
          initial={story.index}
          from={story.from}
          getCardRect={getCardRect}
          onClosed={() => setStory(null)}
        />
      )}
    </div>
  );
}
