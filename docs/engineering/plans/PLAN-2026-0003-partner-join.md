# 伙伴计划（Partner Join）营销模块实施计划

> 状态：**一期已实施完成（Phase 1–4 验证通过）**；设计依据：`../sdkwork-partner/docs/product/prd/PRD-partner-program.md`（v0.5）
> 范围：跨 `sdkwork-partner`（领域）与 `sdkwork-cloudrouter`（宿主）两仓库
> 决策默认值（已执行）：D1 菜单常驻 / D2 审核页扩展 admin-partner / D3 加盟费沿用管理员登记 / D4 邀请码一期做 / D6 仅 L1–L3 直通 / D7 二期同包扩展 / D8 申请数据模型 = 新表 `partner_application`（申请与经营实体分离）✅ / D9 保持 `partner_partner` 表名不变 ✅
> 实施记录：契约校验通过（partner 面）；partner `pnpm check`/`sdk:check`/vitest 19/19/cargo service 40 tests 通过；cloudrouter typecheck 仅剩 1 条既有诊断（marketing/promotion SDK，与本次无关）；cloudrouter verify-repo 剩余失败均为会话前既有本地改动

---

## 0. 已核实的技术事实（决定方案形态）

| 项 | 现状（已核实） |
| --- | --- |
| partner 后端面 | 仅 backend-api（`/backend/v3/api`，26 端点）；Rust 路由 crate `sdkwork-routes-partner-backend-api`（lib.rs / operations.rs / routes.rs / http_route_manifest.rs / backend_acl.rs / subject.rs / web_bootstrap.rs） |
| 装配 | `crates/sdkwork-api-partner-assembly/assembly-manifest.json` 声明 routeCrates；`pnpm api:assembly:materialize` 生成 bootstrap；网关 `sdkwork-api-partner-standalone-gateway` 挂载 |
| 契约 | OpenAPI 手写于 `apis/backend-api/partner/sdkwork-partner-backend-api.openapi.json`（3.1.2、`x-sdkwork-api-authority`/`x-sdkwork-owner`/`x-sdkwork-permission` 校验） |
| SDK 生成 | `tools/partner_sdk_generate.mjs`（单家族：authority=backend-api、prefix=`/backend/v3/api`）→ `pnpm sdk:generate` / `sdk:check`；家族布局 `sdks/<family>/{openapi, <family>-typescript/{src, generated/server-openapi}}` |
| DB | 基线 `database/ddl/baseline/postgres/0001_partner_baseline.sql`（含 `partner_partner` 已预留 `status=PENDING`、`user_account_id`）；迁移 `database/migrations/postgres/000N`；`db:validate` / `db:drift:check` |
| 前端包模式 | partner-pc 包自带 client 端口：`configurePartnerBackendSdkClient / configurePartnerBackendClientFactory / getPartnerBackendClient`（`partner-pc-admin-core/partnerClient.ts`） |
| cloudrouter 宿主 | `sdk-clients.ts` 按依赖注册 SDK client（partner backend: `VITE_SDKWORK_PARTNER_BACKEND_API_BASE_URL`）；admin 装配 `adminModuleRegistry.ts`（partnerCenter）+ `src/admin/cloudRouterAdminHostMount.tsx`；门户路由 `src/App.tsx`（/console、/admin、公共 MainLayout）；Header `cloudroutes-pc-commons/Navbar.tsx` navLinks；i18n `pc-i18n/resources/shared/navigation.ts` |
| 鉴权 | backend 面走 IAM admin 会话 + 权限（`commerce.partner.read/manage`）；app 面走门户会话（app-api 模式，见 cloudrouter 各 app-sdk） |

---

## 1. Phase 1 — partner 仓库：契约与后端

### 1.1 OpenAPI 契约

**新增** `apis/app-api/partner/sdkwork-partner-app-api.openapi.json`（authority `sdkwork-partner-app-api`，prefix `/app/v3/api`，owner `sdkwork-partner`）：

