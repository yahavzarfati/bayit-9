function clock(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const tail = String(whole % 60).padStart(2, '0');
  if (minutes < 60) return String(minutes).padStart(2, '0') + ':' + tail;
  return Math.floor(minutes / 60) + ':' + String(minutes % 60).padStart(2, '0') + ':' + tail;
}

function timerPresets(action) {
  const { min, max, step } = action;
  const valid = value => Number.isSafeInteger(value) && value >= min && value <= max &&
    (value === max || (value - min) % step === 0);
  const curated = Array.isArray(action.presets) ? [...new Set(action.presets.filter(valid))].slice(0, 8) : [];
  if (Array.isArray(action.presets)) return curated;
  const every = Math.max(1, Math.floor((max - min) / step / 3)) * step;
  return [...new Set([min, Math.min(max, min + every), Math.min(max, min + every * 2), max])];
}

const selectors = {
  set_hvac_mode: ['mdi:air-conditioner', model => model.state],
  set_fan_mode: ['mdi:fan', model => model.attributes.fan_mode],
  set_swing_mode: ['mdi:swap-vertical', model => model.attributes.swing_mode],
};

export function buildPanelControls(model, { make, button, icon, label, t, request }) {
  const used = new Set();
  const updates = [];
  const content = [];
  const buttons = [];
  const actions = model.actions;

  if (model.domain === 'climate') {
    const row = make('div', 'climate-controls');
    if (actions.set_hvac_mode?.options.includes('off')) {
      used.add('turn_on');
      used.add('turn_off');
    }
    const temperature = actions.set_temperature;
    if (temperature) {
      used.add('set_temperature');
      const { min, max, step } = temperature;
      const increment = step || 1;
      const group = make('div', 'temperature-stepper');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', t('set_temperature'));
      const value = make('output', 'target-value');
      const caption = make('span', 'target-caption', t('target_short'));
      const reading = make('div', 'target-reading');
      reading.append(caption, value);
      for (const [direction, glyph, title] of [[-1, 'mdi:minus', 'temperature_down'], [1, 'mdi:plus', 'temperature_up']]) {
        const action = button('step-control', t(title), glyph, true);
        action.dataset.action = 'set_temperature';
        let next;
        updates.push((current, pending) => {
          const actual = current.attributes.temperature;
          next = Number.isFinite(actual) ? Number(Math.min(max, Math.max(min, actual + direction * increment)).toFixed(8)) : null;
          action.disabled = !!pending || next === null || next === actual;
        });
        action.onclick = () => request('set_temperature', next, action);
        if (direction < 0) group.append(action, reading);
        else group.append(action);
      }
      updates.push((current, pending) => {
        const shown = pending?.id === 'set_temperature' ? pending.value : current.attributes.temperature;
        value.textContent = Number.isFinite(shown) ? shown + '°' : '—';
      });
      row.append(group);
    }
    for (const [id, [glyph, active]] of Object.entries(selectors)) {
      if (!actions[id]?.options) continue;
      used.add(id);
      const field = make('label', 'climate-selector');
      const input = make('select');
      input.dataset.action = id;
      input.setAttribute('aria-label', t(id));
      const unavailable = make('option', '', '—');
      unavailable.value = '';
      unavailable.disabled = true;
      input.append(unavailable);
      for (const option of actions[id].options) {
        const item = make('option', '', t(option));
        item.value = option;
        input.append(item);
      }
      input.onchange = () => request(id, input.value, input);
      updates.push((current, pending) => {
        const value = pending?.id === id ? pending.value : active(current);
        input.value = actions[id].options.includes(value) ? value : '';
        input.disabled = !!pending;
      });
      field.append(icon(glyph), input);
      row.append(field);
    }
    if (row.childElementCount) content.push(row);
  }

  const running = ['active', 'paused'].includes(model.timer?.state);
  const duration = running ? actions.extend_timed : actions.start_timed;
  const showStop = !!actions.stop_timed && (running || !duration || model.state === 'on');
  if (model.timer || duration || showStop) {
    for (const id of ['start_timed', 'extend_timed', 'stop_timed']) used.add(id);
    const card = make('section', 'device-timer');
    card.setAttribute('aria-label', t('timed'));
    const time = make('p', 'timer-clock');
    time.setAttribute('aria-label', t('remaining_time'));
    time.dir = 'ltr';
    const today = make('p', 'timer-today');
    updates.push(current => {
      const currentTimer = current.timer;
      time.textContent = currentTimer ? clock(currentTimer.remainingMs === null ? null : currentTimer.remainingMs / 1000) : '00:00';
      today.hidden = !Number.isFinite(currentTimer?.usedSeconds);
      if (!today.hidden) today.textContent = t('today_used') + ' ' + clock(currentTimer.usedSeconds);
    });
    card.append(time, today);
    const tools = make('div', 'timer-tools');
    let input;
    if (duration) {
      const id = duration.id;
      input = make('input', 'timer-range');
      input.type = 'range';
      input.min = duration.min;
      input.max = duration.max;
      input.step = duration.step;
      input.value = duration.max;
      input.setAttribute('aria-label', t('duration'));
      const amount = make('output', 'timer-amount');
      amount.textContent = input.value + ' ' + t('duration');
      input.oninput = () => { amount.textContent = input.value + ' ' + t('duration'); };
      const go = button('control-button timer-command', t(id), running ? 'mdi:plus' : 'mdi:play', true);
      go.onclick = () => request(id, input.valueAsNumber, go);
      go.dataset.action = id;
      buttons.push(go);
      tools.append(input, amount, go);
      updates.push((_, pending) => { input.disabled = !!pending; });
    }
    if (showStop) {
      const stop = button('control-button timer-command', t('stop_timed'), 'mdi:stop', true);
      stop.onclick = () => request('stop_timed', undefined, stop);
      stop.dataset.action = 'stop_timed';
      buttons.push(stop);
      tools.append(stop);
    }
    if (tools.childElementCount) card.append(tools);
    if (duration) {
      const list = make('div', 'timer-presets');
      for (const minutes of timerPresets(duration)) {
        const shown = minutes + ' ' + t('duration');
        const choice = button('control-button timer-preset', shown);
        label(choice, t(duration.id) + ' · ' + shown);
        choice.dataset.action = duration.id;
        choice.onclick = () => request(duration.id, minutes, choice);
        buttons.push(choice);
        list.append(choice);
      }
      if (list.childElementCount) card.append(list);
    }
    content.push(card);
  }

  const level = actions.set_heating_level ?? model.levelRange;
  if (level) {
    const count = Math.floor((level.max - level.min) / level.step) + 1;
    if (count >= 2 && count <= 12) {
      used.add('set_heating_level');
      const section = make('section', 'heat-level');
      const caption = make('p', 'heat-level-title', t('set_heating_level'));
      const choices = make('div', 'heat-level-options');
      for (let i = 0; i < count; i++) {
        const value = Number((level.min + i * level.step).toFixed(8));
        const choice = button('control-button heat-level-choice', String(value));
        label(choice, t('set_heating_level') + ' ' + value);
        choice.dataset.action = 'set_heating_level';
        choice.onclick = () => request('set_heating_level', value, choice);
        buttons.push(choice);
        updates.push((current, pending) => {
          const selected = pending?.id === 'set_heating_level' ? pending.value : current.level;
          choice.disabled = !!pending || !current.actions.set_heating_level;
          choice.setAttribute('aria-pressed', String(selected === value));
          choice.toggleAttribute('data-changing', pending?.id === 'set_heating_level' && selected === value);
        });
        choices.append(choice);
      }
      section.append(caption, choices);
      content.push(section);
    }
  }
  return {
    used, content,
    update(current, pending) {
      for (const item of buttons) item.disabled = !!pending;
      for (const sync of updates) sync(current, pending);
    },
  };
}

