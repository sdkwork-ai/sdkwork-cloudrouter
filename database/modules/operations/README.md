# Claw Router Operations Database Module

Authoritative PostgreSQL lifecycle module for Claw Router operational state, audit, alerts, jobs, metrics, gateway heartbeats, and notification delivery. The module owns only the `ops_` prefix and shares the process-local Claw Router PostgreSQL pool.

The schema and baseline are generated from `docs/schema-registry/tables/ops-runtime.yaml` through `pnpm db:materialize:contract`. Run the root `pnpm db:validate` and `pnpm test:contract:database` gates after changes.
