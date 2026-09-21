# SDKWork Cloud Router — Production Runbook (Excerpt)

> Status: pre-launch operational target. This excerpt is not current-candidate
> production, HA, migration, recovery, or release approval evidence. Use the
> active production-readiness review for verified scope and blockers.

## Health checks

| Endpoint | Purpose | Expected |
| --- | --- | --- |
| `/healthz` | Liveness | `200`, `status: ok` |
| `/readyz` | Dependency readiness | `200` only when every table declared by the embedded database manifests is materialized, lifecycle module/version state is installed, critical Chat columns and scoped indexes exist, database connectivity passes, and the runtime ID lease is healthy; `503` with `status: not_ready` otherwise (accounting-retry health included where the surface mounts it). |

Edge all-in-one mode additionally aggregates upstream readiness via `edge_ready()`.

## Graceful shutdown

Production servers trap `SIGTERM`/`SIGINT`, stop accepting new connections, and drain in-flight HTTP requests before exit. Configure orchestrator `terminationGracePeriodSeconds` ≥ 60.

## Connection budget

Default Postgres pool size is 16 connections per service process. In distributed mode, budget:

`(gateway + admin-api + app-api) × max_connections ≤ PostgreSQL max_connections − headroom`

## Password login protection

App password login rate limiting is owned by the IAM product, not by Cloud
Router. The IAM app API enforces per-identity windows with a
PostgreSQL-backed, advisory-lock serialized counter (`iam_ephemeral_artifact`),
so the limit is distributed-safe across IAM replicas. Limits are configured in
the IAM runtime (`rate_limit_max_requests` / `rate_limit_window_seconds`;
defaults are 10 attempts per 15 minutes per client IP and account bucket).
Blocked clients receive HTTP `429` with a generic `iam_rate_limited` message.
If the IAM ephemeral store is unavailable, login fails closed with HTTP `503`
(`iam_ephemeral_unavailable`).

## Admin API authorization

Admin membership is an admission prerequisite for administrative routes,
including trusted-subject signed requests. It is not, by itself, proof of
tenant or object authorization; `route_explain` is closed in the worktree
(see REVIEW-20260714).

## Supply chain

Release artifacts should publish SHA-256 checksums. Enable `security.checksumRequired` in `sdkwork.app.config.json` before customer-facing distribution.
