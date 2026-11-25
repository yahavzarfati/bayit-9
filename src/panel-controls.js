import { bindDeviceDetails } from './popup-motion.js';

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

const namedFanModes = new Set(['sleep', 'quiet', 'health', 'natural', 'strong', 'medium low', 'medium high']);
const swingPosition = /^(fixed|swing)_(upper(?:_middle)?|middle|lower(?:_middle)?)$/;
const horizontalSwingModes = new Set(['default', 'left', 'left_center', 'center', 'right_center', 'right']);

export function climateOptionLabel(action, value, options, t) {
  if (action === 'set_fan_mode' && namedFanModes.has(value)) return t('climate_fan_' + value.replace(' ', '_'));
  if (action === 'set_swing_mode') {
    if (value === 'full_swing') return t('climate_swing_full');
    if (value === 'default' && options.includes('full_swing') && options.includes('fixed_upper_middle')) {
      return t('climate_swing_disabled');
    }
    const position = swingPosition.exec(value);
    if (position) {
      const movement = t(position[1] === 'fixed' ? 'climate_swing_fixed' : 'set_swing_mode');
      return movement + ' – ' + t('climate_position_' + position[2]);
    }
  }
  if (action === 'set_swing_horizontal_mode') {
    if (value === 'full_swing') return t('climate_swing_full');
    if (horizontalSwingModes.has(value)) return t('climate_horizontal_' + value);
  }
  return t(value);
}

