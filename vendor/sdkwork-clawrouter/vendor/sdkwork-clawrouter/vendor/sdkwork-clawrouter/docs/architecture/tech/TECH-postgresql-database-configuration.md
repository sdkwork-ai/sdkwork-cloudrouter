> Migrated from `docs/installation/postgresql-database-configuration.md` on 2026-06-24.
> Owner: SDKWork maintainers

SDKWork Claw Router uses PostgreSQL for explicit product server development and
production service deployments. Integrated development (`pnpm dev`,
aliases `pnpm dev` and `pnpm dev:server`) uses PostgreSQL by default.
Gateway-backed desktop client commands go through `sdkwork-api-cloud-gateway`;
desktop/runtime local user data remains SQLite by default.

SDKWork Claw Router supports two PostgreSQL configuration paths:

- Integrated and explicit product server development: `pnpm dev`
  (aliases `pnpm dev`, `pnpm dev:server`) and `pnpm dev:server:postgres` use the
  local PostgreSQL profile from `.env.postgres` when present, otherwise
  `.env.postgres.example` for the Claw Router backend service runtime. Use
  `pnpm dev:server:sqlite` or `pnpm dev:browser:sqlite` only when explicit
  product server SQLite behavior is intended. Gateway-backed client commands
  (`pnpm dev:desktop`, `pnpm dev:desktop`, and `pnpm dev:desktop`) do
  not start the product backend service.
- Production environment: do not use `.env.postgres`. Use the protected runtime TOML file, process override file, and secret files from the OS-specific release layout.

The development profile intentionally uses split fields instead of a full
connection URL so every application in the SDKWork app stack has the same
integration shape. At explicit product server startup, the dev launcher
assembles the split fields into the runtime-standard
`SDKWORK_CLAW_DATABASE_URL` and passes that to the Rust services. This does not
change the desktop package default: the desktop local data profile stores
SQLite under `~/.sdkwork/router/data/clawrouter.sqlite` or
`%USERPROFILE%/.sdkwork/router/data/clawrouter.sqlite` on Windows. SQLite also
remains available through explicit product server development entrypoints such
as `pnpm dev:server:sqlite`.

Workspace desktop development commands are gateway-backed client commands; they
do not start a product backend service. Packaged desktop runtime and
desktop local data profile stores SQLite under `~/.sdkwork/router/data/clawrouter.sqlite`.

## Release Runtime Paths

| Target | Runtime TOML | Process overrides | Secret/config root | Data directory | Log directory |
| --- | --- | --- | --- | --- | --- |
| Ubuntu/Linux service | `/etc/sdkwork/router/clawrouter.toml` | `/etc/sdkwork/router/clawrouter.env` | `/etc/sdkwork/router` | `/var/lib/sdkwork/router` | `/var/log/sdkwork/router` |
| Linux private runtime assets | N/A | N/A | `/usr/lib/sdkwork/router` for private binaries and portal assets | `/var/lib/sdkwork/router` | `/var/log/sdkwork/router` |
| Linux archive/container root | config is mounted or generated from package template | host/platform managed | `/opt/sdkwork/router` package root | mounted or `/var/lib/sdkwork/router` | mounted or `/var/log/sdkwork/router` |
| Linux desktop | `~/.sdkwork/router/config/clawrouter.toml` | user process env only | user profile | `~/.sdkwork/router/data` | user/runtime log location |
| Windows service | `%ProgramData%/sdkwork/router/clawrouter.toml` | service process env | `%ProgramData%/sdkwork/router` | `%ProgramData%/sdkwork/router/Data` | service log sink |
| Windows desktop | `%USERPROFILE%/.sdkwork/router/config/clawrouter.toml` | user process env | user profile | `%USERPROFILE%/.sdkwork/router/data` | user log sink |
| macOS service | `/Library/Application Support/sdkwork/router/clawrouter.toml` | launchd environment | `/Library/Application Support/sdkwork/router` | `/Library/Application Support/sdkwork/router` | `/var/log/sdkwork/router` |
| macOS desktop | `~/.sdkwork/router/config/clawrouter.toml` | user process env | user profile | `~/.sdkwork/router/data` | user log sink |

Guides:

- [Development PostgreSQL configuration](./postgresql-development.md)
- [Production PostgreSQL configuration](./postgresql-production.md)

Desktop/runtime local user data remains SQLite by default. Use desktop packages
or explicit product server SQLite dev entrypoints when validating
single-machine local data behavior.

Configuration precedence in development:

1. `SDKWORK_CLAW_DATABASE_URL`
2. Split fields: `SDKWORK_CLAW_DATABASE_ENGINE`, `SDKWORK_CLAW_DATABASE_HOST`, `SDKWORK_CLAW_DATABASE_PORT`, `SDKWORK_CLAW_DATABASE_NAME`, `SDKWORK_CLAW_DATABASE_USERNAME`, `SDKWORK_CLAW_DATABASE_PASSWORD`, and `SDKWORK_CLAW_DATABASE_SSL_MODE`
3. Default local PostgreSQL dev database
4. Explicit SQLite entrypoints, which pass `--database-url sqlite://target/dev/clawrouter.sqlite`

Use the default local PostgreSQL profile for normal development, and use split fields for customized `.env.postgres` files. Use `SDKWORK_CLAW_DATABASE_URL` only as an explicit temporary override.

