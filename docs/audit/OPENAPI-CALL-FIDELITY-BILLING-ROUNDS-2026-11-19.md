# OPEN-API 调用保真、响应转换与供应商计费回归 · 2026-11-19

本文件记录「open-api 与 vendor API 完整一致、返回结果转换完整、按 vendor 计费规则真实计费」这一目标下连续 22 轮的回归、修复与验证结论。每轮均以代码改动 + 回归用例 + 门禁全绿收口。

## 1. 范围

- 入口：`sdkwork-cloudrouter` open-api 调用链（框架 18 阶段中间件 → 装配 catch-all → 能力门禁 → 网关 catch-all → `InvocationPipeline`(22 拦截器) → `DispatchExecutor` → 上游）。
- 计费：`BillingMeter`(42) ↔ `sdkwork-models` 目录；价格行条件维度和档位解析。
- 口径：只编码 vendor 公开规则（如批量 = 标准价 50%），不臆造价格。

## 2. 已修复（按类别）

### 2.1 计费漏斗与口径（11）

1. 批量登记/守卫/免费管理面使用「原始 vendor 路径」，而运行期路径已剥离 vendor 前缀 → 三处重复臂实际不可达。
2. 幂等重放重复计费。
3. 记账主 + 队列双故障被静默吞掉（现报告丢失记录并降级就绪）。
4. 上游非 2xx 被改写为 502（现按原状态释放、不计费）。
5. ElevenLabs 音乐时长按毫秒读成秒。
6. Ark 视频时长只读 `input`，漏 `req_params`。
7. STT 秒数只在响应给 `duration` 时有值（现从 SRT/VTT 时间轴与上传 WAV 头推导）。
8. 流式用量事件被无条件删除（忽略客户端 `include_usage`）。
9. 嵌套任务结果里的产出时长抽不到（`data.task_result.videos[]` / `creations[]`）。
10. 视频计量只读 `usage.duration`，未走嵌套/聚合/件数放大。
11. Anthropic 混合 TTL 缓存写按单一档位计费（对客多收 60%）。

### 2.2 异步媒体完成态回补（6 家）

新增 `AsyncUsageTaskKind::MediaTask`，创建期免单、完成期按实际产出结算，覆盖：

| vendor | 状态字段 | 时长/产出来源 |
| --- | --- | --- |
| Kling | `data.task_status` | `data.task_result.videos[].duration` |
| Vidu | `state` | `creations[].duration` |
| Runway | `status` | 登记时捕获的 `duration` × `output[]` 件数 |
| Luma | `state` | `request.duration`（`"5s"` 归一） |
| PixVerse | `Resp.status`(1/5/7/8) + `ErrCode` | `Resp.duration` |
| MiniMax | `status` + `base_resp.status_code` | 登记时捕获的 `duration`（query 型轮询） |

未接入厂商行为不变（创建即计费），逐家白名单 `RECONCILED_MEDIA_CREATE_CODES` 控制。

### 2.3 响应保真（11）

非 2xx 非法 JSON 透传、二进制错误体不被 `from_utf8_lossy` 破坏、SSE 尾帧 flush、SSE `cache-control: no-cache`、记账失败不截断健康流、CORS 暴露 SDK 依赖的响应头、网关自身 `x-request-id`、W3C `traceparent` 非零 parent-id、幂等重放保留上游响应头、早退路径补齐关联 id、批量档位门控（数据到位即生效）。

### 2.4 请求与安全（8）

出站丢弃 `accept-encoding`/cookie/转发头/`x-sdkwork-*`；脱敏前缀扩充（`AIza`/`gsk_`/`xai-`/`hf_`/`r8_`）；IPv6 过渡前缀拒绝（6to4/Teredo/NAT64）；`trust_forwarded_headers` 生效；API key 模态能力限制；内部错误文本不外泄（分级 `exposes_message`/`public_message`）；`x-sdkwork-route-reason` 降噪；内部通道缺鉴权头时**不读 body** 即拒绝。

## 3. 新增门禁

| 门禁 | 作用 |
| --- | --- |
| `pnpm check:catalog-pricing-alignment` | 校验目录计费维度与声明口径一致（含 `cache_storage_token_hour` 提示） |
| open-api 能力快筛（`static_path_prefix`） | 计费面路由在调用前识别能力，避免越权与错路由 |

