import { bindDeviceDetails } from './popup-motion.js';

function clock(seconds, showSeconds, round = Math.ceil) {
  if (!Number.isFinite(seconds)) return '—';
  const whole = Math.max(0, round(seconds));
  const minutes = Math.floor(whole / 60);
  const hours = Math.floor(minutes / 60);
  const pad = value => String(value).padStart(2, '0');
  const minuteText = pad(minutes % 60);
  const secondText = pad(whole % 60);
  if (showSeconds === false) return pad(hours) + ':' + minuteText;
  if (showSeconds === true) return pad(hours) + ':' + minuteText + ':' + secondText;
  return (hours ? hours + ':' : '') + minuteText + ':' + secondText;
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
const namedClimatePresets = new Set(['none', 'eco', 'away', 'boost', 'sleep']);
const swingPosition = /^(fixed|swing)_(upper(?:_middle)?|middle|lower(?:_middle)?)$/;
const horizontalSwingModes = new Set(['default', 'left', 'left_center', 'center', 'right_center', 'right']);

export function climateOptionLabel(action, value, options, t) {
  if (action === 'set_preset_mode') return namedClimatePresets.has(value) ? t('climate_preset_' + value) : value;
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
  make, button, icon, label, t, request, compactTimer = false, compactClimateControls = false,
  timerPreferenceKey, countdownHistory, buildClimateDetail, targetTemperatureInfo,
  historyFor, historyInfo, usageInfo, canShowUsage, canResetUsage, resetOptIn, unreportedSwingMode, canStopTimed,
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
      const hasTargetDetails = compactClimateControls && targetTemperatureInfo;
      const reading = hasTargetDetails ? button('target-reading') : make('div', 'target-reading');
      reading.append(caption, value);
      if (hasTargetDetails) {
        const open = () => targetTemperatureInfo(reading);
        bindDeviceDetails(reading, open);
        reading.setAttribute('aria-description', t('climate_target_hold'));
        // Keep the single-tap affordance on the two temperature adjustment buttons.
        reading.onclick = event => { if (!event.pointerType && event.detail === 0) open(); };
      }
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
        if (hasTargetDetails) {
          reading.disabled = !current.actions.more_info;
          label(reading, t('set_temperature') + ' · ' + value.textContent + ' · ' + t('more_info'));
        }
      });
      row.append(group);
    }
    for (const [id, [glyph, active]] of Object.entries(selectors)) {
      if (!actions[id]?.options) continue;
      used.add(id);
      const field = make('label', 'climate-selector');
      const input = make('select');
      const selection = compactClimateControls ? make('span', 'climate-selection') : null;
      input.dataset.action = id;
      input.setAttribute('aria-label', t(id));
      const unavailable = make('option', '', '—');
      unavailable.value = '';
      unavailable.disabled = true;
      input.append(unavailable);
      const options = actions[id].options;
      const fallback = id === 'set_swing_mode' && options.includes(unreportedSwingMode)
        ? climateOptionLabel(id, unreportedSwingMode, options, t) : undefined;
      unavailable.hidden = fallback !== undefined;
      for (const option of options) {
        const item = make('option', '', climateOptionLabel(id, option, options, t));
        item.value = option;
        input.append(item);
      }
      input.onchange = () => {
        if (options.includes(input.value)) request(id, input.value, input);
      };
      updates.push((current, pending) => {
        const value = pending?.id === id ? pending.value : active(current);
        if (fallback !== undefined) {
          const unreported = value === null || value === undefined;
          const caption = unreported ? fallback : '—';
          if (unavailable.textContent !== caption) unavailable.textContent = caption;
          if (unreported) input.setAttribute('aria-description', t('climate_swing_unreported'));
          else input.removeAttribute('aria-description');
        }
        input.value = options.includes(value) ? value : '';
        input.disabled = !!pending;
        if (selection) {
          const caption = input.selectedOptions[0]?.textContent ?? '—';
          if (selection.textContent !== caption) {
            selection.textContent = caption;
            field.title = caption;
          }
        }
      });
      field.append(icon(glyph));
      if (selection) {
        selection.setAttribute('aria-hidden', 'true');
        const chevron = icon('mdi:chevron-down');
        chevron.classList.add('climate-selector-chevron');
        field.append(selection, chevron);
      }
      field.append(input);
      row.append(field);
    }
    if (row.childElementCount && compactClimateControls) {
      row.dataset.controlCount = row.childElementCount;
      const rail = make('div', 'compact-climate-rail');
      rail.append(row);
      content.push(rail);
    } else if (row.childElementCount) content.push(row);
    const horizontalSwing = 'set_swing_horizontal_mode';
    if (actions[horizontalSwing]) {
      used.add(horizontalSwing);
      const control = buildClimateDetail?.(horizontalSwing);
      if (control) content.push(control);
    }
  }

  const running = ['active', 'paused'].includes(model.timer?.state);
  const duration = running ? actions.extend_timed : actions.start_timed;
  const showStop = !!actions.stop_timed && (running || !duration || model.state === 'on');
  if (model.timer || duration || showStop) {
    for (const id of ['start_timed', 'extend_timed', 'stop_timed']) used.add(id);
    const card = make('section', 'device-timer');
    card.toggleAttribute('data-compact', compactTimer);
    const visibleDuration = value => value + ' ' + t(compactTimer ? 'duration_short' : 'duration');
    const spokenDuration = value => value + ' ' + t('duration');
    card.setAttribute('aria-label', t('timed'));
    const clockRow = make('div', 'timer-clock-row');
    const time = make('p', 'timer-clock');
    time.dir = 'ltr';
    const climate = model.domain === 'climate';
    const timeValue = countdownHistory ? make('span') : time;
    timeValue.setAttribute('aria-label', t('remaining_time'));
    const timeHistory = countdownHistory ? button('timer-clock-history') : undefined;
    const history = button('round-action timer-history', t('timer_history'), 'mdi:history', true);
    history.hidden = true;
    let currentHistory;
    const openHistory = source => { if (currentHistory && !source.disabled) historyInfo(currentHistory, source); };
    history.onclick = () => openHistory(history);
    bindDeviceDetails(history, history.onclick);
    if (timeHistory) {
      timeHistory.hidden = true;
      timeHistory.title = t('timer_history_hold');
      timeHistory.setAttribute('aria-description', t('timer_history_hold'));
      bindDeviceDetails(timeHistory, () => openHistory(timeHistory));
      timeHistory.onclick = event => {
        if (!event.pointerType && event.detail === 0) openHistory(timeHistory);
      };
      time.append(timeValue, timeHistory);
    }
    const readings = make('div', 'timer-clock-readings');
    const watchdog = make('p', 'timer-watchdog');
    watchdog.setAttribute('role', 'status');
    watchdog.hidden = true;
    const today = make('p', 'timer-today');
    const usage = button('timer-today timer-usage');
    usage.setAttribute('aria-haspopup', 'dialog');
    let currentUsage;
    let resetRevision;
    let gestureRevision;
    usage.onclick = () => usageInfo(currentUsage, usage);
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
      const warning = currentTimer?.watchdogMessage ?? '';
      watchdog.hidden = !warning;
      if (watchdog.textContent !== warning) watchdog.textContent = warning;
      const showSeconds = currentTimer?.showSeconds;
      const nativePrecision = showSeconds !== undefined;
      const remaining = currentTimer ? currentTimer.remainingMs : 0;
      const countdown = clock(remaining === null ? null : remaining / 1000, showSeconds, nativePrecision ? Math.round : Math.ceil);
      if (timeValue.textContent !== countdown) timeValue.textContent = countdown;
      currentHistory = historyFor(current);
      history.hidden = !currentHistory;
      if (timeHistory) {
        timeValue.hidden = !!currentHistory;
        timeHistory.hidden = !currentHistory;
        timeHistory.disabled = !!pending;
        if (currentHistory && timeHistory.textContent !== countdown) {
          timeHistory.textContent = countdown;
          timeHistory.setAttribute('aria-label', t('remaining_time') + ' · ' + countdown + ' · ' + t('timer_history'));
        }
      }
      currentUsage = current.usageSource;
      const hasReading = Number.isFinite(currentTimer?.usedSeconds);
      const tappable = hasReading && canShowUsage(currentUsage);
      today.hidden = !hasReading || tappable;
      usage.hidden = !tappable;
      usage.disabled = !tappable || pending?.id === 'reset_daily_usage';
      resetRevision = undefined;
      if (!hasReading) return;
      const reading = t('today_used') + ' ' + clock(currentTimer.usedSeconds, showSeconds, nativePrecision ? Math.floor : Math.ceil);
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
    readings.append(time, today, usage);
    clockRow.append(readings, history);
    card.append(clockRow, watchdog);
    const tools = make('div', 'timer-tools');
    let input;
    if (duration) {
      const id = duration.id;
      input = make('input', 'timer-range');
      input.type = 'range';
      input.min = duration.idleZero ? 0 : duration.min;
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
      const go = button('control-button timer-command', t(id), running ? 'mdi:plus' : 'mdi:play', true);
      const noDuration = () => duration.idleZero === true && input.valueAsNumber === 0;
      const showDuration = () => {
        const unselected = noDuration();
        amount.textContent = visibleDuration(input.value);
        if (compactTimer || duration.idleZero) {
          input.setAttribute('aria-valuetext', unselected ? t('timer_no_duration') : spokenDuration(input.value));
        }
        if (duration.idleZero) go.disabled = input.disabled || unselected;
      };
      input.oninput = () => {
        showDuration();
        if (timerPreferenceKey) {
          try { localStorage.setItem(timerPreferenceKey, input.value); } catch {}
        }
      };
      showDuration();
      go.onclick = () => {
        if (!noDuration()) request(id, input.valueAsNumber, go, { timerStartViaSlider: id === 'start_timed' });
      };
      go.dataset.action = id;
      buttons.push(go);
      tools.append(input, amount, go);
      updates.push((_, pending) => {
        input.disabled = !!pending;
        if (noDuration()) go.disabled = true;
      });
    }
    if (showStop) {
      const stop = button('control-button timer-command', t('stop_timed'), 'mdi:stop', true);
      stop.onclick = () => request('stop_timed', undefined, stop);
      stop.dataset.action = 'stop_timed';
      updates.push(current => { stop.disabled = !canStopTimed(current); });
      tools.append(stop);
    }
    if (tools.childElementCount) card.append(tools);
    if (duration) {
      const list = make('div', 'timer-presets');
      const prefix = duration.id === 'extend_timed' ? '+' : '';
      for (const minutes of timerPresets(duration)) {
        const choice = button('control-button timer-preset', prefix + visibleDuration(minutes));
        label(choice, t(duration.id) + ' · ' + spokenDuration(minutes));
        choice.dataset.action = duration.id;
        choice.onclick = () => request(duration.id, minutes, choice);
        if (running) updates.push(current => {
          const matches = Math.abs(current.timer?.presetDuration - minutes) < .001;
          choice.toggleAttribute('data-current-duration', matches);
          if (matches) choice.setAttribute('aria-description', t('timer_reported_duration'));
          else choice.removeAttribute('aria-description');
        });
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
      updates.push((current, pending, retainedLevel) => {
        changing.hidden = pending?.id === levelId || (!current.levelChanging && !retainedLevel);
      });
      const choices = make('div', 'heat-level-options');
      for (let i = 0; i < count; i++) {
        const value = Number((level.min + i * level.step).toFixed(8));
        const choice = button('control-button heat-level-choice', String(value));
        label(choice, t(levelId) + ' ' + value);
        choice.dataset.action = levelId;
        choice.onclick = () => request(levelId, value, choice);
        buttons.push(choice);
        updates.push((current, pending, retainedLevel) => {
          const selection = pending?.id === levelId ? pending : retainedLevel;
          const selected = selection?.value ?? current.level;
          choice.disabled = !!pending || !current.actions[levelId];
          choice.setAttribute('aria-pressed', String(selected === value));
          choice.toggleAttribute('data-changing', !!selection && selected === value);
        });
        choices.append(choice);
      }
      section.append(caption, choices, changing);
      content.push(section);
    }
  }
  return {
    used, content,
    update(current, pending, retainedLevel) {
      for (const item of buttons) item.disabled = !!pending;
      for (const sync of updates) sync(current, pending, retainedLevel);
    },
  };
}

