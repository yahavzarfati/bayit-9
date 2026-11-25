const HOLD_MS = 500;
const HOLD_SLOP = 12;
const OPEN_MS = 190;
const CLOSE_MS = 220;
const EASING = 'cubic-bezier(.2,.65,.22,1)';

function isDetailsKey(event) {
  return event.key === 'ContextMenu' || (event.shiftKey &&
    (event.key === 'F10' || event.key === 'Enter' || event.code === 'Space' || event.key === ' '));
}

export function bindDeviceDetails(button, openDetails) {
  const doc = button.ownerDocument;
  const view = doc.defaultView;
  let held;
  let suppressClickUntil = 0;

  function finishPointer() {
    if (!held) return;
    clearTimeout(held.timer);
    held.listeners.abort();
    if (held.opened) suppressClickUntil = performance.now() + 700;
    held = undefined;
  }

  function showDetails() {
    if (!held || held.opened || !button.isConnected || button.disabled) return;
    held.opened = true;
    suppressClickUntil = Infinity;
    openDetails();
  }

  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-keyshortcuts', 'Shift+Enter Shift+Space Shift+F10 ContextMenu');
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || button.disabled) return;
    finishPointer();
    suppressClickUntil = 0;
    const listeners = new AbortController();
    const options = { signal: listeners.signal, capture: true };
    held = { id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch', listeners };
    held.timer = setTimeout(() => {
      if (!button.isConnected) finishPointer();
      else showDetails();
    }, HOLD_MS);
    doc.addEventListener('pointermove', move => {
      if (held && move.pointerId === held.id && !held.opened &&
          Math.hypot(move.clientX - held.x, move.clientY - held.y) > HOLD_SLOP) finishPointer();
    }, options);
    const release = end => { if (end.pointerId === held?.id) finishPointer(); };
    doc.addEventListener('pointerup', release, options);
    doc.addEventListener('pointercancel', release, options);
    view?.addEventListener('blur', finishPointer, options);
  });
  // Mobile browsers may start the callout before the hold timer has run.
  button.addEventListener('contextmenu', event => {
    if (!held?.touch && !held?.opened) return;
    event.preventDefault();
    showDetails();
  });
  button.addEventListener('click', event => {
    const byPointer = event.detail > 0 || Boolean(event.pointerType);
    if (!byPointer || performance.now() > suppressClickUntil) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  button.addEventListener('keydown', event => {
    if (button.disabled || !isDetailsKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    // Opening the dialog moves focus, so release may arrive somewhere else.
    const key = event.code || event.key;
    const listeners = new AbortController();
    const options = { signal: listeners.signal, capture: true };
    doc.addEventListener('keyup', release => {
      if ((release.code || release.key) !== key) return;
      release.preventDefault();
      listeners.abort();
    }, options);
    view?.addEventListener('blur', () => listeners.abort(), options);
    openDetails();
  });
}

function isConnected(node) {
  return node?.isConnected === true;
}

function focusWithoutScroll(node) {
  if (isConnected(node) && !node.disabled) node.focus({ preventScroll: true });
}

export function createPopupMotion({ dialog, clip, toolbar }) {
  const doc = dialog.ownerDocument;
  const view = doc.defaultView;
  const media = view.matchMedia('(prefers-reduced-motion: reduce)');
  let current;

  function stopFrame(context) {
    if (!context.frame) return;
    view.cancelAnimationFrame(context.frame);
    context.frame = 0;
  }

  function stopAnimation(context) {
    context.animation?.cancel();
    context.animation = undefined;
  }

  function setScroll(context, position) {
    clip.scrollTop = position;
    context.expectedScroll = clip.scrollTop;
  }

  function onScroll() {
    if (!current || Math.abs(clip.scrollTop - current.expectedScroll) <= 1.5) return;
    current.externalScroll = true;
    stopFrame(current);
  }

  function measureArea() {
    const bounds = clip?.getBoundingClientRect();
    const toolbarBottom = toolbar?.getBoundingClientRect().bottom ?? 0;
    const viewport = view.visualViewport;
    return {
      top: Number.isFinite(bounds?.top) && bounds.top >= 0 ? bounds.top : toolbarBottom,
      viewportHeight: view.innerHeight,
      geometry: [view.innerWidth, view.innerHeight, viewport?.width, viewport?.height,
        viewport?.offsetLeft, viewport?.offsetTop, bounds?.left, bounds?.top, bounds?.width, bounds?.height, toolbarBottom],
    };
  }

  function updateArea(context, { top, viewportHeight, geometry } = measureArea()) {
    context.geometry = geometry;
    const roomTop = Math.min(Math.max(0, top + 86), Math.max(0, viewportHeight - 180));
    dialog.style.setProperty('--bayit-popup-area-top', roomTop + 'px');
  }

  function watchResize() {
    view.addEventListener('resize', reposition);
    view.visualViewport?.addEventListener('resize', reposition);
  }

  function setOrigin(sourceRect, panelRect, delta = 0) {
    const x = sourceRect.left + sourceRect.width / 2 - panelRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - panelRect.top - delta;
    dialog.style.setProperty('--motion-x', x + 'px');
    dialog.style.setProperty('--motion-y', y + 'px');
  }

  function scrollByAnimation(context, target, duration, onFrame) {
    stopFrame(context);
    const start = clip.scrollTop;
    if (!duration || Math.abs(start - target) < .5) {
      setScroll(context, target);
      onFrame?.(clip.scrollTop - start);
      return;
    }
    const started = view.performance.now();
    const frame = now => {
      if (current !== context || context.externalScroll || !isConnected(clip)) return;
      const progress = Math.min(1, (now - started) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setScroll(context, start + (target - start) * ease);
      onFrame?.(clip.scrollTop - start);
      context.frame = progress < 1 ? view.requestAnimationFrame(frame) : 0;
    };
    context.frame = view.requestAnimationFrame(frame);
  }

  function liftSource(context, sourceRect, panelRect, duration) {
    if (!isConnected(clip) || !clip.contains(context.source) || context.externalScroll) return;
    if (!['auto', 'scroll'].includes(view.getComputedStyle(clip).overflowY)) return;
    const start = clip.scrollTop;
    const visibleTop = clip.getBoundingClientRect().top;
    const cardBottom = context.kind === 'room' ? context.highlighted.getBoundingClientRect().bottom : sourceRect.bottom;
    const roomGap = context.kind === 'room' ? 8 : 24;
    const desired = Math.max(0, cardBottom + roomGap - panelRect.top);
    const beforeClip = Math.max(0, sourceRect.top - visibleTop - 4);
    const target = start + Math.min(desired, beforeClip);
    if (target - start < .5) return;
    let available = Math.max(0, clip.scrollHeight - clip.clientHeight);
    if (target > available + .5) {
      const spacer = context.spacer ??= doc.createElement('div');
      if (!spacer.parentNode) {
        spacer.setAttribute('aria-hidden', 'true');
        spacer.dataset.popupSpacer = '';
        spacer.style.cssText = 'block-size:0;visibility:hidden;pointer-events:none;flex:none';
        clip.append(spacer);
      }
      // scrollHeight is never shorter than the viewport. Measure where the
      // content ends so a sparse grid's empty space counts toward the extension.
      const contentEnd = spacer.getBoundingClientRect().top - visibleTop - clip.clientTop + clip.scrollTop;
      const height = Math.ceil(Math.max(0, clip.clientHeight + target - contentEnd)) + 2;
      spacer.style.blockSize = height + 'px';
      available = Math.max(0, clip.scrollHeight - clip.clientHeight);
    }
    scrollByAnimation(context, Math.min(target, available), duration,
      moved => setOrigin(sourceRect, panelRect, moved));
  }

  function runAnimation(context, from, to, duration, finished) {
    if (media.matches || typeof dialog.animate !== 'function') {
      finished?.();
      return;
    }
    const animation = dialog.animate([from, to], { duration, easing: EASING });
    context.animation = animation;
    void animation.finished.then(() => {
      if (current !== context || context.animation !== animation) return;
      context.animation = undefined;
      finished?.();
    }, () => {});
  }

  function resetContext(context, restoreFocus) {
    if (!context) return;
    stopFrame(context);
    stopAnimation(context);
    context.highlighted?.removeAttribute('data-popup-origin');
    view.removeEventListener('resize', reposition);
    view.visualViewport?.removeEventListener('resize', reposition);
    clip?.removeEventListener('scroll', onScroll);
    context.spacer?.remove();
    if (isConnected(clip) && context.originalScroll !== undefined && !context.externalScroll) {
      clip.scrollTop = context.originalScroll;
    }
    for (const property of ['--motion-x', '--motion-y', '--bayit-popup-area-top']) dialog.style.removeProperty(property);
    delete dialog.dataset.kind;
    dialog.removeAttribute('data-room-position');
    delete dialog.dataset.closing;
    current = undefined;
    if (restoreFocus) focusWithoutScroll(context.source);
  }

  function reposition() {
    const context = current;
    if (!context || context.closing || !dialog.open) return;
    const area = measureArea();
    // Dashboard integrations can dispatch a resize without changing the layout.
    if (area.geometry.every((value, index) => value === context.geometry[index])) return;
    stopFrame(context);
    stopAnimation(context);
    updateArea(context, area);
    if (!isConnected(context.source)) return;
    const sourceRect = context.source.getBoundingClientRect();
    const panelRect = dialog.getBoundingClientRect();
    setOrigin(sourceRect, panelRect);
    liftSource(context, sourceRect, panelRect, 0);
  }

  function setDialogPosition(kind, roomPosition) {
    dialog.dataset.kind = kind;
    dialog.toggleAttribute('data-room-position', roomPosition);
  }

  function open(source, { kind = 'toolbar', roomPosition = false, highlighted = source } = {}) {
    if (!isConnected(dialog)) return;
    const focusTarget = dialog.querySelector('[autofocus]');
    if (!source) {
      resetContext(current, false);
      current = { kind };
      setDialogPosition(kind, roomPosition);
      updateArea(current);
      if (!dialog.open) dialog.showModal();
      watchResize();
      focusWithoutScroll(focusTarget);
      return;
    }
    if (dialog.open && current) {
      const context = current;
      stopFrame(context);
      if (context.closing) stopAnimation(context);
      context.closing = false;
      context.restoreFocus = true;
      delete dialog.dataset.closing;
      setDialogPosition(kind, roomPosition);
      updateArea(context);
      focusWithoutScroll(focusTarget);
      return;
    }
    if (!isConnected(source)) return;
    if (current) resetContext(current, false);
    const originalScroll = clip?.scrollTop;
    const sourceRect = source.getBoundingClientRect();
    const context = { source, highlighted: highlighted || source, kind, originalScroll, expectedScroll: originalScroll };
    current = context;
    setDialogPosition(kind, roomPosition);
    updateArea(context);
    if (!dialog.open) dialog.showModal();
    const panelRect = dialog.getBoundingClientRect();
    context.highlighted.dataset.popupOrigin = '';
    watchResize();
    clip?.addEventListener('scroll', onScroll, { passive: true });
    setOrigin(sourceRect, panelRect);
    liftSource(context, sourceRect, panelRect, media.matches ? 0 : OPEN_MS);
    runAnimation(context, { transform: 'scale(.35)', opacity: 0 }, { transform: 'none', opacity: 1 }, OPEN_MS);
    focusWithoutScroll(focusTarget);
  }

  function finishDismissal(context) {
    dialog.close();
    // The browser queues the close event. Release focus before another
    // control can open a panel against this previous context.
    if (current === context) resetContext(context, context?.restoreFocus !== false);
  }

  function dismiss({ immediate = false, restoreFocus = true } = {}) {
    if (!dialog.open) return;
    const context = current;
    if (!context?.source || immediate || media.matches) {
      if (context) context.restoreFocus = restoreFocus;
      finishDismissal(context);
      return;
    }
    if (context.closing) return;
    const styles = view.getComputedStyle(dialog);
    const from = { transform: styles.transform, opacity: styles.opacity };
    stopAnimation(context);
    context.closing = true;
    context.restoreFocus = restoreFocus;
    dialog.dataset.closing = '';
    if (isConnected(clip) && !context.externalScroll && context.originalScroll !== undefined) {
      scrollByAnimation(context, context.originalScroll, CLOSE_MS);
    }
    runAnimation(context, from, { transform: 'scale(.35)', opacity: 0 }, CLOSE_MS, () => finishDismissal(context));
  }

  function reset() {
    resetContext(current, false);
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    if (!dialog.open) resetContext(current, current?.restoreFocus !== false);
  });
  return { open, dismiss, reset };
}
