# Cloud Router 路由架构与数据库重构方案（V2 完整版）

> 目标：**推翻当前冗余混乱的数据库设计**，建立"模型类路由"与"API 资源类路由"两套**统一、清晰、可扩展**的架构。
> 原则：无历史技术债务，打磨到极致。
> 本文档是本次重构的**唯一权威设计蓝本**，代码、契约、数据库、admin 均按此落地。

---

## 〇、实施记录（本次落地更新）

> 本小节随每次实施迭代追加，避免蓝本与实际漂移。

### 2026-08-23 迭代（第三轮：死字段链清理 + 死契约引用清理）
审计确认三处安全可清理的历史债务，已完整清理并回归：
- **`ai_routing_decision_log.policy_id/profile_id/rule_id` 死列 + 恒 None 字段链**：旧路由体系退役后，`invocation.routing.policy_id/rule_id`、`SelectedUpstream{Model,Account}Route.policy_id/rule_id`、`SelectedUpstreamModelRoutePlan`、`InvocationRouteCandidate`、`ResolvedOpenAiUpstreamRoute`、`RoutingDecisionRecordCommand`、route explain 响应 DTO 的 `policyId/ruleId/policySnapshotVersion` 全链路恒为 None/死字段。已从 DB DDL、schema.yaml、SQL recorder、port command、decision_log、route_planning、openai_runtime、admin_route_explain、决策日志 JSON 序列化、及全部 8 个测试文件中移除。
- **backend-api + backend-sdk 三份 OpenAPI 契约的 `ai_routing_policy`/`ai_routing_rule` 死引用**：`route_explain` 端点 `x-read-sources` 与 `description` 仍指向已退役表；`UpstreamAccountGroupRouteExplanationResponse`/`UpstreamRouteExplainCandidate` 契约的 `policyId`/`ruleId`/`policySnapshotVersion` 死字段全部移除。
- **sdkwork-models `RoutingCapability::from_code` 错误文案**：`"ai_routing_policy.capability contains unsupported value"` → `"routing capability contains unsupported value"`。
- **回归**：router-service 375 lib tests + 全部集成 tests 绿；routes/edge-runtime/admin-gateway 绿（仅 2 个预存且与本次无关的失败：payment manifest 能力路由、需真实 PostgreSQL 的 e2e）。

### 2026-08-22 迭代（第二轮：route_kind 断链修复 + catalog 打通）
**核心问题确认（用户指出"route catalog 有问题"属实）：** 上一轮新增的 `ai_resource.route_kind` 是**死字段**——管理面可读不可写、快照不加载、路由决策不消费，仅 `RouteKind::of` 的 fallback 兜底。已按方案 A 全链路打通：
- **管理面写入**（sdkwork-models）：`Create/UpdateAdminAiResourceCommand`、`AiResourceCreate/UpdateRequest`、`normalize_route_kind` 校验、INSERT/UPDATE SQL、响应 `AdminAiResourceItemResponse.route_kind`、管理 API 契约 `AdminAiResourceCreateRequest/UpdateRequest/Item` 均落地 `route_kind`。
- **快照加载**（cloudrouter）：`snapshot.rs` `resource_candidate`→`group/supplier/account_resource_scope`→`matched_resource_scope`→`effective_matched_resource_scope`→`resourceEntitlements` 全链路透传 `route_kind`；`rows.rs` 解析进 `UpstreamResourceEntitlement.route_kind`。
- **路由决策**（cloudrouter）：`UpstreamAccountRouteCatalog::resource_route_kind()` 按 route_key/api_code 归一化匹配资源 entitlement 的持久化 `route_kind`；`RoutingPipeline::plan_route` 前置 `apply_persisted_route_kind()`，资源显式标记 `model`/`api` 时**覆盖运行时按表面推导**，使 `ai_resource.route_kind` 成为路由分类的**权威来源**；2 个新单测（persisted 应用 / explicit 优先）。
- **回归**：router-service lib 376 tests 全绿；`sdkwork-models` catalog-service / contract-service / catalog-repository 编译通过。

