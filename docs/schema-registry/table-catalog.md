# 数据库表目录与表说明

生成来源：`docs/schema-registry/sdkwork-clawrouter.tables.yaml`
source: docs/schema-registry/sdkwork-clawrouter.tables.yaml
表总数：154
table-count: 154
本项目生成表：154

本文列出当前应用 schema registry 中登记的全部数据库表，并给出中文业务说明。`generated = no` 表示物理结构由外部系统或 Java 兼容实体拥有，当前应用只登记和读取契约。

## Domain 汇总

| domain | 表数量 | 说明 |
| --- | ---: | --- |
| `ai` | 84 | AI 中转与模型服务 |
| `classification` | 1 | classification |
| `commerce` | 12 | 交易、计费与结算 |
| `content` | 18 | 内容、文档与对象存储 |
| `iam` | 10 | 身份、访问与安全 |
| `integration` | 14 | 外部集成与服务商 |
| `ops` | 13 | 运维治理 |
| `system` | 2 | 系统安装 |

## AI 中转与模型服务

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `ai_channel_group` | 中转站面向用户/API Key 的路由与计费分组，绑定价格计划和倍率。 | `tenant_entity` | `ai-routing-service` | yes |
| `ai_channel_group_member` | 维护分组可访问的上游账号池成员及优先级、权重。 | `relation_entity` | `ai-routing-service` | yes |
| `ai_channel_group_resource` | 维护分组可访问的资源或资源组，是 API Key 到资源授权的核心边。 | `relation_entity` | `ai-routing-service` | yes |
| `ai_channel_group_metric_snapshot` | 保存分组容量、额度和用量的指标快照。 | `projection` | `metrics-worker` | yes |
| `ai_provider` | 定义上游集成供应商类型，表示官方厂商、云厂商、聚合商或自建中转能力。 | `dictionary_entity` | `ai-routing-service` | yes |
| `ai_site` | 上游服务商站点/账号主体，承载上游服务商基础信息、Logo、域名和认证入口。 | `provider_account_secret_ref` | `ai-routing-service` | yes |
| `ai_site_service` | 上游服务商按区域或服务维度的部署配置，主要区分 base URL 和凭证引用。 | `credential_ref` | `ai-routing-service` | yes |
| `ai_channel` | 上游账号/渠道运行时配置，连接 provider、site、认证方式、区域和调度权重。 | `credential_ref` | `ai-routing-service` | yes |
| `ai_channel_credential` | 上游账号的具体凭证轮换单元，保存 base URL、secret ref、权重和健康状态。 | `credential_ref` | `ai-routing-service` | yes |
| `integration_provider_health_snapshot` | AI 中转与模型服务的投影快照，记录 供应商健康快照。 | `projection` | `ops-worker` | yes |
| `ai_model_vendor` | 稳定的模型或能力供应商字典，例如 OpenAI、Anthropic、Google、Kling。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_modality` | AI 能力模态字典，例如 LLM、图像、视频、音频、音乐和音效。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_api_endpoint` | 对外开放 API 资源字典，用于把请求路径抽象为可授权、可计费资源。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_vendor_modality` | 供应商与能力模态的关系，描述某 vendor 支持哪些能力。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_vendor_api_endpoint` | 供应商与 API 资源的关系，描述某 vendor 支持哪些 API。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_modality_api_endpoint` | 能力模态与 API 资源的关系，支持按模态筛选 API 能力。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_model_modality` | 模型与模态的关系，描述模型输入输出能力分类。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_model_api_endpoint` | 模型与 API 资源的关系，描述模型可被哪些 API 调用。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_resource` | 中转站统一资源抽象，覆盖模型、API、图片、视频、音频、音乐、音效和按次资源。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_resource_group` | 统一资源分组，用于维护 OpenAI、Claude、Gemini、Kling 等 API 资源集合。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_resource_group_item` | 资源分组成员关系，支持资源组嵌套和资源集合安装种子。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_channel_resource` | 上游账号/渠道支持的资源授权，是账号能力筛选和路由候选生成的核心边。 | `relation_entity` | `ai-routing-service` | yes |
| `ai_provider_object_route` | 对象类或非模型 API 的运行时路由绑定，支持无模型参数的 API 调用。 | `runtime_binding` | `gateway-runtime` | yes |
| `ai_config_version` | AI 路由配置版本，用于快照缓存刷新和分布式实例协调。 | `runtime_coordination` | `ai-routing-service` | yes |
| `ai_config_change_event` | AI 配置变更事件，用于触发运行时缓存和路由快照刷新。 | `runtime_coordination_event` | `ai-routing-service` | yes |
| `ai_model_family` | 模型家族字典，用于归类同系列模型和展示筛选。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_model` | 标准模型目录主表，保存模型 catalog key、vendor、能力、上下架和展示信息。 | `dictionary_entity` | `model-catalog-service` | yes |
| `ai_model_capability` | 模型能力补充表，保存 chat、embedding、tools 等能力标签。 | `relation_entity` | `model-catalog-service` | yes |
| `ai_model_catalog_source` | 模型目录来源配置，用于导入官方或第三方模型目录。 | `catalog_source` | `model-catalog-service` | yes |
| `ai_model_catalog_sync_run` | 模型目录同步任务执行记录。 | `event_log` | `model-catalog-service` | yes |
| `ai_billing_meter` | 计费计量单位字典，覆盖 token、请求次数、图片张数、音视频时长等。 | `dictionary_entity` | `pricing-service` | yes |
| `ai_model_pricing` | 模型与资源价格表，保存官方参考价、接入成本价、销售价等价格侧。 | `pricing` | `pricing-service` | yes |
| `ai_pricing_plan` | 价格计划主表，定义默认倍率、加价和价格基准。 | `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_plan_binding` | 价格计划绑定关系，用于将账号、分组、租户或 SKU 绑定到价格计划。 | `relation_entity` | `pricing-service` | yes |
| `ai_pricing_rule` | 价格规则表，支持倍率、固定价格、阶梯价和表达式计费。 | `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_tier` | 价格阶梯表，保存分段计费阈值和单价。 | `tenant_entity` | `pricing-service` | yes |
| `ai_pricing_import_snapshot` | 价格导入快照，记录官方价格或供应商账单价格同步过程。 | `event_log` | `pricing-sync-worker` | yes |
| `ai_model_rank_snapshot` | 模型排行和质量/成本/延迟指标投影，用于模型市场和推荐。 | `projection` | `analytics-worker` | yes |
| `ai_routing_policy` | 路由策略主表，定义全局、租户、组织、API Key 或分组作用域。 | `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_profile` | 路由策略配置档，承载一组规则版本。 | `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_rule` | 路由规则表，保存匹配条件、候选账号、fallback 和约束。 | `tenant_entity` | `routing-policy-service` | yes |
| `ai_routing_decision_log` | 运行时路由决策日志，记录请求选择了哪个上游账号及原因。 | `event_log` | `gateway-runtime` | yes |
| `ai_request_trace` | 网关请求链路跟踪表，记录 API Key、分组、模型、账号、状态码、TTFT 和耗时。 | `event_log` | `gateway-runtime` | yes |
| `ai_usage_fact` | AI 用量事实表，记录计费单位、用量、单价快照和上游成本。 | `ledger_source_fact` | `gateway-runtime` | yes |
| `ai_quota_policy` | AI 用量或模型访问限额策略。 | `tenant_entity` | `quota-service` | yes |
| `ai_prompt` | AI 中转与模型服务的租户级主数据，记录 prompt。 | `tenant_entity` | `prompt-service` | yes |
| `ai_prompt_version` | AI 中转与模型服务的租户级主数据，记录 提示词版本。 | `tenant_entity` | `prompt-service` | yes |
| `ai_prompt_binding` | AI 中转与模型服务的租户级主数据，记录 提示词绑定。 | `tenant_entity` | `prompt-service` | yes |
| `ai_mcp_server` | AI 中转与模型服务的租户级主数据，记录 MCP 服务。 | `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_server_revision` | AI 中转与模型服务的租户级主数据，记录 MCP 服务修订。 | `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_tool` | AI 中转与模型服务的租户级主数据，记录 MCP 工具。 | `tenant_entity` | `mcp-service` | yes |
| `ai_mcp_binding` | AI 中转与模型服务的租户级主数据，记录 MCP 绑定。 | `tenant_entity` | `mcp-service` | yes |
| `ai_agent` | AI 中转与模型服务的租户级主数据，记录 agent。 | `tenant_entity` | `agent-service` | yes |
| `ai_agent_version` | AI 中转与模型服务的租户级主数据，记录 Agent 版本。 | `tenant_entity` | `agent-service` | yes |
| `ai_agent_run` | AI 中转与模型服务的事件日志，记录 Agent 运行。 | `event_log` | `agent-runtime` | yes |
| `ai_agent_run_step` | AI 中转与模型服务的事件日志，记录 Agent 运行步骤。 | `event_log` | `agent-runtime` | yes |
| `ai_agent_memory` | AI 中转与模型服务的用户级数据，记录 Agent 记忆。 | `user_entity` | `agent-memory-service` | yes |
| `ai_chat_conversation` | AI 中转与模型服务的用户级数据，记录 聊天会话。 | `user_entity` | `chat-service` | yes |
| `ai_chat_turn` | AI 中转与模型服务的事件日志，记录 聊天轮次。 | `event_log` | `chat-service` | yes |
| `ai_chat_item` | AI 中转与模型服务的事件日志，记录 聊天条目。 | `event_log` | `chat-service` | yes |
| `ai_chat_message` | AI 中转与模型服务的事件日志，记录 聊天消息。 | `event_log` | `chat-service` | yes |
| `ai_chat_message_part` | AI 中转与模型服务的事件日志，记录 聊天消息片段。 | `event_log` | `chat-service` | yes |
| `ai_chat_context_snapshot` | AI 中转与模型服务的事件日志，记录 聊天上下文快照。 | `event_log` | `chat-runtime` | yes |
| `ai_agent_session` | AI 中转与模型服务的用户级数据，记录 Agent 会话。 | `user_entity` | `agent-runtime` | yes |
| `ai_runtime_invocation` | AI 中转与模型服务的事件日志，记录 运行时调用。 | `event_log` | `ai-runtime` | yes |
| `ai_runtime_invocation_event` | AI 中转与模型服务的事件日志，记录 运行时调用事件。 | `event_log` | `ai-runtime` | yes |
| `ai_runtime_usage_link` | AI 中转与模型服务的事件日志，记录 运行时用量关联。 | `event_log` | `ai-runtime` | yes |
| `ai_runtime_artifact` | AI 中转与模型服务的事件日志，记录 运行时产物。 | `event_log` | `ai-runtime` | yes |
| `ai_agent_tool_binding` | AI 中转与模型服务的租户级主数据，记录 Agent 工具绑定。 | `tenant_entity` | `agent-service` | yes |
| `ai_agent_mcp_server` | AI 中转与模型服务的租户级主数据，记录 Agent MCP 服务绑定。 | `tenant_entity` | `agent-service` | yes |
| `ai_model_mapping_rule` | 模型映射规则主表，定义全局、vendor、账号或分组级模型别名映射。 | `rule_entity` | `ai-routing-service` | yes |
| `ai_model_mapping_rule_item` | 模型映射规则条目，保存源模型到目标模型的具体映射。 | `relation_entity` | `ai-routing-service` | yes |
| `ai_model_mapping_rule_binding` | 模型映射规则绑定，定义映射规则适用的账号、分组、vendor 或全局范围。 | `relation_entity` | `ai-routing-service` | yes |
| `ai_usage_service_provider_edge` | 将 AI 用量事实关联到服务商链路，用于服务商结算和成本分摊。 | `commercial_usage_edge_fact` | `gateway-runtime` | yes |

