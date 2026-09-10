# 团队账户计费体系 — 权威设计与实施文档

> 状态：**P0 已实施**（代码已落地并通过编译与单元测试）。本文档是团队计费的唯一权威描述，
> 取代并合并了同日的三份过程稿（billing-plan / resolution-logic / industry-standard）。
> 后续迭代（P1/P2）直接在本文档上更新，不再另立过程稿。

## 1. 目标与行业对齐

团队账户 = 用户可加入/被添加/被邀请进团队（IAM Organization），团队成员发起的推理请求
**自动以团队账户计费**，无需 key 显式绑定团队。

行业参照（OpenAI / Anthropic / AWS / GCP / 阿里云 / GitHub）的共识模型：

1. **主体层级**：租户 → 组织 → 凭证(Key)，计费主体 = 组织；
2. **财务职责分离**：BillingAdmin（管钱）与 Admin（管技术）分离（P1）；
3. **双模支付**：Prepaid 钱包（P0）+ Postpaid 月结（P2）；
4. **预算与熔断**：MONITOR / SOFT_CAP / HARD_CAP 三档（P1）；
5. **计量-计价-出账分离**：维度化 usage → 费率卡 → 聚合账单（P1 起）。

## 2. 关键架构事实（决定实现形态）

| # | 事实 | 影响 |
|---|------|------|
| 1 | **IAM 服务与网关使用不同数据库**（IAM 为 TEXT 主键体系，网关为 BIGINT 体系）；网关库中的 `iam_gateway_*` 表是网关自有镜像面，不是 IAM 原表 | 计费判定**不能**直查 `iam_organization_membership`，采用**投影表**：网关库新增 `iam_gateway_membership`（网关只读，生产者同步维护） |
| 2 | IAM `iam_organization_membership` 已有 `membership_kind`（owner/member）、`is_primary`、`status`、`left_at` | 角色/primary 语义已在 IAM 真源存在，**P0 无需 IAM migration**；投影 `role` 列直接映射 `membership_kind` |
| 3 | `sdkwork-account` 台账/钱包原生支持 `owner_type`（USER/ORGANIZATION）、`account_purpose`、`expires_at`、`idempotency_key` | 商业化记账原语齐备，**account 仓库零改动** |
| 4 | usage 四表已预留 `owner_type/owner_id/owner_name_snapshot` 列（此前未写入） | 本轮启用写入，报表与钱包口径对齐 |
| 5 | 定价 region 偏好按 (tenant, org) 作用域、费率卡已有 `Organization` 主体类型 | 团队级定价免费获得，定价链路零改动 |
| 6 | 鉴权统一入口 `authenticate_api_key()`，仅 chat/responses/embeddings 三个端点产生 usage 记录 | 解析点接在这三个端点 + pipeline 链路，models/vendors/balance 等元数据端点不接线（不产生用量） |

## 3. 计费主体判定（实现逻辑）

### 3.1 判定树

```
请求 → authenticate_api_key(key) → AuthenticatedApiKeyContext{tenant, org, user}

resolve_billing_subject(context)：              【BillingSubjectResolver 端口，唯一判定点】

  前置排除：tenant_id <= 0（平台级）或 user_id <= 0（服务级 key）
      → Personal（行为与现状一致，不缓存）

  ① key.organization_id != 0（key 显式绑定团队上下文）
      → 校验 active 成员关系（同一投影查询）
          是成员   → Team(key.organization_id, source=KeyBound)
          非成员   → Err(MembershipRequired) → 403 拒绝
                     （key 声明主体失效，显式失败优于静默转个人；
                      行业对齐：OpenAI 移出组织即 key 失效）

  ② key.organization_id == 0 → 查投影表 active 成员关系：
       恰好 1 条        → Team(该 org, source=SingleMembership)
       多条且有 primary → Team(primary org, source=PrimaryMembership)
       多条且无 primary → Personal + 告警计数（ambiguous）
       0 条             → Personal
```

### 3.2 判定结果只决定"计费主体"，不影响

- **路由授权**：`subject.organization_id` 保持 key 原值，继续驱动 api_scope 快照匹配；
- **审计主体**：`user_id` / `api_key_id` 恒为真实成员与真实 key；
- **定价 plan**：P0 沿用 key 的 `pricing_plan_code`（组织级费率卡留 P2）。

### 3.3 数据流（已实现）

