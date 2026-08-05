// Reproduction: does the cloudrouter PC domain-service-providers wiring
// configure the payment backend service for the admin payments page?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCloudRouterDomainServiceProviders } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import { getCloudRouterPaymentBackendService } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

test('payment service provider is configured after cloudrouter domain bootstrap', () => {
  configureCloudRouterDomainServiceProviders();
  const backend = getCloudRouterPaymentBackendService();
  assert.ok(backend, 'payment backend service must be configured');
  assert.equal(typeof backend.providerAccounts.list, 'function');
  assert.equal(typeof backend.providerAccounts.create, 'function');
  assert.equal(typeof backend.reconciliationRuns.list, 'function');
  assert.equal(typeof backend.dev.sandboxTrigger, 'function');
});

test('payment admin maintenance operations are wired through the backend service', () => {
  configureCloudRouterDomainServiceProviders();
  const backend = getCloudRouterPaymentBackendService();
  assert.equal(typeof backend.methods.list, 'function');
  assert.equal(typeof backend.methods.create, 'function');
  assert.equal(typeof backend.methods.update, 'function');
  assert.equal(typeof backend.channels.list, 'function');
  assert.equal(typeof backend.channels.create, 'function');
  assert.equal(typeof backend.routeRules.list, 'function');
  assert.equal(typeof backend.routeRules.create, 'function');
  assert.equal(typeof backend.routeRules.update, 'function');
  assert.equal(typeof backend.routeRules.delete, 'function');
  assert.equal(typeof backend.webhookEvents.list, 'function');
  assert.equal(typeof backend.webhookEvents.replay, 'function');
  assert.equal(typeof backend.reconciliationRuns.create, 'function');
  assert.equal(typeof backend.intents.list, 'function');
  assert.equal(typeof backend.intents.retrieve, 'function');
});
