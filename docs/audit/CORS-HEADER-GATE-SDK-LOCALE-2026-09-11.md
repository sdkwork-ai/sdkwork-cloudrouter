# 自定义 locale 请求头退役与 CORS 预检闸门（2026-09-11）

## 症状

浏览器控制台对 `http://127.0.0.1:3910` 的每一次 SDK 调用都在预检阶段被打回：

```
Access to fetch at 'http://127.0.0.1:3910/app/v3/api/...' from origin
'http://127.0.0.1:3901' has been blocked by CORS policy:
Request header field x-sdkwork-locale is not allowed by
Access-Control-Allow-Headers in preflight response.
```

受影响面 = 门户所有跨端口浏览器调用：通知铃铛（`notification/notifications`）、
钱包入口（`wallet/portfolio`、`wallet/ledger_entries`、`token_bank/holds`）、
站点品牌（`system/site/runtime`）。origin 校验**通过**了（否则报的是
`No 'Access-Control-Allow-Origin'`），只有 **header 闸门**不通。

## 根因

客户端按当时的规范发自定义 locale 头；服务端读侧也解析它；但浏览器侧 CORS
预检的请求头闸门没有收录它：

| 环节 | 实现 | 事实 |
|---|---|---|
| 浏览器页 origin | `scripts/dev/start-workspace.mjs:59` | `DEFAULT_PORTAL_BIND = '127.0.0.1:3901'` |
| API 入口 :3910 | `crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs:57` | 读 `SDKWORK_CLOUDROUTER_SERVER_BIND`；desktop/service 启动计划传 `--server-bind 127.0.0.1:3910` |
| 该进程的 CORS 权威 | `main.rs:138` | `.security_policy(sdkwork_cloudrouter_http::cloud_service_security_policy(...))` |
| 环境 → 策略 | `crates/sdkwork-cloudrouter-http/src/web_security.rs` | dev/test → `CorsPolicy::development_private_network()`；其余 → `SecurityPolicy::production()` |
| 策略 → tower-http | `../sdkwork-web-framework/crates/sdkwork-web-axum/src/cors.rs` | 过滤掉 `*`，再展开为 `CorsPolicy::default().allowed_headers` |
| 默认请求头清单 | `../sdkwork-web-framework/crates/sdkwork-web-core/src/security.rs` | 有 21 个头，**无自定义 locale 头** |

关键点：dev/test 的 `allowed_headers` 是开发通配器 `["*"]`，而 Axum 侧
`cors_layer_from_policy` **无法**把 `*` 交给 tower-http（`allow_credentials=true`
+ 通配 ACAH 违规），于是把 `*` **回退展开为共享框架的默认清单**。默认清单不含该
自定义头 → 预检响应里没有它 → 浏览器直接拦掉，请求根本到不了路由。

> 备注：这也是"dev 环境看起来放宽、实际等价于生产"的原因。任何 SDK 新增的
> 非标准请求头都会踩同一个坑。**因此正确解法不是往闸门里补头，而是不要造非标准头。**

**次生缺陷**：`edge_server.rs` 的 `policy.expose_headers = vec!["x-request-id"]`
**覆盖**了框架默认的 `["x-request-id", "x-sdkwork-trace-id"]`，违反
`WEB_FRAMEWORK_SPEC.md` §12 关于两个基础设施响应头都必须暴露的 MUST。已一并修复。

## 决议：退役自定义 locale 头，改用标准 `Accept-Language`

第一轮曾以"把该头补进 CORS 闸门"收场，但那只是让一个本不该存在自定义头
继续活下去。第二轮按用户指令转向根因治理：

1. **线上请求头只保留凭据类**：`Authorization` / `Access-Token`。
   不新增、不保留任何 SDKWork 自定义协议头。
2. **locale/i18n 一律使用标准 HTTP 头**：`Accept-Language`（请求）、
   `Content-Language`（响应）、`Vary: Accept-Language`（缓存）。
   自定义 locale 请求头（`X-SdkWork-Locale`）**全面退役**。
