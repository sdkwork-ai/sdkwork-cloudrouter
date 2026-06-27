# SDKWork Claw Router Installation And Usage Guide

This documentation is for operators, developers, and delivery engineers who install, initialize, deploy, and use SDKWork Claw Router. The current release version is defined by `docs/release/VERSION.md`; at the time this guide was written, it is `0.3.0`.

## What Is SDKWork Claw Router?

SDKWork Claw Router is a commercial AI gateway and console workspace. It
provides OpenAI-compatible `/v1/*` APIs, provider routing, model catalog and
pricing management, API keys, billing and usage workflows, a user portal, an
admin console, and generated SDKs backed by schema and OpenAPI contracts.

The screenshots below are placeholder PNG files. Replace the files in
[`../../assets/product-screenshots`](../../assets/product-screenshots/) with
real product screenshots when preparing customer-facing installation material.

| Product area | Screenshot |
| --- | --- |
| Portal home | ![SDKWork Claw Router portal home placeholder](../../assets/product-screenshots/portal-home.png) |
| Console dashboard | ![SDKWork Claw Router console dashboard placeholder](../../assets/product-screenshots/console-dashboard.png) |
| Model catalog and routing | ![SDKWork Claw Router model routing placeholder](../../assets/product-screenshots/model-routing.png) |
| API playground | ![SDKWork Claw Router playground placeholder](../../assets/product-screenshots/playground.png) |
| Admin console | ![SDKWork Claw Router admin console placeholder](../../assets/product-screenshots/admin-console.png) |

## Choose A Path

| Scenario | Guide | Default database policy | Audience |
| --- | --- | --- | --- |
| Install from a GitHub release or delivery package | [release-install.md](./release-install.md) | desktop uses local SQLite; archive, service, and container packages use PostgreSQL by default | deployment and delivery |
| Install, run, or build from source | [source-install.md](./source-install.md) | development can use local SQLite; server mode should use PostgreSQL | developers and integrators |
| First-time initialization only | [initialization.md](./initialization.md) | depends on deployment mode | operators |
| Use the portal and APIs | [usage.md](./usage.md) | initialized database required | admins and users |
| Pick a package or deployment mode | [deployment-modes.md](./deployment-modes.md) | depends on mode | architecture and operations |
| Publish through nginx | [release-install.md](./release-install.md#nginx-reverse-proxy) | proxies to the release edge server at `http://127.0.0.1:3900` | operators |

Chinese documentation is available at [../zh-CN/README.md](../zh-CN/README.md).

## Current Release

The current release is recorded in [docs/release/VERSION.md](../../release/VERSION.md):

```text
Current Version: 0.3.0
Release Date: 2026-05-17
```

Package names use this version:

```text
clawrouter-linux-x64-server-0.3.0.deb
clawrouter-windows-x64-desktop-0.3.0.msi
clawrouter-macos-arm64-desktop-0.3.0.pkg
clawrouter-linux-x64-archive-0.3.0.tar.gz
```

From a source checkout, inspect the full package matrix with:

```bash
node scripts/plan-claw-router-install-packages.mjs
node scripts/plan-claw-router-install-packages.mjs --json
```

## Deployment Modes

- `desktop`: single-machine package, local SQLite by default.
- `archive`: self-contained server archive, PostgreSQL by default.
- `service`: platform-native host service package, PostgreSQL by default.
- `container`: container image package, PostgreSQL by default; mount TOML config and secrets.
- `source`: source checkout for development, validation, private builds, and integration work.

## Quick Path

Source development:

```bash
pnpm dev -- --install
```

Production build:

```bash
pnpm build
pnpm start
```

Ubuntu/Debian service package:

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo editor /etc/sdkwork/router/database.secret
sudo systemctl start clawrouter
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

Nginx reverse proxy after local health checks pass:

```bash
pnpm nginx:plan -- --domain api.sdkwork.com
sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
sudo nginx -t
sudo systemctl reload nginx
```

The canonical deployed file is
`/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf`: `api.sdkwork.com` is the
complete domain and the file name stem. Generated configs proxy to
`http://127.0.0.1:3900`. Use `etc/nginx/NGINX_SAMPLE.conf` as the canonical
template and `etc/nginx/sdkwork/` for full-domain examples.

The Debian service package creates `/etc/sdkwork/router/clawrouter.toml`,
`/etc/sdkwork/router/clawrouter.env`, `/etc/sdkwork/router/database.secret`,
`/etc/sdkwork/router/redis.secret`, and the writable data/log directories. The
package enables `clawrouter.service` on systemd hosts but does not start it
until the PostgreSQL host, database,
username, and password are configured. The systemd unit runs installer
initialization automatically before starting the gateway and runs with
restricted systemd protections for filesystem, kernel, control group, syscall
architecture, and open-file limits. The post-install output prints the runtime
TOML, service environment, PostgreSQL password file, Redis password file,
systemd service name, and first-start commands. The package manifest also
includes a `nativeInstall` layout for deployment automation and support
diagnostics. Redis is standardized in `clawrouter.toml`, enabled by default for
server deployments, and must be configured before first startup. Desktop
packages keep Redis optional and disabled by default.

Linux native desktop package:

```bash
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

macOS native desktop package:

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

Portable release package root on Linux/macOS:

```bash
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
./bin/clawrouter
```

Windows MSI install root:

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Set-Location $installRoot
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
.\bin\clawrouter.exe
```

After startup:

```text
Portal: http://127.0.0.1:3900/
Gateway API: http://127.0.0.1:3900/v1
Backend/Admin API: http://127.0.0.1:3900/backend/v3/api
App API: http://127.0.0.1:3900/app/v3/api
Health: http://127.0.0.1:3900/healthz
Ready: http://127.0.0.1:3900/readyz
```

## License

The SDKWork Claw Router application source is licensed under `AGPL-3.0-or-later AND LicenseRef-SDKWork-Commercial-Restriction`. Commercial use is prohibited without prior written authorization from SDKWork. See [LICENSE](../../../LICENSE) and [COMMERCIAL-LICENSE.md](../../../COMMERCIAL-LICENSE.md).
