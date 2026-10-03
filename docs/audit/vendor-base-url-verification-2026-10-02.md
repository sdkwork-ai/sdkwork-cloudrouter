# 官方 Base URL 逐 vendor 核实 —— 取证与修正

采集日期：2026-10-02。

## 一、范围与判据

核实对象：`sdkwork-models` 目录中每个 vendor/region 的官方 API 地址，即
`models/<vendor>/<region>/vendor.json` 的 `protocolBaseUrls`（46 条）与
`nativeApiBaseUrl`（12 条）。

判据（按优先级）：

1. **厂商自有文档域名**上的 `base_url` / "Base URL" / cURL 或 SDK 示例原文。
2. 厂商**官方 SDK 源码**中的默认 `base_url` 与 operation path。
3. 仓内已固化的既有取证：`scripts/dev/audit-upstream-dial-url-shape.mjs`
   的 `MODEL_FIXTURES`（`--self-test` 复现 9/9 文档 URL）。

非官方来源（博客、教程、聚合站、第三方转卖服务）一律不作为证据。

## 二、正确性定义（读自传输层，不是猜的）

存储值 `{host, pathPrefix}` 组合成 `https://{host}{pathPrefix}`，即交给客户端
SDK 的 `base_url`；**operation path 由客户端自己追加**：

| 协议 | 追加的 operation path |
|---|---|
| `openai_compatible` | `/chat/completions` |
| `openai_responses` | `/responses` |
| `anthropic_messages` | `/v1/messages`（Anthropic SDK 自带 `/v1`） |

因此判定式是：**把 `base_url` 配成 `https://{host}{pathPrefix}` 后，实际请求的
URL 是否等于厂商文档给出的 URL**。仅是 host 对不算对。

路由器侧的拼接规则（`crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`）：

- `split_provider_passthrough_path` 去掉 `/openai` 或 `/anthropic` 前缀；
- `build_provider_passthrough_uri` 直接拼接（**anthropic 走这条**）；
- `build_openai_passthrough_uri` 额外做 `/v1` 归一化，且**仅当 base_url 路径
  为 `/v1` 或以 `/v1` 结尾**时把 inbound path 的前导 `/v1` 去掉
  （`provider_passthrough_transport.rs:72-89`，relay 同规则
  `openai_compatible_relay.rs:274,362`）。

⇒ anthropic 系列**不会**被去掉 `/v1`，所以 `anthropic_messages` 的 `pathPrefix`
里再带 `/v1` 就会拼出 `/v1/v1/messages`。这正是原先 `anthropic/global`
（两个字段都写 `/v1`）的缺陷。

## 三、结论

**修正 9 条（7 个 vendor/region），其余 37 条经核实正确。**

### 修正清单

| vendor/region | 协议 | 原值 | 修正值 | 依据 |
|---|---|---|---|---|
| anthropic/global | anthropic_messages | `api.anthropic.com` + `/v1` | `api.anthropic.com` + `""` | 官方 SDK 默认 `base_url = "https://api.anthropic.com"`，`/v1/messages` 由 SDK 追加；`/v1` 会拼成 `/v1/v1/messages` |
| alibaba/global | 全部 3 个 | `dashscope.aliyuncs.com` | `dashscope-intl.aliyuncs.com` | Model Studio Base URL 区域表：`dashscope.aliyuncs.com` 仅中国（北京）；国际站为 `dashscope-intl`（密钥按区域隔离，跨区 401） |
| bytedance/global | openai_compatible / openai_responses | `ark.cn-beijing.volces.com/api/v3` | `ark.ap-southeast.bytepluses.com/api/v3` | BytePlus ModelArk「Base URL and authentication」：数据面 `https://ark.ap-southeast.bytepluses.com/api/v3` |
| deepseek/cn、global | openai_responses | `api.deepseek.com/v1` | `api.deepseek.com` + `""` | Responses 指南原文："the base_url being `https://api.deepseek.com`"，无任何页面记录 `/v1/responses` |
| minimax/cn | openai_compatible | `api.minimaxi.com` | `api.minimax.cn` | 官方 `OPENAI_BASE_URL=https://api.minimax.cn/v1` |
| minimax/global | openai_compatible | `api.minimaxi.com` | `api.minimax.io` | 官方 `OPENAI_BASE_URL=https://api.minimax.io/v1` |
| tencent/cn | openai_compatible | `api.hunyuan.cloud.tencent.com` + `/v1` | `tokenhub.tencentmaas.com` + `/v1` | 旧混元平台公告 2026-09-30 全面停服；TokenHub 迁移指南 "base_url 更换为 https://tokenhub.tencentmaas.com/v1" |
| tencent/cn | anthropic_messages | 同 host + `/anthropic` | `tokenhub.tencentmaas.com` + `""` | TokenHub「统一入口与鉴权，仅按协议切换路径（…/v1/messages）」，`/anthropic` 面已不存在 |

