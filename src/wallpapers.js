import { catalog, featuredWallpapers, wallpaperGroups } from './wallpaper-catalog.js';

export const wallpaperChoices = Object.freeze(Object.fromEntries(
  Object.entries(catalog).map(([id, { en, he }]) => [id, Object.freeze({ en, he })]),
));
export const personalWallpaperId = 'personal';

const allowedImage = /^image\/(?:png|jpeg|webp|avif|heic|heif)$/i;
const allowedExtension = /\.(?:png|jpe?g|webp|avif|heic|heif)$/i;
const acceptedTypes = 'image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif,.heic,.heif';
const sampleSize = 32;
const maxUploadBytes = 20 * 1024 * 1024;
const maxPhotoSide = 2048;
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
  if (!file || !file.size || file.size > maxUploadBytes ||
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

function rasterFor(document, image) {
  const canvas = canvasFor(document, sampleSize, sampleSize);
  const context = drawPhoto(canvas, image);
  return {
    pixels: context.getImageData(0, 0, sampleSize, sampleSize).data,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
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
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 5; column++) {
      const y = sampleIndex((area.top + area.height * (row + .5) / 5 - top) / height);
      const x = sampleIndex((area.left + area.width * (column + .5) / 5 - left) / width);
      const index = (y * sampleSize + x) * 4;
      const value = channel => linear(raster.pixels[index + channel] * (1 - shade) / 255);
      levels.push(.2126 * value(0) + .7152 * value(1) + .0722 * value(2));
    }
  }
  levels.sort((a, b) => a - b);
  // Keep white on darker images and use near-black once most of the sampled
  // label area is bright enough to make white difficult to read.
  return levels[Math.floor(levels.length * .36)] > .19;
}

function setInk(node, dark) {
  const ink = dark ? 'dark' : 'light';
  if (node.dataset.wallpaperInk !== ink) node.dataset.wallpaperInk = ink;
}

