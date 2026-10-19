# DeepSeek Search / Fetch OpenAPI 对齐审计（2026-10-18）

审计对象：`POST /v1/tools/search`（`searchWeb`）、`POST /v1/tools/fetch`（`fetchWeb`）
权威对手方：DeepSeek 官方 `https://api-docs.deepseek.com/zh-cn/api/search`、`/zh-cn/api/fetch`、`/zh-cn/guides/search`
本仓契约权威：`tools/cloudrouter_gateway_openapi_generator.py`（`_deepseek_web_tool_resource_schemas` / `_deepseek_web_tool_operation`）
基线：`fb97335d`（v0.4.12），工作树干净

> 阅读提示：第一至五节是**改动前**的审计快照，其中引用的 `openapi.json`/生成器行号与旧 schema 名（`DeepSeekWeb*`）均针对 `fb97335d`。第六、七节是本轮落地后的实现与回归结果；现行契约里这些模块已改名为 `OpenAiDeepSeekWeb*`，行号也已位移。

## 一句话结论

**结构面对齐、语义面未对齐。** 端点、HTTP 方法、字段名/类型/必填/约束/nullable、错误信封形状、按次计费模型均与 DeepSeek 参考文档一致（逐字段可核）；但**错误码的适用范围与文案有 2 处实质错配**，且官方文档定义、本地完全缺失的**限速与计费事实有 4 项**。按"完整对齐"标准判定为 **不通过**，缺口全部集中在描述层（description / 响应码集合），无字段级破坏性偏差。

## 一、已核验完全一致的部分

| 维度 | DeepSeek 官方 | 本仓契约 | 判定 |
|---|---|---|---|
| 端点 | `POST /v1/tools/search`、`POST /v1/tools/fetch` | 同 | 一致 |
| 鉴权 | `Authorization: Bearer <key>` + `Content-Type: application/json` | `security: bearerAuth` + `x-sdkwork-auth-mode: api-key-or-dual-token` | 一致（网关统一双证模式，非偏差） |
| `query` | string，必填，1–128 Unicode，不能全空白 | `minLength 1 / maxLength 128` + 描述含 "not all whitespace" | 一致 |
| `count` | integer，1–50，默认 10 | `minimum 1 / maximum 50 / default 10` | 一致 |
| `ori_question` | string 或 null，1–128，null 视为未提供 | `nullable + minLength 1 + maxLength 128`，描述含 "null treated as absent" | 一致 |
| `localization` | string，默认 `""`，IP | `default ""` | 一致 |
| `need_content` | boolean，默认 false；false 时 `content` 恒空串 | `default false` + 描述同义 | 一致 |
| `url` | string，必填，≤8192，HTTP/HTTPS 含 host，不带用户名密码 | `minLength 1 / maxLength 8192 / format uri` + 描述同义 | 一致（`format: uri` 不排除非 http(s) scheme，属弱于描述，见 P3-3） |
| `results[]` 10 个字段 | rerank_score 0–3、title、url、snippet、summary、content、site_name(null)、site_icon(null)、date(RFC3339 UTC, null)、authority(-1–4) | 全部同名、同类型、同必填、同 nullable | 一致 |
| Fetch 响应 | `title`、`content`（均必填 string，缺失为空串） | 同 | 一致 |
| 错误信封 | OpenAI 兼容 `{error:{message,type,param,code}}` | `OpenAiErrorEnvelope` / `OpenAiError` | 形状一致（`param` 恒 null 未表达，见 P3-1） |
| 计费模型（Search） | 按成功请求计费，`count` 不影响单价 | `BillingMode::ApiRequest` + `BillingMeter::ApiRequest`，描述含 "independent of count" | 一致 |
| 上游路径拼接 | `https://api.deepseek.com/v1/tools/search` | relay 直达同 URL，含 base_url 已带 `/v1` 的去重 | 一致（`deepseek_web_tools_relay.rs` 两个用例锁死） |

派生契约一致性（实测）：

