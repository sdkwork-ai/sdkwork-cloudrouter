# SDKWork Claw Router - Tenant Isolation Incident Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Security / clawrouter-security
**Review Frequency:** Quarterly
**Severity:** P0 (data breach class)

---

## Table of Contents

1. [Scenario](#scenario)
2. [Symptom Identification](#symptom-identification)
3. [Emergency Mitigation](#emergency-mitigation)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Fix and Recovery](#fix-and-recovery)
6. [Compliance Reporting](#compliance-reporting)
7. [Post-Incident Review](#post-incident-review)
8. [Related Documents](#related-documents)

---

## Scenario

A request authenticated as tenant A unexpectedly reads or modifies data
belonging to tenant B. Per [SECURITY.md](../../SECURITY.md), any cross-tenant
data access is treated as Critical regardless of exploit complexity, because
the multi-tenant trust boundary is the core security invariant of Claw Router.

The boundary is normally enforced by:

- IAM-issued `WebRequestPrincipal` (no client-side tenant headers trusted).
- SQL scoped subjects (`SqlScopedSubject`, `SqlScopedAdminSubject`) at the
  repository boundary.
- Schema-registry owned-table prefixes per capability.
- App session tokens signed with the shared HMAC secret
  (`SDKWORK_CLAW_APP_SESSION_SECRET`).

An isolation failure means one of these enforcement layers was bypassed.

## Symptom Identification

- Audit log rows where `tenant_id` on the row differs from the
  `authenticated_tenant_id` on the request principal.
- A tenant reports seeing another tenant's data (API keys, usage records,
  billing ledgers, routing configurations, traces).
- Anomaly alert: `tenant_isolation_violation_total > 0` (when the boundary
  guard emits a violation).
- Logs showing principal/row tenant mismatch:

  ```
  ERROR tenant_isolation_violation principal_tenant=tenantA row_tenant=tenantB table=ai_usage
  WARN  sql_scoped_subject bypass detected actor=<user-id> scope=missing
  ```

## Emergency Mitigation

### Step 1: Immediately isolate the affected tenants

Suspend the API keys of the tenant(s) whose principal was used to cross the
boundary, and freeze the affected tenant(s) to stop further data movement:

```bash
# Suspend the implicated API key (admin-only, membership_kind=admin required)
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X PATCH http://localhost:8080/admin/api-keys/<api-key-id> \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "suspended"}'

# If a tenant-wide freeze is required
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X PATCH http://localhost:8080/admin/tenants/<tenant-id> \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"status": "frozen"}'
```

### Step 2: Collect audit logs and tracing data

Snapshot the evidence before it ages out. See
[Audit Log Investigation](audit-log-investigation.md) for full query patterns.

```sql
-- All operations by the implicated principal in the incident window
SELECT id, tenant_id, actor_user_id, action_type, resource_type, resource_id,
       request_id, created_at
FROM ops_audit_log
WHERE actor_user_id = '<implicated-user-id>'
  AND created_at BETWEEN '2026-06-27 08:00:00+00' AND '2026-06-27 10:00:00+00'
ORDER BY created_at;
```

```bash
# Capture distributed traces for the implicated request ids
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s "http://otel-collector:4318/api/traces?tenant_id=<tenantA>" > traces.json
```

### Step 3: Audit SQL queries for missing tenant_id predicates

Search the codebase for repository queries that touch tenant-scoped tables
without a `tenant_id` filter. Every tenant-scoped table MUST be accessed
through a `SqlScopedSubject` that injects the `tenant_id` predicate.

```bash
# Find queries on tenant-scoped tables that bypass the scoped subject
rg --type rust "FROM ai_usage|FROM ai_routing|FROM ops_audit_log" \
   --glob '!**/sql_scoped*' crates/
```

### Step 4: Audit Redis keys for correct tenant_id namespacing

Redis keys for rate limiting, idempotency, and circuit breaker state MUST
embed the `tenant_id` so one tenant cannot read another tenant's counters:

```bash
kubectl exec -it deploy/redis-primary -n clawrouter -- redis-cli --scan \
  --pattern 'ratelimit:*' | head -50
# Expected: ratelimit:{tenant_id}:{scope}:...
# Investigate any key missing the tenant_id segment.
```

## Root Cause Analysis

1. **Code change history** 鈥?diff the repository since the last known-good
   deploy. Look for:
   - New repository methods that bypass `SqlScopedSubject`.
   - Raw SQL strings lacking `WHERE tenant_id = $1`.
   - Redis key builders that dropped the tenant segment.
2. **SQL query audit** 鈥?review the query plan / executed SQL captured in
   tracing for the implicated `request_id`. Confirm whether the `tenant_id`
   predicate was present.
3. **Principal resolution** 鈥?confirm the `WebRequestPrincipal` carried the
   correct `tenant_id` and that no client-supplied tenant header was trusted
   (SECURITY.md hardening: `[server].trust_forwarded_headers = off`).
4. **Key compromise** 鈥?if the principal was correct but data still crossed
   tenants, suspect the HMAC signing key (see
   [Token / API Key Rotation](token-api-key-rotation.md)).

## Fix and Recovery

1. **Fix the code** 鈥?restore the `SqlScopedSubject` / tenant-segment guard;
   add a regression test that asserts cross-tenant reads return empty.
2. **Migrate / repair data** 鈥?if tenant B's rows were modified by tenant A,
   restore affected rows from PITR (see
   [Database Migration Rollback](database-migration-rollback.md) and
   [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#scenario-4-data-corruption)).
3. **Revoke and reissue credentials** 鈥?for the implicated principal, rotate
   its API key and force re-authentication of affected sessions.
4. **Restore tenant access** 鈥?once verified, unfreeze the tenant and
   re-enable the (reissued) API key.

## Compliance Reporting

If personally identifiable information (PII) was exposed, the breach triggers
regulatory reporting obligations:

| Framework | Trigger | Reporting window |
|-----------|---------|------------------|
| GDPR (EU tenants) | Personal data accessed by unauthorized party | Notify supervisory authority within 72 hours of awareness. |
| SOC 2 (CC7.3) | Security incident | Document in incident log; include in next evidence cycle. |
| Internal | Any cross-tenant access | Notify Security Lead immediately; file PIR within 48h. |

Coordinate the regulatory notification with Legal and the Security Lead before
any external communication. Record the breach assessment in the compliance
evidence repository under `compliance/SOC2/Security/`.

## Post-Incident Review

Use the blameless postmortem template from
[Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#post-incident-review).
Mandatory action items for an isolation incident:

- Add a permanent regression test asserting cross-tenant read returns empty.
- Add a CI guard rejecting new repository methods on tenant-scoped tables
  that do not derive from `SqlScopedSubject`.
- Add an alert on `tenant_isolation_violation_total > 0` paging Security
  on-call immediately.

## Related Documents

- [Runbook Index](README.md)
- [Security Policy](../../SECURITY.md)
- [Audit Log Investigation](audit-log-investigation.md)
- [Token / API Key Rotation](token-api-key-rotation.md)
- [Database Migration Rollback](database-migration-rollback.md)
- [SOC 2 Compliance Readiness](../compliance/SOC2-compliance-readiness.md)
