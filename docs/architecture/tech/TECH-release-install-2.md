> Migrated from `docs/installation/zh-CN/release-install.md` on 2026-06-24.
> Owner: SDKWork maintainers

本指南说明如何从正式 release 安装 SDKWork Claw Router。当前 release 版本来自 [docs/release/VERSION.md](../../release/VERSION.md)，当前为 `0.3.0`。

最快部署路径优先使用平台原生安装包：

- Ubuntu/Debian：使用 `apt install ./...deb` 安装 `.deb`。
- Windows：使用 `msiexec` 或 Windows 安装器安装 `.msi`。
- macOS：使用 `installer` 安装 `.pkg`。

只有在需要由自己的部署脚本管理目录、服务、数据目录和密钥时，才优先使用 `archive` 包。

## 1. 选择安装包

安装包 ID 由三个维度组成：

```text
<platform>-<architecture>-<deploymentMode>
```

服务包 ID 继续使用内部 `service` 部署模式，因为它驱动 systemd、launchd 和
Windows Service 集成。公开 Release 制品名对同一模式使用 `server`，例如
`linux-x64-service` 会构建 `clawrouter-linux-x64-server-0.3.0.deb`。

支持的平台：

- `windows`
- `linux`
- `macos`

支持架构：

- `x64`
- `arm64`

支持部署模式：

- `archive`：可移植服务端目录，默认使用 PostgreSQL。
- `service`：主机服务安装包，默认使用 PostgreSQL。
- `container`：容器构建包，默认使用 PostgreSQL；生产建议挂载 TOML 配置和密钥。
- `desktop`：单机安装包，默认使用 SQLite。

常见安装包名：

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

在源码仓库中可查看完整矩阵：

```powershell
node scripts\plan-claw-router-install-packages.mjs --json
```

从源码仓库构建 Linux x64 service release：

```bash
pnpm release:env:write -- --check
pnpm release:env:write -- --force
pnpm build
pnpm install:package:build -- --package-id linux-x64-service
```

生成的 Ubuntu/Debian 安装包使用公开制品名 `clawrouter-linux-x64-server-0.3.0.deb`。

## 2. 快速安装路径

### Ubuntu/Debian 服务部署

适用于 Ubuntu 或 Debian 上长期运行的服务：

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo editor /etc/sdkwork/router/database.secret
sudo systemctl start clawrouter
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

`.deb` 包会创建 `sdkwork` 系统用户、`/etc/sdkwork/router/clawrouter.toml`、`/etc/sdkwork/router/clawrouter.env`、`/etc/sdkwork/router/database.secret`、`/var/lib/sdkwork/router`、`/var/log/sdkwork/router` 和 systemd unit。在 systemd 主机上，安装过程会启用但不会立即启动 `clawrouter.service`。首次启动会通过 `ExecStartPre` 自动执行 `clawrouterctl ensure` 和 `clawrouterctl refresh-catalog --force`。生成的 systemd unit 默认使用受限运行配置，包括 `NoNewPrivileges`、`ProtectSystem=strict`、`ProtectHome=true`、systemd 管理的 state/log/config 目录、内核和 control group 保护、原生系统调用架构过滤，以及 `LimitNOFILE=65535`。运行中的服务只能写入数据和日志目录，`/etc/sdkwork/router` 对服务进程保持只读。

安装后输出会打印一段配置摘要，直接列出运行时 TOML、服务环境文件、PostgreSQL 密码文件、服务名和首次启动命令：

```text
Runtime TOML: /etc/sdkwork/router/clawrouter.toml
Service environment: /etc/sdkwork/router/clawrouter.env
PostgreSQL password file: /etc/sdkwork/router/database.secret
Systemd service: clawrouter.service
```

默认服务端数据库配置是外部 PostgreSQL：

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

首次启动前请编辑 `/etc/sdkwork/router/clawrouter.toml`。推荐把数据库密码保存在 `/etc/sdkwork/router/database.secret`。如果 TOML 文件本身由密钥系统保护，也可以直接配置 `password`：

