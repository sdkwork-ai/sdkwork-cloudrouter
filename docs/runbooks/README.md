# Runbooks

Status: active
Owner: SDKWork Claw Router SRE / clawrouter-release
Application: sdkwork-clawrouter
Updated: 2026-06-26
Specs: DOCUMENTATION_SPEC.md §7, HEALTH_CHECK_SPEC.md, DEPLOYMENT_SPEC.md

## Purpose

Operational runbooks for on-call engineers handling SDKWork Claw Router
production incidents. Each runbook covers a specific failure scenario with
trigger conditions, diagnostic steps, mitigation, rollback, and post-incident
checklist.

## Runbook Index

| Scenario | Path | Severity | Last Drill |
| --- | --- | --- | --- |
| Production operations (health, shutdown, password rate limit, supply chain) | [../../deployments/runbooks/production-operations.md](../../deployments/runbooks/production-operations.md) | P0 | 2026-06-20 |
| Provider upstream outage (circuit breaker, failover, retry) | [../../deployments/runbooks/provider-outage.md](../../deployments/runbooks/provider-outage.md) | P0 | 2026-06-22 |
| Token / API key rotation | [../../deployments/runbooks/token-api-key-rotation.md](../../deployments/runbooks/token-api-key-rotation.md) | P1 | 2026-06-18 |
| Tenant isolation incident response | [../../deployments/runbooks/tenant-isolation-incident.md](../../deployments/runbooks/tenant-isolation-incident.md) | P0 | 2026-06-21 |
| Database migration rollback | [../../deployments/runbooks/database-migration-rollback.md](../../deployments/runbooks/database-migration-rollback.md) | P1 | 2026-06-19 |
| Rate limit / quota circuit break | [../../deployments/runbooks/rate-limit-circuit-break.md](../../deployments/runbooks/rate-limit-circuit-break.md) | P1 | 2026-06-17 |
| Audit log investigation | [../../deployments/runbooks/audit-log-investigation.md](../../deployments/runbooks/audit-log-investigation.md) | P2 | 2026-06-15 |
| Redis failover | [../../deployments/runbooks/redis-failover.md](../../deployments/runbooks/redis-failover.md) | P0 | 2026-06-23 |
| PostgreSQL HA failover | [../../deployments/runbooks/postgresql-ha-failover.md](../../deployments/runbooks/postgresql-ha-failover.md) | P0 | 2026-06-23 |

## On-Call Workflow

1. **Detect** — alert fires (Prometheus / SLO breach / health probe failure).
2. **Triage** — consult the relevant runbook below; classify severity P0/P1/P2.
3. **Mitigate** — apply the runbook's mitigation steps; record each action with
   timestamp in the incident channel.
4. **Communicate** — post status update every 15 minutes for P0, every 30
   minutes for P1, until resolved.
5. **Resolve** — confirm recovery via health probes and SLO dashboard.
6. **Post-incident** — within 48 hours, publish a blameless postmortem covering
   timeline, root cause, action items with owners and due dates.

## Health Probe Cheat Sheet

| Probe | URL | Expected | Action On Failure |
| --- | --- | --- | --- |
| Liveness | `GET /healthz` | `200 {"status":"ok"}` | Restart pod via K8s livenessProbe |
| Readiness | `GET /readyz` | `200 {"status":"ready"}` with dependency breakdown | Remove from service endpoints; inspect `/readyz` body for failed dependency |
| Metrics | `GET /metrics` | `200` Prometheus exposition | Investigate if scrape fails; check `clawrouter_metrics_export_total` |

## Escalation

| Severity | On-call response | Escalation |
| --- | --- | --- |
| P0 (outage / data breach) | 5 minutes | After 15 min: tech lead; after 30 min: CTO |
| P1 (degraded / partial failure) | 15 minutes | After 1 hour: tech lead |
| P2 (cosmetic / non-urgent) | Next business day | — |

## Related

- [Production operations runbook](../../deployments/runbooks/production-operations.md)
- [Standard alignment audit](../standard-alignment-audit.md)
- [Security policy](../../SECURITY.md)
- [Deployment manifests](../../deployments/)
