# SDKWork Cloud Router — Kubernetes Deployment Example

This example deploys the **standalone** container image published by the release
pipeline (`ghcr.io/sdkwork-cloudrouter/cloudrouter:<version>`,
`deploymentProfile=standalone`, `runtimeTarget=container`). The image embeds one
all-in-one `cloudrouter` binary that serves the portal, gateway, app API, and
backend API through a single application public ingress on port **3900**
(`SDKWORK_CLOUDROUTER_APPLICATION_PUBLIC_INGRESS_BIND=0.0.0.0:3900`), plus the
`cloudrouterctl` operator binary used by the migration Job.

The container `ENTRYPOINT` runs `cloudrouterctl ensure` and
`cloudrouterctl refresh-catalog --force` before exec'ing `cloudrouter`, so the
Deployment must not override `command`/`args`. PostgreSQL and Redis are managed
outside the cluster.

## Prerequisites

- PostgreSQL reachable from the cluster
- Managed Redis reachable from the cluster (required for the standalone/server
  deployment profiles; distributed rate limiting and settlement depend on it)
- Cilium installed with `CiliumNetworkPolicy` and DNS proxy support enabled
- `sdkwork-cloudrouter-redis-auth` provisioned by an external secret controller;
  never apply the placeholder Redis credentials to a production namespace
- `sdkwork-cloudrouter-config` mounted with `config.toml` (at
  `/etc/sdkwork/router/config.toml`), the runtime database identity, and the
  separately privileged `database-migrator-url`, API key pepper, session
  signing material, trusted-subject secret, and Redis URL. See the canonical
  standalone container runtime env in `docker-compose.yml`.
- Ingress controller (for example NGINX) and TLS issuer when using
  `cloud-router-ingress.yaml`

## Apply

```bash
kubectl apply -f deployments/kubernetes/cloud-router-network-policy.yaml
kubectl apply -f deployments/kubernetes/cloud-router-egress-cilium-policy.yaml
kubectl apply -f deployments/kubernetes/cloud-router-migration-job.yaml
kubectl wait --for=condition=complete job/sdkwork-cloudrouter-db-upgrade-0-3-0 --timeout=600s
kubectl apply -f deployments/kubernetes/cloud-router-standalone.yaml
kubectl apply -f deployments/kubernetes/cloud-router-ingress.yaml
```

The migration Job name is release-versioned. Every release must update the Job
name, image version, and wait target together. A completed Job from an older
release is not migration evidence for a newer image. The Job uses a dedicated
migrator credential; runtime workloads must not receive schema-owner
privileges.

Redis is **required** when running more than one standalone replica.
`SDKWORK_CLOUDROUTER_REDIS_URL` / `SDKWORK_CLOUDROUTER_REDIS_*` are read from the
`sdkwork-cloudrouter-redis-auth` Secret and the config Secret. Production uses a
managed TLS endpoint; `cloud-router-redis.yaml` is a non-production integration
fixture only.

The standalone Deployment serves everything on port **3900**: portal traffic,
OpenAI-compatible invocation (`/v1/*`), and the app/backend API surfaces.

## Runtime env

Use canonical deployment metadata (the retired
`SDKWORK_CLOUDROUTER_ROUTER_*` aliases are ignored at startup):

```text
SDKWORK_CLOUDROUTER_DEPLOYMENT_PROFILE=standalone
SDKWORK_CLOUDROUTER_RUNTIME_TARGET=container
SDKWORK_CLOUDROUTER_APPLICATION_PUBLIC_INGRESS_BIND=0.0.0.0:3900
SDKWORK_CLOUDROUTER_SERVER_BIND=0.0.0.0:3900
```

`SDKWORK_CLOUDROUTER_DEPLOYMENT_MODE=cloud` is retired and rejected at startup.

## Probes

