import assert from 'node:assert/strict';
import test from 'node:test';
import { nowPlayingDetails, playbackSecond } from '../src/now-playing.js';
import { generateDashboard } from '../src/strategy-model.js';

const origin = 'http://fixture.test:8123';
const entity = 'media_player.fixture';
const time = Date.parse('2026-11-25T00:00:00.000Z');
const player = (state, attributes) => ({ entity, state, available: true, attributes });

test('plays the same track timeline only while the entity reports playing', () => {
  const attrs = { media_title: 'Track', media_artist: 'Performer', app_name: 'Music',
    media_position: 63, media_duration: 90, media_position_updated_at: new Date(time).toISOString() };
  const playing = nowPlayingDetails(player('playing', attrs), origin);
  assert.equal(playing.title, 'Track');
  assert.equal(playing.artist, 'Performer');
  assert.equal(playbackSecond(playing.timeline, time - 1000), 63);
  assert.equal(playbackSecond(playing.timeline, time + 2000), 65);
  assert.equal(playbackSecond(playing.timeline, time + 120000), 90);
  for (const state of ['paused', 'buffering']) {
    const details = nowPlayingDetails(player(state, attrs), origin);
    assert.equal(playbackSecond(details.timeline, time + 120000), 63);
  }
  assert.deepEqual(nowPlayingDetails(player('off', attrs), origin), {});
  assert.equal(nowPlayingDetails(player('playing', { ...attrs, media_position: undefined }), origin).timeline, undefined);
});

test('limits artwork to the selected player proxy and keeps metadata for external artwork', () => {
  const artwork = '/api/media_player_proxy/' + entity + '?token=fixture';
  const model = picture => player('on', { app_name: 'Music', entity_picture: picture });
  assert.equal(nowPlayingDetails(model(artwork), origin).picture, origin + artwork);
  for (const picture of ['https://fixture.invalid' + artwork, '//fixture.invalid' + artwork,
    '/api/media_player_proxy/media_player.other?token=fixture', '/local/image.png', artwork + '#other']) {
    assert.deepEqual(nowPlayingDetails(model(picture), origin), { title: 'Music', artist: '', picture: '' });
  }
});

test('curated toolbar only applies Now Playing to an explicitly chosen media entity', () => {
  const states = { [entity]: { state: 'playing', attributes: {} }, 'sensor.fixture': { state:'1', attributes:{} } };
  const config = { toolbar: [{ kind:'media', sections:[{ kind:'media',
    entities:[{ entity, role:'now_playing' },{ entity:'sensor.fixture', role:'now_playing' }] }] }] };
  const items = generateDashboard(config,{states}).views[0].cards[0].toolbar[0].sections[0].entities;
  assert.deepEqual(items,[{ entity, role:'now_playing' }]);
});