- `apis/.../cloudrouter-open-api.openapi.json` ≡ `sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json` ≡ `...sdkgen.json`，tools 段与 5 个 schema **逐字节相同**。
- `python -B -m tools.cloudrouter_gateway_openapi_generator --check` → `Cloud Router gateway OpenAPI spec is current`（无手改漂移）。
- 路由/分类/种子/授权四条声明链齐备：`generated_open_http_route_manifest.rs:776-777`、`openai-resources.json:422/440`、`official-provider-groups.json:533/537`、`openai_classifier.rs:294/302`。

## 二、差异清单

### P1-1　403 适用范围 + 文案错配

- DeepSeek：错误表明确 `403 = Fetch 请求被安全策略拒绝`，**Search 不返回 403**；Search 参考页只列 200。
- 本仓：两个操作都声明 403，且**文案是 Fetch 专用**——Search 的 403 写成 "The fetch request was rejected by a safety policy."
  - `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json:27912`（search）
  - `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json:27744`（fetch，此作文案也欠精确：应为"被目标站点安全策略拒绝/内容不可抓取"）
  - 根因：`tools/cloudrouter_gateway_openapi_generator.py:3708` 一份 `extra_errors` 无条件套到两个 operation（`_deepseek_web_tool_operation` 无端点维度参数）。
- 影响：Search 契约承诺了一个不会发生的状态码，且描述里出现"fetch"，SDK 消费者与对接方按文写重试分支会误判。

### P1-2　404 语义错配（对 Fetch 是真错，对 Search 是多给）

- DeepSeek：`404 = Fetch 未能获取可用网页内容`（URL 不可用 / 被站点策略拦截 / 目标站点报错 / 内容类型不支持 / 无可提取正文），**仅 Fetch**。
- 本仓：两个操作都是通用网关文案 `"Resource or route target not found."`
  - `apis/...openapi.json:27754`(fetch) / `27920`(search)，来源 `tools/cloudrouter_gateway_openapi_generator.py:3784`
- 影响：Fetch 的 404 是**业务语义**（换 URL 重试无意义），本地写成**路由语义**（"路由目标不存在"），会把调用方导向"检查路径/配置"的错误处置。

### P2-1　限速事实整段缺失

DeepSeek 明示：Search 与 Fetch **按账号各自独立 5 QPS**（与 API Key 无关），Fetch 另有**目标域名级 QPS**，超限 429。
本仓：仅 `429 = "Search or fetch QPS limit exceeded."` 一句，无阈值、无"两者独立"、无"Fetch 域名级限制"。
位置：`...openapi.json:27952`(search 429) / `27784`(fetch 429)；全仓无任何 rate-limit 扩展（`QPS` 在规范中仅出现 2 次，即这两条文案）。

### P2-2　Fetch 无任何计费说明

DeepSeek：Search/Fetch 同为 **5 元 / 1000 次成功请求**；**Search `results` 必须非空、Fetch 必须返回正文才计费**；失败/空结果/超时不计费。
本仓：Search 描述写了 "Billing is per successful request, independent of count"，**Fetch 描述一字未提计费**；两者都没写"空结果不计费"这一条最能影响调用方缓存策略的规则。
位置：`...openapi.json:27681`（fetch description）。

### P2-3　"未知字段被忽略"语义未表达

DeepSeek：`请求体中的未知字段会被忽略。`
本仓：两个请求 schema 用 `additionalProperties: {$ref: ProviderJsonValue}`，描述写作 "Additional deep seek web search request values using the provider json value module."——读起来是"允许并保留"，而非"上游会忽略"。SDK 侧会因此生成宽松 index signature 且不告警。

### P2-4　搜索语法表不全

DeepSeek 8 类操作符：`site:`、`-site:`、`-`、`-"..."`、`"..."`、`lang:`、`after:`、`before:`。
本仓：
- `query` 字段描述列了 `site:, -site:, -term, "exact phrase", lang:, after:, before:` — **缺 `-"短语"`（排除精确短语）**（`...openapi.json:1123`）。
- operation 级描述列了 `site:, -site:, "exact phrase", lang:, after:, before:` — **缺 `-term` 与 `-"..."`**（`:27849`）。

### P3（低危 / 表述类）

