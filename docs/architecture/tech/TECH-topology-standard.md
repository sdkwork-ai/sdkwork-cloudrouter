> Migrated from `docs/topology-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

This repository adopts the shared SDKWork runtime topology framework.

- Platform standard: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`
- Naming authority: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_NAMING.md`
- Adoption guide: `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md`
- Framework: `../sdkwork-app-topology`

## Archetype

`application-http-gateway` - Claw Router exposes three **application** HTTP
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

Canonical topology commands use `scripts/claw-router-dev.mjs` with explicit
`--deployment-profile`, `--service-layout`, `--target`, and `--database` flags.
Authoritative mapping is also declared in `specs/topology.spec.json` ->
`scripts.pnpm`.

| Script | Deployment profile | Target | Database |
| --- | --- | --- | --- |
| `pnpm dev` | standalone | browser | postgres |
| `pnpm dev:browser` | standalone | browser | postgres |
| `pnpm dev:browser:sqlite` | standalone | browser | sqlite |
| `pnpm dev:browser:postgres:standalone:debug` | standalone | browser | postgres |
| `pnpm dev:browser:cloud` | cloud | browser | postgres |
| `pnpm dev:browser:cloud:debug` | cloud | browser | postgres |
| `pnpm dev:desktop` | standalone | desktop | postgres |
| `pnpm dev:desktop:sqlite` | standalone | desktop | sqlite |
| `pnpm topology:plan:server` | standalone | plan | postgres |

`pnpm dev`, `pnpm dev:browser`, and `pnpm dev:desktop` delegate to the canonical
standard profile scripts above. Product-prefixed `clawrouter:*`, platform-first
`desktop:*`, and tool-first `tauri:*` scripts are retired.

Gateway packaging (cloud config bundle only, binary owned by `sdkwork-api-cloud-gateway`):

| Script | Purpose |
| --- | --- |
| `pnpm gateway:matrix` | print all packaging targets from topology spec |
| `pnpm gateway:matrix:cloud` | print `platform-config-bundle` targets |
| `pnpm gateway:package:cloud` | bundle `etc/sdkwork-api-cloud-gateway.claw-router.*.toml` |
| `pnpm topology:validate` | validate `specs/topology.spec.json` |

## Local URLs (standalone dev)

| Surface | URL |
| --- | --- |
| `application.public-ingress` | http://127.0.0.1:3900 |
| `application.backend-http` | http://127.0.0.1:3900 |
| `application.open-http` | http://127.0.0.1:3900 |
| `platform.api-gateway` | http://127.0.0.1:3902 (optional; embedded in unified-process) |

Client env keys:

- `VITE_SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL` - app SDK (`/app/v3/api`)
- `VITE_SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL` - backend SDK (`/backend/v3/api`)
- `VITE_SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL` - open SDK (`/v1`)
- `VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL` - platform / IAM SDKs

`start-workspace.mjs` health-gates the portal dev server: backend processes
start first, required `/healthz` endpoints must pass, then Vite starts.

Profile values live in `etc/topology/*.env` only. Do not hardcode ports in
route crates or feature packages.

Cloud gateway config bundles (for `cloud` profiles):

- `etc/sdkwork-api-cloud-gateway.claw-router.development.toml`
- `etc/sdkwork-api-cloud-gateway.claw-router.production.toml`

