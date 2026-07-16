# SDKWork File SDK Generation

Canonical SDK generation manifest and OpenAPI artifact exporter for the
SDKWork file platform.

This package does not generate code itself. It gives the repository-standard
generator a stable, testable source for app/backend TypeScript SDK targets,
source OpenAPI documents, package names, client names, API prefixes, and
artifact filenames.

The generation manifest does not trust arbitrary OpenAPI inputs. Its standard
validation delegates to `@sdkwork/file-api-contracts`, so source documents must
pass route, operation, typed response, command request, surface pruning, and
schema `$ref` resolution rules before they are accepted as SDK generation
inputs.

## Artifact Plan

`createFileSdkArtifactWritePlan()` returns deterministic files for the file
package-owned SDK family layout:

- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-app-sdk/sdk-manifest.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-app-sdk/README.md`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-app-sdk/openapi/file-app-sdk.openapi.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-app-sdk/openapi/file-app-sdk.sdkgen.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-backend-sdk/sdk-manifest.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-backend-sdk/README.md`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-backend-sdk/openapi/file-backend-sdk.openapi.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-backend-sdk/openapi/file-backend-sdk.sdkgen.json`
- `packages/common/file/sdkwork-file-sdk-generation/generated/sdks/file-sdk-generation-manifest.json`

Every planned file carries a SHA-256 hash and stable content. The plan contains
no timestamp, no raw HTTP settings, no auth headers, and no local SDK fork path.
The OpenAPI artifacts preserve typed command and read/list response schemas,
including storage-safe app file/drive/usage responses and backend admin storage
resource envelopes, so downstream generated SDKs do not need package-local DTO
forks. They also preserve canonical path parameters derived from templated
routes and adapter-facing query parameters for request IDs, pagination, filters,
and storage usage scopes, giving generated SDK methods explicit input shapes.
Every exported operation has a typed JSON `200` response, and every command
operation has a JSON request body with `requestId`, so generated SDK packages do
not need weak fallback DTOs or transport-specific method overloads.
Each surface artifact includes only component schemas reachable from that
surface's operations, preventing app SDK generation from carrying backend admin
governance types.

## Materialization and Drift Check

`materializeFileSdkArtifacts()` applies the deterministic artifact plan through
an injected file host. It only reads and writes files that appear in the plan,
never traverses the filesystem, and never deletes unplanned files.

`createNodeFileSdkArtifactHost()` provides the standard Node filesystem host for
repository tooling. It resolves artifact paths under the configured workspace
root, creates parent directories when applying files, and rejects direct reads
or writes that try to escape the workspace root.

Use `mode: "check"` or `verifyFileSdkArtifacts()` for drift detection. Missing
planned files are reported as `create`, changed planned files are reported as
`update`, and matching planned files are reported as `unchanged`. Check mode
does not write.

Use `mode: "apply"` to create or update only the planned files. Before any
write, the materializer rejects unsafe plans with absolute paths, path traversal,
paths outside the root directory, duplicate paths, or stale content hashes.

## Repository Commands

The repository exposes one standard CLI for SDK family artifacts:

- `pnpm.cmd sdk:file:artifacts:check -- --json`
- `pnpm.cmd sdk:file:artifacts:write -- --json`

The package also exposes local equivalents:

- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-generation artifacts:check -- --json`
- `pnpm.cmd --dir packages/common/file/sdkwork-file-sdk-generation artifacts:write -- --json`

`check` exits with code `1` when any planned artifact is missing or drifted and
does not write files. `write` applies only the deterministic plan and exits with
code `0` when the plan is materialized. Both commands use the same safe
materializer, so existing unrelated SDK directories such as `sdks/clawrouter-*`
are not read, rewritten, or deleted. The file SDK package does not materialize
`sdks/file-*` under the ClawRouter application SDK workspace; ClawRouter's
application-owned `sdks/` tree remains reserved for the three ClawRouter SDK
families.

## SDKWork Documentation Contract

Domain: drive
Capability: file-sdk-generation
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

- `pnpm --filter @sdkwork/file-sdk-generation typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
