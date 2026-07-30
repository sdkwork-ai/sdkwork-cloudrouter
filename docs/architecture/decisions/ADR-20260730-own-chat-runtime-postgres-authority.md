# ADR-20260730-own-chat-runtime-postgres-authority

Status: accepted  
Requirement: REQ-2026-0001  
Owner: clawrouter-platform  
Date: 2026-07-30  
Specs: `ARCHITECTURE_DECISION_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `SUBJECT_ID_SPEC.md`, `PAGINATION_SPEC.md`, `SECURITY_SPEC.md`

## Context

Claw Router already owns authenticated `/app/v3/api/chat/*` routes, the Chat
application port, PostgreSQL store behavior, and usage linkage needed by its
first-party product surface. Older working documents proposed deleting all
Chat persistence from this repository and delegating it to `sdkwork-kernel`,
but no reviewed kernel database contract, migration, generated SDK cutover, or
runtime integration exists that can replace the current behavior without a
fake or partially wired implementation.

The application is pre-launch. Its current database contract must therefore
have one executable authority rather than a local mirror and an aspirational
sibling authority that disagree.

## Decision

Claw Router owns the current PostgreSQL system of record for these eight
user-scoped tables:

- `ai_chat_conversation`
- `ai_chat_turn`
- `ai_chat_item`
- `ai_chat_message`
- `ai_chat_message_part`
- `ai_chat_context_snapshot`
- `ai_runtime_invocation`
- `ai_runtime_usage_link`

The schema registry fragment
`docs/schema-registry/tables/ai-chat-runtime.yaml` is the authored authority.
The database materializer derives the root contract and PostgreSQL baseline;
`database/migrations/postgres/0004_add_chat_runtime_schema.up.sql` owns the
incremental installation path.

Every table is scoped by trusted numeric `tenant_id`, `organization_id`, and
`user_id`. Chat sequence allocation is serialized by a locked conversation row
and unique scoped indexes. Context snapshot ordinals use an atomic update with
overflow protection. `ai_runtime_usage_link` is traceability data; `ai_usage`
remains the billing source of truth.

There is no server-side SQLite implementation or PostgreSQL schema mirror.
SQLite remains eligible only for a separately declared client-local contract.

`ai_runtime_invocation_event`, `ai_runtime_artifact`, agent, and memory tables
are not part of this decision and must not be described as implemented by the
current Chat store.

## Alternatives

### Delegate Chat to `sdkwork-kernel` now

Rejected because the sibling authority and end-to-end SDK/runtime cutover do
not exist. Deleting the local store first would remove working behavior;
retaining both would create dual ownership.

### Keep PostgreSQL and SQLite server stores in parity

Rejected by `DATABASE_SPEC.md`. Shared server state has one PostgreSQL
authority; a SQLite mirror would weaken locking, isolation, migration, and
production evidence.

### Keep only transient in-memory Chat state

Rejected because conversation continuity, auditability, usage linkage, and
horizontal replicas require durable tenant-scoped state.

## Consequences

- Chat schema, migrations, readiness, repository tests, PRD, and architecture
  must remain aligned in this repository.
- Horizontal writers depend on PostgreSQL transactions, row locking, scoped
  uniqueness, and the process-wide fenced ID allocator.
- Live PostgreSQL clean-install, upgrade, contention, load, backup/restore, and
  multi-replica evidence remain release gates; this ADR is not production
  approval.
- A future kernel transfer is a new breaking architecture decision. It must
  publish the target database/API/SDK authority first and define
  expand/backfill/validate/cutover/contract or an explicitly approved
  pre-launch replacement, with no dual-write steady state.

## Verification

- `python -B -m tools.database_contract_materializer --root . --check`
- `python -B -m tools.schema_compiler --root . --dialect postgres --materialize --check`
- `python -B -m unittest tests.test_chat_runtime_database_contract -v`
- `cargo test -p sdkwork-clawrouter-router-service --test postgres_app_chat_sql_contract`
- `cargo test -p sdkwork-clawrouter-database-host`
- PostgreSQL migration and concurrent Chat write tests against an isolated
  release-candidate database

## Supersedes / Superseded By

For Chat ownership, this decision supersedes the unimplemented proposals in:

- `TECH-2026-06-20-router-minimal-domain-migration-design.md`
- `TECH-2026-06-21-kernel-field-mapping-ai-to-agent.md`

No decision currently supersedes this ADR.
