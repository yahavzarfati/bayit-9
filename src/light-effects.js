import { supportsLightColor } from './light-color.mjs';

const iconPattern = /^mdi:[a-z0-9-]+$/;
const effectAction = 'set_effect';
const pageSize = 6;
const sceneColumns = 3;
const favoriteKeyPrefix = 'bayit-9.light-effect-favorites.v1:';
const maxFavoriteStorageLength = 65536;
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

export function normalizeLightEffectLights(value) {
  return Array.isArray(value) ? [...new Set(value.filter(entity => typeof entity === 'string' && /^light\.[a-z0-9_]+$/.test(entity)))] : [];
}

export function lightEffectCategoryOptions(record) {
  const options = record?.attributes?.options;
  return Array.isArray(options) ? [...new Set(options.filter(validCategoryOption))] : [];
}

function validCategoryOption(value) {
  return typeof value === 'string' && value.trim() && value.length <= 255 &&
    value !== 'unknown' && value !== 'unavailable';
}

export function lightEffectCategoryTitles(groups) {
  const unique = new Set();
  const repeated = new Set();
  for (const { title } of groups) {
    if (unique.has(title)) repeated.add(title);
    unique.add(title);
  }
  return new Set([...unique].filter(title => !repeated.has(title)));
}

export function owningLightEffectCategory(groups, effect, advertised) {
  const owners = groups.filter(group => group.effects.some(item => item.effect === effect));
  const title = owners[0]?.title;
  if (owners.length === 1 && advertised.includes(title) && lightEffectCategoryTitles(groups).has(title)) return title;
}

export function normalizeLightEffectCategorySource(value, groups) {
  const { entity, all_option } = value ?? {};
  if (typeof entity !== 'string' || !/^input_select\.[a-z0-9_]+$/.test(entity) ||
      !lightEffectCategoryTitles(groups).size) return;
  const all = validCategoryOption(all_option) && !groups.some(({ title }) => title === all_option) ? all_option : undefined;
  return { entity, ...(all && { all_option: all }) };
}

function favoritesFor(view, key) {
  try {
    const raw = view.localStorage.getItem(key);
    if (!raw || raw.length > maxFavoriteStorageLength) return new Set();
    const items = JSON.parse(raw);
    return new Set(Array.isArray(items) ? items.filter(value => typeof value === 'string' && value.trim()) : []);
  } catch { return new Set(); }
}

