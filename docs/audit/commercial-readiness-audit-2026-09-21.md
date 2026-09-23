# Cloud Router 商业化就绪审计（2026-09-21）

Status: active
Owner: SDKWork maintainers
Application: sdkwork-cloudrouter
Scope: 深度审计 —— 设计对齐 / 虚假实现 / 并发 / 内存 / 数据库 / API / 分页 / 安全 / 商业化能力
Baseline commit: `37985bd9`（工作树干净）

---

## 0. 结论先行

**整体判断：工程质量显著高于我预期的同类"pre-launch"项目，但当前不具备商业化落地能力。**

不是因为它写得差，而是因为**存在一个会直接摧毁多租户安全模型的 P0 缺陷**，
以及**文档与实现之间存在若干处需要归零的偏差**。PRD 自己写的 `preLaunch` 阶段判定是**诚实且准确的**。

| 维度 | 评级 | 依据 |
|---|---|---|
| 架构分层与标准对齐 | **A** | 五道门禁全绿；标准对齐 65/0/0 |
| 虚假实现 / 桩代码 | **A** | Rust 源码 `TODO/FIXME/HACK` = **0**；`todo!()/unimplemented!()` = **0** |
| 并发与死锁 | **A−** | Mutex 显式限定作用域、`.await` 前释放；缓存有界且有淘汰 |
| 内存 / OOM 防护 | **A−** | 流式增量转发不缓冲全体；上游响应 `Limited` 硬上限；账务载荷 16/32 KiB 上限 |
| 数据库设计（PostgreSQL） | **C** | 服务端仅 PostgreSQL（无 SQLite 镜像），`FOR UPDATE SKIP LOCKED` 用法正确；但 **admin catalog 引用 5 张不存在的表 + 2 个不存在的列**（§3） |
| API 契约 | **B** | int64 闭包合规且 OpenAI 兼容豁免已正确声明；但 **12 条 catalog 路由不受契约治理**（§3.3） |
| 分页 | **C+** | 主链路合规；3 处 OFFSET 排序缺唯一键（已修），且其中 2 处实为列名错误（已修） |
| 安全 | **D** | **P0 启动守卫 fail-open**：PostgreSQL 部署可静默接受已公开密钥 |
| 文档 Canon 一致性 | **C+** | 文档契约干净，但与实现有 3 处实质矛盾 |
| **商业化就绪** | **❌ 不具备** | 见 §7 |

> **本轮实施阶段的重要更正**：初版审计把 admin catalog 的 SQL 缺陷记为「P1 分页不稳定」。
> 实施复核时用活库 + 联邦 owner 契约双向取证，发现真实情况严重得多——
> **表不存在、列不存在，接口必然 500**。已升级为 P0 并在 §3 重写。
> 详见 §8 自查披露。

---

## 1. 门禁基线（实测，非推断）

```
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .            PASS
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .  PASS
node scripts/check-database-ownership.mjs                                PASS
python -B tools/architecture_standard_guardian.py                        PASS
python -B tools/sdkwork_standard_alignment_guardian.py                   PASS  (65 passed, 0 failed, 0 blocking)
```

规模基线：35 crates / 273 Rust 文件 / **79,222 行 Rust** / 7 DB 模块 / 6 应用根 / 5 SDK 族。

---

## 2. P0 —— 启动守卫 fail-open，PostgreSQL 部署静默接受已公开密钥

### 判定：真实缺陷（Critical）

**位置**
- `crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs:1466`（要求 PostgreSQL）
- `crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs:1488`（守卫开关）
- `crates/sdkwork-cloudrouter-config/src/security_startup_guard.rs:39-41`（短路放行）
- `crates/sdkwork-cloudrouter-config/src/deployment.rs:9-10, 74-76, 313-315`（默认值）

**证据链（逐环实测）**

```rust
// ① 守卫：传 true 直接 return Ok，完全跳过检查
pub fn ensure_no_known_default_secret_material<'a>(
    secrets: impl IntoIterator<Item = (&'a str, Option<&'a str>)>,
    deployment_allows_default_material: bool,
) -> Result<(), String> {
    if deployment_allows_default_material {
        return Ok(());          // ← 短路
    }
```

