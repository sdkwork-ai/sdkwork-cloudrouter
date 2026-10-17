# Changelog

Release notes for the **current** release only. Historical release records are
archived per version under `docs/release/YYYY-MM-DD-vX.Y.Z.md`; this file is
rewritten on every release so it never accumulates prior versions.

- `2026-05-15-v0.1.0.md` — first formal release record.
- `2026-05-16-v0.2.0.md` — runtime authentication settings capability.
- `2026-05-17-v0.3.0.md` — commercial runtime and installation hardening slice.

## 2026-10-17 - v0.4.11

### Scope

- Closes the packaging defect that the `v0.4.9` run left open, and repairs the
  `Verify Application` gate so it fails for real reasons instead of structural
  ones. `v0.4.7` was tagged before its fixes landed, `v0.4.8` surfaced a second
  WiX defect behind the first, and `v0.4.9` cleared the cross-root identifier
  collision while leaving the derivation truncated.
- Supersedes `v0.4.10`, which carries the complete `Directory` identifier fix but
  inherits the unrepaired CI gate described below.
- Materializes the fifty federated SDKWork dependency repositories inside
  `Verify Application`, and stops the packaging plan from aborting the whole
  package matrix when no deployment environment is selected. Together these are
  what let the twenty-two packaging targets run at all: before this release the
  `v0.4.10` packaging run produced zero packages, because its plan job failed
  before a single package job started.
- Ships the DeepSeek-compatible web tools relay on the `/v1` ingress, and the
  mobile console tab bar alignment across the mini-program, H5, and Flutter
  surfaces.

### Delivered

#### Packaging

- Declared `sdkwork-aiot` in `sdkwork.workflow.json` `dependencies[]` and in the
  `package.yml` `dependency_refs_json` map. It was the only one of the fifty
  federated repositories the container image plan never declared, and the plan
  validates a database module for every declared repository, so a fresh clone
  failed the container prerequisite check before any build step ran.
- Shortened the Windows MSI payload source path. The generated `cloudrouter.wxs`
  pointed every `<File Source>` at the full logical payload path; with the deep
  SDK archive trees that reached 477 characters and overflowed the Win32 path
  limit, failing with `WIX0103` for files that exist. Payload files are now
  staged under a stable hashed id so the source path is constant-length, and
  the installed name moved to the `<File Name>` attribute while the directory
  tree is still carried by the `Directory` nodes.
- Derived the generated WiX `Directory` identifiers from the full in-tree path.
  WiX identifiers are global to the whole `.wxs`, but the identifier hashed the
  directory name sequence minus its last segment. The first repair namespaced it
  by owning `StandardDirectory` tree, which cleared the cross-root collision but
  left every sibling below a shared parent sharing one identifier: on a
  134-file payload, 143 directories collapsed onto 84 identifiers and all four
  MSI lanes failed with `WIX0091`. Each `DirectoryNode` now carries its tree
  scope and its own accumulated path, and the identifier is derived from both.
- Made the WiX failure message carry the captured tool output instead of only
  `Command failed: wix build <path>`, so the next MSI failure is diagnosable from
  the job log without re-running locally.
- Staged the H5 surface the install package requires (`efe2a29a`), which the
  `v0.4.7` packaging run also depended on.

#### CI gate repair

- Materialized the federated dependency repositories in every `Verify
  Application` job. The Cargo workspace and the pnpm workspace both address
  their SDKWork dependencies by relative path (`../sdkwork-log/crates/...`,
  `../sdkwork-iam/apps/...`), but the job only ran `actions/checkout` on this
  repository, so none of those directories existed on the runner. `cargo
  metadata` failed to read `../sdkwork-log/crates/sdkwork-api-log-assembly/Cargo.toml`,
  which failed `format:rust:check` and `cargo audit`; the Playwright `e2e`
  webServer failed for the same reason on
  `../sdkwork-iam/scripts/dev/create-dev-bootstrap-access-token-env.mjs`. Each
  job now checks out the workflow framework, asks it for the dependency
  checkout plan derived from `sdkwork.workflow.json`, and runs the framework's
  `checkout-dependencies` action. `sdkwork-agents` records its `apps/` tree as a
  submodule whose URL is SSH, which an HTTPS-only runner cannot initialize, so
  `git@github.com:` is rewritten to `https://github.com/` first. The shared
  sequence lives in `.github/actions/materialize-dependencies/action.yml`.