export function createLightEffectGallery(groups, advertised, { make, button, icon, t, request, unavailableReason,
  personalFavorites, categorySource, sceneGrid, sceneOnSelect }) {
  if (!groups?.length) return null;
  const activateOnSelect = sceneGrid === true && sceneOnSelect === true;
  const available = new Set(advertised);
  const assigned = new Set();
  const mappedTitles = categorySource ? lightEffectCategoryTitles(groups) : new Set();
  const categories = groups.flatMap(({ title, effects }) => {
    const matches = effects.filter(({ effect }) => available.has(effect));
    for (const { effect } of matches) assigned.add(effect);
    return matches.length ? [{ title, effects: matches, option: mappedTitles.has(title) ? title : undefined }] : [];
  });
  if (!categories.length) return null;
  const remaining = [...available].filter(effect => !assigned.has(effect));
  if (remaining.length) {
    categories.push({ title: t('other_effects'), effects: remaining.map(effect => ({ effect })) });
  }

  const effectDetails = new Map(categories.flatMap(({ effects }) => effects.map(effect => [effect.effect, effect])));
  if (categorySource?.allOption) {
    categories.push({ title: t('all_light_effects'), option: categorySource.allOption, all: true,
      effects: [...available].map(effect => effectDetails.get(effect)) });
  }

  const name = t(effectAction);
  const gallery = make('section', 'light-effect-gallery');
  gallery.setAttribute('aria-label', name);
  if (sceneGrid) gallery.style.setProperty('--scene-columns', sceneColumns);
  const caption = make('p', 'light-effect-caption', name);
  const heading = make('div', 'light-effect-heading');
  heading.append(caption);
  const favoriteMessage = make('p', 'light-effect-favorite-message');
  favoriteMessage.setAttribute('role', 'status');
  favoriteMessage.hidden = true;
  let favoriteActions;
  let star;
  let starIcon;
  let favoriteFilter;
  if (personalFavorites) {
    favoriteActions = make('div', 'light-effect-personal-actions');
    favoriteActions.hidden = true;
    star = button('control-button');
    star.dataset.effectFavoriteControl = 'star';
    starIcon = icon('mdi:star-outline');
    starIcon.setAttribute('aria-hidden', 'true');
    star.append(starIcon);
    favoriteFilter = button('control-button');
    favoriteFilter.dataset.effectFavoriteControl = 'filter';
    const filterIcon = icon('mdi:star-box-outline');
    filterIcon.setAttribute('aria-hidden', 'true');
    favoriteFilter.append(filterIcon);
    favoriteActions.append(star, favoriteFilter);
    heading.append(favoriteActions);
  }
  const categoryBar = make('div', 'light-effect-categories');
  categoryBar.setAttribute('role', 'group');
  categoryBar.setAttribute('aria-label', t('effect_categories'));
  const categoryNotice = categorySource && make('p', 'light-effect-category-message');
  if (categoryNotice) {
    categoryNotice.setAttribute('role', 'status');
    categoryNotice.hidden = true;
  }
  const choices = make('div', 'light-effect-choices');
  gallery.toggleAttribute('data-scene-grid', sceneGrid === true);
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', t('available_effects'));
  const footer = make('div', 'light-effect-footer');
  const status = make('span', 'light-effect-status');
  const apply = !activateOnSelect && button('control-button', t('apply'));
  footer.append(status);
  if (apply) {
    apply.setAttribute('aria-label', t('apply') + ' · ' + name);
    apply.dataset.action = effectAction;
    footer.append(apply);
  } else status.setAttribute('role', 'status');
  const pager = make('div', 'light-effect-pages');
  const previous = button('control-button', t('previous_effect_page'));
  const next = button('control-button', t('next_effect_page'));
  const pageLabel = make('span');
  pageLabel.setAttribute('aria-live', 'polite');
  pager.append(previous, pageLabel, next);
  gallery.append(personalFavorites ? heading : caption, categoryBar);
  if (categoryNotice) gallery.append(categoryNotice);
  gallery.append(pager, choices, favoriteMessage, footer);

  let categoryIndex = 0;
  let sharedCategory = -1;
  let categoryState;
  let localCategoryChosen = false;
  let pageIndex = 0;
  let draft;
  let blockedScene;
  let hasChosenScene = false;
  let current;
  let canRequest = false;
  let favoriteKey;
  let favorites = new Set();
  let favoritesOnly = false;
  let favoriteTarget;
  let favoriteError = false;
  const displayNames = new Map(categories.flatMap(({ effects }) =>
    effects.filter(({ name }) => name).map(({ effect, name }) => [effect, name])));
  const displayName = effect => displayNames.get(effect) ?? effect;
  const favoriteEffects = () => [...available].filter(effect => favorites.has(effect)).map(effect => effectDetails.get(effect));
  const categoryEffects = () => favoritesOnly ? favoriteEffects() : categories[categoryIndex].effects;
  let choiceButtons = [];
  const displayCategory = ({ all, option }) => !all || categoryState?.options.includes(option);
  const chooseCategory = (index, control) => {
    const next = categories[index];
    categoryState = categorySource?.read();
    if (!categoryState) sharedCategory = -1;
    if (!next || !canRequest || categoryState?.pending || !displayCategory(next) ||
        (!favoritesOnly && categoryIndex === index)) {
      refresh();
      return;
    }
    favoritesOnly = false;
    if (next.option && categoryState?.canWrite && categoryState.options.includes(next.option) &&
        next.option !== categoryState.selected && categorySource.request(next.option, control)) {
      return;
    }
    categoryIndex = index;
    localCategoryChosen = !!categorySource && categoryIndex !== sharedCategory;
    pageIndex = 0;
    renderChoices();
  };
  const categorySelect = !sceneGrid && categories.length > 3 ? make('select', 'control-button') : null;
  const categoryButtons = categorySelect ? [] : categories.map(({ title }, index) => {
    const control = button('control-button', title);
    control.dataset.action = effectAction;
    control.onclick = () => chooseCategory(index, control);
    return control;
  });
  let allChoice;
  let selectedFavorites;
  if (categorySelect) {
    categorySelect.dataset.action = effectAction;
    categorySelect.setAttribute('aria-label', t('effect_categories'));
    for (const [index, { title, all }] of categories.entries()) {
      const option = make('option', '', title);
      option.value = String(index);
      if (all) allChoice = option;
      else categorySelect.append(option);
    }
    if (personalFavorites) {
      selectedFavorites = make('option', '', t('light_favorites'));
      selectedFavorites.value = 'favorites';
      selectedFavorites.disabled = selectedFavorites.hidden = true;
      categorySelect.append(selectedFavorites);
    }
    categorySelect.onchange = () => chooseCategory(Number(categorySelect.value), categorySelect);
    categoryBar.append(categorySelect);
  } else if (categoryButtons.length > 1) categoryBar.append(...categoryButtons);
  else categoryBar.hidden = true;

  const pageCount = () => sceneGrid ? 1 : Math.max(1, Math.ceil(categoryEffects().length / pageSize));
  const selectTabStop = index => {
    choiceButtons.forEach(({ control }, item) => { control.tabIndex = item === index ? 0 : -1; });
  };
  if (sceneGrid) {
    choices.addEventListener('focusin', event => {
      const index = choiceButtons.findIndex(({ control }) => control === event.target);
      if (index >= 0) selectTabStop(index);
    });
    choices.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = choiceButtons.findIndex(({ control }) => control === event.target);
      if (index < 0) return;
      const rtl = choices.ownerDocument.defaultView.getComputedStyle(choices).direction === 'rtl';
      const directions = { ArrowDown: sceneColumns, ArrowUp: -sceneColumns, ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 };
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? choiceButtons.length - 1 : index + directions[event.key];
      if (!Number.isInteger(next)) return;
      event.preventDefault();
      if (next >= 0 && next < choiceButtons.length) choiceButtons[next].control.focus();
    });
  }
  for (const [control, offset] of [[previous, -1], [next, 1]]) {
    control.dataset.action = effectAction;
    control.onclick = () => {
      if (control.getAttribute('aria-disabled') === 'true') return;
      pageIndex += offset;
      renderChoices();
    };
  }

  function refresh() {
    const categoryDisabled = !canRequest || categoryState?.pending === true;
    if (categorySource) {
      categoryBar.hidden = categories.filter(displayCategory).length < 2;
      categoryBar.setAttribute('aria-busy', String(categoryState?.pending === true));
      const local = !favoritesOnly && localCategoryChosen;
      const message = local ? t('light_effect_category_local') : '';
      if (categoryNotice.textContent !== message) categoryNotice.textContent = message;
      categoryNotice.hidden = !message;
    }
    if (categorySelect) {
      categorySelect.disabled = categoryDisabled;
      if (allChoice) {
        const showAll = displayCategory(categories[Number(allChoice.value)]);
        if (showAll && !allChoice.parentNode) categorySelect.insertBefore(allChoice, selectedFavorites ?? null);
        else if (!showAll) allChoice.remove();
      }
      categorySelect.value = favoritesOnly ? 'favorites' : String(categoryIndex);
    }
    categoryButtons.forEach((control, index) => {
      control.setAttribute('aria-pressed', String(!favoritesOnly && categoryIndex === index));
      control.hidden = !displayCategory(categories[index]);
      control.disabled = categoryDisabled;
    });
    for (const { control, effect } of choiceButtons) {
      if (!activateOnSelect) control.setAttribute('aria-pressed', String(draft === effect));
      control.setAttribute('aria-current', String(effect === current));
      control.disabled = !canRequest;
    }
    previous.setAttribute('aria-disabled', String(!canRequest || pageIndex === 0));
    next.setAttribute('aria-disabled', String(!canRequest || pageIndex >= pageCount() - 1));
    const selection = activateOnSelect ? blockedScene : draft;
    const blocked = canRequest && selection && unavailableReason?.(selection);
    if (activateOnSelect && !blocked) blockedScene = undefined;
    if (apply) apply.disabled = !canRequest || !draft || draft === current || Boolean(blocked);
    const statusText = draft ? t('selected_effect') + ' · ' + displayName(draft)
      : current ? t('current_effect') + ' · ' + displayName(current) : t('no_current_effect');
    const detail = blocked ? t(blocked) : activateOnSelect ? '' : statusText;
    if (status.textContent !== detail) status.textContent = detail;
    if (sceneGrid) {
      const active = current ? t('current_effect') + ' · ' + displayName(current) : t('no_current_effect');
      if (caption.textContent !== active) caption.textContent = active;
      status.hidden = activateOnSelect ? !blocked : !draft;
      footer.hidden = activateOnSelect ? !blocked : !draft && !hasChosenScene;
    }
    if (favoriteActions) {
      favoriteActions.hidden = !favoriteKey;
      const saved = favorites.has(favoriteTarget);
      const starLabel = t(saved ? 'light_favorite_remove' : 'light_favorite_add');
      star.setAttribute('aria-label', favoriteTarget ? starLabel + ' · ' + displayName(favoriteTarget) : starLabel);
      star.title = starLabel;
      star.disabled = !favoriteKey || !favoriteTarget;
      star.setAttribute('aria-pressed', String(saved));
      starIcon.setAttribute('icon', saved ? 'mdi:star' : 'mdi:star-outline');
      const filterLabel = t('light_favorites_filter');
      favoriteFilter.setAttribute('aria-label', filterLabel);
      favoriteFilter.title = filterLabel;
      favoriteFilter.setAttribute('aria-pressed', String(favoritesOnly));
      const count = favoritesOnly && favoriteEffects().length;
      const message = favoriteError ? t('light_favorites_error') : favoritesOnly
        ? count ? t('light_favorites_count').replace('{count}', count) : t('light_favorites_empty') : '';
      if (favoriteMessage.textContent !== message) favoriteMessage.textContent = message;
      favoriteMessage.hidden = !message;
    }
  }

  function renderChoices() {
    const total = pageCount();
    pageIndex = Math.min(pageIndex, total - 1);
    pager.hidden = total <= 1;
    pageLabel.textContent = t('effect_page_number').replace('{page}', pageIndex + 1).replace('{total}', total);
    const firstIndex = pageIndex * pageSize;
    const effects = sceneGrid ? categoryEffects() : categoryEffects().slice(firstIndex, firstIndex + pageSize);
    if (blockedScene && !effects.some(({ effect }) => effect === blockedScene)) blockedScene = undefined;
    const focused = sceneGrid && choiceButtons.find(({ control }) => control === choices.getRootNode().activeElement)?.effect;
    choiceButtons = effects.map(({ effect, name, icon: symbol }) => {
      const control = button('control-button');
      control.dataset.action = effectAction;
      if (symbol) control.append(icon(symbol));
      const label = make('span', '', name ?? effect);
      if (sceneGrid) label.dir = 'auto';
      control.append(label);
      if (name && name !== effect) {
        control.setAttribute('aria-label', name + ' · ' + effect);
        if (sceneGrid) {
          const originalName = make('small', '', effect);
          originalName.dir = 'auto';
          control.append(originalName);
        }
      }
      control.onclick = () => {
        if (activateOnSelect) {
          if (!canRequest || effect === current) return;
          const reason = unavailableReason?.(effect);
          blockedScene = reason ? effect : undefined;
          refresh();
          if (!reason) request(effect, control);
          return;
        }
        hasChosenScene = true;
        draft = effect;
        refresh();
      };
      return { control, effect };
    });
    choices.replaceChildren(...choiceButtons.map(({ control }) => control));
    choices.hidden = !choiceButtons.length;
    refresh();
    if (sceneGrid) {
      const restoreIndex = focused ? effects.findIndex(({ effect }) => effect === focused) : -1;
      const selectedIndex = effects.findIndex(({ effect }) => effect === (draft ?? current));
      selectTabStop(restoreIndex >= 0 ? restoreIndex : Math.max(0, selectedIndex));
      if (restoreIndex >= 0 && canRequest) choiceButtons[restoreIndex].control.focus({ preventScroll: true });
      else choices.scrollTop = 0;
    }
  }

  if (apply) apply.onclick = () => {
    if (!apply.disabled) request(draft, apply);
  };
  function syncFavorites() {
    if (!personalFavorites) return false;
    const user = personalFavorites.user();
    const key = typeof user === 'string' && user.trim() && user.length <= 256
      ? favoriteKeyPrefix + JSON.stringify([user, personalFavorites.entity]) : undefined;
    if (favoriteKey === key) return false;
    if (favoriteKey) draft = undefined;
    favoriteKey = key;
    favorites = key ? favoritesFor(personalFavorites.view, key) : new Set();
    favoriteError = favoritesOnly = false;
    pageIndex = 0;
    return true;
  }
  if (personalFavorites) {
    star.onclick = () => {
      if (syncFavorites()) renderChoices();
      if (star.disabled || !favoriteKey || !favoriteTarget) return;
      const next = favoritesFor(personalFavorites.view, favoriteKey);
      if (next.has(favoriteTarget)) next.delete(favoriteTarget);
      else next.add(favoriteTarget);
      try {
        const encoded = JSON.stringify([...next]);
        if (encoded.length > maxFavoriteStorageLength) throw new Error('Too many favorites');
        personalFavorites.view.localStorage.setItem(favoriteKey, encoded);
        favorites = next;
        favoriteError = false;
        if (favoritesOnly) renderChoices();
        else refresh();
      } catch {
        favoriteError = true;
        refresh();
      }
    };
    favoriteFilter.onclick = () => {
      syncFavorites();
      if (!favoriteKey) return;
      favorites = favoritesFor(personalFavorites.view, favoriteKey);
      favoritesOnly = !favoritesOnly;
      pageIndex = 0;
      renderChoices();
    };
  }
  syncFavorites();
  const restore = personalFavorites?.restore;
  if (favoriteKey && restore?.key === favoriteKey) {
    favoritesOnly = restore.favoritesOnly;
    categoryIndex = categories[restore.categoryIndex] ? restore.categoryIndex : 0;
    pageIndex = restore.pageIndex;
    if (!activateOnSelect && available.has(restore.draft)) draft = restore.draft;
  }
  function syncCategory() {
    if (!categorySource) return false;
    categoryState = categorySource.read();
    const next = categories.findIndex(category => !!category.option && category.option === categoryState?.selected);
    if (next !== sharedCategory) {
      sharedCategory = next;
      if (next >= 0) {
        categoryIndex = next;
        localCategoryChosen = false;
        if (!favoritesOnly) pageIndex = 0;
        return !favoritesOnly;
      }
    }
    if (!displayCategory(categories[categoryIndex])) {
      categoryIndex = 0;
      localCategoryChosen = false;
      if (!favoritesOnly) pageIndex = 0;
      return !favoritesOnly;
    }
    return false;
  }

  syncCategory();
  renderChoices();
  return {
    content: gallery,
    capture() { return personalFavorites && { key: favoriteKey, favoritesOnly, categoryIndex, pageIndex, draft }; },
    update(model, enabled) {
      const effect = model.attributes.effect;
      favoriteTarget = model.available && ['on', 'off'].includes(model.state) && available.has(effect) ? effect : undefined;
      current = model.state === 'on' && typeof effect === 'string' && effect.trim() &&
        (available.has(effect) || effect !== 'off') ? effect : undefined;
      canRequest = enabled;
      if (draft === current) draft = undefined;
      const categoryChanged = syncCategory();
      if (syncFavorites() || categoryChanged) renderChoices();
      else refresh();
    },
  };
}

