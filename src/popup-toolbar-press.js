const toolbarPopups = new WeakMap();
const moveLimit = 8;
const pressTimeout = 650;

function isPrimaryButton(event) {
  return event.isTrusted && event.isPrimary && event.button === 0 &&
    (event.pointerType === 'mouse' || event.pointerType === 'pen') &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

export function preserveToolbarPopupPress(button, kind, id, canOpen) {
  toolbarPopups.set(button, { kind, id, canOpen });
  button.addEventListener('pointerdown', event => {
    if (!isPrimaryButton(event)) return;
    const view = button.ownerDocument.defaultView;
    const href = view.location.href;
    const { pointerId, clientX, clientY } = event;
    const moved = event => Math.hypot(event.clientX - clientX, event.clientY - clientY) > moveLimit;
    const controller = new view.AbortController();
    const options = { capture:true, signal:controller.signal };
    const expiry = view.setTimeout(stop, pressTimeout);

    function stop() {
      controller.abort();
      view.clearTimeout(expiry);
    }

    view.addEventListener('pointermove', event => {
      if (event.isTrusted && event.pointerId === pointerId && moved(event)) stop();
    }, options);
    for (const type of ['pointerdown', 'pointercancel', 'dragstart', 'wheel', 'pagehide']) {
      view.addEventListener(type, event => { if (event.isTrusted) stop(); }, options);
    }
    view.addEventListener('blur', event => { if (event.target === view) stop(); }, options);
    view.addEventListener('pointerup', release => {
      if (!release.isTrusted || release.pointerId !== pointerId) return;
      stop();
      if (!isPrimaryButton(release) || button.isConnected || moved(release) || view.location.href !== href) return;
      const replacement = release.composedPath().find(node => {
        const popup = toolbarPopups.get(node);
        return popup?.kind === kind && popup.id === id;
      });
      if (!replacement) return;
      // HA can replace a view between pointer events. Give a native click on
      // the replacement the first chance to open the popup.
      view.setTimeout(() => {
        if (view.location.href === href && replacement.isConnected && !replacement.hidden && !replacement.disabled &&
            toolbarPopups.get(replacement).canOpen()) replacement.click();
      }, 0);
    }, options);
  });
}
