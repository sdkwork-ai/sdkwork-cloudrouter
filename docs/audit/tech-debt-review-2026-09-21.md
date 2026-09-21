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

---

## 六、历史文档清理（续轮）

### 6.1 退役 `docs/superpowers/`（55 个重复文件）

**判据**：该目录是 `DOCUMENTATION_SPEC.md` §2.1 之外的**编号/日期设计根**——规范明文规定
此类目录 `MUST NOT` 新建，既有历史目录 `MAY` 保留在 `docs/archive/` 下。2026-06-24 其全部
内容已迁移到 `docs/architecture/tech/TECH-*.md`（每个带 `> Migrated from ...` 溯源头）。

**1:1 验证**：

| 检查 | 结果 |
|---|---|
| 55 个 superpowers 文件是否有同名 TECH 副本 | **55/55 全部有** |
| 抽样逐字节比对（含前几轮乱码修复） | 除 TECH 溯源头 + 末尾换行外**完全相同** ⇒ 零独有价值 |

**删除前查到的两个硬依赖（关键，差点造成回归）**：

1. `tests/test_admin_model_mapping_runtime_standard.py:220-221` **断言这两个路径必须存在**
   并校验 6 项内容 ⇒ 已改指 `docs/architecture/tech/TECH-2026-06-02-admin-model-mapping{,-design}.md`，
   实测该测试 **ok**。
2. `scripts/check-commerce-debt.mjs` 白名单含 3 条 superpowers 路径 ⇒ 已移除
   （该脚本对缺失文件本就 `if (!source) continue` 静默跳过，且 TECH 等价项已在同表）。

> ⚠️ **陷阱**：`git rm -r docs/superpowers` 报 6 个文件「local modifications」——那是我前几轮的
> **乱码修复**。必须先确认 `TECH-*` 副本**已含同样修复**（`grep -c '商'` = 0）再 `-f` 强制删除。
> **顺序纪律：先验证副本已修，再删原件。**

归档清单按 `migrated-legacy` 惯例落在 `docs/archive/migrated-superpowers/README.md`
（只保留路径清单 + 指名活权威），`docs/README.md` 新增「Archived Trees」段。

### 6.2 `docs/plans/` → Canon 目录

`docs/plans/2026-09-09-team-account-billing.md` 自称「团队计费**唯一权威描述**」⇒ 活内容，
但落在规范外的 `docs/plans/`。按 `PLAN-YYYY-NNNN-<slug>.md` 惯例迁为
`docs/engineering/plans/PLAN-2026-0004-team-account-billing.md` 并登记进目录 README。

### 6.3 全量断链修复：49 → 0

自建扫描器（正则抓相对链接 + 存在性判定）在 301 个文档中发现 **49 条断链**：

| 文件 | 条数 | 根因 | 处置 |
|---|---|---|---|
| `product/prd/PRD-00-design.md` | **34** | 是 `00-设计文档索引.md` 的迁移存根，链接指向**已退役**的 `docs/01-` … `docs/34-` | 逐条改指 TECH 分片（编号→slug 映射）；无 shard 的 14/19/26 改纯文本加「已退役」说明 |
| `guides/integrator/README.md` | 3 | `../../apis/` 少一层 | → `../../../apis/` |
| `TECH-30-platform-data-model-v4.md` | 2 | 指向未迁移的 17/18 | 改纯文本 + 退役说明 |
| `TECH-postgresql-database-configuration.md` | 2 | 指向不存在的 `./postgresql-*.md` | 真身在 `docs/installation/` |
| `TECH-release-install{,-2}.md` | 2 | 指向不存在的 `./initialization.md` | → `../../installation/zh-CN/initialization.md` |
| `TECH-deployment-modes{,-2}.md` | 2 | 指向不存在的 `./source-install.md` | → `../../installation/zh-CN/source-install.md` |
| `TECH-06-*` / `TECH-2026-05-23-*` / `PRD.md` | 4 | 旧编号 / `../specs/` / `SECURITY.md` 层级错 | 逐条改指 |

**复扫结果：broken = 0**（文档总数 301 → 247）。

### 6.4 并发提交观察（多会话共用工作树）

清理进行中，另一会话创建了 `da7e51fa refactor: retire ai-mcp runtime registry, ...`，
**把在途文档改动一并卷进该提交**（含 55 条 superpowers 删除与本轮 README/PRD/tests/scripts 改动）。
⇒ 多会话共用同一 git 工作树时 `git status` 读数会突变，**判据是 `git log` 出现未知 HEAD**。


## 七、第七轮：文档 Canon 契约与架构守卫归零