3. **不新增字段/头**：不为重复的标准语义扩容。

规范权威层（`../sdkwork-specs`）已先行改动，实现层随后清零。规范文本现在是：

- `I18N_SPEC.md` §3：`source` 枚举去掉 `sdk-header`，只留
  `user-preference | tenant-preference | app-default | accept-language | system-default`。
- `I18N_SPEC.md` §4：locale 协商**只用标准头**；SDKWork `MUST NOT` 定义、发送、
  信任或文档化任何自定义 locale 请求头；客户端选择通过 `Accept-Language` 表达；
  进程内偏好查询是扩展点（§3），不是线格式头。
- `I18N_SPEC.md` §10：SDK transports `MUST` 只用标准 `Accept-Language` 序列化
  locale，`MUST NOT` 合成自定义 SDKWork locale 头，也 `MUST NOT` 要求目标运行时
  profile 为它开闸。
- `WEB_FRAMEWORK_SPEC.md` §12：allowlist `MUST NOT` 为重复标准语义的自定义头扩容；
  dev 放宽 `MUST` 被运行时真正兑现，不能被静默丢弃。

4. **不新增任何 SDKWork 自造头**：`I18N_SPEC.md` §4 原有的三个 `MAY` 诊断响应头
   （`X-SdkWork-I18n-Version` / `X-SdkWork-Message-Bundle-Version` /
   `X-SdkWork-Backend-Message-Bundle-Version`）在全工作区**零实现**，属死协议面，
   已改为 `MUST NOT` 自造 i18n 头；catalog / bundle 版本走构建清单、日志或 trace 属性。

新增静态门禁：`../sdkwork-specs/tools/check-i18n-standard.mjs` 会捕获任何
`x-sdkwork-locale` 字面量，除非该行显式标注 `i18n-retired-locale-header-allow`
（仅允许用于断言"该头不存在"的回归测试与防御性剥离实现）。

**门禁接线（关键）**：该脚本此前只被 `I18N_SPEC.md` §15 文字引用，**未接入任何
`package.json`**，规则实际上没人执行。现已接入工作区根 `package.json`：
新增 `check:i18n-standard`（`--workspace .`）与 `test:i18n`（门禁自测），两者都插入
`check:all`（紧接 `test:cors`）。同时修掉门禁自身的两个误报面，保证它能常绿：

- `isGeneratedDeclarationFile()` 跳过 `*.d.ts` 的**目录布局**规则：编译产物会落在
  authored i18n 源目录旁，不是人写的 i18n 源，不该被"目录布局"规则审判。
- `SKIP_DIRS` 加 `.sdkwork`：本地 AI 工作区元数据/草稿，不是应用源。

> 初版此处曾写"退役头规则对 `*.d.ts` 仍照查，因为陈旧声明会把死协议面带进产物"。
> 该论断在第三轮被证伪（见下节）：包的 `exports` 只指向 `src/*.ts`，编译产物既不被
> 任何模块解析，也不进任何 bundle，对它的报错是一条开发者无法在源码里修好的噪音。

`../sdkwork-specs/tools/check-agent-workflow-standard.mjs` 同步修掉同类误报：
新增 `isIgnoredDirectoryName()`，把仓库 `.gitignore` 覆盖的 `target-` 前缀草稿目录也跳过
（否则它们被当成仓库根，永远报「AGENTS.md must exist」，是无法修好的幽灵违规）。

## 第三轮：全工作区穷尽核查与派生输出策略

用户要求"全面检查所有的实现，必须要完整去掉该头"。因为工作区级 `grep` 在 Windows
沙箱里会被 SIGTERM 截断（会静默漏报），改用一次性 node 穷尽扫描器
（`../sdkwork-specs/.tmp/scan-retired-locale-header.mjs`），跳过
`.git/node_modules/target/dist/build/out/coverage/.next/.turbo/.vite/external/third_party/vendor/__pycache__/.venv/.gradle/.dart_tool/Pods/DerivedData/.cxx/.sdkwork`。

