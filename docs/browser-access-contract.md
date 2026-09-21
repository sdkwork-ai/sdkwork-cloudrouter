# Cloud Router 浏览器访问契约（Browser Access Contract）

> 状态：生效（2026-09-19）。本文是 PC/H5 浏览器在 development / test / staging / demo / production 全环境、dev 与 build 两侧访问规则的唯一中文权威摘要；规范性正文以 sdkwork-specs 为准，本文不复制其规范性条款，只做映射与落地说明。
>
> 规范权威：
> - `../sdkwork-specs/APP_RUNTIME_ENV_SPEC.md`（所有应用面的运行时环境总纲：四象限 base-URL 生命周期矩阵、`browser-document`/`transport` 两种表面形态、统一 `resolveBaseUrl`、共享 Vite 集成）
> - `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md` §3、§4.1、§4.2、§6、§7、§8（§8.2 自适应浏览器交付、§8 单平面单绑定）
> - `../sdkwork-specs/PNPM_SCRIPT_SPEC.md` §2、§3、§4
> - `../sdkwork-specs/ENVIRONMENT_SPEC.md` §5.1.0.1、§5.1.4、§6.2、§6.2.1、§6.3
> - `../sdkwork-specs/CONFIG_SPEC.md` §3.1
> - `../sdkwork-specs/FRONTEND_CODE_SPEC.md`（PC/H5 构建产物布局）
> - `../sdkwork-specs/BROWSER_RUNTIME_ENV_SPEC.md`（`APP_RUNTIME_ENV_SPEC` 浏览器附录：运行时环境文档 + `SDKWORK_RUNTIME_ENV` 全局桥 + SDK base 集成规范）
> - 本仓库执行契约：`AGENTS.md` → "Dev Web Access Contract"；`specs/topology.spec.json`（含 `cloudPublicHosts` 域名注册表）；`etc/topology/*.env`（10 个部署档案）
>
> 统一工具实现（禁止各模块复刻）：
> - 工具侧矩阵解析：`../sdkwork-specs/tools/app-base-url.mjs` `resolveBaseUrl({ deploymentProfile, environment, phase, surface })`（多域名拆分 `splitBaseUrls` + 页面主机自动适配 `selectBaseUrlForPageHost`）
> - 共享 Vite 集成：`../sdkwork-specs/tools/browser-runtime-env-vite.mjs` `createBrowserRuntimeEnvVitePlugin`（PC/H5 共用中间件/构建产物/脚本注入接线）
> - 本仓库绑定：`scripts/lib/cloud-router-browser-env-contract.mjs` `resolveCloudRouterBaseUrl`（填充 Cloud Router 拓扑入参后委派标准实现）
>
> 回归门禁：`pnpm test:topology`（含 `scripts/dev/browser-dev-access-contract.test.mjs` 模式矩阵）；`node --test scripts/lib/cloud-router-browser-env-contract.test.mjs`（含 10 档案 × dev/build × 文档/传输矩阵回归，拓扑驱动）。

---

## 1. 四象限权威规则

| | **dev**（开发运行时） | **build / 部署产物** |
|---|---|---|
| **standalone** | 唯一浏览器入口 = 自适应同源入口（`SDKWORK_CLOUDROUTER_ROUTER_WEB_DEV_INGRESS_BIND`，默认 `http://127.0.0.1:4734`）；API base = **同源相对路径**（`/app/v3/api`、`/backend/v3/api`、`/v1`）；服务端扇出 → application.public-ingress（开发绑定 `0.0.0.0:3905`） | 域名同源：静态资源与 API 同域（如 `https://router.sdkwork.com`），SDK base = `/`；产物目录 `dist/standalone/<envAlias>`；由 standalone 网关 gateway-static + 设备分流伺服 |
| **cloud** | 同一 4734 入口、同形制同源文档（与 standalone 逐字一致）；服务端扇出 → **本地 `sdkwork-api-cloud-gateway`**（`SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL=http://127.0.0.1:3900`，由该兄弟仓库自己的 `pnpm dev` 启动；健康检查失败即 fail-closed）；**dev 表面禁止出现 `api-dev.<域名>` 等部署域** | 跨域：SDK base = `https://api-<环境后缀>.<域名>`（多域名族分号连接）；页面在 `router-<环境后缀>.<域名>`；产物目录 `dist/cloud/<envAlias>` |