```rust
// ② 开关来自 is_production_like()
ensure_no_known_default_secret_material(
    [ /* api_key_pepper, key_ring.active_key, fingerprint_key */ ],
    deployment_mode.is_production_like(),       // runtime.rs:1488
).map_err(GatewayRouterError::Config)?;
```

```rust
// ③ DeploymentMode 默认 = Desktop
pub enum DeploymentMode {
    #[default]
    Desktop,            // ← deployment.rs:9-10
    Server, Docker, Kubernetes,
}
impl DeploymentMode {
    pub fn is_production_like(self) -> bool { !matches!(self, Self::Desktop) }  // :74-76
}

// ④ 环境变量与 TOML 全缺时，兜底返回默认（= Desktop）
fn resolve_legacy_deployment_runtime(..) -> Result<DeploymentRuntime, String> {
    let Some(legacy_mode) = legacy_mode else {
        return Ok(DeploymentRuntime::default());   // ← deployment.rs:313-315
    };
```

**为什么是真实缺陷**

`runtime.rs:1466` 的 `require_postgres_server_database(&config)?` 已经证明"这是服务器部署"，
但紧接着 `:1488` 只按 `is_production_like()` 决定是否查密钥。二者**解耦**，于是：

> 一个**真实运行的 PostgreSQL 生产实例**，只要运维**没显式设置**
> `SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE` / `..._RUNTIME_TARGET` /
> legacy `..._DEPLOYMENT_MODE`，`deployment_mode` 就回退为 `Desktop`
> ⇒ `is_production_like() == false` ⇒ **守卫整段跳过** ⇒ **静默接受已公开的密钥**。

`KNOWN_DEFAULT_SECRET_FRAGMENTS`（`security_startup_guard.rs:15-26`）里收录的正是
**曾经提交进本仓库、因此视为公开知识**的材料：

- `local-dev-key-ring-001`、`dyfeQDB++uTwSSRGuRju9yHE8iX3wTH+ySmqpjimX6w=`、`kg/5KOatnHH9XgtbCS16VkjUEQoohdS5miD2U5GhtBc=`
- `cloudrouter-local-dev-pepper-change-me` 等 4 个 placeholder

**攻击后果（无需任何前置权限）**
1. 用已知 `api_key_pepper` 离线伪造 API Key 哈希 → **绕过网关鉴权**；
2. 用已知 `key_ring.active_key` 解密 `ai_upstream_account_credential` 密文 → **批量窃取全部上游厂商凭据**（等于拿到客户的 OpenAI/Anthropic/Kling 账号）；
3. 用已知 session / trusted-subject 密钥伪造会话。

**与文档直接矛盾**：`security_startup_guard.rs:6-9` 模块文档写着
"rejects startup for **every non-desktop deployment**"，而"是否 non-desktop"在缺配置时
被默认判为 desktop —— fail-closed 事实上变成了 **fail-open on missing config**。

**测试盲区（为何没被发现）**：`security_startup_guard.rs:62-109` 的测试只覆盖
"显式传 `false` 时拒绝"与"显式传 `true` 时放行"两种**单元级**行为，
**没有任何测试**覆盖"PostgreSQL + 未声明部署模式 ⇒ 必须拒绝"这条**集成级**路径。

### 修复方案（三选一，建议 §1）

1. **让判据与数据库引擎耦合**（最小改动、最贴合意图）：
   把 `runtime.rs:1488` 的实参改为
   `deployment_mode.is_production_like() || config.engine == DatabaseEngine::Postgres`。
   理由：`require_postgres_server_database` 已经判定这是服务器部署，密钥卫生就该适用。
2. **缺配置即 fail-closed**：`resolve_legacy_deployment_runtime` 在检测到
   PostgreSQL/Redis 等服务器依赖时**拒绝启动**而非回退 `Desktop`。
3. 退而求其次：缺部署模式声明时打 `ERROR` 日志，并在 Postgres 场景下拒绝。

**并补测试**：新增集成测试 `postgres_without_declared_deployment_mode_rejects_published_secrets`，
放进 `crates/sdkwork-cloudrouter-edge-runtime/tests/`。

---

## 3. P0（升级）—— admin catalog 的真实 Postgres 存储引用 5 张不存在的表 + 2 个不存在的列

