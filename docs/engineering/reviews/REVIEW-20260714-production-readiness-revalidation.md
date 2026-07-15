# REVIEW-20260714 Production Readiness Revalidation

Status: active
Review date: 2026-07-14
Application: sdkwork-clawrouter
Owner: sdkwork-platform
Requirement: REQ-2026-0001
Decision: ADR-20260710
Specs: DOCUMENTATION_SPEC.md, QUALITY_GATE_SPEC.md, SECURITY_SPEC.md,
DATABASE_SPEC.md, API_SPEC.md, PAGINATION_SPEC.md

## Scope And Evidence Boundary

This review refreshes factual release-readiness evidence for the current
worktree. It records failed checks, missing evidence, and source observations;
it does not approve a release, a security design, an API compatibility change,
a database migration, or a production deployment.

The worktree is dirty and the PostgreSQL integration URL is not configured in
this environment. Results below are release blockers, not a substitute for the
clean-candidate evidence bundle required by REQ-2026-0001.

This iteration is deliberately limited to the relay/control-plane core. Chat
product persistence and UI work remain out of scope; their existing findings
stay open and do not weaken the release gate for the rest of the application.

## Outcome

The application is not eligible for production deployment, high-availability
claims, commercial availability claims, or PostgreSQL/SQLite parity claims.
No finding in this review is closed by documentation, generated output, a
skipped suite, or a partial local check.

## Directly Observed Release Blockers