export function createWallpaperController(shell, { storageKey = 'default', fallbackStorageKeys = [] } = {}) {
  const document = shell.ownerDocument;
  const view = document.defaultView;
  const output = { id: null, url: null, raster: null };
  let generation = 0;
  let pending;
  let frame = 0;
  let disposed = false;
  const themedNodes = new Set();

  function refresh() {
    if (disposed || !shell.isConnected) return;
    const modal = shell.querySelector('.modal[open]');
    if (!output.raster) {
      if (modal && catalog[output.id]?.darkInk) setInk(modal, shell.dataset.page === 'true');
      return;
    }
    const box = shell.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const raster = output.raster;
    setInk(shell, darkInkOn(raster, box, box));
    const scroller = shell.querySelector('.room-scroll')?.getBoundingClientRect();
    for (const node of shell.querySelectorAll('.toolbar .chrome-button:not([hidden]), .room')) {
      const region = (node.querySelector('.room-title') ?? node).getBoundingClientRect();
      if (scroller && node.classList.contains('room') && (region.bottom < scroller.top || region.top > scroller.bottom)) continue;
      setInk(node, darkInkOn(raster, region, box));
      themedNodes.add(node);
    }
    if (modal) {
      const dimming = shell.dataset.page === 'true' ? 0 : .55;
      setInk(modal, darkInkOn(raster, modal.getBoundingClientRect(), box, dimming));
      themedNodes.add(modal);
    }
  }

  function scheduleRefresh() {
    if (frame || !output.raster || disposed) return;
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

  function publish(id, background, darkInk, url = null, raster = null) {
    const previousUrl = output.url;
    Object.assign(output, { id, url, raster });
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

  function apply(id) {
    if (disposed) return Promise.resolve(false);
    if (id === personalWallpaperId && pending?.ticket === generation) return pending.promise;
    const stock = Object.hasOwn(catalog, id) ? catalog[id] : null;
    if (id !== personalWallpaperId && !stock) return Promise.resolve(false);
    const ticket = ++generation;
    if (output.id === id) return Promise.resolve(true);
    if (stock) {
      publish(id, stock.background, !!stock.darkInk);
      return Promise.resolve(true);
    }
    const promise = readSavedPhoto().then(record => showPhoto(ticket, record, false), () => false)
      .catch(() => false).finally(() => { if (pending?.promise === promise) pending = undefined; });
    pending = { ticket, promise };
    return promise;
  }

  async function upload(file) {
    if (disposed) return false;
    const ticket = ++generation;
    pending = undefined;
    try {
      const record = await preparePhoto(document, file);
      return await showPhoto(ticket, record, true);
    } catch {
      return false;
    }
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

  return {
    apply, upload, preview, refresh,
    destroy() {
      disposed = true;
      generation++;
      view.cancelAnimationFrame(frame);
      resize?.disconnect();
      dialogs.disconnect();
      shell.removeEventListener('scroll', scheduleRefresh, true);
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
    legend: 'Wallpaper', all: 'All', new: 'New', basic: 'Basic', nature: 'Nature', materials: 'Materials',
    light: 'Color and light', personal: 'My photo', more: 'More wallpapers',
    upload: 'Choose a photo', saved: 'Use my saved photo', preparing: 'Preparing photo…',
    failed: 'Could not load this wallpaper.', uploadFailed: 'Could not save the photo. Choose an image up to 20 MB.',
    noPhoto: 'Choose a photo from this device.',
  },
  he: {
    legend: 'רקע', all: 'הכל', new: 'חדשים', basic: 'בסיס', nature: 'טבע ונוף', materials: 'חומרים וצורות',
    light: 'אור וצבע', personal: 'תמונה שלי', more: 'עוד רקעים',
    upload: 'בחירת תמונה', saved: 'שימוש בתמונה השמורה', preparing: 'מכין את התמונה…',
    failed: 'לא ניתן לטעון את הרקע.', uploadFailed: 'לא ניתן לשמור את התמונה. בחרו תמונה בגודל של עד 20 מ״ב.',
    noPhoto: 'בחרו תמונה מהמכשיר הזה.',
  },
};

export function createWallpaperGallery({ locale, controller, selected, onSelect, onUpload }) {
  const words = labels[locale] ?? labels.en;
  const element = document.createElement('details');
  element.className = 'wallpaper-gallery';
  element.dir = locale === 'he' ? 'rtl' : 'ltr';
  const summary = document.createElement('summary');
  const legend = document.createElement('span');
  legend.textContent = words.legend;
  const current = document.createElement('span');
  current.className = 'wallpaper-current';
  summary.append(legend, current);
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
  let category = selected === personalWallpaperId ? 'personal' : catalog[selected]?.group ?? 'nature';
  let request = 0;
  let expandedAll = false;

  function button(text, className) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = className;
    item.textContent = text;
    return item;
  }

  function select(id) {
    selected = id;
    const wallpaper = catalog[id];
    current.textContent = id === personalWallpaperId ? words.personal : wallpaper?.[locale] ?? wallpaper?.en ?? '';
    for (const option of content.querySelectorAll('[data-wallpaper-choice]')) {
      option.setAttribute('aria-pressed', String(option.dataset.wallpaperChoice === id));
    }
  }

  async function choose(id, file) {
    const serial = ++request;
    status.textContent = file || id === personalWallpaperId ? words.preparing : '';
    element.setAttribute('aria-busy', 'true');
    let applied;
    try { applied = await (file ? onUpload(file) : onSelect(id)); } catch { applied = false; }
    if (serial !== request) return;
    element.removeAttribute('aria-busy');
    status.textContent = applied ? '' : (file ? words.uploadFailed : words.failed);
    if (!applied) return;
    select(id);
    if (file && category === 'personal') fillPersonalPreview();
  }

  function wallpaperButton(id, name, background) {
    const item = button('', 'wallpaper-option');
    item.dataset.wallpaperChoice = id;
    const sample = document.createElement('span');
    sample.className = 'wallpaper-sample';
    sample.setAttribute('aria-hidden', 'true');
    if (background) sample.style.background = background;
    const caption = document.createElement('span');
    caption.textContent = name;
    item.append(sample, caption);
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

  function render(group) {
    category = group;
    for (const [name, item] of categoryButtons) item.setAttribute('aria-pressed', String(name === category));
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
      const ids = group === 'all'
        ? [...new Set(['design_default', selected, ...featuredWallpapers, ...Object.keys(catalog)])].filter(id => catalog[id])
        : wallpaperGroups[group];
      const visibleIds = group === 'all' && !expandedAll ? ids.slice(0, 6) : ids;
      for (const id of visibleIds) {
        const wallpaper = catalog[id];
        content.append(wallpaperButton(id, wallpaper[locale] ?? wallpaper.en, wallpaper.background));
      }
      if (visibleIds.length < ids.length) {
        const more = button(words.more, 'wallpaper-upload wallpaper-more');
        more.onclick = () => {
          expandedAll = true;
          render('all');
          content.children[visibleIds.length]?.focus({ preventScroll: true });
        };
        content.append(more);
      }
    }
    select(selected);
  }

  for (const group of ['all', ...Object.keys(wallpaperGroups), 'personal']) {
    const item = button(words[group], 'wallpaper-category');
    item.onclick = () => { if (category !== group) render(group); };
    categories.append(item);
    categoryButtons.set(group, item);
  }
  element.addEventListener('toggle', () => {
    if (element.open && !content.firstElementChild) render(category);
  });
  select(selected);
  return { element, select };
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
  .modal[data-wallpaper-ink=dark] select option { background: #efece8; color: var(--ink); }
  .wallpaper-gallery {
    margin: 0;
    min-inline-size: 0;
    border: 1px solid var(--soft-line);
    border-radius: 15px;
  }
  .wallpaper-gallery summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-block-size: 44px;
    padding-inline: 11px;
    cursor: pointer;
    list-style: none;
    font-size: 13px;
    font-weight: 760;
  }
  .wallpaper-gallery summary::-webkit-details-marker { display: none; }
  .wallpaper-gallery summary::after {
    content: '';
    inline-size: 6px;
    block-size: 6px;
    margin-inline-start: 3px;
    margin-block-start: -4px;
    border: solid currentColor;
    border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
    flex: none;
  }
  .wallpaper-gallery[open] summary::after { transform: rotate(225deg); margin-block-start: 4px; }
  .wallpaper-current { margin-inline-start: auto; color: var(--secondary); text-align: end; font-weight: 600; }
  .wallpaper-choices { padding: 0 9px 9px; }
  .wallpaper-categories, .wallpaper-options { display: grid; gap: 7px; }
  .wallpaper-categories { grid-template-columns: repeat(auto-fit,minmax(min(105px,100%),1fr)); margin-block-end: 9px; }
  .wallpaper-options { grid-template-columns: repeat(3,minmax(0,1fr)); }
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
    border-color: var(--warm);
    box-shadow: inset 0 0 0 1px var(--warm);
  }
  .wallpaper-option {
    display: grid;
    grid-template-rows: auto 1fr;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
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