### A4 退役完成（2026-08-22 执行）
审计确认 `ai_routing_policy/profile/rule` 三表在**路由排序层已被 `ai_routing_strategy` + 账户组 `routing_strategy_code` 取代**（软依赖，空表回退可用）。退役已完整执行：
- **下线 `app_routing_strategy` 遗留 API + store**（无 OpenAPI 契约、无前端调用、无测试覆盖，是唯一活跃写路径）：删除 `api/app_routing_strategy.rs`、`ports/app_routing_strategy_store.rs`、`postgres/app_routing_strategy_store.rs`，清理 `api/mod.rs`/`ports/mod.rs`/`postgres/mod.rs` 导出与 `routes.rs` 三处装配。
- **移除路由决策对旧表的读取**：snapshot 不再加载 `load_routing_policies`/`load_routing_rules`；rows 移除 `RoutingPolicyRow`/`RoutingRuleRow`；`PricingCatalog` trait 移除 `list_routing_policies`/`list_routing_rules` 及全部实现。
- **selector 只走 group-bound**：移除 `select_policy_scopes`/`select_model_route_plan_from_policy_scope`/`select_account_route_from_policy_scope` 及 `scoped_candidate_chain`/`policy_is_in_scope`/`rule_is_in_scope` 等 policy-scope 分支，`group_bound_account_route_candidates` 成为唯一候选来源（覆盖模型类与 API 类两条链路）。
- **DROP 三表**：baseline DDL 移除 `ai_routing_policy`/`ai_routing_profile`/`ai_routing_rule` 建表语句；`table-registry.json`/`schema.yaml`/`database.manifest.json` 契约同步清理。
- **领域类型清理**：sdkwork-models `domain/routing.rs` 移除 `RoutingPolicy`/`RoutingRule`/`RoutingPolicyScope`/`RoutingFallbackMode`（保留仍被使用的 `RoutingCapability`/`RouteCandidate`/`AiRouteStrategy`）。
- **测试同步**：测试从 policy-scope 语义改为验证 group-bound 语义（`policy_id`/`rule_id` 断言改 None；退役 policy/rule fixture；`product_model_route.rs` 补齐输出/缓存价格使复合计价前置校验通过）。router-service 375+ 集成测试全绿；admin-gateway 全绿；edge-runtime 除依赖真实 PostgreSQL 的环境测试外全绿。

### 2026-08-22 迭代（第一轮：账号级模型黑白名单接线）
**账号级模型黑白名单接线完成（此前为"允许但不实现"的半死状态）：**
- `database/contract/schema.yaml`：`ck_ai_model_access_policy_scope` 增加 `'account'`；baseline DDL 同步。
- 新增迁移 `database/migrations/postgres/0034_model_access_policy_account_scope.up.sql / .down.sql`。
- `services/.../ports/upstream_account_route_catalog.rs`：新增 `AccountModelAccess` 结构 + trait 方法 `account_model_access(account_id)`。
- `services/.../application/invocation/routing_filter.rs`：`ModelAccessFilter` 增加账号级检查，优先级 `account > supplier > group`（任一 deny 即拒绝），并补充 3 个单测。
- `infrastructure/sql/queries/snapshot.rs`：新增 `load_upstream_account_model_access()`（聚合 `ai_model_access_policy scope_type='account'`）。
- `infrastructure/sql/rows.rs` / `catalog.rs` / `postgres/loader.rs` / `row_mapping.rs`：行类型、快照装配、加载/映射全链路。
- `infrastructure/in_memory_pricing_catalog.rs`：`set_account_model_access` + trait 实现。
- **后端 API**：`crates/sdkwork-routes-cloudrouter-backend-api/src/upstream/account.rs` 的 Create/Update 请求与响应 DTO 增加 `modelBlacklist/modelWhitelist`，store 侧 list/get/save 落库到 `ai_model_access_policy`。
- **契约**：`apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json` 三个账号 schema 增加 `modelBlacklist/modelWhitelist`，新增 `UpstreamAccountModelListEntry`。
- ⚠️ 待办：`@sdkwork/cloudrouter-pc-admin-core` SDK 为外部工作区生成，需按新契约**再生成**后在 `accountsPage.tsx` 增加账号级黑白名单编辑 UI（供应商页已有可复用交互）。

