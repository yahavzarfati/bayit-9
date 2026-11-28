import { catalog, featuredWallpapers, wallpaperGroups } from './wallpaper-catalog.js';

export const wallpaperChoices = Object.freeze(Object.fromEntries(
  Object.entries(catalog).map(([id, { en, he }]) => [id, Object.freeze({ en, he })]),
));
export const personalWallpaperId = 'personal';

const allowedImage = /^image\/(?:png|jpeg|webp|avif|heic|heif)$/i;
const allowedExtension = /\.(?:png|jpe?g|webp|avif|heic|heif)$/i;
const acceptedTypes = 'image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif,.heic,.heif';
const sampleSize = 32;
const maxPhotoBytes = 20 * 1024 * 1024;
const maxPhotoSide = 2048;
const sharedPhotoTimeout = 10000;
const revisionDebounce = 120;
const revisionInterval = 2000;
const databaseName = 'bayit-9-wallpapers';
const photoStore = 'personal';
const thumbnailPattern = /^data:image\/jpeg;base64,[+/=a-z0-9]+$/i;

function openPhotoDatabase(storage) {
  return new Promise((resolve, reject) => {
    const request = storage.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(photoStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Wallpaper storage is busy'));
  });
}

async function accessPhoto(view, key, photo) {
  const database = await openPhotoDatabase(view.indexedDB);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(photoStore, photo === undefined ? 'readonly' : 'readwrite');
      const store = transaction.objectStore(photoStore);
      const request = photo === undefined ? store.get(key) : store.put(photo, key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

function loadImage(view, source) {
  const image = new view.Image();
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Wallpaper image could not be opened'));
    image.src = source;
  });
}

function sharedPhotoRevision(headers) {
  const tag = headers.get('etag')?.trim();
  if (tag && tag.length <= 256) return 'etag:' + tag;
  const modified = Date.parse(headers.get('last-modified') ?? '');
  return Number.isFinite(modified) ? 'modified:' + modified : null;
}

async function loadSharedPhoto(view, path, { signal, cache } = {}) {
  const response = await view.fetch(path, {
    mode: 'same-origin', redirect: 'error', cache,
    signal: signal ?? view.AbortSignal?.timeout?.(sharedPhotoTimeout),
  });
  if (!response.ok || Number(response.headers.get('content-length')) > maxPhotoBytes) {
    throw new Error('Wallpaper photo is unavailable');
  }
  const file = await response.blob();
  if (!allowedImage.test(file.type) || !file.size || file.size > maxPhotoBytes) throw new Error('Invalid wallpaper photo');
  const url = view.URL.createObjectURL(file);
  try {
    return { image: await loadImage(view, url), url, revision: sharedPhotoRevision(response.headers) };
  } catch (error) {
    view.URL.revokeObjectURL(url);
    throw error;
  }
}

const sharedPhotoBackground = url => 'url("' + url + '") center / cover no-repeat #141414';

function stockPhotoUrl(filename) {
  return new URL(filename, import.meta.url).href;
}

function stockPhotoBackground(stock, source) {
  const layers = ['url("' + source + '") center / cover no-repeat', stock.background];
  const { overlay } = stock.photo;
  if (overlay) {
    const stop = opacity => 'rgba(' + overlay.rgb.join(',') + ',' + opacity + ')';
    layers.unshift('linear-gradient(180deg,' + stop(overlay.start) + ',' + stop(overlay.end) + ')');
  }
  return layers.join(', ');
}

function canvasFor(document, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawPhoto(canvas, image) {
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  context.fillStyle = '#141414';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context;
}

async function preparePhoto(document, file) {
  if (!file || !file.size || file.size > maxPhotoBytes ||
      !(file.type ? allowedImage.test(file.type) : allowedExtension.test(file.name))) {
    throw new Error('Unsupported wallpaper image');
  }
  const view = document.defaultView;
  const url = view.URL.createObjectURL(file);
  try {
    const image = await loadImage(view, url);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height || width * height > 64_000_000) throw new Error('Wallpaper image is too large');
    const scale = Math.min(1, maxPhotoSide / Math.max(width, height));
    const canvas = canvasFor(document, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    drawPhoto(canvas, image);
    const preview = canvasFor(document, 144, 108);
    const previewContext = preview.getContext('2d', { alpha: false });
    const previewScale = Math.max(preview.width / width, preview.height / height);
    const previewWidth = width * previewScale;
    const previewHeight = height * previewScale;
    previewContext.fillStyle = '#141414';
    previewContext.fillRect(0, 0, preview.width, preview.height);
    previewContext.drawImage(image, (preview.width - previewWidth) / 2, (preview.height - previewHeight) / 2,
      previewWidth, previewHeight);
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
    if (!jpeg) throw new Error('Wallpaper image could not be saved');
    return { jpeg: await jpeg.arrayBuffer(), thumbnail: preview.toDataURL('image/jpeg', .72) };
  } finally {
    view.URL.revokeObjectURL(url);
  }
}

function rasterFor(document, image, overlay) {
  const canvas = canvasFor(document, sampleSize, sampleSize);
  const context = drawPhoto(canvas, image);
  return {
    pixels: context.getImageData(0, 0, sampleSize, sampleSize).data,
    width: image.naturalWidth,
    height: image.naturalHeight,
    overlay,
  };
}

function rasterForGradient(document, layers, { width, height }) {
  const canvas = canvasFor(document, sampleSize, sampleSize);
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) return null;
  for (const { ellipse, angle, stops } of layers.slice().reverse()) {
    context.save();
    let gradient;
    let bounds = [0, 0, sampleSize, sampleSize];
    if (ellipse) {
      const [radiusX, radiusY, positionX, positionY] = ellipse.map(value => value * sampleSize / 100);
      context.translate(positionX, positionY);
      context.scale(radiusX, radiusY);
      gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      bounds = [-positionX / radiusX, -positionY / radiusY, sampleSize / radiusX, sampleSize / radiusY];
    } else {
      const radians = angle * Math.PI / 180;
      const x = Math.sin(radians) * width;
      const y = -Math.cos(radians) * height;
      // Project the CSS gradient line onto the square sampling canvas.
      const half = sampleSize * (Math.abs(x) + Math.abs(y)) / (2 * (x * x + y * y));
      const center = sampleSize / 2;
      gradient = context.createLinearGradient(center - x * half, center - y * half, center + x * half, center + y * half);
    }
    for (const [offset, color] of stops) gradient.addColorStop(offset / 100, color);
    context.fillStyle = gradient;
    context.fillRect(...bounds);
    context.restore();
  }
  return { pixels: context.getImageData(0, 0, sampleSize, sampleSize).data, width, height, darkInkThreshold: .18 };
}

function linear(channel) {
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
}

function darkInkOn(raster, area, frame, shade = 0) {
  const scale = Math.max(frame.width / raster.width, frame.height / raster.height);
  if (!scale) return false;
  const width = raster.width * scale;
  const height = raster.height * scale;
  const left = frame.left + (frame.width - width) / 2;
  const top = frame.top + (frame.height - height) / 2;
  const sampleIndex = position => Math.min(sampleSize - 1, Math.max(0, Math.floor(position * sampleSize)));
  const levels = [];
  const { overlay } = raster;
  for (let row = 0; row < 5; row++) {
    const sampleY = area.top + area.height * (row + .5) / 5;
    const position = Math.max(0, Math.min(1, (sampleY - frame.top) / frame.height));
    const opacity = overlay ? overlay.start + position * (overlay.end - overlay.start) : 0;
    const y = sampleIndex((sampleY - top) / height);
    for (let column = 0; column < 5; column++) {
      const x = sampleIndex((area.left + area.width * (column + .5) / 5 - left) / width);
      const index = (y * sampleSize + x) * 4;
      const value = channel => {
        const original = raster.pixels[index + channel];
        const pixel = overlay ? original * (1 - opacity) + overlay.rgb[channel] * opacity : original;
        return linear(pixel * (1 - shade) / 255);
      };
      levels.push(.2126 * value(0) + .7152 * value(1) + .0722 * value(2));
    }
  }
  levels.sort((a, b) => a - b);
  // Keep white on darker images and use near-black once most of the sampled
  // label area is bright enough to make white difficult to read.
  // A gradient uses pure black and white. Their contrast crosses at luminance .179.
  return levels[Math.floor(levels.length * .36)] > (raster.darkInkThreshold ?? .19);
}

function visibleRoomNameBounds(name) {
  const range = name.ownerDocument.createRange();
  range.selectNodeContents(name);
  const text = range.getBoundingClientRect();
  const clip = name.getBoundingClientRect();
  const left = Math.max(text.left, clip.left);
  const right = Math.min(text.right, clip.right);
  const top = Math.max(text.top, clip.top);
  const bottom = Math.min(text.bottom, clip.bottom);
  if (right > left && bottom > top) return { left, top, bottom, width: right - left, height: bottom - top };
}

function setInk(node, dark) {
  const ink = dark ? 'dark' : 'light';
  if (node.dataset.wallpaperInk !== ink) node.dataset.wallpaperInk = ink;
}

export function createWallpaperController(shell, {
  storageKey = 'default', fallbackStorageKeys = [], sharedWallpapers = [],
} = {}) {
  const document = shell.ownerDocument;
  const view = document.defaultView;
  const output = { id: null, url: null, raster: null, shared: null };
  let generation = 0;
  let pending;
  let pendingChoice;
  let stockRequest;
  let revisionTimer;
  let revisionRequest;
  let lastRevisionCheck = -Infinity;
  let frame = 0;
  let disposed = false;
  const themedNodes = new Set();
  let gradientRaster;

  function refresh() {
    if (disposed || !shell.isConnected) return;
    const modal = shell.querySelector('.modal[open]');
    const stock = catalog[output.id];
    if (modal && !output.raster && stock?.darkInk) setInk(modal, shell.dataset.page === 'true');
    if (!output.raster && !stock?.gradientLayers) return;
    const box = shell.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    if (!output.raster && (gradientRaster?.width !== box.width || gradientRaster.height !== box.height)) {
      const { width, height } = box;
      gradientRaster = { width, height, raster: null };
      try {
        gradientRaster.raster = rasterForGradient(document, stock.gradientLayers, box);
      } catch {
        // Some browser privacy settings prevent reading canvas pixels.
      }
    }
    const raster = output.raster ?? gradientRaster?.raster;
    if (!raster) {
      if (themedNodes.size) {
        clearRegionalInk();
        if (modal && stock.darkInk) setInk(modal, shell.dataset.page === 'true');
      }
      return;
    }
    if (output.raster) setInk(shell, darkInkOn(raster, box, box));
    const scroller = shell.querySelector('.room-scroll')?.getBoundingClientRect();
    const targets = output.raster ? '.toolbar .chrome-button:not([hidden]), .room' : '.room';
    for (const node of shell.querySelectorAll(targets)) {
      const title = node.querySelector('.room-title');
      // An expanded single-room button can reach far beyond its visible caption.
      const sampleCaption = !output.raster || (shell.dataset.page === 'true' && node.matches('.room:only-child'));
      const name = sampleCaption ? title?.querySelector('.room-name') : null;
      const region = (name && visibleRoomNameBounds(name)) || (title ?? node).getBoundingClientRect();
      if (scroller && node.classList.contains('room') && (region.bottom < scroller.top || region.top > scroller.bottom)) continue;
      setInk(node, darkInkOn(raster, region, box));
      themedNodes.add(node);
    }
    if (modal && output.raster) {
      const dimming = shell.dataset.page === 'true' ? 0 : .55;
      setInk(modal, darkInkOn(raster, modal.getBoundingClientRect(), box, dimming));
      themedNodes.add(modal);
    }
  }

  function scheduleRefresh() {
    if (frame || disposed || (!output.raster && !catalog[output.id]?.gradientLayers)) return;
    frame = view.requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  }

  function clearRegionalInk() {
    for (const node of themedNodes) delete node.dataset.wallpaperInk;
    themedNodes.clear();
    for (const dialog of shell.querySelectorAll('.modal[data-wallpaper-ink]')) delete dialog.dataset.wallpaperInk;
  }

  function publish(id, background, darkInk, url = null, raster = null, shared = null) {
    const previousUrl = output.url;
    gradientRaster = undefined;
    Object.assign(output, { id, url, raster, shared });
    clearRegionalInk();
    shell.style.setProperty('--bayit-wallpaper', background);
    shell.dataset.background = id;
    setInk(shell, darkInk);
    refresh();
    if (previousUrl) view.URL.revokeObjectURL(previousUrl);
  }

  async function showPhoto(ticket, record, persist) {
    if (disposed || ticket !== generation || !(record?.jpeg instanceof view.ArrayBuffer) || !record.jpeg.byteLength) return false;
    const url = view.URL.createObjectURL(new view.Blob([record.jpeg], { type: 'image/jpeg' }));
    try {
      const image = await loadImage(view, url);
      const raster = rasterFor(document, image);
      if (disposed || ticket !== generation) return false;
      if (persist) await accessPhoto(view, storageKey, record);
      if (disposed || ticket !== generation) return false;
      const box = shell.getBoundingClientRect();
      const background = 'url("' + url + '") center / cover no-repeat #141414';
      publish(personalWallpaperId, background, darkInkOn(raster, box, box), url, raster);
      return true;
    } finally {
      if (output.url !== url) view.URL.revokeObjectURL(url);
    }
  }

  async function readSavedPhoto() {
    for (const key of [storageKey, ...fallbackStorageKeys]) {
      const photo = await accessPhoto(view, key);
      if (photo) return photo;
    }
    return undefined;
  }

  function showStockPhoto(id, stock) {
    const source = stockPhotoUrl(stock.photo.full);
    const request = loadImage(view, source);
    stockRequest = request;
    void request.then(image => {
      if (disposed || stockRequest !== request || output.id !== id) return;
      let raster;
      try { raster = rasterFor(document, image, stock.photo.overlay); } catch {}
      publish(id, stockPhotoBackground(stock, source), !!stock.darkInk, null, raster);
    }, () => {});
  }

  function publishSharedPhoto({ id, path }, { image, url, revision }) {
    let raster;
    try { raster = rasterFor(document, image); } catch {}
    const box = shell.getBoundingClientRect();
    publish(id, sharedPhotoBackground(url), !!raster && darkInkOn(raster, box, box), url, raster, { id, path, revision });
  }

  async function showSharedPhoto(ticket, shared) {
    const photo = await loadSharedPhoto(view, shared.path);
    try {
      if (disposed || ticket !== generation) return false;
      publishSharedPhoto(shared, photo);
      return true;
    } finally {
      if (output.url !== photo.url) view.URL.revokeObjectURL(photo.url);
    }
  }

  const canCheckRevision = () => !disposed && shell.isConnected && output.shared && pendingChoice === undefined &&
    document.visibilityState === 'visible';

  function cancelRevisionCheck() {
    view.clearTimeout(revisionTimer);
    revisionTimer = undefined;
    revisionRequest?.abort();
    revisionRequest = undefined;
  }

  async function checkSharedRevision() {
    if (!canCheckRevision() || revisionRequest) return;
    const shared = output.shared;
    const ticket = generation;
    const request = new view.AbortController();
    const active = () => revisionRequest === request && !request.signal.aborted && generation === ticket &&
      output.shared === shared && canCheckRevision();
    revisionRequest = request;
    lastRevisionCheck = view.performance.now();
    const timeout = view.setTimeout(() => request.abort(), sharedPhotoTimeout);
    let photo;
    try {
      const response = await view.fetch(shared.path, {
        method: 'HEAD', mode: 'same-origin', redirect: 'error', cache: 'no-cache', signal: request.signal,
      });
      if (!active() || !response.ok) return;
      const revision = sharedPhotoRevision(response.headers);
      if (!revision || revision === shared.revision) return;
      photo = await loadSharedPhoto(view, shared.path, { signal: request.signal, cache: 'reload' });
      if (active()) publishSharedPhoto(shared, { ...photo, revision: photo.revision ?? revision });
    } catch { /* Keep the last verified photo when the shared file is unavailable. */ }
    finally {
      view.clearTimeout(timeout);
      if (revisionRequest === request) revisionRequest = undefined;
      if (photo && output.url !== photo.url) view.URL.revokeObjectURL(photo.url);
    }
  }

  function scheduleRevisionCheck(event) {
    if (event.type === 'pageshow' && !event.persisted) return;
    if (document.visibilityState !== 'visible') {
      cancelRevisionCheck();
      return;
    }
    if (!canCheckRevision() || revisionTimer !== undefined || revisionRequest) return;
    const delay = Math.max(revisionDebounce, revisionInterval - (view.performance.now() - lastRevisionCheck));
    revisionTimer = view.setTimeout(() => {
      revisionTimer = undefined;
      void checkSharedRevision();
    }, delay);
  }

  function trackChoice(ticket, promise) {
    pendingChoice = ticket;
    return promise.finally(() => {
      if (pendingChoice === ticket) pendingChoice = undefined;
    });
  }

  async function prepareSharedPhoto(id) {
    const shared = sharedWallpapers.find(item => item.id === id);
    if (disposed || !shared) return null;
    const photo = await loadSharedPhoto(view, shared.path);
    return {
      apply() {
        if (disposed) return false;
        cancelRevisionCheck();
        generation++;
        publishSharedPhoto(shared, photo);
        return true;
      },
      dispose() {
        if (output.url !== photo.url) view.URL.revokeObjectURL(photo.url);
      },
    };
  }

  function apply(id) {
    if (disposed) return Promise.resolve(false);
    if (id === personalWallpaperId && pending?.ticket === generation) return pending.promise;
    const stock = Object.hasOwn(catalog, id) ? catalog[id] : null;
    const shared = sharedWallpapers.find(item => item.id === id);
    if (id !== personalWallpaperId && !stock && !shared) return Promise.resolve(false);
    cancelRevisionCheck();
    const ticket = ++generation;
    if (output.id === id) return Promise.resolve(true);
    if (stock) {
      publish(id, stock.background, !!stock.darkInk);
      if (stock.photo) showStockPhoto(id, stock);
      return Promise.resolve(true);
    }
    if (shared) return trackChoice(ticket, showSharedPhoto(ticket, shared).catch(() => false));
    const promise = trackChoice(ticket, readSavedPhoto().then(record => showPhoto(ticket, record, false), () => false)
      .catch(() => false)).finally(() => { if (pending?.promise === promise) pending = undefined; });
    pending = { ticket, promise };
    return promise;
  }

  async function upload(file) {
    if (disposed) return false;
    cancelRevisionCheck();
    const ticket = ++generation;
    pending = undefined;
    return trackChoice(ticket, preparePhoto(document, file).then(record => showPhoto(ticket, record, true)).catch(() => false));
  }

  async function preview() {
    try {
      const record = await readSavedPhoto();
      return thumbnailPattern.test(record?.thumbnail ?? '') ? record.thumbnail : null;
    } catch { return null; }
  }

  const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(scheduleRefresh) : null;
  const dialogs = new view.MutationObserver(() => output.raster ? scheduleRefresh() : refresh());
  resize?.observe(shell);
  for (const dialog of shell.querySelectorAll('.modal')) dialogs.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  shell.addEventListener('scroll', scheduleRefresh, { capture: true, passive: true });
  view.addEventListener('focus', scheduleRevisionCheck);
  view.addEventListener('pageshow', scheduleRevisionCheck);
  document.addEventListener('visibilitychange', scheduleRevisionCheck);

  return {
    apply, upload, preview, refresh, prepareSharedPhoto,
    destroy() {
      disposed = true;
      generation++;
      cancelRevisionCheck();
      view.cancelAnimationFrame(frame);
      resize?.disconnect();
      dialogs.disconnect();
      shell.removeEventListener('scroll', scheduleRefresh, true);
      view.removeEventListener('focus', scheduleRevisionCheck);
      view.removeEventListener('pageshow', scheduleRevisionCheck);
      document.removeEventListener('visibilitychange', scheduleRevisionCheck);
      clearRegionalInk();
      if (output.url) view.URL.revokeObjectURL(output.url);
      shell.style.removeProperty('--bayit-wallpaper');
      delete shell.dataset.background;
      delete shell.dataset.wallpaperInk;
    },
  };
}

const labels = {
  en: {
    legend: 'Home wallpaper', all: 'All', new: 'New', basic: 'Basic', nature: 'Nature', materials: 'Materials',
    photos: 'Photos', light: 'Color and light', shared: 'Shared photos', personal: 'My photo',
    more: 'Show all wallpapers ({count})', less: 'Show fewer wallpapers',
    upload: 'Choose a photo', saved: 'Use my saved photo', preparing: 'Preparing photo…',
    failed: 'Could not load this wallpaper.', uploadFailed: 'Could not save the photo. Choose an image up to 20 MB.',
    noPhoto: 'Choose a photo from this device.', saving: 'Saving household appearance…',
  },
  he: {
    legend: 'רקע הבית', all: 'הכל', new: 'חדשים', basic: 'בסיס', nature: 'טבע ונוף', materials: 'חומרים וצורות',
    photos: 'תמונות', shared: 'תמונות משותפות', light: 'אור וצבע', personal: 'תמונה שלי',
    more: 'הצג את כל הרקעים ({count})', less: 'הצג פחות',
    upload: 'בחירת תמונה', saved: 'שימוש בתמונה השמורה', preparing: 'מכין את התמונה…',
    failed: 'לא ניתן לטעון את הרקע.', uploadFailed: 'לא ניתן לשמור את התמונה. בחרו תמונה בגודל של עד 20 מ״ב.',
    noPhoto: 'בחרו תמונה מהמכשיר הזה.', saving: 'שומר את מראה הבית…',
  },
};

export function createWallpaperGallery({ locale, controller, selected, onSelect, onUpload, sharedWallpapers = [],
  isHouseholdChoice = () => false, canChoose = () => true }) {
  const words = labels[locale] ?? labels.en;
  const element = document.createElement('details');
  element.className = 'wallpaper-gallery appearance-disclosure';
  element.dir = locale === 'he' ? 'rtl' : 'ltr';
  const summary = document.createElement('summary');
  const preview = document.createElement('span');
  preview.className = 'wallpaper-current-preview';
  preview.setAttribute('aria-hidden', 'true');
  const legend = document.createElement('span');
  legend.textContent = words.legend;
  const current = document.createElement('span');
  current.className = 'wallpaper-current';
  summary.append(preview, legend, current);
  const categories = document.createElement('div');
  categories.className = 'wallpaper-categories';
  const content = document.createElement('div');
  const status = document.createElement('p');
  status.className = 'wallpaper-message';
  status.setAttribute('role', 'status');
  const choices = document.createElement('div');
  choices.className = 'wallpaper-choices';
  choices.append(categories, content, status);
  element.append(summary, choices);
  const categoryButtons = new Map();
  const sharedById = new Map(sharedWallpapers.map(item => [item.id, item]));
  const previewUrls = new Map();
  const previewLimit = 6;
  let category = selected === personalWallpaperId ? 'personal' : 'all';
  let request = 0;
  let expanded = false;
  let orderSelection = selected;
  let disposed = false;
  const view = element.ownerDocument.defaultView;
  const previewObserver = typeof view.IntersectionObserver === 'function'
    ? new view.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (disposed || !entry.isIntersecting || !element.open || !entry.target.isConnected) continue;
        previewObserver.unobserve(entry.target);
        void loadGalleryPreview(entry.target);
      }
    })
    : null;

  async function loadGalleryPreview(sample) {
    const id = sample.dataset.wallpaperPreview;
    const shared = sharedById.get(id);
    if (shared) {
      try {
        const { url } = await loadSharedPhoto(view, shared.preview ?? shared.path);
        if (!disposed && sample.isConnected && element.open) {
          previewUrls.set(sample, url);
          sample.style.background = sharedPhotoBackground(url);
        } else view.URL.revokeObjectURL(url);
      } catch { /* The full photo can still be selected if a thumbnail goes missing. */ }
      return;
    }
    const stock = catalog[id];
    const source = stockPhotoUrl(stock.photo.preview);
    void loadImage(view, source).then(() => {
      if (!disposed && sample.isConnected) sample.style.background = stockPhotoBackground(stock, source);
    }, () => {});
  }

  function button(text, className) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = className;
    item.textContent = text;
    return item;
  }

  function releasePreviews() {
    previewObserver?.disconnect();
    for (const url of previewUrls.values()) view.URL.revokeObjectURL(url);
    previewUrls.clear();
  }

  function select(id) {
    const changed = selected !== id;
    selected = id;
    const wallpaper = catalog[id];
    current.textContent = id === personalWallpaperId ? words.personal
      : sharedById.get(id)?.name ?? wallpaper?.[locale] ?? wallpaper?.en ?? '';
    if (changed && element.open && !expanded && category !== 'personal') refreshCompactSelection();
    for (const option of content.querySelectorAll('[data-wallpaper-choice]')) {
      option.setAttribute('aria-pressed', String(option.dataset.wallpaperChoice === id));
    }
  }

  async function choose(id, file) {
    const personal = file || id === personalWallpaperId;
    if (!canChoose(id)) return;
    const serial = ++request;
    status.textContent = isHouseholdChoice(id) ? words.saving : personal || sharedById.has(id) ? words.preparing : '';
    element.setAttribute('aria-busy', 'true');
    let result;
    try { result = await (file ? onUpload(file) : onSelect(id)); } catch { result = false; }
    if (serial !== request || disposed) return;
    element.removeAttribute('aria-busy');
    const applied = result?.applied ?? result;
    status.textContent = result?.feedback ?? (applied ? '' : file ? words.uploadFailed : words.failed);
    if (!applied) return;
    select(id);
    if (file && category === 'personal') fillPersonalPreview();
  }

  function syncChoice(item) {
    const id = item.dataset.wallpaperChoice;
    if (isHouseholdChoice(id)) item.setAttribute('aria-disabled', String(!canChoose(id)));
    else item.removeAttribute('aria-disabled');
  }

  function wallpaperButton(id, name, wallpaper) {
    const item = button('', 'wallpaper-option');
    item.dataset.wallpaperChoice = id;
    syncChoice(item);
    const sample = document.createElement('span');
    sample.className = 'wallpaper-sample';
    sample.setAttribute('aria-hidden', 'true');
    if (wallpaper) sample.style.background = wallpaper.background;
    if (wallpaper?.photo || sharedById.has(id)) sample.dataset.wallpaperPreview = id;
    const caption = document.createElement('span');
    caption.textContent = name;
    const marker = document.createElement('span');
    marker.className = 'wallpaper-selected-mark';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '✓';
    item.append(sample, caption, marker);
    item.onclick = () => choose(id);
    return item;
  }

  async function fillPersonalPreview() {
    const saved = content.querySelector('.wallpaper-saved');
    if (!saved) return;
    const image = await controller.preview();
    if (saved !== content.querySelector('.wallpaper-saved')) return;
    saved.hidden = !image;
    if (image) saved.querySelector('.wallpaper-sample').style.background = 'url("' + image + '") center / cover';
    content.querySelector('.wallpaper-no-photo').hidden = !!image;
  }

  function wallpaperIds(group, firstChoice) {
    if (group === 'all') {
      return [...new Set(['design_default', firstChoice, ...featuredWallpapers, ...Object.keys(catalog), ...sharedById.keys()])]
        .filter(id => catalog[id] || sharedById.has(id));
    }
    return group === 'shared' ? [...sharedById.keys()] : wallpaperGroups[group];
  }

  function visibleWallpaperIds(ids) {
    if (expanded) return ids;
    const previews = ids.slice(0, previewLimit);
    if (ids.indexOf(selected) >= previewLimit) previews[previewLimit - 1] = selected;
    return previews;
  }

  function galleryOption(id) {
    const wallpaper = catalog[id];
    return wallpaperButton(id, sharedById.get(id)?.name ?? wallpaper[locale] ?? wallpaper.en, wallpaper);
  }

  function observePreview(sample) {
    if (previewObserver) previewObserver.observe(sample);
    else if (element.open) void loadGalleryPreview(sample);
  }

  function refreshCompactSelection() {
    const previous = content.querySelector('.wallpaper-option:nth-child(' + previewLimit + ')');
    if (!previous) return;
    const ids = wallpaperIds(category, orderSelection);
    const nextId = visibleWallpaperIds(ids).at(-1);
    if (previous.dataset.wallpaperChoice === nextId) return;
    const sample = previous.querySelector('[data-wallpaper-preview]');
    if (sample) {
      previewObserver?.unobserve(sample);
      const url = previewUrls.get(sample);
      if (url) view.URL.revokeObjectURL(url);
      previewUrls.delete(sample);
    }
    const restoreFocus = previous.getRootNode().activeElement === previous;
    const next = galleryOption(nextId);
    previous.replaceWith(next);
    const newSample = next.querySelector('[data-wallpaper-preview]');
    if (newSample) observePreview(newSample);
    if (restoreFocus) next.focus({ preventScroll:true });
  }

  function render(group, firstChoice = selected) {
    if (disposed) return;
    category = group;
    orderSelection = firstChoice;
    for (const [name, item] of categoryButtons) item.setAttribute('aria-pressed', String(name === category));
    releasePreviews();
    content.replaceChildren();
    if (group === 'personal') {
      content.className = 'wallpaper-personal';
      const saved = wallpaperButton(personalWallpaperId, words.saved);
      saved.classList.add('wallpaper-saved');
      saved.hidden = true;
      const instruction = document.createElement('p');
      instruction.className = 'wallpaper-no-photo';
      instruction.textContent = words.noPhoto;
      instruction.hidden = true;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptedTypes;
      input.hidden = true;
      input.onchange = () => {
        const file = input.files?.[0];
        input.value = '';
        if (file) void choose(personalWallpaperId, file);
      };
      const upload = button(words.upload, 'wallpaper-upload');
      upload.onclick = () => input.click();
      content.append(saved, instruction, input, upload);
      void fillPersonalPreview();
    } else {
      content.className = 'wallpaper-options';
      const ids = wallpaperIds(group, firstChoice);
      const visibleIds = visibleWallpaperIds(ids);
      for (const id of visibleIds) content.append(galleryOption(id));
      if (ids.length > previewLimit) {
        const more = button(expanded ? words.less : words.more.replace('{count}', ids.length), 'wallpaper-upload wallpaper-more');
        more.setAttribute('aria-expanded', String(expanded));
        more.onclick = () => {
          const firstUnseen = ids.find(id => !visibleIds.includes(id));
          expanded = !expanded;
          render(group, expanded ? orderSelection : selected);
          const nextFocus = expanded ? [...content.children].find(item => item.dataset.wallpaperChoice === firstUnseen)
            : content.querySelector('.wallpaper-more');
          nextFocus?.focus({ preventScroll: true });
        };
        content.append(more);
      }
      for (const sample of content.querySelectorAll('[data-wallpaper-preview]')) observePreview(sample);
    }
    select(selected);
  }

  for (const group of ['all', ...Object.keys(wallpaperGroups), ...(sharedById.size ? ['shared'] : []), 'personal']) {
    const item = button(words[group], 'wallpaper-category');
    item.dataset.wallpaperCategory = group;
    item.onclick = () => {
      if (category === group) return;
      expanded = false;
      render(group);
    };
    categories.append(item);
    categoryButtons.set(group, item);
  }
  element.addEventListener('toggle', () => {
    if (element.open && !content.firstElementChild) render(category);
    if (!element.open) {
      releasePreviews();
      content.replaceChildren();
    }
  });
  select(selected);
  return {
    element,
    select,
    captureView() {
      const active = element.getRootNode().activeElement;
      const focus = active === summary ? { summary:true } : element.contains(active) ? {
        category:active.dataset.wallpaperCategory, choice:active.dataset.wallpaperChoice,
        more:active.classList.contains('wallpaper-more'),
      } : undefined;
      return { open:element.open, category, expanded, orderSelection, focus, categoryScroll:categories.scrollLeft };
    },
    restoreView(state, preferredChoice) {
      if (!state) return;
      expanded = state.expanded;
      if (categoryButtons.has(state.category)) category = state.category;
      element.open = state.open;
      if (!element.open) return state.focus ? summary : undefined;
      render(category, state.orderSelection);
      categories.scrollLeft = state.categoryScroll;
      if (state.focus?.summary) return summary;
      if (state.focus?.category) return categoryButtons.get(state.focus.category);
      if (state.focus?.more) return content.querySelector('.wallpaper-more') ?? summary;
      const choice = state.focus?.choice ?? preferredChoice;
      if (choice !== undefined) {
        return [...content.querySelectorAll('[data-wallpaper-choice]')]
          .find(item => item.dataset.wallpaperChoice === choice) ?? summary;
      }
    },
    syncChoices() {
      for (const item of content.querySelectorAll('[data-wallpaper-choice]')) syncChoice(item);
    },
    dispose() {
      disposed = true;
      request++;
      releasePreviews();
    },
  };
}

