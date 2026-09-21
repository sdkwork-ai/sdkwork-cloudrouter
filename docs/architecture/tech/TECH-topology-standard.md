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

Canonical topology commands go through the `sdkwork-app` lifecycle facade with
explicit `--deployment-profile` / `--runtime-target` flags; the legacy
`scripts/cloud-router-dev.mjs` runner survives only as the carrier of the
client-local `dev:desktop:sqlite` variant. Authoritative mapping is also
declared in `specs/topology.spec.json` -> `scripts.pnpm`.

| Script | Deployment profile | Target | Database |
| --- | --- | --- | --- |
| `pnpm dev` | standalone | browser | postgres |
| `pnpm dev:browser` | standalone | browser | postgres |
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
| Adaptive Web dev ingress (PC/H5 auto-selected, one browser entry) | http://127.0.0.1:4734 |
| `application.public-ingress` | http://127.0.0.1:3905 |
| PC renderer (private, not a browser entry) | http://127.0.0.1:4736 |
| H5 renderer (private, not a browser entry) | http://127.0.0.1:4737 |
| `application.open-http` | http://127.0.0.1:18080 (distributed mode) |
| `application.backend-http` | http://127.0.0.1:18081 (distributed mode) |

The adaptive ingress (`APP_RUNTIME_TOPOLOGY_SPEC.md` section 8.2) selects the
`apps/sdkwork-cloudrouter-pc` (pc-web) or `apps/sdkwork-cloudrouter-h5` (h5)
renderer by device class with cross-renderer fallback, keeps canonical API
paths (`/v1`, `/app/v3/api`, `/backend/v3/api`, `/openapi.json`) on
`application.public-ingress`, and answers with `Vary: user-agent`.

## Cloud dev (local gateway client only)

`pnpm dev:cloud` resolves the `cloud.development` topology profile and starts
only the adaptive web dev ingress (bind `127.0.0.1:4734`) plus the two private
renderers; it never starts a local gateway, database, or edge process owned by
this repository. Every gateway-attached base URL (platform gateway plus the
application public/open/backend surface URLs) is rebound to the locally started
`sdkwork-api-cloud-gateway` development bind declared by
`SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` (`http://127.0.0.1:3900`,
started by that repository's own `pnpm dev`). Domain edges
(`api-dev.sdkwork.com` and the registered `api-<suffix>.<base-domain>` family)
stay authoritative for cloud-mode builds and deployed services only
(`PNPM_SCRIPT_SPEC.md` section 3, `APP_RUNTIME_TOPOLOGY_SPEC.md` section 4.2).
The command health-checks the local gateway before client startup and fails
closed when it is absent; it never falls back to remote domains or unrelated
loopback defaults.

Client env keys:

- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL` - app SDK (`/app/v3/api`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL` - backend SDK (`/backend/v3/api`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL` - open SDK (`/v1`)
- `VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL` - platform / IAM SDKs

`sdkwork-app dev` health-gates the web ingress: required `/healthz` surfaces
must pass before the renderers and the adaptive ingress start.

Profile values live in `etc/topology/*.env` only. Do not hardcode ports in
route crates or feature packages.

Cloud gateway config bundles (for `cloud` profiles) such as
`etc/sdkwork-api-cloud-gateway.cloud-router.development.toml` and
`etc/sdkwork-api-cloud-gateway.cloud-router.production.toml` are generated and
packaged by the platform `sdkwork-api-cloud-gateway` repository, which hosts
the cloud-router API assemblies behind the platform cloud gateway
(`api-dev|test|staging.sdkwork.com` in non-production environments,
`api.sdkwork.com` in production).