要点：

- "同源"指**浏览器视角**：请求 URL 的 origin 与页面 origin 一致。入口把 `/app/v3/api` 等规范路径转发到 3905/3900 属服务端内部传输（APP_RUNTIME_TOPOLOGY_SPEC §6："internal transport, never emitted as a browser SDK Base URL"），不破坏同源。
- standalone 与 cloud 在 **dev 浏览器侧没有任何区别**：同一个入口、同一份同源文档。模式差异只体现在服务端扇出目标（3905 vs 3900）。这是设计目标，也是模式矩阵回归测试断言的内容。
- PC 与 H5 **共用同一端口与同一入口**：设备类别决定渲染哪套页面（移动 → H5，桌面 → PC），判据与生产共享（§3.2）。
- SDK base 跟随**部署档案**（standalone=同源 / cloud=api-* 族），不跟随环境；环境只改变域名后缀与部署形态（§2）。

## 2. 环境矩阵：development / test / staging / demo / production

### 2.1 通用环境规则

1. **环境后缀命名**：域名后缀 `-dev` / `-test` / `-staging` / `-demo`；**无后缀 = production**（`router.sdkwork.com` / `api.sdkwork.com`）。命令里的环境别名：`dev`→development、`prod`→production，`test` / `staging` / `demo` 同名（`build:pc:prod` → standalone.production，产物 `dist/standalone/prod`）。
2. **多基础域族**：以下所有规则对 16 个注册基础域同构——`sdkwork.com/.cn`、`birdcoder.com/.cn`、`dtupay.com/.cn`、`noaper.com/.cn`、`skubc.com/.cn`、`zowalk.com/.cn`、`offer86.com/.cn`、`86offer.com/.cn`；`cloudrouter.<base>` 是 `router.<base>` 的过渡别名。本文表格只列 `sdkwork.com` 代表域。
3. **dev 命令仅存在于 development**：`pnpm dev` 与 `pnpm dev:cloud` 是仅有的两个公开开发命令（PNPM_SCRIPT_SPEC §3）；test / staging / demo / production 不得增设 dev 入口。这四个环境的 standalone 档案是**本机预演 / 安装部署**档案，cloud 档案是**容器部署**档案。
4. **loopback 纪律**：loopback / 带端口 URL 只允许出现在 development 的 dev 运行时与 test/staging 的**本机预演档案**中；**任何环境的构建产物若用于真实部署，禁止携带 loopback 或带端口 URL**（部署用的 production 档案天然满足；test/staging 的真实部署走 cloud 容器档案，域名为 `*-test` / `*-staging` 族）。
5. **每环境的 CORS 允许列表**：`etc/topology/<profile>.env` 的 `SDKWORK_CORS_ALLOWED_ORIGINS` 恰好枚举该环境的页面域族 + （development 额外含 `http://127.0.0.1:4734` / `localhost:4734` 自适应入口）+ 桌面/小程序 scheme。
6. **环境与档案的映射**：命令环境别名 → `{standalone|cloud}.{environment}` 档案 → `etc/topology/{profile}.{environment}.env`。10 个档案都有对应 env 文件，orchestration 定义谁能启动什么进程。

### 2.2 十个部署档案总览

| 档案 | 形态 | 用途 | 页面域（部署身份） | 浏览器可见 API base（部署产物） | dev 命令 |
|---|---|---|---|---|---|
| `standalone.development` | 源码运行 | 日常开发 | —（loopback 4734） | 同源相对（dev 运行时） | `pnpm dev` |
| `cloud.development` | 客户端-only + 远端容器 | cloud 开发 | （本地）4734；部署身份 `router-dev` | 同源相对（扇出 → 本地 3900） | `pnpm dev:cloud` |
| `standalone.test` | 本机预演（loopback） | test 集成预演 | `https://127.0.0.1:3900` | loopback 预演值（不得用于部署） | 无 |
| `cloud.test` | 容器部署 | test 部署 | `https://router-test.sdkwork.com` | `https://api-test.sdkwork.com` 族 | 无 |
| `standalone.staging` | 本机预演（dist 根） | staging 预演 | `https://127.0.0.1:3900` | loopback 预演值（不得用于部署） | 无 |
| `cloud.staging` | 容器部署 | staging 部署 | `https://router-staging.sdkwork.com` | `https://api-staging.sdkwork.com` 族 | 无 |
| `standalone.demo` | 独立演示安装 | demo 部署 | `https://router-demo.sdkwork.com` | 同源（同域） | 无 |
| `cloud.demo` | 容器部署 | demo 部署 | `https://router-demo.sdkwork.com` | `https://api-demo.sdkwork.com` 族 | 无 |
| `standalone.production` | native/archive 安装 | 生产部署 | `https://router.sdkwork.com` | 同源 `/` | 无 |
| `cloud.production` | 容器部署 | 生产部署 | `https://router.sdkwork.com` | `https://api.sdkwork.com` 族 | 无 |

