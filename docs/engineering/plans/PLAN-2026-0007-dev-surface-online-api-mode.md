# 本机 dev 表面连接线上 API 的启动模式设计（评审稿）

> 状态：**设计评审中（2026-11-24）**。本轮只落文档，**不修改任何代码、脚本、拓扑档案或测试**；评审通过后按 §6 执行文档补丁，方案 B 的代码改动另行排期。
> 范围：仓库根启动脚本、`specs/topology.spec.json`、`etc/topology/*.env`、`docs/browser-access-contract.md`、回归门禁；方案 B 另需跨仓修订 `../sdkwork-specs/PNPM_SCRIPT_SPEC.md`。
> 需求原文：新增一个 pnpm 启动 dev 环境、连接线上 api 域名服务器进行测试的启动模式。
> 决策（已与需求方确认）：目标线上环境 = **生产 `api.sdkwork.com`**，采用 **方案 A：复用已有 `pnpm prod`，不新增 pnpm 命令**；`test`/`staging` 联调需求记为方案 B 备选，本轮不实施。

---

## 0. 结论摘要

| 问题 | 结论 | 关键证据 |
| --- | --- | --- |
| 是否需要新增一个 pnpm 命令 | **不需要**。`pnpm prod` 已经是"本机热更新 dev 表面 + 线上生产 API 域名"的受治理入口 | [package.json:180](../../../package.json)；[PNPM_SCRIPT_SPEC §3.1](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md) |
| 浏览器会不会直连 `api.sdkwork.com` 从而触发 CORS | **不会**。浏览器文档恒为同源相对 base，线上域名只在 4734 入口做**服务端扇出** | [browser-access-contract.md §2.7.1](../../browser-access-contract.md) |
| 真正的缺口是什么 | **可发现性**：`pnpm prod` 在 README / topology-standard / AGENTS.md 三处命令清单里都缺席，团队不知道它的存在 | 见 §3.4 |
| 新增 `dev:test` / `prod:test` 可行吗 | **不可行**。规范明文禁止环境后缀形式的 dev 入口，且 `prod` 名字固定不带轴 | [PNPM_SCRIPT_SPEC:263-270](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md) |
| 本轮要动什么 | 仅文档：4 处补丁 P1–P4（§6），零代码改动 | — |

---

## 1. 现状核实（已核实事实）

### 1.1 仓库已有 4 条 dev 链路

| 命令 | 拓扑档案 | 本地进程 | 端口归属 | 服务端 API 出口 |
| --- | --- | --- | --- | --- |
| `pnpm dev`（=`dev:standalone`） | `standalone.development` | standalone 网关 + PC/H5 渲染器 + 自适应入口 | 3905 / 18080 / 18081 / 4734 / 4736 / 4737 | 本机 `127.0.0.1:3905` |
| `pnpm dev:cloud` | `cloud.development` | 仅自适应入口 + 两个私有渲染器 | 4734 / 4736 / 4737（**刻意不声明**应用面 bind，避免停服时误杀兄弟仓 3900） | 本机 `sdkwork-api-cloud-gateway` `127.0.0.1:3900`，不可达即 fail-closed |
| **`pnpm prod`** | **`cloud.production`** | 仅自适应入口 + 两个私有渲染器 | 4734 / 4736 / 4737，**且档案仍声明** 3900 / 18080 / 18081（退出时按端口回收，见 §1.2） | **`https://api.sdkwork.com`（远程）** |
| `pnpm dev:desktop` | `standalone.development` | 桌面宿主 + 渲染器 | 同 `pnpm dev` + 宿主端口 | 本机 3905 |

`cloud.production` 的编排证据：`processes` 只有 `portal-renderer`（role=`client`）、`browserDeliveries` 只有一条 `dev-server-proxy` 且 `apiSurfaceId=platform.api-gateway`，渲染器 Vite mode 为 `cloud.production`（[topology.spec.json:562-670](../../../specs/topology.spec.json)）；该面 URL 是 `https://api.sdkwork.com`（[cloud.production.env:49](../../../etc/topology/cloud.production.env)），页面域为 `https://router.sdkwork.com`（同文件 L24）。

### 1.2 `pnpm prod` 的启动链（读代码核实）

