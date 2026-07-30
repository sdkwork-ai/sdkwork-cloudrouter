# Source Configuration

`sdkwork.deployment.config.json` is the source-controlled deployment index for Claw Router.
It selects one profile under `topology/` for the `standalone|cloud` and
`development|test|staging|production` matrix. Gateway TOML files and safe database/nginx examples
also live here. Environment variables and CLI flags are runtime overrides, not the checked-in
configuration authority.

Committed files must not contain passwords, tokens, API keys, private keys, or developer-local
absolute paths. Local overrides use ignored `*.local.*` files; production secrets come from mounted
secret files or the platform secret manager.

Verify with:

```bash
node ../sdkwork-specs/tools/check-source-config-standard.mjs --root .
node ../sdkwork-app-topology/scripts/sdkwork-topology.mjs validate --root . --spec specs/topology.spec.json
```

## Server secret files

[`clawrouter.database.example.toml`](clawrouter.database.example.toml) is the safe server runtime
template. `SDKWORK_CLAW_CONFIG_FILE` selects the operator-owned materialized copy. The template
contains secret-file references only; the referenced files are provisioned by the platform secret
manager with owner-only read permissions.

PostgreSQL server runtimes fail startup unless both API key hashing and upstream credential
encryption are configured. The preferred inputs are:

- `SDKWORK_CLAW_API_KEY_PEPPER_FILE`, or `[security].api_key_pepper_file`.
- `SDKWORK_CLAW_UPSTREAM_CREDENTIAL_KEY_RING_FILE`, or
  `[security].upstream_credential_key_ring_file`.

The upstream credential key ring file is UTF-8 JSON with this shape. Values shown as angle-bracket
placeholders are operator-provided random secrets and are never committed:

```json
{
  "activeKeyId": "<rotation-id>",
  "activeKey": "<at-least-32-byte-random-secret>",
  "fingerprintKey": "<stable-at-least-32-byte-random-secret>",
  "decryptionKeys": [
    {
      "keyId": "<previous-rotation-id>",
      "key": "<previous-random-secret>"
    }
  ]
}
```

`activeKey` encrypts new upstream account credentials. `decryptionKeys` supports a bounded overlap
window for old ciphertext. `fingerprintKey` is independent and remains stable across encryption-key
rotation so credential idempotency does not drift. The file is limited to 128 KiB, each key to
4 KiB, and at most 16 historical decryption keys.

For local development only, `pnpm dev` creates random host-local security files at
`.sdkwork/secrets/upstream-credential-key-ring.development.json` and
`.sdkwork/secrets/internal-gateway-signing.development.secret` when their corresponding inline or
file inputs are not configured. The ignored files are reused across restarts so encrypted
development credentials remain readable and internal request signatures remain stable. Explicit
environment or operator-managed file configuration always takes precedence; staging and production
never use these development fallbacks.
