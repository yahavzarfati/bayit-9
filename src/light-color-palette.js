import { lightColorFromHueSaturation, lightColorHex, lightHueSaturation } from './light-color.mjs';

const action = 'set_light_color';
const colors = [
  ['sky', '#00aaff'], ['turquoise', '#00d7ca'], ['green', '#00e64d'],
  ['yellow', '#ffdb00'], ['orange', '#ff6900'], ['red', '#ff0000'],
  ['white', '#ffffff'], ['lavender', '#ba92ff'], ['peach', '#ffa47a'],
  ['pink', '#ff188e'], ['purple', '#922dff'], ['blue', '#283eff'],
];

export function createLightColorPalette({ make, button, label, t, request }) {
  const element = make('div', 'light-color-palette');
  const preview = make('span', 'light-color-preview');
  preview.setAttribute('role', 'img');
  const range = (channel, max, unit) => {
    const line = make('label', 'light-color-channel');
    const caption = make('span', '', t('light_' + channel));
    const input = make('input', 'light-color-range');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.dataset.action = action;
    input.dataset.colorChannel = channel;
    input.setAttribute('aria-label', caption.textContent);
    const output = make('output', 'light-color-reading');
    output.setAttribute('aria-hidden', 'true');
    line.append(caption, output, input);
    element.append(line);
    return { input, output, unit };
  };
  const hue = range('hue', 360, '°');
  const saturation = range('saturation', 100, '%');
  element.firstElementChild.append(preview);
  const swatches = make('div', 'light-color-swatches');
  swatches.setAttribute('role', 'group');
  swatches.setAttribute('aria-label', t('light_quick_colors'));
  const options = colors.map(([name, color]) => {
    const swatch = button('control-button light-color-swatch');
    label(swatch, t('light_set_swatch').replace('{color}', t('light_swatch_' + name)));
    swatch.dataset.action = action;
    swatch.style.setProperty('--light-swatch', color);
    swatch.onclick = () => {
      if (canEdit(swatch)) request(color, swatch);
    };
    swatches.append(swatch);
    return { swatch, preset: lightHueSaturation(color) };
  });
  element.append(swatches);

  let report;
  let pendingColor;
  let displayed;
  let draft;
  let hueForWhite = 0;

  function canEdit(control) {
    return !control.disabled && element.isConnected &&
      !element.closest('[hidden],dialog:not([open]),dialog[data-closing]');
  }

  function paint(showPreview, exactColor) {
    const hueValue = hue.input.valueAsNumber;
    displayed = lightColorFromHueSaturation(hueValue, saturation.input.valueAsNumber);
    for (const { input, output, unit } of [hue, saturation]) {
      const reading = input.value + unit;
      if (output.textContent !== reading) output.textContent = reading;
      if (input.getAttribute('aria-valuetext') !== reading) input.setAttribute('aria-valuetext', reading);
    }
    saturation.input.style.setProperty('--light-color-end', lightColorFromHueSaturation(hueValue, 100));
    preview.hidden = !showPreview;
    if (showPreview) {
      const sample = exactColor || displayed;
      preview.style.setProperty('--light-swatch', sample);
      preview.setAttribute('aria-label', t('light_color_preview') + ' ' + sample);
    }
  }

  function restore() {
    const observed = lightHueSaturation(report);
    const selection = lightHueSaturation(pendingColor) || observed;
    if (observed?.saturation) hueForWhite = observed.hue;
    hue.input.value = String(selection?.saturation ? selection.hue : hueForWhite);
    saturation.input.value = String(selection?.saturation ?? 100);
    paint(Boolean(selection), pendingColor || report);
  }

  function cancel() {
    if (!draft) return;
    draft = undefined;
    restore();
  }

  for (const { input } of [hue, saturation]) {
    input.oninput = () => {
      if (!canEdit(input)) return;
      if (draft?.input !== input) draft = { input, before: displayed };
      paint(true);
    };
    input.onchange = () => {
      if (draft?.input !== input) return;
      const value = displayed;
      const changed = value !== draft.before;
      if (!changed && saturation.input.valueAsNumber === 0) hueForWhite = hue.input.valueAsNumber;
      draft = undefined;
      restore();
      if (changed && canEdit(input)) request(value, input);
    };
    const cancelInput = () => { if (draft?.input === input) cancel(); };
    input.onpointercancel = cancelInput;
    input.onblur = cancelInput;
  }

  return {
    element,
    cancel,
    update(model, pending) {
      const nextReport = model.state === 'on' ? lightColorHex(model.attributes) : null;
      const nextPending = pending?.id === action ? pending.value : null;
      const cancelled = !!pending && !!draft;
      if (!cancelled && report === nextReport && pendingColor === nextPending) return;
      report = nextReport;
      pendingColor = nextPending;
      if (cancelled) draft = undefined;
      if (!draft) restore();
      const selection = report && lightHueSaturation(report);
      for (const { swatch, preset } of options) {
        const selected = String(Boolean(selection && selection.saturation === preset.saturation &&
          (selection.saturation === 0 || selection.hue === preset.hue)));
        if (swatch.getAttribute('aria-pressed') !== selected) swatch.setAttribute('aria-pressed', selected);
      }
    },
  };
}

