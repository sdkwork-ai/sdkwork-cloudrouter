// Payment center → 支付设置 → 域名设置 wiring.
//
// The H5 payment domain and the callback (notify) domains are generated-SDK
// surfaces on the payment backend. These checks keep the admin package on the
// generated SDK (no raw HTTP) and keep the section routed from the sidebar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const applicationRoot = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return fs.readFileSync(path.join(applicationRoot, relativePath), 'utf8');
}

test('payment domain settings use generated payment backend endpoints', () => {
  const service = readSource('./packages/sdkwork-cloudrouter-pc-admin-payments/src/paymentsService.ts');

  assert.match(service, /getSdkworkPaymentBackendSdkClient\(\)\.payments\.domainSettings\.retrieve\(\)/);
  assert.match(service, /payments\.domainSettings\.update\(/);
  assert.match(service, /payments\.notifyDomains\.list\(/);
  assert.match(service, /payments\.notifyDomains\.create\(/);
  assert.match(service, /payments\.notifyDomains\.update\(/);
  assert.match(service, /payments\.notifyDomains\.delete\(/);
  // No raw HTTP or manual credential headers on the settings surface.
  assert.doesNotMatch(service, /\bfetch\(|\baxios\b/);
});

test('domain settings is a payment center section', () => {
  const index = readSource('./packages/sdkwork-cloudrouter-pc-admin-payments/src/index.tsx');

  assert.match(index, /sectionId === 'domainSettings'/);
  assert.match(index, /<PaymentDomainSettingsAdmin \/>/);
});

test('the one-cent test dialog surfaces the configured H5 cashier link', () => {
  const dialog = readSource(
    './packages/sdkwork-cloudrouter-pc-admin-payments/src/components/PaymentTestDialog.tsx',
  );

  assert.match(dialog, /testPayment\.cashierUrl/);
  assert.match(dialog, /methods\.testPayment\.h5Cashier/);
});

test('domain settings page keeps hostname and port validation local', () => {
  const page = readSource(
    './packages/sdkwork-cloudrouter-pc-admin-payments/src/components/PaymentDomainSettingsAdmin.tsx',
  );

  assert.match(page, /parseOptionalPort/);
  assert.match(page, /domainSettings\.h5\.hostnameRequired/);
  assert.match(page, /h5Protocol/);
  assert.match(page, /h5Hostname/);
  assert.match(page, /h5Port/);
  assert.match(page, /h5Status/);
});

test('callback domain defaults to the public API host, not the console host', () => {
  const page = readSource(
    './packages/sdkwork-cloudrouter-pc-admin-payments/src/components/PaymentDomainSettingsAdmin.tsx',
  );

  assert.match(page, /resolvePublicApiHostname/);
  assert.match(page, /currentCallbackHost/);
  assert.match(page, /useState<CallbackDomainForm>\(defaultCallbackForm\)/);
});
