import { test } from 'node:test';import assert from 'node:assert/strict';
import { hasInAppHistory } from '../src/lib/back-navigation.ts';
test('voltar só usa o histórico quando há tela anterior dentro do app', () => {
  assert.equal(hasInAppHistory({ idx: 2 }), true);
  assert.equal(hasInAppHistory({ idx: 1 }), true);
  assert.equal(hasInAppHistory({ idx: 0 }), false);
  assert.equal(hasInAppHistory(null), false);
  assert.equal(hasInAppHistory({}), false);
});
