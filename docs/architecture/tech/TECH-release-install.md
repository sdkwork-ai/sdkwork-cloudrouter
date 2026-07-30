> Migrated from `docs/installation/en-US/release-install.md` on 2026-06-24.
> Owner: SDKWork maintainers

This guide explains how to install SDKWork Claw Router from a formal release package. The current release version comes from [docs/release/VERSION.md](../../release/VERSION.md); the current version is `0.3.0`.

Use the platform-native installers for the fastest deployment path:

- Ubuntu/Debian: install the `.deb` package with `apt install ./...deb`.
- Windows: install the `.msi` package with `msiexec` or the Windows installer UI.
- macOS: install the `.pkg` package with `installer`.

Use `archive` packages only when you need a portable directory layout that is managed by your own deployment scripts.

## 1. Choose The Right Package

Package IDs use three dimensions:

```text
<platform>-<architecture>-<deploymentMode>
```

Service package IDs keep the internal `service` deployment mode because they drive systemd,
launchd, and Windows service integration. Public release asset names use `server` for that
same mode, for example `linux-x64-service` builds `clawrouter-linux-x64-server-0.3.0.deb`.

Supported platforms:

- `windows`
- `linux`
- `macos`

Supported architectures:

- `x64`
- `arm64`

Supported deployment modes:

- `archive`: portable server directory, PostgreSQL by default.
- `service`: host service installer, PostgreSQL by default.
- `container`: container build package, PostgreSQL by default; mount TOML configuration and secrets.
- `desktop`: single-machine installer, SQLite by default.

Common package names:

```text
clawrouter-linux-x64-server-0.3.0.deb
clawrouter-linux-x64-desktop-0.3.0.deb
clawrouter-windows-x64-server-0.3.0.msi
clawrouter-windows-x64-desktop-0.3.0.msi
clawrouter-macos-arm64-server-0.3.0.pkg
clawrouter-macos-arm64-desktop-0.3.0.pkg
clawrouter-linux-x64-archive-0.3.0.tar.gz
clawrouter-windows-x64-archive-0.3.0.zip
```

From a source checkout, inspect the full matrix:

```bash
node scripts/plan-claw-router-install-packages.mjs --json
```

Build a Linux x64 service release from a source checkout:

```bash
pnpm release:env:write -- --check
pnpm release:env:write -- --force
pnpm build
pnpm install:package:build -- --package-id linux-x64-service
```

The resulting Ubuntu/Debian package uses the public asset name
`clawrouter-linux-x64-server-0.3.0.deb`.

## 2. Fast Install Recipes

### Ubuntu/Debian Service

Use this path for a long-running server on Ubuntu or Debian:

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo editor /etc/sdkwork/router/database.secret
sudo systemctl start clawrouter
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

The `.deb` package creates the `sdkwork` system user, `/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/clawrouter.env`, `/etc/sdkwork/router/database.secret`, `/var/lib/sdkwork/router`, `/var/log/sdkwork/router`, and the systemd unit. On systemd hosts it enables `clawrouter.service` during installation but does not start it until the operator configures PostgreSQL. The first service start runs `clawrouterctl ensure` and `clawrouterctl refresh-catalog --force` automatically from `ExecStartPre`. The generated systemd unit uses a restricted runtime profile with `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=true`, systemd-managed state/log/config directories, kernel and control-group protections, native syscall architecture filtering, and `LimitNOFILE=65535`. The service can write data and logs, while `/etc/sdkwork/router` remains read-only to the running process.

The post-install output prints a short configuration summary with the runtime TOML, service environment file, PostgreSQL password file, service name, and first-start commands:

```text
Runtime TOML: /etc/sdkwork/router/clawrouter.toml
Service environment: /etc/sdkwork/router/clawrouter.env
PostgreSQL password file: /etc/sdkwork/router/database.secret
Systemd service: clawrouter.service
```

The default server database configuration is external PostgreSQL:

