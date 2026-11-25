export const MORE_INFO_DIALOG = 'ha-more-info-dialog';
const entityParam = 'more-info-entity-id';

function dashboardPage(location) {
  const url = new URL(location);
  url.searchParams.delete(entityParam);
  url.searchParams.delete('more-info-view');
  return url.href;
}

export function sameMoreInfoPage(left, right) {
  return left === right || dashboardPage(left) === dashboardPage(right);
}

// Home Assistant shows its own modal above the already open dashboard dialog.
export function preserveMoreInfoReturn(view, { event, source, body, active, stopped }) {
  const href = view.location.href;
  const scroll = body?.scrollTop;
  const underlyingDialog = body?.closest('dialog');
  const abort = new view.AbortController();
  source.focus({ preventScroll: true });
  let nativeDialog;
  let frame;
  let afterRender;

  function stop() {
    if (abort.signal.aborted) return;
    abort.abort();
    view.cancelAnimationFrame(frame);
    view.clearTimeout(afterRender);
    stopped();
  }

  function stillOnPage() {
    const selected = new URLSearchParams(view.location.search).get(entityParam);
    return active() && sameMoreInfoPage(view.location.href, href) && (!selected || selected === event.detail.entityId);
  }

  const options = { signal: abort.signal, capture: true };
  for (const type of ['location-changed', 'popstate', 'hashchange']) {
    view.addEventListener(type, () => { if (!stillOnPage()) stop(); }, options);
  }
  view.addEventListener('pagehide', stop, options);
  view.addEventListener('hass-more-info', next => { if (next !== event) stop(); }, options);
  view.addEventListener('opened', opened => {
    if (stillOnPage()) nativeDialog ??= opened.composedPath().find(node => node?.localName === MORE_INFO_DIALOG);
  }, options);
  view.addEventListener('dialog-closed', closed => {
    const dialog = closed.composedPath()[0];
    if (closed.detail?.dialog !== MORE_INFO_DIALOG || dialog?.localName !== MORE_INFO_DIALOG ||
        (nativeDialog && nativeDialog !== dialog)) return;
    if (!stillOnPage()) { stop(); return; }
    frame = view.requestAnimationFrame(() => {
      // Restore the source after the native backdrop clears, unless focus has moved to a new control.
      afterRender = view.setTimeout(() => {
        const root = source.getRootNode();
        const focused = root.activeElement;
        const focusNeedsReturn = !focused || focused === source || focused === root.body || focused === underlyingDialog;
        if (stillOnPage() && focusNeedsReturn) {
          if (source.isConnected && !source.disabled && !source.closest('[hidden]')) source.focus({ preventScroll: true });
          if (body) body.scrollTop = scroll;
        }
        stop();
      }, 0);
    });
  }, { signal: abort.signal });
  return stop;
}