export function buildPanelControls(model, {
  make, button, icon, label, t, request, compactTimer = false, timerPreferenceKey, buildClimateDetail,
  usageInfo, canShowUsage, canResetUsage, resetOptIn,
}) {
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
      const options = actions[id].options;
      for (const option of options) {
        const item = make('option', '', climateOptionLabel(id, option, options, t));
        item.value = option;
        input.append(item);
      }
      input.onchange = () => request(id, input.value, input);
      updates.push((current, pending) => {
        const value = pending?.id === id ? pending.value : active(current);
        input.value = options.includes(value) ? value : '';
        input.disabled = !!pending;
      });
      field.append(icon(glyph), input);
      row.append(field);
    }
    if (row.childElementCount) content.push(row);
    const horizontalSwing = 'set_swing_horizontal_mode';
    if (actions[horizontalSwing]) {
      used.add(horizontalSwing);
      if (buildClimateDetail) content.push(buildClimateDetail(horizontalSwing));
    }
  }

  const running = ['active', 'paused'].includes(model.timer?.state);
  const duration = running ? actions.extend_timed : actions.start_timed;
  const showStop = !!actions.stop_timed && (running || !duration || model.state === 'on');
  if (model.timer || duration || showStop) {
    for (const id of ['start_timed', 'extend_timed', 'stop_timed']) used.add(id);
    const card = make('section', 'device-timer');
    const visibleDuration = value => value + ' ' + t(compactTimer ? 'duration_short' : 'duration');
    const spokenDuration = value => value + ' ' + t('duration');
    card.setAttribute('aria-label', t('timed'));
    const time = make('p', 'timer-clock');
    time.setAttribute('aria-label', t('remaining_time'));
    time.dir = 'ltr';
    const today = make('p', 'timer-today');
    const usage = button('timer-today timer-usage');
    usage.setAttribute('aria-haspopup', 'dialog');
    let currentUsage;
    let resetRevision;
    let gestureRevision;
    usage.onclick = () => usageInfo(currentUsage);
    if (resetOptIn) {
      const capture = () => { gestureRevision = resetRevision; };
      usage.addEventListener('pointerdown', capture);
      usage.addEventListener('keydown', capture);
      bindDeviceDetails(usage, () => {
        if (gestureRevision && gestureRevision === resetRevision && canResetUsage(currentUsage)) {
          request('reset_daily_usage', gestureRevision, usage);
        }
      });
    }
    updates.push((current, pending) => {
      const currentTimer = current.timer;
      time.textContent = currentTimer ? clock(currentTimer.remainingMs === null ? null : currentTimer.remainingMs / 1000) : '00:00';
      currentUsage = current.usageSource;
      const hasReading = Number.isFinite(currentTimer?.usedSeconds);
      const tappable = hasReading && canShowUsage(currentUsage);
      today.hidden = !hasReading || tappable;
      usage.hidden = !tappable;
      usage.disabled = !tappable || pending?.id === 'reset_daily_usage';
      resetRevision = undefined;
      if (!hasReading) return;
      const reading = t('today_used') + ' ' + clock(currentTimer.usedSeconds);
      if (tappable) {
        if (usage.textContent !== reading) usage.textContent = reading;
        label(usage, reading + ' · ' + t('more_info'));
      } else if (today.textContent !== reading) today.textContent = reading;
      resetRevision = tappable && canResetUsage(currentUsage) ? current.actions.reset_daily_usage?.usageRevision : undefined;
      if (resetRevision) {
        usage.setAttribute('aria-keyshortcuts', 'Shift+Enter Shift+Space Shift+F10 ContextMenu');
        usage.setAttribute('aria-description', t('timer_reset_hint'));
        usage.title = t('timer_reset_hint');
      } else {
        usage.removeAttribute('aria-keyshortcuts');
        usage.removeAttribute('aria-description');
        usage.title = t('more_info');
      }
    });
    card.append(time, today, usage);
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
      if (timerPreferenceKey) {
        try {
          const saved = localStorage.getItem(timerPreferenceKey);
          if (saved && /^\d+$/.test(saved) && Number.isSafeInteger(Number(saved))) input.value = saved;
        } catch { /* Timer actions remain available when browser storage is blocked. */ }
      }
      input.setAttribute('aria-label', t('duration'));
      const amount = make('output', 'timer-amount');
      const showDuration = () => {
        amount.textContent = visibleDuration(input.value);
        if (compactTimer) input.setAttribute('aria-valuetext', spokenDuration(input.value));
      };
      input.oninput = () => {
        showDuration();
        if (timerPreferenceKey) {
          try { localStorage.setItem(timerPreferenceKey, input.value); } catch {}
        }
      };
      showDuration();
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
        const choice = button('control-button timer-preset', visibleDuration(minutes));
        label(choice, t(duration.id) + ' · ' + spokenDuration(minutes));
        choice.dataset.action = duration.id;
        choice.onclick = () => request(duration.id, minutes, choice);
        buttons.push(choice);
        list.append(choice);
      }
      if (list.childElementCount) card.append(list);
    }
    content.push(card);
  }

  const levelId = model.levelAction ?? 'set_heating_level';
  const level = actions[levelId] ?? model.levelRange;
  if (level) {
    const count = Math.floor((level.max - level.min) / level.step) + 1;
    if (count >= 2 && count <= 12) {
      used.add(levelId);
      const section = make('section', 'heat-level');
      const caption = make('p', 'heat-level-title', t(levelId));
      const changing = make('p', 'heat-level-title', t('heating_level_changing'));
      changing.hidden = true;
      changing.setAttribute('role', 'status');
      updates.push((current, pending) => {
        changing.hidden = levelId !== 'set_heating_level' || pending?.id === levelId || !current.levelChanging;
      });
      const choices = make('div', 'heat-level-options');
      for (let i = 0; i < count; i++) {
        const value = Number((level.min + i * level.step).toFixed(8));
        const choice = button('control-button heat-level-choice', String(value));
        label(choice, t(levelId) + ' ' + value);
        choice.dataset.action = levelId;
        choice.onclick = () => request(levelId, value, choice);
        buttons.push(choice);
        updates.push((current, pending) => {
          const selected = pending?.id === levelId ? pending.value : current.level;
          choice.disabled = !!pending || !current.actions[levelId];
          choice.setAttribute('aria-pressed', String(selected === value));
          choice.toggleAttribute('data-changing', pending?.id === levelId && selected === value);
        });
        choices.append(choice);
      }
      section.append(caption, choices, changing);
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
  .timer-usage {
    min-height: 32px; padding: 0 7px; background: transparent; border: 0; border-radius: 8px;
    text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px;
  }
  .timer-tools { display: flex; align-items: center; justify-content: center; gap: 8px; margin-block: 2px 5px; direction: ltr; }
  .timer-range { flex: 1; width: 0; min-width: 50px; min-height: 44px; margin: 0;
    direction: ltr; accent-color: var(--moving); }
  .timer-amount { white-space: nowrap; font-size: 12px; }
  .timer-command { min-width: 44px; padding-inline: 8px; }
  .timer-presets, .heat-level-options { display: grid; gap: 4px; direction: ltr; }
  .timer-presets { grid-template-columns: repeat(auto-fit,minmax(48px,1fr)); }
  .timer-preset { padding-inline: 3px; }
  .device[data-inline-climate] .device-timer {
    --timer-rail: color-mix(in srgb,var(--ink) 10%,transparent);
  }
  .device[data-inline-climate] .timer-clock { line-height: 1.2; }
  .device[data-inline-climate] .timer-range {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .device[data-inline-climate] .timer-range::-webkit-slider-runnable-track {
    height: 8px;
    background: var(--timer-rail);
    border-radius: 999px;
  }
  .device[data-inline-climate] .timer-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -5px;
    background: var(--moving);
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .device[data-inline-climate] .timer-range::-moz-range-track {
    height: 8px;
    background: var(--timer-rail);
    border-radius: 999px;
  }
  .device[data-inline-climate] .timer-range::-moz-range-progress { background: transparent; }
  .device[data-inline-climate] .timer-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--moving);
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .device[data-inline-climate] :is(.timer-command,.timer-preset) {
    isolation: isolate;
    position: relative;
    border: 0;
    background: transparent;
  }
  .device[data-inline-climate] :is(.timer-command,.timer-preset)::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 6px 0;
    background: var(--control);
    border: 1px solid var(--soft-line);
    border-radius: inherit;
    pointer-events: none;
  }
  .device[data-inline-climate] :is(.timer-command,.timer-preset):hover::before {
    background: color-mix(in srgb,var(--ink) 10%,var(--control));
  }
  .heat-level-options {
    margin-top: 5px;
    grid-template-columns: repeat(auto-fit,minmax(25px,1fr));
    /* Fit nine targets before widening the gutters. */
    column-gap: clamp(1px,calc((100% - 233px) / 8),4px);
  }
  .heat-level-options > .heat-level-choice { min-width: 25px; padding-inline: 1px; font-variant-numeric: tabular-nums; }
  .heat-level-choice[aria-pressed=true] { background: color-mix(in srgb,var(--warm) 16%,var(--control)); }
  .heat-level-choice[data-changing] { outline: 1px dashed currentColor; outline-offset: -4px; }
  .modal[data-kind=device] .device[data-treatment=climate] .device-name { display: none; }
`;