## classification

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `c_category` | classification的租户级主数据，记录 ccategory。 | `tenant_entity` | `catalog-service` | yes |

## 交易、计费与结算

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `commerce_usage_settlement` | 交易、计费与结算的账务投影，记录 用量结算。 | `ledger_projection` | `settlement-worker` | yes |
| `commerce_usage_pricing_plan` | 交易、计费与结算的字典主数据，记录 用量价格计划。 | `dictionary_entity` | `pricing-service` | yes |
| `commerce_usage_statement` | 交易、计费与结算的投影快照，记录 用量账单。 | `projection` | `billing-worker` | yes |
| `commerce_usage_statement_item` | 交易、计费与结算的投影快照，记录 用量账单明细。 | `projection` | `billing-worker` | yes |
| `commerce_settlement_export` | 交易、计费与结算的导出审计，记录 结算导出。 | `export_audit` | `billing-export-service` | yes |
| `commerce_usage_service_provider_statement` | 交易、计费与结算的服务商账单，记录 usageservice供应商statement。 | `commercial_provider_statement` | `billing-worker` | yes |
| `commerce_usage_service_provider_adjustment` | 交易、计费与结算的服务商账务调整，记录 usageservice供应商adjustment。 | `commercial_provider_adjustment` | `billing-worker` | yes |
| `commerce_usage_service_provider_reconciliation_run` | 交易、计费与结算的服务商对账批次，记录 usageservice供应商reconciliationrun。 | `commercial_provider_reconciliation_run` | `reconciliation-worker` | yes |
| `commerce_usage_service_provider_reconciliation_item` | 交易、计费与结算的服务商对账明细，记录 usageservice供应商reconciliationitem。 | `commercial_provider_reconciliation_item` | `reconciliation-worker` | yes |
| `commerce_service_provider_exposure_snapshot` | 交易、计费与结算的服务商风险敞口快照，记录 服务商风险敞口快照。 | `commercial_provider_exposure_snapshot` | `settlement-worker` | yes |
| `analytics_service_provider_daily` | 交易、计费与结算的服务商日统计投影，记录 服务商日统计。 | `commercial_provider_daily_projection` | `analytics-worker` | yes |
| `analytics_service_provider_edge_daily` | 交易、计费与结算的服务商关系日统计投影，记录 服务商关系日统计。 | `commercial_provider_edge_daily_projection` | `analytics-worker` | yes |

