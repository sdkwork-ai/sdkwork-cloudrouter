# Claw Router Gateway IAM Database Module

Authoritative PostgreSQL lifecycle module for Claw Router API-key policy, risk, and account-group entitlement bindings. The module owns only the `iam_gateway_` prefix and shares the process-local Claw Router PostgreSQL pool.

The schema and baseline are generated from `docs/schema-registry/tables/iam-gateway.yaml` through `pnpm db:materialize:contract`. Run the root `pnpm db:validate` and `pnpm test:contract:database` gates after changes.