## 4. 验证基线（每轮执行）

```powershell
cargo fmt --check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime
cargo check --all-targets
cargo test -p sdkwork-cloudrouter-router-service --lib      # 732 passed
cargo test -p sdkwork-cloudrouter-edge-runtime --lib         # 109 passed
# 35 个 billing_* 集成套件全绿；openapi_billing_matrix 218 操作
# 18 个非 DB edge 套件全绿
pnpm check:catalog-pricing-alignment
```

本机无 PostgreSQL 时，4 个 DB 套件（`ai_routing_seed_coverage_e2e`、`media_provider_native_db_e2e`、`openai_chat_db_auth_token_e2e`、`per_api_chain_e2e`）仅在 `sdkwork-test/rust/src/pg_context.rs:42` 失败，属环境缺失而非代码回归。

## 5. 剩余项（全部为数据侧输入，代码骨架已就绪）

| 项 | 代码状态 | 待补数据 |
| --- | --- | --- |
| 批量 50% 折扣 | 门控完成（`catalog_tier_code_available` + `BATCH_TIER_CODE`） | 目录 `tier_code=batch` 价行（官方 50%） |
| Gemini `cachedContents` token·小时 | 需计价 schema 时间维度 | 官方存储单价 |
| 火山/Seedance 视频按 token | 需 `video_output_token` 抽取分支 | 官方 token 单价 |
| Runway 未声明时长 | 需读取目录默认时长 | 模型默认时长字段 |

上述开关在无数据时保持关闭，避免把「少收」变成「无价拒单」。数据发布后无需再改代码即可生效。

## 6. 数据侧落地记录：批量价行（2026-11-19）

经授权在 `sdkwork-models` 落地批量价行：

| 项 | 内容 |
| --- | --- |
| 权威来源 | `.workbuddy/reports-20261114/<vendor>--<region>.json` 的 `officialPrices[].variant = "batch"`（厂商官方批量价，Anthropic/Google 均约为标准价 50%） |
| 作者化数据 | `config/pricing/batch-rates.json`，28 条（2 条 `claude-haiku-5-5` 因同一 meter 出现两个不同批量价，按"有歧义即跳过"规则排除） |
| 物化工具 | `tools/materialize-batch-rates.mjs`（`--write` / `--check`，幂等；`rateHash` 与 `migrate-pricing-v2.mjs` 同算法） |
| 落库结果 | Anthropic 11 个模型各新增 input/output 两条 `tier_code = batch` 价行（共 22 条，+770 行）；Google 3 个模型因存在多条无条件行，按歧义规则跳过并告警 |
| 稳定性 | `migrate-pricing-v2.mjs` 扩展为**保留**已存在的 `tier_code = batch` 条件（否则重建 `conditions` 会静默删掉折扣）；迁移复查 0 改动 |
| 校验 | `validate-catalog.mjs` → `ok: true, errors: 0`；`rateVariant` 词表扩展为 `standard / time_window / batch`（向前兼容，当前行仍用 `standard` + 条件表达） |
| 索引 | `tools/build-index.mjs` 重新生成 `models/index.json` |

**关键约定**：批量行用「`rateVariant: standard` + 条件 `tier_code = batch`」表达，因为 cloudrouter 契约 crate 的 `PricingRateVariant` 词表是封闭的（`standard`/`time_window`），条件方式可被现有导入链路完整映射（`condition.operator` → `operator_code`）。

**验证**：

```powershell
# sdkwork-models
node tools/validate-catalog.mjs        # ok: true, errors: 0
node tools/migrate-pricing-v2.mjs      # Would migrate 0 rates（幂等）
node tools/materialize-batch-rates.mjs --check   # 0 added（幂等）
# sdkwork-cloudrouter
pnpm check:catalog-pricing-alignment   # passed
cargo test -p router-service --lib     # 732 passed
# 35 个 billing_* 套件：0 失败
```

**待观测项**：`context_tier_code` 与批量行共存时的交互（同一 meter 同时存在条件行与无条件行）需在目录快照重新物化后，用真实目录跑一次批量结算端到端；当前单元用例（`a_batch_rate_from_the_catalog_halves_the_row_charge`）已在内存目录上验证取价方向正确。

