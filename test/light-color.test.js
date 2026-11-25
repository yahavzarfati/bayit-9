import assert from 'node:assert/strict';
import test from 'node:test';
import { lightColorFromHueSaturation, lightColorHex, lightHueSaturation, lightWhiteRailColor } from '../src/light-color.mjs';

test('hue and saturation describe a color independently of its brightness', () => {
  assert.deepEqual(lightHueSaturation('#804020'), { hue: 20, saturation: 75 });
  assert.deepEqual(lightHueSaturation('#ff8040'), { hue: 20, saturation: 75 });
  assert.deepEqual(lightHueSaturation('#808080'), { hue: 0, saturation: 0 });
  assert.equal(lightHueSaturation('#000000'), null);

  assert.equal(lightColorFromHueSaturation(120, 100), '#00ff00');
  assert.equal(lightColorFromHueSaturation(240, 50), '#8080ff');
  assert.equal(lightColorFromHueSaturation(30, 0), '#ffffff');
  assert.equal(lightColorFromHueSaturation(360, 100), '#ff0000');
  assert.equal(lightColorFromHueSaturation(361, 50), null);
  assert.equal(lightColorFromHueSaturation(120, -1), null);
});

test('white slider tint uses only validated RGB reported in temperature mode', () => {
  assert.equal(lightWhiteRailColor({ color_mode: 'color_temp', rgb_color: [246, 144, 80] }), '#f69050');
  for (const rgb of [undefined, [0, 0, 0], [256, 144, 80], [246, 144.2, 80], ['246', 144, 80], [246, 144], [246, 144, 80, 1]]) {
    assert.equal(lightWhiteRailColor({ color_mode: 'color_temp', rgb_color: rgb }), null);
  }
  const red = { color_mode: 'rgb', rgb_color: [255, 0, 0] };
  assert.equal(lightWhiteRailColor(red), null);
  assert.equal(lightColorHex(red), '#ff0000');
  assert.equal(lightColorHex({ ...red, color_mode: 'color_temp' }), null);
});
