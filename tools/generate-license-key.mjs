#!/usr/bin/env node
/**
 * SDKWork internal license key signer for sdkwork-cloudrouter.
 *
 * Signing happens at the SDKWork commercial side; the private key never
 * ships in the product. The public key embedded in
 * crates/sdkwork-cloudrouter-license/src/lib.rs is the raw 32-byte Ed25519
 * public key (base64url) corresponding to the private key produced by:
 *
 *   node -e "const {generateKeyPairSync}=require('crypto');const{publicKey,privateKey}=generateKeyPairSync('ed25519');const raw=publicKey.export({type:'spki',format:'der'}).subarray(-32);console.log('PUBLIC_RAW:',raw.toString('base64url'));console.log('PRIVATE:',privateKey.export({type:'pkcs8',format:'pem'}).replace(/-----[^-]+-----|\n/g,''))"
 *
 * Usage:
 *   SDKWORK_LICENSE_PRIVATE_KEY=<base64 pkcs8> \
 *     node tools/generate-license-key.mjs --tier pro --customer acme \
 *       [--expires-at 2027-08-07T00:00:00Z] [--days 365]
 *
 * Output: the license key to configure as SDKWORK_CLOUDROUTER_LICENSE_KEY
 * (or write to the license file).
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function parseArgs(argv) {
  const options = { tier: 'community', customer: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tier') options.tier = argv[++i];
    else if (arg === '--customer') options.customer = argv[++i];
    else if (arg === '--expires-at') options.expiresAt = argv[++i];
    else if (arg === '--days') options.days = Number(argv[++i]);
    else if (arg === '--private-key-file') options.privateKeyFile = argv[++i];
    else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!['community', 'pro', 'enterprise', 'oem'].includes(options.tier)) {
    throw new Error(`invalid tier: ${options.tier} (community|pro|enterprise|oem)`);
  }
  if (!options.customer) throw new Error('--customer is required');
  return options;
}

function encodeBase64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const privateKeyBase64 =
    process.env.SDKWORK_LICENSE_PRIVATE_KEY
    ?? (options.privateKeyFile ? readFileSync(options.privateKeyFile, 'utf8').trim() : undefined);
  if (!privateKeyBase64) {
    throw new Error(
      'SDKWORK_LICENSE_PRIVATE_KEY (base64 pkcs8) or --private-key-file is required',
    );
  }

  const issuedAt = new Date().toISOString();
  let expiresAt;
  if (options.expiresAt) {
    expiresAt = new Date(options.expiresAt).toISOString();
  } else if (options.days) {
    const date = new Date(Date.now() + options.days * 24 * 60 * 60 * 1000);
    expiresAt = date.toISOString();
  }

  const payload = { tier: options.tier, customer: options.customer, issued_at: issuedAt };
  if (expiresAt) payload.expires_at = expiresAt;

  const pem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;
  const privateKey = createPrivateKey(pem);
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = sign(null, payloadBytes, privateKey);

  console.log(`v1.${encodeBase64Url(payloadBytes)}.${encodeBase64Url(signature)}`);
  console.error(`[license] tier=${options.tier} customer=${options.customer} expires_at=${expiresAt ?? 'never'}`);
}

try {
  main();
} catch (error) {
  console.error(`[license] error: ${error.message}`);
  process.exit(1);
}
