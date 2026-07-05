# sdkwork-clawrouter
repository-kind: application

Commercial AI gateway and console workspace for SDKWork Claw Router.

This workspace contains the Rust product services, the React portal, generated
TypeScript SDKs, schema/OpenAPI generators, and delivery guardrails for the
Claw Router product. The core rule is simple: product UI and service code must
be backed by schema registry contracts, generated OpenAPI specs, generated SDKs,
Rust handlers, persistence implementations, and repeatable verification.

## Product Overview

SDKWork Claw Router is a commercial AI gateway product for teams that need to
operate OpenAI-compatible model access, provider routing, model catalog data,
usage accounting, API keys, and administrative controls from one deployable
workspace. It combines a Rust gateway and product API layer with a React portal
so operators, developers, and administrators can manage AI traffic through a
single browser entrypoint.

Core product surfaces:

- **OpenAI-compatible Gateway**: exposes `/v1/*` APIs for OpenAI-compatible
  clients while forwarding traffic through controlled provider and routing
  policies.
- **Portal and Console**: gives users a browser workspace for API keys,
  billing, usage, routing, model discovery, playground workflows, and account
  operations.
- **Admin Console**: gives operators backend management for users, providers,
  channels, announcements, analytics, rate limits, cache, and commercial
  operations.
- **Model Catalog and Pricing**: keeps model facts, vendor regions, pricing,
  and install-time catalog refreshes in a repeatable delivery flow.
- **Generated SDK Surfaces**: provides generated app, backend, and
  OpenAI-compatible SDK packages from the product OpenAPI contracts.
- **Contract-driven Delivery**: binds frontend routes, database tables,
  OpenAPI payloads, generated SDKs, Rust handlers, and verification gates to
  schema registry evidence.

## Product Screenshots

The images below are placeholder PNG files stored in
[`docs/assets/product-screenshots`](./docs/assets/product-screenshots/). Replace
each file with a real screenshot using the same filename when you prepare
customer-facing documentation.

| Product area | Screenshot |
| --- | --- |
| Portal home | ![SDKWork Claw Router portal home placeholder](./docs/assets/product-screenshots/portal-home.png) |
| Console dashboard | ![SDKWork Claw Router console dashboard placeholder](./docs/assets/product-screenshots/console-dashboard.png) |
| Model catalog and routing | ![SDKWork Claw Router model routing placeholder](./docs/assets/product-screenshots/model-routing.png) |
| API playground | ![SDKWork Claw Router playground placeholder](./docs/assets/product-screenshots/playground.png) |
| Admin console | ![SDKWork Claw Router admin console placeholder](./docs/assets/product-screenshots/admin-console.png) |

## Installation And Usage

Current release: `0.3.0` (`2026-05-17`). Release records live under
[docs/release](./docs/release/).

Primary installation and usage guides:

- [Installation index](./docs/installation/README.md)
- Chinese: [Installation And Usage Guide](./docs/installation/zh-CN/README.md)
- English: [Installation And Usage Guide](./docs/installation/en-US/README.md)

Use the release guides when installing a published package for a specific
version:

- Chinese: [Install By Release Version](./docs/installation/zh-CN/release-install.md)
- English: [Install By Release Version](./docs/installation/en-US/release-install.md)

Use the source guides when cloning this repository, running a development
workspace, building production artifacts, or producing private release packages:

- Chinese: [Source Installation And Deployment](./docs/installation/zh-CN/source-install.md)
- English: [Source Installation And Deployment](./docs/installation/en-US/source-install.md)

Quick source start:

```powershell
pnpm dev -- --install
```

Quick Ubuntu/Debian service install from a release asset:

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo editor /etc/sdkwork/router/database.secret
sudo systemctl start clawrouter
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

Quick nginx reverse proxy deployment after the local service is healthy:

```bash
pnpm nginx:plan -- --domain api.sdkwork.com
sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
sudo nginx -t
sudo systemctl reload nginx
```

Generated nginx configs proxy to `http://127.0.0.1:3900` and deploy to
`/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf` for the
`api.sdkwork.com` domain. Use
[`etc/nginx/NGINX_SAMPLE.conf`](./etc/nginx/NGINX_SAMPLE.conf) as the canonical
template and [`etc/nginx/sdkwork`](./etc/nginx/sdkwork/) for full-domain
examples. See the release install guide for certificate path conventions under
`/opt/certs/letsencrypt/live/<cert-name>`.

The `.deb` package creates `/etc/sdkwork/router/clawrouter.toml`,
`/etc/sdkwork/router/clawrouter.env`, `/etc/sdkwork/router/database.secret`,
`/var/lib/sdkwork/router`, and the
`sdkwork` system user. The Linux systemd service runs `clawrouterctl
ensure` and `refresh-catalog --force` automatically before the gateway starts,
and service packages enable `clawrouter.service` during installation on systemd
hosts. The service is not started until the operator configures PostgreSQL in
`/etc/sdkwork/router/clawrouter.toml` or uses a protected
`SDKWORK_CLAW_DATABASE_URL` override in `/etc/sdkwork/router/clawrouter.env`.
The package post-install step prints the runtime TOML, service environment,
PostgreSQL password file, systemd service name, and the exact first-start
commands so the operator can configure the service without hunting through
package contents.
The generated `/etc/sdkwork/router/database.secret` contains the placeholder
`change-me`; replace it with the real PostgreSQL password before starting the
service. Startup rejects default placeholder hosts or passwords.

On the first install or first startup, Claw Router initializes the bootstrap
administrator login when it is missing or incomplete. The default username is
`admin`. Save the one-time password from installer JSON
`bootstrapAdmin.initialPassword` or startup logs `initial_password`, then rotate
it after first login.

Quick MSI install root initialization on Windows:

```powershell
Set-Location ".\clawrouter"
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
.\bin\clawrouter.exe
```

Quick Linux native desktop package initialization:

