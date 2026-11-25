const connections = new WeakMap();

function forecastStream(connection, entity, type) {
  if (!connections.has(connection)) connections.set(connection, new Map());
  const streams = connections.get(connection);
  const key = entity + ':' + type;
  if (streams.has(key)) return streams.get(key);

  const listeners = new Set();
  let subscription;
  let latest;

  function retire(entry) {
    entry.retiring = true;
    if (!entry.stop || entry.ending) return;
    entry.ending = true;
    void Promise.resolve().then(() => entry.stop()).catch(() => {}).finally(() => {
      subscription = undefined;
      reconcile();
    });
  }

  function reconcile() {
    if (!listeners.size) {
      latest = undefined;
      if (subscription && !subscription.failed) retire(subscription);
      else streams.delete(key);
      return;
    }
    if (subscription) return;
    const entry = {};
    subscription = entry;
    const unavailable = () => {
      if (entry.retiring) {
        subscription = undefined;
        reconcile();
      } else {
        entry.failed = true;
        latest = undefined;
        for (const listener of listeners) listener.failed();
      }
    };
    try {
      const pending = connection.subscribeMessage(data => {
        if (subscription !== entry || entry.retiring || entry.failed || data?.type !== type) return;
        latest = data;
        for (const listener of listeners) listener.received(data);
      }, { type: 'weather/subscribe_forecast', entity_id: entity, forecast_type: type });
      void Promise.resolve(pending).then(stop => {
        if (typeof stop !== 'function') return unavailable();
        entry.stop = stop;
        if (entry.retiring) retire(entry);
      }, unavailable);
    } catch {
      unavailable();
    }
  }

  const stream = {
    listen(listener) {
      listeners.add(listener);
      if (subscription?.failed) listener.failed();
      else if (latest) listener.received(latest);
      reconcile();
      return () => {
        listeners.delete(listener);
        reconcile();
      };
    },
  };
  streams.set(key, stream);
  return stream;
}

export function createForecastFeed(entity, type, onChange) {
  let connection;
  let unsubscribe;
  let event;
  let failed = false;

  function update(next) {
    const usable = typeof next?.subscribeMessage === 'function' ? next : undefined;
    if (connection === usable) return;
    unsubscribe?.();
    event = undefined;
    failed = false;
    connection = usable;
    unsubscribe = connection && forecastStream(connection, entity, type).listen({
      received(data) {
        event = data;
        onChange();
      },
      failed() {
        event = undefined;
        failed = true;
        onChange();
      },
    });
  }

  return {
    update,
    dispose() { update(undefined); },
    get forecast() { return event?.forecast; },
    get status() { return !connection || failed || event ? 'unavailable' : 'loading'; },
  };
}
