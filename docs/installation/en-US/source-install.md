# Source Installation And Deployment

Use source installation for local development, integration work, private builds, and release package production. Run commands from the repository root unless noted otherwise.

## 1. Prerequisites

Install:

- Git
- Node.js 22 or compatible
- pnpm `10.33.0`
- Rust toolchain and Cargo
- Python 3
- Optional: Docker Desktop for PostgreSQL integration tests
- Production server mode: PostgreSQL

Quick check:

```bash
git --version
node --version
pnpm --version
cargo --version
python --version
```

## 2. Clone

```bash
git clone https://github.com/Sdkwork-Cloud/sdkwork-clawrouter.git
cd sdkwork-clawrouter
```

Install portal workspace dependencies:

```bash
pnpm --dir apps/sdkwork-clawrouter-pc install
```

Or let the root launcher install them when needed:

```bash
pnpm dev -- --install
```

## 3. Development Runtime

Gateway-backed client development workspace:

```bash
pnpm dev
```

Explicit product server development mode:

```bash
pnpm dev:server
```

Gateway-backed desktop/client development mode:

```bash
pnpm dev:desktop
```

Print the startup plan without starting services:

```bash
pnpm topology:plan:server
```

Default access:

```text
Direct Portal Dev: http://127.0.0.1:3901/
SDKWork API Gateway: http://127.0.0.1:3902/
Gateway: http://127.0.0.1:3902/v1
Admin API: http://127.0.0.1:3902/backend/v3/api
App API: http://127.0.0.1:3902/app/v3/api
```

## 4. Bind Addresses And Forwarding

Expose development services externally:

```bash
pnpm dev:server -- --gateway-bind 0.0.0.0:19080 --server-bind 0.0.0.0:12900 --portal-bind 0.0.0.0:13900
```

Forward the edge server to existing upstream services:

```bash
pnpm dev:server -- --gateway-forward-url http://gateway.internal:18080 --backend-api-forward-url http://admin.internal:18081 --app-api-forward-url http://app.internal:18082
```

HTTPS reverse proxy:

```bash
pnpm dev:server -- --external-scheme https --trust-forwarded-headers
```

Only trust forwarded headers behind a controlled reverse proxy.

## 5. Production Build From Source

```bash
pnpm build
```

This command:

- generates the gateway OpenAPI document
- builds app/backend/open TypeScript SDK runtimes
- builds portal production assets
- creates SDK ZIP archives
- builds the Rust edge release binary

Start the production portal after building:

```bash
pnpm start
```

Initialize config without starting:

```bash
pnpm start -- --init-config-only --deployment-mode server
pnpm start -- --init-config-only --deployment-mode desktop
```

A source checkout or CI release host can generate `.env.release` from protected process environment variables:

```bash
pnpm release:env:write -- --check
pnpm release:env:write -- --force
```

This command is only for source workspaces. After a formal release package is extracted on a target host, the host does not need `pnpm` or source scripts; copy `.env.release.example`, inject protected environment variables, or use the runtime TOML instead.

Server mode with PostgreSQL:

```bash
SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod" pnpm start -- --deployment-mode server
```

Generated server TOML uses structured PostgreSQL fields. Prefer `password_file`; use direct `password` only when the TOML file is protected as a secret-bearing file:

```toml
[database]
engine = "postgresql"
host = "db.internal"
port = 5432
database = "sdkwork_ai_prod"
username = "sdkwork_ai_prod"
password = "real-password"
ssl_mode = "require"
max_connections = 16
```

The first `pnpm dev -- --install`, `pnpm start`, or installer `ensure` run initializes the bootstrap admin login when needed. Save `bootstrapAdmin.initialPassword` from installer JSON or `initial_password` from startup logs, then rotate it after first login. Re-running initialization does not print or reset the password once the admin login is complete.

## 6. Build Release Packages From Source

View the current package matrix:

```bash
pnpm install:packages:plan
```

Validate the matrix:

```bash
pnpm install:packages:check
```

Build production artifacts:

```bash
pnpm build
```

Package building requires a staging directory containing release binaries, portal dist, SDK archives, and `.env.release.example`. Build one package:

```bash
pnpm install:package:build -- --package-id linux-x64-archive --staging-root dist/install-package-staging --output-dir dist/install-packages
```

Validate all package build plans without writing archives:

```bash
pnpm install:package:check
```

Validate all native installer plans without writing installers:

```bash
pnpm install:native:check
```

Build a native installer for the current host:

```bash
pnpm install:native:build -- --package-id linux-x64-service --staging-root dist/install-package-staging --output-dir dist/install-packages
```

Native installer formats are platform-specific: `.deb` on Linux, `.msi` on Windows, and `.pkg` on macOS. Build them on matching runner operating systems.

Use an older package version explicitly:

```bash
node scripts/build-claw-router-install-package.mjs --package-id linux-x64-archive --version 0.1.0 --check --dry-run
```

## 7. Source Initialization Smoke

Validate the fast initialization contract:

```bash
pnpm install:init:smoke
```

Run the smoke against a real built installer:

```bash
node scripts/smoke-install-package-init.mjs --package-id linux-x64-archive --package-root dist/install-package-staging --installer-bin bin/clawrouterctl --tmp-root target/install-init-smoke/linux-x64 --check
```

## 8. Verification

Development loop:

```bash
pnpm verify:fast
```

Before delivery:

```bash
pnpm verify
```

Release host:

```bash
pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean
```

Docker PostgreSQL integration tests:

```bash
pnpm test:postgres:docker
```
