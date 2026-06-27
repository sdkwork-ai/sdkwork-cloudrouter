# crates/

Rust commerce **platform composition** crates for local/private deployments.

Domain capability services, SQLx repositories, and capability HTTP routers live in sibling T1 repositories (`../sdkwork-shop`, `../sdkwork-merchandise`, `../sdkwork-order`, etc.). Commerce consumes them via root `Cargo.toml [workspace.dependencies]` and applies IAM identity wrapping in `sdkwork-commerce-api-server`.

## Purpose

This directory contains the T0 composition layer that mirrors the Java SaaS app contract: composed `/app/v3/api/**` and `/backend/v3/api/**` commerce paths, operationIds, token semantics, context model, and the shared `commerce_*` database table catalog. Route implementations for shop, merchandise, order, and other capabilities are owned by sibling repos; commerce merges thin IAM wrappers with the composed gateway and service host.

## Owner

sdkwork-commerce repository maintainers.

## Allowed Content

- Platform contract and bootstrap crates (`sdkwork-commerce-contract-service`, `sdkwork-commerce-bootstrap-manifest`)
- Composed HTTP gateway (`sdkwork-commerce-api-server`) with IAM wrappers delegating to sibling router crates
- Shared storage catalog and migration runner (`sdkwork-commerce-storage-repository-sqlx`) re-exporting sibling repository stores where migrated
- Service host, RPC, database host, and Tauri host crates for local/private runtime
- Per-crate `Cargo.toml`, `src/`, `tests/`, and `README.md`

### Crate Inventory (commerce workspace members)

| Crate | Responsibility |
| --- | --- |
| `sdkwork-commerce-bootstrap-manifest` | Local/private host bootstrap entry contract |
| `sdkwork-commerce-contract-service` | Runtime context, account asset types, ledger direction, and amount validation |
| `sdkwork-commerce-api-server` | Composed route gateway; IAM wrappers over sibling capability routers |
| `sdkwork-commerce-database-host` | Commerce database host bootstrap |
| `sdkwork-commerce-service-host` | Local/private runtime composition, operation contracts, dispatch, idempotency, transaction, envelope standards, and RPC service manifests |
| `sdkwork-commerce-rpc-host` | RPC host bootstrap for commerce |
| `sdkwork-commerce-rpc` | gRPC service implementations and interceptors |
| `sdkwork-commerce-rpc-proto` | Generated protobuf contracts |
| `sdkwork-commerce-storage-repository-sqlx` | SQL table catalog, migrations, migration runner; re-exports sibling repository stores (shop, merchandise, order) |
| `sdkwork-commerce-tauri-host` | Tauri host adapter manifest and command bindings for local/private apps |

### Sibling capability ownership (not in this directory)

| Capability | Authoritative repository |
| --- | --- |
| shop | `../sdkwork-shop` |
| merchandise (catalog admin/app) | `../sdkwork-merchandise` |
| order | `../sdkwork-order` |
| payment | `../sdkwork-payment` |
| account | `../sdkwork-account` |
| membership | `../sdkwork-membership` |
| inventory | `../sdkwork-inventory` |
| promotion | `../sdkwork-promotion` |
| invoice | `../sdkwork-invoice` |
| catalog browse/open | `../sdkwork-catalog` |

See `docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md` for migration status.

## Forbidden Content

- Local duplicates of sibling capability service or repository crates
- App-specific product UI logic (belongs in `apps/`)
- Generated SDK output (belongs in `sdks/`)
- Secrets, credentials, or runtime state
- Forbidden crate suffixes: `-product`, `-runtime`, `-backend`, `-core`, `-common`, `-manager`

## Related Specs

- `../sdkwork-specs/RUST_CODE_SPEC.md`
- `../sdkwork-specs/NAMING_SPEC.md`
- `../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

```bash
cargo fmt --all --check
cargo test --workspace
cargo clippy --workspace --tests -- -D warnings
```

## RPC Service Manifests

RPC service manifests are defined in `sdkwork-commerce-service-host::rpc`. They map gRPC service names and methods to their HTTP operationId equivalents for cross-language direct-call surfaces.

## Bootstrap Contract

`sdkwork-commerce-bootstrap-manifest` is the local/private host entry contract for this slice. It does not run infrastructure side effects and does not contain domain business logic. It provides:

- `commerce_local_private_bootstrap_manifest()`: composes runtime, storage, HTTP, and Tauri manifests.
- `CommerceLocalPrivateBootstrapManifest::validate()`: fails fast when cross-layer contracts drift.
- `CommerceLocalPrivateBootstrapManifest::preflight()`: validates the manifest and returns host startup counts and stage metadata.
- `run_commerce_local_private_bootstrap_preflight()`: convenience entrypoint for host startup checks.

The standard host startup stage order is:

1. `validate-bootstrap-contracts`
2. `initialize-commerce-storage`
3. `initialize-commerce-runtime`
4. `bind-commerce-http-routes`
5. `bind-commerce-tauri-commands`
