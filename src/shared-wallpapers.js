import { catalog } from './wallpaper-catalog.js';

const wallpaperId = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const localImage = /\.(?:avif|jpe?g|png|webp)$/i;
const unsafeSegment = /[\u0000-\u001f\u007f\/\\%?#]/;
const unsafeName = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

export function normalizeSharedWallpaperPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/local/') || value.length > 512) return;
  try {
    const parts = value.slice('/local/'.length).split('/').map(part => decodeURIComponent(part));
    if (parts.some(part => !part.trim() || part === '.' || part === '..' || unsafeSegment.test(part)) ||
        !localImage.test(parts.at(-1))) return;
    return '/local/' + parts.map(part => encodeURIComponent(part)).join('/');
  } catch { /* Bad URL encodings are not valid file paths. */ }
}

export function normalizeSharedWallpapers(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set(['personal']);
  return value.flatMap(entry => {
    const id = entry?.id;
    if (typeof id !== 'string' || !wallpaperId.test(id) || id in catalog || ids.has(id)) return [];
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const path = normalizeSharedWallpaperPath(entry.path);
    const preview = normalizeSharedWallpaperPath(entry.preview);
    if (!name || name.length > 80 || unsafeName.test(name) || !path) return [];
    ids.add(id);
    return [{ id, name, path, ...(preview && preview !== path && { preview }) }];
  });
}
