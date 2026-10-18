import type { Itinerary } from '@/data/types';
import { useMemo } from 'react';
import { useMediaQuery } from '../shared/hooks';
import { summarize } from '../shared/trip';
import { CinemaDesktop } from './CinemaDesktop';
import { CinemaMobile } from './CinemaMobile';
import { buildPages } from './pages';
import './cinema.css';
import './cinema-story.css';
import './cinema-parts.css';
import './cinema-desktop.css';

/** 方案 A：电影感行程页。窄屏是片头 + 逐日故事，宽屏自动切成放映厅布局 */
export function Cinema({ itinerary }: { itinerary: Itinerary }) {
  const trip = useMemo(() => summarize(itinerary), [itinerary]);
  const pages = useMemo(() => buildPages(trip), [trip]);
  const wide = useMediaQuery('(min-width: 1024px)');
  return wide
    ? (
        <CinemaDesktop
          trip={trip}
          pages={pages}
        />
      )
    : (
        <CinemaMobile
          trip={trip}
          pages={pages}
        />
      );
}
