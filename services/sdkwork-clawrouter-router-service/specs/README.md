# SDKWork Claw Product Component Specs

This directory is the local standards index for `sdkwork-clawrouter-router-service`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-clawrouter-router-service` |
| Type | `rust-crate` |
| Root | `sdkwork-clawrouter/services/sdkwork-clawrouter-router-service` |
| Domain | `platform` |
| Capability | `router` |
| Languages | `rust` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers should integrate through public exports, runtime entrypoints, SDK clients, or adapters declared in the manifest.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [COMPONENT_SPEC.md](../../../../sdkwork-specs/COMPONENT_SPEC.md) | Local component specs directory and manifest rules. |
| [CONFIG_SPEC.md](../../../../sdkwork-specs/CONFIG_SPEC.md) | Runtime configuration, environment, SDK bootstrap, and feature flag rules. |
| [DEPLOYMENT_SPEC.md](../../../../sdkwork-specs/DEPLOYMENT_SPEC.md) | SaaS/private/local runtime parity and deployment rules. |
| [DOCUMENTATION_SPEC.md](../../../../sdkwork-specs/DOCUMENTATION_SPEC.md) | Module README, examples, ADR, changelog, and runbook rules. |
| [DOMAIN_SPEC.md](../../../../sdkwork-specs/DOMAIN_SPEC.md) | Canonical domain ownership and naming. |
| [GOVERNANCE_SPEC.md](../../../../sdkwork-specs/GOVERNANCE_SPEC.md) | Standard ownership, exception, compatibility, and migration rules. |
| [MODULE_SPEC.md](../../../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract and dependency direction. |
| [OBSERVABILITY_SPEC.md](../../../../sdkwork-specs/OBSERVABILITY_SPEC.md) | Log, metric, trace, audit, and diagnostic rules. |
| [PERFORMANCE_SPEC.md](../../../../sdkwork-specs/PERFORMANCE_SPEC.md) | Latency, pagination, bundle, scalability, and retry budget rules. |
| [README.md](../../../../sdkwork-specs/README.md) | SDKWork root standards entrypoint. |
| [TEST_SPEC.md](../../../../sdkwork-specs/TEST_SPEC.md) | Contract, frontend, SDK, security, parity, and documentation verification rules. |

## Public Exports

- Public exports are not declared in the package manifest.

## SDK Clients

- No generated SDK client class is declared at this component boundary.

## Local Extension Specs

- No local extension specs are declared yet.

## Runtime ID Lease

Server and container runtimes allocate one process-wide Snowflake generator through
`sdkwork-database-id` and the shared PostgreSQL `sdkwork_node_registry` authority. The allocator
uses expiring heartbeats, random ownership tokens, monotonic lease versions, and generator fencing.
Runtime writes fail closed while no healthy lease is installed, and readiness remains false until
lease recovery succeeds.

Prometheus exports `clawrouter_runtime_id_generator_ready` and
`clawrouter_runtime_id_failures_total{operation,reason}` with bounded operational labels. Raw
database errors, lease tokens, hostnames, Pod UIDs, and request context are not metric labels.

`SDKWORK_NODE_HOSTNAME` and `SDKWORK_NODE_INSTANCE_ID` provide diagnostic instance identity.
`SDKWORK_CLAW_SNOWFLAKE_NODE_ID` is a single-process desktop development override only and is
rejected for server, Docker, and Kubernetes deployments.

Commercial production remains blocked by the canonical allocator's runtime registry DDL. The
`sdkwork-database` owner must separate migrator-owned provisioning from a runtime allocation path
that needs schema `USAGE` and table `SELECT`/`INSERT`/`UPDATE` only; granting schema `CREATE` to the
Claw Router runtime role is not an accepted workaround.

## Verification

- `cargo test -p sdkwork-clawrouter-router-service runtime_id::tests --lib`
- `python -m unittest tests.test_database_runtime_id_standard`
