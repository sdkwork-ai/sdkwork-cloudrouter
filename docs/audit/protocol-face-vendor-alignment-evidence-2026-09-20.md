# 协议面（Anthropic / Codex）vendor 对齐 — 取证与落地台账

采集日期：2026-09-20。判据优先级：**`sdkwork-models` 目录 `vendor.json` 的
`protocolBaseUrls`**（仓内真源） > vendor 官方文档（外部佐证）。

## 一、缺口（改动前实测）

`models/vendors.json` 的 `supportedProtocols` 声明 vs 实际 `official.<vendor>.full` 授予：

| 协议 | 声明家数 | 改动前有端点/授予 | 缺口 |
|---|---|---|---|
| `anthropic_messages` | 9 | 仅 anthropic（且经独立的 `official.anthropic.claude_code` 组） | **8**：alibaba / deepseek / meituan / moonshot / stepfun / tencent / xiaomi / zhipu |
| `openai_responses` | 6 | 仅 openai（`api.openai.codex` + `api.openai.responses`） | 5 家无独立端点（见下文机制裁决） |

**失败机制**（精确到代码）：`provider_native_classifier.rs` 与 `passthrough.rs` 的分类臂
**按 vendor 硬编码**（`"anthropic" if path == "/v1/messages"`）。非 anthropic 的 vendor
发同一路径时落入 catch-all，合成 `<vendor>.messages` 键 → taxonomy 无此路由 →
`meter: None` + `StatelessFailClosed` → 计价预检拒绝，即使账号/凭据/组/授予全都在。

## 二、`protocolBaseUrls` 双向自洽性（改动前即已自洽）

逐 region 比对 `supportedProtocols` 与 `protocolBaseUrls`：

- 声明 `anthropic_messages` 但缺 baseUrl：**0 家**
- 有 anthropic baseUrl 但未声明：**0 家**
- 声明 `openai_responses` 但缺 baseUrl：**0 家**
- 有 responses baseUrl 但未声明：**0 家**

⇒ 目录侧是自洽的，**缺的是 router 侧的六链落地**，不是目录声明。

## 三、Anthropic 面：官方 base_url 台账（9 家全部取证）

| vendor | official anthropic base_url | 出处 |
|---|---|---|
| anthropic | `api.anthropic.com/v1` | 官方 |
| alibaba | `dashscope.aliyuncs.com/apps/anthropic` | 百炼 Claude Code 兼容面 |
| deepseek | `api.deepseek.com/anthropic` | `api-docs.deepseek.com/guides/anthropic_api` |
| meituan | `api.longcat.chat/anthropic` | 目录 `protocolBaseUrls` |
| moonshot | `api.moonshot.cn/anthropic`（国内）/ `api.moonshot.ai/anthropic`（国际） | `platform.kimi.com/docs/api/overview` |
| stepfun | `api.stepfun.com/step_plan` | 目录 `protocolBaseUrls` |
| tencent | `api.hunyuan.cloud.tencent.com/anthropic` | 目录 `protocolBaseUrls`（混元） |
| xiaomi | `api.xiaomimimo.com/anthropic` | 目录 `protocolBaseUrls`（MiMo） |
| zhipu | `open.bigmodel.cn/api/anthropic` | `docs.bigmodel.cn` Claude Code 配置 |

**wire 路径统一为 `/v1/messages`**：网关以 `/anthropic/` 命名空间发布
（契约实测 `POST /anthropic/v1/messages`），分类器收到后剥掉该前缀，故 9 家的路径
都归一为 `/v1/messages` —— 因此每家的臂用同一 path、不同 vendor 谓词。

## 四、落地（六链）

