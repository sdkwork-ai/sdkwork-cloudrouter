# Single-Port Dev Topology Design

## Goal

Make single-port integrated startup the default development topology for `sdkwork-clawrouter`
and sibling `sdkwork-api-cloud-gateway`, so product developers no longer need split-mode multi-port
dependency orchestration for normal local work.

## Problem

The current gateway and product development surfaces expose or document split-mode startup paths
that depend on many per-module upstream ports. While `sdkwork-clawrouter` already defaults to an
all-in-one edge server, the surrounding scripts, help text, docs, and sibling `sdkwork-api-cloud-gateway`
defaults still present multi-port split topology as a normal development path. This leaks platform
integration complexity into day-to-day product development, increases port conflicts, and makes the
default local experience harder to reason about and maintain.

## Design Decision

Adopt a strict default rule:

- normal development uses one public entry port;
- dependency capabilities are started together or embedded behind that port;
- split-mode topology is not a default development workflow.

This change is a default-topology refactor, not a hard deletion of all split implementation code.
Low-level split behavior may remain where tests or internal gateway validation still need it, but
it must not remain visible as the standard `dev` path.

## Scope

### In Scope

- `sdkwork-clawrouter` root scripts and help text
- `sdkwork-clawrouter` workspace startup docs and tests that define the default dev topology
- sibling `sdkwork-api-cloud-gateway` default `pnpm dev` behavior and development config template
- related documentation that currently teaches split-mode or many explicit dependency ports as the
  standard local startup path

### Out of Scope

- deleting every split-mode code path from Rust gateway internals
- removing test-only embedded/split coverage used to validate route precedence or proxy behavior
- redesigning every foundation dependency service lifecycle in the workspace

## Target Behavior

### sdkwork-clawrouter

- `pnpm dev` remains single-port and all-in-one
- normal help text and examples describe one entry port only
- split/distributed startup is removed from default-facing product development commands or clearly
  marked as internal validation only

### sdkwork-api-cloud-gateway

- `pnpm dev` becomes single-port-first instead of using the large split upstream template
- default development config no longer requires dozens of upstream base URLs and ports
- split-mode config is demoted to test/internal validation usage rather than being the primary dev
  entrypoint

## Approach Options

### Option A: Change product repo only

Pros:

- smallest immediate edit set
- no sibling-repo coordination

Cons:

- does not solve the upstream source of the split default
- future product repos can still inherit the bad gateway default

Rejected because it treats symptoms, not the topology default itself.

### Option B: Change both repos and keep split only for tests/internal validation

Pros:

- aligns product and gateway defaults
- removes multi-port startup from standard developer workflow
- preserves lower-level regression coverage where it still has value

Cons:

- requires coordinated edits across two repositories
- some tests and docs need to be rewritten to distinguish â€œdefault devâ€?from â€œinternal validationâ€?
Recommended.

### Option C: Hard-delete split support entirely

Pros:

- strongest simplification

Cons:

- high risk of breaking gateway capability tests and validation flows
- more invasive than needed to satisfy the requested topology policy

Rejected for now.

## Architecture

The new architecture is â€œsingle entrypoint first, split hidden behind validation boundariesâ€?

For `sdkwork-clawrouter`, the all-in-one edge runtime at one port remains the public local
contract. Product-facing scripts and docs should describe only that path. For `sdkwork-api-cloud-gateway`,
the default development server should also resolve to a single integrated runtime rather than a
split upstream template. Where embedded appbase routing is already supported, that becomes the
default development shape. Split-mode configuration should move behind explicit test or internal
validation commands, not `pnpm dev`.

## File Strategy

### sdkwork-clawrouter

- update `package.json` script surface only where default/developer-facing commands still expose
  split paths
- update `scripts/run-claw-router-application.mjs` help and mode descriptions
- update `scripts/dev/start-workspace.mjs` help text, dry-run text, and command planning so
  default-facing messaging is single-port-first
- update docs and tests that currently assert split-mode as a normal development path

### sdkwork-api-cloud-gateway

- update `package.json` so `pnpm dev` points at a single-port integrated config path
- replace the development TOML template default with an embedded/single-port development profile
- update README and API-server README so they stop teaching multi-upstream local startup as normal
- update or add tests around default config expectations where needed

## Error Handling And Compatibility

- If a split-only internal command remains, it must be explicitly named as validation/internal and
  must not appear as the standard â€œRunâ€?path.
- Existing split implementation support may remain for tests, but user-facing docs must not imply
  that developers should manage dozens of ports during normal work.
- The change must fail closed if a script still relies on removed default split assumptions.

## Testing Strategy

- `sdkwork-clawrouter`: targeted script/help/dry-run tests proving default startup remains
  all-in-one and single-port oriented
- `sdkwork-api-cloud-gateway`: targeted config or runtime tests proving default dev config is integrated
  and does not require the large split upstream set
- smoke-check dry-run output rather than long-running interactive processes where possible

## Acceptance Criteria

- `sdkwork-clawrouter` default development docs and scripts describe one public dev port
- `sdkwork-api-cloud-gateway` default `pnpm dev` no longer uses the large split upstream template
- split-mode remains, if at all, only in explicit validation/test paths
- no normal developer workflow requires managing the long upstream port list
