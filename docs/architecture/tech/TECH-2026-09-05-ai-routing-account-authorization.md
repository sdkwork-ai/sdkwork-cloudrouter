# CloudRouter AI 路由与账号授权逻辑全景

- 日期：2026-09-05
- 状态：现行架构梳理 + 问题清单 + 改进方案
- 适用面：`sdkwork-cloudrouter-router-service`、`sdkwork-cloudrouter-edge-runtime`、`data/ai-routing/**`
- 关联文档：`TECH-2026-05-10-group-account-pool-routing.md`（历史分组池路由）、`TECH-2026-05-29-ai-routing-sticky-cache.md`（sticky 缓存）

---

## 1. 背景与范围

本文梳理"一次请求从进入网关到落到具体上游账号"的完整判定链，覆盖三个层次：

1. **资源层**：`ai_resource` 资源目录（vendor / modality / api_endpoint 三类资源）与 `ai_resource_group` 资源分组；
2. **授权层**：`ai_resource_binding` 把资源/资源组绑定到供应商、账号组、账号三个作用域，快照 SQL 推导出每个「账号 × 账号组」的 `apiScope`；
3. **执行层**：`RoutingPipeline` → `UpstreamRouteSelector` 从内存快照目录中选出最终账号。

典型案例（本文问题清单的动机）：Playground 走 `/anthropic/v1/messages`（DeepSeek 账号、Claude Code 协议）报 50301/50201 "no upstream account routes are configured"，根因是三层缺口叠加（见 §11 案例）。

---

## 2. 分层总览

```text
入站 URL
  │
  ├─ OpenAI 兼容面  /v1/*                    → InvocationPipeline（模型类路由为主）
  └─ ProviderNative 面 /{vendor}/{*path}     → edge-runtime passthrough（15 个 vendor 前缀）
        │  （vendor 前缀即 supplier_code，剥前缀后转内部网关调用）
        ▼
协议/资源分类（provider_native_classifier.rs）
  │  path → api_code（内置路由表，硬编码）
  │  fallback：未知 path → {supplier}.{endpoint} + Network + StatelessFailClosed
  ▼
RouteKind 判定（routing_pipeline.rs）
  │  ProviderNative ⇒ Api；OpenAI 面按"是否要求模型且携带模型名"分流
  │  ai_resource.route_kind 显式标记可覆盖推导
  ▼
┌─ RouteKind::Model ──────────────┐   ┌─ RouteKind::Api ────────────────┐
│ model → catalog_key → vendor 列表│   │ route_key / api_code 直查       │
│ select_model_route_plan         │   │ select_account_route            │
└────────────┬────────────────────┘   └────────────┬────────────────────┘
             ▼                                     ▼
       UpstreamRouteSelector（内存快照目录，所有门按序过滤）
             │  ① API key 的 route 角色组绑定（可多组逐组尝试）
             │  ② 组内账号过滤：apiScope 匹配 + capability 匹配
             │  ③ resourceEntitlements 门（fail-closed）
             │  ④ 可调用门：base_url + 凭证 + 健康
             │  ⑤ 策略排序：priority / weight / region 变体 / sticky
             ▼
       最终账号 + failover 序列（InvocationRoutePlan）
             ▼
       计费 preflight（fail-closed）→ 上游转发 → 用量结算
```

---

## 3. 数据模型与表清单

