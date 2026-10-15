import type { ComponentType, LazyExoticComponent } from 'react';
import type { Itinerary } from './data/types';
import { lazy, Suspense } from 'react';
import { RoutePlan } from './components/route/RoutePlan';
import { itinerary } from './data/itinerary';
import './App.css';

type Concept = LazyExoticComponent<ComponentType<{ itinerary: Itinerary }>>;

/** ?v=cinema 打开概念稿；不带参数仍是现有页面 */
const CONCEPTS: Partial<Record<string, Concept>> = {
  cinema: lazy(() => import('./concepts/cinema/Cinema').then(m => ({ default: m.Cinema }))),
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
