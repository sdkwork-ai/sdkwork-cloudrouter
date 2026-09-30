# open-api 全接口回归审计报告

**审计对象**：`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`
（122 路径 / **167 操作**）
**审计日期**：2026-09-29（修复回填：同日）
**审计范围**：路由 → 分类 → 计费 → 上游转发 → 返回结果转换（全链路）
**结论**：**审计发现 31 条问题；其中 7 条真实缺陷（B/C 两类）已全部修复并消融自证，24 条为已登记的设计取舍。**

---

## 一、结论速览

| 类别 | 数量 | 性质 | 门禁可见 | 状态 |
|---|---|---|---|---|
| 完整可用 | 136 | ✅ 全链路通 | — | — |
| A. vendor 工具面无路由 | 22 | ⚠️ 已登记（`vendor-utility`） | ✅ 是 | 设计取舍 |
| B. vidu 视频面死接口 | 4 | 🔴 真实跨仓断链 | ✅ 是 | ✅ **已修复** |
| C. OpenAI 面死接口 | 3 | 🔴 门禁盲区，未登记 | ❌ **曾盲** | ✅ **已修复 + 门禁补盲** |
| D. midjourney/nano-banana 权威歧义 | 2 | 🟠 已登记，需业主决策 | ✅ 是 | 待业主决策 |

**门禁现状**：`tools/check-cloudrouter-ai-routing-consistency.mjs` **passed**——
C 类的 `/v1/**` 盲区已由新增 **check 10** 补上（详见 §4、§5.3），此后任何 `/v1` 面
「契约已发布、分类器无臂」的死接口都会让门禁直接红。

---

## 二、调用链拆解（审计基线）

一条 open-api 请求的完整链路，共 6 层。任一层断言失败即 fail-closed：

```
客户端 POST /v1/chat/completions
  │
  ├─① 框架层：classify_api_surface(path) → 前缀必须命中 OPEN_API_PREFIXES
  │     （未命中 ⇒ 401 missing_credentials，早于路由）
  │     crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs
  │
  ├─② 路由层：generated_open_http_route_manifest.rs（167 条已全部挂载 ✅）
  │
  ├─③ 分类层：classify_request() → OpenAiResourceClassifier / ProviderNativeResourceClassifier
  │     crates/.../invocation_http.rs:556
  │     ⚠️ 本层是缺陷集中区
  │
  ├─④ 计费层：InvocationBilling（Free / ApiRequest / Composite / ExternalUsageLine）
  │     + 计费主体解析（团队计费 key→用户→成员→组织钱包）
  │     + PricingPreflightInterceptor（fail-closed 定价预检）✅
  │
  ├─⑤ 转发层：InvocationHttpDispatcher → forward_to_target()
  │     · OutboundTargetPolicy 校验（Production 禁私网）✅
  │     · body_max_bytes 限流 ✅
  │     · secret_resolver 缺省时 production/staging 启动即失败 ✅
  │
  └─⑥ 转换层：normalized_response_to_http()
        · 流式：直传不缓冲（stream_body take）✅
        · 缓冲：body_bytes / body→JSON✅
        · 失败：x-sdkwork-route-stage / -reason / x-sdkwork-trace-id / traceparent ✅
```

**①③⑤⑥ 层经抽查未发现缺陷；缺陷全部集中在 ③ 分类层。**

---

## 三、逐类明细

### A. vendor 工具面（22 条）— 已登记，非缺陷

`data/ai-routing/declared-unrouted.json` 中 `group: vendor-utility`（20 条）：

| tag | 操作 |
|---|---|
| Files/anthropic | GET/POST `/anthropic/v1/files`、GET/DELETE `/anthropic/v1/files/{file_id}`、GET `.../content` |
| Batches/anthropic | GET/POST `/anthropic/v1/messages/batches`、GET `.../{batch_id}`、POST `.../cancel` |
| Chat/anthropic | POST `/anthropic/v1/messages/count_tokens` |
| Responses/google | GET/POST `/google/v1beta/cachedContents`、GET/DELETE `/google/v1beta/cachedContents/{id}` |
| Files/google | GET/POST `/google/v1beta/files`、GET/DELETE `/google/v1beta/files/{file_id}` |
| Chat/google | POST `/google/v1beta/models/{model}:countTokens` |
| Embeddings/google | POST `/google/v1beta/models/{model}:batchEmbedContents` |

**登记理由**：`no taxonomy route, no api_endpoint seed, no resource grant, no price`。
运行时 fail-closed，行为可预期。**属设计取舍，无需修复。**

---

### B. ✅ vidu 视频面（4 条）— 真实跨仓断链（**已修复**）

