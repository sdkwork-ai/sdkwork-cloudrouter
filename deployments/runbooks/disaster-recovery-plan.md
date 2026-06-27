# SDKWork Claw Router - Disaster Recovery Plan

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Platform Engineering
**Review Frequency:** Quarterly

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

This document defines the disaster recovery (DR) plan for SDKWork Claw Router, an enterprise-grade AI API gateway. The plan ensures business continuity by establishing recovery procedures for various failure scenarios affecting the gateway infrastructure.

### Key Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| RTO (Recovery Time Objective) | 4 hours | 8 hours |
| RPO (Recovery Point Objective) | 5 minutes | 15 minutes |
| Availability Target | 99.9% | 99.0% |
| Recovery Validation Frequency | Monthly | Quarterly |

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

1. **Minimize Data Loss**: Maximum 5 minutes of data loss (RPO)
2. **Restore Service Quickly**: Restore critical functions within 4 hours (RTO)
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
| PostgreSQL | 30 minutes | 5 minutes | Continuous WAL + Daily full |
| Redis | 15 minutes | 0 (stateless) | N/A |
| Application Config | 1 hour | 1 hour | On change |
| Signing Keys | 4 hours | 0 | Encrypted backup on rotation |

### SLO Targets

| SLO | Target | Measurement Window |
|-----|--------|-------------------|
| Availability | 99.9% | Rolling 30 days |
| Error Rate | < 0.1% | Rolling 30 days |
| p95 Latency | < 50ms | Rolling 1 hour |
| p99 Latency | < 100ms | Rolling 1 hour |

---

## Backup Strategy

### Database Backup

#### PostgreSQL

```sql
-- Full backup schedule (daily at 02:00 UTC)
0 2 * * * pg_dump -Fc -f /backups/full_$(date +\%Y\%m\%d).dump clawrouter

-- WAL archival (continuous)
wal_level = replica
archive_mode = on
archive_command = 'rsync %p backup-server:/wal/%f'
max_wal_senders = 10
```

#### Point-in-Time Recovery (PITR)

```bash
# Restore to specific point in time
pg_restore --checkpoint='2026-06-27 10:30:00 UTC' \
  --jobs=4 \
  --dbname=clawrouter \
  /backups/full_latest.dump

# Apply WAL segments
restore_command = 'rsync backup-server:/wal/%f %p'
recovery_target_time = '2026-06-27 10:30:00 UTC'
```

### Redis Backup

Redis in Claw Router is used for:
- Circuit breaker state
- Idempotency keys
- Session caching
- Rate limiting counters

All Redis data is stateless and recoverable via:
1. Application restart rebuilds circuit breaker state
2. Idempotency keys expire within 24 hours
3. Session cache regenerates on next authentication

**No persistent Redis backup required** for disaster recovery.

### Configuration Backup

```bash
# Kubernetes ConfigMaps and Secrets
kubectl get configmap -n clawrouter -o yaml > backups/configmaps.yaml
kubectl get secret -n clawrouter -o yaml > backups/secrets.yaml

# Schedule: Daily at 03:00 UTC
# Retention: 30 days
```

### Signing Key Backup

Per-tenant signing keys are encrypted with AES-256-GCM:

```bash
# Encrypted key backup
kubectl get secret tenant-signing-keys -n clawrouter -o jsonpath='{.data.keys}' \
  | base64 -d > backups/tenant-signing-keys.enc

# Key rotation backup (retain for 90 days after rotation)
mv backups/tenant-signing-keys.enc \
   backups/tenant-signing-keys-$(date +%Y%m%d).enc
```

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

2. **Database Pod Restart** (5-10 minutes)
   ```bash
   # If pod is failing, restart it
   kubectl delete pod postgres-0 -n postgres

   # If persistent volume is intact, data will recover
   ```

3. **Point-in-Time Recovery** (30-60 minutes if pod is lost)
   ```bash
   # Scale down gateway
   kubectl scale deployment claw-router-gateway --replicas=0 -n clawrouter

   # Restore from latest backup
   kubectl exec -it postgres-0 -n postgres -- \
     pg_restore -c --dbname=postgres /backups/latest.dump

   # Scale up gateway
   kubectl scale deployment claw-router-gateway --replicas=2 -n clawrouter
   ```

