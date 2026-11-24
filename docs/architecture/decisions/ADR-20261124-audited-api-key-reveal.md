# ADR-20261124: Audited Reveal For Existing Gateway API Keys

Status: accepted
Owner: cloud-router-platform
Updated: 2026-11-24
Requirement: copy an existing gateway API key's plaintext from the console

## Context

Gateway API keys are stored as a hash plus a separately configured secret
(`plaintext` or AEAD `ciphertext`). The list contract deliberately returns only
`maskedKey`, and the console renders that value as a non-copyable chip. Users
who lose a key after creation can therefore only create a replacement, which
revokes the old credential's operational continuity.

The product decision is to let the owner copy an existing key on an explicit
click. A plain list-time `rawKey` would turn every page load into a bulk secret
disclosure and contradict the write-only contract; regeneration would force a
credential rotation the user did not ask for.

## Decision

Add one owner-scoped action, `POST /app/v3/api/iam/api_keys/{apiKeyId}/reveal`.

- The action resolves the key by `tenant_id`, `organization_id`, `user_id`,
  non-deleted and non-revoked; another user, organization, or tenant gets 404.
- The secret is decoded only inside the Postgres command store, from the stored
  `plaintext` or `ciphertext` material, using the same `ApiKeySecretStorageConfig`
  key ring that created it.
- A successful reveal writes `ops_audit_log` with action
  `reveal_api_key_secret`, the key id, tenant/org/user, operator and request id,
  and stamps `iam_gateway_api_key.last_revealed_at`. The audit row never carries
  secret material.
- The same key cannot be revealed twice within two seconds; the second attempt
  returns 429 and writes no audit row.
- The response shape is `{ item, rawKey }`; `item` remains the masked metadata.
  List, detail, and update responses stay unchanged and never carry `rawKey`.
- The console keeps the row masked, reveals only after a click, copies the
  plaintext, and never stores it in React state, local storage, or session
  storage.

## Consequences

- `IAM_SPEC.md` §5 gains a narrow exception for an explicitly invoked,
  owner-scoped, audited gateway-key reveal. The write-only rule continues to
  apply to list, detail, update, and every other response schema.
- The audit trail makes each disclosure attributable. `last_revealed_at`
  supports operational review and the per-key cooldown.
- Legacy rows without stored secret material return 409 with a message asking
  for a newly created key; they are not silently treated as empty.
- The action is still a secret-reading endpoint. Deployment should keep app
  session tokens short-lived and monitor `reveal_api_key_secret` audit volume.
  Multi-instance rate limiting beyond the per-key cooldown remains a platform
  concern, not a per-endpoint guarantee.

## Alternatives rejected

- **Return `rawKey` from the list.** Bulk disclosure on every page load; also
  impossible to attribute to a deliberate user action.
- **Regenerate-only.** Rotates a working credential without the user's consent
  and breaks existing clients.
- **Client-side decryption.** Moves key material and the key ring into the
  browser, which is strictly worse than a server-side audited action.