```
pnpm prod
 └─ ensure-cloud-router-node-deps.mjs                     # 依赖预检（check:dev-bootstrap 要求）
 └─ sdkwork-app dev --deployment-profile cloud --environment production
     ├─ 解析 cloud.production 档案 → plan.localProcesses 只有 client
     ├─ 远程健康检查（/healthz，逐面阻塞）：
     │    https://router.sdkwork.com/healthz   （application.public-ingress，最多 600s）
     │    https://api.sdkwork.com/healthz      （platform.api-gateway，默认 90s）
     ├─ 不启动任何本地网关 / 数据库 / worker / 迁移
     ├─ spawn PC Vite(4736) + H5 Vite(4737)，按设备分流
     └─ 启动 4734 自适应入口：规范 API 路径 → 服务端转发到 api.sdkwork.com
```

核实点：

- 健康检查来自 `profile.healthSurfaces`，路径默认 `/healthz`，不可达直接抛错，不回退 loopback（[sdkwork-app.mjs:231-251](../../../../sdkwork-app-topology/scripts/sdkwork-app.mjs)、[plan-v5.mjs:351](../../../../sdkwork-app-topology/tools/topology/lib/plan-v5.mjs)）。
- `applyDevelopmentLocalGatewayBinding` 只在 `cloud` + `development` 生效（[dev-gateway-binding.mjs:60](../../../../sdkwork-app-topology/tools/topology/lib/dev-gateway-binding.mjs)），所以生产档案的域名值**原样保留**，不会被改写成 loopback。
- `pnpm stop` 只按 `environment === 'development'` 的档案回收，**不覆盖 `prod` 会话**（[sdkwork-app.mjs:886-907](../../../../sdkwork-app-topology/scripts/sdkwork-app.mjs)）。
- 但 `prod` 自身退出（Ctrl+C / 进程结束）会走 `stopOwnedBindings(plan.ownedBindings)`：在 Windows 上按档案 `bindEnv` 声明**强制回收**这些端口上的监听进程（先 SIGTERM 再 `taskkill /F`，见 [development-ownership.mjs:105-149](../../../../sdkwork-app-topology/tools/topology/lib/development-ownership.mjs)；非 win32 直接返回空集）。`cloud.production.env` 声明了 3900 / 18080 / 18081，因此**运行 `prod` 期间不得在本机这几个端口上并行跑兄弟仓边缘**，否则退出时会被一并回收——这正是 [browser-access-contract.md:111](../../browser-access-contract.md) 已记录的纪律。
- 浏览器凭据：renderer 使用随档案提交的公共应用令牌（`kid=public-app-token`、`exp=0` 表示不过期，[.env.cloud.production:3](../../../apps/sdkwork-cloudrouter-pc/.env.cloud.production)）；生命周期级私有引导令牌由 `@sdkwork/iam-credential-entry` 解析，缺失时 fail-closed 而非静默降级（[该包 README](../../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/README.md)）。

### 1.3 为什么"同源"是关键（不是实现细节，是约束）

浏览器文档里 4 个规范 base 恒为相对路径（`/v1`、`/app/v3/api`、`/backend/v3/api`、`/feeds/v3/api`），由契约库强制覆写并断言（[cloud-router-browser-env-contract.mjs:834](../../../scripts/lib/cloud-router-browser-env-contract.mjs)、同文件 L878 的 `assertBrowserDevRuntimeEnvDocument`）。因此：

- 请求 URL 的 origin 永远等于页面 origin（`127.0.0.1:4734`），**生产 CORS 允许列表不参与**，不会出现 `net::ERR_FAILED` 预检失败；
- 线上域名仅存在于进程 env / 服务端代理目标，**永不进入浏览器文档**（`VITE_SDKWORK_*_HTTP_URL` 这类进程面投影键被 `CLOUD_ROUTER_BROWSER_FORBIDDEN_RUNTIME_VITE_KEYS` 显式禁止进入 Vite runtime bag）。

这正是不新增命令也能"连线上"的机理。

---

## 2. 需求判定矩阵

