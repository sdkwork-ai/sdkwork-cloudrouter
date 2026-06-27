# SDKWork Claw Router Installation

Choose a language:

- [中文安装与使用指南](./zh-CN/README.md)
- [English Installation And Usage Guide](./en-US/README.md)

Use the release guides for published version packages. Use the source guides for cloning, development, private builds, and source-based deployment.

For `v0.3.0` and later, prefer native installers for quick deployment:

- Linux service/desktop: `.deb`
- Windows service/desktop: `.msi`
- macOS service/desktop: `.pkg`

Portable `.tar.gz` and `.zip` assets remain available for `archive` and `container` modes.

Ubuntu/Debian service packages install the standard service layout and
PostgreSQL runtime template:

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo systemctl start clawrouter
```

After the service is healthy, publish it through nginx with the SDKWork
site-family path convention:

```bash
pnpm nginx:plan -- --domain api.sdkwork.com
sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
sudo nginx -t
sudo systemctl reload nginx
```

The deployed nginx file is
`/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf`, where the file stem is
the complete domain name. Generated configs proxy to `http://127.0.0.1:3900`.
Use `etc/nginx/NGINX_SAMPLE.conf` as the canonical template and see
`etc/nginx/sdkwork/` for full-domain examples.

The package creates the default TOML, `/etc/sdkwork/router/clawrouter.env`,
`/etc/sdkwork/router/database.secret`, `/etc/sdkwork/router/redis.secret`, data/log directories, enables
`clawrouter.service` on systemd hosts, and runs initialization from systemd
before startup. Configure PostgreSQL before starting the service. The running
service can write `/var/lib/sdkwork/router` and `/var/log/sdkwork/router`; it reads
`/etc/sdkwork/router` as protected configuration. Each package also includes
`install-manifest.json` with `installConfiguration`, and native installers add a
`nativeInstall` layout for deployment automation.

Redis is part of the standard `clawrouter.toml` contract. Server, service, and
container packages keep `[redis].enabled = true` by default and require
`[redis].host`, `[redis].port`, and `[redis].database` before first startup; use
`[redis].url` only as an advanced managed-endpoint override. Prefer
`[redis].password_file` over direct passwords. Desktop packages keep Redis
optional and disabled by default.

Desktop/runtime local user data remains SQLite by default. Workspace desktop development commands are gateway-backed client commands; they do not start a product backend service. Packaged desktop runtime and desktop local data profile stores SQLite under `~/.sdkwork/router/data/clawrouter.sqlite`.
desktop local data profile stores SQLite under `~/.sdkwork/router/data/clawrouter.sqlite`
