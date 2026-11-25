import assert from 'node:assert/strict';
import test from 'node:test';
import { catalog, featuredWallpapers, wallpaperGroups } from '../src/wallpaper-catalog.js';
import { BACKGROUNDS } from '../src/strategy-model.js';

const existingWallpapers = [
  'aurora', 'lagoon', 'dunes', 'jade', 'blue_hour', 'graphite', 'bronze',
  'architecture', 'porcelain', 'evening', 'clouds', 'starlight',
];

test('the stock gallery and the household default offer the same stable wallpaper choices', () => {
  assert.deepEqual(Object.keys(BACKGROUNDS), Object.keys(catalog));
  for (const id of existingWallpapers) assert.ok(catalog[id], id);
  for (const [id, entry] of Object.entries(catalog)) {
    assert.ok(entry.en && entry.he && entry.background, id);
    assert.ok(wallpaperGroups[entry.group].includes(id), id);
    assert.deepEqual(BACKGROUNDS[id], { en: entry.en, he: entry.he });
  }
  for (const ids of [...Object.values(wallpaperGroups), featuredWallpapers]) {
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(id => Object.hasOwn(catalog, id)));
  }
});
