# Open-API 计费口径逐接口对齐审计（2026-10-18）

> 范围：`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json` 发布的**全部 176 个 operation**。
> 目标：每个接口的计费档（`BillingMode`）、计量单位（`BillingMeter`）、数量来源（`BillingQuantitySource`）都落到行业专业口径，可以按此商业化售卖。
> 配套可执行口径：`services/sdkwork-cloudrouter-router-service/tests/openapi_billing_matrix.rs` + `tests/golden/openapi_billing_matrix.tsv`。
> **商业化就绪总报告（166/176 可售、10 个阻塞项与解除条件）**：[OPENAPI-BILLING-COMMERCIAL-READINESS-2026-10-19.md](OPENAPI-BILLING-COMMERCIAL-READINESS-2026-10-19.md)。
> **交接单（复现命令与逐项复位步骤）**：[OPENAPI-BILLING-HANDOFF-2026-10-19.md](OPENAPI-BILLING-HANDOFF-2026-10-19.md)。
>
> **2026-10-19 第 9 轮补充**：新增 2.21（Google/Gemini 逐模态令牌）与 `billing_google_modality_tokens.rs`（7 个用例），并修掉 `pricing_meters` 的"目录改写后重解析缩表"缺陷。
>
> **2026-10-19 第 10–22 轮补充**：新增 2.22（token 计价的二进制语音合成必须在派发前拒单）、2.23（批量提交在结果回收前必须拒单）、2.24（`background: true` 在用量回填前必须拒单）、2.25（实时语音在 WebSocket 代理落地前必须拒单）、2.26（图像单档位费率必须可解析）、2.27（Anthropic 缓存写入必须按 TTL 档位计价）、2.28（上下文分档 token 费率必须可解析）、2.29（缓存读必须按逐行模态计价）、2.30（Alibaba 显式/隐式缓存读必须可区分）、2.31（输入侧预扣取最高价不求和）、2.32（累计上界档位词汇）、2.33（流式 Chat 必须索取 usage）、2.34（usage-only chunk 不透传）、2.35（图像输入模式档位）、2.36（管理面归 Free）、2.37（OpenAI 管理/CRUD 归 Free）、2.38（异步轮询归 Free）、2.39（管理面几个"过度排除"的端点归 Free）、2.40（Responses 压缩按 token 计费）、2.41（音效按分钟计费已生效）、2.42（容器文件归 Free）、2.43（未定价按次端点不得静默免费）、2.44（音乐时长兜底歧义显式化）、2.45（就绪计数锁 165/176）、2.46（零产出必须 waive）、2.47（2xx 业务失败必须 waive）、2.48（中断流补输入估算）、2.49（服务端工具按次计费）、2.50（异步对账表与数据库初始化）、2.51（向量库检索按次计费）、2.52（异步对账 store）、2.53（批 embedding 按请求 token 估算）、2.54（DeepSeek web tools 按成功请求计费）、2.55（异步注册器）、2.56（异步 worker 编排）、2.57（货币→Token Bank 严格换算）、2.58（hold 原子捕获）、2.59（厂商时段价）、2.60（计费未就绪返回 501）、2.61（Code Interpreter 会话计费）、2.62（Anthropic web search 按次）、2.63（预扣 hold TTL 可配置）与二十四个测试文件（5+5+6+6+5+4+7+4+4+4+3+2+1+1+2+2+4+4+1+1+1+1+1+1 个用例，另在 precharge 文件新增 2 条、provider_request 单测 4 条、stream 过滤单测 5 条、usage_extraction 单测 5 条、async registrar 单测 2 条、async worker 单测 3 条、account hold 单测 2 条、overage split 单测 1 条、time-window 单测 3 条、BillingUnavailable 单测 1 条）。回归合计 **287** 个计费用例 + router-service `--lib` **598** 个单测全绿 + edge-runtime `--lib` **99** 个单测全绿。

> **2026-10-19 第 44 轮补充**：批处理对账全链路落地（创建门控 + 结果文件下载 + 按 `(model, endpoint)` 逐行结算 + 行级幂等键），详见 2.79；剩余唯一非 Deprecated 缺口是 `file_batches`（2.80）。计费套件 **62 targets / 423 passed**，全量 **175 targets / 1817 passed / 2 failed**（仅 payment 域）。
>
> **2026-10-19 第 31 轮补充**：新增 2.77（`async_usage_reconciliation` 纵向集成：入队 → 领取 → 轮询 → 重新定价 → `175000` micro 单笔后扣 → 幂等终态）。计费回归 **61 targets / 419 passed**。
>
> **2026-10-19 第 30 轮补充**：新增 2.76（异步对账 worker 运行配置 `AsyncUsageWorkerConfig`：默认关闭，interval/batch/lease/retry/max-attempts 全部有界，非法值降级为关闭而不是带着错误参数启动）。router lib **621**。
>
> **2026-10-19 第 29 轮补充**：新增 2.75（`upstream_route_selector` 4 条旧定价门禁用例按新契约修正：缺采购价不阻断、无目录费率仍 fail-closed）。全量回归 **175 targets / 1817 passed / 2 failed（payment 域，HEAD 既有）**。
>
> **2026-10-19 第 28 轮补充**：新增 2.74（`PipelineAsyncPollTransport`：把轮询表达为合成 Free `GET` 调用、复用既有 `InvocationDispatcher` 的 TLS/代理/出站策略/超时/响应上限；带账号凭证的 GET 由 `ProviderRequestBuilder` 注入）。router lib **618**。
>
> **2026-10-19 第 27 轮补充**：新增 2.73（异步轮询执行器核心 `ProviderAsyncUsageExecutor` + `AsyncUsagePollTransport` 端口：账号/凭证解析、状态机判定、404/429/5xx 分流、batch 明确未实现）。router lib **614**。
>
> **2026-10-19 第 26 轮补充**：新增 2.72（异步创建注册拦截器 + 可轮询路径 `pollPath`；创建失败不登记、缺 id/thread id 失败关闭）。router lib **607**。
>
> **2026-10-19 第 25 轮补充**：新增 2.71（异步任务完成态计价/扣费核心 `ReplayAsyncUsageSettler`：完成时重新定价 + postpaid 单笔扣费 + 幂等重放 + 无用量失败关闭；任务表 metadata 持久化创建期上下文）。基线 **62 个计费 target / 422 passed**、router lib **602**。
>
> **2026-10-19 第 24 轮补充**：新增 2.70（Token Bank 扣费链路行为级回归 `billing_token_bank_flow`，5 条：冻结/捕获/超额/402/释放/应收）。基线 **59 个计费 target / 415 passed**。
>
> **2026-10-19 第 23 轮补充**：新增 2.64（vector store 首日存储，166/176）、2.65（存储字节数缺失必须 fail-closed、显式 0 字节 waive）、2.66（结算时 hold 已过期 ⇒ 按 ledger 追收，不再丢单）、2.67（Assistants 流式的 usage 在 `data` 下，必须读取终态事件）、2.68（Threads runs 带 `model` 时是 token 计费，不是永远不可售）、2.69（预付超额扣费失败写成待收应收，不得被 worker 当成已结算）。同时修正 `invocation_classification` 的 DeepSeek 工具 SKU 断言（分类器已绑定 `deepseek/web_tools`）。完整计数见第六节回归矩阵。

## 一句话结论

176 个 operation 全部可分类、全部有确定计费形态：**109 个按次**（其中 24 个是无专属计量单位的通用请求）、**11 个复合 token**、**3 个 embedding token**、**7 个图片张**、**10 个视频条 + 4 个视频秒**、**2 个音乐秒**、**3 个 TTS 字符**、**2 个 STT 分钟**、**2 个免费**。累计修掉 **21 类**会让"上游成本"与"对客收费"脱钩的偏差（2.1–2.21），剩余 24 个无计量单位端点已逐个登记原因。

**商业化判断看五个面，缺一不可**：形态（按什么单位收）、数量（这个单位量出多少，**逐接口**而非逐家族）、**单价（同一个数量有没有落在正确的计量单位上——音频 token 与文本 token 差 8 倍）**、预扣（派发前冻结多少）、可结算性（声明了数量来源就一定要能被抽取）。五个面各有可执行锁，合计 **418 个计费测试 + 602 个 router lib 测试**；数量层、预扣层、模态层、厂商形状层、可结算性守卫层都做过变异自证（见第六节）。

## 一、家族分布（快照统计）

| 计费档 | 计量单位 | 数量 | 代表接口 |
| --- | --- | --- | --- |
| `ApiRequest` | `api_request` | 109 | `/v1/moderations`、`/v1/files`、`*.task_query`、`/v1/tools/*` |
| `ExternalUsageLine` | 无（通用请求兜底） | 24 | `/midjourney/v1/images/generations`、`/anthropic/v1/files`、`/google/v1beta/cachedContents` |
| `Composite` | `llm_input_token`（+output/cache） | 11 | `/v1/chat/completions`、`/v1/responses`、`/anthropic/v1/messages`、`gemini:generateContent`、`typesafe/v1/systemone` |
| `ResultCount` | `video_result` | 10 | `kling`/`vidu`/`volcengine`/`gemini:generateVideos` 视频任务 |
| `ResultCount` | `image_result` | 7 | `/v1/images/*`、`kling`/`volcengine`/`vidu`/`gemini` 图像 |
| `VideoSecond` | `video_output_second` | 4 | `POST /v1/videos`、`/v1/videos/{edits,extensions,{id}/remix}` |
| `Character` | `tts_input_character` | 3 | `/v1/audio/speech`、`elevenlabs` TTS、`volcengine/api/v3/audio/speech` |
| `Token` | `embedding_input_token` | 2 | `/v1/embeddings`、`gemini:embedContent` |
| `AudioSecond` | `stt_audio_minute` | 2 | `/v1/audio/transcriptions`、`/v1/audio/translations` |
| `AudioSecond` | `music_output_second` | 2 | `suno`、`minimax` 音乐 |
| `Free` | — | 2 | `GET /v1/models`、`GET /v1/models/{model}` |

> **声明形态 ≠ 运行时可用**：第 10 轮起，四类"用量不进入被计费响应"的路由在预检**拒单**
> （2.22 token 计价的二进制 TTS、2.23 批量提交、2.24 `background: true`、2.25 实时语音创建面）。
> 它们在矩阵里的计费形态仍然正确，但当前**不可售**；拒单是刻意的商业化边界（不可售 ≠ 免费送），
> 不是回归。恢复路径分别见第七节第 9、11、13、15 条。

## 二、本轮修掉的偏差（before → after）

### 2.1 供应商原生媒体路由被压成"按次"

`BillingPolicyInterceptor` 对所有非流式 provider-native 请求一律产出 `ExternalUsageLine + FixedRequest`，即"一次调用一个 `api_request`"。taxonomy 明明写着 `suno.music_generation → music_output_second`、`vidu.text_to_video → video_result`，计费侧却从不按这个单位结算——上游按秒/按张收，对客按次收，量级差异随生成规模线性放大。

修复：`billing_policy.rs` 新增 `declared_media_meter_policy()`，当路由**声明的计量单位**属于"响应可测量产物"（`is_response_measured_media_meter` allow-list）时，用 `measurement_profile_for_catalog_meter()` 换上对应计量档。allow-list 是刻意的：token/存储类也有 profile，但 Thread/Conversation 这类管理端点只是**声明**了 LLM 计量单位以便目录定价，必须继续按次。

| 接口 | before | after |
| --- | --- | --- |
| `POST /suno/v1/music/generations` | `ExternalUsageLine` / `ApiRequest` / `FixedRequest` | `AudioSecond` / `MusicOutputSecond` / `ResponseBody` |
| `POST /minimax/v1/music_generation` | 同上 | 同上 |
| `POST /elevenlabs/v1/text-to-speech/{voice_id}` | 同上 | `Character` / `TtsInputCharacter` / `ResponseBody` |
| `POST /volcengine/api/v3/audio/speech` | 同上 | 同上 |
| `POST /kling/v1/videos/generations` | 同上 | `ResultCount` / `VideoResult` / `ResponseBody` |
| `POST /vidu/ent/v2/{text2video,img2video,reference2video,start-end2video,template}` | 同上 | 同上 |
| `POST /volcengine/api/v3/contents/generations/tasks` | 同上 | 同上 |
| `POST /google/v1beta/models/{model}:generateVideos` | 同上 | 同上 |
| `POST /kling/v1/images/generations` 等 4 个图像面 | 同上 | `ResultCount` / `ImageResult` / `ResponseBody` |

### 2.2 OpenAI 视频面按次而非按秒

`POST /v1/videos` 一条路由可能渲染 4 秒 720p，也可能 20 秒 1080p，按次计费把上游成本与对客收费彻底解耦。OpenAI Sora 官方就是按输出秒计价。

修复：`openai_classifier.rs` 里 `POST /v1/videos` 改用 `create_api_with_meter(..., VideoOutputSecond)`；`/v1/videos/edits`、`/v1/videos/extensions`、`/v1/videos/{id}/remix` 同样按秒（它们都产出新视频）；素材/管理面（`/v1/videos/characters`、`GET /v1/videos/{id}`）保持按次。

### 2.3 STT 用"秒"而不是"分钟"

`stt_audio_minute` 的 `unit_size = 1` 意为"每 1 分钟"，而抽取层给的是秒。若不换算，12.5 秒会按 12.5 分钟计价（实收 60 倍）。

修复：`/v1/audio/transcriptions`、`/v1/audio/translations` 的计量单位改为 `SttAudioMinute`，并由既有的 `duration_in_meter_unit()` 做秒→分钟换算。

### 2.4 视频无响应时长时一律回落 1 秒

异步视频创建调用返回的是任务对象，响应里没有时长；原实现直接回落 `"1"`，一条 10 秒视频只收 1 秒。

修复：`usage_extraction::video_line` 增加**请求侧时长**回落（`request_seconds_field`，同时接受 `"8"` 字符串与 `8` 数字，且过滤非正值），顺序为「响应 → 请求 → 1 秒兜底（并打 warn）」。

### 2.5 按次路由的 mode 与声明不一致

taxonomy 说 `*.task_query` 是 `api_request`，但策略层走 `Some(_)` 分支产出 `ExternalUsageLine`——金额相同，但上报的计费档不是路由声明的那个，账务对账时会出现"声明按次、结算按外部用量行"的假象。

修复：`provider_native_non_streaming_policy` 显式处理 `Some(BillingMeter::ApiRequest) => api_request_policy()`。

### 2.6 反向修正：不要过度升级

首版覆盖规则写成"只要声明了 llm token 就升级为 token 计费"，结果 `GET /v1/threads/{id}`（Thread 管理面）被当成 LLM 调用。修复方式是 2.1 的 allow-list——只捕获"响应里能数出产物"的媒体计量单位。复测确认 threads / conversations / assistants / vector_stores 全部回到 `ApiRequest / FixedRequest`。

## 三、刻意保留的三个决策（不是遗漏）

### 3.1 供应商原生视频任务保持"按条"（`video_result`）

`kling` / `vidu` / `volcengine` / Veo 的创建调用**不返回时长**，任务查询面才产出视频；请求侧只有部分厂商给数值时长（火山把时长写在 prompt 的 `--dur` 里，不是结构化字段）。此时改成按秒只会退化成"1 秒兜底"，比按条少收一个数量级。这几家上游与中转站的价目表本身就是「按条 × 时长档」，用 SKU 名区分 5s/10s 是行业通行做法。

真正能拿到时长的 OpenAI 面已经改成按秒（见 2.2）。

### 3.2 `elevenlabs.sound_generation` 的路由声明保持按次

ElevenLabs 的 SFX 响应是**二进制音频**，既没有条数也没有时长可测；按次与按条在数量上等价（都是 1）。注意这里说的是**路由声明**：`pricing_identity` 的记录显示 sdkwork-models 为该路由定义了 `audio_output_minute`，一旦目录参与对账，计费配置会被改写成"按分钟"（`apply_pricing_identity`），此时数量来自请求的 `duration_seconds`（ElevenLabs SFX 支持该参数），未指定则按 1 秒兜底。两条路径都已由抽取层覆盖，但**目录侧没有 `audio_output_minute` 费率时**才会停留在按次——这条差异属于目录范围，不在本仓。

### 3.3 Thread/Conversation 的 Run 无 `model` 时按次

`POST /v1/threads/{id}/runs` 有 `model` 时走 `Composite`（token），无 `model` 时（继承 assistant 的模型）走 `api_request`——分类期看不到上游实际模型，强行升级会让定价 key 解析失败并 fail-closed。

### 2.7 音乐/语音的时长读不到真实值（按秒却只收到 1 秒）

把音乐、语音切到按秒计费之后，`audio_line` 仍然只读**顶层** `duration`。而真实上游的时长是嵌套的：

| 上游 | 响应形状 | 旧行为 |
| --- | --- | --- |
| Suno | `{"data": [{"duration": 118.4}, {"duration": 102.6}]}` | 顶层无 `duration` ⇒ 收 1 秒（一条 3 分钟的曲子少收 ~120 倍） |
| MiniMax | `{"extra_info": {"music_duration": 30000}}`（**毫秒**） | 顶层无 ⇒ 收 1 秒 |
| 部分聚合商 | `{"data": [{"metadata": {"duration": 95.5}}]}` | 顶层无 ⇒ 收 1 秒 |

修复（`usage_extraction::reported_audio_seconds`）：
1. 顶层 → `usage`/`extra_info`/`metadata`/`result` 容器 → `data[]`/`clips[]`/`songs[]` 逐元素，三层都找；
2. `data[]` 的时长**求和**（客户拿到的是每一个 clip，不是其中一个）；
3. 毫秒字段（`duration_ms`/`music_duration`/…）单独一张表，除以 1000——把 30000 当秒就是给 30 秒的曲子收 8 小时；
4. 响应都没有时回落到**请求侧**时长，最后才是 1 秒兜底。

### 2.8 TTS 只认扁平 `input`，火山 Ark 的合成被收成 1 个字符

火山 Ark 的语音合成把提示词包在对象里：`{"input": {"text": "你好世界", "voice": "..."}}`。`request_character_count` 只读 `input` 的**字符串**形态，读到对象即放弃 ⇒ 回落 1 个字符。修复：`input`/`text` 取到值后再尝试 `.text`，两种形态都认。

### 2.9 预扣只冻结 1 个单位（余额不足也能下单长视频）

形态对了、数量也对了，账还有第三个洞：**派发前冻结多少**。预扣发生在响应之前，拿不到 `usage`，只能从请求体估下界。原实现对 token 类有估算（`max_tokens × n`），其余一律 `_ => 1`：

```rust
// 修复前
_ => 1,
```

后果按家族排列：视频请求写 `seconds: "20"` 只冻结 1 秒的金额、TTS 写 200 字只冻结 1 个字符、`n: 4` 的图片只冻结 1 张。**预付余额只够 1 秒的账号可以成功下单 20 秒视频**，超额部分在结算环节才暴露——上游成本已经发生，钱收不回来。

修复落在 `billing_transaction.rs`：新增 `conservative_media_units(meter, request_body)`，按计量单位从**请求**读声明量：

| 计量单位 | 预扣数量来源 |
| --- | --- |
| `video_output_second` / `video_input_second` | 请求 `seconds` / `duration`（含 `"8"` 字符串形态） |
| `music_output_second` / `audio_*_second` | 同上 + 毫秒拼写（`music_duration: 30000` ⇒ 30 秒）+ 嵌套容器 |
| `audio_*_minute` / `stt_audio_minute` | 秒 ÷ 60，**保留小数**（12 秒 = 0.2 分钟） |
| `tts_input_character` / `speech_character` | `character_count_in`（扁平 `input` 与 Ark `{"input":{"text":...}}` 都认） |
| `image_result` / `video_result` / `api_result` | 请求 `n` / `count` / `num_images` |
| 其余（token 类、按次） | 回落 `conservative_quantity`（`max_tokens × n`，或 1 单位） |

两个刻意的设计点：

- **分钟档不向上取整**。取整成 1 分钟会让 12 秒请求多冻结 5 倍余额，用户明明付得起却被拒。`DecimalValue` 的分数乘法保证 0.2 分钟精确落到「数量 × 单价 ÷ 单位」。
- **预扣不依赖 `quantity_source`**。视频秒的结算量确实来自响应（`ResponseBody`），但预扣必须只看请求也能定下界——不能用「数量来源是响应」作为「无法预扣」的借口。

同时删掉了 `InvocationBilling::prepaid_required`：该字段在 src 里 16 处全写 `false`、无人读，「是否预扣」实际由账号的 `AccountBillingMode`（Prepay/Postpay）决定。留着一个看起来能关掉预扣的开关，只会让人以为端点可以豁免预扣。

### 2.10 结果数组名不全：Google 要 4 张只收 1 张

`result_line` 只认 `data` / `results` / `images` / `items` / `videos` 五个数组名。但**已发布契约**里还有两个：

| 契约 schema | 结果数组名 | 受影响入口 |
| --- | --- | --- |
| `GeminiImageGenerationResponse` | `predictions` | `POST /google/v1beta/models/{model}:generateImages` |
| `ViduImageGenerationTask` / `ViduVideoGenerationTask` | `creations` | `vidu.reference_to_image`、`vidu.img2video` 等 |

数组名不在表里 ⇒ 读不到长度 ⇒ 回落到请求的 `n` ⇒ Google 请求不带 `n`（它用 `parameters.sampleCount`）⇒ **恒收 1 张**。Vidu 一次返回 2 个 creation 也只收 1 个。

