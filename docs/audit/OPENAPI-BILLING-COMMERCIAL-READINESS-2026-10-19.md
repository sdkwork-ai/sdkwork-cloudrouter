# Cloud Router Open-API 计费商业化就绪报告（2026-10-19）

> 配套明细与逐条证据：[OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md](OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md)
> 交接单（剩余 10 个的精确复位步骤）：[OPENAPI-BILLING-HANDOFF-2026-10-19.md](OPENAPI-BILLING-HANDOFF-2026-10-19.md)
> Vendor 落地方案与决策：[../design/VENDOR-BILLING-ROLLOUT-DECISIONS.md](../design/VENDOR-BILLING-ROLLOUT-DECISIONS.md)
>
> 覆盖 176 个 open-api operation。结论：**可售 166/176（94.3%）**，其余 10 个全部
> 有明确阻塞原因且 **fail-closed**；不存在"静默免费"或"按错单位收费"的已发布路径。

## 一、状态盘点

| 状态 | 数量 | 计费口径 | 代表端点 |
| --- | ---: | --- | --- |
| Free | 118 | 不预扣、不结算 | 文件/缓存/assistants/threads 消息/conversations/containers/vector store CRUD/uploads/voices/实时控制/stored completions/responses 轮询/异步任务查询/模型列表 |
| Composite（token） | 12 | 输入/输出/缓存写入/缓存读/模态 token | chat、responses、realtime（拒单前）、anthropic messages、gemini generateContent、responses compact |
| ResultCount | 17 | 按产出条数 | 图像生成/编辑/变体、视频任务、Vidu/Kling/火山/Google 媒体 |
| AudioSecond | 4 | 按秒→分钟换算 | STT、音乐生成 |
| VideoSecond | 4 | 按输出秒 | OpenAI 视频、Kling 3.0 |
| Character | 3 | 按输入字符 | OpenAI/ElevenLabs/火山 TTS |
| Token | 3 | 按 embedding token | OpenAI/Gemini embeddings、Gemini batchEmbedContents |
| 可售（模型驱动） | 1 | 矩阵行 ApiRequest，真实请求按分钟 | ElevenLabs sound-generation |
| Storage | 1 | `storage_gb_day` | vector store file 摄取：`$0.10/GB/day`，读 `usage_bytes` |
| 已补价按次 | 3 | `api_request` 目录价 | vector store search $2.50/1k；DeepSeek web tools 5 CNY/1k（global $0.75/1k） |
| **可售小计** | **166** | | |
| 未定价按次 | 5 | `api_request` 缺目录价 ⇒ 预检拒单 | 批量创建、threads runs ×3、vector store `file_batches` |
| 已登记不可售 | 5 | 结果回收/资源绑定缺失 | Anthropic batch 创建、midjourney ×2、nano-banana ×2 |

## 二、已对齐的行业口径（按家族）

1. **模型 token**：输入/输出/推理/缓存读/缓存写/模态 token 各自落独立计量单位；
   缓存价缺失时按输入价兜底（不缺价免单）；上下文分档覆盖显式区间与累计上界
   （15 个旗舰模型全部可售）。
2. **缓存**：Anthropic 5m/1h、Alibaba 显式/隐式、OpenAI realtime/gpt-image 的
   `media_type` 三档均由请求形状或目录档位解析；输入侧预扣取最高价而非三档相加。
3. **按次**：文件/缓存/批量查询/轮询/管理 CRUD 归 Free（行业不按次收费）；真正
   产生上游动作的按次端点保持 ApiRequest，缺价则拒单。
4. **视频/图片/音乐**：按秒/条/张，`n`、`predictions`、`creations`、`sampleCount`
   等契约形状都能量；视频分辨率档位由目录 profile + 请求 `resolution` 决定；
   Kling v2.1 输入模式档位（t2i/i2i/multi_ref）按请求形状选档；上游 2xx 但
   零产出（`data: []` / `result_count: 0`）或业务失败（Kling/Vidu `code != 0`、
   MiniMax `base_resp.status_code != 0`、`error` 对象、`status: failed`）都
   **waive 不收费**，不会按 1 张/条多收。
