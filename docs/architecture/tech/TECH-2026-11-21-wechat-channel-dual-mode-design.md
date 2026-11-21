# 微信渠道双模式接入技术设计（自有直连 + 第三方平台 / 服务商）

Status: draft
Owner: cloudrouter-platform
Updated: 2026-11-21
Specs: `API_SPEC.md`, `DATABASE_SPEC.md`, `IAM_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `I18N_SPEC.md`, `TEST_SPEC.md`
Decision: [ADR-20261121-wechat-channel-dual-mode](../decisions/ADR-20261121-wechat-channel-dual-mode.md)

## 1. 目标与范围

目标：让"应用部署体系"同时支持两种微信接入方式，并具备商业化运营所需的授权、发布、配额、审计能力。

- **自有直连**（`self_managed`）：客户持有 AppID/AppSecret 或代码上传密钥，平台用客户自己的凭据调用微信。
- **第三方平台代管**（`operator_authorized`）：平台或客户持有的第三方平台（`component_appid`）取得商家授权，平台用 `authorizer_access_token` 代开发、代发布、代运营。
- **外部服务商接入**（`external_provider`）：同一套代管流程，但 component 实例由外部服务商提供，平台登记其身份并编排发布。

范围：微信小程序与公众号。开放平台网站应用/移动应用（扫码登录、UnionID）在 P6 以同一能力抽象接入；支付宝/抖音仅在驱动层验证抽象，不进入首期验收。

不在范围：微信支付服务商（与开放平台第三方平台是两套体系）、自建代码托管、微信后台全量功能复制。

## 2. 现状与差距

| 能力 | 现状 | 证据 |
| --- | --- | --- |
| 渠道账号数据模型 | 已具备 operator platform / resource account / resource authorization / webhook config / secret 五表 | IAM 基线 DDL `database/ddl/baseline/postgres/0001_iam_baseline.sql:516,722,754,799,833` |
| 自有直连公众号 | 菜单、二维码、消息回调、网页授权、小程序 code→session、手机号授权均已真实调用微信 | `sdkwork-iam/crates/sdkwork-iam-web-adapter/src/wechat_mp.rs`、`oauth_integration_exchange.rs` |
| 第三方平台运行时 | 零：无 ticket、无 component token、无 pre_auth、无 auth_code 换取、无授权事件 | IAM 全仓 `component_verify_ticket|component_access_token|pre_auth_code|authorizer_refresh_token` 命中 0 |
| 预授权操作 | 仅写 `iam_oauth_diagnostic_run` 诊断行 | `sdkwork-routes-iam-backend-api/src/oauth_handlers.impl.rs:2385` |
| 密钥托管 | 有 AES-256-GCM，但 master secret 缺失时退化为明文 base64；`operator_platform`/`resource_authorization` owner kind 未使用 | `sdkwork-iam-bootstrap/src/tenant_signing_key.rs:26` |
| 应用绑定 | `deploy_application_resource_link` 支持 official_account / mini_program / payment_account，五环境隔离 | `sdkwork-deployments/crates/sdkwork-deploy-contract/src/app_resource_link.rs` |
| 发布流水线 | 构建/打包/校验/release 完整；上传、提审、审核、发布、回退缺失 | `sdkwork-intelligence-deploy-service/src/app_delivery.rs`；`deploy-build-runner/src/review_observer.rs` 为 no-op |
| 审核态写入 | `update_app_deployment_state` 无 HTTP 入口；终态 UPDATE 匹配 0 行仍返回旧值 | `sdkwork-intelligence-deploy-repository-sqlx/src/app_deployments.rs:345` |
| 管理端 | 服务商平台/授权方/活动页在 IAM 管理包已有约 80%，CloudRouter 未挂路由；发布看板缺失 | `@sdkwork/iam-pc-admin-oauth`；`iamAdminContribution.ts:69` |
| 商业化 | 有 pricing/PriceService/membership entitlement；无渠道类权益键与计量事件 | ADR-20260815；`sdkwork-membership` |

结论：不是重建，而是补"授权运行时 + 发布编排 + 商业化口径"三段。

## 3. 概念模型

### 3.1 术语

| 术语 | 说明 |
| --- | --- |
| Operator platform | 第三方平台实例（`component_appid`）。`platform_type=platform` 可调接口；`customized` 仅有 appid，禁止调用 |
| Resource account | 授权方或自有账号。`access_mode` 决定凭据来源 |
| Resource authorization | 一次授权的凭据与范围事实（refresh token 密文、`func_info`、到期/刷新信息） |
| Channel capability | 归一化后的微信能力（`mini_program.commit`、`official_account.menu.publish`……），由 IAM 能力网关执行 |
| Channel release | Deploy 侧一次发布尝试（模板、commit、audit、发布/回退/灰度结果） |

### 3.2 模式矩阵

| 维度 | self_managed | operator_authorized | external_provider |
| --- | --- | --- | --- |
| 凭据持有 | 客户 | 本平台 component | 外部服务商 component |
| 凭据形态 | AppSecret / CI 私钥 | authorizer_refresh_token | authorizer_refresh_token |
| 令牌 | `access_token` | `component_access_token` + `authorizer_access_token` | 同左 |
| 小程序发布 | `miniprogram-ci` | 模板 → commit → 审核 → 发布 | 同左 |
| 公众号能力 | 直连 | 代调用 + 代网页授权 | 同左 |
| 回调 | 公众号消息回调 | 授权事件 + 消息事件 | 同左 |
| 公网要求 | 无（发布需外网出站） | 必须 | 必须 |

### 3.3 跨租户归属

授权方属于客户租户，平台属于服务商租户，二者不同租户：

- `iam_oauth_resource_account.tenant_id` = 客户租户；
- `iam_oauth_operator_platform.tenant_id` = 服务商租户；
- 关联用 `operator_platform_id`（全局 uuid，不建跨租户外键）+ 冗余 `operator_platform_code` 快照；
- 服务商代运营通过"授权关系"获得受控访问，不复制客户数据；
- 授权事件先落 `iam_oauth_authorizer_inbox`，由客户扫码认领或服务商代为绑定，避免"先有账号再有租户"的空窗。

## 4. 总体架构

### 4.1 分层

```text
Admin / Console（生成 SDK）
  ├─ IAM OAuth：服务商平台 · 授权方 · 令牌与事件
  └─ App Center：绑定 · 发布流水线 · 模板库 · 域名/隐私
        │
