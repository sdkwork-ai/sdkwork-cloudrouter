# SDKWork SaaS App 工厂架构成熟度评审

- 评审日期：2026-11-20
- 评审对象：`sdkwork-specs` 应用工厂标准族（`APPLICATION_FACTORY_DEPLOYMENT_SPEC.md` 及其 9 个 owner 标准）+ 落地模块（`sdkwork-deployments`、`sdkwork-iam`、`sdkwork-webserver`、`sdkwork-appstore`、`sdkwork-drive`、`sdkwork-scaffold`、`sdkwork-catalog`、`sdkwork-app-topology`）与工具（`sdkwork-specs/tools/app-registration`、token materialization 工具链）
- 评审方式：规范逐条核对 + 各模块路由/服务/仓储/SQL 迁移/契约实测（10 个并行审计代理 + 主控抽检）
- 总体结论：**设计完成度约 8.5/10，落地完成度约 5.5/10，综合成熟度 6.2/10**
- 一句话：五概念身份模型与 remix/身份供给已是生产级；但"工厂"最核心的两件事——**端到端编排**和**退出/对账闭环**——基本没有，且缺少把规范变成门禁的机制，导致设计意图与实际行为正在漂移。

> **实施状态（2026-11-20 当日回填）**：第 0 波（P0）与第 1 波（P1）已全部落地并通过真实 PostgreSQL 与门禁验证，详见 §7「实施记录」。第 2 波的对账 worker 与第 3 波的架构收敛（`deploy_app_source_spec` 裁决、价格权威、`Blueprint` 取舍）仍在待办，§7 逐项列明。

---

## 1. 评分总览

| 维度 | 分数 | 判断 |
| --- | --- | --- |
| 规范体系完整性（五概念/权属/去重） | 8.5 | 结构罕见地严谨：19 处跨规范引用全部可解析，91/91 条规范句都带 Check 或 Violation；但无工厂级门禁 |
| 单模块契约与数据模型 | 8 | deploy_app / source / installation / carrier 的约束基本真实存在 |
| 跨模块生命周期 1–4（发布/供给/签发/运行） | 6.5 | 身份供给的"前向补偿"是标杆；但每一步仍靠人工串接 |
| 跨模块生命周期 5–6（升级/卸载） | 3.5 | 升级=新 release，可用；卸载没有命令，只有状态位 |
| 编排与操作面（工厂本身） | 4 | 只有 CRUD 原语 + 一个 template install 组合，无 14 步 runbook 的命令面/控制台 |
| 隔离与安全（release scope） | 6.5 | 服务层校验正确，数据库层可被绕过；deploy 侧 owner 可在供给后被改 |
| 失败补偿与对账 | 4.5 | 补偿方向正确（不删行、幂等键），但 §9 要求的对账 sweep 完全不存在 |
| 可观测性与运维 | 3.5 | 仅 tracing，无 metrics/alert/老化告警 |
| 自动化证据（门禁/测试） | 5.5 | token 与环境锚点门禁覆盖 ~68 仓库；生命周期/对账/卸载无端到端测试 |
| **综合** | **6.2** | **强单模块平台，尚未成为工厂** |

---

## 2. 做对了什么（先给结论，避免只看到问题）

1. **五概念权属矩阵是真的**，且 1:1 关系有库级约束：
   - `uk_iam_application_installation_deploy`（IAM 0043）、`uk_webserver_application_deploy_application_id`（webserver 0031）；
   - `deploy_app_source` 的 `uk_deploy_app_source_app` + `chk_deploy_app_source_kind` + `chk_deploy_app_source_pointer` + `chk_deploy_app_source_sub_path`（deploy 0011）；
   - `chk_deploy_app_status`、`chk_deploy_app_app_kind`、`chk_deploy_app_identity_status`（deploy baseline / 0008 / 0014）。
2. **remix/源码位是工作区里设计最好的片段之一**：一个源码位、kind/pointer 互斥 CHECK、就绪度**读时派生**（11 个闭合原因码）、未就绪时 409、禁用永远允许，且有真实 Postgres 测试覆盖。
3. **身份供给是"前向补偿"的教科书实现**：`identity_status` 持久化列、`deploy:{id}` 键用 `COALESCE` 声明且永不复刻、`Skipped` 不写状态、失败不回收 deploy_app、`apps.create` 与 `apps.identityProvision` 共用同一入口。
4. **token 锚点已工程化并在全仓推行**：`SDKWORK_DEPLOY_APPLICATION_ID` + 占位符 + `--surface` 按面物化；`check-release-access-token-env.mjs --require-anchor` 已接入约 68 个仓库；生成器（`tools/app-access-token.mjs`，实测第 669 行）已写入 `ownership_scope`，`check-app-access-token-env.mjs` 会校验 scope 与 USER 的 owner user id。
5. **命名与词汇在 appstore/deploy 侧确实落了地**：`appstore_app*` → `appstore_application*`、`app_template` 家族退役、`source_scaffold_version_id` 溯源、`SPA_WEB` 退出新注册。

---

## 3. 关键不足（按严重度）

### P0 — 会破坏正确性/隔离，或让危险操作变成"一条语句"

| # | 问题 | 证据 | 影响 |
| --- | --- | --- | --- |
| P0-1 | **IAM 子表外键是 `ON DELETE CASCADE`**，`DELETE FROM iam_application_installation` 一条语句即抹掉全部环境域与 OAuth 凭据行 | `sdkwork-iam/database/migrations/postgres/0039_application_installation_environment_and_credential.up.sql:33,61` | 规范 §3/§9 明令"卸载不得删除、必须保留历史"，而 schema 恰好为一键删除铺好了路；§9 的检查方法"卸载路径不含 DELETE"看不到级联 |
| P0-2 | **工厂级门禁为零**：91 条 MUST 中仅 5 条指向可执行工具，55 条只有"示意性违规"；`gates.manifest.json` 23 个 gate 无一覆盖工厂；工厂模块没有 CI 工作流 | `sdkwork-specs/gates.manifest.json`（全文核对）；`tools/` 下无 factory checker | 规范不能回归构建，只能靠人工审计发现问题——本次评审本身就是证据 |
| P0-3 | **§13 落地状态表已失真**：token 行仍称"生成器不写 ownership_scope，属目标加固"，而工具链早已写入并校验（2026-11-18 同一提交完成规范+实现，却漏改 §13） | `APPLICATION_FACTORY_DEPLOYMENT_SPEC.md:380` vs `tools/app-access-token.mjs:669`、`check-app-access-token-env.mjs:196-306` | 状态账本不可信，读者会按"不存在"去排期；与 §13 自身"不得把 gap 描述为已实现"的规则反向冲突 |

