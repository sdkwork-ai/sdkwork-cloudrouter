> Migrated from `docs/15-new-api-sub2api价格体系对比与ClawRouter定价设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

版本：0.1.0
日期：2026-04-28
约束：不改变 `apps/sdkwork-clawrouter-pc` 的 UI 视觉设计；后端数据结构和 API DTO 适配既有页面。

## 1. 结论

Claw Router 不采用 `ai_pricing_group` 作为表名或领域名。产品里的 Group 是业务分组，用 `ai_channel_group` 表达；创建 API Key 时选择该分组，落到 `iam_gateway_api_key.channel_group_id`。价格只作为分组的一项默认策略，通过 `ai_channel_group.pricing_plan_id` 指向 `ai_pricing_plan`。

定价核心拆成五层：

1. `ai_billing_meter`：统一计量表，定义 token、请求、结果、个数、秒数、字符、存储、流量等可计费维度。
2. `ai_model_pricing`：模型价格簿，保存官方参考价、供应商成本价、客户销售价和内部结算价。
3. `ai_channel_group`：业务分组，保存平台、计费类型、倍率、默认策略、容量和默认定价方案。
4. `ai_pricing_plan`：定价方案，定义默认参考价侧、默认倍率、币种、取整、缺价策略和版本。
5. `ai_pricing_rule` + `ai_pricing_tier`：定价规则和阶梯，按模型、厂家、供应商、渠道、能力、计量表和价格项覆盖默认方案。
6. `ai_usage_fact.pricing_snapshot`：请求完成时固化价格快照，历史账单不回查当前价格表重算。

## 2. new-api 可吸收点

参考源码：

- `external/new-api/setting/ratio_setting/group_ratio.go`
- `external/new-api/setting/ratio_setting/model_ratio.go`
- `external/new-api/relay/helper/price.go`
- `external/new-api/service/text_quota.go`
- `external/new-api/pkg/billingexpr/types.go`

new-api 的优点是配置简单、热路径计算直接，核心概念包括：

| new-api 概念 | 作用 | Claw Router 落点 |
| --- | --- | --- |
| `GroupRatio` | 使用分组倍率 | `ai_channel_group.rate_multiplier`、`ai_pricing_plan.default_multiplier` |
| `GroupGroupRatio` | 用户组到使用分组的特殊倍率 | `ai_pricing_plan_binding.multiplier_override` |
| `ModelRatio` | 模型倍率 | `ai_pricing_rule.formula_mode=multiplier` |
| `ModelPrice` | 固定模型价格 | `ai_pricing_rule.formula_mode=fixed` 或 `ai_model_pricing.unit_price` |
| `CompletionRatio` | 输出 token 倍率 | `ai_pricing_rule` 按 `price_item_type=output` 配置 multiplier |
| `CacheRatio` / `CreateCacheRatio` | 缓存命中/写入倍率 | `ai_model_pricing.price_item_type=cache_read/cache_write` 或 `ai_pricing_tier` |
| `ImageRatio` / `AudioRatio` | 多模态倍率 | `price_item_type=image/audio/video` |
| `tiered_expr` | 表达式计费 | `ai_pricing_rule.formula_mode=expression` + `expression_hash` |

需要避免的问题：

- new-api 大量使用 JSON map 配置价格，适合小系统，但不利于审计、分页、版本、权限和多租户隔离。
- ratio 使用 float，Claw Router 价格、金额和倍率必须用 decimal string。
- 表达式计费必须受白名单函数、版本和 hash 约束，不允许任意脚本进入热路径。

## 3. sub2api 可吸收点

参考源码：

- `external/sub2api/backend/migrations/001_init.sql`
- `external/sub2api/backend/migrations/047_add_user_group_rate_multipliers.sql`
- `external/sub2api/backend/migrations/082_refactor_channel_pricing.sql`
- `external/sub2api/backend/migrations/086_channel_platform_pricing.sql`
- `external/sub2api/backend/internal/service/model_pricing_resolver.go`
- `external/sub2api/backend/internal/service/pricing_service.go`
- `external/sub2api/backend/internal/service/billing_service.go`

sub2api 的优点是渠道定价、区间定价和定价来源回退链比较清晰：

| sub2api 概念 | 作用 | Claw Router 落点 |
| --- | --- | --- |
| `groups.rate_multiplier` | 分组费率倍率 | `ai_channel_group.rate_multiplier` |
| `api_keys.group_id` | API Key 选择分组 | `iam_gateway_api_key.channel_group_id`，兼容 `plus_api_key` 时通过 `legacy_api_key_id` |
| `ai_channel_groups` | 上游账号可绑定分组 | `integration_provider_account` + 分组策略或后续 `ai_channel_group_member` |
| `user_group_rate_multipliers` | 用户专属分组倍率 | `ai_pricing_plan_binding.subject_type=user + multiplier_override` |
| `channel_model_pricing.billing_mode` | token/per_request/image 模式 | `ai_model_pricing.billing_mode`、`ai_pricing_rule.billing_mode` |
| `channel_pricing_intervals` | token/context/request/image 区间 | `ai_pricing_tier` |
| `channel_model_pricing.platform` | 平台维度价格 | `ai_model_pricing.platform_code`、`ai_pricing_rule.platform_code` |
| LiteLLM pricing mirror | 官方价/参考价导入 | `ai_pricing_import_snapshot` + `ai_model_pricing.price_side=official_reference` |

需要避免的问题：

- sub2api 把 group、channel、account、pricing 的部分能力耦合在一起，Claw Router 需要更清晰的事实边界。
- LiteLLM 导入价格是参考源之一，不应直接成为唯一官方事实；必须保存 `source_url`、`source_hash`、`published_at`、`observed_at`。
- 用户、VIP、账户、优惠券、积分充值等事实继续保持 `plus_*` 物理表结构一致，不把这些事实迁移到 pricing 表。

## 4. 标准领域模型

### 4.0 BillingMeter 是计费维度

`ai_billing_meter` 只回答“计费数量是什么”，不回答“模型支持什么能力”，也不回答“价格是多少”。模型能力仍由 `ai_model_capability` 表达，价格由 `ai_model_pricing`、`ai_pricing_rule` 和 `ai_pricing_tier` 表达。

标准 meter 覆盖：

| 计费场景 | meter 示例 | 数量来源 |
| --- | --- | --- |
| LLM 输入/输出 | `llm_input_token`、`llm_output_token` | provider usage 或网关 tokenizer |
| LLM 缓存 | `llm_cache_read_token`、`llm_cache_write_token` | provider usage |
| Embedding | `embedding_input_token` | 请求文本 tokenizer |
| 图片 | `image_result`、`image_pixel`、`image_input_token` | 响应结果数、尺寸、provider usage |
| 语音/音频 | `audio_input_second`、`audio_output_second`、`speech_character` | 媒体元数据、请求字符数 |
| 视频 | `video_input_second`、`video_output_second` | 媒体元数据 |
| 音乐/音效 | `music_output_second`、`sfx_result` | 媒体元数据、结果数 |
| 通用 API | `api_request`、`api_result`、`api_item`、`tool_call` | 请求次数、响应数组长度、工具调用数 |
| 资源型 | `storage_gb_day`、`bandwidth_gb` | 资源采样或网关统计 |

未来新增计费方式时优先新增 meter 和规则，不新增专用价格表字段。比如“按成功结果计费”使用 `billing_mode=per_result + billing_meter_code=api_result`；“按返回条目数计费”使用 `billing_mode=per_item + billing_meter_code=api_item`。

### 4.1 Group 是业务分组

`ai_channel_group` 是 `/admin/group` 和 `/console/api-keys` 的事实来源：

- 创建 API Key 时选择分组：`iam_gateway_api_key.channel_group_id`。
- 分组默认访问策略：`default_policy_id`。
- 分组默认配额策略：`default_quota_policy_id`。
- 分组默认定价方案：`pricing_plan_id`、`pricing_plan_code`。
- 分组快速倍率：`rate_multiplier`、`official_price_multiplier`。
- 分组容量和用量：`ai_channel_group_metric_snapshot`。

因此不建立 `ai_pricing_group`。这样可以避免“业务分组”和“价格分组”两个概念在 UI、API、数据表和 SDK 中互相覆盖。

### 4.2 PricingPlan 是定价方案

`ai_pricing_plan` 只回答“命中这套方案后，价格如何算”：

- `base_price_side`：通常为 `official_reference`，也可为 `upstream_cost`。
- `default_multiplier`：默认倍率，例如 1.0、1.2、0.85。
- `default_markup_amount`：固定加价。
- `billing_mode`：token、fixed_price、per_request、tiered、expression、image、audio、video。
- `fallback_mode`：缺价时是拒绝、回退官方价、回退成本价、免费还是人工审核。
- `effective_from/effective_to`：价格版本生效窗口。

`ai_pricing_plan_binding` 用于专属覆盖，不替代业务分组：

- `subject_type=channel_group`：某业务分组绑定方案。
- `subject_type=api_key`：单个 Key 特价。
- `subject_type=user`：用户专属倍率。
- `subject_type=vip_level`：VIP 等级定价。
- `subject_type=sku`：商品 SKU 对应定价。
- `subject_type=tenant/organization`：租户或组织默认定价。

## 5. 官方价、供应商价、销售价

`ai_model_pricing.price_side` 是价格语义的核心：

| price_side | 含义 | 典型 scope | 用途 |
| --- | --- | --- | --- |
| `official_reference` | 官方参考价 | global、vendor、model | 前台展示、销售价倍率参考、缺价回退 |
| `upstream_cost` | 供应商上游成本价 | provider、channel | 路由成本优化、毛利分析、供应商对账 |
| `customer_charge` | 客户销售价 | pricing_plan、channel_group、sku、tenant | 用户扣费、模型页展示、账单 |
| `internal_transfer` | 内部结算价 | organization、workspace | 内部成本分摊 |

一个模型可以有多个供应商价格：

```text
ai_model(model = gpt-4o)
  -> ai_model_pricing(price_side=official_reference, provider_code=null, channel_id=null)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=openai, channel_id=1001)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=azure_openai, channel_id=2001)
  -> ai_model_pricing(price_side=upstream_cost, provider_code=openrouter, channel_id=3001)
  -> ai_model_pricing(price_side=customer_charge, pricing_plan_id=default)
  -> ai_model_pricing(price_side=customer_charge, pricing_plan_id=vip)
