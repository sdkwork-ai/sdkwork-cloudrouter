# SDKWork Claw Router — Production Runbook (Excerpt)

## Health checks

| Endpoint | Purpose | Expected |
| --- | --- | --- |
| `/healthz` | Liveness | `200`, `status: ok` |
| `/readyz` | Readiness | `200` when database ping succeeds; `503` with `status: not_ready` otherwise |

Edge all-in-one mode additionally aggregates upstream readiness via `edge_ready()`.

## Graceful shutdown

Production servers trap `SIGTERM`/`SIGINT`, stop accepting new connections, and drain in-flight HTTP requests before exit. Configure orchestrator `terminationGracePeriodSeconds` ≥ 60.

## Connection budget

Default Postgres pool size is 16 connections per service process. In distributed mode, budget:

`(gateway + admin-api + app-api) × max_connections ≤ PostgreSQL max_connections − headroom`

## Password login protection

App password login is rate-limited per client IP and account (10 attempts / 15 minutes). Clients receive HTTP `429` with a generic message.

## Admin API authorization

All admin routes require database `membership_kind = admin`, including trusted-subject signed requests.

## Supply chain

Release artifacts should publish SHA-256 checksums. Enable `security.checksumRequired` in `sdkwork.app.config.json` before customer-facing distribution.
