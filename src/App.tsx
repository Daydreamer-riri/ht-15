import { useEffect, useSyncExternalStore } from 'react';
import { RouteList } from './components/route/RouteList';
import { RoutePlan } from './components/route/RoutePlan';
import { findRoute, routes } from './data/routes';
import './App.css';

/** hash 路由：#/ 线路列表，#/route/<id> 线路详情（静态部署在子路径下，hash 不依赖服务端回退） */
function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const getHash = () => window.location.hash;

function App() {
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

export default App;