前六轮聚焦「重复内容退役 + 断链修复」，本轮转向**机器可校验的 Canon 契约**——
即 `sdkwork-specs/tools/check-repository-docs-standard.mjs` 所强制的规则。
此前从未在 CI/本地跑过该工具，故这批债长期未被发现。

### 7.1 架构守卫 11 条既存发现（已归零）

`python -B tools/architecture_standard_guardian.py` 报 11 条：

| 文件 | 条数 | 根因 | 处置 |
|---|---|---|---|
| `apps/README.md` | 2 | 缺 `## Purpose` / `## Owner` **二级标题**（仅有 `Owner:` 元数据行） | 补两个 H2 段；同时移除与 H2「Owner」重复的元数据行 |
| `apps/sdkwork-cloudrouter-mini-program/specs/component.spec.json` | 9 | canonicalSpecs 9 条 spec 路径**多一层 `../`** | 4 层 → 3 层 |

**`apps/README.md` 的决定性判据**：`apps/` 是 12 个 `STANDARD_PROJECT_DIRECTORIES` 中**唯一**缺这两个 H2 段的目录
（其余 11 个 `## Purpose`/`## Owner` 均为 1），且要求的段名是 H2 而非元数据键
（`_has_markdown_section` 判定 `## {section}`）。

**路径层数的正确基准（重要，与直觉相反）**：守卫**不是**以 spec 文件所在目录解析，
而是 `_component_spec_base_path()`（`:286-300`）：
因 `component.root == "sdkwork-cloudrouter/apps/sdkwork-cloudrouter-mini-program"`
以 `self.root.name + '/'` 为前缀 ⇒ 基准 = **`self.root / "apps/sdkwork-cloudrouter-mini-program"`**（即 `apps/<app>`）。

由此：
- 3 层 `../../../` → `D:\sdkwork-space\sdkwork-specs\` ✅ 存在
- 4 层 `../../../../` → `D:\sdkwork-specs\` ❌ **不存在**（原值确为真 bug）

> ⚠️ 纠正前一轮摘要中的误判：从 `apps/<app>/specs/` 数层数会得出「4 层才对」的错误结论。
> **判据必须以守卫的实际解析函数为准，不能手数 `../`。**

### 7.2 文档 Canon 契约 114 条（已归零）

`node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root <repo>` 报 114 条，收敛为 **3 个根因 + 110 条回链**：

| # | 条数 | 规则 | 处置 |
|---|---|---|---|
| 1 | 1 | `TECH_ARCHITECTURE.md` **必须引用** `ARCHITECTURE_DECISION_SPEC.md` | 加入头部 `Specs:` 行 |
| 2 | 1 | shard 文件名须匹配 `/^PRD-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u`（**小写**） | `git mv PRD-UPSTREAM-SUPPLIER.md → PRD-upstream-supplier.md`，同步 6 处引用 |
| 3 | 109 | `TECH_ARCHITECTURE.md` 必须**逐个链接**其 `TECH-*.md` shard（110 个，1 个原已链） | 新增「## 10. Canon Shard Index」表格 |
| 4 | 2 | `PRD.md` 必须逐个链接其 shard | 新增「## 10. Canon Shard Index」表格 |

**规则实现要点**（`validateCanonShards` `:126-145`）：按 **basename 子串** 判定回链
（`entryText.includes(baseName)`），而非解析链接目标。故索引表格中的 `[name](name)` 即满足。
`PRD-00-design.md` / `PRD-01-…` 是迁移存根（其 `#` 标题非文件名），**同样受此规则约束**，必须回链。

**顺带发现**：`docs/product/prd/README.md` 早已明文写死该契约
（"Every shard `MUST` be linked from `PRD.md`"），但从未被执行 ⇒ 规则存在 ≠ 规则生效。

### 7.3 复扫结果

| 项 | 前 | 后 |
|---|---|---|
| `architecture_standard_guardian` | 11 findings | **passed** |
| `check-repository-docs-standard` | 114 findings | **ok** (profile=application) |
| `audit-repository-docs-debt` | — | **0 debt** |
| docs 断链 | 0 / 384 链接 | **0 / 497 链接** |
| 乱码 A/B/C 三类 | — | **0 / 0 / 0**（1,595 文件） |
| 自有源码 TODO/FIXME/HACK | — | **0**（15 条命中全为模板占位/审计散文） |

**方法论结论**：`docs/superpowers/` 与 `docs/plans/` 的退役（前几轮）解决的是「内容重复」，
本轮解决的是「**入口文档未履行索引契约**」。两者根因不同，**不可互相替代**——
即使内容全对，只要 Canon 入口不链接 shard，门禁就是红的。
