# SDKWork Claw Router — Kubernetes Deployment Example

This example targets a distributed **cloud** production deployment (`SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE=cloud`, `SDKWORK_CLAW_ROUTER_RUNTIME_TARGET=container`) with PostgreSQL and Redis managed outside the cluster.

## Prerequisites

- PostgreSQL reachable from the cluster
- Managed Redis reachable from the cluster (required for cloud/server deployment profiles)
- Cilium installed with `CiliumNetworkPolicy` and DNS proxy support enabled
- `sdkwork-clawrouter-redis-auth` provisioned by an external secret controller;
  never apply the placeholder Redis credentials to a production namespace
- `sdkwork-clawrouter-config` mounted with `clawrouter.toml`, the runtime
  database identity, and the separately privileged
  `database-migrator-url`, API key pepper, session signing material,
  trusted-subject secret, and Redis URL
- Ingress controller (for example NGINX) and TLS issuer when using `claw-router-ingress.yaml`

## Apply

```bash
kubectl apply -f deployments/kubernetes/claw-router-network-policy.yaml
kubectl apply -f deployments/kubernetes/claw-router-egress-cilium-policy.yaml
kubectl apply -f deployments/kubernetes/claw-router-migration-job.yaml
kubectl wait --for=condition=complete job/sdkwork-clawrouter-db-upgrade-0-3-0 --timeout=600s
kubectl apply -f deployments/kubernetes/claw-router-gateway.yaml
kubectl apply -f deployments/kubernetes/claw-router-app-api.yaml
kubectl apply -f deployments/kubernetes/claw-router-admin-api.yaml
kubectl apply -f deployments/kubernetes/claw-router-edge.yaml
kubectl apply -f deployments/kubernetes/claw-router-ingress.yaml
```

The migration Job name is release-versioned. Every release must update the Job
name, image version, and wait target together. A completed Job from an older
release is not migration evidence for a newer image. The Job uses a dedicated
migrator credential; runtime workloads must not receive schema-owner privileges.

Redis is **required** for distributed rate limiting when running more than one
gateway replica. `SDKWORK_CLAW_REDIS_URL` is read from the
`sdkwork-clawrouter-redis-auth` Secret. Production uses a managed TLS endpoint;
`claw-router-redis.yaml` is a non-production integration fixture only.

Gateway handles OpenAI-compatible invocation (`/v1/*`) on port **18080**. Edge (port **3900**) proxies portal traffic and upstream app/backend APIs.

## Runtime env

Use canonical deployment metadata:

```text
SDKWORK_CLAW_ROUTER_CONFIG_PROFILE=prod
SDKWORK_CLAW_ROUTER_ENVIRONMENT=production
SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE=cloud
SDKWORK_CLAW_ROUTER_RUNTIME_TARGET=container
```

`SDKWORK_CLAW_DEPLOYMENT_MODE=cloud` is retired and rejected at startup.

## Probes

- **Startup**: `GET /healthz` — allows slow database/bootstrap warm-up
- **Liveness**: `GET /healthz` — process is running; `timeoutSeconds=3` so a wedged process is restarted quickly
- **Readiness**: `GET /readyz` — returns `503` until database, Redis (when required), and settlement prerequisites are healthy; `timeoutSeconds=5` on edge to tolerate brief DB/Redis network partitions without flipping the pod to not-ready. Readiness must only depend on internal dependencies (PostgreSQL, Redis), never on upstream AI provider reachability.

## Snowflake Node Leases

Every server replica acquires a fenced Snowflake node lease from the shared PostgreSQL
`sdkwork_node_registry` authority during startup. Startup fails closed when PostgreSQL is
unavailable or a lease cannot be acquired. The generator is fenced immediately when lease
ownership is lost or its last successful heartbeat expires; `/readyz` then returns `503` while a
bounded-backoff recovery worker acquires a new lease.

The metrics endpoint exports `clawrouter_runtime_id_generator_ready` and
`clawrouter_runtime_id_failures_total{operation,reason}` for this lifecycle. Scrape them per Pod;
the labels are bounded operational codes and never contain Pod identity, lease tokens, or raw
database errors. Production alert rules and their failure-series tests remain part of the release
evidence gate and must be reviewed before rollout.

The manifests inject `SDKWORK_NODE_HOSTNAME` from the Pod name and
`SDKWORK_NODE_INSTANCE_ID` from the Pod UID for lease diagnostics. Do not set
`SDKWORK_CLAW_SNOWFLAKE_NODE_ID` on Kubernetes workloads and never share a static Snowflake node
ID across replicas. Pod identity improves diagnostics but does not replace the PostgreSQL lease,
random ownership token, and monotonic fencing version.

Production least-privilege rollout is still blocked by the current platform allocator's runtime
DDL behavior. `sdkwork-database` must provide a migrator-owned registry provisioning step and a
runtime allocation path that requires only `USAGE` on the schema plus `SELECT`, `INSERT`, and
`UPDATE` on `sdkwork_node_registry`. Do not grant schema `CREATE` to the application runtime role
as a workaround.

## HA

Manifests include PodDisruptionBudget and HorizontalPodAutoscaler resources for gateway, edge, app-api, and admin-api. Replace the in-cluster Redis example with a managed Redis service for production.

The edge `PodDisruptionBudget` uses `maxUnavailable: 1` so at most one voluntary disruption is allowed at a time; with `replicas: 2` this keeps at least one pod serving during drains. For zero-capacity-loss rollouts, prefer a surge-style Deployment strategy (`maxSurge: 1, maxUnavailable: 0`).

The edge `HorizontalPodAutoscaler` scales on both CPU (`averageUtilization: 60`) and memory (`averageUtilization: 70`) Resource metrics and requires metrics-server. Custom/external metrics (per-pod QPS, p95 upstream-provider latency, in-flight streaming requests) should be added once a `prometheus-adapter` or KEDA scaler is installed; see the in-manifest TODO and `PERFORMANCE_SPEC.md` / `OBSERVABILITY_SPEC.md`.

## Resource and Shutdown Sizing

Edge `resources` follow Google SRE Book capacity-planning guidance: CPU `requests: 500m` / `limits: 1` (2:1, compressible) and memory `requests: 1Gi` / `limits: 1.5Gi` (1.5:1, kept close to 1:1 because memory is not compressible). The HPA CPU target was lowered from 70% to 60% to match the doubled `requests.cpu`.

`terminationGracePeriodSeconds: 130` on edge covers the maximum upstream AI provider request timeout of 120s plus a 10s buffer, so rolling deploys do not SIGTERM in-flight long-running provider requests. Keep this value `>=` the configured provider timeout whenever that timeout is raised; it stays below the AWS ALB deregistration default of 300s used as a cross-industry reference.

## Network Policy

`claw-router-network-policy.yaml` provides default deny, CoreDNS-only DNS,
PostgreSQL, Redis, and internal service rules. Provider HTTPS is owned by
`claw-router-egress-cilium-policy.yaml`, which allows only the declared provider
FQDNs and denies private, link-local, metadata, documentation, multicast, and
reserved DNS answers on port 443. A custom provider cannot be activated until
its reviewed hostname is added to that policy and the policy rollout succeeds.
Clusters without Cilium must supply and verify an equivalent DNS-aware policy;
the deleted Envoy example is not a supported fallback.

## Migration

Use the versioned Kubernetes Job before starting the release workload. For a
manual operator-controlled upgrade with the same dedicated migrator identity:

```bash
clawrouterctl upgrade --config-file /etc/sdkwork/clawrouter.toml
```

Do not rely on concurrent `ensure_installed` from multiple replicas during first rollout.