IAM 渠道授权中心                          Deploy 发布编排
  operator_platform 生命周期                channel_release 状态机
  pre_auth / auth_code / token              模板库 / 发布投影
  授权事件 + 消息事件回调                    upload→audit→release→rollback
  密钥托管 / 限流 / 审计                    ReviewObserver（真实实现）
        └──────────── 内部 RPC ────────────┘
                        │
              微信通道能力网关（IAM 内）
              DirectDriver / ComponentDriver
              错误码映射 · 配额查询 · 幂等重试 · 全链路脱敏
```

### 4.2 职责矩阵

| 事项 | IAM | Deploy | 前端 |
| --- | --- | --- | --- |
| component 密钥、ticket、token | 持有 | 不可见 | 不可见 |
| 授权换取与刷新 | 执行 | 不参与 | 只发起 |
| 回调验签解密 | 执行 | 不参与 | 不可见 |
| 发布状态与审核态 | 提供能力结果 | 持有事实 | 展示 |
| 能力调用（上传/提审/发布） | 执行 HTTP | 编排调用 | 不可直呼 |
| 配额扣减 | 提供用量事件 | 产生发布事件 | 展示 |

### 4.3 授权时序（代管模式）

```text
运营配置 operator_platform（component_appid/secret/token/AESKey）
  → 微信推送 component_verify_ticket（每 10 分钟）→ 落库 + 刷新 component_access_token
  → 运营/租户发起授权 → api_create_preauthcode → 授权入口 URL（PC 扫码 / H5）
  → 商家扫码确认 → redirect_uri?auth_code=…
  → api_query_auth → authorization_info（authorizer_appid / refresh_token / func_info）
  → 建 resource_account(access_mode=operator_authorized) + resource_authorization
  → 绑定 Deploy 环境（deploy_application_resource_link.access_mode/channel_account_id）
  → 发布时按 (platform, authorizer) 取/刷新 authorizer_access_token
```

### 4.4 发布时序（小程序代管）

```text
Deploy 构建产物 → 发布投影（剥离 sdkwork 清单、补 project.config.json）
  → 平台开发小程序上传草稿（miniprogram-ci / 开发者工具）
  → gettemplatedraftlist → addtotemplate（模板库）
  → [每个授权方] commit(template_id, ext_json, version, desc)
  → 隐私检测（getCodePrivacyInfo；61039/61040 阻断）
  → submit_audit(item_list, feedback_info, ugc_declare, preview_info)
  → get_auditstatus / 事件回调 → approved
  → release（data 必传）或 grayrelease(gray_percentage)
  → 失败/回滚：revertcoderelease(app_version)（仅最近 5 个版本）
