import assert from 'node:assert/strict';
import test from 'node:test';
import { appearanceHelperChoices, normalizeAppearanceHelpers, reportedAppearanceHelper } from '../src/appearance-helpers.js';
import { generateDashboard } from '../src/strategy-model.js';

test('normalizes only unique exact input-select mappings for the supported appearance options', () => {
  const shared = [{ id:'fixture-photo' }];
  const bindings = {
    background: { entity:'input_select.background', options:{
      design_default:'Default', 'fixture-photo':'Photo', personal:'Private', unavailable:'No', aurora:'  ',
    } },
    shape: { entity:'input_select.shape', options:{ circle:'Circle', soft:' circle ' } },
    layout: { entity:'select.layout', options:{ header:'Above' } },
  };
  assert.ok(appearanceHelperChoices('background', shared).includes('design_default'));
  assert.ok(!appearanceHelperChoices('background', shared).includes('personal'));
  const normalized = normalizeAppearanceHelpers(bindings, shared);
  assert.deepEqual(normalized, {
    background: { entity:'input_select.background', options:{ design_default:'Default', 'fixture-photo':'Photo' } },
    shape: { entity:'input_select.shape', options:{ circle:'Circle', soft:' circle ' } },
  });
  assert.deepEqual(normalizeAppearanceHelpers({
    layout: { entity:'input_select.layout', options:{ header:'Same', classic:'Same' } },
    background: bindings.background,
    shape: { entity:bindings.background.entity, options:{ circle:'Circle' } },
  }, shared), {});
  assert.deepEqual(normalizeAppearanceHelpers({ shape:{ entity:'input_select.shape', options:{} } }), {});
});

test('resolves a reported exact choice and keeps only values advertised by Home Assistant', () => {
  const binding = { entity:'input_select.layout', options:{ header:'Above', classic:'Original' } };
  const snapshot = (state, options) => ({ state, attributes:{ options } });
  assert.deepEqual(reportedAppearanceHelper(binding, snapshot('Above',['Above','Extra'])), {
    selected:'header', options:{ header:'Above' },
  });
  assert.deepEqual(reportedAppearanceHelper(binding, snapshot('Extra',['Above','Extra'])), {
    selected:undefined, options:{ header:'Above' },
  });
  assert.equal(reportedAppearanceHelper(binding, snapshot('above',['Above'])), undefined);
  for (const state of ['unavailable','unknown']) {
    assert.equal(reportedAppearanceHelper(binding, snapshot(state,[state,'Above'])), undefined);
  }
});

test('forwards authored appearance helpers and the visibility deny list through the public strategy', () => {
  const raw = { appearance_helpers:{ background:{
    entity:'input_select.palette', options:{ 'fixture-photo':'Photo' },
  } }, shared_wallpapers:[{name:'A photo',id:'fixture-photo',path:'/local/fixture.webp'}],
    hidden_entities:['input_select.palette'] };
  const card = generateDashboard(raw).views[0].cards[0];
  assert.deepEqual(card.appearance_helpers, raw.appearance_helpers);
  assert.deepEqual(card.hidden_entities, raw.hidden_entities);
  assert.equal(generateDashboard({}).views[0].cards[0].appearance_helpers, undefined);
});
