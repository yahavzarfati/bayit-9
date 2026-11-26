import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test from 'node:test';
import { createScriptRegistry } from '../src/script-registry.js';

test('reads scoped script identities once per snapshot and discards invalidated responses', async () => {
  const selected = 'script.current_name';
  const entry = key => ({ entity_id:selected, platform:'script', unique_id:key });
  const calls = [];
  let event, unsubscribeCount = 0;
  const connection = {
    async subscribeEvents(handler, eventType) {
      assert.equal(eventType, 'entity_registry_updated');
      event = handler;
      return () => { unsubscribeCount++; };
    },
  };
  const snapshots = {};
  const hass = {
    user:{id:'member'}, connection, entities:{},
    callWS(request) {
      calls.push(request);
      const deferred = Promise.withResolvers();
      snapshots[calls.length] = deferred;
      return deferred.promise;
    },
  };
  const registry = createScriptRegistry(() => {});
  const update = state => registry.update(state, [selected, selected, 'light.fixture']);
  update(hass);
  update({ ...hass, states:{[selected]:{state:'on'}} });
  await setImmediate();
  assert.deepEqual(calls, [{type:'config/entity_registry/get_entries',entity_ids:[selected]}]);
  snapshots[1].resolve({ [selected]:entry('original_name') });
  await setImmediate();
  assert.deepEqual(registry.get(selected), entry('original_name'));

  event({data:{entity_id:'script.unrelated'}});
  assert.equal(calls.length, 1);
  event({data:{entity_id:'script.moved',old_entity_id:selected}});
  assert.equal(registry.get(selected), undefined);
  await setImmediate();
  const otherUser = { ...hass, user:{id:'other-member'} };
  update(otherUser);
  await setImmediate();
  snapshots[2].resolve({ [selected]:entry('stale_name') });
  snapshots[3].reject({code:'unauthorized'});
  await setImmediate();
  assert.equal(registry.get(selected), undefined);
  update({ ...otherUser, states:{[selected]:{state:'off'}} });
  await setImmediate();
  assert.equal(calls.length, 3, 'No fallback to a guessed identity or refetch on ordinary updates');

  update({ ...otherUser, entities:{} });
  await setImmediate();
  assert.equal(calls.length, 4);
  registry.dispose();
  snapshots[4].resolve({ [selected]:entry('stale_after_disconnect') });
  await setImmediate();
  assert.equal(registry.get(selected), undefined);
  assert.equal(unsubscribeCount, 2);
});