- Made deployment strictly opt-in in `package.yml`. `deploy` became true for
  every `release`-triggered run, while `sdkwork.workflow.json` declares no
  deployment environments, so the plan job aborted with `Deployment was
  requested but no deployment matched the selected package matrix` and all
  twenty-two package jobs were skipped. `deploy` now follows only the explicit
  `workflow_dispatch` input.
- Repointed the supply-chain SBOM step from `anchore/syft-action` to
  `anchore/sbom-action`. The old repository now returns 404, so the job failed
  during `Set up job` before any of its own steps ran — the job had been
  reporting red for a reason unrelated to anything it checks. The replacement is
  the same action under its current name and takes the same inputs.
- Locked `rustls` to 0.23.46 and `yoke-derive` to 0.8.4, clearing four
  `rustls` advisories (RUSTSEC-2026-0346/0347/0348/0349) and the `yoke-derive`
  yanked-release warning by upgrade rather than by suppression.
- Added `.cargo/audit.toml` recording the six advisories that cannot be
  resolved in this repository, each with the reason and the upstream change it
  waits on: `rsa` has no patched release (RUSTSEC-2023-0071); `zip` needs 9.0.0
  but `sdkwork-drive` pins `zip = "8"` (RUSTSEC-2026-0367/0368/0369);
  `protobuf` needs 3.7.2 but `prometheus` 0.13.4 pins `protobuf = "2"`
  (RUSTSEC-2024-0437); `paste` and `unsafe-libyaml` are unmaintained transitive
  crates (RUSTSEC-2024-0436, RUSTSEC-2024-0449). Nothing that `cargo update
  --precise` can resolve is suppressed.
- Regenerated `generated/audit/standard-alignment-facts.json`, whose facts
  fingerprint had drifted from `verify.yml` and from the current install-package
  target count.

#### Runtime

- Added the DeepSeek-compatible web tools relay on the `/v1` ingress:
  `POST /v1/tools/search` and `POST /v1/tools/fetch`. Both mirror DeepSeek's
  published request and response schemas and its error statuses
  (400/401/402/403/404/408/413/429/500/504), route through the relay chain to a
  `deepseek` upstream account, and bill per successful request as `api_request`.
  The taxonomy, the routing seed, the group grant, the single-arm classifier,
  the catalog projection, and the ledger entry were added together, so the
  operation is reachable end to end rather than only declared.

#### Mobile console surfaces

- Aligned the console tab bar across the mini-program, H5, and Flutter surfaces
  on the single authority `CLOUDROUTER_CONSOLE_TABS`, instead of each surface
  hand-writing its own order. All three now derive their shell tabs from the
  contract.
- Gave every tab a filled/outline icon pair sharing one glyph, so the selected
  state is no longer carried by colour alone, and generated the eight
  mini-program PNG assets from `scripts/generate-tabbar-icons.py` rather than
  committing them by hand.

### Configuration surface (verified, unchanged)

Install-time customization stays contract-driven and is enforced by
`plan-cloud-router-install-packages.mjs`:

- Ports: `SDKWORK_CLOUDROUTER_*_APPLICATION_*_BIND` per runtime target.
- Database: `databasePolicy` requires `configurableFromFile`, an OS-standard
  config file path, and `SDKWORK_DATABASE_URL` in `envOverrides`. Server,
  service, and container modes default to PostgreSQL; desktop mode keeps SQLite.
- Redis: fourteen `SDKWORK_CLOUDROUTER_REDIS_*` overrides, disabled by default.

### Verification

- `node scripts/plan-cloud-router-install-packages.mjs --check` → 24 packages,
  validation passed.
- `pnpm check:packaging` → all native installer build plans validated.
- MSI path regression probe (`.sdkwork/evidence/msi-path-probe.mjs`) with WiX
  5.0.2, the same version the runner installs: a 364-character logical payload
  path produces 101/102-character `<File Source>` paths and the package builds.
