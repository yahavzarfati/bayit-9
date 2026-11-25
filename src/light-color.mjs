const colorModes = new Set(["rgb", "hs", "xy"]);
const hexColor = /^#[0-9a-f]{6}$/i;

export function supportsLightColor(modes) {
  return Array.isArray(modes) && modes.some(mode => colorModes.has(mode));
}

export function parseLightColor(value) {
  if (typeof value !== "string" || value.length !== 7 || !hexColor.test(value) || value === "#000000") return null;
  return [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function reportedColor(attributes) {
  const rgb = attributes?.rgb_color;
  return colorModes.has(attributes?.color_mode) && Array.isArray(rgb) && rgb.length === 3
    && rgb.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)
    && Math.max(...rgb) > 0 ? rgb : null;
}

export function lightColorHex(attributes) {
  const color = reportedColor(attributes);
  return color && "#" + color.map(channel => channel.toString(16).padStart(2, "0")).join("");
}

export function lightHueSaturation(hex) {
  const rgb = parseLightColor(hex);
  if (!rgb) return null;
  const [red, green, blue] = rgb;
  const high = Math.max(...rgb);
  const chroma = high - Math.min(...rgb);
  if (!chroma) return { hue: 0, saturation: 0 };
  const angle = high === red ? (green - blue) / chroma
    : high === green ? 2 + (blue - red) / chroma : 4 + (red - green) / chroma;
  return { hue: Math.round((angle * 60 + 360) % 360), saturation: Math.round(chroma * 100 / high) };
}

export function lightColorFromHueSaturation(hue, saturation) {
  if (!Number.isFinite(hue) || hue < 0 || hue > 360 ||
      !Number.isFinite(saturation) || saturation < 0 || saturation > 100) return null;
  const chroma = saturation / 100;
  const angle = (hue % 360) / 60;
  const middle = chroma * (1 - Math.abs(angle % 2 - 1));
  const channels = [
    [chroma, middle, 0], [middle, chroma, 0], [0, chroma, middle],
    [0, middle, chroma], [middle, 0, chroma], [chroma, 0, middle],
  ][Math.floor(angle)];
  return '#' + channels.map(channel => Math.round((channel + 1 - chroma) * 255)
    .toString(16).padStart(2, '0')).join('');
}

function rgbChromaticity(rgb) {
  // Wide RGB D65 transform used by Core for rgb_color to xy_color.
  const [red, green, blue] = rgb.map(channel => {
    const srgb = channel / 255;
    return srgb > 0.04045 ? ((srgb + 0.055) / 1.055) ** 2.4 : srgb / 12.92;
  });
  const x = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const z = red * 0.000088 + green * 0.072310 + blue * 0.986039;
  return [x / (x + y + z), y / (x + y + z)];
}

export function matchesLightColor(attributes, requested) {
  if (attributes?.color_mode === "xy") {
    const actual = attributes.xy_color;
    return Array.isArray(actual) && actual.length === 2
      && actual.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
      && rgbChromaticity(requested).every((value, index) => Math.abs(value - actual[index]) <= 0.002);
  }
  const actual = reportedColor(attributes);
  if (!actual) return false;
  // Home Assistant normalizes brightness when converting HS to RGB.
  const actualMax = Math.max(...actual);
  const requestedMax = Math.max(...requested);
  return requested.every((channel, index) =>
    Math.abs(channel / requestedMax - actual[index] / actualMax) <= 8 / 255);
}