```
鉴权（不改） → ② BillingSubjectResolver（缓存 60s + 投影表只读查询）
    → ③ InvocationSubject{billing_organization_id, billing_owner}
        ├─ pipeline 链路：invocation_http / invocation_router 接线
        └─ relay 链路：openai_chat / openai_responses / openai_embeddings 接线
    → ④ GatewayBillingContext{organization_id=计费org, billing_owner}
        ├─ ⑤ 钱包：Team → owner_type=ORGANIZATION（缺失懒建户）
        │         Personal → owner_type=USER（现状不变）
        ├─ ⑥ 价格预检：PricingRegionPreferences::load(tenant, 计费org)
        └─ ⑦ 结算 + ⑧ usage 四表：
             organization_id = 计费org
             owner_type/owner_id/owner_name_snapshot：
               个人 (1, user_id)   团队 (2, team_org, 团队名快照)
             user_id / api_key_id 恒为真实成员与真实 key
```

## 4. 数据模型

### 4.1 网关投影表 `iam_gateway_membership`（新增）

```sql
CREATE TABLE iam_gateway_membership (
  id BIGINT PRIMARY KEY,
  uuid CHAR(36) NOT NULL,
  tenant_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL,                          -- 映射 IAM membership_kind（owner/member）
  is_primary INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL,                     -- 1 = active（对齐网关整数编码）
  organization_name_snapshot TEXT,
  membership_source TEXT NOT NULL,
  source_membership_id TEXT,                   -- IAM 原始 membership id（TEXT）
  created_at/updated_at/deleted_at ...
  UNIQUE (tenant_id, organization_id, user_id)
);
CREATE INDEX idx_iam_gateway_membership_tenant_user
  ON iam_gateway_membership (tenant_id, user_id, status);
```

登记于三处（镜像格式）：
`database/modules/gateway-iam/ddl/baseline/postgres/0001_gateway_iam_baseline.sql`、
`database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql`、
`database/modules/gateway-iam/contract/table-registry.json`（`system_of_record:false` —— 真源在 IAM 库）。

### 4.2 投影生产者契约（IAM → 网关）

- **真源**：IAM 库 `iam_organization_membership`（TEXT 主键，status TEXT 'active'，membership_kind owner/member）。
- **生产者**（P0）：IAM 侧同步任务/运维脚本在成员变更时 upsert 网关库
  `iam_gateway_membership`（按 `(tenant_id, organization_id, user_id)` 幂等），
  置 `status=1/0` 反映 active/退出，`deleted_at` 软删。字段映射：
  `membership_kind → role`，`is_primary`，org 名称快照由生产者填充。
- **约束**：网关对该表**只读**（resolver 只 SELECT）；生产者唯一写。
- **P1**：成员变更后调用网关主动失效接口（`POST /internal/v1/billing-subject/invalidate`，
  body: tenant_id + user_id 列表）把 60s TTL 收敛到秒级。

### 4.3 团队钱包（sdkwork-account，零改动）

唯一键含 `owner_type`。团队钱包定位：
`(tenant, organization_id=team_org, owner_type='ORGANIZATION', owner_id=team_org, token_bank, TOKEN_BANK, GENERAL)`。
首扣缺失时懒建户（幂等收敛）。台账 `source_id` 恒记**实际发起成员的 user_id**（审计维度）。

### 4.4 预算表 `billing_budget`（P1，规划）

```sql
billing_budget (id, tenant_id, organization_id, period_type DEFAULT 'monthly',
  amount_*, enforcement_mode TEXT,  -- MONITOR | SOFT_CAP | HARD_CAP
  alert_thresholds JSONB, status, ...
  UNIQUE (tenant_id, organization_id, period_type));
```

## 5. 失效、降级与安全姿态

| 场景 | 行为 |
|------|------|
| 成员变更生效延迟 | TTL 60s 缓存；期间用量记入旧主体（usage 有 user_id 可事后校正报表口径） |
| 投影表不存在 | `PersonalFallbackBillingSubjectResolver` 降级恒个人 + 告警（fail-safe，不阻断网关启动；resolver 启动时 `table_ready()` 自检） |
| 存储瞬时错误（Transient） | 降级个人计费 + warn，**不缓存**（下请求自动重试） |
| MembershipRequired（key 绑 org 但非成员） | 403 `billing_subject_membership_required`，**缓存**（防失效 key 高频打库） |
| 团队钱包不存在/余额不足 | 首扣懒建户 → 预扣 fail-closed（现有"余额不足"错误路径） |
| 团队钱包并发热点 | 全团共享一行钱包，乐观锁 + 2 次重试；观察锁冲突 metrics，必要时分片 |
| 退出团队瞬间的在途请求 | 已预扣 hold 正常结算到团队钱包（按预扣上下文，不重新判定） |
| InternalService / 平台 key | 跳过判定，行为与现状一致 |

