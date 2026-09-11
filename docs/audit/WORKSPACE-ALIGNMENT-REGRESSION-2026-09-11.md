# 全工作区对齐回归报告（2026-09-11）

> 范围：`E:\sdkwork-space` 下全部 **100 个受治理仓**（`sdkwork-` 前缀 + 含 `AGENTS.md`，见
> `sdkwork-specs/tools/lib/workspace-check-runner.mjs#listWorkspaceRepositoryRoots`）。
> 方法：16 条根门禁全量回归 + 逐门禁根因归因 + 官方 `align:*` 修复器 + 门禁层缺陷修复。
> 关联：`CORS-HEADER-GATE-SDK-LOCALE-2026-09-11.md`（locale 头退役主线）。

---

## 1. 结论摘要

Locale 主线（退役 `X-Sdkwork-Locale` → 标准 `Accept-Language`）**已闭环且保持绿色**：
`check:i18n-standard` 通过（100 仓）、`check:cors-standard` 通过（78 模块 / 777 载体 / 0 违规）。

本轮把工作区的**既存门禁债务**从"大面积红"收敛到"可点名的残留"，并且在收尾轮
（§2.7–§2.11）修掉了 4 个**门禁/修复器自身的缺陷**——它们此前让真实债务对门禁不可见，
或让受制裁的修复器在运行时销毁自己的定义。

**16 条根门禁逐条独立回归（`check:all` 用 `&&` 串联会在首个失败处短路，不能用于计量）：**

| 门禁 | 退出 | 条目 | 结论 |
| --- | --- | --- | --- |
| `check:deps` | **0** | 0 | 绿 |
| `check:exports` | **0** | 0 | 绿 |
| `check:modes` | **0** | 0 | 绿（228 warning 不影响退出码） |
| `check:workflow` | **0** | 0 | 绿 |
| `check:federation-paths` | **0** | 0 | 绿 |
| `check:lock-package-paths` | **0** | 0 | 绿 |
| `check:api-envelope` | **0** | 0 | 绿 |
| `check:cors-standard` | **0** | 0 | 绿（78 模块 / 777 载体 / 0 违规） |
| `test:cors` | **0** | 0 | 绿 |
| `check:i18n-standard` | **0** | 0 | 绿（100 仓） |
| `test:i18n` | **0** | 0 | 绿 |
| `check:tailwind-integration` | 1 | 2 | 需方向决策（§3 B5） |
| `check:packages-layout` | 1 | 4 | 需方向决策（§3 B2：agentstudio + fork 布局） |
| `check:sdk-standard` | 1 | **486** | **全部 486 来自它 spawn 的子门禁**，非自身（§2.13） |
| `check:database-bootstrap-references` | 1 | 2 | 残余 2 条为既存（documents / drama） |
| `check:database-initialization` | 1 | 156 | 138 条为 `migration-debt` 折叠计划（§3 C7） |

**通过 19 / 24**（`check:all` 已从 16 条扩到 24 条，§5.3）。剩余 5 条红门禁的条目构成**全部已被点名分类**，无未知项。

> **数值更正**：此前本报告写 `check:sdk-standard` 为「44 → 26」，**该数字不可复现**。
> 本轮完整捕获（输出落盘、无管道截断）得到 **486**，且已定位其归属：该门禁自身的检查是**通过的**，
> 486 条全部来自它 `spawnSync` 的子门禁 `check-app-sdk-consumer-imports.mjs`（`stdio: 'inherit'`
> 导致父子输出无法区分）。此前"26"最可能来自**被截断的捕获**——本工作区工作区级命令会被静默
> SIGTERM 截断，是本报告反复踩到的坑。**以 486 为准**，并见 §2.13 的复合门禁缺陷。

**但"已接线的红"只是故事的一半**（详见 §5）：79 条真门禁中，**20 条在任何仓、包括根聚合里
都没有接线**——包括承载本工作区最高优先级纪律的 `check-destructive-operation-patterns.mjs`
（0 仓）与恰好负责本轮头标准合规的 `check-rust-http-header-standard.mjs`（仅 `sdkwork-specs` 自用）。
即：**标准已立，机器未查**。这是本轮除 §2 五个缺陷外最有价值的发现。

回归前后对比：

| 门禁 | 回归前 | 回归后 | 主要动作 |
| --- | --- | --- | --- |
| `check:deps` | 472 条 | **0 条，绿** | 权威目录前向刷新 + 门禁误扫修复 + 官方 `--fix` 清 cargo/publishConfig |
| `check:tailwind-integration` | 16 条 | **2 条** | 官方 align 迁移依赖段 + 枚举/正则缺陷修复 |
| `check:packages-layout` | 7 条 | **4 条** | 补 `repository-kind` 声明 |
| `check:sdk-standard` | 44 条 | **26 条** | `--fix` 收敛；残余为生成物误扫（§3 B6） |
| `check:modes` / `check:workflow` | 8 条 | **0 条，绿** | 官方 `align-workflow-dependencies.mjs` 补齐发版依赖声明 |
| `check:database-bootstrap-references` | 2 仓 | 2 仓 | 出处引用债已全清（§2.7），残余为既存类目 |
| `check:database-initialization` | 61/70 失败 | 61/70 失败 | 138 文件迁移折叠计划未启动（§3 C7） |
| `check:exports` / `federation-paths` / `lock-package-paths` / `api-envelope` / `cors-standard` / `test:cors` / `i18n-standard` / `test:i18n` | 通过 | **通过** | — |

---

## 2. 已修复项（含证据）

### 2.1 权威依赖目录过期 —— `CATALOG_VERSION_MISMATCH 332 → 1`

**根因**：`configs/dependency-catalog.yaml` 是 `DEPENDENCY_MANAGEMENT_SPEC.md` §"version authority"
明文规定的第三方版本唯一权威，但它**落后于舰队实际**。

判定方向的证据（三项独立一致）：

1. **舰队众数**：24 个存在歧义的键，**全部**众数 = 更新的版本。例 `react`：`^19.2.8`(59 仓) vs
   `^19.2.4`(17 仓)；`tailwindcss`：`^4.3.3`(48) vs `^4.1.14`(29)。
2. **npm registry 真值**：`tailwindcss` latest = **4.3.3**（舰队命中精确最新）；`tsup` latest = **8.5.1**
   （舰队命中）；`tsx` latest = 4.23.13（舰队 `^4.23.12`）。权威文件无一项能命中最新。
3. **发布策略自述**：目录文件头部声明 "Core frameworks ... pinned to the latest stable" —— 权威违背了自己的策略。

**动作**：`sdkwork-specs/.tmp/refresh-catalog-forward.mjs`（定向、只改 `catalog:` 段内的定行值）
刷新权威 **23 键** + **35 个子仓 / 631 行**。
备份：`sdkwork-specs/.tmp/dependency-catalog.yaml.bak`。

**故意排除** `@sdkwork/sdk-common`：它在 catalog 中合法存在两种形态 —— 本仓检出时用
`workspace:*` 链接（44 仓），未检出时用注册表版本（32 仓）。强制统一会打断其中任一侧。

### 2.2 门禁层误扫与范式缺陷（4 处）

| 缺陷 | 影响 | 修复 |
| --- | --- | --- |
| `tools/check-workspace-dependencies.mjs` 未排除 `_pinmirror/` | 该目录是 **git 忽略的本地发布镜像**（`.gitignore:7`，0 个 tracked 文件，无 `AGENTS.md`），却被当作治理对象 → **53 条噪声** | 加入 `IGNORED_DIRS` 并补注释 |
| 同上，未排除 `.tmp-*` | `sdkwork-birdcoder2/.tmp-merge/` 合并草稿被扫描 → 1 条漂移 | 加入 `IGNORED_PREFIXES`（注释已承诺、常量未实现，属文档/实现不一致） |
| `check-tailwind-integration.mjs` / `align-tailwind-integration.mjs` 使用**私有**枚举（"任何含 `package.json` 的目录"） | 把外部第三方仓 `hermes-agent`（`github.com/NousResearch/hermes-agent.git`，规范零引用）纳入 SDKWork 治理 → 2 条误报 | 改为共享权威枚举 `listWorkspaceRepositoryRoots`（`sdkwork-` + `AGENTS.md`） |
| `lib/tailwind-integration-patterns.mjs#TAILWIND_UI_LIBRARY_PACKAGE_PATTERN` 缺 `(?:^\|/)` 前缀 | 仓根子路径 `sdkwork-ui-pc-react/package.json` 匹配失败 → UI 库豁免失效 → 2 条误报 | 与同文件的 bootstrap 白名单对齐，补 `(?:^\|/)`；新增回归自测 |

### 2.3 Tailwind 依赖段 —— 12 条清零

`TAILWIND_CSS_INTEGRATION_SPEC.md` 要求"拥有 bootstrap 的包必须把 `tailwindcss` /
`@tailwindcss/vite` 声明在 `dependencies`"。用官方 `align-tailwind-integration.mjs --root`
逐仓修复：`sdkwork-cloudrouter`、`sdkwork-appstore`(×2)、`sdkwork-community`、`sdkwork-company`、
`sdkwork-partner`、`sdkwork-birdcoder2`。

### 2.4 `repository-kind` 声明 —— 4 条清零

`SDKWORK_WORKSPACE_SPEC.md` §1.1.2 要求仓根 `README.md` 声明 `repository-kind`。为
`sdkwork-company` / `sdkwork-feeds` / `sdkwork-log` 在**第 2 行**补 `repository-kind: application`
（与 cloudrouter / order / im 既有形态一致，仅新增行，无删除）。

`check:packages-layout`：**7 → 4**。

### 2.5 `sdkwork-specs` 自身的规范缺口（用户明确要求的"完善规范"）

`check:pnpm-script-standard` 判定 `sdkwork-specs` **自己**不合规，三条都是规范与实现脱节：

1. **`align` 命名空间未收录** —— `PNPM_SCRIPT_SPEC.md` 的允许首段清单漏了 `align`，而
   `alignment:*`（复数）已被明文退役，说明 `align:*`（单数）就是接替形态；舰队根 32 处、
   `sdkwork-specs`、`sdkwork-order` 均在用。
   → 规范补 `align` 条目 + 新增规则（`check:<standard>` 只读；`align:<standard>` 是同一标准的
   受制裁修复面）；门禁 `ALLOWED_FIRST_SEGMENTS` 同步；自测 61/61。
2. **`UNIAPP_APP_ARCHITECTURE_SPEC.md` §11 自引违规示例** —— `dev:uniapp:h5:standalone`、
   `build:uniapp:mp-weixin` 等整段是**工具/平台别名**，正是 `PNPM_SCRIPT_SPEC` 禁止的形态
   （同 `tauri:dev`）。舰队实证 `uniapp` 0 次、`pc` 527 次、`h5` 195 次。
   → 改写为合规 runtime target 词汇（H5 → `browser`、小程序 → `mini-program`、
   原生 → `android-native`），并把"编译厂商（`mp-weixin`/`app-plus`）是 `uni build -p` 的
   内部 runner 细节、不得成为公开命令段"写成显式规则。
3. **文档示例扫描口径** —— 规范原文只治理 "**active** runbook examples"，工具已跳过
   `.agents/notes/archived` 与 `implemented`，但 `proposed`（提案草稿，尚未生效）仍被计入。
   → 补 `.agents/notes/proposed` 跳过，理由与既有注释同构。

修复后 `sdkwork-specs` 自身合规（**1 仓**由此转为通过）。

### 2.6 `tools/sync-workspace-catalog.mjs` 的数据损坏缺陷（未触发即修）

该工具按 `{...existingCatalog, ...unifiedCatalog}` 重建整个 `catalog:` 段再整体覆写。由于
`@sdkwork/sdk-common` 等一方包在 catalog 中合法使用 `workspace:*`，**执行它会把 44 个仓的
工作区链接覆盖成注册表版本**，静默断开链接并破坏子仓构建。

→ 新增 `isWorkspaceProtocol()` 守卫：`workspace:` 条目**永不**被权威版本覆盖（overlay 过滤 +
`checkOnly` 分支同步处理）。本次刷新因此改用定向定行替换脚本，未调用该工具。