1. **`param` 恒为 null 未表达**：官方"`param` 字段恒为 `null`"；本地 `OpenAiError.param` 为可选 nullable string，未强制恒 null（`...openapi.json` components/OpenAiError）。
2. **501/502 来源未标注**：`501`（无上游账号）、`502`（上游中继失败）是网关自有语义，DeepSeek 无此码；文案未标 "Cloud Router-specific"，与官方 10 个码并列时易被当成上游契约。另外 `apis/open-api/cloudrouter/changelogs/CHANGELOG.md:9-10` 列举的错误码 `400/401/402/403/404/408/413/429/500/504` **漏了 501/502**，与规范自相矛盾。
3. **`format: uri` 弱于描述**：官方要求"必须为含 host 的 HTTP/HTTPS URL"；`format: uri` 放行 `ftp:`/`mailto:` 等。描述已覆盖，schema 未约束（若生成校验器需注意）。
4. **`rerank_score` 下界**：官方 schema 只写 `<= 3`（正文写 0~3）；本地 `minimum 0 maximum 3`，与正文一致，属合理加严，无需改。
5. **`x-sdkwork-external-protocol-id: "openai-v1"`**：这两个端点是 DeepSeek 原生扩展，并不属于 OpenAI 协议面；沿用 `/v1` 前缀归类是既有惯例（122 个同值），不算缺陷，但若后续做 vendor-native 协议审计会在此处产生歧义。
6. **`apps/sdkwork-cloudrouter-pc/public/openapi.json` 缺全部 `x-sdkwork-*` 扩展**（`:26471` / `:26630`）：该文件由生成器直写、早于 `api:standard-extensions:write`，全量 0 处 `x-sdkwork-owner`，属生成链顺序产物而非本端点局部问题——**不计入本审计缺口**，但会误导"两个契约不一致"的比对。

## 三、运行期对齐说明（schema 之外）

`/v1/tools/*` 采用**声明式透传**：`sdks/_route-manifests/open-api/...route-manifest.json:3772/3800` 的 `handler.name` 为 `null`，`OpenAiResourceClassifier` 仅按 `Method + Path` 分类（`deepseek_web_tools_relay.rs:74-76`），请求体不解析、不按 schema 校验，原样转发。

因此契约中的 `required: query` / `maxLength: 128` / `count ∈ [1,50]` 等约束**在网关不生效**，由上游 DeepSeek 返回 400 兜底（`400 = Invalid request.` 已覆盖该路径）。网关自身只兜 `408`（读体超时）与 `413`（体积超限）。这是与 DeepSeek"原始 JSON API"定位一致的设计，但若文档读者据此以为网关会前置校验，会产生错误预期——建议在 400 描述中补一句"参数合法性由上游 DeepSeek 判定"。

## 四、建议动作（未执行，待确认）

> **本轮已全部执行**，实现与回归结果见第六、七节；本节保留为原始建议清单。

按"改生成器 → 跑再生链"的顺序，全部为**描述层 + 响应码集合**改动，不触碰 schema 字段：

1. `_deepseek_web_tool_operation` 增加端点维度（如 `surface: "search" | "fetch"`），把 403/404 只挂到 fetch，并改写文案：
   - fetch 403 → "The target page was rejected by the safety policy; do not retry."
   - fetch 404 → "Fetch could not extract usable page content (URL unavailable, blocked by the site policy, upstream error, unsupported content type, or no extractable Markdown body)."
   - search 保留 404? 官方未定义；建议**同样摘除**，仅留通用网关码。
2. 两个 operation 的 description 补限速（账号级 5 QPS、Search/Fetch 独立、Fetch 另有域名级）与计费（5 元/1000 次成功请求、空结果不计费、count 不影响价格）。
3. 请求 schema 的 `additionalProperties` 描述改为"上游会忽略未知字段"。
4. `query` 与 operation 描述补齐 `-"..."` 语法。
5. 501/502 文案加 "Cloud Router-specific" 前缀；CHANGELOG 错误码清单补齐 501/502。
6. 再生链：`tools.cloudrouter_gateway_openapi_generator` → `pnpm api:materialize:write` → `api:standard-extensions:write` → `api:http-route-manifest:write` → `tools.cloudrouter_gateway_openapi_generator`（materialize 必须最后重跑）。

