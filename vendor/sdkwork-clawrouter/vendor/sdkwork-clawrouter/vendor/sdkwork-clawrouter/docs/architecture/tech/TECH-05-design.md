> Migrated from `docs/05-数据库设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

## 1. 设计依据

数据库设计以本项目根目录的 [../DATABASE_SPEC.md](../DATABASE_SPEC.md) 为强约束。该规范要求：

- 新表先写数据契约，再生成或校验 DDL、ORM、DTO、SDK。
- 新业务表第一段必须是受控业务模块前缀，不能使用产品名、项目名或技术栈名。
- 多租户、账户、权限、消息、Webhook、跨服务写入表至少 L2。
- 资金、凭证、隐私、法务留存、关键审计表按 L3 设计。
- `id` 为内部 int64，API 序列化为 string。
- 金额使用 decimal，API 序列化为 string。
- 新表高频租户索引必须以 `tenant_id` 开始。

前端页面级覆盖和可校验表契约以 [13-页面级数据结构覆盖与SchemaRegistry落地设计.md](./13-页面级数据结构覆盖与SchemaRegistry落地设计.md)、[14-数据结构细节复核与补强记录.md](./14-数据结构细节复核与补强记录.md) 与 [schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml) 为准。本文定义总体数据库策略，Registry 定义后续 DDL、Entity、DTO、OpenAPI、SDK 的上游契约。

## 2. 表结构总体策略

`sdkwork-clawrouter` 数据库分两类：

| 类型 | 表名 | 策略 |
| --- | --- | --- |
| 存量兼容表 | `legacy-java-plus-entity` 中的 `plus_*` 表 | 保持物理表名、字段、索引、实体结构完全一致，不在 claw-router 中创建替代表 |
| 新标准表 | claw-router 新增能力表 | 按 `DATABASE_SPEC.md` 使用 `ai_`、`integration_`、`iam_`、`commerce_`、`studio_`、`content_`、`ops_` 前缀 |

重要裁决：

- 用户、VIP、account、优惠券、积分充值、订单、支付、退款、发票等必须使用既有 `plus_*` 表。
- 数据库设计模型采用 Java Entity first：任何新表进入设计前，必须先在 `legacy-java-plus-entity` 检索是否已有 `Plus*` Entity；若存在，则登记既有 `plus_*` 表为 L0 legacy compatible，物理结构保持完全一致，不得新建同义替代表。
- 新增网关路由、Provider、usage fact、decision log、ops event、secret reference 等使用标准前缀表。
- 存量 `plus_*` 表在本系统中视为 L0 legacy compatible，但不得因为本轮设计自动改名。
- 如果未来要把 `plus_*` 迁移为 `iam_`、`commerce_` 等标准名，必须另起迁移项目，设计兼容视图、双写、回填、校验、回滚和前滚方案。

## 3. 必须保持一致的存量表

以下表来自 `legacy-java-plus-entity`，claw-router 只能引用或调用对应 service/repository，不得创建同义替代表。

### 3.1 用户与身份相关

| 领域 | 现有表 | 说明 |
| --- | --- | --- |
| 用户 | `plus_user` | 用户主表 |
| 用户地址 | `plus_user_address` | 用户地址 |
| OAuth | `plus_oauth_account` | 第三方账号绑定，物理表名与 `legacy-java-plus-entity` 保持一致 |
| 租户 | `plus_tenant` | 租户 |
| 组织 | `plus_organization`、`plus_organization_member`、`plus_department`、`plus_position` | 组织架构 |
| RBAC | `plus_role`、`plus_permission`、`plus_role_permission`、`plus_user_role` | 角色权限 |

### 3.2 VIP、积分和充值

| 领域 | 现有表 | 说明 |
| --- | --- | --- |
| VIP 用户 | `plus_vip_user` | 用户 VIP 状态 |
| VIP 等级 | `plus_vip_level` | 等级定义 |
| VIP 权益 | `plus_vip_benefit`、`plus_vip_level_benefit`、`plus_vip_benefit_usage` | 权益和使用记录 |
| VIP 充值 | `plus_vip_recharge`、`plus_vip_recharge_pack`、`plus_vip_recharge_method` | 充值记录、充值包、充值方式 |
| VIP 套餐 | `plus_vip_pack`、`plus_vip_pack_group` | 套餐分组 |
| 积分变动 | `plus_vip_point_change` | 积分流水 |
| 会员卡 | `plus_member_card`、`plus_member_level`、`plus_card`、`plus_card_template`、`plus_user_card` | 会员卡和卡券 |

### 3.3 账户、交易和支付

| 领域 | 现有表 | 说明 |
| --- | --- | --- |
| 账户 | `plus_account` | 用户/主体账户 |
| 账户流水 | `plus_account_history` | 余额变更流水 |
| 账本桥接 | `plus_ledger_bridge` | 账本关联 |
| 汇率/币种 | `plus_currency`、`plus_exchange_rate`、`plus_account_exchange_config` | 币种与兑换配置 |
| 商品 | `plus_product`、`plus_sku` | 商品与 SKU |
| 订单 | `plus_order`、`plus_order_item` | 订单主表和明细 |
| 支付 | `plus_payment`、`plus_payment_webhook_event` | 支付与回调事件 |
| 退款 | `plus_refund` | 退款 |
| 购物车 | `plus_shopping_cart`、`plus_shopping_cart_item` | 购物车 |
| 发票 | `plus_invoice`、`plus_invoice_item`、`plus_invoice_record` | 发票 |

### 3.4 优惠券和营销

| 领域 | 现有表 | 说明 |
| --- | --- | --- |
| 卡券营销 | `promotion_offer`、`promotion_offer_version`、`promotion_coupon_stock`、`promotion_code`、`promotion_user_coupon`、`promotion_discount_application` | 标准卡券、库存、兑换码、用户券和优惠核销事实 |
| 邀请 | `plus_invitation_code`、`plus_invitation_relation` | 邀请码和邀请关系 |
| 伙伴 | `plus_partner` | 分销或伙伴关系 |

## 4. 新表业务前缀注册

| 前缀 | bounded context | owner | 示例 |
| --- | --- | --- | --- |
| `iam_` | identity-access | 身份与访问团队 | `iam_gateway_api_key`、`ai_channel_group` |
| `ai_` | ai-routing-metering | AI 网关团队 | `ai_routing_policy`、`ai_usage_fact` |
| `integration_` | provider-integration | Provider 集成团队 | `integration_provider_account` |
| `commerce_` | router-commerce-projection | 交易账户团队 | `commerce_usage_settlement` |
| `studio_` | portal-studio-assets | 产品生态团队 | `studio_catalog_action` |
| `content_` | portal-content | 内容运营团队 | `content_announcement` |
| `ops_` | operations-observability | 平台运维团队 | `ops_gateway_instance`、`ops_audit_log` |

### 4.1 统一数据领域名称

`ModelVendor` 是模型厂家/模型原厂的统一领域名称，表示模型的原始研发、发布或维护方，例如 OpenAI、Anthropic、Google、DeepSeek、Alibaba Qwen、Moonshot。数据库持久化使用稳定字符串编码 `vendor_code`，Java、Rust、TypeScript 和 OpenAPI 均从 Schema Registry 生成枚举或等价类型，严禁保存 enum ordinal。

`ModelVendor` 不等同于 `Provider`。`ai_model_vendor` 保存模型厂家主数据；`ai_model_family` 保存厂家下的模型族；`ai_model` 保存可被 `/v1/*` 暴露和路由的标准模型；`integration_provider` 保存 API 接入供应商或协议适配方，例如 OpenAI API、Azure OpenAI、OpenRouter、Ollama、本地模型网关；`ai_channel` 保存某个租户/组织可用的具体接入通道；`ai_channel_resource` 保存通道支持的资源、资源分组和能力范围；模型名转换由 `ai_model_mapping_rule`、`ai_model_mapping_rule_binding` 和 `ai_model_mapping_rule_item` 分层描述。OpenRouter、Azure、AWS、GCP、HuggingFace 这类聚合或云接入方通常属于 `integration_provider`，只有在它们本身发布模型时才作为 `ModelVendor`。

价格体系统一使用 `PriceSide`、`BillingMeter`、`PricingPlan`、`BillingMode` 和 `PricingFormulaMode` 五个领域名。`ai_channel_group` 是创建 API Key 时选择的业务分组事实来源；`ai_pricing_plan` 是挂载在业务分组、API Key、VIP、SKU、租户或用户上的定价方案，不再把“分组”建模为价格专用概念。`ai_billing_meter` 是统一计量表，覆盖 LLM token、embedding token、图片张数/像素、语音秒数/字符、视频秒数、音乐秒数、音效结果、API 请求、API 结果、API 条目、工具调用、存储和流量；每条用量最终都必须归一为 `ai_usage_fact.billing_meter_code + billable_quantity + billable_unit`。`ai_model_pricing.price_side=official_reference` 保存模型原厂或可信价格源的官方参考价；`price_side=upstream_cost` 保存不同 Provider/Channel 的供应商成本价；`price_side=customer_charge` 保存面向用户的销售价。`ai_pricing_plan` 默认可以设置 `base_price_side=official_reference + default_multiplier`，从官方价派生用户销售价；`ai_pricing_rule` 用于按模型、厂家、供应商、渠道、能力、计量表和价格项覆盖；`ai_pricing_tier` 承载 sub2api 式上下文区间、按次、图片、音频、视频、结果数和条目数分层；`pricing_formula_mode=expression` 承载 new-api `tiered_expr` 类公式，但表达式必须带 hash 和版本，并在 `ai_usage_fact.pricing_snapshot` 固化。

## 5. 新表清单

### 5.1 IAM 表

| 表 | 画像 | 等级 | 说明 |
| --- | --- | --- | --- |
| `iam_gateway_api_key` | user_entity + credential_index | L3 | Gateway API Key 摘要、状态、范围、过期、限流引用 |
| `ai_channel_group` | tenant_entity | L2 | API Key 分组、项目、策略绑定 |
| `ai_channel_group_metric_snapshot` | projection | L2 | 分组账号容量、可用账号数、今日/累计用量和健康状态投影 |
| `iam_gateway_access_policy` | tenant_entity | L3 | Key 级模型范围、能力范围、IP、区域、数据策略；非 int64 主体使用 hash/脱敏引用 |
| `iam_gateway_risk_rule` | tenant_entity | L3 | IP/Token/Model/Firewall 风控规则，支持 hash、脱敏和密文引用 |
| `iam_user_preference` | user_entity | L2 | 语言、时区、主题、通知偏好等用户配置扩展，不替代 `plus_user` |
| `iam_user_security_setting` | user_entity | L3 | MFA、密码更新时间、安全策略扩展，不保存密码明文，不替代 `plus_user` |
| `iam_user_login_event` | event_log | L3 | 用户登录、安全风险、设备和 MFA 验证事件 |

说明：如第一阶段决定复用现有 `plus_api_key`，则 `iam_gateway_api_key` 暂缓建表，文档中记录为目标标准表，P1 通过兼容映射接入。

### 5.2 AI 表

| 表 | 画像 | 等级 | 说明 |
| --- | --- | --- | --- |
| `ai_model_vendor` | dictionary_entity | L2 | 模型厂家字典，`ModelVendor` 领域事实来源，保存原厂展示、官网、文档、能力族和枚举编码 |
| `ai_model_family` | dictionary_entity | L2 | 模型族字典，保存厂家下 GPT、Claude、Gemini、Qwen、Llama 等系列和默认模型 |
| `ai_model` | dictionary_entity | L2 | 网关模型目录、模型别名、Provider independent model |
| `ai_model_capability` | relation_entity | L2 | 模型能力族、上下文、输入输出模态 |
| `ai_billing_meter` | dictionary_entity | L2 | 统一计量表，定义 token、请求、结果、个数、秒数、字符、存储、流量等可计费维度 |
| `ai_model_pricing` | tenant_entity | L3 | 模型价格簿，区分官方参考价、供应商上游成本价、客户销售价，保存计费单位、币种、范围和有效期 |
| `ai_pricing_plan` | tenant_entity | L3 | 定价方案，支持按官方参考价倍率、固定价、阶梯价和表达式派生销售价 |
| `ai_pricing_plan_binding` | relation_entity | L3 | 定价方案绑定，支持 API Key 分组、API Key、VIP、SKU、用户、租户等主体挂载价格策略 |
| `ai_pricing_rule` | tenant_entity | L3 | 价格规则，按模型、厂家、供应商、渠道、能力和价格项覆盖默认分组倍率 |
| `ai_pricing_tier` | tenant_entity | L3 | 阶梯/区间价格，支持 token 上下文区间、按次、图片、音频、视频等分层 |
| `ai_pricing_import_snapshot` | event_log | L3 | 官方/供应商价格导入快照，记录来源 URL、hash、版本和验收结果 |
| `ai_routing_policy` | tenant_entity | L2 | 策略主表：优先级、权重、SLO、区域、fallback |
| `ai_routing_profile` | tenant_entity | L2 | 策略版本、灰度、发布状态 |
| `ai_routing_rule` | tenant_entity | L2 | 具体规则、条件、候选集、约束 |
| `ai_routing_decision_log` | event_log | L3 | 请求路由决策证据，可回放 |
| `ai_request_trace` | event_log | L3 | 请求跟踪、错误、Provider attempt |
| `ai_usage_fact` | ledger_source_fact | L3 | 用量事实，账务结转来源 |
| `ai_model_rank_snapshot` | projection | L2 | 模型排行榜、趋势、周榜/月榜快照 |
| `ai_generation_session` | user_entity | L2 | Playground 会话和工作台上下文 |
| `ai_generation_job` | event_log/user_entity | L3 | 图片、视频、音乐、语音、音效、Agent 生成任务 |
| `ai_generation_asset` | user_entity | L3 | 生成资产、媒体 URL、缩略图、参数快照；签名 URL 不持久化 |
| `ai_generation_asset_action` | event_log | L3 | 收藏、下载、分享、高清、重绘、扩图、擦除、对口型等资产操作审计 |
| `ai_quota_policy` | tenant_entity | L3 | 配额和限流策略，支持 API Key、用户、分组、模型和 IP 主体 |

### 5.3 Integration 表

| 表 | 画像 | 等级 | 说明 |
| --- | --- | --- | --- |
| `integration_provider` | dictionary_entity | L2 | API 接入供应商注册、图标、文档链接、展示色和默认协议，如 OpenAI API、OpenRouter、Ollama；可用 `default_vendor_code` 关联默认模型厂家 |
| `ai_channel` | tenant_entity | L2 | 渠道实例、协议、接入类型、模型模式、区域、权重、健康状态 |
| `integration_provider_account` | tenant_entity + credential_ref | L3 | 上游账号、认证配置、secret reference、状态、轮换和余额快照 |
| `ai_channel_resource` | relation_entity | L2 | 渠道支持的资源、资源分组和能力授权 |
| `integration_proxy` | tenant_entity | L3 | 代理配置，不保存敏感明文 |
| `integration_webhook_endpoint` | tenant_entity + webhook | L3 | 用户或组织的 Webhook 回调配置和签名引用 |
| `integration_provider_health_snapshot` | event_log/projection | L2 | 健康快照和恢复探测证据 |

### 5.4 Commerce 投影表

资金事实仍在 `plus_account`、`plus_account_history`、`plus_order`、`plus_payment` 等既有表。新表只用于 router 用量结算投影和对账证据。

| 表 | 画像 | 等级 | 说明 |
| --- | --- | --- | --- |
| `commerce_usage_settlement` | ledger_entry/projection | L3 | 用量结算批次、来源 usage fact、金额快照 |
| `commerce_usage_pricing_plan` | dictionary_entity | L2 | AI 用量套餐和价格计划映射，可关联既有 product/sku |
| `commerce_usage_statement` | projection | L3 | 账期账单投影，不替代 `plus_invoice` |
| `commerce_usage_statement_item` | projection | L3 | 账单分项，按模型、能力、资产类型聚合 |
| `commerce_billing_export` | audit/export | L3 | 账单导出任务、过期和审计 |

### 5.5 Portal 内容和生态表

| 表 | 前缀 | 等级 | 说明 |
| --- | --- | --- | --- |
| `plus_app` | `plus_` | L0 | AppCenter 主数据；沿用 Java `PlusApp`，物理结构保持一致 |
| `plus_app.release_notes` + `plus_app.install_config` | `plus_` JSON | L0 | 应用版本、发布说明、安装包、平台下载地址；不单独建 App release 表 |
| `plus_app.resource_list` | `plus_` JSON | L0 | 应用截图、封面、图标等媒体资源；不单独建 App media 表 |
| `plus_agent_skill` | `plus_` | L0 | SkillsHub 主数据；沿用 Java `PlusAgentSkill`，物理结构保持一致 |
| `plus_agent_skill_package` | `plus_` | L0 | 技能包/集合、分类、聚合统计上下文；沿用 Java `PlusAgentSkillPackage` |
| `plus_user_agent_skill` | `plus_` | L0 | 用户技能安装、启用、配置状态；沿用 Java `PlusUserAgentSkill` |
| `plus_category` | `plus_` | L0 | 技能分类；沿用 Java `PlusCategory`，技能分类限定 `CategoryType.SKILLS`/`SKILLS_COLLECTION` |
| `studio_catalog_action` | `studio_` | L2 | 应用/技能下载、安装、评分、评论、收藏等行为事实 |
| `content_announcement` | `content_` | L2 | 公告 |
| `content_doc_page` | `content_` | L2 | 产品文档、API 文档、SDK 文档页面索引 |
| `content_openapi_snapshot` | `content_` | L2 | OpenAPI 版本、hash、分类树和示例 manifest |
| `content_sdk_release` | `content_` | L2 | SDK 语言、包版本、安装命令和发布 artifact manifest |
| `content_forum_post` | `content_` | L2 | 论坛帖子 |
| `content_forum_comment` | `content_` | L2 | 评论 |
| `content_reaction` | `content_` | L2 | 论坛、课程等内容互动事实 |
| `content_course` | `content_` | L2 | 课程 |
| `content_course_section` | `content_` | L2 | 课程章节分组 |
| `content_course_lesson` | `content_` | L2 | 课程课时 |
| `content_course_relation` | `content_` | L2 | 相关课程、合集、推荐关系 |

### 5.6 Ops 表

| 表 | 画像 | 等级 | 说明 |
| --- | --- | --- | --- |
| `ops_gateway_instance` | tenant_entity/core_entity | L2 | 网关实例、部署模式、runtime、orchestrator、版本、脱敏节点状态 |
| `ops_gateway_heartbeat` | event_log | L2 | CPU、内存、磁盘、网络、连接、uptime 等心跳指标 |
| `ops_config_snapshot` | snapshot | L3 | 配置快照、灰度发布、回滚 |
| `ops_audit_log` | audit_log | L3 | 后台、用户、系统操作审计 |
| `ops_outbox_event` | outbox_event | L3 | 事务后事件发布 |
| `ops_inbox_event` | inbox_event | L3 | 消费幂等 |
| `ops_job_execution` | event_log | L2 | worker 任务执行 |
| `ops_alert_event` | event_log | L2 | 告警事件 |
| `ops_notification_message` | user_entity/event_log | L2 | 用户消息中心消息 |
| `ops_notification_delivery` | event_log | L2 | 消息投递、已读、失败和渠道状态 |
| `ops_metric_snapshot` | projection | L2 | Dashboard 和监控面板聚合指标快照 |

## 6. 标准字段组

新 L2/L3 表默认包含：

```sql
id BIGINT NOT NULL,
uuid VARCHAR(64) NOT NULL,
tenant_id BIGINT NOT NULL,
organization_id BIGINT NOT NULL DEFAULT 0,
user_id BIGINT,
owner_type INTEGER,
owner_id BIGINT,
data_scope INTEGER NOT NULL DEFAULT 1,
status INTEGER NOT NULL,
created_at TIMESTAMP NOT NULL,
updated_at TIMESTAMP NOT NULL,
version BIGINT NOT NULL DEFAULT 0,
deleted_at TIMESTAMP,
deleted_by BIGINT,
archived_at TIMESTAMP,
retention_until TIMESTAMP,
request_id VARCHAR(128),
idempotency_key VARCHAR(128),
external_event_id VARCHAR(128),
payload_hash VARCHAR(128),
metadata JSON
```

具体表按画像裁剪，但裁剪必须在表契约说明原因。

## 7. 示例表契约

### 7.1 `integration_provider_account`

```yaml
table: integration_provider_account
title: Provider账号
domain: integration
bounded_context: provider-integration
profile: tenant_entity
compliance_level: L3
system_of_record: true
write_owner: claw-router-control
columns:
  id: { type: int64, primary_key: true }
  uuid: { type: string, length: 64, unique: true }
  tenant_id: { type: int64, required: true }
  organization_id: { type: int64, required: true, default: 0 }
  user_id: { type: int64, required: false }
  provider_code: { type: string, length: 64, required: true }
  account_name: { type: string, length: 128, required: true }
  secret_ref: { type: string, length: 256, required: true, sensitivity: SECRET_REF }
  masked_label: { type: string, length: 128, required: true }
  key_hash: { type: string, length: 128, required: true, sensitivity: SECRET_HASH }
  status: { type: enum_int32, required: true }
  last_rotated_at: { type: instant, required: false }
  created_at: { type: instant, required: true }
  updated_at: { type: instant, required: true }
  version: { type: int64, required: true, default: 0 }
indexes:
  - { name: uk_integration_provider_account_uuid, unique: true, columns: [uuid] }
  - { name: idx_integration_provider_account_tenant_provider_status, columns: [tenant_id, organization_id, provider_code, status] }
security:
  pii: false
  encrypted_fields: []
  masking_rule: never_return_secret_ref_to_public_api
```

### 7.2 `ai_routing_decision_log`

```yaml
table: ai_routing_decision_log
title: 路由决策日志
domain: ai
bounded_context: ai-routing-metering
profile: event_log
compliance_level: L3
system_of_record: true
write_owner: claw-router-gateway
columns:
  id: { type: int64, primary_key: true }
  uuid: { type: string, length: 64, unique: true }
  tenant_id: { type: int64, required: true }
  organization_id: { type: int64, required: true, default: 0 }
  user_id: { type: int64, required: false }
  request_id: { type: string, length: 128, required: true }
  api_key_id: { type: int64, required: true }
  model: { type: string, length: 128, required: true }
  capability: { type: string, length: 64, required: true }
  selected_provider: { type: string, length: 64, required: true }
  selected_channel_id: { type: int64, required: true }
  decision_reason: { type: json, required: true }
  fallback_chain: { type: json, required: false }
  status: { type: enum_int32, required: true }
  created_at: { type: instant, required: true }
indexes:
  - { name: uk_ai_routing_decision_log_uuid, unique: true, columns: [uuid] }
  - { name: idx_ai_routing_decision_tenant_request, columns: [tenant_id, organization_id, request_id] }
  - { name: idx_ai_routing_decision_tenant_model_created, columns: [tenant_id, organization_id, model, created_at] }
retention:
  default: 180d
  enterprise: configurable
```

## 8. 索引设计

1. L2/L3 多租户表查询索引必须以 `tenant_id, organization_id` 起始。
2. 列表页索引统一追加 `status, updated_at, id` 或 `status, created_at, id`。
3. 请求明细、用量事实、审计日志必须按时间范围设计分区或归档策略。
4. 幂等键必须有唯一约束，例如 `(tenant_id, idempotency_key)` 或 `(provider_code, external_event_id)`。
5. 金额、状态、租户、权限、幂等字段不得只放在 JSON。

## 9. 结构演进

所有新表变更按以下流程：

1. 更新表契约。
2. 更新 DDL 迁移。
3. 更新 ORM/Entity。
4. 更新 DTO/OpenAPI/SDK。
5. 更新读模型或 CDC 映射。
6. 添加兼容期校验。
7. 回填和双读/双写。
8. 灰度切换。
9. 删除旧字段或旧路径。

破坏性变更必须走 expand/backfill/contract，不允许一次性删除生产字段。

## 10. 数据库验收清单

- [ ] 新表前缀已登记 owner 和 bounded context。
- [ ] 新表已声明画像和 L1/L2/L3 等级。
- [ ] 高频查询已绑定索引。
- [ ] 多租户表索引以 `tenant_id` 起始。
- [ ] 资金、凭证、审计表达到 L3。
- [ ] API int64 和 decimal 序列化为 string。
- [ ] Provider secret 只存 secret reference。
- [ ] 用户、VIP、账户、优惠券、积分充值、交易账户域未创建替代表。
- [ ] 结构变更、ORM、OpenAPI、SDK 保持同步。

## 11. 数据事实来源分层

数据库不是按页面或部署形态拆分，而是按事实来源和写入 owner 分层。`sdkwork-clawrouter` 在本地桌面、Server、Docker、K8S 下都使用同一套数据契约，只允许物理数据库方言、分区能力和部署参数不同。

| 层级 | 事实来源 | 表 | 写入 owner | 说明 |
| --- | --- | --- | --- | --- |
| L0 存量主数据层 | `legacy-java-plus-entity` | `plus_user`、`plus_account`、`plus_vip_*`、`plus_order`、`plus_payment` 等 | 既有 Java service/repository | 表结构完全保持一致；claw-router 只通过标准 service/API/SDK 接入 |
| L1/L2 控制面主数据层 | claw-router 控制面 | `iam_`、`integration_`、`ai_`、`promotion_` 配置主表 | control-plane service | API Key 扩展、Provider、渠道、模型、策略、卡券营销等标准事实来源 |
| L3 事件事实层 | gateway/worker | `ai_routing_decision_log`、`ai_request_trace`、`ai_usage_fact`、`ops_audit_log` | gateway、worker、admin | append-only 或准 append-only，用于审计、计费、回放和故障定位 |
| L2/L3 投影与对账层 | worker/ops | `commerce_usage_settlement`、`commerce_billing_export`、`integration_provider_health_snapshot` | settlement worker、ops worker | 不替代资金账本，只保存用量结算、导出和健康快照证据 |
| 事件一致性层 | outbox/inbox | `ops_outbox_event`、`ops_inbox_event` | 各写入服务 | 保障跨服务、跨部署、异步投影的可靠发布和幂等消费 |

关键约束：

- `plus_*` 表是既有业务域的事实来源，不因为 claw-router 引入而改名、改字段或建同义表。
- 新表只承载网关域新增能力，不承载用户、VIP、账户、优惠券、充值、订单、支付、退款、发票等既有交易事实。
- 任何页面需要聚合信息时，优先通过 API composition、读模型或投影实现，不把多个事实来源揉成一个不可治理的大宽表。
- 所有跨服务写入必须有 `request_id`、`idempotency_key` 或 outbox/inbox 去重键。

## 12. 存量表复用契约

用户要求用户、VIP、account、优惠券、积分充值等设计与 `legacy-java-plus-entity` 完全一致，本项目落地时按以下契约执行。

| 业务域 | 事实来源表 | claw-router 可做 | claw-router 禁止做 |
| --- | --- | --- | --- |
| 用户与身份 | `plus_user`、`plus_user_address`、`plus_oauth_account`、`plus_tenant`、`plus_organization*`、`plus_role*` | 读取用户、租户、组织、角色权限上下文；通过 app/backend 标准 API 调用用户能力 | 新建 `iam_user`、`iam_account_user` 等替代表；复制密码、手机号、OAuth 明细到新表 |
| VIP 与积分 | `plus_vip_user`、`plus_vip_level`、`plus_vip_recharge*`、`plus_vip_point_change` | 展示 VIP 状态、充值包、积分变动；将网关用量结算结果交给既有账户/VIP服务 | 新建 `commerce_vip_user`、`commerce_point_change`、`router_recharge` 等替代表 |
| 账户与账本 | `plus_account`、`plus_account_history`、`plus_ledger_bridge`、`plus_currency`、`plus_exchange_rate` | 通过账户服务扣减、冻结、充值、退款；在 `commerce_usage_settlement` 保留用量结算证据 | 直接绕过服务改余额；只改余额不写流水；新建 `commerce_account` 作为余额事实来源 |
| 商品、订单、支付、退款、发票 | `plus_product`、`plus_sku`、`plus_order*`、`plus_payment*`、`plus_refund`、`plus_invoice*` | 关联价格计划、创建订单/支付/退款请求、展示交易结果 | 新建 claw-router 私有订单、支付、退款、发票主表 |

订单派发和服务订单能力也以 Java 实体为准：`plus_order_dispatch_rule`、`plus_order_worker_dispatch_profile` 已存在于 `legacy-java-plus-entity`，因此 claw-router 只能登记和调用，不再新建 `commerce_order_dispatch_*` 或 `router_worker_profile`。
| 卡券营销 | `promotion_offer`、`promotion_offer_version`、`promotion_offer_scope`、`promotion_offer_audience_rule`、`promotion_offer_time_window`、`promotion_budget_account`、`promotion_coupon_stock`、`promotion_code`、`promotion_user_coupon`、`promotion_discount_application`、`promotion_discount_allocation`、`promotion_coupon_ledger_entry`、`promotion_external_binding`、`promotion_event_outbox` | 由 promotion bounded context 统一管理券定义、版本、范围、人群、预算、库存、兑换码、用户券、核销、分摊、流水、外部平台绑定和事件 | 新建非 `promotion_` 的卡券同义表 |

存量表在本项目中的兼容等级是 L0 legacy compatible。L0 的含义是“被兼容和映射”，不是“允许继续复制不标准设计”。新功能若必须扩展这些业务域，应先评审是否能通过既有 Java 服务扩展；只有在用户明确批准独立迁移项目时，才设计 `plus_*` 到标准前缀表的物理迁移。

## 13. 新表落地优先级

新表不一次性全部落地，按业务闭环和风险优先级分批。

| 优先级 | 目标 | 表 |
| --- | --- | --- |
| P0 | 标准化 MVP 必需，支撑 Provider、路由、Key、用量、价格和审计闭环 | `ai_model_vendor`、`ai_model_family`、`integration_provider`、`ai_channel`、`ai_channel_credential`、`ai_channel_resource`、`ai_model`、`ai_model_capability`、`ai_billing_meter`、`ai_model_pricing`、`ai_pricing_plan`、`ai_pricing_plan_binding`、`ai_pricing_rule`、`ai_pricing_tier`、`ai_routing_policy`、`ai_routing_profile`、`ai_routing_rule`、`ai_model_mapping_rule`、`ai_model_mapping_rule_binding`、`ai_model_mapping_rule_item`、`ai_routing_decision_log`、`ai_request_trace`、`ai_usage_fact`、`ops_audit_log`、`ops_outbox_event`、`ops_inbox_event` |
| P1 | 生产化运营、Playground、安全明细和结算增强 | `ai_channel_group`、`ai_channel_group_metric_snapshot`、`iam_gateway_api_key` 或 `plus_api_key` 兼容索引、`iam_gateway_access_policy`、`iam_user_login_event`、`ai_pricing_import_snapshot`、`ai_quota_policy`、`ai_generation_session`、`ai_generation_job`、`ai_generation_asset`、`ai_generation_asset_action`、`commerce_usage_settlement`、`commerce_usage_statement`、`commerce_usage_statement_item`、`ops_config_snapshot`、`ops_gateway_instance`、`ops_gateway_heartbeat`、`ops_notification_message`、`ops_notification_delivery` |
| P2 | 门户生态、内容运营、导出、健康治理 | `plus_app`、`plus_agent_skill`、`plus_agent_skill_package`、`plus_user_agent_skill`、`plus_category`、`content_announcement`、`content_doc_page`、`content_forum_post`、`content_forum_comment`、`content_course`、`content_course_lesson`、`content_course_relation`、`commerce_billing_export`、`integration_webhook_endpoint`、`integration_provider_health_snapshot`、`ai_model_rank_snapshot` |
| P3 | 大规模 SaaS 和 K8S 多 Cell 增强 | `ops_job_execution`、`ops_alert_event`、`ops_metric_snapshot` 以及按 Cell/Region 拆分的投影表 |

API Key 的第一阶段有两种合法路线：

- 如果 Java `plus_api_key` 已经作为 app/backend API 的标准事实来源，则 P0/P1 先复用 `plus_api_key`，新增 `ai_channel_group`、`iam_gateway_access_policy` 等扩展表通过 `legacy_api_key_id` 关联，不改 `plus_api_key` 字段。
- 如果 claw-router 需要独立的高安全网关 Key 索引，才新增 `iam_gateway_api_key`。该表只保存 `key_prefix`、`key_hash`、策略引用、状态和审计信息，不保存 API Key 明文；与 `plus_api_key` 的关系必须在契约中声明。

## 14. 核心数据链路

### 14.1 Provider 和路由配置链路

1. Admin/Console 通过 `/backend/v3/api` 或 `/app/v3/api` 调用配置 API。
2. 控制面写入 `integration_provider`、`ai_channel`、`ai_channel_credential`、`ai_channel_resource` 和 `ai_model_mapping_rule*`，其中 `integration_provider` 表示 API 接入方，`ai_channel_credential` 承载认证配置，`ai_channel_resource` 承载资源授权，模型转换规则按全局、Vendor、账号/渠道绑定分层覆盖。
3. 模型目录写入 `ai_model_vendor`、`ai_model_family`、`ai_model` 和 `ai_model_pricing`，其中 `ai_model_vendor` 是 `ModelVendor` 的事实来源，`ai_model_pricing.price_side` 区分官方参考价、供应商上游成本价和客户销售价。
4. 价格策略写入 `ai_billing_meter`、`ai_pricing_plan`、`ai_pricing_plan_binding`、`ai_pricing_rule` 和 `ai_pricing_tier`；API Key 创建选择 `ai_channel_group`，该分组通过 `pricing_plan_id` 挂默认定价方案；默认销售价可以按 `official_reference * default_multiplier` 派生，供应商成本价按 `provider_code/channel_id/provider_model` 独立维护。
5. 路由策略写入 `ai_routing_policy`、`ai_routing_profile`、`ai_routing_rule`。
6. 写事务同时产生 `ops_outbox_event`，热路径订阅并刷新本地缓存。
7. 网关热路径只读缓存和只读副本，不能直接修改配置主表。

### 14.2 请求、用量和结算链路

1. Gateway 收到 `/v1/*` 请求，解析 API Key、租户、组织、用户和 owner。
2. Gateway 执行策略匹配，写入或异步落地 `ai_routing_decision_log`。
3. Provider 调用过程写入 `ai_request_trace`，记录每次 attempt、错误、延迟、状态码和 fallback。
4. 响应完成后生成 `ai_usage_fact`，作为计费唯一用量事实。
5. Settlement worker 消费 `ai_usage_fact`，生成 `commerce_usage_settlement`。
6. 资金扣减、积分扣减、充值入账仍调用既有账户/VIP/交易服务，最终事实写入 `plus_account`、`plus_account_history`、`plus_order`、`plus_payment` 等既有表。
7. 结算成功、失败、补偿都通过 `ops_outbox_event` 发布，消费端用 `ops_inbox_event` 去重。

### 14.3 管理审计链路

1. Admin 对渠道、密钥、计费、用户余额、权限的操作必须写 `ops_audit_log`。
2. `ops_audit_log` 不保存敏感明文，只保存脱敏对象、目标 ID、操作前后摘要 hash、request_id、operator_id。
3. 高危操作需要 `approval_id` 或 `risk_ticket_id`，用于后续接入审批流。

## 15. 部署形态下的数据库映射

| 部署形态 | 推荐数据库 | 设计要求 |
| --- | --- | --- |
| 本地桌面 | SQLite WAL 或嵌入式 PostgreSQL | 结构契约不变；JSON 映射为 TEXT/JSON；decimal 按字符串或 NUMERIC 兼容；密钥优先放系统 Keychain，只在库中保存 `secret_ref` |
| Server 单机 | PostgreSQL | 推荐所有新表按标准 DDL 落地；L3 表支持备份、审计和定期归档 |
| Docker Compose | PostgreSQL + Redis | 初始化脚本幂等；迁移版本随镜像发布；本地卷必须隔离 secrets 和 data |
| K8S | PostgreSQL HA/云数据库 + Redis/消息队列 | `ai_usage_fact`、`ai_request_trace`、`ai_routing_decision_log`、`ops_audit_log` 按时间分区；outbox/inbox 可接 Kafka/NATS/RabbitMQ |

方言映射原则：

- `BIGINT` 对应逻辑 `int64`，API/SDK 统一 string。
- `NUMERIC(18,6)` 或更高精度对应 decimal，API/SDK 统一 string。
- PostgreSQL `jsonb` 在 SQLite 中映射为 TEXT + JSON 校验，在 MySQL 中映射为 JSON。
- 分区是物理优化，不改变表契约；SQLite 和轻量部署可以只做归档清理。

## 16. 性能、分区和留存

| 表 | 分区建议 | 默认留存 | 热索引预算 | 说明 |
| --- | --- | ---: | ---: | --- |
| `ai_usage_fact` | 按 `occurred_at` 月分区；大规模租户可按 tenant hash 子分区 | 在线 24 个月，冷归档 5 年 | 6 | 账务来源事实，不能随意删除 |
| `ai_request_trace` | 按 `started_at` 日/月分区 | 在线 90-180 天，错误 trace 可延长 | 5 | 高写入日志，payload 需裁剪 |
| `ai_routing_decision_log` | 按 `created_at` 月分区 | 在线 180 天，企业可配置 | 5 | 路由回放证据 |
| `ops_audit_log` | 按 `created_at` 月分区 | 在线 24 个月，冷归档 5 年或按合规 | 6 | 高敏审计，支持 legal hold |
| `ops_outbox_event` | 按 `created_at` 月分区或状态归档 | 成功发布 30-90 天，失败保留至处理 | 5 | 成功事件可归档，失败事件不可提前清理 |
| `ops_inbox_event` | 按 `created_at` 月分区 | 大于最大重放窗口，默认 180 天 | 4 | 消费去重窗口必须覆盖消息重放周期 |

索引预算规则：

- 配置主表最多 6 个核心索引；日志事实表最多 8 个在线索引。
- 多租户在线查询索引必须以 `tenant_id, organization_id` 开头。
- `request_id`、`trace_id`、`idempotency_key`、`external_event_id` 必须有明确唯一或普通索引用途。
- JSON 字段只能保存扩展或快照，不能作为租户、金额、状态、权限、幂等、核心过滤条件的唯一来源。

## 17. 安全分级

| 数据类型 | 示例字段 | 存储要求 | API 返回要求 |
| --- | --- | --- | --- |
| SECRET | API Key 明文、Provider token、私钥 | 不入业务库；进入 Vault/Keychain/KMS | 只创建时展示一次，后续不可读 |
| SECRET_REF | `secret_ref` | 可入库，指向密钥系统路径或句柄 | admin 也默认脱敏 |
| SECRET_HASH | `key_hash`、`payload_hash` | HMAC-SHA256 或等价算法，pepper 不入库 | 可用于比对，不用于展示 |
| PII | 手机、邮箱、OAuth openid、地址 | 复用 `plus_user*` 既有加密/脱敏策略 | 按 Java app/backend API 权限返回 |
| FINANCIAL | 余额、流水、支付、退款、发票 | 复用 `plus_account*`、`plus_payment*` 等既有事实表 | 只通过账户/交易服务暴露 |
| AUDIT | `ops_audit_log`、决策日志、trace | append-only、留存、legal hold | 仅 admin/审计角色可查，敏感字段脱敏 |

## 18. 详细数据契约

核心表字段、唯一键、索引、状态机、生命周期、结算一致性和 CI 校验规则见 [11-数据契约与核心表设计.md](./11-数据契约与核心表设计.md)。前端功能模块到数据库表、字段和 API 面的完整映射见 [12-前端功能模块与数据库表结构映射.md](./12-前端功能模块与数据库表结构映射.md)。后续生成 DDL、Entity、DTO、OpenAPI 和 SDK 时，以这些数据契约为评审入口。