| 表 | 职责 | 关键列 |
|---|---|---|
| `ai_resource` | 资源目录（单一真源 `data/ai-routing/**`） | `resource_code`(唯一)、`resource_type`、`route_kind`、`vendor_code`、`modality_code`、`api_code`、`catalog_key`、`model`、`provider_native_model` |
| `ai_resource_group` | 资源分组 | `group_code`、`group_type`、`primary_resource_group_code` |
| `ai_resource_group_item` | 组成员（资源或子组，子组递归展开 ≤8 层） | `resource_code` / `child_resource_group_code`（NOT NULL，资源项传 `''`） |
| `ai_resource_binding` | 授权绑定（本模型的核心） | `binding_scope`(`supplier`/`account_group`/`account`)、`grant_type`(`allow`/`deny`)、`resource_code`/`resource_group_code`、作用域 id、生效窗口 |
| `ai_upstream_supplier` | 供应商 | `supplier_code`、`protocol_code`、`default_base_url`、`protocols` |
| `ai_upstream_supplier_endpoint` | 供应商端点 | `base_url`、`priority`、`routing_weight` |
| `ai_upstream_supplier_auth_method` | 供应商认证方式 | `auth_method_code`、`auth_type`、`runtime_auth_config` |
| `ai_upstream_account` | 上游账号 | `account_code`、`region_code`、`billing_mode`、`preferred_endpoint_id` |
| `ai_upstream_account_credential` | 账号凭证 | `secret_ciphertext`、`is_active`、`expires_at`、版本 |
| `ai_upstream_account_health_state` / `..._endpoint_health_state` | 健康 | `health_status`(0 未知/1 健康/2 恢复窗/其余剔除) |
| `ai_upstream_account_group` | 账号组 | `group_code`、`group_type`(llm/image/.../mixed)、`routing_strategy`、`fallback_mode`、成本/售价倍率 |
| `ai_upstream_account_group_member` | 账号组成员 | `account_id`、`priority`、`routing_weight`、`enabled`、生效窗口（成员关系本身不携带资源授权） |
| `iam_gateway_api_key` + `iam_gateway_api_key_account_group` | API key → 账号组绑定 | `binding_role`(仅 `route` 参与路由)、`routing_strategy`、`priority`/`weight`、生效窗口 |
| `ai_model` / `ai_model_capability` | 模型目录 | `catalog_key`、`vendor_code`、`api_format`、能力 |

快照加载：`PricingCatalogSql::snapshot_load_queries()` 一次性拉取以上数据构建内存目录（`InMemoryPricingCatalog`），路由全链路只读内存，不查库。管理面变更后依赖快照刷新生效。

**作用域解析优先级**（资源/资源组均适用）：绑定 subject 的 (tenant, organization) 精确匹配 > 同租户 organization=0 > 全局 (0,0)。`ROW_NUMBER` 取 rank=1，避免同名组/同码资源被低优先级副本污染。

---

## 4. 资源目录（64 项，真源 `data/ai-routing/resources/`）

### 4.1 core-resources（16 项）—— vendor 与 modality 骨架

- `vendor.*`（9）：openai、openai_compatible、anthropic、gemini、kling、jimeng、volcengine、vidu、minimax
- `modality.*`（7）：llm、image、audio、music、video、embedding、network

### 4.2 openai-resources（26 项）—— OpenAI 兼容协议面

`api.openai.responses / chat_completions / conversations / completions / embeddings / images(3 个细分) / audio(4 个细分) / files / uploads / batches / realtime / videos / models / moderations / assistants / threads / vector_stores / codex / chatkit.sessions / containers`

注意：`api.openai.images` 与 `api.openai.images.generations` 是同 pathTemplate 的父子两层（分类器只产出其中一种 api_code 时，另一层靠交集匹配规则兜底）。

### 4.3 vendor-native-resources（22 项）—— 厂商原生协议面

| vendor | api_code | path |
|---|---|---|
| anthropic | `anthropic.claude_code` / `anthropic.messages` | `/v1/claude/code`、`/v1/messages` |
| gemini | `generate_content` / `stream_generate_content` / `embed_content` / `live` / `image_generation` / `nano_banana.image_generation` / `video_generation` | `/v1beta/models/{model}:*` |
| kling | `text_to_video` / `image_to_video` / `image_generation` / `task_query` | `/v1/videos/*`、`/v1/images/generations` |
| jimeng | `image_generation` / `video_generation` / `task_query` | `/v1/*` |
| volcengine | `image_generation` / `video_generation` / `task_query` | `/v1/*` |
| minimax | `music_generation` | `/v1/music_generation`（3 种 path 变体归一） |
| vidu | `reference_to_image` / `start_end_to_video` | `/ent/v2/*` |