修法：`RESULT_ARRAYS` 补两个名字 + 新增 `REQUEST_RESULT_COUNT_FIELDS`（含 Google 塞在 `parameters.sampleCount` 的嵌套形态，由 `request_result_count` 二层查找）。

⚠️ **别把 `content` 加进来**：`VolcengineContentGenerationTask.content` 是任务的内容分段（提示词/参考图），不是产出条数。

### 2.11 媒体容器只扫一层：MiniMax 的官方形状是两层

`reported_audio_seconds` 只遍历**顶层**的 `usage` / `extra_info` / `metadata` / `result` / `audio` 容器。而 MiniMax 音乐在契约里的形状是：

```json
{"base_resp": {...}, "data": {"audio": "...", "status": 2,
                             "extra_info": {"music_duration": 30000}}}
```

`data.extra_info.music_duration` 是**两层**。只扫一层 ⇒ 读不到 ⇒ 一首 30 秒的曲子只收 1 秒。

修法：抽出 `nested_media_seconds`（0/1/2 层扫描，容器键补 `data` / `output`），结算与预扣两侧共用，避免"预扣读 12 秒、结算读 30 秒"的口径漂移。

🔴 **这条是被"假绿用例"掩护着的**：原来的 Music 用例喂的是顶层 `{"extra_info": {...}}`——一个**契约里不存在**的形状。测试绿着，生产收错。教训：媒体形状的夹具必须照抄 OpenAPI schema，见 [`tests/billing_media_entrypoints.rs`](../../services/sdkwork-cloudrouter-router-service/tests/billing_media_entrypoints.rs) 的文件头。

### 2.12 兜底值不在计量单位的量级上：30 分钟转录收 0.0167 分钟

`audio_line` 读不到时长时按 **1 秒**兜底，再由 `duration_in_meter_unit` 换算成分钟 ⇒ `1/60 = 0.0167`。

何时会读不到？OpenAI STT 的 `response_format: "text"`（响应是纯文本，不是 JSON）、以及不实现 `usage.seconds` 的兼容实现。**一段 30 分钟的转录会被结算成 0.0167 分钟**——少收三个数量级，是全系统最贵的一个兜底。

修法：兜底值按计量单位自己的量级取 `fallback_duration_seconds(meter)`——分钟档 = **60 秒（1 分钟，最小计费单位）**，秒档 = 1 秒。方向始终保守（宁可少收一点点，也不放走整段音频）。

视频的 1 秒兜底**不动**：`video_output_second` 的最小单位本来就是 1 秒，已经在自己量级上。

### 2.13 空结果数组被请求的 `n` 覆盖：产出 0 张却按 4 张收

`RESULT_ARRAYS` 的长度统计会把空数组过滤掉（`.filter(count > 0)`），于是上游明确回 `{"data": []}` 时又回落到请求的 `n = 4` ⇒ **产出 0 张、收 4 张的钱**。

修法：`present_result_array_length` —— 数组**存在**即以其长度为准（含 0，最后统一 `.max(1)` 落到 1 单位的下限）；数组**不存在**才回落到请求声明。

### 2.14 `RequestBody` / `ResponseHeaders` = 声明即免单

抽取层对这两个数量来源是 `Ok(())`（不产行），结算层见空行直接 `return Ok(())`。两句合起来：**谁把某路由声明成它们，该路由就永久免单，且上线不报错**——上游花了钱，账上一分不记。

`RequestBody` 已在 2.53 实现（Gemini `batchEmbedContents` 按请求文本估算
embedding token）；`ResponseHeaders` 仍无实现，当前 176 个 operation 也没有
任何计费路由声明它。源码在 `ResponseHeaders` 分支保留显式警示注释，
`billable_operations_never_declare_an_unimplemented_quantity_source` 继续把它
判红，逼改动方先实现抽取分支。

### 2.15 流到 EOF 却没见到 usage 帧 ⇒ 整条免单

流式结算走的是另一条取数路径（`StreamingUsageAccumulator` → 终态 `usage_body` → `record_streaming_usage_body`），它只看**上游发没发 usage 帧**。上游没发时终态是 `Completed { usage_body: None }`，管线随即 `fail_terminal("did not include usage")`：**客户端已经完整收到响应，账上一分不记**，而且这条失败发生在响应之后，前端与调用方都看不到。

这不是边缘场景：`stream_options.include_usage` 是网关在中继路径上**注入**的（`chat_completion_stream_headers`），凡是不走中继、或上游忽略该字段的兼容实现，整类请求都会免单。

累加器本来就有保守下界（按观测到的输出文本估 token，`partial_usage_body`），中途中止路径一直在用它，只是**正常 EOF 不用**。

修法：`invocation_stream.rs` 的 EOF 分支在 `finish()` 返回 `None` 时回落到 `partial_usage_body()`。方向明确——低估只影响一轮、下一轮可修正；免单是不可恢复的收入损失。输入侧仍记 0（无法从流里重建，不虚构）。

同轮修掉两个同类的"输出文本抓不到"盲点：`observe_streamed_output` 只认 OpenAI `choices[].delta.*` 和 Anthropic `content_block_delta`，而 **Gemini** 的输出在 `candidates[].content.parts[].text`、**OpenAI Responses** 的输出在事件顶层 `delta`（`response.output_text.delta`）。两处都没统计 ⇒ 即便加了回落，估算仍恒为 0，照样免单。

### 2.16 流式兜底只认 `usage`，Gemini 的 `usageMetadata` 读不到

`streaming_usage_body`（`after` 钩子的兜底入口）判断"这个 body 里有没有用量"时只查 `usage`。Gemini 的键是 `usageMetadata`，于是返回 `None` ⇒ 不产行。而"没有用量行"在下游读起来是"这次没有可结算的量"，不是"计量失败"——**静默**。

`extract_composite_usage_from_body` 一直两个键都认，所以只有兜底路径有这个洞。修法：判断条件改成 `usage` **或** `usageMetadata`。

> ⚠️ 方法论教训：这一轮我第一版探针把整段 SSE 文本直接塞进 `response.body` 再跑 `UsageExtractionInterceptor`，四条流式用例全部 `usage_failed`，看起来像"流式计费坏了"。真实原因是探针**跳过了 `PayloadExtractionInterceptor`**——`stream: true` 是靠它把形状定成 `SseStream`，计费策略才会选 `StreamingAccumulator`。没走这一步，策略留在非流式 `Composite`，自然去把 SSE 文本当 JSON 解析。**判流式缺陷必须按生产顺序 payload → policy → 累加器 → 结算。**



### 2.17 🔴 客户端一个 `stream` 标志就能让媒体调用免单（可触发的计费绕过）

`PayloadExtractionInterceptor` 从**请求体**里读 `stream` 字段改写调用形状，而 `BillingPolicyInterceptor` 对 `ProviderNative` + `SseStream` **无条件**套 `streaming_composite_policy`。两者叠加的后果：

```text
POST /kling/v1/videos/text2video   {"prompt": "...", "duration": "10"}
  ⇒ ResultCount / video_result / ResponseBody           ← 正常：按产出的视频条数收

POST /kling/v1/videos/text2video   {..., "stream": true}
  ⇒ Composite   / video_result / StreamingAccumulator   ← 形态塌成 token 复合
  ⇒ 累加器在视频响应里找不到 prompt_tokens/completion_tokens
  ⇒ 产出 0 条用量行 ⇒ 结算层见空行 `return Ok(())`
  ⇒ 一条 10 秒视频免费；换成 Suno 就是一首曲子，换成 Veo 同理
```

这不是"形态偏好"问题，而是**客户端可控输入能抹掉账单**：不用伪造响应，只要在请求体里多写一个字段。TTS / 图片在 OpenAI 兼容面上不受影响（策略按资源类型选，不看形状），但 ProviderNative 面（kling / suno / veo 等）全部命中。

两道独立守卫，共用 `usage::meter_is_streamable` 这一个判据（单一权威）：

| 层 | 位置 | 作用 |
| --- | --- | --- |
| 形状 | `payload.rs::extract_stream_flag` | 只有"该路由声明的单位能从流里量出来"（token 类）才把形状改成 `SseStream`；否则忽略标志并 `warn` |
| 策略 | `billing_policy.rs` 的 ProviderNative 分支 | 即使形状已经是 `SseStream`（来自适配器目标或后续新代码），非 token 单位也保持媒体策略 |

媒体单位（按条 / 按张 / 按秒 / 按字符 / 按分钟）必须读完整响应体，流式下没有完整响应体——这是"能不能流式"的物理边界，不是配置项。

### 2.18 gemini `:streamGenerateContent` 的契约形状根本不是 SSE

`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json` 里该 operation 的 200 响应声明的是 **`application/json`**：Gemini 默认把结果按**分块 JSON 数组**下发（`[{...},\n{...}]`），只有客户端显式加 `alt=sse` 才是事件流。而累加器只有 SSE / NDJSON 两种协议解析：

- SSE 解析器只认 `data:` 前缀 ⇒ 每一行都被丢弃 ⇒ `finish()` 返回 `None`；
- 叠加 2.15 的 EOF 兜底后也只能按文本估算，而数组形态下 `observe_streamed_output` 同样解析不到对象 ⇒ 估算 0 ⇒ 仍然免单。

修法：新增 `StreamingUsageFormat::JsonArray`（content-type 为 `application/json` / `x-json` / `text/json` 时选中），逐行容忍 `[`、尾逗号、`]`，整份数组压在一行时也按元素展开；每个元素走与 SSE 相同的 `record_usage_value`，由 `merge_streaming_usage_body` 累计合并（Gemini 每帧是累计值，最新值即权威）。网关按 chunk 转发、切点不受控，所以**分片形态必须与整份形态同权**。

### 2.19 🔴 目录没有缓存价时，缓存命中那部分 token 收 0 元

缓存两立方米（`llm_cache_read_token` / `llm_cache_write_token`）被**故意**排除在计价预检的 fail-closed 之外（`requires_complete_pricing`）：供应商会报告这两个 SKU 的用量，而目录不保证每个模型都配了缓存价，为此拒绝整条请求会打掉正常流量。

问题在于"不拒绝"落到了"收 0"：

| 路径 | 缺价时的行为（改造前） | 后果 |
| --- | --- | --- |
| 调用管线（`extract_composite_usage_from_body` → 结算） | 仍产出缓存行，但 `PriceResolution` 是 `Unrated` ⇒ 命令金额 `0.000000000000` | 一次 100 prompt / 20 命中的请求只收 80 token 的输入费 |
| OpenAI 中继（`GatewayUsageRecordCommandBuilder::build`） | `input = prompt - cached`，且缓存行**只在有报价时**才 push | 命中部分既不进输入行、也没有缓存行 ⇒ **整段消失** |

上游对缓存命中仍然收费（OpenAI 约 0.25–0.5× 输入价，Anthropic 缓存读约 0.1×、缓存写 1.25×），而长上下文场景命中常占 prompt 的 50%–95%——这是一条**没有上限的静默漏收**，且 0 元事实不会触发任何告警。

修法统一成一条规则：**没有缓存价 ⇒ 缓存 token 并入输入行、按输入价结算**。

- 上限是 1× 输入价（目录补上真实缓存价后自动回到正确费率），下限不能是 0（不可恢复）；
- 不新建 0 元事实、不虚构缓存费率记录，账本上就是一条普通的输入行；
- 两条落地：`usage_extraction.rs` 里在"定价体系真的跑过（`pricing_quotes` 非空）"时才回退（纯抽取单测没有定价上下文，保持按帧原样拆分）；`openai_usage.rs` 里用 `input_tokens_for_billing` 统一输入量的口径。

顺带修掉一个同源的**负数量**缺陷：`billable_input_tokens` 用 `checked_sub` 判"缓存不能超过 prompt"，但 `checked_sub` 只在整数溢出时失败，`cached > prompt` 会安静地算出**负数**计费量。已加 `.filter(|miss| *miss >= 0)`，脏数据在记账前被拒——负数量进账本比少收更难修。


### 2.20 🔴 音频/图像令牌按文本价结算（目录差 2.7–8 倍，且三个码位从来没人产出）

第 8 轮换了个切法：不看"数量对不对"，看"**单价对不对**"——即同一次响应里混着不同模态的 token 时，是不是都落在同一个计量单位上。

目录早就按模态分了费率（`sdkwork-models` 的 `openai/global/pricing/gpt-realtime-2.json`）：

| 计量单位 | 单价 | 与文本档的倍数 |
| --- | --- | --- |
| `llm_input_token` | `$4 / 1M` | 1× |
| `audio_input_token` | `$32 / 1M` | **8×** |
| `llm_output_token` | `$24 / 1M` | 1× |
| `audio_output_token` | `$64 / 1M` | **2.67×** |
| `image_input_token` | `$5 / 1M` | **1.25×** |

而抽取层**从不产出** `audio_input_token` / `audio_output_token` / `image_input_token` 这三行——`grep` 在整个 `src/` 里只能找到它们的分类、结算映射与 `is_token_meter` 判定，没有一处 `add_line`。于是上游报的音频令牌被 `composite_usage_components` 并进 `prompt_tokens` / `completion_tokens`，按文本价结算。

这不是边角场景：`/v1/realtime/sessions`、`/v1/realtime/transcriptions` 等 4 个 realtime 入口的**正常流量就是音频**，8× 的价差会把整个家族做成亏损业务；`gpt-4o-audio` 走 `/v1/chat/completions` 同理。

两家契约的上报形状不同，且**有一处单复数陷阱**：

| 供应商形态 | 字段 | 语义 |
| --- | --- | --- |
| chat/completions | `prompt_tokens_details.audio_tokens` / `completion_tokens_details.audio_tokens` | `prompt_tokens` **含**音频，音频是子集 |
| Realtime `response.done` | `input_token_details.{text,audio,image}_tokens` / `output_token_details.{text,audio}_tokens` | 三段**互斥**，注意是**单数** `token` |

只认复数 `input_tokens_details` 时，realtime 的整份明细一个都读不到（第 7 轮的 `cached_tokens` 读取也有同一个洞：`input_token_details.cached_tokens` 读不到 ⇒ 实时会话的缓存命中按全价输入收）。

修法分三处，缺一处都不成立：

1. **计价侧**（`pricing_identity.rs::declared_meters_for`）：复合模式原先只声明文本三档，报价侧就永远不会给模态档出价。现在把 `audio_input_token` / `image_input_token` / `audio_output_token` 一并声明——**顺序必须排在文本档之后**，因为 `apply_pricing_identity` 取 `meters.first()` 当主档，顺序变了会改写路由声明的计量单位。目录没有这些码位时 `reconcile_pricing_meters` 取交集会把它们丢掉，行为与从前完全一致，也不会触发 fail-closed（`requires_complete_pricing` 只把主档与 `llm_output_token` 当必需项）。
2. **抽取侧**（`usage_extraction.rs::split_priced_modalities`）：按模态把令牌从文本行里拆出来，各自成行。拆分量以现有可计费量为上限（`min`）——上游脏数据里 `audio_tokens` 可能大于 `prompt_tokens`，直接相减会得到**负数计费量**。
3. **缓存侧**（`modality_tokens`）：`cached_tokens_details.audio_tokens` 已经由缓存行按缓存价结算过，必须从音频量里扣掉，否则同一批令牌收两遍。

反向约束与前一轮同源：**目录没有该模态价格时不许造 0 元事实**，令牌留在文本行按文本价结算（宁可少收也不能记 0）。所以用例成对出现——有价拆行、无价留在文本行。

顺带把 `cached_tokens()` 与 `nested_token_details()` 的容器名收敛成一处的常量（`INPUT_TOKEN_DETAIL_KEYS` / `OUTPUT_TOKEN_DETAIL_KEYS`），避免"读缓存命中认复数、读推理明细认单数"这种各写一份的漂移。

### 2.21 🔴 Google 的模态明细是**数组**，只认 OpenAI 形状时 Gemini 的语音/图像/实时令牌全部落错档

第 9 轮换了"厂商契约形状"这个切法：同样叫 `usage`，OpenAI 把模态放在**扁平字段**
（`prompt_tokens_details.audio_tokens`），Google 把模态放在**数组**
（`usageMetadata.promptTokensDetails[].{modality,tokenCount}`）。抽取层只实现了前者，
于是目录为 Gemini 按模态报的价全部对不上：

| 入口 | 目录费率 | 改造前的落点 | 后果 |
| --- | --- | --- | --- |
| `gemini-2.5-flash-preview-tts`（`:generateContent` + AUDIO） | `llm_input_token` + `audio_output_token`（**没有** `llm_output_token`） | 180 个音频产出 token 记到 `llm_output_token` | 结算找不到报价 ⇒ **整条语音合成免单** |
| `gemini-3.1-flash-image`（`:generateContent` + IMAGE） | `llm_input_token` + `image_output_token`（**没有** `llm_output_token`） | 1290 个图像 token 记到 `llm_output_token`，文本输入完全不进账 | 免单 + 少收输入侧 |
| `gemini-3.8-live` | 文本四档 + `audio_*_token` + `video_input_token` | 音频/视频输入并入文本输入，音频产出并入文本产出 | 8× 价差被抹平，语音实时业务做成亏损 |
| `gemini-embedding-2` | 文本 + audio/image/video 四个输入档 | 整段按单一主档收 | 图像/音频 embedding 按文本价少收 |

问题不止"少读一个字段"，而是三层叠加，缺一层都修不好：

1. **读不到**：`modality_tokens` 只扫 `*_tokens_details` 容器，Google 的数组一个都读不到。
2. **改不动**：`declared_meters_for` 的复合档只声明了 `audio_input` / `image_input` /
   `audio_output`，没有 Google TTS/图像产出侧的 `audio_output_token` /
   `image_output_token` 与实时视频的 `video_input_token`；声明侧不提出这些码位，
   目录价就永远出不了价。
3. **重解析会缩表**（最隐蔽的一层）：目录把路由从"按张/按字符"改写成 token 后，
   `apply_pricing_identity` 只把**主档**回写到 `billing.meter`。预检若此时重新解析
   身份，"声明 ∩ 目录"就只剩主档一个——其余模态即使抽取层拆出来了，也因为没有
   报价而被"有价才拆行"的守卫跳过。embedding 路由就是活例：声明只有
   `embedding_input_token`，目录有四个输入档；回写后重新解析只剩 `llm_input_token`。

修法（四处，缺一处不成立）：

* `modality_tokens` 同时认两家形状：Google 的
  `promptTokensDetails` / `candidatesTokensDetails` / `cacheTokensDetails`
  数组（大小写不敏感匹配 `modality`），OpenAI 的扁平 `*_tokens` 字段；
  Google 的缓存模态（`cacheTokensDetails`）从对应模态输入里扣掉，避免"缓存行 +
  音频输入行"收两遍。
* `ModalityTokens` 扩到 `audio/image/video` 输入 + `audio/image` 产出；
  `split_priced_modalities` 对每个**有报价**的模态拆行，无价模态留在文本行
  （绝不造 0 元事实）。
* 复合档声明补齐 `image_output_token` / `video_input_token`；Token 档的
  输入侧主档按模态拆行（`input_token_lines`），输出侧在"输入侧无独立价"时
  仍把**文本份额**按 `llm_input_token` 结算（Google 图像生成的
  `image_output_token` + `llm_input_token` 组合）。
* `InvocationUsage::pricing_meters` 钉住路由规划解析出的**完整**计量单位集合，
  预检/结算不再从被回写成主档的计费配置重新解析（第 3 层）。

同时修掉一个主档选择缺陷：目录只给一组**输入侧**模态报价时，`meter_preference`
把 `llm_input_token` 排在模态输入之前——否则按 meter code 字母序会把
`audio_input_token` 选成主档，整段文本输入按音频价结算。

反向约束与此前同源：**目录没有模态价时不许造 0 元事实**。所以用例成对出现——
Google TTS/图像有价拆行、无价对照留在文本行；embedding 有明细拆行、无明细用文本主档。

### 2.22 🔴 token 计价的语音合成：音频发出去之后才发现"量不出来"，等于免费

`openai/gpt-4o-mini-tts` 在目录里只有 `llm_input_token` + `audio_output_token`，没有
`tts_input_character`。`pricing_identity` 会把 `/v1/audio/speech` 从"按字符"改写成
Token 档（主档 `audio_output_token`），预检能通过——**因为价格是存在的**。但该端点
的 2xx 响应是**二进制音频**，OpenAI 不在响应体/响应头里回 `usage`：

```text
预检：通过（目录有 token 价）
派发：音频已经流给客户
抽取：token_lines 读不到 output_tokens（响应不是 JSON）⇒ usage_failed
结算：after 链中断，不执行 ⇒ 账上 0 元
```

这类缺陷与 2.20/2.21 不同：不是"读错形状"，而是**上游根本不给可计量的量**。任何
"事后补抽取"都救不回来——量不在响应里。可选方向只有三条：

1. 契约/网关要求该模型走 `stream_format: "sse"`，在终帧读 usage（需上游实际支持，
   且网关要把 SSE 还原成音频字节，属于传输层改造）；
2. sdkwork-models 给该模型补 `tts_input_character` 费率，按输入字符报价（与
   `tts-1-hd` 同口径）；
3. 网关做**显式、可审计的估算**并把估算标记写进用量事实（不能静默按 0）。