## 内容、文档与对象存储

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `object_provider` | 内容、文档与对象存储的对象存储供应商，记录 供应商。 | `object_storage_provider` | `storage-service` | yes |
| `object_bucket` | 内容、文档与对象存储的对象存储桶，记录 bucket。 | `object_storage_bucket` | `storage-service` | yes |
| `storage_default_bucket_policy` | 内容、文档与对象存储的对象存储路由策略，记录 默认桶策略。 | `object_storage_routing_policy` | `storage-service` | yes |
| `storage_quota_policy` | 内容、文档与对象存储的存储配额策略，记录 限额策略。 | `storage_quota_policy` | `storage-service` | yes |
| `storage_quota_reservation` | 内容、文档与对象存储的存储配额预留，记录 配额预留。 | `storage_quota_reservation` | `storage-service` | yes |
| `storage_usage_counter` | 内容、文档与对象存储的存储用量计数器，记录 用量计数器。 | `storage_usage_counter` | `storage-service` | yes |
| `storage_usage_ledger` | 内容、文档与对象存储的存储用量流水，记录 用量流水。 | `storage_usage_ledger` | `storage-service` | yes |
| `storage_usage_snapshot` | 内容、文档与对象存储的存储用量快照，记录 用量快照。 | `storage_usage_snapshot` | `storage-service` | yes |
| `storage_reconciliation_run` | 内容、文档与对象存储的存储对账批次，记录 对账批次。 | `storage_reconciliation_run` | `storage-service` | yes |
| `storage_reconciliation_item` | 内容、文档与对象存储的存储对账明细，记录 对账明细。 | `storage_reconciliation_item` | `storage-service` | yes |
| `storage_gc_job` | 内容、文档与对象存储的存储清理任务，记录 垃圾清理任务。 | `storage_garbage_collection_job` | `storage-service` | yes |
| `object_blob` | 内容、文档与对象存储的对象文件，记录 blob。 | `object_blob` | `storage-service` | yes |
| `media_resource` | 内容、文档与对象存储的media resource，记录 媒体资源。 | `media_resource` | `storage-service` | yes |
| `object_tag` | 内容、文档与对象存储的对象标签，记录 tag。 | `object_tag` | `storage-service` | yes |
| `upload_session` | 内容、文档与对象存储的上传会话，记录 会话。 | `object_upload_session` | `storage-service` | yes |
| `upload_part` | 内容、文档与对象存储的分片上传，记录 part。 | `object_upload_part` | `storage-service` | yes |
| `upload_presign_grant` | 内容、文档与对象存储的预签授权，记录 presigngrant。 | `object_upload_presign_grant` | `storage-service` | yes |
| `upload_completion_attempt` | 内容、文档与对象存储的上传完成尝试，记录 completionattempt。 | `object_upload_completion_attempt` | `storage-service` | yes |