export function normalizeLightModeSource(value) {
  const { entity, fixed_color_option, apply_effects, fixed_color_script } = value ?? {};
  if (typeof entity !== 'string' || !/^select\.[a-z0-9_]+$/.test(entity) ||
      typeof fixed_color_option !== 'string' || !fixed_color_option.trim() || fixed_color_option.length > 160 ||
      ['unknown', 'unavailable'].includes(fixed_color_option)) return;
  return { entity, fixed_color_option, ...(apply_effects === true && { apply_effects }),
    ...(typeof fixed_color_script === 'string' && /^script\.[a-z0-9_]+$/.test(fixed_color_script) && { fixed_color_script }) };
}

function reportedLightMode({ actions, attributes, state }) {
  const { effect, color_mode: colorMode } = attributes;
  if (state === 'on' && typeof effect === 'string' && effect.trim().toLowerCase() !== 'off' &&
      actions.set_effect?.options.includes(effect)) return effectAction;
  if (colorMode === 'color_temp') return 'set_color_temp_kelvin';
  if (supportsLightColor([colorMode])) return 'set_light_color';
}

export function createLightWhitePresets(action, { make, button, t, request }) {
  const { min, max } = action;
  const values = [['warm', min], ['neutral', Math.max(min, Math.min(max, 4000))], ['cool', max]];
  const content = make('div', 'light-white-presets');
  content.setAttribute('role', 'group');
  content.setAttribute('aria-label', t('light_white_presets'));
  const controls = values.map(([tone, kelvin]) => {
    const control = button('control-button', undefined, 'mdi:lightbulb-on-outline');
    const name = make('span', '', t('light_white_' + tone));
    const reading = make('small', '', kelvin + ' K');
    reading.dir = 'ltr';
    control.append(name, reading);
    control.dataset.action = 'set_color_temp_kelvin';
    control.dataset.whitePreset = tone;
    control.onclick = () => request(kelvin, control);
    content.append(control);
    return [kelvin, control];
  });
  return {
    content,
    update(model) {
      const actual = model.attributes.color_temp_kelvin;
      const reportedWhite = model.state === 'on' && reportedLightMode(model) === 'set_color_temp_kelvin';
      for (const [kelvin, control] of controls) {
        control.setAttribute('aria-pressed', String(reportedWhite && Number.isFinite(actual) && Math.abs(actual - kelvin) < 2));
      }
    },
  };
}

