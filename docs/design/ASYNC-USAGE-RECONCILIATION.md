# 异步用量对账（Async Usage Reconciliation）设计方案

> 状态：**迁移已落地，worker 待实现**。`ai_metering_async_task` 已进入
> schema registry、baseline、contract 与迁移 `0046_ai_metering_async_task`；
> 后扣语义与 worker 仍需实现后开启。
>
> 目标：解除 `POST /v1/batches`、`POST /anthropic/v1/messages/batches`、
> `background: true` 的 Responses、threads runs 四类"结果在轮询/结果文件里"的
> 计费阻塞，让它们从 fail-closed 变为可售。

## 1. 问题

这些端点在创建时只返回任务 id / `queued` 对象，`usage` 要等任务完成后才出现：

```text
POST /v1/responses {"background": true}  ⇒ 200 {"status":"queued"}   无 usage
GET  /v1/responses/{id}                  ⇒ 完成态 {"usage":{...}}     但轮询当前 Free
POST /v1/batches                         ⇒ 200 {"id":"batch_..."}     用量在 output_file JSONL
```

若按"轮询时计费"，客户不轮询就永远不付费（可被薅）；若按"创建时计费"，
任务失败/取消时又会多收。正确做法是创建时**登记待对账任务**，由 worker 在任务
完成后按真实 usage 后扣。

## 2. 数据模型（提案）

```sql
CREATE TABLE ai_metering_async_task (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NOT NULL,
    organization_id   BIGINT NOT NULL,
    api_key_id        BIGINT NOT NULL,
    request_id        TEXT   NOT NULL,          -- 创建请求的 request_id（审计）
    kind              TEXT   NOT NULL,          -- openai_batch | anthropic_batch | background_response | thread_run
    upstream_id       TEXT   NOT NULL,          -- response_id / batch_id / run_id
    catalog_key       TEXT   NOT NULL,
    supplier_code     TEXT   NOT NULL,
    account_id        BIGINT NOT NULL,
    region_code       TEXT   NOT NULL,
    status            TEXT   NOT NULL,          -- pending | running | settled | failed | expired
    attempts          INT    NOT NULL DEFAULT 0,
    next_poll_at      TIMESTAMPTZ NOT NULL,
    last_error        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at        TIMESTAMPTZ,
    UNIQUE (tenant_id, kind, upstream_id)
);

CREATE INDEX ai_metering_async_task_due
    ON ai_metering_async_task (next_poll_at)
    WHERE status IN ('pending', 'running');
```

* 唯一键 `(tenant_id, kind, upstream_id)` 保证重复登记/重复轮询只产生一条任务；
* `request_id` 保留创建请求，便于审计；**不用于扣费幂等**（轮询会重复）；
* `api_key_id` 用于后扣时重建计费主体（额度、组织归属），不存密钥明文。

## 3. 创建流程

1. Dispatch 返回 2xx 且响应体含任务 id（`id` / `task_id` / `batch_id`）；
2. `AsyncUsageRegistrationInterceptor` 在 `UsageExtractionInterceptor` 之后：
   * 若 `billing.mode` 是这些异步面，**不产用量行、不预扣**；
   * 写一条 `ai_metering_async_task`（幂等 upsert）；
   * 返回成功给客户端；
3. 若登记失败：fail-closed（返回 5xx），不把"未登记的任务"放给客户。

## 4. Worker

```text
loop every N seconds:
  SELECT ... WHERE status IN ('pending','running') AND next_poll_at <= now()
    ORDER BY next_poll_at LIMIT batch
  for each task:
    poll upstream (GET response / batch / run)
    if completed:
      usage = parse(response.usage | batch output JSONL | run.usage)
      settle_once(task, usage)
    if failed/cancelled/expired:
      mark failed  (no charge)
    else:
      attempts += 1; next_poll_at = now + backoff(attempts)
```

* **批量**：先读 `output_file_id` 的 JSONL（流式逐行），按 `custom_id` 求和使用量；
  batch 价 = 标准价 × 0.5，需要一个 `batch_discount` 定价维度（目录或计划配置）。
* **background Responses**：完成态响应自带 `usage`，直接复用
  `extract_composite_usage_from_body`。
* **threads runs**：完成态 `run.usage` 是 OpenAI 形状的 token 用量。
* 上游凭证：用 `account_id` 取账户密钥（与在线链路同一解析器），只读。

## 5. 结算与幂等

* 扣费请求 id 固定为 `async:{kind}:{upstream_id}`，复用现有
  `GatewayBillingContext.request_id`；台账幂等键
  `cloudrouter:{request_id}:async` 保证重复结算不双扣；
* 使用同一套 `PricingFinalizationInterceptor` 逻辑离线重建报价（目录价 + 计划 +
  账户合同系数），或直接构造 `GatewayUsageRecordCommand`；
* 余额不足：记应收（`settlement_status = receivable`）并告警，**不丢账**；
* 若 worker 崩溃后重跑：唯一键 + 台账幂等键保证只扣一次。

## 6. 失败与边界

| 情况 | 处理 |
| --- | --- |
| 任务 failed / cancelled | 不收费，`status=failed` |
| 超过 TTL（如 24h）仍未完成 | `status=expired`，告警，不收费（或按已确认部分用量） |
| 上游 4xx（凭证/权限） | 重试有限次，之后 `failed` + 告警 |
| usage 缺失但任务 succeeded | 按请求侧估算（复用 2.48 的估算），并标记 `estimated=true` |
| 重复轮询/重复登记 | 唯一键幂等 |

## 7. 上线步骤

1. 迁移已落地（`database/migrations/postgres/0046_ai_metering_async_task.up.sql`，
   schema registry / baseline / contract 同步）；
2. 实现 `AsyncUsageRegistrationInterceptor` + worker（feature flag，默认关）；
3. 影子模式：只登记/对账、不扣费，比对金额；
4. 打开后扣，逐供应商灰度；
5. 打开四个端点的创建面（移除守卫），保留"登记失败则拒单"。

## 8. 测试计划

* 假上游：queued → completed（含 usage）/ failed / 超时；
* 重复登记、重复轮询、worker 崩溃重启：只扣一次；
* batch JSONL 多行、部分失败、`custom_id` 缺失；
* 余额不足 → 应收；
* 影子模式金额与在线口径一致。

## 9. 待确认

* [x] DB 迁移已落地（0046，schema registry + baseline + contract）；
* [ ] batch 折扣维度放在目录还是计划；
* [ ] 后扣余额不足时是否允许负余额 / 应收挂账；
* [ ] TTL 与重试策略的产品口径；
* [ ] `background` 完成态是否允许 worker 读取原始响应体（含客户内容）——隐私评审。
