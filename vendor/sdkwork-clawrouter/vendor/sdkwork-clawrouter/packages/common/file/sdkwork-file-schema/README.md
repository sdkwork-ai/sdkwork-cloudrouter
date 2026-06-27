# SDKWork File Schema

Canonical database schema definitions and PostgreSQL migration SQL for the
SDKWork file platform.

The schema package keeps database standards testable: core tables, indexes,
unique constraints, non-negative byte checks, append-only usage ledger
protection, storage usage counters and historical snapshots, and
storage-internal field boundaries are all covered by tests. Provider types,
logical bucket scopes, quota policy scopes, and usage counter/snapshot scopes
are enforced as PostgreSQL check constraints from the canonical
`@sdkwork/file-contracts` vocabulary. Upload mode, drive space type, and drive
node type are also enforced with canonical check constraints so API enum
contracts and database state cannot drift. It also defines the storage
reconciliation and garbage-collection governance tables used by backend
operations to audit missing objects, orphan objects, checksum mismatches, and
dry-run deletion jobs.

## SDKWork Documentation Contract

Domain: drive
Capability: file-schema
Package type: node-package
Status: standard

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/file-schema typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