export const lightColorPaletteStyles = `
  .light-color-palette { display: grid; gap: 4px; min-width: 0; }
  .light-color-channel {
    display: grid; grid-template-columns: minmax(0,1fr) auto 20px; align-items: center;
    gap: 0 7px; font-size: 12px; font-weight: 700; color: var(--secondary);
  }
  .light-color-channel:not(:has(.light-color-preview:not([hidden]))) { grid-template-columns: minmax(0,1fr) auto; }
  .light-color-reading { direction: ltr; font-variant-numeric: tabular-nums; }
  .light-color-preview {
    justify-self: center; width: 17px; height: 17px; border-radius: 5px;
    border: 1px solid var(--line); background: var(--light-swatch);
  }
  .light-color-range {
    grid-column: 1 / -1; width: 100%; height: 44px; min-width: 0; margin: 0;
    appearance: none; -webkit-appearance: none; background: transparent; direction: ltr;
  }
  .light-color-range[data-color-channel=hue] {
    --light-color-track: linear-gradient(90deg,red,yellow,lime,cyan,blue,magenta,red);
  }
  .light-color-range[data-color-channel=saturation] {
    --light-color-track: linear-gradient(90deg,#fff,var(--light-color-end,red));
  }
  .light-color-range::-webkit-slider-runnable-track { height: 10px; border-radius: 7px; background: var(--light-color-track); }
  .light-color-range::-moz-range-track { height: 10px; border-radius: 7px; background: var(--light-color-track); }
  .light-color-range::-webkit-slider-thumb {
    appearance: none; -webkit-appearance: none; width: 21px; height: 21px; margin-top: -5.5px;
    border: 2px solid #282828; border-radius: 50%; background: #fff;
  }
  .light-color-range::-moz-range-thumb { width: 17px; height: 17px; border: 2px solid #282828; border-radius: 50%; background: #fff; }
  .light-color-swatches {
    display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,max(44px,calc((100% - 20px) / 6))),1fr));
    gap: 4px; direction: ltr;
  }
  .light-color-swatch { padding: 5px; border-radius: 10px; }
  .light-color-swatch::before {
    content: ''; width: 21px; height: 21px; border-radius: 50%; background: var(--light-swatch);
    border: 1px solid var(--soft-line);
  }
  .light-color-swatch[aria-pressed=true] { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
  @media (forced-colors: active) {
    .light-color-range {
      --light-color-track: CanvasText; appearance: auto; -webkit-appearance: auto;
    }
    .light-color-swatch::before, .light-color-preview { forced-color-adjust: none; border-color: CanvasText; }
  }
`;