## 身份、访问与安全

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `iam_gateway_api_key` | 中转站对外 API Key 索引，保存密钥哈希、默认分组、策略和限额引用。 | `credential_index` | `api-key-service` | yes |
| `iam_gateway_api_key_channel_group` | 身份、访问与安全的关系绑定，记录 gatewayapikeychannelgroup。 | `relation_entity` | `api-key-service` | yes |
| `iam_gateway_access_policy` | 保存网关 API Key 的访问能力、IP 白名单等访问控制策略。 | `tenant_entity` | `access-policy-service` | yes |
| `iam_gateway_risk_rule` | 身份、访问与安全的租户级主数据，记录 gatewayriskrule。 | `tenant_entity` | `risk-service` | yes |
| `iam_user_preference` | 身份、访问与安全的用户级数据，记录 用户偏好。 | `user_entity` | `user-preference-service` | yes |
| `iam_user_security_setting` | 身份、访问与安全的用户级数据，记录 用户安全设置。 | `user_entity` | `user-security-service` | yes |
| `iam_user_login_event` | 身份、访问与安全的事件日志，记录 用户登录事件。 | `event_log` | `auth-service` | yes |
| `iam_verification_scene_policy` | 身份、访问与安全的验证策略，记录 验证场景策略。 | `verification_policy` | `sdkwork-appbase-iam` | yes |
| `iam_verification_challenge` | 身份、访问与安全的验证挑战，记录 验证挑战。 | `verification_challenge` | `sdkwork-appbase-iam` | yes |
| `iam_verification_attempt` | 身份、访问与安全的验证尝试，记录 验证尝试。 | `verification_attempt` | `sdkwork-appbase-iam` | yes |

