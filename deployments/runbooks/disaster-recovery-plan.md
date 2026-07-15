# SDKWork Claw Router - Disaster Recovery Plan

**Document Version:** 1.0
**Last Updated:** 2026-07-14
**Owner:** Platform Engineering
**Review Frequency:** Quarterly
**Status:** Target recovery design only. It has not been exercised for the
current candidate and does not establish deployable HA, backup, restore, RPO,
or RTO capability.

> Do not execute destructive commands in this document against a deployment
> until the deployed topology, immutable artifact, backup inventory, recovery
> owner, and Finance/SRE reconciliation procedure are approved and verified.
> In-flight billable or non-idempotent outcomes are unknown after a fault and
> must not be blindly retried.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scope and Objectives](#scope-and-objectives)
3. [Recovery Objectives](#recovery-objectives)
4. [Backup Strategy](#backup-strategy)
5. [Disaster Scenarios](#disaster-scenarios)
6. [Recovery Procedures](#recovery-procedures)
7. [Communication Plan](#communication-plan)
8. [Post-Incident Review](#post-incident-review)

---

## Executive Summary

This document records the target disaster-recovery design for SDKWork Claw
Router. It does not yet provide a tested recovery procedure for a current
release candidate; the active production-readiness review remains authoritative
for open PostgreSQL, Redis, identity, accounting, and recovery blockers.

### Key Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| RTO (Recovery Time Objective) | Not established for current candidate | Not measured |
| RPO (Recovery Point Objective) | Not established for current candidate | Not measured |
| Availability Target | Planning target only | No current-candidate evidence |
| Recovery Validation Frequency | Required before release | Not executed for current candidate |

---

## Scope and Objectives

### In Scope

- Claw Router Gateway services (cloud, standalone, edge)
- PostgreSQL database (primary data store)
- Redis cache and state management
- Configuration and secrets management
- Tenant signing keys and credentials
- Usage and billing data

### Out of Scope

- Third-party AI provider infrastructure
- Client application recovery
- Network infrastructure (handled by cloud provider)
- Physical data center recovery (cloud-hosted)

### Recovery Objectives

#### Primary Objectives

1. **Data Loss Objective**: Not established for the current candidate. A
   numeric RPO remains a planning target until backup, restore, and accounting
   reconciliation drills establish it.
2. **Service Restoration Objective**: Not established for the current
   candidate. A numeric RTO remains a planning target until promotion, restore,
   and application recovery drills establish it.
3. **Maintain Security Posture**: Ensure encryption keys and credentials remain secure during recovery
4. **Preserve Audit Trail**: Maintain all request traces and audit logs

#### Service Priority

| Priority | Service | Description |
|----------|---------|-------------|
| P0 | Gateway API | Core routing and proxy functionality |
| P1 | Admin Portal | Tenant and configuration management |
| P2 | Analytics Dashboard | Usage reports and billing data |
| P3 | Historical Data | Archived traces and audit logs |

---

## Recovery Objectives

### RTO/RPO Matrix

| Component | RTO | RPO | Backup Frequency |
|-----------|-----|-----|------------------|
| PostgreSQL | Not established | Not established | No current-candidate PITR/restore evidence |
| Redis | Not established | Not established | Accounting retry/DLQ retention and recovery policy unapproved |
| Application Config | Not established | Not established | Inventory and restore drill unverified |
| Signing Keys | Not established | Not established | Durable key-store and recovery design incomplete |

### SLO Targets

| SLO | Target | Measurement Window |
|-----|--------|-------------------|
| Availability | Not established for current candidate | No current-candidate SLO evidence |
| Error Rate | Not established for current candidate | No current-candidate SLO evidence |
| p95 Latency | Not established for current candidate | No current-candidate SLO evidence |
| p99 Latency | Not established for current candidate | No current-candidate SLO evidence |

---

## Backup Strategy

### Database Backup

#### PostgreSQL

No approved deployment currently supplies a backup scheduler, WAL archive
destination, or restore inventory. The former cron and PostgreSQL setting
fragments were intentionally removed because mixing shell scheduling and server
configuration in one code block was not an executable backup procedure. A
reviewed `sdkwork-database` or managed-provider procedure must define, test,
and evidence these values before release.

#### Point-in-Time Recovery (PITR)

No current-candidate PITR procedure, backup inventory, restore target, or
provider-specific recovery configuration has been exercised. The former
illustrative `pg_restore`/WAL snippets are intentionally removed because they
were not an executable PostgreSQL recovery procedure. A reviewed
`sdkwork-database` or managed-provider runbook must define the exact base
backup, WAL/archive, isolated restore, validation, reconciliation, and
cutover sequence before release.

### Redis Backup

Redis in Claw Router is used for:
- Circuit breaker state
- Idempotency keys
- Session caching
- Rate limiting counters
- Gateway accounting retry stream, schedule, payload, deduplication, and DLQ
  records when Redis retry mode is enabled

Circuit-breaker, rate-limit, session, and some idempotency state can be
reconstructed or expire. Accounting retry/DLQ state is a recoverable financial
fact, not disposable cache data. The current candidate has no approved Redis
retention, persistence, backup, restore, reconciliation, or operator requeue
procedure. Do not flush, trim, delete, recreate, or replace accounting retry
state with an empty queue. Finance/SRE must approve the policy and execute a
restore drill before any Redis RPO/RTO claim.

### Configuration Backup

```bash
# Kubernetes ConfigMaps and Secrets
kubectl get configmap -n clawrouter -o yaml > backups/configmaps.yaml
kubectl get secret -n clawrouter -o yaml > backups/secrets.yaml

# Schedule: Daily at 03:00 UTC
# Retention: 30 days
```

### Signing Key Backup

No durable tenant signing-key store, cross-replica lifecycle, encrypted backup
source, or restore drill is currently approved. Do not treat an in-memory key
map or an arbitrary Kubernetes Secret export as a complete signing-key backup.
The Security/IAM owner must first define the canonical key store, access
controls, encryption, retention, grace/revocation behavior, and recovery test.

---

## Disaster Scenarios

### Scenario 1: Database Failure

**Impact**: All gateway operations halt
**Severity**: Critical
**Detection**: `/readyz` returns 503, alerts trigger

#### Symptoms

```
ERROR: could not connect to database server
FATAL: password authentication failed
```

#### Recovery Steps

1. **Immediate Assessment** (0-5 minutes)
   ```bash
   # Check database connectivity
   kubectl exec -it deploy/claw-router-gateway -- \
     psql -h postgres -U clawrouter -c "SELECT 1"

   # Check database pod status
   kubectl get pods -n postgres -l app=postgres
   ```

2. **Database recovery decision**

   Do not delete a primary Pod or assume its persistent volume is recoverable.
   First verify the deployed HA manager, replica/WAL state, backup inventory,
   and application write quiescence under the approved current-candidate
   procedure. The outcome of in-flight financial transactions remains unknown
   until idempotency and reconciliation determine it.

3. **Point-in-Time Recovery**

   No tested current-candidate command sequence exists. Do not scale the
   gateway, overwrite a database, or restore an arbitrary backup using this
   document. Follow the future reviewed provider/`sdkwork-database` PITR
   procedure only after its isolated restore and accounting reconciliation
   evidence is attached to the candidate.

4. **Validation**
   ```bash
   # Verify data integrity
   kubectl exec -it deploy/claw-router-gateway -- \
     psql -h postgres -U clawrouter -c "SELECT COUNT(*) FROM ai_usage"

   # Check gateway health
   curl https://gateway.example.com/healthz
   ```

### Scenario 2: Redis Failure

**Impact**: Rate limiting, circuit breakers, idempotency, and potentially
gateway accounting retry/DLQ durability are degraded
**Severity**: Critical when accounting retry/DLQ state is present
**Detection**: Prometheus alerts for Redis connection errors

#### Symptoms

```
ERROR Unable to connect to Redis: Connection refused
WARN Circuit breaker state lost, resetting to CLOSED
```

#### Recovery Steps

1. **Preserve and assess Redis state**

   Do not delete the Redis primary or assume Sentinel promotion preserves every
   accounting delivery. Record stream/DLQ depth, pending leases, replication
   state, persistence configuration, and the approved recovery decision before
   a destructive operation.

2. **Verify approved recovery evidence**
   ```bash
   # Check Redis connectivity
   kubectl exec -it deploy/claw-router-gateway -- \
     redis-cli -h redis-primary ping

   # Accounting recovery requires a separate approved reconciliation record;
   # circuit-breaker recreation alone is insufficient.
   ```

### Scenario 3: Gateway Service Failure

**Impact**: API gateway unavailable
**Severity**: Critical
**Detection**: Liveness probe failure, HPA scale-to-zero

#### Recovery Steps

1. **Check Pod Health**
   ```bash
   kubectl get pods -n clawrouter -l app=claw-router-gateway
   kubectl describe pod <pod-name> -n clawrouter
   ```

2. **Rollback Deployment** (if bad deployment)
   ```bash
   # View deployment history
   kubectl rollout history deployment/claw-router-gateway -n clawrouter

   # Rollback to previous version
   kubectl rollout undo deployment/claw-router-gateway -n clawrouter
   ```

3. **Force Restart** (if stuck)
   ```bash
   kubectl rollout restart deployment/claw-router-gateway -n clawrouter
   ```

### Scenario 4: Data Corruption

**Impact**: Corrupted records affecting billing or routing
**Severity**: High
**Detection**: Data integrity checks failing

#### Recovery Steps

1. **Identify Corruption Scope**
   ```bash
   # Check for NULL values in critical columns
   kubectl exec -it deploy/claw-router-gateway -- \
     psql -h postgres -U clawrouter -c \
     "SELECT COUNT(*) FROM ai_usage WHERE tenant_id IS NULL"
   ```

2. **PITR to Pre-Corruption Point**

   No current-candidate PITR/reconciliation procedure is available. Do not
   scale writers down, overwrite the database, or resume traffic from an
   arbitrary backup. Use the future reviewed provider/`sdkwork-database`
   procedure only after isolated restore, financial reconciliation, and
   cutover evidence are approved.

### Scenario 5: Encryption Key Loss

**Impact**: Tenant signing-key recovery is currently unproven; sessions or
signed artifacts may be invalidated
**Severity**: Critical
**Detection**: Signing key verification failures

#### Recovery Steps

1. **Assess Key Loss Scope**

   Do not infer a canonical key store or backup from an arbitrary Kubernetes
   Secret. The current signing-key lifecycle is not a durable, cross-replica
   recovery design. Escalate to the Security/IAM owner and preserve incident
   evidence without exporting raw key material.

2. **Restore from Backup**

   No approved restore source or procedure exists. A durable key store,
   encryption/access policy, grace/revocation semantics, and recovery drill are
   release prerequisites; do not apply a guessed Secret or claim automatic
   verification.

3. **Containment**

   Do not run `FLUSHDB`: Redis can contain accounting retry/DLQ facts in
   addition to cache-like state. Follow the reviewed Security/IAM incident
   response and Finance/SRE reconciliation process when it exists.

---

## Recovery Procedures

### Pre-Recovery Checklist

- [ ] Declare incident in status page
- [ ] Notify on-call engineer
- [ ] Open incident channel (#incident-clawrouter)
- [ ] Assign incident commander
- [ ] Document timeline

### Non-Executable Historical Template

The shell fragment below is retained only to show why a current procedure must
not be inferred from historical text. It is not approved for any environment:
it contains destructive scale/rollback choices without a verified backup,
cluster identity, migration, accounting-reconciliation, or restore contract.
Do not copy, execute, or adapt it as an operational recovery command. Replace
it with an owned, drilled procedure before a release candidate is approved.

```bash
#!/bin/bash
# emergency-recovery.sh - Emergency Recovery Procedure

set -e

NAMESPACE="clawrouter"
BACKUP_SERVER="backup-server.example.com"

echo "=== SDKWork Claw Router Emergency Recovery ==="
echo "Timestamp: $(date -Iseconds)"
echo ""

# Step 1: Assess status
echo "Step 1: Assessing system status..."
kubectl get pods -n $NAMESPACE
echo ""

# Step 2: Check database connectivity
echo "Step 2: Checking database connectivity..."
kubectl exec -it deploy/claw-router-gateway -n $NAMESPACE -- \
  timeout 5 bash -c 'psql -h postgres -U clawrouter -c "SELECT version();"' || \
  echo "WARNING: Database unreachable"
echo ""

# Step 3: Check Redis connectivity
echo "Step 3: Checking Redis connectivity..."
kubectl exec -it deploy/claw-router-gateway -n $NAMESPACE -- \
  timeout 5 bash -c 'redis-cli -h redis ping' || \
  echo "WARNING: Redis unreachable"
echo ""

# Step 4: Verify backup integrity
echo "Step 4: Verifying backup integrity..."
ssh $BACKUP_SERVER "ls -la /backups/*.dump" | tail -5
echo ""

# Step 5: Scale down services
echo "Step 5: Scaling down services..."
kubectl scale deployment claw-router-gateway --replicas=0 -n $NAMESPACE
kubectl scale deployment claw-router-admin-api --replicas=0 -n $NAMESPACE
echo ""

# Step 6: Perform recovery (customize based on scenario)
echo "Step 6: Recovery options:"
echo "  1. Restore from latest backup"
echo "  2. Restore to specific point in time"
echo "  3. Rollback deployment"
echo "  4. Cancel (manual intervention required)"
echo ""

read -p "Select recovery option (1-4): " option

case $option in
  1)
    echo "Restoring from latest backup..."
    # kubectl exec postgres-0 -- pg_restore ...
    ;;
  2)
    read -p "Enter recovery timestamp (YYYY-MM-DD HH:MM:SS): " timestamp
    echo "Restoring to $timestamp..."
    # kubectl exec postgres-0 -- pg_restore --checkpoint="$timestamp" ...
    ;;
  3)
    echo "Rolling back deployment..."
    kubectl rollout undo deployment/claw-router-gateway -n $NAMESPACE
    ;;
  4)
    echo "Cancelling. Manual intervention required."
    exit 1
    ;;
esac

# Step 7: Scale up services
echo "Step 7: Scaling up services..."
kubectl scale deployment claw-router-gateway --replicas=2 -n $NAMESPACE
kubectl scale deployment claw-router-admin-api --replicas=1 -n $NAMESPACE
echo ""

# Step 8: Validate recovery
echo "Step 8: Validating recovery..."
sleep 30
kubectl exec -it deploy/claw-router-gateway -n $NAMESPACE -- \
  curl -s http://localhost:8080/healthz || echo "Health check failed"
echo ""

echo "=== Recovery Complete ==="
echo "Please verify data integrity and update status page."
```

### Post-Recovery Validation

```bash
# 1. Check all pods are running
kubectl get pods -n clawrouter

# 2. Verify database data
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c "SELECT COUNT(*) FROM ai_usage;"

# 3. Test gateway endpoints
curl -I https://gateway.example.com/healthz
curl -I https://gateway.example.com/readyz

# 4. Verify rate limiting
# (Send test requests and verify counters increment)

# 5. Check circuit breakers
kubectl logs deploy/claw-router-gateway | grep "Circuit breaker" | tail -10

# 6. Verify SLO metrics
curl -s https://gateway.example.com/metrics | grep clawrouter_slo
```

---

## Communication Plan

### Incident Communication Matrix

| Audience | Notification Method | Timing |
|----------|-------------------|--------|
| Internal Team | Slack #incident-clawrouter | Immediate |
| On-Call | PagerDuty | Immediate |
| Status Page | statuspage.io | Within 5 minutes |
| Customers | Email (if P0) | Within 30 minutes |
| Leadership | Slack #incidents | Within 1 hour |

### Status Page Template

```markdown
## Incident #XXXX - [Gateway Availability Issue]

**Status:** Investigating
**Severity:** P1
**Started:** 2026-06-27 10:30:00 UTC

**Impact:**
- Some API requests may be experiencing elevated latency
- Approximately 5% of requests affected

**What we're doing:**
- Our engineering team is investigating elevated error rates
- We have identified a potential database connection issue

**Next update:** 2026-06-27 11:00:00 UTC

---

**Resolved** - 2026-06-27 11:45:00 UTC

The incident has been resolved. All services are operating normally.

**Root cause:** Database connection pool exhaustion due to connection leak
**Duration:** 1 hour 15 minutes
```

---

## Post-Incident Review

### PIR Template

```markdown
# Post-Incident Review - [Incident ID]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P0/P1/P2

## Summary
Brief description of what happened and impact.

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Service restored |

## Root Cause
Detailed explanation of the root cause.

## Impact
- Requests affected: XXX
- Revenue impact: $XXX
- Customer impact: XXX

## Response Effectiveness
- Detection time: XX minutes
- Escalation time: XX minutes
- Mean time to resolution: XX minutes

## Lessons Learned
1. What went well?
2. What could be improved?
3. Action items?

## Action Items
| Item | Owner | Due Date |
|-----|-------|----------|
| | | |
```

---

## Testing Schedule

| Test Type | Frequency | Team |
|-----------|-----------|------|
| Backup Restoration | Planning target; not executed for current candidate | Platform Engineering |
| DR Runbook Validation | Planning target; not executed for current candidate | SRE |
| Full DR Exercise | Planning target; not executed for current candidate | All |
| Chaos Engineering | Planning target; not executed for current candidate | Platform Engineering |

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Primary On-Call | [Name] | pagerduty@example.com |
| Secondary On-Call | [Name] | pagerduty@example.com |
| Database Lead | [Name] | [email] |
| Security Lead | [Name] | [email] |
| VP Engineering | [Name] | [email] |

---

## Appendix

### A. Backup Retention Policy

| Backup Type | Retention | Location |
|-------------|-----------|----------|
| Full Database | Not established | No approved backup inventory |
| WAL Archives | Not established | No approved archive or restore inventory |
| Configuration | Not established | Restore source and drill unverified |
| Signing Keys | Not established | Durable key-store and retention design incomplete |

### B. Recovery Time Estimates

| Scenario | Estimated Time | Notes |
|----------|---------------|-------|
| Pod restart | Not established | Requires a current-candidate drill |
| Database restart | Not established | Requires a verified recovery procedure |
| Full PITR | Not established | Requires isolated restore and reconciliation evidence |
| Cross-region failover | Not established | Requires approved topology and disaster-recovery drill |

### C. Related Documents

- [Production Operations Runbook](production-operations.md)
- [Security Incident Response Plan](SECURITY.md)
- [Database Schema Documentation](../docs/database)
- [Kubernetes Deployment Guide](kubernetes/README.md)
