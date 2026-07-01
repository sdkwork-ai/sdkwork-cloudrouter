> Migrated from `docs/11-数据契约与核心表设计.md` on 2026-06-24.
> Owner: SDKWork maintainers

> 版本：v0.1
> 日期：2026-04-28
> 范围：`sdkwork-clawrouter` 新增数据域、存量 `plus_*` 表复用边界、核心表契约、索引、留存、事件一致性和 CI 校验。
> 依据：[DATABASE_SPEC.md](../DATABASE_SPEC.md)、[05-数据库设计.md](./05-数据库设计.md)、[12-前端功能模块与数据库表结构映射.md](./12-前端功能模块与数据库表结构映射.md)、[13-页面级数据结构覆盖与SchemaRegistry落地设计.md](./13-页面级数据结构覆盖与SchemaRegistry落地设计.md)、`legacy-java-plus-entity` 既有实体、`legacy-java-plus-app-api`、`legacy-java-plus-backend-api`。

## 1. 文档定位

本文不是 SQL 迁移脚本，也不是 ORM 实体清单，而是建表前的数据契约。后续任何 DDL、JPA Entity、Repository、OpenAPI、TypeScript/Java SDK DTO、数据同步任务和 CI schema linter 都应从本文契约生成或反向校验。

本轮只打磨设计，不修改 `legacy-java-plus-entity` 既有表结构，不生成生产迁移。

当前 portal 前端 public、console、admin 模块到数据库表和字段的完整映射见 [12-前端功能模块与数据库表结构映射.md](./12-前端功能模块与数据库表结构映射.md)。页面级覆盖验收、字段级复核和机器可校验表注册表见 [13-页面级数据结构覆盖与SchemaRegistry落地设计.md](./13-页面级数据结构覆盖与SchemaRegistry落地设计.md)、[14-数据结构细节复核与补强记录.md](./14-数据结构细节复核与补强记录.md) 与 [schema-registry/sdkwork-clawrouter.tables.yaml](./schema-registry/sdkwork-clawrouter.tables.yaml)。本文负责核心数据契约，12 号文档负责从前端产品面反推完整表结构覆盖，13 号文档负责页面级覆盖闭环和 Registry 落地规则，14 号文档负责 service/interface/mock data 字段级缺口复核。

核心目标：

- 保持用户、VIP、账户、优惠券、积分充值、订单、支付、退款、发票等 `plus_*` 表结构完全一致。
- 数据库模型采用 Java Entity first：任何新增数据模型先查 `legacy-java-plus-entity`；只要存在 `Plus*` Entity，就必须沿用对应 `plus_*` 表和 Java app/backend API，不得在 claw-router 下新建同义主数据表。
- 为 claw-router 新增网关域能力设计标准化、可审计、可扩展的新表。
- 支撑本地桌面、Server、Docker、K8S 四种部署方式，保持同一套逻辑数据契约。
- 支撑 API 通过 Java app/backend 标准路径自由切换：用户面 `/app/v3/api`，管理面 `/backend/v3/api`，OpenAI 兼容面 `/v1/*`。
- 支撑高性能热路径：配置可缓存、请求事实可异步落地、用量结算可幂等补偿。

## 2. 数据架构总览

### 2.1 分层模型

| 层 | 说明 | 代表表 | 写入 owner | 一致性要求 |
| --- | --- | --- | --- | --- |
| 存量主数据层 | Java 业务实体已有事实来源 | `plus_user`、`plus_account`、`plus_vip_*`、`plus_order`、`plus_payment` | 既有 Java service/repository | 保持现状，claw-router 不直接改结构 |
| 控制面配置层 | 网关域配置、Provider、模型厂家、模型、策略、Key 扩展、卡券营销 | `iam_*`、`integration_*`、`ai_model_vendor`、`ai_model`、`ai_routing_*`、`promotion_*` | claw-router control-plane | 强一致写入，变更发布到缓存 |
| 热路径事实层 | 请求决策、调用 trace、用量事实 | `ai_routing_decision_log`、`ai_request_trace`、`ai_usage_fact` | gateway runtime | append-only/准 append-only，支持异步落地和补偿 |
| 结算投影层 | 用量到 appbase 资金/积分账户的桥接证据 | `commerce_usage_settlement`、`commerce_billing_export` | settlement worker | 幂等，引用 `commerce_account_ledger_entry`，不复制账务事实 |
| 运营审计层 | 配置快照、审计、任务、告警、事件 | `ops_config_snapshot`、`ops_audit_log`、`ops_outbox_event`、`ops_inbox_event` | admin/ops/worker | L3 审计、留存、可追踪 |
| 门户内容层 | 统一门户中的生态内容 | `studio_*`、`content_*` | portal/content service | 与核心账务隔离，可独立扩展 |

### 2.2 写入边界

| 操作 | 正确写入路径 | 禁止路径 |
| --- | --- | --- |
| 创建/更新用户 | Java app/backend 用户服务写 `plus_user` | 在 claw-router 中创建用户镜像表 |
| 充值、扣费、退款、积分变动 | 账户/VIP/交易服务写 `plus_account`、`plus_account_history`、`plus_vip_point_change`、`plus_payment`、`plus_refund` | 网关直接 update 余额；只写投影不写流水 |
| 创建 API Key | 优先复用 Java `plus_api_key`；需要网关扩展时写 `iam_gateway_api_key` 作为 L3 Key 索引/扩展 | 保存明文 key；多个表各自生成同一用途 key |
| 配置 Provider 账号 | 写 `integration_provider_account`，secret 进入 Vault/Keychain/KMS，库中只保存 `secret_ref` 和 hash | 在 JSON 中保存上游 API key 明文 |
| 配置路由策略 | 写 `ai_routing_policy/profile/rule`，通过 outbox 发布缓存刷新 | 热路径实例本地配置漂移后不回写 |
| 记录请求用量 | gateway 写 `ai_usage_fact`，settlement worker 结转 | 直接以 trace 或 access log 作为账务事实 |
| 发布跨服务事件 | 本地事务写 `ops_outbox_event`，消费者写 `ops_inbox_event` 去重 | 只依赖内存队列或无幂等消息消费 |

## 3. 存量 `plus_*` 表复用契约

### 3.1 强制复用域

以下业务域不在 claw-router 中创建替代表。表结构、字段、索引、枚举转换、加密转换、审计字段均以 `legacy-java-plus-entity` 为准。

| 领域 | 事实来源表 | 本系统用途 |
| --- | --- | --- |
| 用户 | `plus_user`、`plus_user_address`、`plus_oauth_account` | 登录用户、租户归属、联系方式、OAuth 绑定 |
| 租户组织权限 | `plus_tenant`、`plus_organization`、`plus_organization_member`、`plus_department`、`plus_position`、`plus_role`、`plus_permission`、`plus_role_permission`、`plus_user_role` | app/backend 权限上下文、后台管理权限 |
| VIP | `plus_vip_user`、`plus_vip_level`、`plus_vip_benefit`、`plus_vip_level_benefit`、`plus_vip_benefit_usage` | VIP 状态、等级、权益、权益消耗 |
| 充值和积分 | `plus_vip_recharge`、`plus_vip_recharge_pack`、`plus_vip_recharge_method`、`plus_vip_point_change` | 充值记录、充值包、积分流水 |
| 账户和账本 | `plus_account`、`plus_account_history`、`plus_ledger_bridge`、`plus_currency`、`plus_exchange_rate`、`plus_account_exchange_config` | 余额、积分、token、账户流水、汇率 |
| 商品订单支付 | `plus_product`、`plus_sku`、`plus_order`、`plus_order_item`、`plus_payment`、`plus_payment_webhook_event`、`plus_refund` | 套餐、订单、支付、回调、退款 |
| 服务订单派发 | `plus_order_dispatch_rule`、`plus_order_worker_dispatch_profile` | 服务订单派发规则、接单人员容量和评级配置 |
| 卡券营销 | `promotion_offer`、`promotion_offer_version`、`promotion_coupon_stock`、`promotion_code`、`promotion_user_coupon`、`promotion_discount_application`、`promotion_coupon_ledger_entry`、`promotion_external_binding` | 券定义、版本、库存、兑换码、用户券、核销、流水和外部平台绑定 |
| 发票购物车 | `plus_invoice`、`plus_invoice_item`、`plus_invoice_record`、`plus_shopping_cart`、`plus_shopping_cart_item` | 发票、购物车 |

### 3.2 现有实体观察结论

| 表 | 观察到的关键契约 | claw-router 处理 |
| --- | --- | --- |
| `plus_user` | 包含用户名、昵称、加密密码、平台、性别、邮箱、手机号、区域、OAuth JSON、角色关系、metadata 等 | 只引用，不复制 PII；返回字段走 app/backend DTO 脱敏 |
| `plus_account` | 唯一键为 `(tenant_id, organization_id, user_id, account_type)`；包含余额、冻结余额、积分、token、状态 | 所有扣费/充值必须走账户服务；不得绕过流水 |
| `plus_account_history` | 包含 account、transaction、asset、before/after、source、usage_result、status | 用量结算的最终账务证据落在这里 |
| `plus_vip_recharge*` | 充值包、充值方式、充值记录 | Console 充值页面复用既有结构 |
| `plus_vip_point_change` | 积分流水 | 积分消耗和赠送由既有 VIP/账户逻辑处理 |
| `promotion_*` | 券定义、库存、兑换码、用户券、核销和流水 | Billing/redeem 功能只调用标准 promotion 能力 |
| `plus_api_key` | 保存 `key_value` 加密值、owner、状态、过期、最后使用时间 | P0 可复用；如新增 `iam_gateway_api_key`，必须声明一对一或扩展关系 |
| `plus_channel*` | 存量渠道、渠道账号、代理配置，部分配置使用 JSON | 作为兼容输入；新敏感 Provider 账号优先进入 `integration_*` L3 表 |
| `legacy_model_info` | 模型目录字段较丰富，包含能力、限制、价格 JSON、统计字段 | 可作为模型导入来源；网关标准目录用 `ai_model` |
| `legacy_model_price` | 存量价格使用 `Double` 字段 | 不修改；新标准价格表 `ai_model_pricing` 必须使用 decimal |
| `plus_usage_record` | 存量用量记录包含 token、count、duration、cost、currency、request/response time | 可兼容导入；网关计费事实以 `ai_usage_fact` 为准 |

### 3.3 禁止创建的替代表

本轮不得创建以下替代表，即使这些名称看起来符合标准前缀：

| 禁止表 | 原因 |
| --- | --- |
| `iam_user`、`iam_user_address`、`iam_user_oauth_account` | 会破坏 `plus_user*` 事实来源一致性 |
| `commerce_account`、`commerce_account_history` | 会形成双账户、双流水风险 |
| `commerce_vip_user`、`commerce_vip_recharge`、`commerce_vip_point_change` | 会形成双 VIP/积分事实 |
| 非 `promotion_` 命名的卡券主表 | 会形成双券事实 |
| `commerce_order`、`commerce_payment`、`commerce_refund`、`commerce_invoice` | 会绕开既有交易支付链路 |
| 任意 `claw_*`、`router_*`、`sdkwork_*` 业务表 | 违反 `DATABASE_SPEC.md` 的业务前缀要求 |

未来如果要把 `plus_*` 改名为标准业务前缀，必须另立迁移项目，先完成兼容视图、双写、回填、校验、读切换、写切换、收缩和回滚/前滚方案。

## 4. 公共字段模板

### 4.1 L2/L3 主表字段组

| 字段 | 逻辑类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | int64 | 是 | 内部主键，API 序列化为 string |
| `uuid` | string(64) | 是 | 外部稳定 ID，唯一 |
| `tenant_id` | int64 | 是 | 租户 ID；平台共享数据可用 0，但必须在契约中声明 |
| `organization_id` | int64 | 是 | 组织 ID；无组织时 0 |
| `user_id` | int64 | 条件 | 用户私有或用户创建资源必填 |
| `owner_type` | enum_int32 | 条件 | owner 模型，支持 user、organization、tenant、system、project 等 |
| `owner_id` | int64 | 条件 | owner ID |
| `data_scope` | enum_int32 | 是 | private、organization、tenant、public |
| `status` | enum_int32 | 是 | 状态机由表契约定义 |
| `created_at` | instant | 是 | UTC 创建时间 |
| `updated_at` | instant | 是 | UTC 更新时间 |
| `version` | int64 | 是 | 乐观锁，初始 0 |
| `created_by` | int64 | 建议 | 创建人 |
| `updated_by` | int64 | 建议 | 更新人 |
| `deleted_at` | instant | 可选 | 软删除时间 |
| `deleted_by` | int64 | 可选 | 删除人 |
| `archived_at` | instant | 可选 | 归档时间 |
| `retention_until` | instant | L3 建议 | 留存截止时间 |
| `request_id` | string(128) | 条件 | 请求链路 ID |
| `metadata` | json | 可选 | 仅放扩展字段，不放核心查询字段 |

### 4.2 事件/事实表字段组