### P1 — 核心生命周期阶段缺失或不可靠

| # | 问题 | 证据 | 影响 |
| --- | --- | --- | --- |
| P1-1 | **没有"工厂"编排面**：14 步 runbook 全部靠手写 HTTP；控制台覆盖 create/上传/包/发布/部署/归档，但**完全没有** remix、environments、promotions、identityProvision 入口 | `sdkwork-deployments/crates/sdkwork-routes-deploy-app-api/src/paths.rs`（82 个原语路由）；`console-publishing/src` 全文 grep 命中 0 | 工厂无法被"运营"；P-1 的多平台 kind（如 FLUTTER_APP 7 个平台）甚至无法记录"这次发布的是哪个面" |
| P1-2 | **卸载阶段没有命令**：`app_status=ARCHIVED` 在仓储层存在但任何路由都不可达；只能通过通用 PATCH 直接改状态位；不会 disable IAM installation、不会禁用 installation environment、不会释放 carrier host | `repository-sqlx/src/apps.rs:992-1031`、`service/src/app.rs:1130-1154`；app-api 仅有 activate/pause | §3 第 6 阶段退出条件（先停止签发、再停流量、历史可读）**无法通过公开面达成或验证**；且归档后 installation 仍 `enabled`、仍可签发 |
| P1-3 | **供给后可改 owner，作用域静默漂移**：TENANT→USER 后 deploy 侧 owner 变了，installation 的 `ownership_scope` 不变，重试又因 `active` 短路不再问 IAM | `repository-sqlx/src/apps.rs:866-892,908-990`；`service/src/app_delivery.rs:306-311` | 数据隔离键与应用可见性分叉，无冲突、无对账、无告警 |
| P1-4 | **发布提升无围栏、无审批**：链式校验在 `if let Some(from_environment_id)` 里，客户端可省略字段直推生产；环境行未 `FOR UPDATE`、UPDATE 非版本条件；`approval_required` 是死数据 | `repository-sqlx/src/environments.rs:218-244,247-273` | "两次并发提升只留一个当前指针"靠运气；规范最重要的一道闸门失效 |
| P1-5 | **环境词汇两套模型**：`deploy_app_environment.env_key` 无 CHECK（被约束的 `env_level` 只覆盖 DEV/STAGING/PRODUCTION）；实际发布路径写的是无 CHECK 无 FK 的 `deploy_deployment.environment` 自由文本；另有两张表单独拒绝 `demo` | deploy baseline 2859/2876、611；`console-publishing/src/service/deploy-app-operations.ts:583,602,691`；baseline 1314,1402 | `qa`/`uat` 可被两个写入者接受；`demo` 反而进不了节点目标；未知 env 的域名会静默回落到生产前缀 |
| P1-6 | **没有对账、没有指标、没有老化告警**：§9 要求对四类软引用对账，代码里 `reconcil*` 只存在于计费 usage、webserver provider event、域名命名空间；deploy crate 内 `metrics!/counter!` 命中 0 | 全局 grep | 悬空引用（工厂最典型的故障模式）是"合法状态"；卡在 `failed` 的应用只有"已经怀疑它的人"才能发现 |

### P2 — 部分实现/靠人工/口径不一致

| # | 问题 | 证据 |
| --- | --- | --- |
| P2-1 | **交付面与身份规范互相矛盾**：交付侧存在 `deploy_app_source_spec`（一 app/环境可 N 个上传源码）+ `_route`，且是契约测试**必需**的操作组；工厂规范从头到尾没提它，并断言"一面一个 deploy app、一 app 一个源码位" | baseline 2028/2236/2161-2164；`tests/contract/deploy-app-delivery.contract.test.mjs:37-42` |
| P2-2 | **价格权威被绕过**：scaffold 仍持有 `pricing_model/price_minor/currency`，且 `PAID` 安装直接 `JOIN commerce_order/commerce_order_item`（跨模块读表） | baseline 3128-3158；`repository-sqlx/src/template_market.rs:1575-1646` |
| P2-3 | **作用域不可变只在服务层**：直接 `UPDATE iam_application_installation SET ownership_scope='USER' ...` 同时满足对齐 CHECK，可成功 | IAM 0044:91-113；`application_registry.rs:821-828` |
| P2-4 | **installation_environment 缺五环境 CHECK**：`env_key TEXT NOT NULL` 无值约束（正是 runbook 第 10 步写入的表） | IAM 0039:34 |
| P2-5 | **概念/词汇未收敛**：owner 规范里有第 6 个概念 `Blueprint`；工厂称"恰好五概念"；产品概念有 Product / Product application / product application 三个名字；词汇门禁反而禁止授权文件自己的用词（`check-identity-naming.mjs:224`） | `APPLICATION_IDENTITY_SPEC.md:18,19,43`；`APPLICATION_FACTORY_DEPLOYMENT_SPEC.md:31,35,302` |
| P2-6 | **规范仓工作区有 10 个未提交的规范性改动**（约 920 行），"当前"有工作区与 HEAD 两个含义 | `git -C sdkwork-specs status` |
| P2-7 | **状态机有两个写入者且 ARCHIVED 非终态**：`apps.activate` 可把 ARCHIVED 无声复活；`apps.update` 也能写 `app_status` 而不补 `archived_at` | `repository-sqlx/src/apps.rs:828-838,992-1007`；`service/src/app.rs:1130-1141` |
| P2-8 | **platform_target 无任何 CHECK、无修复/退役命令**：写错只能手工 SQL（§9 明令禁止的常规恢复方式） | deploy baseline 2326-2353；routes 仅 list/create/retrieve |

---

## 4. 为什么会这样（系统性原因）

1. **规范与证据之间没有机械连接**：一次提交可以同时加 MUST、加清单项、加实现，却漏掉 §13 —— 说明"同一次变更关闭 gap"只是约定，没有评审或门禁兜底。
2. **标准仓没有 CI 契约**：`QUALITY_GATE_SPEC.md:30` 要求的"workspace 门禁注册表"在 `D:\sdkwork-space` 不存在（根 `package.json` 无 scripts，`sdkwork-specs` 无 `.github/workflows`），中心 MUST 只能靠各仓库自愿接入。
3. **交付面与身份标准各自演化**：没有跨标准检查比对两张"源码"数据模型，伞标准写得像交付面不存在。
4. **生命周期 5/6 与 §9 对账从未进入模块 backlog**：没有工件、没有测试名、没有迁移计划，§13 用散文边界代替了可追踪 gap。
5. **词汇被复制而不是收敛**：source vs source spec、scaffold vs template、Product vs Blueprint 多套活名并存；词汇门禁按债务基线容忍，而不是按授权文件生成。

