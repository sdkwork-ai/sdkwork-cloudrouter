# Commercial Production Readiness Implementation Plan

> **Execution contract:** use `superpowers:test-driven-development` for every
> behavior change, `superpowers:systematic-debugging` for every unexpected
> failure, focused implementer/reviewer contexts for each task, and
> `superpowers:verification-before-completion` before advancing. Generated SDK,
> OpenAPI, route-manifest, composition, and audit outputs are never hand-edited.

**Goal:** Close REQ-2026-0001 without compatibility debt and produce a fully
verified commercial production candidate.

**Architecture:** Every public compatibility request enters one invocation
lifecycle: authenticate, authorize, classify, constrain egress, reserve funds,
select a route, dispatch, stream, meter every attempt, settle, and publish a
terminal event. Control-plane mutations stay on backend-admin surfaces. Authored
contracts, runtime routes, permissions, generated SDKs, persistence, deployment,
and documentation are changed at their owning boundaries and verified together.

**Tech Stack:** Rust, axum/hyper/tokio, SQLx PostgreSQL/SQLite, Redis, OpenAPI
3.1, generated SDK families, React/Vite, pnpm, Kubernetes, and GitHub Actions.

**Requirement:** `docs/product/requirements/REQ-2026-0001-commercial-production-readiness.md`

**Decision:** `docs/architecture/decisions/ADR-20260710-commercial-gateway-safety-boundaries.md`

---

## Execution Rules

- Preserve unrelated dirty-worktree changes. Inspect the scoped diff before each edit.
- Do not publish, deploy, delete user data, or rewrite history while executing this plan. Do not
  create a commit until Task 18 reaches its explicit candidate checkpoint and the user authorizes it.
- The application is pre-launch: retire defective shapes instead of adding aliases or dual public APIs.
- Observe a focused RED failure before production code, then GREEN, then focused refactoring.
- Change authored authorities first and regenerate every derived artifact with its canonical command.
- Database migrations, public SDK contraction, auth/security policy, production deployment, and
  release-governance diffs require an explicit human review checkpoint before their cutover step.
- After every task, run focused tests, spec review, code-quality review, scoped diff review, and the
  applicable cross-boundary rows. Do not advance while a required row is red.
- Retained evidence belongs under `artifacts/verification/REQ-2026-0001/<task>/` and records tool
  version, command, environment, start/end time, exit code, and immutable output hashes. Before a
  candidate commit exists, record a reproducible tracked-tree plus binary-diff fingerprint and label
  evidence `worktree`; never attribute dirty-worktree evidence to `HEAD`.
- A missing tool, skipped required suite, empty evidence file, warning waived by CI, or
  `continue-on-error` result is a failure.

## Authority And Generation Map

| Surface | Authored authority | Derived chain | Canonical write commands | Freshness/closure |
| --- | --- | --- | --- | --- |
| App/backend operations and DTO fields | `docs/schema-registry/frontend-field-contracts.yaml` | `generated/api/api-contract-manifest.json` -> `generated/openapi/*` -> `apis/app-api/**` and `apis/backend-api/**` | `python -B -m tools.api_contract_manifest`; `python -B -m tools.clawrouter_openapi_generator` | same commands with `--check`; `pnpm api:materialize:check` |
| Public OpenAI-compatible operations | `tools/clawrouter_gateway_openapi_generator.py` | `apps/sdkwork-clawrouter-pc/public/openapi.json` -> `sdks/clawrouter-open-sdk/openapi/clawrouter-open-sdk.openapi.json` -> `apis/open-api/clawrouter/clawrouter-open-api.openapi.json` | `python -B -m tools.clawrouter_gateway_openapi_generator`; `python -B -m tools.clawrouter_sdk_runtime_standardizer --sdk-dir clawrouter-open-sdk --openapi-only`; `pnpm api:materialize:write` | generator `--check`; SDK guardian; `pnpm api:materialize:check` |
| Route manifests and Rust manifests | authored OpenAPI above | `sdks/_route-manifests/**` -> `crates/sdkwork-routes-*/src/http_route_manifest.rs` | `pnpm api:standard-extensions:write`; `pnpm api:http-route-manifest:write` | corresponding `:check` commands plus route collision check |
| App/open SDKs | `apis/*` authorities above | `sdks/<family>/openapi/*.openapi.json` and `*.sdkgen.json` -> generated language transports -> composed facade | `python -B -m tools.clawrouter_sdk_runtime_standardizer --sdk-dir <family> --openapi-only`; `node sdks/<family>/bin/generate-sdk.mjs --all` | `python -B -m tools.clawrouter_sdk_guardian`; SDK standard, consumer-import, build, and typecheck gates |
| Account hold/settlement prerequisite | Exact Token Bank operations in `../sdkwork-account/apis/backend-api/account/account-backend-api.openapi.json`: `POST /backend/v3/api/token_bank/holds`, `POST /backend/v3/api/token_bank/holds/{holdId}/settle`, `POST /backend/v3/api/token_bank/holds/{holdId}/release`, plus an exact status query; Rust commands under `../sdkwork-account/crates/sdkwork-account-service/src/commands/**` and Account repository migrations | Account backend OpenAPI -> `../sdkwork-account/sdks/sdkwork-account-backend-sdk/openapi/**` -> composed `@sdkwork/account-backend-sdk`; embedded Rust service/repository implements identical command semantics | `pnpm --dir ../sdkwork-account sync:openapi`; `pnpm --dir ../sdkwork-account sdk:generate:backend` | Account API/envelope/pagination checks, `cargo test --manifest-path ../sdkwork-account/Cargo.toml --workspace`, and `pnpm --dir ../sdkwork-account verify` |
| Models key-domain prerequisite | `../sdkwork-models/crates/sdkwork-models-catalog-service/src/domain/access.rs` plus an owning Models REQ/ADR and its consumer inventory | reviewed Models domain release -> pinned Claw Router Cargo/workflow dependency revision | owning Models code/test commands, then immutable commit handoff; no local copy or generated edit | `cargo test --manifest-path ../sdkwork-models/Cargo.toml --workspace`; `pnpm --dir ../sdkwork-models verify`; Claw Router consumer/build/composition tests at the pinned SHA |
| Runtime route composition | hand-written route crates and router-service constructors | executable axum routers | Rust implementation only; never modify generated route manifests to match an undeclared route | runtime inventory tests plus exact `(surface, method, path)` parity |
| Component/permission composition | root/module `specs/component.spec.json`, module IAM manifests, `sdkwork.app.config.json` | `generated/composition.resolved.json` | `node ../sdkwork-specs/tools/resolve-composition.mjs --root . --write` | all eight composition closure commands in Task 1 |
| Database | Authored `database/ddl/baseline/{postgres,sqlite}/*.sql`, `database/contract/prefix-registry.json`, seeds, and reviewed paired `database/migrations/{postgres,sqlite}/*.up.sql`/`*.down.sql` | `pnpm db:materialize:contract` derives `database/contract/schema.yaml`, `database/contract/table-registry.json`, and materialized fields in `database/database.manifest.json`; the runtime records versions in `ops_schema_migration_history` | change authored SQL/inputs, then `pnpm db:materialize:contract`; use `pnpm db:plan` and reviewed `pnpm db:migrate` for upgrades | `pnpm db:validate`; second materialization is clean; `pnpm db:drift:check`; PostgreSQL/SQLite clean-install, upgrade, down/forward-fix, and recovery tests |

