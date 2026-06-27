> Migrated from `docs/installation/en-US/initialization.md` on 2026-06-24.
> Owner: SDKWork maintainers

Initialization creates runtime configuration, installs the database schema, imports or refreshes the model catalog, and confirms health-check paths. Database defaults differ by deployment mode.

For the fastest path, initialize before first startup:

```bash
clawrouterctl status
clawrouterctl ensure
clawrouterctl refresh-catalog --force
clawrouter
```

If you installed a native Linux `.deb`, public commands are under `/usr/bin` and private runtime assets are under `/usr/lib/sdkwork/router`:

```bash
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

If you installed a native macOS `.pkg`, desktop binaries are under `/opt/sdkwork/router/bin`; service binaries are under `/Library/Application Support/sdkwork/router/bin`:

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

If you installed the Windows MSI, the default install root is:

```text
<install-root>
```

## Initialization Order

Recommended order for archive/manual deployments:

1. Prepare PostgreSQL and protected process environment variables when defaults are not enough.
2. Prepare runtime TOML configuration.
3. Set `host`, `database`, `username`, and either `password_file` or protected `password`.
4. Run `clawrouterctl ensure`.
5. Run `clawrouterctl refresh-catalog --force`.
6. Start `clawrouter`.
7. Check `/healthz` and `/readyz`.

For Linux `service` deployments, the `.deb` creates the default runtime TOML, `/etc/sdkwork/router/clawrouter.env`, and `/etc/sdkwork/router/database.secret`. The systemd unit runs `ensure` and `refresh-catalog --force` automatically before the gateway starts. The service can write `/var/lib/sdkwork/router` and `/var/log/sdkwork/router`; `/etc/sdkwork/router` is read-only to the running process.

Linux service packages should follow this order:

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo systemctl start clawrouter
sudo systemctl status clawrouter --no-pager
```

## Runtime Config Paths

server/service/container defaults:

| Platform | Config file |
| --- | --- |
| Windows | `%ProgramData%/sdkwork/router/clawrouter.toml` |
| Linux | `/etc/sdkwork/router/clawrouter.toml` |
| macOS | `/Library/Application Support/sdkwork/router/clawrouter.toml` |

desktop defaults:

| Platform | Config file |
| --- | --- |
| Windows | `%USERPROFILE%/.sdkwork/router/config/clawrouter.toml` |
| Linux | `~/.sdkwork/router/config/clawrouter.toml` |
| macOS | `~/.sdkwork/router/config/clawrouter.toml` |

Override with `SDKWORK_CLAW_CONFIG_FILE`:

```bash
export SDKWORK_CLAW_CONFIG_FILE="/etc/sdkwork/router/clawrouter.toml"
```

PowerShell:

```powershell
$env:SDKWORK_CLAW_CONFIG_FILE = Join-Path $env:ProgramData "sdkwork/router/clawrouter.toml"
```

Native package install locations:

| Platform | Binaries | Notes |
| --- | --- | --- |
| Linux `.deb` | `/usr/bin` public commands, `/usr/lib/sdkwork/router/bin` private binaries | `service` packages also install `/lib/systemd/system/clawrouter.service`, `/etc/sdkwork/router`, `/var/lib/sdkwork/router`, and `/var/log/sdkwork/router`. |
| Windows `.msi` | `<install-root>/bin` | Shared config templates use `%ProgramData%/sdkwork/router`; desktop runtime config is created under `%USERPROFILE%/.sdkwork/router/config` during user initialization. |
| macOS `.pkg` | `/opt/sdkwork/router/bin` for desktop, `/Library/Application Support/sdkwork/router/bin` for service | `service` packages also install `/Library/LaunchDaemons/com.sdkwork.clawrouter.plist`. |

Every package includes `install-manifest.json` with `installConfiguration`. Native installers also include `nativeInstall`, which describes the final install paths, service metadata, permissions, and operator commands.

## Database Policy

desktop:

- SQLite by default
- `max_connections = 1` by default
- best for single-machine experience, desktop app usage, and lightweight local deployments

server/service/container:

- PostgreSQL by default
- `max_connections = 16` by default
- PostgreSQL is required for teams, production, SaaS, managed services, multi-node deployments, and commercial deployments
- PostgreSQL deployments should use `max_connections = 16` or another capacity-planned value