---

## 一、现状诊断（已核实的代码事实）

### 1. 数据库 schema 冗余与契约漂移
- `ai_resource` / `ai_resource_group` / `ai_resource_group_item` 三张资源字典表**归属外部 `sdkwork-models` 仓库**，本仓库仅有一张 `ai_resource_binding` 绑定表，资源定义的 `route_kind`（模型类/API类）字段**完全缺失**。
- 资源授权采用 `ai_resource_binding` 单表 + `binding_scope ∈ {supplier, account_group, account}` 区分，但**模型→vendor→supplier→account 的链路没有显式的 `ai_resource` 主表承接**，语义散落在 `InvocationResource` 运行时推导与 SQL 快照里。
- `ai_upstream_account` 遗留大量弱语义字段（`quota_unit`/`quota_limit`/`quota_used`/`upstream_balance_amount`/`contract_cost_multiplier` 等），与计费域职责重叠，形成**字段漂移**。
- ~~模型黑白名单虽已收敛到 `ai_model_access_policy`，但账号级黑名单没有接线~~ → **已修复（2026-08-22）**：`ck_ai_model_access_policy_scope` 放开 `account`，过滤链、SQL 快照、admin API/契约均完成账号级接线（见"〇、实施记录"）。
- `ai_routing_policy` / `ai_routing_profile` / `ai_routing_rule` 三张表仍存在，但新策略体系 `ai_routing_strategy` 已另立——**两套策略表达并存**，语义冲突。

### 2. 路由逻辑核心缺陷
- **模型类路由未走"请求模型 → sdkwork-models SDK 解析支持该模型的 vendor 列表"的行业标准流程**：`route_planning.rs::resolve_catalog_key` 仅用内部 `model_catalog_keys_by_name` 在目录索引 O(1) 解析一个 catalog key，**没有展开为 vendor 列表再收敛 supplier**。
- `RouteKind` 由 `InvocationResource` 在**运行时**从"是否携带模型名 + surface"推导，而不是从**资源管理配置的 `route_kind` 字段**读取——与用户要求的"在资源管理中增加字段"不符，属**半死逻辑**（写与读分离）。
- 路由策略散落在 `routing_strategy_code`（account_group 列）+ `ai_routing_strategy` 表 + 代码注册表三处，**配置入口不统一**。

### 3. admin 前端现状
- 只有 suppliers / accounts / account-groups 三个平铺页面，**资源管理页缺失**，`/admin/model/resources` 由外部 `sdkwork-models` 提供。
- 路由策略内嵌在账号组表单的 `routingStrategy` 下拉，**无独立策略管理**。
- 视觉交互无"资源→供应商→账号→分组"的拓扑关系呈现。

---

## 二、目标架构（用户确认的 9 步双流程）

### A. 模型类路由流程
```
1. uri → 资源（ai_resource.route_kind = model，标记模型类）
2. 解析输入 model → sdkwork-models SDK (find_model_by_vendor_region / list_models_by_capability)
   → 得到支持该模型的 vendor 列表
3. 按调用方式（API key / auth token）→ 账号组列表（授权关系）
4. vendor 列表 + 资源 → upstream supplier 列表（supplier 自持资源）
5. 账号组 id + supplier id → 账号列表
6. 账号过滤：模型黑白名单（supplier 级 + 账号级）→ 统一 ai_model_access_policy
7. 路由策略：默认价格优先（最低价），支持 sticky/价格/质量/响应时间等
   → 策略模式接口，可扩展
8. 选中账号 → upstream 调用 + 计费（默认预扣 prepay，支持后扣 postpay）
9. 返回结果
```