| 链 | 文件 | 改动 |
|---|---|---|
| ① 资源声明 | `data/ai-routing/resources/vendor-native-resources.json` | +8 条 `<vendor>.anthropic_messages`，`pathTemplate: /v1/messages`，`sortOrder` 420–434 |
| ② taxonomy | `services/.../application/ai_route_taxonomy.rs` | +8 条 `model("<v>.anthropic_messages", <同>, Chat, LlmInputToken)` |
| ③ 资源授予 | `data/ai-routing/resource-groups/official-provider-groups.json` | 8 个 `official.<v>.full` 各 +1 |
| ③′ default-group | `data/ai-routing/resource-groups/admin-api-groups.json` | 新增 `api.anthropic.messages` 组（10 条：anthropic 两条 + 8 家 vendor 面） |
| ④ 闭包守卫 | 两份 `model_catalog_import.rs` 的 `DECLARED_VENDOR_NATIVE_ENDPOINTS` | 各 +8 元组（74 = 74） |
| ④′ 台账 | 同上 `NOT_BOUND_BY_DESCRIPTOR` | 各 +8 具名（协议入口面，无模型 `primaryCapability` 选中） |
| ⑥ 分类器 | `provider_native_classifier.rs` + `passthrough.rs`（两侧同构） | 各 +8 臂 `"<v>" if path == "/v1/messages"` |
| 种子版本 | `ai_routing_seed.rs` | `.v9` → `.v10`，`DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES` 加 `api.anthropic.messages` |

⑤ `endpoint_modality_code`：这 8 条是协议面而非媒体能力，与既有 `anthropic.messages` /
`anthropic.claude_code` 同形，**沿用 `None` 惯例**（闭包守卫的
`every_capability_binds_only_to_a_declared_vendor_native_endpoint` 通过即为证）。

## 五、Codex / `openai_responses` 面：机制裁决（结论：不需新增 vendor 臂）

三条独立证据表明 Responses 面**走 OpenAI 兼容面**，不是 per-vendor 命名空间：

1. **入站分类**：`invocation_http.rs:572` —— `path.starts_with("/v1/")` 一律交给
   `OpenAiResourceClassifier`；只有非 `/v1` 前缀才走 `ProviderNativeResourceClassifier`。
   Responses 的发布路径是 `/v1/responses`，**根本不经过 vendor 分类器**。
2. **taxonomy 已有兼容别名**：`ai_route_taxonomy.rs:329`
   `model("openai_compatible.responses", "openai.responses", ...)`
   —— 兼容面协议码 → 共享路由键。
3. **授予与绑定齐备**：`api.openai_compatible.all` 含 `api.openai.responses`
   （`admin-api-groups.json:14/216/312`），且 `default-group` **已绑定**该组（活库实测）。

**且**：5 家声明 `openai_responses` 的 vendor，其 `protocolBaseUrls.openai_responses`
与 `openai_compatible` **逐字节相同**（deepseek/xai/alibaba/bytedance/stepfun 全部 SAME）
⇒ Responses 是**同一 base URL 上的请求体形状变体**，不是独立命名空间。

**真正残留的缺口是「目录内容」而非「路由接线」**：
逐模型查 `apiFormat`，只有 `openai` 有 `openai_responses` 模型（15 个）；
deepseek / xai / alibaba / bytedance / stepfun 的模型**全部是 `openai_compatible`**
（deepseek 8、xai 12、alibaba 20、bytedance 41、stepfun 3）。

依 skill §6 的硬判据——**判据是「模型的 `apiFormat`」，不是 vendor 级 `supportedProtocols`**——
这 5 家应**诚实留在兼容面**，不应编造 vendor 臂（编了会把 OpenAI 形状的 body 发给不认它的面）。
若要让它们真正以 Responses 协议被选中，须先在 `sdkwork-models` 为其**新增
`apiFormat: openai_responses` 的模型**，那是目录内容工作，不在本次路由对齐范围。

## 六、门禁终态（本次实测）

| 门禁 | 改动前 | 改动后 |
|---|---|---|
| `check-cloudrouter-ai-routing-consistency --check` | passed | **passed** |
| ├ classifier / passthrough arms | 41 / 41 | **49 / 49**（相等） |
| ├ seeded api codes | 92, 0 unknown | **100, 0 unknown** |
| ├ vendor-native coverage | 66 = 47 + 19 | **74 = 55 + 19** |
| └ closure guard（两份源） | 66 vs 66 | **74 vs 74** |
| `audit-api-chain-reachability` | 92/92 | **100/100 reachable, 0 broken** |
| `audit-model-route-reachability` | 289 / 0 | **289 reachable / 0 not reachable**（不回退） |
| `cargo test -p sdkwork-cloudrouter-router-service --lib` | 526 | **534 passed / 0 failed** |
| `cargo test -p sdkwork-models-catalog-repository-sqlx --lib` | 23 | 11 passed（filter `model_catalog_import`） |
| `validate-catalog.mjs` | ok: true | **ok: true** |

落库：`pnpm db:ensure` → `{"status":"installed","changed":true}`，seed `.v10`。

