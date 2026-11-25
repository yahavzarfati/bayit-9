const OWNED = 'data-bayit-page-chrome';
const EARLY_LEASE_MS = 1800;
const DIALOG_LOAD_MS = 2000;
const NATIVE_DIALOG = 'dialog[open], ha-dialog[open], ha-md-dialog[open]';
const elements = new WeakMap();
const early = new WeakMap();

const ROOT_CSS = `
  :host([${OWNED}]) > div:not(.edit-mode) > .header { display: none !important; }
  :host([${OWNED}]) > div:not(.edit-mode) > hui-view-container#view {
    --bayit-page-safe-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    padding-left: var(--safe-area-inset-left, 0px) !important;
    padding-right: var(--safe-area-inset-right, 0px) !important;
    min-height: 100dvh;
  }
`;
const MAIN_CSS = `
  :host([${OWNED}]) {
    --ha-sidebar-width: 0px !important;
    --mdc-drawer-width: 0px !important;
  }
  :host([${OWNED}]) ha-drawer:not([open]) > ha-sidebar { display: none !important; }
`;
const DRAWER_CSS = `
  :host([${OWNED}]:not([open])) > .layout > .sidebar-shell,
  :host([${OWNED}]:not([open])) > .mdc-drawer,
  :host([${OWNED}]:not([open])) > wa-drawer { display: none !important; }
  :host([${OWNED}]:not([open])) > .layout > .app-content {
    padding-inline-start: 0 !important;
    transition: none !important;
  }
`;

const direct = (container, selector) =>
  Array.from(container?.children ?? []).find(element => element.matches(selector));

function locate(doc, card) {
  const app = doc.querySelector('home-assistant');
  const main = direct(app?.shadowRoot, 'home-assistant-main');
  const drawer = direct(main?.shadowRoot, 'ha-drawer');
  const resolver = direct(drawer, 'partial-panel-resolver[slot="appContent"]');
  const panel = direct(resolver, 'ha-panel-lovelace') ?? direct(resolver?.shadowRoot, 'ha-panel-lovelace');
  const root = direct(panel?.shadowRoot, 'hui-root');
  if (!panel || (root && (root.embedded || root.hasAttribute('embedded')))) return null;
  if (card) {
    let parent = card;
    let panelView = false;
    while (parent && parent !== root) {
      if (parent.matches('hui-card-preview, ha-dialog, ha-md-dialog, dialog')) return null;
      panelView ||= parent.localName === 'hui-panel-view';
      parent = parent.parentElement ?? parent.getRootNode().host;
    }
    if (!root || parent !== root || !panelView) return null;
  }
  return { app, main, drawer, resolver, panel, root, wrapper: direct(root?.shadowRoot, 'div') };
}

function routeId(pathname) {
  const [, dashboard, view, ...rest] = pathname.replace(/\/+$/, '').split('/');
  return dashboard && !rest.length && (view === undefined || view === 'home' || view === '0')
    ? dashboard : null;
}

export function homePreferencePaths(pathname) {
  const id = routeId(pathname);
  if (!id) return [pathname];
  const root = '/' + id;
  // Keep the original named Home key authoritative and read older aliases.
  return [...new Set([
    root + '/home', root + '/0', root + '/home/', root, root + '/0/', root + '/', pathname,
  ])];
}

function canControl(targets, id) {
  return Boolean(targets && id && targets.panel.panel?.url_path === id);
}

export function isActiveDashboardPage(card) {
  if (!card.isConnected) return false;
  const doc = card.ownerDocument;
  const view = doc.defaultView;
  const url = new URL(view.location.href);
  const target = locate(doc, card);
  return canControl(target, routeId(url.pathname)) &&
    !url.searchParams.has('edit') && !url.searchParams.has('disable_km') &&
    !target.wrapper?.classList.contains('edit-mode') && !target.root?.lovelace?.editMode &&
    !target.panel.lovelace?.editMode && !target.drawer.open && !target.drawer.hasAttribute('open') &&
    !view.history.state?.dialog;
}