For a default Linux service deployment, the package creates this runtime database configuration:

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

The `.deb` package creates `/etc/sdkwork/router/database.secret` with the placeholder value `change-me`. Replace that file with the real PostgreSQL password before starting `clawrouter`; startup rejects server configurations that still use `db.example.com` or `change-me`.

Redis is enabled and required by default for server/service/container
deployments. Configure `[redis].host`, `[redis].port`, and `[redis].database`
before first startup; use `[redis].url` only as an advanced managed-endpoint
override. Use `/etc/sdkwork/router/redis.secret` or another protected
`password_file`, and keep direct `[redis].password` only for TOML files managed
as secret-bearing files. Desktop deployments keep Redis optional and disabled
by default.

`[request_limits]` controls runtime JSON and webhook body limits for
high-risk write APIs. `admin_app_json_body_max_bytes` and
`admin_skill_json_body_max_bytes` protect backend management APIs,
`forum_json_body_max_bytes` protects public app forum writes, and
`payment_callback_body_max_bytes` protects payment provider callbacks. Keep
reverse proxy, load balancer, and container ingress request-body limits aligned
with these values so oversized requests fail before expensive application work.

`[edge]` configures the packaged Rust edge server and upstream service targets.
`[portal.static]` keeps HTML/runtime environment responses uncached while
allowing long-lived hashed static assets. `[portal.security]` controls
browser-facing security policy. Keep HSTS disabled until the public hostname is
served through HTTPS; when enabling preload, keep `hsts_max_age_seconds >=
31536000` and `hsts_include_subdomains = true`. Add only explicit trusted
HTTP/HTTPS origins to `csp_frame_src` for embedded players or other framed
content. `[portal.tools]` controls the optional
local tool API body size and rate limit. `[observability]` owns production
logging defaults: `log_filter` sets the tracing filter, `log_format` is one of
`compact`, `json`, `pretty`, or `full`, `log_ansi` should stay `false` for
systemd and container logs, and the target/thread fields control emitted log
metadata. Use `RUST_LOG` only for temporary process-level diagnostics.
`[edge].cors_allowed_origins` is an explicit allowlist for additional trusted
browser origins, such as an external CDN-hosted portal. Leave it empty for the
packaged same-origin edge deployment; wildcard origins and origins with paths
are rejected.
`[provider_relay.runtime]` configures global OpenAI-compatible upstream response
timeouts, admin/app channel health-check timeouts, background route catalog
refresh, circuit-breaker recovery probes, and runtime failure handling.
`failure_strategy = "failover"` tries the next configured route candidate for
retryable provider faults; `fail_closed` returns the first provider fault without
trying later candidates. `[provider_relay.retry]` is the default retry policy
when a database routing channel does not define its own retry policy.

For production server/service/container deployments, use the structured TOML fields above. `password_file` is the preferred secret path. Direct `password` is supported only when the TOML file is protected as a secret-bearing file:

- `password_file` can be absolute.
- `password_file` can be relative to the directory containing `clawrouter.toml`.
- `password_file` can use `${VAR}`, `$VAR`, `%VAR%`, or `~` expansion for platform-managed secret paths.

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

`SDKWORK_CLAW_DATABASE_URL` remains available in `/etc/sdkwork/router/clawrouter.env` or the process environment only as an explicit operator override:

```text
SDKWORK_CLAW_DATABASE_URL=postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod
```

Desktop SQLite example:

```toml
[database]
engine = "sqlite"
file = "~/.sdkwork/router/data/router.sqlite"
max_connections = 1

[runtime]
deployment_mode = "desktop"
```

## Installer Commands

The examples below assume `clawrouterctl` is on `PATH`. From an extracted release package root, use `./bin/clawrouterctl` on Linux/macOS and `.\bin\clawrouterctl.exe` on Windows.

From native Linux `.deb` packages, use:

```bash
/usr/bin/clawrouterctl status
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
```

From native macOS `.pkg` desktop packages, use:

```bash
/opt/sdkwork/router/bin/clawrouterctl status
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
```

From the default Windows MSI install directory, use:

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Set-Location $installRoot
.\bin\clawrouterctl.exe status
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

Status:

```bash
clawrouterctl status
```

Install or repair schema:

```bash
clawrouterctl ensure
```

Refresh the model catalog:

```bash
clawrouterctl refresh-catalog --force
```

Refresh one vendor:

```bash
clawrouterctl refresh-catalog --vendor openai
```

Use an external model catalog:

```bash
clawrouterctl refresh-catalog --catalog-root /opt/sdkwork-models --catalog-version 2026.05.08.1 --force
```

Dry-run refresh:

```bash
clawrouterctl refresh-catalog --vendor openai --dry-run
```

Windows commands use `.exe`:

```powershell
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

## Output And Errors

Installer stdout is one JSON object. Errors are JSON on stderr:

```json
{"status":"error","errorCode":"database_error","message":"..."}
```

Stable error codes:

- `missing_database_url` when a deployment explicitly requires PostgreSQL but no PostgreSQL configuration is provided
- `invalid_argument`
- `invalid_state`
- `database_error`
- `catalog_error`
- `commerce_error`
- `installer_error`

## Health Checks

After startup:

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

`/healthz` reports edge server process health. `/readyz` checks gateway, backend/admin API, app API, portal upstream, and database-dependent readiness.

For Linux services, also check systemd and logs:

```bash
sudo systemctl status clawrouter --no-pager
sudo journalctl -u clawrouter -n 200 --no-pager
```

## First Account And IAM

On first install or first startup, Claw Router creates or repairs a bootstrap administrator login if the configured bootstrap admin is not complete. The default account is:

- username: `admin`
- tenant: `default` (`tenantId: "100001"`)
- organization: `root` (`organizationId: "0"`)

The initial password is generated from the operating-system random source unless `SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD` is set. When a new password is written, it is exposed once in two places:

- installer JSON output under `bootstrapAdmin.initialPassword`
- startup logs from gateway/admin/app services as `initial_password`

Save the password immediately and rotate it after the first login. Re-running `ensure` or restarting after the admin login is complete does not print or reset the password. If the admin user already has an active password and only related IAM membership data needs repair, startup repairs the membership without changing or printing the password.

Bootstrap admin environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_ENABLED` | `true` | Set to `false` to disable automatic bootstrap admin creation and repair. |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_USERNAME` | `admin` | Bootstrap username. Letters, digits, `.`, `-`, and `_` are allowed. |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_DISPLAY_NAME` | `Administrator` | Display name for the bootstrap user. |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_EMAIL` | `admin@sdkwork.com` | Email identity for the bootstrap user. |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD` | generated | Optional explicit initial password. Must be 12 to 128 characters. |

Example installer output:

```json
{
  "status": "installed",
  "changed": true,
  "bootstrapAdmin": {
    "status": "created",
    "tenantId": "10",
    "organizationId": "20",
    "userId": "1",
    "username": "admin",
    "displayName": "Administrator",
    "email": "admin@sdkwork.com",
    "initialPassword": "generated-or-configured-password",
    "generatedPassword": true
  }
}
```

When you need to quickly recover administrator access, reset the `admin` password through the root `pnpm` commands. Development mode targets the default `target/dev/clawrouter.sqlite` database, while release mode uses the database configuration from the runtime `clawrouter.toml`. The wrapper does not forward the password to the installer/cargo child process as a command-line argument. To also avoid exposing the password in shell history or the Node process arguments, provide it through `SDKWORK_CLAW_ADMIN_RESET_PASSWORD`.

```bash
pnpm admin:reset:dev -- --password "Admin-Dev-Password-2026!"
pnpm admin:reset:release -- --password "Admin-Release-Password-2026!"
```

For release operations, prefer:

```bash
SDKWORK_CLAW_ADMIN_RESET_PASSWORD="Admin-Release-Password-2026!" pnpm admin:reset:release
```

The default reset target is username `admin`, display name `Administrator`, and email identity `admin@sdkwork.com`. Override them when needed:

```bash
pnpm admin:reset:release -- \
  --username admin \
  --display-name "Administrator" \
  --email "admin@sdkwork.com" \
  --password "Admin-Release-Password-2026!"
```

Claw Router login methods, registration, QR login, verification-code policy, and recovery options are controlled by IAM runtime settings. `v0.3.0` keeps a strict default posture: password login is available by default, while QR login, code login, OAuth, and session bridge require explicit enablement.

After first login, use the admin backend to configure IAM policy for login methods, QR login, registration verification, OAuth visibility, and account recovery.

