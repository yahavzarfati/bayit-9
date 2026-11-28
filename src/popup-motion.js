const HOLD_MS = 500;
const HOLD_SLOP = 12;
const HOLD_HAPTIC = 'heavy';
const TRAILING_CLICK_MS = 700;
const OPEN_MS = 190;
const CLOSE_MS = 220;
const EASING = 'cubic-bezier(.2,.65,.22,1)';

function isActivationKey(event) {
  return event.key === 'Enter' || event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}

function isDetailsKey(event) {
  return event.key === 'ContextMenu' || (event.shiftKey && (event.key === 'F10' || isActivationKey(event)));
}

export function bindDeviceDetails(button, openDetails, {
  requireShortTap = false, activationStart, pointerSurface = button, holdOnRelease = pointerSurface !== button,
} = {}) {
  const requirePairedPointer = requireShortTap || !openDetails;
  const doc = button.ownerDocument;
  const view = doc.defaultView;
  let held;
  let suppressClickUntil = 0;
  let suppressKeyClickUntil = 0;
  let shortTapUntil = 0;

  function acceptsPointer(event) {
    if (pointerSurface === button) return true;
    const nearestButton = event.target.closest?.('button');
    return !nearestButton || nearestButton === button;
  }

  function consumePointerHoldClick(activation) {
    const listeners = new AbortController();
    const options = { signal: listeners.signal, capture: true };
    let timeout;
    const stop = () => {
      clearTimeout(timeout);
      listeners.abort();
    };
    doc.addEventListener('pointerdown', stop, options);
    doc.addEventListener('click', event => {
      if (!event.isTrusted || (event.detail <= 0 && !event.pointerType)) return;
      if (event.pointerType && (event.pointerType !== activation.pointerType || event.pointerId !== activation.pointerId)) return;
      stop();
      event.preventDefault();
      event.stopImmediatePropagation();
    }, options);
    view?.addEventListener('blur', event => { if (event.target === view) stop(); }, options);
    return () => {
      if (!listeners.signal.aborted) timeout = setTimeout(stop, TRAILING_CLICK_MS);
    };
  }

  function finishPointer() {
    if (!held) return;
    clearTimeout(held.timer);
    held.listeners.abort();
    if (held.handled) suppressClickUntil = performance.now() + TRAILING_CLICK_MS;
    held.releaseClickGuard?.();
    held = undefined;
  }

  function canHold() {
    return button.isConnected && !button.disabled && !button.closest('[inert]');
  }

  function acknowledgeHold() {
    if (!held || held.feedbackSent || !openDetails || !held.touch || !held.activation.isTrusted || !canHold()) return;
    held.feedbackSent = true;
    const bridge = view?.webkit?.messageHandlers?.externalBus;
    if (typeof bridge?.postMessage === 'function') {
      try {
        bridge.postMessage({ id: 0, type: 'haptic', payload: { hapticType: HOLD_HAPTIC } });
        return;
      } catch {
        // Let the Home Assistant frontend forward feedback if the bridge is unavailable.
      }
    }
    button.dispatchEvent(new CustomEvent('haptic', { detail: HOLD_HAPTIC, bubbles: true, composed: true }));
  }

  function handleHold() {
    if (!held || held.handled || !canHold()) return;
    held.handled = true;
    suppressClickUntil = Infinity;
    // Opening on release can retarget the following compatibility click to the modal.
    if (holdOnRelease && held.activation.isTrusted) held.releaseClickGuard = consumePointerHoldClick(held.activation);
    acknowledgeHold();
    openDetails?.(held.activation);
  }

  if (openDetails) {
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-keyshortcuts', 'Shift+Enter Shift+Space Shift+F10 ContextMenu');
  }
  pointerSurface.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || button.disabled || !acceptsPointer(event)) return;
    finishPointer();
    activationStart?.();
    suppressClickUntil = 0;
    shortTapUntil = 0;
    const listeners = new AbortController();
    const options = { signal: listeners.signal, capture: true };
    held = { id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch',
      startedAt: performance.now(), eventTime: event.timeStamp, activation: event, listeners };
    // A held Home control can acknowledge the touch while leaving scrolling and opening to the release path.
    if (!holdOnRelease || (openDetails && held.touch && event.isTrusted)) {
      held.timer = setTimeout(() => {
        if (!button.isConnected) finishPointer();
        else if (holdOnRelease) acknowledgeHold();
        else handleHold();
      }, HOLD_MS);
    }
    doc.addEventListener('pointermove', move => {
      if (held && move.pointerId === held.id && !held.handled &&
          Math.hypot(move.clientX - held.x, move.clientY - held.y) > HOLD_SLOP) finishPointer();
    }, options);
    const release = end => {
      if (end.pointerId !== held?.id) return;
      const stayedWithinHold = !holdOnRelease || Math.hypot(end.clientX - held.x, end.clientY - held.y) <= HOLD_SLOP;
      if (end.type === 'pointerup' && stayedWithinHold) {
        const now = performance.now();
        // The release can arrive before a delayed timer callback.
        const elapsed = Math.max(now - held.startedAt, end.timeStamp - held.eventTime);
        if (elapsed >= HOLD_MS) handleHold();
        if (requirePairedPointer && !held.handled && end.composedPath().includes(pointerSurface) && acceptsPointer(end)) {
          shortTapUntil = now + TRAILING_CLICK_MS;
        }
      }
      finishPointer();
    };
    doc.addEventListener('pointerup', release, options);
    pointerSurface.addEventListener('pointerup', release, options);
    doc.addEventListener('pointercancel', release, options);
    view?.addEventListener('blur', event => { if (event.target === view) finishPointer(); }, options);
  });
  // Mobile browsers may start the callout before the hold timer has run.
  pointerSurface.addEventListener('contextmenu', event => {
    if ((!held?.touch && !held?.handled) || !acceptsPointer(event)) return;
    event.preventDefault();
    if (!holdOnRelease) handleHold();
  });
  pointerSurface.addEventListener('click', event => {
    if (!acceptsPointer(event)) return;
    if (requireShortTap && !event.isTrusted) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const byPointer = event.detail > 0 || Boolean(event.pointerType);
    const now = performance.now();
    if (byPointer && requirePairedPointer && shortTapUntil > 0 && now <= shortTapUntil) {
      shortTapUntil = 0;
      return;
    }
    const deadline = byPointer ? suppressClickUntil : suppressKeyClickUntil;
    if ((!byPointer || !requirePairedPointer) && now > deadline) return;
    if (byPointer) suppressClickUntil = 0;
    else suppressKeyClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  button.addEventListener('keydown', event => {
    if (button.disabled) return;
    if (!isDetailsKey(event)) {
      if (isActivationKey(event)) {
        if (requireShortTap && event.repeat) {
          event.preventDefault();
          return;
        }
        activationStart?.();
        suppressKeyClickUntil = 0;
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    // Suppress the paired key release even when dialog focus has moved.
    const guardClick = isActivationKey(event);
    if (guardClick) suppressKeyClickUntil = Infinity;
    const key = event.code || event.key;
    const listeners = new AbortController();
    const options = { signal: listeners.signal, capture: true };
    const finishKey = () => {
      if (guardClick) suppressKeyClickUntil = performance.now() + TRAILING_CLICK_MS;
      listeners.abort();
    };
    doc.addEventListener('keyup', release => {
      if ((release.code || release.key) !== key) return;
      release.preventDefault();
      finishKey();
    }, options);
    view?.addEventListener('blur', finishKey, options);
    openDetails?.(event);
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

  function finishDrivenAnimation(context) {
    if (!context.frameDrivenAnimation) return;
    context.frameDrivenAnimation = false;
    context.animation?.finish();
  }

  function stopFrame(context) {
    if (context.frame) {
      view.cancelAnimationFrame(context.frame);
      context.frame = 0;
    }
    finishDrivenAnimation(context);
  }

  function stopAnimation(context) {
    context.frameDrivenAnimation = false;
    context.animation?.cancel();
    context.animation = undefined;
  }

  function setScroll(context, position) {
    clip.scrollTop = position;
    context.expectedScroll = clip.scrollTop;
  }

  function onScroll() {
    if (!current || current.suspended || Math.abs(clip.scrollTop - current.expectedScroll) <= 1.5) return;
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

  function watchPage() {
    view.addEventListener('resize', reposition);
    view.visualViewport?.addEventListener('resize', reposition);
    view.addEventListener('pagehide', suspendMotion);
    view.addEventListener('pageshow', resumeMotion);
    doc.addEventListener('visibilitychange', onVisibilityChange);
  }

  function onVisibilityChange() {
    if (doc.visibilityState === 'hidden') suspendMotion();
    else resumeMotion();
  }

  function suspendMotion() {
    const context = current;
    if (!context) return;
    if (context.closing) {
      finishDismissal(context);
      return;
    }
    context.suspended = true;
    // An iPhone can suspend animation frames until long after the easing has elapsed.
    stopFrame(context);
    stopAnimation(context);
  }

  function resumeMotion() {
    const context = current;
    if (!context?.suspended || !dialog.open) return;
    context.suspended = false;
    context.expectedScroll = clip?.scrollTop;
    updateArea(context);
    if (isConnected(context.source)) setOrigin(context.source.getBoundingClientRect(), dialog.getBoundingClientRect());
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
      if (current !== context || context.externalScroll || !isConnected(clip)) {
        context.frame = 0;
        finishDrivenAnimation(context);
        return;
      }
      const elapsed = Math.max(0, Math.min(duration, now - started));
      const progress = elapsed / duration;
      const ease = 1 - Math.pow(1 - progress, 3);
      setScroll(context, start + (target - start) * ease);
      onFrame?.(clip.scrollTop - start);
      // WebKit can advance an autonomous reveal ahead of the scroll callback.
      // Seek the reveal only after committing this frame's scroll and origin.
      if (context.frameDrivenAnimation) {
        if (progress === 1) finishDrivenAnimation(context);
        else context.animation.currentTime = elapsed;
      }
      context.frame = progress < 1 ? view.requestAnimationFrame(frame) : 0;
    };
    context.frame = view.requestAnimationFrame(frame);
  }

  function liftSource(context, sourceRect, panelRect, duration) {
    if (!isConnected(clip) || !clip.contains(context.source) || context.externalScroll) return 0;
    if (!['auto', 'scroll'].includes(view.getComputedStyle(clip).overflowY)) return 0;
    const start = clip.scrollTop;
    const visibleTop = clip.getBoundingClientRect().top;
    const cardBottom = context.kind === 'room' ? context.highlighted.getBoundingClientRect().bottom : sourceRect.bottom;
    const roomGap = context.kind === 'room' ? 8 : 24;
    const desired = Math.max(0, cardBottom + roomGap - panelRect.top);
    const beforeClip = sourceRect.top - visibleTop - 4;
    const sourceLimit = context.kind === 'room' ? beforeClip : Math.max(0, beforeClip);
    const target = Math.max(0, start + Math.min(desired, sourceLimit));
    if (Math.abs(target - start) < .5) return 0;
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
    const destination = Math.min(target, available);
    scrollByAnimation(context, destination, duration,
      moved => setOrigin(sourceRect, panelRect, moved));
    return destination - start;
  }

  function runAnimation(context, from, to, { duration, delay = 0, frameDriven = false }, finished) {
    if (media.matches || typeof dialog.animate !== 'function') {
      finished?.();
      return;
    }
    const animation = dialog.animate([from, to], { duration, delay, fill: 'backwards', easing: EASING });
    context.animation = animation;
    if (frameDriven) {
      animation.pause();
      animation.currentTime = 0;
      context.frameDrivenAnimation = true;
    }
    void animation.finished.then(() => {
      if (current !== context || context.animation !== animation) return;
      context.frameDrivenAnimation = false;
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
    view.removeEventListener('pagehide', suspendMotion);
    view.removeEventListener('pageshow', resumeMotion);
    doc.removeEventListener('visibilitychange', onVisibilityChange);
    clip?.removeEventListener('scroll', onScroll);
    context.spacer?.remove();
    if (isConnected(clip) && context.originalScroll !== undefined && !context.externalScroll) {
      clip.scrollTop = context.originalScroll;
    }
    for (const property of ['--motion-x', '--motion-y', '--bayit-popup-area-top']) dialog.style.removeProperty(property);
    delete dialog.dataset.kind;
    dialog.removeAttribute('data-room-position');
    dialog.removeAttribute('data-centered-toolbar');
    dialog.removeAttribute('data-pointer-open');
    delete dialog.dataset.closing;
    current = undefined;
    if (restoreFocus) focusWithoutScroll(context.source);
  }

  function reposition() {
    const context = current;
    if (!context || context.closing || context.suspended || !dialog.open) return;
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

  function setDialogPosition(kind, roomPosition, centeredToolbar) {
    dialog.dataset.kind = kind;
    dialog.toggleAttribute('data-room-position', roomPosition);
    dialog.toggleAttribute('data-centered-toolbar', centeredToolbar);
  }

  function open(source, { kind = 'toolbar', roomPosition = false, centeredToolbar = false,
    highlighted = source, activation } = {}) {
    if (!isConnected(dialog)) return;
    const focusTarget = dialog.querySelector('[autofocus]');
    // Preserve modal focus without drawing WebKit's keyboard outline after a real tap.
    const pointerOpen = activation?.isTrusted === true && (activation.detail > 0 || Boolean(activation.pointerType));
    if (!source) {
      resetContext(current, false);
      current = { kind };
      setDialogPosition(kind, roomPosition, centeredToolbar);
      updateArea(current);
      if (!dialog.open) dialog.showModal();
      watchPage();
      focusWithoutScroll(focusTarget);
      return;
    }
    if (dialog.open && current) {
      const context = current;
      dialog.toggleAttribute('data-pointer-open', pointerOpen);
      stopFrame(context);
      if (context.closing) stopAnimation(context);
      context.closing = false;
      context.restoreFocus = true;
      delete dialog.dataset.closing;
      setDialogPosition(kind, roomPosition, centeredToolbar);
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
    setDialogPosition(kind, roomPosition, centeredToolbar);
    dialog.toggleAttribute('data-pointer-open', pointerOpen);
    const area = measureArea();
    updateArea(context, area);
    if (!dialog.open) dialog.showModal();
    const panelRect = dialog.getBoundingClientRect();
    context.highlighted.dataset.popupOrigin = '';
    watchPage();
    clip?.addEventListener('scroll', onScroll, { passive: true });
    setOrigin(sourceRect, panelRect);
    const distance = liftSource(context, sourceRect, panelRect, media.matches ? 0 : OPEN_MS);
    const band = Math.max(1, panelRect.top - area.top);
    // Give longer room lifts a head start. Invert the scroll easing to place the
    // reveal near the context band, while keeping the whole opening within OPEN_MS.
    const delay = kind === 'room' && distance > band
      ? OPEN_MS * Math.min(.45, 1 - Math.cbrt(band / distance)) : 0;
    runAnimation(context, { transform: 'scale(.35)', opacity: 0 }, { transform: 'none', opacity: 1 },
      { duration: OPEN_MS - delay, delay, frameDriven: delay > 0 });
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
    if (!context?.source || context.suspended || immediate || media.matches) {
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
    runAnimation(context, from, { transform: 'scale(.35)', opacity: 0 }, { duration: CLOSE_MS }, () => finishDismissal(context));
  }

  function reset() {
    resetContext(current, false);
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('keydown', event => {
    if (event.isTrusted) dialog.removeAttribute('data-pointer-open');
  }, true);
  dialog.addEventListener('close', () => {
    if (!dialog.open) resetContext(current, current?.restoreFocus !== false);
  });
  return { open, dismiss, reset };
}
