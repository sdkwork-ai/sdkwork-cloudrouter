# SDKWork MCP Hub Technical Architecture

Status: active
Owner: SDKWork maintainers
Updated: 2026-06-26
Specs: ARCHITECTURE_DECISION_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

- Add `TECH-<topic>.md` shards in this directory when the architecture grows beyond one reviewable screen.

## 1. Architecture Overview

## 2. Technology Choices

## 3. System Boundaries And Modules

## 4. Directory And Package Layout

Canonical client package naming follows `NAMING_SPEC.md` with application code `mcp`:

| Client | Directory pattern | Example |
| --- | --- | --- |
| PC | `apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-<capability>` | `sdkwork-mcp-pc-hub` |
| H5 | `apps/sdkwork-mcp-h5/packages/sdkwork-mcp-h5-<capability>` | `sdkwork-mcp-h5-mcp` |
| Flutter | `apps/sdkwork-mcp-flutter-mobile/packages/sdkwork_mcp_flutter_mobile_<capability>` | `sdkwork_mcp_flutter_mobile_core` |

Repository-wide technical architecture: [../../../../docs/architecture/tech/TECH_ARCHITECTURE.md](../../../../docs/architecture/tech/TECH_ARCHITECTURE.md)

## 5. API, SDK, And Data Ownership

## 6. Security, Privacy, And Observability

## 7. Deployment And Runtime Topology

## 8. Architecture Decision Index

## 9. Verification