### B. API 资源类路由流程
```
1. uri → 资源（ai_resource.route_kind = api，标记 API 类型）
2. 判定 API 类调用（不走模型解析）
3. 按调用方式（API key / auth token）→ 账号组列表
4. vendor 列表 + 资源 → supplier 列表
5. 账号组 id + supplier id → 账号列表
6. 账号过滤：支持该 API 资源的账号
7. 路由策略（同 A）
8. 账号调用 + 计费（预扣/后扣）
9. 返回结果
```

### C. 统一路由管道
两套流程共享同一管道：`资源解析 → 身份分组 → vendor/supplier 收敛 → 账号加载 → 过滤 → 策略选择 → 调用计费`。**差异仅在"是否先做模型→vendor 解析"**，且**由资源配置的 `route_kind` 显式驱动**，而非运行时猜测。

---

## 三、新数据库 Schema 设计（推翻重来）

### 设计原则
1. **资源驱动**：新增本仓库权威的 `ai_resource` 注册表，显式 `route_kind ∈ {model, api}`。模型/API 分类由**资源配置**决定，运行时读取该字段分流。
2. **收敛冗余**：模型黑白名单彻底统一到 `ai_model_access_policy`（supplier 级 + **account 级一并接线**）；退役 `ai_routing_policy/profile/rule` 三表，只保留 `ai_routing_strategy`。
3. **策略模式落地**：`ai_routing_strategy` 表存策略类型 + JSON 参数，策略由代码注册（trait 模式），DB 只做配置。
4. **计费模式**：`ai_upstream_account.billing_mode ∈ {prepay, postpay}`（默认 prepay），弱语义额度字段收敛。
5. **模型→vendor 解析**：模型解析走 sdkwork-models SDK（`find_model_by_vendor_region` / `list_models_by_capability`），supplier 通过"自持资源"（`ai_resource_binding` binding_scope=supplier）与 vendor 列表收敛。

### 表清单（本仓库权威表）

| 新表 | 替代旧表 | 说明 |
|---|---|---|
| **`ai_resource`（新增）** | 无（原依赖外部） | 资源注册表，`route_kind ∈ {model, api}` 显式标记，承接模型/API 资源定义 |
| `ai_resource_binding`（保留） | 三张旧资源绑定表 | 统一资源授权，`binding_scope ∈ {supplier, account_group, account}` |
| `ai_upstream_supplier`（保留） | 同 | 供应商，自持资源经 `ai_resource_binding` |
| `ai_upstream_account`（保留） | 同 | 增加 `billing_mode`，收敛弱语义额度字段 |
| `ai_upstream_account_group`（保留） | 同 | `routing_strategy_code` 默认 price_first |
| `ai_upstream_account_group_member`（保留） | 同 | 账号组成员 |
| `ai_routing_strategy`（保留） | `ai_routing_policy` / `ai_routing_profile` / `ai_routing_rule` | 唯一策略配置表 |
| `ai_model_access_policy`（保留） | 散落的黑/白名单列 | `scope_type ∈ {supplier, account, account_group}`，**account 级接线** |
| `ai_upstream_supplier_endpoint` / `_health_state` / `_auth_method`（保留） | 同 | 端点/健康/认证 |
| `ai_upstream_account_credential`（保留） | 同 | 凭证 |
| `ai_config_version` / `ai_config_change_event`（保留） | 同 | 刷新协调 |
| `ai_routing_decision_log`（保留改造） | 同 | 决策日志，增加 `route_kind` / `strategy_code` |
| `ai_upstream_object_route`（保留） | 同 | sticky 粘滞路由 |

> 兼容性：迁移采用**新表 + 数据迁移脚本**，旧表（`ai_routing_policy/profile/rule`）一个发行周期内退役后删除。所有下游代码、SDK、admin 同步更新。

---

## 四、路由逻辑实现设计（Rust）

