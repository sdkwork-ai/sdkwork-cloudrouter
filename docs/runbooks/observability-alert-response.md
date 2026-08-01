# Observability Alert Response

Status: active pre-launch procedure; release-candidate drill evidence required
Owner: SDKWork Claw Router SRE / clawrouter-release
Updated: 2026-08-01
Specs: `OBSERVABILITY_SPEC.md`, `HEALTH_CHECK_SPEC.md`, `DOCUMENTATION_SPEC.md`

## Scope

Use this runbook for HTTP availability burn, control-plane latency, provider
usage and settlement integrity, circuit-breaker coordination, scrape loss,
readiness failure, bounded metric-series saturation, high container memory,
and OOMKilled alerts emitted by
[`deployments/prometheus/claw-router-alerts.yaml`](../../deployments/prometheus/claw-router-alerts.yaml).
The alert rules operate on runtime metrics exposed by `GET /metrics`; metrics
are operational projections and are never billing or audit authorities.

## First Five Minutes

1. Record the alert labels, firing expression, first-seen time, deployment
   revision, pod, node, and affected `service`/`api_surface`.
2. Check `GET /healthz` and `GET /readyz` through the internal service endpoint.
   Do not restart a pod before retaining its last logs, termination reason, and
   current metric sample.
3. Compare the firing pod with another replica. A single-replica failure points
   to node, pod, lease, connection-pool, or local saturation; a fleet-wide
   failure points to a shared dependency, rollout, policy, or provider.
4. Query structured logs by `traceId`, `operationId`, route template, and status.
   Never paste credentials, raw request bodies, tenant/user identifiers, or
   provider secrets into incident channels.
5. Freeze rollout and autoscaling changes until the failure class is known.

## Availability And HTTP Errors

- Break down `sdkwork_http_requests_labeled_total` by `service`, `api_surface`,
  `route`, `operation_id`, and `status`. HTTP 5xx consumes the service
  availability budget; 4xx remains visible but is treated as caller failure.
- Correlate new 5xx routes with the current deployment, database/Redis
  readiness, provider attempts, circuit breakers, accounting settlement, and
  outbound-policy rejection logs.
- For a single bad revision, stop the rollout and use the documented immutable
  rollback. For a shared provider outage, follow
  [provider-outage.md](provider-outage.md). For database or Redis failure,
  follow the corresponding failover runbook.
- Resolve only after both burn-rate windows return below threshold and a bounded
  synthetic request succeeds on every public surface.

## Latency

- The latency alerts cover app-api/backend-api control-plane operations. They do
  not claim the end-to-end provider-generation latency is below the gateway
  overhead target in the PRD.
- Use `sdkwork_http_request_duration_seconds_bucket` grouped by route and status
  to identify the slow operation. Check database pool pressure, Redis latency,
  lock contention, exhausted worker threads, and downstream timeouts.
- Do not raise alert thresholds to hide an incident. Threshold changes require
  reproducible load/soak evidence and a reviewed deployment change.

## Metric Capacity

- `sdkwork_http_metric_series_dropped_total` increasing means the fixed 4096
  request-series or 128 stage-series ceiling, or a label byte bound, rejected a
  new series. Existing series continue updating and business requests continue.
- Inspect recent route/operation additions for raw paths, identifiers, display
  names, or other unbounded labels. The correct fix is a route template and
  bounded code, never a larger unreviewed cardinality ceiling.
- Treat any credential, raw tenant/user/request identifier, signed URL, prompt,
  or object key in a metric label as a security incident.

## Missing Provider Usage

- `clawrouter_gateway_missing_usage_total` is a low-cardinality counter grouped
  only by the fixed OpenAI endpoint and streaming mode. Any increase means a
  successful provider response omitted the usage facts required for billing.
- Locate the persisted request trace with `provider_error_code` equal to
  `provider_usage_missing`, then correlate its `traceId` with redacted runtime
  logs. Use the trace to identify the supplier and account; never add account,
  tenant, user, request, or trace identifiers to metric labels.
- Confirm the outbound streaming request forced
  `stream_options.include_usage=true`. If it did, quarantine or de-prioritize
  the non-conforming provider route and compare the raw provider protocol only
  inside an approved restricted evidence store.
