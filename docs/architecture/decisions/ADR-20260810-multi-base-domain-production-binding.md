# ADR-20260810-multi-base-domain-production-binding

Status: accepted
Requirement: REQ-2026-0001
Owner: cloud-router-platform
Date: 2026-08-10
Specs: APP_RUNTIME_TOPOLOGY_NAMING.md, APP_RUNTIME_TOPOLOGY_SPEC.md, SDKWORK_DEPLOY_SPEC.md, NGINX_SPEC.md

## Context

Cloud Router serves the same product surface across three public base
domains: `sdkwork.com` (primary), `birdcoder.com`, and `dtupay.com`. The
previous registry assumed exactly one base domain per product and one host per
surface per environment (`cloudrouter.sdkwork.com`), which cannot express a
multi-base-domain production binding.

`APP_RUNTIME_TOPOLOGY_NAMING.md` section 9.3 now defines a Base Domain
Registry, and `cloudPublicHosts` supports multi-host surfaces through the
`httpHosts` array (`APP_RUNTIME_TOPOLOGY_SPEC.md` section 4.1).

## Decision

Bind Cloud Router on every registered base domain for all four lifecycle
environments:

| environment | `sdkwork.com` | `birdcoder.com` | `dtupay.com` |
| --- | --- | --- | --- |
| development | `router-dev.sdkwork.com` | `router-dev.birdcoder.com` | `router-dev.dtupay.com` |
| test | `router-test.sdkwork.com` | `router-test.birdcoder.com` | `router-test.dtupay.com` |
| staging | `router-staging.sdkwork.com` | `router-staging.birdcoder.com` | `router-staging.dtupay.com` |
| production | `router.sdkwork.com` | `router.birdcoder.com` | `router.dtupay.com` |

- The primary host on `sdkwork.com` is the `expose.domain`; the remaining
  registered hosts are `expose.aliases` sharing one site file, certificate,
  and upstream (`SDKWORK_DEPLOY_SPEC.md` section 7.2).
- The legacy `cloudrouter.sdkwork.com` family stays registered as transition
  aliases in `cloudPublicHosts` and nginx `server_name` until traffic moves to
  the `router.*` hosts, then the transition aliases are retired from the
  registry and DNS.
- Cloud TLS uses one SAN certificate covering all bound hosts
  (`cloud-router-ingress.yaml`); standalone sites use the certificate
  contract in `NGINX_SPEC.md` section 3.
- The platform gateway host follows the registry formula
  (`api.sdkwork.com` / `api-dev|test|staging.sdkwork.com`); the legacy
  `testapi.sdkwork.com` reference is retired.
- The backend/admin surface (`/backend/v3/api`) is served by the edge runtime
  on the same primary hosts (`router-dev|test|staging|router.sdkwork.com`);
  the legacy `cloudrouter-admin*.sdkwork.com` hosts are retired and are not
  registered as aliases.

## Consequences

- DNS must provision `router.{sdkwork,birdcoder,dtupay}.com` plus the
  environment-suffixed hosts.
- Certificates must cover every bound host (SAN or per-base-domain wildcard).
- Consumers still reaching `cloudrouter.sdkwork.com` keep working during the
  transition window; the alias is removed after traffic migration.
- Backend SDK clients pointing at `cloudrouter-admin*.sdkwork.com` must move
  to the primary `router.*` host; the admin hosts are withdrawn with the
  transition alias.