### 扫描规模与分类

```
scanned repos=100 files=150572 bytes=3080021597
findings=44 in 5 repo(s)
```

| 类别 | 命中 | 判定 |
|---|---|---|
| 本仓 `apps/**/src/*.js` 陈旧编译产物 | 2（`auth-projection.js`、`sdk-clients.js`） | **真实债务**：产物落后于源码，注释里还留着退役头。已删 |
| `../sdkwork-birdcoder2/.../ui-sdkwork-apikey/lib/client.js` | 2 | 派生副本：根 `.gitignore:15 lib/` 忽略，源在 `src/`。**不手工改**，重建即清除 |
| `../sdkwork-codebox/.../stream_check.rs` 的 `x-stainless-lang` | 1 | **误报**：Stainless SDK 生成器的第三方公开契约头。规则已改为按 SDKWork 头前缀锚定，天然排除 |
| `../sdkwork-kernel/.tmp/claude-sdk-inspect/*` | 3 | **误报**：未跳过 `.tmp` 时命中的第三方 SDK 打包产物。`SKIP_DIRS` 已补 `.tmp` |
| `../sdkwork-specs/I18N_SPEC.md` / `AGENTS.md` / `docs/audit/*` / `.zcode/plans/*` / `.workbuddy/memory/*` | 余量 | 见下"文档债务判定"，绝大多数**不是**债务 |

### 文档债务判定

"去掉该头的代码"不等于"字面上不允许这个字符串存在"。文档分两类处理：

| 文档类型 | 点名该头是否算债务 | 理由 |
|---|---|---|
| 规范与 `AGENTS.md`（`I18N_SPEC.md` §4、本仓 `AGENTS.md`） | **否** | 禁令必须能点名它禁止的东西。写成"某个自定义头"只会让禁令重新变得含糊，正是本轮要消灭的模糊 |
| 审计/法证记录（`docs/audit/*`） | **否** | 必须逐字引用浏览器报错（`Request header field x-sdkwork-locale is not allowed...`）才能证明症状，引用即证据 |
| 工作区记忆（`.workbuddy/memory/**`） | **否**且**不得清洗** | append-only 项目数据，记录的是"这个头被退役了"这一事实；删掉反而丢失结论 |
| `.zcode/plans/plan-sess_ca14c905-*.md` | **是** | 该计划把 `X-SdkWork-Locale > Accept-Language` 写成**设计与实现步骤**，与现行规范直接冲突，未来 agent 可能据以实现。已加"**已废止**"抬头（保留历史，禁止据以实现） |

> 判据：**描述"它不许存在"的文档不是债务；把它当成设计去实现的文档是债务。**

### 门禁策略升级（`../sdkwork-specs/tools/check-i18n-standard.mjs`）

扫描器升级时把 `.js/.jsx/.tsx/.java/.kt/.swift/.ets/.go/.py/.vue/.svelte/...`
纳入**字面量**规则（退役头是工作区级线格式契约，任何语言都不该漏），但由此暴露了
三个策略缺陷，均已修正：

1. **字面量规则与布局规则解耦**：`LITERAL_SCAN_EXTENSIONS`（全语言）vs
   `SOURCE_EXTENSIONS`（author 书写 i18n 资源的语言）。布局规则判"人把文件放在哪"，
   只能看人写的文件；字面量规则判"这个 token 不许存在"，必须扫遍所有语言。
2. **派生输出判定** `isDerivedTypeScriptOutput()`：与 authored `.ts`/`.tsx` 同名的
   `.js`/`.jsx`/`.d.ts` 是编译产物，跳过字面量规则。**依据是实证而非猜测**：这些包的
   `package.json` `exports` 只指向 `./src/*.ts`，`.ts` 源用显式 `'./sdk-clients.ts'`
   导入 —— 产物既不可达也不入 bundle。`.gitignore` 也早把它们注释为
   "build droppings ... package exports point at src/*.ts"。没有 `.ts` 孪生的独立
   JavaScript 仍是 authored 源，继续扫。
