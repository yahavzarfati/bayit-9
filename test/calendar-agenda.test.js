import assert from 'node:assert/strict';
import test from 'node:test';
import { agendaWindow, buildCalendarAgenda } from '../src/calendar-agenda.js';
import { generateDashboard } from '../src/strategy-model.js';

process.env.TZ = 'America/New_York';

const source = (name, events) => ({ source: { entity: 'calendar.' + name, name }, events });
const allDay = (summary, start, end) => ({ summary, start: {date:start}, end: {date:end} });
const timed = (summary, start, end, location) => ({ summary, start: {dateTime:start}, end: {dateTime:end}, location });

test('uses seven local calendar dates over daylight saving and handles half-open events', () => {
  const now = new Date('2026-03-07T12:00:00-05:00');
  const range = agendaWindow(now);
  assert.equal(range.firstDay, '2026-03-07');
  assert.equal(range.afterLastDay, '2026-03-14');
  assert.equal(+range.end - +range.start, 167 * 3600000);
  const agenda = buildCalendarAgenda([source('fixture', [
    allDay('Ended at local midnight', '2026-03-06', '2026-03-07'),
    allDay('Ongoing across midnight', '2026-03-06', '2026-03-09'),
    allDay('First excluded day', '2026-03-14', '2026-03-15'),
    allDay('Invalid calendar date', '2026-02-30', '2026-03-10'),
    allDay('Last included day', '2026-03-13', '2026-03-14'),
    timed('Finished this morning', '2026-03-07T08:00:00-05:00', '2026-03-07T09:00:00-05:00'),
    timed('Now running', '2026-03-07T10:00:00-05:00', '2026-03-07T14:00:00-05:00'),
    timed('Local Sunday', '2026-03-09T01:00:00Z', '2026-03-09T02:00:00Z'),
  ])], now, range);
  assert.deepEqual(agenda.full.map(group => [group.day, group.rows.map(row => row.summary)]), [
    ['2026-03-07', ['Ongoing across midnight', 'Now running']],
    ['2026-03-08', ['Local Sunday']],
    ['2026-03-13', ['Last included day']],
  ]);
  assert.equal(agenda.nextChange, +new Date('2026-03-07T14:00:00-05:00'));
});

test('merges exact overlapping copies by original time and location with the configured source order', () => {
  const now = new Date('2026-03-07T12:00:00-05:00');
  const primary = timed('Shared plan', '2026-03-08T12:00:00-04:00', '2026-03-08T12:30:00-04:00', 'Hall A');
  const copy = { ...primary, start: {dateTime:'2026-03-08T16:00:00Z'}, end: {dateTime:'2026-03-08T16:30:00Z'} };
  const data = buildCalendarAgenda([
    source('first', [primary, primary]),
    source('second', [copy, {...copy, location:'Hall B'}]),
  ], now);
  assert.equal(data.count, 2);
  assert.deepEqual(data.full[0].rows.map(row => row.sources.map(item => item.name)), [['first','second'], ['second']]);
  assert.equal(Object.hasOwn(data.full[0].rows[0], 'location'), false);
});

test('compact mode counts occupied days rather than gaps and limits the combined agenda to six entries', () => {
  const now = new Date('2026-03-07T12:00:00-05:00');
  const sparse = [7, 9, 11, 12, 13].map(day => allDay(String(day), '2026-03-' + String(day).padStart(2,'0'),
    '2026-03-' + String(day + 1).padStart(2,'0')));
  const clock = buildCalendarAgenda([source('sparse', sparse)], now);
  assert.deepEqual(clock.compact.map(group => group.day), ['2026-03-07', '2026-03-09', '2026-03-11', '2026-03-12']);
  assert.equal(clock.count, 5);
  assert.equal(clock.canExpand, true);
  const busy = buildCalendarAgenda([source('busy', Array.from({length:8}, (_, i) => allDay(
    'Event ' + i, '2026-03-07', '2026-03-08')))], now);
  assert.equal(busy.compact[0].rows.length, 6);
  assert.equal(busy.full[0].rows.length, 8);
});

test('projects only explicitly enabled calendar settings with safe visible daily weather and typed accent', () => {
  const hass = {
    states: {
      'calendar.first': {state:'off', attributes:{}},
      'calendar.hidden': {state:'off', attributes:{}},
      'weather.allowed': {state:'sunny', attributes:{supported_features:1}},
      'weather.hourly': {state:'sunny', attributes:{supported_features:2}},
      'weather.hidden': {state:'sunny', attributes:{supported_features:1}},
    },
    entities: {'calendar.hidden': {disabled_by:'user'}, 'weather.hidden': {hidden_by:'user'}},
  };
  const entry = {id:'calendar',kind:'calendar',placement:'settings',
    calendar_agenda:{enabled:true, weather_entity:'weather.allowed', show_month:true, url:'https://external.invalid/'},
    sections:[{kind:'devices', entities:[
      {entity:'calendar.first', icon:'mdi:calendar', accent_color:'#D9AAD2'},
      {entity:'calendar.hidden', accent_color:'#112233'},
      {entity:'weather.allowed', accent_color:'#D9AAD2'},
    ]}],
  };
  const build = (item, options) => generateDashboard({ toolbar:[item], ...options }, hass).views[0].cards[0].toolbar[0];
  const first = build(entry);
  assert.deepEqual(first.calendar_agenda, {enabled:true, show_month:true, weather_entity:'weather.allowed'});
  assert.deepEqual(first.sections[0].entities.map(item => [item.entity,item.accent_color]), [
    ['calendar.first','#D9AAD2'], ['weather.allowed', undefined],
  ]);
  for (const weather_entity of ['weather.missing','weather.hidden','weather.hourly','calendar.first']) {
    assert.deepEqual(build({...entry, calendar_agenda:{enabled:true,weather_entity}}).calendar_agenda, {enabled:true});
  }
  assert.deepEqual(build(entry, {hidden_entities:['weather.allowed']}).calendar_agenda, {enabled:true,show_month:true});
  assert.deepEqual(build({...entry,calendar_agenda:{enabled:true,show_month:'true'}}).calendar_agenda,{enabled:true});
  assert.equal(build({...entry, kind:'weather'}).calendar_agenda, undefined);
  assert.equal(build({...entry, calendar_agenda:{enabled:'true'}}).calendar_agenda, undefined);
});