| 字段 | 逻辑类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | int64 | 是 | 内部主键 |
| `uuid` | string(64) | 是 | 事件/事实外部 ID |
| `tenant_id` | int64 | 是 | 租户 |
| `organization_id` | int64 | 是 | 组织 |
| `user_id` | int64 | 条件 | 用户 |
| `request_id` | string(128) | 是 | 请求 ID |
| `trace_id` | string(128) | 建议 | 分布式 trace |
| `span_id` | string(128) | 可选 | 分布式 span |
| `idempotency_key` | string(128) | 条件 | 幂等键 |
| `external_event_id` | string(128) | 条件 | 第三方事件 ID |
| `payload_hash` | string(128) | L3 必填 | payload 摘要 |
| `status` | enum_int32 | 是 | 处理状态 |
| `created_at` | instant | 是 | 记录创建时间 |
| `occurred_at` | instant | 条件 | 业务发生时间 |
| `retention_until` | instant | L3 建议 | 留存截止 |
| `legal_hold` | bool | L3 建议 | 法务冻结 |

## 5. 前缀注册表

| 前缀 | bounded context | owner | 合规级别 | 可建表范围 |
| --- | --- | --- | --- | --- |
| `iam_` | identity-access | 身份与访问团队 | L2/L3 | API Key 扩展、访问策略、风险策略；不替代 `plus_user` |
| `integration_` | provider-integration | Provider 集成团队 | L2/L3 | Provider、渠道、上游账号、代理、健康快照 |
| `ai_` | ai-routing-metering | AI 网关团队 | L2/L3 | 模型目录、模型价格、路由策略、决策日志、请求 trace、用量事实 |
| `commerce_` | router-commerce-projection | 交易账户团队 | L3 | 用量结算投影、账单导出、价格计划映射；不替代账户/订单/支付 |
| `studio_` | portal-studio-assets | 产品生态团队 | L2 | 应用中心、技能中心、设计时资产 |
| `content_` | portal-content | 内容运营团队 | L2 | 公告、论坛、课程、评论 |
| `ops_` | operations-observability | 平台运维团队 | L2/L3 | 审计、事件、配置快照、任务、告警、实例心跳 |

## 6. IAM 核心契约

### 6.1 `ai_channel_group`

用途：API Key 分组、项目化管理、默认策略绑定。该表不保存 Key。

产品约束：创建 API Key 时选择的是该表中的分组。分组负责平台、计费类型、默认访问策略、默认配额策略、容量和默认定价方案；定价细节由 `ai_pricing_plan`、`ai_pricing_rule`、`ai_pricing_tier` 承担，不能再另建“价格分组”替代业务分组。

| 属性 | 值 |
| --- | --- |
| profile | tenant_entity |
| compliance_level | L2 |
| system_of_record | true |
| write_owner | claw-router-control |