```

## 5. 授权与令牌设计

### 5.1 ticket

- 微信每 10 分钟推送，有效期 12h；处理成功必须返回纯文本 `success`。
- 双写"最近可用 ticket"与"最近一次到达时间"；超过 15 分钟未到达触发告警，超过 30 分钟调用 `api_start_push_ticket` 自愈。
- 入站必须幂等：按 `CreateTime + AppId` 去重，重复推送只更新到达时间。

### 5.2 component_access_token

- 入参 `component_appid / component_appsecret / component_verify_ticket`，有效期 7200s。
- 缓存：`iam_ephemeral_artifact` key `wechat_component_token:{component_appid}`，TTL 提前 10 分钟；进程内 LRU 二次缓存。
- 并发：单飞 + `pg_advisory_xact_lock(hash(component_appid))`，避免多实例同时刷新。
- 失败：ticket 异常时继续使用最近可用 ticket；连续失败进入退避（1s/2s/4s/8s，上限 60s），并写 `iam_oauth_diagnostic_run`。

### 5.3 pre_auth_code 与 auth_code

- `api_create_preauthcode` 返回 `pre_auth_code` + `expires_in`；官方正文写 1800s、示例返回 600s，**实现按返回值兜底**，不硬编码。
- 授权入口：PC `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid&pre_auth_code&redirect_uri&auth_type`；H5 `https://open.weixin.qq.com/wxaopen/safe/bindcomponent?...&no_scan=1`。
- `auth_type`：1 公众号、2 小程序、3 两者；`biz_appid` 优先于 `auth_type`。
- 回调 `redirect_uri?auth_code=…&expires_in=…`；`api_query_auth` 换取授权信息，**以 `func_info` 为准**，不得假定声明即授权。
- `authorizer_refresh_token` 可能为空：为空视为授权异常，进入"重新授权"引导，不重试换取。

### 5.4 authorizer token

- 有效期 2h；刷新接口返回新 token 与新 refresh_token，**必须覆盖保存**。
- 主动刷新窗口 100 分钟；被动失效（`40001/40014/42001`）强制刷新一次再重试，最多一次。
- 刷新失败分类：`invalid_refresh_token`（需重新授权）、`network`（退避）、`quota`（熔断）。
- 令牌只存在于 IAM 进程与加密存储，不写日志、不进 Deploy、不回前端。

### 5.5 令牌作用域

| 令牌 | 作用域 | 可调接口 |
| --- | --- | --- |
| component_access_token | 平台级 | 模板库、域名登记、预授权、换取授权、刷新授权方令牌 |
| authorizer_access_token | 单个授权方 | 代码提交、提审、发布、回退、灰度、域名、隐私、类目、客服消息 |
| 普通 access_token | 自有账号 | 与 authorizer 能力同构，但只作用于自有账号 |

禁止用 component token 调商家业务接口；禁止跨授权方复用 token。

## 6. 回调入口与安全

### 6.1 URL 规划

| 用途 | 路径 | 说明 |
| --- | --- | --- |
| 授权事件 | `/iam/v3/api/iam/oauth/wechat/component_callbacks/{callbackPublicId}` | GET 回显 `echostr`，POST 处理 ticket/授权变更 |
| 消息与事件 | `/iam/v3/api/iam/oauth/wechat/authorizer_callbacks/{callbackPublicId}/{authorizerAppid}` | 微信在 URL 中填充授权方 appid |
| 公众号直连消息 | 现有 `/iam/v3/api/iam/oauth/official_accounts/{accountId}/wechat/notify` | 保持不动 |

`callbackPublicId` 是随机不可枚举标识，与租户/平台解耦；两个入口均声明 `x-sdkwork-wire-protocol: external` + `x-sdkwork-external-protocol-id`，按 `API_SPEC §4.5.2` 豁免统一响应包装。

### 6.2 验签与解密

- 授权事件与消息事件都用 `msg_signature = sha1(sort(token, timestamp, nonce, Encrypt))`；不得使用 `signature`。
- `AESKey = Base64Decode(EncodingAESKey + "=")`（32 字节），AES-256-CBC + PKCS#7。
- 明文结构：`random(16B) + msg_len(4B 大端) + msg + appid`；必须校验尾随 appid 等于自身（授权事件）或授权方 appid（消息事件）。
- 被动回复必须加密：`Encrypt / MsgSignature / TimeStamp / Nonce`；无回复需求时返回空串或 `success`。
- 时间窗 5 分钟，防重放集合按 `MsgId/EventKey` 保留 10 分钟。

### 6.3 幂等、顺序与降级

- 事件表 `iam_oauth_channel_callback_event` 唯一键 `(callback_public_id, dedupe_key)`；`dedupe_key = MsgId` 或 `InfoType + AuthorizerAppid + CreateTime`。
- 先落库再返回 `success`；处理异步化，失败可重放，不阻塞微信重试。
- 乱序：以 `CreateTime` 为准，旧事件不覆盖新授权状态；`unauthorized` 优先于 `updateauthorized`。
- 存储不可用时：授权事件返回非 `success` 让微信重推（可接受），消息事件返回空串并记录丢失告警。

### 6.4 全网发布自动应答