```toml
[database]
engine = "postgresql"
host = "db.example.com"
port = 5432
database = "sdkwork_ai_prod"
username = "sdkwork_ai_prod"
password_file = "/etc/sdkwork/router/database.secret"
# password = "change-me"
ssl_mode = "require"
max_connections = 16

[observability]
log_filter = "info"
log_format = "compact"
log_ansi = false
log_target = true
log_thread_names = false
log_thread_ids = false

[services.gateway]
bind = "0.0.0.0:18080"

[services.admin_api]
bind = "0.0.0.0:18081"

[services.app_api]
bind = "0.0.0.0:18082"

[server]
bind = "0.0.0.0:3900"
external_scheme = "http"
trust_forwarded_headers = false

[edge]
enabled = true
gateway_base_url = "http://127.0.0.1:18080"
backend_api_base_url = "http://127.0.0.1:18081"
app_api_base_url = "http://127.0.0.1:18082"
portal_base_url = "http://127.0.0.1:3901"
portal_static_dist = "/usr/lib/sdkwork/router/portal/dist"
cors_allowed_origins = []
upstream_request_timeout_millis = 30000
upstream_ready_timeout_millis = 2000

[portal.public]
api_base_url = "/v1"
open_api_base_url = "/v1"
app_api_base_url = "/app/v3/api"
backend_api_base_url = "/backend/v3/api"
tool_api_enabled = false

[portal.static]
html_cache_control = "no-store"
asset_cache_control = "public, max-age=31536000, immutable"

[portal.security]
hsts_enabled = false
hsts_max_age_seconds = 31536000
hsts_include_subdomains = true
hsts_preload = false
csp_frame_src = ["https://player.bilibili.com"]

[portal.tools]
rate_limit_requests = 120
rate_limit_window_seconds = 60
max_body_bytes = 1048576
sdk_archive_root = "/usr/lib/sdkwork/router/portal/dist/sdk-archives"

[provider_relay.openai]
# base_url = "https://api.openai.com/v1"
# bearer_token_file = "/etc/sdkwork/router/openai-relay.secret"

[provider_relay.runtime]
response_timeout_millis = 120000
health_probe_timeout_millis = 10000
catalog_refresh_interval_millis = 5000
circuit_breaker_recovery_window_millis = 60000
failure_strategy = "failover"

[provider_relay.retry]
max_attempts = 2
retryable_status_codes = [429, 500, 502, 503, 504]
backoff_millis = 0

[paths]
data_directory = "/var/lib/sdkwork/router"

[request_limits]
admin_app_json_body_max_bytes = 131072
admin_skill_json_body_max_bytes = 65536
forum_json_body_max_bytes = 262144
payment_callback_body_max_bytes = 65536

[runtime]
deployment_mode = "server"
```

Edit `/etc/sdkwork/router/clawrouter.toml` before first start. For most service deployments, keep the password in `/etc/sdkwork/router/database.secret`:

```bash
sudo install -o root -g sdkwork -m 0640 /dev/null /etc/sdkwork/router/database.secret
sudo editor /etc/sdkwork/router/database.secret
```

The package-created `database.secret` contains the placeholder `change-me`.
Replace it with the real PostgreSQL password before starting the service.
Startup rejects server configurations that still use `db.example.com` or
`change-me`. `password_file` may be absolute, relative to `clawrouter.toml`, or
use `${VAR}`, `$VAR`, `%VAR%`, or `~` expansion for platform-managed secret
paths.

For controlled deployments where the TOML file itself is managed as a secret-bearing file, `password` may be configured directly:

```toml
[database]
engine = "postgresql"
host = "db.internal"
port = 5432
database = "sdkwork_ai_prod"
username = "sdkwork_ai_prod"
password = "real-password"
ssl_mode = "require"
max_connections = 16

[runtime]
deployment_mode = "server"
```

`SDKWORK_DATABASE_URL` remains available in `/etc/sdkwork/router/clawrouter.env` only as an explicit operator override for emergency operations or platform-managed secret injection.

The `.deb` post-install script creates:

- `/usr/bin/clawrouter`
- `/usr/bin/clawrouterctl`
- `/usr/lib/sdkwork/router`
- `/etc/sdkwork/router`
- `/etc/sdkwork/router/clawrouter.env`
- `/etc/sdkwork/router/database.secret`
- `/var/lib/sdkwork/router`
- `/var/log/sdkwork/router`
- `/lib/systemd/system/clawrouter.service` for `service` packages

Linux `.deb` payloads follow standard system locations: immutable private runtime assets live under `/usr/lib/sdkwork/router`, public operator commands under `/usr/bin`, service configuration under `/etc/sdkwork/router`, mutable state under `/var/lib/sdkwork/router`, and logs under `/var/log/sdkwork/router`. Service config files and templates are owned by `root:sdkwork` with `0640` file modes; `/etc/sdkwork/router`, `/var/lib/sdkwork/router`, and `/var/log/sdkwork/router` use `0750` directory modes.

Read startup logs and capture the first admin password if initialization happened during startup:

```bash
sudo journalctl -u clawrouter -n 200 --no-pager
```

### Linux Desktop

Use this path for a local Linux trial with SQLite:

