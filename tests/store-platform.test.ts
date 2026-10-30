import { test } from 'node:test';import assert from 'node:assert/strict';
import { canPurchaseOrganizerPlans, isOrganizerPlanPath } from '../src/lib/store-platform.ts';
test('store applications block subscription purchases while web stays available', () => {
  assert.equal(canPurchaseOrganizerPlans(true), false);assert.equal(canPurchaseOrganizerPlans(false), true);
  for (const path of ['/precos','/organizadores','/planos/organizador','/politica/pro','/politica/enterprise','/organizador/painel/assinaturas']) assert.equal(isOrganizerPlanPath(path), true, path);
  for (const path of ['/evento/real-event','/checkout/real-order','/excluir-conta','/privacidade','/organizador/painel/configuracoes']) assert.equal(isOrganizerPlanPath(path), false, path);
});