| 方法 | 路径 | operationId / 权限 | 鉴权 |
| --- | --- | --- | --- |
| GET | `/app/v3/api/partner_join` | `partnerJoin.retrieve` / open-api | 公开 |
| POST | `/app/v3/api/partner_join/applications` | `partnerJoin.application.create` | 门户会话 |
| GET | `/app/v3/api/partner_join/applications/mine` | `partnerJoin.application.list` | 门户会话 |
| POST | `/app/v3/api/partner_join/applications/{applicationId}/cancel` | `partnerJoin.application.cancel` | 门户会话 |
| GET | `/app/v3/api/partner_join/invite_codes/{code}` | `partnerJoin.inviteCode.retrieve` | 公开 |

**扩展** `apis/backend-api/partner/sdkwork-partner-backend-api.openapi.json`：

| 方法 | 路径 | operationId / 权限 |
| --- | --- | --- |
| GET | `/backend/v3/api/partners/applications` | `applications.list` / `commerce.partner.read` |
| GET | `/backend/v3/api/partners/applications/{applicationId}` | `applications.retrieve` / `commerce.partner.read` |
| POST | `/backend/v3/api/partners/applications/{applicationId}/approve` | `applications.approve` / `commerce.partner.manage` |
| POST | `/backend/v3/api/partners/applications/{applicationId}/reject` | `applications.reject` / `commerce.partner.manage` |

规范：id 一律 `string + format: int64` + `x-sdkwork-int64-string: true`；`x-sdkwork-permission` 必填；同步更新 `apis/backend-api/partner/changelogs/CHANGELOG.md`（新增 app-api changelog）。

### 1.2 数据库（轻量申请表 + 现有表最小扩展）

- 新迁移 `database/migrations/postgres/0006_partner_join_apply.{up,down}.sql`：
  - 新表 `partner_application`（§8.2 设计：SUBMITTED/APPROVED/REJECTED/CANCELLED；部分唯一索引 `WHERE status='SUBMITTED'` 防重；inviter 索引）；
  - `partner_partner` 新增 `invite_code VARCHAR(64)` + 部分唯一索引（伙伴自己的邀请码）；表名保持不变（D9）；
- 重新 materialize 基线/契约：`pnpm db:materialize:contract`；验证 `pnpm db:validate`、`pnpm db:drift:check`。

### 1.3 Rust 服务与路由

1. **repository**（`sdkwork-commerce-partner-repository-sqlx`）：新增 `PartnerApplicationRepository`（insert/list/get/mine/状态流转、锁行）；伙伴 invite_code 生成/查询；审计写入复用；
2. **service**（`sdkwork-commerce-partner-service`）：`join_apply` 模块 ——
   - 申请提交（创建 `partner_application`：校验邀请码→锁定 inviter、一用户一有效申请、幂等）；
   - 我的申请/撤回（本人、仅 SUBMITTED → CANCELLED）；
   - 审核 approve（事务：申请置 APPROVED + **复用现有伙伴创建逻辑**生成 `partner_partner`（PENDING、绑用户、挂上级链、定等级、分配邀请码）+ 回填 approved_partner_id + 审计）；
   - 审核 reject（SUBMITTED→REJECTED：原因必填 + 审计）；
3. **新路由 crate** `crates/sdkwork-routes-partner-app-api`（镜像 backend crate 结构）：
   - `http_route_manifest.rs`：5 条 app 路由 + 公开路径前缀；
   - `app_acl.rs`：门户会话鉴权（`can_access_app_api` + 用户主体），open-api 免登；
   - `web_bootstrap.rs` / `operations.rs` / `routes.rs` 对齐现有模式；
