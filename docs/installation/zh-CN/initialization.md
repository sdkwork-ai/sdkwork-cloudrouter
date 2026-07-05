# 初始化指�?
初始化负责创建运行时配置、安装数据库 schema、导入或刷新模型目录，并确认运行时健康检查路径。不同部署模式的数据库默认策略不同�?
最快路径是在首次启动前完成初始化：

```bash
clawrouterctl status
clawrouterctl ensure
clawrouterctl refresh-catalog --force
clawrouter
```

如果安装的是 Linux 原生 `.deb`，公共命令位�?`/usr/bin`，私有运行时文件位于 `/usr/lib/sdkwork/router`�?
```bash
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

如果安装的是 macOS 原生 `.pkg`，desktop 二进制位�?`/opt/sdkwork/router/bin`，service 二进制位�?`/Library/Application Support/sdkwork/router/bin`�?
```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

如果安装的是 Windows MSI，默认安装目录为�?
```text
<install-root>
```

## 初始化顺�?
archive/manual 部署推荐顺序�?
1. 默认配置不足时，准备受保护的进程环境变量�?2. 准备运行�?TOML 配置�?3. 只有使用托管 PostgreSQL 时才设置数据�?URL�?4. 执行 `clawrouterctl ensure`�?5. 执行 `clawrouterctl refresh-catalog --force`�?6. 启动 `clawrouter`�?7. 检�?`/healthz` �?`/readyz`�?
Linux `service` 部署中，`.deb` 会创建默认运行时 TOML、`/etc/sdkwork/router/clawrouter.env` �?`/etc/sdkwork/router/database.secret`。systemd unit 会在 gateway 启动前自动执�?`ensure` �?`refresh-catalog --force`。运行中的服务只能写�?`/var/lib/sdkwork/router` �?`/var/log/sdkwork/router`；`/etc/sdkwork/router` 对服务进程保持只读�?
Linux service 包推荐顺序：

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo systemctl start clawrouter
sudo systemctl status clawrouter --no-pager
```

## 运行时配置路�?
server/service/container 默认路径�?
| 平台 | 配置文件 |
| --- | --- |
| Windows | `%ProgramData%/sdkwork/router/clawrouter.toml` |
| Linux | `/etc/sdkwork/router/clawrouter.toml` |
| macOS | `/Library/Application Support/sdkwork/router/clawrouter.toml` |

desktop 默认路径�?
| 平台 | 配置文件 |
| --- | --- |
| Windows | `%USERPROFILE%/.sdkwork/router/config/clawrouter.toml` |
| Linux | `~/.sdkwork/router/config/clawrouter.toml` |
| macOS | `~/.sdkwork/router/config/clawrouter.toml` |

可用 `SDKWORK_CLAW_CONFIG_FILE` 覆盖�?
```bash
export SDKWORK_CLAW_CONFIG_FILE="/etc/sdkwork/router/clawrouter.toml"
```

PowerShell�?
```powershell
$env:SDKWORK_CLAW_CONFIG_FILE = Join-Path $env:ProgramData "sdkwork/router/clawrouter.toml"
```

原生安装包默认位置：

| 平台 | 二进制目�?| 说明 |
| --- | --- | --- |
| Linux `.deb` | `/usr/bin` 公共命令，`/usr/lib/sdkwork/router/bin` 私有二进�?| `service` 包还会安�?`/lib/systemd/system/clawrouter.service`、`/etc/sdkwork/router`、`/var/lib/sdkwork/router` �?`/var/log/sdkwork/router`�?|
| Windows `.msi` | `<install-root>/bin` | MSI 安装运行文件；如需 Windows Service 托管，按部署系统单独配置�?|
| macOS `.pkg` | desktop �?`/opt/sdkwork/router/bin`，service �?`/Library/Application Support/sdkwork/router/bin` | `service` 包还会安�?`/Library/LaunchDaemons/com.sdkwork.clawrouter.plist`�?|

每个包都包含�?`installConfiguration` �?`install-manifest.json`。原生安装包还包�?`nativeInstall`，用于描述最终安装路径、服务元数据、权限和运维命令�?
## 数据库策�?
desktop�?
- 默认 SQLite
- 默认 `max_connections = 1`
- 适合单机体验、桌面应用和轻量本地部署

server/service/container�?
- 默认 PostgreSQL
- 默认 `max_connections = 16`
- 生产、团队、SaaS、托管服务、多节点和商业部署使�?PostgreSQL
- PostgreSQL 部署使用 `max_connections = 16` 或经过容量规划的�?
默认 Linux service 部署会创建以下运行时数据库配置：

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
gateway_invocation_body_max_bytes = 1048576

[runtime]
deployment_mode = "server"
```