## 外部集成与服务商

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `integration_provider_account` | 外部集成与服务商的供应商账号凭证引用，记录 供应商账号。 | `provider_account_secret_ref` | `integration-service` | yes |
| `integration_proxy` | 外部集成与服务商的凭证引用配置，记录 代理。 | `credential_ref` | `provider-service` | yes |
| `integration_webhook_endpoint` | 外部集成与服务商的Webhook 配置，记录 Webhook 端点。 | `webhook` | `webhook-service` | yes |
| `integration_service_provider` | 外部集成与服务商的服务商主体，记录 服务商。 | `commercial_provider_subject` | `service-provider-service` | yes |
| `integration_service_provider_edge` | 外部集成与服务商的服务商合同边，记录 服务商关系边。 | `commercial_provider_contract_edge` | `service-provider-service` | yes |
| `integration_service_provider_closure` | 外部集成与服务商的服务商层级闭包，记录 服务商层级闭包。 | `commercial_provider_tree_closure` | `service-provider-service` | yes |
| `integration_service_provider_member` | 外部集成与服务商的服务商成员关系，记录 服务商成员。 | `commercial_provider_member` | `service-provider-service` | yes |
| `integration_service_provider_subject_binding` | 外部集成与服务商的服务商主体绑定，记录 服务商主体绑定。 | `commercial_provider_subject_binding` | `service-provider-service` | yes |
| `integration_service_provider_contract` | 外部集成与服务商的服务商合同，记录 服务商合同。 | `commercial_provider_contract` | `service-provider-service` | yes |
| `integration_service_provider_finance_profile` | 外部集成与服务商的服务商财务配置，记录 服务商财务配置。 | `commercial_provider_finance_profile` | `service-provider-service` | yes |
| `integration_service_provider_price_plan` | 外部集成与服务商的服务商价格方案，记录 服务商价格方案。 | `commercial_provider_price_plan` | `pricing-service` | yes |
| `integration_service_provider_price_rule` | 外部集成与服务商的服务商价格规则，记录 服务商价格规则。 | `commercial_provider_price_rule` | `pricing-service` | yes |
| `integration_provider_invoice_import` | 外部集成与服务商的上游账单导入批次，记录 供应商账单导入批次。 | `upstream_provider_invoice_import` | `reconciliation-worker` | yes |
| `integration_provider_invoice_item` | 外部集成与服务商的上游账单明细，记录 供应商账单明细。 | `upstream_provider_invoice_item` | `reconciliation-worker` | yes |