| 目标线上 API | 现成入口 | 判定 | 本轮动作 |
| --- | --- | --- | --- |
| `api.sdkwork.com`（生产） | `pnpm prod` | ✅ 已具备 | 文档补齐 + 使用手册（§3、§6） |
| `api-test.sdkwork.com` | 只有裸命令 `pnpm exec sdkwork-app dev --deployment-profile cloud --environment test`，且档案有 2 处缺陷 | ⚠️ 需方案 B | 登记备选（§4），不实施 |
| `api-staging` / `api-demo` | 无 | ❌ `cloud.staging` / `cloud.demo` 的 `processes` 为空数组，dev 起不来（`development plan has no local processes`） | 登记备选（§4.5） |
| 已部署的 `router-dev.sdkwork.com:3905` | 无，且被禁止 | ❌ 规范要求 `dev:cloud` 必须绑本地 3900，不得把 `api-dev.*` 部署域塞进 dev 表面 | 不提供 |

补充事实：`cloud.test` 档案**已经预置**了自适应 dev 交付（`portal-renderer` + 双渲染器，Vite mode=`cloud.test`，[topology.spec.json:671-779](../../../specs/topology.spec.json)），所以方案 B 的基础设施门槛比预期低，缺口主要在治理命名与档案卫生。

---

## 3. 方案 A（采纳）：`pnpm prod` 作为唯一"连线上"入口

### 3.1 使用手册

```bash
# 1) 取证（不启动进程）：确认浏览器 origin 与扇出目标
pnpm exec sdkwork-app dev --deployment-profile cloud --environment production --dry-run

# 2) 启动
pnpm prod

# 3) 浏览器访问唯一入口（PC / H5 同端口，按设备分流）
#    http://127.0.0.1:4734
```

前置条件：

1. 依赖已安装（`pnpm install --no-frozen-lockfile`），`ensure-cloud-router-node-deps.mjs` 会先校验；
2. 4734 / 4736 / 4737 空闲（与 `pnpm dev`、`pnpm dev:cloud` 互斥，不可并行）；
3. 能访问 `https://router.sdkwork.com/healthz` 与 `https://api.sdkwork.com/healthz`（公司网/VPN 需放行）；
4. 如有 IAM 侧 bootstrap 需求，按私有秘密来源提供令牌；浏览器首屏不依赖它。

预期输出：控制台唯一无前缀访问地址为 `http://127.0.0.1:4734`，渲染器输出带 `[renderer pc-web]` / `[renderer h5]` 前缀（4736/4737 是私有端口，不是入口）。

退出：`Ctrl+C`。两点注意：①**`pnpm stop` 不回收 `prod` 端口**（其扫描范围仅 development 档案）；②`prod` 自身在 Windows 退出时会按档案 `bindEnv` 回收 4734/4736/4737 **以及 3900/18080/18081**，所以运行期间不要在本机起兄弟仓 `sdkwork-api-cloud-gateway`，否则会被一并回收（§1.2）。

### 3.2 为什么不产生 CORS 问题

```
浏览器 ──同源──> http://127.0.0.1:4734/app/v3/api/...
                       │（服务端 fan-out，不经过浏览器）
                       └──> https://api.sdkwork.com/app/v3/api/...
```

生产 CORS 只枚举生产页面域 + 桌面/小程序 scheme（[cloud.production.env:21](../../../etc/topology/cloud.production.env)），**不含 4734**，也不需要包含——因为浏览器从不跨域。任何试图"把 4734 加进生产 CORS"或"把 VITE base 改成 api.sdkwork.com"的做法都是在破坏这个不变量。

### 3.3 与规范条款的对照（逐条满足）