export function organizeLightModes(fields, selected, changed, { make, button, t, model, fixedColorFallback }) {
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
  const fallback = fixedColorFallback ? ['set_light_color', 'set_color_temp_kelvin'] : [];
  const initial = [selected, reportedLightMode(model), ...fallback].find(mode => parts.some(({ id }) => id === mode)) ?? parts[0].id;
  setActive(initial);
  const panel = make('div', 'light-mode-panel');
  panel.append(modeBar, ...parts.map(({ field }) => field));
  fields.set(effectAction, panel);
  return initial;
}

export const lightEffectStyles = `
  .light-mode-panel { display:grid; gap:10px; min-width:0; }
  .light-mode-panel > [hidden] { display:none; }
  .light-mode-bar {
    display:grid; grid-template-columns:repeat(auto-fit,minmax(min(64px,100%),1fr)); gap:4px;
  }
  .light-mode-bar .control-button { min-width:0; padding-inline:6px; overflow-wrap:anywhere; }
  .light-white-presets {
    grid-column:1/-1; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px;
  }
  .light-white-presets[hidden] { display:none; }
  .light-white-presets .control-button {
    display:grid; grid-template-columns:auto minmax(0,auto); gap:2px 5px; justify-content:center;
    align-content:center; padding:6px 4px; min-height:48px; min-width:0; overflow-wrap:anywhere; text-align:center;
  }
  .light-white-presets ha-icon { --mdc-icon-size:16px; color:var(--white-preset-accent); }
  [data-white-preset=warm] { --white-preset-accent:#ffbc79; }
  [data-white-preset=neutral] { --white-preset-accent:#fff4df; }
  [data-white-preset=cool] { --white-preset-accent:#bcd7ff; }
  .light-white-presets small { grid-column:1/-1; color:var(--secondary); white-space:nowrap; }
  :is(.light-mode-bar,.light-white-presets) .control-button[aria-pressed=true] {
    border-color:currentColor;
    box-shadow:inset 0 0 0 1px currentColor;
  }
  .light-effect-gallery { display:grid; gap:8px; min-width:0; }
  .light-effect-caption { margin:0; font-size:.87rem; font-weight:650; }
  .light-effect-heading { display:flex; justify-content:space-between; align-items:center; gap:6px; }
  .light-effect-personal-actions { display:flex; gap:6px; }
  .light-effect-personal-actions[hidden], .light-effect-favorite-message[hidden], .light-effect-category-message[hidden],
  .light-effect-categories[hidden], .light-effect-categories button[hidden] { display:none; }
  .light-effect-gallery .light-effect-personal-actions .control-button { min-width:44px; min-height:44px; justify-content:center; }
  .light-effect-personal-actions ha-icon { --mdc-icon-size:20px; }
  .light-effect-favorite-message, .light-effect-category-message { margin:0; font-size:.78rem; color:var(--secondary); }
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
  .light-effect-gallery[data-scene-grid] .light-effect-categories .control-button {
    padding-inline:10px; border-radius:12px; font-size:.82rem;
  }
  .light-effect-gallery[data-scene-grid] .light-effect-choices {
    grid-template-columns:repeat(var(--scene-columns),minmax(0,1fr)); max-block-size:210px;
    overflow-y:auto; overscroll-behavior-y:contain; scroll-padding-block:4px; padding:4px;
  }
  .light-effect-gallery[data-scene-grid] .light-effect-choices .control-button {
    flex-direction:column; justify-content:center; align-items:center; gap:3px; border-radius:12px;
    min-block-size:60px; padding:6px; text-align:center; line-height:1.15; font-size:.79rem;
  }
  .light-effect-gallery[data-scene-grid] .light-effect-choices small { font-size:.68rem; font-weight:500; }
  .light-effect-gallery[data-scene-grid] .light-effect-footer { justify-content:flex-end; }
  .light-effect-gallery[data-scene-grid] .light-effect-status { margin-inline-end:auto; }
  .light-effect-pages {
    display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:.75rem;
  }
  .light-effect-pages[hidden] { display:none; }
  .light-effect-pages .control-button[aria-disabled=true] { opacity:.5; cursor:default; }
  .light-effect-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .light-effect-status { min-width:0; overflow-wrap:anywhere; font-size:.78rem; }
`;
