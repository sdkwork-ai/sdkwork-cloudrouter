# Login QRCode System

This document describes the SDKWork Claw Router login and registration QRCode flow after the appbase OAuth migration. It is limited to QR session behavior, scanner flow, and the OAuth resource-account configuration needed to generate scannable entries.

## Canonical Model

QR login is owned by `sdkwork-appbase` OAuth runtime APIs. Claw Router consumes those APIs through generated appbase SDK clients and must not reintroduce product-local provider-account management or local QR login contracts.

The canonical public identifier is `sessionKey`. URLs carry it as `session_key`; JSON and SDK payloads use `sessionKey`.

Supported QR purposes are `login` and `register`. Both use the same OAuth session resource. The password completion endpoint decides whether to run IAM login or registration from the stored session purpose.

## API Contract

Appbase app APIs:

```text
POST /app/v3/api/oauth/sessions
GET  /app/v3/api/oauth/sessions/{sessionKey}
POST /app/v3/api/oauth/sessions/{sessionKey}/scans
POST /app/v3/api/oauth/sessions/{sessionKey}/passwords
```

Generated appbase app SDK shape:

```ts
client.oauth.sessions.create({ purpose: 'login' | 'register' })
client.oauth.sessions.retrieve(sessionKey)
client.oauth.sessions.scans.create(sessionKey, body)
client.oauth.sessions.passwords.create(sessionKey, body)
```

Backend/admin OAuth configuration is owned by appbase backend APIs under `/backend/v3/api/iam/oauth/*`. Claw Router admin pages must call `@sdkwork/iam-backend-sdk` through the existing appbase SDK boundary, for example `client.iam.oauth.resourceAccounts.*`, `client.iam.oauth.operationalResources.*`, and `client.iam.oauth.webhookConfigs.*`.

All operation ids follow `API_SPEC`: dotted lowerCamel resource-tree ids such as `oauth.sessions.create`, `oauth.sessions.scans.create`, and backend `iam.oauth.resourceAccounts.create`. URL query names use lower snake case; JSON fields use lowerCamelCase.

## Admin Configuration

OAuth provider configuration is provider-neutral and appbase-owned. Resource accounts describe configured external provider identities, such as official accounts and mini programs. Operational resources describe scannable entries, menus, domains, callback settings, and provider-specific resources attached to those accounts.

Resource account fields remain compact:

- `providerCode`: stable provider code.
- `resourceAccountKind`: `official_account`, `mini_program`, `open_app`, or another appbase catalog kind.
- `accountName`: display name.
- `providerAccountId`: external provider account id when available.
- `providerAccountOriginalId`: provider original id when available.
- `appId`: provider app id when available.
- `secretRef`: secret locator only. Plain secrets are rejected.
- `status`: active, inactive, draft, or another appbase status.

QR login selects an active configured OAuth resource account and an active scannable operational resource. User-facing QR generation does not expose account selection.

## QR Content Rules

Session creation always creates a fallback URL. The fallback URL is a normal web URL that any scanner can open:

```text
https://<public-origin>/auth/qr/<sessionKey>?session_key=<sessionKey>&purpose=<purpose>&scan_source=browser
```

`<sessionKey>` is percent-encoded in both path and query. The backend builds `<public-origin>` from configured public origins and trusted forwarded host data. Unsafe host input falls back to localhost.

When no active provider entry exists, `qrContent` uses `fallback_url`. When an official account or mini-program entry is configured, appbase returns a provider entry URL with current session context appended: `session_key`, `purpose`, `account_id`, `entry_id`, and `scan_source`.

Configured entry URLs must be scannable, use provider-approved URL forms, and must not contain fragments, userinfo, or unsafe authority data. Reserved QR params are removed and overwritten. Non-reserved query params, such as campaign tags, are preserved.

## Scanner Flow

The scanner must record a scan before completing login or registration.

1. Desktop creates `oauth.sessions.create({ purpose })` through the generated appbase app SDK.
2. Desktop renders the QR image from `qrContent.content` and polls `oauth.sessions.retrieve(sessionKey)`.
3. Scanner opens `/auth/qr/{sessionKey}` or the configured provider entry.
4. Scanner records `oauth.sessions.scans.create(sessionKey, { scanSource })`.
5. Scanner enters password or registration data when required.
6. Scanner completes `oauth.sessions.passwords.create(sessionKey, body)`.
7. Desktop polling receives `status: completed` plus the IAM session payload, applies the session, and redirects.

The scan endpoint validates that supplied account and entry identifiers match the defaults stored on the session. Once scanner metadata is recorded, later calls cannot rewrite scan source, external user identity, IP hash, or user agent to another identity.

## Password Completion

The password endpoint accepts the same IAM credentials as login or registration: username, password, optional confirmation fields, contact fields, and verification code fields. For login, it delegates to the existing IAM password login path. For registration, it delegates to IAM registration policy.

Password completion before a scan is rejected. Completion after terminal states is idempotent only when the stored completed session can be returned safely; otherwise terminal sessions reject mutation.

## Webhook Boundary

Appbase defines provider callback ingress under `/iam/v3/api/oauth/provider_callbacks/{callbackPublicId}`. Claw Router admin must not implement provider callback ingestion locally. If Claw Router needs to display callback diagnostics, it reads appbase backend SDK resources under `client.iam.oauth.*`.

Provider callback adapters must verify signatures, normalize provider user identity, record a scan before completion, require account and entry identifiers to match the session default, and complete through IAM token issuing. They must never store tokens in the callback layer.

## Logs And Security

QR session events write security entries using hashed identifiers:

- `oauth.session.created`
- `oauth.session.scanned`
- `oauth.session.completed`
- `oauth.session.fallback`
- `oauth.session.expired`

Security details store `sessionKeyHash`, not the raw `sessionKey`. Scanner identifiers are recorded as hashes where applicable. Raw provider user ids, raw user agents, unsafe configured URLs, provider secrets, auth codes, tokens, and private claims are not written to security logs.

## Implementation Map

Claw Router side:

- `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/oauthAdminService.ts`
- `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/src/index.tsx`
- `apps/sdkwork-clawrouter-pc/admin-oauth-runtime.test.ts`

Appbase side:

- `sdkwork-appbase` OAuth app-api routes under `/app/v3/api/oauth/*`
- `sdkwork-appbase` provider callback ingress under `/iam/v3/api/oauth/provider_callbacks/*`
- `sdkwork-appbase` backend-api management routes under `/backend/v3/api/iam/oauth/*`
- generated `@sdkwork/iam-app-sdk` and `@sdkwork/iam-backend-sdk`

Related standards and plans:

- [Appbase OAuth System Design](./superpowers/specs/2026-06-09-appbase-oauth-system-design.md)
- [Appbase OAuth System Implementation Plan](./superpowers/plans/2026-06-09-appbase-oauth-system.md)