| 规范条款（`PNPM_SCRIPT_SPEC.md`） | 本方案满足方式 |
| --- | --- |
| §3.1：`prod` 必须解析到 `cloud` + `production` | 脚本固定 `--deployment-profile cloud --environment production`（[package.json:180](../../../package.json)） |
| §3.1：只起 client，不起网关/DB/worker | `cloud.production.processes` 无服务端角色 |
| §3.1：浏览器文档保持同源相对 `/` | 契约库强制覆写 + `assertBrowserDevRuntimeEnvDocument` 断言 |
| §3.1：档案部署值域名-only，仅本地 dev bind 可带 ip+port | 所有 `*_URL` 保持纯域名；相对部署基线仅新增 4734/4736/4737 三个本机 dev bind，回归逐行断言 `*_URL` 不含 loopback（[verify-cloud-router-topology.test.mjs:170-202](../../../scripts/verify-cloud-router-topology.test.mjs)） |
| §3.1：fail-closed，不回退本机栈 | 远程健康检查失败即抛错（§1.2） |
| §3.1：必须在浏览器访问契约中登记 | 已登记于 [browser-access-contract.md §2.7.1](../../browser-access-contract.md) |
| §3.1：不得视为发布/部署证据 | 本文与契约均不把它当证据；`release:*` / `deploy:*` / `bin/` 不变 |
| §3：dev 命令仅存在于 development | 不新增任何 `dev:*` 命令 |

### 3.4 可发现性缺口（本轮唯一真实问题）

| 文档 | 现状 | 位置 |
| --- | --- | --- |
| `README.md` 命令清单 | 列出 `pnpm dev` / `dev:desktop` / `dev:server` / `smoke:dev`，**无 `pnpm prod`** | [README.md:247-269](../../../README.md) |
| `README.md` "Command intent" | 解释了 dev / dev:cloud / dev:desktop，**无 `prod`** | [README.md:384-394](../../../README.md) |
| `docs/topology-standard.md` 脚本表 | cloud 行只列 `dev:cloud` / `dev:browser:cloud` | [topology-standard.md:38](../../topology-standard.md) |
| `AGENTS.md` Dev Web Access Contract | 描述了 dev / dev:cloud / dev:browser，**无 `prod`** | [AGENTS.md:155-213](../../../AGENTS.md) |
| `docs/browser-access-contract.md` §2.7.1 | 已完整记录（但位于第 102 行，日常不会翻到） | 已存在 |

结论：不是能力缺失，是索引缺失。P1–P4 把这四处补齐即可，无需任何代码改动。

---

## 4. 方案 B（备选，本轮不实施）：`test`/`staging` 联调入口

> 若后续要把"线上"扩展到 `api-test.sdkwork.com` 或 `api-staging`，必须先过跨仓规范关，再改档案与脚本。本节记录已核实的约束与改动清单，供评审与排期。

### 4.1 规范硬约束

- [PNPM_SCRIPT_SPEC:263-270](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md)：更高环境只能走 §4.2 构建族；"瞄准已部署更高环境的本地开发表面使用 `prod` 入口，**绝不用环境后缀 `dev:` 名**"。
- [PNPM_SCRIPT_SPEC:226-229](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md)：`prod` **名字固定、不带任何轴**，明确禁止 `prod:staging` 一类。
- [PNPM_SCRIPT_SPEC:234-240](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md)：`dev:cloud` 必须绑本地平台网关，**不得**把 `api-dev.*` 硬编码进 dev 表面。
- 门禁会硬校验：`prod` 必须解析到 `cloud.production` 且不得选数据库（[check-pnpm-script-standard.mjs:911-925](../../../../sdkwork-specs/tools/check-pnpm-script-standard.mjs)）。

### 4.2 命名裁决

| 候选 | 裁决 | 依据 |
| --- | --- | --- |
| `dev:test` / `dev:staging` | ❌ | §3 第 263–270 行明文禁止环境后缀 dev 入口 |
| `dev:prod` | ❌ | §3.1 第 226–229 行举例明确禁止 |
| `prod:test` / `prod:staging` | ❌ | 同上，`prod` 不带轴 |
| `preview:test` | ✅ 待授权 | `preview` 已在允许首段列表；但需 §3 新增子条款授权"指向已部署非生产 cloud 环境的预览入口"，并同步 checker |

### 4.3 若授权，仓库侧改动清单