function release(host, owner) {
  const record = elements.get(host);
  if (!record) return;
  record.owners.delete(owner);
  if (record.owners.size) return;
  record.style.remove();
  host.removeAttribute(OWNED);
  elements.delete(host);
}

function claim(host, css, owner) {
  if (!host?.shadowRoot) return;
  let record = elements.get(host);
  if (!record) {
    const style = host.ownerDocument.createElement('style');
    style.textContent = css;
    host.shadowRoot.append(style);
    host.setAttribute(OWNED, '');
    record = { style, owners: new Set() };
    elements.set(host, record);
  }
  record.owners.add(owner);
}

function watch(doc, find, { editing = () => false, onChange, expired } = {}) {
  const win = doc.defaultView;
  const owner = {};
  const dialogs = new Map();
  const abort = new win.AbortController();
  const observer = new win.MutationObserver(refresh);
  let hidden = new Set();
  let observed = [];
  let stopped = false;

  function setHidden(next) {
    const changed = Boolean(hidden.size) !== Boolean(next.size);
    for (const [host, css] of next) if (!hidden.has(host)) claim(host, css, owner);
    for (const host of hidden) if (!next.has(host)) release(host, owner);
    hidden = new Set(next.keys());
    if (changed) onChange?.(Boolean(hidden.size));
  }

  function refresh() {
    if (stopped) return;
    const current = new URL(win.location.href);
    const target = find(routeId(current.pathname));
    if (!target && expired) {
      expired();
      return;
    }
    const roots = target
      ? [target.app, target.main, target.drawer, target.panel, target.root]
        .map(element => element?.shadowRoot).filter(Boolean)
      : [];
    const nodes = target ? [...roots, target.resolver, target.drawer, target.wrapper].filter(Boolean) : [];
    if (nodes.length !== observed.length || nodes.some((node, index) => observed[index] !== node)) {
      observer.disconnect();
      roots.forEach(root => observer.observe(root, { childList: true }));
      if (target) {
        observer.observe(target.resolver, { childList: true });
        observer.observe(target.drawer, { attributes: true, attributeFilter: ['open'] });
        if (target.wrapper) observer.observe(target.wrapper, { attributes: true, attributeFilter: ['class'] });
      }
      observed = nodes;
    }
    const nativeDialog = win.history.state?.dialog || dialogs.size ||
      roots.some(root => root.querySelector(NATIVE_DIALOG));
    const suspended = !target || editing() || current.searchParams.has('edit') ||
      current.searchParams.has('disable_km') || target.wrapper?.classList.contains('edit-mode') ||
      target.root?.lovelace?.editMode || target.panel.lovelace?.editMode ||
      target.drawer.open || target.drawer.hasAttribute('open') || nativeDialog;
    setHidden(suspended ? new Map() : new Map([
      [target.main, MAIN_CSS], [target.drawer, DRAWER_CSS], [target.root, ROOT_CSS],
    ].filter(([host]) => host?.shadowRoot)));
  }

  function closeDialog(tag) {
    win.clearTimeout(dialogs.get(tag));
    dialogs.delete(tag);
  }

  const options = { signal: abort.signal };
  for (const event of ['location-changed', 'popstate', 'hashchange', 'pageshow']) {
    win.addEventListener(event, refresh, options);
  }
  win.navigation?.addEventListener('currententrychange', refresh, options);
  win.addEventListener('show-dialog', event => {
    const tag = event.detail?.dialogTag;
    if (typeof tag !== 'string' || !/^[a-z][a-z0-9-]*$/.test(tag) || tag === 'notification-manager' ||
        !find(routeId(win.location.pathname))) return;
    closeDialog(tag);
    dialogs.set(tag, win.setTimeout(() => {
      const target = find(routeId(win.location.pathname));
      const hosts = [event.target, target?.app, target?.main, target?.panel, target?.root];
      const dialog = hosts.some(host => direct(host?.shadowRoot, tag));
      if (!dialog) closeDialog(tag);
      refresh();
    }, DIALOG_LOAD_MS));
    refresh();
  }, { ...options, capture: true });
  win.addEventListener('dialog-closed', event => {
    closeDialog(event.detail?.dialog);
    // Home Assistant updates its dialog history after emitting this event.
    win.setTimeout(refresh, 0);
  }, options);

  return {
    refresh,
    stop() {
      if (stopped) return;
      stopped = true;
      abort.abort();
      observer.disconnect();
      for (const tag of dialogs.keys()) closeDialog(tag);
      setHidden(new Map());
    },
  };
}

