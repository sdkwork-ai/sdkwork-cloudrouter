# Runbooks

Status: active
Owner: SDKWork Claw Router SRE / clawrouter-release
Application: sdkwork-clawrouter
Updated: 2026-06-27
Specs: DOCUMENTATION_SPEC.md §7, HEALTH_CHECK_SPEC.md, DEPLOYMENT_SPEC.md

## Purpose

Operational runbooks for on-call engineers handling SDKWork Claw Router
production incidents. Each runbook covers a specific failure scenario with
trigger conditions, diagnostic steps, mitigation, rollback, and post-incident
checklist.

Scenario-specific runbooks live in this directory (`docs/runbooks/`); the
top-level disaster recovery plan and production operations runbook live in
[`deployments/runbooks/`](../../deployments/runbooks/).

## Runbook Index by Category

### Emergency response (应急)

Short-incident runbooks for active outages and data-safety events.

| Scenario | Path | Severity | Last Drill |
| --- | --- | --- | --- |
| Provider upstream outage (circuit breaker, failover, retry) | [provider-outage.md](provider-outage.md) | P0 | 2026-06-22 |
| Tenant isolation incident (cross-tenant data access) | [tenant-isolation-incident.md](tenant-isolation-incident.md) | P0 | 2026-06-21 |
| Redis failover (Sentinel, degraded mode) | [redis-failover.md](redis-failover.md) | P0 | 2026-06-23 |
| PostgreSQL HA failover (Patroni, pgBouncer, PITR) | [postgresql-ha-failover.md](postgresql-ha-failover.md) | P0 | 2026-06-23 |
| Disaster recovery plan (cross-region, full DR) | [../../deployments/runbooks/disaster-recovery-plan.md](../../deployments/runbooks/disaster-recovery-plan.md) | P0 | 2026-06-20 |

### Operations (运维)

Day-2 operations, capacity, and change-management runbooks.

| Scenario | Path | Severity | Last Drill |
| --- | --- | --- | --- |
| Production operations (health, shutdown, password rate limit, supply chain) | [../../deployments/runbooks/production-operations.md](../../deployments/runbooks/production-operations.md) | P0 | 2026-06-20 |
| Database migration rollback (Flyway down / PITR) | [database-migration-rollback.md](database-migration-rollback.md) | P1 | 2026-06-19 |
| Rate limit / circuit break tuning | [rate-limit-circuit-break.md](rate-limit-circuit-break.md) | P1 | 2026-06-17 |

### Security (安全)

Credential lifecycle and trust-boundary runbooks.

| Scenario | Path | Severity | Last Drill |
| --- | --- | --- | --- |
| Token / API key rotation (HMAC, provider creds, admin) | [token-api-key-rotation.md](token-api-key-rotation.md) | P1 | 2026-06-18 |

### Compliance (合规)

Audit, evidence, and regulatory-response runbooks.

| Scenario | Path | Severity | Last Drill |
| --- | --- | --- | --- |
| Audit log investigation (query, export, SIEM) | [audit-log-investigation.md](audit-log-investigation.md) | P2 | 2026-06-15 |

## On-Call Workflow

1. **Detect** — alert fires (Prometheus / SLO breach / health probe failure).
2. **Triage** — consult the relevant runbook below; classify severity P0/P1/P2.
3. **Mitigate** — apply the runbook's mitigation steps; record each action with
   timestamp in the incident channel.
4. **Communicate** — post status update every 15 minutes for P0, every 30
   minutes for P1, until resolved.
5. **Resolve** — confirm recovery via health probes and SLO dashboard.
6. **Post-incident** — within 48 hours, publish a blameless postmortem covering
   timeline, root cause, action items with owners and due dates (template in
   [disaster-recovery-plan.md](../../deployments/runbooks/disaster-recovery-plan.md#post-incident-review)).

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

- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Production operations runbook](../../deployments/runbooks/production-operations.md)
- [Standard alignment audit](../standard-alignment-audit.md)
- [SOC 2 Compliance Readiness](../compliance/SOC2-compliance-readiness.md)
- [Security policy](../../SECURITY.md)
- [Deployment manifests](../../deployments/)
