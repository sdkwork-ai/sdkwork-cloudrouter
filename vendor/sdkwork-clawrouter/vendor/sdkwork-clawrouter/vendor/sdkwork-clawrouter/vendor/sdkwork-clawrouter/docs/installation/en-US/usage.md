# Usage Guide

This guide assumes Claw Router has been initialized and started successfully.

## 1. Entry Points

Defaults:

```text
Portal: http://127.0.0.1:3900/
Gateway API: http://127.0.0.1:3900/v1
Backend/Admin API: http://127.0.0.1:3900/backend/v3/api
App API: http://127.0.0.1:3900/app/v3/api
Gateway OpenAPI: http://127.0.0.1:3900/openapi.json
Admin OpenAPI: http://127.0.0.1:3900/backend/v3/api/openapi.json
App OpenAPI: http://127.0.0.1:3900/app/v3/api/openapi.json
```

Health checks:

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

## 2. Login And Authentication Methods

`v0.3.0` supports admin-configured login methods, QR login, OAuth visibility, recovery methods, registration methods, and verification-code policy.

The default posture is strict:

- Password login is available by default.
- QR login, email code login, phone code login, OAuth, and session bridge require explicit enablement.
- Whether registration requires verification code is controlled by IAM runtime policy.

The first install/start initializes a bootstrap administrator when needed. The default username is `admin`; the one-time password appears as `bootstrapAdmin.initialPassword` in installer output or `initial_password` in startup logs. Rotate it after first login, then configure IAM policy in the backend.

## 3. Admin Console

Admin routes usually start at:

```text
http://127.0.0.1:3900/admin
```

Common modules:

- `/admin/dashboard`: operations overview.
- `/admin/user`: users and API keys.
- `/admin/group`: groups and policy bindings.
- `/admin/model`: model catalog and publication state.
- `/admin/channel`: providers, channels, credential references, and health.
- `/admin/ratelimit`: rate limits and risk controls.
- `/admin/monitor`: instances, heartbeats, and alerts.
- `/admin/marketing`, `/admin/finance`: commercialization and finance.

## 4. User Console

User console routes usually start at:

```text
http://127.0.0.1:3900/console
```

Common modules:

- `/console/dashboard`: usage and status.
- `/console/api-keys`: API keys.
- `/console/providers`: providers and models.
- `/console/routing`: routing policy.
- `/console/usage`: request records.
- `/console/commerce`, `/console/account`: billing and account.

## 5. Call The Gateway API

Gateway exposes OpenAI-compatible `/v1/*` APIs. Example:

```bash
curl http://127.0.0.1:3900/v1/models \
  -H "Authorization: Bearer <gateway-api-key>"
```

Chat example:

```bash
curl http://127.0.0.1:3900/v1/chat/completions \
  -H "Authorization: Bearer <gateway-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

Available models, provider accounts, routing policy, and billing policy depend on admin configuration.

## 6. OpenAPI And SDKs

OpenAPI:

```text
Gateway: /openapi.json
Admin API: /backend/v3/api/openapi.json
App API: /app/v3/api/openapi.json
```

Portal build output includes prebuilt SDK ZIP archives:

```text
portal/dist/sdk-archives
```

Standard prebuilt package names:

```text
sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip
sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip
```

SDK package versions are independent from Claw Router release versions. Use each SDK package's own `package.json` version.

## 7. Common First-Use Flow

After first deployment:

1. Check `/readyz`.
2. Log in to the portal.
3. Configure IAM login and registration policy.
4. Configure provider credential references.
5. Configure models and channels.
6. Create or import users and API keys.
7. Call `/v1/models` to validate the gateway.
8. Call `/v1/chat/completions` to validate routing and usage recording.

## 8. Operations Checks

The commands below assume `clawrouterctl` is on `PATH`. From an extracted release package root, use `./bin/clawrouterctl` on Linux/macOS and `.\bin\clawrouterctl.exe` on Windows.

Installation status:

```bash
clawrouterctl status
```

Refresh model catalog:

```bash
clawrouterctl refresh-catalog --force
```

Readiness:

```bash
curl -i http://127.0.0.1:3900/readyz
```

If `/readyz` fails, check:

- database connectivity
- PostgreSQL permissions
- model catalog refresh status
- gateway/admin/app upstream availability
- reverse proxy host, scheme, and path forwarding
