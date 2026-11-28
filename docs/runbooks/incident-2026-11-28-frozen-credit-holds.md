# 事故分析：算力积分被大量冻结且长时间无法结束（2026-11-28）

- 报告时间：2026-11-28 01:30（Asia/Shanghai）
- 报告对象：CloudRouter 计费模块（`acct_hold` 预扣冻结）
- 用户可见症状：`套餐 Free / 积分余额 214.2577 / 可用 1.8159 · 冻结 212.4418`
- 处置性质：只读代码审计 + 并发缺陷修复（本次提交）+ 部署/运营建议

---

## 1. 结论摘要

| 结论 | 状态 | 证据 |
|------|------|------|
| 「冻结」不是扣费流水，而是 `acct_account.frozen_amount`，唯一来源是未关闭的 `acct_hold`（预扣冻结） | **已确认** | `crates/sdkwork-cloudrouter-edge-runtime/src/gateway_balance_account.rs:49-50` 直接读 `available_amount`/`frozen_amount`；`acct_account.frozen_amount` 只由 hold 的建立/结算/释放/过期改动（`sdkwork-account/.../postgres_hold.rs:1844`） |
| 冻结额几乎等于余额，不是"漏结算"，而是**多路并发预扣把整个钱包占满** | **高度吻合** | 默认策略单笔冻结上限 = 钱包总额的 `max_hold_share_bps = 2500`（25%，`sdkwork-account/crates/sdkwork-account-service/src/domain/billing_policy.rs:92`，`total_points = available + frozen`）。`214.2577 × 25% = 53.5644`，而 `212.4418 ≈ 3.97 × 53.5644`，即约 **4 笔都顶到上限的预扣** |
| 请求结束方式里有多条"故意保留冻结"的路径，保留期 = hold TTL 默认 **30 分钟** | **已确认** | `billing_transaction.rs:243`（provider 成功即保留）、`:377`（无可计费用量 → 报错 → 保留）、`gateway_billing_account.rs:963`（TTL 30 min） |
| 并发下结算/释放会因钱包乐观版本冲突直接失败，**旧代码没有重试**，冻结因此真的留在那里 | **已确认并修复** | `postgres_hold.rs:1873-1877` 返回 `Conflict`；旧 `settle_hold`/`release_hold` 单次调用，失败后 `on_error` 因 `provider_completed=true` 不再释放。本次接通 `retry_account_conflict` |
| 预扣重试会重新生成 `expires_at`，导致同一幂等键的请求哈希漂移，第 2 次重试必被判"payload drift"，第 1 次已冻结的 hold 无人认领 | **已确认并修复** | 旧 `billing_transaction.rs` 预扣重试循环 + `create_hold` 内 `Utc::now()+ttl`（`gateway_billing_account.rs:193` 旧行）；现已改为 store 内单次构建命令 + 稳定哈希重放 |
| 旧部署版本**根本没有自动过期**：全库 hold 清扫 worker 是 2026-11-26 才合入的，尚未进入任何 release tag | **已确认** | cloudrouter `0756f207`（2026-11-26）引入 `maybe_spawn_postgres_hold_sweep_worker`（`runtime.rs:2942`），account `87c5535`（2026-11-26）引入 `sweep_expired_holds`（`postgres_hold.rs:946`）；`git tag --contains 0756f207` 为空，本地最新 tag 为 `v0.4.11`（2026-10-17）；`deployments/` 里镜像仍钉 `0.4.7`/`0.4.11`（线上实际镜像 tag 请以镜像仓库为准） |
| 后端提前终止不会执行任何释放路径，只能等清扫 | **已确认（设计边界）** | 释放只在 `on_error`/`after` 钩子里做；进程被 kill / 重启 / OOM 时钩子不运行 |

一句话：**冻结 = 还在 `held` 状态的预扣单。并发 4 路左右就能把钱包按 25%/笔 的默认上限冻结干净；而只要其中任一路没有正常结算（客户端中断、无可计费用量、结算撞版本冲突、进程被提前终止），这笔钱要等 30 分钟 TTL 到期、并且只有清扫 worker 在跑时才会回到可用余额。旧版本没有清扫 worker，所以永远不回。**

---

