const mediaStates = new Set(['playing', 'paused', 'buffering', 'on', 'idle']);
const progressStates = new Set(['playing', 'paused', 'buffering']);
const cleanText = value => typeof value === 'string' ? value.trim().slice(0, 160) : '';

function artworkUrl(entity, value, origin) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value, origin);
    return url.origin === origin && url.pathname === '/api/media_player_proxy/' + entity
      && !url.username && !url.password && !url.hash ? url.href : '';
  } catch {
    return '';
  }
}

export function nowPlayingDetails(model, origin) {
  const attrs = model.attributes ?? {};
  const show = model.available && mediaStates.has(model.state);
  if (!show) return {};
  const app = cleanText(attrs.app_name) || cleanText(attrs.source);
  const title = cleanText(attrs.media_title) || app;
  const artist = cleanText(attrs.media_artist) || app;
  const duration = Math.floor(attrs.media_duration);
  const position = attrs.media_position;
  const hasProgress = progressStates.has(model.state) && Number.isFinite(attrs.media_duration) && duration > 0 &&
    Number.isFinite(position) && position >= 0;
  const updatedAt = model.state === 'playing' && typeof attrs.media_position_updated_at === 'string'
    ? Date.parse(attrs.media_position_updated_at) : NaN;
  return {
    title, artist: artist === title ? '' : artist,
    picture: artworkUrl(model.entity, attrs.entity_picture, origin),
    ...(hasProgress && { timeline: { duration, position, updatedAt } }),
  };
}

export function playbackSecond(timeline, now = Date.now()) {
  const advance = Number.isFinite(timeline.updatedAt) ? Math.max(0, (now - timeline.updatedAt) / 1000) : 0;
  return Math.floor(Math.min(timeline.duration, timeline.position + advance));
}

function timeLabel(seconds) {
  const pair = value => String(value).padStart(2, '0');
  const minutes = Math.floor(seconds / 60);
  const suffix = pair(seconds % 60);
  return minutes < 60 ? minutes + ':' + suffix : Math.floor(minutes / 60) + ':' + pair(minutes % 60) + ':' + suffix;
}

export function createNowPlaying({ host, dialog, make, icon, t }) {
  const view = host.ownerDocument.defaultView;
  const pathname = view.location.pathname;
  const element = make('div', 'now-playing');
  const art = make('span', 'now-playing-art');
  const picture = make('img');
  picture.alt = '';
  picture.hidden = true;
  picture.referrerPolicy = 'no-referrer';
  art.setAttribute('aria-hidden', 'true');
  art.append(icon('mdi:music-note'), picture);
  const info = make('div', 'now-playing-info');
  const title = make('strong', 'now-playing-title');
  const artist = make('span', 'now-playing-artist');
  info.append(title, artist);
  const timelineRow = make('div', 'now-playing-timeline');
  timelineRow.dir = 'ltr';
  const meter = make('progress');
  meter.setAttribute('aria-label', t('media_progress'));
  const elapsed = make('span', 'now-playing-elapsed');
  const duration = make('span', 'now-playing-duration');
  timelineRow.append(elapsed, meter, duration);
  element.append(art, info, timelineRow);
  host.append(element);
  let timeline;
  let interval;

  function active() {
    return element.isConnected && dialog?.open && !dialog.hasAttribute('data-closing') &&
      view.location.pathname === pathname;
  }
  function stop() {
    view.clearInterval(interval);
    interval = undefined;
  }
  function paintProgress() {
    if (!timeline || !active()) { stop(); return; }
    const second = playbackSecond(timeline);
    if (meter.value !== second) meter.value = second;
    const value = timeLabel(second);
    if (elapsed.textContent !== value) elapsed.textContent = value;
    if (second >= timeline.duration) stop();
  }
  function paintArtwork(url) {
    if (picture.getAttribute('src') === url) return;
    picture.hidden = true;
    picture.onload = () => { if (picture.getAttribute('src') === url) picture.hidden = false; };
    picture.onerror = () => { if (picture.getAttribute('src') === url) picture.hidden = true; };
    if (url) picture.setAttribute('src', url);
    else picture.removeAttribute('src');
  }
  return {
    update(model) {
      if (!active()) { stop(); return; }
      const { title: heading, artist: byline, picture: url, timeline: current } =
        nowPlayingDetails(model, view.location.origin);
      const name = heading || t('media_no_track');
      if (title.textContent !== name) title.textContent = name;
      if (artist.textContent !== (byline ?? '')) artist.textContent = byline ?? '';
      artist.hidden = !byline;
      paintArtwork(url ?? null);
      timeline = current;
      timelineRow.hidden = !timeline;
      if (!timeline) { stop(); return; }
      meter.max = timeline.duration;
      const total = timeLabel(Math.floor(timeline.duration));
      if (duration.textContent !== total) duration.textContent = total;
      paintProgress();
      if (Number.isFinite(timeline.updatedAt) && meter.value < timeline.duration) {
        interval ??= view.setInterval(paintProgress, 1000);
      } else stop();
    },
    dispose() { stop(); picture.removeAttribute('src'); },
  };
}

export const nowPlayingStyles = `
  .now-playing { display:grid; grid-template-columns:60px minmax(0,1fr); gap:8px 12px;
    align-items:center; padding:10px; margin-block-end:8px; border:1px solid var(--soft-line);
    border-radius:13px; background:var(--control); }
  .now-playing-art { display:grid; place-items:center; position:relative;
    inline-size:60px; block-size:60px; background:var(--glass); border-radius:10px; overflow:hidden; }
  .now-playing-art ha-icon { color:var(--secondary); }
  .now-playing-art img { position:absolute; inset:0; inline-size:100%; block-size:100%; object-fit:cover; }
  .now-playing-info { display:grid; align-content:center; gap:3px; min-inline-size:0; overflow-wrap:anywhere; }
  .now-playing-title { font-size:15px; color:var(--ink); line-height:1.2; }
  .now-playing-artist { font-size:13px; color:var(--secondary); }
  .now-playing-timeline { grid-column:1/-1; min-inline-size:0; display:grid; align-items:center;
    grid-template-columns:auto minmax(0,1fr) auto; gap:8px; font-size:12px; font-variant-numeric:tabular-nums; }
  .now-playing progress { inline-size:100%; min-inline-size:0; block-size:7px; accent-color:var(--warm); }
  .now-playing [hidden] { display:none !important; }
`;