| # | 文件 | 改什么 | 原因 |
| --- | --- | --- | --- |
| 1 | `../sdkwork-specs/PNPM_SCRIPT_SPEC.md` + `tools/check-pnpm-script-standard.mjs` | 新增 `preview:<test\|staging>` 子条款与校验（与 §3.1 同构约束） | 无授权则脚本必被门禁拒 |
| 2 | [package.json:180](../../../package.json) | 新增 `preview:test`，必须以 `ensure-cloud-router-node-deps.mjs &&` 开头 | `check:dev-bootstrap` 要求 facade 入口先做依赖预检 |
| 3 | [topology.spec.json:801-845](../../../specs/topology.spec.json) | `scripts.pnpm` 注册 `preview:test`（cloud / test / browser，无 database） | 拓扑即命令权威，回归会断言 |
| 4 | `etc/topology/overrides/cloud.test.env`（源层，再跑 `materialize-topology-env`） | 补 `SDKWORK_DEPLOY_APPLICATION_ID*` | 当前 [.env.cloud.test](../../../apps/sdkwork-cloudrouter-pc/.env.cloud.test) 缺 `VITE_SDKWORK_DEPLOY_APPLICATION_ID`，而生产档案有；渲染器身份解析需要它 |
| 5 | 同上 | 处理 3900/18080/18081 的 `*_BIND` 归属 | 见 §4.4（最大风险） |
| 6 | — | `pnpm workflow:materialize-client-env` 重新物化 | 档案键变化 |
| 7 | [browser-access-contract.md:73-79](../../browser-access-contract.md) + AGENTS.md | 新增 §2.4.1 小节，更新 §2.1 规则 3 的例外清单 | §3.1"必须记录该命令" |
| 8 | [browser-dev-access-contract.test.mjs:238](../../../scripts/dev/browser-dev-access-contract.test.mjs) | 仿 `[cloud.production]` 用例新增 `[cloud.test]` | 锁定同源文档 + 远程扇出 + 只起 client |

### 4.4 端口归属缺陷（R1，必须先解决）

`resolveOwnedBindings` 把**档案里任何声明了 `bindEnv` 的面**当成本仓拥有的监听端口，退出时按端口回收（[development-ownership.mjs:34-65](../../../../sdkwork-app-topology/tools/topology/lib/development-ownership.mjs)）。而 [cloud.test.env:39](../../../etc/topology/cloud.test.env) 声明了 `0.0.0.0:3900`，另有 18080/18081 —— 跑一次 `preview:test` 退出就会**杀掉兄弟仓 `sdkwork-api-cloud-gateway` 的本地网关**。这正是 `cloud.development` 已经踩过并在 [browser-access-contract.md:148-152](../../browser-access-contract.md) 记录过的同一个坑。

两种处理：

- **B-a（与 `prod` 对齐，最小改动）**：档案保持不动（容器部署仍需这些 bind），照 §2.7.1 的既定做法新增硬约束"运行期间不得在本机 3900/18080/18081 起兄弟仓边缘"，并在启动前加占用探测，命中即 fail-closed 并指名进程。
- **B-b（正确修法，建议单独立项）**：在 `@sdkwork/app-topology` 把 dev 表面的回收范围收窄为"本次会话派生的 listener"，不再无条件按档案 `bindEnv` 端口回收，彻底消除跨仓误杀。

> 注：`prod` 目前同样声称 3900/18080/18081 的回收权（§2.7.1 第 111 行已把"不要并行起兄弟仓边缘"写成使用者纪律）。B-b 若落地，`prod` 一并受益。

### 4.5 其他已知缺口

- `cloud.staging` / `cloud.demo` 编排 `processes` 为空 → 需要先补自适应客户端交付，才谈得上联调入口。
- `test` 生命周期的令牌策略与 `development` 不同：只在显式开启 `allowTestTokenGeneration` 时才允许生成，staging/production 一律 fail-closed（[credential-entry README](../../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/README.md)）。联调前必须先解决凭据来源。

---

## 5. 明确禁止的做法