3. **git ignore 即"非 authored 源"的权威** `readGitIgnoredPaths()`：每仓一次
   `git ls-files --others --ignored --exclude-standard --directory -z`，把被忽略的
   路径整体跳过。这是唯一能正确处理 `lib/` 的判据 —— `lib/` 对 TypeScript 包是
   bundler 产物、对 Flutter 包是 authored 源（`lib/src/i18n/...`），按目录名判必错其一。
   tracked 文件不会被 `--ignored` 列出，所以 ignore 规则不可能掩盖已提交的创作源；
   git 缺失/非仓库/索引损坏时降级为"不narrow"，静态规则照常跑。
4. **Markdown 不入字面量扫描**：禁令必须能点名它禁止的东西，否则规范只能重新变得含糊。
   该取舍已写进 `I18N_SPEC.md` §15 的新 MUST 条款。
5. 扫描器自身的 JSDoc 曾枚举 `x-sdkwork-lang`/`x-sdkwork-language`/`x-sdkwork-locale-*`
   作为示例（规则会匹配自己），改为描述前缀锚定，不再自指。

### 本仓债务清理：删除 136 个 build droppings

`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/`（101）
与 `.../sdkwork-cloudrouter-pc-console-api-keys/src/`（35）下的
`*.js` / `*.js.map` / `*.d.ts` / `*.d.ts.map` 共 **136 个**文件。

删除前的四项证据（缺一不可）：

1. `git ls-files` 这 136 个路径 = **0 个被跟踪**；
2. `package.json` `exports` 全部指向 `./src/*.ts`；`.ts` 源用显式 `.ts` 扩展名导入，
   无一处 `from './x.js'`（≥1 处才会真的解析到产物）；
3. 全 app 内**无任何**指向这两包 `src/*.js` 的路径式导入；
4. 逐个校验：每个 `.d.ts` 都有 `.ts` 孪生、每个 `.js` 都有 `.ts`/`.tsx` 孪生（0 ORPHAN）。

`.gitignore` 同步补齐 `apps/sdkwork-cloudrouter-pc/packages/*/src/**/*.d.ts.map`
（此前只忽略 `*.d.ts` 与 `*.js.map`，`.d.ts.map` 会以未跟踪状态脏掉 `git status`），
并把注释从"accidentally committed"改述为"never edit or commit them, delete them"。

> 分类判据：**能由源码重建、且无解析路径指向它的文件，不是实现，是残留。**
> 退役它的方式是把陈旧副本删掉，而不是把它的字符串手工改一遍。

## 实施清单（本仓）

Rust：

1. `crates/sdkwork-cloudrouter-http/src/locale.rs`
   - 删除 `SDK_LOCALE_HEADER` 常量与 `LocaleSource::SdkLocaleHeader` 变体。
   - `CloudRouterLocalePolicy::resolve()` 去掉 `sdk_locale` 首参，优先级改为
     `Accept-Language` > `defaultLocale` > `fallbackLocale`。
   - 中间件不再读取该头；新增 `middleware_ignores_retired_custom_locale_header`
     断言发送该头**不影响**协商结果。
2. `crates/sdkwork-cloudrouter-http/src/web_security.rs`
   - 删除 `APPROVED_SDK_PROTOCOL_REQUEST_HEADERS` 与
     `merge_approved_sdk_protocol_request_headers()` 及其调用。
   - 单测反转为 `cors_header_gate_carries_no_retired_custom_locale_header`：
     三个环境都**不得**允许该头，且生产闸门保持显式枚举（无 `*`）。
3. `crates/sdkwork-cloudrouter-http/src/lib.rs`：撤掉上述导出。
4. `crates/sdkwork-cloudrouter-edge-runtime/src/edge_server.rs`
   - 移除共享合并调用；闸门只保留 `x-goog-api-key`（Google 兼容网关凭据头，
     公开外部契约）与 `x-request-id`（标准追踪头），并注释说明 locale 不再入闸。
   - `expose_headers` 维持上一轮的**合并**语义，保住 `x-sdkwork-trace-id`。
