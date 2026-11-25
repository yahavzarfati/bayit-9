import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium, webkit } from 'playwright-core';

const bundle = await readFile(new URL('../dist/bayit-9.js', import.meta.url));
const fixture = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body { margin: 0 }</style><script type="module">
import '/bayit-9.js';
const settings = new URL(location.href).searchParams;
const minute = 60_000;
const finish = value => new Date(Date.now() + value * minute).toISOString();
const timer = (target, minutes) => ({
  state: '180', attributes: { switch_entity_id: target, timer_state: 'active', timer_finishes_at: finish(minutes) },
});
const mainHeat = {
  entity: 'fan.bedroom_heater', name: 'Bedroom heater', kind: 'heater',
  timed: { simple_timer_entity: 'sensor.bedroom_heat_timer', simple_timer_target: 'switch.bedroom_heat_relay' },
};
const bathHeat = {
  entity: 'fan.bathroom_heater', name: 'Bathroom heater', kind: 'heater',
  timed: { simple_timer_entity: 'sensor.bath_heat_timer', simple_timer_target: 'switch.bath_heat_relay' },
};
const power = { state: 'on', attributes: {} };
const air = temperature => ({ state: 'cool', attributes: { temperature, current_temperature: 21.5 } });
const states = {
  'sensor.bedroom_temperature': { state: '23.5', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } },
  'climate.bedroom': air(26),
  'fan.bedroom_heater': power,
  'switch.bedroom_heat_relay': power,
  'sensor.bedroom_heat_timer': timer('switch.bedroom_heat_relay', 23),
  'fan.bathroom_heater': power,
  'switch.bath_heat_relay': power,
  'sensor.bath_heat_timer': timer('switch.bath_heat_relay', 18),
  'switch.boiler': power,
  'sensor.boiler_timer': timer('switch.boiler', 40),
  'climate.solo': air(24),
  'timer.solo': { state: 'active', attributes: { finishes_at: finish(12) } },
  'light.one': power, 'light.two': power, 'light.three': power, 'light.four': power,
};
const card = document.createElement('bayit-dashboard');
card.setConfig({
  locale: settings.get('locale'),
  layout: settings.get('layout'),
  page: true,
  rooms: [
    { id: 'bedroom', name: 'Bedroom', entities: [
      'sensor.bedroom_temperature', { entity: 'climate.bedroom', name: 'Bedroom AC' }, mainHeat,
      'light.one', 'light.two', 'light.three', 'light.four',
    ] },
    { id: 'bathroom', name: 'Bathroom', entities: [
      bathHeat, { entity: 'switch.boiler', name: 'Boiler', kind: 'boiler', timed: { simple_timer_entity: 'sensor.boiler_timer' } },
    ] },
    { id: 'solo', name: 'Solo', entities: [
      { entity: 'climate.solo', name: 'Solo AC', timed: { timer_entity: 'timer.solo' } },
    ] },
  ],
});
const hass = {
  states, config: { unit_system: { temperature: '°C' } },
  callWS: () => Promise.reject(new Error('This fixture is read only')),
};
card.hass = hass;
document.body.append(card);
window.changeFixture = (id, state) => {
  if (id.includes('sensor.')) states[id] = { ...states[id], attributes: { ...states[id].attributes, timer_state: state } };
  else states[id] = { ...states[id], state };
  card.hass = { ...hass, states: { ...states } };
};
</script>`;

const server = http.createServer((request, response) => {
  if (request.url === '/bayit-9.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(bundle);
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fixture);
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');

function activities(room) {
  return room.locator('.room-status[data-badge="activity"]:not([hidden])');
}

async function expectVisible(visible, icon, label, reading) {
  const chip = visible.filter({ has: visible.page().locator('ha-icon[icon="' + icon + '"]'), hasText: reading });
  await chip.waitFor();
  assert.match(await chip.getAttribute('aria-label'), label);
  assert.match(await chip.textContent(), reading);
}

try {
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const [engine, launcher] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await launcher.launch();
    try {
      for (const [locale, layout] of [['he', 'classic'], ['en', 'header']]) {
        const page = await browser.newPage({ viewport: { width: 320, height: 760 }, hasTouch: true, isMobile: true });
        await page.clock.setFixedTime(new Date('2026-11-25T15:30:00Z'));
        await page.goto(base + '/?locale=' + locale + '&layout=' + layout);
        const bedroom = page.locator('.room[data-room="bedroom"]');
        const bathroom = page.locator('.room[data-room="bathroom"]');
        const solo = page.locator('.room[data-room="solo"]');
        await bedroom.waitFor();
        assert.equal(await activities(bedroom).count(), 2, 'Bedroom AC and separate heater countdown must both be visible');
        await expectVisible(activities(bedroom), 'mdi:air-conditioner', /Bedroom AC/, /26/);
        await expectVisible(activities(bedroom), 'mdi:radiator', /Bedroom heater/, /23:00/);
        assert.match(await bedroom.locator('[data-badge=temperature]').textContent(), /23\.5°C/);
        assert.equal(await activities(bathroom).count(), 2, 'Bathroom heater and boiler must both be visible');
        await expectVisible(activities(bathroom), 'mdi:radiator', /Bathroom heater/, /18:00/);
        await expectVisible(activities(bathroom), 'mdi:water-boiler', /Boiler/, /40:00/);
        assert.equal(await activities(solo).count(), 1, 'Keep one reading when the same AC owns the timer');
        await expectVisible(activities(solo), 'mdi:timer-outline', /Solo AC/, /12:00/);

        const uncut = await bedroom.evaluate(room => {
          const strip = room.querySelector('.room-status-strip');
          const quick = room.querySelector('.quick').getBoundingClientRect();
          const stripBounds = strip.getBoundingClientRect();
          return stripBounds.bottom <= quick.top + 1 && [...strip.children].filter(chip => !chip.hidden).every(chip => {
            const text = chip.querySelector('span');
            return chip.getBoundingClientRect().right <= stripBounds.right + 1 && text.scrollWidth <= text.clientWidth;
          });
        });
        assert.ok(uncut, 'Room badges must fit above the six shortcuts at 320px');
        await page.evaluate(() => window.changeFixture('sensor.boiler_timer', 'idle'));
        await expectVisible(activities(bathroom), 'mdi:water-boiler', /Boiler/, locale === 'he' ? /פועל/ : /On/);
        await page.evaluate(() => window.changeFixture('switch.boiler', 'unavailable'));
        await expectVisible(activities(bathroom), 'mdi:timer-outline', /Bathroom heater/, /18:00/);
        assert.equal(await activities(bathroom).count(), 1, 'An unavailable boiler must leave no running badge');
        await page.evaluate(() => window.changeFixture('timer.solo', 'idle'));
        await expectVisible(activities(solo), 'mdi:air-conditioner', /Solo AC/, /24/);
        await page.close();
        console.log(engine + ' ' + locale + ' ' + layout + ': independent climate and heating statuses at 320px');
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
}