### 1. 统一管道（`routing_pipeline`）
```
RouteContext { resource(route_kind), identity, model?, vendor_list?, group_ids }
  → ResourceResolver（uri → ai_resource，读取 route_kind 判定模型/API）
  → ModelVendorResolver（仅 model 类：sdkwork-models SDK → vendor 列表）
  → GroupResolver（API key / auth token → account_group_ids）
  → SupplierResolver（vendor + resource → supplier 列表，走 ai_resource_binding）
  → AccountLoader（group_ids + supplier_ids → 账号）
  → AccessFilter（模型黑白名单 / API 资源支持）
  → StrategySelector（策略模式，选账号）
  → InvocationAndBilling（调用 + 计费 prepay/postpay）
```

### 2. 策略模式接口（已落地，`route_strategy.rs`）
```rust
pub trait RoutingStrategy: Send + Sync {
    fn code(&self) -> &'static str;
    fn select(&self, candidates: &[RouteCandidate], ctx: &SelectionContext) -> SelectionResult;
}
// 内置：PriceFirst(默认) / Sticky / QualityFirst / LatencyFirst / Weighted / RoundRobin
// 注册表：RoutingStrategyRegistry（HashMap<code, Box<dyn RoutingStrategy>>）
// 新增策略 = 实现 trait + 注册，不改任何调用方
```

### 3. 计费模式
```rust
pub enum AccountBillingMode { Prepay, Postpay }  // 默认 Prepay
// Prepay：调用前冻结估算金额，成功后结算差额，失败释放
// Postpay：调用后按真实用量结算
```

---

## 五、admin 前端重构方案

### 功能重构
1. **资源管理** `/admin/resources`：统一管理资源，显式字段"路由类型：模型类 / API 类"，模型类资源可配置模型→vendor 关系。
2. **供应商管理**：自持资源绑定（复用 `ai_resource_binding`）。
3. **账号管理**：计费方式（预扣/后扣）、账号级模型黑白名单。
4. **账号组管理**：路由策略选择（价格优先等）、模型访问策略。
5. **路由策略管理** `/admin/routing-strategies`：可视化配置策略参数。
6. **决策日志** `/admin/record`：展示 route_kind + strategy_code + 决策原因。

### 视觉交互重构
- 统一设计令牌（Tailwind + 深/浅色主题，lobster 主色）。
- 卡片式"资源→供应商→账号→分组"关系拓扑图。
- 级联表单：选 vendor 自动带出协议/端点/资源。

---

## 六、分阶段实施计划与进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 | 本设计文档定稿 | ✅ 本文档 |
| P2 | 数据库：`ai_model_access_policy.scope_type` 放开 `account`（schema.yaml + baseline DDL + 迁移 0034） | ✅ 2026-08-22 |
| P2b | 数据库：`ai_resource` 权威注册表 + `route_kind`（跨 sdkwork-models 工作区，需外部 schema 同步） | ⏳ 依赖外部工作区 |
| P3 | Rust：`model_vendor_codes_by_name` 模型→vendor 解析（`route_planning.rs` 已接线） + 账号级黑名单过滤链 + 单测 | ✅ 2026-08-22（vendor 解析存量已存在，账号级黑名单本次补齐） |
| P4 | 后端 API：账号 Create/Update/Response DTO + store 落库 model access；契约三 schema + `UpstreamAccountModelListEntry` | ✅ 2026-08-22 |
| P4b | 后端 API：资源目录 `routeKind` 透出（依赖 P2b 的 `ai_resource`） | ⏳ 随 P2b |
| P5 | admin 前端：供应商页模型黑白名单编辑（存量已有）；账号页账号级黑白名单编辑 | ⏳ 需 SDK 再生成（`@sdkwork/cloudrouter-pc-admin-core`）后实施 |
| P6 | 数据迁移 + 旧表（`ai_routing_policy/profile/rule`）退役 + 全量回归 | ⏳ |

### 验证命令
- Schema：`python -B -m tools.schema_compiler --dialect postgres --materialize`
- Rust：`cargo test -p sdkwork-cloudrouter-router-service`
- 前端：`pnpm --filter @sdkwork/cloudrouter-pc-admin-upstream typecheck`