在任一方案落地前，本轮的处置是**预检拒单**（`BINARY_AUDIO_SYNTHESIS_API_CODES`，
`pricing.rs::binary_audio_synthesis_without_usage`）：

* 只挡"合成"面（`openai.audio.speech` / `elevenlabs.text_to_speech` /
  `volcengine.speech`），识别端点（`/v1/audio/transcriptions`）回 JSON，按 token
  计费是可量的，不能被误拦；
* 判定读的是**目录改写之后**的 `BillingMode`：目录仍按字符报价的 TTS 不命中，
  只有被改成 Token / Composite 才拒；
* 错误是 `Pricing` 类，消息写明"binary audio + no token usage ⇒ cannot be
  metered"，让运维在目录/契约层修复，而不是在账上产生 0 元事实；
* 拒单发生在预扣之前（`PricingPreflightInterceptor` 在 `BillingTransactionInterceptor`
  之前），不会留下冻结。

**代价**：`gpt-4o-mini-tts` 在该窗口内不可用（返回 500 `pricing_failed`）。这是刻意
的取舍——**不可售 ≠ 免费送**；一旦目录补了字符价或上游给了 usage，删掉对应的
api code 即可恢复。`tests/billing_unmeterable_tts.rs` 用五条用例钉住"拒合成、放行
聊天/识别/字符价合成"四个方向。

### 2.23 🔴 批量提交只收一次管理请求费，整批 token 成本由平台承担

`/v1/batches`、`/v1/batches/{id}`、`/v1/batches/{id}/cancel` 与
`/anthropic/v1/messages/batches` 都是透传（`openai_passthrough_routes.rs`），计费档是
`ApiRequest`。批量任务在上游**异步**执行，逐请求的 `usage` 只出现在输出文件里
（OpenAI：`output_file_id` → `GET /v1/files/{id}/content` 的 JSONL；Anthropic：
`results_url`），而全仓没有任何代码读取 `output_file_id`、批结果 JSONL 或
`results_url`. 结果：

```text
一个 10,000 条的 batch ⇒ 网关收 1 次 api_request
                       ⇒ 上游 token 成本 100% 由平台承担
```

这不是"少收几个百分点"，是把整批算力免费送出去；OpenAI 的 batch 价还是标准价的
**50%**，所以即便补了结果回收，也还需要一个批价折扣维度才能对齐行业口径。

处置（与 2.22 同一原则：不可售 ≠ 免费送）：

* 预检对**创建**动作拒单（`pricing.rs::unmetered_batch_submission`），错误写明
  "per-request usage is produced asynchronously in an output file the gateway does
  not reconcile"；
* 只挡创建：`GET /v1/batches`（轮询）与 `POST /v1/batches/{id}/cancel` 不产生新的
  上游 token 成本，继续放行，否则客户连已提交任务的善后都做不了；
* 与 `POST /v1/moderations` 这类普通按次端点做对照，守卫不得误伤。

真正恢复批量售卖需要两件事：**批结果回收**（流式逐行解析 JSONL 的
`response.body.usage`，内存有界）与**批价维度**（目录声明 batch 折扣或单独的
batch rate variant）。`tests/billing_unmetered_batch.rs` 用五条用例钉住当前边界：
OpenAI/Anthropic 创建拒单、轮询/取消/普通按次放行。

### 2.24 🔴 `background: true` 的 Responses：模型跑完了，账上只有一次管理请求费

`POST /v1/responses` 的 `background: true` 形态先回一个 `queued` / `in_progress`
对象（**没有 `usage`**），真正的 token 用量要等完成后的
`GET /v1/responses/{id}`。而网关把创建当复合 token（模型在场）、把轮询当
`api_request`：

```text
POST /v1/responses {"background": true, "model": "..."}  ⇒ 立即返回 queued（无 usage）
上游继续跑模型                                            ⇒ 平台承担 token 成本
GET /v1/responses/{id}                                    ⇒ 只收 1 次 api_request
```

一次后台 deep research 可能消耗数美元 token，管理请求费覆盖不了。这与 2.23
同源：**用量不在被计费的那次响应里**。区别是批量的结果在文件里，后台响应的
结果在轮询里——两条链路都没有回收器。

处置：`pricing.rs::unmetered_background_response` 在预检拒单，只认
`POST /v1/responses` + 请求体布尔 `background: true`：

* 同步 Responses、`background: false`、轮询 GET、取消 POST、普通按次端点
  全部继续放行（六条对照钉住）；
* 字符串 `"true"` 不认——契约声明的是 boolean，宽容解析只会让"以为后台、
  实际同步"的账单歧义更难查；
* 真正恢复需要"异步响应完成时按 `usage` 回填结算"（在 `GET` 拿到完成态时
  解析响应体里的 `model` + `usage`，走一次后置定价），属于架构级改动，
  单独一轮做。

`tests/billing_unmetered_async_usage.rs` 六条用例锁住边界。

### 2.25 🔴 实时语音：会话响应把上游 `client_secret` 交给客户，音频走 WebSocket 绕过网关

实时面的创建响应只回一个会话对象，契约
`OpenAiRealtimeSession.client_secret` 明确包含**上游签发的临时密钥**。客户端拿它
直连上游 `wss://.../v1/realtime` 推流，而本仓：

* 没有任何 WebSocket 代理（全仓生产代码 `grep` 不到 `WebSocketUpgrade` /
  `tokio_tungstenite::`；`tokio-tungstenite` 只是为 `sdkwork-agents` 的 fork patch
  存在）；
* 没有任何 `response.done` / 音频 token 的回收链路；
* 会话创建响应本身没有 `usage` ⇒ 复合抽取产出 0 行 ⇒ 结算跳过 ⇒ 0 元。

两层后果叠加：**计费免单 + 控制绕过**。客户拿到上游临时密钥后不再经过网关，
音频 token、并发、内容策略全部失控。这不是"少收几个百分点"，是把整条实时语音
链路免费开放。

处置：`pricing.rs::unmetered_realtime_session` 对**创建面**拒单——

| 路径 | 作用 |
| --- | --- |
| `POST /v1/realtime/sessions` | 持久会话（客户端拿 secret 直连） |
| `POST /v1/realtime/calls` | 服务端呼叫（SIP/WebRTC） |
| `POST /v1/realtime/transcription_sessions` | 实时转写会话 |
| `POST /v1/realtime/translations` | 实时翻译会话 |

管理动作（`accept` / `hangup` / `refer` / `reject`）不创建新用量，继续放行。
真正恢复实时语音售卖需要：网关自己的 WebSocket 代理（把客户连接收敛到网关）+
`response.done` 用量累计 + 会话关闭时结算 + 网关签发短期凭据（不再透传上游
`client_secret`）。这是一个独立的传输层特性，不能靠抽取层补。

`tests/billing_unmetered_realtime.rs` 六条用例钉住"四条创建拒单、hangup/普通聊天
放行"。

### 2.26 🔴 图像单档位费率：目录有价、请求没有档位字段，模型直接卖不出去

第 8 轮给**视频**补了 `tier_code` 解析（`ai_model_video_profile` × `pricing_rate`
条件），但 sdkwork-models 随后把**图像**费率也条件化在 `tier_code` 上，而图像
没有对应的 profile 表，计费侧对图像计量单位一律传"未知档位"：

```text
kuaishou/kling-image-3.0 的唯一 image_result 费率：
  conditions = [tier_code eq "res_1k_2k"]
KlingImageGenerationRequest：prompt / model_name / aspect_ratio / image
  —— 没有 resolution，也没有 tier
⇒ 候选费率全被条件过滤 ⇒ 预检 PriceNotFound ⇒ 有价却卖不出去
```

受影响的不止一个模型（全量扫目录，**所有**费率都带条件、且这些条件无法由
请求提供的模型 21 个）：`kling-image-3.0` / `kling-image-o1`（单档位
`res_1k_2k`）、`kling-image-3.0-omni` / `kling-v2-1`（多档位）、
`bytedance/doubao-seedream-5-0-pro`（4 档）、`runway/*`（2–10 档）、
`black_forest_labs/flux-2-*` 等。Google 图像模型的 `output_type=image`
条件已由计量单位推导，不受影响。

修法只处理**没有选择余地**的那一类（`pricing_identity::single_catalog_tier_code`）：

* 该计量单位的所有官方费率都带条件（存在无条件费率时走正常解析）；
* 所有候选共享**同一个** `tier_code`；
* 其余条件维度只能是解析器能从计量单位自身推导的
  `media_type` / `output_type` / `input_type`。

满足时注入该档位——价格不会变，也不会把多档位模型蒙对一个档位。三条核价路径
（`pricing.rs::resolve_price`、`upstream_route_selector` 的路由预检与 sticky
预检）用同一个 helper，避免"预检过、结算挡"的错配。

多档位模型（Seedream / Kling omni / Runway）**继续 fail-closed**：请求没有档位
字段，目录也没有图像档位表，任何猜测都会按错误档位收费。恢复它们需要产品/
契约二选一：在请求 schema 暴露 `tier`/`resolution`，或由 sdkwork-models 为这些
模型补一条无条件默认档位费率。

`tests/billing_image_tier_resolution.rs` 三条用例：单档位放行、多档位继续拒、
无条件费率对照。

### 2.27 🔴 Anthropic 缓存写入从未按自己的费率结算：5m 少收 20%，1h 少收 50%

目录为每个 Anthropic 模型发布两条 `llm_cache_write_token` 费率：

| 档位 | 相对输入价 | 触发条件 |
| --- | --- | --- |
| `cache_write_5m` | 1.25× | `cache_control` 不写 `ttl`（默认 5 分钟） |
| `cache_write_1h` | 2× | `cache_control: {"ttl": "1h"}` |

计费侧有两个缺陷叠加：

1. `declared_meters_for` 的复合档只声明 `llm_input_token` / `llm_output_token` /
   `llm_cache_read_token`，**没有** `llm_cache_write_token` ⇒ 预检从不为它出价；
2. 即使声明了，`pricing_dimensions` 也没有把请求的 TTL 映射成 `tier_code`，
   两条候选都会被条件过滤。

于是抽取层走"无价则并入输入"的兜底：缓存写入 token 全部按 **1× 输入价**结算。
每个使用 prompt caching 的 Anthropic 请求都会发生，5m 少收 20%、1h 少收 50%。

修法：

* 复合档补声明 `LlmCacheWriteToken`（主档顺序不变，仍是 `LlmInputToken`）；
* `pricing.rs::cache_write_tier_code` 只在目录**同时**提供
  `cache_write_5m` 与 `cache_write_1h` 两档时，按请求里的
  `cache_control.ttl` 选档（缺省 5m，显式 `"1h"` 为 1h）；
* 其他档位词汇（OpenAI 的 `long_context`、阿里云的 `explicit_cache_write`）
  不猜——继续走 `single_catalog_tier_code`（单档位）或原有兜底。

边界：一个请求里同时有 5m 与 1h 缓存断点时，契约的 `usage` 只有
`cache_creation_input_tokens` 总量、没有按 TTL 的拆分（`cache_creation`
对象未进契约），本实现按"存在 1h 即整段 1h"结算——对混合 TTL 会多收 5m
部分，属于契约缺口，已在遗留中登记。

预扣侧：缓存写入报价进入预扣后，输入侧会同时冻结 input + cache_read +
cache_write 三份（互相排斥的同一批 token），最坏约为实际成本 1.8×。这是保守
方向，不产生漏收；后续可改为"输入侧取三者最高价 × 输入量"。

`tests/billing_anthropic_cache_write.rs` 四条用例：5m 默认、1h 显式、缓存读
对照、无条件费率对照。

### 2.28 🔴 上下文分档 token：15 个旗舰 chat 模型"有价却不可售"

全量扫 sdkwork-models 发现一类新的目录形状：模型的 `llm_input_token` /
`llm_output_token` / `llm_cache_read_token` **全部**条件化在上下文长度档位上，
而请求侧没有档位字段：

```text
input_le_32k      → [0, 32k)      input $3.2 / output $16
input_32k_128k    → [32k, 128k)   input $4.8 / output $24
input_128k_256k   → [128k, 256k)  input $9.6 / output $48
```

计费侧原先只给视频/图像解析 `tier_code`，token 档位一律"未知" ⇒ 候选全被过滤
⇒ `PriceNotFound` ⇒ 模型不可售。受影响 15 个：Bytedance Doubao/Seed 12 个、
Alibaba `qwen3.7-flash`/`plus`、Baidu `ernie-5.0`。

修法（`pricing_identity::context_tier_code`）：

* 只解析**数值语义明确**的档位名：`input_le_<n>k` / `input_<n>k_<m>k` /
  `input_gt_<n>k`；档位集合必须从 0 开始连续、不重叠；
* 预检用请求体估算上下文（`bytes/4 + 1`；派发前没有 usage），结算用已抽取的
  input + cache-read + cache-write 总量——所以 40k 的请求即使预检估成小值，
  结算仍按 32k–128k 档收；
* 超过目录最后一档时用**最高档**，绝不因为目录缺一档而免单；
* 路由资格预检没有上下文，用最低档证明"该模型有价"；
* `tier_32k` 这类无法判定"≤ 还是 ≥"的命名继续 fail-closed——Alibaba/Baidu
  的 3 个模型仍未恢复（见遗留第 17 条）。

预扣侧：预检估算可能低于真实档位（估算取小），预扣会少冻结一档差价；结算按
真实档位扣款。把估算改为 `bytes/3` 可以更保守，但会让接近档位边界的请求在
预检阶段被推高一档；当前选择与 `conservative_input_units` 保持一致（`bytes/4`）。

`tests/billing_context_tier.rs` 六条用例：三档金额、40k 实测档位、超最高档、
歧义命名对照、无条件费率对照。

### 2.29 🔴 缓存读按全价收：逐行模态维度缺失（客户被多收的方向）

OpenAI realtime / gpt-image 的 `llm_cache_read_token` 费率按 `media_type`
（text / audio / image）分档，而缓存读行原先不带模态维度：

```text
预检：三条候选都带 media_type 条件 ⇒ 全部被过滤 ⇒ 不出价
抽取：见"缓存读无报价" ⇒ 缓存命中并入输入行按全价收（0.1–0.25× 的折扣丢失）
```

这与 2.27 的"少收"相反，是**多收客户**。修法分三层：

1. **逐行定价维度**：`InvocationUsageLine` 新增 `pricing_media_type`，
   `pricing_dimensions` 让行级模态覆盖"计量单位推导的模态"；
2. **预检合成行**：缓存读首次解析失败时，用 text/audio/image 三个合成行逐个
   试探，拿到任一可用价即阻止抽取层"折进输入"（真实模态在结算时按行解析）；
3. **抽取拆分**：按 `cached_tokens_details` 把缓存命中拆成
   audio/image/video/text 多条行，各自带 `pricing_media_type`；同时把缓存的
   图像/视频份额从对应模态输入里扣掉，避免同一批令牌被"缓存行 + 模态输入行"
   收两遍。

`tests/billing_cache_read_modality.rs` 四条用例：纯音频缓存（$8 档）、混合模态
拆分（audio $8 / image $5 / text $0.4）、无明细按文本、无条件费率对照。

剩余：Alibaba `qwen3.7/3.8` 的缓存读费率按 `explicit_cache_read` /
`implicit_cache` 分档，请求与响应都没有模式信号，仍会折进输入按全价收
（见遗留第 18 条）。

### 2.30 🔴 Alibaba 缓存读的显式/隐式两档：无档位就折进输入按全价收

目录为 `qwen3.7-*` / `qwen3.8-*` 发布两条缓存读费率：

| 档位 | 单价（示例） | 触发条件 |
| --- | --- | --- |
| `explicit_cache_read` | `$0.003`/1M | 请求用 `cache_control` 标记缓存断点 |
| `implicit_cache` | `$0.006`/1M | 未标记（供应商自动缓存） |

两条都带 `tier_code` 条件、没有无条件费率。计费侧原先不传档位 ⇒ 预检不出价
⇒ 抽取层把缓存命中折进输入按全价（$0.5）收——比缓存价高约 83×，是**多收客户**。

修法：`pricing.rs::cache_read_tier_code` 只在目录恰好提供
`explicit_cache_read` + `implicit_cache` 两档时，按请求体的 `cache_control`
标记选档（有标记 = 显式，无标记 = 隐式）。`cache_control` 不是本仓契约字段
（`additionalProperties` 透传），但它是 Anthropic/Alibaba 显式缓存的行业标记，
无标记即供应商默认的隐式缓存。

同时把 `single_catalog_tier_code` 的适用计量单位扩到缓存读/写：Alibaba 的
`explicit_cache_write` 只有一条费率，单档位规则注入后按 $0.038 结算，不再折进
输入。

`tests/billing_alibaba_cache.rs` 四条用例：隐式档、显式档、单档位缓存写入、
单档位缓存读对照。

剩余边界：若供应商的显式缓存使用别的标记（不是 `cache_control`），该请求会被
当成隐式缓存（多收 2× 缓存读）；需要在目录/契约层补模式字段。

### 2.31 预扣把互斥的输入侧三档相加：冻结额最高放大到实际成本的 2.35×

2.27 让 `llm_cache_write_token` 进入复合档报价后，预扣暴露了一个新问题：输入、
缓存读、缓存写三档覆盖的是**同一批 prompt token**（互斥），而 `estimated_amount`
逐条 quote 相加：

```text
input $10 + cache_read $0.5 + cache_write $20（1h）
⇒ 冻结 $30.5，实际最坏成本只有 $20（全走 cache-write）
```

余额刚好够实际成本的预付用户会被误拒。修法：输入侧三档取**最高价**作为池上界，
输出与媒体计量仍逐项相加（`billing_transaction::estimated_amount` 的
`input_pool_max`）。顺带把 `LlmReasoningToken` 从"输入侧估计"改到"输出侧估计"
（推理 token 是产出，不是 prompt）。

`tests/billing_precharge_estimate.rs` 新增两条：缓存价低于输入时冻结额与基线一致；
缓存写入高于输入时按缓存写入价冻结（等于"只报缓存写入+输出"的结果）。

### 2.32 Alibaba/Baidu 的累计上界档位：15 个旗舰 chat 模型全部恢复可售

2.28 只解析了 Bytedance 的显式区间词汇（`input_le_32k` / `input_32k_128k`），
Alibaba `qwen3.7-flash`/`plus` 与 Baidu `ernie-5.0` 的
`tier_32k` / `tier_256k` / `tier_1m` 仍被当成"语义不明"而 fail-closed。

重新审视后确认它不是歧义：集合里**没有比 `tier_32k` 更小的下界**，唯一自洽的
解释是"累计上界"——

```text
tier_32k    → [0, 32k)
tier_256k   → [32k, 256k)
tier_1m     → [256k, 1M)
```

于是 `context_tier_code` 增加第二种词汇的解析：

* 全部档位必须匹配 `tier_<n>[k|m]`，按上界升序、严格递增；
* 请求上下文落在第一个 `context < upper` 的桶；
* 超出最后一档仍取最高档（与 2.28 的显式区间一致）；
* 非数值命名（`tier_fast`）继续 fail-closed。

至此全量 15 个上下文分档模型（Bytedance 12 + Alibaba 2 + Baidu 1）都能按真实
上下文选档结算。`tests/billing_context_tier.rs` 新增一条累计词汇用例（20k/100k/
500k/2M 四个断言）。

### 2.33 🔴 流式 Chat 默认不索取 usage：输入 token 全程免单（客户端可控）

OpenAI 的流式 Chat Completions **默认不返回 usage**，只有请求显式带上
`stream_options.include_usage: true` 才在 `[DONE]` 前多发一个 usage-only chunk。
生产网关的 provider 请求构建（`ProviderRequestBuilder::build`）原先原样转发客
户端 body；而 2.15 的 EOF 兜底只能按已观测文本估算 **输出**、输入恒为 0：

```text
POST /v1/chat/completions {"stream": true, "messages": <大 prompt>}
⇒ 上游不返 usage ⇒ EOF 兜底 {prompt_tokens: 0, completion_tokens: 估算}
⇒ 输入 token 一分不记
```

默认行为就是"不索取"，所以**每个未显式开启 usage 的流式请求都在漏收输入**，
且客户端可以显式 `include_usage: false` 主动触发。修复：

* `provider_request.rs::ensure_stream_usage_requested`：OpenAI 兼容面的
  `openai.chat_completions` + `stream: true` 时强制
  `stream_options.include_usage = true`（覆盖客户端 false，保留其他键）；
* 只对 OpenAI 兼容面生效：Anthropic / Gemini 的流式用量在各自协议里默认就有，
  塞入 `stream_options` 会被上游拒绝；适配器路径（`InternalProviderAdapter`）
  在更早处分流，不受影响；
* App runtime 的同类归一化从 `.entry().or_insert(true)` 改为 `.insert(true)`，
  否则 app 面同样可被客户端 false 绕过。

代价：上游会按 OpenAI 规范多回一个 `choices: []` 的 usage-only chunk。这是规范
行为，主流 SDK 会忽略；若客户端严格校验 choices 非空，需要在流代理层过滤该帧
（当前未过滤，登记为遗留）。

`provider_request.rs` 单测 4 条：注入并保留其他键、覆盖客户端 false、非流式不动、
厂商原生协议不动。

### 2.34 强制 usage 的客户端可见代价：过滤 usage-only chunk