4. **Validation**
   ```bash
   # Verify data integrity
   kubectl exec -it deploy/claw-router-gateway -- \
     psql -h postgres -U clawrouter -c "SELECT COUNT(*) FROM ai_usage_fact"

   # Check gateway health
   curl https://gateway.example.com/healthz
   ```

### Scenario 2: Redis Failure

**Impact**: Rate limiting, circuit breakers, idempotency temporarily degraded
**Severity**: Medium
**Detection**: Prometheus alerts for Redis connection errors

#### Symptoms

```
ERROR Unable to connect to Redis: Connection refused
WARN Circuit breaker state lost, resetting to CLOSED
```

#### Recovery Steps

1. **Redis Pod Restart** (5-10 minutes)
   ```bash
   kubectl delete pod redis-primary-0 -n clawrouter
   # Sentinel will promote replica to primary automatically
   ```

2. **Verify State Recovery**
   ```bash
   # Check Redis connectivity
   kubectl exec -it deploy/claw-router-gateway -- \
     redis-cli -h redis-primary ping

   # Verify circuit breaker rebuild
   kubectl logs deploy/claw-router-gateway | grep "Circuit breaker"
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
     "SELECT COUNT(*) FROM ai_usage_fact WHERE tenant_id IS NULL"
   ```

2. **PITR to Pre-Corruption Point**
   ```bash
   # Stop application writes
   kubectl scale deployment claw-router-gateway --replicas=0 -n clawrouter

   # Restore to last known good point
   pg_restore --checkpoint='2026-06-27 08:00:00 UTC' \
     --jobs=4 /backups/full_latest.dump clawrouter

   # Validate data
   # ...

   # Resume application
   kubectl scale deployment claw-router-gateway --replicas=2 -n clawrouter
   ```

### Scenario 5: Encryption Key Loss

**Impact**: Cannot decrypt tenant signing keys, sessions invalidated
**Severity**: Critical
**Detection**: Signing key verification failures

#### Recovery Steps

1. **Assess Key Loss Scope**
   ```bash
   # Check which tenants are affected
   kubectl get secret tenant-signing-keys -n clawrouter -o yaml

   # Check backup availability
   ls -la backups/tenant-signing-keys-*.enc
   ```

2. **Restore from Backup**
   ```bash
   # Restore encrypted keys
   kubectl apply -f backups/tenant-signing-keys-latest.enc

   # Verify decryption works
   # (Application will auto-verify on next request)
   ```

3. **Force Tenant Re-authentication** (if keys are compromised)
   ```bash
   # Invalidate all sessions
   kubectl exec -it deploy/claw-router-gateway -- \
     redis-cli FLUSHDB

   # Notify tenants
   # (Automated via status page and email)
   ```

---

## Recovery Procedures

### Pre-Recovery Checklist

- [ ] Declare incident in status page
- [ ] Notify on-call engineer
- [ ] Open incident channel (#incident-clawrouter)
- [ ] Assign incident commander
- [ ] Document timeline

### Recovery Runbook

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
  psql -h postgres -U clawrouter -c "SELECT COUNT(*) FROM ai_usage_fact;"

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
| Backup Restoration | Monthly | Platform Engineering |
| DR Runbook Validation | Quarterly | SRE |
| Full DR Exercise | Annually | All |
| Chaos Engineering | Weekly | Platform Engineering |

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
| Full Database | 30 days | Primary + Off-site |
| WAL Archives | 7 days | Primary |
| Configuration | 30 days | Git + Off-site |
| Signing Keys | 90 days | HSM + Off-site |

### B. Recovery Time Estimates

| Scenario | Estimated Time | Notes |
|----------|---------------|-------|
| Pod restart | 5-10 minutes | Automated |
| Database restart | 15-30 minutes | Depends on WAL recovery |
| Full PITR | 30-60 minutes | Depends on data volume |
| Cross-region failover | 4-8 hours | Manual + DNS update |

### C. Related Documents

- [Production Operations Runbook](production-operations.md)
- [Security Incident Response Plan](SECURITY.md)
- [Database Schema Documentation](../docs/database)
- [Kubernetes Deployment Guide](kubernetes/README.md)
