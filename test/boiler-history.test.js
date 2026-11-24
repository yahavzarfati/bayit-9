import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBoilerSessions } from '../src/boiler-history.js';

const entity = 'switch.test_boiler';
const start = Date.parse('2026-11-01T04:00:00Z');
const at = minute => start + minute * 60000;
const history = (minute,state) => ({s:state,lc:at(minute) / 1000});
const event = (minute,state,context_domain) => ({entity_id:entity,state,when:at(minute) / 1000,context_domain});

test('history groups complete confirmed runs, excludes interruptions and classifies only matched events', () => {
  const runs = buildBoilerSessions({ entity,start,end:at(200), history:[
    history(20,'off'), history(0,'off'), history(8,'on'),history(15,'on'),
    history(30,'on'),history(31,'off'), history(40,'on'),history(43,'unavailable'),history(50,'off'),
    history(90,'on'), history(100,'off'),
  ], logbook:[event(8,'on','simple_timer'),event(90,'on','scheduler'),
    {...event(110,'on','switch'),entity_id:'switch.other'},event(90,'on','scheduler')],device:{state:'off',last_changed:new Date(at(100)).toISOString()} });
  assert.deepEqual(runs,[
    {start:at(90),end:at(100),running:false,partial:false,source:'boiler_automation'},
    {start:at(8),end:at(20),running:false,partial:false,source:'timed'},
  ]);
});

test('runs are clipped to seven-day window start and only shown running when the live device reports on', () => {
  const current = { entity,start,end:at(60),history:[history(-20,'on')] };
  assert.deepEqual(buildBoilerSessions({...current,device:{state:'on',last_changed:new Date(at(-20)).toISOString()}}),[
    {start,end:at(60),running:true,partial:true,source:'unknown'},
  ]);
  assert.deepEqual(buildBoilerSessions({...current,device:{state:'unavailable',last_changed:new Date(at(20)).toISOString()}}),[]);
  assert.deepEqual(buildBoilerSessions({...current,device:{state:'off',last_changed:new Date(at(20)).toISOString()}}),[
    {start,end:at(20),running:false,partial:true,source:'unknown'},
  ]);
});

test('recognizes a matching local schedule without attributing explicit user or unrelated runs to it', () => {
  const schedules = [
    { editable:true, enabled:true, weekdays:['sun'], time:'06:08' },
    { editable:true, enabled:false, weekdays:['sun'], time:'06:30' },
    { editable:false, enabled:true, weekdays:['sun'], time:'06:40' },
    { editable:true, enabled:true, weekdays:['sun'], time:'06:50' },
    { editable:true, enabled:true, weekdays:['mon'], time:'07:00' },
  ];
  const logbook = [event(8,'on','simple_timer'), event(30,'on','simple_timer'), event(40,'on','simple_timer'),
    {...event(50,'on','simple_timer'), context_user_id:'fixture-user'}, event(60,'on','simple_timer')];
  const records = [8,30,40,50,60].flatMap(minute => [history(minute,'on'), history(minute + 5,'off')]);
  const period = { entity,start,end:at(80),history:records,logbook,schedules };
  const sources = timeZone => buildBoilerSessions({...period,timeZone}).map(run => run.source).reverse();
  assert.deepEqual(sources('Asia/Jerusalem'), ['boiler_schedule_match','timed','timed','timed','timed']);
  assert.deepEqual(sources('invalid-timezone'), ['timed','timed','timed','timed','timed']);
});