```bash
sudo apt install ./clawrouter-linux-x64-desktop-0.3.0.deb
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

The desktop profile uses the current OS user's config and data directories and does not require PostgreSQL unless you explicitly configure it. The Linux desktop `.deb` installs the shared template under `/usr/share/sdkwork/router/config/clawrouter.toml.example`; it does not create `/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/database.secret`, or a systemd service.

### Windows Desktop Or Service Files

Install the MSI:

```powershell
msiexec /i .\clawrouter-windows-x64-desktop-0.3.0.msi
```

Default install root:

```text
<install-root>
```

Initialize and start from an elevated PowerShell when using a server/service profile, or from a normal PowerShell for a desktop profile:

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Set-Location $installRoot
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
.\bin\clawrouter.exe
```

For Windows server/service deployment, set PostgreSQL in the runtime TOML before starting the gateway. A protected process override remains available when the service manager injects secrets:

```powershell
$env:SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod"
```

Windows `.msi` packages keep program binaries under `%ProgramFiles%/sdkwork/router` and shared templates under `%ProgramData%/sdkwork/router`. The native manifest records inherited ProgramData ACLs for service templates, runtime TOML, password files, and data directories. Desktop runtime files are created during user initialization under `%USERPROFILE%/.sdkwork/router/config` and `%USERPROFILE%/.sdkwork/router/data`, using the current user's profile ACLs.

### macOS Desktop Or Service Files

Install the package:

```bash
sudo installer -pkg clawrouter-macos-arm64-desktop-0.3.0.pkg -target /
```

Default runtime files:

```text
Binaries: /opt/sdkwork/router/bin
Desktop config template: /usr/local/share/sdkwork/router/config/clawrouter.toml.example
Desktop runtime config: ~/.sdkwork/router/config/clawrouter.toml
Service config template: /Library/Application Support/sdkwork/router/clawrouter.toml.example
Service plist for service package: /Library/LaunchDaemons/com.sdkwork.clawrouter.plist
Service runner for service package: /Library/Application Support/sdkwork/router/service/macos/clawrouter-service-runner
```

Initialize and start:

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

For macOS service packages, launchd starts the service runner. The runner executes `clawrouterctl ensure` and `clawrouterctl refresh-catalog --force`, then replaces itself with the gateway process.

macOS service packages install service runtime files under `/Library/Application Support/sdkwork/router` with `root:wheel` ownership, `0750` on the service root, `0640` on service templates and copied runtime TOML, and `0644` on `/Library/LaunchDaemons/com.sdkwork.clawrouter.plist`. macOS desktop packages keep runtime config and local SQLite data under `~/.sdkwork/router`.

### Portable Archive

Use archive packages only when your deployment system manages files, service registration, writable directories, and secrets:

Linux/macOS:

```bash
mkdir -p /opt/sdkwork/router
tar -xzf clawrouter-linux-x64-archive-0.3.0.tar.gz -C /opt/sdkwork/router
cd /opt/sdkwork/router
cp .env.release.example .env.release
editor .env.release
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
./bin/clawrouter
```

