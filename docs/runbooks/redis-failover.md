# SDKWork Claw Router - Redis Failover Runbook

**Document Version:** 1.0
**Last Updated:** 2026-07-14
**Owner:** Platform Engineering / clawrouter-release
**Review Frequency:** Quarterly
**Severity:** P0
**Status:** Target procedure only. It has not been validated for the current
candidate and must not be used as proof of Redis HA, recovery, or RPO/RTO.

> Accounting safety: Redis can hold gateway-accounting retry stream, schedule,
> payload, deduplication, and DLQ records. Those records are not disposable
> cache state. Do not trim, flush, delete, recreate, or fail over this state
> through a destructive operation until Finance/SRE approve a retention,
> backup, restore, reconciliation, and operator replay policy.

---

## Table of Contents

1. [Scenario](#scenario)
2. [Architecture](#architecture)
3. [Automatic Failover](#automatic-failover)
4. [Manual Intervention](#manual-intervention)
5. [Degraded Mode](#degraded-mode)
6. [Post-Recovery](#post-recovery)
7. [Related Documents](#related-documents)

---

## Scenario

The Redis primary node fails, or the network partitions the primary from the
Sentinel quorum. Redis holds circuit-breaker state, idempotency keys, rate
limit counters, session cache, and optionally gateway accounting retry/DLQ
facts for Claw Router. The documented Sentinel topology is a target design;
automatic promotion, durability, reconciliation, and degraded-mode behavior
need current-candidate validation before an operator executes this procedure.

## Architecture

- **Target topology**: 1 primary + 2 replicas + 3 Sentinel nodes (quorum = 2).
- **Production hardening** (per [SECURITY.md](../../SECURITY.md)): Redis runs
  with `requirepass` enabled and TLS in production.
- **State classification**: circuit-breaker, rate-limit, session, and some
  idempotency state can be reconstructed or expire, but Redis accounting retry
  stream/payload/schedule/DLQ state cannot be classified as disposable. The
  current candidate has no Finance/SRE-approved retention, backup, restore,
  reconciliation, or requeue procedure. This is a release blocker, not an
  instruction to silently fall back to a new empty queue.

## Automatic Failover

The steps below describe a target Sentinel procedure. Confirm the deployed
topology, persistence settings, replica health, accounting backlog, and the
approved destructive-operation guard before using them. A failover does not
prove an in-flight accounting delivery completed, and billable/non-idempotent
work must not be automatically retried from an unknown outcome.

Sentinel detects primary loss and orchestrates promotion without human action:

1. **Detect** — Sentinels mark the primary as `s_down` then `o_down` after the
   configured `down-after-milliseconds` (default 30 s).
2. **Elect** — a Sentinel leader is elected; it selects the most up-to-date
   replica and promotes it to primary.
3. **Re-point** — Sentinels reconfigure remaining replicas to follow the new
   primary and update the DNS / Service endpoint.
4. **Reconnect** — gateway pods reconnect automatically through the Service
   endpoint; the rate limiter and circuit breaker resume against the new
   primary.

Verify automatic failover completed:

```bash
# Sentinel reports the new primary
kubectl exec -it deploy/redis-sentinel -n clawrouter -- \
  redis-cli -p 26379 -a "${REDIS_PASSWORD}" --tls sentinel masters
```

Expected: one master entry with `flags` containing `master` and `num-slaves`
of 2. Confirm the gateway reconnected:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s http://localhost:8080/metrics | grep -E "circuit_breaker_redis_degraded|redis_up"
```

`circuit_breaker_redis_degraded` SHOULD return to `0` after reconnection.

## Manual Intervention

If `circuit_breaker_redis_degraded` stays `1` for more than 2 minutes,
automatic failover has not completed. Intervene manually.

### Step 1: Verify Sentinel state

```bash
kubectl exec -it deploy/redis-sentinel -n clawrouter -- \
  redis-cli -p 26379 -a "${REDIS_PASSWORD}" --tls sentinel masters

# Inspect each Sentinel's view of the master
kubectl exec -it deploy/redis-sentinel -n clawrouter -- \
  redis-cli -p 26379 -a "${REDIS_PASSWORD}" --tls sentinel get-master-addr-by-name clawrouter
```

### Step 2: Force a failover

If Sentinels agree on a master name but the master is unreachable, force
Sentinel to promote a replica:

```bash
kubectl exec -it deploy/redis-sentinel -n clawrouter -- \
  redis-cli -p 26379 -a "${REDIS_PASSWORD}" --tls sentinel failover clawrouter
```

### Step 3: Restart a stuck gateway pod

If the gateway pod is not reconnecting (stale connection), recycle it:

```bash
kubectl rollout restart deployment/claw-router-gateway -n clawrouter
kubectl rollout status  deployment/claw-router-gateway -n clawrouter
```

## Degraded Mode

When Redis is entirely unavailable and failover cannot restore it, the
gateway degrades to local in-memory state. Per [SECURITY.md](../../SECURITY.md)
H-8, the `GatewayInvocationRateLimiter` emits `redis_degraded=1` and the local
fallback tightens the quota by `estimated_instance_count` to stay safe.

Degraded-mode capabilities and risks:

| Capability | Degraded behavior | Risk |
|-----------|-------------------|------|
| Rate limiting | Local per-instance counters, tightened quota | Slight over-throttling across instances; counters not shared. |
| Circuit breaker | Local breaker state; `fail_open` stays `false` (C-4) | Breaker state not shared across pods; one pod may keep retrying a bad provider. |
| Idempotency | Local 24 h key cache | Duplicate submissions possible if a request retries on a different pod. |
| Session cache | Cache miss forces re-authentication | Elevated auth load; login rate limit (10 / 15 min) still applies. |
| Accounting retry/DLQ | No approved fallback, reset, trim, or automatic replay policy | Losing or replacing stream/payload/DLQ state can lose or duplicate accounting facts; keep readiness degraded and reconcile under Finance/SRE control. |

> Degraded mode is a safety net, not a steady state. Resolve Redis failure as
> fast as possible; data consistency is at risk the longer it persists.

## Post-Recovery

Once Redis is healthy again (`circuit_breaker_redis_degraded == 0` for 5 min):

1. **Verify replication** — confirm both replicas are following the primary:
   ```bash
   kubectl exec -it deploy/redis-primary -n clawrouter -- \
     redis-cli -a "${REDIS_PASSWORD}" --tls info replication | grep -E "role|connected_slaves|slave[0-9]"
   ```
2. **Confirm Sentinel quorum** — all 3 Sentinels report the same master.
3. **Preserve accounting state first** — record retry/DLQ depth, oldest age,
   pending leases, and recovery decision before any pod or Redis operation that
   can alter state. Do not use `FLUSH*`, destructive trimming, or an empty
   replacement queue without the approved reconciliation process.
4. **Clear stale local state** — recycle gateway pods so each pod drops its
   local fallback counters and re-hydrates from Redis:
   ```bash
   kubectl rollout restart deployment/claw-router-gateway -n clawrouter
   ```
5. **Validate recovery evidence** — do not assert SLO, RPO, or RTO attainment
   until the current candidate's approved drill captures those measurements.

## Related Documents

- [Runbook Index](README.md)
- [Security Policy](../../SECURITY.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Rate Limit / Circuit Break Tuning](rate-limit-circuit-break.md)
- [PostgreSQL HA Failover](postgresql-ha-failover.md)
