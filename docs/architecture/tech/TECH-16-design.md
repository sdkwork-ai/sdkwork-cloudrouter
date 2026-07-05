> Migrated from `docs/16-前端代码契约复核与数据设计覆盖检�?md` on 2026-06-24.
> Owner: SDKWork maintainers

> 版本：v0.1
> 日期�?026-04-28
> 范围：`apps/sdkwork-clawrouter-pc` 当前路由、package service/interface、mock data �?`docs/schema-registry/sdkwork-clawrouter.tables.yaml` 的页面级覆盖复核�?> 约束：只修正数据设计与接口契约，不调�?portal 既有 UI 视觉设计�?> **2026-06-20�?* 课程路由�?`content_course*` 表契约已移除；course �?`sdkwork-course` 拥有，见 [31-product-composition-model.md](./31-product-composition-model.md)�?
当前数据库设计的总体方向是正确的：没有按前端页面建表，而是�?IAM、Integration、AI、Commerce Projection、Studio、Content、Ops、Legacy Compatible 等领域拆分事实表、投影表和兼容表，能够支�?public、console、admin 三类页面�?
本轮从前端代码反向检查后，确认表结构在核心领域上已经能覆盖：

- 模型目录、模型厂�?`ModelVendor`、模型能力、模型详情、排行榜与价格展示�?- API Key 创建、分组选择、额度、用量、IP 限制与多模态权限�?- Provider、Channel、认证方式、模型白名单/映射、代理配置与健康状态�?- `/v1/*` 网关 trace、路由决策、用量事实、计费快照、成本与结算投影�?- LLM、Image、Video、Audio、Music、SFX、未�?API 按次/按结�?按条目等统一计量�?- 账户、用户、VIP、充值、优惠券、订单、支付、退款、发票等继续复用 `legacy-java-plus-entity` �?`plus_*` 表；新增数据模型先查 Java Entity，存在则�?Java app/backend API 和实体结构为准�?- 应用中心、技能中心、文档、SDK、论坛、消息、公告、监控、限流等门户和后台能力�?
本轮发现的问题不是“缺少大表”，而是部分页面�?`frontend_routes` 覆盖标注偏窄，可能导致后续生�?API、DTO、SDK 或验收清单时漏掉数据依赖。已�?schema registry 中修正�?
## 2. 前端代码输入

### 2.1 路由入口

| 页面�?| 路由 |
| --- | --- |
| Public | `/`, `/models`, `/models/:id`, `/models/:provider/:model`, `/rankings`, `/apps`, `/apps/:id`, `/skills-hub`, `/skills-hub/:id`, `/product-docs`, `/docs`, `/api-reference`, `/sdk-reference`, `/playground`, `/forum`, `/forum/:id` |
| Console | `/console/dashboard`, `/console/usage`, `/console/gateway`, `/console/routing`, `/console/api-keys`, `/console/user`, `/console/commerce`, `/console/checkout`, `/console/settlements`, `/console/account`, `/console/recharge`, `/console/settings`, `/console/notifications`, `/console/providers` |
| Admin | `/admin/dashboard`, `/admin/user`, `/admin/group`, `/admin/model`, `/admin/channel`, `/admin/announcement`, `/admin/marketing`, `/admin/record`, `/admin/monitor`, `/admin/ratelimit`, `/admin/finance` |

### 2.2 关键 service/interface

| 前端对象 | 来源 | 关键字段 |
| --- | --- | --- |
| `Vendor`, `Model` | `admin-model/src/modelService.ts`, `models/src/data/models.ts` | vendor、model、modality、context、pricing、capabilities、apiFormat、parameters、latency、throughput、limitations、useCases |
| `ChannelItem`, provider config | `admin-channel/src/channelService.tsx`, `console-routing/src/routingService.ts`, `console-providers/src/providerService.ts` | vendor、protocol、accessType、models、capabilities、weight、status、balance、errors、url、proxy、models config |
| `ApiKey`, `GroupData` | `console-api-keys/src/apiKeyService.ts`, `admin-group/src/groupService.ts` | group、rate、quota、usedQuota、modalities、ipLimit、billingType、rateMultiplier、capacity、usage |
| `UsageLog`, `LogRecord`, `GatewayTrace`, `RequestTrace` | usage/gateway/routing/admin-record | requestId、model、path、status、duration、ttft、stream、tokens、cacheReadTokens、cost、multiplier、base price、reasoningEffort、ip、channel |
| Billing/settlement/finance records | billing/settlements/account/recharge/admin-finance/admin-marketing | orderNo、tradeNo、amount、method、status、bill period、breakdown、invoice settings、recharge packages、coupon codes |
| Playground history | `@sdkwork/generations-pc-playground` (`PlaygroundPage.tsx`, `GenerationChatInput.tsx`), `@sdkwork/generations-pc-workspace` (domain generation workspace), domain `*-pc-generation` panels | modality、selected model、prompt、ratio、resolution、width、height、history、preview asset、favorite、download、share |
| Portal content | app-center、skills-hub、forum、api-reference、sdk-reference | releases、screenshots、frameworks、license、posts、comments、OpenAPI snapshot、SDK language/package/examples |