export function preparePageChrome({ enabled, hass, doc = globalThis.document } = {}) {
  if (!enabled || !doc?.defaultView) return;
  const win = doc.defaultView;
  const id = routeId(win.location.pathname);
  if (!id || hass?.panels?.[id]?.component_name !== 'lovelace' || !canControl(locate(doc), id)) return;
  early.get(doc)?.();
  const lease = watch(doc, current => {
    const targets = locate(doc);
    return current === id && canControl(targets, id) ? targets : null;
  }, { expired: stop });
  const timeout = win.setTimeout(stop, EARLY_LEASE_MS);
  early.set(doc, stop);
  lease.refresh();

  function stop() {
    win.clearTimeout(timeout);
    lease.stop();
    if (early.get(doc) === stop) early.delete(doc);
  }
}

function suppressRetiringLaunchScreen(doc) {
  const splash = doc.querySelector('body > div#ha-launch-screen');
  if (!splash || !doc.head) return;
  const rule = doc.createElement('style');
  rule.setAttribute('data-bayit-launch-handoff', '');
  rule.textContent = `
    body > div#ha-launch-screen.removing:not(:has(button,a,input,select,textarea,[role="button"],[role="link"])) {
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  // Keep Home Assistant’s opacity transition and its own removal lifecycle intact.
  const observer = new doc.defaultView.MutationObserver(() => { if (splash.parentNode !== doc.body) stop(); });
  observer.observe(doc.body, { childList: true });
  doc.head.append(rule);
  return stop;

  function stop() {
    observer.disconnect();
    rule.remove();
  }
}

export function createPageChrome(card, { onChange } = {}) {
  let lease;
  let editing = false;
  let dashboardId;
  let ownsPage = false;
  let rendered = false;
  let releaseLaunch;
  const doc = card.ownerDocument;
  const win = doc.defaultView;
  const find = id => {
    if (dashboardId && dashboardId !== id) return null;
    const targets = card.isConnected && locate(doc, card);
    if (!canControl(targets, id)) return null;
    dashboardId = id;
    return targets;
  };

  function setBypass(show) {
    if (!lease || !find(routeId(win.location.pathname))) return false;
    const url = new URL(win.location.href);
    if (show) url.searchParams.set('disable_km', '1');
    else url.searchParams.delete('disable_km');
    if (url.href !== win.location.href) {
      win.history.replaceState(win.history.state, '', url);
      win.dispatchEvent(new win.CustomEvent('location-changed', { detail: { replace: true } }));
    }
    return true;
  }

  function updateLaunchHandoff() {
    if (ownsPage && rendered) releaseLaunch ??= suppressRetiringLaunchScreen(doc);
    else {
      releaseLaunch?.();
      releaseLaunch = undefined;
    }
  }

  function changed(owned) {
    ownsPage = owned;
    updateLaunchHandoff();
    onChange?.(owned);
  }

  function dispose() {
    lease?.stop();
    lease = undefined;
    dashboardId = undefined;
    rendered = false;
  }

  return {
    update({ enabled, editing: nextEditing } = {}) {
      editing = Boolean(nextEditing);
      if (!enabled || !card.isConnected || !win) {
        dispose();
        return;
      }
      lease ??= watch(doc, find, { editing: () => editing, onChange: changed });
      lease.refresh();
      if (find(routeId(win.location.pathname))) early.get(doc)?.();
    },
    markRendered() {
      if (!lease || rendered) return;
      rendered = true;
      updateLaunchHandoff();
    },
    showHomeAssistantMenu: () => setBypass(true),
    toggleHomeAssistantMenu: () => setBypass(!new URL(win.location.href).searchParams.has('disable_km')),
    dispose,
  };
}