---

## 5. 改进路线图（按依赖排序，附验收口径）

### 第 0 波：止血（1–2 天，可独立发版）

| 动作 | 验收 |
| --- | --- |
| IAM 0039 两个外键改 `ON DELETE RESTRICT`（新增迁移，不删历史） | 执行 `DELETE FROM iam_application_installation` 报错；卸载/恢复路径回归 |
| IAM `installation_environment` 补五值 `env_key` CHECK；deploy `deploy_app_environment.env_key` 补同款 CHECK；两张拒绝 `demo` 的表补 `demo` | 非法 env 插入被拒绝；`demo` 节点目标可建 |
| 新增 `BEFORE UPDATE OF ownership_scope` 触发器（迁移专用会话标志放行） | 规范 §4 给出的违规 UPDATE 被拒；正规 UpdateApp 路径不受影响 |
| 修正 §13：token 行改为"已写入并校验"；新增两行"卸载无命令""对账未实现"；状态表加"证据+复核日期"列 | 二次审计不再出现"规范说没有、代码已有" |
| 提交或回退规范仓 10 个未提交改动 | `git status` 干净，"当前"只有一个含义 |
| 先把 token 两个 checker 注册成 gate id，作为工厂门禁的第一块砖 | `gates.manifest.json` 出现 factory 相关 gate 且可运行 |

### 第 1 波：补齐工厂的两个缺环（1–2 周）

1. **`apps.uninstall` 命令**（新端口 + 幂等键 + 审计事件）：禁 IAM installation → 禁各环境 → 释放 carrier host → `app_status=ARCHIVED` + `retired_at` + `uninstall_status`（pending/identity_disabled/complete）；**不放 DELETE**。
2. **`GET/POST /app/v3/api/apps/{appId}/readiness`**：一次返回"注册/源码/环境/身份/宿主/锚点"六段派生就绪度与阻塞原因，作为 runbook 的可编程形态。
3. **`deploy_app.app_surface`**（可选列）：让多平台 kind 能记录本次发布的是哪个面，§5 的"一面一 app"才可校验。
4. **供给后 owner 变更 409**：`identity_status <> 'pending_identity'` 时拒绝改 level，错误里指明已存 scope 并提示"新建部署应用"。
5. **提升围栏**：服务端按 `env_level` 推导来源环境（不信请求）、目标必须 ACTIVE、`approval_required` 生效、写入改 `SELECT ... FOR UPDATE` + 版本条件（冲突 409）。

### 第 2 波：把"能不能回退"变成可验证（2–3 周）

1. **`tools/check-application-factory-standard.mjs`**：按规范段落断言命名索引/CHECK 存在、五环境词汇、域公式 fixture、§13 行新鲜度标记；注册进 `gates.manifest.json` 并接入四个工厂仓库的 check 链；在 `README.md` 工厂任务行写出该命令。
2. **一条跨模块 E2E 验收**（可用 Testcontainers/一次性 compose）：跑完 §11 的 14 步 + 一次失败补偿 + 一次卸载，断言"1 installation / N releases / 无悬空引用"。
3. **状态机收敛**：`deploy_app_status_transition(from,to)` 单一规则；ARCHIVED 对本 API 终态；`appStatus` 从 `UpdateAppRequest` 移除。

### 第 3 波：架构级收敛（1–2 个月）

1. **裁决 `deploy_app_source_spec`**：要么按"一面一 app"退役，要么在 §5/§6 正式承认"交付源码 spec（N）≠ remix 源码位（1）"并写进 §2/§13。**这件事不能继续悬空**——它是当前最大的规范-实现裂缝。
2. **`deploy-factory-reconcile` worker/命令**：四类对账（身份 vs installation 存在、owner_type vs scope、环境域 vs carrier host、token 锚点 vs installation）→ 管理端接口 + 定时运行 + 告警；补 `deploy_identity_provision_total{outcome}`、`deploy_promotion_conflict_total` 等指标。
3. **升级/卸载产品面**：把第 1 波的命令接进 deploy 控制台；升级只新增 release、锚点与 installation 不变（现已成立，但缺"一键"与证据链）。
4. **价格权威收口**：scaffold 价格降级为展示回显；付费判定改走 appstore/order 端口；退役 `commerce_order` 直连。
5. **`Blueprint` 取舍**：删除或明确为"无表的从属术语"；产品概念统一一个词；让词汇门禁由授权文件生成而不是反向容忍。

---

## 6. 值得强调的两个判断

- **不要重写五概念模型。** 它是这套体系最值钱的资产；问题不在概念，而在"概念之间的顺序"没有代码与门禁。修的是编排、对账、卸载和证据，而不是再设计一次身份层。
- **规范的可信度比规范的完备度更紧迫。** §13 已经在"近期已实现"上说了反话；如果状态账本不被当作构建产物去维护（证据列 + 门禁 + 每个版本复核），下一次审计仍会得到同样结论。建议把"§13 行新鲜度"直接做成 checker 的一部分。

---

## 7. 实施记录（2026-11-20 当日回填）

第 0 波（止血）与第 1 波（补工厂缺环）已全部落地，改动分布在三个仓库，均经真实 PostgreSQL 与门禁验证。

### 7.1 P0（第 0 波）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 删除级联 → `RESTRICT` | `sdkwork-iam/database/migrations/postgres/0045_application_factory_safety_guards.up.sql`：两个子外键由 catalog 发现后重建为 `ON DELETE RESTRICT` / `ON UPDATE NO ACTION` | `iam-0045-verify.mjs` 40/40 PASS：`DELETE` 有子行时被 FK 拒绝、无子行边界仍可删 |
| IAM 环境词汇 CHECK | 同上：`chk_iam_application_installation_environment_env_key`（五值 + 非法行预检报告） | 同上：`qa` 被拒、五值均可插 |
| `ownership_scope` 不可变 | 同上：`BEFORE UPDATE OF ownership_scope, owner_user_id` 触发器；`sdkwork.allow_ownership_scope_change='on'` 为受控修复逃生门 | 同上：TENANT→USER 被拒并点名两侧、NULL→owner 填充放行、逃生门为会话级 |
| deploy 环境词汇 + 卸载/表面列 | `sdkwork-deployments/database/migrations/postgres/0015_application_factory_lifecycle_guards.up.sql` + 基线同步折叠：`chk_deploy_app_environment_env_key`、`chk_deploy_deployment_environment`、`chk_deploy_app_platform_target_platform`、`app_surface`、`uninstall_status` | `deploy-0015-verify.mjs` 13/13 PASS（含 0015 可重放） |
| 工厂门禁 | `sdkwork-specs/tools/check-application-factory-standard.mjs`（5 组 63 项检查）+ `gates.manifest.json` 契约级注册 + `package.json` 脚本 + README 任务行 | `node tools/check-application-factory-standard.mjs --root . --workspace ..` exit 0；自测 15/15 |
| §13 状态表纠偏 | `APPLICATION_FACTORY_DEPLOYMENT_SPEC.md` §13：新增 `reviewed` 证据列、9 行状态、token 行改为"已写入并校验"、新增"卸载与就绪"行、明确 `deploy_app_source_spec` 与 remix 源码位的边界 | checker 的「landing status table」组校验 9 行全部带日期 |
| 词汇冲突 | `APPLICATION_IDENTITY_SPEC.md`：`Blueprint` → `Application identity slice`，`Product application` → `Application (product identity)`；`check-identity-naming.mjs` 本文件问题由 7 降至 0（余 5 处为他人文件的历史债务） | 命名门禁输出核对 |

