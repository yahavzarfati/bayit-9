const scriptId = /^script\.[a-z0-9_]+$/;

export function createEntityRegistryLookup(onChange, { include = () => true, project = entry => entry } = {}) {
  let snapshot;
  let lookup;
  let watch;
  let entries = new Map();

  function refresh() {
    entries.clear();
    if (!snapshot) return;
    const { hass, ids } = snapshot;
    const token = lookup = {};
    Promise.resolve().then(() => {
      if (lookup === token) return hass.callWS({ type: 'config/entity_registry/get_entries', entity_ids: ids });
    }).then(response => {
      if (lookup !== token) return;
      entries = new Map(ids.map(id => [id, project(response?.[id])]));
      onChange();
    }).catch(() => {
      if (lookup === token) onChange();
    });
  }

  function stopWatching() {
    const previous = watch;
    watch = undefined;
    if (previous?.unsubscribe) void Promise.resolve().then(previous.unsubscribe).catch(() => {});
  }

  function startWatching(connection) {
    stopWatching();
    if (typeof connection?.subscribeEvents !== 'function') return;
    const current = watch = {};
    Promise.resolve().then(() => connection.subscribeEvents(event => {
      if (watch !== current || !snapshot?.ids.some(id => id === event.data?.entity_id || id === event.data?.old_entity_id)) return;
      refresh();
      onChange();
    }, 'entity_registry_updated')).then(unsubscribe => {
      if (watch === current) current.unsubscribe = unsubscribe;
      else return unsubscribe();
    }).catch(() => {});
  }

  function dispose() {
    snapshot = lookup = undefined;
    entries.clear();
    stopWatching();
  }

  return {
    get: id => entries.get(id),
    update(hass, entityIds) {
      const ids = [...new Set(entityIds.filter(include))].sort();
      if (!ids.length || hass?.connected === false || hass?.connection?.connected === false ||
          typeof hass?.callWS !== 'function') {
        dispose();
        return;
      }
      const transport = hass.connection ?? hass.callWS;
      const owner = hass.user?.id;
      const key = ids.join(',');
      const newScope = transport !== snapshot?.transport || owner !== snapshot?.owner;
      if (!newScope && snapshot.key === key && snapshot.registry === hass.entities) return;
      snapshot = { hass, ids, transport, owner, key, registry: hass.entities };
      if (newScope) startWatching(hass.connection);
      refresh();
    },
    dispose,
  };
}

export function createScriptRegistry(onChange) {
  return createEntityRegistryLookup(onChange, { include: id => scriptId.test(id) });
}
