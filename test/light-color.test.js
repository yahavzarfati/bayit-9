import assert from 'node:assert/strict';
import test from 'node:test';
import { lightColorFromHueSaturation, lightHueSaturation } from '../src/light-color.mjs';

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