| 测试项 | 触发 | 应答 |
| --- | --- | --- |
| ticket | 模拟 ticket 推送 | 返回 `success` |
| 公众号文本 | `Content = TESTCOMPONENT_MSG_TYPE_TEXT` | 5 秒内回复 `TESTCOMPONENT_MSG_TYPE_TEXT_callback` |
| 公众号授权码 | `Content = QUERY_AUTH_CODE:$code` | 先回空串，再用客服消息回 `$code_from_api`（auth_code 换 token 后取 from_api） |
| 小程序 | 同公众号两项 | 同上 |

未勾选消息管理/客服消息权限集时跳过对应项；测试号 5 组需全部配置，否则报"暂没有测试资源"。

## 7. 数据模型

> DDL 为设计意图；最终以 IAM / Deploy 仓迁移文件与 schema 契约测试为准。所有新列可空或带默认值，保证存量行可读。

### 7.1 IAM 变更

IAM 基线用 `TEXT` 存 id、时间戳与 JSON（`jsonb`/`timestamptz` 不是本模块约定）。落地迁移为
`sdkwork-iam/database/migrations/postgres/0046_wechat_component_operator_platform.up.sql`，
由 `wechat_component_schema_postgres.rs` 在事务内执行两次后回滚验证幂等性。

```sql
-- operator platform（增量列，全部可空或带默认值）
ALTER TABLE iam_oauth_operator_platform
  ADD COLUMN platform_type              TEXT NOT NULL DEFAULT 'platform',
  ADD COLUMN component_appid            TEXT,
  ADD COLUMN callback_public_id         TEXT,
  ADD COLUMN ticket_status              TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN ticket_received_at         TEXT,
  ADD COLUMN ticket_expires_at          TEXT,
  ADD COLUMN component_token_expires_at TEXT,
  ADD COLUMN full_release_status        TEXT NOT NULL DEFAULT 'not_released',
  ADD COLUMN approved_permission_sets_json TEXT NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX uk_iam_oauth_operator_platform_callback
  ON iam_oauth_operator_platform (callback_public_id) WHERE callback_public_id IS NOT NULL;
CREATE UNIQUE INDEX uk_iam_oauth_operator_platform_component
  ON iam_oauth_operator_platform (tenant_id, organization_id, component_appid)
  WHERE component_appid IS NOT NULL;

-- resource authorization（授权事实补授权方与来源）
ALTER TABLE iam_oauth_resource_authorization
  ADD COLUMN authorizer_appid     TEXT,
  ADD COLUMN func_info_json       TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN authorization_source TEXT NOT NULL DEFAULT 'manual_verified';

CREATE UNIQUE INDEX uk_iam_oauth_resource_authorization_active
  ON iam_oauth_resource_authorization (operator_platform_id, resource_account_id)
  WHERE status = 'active' AND operator_platform_id IS NOT NULL;
CREATE INDEX idx_iam_oauth_resource_authorization_refresh
  ON iam_oauth_resource_authorization (status, next_refresh_at)
  WHERE next_refresh_at IS NOT NULL;
```

新增表：

| 表 | 关键列 | 用途 |
| --- | --- | --- |
| `iam_oauth_channel_callback_event` | `callback_public_id`、`dedupe_key`、`event_kind`、`payload_json`、`received_at`、`processed_at`、`attempts`、`last_error` | 回调去重、重放与失败重试；唯一键 `(callback_public_id, dedupe_key)` |
| `iam_oauth_authorizer_inbox` | `operator_platform_id`、`authorizer_appid`、`authorization_info_json`、`authorization_status`、`claimed_tenant_id`、`claimed_at` | 授权方待认领池；唯一键 `(operator_platform_id, authorizer_appid)` |

密钥枚举扩展（无 CHECK 约束，按应用层校验）：`secret_owner_kind` 增加 `operator_platform`、`resource_authorization`；`secret_kind` 增加 `component_app_secret`、`encoding_aes_key`、`component_verify_ticket`、`authorizer_refresh_token`。

### 7.2 Deploy 变更

