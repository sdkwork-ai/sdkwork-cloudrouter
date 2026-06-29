# SDKWork Claw Router - Audit Log Investigation Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Security / clawrouter-security
**Review Frequency:** Quarterly
**Severity:** P2

---

## Table of Contents

1. [Scenario](#scenario)
2. [Audit Log Locations](#audit-log-locations)
3. [Query Patterns](#query-patterns)
4. [Retention Policy](#retention-policy)
5. [Export for Compliance](#export-for-compliance)
6. [SIEM Integration](#siem-integration)
7. [Related Documents](#related-documents)

---

## Scenario

Investigation of a security event, a compliance audit, or tracing a specific
user / tenant action across the gateway. The `ops_audit_log` table is the
authoritative record of administrative and tenant-affecting operations; the
application logs (Loki / ELK) carry the surrounding request context.

This runbook is referenced by the
[Tenant Isolation Incident](tenant-isolation-incident.md) and
[Token / API Key Rotation](token-api-key-rotation.md) runbooks.

## Audit Log Locations

| Source | Location | Content |
|--------|----------|---------|
| `ops_audit_log` table | PostgreSQL `clawrouter` database | Structured audit rows: `tenant_id`, `actor_user_id`, `action_type`, `resource_type`, `resource_id`, `request_id`, `created_at`. |
| Application logs | Loki (`loki.clawrouter.svc`) / ELK | Structured request logs, provider relay decisions, circuit breaker transitions. |
| Provider relay logs | gateway pod stdout | `provider_invocation_total`, `circuit_breaker_state` context. |

Confirm connectivity:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c \
  "SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'ops_audit_log' ORDER BY ordinal_position;"
```

## Query Patterns

### By tenant

```sql
-- All operations affecting a specific tenant in a window
SELECT id, tenant_id, actor_user_id, action_type, resource_type, resource_id,
       request_id, created_at
FROM ops_audit_log
WHERE tenant_id = '<tenant-id>'
  AND created_at BETWEEN '2026-06-27 00:00:00+00' AND '2026-06-28 00:00:00+00'
ORDER BY created_at DESC;
```

### By user

```sql
SELECT tenant_id, action_type, resource_type, resource_id, request_id, created_at
FROM ops_audit_log
WHERE actor_user_id = '<user-id>'
ORDER BY created_at DESC
LIMIT 200;
```

### By time range

```sql
SELECT tenant_id, actor_user_id, action_type, resource_type, resource_id, created_at
FROM ops_audit_log
WHERE created_at BETWEEN '2026-06-27 09:00:00+00' AND '2026-06-27 09:30:00+00'
ORDER BY created_at;
```

### By action type

```sql
-- create / update / delete / login events
SELECT tenant_id, actor_user_id, resource_type, resource_id, created_at
FROM ops_audit_log
WHERE action_type IN ('create', 'update', 'delete', 'login')
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC;
```

### Correlate with request tracing

Join the audit row's `request_id` to the application log stream to recover the
full request context (provider, route, status):

```logql
{app="claw-router-gateway"} |= "request_id=<request-id>"
```

## Retention Policy

- `ops_audit_log` rows are retained for **1 year** (configurable via the
  retention job). Configure the retention window in the runtime config; do not
  lower it below the SOC 2 evidence horizon without Security Lead approval.
- Application logs in Loki/ELK are retained per the platform log retention
  policy (default 30 days hot, 1 year cold).
- The retention job must run within the tenant's data-retention commitment
  (see `docs/compliance/SOC2-compliance-readiness.md` and the privacy policy).

## Export for Compliance

Export audit rows as CSV or JSON for evidence packs and regulator requests.
Always scope the export to the minimum necessary window and tenant set.

```bash
# CSV export scoped to a tenant and window
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c \
  "\copy (
     SELECT id, tenant_id, actor_user_id, action_type, resource_type,
            resource_id, request_id, created_at
     FROM ops_audit_log
     WHERE tenant_id = '<tenant-id>'
       AND created_at BETWEEN '2026-06-01 00:00:00+00' AND '2026-06-30 23:59:59+00'
     ORDER BY created_at
   ) TO '/tmp/audit-<tenant-id>-2026-06.csv' WITH CSV HEADER"

kubectl cp clawrouter/$(kubectl get pod -n clawrouter -l app=claw-router-gateway \
  -o jsonpath='{.items[0].metadata.name}'):/tmp/audit-<tenant-id>-2026-06.csv \
  ./audit-<tenant-id>-2026-06.csv
```

For JSON export replace `WITH CSV HEADER` with `TO '/tmp/audit.json'`.

Store the export in the compliance evidence repository under
`compliance/SOC2/<criterion>/` with a tamper-evident checksum (SHA-256).

## SIEM Integration

The audit log stream is forwarded to the organization SIEM for correlation:

| SIEM | Transport | Notes |
|------|-----------|-------|
| Splunk | HEC from Loki / Logstash pipeline | Index `clawrouter_audit`. |
| Datadog Logs | Datadog Agent on gateway pods | Facet on `tenant_id`, `action_type`. |

Verify the forwarder is shipping:

```bash
# Confirm the gateway pod is emitting structured audit lines
kubectl logs deploy/claw-router-gateway -n clawrouter --tail=100 | \
  grep '"event":"audit"'
```

For a breach investigation, prefer querying `ops_audit_log` directly (source of
truth) and use the SIEM only for cross-system correlation.

## Related Documents

- [Runbook Index](README.md)
- [Tenant Isolation Incident](tenant-isolation-incident.md)
- [Token / API Key Rotation](token-api-key-rotation.md)
- [SOC 2 Compliance Readiness](../compliance/SOC2-compliance-readiness.md)
- [Security Policy](../../SECURITY.md)