No task may replace these chains with direct edits to generated output.

## Task 1: Establish Ready Gate, Root Contracts, And Composition Closure

**Files:**
- Modify: `specs/README.md`
- Modify: `specs/component.spec.json`
- Modify: `specs/topology.spec.json`
- Create: `specs/database-store-migration.manifest.json`
- Create: `specs/application-env-standard.md` as the current v4 repository narrowing derived from
  topology/env tooling, without legacy profile or alias guidance
- Retire and do not restore: `specs/appbase-integration.yaml`,
  `specs/dependency-api-surfaces.json`, `specs/naming-migration.manifest.json`, and
  `specs/standard-alignment.manifest.json`; component specs plus generated composition replace them
- Modify as required: root and PC/module `specs/component.spec.json` files and IAM manifest refs
- Modify: `docs/product/prd/PRD.md`
- Modify: `docs/architecture/tech/TECH_ARCHITECTURE.md`
- Test: `tests/test_sdkwork_standard_alignment_guardian.py` and root composition validators

- [ ] Capture the dirty-worktree inventory and scoped baseline without overwriting existing changes.
- [ ] Retain exactly `README.md`, `component.spec.json`, `topology.spec.json`,
      `application-env-standard.md`, and `database-store-migration.manifest.json` under root `specs/`.
      Global API/database standards remain deleted local duplicates.
- [ ] Remove `dependency-api-surfaces.json` manifest refs from PC/module component specs and tests;
      keep authored SDK/runtime facts in owning component specs and derive the cross-stack graph only
      through `generated/composition.resolved.json`.
- [ ] Remove active code, manifest, script, environment-template, and documentation references to all
      retired contracts. Prove every retained contract has an active consumer and every retired path
      has zero references.
- [ ] Reconstruct `database-store-migration.manifest.json` from the current six repository-sqlx
      crates and the reproducible inventory of 76 legacy files = 38 PostgreSQL/SQLite pairs grouped
      into 35 pending capabilities; require 76/76 unique path coverage and no stale count/status.
- [ ] Record each remaining store's capability owner, target crate, port, table set, migration order,
      parity test, rollback, and status. Pending extraction is scheduled in Task 16 and cannot be
      described as aligned.
- [ ] Reconcile the 148 unique business tables referenced by the 76 stores against table registry,
      clean-install baselines, and module owners. Current discovery found only 42/148 in the registry
      and 45/148 in baselines while `database/database.manifest.json` composes only Models and IAM.
      Classify every remaining table as Claw Router-owned or an external module-owned dependency,
      add the owning module composition, and forbid copying foreign tables into Claw Router DDL.
- [ ] Require owner review for Account/payment/order/messaging/storage/promotion and other non-Claw
      systems of record before extraction or writes. Record read/write ownership and service/API port
      closure in the migration manifest; unresolved ownership blocks the Ready gate.
- [ ] Add `specs/component.spec.json` ownership contracts to all six migrated repository-sqlx crates.
      Retire or repair the five `generate_*_repository_sqlx.py` scripts that still read deleted legacy
      paths, and add executable regeneration/freshness evidence for gateway-traces; no migrated crate
      may have an unreproducible source or rollback path.
- [ ] Add contract tests for topology-profile lookup and current root contract references; observe
      the historical-profile and missing-contract RED failures, then make them green.
- [ ] Add RED environment tests for split lifecycle namespaces and invalid `release` config-profile
      aliases. Migrate application lifecycle keys to `SDKWORK_CLAW_ROUTER_CONFIG_PROFILE`,
      `_ENVIRONMENT`, `_DEPLOYMENT_PROFILE`, and `_RUNTIME_TARGET` across Rust, scripts, templates,
      and Kubernetes with no legacy fallback; `.env.release` uses config profile `prod` and runtime
      target `server`. Keep the globally mandated shared `SDKWORK_CLAW_DATABASE_*` and
      `SDKWORK_CLAW_REDIS_*` infrastructure namespaces unchanged.
- [ ] Obtain human review of the production manifest/env-key diff, then make
      `specs/application-env-standard.md` describe only the resulting v4 profiles and namespaces.
- [ ] Resolve the PC core IAM manifest path and add an inherited permission-catalog entry for
      `clawrouter-app-wallet-capability`; do not add a fake root IAM manifest.
- [ ] Materialize composition with
      `node ../sdkwork-specs/tools/resolve-composition.mjs --root . --write`.
- [ ] Run and retain all composition rows before Task 2:
      `check-component-port-bindings.mjs`, `check-frontend-composition.mjs`,
      `check-rust-backend-composition.mjs`, `check-permission-composition.mjs`,
      `check-route-path-collisions.mjs`, `check-composition-resolver.mjs`, and
      `verify-repo.mjs`, each with `--root .`.
- [ ] Run `pnpm topology:validate`,
      `python -B tools/sdkwork_standard_alignment_guardian.py --strict`,
      `pnpm db:validate`, and `pnpm db:drift:check`.
- [ ] Review the authority map, SDK families, route ownership, permission inheritance, database
      ownership, and exact generator commands. Do not begin Task 2 until the Ready gate is approved.

## Task 2: Remove App Channel Mutation Shadow Routes

**Authored authority:** `docs/schema-registry/frontend-field-contracts.yaml` is already GET-only.