```sql
ALTER TABLE deploy_application_resource_link
  ADD COLUMN access_mode              varchar(32) NOT NULL DEFAULT 'self_managed',
  ADD COLUMN channel_account_id       varchar(36),
  ADD COLUMN operator_platform_id     varchar(36),
  ADD COLUMN authorization_ref        varchar(36),
  ADD COLUMN capability_snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE deploy_channel_release (
  id                    varchar(36) PRIMARY KEY,
  tenant_id             varchar(36) NOT NULL,
  organization_id       varchar(36),
  app_id                bigint NOT NULL,
  env_key               varchar(32) NOT NULL,
  resource_link_id      varchar(36) NOT NULL,
  channel               varchar(32) NOT NULL,          -- wechat_mini_program | wechat_official_account
  access_mode           varchar(32) NOT NULL,
  provider_version      varchar(64),
  template_id           varchar(64),
  commit_id             varchar(64),
  audit_id              varchar(64),
  release_status        varchar(32) NOT NULL,
  gray_percentage       smallint NOT NULL DEFAULT 100,
  rollback_of_release_id varchar(36),
  error_code            varchar(64),
  provider_payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at          timestamptz,
  released_at           timestamptz,
  created_at            timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL
);
CREATE INDEX idx_deploy_channel_release_app ON deploy_channel_release (tenant_id, app_id, env_key, release_status);
CREATE UNIQUE INDEX uk_deploy_channel_release_commit ON deploy_channel_release (resource_link_id, commit_id);

CREATE TABLE deploy_channel_template (
  id                varchar(36) PRIMARY KEY,
  tenant_id         varchar(36) NOT NULL,
  app_id            bigint NOT NULL,
  operator_platform_id varchar(36),
  template_id       varchar(64) NOT NULL,
  template_version  varchar(64),
  ext_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            varchar(32) NOT NULL,
  created_at        timestamptz NOT NULL,
  updated_at        timestamptz NOT NULL
);

CREATE TABLE deploy_channel_domain (
  id            varchar(36) PRIMARY KEY,
  tenant_id     varchar(36) NOT NULL,
  app_id        bigint NOT NULL,
  domain_kind   varchar(32) NOT NULL,   -- request | socket | upload | download | udp | webview
  domain        text NOT NULL,
  bound         boolean NOT NULL DEFAULT false,
  verified      boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at    timestamptz NOT NULL,
  updated_at    timestamptz NOT NULL
);
```

`deploy_deployment` 增补 `audit_id`、`submitted_at`、`released_at`，并修复终态更新 rowcount 校验。

### 7.3 迁移顺序

1. IAM：加列/加表/加索引 → 回填 `callback_public_id` → 补 `access_mode` 校验约束。
2. IAM：密钥 owner kind 扩展 + 存量明文 secret 迁移任务（按 `enc:` 前缀幂等重加密，双读窗口）。
3. Deploy：加列/加表（默认 `self_managed`，存量绑定不受影响）。
4. Deploy：修审核态写入路径 → 开新命令端点。
5. 契约与生成 SDK → 前端接入。

## 8. API 契约

路径遵循 `API_SPEC` 资源式命名；写操作使用 create 语义（`POST`），状态查询用 `retrieve`/`list`；命令型操作使用子资源 `create`（如 `authorization_entries`、`audit_submissions`）。

### 8.1 IAM backend（`/backend/v3/api/iam/oauth`）

| 操作 | 方法/路径 | 说明 |
| --- | --- | --- |
| `iam.oauth.operatorPlatforms.list` | GET `/operator_platforms` | 服务商平台列表 |
| `iam.oauth.operatorPlatforms.create` | POST `/operator_platforms` | 创建 component 实例 |
| `iam.oauth.operatorPlatforms.retrieve` | GET `/operator_platforms/{id}` | 含 ticket/token 状态摘要（不含密钥） |
| `iam.oauth.operatorPlatforms.update` | PATCH `/operator_platforms/{id}` | 名称、回调、启用状态 |
| `iam.oauth.operatorPlatforms.delete` | DELETE `/operator_platforms/{id}` | 仅未授权且无绑定可删 |
| `iam.oauth.operatorPlatforms.authorizationEntries.create` | POST `/operator_platforms/{id}/authorization_entries` | 返回 `preAuthUrl`、`expiresAt`、`authType` |
| `iam.oauth.operatorPlatforms.connectivityChecks.create` | POST `/operator_platforms/{id}/connectivity_checks` | 校验 ticket/token/回调可达 |
| `iam.oauth.operatorPlatforms.tokenRefreshes.create` | POST `/operator_platforms/{id}/token_refreshes` | 强制刷新 component token |
| `iam.oauth.resourceAccounts.list/create/retrieve/update/delete` | `/resource_accounts` | 增 `access_mode`、`operator_platform_id` |
| `iam.oauth.resourceAccounts.capabilities.retrieve` | GET `/resource_accounts/{id}/capabilities` | `func_info` 映射后的可用能力 |
| `iam.oauth.resourceAccounts.authorizationRefreshes.create` | POST `/resource_accounts/{id}/authorization_refreshes` | 刷新 authorizer token |
| `iam.oauth.resourceAuthorizations.list/create/retrieve` | `/resource_authorizations` | 授权事实与到期信息 |