### 7.2 P1（第 1 波）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 卸载命令 | `POST /app/v3/api/apps/{appId}/uninstall`：仓储 `factory.rs` + 服务 `factory_ops.rs` + 契约 `AppUninstallResponse`；顺序为"标记 pending → 调 IAM 禁用 → 标记 identity_disabled → 归档环境与应用"，失败保留应用可运营并记 `failed`，重放返回 `replayed` | `factory_uninstall_postgres` 2/2（阶段持久化、环境归档后仍保留、陈旧重试不回退、ARCHIVED 不可复活） |
| IAM 禁用能力 | `sdkwork-iam-web-adapter/src/application_registry.rs`：`disable_installation_and_environments`（单事务、幂等、不删行）+ anchor 寻址入口并导出 | `cargo test -p sdkwork-iam-web-adapter --lib` 228 passed；`--test installation_disable_postgres -- --ignored` 3 passed |
| 跨模块端口 | 新 crate `sdkwork-deploy-identity-lifecycle-port`：in-process 适配器 + 明确 fail-closed 的 HTTP 适配器；service-host 按与供给相同的开关注入 | `cargo check --workspace`；单测覆盖"未配置必须失败"与"找不到安装≠失败" |
| 就绪度端点 | `GET /app/v3/api/apps/{appId}/readiness`：六段派生（注册/平台目标/环境/身份/源码/承载），纯函数在 `sdkwork-deploy-core::factory_readiness` | 7 个单元测试覆盖阻塞顺序、ARCHIVED 不可就绪、承载为 EXTERNAL |
| 状态机单一口径 | `sdkwork-deploy-core::app_status`：`DRAFT→ACTIVE→PAUSED→ARCHIVED`，ARCHIVED 终态，重放为 no-op；仓储 `set_app_status` 与 `apps.update` 共用；PATCH 同步写 `*_at` | 7 个单元测试；`apps.update` 不再能直写状态绕过 |
| 供给后 owner 变更拒绝 | `repository-sqlx/src/apps.rs::set_app_owner_repo`：`identity_status <> pending_identity` 时改 level/owner 返回 409 | `app_ownership_scope_postgres` 7/7（新增 `a_provisioned_application_refuses_an_ownership_level_change`） |
| 提升围栏 | `environments.rs::promote_environment_repo`：锁全部环境行、目标必须 ACTIVE、`approval_required` 生效（`approve` 字段）、来源环境由 `env_level` 推导并与命名值比对、指针写带条件 | `environments_postgres` 2/2（新增"生产需审批"用例；原用例先显式激活 demo/production） |
| 环境词汇补全 | deploy 0015 + 基线：`deploy_app_environment.env_key`、`deploy_deployment.environment`、`platform_target.platform` 三处 CHECK | 同上 13/13 |

### 7.3 第一轮结束时仍待办（第 2/3 波；其中对账与既有失败测试已在 7.5 关闭）

1. ~~**§9 对账 worker**~~ → 已在 7.5 落地 `apps.factoryReconciliation`。
2. **`deploy_app_source_spec` 最终裁决**：规范 §13 已把"交付源码（N）/remix 源码位（1）"边界写清，但交付面是否保留多源码模型仍是架构决策，需要 module owner 拍板（退役或正式二分）。
3. **价格权威收口**：scaffold 价格列与 `commerce_order` 直连仍在（P2-2），需 appstore/order 端口化与退役迁移。
4. **工厂控制台**：`apps.uninstall` / `apps.readiness` / remix / promotions 仍无 PC 控制台入口，runbook 现在至少可通过命令面执行。
5. **拆分部署的卸载**：HTTP 生命周期适配器按设计 fail-closed——IAM 尚未发布按锚点寻址的 disable 操作；需 IAM 契约补齐后才能支持 split 部署。
6. **既有债务（非本次引入，已核实）**：`tests/contract/deploy-standard.contract.test.mjs` 的 loopback upstream 断言长期失败（已在 7.5 修复）；`sdkwork-iam` 的 `bootstrap_issuance_signs_the_installation_scope_in_all_three_states` 在无 0045 的对照库上同样失败（JSONB/TEXT 解码与历史 `system` 用户主键冲突）；rustfmt 版本差异使 IAM crate 在改动前就不是 fmt-clean。

### 7.4 第一轮变更面清单

- `sdkwork-specs`：`APPLICATION_FACTORY_DEPLOYMENT_SPEC.md`（§13 + 边界）、`APPLICATION_IDENTITY_SPEC.md`（词汇）、`tools/check-application-factory-standard.mjs`、`tools/check-application-factory-standard.test.mjs`、`gates.manifest.json`、`package.json`、`README.md`。
- `sdkwork-iam`：`database/migrations/postgres/0045_*.up.sql`、`application_registry.rs`、`lib.rs`、`installation_lifecycle.rs`（夹具）、`tests/installation_disable_postgres.rs`。
- `sdkwork-deployments`：`database/ddl/baseline/postgres/0001_deploy_baseline.sql`、`database/migrations/postgres/0015_*.up.sql`、`Cargo.toml`/`Cargo.lock`、新 crate `sdkwork-deploy-identity-lifecycle-port`、`sdkwork-deploy-core`（`app_status`、`factory_readiness`）、`sdkwork-deploy-contract`（ready/uninstall DTO、`approve`、`app_surface`/`uninstall_status` 回显、ports 默认实现）、repository `factory.rs`/`apps.rs`/`environments.rs`/`port.rs`、service `factory_ops.rs`/`app.rs`/`lib.rs`/`repository.rs`、service-host 注入、app-api `paths.rs`/`routes.rs`、两个 PG 测试文件。

