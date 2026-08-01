# Runbooks

Status: pre-launch; target procedures require current-candidate evidence
Owner: SDKWork Claw Router SRE / clawrouter-release
Application: sdkwork-clawrouter
Updated: 2026-08-01
Specs: DOCUMENTATION_SPEC.md §7, HEALTH_CHECK_SPEC.md, DEPLOYMENT_SPEC.md

## Purpose

Operational runbooks for on-call engineers handling SDKWork Claw Router
incidents. Current procedures are target designs unless they link immutable
evidence from the current candidate. They do not establish an operating
production, high-availability, recovery, or RPO/RTO capability on their own.
Each runbook must be reviewed against deployed topology, backups, identity
allocation, data-retention policy, and actual drill results before use.

Scenario-specific runbooks live in this directory (`docs/runbooks/`); the
top-level disaster recovery plan and production operations runbook live in
[`deployments/runbooks/`](../../deployments/runbooks/).

## Runbook Index by Category

### Emergency response (应急)

Short-incident runbooks for active outages and data-safety events.

| Scenario | Path | Severity | Drill evidence |
| --- | --- | --- | --- |
| Provider upstream outage (circuit breaker, failover, retry) | [provider-outage.md](provider-outage.md) | P0 | Historical date only; no current-candidate evidence |
| Tenant isolation incident (cross-tenant data access) | [tenant-isolation-incident.md](tenant-isolation-incident.md) | P0 | Historical date only; no current-candidate evidence |
| Redis failover (Sentinel, degraded mode) | [redis-failover.md](redis-failover.md) | P0 | Not executed for current candidate |
| PostgreSQL HA failover (Patroni, pgBouncer, PITR) | [postgresql-ha-failover.md](postgresql-ha-failover.md) | P0 | Not executed for current candidate |
| Disaster recovery plan (cross-region, full DR) | [../../deployments/runbooks/disaster-recovery-plan.md](../../deployments/runbooks/disaster-recovery-plan.md) | P0 | Not executed for current candidate |

### Operations (运维)

Day-2 operations, capacity, and change-management runbooks.

| Scenario | Path | Severity | Drill evidence |
| --- | --- | --- | --- |
| Production operations (health, shutdown, password rate limit, supply chain) | [../../deployments/runbooks/production-operations.md](../../deployments/runbooks/production-operations.md) | P0 | Historical date only; no current-candidate evidence |
| Database migration rollback (Flyway down / PITR) | [database-migration-rollback.md](database-migration-rollback.md) | P1 | Historical date only; no current-candidate evidence |
| Rate limit / circuit break tuning | [rate-limit-circuit-break.md](rate-limit-circuit-break.md) | P1 | Historical date only; no current-candidate evidence |
| HTTP/SLO, usage settlement, circuit coordination, metrics, readiness, memory, and OOM alerts | [observability-alert-response.md](observability-alert-response.md) | P0/P1 | Not executed for current candidate |

### Security (安全)

Credential lifecycle and trust-boundary runbooks.

| Scenario | Path | Severity | Drill evidence |
| --- | --- | --- | --- |
| Token / API key rotation (HMAC, provider creds, admin) | [token-api-key-rotation.md](token-api-key-rotation.md) | P1 | Historical date only; no current-candidate evidence |

### Compliance (合规)

Audit, evidence, and regulatory-response runbooks.

| Scenario | Path | Severity | Drill evidence |
| --- | --- | --- | --- |
| Audit log investigation (query, export, SIEM) | [audit-log-investigation.md](audit-log-investigation.md) | P2 | Historical date only; no current-candidate evidence |

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
| Metrics | `GET /metrics` | `200` Prometheus exposition with `sdkwork_http_requests_labeled_total` | Follow the observability alert runbook and inspect scrape/discovery policy |

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
