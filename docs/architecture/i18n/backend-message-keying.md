# 后端错误消息国际化键化对照表（Backend Message Keying Table）

> 归属：`I18N_SPEC.md` §5/§8/§9。本表是 Cloud Router 后端所有用户可见错误消息与其
> `i18nKey` + 插值 `params` 的唯一事实来源，前端错误目录（`sdkwork-cloudrouter-pc-i18n`）
> 与后端共享模板注册表均以此为准。

## 机制总览

- 稳定机器字段永不翻译：`code` / `traceId` / `status` / `type` / `operationId`。
- 平台码级键：`errors.result.<code>`（自动注入，29 个平台码，前端目录全量维护）。
- 业务/校验键：`validation.<domain>.<resource>.<field>.<rule>` 与
  `business.<domain>.<capability>.<state>`，携带插值 `params`。
- 后端 detail 保留英文原文作为安全回退展示；前端按 `i18nKey` 翻译；
  前端缺失键时回退 `errors.result.<code>`，再回退后端 detail。
- 服务端 detail 本地化（locale 中间件）：仅对后端目录中已注册的键生效
  （目前：`errors.result.*` 不覆盖 detail、`business.common.notFound` 覆盖）。

## 键命名约定

| 前缀 | 语义 | 示例 |
| --- | --- | --- |
| `errors.result.<code>` | 平台码级通用消息（自动注入） | `errors.result.40101` |
| `validation.common.*` | 跨模块共享校验（分页/搜索/请求头/通用字段） | `validation.common.list.page.min` |
| `validation.admin.upstream.*` | 上游供应商管理（backend-api upstream 模块） | `validation.admin.upstream.field.required` |
| `validation.admin.<capability>.*` | 管理面专属校验 | `validation.admin.apiKey.keyPrefix.identifies` |
| `validation.app.<capability>.*` | 应用面（App API）校验 | `validation.app.invite.code.invalidOrInactive` |
| `validation.payment.*` | 支付面校验 | `validation.payment.intent.body.invalid` |
| `business.common.notFound` | 通用"实体不存在"（entity 参数） | `business.common.notFound` |
| `business.<domain>.<capability>.<state>` | 业务状态消息 | `business.admin.serviceNode.statusEndpoint` |

## 键清单（en / zh 模板）

### 平台码 `errors.result.*`（自动注入，29 个）

见 `crates/sdkwork-cloudrouter-http/resources/i18n/{en-US,zh-CN}/errors/result.json`。
40001-40004、40101-40104、40301-40304、40401、40501、40801、40901、41001、41201、
41301、41501、42201、42301、42801、42901、60002、50001、50201、50301、50401。

### 共享校验模板注册表（router-service `response.rs::shared_validation_message_key`）