### 7.5 第二轮：安全与规范债务清理（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 工厂对账 worker | `sdkwork-deployments`：`factory_reconcile.rs`（6 个闭合 finding code：身份 active 无安装、安装 enabled 但 deploy pending、已卸载仍 enabled、安装域未在 deploy 域名计划、单应用多 carrier、carrier 指向不存在的应用）+ `GET /backend/v3/api/apps/factory_reconciliation`（`apps.factoryReconciliation`，`deploy.apps.read`）；对兄弟模块表按 `current_schema()` 探测，缺表降级 `PARTIAL`/`unavailable` 而非误报 clean；无租户上下文直接 400 拒绝 | `factory_reconcile_postgres` 3/3（clean / drift 全代码 / 无兄弟表降级）；OpenAPI + 路由 manifest 重新物化 |
| 规范命名债务清零 | `APP_RUNTIME_TOPOLOGY_SPEC.md`、`DATABASE_SPEC.md`、`ENVIRONMENT_SPEC.md`、`IAM_SPEC.md`、`SDKWORK_WEBSERVER_SPEC.md` 的 5 处 gateway/product 措辞 | `check-identity-naming.mjs` exit 0（原 7 处 → 0） |
| 既有失败契约测试修复 | `tests/contract/deploy-standard.contract.test.mjs`：仓库已迁移到 `kubernetes`/container-image 驱动，测试仍断言 nginx loopback upstream。改为按描述符分支：非 nginx 驱动断言"不得伪造 upstream"，nginx 渲染契约用显式 fixture 继续覆盖（strip-prefix、UA map、try_files 分发、snippet 生成） | 该测试从长期失败变为通过；`pnpm test` 的 deploy 契约组 4/4 |
| 门禁注册一致性 | `gates.manifest.json`：工厂 gate 由 contract 改为 guardrail + baseline 0（工作区根没有 `check:all` 可派生 contract 层），语义不变——任何 finding 仍失败 | JSON 合法；checker exit 0 |
| §13 再次纠偏 | `APPLICATION_FACTORY_DEPLOYMENT_SPEC.md`：新增"Reconciliation"行（含 6 个 code 与边界）；"Environment and hosts"行明确 `approval_required` 只是显式确认而非第二审批人 | checker 通过 |

### 7.6 仍存在且已明确边界的项

1. ~~**拆分部署卸载**：IAM 尚未发布"按 deploy 锚点寻址 disable"的后端操作~~ → 已在 7.7 落地：IAM 新增 `tenantApplications.disableByDeployApplication`（bootstrap 机器鉴权），deploy HTTP 适配器已接入。剩余边界：carrier 仍由 webserver 释放，uninstall 只到 deploy 边界。
2. **价格权威**：已确认**被 appstore 契约阻塞**——`appstore_listing` 只有 `pricing_model` 与 `commerce_product_id`，没有价格金额/币种表，appstore API 也没有价格字段。deploy 的 scaffold 价格仍是付费/免费判定，结算读取 `commerce_order` 直连；已加 fail-closed 回归测试，并把阻塞条件写进 §13。需 appstore 先发布 listing-price 契约。
3. **控制台入口**：`apps.uninstall`/`readiness`/remix/promotions 仍无 PC 控制台页面（命令面可用）。
4. **审批权威**：已从"调用方布尔"升级为"必须指名第二个主体、记录在 promotion 行、不得与发起人相同"（迁移 0016 + 契约 + PG 测试）；但仍是单一 `deploy.apps.write` 权限，没有基于角色的审批人校验。
5. **IAM 格式漂移**：本机 rustfmt 1.11 与仓库基线格式不一致，crate 在改动前就不是 fmt-clean；这是工具链漂移，需要一次全仓格式化提交，不宜夹带在本次改动里。

### 7.7 第三轮：拆分部署卸载契约 + 跨仓契约债务清零（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| IAM 锚点寻址 disable | `sdkwork-iam`：`IAM_TENANT_APPLICATIONS_DISABLE_PERMISSION`、`disable_tenant_application_by_deploy_application_handler`（`authToken` 机器鉴权 + 超管权限 + 租户校验 + 限流）、路由 `/backend/v3/api/iam/tenant_applications/by_deploy_application/{deployApplicationId}/disable`、manifest `bootstrap_body` 条目、OpenAPI 操作 `tenantApplications.disableByDeployApplication`（`iam.tenant_applications.disable`） | `cargo test -p sdkwork-routes-iam-backend-api --lib` 50 passed；OpenAPI 边界重新物化 |
| deploy HTTP 卸载适配器 | `sdkwork-deploy-identity-lifecycle-port/src/http.rs`：POST 锚点路由 + `{authToken, tenantId}` 体，404→`NotFound`、其他→`Rejected`、超时→`TimedOut`；`from_env` 复用 provisioning 的凭据文件读取 | 新 crate 单测 6/6；`cargo check --workspace` exit 0 |
| IAM 契约漂移修复 | `sdkwork-iam-contracts`：补 `customMenus.rollback`/`sync` 到 API 路由表与 capability 块；删除已由 0034 退役的 `iam_user_official_account` 表常量；表计数断言改为"非空 + 无重复 + 全 `iam_` 前缀 + 契约表全覆盖"；`BACKEND_OAUTH_RESOURCE_TREE` 补两个资源 | `run-iam-standard-contracts.mjs`：**21 文件 / 175 测试全绿**（原 3 个测试红） |
| 规范文档可执行性 | 全工作区 `check-doc-tool-invocation-contract.mjs --workspace ..`：修正 hub 两个 skill 的工具名/子命令、missory README 的 `--root`→`--workspace`、sandbox 文档把"待建工具"写成非可执行形态 | **0 findings，4875 条调用 / 45995 份文档** |
| 命名门禁 | 前一轮 5 处措辞修复 | `check-identity-naming.mjs` exit 0 |

**说明**：IAM 集成测试（`oauth_*`）在本机失败是 `PoolTimedOut`——默认开发库端口无服务/连接耗尽，属环境问题，不是本轮改动；标准契约套件（非 DB 集成）已全绿。

