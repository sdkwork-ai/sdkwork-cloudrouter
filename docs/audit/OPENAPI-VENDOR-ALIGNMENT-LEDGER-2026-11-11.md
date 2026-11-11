# open-api 厂商契约对齐台账（2026-11-11 起）

本台账跟踪 `sdkwork-cloudrouter` open-api 各厂商原生门面与官方文档的逐字段对齐进度。
"对齐"的判据是：请求体字段名、类型、必选性、枚举/边界/默认值、必选请求头、
以及查询响应字段，全部能追溯到该厂商官方文档或官方机器可读规范。

写入规则：

1. 只改 `tools/cloudrouter_gateway_openapi_generator.py`，再跑再生链
   `generator → api:standard-extensions:write → standardizer --openapi-only → api:materialize:write`。
2. 每个厂商必须补一条生成器单测，钉住字段集合与关键枚举/边界。
3. 厂商官方规范可缓存到 `.tmp-vendor-specs/`（机器可读时），文档 URL 写进对应取证文档。

## 状态总表

| 厂商 | 门面数 | 官方来源 | 状态 | 取证 |
| --- | ---: | --- | --- | --- |
| volcengine | 4 | 火山方舟 API 参考 | ✅ 视频创建/查询、图像生成、OpenAI 兼容 TTS 已对齐 | [文档](VOLCENGINE-ARK-OPENAPI-ALIGNMENT-2026-11-11.md) |
| bytedance | 4 | 同上（Ark 同协议）+ 豆包语音文档 | ✅ 视频创建/查询、图像生成、Seed TTS（`req_params` 嵌套 + 必选头）已对齐 | [文档](VOLCENGINE-ARK-OPENAPI-ALIGNMENT-2026-11-11.md) |
| alibaba | 4 | 百炼 DashScope API 参考 | ✅ 图像/视频创建+查询、Qwen-TTS 输入信封已对齐；TTS 路径与官方 `multimodal-generation` 不一致，待决策 | [文档](ALIBABA-DASHSCOPE-OPENAPI-ALIGNMENT-2026-11-11.md) |
| google | 16 | Google Discovery `v1beta` | ✅ generateContent/stream/countTokens/embed/batchEmbed 顶层与嵌套已对齐；`:generateImages`/`:generateVideos` 路径与官方 `:predict`/`:predictLongRunning` 不一致，待跨仓决策 | [文档](GOOGLE-GEMINI-OPENAPI-ALIGNMENT-2026-11-11.md) |
| xai | 7 | `docs.x.ai/openapi.json` | ✅ 5 个共有操作顶层字段一致；视频编辑/扩展的 `video` 输入补 `file_id` | [文档](RUNWAY-BFL-OPENAPI-ALIGNMENT-2026-11-11.md) |
| runway | 4 | `docs.dev.runwayml.com/openapi.json` | ✅ text/image-to-video、text-to-image 已按逐模型变体并集补齐 | [文档](RUNWAY-BFL-OPENAPI-ALIGNMENT-2026-11-11.md) |
| elevenlabs | 3 | `api.elevenlabs.io/openapi.json` | ✅ TTS 顶层+voice_settings、sound-generation、music（含 `music_prompt`/`composition_plan` 结构）已对齐 | [文档](ELEVENLABS-OPENAPI-ALIGNMENT-2026-11-11.md) |
| black_forest_labs | 3 | `api.bfl.ai/openapi.json` | ✅ `flux-3-video` 判别联合 + `flux-{model}` 图片请求体 45 字段并集已对齐 | [文档](RUNWAY-BFL-OPENAPI-ALIGNMENT-2026-11-11.md) |
| anthropic | 11 | Anthropic Messages 官方 Markdown | ✅ Messages 顶层 + thinking/tool_choice/count_tokens + 自定义/服务端工具已对齐 | [文档](ANTHROPIC-OPENAPI-ALIGNMENT-2026-11-11.md) |
| openai(/v1) | 122 | `github.com/openai/openai-openapi` | ✅ 81 个共有路径字段差异归零（其余 41 个为本仓扩展操作） | [文档](OPENAI-V1-OPENAPI-ALIGNMENT-2026-11-11.md) |
| kling | 9 | Kling 文档 Markdown（`llms.txt` 索引） | ◐ 图片生成 / 视频生音效已对齐；视频、数字人、动作控制的**路径**与官方不一致，待路由决策 | [文档](KLING-OPENAPI-ALIGNMENT-2026-11-11.md) |
| vidu | 9 | `platform.vidu.cn/docs/llms.txt` | ✅ 创建请求 + 任务响应已对齐；模板门面保留 `video_urls`（motion-control） | [文档](VIDU-OPENAPI-ALIGNMENT-2026-11-11.md) |
| minimax | 6 | MiniMax 文档 OpenAPI | ◐ 音乐/TTS/legacy 视频/图像字段已对齐；图片门面仍是 image-01 legacy（官方 H3 用 `/v1/images/generations`），路径待决策 | [文档](MINIMAX-OPENAPI-ALIGNMENT-2026-11-11.md) |

