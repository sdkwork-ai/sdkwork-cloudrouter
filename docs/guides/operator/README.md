# Operator Guide

Deployment, monitoring, and incident response entrypoints for SDKWork Claw Router operators and SREs.

Specs: `../../sdkwork-specs/DOCUMENTATION_SPEC.md` section 2, `../../sdkwork-specs/DEPLOYMENT_SPEC.md`, `../../sdkwork-specs/ENVIRONMENT_SPEC.md`, `../../sdkwork-specs/RELEASE_SPEC.md`.

## 1. Deployment Modes

Claw Router supports two deployment profiles:

| Profile | Topology | Use case |
| --- | --- | --- |
| `standalone` | `unified-process` | Single-binary deployment (all services in one process) |
| `cloud` | `split-services` | Containerized deployment (gateway, admin API, app API as separate services) |

### Build and Package

```powershell
pnpm.cmd build                    # Build portal assets + Rust edge release binary
pnpm.cmd release                  # Full release gate (preflight, env, verify)
pnpm.cmd release:package          # Build install package
pnpm.cmd release:native:package   # Build native installer (per-platform)
```

### Start Production

```powershell
pnpm.cmd start
# With overrides:
pnpm.cmd start -- --server-bind 0.0.0.0:12900 --gateway-forward-url http://gateway.internal:18080
```

The Rust edge serves the portal, gateway, admin API, and app API on a single port. `/runtime-env.js` injects browser SDK bases from `PORTAL_PUBLIC_*` release host env keys.

### Topology Planning

```powershell
pnpm.cmd topology:plan:server   # Print the startup plan without launching
pnpm.cmd gateway:matrix         # Print the gateway build matrix
```

## 2. Health and Readiness

| Probe | URL | Expected | Action on failure |
| --- | --- | --- | --- |
| Liveness | `GET /healthz` | `200 {"status":"ok"}` | Restart pod via K8s livenessProbe |
| Readiness | `GET /readyz` | `200 {"status":"ready"}` with dependency breakdown | Remove from service endpoints; inspect `/readyz` body for failed dependency |
| Metrics | `GET /metrics` | `200` Prometheus exposition | Investigate if scrape fails |

`/readyz` probes the gateway, admin API, app API, and portal upstream `/healthz` endpoints. It returns `503` when any dependency is unavailable.

## 3. Monitoring

### Metrics

The edge exposes Prometheus metrics at `/metrics`. Key metrics include:

- Request count, latency histograms (per route, per status code)
- Gateway dispatch latency and provider relay latency
- Rate limit hit counts
- Circuit breaker state changes
- Database connection pool metrics

### Logs

Structured logs are written to stdout. Configure log level via `RUST_LOG` (e.g., `info,claw_router=debug`). Do not log to files in container deployments.

### Alerting

Configure alerts for:

- `/healthz` or `/readyz` returning non-200 for >2 minutes
- Error rate (`5xx / total`) exceeding 1% over 5 minutes
- P95 latency exceeding SLO threshold
- Rate limit `429` rate exceeding 10% of requests
- Database connection pool exhaustion

## 4. Database Operations

```powershell
pnpm.cmd db:status          # Migration status
pnpm.cmd db:plan            # Plan migrations
pnpm.cmd db:migrate         # Apply migrations
pnpm.cmd db:rollback        # Rollback (see database-migration-rollback runbook)
pnpm.cmd db:drift:check     # Check for schema drift
pnpm.cmd db:seed            # Seed reference data
```

For PostgreSQL HA, see the [PostgreSQL HA failover runbook](../../runbooks/postgresql-ha-failover.md).

## 5. Incident Response

### Triage

1. Check `/readyz` for dependency breakdown.
2. Consult the relevant [runbook](../../runbooks/README.md).
3. Classify severity: P0 (outage/data breach), P1 (degraded), P2 (cosmetic).

### Common Issues

| Symptom | Likely cause | Runbook |
| --- | --- | --- |
| Provider 5xx errors | Upstream AI provider outage | [provider-outage.md](../../runbooks/provider-outage.md) |
| Cross-tenant data leak | Tenant isolation failure | [tenant-isolation-incident.md](../../runbooks/tenant-isolation-incident.md) |
| High latency, timeouts | Rate limit / circuit breaker misconfigured | [rate-limit-circuit-break.md](../../runbooks/rate-limit-circuit-break.md) |
| Migration failure | Flyway down or PITR needed | [database-migration-rollback.md](../../runbooks/database-migration-rollback.md) |
| Redis unavailable | Sentinel failover | [redis-failover.md](../../runbooks/redis-failover.md) |
| API key compromise | Token leak | [token-api-key-rotation.md](../../runbooks/token-api-key-rotation.md) |
| Audit trail gap | Logging pipeline issue | [audit-log-investigation.md](../../runbooks/audit-log-investigation.md) |

### Escalation

| Severity | On-call response | Escalation |
| --- | --- | --- |
| P0 (outage / data breach) | 5 minutes | After 15 min: tech lead; after 30 min: CTO |
| P1 (degraded / partial failure) | 15 minutes | After 1 hour: tech lead |
| P2 (cosmetic / non-urgent) | Next business day | — |

## 6. Security Hardening

- Inbound `x-forwarded-*` headers are ignored by default to prevent spoofing. Enable `--trust-forwarded-headers` only behind a controlled HTTPS reverse proxy.
- Hop-by-hop headers declared through HTTP `Connection` are dropped on request and response proxy paths.
- Admin account reset: `pnpm.cmd admin:reset:release` (release mode).
- SBOM generation: `pnpm.cmd sbom:release`.
- Supply chain checks: `pnpm.cmd check:app-composition`, `pnpm.cmd check:vendor-workspace`.

## 7. Nginx Configuration

```powershell
pnpm.cmd nginx:plan    # Dry-run render
pnpm.cmd nginx:render  # Write config files
pnpm.cmd nginx:deploy  # Deploy and reload
```

## 8. Related

- [Production operations runbook](../../../deployments/runbooks/production-operations.md)
- [Runbook index](../../runbooks/README.md)
- [Deployment manifests](../../../deployments/)
- [Standard alignment audit](../../standard-alignment-audit.md)
- [Security policy](../../../SECURITY.md)