> **本节在实施阶段被重新定级。** 原审计把它记为「P1 分页排序缺唯一键」，那是**误判严重程度**：
> 深入复核（活库 + 联邦 owner 契约双向取证）显示这不是"翻页不稳定"，而是
> **接口必然 500**、且**表/列根本不存在**。以下为更正后的记录。
>
> **本节在 2026-09-23 再次更新：整面退役，不再修复。** 那 5 张缺失表已由
> `sdkwork-merchandise@b88a0ef` 的 v2 基线补齐（BIGINT/UUID/TIMESTAMPTZ + FK），
> 但 cloudrouter 侧那份 TEXT 口径的 `admin_catalog_store.rs` 没有跟进的价值：
> 该路径前缀本就被 `crates/sdkwork-routes-cloudrouter-backend-api/src/routes.rs`
> 的 `is_commerce_dependency_contract_path()` 归入「归依赖方 commerce」，
> `apps/sdkwork-cloudrouter-pc/sdk-composition-standard.test.mjs` 也早已断言
> `/backend/v3/api/catalog/products`「belongs to an independent owner backend SDK」。
> 因此处置从「推进 owner 补表后修复本仓实现」改为「cloudrouter 不再本地实现该面」：
> `api/admin_catalog.rs`、`ports/admin_catalog_store.rs`、
> `infrastructure/sql/postgres/admin_catalog_store.rs`、`application/category_seed.rs`
> 及 4 个对应测试文件已删除，跨模块迁移 `0044` / `0045` 一并退役，
> `specs/database-store-migration.manifest.json` 的 `admin-catalog` capability 摘除。
> 下文 §3.1–§3.7 保留为当时的取证记录，其中「当前必然失败」的表述已不再成立。

### 3.1 缺陷清单（活库实测）

`services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/admin_catalog_store.rs`
共引用 11 张表。对照活库 `sdkwork_ai_dev` 与联邦 owner `commerce_*` 契约：

| 表名 | 活库 | 联邦 owner 契约 | 判定 |
| --- | --- | --- | --- |
| `commerce_product_category` | PRESENT | 已注册 | ✅ |
| `commerce_product_attribute` | PRESENT | 已注册 | ✅ |
| `commerce_product_attribute_value` | PRESENT | 已注册 | ✅ |
| `commerce_product_sku` | PRESENT | 已注册 | ✅ |
| `commerce_product_spu` | PRESENT | 已注册 | ✅ |
| `commerce_price_list` | PRESENT | 已注册 | ✅ |
| `commerce_product_spu_category` | **MISSING** | **未注册** | ❌ |
| `commerce_product_media` | **MISSING** | **未注册** | ❌ |
| `commerce_product_category_attribute` | **MISSING** | **未注册** | ❌ |
| `commerce_product_sku_attribute` | **MISSING** | **未注册** | ❌ |
| `c_category` | **MISSING** | **未注册** | ❌ |

列名漂移（2 处，实测 `ERROR: column ... does not exist`）：

| 代码写的列 | 实际列 | 位置 |
| --- | --- | --- |
| `sort_weight` | `sort_order` | `commerce_product_category` / `commerce_product_attribute` |
| `parent_category_id` | `parent_id` | `commerce_product_category` |

### 3.2 双重取证（不是推断）

判据来源必须是**权威**，不能只看代码：

1. **活库**：
   ```
   SELECT id, category_no, sort_weight FROM commerce_product_category LIMIT 1;
   ERROR:  column "sort_weight" does not exist
   ```
   `information_schema.tables` 确认 5 张表在 `sdkwork_ai_dev` 中不存在。
2. **联邦 owner 契约**（`sdkwork-merchandise/database/contract/table-registry.json`）：
   `owner: merchandise-platform` 只注册了上述 **6** 张表，**从未注册**那 5 张。
   其基线 `0001_merchandise_baseline.sql` 也只 `CREATE TABLE` 了这 6 张。
3. **全工作区检索**：那 5 张表的 `CREATE TABLE` 语句在整个 `D:\sdkwork-space` 中**零命中**
   ⇒ 不是"建在别处"，是**从未被任何仓库创建**。

### 3.3 为什么门禁和测试都没拦住（假绿根因）