## 6. 角色模型与权限矩阵（商业化核心）

| 能力 | Owner | Admin | BillingAdmin(P1) | Member |
|------|:---:|:---:|:---:|:---:|
| 使用功能（key 调用，团队计费） | ✅ | ✅ | ✅ | ✅ |
| 创建/删除自己的 key（团队上下文） | ✅ | ✅ | ✅ | ✅ |
| 管理他人 key / 组织级设置 | ✅ | ✅ | ❌ | ❌ |
| 成员管理（邀请/移除/改角色） | ✅ | ✅ | ❌ | ❌ |
| 充值 / 预算 / 查看财务账单 | ✅ | ❌ | ✅ | ❌ |
| 查看团队用量报表 | ✅ | ✅ | ✅ | 仅本人 |
| 转让 Owner / 解散组织 | ✅ | ❌ | ❌ | ❌ |

P0 角色即 IAM `membership_kind`（owner/member）；`billing_admin` 为 P1 扩展
（IAM 侧扩展 membership_kind 取值或加 role 列，投影 role 列透传）。
用户可在多组织拥有不同角色；一人多团队用 `is_primary` 消歧。

## 7. 已实施代码清单（P0，全部完成）

### 7.1 sdkwork-cloudrouter

| 层 | 文件 | 内容 |
|----|------|------|
| domain | `src/domain/billing_owner.rs` ★新 | `BillingOwnerKind{Personal,Organization}`；`usage_owner_type()` 1/2；serde Serialize/Deserialize（命令持久化需要） |
| ports | `src/ports/billing_subject_resolver.rs` ★新 | trait（手工 `Pin<Box<dyn Future>>` 模式）；`BillingSubjectError{MembershipRequired,Transient}`；`ResolvedBillingSubject{kind,organization_id,organization_name_snapshot,source}`；来源 `KeyBound/SingleMembership/PrimaryMembership/ExplicitPersonal` |
| infra | `src/infrastructure/sql/postgres/billing_subject_resolver.rs` ★新 | `PostgresBillingSubjectResolver`（只读投影表）；`table_ready()` information_schema 自检；`billing_subject_resolver_for_pool()` 组合辅助；`PersonalFallbackBillingSubjectResolver` 降级实现 |
| app | `src/application/billing_subject_cache.rs` ★新 | `CachedBillingSubjectResolver`（TTL 60s/容量 10 万）；`invalidate()`；`BillingSubjectCacheMetrics`（hits/misses/membership_required/transient） |
| subject | `src/application/invocation/subject.rs` | `InvocationSubject` + `billing_organization_id`/`billing_owner`（默认 Personal/0）；`apply_billing_resolution()`；`billing_source_label()` |
| billing | `src/ports/gateway_billing_store.rs`、`src/application/invocation/billing_transaction.rs` | `GatewayBillingContext` + `billing_owner`；`wallet_owner_user_id()`/`wallet_owner_type()`；`billing_context()` 按计费主体派生 organization_id |
| wallet | `crates/.../gateway_billing_account.rs` | `account()` 按 owner_type 查询；`append()`/`create_hold()` 用团队主体 + `with_account_subject`；source_id 保持成员 user_id |
| settlement | `src/infrastructure/sql/postgres/usage_settlement_store.rs` | 结算取数带 owner_type；owner_type=2 时扣 ORGANIZATION 钱包 |
| usage | `src/ports/gateway_usage_recorder.rs`、`src/infrastructure/sql/postgres/gateway_usage_recorder.rs` | 两个命令 + `billing_owner/billing_owner_name`；`usage_owner_id()` 派生；trace/usage 两条 upsert 写 `owner_type/owner_id/owner_name_snapshot` |
| relay | `src/api/openai_runtime.rs`、`openai_invocation.rs`、`openai_chat.rs`、`openai_responses.rs`、`openai_embeddings.rs`、`openai_usage.rs` | `OpenAiRuntimeRouteConfig` + resolver 字段；共享辅助 `resolve_billing_subject_or_personal()`（MembershipRequired→403，Transient→warn+personal）；三端点鉴权后解析并 `with_billing()`；builder/trace/usage 命令全量透传 |
| pipeline | `crates/.../invocation_router.rs`、`invocation_http.rs`、`runtime.rs` | Options/State 全链路接线；两处生产站点经 `billing_subject_resolver_for_pool(pool)` 构造；`InvocationRuntimeRoutesInput`/`DatabaseRuntimeRoutesInput`/`OpenAiRuntimeRoutesInput` 透传 |

### 7.2 验证结果（2026-09-09）