### 7.8 第四轮：审批职责分离 + 价格门禁加固（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 审批职责分离 | `sdkwork-deployments`：迁移 `0016_environment_promotion_approver.up.sql`（`approver_user_id` + 索引，基线同步折叠）；`PromoteEnvironmentRequest.approverUserId`、`EnvironmentPromotionResponse.approverUserId`；提升围栏要求 `approve=true` **且** approver 为正整数主体、且不等于发起人，写入 promotion 行 | `environments_postgres` 2/2（新增"缺 approver 拒绝""自我审批拒绝""记录 approver"三断言） |
| 价格门禁回归 | `factory_price_authority_postgres`：commerce 表缺失 → `false`（fail closed）；未结算/他人/非 app_template/他模板/不存在 → `false`；匹配结算单 → `true` | 2/2 通过 |
| §13 诚实标注 | "Environment and hosts" 行改为第二主体审批 + 记录；"Scaffold and price" 行明确**被 appstore 契约阻塞**（无价格金额表/API 字段） | 工厂 checker 通过 |
| 机器调用审计 | IAM 锚点 disable 处理器在禁用成功后写 `iam.audit_event`（action `iam.tenantApplications.disableByDeployApplication`，含 deploy 锚点/安装 id/权限）；审计写失败只记 error，不把已成功的禁用变成可重试错误 | `cargo test -p sdkwork-routes-iam-backend-api --lib` 50 passed；标准契约 175/175 |

### 7.9 第五轮：规范校验器修复 + API 契约硬化（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 命令动词词表 | `sdkwork-specs/tools/lib/api-operation-patterns.mjs`：`COMMAND_ACTIONS` 增加 `disable`/`enable`/`default`。API_SPEC §7.4 的动词表是"for example"非穷举；旧词表把 `POST .../disable` 误判为 create 并要求 201 | 工具自测 41/41 |
| 忽略临时快照 | `http-response-envelope-patterns.mjs`：`IGNORE_DIRS` 增加 `tmp`（与 doc-tool 门禁一致）。IAM 仓 `tmp/openapi-snap/` 的旧副本导致对已修复契约的假告警（84 → 38） | 重新扫描计数核对 |
| IAM 查询参数规范 | `materialize-iam-v3-openapi-boundaries.mjs` 作为唯一来源，把 `role_bindings`、`provider_accounts` 的 9 个 camelCase 查询参数改为 lower_snake_case；`backend_sql.rs`/`provider_accounts.rs` 保留 camelCase 别名 | `cargo test -p sdkwork-routes-iam-backend-api --lib` 51 passed |
| 外部协议标注 | 微信 official account notify 两个操作加入 external wire 映射，按 API_SPEC §4.5.2 豁免 | 校验器不再报这两条 |
| 新锚点操作合规 | operationId 改为 `tenantApplications.management.byDeployApplication.disable`（动作=路径末段 `disable`） | 该操作不再出现在 findings |
| deploy 对账契约合规 | `apps.factoryReconciliation` → `apps.factoryReconciliation.list`；`appsChecked` 改 int64 string + `x-sdkwork-int64-string`（§13.6） | deploy lib/PG/契约 4/4 全绿；该操作 0 findings |

**量化剩余（需版本化契约迁移，不在本轮强改）**：
- IAM：19 个唯一 API pattern findings（9 个 `operation-id-tag-duplication` 的 `iam.oauth.*` operationId、3 个 OAuth create 返回 200、6 个 operationId 动作名、1 个 logout 命令状态）。
- deploy：24 个唯一 findings，重点是 download catalog 的 `revision`/`sizeBytes` 仍声明为 `type: integer`（真实浏览器精度风险，§13.6）、若干 `x-sdkwork-idempotent` 操作未声明必需 `Idempotency-Key` 头、PUT 动作命名与 `cloud_accounts` 查询参数。

### 7.10 第六轮：状态固化与回滚恢复（同日）

- 三个仓库在本轮开始前被外部进程提交（deploy `5279ef9`、iam `098a3288`、specs `0e86b2d`），前几轮改动已进入历史。
- 该提交的 deploy OpenAPI 快照发生在 `apps.factoryReconciliation` 改名与 `appsChecked` int64-string 修复之前；一次文本脚本修改 idempotency 头时污染了 YAML（重复 `parameters:`），随后用 `git restore --worktree --source=HEAD -- <exact path>` 恢复并**重新应用**两项工厂修复，重新物化契约。
- 教训已记录：对 4,600 行权威 YAML 做文本插入必须先解析验证；`Idempotency-Key` 头补齐留到下轮以解析-插入方式做，不再盲改。
- 复核：deploy check/lib/PG 16 项/契约 4 个全绿；IAM 51 + 175 全绿；specs 工厂 checker、API pattern 工具自测 41、命名、文档调用契约全绿。

### 7.11 第七轮：int64 线格式与幂等头契约修复（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| download catalog int64 | deploy `downloads.rs` 响应 DTO 的 `revision`/`sizeBytes` 改为 `String`（读取时 `try_get::<i64>` 转字符串），请求边界解析 int64 字符串；OpenAPI 4 处 schema 改 `type: string` + `pattern` + `x-sdkwork-int64-string`（§13.6）。控制台本来就把 `sizeBytes` 当 `string` 处理，此项同时修正了线格式不一致 | deploy check/lib 全绿；API pattern 的 4 类 int64 findings 全部消失 |
| 幂等头 | `apis/backend-api/deploy/openapi.yaml` 给 8 个 `x-sdkwork-idempotent: true` 操作补齐必需 `Idempotency-Key` 头（复用 `IdempotencyKeyParam`）；其中 4 个操作还缺 YAML 侧 idempotent 标记（JSON 由 Rust 路由注入），一并补齐，避免"有头无标记" | YAML 解析验证 + 重新物化；idempotency findings 0 |
| 净效果 | deploy API pattern findings 73 → **37** | 计数核对 |

**PC 控制台类型检查**：`pnpm typecheck` 在 deploy-pc 下报告 235 个错误，全部位于兄弟仓（sdkwork-iam/sdkwork-core/sdkwork-appbase/sdkwork-drive）的既有 `exactOptionalPropertyTypes`/类型漂移；**没有**任何 download/sizeBytes/revision 相关错误，因此不是本次线格式变更引入。

### 7.12 第八轮：应用分层真实违规 + 校验器误报（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 分层校验器误报 | `check-application-layering.mjs`：`RAW_HTTP_RE` 会把 `this.fetch(1)` 和页面本地 `fetch(page)` 方法定义当成裸 `fetch(` 网络调用。改为 `hasRawHttpCall`：排除成员调用（负向后行）并剥离本地同名方法定义；真实裸 `fetch('/url')` 仍被拒绝 | 工具自测 6/6（新增"本地 fetch 方法"回归用例）；deploy/iam/specs 三仓 layering 全绿 |
| 特性包直连生成 SDK | `admin-downloads` 的 `service.ts`/`DownloadCatalogPage.tsx`/测试改为从 `@sdkwork/deployments-pc-admin-core` 导入端口类型；core 以 `export type` 重新导出所需 wire 类型。生成 SDK 模块不再出现在特性包依赖图 | layering 通过；`admin-downloads` vitest 2/2 |
| workspace 漂移 | `sync-workspace.mjs --repo sdkwork-deployments`：补入两个 mobile-react 包、移除已不存在的 `sdkwork-order-app-sdk` 条目（2 增 1 删） | `verify-repo` 不再报告该漂移 |