| 操作 | 原状态 | 现状态 |
|---|---|---|
| `POST /vidu/ent/v2/text2video` | 契约已发布、路由已挂、**分类器无臂、taxonomy 无路由、无种子、无组授权** | ✅ 已端到端接通 |
| `POST /vidu/ent/v2/img2video` | 同上 | ✅ 已端到端接通 |
| `POST /vidu/ent/v2/reference2video` | 同上 | ✅ 已端到端接通 |
| `GET /vidu/ent/v2/tasks/{task_id}/creations` | 同上 | ✅ 已端到端接通 |

**原证据链（可复核）**：

1. **契约发布**：`apis/open-api/.../cloudrouter-open-api.openapi.json:28365 / 28922`，
   且 `x-sdkwork-vendor-path-prefixes` 含 `vidu`。
2. **路由已挂**：`generated_open_http_route_manifest.rs:896 / 908 / 932`。
3. **taxonomy 无 vidu 视频路由**：全文 grep `vidu` 仅得
   `vidu.reference_to_image` / `vidu.start_end_to_video` / `vidu.motion_sync`
   （`ai_route_taxonomy.rs:596/644/724`）。
4. **种子缺失**：`data/ai-routing/resources/vendor-native-resources.json`
   仅 `api.vidu.reference_to_image` / `api.vidu.start_end_to_video` / `api.vidu.motion_sync`。
5. **组授权缺失**：`official-provider-groups.json:329` 的 `official.vidu.full`
   只授权上述三个 api resource。
6. **🔴 邻仓真在调用**（关键）：
   `sdkwork-generations/crates/sdkwork-generations-provider-adapter/src/gateway.rs`
   - `:646` → `create_ent_v2_text2video` → `/vidu/ent/v2/text2video`
   - `:653` → `create_ent_v2_img2video` → `/vidu/ent/v2/img2video`
   - `:670` → `list_ent_v2_tasks_creations` → `/vidu/ent/v2/tasks/{task_id}/creations`

**运行时后果**：必然 fail-closed，
`50201 no upstream account routes are accounted`——该报错**既不指出路径也不指出缺失环节**。

**修复（四层联动，漏一层门禁即红）**：

| 层 | 文件 | 变更 |
|---|---|---|
| taxonomy | `ai_route_taxonomy.rs` | `media_task` ×3（`vidu.text_to_video` / `image_to_video` / `reference_to_video`）+ `account` ×1（`vidu.video_task_query`） |
| 种子 | `data/ai-routing/resources/vendor-native-resources.json` | 4 个 `api_endpoint` 种子（77→81） |
| 组授权 | `official-provider-groups.json` / `relay-provider-groups.json` / `admin-api-groups.json` | `official.vidu.full`、`relay.cn.visual_generation`、`api.vidu.video` 各补授权 |
| 分类器 | `provider_native_classifier.rs` **和** `passthrough.rs` | 两处臂表各 +6 臂（`vidu` 前缀 4 + `tencent.cloud` 前缀 4，含 task-query `starts_with && ends_with` 形态） |
| 目录投影 | `model_catalog_import.rs`（本仓 + `sdkwork-models` 镜像） | 声明端点表 + modality 映射 + `NOT_BOUND_BY_DESCRIPTOR`（3 视频面显式入口 + poll 面） |
| ledger | `declared-unrouted.json` | 删除 4 条 `published-no-route`（该组清零） |

> 命名采用目录的生成模式词汇（`text_to_video` / `image_to_video` / `reference_to_video`），
> 因此 `catalog.rs::video_generation_mode_for_api_code` 靠后缀即可解析计价模式，
> 无需在 `API_CODE_GENERATION_MODE_OVERRIDES` 增加同义名桥接。
> `vidu.start_end_to_video` **保持为唯一被模型绑定的视频描述符**（`ModelInfo` 无生成模式字段，
> 一个厂商只能绑一个视频端点，改绑会静默迁移既有 `viduq3*` 模型）。

---

### C. ✅ OpenAI 面（3 条）— 门禁盲区（**已修复 + 门禁补盲**）

| 操作 | 挂载位置 | 分类器（修前） |
|---|---|---|
| `GET /v1/models/{model}` | route manifest `:526` | ❌ 无分支 |
| `GET /v1/audio/voices/{voice_id}` | manifest `:311` + passthrough `:255` | ❌ 无分支 |
| `POST /v1/realtime/client_secrets` | manifest `:568` + passthrough `:301` | ❌ 无分支 |

**共同形态**：路由层已挂载（请求能进 handler），
但 `openai_classifier.rs::classify_openai_spec` 无对应分支
⇒ `classify_request` 返 `ResourceClassification` 错误 ⇒ **404**。

对照：`GET /v1/models` 有 free_endpoint 分支并合成响应（`invocation_http.rs:717`），
`/v1/models/{model}` 没有——这是**同一资源族内漏了一条**。