### 2.7 基线出处引用债 —— 58 个文件收敛，并补上此前不存在的门禁

**发现的真实债务**：`reset-database-initialization-state.mjs:214` 在合并基线时写入
`-- baseline source: ddl/baseline/<engine>/<fileName>`，`fileName` 取的是**当时的文件名**。
基线后来被改名，这条注释就永久指向一个**不存在的文件**：

```
-- baseline source: ddl/baseline/postgres/0001_aiot_legacy_baseline.sql   ← 该文件已不存在
```

- `sdkwork-aiot` 等 44 个文件的 `-- baseline source:`
- `sdkwork-iam` 的 5 条 `-- source: .../0001_iam_legacy_baseline.sql#<anchor>`
- `sdkwork-models` 的 `0001_sdkwork_models_catalog_baseline.sql`
- `sdkwork-notary`（重命名链：`notary_legacy_baseline` → `notary_foundation` → `notary_baseline`，
  纯 R095/R096 rename，无删除）
- `sdkwork-prompts`（`0001_prompts_ai_baseline.sql`）、`sdkwork-appbase`
  （`0001_base_data_baseline.sql` vs 磁盘 `0001_base-data_baseline.sql`）

**动作**：注册进 `align-database-bootstrap-references.mjs` 的迁移表并执行 → **58 个文件 / 48 行
注释出处改写**（44 + 14 两轮），全部为单行注释替换。

强不变量校验（`sdkwork-specs/.tmp/verify-baseline-diff.mjs`）：对每个改动文件断言
`working tree == applyReplacements(HEAD)` 且**每一处改动行都是含 legacy 字面量的注释** →
**44/44 通过、0 违规**。

**配套门禁（此前不存在）**：`check-database-bootstrap-references.mjs` 只扫
`.rs/.mjs/.js/.py/.json`，而 legacy 字面量只存在于 `.sql` → 该债务对门禁**完全不可见**。
新增 `checkProvenance()`：模块**自身** baseline 目录内的出处引用必须指向存在的文件；
指向 `crates/**/migrations/**` 等**合并来源**的引用属于历史出处，**不判罚**（否则会给
`cms`/`community`/`course`/`deployments` 等造出 30+ 条误报——该区分是本轮实测校正的）。
门禁同时补 `.sql` 扫描、`.sdkwork`/`.tmp*` 跳过。新增自测
`check-database-bootstrap-references.test.mjs`。

### 2.8 修复器自毁缺陷 —— `align-database-bootstrap-references.mjs` 曾不可用

两个独立缺陷，任一都足以让该修复器失效：

1. **自毁**：`REPLACEMENTS` 表把要迁移的字面量写在源码里，而 `walkFiles` 会遍历
   `sdkwork-specs` 自身 → `--dry-run` 把**修复器自己**报为命中；去掉 `--dry-run` 就会
   **改写自己正在执行的映射表**。修复：按 `import.meta.url` 解析自身路径并排除，
   **同时排除其自测文件**（自测必然断言同一批字面量）。
2. **不可用（死工具）**：`TEXT_EXTENSIONS` 漏了 `.sql`，而 legacy 字面量**只存在于 `.sql`** →
   该修复器**任何一次运行都保证是 no-op**，其存在意义（迁移基线出处）从未生效。
   这也是 §2.7 那 58 个文件至今仍是旧名的原因。

**动作**：补 `.sql` + 对齐工作区忽略口径（`.sdkwork` 生成的
`docker-standalone-context` 副本、`.tmp*` 草稿、`external`/`vendor`）+ 补全入口守卫
（`import.meta.url` 判定，可被测试导入）。新增自测 `align-database-bootstrap-references.test.mjs`。

### 2.9 映射过宽 —— 曾改坏 `sdkwork-notary` 的一条断言

`0001_notary_foundation.sql` **同时是**两个东西：基线目录里的旧名，
以及被合并删除的 **crate 本地迁移**名 —— 而
`sdkwork-notary/scripts/verify-notary-standard-architecture.test.mjs:136` 正是断言
该 crate 迁移**不存在**（`'legacy crate migration must be removed'`）。

裸 basename 映射把这条守卫改写成断言一个**从未存在于该 crate** 的文件（虽仍恒为 `false`
而侥幸通过，但语义已被破坏）。修复：映射收窄为 engine 作用域
（`baseline/postgres/...`、`baseline/sqlite/...`），并回滚该断言；自测新增
"crate 本地旧名必须逐字保留" 的回归断言。

### 2.10 `db:materialize:contract` 是**破坏性**重生成（本轮最高价值发现）

对 61 个直接调用共享材质化工具的模块做了**非侵入式**验证（复制 `database/` 到临时目录后运行，
再比对产物，见 `sdkwork-specs/.tmp/verify-materialize-all.mjs`）。修复前：**25 个模块在
重新材质化时丢失合同内容**，且共享工具会硬编码覆盖：

| 丢失类别 | 实例 | 后果 |
| --- | --- | --- |
| 未建模的顶层标量键 | `write_owner`（sandbox）、`ddl_authority`（agents） | 治理字段被静默删除 |
| 未建模的顶层**多行块** | `id_strategy`、`amount_strategy`、`account_taxonomy`、`forbidden_asset_codes`、`subject_columns`、`compliance` | 模块自己写的策略块被整体删除 |
| `compliance_level` 被硬编码为 `L2` | `sdkwork-account` / `drama` / `settings` 声明 **L3** | **合规等级被静默降级** |
| 注册表条目被重建 | `capability`/`description`/`table_examples`/`forbidden_aliases`/`status`/`valid_from`、`profile`/`write_owner`/`system_of_record` | **舰队校验器恰好要求这些字段**（`sdkwork-agents/tools/database/materialize-agents-database-contract.mjs` 会因缺字段抛错） |
| 表/条目顺序被按基线发现顺序重排 | `account` 等 | 每次运行重写整个列表，真实漂移淹没在噪声里 |

**动作**（`materialize-database-contract-from-baseline.mjs`）：
`readUnmanagedHeaderLines()` 按"生成器不拥有即原样带过"保留顶层键**及其缩进子行**；
`mergeRegistryEntry()` 按"生成器只拥有 identity + `owner`，其余以既有值为准、缺失才补默认"
合并注册表条目（并保持键序）；`compliance_level` 以**合同已声明的等级**为准；表顺序与
`schema.yaml` / `table-registry.json` 各自保持自身既有顺序。

**验证结果**：`account` / `sandbox` / `prompts` / `notary` 的**内容级差异归零**；
`prompts` / `notary` 达到**完全幂等**。残余差异仅为**顶层 JSON 键序**与**空行/紧凑数组写法**
（纯格式），已单列计量：**20 个模块仅剩格式类差异，内容零丢失**。
`db:materialize:contract` 从"不可安全执行"变为"可证明无内容损失"。

### 2.11 `sdkwork-sandbox` 的基线参数指向**已被删除**的文件

`db:materialize:contract` 的 `--baseline` 指向
`database/migrations/postgres/0001_create_sandbox_lifecycle.up.sql`，而该目录**只剩
`README.md`** —— 命令必然 ENOENT 失败（非"引用不规范"，而是**完全不可用**）。
按磁盘实际基线改为 `database/ddl/baseline/postgres/0001_sandbox_baseline.sql`，
并在临时副本上验证命令恢复可用（`materialized 4 tables (1 prefixes)`）。

---



### 2.12 `X-Sdkwork-Locale` 退役的**穷尽复验**：`RESIDUAL = 0`

用户诉求的核心是"完整去掉"，所以本轮不依赖此前结论，重做了一次**穷尽扫描**：
100 个受治理仓 × **105,149** 个文本文件（git-tracked + untracked-not-ignored，
**不做扩展名白名单**——因为字面量可能藏在 lockfile / `.env` / 快照 / 生成物 / 无扩展名文件里），
只跳过真正的二进制（前 8KiB 含 NUL）与 >4MiB 文件。

**54 处命中 / 25 文件 / 5 仓，逐条读原文分类后：**

| 定性 | 条数 | 说明 |
| --- | --- | --- |
| **真残留（仍发送/解析/放行该头）** | **0** | — |
| 负向守卫（断言该头**被拒绝/被剥离**） | 4 | 均带 `i18n-retired-locale-header-allow` 标记 |
| 规范/审计散文（引用该头**正是为了禁止它**） | 16 | `I18N_SPEC.md:104` 等 |
| 测试夹具（断言检测器生效） | 9 | `i18n-retired-locale-header-allow: ... fixture` |
| 无关标识符 `SdkworkLocale`（i18n **类型名**，非头） | 8 | `catalog.ts` / `catalog.d.ts` |
| JSDoc 散文 "the active SDKWork locale tag" | 17 | `birdcoder2` 各 `*Host.ts` |

4 条"负向守卫"是本轮最有力的正面证据——退役不是"删掉就完了"，而是**留下了活的反向断言**：

- `auth-projection.ts:62` `const RETIRED_PROTOCOL_HEADER_NAMES = new Set(['x-sdkwork-locale'])` — 主动剥离
- `web_security.rs:114` `.any(|v| v.eq_ignore_ascii_case("x-sdkwork-locale"))` — CORS 放行判定中拒绝
- `edge_server.rs:2433` `!allow_headers.contains("x-sdkwork-locale")` — 断言 CORS **不得**放行
- `locale.rs:682` `.header("x-sdkwork-locale", "zh-CN")` — 反向用例

**并且有门禁守护**：`check-i18n-standard.mjs` 的 `RETIRED_LOCALE_HEADER` 规则（含
`i18n-retired-locale-header-allow` 可见豁免）**已接线、100 仓通过**。该门禁**刻意不扫 `.md`**
（源码注释写明"否则会因规范正确书写而惩罚规范本身"）——这是成熟的作用域设计，不是漏洞。

> 复现：`node sdkwork-specs/.tmp/verify-locale-retirement.mjs`（exit 0 = 无残留）
> 与 `node sdkwork-specs/.tmp/classify-locale-hits.mjs`（逐条读原文定性）。
> 输出：`.tmp/locale-retirement-verification.json`。

**本轮同时修掉的门禁自身缺陷（3 处，均已补自测或守卫）：**

| 门禁 | 缺陷 | 后果 | 修复 |
| --- | --- | --- | --- |
| `check-theme-conformance` | `walk()` 无保护 `statSync`；`node_modules.*` 未被跳过；`--workspace` 不存在；扫 0 文件报 OK | 舰队模式直接崩；且**从未真正运行** | `entry.isDirectory()` 判定 + 悬空链接容错；`/^node_modules/` 跳过；新增 `--workspace`（用共享仓枚举）+ **0 文件即 exit 2** |
| `check-provider-session-identity` | 根不存在 → 0 违规 → "passed" exit 0 | fail-open，假绿 | 根存在性守卫 → exit 2 |
| `run-gate-matrix.mjs` | `countItems` 只认"数字在标签前"；把 `scanned files : 1137` 当债务 | 基线失真（`destructive` 读成 0） | 四路取最大值 + 违规标签白名单；**3 个 bug 由它自己的自测抓出** |

### 2.13 复合门禁的静默失效：一次崩溃**抹掉了 486 条违规**

本轮最深的一处发现，起因是"为什么 `check:sdk-standard` 报 486 而不是此前记录的 26"。

**结构**：`check-sdk-standard.mjs` 是复合门禁 —— 先跑自身检查，**自身通过后**才
`spawnSync(check-app-sdk-consumer-imports.mjs, { stdio: 'inherit' })`，并用
`process.exit(consumerStatus)` 传播子门禁退出码。三个后果：

1. **归属不可辨**：`stdio: 'inherit'` 让子门禁的 stdout/stderr 与父门禁混流。
   实测：父门禁打印 `SDK package naming and layout checks passed`，紧接着是子门禁的
   `app SDK consumer import checks failed (486 violation(s))` —— **486 条全部属于子门禁**，
   但从输出上无法区分，导致本报告先前把它记成 `check:sdk-standard` 的条目数。