## 2. 冻结生命周期（谁写、谁会结束）

| 动作 | 代码 | 对 `acct_account` 的影响 | 写流水吗 |
|------|------|--------------------------|----------|
| 预扣（请求前） | `create_hold` `gateway_billing_account.rs:256` → `create_account_hold` | `available -= X`，`frozen += X` | 否 |
| 结算（请求成功） | `settle_hold` `gateway_billing_account.rs:551` → `settle_account_hold` | `frozen -= X`，按实际消费借记，差额回 available | 是，1 条 `consumption` |
| 释放（请求失败/免收） | `release_hold` `gateway_billing_account.rs:340` → `release_account_hold` | `available += X`，`frozen -= X` | 否 |
| 过期（TTL 到期） | `sweep_expired_holds` `sdkwork-account/.../postgres_hold.rs:946` | 同释放 | 否 |
| 过期后补扣 | `EXPIRED_HOLD_CAPTURE_SUFFIX` `gateway_billing_account.rs:36` | 借记 available | 是，1 条 `hold-expired-capture` |

因此，**只有在 `status=1 (held)` 的 hold 才会计入"冻结"**；`status=2/3/4` 都不会。

---

## 3. 为什么"冻结很多"

1. **预扣量是上界，不是实际用量。** `estimated_amount`（`billing_transaction.rs`）用「请求体字节/4 作输入 token + `max_tokens × n` 作输出 token」估上界，再乘价格。实际消耗往往只有它的几十分之一。
2. **单笔封顶 25% 钱包，但并发不封顶。** `share_cap = 25% × (available+frozen)`，也就是说 4 路并发各自都能拿到 25%，合计 100%。这就是截图里 99% 冻结的形态。
3. **并发额度检查是 TOCTOU。** `authorize_charge` 读到的 available 与随后 `create_hold` 之间没有锁，多个请求可同时通过准入。
4. 大型媒体请求（视频/音乐/图片 N 张、长 TTS）按请求声明量预扣，单笔就可能是几十到上百点。

## 4. 为什么"无法结束"

按发生概率排序：

1. **部署版本没有清扫 worker（最可能）。**
   - 自动过期逻辑 `sweep_expired_holds` 与 worker 均在 **2026-11-26** 才合入，且不在任何 tag 中；
   - 在此之前，只有运营手动调用 `POST /backend/v3/api/wallet/holds/expire`（`sdkwork-account/.../hold_router.rs:340`）才会释放过期 hold，而且必须带租户/组织；
   - 于是任何遗留 hold 会一直 held，直到有人手工清扫。

2. **保留了冻结却没有对账（设计如此）。** `BillingTransactionInterceptor::on_error`（`billing_transaction.rs:243`）在 provider 已成功时故意不释放，等待结算/对账。可落到这条路径的场景：
   - 流式响应被客户端中断，且中断发生在任何可计入用量之前 → `partial_usage = None` → `actual_amount = None` → `settlement did not produce a billable amount`（`billing_transaction.rs:377`）→ 保留；
   - 供应商响应里拿不到 usage / 计价快照不全；
   - 用量持久化失败（`usage_recording_failure_count > 0`）；
   - 结算本身失败（见第 3 条）。

3. **并发结算撞钱包乐观版本锁，旧代码不重试。** `acct_account` 的每次写入都是
   `UPDATE ... WHERE id=$1 AND version=$n`（`postgres_hold.rs:1854`）。同一钱包上两笔并发结算，后到的
   `rows_affected = 0` → `"commerce account balance update was not applied atomically"`（`postgres_hold.rs:1875`）。
   旧 `settle_hold` / `release_hold` 单次调用，失败后回到 `on_error`，又因为 `provider_completed = true` 保留冻结
   → 这笔钱一定留到 TTL。**这正是"多线程情况下出错、冻结积分无法完整消耗"的机制。**

4. **预扣重试的幂等哈希漂移。** 旧 `before` 钩子最多重试 3 次预扣，每次 `create_hold` 都用新的
   `Utc::now() + ttl` 作为 `expires_at`，而 `expires_at` 在请求哈希里。若第一次其实已提交（连接中断、提交回执丢失），
   第二次就会被账户侧判为 `idempotency key was used with a different request hash`，最终请求失败，
   而第一次的 hold id 从未写进 invocation → 后续任何钩子都无法结算或释放它。