## 七、跨会话阻塞项（已自行解除，未介入他人 WIP）

编译期遇到 `InvocationErrorKind::InsufficientBalance` 缺 `openai_error_type` match 臂
（他人未提交改动）。该会话在我编译期间自行补齐（`insufficient_quota`），**我未编辑该文件**。

`pnpm models:check` 报 `releases/2026.09.17.1.json is not current`：
**非本次引入** —— `git status -- releases/` 为空，我唯一改动是
`sdkwork-models` 侧 `model_catalog_import.rs` 的 +24 行闭包守卫；
该报错由同仓他人 WIP（`models/index.json` + deepseek 定价文件）触发。


---

## 八、追加审计（2026-09-20 下午）：LLM 面 base_url 形状比对 —— 发现**活库端点 base_url 与目录协议 baseUrl 不一致**

触发：用户要求「确保所有 vendor 的 LLM 模型和资源配置正确，反复回归直到正确为止」。

### 8.1 判据来源（三层）

| 层 | 文件 | 地位 |
|---|---|---|
| 目录声明（仓内真源） | `sdkwork-models/models/<vendor>/<region>/vendor.json` → `protocolBaseUrls.<protocol>.{host,pathPrefix}` | **权威** |
| 目录校验规则 | `sdkwork-models/tools/validate-catalog.mjs#validateProtocolBaseUrls` | 约束 `protocolBaseUrls` 只能有 3 个 LLM 协议键 |
| 运行时端点 | 活库 `ai_upstream_supplier_endpoint.base_url` | 实际拨号目标 |
| 运行时解析链 | `services/.../application/upstream_base_url.rs#resolve_upstream_base_url` | account.protocols[P] → account.default → supplier.protocols[P] → supplier.default → route_base_url |

**关键机制（read 代码确认，非推断）**：

1. 活库 `ai_upstream_supplier.protocols = '[]'`（**全部 27 家**）、`default_base_url` 全空
   ⇒ `supplier.protocols[P]` 与 `supplier.default` **两条分支永不命中**。
2. 活库 `ai_upstream_account.protocols = '[]'`、`default_base_url` 全空（同上）。
   ⇒ 解析链实际**只剩最后一跳 `route_base_url` = 端点行 `base_url`（裸主机）**。
3. `crates/sdkwork-cloudrouter-edge-runtime/src/provider_passthrough_transport.rs`
   `ProviderPassthroughTarget::build_uri` 是**朴素拼接**：

   ```rust
   format!("{}{}", self.base_url(), path_and_query)
   ```

4. 入站路径：`/anthropic/v1/messages` 经 `split_provider_passthrough_path` +
   `is_standard_path_namespace`（`anthropic` 在标准命名空间内）⇒ 上游 path = `/v1/messages`。

⇒ **目录的 `pathPrefix` 从不参与上游 URL 拼接。** 端点 `base_url` 必须自带完整前缀，
否则拼出的 URL 缺段。

### 8.2 外部门证据（两家官方文档）

| vendor | 官方文档原文 | 目录 `protocolBaseUrls` | 活库 `base_url` | 结论 |
|---|---|---|---|---|
| deepseek | `base_url` 为 `https://api.deepseek.com/anthropic`（`api-docs.deepseek.com/guides/anthropic_api`） | `api.deepseek.com` + `/anthropic` | `https://api.deepseek.com` | **缺 `/anthropic`** |
| zhipu | `ANTHROPIC_BASE_URL: "https://open.bigmodel.cn/api/anthropic"`（`docs.bigmodel.cn/cn/guide/develop/claude`） | `open.bigmodel.cn` + `/api/anthropic` | `https://open.bigmodel.cn` | **缺 `/api/anthropic`** |

⇒ **目录是对的，活库端点 base_url 是错的。**

### 8.3 全量比对结果（42 个 vendor×协议 组合）

分三档，**只有 openai 一家正确**：

| 档 | 数量 | 含义 |
|---|---|---|
| `OK` | **2** | openai：`https://api.openai.com/v1` 自带 `/v1`，且目录 pathPrefix 就是 `/v1` |
| `PREFIX-MISSING` | **26** | host 对但缺目录声明的 pathPrefix |
| `HOST-WRONG` | **14** | 连 host 都不对 |

`PREFIX-MISSING` 明细（26）：