2.33 为计费向上游强制 `stream_options.include_usage`，OpenAI 会按规范在
`[DONE]` 前多回一个 `{"choices":[],"usage":{...}}` 的 chunk。未主动开启该选项的
客户端不应看到它，否则严格校验 `choices` 非空的 SDK 可能报错。

修法在 edge-runtime 的流代理层（`invocation_stream.rs`）：

* 仅当"OpenAI 兼容面 + `openai.chat_completions` + `stream: true`"时启用
  （`DeferredStreamInvocation::suppress_usage_only_chunks`）；
* 逐帧扫描**已闭合**的 SSE 事件（`\n\n` / `\r\n\r\n`），`choices` 为空（或缺省）
  且有非空 `usage` 的事件从转发字节里剔除；计费累加器仍然观察**原始字节**；
* 内容事件、`[DONE]`、非 JSON 帧、带非空 `choices` 的 usage 帧一律原样保留；
* 跨帧拆分的 usage 事件不做缓冲，保持原样转发（客户端可能多看到一次；计费不受
  影响），避免在转发链引入逐事件缓冲与延迟。

`invocation_stream.rs` 单测 5 条：usage 剔除 + DONE 保留、内容帧逐字节保留、
非空 choices 的 usage 帧保留、跨帧拆分保留、单帧多事件只剔 usage。

### 2.35 图像输入模式档位：Kling v2.1 的 t2i/i2i/multi_ref 价格差 1:2:4

`kuaishou/kling-v2-1` 的 `image_result` 费率按输入模式分三档：

| 档位 | 单价 | 请求形状 |
| --- | --- | --- |
| `t2i_1k_2k` | `$0.10` | 只有 prompt |
| `i2i_1k_2k` | `$0.20` | 带 `image` |
| `multi_ref_1k_2k` | `$0.40` | 带 `image_reference_list` |

请求 schema 没有档位字段，但模式完全由请求形状决定。`pricing.rs::image_mode_tier_code`
按 `image_reference_list` / `reference_images` 非空 ⇒ multi_ref、`image` 非空 ⇒
i2i、否则 t2i 选档；只在**所有**档位都属于这三种模式词汇、且请求模式恰好对应一条
费率时返回。同一模式多条（模式 + 分辨率后缀）继续 fail-closed——按错模式计费会
差数倍。

`tests/billing_image_tier_resolution.rs` 新增两条：三种输入模式各自的金额、
同模式多档位 fail-closed。剩余多档位图像模型见遗留第 14 条（`kling-image-3.0-omni`
的 res_1k_2k/res_4k 与 Seedream 的 single_image/layer_split 仍无请求信号）。

### 2.36 管理面端点被判"按次计费"：上游执行完，客户收到 500

文件、缓存、批量查询/取消、`count_tokens` 这 18 个端点上游不按量计费，目录也没
有 `api_request` 费率。它们原先落在 `ExternalUsageLine`：

```text
预检：目录里模型有 token 价 ⇒ 通过（其实与本次调用无关）
抽取：没有任何用量行
结算：没有可结算金额 ⇒ 500
```

上游已经执行完成、平台已经付出成本，客户却收到 500，预扣还被保留——比"免费送"
更糟。修复：`billing_policy.rs` 新增 `provider_native_management_is_free`，把

* `/anthropic/v1/files`（含 content、删除、上传）
* `/anthropic/v1/messages/batches` 的查询/详情/取消
* `/anthropic/v1/messages/count_tokens`
* `/google/v1beta/files`、`/google/v1beta/cachedContents`
* `/google/v1beta/models/{model}:countTokens`

归为 `Free`：不预扣、不结算、空目录也能过预检。批量**创建**刻意排除，继续由预检
守卫拒单。用路径而不是 api code 匹配——模板化的 `{file_id}` 在真实请求里会被
分类器实例化成 `anthropic.file.1`，按 code 匹配必然漏。

`tests/billing_unmetered_management.rs` 四条：18 个 Free 端点、空目录预检、批量
创建仍拒单、付费生成面不被误放行。矩阵快照同步更新（18 行从 ExternalUsageLine
变 Free）。

### 2.37 OpenAI 管理/CRUD 端点：109 个"按次计费"里约 85 个本就不该按次收

`/v1/files`、`/v1/assistants`、`/v1/threads`（消息/查询）、`/v1/conversations`、
`/v1/containers`、`/v1/vector_stores`、`/v1/uploads`、`/v1/audio/voices`、
实时控制、stored completions、`/v1/responses/{id}` 轮询——OpenAI 对这些**对象
操作**不收费，只对推理、存储、工具收费。网关把它们按 `api_request` 报价，而目录
没有 `api_request` 费率 ⇒ 预检 `PriceNotFound` ⇒ 整类端点 500。

修复：`openai_management_is_free`（在 `model_requirement == Ignored` 短路**之前**
判定）把纯管理面归 Free；会产生上游计算的子端点刻意排除：

* `POST /v1/threads/{id}/runs`、`submit_tool_outputs`（token）；
* `POST /v1/responses/compact`（token）；
* `POST /v1/vector_stores/{id}/file_batches`、`/search`、`/files`（摄取/检索/存储）；
* `POST /v1/containers/{id}/files`；
* `POST /v1/videos/edits|extensions|remix`（视频生成，仍 VideoSecond）；
* `POST /v1/videos/characters`（素材创建，仍按次）。

矩阵快照随之变化：Free 从 2 升到 **107**，ApiRequest 从 109 降到 **22**；
VideoSecond 仍 4。`tests/billing_openai_management.rs` 三条：40 个 Free 端点、
空目录预检、10 个计算型子端点不被误放行。

剩余边界：vector store / container 的**存储**与 threads runs 的 token 仍未计量
（目录无存储价、runs 无用量回收），当前以"管理面免费 + 计算面拒单"的保守组合
落地，等存储/异步计量补齐。

### 2.38 异步任务轮询：客户拿不到已生成结果

Kling / Vidu / 火山 / Suno / Gemini 的任务查询（`*.task_query`）只是读状态，
上游不按次收费，目录也没有 `api_request` 价。此前按次报价 ⇒ 预检
`PriceNotFound` ⇒ **所有已生成结果的轮询 500**：客户已经为生成付过费，却取不回
视频/音乐/图片。

修复：`provider_native_non_streaming_policy` 对 `api_code` 以 `task_query`
结尾的路由直接 Free（覆盖 `kling.task_query`、`suno.music_task_query`、
`vidu.video_task_query`、`volcengine.task_query`、`gemini.video_task_query`）。
`POST /v1/responses/input_tokens`（免费 token 计数）同步归 Free。

矩阵：Free **114**，ApiRequest **15**（实际产生上游动作的：批量创建、付费工具、
视频素材、容器/向量库摄取与检索）；其余 17/11/4/4/3/2/6 不变。

`tests/billing_async_task_query.rs` 两条：7 个轮询/计数端点 Free 且空目录过预检、
4 个生成/工具面不被误放行。

### 2.39 管理面的"过度排除"：三个免费端点仍按次报价

2.37 把管理面归 Free 时用了粗粒度的路径判断，误伤了三个**不产生上游计算**
的端点：

| 端点 | 语义 | 旧判断 |
| --- | --- | --- |
| `POST /v1/threads/{id}/runs/{run_id}` | 更新 run 元数据 | 路径含 `/runs` + POST ⇒ 按次 |
| `POST /v1/vector_stores/{id}/files/{file_id}` | 更新单文件属性 | POST 子资源 ⇒ 按次 |
| `POST /v1/videos/characters` | 创建 Sora 角色（素材对象） | 只允许 GET ⇒ 按次 |

三者都继续 500（无 `api_request` 价）。修法是细化规则而不是放宽：

* runs：GET / cancel / **单个 run_id 的 POST**（元数据）免费；集合上的 POST 与
  `submit_tool_outputs` 仍计费；
* vector store：`/files/{file_id}`（单段 id）免费；`/files` 集合新增仍计费；
* videos：`characters` 全部免费；`edits/extensions/remix` 仍 VideoSecond。

矩阵：Free **117**，ApiRequest **12**。剩余按次端点全部是真实上游动作：批量创建
（守卫）、付费工具、容器/向量库摄取与检索、批 embedding、midjourney/nano-banana。

### 2.40 Responses 压缩：明明有 usage，却按"无价的按次"拒单

`POST /v1/responses/compact` 的契约响应是 `OpenAiResponse`（可带 `usage`），
请求体带 `model`——它是一次**同步模型调用**。分类器把它标成
`model_requirement = Ignored`，策略走 `api_request`：目录没有 `api_request` 价
⇒ 预检 `PriceNotFound` ⇒ 端点在完成压缩计算后 500。

修复：`openai_compatible_policy` 在 `Ignored` 短路之前识别 compact，走
`model_composite_policy`（响应体抽取 usage）。与 `background` 不同，compact 的
用量**同步返回**，不需要异步回收，因此可以立即按 token 结算。

矩阵：Composite **12**，ApiRequest **11**。`tests/billing_responses_compact.rs`
钉住：模式为 Composite、预检通过、1000 输入 + 200 输出分别按 $1.25/$10 每百万
结算（$0.00125 + $0.002）。

### 2.41 ElevenLabs 音效：矩阵里的 `api_request` 只是空 body 兜底，真实请求按分钟

矩阵快照把 `POST /elevenlabs/v1/sound-generation` 记成 `ApiRequest`，看起来像
"按次无价"。但契约**强制** `model_id`，payload 会把它解析成
`elevenlabs/eleven_text_to_sound_v2`，身份对账发现声明（`api_request`）与目录
（`audio_output_minute`）无交集，按目录改写为 `AudioSecond` + 分钟计量：

```text
model_id + duration_seconds: 10
⇒ 1/6 分钟 × $0.12 = $0.019999999999
```

`tests/billing_sound_generation.rs` 端到端钉住：模式从 `ApiRequest` 被目录改写为
`AudioSecond`、计量单位是 `audio_output_minute`、结算金额按 `duration_seconds`
换算。这条测试同时说明"矩阵形态 ≠ 真实请求形态"：矩阵用空 body 采样，带必填
模型的请求走的是目录价。`per_call_operations_bill_a_single_request` 里的
`api_request` 行因此不代表该端点不可售。

剩余 10 个按次行仍全部是**真实上游动作**（批量创建、runs、容器/向量库摄取与
检索、付费工具），其中没有"带模型但被按次"的隐藏项。

### 2.42 容器文件上传：按会话计费，文件对象本身免费

`POST /v1/containers/{id}/files` 此前被"POST 子资源"规则判成按次，目录又没有
`api_request` 价 ⇒ 500。OpenAI 的容器按**会话**计费（$0.03/session 量级），
文件上传/读取/删除是管理面，不产生会话或模型成本。修法：容器路径一律 Free。

这是"管理面按对象还是按子资源"的一次纠偏：容器子资源不会开启会话，真正的
会话用量发生在 Responses 的 code interpreter 调用里（那条链路仍缺 `container_session`
目录价，见遗留项）。矩阵：Free **118**，ApiRequest **10**。

### 2.43 未定价按次端点：必须 fail-closed，反向锁住"过度免费"

清理完管理面之后，剩下 8 个**真实产生上游动作**的按次端点（批量创建、threads
runs ×3、tools ×2、vector store 摄取 ×2）；vector store 检索已在 2.51 补价。
第 10 个 `ApiRequest` 形态是 `sound-generation`，它必填 `model_id`、真实请求按
`audio_output_minute` 结算（2.41），**不属于未定价集合**。这 8 个缺的是 sdkwork-models 的 `api_request`
官方费率（全量目录只有 `runway/gwm1_avatars` 一条），不是网关逻辑：

* `PricingRule.unit_price_override` 可以覆盖单价，但 `PriceService` 先要求存在
  official 基准价，规则不能凭空造出一条 `api_request` 价；
* 账户费率卡只负责"账户 → 计划"映射，不携带单价。

因此正确姿态是**拒单**而不是免费送。`tests/billing_unpriced_per_call.rs`
作为反向锁：8 个端点必须保持 `ApiRequest` + 预检失败（Pricing / api_request
可诊断），批量创建必须由守卫拒单；vector store search 的已补价路径由
`billing_vector_store_search.rs` 单独钉住。任何把它们误判成 Free 的改动都会红。

### 商业化就绪盘点（176 个 operation）

| 状态 | 数量 | 说明 |
| --- | ---: | --- |
| Free | 118 | 文件/缓存/查询/轮询/管理 CRUD，行业不按次收费 |
| 可售（计量） | 43 | Composite 12 + ResultCount 17 + AudioSecond 4 + VideoSecond 4 + Character 3 + Token 3 |
| 可售（模型驱动） | 1 | `sound-generation`：矩阵行 ApiRequest，真实请求按 `audio_output_minute` |
| Storage（GB-day） | 1 | vector store file 摄取：`$0.10/GB/day`，读 `usage_bytes`（2.64） |
| 已补价按次 | 3 | vector store search $2.50/1k；DeepSeek web tools 5 CNY/1k（global $0.75/1k） |
| 未定价按次（fail-closed） | 5 | 批量创建、threads runs ×3、vector store `file_batches` |
| 已登记不可售 | 5 | Anthropic batch 创建、midjourney ×2、nano-banana ×2 |

可售 **166/176（94.3%）**；剩余 10 个全部有明确阻塞原因（目录缺价 / 结果回收
链路 / 资源绑定），没有任何一个"静默免费"或"按错单位收费"。计数由
`commercial_readiness_counts_are_exactly_166_of_176` 钉住（见 2.45、2.51、2.53、2.54、2.64）。

### 2.44 音乐时长兜底：$0.02/秒还是 $0.02/首？先停下来

Suno 的请求契约把 `duration` 声明为**可选**，响应只有 task id；任务查询已归
Free，不会在完成时回填时长。于是不声明时长的请求落到 `music_output_second` 的
1 秒兜底：

```text
$0.02/秒 × 1 秒 = $0.02/首
```

