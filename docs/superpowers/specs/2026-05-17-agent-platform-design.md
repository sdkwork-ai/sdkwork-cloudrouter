# Agent Platform Design

## Goal

Build the SDKWork agent standard as a reusable appbase intelligence capability and land the first Claw Router vertical slice for creating, running, auditing, and metering agents.

## Architecture

The standard is contract first. `sdkwork-appbase` owns framework-neutral agent contracts under `packages/common/intelligence`; Claw Router owns product persistence, APIs, generated SDK integration, console/admin surfaces, and billing settlement. The first slice creates a real run lifecycle with typed steps and metering events while keeping dynamic MCP and skill execution behind stable bindings.

## Scope

- Add appbase common intelligence contracts for agent definition, versions, runs, steps, MCP bindings, skill bindings, memory bindings, and metering.
- Extend Claw Router generation-agent run contracts so every run exposes agent identity, run identity, first step, resource usage summary, and metering events.
- Persist agent run metadata and metering linkage into current product tables in the first slice while adding schema registry entries for first-class agent tables.
- Keep dynamic MCP/skill execution as a second-stage runtime concern; first slice standardizes registration, binding, permission, and catalog contracts.

## Non-Goals

- No full MCP process execution in the first slice.
- No sandboxed skill runtime in the first slice.
- No compatibility shims for old agent APIs; this is a new standard surface.

## Product Surfaces

Console users create and test agents, bind model/skill/MCP/memory settings, view run history, and inspect costs. Admin users manage templates, global MCP/skill registries, governance, review, disablement, observability, and cost anomalies.

## Usage And Billing

Agent runtime emits normalized metering events. Claw Router maps them into `ai_usage` rather than creating a parallel ledger. Usage metadata must link `agentId`, `agentVersionId`, `runId`, `stepId`, `skillId`, `mcpServerId`, `toolName`, and `meteringSource`.