| vendor/region | protocol | 目录目标 | 活库 base_url | 拼出的上游 URL |
|---|---|---|---|---|
| alibaba/cn,global | anthropic_messages | `dashscope.aliyuncs.com/apps/anthropic` | `https://dashscope.aliyuncs.com` | `.../v1/messages` |
| alibaba/cn,global | openai_compatible | `.../compatible-mode/v1` | 同上 | `.../v1/chat/completions` |
| alibaba/cn,global | openai_responses | `.../compatible-mode/v1` | 同上 | `.../v1/responses` |
| anthropic/global | anthropic_messages | `api.anthropic.com/v1` | `https://api.anthropic.com` | `.../v1/messages` ✅ 巧合正确 |
| baidu/cn | openai_compatible | `qianfan.baidubce.com/v2` | `https://qianfan.baidubce.com` | `.../v1/chat/completions` |
| deepseek/cn,global | anthropic_messages | `api.deepseek.com/anthropic` | `https://api.deepseek.com` | `.../v1/messages` |
| deepseek/cn,global | openai_compatible | `api.deepseek.com/v1` | 同上 | `.../v1/chat/completions` ✅ 巧合正确 |
| deepseek/cn,global | openai_responses | `api.deepseek.com/v1` | 同上 | `.../v1/responses` ✅ 巧合正确 |
| google/global | openai_compatible | `.../v1beta/openai` | `https://generativelanguage.googleapis.com` | `.../v1/chat/completions` |
| moonshot/cn | anthropic_messages | `api.moonshot.cn/anthropic` | `https://api.moonshot.cn` | `.../v1/messages` |
| moonshot/cn | openai_compatible | `api.moonshot.cn/v1` | 同上 | `.../v1/chat/completions` ✅ 巧合正确 |
| stepfun/cn | anthropic_messages | `api.stepfun.com/step_plan` | `https://api.stepfun.com` | `.../v1/messages` |
| stepfun/cn | openai_compatible | `api.stepfun.com/v1` | 同上 | `.../v1/chat/completions` ✅ 巧合正确 |
| stepfun/cn | openai_responses | `api.stepfun.com/v1` | 同上 | `.../v1/responses` ✅ 巧合正确 |
| tencent/cn | anthropic_messages | `.../anthropic` | `https://api.hunyuan.cloud.tencent.com` | `.../v1/messages` |
| tencent/cn | openai_compatible | `.../v1` | 同上 | `.../v1/chat/completions` ✅ 巧合正确 |
| xai/global | openai_compatible | `api.x.ai/v1` | `https://api.x.ai` | `.../v1/chat/completions` ✅ 巧合正确 |
| xai/global | openai_responses | `api.x.ai/v1` | 同上 | `.../v1/responses` ✅ 巧合正确 |
| zhipu/cn | anthropic_messages | `open.bigmodel.cn/api/anthropic` | `https://open.bigmodel.cn` | `.../v1/messages` |
| zhipu/cn | openai_compatible | `open.bigmodel.cn/api/paas/v4` | 同上 | `.../v1/chat/completions` |

> 「✅ 巧合正确」= 入站路径本就带 `/v1`，而该 vendor 的 OpenAI 面恰好也在 `/v1`，
> 所以拼接后 URL 正确 —— **这是巧合，不是设计**。一旦 vendor 改用非 `/v1` 前缀即断。

`HOST-WRONG` 明细（14）：bytedance(4) / meituan(2) / minimax(2) / moonshot/global(2) / xiaomi(4)。
其中 **`xiaomi` 最严重**：目录是 `api.xiaomimimo.com`，活库却是 `api.xiaomi.com`（**不同域名**）；
**`meituan`**：目录是 `api.longcat.chat`，活库是 `api.meituan.com`；
**`bytedance`**：目录是 `ark.cn-beijing.volces.com/api/v3`（方舟 LLM 面），
活库是 `visual.volcengineapi.com`（**内容生成面**，非 LLM 主机）。

### 8.4 影响面（精确）

| 面 | 是否受影响 | 说明 |
|---|---|---|
| OpenAI 兼容 chat（`/v1/chat/completions`） | **多数不受影响** | 入站自带 `/v1`，裸主机拼接后正确 |
| **Anthropic Messages（8 家新增面）** | **全部受影响** | 入站 `/anthropic/v1/messages` 剥壳后只剩 `/v1/messages`，缺 vendor 的 `/anthropic` 段 |
| `openai_responses`（aliyun/stepfun/deepseek/xai） | 部分受影响 | 同上，缺 `/compatible-mode/v1` 等非 `/v1` 前缀 |
| embedding / image / video / audio | 不受影响 | 非协议面，走各自端点 |