2. **子门禁崩溃 = 违规静默消失**（本轮真实发生）：`check-app-sdk-consumer-imports.mjs:72`
   有**未保护的 `readFileSync`**，在 `sdkwork-birdcoder2/.../lib/types/client/platform.js`
   上抛未捕获的 `ENOENT`（该路径是构建产物；目录列举得到、打开失败——悬空 pnpm 链接或被并发
   构建删除）。崩溃发生在扫描循环中**摘要打印之前**，于是父门禁只留下"自身通过"的输出，
   **486 条违规完全不可见**。这正是"标准已立、机器未查"最隐蔽的形态：
   门禁在跑、退出码也非零，但**报告里什么都没有**。
3. **覆盖缺口**：父门禁自身有违规时 `process.exit(1)` **在 spawn 之前**，子门禁**根本不会运行**
   —— 一个"父有问题"的仓永远得不到子门禁的覆盖。

**修复**：给第 72 行加 `try/catch`，不可读路径**计数并报到 stderr**（不静默吞掉、也不致命）。
实测修复后：`crashed: false`，子门禁完整报出 486 条 + `... and 386 more`。

**矩阵侧加固**：`run-gate-matrix.mjs` 新增 `looksLikeCrash()` —— 检测 Node 未捕获异常堆栈
（`Node.js v<semver>` 版本横幅，或 `at …(node:…)` 帧 **且** `errno:`/`syscall:` 块），
**崩溃一律 items=0 且两层都判失败**，并在输出里标 `CRASH`。理由：崩溃输出里的堆栈行
**足够像条目**，会被 `countItems` 计入 → 把堆栈当成债务基线写进注册表。本次就是这个陷阱：
矩阵曾把 `check:sdk-standard` 的崩溃读成 `items=486`。

**这个加固自身也踩过一次坑（同轮修掉，保留在案）**：首版 `looksLikeCrash` 还匹配裸的
`throw new Error`，于是**门禁只是"打印了"一条含该字样的源码行就被判为崩溃**——
`check-identity-naming` 因此被误报为"13 仓崩溃"（实测 `--root sdkwork-drive` 输出干净、
无任何崩溃标记）。同时 `CRASHED in N repo(s)` 误把"命中数"说成"崩溃数"。
两处已修：检测收窄为**致命签名**（版本横幅 / node 帧 + errno 块），
且崩溃仓与命中仓**分开统计**。自测 14/14，并用真实捕获回归验证
（`sdkstd.txt` → true；三份干净输出 → false）。
**教训**：崩溃检测不能建立在"输出里有没有某个词"上，只能建立在**Node 致命错误的确切形态**上。

> **待决策**：486 条 `consumer-generated-transport-alias` 命中的样本路径是
> `sdkwork-birdcoder2/packages/client/ui-sdkwork-apikey/lib/client.js` —— `lib/` 是**打包产物**，
> 与 §3 B6（生成物被当消费者源码扫描）**同一类**。这 486 条里有多少是生成物噪声、
> 有多少是真债，需要与 B6 一并决策。**未擅自改子门禁的扫描范围。**

### 2.14 同一个 `walk()` 缺陷出现在多个门禁里，并暴露一处环境债

修完 `check-theme-conformance` 的崩溃后，矩阵把 `check-identity-naming` 标为 `CRASH`（1 仓）。
核实后是**完全相同的根因**：

```
Error: ENOENT: no such file or directory, stat
'E:\sdkwork-space\sdkwork-mcp\apps\sdkwork-mcp-pc\packages\sdkwork-mcp-pc-admin\node_modules.stale.20260902\react-router-dom'
    at Object.statSync (node:fs:1746:25)
    at walk (check-identity-naming.mjs:50:21)
```

两个独立缺陷叠在一起：

1. **环境债**：`sdkwork-mcp` 里存在一棵**陈旧的改名依赖树** `node_modules.stale.20260902`，
   其中的 `react-router-dom` 已失效（悬空链接或被删）。**未清理**——它位于兄弟仓的依赖目录，
   删除属高风险操作，需你确认（§3 C9）。
2. **`walk()` 缺陷族**：手写 walker 用 `readdirSync(dir)` 拿字符串名再对每个 `statSync(full)`，
   既**不跳过 `node_modules*` 前缀**（只精确匹配 `node_modules`），又**不保护 `statSync`**。
   一处失效路径就让整条门禁崩溃。

实测波及面（`sdkwork-specs/tools/*.mjs` 中 walk 循环内出现裸 `statSync(full|filePath|absolute)`）：**15 个**，
其中**已确认为未保护**且属当前门禁的有：

| 工具 | 状态 |
| --- | --- |
| `check-theme-conformance.mjs` | ✅ 本轮已修（`entry.isDirectory()` + 悬空链接容错 + `/^node_modules/` 跳过 + fail-closed） |
| `check-identity-naming.mjs` | ✅ 本轮已修（同款修法；`sdkwork-mcp` 现 exit 0 干净通过） |
| `check-destructive-operation-patterns.mjs` | ⚠ 未保护（**已接入 guardrail 层**，今日恰好未命中该路径） |
| `check-process-shared-database-pool.mjs` | ⚠ 未保护 |
| `check-unified-postgres-profile.mjs` | ⚠ 未保护 |
| `check-iam-web-adapter-standard.mjs` | ⚠ 未保护 |

**建筑学结论**：这不是"某个工具的 bug"，而是**缺少共享安全 walker**。
`tools/lib/` 已存在其他共享库；正确修法是抽出一个 `walkFiles(root, { skip })`（用
`withFileTypes`、按前缀跳过 `node_modules*`、悬空链接不致命、0 文件由调用方决定是否 fail-closed），
再让这 15 处统一使用。**这属规范层重构（影响 15 个门禁），需一次决策，未擅自铺开。**

## 3. 待决策清单（未擅自处置）

按"是否可由单仓/单文件安全决定"分级。**A 级本轮已全部执行完毕（`check:deps` 归零）**，
下表 B/C 是跨仓或跨领域的架构决策。

### A 级 · 机械且可自动修复 —— ✅ 已执行

| 项 | 条目 | 动作与结果 |
| --- | --- | --- |
| `CARGO_DUPLICATE_HYPHEN_UNDERSCORE` | 3 | 官方 `--fix` 已修（`sdkwork-drive` / `tss`） |
| `CARGO_MEMBER_DIRECT_PATH` | 8 | 官方 `--fix` 已修（`community`+5 / `games`+1 / `sandbox`+2，并补根 `[workspace.dependencies]`） |
| `MISSING_PUBLISH_CONFIG` | 4 | `appstore` 3 个应用内部包改为 `private: true`（与同族 26/29 包一致，`checkPublishConfig` 对 private 包豁免）；`knowledgebase` 已修 |
| `CATALOG_VERSION_MISMATCH` | 1 | `birdcoder2` 的 `vite ^6.0.0 → ^8.0.3`（确认全仓零 `catalog:` 消费后对齐） |

### B 级 · 需要一次方向决策

1. **25 仓 / 820 条 `check:pnpm-script-standard`** —— 本轮最大的单一结构性项。
   构成：`dev:standalone`(24)、`dev:cloud`(24)、`clean`(19)、`dev`(17)、`build`(15)、
   `verify`(14)、`check`(14)、`test`(7)、`api:assembly:validate/materialize`(各 5)、
   `dev` 必须直接委派给 `dev:standalone`(7)。
   根因是**两种模型并存**：`sdkwork-cloudrouter` 用 `sdkwork-app` 全委派（根脚本只
   `pnpm exec sdkwork-app <action>`），而 `sdkwork-order` / `payment` / `log` / `catalog` 等用
   **手工** `db:*` / `build:pc:*` / `api:assembly:*`，没有 `_sdkwork:dev:*`。
   → 需要决定：**统一迁移到 `sdkwork-app` 委派模型**（规范 §4 的 canonical facade），
   还是**为手工模型立规**。跨 23+ 仓的架构决定，不宜代批。
2. **`sdkwork-birdcoder2`（deepseek-harness fork）的仓标识与布局** —— `check:packages-layout` 的 4 条
   全在此仓与 `agentstudio`：
   - `missing-repository-kind`：fork **有 `apps/`**（cli/desktop/desktop-host/web），按门禁模型确为
     应用仓，但改动上游 README 第 2 行会在 **fork 合并 upstream 时产生冲突**；
   - 根 `packages/` 布局 + `pnpm-workspace.yaml` 根族 glob（需结构性迁移 `apps/*/packages/`）；
   - `agentstudio` 根 `packages/` 同类。
   → 需决定 fork 是否适用 SDKWork 布局标准、是否给单独 `repository-kind` 与门禁豁免。
   **注意**：`agentstudio` 的 `align:packages-layout` 含 `remove legacy duplicate source`
   这类**删除性动作**，未确认前**不可执行**。
3. **根 checkout 的 `FORBIDDEN_UMBRELLA_WORKSPACE`** —— ✅ 本轮已执行：`E:\sdkwork-space/pnpm-workspace.yaml`
   的 22 条跨仓 `packages:` 路径已改为 `packages: []`（并确认根无 `--filter` 依赖、无 `node_modules`）。
4. **`check:modes` / `check:workflow`** —— ✅ 本轮已转绿（官方 `align-workflow-dependencies.mjs`
   新建 1 + 更新 10 个 `sdkwork.workflow.json`）。`UNPUBLISHED_INTERNAL_PACKAGE` /
   `RELEASE_DEPENDENCY_MISSING` 的**策略问题**（一方包是否上注册表）仍建议确认。
5. **Tailwind `forbidden-feature-bootstrap` 残余 2 条** —— 已确认 `sdkwork-appstore` 的外壳
   `apps/sdkwork-appstore-pc/src/index.css:2` **已** `@import "tailwindcss"`，故
   `packages/sdkwork-appstore-pc-host/src/styles.css` 的同类导入确为**重复引导**，
   修复即删除该行；但 **CSS 构建行为变更需一次构建/视觉验证**后再落。
   `birdcoder2` 的 `apiKeysView.css` 文件头自述为"刻意的 per-plugin Tailwind v4 source sheet"，
   **规范未建模这个已被容忍的先例** → 应写进规范而非改代码。
6. **`check:sdk-standard` 残余 26 条是门禁作用域问题，不是仓缺陷** —— 已定位：
   - **20 条**在 `sdkwork-im/apps/{sdkwork-im-h5,sdkwork-im-pc}/types/siblings/@sdkwork/order-app-sdk/src/index.d.ts`
     —— 该目录由 `sdkwork-im/scripts/dev/gen-sibling-type-decls.mjs` **生成**（供 tsc `paths` 映射），
     忠实镜像了 `sdkwork-order` 自身 `src/index.ts` 的**内部** transport 再导出；
     深导入的**源头在 order 自己的 facade 内，属合法内部组合**，门禁却按"消费者源码"判罚。
     `types/siblings` **仅存在于 sdkwork-im**（非舰队通例）。
   - **1 条**在 `sdkwork-birdcoder2/packages/client/ui-sdkwork-drive/lib/client.js` —— `lib/` 是**打包产物**，
     内含旧包名 `sdkwork-drive-app-sdk-generated-typescript`。
   → 需决定：给门禁引入"已声明为生成物的目录不作消费者源码扫描"的机制（如 marker 或路径约定），
   还是改为重新生成镜像/产物。**这不是改代码能修的债，改门禁需先定约定。**
7. **20 条门禁零接线** —— **✅ 本轮已执行**（详见 §5.3/§5.4）：`check:all` 16 → 24；
   `run-gate-matrix.mjs` 产品化（+10 自测）；12 条红的按 `gates.manifest.json` 基线接入；
   规范补 `QUALITY_GATE_SPEC.md` §1.1 接线契约与 `DESTRUCTIVE_OPERATION_SPEC.md` §9.1。
   原初稿把 `check-rust-http-header-standard.mjs` 误认作 locale 门禁，已在 §5.2 更正
   （真正的守护者是**已接线且绿的** `check-i18n-standard.mjs`）。
   剩余待决：**13 个无 `package.json` 的仓**（Rust-only / docs-only）走什么门禁入口。