其余 API 面域名族（每环境同构，生产无后缀）：管理面 `router-admin[-<env>]`、开放面 `router-open[-<env>]`、平台网关 `api[-<env>]`、drive 兄弟 `drive[-<env>]`。

### 2.3 development —— 唯一拥有 dev 命令的环境

- **`pnpm dev`（standalone.development）**：本机全栈。前置 PostgreSQL（工作区统一 `sdkwork_ai_dev` 族库名）+ Redis；进程与端口见 §4；浏览器拿到同源相对文档（§6）。CORS 额外允许 4734。
- **`pnpm dev:cloud`（cloud.development）**：本仓库仅启动 4734 入口 + 两个私有渲染器；平台网关由 `sdkwork-api-cloud-gateway` 仓库的 `pnpm dev` 启动在 `127.0.0.1:3900`，未运行则 fail-closed。档案 env 里的 `router-dev.sdkwork.com:3905` / `https://api-dev.sdkwork.com` 是**部署身份记录**，dev 运行时一律被网关绑定重写为本地 3900，绝不进浏览器文档。
- **构建**：`build:pc:dev` / `build:h5:dev` → `dist/standalone/dev`，页面域 `http://router-dev.sdkwork.com:3905/`（dev standalone 边缘带端口，`etc/sdkwork.deployment.config.json` + web-domain-routing 测试锚定）；`build:*:dev:cloud` → `dist/cloud/dev`，SDK base `https://api-dev.sdkwork.com` 族。
- 特殊规则：development 是唯一允许 loopback/带端口值进入 dev 运行时的环境；也是唯一声明 `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` 的环境。

### 2.4 test —— 本机预演 + 容器部署双轨

- **无 dev 命令**。两条路径：
  1. **本机预演**（`standalone.test`）：先用 `build:pc:test` / `build:h5:test` 产出 `dist/standalone/test`，再以 test 档案本机起栈——loopback 绑定 `https://127.0.0.1:3900`（入口）、`18080`/`18081`（open/backend 内部面），并保留 4734 自适应客户端交付用于预演页面。产物的 API base 是 **loopback 预演值，只在本机有效，禁止部署**。
  2. **真实部署**（`cloud.test`）：容器档案，页面 `https://router-test.sdkwork.com`，SDK base `https://api-test.sdkwork.com` 族；档案保留可选的 4734 客户端预演交付。
- drive 兄弟：本机预演 `http://127.0.0.1:3900`；cloud 部署 `https://drive-test.sdkwork.com`。
- 规则：test 产物域名一律 `-test` 后缀；与 development 共享机器时端口天然隔离，互不影响。

### 2.5 staging —— 发布前最后域名校验点

- 形态与 test 双轨相同：
  1. **本机预演**（`standalone.staging`）：`SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip`；`SDKWORK_CLOUDROUTER_ROUTER_PC_STATIC_ROOT` / `..._H5_STATIC_ROOT` 指向 `apps/*/dist/standalone/staging`（直接伺服 staging 构建产物）；loopback 绑定 `https://127.0.0.1:3900`。
  2. **真实部署**（`cloud.staging`）：容器；页面 `https://router-staging.sdkwork.com`；SDK base `https://api-staging.sdkwork.com` 族。
- 规则：staging 预演/部署使用 `-staging` 后缀域族，用于在进入生产前核对 TLS 证书、域名族解析与多基础域绑定（16 域族逐一过）。

### 2.6 demo —— 完全隔离的演示部署