5. **TTS/STT**：TTS 按字符（二进制响应绕开守卫则拒单）；STT 按分钟（响应时长优先，
   请求时长其次，分钟档按 1 分钟兜底）。
6. **流式**：强制 `stream_options.include_usage`（客户端 false 不能绕过），
   usage-only chunk 从客户端流转发中剔除；EOF 兜底按已观测输出估算；
   流被中断/上游不返 usage 时，输入 token 按请求体估算补记，客户端"首帧后
   断开"不再能让整段 prompt 免单。
7. **可结算性**：批量提交、`background: true`、实时会话创建、token 计价的二进制
   TTS 在预检拒单；其余端点先预扣、后按用量结算/释放。

## 三、逐层回归锁

| 层 | 锁 |
| --- | --- |
| 形态 | `openapi_billing_matrix` + golden TSV（176 行，diff 即计费变更） |
| 数量 | `billing_quantity_families`、`billing_media_entrypoints`、`billing_token_entrypoints` |
| 单价/档位 | `billing_image_tier_resolution`、`billing_context_tier`、`billing_anthropic_cache_write`、`billing_cache_read_modality`、`billing_alibaba_cache`、`billing_modality_token_entrypoints`、`billing_google_modality_tokens`、`billing_image_token_entrypoints` |
| 预扣 | `billing_precharge_estimate`（含输入池取最高价） |
| 可结算性 | `billing_unmeterable_tts`、`billing_unmetered_batch`、`billing_unmetered_async_usage`、`billing_unmetered_realtime` |
| 管理面/轮询 | `billing_unmetered_management`、`billing_openai_management`、`billing_async_task_query` |
| 缺价/防绕过 | `billing_cache_token_fallback`、`billing_unpriced_per_call`、`provider_request` 单测、`invocation_stream` 单测 |
| 目录改写 | `billing_catalog_resolution`、`billing_responses_compact`、`billing_sound_generation` |
| 定价语义 | `billing_music_duration_fallback`（Suno 1 秒/180 秒两态，防止兜底值被顺手改动） |
| 就绪计数 | `commercial_readiness_counts_are_exactly_166_of_176`（176 = 118 + 44 + 1 + 3 + 5 + 5；未定价/已补价集合逐条枚举） |
| 零产出 | `billing_empty_result_waiver`（空数组 / 显式 0 waive；正常 2 张、任务回执 1 条对照） |
| 业务失败 | `billing_business_failure_waiver`（Kling `code != 0` / `status: failed` waive；成功码与 `error: null` 对照） |
| 中断流输入 | `usage_extraction` 单测（缺输入按请求体补值、真实输入不覆盖、Anthropic 字段补值） |
| 服务端工具 | `billing_hosted_tools`（web/file search 各 1 次 + token 行；目录价 $10/1k、$2.50/1k）与 `usage_extraction` 两条计数单测 |
| 向量库检索 | `billing_vector_store_search`（分类器绑定 `openai/vector-stores` 工具 SKU；一次 search = 一次 `api_request`，$0.0025） |
| 批 embedding | `billing_batch_embed`（`RequestBody` 估算 `embedding_input_token`，2 token ⇒ $0.000002；响应无 usage） |
| DeepSeek web tools | `billing_deepseek_web_tools`（search/fetch 各一次成功请求；5 CNY/1k，global $0.75/1k） |
| 货币→Token Bank | `admin_marketing_recharge` 单测（正数未知币种拒付、零金额免费、微积分 ceil）与 `allocate_request_debit_points` fail-closed |
| Token Bank 捕获 | `gateway_billing_contract`（原子 `settle_account_hold`、`settled_amount` 入哈希）+ 账号仓库 2 条部分捕获单测 |
| 厂商时段价 | `invocation_pricing_settlement` 的 time-window 用例（窗口内 `0.5`、窗口外回退 `0.15`，并断言 `matchedWindowCode`；含周末与 include/exclude 日历） |
| 计费未就绪 | `BillingUnavailable` 映射 HTTP 501 + `billing_unavailable` 机器码；batch/background/realtime 拒绝用例改为断言该类型；vector store 摄取在预检前同样 501 |
| Code Interpreter | `billing_code_interpreter`：两个 code cell 折叠为一条 `code_interpreter_session`，$0.03/session；6 个 OpenAI 模型已补目录价 |
| Anthropic web search | `billing_anthropic_web_search`：`usage.server_tool_use.web_search_requests=2` → 数量 2、金额 $0.02；13 个模型已补 $10/1k 费率 |
| 预扣 TTL | `prepay_hold_ttl_is_configurable_and_bounded`：默认 1800 秒，合法值生效，越界/非法回退；上限 86400 |
| Vector store 存储 | `billing_vector_store_storage`：2,000,000,000 bytes → 2 GB-day、$0.20；`storage_gb_day` $0.10/GB/day；缺 `usage_bytes` ⇒ 记账失败（不产 0 元事实）；显式 0 字节 ⇒ waive；file_batches 仍 501 |
| Token Bank 追收 | `gateway_billing_account` 单测 + `gateway_billing_contract`：hold 过期/已释放时按 `hold-expired-capture` 独立幂等后缀记账；释放容忍过期；异步对账识别该后缀；非过期错误仍失败 |
| 超额应收 | `gateway_billing_contract::uncollected_overage_is_recorded_instead_of_being_marked_settled` + edge 单测：hold 已捕获而差额扣费失败时写 `uncollected_overage` 终态，避免 worker 误标已结算 |
| Token Bank 行为回归 | `tests/billing_token_bank_flow.rs`：冻结 → 捕获 → 超额 → 余额不足 402 → 失败释放 → 应收标记，全部断言账户侧金额与动作 |
| 异步完成态结算 | `tests/async_usage_settlement.rs` + worker 单测：完成时重新定价、单笔 postpaid、任务幂等键重放、无用量失败关闭、结算失败重排 |
| 异步创建入队 | `async_usage_registration` 单测（5 条）：background / thread run 登记 + 可轮询 `pollPath`；同步与失败创建不登记；缺 thread id 失败关闭 |
| 异步纵向集成 | `tests/async_usage_reconciliation.rs`：创建登记 → 领取 → 轮询 → 重新定价 → `175000` micro 单笔后扣 → 二次 pass 不重扣 |
| 异步轮询状态机 | `provider_async_usage_executor` 单测（7 条）：完成/运行/失败、404/429/5xx 分流、缺 pollPath/未知账号失败关闭、batch 未实现 |
| 异步轮询传输 | `async_poll_transport` 单测（4 条）：带凭证 GET 走既有 dispatcher、匿名轮询、429 透传、传输失败映射 |
| 异步 worker 配置 | `async_usage_worker_config` 单测（3 条）：默认关闭、越界 clamp、非法值拒绝 |
| Assistants 流式用量 | `usage_extraction` 单测：`thread.run.completed.data.usage` 的输入/输出 token 必须进入结算用量 |