8. **接线后暴露出的两个"规范决策"（不是代码缺陷，需方向）** —— 见 §5.4：
   - **破坏性操作审计的 3 条命中里，第 3 条要不要开豁免**：
     `find "${imports_root}" -maxdepth 1 -type l -delete` 是**受验证、窄域、仅删符号链接**的容器入口清理。
     `DESTRUCTIVE_OPERATION_SPEC.md` §1/§3 按字面禁止 `find` 驱动删除，§4 的"许可窄删除"只认
     **源码内字面路径清单**——所以按字面判罚正确，但**是否要为这类模式立豁免条款是规范决策**。
     另外 `apps-static-deploy.sh:142` 的 `rm -f "${app}"/incoming/*`（清空 staging 目录）
     **在现行规范下无法用非通配形态表达**——要么给"受验证的模块内 staging 目录"开窄豁免，
     要么改脚本机制（如改rename-then-recreate）。**改它会改变部署语义，未擅自执行。**
   - **`check-theme-conformance` 的 51 条基线里,有多少是 allowlist 漏配**：该门禁 2026-09-11
     才第一次真正运行，其 allowlist 从未与真实代码校准（`sdkworkTheme.ts` 不匹配 `sdkwork-theme\.`、
     `AppProvider.tsx` 不匹配 `theme-provider\.` 等）。**放宽 allowlist 会掩盖真违规，
     不放宽则 51 条基线里混着误报**——需要一次校准决策。

### C 级 · 领域性迁移债（需排期）

7. **`check:database-initialization`：70 模块中 61 个失败、共 156 条**（本轮已精确量化）。
   该门禁的 `migration-debt` 规则是**设计如此**：`migrations/postgres/` 下**任何** `.sql`
   都判欠债（初始化态下 `migrations/` 应清空、DDL 全在合并基线里，见基线头注释）。
   | 类别 | 条目 | 说明 |
   | --- | --- | --- |
   | `migration-debt` | **138** | 分布在 **51 个模块**，待折叠进基线后删除 |
   | `framework`（种子/locale） | 67 | 含 14 模块 `seeds/seed.manifest.json localeSets.en-US must be defined for active locale`、14 条 `seeds/locales/<locale> must exist` |
   | `scripts` | 22 | 含 9 条 `db:materialize:contract must reference <baseline>`（见下） |
   | `seeds` | 19 | `seeds/locales/<locale> missing` |
   | `manifest`/`baseline`/`readme`/`tests` | 17 | 集中在 `agentstudio`/`documents`/`drama` |

   **其中 34 个模块的唯一问题就是 `migration-debt`** —— 折叠完即转绿：
   `aiot, browser, canvas, cms, comments, customerservice, dezhou, doudizhu, drive, forum,
   gameengine, github, knowledgebase, llm, mahjong, mail, mcp, membership, memory, merchandise,
   messaging, modelkit, models, news, notary, notes, payment, prompts, rtc, shop, skills, voice,
   webserver, xiangqi`。
   `sdkwork-cloudrouter` 自身 48 条（子模块 aggregate）。
   → **这是本轮识别的最大排期项**：需要逐模块 DDL 审查 + 数据库验证，不宜批量代批。

   **附带发现（`scripts:` 断言过严）**：`db:materialize:contract must reference <baseline>` 只做
   **命令字符串子串匹配**，因此对"包装器工具/目录发现/python/cargo 委派"4 种合法形态全部误报：
   - `sdkwork-agents` / `sdkwork-appstore`：基线路径**在包装器工具内**（已核实存在）；
   - `sdkwork-im` / `sdkwork-cloudrouter`：按 `ddl/baseline/postgres` **目录发现**；
   - `sdkwork-appbase`：`pnpm --dir ../sdkwork-iam run db:materialize:contract` **跨模块委派**（真实偏差）；
   - `sdkwork-agentstudio`：cargo `sdkwork-db materialize-contract --app-root .`（且磁盘只有 sqlite 基线）。
   9 个模块中真正可判定的只有 `sdkwork-sandbox`（已修，§2.11）与 `sdkwork-appbase`（委派偏差）。

8. **`check:database-bootstrap-references` 残余 2 条**（既存、非本轮引入）：
   `sdkwork-documents`（`databaseRole` 未分类）、`sdkwork-drama`（缺 `0001_*_baseline.sql`，
   且 `database/` 下 contract/seeds/fixtures 整体缺失 —— 该模块尚未材质化）。
9. **`sdkwork-mcp` 里有一棵陈旧的改名依赖树**（§2.14）：
   `apps/sdkwork-mcp-pc/packages/sdkwork-mcp-pc-admin/node_modules.stale.20260902/`
   含已失效的 `react-router-dom`。它是 2 个门禁崩溃的**共同触发点**。
   → 需确认清理（位于兄弟仓依赖目录，**删除属高风险操作，未擅自执行**）。
   清理后建议顺带把 `node_modules.*` 加进各门禁的跳过前缀（部分已加，§2.14）。
10. **`sdkwork-specs/tools/` 缺共享安全 walker**（§2.14）：15 个工具各自手写 walker，
    其中 4 个已确认未保护。→ 需一次规范层决策：抽出共享 `walkFiles(root, { skip })`
    并统一 15 处调用。**不要逐个打补丁**——那会让下次新增门禁继续复制这个缺陷。

---



## 4. 复现与验证

```bash
cd /e/sdkwork-space

# 16 条根门禁逐条独立回归（不要用 check:all —— 它用 && 串联，首个失败即短路）
node sdkwork-specs/tools/run-gate-matrix.mjs --workspace .            # ✅ 已产品化：契约 + 基线全矩阵
node sdkwork-specs/tools/run-gate-matrix.mjs --only guardrail         # 只看基线层
node --test sdkwork-specs/tools/run-gate-matrix.test.mjs              # 10/10

# 门禁接线缺口实测（§5 的数据来源）
node sdkwork-specs/.tmp/gate-wiring-rate.mjs       # 79 条真门禁的根/舰队接线率
node sdkwork-specs/.tmp/probe-zero-wired-gates.mjs # 20 条零接线门禁的真实退出码
node sdkwork-specs/.tmp/audit-fail-open-gates.mjs  # fail-open 审计：对空输入是否报成功

# locale 退役穷尽复验（§2.12）
node sdkwork-specs/.tmp/verify-locale-retirement.mjs   # exit 0 = 无残留（105k 文件）
node sdkwork-specs/.tmp/classify-locale-hits.mjs       # 逐条读原文定性

# 破坏性操作审计（DESTRUCTIVE_OPERATION_SPEC §9）
node sdkwork-specs/tools/check-destructive-operation-patterns.mjs --workspace .

# 单门禁
pnpm run check:deps                        # 472 -> 0（绿）
pnpm run check:tailwind-integration        # 16 -> 2
pnpm run check:packages-layout             # 7 -> 4
pnpm run check:sdk-standard                # 44 -> 26（残余为生成物误扫）
pnpm run check:i18n-standard               # PASS (100 repos)
pnpm run check:cors-standard               # PASS (78 modules)

# 数据库出处引用：修复器 + 门禁
node sdkwork-specs/tools/align-database-bootstrap-references.mjs --workspace . --dry-run
node sdkwork-specs/tools/check-database-bootstrap-references.mjs --workspace .
node sdkwork-specs/.tmp/verify-baseline-diff.mjs       # 强不变量：working == applyReplacements(HEAD)

# 材质化不可破坏性验证（在临时副本上运行，不触碰真实模块）
node sdkwork-specs/.tmp/verify-materialize-all.mjs     # 内容漂移 vs 纯格式漂移

# 规格层自测（新增 2 个）
node --test sdkwork-specs/tools/align-database-bootstrap-references.test.mjs   # PASS
node --test sdkwork-specs/tools/check-database-bootstrap-references.test.mjs   # PASS
node --test sdkwork-specs/tools/check-i18n-standard.test.mjs      # 17/17
node --test sdkwork-specs/tools/check-pnpm-script-standard.test.mjs # 61/61
node --test sdkwork-specs/tools/check-tailwind-integration.test.mjs # 6/6
node --test sdkwork-specs/tools/check-cors-standard.test.mjs      # 22/22
```

> 一次性诊断脚本统一放在 `sdkwork-specs/.tmp/`（工作区级 `grep -r`/`find` 在沙箱中会被
> **静默 SIGTERM 截断**，且 `node -e` 会被当作 TS 并吃掉反斜杠转义 —— 一律写成 `.mjs`）。

## 5. 附录 · 门禁接线缺口（本轮实测）

前面 5 条红门禁只是**已接线**门禁的失败项。更值得警惕的是**根本没接线**的那批：一个门禁
如果没有任何仓在跑，它承载的标准就在无声腐烂——本轮 §2.7 的「基线出处债 58 文件久未修」
正是这样攒出来的（`align-*` 修复器扫不到 `.sql` 达数月无人察觉，因为它同样没有被回归）。

### 5.1 实测数据

| 指标 | 实测 | 口径 |
| --- | --- | --- |
| 工作区 `sdkwork-*` 仓（有 `AGENTS.md`） | **100** | 权威定义 |
| 其中含根 `package.json` | **87** | 另 13 个按构造不参与 npm 门禁（Rust-only / 纯文档） |
| 根 `check:all` 串联条数 | **16** | `&&` 串联 → **首个失败即短路**，不可用于计量 |
| 规格层顶层 `check-*/verify-*` 工具 | **126** | `sdkwork-specs/tools/*.mjs` |
| 其中真门禁（剔除 `.test.mjs` 自测） | **79** | 自测由测试运行器跑，不算门禁 |
| 根聚合可直接触达的门禁 | **11** | 其余 68 条根 `package.json` 里没有对应 script |
| 至少 1 仓接线的门禁 | **59** | 含根聚合 |
| **零仓接线、根也没有** | **20** | 见 5.2 |
| 无根 `package.json` 的 13 个仓 | `sdkwork-connect` / `sdkwork-database` / `sdkwork-id` / `sdkwork-integration` / `sdkwork-miniapp-engine` / `sdkwork-rpc-framework` / `sdkwork-sdk-commons` / `sdkwork-simulator` / `sdkwork-skills-private` / `sdkwork-test` / `sdkwork-tts` / `sdkwork-ui` / `sdkwork-zip` | 需单独决定其门禁入口（cargo / 脚本） |

采纳度分布（`≥10 仓` = 事实上已舰队化；`=1 仓` 多为 `sdkwork-specs` 自用，等于未推广）：

```
 75  verify-repo.mjs                              12  check-deploy-standard.mjs
 69  check-cors-standard.mjs                      9  check-repository-docs-standard.mjs
 64  check-database-framework-standard.mjs       7  check-app-sdk-consumer-imports.mjs
 54  check-browser-build-scripts.mjs              6  check-api-operation-patterns.mjs
 34  check-pnpm-script-standard.mjs               5  check-process-shared-database-pool.mjs
 31  check-api-response-envelope.mjs              4  check-single-http-ingress / source-config-standard
 19  check-agent-workflow-standard.mjs                 / unified-postgres-profile / api-runtime-parity
 13  check-pagination.mjs                         3  check-route-path-collisions / tailwind-integration
```

> 复现：`node sdkwork-specs/.tmp/gate-wiring-rate.mjs`（输出 `.tmp/gate-wiring-rate.json`）。

### 5.2 零接线门禁（20 条，按风险排序）

> **更正（同一轮内）**：本节初稿称 `check-rust-http-header-standard.mjs` 是"本轮头标准合规"的门禁。
> **该判断错误**：读源码后确认它只检查 Rust `HeaderName::from_static("...")` 字面量是否为
> 小写 ASCII（防 panic 的**静态构造**规则），与"允许哪些请求头"无关。
> **真正守护 `X-SdkWork-Locale` 退役的是 `check-i18n-standard.mjs` 的 `RETIRED_LOCALE_HEADER` 规则**
> —— 该门禁**已接线且绿**（100 仓），豁免走 `i18n-retired-locale-header-allow` 标记，
> 规范权威在 `I18N_SPEC.md:104`。所以 locale 退役**是有自动回退防护的**，见 §2.12 的证实。
> 错误结论保留在案以免复现，正确的风险排序如下。

**★★★ 本轮最该先补的一条**：它的「标准」已经写进 100 个 `AGENTS.md`，但没有机器在查：