**verify-repo 剩余 1 项（既有）**：`admin-core` 直接使用 app-api SDK（`@sdkwork/deployments-app-sdk`）承载 app-template 创作。这是既有设计（代码内注释已说明 backend-admin 契约没有 create/patch 命令），修复需要引入 app-plane 端口包并把创作编排移出 backend-admin core，属独立重构，未在本轮强改。

### 7.13 第九轮：admin-core 端口化 + CI 依赖清单（同日）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| app-plane 端口化 | 新增 `admin-core/src/app-plane-port.ts`：定义 `DeploymentsAppPlaneClient` 与 create/update/screenshot 结构化类型；`index.tsx` 改用端口类型、删除 `createDeploymentsAppClient` 与 app-api SDK import；client 构造移到组合根 `DeploymentsAdminSurface.tsx` | `verify-repo` 对 deploy **全部通过**（此前 4 项） |
| 组件契约 | `admin-core/specs/component.spec.json` 移除 `sdkwork-deployments-app-sdk` 的 `sdkDependencies` 条目（surface=backend-admin 不得声明 app-api SDK） | 同上 |
| CI 依赖清单 | `agent.workflow.json` 补入 `sdkwork-cloudrouter`、`sdkwork-kernel`、`sdkwork-sandbox` 三个 `dependencies[]` 条目（本地 workspace 引用但 CI 未 checkout，属真实打包缺口） | `check-dependency-list-completeness` 通过（3 行新增，无格式噪声） |
| 回归 | admin-core / admin-downloads 单测 5/5；PC typecheck 仍为 235 个错误，全部在兄弟仓既有类型漂移，admin-core/surface/downloads **0 个** | 类型检查与单测证据 |

**遗留小项**：`admin-core/package.json` 仍声明 app-api SDK 依赖（源码已不使用），移除需同步 pnpm lockfile，留待依赖清理轮次。

### 7.14 第十轮：deploy API 契约全合规（operationId/tag/状态码/查询参数）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| download catalog 资源组 | tag `downloadCatalog` → `downloads`（消除 operation-id-tag-duplication）；`downloadCatalog.upsert`/`downloadCard.upsert`/`downloadItem.upsert`/`downloadUpdate.upsert` → `.update`（PUT 动作合规） | 重新物化 + 双 SDK 生成；控制台迁移到 `client.downloads.*` 并补 `Idempotency-Key` 参数 |
| 公开下载读 | `downloadCatalog.publicRetrieve` → `downloadCatalog.public.retrieve`（动作合规，SDK 变为 `downloads.downloadCatalog.public.retrieve`） | 同上 |
| 批量主机名声明 | 改为命令端点 `/domain_zones/{zoneId}/hostname_claims/ensure` + operationId `domainZones.hostnameClaims.ensure`（批量"确保存在"不是资源 create，不应要求 201/data.item）；`ensure` 加入规范工具命令动词表 | API pattern 0；Rust 路由/清单/路径常量同步 |
| source spec 绑定 | `apps.sourceSpecs.bindSource` → `apps.sourceSpecs.source.update`（PUT 动作合规，SDK `sourceSpecs.source.update`） | 控制台发布流同步 |
| 云账号查询参数 | `dnsProvider`/`scopeType` → `dns_provider`/`scope_type`（YAML + `ListCloudAccountsQuery` serde rename，保留 camelCase alias） | API pattern 0 |
| 净效果 | deploy API pattern findings **37 → 0**；`verify-repo` 通过；envelope/layering 通过 | 计数与门禁 |

**控制台回归**：`admin-downloads` 服务迁移到 `client.downloads.*` + 幂等键，单测 2/2；admin-core 3/3；PC typecheck 仍 235 个既有兄弟仓错误，本轮触达文件 **0 个新增**。

**注**：SDK 重新生成后存在 gitignored 的旧 `.js/.map` 构建残留（sourcemap 警告），由构建命令重建，不影响受版本控制的内容。

### 7.15 第十一轮：审批权限门禁（deploy.apps.approve）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 权限投影 | `DeployAppRequestContext.permissions: Vec<String>`（serde 默认、不序列化），由 `DeployAppContextInjector` 从已验证 principal 的 `permission_scope` 注入；客户端无法伪造 | 编译通过 |
| 通配匹配 | `has_permission` 支持 `*`、`deploy.*`、`deploy.apps.*`、前缀 `*` 家族（与 IAM scope 词表一致） | 契约 crate 单测：精确/通配/拒绝矩阵 2/2 |
| 审批门禁 | `require_promotion_approval()` fail-closed；`promote_environment` 在 `approve: true` 时先校验 `deploy.apps.approve`，否则返回 403 且不写任何行 | 单测覆盖"无权限/仅 write/有 approve"三态；deploy 契约 5/5 |
| 影响面 | 记录审批现在需要第二个权限授予（与"审批人必须是第二主体"叠加），生产需先给审批角色授予 `deploy.apps.approve` | 已写入 §13 的 "Environment and hosts" 行（待补） |

**测试修复**：为通过全量测试构建，补齐 16 处测试上下文初始化的 `permissions` 字段，并把 4 处 download catalog 测试的 `sizeBytes`/`revision` 断言改为 int64 字符串（第 6 轮线格式变更的测试面补齐）。

**验证**：deploy `cargo test --workspace --tests --no-run` 0；lib 全绿；PG 6 组 18 项全过（本地 PostgreSQL 因陈旧进程退出，本轮已重启并验证）；契约 5/5；API pattern 0；verify-repo/layering/envelope/工厂 checker 全通过。

### 7.16 第十二轮：对账 worker 进程（补齐 "reconciliation worker" 语义）