- `standalone.demo` / `cloud.demo` 都是**纯部署档案**（orchestration 无本地进程、无 dev 流）。
- **数据完全隔离**：专用 demo PostgreSQL 库 `sdkwork_cloudrouter_demo`；Redis 使用独立逻辑 DB 索引；档案 env 故意不声明具体 database/redis 连接键——由 provisioning 在激活前注入。
- 页面 `https://router-demo.sdkwork.com`；standalone.demo SDK base 同源（同域），cloud.demo SDK base `https://api-demo.sdkwork.com` 族；drive `https://drive-demo.sdkwork.com`。
- 规则：demo 可随时整库重建，不允许与其他环境共享任何数据存储或缓存键。

### 2.7 production —— 无后缀域名，零 dev 表面

- 两种部署形态（二选一，由 `deploy:plan --profile standalone.production | cloud.production` 校验）：
  1. **standalone.production**：native/archive 安装包；进程绑定 `0.0.0.0:3900`，位于平台 HTTPS 边缘之后；自适应资产根 `SDKWORK_CLOUDROUTER_ROUTER_PC|H5_STATIC_ROOT=/usr/share/sdkwork/router/web/{pc,h5}`，由 nginx `@pc` / `@h5` named locations 按设备分流（与 dev §4 判据共享）；SDK base `https://router.sdkwork.com` 同源 `/`；drive 走同源 `/backend/v3/api`。
  2. **cloud.production**：容器；页面 `https://router.sdkwork.com`；SDK base `https://api.sdkwork.com` 族；drive `https://drive.sdkwork.com`。
- 规则：生产域名无环境后缀；`SDKWORK_CLOUDROUTER_STARTUP_INSTALL_MODE=skip`；镜像版本钉死且经 `bin/` 入口构建/部署（生产变更需 `--yes`）；禁止任何 dev 表面、loopback、带端口值；生产 CORS 只含生产页面域 + 桌面/小程序 scheme。

## 3. 为什么 `pnpm dev` 会"看到两个端口"

| 端口 | 进程 | 性质 |
|---|---|---|
| **4734** | 自适应 Web 开发入口（Node http server） | **唯一浏览器入口**。按设备类别选择渲染器：声明式 overrides → `Sec-CH-UA-Mobile: ?1` → iPad/平板默认 PC → 移动 UA（`SDKWORK_DEPLOY_SPEC` §8 共享判据）→ 桌面；互为回退；响应带 `Vary: user-agent` |
| 4736 | PC Vite（`apps/sdkwork-cloudrouter-pc`） | 私有渲染器（loopback），**不是浏览器入口** |
| 4737 | H5 Vite（`apps/sdkwork-cloudrouter-h5`） | 私有渲染器（loopback），**不是浏览器入口** |
| 3905 | standalone gateway（Rust） | 应用 API 平面（application.public-ingress，单平面单绑定） |

历史表象的成因：编排器（`sdkwork-app`）以 `stdio: inherit` 启动两个渲染器，两个 Vite 的启动横幅（`Local: http://127.0.0.1:4736/4737`）原样打进控制台，看起来像两个可访问服务。**已修复**：渲染器输出逐行加 `[renderer pc-web]` / `[renderer h5]` 前缀转发；控制台唯一无前缀的访问地址就是 4734。设计本身（两个私有渲染器 + 一个入口）符合 APP_RUNTIME_TOPOLOGY_SPEC §8.2——渲染器属于 client tooling，不计入 API 平面绑定。

## 4. 启动链（谁启动谁）

```
pnpm dev
 └─ sdkwork-app dev --deployment-profile standalone
     ├─ 1. application.public-ingress（cargo run standalone-gateway，3905）→ 等待 /healthz
     ├─ 2. 自适应交付：spawn PC Vite(4736) + H5 Vite(4737)
     ├─ 3. 启动自适应入口（4734）：API 路径 → 3905；其余按设备 → 渲染器
     └─ 4. 打印 Web Access URLs（仅 4734）+ Access Endpoints 目录
```

`pnpm dev:cloud`（cloud.development）：