每条锁都有"关掉实现 → 指定用例转红、对照保持绿"的变异证据，记录在主审计文档
第五节的变异表。

## 四、剩余 10 个的阻塞与解除条件

### A. 未定价按次（5）—— 数据项

端点：`POST /v1/batches`、`/v1/threads/runs`、`/v1/threads/{id}/runs`、
`.../submit_tool_outputs`、`/v1/vector_stores/{id}/file_batches`
（另含 Anthropic batch 创建在 B 类）。`POST /elevenlabs/v1/sound-generation`
**不属于此列**：它必填 `model_id`，真实请求按 `audio_output_minute` 结算
（2.41）；`/v1/tools/search|fetch` 已由 DeepSeek 官方 5 CNY/1k 费率关闭（2.54）。

`/v1/vector_stores/{id}/search` 已移出：分类器把它绑定到
`openai/vector-stores` 工具 SKU，按一次 search = 一次 `api_request` 收
`$2.50/1k`（2.51），不再依赖未定价的 management 路由键。
`/v1/vector_stores/{id}/files` 也已移出：按 `usage_bytes` 收首日
`storage_gb_day`（2.64），file_batches 仍缺字节数。

解除条件（sdkwork-models）：为对应 catalog key 发布一条
`meterCode: "api_request"`、`unitPrice > 0` 的官方费率（或按 B 类改成异步后扣）。
网关侧**无需改代码**：`PricingRule.unit_price_override` 可再做合同价覆盖。
批量创建还额外需要结果回收链路（B 类）。

