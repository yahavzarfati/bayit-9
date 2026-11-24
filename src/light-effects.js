const iconPattern = /^mdi:[a-z0-9-]+$/;
const effectAction = 'set_effect';
const pageSize = 6;
const lightModes = [
  [effectAction, 'light_mode_effects'],
  ['set_light_color', 'light_mode_color'],
  ['set_color_temp_kelvin', 'light_mode_white'],
];

export function normalizeLightEffectGroups(groups) {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap(group => {
    const title = typeof group?.title === 'string' ? group.title.trim().slice(0, 80) : '';
    if (!title || !Array.isArray(group.effects)) return [];
    const seen = new Set();
    const effects = group.effects.flatMap(item => {
      const effect = typeof item === 'string' ? item : item?.effect;
      if (typeof effect !== 'string' || !effect.trim() || seen.has(effect)) return [];
      seen.add(effect);
      const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 120) : '';
      const icon = typeof item?.icon === 'string' && iconPattern.test(item.icon) ? item.icon : '';
      return [{ effect, ...(name && { name }), ...(icon && { icon }) }];
    });
    return effects.length ? [{ title, effects }] : [];
  });
}

export function createLightEffectGallery(groups, advertised, { make, button, icon, t, request }) {
  if (!groups?.length) return null;
  const available = new Set(advertised);
  const assigned = new Set();
  const categories = groups.flatMap(({ title, effects }) => {
    const matches = effects.filter(({ effect }) => available.has(effect));
    for (const { effect } of matches) assigned.add(effect);
    return matches.length ? [{ title, effects: matches }] : [];
  });
  if (!categories.length) return null;
  const remaining = [...available].filter(effect => !assigned.has(effect));
  if (remaining.length) {
    categories.push({ title: t('other_effects'), effects: remaining.map(effect => ({ effect })) });
  }

  const name = t(effectAction);
  const gallery = make('section', 'light-effect-gallery');
  gallery.setAttribute('aria-label', name);
  const caption = make('p', 'light-effect-caption', name);
  const categoryBar = make('div', 'light-effect-categories');
  categoryBar.setAttribute('role', 'group');
  categoryBar.setAttribute('aria-label', t('effect_categories'));
  const choices = make('div', 'light-effect-choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', t('available_effects'));
  const footer = make('div', 'light-effect-footer');
  const status = make('span', 'light-effect-status');
  const apply = button('control-button', t('apply'));
  apply.setAttribute('aria-label', t('apply') + ' · ' + name);
  apply.dataset.action = effectAction;
  footer.append(status, apply);
  const pager = make('div', 'light-effect-pages');
  const previous = button('control-button', t('previous_effect_page'));
  const next = button('control-button', t('next_effect_page'));
  const pageLabel = make('span');
  pageLabel.setAttribute('aria-live', 'polite');
  pager.append(previous, pageLabel, next);
  gallery.append(caption, categoryBar, pager, choices, footer);

  let categoryIndex = 0;
  let pageIndex = 0;
  let draft;
  let current;
  let canRequest = false;
  const displayNames = new Map(categories.flatMap(({ effects }) =>
    effects.filter(({ name }) => name).map(({ effect, name }) => [effect, name])));
  const displayName = effect => displayNames.get(effect) ?? effect;
  let choiceButtons = [];
  const chooseCategory = index => {
    if (categoryIndex === index) return;
    categoryIndex = index;
    pageIndex = 0;
    renderChoices();
  };
  const categorySelect = categories.length > 3 ? make('select', 'control-button') : null;
  const categoryButtons = categorySelect ? [] : categories.map(({ title }, index) => {
    const control = button('control-button', title);
    control.dataset.action = effectAction;
    control.onclick = () => chooseCategory(index);
    return control;
  });
  if (categorySelect) {
    categorySelect.dataset.action = effectAction;
    categorySelect.setAttribute('aria-label', t('effect_categories'));
    for (const [index, { title }] of categories.entries()) {
      const option = make('option', '', title);
      option.value = String(index);
      categorySelect.append(option);
    }
    categorySelect.onchange = () => chooseCategory(Number(categorySelect.value));
    categoryBar.append(categorySelect);
  } else if (categoryButtons.length > 1) categoryBar.append(...categoryButtons);
  else categoryBar.hidden = true;

  const pageCount = () => Math.ceil(categories[categoryIndex].effects.length / pageSize);
  for (const [control, offset] of [[previous, -1], [next, 1]]) {
    control.dataset.action = effectAction;
    control.onclick = () => {
      if (control.getAttribute('aria-disabled') === 'true') return;
      pageIndex += offset;
      renderChoices();
    };
  }

  function refresh() {
    if (categorySelect) categorySelect.disabled = !canRequest;
    categoryButtons.forEach((control, index) => {
      control.setAttribute('aria-pressed', String(categoryIndex === index));
      control.disabled = !canRequest;
    });
    for (const { control, effect } of choiceButtons) {
      control.setAttribute('aria-pressed', String(draft === effect));
      control.setAttribute('aria-current', String(effect === current));
      control.disabled = !canRequest;
    }
    previous.setAttribute('aria-disabled', String(!canRequest || pageIndex === 0));
    next.setAttribute('aria-disabled', String(!canRequest || pageIndex >= pageCount() - 1));
    apply.disabled = !canRequest || !draft || draft === current;
    const statusText = draft ? t('selected_effect') + ' · ' + displayName(draft)
      : current ? t('current_effect') + ' · ' + displayName(current) : t('no_current_effect');
    if (status.textContent !== statusText) status.textContent = statusText;
  }

  function renderChoices() {
    const total = pageCount();
    pager.hidden = total <= 1;
    pageLabel.textContent = t('effect_page_number').replace('{page}', pageIndex + 1).replace('{total}', total);
    const firstIndex = pageIndex * pageSize;
    choiceButtons = categories[categoryIndex].effects.slice(firstIndex, firstIndex + pageSize).map(({ effect, name, icon: symbol }) => {
      const control = button('control-button');
      control.dataset.action = effectAction;
      if (symbol) control.append(icon(symbol));
      control.append(make('span', '', name ?? effect));
      if (name && name !== effect) control.setAttribute('aria-label', name + ' · ' + effect);
      control.onclick = () => {
        draft = effect;
        refresh();
      };
      return { control, effect };
    });
    choices.replaceChildren(...choiceButtons.map(({ control }) => control));
    refresh();
  }

  apply.onclick = () => {
    if (!apply.disabled) request(draft, apply);
  };
  renderChoices();
  return {
    content: gallery,
    update(model, enabled) {
      const effect = model.attributes.effect;
      current = model.state === 'on' && typeof effect === 'string' && effect.trim() &&
        (available.has(effect) || effect !== 'off') ? effect : undefined;
      canRequest = enabled;
      if (draft === current) draft = undefined;
      refresh();
    },
  };
}