## 5. 资源组清单（32 组，真源 `data/ai-routing/resource-groups/`）

- **admin-api-groups（20 组）**：`api.all`（48 项伞组）、`api.openai_compatible.all`、`api.openai.{codex,chat,image,audio,embeddings}`、`api.claude.code`（`anthropic.claude_code` + `anthropic.messages`）、`api.google.all`、`api.google.{image,video}`、`api.kling.{all,image,video}`、`api.minimax.music`、`api.volcengine.{image,video}`、`api.vidu.{image,video}`
- **official-provider-groups（8 组）**：每个 vendor 一个 `official.*` 组，成员 = `vendor.X` + 该 vendor 全部 api_endpoint
- **relay-provider-groups（4 组）**：`relay.openai_compatible.{llm,chat,media}`、`relay.cn.visual_generation`

---

## 6. 授权模型与 apiScope 推导（快照 SQL 六层）

`load_upstream_account_routes()`（`queries/snapshot.rs`）用一条 CTE 链推导每个「账号 × 账号组」的最终授权：

```text
active_routing_resource_binding          生效绑定（scope/窗口/status 过滤；兼容旧 resource_group_id 分支）
  → routing_scope_owner + resource_group_candidate + effective_resource_group
                                          引用到的资源组按"租户组织 > 租户级 > 全局"取唯一副本
  → routing_group_binding                绑定 → 组引用落定（group_code 兜底 resource_code）
  → resource_group_tree (递归, depth<8)  子组展开成扁平 resource 引用集合
  → resource_candidate                   每条引用解析为 ai_resource 行（三作用域取 rank=1）
  → group_resource_scope / supplier_resource_scope / account_resource_scope
                                          三个 binding_scope 各自成集合：allow 减去 deny
  → matched_resource_scope               ★ 组 ∩ 供应商（INNER JOIN，5 种匹配规则）
  → effective_matched_resource_scope     ★ 再 ∩ 账号（有账号级绑定才参与；无绑定直接继承）
```

**交集匹配规则（matched_resource_scope 的 5 个 OR 分支，账号级复用同一套）**：

1. `resource_code` 完全相等；
2. `catalog_key` 相等（api_code 允许任一侧为空）；
3. `api_code` 相等，且至少一侧 `resource_type='api_endpoint'`；
4. `vendor_code` 相等，且至少一侧 `resource_type='vendor'`；
5. `modality_code` 相等，且至少一侧 `resource_type='modality'`。

**输出三元组**（挂在每个账号组绑定上）：

- `apiScope`：`effective_matched_resource_scope` 全部非空 `api_code` 的有序集合；**账号有任意账号级资源绑定但与组∩供应商无交集时输出哨兵 `["__deny__"]`（全拒）**；
- `capabilities`：由交集资源派生的能力码（llm/image/video/... + 原始 api_code/modality）；
- `resourceEntitlements`：交集资源的结构化明细（resourceCode/type/vendor/modality/apiCode/catalogKey/model/providerNativeModel），`resourceEntitlements=null` 表示"该账号无任何账号级绑定 → 不按 entitlements 收敛"。

**运行时 apiScope 匹配**（`upstream_route_selector.rs::api_scope_value_matches_key`）：归一化（小写、`/:-` → `.`、剥 `api.` 前缀）后，`*`/`all`/相等/任一方向点分段前缀 均算命中；`apiScope` 为空 = 不限。

---

## 7. 请求 → 账号完整判定链

### 7.1 入口面