| 做法 | 为什么禁止 | 会在哪里失败 |
| --- | --- | --- |
| 把 `VITE_CLOUDROUTER_*_API_BASE_URL` 改成 `https://api.sdkwork.com` | 浏览器跨域直连；生产 CORS 只含页面域 | 每次调用 `net::ERR_FAILED`；且 `assertBrowserDevRuntimeEnvDocument` 断言失败 |
| 把 `127.0.0.1:4734` 加进生产/测试 `SDKWORK_CORS_ALLOWED_ORIGINS` | §3.1 明文禁止；会把开发工作站 origin 固化进部署档案 | 回归断言失败（CORS 逐环境校验） |
| 新增 `dev:test` / `prod:test` | 违反 §3 与 §3.1 | `pnpm check:pnpm-script-standard` 直接拒 |
| 本地起 3900 冒充线上 | 那就是 `dev:cloud`，不是"连线上" | 语义错位，且 `dev:cloud` 已有该能力 |
| 用 `pnpm prod` 作为发布/部署证据 | §3.1 明确它不构成发布证据 | 发布门禁不认，`release:preflight` 另有权威 |

---

## 6. 本轮落地清单（0 代码改动，评审通过后执行）

| 编号 | 动作 | 文件 | 验收 |
| --- | --- | --- | --- |
| P1 | 在命令清单加入 `pnpm prod` 并加一行说明（连线上生产 API 时使用） | [README.md:247-269](../../../README.md) | 清单中出现 `pnpm prod` |
| P2 | 在 "Command intent" 增加 `pnpm prod` 条目，指向浏览器访问契约 §2.7.1 | [README.md:384-394](../../../README.md) | 条目存在且链接有效 |
| P3 | 脚本表 cloud 行补 `prod` 一行（标注"已部署生产、仅 client"） | [topology-standard.md:38](../../topology-standard.md) | 表格含 prod |
| P4 | Dev Web Access Contract 段末补一句：连线上生产 API 用 `pnpm prod`，浏览器仍走 4734 同源入口 | [AGENTS.md:155-213](../../../AGENTS.md) | 段落含 prod 与 4734 说明 |

> 方案 B 的代码改动（§4.3 第 1–8 项）需先取得 `sdkwork-specs` 修订授权，**本轮不做**。

---

## 7. 验收判据

1. 团队新成员按 README 能在 5 分钟内找到"连线上生产 API 的启动方式"，且知道入口是 4734、出口是 `api.sdkwork.com`。
2. `pnpm exec sdkwork-app dev --deployment-profile cloud --environment production --dry-run` 输出的 `browserVisibleOrigin` 为 4734、`apiTargetOrigin` 为 `https://api.sdkwork.com`（人工取证，记录在评审结论中）。
3. 运行 `pnpm prod` 后浏览器首屏与一次登录流程可用，且 DevTools Network 中所有 API 请求 origin 均为 `http://127.0.0.1:4734`（**无** `api.sdkwork.com` 直连请求）。
4. 生产 CORS 允许列表、`cloud.production.env` 的域名值、`etc/topology/*.env` 任何一个字节都未修改（`git diff` 为空）。
5. 下列门禁全绿。

---

## 8. 验证门禁

| 门 | 命令 | 覆盖 |
| --- | --- | --- |
| 拓扑有效性 | `pnpm topology:validate` | `specs/topology.spec.json` 结构 |
| 模式矩阵（双模式 × 双表面） | `pnpm test:topology` | 计划解析、同源文档断言、端口归属 |
| prod 接线 | （包含在 `pnpm test:topology` 的 `verify-cloud-router-topology.test.mjs`） | `cloud.production` 编排 + `prod` 脚本接线 + 域名-only 断言 |
| 脚本规范 | `pnpm check:pnpm-script-standard` | 本次不改脚本，作为回归基线 |
| 环境契约 | `pnpm check:application-env` | 档案与物化一致性 |
| 文档守门 | `python -B tools/architecture_standard_guardian.py` | 架构标准守门（本轮已执行，通过） |
| 文档索引 | 人工核对 `docs/INDEX.yaml`（本仓库无该文件的自动校验器） | `PLAN-*` 注册 |
| 取证 | `pnpm exec sdkwork-app dev --deployment-profile cloud --environment production --dry-run` | 浏览器 origin / 扇出目标 |

---

## 9. 风险登记