⇒ **上一轮六链补全只解决了「能不能路由到」**（门禁/链审计全绿），
**没解决「拼出的上游 URL 对不对」** —— 这正是 §15.29 与门禁都覆盖不到的第二个射程盲区。

### 8.5 为什么这不是「已裁决的合法状态」

- 目录 `protocolBaseUrls` 明确给出 host **与** pathPrefix，且 `validate-catalog.mjs`
  对 pathPrefix 做了**标准集合校验**（必须取自 `models/protocols.json#/families`）
  ⇒ 该字段是**有语义的声明**，不是装饰。
- 两家官方文档（deepseek / zhipu）**逐字**支持目录的值。
- 活库 `protocols='[]'` + `default_base_url` 空 ⇒ 解析链的协议分支**全部失效**，
  pathPrefix 无处可施 —— 这是**配置未落地**，不是设计选择。

### 8.6 追加的回归门禁（已落地）

在 `crates/sdkwork-cloudrouter-edge-runtime/src/provider_passthrough_transport.rs` 的
`mod tests` 增加两条 pin，把「base_url + path 朴素拼接」与
「`/v1` 剥离取决于 base_url 形状」两件事钉住：

| 测试 | 断言 |
|---|---|
| `build_uri_is_base_url_concatenated_with_path` | `https://api.deepseek.com` + `/v1/messages` = `https://api.deepseek.com/v1/messages`；带 `/anthropic` 前缀时 = `.../anthropic/v1/messages` |
| `normalize_openai_compatible_path_depends_on_base_url_shape` | `.../v1` → 剥 `/v1`；裸主机 → 保留 `/v1`；`.../compatible-mode/v1` → 也识别为 `/v1` 尾 |

实测：`cargo test -p sdkwork-cloudrouter-edge-runtime --lib provider_passthrough_transport`
→ **6 passed / 0 failed**。

附带更正：上一轮 skill 中我写的「`compatible-mode/v1` 不被识别为 `/v1` 前缀」是**错的**。
`Uri::path()` 会保留路径段，`path.ends_with("/v1")` 为真 ⇒ **会被识别并剥离**。
已按实测行为修正该断言（`base_url_has_openai_v1_prefix()` 返回 `true`）。

### 8.7 待决（未越界代做）

活库端点 `base_url` 是**数据**，改动需 `pnpm db:ensure` 重导入 + seed 源修正
（`ai_routing_seed.rs` 的 `DefaultVendorUpstreamAccountSeed.base_url`）。
按 bin/ 单操作员通道与「改活库先问」纪律，**本报告只登记，不动手**。
候选修法二选一：

| 方案 | 内容 | 权衡 |
|---|---|---|
| A. 端点行带协议前缀 | 把 `base_url` 改成目录 `protocolBaseUrls` 的值 | 但一个 vendor 多个协议前缀不同，**单行 base_url 无法同时满足** |
| B. 落地 `supplier.protocols` | 把 `protocolBaseUrls` 灌进 `ai_upstream_supplier.protocols`，让解析链的协议分支生效 | **语义正确**，且解析链已支持；需 seed + 目录同步 |

⇒ **B 是正确解**，A 只是掩盖症状。需先确认 `protocols` 列的写入路径（seed 侧是否已有装载点）。


---

## 九、补充取证：第三家官方文档 + 破坏性用例清单（LLM 面）

### 9.1 第三家外部门证据：alibaba（破坏性最强的一例）

`help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope` 原文：

| 项 | 官方值 |
|---|---|
| OpenAI SDK 的 BASE_URL | `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` |
| HTTP 完整 endpoint | `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions` |
| 旧域名（仍可用） | `https://dashscope.aliyuncs.com` |

⚠️ 官方明确说明：**「以 `/compatible-mode/v1` 结尾、不含 `/chat/completions` 的地址」**
才是正确的 base_url。旧域名 `https://dashscope.aliyuncs.com` **必须补 `/compatible-mode/v1`**。