| 面 | URL 形态 | 入口代码 | supplier_code 来源 |
|---|---|---|---|
| ProviderNative | `/{vendor}/{*path}`（15 个前缀：openai、google、anthropic、volcengine、tencent-cloud、tencent-hunyuan、alicloud、aliyun、minimax、suno、elevenlabs、midjourney、kling、vidu、nano-banana） | `edge-runtime/passthrough.rs`（**`/provider/` 别名已移除**，vendor 前缀是唯一标准面） | URL 前缀 vendor（`split_provider_passthrough_path` 剥前缀） |
| OpenAI 兼容 | `/v1/*` | InvocationPipeline catch-all | 按模型目录 vendor |

内部编排（Playground/agent chat）不直接打 ProviderNative 面，而是由 `app_runtime.rs::runtime_gateway_api` 用信号串 `runtime endpoint provider api_format vendor`（**模型目录的 api_format/vendor 参与信号，与账号实际 vendor 无关**）选 `RuntimeGatewayApi`，再以内部网关路径（如 `/anthropic/v1/messages`）走同一 passthrough 链。

### 7.2 分类（ProviderNativeResourceClassifier）

`path → api_code` 为 Rust 硬编码内置路由表（`provider_native_api_code_from_standard_path`），命中后叠加 `find_builtin_ai_route` 的 meter/strategy/sticky/failure_strategy；未命中走 fallback：`{supplier}.{endpoint_key}` + `Network` + `StatelessFailClosed`（fail-closed，无计费 meter）。

### 7.3 账号选择（`select_account_route`，按序六道门）

1. **组上下文展开**：API key 的全部 `binding_role='route'` 组绑定逐组尝试；某组返回 `PricingUnavailable` 不短路，留作最终错误兜底（防止一个组的价目缺口拖死整个请求）；组不存在/跨租户直接跳过。
2. **组内账号收敛**：`account_group_bindings` 过滤 —— 组 id 相等 && apiScope 命中（空 scope=全通过）&& capability 命中（capabilities 空=全通过）。
3. **resourceEntitlements 门**（fail-closed）：`resourceEntitlements` 为 null → 不收敛；非 null → 至少一条 entitlement 约束命中。**API 请求路径上，携带 catalog_key/model/provider_native_model 的 model-scoped entitlement 永不命中**（无模型可验证，直接拒绝）。
4. **可调用门**：`base_url`（端点 > 账号默认 > 供应商默认/协议 URL 解析链）+ 凭证（secret_ref 或 auth_profile headers）+ 账号健康（0/1 放行，2 在恢复窗内放行）。
5. **策略排序与 failover**：binding `priority` ASC / `routing_weight` DESC / region 偏好变体优先；组 `routing_strategy` 与 key 级 binding strategy 覆盖；`fallback_mode` 截断 failover 序列。
6. **sticky 优先**：会话/请求级 sticky 绑定先于常规规划，但须通过可调用 + 组归属 + 模型黑白名单 + 定价 + 会话模型一致性五重校验，任一失效回退常规规划。

模型类路径额外有 `ensure_route_is_priced` 预检（composite 计费要求 input/output 价齐备，cache 可缺）；API 类路径的定价把关在计费 preflight（fail-closed → 503 pricing_unavailable）。

---

## 8. 默认种子拓扑（`ai_routing_seed.rs`）

- **默认账号**：仅 1 个 —— `openai-default`（supplier=openai, official, `https://api.openai.com/v1`，初始 disabled）。
- **默认账号组**：`default-group`（mixed，绑定 `openai-default`，primary grant = `official.openai.full`）。**is_default 组额外追加 `DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES = ["api.claude.code"]`**（本次修复落地）。
- **供应商侧绑定**：种子给默认供应商写 `binding_scope='supplier'` 的 grant（当前硬编码 `official.openai.full`，见问题 P2-3）。
- **vendor → 组绑定表**：`VENDOR_RESOURCE_GROUP_BINDINGS`（9 行）声明"每个 vendor 的默认账号组应授哪个资源组"，供管理面按协议创建组时对齐（前端 `PROTOCOL_RESOURCE_GROUPS` 同源）。
- **自愈机制**：种子幂等 upsert（`ON CONFLICT(tenant,org,code)`），完整度检查用 subset/count —— 目录新增资源会把存量安装推到 `UpgradeRequired`，由升级流程补数据。

