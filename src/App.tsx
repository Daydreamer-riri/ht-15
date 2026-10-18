import type { ComponentType, LazyExoticComponent } from 'react';
import type { Itinerary } from './data/types';
import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { RouteList } from './components/route/RouteList';
import { RoutePlan } from './components/route/RoutePlan';
import { itinerary } from './data/itinerary';
import { findRoute, routes } from './data/routes';
import './App.css';

type Concept = LazyExoticComponent<ComponentType<{ itinerary: Itinerary }>>;

/** ?v=<key> 打开北疆行程的概念稿；?v=classic 为北疆线路详情页 */
const CONCEPTS: Partial<Record<string, Concept>> = {
  cinema: lazy(() => import('./concepts/cinema/Cinema').then(m => ({ default: m.Cinema }))),
  road: lazy(() => import('./concepts/road/Road').then(m => ({ default: m.Road }))),
  journal: lazy(() => import('./concepts/journal/Journal').then(m => ({ default: m.Journal }))),
  metro: lazy(() => import('./concepts/metro/Metro').then(m => ({ default: m.Metro }))),
  pixel: lazy(() => import('./concepts/pixel/Pixel').then(m => ({ default: m.Pixel }))),
  film: lazy(() => import('./concepts/film/Film').then(m => ({ default: m.Film }))),
  lab: lazy(() => import('./concepts/Lab').then(m => ({ default: m.Lab }))),
};

/** hash 路由：#/ 线路列表，#/route/<id> 线路详情（静态部署在子路径下，hash 不依赖服务端回退） */
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const getHash = () => window.location.hash;

function HashRoutes() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const id = /^#\/route\/([\w-]+)/.exec(hash)?.[1];
  const route = id ? findRoute(id) : undefined;

  useEffect(() => {
    document.title = route ? `${route.name} - 行程规划` : '线路列表 - 行程规划';
  }, [route]);

  return route
    ? (
        <RoutePlan
          key={route.id}
          itinerary={route}
        />
      )
    : <RouteList routes={routes} />;
}

function App() {
  const variant = new URLSearchParams(window.location.search).get('v');
  if (variant === 'classic') {
    return <RoutePlan itinerary={itinerary} />;
  }
  const Concept = variant ? CONCEPTS[variant] : undefined;
  if (!Concept) {
    return <HashRoutes />;
  }
  return (
    <Suspense fallback={null}>
      <Concept itinerary={itinerary} />
    </Suspense>
  );
}

export default App;