| Severity | Finding | Evidence observed on 2026-07-14 | Required closure evidence |
| --- | --- | --- | --- |
| P0 | Tenant signing-key rotation is only an in-memory mitigation. | The immediate in-memory KID replacement regression has been repaired, but there is still no durable IAM key store, cross-replica rotation lease, persisted grace/revocation state, or restart-safe recovery proof. | Security/IAM-approved durable key-store and KID lifecycle, explicit grace/revocation behavior, production fallback policy, rotation/restart/concurrency tests, and clean-candidate evidence. |
| P0 | Provider egress remains incomplete. | Production passthrough and adapter transports now reject plaintext HTTP and validate the target before credential forwarding and connector construction. They still lack a controlled resolver, DNS rebinding defense, resolved-IP pinning, persistent host allowlists, redirect policy, and Kubernetes egress enforcement. | Security/SRE approval of a shared fail-closed policy, persistence-time and connect-time validation, resolver pinning, redirect policy, and private/metadata/DNS-rebinding negative tests. |
| P0 | Direct authenticated Adapter streaming is not a commercial protocol. | The unified invocation stream path now forwards frames incrementally with bounded downstream demand and a total timeout. The separate direct Adapter passthrough only transfers a raw body after headers; the official Adapter trait has no stream outcome, terminal usage, cancellation, idempotency, or controlled header contract. Successful streams can therefore bypass financial finalization. | Human-approved public behavior change to fail closed for direct Adapter stream routes until a formal Adapter stream contract, one terminal lifecycle, usage reconciliation, cancellation/timeouts, idempotency, and measured concurrency/RSS evidence exist. |
| P0 | Public relay scope exceeds the approved inference/media boundary. | Broad `/v1`, provider-native, and wildcard fallback routes can expose organization, project, key, certificate, billing, audit, or other control-plane behavior outside the intended relay boundary. | Human approval of an exact `(provider, method, standardizedPath)` inference/media allowlist, then synchronized authored contracts, classifiers, route tables, taxonomy/seeds, SDK generation, and negative route tests. |
| P0 | Financial ingestion is unbounded and non-atomic for multi-line Adapter usage. | The shared accounting command now rejects DDL-width text before either database writes it, rejects decimal text over the existing SQLite `NUMERIC(38, 12)` 40-byte input ceiling before parsing, and validates a JSON-object snapshot without materializing a second JSON DOM. Retry adapters cap a claim at `200`, validate SQLite poison envelopes before leasing, and report stale lease mutations rather than false success. `pricing_snapshot`, retry envelopes, and usage-line collections still have no single hard byte/shape/count boundary. PostgreSQL and SQLite record one usage plus trace transactionally, but Adapter lines are persisted one by one and pending facts may be overwritten by a different payload. A count cap cannot protect memory when one item is unbounded. | Human-reviewed finance/privacy contract, paired PostgreSQL/SQLite migration, bounded/allowlisted snapshot projection, canonical-payload conflict policy, all-lines atomic recorder or outbox, queue capacity/backpressure/retention, and two-engine contention/recovery evidence. |
| P0 | `route_explain` can disclose another tenant's routing topology. | Admin middleware verifies that a caller is an admin in its own context, while the handler performs global API-key/channel-group lookups and only compares the two requested objects with each other. A caller can probe another tenant's IDs and receive provider, policy, credential-rotation, and timeout metadata. | Human-reviewed authorization tightening using typed request subject and tenant/organization-scoped lookup, plus two-tenant negative tests and redaction tests. |
| P0 | Public HTTP contract validation fails. | `node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .` reports ten violations: chat turn completion, a recharge cancellation route that is not mounted by its owning Order dependency, and synchronous `route_explain` diagnostics are falsely modeled as creates. The backend SDK also retains a stale `routeExplain.create` projection that collides with the route manifest's `routeExplain.explain`. | API-owner decision on real command/diagnostic semantics and federation ownership, authored-contract correction, regeneration of all derived SDK/route artifacts, and passing API envelope/operation checks. Chat semantics remain outside this relay-focused iteration and continue to keep the global gate red. |
| P0 | App-chat release coverage remains incomplete beyond the narrow HTTP suite. | `cargo test -p sdkwork-clawrouter-router-service --test app_chat_api` now passes `9/9` after three stale assertions were aligned to existing behavior/OpenAPI: create conversation/turn return `201`, and the injected subject is `100001/0/30`. The additional safe-input case covers canonical alias/duplicate rejection and unavailable-store `503` redaction. This does not validate installed schema, API field-contract/SDK parity, server pagination, concurrency, or production behavior. | Close the persistence/schema, field-contract/SDK, pagination, and concurrency gates with their owning evidence; the passing narrow suite alone cannot close app-chat readiness. |
| P1 | Backend `route_explain` has multiple route declarations. | `node ../sdkwork-specs/tools/check-route-path-collisions.mjs --root .` exited `1` for duplicate `POST /backend/v3/api/ai/route_explain` sources. | A single reviewed route owner and operation contract, regenerated manifests/SDKs, correct permission/tenant scope, and passing collision/composition checks. |
| P0 | Fresh chat persistence is incomplete. | `cargo test -p sdkwork-clawrouter-router-service --test sqlite_app_chat_store sqlite_app_chat_store_turn_lifecycle_matches_installed_product_schema` exited `101`: the canonical migrated SQLite database returned `no such table: ai_chat_conversation`. No `ai_chat_*` or `ai_runtime_usage_link` declaration was found under authored baseline/migrations or generated schema inputs, while both app-chat stores directly use those tables. | Reviewed paired PostgreSQL/SQLite ownership and DDL/migrations, contract materialization, clean-install and upgrade/rollback tests, and runtime chat smoke evidence on both engines. |
| P0 | Readiness is not a complete schema gate. | The production runbook previously described `/readyz` as a database-ping check. The current implementation combines `SELECT 1`, an optional usage-settlement schema subset, and optional Redis health. It does not verify generic migration state, drift, or required app-chat tables. | Define and implement the reviewed readiness contract, separate schema/migration gates where appropriate, and prove that every enabled route's required schema is verified before traffic is admitted. |
| P1 | Chat sequence assignment has a concurrent write race. | Both app-chat stores calculate turn/item/message and context-snapshot sequence values with `SELECT COUNT(*) + 1`. The PostgreSQL path has no atomic scoped counter or locking protocol around that read. | Database-owner decision, atomic scoped allocation or a constraint-and-retry design, paired PostgreSQL/SQLite implementation, and contention/failure-injection parity tests. |
| P0 | PostgreSQL integration evidence is absent in this environment. | `SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL` was absent. `pnpm test:postgres:required` exited `2` before running CI-grade PostgreSQL transaction verification. | An isolated PostgreSQL URL or digest-pinned test service, clean-install/upgrade/restore/transaction/concurrency evidence, and a passing required suite from the release candidate. |
| P1 | Settlement batch count is bounded but payload capacity is not. | The worker clamps a batch to `1..=200`, which prevents an unbounded row count. It still fetches and copies unbounded JSON/text snapshots, so a valid count can cause large memory and storage amplification. No Finance/SRE-approved byte budget, backlog policy, queue retention limit, or overload evidence is available. | Finance/SRE-approved per-item and queue budgets, admission/backpressure, instrumentation/alerts, and load/recovery evidence for both database engines. |
| P0 | Runtime IDs are not safe for a clustered deployment. | Cloud Gateway, app-api, and backend-api now validate `SDKWORK_CLAW_SNOWFLAKE_NODE_ID` before server/container database bootstrap; focused missing/invalid-ID tests prove no runtime database config is created on that failure path. This prevents a shared fallback but does not allocate or fence IDs. The current two-replica Kubernetes Deployments provide no node ID, so they fail startup; a single static value would be unsafe. Upstream `sdkwork-id` also resets its timestamp and sequence after a tolerated clock rollback, allowing `t`, `t-50ms`, `t` to duplicate an ID; sequence exhaustion is a direct error rather than a managed capacity policy. | Human-approved StatefulSet ordinal or lease/fencing allocation design, upstream logical-clock repair, duplicate-node/rollback/sequence-exhaustion/multi-process tests, and multi-replica PostgreSQL/Redis evidence. |
| P0 | Redis accounting-retry recovery is unproven. | Redis Streams can hold accounting retry stream, schedule, payload, deduplication, and DLQ records. No Finance/SRE-approved byte/retention, persistence, backup, restore, reconciliation, requeue, or destructive-operation policy exists. The corrected runbooks explicitly prohibit treating those records as disposable cache state. | Finance/SRE-approved queue data classification and recovery design, Redis HA/persistence configuration, restore/reconciliation drills, operator controls, and clean-candidate evidence. |
| P1 | Root README encoding prevents governed correction. | `README.md` contains an invalid UTF-8 byte sequence near byte `69530`, preventing reliable standards-compliant editing and validation; obsolete wording still calls `pnpm verify` a full commercial gate. This review, PRD, TECH Canon, and runbooks supersede that claim, but the root README itself is not yet clean documentation. | Repair the root README encoding in an owned, reviewed documentation change, then replace the obsolete release-gate language and run documentation checks. |
| P1 | The Rust candidate is not warning-free. | The focused SQLite installed-schema test compiled `sdkwork-clawrouter-router-service` with `192` warnings. This does not meet the warning-free candidate required by REQ-2026-0001. | Remove or integrate dead code/imports by owning module and pass the required warning-denying validation from a clean candidate. |

