# SDKWork Claw Router - Provider Upstream Outage Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Platform Engineering / clawrouter-gateway
**Review Frequency:** Quarterly
**Severity:** P0

---

## Table of Contents

1. [Scenario](#scenario)
2. [Symptom Identification](#symptom-identification)
3. [Diagnosis Steps](#diagnosis-steps)
4. [Emergency Mitigation](#emergency-mitigation)
5. [Recovery Verification](#recovery-verification)
6. [Post-Incident Review](#post-incident-review)
7. [Related Documents](#related-documents)

---

## Scenario

An upstream AI Provider (OpenAI, Anthropic, Google, Alibaba Tongyi / 通义, Tencent
Hunyuan / 混元, or any provider registered in the routing catalog) is degraded or
fully unavailable. Claw Router continues accepting tenant requests but the
provider relay returns elevated 5xx responses, and the per-provider circuit
breaker opens to protect the gateway.

This runbook covers single-provider partial outages, multi-provider outages, and
total upstream failure requiring degraded-mode operation.

## Symptom Identification

- Alert: `provider_invocation_total{status="5xx"}` rate exceeds 5% of
  `provider_invocation_total` over a 5-minute window.
- Alert: any `circuit_breaker_state{provider,route}` gauge transitions to `2`
  (open) and stays open longer than 1 minute.
- Alert: gateway p95 latency exceeds SLO (50 ms rolling 1h) due to upstream
  timeouts.
- Symptoms in logs:

  ```
  WARN  circuit_breaker_open provider=openai route=default open_duration=30s
  ERROR upstream_5xx provider=anthropic status=503 attempt=2 max_attempts=2
  WARN  dispatch_executor retry_exhausted shape=NonStream kind=Upstream5xx
  ```

- Customer-visible: HTTP `502 Bad Gateway` or `503 Service Unavailable` with
  `InvocationErrorKind::Upstream5xx` / `RateLimit` error bodies.

### Metric Cheat Sheet

| Metric | What it means | Alert threshold |
|--------|---------------|-----------------|
| `provider_invocation_total{provider,status}` | Counter of provider calls by status class | `5xx / total > 5%` over 5m |
| `circuit_breaker_state{provider,route}` | `0=closed, 1=half_open, 2=open` | `== 2` for > 1m |
| `circuit_breaker_redis_degraded` | Redis unavailable, breaker falling back | `== 1` |
| `provider_relay_duration_seconds` | Upstream call latency histogram | p99 > 60s (non-stream) |
| `dispatch_executor_max_attempts` | Max retry attempts configured per shape | drift from baseline |

## Diagnosis Steps

1. **Check the provider health dashboard**
   Open Grafana -> *Claw Router -> Provider Health*. Confirm which
   `provider` labels show elevated 5xx and which routes are affected.

2. **Inspect circuit breaker state**
   ```bash
   kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
     curl -s http://localhost:8080/metrics | grep circuit_breaker_state
   ```
   Expected output (open breaker example):
   ```
   circuit_breaker_state{provider="openai",route="default"} 2
   circuit_breaker_state{provider="anthropic",route="default"} 0
   ```

3. **Verify the provider status page**

   | Provider | Status page |
   |----------|-------------|
   | OpenAI | https://status.openai.com |
   | Anthropic | https://status.anthropic.com |
   | Google AI (Gemini) | https://status.cloud.google.com |
   | Alibaba Tongyi (通义) | https://help.aliyun.com/notice/alicloud/ |
   | Tencent Hunyuan (混元) | https://cloud.tencent.com/status |

4. **Test the provider endpoint directly**
   Bypass the gateway and call the provider relay target to confirm the outage
   is upstream and not internal:
   ```bash
   # From a pod that shares the provider egress path
   kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
     curl -sS -o /dev/null -w "%{http_code}\n" \
       -H "Authorization: Bearer ${PROVIDER_API_KEY}" \
       https://api.openai.com/v1/models
   ```
   A non-200 response (or connection timeout) confirms an upstream issue.

5. **Check the provider relay configuration**
   ```bash
   kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
     curl -s http://localhost:8080/admin/providers | jq '.[] | {id, enabled, base_url}'
   ```
   Confirm the failing provider's `base_url` is HTTPS (per SECURITY.md H-1) and
   the SSRF guard has not blocked a legitimate host (C-1).

## Emergency Mitigation

### Option A: Enable a backup provider channel

Switch routing policy so traffic for the affected provider is rerouted to a
healthy backup provider via the admin API. Backup channels must already be
configured in the routing catalog.

```bash
# Disable the failing provider channel
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X PATCH http://localhost:8080/admin/providers/<provider-id> \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"enabled": false}'

# Promote the backup channel to the route's primary weight
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X PUT http://localhost:8080/admin/routes/<route-id>/policy \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"channels": [{"provider": "<backup-provider>", "weight": 100}]}'
```

Only admin members with `membership_kind = admin` may invoke admin routes
(see [Production Operations](../../deployments/runbooks/production-operations.md)).

### Option B: Tune the circuit breaker

Temporarily raise the failure threshold or extend the open duration so the
breaker absorbs transient upstream flapping without forcing a full failover.
This is configured via `[provider_relay.circuit_breaker]` in the runtime
config; redeploy the config and roll the gateway pods.

| Parameter | Default | Temporary tuned value | Effect |
|-----------|---------|------------------------|--------|
| `failure_threshold` | 50 | 100 | More failures before opening |
| `open_duration` | 30s | 120s | Stay open longer once tripped |
| `half_open_max_probes` | 3 | 5 | More probes before closing |

`CircuitBreakerConfig::fail_open` MUST remain `false` (SECURITY.md C-4). Do not
flip it to fail-open during an upstream outage; that would let failed requests
through to tenants.

### Option C: Degraded mode (all providers down)

When every configured provider for a route is unavailable, enable degraded
mode so the gateway returns a controlled `503` with a tenant-friendly error
body instead of cascading retries:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -sS -X PATCH http://localhost:8080/admin/routes/<route-id>/policy \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"degraded_mode": true}'
```

In degraded mode the dispatch executor short-circuits with
`InvocationErrorKind::Upstream5xx` and HTTP 503, and the streaming retry
guard already keeps `max_attempts = 1` for SSE/byte streams (SECURITY.md H-5)
so no tenant connection is held open against a dead upstream.

## Recovery Verification

Once the provider status page reports recovery and a direct `curl` returns 200:

1. **Manually reset the circuit breaker** (the breaker auto-transitions
   through half-open, but a forced reset accelerates recovery):
   ```bash
   kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
     curl -sS -X POST http://localhost:8080/admin/providers/<provider-id>/circuit-breaker/reset \
       -H "Authorization: Bearer ${ADMIN_TOKEN}"
   ```

2. **Gradually restore traffic** — re-enable the provider at a low weight
   (e.g. 10%) and watch `provider_invocation_total{status="5xx"}` for 5
   minutes before ramping to 100%.

3. **Revert mitigation**:
   - If Option A was used, restore the original routing policy weights.
   - If Option B was used, revert the circuit breaker parameters and redeploy.
   - If Option C was used, disable `degraded_mode` and re-enable channels.

4. **Confirm SLO recovery**:
   ```bash
   curl -s https://gateway.example.com/metrics | grep clawrouter_slo
   ```
   Confirm error rate < 0.1% and p95 latency < 50 ms over a 30-minute window.

## Post-Incident Review

File a blameless postmortem within 48 hours using the template in
[Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#post-incident-review).
At minimum capture:

- **Incident timeline** — detection, mitigation, recovery timestamps.
- **Root cause** — provider-side incident ID and the upstream root cause from
  the provider's own postmortem.
- **Impact** — affected tenants, requests dropped, revenue impact.
- **Improvement actions** — examples:
  - Add the missing provider to the routing catalog as a backup channel.
  - Tighten alert thresholds on `provider_invocation_total{status="5xx"}`.
  - Schedule a failover drill and attach immutable current-candidate evidence
    in the [Runbook Index](README.md) drill-evidence column.

## Related Documents

- [Runbook Index](README.md)
- [Production Operations](../../deployments/runbooks/production-operations.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Rate Limit / Circuit Break Tuning](rate-limit-circuit-break.md)
- [Security Policy](../../SECURITY.md)
