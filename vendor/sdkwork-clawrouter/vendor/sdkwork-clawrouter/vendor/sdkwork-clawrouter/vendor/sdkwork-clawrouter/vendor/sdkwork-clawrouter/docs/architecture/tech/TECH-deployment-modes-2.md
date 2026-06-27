> Migrated from `docs/installation/zh-CN/deployment-modes.md` on 2026-06-24.
> Owner: SDKWork maintainers

SDKWork Claw Router release 包覆盖 `archive`、`service`、`container`、`desktop` 四种模式。源码运行属于单独的 `source` 场景。

## 模式对比

| 模式 | 包类型 | 默认数据库 | 启动方式 | 推荐场景 |
| --- | --- | --- | --- | --- |
| `desktop` | 原生安装包（`.deb`、`.msi`、`.pkg`） | SQLite | 直接运行 gateway | 单机体验、本地演示 |
| `archive` | `self-contained-archive` | PostgreSQL | 直接运行 gateway | 私有服务器、手动部署 |
| `service` | 原生安装包（`.deb`、`.msi`、`.pkg`） | PostgreSQL | 主机服务管理器 | 长期运行生产服务 |
| `container` | `container-image` | PostgreSQL | Containerfile / entrypoint | Docker、Kubernetes、容器平台 |
| `source` | 源码工作区 | PostgreSQL 一体化开发（默认）；`dev:desktop` 为网关客户端 | `pnpm dev` / `pnpm dev` / `pnpm start` | 开发、验证、私有构建 |

源码工作区说明：`pnpm dev`（别名 `pnpm dev`、`pnpm dev:server`）启动一体化 product server 开发配置。`pnpm dev:desktop`（别名 `pnpm dev:desktop`、`pnpm dev:desktop`）仅启动 `sdkwork-api-cloud-gateway` 客户端工作区。

archive、service、container 服务端部署默认启用并要求 Redis，因为服务端缓存运行时使用 Redis 承载共享状态。desktop 包仍保持 Redis 可选且默认关闭。

## Desktop

特点：

- 默认 SQLite。
- `clawrouter.toml` 中包含 Redis 配置，但默认保持关闭。
- 自动使用 OS 用户目录下的配置和数据目录。
- 不要求外部 PostgreSQL。
- Linux、Windows、macOS 均发布为平台原生安装包。
- 适合个人试用、演示和本地调试。

Linux 原生 `.deb` 启动：

```bash
/usr/bin/clawrouterctl ensure
/usr/bin/clawrouterctl refresh-catalog --force
/usr/bin/clawrouter
```

macOS 原生 `.pkg` 启动：

```bash
/opt/sdkwork/router/bin/clawrouterctl ensure
/opt/sdkwork/router/bin/clawrouterctl refresh-catalog --force
/opt/sdkwork/router/bin/clawrouter
```

如果从可移植归档包根目录启动：

```bash
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
./bin/clawrouter
```

## Archive

特点：

- 自包含服务端归档。
- 默认 PostgreSQL。
- 默认启用并要求通过 `[redis]` 配置 Redis。
- 配置、数据、日志由部署脚本或运维系统管理。

启动：

```bash
./bin/clawrouterctl ensure
./bin/clawrouterctl refresh-catalog --force
./bin/clawrouter
```

## Service

特点：

- Linux、Windows、macOS 均发布为平台原生安装包。
- Linux `.deb` service 包会安装 systemd unit。
- macOS `.pkg` service 包会安装 launchd plist。
- macOS service 包通过 launchd runner 启动，runner 会在 gateway 前执行 `ensure` 和 `refresh-catalog --force`。
- Windows `.msi` 包安装运行文件和服务元数据，实际服务注册由目标主机部署系统配置。
- 默认使用 PostgreSQL，Linux 服务覆盖项保存在 `/etc/sdkwork/router/clawrouter.env`。
- PostgreSQL 密码默认放在 `/etc/sdkwork/router/database.secret`，也可以在受保护 TOML 中直接配置 `password`。
- 如 Redis 启用了认证，可使用 `/etc/sdkwork/router/redis.secret` 保存 Redis 密码。
- Linux service 包会让运行中的服务只读访问 `/etc/sdkwork/router`，只允许写入数据和日志目录。
- 原生安装包 manifest 包含 `nativeInstall`，记录最终路径、服务元数据、权限和运维命令。

原生服务资产：

```text
Windows: clawrouter-windows-x64-server-0.3.0.msi
Linux: clawrouter-linux-x64-server-0.3.0.deb
macOS: clawrouter-macos-arm64-server-0.3.0.pkg
```

Linux 安装 `.deb` 后通常只需要检查服务状态：

```bash
sudo apt install ./clawrouter-linux-x64-server-0.3.0.deb
sudo editor /etc/sdkwork/router/clawrouter.toml
sudo systemctl start clawrouter
sudo systemctl status clawrouter --no-pager
```

## Container

特点：

- 包含 `container/Containerfile` 和 entrypoint。
- entrypoint 会执行 `ensure` 和 `refresh-catalog --force`，再启动 gateway。
- PostgreSQL 配置、必需 Redis 配置、密码文件、日志和可写数据目录建议通过环境变量、平台 Secret 或挂载传入。

示例：

```bash
docker build -f container/Containerfile -t clawrouter:0.3.0 .
docker run --rm -p 3900:3900 \
  -v "$PWD/config/clawrouter.toml.example:/etc/sdkwork/router/clawrouter.toml:ro" \
  -v "$PWD/secrets/postgres-password:/run/secrets/sdkwork/router/postgres-password:ro" \
  -v "$PWD/secrets/redis-password:/run/secrets/sdkwork/router/redis-password:ro" \
  clawrouter:0.3.0
```

Kubernetes 部署时建议：

- 使用 Secret 保存数据库 URL。
- Redis 启用认证时为 Redis 密码配置 Secret。
- 使用 ConfigMap 或挂载文件提供 `clawrouter.toml`。
- 配置 readinessProbe 指向 `/readyz`。
- 配置 livenessProbe 指向 `/healthz`。
- 不把 `.env.release` bake 到镜像。

## Source

源码方式详见 [source-install.md](./source-install.md)。源码工作区适合开发、验证和构建 release 包，不建议直接作为生产守护进程运行。生产运行优先使用 release 包、系统服务或容器。