```
pnpm dev:cloud
 └─ sdkwork-app dev --deployment-profile cloud
     ├─ 前置：健康检查 application.public-ingress 与 platform.api-gateway
     │   （dev 网关绑定后两者都指向 http://127.0.0.1:3900）→ 失败即 fail-closed
     ├─ 仅 spawn 两个私有渲染器 + 自适应入口（4734）
     └─ 本仓库不启动任何网关/DB/边缘进程；3900 由 sdkwork-api-cloud-gateway 仓库的 pnpm dev 启动
```

## 5. 配置分层与优先级（dev 时浏览器 SDK base 的实际生效链）

```
L1 etc/topology/<profile>.env        拓扑权威（SOURCE_CONFIG_SPEC）
L2 sdkwork-app dev 注入的进程 env    L1 + dev 网关绑定重写（cloud.development：平台面+应用面 URL → 127.0.0.1:3900）
L3 渲染器进程 env                    L2 + 交付面 clientHttpEnv 覆写为浏览器可见 origin（4734）
L4 .env.<mode>（生成物）             materialize-client-env 产物，保留 deploy-safe 域名值（与 vite build 共享）
L5 /runtime-env.js|json 文档         浏览器实际拿到的契约文档（dev：同源相对 + profile 身份；build：域名绑定）
L6 SDK 客户端读取 + normalize        应用 commons 归一化 + @sdkwork/sdk-common 解析（读 SDKWORK_RUNTIME_ENV 全局桥；相对 base 同源直通）
L7 SDK 包内回退常量                  如 commons 的 '/app/v3/api'
```

dev 路径的优先级规则：**进程 env（L2/L3）优先于 dotenv 文件（L4）**——materializer 有意把 deploy-safe 域名留在文件里、依赖 dev 进程注入覆盖；L5 由共享契约库 `scripts/lib/cloud-router-browser-env-contract.mjs` 构造并强制同源相对，`assertBrowserDevRuntimeEnvDocument` 是统一断言器。build 路径保持文件优先（runtime-env.json 是部署时权威）。

## 6. 浏览器 SDK base 的三层解析

- **第一层（工具层矩阵，APP_RUNTIME_ENV_SPEC §2/§4）**：`resolveBaseUrl({ deploymentProfile, environment, phase, surface })`（`sdkwork-specs/tools/app-base-url.mjs`，本仓库经 `resolveCloudRouterBaseUrl` 绑定）是 dev/build × standalone/cloud 的唯一矩阵裁决者：standalone 文档 → `/` 同源；cloud dev 文档 → `/` 同源（扇出服务端自理）；cloud dev 传输面 → 本地网关 ip+port（fail-closed）；cloud build → `api-<后缀>.<域名>` 多域名族（primary 优先，族整体物化）。文档的**值**由共享契约库按矩阵裁决强制写入。
- **第二层（应用层，L5）**：读文档键。PC `/runtime-env.js` 包（`VITE_CLOUDROUTER_APP_API_BASE_URL` 等）与 H5 `/runtime-env.json`（`appApiBaseUrl` 等）由同一契约库构造（Vite 接线走共享工厂 `createBrowserRuntimeEnvVitePlugin`）：强制覆写 4 个规范 base 为同源相对值；进程私有拓扑键（`*_APPLICATION_(PUBLIC|OPEN|BACKEND)_HTTP_URL`、`*_PLATFORM_API_GATEWAY_HTTP_URL`）永不出现在浏览器文档。
- **第三层（sdk-common 归一化）**：`normalizeGeneratedSdkBaseUrl` → `@sdkwork/sdk-common` `resolveBaseUrlWithAlignProtocol`。相对候选会按"页面主机 + 部署模式 + 环境"重新派生；mode 从 `readRuntimeEnv` 读取，而该函数的两个浏览器通道均不可用（动态 `globalThis['import.meta']` 非 Vite 可静态注入；`keepProcessEnv: false` 无 process polyfill）→ **mode 永远回落默认 `'cloud'`** → dev 页面端口派生为 `CLOUD_GATEWAY_DEV_PORT = 3910`。

### 已修复（框架层，BROWSER_RUNTIME_ENV_SPEC.md）

**现象**：`pnpm dev` 下浏览器出现 `http://127.0.0.1:3910/app/v3/api/...`（例：`iam/invite/policy`）。3910 不在本仓库任何配置中，是 sdk-common 的内置常量。

