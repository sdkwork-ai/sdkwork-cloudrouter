# 控制台「智能体管理」功能设计与实施计划

> 状态：**设计定稿（D1–D4 已裁决，2026-09-23）**，待进入 P1 实施
> 范围：跨 `sdkwork-agents`（能力包 + 权限自服务）与 `sdkwork-cloudrouter`（宿主接线）两仓库
> 需求原文：在 console 增加智能体管理功能；在 sdkwork-agents 中实现 console 的能力；sdkwork-cloudrouter 集成 sdkwork-agents 的页面；每个用户都可以管理自己创建的智能体，并可以创建智能体。
> 设计原则：**服务端已有的一律复用，不新建表、不新建端点**；控制台只补「管理台形态」的消费面与归属自服务授权。
> 一期范围（D3）：列表 + 创建 + 编辑 + 删除；仅 PC 端（D4）。

---

## 0. 已核实的技术事实（决定方案形态）

| 项 | 现状（已核实 + 证据） |
| --- | --- |
| 数据层 | ✅ 已存在。`sdkwork-agents/database/ddl/baseline/postgres/0001_agents_baseline.sql` 含 30 张表；核心表 `ai_agent` 具 `owner_user_id BIGINT NOT NULL`（用户归属在库内已建模）、`status SMALLINT (0..4)`、`visibility SMALLINT (0..3)`、`manifest_json JSONB` |
| 服务层 | ✅ 已存在。app-api authority = `sdkwork-agents-app-api`，prefix `/app/v3/api`；`GET/POST /app/v3/api/ai/agents`、`GET/PATCH/DELETE /app/v3/api/ai/agents/{agentId}`、`/versions`、`/calls`、`/preview_responses`、`/prompt_optimizations`、`/provider_bindings`、`/restore` 全部已落地（`crates/sdkwork-intelligence-agents-service/specs/openapi/agents-app-api.openapi.yaml`） |
| 归属语义 | ✅ 已实现。`http.rs:5726-5734` app-api 列表固定 `owner_scoped=true` ⇒ **不带 `scope` 时只返回当前用户拥有的智能体**；`ListScope`（`scope` 查询参数）仅 `market/public/published/mine/workspace` 用于切到租户目录（yaml:5024-5033） |
| SDK 层 | ✅ 已生成。`@sdkwork/agents-app-sdk` / `-backend-sdk` 已在 `sdkwork-cloudrouter` 的 `pnpm-workspace.yaml` 注册，且 `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/package.json` 已直接依赖两者 |
| 宿主 SDK 客户端 | ✅ 已接线。`sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts:1122` 导出 `getSdkworkAgentAppSdkClient`，`runtime` 子入口已再导出 |
| **既有跨仓消费先例** | ✅ **同形态先例已存在**：`packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx:28-45` 就是「cloudrouter 作为宿主，`configureAgentsPlaygroundRuntime()` 注入 SDK 客户端 → 渲染 `@sdkwork/agents-pc-playground`」。本方案照此范式，不发明新机制 |
| 控制台框架 | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx:49-71` —— 菜单是**静态数组** `consoleSidebarItems` / `consoleSidebarGroups`（含 `group.integration` / `group.accountBusiness` / `group.observability` / `group.notificationsSettings`）；路由集中在 `src/App.tsx:182-196`，按 `lazyRoute()` 动态导入 |
| 控制台 i18n | `packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts` 集中放 `console.menu.*` 中英双份（en 段 :13-26，zh 段 :85+） |
| workspace 注册 | `sdkwork-cloudrouter/pnpm-workspace.yaml` **已列出 sdkwork-agents PC 全族 12 个包**（含 `sdkwork-agents-pc-agents`、`sdkwork-agents-pc-core`）⇒ 新包只需补 1 行，且必须走 `sdkwork-specs/tools/sync-workspace.mjs` 通道 |
| PC 端已有形态 | `sdkwork-agents-pc-agents` 已有 `AgentsHomePage`（市场卡片墙）、`AgentView`（详情+对话）、`CreateAgentView`（1171 行创建向导）、`CreateAgentModal`、`AgentService`（含 `listAgentsPage({scope:'mine'})` / `createAgent` / `updateAgent` / `deleteAgent` / `publishAgent`）—— 均为**消费产品形态**，非管理台形态 |
| 后端权限授予 | 🔴 `sdkwork-iam/iam/modules/ai/iam.module.manifest.json:214-222`：`app_user` 仅被授予 `ai.agents.read` / `ai.agents.use` / `ai.skills.read`；`ai.agents.manage` **只给** `org_admin` / `org_operations`（`ai.*`） |
| 后端权限判定 | 🔴 `agents-app-api.openapi.yaml`：`agents.create` = `ai.agents.use`（scope `authenticated`，:52）；`agents.list/retrieve` = `ai.agents.read`；**`agents.update`(:191) / `agents.delete`(:270) / `change_status` = `ai.agents.manage`**；`infrastructure.rs:7321-7345` 单测把 `update/delete/change_status` 显式钉死在 manage（断言文案 `must remain restricted to ai.agents.manage`） |
| 端覆盖 | cloudrouter PC 有 `/console/*`；H5 有独立控制台装配（`apps/sdkwork-cloudrouter-h5/src/routes/consoleRoutes.ts`）但结构不同、成本另计 |

---

## 1. 目标与非目标

### 1.1 目标（用户视角）

登录 cloudrouter → `/console/agents`，看到**「我的智能体」**列表，并能：

| # | 能力 | 说明 |
| --- | --- | --- |
| G-1 | 列表 | 只列**当前用户拥有**的智能体（服务端已天然归属过滤）；分页 / 关键字搜索 / 状态筛选 |
| G-2 | 新建 | 引导式创建（名称、描述、图标、可见性、模型、系统提示词、欢迎语、建议问、知识库 / 技能 / 工具 / 语音）⇒ 落 `draft` |
| G-3 | 编辑 | 改基础信息与运行配置；乐观并发（`expectedVersion`） |
| G-4 | 删除 | 软删（`deleted_at`），默认列表隐藏，可开关显示已删 |
| G-5 | 详情 / 试运行 | 查看配置快照、`preview_responses` 试跑、`prompt_optimizations` 优化提示词 |
| G-6 | 版本 | 查看版本历史、激活指定版本 |
| G-7 | 调用记录 | 按智能体看 `calls`（执行历史） |
| G-8 | 生命周期 | 提交发布（`draft → active`）/ 停用（`active → disabled`）/ 归档 —— **受 manage 权限约束**，见 §3 |

### 1.2 非目标（本期不做，避免范围蔓延）

- 不做市场 / 模板广场（`scope=market` 是消费端 `AgentsPlayground` 的职责）。
- 不做智能体的会话管理、创作工作台（属 `agents-pc-chat` / `agents-pc-creative`）。
- 不做 admin 侧的租户级智能体治理面（租户全量列表 / 强制下架）—— 若需要，按 `admin-*` 薄别名范式另开。
- 不做 H5 端（§12 裁决项 D4）。
- **不新建数据库表、不新建 HTTP 端点、不重生成 SDK**（服务端已完整；唯一服务端改动是权限动作拆分，见 §3 / §5.3）。

---

## 2. 职责边界（三层，谁拥有什么）

```
┌────────────────────────────── sdkwork-cloudrouter（宿主） ──────────────────────────────┐
│  ① 框架层  ConsoleLayout 菜单项 + src/App.tsx 路由 + i18n 文案                          │
│  ② 适配层  packages/sdkwork-cloudrouter-pc-console-agents/  ← 薄适配，只做运行时注入     │
│             · import { AgentsConsoleView, configureAgentsConsoleRuntime }               │
│             · 注入 getSdkworkAgentAppSdkClient（来自 cloudroutes-pc-commons/runtime）    │
│             · 不写任何业务判据、不直连 HTTP                                              │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ 依赖 @sdkwork/agents-pc-console-agents（workspace:*）
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│  sdkwork-agents（能力包 owner）                                                          │
│  ③ 能力包   apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-console-agents/           │
│             · 页面：我的智能体列表 / 创建向导 / 编辑抽屉 / 详情与试运行 / 版本 / 调用记录  │
│             · 服务：AgentConsoleService（薄封装 app-sdk 调用 + 归属投影）                 │
│             · 导出 AgentsConsoleView + configureAgentsConsoleRuntime + 路由/资源标识常量  │
│             · 禁止 import 生成 SDK（走 agents-pc-core 的 client 端口或 runtime 注入）      │
│  ④ 契约层   apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-core（已是 SDK 客户端持有者）│
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                         │ HTTP /app/v3/api/ai/agents*
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│  sdkwork-agents 服务端（已存在，本期只改权限动作划分）                                     │
│  ai_agent 等 30 表 · app-api CRUD/版本/调用/试运行 · 归属过滤 owner_scoped=true           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**关键约束（两条）**

1. **适配层零业务**：`sdkwork-cloudrouter-pc-console-agents` 只允许出现「导入 + 注入 + 渲染」三种语句。任何「哪些字段可编辑」「什么状态可提交」的判断都必须住在能力包里，否则第二个宿主（H5 / 未来 App 壳）会分叉。
2. **能力包不碰生成 SDK**：参照仓内既有范式（`sdkwork-agents-pc-agents` 通过 `@sdkwork/agents-pc-core/sdk/agentsAppSdkClient` 取客户端；cloudrouter 侧通过 `configureApiKeyServiceClients` 式注入 seam）。这样能力包可被任何宿主复用，且宿主能自带 baseUrl / tokenManager。

---

## 3. 🔴 阻断级缺口：需求 G-3 / G-4 / G-8 在服务端当前**做不到**

这是本设计最重要的发现，**必须先裁决再动工**，否则做完页面点「编辑」就是 403。

### 3.1 事实链

| 环节 | 证据 | 结论 |
| --- | --- | --- |
| `app_user` 角色授权 | `sdkwork-iam/iam/modules/ai/iam.module.manifest.json:216-221` | 只有 `ai.agents.read` / `ai.agents.use` / `ai.skills.read`，**无 `manage`** |
| `ai.agents.manage` 归属 | 同文件 :223-234 | 仅 `org_admin` / `org_operations`（`ai.*`） |
| create 所需权限 | `agents-app-api.openapi.yaml:58-62` | `ai.agents.use`（`x-sdkwork-permission-scope: authenticated`）→ 普通用户**可以**创建 |
| update / delete 所需权限 | 同 yaml :191 / :270 | `ai.agents.manage` → 普通用户**不可以**编辑/删除 |
| 该约束是"刻意"的 | `sdkwork-intelligence-agents-service/src/infrastructure.rs:7321-7345` | 单测名 `iam_gated_provider_keeps_management_actions_behind_manage_permission`，断言 `update/delete/change_status/provider_binding.*` 必须对 `ai.agents.use` 返回 Deny |
| 对比：子资源已是自服务 | 同文件 :7289-7300 | `project.update` / `project.delete` / `session.delete` / `session.update` 等**已经**允许 `ai.agents.use` ⇒ 仓内已有"归属自服务"先例，顶层 agent 是**遗漏**而非设计取舍 |

⇒ 现状可概括为：**「能建、能看自己的、不能改自己的」**。与需求「每个用户都可以管理自己创建的智能体」正面冲突。

### 3.2 三种修法

| 方案 | 做法 | 代价 | 越权面 | 评价 |
| --- | --- | --- | --- | --- |
| **A（推荐）归属自服务动作** | 在 kernel 策略里为顶层 agent 引入归属自服务动作（如 `update_owned` / `delete_owned` / `change_status_owned`）：命中条件 = 持有 `ai.agents.use` **且** 目标记录 `owner_user_id == subject.user_id` **且** 同租户；资源级动作 `update`/`delete` 保持原来的 manage 门槛 | 改 `infrastructure.rs` 策略表 + 新增归属判定注入 + 单测；`agents-app-api` 契约**无需改**（权限码仍写 `ai.agents.use`，与 `project.update` 同款） | 最小：仅"自己的"记录 | ✅ 与既有 `project.*` / `session.*` 自服务一致；`org_admin` 不受影响 |
| B 直接给 `app_user` 加 `ai.agents.manage` | 改 `iam.module.manifest.json` 一行 | 一次改动最小 | **大**：同时放开"租户内任意智能体"的编辑/删除/上下架/provider_binding.activate/变更状态，多人共租户下互相篡改 | ❌ 权限爆炸，不推荐 |
| C 不做 | 控制台对无 manage 用户隐藏编辑/删除 | 0 | 0 | ❌ 与需求冲突，退化成"只读 + 新建" |

> ⚠️ 若选 A，`infrastructure.rs:7321-7345` 那条既有单测**必须同步改**（它断言的正是要被放开的集合），且需补一条反向断言：**非归属记录**用 `ai.agents.use` 仍必须 Deny。这两条是本次改动的"自证门禁"，缺一不可。

---

## 4. 目标架构与数据流

### 4.1 路由与菜单落点

| 项 | 落点 | 值 |
| --- | --- | --- |
| 控制台路由 | `src/App.tsx`（`/console` 子路由表内） | `path="agents"` → `<AgentsConsoleView />` |
| 首页跳转 | 不动（`/console` index → `/console/dashboard`） | — |
| 侧边栏菜单 | `ConsoleLayout.tsx` 的 `consoleSidebarGroups` | 新增一个菜单项；**分组归属见 §12 裁决项 D1** |
| 菜单文案键 | `console.menu.agents` / `console.menu.agents.description` | 中英双补（`resources/console/core.ts`） |
| 深链 | `/console/agents`（列表）、`/console/agents/new`（创建）、`/console/agents/:agentId`（详情） | 详情页内以 Tab 承载 版本 / 调用记录 / 试运行 |

### 4.2 数据流

```
用户操作 ──▶ AgentsConsoleView（能力包，sdkwork-agents）
                │  AgentConsoleService
                │    · 纯函数：projectAgentPermissions(agent, grantedCodes) → {canEdit, canDelete, canPublish, ...}
                │    · SDK 调用：list / create / update / delete / versions / calls
                ▼
          getAgentsAppSdkClient()  ← 运行时注入（宿主提供）
                ▼
          @sdkwork/agents-app-sdk  →  /app/v3/api/ai/agents*
                ▼
          sdkwork-agents 服务（归属过滤 owner_scoped=true）
```

---

## 5. 能力包设计（sdkwork-agents 侧）

### 5.1 新包

`apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-console-agents/`

```jsonc
// package.json 关键字段
{
  "name": "@sdkwork/agents-pc-console-agents",
  "private": true,
  "type": "module",
  "sdkwork": { "architecture": "pc-react", "surface": "console" },
  "exports": {
    ".": "./src/index.ts",                 // AgentsConsoleView + 路由/资源标识常量
    "./runtime": "./src/runtime.ts"        // configureAgentsConsoleRuntime + 类型
  },
  "dependencies": {
    "@sdkwork/agents-pc-core": "workspace:*",   // 仅取 SDK client 端口 / 类型
    "@sdkwork/utils": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:",
    "lucide-react": "catalog:"
  }
}
```

- `specs/component.spec.json`：`surface: "console"`、`layerRole: "frontend-feature"`、`publicExports: [".", "./runtime"]`、`providedPorts: ["agents.console"]`、`requiredPorts: ["agents.sdk"]`。
- ⚠️ **`@sdkwork/agents-app-sdk` 不进本包 `dependencies`**；SDK 客户端由 runtime 注入。

### 5.2 目录与职责

```
src/
  index.ts                                  导出 AgentsConsoleView、AGENTS_CONSOLE_ROUTE_ID、AGENTS_CONSOLE_RESOURCE_KEY
  runtime.ts                                configureAgentsConsoleRuntime({ getAgentsAppSdkClient, onLoginRequired? })
  pages/
    AgentsConsoleView.tsx                   外壳：页头 + 工具栏 + 列表 + 抽屉/弹窗编排
    AgentsListSection.tsx                   表格（分页 / 搜索 / 状态筛选 / 批量选择）
    AgentDetailSection.tsx                  详情（一期：概览 + 编辑入口；二期：追加版本/调用/试运行 Tab）
  components/
    CreateAgentWizard.tsx                   创建向导（可复用 agents-pc-agents 的 SelectModelPopover / SelectSkillsModal / SelectToolsModal / SelectKnowledgeModal / EmojiPicker）
    AgentFormDrawer.tsx                     编辑抽屉（含乐观并发 expectedVersion）
    AgentStatusBadge.tsx                    draft/active/disabled/archived/deleted 徽标
    AgentVisibilityBadge.tsx                private/organization/tenant/public 徽标
    DeleteAgentDialog.tsx                   删除确认（软删语义文案）
    AgentsEmptyState.tsx                    空态（区分"一个都没有"与"筛选无结果"）
    AgentsPermissionNotice.tsx              权限不足的**可见**说明（不是静默隐藏）
  services/
    AgentConsoleService.ts                  list / get / create / update / delete / activateVersion / listVersions / listCalls
    agentConsolePermissions.ts              纯函数权限投影（唯一一份）
    agentConsoleDictionaries.ts             状态/可见性 → 文案键 与 排序权重（唯一一份）
  i18n/
    zh-CN.ts / en-US.ts                     命名空间 `agentsConsole.*`
```

### 5.3 权限投影（唯一一份，纯函数 + 单测）

```ts
export interface AgentConsoleCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;   // draft → active
  canDisable: boolean;   // active → disabled
  canArchive: boolean;
  canEditProviderBinding: boolean;
}

/**
 * 输入：服务端返回的记录（含 ownerUserId）+ 当前会话主体（userId、已授予权限码）。
 * 输出：控制台动作可用性。
 *
 * 🔴 两把闸独立，不得合并：
 *   1) 归属闸：record.ownerUserId === subject.userId
 *   2) 权限闸：ai.agents.manage（或 §3 方案 A 上线后的「自服务动作」语义）
 *   服务端最终判定为准；前端投影只用于「提前禁用 + 给出原因」，不用于放行。
 */