**Runtime files:**
- Modify: `crates/sdkwork-routes-clawrouter-app-api/src/routes.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/mod.rs`
- Retire: `services/sdkwork-clawrouter-router-service/src/api/app_routing_channel_command.rs`
- Modify/retire: command-route tests that currently require the shadow API
- Test: `services/sdkwork-clawrouter-standalone-gateway/tests/database_config_router.rs`
- Test: route crate/runtime inventory parity tests

- [ ] Add a runtime route-matrix test: GET collection remains available; POST collection is 405;
      PUT/PATCH/DELETE item, PUT/PATCH status, and POST verify are 404. Observe current RED.
- [ ] Remove all three command-router merges and public constructors; retain backend-admin channel
      governance through its backend route owner.
- [ ] Delete dead App-only handlers and reverse/retire tests that advertised undeclared mutation.
- [ ] Run App contract freshness in authority order: API manifest `--check`, App OpenAPI `--check`,
      `pnpm api:standard-extensions:check`, and `pnpm api:http-route-manifest:check`.
- [ ] Regenerate `clawrouter-app-sdk` only if an authored input changes, then run its all-language
      generator, SDK guardian, composed TypeScript build, PC typecheck, permission, and route parity.

## Task 3: Restrict Public Compatibility APIs To Inference And Media

**Files:**
- Modify: `tools/clawrouter_gateway_openapi_generator.py`
- Modify: `crates/sdkwork-clawrouter-cloud-gateway/src/openai_passthrough_routes.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/openai_classifier.rs`
- Modify: `data/ai-routing/resources/openai-resources.json`
- Modify: `data/ai-routing/resource-groups/official-provider-groups.json`
- Modify: `data/ai-routing/resource-groups/admin-api-groups.json`
- Test: generator, route inventory, classifier, taxonomy, and SDK surface tests

- [ ] Add RED tests rejecting representative organization, project, key, user, certificate,
      billing, and administration operations in authored output, runtime, resource groups, and SDK.
- [ ] Replace `_administration_paths()` composition with an explicit exact `(method, path)` public
      operation allowlist. Prefix or tag matching is not an authorization boundary.
- [ ] Remove broad administration classification, passthrough entries, resource seed, and group refs.
- [ ] Preserve coherent chat, responses, embeddings, moderation, image, audio, video, approved batch
      inference/file dependencies, and model-discovery operations with method-level tests.
- [ ] Run gateway generator, open SDK snapshot, API materialization, route-manifest generation, and
      `node sdks/clawrouter-open-sdk/bin/generate-sdk.mjs --all` in that authority order.
- [ ] Run API operation/envelope, external-protocol metadata, route parity, SDK provenance/standard,
      and all-language build tests. Record the public SDK contraction for human review.

## Task 4: Eliminate The Direct Compatibility Dispatch Bypass

**Files:**
- Modify/retire: `ProviderPassthroughRuntime::forward_openai`
- Modify/retire: `crates/sdkwork-clawrouter-cloud-gateway/src/provider_passthrough_transport.rs`
- Modify: `crates/sdkwork-clawrouter-cloud-gateway/src/openai_passthrough_routes.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs`
- Modify: gateway/router composition for `InvocationDispatcher` and `DispatchExecutor`
- Test: public compatibility dispatch-path integration tests

- [ ] Add a RED test proving a retained public OpenAI operation currently reaches direct transport
      without egress policy, reservation, attempt accounting, streaming metering, and adaptive route
      selection; assert one unified lifecycle is required.
- [ ] Add a RED test proving App runtime currently decrypts `GatewayApiKey.copyable_key` and sends it
      as a Bearer credential to its own gateway. An internal product flow must never require customer
      plaintext or traverse the public authentication boundary as a synthetic customer.
- [ ] Route every retained compatibility operation through classification and the same invocation
      dispatcher/executor ports. A protocol adapter may translate wire shapes but may not dispatch.
- [ ] Replace App runtime self-HTTP authentication with a typed in-process invocation port carrying
      trusted request subject, API-key identity/policy, trace, and idempotency context. It must execute
      the same authorization, reservation, routing, egress, attempt, stream, and settlement lifecycle.
- [ ] Remove the default HTTP connector and any fallback that can call an upstream independently.
- [ ] Add a structural guardian that fails when public handlers own an HTTP client or call
      `forward_openai` outside the unified dispatcher.
- [ ] Verify provider-secret-resolver enabled/disabled configurations cannot re-enable the bypass.

## Task 5: Implement Reusable Fail-Closed Upstream Egress Policy