**成因链**（已核实到源码行）：
1. `buildAppConfig` 取到正确的相对 base `/app/v3/api`；
2. `normalizeGeneratedSdkBaseUrl` 将其送入 sdk-common `resolveBaseUrl`；
3. 相对候选无 host，四个匹配 pass 全落空 → Pass 5 按当前主机派生；
4. mode 读取在浏览器恒为默认 `'cloud'` → dev 页面端口 = 3910；
5. 产出 `http://127.0.0.1:3910/app/v3/api`。显式绝对 loopback 候选会在 Pass 4 获胜（同源成立），因此只有走相对 base 的调用面受影响。

**已实施修复**（`@sdkwork/sdk-common` + 各浏览器表面）：
1. sdk-common `readRuntimeEnv` 首先读取 `globalThis.SDKWORK_RUNTIME_ENV` 浏览器桥（部署模式/base 键在浏览器内可见，对所有生成 SDK 生效）。
2. sdk-common `resolveBaseUrl` 对相对候选（`/` 开头）**同源直通**（reason `same-origin-relative`）——相对 base 即同源契约，永不按模式派生绝对化。
3. PC `/runtime-env.js` 与 H5 `loadRuntimeEnv()` 均把文档发布到 `SDKWORK_RUNTIME_ENV` 全局（H5 桥接 `VITE_SDKWORK_DEPLOYMENT_PROFILE`/`VITE_SDKWORK_DEPLOY_MODE` 别名）。
规范正文：`../sdkwork-specs/BROWSER_RUNTIME_ENV_SPEC.md`；共享工具：`../sdkwork-specs/tools/browser-runtime-env.mjs`；合规校验：`node ../sdkwork-specs/tools/check-browser-runtime-env-standard.mjs --root .`。

## 7. build 侧规则

| 项 | standalone | cloud |
|---|---|---|
| 命令 | `build:pc:<env>` / `build:h5:<env>`（env ∈ dev/test/staging/demo/prod） | `build:pc:<env>:cloud` / `build:h5:<env>:cloud` |
| outDir | `apps/*/dist/standalone/<envAlias>` | `apps/*/dist/cloud/<envAlias>` |
| SDK base | 部署档案的页面域同源 `/`（production 即 `https://router.sdkwork.com`）；test/staging 产物为本机预演值（§2.4/§2.5，禁止部署） | `https://api-<后缀>.<域名>` 族（分号连接全部注册域） |
| 伺服 | standalone 网关 gateway-static `/` 挂载 + 设备分流（Rust `portal.rs`，与 dev 判据共享） | cloud web 边缘 + 平台网关承担 API |

构建产物禁止出现 loopback 或带端口 URL（`cloud.development` 的 dotenv 锚点与 test/staging 本机预演产物除外——后者禁止部署）；`runtime-env.json` 是部署时权威文档，由 canonical 构建器在 vite build 前物化。dev 服务器不得被残留的部署时文档污染（H5 侧已加 serve-only 中间件影子化 `/runtime-env.json`，并有测试禁止源码树携带该文件）。

## 8. 与 sdkwork-specs / AGENTS.md 的一致性核对结论

已发现并**已解决**的冲突/漂移（本轮治理）：

1. `sdkwork-app` 在 dev 网关绑定**之前**解析执行计划 → dev:cloud 的 API 目标曾是远程域 `router-dev...:3905`。已改为绑定后解析（PNPM_SCRIPT_SPEC §3 / §4.2）。
2. dev 网关绑定未覆盖应用面 URL 键 → 已扩展 `applyDevelopmentLocalGatewayBinding`（cloud.development 下应用面 + 平台面都重写到本地网关锚点；drive/agents 等联邦兄弟保持远程）。
3. plan-v5 的"cloud.development 表面必须远程 URL"检查拒绝本地锚点 → 已加受控豁免（仅等于 `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` 的 loopback）。
4. 同源对齐函数的 early-return 绕过禁键清除 → standalone.development 材料化 env 缺 canonical base 键时 loopback 绝对值泄漏进浏览器文档。已将清除提前到任何返回路径之前。
5. PC dev 文档 env 优先级与 materializer 设计假设相反（文件覆盖进程 env）→ 已反转为进程优先（仅 dev 路径）。
6. cloud.development / cloud.test 拓扑 profile 缺 `accessEndpoints`（standalone 有）→ 已补齐，两模式 primary access endpoint 一致（4734）。
7. cloud.development / cloud.test 交付的 `apiSurfaceId` 曾是 application.public-ingress（远程应用边缘）→ 已切到 platform.api-gateway（本地网关锚点）。
8. 文档层：README / topology-standard / AGENTS.md 中的 3901、4736/4737 表述与 `:debug` 旧入口 → 已全部对齐；`dev:browser:postgres:standalone:debug` 退役；`topology:plan:server` 迁移到 `sdkwork-app topology:plan`。

