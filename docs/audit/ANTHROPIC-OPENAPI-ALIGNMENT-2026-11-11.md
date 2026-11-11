# Anthropic Messages open-api 契约对齐（2026-11-11）

## 1. 结论

`POST /anthropic/v1/messages` 与 `POST /anthropic/v1/messages/count_tokens` 的共享请求体
此前只覆盖 13 个字段，缺了当前官方 Messages API 的 7 个字段，且 `max_tokens` 的下界写成
1（官方为 0，用于只预热 prompt cache 不生成）。本轮以官方 Markdown 文档
（`https://docs.anthropic.com/en/api/messages.md`，`Create a Message → Body parameters`）
为准补齐，并保留 `temperature`/`top_p`/`top_k` 作为兼容字段（当前官方页面不再列出，
但上游仍接受；不删除以免破坏既有调用方）。

## 2. 新增字段

| 字段 | 官方类型 / 约束 | 说明 |
| --- | --- | --- |
| `cache_control` | object `{type:"ephemeral", ttl:"5m"\|"1h"}`，ttl 默认 `5m` | 顶层缓存断点，作用于最后一个可缓存块 |
| `container` | object `{id?, skills?[]}` 或 string | `skills` 最多 20 个，元素 `{type:"anthropic"\|"custom", skill_id, version?}` |
| `diagnostics` | object `{previous_message_id?}`，≤256 字符 | 返回 `diagnostics.cache_miss_reason` |
| `inference_geo` | string | 推理地域，缺省用工作区 `default_inference_geo` |
| `output_config` | object `{effort?, format?}` | `effort` ∈ `low/medium/high/xhigh/max`；`format` ∈ `{type:"json_schema", schema}` |
| `service_tier` | enum `auto/standard_only` | 优先容量或标准容量 |
| `speed` | enum `standard/fast` | `fast` 提高输出 token/秒 |

同时 `metadata` 从自由 JSON 改为官方 `Metadata`（`user_id`），`max_tokens` 下界由 1 改为 0。

## 3. 新增组件

- `AnthropicCacheControl`
- `AnthropicContainer` + `AnthropicSkill`
- `AnthropicDiagnostics`
- `AnthropicOutputConfig` + `AnthropicOutputFormat`
- `AnthropicMetadata`

## 4. 实现与验证

- 唯一手写源：`tools/cloudrouter_gateway_openapi_generator.py`
  （`message_request_properties` + 新增组件）
- 回归测试：`tests/test_cloudrouter_gateway_openapi_generator.py`
  `test_documents_anthropic_messages_official_fields`
- 附带修复：`ProviderMetadata` 不再被任何 schema 引用后会被 prune，原
  `test_gateway_openapi_check_reports_additional_properties_refs_without_descriptions`
  改用 `ProviderJsonObject`

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node tools/sync-cloudrouter-api-standard-extensions.mjs --check` | ok |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |

## 5. 未覆盖

- 服务端工具已建模为 `AnthropicServerTool`（见第 6 节）；computer-use 的
  `computer_2025*` 版本 id 未在本页出现，暂未加入枚举。
- `count_tokens` 已拆分（见第 6 节），其工具条目复用同一 `oneOf`
  （`AnthropicTool` / `AnthropicServerTool`），官方 `MessageCountTokensTool`
  的细微差异未单独拆分。

## 6. 补充：thinking / tool_choice / count_tokens（2026-11-11 第二轮）

按官方 Messages API Markdown 的 domain types 章节细化：

| 类型 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `ThinkingConfigParam` | `enabled`（`budget_tokens` ≥1024）、`disabled`、`between_tools`、`adaptive`（`display: summarized/omitted`） | `type` 自由字符串、`budget_tokens` 无下界 | ✅ 枚举 + 下界 + `display` |
| `ToolChoice` | `auto`/`any`/`tool`/`none`，且 `auto`/`any`/`tool` 支持 `disable_parallel_tool_use` | `type` 自由字符串，无并行开关 | ✅ 4 值枚举 + `disable_parallel_tool_use` |
| `ToolUnion` | 共享 `name`/`description`/`input_schema`，另有 `type`（服务端工具）与 `cache_control` | 只有前三个 | ✅ 见下 |
| 自定义 `Tool` | `name`(≤128, pattern)、`input_schema`、`type:"custom"`、`description`、`cache_control`、`allowed_callers`、`defer_loading`、`eager_input_streaming`、`input_examples`、`strict` | `name`/`description`/`input_schema`/`type`/`cache_control` | ✅ 补 `allowed_callers`（4 值枚举）、`defer_loading`、`eager_input_streaming`、`input_examples`、`strict`，`name` 加长度/pattern |
| 服务端工具 | `bash_20250124`、`text_editor_20250124/20250429/20250728`、`web_search_20250305`、`tool_search_tool_regex`；字段含 `max_uses`、`allowed_domains`/`blocked_domains`、`user_location`、`max_characters`、`display_*` | 未建模 | ✅ `AnthropicServerTool`，`tools.items` 改为 `oneOf` 两种工具 |
| 内容块 | 16 种 `type`（text/image/document/tool_use/tool_result/thinking/redacted_thinking/server_tool_use/web_search_tool_result/web_fetch_tool_result/code_execution_tool_result/...）；字段含 `cache_control`、`citations`、`thinking`、`signature`、`data`、`is_error`、`caller`、`toolset_name`、`title`、`context` | `type` 自由 string，仅 text/source/id/name/input/content/tool_use_id | ✅ 枚举 + 补 10 个字段 |
| `count_tokens` 请求体 | `messages`、`model`、`cache_control`、`output_config`、`speed`、`system`、`thinking`、`tool_choice`、`tools` | 复用了 Messages 的 20 个字段（含 `max_tokens`/`temperature`/`top_p`/`top_k`/`stream`/`metadata` 等生成控制） | ✅ 收窄为 9 个字段 |

`max_tokens` 保持 `minimum: 0`：本仓把它用作"0 表示只预热 prompt cache"的扩展语义，
不是对齐遗漏。

新增单测 `test_documents_anthropic_tool_and_thinking_choices`；测试总数 85。
