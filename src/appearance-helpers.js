import { catalog } from './wallpaper-catalog.js';

const inputSelectPattern = /^input_select\.[a-z0-9_]+$/;
const layout = Object.freeze(['classic', 'header']);
const shape = Object.freeze(['soft', 'circle', 'square']);
const fields = ['background', 'shape', 'layout'];
const record = value => value && typeof value === 'object' && !Array.isArray(value);

export function appearanceHelperChoices(field, sharedWallpapers = []) {
  if (field === 'shape') return shape;
  if (field === 'layout') return layout;
  if (field === 'background') return [...Object.keys(catalog), ...sharedWallpapers.map(({ id }) => id)];
  return [];
}

export function normalizeAppearanceHelpers(raw, sharedWallpapers = []) {
  if (!record(raw)) return {};
  const bindings = [];
  for (const field of fields) {
    if (!Object.hasOwn(raw, field)) continue;
    const entry = raw[field];
    if (!record(entry) || typeof entry.entity !== 'string' || !inputSelectPattern.test(entry.entity) ||
        !record(entry.options)) continue;
    const validChoices = new Set(appearanceHelperChoices(field, sharedWallpapers));
    const options = Object.entries(entry.options).filter(([id, option]) =>
      validChoices.has(id) && typeof option === 'string' && option.trim());
    const values = options.map(([, option]) => option);
    if (!values.length || new Set(values).size !== values.length) continue;
    bindings.push([field, { entity: entry.entity, options: Object.fromEntries(options) }]);
  }
  return Object.fromEntries(bindings.filter(([, binding]) =>
    bindings.filter(([, other]) => other.entity === binding.entity).length === 1));
}

export function reportedAppearanceHelper(binding, state) {
  if (!binding || !Array.isArray(state?.attributes?.options) ||
      state.state === 'unknown' || state.state === 'unavailable' || !state.attributes.options.includes(state.state)) return;
  const choices = Object.entries(binding.options).filter(([, option]) => state.attributes.options.includes(option));
  return {
    selected: choices.find(([, option]) => option === state.state)?.[0],
    options: Object.fromEntries(choices),
  };
}