9. sdk-common 派生启发式 3910 缺陷：`readRuntimeEnv` 增加 `SDKWORK_RUNTIME_ENV` 全局桥通道、`resolveBaseUrl` 相对候选同源直通；PC/H5 发布全局桥。规范沉淀为 `BROWSER_RUNTIME_ENV_SPEC.md` + `tools/browser-runtime-env.mjs` + `check-browser-runtime-env-standard.mjs`。

10. base-URL 矩阵去重（本轮治理，已落地）：工具侧四象限矩阵此前散落在 materializer、build runner 与各应用 vite 配置中，已收敛为 `sdkwork-specs/tools/app-base-url.mjs` 的统一 `resolveBaseUrl`（`APP_RUNTIME_ENV_SPEC.md` 总纲；多域名拆分与页面主机自动适配内聚于同模块）；PC/H5 的 runtime-env 中间件/构建产物/脚本注入接线收敛为共享工厂 `tools/browser-runtime-env-vite.mjs`；本仓库 `scripts/lib/cloud-router-browser-env-contract.mjs` 仅保留应用键词汇并以 `resolveCloudRouterBaseUrl` 委派标准实现。矩阵回归（10 档案 × dev/build × 文档/传输，拓扑驱动）落在契约库单测中。框架自身物化器（`tools/materialize-client-env.mjs`）的 cloud 族推导与物化值亦已改经 `resolveBaseUrl` + `baseUrlsMaterializationValue` 委派（`--check` 对本仓库 30 个物化文件字节级验证通过），`app-base-url.test.mjs` 的收敛门禁锁定 dev 文档构造器与族推导同源同矩阵。

11. 工作区采纳状态（`check-browser-runtime-env-standard.mjs` 全工作区扫描结论，2026-09-20）：
    - **完全对齐（检查器 0 失败）**：`sdkwork-cloudrouter`、`sdkwork-messaging`（本轮对齐：PC 接入共享 Vite 工厂 dev 文档中间件修复"新检出环境 dev 404/残留毒化"缺陷；解析器按总纲 §2 接受 cloud+development 同源 dev 形制；bootstrap 发布 §4 `SDKWORK_RUNTIME_ENV` 全局桥；新增 runtime-config 矩阵测试 6 项）。
    - **已收敛（机械重复清零）**：`sdkwork-documents`（documents-pc 内联 runtime-env 接线已切换共享工厂；其 checkout 未安装依赖，`@sdkwork/sdk-common` 不可解析为环境噪音，`pnpm install` 后复跑即清）。
    - **合规替代路径（非重复实现）**：`sdkwork-im` 等 materializer dotenv 面应用 —— base URL 经 `etc/client-env.materialization.json` 按档案物化，运行时经 `@sdkwork/sdk-common` `resolveBaseUrlWithAlignProtocol`（ENVIRONMENT_SPEC §6.3）解析，standalone 相对候选同源直通；检查器已将该形制识别为合规（transport-style adoption 注记）。im 的 dev 运行时文档形制为可选后续收敛项（其工具链未安装，本环境无法验证改动，未动代码）。
    - **落地路线图（真实缺口，非环境噪音）**：约 50 个模块仓库存在两类真实缺口 —— ① `apps/*/public/runtime-env.json` 构建残留滞留源码树且 vite 配置无 dev shadow 中间件（spec §2-3 的毒化场景；各仓库 `pnpm install` 后由拥有者用共享工厂补中间件即清）；② 部分仓库既无规范工具消费亦无 materialization 声明（`sdkwork-agents` 的 .gitignore 未覆盖 `public/runtime-env.json` 属额外卫生项）。该批次属跨仓库推广工程，须逐仓安装依赖后验证落地，不适用盲改。**逐模块全量明细**（67 仓 × 消费形态/物化面/残留/裁决）：[docs/audit/APP-RUNTIME-ENV-MODULE-AUDIT-2026-09-20.md](audit/APP-RUNTIME-ENV-MODULE-AUDIT-2026-09-20.md)。**跟踪门禁**：`node ../sdkwork-specs/tools/check-app-runtime-env-workspace.mjs --workspace ..`（strict，出现 code-gap 退出 1）或 `--report`（推广期跟踪，恒 0）；分类逻辑有夹具单测（`tools/check-app-runtime-env-workspace.test.mjs`，已并入 `test:app-runtime-env` 门禁，当前 40 项）；当前基线：56 个浏览器面仓库 = 2 ok / 2 环境阻塞 / 52 缺口。运行时侧 `@sdkwork/sdk-common` `resolveBaseUrl` 自带回归 40 项全绿。
    - **检查器环境噪音**：约 50 个仓库的 `@sdkwork/sdk-common is not resolvable` 失败源于 checkout 未安装依赖（`node_modules` 缺失），非代码违约；在已安装依赖的仓库上检查器全绿。