目录把 Suno 标成 $0.02/**秒**（≈ $1.20/分钟），与行业"按首/按分钟"的量级明显
不一致。若把兜底改成 60 秒，会从 $0.02 跳到 $1.20/首（60× 多收）；维持 1 秒则
长曲子少收两个数量级。**在 sdkwork-models 确认 `music_output_second` 的真实语义
之前，任何一边都是猜**。

本轮不改兜底值，而是把它钉成显式证据
（`tests/billing_music_duration_fallback.rs`）：

* 不声明时长 ⇒ 恰好 1 秒 / $0.02（保守下限，避免多收）；
* 声明 180 秒 ⇒ 180 秒 / $3.60（客户可用声明值覆盖兜底）。

任何修改兜底值的改动都会让这条锁红，迫使改动者先回答"$0.02 是每秒还是每首"。
同类的 `video_output_second` 1 秒兜底也受此约束，但视频请求通常声明时长，影响
面较小。

### 2.45 就绪计数锁：166/176，不是 165/176

就绪报告最初把 `ApiRequest` 形态数（10）当成了"未定价按次数"，漏掉
`sound-generation` 的真实请求按分钟计费（2.41），因此把可售数低估成 160。
修正后的口径必须由可执行锁钉住，而不是只改文档：

* `commercial_readiness_counts_are_exactly_166_of_176` 断言
  `176 = Free 118 + 计量可售 44 + 音效 1 + 已补价按次 3 + 未定价按次 5 + 已登记不可售 5`；
* `UNPRICED_PER_CALL` 明确列出 5 个路径，`PRICED_PER_CALL` 单列已补价的
  vector-store search 与 DeepSeek web tools，并把 `sound-generation` 排除在
  "未定价"之外；
* 任何 operation 的状态漂移（新增 Free、改 mode、补价）都会让计数断言红，
  迫使同步更新报告。

### 2.46 上游 2xx 但零产出：不能按 1 张/条收

图像/视频生成可能以 2xx 返回 `{"data": []}`（内容过滤、空候选、任务未创建），
也可能显式 `result_count: 0`。`result_line` 的 `.max(1)` 把 0 抬成 1，于是"没有
产出"也收一张的钱——这是**多收客户**。

修复：`extract_response_body_usage` 在 `ResultCount` 分支先判断
`result_count_is_explicitly_zero`（数组存在且为空，或显式 count 为 0），命中则：

* 不产用量行；
* 置 `charging.waived = "provider_returned_no_results"`；
* 结算层走 `release_without_charge` 释放预扣，请求成功返回。

字段**缺失**（异步任务回执只有 task id）仍按 1 条任务计费，不会误 waive。
`tests/billing_empty_result_waiver.rs` 四条：空数组、显式 0、正常 2 张、任务回执 1。

### 2.47 2xx 业务失败：媒体路由不能按 1 张/条收

厂商原生媒体 API 常用 **HTTP 200 + 业务错误**返回：

| 厂商 | 失败形态 |
| --- | --- |
| Kling / Vidu | `code != 0`（官方成功码是 0） |
| MiniMax | `base_resp.status_code != 0` |
| Volcengine / 其他 | `error` 非空对象，或 `status ∈ failed/error/cancelled/expired` |

此前这类响应仍按"1 张/1 条"计费——上游没产出，客户却被收费。修复：
`provider_reported_business_failure` 只认**无歧义**的失败词汇，在
`ResultCount / VideoSecond / AudioSecond / Character` 分支命中时置
`charging.waived = "provider_business_failure"`，不产行并释放预扣。

刻意不做"任意非零 code 即失败"：部分兼容实现把 HTTP 状态塞进 `code`（如 200），
那会把成功请求误 waive。token 模式也不在豁免范围：即使响应带错误，已经发生的
token 计算仍要结算。

`tests/billing_business_failure_waiver.rs` 七条：Kling `code != 0`、`status: failed`、
Kling 字符串码 `"1201"`、`code: "error"`、Kling `code: 0` 正常计 1 张、
`error: null`、schema 默认的空字符串错误对象（`{"code":"","message":""}`）不误判。

厂商对同一字段的类型并不统一：部分上游把业务码写成字符串
（`"code": "1201"` 或 `"code": "error"`）。`integer_like` 同时接受数字与数字
字符串；失败词汇（`error`/`failed`/`failure`）单独识别。`"0"` / `"success"`
不会命中。

### 2.48 流式中断的输入 token：客户端断开就免单的绕过

流式请求在首帧之后断开（客户端取消、上游失败、超时）时，`partial_usage_body`
只按已观测输出估算 `completion_tokens`，并显式写 `prompt_tokens: 0`——输入无法
从响应流重建。于是客户端只要在首帧后断开，就能让整段 prompt 免单：

```text
POST /v1/chat/completions {"stream": true, "messages": <大 prompt>}
读一帧 → 断开
⇒ usage {prompt_tokens: 0, completion_tokens: 估算}
⇒ 输入 token 一分不记
```

修复：`record_streaming_usage_body` 在写账前调用
`augment_missing_prompt_tokens`——只有 `prompt_tokens` / `input_tokens` /
`promptTokenCount` **全为 0 或缺省**时才按请求体估算补值（ASCII 4 字符/token，
宽字符 1.33 字符/token），并保留 Anthropic/Gemini 各自的字段名；任何真实正值
都不覆盖。这同时补上了"上游忽略 `include_usage` 的成功流"的输入缺口。

`usage_extraction` 单测 3 条：兜底体补输入、真实输入不覆盖、Anthropic
`input_tokens` 字段补值。

### 2.49 服务端工具按次计费：目录补价 + `output[]` 抽取 + 流式计数

`/v1/responses` 的 `web_search` / `file_search` 是**按次**计费的工具，费用不在
`usage` 令牌帧里：OpenAI 把每次调用作为 `output[]` 的一个 item 返回
（`{"type":"web_search_call"}` / `{"type":"file_search_call"}`）。此前
`web_search_call` / `file_search_call` 两个 meter 在代码里没有任何产出点，带了
工具的 Responses 请求只收 token 费，工具费整段漏收。

本轮按官方顺序落地：

1. **目录补价**（`sdkwork-models`）：6 个在售 OpenAI chat 模型
   （`gpt-5.5-cyber`、`gpt-5.6-cyber/luna/sol/terra`、`gpt-6-astra`）各补
   `web_search_call`（`$10/1k`）与 `file_search_call`（`$2.50/1k`）两条 official
   费率，`unitSize=1000`，`chargeTiming=usage_reported`，source 为
   `https://platform.openai.com/docs/pricing`；`migrate-pricing-v2 --write` 归一化
   12 条、`build-index.mjs` 重建索引；`validate-catalog`（exit 0）、
   `audit-pricing-consistency`（exit 0）、`report-unreachable-pricing.py --check`
   （252 行仍 current）、`migrate-pricing-v2`（0 待迁移）均通过。
2. **抽取**：`usage_extraction` 从响应 `output[]` 计数；流式从
   `response.output_item.done` 计数，并在 `StreamingUsageAccumulator::finish()`
   折叠成合成 `output[]`，让中断流/无 usage 帧的流也能计工具费。
3. **声明**：`declared_meters_for(Composite)` 增加两个 tool meter，预检按目录
   报价；它们**不是必需项**（`requires_complete_pricing` 只要求主档 +
   `llm_output_token`），没有工具价的模型取交集后自动丢弃，不会 fail-closed。
4. **锁**：`tests/billing_hosted_tools.rs` 走完整
   identity → preflight → extraction → finalization → settlement，断言
   `web_search_call` 1 次 `$0.010000`、`file_search_call` 1 次 `$0.002500`，
   同时保留 token 行。`usage_extraction` 新增 2 条单测（`output[]` 计数、流式
   `output_item.done` 计数）。

剩余同类码位（`code_interpreter_session` / `container_session` / `storage_gb_day`）
仍无目录价，按同一顺序等待目录补价，不在本轮凭空收费。

### 2.50 异步对账表与数据库初始化

11 个阻塞项里 5 个（批处理 ×2、background Responses、threads runs ×3 的回收面）
共用的基础设施是"任务完成后回填用量"，此前没有落点。本轮先按 `sdkwork-specs`
的数据库规范把表和生命周期打通：

1. **Schema registry 权威定义**：`docs/schema-registry/tables/ai-metering.yaml`
   新增 `ai_metering_async_task`（profile `tenant_entity`，软删唯一索引，`task_status`
   检查 `pending/running/settled/failed/expired`，`task_kind` 检查四类），顶层
   `ai-metering` 模块表数 2 → 3。
2. **契约与基线**：`db:materialize:contract` 重新生成
   `database/contract/schema.yaml`、`table-registry.json`、
   `database/database.manifest.json`（`materializedTableCount` 38 → 39）与
   `generated/schema/postgres/schema.sql`；基线保留 payment-reconciliation 尾段，
   与既有"注册表 + 模块追加"结构一致。
3. **迁移**：`database/migrations/postgres/0046_ai_metering_async_task.up.sql`
   （`reversible: false` / `forward-fix`，轻量锁、2s lock timeout、30s statement
   timeout）；同定义进基线，clean install 与增量升级收敛。`metadata.json` 登记
   回滚策略；`README.md` 补迁移说明。
4. **验证**：`pnpm db:validate` 通过；`pnpm db:plan` 返回
   `pending_migrations: ["0046_ai_metering_async_task"]` 且 exit 0。

worker 仍未实现：表只提供幂等落点，上述入口继续 fail-closed；实现后按
`docs/design/ASYNC-USAGE-RECONCILIATION.md` 的 `(tenant, task_kind, upstream_id)`
唯一键 + `billing_request_id` 结算一次。

### 2.51 向量库检索：management 路由键绑定工具 SKU，按次 $2.50/1k

`POST /v1/vector_stores/{vector_store_id}/search` 原先落在
`openai/management/vector_stores` 路由键上，目录没有该键的 `api_request` 费率，
预检直接拒单。OpenAI 对 file search 的官方价是 `$2.50 / 1K calls`，一次 search
就是一次调用。

修复分三层：

1. **目录**：新增工具 SKU 模型 `openai/vector-stores`（family `openai-tools`，
   `primaryCapability: tool`），发布一条 `api_request` official 费率
   `$2.50/1k`（`unitSize 1000`，source 为 OpenAI pricing 页）；`validate-catalog`
   通过。
2. **分类**：`POST /v1/vector_stores/{id}/search` 单独分类，路由键仍是
   `openai/management/vector_stores`（保持 sticky/账号选择），但把
   `requested_model` / `requested_model_catalog_key` 指向
   `vector-stores` / `openai/vector-stores`，让定价身份按工具 SKU 解析，而不是
   按 management 路由键解析。
3. **锁**：`tests/billing_vector_store_search.rs` 走完整
   identity → preflight → extraction → finalization → settlement，断言一次 search
   产生一条 `api_request`、数量 1、金额 `$0.002500000000`；矩阵计数锁改为
   166/176，`UNPRICED_PER_CALL` 5 条 + `PRICED_PER_CALL` 3 条。

未做：`/file_batches` 的摄取仍按次未定价（响应没有字节数，需逐文件读取的
worker）；`/files` 已按 `storage_gb_day` 收首日存储（2.64）；`/search` 的响应
条目数不是计费单位，不能按 `data` 数组长度收。

### 2.52 异步对账 store：幂等入队、租约领取、终态收敛

2.50 只建了表；本轮补上 worker 之前必须先有的持久化抽象：

- **Domain**：`AsyncUsageTaskKind`（openai_batch / anthropic_batch /
  background_response / thread_run）、`AsyncUsageTaskStatus`
  （pending/running/settled/failed/expired）、`NewAsyncUsageTask`、
  `AsyncUsageTask`；`billing_request_id()` 固定为
  `async:<kind>:<upstream_id>`，轮询重复不会重复扣费。
- **Port**：`AsyncUsageTaskStore`（enqueue / claim_due / mark_settled /
  reschedule / mark_failed / mark_expired），`claim_due` 带 lease。
- **Postgres**：`PostgresAsyncUsageTaskStore` 用
  `FOR UPDATE SKIP LOCKED` + `next_poll_at` 租约领取，`enqueue` 按
  `(tenant, organization, task_kind, upstream_id)` 幂等
  `ON CONFLICT DO NOTHING`；settle 更新 `billing_request_id` 与 `usage_snapshot`。
- **测试**：`in_memory_async_usage_task_store` 2 条单测（重复入队只留一条；
  领取只取到期行、attempts+1、settled 终态不再被领取），router `--lib` 从
  588 增至 **590**。

worker 与 runtime 已完成（见 2.56 / 2.71 / 2.72）；注册拦截器已挂到创建成功后的
响应上并写入可轮询路径；仍缺 provider executor（HTTP 拉取完成态）。

### 2.53 Gemini 批 embedding：响应无 usage，按请求文本估算 token

`POST /google/v1beta/models/{model}:batchEmbedContents` 原先在
`declared-unrouted.json` 里（无 taxonomy 路由、无资源、无价目），矩阵形态是
`ExternalUsageLine + meter None`，无法售卖。Google 对 embedding 按输入 token
计费，而 `BatchEmbedContentsResponse` 只有 `embeddings[]`，没有 `usageMetadata`。

修复：

1. **taxonomy/resource**：新增 `gemini.batch_embed_contents` 内置路由、资源
   `api.gemini.batch_embed_contents`（path `/v1beta/models/{model}:batchEmbedContents`，
   capability embedding）并挂进 official/admin resource group；移除
   `declared-unrouted.json` 条目。
2. **分类/策略**：`ProviderNativeResourceClassifier` 命中
   `:batchembedcontents`（路径已归一为小写）后，`billing_policy` 返回
   `Token + embedding_input_token + RequestBody`；模型从归一后的路径提取
   （`google/gemini-embedding-2`），定价走目录 embedding token 费率。
3. **抽取**：实现 `BillingQuantitySource::RequestBody` 分支，只统计
   `requests[].content.parts[].text` 的文本字符（ASCII 4 字符/token、宽字符
   1.33 字符/token），不把 JSON key/结构算进 token；无文本时回落到请求体估算。
4. **锁**：`tests/billing_batch_embed.rs` 走完整
   classifier → policy → identity → preflight → extraction → finalization →
   settlement，断言 2 token × `$1/1M` = `$0.000002`；矩阵计数锁改为
   166/176，`UNMETERED_OPERATIONS` 只剩 5 条（Anthropic batch + midjourney ×2 +
   nano-banana ×2）。

代价是**估算精度**：没有 provider tokenizer，估算值可能偏离 Google 实际计数；
方向是"按请求文本保守下界"，不会把空请求算成 1 个 token 以上。`countTokens`
仍留在 unrouted 清单，不冒充可售。

### 2.54 DeepSeek web tools：官方 5 CNY/1k 成功请求

`POST /v1/tools/search` 与 `/v1/tools/fetch` 是 DeepSeek 自营的搜索/抓取 API，
官方定价为 **5 CNY / 1,000 次成功请求**（global $0.75 / 1K），与返回结果数、
`count` 无关。此前路由已按 `ApiRequest + FixedRequest` 分类，但目录没有
`api_request` 费率，预检 fail-closed。

修复：

1. **目录**：新增工具 SKU `deepseek/web_tools`（cn CNY 5/1k、global USD 0.75/1k），
   两个 region 的模型文件除 region/pricing 外保持一致；source 为 DeepSeek docs。
2. **分类**：两个 tool 路由通过 `api_with_billing_model` 指定
   `web_tools` / `deepseek/web_tools`，路由键与资源授权不变。
3. **锁**：`tests/billing_deepseek_web_tools.rs` 对 search/fetch 各跑完整
   identity → preflight → extraction → finalization → settlement，断言一次成功
   请求 = 一条 `api_request`、数量 1、金额 `$0.00075`；空结果仍由
   `billing_result_gate` waive（`deepseek_web_tools_billing` 原有 3 条锁保留）。

### 2.55 异步注册器：把创建响应转成幂等对账任务

2.52 的 store 只有队列语义；本轮补上"谁来入队"的边界对象：

- `AsyncUsageRegistrar` 持有 `Arc<dyn AsyncUsageTaskStore>`，`register(invocation,
  kind, upstream_id)` 从调用上下文构造 `NewAsyncUsageTask`：
  `tenant/organization/user/api_key/request_id`、`task_kind`、upstream id、
  `catalog_key`（请求模型目录键）、`supplier/account/region`。
- 空 upstream id 或未解析上游账号时返回 `DomainError`，不写脏行。
- store 的 `(tenant, organization, task_kind, upstream_id)` 唯一键保证同一创建
  响应重放只入队一次；后续 worker 使用 `billing_request_id =
  async:<kind>:<upstream_id>` 结算，轮询重复不会重复扣费。
- 单测 2 条：重复注册只留一条（并断言 catalog_key/supplier 落库）、空
  upstream id 拒绝。

注册器尚未挂到 batch/background/run 创建后的成功响应；worker 编排已由 2.56
补齐，provider executor 仍待接入。

### 2.56 异步 worker 编排：claim → poll → settle/reschedule/expire

`AsyncUsageTaskWorker` 负责状态机，provider 只实现 `AsyncUsageTaskExecutor::poll`：

- `run_once(now, limit)` 从 store 领取到期任务（`FOR UPDATE SKIP LOCKED` +
  lease），逐条 poll；
- `Completed` → `mark_settled(billing_request_id, usage_snapshot)`；
- `Pending` → `reschedule(now + retry_delay)`，attempts 已在 claim 时 +1；
- `Failed` → `mark_failed`（终态，不收费）；
- 超过 `max_attempts` → `mark_expired`，避免无限轮询与无限保留。

单测 3 条：completed 后不再被领取、pending 按 retry_delay 延后且 attempts
递增、failed 终态。`router-service --lib` 从 592 增至 **595**。

worker 尚未挂到应用启动生命周期，也还没有真实 provider executor；在两者落地
前，batch / background / threads 继续拒单，不会出现"领取了任务却无人结算"的
半成品状态。

### 2.57 货币金额 → Token Bank 积分：正数必须显式汇率，零金额免费

Token Bank 的扣款单位是积分，目录价是货币金额；两者之间只允许一条确定的换算
路径：

1. `customer_charge_amount`（货币）→ `token_points_for_charge`：
   `ceil(amount × currency→CNY × base_points_per_CNY × 1e6)` 微积分；
2. 请求内多条 usage fact 用**累计上界法**分配 `debit_points`，各条之和恰好
   等于总额的向上取整（不会因逐条 ceil 多收）；
3. 钱包按同一总额扣积分，usage 行记录同一 `debit_points`。

本轮把三个隐性偏差改成 fail-closed：

- **未知币种**不再回退到 CNY 汇率。正金额且没有显式
  `currency_to_cny_rates` 时直接报错，避免把 JPY/EUR 按 1:1 扣成人民币；
- **换算失败**不再把该 usage fact 的 `debit_points` 写成 0 后继续扣款。分配
  函数返回错误，结算中止，预扣保留待对账；
- **多币种混单**在分配阶段直接拒绝，不再用第一条 fact 的币种换算其余 fact。

零金额仍是免费：`token_points_for_charge("0", unsupported)` 返回 0，不因
缺少汇率把"无消费"变成结算失败。

`invocation_pricing_settlement` 的 USD 双行用例同时钉住总额与逐行分配：
`$0.0000018 + $0.0000048` 在默认 `70 points/USD` 下是
`126 + 336 = 462` 微积分，而不是两条各自 ceil 后的其它组合。

### 2.58 Token Bank 原子捕获：hold 结算不再 release-then-debit

同步预付路径原来在 `settle_hold` 中先释放 hold，再单独追加实际消费
ledger。两步之间崩溃会丢失扣款；重试也无法判断 debit 是否已经发生。本轮改为
账号域**一次事务内捕获**：

- `SettleAccountHoldCommand` 增加可选 `settled_amount`（不传保持历史全额
  捕获）；
- 账号仓库在同一事务内完成：校验 `0 < settled_amount <= hold.amount`、
  冻结额清零、未用余额退回 available、写入实际消费 ledger、hold 标记
  settled 并记录实际 `settled_amount`；
- edge gateway 的 `settle_hold` 直接用 `settled_amount = actual` 调
  `settle_account_hold`，不再先 release 再 append；
- 幂等：hold settle scope 以 `cloudrouter:<request>:consumption` 为
  idempotency key，请求哈希包含 `settled_amount`；同额重试返回 replay，
  不同额重试哈希冲突而不是复用旧金额；
- 余额审计：ledger 的 `balance_before/after` 是退回未用部分后的 available，
  冻结额与 available 之和守恒；
- 若实际用量超过预扣，账号约束不允许 `settled_amount > hold.amount`，因此先
  全额捕获 hold，再用 `cloudrouter:<request>:postpaid` 幂等键扣差额；差额扣款
  失败时至少基础预扣已经入账，不会退化成整单未收。该分支由
  `billing_transaction` 的 `split_hold_capture` 单测钉住；
- 结算复用 **precharge 当时捕获的汇率快照**，不在响应后重新读管理端配置：
  否则请求中途改汇率会让钱包扣款与 usage 行 `debit_points` 不一致；
- 预扣估算为 0 时本来不会创建 hold；若实际 usage 为正，同步模式回退为
  postpaid 扣款并标记 usage settled，异步模式仍交给 worker，避免重复扣款。

锁：账号仓库 2 条纯校验单测（全额默认、部分捕获上界/零值拒绝）、cloudrouter
`gateway_billing_contract` 的原子捕获/金额入哈希静态契约，以及
`postgres_usage_settlement_store_e2e::hold_partial_capture_is_atomic_and_returns_the_unused_reservation`
（真实 Postgres，断言 available +100、frozen 0、ledger 仅 200），以及
`concurrent_settlement_debits_the_wallet_once`（两个 worker 并发 settle 同一
usage fact，只能一个成功、只产生一条 ledger），以及
`concurrent_hold_capture_debits_once`（两个请求并发捕获同一 hold，只产生一条
200 的消费 ledger、available 只减 200），以及
`concurrent_holds_cannot_overdraw_the_wallet`（两个 600 的 hold 并发争 1,000
余额，只能一个成功，available 400 / frozen 600）。该 e2e 遵循既有约定，未设置
`SDKWORK_DATABASE_URL` 时跳过；当前本地验证因未设置该变量而跳过，CI 需带上
数据库运行。

### 2.59 厂商时段价：time-window 费率只在窗口内覆盖标准价

DeepSeek 的 off-peak 价、部分厂商的夜间价属于 `rate_variant = time_window`：
同一 meter 同时存在 standard 与 time_window 两条费率，窗口外必须落回 standard。

`invocation_pricing_settlement` 新增用例固定：

- `occurred_at = 2026-10-19T02:00:00Z`（Asia/Shanghai 10:00，周一窗口内）
  → 选中 `0.500000` 的 time-window 单价，`matchedWindowCode = weekday-morning`；
- `occurred_at = 2026-10-19T05:00:00Z`（13:00，窗口外）
  → 落回 `0.150000` 的 standard 单价；
- 另有互补窗口用例：工作日 10:00 落 peak `0.5`、工作日 13:00 落 off-peak
  `0.2`、周六 10:00 落 off-peak `0.2`，覆盖 DeepSeek 周末全天谷时的
  日历形状；
- 另有 `includeDates` / `excludeDates` 用例：被排除的周一落 standard，
  被 include 的周二即使不在 `daysOfWeek` 也落 holiday 价，普通周三回落
  standard；证明节假日/调休日历的机制本身已可执行。

该锁同时验证 `PriceService` 收到的是 invocation 的 `occurred_at`，而不是
“当前墙钟”或缓存价；否则窗口价会全天生效，夜间折扣/峰时加价都会失真。

目录当前把 DeepSeek 工作日 `09:00–12:00 / 14:00–18:00` 编码为 peak，其余
工作日时段与周末编码为 off-peak。**法定节假日/调休日历还没有写入
`includeDates` / `excludeDates`**：工作日节假日仍会落到 peak。这是下一项
vendor 日历数据完善，不能靠结算层猜。

### 2.60 已发布但计费未就绪：返回 501，而不是 502

批量创建、background Responses、Realtime 会话，以及 vector store
`files` / `file_batches` 摄取这些“已发布但计费链路尚未启用”的端点，原来走
`Pricing` 错误，HTTP 映射为 **502 Bad Gateway**。这会让客户端误判为上游故障
并自动重试，重试仍然拿不到结果。

现在新增 `InvocationErrorKind::BillingUnavailable`：

- 机器码 `billing_unavailable`；
- HTTP **501 Not Implemented**；
- OpenAI 错误 `type` 仍走 `server_error`（官方 vocabulary 无 501 专用值）；
- 只用于“网关明确尚未实现该计费模式”，不用于价格配置错误（后者仍是
  `pricing_failed`/502）；
- vector store 摄取单独在预检前返回 501，并明确提示“storage byte-day worker
  未启用”，而不是让客户端按 502 重试。

对应测试从断言 `Pricing` 改为断言 `BillingUnavailable`；router lib 新增
501 映射用例，edge 进一步断言响应体
`error.code = billing_unavailable`、`error.type = server_error`、HTTP 501，
避免只改状态码而契约字段漂移。

### 2.61 Code Interpreter：按会话计费，不按代码单元

OpenAI Responses 的 `code_interpreter_call` 只出现在 `output[]`，token usage
frame 里没有它；vendor 按 **$0.03 / container session** 收，不是每个代码单元。

- 目录给 6 个 OpenAI 在售 chat 模型补 `code_interpreter_session`
  （$0.03/session，official）；
- 抽取层看到任意数量 `code_interpreter_call` 只产生 **一条** session 行；
- 流式 `response.output_item.done` 同样折叠为一次 session；`usage_extraction`
  单测覆盖两个 `done` 事件只合成一个 `code_interpreter_call`；
- 新增 `billing_code_interpreter`：一个响应含两个 code cell，断言只生成
  一条 `code_interpreter_session`、数量 1、金额 `$0.03`。

### 2.62 Anthropic web search：按 vendor 的 request 数计费

Anthropic 把 server-tool 用量单独放在
`usage.server_tool_use.web_search_requests`，token usage 里没有搜索次数。
vendor 价是 **$10 / 1K searches**。

- 抽取层只读该 usage 字段，不按 content block 重复计数（重试会重复 block）；
- 目录给 13 个 Anthropic 模型补 `web_search_call`（$10/1k，official）；
- 新增 `billing_anthropic_web_search`：一个响应报告 2 次搜索，
  `web_search_call` 数量 2、金额 `$0.02`，并与 token 行共存；
- 流式用例证明 `message_start.message.usage.server_tool_use` 在
  `message_delta` 覆盖后仍被保留，不会因最后一帧只有 output 而丢失搜索费。

### 2.63 预扣 hold TTL 可配置且有界

固定 30 分钟的 hold 生命周期会让长流式请求在结算前过期：上游成功、客户已收到
内容，但 `settle_hold` 因 hold 过期失败，形成未收款。现在：

- env `SDKWORK_CLOUDROUTER_PREPAY_HOLD_TTL_SECONDS` 可配置；
- 允许范围 `60..86400` 秒；非法/越界/非数字回退默认 1800；
- `create_hold` 使用该 TTL，测试断言默认、合法值和越界回退。

这不是鼓励无限冻结；上限 24 小时防止运营误配把余额长期锁死。

### 2.64 Vector store file 摄取：按 storage GB-day 计费

`POST /v1/vector_stores/{id}/files` 的响应是 vector-store file 对象，带
`usage_bytes`。目录给 `openai/vector-stores` 补 `storage_gb_day`
（$0.10/GB/day）。

- billing policy 把该路由切成 `Storage` + `StorageGbDay` + `ResponseBody`；
- 抽取层读 `usage_bytes`，按 `bytes / 1e9 × 1 day` 生成一条
  `storage_gb_day`；
- `billing_vector_store_storage` 断言 2,000,000,000 bytes → 数量 2、
  金额 `$0.20`；
- `/file_batches` 响应没有字节数，继续 501，等批量逐文件读取的 worker。

**边界**：这里只收首日存储。长生命周期文件的按天 worker 仍是后续项；不能把
首日计费说成完整存储对账，但至少不再让文件摄取完全免费。

### 2.65 存储计量必须"可测量"：缺字节数不得静默收 0

2.64 把 `POST /v1/vector_stores/{id}/files` 切到 `storage_gb_day`，但抽取层对响应里
没有 `usage_bytes` / `bytes` / `size_bytes` 的形态用 `unwrap_or(0)`：数量 0 ⇒ 金额 0。
**0 字节与"读不到"在数量上无法区分**，上游一改字段名，整类摄取就变成静默免费，
而且 0 元事实不触发任何告警。

修法（`usage_extraction::storage_line`）：

- 三个字段都缺失 ⇒ 记账失败（`storage-metered ... carried no usage_bytes`），
  预扣保留交给对账，不再产出 0 元事实；
- 字段**存在且为 0** ⇒ 真实空文件，waive（`provider_reported_zero_storage`）：
  释放预扣、正常返回、不收费；
- `billing_vector_store_storage` 增加两条回归：缺字段必须失败；显式 0 必须 waive
  （与 2 000 000 000 bytes ⇒ 2 GB-day / `$0.20` 的正例对照）。

### 2.66 结算时 hold 已过期 ⇒ 按 ledger 追收，不再丢单

预扣 hold 的 TTL 可配置（2.63），但 `settle_hold` 在 hold 已过期或已释放时直接失败：
账户域已把冻结额退回可用余额，客户也拿到了上游产物，账上却没有扣费。长流式请求
超过 TTL 是必然会发生的情形，不是异常。

修法（`crates/sdkwork-cloudrouter-edge-runtime/src/gateway_billing_account.rs`）：

- `hold_is_gone` 统一识别账户域两条"无法捕获"消息
  （`not in held status` / `hold has expired`）；其余错误（余额不足、金额越界、
  并发冲突）继续原样失败；
- 命中的结算改走 ledger 追收，使用**独立**幂等后缀 `hold-expired-capture`：
  不能复用 `consumption`（与 hold 结算幂等域冲突），也不能复用 `postpaid`
  （与同一次请求的超额扣费冲突）；
- 失败路径的 `release_hold` 同样容忍过期（此前只容忍 `not in held status`，
  过期 hold 会让失败请求的释放报错并把错误冒泡给客户端）；
- 异步对账的"该请求已结算"查询（`has_existing_request_settlement`）把该后缀
  也算作已结算，避免 worker 在追收成功后二次扣费；
- 单测覆盖两条过期消息、七类非过期错误与后缀常量；`gateway_billing_contract`
  与 `postgres_usage_settlement_store_sql_contract` 分别钉住源码行为与 7 个
  `business_no` 占位符。

### 2.67 Assistants 流式：usage 在终态事件的 `data` 下

`POST /v1/threads/runs`（带 `model` 时是 Composite token 计费）的流式响应是 Assistants
事件流，终态帧形如：

```text
event: thread.run.completed
data: {"id":"run_1","object":"thread.run","status":"completed",
       "usage":{"prompt_tokens":100,"completion_tokens":20,"total_tokens":120}}
```

抽取器只认顶层 `usage`、`message.usage`（Anthropic）与 `response.usage`（Responses），
`data.usage` 读不到 ⇒ 正常 EOF 时整条流按输出文本估算，**输入侧完全丢失**。

修法：`streaming_usage_body_from_event` 增加 `data` 容器分支；单测用真实的
`thread.run.created` → `thread.message.delta` → `thread.run.completed` 帧序列断言
`prompt_tokens` / `completion_tokens` 都被合并进结算用量。

### 2.68 Threads runs：带 `model` 时是 token 计费

矩阵用空 body 采样，`POST /v1/threads/runs`、`/v1/threads/{thread_id}/runs` 与
`.../submit_tool_outputs` 因此被记成 `ApiRequest`（未定价）。真实请求带 `model`
时，`PayloadExtractionInterceptor` 会把模型写到 `resource.requested_model`，
计费策略走 `Composite` + `llm_input_token`，目录有 token 价即可售。

本轮补两条回归
（`invocation_billing_policy::threads_runs_with_a_model_bill_model_tokens` /
`streaming_threads_runs_use_the_streaming_accumulator`）钉住这条分支，并在
`openapi_billing_matrix` 的 `UNPRICED_PER_CALL` 注释里写明"条件性"——
不带 `model` 的请求只能继承 assistant 的模型，网关看不到实际模型，继续
fail-closed；这不是"永远不可售"。

### 2.69 预付超额扣费失败：写成待收应收，不得被 worker 当成"已结算"

`split_hold_capture` 在 `actual > reserved` 时先捕获 hold（写 `consumption`
台账），再把差额作为 postpaid 扣。差额扣费若遇余额不足，原实现只把错误冒泡：
usage 事实留在 pending，而异步对账 worker 的"该请求已结算"查询看到
`consumption` 标记就会把事实标成功——**差额被静默抹掉**。

修法：

- `GatewayBillingStore` 新增 `mark_usage_uncollected`（默认 no-op，Postgres 实现
  把该请求的 pending/retryable 事实改成 `settlement_status = 4`、
  `failure_code = 'uncollected_overage'`）；
- 结算拦截器在 hold 已捕获、差额扣费失败时调用它，再返回错误（响应已存在，
  客户端仍拿到产物）；
- 状态 4 不在 worker 的 0/3 重试集合内，因此不会出现"标记已结算但没收到钱"；
  失败码让运营可以按应收清单追收；
- postpaid 账户的扣费失败**不**走这个标记：它没有捕获标记，事实保持 pending，
  充值后 worker 会正常补扣。
- `gateway_billing_contract` 钉住源码行为；edge-runtime 单测钉住失败消息按
  字符截断到 `string(1024)`。

### 2.70 Token Bank 扣费链路的**行为级**回归

前面的锁都在断言"收多少钱"（`settlement_commands` 的金额）。商业化还差一层：
**钱怎么从 Token Bank 出去**。新增 `tests/billing_token_bank_flow.rs`，用真实的
`InMemoryPricingCatalog`（同一套价格同时驱动预扣估算与结算实收）+ 录像桩，跑完整
链路 `policy → identity → preflight → hold → response → extraction → finalization →
settlement → 账户动作`：

| 用例 | 断言 |
| --- | --- |
| `image_generation_freezes_then_captures_exactly_one_price` | `n=1`、产出 1 张 ⇒ 冻结 70 点、捕获 70 点、无超额 |
| `produced_images_beyond_the_reservation_are_charged_as_overage` | 请求 1 张、产出 2 张 ⇒ 捕获 70 点 + postpaid 70 点 |
| `insufficient_balance_at_precharge_maps_to_the_payment_required_kind` | 预扣余额不足 ⇒ `InvocationErrorKind::InsufficientBalance`（402 类），不派发 |
| `failed_provider_response_releases_the_hold_without_a_ledger_entry` | 上游 500 ⇒ 释放 hold，无消费流水、无超额 |
| `overage_debit_failure_records_an_uncollected_receivable` | hold 已捕获、差额失败 ⇒ 调用 `mark_usage_uncollected` 并返回错误 |

这一层刻意**不 mock 定价**：预扣与结算读同一份目录价，避免"冻结按一套价、实收按
另一套价"的口径漂移被单测各自放过。

### 2.71 异步任务完成态：完成时重新定价 + 单笔后扣

创建调用只返回上游 id，用量在完成态才出现。此前 worker 只把任务标成 `settled`，
**没有任何计价与扣费**——即使 executor 接上，也是"回收了用量但不收钱"。

本轮落地结算核心 `ReplayAsyncUsageSettler`：

- **不序列化报价**：`PriceResolution` / `BillingStructure` 来自
  `sdkwork-models-catalog-service`，没有 serde 派生；把预检报价塞进任务行需要跨仓
  改类型。改为在任务 `metadata` 里存创建期上下文
  （`method/path/model/accountGroupId/pricingPlanCode`），完成时**重新定价**；
- **按实测用量重定 tier**：`PricingFinalizationInterceptor` 会带实测行重新解析
  价格，因此分档/缓存等维度用的是真实 token 数，而不是预检时的估算；
- **单笔 postpaid**：异步没有 hold，完成时是第一次知道金额，走一次
  `charge_postpaid` + `mark_usage_settled`；
- **幂等**：结算请求号用任务幂等键 `async:<kind>:<upstream_id>`（不是创建请求
  id），usage 事实与账户台账都按它幂等，worker 崩溃后重跑不会重复计费；
- **失败关闭**：完成态没有任何可计量用量 ⇒ 返回错误让 worker 重排/过期，绝不把
  任务标成 `settled` 而一分钱不收；结算失败同样重排（`settlement_failure_*` 单测）；
- **metadata 持久化**：`NewAsyncUsageTask.metadata` / `AsyncUsageTask.metadata`
  + Postgres 列（表已有 `metadata JSONB`，无需迁移）。

回归：`tests/async_usage_settlement.rs` 三条（100 输入 + 50 输出 token ⇒ `175000`
micro 单笔后扣；重放复用同一 request id；无用量失败关闭）+ worker 单测
（结算失败 ⇒ 重排而非终结）。

**仍未接线**：provider executor（HTTP 拉取完成态）与 runtime 启动逻辑未落地，
因此 5 个异步 operation 继续 fail-closed；本轮的交付是"拿到完成快照后能正确收钱"
这一段，下一轮补 executor 与接线。

### 2.72 异步创建 → 对账任务：注册拦截器与可轮询路径

上一轮只做了"拿到完成快照后收钱"。这一轮把**入队**挂到创建成功后的响应上：

- `AsyncUsageRegistrationInterceptor`（pipeline `after`）识别四个异步创建面：
  `POST /v1/batches`、`POST /anthropic/v1/messages/batches`、
  `POST /v1/responses` + `background: true`、`POST /v1/threads[/{id}]/runs`；
  轮询/取消/同步调用一律放行；
- 从 2xx 响应体取 `id`，并在 `metadata.pollPath` 写入**可轮询**路径
  （创建路径不等于轮询路径：thread run 创建在 `/threads/{tid}/runs`，
  轮询在 `/threads/{tid}/runs/{run_id}`；thread id 缺失时优先取响应体
  `thread_id`，再退回请求路径）；
- 创建**失败**（非 2xx）不登记；2xx 但缺 id / 缺 thread id ⇒ 失败关闭
  （不把不可轮询的任务当成"之后会收钱"）；
- `AsyncUsageRegistrar::register` 增加 `poll_path` 参数并写入 metadata。

回归（router `--lib` 5 条）：background 创建登记 + `pollPath`；同步 responses
不登记；thread run 登记出完整轮询路径；400 响应不登记；缺 thread id 失败关闭。

仍缺 `AsyncUsageTaskExecutor`（HTTP 轮询）与 runtime 启动/接线，因此异步面继续
fail-closed。执行器核心见 2.73。

### 2.73 异步轮询执行器：状态机与传输分离

`AsyncUsageTaskExecutor` 的实现拆成两半：

- **状态解释（本轮，`ProviderAsyncUsageExecutor`）**：按任务
  `metadata.pollPath` 读上游；用 `shared_upstream_account_routes()` 找回创建任务的
  账号（supplier + account_id 必须同时匹配，找不到即失败关闭），解析
  `secret_ref`（有凭证但没配 resolver 也失败关闭，不能匿名轮询）；把 provider
  状态映射成 `Pending` / `Completed` / `Failed`：
  - Responses：`completed` 完成；`failed/cancelled/incomplete` 终结失败；
  - Thread run：`completed` 完成；`failed/cancelled/expired` 终结失败；
    `requires_action` 仍是 `Pending`（等 `submit_tool_outputs`）；
  - HTTP 语义：`404` ⇒ 终结失败（对象不存在，永远不会产生用量）；`429`/`5xx`
    ⇒ `Pending`（下次重试）；其余非 2xx ⇒ 错误（配置/契约问题，任务保持可见）；
  - **batch 明确未实现**：用量在结果文件里，batch 对象本身不含 per-request usage；
    返回错误让任务保持可见，绝不用一个不含用量的对象走结算（创建面仍被预检拒单）。
- **传输（`AsyncUsagePollTransport` 端口）**：请求携带账号 base_url/auth
  profile/凭证与路径，由宿主实现 HTTP/TLS/代理/出站策略/超时/响应体上限。这样
  轮询不会另开一条绕过既有出站安全策略的 HTTP 路径；测试用假 transport 覆盖状态
  机，无需网络。

回归（router `--lib` 7 条）：completed 就绪、四种运行态保持 pending、三种终结
失败、404/429/5xx 分流、缺 `pollPath` 失败关闭、未知账号失败关闭、batch 未实现。

仍缺：edge-runtime 的 `AsyncUsagePollTransport` 实现（复用现有 dispatcher/出站
策略）与 runtime 启动接线；5 个异步 operation 继续 fail-closed。

### 2.74 轮询传输：复用既有 dispatcher，而不是另开 HTTP 客户端

`PipelineAsyncPollTransport` 把一次轮询表达成**合成的 Free `GET` 调用**：

- 用与网关相同的分类器构造 `Invocation`（`/v1/**` 走 OpenAI 面，其余走供应商
  原生面），计费档 `Free`（轮询不收费）；
- 账号、base URL、auth profile、凭证全部来自任务的创建账号，不接受任何外部目标；
- 通过 `ProviderRequestBuilder` 生成上游请求（路径校验、认证头注入、query 清理
  与普通请求完全一致），再交给注入的 `InvocationDispatcher` 发送；
- TLS、代理、出站目标策略（SSRF）、超时、响应体上限沿用现有 dispatcher —— 轮询
  不会形成第二条绕过出站管控的 HTTP 路径；
- dispatcher 的 `status_code`/`body` 原样返回，由 2.73 的状态机解释。

回归（router `--lib` 4 条）：带凭证 GET（断言 `Authorization: Bearer …` 由
builder 注入）、无凭证保持匿名、429 原样透传、传输失败映射为错误。

仍缺：runtime 启动 worker + 注册拦截器进 pipeline + 解除预检拒单。

### 2.75 定价门禁回归修正：缺"采购价"不是路由失败

`upstream_route_selector` 有 4 条用例仍按旧契约断言"缺上游成本价 ⇒
`PricingUnavailable`"，而实现早已按 sdkwork-models 的契约改为：门禁只要求
**目录发布了可推导对客收费的费率**；缺采购价只表示该账号毛利未知，不得让客户
请求变成不可路由（否则只发布 `official` 价侧的目录会让所有直连官方账号不可用）。

这 4 条因此长期红着。本轮按新契约改写：

- 缺采购价仍可选择（2 条）；
- 价格按 catalog key 而非供应商维度解析，两个已定价候选按优先级选择（1 条）；
- 保留真正的负例：目录对该资源**完全没有费率** ⇒ `PricingUnavailable`
  （1 条，改用未定价 route key）。

这不是放宽门禁：`ensure_account_route_is_priced` 仍要求目录费率，未定价资源继续
fail-closed；改的只是"采购价缺失"这一条旧假设。

### 2.76 异步对账 worker 的运行配置：默认关闭、边界有界

`AsyncUsageWorkerConfig` 从环境变量解析（`SDKWORK_CLOUDROUTER_ASYNC_USAGE_*`）：

- **默认关闭**：未显式启用时，异步创建面继续在预检拒单，不存在"接单但永不结算"
  的时间窗；
- 边界：`interval ≥ 1000ms`（默认 30s）、`batch ∈ 1..=200`（默认 50）、
  `lease ∈ 10..=3600s`（默认 60）、`retry ∈ 5..=3600s`（默认 30）、
  `max_attempts ∈ 1..=1000`（默认 60）；
- 非法值**降级为关闭**并 `warn`，而不是带着错误参数启动——worker 是"异步面是否
  可售"的开关，不能静默跑偏；
- `normalized()` 再做一次 clamp，防止运行时配置被绕过。

回归（router `--lib` 3 条）：默认关闭、越界值 clamp、非法值在归一化前被拒绝。

### 2.77 异步对账纵向集成：入队 → 扣费 → 幂等终态

各层分别有锁之后，还需要一条**装在一起**的回归，证明主链真的通：
`tests/async_usage_reconciliation.rs` 用真实组件跑一遍：

```text
AsyncUsageRegistrationInterceptor（创建响应 {"id":"resp_1"}）
  → AsyncUsageTaskStore 入队（metadata.pollPath）
  → AsyncUsageTaskWorker.run_once（假 executor 返回 completed + usage）
  → ReplayAsyncUsageSettler（live catalog 重新定价）
  → RecordingBillingStore: charge_postpaid = 175000 micro（100 输入 + 50 输出 token）
  → mark_usage_settled 使用 async:background_response:resp_1
  → 第二次 run_once 不再领取
```

只把 HTTP（transport）换成假实现；store、worker、settler、定价、账户动作都是
真实组件。这条锁能抓住"各层单测都绿、装起来却漏扣/重扣"的集成缺陷。


### 2.79 批处理对账：创建放行、完成态按结果文件逐行计价

OpenAI / Anthropic 批处理是"创建时无用量、完成时才有用量"的第三种形态。本轮把整条链补齐：

1. **创建**：worker 启用时 `POST /v1/batches` / `POST /anthropic/v1/messages/batches` 按
   `Free` 放行（创建本身没有可定价的 `api_request` 费率）；worker 关闭时仍是
   `ApiRequest`，由预检守卫拒单——不会出现"接了单没人收钱"。
2. **轮询**：`status=completed` / `processing_status=ended` 后读取 `output_file_id` 或
   `results_url`，再通过同一账户传输下载结果文件（原始字节）。
3. **聚合**：`sum_openai_batch_usage` / `sum_anthropic_batch_usage` 按
   `(model, endpoint)` 聚合，endpoint 由 `response.body.object` 判定
   （`chat.completion` / `response` / `list` / `anthropic.message`）；失败行只计数、
   不计 token；未知 object 或非法 JSONL 整体失败关闭。
4. **结算**：`ReplayAsyncUsageSettler` 识别 `batchUsage` 行，每行用真实端点重新定价，
   并使用 `task:model:kind` 作为幂等键，因此重试不会重复扣费。

回归：批处理结算 1 条（chat 175 000 micro + responses 350 000 micro 两笔后扣）、
执行器 3 条、聚合 3 条、创建门控 1 条；计费套件 **62 targets / 423 passed**。


### 2.80 剩余唯一非 Deprecated 入口：`file_batches` 的存储计费缺口

`POST /v1/vector_stores/{id}/file_batches` 是 OpenAI 官方接口（非 Deprecated），继续
fail-closed 的原因不是"没有用量"，而是**用量不在响应里**：创建响应只有 `file_counts`，
而计费单位是这些文件进入向量库后的**存储字节**（GB-day），字节数需要按 `file_ids`
逐个读取文件元数据。

因此它不能像单文件 `POST /v1/vector_stores/{id}/files` 那样从响应 `usage_bytes` 直接
取数。正确做法与批处理同构：

1. 创建按 `Free` 放行（仅 worker 启用时）；
2. 后台任务读取 `file_ids`，对每个 id 通过既有 dispatcher 调 `GET /v1/files/{id}`
   取 `bytes`（同账户凭证、同出站策略）；
3. 汇总字节后按 `storage_gb_day` 记一条完成态用量，走与现在一致的
   `ReplayAsyncUsageSettler` 后扣；
4. 任一文件取不到大小即失败关闭，不按"估算字节"计费。

在实现 2–4 之前保持拒单：接受创建却收不到存储费，就是静默免费。该入口是唯一剩余
的非 Deprecated 缺口；4 个 midjourney/nano-banana 入口已按 vendor 不存在标记
Deprecated（2.78）。

## 四、5 个"无专属计量单位且仍不可售"端点（已登记）

## 四、5 个"无专属计量单位且仍不可售"端点（已登记）

## 四、5 个"无专属计量单位且仍不可售"端点（已登记）





文件、缓存、批量查询/取消与计数工具已归为 Free（2.36）。`gemini:batchEmbedContents`
已在 2.53 接入 token 估算；剩下 5 个（3 组）仍"无计量单位
且不可售"，测试 `unmetered_operations_are_exactly_the_ones_we_acknowledged` 把它们
钉成白名单：新增的同类端点必须显式登记，否则测试红。

| 端点组 | 原因 |
| --- | --- |
| `/midjourney/v1/images/generations`（+ 轮询） | 本仓没有 `midjourney.*` 资源与账号绑定；要按张计费需先补资源（功能项，非计费项） |
| `/nano-banana/v1/images/generations`（+ 轮询） | `nano-banana` 命名空间没有目录模型；`gemini.nano_banana.image_generation` 只服务 `/google/v1beta/models/nano-banana:generateImages` |
| `/anthropic/v1/messages/batches`（POST 创建） | 结果回收链路未落地，预检守卫拒单（2.23） |

## 五、如何维护这份口径

逐层加的锁，缺一不可。它们各自能红在不同的地方，少一把就有一类缺陷不带报警地过：

| 测试 | 锁住什么 |
| --- | --- |
| `tests/openapi_billing_matrix.rs` + `tests/golden/openapi_billing_matrix.tsv` | **形态**：176 个 operation 各自按什么单位计费（路由声明层） |
| `tests/billing_quantity_families.rs` | **数量**：这个单位量出多少（每个家族一条真实上游响应） |
| `tests/billing_catalog_resolution.rs` | **目录改写**：目录把计量单位改掉之后，形态与数量都跟着改对 |
| `tests/billing_precharge_estimate.rs` | **预扣下界**：派发前冻结的金额 == 请求声明的量 × 单价 |
| `tests/billing_media_entrypoints.rs` | **逐接口数量**：每个媒体入口按**契约里的响应形状**量出多少 |
| `tests/billing_token_entrypoints.rs` | **逐接口流式数量**：每个 token 入口按**契约里的帧序列**（SSE / NDJSON / JSON 数组）结算出多少，且媒体路由不被 `stream` 标志改价 |
| `tests/billing_cache_token_fallback.rs` | **缺价回退**：目录没有缓存价时，缓存 token 是否按输入价结算而不是落成 0 元事实 |
| `tests/billing_modality_token_entrypoints.rs` | **逐模态单价（OpenAI 形状）**：一次响应里混着音频/图像/文本 token 时，是否各自落在**自己的计量单位**上（而不是全部按文本价） |
| `tests/billing_google_modality_tokens.rs` | **逐模态单价（Google 形状）**：`promptTokensDetails` / `candidatesTokensDetails` 数组是否被读到；Gemini TTS 音频产出、图像产出、实时音视频输入、embedding 模态是否各自落档；目录无模态价时是否留在文本行 |
| `tests/billing_unmeterable_tts.rs` | **可结算性守卫（合成）**：token 计价的二进制语音合成是否在派发前拒单；聊天 / 识别 / 字符价合成三条对照是否继续放行 |
| `tests/billing_unmetered_batch.rs` | **可结算性守卫（批量）**：批量创建是否在结果回收链路缺失时拒单；轮询 / 取消 / 普通按次三条对照是否继续放行 |
| `tests/billing_unmetered_async_usage.rs` | **可结算性守卫（异步响应）**：`background: true` 是否在用量回填缺失时拒单；同步 / `background:false` / 轮询 / 取消 / 普通按次五条对照是否继续放行 |
| `tests/billing_unmetered_realtime.rs` | **可结算性守卫（实时语音）**：四条创建面是否拒单；hangup / 普通聊天两条对照是否继续放行 |
| `tests/billing_image_tier_resolution.rs` | **图像档位解析**：单档位 `tier_code` 费率在无请求档位时是否可售；多档位是否继续 fail-closed；无条件费率是否不受影响 |
| `tests/billing_anthropic_cache_write.rs` | **缓存写入档位**：默认 5m（1.25×）/ 显式 1h（2×）/ 缓存读对照 / 无条件费率对照 |
| `tests/billing_context_tier.rs` | **上下文分档**：三档金额 / 40k 实测档位 / 超最高档取最高价 / 歧义命名继续 fail-closed / 无条件费率对照 |
| `tests/billing_cache_read_modality.rs` | **缓存读逐行模态**：纯音频缓存 / 混合模态拆分 / 无明细按文本 / 无条件费率对照 |
| `tests/billing_alibaba_cache.rs` | **显式/隐式缓存**：无标记走隐式档 / `cache_control` 走显式档 / 单档位缓存写入 / 单档位缓存读对照 |
| `tests/billing_unmetered_management.rs` | **厂商管理面 Free**：18 个文件/缓存/查询/计数端点不预扣不结算 / 空目录过预检 / 批量创建仍拒单 / 付费生成面不误放行 |
| `tests/billing_openai_management.rs` | **OpenAI 管理面 Free**：40 个 CRUD/轮询端点 Free / 空目录预检 / 10 个计算型子端点（runs、compact、file_batches、search、container files、video edits）不被误放行 |
| `tests/billing_async_task_query.rs` | **异步轮询 Free**：Kling/Vidu/火山/Suno/Gemini 5 个 task_query + input_tokens 不预扣 / 空目录预检 / 4 个生成或工具面不被误放行 |
| `tests/billing_responses_compact.rs` | **压缩按 token**：compact 是 Composite、预检可解析、输入/输出各自落在自己的计量单位与金额 |
| `tests/billing_sound_generation.rs` | **音效按分钟**：必填 `model_id` 把 `api_request` 兜底改写成 `audio_output_minute`、10 秒按 1/6 分钟结算 |
| `tests/billing_unpriced_per_call.rs` | **未定价不得免费**：7 个按次端点保持 ApiRequest + 预检失败，批量创建与 file_batches 由守卫拒单 |
| `tests/billing_vector_store_search.rs` | **向量库检索按次**：management 路由绑定 `openai/vector-stores` 工具 SKU，一次 search = 一条 api_request（$0.0025） |
| `tests/billing_vector_store_storage.rs` | **向量库存储**：2 GB-day ⇒ `$0.20`；缺 `usage_bytes` ⇒ 记账失败（不产 0 元事实）；显式 0 字节 ⇒ waive |
| `gateway_billing_account` 单测 + `gateway_billing_contract` | **Token Bank 追收**：过期 hold 走 `hold-expired-capture` 独立幂等后缀；释放容忍过期；对账查询识别该后缀；非过期错误仍失败 |
| `usage_extraction` 单测（Assistants 帧序列） | **Assistants 流式用量**：`thread.run.completed.data.usage` 的输入/输出 token 必须进入结算用量 |
| `invocation_billing_policy`（threads runs 带 model / stream） | **条件性可售**：带 `model` 的 run 是 Composite token；`stream: true` 走流式累加器 |
| `gateway_billing_contract::uncollected_overage_is_recorded_instead_of_being_marked_settled` | **超额应收**：hold 已捕获但差额扣费失败时写 `uncollected_overage` 终态，不被 worker 误标已结算 |
| `tests/billing_token_bank_flow.rs` | **扣费链路行为**：冻结 → 捕获 → 部分/超额 → 余额不足 402 → 失败释放 → 应收标记，全部断言账户侧金额与动作 |
| `tests/async_usage_settlement.rs` + worker 单测 | **异步完成态结算**：完成时重新定价、单笔 postpaid、任务幂等键重放、无用量失败关闭、结算失败重排 |
| `async_usage_registration` 单测（5 条） | **异步创建入队**：background/thread run 登记 + `pollPath`、同步与失败创建不登记、缺 thread id 失败关闭 |
| `tests/async_usage_reconciliation.rs` | **异步纵向集成**：创建登记 → 领取 → 轮询 → 重新定价 → `175000` micro 单笔后扣 → 幂等终态 |
| `provider_async_usage_executor` 单测（7 条） | **异步轮询状态机**：完成/运行/失败、404/429/5xx 分流、缺 pollPath/未知账号失败关闭、batch 未实现 |
| `async_poll_transport` 单测（4 条） | **轮询传输**：带凭证 GET 走既有 dispatcher、无凭证匿名、429 透传、传输失败映射错误 |
| `tests/billing_batch_embed.rs` | **批 embedding 估算**：响应无 usage 时按 `requests[].content.parts[].text` 估算 `embedding_input_token`，2 token ⇒ $0.000002 |
| `tests/billing_deepseek_web_tools.rs` | **DeepSeek web tools**：search/fetch 各一次成功请求 = 一条 `api_request`（5 CNY/1k，global $0.00075/次） |
| `tests/billing_music_duration_fallback.rs` | **音乐时长兜底**：不声明时长 = 1 秒 / $0.02；声明 180 秒 = $3.60。兜底值变更必须先确认目录语义 |
| `openapi_billing_matrix.rs::commercial_readiness_counts_are_exactly_165_of_176` | **就绪计数**：176 = 118 Free + 43 计量 + 1 音效 + 3 已补价按次 + 6 未定价 + 5 不可售；未定价/已补价集合逐条枚举 |
| `tests/billing_empty_result_waiver.rs` | **零产出 waive**：空数组 / 显式 0 不产行并 waive；正常 2 张、任务回执 1 条两条对照 |
| `tests/billing_business_failure_waiver.rs` | **业务失败 waive**：Kling 数字/字符串 `code`、`status: failed`、`code: "error"` 不收费；`code: 0`、`error: null` 两条对照 |
| `usage_extraction` 单测 | **中断流输入估算**：缺输入时按请求体补值；真实输入不覆盖；Anthropic `input_tokens` 字段补值 |

```ini
# 1. 任何分类臂 / taxonomy 计量单位 / 计费策略的改动，都会让快照红
cargo test -p sdkwork-cloudrouter-router-service --test openapi_billing_matrix --test billing_media_entrypoints --test billing_token_entrypoints --test billing_modality_token_entrypoints --test billing_google_modality_tokens --test billing_quantity_families --test billing_catalog_resolution --test billing_precharge_estimate --test billing_cache_token_fallback

# 2. 确认改动是"变更意图"后刷新快照，并逐行 review diff
UPDATE_BILLING_MATRIX=1 cargo test -p sdkwork-cloudrouter-router-service --test openapi_billing_matrix
git diff services/sdkwork-cloudrouter-router-service/tests/golden/openapi_billing_matrix.tsv
```

快照的每一行是 `METHOD\tPATH\tapi_code\tresource_type\t声明meter\t最终mode\t最终meter\t数量来源`。**diff 即计费变更**，review 时只需要看有没有哪一行从"按秒/按张"掉回"按次"。

**为什么必须逐层加锁**：每一层都能单独"看起来正常"。

- 只有形态锁：Suno 按 `music_output_second` 计费（形态正确）却只量到 1 秒，一条 3 分钟的曲子少收 120 倍（2.7）。
- 只有**家族级**数量锁：MiniMax 用扁平 `extra_info` 跑绿，契约里的 `data.extra_info` 却读不到（2.11）——家族级用例只能证明"某一种形状读对"。
- 形态 + 数量都对，预扣仍可能只冻结 1 个单位 ⇒ 余额不足也能下单（2.9）。
- 四层都对，声明一个未实现的数量来源仍会让整条路由永久免单（2.14）。
- 五层都对，**流式**仍是另一条取数路径：没有 usage 帧就整条免单、Gemini 的 `usageMetadata` 在兜底里读不到（2.15/2.16）。
- 六层都对，**客户端可控输入**还能改掉形态：请求体里一个 `stream` 标志就让媒体路由塌成 token 复合 ⇒ 0 行 ⇒ 免单（2.17）；契约声明 `application/json` 的流式入口用 SSE 解析器读（2.18）。
- 七层都对，**目录本身缺一个 SKU** 就能让这部分用量收 0：缓存读/写没有费率时，缓存命中 token 落成 0 元事实（2.19）——预检对缓存计量特意不 fail-closed，于是 0 元既不报错也不告警。
- 八层都对，**同一个数量配错了单价**仍会漏收：音频/图像 token 混在 `prompt_tokens` 里被按文本价结算（2.20），形态、数量、预扣、结算全部"正常"，只有费率是错的——这类偏差只能靠**逐模态**用例才发现。
- 九层都对，**厂商的上报形状**还能让整套模态拆分失效：OpenAI 是扁平字段、Google 是数组（2.21）。同一套"逐模态"断言若只喂 OpenAI 形状，Gemini TTS 的音频产出仍会落到无价的 `llm_output_token` 上——而且失败发生在响应之后，客户端无感。
- 十层都对，**上游根本不给可计量的量**时，前面所有"抽取正确"都无从谈起：二进制音频响应没有 `usage`，目录却按 token 报价（2.22）。这时唯一安全的动作是在派发前拒单——放行就是免费，事后补抽取救不回来。
- 十一层都对，**用量根本不经过网关**时，"抽取层写得再对"也永远看不到它：批量任务的逐请求 usage 在上游异步输出文件里，网关只看到一次管理请求（2.23）。这一层只能靠"回收链路 + 批价"补，或者拒单。
- 十二层都对，**用量在"另一个请求"里**：`background: true` 的响应当次没有 usage，完成态才在后续 GET 里出现（2.24）。计费入口与用量入口不是同一次调用时，"预检有价 + 抽取正确"仍然收不到钱，只能后置回填或拒单。
- 十三层都对，**用量在另一条协议里**：实时语音的 HTTP 创建面只给会话与上游临时密钥，音频走 WebSocket 直连（2.25）。HTTP 计费链再完整也看不到 WS 帧，而且上游密钥一旦透传，客户连"经过网关"都不再需要——计费与控制同时失效。
- 十四层都对，**目录的计价维度请求里根本没有**：图像费率条件化在 `tier_code` 上，而请求 schema 只有 prompt/model_name（2.26）。此时"有价"与"能卖"是两件事——条件把候选过滤干净，预检只能拒单。视频靠 `ai_model_video_profile` 补上了这一维，图像没有对应表。
- 十五层都对，**目录给了档位、请求也给了信号，但复合档没声明这个计量单位**：缓存写入的 5m/1h 两条费率一直存在，`declared_meters_for` 却没把 `llm_cache_write_token` 列进去（2.27）。预检不为它出价 ⇒ 抽取层"无价并入输入" ⇒ 按 1× 收。声明侧漏一个码位，价格对了也用不上。
- 十六层都对，**档位取决于一个动态量**：上下文分档把 input/output/cache-read 的价格绑在 prompt 长度上（2.28），预检时还没有 `usage`。不估算就整类模型不可售；只按估算结算就会在跨档时收错价。必须"预检估算 + 结算用真实用量"两套输入，且超界时取最高档。
- 十七层都对，**同一个计量单位在一次响应里需要多个费率**：缓存读的 text/audio/image 三档不能用调用级的一个 `media_type` 表达（2.29），必须把命中按模态拆成多条行、每行自带维度；预检还得用合成行试探，否则"无报价"的兜底会把折扣令牌按全价收——这次是多收客户。
- 十八层都对，**两档语义靠一个不在契约里的行业标记区分**：Alibaba 显式/隐式缓存价差 2×（2.30），只能从 `cache_control` 标记推断；没有标记时按隐式档（供应商默认行为）。标记缺失或换了名字，就会按错档收费——这类"契约没写、行业默认"的输入必须显式登记假设。
- 全都对，目录改写仍可能把按秒改成按条（目录层）。

## 六、回归矩阵

| 项 | 结果 |
| --- | --- |
| `cargo test --test openapi_billing_matrix` | **15 passed**（176 operation 全覆盖 + 家族断言 + 白名单 + 「未实现数量来源」不变式；`RequestBody` 已实现，仅 `ResponseHeaders` 仍禁止） |
| `cargo test --test billing_quantity_families` | **11 passed**（音乐 3 / TTS 3 / 视频 3 / 图片 1 / 按次 1） |
| `cargo test --test billing_catalog_resolution` | **5 passed**（视频按秒 / 图像 token / 音效分钟三条改写 + 两项对照） |
| `cargo test --test billing_precharge_estimate` | **12 passed**（视频 2 / TTS 2 / 音乐 1 / 音频分钟 1 / 图片 1 / 响应计量 1 + 2 项对照 + 输入池取最高价 2） |
| `cargo test --test billing_media_entrypoints` | **17 passed**（图片 7 / 视频 3 / 音乐 4 / TTS 1 / STT 2，全部按契约响应形状） |
| `cargo test --test billing_token_entrypoints` | **16 passed**（流式接线 1 / OpenAI chat 2 / Responses 2 / Anthropic 1 / Gemini SSE 1 / Gemini JSON 数组 3 / 无 usage 帧兜底 2 / `stream` 标志不得改价 2 / 媒体策略第二道防线 1 / 宽字符 1） |
| `cargo test --test invocation_streaming_usage` | 2 passed（Responses SSE 跨帧嵌套用量） |
| `cargo test --test billing_cache_token_fallback` | **3 passed**（缺缓存读价 ⇒ 并入输入 + 金额；有缓存价 ⇒ 独立成行 + 缓存价；Anthropic 三段互斥形态） |
| `cargo test --test billing_modality_token_entrypoints` | **5 passed**（chat 音频拆分 + 金额 / realtime 单数形态三段拆分 / 无模态价 ⇒ 留在文本行 / 脏数据不产负数量 / 缓存音频不二次收） |
| `cargo test --test billing_google_modality_tokens` | **7 passed**（Gemini TTS 音频产出 + 金额 / 实时多模态音视频输入 / 图像产出 + 文本输入 / 无模态价对照 / 缓存音频不二次收 / embedding 文本主档 / embedding 图像输入拆分） |
| `cargo test --test billing_unmeterable_tts` | **5 passed**（token 价 OpenAI 合成拒单 / token 价 ElevenLabs 合成拒单 / 字符价合成放行 / 聊天放行 / 识别放行） |
| `cargo test --test billing_unmetered_batch` | **5 passed**（OpenAI 批量创建拒单 / Anthropic 批量创建拒单 / 轮询放行 / 取消放行 / 普通按次放行） |
| `cargo test --test billing_unmetered_async_usage` | **6 passed**（`background:true` 拒单 / `background:false` 放行 / 无标志放行 / 轮询放行 / 取消放行 / 普通按次放行） |
| `cargo test --test billing_unmetered_realtime` | **6 passed**（sessions / calls / transcription_sessions / translations 四条创建拒单；hangup / 普通聊天放行） |
| `cargo test --test billing_image_tier_resolution` | **5 passed**（单档位 `res_1k_2k` 放行 + 金额 / 多档位继续 fail-closed / 无条件对照 / t2i-i2i-multi_ref 三模式 / 同模式多档 fail-closed） |
| `cargo test --test billing_anthropic_cache_write` | **4 passed**（5m 默认 1.25× / 1h 显式 2× / 缓存读对照 / 无条件缓存写入对照） |
| `cargo test --test billing_context_tier` | **7 passed**（20k / 40k / 200k 三档金额、300k 取最高档、累计词汇 20k/100k/500k/2M、非数值 fail-closed、无条件对照） |
| `cargo test --test billing_cache_read_modality` | **4 passed**（音频缓存 $8 档 / 混合模态拆分 / 无明细文本 / 无条件对照） |
| `cargo test --test billing_alibaba_cache` | **4 passed**（隐式档 / 显式档 / 单档位缓存写入 / 单档位缓存读对照） |
| `cargo test --test invocation_billing_policy` | 16 passed（两个媒体用例已按新语义重写；新增 threads runs 带 `model` 与 `stream` 两条） |
| `cargo test --test invocation_usage_extraction` | 23 passed（STT 用例改为按分钟断言） |
| `cargo test --test invocation_billing_contract` | 5 passed |
| `cargo test --test invocation_pricing_settlement` | 14 passed |
| `cargo test --test invocation_usage_recording` | 10 passed |
| `cargo test --test invocation_provider_adapter_dispatch` | 6 passed |
| `cargo test --test gateway_billing_contract` | 11 passed（含预扣保留 / 释放 / 过期 hold 追收的源码契约） |
| `cargo test --test billing_vector_store_storage` | 3 passed（2 GB-day ⇒ $0.20 / 缺字节数 fail-closed / 显式 0 字节 waive） |
| `cargo test --test invocation_classification` | 10 passed（DeepSeek 工具 SKU 断言同步到 `deepseek/web_tools`） |
| `cargo test --test deepseek_web_tools_billing` | 9 passed |
| `cargo test --test ai_route_taxonomy` | 3 passed |
| `cargo test --test openai_contract` | 7 passed |
| `cargo test --test openai_contract_classification_coverage` | 3 passed |
| `cargo test --test invocation_pipeline` | 3 passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs` | **passed**（122 个 OpenAI-compatible operation 全部有分类臂） |
| `cargo fmt --check` | 干净 |

第 25 轮基线：**62 个计费 target / 422 passed / 0 failed**（历史分项快照：形态 15 + 逐接口媒体数量 17 + 逐接口流式数量 16 + 逐模态单价 OpenAI 5 + 逐模态单价 Google 7 + 可结算性守卫 35 + 图像档位 5 + 缓存写入档位 4 + 上下文分档 7 + 缓存读模态 4 + Alibaba 缓存 4 + 缓存缺价回退 3 + 家族数量 11 + 目录改写 5 + 预扣 12 + 音乐兜底 2 + 就绪计数 1 + 空结果 waive 4 + 业务失败 waive 7 + 服务端工具 1 + 向量库检索 1 + 向量库存储 3 + 批 embedding 1 + DeepSeek web tools 2 + Token Bank 行为 5 + 异步结算 3 + 既有计费/契约/分类/payload；新增用例已计入 418）。edge-runtime `--lib` **101 passed**（流式传输层 + 流式协议映射 + usage-only chunk 过滤 5 条 + BillingUnavailable 501 映射 1 条 + hold TTL 1 条 + 过期 hold 分类 1 条）。`--lib openai_usage` **12 passed**（中继侧输入量口径）。router-service 全量 **175 个 target / 1817 passed / 2 failed**，2 条均为 **payment 域 HEAD 既有**（与本轮计费改动无关）：`postgres_payment_intent_runtime_sql_contract` 2（退款 SQL 列/状态词汇已变更，测试未同步；需人工确认后修）。原 `upstream_route_selector` 4 已按新定价契约修正（见 2.75）。**注意 `verify.yml` 不跑 `cargo test`**（只 clippy/audit/deny/SBOM），所以"green verify gate"不能当作测试基线。

### 变异自证（三层）

断言最容易写成恒绿（算错也过）。三层都做了变异验证：

| 变异 | 期望与实测 |
| --- | --- |
| 预扣：`conservative_media_units` 强制返回 `None`（= 修复前行为） | 8 个媒体用例全红，2 个对照（按次 / token）保持绿 ✅ |
| 数量：`RESULT_ARRAYS` 去掉 `predictions` / `creations` | Google / Vidu 三个用例转红，其余保持绿 ✅ |
| 数量：容器扫描退化为一层 | MiniMax / STT 用例转红 ✅ |
| 数量：分钟档兜底改回 1 秒 | STT 无时长用例转红 ✅ |
| 数量：空数组回落请求 `n` | 空数组用例转红 ✅ |
| 流式：`thoughtsTokenCount` 归零 | Gemini 累计用例转红（output 80→50），其余 7 条保持绿 ✅ |
| 流式：兜底只认 `usage`（去掉 `usageMetadata`） | Gemini 累计用例转红 ✅ |
| 流式：不统计 Gemini 的 `candidates[].content.parts[].text` | Gemini 无 usage 用例转红（估算 2→0）✅ |
| 流式：逐字段合并退回整帧覆盖 | Anthropic 用例转红（input 100→0）✅ |
| 流式：丢弃宽字符（CJK）估算 | CJK 用例转红（3→0）✅ |
| 流式：关闭 Responses 顶层 `delta` 统计 | Responses 无 usage 用例转红 ✅ |
| 流式：`cached_tokens` 不读 `input_tokens_details` | Responses 终态用例转红（input 80→100）✅ |
| 绕过：去掉载荷守卫（`stream` 一律改形状） | `stream` 标志用例转红（媒体路由变 `SseStream`）✅ |
| 绕过：去掉策略守卫（ProviderNative 无条件走 composite） | 第二道防线用例转红 ✅ |
| 数组：只认整份单行、不逐元素解析 | 两条 JSON 数组用例转红 ✅ |
| 缓存回退：取消"无价则并入输入" | 两条 `unpriced_*` 用例转红，有价对照保持绿 ✅ |
| 缓存回退：`input_tokens_for_billing` 恒取未命中 | `openai_usage` 单测转红 ✅ |
| 模态拆分：`split_priced_modalities` 恒返回空（= 改造前行为） | 4 个模态用例转红，无价对照保持绿 ✅ |
| 模态声明：`declared_meters_for` 去掉三个模态档（报价侧不出价） | 同样 4 红 1 绿——证明"计价侧声明"与"抽取侧拆分"是两道独立必要条件 ✅ |
| 模态缓存：不扣 `cached_tokens_details.audio_tokens` | 只有"缓存音频不二次收"那条转红（640→700），其余 4 条绿 ✅ |
| Google 形状：`modality_tokens` 跳过数组分支（= 改造前只认 OpenAI 扁平字段） | 5 条转红（TTS / 实时多模态 / 图像 / 缓存音频 / embedding 图像拆分），2 条对照保持绿（无模态价、无明细文本主档）✅ |
| 身份钉表：`meters_for_pricing` 去掉 `pricing_meters`、回退到即时重解析 | 只有 embedding 图像拆分那条转红——证明"目录改写后重解析会缩表"是独立的第三层必要条件 ✅ |
| 可结算性守卫：`binary_audio_synthesis_without_usage` 恒返回 false | 两条"拒单"用例转红，三条对照（字符价 / 聊天 / 识别）保持绿 ✅ |
| 批量守卫：`unmetered_batch_submission` 恒返回 false | 两条创建用例转红，轮询/取消/普通按次三条对照保持绿 ✅ |
| 后台守卫：`unmetered_background_response` 恒返回 false | `background:true` 创建用例转红，五条对照（同步/显式 false/轮询/取消/普通按次）保持绿 ✅ |
| 实时守卫：`unmetered_realtime_session` 恒返回 false | 四条创建用例转红，hangup / 普通聊天两条对照保持绿 ✅ |
| 图像档位：`single_catalog_tier_code` 恒返回 None（= 改造前行为） | 单档位用例转红（PriceNotFound），多档位与无条件两条对照保持绿 ✅ |
| 缓存声明：移除复合档的 `LlmCacheWriteToken`（= 改造前行为） | 5m / 1h / 无条件三条转红（全部折进输入），缓存读对照保持绿 ✅ |
| 缓存档位：`cache_write_tier_code` 恒返回 None | 5m / 1h 两条转红，缓存读与无条件两条对照保持绿 ✅ |
| 上下文分档：`context_tier_code` 恒返回 None（= 改造前行为） | 4 条分档用例转红（PriceNotFound），歧义命名与无条件两条对照保持绿 ✅ |
| 缓存读预检：关闭合成行试探（= 改造前行为） | 音频/混合/文本三条转红（折进输入），无条件对照保持绿 ✅ |
| 缓存读维度：去掉行级 `media_type` 注入 | 三条模态用例转红（结算无价），无条件对照保持绿 ✅ |
| Alibaba 缓存档位：`cache_read_tier_code` 恒返回 None | 显式/隐式两条转红（折进输入），两条单档位对照保持绿 ✅ |
| Alibaba 标记识别：`request_has_cache_control` 恒返回 false | 只有显式档用例转红（按隐式价收），其余保持绿 ✅ |
| 预扣输入池：三档改回逐项相加 | 输入池两条用例转红（冻结额被放大），其余 10 条预扣用例保持绿 ✅ |
| 累计档位：`cumulative_context_tiers` 恒返回 None | 累计词汇用例转红（PriceNotFound），显式区间/非数值/无条件五条保持绿 ✅ |
| 流式 usage：`ensure_stream_usage_requested` 恒返回原 body | provider_request 两条注入用例转红，非流式/厂商原生两条对照保持绿 ✅ |
| usage chunk 过滤：`is_usage_only_sse_event` 恒返回 false | edge-runtime 两条剔除用例转红，内容/跨帧/非空 choices 三条对照保持绿 ✅ |
| 图像模式档位：`image_mode_tier_code` 恒返回 None | t2i/i2i/multi_ref 用例转红（PriceNotFound），单档位/多档位/无条件三条对照保持绿 ✅ |
| 管理面 Free：`provider_native_management_is_free` 恒返回 false | 18 端点 Free 用例与空目录预检转红（退回 ExternalUsageLine），批量创建/付费生成两条对照保持绿 ✅ |
| OpenAI 管理面 Free：`openai_management_is_free` 恒返回 false | 40 端点 Free 用例与空目录预检转红（退回 ApiRequest/PriceNotFound），10 个计算型子端点对照保持绿 ✅ |
| 异步轮询 Free：`task_query` 规则恒不生效 | 轮询 Free/预检用例转红（退回 ApiRequest/PriceNotFound），4 个生成/工具面照保持绿 ✅ |
| 管理面细化：run 元数据更新恒不免费 | 40+ 端点 Free 用例转红（只剩 run 更新退回 ApiRequest），计算型子端点对照保持绿 ✅ |
| 压缩计费：compact 特判恒不生效 | compact 用例转红（退回 ApiRequest），token 族与矩阵其余用例保持绿 ✅ |
| 目录改写：`apply_pricing_identity` 恒提前返回 | 音效用例转红（停在 ApiRequest），其余目录改写/矩阵用例保持绿 ✅ |
| 容器文件：恢复"POST 子资源按次" | 管理面 Free 用例转红（容器文件退回 ApiRequest），其余 40+ Free 端点保持绿 ✅ |
| 反向锁：所有 OpenAI 路由无条件 Free | 8 个未定价按次端点 + 批量创建用例转红（"不得静默免费"被触发）✅ |
| 音乐兜底：`MusicOutputSecond` 改成 60 秒 | 1 秒兜底用例转红（量从 1 变 60），声明 180 秒的对照保持绿 ✅ |
| 零产出 waive：关闭零结果识别 | 空数组 / 显式 0 两条转红（按 1 张收），正常 2 张 / 任务回执 1 条两条对照保持绿 ✅ |
| 业务失败 waive：关闭失败识别 | Kling `code != 0` / `status: failed` 两条转红（按 1 张收），`code: 0` / `error: null` 两条对照保持绿 ✅ |
| 字符串业务码：`integer_like` 只认数字 | 字符串 `"1201"` 用例转红（按 1 张收），`code: "error"`、成功码、空错误三条保持绿 ✅ |
| 空错误对象：恢复"对象非空即失败" | 空字符串错误对象用例转红（正常产出被误 waive），其余 6 条保持绿 ✅ |
| 中断流输入：关闭补值 | 兜底体补输入、Anthropic 字段补值两条转红（输入仍为 0），真实输入不覆盖对照保持绿 ✅ |
| 服务端工具：关闭 `output[]` 计数 | `billing_hosted_tools` 转红（web/file search 两行缺失），token 两行仍在；恢复后 1 条全绿 ✅ |

另外把 Google 用例里的 `parameters.sampleCount` **去掉**了：留着的话"读数组"和"读请求"两条路都通，用例就测不出数组名写错。


## 七、遗留

1. `midjourney` / `nano-banana` 命名空间缺少资源与账号绑定，图像生成只能按通用请求计费（功能缺口，需补 `vendor-native-resources.json` + 分类臂 + taxonomy）。
2. `gemini:batchEmbedContents` / `gemini:countTokens` 的分类臂缺失，api_code 退化为含模型名的合成键，账务归属粒度异常。
3. ElevenLabs SFX 的 `sfx_result` 费率需要在 sdkwork-models 价目表补齐（见 3.2）；目录目前已把该路由的计量单位改写为 `audio_output_minute`，其"请求不声明时长"的问题见第 5 条。
4. **Suno 创建响应在契约里没有时长**（`SunoMusicGenerationResponse` 只有 `id`/`status`/`task_id`/`created_at`），而 `SunoMusicGenerationRequest.duration` 是**可选**的。请求不传 `duration` 时只能按 1 秒兜底，一首 2 分钟的曲子少收约 120 倍；时长要等到 `GET /suno/v1/music/generations/{task_id}`（按次计费）才出现，跟创建的账单没有关联。**两条收紧方向**（需产品决策）：
   * 把 `SunoMusicGenerationRequest.duration` 在契约里设为**必填**，让"按秒"可结算；
   * 或在 sdkwork-models 目录里把该路由改成**按条**报价（`music_result` 类 meter 目前不存在，需先补 meter 定义）。
   在那之前，`tests/billing_media_entrypoints.rs` 用两条用例钉住现状：带 `duration` 按声明收、不带则 1 秒。
5. **ElevenLabs SFX / 需要声明时长的路由同理**：目录把 `elevenlabs.sound_generation` 改写成 `audio_output_minute`，请求没有 `duration_seconds` 时按 1 秒兜底（换算后 1/60 分钟）。与第 4 条同一类问题——**上游不给量、请求也不声明量**的路由，必须在契约里收紧，否则按量计费名不副实。
6. **目录改写已经纳入回归**（`tests/billing_catalog_resolution.rs`）：`pricing_identity` 会用 sdkwork-models 的费率定义覆盖 taxonomy 声明，改写发生在 `RoutingPipeline::plan_route`（早于计价预检）。已断言的三条真实改写是 `kling.text_to_video → video_output_second`（数量回落到请求 `duration`）、`openai.images → image_input_token/image_output_token`（主计量单位取输出侧，数量 4160）、`elevenlabs.sound_generation → audio_output_minute`（12 秒请求 ⇒ 0.2 分钟）。剩余风险不在改写逻辑，而在**目录本身是否给某个新上架模型配了正确的 meter**——那属于 sdkwork-models 的数据问题，需要在上架流程里校验。
7. **旧 OpenAI 中继面（`api/openai_usage.rs` 的 `GatewayUsageRecordCommandBuilder`）没有模态拆分**：它固定产出 `input / output / cache_read` 三条命令，`usage_type` 只有 1/2/3，同一请求内不允许出现第二条同型事实，因此音频令牌仍会按文本价落在那三条里。判定：**该中继面没有挂进产品网关**——生产入口是 `sdkwork-cloudrouter-edge-runtime` 的 `/{*path}` 全捕获（`invocation_router.rs`），`openai_chat_completions_router*` 只被测试与库使用方引用（`services/sdkwork-cloudrouter-standalone-gateway` 与 `admin-gateway` 都没有引用）。**若将来把中继面重新挂出来，必须先给它补 `usage_type` 的模态编码**，否则 2.20 会在那条路上复活。
8. **服务端工具：`web_search_call` / `file_search_call` 已可售（2.49），其余仍缺**：sdkwork-models 已给 6 个在售 OpenAI chat 模型补两条 official 费率（`$10/1k` web、`$2.50/1k` file），抽取侧从 `output[]` / 流式 `response.output_item.done` 计数，`tests/billing_hosted_tools.rs` 钉住完整链路。**仍缺产出点/价目**：`code_interpreter_session`、`container_session`、`rerank_*`、`storage_gb_day`、`bandwidth_gb`；这些码位仍只在 `usage.rs` / `settlement.rs` / 白名单里出现。顺序不变：先由 sdkwork-models 补价目 → 再接抽取。DeepSeek 的 `web_search` 仍按 `api_request` 逐次收（`tests/deepseek_web_tools_billing.rs` 钉住）。
9. **token 计价的 TTS（`openai/gpt-4o-mini-tts`）目前不可售（已按 2.22 预检拒单）**：目录只给 `llm_input_token` + `audio_output_token`，没有 `tts_input_character`；而 `/v1/audio/speech` 的响应是**二进制音频**，OpenAI 不在响应体/响应头里回 `usage`。第 9 轮之前，目录改写会把该路由改成 Token 档，抽取失败、结算不执行（**响应已经发给客户，账上一分不记**）；第 10 轮起由 `billing_unmeterable_tts.rs` 在派发前拒单，**不再产生免费调用**，但模型本身也不可用。
   恢复可售的三条路（需产品/数据决策，任一都成立）：
   * 在契约/网关层要求该模型走 `stream_format: "sse"` 并在终帧读 usage（需上游实际支持，且网关要把 SSE 还原成音频字节）；
   * 由 sdkwork-models 给该模型补 `tts_input_character` 费率，按字符（输入侧）报价，与 `tts-1-hd` 同口径；
   * 在网关侧做**显式、可审计的估算**（输入文本 token 估算 + 音频时长估算），并把估算标记写进用量事实；不得静默按 0 结算。
   `gpt-4o-mini-tts` 之外的 Gemini TTS 已由 2.21 修好（Gemini 在 `usageMetadata` 里回模态 token）。
10. **Google 契约的 `GoogleUsageMetadata` schema 还没有模态明细字段**：OpenAPI 只列了五个总数（`promptTokenCount` 等），`promptTokensDetails` / `candidatesTokensDetails` / `cacheTokensDetails` 依赖 `additionalProperties` 兜底。计费侧已经能读（2.21），但 SDK 消费者从契约里看不到这些字段。补生成器 + 再生链属于契约层改动，单独一轮做。
11. **批量（`/v1/batches`）的 token 用量完全不走网关（第 10 轮已按 2.23 拒单，仍不可售）**：`/v1/batches`、`/v1/batches/{batch_id}`、`cancel` 在 `openai_passthrough_routes.rs` 里是透传，分类为 `api_request` 按次收；批量任务在上游异步执行，真正的逐请求 `usage` 只出现在**输出文件**里（`output_file_id` → `GET /v1/files/{file_id}/content` 的 JSONL）。全仓 `grep` 不到任何读取 `output_file_id` / 批结果 JSONL / `response.body.usage` 的代码 ⇒ 一个 10k 条的 batch 只收一次管理请求费，**上游 token 成本全部由平台承担**。第 10 轮起 `POST /v1/batches` 与 `POST /anthropic/v1/messages/batches` 在预检被拒（`billing_unmetered_batch.rs` 钉住），轮询/取消/普通按次不受影响；**批量能力仍不可售**。
    恢复批量售卖需要两件事（需产品决策）：
    * **批结果回收**：在 `GET /v1/files/{file_id}/content` 识别 `purpose=batch_output`，流式逐行解析 JSONL 的 `response.body.usage`，按批价（或标准价 × 目录声明的 batch 折扣）记账；批量大文件必须内存有界；
    * **批价维度**：OpenAI batch 是标准价的 50%，目录需要能声明 batch 折扣（`rateVariant`/条件维度），否则按标准价收会显著高于市场价。
12. **容器 / 向量库的存储与检索计量**：`file_search_call` 已在 2.49 补价并从 Responses `output[]` 产出；`container_session`、`storage_gb_day` 仍无目录费率与产出点。`/v1/vector_stores/{id}/search` 仍按次收，而 OpenAI 按 file search 调用 + 存储计费——该路由没有可直接计数的响应字段，需要按调用次数产出 `file_search_call`（每次 search 至少 1 次），属于下一轮。与第 8 条同源：先补价目再接抽取。
13. **异步响应完成态的用量回填**（2.24 的另一半）：`background: true` 仍拒单；对账表 `ai_metering_async_task` 已随 `0046` 落地（schema registry / baseline / contract 同步，`pnpm db:plan` 显示 pending migration），worker 尚未实现。正确做法仍是在 `GET /v1/responses/{id}` 拿到 `status == completed` + `usage` 后用响应体里的 model 解析目录价并后置结算；难点是"预检发生在模型未知之前"——需要响应后定价入口，并用 `(tenant, task_kind, upstream_id)` 唯一键 + `billing_request_id` 保证同一次任务不重复扣费。批量（2.23）同理：在 `GET /v1/files/{id}/content` 流式解析 JSONL 的 `response.body.usage`，按 `custom_id` 去重。
14. **多档位图像模型：Kling v2-1 已恢复，其余仍不可售**（2.26 + 2.35）：`kling-v2-1` 的 t2i/i2i/multi_ref 三档已由请求形状解析（2.35）。剩余：
    * `kling-image-3.0-omni`（`res_1k_2k` / `res_4k`）：请求 schema 没有分辨率字段；
    * `bytedance/doubao-seedream-5-0-pro`（`single_image_*` / `layer_split_*` × `le/gt_2_61mp`）：`size` 能定 MP 档，但契约没有 layer-split 开关，模式无法判定；
    * `runway/*`（2–10 档）：未挂载到 open-api，暂不计。
    二选一：契约暴露 `tier`/`resolution`/layer-split 字段，或 sdkwork-models 为每个模型补一条**无条件默认档位**费率。在任一落地前继续 fail-closed。
15. **实时语音的 WebSocket 代理**（2.25 的另一半，工作量最大的一项）：网关需要 1) 自己的 WS 端点承接客户端连接（不再透传上游 `client_secret`，改发网关短期凭据）；2) 双向转发帧；3) 累计 `response.done` 里的 `input_token_details` / `output_token_details`（含音频/文本分档）；4) 会话关闭时按累计用量结算，中途断连也要结算已发生的部分。没有这四项，实时语音只能保持拒单。
16. **缓存 TTL 的其他档位词汇与混合 TTL**（2.27 的剩余部分）：Anthropic 的 5m/1h 已对齐；OpenAI 的 `long_context`（4 个模型）与阿里云的 `explicit_cache_write`（5 个模型）仍无解析，缓存写入会继续折进输入按 1× 收。另外 Anthropic 单请求混合 5m/1h 断点时，契约只有 `cache_creation_input_tokens` 总量，没有按 TTL 的拆分，本实现按"存在 1h 即整段 1h"计（对 5m 部分多收）。需要契约补 `cache_creation.ephemeral_5m_input_tokens` / `ephemeral_1h_input_tokens`，再按行拆分。
17. **上下文分档：15 个模型全部恢复可售**（2.28 + 2.32，已关闭）：Bytedance 的显式区间词汇（`input_le_32k` / `input_32k_128k`）与 Alibaba/Baidu 的累计上界词汇（`tier_32k` / `tier_256k` / `tier_1m`）都能按真实上下文选档。非数值命名（`tier_fast`）仍 fail-closed，这是刻意的安全边界。后续新增档位词汇时，先确认"区间语义唯一"，再扩解析器。
18. **缓存读逐行模态 / 显式隐式档：均已修，剩一个契约假设**（2.29 + 2.30）：OpenAI realtime / gpt-image 的 `media_type` 三档由逐行维度 + 预检合成行解决；Alibaba 的 `explicit_cache_read` / `implicit_cache` 由请求 `cache_control` 标记区分（有标记 = 显式，无标记 = 隐式）。残余风险：`cache_control` 不是本仓契约字段，若供应商的显式缓存换用别的标记名，请求会被当成隐式缓存（多收 2× 缓存读）。建议契约补 vendor 缓存模式字段，或目录提供一个无条件的默认缓存读价兜底。
19. **流式 usage-only chunk 过滤**（2.34，已关闭）：网关强制 `include_usage` 后
    多回的 `choices: []` usage chunk 已在 edge-runtime 的 SSE 转发层剔除（计费
    累加器仍观察原始字节）。剩余边界：跨帧拆分的 usage 事件不做缓冲，仍会透传
    一次；另需在供应商接入测试里覆盖"拒绝未知 `stream_options` 字段"的兼容实现
    （目前假定 OpenAI 兼容面都接受该字段）。



### 2.78 vendor 不存在的入口：标记 Deprecated，而不是长期"待补资源"

按"对齐 vendor 实现"的口径复核剩余不可售入口，两组的性质必须区分开：

| 入口 | vendor 是否有该 API | 处置 |
| --- | --- | --- |
| `POST/GET /midjourney/v1/images/generations` | **没有**。Midjourney 不提供公开 API，该路径是第三方非官方形状 | **Deprecated**：不应继续作为可售入口维护；如需接入应改为官方支持的渠道 |
| `POST/GET /nano-banana/v1/images/generations` | **没有该命名空间**。Google/Gemini 的官方入口是 `/google/v1beta/models/nano-banana:generateImages`（本仓已接通） | **Deprecated**：`/nano-banana/**` 属于跨仓 API 权威冲突，应迁移到 Google 原生入口 |
| `POST /v1/batches`、`POST /anthropic/v1/messages/batches` | **有**，且官方按 50% 折扣计价 | 保持 fail-closed，等结果文件对账（2.73/执行单 batch 缺口） |
| `POST /v1/vector_stores/{id}/file_batches` | **有** | 保持 fail-closed，等逐文件字节读取 worker |

因此商业化口径应改为：**166 无条件可售 + 4 条件可售（worker 启用：background Responses、threads runs、batch ×2）+ 1 待补基础设施（file_batches）+ 4 Deprecated**，而不是把 4 个 vendor 不存在的入口长期计入"待补资源"。契约层面把它们标记 `deprecated: true` 需要同步重新生成 5 个语言的 SDK（OpenAPI 是生成器输入），应在具备完整预算的会话中一次性完成，并在 `data/ai-routing/declared-unrouted.json` 对应条目上补 `deprecated` 字段。