`.deb` 包创建的 `database.secret` 初始内容是占位值 `change-me`。启动服务前必须替换为真实 PostgreSQL 密码；server 配置仍使用 `db.example.com` 或 `change-me` 时会被启动校验拒绝。`password_file` 可以是绝对路径、相对 `clawrouter.toml` 所在目录的路径，也可以使用 `${VAR}`、`$VAR`、`%VAR%` 或 `~` 展开，用于平台 Secret 路径。

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

`SDKWORK_DATABASE_URL` 仍可写入 `/etc/sdkwork/router/clawrouter.env`，但只建议作为明确的运维覆盖或平台密钥注入方式。

`.deb` 安装脚本会创建：

- `/usr/bin/clawrouter`
- `/usr/bin/clawrouterctl`
- `/usr/lib/sdkwork/router`
- `/etc/sdkwork/router`
- `/etc/sdkwork/router/clawrouter.env`
- `/etc/sdkwork/router/database.secret`
- `/var/lib/sdkwork/router`
- `/var/log/sdkwork/router`
- `service` 包会安装 `/lib/systemd/system/clawrouter.service`

Linux `.deb` payload 使用标准系统目录：不可变私有运行时文件位于 `/usr/lib/sdkwork/router`，公共运维命令位于 `/usr/bin`，服务配置位于 `/etc/sdkwork/router`，可变状态位于 `/var/lib/sdkwork/router`，日志位于 `/var/log/sdkwork/router`。服务配置文件和模板使用 `root:sdkwork`、`0640` 文件权限；`/etc/sdkwork/router`、`/var/lib/sdkwork/router` 和 `/var/log/sdkwork/router` 使用 `0750` 目录权限。

如果服务启动时自动初始化数据库，请从日志中保存首次管理员密码：

```bash
sudo journalctl -u clawrouter -n 200 --no-pager
```

### Linux 桌面/单机

适用于本机 SQLite 试用：

```bash
sudo apt install ./clawrouter-linux-x64-desktop-0.3.0.deb
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

`desktop` 模式使用当前 OS 用户的配置和数据目录，默认不要求 PostgreSQL。Linux desktop `.deb` 会把共享模板安装到 `/usr/share/sdkwork/router/config/clawrouter.toml.example`，不会创建 `/etc/sdkwork/router/clawrouter.toml`、`/etc/sdkwork/router/database.secret` 或 systemd 服务。

### Windows 桌面或服务文件

安装 MSI：

```powershell
msiexec /i .\clawrouter-windows-x64-desktop-0.3.0.msi
```

默认安装目录：

```text
<install-root>
```

初始化并启动。server/service 模式建议使用管理员 PowerShell，desktop 模式可使用普通 PowerShell：

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Set-Location $installRoot
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
.\bin\clawrouter.exe
```

生产或多节点 server/service 部署需要在受保护的服务环境或运行时 TOML 中配置 PostgreSQL：

```powershell
$env:SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod"
```

Windows `.msi` 会把程序二进制放在 `%ProgramFiles%/sdkwork/router`，把共享模板放在 `%ProgramData%/sdkwork/router`。原生安装清单会记录 service 模板、运行时 TOML、密码文件和数据目录继承 ProgramData ACL；desktop 运行时文件由当前用户初始化到 `%USERPROFILE%/.sdkwork/router/config` 和 `%USERPROFILE%/.sdkwork/router/data`，使用当前用户 profile ACL。

### macOS 桌面或服务文件

安装 PKG：

```bash
sudo installer -pkg clawrouter-macos-arm64-desktop-0.3.0.pkg -target /
```

默认运行文件：

```text
Binaries: /opt/sdkwork/router/bin
Desktop config template: /usr/local/share/sdkwork/router/config/clawrouter.toml.example
Desktop runtime config: ~/.sdkwork/router/config/clawrouter.toml
Service config template: /Library/Application Support/sdkwork/router/clawrouter.toml.example
Service plist for service package: /Library/LaunchDaemons/com.sdkwork.clawrouter.plist
Service runner for service package: /Library/Application Support/sdkwork/router/service/macos/clawrouter-service-runner
```