### 8.2 IAM open-api（外部 wire）

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/iam/v3/api/iam/oauth/wechat/component_callbacks/{callbackPublicId}` | GET/POST | URL 校验 + ticket/授权事件 |
| `/iam/v3/api/iam/oauth/wechat/authorizer_callbacks/{callbackPublicId}/{authorizerAppid}` | GET/POST | 消息与事件、审核结果事件 |

两个操作声明 `x-sdkwork-wire-protocol: external`，响应体按微信协议（`success`/加密 XML/空串），不受 `SdkWorkApiResponse` 约束。

### 8.3 Deploy app / backend（`/app/v3/api`、`/backend/v3/api`）

| 操作 | 方法/路径 | 说明 |
| --- | --- | --- |
| `channel.releases.list` | GET `/apps/{appId}/channel_releases` | 按环境/渠道/状态过滤 |
| `channel.releases.create` | POST `/apps/{appId}/channel_releases` | 创建一次发布尝试 |
| `channel.releases.retrieve` | GET `/apps/{appId}/channel_releases/{id}` | 含 provider 回执摘要 |
| `channel.releases.statusSyncs.create` | POST `.../{id}/status_syncs` | 主动同步审核/发布状态 |
| `channel.releases.auditSubmissions.create` | POST `.../{id}/audit_submissions` | 提审 |
| `channel.releases.releases.create` | POST `.../{id}/releases` | 全量发布 |
| `channel.releases.grayReleases.create` | POST `.../{id}/gray_releases` | 灰度发布/调整比例 |
| `channel.releases.rollbacks.create` | POST `.../{id}/rollbacks` | 回退到指定版本 |
| `channel.templates.list/create` | `/apps/{appId}/channel_templates` | 模板库映射 |
| `channel.domains.list/create/update/delete` | `/apps/{appId}/channel_domains` | 域名台账与同步 |

### 8.4 内部能力 RPC（不对外）

`wechat_channel.capabilities`、`wechat_channel.mini_program.commit`、`submit_audit`、`query_audit`、`release`、`revert`、`gray_release`、`modify_domain`、`set_webview_domain`、`set_privacy`、`add_category`、`bind_tester`、`get_qrcode`、`get_quota`。

约束：mTLS + 调用方身份白名单；请求带 `request_id` 与 `trace_id`；响应只返回归一化结果与脱敏错误，不返回令牌。

### 8.5 错误映射

| 微信错误 | 归一化错误 | HTTP |
| --- | --- | --- |
| `40001/40014/42001` | `channel_token_expired`（刷新一次后重试） | 502 → 401 仅在最终失败 |
| `45009` | `channel_quota_exhausted` | 429 |
| `61039` | `mini_program_privacy_check_pending` | 409 |
| `61040` | `mini_program_private_infos_missing` | 422 |
| `44002` | `mini_program_release_payload_missing` | 422 |
| `85013/85014` | `channel_domain_limit_exceeded` | 409 |
| 网络超时 | `channel_provider_timeout` | 504 |

## 9. 发布流水线

### 9.1 发布投影

Deploy 包带自有清单 `sdkwork.deploy-package.v1.json`，微信工程不接受该文件：

1. 解包 → 校验清单与 `app.json`；
2. 剥离清单文件；
3. 生成 `project.config.json`（`appid`、`compileType=miniprogram`、`miniprogramRoot`）；
4. 校验主包/分包体积（2MB / 20MB）；
5. 重新压缩并记录 `manifest_sha256`。

投影失败不进入上传，错误码 `channel_projection_failed`。

### 9.2 直连路径

1. 客户上传代码上传密钥并配置 IP 白名单（敏感配置不入 Deploy）；
2. `miniprogram-ci upload --pp --ver <version> --desc <build>`；
3. 提审与发布走 `miniprogram-ci` 的审核/发布命令或微信后台人工；
4. 平台记录 `channel_release` 与结果，供计费与审计。

### 9.3 代管路径

见 §4.4。关键约束：

- 草稿由平台自有的"开发小程序"上传；官方文档表述为开发者工具，CI 属同一上传通道，需在联调阶段验证并记录证据。
- `commit` 的 `ext_json` 只能取模板子集：`pages`/`subPackages` 不可新增页面或分包。
- `submit_audit` 的 `item_list ≤ 5`，类目必须已在授权方配置。
- `release` 请求体为空也必须携带 `data`，否则 `44002`。
- 回退仅保留最近 5 个版本，且回退后不可再次回退。

### 9.4 状态机

```text
channel_release:
  draft → projected → uploaded → audit_submitted → in_review
        → approved → releasing → released
  旁支：rejected / withdrawn / deferred / failed / rolled_back / superseded

deploy_deployment（沿用现有枚举）:
  PENDING → SUBMITTING → PENDING_REVIEW → IN_REVIEW → APPROVED → LIVE
  终态：LIVE / REJECTED / FAILED / ROLLED_BACK / CANCELLED