1. **`check-destructive-operation-patterns.mjs` —— 0 仓接线。**
   托管块 `SDKWORK-DESTRUCTIVE-OPERATION-STANDARD` 已注入 **100 个** `sdkwork-*/AGENTS.md`，
   禁止通配符删除是本工作区的**最高优先级纪律**（一次 `git rm -r` 中断就造成过全仓删除事故，
   见 `DELETED-FILE-FORENSICS-2026-09-11.md`）。然而唯一能自动发现违规的扫描器
   **没有任何仓在跑**：纪律目前**只有散文、没有门禁**。这是 20 条里价值最高的一条。
   本轮已接线，首次运行即报出 **3 处真实违规**（见 §5.4）——纪律与执行之间的缺口是真的。
2. **`check-api-operation-patterns.mjs`（6 仓）** —— 承载 `int64 wire` 契约检查
   （见 `AGENTS.md` 的 Int64 Wire Contract 段）。它接线率低，而 `int64` 逃逸到 JS `number`
   会在生产中静默回放错误的 id（> 2^53）。与 `check-sdkwork-subpath-exports`、
   `check-identity-naming`、`check-shell-portability` 同属"标准已立、舰队未查"。

其余 18 条（同一口径，均为「标准已立、舰队未查」）：

| 门禁 | 承载标准 |
| --- | --- |
| `check-workspace-layout.mjs` | 工作区布局 |
| `check-identity-naming.mjs` | 命名 |
| `check-rust-crate-naming-standard.mjs` | Rust crate 命名 |
| `check-rust-manifest-standard.mjs` | Rust `Cargo.toml` 契约 |
| `check-application-layering.mjs` | 应用分层 |
| `check-app-permission-tiers.mjs` | 应用权限分级 |
| `check-app-runtime-hosting-debt.mjs` | 运行时托管欠债 |
| `check-base-url-resolution.mjs` | `resolveBaseUrl` 统一（对应既有 `sdkwork-resolvebaseurl-migration` 技能） |
| `check-bootstrap-access-token-lifecycle-standard.mjs` | 引导 token 生命周期 |
| `check-provider-session-identity.mjs` | 供应商会话身份 |
| `check-subject-id-alignment.mjs` | 主体 ID 对齐（与 §「团队计费主体判定」同域） |
| `check-sdkwork-subpath-exports.mjs` | 子路径导出 |
| `check-shell-portability.mjs` | shell 可移植性（Windows/WSL 双栈工作区尤其需要） |
| `check-topology-deployment-profiles.mjs` | 拓扑部署档 |
| `check-theme-conformance.mjs` | 主题一致性 |
| `check-vite-workspace-aliases.mjs` | Vite 工作区别名 |
| `check-discovery-standard.mjs` | 服务发现 |
| `check-external-submodule-rule.mjs` | 外部子模块规则（对应 §「`.gitmodules` 损坏导致静默漏扫」的教训） |

### 5.3 接线动作 —— ✅ 本轮已执行

1. **`check:all` 从 16 → 24 条**：把实测**本来就绿**的 8 条提升进根契约
   （`app-permission-tiers`、`app-runtime-hosting-debt`、`application-layering`、
   `bootstrap-access-token-lifecycle-standard`、`external-submodule-rule`、`rust-manifest-standard`、
   `discovery-standard`、`iam-workspace-paths`）。纯增量，不改业务代码。
2. **新增可计量 runner**：`sdkwork-specs/tools/run-gate-matrix.mjs`（+ 10 条自测）产品化完成，
   根脚本 `check:matrix` / `check:guardrails` / `test:gate-matrix`。
   它逐条独立执行 → 恢复「红了几条、超基线多少」的可计量性。
3. **红了但标准要留的 12 条按基线接入**：`sdkwork-specs/gates.manifest.json` 记录
   `id / tool / scope / tier / baseline`；**`check:all` 仍是契约层唯一权威**，清单只放未进契约的门禁，
   不复制同一事实（有一条自测专门守护这个不变量）。
   `scope` 有四种：`workspace`（跑一次）/ `repo`（逐仓跑）/ `roots`（`--root` 批量，见下）/
   `fixed`（断言硬编码目标，**不是**舰队门禁）。
4. **规范补上接线契约**：`QUALITY_GATE_SPEC.md` 新增 §1.1「Gate Wiring Contract」
   （可达性 / fail-closed / 禁止硬编码目标 / `check:matrix` 计量 / 债务上限只能降）；
   `DESTRUCTIVE_OPERATION_SPEC.md` 新增 §9.1 并把它写进 §10 验收清单；
   `README.md` 索引行同步。

> 与 §3 的 B/C 级决策不同：**B/C 是「要不要改业务/架构」，5.3 是「要不要让已有的标准真正被检查」**。
> 无需业务判断、风险最低、收益最直接。

### 5.4 接线后的首批实测结果（本轮新增）

**首次运行就抓到真实违规**——这正是"标准已立、机器未查"的代价：

**① `check-destructive-operation-patterns`（1137 文件）→ 3 处违规，全部违反 `DESTRUCTIVE_OPERATION_SPEC.md`**

| 位置 | 模式 | 证据 |
| --- | --- | --- |
| `sdkwork-webserver/bin/lib/apps-static-deploy.sh:142` | `rm-pattern` | `rm -f "${app}"/incoming/*` —— 通配符删除，违 §1 |
| `sdkwork-birdcoder2/scripts/wine-windows-gates.sh:179` | `find-delete` | `find "$scratch/tree" -name node_modules -type d -prune -exec rm -rf {} +` |
| `sdkwork-webserver/bin/container/entrypoint-standalone.sh:1495` | `find-delete` | `find "${imports_root}" -maxdepth 1 -type l -delete 2>/dev/null \|\| true` |

前两条按规范字面即违规。第三条只有 `-type l -delete`（仅删符号链接、`maxdepth 1`、有 `\|\| true`）——
**是否需要给"受验证的窄域符号链接清理"开豁免是规范决策，不是代码缺陷**，需方向（见 §3 B8）。
**均未擅自改动**：改 `apps-static-deploy.sh` 会改变部署语义，属 §3 的"需确认"范畴。

**② `check-theme-conformance` → 51 条 / 13 仓**（此前该门禁扫 0 文件即报 OK，等于从未运行）
`birdcoder(10) / birdcoder2(8) / cloudrouter(7) / appbase(5) / im(4) / modelkit(3) / local-router(3) / …`
但**这批命中里有一部分不是真违规，而是 allowlist 从未与真实代码校准**（例如 `sdkworkTheme.ts`
不匹配 `sdkwork-theme\.` 连字符正则、`AppProvider.tsx` 不匹配 `theme-provider\.`）。
门禁自 2026-09-11 才第一次跑，**基线 51 中有多少是 allowlist 漏配、有多少是真债，需要一次规范决策**（§3 B8）。

**③ fail-open 审计：17 条 workspace 作用域门禁里 3 条"对空输入报成功"**

| 门禁 | 对不存在根的行为 | 定性 |
| --- | --- | --- |
| `check-discovery-standard` | `ok`（exit 0） | **忽略一切根参数**，硬编码断言 `sdkwork-discovery` |
| `check-iam-workspace-paths` | `ok`（exit 0） | **忽略一切根参数**，硬编码解析自身父目录 |
| `check-provider-session-identity` | `passed`（exit 0） | 真 fail-open：根不存在 → 0 违规 → 报成功（**已修**） |

后两条**永远不可能提供舰队覆盖**——它们的绿是"断言了一个固定目标"，不是"检查了工作区"。
本轮给它们加了 `fixed` 作用域以求**诚实**（登记、注明原因），而不是假装它们是舰队门禁。
`check-provider-session-identity` 已加根存在性守卫，改为 exit 2。

**补充（见 §6.2）**：本轮发现同类的**第 4 例** —— `check-i18n-standard` 对不存在的 `--root`
返回 exit **0** 并打印 `passed`（空扫描 = 0 违规）。已修：根不存在/非目录/空扫描 → exit 2，
且成功输出带上扫描文件数。**这类缺陷应在接线前先排除**，否则会被批量复制到每个仓。
另：`check-sdkwork-subpath-exports` 与 `check-theme-conformance` 同为**位置参数**门禁，
传 `--workspace` 会解析到不存在的路径 → 扫 0 文件 → 报成功；`theme-conformance` 已修（见 §2.12）。

**④ 性能**：`check-shell-portability` 逐仓 spawn 87 次耗 **463s**（占单轮 722s 的 64%）。
改为 `roots` 批量（一次进程传全部 `--root`）后为 **398s** —— **仅降 14%**，
说明瓶颈**不是进程启动而是扫描本身**（该工具逐仓遍历整棵源码树）。
`repo` 作用域的 `check-identity-naming` 仍为 87 次 spawn（其 `--root` 不可重复）。
**结论修正**：批量化能省掉的是启动开销，真正的优化方向是让这些工具**跳过无关目录**
（`node_modules*` / 生成物 / 构建输出），而不是减少进程数。

## 6. 续做：locale 门禁接线闭合（含一次自己的测量更正）

本节记录把这轮的核心诉求——`X-Sdkwork-Locale` 退役——从"规范已立、工作区级已查"
推进到"**逐仓自防御**"的过程。结论：**大部分仓早就有保护，我此前的数字是错的。**

### 6.1 测量更正：此前"0 仓接线"的结论是错的

本报告早先版本与技能里写过：

> `check-i18n-standard  wired in  0 repo(s)`

**这是错误的**，属于**测错了字符串**：我只在 87 个 `package.json` 里搜
`check-i18n-standard.mjs` 的字面出现，而真实的接线走的是**间接**链路：

```
<sdkwork-*>/package.json  _sdkwork:verify
  └─ pnpm check:app-composition
      └─ node ../sdkwork-specs/tools/verify-repo.mjs --root .
          └─ validateI18nStandard(args.root)      ← check-i18n-standard.mjs:637 导出的函数
```

`verify-repo.mjs` 第 144 行调用 `validateI18nStandard`，所以**凡是跑 `check:app-composition`
的仓，都已经在逐仓保护 locale 契约**。用"字符串出现"当判据，会同时漏掉间接接线（假红）
和"声明了却从不调用"（假绿）——两个方向都错。

**正确判据是「从聚合可达」，不是「字符串出现」**。据此重测（`sdkwork-specs`，
100 个仓；聚合取 `_sdkwork:verify` → `verify` → `check` 中第一个存在的，
并跟随 `pnpm` / `sdkwork-run-*` 引用与 `sdkwork-app <cmd>` 对 `_sdkwork:<cmd>` 的回入）：

| 分类 | 更正前（错误判据） | 更正后（可达性判据） |
| --- | --- | --- |
| 已接线（聚合可达 locale 门禁） | 「0」 | **65** |
| 有聚合但门禁不可达（真缺口） | — | **6** |
| 无聚合（`PNPM_SCRIPT_SPEC.md` 欠账，警告） | — | 16 |
| 无 `package.json`（npm 视野外） | — | 13 |

"声明了却从不调用"的两个实例（**正是 CORS_SPEC §8.1 第 3 条描述的那种失败**）：

- `sdkwork-appstore` —— 声明了 `check:app-composition`，但 `_sdkwork:verify` 里**没有引用**
- `sdkwork-github-workflow` —— 声明了 `check:app-composition`，但 `check` 里**没有引用**

脚本存在 ⇒ 看起来是接线的；从不执行 ⇒ 实际零保护。**声明 ≠ 接线。**

### 6.2 修复：`check-i18n-standard.mjs` 的 fail-open（先修门禁，再接 87 仓）

接线之前先做了一次受控夹具验证，结果是不该出现的：

| 输入 | 修复前 | 修复后 |
| --- | --- | --- |
| `--root <含 X-Sdkwork-Locale 的夹具>` | exit **1**（正常） | exit 1 |
| `--root <不存在的路径>` | exit **0** + `passed` | exit **2** + `not a directory` |
| `--root <空目录>` | exit **0** + `passed` | exit **2** + `refusing to report success on an empty scan` |