- Do not create a zero-token usage row, zero-value settlement, or synthetic
  provider usage event. Mark the invocation for reconciliation and compare it
  with the provider statement. Where a funds reservation exists, retain it
  until an explicit, durable reconciliation result is available.
- Resolve only after the faulty route is contained, the reconciliation owner is
  recorded, and the counter remains unchanged for two complete alert windows
  under representative traffic.

## Usage Settlement

- `clawrouter_usage_settlement_runs_total` has only the fixed outcomes
  `success`, `partial_failure`, `error`, and `disabled`. A partial failure is
  not a successful batch: inspect the failed durable usage rows while retaining
  already committed settlement entries as authoritative.
- Correlate `clawrouter_usage_settlement_errors_total` with
  `clawrouter_usage_settlement_duration_seconds` and PostgreSQL readiness,
  connection-pool saturation, transaction errors, deadlocks, and retry logs.
  Never replay a batch by inserting synthetic zero-value usage or debit rows.
- Compare the `settled` and `failed` series in
  `clawrouter_usage_settlement_items_total`. Retry only rows still in the
  durable pending/failed state and preserve their idempotency key and original
  usage authority.
- Resolve only after failed rows have an owned reconciliation decision, the
  worker completes two representative batches without error or partial
  failure, and pending age/volume is back within the release-candidate
  capacity envelope.

## Circuit Breaker Coordination

- `clawrouter_circuit_breaker_degraded_total` reports Redis coordination
  failures by a fixed operation and `fail_open`/`fail_closed` mode. In
  fail-closed mode, provider calls are intentionally rejected; in fail-open
  mode, calls may proceed without distributed circuit protection and require
  immediate containment.
- Break down `clawrouter_circuit_breaker_rejections_total` by its fixed
  `backend` and `reason` labels, then correlate with
  `clawrouter_circuit_breaker_transitions_total`. Repeated
  `closed -> open -> half_open` churn indicates provider instability or
  thresholds unsupported by measured traffic, not a reason to disable the
  breaker.
- Confirm Redis connectivity, latency, authentication, key prefix, TTL, and
  replica/failover health. Follow [redis-failover.md](redis-failover.md) for a
  shared Redis incident and [provider-outage.md](provider-outage.md) for an
  upstream failure.
- Metric labels never contain supplier codes, account IDs, tenant IDs, or
  request identifiers. Provider invocation metrics normalize suppliers to a
  fixed family dictionary and map custom values to `other`.
- Resolve only after coordination is healthy on every gateway replica,
  expected transitions resume, rejection rate returns to baseline, and a
  bounded fallback test succeeds.

## Memory And OOM

1. Retain `container_memory_working_set_bytes`, cgroup limit, restart count,
   `OOMKilled` reason, pod events, and the last 30 minutes of traffic and metric
   cardinality before replacing the pod.
2. Compare working-set growth with request rate, active streams, settlement
   queue depth, cache size, response/request sizes, and metric-series count.
3. Drain the affected replica when memory is still rising. Scale replicas only
   as a temporary containment measure; do not increase memory limits without a
   heap/RSS explanation and repeatable soak evidence.
4. Confirm request bodies, provider responses, streams, queues, pagination, and
   telemetry registries remain bounded. Run the release-candidate memory soak
   before declaring the incident resolved.

## Scrape And Readiness

- A scrape failure requires checking pod discovery annotations, NetworkPolicy,
  Service port/targetPort, the metrics bearer policy when enabled, and whether
  `/metrics` returns Prometheus text without a proxy HTML/error body.
- A readiness failure is a traffic-safety signal. Inspect the protected
  dependency detail, runtime ID lease, PostgreSQL, Redis, schema state, and
  required workers. Do not bypass readiness or change it to liveness.
- Resolve after Prometheus has scraped at least two consecutive intervals and
  every ready replica serves a bounded synthetic request.

## Evidence

Attach the Prometheus query/result, dashboard time range, sanitized logs and
trace IDs, Kubernetes events, deployment revision, mitigation timestamps,
verification commands, and fire/resolve timestamps to the incident record.
Pre-launch rule files and this runbook do not establish production readiness
without retained alert-rule and failure-drill evidence from the release candidate.