- **契约缺口**：全部 12 条 `/backend/v3/api/catalog/*` 路由**不在任何 OpenAPI 契约里**
  （`apis/open-api/.../cloudrouter-open-api.openapi.json` 0 命中；
  `apis/backend-api/.../cloudrouter-backend-api.openapi.json` 0 命中）。
  而 `routes.rs:437` 确实把 `admin_catalog_router_with_store` 合进了运行时路由树
  ⇒ **真实可达、但未受契约治理**，契约层校验器看不到它。
- **测试替身遮蔽**：`services/sdkwork-cloudrouter-router-service/tests/admin_catalog_api.rs`
  全程使用内存桩 `TestAdminCatalogStore`，**从不执行 SQL**。
  ⇒ SQL 层可以完全坏掉而测试全绿。

### 3.4 已修复

| 项 | 处置 | 验证 |
| --- | --- | --- |
| `sort_weight` → `sort_order`（含 `AS` 别名保持行映射稳定） | ✅ 已改 | 活库查询通过 |
| `parent_category_id` → `parent_id` | ✅ 已改 | 活库查询通过 |
| 全部 4 处 `ORDER BY` 补唯一 tie-breaker `id ASC` | ✅ 已改 | 对齐 `PAGINATION_SPEC.md` §3 |
| 新增真实 Postgres 回归测试 | ✅ 新增 `tests/postgres_admin_catalog_live.rs` | 4 项，捕获缺陷 |

新增测试**实测捕获到**剩余缺陷：

```
test live_admin_catalog_list_products_and_skus_execute ... FAILED
  list_products must execute against the live schema:
  Some(DomainError { message: "error returned from database:
  relation \"commerce_product_spu_category\" does not exist" })
```
⇒ 列名修复后 `list_categories` / `list_attributes` **已转绿**；
`list_products` 仍红，根因为 `commerce_product_spu_category` 表缺失（未修复，见 §7）。

### 3.5 未修复项（需 owner 决策，不在本仓权限内）

5 张缺失表全部属于 `commerce_` 前缀 ⇒ 归 `merchandise-platform` owner。
`cloudrouter` 的前缀所有权只有 `ai_` / `iam_user_` / `integration_`
（`database/database.manifest.json` `tablePrefixes`），
**在本仓建 `commerce_*` 表会违反库归属契约**，
且 `specs/database-store-migration.manifest.json` 对这组表标注
`ownerReviewRequired: true`。正确路径是**推进 owner 补表**，而非本仓代建。
受影响端点（当前必然失败）：`/backend/v3/api/catalog/products`、
`/catalog/skus`、`/catalog/category_attributes`、`/catalog/category_seeds/initialize`（4/5 数据集）。

### 3.6 原「P1 分页」记录的处置

原记录中 `:210` / `:1431` / `:2172` 三处 OFFSET 缺唯一键的问题**属实且已修**，
但定级应从 P1 提升为「P0 的子项」——因为其中两处同时还是**列名错误**，
即该查询根本执行不了，分页稳定性讨论在缺陷修复前无意义。即该查询根本执行不了，分页稳定性讨论在缺陷修复前无意义。

### 3.7 分页层面的门禁盲区（保留证据）

`check-pagination.mjs` **不解析 SQL**。它对 `services/**/*.rs` 只做正则文本匹配
（`collect::<Vec>().skip/take`、`list_window(`、若干硬编码函数名）。因此：

- 不稳定 `ORDER BY` → **100% 漏检**
- `COUNT(*) OVER()` + `OFFSET` 混用 → **100% 漏检**
- handler 是否真的强制 `page_size ≤ 200` → 不检查
- cursor 是否不透明 / `page`+`cursor` 是否互斥 → 不检查

> **纪律**：分页门禁绿 **只**证明"wire 参数名、OpenAPI `maximum: 200`、缺 `mode`、
> 收集后 skip/take"这四类表症不存在。SQL 层面的分页正确性**无自动防线**，
> 风险全部集中在 `services/.../infrastructure/sql/postgres/**`。

### 分页合规项（实测肯定）

- Chat 消息 / 请求轨迹：`(message_no, id)` 不透明 base64url cursor + `LIMIT page_size + 1`，**无 OFFSET、无 count 窗口** ✅
- `admin_finance_store.rs:225-300`：keyset cursor + `page_size + 1`，`usize::MAX` 不可达（`page_size` 已验证为正） ✅
- 全部 `page_size` 参数 `maximum: 200`（app-api 11 个 + backend-api 32 个，0 例外） ✅
- 生成的 SDK 正确把语言层 `pageSize` 序列化为 wire `page_size` ✅
- `page` 与 `cursor` 互斥已显式拒绝 ✅