| ID | 风险 | 影响 | 缓解 |
| --- | --- | --- | --- |
| R1 | 团队把 `pnpm prod` 当成"生产发版" | 误操作心理负担 / 变更管理混乱 | P1–P4 文档明确"开发表面、非部署、非发布证据" |
| R2 | 生产健康面（`/healthz`）在公司网不可达 | 启动直接失败，误判为"命令坏了" | 文档写明前置网络条件与失败信息形态 |
| R3 | 与 `pnpm dev` / `pnpm dev:cloud` 并行导致端口冲突 | 启动失败 | 文档写明 4734/4736/4737 互斥 |
| R4 | 误以为 `pnpm stop` 能停 prod | 端口残留 | 文档写明 Ctrl+C 退出、`stop` 只覆盖 development |
| R5 | 有人"顺手"把 4734 加进生产 CORS 以修跨域 | 污染生产档案 | §5 禁止清单 + 现有 CORS 回归断言 |
| R6 | 浏览器首屏失败被误判为跨域 | 排查方向错误 | 文档给出判定法：看请求 origin 是否 4734 |
| R7 | `prod` 运行期间本机起了兄弟仓 `sdkwork-api-cloud-gateway`（3900），退出时它被按端口回收 | 兄弟仓开发环境被静默杀掉 | 文档写明该行为（§1.2/§3.1）；长期修法见 §4.4 的 B-b |

---

## 10. 本轮取证记录（2026-11-24）

| 项 | 命令 / 方式 | 结果 |
| --- | --- | --- |
| 变更面 | `git status --short` | 仅本文件 + `docs/engineering/plans/README.md` + `docs/INDEX.yaml`；工作区另有会话前既存的 `docs/domains/README.md`、`docs/domains/domains/certificate-renewal-and-expiry-design.md`、`external/new-api`、`external/sub2api` 改动，**与本方案无关，未触碰** |
| 相对链接 | 解析全部 `](\.\./...)` 目标 | 全部存在（ALL LINKS OK） |
| 文档索引 | `python -c "yaml.safe_load(docs/INDEX.yaml)"` | 解析通过，`PLAN-2026-0007` 已注册 |
| 架构守门 | `python -B tools/architecture_standard_guardian.py` | **通过**（Architecture standard guardian passed） |
| 文档布局门 | `node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .` | 失败，但 5 条全部为**既有** `docs/architecture/tech/` 问题（`IAM-org-department-role-position-model.md`、`RUNBOOK-iam-personnel-release.md` 文件名不合 shard 模式；`TECH_ARCHITECTURE.md` 缺 3 个 shard 链接），**无一条涉及本文件** |
| 代码/档案 | — | 未运行 `--dry-run`、未启动 `pnpm prod`、未改任何脚本/档案/测试（评审后在有网环境按 §7 取证） |

---

## 附录 A：取证命令与预期

```bash
# A1 不启动进程，打印运行时计划
pnpm exec sdkwork-app dev --deployment-profile cloud --environment production --dry-run

# A2 确认 prod 脚本接线（防被人改动）
node -e "const p=require('./package.json');console.log(p.scripts.prod)"

# A3 确认浏览器文档恒为同源（构建期断言）
node --test scripts/lib/cloud-router-browser-env-contract.test.mjs
```

## 附录 B：引用索引

- 规范：[PNPM_SCRIPT_SPEC.md §3 / §3.1](../../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md)、[APP_RUNTIME_ENV_SPEC.md](../../../../sdkwork-specs/APP_RUNTIME_ENV_SPEC.md)、[BROWSER_RUNTIME_ENV_SPEC.md](../../../../sdkwork-specs/BROWSER_RUNTIME_ENV_SPEC.md)
- 仓库：[browser-access-contract.md](../../browser-access-contract.md)、[specs/topology.spec.json](../../../specs/topology.spec.json)、[etc/topology/cloud.production.env](../../../etc/topology/cloud.production.env)
- 框架：[sdkwork-app.mjs](../../../../sdkwork-app-topology/scripts/sdkwork-app.mjs)、[dev-gateway-binding.mjs](../../../../sdkwork-app-topology/tools/topology/lib/dev-gateway-binding.mjs)、[development-ownership.mjs](../../../../sdkwork-app-topology/tools/topology/lib/development-ownership.mjs)
- 门禁：[browser-dev-access-contract.test.mjs](../../../scripts/dev/browser-dev-access-contract.test.mjs)、[verify-cloud-router-topology.test.mjs](../../../scripts/verify-cloud-router-topology.test.mjs)
