# Superseded Kernel Chat Mapping Proposal

Status: superseded  
Owner: clawrouter-platform  
Superseded: 2026-07-30  
Superseded by: [ADR-20260730](../decisions/ADR-20260730-own-chat-runtime-postgres-authority.md)

The proposed Chat transfer to `sdkwork-kernel` was never implemented and is no
longer a current field or ownership authority. Claw Router's current Chat schema
and behavior are documented in
[`TECH-2026-05-18-chat-conversation-agent-memory-design.md`](TECH-2026-05-18-chat-conversation-agent-memory-design.md).

A future transfer requires a new reviewed ADR, a published target database and
API/SDK authority, explicit migration/cutover semantics, and end-to-end
verification. No compatibility mirror or implied kernel ownership exists today.