初始化并启动：

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

macOS service 包由 launchd 启动 service runner。runner 会先执行 `clawrouterctl ensure` 和 `clawrouterctl refresh-catalog --force`，然后用 gateway 进程替换自身。

macOS service 包会把服务运行文件安装到 `/Library/Application Support/sdkwork/router`，使用 `root:wheel` 所有权；服务根目录为 `0750`，服务模板和复制出的运行时 TOML 为 `0640`，`/Library/LaunchDaemons/com.sdkwork.clawrouter.plist` 为 `0644`。macOS desktop 包仍把运行时配置放在当前用户的 Application Support 目录中。

### 可移植归档包

当部署系统需要自行管理文件、服务注册、可写目录和密钥时，使用归档包。

Linux/macOS：

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

Windows：

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

## 3. 安装包内容

release 包包含运行 Claw Router 所需文件：

- `bin/clawrouter` 或 `bin/clawrouter.exe`
- `bin/clawrouterctl` 或 `bin/clawrouterctl.exe`
- `portal/dist`
- `portal/dist/sdk-archives`
- `.env.release.example`
- `config/clawrouter.toml.example`
- `INSTALL.md`
- `install-manifest.json`

`service` 和 `desktop` release 资产是平台原生安装包：

- Linux: `.deb`
- Windows: `.msi`
- macOS: `.pkg`

`archive` 和 `container` release 资产仍然是可移植 `.tar.gz` 或 `.zip`。

每个包的 `install-manifest.json` 都包含 `installConfiguration`，记录运行时 TOML、模板、数据库策略、必填字段、密码路径、首次启动命令和后续步骤。原生安装包还包含 `nativeInstall`，用机器可读方式描述最终安装布局，例如 `/usr/bin/clawrouter`、`/usr/lib/sdkwork/router/portal/dist`、`/etc/sdkwork/router/clawrouter.toml`、`/etc/sdkwork/router/database.secret`、`/lib/systemd/system/clawrouter.service`、服务启动策略、权限和运维命令。部署自动化应读取这些字段，而不是解析 `INSTALL.md`。

不要把 `.env.release` 打包或提交。归档部署可以在目标机器上生成它；Linux service 部署使用 `/etc/sdkwork/router/clawrouter.env` 保存受保护的进程覆盖项，并使用 `/etc/sdkwork/router/clawrouter.toml` 作为主要运行时配置。`PORTAL_PUBLIC_*` 只能放浏览器可见配置，不要放数据库密码、供应商密钥或管理员凭据。

## 4. 数据库策略

`desktop` 包默认使用 SQLite：

```text
Windows: %USERPROFILE%/.sdkwork/router/data/clawrouter.sqlite
Linux: ~/.sdkwork/router/data/clawrouter.sqlite
macOS: ~/.sdkwork/router/data/clawrouter.sqlite
```

Desktop SQLite 策略独立于 `pnpm dev`、`pnpm dev:server` 和 `pnpm dev:server:postgres` 为后端服务运行时使用的显式 product server PostgreSQL 开发配置。网关客户端命令（`pnpm dev:desktop`、`pnpm dev:desktop:sqlite`）通过 `sdkwork-api-cloud-gateway` 运行，不启动 Claw Router 后端服务。

`archive`、`service`、`container` 包默认使用 PostgreSQL。请在 TOML 中配置 `host`、`port`、`database`、`username`，并使用 `password_file` 或受保护的 `password`。生产环境优先使用 `password_file`。

Redis 也纳入同一个运行时 TOML 标准。`archive`、`service`、`container` 服务端包默认启用并要求 Redis：

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

