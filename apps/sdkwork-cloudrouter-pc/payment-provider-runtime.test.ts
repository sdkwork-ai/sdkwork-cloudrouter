// Reproduction: does the cloudrouter PC domain-service-providers wiring
// configure the payment backend service for the admin payments page?
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configureCloudRouterDomainServiceProviders } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import {
  getSdkworkPaymentBackendService,
  getSdkworkPaymentService,
} from '@sdkwork/payment-service';

test('payment service provider is configured after cloudrouter domain bootstrap', () => {
  configureCloudRouterDomainServiceProviders();
  const service = getSdkworkPaymentService();
  assert.ok(service, 'payment app service must be configured');
  const backend = getSdkworkPaymentBackendService();
  assert.ok(backend, 'payment backend service must be configured');
  assert.equal(typeof backend.providerAccounts.list, 'function');
  assert.equal(typeof backend.providerAccounts.create, 'function');
  assert.equal(typeof backend.reconciliationRuns.list, 'function');
  assert.equal(typeof backend.dev.sandboxTrigger, 'function');
});