| 英文模板（匹配原文） | i18nKey | params |
| --- | --- | --- |
| `page must be greater than or equal to 1` | `validation.common.list.page.min` | `{min}` |
| `page must be between 1 and {max}` | `validation.common.list.page.max` | `{max}` |
| `page_size must be between 1 and {max}` | `validation.common.list.pageSize.range` | `{min, max}` |
| `page and page_size produce an unsupported offset` | `validation.common.list.offset.overflow` | — |
| `{field} must be visible text and at most {n} characters` | `validation.common.field.visibleText` | `{field, maxLength}` |
| `{field} is required` | `validation.common.field.required` | `{field}` |
| `{field} must be a non-negative int64 string` | `validation.common.field.nonNegativeInt64` | `{field}` |
| `{field} must be a positive integer or null` | `validation.common.field.positiveIntegerOrNull` | `{field}` |
| `{field} must be a positive integer` | `validation.common.field.positiveInteger` | `{field}` |
| `{field} must be a MediaResource object` | `validation.common.field.mediaResource` | `{field}` |
| `{field} must be a JSON object` | `validation.common.field.jsonObject` | `{field}` |
| `{field} must be a JSON array` | `validation.common.field.jsonArray` | `{field}` |
| `{field} must match {pattern}` | `validation.common.field.pattern` | `{field, pattern}` |
| `{name} header must be visible ASCII` | `validation.common.header.visibleAscii` | `{name}` |
| `{name} header is required` | `validation.common.header.required` | `{name}` |
| `at least one domain is required` | `validation.common.domain.atLeastOne` | — |
| `domain must be a hostname or URL host` | `validation.common.domain.hostname` | — |
| `storage query parameters are invalid` | `validation.admin.storage.query.invalid` | — |
| `status must be enabled or disabled` | `validation.common.status.enabledOrDisabled` | — |
| `status must be changed through status endpoint` | `business.admin.serviceNode.statusEndpoint` | — |
| `service node update fields are required` | `validation.admin.serviceNode.update.required` | — |
| `keyPrefix must identify an existing API key prefix` | `validation.admin.apiKey.keyPrefix.identifies` | — |
| `appId is invalid` | `validation.common.appId.invalid` | — |
| `apiKeyId must be a positive integer` | `validation.common.apiKeyId.positiveInteger` | — |
| `ip must be a valid IPv4 or IPv6 address` | `validation.common.ip.invalid` | — |
| `base URL must be a valid URL` | `validation.common.baseUrl.invalid` | — |
| `deployment profile must be standalone or cloud` | `validation.common.deploymentProfile.enum` | — |
| `notificationId is invalid` | `validation.app.notification.notificationId.invalid` | — |
| `invite code is invalid or inactive` | `validation.app.invite.code.invalidOrInactive` | — |
| `datasets must not be empty` | `validation.app.chat.datasets.notEmpty` | — |
| `a user cannot invite themselves` | `business.app.invite.selfInvite.denied` | — |
| `accountGroup must identify an existing upstream account group` | `validation.admin.upstream.accountGroup.identifies` | — |
| `refund cancel request body is invalid: {error}` | `validation.payment.refundCancel.body.invalid` | `{error}` |
| `payment refund request body is invalid: {error}` | `validation.payment.refund.body.invalid` | `{error}` |
| `payment intent request body is invalid: {error}` | `validation.payment.intent.body.invalid` | `{error}` |
| `{entity} was not found` | `business.common.notFound` | `{entity}` |

### backend-api upstream 模块显式键（`problem_keyed`，59 处调用点已全部转换）

| i18nKey | en 回退 | params |
| --- | --- | --- |
| `validation.admin.upstream.list.page.min` | page must be greater than or equal to 1 | `{min}` |
| `validation.admin.upstream.list.pageSize.range` | page_size must be between 1 and 200 | `{min, max}` |
| `validation.admin.upstream.list.offset.overflow` | page and page_size produce an unsupported offset | `{page, pageSize}` |
| `validation.admin.upstream.id.positiveInteger` | {field} must be a positive integer string | `{field}` |
| `validation.admin.upstream.version.header.required` | If-Match is required for this operation | — |
| `validation.admin.upstream.version.header.format` | If-Match must contain a valid version | — |
| `validation.admin.upstream.version.header.nonNegativeInteger` | If-Match must contain a non-negative integer version | — |
| `validation.admin.upstream.idempotency.header.required` | Idempotency-Key is required for this create operation | — |
| `validation.admin.upstream.idempotency.header.visibleText` | Idempotency-Key must be valid visible text | — |
| `validation.admin.upstream.idempotency.header.notBlank` | Idempotency-Key must not be blank | — |
| `validation.admin.upstream.field.required` | {field} is required | `{field}` |
| `validation.admin.upstream.field.visibleText` | {field} must be visible text with at most {n} characters | `{field, maxLength}` |
| `validation.admin.upstream.field.positiveDecimal` | {field} must be a positive decimal with at most 12 fractional digits | `{field, maxFractionDigits}` |
| `validation.admin.upstream.field.greaterThanZero` | {field} must be greater than zero | `{field}` |
| `validation.admin.upstream.body.malformed` | request body is invalid: {error} | `{error}` |
| `validation.admin.upstream.query.invalid` | query parameters are invalid: {error} | `{error}` |
| `validation.admin.upstream.field.nonNegative` | {field} must be non-negative | `{field}` |
| `validation.admin.upstream.field.nonNegativeDecimal` | {field} must be a non-negative decimal | `{field}` |
| `validation.admin.upstream.field.positive` | {field} must be positive | `{field}` |
| `validation.admin.upstream.field.maxItems` | {field} must contain at most {n} items | `{field, max}` |
| `validation.admin.upstream.status.enum` | status must be 0 or 1 | `{allowed}` |
| `validation.admin.upstream.supplier.supplierType.enum` | supplierType must be official or relay | `{allowed}` |
| `validation.admin.upstream.supplier.authType.unsupported` | authType is not supported | — |
| `validation.admin.upstream.supplier.defaultVendorCode.officialRequired` | defaultVendorCode is required for official suppliers | — |
| `validation.admin.upstream.authMethod.configSchema.object` | configSchema must be a JSON object | — |
| `validation.admin.upstream.authMethod.runtimeAuthConfig.object` | runtimeAuthConfig must be a JSON object | — |
| `validation.admin.upstream.resource.codeGroup.oneOf` | exactly one of resourceCode or resourceGroupCode is required | — |
| `validation.admin.upstream.resource.grantType.enum` | grantType must be allow or deny | `{allowed}` |
| `validation.admin.upstream.account.resources.maxItems` | at most 200 resources are allowed | `{max}` |
| `validation.admin.upstream.account.timeoutMs.range` | timeoutMs must be between 100 and 30000 | `{min, max}` |
| `validation.admin.upstream.credential.expiresAt.timestamp` | expiresAt must be an RFC 3339 timestamp | — |
| `validation.admin.upstream.accountGroup.groupType.enum` | groupType must be one of {list} | `{allowed}` |
| `validation.admin.upstream.accountGroup.routingStrategy.unsupported` | routingStrategy is not supported | `{allowed}` |
| `validation.admin.upstream.accountGroup.fallbackMode.unsupported` | fallbackMode is not supported | `{allowed}` |
| `validation.admin.upstream.accountGroup.modalities.subset` | modalities must be a subset of {list} | `{allowed}` |
| `validation.admin.upstream.accountGroup.tags.maxItems` | tags must contain at most {n} items | `{max}` |
| `validation.admin.upstream.accountGroup.tags.subset` | tags must be a subset of {list} | `{allowed}` |
| `business.admin.upstream.notFound` | {entity} was not found | `{entity}` |
| `business.admin.upstream.operation.failed` | upstream management operation failed | — |
| `business.admin.upstream.resourceCatalog.unavailable` | resource catalog is not available for this deployment | — |