业务字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string(128) | 是 | 分组名称 |
| `code` | string(64) | 否 | 租户内可读编码 |
| `description` | string(512) | 否 | 说明 |
| `provider_code` | string(64) | 否 | 默认 Provider/平台，支撑 Admin Group 的 platform 展示 |
| `group_type` | enum_int32 | 是 | public、dedicated、internal 等分组类型 |
| `default_policy_id` | int64 | 否 | 默认访问策略 |
| `default_quota_policy_id` | int64 | 否 | 默认配额策略 |
| `environment` | enum_int32 | 是 | prod、staging、dev、sandbox |
| `pricing_plan_id` | int64 | 否 | 默认绑定的 `ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 否 | 定价方案编码快照 |
| `rate_multiplier` | decimal_string | 是 | 计费倍率 |
| `price_reference_mode` | enum_int32 | 否 | official_reference、upstream_cost、custom 等价格参考模式 |
| `official_price_multiplier` | decimal_string | 否 | 以官方参考价为基准的倍率，未单独设置时可等于 `rate_multiplier` |
| `billing_type` | enum_int32 | 是 | balance、postpaid、free、custom |
| `capacity_limit` | int64 | 否 | 分组容量上限 |
| `allowed_origin` | json | 否 | Web 来源白名单，核心权限仍在 policy 表 |

约束和索引：

| 名称 | 类型 | 字段 |
| --- | --- | --- |
| `uk_ai_channel_group_uuid` | unique | `uuid` |
| `uk_ai_channel_group_tenant_code` | unique | `tenant_id, organization_id, code` |
| `idx_ai_channel_group_provider_status` | index | `tenant_id, organization_id, provider_code, status, updated_at, id` |
| `idx_ai_channel_group_tenant_status_updated` | index | `tenant_id, organization_id, status, updated_at, id` |
| `idx_ai_channel_group_pricing` | index | `tenant_id, organization_id, pricing_plan_id, status, updated_at, id` |

#### 6.1.1 `ai_channel_group_metric_snapshot`

用途：Key 分组容量和使用量的高频列表投影，服务 `/admin/group` 和 `/console/api-keys`。它可以从 Key、Provider account、usage fact 重建，不作为账务事实。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `group_id` | int64 | 是 | 分组 ID |
| `group_code` | string(64) | 是 | 分组编码快照 |
| `provider_code` | string(64) | 否 | 平台/Provider |
| `account_available_count` | int64 | 是 | 可用账号数 |
| `account_total_count` | int64 | 是 | 总账号数 |
| `capacity_used` | decimal_string | 否 | 已用容量 |
| `capacity_limit` | decimal_string | 否 | 容量上限 |
| `request_count_today` | int64 | 是 | 今日请求数 |
| `request_count_total` | int64 | 是 | 累计请求数 |
| `usage_amount_today` | decimal_string | 否 | 今日用量或金额 |
| `usage_amount_total` | decimal_string | 否 | 累计用量或金额 |
| `health_status` | enum_int32 | 是 | normal、warning、error |
| `snapshot_at` | instant | 是 | 快照时间 |

### 6.2 `iam_gateway_api_key`

用途：网关 API Key 的标准 L3 索引/扩展表。若 P0 复用 `plus_api_key`，该表可以暂缓；若创建，该表不得替代用户、账户、余额或订单事实。

| 属性 | 值 |
| --- | --- |
| profile | user_entity + credential_index |
| compliance_level | L3 |
| system_of_record | 条件 true；若复用 `plus_api_key` 则为 extension/projection |
| write_owner | api-key-service |

业务字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `legacy_api_key_id` | int64 | 条件 | 对应 `plus_api_key.id`；复用存量时必填 |
| `group_id` | int64 | 否 | API Key 分组 |
| `name` | string(128) | 是 | Key 名称 |
| `key_prefix` | string(32) | 是 | 展示和快速定位前缀，例如 `sk-...` 前几位 |
| `key_display_masked` | string(64) | 是 | Console/API 返回的脱敏展示值，例如 `sk-prod-abc****xyz` |
| `key_hash` | string(128) | 是 | HMAC-SHA256 摘要，不可逆 |
| `hash_alg` | string(32) | 是 | 算法版本，例如 `hmac-sha256-v1` |
| `secret_version` | int64 | 是 | 密钥轮换版本，创建为 1，轮换递增 |
| `policy_id` | int64 | 否 | 访问策略 |
| `quota_policy_id` | int64 | 否 | 配额策略 |
| `rate_limit_policy_id` | int64 | 否 | 限流策略 |
| `environment` | enum_int32 | 是 | prod、staging、dev、sandbox |
| `expire_at` | instant | 否 | 过期时间 |
| `last_used_at` | instant | 否 | 最近使用时间 |
| `last_used_ip_hash` | string(128) | 否 | 最近 IP 摘要 |
| `last_used_ip_masked` | string(64) | 否 | 最近 IP 脱敏展示，不保存完整明文 IP |
| `last_used_ip_region` | string(128) | 否 | 最近 IP 解析区域 |
| `last_revealed_at` | instant | 否 | 创建响应一次性返回明文的时间 |
| `rotated_from_key_id` | int64 | 否 | 轮换来源 Key ID |
| `revoked_at` | instant | 否 | 吊销时间 |
| `revoked_by` | int64 | 否 | 吊销人 |
| `risk_level` | enum_int32 | 否 | 风险等级 |

约束和索引：

| 名称 | 类型 | 字段 |
| --- | --- | --- |
| `uk_iam_gateway_api_key_uuid` | unique | `uuid` |
| `uk_iam_gateway_api_key_hash` | unique | `key_hash` |
| `uk_iam_gateway_api_key_legacy` | unique | `legacy_api_key_id`，仅复用 `plus_api_key` 时启用 |
| `idx_iam_gateway_api_key_tenant_user_status` | index | `tenant_id, organization_id, user_id, status, updated_at, id` |
| `idx_ai_channel_group_status` | index | `tenant_id, organization_id, group_id, status` |

安全要求：

- API Key 明文只在创建响应中返回一次，禁止落库。
- 认证热路径按 `key_hash` 查找或通过缓存查找。
- `key_prefix` 只能用于展示和排障，不可作为认证凭据。
- `last_used_ip_hash` 使用带 pepper 的 hash，pepper 不入库。
- `key_display_masked` 只能由创建或轮换时生成的脱敏值写入，不允许通过截断明文回读生成。

### 6.3 `iam_gateway_access_policy`

用途：API Key、分组、租户或组织的访问边界。

| 属性 | 值 |
| --- | --- |
| profile | tenant_entity |
| compliance_level | L3 |
| system_of_record | true |
| write_owner | access-policy-service |

业务字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string(128) | 是 | 策略名称 |
| `policy_type` | enum_int32 | 是 | api_key、group、tenant、organization |
| `subject_type` | enum_int32 | 是 | 绑定主体类型 |
| `subject_id` | int64 | 否 | 绑定主体 ID |
| `subject_ref_hash` | string(128) | 否 | IP、外部 Key、匿名主体等非 int64 主体的 hash |
| `subject_ref_masked` | string(128) | 否 | 非 int64 主体的脱敏展示 |
| `allowed_capabilities` | json | 否 | 允许能力，如 chat、responses、embedding、image、audio、video |
| `denied_capabilities` | json | 否 | 禁止能力 |
| `allowed_models` | json | 否 | 模型白名单 |
| `denied_models` | json | 否 | 模型黑名单 |
| `network_policy_mode` | enum_int32 | 否 | none、allowlist、denylist、mixed |
| `ip_rule_count` | int32 | 否 | Console/API Key 页面展示的 IP 规则数量 |
| `ip_allowlist` | json | 否 | IP 白名单 |
| `ip_denylist` | json | 否 | IP 黑名单 |
| `region_allowlist` | json | 否 | 区域白名单 |
| `max_context_tokens` | int64 | 否 | 最大上下文 |
| `data_retention_mode` | enum_int32 | 是 | none、standard、enterprise、custom |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

索引：

- `uk_iam_gateway_access_policy_uuid`
- `idx_iam_gateway_access_policy_tenant_subject_status`
- `idx_iam_gateway_access_policy_subject_ref`
- `idx_iam_gateway_access_policy_tenant_type_updated`

### 6.3.1 `iam_gateway_risk_rule`

用途：承载 Admin RateLimit 的 IP、Token、Model、Firewall 规则，以及网关运行期可命中的网络安全规则。该表是 L3 安全配置表，不保存完整 IP 明文；需要前缀或 CIDR 匹配时，通过安全服务解析 `target_value_cipher_ref`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `rule_name` | string(128) | 是 | 规则名称 |
| `rule_category` | enum_int32 | 是 | ip_limit、token_limit、model_limit、firewall、risk_control |
| `rule_type` | enum_int32 | 是 | allow、deny、limit、challenge、observe |
| `scope_type` | enum_int32 | 否 | tenant、organization、group、api_key、user、model |
| `scope_id` | int64 | 否 | 作用域 ID |
| `target_type` | enum_int32 | 是 | ip、cidr、api_key、model、country、asn、user_agent |
| `target_value_hash` | string(128) | 否 | 命中对象 hash |
| `target_value_masked` | string(128) | 否 | 后台列表脱敏展示值 |
| `target_value_cipher_ref` | string(256) | 否 | 需要匹配原值时的密文引用 |
| `match_mode` | enum_int32 | 是 | exact、prefix、cidr、regex、contains |
| `requests_per_second` | int64 | 否 | RPS 限制 |
| `requests_per_minute` | int64 | 否 | RPM 限制 |
| `requests_per_day` | int64 | 否 | RPD 限制 |
| `tokens_per_minute` | int64 | 否 | TPM 限制 |
| `burst_limit` | decimal_string | 否 | 突发额度 |
| `block_duration_seconds` | int64 | 否 | 阻断时长 |
| `priority` | int32 | 是 | 同一作用域规则优先级 |
| `hit_count` | int64 | 否 | 命中次数投影 |
| `last_hit_at` | instant | 否 | 最近命中时间 |

索引：

- `uk_iam_gateway_risk_rule_tenant_target(tenant_id, organization_id, rule_type, target_type, target_value)`
- `idx_iam_gateway_risk_rule_scope_priority(tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status)`
- `idx_iam_gateway_risk_rule_target_hash(tenant_id, organization_id, target_type, target_value_hash, status)`

### 6.4 `iam_user_preference` / `iam_user_security_setting` / `iam_user_login_event`

用途：承载 Console Settings、Console User、Console Account 的用户偏好、安全状态和登录明细。用户主档、手机号、邮箱、OAuth 绑定仍以 `plus_user`、`plus_oauth_account` 为事实来源。

| 表 | 画像 | 关键字段 | 说明 |
| --- | --- | --- | --- |
| `iam_user_preference` | user_entity | `language`、`timezone`、`theme_mode`、`notification_preferences`、`default_console_path` | 用户偏好和通知开关 |
| `iam_user_security_setting` | user_entity, L3 | `mfa_enabled`、`mfa_method`、`password_last_changed_at`、`trusted_device_count`、`last_login_at`、`last_login_ip_hash`、`third_party_bound_snapshot` | 安全状态投影，不保存密码明文 |
| `iam_user_login_event` | event_log, L3 | `auth_method`、`auth_provider`、`login_result`、`risk_level`、`client_ip_hash`、`client_ip_masked`、`client_ip_region`、`device_label`、`mfa_verified`、`session_id_hash`、`occurred_at` | 登录事件事实，和 `ops_audit_log` 的后台操作审计分离 |

安全要求：

- 登录事件按 `occurred_at` 分区，在线保留 180 天，归档保留 3 年。
- IP、设备指纹、session ID 只保存 hash 或脱敏标签。
- OAuth refresh token、MFA secret 不进入这些表，只保存安全服务或密钥托管系统中的引用状态。

### 6.5 统一数据领域名称：`ModelVendor`

`ModelVendor` 是模型厂家/模型原厂的统一领域名称，表示模型的原始研发、发布或维护方。它解决前端、Java、Rust、TypeScript、OpenAPI 和数据库之间对“厂家、供应商、渠道、平台”混用的问题。

标准职责边界：

| 名称 | 事实来源 | 含义 | 示例 |
| --- | --- | --- | --- |
| `ModelVendor` | `ai_model_vendor.vendor_code` | 模型原始厂家/发布方 | `openai`、`anthropic`、`google`、`deepseek`、`alibaba`、`moonshot` |
| `Provider` | `integration_provider.provider_code` | API 接入供应商、协议适配方或聚合网关 | `openai_api`、`azure_openai`、`openrouter`、`ollama`、`aws_bedrock` |
| `Channel` | `ai_channel.channel_code` | 租户/组织可路由的具体接入实例 | 某个 Azure region、某个 OpenRouter 账号、某个本地 Ollama 节点 |
| `AiModel` | `ai_model.model` | `/v1/*` 对外暴露的标准模型名 | `gpt-4.1`、`claude-3-5-sonnet`、`deepseek-chat` |

跨语言类型规则：

- 数据库存储 `vendor_code` 稳定字符串，严禁保存 enum ordinal。
- Java 使用 `ModelVendor` 枚举，建议常量形态为 `OPENAI`、`ANTHROPIC`、`ALIBABA_QWEN`，每个枚举持有稳定 code。
- Rust 使用 `enum ModelVendor`，建议变体形态为 `OpenAi`、`Anthropic`、`AlibabaQwen`，序列化为同一套稳定 code。
- TypeScript/OpenAPI 使用生成的 `ModelVendor` enum 或字符串字面量联合类型。
- 未识别的新厂家必须保留原始 `vendor_code`，SDK 可映射到 `UNKNOWN`，不得拒绝读取历史数据。

## 7. Integration 核心契约

### 7.1 `integration_provider`

用途：API 接入供应商注册表，例如 OpenAI API、Azure OpenAI、Anthropic API、Gemini API、OpenRouter、Ollama、本地模型网关等。该表不作为模型厂家事实来源；模型厂家统一进入 `ai_model_vendor`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `provider_code` | string(64) | 是 | 全局唯一编码 |
| `display_name` | string(128) | 是 | 展示名称 |
| `description` | string(512) | 否 | Provider 说明，用于模型页和 Admin Model |
| `icon_media_resource_id` | string(128) | 否 | Provider 图标媒体资源稳定 ID |
| `icon_object_blob_id` | int64 | 否 | Provider 图标对象存储 Blob |
| `icon_resource_snapshot` | json | 否 | Provider 图标 `MediaResource` 快照 |
| `color_token` | string(64) | 否 | 前端稳定色值 token，不存 CSS class |
| `docs_url` | string(512) | 否 | 官方文档地址 |
| `website_url` | string(512) | 否 | Provider 官网 |
| `default_vendor_code` | string(64) | 否 | 默认模型厂家编码；聚合 Provider 可为空或通过模型映射确定 |
| `integration_type` | enum_int32 | 是 | model_vendor_direct、cloud_platform、relay_aggregator、self_hosted_gateway、local_runtime、custom、unknown |
| `protocol` | enum_int32 | 是 | openai_compatible、anthropic、gemini、azure_openai、custom |
| `base_url` | string(512) | 否 | 默认 base URL，不含 secret |
| `auth_type` | enum_int32 | 是 | api_key、oauth2、bearer、none、custom |
| `capabilities` | json | 是 | 支持能力集合 |
| `metadata_schema_version` | string(32) | 是 | metadata schema 版本 |
| `sort_order` | int32 | 否 | 门户和后台默认排序 |
| `metadata` | json | 否 | 扩展元数据 |

约束：

- `uk_integration_provider_code(provider_code)`
- `idx_integration_provider_status_updated(status, updated_at, id)`

说明：`provider_code` 解决“怎么接入”的问题，`vendor_code` 解决“模型是谁发布的”的问题。OpenRouter、Azure、AWS Bedrock、GCP Vertex AI 这类平台通常是 `Provider`，不是 `ModelVendor`；它们托管的模型通过资源目录、Vendor 关系和模型映射规则标明原厂，不能把账号直接绑定到模型。

### 7.2 `ai_channel`

用途：可被路由策略选择的渠道实例。渠道是租户/组织可见的 Provider 接入配置，不保存具体 secret。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `provider_id` | int64 | 是 | `integration_provider.id` |
| `provider_code` | string(64) | 是 | Provider code 快照 |
| `channel_code` | string(64) | 是 | 租户内唯一渠道编码 |
| `name` | string(128) | 是 | 渠道名称 |
| `protocol` | enum_int32 | 是 | OpenAI、Anthropic、Gemini、Ollama、Custom 等协议 |
| `access_type` | enum_int32 | 是 | api_key、oauth-gcp、aws-bedrock、azure-ad、claude-code 等接入类型 |
| `base_url` | string(512) | 否 | 渠道级 base URL，不保存密钥 |
| `model_mode` | enum_int32 | 否 | whitelist、mapping、pass_through、mixed |
| `environment` | enum_int32 | 是 | prod、staging、dev |
| `region` | string(64) | 否 | 区域 |
| `capabilities` | json | 否 | text、image、audio、video、music 等能力快照 |
| `priority` | int32 | 是 | 默认优先级 |
| `weight` | int32 | 是 | 默认权重 |
| `account_id` | int64 | 否 | 默认 Provider 账号 |
| `proxy_id` | int64 | 否 | 默认代理 |
| `rpm_limit` | int64 | 否 | 渠道级每分钟请求上限 |
| `timeout_ms` | int32 | 是 | 请求超时 |
| `retry_policy` | json | 否 | 重试策略 |
| `circuit_breaker_policy` | json | 否 | 熔断策略 |
| `health_status` | enum_int32 | 否 | 最近健康状态快照 |
| `last_latency_ms` | int32 | 否 | 最近延迟快照 |
| `consecutive_error_count` | int64 | 否 | 连续错误次数 |

约束和索引：

- `uk_ai_channel_uuid(uuid)`
- `uk_ai_channel_tenant_code(tenant_id, organization_id, channel_code)`
- `idx_ai_channel_tenant_provider_status(tenant_id, organization_id, provider_code, status)`

### 7.3 `integration_provider_account`

用途：上游 Provider 账号和密钥引用，L3 高敏表。它替代在渠道 JSON 中直接保存密钥的做法。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `provider_id` | int64 | 是 | Provider ID |
| `provider_code` | string(64) | 是 | Provider code 快照 |
| `account_code` | string(64) | 是 | 租户内账号编码 |
| `account_name` | string(128) | 是 | 账号显示名 |
| `auth_type` | enum_int32 | 是 | api_key、oauth2、bearer、custom |
| `credential_profile` | enum_int32 | 否 | standard_api_key、gcp_service_account、aws_sigv4、azure_ad、setup_token |
| `external_account_id` | string(128) | 否 | 上游账号、项目或订阅 ID |
| `auth_config` | json | 否 | 非密钥认证配置，如 Azure deployment、GCP project/location |
| `secret_ref` | string(256) | 是 | Vault/Keychain/KMS 引用 |
| `secret_hash` | string(128) | 是 | 密钥摘要，用于去重和轮换校验 |
| `secret_version` | int64 | 是 | 当前密钥版本 |
| `secret_rotation_policy` | json | 否 | 轮换周期、审批、灰度策略 |
| `masked_label` | string(128) | 是 | 脱敏展示标签 |
| `quota_unit` | enum_int32 | 否 | 上游额度单位 |
| `quota_limit` | decimal_string | 否 | 上游额度上限，API 字符串 |
| `quota_used` | decimal_string | 否 | 上游额度使用快照，不作为账务事实 |
| `upstream_balance_amount` | decimal_string | 否 | 上游账号余额快照，不作为本系统资金事实 |
| `upstream_balance_currency` | string(10) | 否 | 上游余额币种 |
| `last_balance_checked_at` | instant | 否 | 最近余额同步时间 |
| `last_rotated_at` | instant | 否 | 最近轮换 |
| `next_rotate_at` | instant | 否 | 建议下次轮换 |
| `last_verified_at` | instant | 否 | 最近校验 |
| `last_used_at` | instant | 否 | 最近被渠道调用时间 |
| `consecutive_error_count` | int64 | 否 | 连续验证或调用错误次数 |
| `risk_level` | enum_int32 | 否 | 风险等级 |

约束和索引：

- `uk_integration_provider_account_uuid(uuid)`
- `uk_integration_provider_account_tenant_code(tenant_id, organization_id, provider_code, account_code)`
- `uk_integration_provider_account_secret_hash(tenant_id, organization_id, provider_code, secret_hash)`
- `idx_integration_provider_account_tenant_provider_status(tenant_id, organization_id, provider_code, status)`
- `idx_integration_provider_account_rotation(tenant_id, organization_id, next_rotate_at, status)`

安全要求：

- 不保存 API key、OAuth refresh token、私钥明文。
- `secret_ref` 对用户面 API 不返回；后台默认也只返回脱敏路径。
- 轮换操作必须写 `ops_audit_log`。

### 7.4 `ai_channel_credential`

用途：渠道可用的认证入口，保存 base URL、认证方式配置和 secret 引用。它是路由热路径读取上游认证信息的事实来源，不承载模型白名单。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `channel_id` | int64 | 是 | 渠道 |
| `provider_code` | string(64) | 否 | Provider code 快照 |
| `channel_code` | string(64) | 否 | 渠道编码快照 |
| `credential_name` | string(128) | 是 | 凭证显示名 |
| `base_url` | string(512) | 是 | 上游 base URL |
| `auth_config` | json | 是 | API Key、OAuth、云账号等非明文认证配置 |
| `credential_ref` | string(256) | 是 | Vault/Keychain/KMS 引用 |
| `credential_hash` | string(128) | 是 | 凭证摘要，用于去重和轮换校验 |
| `masked_label` | string(128) | 否 | 脱敏展示标签 |
| `priority` | int32 | 是 | 凭证级优先级 |
| `weight` | int32 | 是 | 凭证级权重 |
| `health_status` | enum_int32 | 是 | 最近健康状态 |
| `last_latency_ms` | int32 | 否 | 最近延迟 |
| `consecutive_error_count` | int64 | 是 | 连续错误次数 |
| `last_verified_at` | instant | 否 | 最近验证时间 |
| `last_used_at` | instant | 否 | 最近使用时间 |

约束：

- `uk_ai_channel_credential_uuid(uuid)`
- `idx_ai_channel_credential_channel(tenant_id, organization_id, channel_id, status, priority, weight, id)`
- `idx_ai_channel_credential_ref(tenant_id, organization_id, credential_ref)`

### 7.5 `ai_channel_resource`

用途：渠道支持哪些资源、资源分组和能力范围。路由按 API 路径、模型参数、资源分组和 Vendor 能力筛选账号时读取该表；账号不直接绑定模型。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `channel_id` | int64 | 是 | 渠道 |
| `provider_code` | string(64) | 否 | Provider code 快照 |
| `channel_code` | string(64) | 否 | 渠道编码快照 |
| `resource_id` | int64 | 否 | `ai_resource.id` |
| `resource_code` | string(192) | 否 | 资源编码，如模型、API、图片、视频、音频、音乐、音效资源 |
| `resource_group_id` | int64 | 否 | `ai_resource_group.id` |
| `resource_group_code` | string(128) | 否 | 资源分组编码，如 OpenAI Chat API、Kling 视频 API |
| `grant_type` | string(32) | 是 | allow/deny |
| `priority` | int32 | 是 | 资源授权优先级 |
| `weight` | int32 | 是 | 资源授权权重 |
| `effective_from` | instant | 否 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

约束：

- `uk_ai_channel_resource_uuid(uuid)`
- `uk_ai_channel_resource(tenant_id, organization_id, channel_id, resource_code, resource_group_code)`
- `idx_ai_channel_resource_lookup(tenant_id, organization_id, status, channel_id, grant_type, priority, id)`

### 7.6 `ai_model_mapping_rule*`

用途：模型映射规则分为全局、Vendor、账号/渠道自定义三层，解决请求模型名到上游目标模型名的转换。优先级从高到低为自定义绑定、Vendor 绑定、全局绑定；没有命中时使用资源目录中的原生模型名。

- `ai_model_mapping_rule` 保存规则头，包括 source/target vendor、匹配方式、映射模式和启用状态。
- `ai_model_mapping_rule_item` 保存源模型、目标模型、目标 catalog key、目标 provider native model 等具体映射项。
- `ai_model_mapping_rule_binding` 保存规则绑定范围，包括 global、vendor、channel、channel_group、account 等，后台自定义映射通过绑定覆盖默认规则。

### 7.7 `integration_proxy`

用途：代理配置。代理凭证不入库，只保存引用。

关键字段：`proxy_code`、`proxy_type`、`endpoint`、`secret_ref`、`secret_hash`、`region`、`health_status`、`last_checked_at`、`description`。

索引：

- `uk_integration_proxy_tenant_code(tenant_id, organization_id, proxy_code)`
- `idx_integration_proxy_tenant_status_region(tenant_id, organization_id, status, region)`

## 8. AI 核心契约

### 8.0 `ai_model_vendor`

用途：模型厂家字典，是 `ModelVendor` 领域的数据库事实来源。它保存模型原厂/发布方的稳定编码、展示信息、官网文档、图标、能力族和排序，不保存 API 接入账号、base URL 或密钥。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `vendor_code` | string(64) | 是 | `ModelVendor` 稳定编码，跨 Java/Rust/TypeScript/OpenAPI 统一 |
| `display_name` | string(128) | 是 | 展示名称 |
| `legal_name` | string(256) | 否 | 法务主体名称 |
| `description` | string(512) | 否 | 厂家说明 |
| `website_url` | string(512) | 否 | 官网 |
| `docs_url` | string(512) | 否 | 模型或 API 文档入口 |
| `logo_media_resource_id` | string(128) | 否 | 品牌 logo 媒体资源稳定 ID |
| `logo_object_blob_id` | int64 | 否 | 品牌 logo 对象存储 Blob |
| `logo_resource_snapshot` | json | 否 | 品牌 logo `MediaResource` 快照 |
| `icon_media_resource_id` | string(128) | 否 | 小图标媒体资源稳定 ID |
| `icon_object_blob_id` | int64 | 否 | 小图标对象存储 Blob |
| `icon_resource_snapshot` | json | 否 | 小图标 `MediaResource` 快照 |
| `color_token` | string(64) | 否 | 前端稳定色值 token |
| `country_region` | string(64) | 否 | 国家/地区 |
| `vendor_type` | enum_int32 | 是 | company、cloud、open_source、community、custom、unknown |
| `model_families` | json | 否 | 主要模型族，如 GPT、Claude、Gemini、Qwen |
| `capabilities` | json | 否 | 厂家级能力集合 |
| `open_source` | bool | 是 | 是否开源/社区主导 |
| `sort_order` | int32 | 否 | 展示排序 |

约束：

- `uk_ai_model_vendor_code(vendor_code)`
- `idx_ai_model_vendor_status_sort(status, sort_order, id)`

枚举种子应来自 Schema Registry 的 `domain_names.model_vendor.builtin_values`。Java/Rust/TypeScript 代码生成时只把内置值生成成枚举常量；数据库仍允许保留新增厂家 code，以支持前向兼容。

### 8.1 `ai_model_family`

用途：模型族字典，表示某个厂家下的一组模型系列，例如 GPT、Claude、Gemini、Qwen、Llama、DeepSeek、Suno。它把 `ai_model_vendor.model_families` 中的展示快照提升为可检索、可排序、可治理的一等主数据。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `vendor_id` | int64 | 否 | `ai_model_vendor.id` |
| `vendor_code` | string(64) | 是 | `ModelVendor` 稳定编码 |
| `family_code` | string(64) | 是 | 厂家内唯一模型族编码 |
| `display_name` | string(128) | 是 | 展示名称 |
| `description` | string(512) | 否 | 模型族说明 |
| `docs_url` | string(512) | 否 | 模型族文档 |
| `icon_media_resource_id` | string(128) | 否 | 图标媒体资源稳定 ID |
| `icon_object_blob_id` | int64 | 否 | 图标对象存储 Blob |
| `icon_resource_snapshot` | json | 否 | 图标 `MediaResource` 快照 |
| `color_token` | string(64) | 否 | 展示色 token |
| `family_type` | enum_int32 | 是 | foundation、reasoning、vision、image、video、audio、music、embedding、moderation |
| `primary_modality` | enum_int32 | 是 | 主模态 |
| `model_count` | int64 | 否 | 可重算模型数量投影 |
| `default_model_id` | int64 | 否 | 默认推荐模型 |
| `default_model` | string(128) | 否 | 默认推荐模型名快照 |
| `sort_order` | int32 | 否 | 展示排序 |

约束：

- `uk_ai_model_family_vendor_code(vendor_code, family_code)`
- `idx_ai_model_family_vendor_status_sort(vendor_code, status, sort_order, id)`

### 8.2 `ai_model`

用途：网关对外模型目录。它是 Provider independent model，不等同于某个供应商的模型 ID。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `model` | string(128) | 是 | OpenAI 兼容 API 中的 `model` |
| `display_name` | string(128) | 是 | 展示名称 |
| `vendor_id` | int64 | 否 | `ai_model_vendor.id` |
| `vendor_code` | string(64) | 是 | `ModelVendor` 稳定编码 |
| `vendor_name_snapshot` | string(128) | 否 | 模型厂家展示名快照 |
| `family_id` | int64 | 否 | `ai_model_family.id` |
| `family_code` | string(64) | 否 | 模型族编码 |
| `provider_hint` | string(64) | 否 | 兼容字段，只作默认接入提示；不得替代 `vendor_code` |
| `model_family` | string(128) | 否 | 模型族 |
| `model_version` | string(64) | 否 | 厂家版本号或发布日期编码 |
| `model_aliases` | json | 否 | 别名和兼容模型名 |
| `capability` | enum_int32 | 是 | chat、responses、embedding、image、audio、video、moderation |
| `modalities` | json | 是 | input/output 模态 |
| `icon_media_resource_id` | string(128) | 否 | 展示图标媒体资源稳定 ID |
| `icon_object_blob_id` | int64 | 否 | 展示图标对象存储 Blob |
| `icon_resource_snapshot` | json | 否 | 展示图标 `MediaResource` 快照 |
| `color_token` | string(64) | 否 | 前端图表颜色 token |
| `docs_url` | string(1024) | 否 | 官方文档链接 |
| `license_type` | enum_int32 | 否 | open-source、proprietary、custom |
| `api_format` | string(128) | 否 | Chat Completions、Responses、Anthropic Messages 等展示格式 |
| `capability_intro` | text | 否 | 详情页能力介绍 |
| `limitations` | json | 否 | 限制说明 |
| `supported_languages` | json | 否 | 支持语言 |
| `use_cases` | json | 否 | 使用场景 |
| `training_data_cutoff` | string(128) | 否 | 训练数据截止说明 |
| `context_tokens` | int64 | 否 | 上下文窗口 |
| `max_input_tokens` | int64 | 否 | 最大输入 |
| `max_output_tokens` | int64 | 否 | 最大输出 |
| `max_duration_seconds` | int32 | 否 | 视频、音频、音乐等时长上限 |
| `supports_streaming` | bool | 是 | 流式 |
| `supports_tools` | bool | 是 | 工具调用 |
| `supports_json_schema` | bool | 是 | 结构化输出 |
| `performance_profile` | json | 否 | latency、throughput、ttft 等展示和排序快照 |
| `default_pricing_id` | int64 | 否 | 默认价格 |
| `rank_score` | decimal_string | 否 | 排名/推荐得分 |
| `release_stage` | enum_int32 | 是 | beta、ga、deprecated |
| `deprecated_at` | instant | 否 | 下线时间 |

约束：

- `uk_ai_model_model(model)`
- `idx_ai_model_vendor_status(vendor_code, status, updated_at, id)`
- `idx_ai_model_family_status(vendor_code, family_code, status, updated_at, id)`
- `idx_ai_model_capability_status(capability, status, updated_at, id)`

### 8.3 `ai_model_capability`

用途：模型能力明细表。`ai_model` 保存列表和热路径需要的能力摘要，`ai_model_capability` 保存可扩展的能力、模态、端点格式、参数 schema 和限制值，用于模型详情、Playground 参数面板、SDK 文档和路由能力匹配。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `model_id` | int64 | 是 | `ai_model.id` |
| `model` | string(128) | 是 | 模型名快照 |
| `vendor_code` | string(64) | 是 | `ModelVendor` 稳定编码 |
| `capability` | enum_int32 | 是 | chat、responses、embedding、image、audio、video、music、moderation |
| `capability_code` | string(64) | 是 | 稳定能力编码，例如 `json_schema`、`tool_calling`、`vision_input` |
| `modality` | enum_int32 | 是 | 主模态 |
| `input_modalities` | json | 否 | 输入模态集合 |
| `output_modalities` | json | 否 | 输出模态集合 |
| `endpoint_formats` | json | 否 | openai_chat、openai_responses、anthropic_messages、gemini 等兼容端点 |
| `parameter_name` | string(128) | 否 | 参数名；能力行可为空，参数行必填 |
| `parameter_schema` | json | 否 | 参数 JSON Schema |
| `supported` | bool | 是 | 是否支持 |
| `limit_unit` | string(64) | 否 | token、second、image、request 等限制单位 |
| `limit_value` | string(128) | 否 | 限制值，保留字符串以兼容 `128k`、`2M`、`4min` |
| `schema_version` | string(32) | 是 | 参数 schema 版本 |
| `sort_order` | int32 | 否 | 参数和能力展示排序 |
| `description` | string(512) | 否 | 说明 |

约束：

- `uk_ai_model_capability_model_code(model_id, capability_code, modality, parameter_name)`
- `idx_ai_model_capability_vendor_capability(tenant_id, organization_id, vendor_code, capability, supported, id)`

#### 8.3.1 `ai_billing_meter`

用途：统一计费计量表，定义“什么东西可以被计费”。模型价格、定价规则、阶梯和用量事实都引用 `meter_code`，避免把计费方式写死为 token、image 或 request。新增语音、视频、图片、音乐、音效、API 结果、API 条目、工具调用、存储、流量等计费形态时，只需要新增 meter 和规则，不需要改 `ai_usage_fact` 主结构。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `meter_code` | string(64) | 是 | 稳定编码，例如 `llm_input_token`、`image_result`、`audio_output_second`、`api_result` |
| `display_name` | string(128) | 是 | 展示名称 |
| `description` | string(512) | 否 | 说明 |
| `modality` | enum_int32 | 是 | text、image、video、audio、music、sfx、api、storage、network |
| `usage_type` | enum_int32 | 是 | chat、embedding、image、audio、video、music、sfx、tool、api |
| `billing_mode` | enum_int32 | 是 | token、per_request、per_result、per_item、duration、character、storage、bandwidth |
| `default_unit` | enum_int32 | 是 | token、1k_token、1m_token、request、result、item、second、character、gb_day、gb |
| `default_unit_size` | decimal_string | 是 | 默认单位大小 |
| `quantity_precision` | int32 | 是 | 数量精度 |
| `quantity_source` | enum_int32 | 是 | usage_field、response_field、request_field、provider_usage、expression、manual |
| `aggregation_mode` | enum_int32 | 是 | sum、max、min、last、distinct_count |
| `result_selector` | string(256) | 否 | 从响应或 usage payload 取结果数的选择器 |
| `supports_tier` | bool | 是 | 是否支持阶梯 |
| `supports_expression` | bool | 是 | 是否支持表达式 |
| `allow_negative_quantity` | bool | 是 | 是否允许抵扣类负数量 |
| `canonical_price_item_type` | enum_int32 | 是 | 默认价格项 |
| `sort_order` | int32 | 否 | 展示排序 |

内置 meter 至少包括：

| 领域 | meter 示例 |
| --- | --- |
| LLM | `llm_input_token`、`llm_output_token`、`llm_cache_read_token`、`llm_cache_write_token`、`tool_call` |
| Embedding | `embedding_input_token` |
| 图片 | `image_input_token`、`image_result`、`image_pixel` |
| 语音/音频 | `audio_input_second`、`audio_output_second`、`speech_character` |
| 视频/音乐/音效 | `video_input_second`、`video_output_second`、`music_output_second`、`sfx_result` |
| 通用 API | `api_request`、`api_result`、`api_item` |
| 资源型 | `storage_gb_day`、`bandwidth_gb` |

### 8.4 `ai_model_pricing`

用途：模型价格簿。新表必须使用 decimal，不允许 float/double。它用 `price_side` 区分官方参考价、供应商上游成本价、客户销售价和内部结算价，用 `pricing_scope` 表示 global、tenant、organization、sku、channel_group、provider、channel 等生效范围。一个 `ai_model` 可以有多条 `upstream_cost` 价格，对应不同 `provider_code/channel_id/provider_model`；也可以有多条 `customer_charge` 价格，对应不同定价方案、租户或 SKU。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `model_id` | int64 | 是 | `ai_model.id` |
| `model` | string(128) | 是 | 模型快照 |
| `vendor_code` | string(64) | 是 | `ModelVendor` 稳定编码 |
| `provider_code` | string(64) | 否 | 上游 Provider 或销售渠道编码 |
| `channel_id` | int64 | 否 | 渠道级价格时关联 `ai_channel.id` |
| `provider_model` | string(128) | 否 | 上游模型名快照 |
| `platform_code` | string(64) | 否 | sub2api 式平台维度，例如 anthropic、openai、gemini |
| `service_tier` | string(64) | 否 | default、priority、flex 等服务层级 |
| `price_side` | enum_int32 | 是 | official_reference、upstream_cost、customer_charge、internal_transfer |
| `pricing_scope` | enum_int32 | 是 | global、tenant、organization、sku、channel_group、provider、channel |
| `pricing_scope_id` | int64 | 否 | scope 对象 ID |
| `pricing_plan_id` | int64 | 否 | `customer_charge` 价格所属定价方案 |
| `pricing_plan_code` | string(64) | 否 | 定价方案编码快照 |
| `billing_type` | enum_int32 | 是 | token、request、duration、image、video、audio、result、item、storage、bandwidth |
| `billing_mode` | enum_int32 | 是 | token、fixed_price、per_request、per_result、per_item、duration、character、storage、bandwidth、tiered、expression、image、audio、video |
| `billing_meter_id` | int64 | 否 | `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 是 | 计量编码，例如 `llm_input_token`、`api_result` |
| `price_item_type` | enum_int32 | 是 | input、cached_input、output、request、duration 等 |
| `unit` | enum_int32 | 是 | token、1k_token、1m_token、request、second、minute、image |
| `unit_size` | decimal_string | 是 | 单位大小 |
| `metering_mode` | enum_int32 | 是 | direct、computed、provider_reported、estimated、manual_adjustment |
| `quantity_source` | enum_int32 | 是 | usage_field、response_field、request_field、provider_usage、expression |
| `quantity_formula` | text | 否 | 计量数量表达式，必须受白名单限制 |
| `result_selector` | string(256) | 否 | 按结果/个数计费时从响应中取数量的选择器 |
| `minimum_quantity` | decimal_string | 否 | 最小计费数量 |
| `quantity_step` | decimal_string | 否 | 数量进位步长 |
| `included_quantity` | decimal_string | 否 | 免费包含数量 |
| `unit_price` | decimal_string | 是 | 单价 |
| `currency` | string(10) | 是 | 币种 |
| `rounding_mode` | enum_int32 | 是 | half_up、half_even、ceil、floor |
| `min_charge_amount` | decimal_string | 否 | 最小计费金额 |
| `reference_price_id` | int64 | 否 | 派生价引用的 `ai_model_pricing.id` |
| `reference_price_side` | enum_int32 | 否 | official_reference、upstream_cost 等参考价侧 |
| `reference_multiplier` | decimal_string | 否 | 参考价倍率 |
| `markup_amount` | decimal_string | 否 | 参考价基础上的固定加价 |
| `pricing_formula_mode` | enum_int32 | 否 | fixed、multiplier、multiplier_plus_offset、tiered、expression |
| `price_origin` | enum_int32 | 是 | official_import、provider_sync、manual、derived、fallback |
| `import_snapshot_id` | int64 | 否 | `ai_pricing_import_snapshot.id` |
| `priority` | int32 | 否 | 多条价格命中时的优先级 |
| `region` | string(64) | 否 | 价格区域 |
| `price_version` | string(64) | 否 | 价格版本 |
| `source_url` | string(512) | 否 | 官方或供应商价格来源 |
| `source_hash` | string(128) | 否 | 来源内容 hash |
| `published_at` | instant | 否 | 厂家/供应商发布时间 |
| `observed_at` | instant | 否 | 本系统采集时间 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |
| `source_price_id` | int64 | 否 | 可关联 `legacy_model_price.id` |

约束：

- `uk_ai_model_pricing_uuid(uuid)`
- `idx_ai_model_pricing_lookup(tenant_id, organization_id, model, price_side, pricing_scope, pricing_scope_id, billing_mode, billing_meter_code, status, effective_from, effective_to)`
- `idx_ai_model_pricing_vendor_model(tenant_id, organization_id, vendor_code, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_provider_channel(tenant_id, organization_id, provider_code, channel_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_plan_effective(tenant_id, organization_id, pricing_plan_id, model, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_meter_effective(tenant_id, organization_id, billing_meter_code, price_side, status, effective_from, id)`
- `idx_ai_model_pricing_model_status(tenant_id, organization_id, model_id, status)`

模型目录保存链路：

| 问题 | 主表 | 查询/约束 |
| --- | --- | --- |
| 每个厂家有哪些模型族 | `ai_model_family` | `vendor_code + status + sort_order` |
| 每个厂家有哪些模型 | `ai_model` | `vendor_code + status`，需要按系列筛选时加 `family_code` |
| 某模型有哪些能力 | `ai_model_capability` | `model_id` 或 `vendor_code + capability + supported` |
| 某模型面向用户如何计费 | `ai_model_pricing` | `model + price_side=customer_charge + pricing_scope` |
| 某 Provider/Channel 的上游成本 | `ai_model_pricing` | `model + price_side=upstream_cost + provider_code/channel_id` |
| 某模型可通过哪些渠道调用 | `ai_channel_resource` + `ai_resource` | `resource_code/resource_group_code + vendor_code` |

价格使用规则：

- 门户模型页展示默认读 `price_side=customer_charge`，没有销售价时可回退到 `official_reference`，但必须在 DTO 中标记来源。
- 路由成本优化只读 `price_side=upstream_cost`，不能直接使用客户销售价。
- 账务结算以请求完成时写入 `ai_usage_fact.pricing_snapshot` 的价格快照为准，不回查当前价格表重算历史账单。

#### 8.4.1 `ai_pricing_plan`

用途：定价方案主表。它不是用户组，也不是 API Key 分组本身，而是“如何从参考价计算销售价”的策略集合。`ai_channel_group` 是创建 API Key 时选择的业务分组事实来源，可以直接挂默认 `pricing_plan_id`；更复杂场景通过 `ai_pricing_plan_binding` 把定价方案绑定到用户、VIP、SKU、租户或单个 API Key。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `plan_code` | string(64) | 是 | 租户内稳定编码，例如 default、vip、enterprise |
| `plan_name` | string(128) | 是 | 展示名称 |
| `description` | string(512) | 否 | 说明 |
| `plan_scope` | enum_int32 | 是 | global、tenant、organization、channel_group、api_key、vip、sku、user |
| `base_price_side` | enum_int32 | 是 | 默认参考价侧，通常为 official_reference |
| `base_pricing_scope` | enum_int32 | 否 | 默认参考价 scope |
| `default_reference_price_id` | int64 | 否 | 可指定默认参考价格 |
| `default_multiplier` | decimal_string | 是 | 默认参考价倍率，吸收 new-api `GroupRatio` 和 sub2api `groups.rate_multiplier` |
| `default_markup_amount` | decimal_string | 否 | 默认固定加价 |
| `currency` | string(10) | 是 | 默认币种 |
| `billing_mode` | enum_int32 | 是 | token、fixed_price、per_request、tiered、expression 等 |
| `rounding_mode` | enum_int32 | 是 | 金额取整模式 |
| `min_charge_amount` | decimal_string | 否 | 最小计费金额 |
| `fallback_mode` | enum_int32 | 是 | missing_as_official、missing_as_cost、deny、free、manual_review |
| `priority` | int32 | 是 | 多分组命中时优先级 |
| `price_version` | string(64) | 否 | 分组价格版本 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

约束：

- `uk_ai_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`
- `idx_ai_pricing_plan_scope_status(tenant_id, organization_id, plan_scope, status, priority, id)`
- `idx_ai_pricing_plan_effective(tenant_id, organization_id, status, effective_from, effective_to, id)`

#### 8.4.2 `ai_pricing_plan_binding`

用途：定价方案绑定表，解决 sub2api 中 API Key 绑定 group、account 绑定 group、用户专属 group rate 的需求，同时避免修改 `plus_user`、`plus_vip_user`、`plus_account` 等存量事实表。业务分组关系仍由 `iam_gateway_api_key.channel_group_id` 和 `ai_channel_group` 表达；该表只处理“某个主体临时或专属使用哪套定价方案”。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pricing_plan_id` | int64 | 是 | `ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 是 | 定价方案编码快照 |
| `subject_type` | enum_int32 | 是 | tenant、organization、channel_group、api_key、user、vip_level、sku、account |
| `subject_id` | int64 | 是 | 主体 ID；用户、VIP、账户等引用既有 `plus_*` 表 |
| `subject_code` | string(128) | 否 | 主体编码或快照 |
| `binding_source` | enum_int32 | 是 | manual、vip、package、promotion、migration、api |
| `multiplier_override` | decimal_string | 否 | 主体专属倍率，吸收 sub2api `user_group_rate_multipliers.rate_multiplier` |
| `rpm_override` | int64 | 否 | 主体专属 RPM 覆盖 |
| `tpm_override` | int64 | 否 | 主体专属 TPM 覆盖 |
| `quota_policy_id` | int64 | 否 | 可绑定 `ai_quota_policy.id` |
| `priority` | int32 | 是 | 多绑定命中时优先级 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

约束：

- `uk_ai_pricing_plan_binding_subject(tenant_id, organization_id, subject_type, subject_id, pricing_plan_id)`
- `idx_ai_pricing_plan_binding_subject_effective(tenant_id, organization_id, subject_type, subject_id, status, effective_from, id)`
- `idx_ai_pricing_plan_binding_plan(tenant_id, organization_id, pricing_plan_id, status, priority, id)`

#### 8.4.3 `ai_pricing_rule`

用途：定价方案下的规则表。它把 new-api 的 `ModelRatio`、`ModelPrice`、`CompletionRatio`、`CacheRatio`、`GroupGroupRatio` 和 sub2api 的 channel model pricing 统一成可审计、可索引、可版本化的行模型。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pricing_plan_id` | int64 | 是 | 所属定价方案 |
| `pricing_plan_code` | string(64) | 是 | 定价方案编码快照 |
| `rule_code` | string(64) | 是 | 租户内规则编码 |
| `rule_name` | string(128) | 是 | 规则名称 |
| `match_type` | enum_int32 | 是 | wildcard、vendor、family、model、provider、channel、capability、meter、price_item |
| `vendor_code`、`family_code`、`model_id`、`model` | mixed | 否 | 模型厂家、模型族和模型匹配条件 |
| `provider_code`、`channel_id`、`provider_model` | mixed | 否 | 供应商、渠道和上游模型匹配条件 |
| `capability_code`、`platform_code`、`service_tier`、`region` | mixed | 否 | 能力、平台、服务层级和区域条件 |
| `price_side` | enum_int32 | 是 | 规则生成的价格侧，通常为 customer_charge |
| `reference_price_side` | enum_int32 | 是 | 参考价侧，通常为 official_reference 或 upstream_cost |
| `reference_pricing_id` | int64 | 否 | 指定参考价格行 |
| `reference_pricing_scope` | enum_int32 | 否 | 参考价格 scope |
| `price_item_type` | enum_int32 | 是 | input、output、cache_read、cache_write、request、result、item、image、audio、video、storage |
| `billing_type` | enum_int32 | 是 | token、request、duration、count、result、item、character、storage、bandwidth |
| `billing_mode` | enum_int32 | 是 | token、fixed_price、per_request、per_result、per_item、duration、character、storage、bandwidth、tiered、expression |
| `billing_meter_id` | int64 | 否 | `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 是 | 规则命中的计量表编码 |
| `unit`、`unit_size` | mixed | 是 | 计费单位 |
| `metering_mode` | enum_int32 | 是 | direct、computed、provider_reported、estimated、manual_adjustment |
| `quantity_source` | enum_int32 | 是 | usage_field、response_field、request_field、provider_usage、expression |
| `quantity_formula` | text | 否 | 计量数量表达式 |
| `result_selector` | string(256) | 否 | 结果/个数计费数量选择器 |
| `minimum_quantity` | decimal_string | 否 | 最小计费数量 |
| `quantity_step` | decimal_string | 否 | 进位步长 |
| `included_quantity` | decimal_string | 否 | 免费包含数量 |
| `formula_mode` | enum_int32 | 是 | fixed、multiplier、multiplier_plus_offset、tiered、expression |
| `multiplier` | decimal_string | 否 | 参考价倍率 |
| `markup_amount` | decimal_string | 否 | 固定加价 |
| `unit_price_override` | decimal_string | 否 | 固定单价覆盖 |
| `expression` | text | 否 | 表达式计费，必须受白名单函数和 sandbox 限制 |
| `expression_hash` | string(128) | 否 | 表达式 hash |
| `fallback_mode` | enum_int32 | 是 | 缺价处理策略 |
| `priority` | int32 | 是 | 命中优先级 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

#### 8.4.4 `ai_pricing_tier`

用途：价格阶梯和区间表。它吸收 sub2api `channel_pricing_intervals` 的优点，同时支持 token 上下文长度、按次、按结果、按个数、图片尺寸、音频时长、视频时长、字符数、存储量、流量和表达式 tier label。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pricing_rule_id` | int64 | 否 | 所属 `ai_pricing_rule.id` |
| `model_pricing_id` | int64 | 否 | 直接挂在 `ai_model_pricing.id` 的区间 |
| `tier_code` | string(64) | 是 | 层级编码 |
| `tier_label` | string(64) | 否 | 展示标签，例如 128k、HD、priority |
| `price_item_type` | enum_int32 | 是 | 价格项 |
| `billing_mode` | enum_int32 | 是 | token、per_request、per_result、per_item、duration、character、storage、bandwidth、image、audio、video、tiered |
| `billing_meter_id` | int64 | 否 | `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 是 | 计量表编码 |
| `min_quantity` | decimal_string | 是 | 区间下界，含 |
| `max_quantity` | decimal_string | 否 | 区间上界，空表示无上限 |
| `quantity_unit` | enum_int32 | 是 | token、request、result、item、image、second、minute、character、pixel、byte、gb、gb_day |
| `quantity_step` | decimal_string | 否 | 进位步长 |
| `included_quantity` | decimal_string | 否 | 区间包含的免费数量 |
| `result_selector` | string(256) | 否 | 按结果/条目计费时的数量选择器 |
| `input_unit_price`、`output_unit_price` | decimal_string | 否 | 输入/输出单价 |
| `cache_write_unit_price`、`cache_read_unit_price` | decimal_string | 否 | 缓存写入/读取单价 |
| `image_unit_price`、`audio_unit_price`、`video_unit_price` | decimal_string | 否 | 模态单价 |
| `per_request_price` | decimal_string | 否 | 按次价格 |
| `multiplier` | decimal_string | 否 | 区间倍率 |
| `currency` | string(10) | 是 | 币种 |
| `sort_order` | int32 | 是 | 区间排序 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

#### 8.4.5 `ai_pricing_import_snapshot`

用途：官方/供应商价格导入快照。它记录 LiteLLM、官方页面、new-api/sub2api 迁移数据、手工导入等来源的 URL、hash、版本、行数和错误信息。导入快照是价格证据，不直接参与热路径计费。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `import_source` | enum_int32 | 是 | official_url、litellm、new_api、sub2api、manual、provider_api |
| `source_name` | string(128) | 是 | 来源名称 |
| `source_url` | string(1024) | 否 | 来源 URL |
| `source_version` | string(128) | 否 | 版本号 |
| `source_hash` | string(128) | 是 | 原始内容 hash |
| `upstream_commit` | string(128) | 否 | 外部仓库 commit |
| `data_format` | string(64) | 是 | json、yaml、csv、html、api |
| `row_count`、`accepted_count`、`rejected_count` | int64 | 是 | 导入统计 |
| `currency` | string(10) | 否 | 默认币种 |
| `published_at`、`observed_at` | instant | 否 | 来源发布时间和采集时间 |
| `raw_payload_ref` | string(512) | 否 | 原始文件引用 |
| `normalized_payload_hash` | string(128) | 否 | 规范化后 hash |
| `schema_version` | string(32) | 是 | 解析 schema 版本 |
| `error_message_masked` | string(1024) | 否 | 脱敏错误 |

### 8.5 `ai_routing_policy`

用途：路由策略主表，定义策略所属主体、目标能力和默认行为。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `policy_code` | string(64) | 是 | 租户内唯一策略编码 |
| `name` | string(128) | 是 | 策略名称 |
| `policy_scope` | enum_int32 | 是 | global、tenant、organization、api_key、group |
| `subject_id` | int64 | 否 | 绑定主体 ID |
| `capability` | enum_int32 | 是 | chat、embedding、image、audio、video |
| `default_profile_id` | int64 | 否 | 默认 profile |
| `fallback_mode` | enum_int32 | 是 | none、next_provider、next_region、cheapest、fastest |
| `slo_latency_ms` | int32 | 否 | 延迟目标 |
| `slo_success_rate` | decimal_string | 否 | 成功率目标 |
| `cost_ceiling` | decimal_string | 否 | 成本上限 |
| `currency` | string(10) | 否 | 成本币种 |

约束：

- `uk_ai_routing_policy_tenant_code(tenant_id, organization_id, policy_code)`
- `idx_ai_routing_policy_tenant_scope_status(tenant_id, organization_id, policy_scope, subject_id, status)`

### 8.6 `ai_routing_profile`

用途：策略版本和灰度发布单元。所有规则归属于 profile，支持发布、回滚和审计。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `policy_id` | int64 | 是 | 策略 ID |
| `profile_version` | int64 | 是 | 策略版本 |
| `profile_name` | string(128) | 是 | 版本名称 |
| `release_status` | enum_int32 | 是 | draft、canary、active、rollback、archived |
| `traffic_percent` | decimal_string | 是 | 灰度流量百分比 |
| `config_hash` | string(128) | 是 | 规则集合 hash |
| `published_at` | instant | 否 | 发布时间 |
| `published_by` | int64 | 否 | 发布人 |
| `rollback_from_profile_id` | int64 | 否 | 回滚来源 |

约束：

- `uk_ai_routing_profile_policy_version(policy_id, profile_version)`
- `idx_ai_routing_profile_tenant_policy_status(tenant_id, organization_id, policy_id, release_status)`

### 8.7 `ai_routing_rule`

用途：具体匹配条件、候选渠道集、权重、约束和 fallback。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `profile_id` | int64 | 是 | profile |
| `rule_code` | string(64) | 是 | profile 内唯一 |
| `priority` | int32 | 是 | 优先级，越小越先匹配 |
| `match_expression` | json | 是 | 条件表达式，必须有 schema version |
| `target_model` | string(128) | 否 | 目标模型 |
| `candidate_channels` | json | 是 | 候选渠道和权重 |
| `fallback_chain` | json | 否 | fallback 顺序 |
| `constraints` | json | 否 | 成本、区域、延迟、能力约束 |
| `rate_limit_policy_id` | int64 | 否 | 限流策略 |
| `effective_from` | instant | 是 | 生效时间 |
| `effective_to` | instant | 否 | 失效时间 |

约束：

- `uk_ai_routing_rule_profile_code(profile_id, rule_code)`
- `idx_ai_routing_rule_tenant_profile_priority(tenant_id, organization_id, profile_id, priority, status)`

### 8.8 `ai_routing_decision_log`

用途：每个请求的路由决策证据，可用于审计、成本解释、fallback 复盘和争议处理。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 是 | 请求 ID |
| `trace_id` | string(128) | 否 | trace |
| `api_key_id` | int64 | 否 | `iam_gateway_api_key.id` 或 `plus_api_key.id` 映射 |
| `legacy_api_key_id` | int64 | 否 | 使用 `plus_api_key` 时记录 |
| `policy_id` | int64 | 否 | 命中策略 |
| `profile_id` | int64 | 否 | 命中 profile |
| `rule_id` | int64 | 否 | 命中规则 |
| `requested_model` | string(128) | 是 | 请求模型 |
| `resolved_model` | string(128) | 是 | 解析后模型 |
| `capability` | enum_int32 | 是 | 能力 |
| `selected_provider_id` | int64 | 否 | Provider |
| `selected_channel_id` | int64 | 否 | 渠道 |
| `selected_account_id` | int64 | 否 | Provider 账号 |
| `decision_mode` | enum_int32 | 是 | direct、weighted、fallback、canary、manual |
| `decision_reason` | json | 是 | 决策原因，含 schema version |
| `candidate_snapshot` | json | 是 | 候选集快照 |
| `fallback_chain` | json | 否 | fallback 链 |
| `decision_latency_ms` | int32 | 否 | 决策耗时 |
| `created_at` | instant | 是 | 创建时间 |

约束：

- `uk_ai_routing_decision_log_uuid(uuid)`
- `uk_ai_routing_decision_log_request(tenant_id, organization_id, request_id)`
- `idx_ai_routing_decision_tenant_model_created(tenant_id, organization_id, requested_model, created_at, id)`
- `idx_ai_routing_decision_tenant_channel_created(tenant_id, organization_id, selected_channel_id, created_at, id)`

留存：默认在线 180 天；企业版可配置；涉及争议可设置 `legal_hold`。

### 8.9 `ai_request_trace`

用途：Provider 调用 attempt 级 trace，包括请求、响应、错误、延迟、fallback 过程。该表不是账务事实。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 是 | 请求 ID |
| `trace_id` | string(128) | 是 | trace |
| `attempt_no` | int32 | 是 | 第几次 attempt |
| `decision_log_id` | int64 | 否 | 决策日志 |
| `api_key_id` | int64 | 否 | 标准 Key ID |
| `legacy_api_key_id` | int64 | 否 | 存量 `plus_api_key.id` |
| `api_key_name_snapshot` | string(128) | 否 | Key 名称快照 |
| `channel_group_snapshot` | string(128) | 否 | Key 分组快照 |
| `owner_type` | enum_int32 | 否 | 归属主体 |
| `owner_id` | int64 | 否 | 归属主体 ID |
| `owner_name_snapshot` | string(128) | 否 | 用户或主体展示名快照 |
| `provider_id` | int64 | 否 | Provider |
| `channel_id` | int64 | 否 | 渠道 |
| `channel_name_snapshot` | string(128) | 否 | 渠道名称快照 |
| `channel_id` | int64 | 否 | Provider 账号 |
| `requested_model` | string(128) | 是 | 请求模型 |
| `provider_model` | string(128) | 否 | 上游模型 |
| `endpoint` | string(256) | 是 | API endpoint |
| `request_path` | string(256) | 否 | 原始请求路径 |
| `http_status` | int32 | 否 | HTTP 状态 |
| `provider_error_code` | string(128) | 否 | 上游错误码 |
| `error_type` | enum_int32 | 否 | timeout、rate_limit、auth、server、client、network |
| `started_at` | instant | 是 | 开始 |
| `ended_at` | instant | 否 | 结束 |
| `latency_ms` | int32 | 否 | 延迟 |
| `streaming` | bool | 是 | 是否流式 |
| `request_bytes` | int64 | 否 | 请求大小 |
| `response_bytes` | int64 | 否 | 响应大小 |
| `prompt_tokens` | int64 | 否 | 输入 token |
| `completion_tokens` | int64 | 否 | 输出 token |
| `total_tokens` | int64 | 否 | 总 token |
| `request_payload_hash` | string(128) | 否 | 请求 payload 摘要 |
| `response_payload_hash` | string(128) | 否 | 响应 payload 摘要 |
| `error_message_masked` | string(1024) | 否 | 脱敏错误 |
| `reasoning_effort` | string(64) | 否 | 推理强度或类似模型配置 |
| `client_ip_hash` | string(128) | 否 | 客户端 IP hash |
| `client_ip_masked` | string(64) | 否 | 客户端 IP 脱敏展示，支持 Usage/Admin Record 列表 |
| `client_ip_region` | string(128) | 否 | 客户端 IP 解析区域 |
| `user_agent_hash` | string(128) | 否 | User-Agent hash，不保存完整 UA |

约束：

- `uk_ai_request_trace_request_attempt(tenant_id, organization_id, request_id, attempt_no)`
- `idx_ai_request_trace_tenant_trace(tenant_id, organization_id, trace_id)`
- `idx_ai_request_trace_api_key_started(tenant_id, organization_id, api_key_id, started_at, id)`
- `idx_ai_request_trace_model_started(tenant_id, organization_id, requested_model, started_at, id)`
- `idx_ai_request_trace_tenant_status_started(tenant_id, organization_id, status, started_at, id)`

### 8.9.1 `ai_quota_policy`

用途：统一承载 API Key、用户、分组、模型、IP、临时主体的配额和限流策略，支撑 Console API Key 额度、Admin RateLimit 的 Token/Model/IP 限流，不把非 int64 主体硬塞进 `subject_id`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `policy_code` | string(64) | 是 | 策略编码 |
| `name` | string(128) | 是 | 策略名称 |
| `subject_type` | enum_int32 | 是 | api_key、user、group、model、ip、tenant 等 |
| `subject_id` | int64 | 否 | 可用 int64 表达的主体 ID |
| `subject_ref_hash` | string(128) | 否 | IP、外部 token、匿名主体等非 int64 主体 hash |
| `subject_ref_masked` | string(128) | 否 | 非 int64 主体脱敏展示 |
| `scope_type` | enum_int32 | 否 | tenant、organization、group、api_key、model |
| `scope_id` | int64 | 否 | 作用域 ID |
| `group_id` | int64 | 否 | 模型分组或 Key 分组 |
| `model` | string(128) | 否 | 模型维度限流 |
| `quota_period` | enum_int32 | 是 | second、minute、day、month、lifetime |
| `quota_unit` | enum_int32 | 是 | request、token、cost、image、duration |
| `quota_limit` | decimal_string | 否 | 配额上限 |
| `requests_per_second` | int64 | 否 | RPS |
| `requests_per_minute` | int64 | 否 | RPM |
| `requests_per_day` | int64 | 否 | RPD |
| `tokens_per_minute` | int64 | 否 | TPM |
| `burst_limit` | decimal_string | 否 | 突发额度 |
| `block_duration_seconds` | int64 | 否 | 超限阻断时长 |
| `reset_mode` | enum_int32 | 是 | fixed_window、sliding_window、calendar、manual |
| `exhausted_at` | instant | 否 | 最近耗尽时间 |

索引：

- `uk_ai_quota_policy_tenant_subject(tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit)`
- `idx_ai_quota_policy_subject_ref(tenant_id, organization_id, subject_type, subject_ref_hash, status)`
- `idx_ai_quota_policy_model_group(tenant_id, organization_id, model, group_id, status)`

### 8.10 `ai_usage_fact`

用途：网关计费唯一用量事实。结算、报表、账务扣减都以该表为来源，而不是以 trace、access log 或前端统计为来源。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `request_id` | string(128) | 是 | 请求 ID |
| `trace_id` | string(128) | 否 | trace |
| `decision_log_id` | int64 | 否 | 决策日志 |
| `api_key_id` | int64 | 否 | 标准 Key ID |
| `legacy_api_key_id` | int64 | 否 | `plus_api_key.id` |
| `api_key_name_snapshot` | string(128) | 否 | Key 名称快照 |
| `channel_group_id` | int64 | 否 | Key 分组 ID 快照 |
| `channel_group_snapshot` | string(128) | 否 | Key 分组快照 |
| `owner_type` | enum_int32 | 是 | 归属主体 |
| `owner_id` | int64 | 是 | 归属主体 ID |
| `owner_name_snapshot` | string(128) | 否 | 用户或主体展示名快照 |
| `model` | string(128) | 是 | 网关模型 |
| `provider_id` | int64 | 否 | Provider |
| `channel_id` | int64 | 否 | 渠道 |
| `channel_id` | int64 | 否 | 账号 |
| `modality` | enum_int32 | 否 | text、image、video、audio、music、sfx |
| `usage_type` | enum_int32 | 是 | text、image、audio、video、embedding、moderation、music、sfx、api、storage |
| `billing_type` | enum_int32 | 是 | token、request、duration、count、result、item、character、storage、bandwidth |
| `billing_mode` | enum_int32 | 是 | token、per_request、per_result、per_item、duration、character、storage、bandwidth、tiered、expression |
| `billing_meter_id` | int64 | 否 | `ai_billing_meter.id` |
| `billing_meter_code` | string(64) | 是 | 计量表编码 |
| `billing_tier` | string(64) | 否 | 命中的 tier label |
| `billable_quantity` | decimal_string | 是 | 统一可计费数量 |
| `billable_unit` | enum_int32 | 是 | 统一计费单位 |
| `prompt_tokens` | int64 | 否 | 输入 token |
| `completion_tokens` | int64 | 否 | 输出 token |
| `cached_tokens` | int64 | 否 | 缓存 token |
| `total_tokens` | int64 | 否 | 总 token |
| `request_count` | int64 | 否 | 次数 |
| `result_count` | int64 | 否 | 结果数 |
| `item_count` | int64 | 否 | 条目数 |
| `character_count` | int64 | 否 | 字符数 |
| `image_count` | int64 | 否 | 图片数 |
| `audio_seconds` | decimal_string | 否 | 音频秒数 |
| `video_seconds` | decimal_string | 否 | 视频秒数 |
| `storage_byte_hours` | decimal_string | 否 | 存储 byte-hour |
| `bandwidth_bytes` | int64 | 否 | 网络流量字节 |
| `unit_price_snapshot` | decimal_string | 否 | 单价快照 |
| `base_input_unit_price` | decimal_string | 否 | 输入基础单价 |
| `base_output_unit_price` | decimal_string | 否 | 输出基础单价 |
| `cache_read_unit_price` | decimal_string | 否 | 缓存命中单价 |
| `rate_multiplier` | decimal_string | 否 | 计费倍率 |
| `reference_multiplier` | decimal_string | 否 | 参考价倍率 |
| `official_reference_amount` | decimal_string | 否 | 官方参考金额 |
| `upstream_cost_amount` | decimal_string | 否 | 上游成本金额 |
| `customer_charge_amount` | decimal_string | 否 | 客户收费金额 |
| `cost_amount` | decimal_string | 是 | 成本或应扣金额 |
| `currency` | string(10) | 是 | 币种 |
| `pricing_id` | int64 | 否 | `ai_model_pricing.id` |
| `pricing_plan_id` | int64 | 否 | `ai_pricing_plan.id` |
| `pricing_plan_code` | string(64) | 否 | 定价方案编码快照 |
| `pricing_rule_id` | int64 | 否 | `ai_pricing_rule.id` |
| `pricing_tier_id` | int64 | 否 | `ai_pricing_tier.id` |
| `pricing_snapshot` | json | 是 | 价格快照 |
| `reasoning_effort` | string(64) | 否 | 推理强度或类似模型配置 |
| `occurred_at` | instant | 是 | 用量发生时间 |
| `settlement_status` | enum_int32 | 是 | pending、settling、settled、failed、ignored、compensated |
| `settlement_id` | int64 | 否 | 最近结算记录 |

约束和索引：

- `uk_ai_usage_fact_uuid(uuid)`
- `uk_ai_usage_fact_request(tenant_id, organization_id, request_id, usage_type)`
- `idx_ai_usage_fact_tenant_owner_occurred(tenant_id, organization_id, owner_type, owner_id, occurred_at, id)`
- `idx_ai_usage_fact_api_key_occurred(tenant_id, organization_id, api_key_id, occurred_at, id)`
- `idx_ai_usage_fact_tenant_model_occurred(tenant_id, organization_id, model, occurred_at, id)`
- `idx_ai_usage_fact_pricing_plan_occurred(tenant_id, organization_id, pricing_plan_id, occurred_at, id)`
- `idx_ai_usage_fact_meter_occurred(tenant_id, organization_id, billing_meter_code, occurred_at, id)`
- `idx_ai_usage_fact_settlement_status(tenant_id, organization_id, settlement_status, occurred_at, id)`

结算要求：

- `cost_amount` 和所有金额字段必须是 decimal，不允许 float/double。
- 同一 `request_id + usage_type` 的用量事实必须幂等。
- 结算失败不能删除事实，只能更新状态或生成补偿记录。
- 结算到 `commerce_account_ledger_entry` 后，必须把账户流水 ID 记录到 `commerce_usage_settlement.account_ledger_entry_id`。

### 8.11 Playground 生成资产契约

`ai_generation_session/job/asset/action` 支撑 Playground 的多模态历史、预览、收藏、下载和分享。`ai_generation_job` 保存生成任务和参数快照，`ai_generation_asset` 保存资产投影，`ai_generation_asset_action` 保存下载、分享、收藏、重绘、扩图、高清等行为事实。

细节要求：

- `ai_generation_asset` 按 L3 处理，`prompt_snapshot`、媒体 URL、分享状态都属于用户生成内容；持久化字段不能保存长期有效的签名 URL。
- `visibility`、`favorite`、`shared`、`download_count` 是高频状态投影，可以由 `ai_generation_asset_action` 重建。
- `share_token_hash` 只保存 hash；公开分享访问需要短期 token 或网关签发。
- `ai_generation_asset_action` 记录 `client_ip_hash`、`client_ip_region`、`user_agent_hash`，用于分享/下载审计，不保存完整 IP 和 UA 明文。

## 9. Commerce 投影契约

### 9.1 `commerce_usage_settlement`

用途：用量事实到既有账户/积分/订单/支付体系的结算桥接证据。它不是余额事实来源。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `settlement_no` | string(128) | 是 | 结算单号 |
| `usage_fact_id` | int64 | 是 | `ai_usage_fact.id` |
| `request_id` | string(128) | 是 | 请求 ID |
| `account_id` | string(64) | 否 | `commerce_account.id` |
| `account_ledger_entry_id` | string(64) | 否 | `commerce_account_ledger_entry.id` |
| `order_id` | int64 | 否 | `plus_order.id` |
| `payment_id` | int64 | 否 | `plus_payment.id` |
| `asset_type` | string(32) | 是 | points、cash、token |
| `direction` | string(16) | 是 | debit、credit |
| `amount` | decimal_string | 否 | 金额 |
| `points` | int64 | 否 | 积分 |
| `tokens` | int64 | 否 | token 数 |
| `currency` | string(10) | 否 | 币种 |
| `price_snapshot` | json | 是 | 价格快照 |
| `settlement_status` | enum_int32 | 是 | pending、processing、success、failed、compensated |
| `settled_at` | instant | 否 | 结算完成时间 |
| `failure_code` | string(128) | 否 | 失败码 |
| `failure_message` | string(512) | 否 | 脱敏失败信息 |

约束：

- `uk_commerce_usage_settlement_uuid(uuid)`
- `uk_commerce_usage_settlement_no(settlement_no)`
- `uk_commerce_usage_settlement_usage(tenant_id, organization_id, usage_fact_id)`
- `idx_commerce_usage_settlement_tenant_status(tenant_id, organization_id, settlement_status, created_at, id)`
- `idx_commerce_usage_settlement_account(tenant_id, organization_id, account_id, created_at, id)`

### 9.2 `commerce_usage_pricing_plan`

用途：把网关模型价格、套餐、SKU、VIP 权益和租户策略关联起来。它不替代 `plus_product` 或 `plus_sku`。

关键字段：`plan_code`、`plan_name`、`product_id`、`sku_id`、`vip_level_id`、`pricing_mode`、`included_quota`、`overage_pricing_id`、`effective_from`、`effective_to`。

约束：

- `uk_commerce_usage_pricing_plan_tenant_code(tenant_id, organization_id, plan_code)`
- `idx_commerce_usage_pricing_plan_product_status(tenant_id, organization_id, product_id, sku_id, status)`

### 9.3 `commerce_billing_export`

用途：账单导出任务和审计。导出文件应在对象存储，表中只保存 manifest、过期时间和审计信息。

关键字段：`export_no`、`export_type`、`period_start`、`period_end`、`file_manifest`、`file_hash`、`expire_at`、`download_count`、`created_by`、`approved_by`。

安全要求：导出路径必须写 `ops_audit_log`，文件必须有过期策略。

## 10. Ops 契约

### 10.1 `ops_config_snapshot`

用途：配置发布快照和回滚依据。

字段：`snapshot_no`、`config_scope`、`config_type`、`source_table`、`source_ids`、`config_payload`、`config_hash`、`published_at`、`published_by`、`rollback_from_snapshot_id`。

约束：

- `uk_ops_config_snapshot_no(snapshot_no)`
- `idx_ops_config_snapshot_tenant_scope(tenant_id, organization_id, config_scope, config_type, created_at, id)`

### 10.2 `ops_audit_log`

用途：后台、用户、系统高危操作审计。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `operator_type` | enum_int32 | 是 | user、admin、system、job |
| `operator_id` | int64 | 否 | 操作人 |
| `operator_name_snapshot` | string(128) | 否 | 操作人快照，脱敏 |
| `action` | string(128) | 是 | 操作 |
| `target_type` | string(128) | 是 | 目标类型 |
| `target_id` | int64 | 否 | 目标 ID |
| `target_uuid` | string(64) | 否 | 目标 UUID |
| `request_id` | string(128) | 是 | 请求 ID |
| `trace_id` | string(128) | 否 | trace |
| `client_ip_hash` | string(128) | 否 | IP 摘要 |
| `user_agent_hash` | string(128) | 否 | UA 摘要 |
| `before_hash` | string(128) | 否 | 操作前摘要 |
| `after_hash` | string(128) | 否 | 操作后摘要 |
| `change_summary` | json | 否 | 脱敏变更摘要 |
| `risk_level` | enum_int32 | 是 | low、medium、high、critical |
| `approval_id` | int64 | 否 | 审批记录 |

索引：

- `idx_ops_audit_log_tenant_operator_created(tenant_id, organization_id, operator_type, operator_id, created_at, id)`
- `idx_ops_audit_log_tenant_target_created(tenant_id, organization_id, target_type, target_id, created_at, id)`
- `idx_ops_audit_log_request(tenant_id, organization_id, request_id)`

### 10.3 `ops_outbox_event`

用途：本地事务后可靠发布事件。

字段：`event_id`、`aggregate_type`、`aggregate_id`、`aggregate_uuid`、`event_type`、`event_version`、`event_payload`、`payload_hash`、`headers`、`publish_status`、`retry_count`、`next_retry_at`、`published_at`、`failure_reason`。

约束：

- `uk_ops_outbox_event_id(event_id)`
- `idx_ops_outbox_event_status_retry(publish_status, next_retry_at, created_at, id)`
- `idx_ops_outbox_event_aggregate(aggregate_type, aggregate_id, created_at, id)`

### 10.4 `ops_inbox_event`

用途：消费方消息去重和处理状态记录。

字段：`source_system`、`message_id`、`consumer_name`、`event_type`、`event_version`、`payload_hash`、`process_status`、`retry_count`、`processed_at`、`failure_reason`。

约束：

- `uk_ops_inbox_event_message(source_system, message_id, consumer_name)`
- `idx_ops_inbox_event_status_retry(process_status, created_at, id)`

## 11. Portal 内容契约

门户内容不进入网关热路径，按 L2 设计即可。

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `plus_app` | AppCenter/PlusApp 主数据 | `name`、`icon_resource_snapshot`、`resource_list`、`project_id`、`description`、`version`、`access_url`、`config`、`status`、`app_type`、`platforms`、`install_platforms`、`install_skill`、`install_config`、`release_notes`、`package_name`、`bundle_id`、`store_url`、`download_url`；API/view model 输出 `icon`、`cover`、`screenshots` 为 `MediaResource` 对象 |
| `plus_agent_skill` | SkillsHub/AgentSkill 主数据 | `skill_key`、`name`、`summary`、`description`、`icon_resource_snapshot`、`cover_resource_snapshot`、`category_id`、`package_id`、`provider`、`version`、`manifest_url`、`license_name`、`market_status`、`visibility`、`review_status`、`install_count`、`rating_avg`、`capabilities`、`default_config`、`latest_published_at` |
| `plus_agent_skill_package` | 技能包/集合 | `package_key`、`name`、`summary`、`description`、`icon_resource_snapshot`、`cover_resource_snapshot`、`category_id`、`enabled`、`featured`、`sort_weight`、`tags`、`latest_published_at` |
| `plus_user_agent_skill` | 用户技能安装与配置 | `user_id`、`skill_id`、`enabled`、`config`、`installed_at`、`last_enabled_at`、`last_used_at`、`used_count` |
| `plus_category` | 技能分类 | `name`、`description`、`type`、`code`、`icon`、`sort_weight`、`parent_id`、`path`、`visible`、`status` |
| `studio_catalog_action` | 应用/技能行为事实 | `target_type`、`target_id`、`release_id`、`action_type`、`rating_score`、`review_body` |
| `content_announcement` | 公告 | `title`、`content`、`audience_scope`、`effective_from`、`effective_to`、`pinned` |
| `content_openapi_snapshot` | API Reference 版本快照 | `api_system`、`version`、`source_ref`、`openapi_hash`、`endpoint_count`、`category_tree` |
| `content_sdk_release` | SDK Reference 发布清单 | `api_system`、`language`、`language_icon`、`language_description`、`package_name`、`version`、`install_command`、`import_code`、`init_code`、`example_code`、`github_url`、`artifact_manifest` |
| `content_forum_post` | 论坛帖子 | `title`、`body`、`category`、`author_id`、`view_count`、`reply_count`、`last_replied_at` |
| `content_forum_comment` | 评论 | `target_type`、`target_id`、`post_id`、`course_id`、`parent_id`、`body`、`author_id` |
| `content_reaction` | 内容互动事实 | `target_type`、`target_id`、`reaction_type`、`reaction_value`、`cancelled_at` |
| `content_course` | 课程 | `course_code`、`title`、`summary`、`thumbnail_resource_snapshot`、`level`、`published_at`；API/view model 输出 `thumbnail` 为 `MediaResource` 对象 |
| `content_course_section` | 课程章节分组 | `course_id`、`section_no`、`title`、`sort_order`、`lesson_count`、`duration_seconds` |
| `content_course_lesson` | 课程课时 | `course_id`、`section_id`、`lesson_no`、`title`、`video_resource_snapshot`、`external_bvid`、`duration_seconds`；API/view model 输出 `video` 为 `MediaResource` 对象 |

内容表同样要求 `tenant_id`、`organization_id`、`status`、`created_at`、`updated_at`、`version`，但不参与账户/结算事务。

## 12. 数据流和事务边界

### 12.1 配置发布事务

```text
admin/backend API
  -> validate permission
  -> write integration_/ai_/iam_ config tables
  -> write ops_config_snapshot
  -> write ops_outbox_event in same transaction
  -> gateway cache consumer writes ops_inbox_event
  -> gateway hot cache refresh
```

配置发布成功的判定不是“数据库写入成功”，而是：

- 配置主表事务提交成功。
- outbox 事件创建成功。
- 至少一个控制面消费者确认发布。
- Gateway 热路径缓存暴露新 `config_hash`。

### 12.2 请求计费事务

```text
/v1 request
  -> key auth
  -> route decision
  -> provider attempts
  -> ai_routing_decision_log
  -> ai_request_trace
  -> ai_usage_fact
  -> settlement worker
  -> commerce_usage_settlement
  -> commerce_account / commerce_account_ledger_entry by appbase commerce account service
```

事务边界：

- Gateway 请求响应不能等待长期结算事务。
- `ai_usage_fact` 必须可在失败后重放结算。
- `commerce_usage_settlement` 对 `usage_fact_id` 唯一，防止重复扣费。
- `commerce_account_ledger_entry` 是资金/积分最终流水事实，不能被 `commerce_usage_settlement` 替代。

### 12.3 失败补偿

| 失败点 | 处理方式 |
| --- | --- |
| Provider 调用失败 | `ai_request_trace` 记录失败 attempt；若 fallback 成功，`ai_usage_fact` 只记录最终可计费用量 |
| usage fact 写入失败 | 本地可靠队列或 outbox 补写；请求侧返回不应伪造用量 |
| 结算失败 | `ai_usage_fact.settlement_status=failed`，`commerce_usage_settlement` 保存失败码，worker 重试 |
| 重复结算 | `uk_commerce_usage_settlement_usage` 阻断；账户服务 idempotency key 阻断 |
| 账户扣减成功但回写 settlement 失败 | 通过 `commerce_account_ledger_entry.transaction_no` 和 `settlement_no` 对账修复 |

## 13. 状态机

### 13.1 通用配置状态

| 值 | 名称 | 含义 |
| ---: | --- | --- |
| 0 | DRAFT | 草稿 |
| 1 | ACTIVE | 生效 |
| 2 | DISABLED | 禁用 |
| 3 | ARCHIVED | 归档 |
| 4 | DELETED | 软删除 |

### 13.2 结算状态

| 值 | 名称 | 含义 |
| ---: | --- | --- |
| 0 | PENDING | 待结算 |
| 1 | PROCESSING | 处理中 |
| 2 | SUCCESS | 成功 |
| 3 | FAILED | 失败可重试 |
| 4 | IGNORED | 不计费或被忽略 |
| 5 | COMPENSATED | 已补偿 |

### 13.3 Outbox/Inbox 状态

| 值 | 名称 | 含义 |
| ---: | --- | --- |
| 0 | PENDING | 待发布/待消费 |
| 1 | PROCESSING | 处理中 |
| 2 | SUCCESS | 成功 |
| 3 | FAILED | 失败可重试 |
| 4 | DEAD | 超过重试进入死信 |

枚举在数据库可用 int32 存储，在 API/SDK 可暴露稳定字符串或 Java 标准 DTO 约定值，但必须支持未知值和向前兼容。

## 14. 分区、索引和留存

| 表 | 分区键 | 在线留存 | 冷归档 | 索引预算 |
| --- | --- | ---: | ---: | ---: |
| `ai_usage_fact` | `occurred_at` 月分区 | 24 个月 | 5 年 | 6 |
| `ai_request_trace` | `started_at` 日/月分区 | 90-180 天 | 1 年 | 5 |
| `ai_routing_decision_log` | `created_at` 月分区 | 180 天 | 2 年 | 5 |
| `ops_audit_log` | `created_at` 月分区 | 24 个月 | 5 年或合规要求 | 6 |
| `ops_outbox_event` | `created_at` 月分区 | 成功 30-90 天；失败保留 | 1 年 | 5 |
| `ops_inbox_event` | `created_at` 月分区 | 180 天或大于消息重放窗口 | 1 年 | 4 |
| `integration_provider_health_snapshot` | `created_at` 日/月分区 | 30-90 天 | 1 年 | 4 |

索引规则：

- 租户在线查询索引必须以 `tenant_id, organization_id` 开头。
- 列表页使用 `status, updated_at, id` 或 `status, created_at, id`，支持游标翻页。
- 唯一键必须和业务边界一致，例如租户内 code 唯一、全局 provider code 唯一、消息消费三元组唯一。
- JSON 字段不承载金额、状态、租户、权限、幂等等核心字段。
- 日志事实表禁止为了临时查询无限加索引；低频分析进入数仓或搜索索引。

## 15. 多数据库方言映射

| 逻辑类型 | PostgreSQL | MySQL/MariaDB | SQLite | API/SDK |
| --- | --- | --- | --- | --- |
| int64 | BIGINT | BIGINT | INTEGER | string |
| int32 enum | INTEGER | INT | INTEGER | string 或 int，按 OpenAPI 标准声明 |
| decimal | NUMERIC(18,6) 或更高 | DECIMAL(18,6) 或更高 | TEXT 或 NUMERIC | string |
| instant | TIMESTAMP WITH TIME ZONE 或 TIMESTAMP UTC | DATETIME(3/6) UTC | TEXT ISO8601 UTC | ISO8601 UTC string |
| json | JSONB | JSON | TEXT + JSON 校验 | object |
| bool | BOOLEAN | BOOLEAN/TINYINT | INTEGER | boolean |

部署要求：

- 本地桌面可用 SQLite，但不能改变字段语义；decimal 在 API 中仍是 string。
- Server/Docker/K8S 推荐 PostgreSQL。
- `ops_gateway_instance.deployment_mode/runtime_type/orchestrator` 记录 local_desktop、server、docker、k8s 等部署形态；桌面设备、容器、Pod、Node 只存 hash 或脱敏标签。
- `ops_gateway_heartbeat.uptime_seconds/disk_percent/open_file_count/thread_count` 支撑 Admin Monitor 节点页，不依赖各部署平台的专有指标字段。
- 分区、物化视图、部分索引属于物理优化，不能成为公共契约的唯一语义来源。

## 16. 安全和隐私

### 16.1 密钥

- Provider API key、OAuth refresh token、私钥不进入业务表。
- `integration_provider_account.secret_ref` 指向 Vault、KMS、系统 Keychain 或安全配置中心。
- `iam_gateway_api_key.key_hash` 使用 HMAC-SHA256 或组织批准算法，pepper 不入库。
- 创建 API Key 时明文只返回一次；后台不能再次读取明文。

### 16.2 审计

以下操作必须写 `ops_audit_log`：

- 创建、禁用、删除 API Key。
- 新增、修改、轮换 Provider 账号。
- 修改路由策略、灰度、fallback、限流、计费价格。
- 用户余额、积分、VIP、充值、退款等后台操作。
- 导出账单、审计日志、用户数据。
- 修改部署级安全配置、代理配置、跨境/区域策略。

### 16.3 PII 和财务数据

- PII 仍以 `plus_user*` 既有加密/脱敏策略为准。
- 财务数据仍以 `plus_account*`、`plus_order*`、`plus_payment*`、`plus_refund`、`plus_invoice*` 为准。
- 新表中只保存必要的 user_id、owner_id、account_id、account_ledger_entry_id 引用，不复制手机号、邮箱、地址、支付明细。

## 17. API/SDK 序列化契约

| 数据类型 | API 表达 | 原因 |
| --- | --- | --- |
| `id`、`tenant_id`、`organization_id`、`user_id`、`owner_id`、`*_id` | string | 避免 JavaScript int64 精度丢失 |
| decimal 金额/价格/比例 | string | 避免浮点误差 |
| instant | ISO8601 UTC string | 避免时区歧义 |
| enum | OpenAPI 明确定义；保留 unknown | 支持前后端和多语言 SDK 演进 |
| JSON 快照 | object，包含 `schema_version` | 支持回放和兼容 |

app/backend API 的路径和返回包装必须跟 Java 标准一致：

- 用户面：`/app/v3/api/{resource-path}`，返回 `SdkWorkApiResponse`。
- 管理面：`/backend/v3/api/{resource-path}`，返回 `SdkWorkApiResponse`。
- OpenAI 兼容面：`/v1/*`，不包装 `SdkWorkApiResponse`（`x-sdkwork-wire-protocol: external`）。

## 18. CI 和评审门禁

### 18.1 新表门禁

新表进入迁移前必须通过以下检查：

- 表名前缀在前缀注册表中。
- 表名第一段不是产品名、项目名、公司名或技术栈名。
- 已声明 profile、compliance_level、system_of_record、write_owner。
- L2/L3 表包含 `tenant_id`、`organization_id`、`created_at`、`updated_at`、`version`。
- L3 表声明留存、审计、安全分类、runbook。
- 金额/价格不使用 float/double。
- 高频查询字段不是只放在 JSON 中。
- 幂等字段有唯一约束。
- app/backend DTO 中 int64/decimal 使用 string 或等价安全序列化。

### 18.2 禁用前缀门禁

DDL、契约、Entity 新增表不得使用以下业务前缀：

- `claw_`
- `router_`
- `sdkwork_`

这些词可以出现在产品文案、注释或“禁止清单”中，但不能作为新业务表第一段。

### 18.3 存量替代表门禁

CI 应阻断以下同义替代表：

- 用户替代表：`iam_user`、`iam_user_oauth_account`。
- 账户替代表：`commerce_account`、`commerce_account_history`。
- VIP/积分替代表：`commerce_vip_user`、`commerce_vip_recharge`、`commerce_vip_point_change`。
- 卡券替代表：任何非 `promotion_` 命名的券定义、券实例、用户券和核销主表。
- 订单支付替代表：`commerce_order`、`commerce_payment`、`commerce_refund`、`commerce_invoice`。

### 18.4 文档到实现同步门禁

任何字段变更必须同时更新：

1. 本数据契约。
2. DDL 迁移。
3. ORM/Entity。
4. app/backend OpenAPI。
5. 生成 SDK。
6. 数据同步、数仓、搜索或缓存映射。
7. 安全审计和留存策略。

## 19. 实施路线

### 19.1 P0 数据闭环

1. 建立 schema registry 文件或等价 Markdown/YAML 契约。
2. 落地 Provider、Channel、Provider Account、Channel Model。
3. 落地 Model、Routing Policy/Profile/Rule。
4. 落地 Decision Log、Request Trace、Usage Fact。
5. 落地 Audit Log、Outbox、Inbox。
6. 接入 app/backend API SDK，保证路径和 DTO 与 Java 标准一致。

### 19.2 P1 生产增强

1. 完成 `plus_api_key` 与 `iam_gateway_api_key` 的最终路线评审。
2. 落地访问策略、配额策略、模型价格。
3. 落地 `commerce_usage_settlement`，串联既有账户/VIP/交易服务。
4. 落地配置快照和发布回滚。
5. 接入分区、归档、慢查询和数据质量巡检。

### 19.3 P2/P3 规模化

1. 门户内容、应用中心、技能中心内容表。
2. 账单导出、健康快照、告警、任务。
3. K8S Cell/Region 下的事件流、读模型、冷热分层和多 Region 数据治理。

## 20. 评审结论

本轮数据设计建议采用：

- 存量核心业务事实表：严格复用 `plus_*`，不改结构，不建替代表。
- 网关新增配置和事实：使用 `iam_`、`integration_`、`ai_`、`commerce_`、`studio_`、`content_`、`ops_` 标准前缀。
- 账务闭环：`ai_usage_fact` 是用量事实，`commerce_usage_settlement` 是结算桥接，`commerce_account_ledger_entry` 是最终账户流水事实。
- 密钥闭环：Key 明文不落库，Provider secret 只保存引用，所有高危操作写 `ops_audit_log`。
- 部署闭环：四种部署形态共享同一数据契约，差异只在数据库方言、分区能力、密钥存储和运维参数。

