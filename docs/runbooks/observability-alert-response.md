# Observability Alert Response

Status: active pre-launch procedure; release-candidate drill evidence required
Owner: SDKWork Claw Router SRE / clawrouter-release
Updated: 2026-08-01
Specs: `OBSERVABILITY_SPEC.md`, `HEALTH_CHECK_SPEC.md`, `DOCUMENTATION_SPEC.md`

## Scope

Use this runbook for HTTP availability burn, control-plane latency, scrape loss,
readiness failure, bounded metric-series saturation, high container memory, and
OOMKilled alerts emitted by
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
