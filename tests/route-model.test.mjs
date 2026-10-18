import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { walkHrefFor } from '../src/atlas/walk-links.js';
import { buildRouteModel, createJourney, sampleJourney, project, unproject, haversine, legsForDay, stopsForDay, validPosition } from '../src/route-3d/model.js';

const data = JSON.parse(readFileSync(new URL('../src/route-3d/data/north-xinjiang.json', import.meta.url)));
const model = buildRouteModel(data);

test('every source road leg, including the day-two hotel return and airport transfer, is retained unchanged', () => {
  const sourceLegs = data.days.flatMap(day => [...day.items.map(item => item.leg).filter(Boolean), ...(day.returnLeg ? [day.returnLeg] : [])]);
  assert.equal(model.legs.length, 18);
  assert.deepEqual(model.legs.map(leg => leg.points), sourceLegs.map(leg => leg.points));
  assert.equal(model.pointCount, 1517);
  assert.equal(model.legs.find(leg => leg.id === '2:return').destination, data.days[1].returnLeg.target);
  assert.equal(legsForDay(model, 7).length, 1);
  assert.equal(legsForDay(model, 7)[0].destination, '吐鲁番 交河机场');
});

test('repeated lake stops keep both days, while distinct itinerary markers are retained', () => {
  const lake = model.stops.filter(stop => stop.name === '赛里木湖');
  assert.equal(lake.length, 1);
  assert.deepEqual(lake[0].days, [4, 5]);
  assert.ok(stopsForDay(model, 5).includes(lake[0]));
  assert.equal(stopsForDay(model, 7).filter(stop => stop.kind !== 'hotel').length, 0);
  assert.equal(model.stops.filter(stop => stop.kind !== 'hotel').length, 9);
});

test('journey follows original segments without drawing links between disconnected legs', () => {
  const journey = createJourney([
    { id: 'a', points: [[45, 80], [45, 81]] },
    { id: 'b', points: [[45, 90], [45, 91]] },
  ]);
  assert.equal(journey.segments.length, 2);
  assert.ok(Math.abs(journey.total - haversine([45, 80], [45, 81]) * 2) < 1e-8);
  assert.deepEqual(sampleJourney(journey, 0).position, [45, 80]);
  assert.deepEqual(sampleJourney(journey, 1).position, [45, 91]);
  assert.equal(sampleJourney(journey, .51).leg.id, 'b');
  assert.ok(sampleJourney(journey, .51).position[1] >= 90);
});

test('empty/duplicate geometry, clamped progress and WGS84 coordinate order are handled', () => {
  assert.equal(sampleJourney(createJourney([]), .5), null);
  assert.equal(createJourney([{points:[[1,2],[1,2]]}]).segments.length, 0);
  const route = createJourney([{points:[[44,81],[45,82]]}]);
  assert.deepEqual(sampleJourney(route, -1).position, [44,81]);
  assert.deepEqual(sampleJourney(route, 2).position, [45,82]);
  for (const stop of model.stops) {
    const roundTrip = unproject(project(stop.position));
    assert.ok(roundTrip.every((value, i) => Math.abs(value - stop.position[i]) < 1e-9));
  }
  assert.equal(validPosition([44.60759,81.11595]), true);
  assert.equal(validPosition([95,81]), false);
  assert.equal(validPosition([NaN,81]), false);
});

test('Sayram Lake photo opens the alpine-lake walk scene; other stops stay unlinked', () => {
  const lake = model.stops.find(stop => stop.name === '赛里木湖');
  assert.equal(walkHrefFor(lake), '../walk/?scene=alpine-lake');
  assert.ok(model.stops.filter(stop => stop !== lake).every(stop => walkHrefFor(stop) === null));
  assert.equal(walkHrefFor(null), null);
});
