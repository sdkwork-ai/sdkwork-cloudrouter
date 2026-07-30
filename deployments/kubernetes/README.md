# SDKWork Claw Router — Kubernetes Deployment Example

This example targets a distributed **cloud** production deployment (`SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE=cloud`, `SDKWORK_CLAW_ROUTER_RUNTIME_TARGET=container`) with PostgreSQL and Redis managed outside the cluster.

## Prerequisites

- PostgreSQL reachable from the cluster
- Redis reachable from the cluster (required for cloud/server deployment profiles)
- Secrets mounted for database password, API key pepper, session signing secrets, trusted-subject secret, and Redis URL
- Ingress controller (for example NGINX) and TLS issuer when using `claw-router-ingress.yaml`

## Apply

```bash
kubectl apply -f deployments/kubernetes/claw-router-redis.yaml
kubectl apply -f deployments/kubernetes/claw-router-gateway.yaml
kubectl apply -f deployments/kubernetes/claw-router-app-api.yaml
kubectl apply -f deployments/kubernetes/claw-router-admin-api.yaml
kubectl apply -f deployments/kubernetes/claw-router-edge.yaml
kubectl apply -f deployments/kubernetes/claw-router-ingress.yaml
kubectl apply -f deployments/kubernetes/claw-router-migration-job.yaml
```

Run the one-shot database upgrade job before scaling write-heavy replicas:

```bash
kubectl wait --for=condition=complete job/sdkwork-clawrouter-db-upgrade --timeout=600s
```

Redis is **required** for distributed rate limiting when running more than one gateway or edge replica. Configure `SDKWORK_CLAW_REDIS_URL` in the `sdkwork-clawrouter-config` secret (for example `redis://sdkwork-clawrouter-redis:6379/0`).

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

`claw-router-network-policy.yaml` implements zero-trust segmentation: a default deny-all NetworkPolicy plus explicit per-component ingress rules. Egress is allowed only for DNS, Postgres, in-cluster Redis (including sentinel gossip on port 26379), internal service-to-service traffic, and HTTPS egress to upstream AI providers.

HTTPS egress for upstream providers (OpenAI, Anthropic, Google, Alibaba DashScope, Tencent Cloud) is pinned to a dedicated `egress-gateway` namespace via a `namespaceSelector` + `podSelector` `to` rule. Native Kubernetes `NetworkPolicy` cannot perform FQDN-based filtering, so operators must deploy an L7-aware policy engine (Istio, Cilium, or equivalent) in the `egress-gateway` namespace that enforces the documented FQDN allowlist. If an L7 egress gateway is not available, replace the `to` selector with `to.ipBlock` entries listing resolved provider CIDRs (weaker, requires continuous DNS-to-CIDR refresh). Leaving the rule without a `to` selector is forbidden because it would permit egress to any HTTPS endpoint.

## Migration

Prefer the Kubernetes Job in `claw-router-ingress.yaml` for first rollout. For manual upgrades:

```bash
clawrouterctl upgrade --config-file /etc/sdkwork/clawrouter.toml
```

Do not rely on concurrent `ensure_installed` from multiple replicas during first rollout.
