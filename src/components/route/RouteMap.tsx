import type { Itinerary, LatLng, Unit } from '@/data/types';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { arcPoints, dayTheme, escapeHtml, formatDayRanges, INK, itemNumbers, type TabKey, TODO_THEME } from './utils';
import 'leaflet/dist/leaflet.css';
import './route.css';

interface RouteMapProps {
  itinerary: Itinerary;
  tab: TabKey;
  /** 地图底部被浮层遮挡的高度（px） */
  bottomInset?: number;
  /** 嵌在长页面里时关闭拖拽缩放，避免抢占页面滚动 */
  interactive?: boolean;
}

const PLANE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

function pinSvg(color: string) {
  return `<svg width="28" height="34" viewBox="0 0 26 32"><path d="M13 31c-1-1.6-12-11.2-12-18.5A12 12 0 0 1 25 12.5C25 19.8 14 29.4 13 31z" fill="${color}" stroke="${INK}" stroke-width="2"/></svg>`;
}

function icon(html: string) {
  return L.divIcon({ className: 'rp-marker', html: `<div class="rp-anchor">${html}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function label(text: string) {
  return `<span class="rp-label">${escapeHtml(text)}</span>`;
}

function pinIcon(color: string, textColor: string, text: string, name?: string) {
  return icon(`<div class="rp-pin">${pinSvg(color)}<span class="rp-pin__text" style="color:${textColor}">${escapeHtml(text)}</span>${name ? label(name) : ''}</div>`);
}

/** 墨色描边 + 主题色内芯的路线，杂志感更强 */
function road(layer: L.LayerGroup, points: LatLng[], color: string, weight: number) {
  L.polyline(points, { color: INK, weight: weight + 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(layer);
  L.polyline(points, { color, weight, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(layer);
}

function flight(layer: L.LayerGroup, a: LatLng, b: LatLng) {
  L.polyline(arcPoints(a, b), { color: INK, weight: 2, dashArray: '2 6', lineCap: 'round' }).addTo(layer);
}

/** 总览：每天的驾车路线用当天主题色，城市标注带“第N天” */
function drawOverview(layer: L.LayerGroup, itinerary: Itinerary, detailed: boolean) {
  const cities = new Map<string, { position: LatLng; days: number[]; pois: string[] }>();
  const touch = (name: string, position: LatLng, day: number) => {
    const c = cities.get(name) ?? { position, days: [], pois: [] };
    c.days.push(day);
    cities.set(name, c);
    return c;
  };
  const route: LatLng[] = [];
  for (const day of itinerary.days) {
    for (const city of day.cities) {
      touch(city.name, city.position, day.index);
    }
    for (const u of day.items) {
      if (u.kind === 'poi') {
        const c = touch(u.city, cities.get(u.city)?.position ?? u.position, day.index);
        if (!c.pois.includes(u.name)) {
          c.pois.push(u.name);
        }
      }
      if (u.kind === 'transport') {
        // 嵌入式小地图只聚焦疆内环线，不把上海纳入视野
        if (detailed) {
          route.push(u.from.position, u.to.position);
        }
      } else {
        route.push(u.position);
      }
    }
  }
  for (const day of itinerary.days) {
    const { color } = dayTheme(day.index);
    for (const u of [...day.items, ...(day.returnLeg ? [{ leg: day.returnLeg } as Unit] : [])]) {
      if (u.kind === 'transport') {
        flight(layer, u.from.position, u.to.position);
      }
      if (u.leg) {
        road(layer, u.leg.points, color, 3.5);
      }
    }
  }
  for (const [name, c] of cities) {
    if (!detailed && !c.pois.length) {
      continue;
    }
    const pois = (detailed && c.pois.length)
      ? `<div class="rp-city__pois">${c.pois.map(p => `<div class="rp-city__poi">${escapeHtml(p)}</div>`).join('')}</div>`
      : '';
    const html = `<div class="rp-city"><span class="rp-city__days">${formatDayRanges(c.days)}</span><span class="rp-city__box">${escapeHtml(name)}</span>${pois}</div>`;
    L.marker(c.position, { icon: icon(html), zIndexOffset: c.pois.length ? 0 : 100 }).addTo(layer);
  }
  return route;
}

/** 单天：主题色编号图钉 + 驾车路线 + 航线 */
function drawDay(layer: L.LayerGroup, itinerary: Itinerary, dayIndex: number) {
  const day = itinerary.days.find(d => d.index === dayIndex);
  if (!day) {
    return [];
  }
  const theme = dayTheme(day.index);
  const nums = itemNumbers(day.items);
  const bounds: LatLng[] = [];
  if (day.departHotel) {
    bounds.push(day.departHotel.position);
    L.marker(day.departHotel.position, { icon: pinIcon(INK, '#fff', '住'), zIndexOffset: -100 }).addTo(layer);
  }
  for (const leg of [...day.items.map(u => u.leg), day.returnLeg]) {
    if (leg) {
      road(layer, leg.points, theme.color, 5);
    }
  }
  for (const u of day.items) {
    if (u.kind === 'transport') {
      flight(layer, u.from.position, u.to.position);
      for (const end of [u.from, u.to]) {
        L.marker(end.position, { icon: icon(`<div class="rp-round">${PLANE_SVG}${label(end.name)}</div>`) }).addTo(layer);
        bounds.push(end.position);
      }
      continue;
    }
    bounds.push(u.position);
    const hotel = u.kind === 'hotel';
    L.marker(u.position, {
      icon: pinIcon(hotel ? INK : theme.color, hotel ? '#fff' : theme.on, String(nums.get(u.id)), u.name),
      zIndexOffset: 200,
    }).addTo(layer);
  }
  return bounds;
}

/** 待安排：黄色方块标注 */
function drawTodo(layer: L.LayerGroup, itinerary: Itinerary) {
  const bounds: LatLng[] = [];
  for (const u of itinerary.toBePlanned) {
    const pos = u.kind === 'transport' ? u.to.position : u.position;
    const name = u.kind === 'transport' ? `${u.from.name} → ${u.to.name}` : u.name;
    if (u.kind === 'transport') {
      L.polyline([u.from.position, u.to.position], { color: INK, weight: 2, dashArray: '2 6' }).addTo(layer);
      bounds.push(u.from.position);
    }
    L.marker(pos, { icon: icon(`<div class="rp-todo" style="background:${TODO_THEME.color}">${label(name)}</div>`) }).addTo(layer);
    bounds.push(pos);
  }
  return bounds;
}

export function RouteMap({ itinerary, tab, bottomInset = 0, interactive = true }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    const map = L.map(containerRef.current!, {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.25,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    if (interactive) {
      L.control.scale({ imperial: false, position: 'topleft' }).addTo(map);
    }
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  const fit = useMemo(() => (bounds: L.LatLngBounds | null, inset: number) => {
    const map = mapRef.current;
    if (!map || !bounds?.isValid()) {
      return;
    }
    map.invalidateSize();
    map.fitBounds(bounds, { paddingTopLeft: [36, 44], paddingBottomRight: [36, inset + 28], maxZoom: 12, animate: true });
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }
    layer.clearLayers();
    const points = tab === 'overview'
      ? drawOverview(layer, itinerary, interactive)
      : tab === 'todo' ? drawTodo(layer, itinerary) : drawDay(layer, itinerary, tab);
    boundsRef.current = points.length ? L.latLngBounds(points) : null;
    fit(boundsRef.current, bottomInset);
    // bottomInset 变化单独处理，避免重绘图层
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary, tab, fit, interactive]);

  useEffect(() => {
    fit(boundsRef.current, bottomInset);
  }, [bottomInset, fit]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      role={interactive ? 'application' : 'img'}
      aria-label="行程地图"
    />
  );
}