不存在的根 → `walkFiles` 返回空 → 0 违规 → 打印 `passed`。
**若按原计划把它接进 87 个仓，等于把一处 fail-open 复制 87 份**——所以顺序必须是
"先修门禁、再接门禁"。修复同时让成功输出带上扫描文件数
（`i18n standard check passed (1623 file(s) scanned)`），使「接线」与「空跑」可区分。
`--workspace` 模式无需修复：`collectWorkspaceValidationIssues` 对缺失根**本来就返回 issue**（fail-closed）。

### 6.3 新增：接线审计工具（让 §16.1 有机器，而不只是散文）

| 项 | 内容 |
| --- | --- |
| 工具 | `sdkwork-specs/tools/check-locale-gate-wiring.mjs`（默认报告；`--enforce` 才失败；支持 `--root` / `--workspace` / `--json`） |
| 自测 | `sdkwork-specs/tools/check-locale-gate-wiring.test.mjs` — **13/13 PASS**（含"声明但不引用 ⇒ unwired"、"循环引用终止"、"无聚合 ⇒ 警告"、fail-closed 三例） |
| 根门禁 | `check:locale-gate-wiring`（`--enforce`）、`audit:locale-gate-wiring`、`test:locale-gate-wiring` |
| 契约位 | 已进根 `check:all`（**24 → 26 条**）；当前 `UNWIRED = 0` ⇒ 契约绿 |

工具自身 fail-closed：工作区不存在 → exit 2；枚举到 **0 个仓** → exit 2
（"扫了 0 个仓还报成功"是同一类 fail-open）。

### 6.4 已接线 6 仓（真缺口，全部闭合）

| 仓 | 聚合 | 追加的接线 |
| --- | --- | --- |
| `sdkwork-appstore` | `_sdkwork:verify` | `&& pnpm check:app-composition`（引用**已声明**的步骤） |
| `sdkwork-github-workflow` | `check` | `&& pnpm check:app-composition`（同上） |
| `sdkwork-agentstudio` | `_sdkwork:verify` | 新增 `check:i18n-standard` + `&& sdkwork-run-pnpm check:i18n-standard` |
| `sdkwork-canvas` | `_sdkwork:verify` | 新增 `check:i18n-standard` + `&& pnpm check:i18n-standard` |
| `sdkwork-utils` | `verify` | 新增 `check:i18n-standard` + `&& pnpm check:i18n-standard` |
| `sdkwork-app-topology` | `verify`→`check` | 新增 `check:i18n-standard` + `&& pnpm check:i18n-standard` |

逐仓实测（新接线命令在仓内真实执行，均 exit 0）：

```
sdkwork-agentstudio   i18n standard check passed (1792 file(s) scanned)
sdkwork-appstore      i18n standard check passed (1513 file(s) scanned)
sdkwork-utils         i18n standard check passed ( 226 file(s) scanned)
sdkwork-canvas        i18n standard check passed ( 216 file(s) scanned)
sdkwork-app-topology  i18n standard check passed (  46 file(s) scanned)
sdkwork-github-workflow i18n standard check passed ( 31 file(s) scanned)
```

复测：**65 → 71 已接线；6 → 0 未接线。**

**一处操作失误（已修复并留证）**：编辑 `sdkwork-utils/package.json` 时，
`old_string` 跨越了 `"stop"` 与 `"verify"` 两行（该文件这两条挤在同一行），
替换后 `stop` 脚本被吞掉。已用 `git show HEAD:package.json` 确认后补回，
并逐仓做了「JSON 合法 + 与基线比对无脚本丢失 + 门禁可达」三项校验。
教训：**编辑受治理 `package.json` 后必须做键集比对**，不能只看 JSON 是否解析得开。

### 6.5 规范落地（用户明确要求的"完善 sdkwork-specs 规范"）

`I18N_SPEC.md` **2.0 → 2.1**，按 `CORS_SPEC.md` §8 / §8.1 的既有先例补齐：

- **新增 §16 Gates**：四条门禁（工作区字面扫描 / 逐仓字面扫描 / `verify-repo` 复合校验 / 自测）。
- **新增 §16.1 Gate Wiring（规范性）**：5 条。首选 `check:app-composition` → `verify-repo.mjs`
  （一次覆盖 locale + 组合 + 分层 + API 装配），否则直接声明 `check:i18n-standard`；
  必须从 `pnpm verify` 聚合按 `_sdkwork:verify` → `verify` → `check` 引用；
  无聚合的仓报**警告**（归 `PNPM_SCRIPT_SPEC.md`）；禁止在仓内跑 `--workspace`。
- **新增 §16.2 Fail Closed（规范性）**：根缺失/非目录/空扫描必须非零退出；成功必须报扫描单元数；
  工作区扫到 0 个仓必须失败。与 `QUALITY_GATE_SPEC.md` §1.1 的 "Fail closed" 条款同构。
- §17 验收清单新增 2 条。

### 6.6 仍未处置（不擅自执行）

- **16 个无聚合仓**（`birdcoder2` / `core` / `log` / `video` / `web-framework` / …）：
  按 §16.1 第 3 条属**警告**，是 `PNPM_SCRIPT_SPEC.md` 的欠账；其中 `birdcoder2` 命中 §3 B2 决策。
  **根因已在 §7.1 定位**：必需根脚本集合（含 `verify`）的门禁从未在工作区级接线，
  所以"没有聚合"从来不只是 locale 的问题。
- **13 个无 `package.json` 仓**：结构性（非 npm 包），不在本契约内。
- 本节只动了 6 个仓的 `package.json`（纯增量）。另需注意：这 6 个仓工作区**本来就已有大量
  未提交改动**（前序阶段的 CORS / 依赖等），`git status` 可复核；本节的改动只是其中增量的一小部分。

## 7. 追根因：locale 警告的源头是一条**未在工作区级接线**的规范门禁

§6.6 把"16 个无聚合仓"记为警告就收尾了。本节追了一步——**为什么会有仓没有 `verify`**——
结果挖出一条比 locale 更基础、且从未被工作区级检查过的规范缺口。

### 7.1 根因：`check-pnpm-script-standard` 在根聚合里根本不存在

`PNPM_SCRIPT_SPEC.md` 规定根脚本的**必需集合**（`tools/check-pnpm-script-standard.mjs`
的 `REQUIRED_ROOT_SCRIPTS`）：`dev` / `dev:standalone` / `dev:cloud` / `build` / `test` /
`check` / `verify` / `clean`。其中 **`verify` 的定义就是"merge-ready 验证聚合"**（规范第 137 行）。

实测：

| 项 | 实测 |
| --- | --- |
| 单独接线该门禁的仓 | **34** |
| 根 `package.json` 里该门禁 | **不存在（0）** |
| `gates.manifest.json` 里登记 | **不存在（0）** |
| 工作区级审计结果 | **87 仓中 26 仓 FAIL，817 条脚本违规** |

**34 个仓各自跑了，但工作区聚合从未跑过** ⇒ 不自己接线的那些仓**从来没有被检查过**。

**这就是 §6 那 16 条"无聚合"警告的根因**：一个仓连 `verify` 都没有，
**就没有任何聚合可以接线任何门禁**。locale 只是第一个撞上这堵墙的契约，不是唯一一个。

已处置（**登记为计量，而非假装修好**）：
`gates.manifest.json` 新增 `check:pnpm-script-standard`（`scope: workspace`、`tier: guardrail`、
`baseline: 798`）；根新增 `check:pnpm-script-standard` / `test:pnpm-script-standard`。
**未加进 `check:all`**——它是红的，进去会把整个契约打红。基线用
`run-gate-matrix.mjs#countItems` 测出，不是手写的。

**矩阵复核**：`run-gate-matrix.mjs --only guardrail` → **13/13 在基线内、0 崩溃、0 回归、exit 0**；
新门禁实测 `items=798 baseline=817`（正确地读出了 7.2 带来的下降）。
矩阵不变量自测 `run-gate-matrix.test.mjs` **14/14**。

**为什么不顺手修 26 个仓**：这是"改 26 个仓的脚本模型"，属 §3 已列的 B1 决策
（25 仓 / 820 条，与本节的 817 → 798 是同一条债），**需要方向而非机械替换**。本节只做"让它可计量"。

### 7.2 顺带修掉一处门禁范围缺陷（**包括我自己造成的那条 FAIL**）

登记后立刻发现：**`sdkwork-cloudrouter` 自己是 26 个 FAIL 之一**，而唯一原因是——

```
sdkwork-cloudrouter/.workbuddy/memory/2026-09-11.md:897
  documentation-examples: first segment "X" is not a standard public namespace
```

（该诊断把脚本名解析成了占位符 `X`。）触发者是**我上一轮写在记忆日志里的散文**——
描述"聚合如何跟随 pnpm 脚本引用"时，在行内代码里写了 runner 名加占位符的写法。
`extractPnpmCommandExamples` 的正则 `\bpnpm(\s+run)?\s+([a-z0-9]…)` 带 `i` 标志，
且 `\b` 在连字符后成立 ⇒ **在 runner 名内部也匹配到了 pnpm，于是把其后的占位符当成了脚本名**。

这不是我一个人的笔误问题，是**范围缺陷**：忽略名单里已经有

```js
'.sdkwork',  // Local per-machine AI workspace metadata (AGENTS.md local dictionary),
             // never a shipped document.
```

**却漏了 `.workbuddy/`**——同类目录：`.gitignore:150` 明确忽略、**tracked 文件数 0**、
内容是 agent 记忆日志与临时探针。该工具的 docstring 自己警告过：
"findings nobody can act on … is exactly how a gate stops being read"。
把 gitignored 的 agent 记忆当"shipped documentation"校验，正是在生产这种 finding。

修法（改**范围**而非改我的散文——治类不治例）：
- `IGNORED_DOCUMENT_PATH_PARTS` 增加 `.workbuddy`，并写明与 `.sdkwork` 同类的理由。
- 补 **2 条回归**：① `.workbuddy/` 与 `.sdkwork/` 内的命令占位符**不**产生违例；
  ② **负向对照**——真实文档（`RUNBOOK.md`）里指向非标准 dev 运行目标的示例**仍然** fail。
  第②条是关键：它证明我**没有把规则关掉**，只是收窄了范围。
- 自测 **61 → 63 全绿**。

**一处刻意的克制**：写本节时，我自己的报告（`docs/audit/**`，其行内代码里也需要引用门禁输出）
同样会触发该规则。最省事的做法是把 `docs/audit` 也加进忽略名单——**我没有这么做**：
全工作区只有 **1 个**仓有 `docs/audit/`（就是本仓，且是我自己建的），而名单里已排除的
`docs/review/` 存在于 **4 个**仓。为只服务自己的目录去放宽一条舰队级规则，
正是本节在批评的那种范围蔓延。**改自己的写法，不改共用的规则。**

效果：

| 指标 | 修复前 | 修复后 |
| --- | --- | --- |
| `sdkwork-cloudrouter` | FAIL（唯一原因是我自己的记忆日志） | **PASS**（182 根脚本 / 486 文档 / 106 JSON / 137 runner 扫描） |
| 工作区 FAIL 仓 | 26 | **25** |
| `countItems` | 817 | **798** |

### 7.3 locale 文档债复验：**不存在**

另起一次**放宽**扫描（**305,143** 文件、含 `.md/.json/.yaml/.ts/.rs/.toml/.sh/.env/…`、
不做 gitignore 过滤）复核"文档是否还在教人用退役头"：

- 有提及的仓：**4**（`birdcoder2` / `cloudrouter` / `manager` / `specs`）
- 全部命中：**19 处**，逐条定性**全部良性**——
  - **负向守卫**（断言"该头不得出现"）：`RETIRED_PROTOCOL_HEADER_NAMES`（含 `lib/` 构建产物）、
    `sdk-locale.test.ts`、`edge_server.rs`、`web_security.rs`、`locale.rs`
  - **夹具**（带 `i18n-retired-locale-header-allow` 豁免标记）：`sdk-clients-auth-projection.test.ts`、
    `check-i18n-standard.test.mjs`
  - **记录类**：本仓记忆日志、`docs/audit/*`、`AGENTS.md`（写明已退役）、
    已标注"**已废止**"的旧计划
  - **规范**：`I18N_SPEC.md` §4（就是那条退役规则本身）、`QUALITY_GATE_SPEC.md`（接线缺口记录）
  - **门禁主动跳过的本地元数据**：`sdkwork-manager/.sdkwork/tmp/*.rs`

