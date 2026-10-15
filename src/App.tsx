import type { ComponentType, LazyExoticComponent } from 'react';
import type { Itinerary } from './data/types';
import { lazy, Suspense } from 'react';
import { RoutePlan } from './components/route/RoutePlan';
import { itinerary } from './data/itinerary';
import './App.css';

type Concept = LazyExoticComponent<ComponentType<{ itinerary: Itinerary }>>;

/** ?v=cinema | road | journal 打开概念稿，?v=lab 并排对比；不带参数仍是现有页面 */
const CONCEPTS: Partial<Record<string, Concept>> = {
  cinema: lazy(() => import('./concepts/cinema/Cinema').then(m => ({ default: m.Cinema }))),
  road: lazy(() => import('./concepts/road/Road').then(m => ({ default: m.Road }))),
  journal: lazy(() => import('./concepts/journal/Journal').then(m => ({ default: m.Journal }))),
  lab: lazy(() => import('./concepts/Lab').then(m => ({ default: m.Lab }))),
};

function App() {
  const Concept = CONCEPTS[new URLSearchParams(window.location.search).get('v') ?? ''];
  if (!Concept) {
    return <RoutePlan itinerary={itinerary} />;
  }
  return (
    <Suspense fallback={null}>
      <Concept itinerary={itinerary} />
    </Suspense>
  );
}

export default App;
