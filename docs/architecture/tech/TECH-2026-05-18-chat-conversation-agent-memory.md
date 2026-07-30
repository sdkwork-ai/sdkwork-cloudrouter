# Chat Persistence Implementation Status

Status: in progress  
Owner: clawrouter-platform  
Updated: 2026-07-30  
Design: [First-Party Chat Persistence Design](TECH-2026-05-18-chat-conversation-agent-memory-design.md)

## Completed In Current Worktree

- [x] Register the eight current Chat/runtime tables in the schema registry.
- [x] Materialize the PostgreSQL contract, table registry, manifest, baseline,
      generated schema, and table catalog.
- [x] Add transactional migration `0004` with bounded DDL timeouts and partial
      schema rejection.
- [x] Bind tenant, organization, and user scope in Chat reads, joins, and
      mutations.
- [x] Replace `COUNT(*) + 1` sequence allocation with a locked conversation
      aggregate, checked counters, scoped unique indexes, and atomic context
      snapshot allocation.
- [x] Persist turn mode, the output last-item pointer, and a bounded 1024
      character conversation preview.
- [x] Add schema readiness for materialized tables, lifecycle versions,
      critical columns/indexes, and the runtime ID lease.
- [x] Add static SQL and database-contract regression tests.

## Remaining Release Gates

- [ ] Run the migration and store suites against an isolated real PostgreSQL
      database from the release candidate.
- [ ] Prove concurrent creation/completion across at least two process
      instances without sequence collisions, deadlocks, or lost updates.
- [ ] Complete cursor/keyset pagination or approve a measured bounded-volume
      contract for high-growth message history.
- [ ] Prove OpenAPI, generated app SDK, frontend consumption, and field
      contracts agree with the current routes and pagination envelope.
- [ ] Capture query plans, load/soak, RSS ceiling, failover, backup/restore, and
      drift evidence.

Agent, memory, runtime-event, artifact, and additional Chat lifecycle features
are separate product scopes. They are not unfinished rows in the current
eight-table implementation and must receive their own contracts before work.
