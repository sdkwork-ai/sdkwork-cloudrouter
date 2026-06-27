# SDKWork Claw Router — Kubernetes Deployment Example

This example targets a distributed **cloud** deployment (`SDKWORK_CLAW_DEPLOYMENT_PROFILE=cloud`, `SDKWORK_CLAW_RUNTIME_TARGET=container`) with PostgreSQL and Redis managed outside the cluster.

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
SDKWORK_CLAW_DEPLOYMENT_PROFILE=cloud
SDKWORK_CLAW_RUNTIME_TARGET=container
```

`SDKWORK_CLAW_DEPLOYMENT_MODE=cloud` is retired and rejected at startup.

## Probes

- **Startup**: `GET /healthz` — allows slow database/bootstrap warm-up
- **Liveness**: `GET /healthz` — process is running
- **Readiness**: `GET /readyz` — returns `503` until database, Redis (when required), and settlement prerequisites are healthy

## HA

Manifests include PodDisruptionBudget and HorizontalPodAutoscaler resources for gateway, edge, app-api, and admin-api. Replace the in-cluster Redis example with a managed Redis service for production.

## Migration

Prefer the Kubernetes Job in `claw-router-ingress.yaml` for first rollout. For manual upgrades:

```bash
clawrouterctl upgrade --config-file /etc/sdkwork/clawrouter.toml
```

Do not rely on concurrent `ensure_installed` from multiple replicas during first rollout.