---

---

## 4. P1 —— 文档与实现矛盾（原报 3 处，实施后核实为 **2 处**）

| # | 文档声明 | 实现事实 | 判定 |
|---|---|---|---|
| **D-1** | ~~`PRD.md:239` "The application manifest remains `preLaunch: true`"~~ | **❌ 本项撤回：原判为误报。** `sdkwork.app.config.json` 的 `publish.preLaunch` **确实存在且为 `true`**，`publish.status = "DRAFT"`。我初判时只读了 manifest 的**顶层键**，漏了嵌套的 `publish` 对象。PRD 表述**正确**，无需修改（已回滚我的误改）。 | **撤回：PRD 正确** |
| **D-2** | `TECH_ARCHITECTURE.md:175` "Conversation lists use bounded **offset pagination** for their low-volume navigation surface" | `app_chat_store.rs:82-112` 实为 `(updated_at, id)` DESC **keyset cursor**，注释明写 "No OFFSET and no total window"，`LIMIT page_size + 1` | 文档失实（实现更优，**已改文档**） |
| **D-3** | `TECH_ARCHITECTURE.md:52-56` "**Server startup rejects SQLite before database initialization**" | 拒绝**确实存在**，但位置与措辞不符：由各服务端入口的 `require_postgres_server_database` 在**解析出非 Postgres 引擎时**拒绝（`runtime.rs:2500` 等 5 处），**不是**"在数据库初始化之前"这一独立阶段 | 措辞过度声明（**已改文档**为准确描述） |

**D-3 注**：事实层面 SQLite 确实**无法**成为服务端权威库（`database/ddl/baseline/` 只有
`postgres/`，7 个模块 manifest 全部 `engines: ["postgres"]`），所以**风险为零**；
原句"启动时拒绝"虽方向正确，但把实现机制说成了另一个阶段，已按真实调用点改写。

**D-1 的教训（已写入 §8）**：断言"某字段不存在"之前，必须按**嵌套路径**展开确认，
不能用"顶层键列表里没有"来推断。我把 `publish.preLaunch` 当成了不存在的字段，
差点改坏一份本来正确的文档。

---

## 5. P2 —— 孤儿数据库模块目录（影子基线风险）

### 判定：设计债（Medium）

`database/modules/` 下有两个**完整但未被任何 manifest 引用**的模块：

| 模块 | 在根 `modules[]`？ | 前缀 | 自建表 |
|---|---|---|---|
| `ai-metering` | ❌ | `ai_metering_` | `ai_metering_usage`、`ai_metering_request_trace` |
| `payment-reconciliation` | ❌ | `commerce_payment_` | `commerce_payment_statement*`、`_reconciliation_*` |

**核实结论（重要，避免误判）**：
- `ai_metering_usage` / `ai_metering_request_trace` **已在根基线** 38 张 `materializedTables` 中，
  且 `0001_cloudrouter_baseline.sql:357` 实建 ✅ ⇒ **表不缺**，`ai-metering` 目录是**联邦遗留**。
- `payment-reconciliation` 的 4 张表**不在**根基线，也**不在** materializedTables。

**风险**：
1. `check-database-ownership.mjs` 只校验**根 `modules[]` 已声明的模块**（`loadModuleOwnership()`
   对未声明模块返回 `null` ⇒ 主循环 `continue`）⇒ 这两个目录**从未被校验**，
   门禁绿在此处**不代表被检查过**。
2. `payment-reconciliation` 建的表**不在**根基线 ⇒ 若被误纳入，将出现
   与联邦 baseline 的**重复建表 / 结构冲突**。
3. `docs/schema-registry/tables/ai-metering.yaml` 存在 ⇒ schema 编译器可能把
   `ai_metering_*` 合成进根基线，与"联邦模块"定位**语义重复**。

**建议**：择一收敛 —— ① 显式声明为 `retired` 并移入 `docs/archive/`；
② 或纳入根 `modules[]` 并补齐基线。**不要保留"存在但无人管"的第三态**。

---

## 6. 已验证为「合规」的项（避免误报，逐一列出）