**已闭环（2026-11-19 第 25 轮）**：新增 `real_catalog_imports_official_batch_rates` 用例，直接以 `load_catalog_root_with_pin(Some("../sdkwork-models"))` 加载**真实目录**，断言
`anthropic/claude-opus-5` 的 `llm_input_token` 同时存在「无条件标准行」与「`tier_code = batch` 条件行」，且批量价恰为标准价的 50%。这钉住了「目录数据 → 导入链路 → 价行」整条链路（此前风险点是 `PricingRateVariant::from_code` 对未知词表 `continue` 会静默丢弃批量行）。兄弟仓库未 checkout 时用例自动跳过，不产生环境性误报。

## 7. 官方价格确认结果（2026-11-19 第 26 轮，联网核对）

| 项 | 官方数值 | 来源 |
| --- | --- | --- |
| Runway 默认时长 | `duration` 可选，**默认 5 秒** | <https://replicate.com/runwayml/gen-4.5>（模型 schema `duration` — "Default - 5"） |
| Gemini 上下文缓存存储 | **\$0.50 / 1M tokens·小时**（2026-12-31 前），2027-01-01 起 \$1.00；部分 Pro 档为 \$1.80 / \$4.50 | <https://ai.google.dev/gemini-api/docs/pricing> |
| 火山方舟 Seedance 视频（按 token） | 元/百万 token：seedance-1.0-pro 15.00；1.0-pro-fast 4.20；1-0-lite 10.00；1.5-pro 有声 16.00 / 无声 8.00；2.0 含视频输入 28.00 / 不含 46.00 | <https://github.com/arcreel/arcreel/blob/5c7c36c04f4b26ab7a9d32bff3018966d3838b3f/docs/ark-docs/%E7%81%AB%E5%B1%B1%E6%96%B9%E8%88%9F%E8%B4%B9%E7%94%A8%E5%8F%82%E8%80%83.md> |

**本轮已落地**：Runway 未声明 `duration` 时，媒体任务登记按官方默认 **5 秒**记录（此前回落 1 秒占位，5 秒成片少收 80%）。实现为 `MEDIA_DEFAULT_DURATION_SECONDS` 白名单 + 单测 `a_runway_create_without_a_duration_uses_the_documented_default`。

**待落地（需各自的结构性改动）**：

1. **Gemini 缓存存储**：计价 schema 需支持「时间」维度（金额 = token × 小时 × 单价），并需要一个按小时累计的 worker；仅加价行无法生效。
2. **Seedance 视频按 token**：需新增 `video_output_token` 抽取分支（读 `usage.total_tokens`）与 CNY 价行（`bytedance/cn` region）。价格数据已确认，等待与抽取分支同批上线，避免「有价无量」或「有量无价」的半成品。




## 8. Ark（火山/Seedance）完成态回补与 token 计费（第 30 轮）

| 环节 | 结论 |
| --- | --- |
| 创建面 | `bytedance.video_generation` / `volcengine.video_generation`（`POST /api/v3/contents/generations/tasks`），响应顶层 `id` |
| 轮询 | 同一集合路径 + 任务号（`/api/v3/contents/generations/tasks/{id}`），状态字段 `status`（`queued`/`running`/`succeeded`/`failed`），由统一 `media_task_status` 处理 |
| 计费量 | 完成体 `usage.total_tokens` → `video_output_token` 抽取链（`output_tokens → completion_tokens → candidatesTokenCount → total_tokens`） |
| 防双收 | 两个 api_code 已加入 `RECONCILED_MEDIA_CREATE_CODES`，仅异步对账开启时创建免单 |

新增回归（可复现）：

- `registers_a_bytedance_media_task_polled_on_the_tasks_collection` —— 任务号、poll 路径、任务类型；
- `ark_video_completion_bills_the_reported_output_tokens` —— `{"completion_tokens":108900,"total_tokens":108900}` → `video_output_token = 108900`；仅 `total_tokens` 的形态同样命中；**只有 `prompt_tokens` 时返回 `None`**（不回落到输入侧，避免视频按输入价计费）。

验证：`cargo fmt --check` exit 0；`router-service --lib` 744 passed；35 个 `billing_*` 套件 0 失败。

**仍待人工决策**：2.0/2.0-fast 的 `video_output_second` → `video_output_token` 替换式发布（同一模型不得同时存在两种基准；关闭对账 worker 时只有 token 价会导致创建期无价，故需与 worker 开启同批）；Gemini 缓存存储的时间维度与按小时累计。