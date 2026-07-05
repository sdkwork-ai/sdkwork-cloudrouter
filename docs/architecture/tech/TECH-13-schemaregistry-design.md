> Migrated from `docs/13-页面级数据结构覆盖与SchemaRegistry落地设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 版本：v0.1
> 日期�?026-04-28
> 范围：`apps/sdkwork-clawrouter-pc` 全量 public、console、admin 页面级数据结构覆盖、验收条件、Schema Registry 落地方式�?> 关联：[12-前端功能模块与数据库表结构映�?md](./12-前端功能模块与数据库表结构映�?md)、[14-数据结构细节复核与补强记�?md](./14-数据结构细节复核与补强记�?md)、[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)�?> **2026-06-20�?* 课程（`/courses`、`content_course*`）已迁出�?`sdkwork-course`；下文涉�?course 的段落为历史记录，以 [31-product-composition-model.md](./31-product-composition-model.md) 为准�?
## 1. 目标

本阶段把数据库设计从“表结构说明”推进到“页面级覆盖 + 可校验契约”。后续实现时，任何页面接入真�?API 前，都必须能回答�?
- 这个页面的数据从哪些事实表、投影表或存�?`plus_*` 表来�?- 页面写操作进入哪�?API 面：`/app/v3/api`、`/backend/v3/api` �?`/v1/*`�?- 页面字段和表字段如何映射，是否有 int64、decimal、时间、枚举和 JSON 序列化风险�?- 页面涉及的资金、密钥、PII、审计、结算是否达�?L3�?- 表结构是否进�?Schema Registry，能否反向校�?DDL、Entity、DTO、OpenAPI �?SDK�?
## 2. 行业标准对标

本数据结构按 SaaS API 平台、AI Gateway、FinOps、Developer Portal �?Enterprise Admin 的常见行业实践设计�?
| 设计主题 | 行业标准做法 | 本项目落�?|
| --- | --- | --- |
| 事实来源 | 账户、支付、用户、券、订单保持单一事实来源 | 复用 `plus_*`，不创建同义替代�?|
| API Key 安全 | 明文只展示一次，库中保存 hash/prefix | `plus_api_key` 兼容 + `iam_gateway_api_key` L3 索引 |
| Provider Secret | Secret 不落业务库，保存 KMS/Vault 引用 | `integration_provider_account.secret_ref` |
| 用量计费 | 请求 trace 和账�?fact 分离 | `ai_request_trace` �?`ai_usage_fact` 分表 |
| 结算一致�?| 用量事实、结算桥接、账户流水分�?| `ai_usage_fact` -> `commerce_usage_settlement` -> `plus_account_history` |
| 配置发布 | 配置主表 + 快照 + outbox 事件刷新缓存 | `ops_config_snapshot` + `ops_outbox_event` |
| 前端门户 | 公开内容、用户控制台、后台管理共用事实表，API 面隔�?| public/console/admin 不产生页面名前缀�?|
| 审计合规 | 高危操作 append-only 审计 | `ops_audit_log` |
| 大规模日�?| 热事实表分区、留存、归�?| usage、trace、audit、outbox/inbox 按时间治�?|
| 多语言 SDK | int64/decimal string 化，schema registry 驱动契约 | YAML 中统一 `api_serialization` |

## 3. 页面级覆盖矩�?
### 3.1 Public

| 页面 | 必须满足的数据能�?| 事实�?投影�?| 验收�?|
| --- | --- | --- | --- |
| `/` Home | 产品能力、部署方式、入口导�?| 静态内容或 `content_doc_page` | 首页不依赖交易表；可灰度管理内容�?|
| `/models` | 模型列表、模型厂家、模型族、接入供应商、模态、计量表、价格、能力、过滤排�?| `ai_model_vendor`、`ai_model_family`、`ai_model`、`ai_model_capability`、`ai_billing_meter`、`ai_model_pricing`、`ai_pricing_plan`、`integration_provider` | 价格 decimal string；模�?ID 不绑定单一接入供应商；厂家使用 `ModelVendor`；默认展示当前用�?Key 分组命中的定价方�?|
| `/models/:id`、`/models/:provider/:model` | 模型详情、厂家、模型族、参数、限制、用例、API 格式；同时支持模�?ID 深链和供应商/模型双段深链 | `ai_model_vendor`、`ai_model_family`、`ai_model`、`ai_model_capability`、`ai_model_pricing` | 能力字段列化，参�?schema 可版本化；双段深链必须归一到同一模型目录事实 |
| `/rankings` | 排行榜、趋势、模型厂�?供应�?模态过滤、历史曲�?| `ai_model_rank_snapshot`，来�?`ai_usage_fact` | 排行快照保存 `vendor_code`，可重建，不直接扫在�?usage 大表 |
| `/apps`、`/apps/:id` | 应用列表、详情、截图、平台发布版本、下载、评分、收�?| `appstore_app`、`studio_catalog_action` | App 主数据沿�?canonical platform_app；版本、安装包、媒体来�?appstore_app JSON 字段；下�?评分/收藏�?studio_catalog_action 行为事实为准 |
| `/skills-hub`、`/skills-hub/:id` | 技能列表、镜像、框架、版本、截图、下载、评分、收�?| `plus_agent_skill`、`plus_agent_skill_package`、`plus_user_agent_skill`、`plus_category`、`studio_catalog_action` | 技能主数据沿用 Java `PlusAgentSkill`；分类沿�?Java `PlusCategory`；镜�?大小/框架/截图作为 `default_config.portal` �?`manifest_url` 元数据适配；下�?评分/收藏以行为事实可重算 |
| `/docs`、`/product-docs` | 文档页、slug、内�?hash | `content_doc_page` 或构建产�?| 文档可静态化，DB 仅作索引/发布管理 |
| `/api-reference` | OpenAPI 分类、接口详情、示例、版本切�?| OpenAPI 文件 + `content_doc_page` + `content_openapi_snapshot` | OpenAPI 文件是接口事实来源，DB 只保存版本、hash、分类树和示�?manifest，不复制完整参数定义 |
| `/sdk-reference` | SDK 语言、安装命令、示例、包版本 | SDK metadata + `content_doc_page` + `content_sdk_release` | SDK 元数据由发布流水线生成，DB 保存可检索发布清单和示例 manifest |
| `/playground` | Agent/图片/视频/音乐/语音/音效生成、历史、预览、收藏、下载、分享、二次操�?| `ai_generation_session`、`ai_generation_job`、`ai_generation_asset`、`ai_generation_asset_action`、`ai_usage_fact` | 生成任务、资产和操作分表；资�?URL 不作为账务事�?|
| `/forum`、`/forum/:id` | 帖子、评论、回复、点赞、置顶、标�?| `content_forum_post`、`content_forum_comment`、`content_reaction` | 作者快照和真实用户 ID 分离；点�?取消点赞�?reaction 表为事实，计数字段可重算 |
| `/courses`、`/courses/:id` | 课程、章节分组、课时、合集、相关课程、评论、点�?| `content_course`、`content_course_section`、`content_course_lesson`、`content_course_relation`、`content_forum_comment`、`content_reaction` | 课程、章节分组、课时和推荐关系分表；课程评论通过通用 target 字段挂载 |

### 3.2 Console

| 页面 | 必须满足的数据能�?| 事实�?投影�?| 验收�?|
| --- | --- | --- | --- |
| `/console/dashboard` | 用户侧用量趋势、模型排行、公�?| `ai_usage_fact`、`ai_model_rank_snapshot`、`content_announcement`、`ops_metric_snapshot` | 不全表扫 usage；指标可通过快照或聚合读模型提供 |
| `/console/api-keys` | Key 创建、批量创建、选择分组、额度、能力、IP、模型范围、过期、删�?| `plus_api_key`、`iam_gateway_api_key`、`ai_channel_group`、`ai_channel_group_metric_snapshot`、`iam_gateway_access_policy`、`ai_pricing_plan`、`ai_quota_policy` | Key 明文只展示一次；创建 Key 时选择 `ai_channel_group`；分组通过 `pricing_plan_id` 获得默认定价方案；分组容量和已用量走投影快照 |
| `/console/usage` | 请求日志、token、价格、IP、路径、TTFT、流式标�?| `ai_request_trace`、`ai_usage_fact`、`ai_routing_decision_log` | trace �?usage 可按 request_id 关联 |
| `/console/usage` 多模态计�?| 结果数、条目数、字符数、音频秒数、视频秒数、统一计费数量 | `ai_billing_meter`、`ai_usage_fact` | 所有模态最终都�?`billing_meter_code + billable_quantity + billable_unit`，原�?token/秒数/个数作为明细字段保留 |
| `/console/gateway` | endpoint、method、status、duration、channel | `ai_request_trace`、`ops_gateway_instance` | 运行状态与请求事实分离 |
| `/console/routing` | 渠道账号、模型映射、策略、HA、fallback、请求数�?| `integration_*`、`ai_routing_*`、`ai_request_trace`、`ai_usage_fact` | Provider secret 不落库；策略发布有快照和 outbox |
| `/console/commerce` | 兑换码、充值、充值历�?| `promotion_code`、`promotion_user_coupon`、`promotion_discount_application`、`commerce_recharge_package`、`commerce_order`、`commerce_payment_*` | 兑换码和卡券核销复用 `sdkwork-appbase` promotion 标准�?|
| `/console/checkout` | 支付确认、支付状�?| `plus_order`、`plus_payment` | 支付状态以支付服务事实为准 |
| `/console/settlements` | 账期账单、分项、导�?| `commerce_usage_statement`、`commerce_usage_statement_item`、`commerce_billing_export` | 账单是投影，不替�?`plus_invoice` |
| `/console/account` | 账户资料、余额、发票、安全、登录日�?| `plus_user`、`plus_account`、`plus_invoice*`、`iam_user_security_setting`、`iam_user_login_event`、`ops_audit_log` | PII 不复制到扩展表；登录明细进入 IAM 登录事件，不混入后台操作审计 |
| `/console/recharge` | 充值包、充值方�?| `plus_vip_recharge_pack`、`plus_vip_recharge_method` | 充值包沿用存量结构 |
| `/console/settings` | 语言、时区、Webhook、通知偏好 | `iam_user_preference`、`integration_webhook_endpoint`、`ops_notification_delivery` | Webhook secret 存引用，通知偏好入用户偏�?|
| `/console/notifications` | 通知列表、详情、已读、账单提醒、预�?| `ops_notification_message`、`ops_notification_delivery` | 通知定义和用户投递状态分�?|
| `/console/providers` | Claude/Codex/Gemini/OpenCode 配置、资源能力、代�?| `integration_provider`、`ai_channel`、`ai_channel_credential`、`ai_channel_resource`、`integration_proxy`、`ai_model_mapping_rule*` | 本地/�?Provider 用同一标准表；账号资源授权和模型映射分�?|
| `/console/user` | 个人资料、OAuth、MFA、安全状态、最近登�?| `plus_user`、`plus_oauth_account`、`iam_user_preference`、`iam_user_security_setting`、`iam_user_login_event` | 用户主数据仍�?`plus_user`，OAuth 物理表名�?entity 保持一�?|

### 3.3 Admin

| 页面 | 必须满足的数据能�?| 事实�?投影�?| 验收�?|
| --- | --- | --- | --- |
| `/admin/dashboard` | 全局流量、成本、trace、图�?| `ai_usage_fact`、`ai_request_trace`、`ops_metric_snapshot` | 后台跨租户查询必须显式授权和审计 |
| `/admin/user` | 用户管理、余额充�?退款、用�?Key | `plus_user`、`plus_account`、`plus_account_history`、`plus_api_key`、`iam_gateway_api_key` | 后台余额操作必须写账户流水和审计 |
| `/admin/group` | 分组、平台、计费类型、倍率、默认定价方案、账号容量、使用量 | `ai_channel_group`、`ai_channel_group_metric_snapshot`、`iam_gateway_access_policy`、`ai_pricing_plan`、`ai_pricing_plan_binding` | 分组不是用户组替代表，是 Key/计费/策略分组；创�?Key 选择该分组；容量和用量从快照读取，避免页面扫热事实表 |
| `/admin/model` | 模型厂家、模型族、模型、接入供应商、计量表、官方价、供应商价、销售价、上下文、调用量 | `ai_model_vendor`、`ai_model_family`、`ai_model`、`ai_billing_meter`、`ai_model_pricing`、`ai_pricing_plan`、`ai_pricing_rule`、`ai_pricing_tier`、`integration_provider`、`ai_model_rank_snapshot` | 新价格表不使�?float/double；`BillingMeter` 覆盖 token、请求、结果、个数、秒数、字符、存储和流量；`price_side` 区分官方参考价、供应商上游成本价、客户销售价 |
| `/admin/channel` | 上游服务商账号、协议、认证、资源能力、模型映射、权�?| `ai_model_vendor`、`integration_provider`、`ai_channel`、`ai_channel_credential`、`ai_channel_resource`、`ai_model_mapping_rule*`、`integration_proxy` | Secret 只存引用；资源授权和模型映射分别维护 |
| `/admin/announcement` | 公告发布、草稿、目标人�?| `content_announcement` | 发布、撤回写审计 |
| `/admin/marketing` | 优惠券、批次、兑换、充值记录、邀请统�?| `promotion_offer`、`promotion_offer_version`、`promotion_coupon_stock`、`promotion_code`、`promotion_user_coupon`、`promotion_discount_application`、`promotion_coupon_ledger_entry`、`promotion_external_binding`、`plus_vip_recharge*`、`plus_invitation*`、`plus_partner` | 卡券营销事实统一进入 `promotion_*` |
| `/admin/finance` | 交易流水、账单、充值、退款、消�?| `plus_account_history`、`plus_payment`、`plus_refund`、`commerce_usage_statement` | 财务事实�?`plus_account_history`、支付退款表为准 |
| `/admin/record` | 请求日志、计费明细、价格快照、IP | `ai_request_trace`、`ai_usage_fact`、`ai_routing_decision_log` | 请求事实可按 request_id 回放 |
| `/admin/ratelimit` | IP、Token、模型限流、防火墙 | `ai_quota_policy`、`iam_gateway_risk_rule`、`iam_gateway_access_policy`、`ai_usage_fact`、`ops_metric_snapshot` | 黑白名单和限流策略可版本化；运行态用量从请求事实和指标投影聚�?|
| `/admin/monitor` | 节点、CPU、内存、告警、性能曲线 | `ops_gateway_instance`、`ops_gateway_heartbeat`、`ops_alert_event`、`ops_metric_snapshot` | 监控指标与审�?配置分离 |

## 4. Schema Registry 落地方式

Schema Registry 文件�?[schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)。它不是迁移脚本，而是生成和校验迁移脚本的上游契约�?
### 4.1 Registry 必须包含

| 契约�?| 要求 |
| --- | --- |
| `table` | 标准表名 |
| `domain` | `iam`、`integration`、`ai`、`commerce`、`studio`、`content`、`ops`、`legacy` |
| `profile` | 表画像，例如 `tenant_entity`、`event_log`、`projection`、`audit_log` |
| `compliance_level` | L0/L1/L2/L3 |
| `system_of_record` | 是否事实来源 |
| `write_owner` | 写入 owner |
| `api_surfaces` | `app`、`backend`、`openai_v1`、`worker`、`system` |
| `frontend_routes` | 覆盖的页面路�?|
| `columns` | 专属字段和公共字段组 |
| `indexes` | 核心唯一键和查询索引 |
| `security` | 敏感等级、PII、secret、审计要�?|
| `lifecycle` | 留存、归档、软删、重建策�?|

### 4.2 生成链路

```text
schema-registry YAML
  -> DDL migration draft
  -> Java Entity / Repository
  -> App API / Backend API OpenAPI
  -> generated SDK
  -> frontend SDK service replacement
  -> schema drift / API drift CI
```

### 4.3 阻断规则

- Registry 中不存在的新增表，不允许进入迁移脚本�?- Registry 中没�?`frontend_routes` �?`read_consumers` 的表，必须说明后台任务、系统投影或兼容迁移用途�?- L3 表缺�?security、retention、idempotency �?audit 说明时，阻断实现�?- `plus_*` 表只能登记为 legacy compatible，不能在本项目生成改�?DDL�?- `claw_`、`router_`、`sdkwork_`、`console_`、`admin_`、`portal_` 不得作为新业务表前缀�?
## 5. 页面实现验收口径

| 验收�?| 标准 |
| --- | --- |
| 页面数据来源 | 每个页面在本文第 3 节有表映�?|
| 表契�?| 每张新表�?Schema Registry 有登�?|
| API �?| Console 只走 `/app/v3/api`，Admin 只走 `/backend/v3/api`，OpenAI 兼容只走 `/v1/*` |
| 金额和价�?| decimal string，不使用 float/double |
| int64 | API/SDK 序列化为 string |
| 密钥 | 明文不落库，secret reference + hash |
| 账户/充�?支付 | 使用 `plus_*`，不建替代表 |
| 用量计费 | `ai_usage_fact` 是用量事实，`commerce_usage_settlement` 是桥接，`plus_account_history` 是最终流�?|
| 审计 | Admin 高危写操作进�?`ops_audit_log` |
| 可观�?| 请求、trace、路由决策、用量、结算可以用 `request_id` 串联 |
| 性能 | 热日�?事实表有分区、留存、索引预�?|
| 可重�?| 排行榜、账单、指标是 projection，可从事实表重建 |

## 6. P0/P1 实现范围

### 6.1 P0

先满�?API Gateway、Provider、路由、用量事实和审计闭环�?
- `integration_provider`
- `ai_channel`
- `integration_provider_account`
- `ai_channel_credential`
- `ai_channel_resource`
- `ai_model_mapping_rule`
- `ai_model_mapping_rule_binding`
- `ai_model_mapping_rule_item`
- `ai_model_vendor`
- `ai_model_family`
- `ai_model`
- `ai_billing_meter`
- `ai_model_pricing`
- `ai_pricing_plan`
- `ai_pricing_plan_binding`
- `ai_pricing_rule`
- `ai_pricing_tier`
- `ai_routing_policy`
- `ai_routing_profile`
- `ai_routing_rule`
- `ai_routing_decision_log`
- `ai_request_trace`
- `ai_usage_fact`
- `ops_audit_log`
- `ops_outbox_event`
- `ops_inbox_event`

### 6.2 P1

再满�?console 高频页面和生产结算闭环：

- `ai_channel_group`
- `ai_channel_group_metric_snapshot`
- `iam_gateway_api_key` �?`plus_api_key` 扩展
- `iam_gateway_access_policy`
- `ai_pricing_import_snapshot`
- `ai_quota_policy`
- `ai_generation_session`
- `ai_generation_job`
- `ai_generation_asset`
- `ai_generation_asset_action`
- `commerce_usage_settlement`
- `commerce_usage_statement`
- `commerce_usage_statement_item`
- `ops_notification_message`
- `ops_notification_delivery`
- `iam_user_preference`
- `iam_user_security_setting`
- `iam_user_login_event`
- `content_openapi_snapshot`
- `content_sdk_release`
- `content_reaction`
- `content_course_section`
- `studio_catalog_action`

## 7. 后续产物

完成本文�?Schema Registry 后，下一步实现应按以下顺序推进：

1. �?Registry 生成 P0/P1 PostgreSQL DDL 草案�?2. �?SQLite 本地桌面部署生成兼容 DDL 草案�?3. 生成 Java Entity/Repository 草案，但不改 `plus_*` 表�?4. �?`legacy-java-plus-app-api` �?`legacy-java-plus-backend-api` 中补标准路径�?OpenAPI�?5. 生成 SDK 后替�?portal 中的 mock service�?6. 增加 CI：schema registry drift、禁用前缀、int64/decimal 序列化、L3 安全字段、替代表阻断�?
## 8. 结论

当前数据结构覆盖�?portal 的全部页面：public 内容面、console 用户控制面、admin 管理面、OpenAI 兼容网关调用面。设计以事实来源为边界，不按前端路由建表；以 `plus_*` 保护既有用户/账户/交易事实，以标准前缀表承载新增网关、门户、生成资产、通知、审计和投影能力�?
