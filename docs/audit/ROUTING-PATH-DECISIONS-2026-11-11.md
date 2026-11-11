# open-api 路径代际决策包（2026-11-11）

## 0. 为什么需要决策

契约里发布的是**直通路径**：中继 `build_provider_passthrough_uri` 去掉厂商前缀后
把剩余路径原样转发给厂商。因此"发布路径 == 厂商官方路径"是正确性的前提。以下门面
在字段上已经对齐，但路径仍是旧代际或自造动作名，转发到厂商会 404。修正会改变**公开
命名与路由**，按仓库规范需要人工确认，故本文只给方案与影响面，不改代码。

## 1. 不一致清单

| # | 门面（本仓发布） | 厂商官方路径 | 目录 descriptor | 结论 |
| --- | --- | --- | --- | --- |
| 1 | `POST /google/v1beta/models/{model}:generateImages` | `POST /v1beta/models/{model}:predict` | `/v1beta/models/{model}:generateImages`（`model_catalog_import.rs:1072`、`:1184`） | 契约与 descriptor 同为自造动作，厂商不提供 |
| 2 | `POST /google/v1beta/models/{model}:generateVideos` | `POST /v1beta/models/{model}:predictLongRunning` | 同上（video arm） | 同上 |
| 3 | `POST /google/v1beta/files`（multipart） | `POST /upload/v1beta/files`；另 `POST /v1beta/files:register` | 无 descriptor | 上传 host 前缀不同 |
| 4 | `POST /luma_ai/dream-machine/v1/generations` | 当前文档：`POST /dream-machine/v1/generations/video` | `/dream-machine/v1/generations`（`:1337`） | 官方文档已切到 `/video`，旧路径是否仍服务需确认 |
| 5 | `POST /alibaba/api/v1/services/audio/tts/SpeechSynthesizer` | `POST /api/v1/services/aigc/multimodal-generation/generation` | 无 descriptor（TTS 走 `openai.audio`） | 发布的是 SDK 类名，不是 HTTP 路径 |
| 6 | `POST /minimax/v1/image_generation` | 当前文档：`POST /v1/images/generations`（H3）；legacy `POST /v1/image_generation` | `/v1/video_generation`（仅视频，`:1369`） | image-01 legacy 是否继续服务需确认 |
| 7 | `POST /kling/v1/videos/generations` | legacy `POST /v1/videos/text2video`；new `POST /text-to-video/kling-2.6` | `/v1/videos/text2video`（`:1245`） | 契约与 descriptor 不一致 |
| 8 | `POST /kling/v1/videos/avatar` | legacy `POST /v1/videos/avatar/image2video` | 无 descriptor | 路径与官方不一致 |
| 9 | `POST /kling/v1/videos/motion-control` | `POST /motion-control/kling-2.6` | 无 descriptor | 路径与官方不一致 |

## 2. 运行时触点（改一条路径要同步的地方）

以 Google 图片为例，路径字符串出现在：

- `services/.../infrastructure/sql/model_catalog_import.rs`：`path_template`（写入侧，`:1072`）
  与 `:1184` 的第二份副本（读取侧 `catalog_expectations`），注释明确要求两份保持一致；
- `crates/sdkwork-cloudrouter-contract/src/path_pattern.rs:73-82`：路径模式匹配；
- `services/.../application/invocation/provider_native_classifier.rs:360`：原生分类；
- `services/.../application/ai_route_taxonomy.rs:483`、`infrastructure/sql/ai_routing_seed.rs:6859`：
  路由种子/分类表；
- `services/.../tests/openapi_billing_matrix.rs:330`（该路径的计费矩阵行）与 `:625`
  （`assert_eq!(218, matrix.len())` 等总数断言，新增/删除操作时要同步）；
- `crates/sdkwork-api-cloudrouter-assembly/src/generated_open_http_route_manifest.rs:237`：
  由 `materialize-apis-contracts` 再生成。

**跨仓**：`../sdkwork-models` 的 catalog 表 `path_template` 必须与
`model_catalog_import.rs` 同步，否则 `check-cloudrouter-ai-routing-consistency.mjs` 失败。

## 3. 方案选项

### 方案 A：新增官方路径门面，保留旧门面（低风险）

- 契约新增官方路径（如 `/google/v1beta/models/{model}:predict`），旧路径标记
  `deprecated: true` 并在描述中指向新路径；
- descriptor 增加新 endpoint_code（如 `gemini.image_prediction`），旧码保留；
- 计费矩阵新增行，更新 `218/132/76/1` 总数常量；
- SDK 会多出方法，旧方法保留。

优点：不破坏现有调用方；缺点：门面数量增加，且旧路径仍然 404（需要产品决定是否下线）。

### 方案 B：直接切换路径（干净，但破坏兼容）

- 契约路径改为官方路径，删除旧操作；
- descriptor/分类/种子/计费矩阵同步；
- 计费矩阵总数减一（删旧）加一（新）后仍为 218，但路径行必须替换。

优点：契约与厂商一致；缺点：现有 SDK/调用方全部失效，需要公告与版本升级。

### 方案 C：保持现状，把门面标注为"网关抽象"

- 在 operation description 里明确"该路径是网关抽象，非厂商路径"；
- 不改路由；厂商原生调用走 catalog replay 路径。

优点：零风险；缺点：直通门面依然不可用，与"open-api 对齐"目标相悖。

## 4. 建议

| 门面 | 建议 |
| --- | --- |
| Google `:predict` / `:predictLongRunning` | **方案 B**（自造动作名，无历史包袱；`vendor_native` 模型本来就该走投影路径） |
| Google 文件上传 | **方案 B**（`/upload/v1beta/files`），同时补 `files:register` |
| Luma `/generations/video` | **方案 A**（旧路径可能仍在服务，先并存一版再观察） |
| Alibaba TTS | **方案 B**（发布的是 SDK 类名，无兼容价值） |
| MiniMax 图片 | **方案 A**（H3 与 image-01 并存，按模型分流） |
| Kling 视频/数字人/动作控制 | **方案 A**（legacy 与新代际并存；先让契约路径与 descriptor 一致） |

## 5. 批准后的实施顺序

1. 先改 `model_catalog_import.rs` 两份副本 + `../sdkwork-models` catalog 表，跑
   `check-cloudrouter-ai-routing-consistency.mjs`；
2. 改契约（`tools/cloudrouter_gateway_openapi_generator.py`），跑再生链；
3. 更新 `path_pattern`/classifier/taxonomy/seed 与计费矩阵（含总数常量）；
4. 跑 `cargo test -p ... --test openapi_billing_matrix`（需 Rust 环境可编译）；
5. 更新 `docs/audit/*` 与台账。

## 6. 附：Rust 验证环境现状

`cargo test` 在本机被 gcc 子进程 fastfail（`0xc0000409`）阻塞：CMake 构建链可通过
`aws-lc`，但 `ring` 的 cc 构建仍失败；`gcc` 单独编译简单 C 文件正常。解除该安全策略
后才能跑计费矩阵测试。详见 `MEDIA-BUSINESS-FAILURE-BILLING-2026-11-11.md`。
