# Claw Router Application Environment Contract

- Status: Current
- Contract version: 4
- Application: `sdkwork-clawrouter`
- Authority: `../../sdkwork-specs/CONFIG_SPEC.md`,
  `../../sdkwork-specs/ENVIRONMENT_SPEC.md`, and
  `../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`

This contract narrows the SDKWork environment standards for the Claw Router
application. It defines only active profiles and namespaces. Runtime code,
environment writers, deployment manifests, and checked-in templates must use
the same values.

## Lifecycle Namespace

The four application lifecycle axes are independent:

| Axis | Process key | Allowed values |
| --- | --- | --- |
| Config profile | `SDKWORK_CLAW_ROUTER_CONFIG_PROFILE` | `dev`, `test`, `staging`, `prod` |
| Environment | `SDKWORK_CLAW_ROUTER_ENVIRONMENT` | `development`, `test`, `staging`, `production` |
| Deployment profile | `SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE` | `standalone`, `cloud` |
| Runtime target | `SDKWORK_CLAW_ROUTER_RUNTIME_TARGET` | `browser`, `desktop`, `server`, `container`, `test-runner` |

Implementations read these application-scoped keys exclusively. A profile
writer must replace invalid or stale lifecycle assignments with the canonical
values for the selected lifecycle; it must not preserve alternate aliases.

## Active Profile Matrix

| Lifecycle artifact | Config profile | Environment | Deployment profile | Runtime target |
| --- | --- | --- | --- | --- |
| `apps/sdkwork-clawrouter-pc/.env.development` | `dev` | `development` | `standalone` | `browser` |
| `apps/sdkwork-clawrouter-pc/.env.production` | `prod` | `production` | `standalone` | `browser` |
| `.env.release` | `prod` | `production` | `standalone` | `server` |
| Kubernetes workloads | `prod` | `production` | `cloud` | `container` |

The checked-in `*.example` files are non-secret templates. Host profile files
without the `.example` suffix are generated or refreshed by
`scripts/dev/claw-router-application-env.mjs` and are not committed.

## Topology Profiles

Topology profile ids contain exactly the deployment profile and environment:

| Profile id | Profile file |
| --- | --- |
| `standalone.development` | `etc/topology/standalone.development.env` |
| `standalone.production` | `etc/topology/standalone.production.env` |
| `cloud.development` | `etc/topology/cloud.development.env` |
| `cloud.production` | `etc/topology/cloud.production.env` |

Runtime target, database engine, process layout, and hosting details are not
encoded in a topology profile id. `specs/topology.spec.json` is the machine
authority for profile lookup and surface bindings.

## Browser And Process Visibility

- `VITE_*` is the only namespace available to browser application code.
- `SDKWORK_CLAW_ROUTER_*`, `SDKWORK_CLAW_BROWSER_DEV_PROXY_*`, and
  `SDKWORK_CLAW_EDGE_*` are process-side values and must not be emitted into a
  browser runtime bag.
- `PORTAL_PUBLIC_*` values are release-host inputs. The edge renderer maps only
  approved public values to their `VITE_*` runtime equivalents.
- `SDKWORK_ACCESS_TOKEN` is a development-only private bootstrap input. A live
  locally signed value may exist only in the ignored
  `.env.development.bootstrap.local` overlay and must never be emitted by the
  production or release profile generators, templates, or env writers.
- Production service credentials, when required, are injected at the process
  boundary by deployment secret management or a real IAM authority. They are
  not materialized by repository env generation.
- API keys, provider credentials, refresh tokens, database passwords, and
  Redis passwords must not appear in tracked environment files.

## Shared Infrastructure Namespace

Database and Redis settings remain in the workspace-wide Claw infrastructure
namespaces `SDKWORK_CLAW_DATABASE_*` and `SDKWORK_CLAW_REDIS_*`. They are not
application lifecycle axes and must not be renamed by lifecycle tooling.

## Lifecycle Commands

```bash
node scripts/ensure-claw-router-env.mjs --lifecycle dev
node scripts/ensure-claw-router-env.mjs --lifecycle build
node scripts/ensure-claw-router-env.mjs --lifecycle start
pnpm check:application-env
pnpm topology:validate
```

`dev` owns `.env.development`, `build` owns `.env.production`, and `start`
owns `.env.release`. Each command is idempotent, preserves unrelated non-empty
operator settings, removes non-canonical lifecycle assignments, and writes the
canonical lifecycle tuple shown above.

Only the explicit `dev` lifecycle may invoke the fixed local development
signer and create `.env.development.bootstrap.local`. The `build`, `start`,
`production`, and `release` paths neither generate nor persist
`SDKWORK_ACCESS_TOKEN` and do not create a production bootstrap overlay.

## Verification

The application environment gate must prove all of the following:

1. Checked-in templates declare the exact canonical lifecycle tuple.
2. Kubernetes workloads declare the cloud production container tuple.
3. Browser output contains only approved `VITE_*` public runtime values.
4. Topology profile lookup does not fall back to an alternate lifecycle key.
5. Rust configuration, HTTP security policy, and IAM runtime context resolve
   the same application-scoped environment.
6. Shared database and Redis infrastructure namespaces remain unchanged.
