# 源码安装与部署

源码方式适合本地开发、二次集成、私有构建和 release 包生产。命令默认在仓库根目录执行。

## 1. 前置依赖

需要安装：

- Git
- Node.js 22 或兼容版本
- pnpm `10.33.0`
- Rust toolchain 和 Cargo
- Python 3
- 可选：Docker Desktop，用于 PostgreSQL 集成测试
- server 模式生产部署：PostgreSQL

快速检查：

```powershell
git --version
node --version
pnpm --version
cargo --version
python --version
```

## 2. 获取源码

```powershell
git clone https://github.com/Sdkwork-Cloud/sdkwork-clawrouter.git
cd sdkwork-clawrouter
```

安装 portal workspace 依赖：

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc install
```

也可以直接使用根命令，它会在需要时安装 portal 依赖：

```powershell
pnpm dev -- --install
```

## 3. 源码开发模式

完整开发工作区：

```powershell
pnpm dev
```

只启动 server 开发模式：

```powershell
pnpm dev:server
```

只启动 portal 浏览器开发服务：

```powershell
pnpm dev:desktop
```

打印启动计划而不启动：

```powershell
pnpm topology:plan:server
```

默认访问：

```text
Direct Portal Dev: http://127.0.0.1:3901/
SDKWork API Gateway: http://127.0.0.1:3902/
Gateway: http://127.0.0.1:3902/v1
Admin API: http://127.0.0.1:3902/backend/v3/api
App API: http://127.0.0.1:3902/app/v3/api
```

## 4. 绑定地址和转发目标

外部访问开发服务：

```powershell
pnpm dev:server -- --gateway-bind 0.0.0.0:19080 --server-bind 0.0.0.0:12900 --portal-bind 0.0.0.0:13900
```

把 edge server 转发到已有服务：

```powershell
pnpm dev:server -- --gateway-forward-url http://gateway.internal:18080 --backend-api-forward-url http://admin.internal:18081 --app-api-forward-url http://app.internal:18082
```

反向代理 HTTPS 场景：

```powershell
pnpm dev:server -- --external-scheme https --trust-forwarded-headers
```

只在受控反向代理后启用 forwarded header 信任。

## 5. 源码生产构建

```powershell
pnpm build
```

该命令会：

- 生成 gateway OpenAPI
- 构建 app/backend/open TypeScript SDK runtime
- 构建 portal production assets
- 生成 SDK ZIP archives
- 构建 Rust edge release binary

构建后启动 production portal：

```powershell
pnpm start
```

初始化配置但不启动：

```powershell
pnpm start -- --init-config-only --deployment-mode server
pnpm start -- --init-config-only --deployment-mode desktop
```

源码或 CI release host 可以从受保护的进程环境生成 `.env.release`：

```powershell
pnpm release:env:write -- --check
pnpm release:env:write -- --force
```

该命令只适用于源码工作区。正式 release 包解压到目标机器后，不要求安装 `pnpm` 或源码脚本；目标机器应复制 `.env.release.example`、写入受保护环境变量，或使用运行时 TOML。

server 模式指定 PostgreSQL：

```powershell
$env:SDKWORK_CLAW_DATABASE_URL="postgresql://sdkwork_ai_prod:<password>@db.example.com:5432/sdkwork_ai_prod"
pnpm start -- --deployment-mode server
```

首次执行 `pnpm dev -- --install`、`pnpm start` 或 installer `ensure` 时，会按需初始化 bootstrap admin 登录。请保存 installer JSON 中的 `bootstrapAdmin.initialPassword`，或启动日志中的 `initial_password`，首次登录后立即轮换。管理员登录链路完整后，后续初始化不会再输出或重置密码。

## 6. 从源码构建 release 安装包

查看当前安装包矩阵：

```powershell
pnpm install:packages:plan
```

校验矩阵：

```powershell
pnpm install:packages:check
```

构建生产产物：

```powershell
pnpm build
```

构建安装包需要一个 staging 目录，目录中应包含 release 二进制、portal dist、SDK archives 和 `.env.release.example`。构建命令：

```powershell
pnpm install:package:build -- --package-id windows-x64-archive --staging-root dist\install-package-staging --output-dir dist\install-packages
```

校验全部包的构建计划，不写 archive：

```powershell
pnpm install:package:check
```

校验全部原生安装包计划，不写真实安装包：

```powershell
pnpm install:native:check
```

构建当前主机对应的原生安装包：

```powershell
pnpm install:native:build -- --package-id windows-x64-service --staging-root dist\install-package-staging --output-dir dist\install-packages
```

原生安装包格式与构建操作系统绑定：Linux 生成 `.deb`，Windows 生成 `.msi`，macOS 生成 `.pkg`，应在匹配的 runner 或主机上构建。

指定旧版本包名：

```powershell
node scripts\build-claw-router-install-package.mjs --package-id windows-x64-archive --version 0.1.0 --check --dry-run
```

## 7. 源码初始化 smoke

快速校验安装初始化合同：

```powershell
pnpm install:init:smoke
```

对已构建的真实 installer 执行初始化 smoke：

```powershell
node scripts\smoke-install-package-init.mjs --package-id linux-x64-archive --package-root dist\install-package-staging --installer-bin bin\clawrouterctl --tmp-root target\install-init-smoke\linux-x64 --check
```

## 8. 验证

开发循环：

```powershell
pnpm verify:fast
```

交付前：

```powershell
pnpm verify
```

release 主机：

```powershell
pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean
```

Docker PostgreSQL 集成测试：

```powershell
pnpm test:postgres:docker
```
