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
  make, button, icon, label, t, request, compactTimer = false, compactClimateControls = false,
  timerPreferenceKey, buildClimateDetail,
  usageInfo, canShowUsage, canResetUsage, resetOptIn, unreportedSwingMode,
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
    const time = make('p', 'timer-clock');
    time.setAttribute('aria-label', t('remaining_time'));
    time.dir = 'ltr';
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
        changing.hidden = pending?.id === levelId || !current.levelChanging;
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
  .modal[data-kind=device] .climate-controls > .climate-selector { flex-basis: 65px; }
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
  @container bayit-climate-rail (min-width: 287px) and (width < 304px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) { display: none; }
  }
  @container bayit-climate-rail (min-width: 304px) and (max-width: 336px) {
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector { gap: 1px; padding-inline: 2px; }
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selection { font-size: 11px; }
    .compact-climate-rail .climate-controls[data-control-count="4"] .climate-selector > ha-icon:not(.climate-selector-chevron) {
      width: 11px; height: 11px; --mdc-icon-size: 11px; color: var(--secondary);
    }
  }
  .climate-extra-controls { min-width: 0; border-top: 1px solid var(--soft-line); }
  .climate-extra-controls > summary { min-height: 44px; padding: 11px 4px; cursor: pointer; }
  .climate-extra-controls > .field-row + .field-row { margin-block-start: 5px; }
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
  .device-timer[data-compact] {
    --timer-rail: color-mix(in srgb,var(--ink) 10%,transparent);
  }
  .device[data-compact-heater] .device-timer,
  .device[data-treatment=boiler] .device-timer[data-compact] { --timer-thumb: var(--warm); }
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
    border: 1px solid var(--line);
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
    border: 1px solid var(--line);
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
  .heat-level-choice[data-changing] { outline: 1px dashed currentColor; outline-offset: -4px; }
  .modal[data-kind=device] .device[data-treatment=climate] .device-name { display: none; }
`;
