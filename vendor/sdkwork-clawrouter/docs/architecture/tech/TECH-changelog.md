> Migrated from `docs/release/CHANGELOG.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Changelog

All notable changes to `sdkwork-clawrouter` release records will be documented here.

## 2026-05-17 - v0.3.0

### Scope

- Adds a commercial runtime and installation hardening slice after the successful `v0.2.0` release.
- No separately published failed `v0.3.0` version existed before this record. The unpublished install/configuration polishing that was initially drafted into the `v0.2.0` notes is consolidated here so the current release record matches the code baseline being published.

### Delivered

- Added a professional TOML runtime configuration surface for server, edge, portal, observability, request limits, provider relay retry/runtime controls, paths, courses, and install metadata.
- Added first-class PostgreSQL structured configuration with host, port, database, username, password file, optional inline password, SSL mode, and max-connection fields; server, service, and container modes default to PostgreSQL while desktop mode keeps SQLite.
- Added the standard optional `[redis]` runtime configuration section to install templates, manifests, native installer layouts, Linux post-install summaries, and installation documentation. Redis is disabled by default, keeps `host`, `port`, and `database` as primary fields, and reserves `url` for advanced managed-endpoint overrides.
- Added runtime body-size limit configuration for admin app writes, admin skill writes, forum writes, and payment callback entrypoints so reverse proxies and application limits can be aligned.
- Added a shared `installConfiguration` manifest section and generated install guide configuration summary so every package publishes the runtime TOML, data directory, database policy, required PostgreSQL fields, password file, first-start commands, and follow-up steps in machine-readable and human-readable form.
- Added a `nativeInstall` manifest section and dry-run build-plan layout for native installers so deployment automation can audit final install roots, runtime config paths, service metadata, permissions, and operator commands before or after package build.
- Updated Debian post-install output to print the runtime TOML, service environment file, PostgreSQL password file, optional Redis password file, systemd service name, and first-start commands immediately after installation.
- Scoped Linux desktop `.deb` packages to desktop behavior: they install the shared TOML template under `/usr/share/sdkwork/router/config/clawrouter.toml.example` and do not create `/etc/sdkwork/router` runtime files or a systemd service.
- Hardened the Linux systemd service unit with a stricter default runtime profile, including systemd-managed state/log/config directories, `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=true`, kernel and control-group protections, native syscall architecture filtering, `UMask=0027`, `LimitNOFILE=65535`, writable data/log directories, and read-only `/etc/sdkwork/router` access for the running process.
- Updated generated package `INSTALL.md` files so desktop native installers use final install paths and include both `ensure` and `refresh-catalog --force` before first startup.
- Added a macOS launchd service runner so `.pkg` service packages run `clawrouterctl ensure` and `clawrouterctl refresh-catalog --force` before replacing the runner with the gateway process.
- Standardized public host-service release asset names on `server` while keeping internal package IDs and deployment mode as `service`; for example `linux-x64-service` now builds `clawrouter-linux-x64-server-0.3.0.deb`.
- Expanded admin and console portal SDK-backed runtime behavior across routing, channels, models, skills, marketing, finance, settlements, dashboards, API keys, billing, and operations surfaces.
- Added SQL-backed dashboard, marketing, app commerce exchange, app routing command/read, app session event, and settlement-support stores across PostgreSQL and SQLite where needed by the new product surfaces.
- Regenerated OpenAPI documents, API contract manifests, frontend schema registry outputs, frontend operation audits, and generated TypeScript SDK files for the updated app/open contracts.
- Updated the release workflow default dependency pin for `sdkwork-sdk-generator` to `c20c147b69453a64535e25fc18032597e8af9e75`, after committing and pushing the sibling generator repository.

### Verification

- `npm test` in `sdkwork-sdk-generator`: 40 test files, 431 tests passed.
- `npm run lint` in `sdkwork-sdk-generator`.
- `git diff --check` in `sdkwork-sdk-generator`.
- `node --check scripts/plan-claw-router-install-packages.mjs`
- `node --check scripts/build-claw-router-native-installer.mjs`
- `node --check scripts/run-claw-router-application.test.mjs`
- `node scripts/plan-claw-router-install-packages.mjs --check --json`
- `node scripts/build-claw-router-native-installer.mjs --package-id linux-x64-service --check --dry-run --json`
- `node scripts/build-claw-router-install-package.mjs --all --check --dry-run --json`
- `node scripts/build-claw-router-native-installer.mjs --all --check --dry-run --json`
- `pnpm app-store:seed:check`
- `cargo test -p sdkwork-claw-config`
- `node --test scripts/run-claw-router-application.test.mjs --test-name-pattern "installation documentation covers release|install package planner covers|install package manifests distinguish|install package builder emits service and container|native installer builder emits apt-installable|native installer builder CLI validates"`
- GitHub Actions `Release Package` run `25969690825`, covering Linux x64, Linux arm64, Windows x64, Windows arm64, macOS x64, and macOS arm64.

### Release Gate Status

- SDKWork dependency repositories are represented by repository ids and pinned refs: `sdkwork-appbase` is clean at `3280447a2166a86b7e20bcfa394611effa0c9ec3`, `sdkwork-core` is clean at `339ab3e063671e0f97db92bf098c9e9d8768d8dd`, `sdkwork-ui` is clean at `a4c90948ab5e43241a8e06303891bdc370702fad`, and `sdkwork-sdk-generator` was committed and pushed at `c20c147b69453a64535e25fc18032597e8af9e75`.
- Local development consumes SDKWork dependencies through native workspace sibling paths; the GitHub release workflow checks out pinned GitHub refs declared in `sdkwork.workflow.json` for release packaging.
- Full `pnpm verify` was not run for this release record because this publication uses the faster focused release checks listed above.
- GitHub release `v0.3.0` is published at `https://github.com/Sdkwork-Cloud/sdkwork-clawrouter/releases/tag/v0.3.0` from commit `ddec86eb884a2b9e2a33f1a9cf608520b5ae5ec2`.
- Release assets were verified after publication: 54 assets uploaded, the six required `server` native installers are present, and no public `-service-0.3.0` artifact names were uploaded.

