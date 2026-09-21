# 历史技术债 Review 与清理报告

- **仓库**：`sdkwork-cloudrouter`（HEAD `75c6f651`，分支 `main`）
- **日期**：2026-09-21
- **范围**：继续回归修复 + 历史技术债系统性 review 与清理
- **门禁终态**：`65 passed, 0 failed, 0 blocking`

---

## 一、本轮解决的核心阻塞：parity evidence 落位冲突

### 症状

```
python tools/sdkwork_standard_alignment_guardian.py
→ Alignment summary: 64 passed, 1 failed, 1 blocking
[FAIL] (blocking) root specs contract set is not exact
       (unexpected: specs/api-runtime-parity.standalone.evidence.json)
```

### 根因：两条规范规则互相冲突（**不是脏数据**）

| 来源 | 规则 | 结论 |
|---|---|---|
| `sdkwork-specs/API_ASSEMBLY_SPEC.md:586` | evidence 放 "application `specs/` **or** `.sdkwork/evidence/`" | 两处都合法 |
| `tools/sdkwork_standard_alignment_guardian.py:47` | `REQUIRED_REPOSITORY_CONTRACTS` 恰好 6 项 | `specs/` 是**精确集合** |
| 同上 `:238` | `unexpected = actual - required`，非空即 blocking fail | 多一个文件即失败 |

⇒ 文件放在 `specs/`（规范许可）**必然**触发 guardian 精确集合失败。

### 裁决：改位置，不改规则、不删文件

选 `.sdkwork/evidence/`（规范明文认可的第二个选项），因为：

1. `.sdkwork/evidence/{packageId}.json` 是 `GITHUB_WORKFLOW_SPEC.md:411` 的**规范路径**，
   属受控、可提交目录；
2. `sdkwork_standard_alignment_guardian.py` **完全不检查** `.sdkwork/`（全文无该字符串）；
3. 发现器 `sdkwork-specs/tools/lib/api-runtime-parity.mjs:295` **递归搜索、不限定目录**，
   且 `IGNORED_DIRECTORIES`（`.git`/`.runtime`/`.turbo`/`coverage`/`dist`/`external`/
   `generated`/`node_modules`/`target`）**不含 `.sdkwork`** ⇒ 迁移零功能损失。

### 变更

```bash
git mv specs/api-runtime-parity.standalone.evidence.json \
       .sdkwork/evidence/api-runtime-parity.standalone.evidence.json
```

- 生成器 `tools/cloudrouter-runtime-parity-evidence.mjs`：`evidencePath` 常量
  与头部文档注释同步改指 `.sdkwork/evidence/`。
- `specs/` 现有内容**恰好等于** 6 项必需契约（README / component.spec.json /
  topology.spec.json / application-env-standard.md /
  database-store-migration.manifest.json / process-database-pool.spec.json）。

### 验证

| 检查 | 结果 |
|---|---|
| `python tools/sdkwork_standard_alignment_guardian.py` | **65 passed, 0 failed, 0 blocking** |
| `node sdkwork-specs/tools/check-api-runtime-parity.mjs --root "D:\...\sdkwork-cloudrouter"` | **能发现**新位置文件并校验 |
| `node tools/cloudrouter-runtime-parity-evidence.mjs --check` | 路径读写一致（无网关时报 live probe unavailable，符合预期） |

> ⚠️ **陷阱**：`check-api-runtime-parity.mjs --root` 必须传 **Windows 路径**。
> Git Bash 不为 Node 进程翻译 `/d/...`，传 POSIX 路径会误报
> "no api-runtime-parity.*.evidence.json files were found"。

> ⚠️ **既存遗留（非本轮引入）**：该证据对约 **802 条联邦面**报
> `sdkAuthority is missing route`。这是 `dependencyApiSurfaces` 契约远落后于
> standalone 网关实际路由的真实缺口，前序会话已定性，本轮不处置。

---

## 二、技术债分档清单

### A 档 — 零风险，已清理