export function projectAgentCapabilities(
  agent: AgentOwnershipView,
  subject: { userId: string; permissions: readonly string[] },
): AgentConsoleCapabilities;
```

**单测必须覆盖（每条闸单独钉）**：

| 用例 | 归属 | manage | 期望 |
| --- | --- | --- | --- |
| 自己的 + 有 manage | ✅ | ✅ | 全放行 |
| 自己的 + 无 manage | ✅ | ❌ | `canEdit/canDelete=true`（方案 A 生效后）；若仍选 B/C 则 false |
| 别人的 + 有 manage | ❌ | ✅ | 全放行（管理员） |
| 别人的 + 无 manage | ❌ | ❌ | 全部 false，且**必须**给出"仅能管理自己创建的智能体"的可见提示 |

> 变异验证：把「归属闸」短路（恒 true）⇒ 应恰好红第 3、4 两条。

### 5.4 服务端最小改动（仅方案 A 需要）

| 文件 | 改动 |
| --- | --- |
| `crates/sdkwork-intelligence-agents-service/src/infrastructure.rs` | 策略动作表：顶层 agent 增加归属自服务动作；`update/delete/change_status` 的判定顺序 = 先试自服务（`ai.agents.use` + owner 匹配）→ 否则回退 manage |
| 同文件 `:7321-7345` | 既有单测同步调整，并**新增**「非归属 + use ⇒ Deny」反向断言 |
| `src/http.rs`（`app_update_agent` / `app_delete_agent` 等 handler） | 取记录 → 比对 `owner_user_id` → 选择动作码；**判定顺序必须与策略表一致**（勿从契约权限名反推） |
| `agents-app-api.openapi.yaml` | `agents.update` / `agents.delete` 的 `x-sdkwork-permission` 文案改为自服务口径（权限码仍是 `ai.agents.use`，与 `project.update` 同款）；`apis/agents/` 下 changelog 追加一条 |
| 契约链 | 改 yaml 后必跑：契约校验 → `sdk_runtime_standardizer --openapi-only` → 逐个 SDK `generate-sdk.mjs` → **`pnpm --dir <...-typescript> build`**（少最后一步会 `dist/*.d.ts` 陈旧） |

---

## 6. 宿主接线（sdkwork-cloudrouter 侧，六处 + 两处易漏）

| # | 位置 | 动作 | 易漏点 |
| --- | --- | --- | --- |
| 1 | `packages/sdkwork-cloudrouter-pc-console-agents/src/index.tsx`（新包，薄适配） | `configureAgentsConsoleRuntime({ getAgentsAppSdkClient: getSdkworkAgentAppSdkClient, onLoginRequired })` + 导出 `AgentsConsoleView` | 必须**在模块顶层同步**完成注入（照 `Playground.tsx:28` 的先例），否则首帧拿不到客户端 |
| 2 | `src/App.tsx` | `const AgentsConsoleView = lazyRoute(() => import('@sdkwork/cloudrouter-pc-console-agents'), 'AgentsConsoleView')` + `<Route path="agents" element={<AgentsConsoleView />} />` | 路由必须放在 `/console` 的 children 里、且排在 `path="*"` 兜底之前 |
| 3 | `packages/sdkwork-cloudrouter-pc-console-shell/src/ConsoleLayout.tsx` | `consoleSidebarGroups` 增加菜单项（`icon` 用 `lucide-react` 已有图标或新增导入） | 该文件是**纯静态数组**，没有注册表；顺序即渲染顺序 |
| 4 | `packages/sdkwork-cloudrouter-pc-i18n/src/resources/console/core.ts` | 补 `console.menu.agents` 中英 | 不补不报错，只是回落到 `fallbackLabel` —— 属于"看起来能跑"的假接线 |
| 5 | `pnpm-workspace.yaml` | 补 `../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-console-agents` | ⚠️ 该文件由 `sdkwork-specs/tools/sync-workspace.mjs` 渲染并被门禁比集合：先改 `sdkwork-specs/workspace/consumers/sdkwork-cloudrouter.json`，再 `--check` 通过 |
| 6 | `apps/sdkwork-cloudrouter-pc/package.json` | 手写补 `"@sdkwork/cloudrouter-pc-console-agents": "workspace:*"` | 生成器/物化脚本**不管**这一行；漏了就是 `MODULE_NOT_FOUND` |
| 7 | 链接安装 | `pnpm install --filter @sdkwork/cloudrouter-pc --ignore-scripts --reporter=append-only` | ❌ 用 `--filter @sdkwork/cloudrouter-pc-console-agents` **不会**在应用根建链接；判据 `ls apps/sdkwork-cloudrouter-pc/node_modules/@sdkwork/ | grep cloudrouter-pc-console-agents` 非空 |
| 8 | 路由标识对齐测试 | 若新增 console 资源键进入任何路由清单/门禁，需同步其 `plan.push` | `verify-cloud-router-application.mjs` 的测试步骤是**手工枚举**的，新写的 `*.test.ts` 默认不跑 |

> 无需改 `@sdkwork/agents-pc-core` 或任何 `agents-pc-*` 既有包；无需改 cloudrouter 的 `sdk-clients.ts`（`getSdkworkAgentAppSdkClient` 已存在）。

---

## 7. 复用的 API 契约（全部已存在，零新增）

| 用途 | 方法 + 路径 | operationId | 权限 |
| --- | --- | --- | --- |
| 我的智能体列表 | `GET /app/v3/api/ai/agents`（**不带 `scope`** ⇒ 归属过滤） | `agents.list` | `ai.agents.read` |
| 新建 | `POST /app/v3/api/ai/agents` | `agents.create` | `ai.agents.use` |
| 详情 | `GET /app/v3/api/ai/agents/{agentId}` | `agents.retrieve` | `ai.agents.read` |
| 编辑 | `PATCH /app/v3/api/ai/agents/{agentId}` | `agents.update` | 见 §3 |
| 删除（软删） | `DELETE /app/v3/api/ai/agents/{agentId}` | `agents.delete` | 见 §3 |
| 恢复 | `POST /app/v3/api/ai/agents/{agentId}/restore` | — | `ai.agents.manage` |
| 提交 / 停用 | 状态变更动作 | `change_status` | 见 §3 |
| 版本列表 / 激活 | `GET /app/v3/api/ai/agents/{agentId}/versions`、`.../versions/{versionId}/activate` | — | `ai.agents.read` / `manage` |
| 试运行 | `POST /app/v3/api/ai/agents/{agentId}/preview_responses` | — | `ai.agents.use` |
| 提示词优化 | `POST /app/v3/api/ai/agents/{agentId}/prompt_optimizations` | — | `ai.agents.use` |
| 调用记录 | `GET /app/v3/api/ai/agents/{agentId}/calls`、`.../calls/{executionId}` | — | `ai.agents.read` |
| 工具集 | `GET /app/v3/api/ai/agents/{agentId}/toolkit` | — | `ai.agents.read` |
| Provider 绑定 | `GET/POST /app/v3/api/ai/agents/{agentId}/provider_bindings`、`.../activate` | — | `ai.agents.manage` |

**Int64 线缆契约（API_SPEC §13.6）**：`id` / `version` / `ownerUserId` 等 `int64` 在契约里必须是 `type: string, format: int64, pattern: ^-?[0-9]+$, x-sdkwork-int64-string: true`；前端**禁止**把 id 转 `number` 存 / 比 / 提交。

---

## 8. 状态机与可见性（页面文案与动作的唯一依据）

**`status`**（契约 `AgentStatus`，yaml:5257-5264）

| 值 | 含义 | 控制台动作（按 §5.3 能力投影） |
| --- | --- | --- |
| `draft` | 新建默认态 | 编辑、试运行、提交发布、删除 |
| `active` | 已启用 | 编辑、试运行、停用、查看调用、删除 |
| `disabled` | 已停用 | 编辑、重新启用、删除 |
| `archived` | 已归档 | 只读查看、恢复（manage）、删除 |
| `deleted` | 已软删 | 仅"显示已删"时可查、恢复（manage） |

**`visibility`**（契约 `AgentVisibility`，yaml:5266-5271）：`private` → `organization` → `tenant` → `public`。
⚠️ 控制台**不可**把 `visibility` 直接暴露成"公开"开关：`public` 意味着进入租户可见目录（`scope=market/public/published`），变更应受 manage 约束并给出显著提示。

---

## 9. 页面与交互规格

### 9.1 列表页 `/console/agents`

| 区域 | 规格 |
| --- | --- |
| 页头 | 标题「智能体管理」+ 副标题「管理你创建的智能体」；右上主按钮「创建智能体」 |
| 工具栏 | 左：搜索框（`q`，防抖 300ms）；右：状态筛选（全部/草稿/已启用/已停用/已归档）+「显示已删除」开关 |
| 表格列 | 图标+名称（含 `agentId` 副行） / 状态 / 可见性 / 模型 / 版本 / 更新时间 / 行操作 |
| 行操作 | 编辑 · 试运行 · 版本 · 调用记录 · 更多（提交发布 / 停用 / 删除）—— 逐项按能力投影禁用并给出原因 tooltip |
| 分页 | 服务端分页（`page` / `pageSize`），与 `PAGINATION_SPEC.md` §8 一致；**不做前端全量拉取** |
| 空态 | ①无任何智能体 ⇒ 引导创建；②筛选无结果 ⇒ 提示调整筛选；两种文案必须分开 |
| 错误态 | 403 ⇒ `AgentsPermissionNotice`（说明"仅能管理自己创建的智能体"，并给出申请路径）；5xx ⇒ 可重试 |
| 布局 | 工具栏 `justify-between`（搜索左、主操作右）—— 与既有 `console-api-keys` 的行内约定一致 |

### 9.2 创建向导 `/console/agents/new`

分步：①基础信息（名称/描述/图标/可见性）②能力配置（模型/系统提示词/欢迎语/建议问）③资源绑定（知识库/技能/工具/语音）④确认创建。
复用 `sdkwork-agents-pc-agents` 既有选择器组件；创建成功 ⇒ 跳 `/console/agents/{agentId}` 并提示"已创建为草稿"。

### 9.3 详情页 `/console/agents/:agentId`

**一期**（D3）：仅「概览」——配置只读快照 + 编辑入口（复用 §9.4 抽屉）+ 生命周期动作按钮。
**二期**（P5）：Tab —— 版本（列表 + 激活） / 调用记录（执行列表 + 明细抽屉） / 试运行（输入 → `preview_responses` 输出）。
一期页面**不要**预留空 Tab 壳（"即将上线"占位属反模式），二期直接加入 Tab 结构。

### 9.4 编辑抽屉

字段与创建向导同集；提交带 `expectedVersion`；409 冲突 ⇒ 提示"已被修改，请刷新"并提供重新加载。

---

## 10. i18n

- 命名空间：能力包自带 `agentsConsole.*`（随能力包发布，中英双份，key 扁平）。
- 宿主菜单：`console.menu.agents`（en: "Agent management" / zh: "智能体管理"）。
- 词表唯一性：状态 / 可见性 → 文案键的映射只在 `agentConsoleDictionaries.ts` 一份，供能力包内所有页面复用；宿主不得复制一份。
- 校验：`sdkwork-specs/tools/check-i18n-standard.mjs`（布局、重复键、缺键、回落、已退役 header）。

---

## 11. 验收标准（缺一条即未完成）

| 项 | 判据 |
| --- | --- |
| 能力包结构 | `specs/component.spec.json` 声明 `surface: "console"`；`pnpm --filter @sdkwork/agents-pc typecheck` 0 error |
| 归属投影单测 | §5.3 四用例 + 变异验证（短路归属闸 ⇒ 恰红 2 条） |
| 服务端权限（方案 A） | 新增「非归属 + `ai.agents.use` ⇒ Deny」断言；改后的既有断言通过 |
| 契约链 | 若改 yaml：契约校验 → standardizer → 逐 SDK 生成 → **`pnpm --dir <...-typescript> build`** 全绿；`git diff` 收敛于预期文件 |
| 宿主类型检查 | `pnpm typecheck` **0 error**（先记基线） |
| 宿主门禁 | `node ../sdkwork-specs/tools/verify-repo.mjs --root .` passed；`pnpm check:dependencies` |
| 六处接线 | 逐条 grep：新包依赖行 / App.tsx 路由 / ConsoleLayout 菜单 / i18n 键 / pnpm-workspace 行 / consumers 注册表 |
| 真实模块解析 | 从**消费包**起算 `createRequire(...).resolve('@sdkwork/agents-pc-console-agents')` 成功（app 根解析会假报 MODULE_NOT_FOUND） |
| workspace 同步 | `node ../sdkwork-specs/tools/sync-workspace.mjs --repo sdkwork-cloudrouter --root . --check` 通过 |
| 真实浏览器验收 | 起 cloudrouter PC dev（入口 **4736**），登录后 `/console/agents` 完成：列表出数 → 创建 → 编辑 → 删除 → 刷新后状态持久；用拦截 `fetch`/`XMLHttpRequest.open` 数请求（**不要**用 `performance.getEntriesByType('resource')`） |
| 门禁变异测试 | 故意破坏一处接线（如抽掉 i18n 键）⇒ 对应门禁/断言**必须变红**；不动则说明没覆盖到 |
| 门禁基线对照 | 治理套件失败集合与 HEAD 基线**逐项相同**（区分"本轮引入"与"预先存在"） |

---

## 12. 已裁决项（2026-09-23 定稿）

| # | 问题 | 裁决结果 | 对方案的影响 |
| --- | --- | --- | --- |
| **D1** | 菜单落哪个分组？ | ✅ **新开「AI 能力」组** | `ConsoleLayout.tsx` 新增 `groupBlock('console.menu.group.aiCapability', 'AI Capability', [...])`，含一个 item `/console/agents`；分组文案中英双补。为后续「技能管理 / 知识库管理」预留同组位置 |
| **D2** | §3 权限缺口怎么修？ | ✅ **方案 A：拆分归属自服务动作** | 进入 §5.4「服务端最小改动」；`infrastructure.rs` 策略表 + handler 归属判定 + 既有单测改造 + 新增反向断言。**不采用**方案 B（越权面过大）与方案 C（与需求冲突） |
| **D3** | 管理台形态与一期范围？ | ✅ **新写表格化管理台；一期 = 列表 + 创建 + 编辑 + 删除** | 一期不落 §9.3 详情页的三个 Tab（版本 / 调用记录 / 试运行）与 §9.4 之外的 provider_binding 编辑；详情页一期仅保留「概览 + 编辑入口」。版本 / 调用记录 / 试运行移入 P5 二期 |
| **D4** | 端覆盖？ | ✅ **仅 PC 控制台** | 本期不改 `apps/sdkwork-cloudrouter-h5`；能力包按可复用形态设计（runtime 注入 seam），H5 接入作为后续独立计划 |

> 被否决的替代方案与理由见 §3.2（权限）与 §9（形态）；保留在文档内以备复盘，勿重新引入。

---

## 13. 分期实施计划

| 阶段 | 内容 | 产出判据 |
| --- | --- | --- |
| **P0** | 裁决 D1–D4 | ✅ 已完成（见 §12），2026-09-23 |
| **P1（服务端）** | 方案 A：策略动作 + handler 归属判定 + 单测（含反向断言）+ 契约文案 + 契约链五步 | `cargo test` 目标用例全绿；契约校验通过 |
| **P2（能力包）** | 新包骨架 + `runtime.ts` 注入 seam + 列表页 + 创建向导 + 编辑抽屉 + 删除 | 能力包 `typecheck` 通过；归属投影单测 + 变异验证通过 |
| **P3（宿主接线）** | 六处 + 两处易漏（含 D1 决定的新分组）；`sync-workspace` 通过；应用根链接建立 | `pnpm typecheck` 0 error；`verify-repo` passed |
| **P4（验收）** | 真实浏览器全链（PC dev 入口 4736）+ 门禁变异 + 基线对照 | 本文件 §11 全表勾选 |
| **P5（二期）** | 版本 Tab / 调用记录 Tab / 试运行 Tab / provider_binding 编辑；H5 端接入评估 | 另开计划 |

---

## 14. 风险与回滚

| 风险 | 触发条件 | 缓解 |
| --- | --- | --- |
| 权限方案选 B 导致跨用户篡改 | 有人图快改 manifest 一行 | 计划内明确禁止；若必须，需 admin 审核页 + 审计告警一并上 |
| 策略改动打穿既有断言 | `infrastructure.rs` 的策略表被别处复用 | 先跑全量 `cargo test -p sdkwork-intelligence-agents-service` 记基线；只改目标断言并补反向断言 |
| 契约链漏最后一步 | 改 yaml 后只跑生成器 | §6/§7 已把 `pnpm --dir <...-typescript> build` 写成必跑步；验收含 `dist/*.d.ts` 新鲜度检查 |
| pnpm-workspace 手改被门禁判红 | 直接编辑 yaml | 走 `sync-workspace.mjs`；只补缺失行保留注释 |
| 生成物被物化脚本回退 | 手改生成物 | 本方案只新增 authored 文件；若碰生成物，先全树指纹快照再跑，按路径白名单还原 |
| 「已创建 ≠ 已接线」假绿 | 只加了包没加路由 | §11 的"六处逐条 grep"是硬门禁 |
| 控制台在别处已有近似入口 | 用户可访问的 URL 与我假设的不同 | 实施前先确认用户实际访问的入口（PC dev 入口 4736） |

### 回滚

- 能力包 / 适配包为**纯新增包**，回滚 = 删除两个包目录 + 撤 `package.json` 依赖行 + 撤 `pnpm-workspace.yaml` 行。
- 宿主框架层改动（App.tsx / ConsoleLayout / i18n）为**可逆的小 diff**，按文件 `git diff` 反向 patch 即可。
- 服务端策略改动为**单一函数 + 单测**，回滚 = 还原该函数与该测试。
- 全程不涉及数据库迁移，无数据回滚需求。
