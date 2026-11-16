#!/usr/bin/env node
/**
 * Anonymous cashier smoke test (`pnpm test:anonymous-cashier`).
 *
 * Exercises the scanned-QR contract end to end against a running deployment and
 * prints one PASS/FAIL line per check:
 *
 *   1. a legacy pair (`orderId` + `outTradeNo`) is exchanged for a capability token
 *   2. a tampered token is rejected
 *   3. the token reads the cashier view **without any credential header**
 *   4. the view carries only the whitelisted fields (no ownership/PII leak)
 *   5. optionally, a payment is created from the token and returns a capability link
 *   6. the anonymous status endpoint answers
 *
 * Usage:
 *   node scripts/anonymous-cashier-smoke.mjs \
 *     --api http://127.0.0.1:3910 \
 *     [--host api-dev.birdcoder.com] \
 *     --order-id <uuid> --out-trade-no <trade-no> \
 *     [--method alipay_wap] [--create-payment] [--insecure]
 *
 * Exit codes: 0 all checks passed, 1 a check failed, 2 usage error.
 */

const args = process.argv.slice(2);

function readFlag(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

const apiBase = (readFlag('--api') ?? 'http://127.0.0.1:3910').replace(/\/+$/u, '');
const hostHeader = readFlag('--host');
const orderId = readFlag('--order-id');
const outTradeNo = readFlag('--out-trade-no');
const method = readFlag('--method') ?? 'alipay_wap';

if (hasFlag('--insecure')) {
  // Dev edges serve a self-signed certificate; only ever opt in explicitly.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('WARN  TLS verification disabled for this run (--insecure)');
}

if (!orderId || !outTradeNo) {
  console.error('usage: anonymous-cashier-smoke.mjs --order-id <uuid> --out-trade-no <trade-no> [--api <url>] [--method <m>] [--create-payment]');
  process.exit(2);
}

/** Fields the anonymous cashier must never return. */
const FORBIDDEN_FIELDS = [
  'ownerUserId',
  'owner_user_id',
  'organizationId',
  'organization_id',
  'userId',
  'user_id',
  'phone',
  'mobile',
  'address',
  'receiverPhone',
  'balance',
];

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const marker = ok ? 'PASS' : 'FAIL';
  console.log(`${marker}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, init = {}) {
  const headers = { accept: 'application/json', ...(init.headers ?? {}) };
  if (hostHeader) headers.host = hostHeader;
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

function itemOf(body) {
  return body?.data?.item;
}

/**
 * Explains a failed exchange without guessing.
 *
 * The cashier endpoints collapse every failure into one 404, so an operator
 * cannot tell an old deployment from a misconfigured one by status alone. This
 * probes a deliberately invalid token: a registered route answers with the
 * cashier operation id, while a stale deployment reports a missing manifest
 * route.
 */
async function diagnoseExchangeFailure(exchange) {
  const detail = exchange.body?.detail ?? '(no detail)';
  console.log(`      exchange detail: ${detail}`);
  const probe = await request('/app/v3/api/cashier/v1.smoke-check.invalid');
  const probeDetail = probe.body?.detail ?? '';
  const probeOperation = probe.body?.operationId ?? '';
  if (probeOperation === 'cashier.retrieve') {
    console.log('DIAG  cashier routes are deployed; the exchange rejected this order/trade pair.');
    console.log('      likely causes: no SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET in the gateway,');
    console.log('      or outTradeNo does not match the order request_no / order_no / payment attempt.');
    return;
  }
  if (/not registered in the gateway route manifest/u.test(probeDetail)) {
    console.log('DIAG  this deployment predates the anonymous cashier routes (stale gateway image).');
    return;
  }
  console.log(`DIAG  cashier route probe status=${probe.status} detail=${probeDetail || '(none)'}`);
}

async function main() {
  // 1. legacy pair -> capability token
  const exchange = await request('/app/v3/api/cashier/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId, outTradeNo }),
  });
  const token = itemOf(exchange.body)?.token;
  record(
    'legacy pair exchanges for a capability token',
    exchange.status === 201 && typeof token === 'string' && token.startsWith('v1.'),
    `status=${exchange.status}`,
  );
  if (!token) {
    await diagnoseExchangeFailure(exchange);
    summarize();
    return;
  }

  // 2. tampered token is rejected
  const tampered = `${token.slice(0, -4)}aaaa`;
  const tamperedView = await request(`/app/v3/api/cashier/${encodeURIComponent(tampered)}`);
  record(
    'tampered token is rejected',
    tamperedView.status === 404,
    `status=${tamperedView.status}`,
  );

  // 3. token reads the cashier without credentials
  const view = await request(`/app/v3/api/cashier/${encodeURIComponent(token)}`);
  const cashier = itemOf(view.body);
  record(
    'capability token reads the cashier view without credentials',
    view.status === 200 && cashier?.payable === true,
    `status=${view.status} payable=${cashier?.payable}`,
  );

  // 4. whitelist: no ownership or PII fields
  const serialized = JSON.stringify(cashier ?? {});
  const leaked = FORBIDDEN_FIELDS.filter((field) => serialized.includes(`"${field}"`));
  record(
    'view exposes only whitelisted fields',
    leaked.length === 0,
    leaked.length === 0 ? 'no ownership/PII fields' : `leaked=${leaked.join(',')}`,
  );

  // 5. optional payment creation
  if (hasFlag('--create-payment')) {
    const payment = await request(`/app/v3/api/cashier/${encodeURIComponent(token)}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethod: method }),
    });
    const item = itemOf(payment.body);
    const cashierUrl = item?.paymentParams?.cashierUrl ?? '';
    record(
      'payment is created from the capability token',
      (payment.status === 200 || payment.status === 201) && Boolean(item?.paymentId),
      `status=${payment.status} method=${item?.paymentMethod ?? method}`,
    );
    record(
      'the emitted cashier link stays a capability link',
      typeof cashierUrl === 'string' && cashierUrl.includes('/cashier/v1.'),
      cashierUrl ? 'token link' : 'no cashierUrl',
    );
  }

  // 6. anonymous status endpoint
  const status = await request(`/app/v3/api/cashier/${encodeURIComponent(token)}/status`);
  const state = itemOf(status.body);
  record(
    'anonymous status endpoint answers',
    status.status === 200 && typeof state?.paid === 'boolean',
    `status=${status.status} paid=${state?.paid}`,
  );

  summarize();
}

function summarize() {
  const failed = results.filter((entry) => !entry.ok);
  console.log('');
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`smoke test crashed: ${error?.message ?? error}`);
  process.exit(1);
});
