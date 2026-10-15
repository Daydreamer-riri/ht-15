import type { ComponentType, LazyExoticComponent } from 'react';
import type { Itinerary } from './data/types';
import { lazy, Suspense } from 'react';
import { RoutePlan } from './components/route/RoutePlan';
import { itinerary } from './data/itinerary';
import './App.css';

type Concept = LazyExoticComponent<ComponentType<{ itinerary: Itinerary }>>;

/** 直接打开就是电影感行程页；?v=classic 回到原来的地图+抽屉页，另有 road / journal / lab */
const DEFAULT_VARIANT = 'cinema';

const CONCEPTS: Partial<Record<string, Concept>> = {
  cinema: lazy(() => import('./concepts/cinema/Cinema').then(m => ({ default: m.Cinema }))),
  road: lazy(() => import('./concepts/road/Road').then(m => ({ default: m.Road }))),
  journal: lazy(() => import('./concepts/journal/Journal').then(m => ({ default: m.Journal }))),
  lab: lazy(() => import('./concepts/Lab').then(m => ({ default: m.Lab }))),
};

function App() {
  const variant = new URLSearchParams(window.location.search).get('v') ?? DEFAULT_VARIANT;
  if (variant === 'classic') {
    return <RoutePlan itinerary={itinerary} />;
  }
  const Concept = CONCEPTS[variant] ?? CONCEPTS[DEFAULT_VARIANT]!;
  return (
    <Suspense fallback={null}>
      <Concept itinerary={itinerary} />
    </Suspense>
  );
}

export default App;
