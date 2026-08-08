# Cloud Router Commercial Licensing

**Status:** active · **Owner:** SDKWork commercial team

This document explains how commercial editions (docs/commercial/PRICING.md)
are enforced at deployment time.

## Edition model

| Edition | Tier key | Requires license |
|---|---|---|
| Community | `community` | no (AGPL, default) |
| Pro | `pro` | yes |
| Enterprise | `enterprise` | yes |
| OEM / White-label | `oem` | yes |

Without a license key the gateway runs the community edition: it logs
`cloud router community edition`, injects `window.__SDKWORK_EDITION__ =
"community"` into the portal, and behaves exactly as today. Configuring a
valid signed license switches the edition reported in logs and portal
runtime; feature gating per tier follows the commercial roadmap and is
reviewed per release.

## License key format

A license key is a compact Ed25519-signed payload:

```
v1.<base64url(json payload)>.<base64url(ed25519 signature)>
```

Payload JSON:

```json
{
  "tier": "pro",
  "customer": "acme",
  "issued_at": "2026-08-07T00:00:00Z",
  "expires_at": "2027-08-07T00:00:00Z"
}
```

Verification is done at gateway startup against the SDKWork public key
embedded in `crates/sdkwork-cloudrouter-license/src/lib.rs`
(`SDKWORK_LICENSE_ED25519_PUBLIC_KEY`). Invalid or expired keys fall back to
community edition with a warning in the gateway log.

## Signing keys (SDKWork side — never shipped)

The signing private key is held by the SDKWork commercial team only. To
generate the key pair:

```bash
node -e "const {generateKeyPairSync}=require('crypto');const{publicKey,privateKey}=generateKeyPairSync('ed25519');const raw=publicKey.export({type:'spki',format:'der'}).subarray(-32);console.log('PUBLIC_RAW:',raw.toString('base64url'));console.log('PRIVATE:',privateKey.export({type:'pkcs8',format:'pem'}).replace(/-----[^-]+-----|\n/g,''))"
```

1. Store the **private key** in a secret manager; never commit it.
2. Replace the **raw 32-byte public key** constant in
   `crates/sdkwork-cloudrouter-license/src/lib.rs` if the pair is rotated,
   and re-release the gateways.

## Issuing a license key

```bash
SDKWORK_LICENSE_PRIVATE_KEY=<base64 pkcs8> \
  node tools/generate-license-key.mjs \
  --tier pro --customer acme --days 365
# or: --expires-at 2027-08-07T00:00:00Z  (OEM keys usually omit expiry)
```

Output is the license key to hand to the customer.

## Deploying a license

```bash
# Option A: environment
SDKWORK_CLOUDROUTER_LICENSE_KEY=v1.<payload>.<signature>

# Option B: mounted file (recommended for docker compose)
# docker-compose.yml:
#   - ./docker/config/license.key:/etc/sdkwork/router/license.key:ro
# default path: /etc/sdkwork/router/license.key (override with
# SDKWORK_CLOUDROUTER_LICENSE_FILE)
```

Restart the gateway and check the log line:
`cloud router licensed edition tier=pro customer=acme expires_at=...`.

## Verification

- Startup log: licensed edition line or community warning.
- Portal runtime: `curl http://127.0.0.1:3903/runtime-env.js | grep SDKWORK_EDITION`
- A tampered key fails signature verification (`license signature verification
  failed`) and the gateway runs community edition.