Windows:

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Expand-Archive .\clawrouter-windows-x64-archive-0.3.0.zip -DestinationPath $installRoot
Set-Location $installRoot
Copy-Item .env.release.example .env.release
notepad .env.release
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
.\bin\clawrouter.exe
```

## 3. Package Contents

Release packages include the runtime files needed to start Claw Router:

- `bin/clawrouter` or `bin/clawrouter.exe`
- `bin/clawrouterctl` or `bin/clawrouterctl.exe`
- `portal/dist`
- `portal/dist/sdk-archives`
- `.env.release.example`
- `config/clawrouter.toml.example`
- `INSTALL.md`
- `install-manifest.json`

`service` and `desktop` release assets are platform-native installers:

- Linux: `.deb`
- Windows: `.msi`
- macOS: `.pkg`

`archive` and `container` release assets remain portable `.tar.gz` or `.zip` packages.

Every package manifest includes an `installConfiguration` section with the runtime TOML, template, database policy, required fields, password path, first-start commands, and next steps. Native installer manifests also include `nativeInstall`, a machine-readable final install layout covering paths such as `/usr/bin/clawrouter`, `/usr/lib/sdkwork/router/portal/dist`, `/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/database.secret`, `/lib/systemd/system/clawrouter.service`, service startup policy, permissions, and operator commands. Use these fields for deployment automation instead of scraping `INSTALL.md`.

Never package or commit `.env.release`. Archive deployments may generate it on the target host, while Linux service deployments use `/etc/sdkwork/router/clawrouter.env` for protected process overrides and `/etc/sdkwork/router/clawrouter.toml` for the primary runtime configuration. Keep `PORTAL_PUBLIC_*` values browser-safe; do not put database passwords, provider secrets, or admin credentials in `PORTAL_PUBLIC_*` variables.

## 4. Database Policy

`desktop` packages use SQLite by default:

```text
Windows: %USERPROFILE%/.sdkwork/router/data/clawrouter.sqlite
Linux: ~/.sdkwork/router/data/clawrouter.sqlite
macOS: ~/.sdkwork/router/data/clawrouter.sqlite
```

This desktop SQLite policy is independent from the explicit product server PostgreSQL development profile used by `pnpm dev`, `pnpm dev:server`, and `pnpm dev:server:postgres` for the backend service runtime. Gateway-backed client commands such as `pnpm dev:desktop` and `pnpm dev:desktop:sqlite` run through `sdkwork-api-cloud-gateway` and do not start a Claw Router backend service. Desktop packages must not require PostgreSQL for first run unless the user explicitly configures an external database.

`archive`, `service`, and `container` packages use PostgreSQL by default. Configure PostgreSQL with structured TOML fields: `host`, `port`, `database`, `username`, and either `password_file` or `password`. Keep `password_file` as the normal production path. Use direct `password` only when `clawrouter.toml` is protected as a secret-bearing file.

Redis is part of the same runtime TOML standard. It is enabled and required by default for `archive`, `service`, and `container` server packages:

```toml
[redis]
enabled = true
host = "redis.example.com"
port = 6379
database = 0
# username = "default"
# url = "redis://redis.example.com:6379/0"
# password_file = "/etc/sdkwork/router/redis.secret"
# password = "change-me"
key_prefix = "clawrouter"
tls = false
max_connections = 16
connect_timeout_millis = 2000
command_timeout_millis = 1000
pool_idle_timeout_seconds = 60
```

Keep `[redis].enabled = true` for server deployments and set `host`, `port`, and `database` before first startup; use `url` only as an advanced override for managed Redis endpoints. Prefer `password_file` over direct `password`. Linux service installs use `/etc/sdkwork/router/redis.secret`; container packages mount `/run/secrets/sdkwork/router/redis-password`. Desktop packages keep Redis optional and disabled by default.

`[edge]` owns the packaged Rust edge server, upstream service targets, portal static root, upstream timeouts, and the extra CORS origin allowlist. Leave `cors_allowed_origins` empty for same-origin packages; use explicit HTTP/HTTPS origins only when an external trusted portal or CDN must call the edge API from a different browser origin. Wildcards and origins with paths are rejected. `[portal.static]` separates no-store HTML/runtime environment responses from long-lived hashed assets. `[portal.security]` controls browser-facing security policy. Keep HSTS disabled until the public hostname is served through HTTPS; HSTS preload requires `hsts_max_age_seconds >= 31536000` and `hsts_include_subdomains = true`. Add only explicit trusted HTTP/HTTPS origins to `csp_frame_src` for embedded players or other framed content. `[portal.tools]` keeps the optional tool API body limit and rate limit in TOML. `[provider_relay.runtime]` controls global OpenAI-compatible upstream response timeouts, channel health-check timeouts, background route catalog refresh, circuit-breaker recovery probes, and runtime failure handling. `failure_strategy = "failover"` tries the next configured route candidate for retryable provider faults; `fail_closed` returns the first provider fault without trying later candidates. `[provider_relay.retry]` is the default retry policy when a database routing channel does not define one. `[request_limits]` controls admin app JSON, admin skill JSON, public forum JSON, and payment callback body limits; keep load balancer, reverse proxy, and container ingress limits aligned with these values. `[observability]` owns production logging defaults: `log_filter` sets the tracing filter, `log_format` is one of `compact`, `json`, `pretty`, or `full`, `log_ansi` should stay `false` for systemd and container logs, and the target/thread fields control emitted log metadata. Use `RUST_LOG` only as a temporary process-level override.

See [initialization.md](./initialization.md) for default config paths, database examples, Redis settings, and bootstrap admin settings.

## 5. Initialize Database And Catalog

Run initialization before first startup whenever possible:

Linux/macOS package root:

```bash
./bin/clawrouterctl status
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
```

Windows package root:

```powershell
.\bin\clawrouterctl.exe status
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

Native Linux `.deb` install path:

```bash
/usr/bin/clawrouterctl status
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
```

Native macOS `.pkg` desktop install path:

```bash
/opt/sdkwork/router/bin/clawrouterctl status
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
```

Installer commands print JSON. A successful first install can include:

```json
{"status":"installed","changed":true,"bootstrapAdmin":{"username":"admin","initialPassword":"..."}}
```