5. **后端提前终止。** 释放/结算都在请求生命周期钩子里；进程被重启、OOM kill、强制终止时钩子不执行。
   这类冻结在"有清扫 worker"的版本里最多多留 30 分钟 + 一个清扫周期；在没有 worker 的版本里永不释放。

6. **潜在放大器：清扫是"全有或全无"。** `sweep_expired_holds` 在一个事务里逐条处理，
   任意一条报错（例如账户已删、`frozen < amount` 触发 `hold expire exceeds frozen balance`，`postgres_hold.rs:1177`）
   会让**整批回滚**，于是每一轮清扫都失败、所有过期 hold 永远释放不了。建议改为逐条 SAVEPOINT + 跳过并计数告警。

7. **潜在放大器：订单侧的 hold 没有 `expires_at`。** `sdkwork-order` 的
   `create_account_value_hold` 传 `expires_at = None`（`sdkwork-order/.../store_adapter.rs:186`），
   而两个清扫都只处理 `expires_at IS NOT NULL`。这类 hold 一旦没被 settle/release（例如退款 provider 失败后重试路径），
   就是**永久冻结**，且没有任何自动恢复入口。需要订单侧补 TTL 或补对账任务。

---

## 5. 本次代码修复（cloudrouter 仓库）

文件：`crates/sdkwork-cloudrouter-edge-runtime/src/gateway_billing_account.rs`

1. 新增 `retry_account_conflict`（`:83`）+ `is_account_conflict`：只对钱包版本竞态做**有界、带抖动的重放**
   （`ACCOUNT_CONFLICT_ATTEMPTS = 4`，指数退避 4/8/16 ms + 0-4 ms 抖动）。
   - 只重试 `Conflict`，且排除 `idempotency ... different request hash`（重放无法修复漂移）；
   - 余额不足、状态非法、校验失败、存储失败一律不重试，避免拖慢 402。
2. `create_hold` / `settle_hold` / `release_hold_inner` / `append` 全部走该重放：
   命令与请求哈希**只构建一次**，重试时 clone 后重放，保证同一幂等键下哈希稳定
   —— 第一次已提交的 hold 会被"重放成同一个 hold"，而不是被判 payload drift。
3. 删除 `billing_transaction.rs` 里会重建 `expires_at` 的预扣重试循环（本次修改前），
   改由 store 层统一重试；这样并发预扣/结算/释放都不会再"回滚了事务却留下冻结"。

> 说明：`on_error` 在 provider 已成功时保留冻结，是**商业策略**（宁可冻结也不漏收）。本次未改。
> 若要消除"无可计费用量也冻结 30 分钟"的体验问题，建议单独评审：当 `actual_amount` 为空且没有任何用量事实时，
> 直接走 `release_without_charge`（`billing_transaction.rs` 已有该函数）而不是保留。

---

## 6. 现场诊断 SQL（只读）

```sql
-- 1) 钱包快照：可用 / 冻结 / 合计
select id, tenant_id, organization_id, owner_type, owner_id,
       available_amount, frozen_amount,
       available_amount + frozen_amount as total
  from acct_account
 where asset_code = 'token_bank'
 order by frozen_amount desc
 limit 20;

-- 2) 冻结明细：谁冻结的、什么时候到期
select uuid, tenant_id, account_id, amount, business_no,
       created_at, expires_at, now() - expires_at as overdue
  from acct_hold
 where status = 1
 order by expires_at
 limit 100;

-- 3) 已过期但仍在冻结：>0 说明清扫没跑或一直失败（第 4.1 / 4.6 条）
select count(*) as overdue_holds, coalesce(sum(amount), 0) as overdue_points
  from acct_hold
 where status = 1 and expires_at is not null and expires_at <= now();

-- 4) 永远不会被清扫的 hold：>0 说明有订单侧/无 TTL 的 hold（第 4.7 条）
select count(*) as no_expiry_holds, coalesce(sum(amount), 0) as no_expiry_points
  from acct_hold
 where status = 1 and expires_at is null;

-- 5) 结算失败后留下的未结算用量事实（需要开启异步结算 worker 才会被对账）
select settlement_status, count(*)
  from ai_metering_usage
 group by settlement_status
 order by settlement_status;

-- 6) 请求维度的判定：hold / 消费流水 / 计费用量三者的关系
select h.business_no, h.status, h.amount, h.settled_amount, h.expires_at,
       (select count(*) from acct_ledger_entry l
         where l.request_no = split_part(h.business_no, ':', 2)) as ledger_rows
  from acct_hold h
 where h.status in (1, 4)
 order by h.id desc
 limit 50;
```