**Files:**
- Create: `crates/sdkwork-claw-security/src/egress.rs` and focused tests
- Create: `configs/security/provider-egress-policy.json` with exact provider-code host/port policy
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_channel.rs`
- Modify: `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_dispatcher.rs`
- Modify: approved provider HTTP adapters that currently construct clients independently
- Modify: Kubernetes NetworkPolicy and deployment validation fixtures

- [ ] Add table-driven RED tests for loopback, RFC1918, link-local, CGNAT, multicast, unspecified,
      IPv6 ULA/site-local, IPv4-mapped IPv6, metadata names/addresses, documentation/benchmark/
      reserved ranges, unsafe ports, userinfo, fragments, plain HTTP, and every applicable IANA
      non-global/special-purpose range.
- [ ] Add RED resolver tests for mixed A/AAAA answers, DNS failure, rebinding, and IP-literal URIs.
- [ ] Add RED host-policy tests proving an attacker-controlled public hostname is rejected even when
      it resolves only to global addresses. Official provider codes match exact hosts or reviewed
      label-boundary suffix patterns and approved ports; backend-admin channel input may only narrow
      an operator-authored policy, never add a destination.
- [ ] Implement `EgressPolicy` and a filtering resolver in `sdkwork-claw-security`; research confirmed
      `sdkwork-utils-rust` has no URL/DNS ownership, so reuse its generic error/string utilities only
      where their contract fits.
- [ ] Use `HttpConnector::new_with_resolver` so the exact socket addresses Hyper can connect to are
      filtered. Reject unsafe IP literals before resolver bypass.
- [ ] Validate at channel persistence and immediately before connection. Direct public providers use
      HTTPS plus the provider-code host policy; trusted internal adapters require a separate explicit
      client/policy. Missing provider policy fails configuration/startup and dispatch.
- [ ] Disable redirects by default. A provider-specific redirect exception has a maximum hop count and
      re-runs scheme, host-pattern, port, DNS, resolved-address, and credential-forwarding validation
      at every hop before following it.
- [ ] Ignore/disable ambient HTTP(S) proxy variables for provider clients. A future trusted-proxy mode
      requires a distinct reviewed proxy policy and connector; it is unsupported and fail-closed in
      this release.
- [ ] Add deny-by-default Kubernetes egress policy, required DNS/provider exceptions, rendered
      manifest validation, and positive/negative production-like smoke tests.

## Task 6: Contract And Consumer For Write-Only Customer API Keys

**Authored authority:** API-key operations and response fields in
`docs/schema-registry/frontend-field-contracts.yaml`.

**Consumers:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-api-keys/src/apiKeyService.ts`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-api-keys/src/CreateKeyDrawer.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-api-keys/src/usage-details/ApiKeyUsageDetailsDrawer.tsx`
- Modify: API-key i18n and focused consumer tests
- Test: `apps/sdkwork-clawrouter-pc/api-key-runtime.test.ts`
- Test: `services/sdkwork-clawrouter-router-service/tests/app_api_keys.rs`
- Test: `services/sdkwork-clawrouter-standalone-gateway/tests/database_config_router.rs`
- Test: `tests/test_api_contract_manifest.py`, `tests/test_clawrouter_openapi_generator.py`,
  `tests/test_clawrouter_openapi_precision_audit.py`, and `tests/test_clawrouter_payload_sdk_audit.py`
- Regenerate: `clawrouter-app-sdk` through the authority map

- [ ] Add a RED authority test proving API-key entries still derive `NoData`/
      `Record<string, never>` instead of typed request, item, list, and create-secret contracts.
- [ ] Add RED contract tests proving list/retrieve/update responses contain only id, prefix,
      last-four, metadata, state, and audit fields; `copyableKey` and plaintext are forbidden.
- [ ] Replace the bootstrap `NoData` contract with explicit typed request/response fields in the
      schema registry; list/search input uses `SdkWorkListQuery` and output uses `data.items` plus
      `data.pageInfo` rather than client-side full-list pagination.
- [ ] Define `POST /app/v3/api/iam/api_keys` (`apiKeys.create`) as a 201 create whose typed,
      `additionalProperties: false` `data.item` is a create-only resource containing public metadata
      plus `rawKey`. The list/retrieve/update item type never contains `rawKey`.
- [ ] Define rotation as the genuine nested create
      `POST /app/v3/api/iam/api_keys/{apiKeyId}/rotations`
      (`apiKeyRotations.create`), returning 201 with a create-only typed `data.item` containing the new
      key identity and `rawKey`. Do not overload update or flatten secret fields beside `data.item`.
- [ ] Require typed create/rotation bodies, `Idempotency-Key`, numeric `ProblemDetail`, delete 204,
      and exact route/permission/runtime parity for both operations.
- [ ] Regenerate App OpenAPI, route manifests, App SDK snapshots, and all App SDK languages.
- [ ] Change the PC flow to hold the returned secret in memory, show it once, and clear it on close,
      navigation, or refresh. Remove list-time reveal, copy, and configuration text that promises
      recoverability.
- [ ] Run API envelope/operation checks, App SDK guardian/build, app-SDK consumer-import check,
      API-key package/root runtime tests, Rust route tests, every generated-language surface test,
      PC typecheck, and accessibility/security tests.

## Task 7: Reviewed Customer-Key And Provider-Credential Migration

**Database authorities:**
- Modify authored: `database/ddl/baseline/{postgres,sqlite}/*.sql` for clean installs and
  `database/contract/prefix-registry.json` only when ownership changes
- Create: additive paired PostgreSQL and SQLite `*.up.sql`/`*.down.sql` files under
  `database/migrations/**`, tracked by `ops_schema_migration_history`
- Regenerate, never hand-edit: `database/contract/schema.yaml`,
  `database/contract/table-registry.json`, and materialized `database/database.manifest.json` fields
- Modify: `specs/database-store-migration.manifest.json`
- Test: migration, rollback/forward-fix, and recovery fixtures

- [ ] Add RED schema tests for non-recoverable customer verifier fields and provider credential
      `key_id`/ciphertext domains; prove plaintext/copyable ciphertext cannot satisfy the new schema.
- [ ] Write an expand/backfill/validate/cutover/contract plan with row counts, checksums, batches,
      lock budget, restartability, compatibility window, rollback boundary, and redaction evidence.
- [ ] Add a random, high-entropy, unique, indexed non-secret `lookup_selector` embedded in the key
      format; add `verifier_hash`, display prefix, last-four, algorithm/version fields and provider
      envelope-encryption key ID/ciphertext fields without destructive cutover. Authentication first
      performs one indexed selector lookup, then a constant-time verifier comparison; table scans are
      forbidden.
- [ ] Backfill customer verifiers only from currently decryptable values, verify authentication parity,
      and quarantine rows that cannot be proven. Never log recovered values.
- [ ] Backfill provider ciphertext into its independent key ring with dual-read/single-write rotation.
- [ ] Obtain human review of exact PostgreSQL/SQLite migration and recovery evidence before cutover.
- [ ] Cut reads to new fields, run clean-install plus upgrade tests, then redact/drop recoverable
      customer ciphertext in the contract phase. Rollback after redaction is forward-fix only.
- [ ] Run `pnpm db:materialize:contract` after authored SQL changes, assert a second run is clean, and
      freshness-check the derived schema, table registry, and database manifest.

## Task 8: Customer-Key And Provider-Credential Runtime Completion

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/crypto.rs`
- Create: a Claw Router-owned API-key identity/read model without recoverable secret material
- Modify/extract: PostgreSQL and SQLite API-key command/read stores
- Modify/extract: PostgreSQL and SQLite provider-secret stores
- Modify: `services/sdkwork-clawrouter-router-service/src/api/app_api_keys.rs`
- Modify: `crates/sdkwork-claw-config/src/api_key.rs`
- Create: `docs/engineering/prerequisites/PREREQ-2026-0002-sdkwork-models-api-key-secret-removal.md`

- [ ] Add RED authentication, create/show-once, rotate, revoke, key-ID, cross-domain, tamper,
      unavailable-KMS, and zeroization tests.
- [ ] Store new customer keys only as a versioned verifier plus non-secret display fields. Use constant-
      time verification after one unique indexed selector lookup and rate-limit negative lookups.
- [ ] Stop using `sdkwork_models_catalog_service::domain::access::GatewayApiKey.copyable_key` as the
      Claw Router persistence/API model. Create an owner-reviewed Models REQ/ADR for the exact owning
      file `../sdkwork-models/crates/sdkwork-models-catalog-service/src/domain/access.rs`, audit every
      Models consumer, remove recoverable secret material there, run Models full verification, publish
      an immutable commit, and record it in PREREQ-2026-0002 before Claw Router cutover.
- [ ] Adapt Claw Router at the Models boundary with key identity/policy only; pin the exact Models
      commit in workflow/dependency evidence and prove no unreviewed path checkout can enter a release.
- [ ] Implement provider KMS/envelope key rings with explicit key IDs, authenticated encryption,
      dual-read/single-write rotation, audit events, and fail-closed unavailable-key behavior.
- [ ] Remove `copyableKeyCiphertext`, decrypt-on-list, and legacy codec paths after migration cutover.
- [ ] Prove logs, traces, metrics, panic payloads, database errors, API responses, and frontend state do
      not expose either credential domain.

## Task 9: True Streaming Transport And Terminal Lifecycle

**Files:**
- Create: focused gateway streaming body/parser modules
- Modify: `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_dispatcher.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/usage_extraction.rs`
- Test: streaming relay, first-frame, cancellation, backpressure, and terminal accounting

- [ ] Add RED tests proving the first upstream frame is not delivered before EOF and large streams are
      buffered/limited by the current implementation.
- [ ] Add RED cases for >4 MiB streams, slow consumer backpressure, stalled chunk, cancellation,
      partial upstream error, malformed SSE, missing terminal usage, and disconnect races.
- [ ] Replace `to_bytes` with frame forwarding plus incremental protocol parsers; bound parser state,
      not total stream size.
- [ ] Enforce separate connect, headers, first-frame, chunk-idle, and total deadlines.
- [ ] Emit exactly one terminal outcome for EOF, cancellation, timeout, or error and pass it to attempt
      metering and financial settlement without delaying downstream frames.
- [ ] Measure first-frame overhead with the Task 14 benchmark harness and retain frame timing evidence.

## Task 10: Financial Contract And State Machine

**Files:**
- Create/modify: Claw Router authorization estimate, Account hold reference, terminal usage,
  reconciliation, and outbox ports/models
- Create: `docs/engineering/prerequisites/PREREQ-2026-0001-sdkwork-account-ai-hold-settlement.md`
- Prerequisite reviewed change: `../sdkwork-account` hold/settle/release contract and implementation
- Modify: pricing and invocation policy contracts
- Modify: operator-facing authored backend/app contracts only where a product surface is required
- Test: state-machine, money precision, and contract tests

- [ ] Add RED model tests for invalid transitions, negative/float money, missing currency, missing usage,
      duplicate idempotency keys, and dispatch without an approved reservation.
- [ ] Define immutable states and transitions for authorization, reservation, provider attempts,
      terminal usage, settlement, release/adjustment, reconciliation, and reversal.
- [ ] Define bounded maximum-cost calculation by model, modalities, request limits, provider pricing
      snapshot, tenant policy, and currency. Reject requests whose bound cannot be proven.
- [ ] Keep financial commands separate from HTTP DTOs and use decimal/minor-unit types only.
- [ ] Preserve ownership: `sdkwork-account` owns balances, holds, settlement, release, and ledger;
      Claw Router owns price bounds, invocation/attempt/usage facts, Account hold references, and the
      transactional outbox. Delete any design that writes Account-owned commerce tables directly.
- [ ] Add an Account prerequisite contract for idempotent `hold(maximum)`, atomic
      `settle(actual)+release(remainder)`, full release, status lookup, and reconciliation. The current
      whole-hold-only `SettleAccountHoldCommand` is insufficient and must fail a RED contract test.
- [ ] In the Account repository, create an owning REQ and ADR covering the exact Token Bank command
      schemas, PostgreSQL/SQLite migration, idempotency, authorization, deadline/cancellation, audit,
      recovery, SDK compatibility, and consumer audit. Record its approved immutable commit and full
      verification bundle in PREREQ-2026-0001.
- [ ] Change the Account authored backend OpenAPI, command model, PostgreSQL/SQLite repositories, and
      tests in its owning review; then run `pnpm --dir ../sdkwork-account sync:openapi`,
      `pnpm --dir ../sdkwork-account sdk:generate:backend`, and Account `verify` before updating the
      Claw Router dependency revision/composition.
- [ ] If operator APIs are added, author them in the schema registry, generate standard envelopes and
      SDKs, and keep customer surfaces read-only unless a product requirement explicitly owns a command.

## Task 11: Reviewed Financial Schema And Recovery Migration

**Database authorities:** same contract/baseline/migration ownership as Task 7.

- [ ] Add RED database contract tests proving hold-reference uniqueness, append-only invocation/
      attempt/usage facts, reconciliation state, and Claw Router outbox atomicity are absent; add
      separate Account RED tests for hold and ledger idempotency.
- [ ] In Claw Router, design L3 tables/indexes only for Account hold references, attempt facts, usage
      lines, reconciliation discrepancies, and transactional outbox. Account-owned hold/balance/
      settlement/ledger schema changes stay in `../sdkwork-account` migrations.
- [ ] Produce additive PostgreSQL/SQLite migrations plus backfill, validation, cutover, rollback/forward-
      fix, crash-recovery, and clean-install steps. Existing `ai_usage`/commerce facts must be reconciled,
      not silently relabeled.
- [ ] Obtain human review of schema ownership, money semantics, locking plan, migration SQL, rollback,
      cross-repository Account contract/version, and recovery evidence before applying the cutover.
- [ ] Run `pnpm db:plan`, migration interruption/restart tests, `pnpm db:migrate` in isolated
      PostgreSQL/SQLite environments, `pnpm db:drift:check`, and restore-from-backup validation.
- [ ] Replace Flyway-only commands in `docs/runbooks/database-migration-rollback.md` with tested
      `sdkwork-database` plan/migrate/history/down-or-forward-fix procedures and captured output.

## Task 12: Pre-Dispatch Reservation, Atomic Settlement, And Reconciliation

**Files:**
- Create: Claw Router SQLx usage/hold-reference/reconciliation/outbox adapters under owning crates
- Create: `FundsReservationPort` in router-service and
  `crates/sdkwork-clawrouter-account-adapter` as its concrete embedded Account adapter
- Integrate: approved Account Rust service commands; no TypeScript SDK, raw HTTP, backend-admin token,
  direct Account repository dependency from router-service, or direct commerce SQL
- Modify: dispatcher policy ports and gateway composition
- Modify: usage finalization and settlement workers
- Modify: operator discrepancy read models/alerts

- [ ] Add RED tests proving zero/insufficient balance reaches a provider, concurrent reservations
      overspend, duplicate invocation keys double-charge, and missing usage finalizes as zero.
- [ ] Use one deployment matrix for this release: both `standalone` and `cloud` profiles compose the
      pinned `sdkwork-account-service` in-process behind `FundsReservationPort`; gateway composition,
      not router-service, owns the concrete adapter/repository wiring. Remote Account mode is
      unsupported and startup fails if requested until Account owns a reviewed internal API/RPC.
- [ ] Map the port exactly to Token Bank hold create, partial settle plus remainder release, full
      release, and status query. Propagate trusted tenant/organization/service-permission context,
      trace context, stable idempotency keys, transaction deadlines, cancellation, and normalized
      fail-closed errors; never use the public backend-admin HTTP surface for service authentication.
- [ ] Create an Account hold for the bounded maximum before selecting/dispatching an upstream with a
      stable invocation key. A missing, rejected, expired, or ambiguous hold blocks dispatch.
- [ ] Persist trace/attempt/usage/hold-reference facts and enqueue the Account settlement command in
      one Claw Router transaction. Account atomically settles actual cost and releases the remainder
      under the same idempotency key; do not claim a distributed SQL transaction.
- [ ] Put successful streams with missing usage into reconciliation-required state, alert operators,
      and retain the reservation; only an explicit free model contract may settle zero.
- [ ] Implement idempotent workers, lease/skip-locked semantics, retry/backoff, poison handling, and
      operator-visible Account/provider-statement discrepancies. Holds remain conservative until an
      Account acknowledgement or explicit reconciliation result is durable.
- [ ] Remove existing direct `commerce_account`/ledger mutation from Claw Router after Account parity
      and migration checks pass; prove the database role cannot write Account-owned tables.
- [ ] Pin the approved Account commit in `sdkwork.workflow.json`/candidate dependency evidence and
      verify standalone plus cloud composition uses that exact source revision.
- [ ] Run concurrency, failure-injection, process-kill, outbox replay, statement reconciliation,
      PostgreSQL isolation, and SQLite parity tests.

## Task 13: Attempt-Correct Retries, Failover, And Circuit Breaking

**Files:**
- Modify: `dispatch_executor.rs`, `circuit_breaker.rs`, candidate policy models/stores
- Test: retry, fallback, cost, breaker, and cancellation integration tests

- [ ] Add RED tests proving generative POST retries by default, primary failure is lost when fallback
      succeeds, and retry/failover budgets can multiply independently.
- [ ] Default non-idempotent generative operations to one provider attempt. Replay requires an explicit
      provider capability and stable provider-side idempotency key.
- [ ] Apply one total-attempt budget across retries and failovers, bounded by reservation exposure.
- [ ] Record latency, status, response exposure, usage, cost, and breaker outcome for every attempt,
      including failed primaries and client cancellations.
- [ ] Verify breaker transitions use per-attempt terminal facts and cannot hide spend or usage.

## Task 14: Commercial Adaptive Routing And Reproducible Performance Proof

**Files:**
- Create: focused routing policy/value-object modules and Redis/local health adapters
- Modify: `provider_route_selector.rs` through stable ports
- Modify: authored request policy contract only for constrained client preferences
- Create: `scripts/bench-gateway-overhead.mjs` and deterministic fixtures
- Create: `deployments/benchmark/docker-compose.yml` with digest-pinned PostgreSQL/Redis images
- Modify: root `package.json` with `bench:gateway:production`
- Test: eligibility, precedence, scoring, distribution, degradation, and benchmark tests

- [ ] Add RED tests for operator/tenant/key/request precedence, hard-policy bypass, capability/parameter
      mismatch, region/retention violation, price ceiling, stale Redis data, and deterministic ties.
- [ ] Merge policies in the fixed order operator hard limits -> tenant -> key -> constrained request;
      a lower scope can only narrow eligibility.
- [ ] Score eligible candidates with bounded EWMA latency, recent errors, throughput, price, and load;
      preserve deterministic decisions and bounded local fallback when Redis is unavailable.
- [ ] Add an exact App/OpenAPI request schema only if request preferences are public, regenerate the
      owning SDKs, and reject arbitrary provider URLs or credentials.
- [ ] Make the benchmark script own deterministic setup and cleanup: verify Docker/tool versions,
      build the release gateway, start digest-pinned isolated PostgreSQL and Redis, apply migrations
      and fixed seed `20260710`, start/readiness-check a benchmark-only allowlisted mock provider and
      gateway, run samples, capture logs/resources, and tear down in `finally` even on failure.
- [ ] Define the fixture wire exactly: unary upstream delay 20 ms and 32 KiB JSON body; SSE has 20
      512-byte data frames at 25 ms cadence plus one terminal usage frame. Use HTTP/1.1 keep-alive,
      warmed pools capped at concurrency 50, gateway connect/header/first-frame/idle/total timeouts
      of 1/2/2/1/30 seconds, and identical alternating direct/proxied payloads and connections.
- [ ] Benchmark 100 warmups, 1,000 unary request pairs at concurrency 50, 200 SSE stream pairs at
      concurrency 20, then a 10-minute steady-state memory phase. For sample `i`, overhead is
      `proxied_duration_i - direct_duration_i`; compute p95 from the paired overhead samples and retain
      every raw direct/proxied/overhead value.
- [ ] Run `pnpm bench:gateway:production -- --output artifacts/verification/REQ-2026-0001/task-14/gateway-overhead.json` from a clean dependency install; no separately pre-started service or
      manually seeded database is allowed.
- [ ] Assert paired gateway p95 unary overhead is `< 50 ms`, p95 first-frame overhead is `< 50 ms`,
      no frame is buffered to EOF, and error rate is zero. After warmup, gateway RSS may grow by at
      most 64 MiB total and its linear growth slope must be at most 1 MiB/minute during the 10-minute
      phase. Record CPU, RSS samples, OS, Docker image digests, Rust/Node versions, fixture seed,
      timeouts, raw samples, and summary in the evidence file.
- [ ] Replay a fixed traffic trace against static and adaptive policies and prove no security-policy
      violation plus measurable cost or latency improvement without increasing error rate.

## Task 15: Production Observability, Health, Dashboards, And Alerts

**Files:**
- Modify: `crates/sdkwork-claw-observability/**`
- Modify: `crates/sdkwork-claw-http/src/metrics.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/telemetry.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/metrics_interceptor.rs`
- Modify: gateway health/readiness and trace propagation composition
- Modify: `deployments/prometheus/claw-router-alerts.yaml`
- Modify: `deployments/grafana/claw-router-slo-dashboard.json`
- Test: metric contract, cardinality, redaction, trace, readiness, dashboard, and alert fixtures

- [ ] Add RED tests proving required invocation/security/financial signals are absent or use unsafe
      labels, secrets/raw paths can enter telemetry, and readiness does not reflect required runtime
      dependencies.
- [ ] Emit structured redacted logs and correlated OpenTelemetry-compatible spans using server-owned
      `traceId`, operationId, route template, API surface, provider attempt, and terminal lifecycle.
      Never emit prompts, payloads, raw URLs, SQL, tokens, API keys, provider credentials, full IPs,
      user IDs, or tenant names.
- [ ] Add low-cardinality counters/gauges/histograms for egress rejection, route eligibility/selection,
      every provider attempt, retry/failover, first-frame/idle/terminal stream outcomes, Account hold
      result, settlement acknowledgement, reconciliation discrepancy, outbox depth/lag, missing usage,
      breaker state, request duration/error, database pool, and Redis degradation.
- [ ] Every common metric carries exact bounded `service`, `environment`, `deployment_profile`,
      `runtime_target`, `runtime_profile`, `operation_id`, route template, method, normalized status,
      `api_surface`, and `backend_layer` labels where applicable. Provider/model labels use stable
      bounded codes; trace IDs and tenant/user/key/request values are never labels.
- [ ] Use documented seconds-based histogram buckets including 0.05 seconds for the gateway overhead
      SLO and appropriate long-stream buckets. Billing metrics remain projections, never ledger truth.
- [ ] Liveness reports process viability only. Readiness fails when required database, Redis profile,
      embedded Account service, provider KMS, policy catalog, or migration state cannot safely serve;
      dependency details remain available only on protected diagnostics surfaces.
- [ ] Add tested alerts and dashboards for egress attacks, elevated provider errors/latency, streaming
      first-frame/idle failures, exhausted/rejected holds, settlement/outbox lag, missing usage,
      reconciliation discrepancies, open breakers, and readiness loss. Alert tests feed fixture series
      and assert fire/resolve timing, severity, routing labels, and runbook links.
- [ ] Run redaction/property tests, metric schema/cardinality checks, trace-context integration,
      Prometheus rule tests, Grafana JSON validation, and production-like scrape/readiness smoke tests;
      retain sample logs, traces, metrics, dashboard screenshots, and alert evidence.

## Task 16: Finish Repository Extraction And Composition Debt

**Files:**
- Create/complete: `crates/sdkwork-clawrouter-<capability>-repository-sqlx` owners from the Task 1 manifest
- Modify: router-service ports and composition only; no service-to-concrete-repository dependency
- Modify: root/module component specs, package exports, PC composition, and permission catalogs

- [ ] For each remaining PostgreSQL/SQLite store pair, add RED port/parity/isolation/pagination/
      idempotency tests, move SQL and row mapping to the capability repository crate, wire at runtime,
      then delete the legacy store. Review one capability at a time.
- [ ] Use `sdkwork-database-*` and `sdkwork-utils-rust` helpers where they own the behavior; remove local
      parsing, decimal, row, normalization, and transaction helpers only after parity tests prove reuse.
- [ ] Finish high-risk owners first: API keys/provider secrets, routing, usage/billing, then admin/read
      models. End state: zero router-service `infrastructure/sql/**/*_store.rs` modules.
- [ ] Remove completed migration manifests/history that no longer govern runtime; update current
      component contracts instead of retaining a permanent legacy waiver. Change the guardian so
      the migration manifest is required exactly while legacy stores exist and forbidden once the
      inventory reaches zero.
- [ ] Add RED composition/typecheck evidence before each manifest/package change. Repair exports and
      workspace dependencies; never add Vite aliases, raw HTTP, manual auth, or generated transport imports.
- [ ] Materialize composition and run the entire closure matrix, PC typecheck/build/tests, Rust
      composition check, database ownership check, pagination check, and clean package install.

## Task 17: Release, Deployment, Egress, And Recovery Must Fail Closed

**Files:**
- Modify: `.github/workflows/package.yml`, `.github/workflows/verify.yml`, `sdkwork.workflow.json`
- Modify: release/SBOM/checksum/signing/provenance scripts
- Modify: Kubernetes manifests and deployment validator wiring
- Modify: `deployments/runbooks/disaster-recovery-plan.md`
- Test: workflow, artifact, deployment, policy, rollback, and recovery tests

- [ ] Add RED workflow tests proving publication/deployment currently accepts missing same-commit E2E,
      empty checksum/signature/SBOM/provenance/digest, mutable refs, or skipped tools.
- [ ] Add RED deployment/recovery tests for mutable images, absent egress policy, invalid restore
      commands, untested KMS recovery, and missing artifact-to-Pod provenance.
- [ ] Require same-commit verification, PostgreSQL E2E, scans, signatures, non-empty checksums, SBOM,
      provenance, immutable OCI digest, and independent approval before publish/deploy jobs.
- [ ] Pin actions, dependencies, base images, and production images by immutable commit/digest. Missing
      tools or credentials fail required targets.
- [ ] Pin the reviewed `sdkwork-account` and `sdkwork-models` prerequisite commits in
      `sdkwork.workflow.json`, release checkout evidence, Cargo/package resolution, SBOM, and
      provenance; a mutable sibling working directory is not release evidence.
- [ ] Wire `deploy:validate` into root check/CI and validate rendered NetworkPolicy, least privilege,
      secrets, probes, disruption, rollout, rollback, and resource limits.
- [ ] Obtain human review before changing production/release governance or applying deployment state.
- [ ] Execute isolated PostgreSQL PITR, provider/customer key recovery, KMS outage, rollout, rollback,
      and artifact provenance drills; retain measured RPO/RTO and immutable evidence.

## Task 18: Remove Historical Documentation And Prove Release Readiness

**Files:**
- Modify: PRD, requirement, architecture, current TECH shards, API docs, SDK docs, and operator runbooks
- Regenerate: current audit facts only through their generators
- Create: `scripts/fingerprint-clawrouter-worktree.mjs` for pre-candidate evidence
- Remove/archive: documents that assert retired commands, routes, env profiles, recoverable keys,
  unsafe administration passthrough, or unverified production readiness

- [ ] Add RED link/fact tests for every stale path and assertion before updating documentation.
- [ ] Describe only measured current behavior, ownership, failure modes, migration/recovery commands,
      limits, and evidence. Do not retain migration-era claims as current architecture.
- [ ] Run focused suites, then `pnpm check`, `pnpm test`, `pnpm build`, `pnpm verify`,
      `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, and
      `cargo test --workspace`.