Save `bootstrapAdmin.initialPassword` immediately. The same one-time password can also appear in startup logs as `initial_password` if the service initializes the database automatically. Later `ensure` runs and restarts omit `bootstrapAdmin` once the admin login is complete.

Catalog refresh success returns:

```json
{"status":"refreshed_catalog"}
```

## 6. Start And Verify

Start from a package root:

```bash
./bin/clawrouter
```

Windows:

```powershell
.\bin\clawrouter.exe
```

Linux service:

```bash
sudo systemctl status clawrouter --no-pager
```

Default portal:

```text
http://127.0.0.1:3900/
```

Health checks:

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

`/healthz` confirms the edge process is running. `/readyz` confirms database-backed app/admin/gateway readiness.

### Nginx Reverse Proxy

Production nginx site files follow the SDKWork site-family convention:

```text
/etc/nginx/sites-enabled/sdkwork/<domain>.conf
```

The `<domain>` value is the full public host name and must also be the file name stem. For example, `api.sdkwork.com` deploys to `/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf`, and `www.sdkwork.com` deploys to `/etc/nginx/sites-enabled/sdkwork/www.sdkwork.com.conf`.

After the service passes local health checks, render or deploy nginx from the source checkout:

```bash
pnpm nginx:plan -- --domain api.sdkwork.com
pnpm nginx:render -- --domain api.sdkwork.com --output-root target/nginx
sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
sudo nginx -t
sudo systemctl reload nginx
curl https://api.sdkwork.com/healthz
curl https://api.sdkwork.com/readyz
```

Generated configs proxy to the release edge server at `http://127.0.0.1:3900` and use standardized certificate paths:

```text
/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem
/opt/certs/letsencrypt/live/sdkwork.com/privkey.pem
```

Use `--cert-name`, `--cert-root`, `--output`, or `--output-root` when your certificate or nginx installation uses a different layout. The repository keeps the canonical nginx template in `etc/nginx/NGINX_SAMPLE.conf` and full-domain examples in `etc/nginx/sdkwork/api.sdkwork.com.conf` and `etc/nginx/sdkwork/www.sdkwork.com.conf`; `etc/nginx/API_SAMPLE.conf` remains only as the older API-compatible sample.

## 7. Container Packages

`container` packages include:

- `container/Containerfile`
- `container/entrypoint` or `container/entrypoint.ps1`
- `container/metadata.json`

Example:

```bash
tar -xzf clawrouter-linux-x64-container-0.3.0.tar.gz -C /opt/sdkwork/router
cd /opt/sdkwork/router
docker build -f container/Containerfile -t clawrouter:0.3.0 .
docker run --rm -p 3900:3900 \
  -v "$PWD/config/clawrouter.toml.example:/etc/sdkwork/router/clawrouter.toml:ro" \
  -v "$PWD/secrets/postgres-password:/run/secrets/sdkwork/router/postgres-password:ro" \
  clawrouter:0.3.0
```

Service and container deployments must mount runtime configuration, logs, and mutable data as writable resources, and must inject database credentials through protected TOML files, password files, or platform secrets. `SDKWORK_DATABASE_URL` remains available only for explicit operator override.

## 8. Upgrade A Release

1. Read the target release note, for example [v0.3.0](../../release/2026-05-17-v0.3.0.md).
2. Back up the database and runtime configuration.
3. Stop the old service.
4. Install or extract the new release package.
5. Preserve target-local `/etc/sdkwork/router/clawrouter.env`, `/etc/sdkwork/router/database.secret`, `.env.release` if used by archive deployments, and runtime TOML files.
6. For Linux service packages, start the service and let systemd run `ensure` and `refresh-catalog --force`.
7. For archive/manual deployments, run `clawrouterctl ensure` and `clawrouterctl refresh-catalog --force`.
8. Start the new version and check `/healthz` and `/readyz`.

## 9. Troubleshooting

- `missing_database_url`: a deployment explicitly required PostgreSQL but no PostgreSQL configuration was provided.
- `invalid_argument`: unsupported command or malformed option.
- `invalid_state`: current installation state cannot satisfy the requested command.
- `database_error`: database is unreachable, permissions are missing, or schema initialization failed.
- `catalog_error`: model catalog path, version, or content validation failed.
- `commerce_error`: commerce bootstrap schema or seed initialization failed.
- `/healthz` succeeds but `/readyz` fails: the edge process is up, but gateway/admin/app/portal upstreams or database dependencies are not ready.
- Linux service exits immediately: check `/etc/sdkwork/router/clawrouter.toml`, `/etc/sdkwork/router/database.secret`, `/etc/sdkwork/router/clawrouter.env`, and `journalctl -u clawrouter`.