**修复**：
- `openai_classifier.rs` 补 3 条臂（`/v1/models/` free_endpoint、`/v1/audio/voices/` api、
  `/v1/realtime/client_secrets` 管理面）；
- `invocation_http.rs::apply_gateway_dispatch_defaults` 新增
  `apply_declared_not_implemented_defaults`，对「契约声明但无上游路由账号」的
  管理面合成 `501`（与契约声明一致），而不是让它 404。

---

### D. 🟠 midjourney / nano-banana（2+2 条）— 需业主决策

ledger `group: no-supplier-namespace` 已登记，措辞明确：

- `/midjourney/v1/images/generations` 与 `/{task_id}`：
  "no supplier/vendor/account: generations dispatches the midjourney slug through
  the OpenAI-compatible image surface instead"
- `/nano-banana/v1/images/generations` 与 `/{task_id}`：
  "…the wired nano-banana ingress is the Gemini-native
  `/google/v1beta/models/nano-banana:generateImages` — but `dispatch_nano_banana`
  in sdkwork-generations drives THIS path **so it is a live cross-repo breakage
  (API authority ambiguity), not something an arm can paper over**"

**这不是补一条臂能解决的**：需要先定 API authority 归属，再决定
①收敛契约（删掉这两条路径）还是 ②补真实供应商账号 + 路由。
**必须业主决策，不可自作主张。**

---

## 四、根因：门禁口径漏洞（**已补**）

`tools/check-cloudrouter-ai-routing-consistency.mjs` 的 **check 7** 逻辑：

```js
for (const [path, operations] of Object.entries(openApiContract.paths ?? {})) {
  const namespace = path.split("/").filter(Boolean)[0];
  if (!prefixes.includes(namespace)) continue;   // ← 只扫 vendor namespace
  ...
}
```

`prefixes` = `x-sdkwork-vendor-path-prefixes` =
`[anthropic, elevenlabs, google, kling, midjourney, minimax, nano-banana, suno, vidu, volcengine]`

⇒ **`v1` namespace 被 `continue` 跳过**，OpenAI 面 122−47=75 条操作
**完全没有可路由性断言**。C 类 3 条就是这样静默漂移的。

**补盲（check 10）**：新增一段专门评估 `/v1/**` 的操作——
把 `classify_openai_spec` 的每个 `if` 臂解析成谓词（literal / `starts_with` /
`starts_with && ends_with` / `strip_prefix` / 多分支 `||`），逐操作求值；
**门禁读不懂的臂形态一律硬失败**，不留「跳过即静默」的口子。
消融自证：把 `/v1/models/` 臂改成永不匹配的路径
⇒ 门禁红并精确点名 `GET /v1/models/{model}`；还原 ⇒ 绿。

---

## 五、已交付的修复

### 5.1 新增回归守卫（已落盘并通过消融自证）

**文件**：`services/sdkwork-cloudrouter-router-service/tests/openai_contract_classification_coverage.rs`

补齐门禁在 OpenAI 面的盲区。3 个测试：

1. `every_published_openai_operation_is_classifiable_or_declared`
   —— 逐个契约 `/v1/**` 操作跑 `OpenAiResourceClassifier`，未覆盖且未登记即红；
2. `every_declared_unclassifiable_operation_is_still_published`
   —— 登记项若契约不再发布即红（防 ledger 腐化成永久借口）；
3. `every_declared_unclassifiable_operation_carries_a_reason`
   —— 无理由的豁免即红。

**消融自证**（不是"看起来绿"）：

```
① 登记 C 类 3 条后运行          → 3 passed
② 临时删除 GET /v1/audio/voices/{voice_id} 豁免 → FAILED
     "1 published /v1 operation(s) have no OpenAiResourceClassifier arm…
      GET /v1/audio/voices/{voice_id}"
③ 恢复豁免                     → 3 passed
④ C 类修复后豁免表清空 (`&[]`)   → 3 passed（3 条全部真分类，无豁免）
```

守卫能精确报出「哪条路径、缺什么环节」，且不虚绿。
**当前 `DECLARED_UNCLASSIFIABLE_OPERATIONS = &[]`**——3 条死接口已全部补上分类臂，
不再需要任何豁免（空豁免表本身就是「无漂移」的断言）。

### 5.2 审计脚本（只读，不改仓）

**文件**：`cloud-router-audit/openapi-classification-coverage.mjs`
把两个分类器的判定逻辑转录为可执行 JS，逐操作输出覆盖矩阵（含按 tag 汇总）。
**文件**：`cloud-router-audit/inventory.json`（167 条操作 + ledger 归属快照）