server 部署保持 `[redis].enabled = true`，首次启动前配置 `host`、`port`、`database`；只有托管 Redis 端点无法用分离字段清晰表达时，才使用 `url` 作为高级覆盖。优先使用 `password_file`，不要把密码直接写入普通配置文件。Linux service 安装使用 `/etc/sdkwork/router/redis.secret`；container 包使用 `/run/secrets/sdkwork/router/redis-password` 挂载。desktop 包仍保持 Redis 可选且默认关闭。

`[edge]` 负责打包后的 Rust edge server、上游服务目标、portal 静态资源目录、上游超时和额外 CORS origin allowlist。同源打包部署保持 `cors_allowed_origins` 为空；只有外部可信 portal 或 CDN 必须从不同浏览器 origin 调用 edge API 时，才填写明确的 HTTP/HTTPS origin。通配符和带 path 的 origin 会被拒绝。`[portal.static]` 将 HTML/runtime env 的 no-store 响应与长期缓存的 hash 静态资源分离。`[portal.security]` 控制浏览器侧安全策略；只有公网主机名已经通过 HTTPS 访问时才启用 HSTS，启用 preload 时保持 `hsts_max_age_seconds >= 31536000` 且 `hsts_include_subdomains = true`。`csp_frame_src` 只填写允许 portal 嵌入的明确信任 HTTP/HTTPS origin。`[portal.tools]` 将可选工具 API 的请求体限制和限流放在 TOML 中。`[provider_relay.runtime]` 控制 OpenAI-compatible 上游响应超时和渠道健康检查超时。`[provider_relay.retry]` 是数据库路由渠道未单独定义 retry policy 时使用的默认重试策略。`[request_limits]` 控制后台应用 JSON、后台技能 JSON、公开论坛 JSON 和支付回调请求体限制；负载均衡、反向代理和容器 ingress 的限制应与这些值保持一致。`[observability]` 负责生产日志默认策略：`log_filter` 是 tracing 过滤器，`log_format` 可选 `compact`、`json`、`pretty` 或 `full`，systemd 和 container 日志建议保持 `log_ansi = false`，target/thread 字段控制输出的日志元信息；`RUST_LOG` 只建议作为临时进程级覆盖。

默认配置路径、数据库示例、Redis 设置和 bootstrap admin 设置见 [initialization.md](./initialization.md)。

## 5. 初始化数据库和模型目录

建议首次启动前先初始化。

Linux/macOS 包目录：

```bash
./bin/clawrouterctl status
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
```

Windows 包目录：

```powershell
.\bin\clawrouterctl.exe status
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

Linux 原生 `.deb` 安装路径：

```bash
/usr/bin/clawrouterctl status
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
```

macOS 原生 `.pkg` desktop 安装路径：

```bash
/opt/sdkwork/router/bin/clawrouterctl status
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
```

初始化命令输出 JSON。首次成功安装可能包含：

```json
{"status":"installed","changed":true,"bootstrapAdmin":{"username":"admin","initialPassword":"..."}}
```

请立即保存 `bootstrapAdmin.initialPassword`。如果服务在启动时自动初始化数据库，同一个一次性密码也可能以 `initial_password` 出现在启动日志中。管理员登录链路完整后，后续 `ensure` 和重启不会再输出 `bootstrapAdmin`。

模型目录刷新成功会返回：

```json
{"status":"refreshed_catalog"}
```

## 6. 启动和验证

从包目录直接启动：

```bash
./bin/clawrouter
```

Windows：

```powershell
.\bin\clawrouter.exe
```

Linux 服务：

```bash
sudo systemctl status clawrouter --no-pager
```

默认访问地址：

```text
http://127.0.0.1:3900/
```

健康检查：

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

`/healthz` 表示 edge 进程已运行。`/readyz` 表示数据库相关的 app/admin/gateway 就绪。

### Nginx 反向代理

生产 nginx 站点文件遵循 SDKWork site-family 约定：

```text
/etc/nginx/sites-enabled/sdkwork/<domain>.conf
```

`<domain>` 是完整公网域名，同时也是文件名主体。例如 `api.sdkwork.com` 部署到 `/etc/nginx/sites-enabled/sdkwork/api.sdkwork.com.conf`，`www.sdkwork.com` 部署到 `/etc/nginx/sites-enabled/sdkwork/www.sdkwork.com.conf`。

服务本机健康检查通过后，可以从源码仓库渲染或部署 nginx 配置：

```bash
pnpm nginx:plan -- --domain api.sdkwork.com
pnpm nginx:render -- --domain api.sdkwork.com --output-root target/nginx
sudo pnpm nginx:deploy -- --domain api.sdkwork.com --cert-name sdkwork.com
sudo nginx -t
sudo systemctl reload nginx
curl https://api.sdkwork.com/healthz
curl https://api.sdkwork.com/readyz
```

生成配置默认代理到 release edge server `http://127.0.0.1:3900`，证书路径标准化为：

