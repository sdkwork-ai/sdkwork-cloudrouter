# SDKWork Claw Router - Redis Failover Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Platform Engineering / clawrouter-release
**Review Frequency:** Quarterly
**Severity:** P0

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
limit counters, and session cache for Claw Router. Sentinel is expected to
promote a replica automatically; this runbook covers verification, manual
override, and degraded-mode operation when Sentinel cannot recover.

## Architecture

- **Topology**: 1 primary + 2 replicas + 3 Sentinel nodes (quorum = 2).
- **Production hardening** (per [SECURITY.md](../../SECURITY.md)): Redis runs
  with `requirepass` enabled and TLS in production.
- **State classification**: per the
  [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#redis-backup),
  Redis data is treated as stateless and recoverable — no persistent Redis
  backup is required for DR because circuit-breaker state rebuilds on restart,
  idempotency keys expire within 24 h, and session cache regenerates on the
  next authentication.

## Automatic Failover

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
3. **Clear stale local state** — recycle gateway pods so each pod drops its
   local fallback counters and re-hydrates from Redis:
   ```bash
   kubectl rollout restart deployment/claw-router-gateway -n clawrouter
   ```
4. **Validate SLOs** — error rate < 0.1%, p95 latency < 50 ms over 30 min.

## Related Documents

- [Runbook Index](README.md)
- [Security Policy](../../SECURITY.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Rate Limit / Circuit Break Tuning](rate-limit-circuit-break.md)
- [PostgreSQL HA Failover](postgresql-ha-failover.md)