**记录性差异（非缺陷）**：PC `.env.cloud.development` 等共享 dotenv 保留部署域值——这是 materializer 的设计（与 vite build 共享），dev 由进程 env 优先 + 强制覆写兜住；联邦兄弟边缘（drive 等）在 cloud dev 保留远程 origin 是 PNPM_SCRIPT_SPEC §3 明文允许的（非网关宿主不改写）；test/staging standalone 预演档案的 loopback 值仅限本机预演（§2.4/§2.5）。

## 9. 技术债务台账

已清理：`internalUpstreams` 死词汇、10 个 topology env 的 `INTERNAL_PORTAL_RENDERER_BIND=3901` 残留（列入 retired.envKeys 防回归）、重复 `SDKWORK_DATABASE_SEED_LOCALE` 行、嵌套残留目录 `apps/sdkwork-cloudrouter-pc/sdkwork-cloudrouter-h5/`、H5 `public/runtime-env.json` 构建残留毒化 dev（+ serve-only 中间件防复发）、两处与现行架构相矛盾的存量失败测试、PC vite 3901/3900 死默认值。

遗留（按优先级）：

1. `check:application-env` 的 k8s 对齐 ENOENT：检查器期望已合并掉的拆分清单（`cloud-router-admin-api.yaml` 等），且键族与 DEPLOYMENT_SPEC §5.2 迁移后的清单不一致——属生产部署配置治理，需人工决策后修（`docs/audit/GENERATION-CONTENT-ROUTING-AUDIT-2026-09-16.md` 已记录）。
2. 可选：materializer 对 `cloud.development` 直接产出同源相对值（当前依赖 dev 进程覆写兜底）。

## 10. 回归自检清单

| 门 | 命令 | 覆盖 |
|---|---|---|
| 模式矩阵（双模式 × 双表面，拓扑驱动） | `pnpm test:topology` | 计划解析 + 同源文档断言 + 渲染器/入口端口 |
| base-URL 生命周期矩阵（10 档案 × dev/build × 文档/传输 + 多域名自动适配） | `node --test scripts/lib/cloud-router-browser-env-contract.test.mjs` | `resolveCloudRouterBaseUrl` 对 `etc/topology/*.env` 全档案的矩阵裁决 |
| 矩阵标准实现单测（sdkwork-specs） | `node --test ../sdkwork-specs/tools/app-base-url.test.mjs ../sdkwork-specs/tools/browser-runtime-env-vite.test.mjs` | 四象限裁决 + 失败闭合 + 共享 Vite 工厂 |
| 拓扑有效性 | `pnpm topology:validate` | `specs/topology.spec.json` |
| 构建面域名绑定 | `pnpm test:web-domain-routing-standard` | router-*/api-* 域族（含各环境后缀矩阵） |
| 脚本规范 | `pnpm check:pnpm-script-standard` | 根/package 脚本 |
| 契约库单测 | `node --test scripts/lib/cloud-router-browser-env-contract.test.mjs` | 同源文档构造/断言/对齐 |
| 双模式 dry-run 取证 | `pnpm exec sdkwork-app dev --deployment-profile standalone\|cloud --dry-run` | browserVisibleOrigin / apiTargetOrigin |
