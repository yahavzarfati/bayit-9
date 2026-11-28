import assert from 'node:assert/strict';
import test from 'node:test';
import { filterFinderEntries, finderFavoritesStorageKey, finderTitle, indexFinderEntries, readFinderFavorites } from '../src/device-finder.js';

const inventory = {
  rooms: [
    { id: 'kitchen', name: 'מטבח', keywords: 'Cuisine' },
    { id: 'secure-room', name: 'ממ״ד' },
    { id: 'bathroom', name: 'אמבטיה' },
    { id: 'bathroom', name: 'Duplicate' },
  ],
  devices: [
    { room: 'kitchen', entity: 'cover.kitchen_left', name: 'תריס שמאל', available: false },
    { room: 'kitchen', entity: 'cover.kitchen_left', name: 'Duplicate' },
    { room: 'kitchen', entity: 'light.kitchen_strip', name: 'Éclairage', keywords: ['Kitchen strip', 'counter', null] },
    { room: 'secure-room', entity: 'light.night', name: 'מְנוֹרַת לילה' },
    { room: 'bathroom', entity: 'switch.ir_heater', name: 'חימום', kind: 'heater' },
    { room: 'bathroom', entity: 'switch.boiler', name: 'דוד', kind: 'boiler' },
    { room: 'unlisted', entity: 'light.hidden_group', name: 'Hidden' },
  ],
};
const keys = entries => entries.map(entry => entry.key);

test('indexes only declared navigation entries, retaining room context, kind, and availability', () => {
  const entries = indexFinderEntries(inventory, 'he');
  assert.deepEqual(keys(entries), [
    'room/kitchen',
    'room/secure-room',
    'room/bathroom',
    'device/kitchen/cover.kitchen_left',
    'device/kitchen/light.kitchen_strip',
    'device/secure-room/light.night',
    'device/bathroom/switch.ir_heater',
    'device/bathroom/switch.boiler',
  ]);
  assert.equal(entries[3].available, false);
  assert.equal(entries[3].roomName, 'מטבח');
  assert.equal(entries[6].category, 'תנורי חימום');
  assert.equal(entries[7].category, 'דודי מים');
});

test('matches mixed Hebrew and English terms across name, synonyms, room, category, and entity ID', () => {
  const entries = indexFinderEntries(inventory, 'he-IL');
  assert.equal(finderTitle('he-IL'), 'חיפוש חדרים ומכשירים');
  assert.deepEqual(keys(filterFinderEntries(entries, { query: '  תריס במטבח ' })), ['device/kitchen/cover.kitchen_left']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'ממד מנורת' })), ['device/secure-room/light.night']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'eclairage  cuisine' })), ['device/kitchen/light.kitchen_strip']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'counter cuisine' })), ['device/kitchen/light.kitchen_strip']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'cover.kitchen_left' })), ['device/kitchen/cover.kitchen_left']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'חימום אמבטיה' })), ['device/bathroom/switch.ir_heater']);
});

test('filters favorites to visible rows and limits stored records to well-formed routes', () => {
  const entries = indexFinderEntries(inventory);
  const favorites = readFinderFavorites(JSON.stringify([
    'device/kitchen/cover.kitchen_left', 'room/kitchen', 'room/kitchen',
    'device/hidden/light.night', 'bad', null,
  ]));
  assert.deepEqual(keys(filterFinderEntries(entries, { filter: 'favorites', favorites })),
    ['room/kitchen', 'device/kitchen/cover.kitchen_left']);
  assert.deepEqual(keys(filterFinderEntries(entries, { query: 'light', filter: 'favorites', favorites })), []);
  assert.equal(readFinderFavorites('{').size, 0);
  assert.equal(readFinderFavorites(JSON.stringify({ favorites: [...favorites] })).size, 0);
  assert.equal(readFinderFavorites(JSON.stringify(Array.from({ length: 121 }, (_, index) => 'room/' + index))).size, 100);
  assert.notEqual(finderFavoritesStorageKey('["A","B"]', 'C'), finderFavoritesStorageKey('["A"', '"B"],"C"'));
  assert.notEqual(finderFavoritesStorageKey('bayit', 'alice'), finderFavoritesStorageKey('bayit', 'bob'));
  assert.notEqual(finderFavoritesStorageKey('bayit', 'alice'), finderFavoritesStorageKey('bayit-copy', 'alice'));
  assert.equal(finderFavoritesStorageKey('bayit', undefined), undefined);
});

test('one entity included in two rooms keeps the distinct Bayit destinations', () => {
  const entries = indexFinderEntries({
    rooms: [{ id: 'room-1', name: 'Room 1' }, { id: 'room-2', name: 'Room 2' }],
    devices: [
      { room: 'room-1', entity: 'light.shared', name: 'Shared lamp' },
      { room: 'room-2', entity: 'light.shared', name: 'Shared lamp' },
    ],
  });
  assert.deepEqual(keys(filterFinderEntries(entries, { filter: 'devices', query: 'shared lamp' })),
    ['device/room-1/light.shared', 'device/room-2/light.shared']);
  assert.deepEqual(keys(filterFinderEntries(entries, { filter: 'rooms', query: 'room 2' })), ['room/room-2']);
});