## Evidence Commands

The following commands were run during revalidation. The focused accounting
checks ran after the command-boundary changes described above; the other
results retain their stated evidence boundaries:

```text
cargo test -p sdkwork-claw-http --lib test_key_rotation
cargo test -p sdkwork-clawrouter-router-service runtime_id::tests --lib
cargo check -p sdkwork-clawrouter-cloud-gateway --lib
cargo test -p sdkwork-clawrouter-cloud-gateway --lib invocation_dispatcher::tests
cargo test -p sdkwork-clawrouter-cloud-gateway --lib runtime::tests::invocation_response_budget_rejects_zero_runtime_config -- --exact
cargo test -p sdkwork-clawrouter-cloud-gateway passthrough::tests::provider_passthrough_runtime_enforces_the_injected_request_body_limit --lib -- --exact
cargo test -p sdkwork-clawrouter-cloud-gateway runtime::tests::runtime_toml_body_limit_is_resolved_once_for_invocation_and_passthrough --lib -- --exact
cargo test -p sdkwork-clawrouter-router-service --test sqlite_gateway_usage_recorder
cargo test -p sdkwork-clawrouter-router-service infrastructure::gateway_accounting_retry_queue::tests --lib
cargo test -p sdkwork-clawrouter-router-service --test invocation_pricing_settlement
cargo test -p sdkwork-clawrouter-router-service --test invocation_usage_recording
cargo test -p sdkwork-routes-clawrouter-app-api router_from_env_rejects_missing_or_invalid_server_snowflake_node_id_before_database_bootstrap --lib
cargo test -p sdkwork-routes-clawrouter-backend-api router_from_env_rejects_missing_or_invalid_server_snowflake_node_id_before_database_bootstrap --lib
rustfmt --edition 2021 --check services/sdkwork-clawrouter-router-service/src/ports/gateway_usage_recorder.rs services/sdkwork-clawrouter-router-service/tests/sqlite_gateway_usage_recorder.rs
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-route-path-collisions.mjs --root .
pnpm test:postgres:required
cargo test -p sdkwork-clawrouter-router-service --test app_chat_api
cargo test -p sdkwork-clawrouter-router-service --test sqlite_app_chat_store sqlite_app_chat_store_turn_lifecycle_matches_installed_product_schema
rg -n -i "ai_chat_|ai_runtime_usage_link" database/ddl/baseline database/migrations generated/schema/sqlite generated/schema/postgres
rg -n -C 8 "SELECT COUNT(*) + 1 AS next_value" services/sdkwork-clawrouter-router-service/src/infrastructure/sql/{postgres,sqlite}/app_chat_store.rs
rg -n -C 4 "readyz|SELECT 1|usage settlement|Redis|schema" services/sdkwork-clawrouter-router-service/src/infrastructure/sql/pool.rs
```

