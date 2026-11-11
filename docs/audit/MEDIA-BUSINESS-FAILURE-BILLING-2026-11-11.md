# 媒体响应业务失败与计费豁免对齐（2026-11-11）

## 1. 问题

计费豁免逻辑 `provider_reported_business_failure` 只识别：

- `error` 非空对象
- `status` 字符串为 `failed/error/cancelled/...`
- `base_resp.status_code != 0`（MiniMax）
- `code != 0`（仅 `kling`/`vidu` 供应商）
- `code` 字符串为 `error/failed/failure`

因此以下三种真实厂商失败会 **HTTP 200 + 无产出却按 1 条计费**：

| 厂商 | 失败信号 | 旧逻辑 |
| --- | --- | --- |
| PixVerse | `{"ErrCode": 1000000, "ErrMsg": "...", "Resp": null}` | ❌ 不识别 |
| 阿里 DashScope 任务查询 | `{"output": {"task_status": "FAILED"}}` | ❌ 不识别 |
| Luma 任务查询 | `{"state": "failed", "failure_reason": "..."}` | ❌ 不识别 |

这三家都是本轮/前几轮已对齐契约的厂商，属于"契约对齐但计费口径未对齐"的商业化缺口。

## 2. 修复

`services/sdkwork-cloudrouter-router-service/src/application/invocation/usage_extraction.rs`：

- 新增 `ErrCode != 0` 判定（PixVerse；数字或数字字符串都识别）
- 新增 `state`、`task_status`、`output.task_status` 的失败词判定
  （Luma 的 `state`，DashScope 的 `output.task_status`）
- 抽出 `is_failure_word`，`status` 与新增字段共用同一份失败词表
  （`failed/fail/error/cancelled/canceled/expired`，大小写不敏感）

命中后沿用既有逻辑：`waived = Some("provider_business_failure")`，释放预扣，
不产生 `usage.lines`。

## 3. 覆盖矩阵

| 厂商 | 失败信号 | 现状 |
| --- | --- | --- |
| Kling / Vidu | `code != 0` | ✅ 既有 |
| MiniMax | `base_resp.status_code != 0` | ✅ 既有 |
| 通用 | `error` 非空 / `status: failed` | ✅ 既有 |
| PixVerse | `ErrCode != 0` | ✅ 本轮 |
| DashScope | `output.task_status: FAILED` | ✅ 本轮 |
| Luma | `state: failed` | ✅ 本轮 |

## 4. 验证

新增 5 个集成测试（`services/sdkwork-cloudrouter-router-service/tests/billing_business_failure_waiver.rs`）：

- `a_pixverse_errcode_is_waived`
- `a_pixverse_success_still_bills`（对照）
- `a_dashscope_failed_task_is_waived`
- `a_luma_failed_generation_is_waived`
- `a_luma_completed_generation_still_bills`（对照）

### 编译验证受限说明

`cargo test -p sdkwork-cloudrouter-router-service --test billing_business_failure_waiver`
在本机被**既有环境问题**阻塞。本轮进一步定位：

1. 默认 cc 构建：`aws-lc-sys` 的 C 编译在 `gcc.exe` 阶段失败
   （`cc-rs` 报 "Cannot create temporary file ...: Permission denied"，退出码 `0xc0000409`）。
2. 强制 `AWS_LC_SYS_CMAKE_BUILDER=1` + 工作区 `TMP/TEMP`：CMake 构建链**通过**
   （说明 cmake/nasm 可用），但随后 `ring` 的 cc 构建以同样的 `0xc0000409`
   在最简单的 `limbs.c` 上失败。
3. `gcc` 单独编译一个 trivial C 文件成功，说明不是 gcc 安装缺失，而是
   `cc-rs` 派生的 gcc 子进程在本机被安全策略 fastfail（0xc0000409）。

这是环境/安全策略层面的阻塞，不是代码问题。已确认：

- `gcc` 本身可正常编译简单 C 文件；
- `cargo fmt -p sdkwork-cloudrouter-router-service --check` 通过；
- 将 `usage_extraction.rs` 中修改后的四个函数（`provider_reported_business_failure`、
  `is_failure_word`、`non_empty_error_value`、`integer_like`）原样复制到独立
  `rustc` 程序，配合 `serde_json` 编译运行，8 条断言全部通过
  （含 PixVerse 失败/成功、DashScope 失败、Luma 失败/完成、Kling `code` 对照）。

因此本次计费改动是"逻辑已验证、crate 级编译待环境修复后补跑"。

## 5. 复跑命令

```bash
cargo test -p sdkwork-cloudrouter-router-service --test billing_business_failure_waiver
```

环境修复（aws-lc 可编译）后应全绿。