## 2026-05-16 - v0.2.0

### Scope

- Adds a complete runtime authentication settings capability after the successful `v0.1.0` release.
- No separately published failed version exists after `v0.1.0`; an initial `v0.2.0` package workflow failed before build due to Git LFS budget exhaustion and is folded into this successful release record.

### Delivered

- Added admin-managed auth settings for login methods, QR login, OAuth visibility, recovery methods, registration methods, and verification policy.
- Added app runtime auth settings retrieval so the portal can render login behavior from the active policy instead of a static local matrix.
- Added SQL-backed auth settings stores for SQLite and PostgreSQL and registered them through the product infrastructure modules.
- Enforced auth settings across password, email code, phone code, QR, session bridge, recovery, and registration flows while keeping password-only as the strict default.
- Added portal admin routing and UI for auth settings management.
- Regenerated OpenAPI documents, API contract manifests, schema registry outputs, frontend manifests, and app/backend/open SDK surfaces for the new contracts.
- Updated Rust tests to explicitly opt into non-default auth methods when testing bridge, QR, code login, and registration verification behavior.
- Updated installer CLI tests so SQLite scenarios explicitly run under the desktop deployment profile.
- Added native installer release assets for service and desktop modes: Linux `.deb`, Windows `.msi`, and macOS `.pkg`.
- Updated release packaging so portable archives remain for `archive` and `container`, while native installers are uploaded for `service` and `desktop`.
- Changed server/service/container package defaults to structured PostgreSQL runtime configuration, while desktop packages keep local SQLite by default.
- Updated Linux `.deb` service installation so the package creates `/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/clawrouter.env`, and `/etc/sdkwork/router/database.secret`, then enables but does not start the service until PostgreSQL is configured.
- Simplified English and Chinese installation and initialization guides around `apt install`, protected PostgreSQL TOML/password configuration, `systemctl start clawrouter`, and health checks.
- Standardized the external runtime surface on `clawrouter`, including `clawrouter-*` release assets, the `clawrouter` gateway process, the `clawrouterctl` installer/admin CLI, `clawrouter.service`, and `/opt/sdkwork/router`, `/etc/sdkwork/router`, `/etc/sdkwork/router/clawrouter.env`, `/var/lib/sdkwork/router`, and `/var/log/sdkwork/router` runtime paths.
- Removed release checkout dependency on Git LFS by committing curated runtime skill seed JSON files directly to Git while leaving large ClawHub mirror snapshots as optional LFS data.