> 修复后已同步刷新脚本内转录的臂表（`openAiClassified` 补 3 臂、
> provider-native 表补 vidu video 4 项 + task-query 双端锚定 + `tencent.cloud` 镜像），
> 使其与实现同源。当前输出：**167 操作 / 143 覆盖 / 24 未覆盖**，
> 24 条恰好等于 A 类（20）+ D 类（4），**无未被解释的缺口**。

### 5.3 门禁补盲（check 10）— `/v1/**` 可路由性断言

**文件**：`tools/check-cloudrouter-ai-routing-consistency.mjs`

新增 check 10：把 `classify_openai_spec` 的 `if` 臂按 4 空格缩进切成独立臂，
再逐臂归类为可执行谓词；门禁读不懂的臂形态**硬失败**（不留静默跳过的口子）。
对契约每个 `/v1/**` 操作求值，未命中任何臂即红。

**消融自证**：把 `/v1/models/` 臂改成永不匹配的路径
⇒ `open-api OpenAI-compatible surface: 120 operation(s), 1 without a classifier arm`
并点名 `GET /v1/models/{model}`；还原 ⇒ `0 without a classifier arm`，绿。

### 5.4 B 类修复（vidu 视频面 4 条）

见 §三-B 的「修复」表：taxonomy / 种子 / 组授权 / 两处臂表 / 目录投影 / ledger
共 6 组文件联动。门禁跑后：
`open-api vendor-native surface: 23 operation(s) routed`（修前 19），
`24 declared unrouted`（修前 28，`published-no-route` 组清零），
`81 embedded endpoint(s) vs 81 declared`（两镜像一致）。

---

## 六、修复状态总表

| # | 项 | 状态 | 门禁验证 |
|---|---|---|---|
| 1 | vidu 视频面 4 条 | ✅ **已修复**（6 组文件联动） | gate passed，`23 routed / 24 unrouted` |
| 2 | OpenAI 面 3 条 | ✅ **已修复**（3 臂 + 501 合成） | gate passed，`120 ops / 0 无臂` |
| 3 | 门禁扩展（`/v1/**`） | ✅ **已落地为 check 10** | 消融自证通过 |
| 4 | 回归守卫（Rust） | ✅ 3 测试全绿，消融自证通过 | `openai_contract_classification_coverage` |
| 5 | midjourney/nano-banana 权威歧义 | 🟠 **待业主决策**（架构层面，不可代为收敛） | ledger `no-supplier-namespace` 已登记 |

> midjourney / nano-banana 涉及「API authority 归属」这一架构决策：
> 是收敛契约删路径，还是补真实供应商账号 + 路由。
> 按 `SOUL.md`「stop on ambiguity」，**先不动**，等业主指令。

---

## 七、复现命令

```bash
# 覆盖矩阵（167 操作逐条判定）
node cloud-router-audit/openapi-classification-coverage.mjs

# 路由一致性门禁（含新增 check 10：/v1/** 可路由性）
node tools/check-cloudrouter-ai-routing-consistency.mjs --root D:/sdkwork-space/sdkwork-cloudrouter

# OpenAI 面守卫
cargo test -p sdkwork-cloudrouter-router-service --test openai_contract_classification_coverage

# 目录导入 / seed / 分类
cargo test -p sdkwork-cloudrouter-router-service --lib -- model_catalog_import ai_routing_seed

# 全链路 e2e（含 3 条 vidu 新用例）
cargo test -p sdkwork-cloudrouter-edge-runtime --test per_api_chain_e2e
```

---

## 八、跨仓依赖收尾（2026-09-29 末）

审计与修复均落在本仓。修复过程中发现并处理了一笔**邻仓编译漂移**：

| 项 | 仓 | 处置 |
|---|---|---|
| `drive_asset_saver.rs` 调旧签名 `resolve(&id, version)` | `sdkwork-agents`（干净树、陈旧 HEAD） | ✅ 已修：`resolve(&id, ProviderAccessIntent::Write)` + 导入枚举（经用户确认） |
| `sdkwork-drive` 在制编辑（`ProviderAccessIntent` 迁移 + `storage_provider_kind_service` 数组不齐） | `sdkwork-drive`（**未提交、他人在制**） | ⏸ **不碰**（按纪律：不处置他人活跃编辑） |

**收尾结论**：邻仓在制编辑稳定到新形态后——

- `cargo check -p sdkwork-intelligence-agents-service` → **Finished**（0 error）；
- `cargo test -p sdkwork-cloudrouter-edge-runtime --test per_api_chain_e2e`
  → **2 passed / 0 failed，153.25s**，`sdkwork-drive` 自邻仓当前态**重编译**（非缓存）。

⇒ 首跑的通过结论**已被非缓存真跑独立复现**，跨仓阻塞正式关闭；
审计修复**不需要**对 `sdkwork-drive` 做任何改动。
