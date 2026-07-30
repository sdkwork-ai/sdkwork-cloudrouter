# REVIEW-20260714 Production Readiness Revalidation

Status: active
Review date: 2026-07-30
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

This iteration covers the relay/control-plane core plus the narrow Chat
PostgreSQL persistence authority. Chat UI, generated-SDK parity, high-volume
pagination, and production-like PostgreSQL behavior remain separate release
evidence boundaries.

## Outcome

The application is not eligible for production deployment, high-availability
claims, commercial availability claims, or client-local SQLite claims.
No finding in this review is closed by documentation, generated output, a
skipped suite, or a partial local check.

## Directly Observed Release Blockers

| Severity | Finding | Evidence observed on 2026-07-14 | Required closure evidence |
| --- | --- | --- | --- |
| P0 partially closed | Tenant signing-key rotation lifecycle remains incomplete. | IAM already owns PostgreSQL persistence in `iam_tenant_signing_key`, primary-key provisioning, and `kid` lookup through `TenantSigningKeyStore`. Claw HTTP's unused in-memory lifecycle is now test-only. IAM still lacks a proven cross-replica rotation lease, persisted grace/revocation lifecycle, encrypted backup/restore procedure, and restart/concurrency evidence. | Security/IAM-approved rotation command and lease, explicit persisted grace/revocation behavior, backup/restore policy, rotation/restart/concurrency tests, and clean-candidate evidence. |
| P0 | Provider egress remains incomplete. | Production passthrough and adapter transports now reject plaintext HTTP and validate the target before credential forwarding and connector construction. They still lack a controlled resolver, DNS rebinding defense, resolved-IP pinning, persistent host allowlists, redirect policy, and Kubernetes egress enforcement. | Security/SRE approval of a shared fail-closed policy, persistence-time and connect-time validation, resolver pinning, redirect policy, and private/metadata/DNS-rebinding negative tests. |
| Mitigation closed in worktree; protocol remains P0 | Direct authenticated Adapter streaming is not yet a commercial protocol. | Adapter `SseStream` and `ByteStream` routes that require settlement now fail before provider I/O; authenticated passthrough returns `501 provider_adapter_streaming_accounting_unavailable` for both shapes because it has no provable free-route contract. Dispatch and fallback candidate resolution apply the same exact-shape guard, leave explicit free routes eligible, and do not misclassify `FileUpload`. The official Adapter trait still has no stream outcome, terminal usage, cancellation, idempotency, or controlled header contract, so paid Adapter streaming remains disabled. | Repeat the dispatch, fallback, passthrough, and real `/v1/responses` settlement tests from a clean candidate. A formal Adapter stream contract, one terminal lifecycle, usage reconciliation, cancellation/timeouts, idempotency, and measured concurrency/RSS evidence remain required before enabling paid Adapter streams. |
| Closed in worktree | Provider-native relay scope was broader than the public contract. | Provider-native wildcard mounts now derive provider/path-template/method admission from the embedded authored OpenAPI before authentication or forwarding. Direct and provider-alias standard routes pass; unknown Google management paths, undeclared ElevenLabs paths, OpenAI model deletion, and wrong methods fail closed with focused unit and gateway integration evidence. | Repeat the positive/negative provider boundary tests and API/SDK contract checks from the clean candidate. |
| P0 partially closed | Financial ingestion has an atomic SQL batch but lacks bounded durable recovery. | Existing text/decimal bounds remain, Adapter usage rejects counts above `64`, and PostgreSQL/SQLite recorders now prevalidate and persist all lines in one transaction. Settlement notification and retry wrappers preserve the batch boundary; a primary batch failure fails closed instead of enqueueing partial single-line retries. `pricing_snapshot`, retry envelopes, queue/DLQ bytes, durable batch outbox, and failure-injection evidence remain open. | Human-reviewed finance/privacy contract, bounded/allowlisted snapshot projection, canonical-payload conflict policy, durable atomic batch outbox, queue capacity/backpressure/retention, and two-engine contention/recovery evidence. |
| Closed in worktree | `route_explain` tenant topology disclosure. | The handler now requires `RequiredAdminSqlScopedSubject`, scopes API-key and channel-group objects before selection, makes cross-tenant and absent objects indistinguishable with `404`, and removes credential ID/rotation fields. Focused missing-subject, two-tenant, and redaction tests pass `3/3`. | Re-run the focused security suite and broader backend API suite from the clean candidate; security review remains required before release cutover. |
| Closed in worktree | Public HTTP contract validation. | OpenAPI generator tests pass `62/62`; operation-pattern, response-envelope, route-collision, and generated-SDK guardian checks pass. | Repeat generation freshness, all SDK builds, consumer imports, and API checks from the clean candidate. |
| P0 partially closed | App-chat release coverage remains incomplete beyond HTTP and static persistence contracts. | The prior HTTP suite passed `9/9`. The current worktree additionally passes `5/5` standalone PostgreSQL Chat SQL contract tests and `4/4` database-contract tests. Those checks cover subject scope, locked-counter allocation, context snapshot allocation, schema materialization, migration/baseline equality, and bounded migration policy. They do not prove generated-SDK parity, cursor/keyset behavior, query plans, real PostgreSQL contention, recovery, or production behavior. | Run API/OpenAPI/generated-SDK parity, pagination, real PostgreSQL clean-install/upgrade/contention, load/RSS, backup/restore, and multi-replica evidence from the clean release candidate. |
| Closed in worktree | Backend `route_explain` duplicate route declaration. | The route-collision checker passes for the current worktree. | Repeat composition and collision checks from the clean candidate. |
| Schema authority closed in worktree; release evidence remains P0 | Fresh Chat persistence previously had no installed authority. | ADR-20260730 now selects one PostgreSQL server authority. The authored eight-table fragment materializes into the root contract, PostgreSQL baseline, generated schema, migration `0004`, and table catalog. Contract checks pass and no server SQLite mirror is present. | Execute clean-install, folded-baseline upgrade, drift, backup/restore, and runtime Chat smoke tests against an isolated PostgreSQL release candidate. |
| Readiness implementation closed in worktree; live gate remains P0 | Readiness previously checked connectivity and only a narrow optional schema subset. | Readiness now validates all tables declared by the three embedded database manifests, their lifecycle module/version state, critical Chat columns and scoped indexes, and the fenced runtime ID lease. Invalid manifests and query failures fail closed. | Compile and run the database-host/router readiness suites after the shared database feature fix, then prove missing migration/table/index and lease-loss behavior on real PostgreSQL. |
| Sequence implementation closed in worktree; contention evidence remains P1 | Chat used `COUNT(*) + 1` sequence allocation. | Turn creation now locks the scoped conversation row and allocates turn/item/message ordinals from checked aggregate counters. Context snapshots use atomic `UPDATE ... RETURNING`; scoped unique indexes remain collision guards. Static regression tests forbid the old allocator. | Run concurrent create/complete/failure-injection tests from at least two PostgreSQL-backed processes and retain deadlock, latency, and collision evidence. |
| P0 | PostgreSQL integration evidence is absent in this environment. | `SDKWORK_DATABASE_URL` was absent. `pnpm test:postgres:required` exited `2` before running CI-grade PostgreSQL transaction verification. | An isolated PostgreSQL URL or digest-pinned test service, clean-install/upgrade/restore/transaction/concurrency evidence, and a passing required suite from the release candidate. |
| P1 | Settlement batch count is bounded but payload capacity is not. | The worker clamps a batch to `1..=200`, which prevents an unbounded row count. It still fetches and copies unbounded JSON/text snapshots, so a valid count can cause large memory and storage amplification. No Finance/SRE-approved byte budget, backlog policy, queue retention limit, or overload evidence is available. | Finance/SRE-approved per-item and queue budgets, admission/backpressure, instrumentation/alerts, and load/recovery evidence for both database engines. |
| P0 partially closed | Clustered runtime ID allocation and fencing. | All PostgreSQL startup paths now install the canonical process-wide `sdkwork-database-id` generator before writes. The shared registry uses database time, random lease tokens, monotonic versions, TTL heartbeats, and generator fencing; readiness includes lease health and bounded-backoff recovery. `clawrouter_runtime_id_generator_ready` and the bounded-label `clawrouter_runtime_id_failures_total{operation,reason}` expose lease and recovery state. Kubernetes supplies Pod name/UID diagnostics and no static ID. Upstream rollback uniqueness and allocator concurrency/fencing suites pass. However, the allocator still executes registry DDL during runtime allocation. An isolated PostgreSQL 16 check proved `CREATE TABLE IF NOT EXISTS` is denied to a role with schema `USAGE` and table DML but no schema `CREATE`, violating the required runtime-role boundary. | `sdkwork-database` owner must provide migrator-owned registry provisioning plus a runtime verify/allocate path requiring only DML. Then repeat focused suites from a clean candidate and prove concurrent allocation, token theft, expiry/reallocation, database partition/recovery, sequence-capacity behavior, least-privilege ACLs, alert rules, and stable readiness with at least two real PostgreSQL-backed replicas. |
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
cargo check -p sdkwork-clawrouter-edge-runtime --lib
cargo test -p sdkwork-clawrouter-edge-runtime --lib invocation_dispatcher::tests
cargo test -p sdkwork-clawrouter-edge-runtime --lib runtime::tests::invocation_response_budget_rejects_zero_runtime_config -- --exact
cargo test -p sdkwork-clawrouter-edge-runtime passthrough::tests::provider_passthrough_runtime_enforces_the_injected_request_body_limit --lib -- --exact
cargo test -p sdkwork-clawrouter-edge-runtime runtime::tests::runtime_toml_body_limit_is_resolved_once_for_invocation_and_passthrough --lib -- --exact
cargo test -p sdkwork-clawrouter-router-service --test sqlite_gateway_usage_recorder
cargo test -p sdkwork-clawrouter-router-service infrastructure::gateway_accounting_retry_queue::tests --lib
cargo test -p sdkwork-clawrouter-router-service --test invocation_pricing_settlement
cargo test -p sdkwork-clawrouter-router-service --test invocation_usage_recording
cargo test -p sdkwork-clawrouter-router-service --test invocation_streaming_usage
cargo test -p sdkwork-clawrouter-router-service --test invocation_provider_adapter_dispatch
cargo test -p sdkwork-clawrouter-router-service --test invocation_dispatch
cargo test -p sdkwork-clawrouter-edge-runtime --test invocation_router invocation_http_dispatcher_settles_responses_stream_from_nested_terminal_usage -- --exact
cargo test -p sdkwork-clawrouter-edge-runtime passthrough::tests::authenticated_adapter_streaming_shapes_fail_closed_before_invocation --lib -- --exact
cargo test -p sdkwork-routes-clawrouter-app-api router_from_env_rejects_static_or_invalid_server_snowflake_node_id_before_database_bootstrap --lib
cargo test -p sdkwork-routes-clawrouter-backend-api router_from_env_rejects_static_or_invalid_server_snowflake_node_id_before_database_bootstrap --lib
cargo test -p sdkwork-clawrouter-edge-runtime --test database_installer_startup
python -m unittest tests.test_database_runtime_id_standard
rustfmt --edition 2021 --check services/sdkwork-clawrouter-router-service/src/ports/gateway_usage_recorder.rs services/sdkwork-clawrouter-router-service/tests/sqlite_gateway_usage_recorder.rs
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-route-path-collisions.mjs --root .
pnpm test:postgres:required
cargo test -p sdkwork-clawrouter-router-service --test app_chat_api
pnpm db:materialize:contract
python -B -m tools.database_contract_materializer --root . --check
python -B -m tools.schema_compiler --root . --dialect postgres --materialize --check
python -B -m unittest tests.test_chat_runtime_database_contract -v
cargo test -p sdkwork-clawrouter-router-service --test postgres_app_chat_sql_contract
rg -n -i "ai_chat_|ai_runtime_usage_link" database/ddl/baseline database/migrations generated/schema/postgres
rg -n "COUNT\\(\\*\\).*\\+ 1|FOR UPDATE|context_snapshot_count" services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_chat_store.rs
```

The accounting command validation test and the complete SQLite gateway-usage
recorder suite passed `12/12`; the focused retry-queue suite passed `8/8`; and
the passthrough injected-limit and TOML-resolution unit tests each passed
`1/1`. The pricing/settlement and usage-recording focused integration suites
each passed `10/10`. This proves
only the named local boundaries: it is not PostgreSQL transaction, concurrency,
recovery, queue-capacity, or parity evidence. `SDKWORK_DATABASE_URL`
remains absent. The API operation-pattern check, route-collision check, and
required PostgreSQL check failed as described above. The runtime-ID policy,
startup, and Kubernetes structural checks pass locally, but a real PostgreSQL
multi-replica fault test has not run in this environment. The cloud-gateway
library compiled, but its dependency graph and router service emitted existing
warning debt. Chat schema materialization and the standalone SQL/database
contract tests now pass. The normal Cargo Chat test command is temporarily
blocked before compiling Claw Router by an in-progress sibling
`sdkwork-database` feature-gating change: PostgreSQL-only `DatabasePool` builds
still reach unconditional `DatabasePool::Sqlite` matches in database history
and ID crates. Re-enabling server SQLite is not an acceptable workaround.

The focused streaming parser suite passed `2/2`, the Adapter dispatch matrix
passed `6/6`, the fallback guard passed `1/1`, the real `/v1/responses` SSE
settlement test passed `1/1`, and the passthrough pre-I/O guard passed `1/1`.
The Responses fixture split `response.completed.response.usage` across chunks
and produced `llm_input_token=4` and `llm_output_token=3` after EOF. The parser
limits a line to 64 KiB and an event to 256 KiB and retains only usage
projections. These checks close the known paid-Adapter stream accounting
bypass; they do not establish a formal Adapter ByteStream protocol, malformed
stream/cancellation coverage, load behavior, or aggregate process RSS safety.

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
