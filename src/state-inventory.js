export function stateInventoryChanged(previous, current) {
  if (previous === current) return false;
  for (const id in current) {
    const before = previous?.[id];
    const after = current[id];
    if (Boolean(before) !== Boolean(after) || before?.attributes?.area_id !== after?.attributes?.area_id) return true;
  }
  for (const id in previous) {
    if (previous[id] && !current?.[id]) return true;
  }
  return false;
}