- MSI duplicate-identifier probe (`.sdkwork/evidence/msi-duplicate-directory-probe.mjs`)
  with the same WiX: a payload that places `sdkwork` under all three
  `StandardDirectory` trees yields 23 unique `Directory` identifiers with no
  duplicates, and the package builds.
- Mutation checks on all three probes: reverting the path fix reproduces
  `WIX0103` on a 434-character path, dropping the tree scope from the identifier
  reproduces `WIX0091`, and restoring the truncated derivation reproduces
  `WIX0091` with 81 unique identifiers for 143 directories, so no probe is a
  constant green.
- MSI scale probe (`.sdkwork/evidence/msi-scale-probe.mjs`): a 134-file payload
  across all three roots and a deep SDK archive tree yields 415 globally unique
  WiX identifiers and builds. The small probes were not sufficient — a six-file
  payload produced no collision, and only at scale did the truncated identifier
  derivation show up, as 143 directories mapping to 84 identifiers.
- `node scripts/check-github-workflow-integration.mjs` → ok.
- `node scripts/plan-cloud-router-install-packages.mjs --check` re-run after the
  workflow change → 24 packages, validation passed, including the four Windows
  lanes (`windows-x64-desktop`, `windows-x64-service`, `windows-arm64-desktop`,
  `windows-arm64-service`).
- `pnpm install:native:check` → every native installer build plan validated.
- `pnpm check:package-content` → PASS; `pnpm check:portal-dist` → PASS
  (39 asset references resolve).
- H5, mini-program, and shared-family contract suites → 10, 12, and 9 tests
  passing respectively.
- Submodules refreshed to each upstream `main` head: `external/cc-switch`
  `968794e3` → `73f37c4b`, `external/new-api` `e2c7aa7b` → `5c31c1fa`,
  `external/sub2api` `5253bb72` → `b0a02a33`.

### Dependency policy (unchanged)

- Local development consumes SDKWork dependencies through relative workspace
  sibling paths.
- Release packaging resolves every one of the fifty dependencies from its
  repository `main` through `refInput`; no dependency is pinned to a fixed
  branch, tag, or commit. No repository variable overrides any `refInput`, so
  `sdkwork.workflow.json` resolves all fifty to `main`.

### Known non-blocking gate status

`Verify Application` no longer fails for the missing-dependency reason described
in earlier drafts of this release; that defect is fixed above. It still stops at
`pnpm check:alignment`, which runs the standard-alignment audit in strict mode
and exits non-zero while any P0 fact remains pending. Four P0 facts are pending
and none of them is a regression introduced by this release:

- `p0-client-local-sqlite-runtime` — the desktop target still runs against a
  server-side database; there is no client-local SQLite runtime.
- `p0-redis-ha-manifest` — `deployments/kubernetes/cloud-router-redis.yaml`
  declares three replicas with Sentinel, but the runtime does not support
  Sentinel discovery, so the deployment is not actually HA.
- `p0-table-count-consistency` — cloud-router-owned table counts drift across
  DDL (77), the registry (38), and `schema.yaml` (0).
- `p0-high-traffic-table-partition` — `ai_request_trace`,
  `ai_routing_decision_log`, and `ai_usage` are not partitioned; this is
  deliberately blocked until the idempotency, archive-reconciliation, and
  rollback gates in `TECH-35` pass.

The blocking alignment guardian itself passes (65 passed, 0 failed, 0 blocking);
only the strict P0 backlog fails. Packaging and release do not depend on this
job.

### Risks / Remaining Work

- The four container lanes failed in the `0.4.8` run for a reason outside this
  repository: 181 `TS2307` errors inside `sdkwork-drive`, whose generated SDK
  sources were gitignored and therefore absent from a cold checkout. That
  repository committed the missing generated sources in `6c2f95f` after this
  run started, so re-running the failed lanes is expected to clear them; no
  change in this repository can affect it.
- Container image publication still requires `SDKWORK_CONTAINER_REGISTRY_USERNAME`
  and `SDKWORK_CONTAINER_REGISTRY_PASSWORD`; without them the container lane
  builds the install package but cannot push an image.
- `cargo check --workspace --all-targets` is red on `main` independently of this
  release (`settlements-dashboard-repository-sqlx` test target missing a
  `[dev-dependencies]` entry); the library surface is checked without
  `--all-targets`.