## 五、复现命令

```bash
# 契约无漂移
TEMP=D:/tmp TMP=D:/tmp python -B -m tools.cloudrouter_gateway_openapi_generator --check

# tools 段三份派生契约一致性（应输出 sdk/sdkgen IDENTICAL）
python - <<'PY'
import json
a=json.load(open("apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json",encoding="utf-8"))
for p in ["sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json",
          "sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.sdkgen.json"]:
    b=json.load(open(p,encoding="utf-8"))
    print(p, "IDENTICAL" if a["components"]["schemas"]["OpenAiDeepSeekWebSearchResult"]==b["components"]["schemas"]["OpenAiDeepSeekWebSearchResult"] else "DIFF")
PY

# 错误码集合
python -c "import json;d=json.load(open('apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json',encoding='utf-8'));[print(p,sorted(d['paths'][p]['post']['responses'])) for p in ['/v1/tools/search','/v1/tools/fetch']]"
```

## 六、本轮已执行的实现（契约 + 计费 + 调用流程）

### 6.1 契约侧（生成器单点改，其余均为派生）

`tools/cloudrouter_gateway_openapi_generator.py` 的 `_deepseek_web_tool_operation` 新增 `surface` 维度，落地第二节全部建议：

| 项 | 现值 |
| --- | --- |
| 响应码集合 | search：`200/400/401/402/408/413/429/500/501/502/504`；fetch 额外 `403/404` |
| 429 文案 | 账号级 5 QPS、Search/Fetch 独立；fetch 追加目标域名级限制 |
| 501/502 | 前缀 `Cloud Router-specific:`，明确是网关态而非 DeepSeek 状态码 |
| operation description | 计费规则（成功请求计费、空结果/无正文不计费、`count` 不影响价格）+ 限速 |
| requestBody description | 未识别字段由上游忽略（透传语义） |
| `query` / `results` / `content` | 补 `-"exact phrase"` 操作符、空数组为"成功但不计费"、空正文不计费 |
| schema 模块名 | `DeepSeekWebSearch*` → `OpenAiDeepSeekWebSearch*`（含 `...Result`），与其余 `/v1` 载荷的 `OpenAi*` 族一致，`/v1` 载荷命名门禁由此转绿 |

派生链已全部重跑并校验：`apps/sdkwork-cloudrouter-pc/public/openapi.json`（生成器直写）→ `sdks/.../cloudrouter-open-sdk.openapi.json` + `.sdkgen.json`（`tools.cloudrouter_sdk_runtime_standardizer --openapi-only` 派生后按最小 diff 落盘）→ `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`（`materialize` 字节拷贝）+ `apis/manifest.json` hash。校验结果：三份派生契约与网关契约**除 `x-sdkwork-*` 外逐节点相等**；`sdkgen` 仅在 7 个 dynamic-json 边界 schema 上与权威件不同（派生器设计如此）。

### 6.2 计费侧（"只有上游会计费，我们才计费"变成构造性保证）

| 落点 | 作用 |
| --- | --- |
| `application/invocation/billing.rs` | 新增 `BillingResultGate { Any, NonEmptyResults, NonEmptyContent }`，作为 `InvocationBilling` 的第 7 个字段 |
| `application/invocation/web_tool_billing.rs`（新） | 单一权威：api_code → 门槛、门槛 → 放弃原因码、响应体是否满足门槛；附 4 个单测 |
| `application/invocation/billing_policy.rs` | `billing_policy_for` 末尾统一 `with_result_gate(...)`，策略层就带上门槛，**settlement 层无需认识 api_code** |
| `application/invocation/usage_extraction.rs` | `FixedRequest` 分支改走 `ensure_result_gated_request_line`：门槛不满足则 `retain` 掉 `ApiRequest` 行并置 `charging.waived`；**body 读不出时保留计费**（避免白送可计费流量） |
| `application/invocation/state.rs` | `InvocationCharging.waived: Option<String>`，作为结算层的信号 |
| `application/invocation/billing_transaction.rs` | `BillingSettlementInterceptor.after` 在读取汇率设置**之前**处理 waived：同步模式 `release_hold` + `mark_usage_settled`，异步模式 `refund`；`on_error` 同样优先释放。否则"成功但无金额"会走 `settlement did not produce a billable amount` 分支，把一次免费调用变成网关 502 |

