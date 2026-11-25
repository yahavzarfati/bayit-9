const PREFIX = 'bayit-9.popup-scroll.v1:';
const MAX_RESTORE_MS = 850;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function createPopupScrollMemory(body, content) {
  const view = body.ownerDocument.defaultView;
  const memory = new Map();
  let current;
  const clamp = top => Math.max(0, Math.min(top, body.scrollHeight - body.clientHeight));

  function cancelRetry(entry) {
    entry.observer?.disconnect();
    view.clearTimeout(entry.timeout);
    entry.observer = entry.timeout = undefined;
  }

  function remember() {
    const entry = current;
    if (!entry?.active() || entry.waiting) return;
    const top = Math.max(0, Math.round(body.scrollTop));
    if (memory.get(entry.key) === top) return;
    memory.set(entry.key, top);
    if (entry.persistent) {
      try { view.sessionStorage.setItem(PREFIX + entry.key, String(top)); } catch {}
    }
  }

  function apply(entry) {
    if (current !== entry || !entry.active()) {
      cancelRetry(entry);
      return;
    }
    body.scrollTop = clamp(entry.top);
    entry.waiting = body.scrollTop + 1 < entry.top;
    if (!entry.waiting) cancelRetry(entry);
  }

  function stop() {
    if (!current) return;
    remember();
    cancelRetry(current);
    view.removeEventListener('pagehide', remember);
    current = undefined;
  }

  function start(key, { persistent, active }) {
    stop();
    let top = memory.get(key);
    if (top === undefined && persistent) {
      try {
        const saved = view.sessionStorage.getItem(PREFIX + key);
        if (saved !== null && /^\d+$/.test(saved) && Number.isSafeInteger(Number(saved))) top = Number(saved);
      } catch {}
    }
    const entry = { key, top: top ?? 0, persistent, active };
    memory.set(key, entry.top);
    current = entry;
    apply(entry);
    if (entry.waiting && typeof view.ResizeObserver === 'function') {
      entry.observer = new view.ResizeObserver(() => { if (entry.waiting) apply(entry); });
      entry.observer.observe(content);
      entry.observer.observe(body);
      entry.timeout = view.setTimeout(() => cancelRetry(entry), MAX_RESTORE_MS);
    }
    if (persistent) view.addEventListener('pagehide', remember);
  }

  function interrupt() {
    if (!current?.active()) return;
    current.waiting = false;
    cancelRetry(current);
  }

  // Layout changes and native focus can scroll before a saved offset fits.
  // Cancel a pending restore only when the input indicates scroll intent.
  body.addEventListener('scroll', remember, { passive: true });
  body.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target !== body || !current?.waiting) return;
    const x = event.clientX - body.getBoundingClientRect().left - body.clientLeft;
    if (x < 0 || x >= body.clientWidth) interrupt();
  }, { passive: true });
  body.addEventListener('wheel', event => { if (event.deltaY && !event.defaultPrevented) interrupt(); }, { passive: true });
  body.addEventListener('touchmove', interrupt, { passive: true });
  body.addEventListener('keydown', event => {
    if (SCROLL_KEYS.has(event.key) && !event.defaultPrevented &&
        !event.composedPath().some(node => node.matches?.('input, select, textarea, [contenteditable], button'))) interrupt();
  });

  return { start, stop };
}
