# Vendor 计费落地方案与决策（2026-10-19）

> 适用于 sdkwork-cloudrouter 剩余 11 个未计费 operation。原则：**没有 vendor
> 权威价格 / 凭据 / 结果回收链路时，不靠猜测放行；已发布接口返回 501
> `billing_unavailable`，而不是 502 让客户端重试。**

## 1. 异步 batch / threads / background Responses

### 决策

**接入，但必须按 feature flag 灰度，默认关闭。**

原因：这些接口的 usage 不在创建响应里，必须由 worker 轮询上游、解析结果；
没有真实上游凭据和验收数据时开启，等于把未计量流量放到生产。

### 最佳落地顺序

1. `AsyncUsageRegistrar` 在创建成功后把 `(tenant, api_key, upstream_id,
   catalog_key, supplier, account, region, base_url, secret_ref)` 写入
   `ai_metering_async_task.metadata`；注册失败要保留创建响应但打
   reconciliation 告警，不能静默丢任务。
2. `AsyncUsageTaskExecutor` 增加 OpenAI/Anthropic 实现：
   - OpenAI batch：轮询 `GET /v1/batches/{id}`，完成后流式读
     `GET /v1/files/{output_file_id}/content` 的 JSONL，按 `custom_id` 聚合
     `response.body.usage`；
   - Anthropic batch：轮询 batch，读取 results URL；
   - threads run / background response：完成态响应里的 `usage`。
3. 用 `PriceService` 对每条 `model + usage` 计价，生成 usage fact；由现有
   usage settlement worker 后扣钱包，`billing_request_id =
   async:<kind>:<upstream_id>` 保证幂等。
4. `SDKWORK_CLOUDROUTER_ASYNC_USAGE_WORKER_ENABLED=true` 且 executor 已注入
   才解除 501；启动时若 flag 为 true 但 executor/凭据缺失，应用 fail-fast。
5. 验收锁：batch 完成 → 两条 usage → 一笔钱包扣款；重复轮询不双扣；
   上游失败/取消 → 不扣款；余额不足 → 记应收/失败，不丢账。

### 当前状态

创建入口返回 **501**；表、store、注册器、worker 编排已就绪，executor 与
应用启动接线未完成。

## 2. Vector store 存储

### 决策

**只做按天 worker，不做“首日预付”。**

按 OpenAI 的 `$0.10/GB/day` 口径，首日预付 + 按天 worker 会在同一天产生
两次扣款风险；只做按天 worker 才能与 vendor 的日结语义一致。

- 文件加入时记录 `usage_bytes` 与 `owner/file/store` 元数据，不立即扣费；
- 每日 worker 对仍存在的 file 记一条 `storage_gb_day`（byte-day 换算）；
- 删除/缩容后下一次 worker 停止计费；
- **不做按比例退款**：vendor 按日计费，删除当天是否退费没有公开保证，先按
  不退款并在产品条款中写明；
- 余额不足：保留 usage fact 为应收，不删除文件、不静默免费。

### 当前状态

`POST /v1/vector_stores/{id}/files`、`/file_batches` 在预检前返回 **501**；
目录尚无 `storage_gb_day` 费率，按天 worker 未实现。

## 3. midjourney / nano-banana

### 决策

**不在 CloudRouter 内虚构价格或资源绑定。**

- nano-banana：路径归属应由产品确认；优先收敛到官方 Gemini 原生
  `/google/v1beta/models/nano-banana:generateImages`，由
  `sdkwork-generations` 或 Gemini 原生入口拥有 `/nano-banana` 兼容面；
  CloudRouter 只对已接通的官方入口计费。
- midjourney：没有公开按张 API 价目，保持不可售；如未来有官方 API，再补
  supplier/account/resource 与目录价。
- 在归属确认前，这些 operation 保持 fail-closed，不进入商业可售矩阵。

## 4. DeepSeek 节假日日历

### 决策

**机制已具备，数据必须来自权威日历，禁止猜日期。**

- 目录使用 `includeDates` / `excludeDates` 表达法定节假日/调休；
- 按官方国务院办公厅 2026 年放假通知写入；
- 写入后必须增加测试：工作日节假日落 off-peak、调休上班日按 vendor 规则、
  普通工作日按 peak；
- 在数据到位前，不宣称“工作日峰谷 100% 对齐”。

## 5. 当前对外行为

| operation | 当前行为 |
| --- | --- |
| `POST /v1/batches` | 501 `billing_unavailable` |
| Anthropic batch 创建 | 501 |
| threads runs ×3 | 501 |
| `background: true` Responses | 501 |
| Realtime 创建面 | 501 |
| vector store `files` / `file_batches` | 501 |
| midjourney / nano-banana | fail-closed（路由/资源不可用） |

501 表示“网关明确未启用该计费模式”，客户端不应重试；502 仍只用于真实
上游/传输故障。