---

## 9. 诊断工具现状

| 工具 | 覆盖 | 缺口 |
|---|---|---|
| `diagnose_upstream_route_gates`（snapshot.rs） | 6 道配置门计数：supplier→account→auth_method→credential→group_member→base_url（累进式） | **不含 resource-scope（apiScope 交集）门** —— 50201 的真正卡点恰在此层 |
| `admin_route_explain`（admin API） | 按输入 api_code/model/api_key 解释候选与 blocked_reasons | 未直报"是哪一层交集把资源交集掉了" |
| `log_rejected_group_account` | 逐账号输出被拒原因（健康/凭证/base_url/模型/资源） | 只在 selector 内部，需要开日志才可见 |

---

## 10. 问题清单

### P0（已在本轮修复，记录在案）
1. **资源目录缺 `api.anthropic.messages`**：分类器能产出的 api_code 在目录不存在，任何授权都无法覆盖 → 已补（commit `53150787`）。
2. **默认混合组只授 `official.openai.full`**：组∩供应商交集把所有 anthropic 形状资源交集掉 → 已补 `api.claude.code` 授权（commit `7aee3c4d`）。
3. **`/provider/` 别名双轨**：与 vendor 前缀标准面重复 → 已移除（commit `aa9e0d59`）。

### P1（结构性风险，建议排期）
4. **「组∩供应商」INNER JOIN 语义对扩展不友好（核心结构性问题）**：每当出现新的 vendor 原生协议（`anthropic.messages` 只是第一个），**所有已存在的混合账号组都会默认失配**，必须逐组逐协议打补丁授权。50201 的复发性几乎必然。
5. **api_code 双真源**：分类器内置路由表（Rust match）与 `ai_resource` 目录（JSON）各自维护 api_code/path/meter，无一致性闸门。目录漏项不会在 CI 暴露，只在运行时以 50201 形式爆发。
6. **`diagnose_upstream_route_gates` 不覆盖资源交集门**：诊断输出会停留在 "6/6 gates 通过 + 0 routes"，误导排障方向（先查凭证、再查健康，最后才发现是 scope 交集）。
7. **apiScope 双向前缀匹配过宽**：`scope.starts_with(key + ".")` 使窄 key（如 `openai`）命中宽 scope（`openai.images.generations`）以外的场景，同时宽 scope（`openai.images`）也命中窄 key（`openai.images.generations`）——粒度可能比管理员在 UI 上看到的组定义更宽，且无文档说明。
8. **50201 外包装误导性 hint**：50301 包装层曾附加"上游账号凭证被拒绝（401）"提示，与 no-routes 实因无关，直接把排障引向凭证（本次用户即被误导）。

### P2（可维护性/健壮性）
9. **种子供应商侧绑定硬编码 `official.openai.full`**（`ai_routing_seed.rs` L1218）：当前只有一个 openai 账号故无害，但字面量未走 `VENDOR_RESOURCE_GROUP_BINDINGS`，未来往种子加第二个供应商账号时会静默错绑。
10. **悬空绑定静默丢弃**：binding 引用不存在的资源组/资源时，CTE 的 JOIN 直接过滤，无任何告警；管理员删组后遗留绑定不可见。
11. **`__deny__` 哨兵语义文档缺失**：账号级绑定"存在但无交集"→全拒，是三重交集（组∩供应商∩账号）的隐式语义，管理界面无提示。
12. **同 pathTemplate 父子资源并存**（`api.openai.images` vs `api.openai.images.generations`）：交集靠 api_code 相等匹配，授权粒度取决于管理员选了哪一层，容易漏授或过度授权。