```

供应商价格不修改官方价；销售价也不覆盖供应商成本价。三者通过 `reference_price_id`、`reference_price_side`、`reference_multiplier`、`price_origin` 和 `import_snapshot_id` 建立证据链。

## 6. 计费解析顺序

在线请求计费解析应按以下顺序执行：

1. 解析 API Key，得到 `api_key_id`、`group_id`、用户、租户、组织。
2. 读取 `ai_channel_group.pricing_plan_id`，再检查 `ai_pricing_plan_binding` 是否有更高优先级的 user/api_key/vip/sku 专属绑定。
3. 在命中的 `ai_pricing_plan` 下匹配 `ai_pricing_rule`，优先级为 channel > provider > model > family > vendor > wildcard。
4. 解析 `billing_meter_code` 和 `billable_quantity`。LLM 使用 token，图片可使用结果数或像素，语音/视频可使用秒数，通用 API 可使用请求数、结果数或条目数。
5. 规则若指定 `unit_price_override`，使用固定价。
6. 规则若指定 `reference_pricing_id`，按该价格行派生。
7. 未指定 reference 时，按 `reference_price_side` 查询当前模型的官方价或供应商成本价。
8. 若存在 `ai_pricing_tier`，按上下文长度、请求次数、结果数、条目数、图片尺寸、音频/视频时长、字符数、存储量、流量或 tier label 命中区间。
9. 若 `formula_mode=expression`，执行白名单表达式，并记录 `expression_hash`。
10. 生成 `ai_usage_fact`，写入 `billing_meter_code`、`billable_quantity`、`pricing_plan_id`、`pricing_rule_id`、`pricing_tier_id`、单价、倍率、官方参考金额、上游成本金额、客户收费金额和完整 `pricing_snapshot`。

## 7. 公式规范

Token 价格：

```text
customer_charge =
  (input_tokens * input_price
   + output_tokens * output_price
   + cache_read_tokens * cache_read_price
   + cache_write_tokens * cache_write_price
   + image_tokens * image_price
   + audio_seconds * audio_price
   + video_seconds * video_price)
  * pricing_plan.default_multiplier
  * rule.multiplier
  + markup_amount