## 覆盖状态（逐个 API 检查）

| 表面 | 机制 | 状态 |
| --- | --- | --- |
| app-api / backend-api 全部响应 | locale 协商 + `locale` 字段 + Content-Language/Vary | ✅ Phase 1 |
| 平台码 29 个 | `errors.result.*` 自动注入 + 前端/后端目录 | ✅ |
| backend-api upstream（供应商/账号/分组/资源目录） | 59 处 `problem()` 显式键化 | ✅ 本表 |
| router-service 共享校验（分页/搜索/请求头/not-found 等） | 模板注册表（~36 模板） | ✅ 本表 |
| 前端错误目录 | `sdkwork-cloudrouter-pc-i18n/src/resources/errors.ts`（en/zh，~95 键）已注册 | ✅ |
| 前端错误展示点 | `resolveProblemMessage` 全页面接入（61 处调用点，owned-sources typecheck 通过） | ✅ |
| SDK 语言头 | `attachSdkworkSdkLocaleBoundary` 单点包装全部 SDK 客户端 | ✅ |
| DB `*_i18n` jsonb 名称 | `RequestLocale` 扩展注入 router-service（app_routing/app_usage_logs） | ✅ |

### 记录例外（有意保留原文回退）

- `membershipFormValues.ts` 表单值工具函数：无翻译函数上下文，保留 `error.message` 原文回退。
- `AdminResourceCenter.tsx` 共享组件：标题已本地化，详情展示原文（补充性信息）。
- OpenAI 兼容外部协议面（`/v1` open SDK、quick-import `/models`）：`x-sdkwork-wire-protocol: external` 豁免。
- 会话失效弹窗（sdkwork-iam 外部包）：依赖 SDK 语言头使后端返回匹配语言。

### 新增键的流程

1. 在 `shared_validation_message_key`（router-service `response.rs`）或调用点
   `problem_keyed` / `bad_request_keyed` 处登记键 + params。
2. 在本表追加一行（en 回退模板 + params）。
3. 在 `sdkwork-cloudrouter-pc-i18n` 的 `errors.ts` bundle 增加 en/zh 文案
   （键名以本表为唯一事实来源；en/zh 必须对齐）。
4. 如需要服务端 detail 本地化，在
   `crates/sdkwork-cloudrouter-http/resources/i18n/{en-US,zh-CN}/errors/result.json`
   （或按域新增 bundle）登记模板。