## 运维治理

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `ops_gateway_instance` | 运维治理的核心主数据，记录 网关实例。 | `core_entity` | `ops-service` | yes |
| `ops_gateway_heartbeat` | 运维治理的事件日志，记录 网关心跳。 | `event_log` | `ops-agent` | yes |
| `ops_config_snapshot` | 运维治理的快照，记录 配置快照。 | `snapshot` | `control-plane` | yes |
| `ops_audit_log` | 运维治理的审计日志，记录 审计日志。 | `audit_log` | `audit-service` | yes |
| `ops_outbox_event` | 运维治理的事务发件箱事件，记录 发件箱事件。 | `outbox_event` | `all-transactional-services` | yes |
| `ops_inbox_event` | 运维治理的inbox event，记录 收件箱事件。 | `inbox_event` | `all-event-consumers` | yes |
| `ops_job_execution` | 运维治理的事件日志，记录 任务执行。 | `event_log` | `job-runtime` | yes |
| `ops_alert_event` | 运维治理的事件日志，记录 告警事件。 | `event_log` | `alert-service` | yes |
| `ops_notification_message` | 运维治理的通知消息，记录 通知消息。 | `notification` | `notification-service` | yes |
| `ops_notification_recipient` | 运维治理的通知收件人，记录 通知收件人。 | `notification_recipient` | `notification-service` | yes |
| `ops_notification_delivery` | 运维治理的通知投递，记录 通知投递。 | `notification_delivery` | `notification-service` | yes |
| `ops_notification_preference` | 运维治理的通知偏好，记录 通知偏好。 | `notification_preference` | `notification-service` | yes |
| `ops_metric_snapshot` | 运维治理的投影快照，记录 指标快照。 | `projection` | `metrics-worker` | yes |

## 系统安装

| 表名 | 说明 | profile | write_owner | generated |
| --- | --- | --- | --- | --- |
| `system_installation_state` | 记录应用数据库安装状态、种子版本和安装锁，用于 installer 幂等执行。 | `installation_state` | `database-installer` | yes |
| `system_schema_migration` | 记录 schema registry 或安装器执行过的数据库迁移批次。 | `installation_migration_log` | `database-installer` | yes |