---

## 11. 案例复盘：Playground /anthropic/v1/messages 50201

```text
执行器：模型 vendor=deepseek → 信号含 deepseek? 否 → api_format/协议信号选 AnthropicMessages
        （内部路径 /anthropic/v1/messages，api_code = anthropic.messages）
分类：  anthropic.messages ✓（内置路由表有）
目录：  ai_resource 无 api.anthropic.messages ✗（P0-1）
授权：  default-group 只授 official.openai.full（27 项全 openai.*）
        × 供应商侧 anthropic 形状资源 → api_endpoint/api_code 不等 → 交集为空 ✗（P0-2）
选择：  apiScope 不含 anthropic.messages → 无候选 → 50201
```

三层缺口必须同时修复；修复后 apiScope 由 20 项（无 anthropic）扩为 22 项（含 `anthropic.messages`/`anthropic.claude_code`），实测事务内验证（ROLLBACK）+ 落库验证通过。

---

## 12. 改进方案

### 方案 A（对应 P1-4，推荐优先做）：混合组的 vendor 骨架授权
把 `default-group` 的授权从「逐协议 api_endpoint 补丁」改为「vendor 骨架」：给 mixed/default 组追加全部 `vendor.*` 资源（或 `VENDOR_RESOURCE_GROUP_BINDINGS` 派生的 official 组全集）。交集规则第 4 条（vendor_code 相等 + 一侧 `resource_type='vendor'`）会让组内账号天然覆盖所有厂商原生面，新协议上线零补丁。
- 代价：组内账号对全部 vendor 原生接口可见 —— 对 `group_type='mixed'` 语义合理；若需收敛再配合 deny 绑定。
- 落点：`DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES` 换成/并入 vendor 骨架清单 + 前端组编辑器提示。

### 方案 B（对应 P1-5）：分类器 ↔ 目录一致性闸门
1. 新增契约测试：枚举 `provider_native_api_code_from_standard_path` 的全部产出 api_code（含 fallback 除外），断言每个都存在于 `ai_resource` 种子目录且 `resource_type='api_endpoint'`、`route_kind` 一致；
2. 中期把内置路由表的 path/meter 元数据迁到目录 JSON，Rust 侧只留匹配逻辑，单真源。

### 方案 C（对应 P1-6/P1-8）：诊断与错误语义对齐
1. `diagnose_upstream_route_gates` 追加资源交集门计数：`group_scope_resources` / `supplier_scope_resources` / `matched_scope_rows`（按 (group, supplier) 聚合），让 50201 的 gate 诊断直接显示"交集为空"；
2. 50301 包装层按 `failedStage`/内部错误分类映射 hint：`no_upstream_account_routes` 不得再附带 401 凭证提示；
3. `admin_route_explain` 增加 `scopeTrace`：列出该 (api_key, api_code) 在组/供应商/账号三层的命中与被剔除明细。

### 方案 D（对应 P1-7）：apiScope 匹配语义收紧 + 文档化
- 明确"父 scope 覆盖子资源"为单向语义（`scope=openai.images` 命中 key `openai.images.generations`，反向不命中），删除 `scope.starts_with(key.)` 分支；或至少在管理面 UI 上预演命中集合。
- 若担心兼容性，先加 tracing 观测反向命中的实际流量，再决定移除。

### 方案 E（对应 P2-9/P2-10）
- 种子供应商侧绑定改为 `VENDOR_RESOURCE_GROUP_BINDINGS[supplier.vendor]` 派生，删除硬编码字面量；
- 加启动期/种子期校验：所有 `ai_resource_binding.resource_group_code` 必须能解析到有效组，否则打 WARN（或纳入完整度检查推 `UpgradeRequired`）。

### 优先级建议
`方案 A`（消除 50201 复发）> `方案 B`（防目录漏项复发）> `方案 C`（排障提效）> `方案 D` > `方案 E`。