export const panelControlStyles = `
  .climate-controls { display: flex; gap: 5px; flex-wrap: wrap; direction: ltr; }
  .climate-controls > * { flex: 1 1 76px; min-width: 0; }
  .climate-controls > .temperature-stepper { flex-basis: 90px; }
  .modal[data-kind=device] .climate-controls > .climate-selector { flex-basis: 65px; }
  .temperature-stepper, .climate-selector {
    display: flex; align-items: center; justify-content: space-between; gap: 3px;
    border: 1px solid var(--soft-line); border-radius: 10px; background: var(--control);
  }
  .target-reading { text-align: center; line-height: 1.08; }
  .temperature-stepper > button.target-reading {
    display: grid; align-content: center; align-self: stretch; min-height: 44px;
    padding: 0; border: 0; background: transparent; color: inherit;
  }
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
  .compact-climate-rail { container: bayit-climate-rail / inline-size; min-width: 0; }
  .compact-climate-rail .climate-controls {
    display: grid;
    grid-template-columns: repeat(2,minmax(0,1fr));
    --climate-first-column: minmax(58px,1fr);
  }
  .compact-climate-rail .climate-controls:has(> .temperature-stepper) { --climate-first-column: minmax(min-content,1.18fr); }
  .compact-climate-rail .climate-controls[data-control-count="1"] { grid-template-columns: minmax(0,1fr); }
  .compact-climate-rail .temperature-stepper { gap: 0; }
  .compact-climate-rail .step-control { min-width: 27px; }
  .compact-climate-rail .target-reading { flex: 0 0 auto; }
  .compact-climate-rail .target-value { font-size: 15px; white-space: nowrap; }
  .compact-climate-rail .climate-selector {
    position: relative; display: grid; grid-template-columns: auto minmax(0,1fr) auto;
    min-block-size: 46px; gap: 2px; padding-inline: 4px;
  }
  .compact-climate-rail .climate-selector:has(select:focus-visible) { outline: 2px solid #d3f1ff; outline-offset: 2px; }
  .compact-climate-rail .climate-selector:has(select:disabled) { opacity: .62; }
  .compact-climate-rail .climate-selector > select { position: absolute; inset: 0; height: 100%; opacity: 0; }
  .climate-selection {
    grid-column: 2; min-inline-size: 0; text-align: center; font-size: 12px; font-weight: 730;
    line-height: 1.1; overflow-wrap: anywhere; unicode-bidi: plaintext;
  }
  .climate-selector > .climate-selector-chevron {
    grid-column: 3; width: 11px; height: 11px; --mdc-icon-size: 11px;
  }
  @container bayit-climate-rail (min-width: 224px) {
    .compact-climate-rail .climate-controls[data-control-count="3"] {
      grid-template-columns: var(--climate-first-column) repeat(2,minmax(52px,1fr));
    }
  }
  @container bayit-climate-rail (min-width: 287px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] {
      grid-template-columns: var(--climate-first-column) repeat(3,minmax(52px,1fr));
    }
  }
  @container bayit-climate-rail (min-width: 224px) and (max-width: 270px) {
    .compact-climate-rail .climate-controls[data-control-count="3"] .climate-selector > ha-icon:not(.climate-selector-chevron) { display: none; }
  }
  @container bayit-climate-rail (min-width: 287px) and (width < 298px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) { display: none; }
  }
  @container bayit-climate-rail (min-width: 298px) and (max-width: 336px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector { gap: 1px; padding-inline: 2px; }
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selection { font-size: 11px; }
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) {
      width: 11px; height: 11px; --mdc-icon-size: 11px; color: var(--secondary);
    }
  }
  @container bayit-climate-rail (min-width: 298px) and (width < 304px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] { gap: 4px; }
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector { gap: 0; padding-inline: 1px; }
  }
  .modal[data-standalone-climate] .compact-climate-rail .step-control { flex: 0 0 44px; min-width: 44px; }
  /* WebKit can let the invisible native select text overflow the bounded visual caption. */
  .modal[data-standalone-climate] .compact-climate-rail .climate-selector { overflow: clip; }
  @container bayit-climate-rail (width < 295px) {
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] {
      grid-template-columns: var(--climate-first-column) minmax(46px,1fr);
    }
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) {
      display: inline-grid;
    }
  }
  @container bayit-climate-rail (min-width: 295px) and (width < 317px) {
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] {
      /* Keep both 44px temperature buttons and room for the widest normal setpoint. */
      grid-template-columns: var(--climate-first-column) repeat(3,minmax(46px,1fr)); gap: 4px;
    }
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) {
      display: none;
    }
  }
  @container bayit-climate-rail (min-width: 295px) and (max-width: 336px) {
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] .climate-selector { gap: 0; padding-inline: 1px; }
    .modal[data-standalone-climate] .climate-controls[data-control-count="4"] .climate-selector-chevron {
      width: 9px; height: 9px; --mdc-icon-size: 9px;
    }
  }
  .climate-extra-controls { min-width: 0; border-top: 1px solid var(--soft-line); }
  .climate-extra-controls > summary { min-height: 44px; padding: 11px 4px; cursor: pointer; }
  .climate-extra-controls > .field-row + .field-row { margin-block-start: 5px; }
  .device-timer, .heat-level { min-width: 0; text-align: center; border-top: 1px solid var(--soft-line); padding-top: 6px; }
  .timer-watchdog {
    margin: 5px 0; padding: 5px 8px; border: 1px solid var(--soft-line); border-radius: 8px;
    border-inline-start-color: var(--boiler-heat); color: var(--ink);
    text-align: start; font-size: .78rem; line-height: 1.35; overflow-wrap: anywhere;
  }
  .timer-clock { margin: 1px 0 0; font-size: 18px; font-weight: 780; font-variant-numeric: tabular-nums; }
  .timer-clock-history {
    display: block; min-inline-size: 44px; min-block-size: 24px; margin-inline: auto; padding: 0 4px;
    border: 0; border-radius: 6px; background: transparent; line-height: inherit;
    -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
  }
  .timer-clock-history:disabled { opacity: 1; }
  /* Keep baseline differences from adding height below the two timer readings. */
  .device-timer[data-compact] .timer-clock-readings:has(.timer-clock-history:not([hidden])) {
    display: grid; justify-items: center;
  }
  .device-timer[data-compact] .timer-clock:has(.timer-clock-history:not([hidden])) { margin-block-start: 0; }
  .timer-clock-row:has(.timer-history:not([hidden])) {
    display: grid; grid-template-columns: 44px minmax(0,1fr) 44px; align-items: center;
  }
  .timer-clock-row:has(.timer-history:not([hidden])) .timer-clock-readings { grid-column: 2; }
  .timer-history { grid-column: 3; justify-self: end; }
  .timer-today, .heat-level-title { margin: 0; font-size: 12px; font-weight: 740; color: var(--secondary); }
  .timer-usage {
    min-height: 32px; padding: 0 7px; background: transparent; border: 0; border-radius: 8px;
    text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px;
  }
  .timer-tools { display: flex; align-items: center; justify-content: center; gap: 8px; margin-block: 2px 5px; direction: ltr; }
  .timer-range { flex: 1; width: 0; min-width: 50px; min-height: 44px; margin: 0;
    direction: ltr; accent-color: var(--timer-thumb,var(--moving)); }
  .timer-amount { white-space: nowrap; font-size: 12px; }
  .timer-command { min-width: 44px; padding-inline: 8px; }
  .timer-presets, .heat-level-options { display: grid; gap: 4px; direction: ltr; }
  .timer-presets { grid-template-columns: repeat(auto-fit,minmax(48px,1fr)); }
  .timer-preset { padding-inline: 3px; }
  .timer-preset[data-current-duration] {
    box-shadow: inset 0 0 0 1px var(--timer-thumb, var(--moving));
  }
  .device-timer[data-compact]:has(.timer-clock-history) .timer-preset { line-height: 1.2; }
  .device-timer[data-compact] {
    --timer-rail: color-mix(in srgb,var(--ink) 10%,transparent);
  }
  .device[data-inline-climate] > .action-list:has(.compact-climate-rail) {
    container: bayit-inline-climate / inline-size;
  }
  @container bayit-inline-climate (min-width: 280px) {
    .device-timer[data-compact]:has(.timer-usage:not([hidden])) { padding-block-start: 3px; }
    .device-timer[data-compact] .timer-clock-readings:has(.timer-usage:not([hidden])) {
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .device-timer[data-compact]:has(.timer-usage:not([hidden])) .timer-tools { margin-block: 1px 3px; }
  }
  :where(.device[data-treatment=boiler],.device[data-compact-heater]) .device-timer[data-compact] {
    --timer-thumb: var(--boiler-heat);
    --timer-thumb-border: #20100a;
  }
  :where(.device[data-inline-climate],.modal[data-standalone-climate] .device) .device-timer[data-compact] {
    --timer-thumb: #7aa7ff;
    --timer-thumb-border: #172849;
    --timer-rail: color-mix(in srgb,var(--ink) 8%,transparent);
  }
  :where(.device[data-inline-climate]) .device-timer[data-compact] { --timer-thumb: #a4c8ff; }
  :where(.modal[data-wallpaper-ink=dark] .device[data-inline-climate]) .device-timer[data-compact] { --timer-thumb: var(--moving); }
  .device[data-treatment=boiler] .device-timer[data-compact] .timer-command[data-action=stop_timed] {
    background: color-mix(in srgb,var(--boiler-heat) 22%,transparent);
    border-color: color-mix(in srgb,var(--boiler-heat) 48%,transparent);
  }
  @media (prefers-contrast: more) {
    .device .device-timer[data-compact] {
      --timer-rail: color-mix(in srgb,var(--ink) 42%,transparent);
    }
  }
  @media (forced-colors: active) {
    .device .device-timer[data-compact] {
      --timer-thumb: Highlight;
      --timer-thumb-border: Canvas;
      --timer-rail: CanvasText;
    }
    .device .device-timer[data-compact] .timer-range { forced-color-adjust: none; }
    .device .device-timer[data-compact] .timer-range:focus-visible { outline-color: Highlight; }
  }
  .device-timer[data-compact] .timer-clock { line-height: 1.2; }
  .device-timer[data-compact] .timer-range {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .device-timer[data-compact] .timer-range::-webkit-slider-runnable-track {
    height: 8px;
    background: var(--timer-rail);
    border-radius: 999px;
  }
  .device-timer[data-compact] .timer-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    margin-top: -5px;
    background: var(--timer-thumb,var(--moving));
    border: 1px solid var(--timer-thumb-border,var(--line));
    border-radius: 50%;
  }
  .device-timer[data-compact] .timer-range::-moz-range-track {
    height: 8px;
    background: var(--timer-rail);
    border-radius: 999px;
  }
  .device-timer[data-compact] .timer-range::-moz-range-progress { background: transparent; }
  .device-timer[data-compact] .timer-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: var(--timer-thumb,var(--moving));
    border: 1px solid var(--timer-thumb-border,var(--line));
    border-radius: 50%;
  }
  .device-timer[data-compact] :is(.timer-command,.timer-preset) {
    isolation: isolate;
    position: relative;
    border: 0;
    background: transparent;
  }
  .device-timer[data-compact] :is(.timer-command,.timer-preset)::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: 6px 0;
    background: var(--control);
    border: 1px solid var(--soft-line);
    border-radius: inherit;
    pointer-events: none;
  }
  .device-timer[data-compact] :is(.timer-command,.timer-preset):hover::before {
    background: color-mix(in srgb,var(--ink) 10%,var(--control));
  }
  .modal[data-kind=device] .modal-body:has(.device-timer[data-compact]) { padding-block-end: 9px; }
  :is(.modal[data-kind=device] .device, .devices[data-room=true] .device[data-compact-heater]):has(.device-timer[data-compact]) {
    padding-block: 6px;
    .action-list { margin-block-start: 4px; gap: 5px; }
    .device-timer[data-compact] {
      padding-top: 4px;
      .timer-tools { margin-block: 0 2px; }
    }
  }
  .modal[data-standalone-heater] .device[data-compact-heater]:has(.device-timer[data-compact]) {
    padding: 0; border: 0;
    .device-timer[data-compact] .timer-tools { margin-block-end: 0; }
  }
  .modal[data-standalone-heater] .device[data-compact-heater] .action-list { margin-block-start: 0; }
  .modal[data-standalone-heater] .device[data-compact-heater] .device-timer[data-compact] {
    padding-top: 0; border-top: 0;
  }
  .modal[data-standalone-climate] .device { padding: 3px 0 0; border: 0; }
  .modal[data-standalone-climate] .action-list { margin-block-start: 0; }
  .modal:is([data-standalone-heater],[data-standalone-climate]) .timer-usage { min-height: 44px; }
  .modal[data-standalone-climate] .climate-extra-controls > summary { color: var(--secondary); font-size: 13px; }
  .heat-level-options {
    margin-top: 5px;
    grid-template-columns: repeat(auto-fit,minmax(25px,1fr));
    /* Fit nine targets before widening the gutters. */
    column-gap: clamp(1px,calc((100% - 233px) / 8),4px);
  }
  .heat-level-options > .heat-level-choice { min-width: 25px; padding-inline: 1px; font-variant-numeric: tabular-nums; }
  .device[data-compact-heater] .heat-level-options {
    grid-template-columns: repeat(auto-fit,minmax(44px,1fr));
    column-gap: 4px;
  }
  @media (max-width: 480px) {
    .device[data-compact-heater] .heat-level-options {
      /* Five columns use four 4px gaps. Narrower panels wrap before shrinking a target. */
      grid-template-columns: repeat(auto-fit,minmax(max(44px,calc((100% - 16px) / 5)),1fr));
    }
  }
  .heat-level-choice[aria-pressed=true] { background: color-mix(in srgb,var(--warm) 16%,var(--control)); }
  .modal[data-standalone-heater] .heat-level { padding-block-start: 3px; }
  .modal[data-standalone-heater] .heat-level-options { margin-block-start: 3px; }
  .modal[data-standalone-heater] .heat-level-choice { border-radius: 8px; }
  .modal[data-standalone-heater] .heat-level-choice[aria-pressed=true] {
    background: color-mix(in srgb,var(--boiler-heat) 22%,var(--control));
    border-color: color-mix(in srgb,var(--boiler-heat) 45%,transparent);
  }
  @media (forced-colors: active) {
    .modal[data-standalone-heater] .heat-level-choice[aria-pressed=true]:not([data-changing]) {
      outline: 2px solid Highlight; outline-offset: -4px;
    }
  }
  .heat-level-choice[data-changing] { outline: 1px dashed currentColor; outline-offset: -4px; }
  .modal[data-kind=device] .device[data-treatment=climate] .device-name { display: none; }
`;
