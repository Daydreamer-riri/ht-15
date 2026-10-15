import type { Itinerary, LatLng, Unit } from '@/data/types';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { arcPoints, COLORS, escapeHtml, formatDayRanges, itemNumbers, type TabKey } from './utils';
import 'leaflet/dist/leaflet.css';
import './route.css';

interface RouteMapProps {
  itinerary: Itinerary;
  tab: TabKey;
  /** 地图可视区域底部被抽屉遮挡的高度（px） */
  bottomInset: number;
}

const PLANE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';

function pinSvg(color: string) {
  return `<svg width="26" height="32" viewBox="0 0 26 32"><path d="M13 31c-1-1.6-12-11.2-12-18.5A12 12 0 0 1 25 12.5C25 19.8 14 29.4 13 31z" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
}

function icon(html: string) {
  return L.divIcon({ className: 'rp-marker', html: `<div class="rp-anchor">${html}</div>`, iconSize: [0, 0], iconAnchor: [0, 0] });
}

function label(text: string) {
  return `<span class="rp-label">${escapeHtml(text)}</span>`;
}

function pinIcon(color: string, text: string, name?: string) {
  return icon(`<div class="rp-pin">${pinSvg(color)}<span class="rp-pin__text">${escapeHtml(text)}</span>${name ? label(name) : ''}</div>`);
}

function unitColor(unit: Unit) {
  if (unit.kind === 'hotel') {
    return COLORS.hotel;
  }
  if (unit.kind === 'custom') {
    return COLORS.custom;
  }
  return COLORS.poi;
}

/** 总览：每个城市一个标注，带“第N天”和景点列表 */
function drawOverview(layer: L.LayerGroup, itinerary: Itinerary) {
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
        route.push(u.from.position, u.to.position);
      } else {
        route.push(u.position);
      }
    }
  }
  for (const day of itinerary.days) {
    for (const u of day.items) {
      if (u.kind === 'transport') {
        L.polyline(arcPoints(u.from.position, u.to.position), { color: COLORS.flight, weight: 2, dashArray: '6 4' }).addTo(layer);
      } else if (u.leg) {
        L.polyline(u.leg.points, { color: COLORS.brand, weight: 3, opacity: 0.7 }).addTo(layer);
      }
    }
  }
  for (const [name, c] of cities) {
    const pois = c.pois.length
      ? `<div class="rp-city__pois">${c.pois.map(p => `<div class="rp-city__poi">${escapeHtml(p)}</div>`).join('')}</div>`
      : '';
    const html = `<div class="rp-city"><span class="rp-city__days">${formatDayRanges(c.days)}</span><span class="rp-city__box">${escapeHtml(name)}</span>${pois}</div>`;
    L.marker(c.position, { icon: icon(html), zIndexOffset: c.pois.length ? 0 : 100 }).addTo(layer);
  }
  return route;
}

/** 单天：编号图钉 + 驾车路线 + 航线 */
function drawDay(layer: L.LayerGroup, itinerary: Itinerary, dayIndex: number) {
  const day = itinerary.days.find(d => d.index === dayIndex);
  if (!day) {
    return [];
  }
  const nums = itemNumbers(day.items);
  const bounds: LatLng[] = [];
  if (day.departHotel) {
    bounds.push(day.departHotel.position);
    L.marker(day.departHotel.position, { icon: pinIcon(COLORS.hotel, '住'), zIndexOffset: -100 }).addTo(layer);
  }
  const legs = [...day.items.map(u => u.leg), day.returnLeg];
  for (const leg of legs) {
    if (leg) {
      L.polyline(leg.points, { color: COLORS.brand, weight: 4, opacity: 0.85 }).addTo(layer);
    }
  }
  for (const u of day.items) {
    if (u.kind === 'transport') {
      L.polyline(arcPoints(u.from.position, u.to.position), { color: COLORS.flight, weight: 2.5 }).addTo(layer);
      for (const end of [u.from, u.to]) {
        L.marker(end.position, { icon: icon(`<div class="rp-round" style="background:${COLORS.flight}">${PLANE_SVG}${label(end.name)}</div>`) }).addTo(layer);
        bounds.push(end.position);
      }
      continue;
    }
    bounds.push(u.position);
    L.marker(u.position, { icon: pinIcon(unitColor(u), String(nums.get(u.id)), u.name), zIndexOffset: 200 }).addTo(layer);
  }
  return bounds;
}

/** 待安排：灰色标注 */
function drawTodo(layer: L.LayerGroup, itinerary: Itinerary) {
  const bounds: LatLng[] = [];
  for (const u of itinerary.toBePlanned) {
    const pos = u.kind === 'transport' ? u.to.position : u.position;
    const name = u.kind === 'transport' ? `${u.from.name} → ${u.to.name}` : u.name;
    if (u.kind === 'transport') {
      L.polyline([u.from.position, u.to.position], { color: COLORS.todo, weight: 2, dashArray: '4 4' }).addTo(layer);
      bounds.push(u.from.position);
    }
    L.marker(pos, { icon: icon(`<div class="rp-todo">${label(name)}</div>`) }).addTo(layer);
    bounds.push(pos);
  }
  return bounds;
}

export function RouteMap({ itinerary, tab, bottomInset }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    const map = L.map(containerRef.current!, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const fit = useMemo(() => (bounds: L.LatLngBounds | null, inset: number) => {
    const map = mapRef.current;
    if (!map || !bounds?.isValid()) {
      return;
    }
    map.invalidateSize();
    map.fitBounds(bounds, { paddingTopLeft: [40, 50], paddingBottomRight: [90, inset + 30], maxZoom: 12, animate: true });
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }
    layer.clearLayers();
    const points = tab === 'overview'
      ? drawOverview(layer, itinerary)
      : tab === 'todo' ? drawTodo(layer, itinerary) : drawDay(layer, itinerary, tab);
    boundsRef.current = points.length ? L.latLngBounds(points) : null;
    fit(boundsRef.current, bottomInset);
    // bottomInset 变化单独处理，避免重绘图层
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary, tab, fit]);

  useEffect(() => {
    fit(boundsRef.current, bottomInset);
  }, [bottomInset, fit]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0"
      role="application"
      aria-label="行程地图"
    />
  );
}