5. `crates/sdkwork-cloudrouter-edge-runtime/tests/edge_server.rs`
   - `edge_server_handles_direct_portal_dev_cors_preflight` 改为断言
     ACAH 含 `accept-language`、**不含** 自定义 locale 头、不含 `*`。

TypeScript（`apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/`）：

6. `sdk-locale.ts`：`withLocaleHeaders()` 只注入 `Accept-Language`；
   文档注释去掉自定义头。`sdk-locale.test.ts` 两个用例改为断言该头
   **必须缺席**。
7. `auth-projection.ts`：新增 `RETIRED_PROTOCOL_HEADER_NAMES`（当前 =
   自定义 locale 头），`omitAuthProjectionHeaders()` 在传输层**防御性剥离**它，
   使旧调用方无法把它重新带上线。
   `sdk-clients-auth-projection.test.ts` 对应用例改为断言"保留标准头、剥离退役头"。
8. `sdk-clients.ts`：组装注释改为只提 `Accept-Language`。

> `src/*.js` / `src/*.d.ts` 是构建产物（未跟踪）。第三轮已把这两个包 `src/` 下
> 136 个陈旧产物**整体删除**（证据见上节），不再有需要"重新生成"的副本。

文档与 Agent 路由：

9. `AGENTS.md` 新增 `## HTTP Request Header Contract (I18N_SPEC §4, API_SPEC §10.2)` 章节，
   并在 `Required Specs By Task Type` 增加 i18n/locale 任务行，让后续 agent 在动 header
   代码前先读到该纪律。
10. 本文件（`docs/audit/CORS-HEADER-GATE-SDK-LOCALE-2026-09-11.md`）更新为
    退役决议的完整记录。

## 跨仓发现与处置

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| D1 | `../sdkwork-specs/WEB_FRAMEWORK_SPEC.md` §12 | 曾因批准自定义头而留下"为它扩闸门"的口子 | **已消除**：改为 `MUST NOT` 为重复标准语义的自定义头扩容 |
| D2 | 各仓 CORS allowlist 里手工补的自定义 locale 头 | 死代码，且是 CORS 预检的长期风险面 | **已清零**：本仓 + `sdkwork-order`（app-api / backend-api 两处 `web_bootstrap.rs`） |
| D5 | `../sdkwork-web-framework/specs/WEB_FRAMEWORK_STANDARD.md`、`specs/web-request-context.schema.json`、`docs/architecture/tech/TECH-03-web-request-context.md` | 仍声明 `sdk-header` / `SdkHeader` locale 来源 | **已清零**（三处均无框架实现，属文档/schema 债务） |
| D6 | `../sdkwork-specs/AGENTS_SPEC.md` §5 | 任务矩阵没有 i18n/locale 行，也没有"请求头只放凭据 + 标准头"的规范句 | **已补** |
| D7 | `../sdkwork-birdcoder2/packages/client/ui-sdkwork-apikey/lib/client.js` | 旧 bundle 仍带该头 | **不手工改**：根 `.gitignore:15 lib/` 忽略的 tsdown 产物，重建即清除。第三轮起门禁按仓 ignore 规则跳过它，不再计为违规 |
| D3 | `../sdkwork-web-framework/.../crates/sdkwork-web-axum/src/cors.rs` | 文档承诺的 dev「放宽为 `*`」实际从不生效：先过滤 `*` 再展开成默认清单 | **保留**：框架层真实缺陷，与本次退役正交 |
| D4 | `../sdkwork-web-framework/.../crates/sdkwork-web-core/src/security.rs` `apply_headers_from_origin` | 通配时直接写 `Access-Control-Allow-Headers: *`，同时写 `Access-Control-Allow-Credentials: true`；浏览器对凭证请求拒绝该组合 | **保留**：同上；故本次刻意不给 edge 打开 `with_development_private_network_cors` |