- **Startup**: `GET /healthz` — allows slow database/bootstrap warm-up
- **Liveness**: `GET /healthz` — process is running; `timeoutSeconds=3` so a wedged process is restarted quickly
- **Readiness**: `GET /readyz` — returns `503` until database, Redis, and settlement prerequisites are healthy; `timeoutSeconds=5` to tolerate brief DB/Redis network partitions without flipping the pod to not-ready. Readiness must only depend on internal dependencies (PostgreSQL, Redis), never on upstream AI provider reachability.

## Snowflake Node Leases

Every server replica acquires a fenced Snowflake node lease from the shared
PostgreSQL `sdkwork_node_registry` authority during startup. Startup fails
closed when PostgreSQL is unavailable or a lease cannot be acquired. The
generator is fenced immediately when lease ownership is lost or its last
successful heartbeat expires; `/readyz` then returns `503` while a
bounded-backoff recovery worker acquires a new lease.

The metrics endpoint exports `cloudrouter_runtime_id_generator_ready` and
`cloudrouter_runtime_id_failures_total{operation,reason}` for this lifecycle.
Scrape them per Pod; the labels are bounded operational codes and never contain
Pod identity, lease tokens, or raw database errors. Production alert rules and
their failure-series tests remain part of the release evidence gate and must be
reviewed before rollout.

The manifest injects `SDKWORK_NODE_HOSTNAME` from the Pod name and
`SDKWORK_NODE_INSTANCE_ID` from the Pod UID for lease diagnostics. Do not set
`SDKWORK_CLOUDROUTER_SNOWFLAKE_NODE_ID` on Kubernetes workloads and never share
a static Snowflake node ID across replicas. Pod identity improves diagnostics
but does not replace the PostgreSQL lease, random ownership token, and monotonic
fencing version.

Production least-privilege rollout is still blocked by the current platform
allocator's runtime DDL behavior. `sdkwork-database` must provide a
migrator-owned registry provisioning step and a runtime allocation path that
requires only `USAGE` on the schema plus `SELECT`, `INSERT`, and `UPDATE` on
`sdkwork_node_registry`. Do not grant schema `CREATE` to the application runtime
role as a workaround.

## HA

The standalone Deployment includes PodDisruptionBudget (`maxUnavailable: 1`)
and HorizontalPodAutoscaler (CPU `60%` + memory `70%`, requires metrics-server)
resources. The surge-style rolling strategy (`maxSurge: 1, maxUnavailable: 0`)
keeps capacity at the full replica count during deploys. Custom/external
metrics (per-pod QPS, p95 upstream-provider latency, in-flight streaming
requests) should be added once a `prometheus-adapter` or KEDA scaler is
installed.

## Resource and Shutdown Sizing

Standalone `resources` follow Google SRE Book capacity-planning guidance: CPU
`requests: 500m` / `limits: 1` (2:1, compressible) and memory `requests: 1Gi` /
`limits: 1.5Gi` (1.5:1, kept close to 1:1 because memory is not compressible).
The HPA CPU target is `60%` to match the doubled `requests.cpu`.

`terminationGracePeriodSeconds: 130` covers the maximum upstream AI provider
request timeout of 120s plus a 10s buffer, so rolling deploys do not SIGTERM
in-flight long-running provider requests. Keep this value `>=` the configured
provider timeout whenever that timeout is raised.

## Network Policy

`cloud-router-network-policy.yaml` provides default deny, CoreDNS-only DNS,
PostgreSQL, Redis, and the standalone ingress rule on port 3900. Provider HTTPS
is owned by `cloud-router-egress-cilium-policy.yaml`, which allows only the
declared provider FQDNs and denies private, link-local, metadata,
documentation, multicast, and reserved DNS answers on port 443. A custom
provider cannot be activated until its reviewed hostname is added to that
policy and the policy rollout succeeds. Clusters without Cilium must supply and
verify an equivalent DNS-aware policy.

## Migration

Use the versioned Kubernetes Job before starting the release workload. For a
manual operator-controlled upgrade with the same dedicated migrator identity:

```bash
cloudrouterctl upgrade --config-file /etc/sdkwork/router/config.toml
```

Do not rely on concurrent `ensure_installed` from multiple replicas during
first rollout.