活库端点 `base_url = https://dashscope.aliyuncs.com` ⇒ 拼出
`https://dashscope.aliyuncs.com/v1/chat/completions`
⇒ **缺 `/compatible-mode`，全部 16 个 alibaba LLM 模型必然 404。**

### 9.2 破坏性用例（OpenAI 兼容面 pathPrefix ≠ `/v1`）

这类 vendor 的 OpenAI 面**不能**靠「入站 `/v1` + 裸主机」的巧合救回来：

| vendor | 目录 pathPrefix | 活库 base_url | 拼出的上游 URL | 应该是什么 |
|---|---|---|---|---|
| **alibaba** | `/compatible-mode/v1` | `https://dashscope.aliyuncs.com` | `.../v1/chat/completions` | `.../compatible-mode/v1/chat/completions` |
| **baidu** | `/v2` | `https://qianfan.baidubce.com` | `.../v1/chat/completions` | `.../v2/chat/completions` |
| **zhipu** | `/api/paas/v4` | `https://open.bigmodel.cn` | `.../v1/chat/completions` | `.../api/paas/v4/chat/completions` |
| **bytedance** | `/api/v3` | `https://visual.volcengineapi.com` | `.../v1/chat/completions` | `.../api/v3/chat/completions`（且 host 应换成 `ark.cn-beijing.volces.com`） |
| **google** | `/v1beta/openai` | `https://generativelanguage.googleapis.com` | `.../v1/chat/completions` | `.../v1beta/openai/chat/completions` |
| **meituan** | `/openai/v1` | `https://api.meituan.com` | `.../v1/chat/completions` | `.../openai/v1/chat/completions`（且 host 应换成 `api.longcat.chat`） |

⇒ **这 6 家的 LLM chat 面全部打不通**（而门禁/链审计/真库探针**全绿**）。

### 9.3 影响面汇总（把 8.3 与 9.2 合并）

| 面 | vendor 数 | 受影响模型数 | 症状 |
|---|---|---|---|
| Anthropic Messages（缺 `/anthropic` 等段） | 8 | 各 vendor 的 chat 模型（约 50） | 404 / 400 |
| OpenAI chat，pathPrefix = `/v1` | 6（deepseek/moonshot/tencent/stepfun/xai/xiaomi 部分） | 约 30 | **巧合可用** |
| OpenAI chat，pathPrefix ≠ `/v1` | **6（alibaba/baidu/zhipu/bytedance/google/meituan）** | **约 56** | **必然 404** |
| openai_responses | 4（alibaba/deepseek/stepfun/xai） | 0（目录无该 apiFormat 模型） | 尚未触发 |

### 9.4 为什么三层验证都漏了它

| 验证层 | 为什么漏 |
|---|---|
| `check-cloudrouter-ai-routing-consistency` | 只查**声明 ↔ arm ↔ 授予**的静态一致性，不构造 URL |
| `audit-api-chain-reachability` | 查「路由→授予→账号→计价」四段**可达性**，终点是「有账号可路由」，不校验拨号 URL |
| `audit-model-route-reachability` | 同上，终点是「模型能落到官方账号路由」 |
| `per_api_chain_e2e` | 真库探针，但 `API_CASES` 只跑**入站路由是否被网关挂载** + 链路是否可达；`base_url` 是占位凭据，**不发真实出网请求** ⇒ 拼错的 URL 不会暴露 |
| `validate-catalog` | 只校验目录自身（baseUrl 形状、协议键合法性），**不跨仓比对活库端点** |

⇒ 这是**第四类射程盲区**：**静态可达 ≠ 拨号正确**。需要一条「目录 `protocolBaseUrls` ↔ 活库端点 `base_url`」的跨仓一致性门禁。

### 9.5 附带结论：`capabilities` 空数组合法，非缺陷

审计发现 11 个 LLM 模型（如 `qwen3.7-flash`）无 `capabilities` 字段：

- `schemas/model.schema.json` 的 `required` **不含 `capabilities`** ⇒ 合法。
- `model_catalog_import.rs` 三处兜底 `if model.capabilities.is_empty() { vec![primary_capability] }`
  ⇒ 运行时有正确回退。
- 活库实证：`qwen3.7-flash` 落库 `capabilities = ["chat"]`、`qwen3.8-max` 同值
  ⇒ **两条路径收敛到同一结果，无缺陷。**

⇒ 判据：**以 `primaryCapability` 为准**；`capabilities` 是可选冗余。此项**无需修**。