```

官方价倍率派生：

```text
customer_unit_price =
  official_reference_unit_price * reference_multiplier + markup_amount
```

供应商成本价：

```text
upstream_cost =
  provider_channel_unit_price * actual_usage
```

利润分析：

```text
gross_margin = customer_charge_amount - upstream_cost_amount
```

通用 meter 价格：

```text
charge_amount =
  max(ceil_to_step(billable_quantity - included_quantity, quantity_step), minimum_quantity)
  * unit_price
  * reference_multiplier
  + markup_amount
```

按结果或按个数计费：

```text
billable_quantity = count(response.results)       # api_result
billable_quantity = sum(response.items[].count)   # api_item
```

按时长计费：

```text
billable_quantity = ceil(media_duration_seconds / quantity_step) * quantity_step
```

所有金额和倍率在 API/SDK 中必须是 decimal string，数据库契约中使用 `decimal`，禁止 float/double。

## 8. 页面覆盖

| 页面 | 数据需求 | 落点 |
| --- | --- | --- |
| `/console/api-keys` | 创建 Key 时选择分组；展示分组容量、额度、用量 | `iam_gateway_api_key.channel_group_id`、`ai_channel_group`、`ai_channel_group_metric_snapshot` |
| `/admin/group` | 分组、平台、计费类型、倍率、默认定价方案、账号容量、使用量 | `ai_channel_group`、`ai_pricing_plan`、`ai_pricing_plan_binding`、`ai_channel_group_metric_snapshot` |
| `/admin/model` | 计量表、官方价、供应商成本价、销售价、阶梯、表达式、来源 hash | `ai_billing_meter`、`ai_model_pricing`、`ai_pricing_rule`、`ai_pricing_tier`、`ai_pricing_import_snapshot` |
| `/models` | 当前用户或默认分组可见销售价，必要时标记回退来源 | `ai_model_pricing.price_side=customer_charge`，缺失时回退 `official_reference` |
| `/admin/record` | 计费明细、倍率、命中规则、价格快照 | `ai_usage_fact.pricing_snapshot` |

## 9. 热路径和审计

- 热路径读取缓存化后的 `GatewayGroupPricingSnapshot`，不在请求中多表深 join。
- 控制面修改 `ai_channel_group`、`ai_pricing_plan`、`ai_pricing_rule`、`ai_pricing_tier` 后必须发出 `ops_outbox_event`，网关刷新缓存。
- `ai_pricing_import_snapshot` 记录来源 hash，用于判断官方价是否变化。
- `ai_usage_fact` 是计费事实，不能因价格表变更重算历史账单。
- `ops_audit_log` 记录后台修改价格、分组倍率、表达式、供应商成本价等高风险操作。

## 10. 命名红线

- 不使用 `ai_pricing_group`，避免把业务分组误建为价格专用分组。
- 不使用 `claw_`、`router_`、`sdkwork_`、`console_`、`admin_`、`portal_` 作为新业务表前缀。
- 不复制 `plus_user`、`plus_vip_*`、`plus_account*`、`plus_order*`、`plus_payment*` 的事实表结构；卡券营销统一使用标准 `promotion_*` 事实表。
- 不以 JSON map 作为价格事实唯一来源；JSON 只保存快照、表达式参数、导入原文引用和扩展 metadata。