4. **backend 路由 crate**：manifest + operations 增加 4 条审核路由；
5. **host**（`sdkwork-partner-service-host`）：暴露 join app service 与 admin 审核方法；
6. **装配与网关**：`assembly-manifest.json` 增加 app-api route crate → `pnpm api:assembly:materialize`；`sdkwork-api-partner-standalone-gateway` 挂载 app 面（`/app/v3/api`）。

### 1.4 SDK 生成

- 新家族 `sdks/sdkwork-partner-app-sdk/`：`openapi/{sdkgen.json, sdkwork-partner-app-api.openapi.json}` + `sdkwork-partner-app-sdk-typescript/`（src 门面 + generated/server-openapi），包名 `@sdkwork/partner-app-sdk`；
- 扩展 `tools/partner_sdk_generate.mjs` 支持双家族（或新增 `tools/partner_app_sdk_generate.mjs`），`pnpm sdk:generate` / `sdk:check` 覆盖两个 SDK；
- backend SDK 重新生成（含 4 条审核端点）。

---

## 2. Phase 2 — partner 仓库：前端独立包

### 2.1 新包 `apps/sdkwork-partner-pc/packages/sdkwork-partner-pc-join`

```
├─ package.json                      @sdkwork/partner-pc-join；依赖 @sdkwork/partner-app-sdk、react、react-i18next
├─ specs/component.spec.json         surface: app；domain: commerce；capability: join；requiredPorts: partnerJoinAppClientFactory
└─ src/
   ├─ index.tsx                      PartnerJoin({ sectionId }) → landing/apply/status
   ├─ joinClient.ts                  端口：configurePartnerJoinAppSdkClient / configurePartnerJoinAppClientFactory / getPartnerJoinClient（镜像 admin-core/partnerClient.ts，默认 baseUrl 127.0.0.1:18098）
   ├─ services/partnerJoinService.ts app SDK 封装（program info / submit 幂等 / mine / cancel / invite validate）
   ├─ pages/landingPage.tsx          营销落地页（等级卡片/收益测算/流程/FAQ）
   ├─ pages/applyPage.tsx            申请表单（主体切换/邀请码校验/二次确认/拦截）
   ├─ pages/myApplicationPage.tsx    状态时间线/结果/重新申请
   └─ i18n/{en-US,zh-CN}/commerce/partner-join/*.ts
```

### 2.2 管理端审核（扩展 `sdkwork-partner-pc-admin-partner`）

- `src/pages/applicationsPage.tsx`：列表（状态/主体类型筛选、关键字、分页）+ 审核抽屉（通过→选等级；拒绝→必填原因）；
- `src/services/partnerService.ts`：增加 applications list/get/approve/reject；
- `src/index.tsx`：`PartnerAdminTab` 增加 `'applications'`；
- i18n 双语；调试壳 `main.tsx` 增加菜单项。

### 2.3 调试壳与测试

- `apps/sdkwork-partner-pc/src/main.tsx`：新增「伙伴计划」独立 section（独立导航区域，不混入 admin 导航），装配 `PartnerJoin`；配置 app client 端口；
- vitest：joinClient 端口、申请表单校验、landing 渲染冒烟。

---

## 3. Phase 3 — cloudrouter 仓库：宿主集成

1. `pnpm-workspace.yaml`：glob 增加 `../sdkwork-partner/apps/sdkwork-partner-pc/packages/sdkwork-partner-pc-join` 与 `../sdkwork-partner/sdks/sdkwork-partner-app-sdk/sdkwork-partner-app-sdk-typescript`；`pnpm install`；
2. `cloudroutes-pc-commons/src/sdk-clients.ts`：增加 `SdkworkPartnerAppSdkClient` 工厂（`getSdkworkPartnerAppSdkClient`，env `VITE_SDKWORK_PARTNER_APP_API_BASE_URL`，镜像现有 app-sdk 客户端模式）；
3. 新 host 包 `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-partner-join`：import `@sdkwork/partner-pc-join`，绑定 `configurePartnerJoinAppClientFactory(() => getSdkworkPartnerAppSdkClient())`，导出路由元素（Landing / Apply / Status）；
4. `src/App.tsx` 门户公共路由（不属于 `/console/*`、`/admin/*`）：
   - `/partner-join`（公开）→ Landing；`/partner-join/apply`、`/partner-join/status`（`RequirePortalSession`）→ Apply / Status；均使用门户 MainLayout；