**没有一处是"教人用退役头"。** 与 `check-i18n-standard --workspace`（70,578 文件、`RESIDUAL=0`）相互印证。

### 7.4 仍未处置

- **25 个仓的 pnpm 脚本模型**（`birdcoder2` / `cloudrouter` 已修 / `order` / `payment` / …）：
  §3 B1 决策，已可计量（baseline 798），未擅自动。
- **16 个无聚合仓**：其根因已定位（§7.1），随 B1 一并解决。
- 本节新增/修改：`gates.manifest.json`（+1 guardrail）、根 `package.json`（+2 script）、
  `check-pnpm-script-standard.mjs`（+`.workbuddy` 范围）、其 `.test.mjs`（+2 用例）。


## 8. 续做 2：topology v5 校验器三处过严，以及按 §5 流程补齐原型登记

本轮把「已声明但从未被校验的门禁」这一根因继续往下推，落到 `specs/topology.spec.json` 这一层，
并在过程中**又推翻了自己一次测量**（8.2 第 2 条）。所有结论都用**权威工具**取得，不再自写替代实现。

### 8.1 起点与地面真值

- 起点：`sdkwork-app-topology` 的权威校验器对 78 个含 topology spec 的仓给出 **9 FAIL**。
- **我先用自己的扫描器得到 5 个，漏了 4 个**（`appstore` / `drama` / `video-cut` / `webserver`）。
  原因是我按「`allowed` 数组形状」重写了一遍检查，而权威校验器是**首错即抛**，
  真实缺陷被前一个错误遮住。
- 结论（并入方法论）：**判据要调权威实现，不要重写一份**。自写扫描器既漏报（这次）又可能误报
  （把"声明但没接线"当成"没接线"，见 §6.1 的同类更正）。

### 8.2 缺陷分型（三方口径对比后才敢动）

对每个失败项，都比对 **JSON Schema**（`sdkwork-specs/schemas/`）、**v2 校验器**
（`spec-v2.mjs`）与**散文规范**，再决定改哪一侧：

| # | 现象 | Schema | v2 | 散文规范 | 裁定 |
| --- | --- | --- | --- | --- | --- |
| 1 | 4 仓缺 `vocabulary.environment.allowed` | `required` 含 `environment` | 要求非空 | 要求非空 | **spec 真缺陷** → 修 spec |
| 2 | 3 仓 `deploymentProfile.allowed` 不是 `[standalone,cloud]` | `const` 要求两者 | 只要求非空 | 值域只有两者 | **两侧都过严** → 修 schema+校验器（见 8.3） |
| 3 | 6 仓被强制要求两个 surface | **对 `surfaces` 零要求** | 有按原型映射表 | 无此规则 | **v5 回归** → 恢复按原型 |
| 4 | 4 仓被要求恰好一个 `api-standalone-gateway` | 无此要求 | 无此规则 | **条件句**（"plans *with application HTTP APIs*"） | **v5 过严** → 加条件 |
| 5 | `appstore` 2 处悬挂进程引用 | — | — | — | **spec 真缺陷** → 修 spec |
| 6 | `drama` 缺 `orchestration` | 顶层 `required` 含 `orchestration` | — | — | **spec 真缺陷**，但需运行时意图 → 并入 §3 B1 |

**关于 #2 我判错了一次方向，必须记录：** 一开始我认为 schema 的 `const` 是权威，于是把
`audio`/`video-cut`/`webserver` 的词表都改成 `[standalone,cloud]`。结果是**注册在册的
`check:topology-deployment-profiles` 从 19 条涨到 22 条**——它按
`runtime.supportedDeploymentProfiles` 校验"词表必须 ⊆ manifest 声明的 profile"，
而 `APP_MANIFEST_SPEC.md` §10.1 明确允许 **profile-limited manifest**（WEB/H5 通常 cloud；
standalone 需有记录的本地/离线/私有 bundle）。这三仓正是合法的单 profile 应用
（`webserver` 就是本地 127.0.0.1:3800 服务）。于是**回退 spec、放宽 schema 与校验器**，
门禁条数回到 19。教训与 §6.1 同源：**先看另一条门禁怎么判，再决定放宽还是收紧。**

### 8.3 原型登记（按 `APP_RUNTIME_TOPOLOGY_ARCHETYPES.md` §5 的四步流程）

事实：`application-client-root` 被 **4 个在线 spec** 使用却**从未登记**（原型文档、NAMING §7 注册表、
schema enum 三处都没有）；`client-application`（`messaging`）同样是未登记的第 6 种拼法，
而它声明的是普通 HTTP 应用入口 + 平台网关，语义**等于已登记的 `application-http-gateway`**。

决策：**只登记 1 个新原型**，`messaging` 迁移到已登记原型，不新立第六种拼法。

| 步骤 | 落地物 |
| --- | --- |
| 1 架构决策 | `docs/architecture/decisions/ADR-20260911-application-client-root-archetype.md`（含 Alternatives / Verification） |
| 2 原型文档 + 命名注册 | `APP_RUNTIME_TOPOLOGY_ARCHETYPES.md` 新 §5（连通面/surface/允许 profile/规则）＋ §1 索引；`APP_RUNTIME_TOPOLOGY_NAMING.md` §7 注册表 +1 行 |
| 3 schema enum | 规范化 schema 增 `archetype` 枚举、`required`、以及把必需 surface 绑到原型的 `allOf`；捆绑副本由 `cp` 同步（有字节相等测试守护） |
| 4 参考示例 | `examples/sdkwork-mall/`（client-root）；并补齐**原本缺失**的 `examples/sdkwork-im/`、`examples/sdkwork-aiot/` |
| 规范正文 | `APP_RUNTIME_TOPOLOGY_SPEC.md` §2 增 `deploymentProfile.allowed` 子集规则；§5 增"原型 → 必需 surface"映射表 |

### 8.4 参考示例：补齐 + 脱敏

- §5 第 4 步要求"每个原型一个参考示例"。原本只有 `sdkwork-drive` 一个；
  `realtime-application-platform` 与 `application-rest-edge-device` **完全没有**。
- 示例从**在线 spec 派生**（只重写 `profileFiles` 前缀为 `examples/<仓>/...`），因此不会与真实根漂移。
- **脱敏**：`sdkwork-aiot` 的 `standalone.development.env` / `standalone.demo.env` 含
  **明文开发库密码**，`sdkwork-im` 含 dev 令牌字面量。复制进受版本控制的共享仓前，
  把凭据形状赋值替换为 `DEPLOY_INJECT:provide-at-deploy-time`（共 7 处）；
  `/run/secrets/...`、`*.secret` 等**文件路径引用**保留不动。
- 新增测试守护："参考示例不得出现凭据字面量"（允许空值 / `DEPLOY_INJECT` / 绝对路径）。
- 新增测试守护："每个已登记原型必须提供**可校验**的示例"，且 schema 的 `allOf` 与校验器的
  `REQUIRED_SURFACES_BY_ARCHETYPE` **逐原型比对**，防止契约与实现漂移。

### 8.5 验证结果

| 项 | 起点 | 现在 |
| --- | --- | --- |
| 权威校验器 FAIL（78 spec） | 9 | **1**（仅 `drama`，并入 B1） |
| `check:topology-deployment-profiles` | 19 | **18**（baseline 24；↓1 归因见 8.6） |
| `sdkwork-app-topology` 测试 | 110 | **114 / 114 PASS** |
| 舰队文档规范门禁（specs 自身） | ok | **ok** |
| 参考示例覆盖原型 | 1 / 3 | **4 / 4** |

### 8.6 仍未处置与如实归因

- **`drama`**：缺 `orchestration` 是 schema 顶层 `required` 的真缺陷，但填什么取决于它的运行时意图
  （`apps/` 只有 README；`envKeys.standaloneGatewayBind` 指向 `SDKWORK_DRAMA_APPLICATION_PUBLIC_INGRESS_BIND`
  而材料化文件写的是 `SDKWORK_DRAMA_HTTP_BIND`，另有一处 envKey 漂移；只有 `sdk:build`/`sdk:check`
  两个脚本）。**编造进程是错的**，并入 §3 B1 的未成熟仓决策。
- **`check:topology-deployment-profiles` 由 19 降到 18**：消失的是 `sdkwork-agents` 那 1 条，
  其 HEAD 为 `a79ea39 fix(agents): restore the accumulated work 9dfe92c rewrote away`——
  **由工作区里另一个并发进程提交修复**，不是本轮的成果，此处如实归因。
- **工作区基线在动**（两个方向都动）：本工作区存在**后台同步/修复自动化**在持续提交
  （如 `chore: sync workspace, dependency, and SDK generation state`）。影响有二：
  ① 我用 `git restore` 回退的改动可能已被提交，回退无效——**必须显式改回正确内容并复验**；
  ② 前后两次测量的基线不保证一致，任何"变化"都要先归因再计入结论。
- **`sdkwork-aiot` 明文开发库密码**：仅报告，未擅自改（舰队既有约定是 dev 库密码落在 env 文件里）。
  但**共享参考示例**已脱敏，并有测试守护。
- **schema 未被真正校验**：`sdkwork-app-topology` 未引入 JSON Schema 校验器，
  schema 目前是"契约文档 + 导出物"，实际判定由手写校验器完成。两套真源可漂移；
  本轮已用测试把枚举与必需面**逐项绑定**，但**完全 schema 驱动**仍是待办。

### 8.7 locale 退役的收口复验（本轮新做，含一次自我更正）

§8 的 topology 工作闭合后，回到用户原始指令的**主目标**（完整去掉 `X-Sdkwork-Locale`、
改用 `Accept-Language`）做一次独立复验，不复用前几轮的结论。

| 复验项 | 方法 | 结果 |
| --- | --- | --- |
| 舰队接线 | `check-locale-gate-wiring.mjs --workspace` | 审计 100 仓：**reachable 71 / UNWIRED 0** / 无聚合 16（warning）/ 非 npm 13 |
| 门禁是否真的在契约层 | 读根 `E:/sdkwork-space/package.json` 的 `check:all` | 27 段中含 `check:i18n-standard`、`test:i18n`、`check:locale-gate-wiring`（**带 `--enforce`**）、`test:locale-gate-wiring` |
| 文档是否有残留"处方" | 全 specs 扫 `x-sdkwork-locale` 的 `.md` | 仅 **2 个文件**命中，且**均为禁止性/历史记录**，无一处仍规定发送该 header |
| `Accept-Language` 是否落到规范 | `grep -c -i accept-language I18N_SPEC.md` | 9 处；`I18N_SPEC.md` §3 的 `source` 枚举已删除 `sdk-header`/`SdkHeader` |

**一次自我更正（记录下来以免下次再踩）**：我先在 `sdkwork-specs/package.json` 与
`sdkwork-specs/gates.manifest.json` 里找 locale 门禁，**两处都没有**，一度判定
"locale 门禁本身零接线"。这是**假警报**，根因是查错了清单：

- 契约层的真源是**工作区根** `E:/sdkwork-space/package.json` 的 `check:all`（27 段），
  locale 门禁定义在**那里**，不在 specs 仓；
- `gates.manifest.json` 只登记**尚未进入 `check:all`** 的门禁，locale 门禁已在契约层，
  **因此不应出现在 manifest 里**——这由 `tools/run-gate-matrix.test.mjs` 的
  "no manifest gate is already part of the check:all contract" 用例**强制**，写进去反而会 FAIL。

判据固化：**某门禁"看起来没接线"时，先确认自己看的是哪一层**——契约层看根 `check:all`，
guardrail 层看 `gates.manifest.json`，两层互斥且由测试守护。

## 9. 全量门禁矩阵回归（本轮唯一未闭合项，现已闭合）

### 9.1 矩阵结果

`node sdkwork-specs/tools/run-gate-matrix.mjs --workspace E:/sdkwork-space`（耗时 20m34s）：

| 层 | 结果 |
| --- | --- |
| **guardrail** | **15 / 15 全部在基线内** |
| **crashed** | **（none）** |
| **contract** | **green 21 / 27**（6 条红灯） |

