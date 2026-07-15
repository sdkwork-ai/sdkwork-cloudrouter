# SDKWork Claw Router — Production Runbook (Excerpt)

> Status: pre-launch operational target. This excerpt is not current-candidate
> production, HA, migration, recovery, or release approval evidence. Use the
> active production-readiness review for verified scope and blockers.

## Health checks

| Endpoint | Purpose | Expected |
| --- | --- | --- |
| `/healthz` | Liveness | `200`, `status: ok` |
| `/readyz` | Dependency readiness | `200` only when the current database `SELECT 1`, enabled settlement-schema subset, and configured Redis checks pass; `503` with `status: not_ready` otherwise. It is not proof of generic migration state, drift, or every application feature table. |

Edge all-in-one mode additionally aggregates upstream readiness via `edge_ready()`.

## Graceful shutdown

Production servers trap `SIGTERM`/`SIGINT`, stop accepting new connections, and drain in-flight HTTP requests before exit. Configure orchestrator `terminationGracePeriodSeconds` ≥ 60.

## Connection budget

Default Postgres pool size is 16 connections per service process. In distributed mode, budget:

`(gateway + admin-api + app-api) × max_connections ≤ PostgreSQL max_connections − headroom`

## Password login protection

App password login is rate-limited per client IP and account (10 attempts / 15 minutes). Clients receive HTTP `429` with a generic message.

## Admin API authorization

Admin membership is an admission prerequisite for administrative routes,
including trusted-subject signed requests. It is not, by itself, proof of
tenant or object authorization; `route_explain` remains an open P0
tenant/object-scope authorization issue.

## Supply chain

Release artifacts should publish SHA-256 checksums. Enable `security.checksumRequired` in `sdkwork.app.config.json` before customer-facing distribution.
