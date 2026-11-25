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
  assert.equal(playing.app, 'Music');
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

test('reads series, episode and playback source from the current state without duplicate labels', () => {
  const details = nowPlayingDetails(player('paused', {
    media_series_title: 'Fixture series', media_title: 'Episode title', media_season: '02',
    media_episode: 4, app_name: 'Video player', source: 'HDMI', media_artist: 'Contributor',
  }), origin);
  assert.deepEqual(details, {
    title: 'Fixture series', episodeTitle: 'Episode title', season: '02', episode: '4',
    app: 'Video player', artist: 'Contributor', picture: '',
  });
  assert.deepEqual(nowPlayingDetails(player('paused', {
    media_title: 'Same name', media_series_title: 'Same name', media_artist: 'Same name',
    source: 'Same name', media_season: -1, media_episode: 'unknown',
  }), origin), { title: 'Same name', artist: '', picture: '' });
  assert.deepEqual(nowPlayingDetails(player('idle', { source: 'HDMI' }), origin),
    { title: 'HDMI', artist: '', picture: '' });
  assert.equal(nowPlayingDetails(player('playing', { media_season:'Specials', media_episode:'A1' }), origin).season,
    'Specials');
  assert.deepEqual(nowPlayingDetails({ ...player('paused', { media_title: 'Old track', app_name: 'Video' }),
    available: false }, origin), {});
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

test('room media links require a selected media player and an existing Media panel', () => {
  const states = { [entity]: { state:'playing', attributes:{} },
    'media_player.unassigned': { state:'idle', attributes:{} }, 'light.fixture': { state:'on', attributes:{} } };
  const config = {
    toolbar: [{ id:'media-one', kind:'media' }, { id:'security-one', kind:'security' }],
    room_overrides: { bayit_room_fixture: { name:'Fixture', entities:[entity,'light.fixture'],
      media_panel_links: { [entity]:'media-one', 'light.fixture':'media-one', 'media_player.unassigned':'media-one' } } },
  };
  const room = () => generateDashboard(config,{states}).views[0].cards[0].rooms.find(item => item.id === 'bayit_room_fixture');
  assert.deepEqual(room().entities.map(item => item.media_panel_id), ['media-one', undefined]);
  config.room_overrides.bayit_room_fixture.media_panel_links[entity] = 'security-one';
  assert.deepEqual(room().entities.map(item => item.media_panel_id), [undefined, undefined]);
});

test('room vacuum links only address a configured Vacuum panel from a visible vacuum', () => {
  const robot = 'vacuum.fixture';
  const states = { [robot]: { state:'docked', attributes:{} }, [entity]: { state:'idle', attributes:{} } };
  const config = {
    toolbar: [{ id:'media-one', kind:'media' }, { id:'vacuum-one', kind:'vacuum' }],
    room_overrides: { bayit_room_fixture: { name:'Fixture', entities:[robot,entity],
      vacuum_panel_links: { [robot]:'vacuum-one', [entity]:'vacuum-one' } } },
  };
  const room = hass => generateDashboard(config,hass).views[0].cards[0].rooms.find(item => item.id === 'bayit_room_fixture');
  assert.deepEqual(room({states}).entities.map(item => item.vacuum_panel_id), ['vacuum-one',undefined]);
  config.room_overrides.bayit_room_fixture.vacuum_panel_links[robot] = 'media-one';
  assert.equal(room({states}).entities[0].vacuum_panel_id, undefined);
  config.room_overrides.bayit_room_fixture.vacuum_panel_links[robot] = 'vacuum-one';
  assert.equal(room({states,entities:{[robot]:{hidden:true}}}).entities.some(item => item.entity === robot),false);
});