### B. 异步结果回收 / 后台响应 —— 架构项

`POST /v1/batches`、`POST /anthropic/v1/messages/batches`、`background: true` 的
Responses、threads runs：用量只在上游完成后的响应/结果文件里。需要：

1. 创建时持久化 `(tenant, api_key, upstream_id, model, kind)`——表
   `ai_metering_async_task` 已落地（2.50），store（2.52）、注册器（2.55）与
   claim→poll→settle 编排（2.56）已实现；provider executor、应用启动接线与
   注册拦截器尚未完成；
2. worker 定期拉取完成态，解析 usage（batch 需流式读 JSONL）；
3. 以 `response_id` / `batch_id` / `custom_id` 为幂等键走后扣结算；
4. 余额不足记应收而不是丢账。

在 worker 落地前维持拒单，避免"免费送整批算力"。

### C. 资源/绑定缺失（4）—— 功能项

`midjourney` 与 `nano-banana` 的生成/轮询：本仓没有对应资源、账号绑定与目录模型。
需要先补资源（endpoint/resource descriptor + 账号能力），再按图像条数计费。

### D. taxonomy/价目（0，已关闭）

`gemini:batchEmbedContents` 已接入：taxonomy 路由
`gemini.batch_embed_contents`、resource `api.gemini.batch_embed_contents`、
分类臂与 `RequestBody` 估算（`embedding_input_token`）全部落地，见主审计 2.53。
响应无 usage 时按请求文本估算，并已在测试中钉住 2 token ⇒ $0.000002。

### E. 存储/会话计量（3 类）

vector store file 首日存储已按 `storage_gb_day` 收（2.64），但长生命周期文件的
按天 worker 仍未实现；container session / file storage 仍无费率。补齐后需新增
“按天累计”的计量 worker（与 B 同类基础设施）。

### F. 实时语音 WebSocket（1 类）

`/v1/realtime` WebSocket：需要 WS 代理 + 帧级音频计量 + 会话结束结算；当前对
HTTP 创建面拒单，避免未计量放行。

### G. 服务端工具（DeepSeek 以外）

`web_search_call` / `file_search_call` 已补齐：6 个在售 OpenAI chat 模型各两条
official 费率（`$10/1k` / `$2.50/1k`），抽取侧从 `output[]` 与流式
`response.output_item.done` 计数，`tests/billing_hosted_tools.rs` 钉住完整链路
（第 30 把锁）。`/v1/vector_stores/{id}/search` 由 `openai/vector-stores` 工具 SKU
按次收 `$2.50/1k`（第 31 把锁）；DeepSeek `/v1/tools/search|fetch` 由
`deepseek/web_tools` SKU 按成功请求收 5 CNY/1k（第 33 把锁）。
`code_interpreter_session` / `container_session` 仍无费率与产出点，继续
fail-closed 或留给下一轮，不凭空收费。

