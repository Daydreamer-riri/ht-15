import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { explorerScenes, explorerScenePath } from '../realtrip/src/explorer-ui.js';
import { EXPERIENCE_URL } from '../src/presentation/config.js';

const root = new URL('../', import.meta.url);
const pages = 'https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/';
const walkBase = new URL('walk/', pages);

test('all entry documents resolve their own assets under the Pages project prefix', () => {
  for (const entry of ['index.html', 'presentation/index.html', 'walk/index.html', 'walk/honor-corridor/index.html', 'sky-soho/index.html', 'route-3d/index.html']) {
    const html = readFileSync(new URL(`dist/${entry}`, root), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
      const target = match[1];
      if (/^https?:/.test(target)) continue;
      const resolved = new URL(target, new URL(entry, pages));
      assert.ok(resolved.href.startsWith(pages), `${entry}: ${target} escapes project prefix`);
      const relative = resolved.href.slice(pages.length);
      assert.ok(existsSync(new URL(`dist/${relative}`, root)), `${entry}: missing ${relative}`);
    }
  }
});

test('scene switches and the presentation QR stay on the migrated site', () => {
  for (const [scene] of explorerScenes) {
    const target = new URL(explorerScenePath(scene, walkBase.pathname), pages);
    assert.ok(target.href.startsWith(pages));
    assert.ok(target.href.startsWith(walkBase.href));
    assert.equal(target.searchParams.get('scene'), scene);
  }
  assert.equal(EXPERIENCE_URL, new URL('?scene=cafeteria', walkBase).href);
  const scene = JSON.parse(readFileSync(new URL('dist/walk/honor-corridor/scene.json', root)));
  assert.ok(new URL(scene.homeUrl, new URL('honor-corridor/', walkBase)).href.startsWith(walkBase.href));
});

test('planet navigation connects both planets and the shared walking entrance', () => {
  for (const planet of ['sky-soho', 'route-3d']) {
    const url = new URL(`${planet}/`, pages);
    const html = readFileSync(new URL(`dist/${planet}/index.html`, root), 'utf8');
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1], url).href);
    for (const path of ['sky-soho/', 'route-3d/', 'walk/']) {
      assert.ok(links.includes(new URL(path, pages).href), `${planet}: missing ${path}`);
    }
  }
  assert.equal(explorerScenePath('sky-soho', '/walk/'), '/sky-soho/?view=planet');
});

test('every scene model, supplement, terrain and screen texture is packaged locally', () => {
  for (const name of ['insta360', 'terrace', 'cafeteria', 'hackathon', 'alpine-lake', 'two-floor', 'insta360-5bfe']) {
    const scene = JSON.parse(readFileSync(new URL(`realtrip/src/${name}.json`, root)));
    const resources = [scene.contentUrl, scene.navigation?.url, scene.screens?.textureUrl, scene.screensUrl,
      ...(scene.supplements ?? []).map(item => item.contentUrl)].filter(Boolean);
    if(scene.navigation?.kind==='voxel-body')resources.push(scene.navigation.url.replace(/\.json$/,'.bin'));
    if(scene.screensUrl){
      const screens=JSON.parse(readFileSync(new URL(`dist/walk/${scene.screensUrl}`,root)));
      for(const screen of screens.surfaces)if(screen.texture)resources.push(new URL(screen.texture,new URL(scene.screensUrl,walkBase)).href.slice(walkBase.href.length));
    }
    for (const resource of resources) {
      const resolved = new URL(resource, walkBase);
      assert.ok(resolved.href.startsWith(walkBase.href));
      assert.ok(existsSync(new URL(`dist/walk/${resolved.pathname.slice(walkBase.pathname.length)}`, root)), `${name}: ${resource}`);
    }
  }
  assert.ok(existsSync(new URL('dist/walk/honor-corridor/scene.sog', root)));
});