- `cargo check -p sdkwork-cloudrouter-router-service` / `-p sdkwork-cloudrouter-edge-runtime`：通过，无自引入警告；
- `cargo test --lib`：router-service **481 passed / 0 failed**（含 billing_subject_cache 3 个新测试、
  gateway_billing_account 团队主体测试、命令字面量测试）；edge-runtime 测试通过；
- DDL 三处登记与 table-registry 完整。

## 8. 决策记录（D1–D14，均已定稿）

| # | 决策 | 结论 |
|---|------|------|
| D1 | 团队载体 | 复用 IAM organization（身份模型统一，/iam/* 自动转发） |
| D2 | 角色落点 | 直接映射 IAM `membership_kind`（owner/member），P0 零 IAM migration；billing_admin 为 P1 扩展 |
| D3 | 团队钱包键 | owner_type='ORGANIZATION' + owner_id=team_org + purpose=GENERAL（懒建户幂等） |
| D4 | 团队额度控制 | 钱包余额 fail-closed（预扣天然控制）；预算表 P1 |
| D5 | 充值归属 | owner/admin 发起充值到团队钱包 |
| D6 | member 建 key | 可自建团队 key（受余额 fail-closed 天然约束） |
| D7 | 自助申请加入 | P0 不做 |
| D8 | 请求头临时切团队（X-Billing-Org） | P0 不做 |
| D9 | key 级 personal 逃生通道 | 不做（无 personal 逃生通道，纯规则） |
| D10 | 缓存 TTL | 60s；P1 主动失效接口收敛到秒级 |
| D11 | usage org 口径 | `organization_id` 写计费 org；owner_type/owner_id/owner_name_snapshot 同步写入；user_id/api_key_id 恒记真实成员与真实 key |
| D12 | 预算默认模式 | 新团队默认 SOFT_CAP（体验优先），付费企业默认 HARD_CAP |
| D13 | 预算维度 | 按人民币金额（财务语言） |
| D14 | BillingAdmin 看 key 明细 | 否，只看聚合费用（隐私与财务分离） |

**核心计费语义（第 2 轮确认）**：只要 key 能解析出用户、且用户在 Organization 中，
就用 Organization 账户计费（动态成员关系判定，非 key 静态绑定）；key 显式绑定组织
（org≠0）作为多团队下的确定性 override，但同样必须校验成员关系。

## 9. 路线图

| 阶段 | 内容 | 里程碑 |
|------|------|--------|
| **P0 团队计费 MVP** ✅ | 动态计费判定 + 投影表 + 团队钱包 + usage owner 归因 + 全链路接线 | 多人共用团队账户消费，可上线收钱（待 §10 验证） |
| **P1 财务与治理** | IAM 成员管理闭环（自服务建组织/邀请/直接添加/退出/角色 API）+ 投影生产者实现与主动失效接口 + BillingAdmin + Budget 三档熔断 + webhook 告警（复用 `integration_webhook_endpoint`）+ Credits 赠送金（台账 expires_at）+ 日/月账单导出 + 成员分摊报表 + org_audit_log | 中小团队自助购买，财务可对账 |
| **P2 企业版** | Postpaid 月结 + 信用额度 + 组织级合同价费率卡（`AdminRateCardSubjectType::Organization` 已预留）+ 组织级限速 tier + Project 维度 + SSO/SCIM | 可签企业合同 |
| **P3 规模化** | 分销/代理分成（复用 referral 基础）、seat 混合计费 | 渠道生态 |

前端（团队中心/组织上下文/团队钱包页/用量按 org 过滤）随 P1 一并交付。

## 10. 上线验证清单（P0 验收）

dev 环境（本地 gateway 3900；E2E 用 `X-Api-Key` = `iam_gateway_api_key.key_secret_plaintext`，
不可用 Bearer，40001）：

1. 投影表已建且生产者已同步成员数据；
2. 无团队用户 + 个人 key → 个人钱包预扣/结算，usage owner=(1, user_id)；
3. 加入团队用户 + org=0 的旧 key → 自动切团队钱包，usage owner=(2, team_org)，user_id 仍为本人；
4. 多团队用户按 primary 消歧；无 primary → Personal + 告警计数；
5. key 绑 org 但用户已被移出 → 403 `billing_subject_membership_required`；
6. 团队余额不足 → fail-closed 拒绝；
7. 退出团队 → ≤60s 回个人计费；在途 hold 正常结算到团队；
8. relay（/anthropic/v1/messages 等）与 pipeline 双链路重复 2–6；
9. 路由授权不受影响：团队计费用户仍按其 key 的 api_scope 正常选路；
10. 投影表删除后网关启动 → 降级恒个人 + 告警，不阻断流量。