## 五、定价语义风险（已锁定、待目录确认）

这些不是"不可售"，而是**数值口径待确认**；锁先固定当前行为，避免被顺手改动：

| 项 | 当前行为 | 风险 |
| --- | --- | --- |
| Suno `music_output_second` | 未声明 `duration` ⇒ 1 秒 / $0.02 | 目录 $0.02/秒（≈$1.20/分钟）与"按首"量级冲突；改 60 秒会 60× 多收，维持 1 秒则长曲少收。`billing_music_duration_fallback` 钉住当前值 |
| 原生视频未声明时长 | 1 秒兜底 | 视频 profile 有 `minDurationSeconds`，但 `PricingCatalog` 端口未暴露；需端口扩展后才能按最小档兜底 |
| STT 非 `verbose_json` | 1 分钟兜底 | 长音频少收；强制 `verbose_json` 会改变响应契约，需产品确认 |
| `cache_control` 契约 | 请求体标记推导显式/隐式缓存 | 供应商换标记名会按隐式价（多收 2× 缓存读） |
| `stream_options` | 对 OpenAI 兼容面强制注入 | 个别兼容上游可能拒绝未知字段 |
| 中断流输入 token | 按请求体估算（ASCII 4 字符/token、宽字符 1.33 字符/token） | 估算值与真实 tokenizer 有偏差；方向是"补记而非免单"，真实 usage 到达时不覆盖 |
| 厂商时段价节假日 | 工作日 peak / 其余与周末 off-peak；`includeDates` / `excludeDates` 为空 | 工作日法定节假日仍按 peak 计；需要 vendor 日历数据写入目录，已在主审计 2.59 标记 |
| Vector store `usage_bytes` | 按契约"单文件存储字节"收首日 GB-day | 若上游把该字段填成**整库总量**，连续摄取会按总量重复计费；需契约/目录确认字段语义，并在按天 worker 落地时改为增量 |
| Hold 过期 | 过期/已释放时按 `hold-expired-capture` 追收 | 追收仍受可用余额约束；余额不足时该笔转为待对账事实，需要开启 settlement worker 才会重试 |
| 预付超额（actual > hold） | 先捕获 hold；差额扣费失败时写 `uncollected_overage` 终态（status 4） | 差额不会自动重试（需要运营按应收清单追收）；但不会再被 worker 误标"已结算"而静默消失 |
| Postpaid 扣费失败 | 事实保持 pending，worker 充值后重试 | 依赖 settlement worker 启用；默认关闭时只停留在待结算清单 |

## 六、验证基线（2026-10-19）

