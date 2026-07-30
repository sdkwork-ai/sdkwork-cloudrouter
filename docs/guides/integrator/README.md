# Integrator Guide

SDK consumption, API boundaries, and integration examples for partners building on SDKWork Claw Router.

Specs: `../../../../sdkwork-specs/DOCUMENTATION_SPEC.md` section 2, `../../../../sdkwork-specs/SDK_SPEC.md`, `../../../../sdkwork-specs/API_SPEC.md`.

## 1. API Surfaces

Claw Router exposes three API surfaces, all served by the Rust edge on the same origin:

| Surface | Base path | OpenAPI spec |
| --- | --- | --- |
| OpenAI-compatible Gateway | `/v1` | `apis/open-api/clawrouter/clawrouter-open-api.openapi.json` |
| App API (end-user) | `/app/v3/api` | `apis/app-api/clawrouter/clawrouter-app-api.openapi.json` |
| Backend/Admin API | `/backend/v3/api` | `apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json` |

Health probes:

- `GET /healthz` — edge process liveness (`200 {"status":"ok"}`)
- `GET /readyz` — dependency readiness with breakdown (gateway, admin API, app API, portal)
- `GET /metrics` — Prometheus exposition

## 2. Generated SDKs

TypeScript SDKs are generated from the OpenAPI contracts and published as workspace packages. Do not fork them or call raw fetch/axios.

| SDK | Package | Use case |
| --- | --- | --- |
| App SDK | `@sdkwork/clawrouter-app-sdk` | End-user console features (API keys, usage, billing) |
| Backend SDK | `@sdkwork/clawrouter-backend-sdk` | Admin panel (users, channels, models, finance) |
| Open SDK | `@sdkwork/clawrouter-open-sdk` | OpenAI-compatible gateway chat/completions |

### Install

```powershell
pnpm.cmd add @sdkwork/clawrouter-app-sdk
```

### Initialize the App SDK client

```typescript
import { createClawRouterAppSdkClient } from '@sdkwork/clawrouter-app-sdk';

const client = createClawRouterAppSdkClient({
  baseUrl: '/app/v3/api',
});

// List user API keys
const result = await client.apiKeys.list({ page: '1', pageSize: '20' });
```

### List/search pagination (required)

All Claw Router list and search endpoints paginate in the database. Clients must pass `page` and `page_size` (OpenAPI camelCase: `pageSize`) and read `data.items` plus `data.pageInfo` from the SdkWork list envelope. Do not fetch full collections and paginate or filter in browser memory.

Representative admin/app list operations with server paging: `suppliers.list`, `accounts.list`, `accountGroups.list`, `apiKeys.list`, `system.records`, usage logs, cache namespace keys (cursor), catalog categories/products, and chat conversation messages.

```typescript
const page = await client.ai.routing.accountGroups.list({
  page: 1,
  pageSize: 20,
  q: 'openai',
});
// page.items + page.pageInfo.totalItems
```

### Call the OpenAI-compatible gateway

```typescript
const response = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }],
  }),
});
```

## 3. Authentication

- End-user API calls use session cookies (browser) or Bearer tokens (programmatic).
- Admin/backend API calls require an admin session with elevated permissions.
- The portal uses `@sdkwork/auth-pc-react` and `@sdkwork/iam-runtime` for session management. Integrators building custom UIs should use the same IAM runtime instead of reimplementing token storage.

## 4. Media Resource Contract

All media fields (avatar, cover, icon, logo, thumbnail, asset, artifact, video, audio, qrCode) are `MediaResource` objects end-to-end. URL strings exist only at display, input, download, or playback boundaries.

```typescript
// Correct: carry MediaResource in the model
interface UserProfile {
  avatar?: MediaResource;
}

// Display boundary: extract URL for <img src>
const avatarSrc = readMediaResourceUrl(profile.avatar);
```

Do not introduce `avatarUrl`, `coverImage`, `coverUrl`, or `*_url` JSON fields. See `specs/API_SPEC.md` section "Media Resource Fields" for the full contract.

## 5. Error Handling

The SDK returns `PlusApiSuccess<T>` or throws on transport errors. Always validate the success status before reading items:

```typescript
import { ensurePlusApiSuccess, readRequiredApiItems } from '@sdkwork/clawroutes-pc-commons/runtime';

const result = await client.users.list({ page: '1' });
ensurePlusApiSuccess(result, 'Failed to fetch users');
const users = readRequiredApiItems(result, 'Failed to fetch users').map(normalizeUser);
```

Do not use `.filter(isRecord)` or silent fallbacks — they hide contract drift and render empty states silently.

## 6. Rate Limiting and Idempotency

- The gateway enforces per-key rate limits (RPS/RPD). Exceed them and you receive `429 Too Many Requests`.
- Mutation endpoints accept idempotency keys via `createIdempotencyParams()` from `@sdkwork/clawroutes-pc-commons/runtime`. Pass a unique key to safely retry without duplicate side effects.
- Path IDs must be validated with `requiredSafePathSegment(id, 'resourceId')` before passing to SDK operations.

## 7. API Examples

Example requests and responses live in `apis/<surface>/clawrouter/examples/`. The OpenAPI specs in `apis/<surface>/clawrouter/clawrouter-<surface>.openapi.json` are the authoritative contract.

## 8. Related

- [App API OpenAPI](../../apis/app-api/clawrouter/clawrouter-app-api.openapi.json)
- [Backend API OpenAPI](../../apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json)
- [Open API OpenAPI](../../apis/open-api/clawrouter/clawrouter-open-api.openapi.json)
- [API spec](../../../../sdkwork-specs/API_SPEC.md)
- [Developer guide](../developer/README.md)