```

微信审核态映射：`0→approved`、`1→rejected`、`2→in_review`、`3→withdrawn`、`4→deferred`。Deploy 不推断，只投影。

### 9.5 灰度与回退

- 灰度：`gray_percentage` 0–100，可多次调大；0 时必须二选一 `support_debuger_first` / `support_experiencer_first`。
- 回退：`revertcoderelease` 的 `action=get_history_version` 取可回退版本，再以 `app_version` 指定；记录 `rollback_of_release_id`。
- 回退属于发布事实，不能删除历史记录，只能追加。

### 9.6 域名、类目、隐私、体验者

| 能力 | 规则 | 落地 |
| --- | --- | --- |
| 服务器域名 | 每类 ≤ 200，每月 50 次，须 ICP 备案，不支持 IP | `channel.domains` + 审批流，禁止自动重试 |
| 业务域名 | ≤ 300，仅 https 无端口 | 域名台账 + 校验文件托管（复用现有 verification file） |
| 平台自身域名 | 授权方域名只能取平台已登记域名 | 平台级登记，发布前核对生效域名 |
| 类目 | 需资质 `media_id`，审核事件 `wxa_category_audit` | 类目申请作为独立命令 |
| 隐私 | `privacy_ver` 1 现网 / 2 开发版；联系方式四选一；境外主体需 `store_region` | 提审前置校验 |
| 体验者 | `bind_tester`/`unbind_tester`/`get_tester` | 体验版验收流程 |
| 名称/头像 | 改名每年 2 次；审核事件回调 | 运营审批后执行 |

## 10. 管理端与租户端

### 10.1 服务商控制台（IAM OAuth）

- `/admin/iam/oauth/operator-platforms`：component 配置、回调地址、ticket 状态灯、全网发布进度、连通性自检。
- `/admin/iam/oauth/authorized-accounts`：授权方资产（范围、到期、最近事件、解绑引导）。
- `/admin/iam/oauth/activity`：授权事件、令牌刷新、失败重试时间线。
- 授权入口动作：选择 `auth_type` → 生成二维码/跳转链接 → 轮询授权结果。

### 10.2 应用中心（App Center）

- 集成抽屉增加"接入模式"维度：自有直连 / 平台代管 / 外部服务商；选择代管时从授权方资产中选择。
- 发布看板：环境、渠道、模板、版本、审核态、灰度、回退点、失败原因。
- 模板库：Deploy 模板版本 ↔ 微信模板映射。
- 域名/隐私/类目：只读回显 + 受控变更。

### 10.3 租户自助

接入向导：选模式 → 填 AppID（直连）或扫码授权（代管）→ 绑定环境 → 自检 → 首次发布。引导文案覆盖"未全网发布只能测试号授权""权限集未授权不可用""域名必须备案"等官方约束。

## 11. 商业化

### 11.1 权益键（membership entitlement）

| 键 | 类型 | 说明 |
| --- | --- | --- |
| `channel.accounts.max` | 数量 | 可绑定渠道账号数 |
| `channel.managed_accounts.max` | 数量 | 可代管授权方数 |
| `channel.publishes.monthly` | 数量 | 每月发布次数 |
| `channel.operator_platforms.max` | 数量 | 可登记 component 实例数 |

### 11.2 计量事件

`channel.account.bound`、`channel.publish.submitted`、`channel.release.completed`、`channel.managed_account.month`。事件写入 usage measurement，经 `PriceService` 计价，不新建账单表。

### 11.3 套餐

| 套餐 | 直连账号 | 代管小程序 | 月发布 | 模板 | 服务 |
| --- | --- | --- | --- | --- | --- |
| 入门 | 1 | 0 | 20 | 3 | 自助 |
| 专业 | 3 | 10 | 200 | 20 | 工单 |
| 服务商 | 不限 | 不限 | 按量 | 不限 | 专属 + SLA |

试用 14 天；超额前置拦截并给出升级路径；账单可按发布流水对账。

## 12. 安全与合规

- 密钥：AES-256-GCM；非显式开发部署在启动期要求 `SDKWORK_IAM_SIGNING_MASTER_SECRET`（`assert_production_hardening` 已实现），缺失即 fail-closed；显式开发 profile 保留 base64 回退以便本地运行，该例外只对开发姿态生效。
- 日志：令牌、ticket、EncodingAESKey、refresh token 一律脱敏，禁止进入 trace 属性与错误消息。
- 回调：验签 + 解密 + appid 校验 + 时间窗 + 重放集合；入口限流与 IP 白名单（微信回调 IP 每日同步）。
- 越权：资源账号按租户 + 组织隔离；服务商跨租户访问必须经授权关系，不复制数据。
- 合规：第三方平台需企业主体与官网、开放平台认证；未接入登录授权的"明文 AppSecret"模式属高风险，产品不得引导。
- 数据：授权撤销后保留最小审计事实，删除凭据并标记 `revoked`；客户可导出授权记录。

## 13. 分期实施与验收

| 阶段 | 周期 | 交付 | 验收 |
| --- | --- | --- | --- |
| P0 契约与安全底座 | 2–3 周 | 表/索引、状态机、回调框架、secret fail-closed、契约与生成 SDK | 校验器全绿；密文迁移可回滚；故障注入通过 |
| P1 直连闭环 | 2–3 周 | 发布投影、CI 上传、提审/审核/发布/回退、令牌刷新 | 真实小程序完成全链路；重复回调幂等 |
| P2 第三方平台接入 | 4–6 周 | ticket/token/pre_auth/auth_code/授权事件/消息回调/全网发布 | 测试第三方平台通过 4 项检测；授权三事件正确 |
| P3 小程序托管发布 | 4–6 周 | 模板库、commit、隐私检测、提审、发布、灰度、回退、域名/类目/隐私/体验者 | 一个模板发布到 ≥3 授权方；灰度与回退可验证 |
| P4 公众号托管 | 3–4 周 | 菜单/素材/订阅通知/网页授权/消息回调走 component | 代管公众号菜单发布与网页授权登录 |
| P5 商业化 | 3–4 周 | 权益/计量/套餐/运营后台/SLA/审计报表 | 扣费与配额可对账；超额不越权 |
| P6 多平台抽象 | 按需 | 支付宝/抖音 driver | 编排层零改动接入第二平台 |

## 14. 风险与开放项

| 风险 | 影响 | 处置 |
| --- | --- | --- |
| 第三方平台审核 + 全网发布周期不可控 | 阻塞 P2 验收 | 尽早提交资质；先用测试号联调；把"全网发布"作为独立里程碑 |
| 草稿上传通道需联调验证 | P3 可能返工 | 先用平台开发小程序 + CI 打通，保留开发者工具兜底 |
| 密钥 fail-closed 影响存量 | 启动失败 | 双读窗口 + 迁移任务 + 回滚开关 |
| Deploy 审核态写入缺陷 | 状态不一致 | 先修 rowcount 与转移校验，再接真实审核 |
| 微信限流（45009、域名 50/月、快速注册 5/月） | 运营受阻 | 配额查询 + 审批流 + 熔断告警 |
| 多租户跨域授权 | 越权风险 | inbox 认领模型 + 授权关系 + 审计 |
| 私有化无公网回调 | 服务商模式不可用 | cloud-only；桌面/standalone 仅直连；中继列为 P6 |

## 15. 参考

- [ADR-20261121-wechat-channel-dual-mode](../decisions/ADR-20261121-wechat-channel-dual-mode.md)
- `TECH-2026-06-09-appbase-oauth-system-design.md`（身份模型）
- 微信官方：component_verify_ticket、授权事件推送、pre_auth_code、api_query_auth、消息与事件推送、全网发布检测、代码管理（commit/submit_audit/release/revert/gray）、域名/隐私/类目。

## 16. 实施状态（2026-11-24）

| 能力 | 实现位置 | 状态 | 证据 |
| --- | --- | --- | --- |
| component ticket/token（单飞锁、提前刷新、ticket 顺序与告警） | IAM `wechat_component_token*` / `wechat_component_ticket*` | ✅ | IAM web-adapter 298 测试 |
| 扫码授权 / auth_code 换取 / refresh token 轮换 / 账号快照回填 | IAM `wechat_component_authorization` / `grant` / `authorizer` | ✅ | 同上 + 授权集成测试 |
| 授权事件与消息回调（验签、解密、去重、全网发布应答） | IAM open-api callbacks | ✅ | open-api 路由标准 7/7 |
| 能力路由（菜单、代码、审核、发布、回退、灰度、域名、隐私共 10 项） | IAM backend `capability_invocations` | ✅ | backend 路由标准 12/12 + 审计留痕 |
| 发布记录 / 状态机 / 配额 / 计量 | Deploy `channel_release*` | ✅ | Deploy service 195 测试 |
| 发布编排与 IAM 能力 provider | Deploy `channel_release_publisher` / `channel_capability_*` | ✅ | 同上 |
| 直连模式（命令规划 + 沙箱执行） | Deploy `channel_release_direct` / `channel_ci_*` | ✅ | Deploy service 测试 |
| 管理端（服务商平台 / 授权方 / 发布看板 + 操作台） | CloudRouter admin-iam | ✅ | tsc + i18n 校验 |
| 订阅与计量（`channel_release_count`） | Deploy entitlement / usage | ✅ | Deploy service 测试 |
| 验收脚本与运行手册 | Deploy `tools/wechat_channel_acceptance.mjs`、runbooks | ✅ | dry-run + docs 校验 |

外部待办：

| 项 | 负责方 | 说明 |
| --- | --- | --- |
| 服务间凭据方案 | 安全评审 | Deploy 仓 ADR-20261124，目标态 `client_credentials` |
| 第三方平台资质 / 测试号 / 全网发布权限 | 运营 | 需人工申请，代码无法替代 |
| 真实端到端验收 | 运营 + 研发 | 执行验收脚本并归档证据 |

验收命令（Deploy 仓）：

```bash
node tools/wechat_channel_acceptance.mjs --dry-run --phase all
node tools/wechat_channel_acceptance.mjs --phase all --output target/acceptance/run.json
```
