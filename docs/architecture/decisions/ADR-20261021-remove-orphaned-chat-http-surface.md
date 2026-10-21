# ADR-20261021-remove-orphaned-chat-http-surface

Status: accepted  
Requirement: REQ-2026-0001  
Owner: cloudrouter-platform  
Date: 2026-10-21  
Specs: `ARCHITECTURE_DECISION_SPEC.md`, `API_SPEC.md`, `RUNTIME_SPEC.md`

## Context

The 2026-07-30 decision kept Cloud Router as the PostgreSQL authority for the
Chat persistence model. It also described the authenticated
`/app/v3/api/chat/*` projection as part of the owned surface.

The first-party Chat UI and its `chatService.ts` were deleted in commit
`44cc29a28`. The six HTTP routes, their PostgreSQL store, ports, API tests, and
a console-runtime test block remained, but:

- no product surface calls them (`/app/v3/api/chat/*` appears only in a stale
  test);
- they were never authored into the frontend field contract, app OpenAPI, or
  the generated App SDK, so no client could call them through the contract;
- the stale test imports the deleted `chatService.ts` and cannot run.

Keeping a public HTTP surface with no contract, SDK, consumer, or executable
test is dead surface and a contract-integrity hazard: it drifts silently and
misleads readers into treating Chat as a shipped capability.

## Decision

Remove the orphaned Chat HTTP projection from this repository:

- `src/api/app_chat.rs` and its route/store/port wiring;
- the associated API and SQL-contract tests;
- the stale console-runtime chat test block.

Retain the `ai_chat_*` and `ai_runtime_*` tables. They remain the persistence
authority from the 2026-07-30 decision and are already consumed by the app
runtime; no data is migrated or deleted by this ADR. With no writer, those
tables stay empty until a future Chat surface is approved.

Chat is **not** part of the current release API surface. Re-introducing it
requires a new ADR that authors the operations into
`docs/schema-registry/frontend-field-contracts.yaml`, regenerates the app
OpenAPI and App SDK, adds dispatch tests, and restores the HTTP store.

## Alternatives

### Author the six operations into the contract and App SDK

Rejected for this release because the UI that consumed them no longer exists.
Shipping a contract and SDK for a feature with no product surface would claim
capability that the product does not have.

### Keep the routes undocumented and mark them experimental

Rejected: an unversioned, uncontracted public route is not "experimental"; it is
an unowned attack surface that the route/OpenAPI guardians cannot verify.

### Drop the Chat persistence tables as well

Rejected: `ai_runtime_invocation*` and the usage-link tables are used by the
app runtime independent of Chat, and dropping the rest would destroy migration
history and data for no current benefit.

## Consequences

- The app API surface shrinks by six operations; no SDK or OpenAPI changes are
  required because none described them.
- `ai_chat_*` tables remain in the contract and baseline; they are inert until
  a future Chat surface is approved.
- `ADR-20260730-own-chat-runtime-postgres-authority` is superseded for the
  HTTP projection; its persistence decision remains in force.
- Product documentation must not describe Chat as an available capability.

## Verification

- `cargo check -p sdkwork-cloudrouter-router-service -p sdkwork-routes-cloudrouter-app-api --lib`
- `cargo test -p sdkwork-cloudrouter-router-service --lib`
- `rg "app_chat|AppChat|/app/v3/api/chat" crates services` returns no matches
- `node scripts/materialize-apis-contracts.mjs --check`
- `python -B -m tools.schema_quality_gate`

## Supersedes / Superseded By

For the Chat HTTP projection, this decision supersedes
`ADR-20260730-own-chat-runtime-postgres-authority`. That ADR's PostgreSQL
ownership decision for the persistence tables remains in force.

No decision currently supersedes this ADR.