## 3. 覆盖矩阵

| 页面/模块 | 当前数据库落�?| 复核结论 |
| --- | --- | --- |
| Models list/detail | `ai_model_vendor`, `ai_model_family`, `ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_pricing_rule`, `integration_provider`, `legacy_model_info`, `legacy_model_price` | 能覆盖。模型详情页有价格、计量、能力、参数、限制、性能字段，不能只读模型主表�?|
| Rankings | `ai_model_rank_snapshot`, `ai_usage_fact` | 能覆盖。排行榜使用快照表，避免实时�?usage 热表�?|
| Playground | `ai_generation_session`, `ai_generation_job`, `ai_generation_asset`, `ai_generation_asset_action`, `ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_usage_fact`, `integration_provider` | 本轮补强。生成历史原设计已覆盖，但模型选择、能力过滤、价格估算和最终扣费还必须关联模型目录、计量表、价格方案和用量事实�?|
| Console API Keys | `plus_api_key`, `iam_gateway_api_key`, `ai_channel_group`, `iam_gateway_access_policy`, `ai_quota_policy`, `ai_pricing_plan`, `ai_pricing_plan_binding` | 能覆盖。创�?API Key 选择的是业务分组 `ai_channel_group`，不是价格分组�?|
| Admin Group | `ai_channel_group`, `ai_channel_group_metric_snapshot`, `ai_pricing_plan`, `ai_pricing_plan_binding`, `iam_gateway_access_policy` | 能覆盖。分组承�?Key、策略、容量、默认定价方案的业务绑定�?|
| Console/Admin Routing/Channel | `integration_provider`, `ai_channel`, `ai_channel_credential`, `ai_channel_resource`, `ai_model_mapping_rule*`, `integration_proxy`, `ai_routing_*`, `ops_config_snapshot` | 本轮补强 `/console/providers` 对资源授权、模型映射和配置快照的路由覆盖。Secret 只保存引用与 hash�?|
| Usage/Gateway/Admin Record | `ai_request_trace`, `ai_routing_decision_log`, `ai_usage_fact`, `ai_billing_meter` | 能覆盖。trace、routing decision、billing fact 分层正确�?|
| Billing/Recharge/Marketing/Finance | `plus_account`, `plus_account_history`, `plus_order`, `plus_order_item`, `plus_order_dispatch_rule`, `plus_order_worker_dispatch_profile`, `plus_payment`, `plus_payment_webhook_event`, `plus_refund`, `plus_invoice*`, `promotion_offer`, `promotion_coupon_stock`, `promotion_code`, `promotion_user_coupon`, `promotion_discount_application`, `plus_vip_recharge*`, `commerce_usage_statement*`, `commerce_usage_settlement` | 能覆盖。admin marketing 的卡券、批次、兑换码和核销对齐标准 `promotion_*`；充值包/支付记录、admin finance 的发票主表、订单派发和支付回调仍按各自标准事实表处理�?|
| Account/User/Settings/Messages | `plus_user`, `plus_oauth_account`, `plus_account`, `iam_user_preference`, `iam_user_security_setting`, `iam_user_login_event`, `integration_webhook_endpoint`, `ops_notification_message`, `ops_notification_delivery` | 能覆盖。PII 与登录安全事件不复制到业务投影表�?|
| App Center/Skills Hub | `appstore_app`, `plus_agent_skill`, `plus_agent_skill_package`, `plus_user_agent_skill`, `plus_category`, `studio_catalog_action` | 能覆盖。AppCenter 主数据沿�?Java `platform_app`；SkillsHub 主数据沿�?Java AgentSkills，分类沿�?`PlusCategory`；版本、镜像、框架、截图等 portal 展示元数据从 AgentSkill manifest/defaultConfig 适配；下载、收藏、评分作为行为事实�?|
| Forum | `content_forum_post`, `content_forum_comment`, `content_reaction` | 能覆盖。评论使用通用 target，支持论坛内容�?|
| API/SDK Reference | `content_openapi_snapshot`, `content_sdk_release`, `content_doc_page` | 能覆盖。OpenAPI �?SDK 源文件仍由构建产�?发布流水线负责，DB 保存版本、hash、manifest 与索引�?|
| Monitor/RateLimit | `ops_gateway_instance`, `ops_gateway_heartbeat`, `ops_metric_snapshot`, `ops_alert_event`, `ai_quota_policy`, `ai_usage_fact`, `iam_gateway_risk_rule`, `iam_gateway_access_policy` | 能覆盖本地桌面、Server、Docker、K8S 运行形态和限流/风控页面�?|