D3/D4 是"dev 放宽不可兑现"的框架级缺陷，不因本次退役消失（未来任何非标准头都会
再踩一次），已在 `sdkwork-cors-standard-alignment` 技能中记录，待跨仓任务处置。

## 验证

```
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .            # 本仓
node ../sdkwork-specs/tools/check-i18n-standard.mjs --workspace ..      # 全工作区
node ../sdkwork-specs/tools/check-agent-workflow-standard.mjs --root .
node --test ../sdkwork-specs/tools/check-i18n-standard.test.mjs
node --test ../sdkwork-specs/tools/check-agent-workflow-standard.test.mjs
node --import tsx --test packages/sdkwork-cloudroutes-pc-commons/src/sdk-locale.test.ts \
  packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients-auth-projection.test.ts
CARGO_INCREMENTAL=0 cargo test -j 2 -p sdkwork-cloudrouter-http --lib
CARGO_INCREMENTAL=0 cargo test -j 2 -p sdkwork-cloudrouter-edge-runtime --test edge_server
```

实测结果：

| 项 | 结果 |
|---|---|
| `check-i18n-standard` 本仓 | `i18n standard check passed`（首轮改前 17 处违规） |
| `check-i18n-standard` 全工作区 | `i18n standard check passed`，100 仓 / 150,572 文件 / 3.08 GB，约 30s（首轮改前 12 处） |
| `check-agent-workflow-standard` 本仓 | `agent and workflow standard ok`（2 AGENTS roots / 6 shims / 3 workflow files） |
| `check-i18n-standard.test.mjs` | **14 passed / 0 failed**（原 7 项 + 新增 7 项：4 项规则覆盖 + `.d.ts` 跳过 + 派生输出跳过 + git-ignored 跳过 + 独立 JS 仍拒） |
| `check-agent-workflow-standard.test.mjs` | 10 passed / 0 failed |
| `sdk-locale.test.ts` + `sdk-clients-auth-projection.test.ts` | 13 passed / 0 failed |
| `cargo test -p sdkwork-cloudrouter-http --lib` | **52 passed / 0 failed**（含 `cors_header_gate_carries_no_retired_custom_locale_header`、`middleware_ignores_retired_custom_locale_header`） |
| `cargo test -p sdkwork-cloudrouter-edge-runtime --test edge_server` | **43 passed / 0 failed**（含改写的 `edge_server_handles_direct_portal_dev_cors_preflight`） |
| 本仓 `src/` 陈旧编译产物 | **136 → 0**（0 个被 git 跟踪、0 个路径式导入引用） |

### 顺带修掉的规格层门禁缺陷：自测工具路径相对 cwd

排查本议题时发现 `../sdkwork-specs` 的门禁自测普遍把被测工具写成
`path.resolve('tools/<x>.mjs')` —— 这是**相对调用者 cwd** 的。而工作区根正是这样聚合它们的：
`node --test sdkwork-specs/tools/<x>.test.mjs`（cwd = 工作区根）→ 解析成
`E:\sdkwork-space\tools\<x>.mjs` → 全部 `Cannot find module`，**在断言任何东西之前就死掉**，
却只在把门禁接进根聚合时才暴露。

已修 9 个（改为 `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '<x>.mjs')`）：
`align-agents-progressive-loading`、`align-app-topology-deployment-profiles`、
`audit-gateway-alignment-repo`、`bootstrap-api-assembly-repo`、`check-identity-naming`、
`check-pagination`、`check-pnpm-script-standard`、`check-topology-deployment-profiles`、
`wire-api-assembly-host`。改前仅能从 `sdkwork-specs` 目录跑通、从工作区根必崩；
改后两种 cwd 结果完全一致：

| 套件 | pass | fail |
|---|---|---|
| `align-agents-progressive-loading` | 13 | 0 |
| `align-app-topology-deployment-profiles` | 7 | 0 |
| `audit-gateway-alignment-repo` | 4 | 0 |
| `bootstrap-api-assembly-repo` | 4 | **1（既存，改前即失败）** |
| `check-identity-naming` | 10 | 0 |
| `check-pagination` | 20 | 0 |
| `check-pnpm-script-standard` | 61 | 0 |
| `check-topology-deployment-profiles` | 43 | 0 |
| `wire-api-assembly-host` | 2 | 0 |