- [ ] Before a candidate commit exists, run the full suite against the working tree and bind every
      evidence bundle to the SHA-256 of the sorted tracked-file tree, staged diff, unstaged binary
      diff, untracked-file inventory/content hashes, and exact pinned sibling commits.
- [ ] Stop at an explicit human checkpoint: review the full scoped diff, generated provenance,
      destructive migrations, public SDK contraction, release/deployment changes, and pinned sibling
      commits. The user must authorize creation of an immutable candidate commit; without that
      authorization the release gate remains blocked and no production-readiness claim is allowed.
- [ ] After authorization and candidate commit creation, clone that exact commit into a clean path,
      resolve only its pinned sibling revisions, install from lockfiles, and prove the worktree is
      clean before verification.
- [ ] Run required PostgreSQL, SQLite, Redis, browser, SDK all-language, deployment, chaos, load,
      security-negative, observability, restore, and DR suites from that clean candidate clone.
- [ ] Re-run Task 14's benchmark unchanged in the clean clone and retain raw samples and thresholds.
- [ ] Re-run every acceptance row below, request independent spec/code/security/operations review,
      and change requirement/release status only when every row is green on the same commit.

## Acceptance Trace

| Requirement | Task(s) | Executable evidence | Pass result | Evidence path |
| --- | --- | --- | --- | --- |
| AC1 egress/SSRF | 4, 5 | security unit, resolver, dispatcher, and cluster negative tests | every forbidden destination rejected at persistence and connect time | `task-05/` |
| AC2 App routes | 1, 2 | runtime method/path matrix, manifest/OpenAPI/SDK parity | only declared GET route executable | `task-02/` |
| AC3 inference-only public API | 3, 4 | generator, classifier, runtime, taxonomy, SDK tests | no public admin operation or bypass | `task-03/` |
| AC4 reservation/settlement | 10-12 | state-machine, concurrent SQL, failure-injection, reconciliation tests | no dispatch without reservation; atomic idempotent settlement | `task-12/` |
| AC5 no silent zero usage | 9, 12 | terminal stream and missing-usage reconciliation tests | missing usage remains reserved and alerts | `task-12/` |
| AC6 streaming | 9, 14 | frame, backpressure, cancellation, timeout, first-frame benchmark | incremental bounded stream; p95 first-frame overhead `<50 ms` | `task-09/`, `task-14/` |
| AC7 retry safety | 13 | replay, failover, attempt, breaker tests | unsafe POST has one attempt; every attempt recorded | `task-13/` |
| AC8 write-only keys | 6-8 | API, schema, crypto, migration, leak tests | one-time customer secret; separate rotatable provider domain | `task-08/` |
| AC9 adaptive routing | 14 | policy merge, eligibility, Redis degradation, replay benchmark | deterministic hard-safe decisions with measured benefit | `task-14/` |
| AC10 release integrity | 17 | workflow/artifact policy tests and release rehearsal | same-commit signed immutable evidence required | `task-17/` |
| AC11 recovery/egress operations | 5, 11, 17 | rendered policy, PITR, KMS recovery, rollout/rollback drills | measured RPO/RTO and successful provenance trace | `task-17/` |
| AC12 full verification | 18 | clean-clone full matrix | all commands exit 0 without skips or waivers | `task-18/` |
| AC13 production observability | 15, 18 | telemetry/redaction/cardinality, readiness, dashboard, Prometheus rule, and alert tests | critical states are correlated, bounded, redacted, visible, and alerting | `task-15/` |
| NFR performance | 9, 14, 18 | self-managed deterministic direct-vs-gateway benchmark | unary and first-frame paired p95 overhead each `<50 ms`; RSS delta/slope within limits | `task-14/gateway-overhead.json` |
| NFR observability | 15, 18 | telemetry/redaction/cardinality, readiness, Prometheus rule, dashboard, alert, and scrape tests | every critical lifecycle is correlated, bounded, redacted, dashboarded, and alerted | `task-15/` |
| NFR security/privacy | 3-8, 14-15, 17 | negative, leak, residency, telemetry-redaction, retention, and least-privilege tests | no bypass, secret leak, unsafe label, or policy broadening | task-specific bundles |
| NFR reliability/operations | 9-13, 15, 17 | crash, retry, outbox, alert, chaos, restore, rollback tests | no duplicate spend, silent loss, unalerted critical state, or unrecoverable state | task-specific bundles |

## Cross-Boundary Verification Matrix

Run applicable focused rows after each task and every row before release:

```text
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
node ../sdkwork-specs/tools/check-route-path-collisions.mjs --root .
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .
node ../sdkwork-specs/tools/check-frontend-composition.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
node ../sdkwork-specs/tools/check-permission-composition.mjs --root .
node ../sdkwork-specs/tools/resolve-composition.mjs --root . --write
node ../sdkwork-specs/tools/check-composition-resolver.mjs --root .
node ../sdkwork-specs/tools/verify-repo.mjs --root .
node ../sdkwork-specs/tools/check-sdk-standard.mjs --root .
pnpm topology:validate
python -B tools/sdkwork_standard_alignment_guardian.py --strict
pnpm db:validate
pnpm db:drift:check
pnpm --dir apps/sdkwork-clawrouter-pc typecheck
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
pnpm test:postgres:required
pnpm verify
```

Applicability is recorded explicitly. Route, permission, frontend, Rust, resolver,
database, and SDK rows are all applicable to this plan; none may be marked N/A.