## 4. 本轮 schema registry 修正

| 修正�?| 原风�?| 修正 |
| --- | --- | --- |
| 模型详情页价格覆�?| `/models/:id` �?`/models/:provider/:model` 只标注模�?能力表，后续 DTO 可能漏掉 pricing | �?`ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan` �?`frontend_routes` 扩展到模型详情路�?|
| Playground 模型选择与成本估�?| 只标注生成历史表，无法从 registry 看出模型选择、计量、价格和扣费依赖 | �?`ai_model`, `ai_model_capability`, `ai_billing_meter`, `ai_model_pricing`, `ai_pricing_plan`, `ai_usage_fact`, `integration_provider` 覆盖�?`/playground` |
| Console providers 资源配置 | 页面�?`models.config.json` �?`proxy.conf`，原覆盖缺少资源授权、模型映射和配置快照 | �?`ai_channel_resource`、`ai_model_mapping_rule*` �?`ops_config_snapshot` 覆盖�?`/console/providers` |
| Admin marketing 充值记�?| 页面展示充值记录、支付方式、交易号，原覆盖偏向 coupon/invitation | �?`plus_vip_recharge_pack`, `plus_vip_recharge_method`, `plus_order`, `plus_payment` 覆盖�?`/admin/marketing` |
| Admin finance 发票主表 | 原覆盖发�?item/record，但 finance 账单视图仍需要发票主表上下文 | �?`plus_invoice` 覆盖�?`/admin/finance` |

## 5. 设计判断

### 5.1 应该保持现在的领域拆�?
不建议把表按 `console_*`、`admin_*`、`portal_*` 继续拆。前端现在虽然是一个合�?portal，但它同时包含公共门户、用户控制台和管理后台。按页面建表会导致同一事实重复写入，例如模型价格、API Key 分组、支付流水、用量账单和 Provider 配置都会被多处消费。当前的领域拆分更适合快速部署和长期扩展�?
### 5.2 `ai_billing_meter` 不是过度设计

从前端代码看，Playground �?dashboard 已经出现 text、image、video、audio、music、sfx，多数页面的消费记录也不只依�?token。价格体系如果只�?`input_token/output_token` 或简�?`billing_type=token/count/duration`，后续支持图片像素、音频秒、语音字符、视频秒、结果数、条目数、工具调用、存储和流量时会持续加字段。统一落到 `billing_meter_code + billable_quantity + billable_unit` 更稳�?
### 5.3 业务分组和定价方案的边界必须保持

API Key 创建选择的是 `ai_channel_group`。定价方案是 `ai_pricing_plan`，通过 `ai_channel_group.pricing_plan_id` �?`ai_pricing_plan_binding` 绑定�?group、key、user、vip、sku、tenant 等主体。不能再引入价格专用 group 表这类狭窄命名�?
### 5.4 UI 不应被数据库设计反向驱动

后续替换 mock service 时，只能调整数据适配层、DTO、loading/error/empty 状态和必要的接口字段映射，不应修改 `sdkwork-clawrouter-pc` 已给定的布局、颜色、字体、间距、组件外观和交互风格。数据库�?API 的职责是适配前端产品定义�?
## 6. 下一步建�?
1. 基于 schema registry 生成 P0/P1 PostgreSQL DDL 草案，并�?SQLite 本地桌面模式生成兼容 DDL�?2. �?`/app/v3/api` �?`/backend/v3/api` 输出页面�?OpenAPI 分组，路径保�?Java app-api/backend-api 标准�?3. 生成 TypeScript SDK service adapter，把 portal 当前 mock service 逐步替换�?SDK 调用，但保持 UI 组件不变�?4. 增加 CI 检查：每个 `src/App.tsx` 路由必须�?registry 至少有一个表覆盖；涉及金额、价格、余额的字段必须使用 decimal string；涉�?key/secret/IP 的表必须满足 L3 安全字段�?