`mark_usage_settled` 是 `UPDATE ... WHERE request_id AND settlement_status = 0` 的幂等批更新（`gateway_billing_account.rs:420`），零行受影响不报错，因此"豁免调用没有 usage 行"不会反过来变成失败。

### 6.3 明确不实现（有依据的决策）

**网关侧不另设 QPS 限速。** DeepSeek 的 5 QPS/账号（+ fetch 域名级）由其自身执行并返回 429；网关的 `gateway_invocation_rate_limit` 是 **API Key 维度**，与"上游账号维度"不是同一个东西，且对 POST 透传路由加本地令牌桶只会在多副本部署下与上游额度打架。契约里把该限制写清（429 文案 + description），运行期透传上游 429。

## 七、回归矩阵

| 项 | 结果 |
| --- | --- |
| `cargo check -p ...router-service --lib` | 通过（仅 `sdkwork-web-core` 既有第三方 warning） |
| `cargo test --test deepseek_web_tools_billing` | **9 passed** |
| `cargo test --test deepseek_web_tools_relay` | **2 passed** |
| `cargo test -p ...router-service --lib` | 577 passed / 1 failed（`gemini.video_task_query` declared-but-unbindable，**HEAD 既有**，本次未触及 `vendor-native-resources.json` 与 `model_catalog_import.rs`） |
| `python -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 67 tests，4 failed（全部 **HEAD 既有**：gemini 描述含 "native" ×2、passthrough 契约、Windows 8.3 临时路径）；新增 5 个 tools 断言全绿，且 `/v1` 载荷命名门禁由红转绿 |
| `tools.cloudrouter_gateway_openapi_generator --check` | `Cloud Router gateway OpenAPI spec is current` |
| `pnpm api:materialize:check` | passed |
| `pnpm api:standard-extensions:check` | open-api `stamped=0`，三面全 ok（routes=176） |
| `pnpm api:http-route-manifest:check` | open-api `ok`；app-api/backend-api `drift`（**HEAD 既有**，已用 `git worktree` 在 `fb97335d` 复现） |
| `pnpm api:ai-routing-consistency:check` | passed（122 个 OpenAI-compatible operation 全部有分类臂） |

## 八、遗留与建议

1. **`api:http-route-manifest:check` 的 app-api/backend-api drift 是 HEAD 既有红灯**，与本端点无关，需单独修（`--apply` 会重写两个 `http_route_manifest.rs`）。
2. **生成器测试集 4 个 HEAD 既有红灯**同上一并处理；其中两个是 gemini schema 描述里出现 "native"，属文案门禁，改动会打到 google 供应商契约。
3. **`sdkgen.json` 与权威件在 7 个 dynamic-json schema 上不同**是 `_derive_sdkgen_openapi` 的既定设计（`x-sdkwork-derived-contract.recursiveSchemaRefs = "dynamic-json-boundary"`），不要"修正"成一致。
4. **`tools.cloudrouter_sdk_runtime_standardizer --openapi-only` 会丢掉 5 个路由派生扩展**（`x-sdkwork-api-surface`/`auth-mode`/`request-context`/`required-surface`/`source-route-crate`），因为 `sync-cloudrouter-api-standard-extensions.mjs` 只回填 `apis/**` 与 route manifest，不写 `sdks/**/openapi.json`。因此 SDK 快照**不能**整份交给派生器重写，否则每次都是 1200+ 行抖动；本轮采用"派生节点 + 保留既有扩展 + 按基线键序落盘"的最小 diff 方式。
5. **全部 176 个 operation 的计费口径**另见 `docs/audit/OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md`（含黄金矩阵回归 `tests/openapi_billing_matrix.rs`）。本文只覆盖 Search/Fetch 两个端点的契约与计费。