export function organizeLightModes(fields, selected, changed, { make, button, t }) {
  const parts = lightModes.flatMap(([id, name]) => fields.has(id)
    ? [{ id, name, field: fields.get(id) }] : []);
  if (parts.length < 2) return;
  const modeBar = make('div', 'light-mode-bar');
  modeBar.setAttribute('role', 'group');
  modeBar.setAttribute('aria-label', t('light_mode'));
  for (const part of parts) {
    const control = button('control-button', t(part.name));
    part.control = control;
    control.dataset.lightMode = part.id;
    control.onclick = () => {
      setActive(part.id);
      changed(part.id);
    };
    modeBar.append(control);
    fields.delete(part.id);
  }
  function setActive(active) {
    for (const { id, control, field } of parts) {
      control.setAttribute('aria-pressed', String(id === active));
      field.hidden = id !== active;
    }
  }
  setActive(parts.some(({ id }) => id === selected) ? selected : parts[0].id);
  const panel = make('div', 'light-mode-panel');
  panel.append(modeBar, ...parts.map(({ field }) => field));
  fields.set(effectAction, panel);
}

export const lightEffectStyles = `
  .light-mode-panel { display:grid; gap:10px; min-width:0; }
  .light-mode-panel > [hidden] { display:none; }
  .light-mode-bar {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(min(64px,100%),1fr)); gap:4px;
  }
  .light-mode-bar .control-button { min-width:0; padding-inline:6px; overflow-wrap:anywhere; }
  .light-mode-bar .control-button[aria-pressed=true] {
    border-color:currentColor;
    box-shadow:inset 0 0 0 1px currentColor;
  }
  .light-effect-gallery { display:grid; gap:8px; min-width:0; }
  .light-effect-caption { margin:0; font-size:.87rem; font-weight:650; }
  .light-effect-categories { display:flex; flex-wrap:wrap; gap:6px; }
  .light-effect-categories[hidden] { display:none; }
  .light-effect-categories select { width:100%; font-size:16px; }
  .light-effect-categories option { background:#292929; color:#fff; }
  .light-effect-choices { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
  .light-effect-gallery .control-button {
    min-height:44px; min-width:0; white-space:normal; overflow-wrap:anywhere;
  }
  .light-effect-choices .control-button { justify-content:flex-start; text-align:start; }
  .light-effect-choices .control-button span { min-width:0; }
  .light-effect-choices ha-icon { flex:none; --mdc-icon-size:18px; }
  .light-effect-gallery .control-button[aria-pressed=true] {
    border-color:currentColor;
    box-shadow:inset 0 0 0 1px currentColor;
  }
  .light-effect-choices .control-button[aria-current=true] { border-style:dashed; }
  .light-effect-pages {
    display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:.75rem;
  }
  .light-effect-pages[hidden] { display:none; }
  .light-effect-pages .control-button[aria-disabled=true] { opacity:.5; cursor:default; }
  .light-effect-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .light-effect-status { min-width:0; overflow-wrap:anywhere; font-size:.78rem; }
`;
