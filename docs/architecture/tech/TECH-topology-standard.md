> Migrated from `docs/topology-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

This repository adopts the shared SDKWork runtime topology framework.

- Platform standard: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`
- Naming authority: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_NAMING.md`
- Adoption guide: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md`
- Framework: `../sdkwork-app-topology`

## Archetype

`application-http-gateway` - Cloud Router exposes three **application** HTTP
surfaces (open gateway `/v1`, backend `/backend/v3/api`, app `/app/v3/api`)
through the edge server or split upstream services. Shared IAM and appbase SDKs
use **platform.api-gateway**.

## Default Dev Profile

`standalone.development` - single-port integrated runtime on
`application.public-ingress`.

Topology profiles use the SDKWork `deploymentProfile` axis directly:
`standalone.*` for single-application units and `cloud.*` for split cloud
deployment.

## Command Matrix (`package.json`)

Canonical topology commands use `scripts/cloud-router-dev.mjs` with explicit
`--deployment-profile`, `--target`, and `--database` flags.
Authoritative mapping is also declared in `specs/topology.spec.json` ->
`scripts.pnpm`.

| Script | Deployment profile | Target | Database |
| --- | --- | --- | --- |
| `pnpm dev` | standalone | browser | postgres |
| `pnpm dev:browser` | standalone | browser | postgres |
| `pnpm dev:browser:postgres:standalone:debug` | standalone | browser | postgres |
| `pnpm dev:cloud` | cloud | browser | — |
| `pnpm dev:browser:cloud` | cloud | browser | — |
| `pnpm dev:desktop` | standalone | desktop | postgres |
| `pnpm dev:desktop:sqlite` | standalone | desktop | sqlite |
| `pnpm topology:plan:server` | standalone | plan | postgres |
| `pnpm build:browser:cloud` | cloud | browser | — |

`pnpm dev`, `pnpm dev:browser`, and `pnpm dev:desktop` delegate to the canonical
standard profile scripts above. `pnpm dev:cloud` and `pnpm dev:browser:cloud`
start only the local developer-facing Vite client against the already deployed
`cloud.development` API surfaces (platform cloud gateway) and never start a
local API, gateway, or database process. Product-prefixed `cloudrouter:*`,
platform-first `desktop:*`, and tool-first `tauri:*` scripts are retired.

Gateway commands (binary owned by `sdkwork-api-cloud-gateway`):

| Script | Purpose |
| --- | --- |
| `pnpm gateway:matrix` | print all packaging targets from topology spec |
| `pnpm topology:validate` | validate `specs/topology.spec.json` |

Cloud gateway config bundles (`etc/sdkwork-api-cloud-gateway.cloud-router.*.toml`)
are owned and packaged by the platform `sdkwork-api-cloud-gateway` repository;
application roots must not expose `gateway:*:cloud` commands
(`PNPM_SCRIPT_SPEC.md` §7).

## Local URLs (standalone dev)

| Surface | URL |
| --- | --- |
| `application.public-ingress` | http://127.0.0.1:3905 |
| `application.open-http` | http://127.0.0.1:18080 (distributed mode) |
| `application.backend-http` | http://127.0.0.1:18081 (distributed mode) |
| `platform.api-gateway` | http://127.0.0.1:3902 (optional; embedded in unified-process) |

## Cloud dev (remote client only)

`pnpm dev:cloud` resolves the `cloud.development` topology profile and starts
only the portal Vite dev server (bind `127.0.0.1:3901`). The Vite proxy forwards
`/v1`, `/app/v3/api`, and `/backend/v3/api` to the deployed platform cloud
gateway origin from
`SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL`
(`https://api-dev.sdkwork.com` for development, `https://api-test.sdkwork.com`
for test, `https://api-staging.sdkwork.com` for staging,
`https://api.sdkwork.com` for production). The command fails before client
startup when the gateway URL is absent; it never falls back to loopback API
defaults.

Client env keys:

- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL` - app SDK (`/app/v3/api`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL` - backend SDK (`/backend/v3/api`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL` - open SDK (`/v1`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL` - platform / IAM SDKs

`start-workspace.mjs` health-gates the portal dev server: backend processes
start first, required `/healthz` endpoints must pass, then Vite starts.

Profile values live in `etc/topology/*.env` only. Do not hardcode ports in
route crates or feature packages.

Cloud gateway config bundles (for `cloud` profiles) such as
`etc/sdkwork-api-cloud-gateway.cloud-router.development.toml` and
`etc/sdkwork-api-cloud-gateway.cloud-router.production.toml` are generated and
packaged by the platform `sdkwork-api-cloud-gateway` repository, which hosts
the cloud-router API assemblies behind the platform cloud gateway
(`api-dev|test|staging.sdkwork.com` in non-production environments,
`api.sdkwork.com` in production).
