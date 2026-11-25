const toolbarPopups = new WeakMap();
const watchedLaunchScreens = new WeakSet();
const moveLimit = 8;
const pressTimeout = 650;
const visibleThroughSplash = .25;

function isPrimaryButton(event) {
  return event.isTrusted && event.isPrimary && event.button === 0 &&
    ['mouse', 'pen', 'touch'].includes(event.pointerType) &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

function trackRelease(view, event, acceptRelease) {
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
    if (isPrimaryButton(release) && !moved(release) && view.location.href === href) acceptRelease(release, href);
  }, options);
}

function matchingPopup(button, kind, id) {
  const popup = toolbarPopups.get(button);
  return popup?.kind === kind && popup.id === id;
}

function canOpen(button, throughLaunch) {
  if (!button?.isConnected || button.hidden || button.disabled) return false;
  const popup = toolbarPopups.get(button);
  return popup?.canOpen() && (!throughLaunch || popup.inActiveDashboard());
}

function deferOpen(view, href, button, throughLaunch = false) {
  // Give the browser's click the first chance when the native target changes.
  view.setTimeout(() => {
    if (view.location.href === href && canOpen(button, throughLaunch)) button.click();
  }, 0);
}

function fadingSplash(view, splash, event) {
  return event.composedPath().includes(splash) && splash.classList.contains('removing') &&
    !event.target.closest?.('button,a,input,select,textarea,[role="button"]') &&
    Number(view.getComputedStyle(splash).opacity) <= visibleThroughSplash;
}

function popupUnderSplash(splash, { clientX, clientY }) {
  let root = splash.ownerDocument;
  while (root) {
    // Skip only the native splash. Any other overlay above the button wins.
    const hit = root.elementsFromPoint?.(clientX, clientY).find(element => !splash.contains(element));
    if (!hit) return;
    const button = hit.closest('button');
    if (button) {
      if (toolbarPopups.has(button) && button.checkVisibility?.({ opacityProperty:true, visibilityProperty:true }) !== false) {
        return button;
      }
      return;
    }
    if (hit.shadowRoot === root) return;
    root = hit.shadowRoot;
  }
}

function watchLaunchScreen(doc) {
  const splash = doc.querySelector('body > div#ha-launch-screen');
  if (!splash || watchedLaunchScreens.has(splash)) return;
  watchedLaunchScreens.add(splash);
  const view = doc.defaultView;
  splash.addEventListener('pointerdown', event => {
    if (!isPrimaryButton(event) || !fadingSplash(view, splash, event)) return;
    const button = popupUnderSplash(splash, event);
    if (!canOpen(button, true)) return;
    const { kind, id } = toolbarPopups.get(button);
    trackRelease(view, event, (release, href) => {
      const next = splash.isConnected
        ? fadingSplash(view, splash, release) && popupUnderSplash(splash, release)
        : release.composedPath().find(node => matchingPopup(node, kind, id));
      if (next && matchingPopup(next, kind, id)) deferOpen(view, href, next, true);
    });
  });
}

export function preserveToolbarPopupPress(button, kind, id, canOpen, inActiveDashboard) {
  toolbarPopups.set(button, { kind, id, canOpen, inActiveDashboard });
  watchLaunchScreen(button.ownerDocument);
  const view = button.ownerDocument.defaultView;
  button.addEventListener('pointerdown', event => {
    if (!isPrimaryButton(event) || event.pointerType === 'touch') return;
    trackRelease(view, event, (release, href) => {
      if (button.isConnected) return;
      const replacement = release.composedPath().find(node => matchingPopup(node, kind, id));
      if (replacement) deferOpen(view, href, replacement);
    });
  });
}