这些我起初怀疑、实测后**确认无缺陷**，记录以免后续重复排查：

| 域 | 事实 | 证据 |
|---|---|---|
| **服务端 SQLite** | 服务端**仅 PostgreSQL**，无 SQLite 镜像/回退 | `database/ddl/baseline/` 只有 `postgres/`；91 处 sqlite 引用全在 `config` 解析层与测试 |
| **int64 闭包** | 69 个 `type:integer,format:int64` **全在 open-api 且全部合规** | `apis/open-api/...openapi.json:30285` 已声明 `x-sdkwork-int64-openai-compat: true`（API_SPEC §13.6 正式豁免）；官方校验器 PASS |
| **无界读取** | `openai_compatible_relay.rs:1730-1746` 用 `Limited::new(.., min(MAX_PROVIDER_RESPONSE_MAX_BYTES))` **硬上限**，`unwrap_or(usize::MAX)` 被 `.min()` 钳死 | 64 MiB 默认 / 256 MiB 硬顶 |
| **async 中阻塞** | `response.rs` 的 `usize::MAX` + `block_on` **全部在 `#[cfg(test)]` 内** | `response.rs:700-735` 确认处于 `mod tests` |
| **锁跨 await** | `gateway_chain_policy.rs:103-116` 用独立块 `{ }` 包住 `lock()`，**`.await` 前已释放** | 教科书式正确写法 |
| **缓存无界增长** | 两个缓存均有 `MAX_ENTRIES` + `retain` + `clear` 淘汰 | `gateway_chain_policy.rs:118-124`、`billing_subject_cache.rs:107-117` |
| **流式 OOM** | 真增量转发，不缓冲全体 | `into_data_stream()` + `Body::from_stream()`（`app_runtime.rs:1581/1603/1625`） |
| **连接池** | 显式配置 + 每 host 上限 | `pool_idle_timeout 90s`、`pool_max_idle_per_host 64`、`connect_timeout 10s` |
| **无界表增长** | 有保留策略 worker | `usage_retention.rs`：默认 180 天 / 上限 3650 天，**只删已结算**（`settlement_status=2`） |
| **Redis 依赖** | 非 desktop **fail-closed** 而非静默降级 | `standalone-gateway/main.rs:163`、`runtime.rs:2718`、`backend-api/routes.rs:1313` |
| **消息 `merge` 语义** | 正确地按字段合并而非整帧替换（修过 Anthropic 只计输出的 bug） | `usage_extraction.rs:470-480` |
| **事务隔离** | 分析读用 `REPEATABLE READ, READ ONLY` 单快照 | `loader.rs:90`、`admin-analytics-repository-sqlx/postgres.rs:339` |
| **队列消费** | `FOR UPDATE SKIP LOCKED` 正确用法 | `usage_settlement_store.rs:258`、`payment_reconciliation_runtime_store.rs:384` |
| **错误掩码** | 收敛为固定 Problem Details，不泄露内部 | `response.rs` 的 `shared_validation_message_key` |

**安全子域（除 P0 外）**：凭据 AES-256-GCM + HKDF + AAD 绑定租户上下文 ✅；
SSRF 主链路含 **DNS rebinding 防护**（`OutboundDnsResolver` 连接时校验解析 IP）✅；
租户谓词在数据访问路径齐备 ✅；`AssertSqlSafe` 插值项实测**均为编译期常量** ✅；
未发现 header/body/token 落日志 ✅。

---

## 7. 商业化落地能力评估

### 判定：**不具备**，但差距是"可关闭的"而非"结构性的"

**PRD §7 的 6 个阶段**（Domain convergence → Payment → Chat → **Production hardening** →
Commercial beta → GA）中，前 3 个 `In progress`，后 3 个 `Planned`。
PRD 自陈"No phase may be promoted from documentation claims alone" —— **这个自我约束是正确且诚实的**。

#### 阻塞商用的差距（按优先级）

