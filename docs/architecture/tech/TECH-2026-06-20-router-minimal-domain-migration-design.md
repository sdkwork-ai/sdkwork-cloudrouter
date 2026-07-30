# Superseded Minimal-Domain Migration Proposal

Status: superseded  
Owner: clawrouter-platform  
Superseded: 2026-07-30  
Superseded by: [ADR-20260730](../decisions/ADR-20260730-own-chat-runtime-postgres-authority.md)

This unimplemented proposal instructed Claw Router to delete Chat persistence
and delegate it to `sdkwork-kernel`. It is not current architecture and contains
no executable migration, target database contract, or completed SDK/runtime
cutover.

For Chat, Claw Router currently owns the eight-table PostgreSQL authority
defined by the schema registry and ADR above. Memory, generation, agent, MCP,
and skill ownership must be decided by their own current contracts and ADRs;
this retired proposal must not be used as a deletion checklist for them.