| 项 | 落地位置 | 验证 |
| --- | --- | --- |
| 公开读入口 | `DeployRepository::reconcile_factory_references(tenant_id)`（委托内部 `pub(super)` 实现，单一实现） | 仓库 PG 3 项仍通过 |
| worker crate | 新增 `crates/sdkwork-deploy-factory-reconciliation-worker`：遍历拥有应用的租户，逐租户运行同一报告；`DRIFT`→ERROR、`PARTIAL`→WARN、`CLEAN`→INFO；周期 `SDKWORK_DEPLOY_FACTORY_RECONCILIATION_INTERVAL_SECONDS`（默认 300s），Ctrl+C/SIGTERM 优雅退出；只读（`new_lookup`，无密钥/无租约） | `cargo check`/lib 单测 2/2；全量测试目标构建 0 |
| 规范状态 | §13 Reconciliation 行补 worker 证据，并如实写明"只记录日志、未接告警平台" | 工厂 checker 5 组 0 失败 |

## 8. 终态核对（目标逐项）

| 目标项 | 状态 | 证据 |
| --- | --- | --- |
| 对账 worker | 完成 | 端点 + 仓库报告 + worker crate + PG 3 项 + 单测 |
| 拆分部署卸载契约 | 完成 | IAM 锚点 disable + deploy 两适配器 + `factory_uninstall_postgres` 2 项 |
| 价格权威 | **外部阻塞** | appstore 无 listing-price 契约；deploy 侧 fail-closed 已回归测试，§13 记录 |
| 审计轨迹 | 完成 | deploy uninstall/promote 审计；IAM 机器禁用审计；审批人留痕 |
| 租户隔离 | 完成 | ownership/environment PG 测试、FK RESTRICT、scope 守卫 |
| token 锚定 | 完成 | 生成器 stamp `ownership_scope`、校验器、发布门禁 |
| 规范校验器 | 完成 | 工厂 checker、API pattern（0）、layering、doc-tool、命名、工具自测 |
| 技术债 | 完成（除工具链格式） | 词汇漂移、失败契约测试、编码均已修；IAM rustfmt 版本漂移属环境决策 |
| 真实 PG 验证 | 完成 | deploy 18 项 PG、IAM 51/175、契约 5/5、verify-repo 通过 |

**明确未做（记录在案，非安全漏洞）**：IAM 19 个 API 契约改名（破坏已发布 SDK，需版本治理）；控制台工厂页面（产品功能，§13 已按 reviewed 日期登记）；`admin-core/package.json` 未用依赖清理（需同步 lockfile）；IAM 全仓 rustfmt（工具链版本差异）。

---



- `sdkwork-specs`：`APPLICATION_FACTORY_DEPLOYMENT_SPEC.md`（§13 + 边界）、`APPLICATION_IDENTITY_SPEC.md`（词汇）、`tools/check-application-factory-standard.mjs`、`tools/check-application-factory-standard.test.mjs`、`gates.manifest.json`、`package.json`、`README.md`。
- `sdkwork-iam`：`database/migrations/postgres/0045_*.up.sql`、`application_registry.rs`、`lib.rs`、`installation_lifecycle.rs`（夹具）、`tests/installation_disable_postgres.rs`。
- `sdkwork-deployments`：`database/ddl/baseline/postgres/0001_deploy_baseline.sql`、`database/migrations/postgres/0015_*.up.sql`、`Cargo.toml`/`Cargo.lock`、新 crate `sdkwork-deploy-identity-lifecycle-port`、`sdkwork-deploy-core`（`app_status`、`factory_readiness`）、`sdkwork-deploy-contract`（ready/uninstall DTO、`approve`、`app_surface`/`uninstall_status` 回显、ports 默认实现）、repository `factory.rs`/`apps.rs`/`environments.rs`/`port.rs`、service `factory_ops.rs`/`app.rs`/`lib.rs`/`repository.rs`、service-host 注入、app-api `paths.rs`/`routes.rs`、两个 PG 测试文件。

---

## 附录 A：本次评审的主要证据位置

| 主题 | 位置 |
| --- | --- |
| 工厂伞标准 | `sdkwork-specs/APPLICATION_FACTORY_DEPLOYMENT_SPEC.md`（§2 五概念、§3 六阶段、§9 补偿、§11 runbook、§13 落地状态） |
| 身份规范 | `sdkwork-specs/APPLICATION_IDENTITY_SPEC.md`（§1 术语、§4.1 scope 规则） |
| 部署侧路由 | `sdkwork-deployments/crates/sdkwork-routes-deploy-app-api/src/paths.rs`、`.../sdkwork-routes-deploy-backend-api/src/paths.rs` |
| 部署迁移 | `sdkwork-deployments/database/migrations/postgres/0007/0008/0011/0012/0014_*.up.sql` |
| 部署基线 | `sdkwork-deployments/database/ddl/baseline/postgres/0001_deploy_baseline.sql`（1791 deploy_app、1875 状态 CHECK、2028/2236 source_spec、2326 platform_target、2859 env_key、3128 scaffold price） |
| 供给/补偿 | `sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/app_delivery.rs:272-378`、`.../repository-sqlx/src/apps.rs:683-770,866-1031` |
| 提升 | `sdkwork-deployments/crates/sdkwork-intelligence-deploy-repository-sqlx/src/environments.rs:218-273` |
| IAM 安装 | `sdkwork-iam/database/migrations/postgres/0039_*.up.sql`、`0043_*`（1:1 索引）、`0044_*`（scope CHECK） |
| IAM 生命周期门禁 | `sdkwork-iam/crates/sdkwork-iam-web-adapter/src/installation_lifecycle.rs:219` |
| webserver 承载 | `sdkwork-webserver/database/migrations/postgres/0031_webserver_application_deploy_application_id.up.sql`、`sdkwork-intelligence-webserver-service/src/app.rs:974-982` |
| token 锚点 | `sdkwork-specs/tools/app-access-token.mjs`、`materialize-client-env.mjs`、`check-release-access-token-env.mjs`、`check-app-access-token-env.mjs` |
| 注册器 | `sdkwork-specs/tools/app-registration/README.md`、`register.mjs`、`tests/` |
| 控制台 | `sdkwork-deployments/apps/sdkwork-deployments-pc/packages/sdkwork-deployments-pc-console-publishing/src` |

## 附录 B：评审方法说明

- 9 个并行审计代理分别覆盖：规范完整性、部署面、IAM 安装、token 锚点、承载、商品/脚手架、生命周期流水线、隔离与安全、工具/可观测；随后 1 个对抗式验证代理做交叉核验。主控对 P0/P1 关键结论另行抽检（本文标注的行号均为本次实读位置）。
- 局限：部分模块的完整报告在聚合时被工具输出上限截断，本文对未原样保留的结论只采纳已由主控另行验证或与两份完整报告一致的部分；所有引用的约束/行号均可复核。
- 未在本评审范围内：Drive 字节面、appstore 支付/结算全链路、云端多区域部署实测（仅按规范与公开接口判断）。