export const wallpaperStyles = `
  .shell[data-background] { background: var(--bayit-wallpaper,var(--wallpaper)); }
  :is(.shell,.room,.chrome-button,.modal)[data-wallpaper-ink=dark] {
    --ink: #101217;
    --secondary: #1b2129;
    --quiet-icon: #20242b;
    --line: rgba(16,18,23,.35);
    --soft-line: rgba(16,18,23,.22);
    --surface: #ede9e5;
    --warm: #613300;
    --moving: #003f68;
    --critical: #7a0a27;
    color: var(--ink);
    color-scheme: light;
  }
  :is(.room,.chrome-button,.modal)[data-wallpaper-ink=light] {
    --ink: #fff;
    --secondary: rgba(255,255,255,.84);
    --quiet-icon: rgba(255,255,255,.87);
    --line: rgba(255,255,255,.28);
    --soft-line: rgba(255,255,255,.18);
    --surface: #282828;
    --warm: #ffdf92;
    --moving: #9edcff;
    --critical: #ffc7c5;
    color: var(--ink);
    color-scheme: dark;
  }
  :is(.shell,.room,.chrome-button,.modal)[data-wallpaper-ink=dark] :focus-visible,
  .chrome-button[data-wallpaper-ink=dark]:focus-visible { outline-color: #243856; }
  .shell[data-background=ink_on_paper] .room[data-wallpaper-ink=dark] { --ink: #000; }
  .modal[data-wallpaper-ink=dark] select option { background: #efece8; color: var(--ink); }
  .wallpaper-current-preview {
    inline-size: 36px;
    block-size: 28px;
    flex: none;
    border: 1px solid var(--soft-line);
    border-radius: 8px;
    background: var(--bayit-wallpaper,var(--wallpaper));
    background-position: center;
    background-size: cover;
  }
  .wallpaper-current {
    margin-inline-start: auto; min-inline-size: 0; color: var(--secondary); text-align: end;
    font-size: 12px; font-weight: 600; overflow-wrap: anywhere;
  }
  .wallpaper-choices { padding: 0 9px 9px; }
  .wallpaper-categories {
    display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
    overscroll-behavior-inline: contain; margin-block-end: 9px;
  }
  .wallpaper-options { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; }
  .wallpaper-category, .wallpaper-option, .wallpaper-upload {
    min-inline-size: 0;
    min-block-size: 44px;
    border: 1px solid var(--soft-line);
    border-radius: 10px;
    padding: 5px;
    background: transparent;
    color: var(--ink);
    font-size: 13px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .wallpaper-category[aria-pressed=true], .wallpaper-option[aria-pressed=true] {
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
  }
  .wallpaper-category {
    flex: none; min-width: 44px; padding-inline: 10px; border-radius: 999px; white-space: nowrap;
  }
  .wallpaper-category:focus-visible { outline-offset: -2px; }
  .wallpaper-option {
    position: relative;
    display: grid;
    grid-template-rows: auto 1fr;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
  .wallpaper-selected-mark {
    display: none; position: absolute; inset-block-start: 8px; inset-inline-start: 8px;
    width: 17px; height: 17px; border-radius: 50%; background: var(--ink); color: var(--surface);
    font-size: 11px; line-height: 1;
  }
  .wallpaper-option[aria-pressed=true] > .wallpaper-selected-mark { display: grid; place-items: center; }
  .wallpaper-sample {
    display: block;
    width: 100%;
    block-size: 54px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 7px;
  }
  .wallpaper-more { grid-column: 1 / -1; }
  .wallpaper-personal { display: grid; gap: 7px; }
  .wallpaper-personal .wallpaper-option { width: min(200px,100%); }
  .wallpaper-message, .wallpaper-no-photo { color: var(--secondary); font-size: 12px; margin: 6px 1px 0; }
  .wallpaper-message:empty { display: none; }
  @media (prefers-contrast: more), (prefers-reduced-transparency: reduce) {
    .shell[data-wallpaper-ink=dark] :is(.toolbar,.room,.modal) { background: var(--surface); }
    .wallpaper-category, .wallpaper-option, .wallpaper-upload { border-color: var(--line); }
  }
`;