5. `Navbar.tsx`（cloudroutes-pc-commons）`navLinks` 增加 `{ name: t('nav.partnerJoin'), href: '/partner-join' }`（常驻，移动端同步）；
6. i18n `pc-i18n/resources/shared/navigation.ts`：`nav.partnerJoin`（en: Partner Program / zh: 伙伴计划）；
7. 管理端：`adminModuleRegistry.ts` 在 `partnerCenter` 增加 `/admin/partner/applications`（labelKey `admin.partner.menu.applications`）+ i18n；`cloudRouterAdminHostMount.tsx` 挂 `AdminSectionRoute component={PartnerAdmin} sectionId="applications"`；
8. 启动装配：`src/admin/partnerSdkHostWiring.ts` 旁新增 app client 绑定（或并入同一 wiring，执行 `configureCloudRouterPartnerAppSdkClient`）。

---

## 4. Phase 4 — 验证

| 层 | 命令 | 期望 |
| --- | --- | --- |
| 契约 | `node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .`（两仓库） | 无违规 |
| partner 后端 | `pnpm check`（app-composition + db:validate + api:assembly:validate + format:rust:check）、`cargo test --workspace` | 通过；新增申请/审核单测 |
| partner 前端 | `pnpm typecheck`、`pnpm test:vitest` | 通过 |
| SDK | `pnpm sdk:check` | 生成物一致 |
| cloudrouter | `pnpm typecheck`、`pnpm check`（窄范围） | 通过 |
| 端到端手测 | `pnpm dev` 门户：Header 菜单 → 落地页 → 登录申请 → 管理端审核（通过/拒绝）→ 加盟费登记 → 伙伴 ACTIVE → 申请人状态流转；邀请码校验（有效/失效） | 全链路 |

---

## 5. 顺序与依赖

```
Phase 1.1 契约 → 1.2 迁移 → 1.3 Rust → 1.4 SDK      （partner，内部顺序）
        ↓
Phase 2 前端包（依赖 app SDK）                        （partner）
        ↓
Phase 3 宿主集成（依赖 1.4 + 2）                      （cloudrouter，依赖 partner 包经 workspace glob 可见）
        ↓
Phase 4 验证（契约校验在 1.1 后即可先行）
```

- Phase 1 与 Phase 2 可并行推进（前端可先用 mock 数据开发 UI，SDK 就绪后替换）；
- Phase 3 必须在 1.4/2 完成、`pnpm install` 后开始；
- 每阶段提交独立 commit，PRD/本计划文档随实现同步更新。

---

## 6. 风险与回滚

| 风险 | 缓解 |
| --- | --- |
| 契约/迁移先行，前端 SDK 未生成期间依赖缺失 | 前端 Phase 2 用类型占位 + 契约评审先行；SDK 生成在 Phase 1.4 即闭环 |
| approve 事务与现有 admin 创建路径语义冲突 | 复用同一 service 创建逻辑与校验（唯一键、上级链环）；单测覆盖 |
| 基线/迁移双轨漂移 | `db:validate` + `db:drift:check` 纳入 Phase 1 验收 |
| 新 SDK 家族生成工具改动影响既有 backend SDK | `sdk:check` 校验生成物一致性；双家族共用工具时保持 backend 路径参数不变 |
| 门户 Navbar 全局改动影响 console 顶栏 | 菜单项按 navLinks 现有机制追加，console 布局不受影响（console 顶部为独立布局） |
| 回滚 | 按阶段提交；契约+SDK 先行可整体回退至上一 commit；迁移提供 down 脚本 |
