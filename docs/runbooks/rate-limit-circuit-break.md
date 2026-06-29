# SDKWork Claw Router - Rate Limit / Circuit Break Tuning Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Platform Engineering / clawrouter-gateway
**Review Frequency:** Quarterly
**Severity:** P1

---

## Table of Contents

1. [Scenario](#scenario)
2. [Diagnosis](#diagnosis)
3. [Tuning Guidance](#tuning-guidance)
4. [Verification](#verification)
5. [Rollback](#rollback)
6. [Related Documents](#related-documents)

---

## Scenario

Either:

- Rate limiting is too strict and legitimate tenant requests are rejected
  with HTTP 429 (`InvocationErrorKind::RateLimit`).
- The per-provider circuit breaker opens too frequently, causing spurious
  failover and degraded throughput.
- Redis is degraded and the local fallback quota is over-throttling traffic.

This runbook tunes rate-limit and circuit-breaker parameters without weakening
the security hardening defaults documented in [SECURITY.md](../../SECURITY.md).

## Diagnosis

### 1. Inspect rate-limit rejections

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s http://localhost:8080/metrics | grep rate_limit_exceeded_total
```

Sample output:
```
rate_limit_exceeded_total{scope="tenant",tenant_id="tenantA"} 4123
rate_limit_exceeded_total{scope="ip",tenant_id=""} 87
rate_limit_exceeded_total{scope="tenant_inflight",tenant_id="tenantA"} 56
```

- High `scope="tenant_inflight"` rejections suggest the tenant concurrency cap
  (`tenant_max_inflight_requests`, default 100 per SECURITY.md H-9) is too low
  for the tenant's workload.
- High `scope="tenant"` rejections suggest the per-tenant QPS quota is too low.

### 2. Inspect circuit breaker state

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s http://localhost:8080/metrics | grep -E "circuit_breaker_state|circuit_breaker_redis_degraded"
```

- `circuit_breaker_state{provider,route} == 2` (open) recurring within a short
  window means `failure_threshold` is too low or `open_duration` too short for
  the provider's normal recovery time.
- `circuit_breaker_redis_degraded == 1` means the breaker has fallen back to
  local state because Redis is unavailable (see
  [Redis Failover](redis-failover.md)).

### 3. Analyze request patterns

Correlate QPS, concurrency, and upstream error rate over the incident window
from Grafana (*Claw Router -> Request Traffic*):

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| Tenant QPS | below tier quota | sustained at quota ceiling |
| Tenant in-flight concurrency | < 80 | pinned at 100 (cap) |
| Upstream 5xx rate | < 0.1% | > 1% (drives breaker open) |
| p95 latency | < 50 ms | > 100 ms |

## Tuning Guidance

### Rate limit (per tenant tier)

Adjust `[provider_relay.rate_limit]` per tenant tier. Raise the per-tenant
quota or in-flight cap only after confirming the tenant's workload is
legitimate (not an abuse pattern — see [Audit Log Investigation](audit-log-investigation.md)).

| Parameter | Default | Tuning note |
|-----------|---------|-------------|
| `tenant_max_inflight_requests` | 100 (SECURITY.md H-9) | Raise in steps of 50; never lower below 10. |
| Per-tenant QPS quota | tier-defined | Scale with the tenant's tier SLA. |
| `tenant_max_inflight_requests` for SSE | derived | Streaming already caps `max_attempts=1` (H-5); prefer raising concurrency over retry. |

Re-apply via the runtime config and roll the gateway:

```bash
kubectl rollout restart deployment/claw-router-gateway -n clawrouter
kubectl rollout status  deployment/claw-router-gateway -n clawrouter
```

### Circuit breaker

Tune `CircuitBreakerConfig` per provider channel:

| Parameter | Default | Tuning note |
|-----------|---------|-------------|
| `failure_threshold` | 50 | Raise to absorb transient flapping; lower for noisy providers. |
| `open_duration` | 30 s | Extend toward the provider's typical recovery time. |
| `half_open_max_probes` | 3 | Raise to confirm recovery before closing. |
| `fail_open` | `false` | MUST remain `false` (SECURITY.md C-4). Never flip this. |

### Redis degradation

When `circuit_breaker_redis_degraded == 1` persists, the local fallback
tightens the quota by `estimated_instance_count` (SECURITY.md H-8) to stay
safe, which over-throttles. Confirm whether Redis needs failover or scaling:

```bash
# Redis health
kubectl exec -it deploy/redis-primary -n clawrouter -- redis-cli ping
# If PONG is delayed or absent, follow the Redis Failover runbook.
```

If Redis is healthy but saturated (memory/CPU), scale the Redis pool or enable
the replica path rather than loosening the local fallback.

## Verification

After applying a change, monitor for 1 hour:

- `rate_limit_exceeded_total{scope="tenant_inflight"}` rate drops below the
  tenant's tier SLA threshold.
- `circuit_breaker_state` stays `0` (closed) for providers that are actually
  healthy.
- p95 latency < 50 ms and error rate < 0.1% over the rolling 1 h window.

```bash
curl -s https://gateway.example.com/metrics | grep clawrouter_slo
```

## Rollback

If tuning causes new problems (breaker stuck open, 429 storm, latency spike),
revert to the previous config snapshot:

```bash
# Restore the prior runtime config and redeploy
git checkout <prior-config-ref> -- deployments/config/claw-router.runtime.toml
kubectl rollout restart deployment/claw-router-gateway -n clawrouter
```

Because `fail_open` is never toggled, rollback cannot accidentally let failed
upstream requests through to tenants.

## Related Documents

- [Runbook Index](README.md)
- [Security Policy](../../SECURITY.md)
- [Provider Upstream Outage](provider-outage.md)
- [Redis Failover](redis-failover.md)
- [Audit Log Investigation](audit-log-investigation.md)