`.deb` 包创建的 `/etc/sdkwork/router/database.secret` 初始内容是占位�?`change-me`。启�?`clawrouter` 前必须替换为真实 PostgreSQL 密码；server 配置仍使�?`db.example.com` �?`change-me` 时会被启动校验拒绝�?
server/service/container 部署默认启用并要�?Redis。首次启动前必须配置 `[redis].host`、`[redis].port`、`[redis].database`；只有托�?Redis 端点无法用分离字段清晰表达时，才使用 `[redis].url` 作为高级覆盖。优先使�?`/etc/sdkwork/router/redis.secret` 或其他受保护�?`password_file`，只�?TOML 文件本身按密钥文件管理时才直接使�?`[redis].password`。desktop 部署仍保�?Redis 可选且默认关闭�?
`[request_limits]` 控制运行�?JSON �?webhook 请求体限制，属于高风险写入入口的防护配置。`admin_app_json_body_max_bytes` �?`admin_skill_json_body_max_bytes` 保护后台管理 API，`forum_json_body_max_bytes` 保护公开应用论坛写入，`payment_callback_body_max_bytes` 保护支付供应商回调。反向代理、负载均衡和容器 ingress 的请求体限制应与这些值保持一致，使超大请求在进入昂贵业务处理前被拒绝�?
`[edge]` 配置打包后的 Rust edge server 和上游服务目标。`[portal.static]` �?HTML/runtime env �?no-store 缓存策略与长期缓存的 hash 静态资源分离。`[portal.security]` 控制浏览器侧安全策略；只有公网主机名已经通过 HTTPS 访问时才启用 HSTS，启�?preload 时保�?`hsts_max_age_seconds >= 31536000` �?`hsts_include_subdomains = true`。`csp_frame_src` 只填写允�?portal 嵌入的明确信�?HTTP/HTTPS origin。`[portal.tools]` 控制可选本地工�?API 的请求体大小和限流。`[observability]` 负责生产日志默认策略：`log_filter` �?tracing 过滤器，`log_format` 可�?`compact`、`json`、`pretty` �?`full`，systemd �?container 日志建议保持 `log_ansi = false`，target/thread 字段控制输出的日志元信息；`RUST_LOG` 只建议用于临时进程级诊断覆盖�?`[edge].cors_allowed_origins` 是额外可信浏览器 origin 的显�?allowlist，例如外�?CDN 托管�?portal。打包后的同�?edge 部署保持空数组；通配�?origin 和带 path �?origin 会被拒绝�?`[provider_relay.runtime]` 配置 OpenAI-compatible 上游请求的全局响应超时，以�?admin/app 渠道健康检查超时。`[provider_relay.retry]` 是数据库路由渠道未单独定�?retry policy 时使用的默认重试策略�?
生产 server/service/container 部署使用结构�?TOML。推荐使�?`password_file`，只有当 TOML 文件本身作为密钥文件保护时才直接使用 `password`�?
- `password_file` 可以是绝对路径�?- `password_file` 可以是相�?`clawrouter.toml` 所在目录的路径�?- `password_file` 可以使用 `${VAR}`、`$VAR`、`%VAR%` �?`~` 展开，用于平�?Secret 路径�?
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
gateway_invocation_body_max_bytes = 1048576

[runtime]
deployment_mode = "server"
```

`SDKWORK_CLAW_DATABASE_URL` 仍可�?`/etc/sdkwork/router/clawrouter.env` 或进程环境中作为明确运维覆盖�?
```text
SDKWORK_CLAW_DATABASE_URL=postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod
```

desktop SQLite 示例�?
```toml
[database]
engine = "sqlite"
file = "~/.sdkwork/router/data/router.sqlite"
max_connections = 1

[runtime]
deployment_mode = "desktop"
```

## Installer 命令

下面的命令假�?`clawrouterctl` 已在 `PATH` 中。若�?release 包解压目录执行，Linux/macOS 使用 `./bin/clawrouterctl`，Windows 使用 `.\bin\clawrouterctl.exe`�?
Linux 原生 `.deb` 安装包使用：

```bash
/usr/bin/clawrouterctl status
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
```

macOS 原生 `.pkg` desktop 安装包使用：

```bash
/opt/sdkwork/router/bin/clawrouterctl status
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
```

Windows MSI 默认安装目录中使用：

```powershell
$installRoot = Join-Path $env:USERPROFILE "sdkwork\router"
Set-Location $installRoot
.\bin\clawrouterctl.exe status
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

查看状态：

```bash
clawrouterctl status
```

安装或修�?schema�?
```bash
clawrouterctl ensure
```

刷新模型目录�?
```bash
clawrouterctl refresh-catalog --force
```