guardrail 逐条（实测 / 基线）：

```
check:destructive-operation-patterns      3   / 3
check:theme-conformance                  49   / 51   ↓
check:rust-crate-naming-standard        703   / 704   ↓
check:base-url-resolution                 7   / 24   ↓↓
check:provider-session-identity          15   / 15
check:subject-id-alignment              200   / 200
check:topology-deployment-profiles       18   / 24   ↓
check:vite-workspace-aliases              7   / 7
check:workspace-layout                    1   / 1
check:identity-naming                    27   / 27
check:shell-portability                   9   / 9
check:sdkwork-subpath-exports             0   / 0
check:pnpm-script-standard              798   / 798
check:script-placement                  148   / 157   ↓
check:module-bin                          0   / 0
```

**结论**：guardrail 层无回归、无崩溃；`check:base-url-resolution` 24 → 7 是本轮外部进展。
契约层 21/27 是**商业交付的真实阻塞面**，见 9.3。

### 9.2 根因：`check:all` 在第 5 段就停，22/27 段从不执行

这是本轮最重要的结构发现，也解释了"为什么 locale 门禁明明接线了却像没生效"。

`check:all` 用 `&&` 连接 27 段（`QUALITY_GATE_SPEC.md` §"Measurement" 已记录该性质）。
实测**第 5 段 `check:tailwind-integration` 就是红的**，因此：

```
1  check:deps                 ✅
2  check:exports              ✅
3  check:modes                ✅
4  check:workflow             ✅
5  check:tailwind-integration ❌  ← 链在此终止
...6-27 段（含 check:i18n-standard @12、check:locale-gate-wiring @25）从不执行
```

固化为规则：**"某门禁在 `check:all` 里"不等于"它真的跑"**。判断一个门禁是否实际生效，
唯一可信方式是 `check:matrix`（不短路、逐条独立进程、按 baseline 比对），而不是读 `check:all` 文本。
`QUALITY_GATE_SPEC.md` 早已规定"Regression measurement MUST use `pnpm run check:matrix`"——
本轮的实测数据正是这条规定的价值证明。


### 9.3 契约层红灯门禁：矩阵时刻 6 条 → 复测 3 条

**矩阵时刻（14:12–14:32）** 6 条红灯。**随后逐条复测，3 条已转绿**：

| 门禁 | 矩阵时刻 | 复测（本会话末） | 归因 |
| --- | --- | --- | --- |
| `check:tailwind-integration` | exit 1（2 findings） | **exit 0**（2/2） | **并发进程修复**（见 9.4） |
| `check:sdk-standard` | exit 1（12 violations + 156 findings） | **exit 0**（3/3） | **并发进程修复** |
| `check:database-bootstrap-references` | exit 1 | **exit 0**（5/5） | 瞬时；未复现 |
| `check:packages-layout` | exit 1（4 errors） | **exit 1**（4 errors） | **仍红** |
| `check:cors-standard` | exit 1（1 wiring + 10 carriers） | **exit 1**（**0 wiring** + 10 carriers） | wiring 由本轮修复；carriers 仍红 |
| `check:database-initialization` | exit 1 | **exit 1** | **仍红** |

**3 条仍红的具体内容**：

1. **`check:packages-layout`（4 errors，集中在 2 仓）**
   - `sdkwork-agentstudio`：`forbidden-repo-root-packages` — 仓库根 `packages/`（应用仓禁止）
   - `sdkwork-birdcoder2`：`missing-repository-kind`（README 未声明）+ `forbidden-repo-root-packages`
     + `legacy-pnpm-workspace-glob`（`pnpm-workspace.yaml` 仍 glob 仓库根包族）
2. **`check:cors-standard`（10 carriers，全在 `sdkwork-agents`）**
   - `cloud.demo` / `cloud.development` / `standalone.demo` / `standalone.development` 缺
     `SDKWORK_CORS_ALLOWED_ORIGINS`（且无 console host pattern）
   - `cloud.production` / `cloud.staging` / `cloud.test` / `standalone.production` 缺大量派生 origin
     且「origin 落在已登记产品域族之外」（如 `https://agents.staging.invalid`）
   - 各 env 的 allowlist 顺序非 canonical
   - 修复器存在（`align-cors-standard.mjs --fix`），但会重写每个 env 约 150 条 origin；
     **另需 owner 确认域族登记**，故未擅自动
3. **`check:database-initialization`（migration-debt）**
   - 判据（`verify-database-initialization-state.mjs:110-119,155-160`）：`<db>/migrations/postgres/*.sql`
     或 `migrations/*.sql` 存在即记一条 debt——规范要求迁移折叠进 `ddl/baseline/postgres/0001_*_baseline.sql`
   - 命中：`sdkwork-webserver` 2 个（`0008_web_nginx_config_active_index.up/down.sql`）、
     `sdkwork-xiangqi` 1 个（`0001_organization_id_not_null.up.sql`）
   - 属 §3 C7「迁移折叠」类，非机械修复

### 9.4 tailwind 2 处红灯：我的诊断正确，但**解法被并发进程改写为更优形式**（更正）

9.4 的原判（诊断共享根因、**未擅自动**）**成立**，但**我给出的解法不是唯一解，也不是最优解**。
复测时两处已被并发进程修好（均为**未提交工作区改动** ` M`，非本会话产物）：

| 文件 | 并发进程的解法 |
| --- | --- |
| `sdkwork-birdcoder2/.../ui-sdkwork-apikey/src/client/apiKeysView.css` | 把伞形 `@import "tailwindcss"` 换成**分层写法**：`@import "tailwindcss/theme.css" layer(theme)` + `@import "tailwindcss/utilities.css" layer(utilities)`，**并刻意省掉 preflight**；注释说明伞形入口会带入 `@layer base` 的全局 reset，而该表编译产物是以 `<style data-plugin-css>` 追加到 `document.head`，会重置**整个** harness 应用 |
| `sdkwork-appstore/.../sdkwork-appstore-pc-host/src/styles.css` | 删掉重复引导与**失效的** `@source` 行（`../../../../src` 等），保留 app 根 `index.css` 作为唯一引导 |

**诚实的更正**：我判断「规范 §9 的正解是让 host shell 拥有全部 `@source`」，因此结论是
「需 birdcoder2 shell 侧改动」。**实际解法绕开了 shell 改动**——分层导入既满足
"feature package 不得用伞形 `@import "tailwindcss"`"，又保住插件的自包含性。
**教训：门禁禁止的是"伞形引导"，不是"引导本身"。先读门禁的判据再设计解法，
不要从规范散文反推出唯一路径。**

据此，`check:tailwind-integration` 已转绿（2/2），**该条不再阻塞交付**。

### 9.5 本轮新发现并修复：契约层 2 条 fail-open 门禁

`.tmp/audit-fail-open-gates.mjs` 只覆盖 guardrail 层。本轮补做**契约层**审计
（新增 `.tmp/audit-contract-tier-root-handling.mjs`），并把判据细化为三类
（原审计的二元判据会把"无视根参数"误判成 fail-open）：

- `FAIL-CLOSED`：有根参数，假根 → 非零退出。正确。
- `FAIL-OPEN`：有根参数，假根 → **仍退出 0**。读了零个对象却报成功。
- `ARG-BLIND`：**根本没有根参数**，只能审计自己的硬编码目标。退出 0 与传入的根无关。

实测 27 段（跳过 4 个 `node --test` 自测段）：

```
FAIL-OPEN  : 2   check:tailwind-integration   → "passed (0 repository root(s))"
                 check:cors-standard          → "0 modules, 0 carriers, ... 0 warnings"
ARG-BLIND  : 6   check:deps / check:exports / check:modes / check:workflow
                 check:discovery-standard / check:iam-workspace-paths
```

其中 `FAIL-OPEN` 的 2 条**已在契约层**，即 `I18N_SPEC.md` §16.2 所禁止的
"occupies the contract slot while enforcing nothing"。**已修**：

| 文件 | 修复 |
| --- | --- |
| `tools/check-tailwind-integration.mjs` | `repoRoots.length === 0` → `fail(...)`，拒绝在空扫描上报成功 |
| `tools/check-cors-standard.mjs` | 根非目录 → exit 2；workspace 模式下根下无 `sdkwork-*` → exit 2（补 `fs` import） |

**双向验证**（关键：修 fail-open 不能改变正确根下的行为）：

```
bogus root : tailwind exit=1   cors exit=2        ← 已 fail-closed
real  root : cors exit=1 (78 modules, 779 carriers, 10 carriers with issues,
                         0 required allowlists missing, 0 gate wiring errors, 10 warnings)
             ← 与修复前逐字相同，无回归
```

顺带复跑 guardrail 层：**12 / 12 FAIL-CLOSED**。`.tmp/fail-open-audit.json` 里的
"3 条 fail-open"是**过期快照**——`check:provider-session-identity` 早已修复
（其源码注释即该次修复的说明），另两条当时属 `ARG-BLIND` 而非 fail-open。

### 9.6 本轮修复的接线缺口：`sdkwork-agents`

`check-cors-standard` 原本报的唯一 wiring error：

```
sdkwork-agents: check:cors-standard is missing;
  declare "node ../sdkwork-specs/tools/check-cors-standard.mjs --root ."
  and reference it from _sdkwork:verify/verify/check
```

按舰队既有写法修复（与 `sdkwork-im` / `sdkwork-mall` / `sdkwork-webserver` 完全同形）：

```json
"check:cors-standard": "node ../sdkwork-specs/tools/check-cors-standard.mjs --root .",
"_sdkwork:verify": "... && pnpm --filter @sdkwork/agents-pc test:agent-contracts && pnpm check:cors-standard",
```

验证：仓内 `--root .` → **`0 gate wiring errors`**（原 1）；
`check-locale-gate-wiring --root ../sdkwork-agents` → `UNREACHABLE 0`。

### 9.7 仍未处置

- **`ARG-BLIND` 6 条**：`check:deps`/`check:exports`/`check:modes`/`check:workflow`
  是工作区根级元检查，根相对**有理**；但 **`check:discovery-standard` 与
  `check:iam-workspace-paths` 是"单仓门禁伪装成工作区门禁"**（硬编码 `<specs>/..`，
  无 `parseArgs`），永远无法指向其他 root——属应补 `--workspace` 的**覆盖债**。
- **`check:packages-layout` 4 errors**：`sdkwork-agentstudio` / `sdkwork-birdcoder2`。
  `sdkwork-birdcoder2` 是 **deepseek-harness 上游 fork**，其仓库根 `packages/` 是上游布局，
  无法迁到 `apps/sdkwork-<code>-<arch>/packages/`；而 `SDKWORK_WORKSPACE_SPEC.md` §1.1.2
  的 5 个 `repository-kind` **没有一个描述"上游对齐 fork"**（`application` 禁止根 `packages/`；
  `shared-package-family`/`foundation-dependency` 都意味着无可运行应用面）。
  ⇒ **规范缺口**，需新增取值（并同步 schema/门禁/文档/测试），未擅自新立枚举。
- **`check:cors-standard` 10 carriers**：`sdkwork-agents` 的内容债 + 域族登记，需 owner 决策。
- **`check:database-initialization` 3 个迁移**：属 §3 C7 迁移折叠。
- 已在前序章节记录：`drama` 的 `orchestration`（B1）、`aiot` 明文库密码（仅报告）、
  schema 未被真正校验、`check-pnpm-script-standard`（798，故意不在 `check:all`）。

### 9.8 本会话的工作区并发变更（重要，影响所有测量）

本会话内 **3 条契约门禁在无我参与的情况下转绿**，且两处 tailwind 修复是**未提交的工作区改动**。
含义有两条：

1. **本工作区有另一个进程在同一 backlog 上工作**。任何"变化"必须先归因再计入结论；
   我本轮的成果**仅限**：2 条 fail-open 门禁 + 1 条 `sdkwork-agents` cors 接线。
2. **矩阵结果是快照，不是稳态**。`check:database-bootstrap-references` 在矩阵中红、
   复测 5/5 绿，即属此类。做交付判定时须以**同一次连续测量**为准。