```text
/opt/certs/letsencrypt/live/sdkwork.com/fullchain.pem
/opt/certs/letsencrypt/live/sdkwork.com/privkey.pem
```

如果证书或 nginx 安装布局不同，使用 `--cert-name`、`--cert-root`、`--output` 或 `--output-root` 覆盖。仓库内的通用 nginx 模板是 `etc/nginx/NGINX_SAMPLE.conf`，完整域名示例是 `etc/nginx/sdkwork/api.sdkwork.com.conf` 和 `etc/nginx/sdkwork/www.sdkwork.com.conf`；`etc/nginx/API_SAMPLE.conf` 只作为旧的 API 兼容样例保留。

## 7. 容器包

`container` 包包含：

- `container/Containerfile`
- `container/entrypoint` 或 `container/entrypoint.ps1`
- `container/metadata.json`

示例：

```bash
tar -xzf clawrouter-linux-x64-container-0.3.0.tar.gz -C /opt/sdkwork/router
cd /opt/sdkwork/router
docker build -f container/Containerfile -t clawrouter:0.3.0 .
docker run --rm -p 3900:3900 \
  -v "$PWD/config/clawrouter.toml.example:/etc/sdkwork/router/clawrouter.toml:ro" \
  -v "$PWD/secrets/postgres-password:/run/secrets/sdkwork/router/postgres-password:ro" \
  clawrouter:0.3.0
```

生产服务和容器部署应把运行配置、日志和可变数据目录作为可写资源挂载，并通过受保护 TOML、密码文件或平台 Secret 注入 PostgreSQL 密码。

## 8. 升级 release 版本

1. 阅读目标版本 release note，例如 [v0.3.0](../../release/2026-05-17-v0.3.0.md)。
2. 备份数据库和运行时配置。
3. 停止旧版本服务。
4. 安装或解压新 release 包。
5. 保留目标机器上的 `/etc/sdkwork/router/clawrouter.env`、`/etc/sdkwork/router/database.secret`、归档部署可能使用的 `.env.release` 和运行时 TOML。
6. Linux service 包直接启动服务，让 systemd 自动执行 `ensure` 和 `refresh-catalog --force`。
7. archive/manual 部署手动执行 `clawrouterctl ensure` 和 `clawrouterctl refresh-catalog --force`。
8. 启动新版本并检查 `/healthz` 和 `/readyz`。

## 9. 故障排查

- `missing_database_url`：部署明确要求 PostgreSQL，但没有提供 PostgreSQL URL。
- `invalid_argument`：命令参数不受支持或格式错误。
- `invalid_state`：当前安装状态不能满足请求的命令。
- `database_error`：数据库不可达、权限不足或 schema 初始化失败。
- `catalog_error`：模型目录路径、版本或内容校验失败。
- `commerce_error`：Commerce bootstrap schema 或种子数据初始化失败。
- `/healthz` 成功但 `/readyz` 失败：edge 进程已启动，但 gateway/admin/app/portal upstream 或数据库未就绪。
- Linux 服务启动后立即退出：检查 `/etc/sdkwork/router/clawrouter.toml`、`/etc/sdkwork/router/database.secret`、`/etc/sdkwork/router/clawrouter.env` 和 `journalctl -u clawrouter`。

