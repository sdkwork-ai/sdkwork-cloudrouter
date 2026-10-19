# 异步用量对账：runtime 接线执行单

> 状态：所有组件已实现并有回归；**仅剩 runtime 装配与预检拒单解除**。
> 关联：[OPENAPI-BILLING-HANDOFF-2026-10-19.md](../audit/OPENAPI-BILLING-HANDOFF-2026-10-19.md) §3.A、
> [OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md](../audit/OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md) 2.71–2.77。

## 已就绪的组件（不要重写）

| 组件 | 入口 |
| --- | --- |
| 创建入队 | `AsyncUsageRegistrationInterceptor::new(store)`（`application/async_usage_registration.rs`） |
| 任务队列 | `PostgresAsyncUsageTaskStore::new(pool)` / `InMemoryAsyncUsageTaskStore` |
| 轮询状态机 | `ProviderAsyncUsageExecutor::new(catalog, transport).with_secret_resolver(resolver)` |
| 轮询传输 | `PipelineAsyncPollTransport::new(dispatcher)`（`invocation/async_poll_transport.rs`） |
| 完成态结算 | `ReplayAsyncUsageSettler::new(catalog, billing_store).with_recorder(usage_recorder)` |
| worker 编排 | `AsyncUsageTaskWorker::new(store, executor, lease, retry, max_attempts).with_settler(settler)` |
| 运行配置 | `resolve_async_usage_worker_config(runtime_toml)`（默认关闭、边界有界） |
| 纵向回归 | `tests/async_usage_reconciliation.rs` |

## 接线步骤（按顺序，每步可独立编译）

1. **pipeline 传入注册拦截器**
   - `crates/sdkwork-cloudrouter-edge-runtime/src/invocation_router.rs`：
     为最深层的 pipeline 构建函数增加参数
     `async_usage_store: Option<Arc<dyn AsyncUsageTaskStore + Send + Sync>>`；
     在 `.with_interceptor(UsageRecordingInterceptor)` 之前或之后
     （建议紧邻 `PricingSettlementInterceptor`，保证创建成功的响应已归一化）加入：
     ```rust
     if let Some(store) = async_usage_store {
         pipeline = pipeline.with_interceptor(AsyncUsageRegistrationInterceptor::new(store));
     }
     ```
   - 逐层 wrapper 透传该参数；不关心异步的旧入口传 `None`。
   - `InvocationRuntimeRoutesInput` / `DatabaseRuntimeRoutesInput` 增加同名字段，
     更新 `runtime.rs` 中 4 处结构体字面量（行 427、486、1629、2431 附近）。

2. **构造 store 并传给 pipeline**
   - 在 `runtime.rs` 的外层装配函数（`context.commerce_pool` 可见处）：
     ```rust
     let async_usage_store: Arc<dyn AsyncUsageTaskStore + Send + Sync> =
         Arc::new(PostgresAsyncUsageTaskStore::new(context.commerce_pool.clone()));
     ```
     传给 `DatabaseRuntimeRoutesInput`。

3. **启动 worker（feature flag）**
   - 在 billing_store / usage_recorder / catalog / dispatcher 均可访问的位置：
     ```rust
     let async_config = resolve_async_usage_worker_config(runtime_toml.as_ref());
     if async_config.enabled {
         let transport = Arc::new(PipelineAsyncPollTransport::new(dispatcher.clone()));
         let mut executor = ProviderAsyncUsageExecutor::new(Arc::clone(&catalog), transport);
         if let Some(resolver) = context.provider_secret_resolver.clone() {
             executor = executor.with_secret_resolver(resolver);
         }
         let settler = ReplayAsyncUsageSettler::new(Arc::clone(&catalog), billing_store.clone())
             .with_recorder(usage_recorder.clone());
         let worker = AsyncUsageTaskWorker::new(
             async_usage_store.clone(),
             Arc::new(executor),
             chrono::Duration::seconds(async_config.lease_seconds),
             chrono::Duration::seconds(async_config.retry_delay_seconds),
             async_config.max_attempts,
         ).with_settler(Arc::new(settler));
         spawn_async_usage_worker(worker, async_config.interval_millis); // 仿 usage settlement worker 的 shutdown 循环
     }
     ```
   - 注意 `dispatcher` 必须是 pipeline 使用的同一个实例（复用出站策略/TLS/代理）。
   - 端点：`spawn_usage_settlement_worker` 在 `runtime.rs:2819` 附近，可照抄 shutdown/select 结构。

4. **解除拒单（仅在 1–3 完成且开关可打开后）**
   - `application/invocation/pricing.rs`：
     - `unmetered_background_response`：当 `background: true` 且异步 worker 已启用时放行；
     - `unmetered_batch_submission` 中的 threads runs 两条：同样按开关放行；
     - **batch（OpenAI/Anthropic）继续拒单**：结果文件对账未实现（`ProviderAsyncUsageExecutor` 对 batch 返回显式错误）。
   - 开关判定建议随 `Invocation` 传递（例如 `invocation.dispatch` 增加标志），避免在预检里读全局环境变量造成测试并发不稳定。

5. **同步就绪计数**
   - `tests/openapi_billing_matrix.rs` 的 `commercial_readiness_counts_are_exactly_166_of_176`、
     `UNPRICED_PER_CALL` 白名单、gate 测试（`billing_unmetered_async_usage`）需同步；
   - 三份审计文档 + 本执行单状态更新。

## 验证顺序

```bash
cargo test -p sdkwork-cloudrouter-router-service --test async_usage_reconciliation
cargo test -p sdkwork-cloudrouter-router-service --test async_usage_settlement
cargo test -p sdkwork-cloudrouter-router-service --test billing_unmetered_async_usage
cargo test -p sdkwork-cloudrouter-router-service --lib            # 621+
cargo test -p sdkwork-cloudrouter-router-service --tests --no-fail-fast
cargo clippy -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime --lib --tests
```

有数据库时再跑 `SDKWORK_DATABASE_URL=... cargo test -p sdkwork-cloudrouter-router-service --test postgres_usage_settlement_store_e2e`，
并用 `tests/async_usage_settlement.rs` 的金额（175 000 micro / $0.0025）核对真实账户扣费。