`apiEndpoints`（按协议族索引的兄弟字段）在 35 个 vendor/region 上与
`protocolBaseUrls` 逐条一致；deepseek 是唯一例外且**应当**例外——OpenAI 族只能
存一个条目，而 deepseek 的 chat 在 `/v1`、responses 在根，无法用一条表达。

### 已核实正确（摘选）

| vendor/region | 结论 | 依据 |
|---|---|---|
| openai/global | chat + responses 均正确 | 官方 SDK `base_url="https://api.openai.com/v1"`，资源追加 `/chat/completions`、`/responses` |
| google/global | 正确 | `base_url="https://generativelanguage.googleapis.com/v1beta/openai/"` |
| xai/global | chat + responses 均正确 | `/v1/chat/completions`、`/v1/responses` 均在官方 REST 参考中 |
| stepfun/cn | 3 个协议均正确 | `/step_plan` 真实存在，但属 **Step Plan 订阅通道**；按量通道为 `https://api.stepfun.com` + `/v1/messages` |
| meituan/cn | 均正确 | LongCat 官方：`/openai/v1/chat/completions` 与 `/anthropic/v1/messages` |
| xiaomi/cn、global | 均正确 | 官方按量计费主机只有 `api.xiaomimimo.com`，两区域相同；区域差异在 Token Plan（`token-plan-cn/sgp/ams`）与批处理主机 |
| moonshot/cn、global | 均正确 | 官方总览表逐行给出四组 base URL |
| zhipu/cn、baidu/cn、alibaba/cn、bytedance/cn | 均正确 | 各自官方兼容接口文档原文 |

## 四、防回归

`tools/generate-cloudrouter-vendor-catalog.mjs` 现在按传输层规则**合成拨号 URL**
并拦截畸形结果（版本段重复、空路径段），`pnpm models:vendor-catalog:check`
（已进 `_sdkwork:check`）失败即阻断。前端另有 14 项断言覆盖同一规则
（`vendorProtocolCatalog.test.ts`）。

曾尝试再加一条「合成 URL 必须含版本段」的告警，但被目录本身证伪：DeepSeek 的
Responses 面就是无版本段的官方地址。会误报正确数据的门禁比没有门禁更糟，故移除；
跨活库的前缀漂移仍由 `scripts/dev/audit-upstream-dial-url-shape.mjs` 负责。

## 五、未处理项（需目录属主决策）

1. **协议覆盖缺口**（非地址错误，属 `supportedProtocols` 变更）：MiniMax 两个区域
   均提供 Anthropic 兼容面（`/anthropic`）；Moonshot 提供 Responses 面；
   Tencent TokenHub 同时提供 `/v1/responses`。目录目前均未声明。
2. **deepseek 的 cn/global 区分无文档依据**：官方只发布单一主机
   `api.deepseek.com`，两个区域条目内容相同。
3. **tencent/cn 的 `docsUrl` 仍指向已下线的旧混元产品页**（`product/1729`），
   与已修正的主机不一致。
4. **`nativeApiBaseUrl` 与本次修正的来源 URL 无处存放**：`$defs/apiEndpoint` 为
   `additionalProperties: false`，端点对象不能带 `sourceUrl`。合适位置是
   `sources/vendor-sources.json` 的 `official.additionalUrls`，但该文件参与
   `release-catalog.mjs` 的 `sourceEvidenceSha256`，改动需连带重新生成 release 记录。
