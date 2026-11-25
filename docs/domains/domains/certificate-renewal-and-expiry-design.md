# 证书过期与续期设计（手动刷新 / 自动刷新）

Status: proposed · Owner: cloudrouter-platform · Surface: `/admin/domains/certificates`
关联设计: [admin-domain-center-design.md](admin-domain-center-design.md)、
[certificate-issuance-drive-archive-design.md](certificate-issuance-drive-archive-design.md)
上游权威: `sdkwork-deployments` `PLAN-2026-0003-certificate-hosting-single-and-wildcard.md` §12

---

## 1. 目标与范围

Let's Encrypt 证书只有 90 天有效期，过期即不可恢复（无法补签已过期的证书，只能重新签发）。本设计要保证：

1. **自动刷新**：到期前按窗口自动续期，失败可观测、可退避、不放假证书。
2. **手动刷新**：操作员随时可以主动触发续期，并看到真实进度与失败原因。
3. **到期处理**：分级告警、过期标记、旧版本兜底、与边缘/监听器的联动。

非目标：委托第三方 ACME 账户体系、证书吊销自动化（保留独立入口）、非托管（CUSTOM）证书的自动续期。

---

## 2. 现状审计

### 2.1 已实现

| 能力 | 位置 | 行为 |
| --- | --- | --- |
| 续期到期计算 | [`certificate_renewal.rs:204`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/certificate_renewal.rs#L204>) | `due = notAfter − max(renewBeforeDays, lifetime/3)`；`EARLIEST_RENEWAL_LIFETIME_DIVISOR = 3` |
| 自动续期扫描 | [`certificate_renewal.rs:412`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/certificate_renewal.rs#L412>) | 批量 50（≤100）、租约 300s（30–1800）、失败退避 300s 起倍增、上限 86400s |
| 续期 worker | [`certificate-renewal-worker/lib.rs:100`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-deploy-certificate-renewal-worker/src/lib.rs#L100>) | 轮询 30s、过期扫描 300s、两种动作（Renew / Sweep） |
| 过期标记 | [`certificate_renewal.rs:502`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-service/src/certificate_renewal.rs#L502>) | `sweep_expired_certificates` 把过证书置 `EXPIRED` |
| 续期台账 | `deploy_certificate_renewal` | 每次尝试一条，记录 previous/new 有效期窗口，可审计覆盖连续性 |
| 手动续期入口 | app-api `POST /app/v3/api/certificates/{id}/renew` | UI「立即续期」按钮已存在 |
| 读模型 | [`dto.rs` `CertificateResponse`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-deploy-contract/src/dto.rs#L742>) | 已含 `renewalDueAt`、`daysUntilExpiry`、`validityPhase`、`renewalStatus`、`renewalFailureCount` |
| 失败保底 | `store_issued_version` | 新版本失败时旧版本继续服务，不覆盖 last-good |

### 2.2 缺口

| 编号 | 缺口 | 证据 | 影响 |
| --- | --- | --- | --- |
| R1 | **手动续期被 autoRenew 限制** | [`certificates.rs:359`](<D:/sdkwork-space/sdkwork-deployments/crates/sdkwork-intelligence-deploy-repository-sqlx/src/certificates.rs#L350-L373>) `AND auto_renew = TRUE` | 关闭自动续期的证书**无法手动刷新**，与“手动刷新”需求直接冲突 |
| R2 | 手动续期不接受 `EXPIRED` | 同上 `status IN ('ACTIVE','FAILED')` | 过期后点“立即续期”被拒，只能重签 |
| R3 | 无“刷新/重读”语义 | 只有 `renew` | 操作员无法在不换证书的前提下刷新状态与到期信息 |
| R4 | 未消费 ARI | acme-service 已导出 `AriRenewalWindow`，deploy 未调用 | CA 建议的续期窗口被忽略，续期时机只能靠本地规则 |
| R5 | 无续期抖动 | 批量到期同时下单 | 同租户多证书在同一 tick 下单，撞 CA new-order 限额 |
| R6 | 无分级到期通知 | 只有列表徽章 | 30/14/7/3/1 天没有任何告警出口 |
| R7 | 手动与自动可能并发 | 两者都走 `open_certificate_order`，但手动路径先 `UPDATE renewal_status='PLANNED'` | 手动点击瞬间若 sweep 已选中，可能双下单 |
| R8 | 无 CA 配额前置拦截 | PLAN §10 未落地 | 到期限额时批量失败，退避与告警都滞后 |

---

## 3. 到期语义与时间轴（90 天 LE 为例）

```
签发(D0)                     续期窗口打开                      到期(D90)
  │                              │                                │
  ├── 60 天 ── 30 天 ── 14 ── 7 ── 3 ── 1 ── 0 ────────────────► 时间
  │           │        │     │    │    │    │
  │           │        │     │    │    │    └ EXPIRED（sweep 标记，版本保留）
  │           │        │     │    │    └ 1 天：严重告警
  │           │        │     │    └ 7/3 天：告警升级
  │           │        │     └ 14 天：提醒
  │           │        └ 30 天：首次提醒（默认 renewBeforeDays）
  │           └ renewalDueAt = notAfter − max(lead, lifetime/3) = D60
  └ 剩余 60 天时进入“健康”尾段
```

规则：
- **lead 取值**：`max(renewBeforeDays, floor(lifetime/3))`，且 `renewBeforeDays ∈ [7,90]`（DB CHECK 与常量一致）。
- **宽限期**：`RENEWAL_OVERDUE_GRACE_DAYS = 30`，用于“已到期但仍在宽限内”的告警分级，不延长证书实际有效期。
- **过期**：`active_not_after <= now` 由 sweep 置 `EXPIRED`；**已签发版本不解封**，边缘继续用旧证书直到替换，避免“标记过期即断站”。
- **REVOKED** 独立于过期，不参与自动续期。

---

## 4. 自动刷新（自动续期）

### 4.1 触发与选择

```sql
-- 每个 tick（30s）领取一批到期证书
SELECT ... FROM deploy_certificate
 WHERE deleted_at IS NULL
   AND certificate_source = 'MANAGED'
   AND auto_renew = TRUE
   AND status IN ('ACTIVE','FAILED')                    -- 不含 EXPIRED：过期走 R2 修复后的手动/特殊路径
   AND active_not_after IS NOT NULL
   AND active_not_after <= now + lead_window(cert)      -- lead = max(renew_before_days, lifetime/3)
   AND (renewal_next_attempt_at IS NULL OR renewal_next_attempt_at <= now)
   AND (renewal_lease_expires_at IS NULL OR renewal_lease_expires_at <= now)
 ORDER BY active_not_after
 LIMIT $batch
 FOR UPDATE SKIP LOCKED
```

- **抖动（R5）**：`renewal_next_attempt_at = due + jitter(0..10% window)`，同一批到期证书错峰下单；抖动在创建/续期时写入，避免每次扫描重算。
- **ARI（R4）**：续期前调用 `CertificateIssuer::renewal_window()`（acme-service `ari.rs`）；取 `min(ARI.start, 本地 due)`，ARI 不可用时静默回退本地规则，并记录 `renewal_source = ARI|LOCAL`。ARI 只影响“何时开始”，不改变“必须换新版本”。
- **顺序**：按 `active_not_after` 升序，最危险的最先处理。

### 4.2 执行与幂等

1. 领取证书行（租约 300s）→ 打开续期台账行（`PLANNED`）→ 开单（`renew:<renewal_uuid>` 幂等键）→ 由签发 worker 完成订单 → `store_issued_version` 写新版本并切换 `current_version_id`。
2. 幂等三件套：`(certificate_id, requested_version_no)` 唯一、`idempotency_key` 唯一、订单租约。重复扫描不会产生第二张订单。
3. **失败**：`renewal_failure_count += 1`、`renewal_next_attempt_at = now + min(300s × 2^n, 86400s)`、台账置 `FAILED` 并记稳定错误码；旧版本继续服务。
4. **不放假证书**：新版本落库前校验 SAN 集合、SPKI、有效期（复用签发侧 `validate_issued_material`），任何不一致都拒绝切换。

### 4.3 分级告警（R6）

| 阶段 | 触发 | 动作 |
| --- | --- | --- |
| `HEALTHY` | > 14 天 | 无 |
| `EXPIRING_SOON` | ≤ 14 天 | 列表徽章 + 审计事件 `certificate.expiry.warning` |
| `URGENT` | ≤ 3 天 | 升级告警（事件 + 运维通知出口） |
| `EXPIRED` | ≤ 0 天 | 事件 `certificate.expiry.expired`；边缘健康检查上报 listener 正在使用过期证书 |
| `RENEWAL_FAILING` | `renewal_failure_count ≥ 3` | 无论剩余天数，立即告警（失败比到期更早暴露） |

告警出口只做“事件 + 现有通知渠道”，不在证书模块内自建推送。

### 4.4 速率与配额（R8）

自动续期同样受 CA 限额约束（LE：50 证书/注册域/周、5 重复证书/周、300 新订单/3h）。设计上：

- 续期前走 `CertificateQuotaKind::NewOrders` 预检，超限则**推迟**（设置 `next_attempt_at = retry_after`），不计为失败；
- 同一 `(tenant, identifier set, key algorithm)` 已有 ACTIVE 且在续期窗口内 → 复用，不再下单（重复证书抑制）。

---

## 5. 手动刷新

### 5.1 两个语义必须分开

| 操作 | 端点 | 语义 | 是否换证书 |
| --- | --- | --- | --- |
| **立即续期**（renew） | `POST /app/v3/api/certificates/{id}/renew`（已有） | 主动换一个新版本 | 是 |
| **刷新状态**（refresh，新增 R3） | `POST /app/v3/api/certificates/{id}/refresh` | 重新读取当前版本、到期时间、续期状态；可选触发一次 CA 状态核对 | 否 |

### 5.2 立即续期的规则（修复 R1/R2/R7）

- 允许：`MANAGED` 且 `status ∈ {ACTIVE, FAILED, EXPIRED}`，**不再要求 `auto_renew = TRUE`**（手动刷新存在的意义就是“我自己决定什么时候续”）。
- 拒绝：`CUSTOM`（无 CA 可续）、`REVOKED`、已有进行中的续期（返回 `409 CERTIFICATE_RENEWAL_IN_PROGRESS`，并把该次续期标识回给调用方，便于轮询）。
- 未到 `renewalDueAt` 也可强制续期，但响应带 `warning: CERTIFICATE_RENEWAL_EARLY`，提示会消耗重复证书配额。
- 幂等：同一次续期用 `renew:<renewal_uuid>`；重复点击复用进行中的账本行，不新开订单。
- 并发（R7）：自动扫描与手动都先抢同一把 `renewal_lease`；抢不到的一方读取现状而不是再下单。

### 5.3 UI 交互

- 列表行「立即续期」→ 确认弹窗显示：当前到期时间、剩余天数、下一次自动续期时间（若开启）、本次操作会消耗的 CA 配额提示。
- 提交后按钮进入 loading，抽屉/行内出现进度：`PLANNED → PROCESSING → 新版本 → ACTIVE`（复用签发订单状态）。
- 失败展示稳定错误码 + 可读原因 + 下次自动重试时间。
- 「刷新状态」按钮：无需确认，直接重读并更新徽章与倒计时。
- 续期历史（已有）：保留 previous/new 窗口与触发方式（MANUAL / SCHEDULED），供审计。

---

## 6. 到期后的降级行为

1. `EXPIRED` 只改状态，不删版本、不禁用监听器；边缘继续服务旧证书，但健康检查必须上报 `tls.certificate.expired`。
2. 过期证书的「立即续期」按 §5.2 放行（重新签发新版本，不修补旧版本）。
3. 过期超过 `RENEWAL_OVERDUE_GRACE_DAYS` 仍失败：转入人工介入清单（事件 + 列表置顶），不再自动重试（避免无意义消耗配额）。

---

## 7. 数据与契约变更

| 变更 | 内容 |
| --- | --- |
| `deploy_certificate`（已有列） | `renewal_lease_owner/expires_at`、`renewal_next_attempt_at`、`renewal_failure_count`、`renew_before_days`、`active_not_before/after` |
| 新增 `deploy_certificate.renewal_source` | `LOCAL` / `ARI` / `MANUAL`，记录本次续期时机由谁决定 |
| 新增 `deploy_certificate.last_good_version_id` | 与 `current_version_id` 分离，明确“最近一次成功版本”在切换失败时仍可回读 |
| 契约 | `CertificateResponse` 增加 `renewalSource`、`renewalInProgress`（含 renewalId）；`POST /renew` 允许状态扩展到 `EXPIRED`；新增 `POST /refresh` 返回 `{code:0,data:{item}}` |
| 错误码 | `CERTIFICATE_RENEWAL_IN_PROGRESS`、`CERTIFICATE_RENEWAL_EARLY`、`CERTIFICATE_NOT_RENEWABLE` |

---

## 8. 测试与验收

| 层 | 用例 | 期望 |
| --- | --- | --- |
| 单元 | `renewal_due_at` 对 90 天证书、`renewBeforeDays=30` | due = D60；`renewBeforeDays=60` 时仍取 60；`renewBeforeDays=7` 时取 30（1/3 规则） |
| 单元 | 退避序列 | 300s → 600s → … → 86400s 封顶 |
| 单元 | 手动规则矩阵 | `autoRenew=false` 可续期；`EXPIRED` 可续期；`CUSTOM`/`REVOKED` 拒绝 |
| 集成（Pebble + Postgres） | 到期前自动续期 | 产生第二版本、台账记录 previous/new 窗口、`current_version_id` 切换 |
| 集成 | 手动与自动并发 | 只下一张订单，另一侧返回进行中 |
| 集成 | 续期失败 | 旧版本仍为 `current`，`failure_count` +1，`next_attempt_at` 按退避 |
| 集成 | 过期扫描 | `EXPIRED` 状态写入，版本不删除，监听器不受影响 |

验证命令：

```sh
cargo test -p sdkwork-intelligence-deploy-service certificate_renewal
cargo test -p sdkwork-intelligence-deploy-repository-sqlx --test certificate_renewal_postgres
cargo test -p sdkwork-intelligence-deploy-repository-sqlx --test certificate_issuance_pebble -- --ignored
```

---

## 9. 实施顺序

| 阶段 | 内容 | 依赖 |
| --- | --- | --- |
| R-1（修缺陷） | 去掉 `auto_renew = TRUE`；状态扩展到 `EXPIRED`；补 `CERTIFICATE_NOT_RENEWABLE`/`IN_PROGRESS` 错误码 | 无 |
| R-2（语义补齐） | 新增 `refresh` 端点与 `renewalInProgress` 读模型；手动提前续期告警 | R-1 |
| R-3（自动增强） | 续期抖动、ARI 消费、`renewal_source`、配额预检延后 | 签发链路 |
| R-4（可观测） | 分级事件与告警出口、过期健康检查上报 | R-3 |
| R-5（UI） | 立即续期确认弹窗 + 进度 + 刷新状态按钮 + 倒计时徽章 | R-2 |

R-1 是当前“手动刷新不可用”的直接修复，应最先落地。

---

## 10. 风险与取舍

| 风险 | 取舍 |
| --- | --- |
| 手动提前续期消耗 LE 重复证书配额 | 允许但显式告警；配额预检在 R-3 统一拦截 |
| ARI 不可用可能改变续期时机 | ARI 只提前、不推迟；失败回退本地规则并记录来源 |
| 过期证书继续服务存在合规/信任风险 | 由健康检查与告警暴露，而不是靠“标记过期即断站” |
| 手动与自动同时触发 | 统一用续期租约串行化，抢不到即读取现状 |
| 抖动导致续期略晚于 due | 抖动量 ≤ 10% 窗口（90 天证书约 3 天），不会挤占 30 天窗口 |