| # | 条目 | 规模 | 判据 | 动作 |
|---|---|---|---|---|
| A1 | `.workbuddy/tmp/` 调试脚本与日志 | 30 文件 / 458 K | 被 `.gitignore:154 .workbuddy/` 忽略；无任何受版本控制文件引用 | `rm -rf` |
| A2 | `.sdkwork/tmp-patch-wallet-{recharge,test}.mjs` | 2 文件 | **受跟踪**；一次性跨仓补丁，硬编码 `E:/sdkwork-space/sdkwork-account/...`（**E: 盘已不存在**）；`b762fe8d chore(config): sync...` 误提交 | `git rm` |

### B 档 — 需确认（已在本轮处置或判定）

| # | 条目 | 状态 |
|---|---|---|
| B1 | `specs/api-runtime-parity.standalone.evidence.json` 落位 | ✅ **已裁决并修复**（见第一节） |
| B2 | `cloud-router-audit/cloud-router-audit.html` 乱码 | 427 PUA + 614 GBK，另一条**有损链**，全工作区无生成器 ⇒ 判定**不可逆**，已恢复原状未改 |

### C 档 — 涉及架构 / 跨仓，本轮不动

| # | 条目 | 位置 | 说明 |
|---|---|---|---|
| C1 | `cloudrouter_base_url()` Embedded 下自环 | `sdkwork-agents/crates/sdkwork-agents-tool-cloudrouter/src/client.rs:284` | `unwrap_or_else(\|\| DEFAULT_CLOUDROUTER_BASE_URL.to_string())` ⇒ **不返回 None**，饿出 `http://127.0.0.1:3900`；消费点 `sdkwork-agents-kernel-bridge/src/agent_http_state.rs` 仍 loopback。违反 `APPLICATION_GATEWAY_SPEC §2.3` + `APP_SDK_INTEGRATION_SPEC §5.2`（同进程依赖须走 in-process 声明式端口）。**本仓已无该符号引用** |
| C2 | `sdkwork-models` release 快照过期 | `releases/2026.09.17.1.json` | 卡住 `scripts/verify-cloud-router-application.mjs`；跨仓事务，本仓不可独立修 |
| C3 | `vite-config-runtime.test.ts` 中 `E:/sdkwork-space/...` | `apps/sdkwork-cloudrouter-pc/vite-config-runtime.test.ts:103-138` | 实为 `manualChunks` 的**合成夹具**（隔壁还有 `C:/workspace/...` 同类）⇒ 功能无害，仅路径字样过时。**低优先** |
| C4 | `specs/topology.spec.json` 他人未提交改动 | `specs/` | 提交时须**与其他会话改动分开归属** |

---

## 三、审计结论：自有源码无 TODO/FIXME 债

| 范围 | 结果 |
|---|---|
| `crates/` `services/` `tools/` `scripts/` | **零命中** |
| `apps/` | 命中全在 `dist/standalone/prod/assets/*.js`（monaco worker 构建产物） |
| `sdks/` | 命中全在 `target/debug/build/aws-lc-sys-*/out/include/openssl/*.h`（第三方） |

**另外确认**：
- `src/` 树内无就地编译产物残留（`crates/**/src/**/*.js` = 0；
  `apps/**/src/**/*.js` 的 6 个命中是小程序平台**原生用 JS** 的合法源码）。
- 迁移遗留 `E:` 盘硬编码路径：仅 1 个测试文件（即 C3 夹具），无功能性危害。

---

## 四、最终门禁复核

| 门禁 | 结果 |
|---|---|
| `tools/sdkwork_standard_alignment_guardian.py` | ✅ 65 passed / 0 failed / 0 blocking |
| `scripts/check-database-ownership.mjs` | ✅ database ownership alignment check passed |
| `sdkwork-specs/tools/check-database-framework-standard.mjs --root .`（`db:validate`） | ✅ Database framework standard passed |
| `python -B -m tools.database_contract_materializer --root . --check` | ✅ Database lifecycle assets are current |
| `tools/cloudrouter-runtime-parity-evidence.mjs --check` | ✅ 路径一致（live 探测需网关，符合预期） |

---

## 五、工作区终态

```
179 M   46 D   19 ??
```

- `46 D` = 退役 MCP / payment-runtime / commerce 子系统 + 本轮 2 个补丁脚本
- `19 ??` = 前序会话新增的合法产物（含 `.sdkwork/evidence/` 与本轮生成器）
- 全部改动**尚未提交**