判读：

- 第 3 项 `overdue_holds > 0` 且持续增长 → 清扫未运行/被禁用/一直抛错；
- 第 4 项 `no_expiry_holds > 0` → 存在订单侧 hold，任何清扫都不会处理；
- 第 5 项 `settlement_status = 0` 大量积压 → 同步结算失败且异步 worker 未开启。

---

## 7. 处置与预防

**立即**

1. 部署包含清扫 worker 的版本（cloudrouter ≥ `0756f207`，account ≥ `87c5535`；当前 `agent.app.config.json` 为 `0.4.13`）。
   上线后确认日志出现 `released expired prepaid holds`（`runtime.rs:2953` 附近）。
2. 不能立刻发版时，对受影响租户/组织调用
   `POST /backend/v3/api/wallet/holds/expire`（需 `tenantId`、`organizationId` 与幂等键）释放过期 hold。
   **不要手工 UPDATE `acct_account`**，否则 `acct_hold` 与余额会永久不一致，后续结算会撞
   `hold settle exceeds frozen balance`。
3. 确认 `SDKWORK_CLOUDROUTER_HOLD_SWEEP_INTERVAL_SECONDS` 未被设为 `0`（默认 60，`0` = 关闭清扫）。
4. 打开 `SDKWORK_CLOUDROUTER_USAGE_SETTLEMENT_WORKER_ENABLED=true`，让同步结算失败的用量事实能被对账，
   否则这些请求在 TTL 后变成"免费调用"。

**策略层（需要产品确认）**

- 调低计费策略行的 `maxHoldShare`（默认 25%）：10% 即可支持约 10 路并发预扣而不占满钱包。
- 调低 `outputTokenCeiling`（默认 32768）或 `prechargeRatioBps`（默认 1x），减少单笔上界。
- 对免费额度用户单独设 `maxHoldShare`，避免 4 路并发就把免费额度冻结干净。

**工程层（建议后续单独立项）**

- 清扫改为逐条 SAVEPOINT + 跳过 + 计数告警（消除第 4.6 条的全批回滚风险）。
- 订单侧 hold 增加 `expires_at` 或单独的对账/释放任务（消除第 4.7 条的永久冻结）。
- 「provider 成功但无任何计费用量」改为立即 `release_without_charge`，把"冻结 30 分钟"变成"立即归还"。
- 为 hold 增加指标：`billing_hold_open_total` / `billing_hold_overdue_total`，并对 overdue 告警。

---

## 8. 验证

```bash
# 计费 store 单元测试（重放边界、有界性、非冲突错误不重试）
cargo test -p sdkwork-cloudrouter-edge-runtime --lib gateway_billing
#   → test result: ok. 8 passed; 0 failed
#     （含新增 conflict_retry_replays_only_lost_version_races、
#       conflict_retry_is_bounded_and_keeps_the_last_error）

# 计费契约测试（冻结/结算/过期补扣/并发重放等不变量）
cargo test -p sdkwork-cloudrouter-router-service --test gateway_billing_contract
#   → test result: ok. 13 passed; 0 failed
#     （含新增 wallet_mutations_replay_lost_optimistic_version_races）

# 编译与格式
cargo check -p sdkwork-cloudrouter-edge-runtime --lib
rustfmt --edition 2021 --check \
  crates/sdkwork-cloudrouter-edge-runtime/src/gateway_billing_account.rs \
  services/sdkwork-cloudrouter-router-service/src/application/invocation/billing_transaction.rs
```

> 说明：本次验证时工作区里还有另一份正在进行的 `open_recharge` 改动，
> 期间 `crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs` 一度编译失败（与计费无关）。
> 上述结果是在该改动修复后重新执行得到的。
