/**
 * Cashier URL-path contract for the Cloud Router H5 renderer.
 *
 * The order/payment backends emit the unified cashier deep link
 * `{h5BaseUrl}/cashier/{orderId}?scene=..&outTradeNo=..`
 * (`sdkwork-utils-rust::build_commerce_cashier_url`), and sdkwork-im already
 * mounts the same route set. These paths MUST stay byte-identical so a QR code
 * generated for one host opens the cashier on every host.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const H5_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(path.join(H5_ROOT, relativePath), 'utf8');
}

test('order/cashier routes keep the sdkwork-im path shape', async () => {
  const { CLOUDROUTER_H5_ORDER_ROUTES } = await import(
    '../packages/sdkwork-cloudrouter-h5-orders/src/routes.ts'
  );
  const routes = CLOUDROUTER_H5_ORDER_ROUTES;
  assert.equal(routes.cashierEntry.path, '/cashier/:orderId');
  assert.equal(routes.orderCashier.path, '/me/orders/:orderId/cashier');
  assert.equal(routes.orderCenter.path, '/me/orders');
  assert.equal(routes.orderDetail.path, '/me/orders/:orderId');
  assert.equal(routes.refundRequests.path, '/me/orders/refunds');
  // Route ids stay equal to the order owner manifest and sdkwork-im.
  assert.equal(routes.cashierEntry.id, 'app.commerce.orders.cashier-entry');
  assert.equal(routes.orderCashier.id, 'app.commerce.orders.cashier');
  assert.equal(routes.orderCenter.id, 'app.commerce.orders.center');
  assert.equal(routes.orderDetail.id, 'app.commerce.orders.detail');
});

test('the H5 app mounts every order/cashier route outside the console shell', () => {
  const appSource = read('src/App.tsx');
  for (const key of [
    'cashierEntry',
    'orderCashier',
    'orderCenter',
    'orderDetail',
    'refundRequests',
  ]) {
    assert.match(
      appSource,
      new RegExp(`CLOUDROUTER_H5_ORDER_ROUTES\\.${key}\\.path`, 'u'),
      `App mounts ${key}`,
    );
  }
});

test('a real cashier deep-link is folded into the hash router', async () => {
  const { resolveOrderDeepLinkHash, adoptOrderDeepLinkHash } = await import(
    '../src/commerce/entryRoute.ts'
  );
  const search = '?scene=recharge&outTradeNo=OT-1';
  assert.equal(
    resolveOrderDeepLinkHash('/cashier/ORD-1', search),
    `#/cashier/ORD-1${search}`,
  );
  assert.equal(
    resolveOrderDeepLinkHash('/me/orders/ORD-1/cashier', ''),
    '#/me/orders/ORD-1/cashier',
  );
  // Unrelated console paths are never rewritten by the cashier adoption.
  assert.equal(resolveOrderDeepLinkHash('/console/dashboard', ''), null);
  assert.equal(resolveOrderDeepLinkHash('/dashboard', ''), null);

  const replaced = [];
  const history = {
    state: null,
    replaceState(_state, _title, url) {
      replaced.push(url);
    },
  };
  const adopted = adoptOrderDeepLinkHash(
    { pathname: '/cashier/ORD-1', search, hash: '' },
    history,
  );
  assert.equal(adopted, `#/cashier/ORD-1${search}`);
  assert.deepEqual(replaced, [`/cashier/ORD-1#/cashier/ORD-1${search}`]);
  // A navigation that already carries a hash route is left untouched.
  assert.equal(
    adoptOrderDeepLinkHash(
      { pathname: '/cashier/ORD-1', search, hash: '#/cashier/ORD-1' },
      history,
    ),
    null,
  );
});

test('the bootstrap injects the order App SDK client into the order runtime', () => {
  const bootstrapSource = read('src/bootstrap/sdkClients.ts');
  assert.match(bootstrapSource, /initCloudRouterH5OrderAppSdkClient/u);
  assert.match(bootstrapSource, /configureCloudRouterOrderRuntime\(\s*\{\s*client:/u);
  const ordersPackage = JSON.parse(read('packages/sdkwork-cloudrouter-h5-orders/package.json'));
  assert.equal(
    ordersPackage.dependencies['@sdkwork/order-mobile-react-orders'],
    'workspace:*',
  );
});

test('a legacy cashier link is exchanged for a token instead of showing login', async () => {
  const { planCashierEntry } = await import('../src/commerce/cashierEntry.ts');
  // Signed token links render the anonymous cashier directly.
  assert.deepEqual(planCashierEntry('v1.payload.signature', null), {
    kind: 'token',
    token: 'v1.payload.signature',
  });
  // The reported legacy shape: orderId + outTradeNo from the printed QR.
  assert.deepEqual(
    planCashierEntry(
      '69d1124a-4740-4631-baeb-5d63717e6eb8',
      'MEMBERSHIP88d35e114d97f6e5',
    ),
    {
      kind: 'exchange',
      orderId: '69d1124a-4740-4631-baeb-5d63717e6eb8',
      outTradeNo: 'MEMBERSHIP88d35e114d97f6e5',
    },
  );
  // A token that also carries a stale query parameter still wins.
  assert.equal(planCashierEntry('v1.a.b', 'OT-1').kind, 'token');
  // A bare order id has no payable proof and keeps the session-gated flow.
  assert.deepEqual(planCashierEntry('69d1124a-4740-4631-baeb-5d63717e6eb8', null), {
    kind: 'login',
  });
  assert.deepEqual(planCashierEntry(undefined, 'OT-1'), { kind: 'login' });
  assert.deepEqual(planCashierEntry('  ', '  '), { kind: 'login' });
});

test('the cashier entry exchanges legacy links through the generated Order SDK', () => {
  const routeSource = read('src/routes/OrderRoutes.tsx');
  assert.match(routeSource, /resolveLegacyCashierToken/u);
  assert.match(routeSource, /planCashierEntry/u);
  assert.doesNotMatch(routeSource, /isCashierCapabilityToken/u);
  const serviceSource = read('packages/sdkwork-cloudrouter-h5-orders/src/anonymousCashier.ts');
  assert.match(serviceSource, /orderCashier\.cashier\.links\.create/u);
});