另有两项**未处置**（只记录）：`bootstrap-api-assembly-repo` 的既存失败
（`route crates must export gateway_route_manifest() -> HttpRouteManifest`，
`sdkwork-routes-catalog-app-api`），以及上述套件里多数**未接入工作区根聚合**
（接线缺口 = 规则形同虚设，同 §E.7 判据；接入前需先清掉那个既存失败）。

### 未因本次改动引入的既存问题（已核实，不属本议题）

- 工作区 `check:workflow` 报 3 处 `RELEASE_DEPENDENCY_MISSING` / `WORKFLOW_JSON_MISSING`
  （`sdkwork-sdk-generator` 缺 `sdkwork.workflow.json`；`sdkwork-video-cut` 缺 4 个、
  `sdkwork-web-framework` 缺 5 个 release 依赖）。三仓 `sdkwork.workflow.json` **均未被本次
  改动触碰**（`git status` 无该文件），其工作区本身带大量无关 `M`（`Cargo.toml` 族）；
  属跨仓既存门禁债，按任务范围纪律只记录、不擅自处置。

- 前端 `typecheck-owned-sources.mjs` 3 条诊断，全在本次未触碰的包：
  `packages/sdkwork-cloudrouter-pc-console-usage/src/UsageView.tsx:71`（`cursor` 不在
  `AiUsageLogsListParams`）、`packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx:29`
  与 `.../playgroundBalancePort.ts:1`（兄弟包 `AgentsWorkbenchRuntime` / `ChatBalancePort` 漂移）。
- 本仓既存 `M` 状态（mtime 均早于本次会话起点 16:43）：`.gitignore`、`Cargo.lock`、
  `etc/topology/cloud.demo.env`、`BatchCodesPage.tsx`、`ApiKeysView.tsx` 及若干 `.d.ts.map`。
- 前端 `dist/**` 与 `sdkwork-birdcoder2` 的 `lib/client.js` 是 gitignored 构建产物，
  仍含旧头，**重建即清除**；dev 由 vite 直接从源码服务，故本次修复对开发环境即时生效。
  第三轮起门禁按仓 ignore 规则跳过这两类路径（见上节），因此"全工作区 passed"与
  "旧 bundle 尚未重建"并不矛盾：门禁判的是 authored 源，产物由各自仓的构建负责。

> Windows 前置：MSVC `link.exe` 必须在 PATH 前部，否则 Git Bash 的 coreutils `link`
> 会被选中并报 `link: extra operand`。本次使用 VS2022 Community
> `VC/Tools/MSVC/14.44.35207/bin/HostX64/x64` + Windows Kits 10.0.26100 LIB/INCLUDE；
> **`LIB` 必须同时含 MSVC 的 `VC/Tools/MSVC/<ver>/lib/x64`**，否则链接期报
> `LNK1104: cannot open file 'msvcrt.lib'`。
> ring/aws-lc-sys 的 cl.exe 并行竞态 → 删失败的 `target/debug/build/ring-*` 目录 + `-j 2`。

## 复现与回归

重启 :3910 进程（Rust 侧）后生效。回归判据：

1. DevTools 对 `http://127.0.0.1:3910/app/v3/api/...` 的 OPTIONS 预检应含
   `access-control-allow-headers` 中的 `accept-language`，且**不含**任何
   SDKWork 自定义 locale 头、不含 `*`。
2. 同响应应含 `access-control-expose-headers: x-request-id, x-sdkwork-trace-id`。
3. 通知铃铛 / 钱包入口 / 站点品牌三处请求由 `net::ERR_FAILED` 转为 2xx。
4. 切换界面语言后，下一次请求的 `Accept-Language` 随之变化（语言切换即时生效）。
