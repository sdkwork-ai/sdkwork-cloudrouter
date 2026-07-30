# First-Party Chat Persistence Design

Status: active  
Owner: clawrouter-platform  
Updated: 2026-07-30  
Decision: [ADR-20260730](../decisions/ADR-20260730-own-chat-runtime-postgres-authority.md)

## Goal

Provide durable, user-scoped conversation history for Claw Router's current
first-party Chat API without treating raw OpenAI-compatible gateway requests as
product conversations. The design must remain correct under concurrent writers,
bounded in memory, observable at startup, and explicit about capabilities that
do not yet exist.

## Implemented Boundary

The current API supports:

- create, retrieve, and list conversations;
- create a turn with one input message and one pending output item;
- complete or reconcile the output response;
- list visible messages;
- persist a context snapshot and optional runtime/usage linkage.

Rename, archive, delete, fork, agent-session, long-term-memory, runtime-event,
and runtime-artifact behavior is not implemented by this store and is not part
of this design.

## Data Authority

PostgreSQL is the only server authority. The authored schema fragment is
`docs/schema-registry/tables/ai-chat-runtime.yaml`; it materializes into the root
database contract and PostgreSQL baseline. Migration `0004` installs the same
DDL for upgrade paths.

| Table | Current responsibility |
| --- | --- |
| `ai_chat_conversation` | User-owned aggregate, counters, preview, and last-item pointers |
| `ai_chat_turn` | One product interaction and context-snapshot counter |
| `ai_chat_item` | Ordered input/output timeline items |
| `ai_chat_message` | User-visible normalized messages |
| `ai_chat_message_part` | Structured parts of a message |
| `ai_chat_context_snapshot` | Context actually associated with a completed turn |
| `ai_runtime_invocation` | Runtime invocation authority referenced by Chat when present |
| `ai_runtime_usage_link` | Traceability from Chat/runtime identifiers to usage facts |

`ai_usage` remains the billing source of truth. A missing cost is stored as
`NULL`; it is not rewritten to zero, because unknown cost and zero cost have
different commercial meaning.

Every table binds trusted numeric `tenant_id`, `organization_id`, and `user_id`.
Ordinary reads, joins, updates, and deletes must bind the full tuple before
returning or mutating data.

## Transaction And Concurrency Model

Turn creation executes in one PostgreSQL transaction:

1. Lock the scoped conversation row with `FOR UPDATE`.
2. Validate its stored counters and allocate ordinals with checked arithmetic.
3. Insert the turn, input/output items, input message, and message part.
4. Advance aggregate counters and last-item pointers in the same scope.
5. Commit only after every write succeeds.

Turn completion locks the scoped conversation and pending output. Existing
responses are reconciled idempotently inside the transaction. Context snapshot
ordinals use `UPDATE ... RETURNING` with an exhaustion predicate. Scoped unique
indexes on conversation/turn/item/message/part sequences provide the database
collision boundary.

No `COUNT(*) + 1`, `MAX(sequence) + 1`, process-local mutex, or retry-only
sequence allocator is permitted. A process-local lock would not coordinate
multiple replicas.

## Bounded Reads And Memory

Conversation and message reads apply tenant/org/user predicates, deterministic
ordering, and SQL `LIMIT` before rows enter Rust memory. The HTTP boundary
accepts only `page` and `page_size`, rejects aliases, and caps `page_size` at
200. Conversation preview text is truncated with `sdkwork-utils-rust` to the
schema limit of 1024 characters.

The current offset mode is bounded per request but is not the final evidence
for very deep message histories. Cursor/keyset pagination, query-plan evidence,
load/soak results, and an accepted process RSS ceiling remain release gates.

## Readiness And Failure Behavior

Readiness fails closed when:

- PostgreSQL cannot be acquired within the probe timeout;
- a required materialized table is absent;
- lifecycle installation state/version is not current;
- a critical Chat column or scoped index is absent;
- the process-wide runtime ID lease is unhealthy;
- an embedded readiness manifest cannot be parsed.

Migration `0004` is transactional, sets lock and statement timeouts, refuses a
partial eight-table installation, and verifies critical columns/indexes before
commit. New-install baseline and migration table/index DDL are contract-tested
for equality.

## Remaining Release Evidence

- Real PostgreSQL clean install and folded-baseline upgrade.
- Concurrent turn/completion contention across at least two process instances.
- Cursor/keyset pagination for high-volume message history or an approved,
  measured offset volume bound.
- Query plans, load/soak, memory ceiling, backup/restore, failover, and schema
  drift evidence from the release candidate.
- Full API/OpenAPI/generated-SDK field and pagination parity.

Static and unit checks are necessary but do not close these production gates.