### Verification

- `cargo fmt --all`
- `cargo test -p sdkwork-clawrouter-app-api-server --test app_session_route -- --nocapture`
- `cargo test -p sdkwork-clawrouter-router-service --test app_auth_api -- --nocapture`
- `cargo test -p sdkwork-claw-installer --test installer_cli installer_cli_reports_invalid_env_catalog_root_as_machine_readable_config_error -- --nocapture`
- `node scripts/plan-claw-router-install-packages.mjs --check`
- `node scripts/build-claw-router-install-package.mjs --all --check --dry-run --json`
- `node scripts/build-claw-router-native-installer.mjs --all --check --dry-run --json`
- `node scripts/run-claw-router-application.test.mjs`
- `node scripts/release-preflight.mjs --dry-run --json`
- `cargo test -p sdkwork-clawrouter-router-service --test database_installer sqlite_installer_repairs`
- Local Windows WiX fixture build for `windows-x64-desktop` `.msi`
- GitHub Actions `Release Package` run `25957200472`, covering Linux x64, Linux arm64, Windows x64, Windows arm64, macOS x64, and macOS arm64.

### Release Gate Status

- Shared repository gate is satisfied: `sdkwork-appbase` is clean at `3280447`, `sdkwork-core` was committed and pushed at `339ab3e`, and `sdkwork-ui` was committed and pushed at `a4c9094`.
- Full `pnpm verify` was skipped by release-operator instruction for this release attempt.
- Git LFS is no longer a release package build requirement; it is only required when refreshing large ClawHub mirror snapshots.

## 2026-05-15 - v0.1.0

### Scope

- First formal release record for this repository.
- No prior successful release tag existed, so this release aggregates the full baseline from the initial commit through the current release-ready state.

### Delivered

- Added runtime configuration management with OS-standard config paths for server and desktop deployments.
- Made server deployments default to PostgreSQL and block startup when database configuration is missing or still uses placeholder host/password values.
- Made desktop deployments default to SQLite and auto-initialize a platform-appropriate config and data location.
- Added release environment contract tooling so `.env.release` can be generated and validated from the executable contract instead of hand-written.
- Added release preflight checks for environment completeness, root cleanliness, and release-safe configuration values.
- Added manifest-backed install package planning and archive generation for Windows, Linux, and macOS across x64 and arm64.
- Added install package coverage for archive, service, container, and desktop deployment modes.
- Added install initialization smoke coverage to prove the release package can initialize without starting `pnpm dev`.
- Added portal and SDK runtime base URL configuration so gateway, app, backend, and open API surfaces can be addressed explicitly.
- Added repository delivery and LFS seed guards so release validation can fail fast when shared content or seed material is missing.
- Documented release record conventions so future releases can append cleanly without inventing new formats.

### Architecture Capability Impact

- Server and desktop deployments now follow distinct database policies instead of sharing a one-size-fits-all default.
- Release packages carry a single versioned matrix for platform, architecture, and deployment mode, which makes downstream packaging and CI selection deterministic.
- Release configuration is contract-driven, which reduces drift between environment files, runtime behavior, and install package metadata.
- The release flow can be validated through dry-run and smoke-style checks without starting the edge development server.

### Verification

- `node scripts/run-claw-router-application.test.mjs`
- `node scripts/plan-claw-router-install-packages.mjs --check`
- `node scripts/build-claw-router-install-package.mjs --check --dry-run --all`
- `node scripts/smoke-install-package-init.mjs --check --dry-run`

### Risks / Remaining Work

- Full binary release packaging still depends on the broader release environment and should be exercised in a real packaging run before shipping artifacts.
- Shared sibling repositories must remain aligned with their committed `origin/main` revisions before publishing a release.
- Future releases should continue to keep the release environment contract, install package matrix, and runtime configuration help text in sync.