The accounting command validation test and the complete SQLite gateway-usage
recorder suite passed `12/12`; the focused retry-queue suite passed `8/8`; and
the passthrough injected-limit and TOML-resolution unit tests each passed
`1/1`. The pricing/settlement and usage-recording focused integration suites
each passed `10/10`. This proves
only the named local boundaries: it is not PostgreSQL transaction, concurrency,
recovery, queue-capacity, or parity evidence. `SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL`
remains absent. The API operation-pattern check, route-collision check, and
required PostgreSQL check failed as described above. The app/backend runtime-ID
negative tests passed individually; the broader app `router_from_env_` filter
still exposes an existing desktop schema-lifecycle failure, followed by an
environment-mutex poisoning artifact, so it is not a clean bootstrap-suite
result. The cloud-gateway library compiled, but its dependency graph and router
service emitted existing warning debt. The schema search produced no
`ai_chat_*` or `ai_runtime_usage_link` declaration in the baseline, migration,
or generated schema inputs. The count queries exist in both database
implementations.

## Closure Rules

- Do not mark a row closed until its owning security, API, data, or runtime
  change is approved where required and the listed evidence passes from a clean
  candidate commit.
- Do not hand-edit generated SDKs, OpenAPI derivatives, route manifests, or
  schema materializations to satisfy a check.
- The next review must record the exact source revision, command output, test
  environment, and any approved exception. No exception may claim production
  readiness, HA readiness, or persistence parity without the required evidence.

## Related Records

- [REQ-2026-0001 Commercial Production Readiness](../../product/requirements/REQ-2026-0001-commercial-production-readiness.md)
- [ADR-20260710 Commercial Gateway Safety Boundaries](../../architecture/decisions/ADR-20260710-commercial-gateway-safety-boundaries.md)
- [Production-readiness implementation plan](../plans/PLAN-2026-0001-commercial-production-readiness.md)