```bash
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

Quick macOS native package initialization:

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

Quick portable package initialization on Linux and macOS:

```bash
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
./bin/clawrouter
```

## Architecture

- Gateway service exposes OpenAI-compatible `/v1/*` APIs.
- App and public console business APIs live under `/app/v3/api`.
- Admin and backend management APIs live under `/backend/v3/api`.
- Frontend app/API calls must use `@sdkwork/clawrouter-app-sdk`.
- Frontend admin/API calls must use `@sdkwork/clawrouter-backend-sdk`.
- Generated SDKs are produced from `generated/openapi/*.json` and must not be
  hand-edited.
- Schema registry is the source of truth for business tables, field contracts,
  OpenAPI payloads, generated SDKs, and frontend data audits.
- Canonical standards live under `specs/`: `specs/API_SPEC.md` for API,
  OpenAPI, operationId, auth context, and SDK generation rules, and
  `specs/DATABASE_SPEC.md` for database and schema-registry rules.
- `docs/schema-registry/frontend-route-classification.yaml` is the source of
  truth for portal route delivery class. Every actual route is one of
  `sdk_backed_business_runtime`, `schema_provenanced_content`, or
  `local_developer_tool_api`.
- Route classification evidence must be repo-relative, must exist, and must
  bind the classified route to the package lazy-loaded by `App.tsx`. Schema
  content routes cannot hide runtime network clients; SDK or local tool routes
  must be classified explicitly. Schema content routes must declare
  `static_delivery` with an approved static mode, refresh policy, maximum
  staleness, runtime upgrade triggers, and `source_manifest_ref`. Static source
  hashes are generated from `docs/schema-registry/frontend-static-source-snapshots.yaml`
  into `generated/schema/frontend/frontend-static-source-manifest.json`, where
  each snapshot records a repo-relative source reference, ISO observation time,
  matching `sha256` content hash, and schema tables that stay within the route
  provenance set.
  Local tool routes must declare every raw browser `fetch` source in
  `browser_network_sources`, including
  `/openapi.json` readers, local tool APIs, and explicit external API
  playground requests. Each entry must use the standard purpose for its endpoint:
  `local_openapi_snapshot`, `local_tool_api`, or
  `explicit_api_playground_request`.

## Repository Layout

This repository follows `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`. The standard project root dictionary is represented by tracked README files:

- `apis/` - authored API contracts, route authority inputs, examples, changelogs, and API validation fixtures.
- `apps/` - runnable application surfaces. `apps/sdkwork-clawrouter-pc/` is the PC React portal root.
- `crates/` - authored Rust crates. Rust route crates use `crates/sdkwork-routes-<capability>-<surface>/`, including open-api, app-api, and backend-api route packages.
- `sdks/` - SDK family workspaces, materialized authority OpenAPI, derived generator inputs, generated language SDKs, and SDK evidence.
- `jobs/` - job schedules, queue bindings, batch descriptors, and maintenance runbooks.
- `tools/` - reusable guardians, generators, validators, migrations, and operator utilities.
- `plugins/` - application or runtime plugin source. Agent plugin metadata remains under `.sdkwork/plugins/`.
- `examples/` - runnable examples, sample configs, and SDK or API usage examples.
- `configs/` - safe source-controlled config templates, schemas, profiles, and defaults. Runtime private config remains under user-private `.sdkwork` paths.
- `deployments/` - deployment descriptors, topology examples, release handoff files, and runbooks.
- `scripts/` - thin command entrypoints for development, verification, generation, packaging, and release workflows.
- `docs/` - repository documentation, schema registry docs, installation guides, runbooks, and release notes.
- `tests/` - cross-package, contract, runtime, architecture, and static verification suites.

Additional repository-local directories remain scoped by their README or component specs:

- `packages/` - governed shared TypeScript and React package families only. Rust route/API crates must not live here.
- `services/` - existing Rust service and host crates used by the product runtime. New router API route crates belong under `crates/`.
- `data/sdkwork-models/` - standalone model catalog submodule mount point for vendor-scoped JSON model facts, pricing data, overlays, and language SDK loaders. See `docs/32-sdkwork-models-standard.md` and `docs/33-sdkwork-models-install-flow.md`.
- `generated/` - generated OpenAPI, schema, audit, and manifest outputs.
- `specs/` - local component contracts and repository-specific narrowing rules that link back to `../sdkwork-specs/`.

## Development Commands

Run commands from this directory:

```bash
pnpm install --no-frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm start
pnpm release
pnpm dev:desktop
pnpm dev:server
pnpm smoke:dev
pnpm check
pnpm install:packages:plan
pnpm install:packages:check
pnpm install:package:check
pnpm install:init:smoke
pnpm nginx:plan -- --domain api.sdkwork.com
pnpm nginx:render -- --domain api.sdkwork.com --output-root target/nginx
```

PowerShell and POSIX shells use the same extensionless `pnpm` commands:

```powershell
pnpm verify
pnpm test:postgres
pnpm test:postgres:required
pnpm test:postgres:docker
pnpm release:env:write
pnpm install:packages:plan
pnpm install:packages:check
pnpm install:package:build
pnpm install:package:check
pnpm install:init:smoke
```

Local development consumes SDKWork dependencies through native workspace files,
including `pnpm-workspace.yaml`, `package.json`, and Cargo manifests. Required
SDKWork repositories are expected as siblings in the same multi-repository
workspace, while `sdkwork.workflow.json` records pinned Git refs for CI and
release checkout.

Validate the standalone model catalog before installer or release work:

```bash
pnpm models:check
node data/sdkwork-models/tools/build-index.mjs --check
node data/sdkwork-models/tools/validate-catalog.mjs
node data/sdkwork-models/tools/freshness-report.mjs --max-age-policy catalog-freshness-policy.json --as-of 2026-05-08
node data/sdkwork-models/tools/catalog-audit.mjs --as-of 2026-05-08
node data/sdkwork-models/tools/release-catalog.mjs --check --as-of 2026-05-08
cargo test -p sdkwork-models --offline
cargo test -p sdkwork-clawrouter-router-service --test database_installer --offline
```

Model catalog release evidence is mandatory. `sources/vendor-sources.json`,
`sources/official-model-snapshots.json`, and
`sources/official-verification-policy.json` must stay in sync with
`sdkwork-models.json`; `sources/official-verification-policy.json` is the
release gate and must satisfy
`schemas/official-verification-policy.schema.json`. Every
`requiredVerifiedVendorRegions` entry must resolve to an officially verified
`vendorCode/regionCode` with an independent official snapshot before release or
installer import. The gate is bidirectional: every source declaration marked
`official_verified` must also appear in `requiredVerifiedVendorRegions`.
Each official snapshot also records a canonical `sourceSnapshotHash`; release
metadata stores those values under
`sourceEvidenceSha256.officialSnapshotHashes` by `vendorCode/regionCode` for
CI, approval, rollback, and supplier price-change auditing.

Set `SDKWORK_MODELS_CATALOG_ROOT` when a deployment should load an external
catalog artifact or updated submodule checkout instead of the bundled local
catalog:

```powershell
$env:SDKWORK_MODELS_CATALOG_ROOT = Join-Path (Get-Location) "data/sdkwork-models"
```

Refresh installed catalog rows without reinstalling the database:

```powershell
clawrouterctl refresh-catalog
clawrouterctl refresh-catalog --vendor openai
clawrouterctl refresh-catalog --catalog-root "$env:SDKWORK_MODELS_CATALOG_ROOT" --catalog-version 2026.05.08.1
clawrouterctl refresh-catalog --vendor alibaba --dry-run
```

Installer commands print one JSON object to stdout. `status`, `install`,
`upgrade`, and `ensure` use the same camelCase fields as the admin installation
status API. `refresh-catalog` prints `status`, `synced`, `catalogVersion`,
`vendorCodes`, `meterCount`, `vendorCount`, `familyCount`, `modelCount`,
`capabilityCount`, `priceCount`, `rankingCount`, `acceptedCount`,
`snapshotId`, `syncRunId`, and `lastCatalogRefreshStatus`, so shell scripts and
deployment jobs can consume the refresh result directly. `acceptedCount` is the
total imported standard fact count across shared meters, selected vendors,
families, models, capabilities, prices, and ranking items.
Failures print one camelCase JSON object to stderr with `status: "error"`,
`errorCode`, and `message`; scripts should parse stderr JSON instead of
matching human-readable panic text.
Stable installer error codes are `missing_database_url`, `invalid_argument`,
`invalid_state`, `database_error`, `catalog_error`, and `installer_error`.
The CLI validates command syntax before reading database configuration, so
unsupported commands or refresh options always return `invalid_argument` even
when database configuration is incomplete. This keeps CI checks and language
wrappers able to validate invocations without requiring a live database.
`status`, `install`, `upgrade`, and `ensure` reject unexpected extra arguments;
only `refresh-catalog` accepts refresh-specific options.
Failed catalog refreshes are also persisted to `ai_model_catalog_sync_run`
with a masked error, requested vendor scope, and resolved catalog version when
the catalog was loadable. This includes vendor selection failures and sync
execution failures, so deployment automation can diagnose and retry without
losing the failed attempt history. Failed-refresh audit persistence is
best-effort and must not mask the original refresh error.
Non-dry-run refreshes commit catalog table upserts, the pricing import
snapshot, the sync-run row, and the audit log in one transaction; if any later
sync step fails, catalog-owned tables keep their previous values.
The backend admin API and generated backend SDK expose the same count contract
as `AdminModelCatalogSyncResponse`. Frontend or application service wrappers
should preserve the full report, including counts, `snapshotId`, and
`syncRunId`, instead of collapsing the response to only `vendors` and `models`.

Explicit product server commands such as `pnpm dev:server` use the
workspace-local `data/sdkwork-models` directory as
`SDKWORK_MODELS_CATALOG_ROOT` by default and run a blocking
`refresh-catalog --catalog-root data/sdkwork-models --force` step after
`ensure`. Local JSON model or pricing edits are therefore imported into the dev
database on every server-mode startup. Default workspace commands
(`pnpm dev`, `pnpm dev:server`) start the topology-aware integrated
product server workspace. Gateway-backed client commands
(`pnpm dev:desktop`) start `sdkwork-api-cloud-gateway` plus
the portal only and do not run installer or catalog refresh steps.

Command intent:

- `pnpm dev` (alias: `pnpm dev:server`) starts the default
  integrated product server workspace (`standalone.unified-process.development`).
  See `docs/topology-standard.md` for the full command matrix and env keys.
- `pnpm dev:browser:postgres:split-services:standalone` starts split-services internal validation layout.
- `pnpm dev:desktop` starts the gateway-backed client workspace only.
- `pnpm test` runs the launcher/tooling contract tests.
- `pnpm build` builds production portal assets, builds the generated app
  and backend SDK runtime packages, creates SDK ZIP archives under
  `apps/sdkwork-clawrouter-pc/dist/sdk-archives`, and builds the Rust edge
  server release binary.
- `pnpm start` serves the built production portal from
  `apps/sdkwork-clawrouter-pc/dist` through a single all-in-one Rust edge
  process by default, using the release binary when it exists.
- `pnpm release` validates the release environment, regenerates
  `.env.release` from the release host process environment, runs strict
  `release:preflight`, and then runs the full `verify` gate.
- `pnpm dev:desktop` is the canonical gateway-backed desktop client entrypoint.
- `pnpm dev:server` is an alias of `pnpm dev`.
- `pnpm smoke:dev` starts the explicit `pnpm dev:server` entrypoint on
  isolated random local ports, verifies the edge and portal OpenAPI/runtime
  URLs, and stops the spawned process tree.
- `pnpm check` runs portal typecheck and production build.
- `pnpm install:packages:plan` prints the deterministic cross-platform
  install package matrix without building packages or starting services.
- `pnpm install:packages:check` validates the same matrix for release and
  CI package-builder integration.
- `pnpm install:package:check` validates the install package builder in
  dry-run mode without requiring staged production artifacts.
- `pnpm install:init:smoke` validates the fast install initialization
  contract in dry-run mode without starting services or requiring built
  binaries.

Use the extensionless `pnpm` command in cross-platform examples. On Windows
shells that block `pnpm.ps1`, call the package-manager shim through your shell
or adjust the execution policy instead of changing committed scripts.

Client development commands use `sdkwork-api-cloud-gateway` for API integration.
Gateway-backed client commands (`pnpm dev:desktop`) use
that gateway workspace. Explicit product server development commands use PostgreSQL for integration
testing unless an explicit SQLite server profile is selected. Desktop packages and first-run local user data use SQLite under `~/.sdkwork/router/data`.
On Windows, the equivalent path is `%USERPROFILE%/.sdkwork/router/data`.
Use `pnpm dev:server:sqlite` when validating explicit product server SQLite
behavior from the workspace. `pnpm dev:desktop:sqlite` is a client-mode entrypoint
and does not start a product backend service.

Gateway-backed client startup (`pnpm dev:desktop`) prints
the browser and API access matrix before launching processes. With default
ports, `sdkwork-api-cloud-gateway` listens on `3902` and the portal dev server
listens on `3901`:

- Direct Portal Dev: `http://127.0.0.1:3901/`
- SDKWork API Gateway: `http://127.0.0.1:3902/`
- Gateway/Open API: `http://127.0.0.1:3902/v1`
- Backend/Admin API: `http://127.0.0.1:3902/backend/v3/api`
- App API: `http://127.0.0.1:3902/app/v3/api`
- SDKWork API Gateway Health: `http://127.0.0.1:3902/healthz`
- SDKWork API Gateway Ready: `http://127.0.0.1:3902/readyz`

The portal dev server proxies same-origin API requests to the managed
`sdkwork-api-cloud-gateway` process:

- Direct Portal Gateway API Proxy: `http://127.0.0.1:3901/v1`
- Direct Portal Backend/Admin API Proxy:
  `http://127.0.0.1:3901/backend/v3/api`
- Direct Portal App API Proxy: `http://127.0.0.1:3901/app/v3/api`
- Direct Portal Gateway OpenAPI Proxy:
  `http://127.0.0.1:3901/openapi.json`
- Direct Portal Admin API OpenAPI Proxy:
  `http://127.0.0.1:3901/backend/v3/api/openapi.json`
- Direct Portal App API OpenAPI Proxy:
  `http://127.0.0.1:3901/app/v3/api/openapi.json`

Explicit `pnpm dev:server` startup prints the product edge access matrix. With
default ports, the Rust edge server at `3900` is the single product server
entrypoint. In default all-in-one server mode, `/v1`, `/backend/v3/api`, and
`/app/v3/api` are dispatched to in-process Rust routers while portal assets
are served through the portal dev server:

- Portal: `http://127.0.0.1:3900/`
- Edge Gateway OpenAPI: `http://127.0.0.1:3900/openapi.json`
- Edge Admin API OpenAPI:
  `http://127.0.0.1:3900/backend/v3/api/openapi.json`
- Edge App API OpenAPI:
  `http://127.0.0.1:3900/app/v3/api/openapi.json`
- Edge OpenAI-compatible Gateway API: `http://127.0.0.1:3900/v1`
- Edge Backend/Admin API: `http://127.0.0.1:3900/backend/v3/api`
- Edge App API: `http://127.0.0.1:3900/app/v3/api`
- Edge Server Health: `http://127.0.0.1:3900/healthz`
- Edge Server Ready: `http://127.0.0.1:3900/readyz`

`/healthz` reports the edge server process health. `/readyz` probes the
in-process gateway, admin API, app API routers and the portal upstream
`/healthz` endpoint in all-in-one mode, and returns `503` when any dependency
is unavailable.

for debugging and external reverse proxy setups:

- Gateway OpenAPI: `http://127.0.0.1:18080/openapi.json`
- Admin API OpenAPI:
  `http://127.0.0.1:18081/backend/v3/api/openapi.json`
- App API OpenAPI: `http://127.0.0.1:18082/app/v3/api/openapi.json`
- OpenAI-compatible Gateway API: `http://127.0.0.1:18080/v1`
- Backend/Admin API: `http://127.0.0.1:18081/backend/v3/api`
- App API: `http://127.0.0.1:18082/app/v3/api`

Use `pnpm topology:plan:server` to print the explicit product server URLs and command
plan without starting processes. Forward bind overrides through `--`, for
example:

```powershell
pnpm dev:server -- --server-bind 0.0.0.0:12900 --portal-bind 0.0.0.0:13900
```

The Rust edge server forwarding targets default to the edge server itself in
when the edge server should forward to another host, container network, or
separate local service process:

```powershell
pnpm dev:server -- --gateway-forward-url http://gateway.internal:18080 --backend-api-forward-url http://admin.internal:18081 --app-api-forward-url http://app.internal:18082
```

Forwarding URLs must be HTTP/HTTPS origins only. The Rust edge server uses
those origins for internal service-to-service proxying. Browser SDK bases
default to one same-origin public SDK root in server mode:

- `PORTAL_PUBLIC_SDK_BASE_URL=/`
- Derived open/API reference URL: `/v1`
- Derived app SDK URL: `/app/v3/api`
- Derived backend SDK URL: `/backend/v3/api`

This avoids publishing loopback addresses such as `127.0.0.1` into browser
configuration and keeps remote deployments reachable through the same edge host
that served the portal. Direct `3901` portal dev requests proxy the same
same-origin API paths to the edge server in all-in-one mode, so opening the
Vite dev server directly exercises the same SDK base URLs as the unified edge
entrypoint. `PORTAL_PUBLIC_API_BASE_URL`, `PORTAL_PUBLIC_OPEN_API_BASE_URL`,
`PORTAL_PUBLIC_APP_API_BASE_URL`, and `PORTAL_PUBLIC_BACKEND_API_BASE_URL`
remain available as per-surface overrides for split deployments.

Production `pnpm start` defaults to one all-in-one Rust edge/API process
after `pnpm build` has created the release artifact. When forwarding to
separately deployed gateway/admin/app services, use explicit upstream target
controls instead of the default integrated topology:

```powershell
pnpm start -- --server-bind 0.0.0.0:12900 --gateway-forward-url http://gateway.internal:18080 --backend-api-forward-url http://admin.internal:18081 --app-api-forward-url http://app.internal:18082
```

Its startup output includes the runtime mode, edge URLs, public browser API
bases, health checks, and the selected start command source (`release`, `env`,
or `cargo`). Forwarding mode also prints upstream forwarding targets and direct
OpenAPI/API paths.

When the edge server is deployed behind a controlled HTTPS reverse proxy,
set the reported external scheme explicitly:

```powershell
pnpm dev:server -- --external-scheme https
pnpm start -- --external-scheme https
```

Only enable trusted forwarded headers when the edge server is not directly
reachable by clients and every inbound request comes from that controlled proxy:

```powershell
pnpm dev:server -- --external-scheme https --trust-forwarded-headers
pnpm start -- --external-scheme https --trust-forwarded-headers
```

By default, the edge server ignores inbound `x-forwarded-host`,
`x-forwarded-proto`, `x-forwarded-for`, `Forwarded`, and `x-real-ip` values to
prevent client-side header spoofing. It also drops hop-by-hop headers declared
through the HTTP `Connection` header on both request and response proxy paths.

## Standard Verification

Run the full commercial gate before delivery:

```powershell
pnpm verify
```

`pnpm verify` runs the static, build, production-smoke, and broad test gates
without starting the live `pnpm dev` workspace by default:

- `cargo fmt --check`
- `cargo check --all-targets` with `RUSTFLAGS=-D warnings`
- `node scripts/run-claw-router-application.test.mjs`
- `python -B -m tools.repository_delivery_guardian`
- `python -B -m tools.clawrouter_sdk_guardian`
- `python -B -m tools.clawrouter_skill_guardian`
- `python -B -m tools.architecture_standard_guardian`
- `python -B -m tools.rust_backend_architecture_guardian`
- `python -B -m tools.clawrouter_openapi_precision_audit`
- `python -B -m tools.clawrouter_payload_sdk_audit`
- `python -B -m tools.frontend_static_source_manifest --check`
- `python -B -m tools.frontend_contract_guardian`
- `python -B -m tools.schema_guardian`
- `python -B -m tools.flyway_schema_contract_audit`
- `python -B -m tools.frontend_operation_audit`
- `python -B -m tools.frontend_field_audit`
- `python -B -m tools.java_legacy_contract_audit`
- portal forced typecheck
- production artifact build
- portal bundle budget audit
- portal production edge smoke test
- portal production browser DOM smoke test
- portal local tool API disabled-by-default browser smoke
- `cargo test --workspace`
- `python -B -m unittest discover tests`
- `python -B -m tools.schema_quality_gate`

For a faster local pass while editing contracts only:

```powershell
node scripts/verify-claw-router-application.mjs --skip-contract-guardians
```

Do not use `--skip-contract-guardians` for final delivery.

The live edge dev smoke still exists, but it is opt-in because it launches the
explicit `pnpm dev:server` entrypoint, installer/catalog startup, Rust services,
and the portal dev server. Run it directly when you need that product server
coverage:

```powershell
pnpm.cmd smoke:dev
```

To include the same live dev smoke inside `verify`, opt in explicitly:

```powershell
pnpm.cmd verify -- --with-edge-dev-smoke
```

If the local shell sandbox blocks `child_process.spawn`, the smoke prints a
skip message instead of failing. CI and release environments that require this
coverage should make the smoke mandatory:

```powershell
$env:CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED="1"
pnpm.cmd verify -- --with-edge-dev-smoke
```

`CLAWROUTER_VERIFY_EDGE_DEV_SMOKE=1` also opts `verify` into the live dev smoke.
Use `node scripts/verify-claw-router-application.mjs --skip-edge-dev-smoke` only to
override an environment that would otherwise enable it.

## Fast Local Iteration

Use the fast gate during Codex or developer edit loops:

```powershell
pnpm verify:fast
```

`pnpm verify:fast` runs only the low-cost checks that catch common tooling
and source-standard regressions:

- `python -B -m tools.repository_delivery_guardian`
- `node scripts/run-claw-router-application.test.mjs`
- `pnpm --dir apps/sdkwork-clawrouter-pc exec tsx auth-runtime.test.ts`
- `python -B -m unittest tests.test_frontend_source_hygiene_standard`

For Rust edits during local development, use the scoped Rust entrypoints instead
of jumping straight to `cargo test --workspace`:

```powershell
pnpm test:rust:auto
pnpm test:rust:smoke
pnpm test:rust:quick
```

`pnpm test:rust:auto` inspects the current changed files and tries to pick
the smallest useful Rust surface automatically:

- exact `services/*/tests/*.rs` edits run only that integration-test target
- common `services/*/src/*.rs` edits try to infer nearby test targets by name
- shared `services/*/tests/common/*.rs` helper edits, plus `crates/sdkwork-clawrouter-router-service-test-support/src/*.rs` fixture-crate edits, try to target only the integration tests that directly consume that shared test helper; product fixture module edits such as `schema.rs`, `repair.rs`, and `installed.rs` narrow further by the exported pool helper they affect
- broader or ambiguous changes fall back to the existing scoped profiles

When the worktree is noisy, choose one narrowing mode:

```powershell
pnpm test:rust:auto -- --changed-file services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs
pnpm test:rust:auto -- --staged
pnpm test:rust:auto -- --base-ref main
```

- `--changed-file <path>`: manual deterministic narrowing
- `--staged`: only inspect staged Git changes, ignoring unstaged noise
- `--base-ref <ref>`: only inspect committed changes since the merge-base with `<ref>`

Use only one of `--changed-file`, `--staged`, or `--base-ref` per run.

The main `pnpm verify` gate now also clears inherited `CARGO_BUILD_JOBS`
for its Rust steps so a shell-level `$env:CARGO_BUILD_JOBS='1'` does not
silently serialize local verification. When throttling is intentional, pass it
explicitly:

```powershell
pnpm verify -- --build-jobs 4
```

It intentionally skips Rust compile/tests, SDK and architecture guardians,
portal typecheck/build, production smoke tests, broad Python tests, and schema
quality gate. This makes it suitable for frequent local iteration, not final
delivery. Always run `pnpm verify` before release or handoff.

Clean rebuildable local artifacts when Codex or local tools slow down because
of stale temporary output:

```powershell
pnpm clean:fast
```

The default cleanup removes only rebuildable local output such as `.tmp`,
Python tool caches, portal `.turbo`, and portal `dist`. It does not remove
`target`, portal `node_modules`, generated OpenAPI artifacts, generated SDK
source, or schema registry files. Keep `target` and `node_modules` unless disk
pressure is more important than fast recompilation/reinstall avoidance. For an
explicit deep cleanup, call the script directly with opt-in flags:

```powershell
node scripts/clean-claw-router-workspace.mjs --rust-target --node-modules
```

## Release Preflight

Run the lightweight preflight before the full commercial gate:

```powershell
pnpm release:preflight
```

The preflight is read-only. It checks that the current branch is `main`,
`main...origin/main` is synchronized, the `sdkwork-clawrouter` application
worktree is clean, required commands are available, staging/Postgres
environment variables are present, Git LFS is available, LFS-managed bundled
skill seed JSON files are hydrated, and local Codex/Git IO footprint is not
large enough to slow command input. Missing staging environment variables are
warnings by default so local developers can still run the check before a
release host is provisioned. If a fresh clone has LFS pointer files instead of
real skill seed JSON, run `git lfs pull` before building or packaging.

Release preflight uses Node `child_process.spawn` probes through `execFile` to
inspect Git state and required tool availability. If the local execution
environment blocks process creation, for example with `spawn EPERM`, the
`runtime.childProcess` check fails, and Git, tool availability, and Git object
IO footprint checks are downgraded to warnings instead of being misreported as
missing commands or successful cleanliness checks. Run release preflight from a
local shell or CI runner that permits Node child process execution before
packaging a commercial release.

Use strict mode on CI, staging, or release packaging hosts:

```powershell
pnpm.cmd release:preflight -- --strict --env-file .env.release --strict-root-clean
```

## Release Environment Contract

Release and staging hosts must satisfy the executable environment contract in
`scripts/release-environment-contract.mjs`. The checked-in template is
`.env.release.example`; use it as a reviewable reference for release variable
names and example value shapes. Generate `.env.release` on the release
host from the host process environment, and never commit the local file.

Required release verification variable:

```text
SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL
```

Required browser-visible portal runtime variables:

```text
PORTAL_PUBLIC_API_BASE_URL
PORTAL_PUBLIC_APP_API_BASE_URL
PORTAL_PUBLIC_BACKEND_API_BASE_URL
PORTAL_PUBLIC_TOOL_API_ENABLED
```

Configure either one common browser-visible SDK root or per-surface overrides:

```text
PORTAL_PUBLIC_SDK_BASE_URL
PORTAL_PUBLIC_OPEN_API_BASE_URL
PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL
```

Run strict preflight against the local release env file before packaging:

```powershell
pnpm.cmd release:env:write -- --check
pnpm.cmd release:env:write
pnpm.cmd release:preflight -- --strict --env-file .env.release --strict-root-clean
```

`PORTAL_PUBLIC_*` values are intentionally visible to the browser through
`/runtime-env.js`; do not place secrets in them. The Postgres URL is used only
for release verification and Postgres contract tests.
`pnpm release:env:write` reads the contract variables from the release
host process environment, refuses to overwrite `.env.release` unless
`--force` is passed, refuses to write the checked-in `.env.release.example`
template, and prints only a safe summary without variable values.

`--strict` upgrades missing release environment variables to failures.
`--strict-root-clean` also fails when unrelated files outside this application
are dirty. For machine-readable CI output, add `--json`. For a non-probing
command plan, add `--dry-run`. Dry-run output marks local probe checks as
warnings with `dry-run:` details; it documents what would be checked, but it
does not prove the branch, worktree, required commands, child process runtime,
Codex session footprint, or Git object footprint are release-ready.

## Install Package Planning

The install package standard is executable through
`scripts/plan-claw-router-install-packages.mjs`. It is intentionally plan-only:
it does not run `pnpm dev`, does not launch the live edge dev smoke, does not
start production services, and does not build platform packages. Real archive,
service, container, and desktop builders must consume this plan so Windows,
Linux, macOS, x64, arm64, archive, service, container, desktop, and database
configuration delivery cannot drift.

Run the planner before wiring package builders:

```powershell
pnpm install:packages:plan
pnpm install:packages:check
pnpm install:package:check
pnpm install:native:check
pnpm install:init:smoke
node scripts/plan-claw-router-install-packages.mjs --json --check
```

The default matrix contains 24 package contracts: `windows`, `linux`, and
`macos` multiplied by `x64` and `arm64`, then by `archive`, `service`,
`container`, and `desktop`. Examples include `windows-x64-service`,
`linux-arm64-container`, and `macos-arm64-desktop`. Each package contract
declares:

- the Rust edge binary, `clawrouter` or
  `clawrouter.exe`
- the installer binary, `clawrouterctl` or
  `clawrouterctl.exe`
- `portal/dist` production assets
- `portal/dist/sdk-archives` generated SDK ZIP artifacts
- `.env.release.example` as a reference template only
- `config/clawrouter.toml.example` as the runtime configuration
  template
- an `install-manifest.json`
- service manifests for service mode and container entrypoint metadata for
  container mode
- desktop metadata for desktop mode

Database defaults are explicit by package profile. `archive`, `service`, and
`container` are server release profiles and default to external PostgreSQL.
Desktop packages default to local SQLite in the SDKWork user private data
directory and may still be pointed at another database through the same runtime
config file.

The runtime config file is TOML and supports:

```toml
[database]
engine = "postgresql"
host = "db.example.com"
port = 5432
database = "sdkwork_ai_prod"
username = "sdkwork_ai_prod"
password_file = "/etc/sdkwork/router/database.secret"
# password = "change-me"
ssl_mode = "require"
max_connections = 16

[redis]
# Redis is optional. Leave disabled unless this deployment needs shared cache,
# distributed locks, queues, or rate-limit buckets.
enabled = false
host = "redis.example.com"
port = 6379
database = 0
# username = "default"
# url = "redis://redis.example.com:6379/0"
# password_file = "/etc/sdkwork/router/redis.secret"
# password = "change-me"
key_prefix = "clawrouter"
tls = false
max_connections = 16
connect_timeout_millis = 2000
command_timeout_millis = 1000
pool_idle_timeout_seconds = 60

[observability]
log_filter = "info"
log_format = "compact"
log_ansi = false
log_target = true
log_thread_names = false
log_thread_ids = false

[services.gateway]
bind = "0.0.0.0:18080"

[services.admin_api]
bind = "0.0.0.0:18081"

[services.app_api]
bind = "0.0.0.0:18082"

[server]
bind = "0.0.0.0:3900"
external_scheme = "http"
trust_forwarded_headers = false

[edge]
enabled = true
gateway_base_url = "http://127.0.0.1:18080"
backend_api_base_url = "http://127.0.0.1:18081"
app_api_base_url = "http://127.0.0.1:18082"
portal_base_url = "http://127.0.0.1:3901"
portal_static_dist = "/usr/lib/sdkwork/router/portal/dist"
cors_allowed_origins = []
upstream_request_timeout_millis = 30000
upstream_ready_timeout_millis = 2000

[portal.public]
api_base_url = "/v1"
open_api_base_url = "/v1"
app_api_base_url = "/app/v3/api"
backend_api_base_url = "/backend/v3/api"
tool_api_enabled = false

[portal.static]
html_cache_control = "no-store"
asset_cache_control = "public, max-age=31536000, immutable"

[portal.security]
hsts_enabled = true
hsts_max_age_seconds = 31536000
hsts_include_subdomains = true
hsts_preload = true
csp_frame_src = ["https://player.bilibili.com"]

[portal.tools]
rate_limit_requests = 120
rate_limit_window_seconds = 60
max_body_bytes = 1048576
sdk_archive_root = "/usr/lib/sdkwork/router/portal/dist/sdk-archives"

[provider_relay.openai]
# base_url = "https://api.openai.com/v1"
# bearer_token_file = "/etc/sdkwork/router/openai-relay.secret"

[provider_relay.runtime]
# Non-streaming provider response timeout. Defaults to 60000 ms (H-4).
response_timeout_millis = 60000
# Streaming (SSE) provider response timeout. Defaults to 120000 ms (H-4).
stream_response_timeout_millis = 120000
# Maximum bytes accepted from a non-streaming provider response body.
# Defaults to 64 MiB (67108864). Exceeding the limit aborts the response (H-3).
provider_response_max_bytes = 67108864
health_probe_timeout_millis = 10000
catalog_refresh_interval_millis = 5000
circuit_breaker_recovery_window_millis = 60000
failure_strategy = "failover"

[provider_relay.http_pool]
# HTTP connection-pool tuning for OpenAI-compatible upstream clients (C-5).
# All fields are optional; missing values fall back to safe production defaults.
pool_idle_timeout_seconds = 90
pool_max_idle_per_host = 64
http2_keep_alive_interval_seconds = 30
http2_keep_alive_timeout_seconds = 10
connect_timeout_seconds = 10

[provider_relay.retry]
# Default max_attempts is 2 (H-5). Streaming requests always use 1 attempt
# because SSE bytes already sent to the client cannot be safely replayed.
max_attempts = 2
retryable_status_codes = [429, 500, 502, 503, 504]
backoff_millis = 0

[provider_relay.rate_limit]
# Estimated number of gateway instances sharing the limiter (H-8).
# When Redis is unavailable, local fallback quotas are divided by this value
# so a fleet of N nodes does not each allow the full configured quota.
estimated_instance_count = 1
# Maximum in-flight provider requests per tenant (H-9). Defaults to 100.
# Exceeding the limit returns HTTP 429 and records an InvocationErrorKind::RateLimit.
tenant_max_inflight_requests = 100

[paths]
data_directory = "/var/lib/sdkwork/router"

[request_limits]
admin_app_json_body_max_bytes = 131072
admin_skill_json_body_max_bytes = 65536
payment_callback_body_max_bytes = 65536
gateway_invocation_body_max_bytes = 1048576

[install]
# Optional override for externally mounted sdkwork-models catalog data.
# models_catalog_root = "/usr/lib/sdkwork/router/catalog"
```

`password_file` may be an absolute path, a path relative to `clawrouter.toml`,
or a path that uses standard environment variable expansion such as
`${SECRET_ROOT}/database.secret`, `$SECRET_ROOT/database.secret`, or
`%ProgramData%/sdkwork/router/database.secret`. Generated service templates
use placeholder values and startup refuses server configurations that still use
`db.example.com` or `change-me`.

Redis configuration is part of the standard runtime TOML but is disabled by
default. Current installs do not require Redis and do not start a Redis client
unless a future runtime capability explicitly enables it. When Redis is enabled,
set `[redis].enabled = true`, configure `[redis].host`, `[redis].port`, and
`[redis].database`, and prefer `[redis].password_file` over `[redis].password`.
Use `[redis].url` only as an advanced override for managed Redis endpoints that
cannot be represented cleanly with separate fields. Standard optional secret
paths are `/etc/sdkwork/router/redis.secret` for Linux service installs,
`/run/secrets/sdkwork/router/redis-password` for containers, and the matching
ClawRouter config/data directory on Windows, macOS, and desktop installs.

`[paths]` contains runtime-owned filesystem roots. `data_directory` is the
long-lived application state directory. Keep it on durable storage for service
and container deployments.

`[request_limits]` controls runtime body limits for high-risk write entrypoints:
backend app JSON, backend skill JSON, and payment provider
callbacks. Keep reverse proxy, load balancer, and container ingress request-body
limits aligned with these values so oversized requests fail before expensive
application work.

`[edge]` owns the packaged Rust edge entrypoint, upstream targets, readiness
timeouts, and the portal static asset root. `[portal.static]` separates
no-store HTML/runtime environment responses from long-lived hashed assets.
`[portal.security]` controls browser-facing portal security policy. Production
profiles default to HSTS enabled with preload; dev profiles may set
`hsts_enabled = false` until the public hostname is served through HTTPS.
`hsts_preload = true` requires `hsts_max_age_seconds >= 31536000` and
`hsts_include_subdomains = true`. Use `csp_frame_src` only for
explicit trusted HTTP/HTTPS origins that are allowed to be embedded by portal
pages.
`[portal.tools]` keeps the optional local tool API rate and body limits in the
same audited config file. `[observability]` owns production logging defaults:
`log_filter` sets the tracing filter, `log_format` is one of `compact`, `json`,
`pretty`, or `full`, `log_ansi` should stay `false` for systemd and container
logs, and the target/thread fields control emitted log metadata. Set `RUST_LOG`
only for temporary process-level diagnostics.
`[edge].cors_allowed_origins` is an explicit allowlist for additional trusted
browser origins, such as an external CDN-hosted portal. Leave it empty for the
packaged same-origin edge deployment; wildcard origins and origins with paths
are rejected.
`[provider_relay.runtime]` controls global OpenAI-compatible upstream response
timeouts, channel health-check timeouts, runtime catalog refresh cadence, and
circuit-breaker recovery probing. `failure_strategy = "failover"` tries the next
configured route candidate for retryable provider faults; `fail_closed` returns
the first provider fault without trying later candidates. `[provider_relay.retry]`
is the default retry policy when a database routing channel does not define its
own retry policy.

Protected TOML files may place the password directly in `clawrouter.toml`
instead of using a separate password file:

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

The standard config file locations are:

- Linux server: `/etc/sdkwork/router/clawrouter.toml`
- Linux desktop: `~/.sdkwork/router/config/clawrouter.toml`
- Windows server: `%ProgramData%/sdkwork/router/clawrouter.toml`
- Windows desktop: `%USERPROFILE%/.sdkwork/router/config/clawrouter.toml`
- macOS server: `/Library/Application Support/sdkwork/router/clawrouter.toml`
- macOS desktop: `~/.sdkwork/router/config/clawrouter.toml`

At runtime, `SDKWORK_CLAW_CONFIG_FILE` can point to any explicit TOML config
file. `SDKWORK_CLAW_DATABASE_URL` and
`SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS` override the file for emergency
operations and container orchestration. The Rust gateway, installer, admin API,
and app API all read this shared configuration layer through
`sdkwork-claw-config`.

Fast initialization is standardized around host-local environment generation
and installer commands:

```powershell
pnpm release:env:write -- --check
pnpm release:env:write -- --force
clawrouterctl ensure
clawrouterctl refresh-catalog --force
```

The same package contract works across Windows, Linux, and macOS through
extensionless `pnpm` commands and extensionless binaries where the target
platform supports them. Health and readiness checks are always `/healthz` and
`/readyz`.

Security defaults are part of the matrix: packages must not include secrets,
must not include `.env.release`, must generate local env files on the
install or release host, must treat `.env.release.example` as reference-only,
and must keep trusted forwarded headers disabled by default. Enable forwarded
header trust only when a controlled reverse proxy is the sole inbound client.

`scripts/build-claw-router-install-package.mjs` consumes the same matrix to
create portable archive and container-context packages from a staged production
directory. The default
`pnpm install:package:check` command is dry-run only, so it validates the
full 24-package builder matrix without requiring `pnpm build` output. To
build a real package, stage the package contents under a directory shaped like
the package plan and pass it explicitly:

```powershell
pnpm install:package:build -- --package-id windows-x64-archive --staging-root dist\install-package-staging --output-dir dist\install-packages
```

The builder writes the package archive, a per-package manifest, and
`install-packages-manifest.json` with file size and SHA-256 checksums. Windows
packages use real ZIP bytes for `.zip`; Linux and macOS packages use real
gzip-compressed tar bytes for `.tar.gz` and preserve executable mode on
extensionless binaries under `bin/`. The tar writer supports standard ustar
prefix paths for nested production asset names. All packages generate
`config/clawrouter.toml.example`. Container
packages generate a `container/Containerfile`, platform-specific
entrypoint (`container/entrypoint` on Linux/macOS,
`container/entrypoint.ps1` on Windows), and `container/metadata.json` without
starting services. Desktop packages generate `desktop/metadata.json` with the
desktop SQLite policy and OS config/data directories. The builder excludes
`.env.release` even if it exists in the staging directory. Add `--json`
for pure machine-readable output.

`service` and `desktop` release assets must be final platform installers, not
only portable archives. `scripts/build-claw-router-native-installer.mjs`
consumes the same staged production directory and package plan to build:

- Linux `.deb` packages for Ubuntu/Debian installation through
  `apt install ./clawrouter-linux-x64-server-0.3.0.deb` or
  `dpkg -i`.
- Windows `.msi` packages through WiX for service and desktop install targets.
- macOS `.pkg` packages through `pkgbuild` for service and desktop install
  targets.
  macOS service packages include a launchd runner at
  `/Library/Application Support/sdkwork/router/service/macos/clawrouter-service-runner`
  so launchd runs `clawrouterctl ensure` and
  `clawrouterctl refresh-catalog --force` before starting the gateway.

The native installer builder writes the installer, a per-installer
`.manifest.json`, and a scoped aggregate manifest. Each native manifest includes
`nativeInstall`, a machine-readable install layout with the final binary,
installer CLI, runtime TOML, template, data directory, service metadata,
permissions, and first-start commands. Linux `.deb` packages place public
commands under `/usr/bin`, immutable private runtime assets under
`/usr/lib/sdkwork/router`, service configuration and templates under
`/etc/sdkwork/router`, mutable data/logs under `/var/lib/sdkwork/router` and
`/var/log/sdkwork/router`, docs under `/usr/share/doc/sdkwork/router`, and service
units under `/lib/systemd/system` for service mode. The Debian post-install
script creates the `sdkwork` user/group, applies root-owned `0755` modes to
runtime binaries, keeps service config templates and secrets as `root:sdkwork`
`0640`, creates `0750` mutable data and log directories for `sdkwork`, copies a
first-run TOML config from the example when missing, and runs
`systemctl daemon-reload` before enabling `clawrouter.service` on systemd
hosts. The generated service unit uses a restricted runtime profile with
`NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=true`, systemd-managed
state/log/config directories with `0750` directory modes, kernel and
control-group protections, native syscall architecture filtering, and
`LimitNOFILE=65535`. The running service can write data and logs, while
`/usr/lib/sdkwork/router` and `/etc/sdkwork/router` stay read-only to the service
process after installation.
Operators configure PostgreSQL through
`/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/database.secret`, or a
protected override in `/etc/sdkwork/router/clawrouter.env`, then start the service.
Windows `.msi` packages keep binaries under `%ProgramFiles%/sdkwork/router` and
shared templates under `%ProgramData%/sdkwork/router`; native manifests
record inherited ProgramData ACLs for service templates, runtime TOML, secrets,
and data directories, while desktop runtime files remain user-profile ACLs
under `%USERPROFILE%/.sdkwork/router/config` and
`%USERPROFILE%/.sdkwork/router/data`. macOS service packages install service
runtime files under `/Library/Application Support/sdkwork/router` with
`root:wheel` ownership, `0750` on the service root, `0640` on service templates
and copied runtime TOML, and `0644` on the launchd plist; macOS desktop keeps
runtime config and local SQLite data under `~/.sdkwork/router`.

`scripts/smoke-install-package-init.mjs` validates the fast initialization
contract separately from service startup. The default root command is a dry-run
smoke that creates a temporary install root, writes a safe
`.env.release`, writes a temporary `clawrouter.toml`, verifies
that server package dry-runs use PostgreSQL while desktop package dry-runs use
a file-backed SQLite URL, verifies `clawrouterctl ensure` plus
`clawrouterctl refresh-catalog --force` are the only installer
actions, and confirms `/healthz` plus `/readyz` remain the readiness contract.
It never starts `pnpm dev`, the live edge dev smoke, or production services.

```powershell
pnpm install:init:smoke
node scripts/smoke-install-package-init.mjs --package-id linux-arm64-container --check --dry-run --json
```

On a release host with a staged package or built installer binary, upgrade the
same smoke to a real installer check by passing `--installer-bin` and an
isolated `--tmp-root`:

```powershell
node scripts/smoke-install-package-init.mjs --package-id linux-x64-archive --package-root dist\install-package-staging --installer-bin bin\clawrouterctl --tmp-root target\install-init-smoke\linux-x64 --check
```

Relative `--installer-bin` values are resolved from `--package-root` first, then
from the workspace root. When `--package-root` is provided it must already
exist, which prevents a typo from silently creating and validating an empty
package directory.

## Production Browser Smoke

`pnpm verify` runs
`node apps/sdkwork-clawrouter-pc/scripts/smoke-production-browser.mjs`
after the production edge smoke and before portal runtime tests. The script runs
the built portal through the Rust edge server in a real Chromium-family browser through Chrome
DevTools Protocol and verifies:

- `/runtime-env.js` loads before the hashed portal bundle.
- `window.__CLAWROUTER_ENV__` contains the expected public API, app SDK API,
  backend SDK API, and local tool API values.
- The browser locale is fixed to `en-US` through Chrome launch flags and
  Chrome DevTools Protocol, so DOM text assertions are stable on CI and release
  hosts with different OS languages.
- The public route matrix renders expected DOM content for `/models`,
  `/models/openai%2Fgpt-4o-mini`, `/rankings`, `/apps`,
  `/apps/app-1`, `/skills-hub`, `/skills-hub/skill-1`, and `/api-reference`.
- SDK-backed `/models` routes also use route-scoped Chrome DevTools Protocol
  `Fetch` fixtures for `/app/v3/api/router/models`, proving the generated app
  SDK runtime catalog can render successful runtime models, access-group
  filtering, search no-result state, empty-runtime fallback to the static seed
  catalog, encoded runtime detail routes, public reference/unavailable price
  status, performance source labels, and `Try in Playground` detail actions
  without exposing private pricing tokens in the DOM.
- SDK-backed App Center and Skills Hub routes wait for their asynchronous
  route-specific DOM text before final assertions, so recoverable SDK/API
  failure states are verified in the production browser gate instead of being
  sampled while the route is still loading.
- SDK-backed App Center and Skills Hub success paths use route-scoped Chrome
  DevTools Protocol `Fetch` fixtures for `/app/v3/api` responses, proving the
  generated app SDK request path can render successful catalog, detail,
  artifact, and install-command UI without adding mock endpoints to the
  production portal runtime.
- SDK-backed App Center and Skills Hub edge paths also use route-scoped
  `/app/v3/api` CDP fixtures for empty catalog responses, catalog search/filter
  no-result states, detail missing-record fallback rendering, partial
  category-load business failures, and retry-click recovery after transient SDK
  failures. The retry routes intentionally fail the first generated SDK list
  request, click the visible `Retry` action in the browser, and then assert the
  successful catalog DOM replaces the error state.
- `/api-reference` API Playground paths use route-scoped Chrome DevTools
  Protocol fixtures for explicit external playground requests to
  `https://tenant-api.example.com/api/*`. The browser smoke now opens
  `Try it out`, verifies missing required path-variable validation, exercises
  bulk edit conversion and managed-header rejection, sends a real POST through
  the browser fetch path with CORS preflight handling, checks `200 OK`
  response body/header tabs, probes Save Response plus Copy Response without
  touching the host download directory or system clipboard, preserves JSON
  primitive/null response bodies through raw rendering, clipboard, and download
  actions, verifies `Send and Download`, switches to Bearer Token auth and
  verifies the outgoing `Authorization` header without exposing the token in
  rendered body text, simulates a deterministic `ConnectionFailed` browser
  fetch failure and verifies the `0 Network Error` response state, checks the
  drawer close path plus production max-width constraint, and verifies
  production-disabled local tool APIs keep the static code-snippet fallback
  visible without issuing a browser request to `/api/code-snippet`. The same
  static-snippet path switches TypeScript from `axios` to `fetch` in the
  production DOM and verifies `Copy code` writes the currently rendered snippet
  to the browser clipboard probe.
- browser runtime exceptions, console warnings/errors, and private pricing
  tokens are not present on the checked routes.

Local machines that cannot launch Chrome or Edge from Node may skip this smoke
with an explicit `[browser-smoke] skipped` message. CI and release packaging
must make the check mandatory:

```powershell
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"
pnpm verify
```

Use `CLAWROUTER_BROWSER_EXECUTABLE` to point at a specific Chrome, Edge, or
Chromium executable. If the process cannot spawn a browser, start one outside
the Node process and provide its DevTools port:

```powershell
$env:CLAWROUTER_BROWSER_EXECUTABLE="<absolute path to Chrome, Edge, or Chromium>"
& $env:CLAWROUTER_BROWSER_EXECUTABLE --headless=new --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir="$(Join-Path ([System.IO.Path]::GetTempPath()) 'clawrouter-browser-smoke')" about:blank
$env:CLAWROUTER_BROWSER_DEBUG_PORT="9222"
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
```

## Postgres Integration

Optional Postgres contract tests:

```powershell
pnpm test:postgres
```

Required Postgres contract tests with an existing database:

```powershell
$env:SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://user:password@127.0.0.1:5432/dbname"
pnpm test:postgres:required
```

Ephemeral Docker-backed Postgres contract tests:

```powershell
pnpm test:postgres:docker
```

Docker mode uses `docker-compose.postgres-test.yml`, Postgres 16, a tmpfs data
directory, health checks, and port `${SDKWORK_CLAW_POSTGRES_TEST_PORT:-15432}`.
Install and start Docker Desktop before using Docker mode.

## SDK And Contract Regeneration

When an app or backend endpoint, payload, field, or table contract changes,
regenerate through the contract pipeline instead of editing generated SDK files.

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
python -B -m tools.clawrouter_gateway_openapi_generator
python -B -m tools.schema_quality_gate
```

If SDK package output must be regenerated, use the project skills under
`.agents/skills/` for the exact app and backend SDK commands.

## Commercial Delivery Rules

- No raw `/app/v3/api` or `/backend/v3/api` business calls in frontend product
  code. Use the generated SDK packages.
- No fake-success branches, local DTO forks, or mock async business data in
  commercial routes.
- No unclassified portal route. SDK-backed routes must have frontend operation
  contracts and use the expected generated SDK client. Schema content routes
  must name provenance tables, cite real evidence files, match the lazy-loaded
  route package, avoid browser runtime network clients, and declare
  `static_delivery` so static seed/catalog/reference content cannot silently
  replace required runtime APIs. All static delivery modes must reference the
  generated static source manifest through `source_manifest_ref`; inline
  `source_metadata` is rejected because hashes must be generated, not hand
  copied. Local tool routes must be gated by `VITE_TOOL_API_ENABLED` in the
  browser runtime and `PORTAL_PUBLIC_TOOL_API_ENABLED` in the Rust edge
  runtime, and every raw browser `fetch`
  source must be listed in
  `browser_network_sources` with the standard endpoint purpose.
- No manual edits to generated SDK output.
- No table, column, index, migration, or embedded database schema change without
  explicit approval.
- No sensitive values in logs, traces, UI state, screenshots, or generated docs.
- Root delivery docs must be readable UTF-8 and must not contain mojibake,
  replacement characters, private-use code points, or control characters.
- Every feature path must have schema, OpenAPI, SDK, backend, frontend, and test
  coverage appropriate to its risk.

## Portal Production Security

The Rust edge server emits strict portal security headers and disables local
tool APIs unless `PORTAL_PUBLIC_TOOL_API_ENABLED` is explicitly enabled. Its CSP `connect-src`
defaults to:

```text
'self' https://api.sdkwork.com
```

For private deployments whose browser needs to call a different API origin,
set `SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC` to a comma- or space-separated list of additional
HTTP/HTTPS origins, for example:

```powershell
$env:SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC="https://tenant-api.example.com https://admin-api.example.com"
```

Entries must be origins only, without paths, query strings, fragments, semicolon
directives, or quotes. Invalid values fail portal startup so a deployment cannot
silently run with an unsafe or broken CSP.

The portal also exposes browser runtime configuration through `/runtime-env.js`
so customer deployments can change API targets without rebuilding static
assets. Use only `PORTAL_PUBLIC_*` variables for values that are intended to be
visible in the browser:

```powershell
$env:PORTAL_PUBLIC_SDK_BASE_URL="https://tenant.example.com/router"
$env:PORTAL_PUBLIC_API_BASE_URL=""
$env:PORTAL_PUBLIC_OPEN_API_BASE_URL=""
$env:PORTAL_PUBLIC_APP_API_BASE_URL=""
$env:PORTAL_PUBLIC_BACKEND_API_BASE_URL=""
$env:PORTAL_PUBLIC_TOOL_API_ENABLED="false"
$env:SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS="120"
$env:SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS="60"
$env:SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL=""
$env:SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY=""
$env:SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT = Join-Path (Get-Location) "apps/sdkwork-clawrouter-pc/dist/sdk-archives"
```

`PORTAL_PUBLIC_SDK_BASE_URL` is the default public SDK root. Runtime bootstrap
derives `/v1`, `/app/v3/api`, and `/backend/v3/api` from it. The per-surface
variables accept HTTP/HTTPS URLs or root-relative paths and override the
derived values when a deployment splits SDK surfaces. Query strings, fragments,
protocol-relative URLs, control characters, and non-HTTP schemes fail startup.
Absolute runtime API origins are added to the production CSP `connect-src`
automatically. `/runtime-env.js` is served with `Cache-Control: no-store` and is
referenced before the hashed portal bundle so SDK clients read deployment
values before they are constructed.

When `PORTAL_PUBLIC_TOOL_API_ENABLED=true`, the Rust edge server serves the
local portal tool API under `/api/code-snippet`, `/api/sdk-readme`, and
`/api/generate-sdk`. These routes are disabled by default and are rate limited
by `SDKWORK_CLAW_TOOL_API_RATE_LIMIT_REQUESTS` per
`SDKWORK_CLAW_TOOL_API_RATE_LIMIT_WINDOW_SECONDS`. The limiter buckets by remote
client IP. When `SDKWORK_CLAW_EDGE_TRUST_FORWARDED_HEADERS=1`, the limiter uses
the first valid IP from `x-forwarded-for`; only enable that mode behind a
controlled reverse proxy. Limited requests return HTTP 429 with `Retry-After`,
`RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.

`/api/generate-sdk` calls the Rust SDK generator service and returns the
generated ZIP archive directly. `SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_BASE_URL` may be
set to an explicit generator origin; when it is empty, the edge server defaults
to the current web page origin derived from the incoming request host and
scheme. Configure `SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_API_KEY` when the generator
requires a bearer token. Standard `pnpm build` also creates generated
TypeScript app and backend SDK runtime packages and writes prebuilt SDK ZIP archives
into `apps/sdkwork-clawrouter-pc/dist/sdk-archives`; `pnpm start`
uses that directory as `SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT` by default. When a
live generator request fails and `SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT` is
configured, the edge server falls back to a matching prebuilt ZIP.

Archive fallback lookup is constrained to the configured directory, rejects
path traversal identity values, returns `application/zip` with
`Content-Disposition: attachment`, and keeps `Cache-Control: no-store` plus
`X-Content-Type-Options: nosniff`. Only the generated TypeScript app and
backend SDK packages are available through the fallback path. Requests for any
other fallback package, language, or version return `unsupported_sdk_archive`,
even if a matching ZIP file exists in the archive directory.

The generated app SDK archive is:

```text
sdkwork-clawrouter-app-sdk-typescript-0.1.0.zip
```

The generated backend SDK archive is:

```text
sdkwork-clawrouter-backend-sdk-typescript-0.1.0.zip
```

If the live generator fails and `SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT` is not
configured, `/api/generate-sdk` returns `sdk_generator_failed`. If fallback is
configured but the normalized archive is missing, it returns
`sdk_archive_not_found`.

## Recommended Delivery Sequence

1. On CI or a release host, run `pnpm release`. The root release script
   runs `pnpm release:env:write -- --check`, regenerates
   `.env.release` with `--force`, runs strict release preflight, and then
   runs `pnpm verify`.
2. For local handoff without real release secrets, run
   `pnpm release:preflight` and `pnpm verify:fast`.
3. In CI or release packaging, opt into the live dev edge smoke when required
   with `pnpm verify -- --with-edge-dev-smoke` and
   `CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED=1`.
4. In CI or release packaging, run the same gate with
   `CLAWROUTER_BROWSER_SMOKE_REQUIRED=1` and a working Chrome/Edge/Chromium
   DevTools target.
5. Run `pnpm test:postgres:docker` when Docker Desktop is available.
6. Review generated audits under `generated/schema/frontend/`.
7. Review `docs/schema-registry/frontend-route-classification.yaml` for any
   added or touched route, including evidence files, package binding, and
   delivery kind. For `schema_provenanced_content`, verify
   `source_manifest_ref` exists in
   `generated/schema/frontend/frontend-static-source-manifest.json`; refresh it
   with `python -B -m tools.frontend_static_source_manifest` after changing
   `docs/schema-registry/frontend-static-source-snapshots.yaml` or any
   referenced source file.
8. Confirm no touched frontend business path bypasses generated SDK clients.
9. Confirm production artifacts pass bundle budget and server smoke checks.
10. Record command evidence in `CHECK_RESULT.md`.

## Commercial Licensing

SDKWork Claw Router application source is licensed under
`AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction`. Commercial
use is prohibited unless SDKWork grants prior written commercial authorization.
Commercial editions are available for teams and organizations that need
multi-tenant isolation, an admin console, SLA commitments, and dedicated
support.

| Edition | License | Best for | SLA |
| --- | --- | --- | --- |
| Community | AGPL-3.0-or-later, free | Evaluation and non-commercial self-deployment | None |
| Pro | Commercial subscription | Commercial multi-tenant deployments | 99.5% monthly uptime |
| Enterprise | Commercial enterprise subscription | SSO, enhanced audit, dedicated support, private deployment | 99.9% monthly uptime |
| OEM / White-label | One-time license + royalty | Embedded, rebranded, and redistributed deployments | Custom |

Detailed commercial documents:

- [Commercial Pricing Model](./docs/commercial/PRICING.md) — license tiers,
  pricing matrix, token metering, additional services, payment, and refund
  policy.
- [Service Level Agreement](./docs/legal/SLA.md) — uptime commitments,
  incident response times, service credits, rate-limit tiers, and support
  channels.
- [Edition Tier Matrix](./docs/legal/TIER_MATRIX.md) — full capability
  comparison across Community, Pro, Enterprise, and OEM editions.
- [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md) — commercial authorization
  terms.

Contact `sales@sdkwork.com` to request commercial authorization, request a
custom quote, or negotiate OEM terms.

## License

SDKWork Claw Router application source is licensed under
`AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction`. See
[LICENSE](./LICENSE) and [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

This is not an unmodified AGPL-only commercial grant. Commercial use requires
prior written authorization from SDKWork. Unauthorized commercial deployment,
SaaS or managed-service operation, commercial integration, resale, white-label
delivery, paid implementation services, and commercial production use are
prohibited.

Generated SDK packages, standalone data packages, vendored artifacts, and
third-party dependencies may include their own license files. Those package or
artifact license files govern the corresponding generated, standalone,
vendored, or third-party artifact unless SDKWork explicitly replaces that
license notice in its package directory.

## SDKWork Documentation Contract

Domain: platform
Capability: router
Package type: app
Status: ACTIVE

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `cargo test --workspace`
- `pnpm --filter sdkwork-clawrouter-workspace test`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Application Roots

- [apps directory index](apps/README.md)