只刷新指�?vendor�?
```bash
clawrouterctl refresh-catalog --vendor openai
```

使用外部模型目录�?
```bash
clawrouterctl refresh-catalog --catalog-root /opt/sdkwork-models --catalog-version 2026.05.08.1 --force
```

预演刷新�?
```bash
clawrouterctl refresh-catalog --vendor openai --dry-run
```

Windows 命令使用 `.exe`�?
```powershell
.\bin\clawrouterctl.exe ensure
.\bin\clawrouterctl.exe refresh-catalog --force
```

## 输出和错�?
installer 标准输出为一�?JSON 对象。错误输出也�?JSON�?
```json
{"status":"error","errorCode":"database_error","message":"..."}
```

稳定错误码：

- `missing_database_url`：部署明确要�?PostgreSQL，但没有提供 PostgreSQL URL
- `invalid_argument`
- `invalid_state`
- `database_error`
- `catalog_error`
- `commerce_error`
- `installer_error`

## 健康检�?
启动后检查：

```bash
curl http://127.0.0.1:3900/healthz
curl http://127.0.0.1:3900/readyz
```

`/healthz` 只表�?edge server 进程健康。`/readyz` 会检�?gateway、backend/admin API、app API、portal upstream 和数据库相关依赖�?
Linux service 还应检�?systemd 和日志：

```bash
sudo systemctl status clawrouter --no-pager
sudo journalctl -u clawrouter -n 200 --no-pager
```

## 首次账号�?IAM

首次安装或首次启动时，如果配置的 bootstrap admin 登录链路不完整，Claw Router 会自动创建或修复初始化管理员账号。默认账号为�?
- 用户名：`admin`
- 租户：`default`（`tenantId: "100001"`�?- 组织：`root`（`organizationId: "0"`�?
初始密码默认由操作系统随机源生成；如果设置了 `SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD`，则使用该显式密码。只要本次确实写入了新的初始化密码，系统会在两个位置输出一次：

- installer JSON 输出�?`bootstrapAdmin.initialPassword`
- gateway/admin/app 服务启动日志中的 `initial_password`

请立即保存该密码，并在首次登录后立刻轮换。后续重复执�?`ensure` 或重启服务时，如果管理员登录链路已经完整，不会再次输出或重置密码。如果已�?admin 用户和有效密码，只是 IAM 组织成员关系缺失，启动修复只会补齐成员关系，不会改密码，也不会输出密码�?
bootstrap admin 环境变量�?
| 变量 | 默认�?| 说明 |
| --- | --- | --- |
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_ENABLED` | `true` | 设置�?`false` 可关闭自动创建和修复 bootstrap admin�?|
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_USERNAME` | `admin` | 初始化用户名。允许字母、数字、`.`、`-`、`_`�?|
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_DISPLAY_NAME` | `Administrator` | 初始化用户显示名�?|
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_EMAIL` | `admin@sdkwork.com` | 初始化用户邮箱身份�?|
| `SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD` | 随机生成 | 可选显式初始密码，长度 12 �?128 个字符�?|

installer 输出示例�?
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

需要快速恢复管理员登录时，可以通过根目�?`pnpm` 命令重置 `admin` 密码。开发模式默认使�?`target/dev/clawrouter.sqlite`，release 模式使用运行�?`clawrouter.toml` 中的数据库配置。脚本不会把密码继续传给 installer/cargo 子进程命令行；如果需要避免密码出现在 shell history �?Node 进程参数中，请使�?`SDKWORK_CLAW_ADMIN_RESET_PASSWORD` 环境变量�?
```bash
pnpm admin:reset:dev -- --password "Admin-Dev-Password-2026!"
pnpm admin:reset:release -- --password "Admin-Release-Password-2026!"
```

更适合 release 运维的写法：

```bash
SDKWORK_CLAW_ADMIN_RESET_PASSWORD="Admin-Release-Password-2026!" pnpm admin:reset:release
```

默认重置账号�?`admin`，显示名�?`Administrator`，邮箱身份为 `admin@sdkwork.com`。如需覆盖�?
```bash
pnpm admin:reset:release -- \
  --username admin \
  --display-name "Administrator" \
  --email "admin@sdkwork.com" \
  --password "Admin-Release-Password-2026!"
```

Claw Router 的登录、注册、二维码登录、验证码策略和恢复方式由 IAM 运行时配置控制。`v0.3.0` 默认保持严格姿态：密码登录默认可用，二维码、验证码登录、OAuth、session bridge 等能力需要显式开启�?
首次登录后，请在后台配置 IAM 策略，包括登录方式、二维码登录、注册验证码、OAuth 展示和账号恢复方式�?