| 优先级 | 差距 | 为什么阻塞商用 | 关闭成本 |
|---|---|---|---|
| **P0** | 启动守卫 fail-open（§2） | 密钥泄露 ⇒ 客户上游凭据被批量窃取 ⇒ **数据泄露事故 + 合规责任** | 低（1 行判据 + 1 个测试） |
| **P1** | 分页排序不稳（§3） | 管理台翻页重复/漏行 ⇒ 运营误判、财务对账错乱 | 低（3 处加 `id ASC`） |
| **P1** | 文档三处失实（§4） | `preLaunch` 失实 ⇒ 发布流程可能被误触发 | 低（改文案） |
| **P1** | 无常驻负载/浸泡/SLO 证据 | PRD §6 明确要求"Latency/throughput/recovery 必须来自可复现的生产级压测"，**当前 0 项** | **高**（需真实集群 + 压测环境） |
| **P2** | 孤儿 DB 模块（§5） | 影子基线 ⇒ 未来迁移/联邦冲突 | 低 |
| **P2** | 支付出网未接 SSRF 解析器，允许 `http://` | 当前 base_url 硬编码**不可外部触发**；但一旦支付网关可配置即成 SSRF 缺口 | 低 |

#### 关键判断：**性能与高并发能力目前「无证据」，而非「有问题」**

用户特别关注的"大规模集群高并发 / OOM"，实测结论是**代码层面做了正确防护**：
流式增量、响应体硬上限、缓存有界、账务载荷 16/32 KiB 钳制、行锁粒度正确、
无锁跨 await、连接池显式配置。**没有发现结构性 OOM 或死锁缺陷。**

但 PRD §6 的所有性能指标（p95 ≤ 50ms 网关开销、并发、RSS 上限、故障转移时间）
标注为 "must be set and accepted from reproducible production-like load" ——
**这些证据当前一条都不存在**。所以：
- ❌ 不能声称"已满足大规模集群高并发需求"
- ✅ 可以说"代码设计与防护已就位，**待压测验证**"

#### 具体行动清单（建议顺序）

1. **修 P0 启动守卫**（§2 修复方案 1）+ 补集成测试 → 这是唯一的"安全级阻塞项"。
2. **修 3 处分页排序**（加 `, id ASC`）+ 修正 3 处文档失实。
3. **收敛 2 个孤儿 DB 模块**（声明 retired 或补齐基线）。
4. **补分页门禁的 SQL 层规则**：至少加"`OFFSET` 且 `ORDER BY` 末位非唯一键"告警，
   否则 §3 那类缺陷会持续复发。
5. **启动 Production hardening 阶段**：真实 3 副本集群 + 负载/浸泡/故障注入/备份恢复，
   产出可复现证据；据此设定并接受 SLO/SLA。
6. 支付出网加固（`OutboundDnsResolver` + 生产策略下 HTTPS-only）。

**在 1–2 完成前，不应授予任何外部客户访问。** 完成 1–4 后可达"内部可用 + 小范围可控 beta"；
完成 5 后才具备对外商用条件。

---

## 8. 方法论说明与自查披露

**已执行的验证**（非推断）：5 道门禁实跑；`cargo test -p sdkwork-cloudrouter-database-host` 实跑；
314 个 int64 字段全量脚本扫描；69 处违规全量归类；基线 DDL 与 `materializedTables` 逐项比对；
Mutex 作用域逐处读取确认。

**我推翻过自己的判断**（如实记录）：
1. 初判 `database-host` 的模块顺序测试会因 `ai-metering` 未被 `loadModules` 加载而 FAIL
   → **实跑通过**。根因是我误读了：`:317` 遍历的是**根 manifest 的 `modules`**，而 `ai-metering`
   本来就不在其中。**我的假设错了，不是代码错了。**
2. 初判 `ai_metering_*` 表"被读但无人建"（P0 级）
   → 查根基线后发现 `:357` **确实建了表**，`ai-metering` 目录只是联邦遗留。**降级为 P2。**
3. 初判 69 处 int64 违规是合规缺陷
   → 查 API_SPEC §13.6 后发现存在正式豁免，且 `cloudrouter-open-api.openapi.json:30285`
   **已正确声明**。**改为合规项。**

**未验证 / 存疑（诚实标注）**：
- 常驻生产环境的部署模式变量**实际是否设置**——静态审计无法证明，P0 的可触发性取决于此。
- Portal `ToolApiRateLimiter` 在多副本下是否走 Redis 分布式限流——需运行时拓扑确认。
- `official_pricing_catalog_read_store` 的 `rate_code` 是否被 schema 强制唯一。
- `admin_transaction_center` 等表在高增长分类下 `COUNT(*) OVER()` 的实际影响。
