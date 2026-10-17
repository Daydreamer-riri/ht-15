import { buildDayTrip } from './model.js';

// Preserve the source itinerary and old POI IDs. These anchors are illustrative.
export const experiences = [
  { sceneId: 'hackathon', sourceId: 'sky-soho-building-8', name: '主会场', caption: '灵感在这里发生' },
  { sceneId: 'two-floor', sourceId: 'sky-soho-gym', name: '健身房', caption: '换个节奏，动起来' },
  { sceneId: 'building2', sourceId: 'sky-soho-meeting-room', name: '会议室', caption: '走进想法碰撞的地方' },
  { sceneId: 'terrace', sourceId: 'sky-soho-workspace', name: '露台', caption: '到户外，透一口气' },
  { sceneId: 'cafeteria', sourceId: 'sky-soho-pantry', name: '食堂', caption: '一起补充一点能量' },
];

export function sceneHref(sceneId) {
  if (!experiences.some(item => item.sceneId === sceneId)) throw new Error('Unknown experience');
  return `../walk/?scene=${sceneId}`;
}

export function buildExperience(data) {
  const model = buildDayTrip(data);
  const stops = experiences.map((experience, index) => {
    const source = model.stops.find(stop => stop.id === experience.sourceId);
    if (!source) throw new Error(`Missing campus anchor: ${experience.sourceId}`);
    return { ...source, ...experience, index };
  });
  return { ...model, stops };
}

// Named links need more space than the old number-only markers. Keep them
// inside the canvas and separate them even when several buildings line up.
export function placeLabel(anchor, size, viewport, placed) {
  const gap = 7, padding = 8;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const candidates = [];
  for (let row = -5; row <= 5; row++) {
    for (let column = -3; column <= 3; column++) {
      const x = clamp(anchor.x - size.width / 2 + column * (size.width + gap), padding, viewport.width - size.width - padding);
      const y = clamp(anchor.y - size.height + row * (size.height + gap), padding, viewport.height - size.height - padding);
      const box = { x, y, ...size };
      const overlaps = placed.some(p => x < p.x + p.width + gap && x + size.width + gap > p.x && y < p.y + p.height + gap && y + size.height + gap > p.y);
      if (!overlaps) candidates.push({ box, distance: (x + size.width / 2 - anchor.x) ** 2 + (y + size.height - anchor.y) ** 2 });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.box ?? { x: padding, y: padding, ...size };
}
