# Changelog

Release notes for the **current** release only. Historical release records are
archived per version under `docs/release/YYYY-MM-DD-vX.Y.Z.md`; this file is
rewritten on every release so it never accumulates prior versions.

- `2026-05-15-v0.1.0.md` — first formal release record.
- `2026-05-16-v0.2.0.md` — runtime authentication settings capability.
- `2026-05-17-v0.3.0.md` — commercial runtime and installation hardening slice.

## 2026-10-17 - v0.4.9

### Scope

- Closes the three packaging defects that the `v0.4.7` and `v0.4.8` runs exposed.
  `v0.4.7` was tagged before its fixes landed, so those fixes had never been
  exercised by a packaging run; `0.4.8` built them and surfaced a second,
  independent WiX defect; `0.4.9` is the version that closes both.
- Supersedes `v0.4.8`, which cleared `WIX0103` on every MSI lane but failed all
  of them with `WIX0091`, and `v0.4.7`, which never built its own fixes.

### Delivered

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
- Namespaced the generated WiX `Directory` identifiers by their owning
  `StandardDirectory` tree. WiX identifiers are global to the whole `.wxs`, but
  the identifier was derived only from the directory name sequence, so the
  `sdkwork` directory that exists under ProgramFiles, ProgramData, and AppData
  produced one repeated `Directory Id` and every MSI lane failed with `WIX0091`
  Duplicate Directory. Each `DirectoryNode` now carries its tree scope and the
  identifier is derived from that scope plus the relative path.
- Made the WiX failure message carry the captured tool output instead of only
  `Command failed: wix build <path>`, so the next MSI failure is diagnosable from
  the job log without re-running locally.
- Staged the H5 surface the install package requires (`efe2a29a`), which the
  `v0.4.7` packaging run also depended on.

### Configuration surface (verified, unchanged)

Install-time customization stays contract-driven and is enforced by
`plan-cloud-router-install-packages.mjs`:

- Ports: `SDKWORK_CLOUDROUTER_*_APPLICATION_*_BIND` per runtime target.
- Database: `databasePolicy` requires `configurableFromFile`, an OS-standard
  config file path, and `SDKWORK_DATABASE_URL` in `envOverrides`. Server,
  service, and container modes default to PostgreSQL; desktop mode keeps SQLite.
- Redis: fourteen `SDKWORK_CLOUDROUTER_REDIS_*` overrides, disabled by default.

### Dependency policy (unchanged)

- Local development consumes SDKWork dependencies through relative workspace
  sibling paths.
- Release packaging resolves every one of the fifty dependencies from its
  repository `main` through `refInput`; no dependency is pinned to a fixed
  branch, tag, or commit.

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
- Mutation checks on both probes: reverting the path fix reproduces `WIX0103`
  on a 434-character path, and dropping the tree scope from the identifier
  reproduces `WIX0091` Duplicate Directory, so neither probe is a constant
  green.
- `node scripts/check-github-workflow-integration.mjs` → ok.

### Known non-blocking gate status

`Verify Application` is red independently of packaging and does not gate the
release. Its `verify` job fails at `pnpm format:rust:check` because the job only
checks out this repository and never materializes the federated dependency
repositories, so Cargo cannot load the `sdkwork-api-log-assembly` manifest;
`e2e` fails for the same missing-dependency reason, and `security-scan` reports
`cargo audit` warnings from transitive crates.

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