export const panelControlStyles = `
  .climate-controls { display: flex; gap: 5px; flex-wrap: wrap; direction: ltr; }
  .climate-controls > * { flex: 1 1 76px; min-width: 0; }
  .climate-controls > .temperature-stepper { flex-basis: 90px; }
  .temperature-stepper, .climate-selector {
    display: flex; align-items: center; justify-content: space-between; gap: 3px;
    border: 1px solid var(--soft-line); border-radius: 10px; background: var(--control);
  }
  .target-reading { text-align: center; line-height: 1.08; }
  .target-caption { display: block; color: var(--secondary); font-size: 10px; font-weight: 730; }
  .target-value { display: block; font-size: 17px; font-weight: 760; direction: ltr; }
  .step-control { min-width: 30px; min-height: 44px; border: 0; background: transparent; padding: 0; }
  .step-control > ha-icon { width: 16px; height: 16px; --mdc-icon-size: 16px; }
  .climate-selector { padding-inline-start: 6px; }
  .climate-selector > ha-icon { width: 15px; height: 15px; --mdc-icon-size: 15px; }
  .climate-selector select { color: inherit; width: 100%; min-width: 0; min-height: 44px; border: 0;
    padding: 0 4px; background: transparent; font-size: 13px; font-weight: 730; }
  .shell[dir=rtl] .climate-selector select { direction: rtl; }
  .climate-selector option { background: #262626; color: white; }
  .device-timer, .heat-level { min-width: 0; text-align: center; border-top: 1px solid var(--soft-line); padding-top: 6px; }
  .timer-clock { margin: 1px 0 0; font-size: 18px; font-weight: 780; font-variant-numeric: tabular-nums; }
  .timer-today, .heat-level-title { margin: 0; font-size: 12px; font-weight: 740; color: var(--secondary); }
  .timer-tools { display: flex; align-items: center; justify-content: center; gap: 8px; margin-block: 2px 5px; direction: ltr; }
  .timer-range { flex: 1; width: 0; min-width: 50px; min-height: 44px; margin: 0;
    direction: ltr; accent-color: var(--moving); }
  .timer-amount { white-space: nowrap; font-size: 12px; }
  .timer-command { min-width: 44px; padding-inline: 8px; }
  .timer-presets, .heat-level-options { display: grid; gap: 4px; direction: ltr; grid-template-columns: repeat(auto-fit,minmax(48px,1fr)); }
  .timer-preset, .heat-level-choice { padding-inline: 3px; }
  .heat-level-options { margin-top: 5px; }
  .heat-level-choice[data-changing] { outline: 1px dashed currentColor; outline-offset: -4px; }
  .modal[data-kind=device] .device[data-treatment=climate] .device-name { display: none; }
`;