| 项 | 结果 |
| --- | --- |
| 计费 test target | **62 个 target / 422 passed / 0 failed** |
| router-service `--lib` | **628 passed** |
| router-service 全量 | **175 个 target / 1816 passed / 2 failed（payment SQL contract，HEAD 既有，与计费无关）** |
| edge-runtime `--lib` | **100 passed** |
| 既有红目标（非计费） | `postgres_payment_intent_runtime_sql_contract` 2（退款 SQL 列/状态词汇已变更，测试未同步；支付域，需人工确认后修）。原 `upstream_route_selector` 4 已按新定价契约修正（见主审计 2.75） |
| clippy（两 crate，`--lib --tests`） | 0 |
| `cargo fmt --check` | 干净（edition 2021） |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs` | **passed**（81 arms / 64 codes；83 endpoints；122 OpenAI-compatible ops 全有分类臂） |
| 数据库初始化 | `pnpm db:validate` 通过；`pnpm db:plan` 显示 `pending_migrations: ["0046_ai_metering_async_task"]` 且 exit 0；schema registry / baseline / contract / manifest 已同步（`ai_metering_async_task`，39 张物化表） |
| sdkwork-models 目录 | 6 个 OpenAI 模型 12 条 tool 费率 + `openai/vector-stores` + `deepseek/web_tools`；`validate-catalog` / `catalog-audit` / `unreachable --check` 通过，`migrate-pricing-v2` 0 待迁移 |

## 七、商业化结论

* **166 个 operation 已可按行业口径直接售卖**，每一族都有形态/数量/单价/预扣/
  可结算性/流式/缺价回退/防绕过锁。
* **10 个 operation 不可售但有明确原因与解除路径**，全部 fail-closed，不会产生
  "客户免费用、平台付成本"的静默漏洞。
* 距离"176 全对齐"还差：sdkwork-models 的 5 条 `api_request` 费率（批量/线程 runs/
  file_batches）、异步结果回收 worker（batch / background Responses / threads runs）、
  midjourney/nano-banana 资源，以及实时 WS 与按天存储计量两块基础设施。这些都不是
  计费逻辑本身的偏差。

## 八、复跑命令

```bash
cargo test -p sdkwork-cloudrouter-router-service --test openapi_billing_matrix \
  --test billing_media_entrypoints --test billing_token_entrypoints \
  --test billing_modality_token_entrypoints --test billing_image_token_entrypoints \
  --test billing_google_modality_tokens --test billing_image_tier_resolution \
  --test billing_context_tier --test billing_anthropic_cache_write \
  --test billing_cache_read_modality --test billing_alibaba_cache \
  --test billing_unmeterable_tts --test billing_unmetered_batch \
  --test billing_unmetered_async_usage --test billing_unmetered_realtime \
  --test billing_unmetered_management --test billing_openai_management \
  --test billing_async_task_query --test billing_responses_compact \
  --test billing_sound_generation --test billing_unpriced_per_call \
  --test billing_quantity_families --test billing_catalog_resolution \
  --test billing_precharge_estimate --test billing_cache_token_fallback \
  --test deepseek_web_tools_billing --test invocation_billing_policy \
  --test invocation_usage_extraction --test invocation_billing_contract \
  --test invocation_pricing_settlement --test invocation_usage_recording \
  --test invocation_provider_adapter_dispatch --test gateway_billing_contract \
  --test ai_route_taxonomy --test openai_contract \
  --test openai_contract_classification_coverage --test invocation_pipeline \
  --test invocation_streaming_usage

cargo test -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-edge-runtime --lib
cargo clippy -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime --lib --tests
node tools/check-cloudrouter-ai-routing-consistency.mjs
```

## 九、条件可售（部署开关）

以下 operation 的计费代码已完成并有回归，但可售性取决于部署是否启用异步对账 worker（`SDKWORK_CLOUDROUTER_ASYNC_USAGE_WORKER_ENABLED`，默认关闭）：

| operation | 启用 worker 时 | 关闭 worker 时 |
| --- | --- | --- |
| `POST /v1/responses` + `background:true` | 放行；完成态按实测 token 重新定价并单笔 postpaid 扣费 | 预检拒单，且注册拦截器不挂载（不入队） |
| `POST /v1/threads[/{id}]/runs`（带 `model`） | 按 Composite token 计费并入队；完成态 `thread.run.completed.data.usage` 结算 | 不入队；无 `model` 时仍因目录无 `api_request` 价而拒单 |
| `POST /v1/batches`（OpenAI） | 创建按 Free 放行；完成态下载结果文件，按每个 (model, endpoint) 行重新定价并逐笔 postpaid | 创建仍是 ApiRequest，预检拒单且不入队 |
| `POST /anthropic/v1/messages/batches`（Anthropic） | 同上，读取 esults_url 的 JSONL；仅 esult.type=succeeded 的行计费 | 同上，预检拒单 |

两条不变量已由代码强制：**入队与结算同开关**、**放行与可结算同开关**，不存在接单但不收钱的时间窗。batch（OpenAI/Anthropic）已在本节范围内：创建按 Free 放行，完成态按结果文件逐行扣费。`file_batches` 仍 fail-closed，等待逐文件字节对账。