## 响应/计费对齐

| 范围 | 状态 | 取证 |
| --- | --- | --- |
| 2xx 业务失败豁免（PixVerse `ErrCode`、DashScope `output.task_status`、Luma `state`） | ✅ 逻辑已改并由独立 harness 验证；crate 级 `cargo test` 受 aws-lc 环境问题阻塞 | [文档](MEDIA-BUSINESS-FAILURE-BILLING-2026-11-11.md) |
| 路径代际（Google/Luma/Alibaba TTS/MiniMax/Kling） | ⏸ 9 条不一致已列清单与方案，等人工批准 | [决策包](ROUTING-PATH-DECISIONS-2026-11-11.md) |
| pixverse | 2 | `docs.platform.pixverse.ai/llms.txt` | ✅ 文生视频 + 查询已对齐（含 `Ai-trace-id` 必选头） | [文档](PIXVERSE-OPENAPI-ALIGNMENT-2026-11-11.md) |
| luma_ai | 2 | docs.lumalabs.ai 内嵌 OpenAPI | ◐ 请求/响应字段已对齐；创建路径官方带 `/video`，待协议决策 | [文档](LUMA-OPENAPI-ALIGNMENT-2026-11-11.md) |
| zhipu | 3 | docs.bigmodel.cn 内嵌 OpenAPI | ✅ 图像/视频/异步结果已对齐 | [文档](ZHIPU-OPENAPI-ALIGNMENT-2026-11-11.md) |
| jimeng | 2 | 火山即梦文档 | ⛔ 本仓门面是 `jimeng.jianying.com` 私有面，与火山公开的 Action/req_key 协议不同，需产品确认 | — |
| suno | 2 | Notion 文档 | ⛔ 官方文档只覆盖 Discord bot（Chirp/Bark），无公开 HTTP API；门面是网关抽象 | — |
| mureka | 2 | `platform.mureka.ai` | ⛔ 文档站为 SPA，无 `llms.txt`/`openapi.json`；无官方机器可读规范 | — |
| stability_ai | 2 | `platform.stability.ai/llms.txt` + docs.stability.ai 内嵌 OpenAPI | ✅ 传输层 + 请求字段（core/ultra/sd3 并集、stable-audio-2）已对齐 | [文档](STABILITY-OPENAPI-ALIGNMENT-2026-11-11.md) |
| typesafe | 1 | 内部契约（System One） | ☐ 待核对 | — |

状态图例：✅ 已对齐并验证；◐ 部分验证（顶层字段）；☐ 未开始。

## 已知的跨厂商结论

- **中继只剥前缀、不重写路径**：`build_provider_passthrough_uri`
  （`crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`）把
  `/ <vendor> / rest` 变成 `base_url + /rest`。因此"发布路径"必须等于厂商真实路径，
  否则上游会收到一个不存在的路径。provider adapter 的 standard-path 重写是唯一例外。
- **发布路径 ↔ 端点目录审计**：把契约路径去掉 vendor 前缀，与
  `data/ai-routing/resources/vendor-native-resources.json` 的 `pathTemplate` 比较，
  可枚举"发布了但厂商/目录不提供"的门面。当前确认的问题集中在 Kling（视频、数字人、
  动作控制、任务查询）。MiniMax 音乐是反向情况：契约 `/v1/music_generation` 是官方路径，
  目录登记的是别名 `/v1/music/generations`；2026-11-06 审计已把该别名登记为接受项，
  改动它需要同时改 `../sdkwork-models` 的闭包表，本轮保持登记、不改。
- **Anthropic 文件/批处理门面**（`/anthropic/v1/files*`、`/anthropic/v1/messages/batches*`）
  在契约里是官方路径，但 `vendor-native-resources.json` 没有对应 `api_endpoint`，
  定价预检会 fail-closed；需要补目录资源，而不是改路径。
- `tools/audit-vendor-openapi-conformance.mjs` 覆盖 google / xai / runway /
  elevenlabs / black_forest_labs 五家：先比顶层字段名与必选集合，再递归比较
  对象型属性的嵌套成员（最多 3 层）；union 与自由 map 跳过，discovery 文档复用
  response schema 导致的 output-only 字段在 `NESTED_FIELD_EXEMPTIONS` 中带理由豁免。
- `@sdkwork/sdk-generator` 1.0.14 会整条剥掉 `x-sdkwork-wire-protocol: external`
  的 operation，导致 open 家族 9 种语言的生成代码无法重跑（本仓 218 个 operation
  全部是 external 兼容面）。生成代码与 `sdks/**/openapi/*.json` 快照的同步需要
  生成器提供 include-external 选项。
