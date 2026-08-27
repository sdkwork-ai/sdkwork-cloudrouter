#!/usr/bin/env node
// Simulates the agents turn executor's internal-gateway channel:
// POST /internal/v3/gateway/v1/chat/completions with HMAC-HKDF signed headers.
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';

const secret = readFileSync('E:/sdkwork-space/sdkwork-cloudrouter/.sdkwork/secrets/internal-gateway-signing.development.secret', 'utf8').trim();
const SALT = Buffer.from('sdkwork-cloudrouter-internal-gateway-v1', 'utf8');
const INFO = Buffer.from('request-signing', 'utf8');

// HKDF-SHA256 extract+expand (matches derive_aes_256_key)
function hkdfSha256(ikm, salt, info, length) {
  const prk = createHmac('sha256', salt).update(ikm).digest();
  let t = Buffer.alloc(0);
  let okm = Buffer.alloc(0);
  for (let i = 1; okm.length < length; i++) {
    t = createHmac('sha256', prk).update(Buffer.concat([t, info, Buffer.from([i])])).digest();
    okm = Buffer.concat([okm, t]);
  }
  return okm.subarray(0, length);
}
const b64url = (buf) => buf.toString('base64url');
const signingKey = hkdfSha256(Buffer.from(secret, 'utf8'), SALT, INFO, 32);

const now = Math.floor(Date.now() / 1000);
const ttl = 30;
const nonce = b64url(randomBytes(18));
const body = JSON.stringify({
  model: 'deepseek/deepseek-v4-flash',
  messages: [{ role: 'user', content: 'ping' }],
  stream: false,
  max_tokens: 8,
});
const bodySha256 = createHash('sha256').update(body).digest('hex');

const principal = {
  apiKeyId: 1,
  tenantId: 100001,
  organizationId: 0,
  userId: 1,
  accountGroupId: 1150079326059387300,
};
const method = 'POST';
const internalPath = '/internal/v3/gateway/v1/chat/completions';

const canonical = [
  'v1',
  principal.apiKeyId,
  principal.tenantId,
  principal.organizationId,
  principal.userId,
  principal.accountGroupId,
  method.toUpperCase(),
  internalPath,
  now,
  now + ttl,
  nonce,
  bodySha256,
].join('\n');
const signature = b64url(createHmac('sha256', signingKey).update(canonical).digest());

const headers = {
  'x-sdkwork-internal-auth-version': 'v1',
  'x-sdkwork-internal-api-key-id': String(principal.apiKeyId),
  'x-sdkwork-internal-tenant-id': String(principal.tenantId),
  'x-sdkwork-internal-organization-id': String(principal.organizationId),
  'x-sdkwork-internal-user-id': String(principal.userId),
  'x-sdkwork-internal-account-group-id': String(principal.accountGroupId),
  'x-sdkwork-internal-issued-at': String(now),
  'x-sdkwork-internal-expires-at': String(now + ttl),
  'x-sdkwork-internal-nonce': nonce,
  'x-sdkwork-internal-body-sha256': bodySha256,
  'x-sdkwork-internal-signature': signature,
  'content-type': 'application/json',
  'content-length': Buffer.byteLength(body),
};

const req = http.request({ host: '127.0.0.1', port: 3905, path: internalPath, method: 'POST', headers }, (res) => {
  let data = '';
  res.on('data', (c) => (data += c));
  res.on('end', () => {
    console.log('HTTP', res.statusCode);
    console.log('headers:', JSON.stringify({ ...res.headers }, null, 1).slice(0, 800));
    console.log('body:', data.slice(0, 1200));
  });
});
req.on('error', (e) => { console.error('request error', e.message); process.exit(1); });
req.write(body);
req.end();
